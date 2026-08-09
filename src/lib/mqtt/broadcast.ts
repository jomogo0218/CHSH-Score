import { resolveClassId } from "@/lib/classes/ids";
import { emitInspectionUpdate } from "@/lib/live/inspection-events";
import { publishLiveUpdate } from "@/lib/mqtt/publish";
import { deficiencyCountOf } from "@/lib/scoring/deficiency";
import type { InspectionDoc } from "@/lib/types";

/** 本機事件 + MQTT（有設定才會真的廣播） */
export async function broadcastInspection(insp: InspectionDoc) {
  emitInspectionUpdate(insp);
  const classId = resolveClassId(insp.class_id) ?? insp.class_id;
  try {
    await publishLiveUpdate({
      class_id: classId,
      score: insp.total_score,
      note: insp.summary_blog,
      photo_url: insp.cover_photo_url ?? "",
      created_at: insp.created_at,
      status: insp.status,
      inspection_id: insp.inspection_id,
      deficiency_count: deficiencyCountOf(insp),
    });
  } catch {
    // MQTT 選配
  }
}
