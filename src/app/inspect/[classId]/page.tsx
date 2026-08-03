import { redirect } from "next/navigation";
import { InspectForm } from "@/components/InspectForm";
import { resolveClassId } from "@/lib/classes/resolve-id";

export const dynamicParams = true;

export default async function InspectClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId: raw } = await params;
  const resolved = resolveClassId(raw);

  if (resolved && resolved !== raw) {
    redirect(`/inspect/${resolved}`);
  }

  return <InspectForm classId={resolved ?? raw} />;
}
