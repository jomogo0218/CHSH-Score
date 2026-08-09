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
export function taiwanNoonUtc(dateStr: string): number {
  const [y, m, day] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, day, 4, 0, 0);
}

export function taiwanAddDays(dateStr: string, days: number): string {
  return taiwanDateString(new Date(taiwanNoonUtc(dateStr) + days * 86_400_000));
}

export function taiwanMonthStart(dateStr: string = taiwanDateString()): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export function taiwanMonthEnd(dateStr: string = taiwanDateString()): string {
  const [y, m] = dateStr.split("-").map(Number);
  return taiwanDateString(new Date(Date.UTC(y, m, 0, 4, 0, 0)));
}

/** 台灣學年上學期 8/1～1/31、下學期 2/1～7/31 */
export function taiwanSemesterStart(
  dateStr: string = taiwanDateString(),
): string {
  const [y, m] = dateStr.split("-").map(Number);
  if (m >= 8) return `${y}-08-01`;
  if (m === 1) return `${y - 1}-08-01`;
  return `${y}-02-01`;
}

export function taiwanSemesterEnd(dateStr: string = taiwanDateString()): string {
  const [y, m] = dateStr.split("-").map(Number);
  if (m >= 8) return `${y + 1}-01-31`;
  if (m === 1) return `${y}-01-31`;
  return `${y}-07-31`;
}

/** 改善期限：巡察日翌日中午（台灣 12:00） */
export function fixDeadlineDate(inspectionDate: string): string {
  return taiwanAddDays(inspectionDate, 1);
}

export function isFixOverdue(
  inspectionDate: string,
  status: string,
  now = Date.now(),
): boolean {
  if (status !== "pending_fix") return false;
  return now > taiwanNoonUtc(fixDeadlineDate(inspectionDate));
}

export function formatFixDeadlineLabel(inspectionDate: string): string {
  const d = fixDeadlineDate(inspectionDate);
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)} 中午`;
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
