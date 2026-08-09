import type { InspectionDoc } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { deficiencyCountOf, formatDeficiency } from "@/lib/scoring/deficiency";

export function BlogList({ inspections }: { inspections: InspectionDoc[] }) {
  if (inspections.length === 0) {
    return (
      <p className="text-sm text-[color:var(--ink-muted)]">尚無網誌評價</p>
    );
  }

  return (
    <div className="space-y-3">
      {inspections.map((insp) => (
        <article
          key={insp.inspection_id}
          className="rounded-xl border border-[color:var(--border)]/60 bg-paper/70 p-4"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--ink-muted)]">
            <time>{insp.date}</time>
            <StatusBadge status={insp.status} />
            <span className="tabular-nums">
              {formatDeficiency(deficiencyCountOf(insp))}
            </span>
          </div>
          <p className="leading-relaxed">{insp.summary_blog}</p>
        </article>
      ))}
    </div>
  );
}
