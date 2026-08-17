import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";
import { notifyInquiryTelegram } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim() || "미입력";
    const product = String(body.product || "정원인테리어").trim();
    const quantity = String(body.quantity || "1").trim();
    const memo = String(body.memo || "").trim();

    if (!name || !phone) {
      return NextResponse.json(
        { error: "이름, 연락처는 필수입니다." },
        { status: 400 }
      );
    }

    const order = await createOrder({
      name,
      phone,
      address,
      product,
      productLabel: product,
      quantity,
      memo,
    });

    // 문의 저장은 성공한 뒤 — 텔레그램 실패해도 접수는 유지
    void notifyInquiryTelegram(order);

    return NextResponse.json({ ok: true, id: order.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "문의 접수 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
