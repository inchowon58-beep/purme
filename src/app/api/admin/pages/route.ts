import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listPageSummaries, pagePath } from "@/lib/seo-pages";
import { ADMIN } from "@/lib/admin-config";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const all = await listPageSummaries();
  const size = ADMIN.pageSize;
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * size;
  const items = all.slice(start, start + size).map((p) => ({
    slug: p.slug,
    keyword: p.keyword,
    title: p.title,
    path: pagePath(p.slug),
    createdAt: p.createdAt,
  }));
  return NextResponse.json({
    total,
    page: current,
    pageSize: size,
    totalPages,
    items,
  });
}
