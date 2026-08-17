import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ADMIN } from "@/lib/admin-config";
import {
  deleteOrders,
  listOrders,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/orders";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const all = await listOrders();
  const size = ADMIN.pageSize;
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * size;
  const items = all.slice(start, start + size);
  return NextResponse.json({
    total,
    page: current,
    pageSize: size,
    totalPages,
    items,
  });
}

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim() as OrderStatus;
    const allowed: OrderStatus[] = ["new", "contacted", "done", "cancelled"];
    if (!id || !allowed.includes(status)) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    }
    const order = await updateOrderStatus(id, status);
    if (!order) {
      return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "상태 변경 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.map((v: unknown) => String(v || "").trim()).filter(Boolean)
      : [];
    if (!ids.length) {
      return NextResponse.json({ error: "삭제할 항목을 선택하세요." }, { status: 400 });
    }
    const deleted = await deleteOrders(ids);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "삭제 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
