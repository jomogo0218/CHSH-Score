"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TEACHER_ZONE_LABEL } from "@/lib/constants";
import { AlbumGrid } from "@/components/AlbumGrid";
import { CaseHistory } from "@/components/CaseHistory";
import { ClassBanner } from "@/components/ClassBanner";
import { Guestbook } from "@/components/Guestbook";
import { PinClassBar } from "@/components/PinClassBar";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  CLASS_INSPECTIONS_LIMIT,
  fetchComments,
  fetchInspectionItems,
  fetchInspectionsByClass,
} from "@/lib/firebase/firestore";
import {
  getLocalCommentsByClass,
  getLocalInspectionsByClass,
  getLocalItems,
} from "@/lib/local/store";
import {
  DEMO_CLASSES,
  getCommentsForInspection,
  getInspectionsForClass,
  getItemsForInspection,
} from "@/lib/seed/demo-data";
import {
  deficiencyTotalInRange,
  weeklyDeficiencyTotal,
} from "@/lib/scoring/deficiency";
import {
  formatFixDeadlineLabel,
  isFixOverdue,
  taiwanMonthEnd,
  taiwanMonthStart,
  taiwanSemesterEnd,
  taiwanSemesterStart,
  taiwanWeekEnd,
  taiwanWeekStart,
} from "@/lib/time/taiwan";
import type {
  ClassDoc,
  CommentDoc,
  InspectionDoc,
  InspectionItemDoc,
} from "@/lib/types";

/** 僅對最近幾筆進行中巡檢預先拉 items／comments */
const DETAIL_FETCH_LIMIT = 5;

export function ClassSiteClient({ classDoc }: { classDoc: ClassDoc }) {
  const classId = classDoc.class_id;
  const [inspections, setInspections] = useState<InspectionDoc[]>(
    getInspectionsForClass(classId),
  );
  const [itemsByInspection, setItemsByInspection] = useState<
    Record<string, InspectionItemDoc[]>
  >({});
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const hasDemoProfile = DEMO_CLASSES.some((c) => c.class_id === classId);

  const pendingInspections = useMemo(
    () => inspections.filter((i) => i.status === "pending_fix"),
    [inspections],
  );
  const historyCount = inspections.filter((i) => i.status === "fixed").length;
  const needsReport = pendingInspections.length > 0;
  const weeklyTotal = weeklyDeficiencyTotal(inspections, classId);
  const monthlyTotal = deficiencyTotalInRange(
    inspections,
    classId,
    taiwanMonthStart(),
    taiwanMonthEnd(),
  );
  const semesterTotal = deficiencyTotalInRange(
    inspections,
    classId,
    taiwanSemesterStart(),
    taiwanSemesterEnd(),
  );
  const weekLabel = `${taiwanWeekStart().replaceAll("-", "/")}～${taiwanWeekEnd().replaceAll("-", "/")}`;
  const latestPending = pendingInspections[0];
  const overdue = latestPending
    ? isFixOverdue(latestPending.date, latestPending.status)
    : false;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const demo = getInspectionsForClass(classId);
      const local = getLocalInspectionsByClass(classId);
      let remote: InspectionDoc[] = [];
      if (isFirebaseConfigured()) {
        try {
          remote = await fetchInspectionsByClass(
            classId,
            CLASS_INSPECTIONS_LIMIT,
          );
        } catch {
          // ignore
        }
      }

      const hasReal = remote.length > 0 || local.length > 0;
      const seed = hasReal ? [] : demo;

      const map = new Map<string, InspectionDoc>();
      for (const item of [...seed, ...local, ...remote]) {
        map.set(item.inspection_id, item);
      }
      const merged = [...map.values()]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, CLASS_INSPECTIONS_LIMIT);

      const itemsMap: Record<string, InspectionItemDoc[]> = {};
      const allComments: CommentDoc[] = [];
      const localComments = getLocalCommentsByClass(classId);
      allComments.push(...localComments);

      const preloadOrder = [
        ...merged.filter((i) => i.status !== "fixed"),
        ...merged.filter((i) => i.status === "fixed"),
      ];

      for (let i = 0; i < preloadOrder.length; i++) {
        const insp = preloadOrder[i];
        let items = hasReal
          ? getLocalItems(insp.inspection_id)
          : getItemsForInspection(insp.inspection_id);
        const localItems = getLocalItems(insp.inspection_id);
        if (localItems.length) items = localItems;

        const shouldFetchRemote =
          isFirebaseConfigured() &&
          i < DETAIL_FETCH_LIMIT &&
          insp.status !== "fixed";
        if (shouldFetchRemote) {
          try {
            const remoteItems = await fetchInspectionItems(insp.inspection_id);
            if (remoteItems.length) items = remoteItems;

            const remoteComments = await fetchComments(insp.inspection_id);
            allComments.push(...remoteComments);
          } catch {
            // ignore
          }
        } else if (!hasReal) {
          allComments.push(...getCommentsForInspection(insp.inspection_id));
        }
        itemsMap[insp.inspection_id] = items;
      }

      const commentMap = new Map<string, CommentDoc>();
      for (const c of allComments) commentMap.set(c.comment_id, c);
      const uniqueComments = [...commentMap.values()].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );

      if (cancelled) return;
      setInspections(merged);
      setItemsByInspection(itemsMap);
      setComments(uniqueComments);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-xs text-muted">
        <Link href="/" className="hover:text-mint">
          {TEACHER_ZONE_LABEL}
        </Link>
        <span className="mx-1.5">/</span>
        {classDoc.class_name}
      </p>

      <ClassBanner classDoc={classDoc} />
      <PinClassBar classId={classId} />

      <details className={`panel px-3 py-2.5 sm:px-4 ${weeklyTotal > 0 || monthlyTotal > 0 ? "alert-box" : ""}`}>
        <summary className="cursor-pointer list-none text-sm text-ink [&::-webkit-details-marker]:hidden">
          本週累計缺失{" "}
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-mint">
            {weeklyTotal}
          </span>{" "}
          次
          <span className="ml-2 text-xs font-normal text-muted">點開查看</span>
        </summary>
        <div className="mt-2 space-y-1">
          <p className="text-[11px] text-muted">{weekLabel}（週一至週日）</p>
          <p className="text-xs text-muted">
            本月 {monthlyTotal} 次 · 本學期 {semesterTotal} 次
          </p>
        </div>
      </details>

      {!hasDemoProfile && inspections.length === 0 ? (
        <p className="rounded-lg border border-line bg-paper/80 px-3 py-2 text-sm text-muted">
          此班尚無巡察紀錄。
        </p>
      ) : null}

      <section
        className={`panel p-3 sm:p-4 ${needsReport ? "alert-box" : ""}`}
      >
        <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          待改善
        </h2>
        {latestPending ? (
          <p className={`mb-3 text-xs ${overdue ? "font-semibold text-coral" : "text-muted"}`}>
            {overdue ? "已逾時 · " : ""}
            請於 {formatFixDeadlineLabel(latestPending.date)} 前拍照回報
          </p>
        ) : null}
        <AlbumGrid
          inspections={pendingInspections}
          itemsByInspection={itemsByInspection}
          classId={classId}
          mode="teacher"
          onInspectionUpdated={(updated) => {
            setInspections((prev) =>
              prev.map((i) =>
                i.inspection_id === updated.inspection_id ? updated : i,
              ),
            );
          }}
        />
        {needsReport ? (
          <div className="mt-3">
            <Guestbook
              comments={comments}
              classId={classId}
              inspections={inspections}
              compact
            />
          </div>
        ) : null}
      </section>

      <details className="panel p-3 sm:p-4">
        <summary className="cursor-pointer list-none font-[family-name:var(--font-display)] text-lg font-bold text-mint [&::-webkit-details-marker]:hidden">
          歷史{historyCount ? `（${historyCount}）` : ""}
          <span className="ml-2 text-xs font-normal text-muted">點開查看</span>
        </summary>
        <div className="mt-3">
          <CaseHistory
            inspections={inspections}
            classId={classId}
            initialItemsByInspection={itemsByInspection}
            initialComments={comments}
            compact
          />
        </div>
      </details>

      <p className="px-1 text-center text-xs text-muted">
        <Link href="/recycle" className="text-mint underline">
          資源回收分類
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/supply" className="text-mint underline">
          學務處領用
        </Link>
      </p>
    </div>
  );
}
