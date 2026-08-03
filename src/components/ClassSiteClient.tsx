"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlbumGrid } from "@/components/AlbumGrid";
import { BlogList } from "@/components/BlogList";
import { ClassBanner } from "@/components/ClassBanner";
import { ClassQrPanel } from "@/components/ClassQrPanel";
import { ClassReminders } from "@/components/ClassReminders";
import { Guestbook } from "@/components/Guestbook";
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
import type {
  ClassDoc,
  CommentDoc,
  InspectionDoc,
  InspectionItemDoc,
} from "@/lib/types";

/** 僅對最近幾筆巡檢拉 items／comments，避免班級頁一次打爆讀取 */
const DETAIL_FETCH_LIMIT = 3;

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const demo = getInspectionsForClass(classId);
      const local = getLocalInspectionsByClass(classId);
      let remote: InspectionDoc[] = [];
      if (isFirebaseConfigured()) {
        try {
          // 班級相簿不走 TTL，避免剛發布卻還看到舊快取／demo
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

      for (let i = 0; i < merged.length; i++) {
        const insp = merged[i];
        let items = hasReal
          ? getLocalItems(insp.inspection_id)
          : getItemsForInspection(insp.inspection_id);
        const localItems = getLocalItems(insp.inspection_id);
        if (localItems.length) items = localItems;

        const shouldFetchRemote =
          isFirebaseConfigured() && i < DETAIL_FETCH_LIMIT;
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
          大廳
        </Link>
        <span className="mx-1.5">/</span>
        {classDoc.class_name}
      </p>

      <ClassBanner classDoc={classDoc} />

      {!hasDemoProfile && inspections.length === 0 ? (
        <p className="rounded-lg border border-line bg-paper/80 px-3 py-2 text-sm text-muted">
          此班尚無巡檢紀錄。可至{" "}
          <Link href={`/inspect/${classId}`} className="text-mint underline">
            組長評分
          </Link>{" "}
          發布第一則。
        </p>
      ) : null}

      <nav className="flex flex-wrap gap-1.5 text-xs sm:text-sm">
        {[
          { id: "reminders", label: "提醒" },
          { id: "albums", label: "照片" },
          { id: "blogs", label: "說明" },
          { id: "guestbook", label: "回報" },
          { id: "qr", label: "QR" },
        ].map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className="rounded-md border border-line bg-paper px-2.5 py-1 hover:bg-leaf/15"
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <section id="reminders" className="panel scroll-mt-20 p-3 sm:p-4">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          班級提醒
        </h2>
        <ClassReminders />
      </section>

      <section id="albums" className="panel scroll-mt-20 p-3 sm:p-4">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          巡察照片
        </h2>
        <AlbumGrid
          inspections={inspections}
          itemsByInspection={itemsByInspection}
        />
      </section>

      <section id="blogs" className="panel scroll-mt-20 p-3 sm:p-4">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          巡察說明
        </h2>
        <BlogList inspections={inspections} />
      </section>

      <section id="guestbook" className="panel scroll-mt-20 p-3 sm:p-4">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          改善回報
        </h2>
        <Guestbook
          comments={comments}
          classId={classId}
          inspections={inspections}
        />
      </section>

      <section id="qr" className="panel scroll-mt-20 p-3 sm:p-4">
        <ClassQrPanel classId={classId} className={classDoc.class_name} />
      </section>
    </div>
  );
}
