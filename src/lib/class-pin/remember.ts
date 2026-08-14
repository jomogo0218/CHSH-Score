import { CLASS_ROSTER } from "@/lib/constants";
import { resolveClassId } from "@/lib/classes/ids";
import { setPinnedClassId } from "@/lib/class-pin/storage";

/**
 * 任何回報送出後記住本班（寫入 localStorage）。
 * 優先用 classId；若只有班名則對名冊精確比對。
 */
export function rememberClassFromReport(opts: {
  classId?: string | null;
  className?: string | null;
}): string | null {
  const idRaw = (opts.classId ?? "").trim();
  const nameRaw = (opts.className ?? "").trim();

  let id: string | null = null;
  if (idRaw) {
    id = resolveClassId(idRaw) ?? idRaw;
  } else if (nameRaw) {
    const exact = CLASS_ROSTER.find((c) => c.class_name === nameRaw);
    id = exact?.class_id ?? null;
  }

  if (id) setPinnedClassId(id);
  return id;
}
