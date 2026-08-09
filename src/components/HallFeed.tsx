import Link from "next/link";
import type { InspectionDoc } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { sameClass } from "@/lib/class-pin/storage";
import {
  displayClassName,
  resolveClassId,
} from "@/lib/classes/resolve-id";
import {
  deficiencyCountOf,
  formatDeficiency,
} from "@/lib/scoring/deficiency";
import {
  formatFixDeadlineLabel,
  isFixOverdue,
} from "@/lib/time/taiwan";

function classHref(classId: string) {
  return `/classes/${resolveClassId(classId) ?? classId}`;
}

function mineClass(classId: string, highlight?: string | null) {
  return Boolean(highlight && sameClass(classId, highlight));
}

export function HallFeed({
  items,
  highlightClassId,
}: {
  items: InspectionDoc[];
  highlightClassId?: string | null;
}) {
  const openItems = [...items]
    .filter((i) => i.status !== "fixed")
    .sort((a, b) => {
      const am = mineClass(a.class_id, highlightClassId) ? 0 : 1;
      const bm = mineClass(b.class_id, highlightClassId) ? 0 : 1;
      if (am !== bm) return am - bm;
      const ao = isFixOverdue(a.date, a.status) ? 0 : 1;
      const bo = isFixOverdue(b.date, b.status) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return b.created_at.localeCompare(a.created_at);
    });

  return (
    <section className="panel animate-rise p-3 sm:p-4">
      <div className="mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          待改善
        </h2>
        <p className="text-xs text-muted">
          尚未銷案的班級會出現在這裡。看到自己班就點進去回報；逾時會標示
        </p>
      </div>
      {openItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-paper/70 px-3 py-6 text-center text-sm text-muted">
          目前沒有待改善；本班若已改善請至班級「歷史」查看
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {openItems.map((item) => {
            const mine = mineClass(item.class_id, highlightClassId);
            const overdue = isFixOverdue(item.date, item.status);
            return (
              <li key={item.inspection_id}>
                <Link
                  href={classHref(item.class_id)}
                  className={`group flex gap-3 overflow-hidden rounded-lg border bg-paper/90 transition hover:border-mint ${
                    item.status === "pending_fix" || deficiencyCountOf(item) > 0
                      ? "alert-box"
                      : "border-line"
                  } ${mine ? "mine-box" : ""}`}
                >
                  <div
                    className="h-20 w-24 shrink-0 bg-cover bg-center sm:h-24 sm:w-28"
                    style={{
                      backgroundImage: `url(${item.cover_photo_url ?? ""})`,
                      backgroundColor: "var(--line)",
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-1 py-2 pr-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-ink">
                        {displayClassName(item.class_id)}
                        {mine ? " · 本班" : ""}
                      </h3>
                      <StatusBadge status={item.status} overdue={overdue} />
                    </div>
                    <p className="line-clamp-1 text-xs text-muted">
                      {item.summary_blog}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-[family-name:var(--font-display)] text-base font-bold text-mint">
                        {formatDeficiency(deficiencyCountOf(item))}
                      </span>
                      <span className={overdue ? "font-semibold text-coral" : "text-muted"}>
                        {overdue
                          ? `已逾時（${formatFixDeadlineLabel(item.date)}）`
                          : item.status === "pending_fix"
                            ? `${formatFixDeadlineLabel(item.date)}前`
                            : item.date}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TopBoard({
  inspections,
  highlightClassId,
}: {
  inspections: InspectionDoc[];
  highlightClassId?: string | null;
}) {
  return (
    <section className="panel animate-rise overflow-hidden">
      <div className="bg-mint px-3 py-2 text-white sm:px-4">
        <h2 className="font-[family-name:var(--font-display)] text-base font-bold">
          今日優良
        </h2>
        <p className="text-[11px] text-white/80">缺失最少的班 · 點班名可進班級頁</p>
      </div>
      <ol className="grid grid-cols-3 divide-x divide-line/40">
        {inspections.map((item, index) => {
          const mine = mineClass(item.class_id, highlightClassId);
          return (
            <li key={item.inspection_id} className="p-2.5 sm:p-3">
              <Link
                href={classHref(item.class_id)}
                className={`block space-y-1 rounded-md p-1 ${
                  deficiencyCountOf(item) > 0 ? "alert-box" : ""
                } ${mine ? "mine-box" : ""}`}
              >
                <p className="text-[11px] text-muted">
                  #{index + 1}
                  {mine ? " · 本班" : ""}
                </p>
                <p className="truncate text-sm font-semibold text-ink">
                  {displayClassName(item.class_id)}
                </p>
                <p className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
                  {deficiencyCountOf(item)}
                </p>
                <p className="text-[11px] text-muted">缺失</p>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function RankBoard({
  title,
  hint,
  rows,
  highlightClassId,
}: {
  title: string;
  hint: string;
  rows: Array<{ classId: string; count: number }>;
  highlightClassId?: string | null;
}) {
  if (rows.length === 0) return null;
  const ordered = highlightClassId
    ? [...rows].sort((a, b) => {
        const am = mineClass(a.classId, highlightClassId) ? 0 : 1;
        const bm = mineClass(b.classId, highlightClassId) ? 0 : 1;
        return am - bm;
      })
    : rows;

  return (
    <div>
      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-mint">
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
      <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {ordered.slice(0, 12).map((row) => {
          const mine = mineClass(row.classId, highlightClassId);
          return (
            <li key={row.classId}>
              <Link
                href={classHref(row.classId)}
                className={`flex items-baseline justify-between gap-2 rounded-lg border bg-paper/80 px-2.5 py-2 hover:border-mint ${
                  row.count > 0 ? "alert-box" : "border-line"
                } ${mine ? "mine-box" : ""}`}
              >
                <span className="truncate text-sm font-semibold text-ink">
                  {displayClassName(row.classId)}
                  {mine ? " · 本班" : ""}
                </span>
                <span className="shrink-0 font-[family-name:var(--font-display)] text-base font-bold text-mint">
                  {row.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WeeklyBoard({
  rows,
  weekLabel,
  highlightClassId,
}: {
  rows: Array<{ classId: string; count: number }>;
  weekLabel: string;
  highlightClassId?: string | null;
}) {
  return (
    <RankBoard
      title="本週累計缺失"
      hint={`${weekLabel}（週一至週日）· 紅燈＝有缺失，點自己班`}
      rows={rows}
      highlightClassId={highlightClassId}
    />
  );
}
