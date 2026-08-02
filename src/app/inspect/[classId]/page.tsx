import { InspectForm } from "@/components/InspectForm";

export default async function InspectClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <InspectForm classId={classId} />;
}
