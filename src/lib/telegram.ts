import type { Order } from "./orders";
import { SITE } from "./site";

function parseChatIds(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const chatIdRaw = process.env.TELEGRAM_CHAT_ID?.trim() || "";
  const chatIds = parseChatIds(chatIdRaw);
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME?.trim() || "purme_alert_bot").replace(
    /^@/,
    ""
  );
  return {
    token,
    chatId: chatIds[0] || "",
    chatIds,
    botUsername,
    enabled: Boolean(token && chatIds.length),
    botUrl: `https://t.me/${botUsername}`,
  };
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramHtmlToChat(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };
    if (!res.ok || !data.ok) {
      const msg = data.description || `HTTP ${res.status}`;
      console.error("[telegram] send failed:", chatId, msg);
      return { ok: false, message: msg };
    }
    return { ok: true, message: "텔레그램 전송 완료" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[telegram] error:", msg);
    return { ok: false, message: msg };
  }
}

async function sendTelegramHtml(text: string): Promise<{ ok: boolean; message: string }> {
  const { token, chatIds, enabled } = telegramConfig();
  if (!enabled) {
    return { ok: false, message: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 미설정" };
  }

  const results = await Promise.all(
    chatIds.map((id) => sendTelegramHtmlToChat(token, id, text))
  );
  const okCount = results.filter((r) => r.ok).length;
  if (okCount === 0) {
    return { ok: false, message: results[0]?.message || "전송 실패" };
  }
  if (okCount < results.length) {
    return {
      ok: true,
      message: `일부 전송 완료 (${okCount}/${results.length})`,
    };
  }
  return {
    ok: true,
    message: chatIds.length > 1 ? `${chatIds.length}명에게 전송 완료` : "텔레그램 전송 완료",
  };
}

function formatInquiryMessage(order: Order): string {
  const when = new Date(order.createdAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const lines = [
    `<b>🔔 ${escapeHtml(SITE.name)} 새 문의</b>`,
    "",
    `<b>이름</b>: ${escapeHtml(order.name)}`,
    `<b>전화</b>: ${escapeHtml(order.phone)}`,
    `<b>유형</b>: ${escapeHtml(order.productLabel || order.product)}`,
  ];
  if (order.address && order.address !== "미입력") {
    lines.push(`<b>지역</b>: ${escapeHtml(order.address)}`);
  }
  if (order.memo) {
    lines.push(`<b>내용</b>: ${escapeHtml(order.memo)}`);
  }
  lines.push(`<b>시각</b>: ${escapeHtml(when)}`);
  lines.push(`<b>ID</b>: <code>${escapeHtml(order.id)}</code>`);
  return lines.join("\n");
}

/** 문의 접수 시 텔레그램으로 즉시 알림 (설정 없으면 조용히 스킵) */
export async function notifyInquiryTelegram(order: Order): Promise<{
  ok: boolean;
  skipped?: boolean;
  message: string;
}> {
  const { enabled } = telegramConfig();
  if (!enabled) {
    return {
      ok: false,
      skipped: true,
      message: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 미설정",
    };
  }
  return sendTelegramHtml(formatInquiryMessage(order));
}

export async function sendTelegramTestMessage(): Promise<{ ok: boolean; message: string }> {
  const when = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  return sendTelegramHtml(
    [
      `<b>✅ ${escapeHtml(SITE.name)} 테스트 알림</b>`,
      "",
      "관리자 페이지에서 보낸 테스트입니다.",
      `시각: ${escapeHtml(when)}`,
    ].join("\n")
  );
}

export function getTelegramAdminStatus() {
  const { enabled, chatIds, botUsername, botUrl } = telegramConfig();
  return {
    enabled,
    botUsername,
    botUrl,
    chatIdConfigured: chatIds.length > 0,
    recipientCount: chatIds.length,
    chatIdHint: chatIds[0]
      ? `${chatIds[0].slice(0, 3)}…${chatIds[0].slice(-3)}`
      : null,
    ownerChatIdHint: "8433555162",
  };
}
