/**
 * 台灣（Asia/Taipei）日曆日期 YYYY-MM-DD。
 * 勿用 toISOString().slice(0,10)，UTC 會讓清晨落到「昨天」。
 */
export function taiwanDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
