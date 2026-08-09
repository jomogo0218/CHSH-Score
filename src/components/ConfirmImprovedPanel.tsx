"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS } from "@/lib/constants";
import { invalidateCache } from "@/lib/cache/ttl";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  fetchInspectionsByClass,
  markInspectionFixed,
} from "@/lib/firebase/firestore";
import { broadcastInspection } from "@/lib/mqtt/broadcast";
import { formatDeficiency, deficiencyCountOf } from "@/lib/scoring/deficiency";
import {
  getLocalInspectionsByClass,
  markLocalInspectionFixed,
} from "@/lib/local/store";
import type { InspectionDoc } from "@/lib/types";

/**
 * 巡察帳號／班級頁共用：列出尚未蓋章的巡察，一鍵確認已改善成功。
 */
export function ConfirmImprovedPanel({
  classId,
  classLabel,
  inspections: external,
  onInspectionUpdated,
}: {
  classId: string;
  classLabel?: string;
  /** 若由外層傳入則不再自行抓取 */
  inspections?: InspectionDoc[];
  onInspectionUpdated?: (inspection: InspectionDoc) => void;
}) {
  const [list, setList] = useState<InspectionDoc[]>(external ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (external) {
      setList(external);
      return;
    }
    try {
      const local = getLocalInspectionsByClass(classId);
      let remote: InspectionDoc[] = [];
      if (isFirebaseConfigured()) {
        try {
          remote = await fetchInspectionsByClass(classId, 10);
        } catch (err) {
          console.warn("[ConfirmImprovedPanel] fetch failed", err);
        }
      }
      const map = new Map<string, InspectionDoc>();
      for (const i of [...local, ...remote]) {
        map.set(i.inspection_id, i);
      }
      setList(
        [...map.values()].sort((a, b) => b.date.localeCompare(a.date)),
      );
    } catch (err) {
      console.warn("[ConfirmImprovedPanel] reload failed", err);
      setList([]);
    }
  }, [classId, external]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (external) setList(external);
  }, [external]);

  const pending = list.filter((i) => i.status === "pending_fix");

  async function onConfirm(insp: InspectionDoc) {
    const ok = window.confirm(
      `確認「${classLabel ?? classId}」${insp.date} 已改善成功？\n班級相簿照片會蓋上「已改善」章。`,
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
      setList((prev) =>
        prev.map((i) =>
          i.inspection_id === updated.inspection_id ? updated : i,
        ),
      );
      onInspectionUpdated?.(updated);
      await broadcastInspection(updated);
      setMessage(`${insp.date} 已確認改善成功，已存入班級「歷史」檔案。`);
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

  return (
    <section className="panel space-y-3 p-3 sm:p-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">審查改善結果</h2>
        <p className="mt-0.5 text-xs text-muted">
          導師回報後，在此按「確認已改善成功」，班級「照片」區會蓋章。
        </p>
      </div>

      {message ? <p className="text-sm text-mint">{message}</p> : null}

      {pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-paper/70 px-3 py-4 text-center text-sm text-muted">
          {list.length === 0
            ? "此班尚無巡察紀錄，請先評分發布。"
            : "目前沒有待確認項目（皆已蓋「已改善」章）。"}
        </p>
      ) : (
        <ul className="space-y-2">
          {pending.map((insp) => (
            <li
              key={insp.inspection_id}
              className="alert-box rounded-xl bg-coral/5 p-3"
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
                <p className="text-sm font-semibold text-ink">
                  {(insp.date ?? "").replaceAll("-", "/") || insp.inspection_id}{" "}
                  · {formatDeficiency(deficiencyCountOf(insp))}
                </p>
                <p className="text-xs text-coral">
                  {STATUS_LABELS[insp.status] ?? insp.status ?? "未知"}
                </p>
              </div>
              {insp.summary_blog ? (
                <p className="mb-2 line-clamp-2 text-xs text-muted">
                  {insp.summary_blog}
                </p>
              ) : null}
              <button
                type="button"
                disabled={busyId === insp.inspection_id}
                onClick={() => void onConfirm(insp)}
                className="btn-block btn-primary btn-wide text-sm"
              >
                {busyId === insp.inspection_id
                  ? "處理中…"
                  : "確認已改善成功（照片蓋章）"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/classes/${classId}`}
        className="inline-block text-xs font-semibold text-mint underline"
      >
        打開班級相簿看照片與蓋章 →
      </Link>
    </section>
  );
}
