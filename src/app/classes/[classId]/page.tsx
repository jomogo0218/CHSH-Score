import { notFound } from "next/navigation";
import { ClassSiteClient } from "@/components/ClassSiteClient";
import { CLASS_ROSTER } from "@/lib/constants";
import { getDemoClass } from "@/lib/seed/demo-data";

export function generateStaticParams() {
  return CLASS_ROSTER.map((c) => ({ classId: c.class_id }));
}

export default async function ClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const classDoc = getDemoClass(classId);
  if (!classDoc) notFound();
  return <ClassSiteClient classDoc={classDoc} />;
}
