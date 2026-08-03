import { redirect } from "next/navigation";
import { ClassNotFound } from "@/components/ClassNotFound";
import { ClassSiteClient } from "@/components/ClassSiteClient";
import { CLASS_ROSTER } from "@/lib/constants";
import { resolveClassId } from "@/lib/classes/resolve-id";
import { getDemoClass } from "@/lib/seed/demo-data";

export const dynamicParams = true;

export function generateStaticParams() {
  return CLASS_ROSTER.map((c) => ({ classId: c.class_id }));
}

export default async function ClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId: raw } = await params;
  const resolved = resolveClassId(raw);

  if (!resolved) {
    return <ClassNotFound classId={raw} />;
  }
  if (resolved !== raw) {
    redirect(`/classes/${resolved}`);
  }

  const classDoc = getDemoClass(resolved);
  if (!classDoc) {
    return <ClassNotFound classId={raw} />;
  }
  return <ClassSiteClient classDoc={classDoc} />;
}
