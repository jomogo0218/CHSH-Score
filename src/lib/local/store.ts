import { classIdAliases } from "@/lib/classes/ids";
import type {
  CommentDoc,
  InspectionDoc,
  InspectionItemDoc,
  InspectionStatus,
} from "@/lib/types";

const FEED_KEY = "chsh_local_inspections";
const ITEMS_KEY = "chsh_local_items";
const COMMENTS_KEY = "chsh_local_comments";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Firebase 未設定時，本機暫存巡檢結果供大廳／班級預覽 */
export function saveLocalInspection(
  inspection: InspectionDoc,
  items: Omit<InspectionItemDoc, "item_id">[],
  mode: "append" | "replace" = "replace",
) {
  const list = readJson<InspectionDoc[]>(FEED_KEY, []);
  const next = [
    inspection,
    ...list.filter((i) => i.inspection_id !== inspection.inspection_id),
  ];
  writeJson(FEED_KEY, next);

  const allItems = readJson<InspectionItemDoc[]>(ITEMS_KEY, []);
  const filtered =
    mode === "append"
      ? allItems
      : allItems.filter((i) => i.inspection_id !== inspection.inspection_id);
  const stamp = Date.now();
  const withIds = items.map((item, idx) => ({
    ...item,
    item_id: `local_${inspection.inspection_id}_${stamp}_${idx}`,
  }));
  writeJson(ITEMS_KEY, [...withIds, ...filtered]);
}

export function getLocalInspections(): InspectionDoc[] {
  return readJson<InspectionDoc[]>(FEED_KEY, []).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

export function getLocalInspectionsByClass(classId: string): InspectionDoc[] {
  const aliases = new Set(classIdAliases(classId));
  return getLocalInspections().filter((i) => aliases.has(i.class_id));
}

export function getLocalItems(inspectionId: string): InspectionItemDoc[] {
  return readJson<InspectionItemDoc[]>(ITEMS_KEY, []).filter(
    (i) => i.inspection_id === inspectionId,
  );
}

export function saveLocalComment(comment: CommentDoc, markFixed: boolean) {
  const list = readJson<CommentDoc[]>(COMMENTS_KEY, []);
  writeJson(COMMENTS_KEY, [comment, ...list]);

  if (markFixed) {
    markLocalInspectionFixed(comment.inspection_id);
  }
}

export function markLocalInspectionFixed(inspectionId: string) {
  const inspections = getLocalInspections();
  const next = inspections.map((i) =>
    i.inspection_id === inspectionId
      ? { ...i, status: "fixed" as InspectionStatus }
      : i,
  );
  writeJson(FEED_KEY, next);
}

export function getLocalComments(inspectionId?: string): CommentDoc[] {
  const list = readJson<CommentDoc[]>(COMMENTS_KEY, []);
  const filtered = inspectionId
    ? list.filter((c) => c.inspection_id === inspectionId)
    : list;
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getLocalCommentsByClass(classId: string): CommentDoc[] {
  const aliases = new Set(classIdAliases(classId));
  return readJson<CommentDoc[]>(COMMENTS_KEY, [])
    .filter((c) => c.class_id && aliases.has(c.class_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
