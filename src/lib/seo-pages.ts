import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { get, list, put } from "@vercel/blob";
import { migrateImageUrl } from "./images";
import { SITE } from "./site";

export type FaqItem = { q: string; a: string };

export type SeoPage = {
  slug: string;
  keyword: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  h1: string;
  heroSubtitle: string;
  heroBadge?: string;
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  heroBar?: string;
  sections: {
    h2: string;
    paragraphs: string[];
  }[];
  faqs: FaqItem[];
  images: string[];
  ctaText: string;
  createdAt: string;
  updatedAt: string;
};

export type SeoPageSummary = {
  slug: string;
  keyword: string;
  title: string;
  metaDescription: string;
  h1: string;
  createdAt: string;
  updatedAt: string;
};

export type SeoIndex = {
  slugs: string[];
  /** 목록/사이트맵용 요약 — 전체 JSON을 안 읽어도 되게 */
  entries?: SeoPageSummary[];
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "public", "seo-data");
const PAGES_DIR = path.join(DATA_DIR, "pages");
const INDEX_PATH = path.join(DATA_DIR, "index.json");
const BLOB_PREFIX = "seo-data";

/** Blob pathname 용 ASCII 키 (한글 slug 불가 대응) */
export function blobPageKey(slug: string): string {
  const h = createHash("sha256").update(slug, "utf8").digest("hex").slice(0, 24);
  return `p_${h}`;
}

function blobPagePathname(slug: string): string {
  return `${BLOB_PREFIX}/pages/${blobPageKey(slug)}.json`;
}

function normalizePage(page: SeoPage): SeoPage {
  return {
    ...page,
    images: (page.images || []).map(migrateImageUrl),
  };
}

/** whitepark-blob 은 private 스토어 */
const BLOB_ACCESS = "private" as const;

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

function resolveBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return process.env.BLOB_READ_WRITE_TOKEN.trim();
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (
      value?.trim() &&
      key.includes("BLOB") &&
      key.endsWith("READ_WRITE_TOKEN")
    ) {
      return value.trim();
    }
  }
  return undefined;
}

function blobTokenOpts() {
  const token = resolveBlobToken();
  return token ? { token } : {};
}

function blobOpts() {
  return {
    access: BLOB_ACCESS,
    ...blobTokenOpts(),
  };
}

function blobPutOpts() {
  return {
    ...blobOpts(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  };
}

function ensureDirs() {
  try {
    if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR, { recursive: true });
  } catch {
    /* Vercel 등 읽기 전용 FS — 쓰기 시에만 실패 처리 */
  }
}

function pageToSummary(page: Pick<
  SeoPage,
  "slug" | "keyword" | "title" | "metaDescription" | "h1" | "createdAt" | "updatedAt"
>): SeoPageSummary {
  return {
    slug: page.slug,
    keyword: page.keyword || "",
    title: page.title || page.h1 || page.slug,
    metaDescription: page.metaDescription || "",
    h1: page.h1 || page.title || page.slug,
    createdAt: page.createdAt || "",
    updatedAt: page.updatedAt || page.createdAt || "",
  };
}

function stubSummary(slug: string, updatedAt = ""): SeoPageSummary {
  return {
    slug,
    keyword: "",
    title: slug,
    metaDescription: "",
    h1: slug,
    createdAt: updatedAt,
    updatedAt,
  };
}

function normalizeIndex(raw: SeoIndex): SeoIndex {
  const slugs = Array.isArray(raw.slugs) ? raw.slugs.filter(Boolean) : [];
  const updatedAt = raw.updatedAt || new Date().toISOString();
  const bySlug = new Map<string, SeoPageSummary>();
  for (const e of raw.entries || []) {
    if (e?.slug) bySlug.set(e.slug, pageToSummary(e));
  }
  const entries = slugs.map(
    (slug) => bySlug.get(slug) || stubSummary(slug, updatedAt)
  );
  return { slugs, entries, updatedAt };
}

function upsertIndexEntry(index: SeoIndex, page: SeoPage): SeoIndex {
  const summary = pageToSummary(page);
  const slugs = [page.slug, ...(index.slugs || []).filter((s) => s !== page.slug)];
  const rest = (index.entries || []).filter((e) => e.slug !== page.slug);
  return {
    slugs,
    entries: [summary, ...rest].filter((e) => slugs.includes(e.slug)),
    updatedAt: new Date().toISOString(),
  };
}

async function streamToText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder("utf-8").decode(merged);
}

async function readBlobText(pathname: string): Promise<string | null> {
  const opts = blobOpts();
  try {
    const result = await get(pathname, opts);
    if (result?.stream) {
      return await streamToText(result.stream);
    }
  } catch (e) {
    console.error("[seo-pages] blob get failed", pathname, e);
  }

  try {
    const { blobs } = await list({
      prefix: pathname,
      ...blobTokenOpts(),
    });
    const match =
      blobs.find((b) => b.pathname === pathname) ||
      blobs.find((b) => b.pathname.endsWith(`/${path.basename(pathname)}`));
    if (!match) return null;
    const viaGet = await get(match.url, opts);
    if (viaGet?.stream) return await streamToText(viaGet.stream);
  } catch (e) {
    console.error("[seo-pages] blob list/get failed", pathname, e);
  }
  return null;
}

async function writeBlobText(pathname: string, content: string): Promise<void> {
  await put(pathname, content, blobPutOpts());
}

function readIndexFs(): SeoIndex {
  try {
    if (!fs.existsSync(INDEX_PATH)) {
      return { slugs: [], entries: [], updatedAt: new Date().toISOString() };
    }
    return normalizeIndex(JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8")) as SeoIndex);
  } catch {
    return { slugs: [], entries: [], updatedAt: new Date().toISOString() };
  }
}

function writeIndexFs(index: SeoIndex) {
  ensureDirs();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
}

function readPageFs(slug: string): SeoPage | null {
  const candidates = [slug];
  try {
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) candidates.push(decoded);
  } catch {
    /* ignore */
  }
  for (const key of candidates) {
    const file = path.join(PAGES_DIR, `${key}.json`);
    if (!fs.existsSync(file)) continue;
    try {
      return normalizePage(JSON.parse(fs.readFileSync(file, "utf-8")) as SeoPage);
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function readIndex(): Promise<SeoIndex> {
  // Blob은 토큰이 있을 때만 시도 (Vercel에서 토큰 없이 get 호출 시 예외)
  if (resolveBlobToken()) {
    const blobRaw = await readBlobText(`${BLOB_PREFIX}/index.json`);
    if (blobRaw) {
      try {
        return normalizeIndex(JSON.parse(blobRaw) as SeoIndex);
      } catch {
        /* fall through */
      }
    }
  }
  return readIndexFs();
}

export async function writeIndex(index: SeoIndex): Promise<void> {
  const content = JSON.stringify(index, null, 2);
  if (isVercelRuntime() || resolveBlobToken()) {
    try {
      await writeBlobText(`${BLOB_PREFIX}/index.json`, content);
      if (!isVercelRuntime()) {
        try {
          writeIndexFs(index);
        } catch {
          /* optional local mirror */
        }
      }
      return;
    } catch (e) {
      if (isVercelRuntime()) {
        throw new Error(
          `Vercel Blob 저장 실패(index). private 스토어는 access:'private'이 필요합니다. (${
            e instanceof Error ? e.message : e
          })`
        );
      }
    }
  }
  try {
    writeIndexFs(index);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/EROFS|read-only/i.test(msg)) {
      throw new Error(
        "배포 환경은 파일 쓰기가 불가합니다. Vercel Blob 토큰을 설정하세요."
      );
    }
    throw e;
  }
}

export async function readPage(slug: string): Promise<SeoPage | null> {
  const candidates = [slug];
  try {
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) candidates.push(decoded);
  } catch {
    /* ignore */
  }
  if (resolveBlobToken()) {
    for (const key of candidates) {
      // 1) ASCII 해시 키 (신규)
      const hashed = await readBlobText(blobPagePathname(key));
      if (hashed) {
        try {
          return normalizePage(JSON.parse(hashed) as SeoPage);
        } catch {
          /* try legacy */
        }
      }
      // 2) 레거시: slug 파일명 (영문만 성공했을 수 있음)
      const blobRaw = await readBlobText(`${BLOB_PREFIX}/pages/${key}.json`);
      if (blobRaw) {
        try {
          return normalizePage(JSON.parse(blobRaw) as SeoPage);
        } catch {
          /* try next */
        }
      }
    }
  }
  return readPageFs(slug);
}

/** 목록·홈·사이트맵용 — index.json 1회만 읽음 (전체 글 JSON 미조회) */
export async function listPageSummaries(): Promise<SeoPageSummary[]> {
  try {
    const index = await readIndex();
    if (index.entries && index.entries.length > 0) {
      return [...index.entries].sort((a, b) =>
        (a.createdAt || "") < (b.createdAt || "") ? 1 : -1
      );
    }
    if (index.slugs.length > 0) {
      return index.slugs.map((s) => stubSummary(s, index.updatedAt));
    }
    try {
      if (fs.existsSync(PAGES_DIR)) {
        const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith(".json"));
        return files
          .map((f) => readPageFs(f.replace(/\.json$/, "")))
          .filter((p): p is SeoPage => !!p)
          .map(pageToSummary)
          .sort((a, b) => ((a.createdAt || "") < (b.createdAt || "") ? 1 : -1));
      }
    } catch {
      /* ignore FS errors on serverless */
    }
    return [];
  } catch (e) {
    console.error("[seo-pages] listPageSummaries failed", e);
    return [];
  }
}

/** 전체 본문 필요 시(RSS 등). 비용·지연 큼 — 가급적 listPageSummaries 사용 */
export async function listPages(limit?: number): Promise<SeoPage[]> {
  const { slugs } = await readIndex();
  const take = typeof limit === "number" ? Math.max(0, limit) : slugs.length;
  const targets = slugs.slice(0, take);
  const fromIndex: SeoPage[] = [];
  for (const s of targets) {
    const p = await readPage(s);
    if (p) fromIndex.push(p);
  }
  if (fromIndex.length > 0) {
    return fromIndex.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  if (fs.existsSync(PAGES_DIR)) {
    const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith(".json"));
    const pages = files
      .map((f) => readPageFs(f.replace(/\.json$/, "")))
      .filter((p): p is SeoPage => !!p)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return typeof limit === "number" ? pages.slice(0, limit) : pages;
  }
  return [];
}

export async function savePage(page: SeoPage): Promise<void> {
  const content = JSON.stringify(page, null, 2);
  const pagePathname = blobPagePathname(page.slug);

  if (isVercelRuntime()) {
    try {
      await writeBlobText(pagePathname, content);
    } catch (e) {
      throw new Error(
        `Vercel Blob 저장 실패. private Blob은 access:'private'로 저장합니다. 토큰·Redeploy를 확인하세요. (${
          e instanceof Error ? e.message : e
        })`
      );
    }
  } else {
    try {
      ensureDirs();
      fs.writeFileSync(
        path.join(PAGES_DIR, `${page.slug}.json`),
        content,
        "utf-8"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/EROFS|read-only/i.test(msg)) {
        throw new Error(
          "파일 시스템이 읽기 전용입니다. Vercel Blob을 설정하거나 로컬에서 발행하세요."
        );
      }
      throw e;
    }
    if (resolveBlobToken()) {
      try {
        await writeBlobText(pagePathname, content);
      } catch (e) {
        console.error("[seo-pages] optional blob sync failed", e);
      }
    }
  }

  const index = upsertIndexEntry(await readIndex(), page);
  await writeIndex(index);
}

export function pagePublicUrl(slug: string): string {
  return `${SITE.siteUrl}/guide/${encodeURIComponent(slug)}`;
}

export function pagePath(slug: string): string {
  return `/guide/${encodeURIComponent(slug)}`;
}

/** 파일명용 slug */
export function slugifyKeyword(keyword: string, salt?: string): string {
  const base = keyword
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣\-]/g, "")
    .slice(0, 40);
  const tail =
    salt ||
    Math.random().toString(36).slice(2, 6) +
      Date.now().toString(36).slice(-4);
  return `${base || "purme"}-${tail}`;
}
