import type { InspectionStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

export function StatusBadge({
  status,
  overdue = false,
}: {
  status: InspectionStatus;
  overdue?: boolean;
}) {
  const label =
    status === "pending_fix" && overdue ? "已逾時" : STATUS_LABELS[status];
  return (
    <span
      className={`status-${status} inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide ${
        status === "pending_fix" ? "alert-box" : ""
      }`}
    >
      {label}
    </span>
  );
}
