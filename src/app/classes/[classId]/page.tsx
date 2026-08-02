import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumGrid } from "@/components/AlbumGrid";
import { BlogList } from "@/components/BlogList";
import { ClassBanner } from "@/components/ClassBanner";
import { Guestbook } from "@/components/Guestbook";
import { CLASS_ROSTER } from "@/lib/constants";
import {
  DEMO_CLASSES,
  getCommentsForInspection,
  getDemoClass,
  getInspectionsForClass,
  getItemsForInspection,
} from "@/lib/seed/demo-data";
import type { ClassDoc, InspectionItemDoc } from "@/lib/types";

export function generateStaticParams() {
  return CLASS_ROSTER.map((c) => ({ classId: c.class_id }));
}

function resolveClass(classId: string): ClassDoc | null {
  const demo = getDemoClass(classId);
  if (demo) return demo;
  const roster = CLASS_ROSTER.find((c) => c.class_id === classId);
  if (!roster) return null;
  return {
    ...roster,
    homeroom_teacher: "（待設定）",
    avatar_url: `https://picsum.photos/seed/av${classId}/200/200`,
    banner_url: `https://picsum.photos/seed/bn${classId}/1200/360`,
    motto: "歡迎來到本班環境小站",
  };
}

export default async function ClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const classDoc = resolveClass(classId);
  if (!classDoc) notFound();

  const inspections = getInspectionsForClass(classId);
  const itemsByInspection: Record<string, InspectionItemDoc[]> = {};
  const allComments = inspections.flatMap((insp) => {
    itemsByInspection[insp.inspection_id] = getItemsForInspection(
      insp.inspection_id,
    );
    return getCommentsForInspection(insp.inspection_id);
  });

  const hasDemoProfile = DEMO_CLASSES.some((c) => c.class_id === classId);

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

      {!hasDemoProfile ? (
        <p className="rounded-lg border border-line bg-paper/80 px-3 py-2 text-sm text-muted">
          此班為名冊預留頁，示範內容較少。可先瀏覽{" "}
          {DEMO_CLASSES.map((c) => (
            <Link
              key={c.class_id}
              href={`/classes/${c.class_id}`}
              className="mx-1 text-mint underline-offset-2 hover:underline"
            >
              {c.class_name}
            </Link>
          ))}
          。
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
        <Guestbook comments={allComments} />
      </section>
    </div>
  );
}
