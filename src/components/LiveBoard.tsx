import Link from "next/link";
import type { InspectionDoc } from "@/lib/types";
import { resolveClassId } from "@/lib/classes/resolve-id";
import { getDemoClass } from "@/lib/seed/demo-data";
import { STATUS_LABELS } from "@/lib/constants";
import {
  deficiencyCountOf,
  formatDeficiency,
  weeklyDeficiencyByClass,
} from "@/lib/scoring/deficiency";

function classLabel(classId: string): string {
  const resolved = resolveClassId(classId) ?? classId;
  return (
    getDemoClass(resolved)?.class_name ??
    getDemoClass(classId)?.class_name ??
    classId
  );
}

function classHref(classId: string): string {
  return `/classes/${resolveClassId(classId) ?? classId}`;
}

/** 每班只留最新一筆，供看板一格一班 */
function latestPerClass(items: InspectionDoc[]): InspectionDoc[] {
  const map = new Map<string, InspectionDoc>();
  for (const item of items) {
    const key = resolveClassId(item.class_id) ?? item.class_id;
    const prev = map.get(key);
    if (!prev || item.created_at > prev.created_at) {
      map.set(key, { ...item, class_id: key });
    }
  }
  return [...map.values()].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

function statusTone(status: InspectionDoc["status"]): string {
  if (status === "pass") return "border-leaf/40 bg-leaf/10 text-mint";
  if (status === "pending_fix") return "border-coral/40 bg-coral/10 text-coral";
  return "border-sun/40 bg-sun/15 text-[#9a6a14]";
}

export function LiveBoard({ items }: { items: InspectionDoc[] }) {
  // 已銷案不佔看板；只留待改善／合格等未結案
  const openItems = items.filter((i) => i.status !== "fixed");
  const tiles = latestPerClass(openItems).slice(0, 24);
  const newest = tiles[0];
  const weekly = new Map(
    weeklyDeficiencyByClass(items).map((r) => [r.classId, r.count]),
  );

  return (
    <div className="space-y-3">
      <header className="animate-rise flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
            即時看板
          </h1>
          <p className="text-xs text-muted">
            僅顯示尚未銷案 · 數字為缺失次數 · 本週累計見小字
          </p>
        </div>
        {newest ? (
          <p className="text-xs text-muted">
            最新：{classLabel(newest.class_id)}{" "}
            {formatDeficiency(deficiencyCountOf(newest))}
          </p>
        ) : null}
      </header>

      {tiles.length === 0 ? (
        <p className="panel p-4 text-center text-sm text-muted">
          目前沒有未銷案的巡察（皆已改善或尚無資料）
        </p>
      ) : (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tiles.map((item) => {
            const weekCount = weekly.get(item.class_id);
            return (
              <Link
                key={item.inspection_id}
                href={classHref(item.class_id)}
                className={`panel flex flex-col gap-1 rounded-lg border p-2.5 transition hover:-translate-y-0.5 hover:border-mint sm:p-3 ${statusTone(item.status)}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="min-w-0 truncate text-xs font-semibold text-ink sm:text-sm">
                    {classLabel(item.class_id)}
                  </p>
                  <span className="shrink-0 text-[10px] font-medium opacity-80">
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-mint sm:text-4xl">
                  {deficiencyCountOf(item)}
                </p>
                <p className="text-[10px] text-muted">當日缺失</p>
                {weekCount !== undefined ? (
                  <p className="text-[10px] text-muted">本週累計 {weekCount}</p>
                ) : null}
                <p className="line-clamp-2 text-[10px] leading-snug text-muted sm:text-[11px]">
                  {item.summary_blog}
                </p>
                <p className="mt-auto text-[10px] text-muted">{item.date}</p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
