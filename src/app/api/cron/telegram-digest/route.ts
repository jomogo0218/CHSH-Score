import { NextRequest, NextResponse } from "next/server";
import { buildTelegramDigest } from "@/lib/notify/telegram-digest";
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

/** 台灣 08:00（UTC 00:00）每日早報：待改善／逾時／待處理領用 */
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  try {
    await ensureTelegramWebhook().catch(() => undefined);
    const digest = await buildTelegramDigest();
    const telegram = await sendTelegramMessage(digest.text);
    return NextResponse.json({ ok: true, digest, telegram });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "早報失敗" },
      { status: 500 },
    );
  }
}
