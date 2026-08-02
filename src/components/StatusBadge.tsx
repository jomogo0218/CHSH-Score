import type { InspectionStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

export function StatusBadge({ status }: { status: InspectionStatus }) {
  return (
    <span
      className={`status-${status} inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
