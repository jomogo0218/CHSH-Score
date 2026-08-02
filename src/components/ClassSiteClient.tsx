"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlbumGrid } from "@/components/AlbumGrid";
import { BlogList } from "@/components/BlogList";
import { ClassBanner } from "@/components/ClassBanner";
import { Guestbook } from "@/components/Guestbook";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  fetchComments,
  fetchInspectionItems,
  fetchInspectionsByClass,
} from "@/lib/firebase/firestore";
import {
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
          remote = await fetchInspectionsByClass(classId);
        } catch {
          // ignore
        }
      }

      const map = new Map<string, InspectionDoc>();
      for (const item of [...demo, ...local, ...remote]) {
        map.set(item.inspection_id, item);
      }
      const merged = [...map.values()].sort((a, b) =>
        b.date.localeCompare(a.date),
      );

      const itemsMap: Record<string, InspectionItemDoc[]> = {};
      const allComments: CommentDoc[] = [];

      for (const insp of merged) {
        let items = getItemsForInspection(insp.inspection_id);
        const localItems = getLocalItems(insp.inspection_id);
        if (localItems.length) items = localItems;
        if (isFirebaseConfigured()) {
          try {
            const remoteItems = await fetchInspectionItems(insp.inspection_id);
            if (remoteItems.length) items = remoteItems;
            const remoteComments = await fetchComments(insp.inspection_id);
            allComments.push(...remoteComments);
          } catch {
            // ignore
          }
        }
        if (!allComments.length) {
          allComments.push(...getCommentsForInspection(insp.inspection_id));
        }
        itemsMap[insp.inspection_id] = items;
      }

      if (cancelled) return;
      setInspections(merged);
      setItemsByInspection(itemsMap);
      setComments(allComments);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        <Link href="/" className="hover:text-mint">
          校園大廳
        </Link>
        <span className="mx-2">/</span>
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

      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          { id: "albums", label: "相簿" },
          { id: "blogs", label: "網誌" },
          { id: "guestbook", label: "留言板" },
        ].map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 hover:bg-leaf/15"
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <section id="albums" className="panel scroll-mt-24 p-5 sm:p-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
          相簿專區
        </h2>
        <AlbumGrid
          inspections={inspections}
          itemsByInspection={itemsByInspection}
        />
      </section>

      <section id="blogs" className="panel scroll-mt-24 p-5 sm:p-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
          網誌專區
        </h2>
        <BlogList inspections={inspections} />
      </section>

      <section id="guestbook" className="panel scroll-mt-24 p-5 sm:p-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
          互動留言板
        </h2>
        <Guestbook comments={comments} />
      </section>
    </div>
  );
}
