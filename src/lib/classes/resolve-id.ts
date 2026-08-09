import { getDemoClass } from "@/lib/seed/demo-data";
import {
  classIdAliases,
  isValidClassId,
  resolveClassId,
} from "@/lib/classes/ids";

export { classIdAliases, isValidClassId, resolveClassId };

/** 顯示用班名（含舊碼 101 → 國一1班） */
export function displayClassName(classId: string): string {
  const resolved = resolveClassId(classId) ?? classId;
  return (
    getDemoClass(resolved)?.class_name ??
    getDemoClass(classId)?.class_name ??
    classId
  );
}
