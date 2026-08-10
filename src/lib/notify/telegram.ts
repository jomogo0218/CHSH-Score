import { SITE_ORIGIN } from "@/lib/constants";
import {
  listStaffChatIds,
  listTeacherChatIds,
  upsertTelegramBinding,
} from "@/lib/notify/telegram-bindings";

const API = "https://api.telegram.org/bot";

export function telegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

type TelegramChat = { id: number; type?: string; title?: string; username?: string };

export async function telegramCall<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API}${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as { ok?: boolean; description?: string; result?: T };
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} 失敗`);
  }
  return data.result as T;
}

async function resolveFromGetUpdates(token: string): Promise<string | null> {
  type Update = {
    message?: { chat?: TelegramChat };
    my_chat_member?: { chat?: TelegramChat };
    channel_post?: { chat?: TelegramChat };
  };
  const updates = await telegramCall<Update[]>(token, "getUpdates?limit=30");
  const chats = updates
    .map((u) => u.message?.chat ?? u.my_chat_member?.chat ?? u.channel_post?.chat)
    .filter((c): c is TelegramChat => Boolean(c?.id));
  const priv = [...chats].reverse().find((c) => c.type === "private");
  const chat = priv ?? chats.at(-1);
  return chat ? String(chat.id) : null;
}

export async function resolveStaffChatIds(): Promise<string[]> {
  const token = telegramBotToken();
  const known = await listStaffChatIds();
  if (known.length > 0) return known;
  if (!token) return [];
  try {
    const one = await resolveFromGetUpdates(token);
    if (!one) return [];
    try {
      await upsertTelegramBinding({ chatId: one, role: "staff" });
    } catch {
      // rules 未發布時仍先用這次 chat id
    }
    return [one];
  } catch {
    return [];
  }
}

/** 未設定 chat id 時，用最近一次私訊自動對到組長 */
export async function resolveTelegramChatId(token: string): Promise<string | null> {
  const ids = await resolveStaffChatIds();
  if (ids[0]) return ids[0];
  if (!token) return null;
  return resolveFromGetUpdates(token);
}

function publicPhotoUrls(urls: string[]) {
  return urls
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 10);
}

async function sendTextToChat(token: string, chatId: string, text: string) {
  await telegramCall(token, "sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
  });
}

async function sendPhotosToChat(
  token: string,
  chatId: string,
  caption: string,
  photoUrls: string[],
) {
  const urls = publicPhotoUrls(photoUrls);
  const text = caption.slice(0, 1024);
  if (urls.length === 0) {
    await sendTextToChat(token, chatId, caption);
    return;
  }
  try {
    if (urls.length === 1) {
      await telegramCall(token, "sendPhoto", {
        chat_id: chatId,
        photo: urls[0],
        caption: text,
      });
    } else {
      await telegramCall(token, "sendMediaGroup", {
        chat_id: chatId,
        media: urls.map((media, i) => ({
          type: "photo",
          media,
          ...(i === 0 ? { caption: text } : {}),
        })),
      });
    }
  } catch {
    await telegramCall(token, "sendMessage", {
      chat_id: chatId,
      text: `${caption.slice(0, 2800)}\n\n${urls.join("\n")}`.slice(0, 4000),
      disable_web_page_preview: false,
    });
  }
}

async function sendToChats(
  chatIds: string[],
  text: string,
  photoUrls?: string[],
): Promise<{ skipped: boolean; chatId?: string; sent: string[] }> {
  const token = telegramBotToken();
  const ids = [...new Set(chatIds.filter(Boolean))];
  if (!token || ids.length === 0) return { skipped: true, sent: [] };

  const sent: string[] = [];
  let lastError: string | undefined;
  for (const chatId of ids) {
    try {
      if (photoUrls?.length) await sendPhotosToChat(token, chatId, text, photoUrls);
      else await sendTextToChat(token, chatId, text);
      sent.push(chatId);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Telegram 失敗";
    }
  }
  if (sent.length === 0 && lastError) throw new Error(lastError);
  return { skipped: false, chatId: sent[0], sent };
}

export async function sendTelegramMessage(text: string): Promise<{
  skipped: boolean;
  chatId?: string;
  sent?: string[];
}> {
  const ids = await resolveStaffChatIds();
  if (ids.length === 0) {
    throw new Error("找不到 Telegram 對話。請先開啟 @terry_stock_bot 傳送 /start staff");
  }
  return sendToChats(ids, text);
}

export async function sendTelegramPhotos(
  caption: string,
  photoUrls: string[],
): Promise<{ skipped: boolean; chatId?: string; sent?: string[] }> {
  const ids = await resolveStaffChatIds();
  if (ids.length === 0) {
    throw new Error("找不到 Telegram 對話。請先開啟 @terry_stock_bot 傳送 /start staff");
  }
  return sendToChats(ids, caption, photoUrls);
}

/**
 * 同一 chat 若同時是組長＋該班導師，只送一則（組長文案），避免重複。
 */
export async function routeTelegramNotify(input: {
  staffText?: string;
  teacherText?: string;
  teacherClassId?: string;
  photoUrls?: string[];
}): Promise<{ skipped: boolean; chatId?: string; sent: string[] }> {
  const token = telegramBotToken();
  if (!token) return { skipped: true, sent: [] };

  const staffIds = input.staffText ? await resolveStaffChatIds() : [];
  const teacherIds = input.teacherText && input.teacherClassId
    ? await listTeacherChatIds(input.teacherClassId)
    : [];
  const staffSet = new Set(staffIds);
  const teacherOnly = teacherIds.filter((id) => !staffSet.has(id));

  const sent: string[] = [];
  if (input.staffText && staffIds.length) {
    const r = await sendToChats(staffIds, input.staffText, input.photoUrls);
    sent.push(...r.sent);
  }
  if (input.teacherText && teacherOnly.length) {
    const r = await sendToChats(teacherOnly, input.teacherText, input.photoUrls);
    sent.push(...r.sent);
  }

  if (
    (input.staffText && staffIds.length === 0 && !input.teacherText) ||
    (input.teacherText && teacherOnly.length === 0 && teacherIds.length === 0 && !input.staffText)
  ) {
    throw new Error(
      input.staffText
        ? "找不到組長 Telegram。請開啟 @terry_stock_bot 傳送 /start staff"
        : "此班尚未綁定 Telegram。請導師在班級頁按「綁定 Telegram」",
    );
  }

  return {
    skipped: sent.length === 0,
    chatId: sent[0],
    sent: [...new Set(sent)],
  };
}

export async function ensureTelegramWebhook(opts?: { dropPending?: boolean }) {
  const token = telegramBotToken();
  if (!token) return { skipped: true as const };
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const url = `${SITE_ORIGIN}/api/telegram-webhook`;
  await telegramCall(token, "setWebhook", {
    url,
    ...(secret ? { secret_token: secret } : {}),
    allowed_updates: ["message"],
    drop_pending_updates: Boolean(opts?.dropPending),
  });
  return { skipped: false as const, url };
}
