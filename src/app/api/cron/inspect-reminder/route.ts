import { NextRequest, NextResponse } from "next/server";
import { buildInspectReminderText } from "@/lib/notify/inspect-reminder";
import { ensureTelegramWebhook, sendTelegramMessage } from "@/lib/notify/telegram";

function cronAuthorized(request: NextRequest) {
  const secret =
    process.env.CRON_SECRET?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const q = request.nextUrl.searchParams.get("secret") ?? "";
  if (secret && (auth === `Bearer ${secret}` || q === secret)) return true;
  return !secret && process.env.NODE_ENV !== "production";
}

/** 台灣 07:30／12:30 巡察提醒（UTC 23:30／04:30） */
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  try {
    await ensureTelegramWebhook().catch(() => undefined);
    const text = buildInspectReminderText();
    const telegram = await sendTelegramMessage(text);
    return NextResponse.json({ ok: true, text, telegram });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "巡察提醒失敗" },
      { status: 500 },
    );
  }
}
