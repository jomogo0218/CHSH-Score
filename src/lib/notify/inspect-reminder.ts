import { SITE_ORIGIN } from "@/lib/constants";
import { taiwanDateString } from "@/lib/time/taiwan";

function taiwanHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

export function buildInspectReminderText(now = new Date()) {
  const hour = taiwanHour(now);
  const slot = hour < 10 ? "早上" : "中午";
  const clock = hour < 10 ? "07:30" : "12:30";
  const today = taiwanDateString(now).replaceAll("-", "/");
  return [
    `【嘉華巡察提醒】${today} ${slot} ${clock}`,
    "該去巡察環境評分了。",
    `${SITE_ORIGIN}/inspect`,
  ].join("\n");
}
