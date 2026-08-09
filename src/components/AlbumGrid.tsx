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
  /** teacher：只看缺失照；staff：可確認已改善 */
  mode = "teacher",
}: {
  inspections: InspectionDoc[];
  itemsByInspection: Record<string, InspectionItemDoc[]>;
  classId: string;
  onInspectionUpdated?: (inspection: InspectionDoc) => void;
  mode?: "teacher" | "staff";
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
      setMessage(`${insp.date} 已標為改善成功，已存入本班「歷史」檔案。`);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "標示失敗";
      const denied =
        /permission|insufficient|PERMISSION_DENIED/i.test(raw) ||
        (typeof err === "object" &&
          err !== null &&
          "code" in err &&
          String((err as { code?: string }).code).includes("permission"));
      setMessage(
        denied
          ? "無權限寫入：請在 Firebase Console 發布最新 firestore.rules（允許 status→fixed）。"
          : raw,
      );
    } finally {
      setBusyId(null);
    }
  }

  if (inspections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-8 text-center text-sm text-muted">
        目前沒有待改善事項。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {mode === "staff" ? (
        <p className="rounded-lg border border-mint/30 bg-leaf/15 px-3 py-2 text-xs text-ink sm:text-sm">
          確認導師已改善後，請按
          <strong className="text-mint">「確認已改善成功」</strong>
          ，照片會蓋章並存入歷史。
        </p>
      ) : null}
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
          <article
            key={insp.inspection_id}
            className="space-y-2 rounded-xl border border-line bg-white/70 p-2.5 sm:p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
                {insp.date.replaceAll("-", "/")}
              </h3>
              <StatusBadge status={insp.status} />
            </div>
            {insp.summary_blog ? (
              <p className="text-sm leading-relaxed text-ink">
                {insp.summary_blog}
              </p>
            ) : null}

            {mode === "staff" && !improved ? (
              <button
                type="button"
                disabled={busyId === insp.inspection_id}
                onClick={() => void onConfirmImproved(insp)}
                className="w-full rounded-xl bg-mint px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-leaf disabled:opacity-50"
              >
                {busyId === insp.inspection_id
                  ? "處理中…"
                  : "確認已改善成功（照片蓋章）"}
              </button>
            ) : null}
            {mode === "staff" && improved ? (
              <p className="rounded-lg bg-leaf/20 px-3 py-2 text-center text-sm font-semibold text-mint">
                已確認改善成功 · 已存入歷史檔案
              </p>
            ) : null}

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
                    {mode === "staff" && item.score_deduction !== 0 ? (
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
