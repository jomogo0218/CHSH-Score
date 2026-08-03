import { CLASS_ROSTER } from "@/lib/constants";
import { getDemoClass } from "@/lib/seed/demo-data";

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

/** 顯示用班名（含舊碼 101 → 國一1班） */
export function displayClassName(classId: string): string {
  const resolved = resolveClassId(classId) ?? classId;
  return (
    getDemoClass(resolved)?.class_name ??
    getDemoClass(classId)?.class_name ??
    classId
  );
}
