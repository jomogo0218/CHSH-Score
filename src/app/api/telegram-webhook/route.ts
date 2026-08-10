import { NextRequest, NextResponse } from "next/server";
import { isValidClassId, resolveClassId } from "@/lib/classes/ids";
import { displayClassName } from "@/lib/classes/resolve-id";
import {
  deactivateTelegramChat,
  upsertTelegramBinding,
} from "@/lib/notify/telegram-bindings";
import { buildTelegramDigest } from "@/lib/notify/telegram-digest";
import {
  parseTelegramStartPayload,
  TELEGRAM_BOT_USERNAME,
  telegramClassBindHref,
  telegramStaffBindHref,
} from "@/lib/notify/telegram-links";
import {
  ensureTelegramWebhook,
  telegramBotToken,
  telegramCall,
} from "@/lib/notify/telegram";

function webhookSecretOk(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}

function setupSecretOk(request: NextRequest) {
  const expected =
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  const q = request.nextUrl.searchParams.get("secret") ?? "";
  if (expected && q === expected) return true;
  return !expected && process.env.NODE_ENV !== "production";
}

async function reply(chatId: number | string, text: string) {
  const token = telegramBotToken();
  if (!token) return;
  await telegramCall(token, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

const HELP = [
  `嘉華體衛組 @${TELEGRAM_BOT_USERNAME}`,
  "組長：按「綁定組長」或傳 /start staff",
  "導師不必綁定，請用網頁導師區。",
  "取消：/stop",
  "組長早報：/早報",
  telegramStaffBindHref(),
].join("\n");

export async function GET(request: NextRequest) {
  if (!setupSecretOk(request)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  try {
    const result = await ensureTelegramWebhook({ dropPending: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "setWebhook 失敗" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!webhookSecretOk(request)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const update = (await request.json()) as {
      message?: {
        chat?: { id?: number; type?: string; username?: string };
        text?: string;
        from?: { username?: string };
      };
    };
    const msg = update.message;
    const chatId = msg?.chat?.id;
    const text = (msg?.text ?? "").trim();
    if (!chatId || !text) return NextResponse.json({ ok: true });

    const username = msg.from?.username || msg.chat?.username || "";
    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.replace(/@\w+$/, "").toLowerCase();
    const arg = rest.join(" ").trim();

    if (cmd === "/help" || text === "說明") {
      await reply(chatId, HELP);
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/stop" || text === "取消綁定") {
      const n = await deactivateTelegramChat(String(chatId)).catch(() => 0);
      await reply(
        chatId,
        n > 0 ? "已取消 Telegram 通知。" : "目前沒有綁定，或請先發布 firestore.rules。",
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/早報" || cmd === "/digest" || cmd === "/zaobao" || text === "/早報" || text === "早報") {
      const digest = await buildTelegramDigest();
      await reply(chatId, digest.text);
      return NextResponse.json({ ok: true });
    }

    const startArg =
      cmd === "/start" ? arg : parseTelegramStartPayload(text.replace(/^\//, ""))
        ? text.replace(/^\//, "")
        : "";
    const parsed = parseTelegramStartPayload(startArg);

    if (cmd === "/start" && !parsed) {
      await reply(chatId, HELP);
      return NextResponse.json({ ok: true });
    }

    if (parsed?.role === "staff" || cmd === "/staff" || text === "/組長") {
      try {
        await upsertTelegramBinding({
          chatId: String(chatId),
          role: "staff",
          username,
        });
      } catch {
        await reply(
          chatId,
          "綁定寫入失敗：請在 Firebase Console 發布最新 firestore.rules（telegram_bindings）。",
        );
        return NextResponse.json({ ok: true });
      }
      await reply(
        chatId,
        "已綁定為組長。之後領用、打掃回報、巡察缺失、每天早上 8 點早報都會傳到這裡。",
      );
      return NextResponse.json({ ok: true });
    }

    if (parsed?.role === "teacher" || cmd === "/class") {
      const classId =
        resolveClassId(parsed?.classId || arg) ?? (parsed?.classId || arg);
      if (!classId || !isValidClassId(classId)) {
        await reply(
          chatId,
          `班號不正確。請到班級網頁按「綁定 Telegram」。\n例如：${telegramClassBindHref("j101")}`,
        );
        return NextResponse.json({ ok: true });
      }
      try {
        await upsertTelegramBinding({
          chatId: String(chatId),
          role: "teacher",
          classId,
          username,
        });
      } catch {
        await reply(
          chatId,
          "綁定寫入失敗：請在 Firebase Console 發布最新 firestore.rules（telegram_bindings）。",
        );
        return NextResponse.json({ ok: true });
      }
      await reply(
        chatId,
        `已綁定「${displayClassName(classId)}」。本班被扣分、領用可取、已銷案會傳到這裡。`,
      );
      return NextResponse.json({ ok: true });
    }

    await reply(chatId, HELP);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook]", err);
    return NextResponse.json({ ok: true });
  }
}
