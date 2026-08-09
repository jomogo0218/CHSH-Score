import { classIdAliases, resolveClassId } from "@/lib/classes/ids";
import {
  taiwanMonthEnd,
  taiwanMonthStart,
  taiwanSemesterEnd,
  taiwanSemesterStart,
  taiwanWeekEnd,
  taiwanWeekStart,
} from "@/lib/time/taiwan";
import type { InspectionDoc } from "@/lib/types";

/** 評分表上每個扣分項目算 1 次缺失 */
export function countDeficiencies(scores: number[]): number {
  return scores.filter((s) => s < 0).length;
}

/**
 * 讀取當日缺失次數。舊資料沒有 deficiency_count 時：
 * 合格視為 0，其餘至少 1。
 */
export function deficiencyCountOf(insp: InspectionDoc): number {
  if (
    typeof insp.deficiency_count === "number" &&
    Number.isFinite(insp.deficiency_count)
  ) {
    return Math.max(0, Math.floor(insp.deficiency_count));
  }
  if (insp.status === "pass") return 0;
  return 1;
}

export function formatDeficiency(count: number): string {
  return count === 0 ? "無缺失" : `缺失 ${count} 次`;
}

function canonicalClassId(classId: string): string {
  return resolveClassId(classId) ?? classId;
}

/** 本週（週一～週日）該班缺失次數加總；同日多筆只留最新。 */
export function weeklyDeficiencyTotal(
  inspections: InspectionDoc[],
  classId?: string,
  weekOf?: string,
): number {
  const start = taiwanWeekStart(weekOf);
  const end = taiwanWeekEnd(weekOf);
  const aliases = classId ? new Set(classIdAliases(classId)) : null;
  const latest = new Map<string, InspectionDoc>();

  for (const item of inspections) {
    if (aliases && !aliases.has(item.class_id)) continue;
    if (item.date < start || item.date > end) continue;
    const key = `${canonicalClassId(item.class_id)}:${item.date}`;
    const prev = latest.get(key);
    if (!prev || item.created_at > prev.created_at) {
      latest.set(key, item);
    }
  }

  let total = 0;
  for (const item of latest.values()) {
    total += deficiencyCountOf(item);
  }
  return total;
}

export function deficiencyByClassInRange(
  inspections: InspectionDoc[],
  start: string,
  end: string,
  order: "asc" | "desc" = "asc",
): Array<{ classId: string; count: number }> {
  const latest = new Map<string, InspectionDoc>();

  for (const item of inspections) {
    if (item.date < start || item.date > end) continue;
    const key = `${canonicalClassId(item.class_id)}:${item.date}`;
    const prev = latest.get(key);
    if (!prev || item.created_at > prev.created_at) {
      latest.set(key, item);
    }
  }

  const totals = new Map<string, number>();
  for (const item of latest.values()) {
    const classId = canonicalClassId(item.class_id);
    totals.set(classId, (totals.get(classId) ?? 0) + deficiencyCountOf(item));
  }

  return [...totals.entries()]
    .map(([classId, count]) => ({ classId, count }))
    .sort(
      (a, b) =>
        (order === "desc" ? b.count - a.count : a.count - b.count) ||
        a.classId.localeCompare(b.classId),
    );
}

export function weeklyDeficiencyByClass(
  inspections: InspectionDoc[],
  weekOf?: string,
): Array<{ classId: string; count: number }> {
  return deficiencyByClassInRange(
    inspections,
    taiwanWeekStart(weekOf),
    taiwanWeekEnd(weekOf),
    "asc",
  );
}

export function monthlyDeficiencyByClass(
  inspections: InspectionDoc[],
  monthOf?: string,
): Array<{ classId: string; count: number }> {
  return deficiencyByClassInRange(
    inspections,
    taiwanMonthStart(monthOf),
    taiwanMonthEnd(monthOf),
    "desc",
  );
}

export function semesterDeficiencyByClass(
  inspections: InspectionDoc[],
  ofDate?: string,
): Array<{ classId: string; count: number }> {
  return deficiencyByClassInRange(
    inspections,
    taiwanSemesterStart(ofDate),
    taiwanSemesterEnd(ofDate),
    "desc",
  );
}

export function deficiencyTotalInRange(
  inspections: InspectionDoc[],
  classId: string,
  start: string,
  end: string,
): number {
  const aliases = new Set(classIdAliases(classId));
  const canonical = canonicalClassId(classId);
  return (
    deficiencyByClassInRange(inspections, start, end).find(
      (row) => row.classId === canonical || aliases.has(row.classId),
    )?.count ?? 0
  );
}
