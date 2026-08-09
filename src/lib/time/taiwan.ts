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

/** 該日 12:00 台灣時間對應的 UTC timestamp（台灣無 DST） */
function taiwanNoonUtc(dateStr: string): number {
  const [y, m, day] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, day, 4, 0, 0);
}

/** 台灣週一日期 YYYY-MM-DD */
export function taiwanWeekStart(dateStr: string = taiwanDateString()): string {
  const utc = taiwanNoonUtc(dateStr);
  const dow = new Date(utc).getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  return taiwanDateString(new Date(utc - back * 86_400_000));
}

/** 台灣週日日期 YYYY-MM-DD */
export function taiwanWeekEnd(dateStr: string = taiwanDateString()): string {
  const start = taiwanWeekStart(dateStr);
  return taiwanDateString(new Date(taiwanNoonUtc(start) + 6 * 86_400_000));
}

export function isInTaiwanWeek(
  dateStr: string,
  weekOf: string = taiwanDateString(),
): boolean {
  return dateStr >= taiwanWeekStart(weekOf) && dateStr <= taiwanWeekEnd(weekOf);
}
