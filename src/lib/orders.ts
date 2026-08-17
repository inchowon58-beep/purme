import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { del, get, list, put } from "@vercel/blob";

export type OrderStatus = "new" | "contacted" | "done" | "cancelled";

export type Order = {
  id: string;
  name: string;
  phone: string;
  address: string;
  product: string;
  productLabel: string;
  quantity: string;
  memo: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrderIndex = {
  ids: string[];
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "public", "order-data");
const ORDERS_DIR = path.join(DATA_DIR, "orders");
const INDEX_PATH = path.join(DATA_DIR, "index.json");
const BLOB_PREFIX = "order-data";
const BLOB_ACCESS = "private" as const;

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

function resolveBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return process.env.BLOB_READ_WRITE_TOKEN.trim();
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value?.trim() && key.includes("BLOB") && key.endsWith("READ_WRITE_TOKEN")) {
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
  return { access: BLOB_ACCESS, ...blobTokenOpts() };
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
    if (!fs.existsSync(ORDERS_DIR)) fs.mkdirSync(ORDERS_DIR, { recursive: true });
  } catch {
    /* Vercel 읽기 전용 FS */
  }
}

function blobOrderPath(id: string): string {
  const h = createHash("sha256").update(id, "utf8").digest("hex").slice(0, 24);
  return `${BLOB_PREFIX}/orders/o_${h}.json`;
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
    if (result?.stream) return await streamToText(result.stream);
  } catch (e) {
    console.error("[orders] blob get failed", pathname, e);
  }
  try {
    const { blobs } = await list({ prefix: pathname, ...blobTokenOpts() });
    const match =
      blobs.find((b) => b.pathname === pathname) ||
      blobs.find((b) => b.pathname.endsWith(`/${path.basename(pathname)}`));
    if (!match) return null;
    const viaGet = await get(match.url, opts);
    if (viaGet?.stream) return await streamToText(viaGet.stream);
  } catch (e) {
    console.error("[orders] blob list/get failed", pathname, e);
  }
  return null;
}

async function writeBlobText(pathname: string, content: string): Promise<void> {
  await put(pathname, content, blobPutOpts());
}

function readIndexFs(): OrderIndex {
  try {
    if (!fs.existsSync(INDEX_PATH)) {
      return { ids: [], updatedAt: new Date().toISOString() };
    }
    return JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8")) as OrderIndex;
  } catch {
    return { ids: [], updatedAt: new Date().toISOString() };
  }
}

function writeIndexFs(index: OrderIndex) {
  ensureDirs();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
}

function readOrderFs(id: string): Order | null {
  try {
    const file = path.join(ORDERS_DIR, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as Order;
  } catch {
    return null;
  }
}

async function readIndex(): Promise<OrderIndex> {
  if (resolveBlobToken()) {
    const raw = await readBlobText(`${BLOB_PREFIX}/index.json`);
    if (raw) {
      try {
        return JSON.parse(raw) as OrderIndex;
      } catch {
        /* fall through */
      }
    }
  }
  return readIndexFs();
}

async function writeIndex(index: OrderIndex): Promise<void> {
  const content = JSON.stringify(index, null, 2);
  if (isVercelRuntime() || resolveBlobToken()) {
    try {
      await writeBlobText(`${BLOB_PREFIX}/index.json`, content);
      if (!isVercelRuntime()) {
        try {
          writeIndexFs(index);
        } catch {
          /* optional */
        }
      }
      return;
    } catch (e) {
      if (isVercelRuntime()) throw e;
    }
  }
  writeIndexFs(index);
}

export async function readOrder(id: string): Promise<Order | null> {
  if (resolveBlobToken()) {
    const raw = await readBlobText(blobOrderPath(id));
    if (raw) {
      try {
        return JSON.parse(raw) as Order;
      } catch {
        /* fall through */
      }
    }
  }
  return readOrderFs(id);
}

export async function saveOrder(order: Order): Promise<void> {
  const content = JSON.stringify(order, null, 2);
  const pathname = blobOrderPath(order.id);

  if (isVercelRuntime()) {
    await writeBlobText(pathname, content);
  } else {
    ensureDirs();
    fs.writeFileSync(path.join(ORDERS_DIR, `${order.id}.json`), content, "utf-8");
    if (resolveBlobToken()) {
      try {
        await writeBlobText(pathname, content);
      } catch (e) {
        console.error("[orders] optional blob sync failed", e);
      }
    }
  }

  const index = await readIndex();
  const ids = [order.id, ...index.ids.filter((x) => x !== order.id)];
  await writeIndex({ ids, updatedAt: new Date().toISOString() });
}

export async function createOrder(
  input: Omit<Order, "id" | "status" | "createdAt" | "updatedAt">
): Promise<Order> {
  const now = new Date().toISOString();
  const order: Order = {
    ...input,
    id: randomUUID(),
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
  await saveOrder(order);
  return order;
}

export async function listOrders(limit?: number): Promise<Order[]> {
  const { ids } = await readIndex();
  const take = typeof limit === "number" ? Math.max(0, limit) : ids.length;
  const targets = ids.slice(0, take);
  const orders: Order[] = [];
  for (const id of targets) {
    const o = await readOrder(id);
    if (o) orders.push(o);
  }
  if (orders.length > 0) {
    return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  if (fs.existsSync(ORDERS_DIR)) {
    const files = fs.readdirSync(ORDERS_DIR).filter((f) => f.endsWith(".json"));
    return files
      .map((f) => readOrderFs(f.replace(/\.json$/, "")))
      .filter((o): o is Order => !!o)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, take || undefined);
  }
  return [];
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  const order = await readOrder(id);
  if (!order) return null;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);
  return order;
}

export async function deleteOrders(ids: string[]): Promise<number> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return 0;

  let deleted = 0;
  for (const id of unique) {
    const file = path.join(ORDERS_DIR, `${id}.json`);
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      /* ignore local FS */
    }

    if (resolveBlobToken() || isVercelRuntime()) {
      try {
        await del(blobOrderPath(id), blobTokenOpts());
      } catch (e) {
        console.error("[orders] blob delete failed", id, e);
      }
    }
    deleted += 1;
  }

  const index = await readIndex();
  const idSet = new Set(unique);
  const nextIds = index.ids.filter((id) => !idSet.has(id));
  await writeIndex({ ids: nextIds, updatedAt: new Date().toISOString() });
  return deleted;
}
