"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { invalidateCache } from "@/lib/cache/ttl";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { markInspectionFixed } from "@/lib/firebase/firestore";
import { markLocalInspectionFixed } from "@/lib/local/store";
import type { InspectionDoc, InspectionItemDoc } from "@/lib/types";

function ImprovedStamp() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10"
      aria-hidden
    >
      <span className="rotate-[-20deg] rounded-md border-[3px] border-mint bg-white/85 px-2.5 py-1 text-base font-black tracking-[0.35em] text-mint shadow-md sm:px-3 sm:text-lg">
        已改善
      </span>
    </div>
  );
}

export function AlbumGrid({
  inspections,
  itemsByInspection,
  classId,
  onInspectionUpdated,
}: {
  inspections: InspectionDoc[];
  itemsByInspection: Record<string, InspectionItemDoc[]>;
  classId: string;
  onInspectionUpdated?: (inspection: InspectionDoc) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onConfirmImproved(insp: InspectionDoc) {
    if (insp.status === "fixed") return;
    const ok = window.confirm(
      `確認「${insp.date}」這次巡察已改善成功？\n照片上會蓋上「已改善」章（舊照片保留不刪除）。`,
    );
    if (!ok) return;

    setBusyId(insp.inspection_id);
    setMessage(null);
    try {
      if (isFirebaseConfigured()) {
        await markInspectionFixed(insp.inspection_id, classId);
      } else {
        markLocalInspectionFixed(insp.inspection_id);
      }
      invalidateCache(`class:${classId}`);
      const updated = { ...insp, status: "fixed" as const };
      onInspectionUpdated?.(updated);
      setMessage(`${insp.date} 已標為改善成功，照片已蓋章。`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "標示失敗");
    } finally {
      setBusyId(null);
    }
  }

  if (inspections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-8 text-center text-sm text-muted">
        尚無巡檢相簿
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-mint">{message}</p> : null}
      {inspections.map((insp) => {
        const items = itemsByInspection[insp.inspection_id] ?? [];
        const photos =
          items.length > 0
            ? items
            : [
                {
                  item_id: "cover",
                  photo_url: insp.cover_photo_url ?? "",
                  category: "封面",
                  note: insp.summary_blog,
                  score_deduction: 0,
                },
              ];
        const improved = insp.status === "fixed";

        return (
          <article key={insp.inspection_id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
                {insp.date.replaceAll("-", "/")}
              </h3>
              <StatusBadge status={insp.status} />
              <span className="text-sm text-mint">{insp.total_score} 分</span>
              {!improved ? (
                <button
                  type="button"
                  disabled={busyId === insp.inspection_id}
                  onClick={() => void onConfirmImproved(insp)}
                  className="rounded-md bg-mint px-2.5 py-1 text-xs font-semibold text-white hover:bg-leaf disabled:opacity-50"
                >
                  {busyId === insp.inspection_id
                    ? "處理中…"
                    : "已改善成功"}
                </button>
              ) : (
                <span className="text-xs font-semibold text-mint">
                  照片已蓋「已改善」章
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((item) => (
                <figure
                  key={item.item_id}
                  className="overflow-hidden rounded-lg border border-line bg-paper/90"
                >
                  <div className="relative">
                    {item.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photo_url}
                        alt={item.note}
                        className={`aspect-[4/3] w-full object-cover ${
                          improved ? "opacity-90" : ""
                        }`}
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-paper text-xs text-muted">
                        無照片
                      </div>
                    )}
                    {improved && item.photo_url ? <ImprovedStamp /> : null}
                  </div>
                  <figcaption className="space-y-0.5 p-2 text-[11px]">
                    <p className="font-semibold text-ink">{item.category}</p>
                    <p className="line-clamp-2 text-muted">{item.note}</p>
                    {item.score_deduction !== 0 ? (
                      <p
                        className={`font-medium ${
                          item.score_deduction > 0 ? "text-mint" : "text-coral"
                        }`}
                      >
                        {item.score_deduction > 0 ? "+" : ""}
                        {item.score_deduction} 分
                      </p>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
