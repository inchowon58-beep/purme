/**
 * 로컬 대량발행 → Vercel private Blob 업로드 (운영 사이트 즉시 반영)
 * 사용: node blob-upload.mjs <pagesDir> [existingIndexPath]
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { put, get } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = (
  process.env.WHITEPARK_PROJECT_ROOT ||
  process.cwd() ||
  path.resolve(__dirname, "../..")
).replace(/[\\/]+$/, "");

function loadEnvLocal() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

function resolveToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return process.env.BLOB_READ_WRITE_TOKEN.trim();
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v?.trim() && k.includes("BLOB") && k.endsWith("READ_WRITE_TOKEN")) {
      return v.trim();
    }
  }
  return null;
}

function blobPagePathname(slug) {
  const h = crypto.createHash("sha256").update(slug, "utf8").digest("hex").slice(0, 24);
  return `seo-data/pages/p_${h}.json`;
}

async function readBlobText(pathname, token) {
  try {
    const result = await get(pathname, { access: "private", token });
    if (!result?.stream) return null;
    const reader = result.stream.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) {
      merged.set(c, o);
      o += c.length;
    }
    return new TextDecoder("utf-8").decode(merged);
  } catch {
    return null;
  }
}

async function main() {
  loadEnvLocal();
  const token = resolveToken();
  if (!token) {
    console.error(
      "BLOB_READ_WRITE_TOKEN 없음 — .env.local에 토큰을 넣으면 웹에 바로 반영됩니다."
    );
    process.exit(2);
  }

  const pagesDir = process.argv[2];
  if (!pagesDir || !fs.existsSync(pagesDir)) {
    console.error("사용법: node blob-upload.mjs <pagesDir>");
    process.exit(1);
  }

  const files = fs
    .readdirSync(pagesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(pagesDir, f));

  if (!files.length) {
    console.error("업로드할 JSON이 없습니다.");
    process.exit(1);
  }

  const putOpts = {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  };

  let slugs = [];
  let entries = [];
  const indexRaw = await readBlobText("seo-data/index.json", token);
  if (indexRaw) {
    try {
      const prev = JSON.parse(indexRaw);
      slugs = prev.slugs || [];
      entries = prev.entries || [];
    } catch {
      slugs = [];
      entries = [];
    }
  }

  const uploaded = [];
  for (const file of files) {
    const page = JSON.parse(fs.readFileSync(file, "utf8"));
    const slug = page.slug;
    if (!slug) continue;
    await put(blobPagePathname(slug), JSON.stringify(page), putOpts);
    slugs = slugs.filter((s) => s !== slug);
    slugs.unshift(slug);
    const entry = {
      slug,
      keyword: page.keyword || "",
      title: page.title || page.h1 || slug,
      metaDescription: page.metaDescription || "",
      h1: page.h1 || page.title || slug,
      createdAt: page.createdAt || "",
      updatedAt: page.updatedAt || page.createdAt || "",
    };
    entries = entries.filter((e) => e.slug !== slug);
    entries.unshift(entry);
    uploaded.push(slug);
  }

  const slugSet = new Set(slugs);
  entries = entries.filter((e) => slugSet.has(e.slug));
  const have = new Set(entries.map((e) => e.slug));
  for (const s of slugs) {
    if (!have.has(s)) {
      entries.push({
        slug: s,
        keyword: "",
        title: s,
        metaDescription: "",
        h1: s,
        createdAt: "",
        updatedAt: "",
      });
    }
  }

  const index = {
    slugs,
    entries,
    updatedAt: new Date().toISOString(),
  };
  await put("seo-data/index.json", JSON.stringify(index, null, 2), putOpts);

  console.log(`Blob 업로드 완료 · ${uploaded.length}건 (웹 즉시 반영)`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
