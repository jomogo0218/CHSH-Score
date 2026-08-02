import { InspectShell } from "@/components/InspectShell";

export default async function InspectClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <InspectShell classId={classId} />;
}
