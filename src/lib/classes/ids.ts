import { CLASS_ROSTER } from "@/lib/constants";

const VALID = new Set(CLASS_ROSTER.map((c) => c.class_id));

/**
 * 將舊版數字班號（101／201／301…）對應到現行國中班號（j101…）。
 */
export function resolveClassId(raw: string): string | null {
  if (VALID.has(raw)) return raw;

  const m = /^([123])(\d{2})$/.exec(raw);
  if (!m) return null;
  const grade = Number(m[1]);
  const n = Number(m[2]);
  const mapped = `j${grade}${String(n).padStart(2, "0")}`;
  return VALID.has(mapped) ? mapped : null;
}

export function isValidClassId(classId: string): boolean {
  return VALID.has(classId);
}

/**
 * 查詢用班號別名：j101 ↔ 101，避免舊資料對不到現行頁面。
 */
export function classIdAliases(classId: string): string[] {
  const resolved = resolveClassId(classId) ?? classId;
  const aliases = new Set<string>([classId, resolved]);
  const m = /^j([123])(\d{2})$/.exec(resolved);
  if (m) aliases.add(`${m[1]}${m[2]}`);
  return [...aliases];
}
