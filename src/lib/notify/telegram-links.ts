import { resolveClassId } from "@/lib/classes/ids";

export const TELEGRAM_BOT_USERNAME = "terry_stock_bot";

export function telegramStartHref(payload = "") {
  const base = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  if (!payload) return base;
  return `${base}?start=${encodeURIComponent(payload)}`;
}

export function telegramStaffBindHref() {
  return telegramStartHref("staff");
}

export function telegramClassBindHref(classId: string) {
  const id = resolveClassId(classId) ?? classId;
  return telegramStartHref(`c_${id}`);
}

export function parseTelegramStartPayload(payload: string): {
  role: "staff" | "teacher";
  classId?: string;
} | null {
  const raw = payload.trim();
  if (!raw || raw === "start") return null;
  if (raw === "staff" || raw === "admin" || raw === "zuzhang") {
    return { role: "staff" };
  }
  const m = /^c[_-](.+)$/i.exec(raw);
  if (!m) return null;
  const classId = resolveClassId(m[1]) ?? m[1];
  return { role: "teacher", classId };
}
