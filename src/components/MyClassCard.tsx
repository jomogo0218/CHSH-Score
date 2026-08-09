"use client";

import Link from "next/link";
import { displayClassName, resolveClassId } from "@/lib/classes/resolve-id";
import { sameClass } from "@/lib/class-pin/storage";
import {
  deficiencyCountOf,
  formatDeficiency,
} from "@/lib/scoring/deficiency";
import {
  formatFixDeadlineLabel,
  isFixOverdue,
} from "@/lib/time/taiwan";
import type { InspectionDoc } from "@/lib/types";

export function MyClassCard({
  classId,
  inspections,
}: {
  classId: string;
  inspections: InspectionDoc[];
}) {
  const href = `/classes/${resolveClassId(classId) ?? classId}`;
  const mine = inspections.filter((i) => sameClass(i.class_id, classId));
  const pending = mine.find((i) => i.status === "pending_fix");
  const latest = mine[0];
  const overdue = pending
    ? isFixOverdue(pending.date, pending.status)
    : false;
  const count = pending ? deficiencyCountOf(pending) : latest ? deficiencyCountOf(latest) : 0;

  return (
    <section
      className={`panel animate-rise p-3 sm:p-4 ${
        pending ? "alert-box" : "mine-box"
      }`}
    >
      <p className="text-xs font-semibold text-mint">我的班</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink">
            {displayClassName(classId)}
          </h2>
          {pending ? (
            <p className="text-sm text-coral">
              {overdue ? "已逾時 · " : ""}
              {formatDeficiency(count)}
              {` · 請於 ${formatFixDeadlineLabel(pending.date)} 前回報`}
            </p>
          ) : (
            <p className="text-sm text-muted">目前沒有待改善</p>
          )}
        </div>
        <Link href={href} className="btn-block btn-primary px-3 py-2 text-sm">
          進入本班
        </Link>
      </div>
    </section>
  );
}
