"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  fetchComments,
  fetchInspectionItems,
} from "@/lib/firebase/firestore";
import {
  getLocalCommentsByClass,
  getLocalItems,
} from "@/lib/local/store";
import { getCommentsForInspection, getItemsForInspection } from "@/lib/seed/demo-data";
import type { CommentDoc, InspectionDoc, InspectionItemDoc } from "@/lib/types";

function ImprovedStamp() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10"
      aria-hidden
    >
      <span className="rotate-[-20deg] rounded-md border-[3px] border-mint bg-white/85 px-2 py-0.5 text-sm font-black tracking-[0.3em] text-mint shadow-md">
        已改善
      </span>
    </div>
  );
}

type DetailCache = {
  items: InspectionItemDoc[];
  comments: CommentDoc[];
};

/**
 * 已改善／已銷案案件檔案：點開即可重看當日照片、說明與回報佐證。
 * 資料本來就保留在 Firestore，此區只是班級頁的歷史入口。
 */
export function CaseHistory({
  inspections,
  classId,
  initialItemsByInspection,
  initialComments,
}: {
  inspections: InspectionDoc[];
  classId: string;
  initialItemsByInspection: Record<string, InspectionItemDoc[]>;
  initialComments: CommentDoc[];
}) {
  const history = inspections
    .filter((i) => i.status === "fixed")
    .sort((a, b) => b.date.localeCompare(a.date));

  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailCache>>(() => {
    const seed: Record<string, DetailCache> = {};
    for (const insp of history) {
      const items = initialItemsByInspection[insp.inspection_id] ?? [];
      const comments = initialComments.filter(
        (c) => c.inspection_id === insp.inspection_id,
      );
      if (items.length || comments.length) {
        seed[insp.inspection_id] = { items, comments };
      }
    }
    return seed;
  });

  async function ensureDetails(insp: InspectionDoc) {
    const id = insp.inspection_id;
    if (details[id]?.items.length) return;

    setBusyId(id);
    try {
      let items = initialItemsByInspection[id] ?? [];
      if (!items.length) items = getLocalItems(id);
      if (!items.length) items = getItemsForInspection(id);
      let comments = initialComments.filter((c) => c.inspection_id === id);

      if (isFirebaseConfigured()) {
        try {
          const remoteItems = await fetchInspectionItems(id);
          if (remoteItems.length) items = remoteItems;
          const remoteComments = await fetchComments(id);
          if (remoteComments.length) {
            const map = new Map<string, CommentDoc>();
            for (const c of [...comments, ...remoteComments]) {
              map.set(c.comment_id, c);
            }
            comments = [...map.values()].sort((a, b) =>
              b.created_at.localeCompare(a.created_at),
            );
          }
        } catch {
          // keep local/demo
        }
      } else {
        const localComments = getLocalCommentsByClass(classId).filter(
          (c) => c.inspection_id === id,
        );
        if (localComments.length) comments = localComments;
      }

      if (!items.length && insp.cover_photo_url) {
        items = [
          {
            item_id: "cover",
            inspection_id: id,
            category: "封面",
            score_deduction: 0,
            note: insp.summary_blog,
            photo_url: insp.cover_photo_url,
            photo_timestamp: "",
          },
        ];
      }

      setDetails((prev) => ({ ...prev, [id]: { items, comments } }));
    } finally {
      setBusyId(null);
    }
  }

  async function onToggle(insp: InspectionDoc) {
    const id = insp.inspection_id;
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    await ensureDetails(insp);
  }

  if (history.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-8 text-center text-sm text-muted">
        尚無已改善的歷史檔案。確認改善成功後，案件會自動留在這裡供隨時重看。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-mint/25 bg-leaf/10 px-3 py-2 text-xs text-ink sm:text-sm">
        已改善案件會永久保留（照片不刪）。點選日期即可展開當日缺失照、說明與導師回報。
      </p>
      <ul className="space-y-2">
        {history.map((insp) => {
          const open = openId === insp.inspection_id;
          const detail = details[insp.inspection_id];
          const loading = busyId === insp.inspection_id;

          return (
            <li
              key={insp.inspection_id}
              className="overflow-hidden rounded-xl border border-line bg-white/80"
            >
              <button
                type="button"
                onClick={() => void onToggle(insp)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-3 text-left hover:bg-leaf/10"
              >
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
                    {(insp.date ?? "").replaceAll("-", "/") ||
                      insp.inspection_id}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                    {insp.summary_blog || "（無說明）"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={insp.status} />
                  <span className="text-sm font-semibold text-mint">
                    {insp.total_score} 分
                  </span>
                  <span className="text-xs text-muted">
                    {loading ? "載入中…" : open ? "收合" : "查看"}
                  </span>
                </div>
              </button>

              {open ? (
                <div className="space-y-3 border-t border-line bg-paper/50 px-3 py-3">
                  {insp.summary_blog ? (
                    <p className="text-sm leading-relaxed text-ink">
                      {insp.summary_blog}
                    </p>
                  ) : null}

                  {loading && !detail ? (
                    <p className="text-sm text-muted">正在載入歷史照片…</p>
                  ) : null}

                  {detail && detail.items.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {detail.items.map((item) => (
                        <figure
                          key={item.item_id}
                          className="overflow-hidden rounded-lg border border-line bg-white"
                        >
                          <div className="relative">
                            {item.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.photo_url}
                                alt={item.note || item.category}
                                className="aspect-[4/3] w-full object-cover opacity-90"
                              />
                            ) : (
                              <div className="flex aspect-[4/3] items-center justify-center bg-paper text-xs text-muted">
                                無照片
                              </div>
                            )}
                            {item.photo_url ? <ImprovedStamp /> : null}
                          </div>
                          <figcaption className="space-y-0.5 p-2 text-[11px]">
                            <p className="font-semibold text-ink">
                              {item.category}
                            </p>
                            <p className="line-clamp-2 text-muted">
                              {item.note}
                            </p>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : !loading ? (
                    <p className="text-sm text-muted">此筆沒有保存照片細項。</p>
                  ) : null}

                  {detail && detail.comments.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-ink">
                        當日改善回報
                      </p>
                      {detail.comments.map((c) => (
                        <div
                          key={c.comment_id}
                          className="rounded-lg border border-line bg-white px-3 py-2"
                        >
                          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-1 text-xs text-muted">
                            <span className="font-semibold text-ink">
                              {c.author_name}
                            </span>
                            <time>
                              {new Date(c.created_at).toLocaleString("zh-TW")}
                            </time>
                          </div>
                          <p className="text-sm leading-relaxed">{c.content}</p>
                          {c.reply_photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.reply_photo_url}
                              alt="改善佐證"
                              className="mt-2 max-h-40 rounded-md object-cover"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
