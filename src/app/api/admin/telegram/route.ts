import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getTelegramAdminStatus, sendTelegramTestMessage } from "@/lib/telegram";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getTelegramAdminStatus());
}

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendTelegramTestMessage();
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
