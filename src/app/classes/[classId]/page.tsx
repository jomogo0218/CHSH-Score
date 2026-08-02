import { notFound } from "next/navigation";
import { ClassSiteClient } from "@/components/ClassSiteClient";
import { CLASS_ROSTER } from "@/lib/constants";
import { getDemoClass } from "@/lib/seed/demo-data";
import type { ClassDoc } from "@/lib/types";

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
  return <ClassSiteClient classDoc={classDoc} />;
}
