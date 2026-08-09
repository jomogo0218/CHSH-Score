import Link from "next/link";
import type { InspectionDoc } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import {
  displayClassName,
  resolveClassId,
} from "@/lib/classes/resolve-id";

function classHref(classId: string) {
  return `/classes/${resolveClassId(classId) ?? classId}`;
}

export function HallFeed({ items }: { items: InspectionDoc[] }) {
  const openItems = items.filter((i) => i.status !== "fixed");

  return (
    <section className="panel animate-rise p-3 sm:p-4">
      <div className="mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          最新巡察
        </h2>
        <p className="text-xs text-muted">
          只顯示待改善／合格；已銷案請至班級歷史
        </p>
      </div>
      {openItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-paper/70 px-3 py-6 text-center text-sm text-muted">
          目前沒有未銷案的巡察；已改善請至班級「歷史」查看
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {openItems.map((item) => (
            <li key={item.inspection_id}>
              <Link
                href={classHref(item.class_id)}
                className="group flex gap-3 overflow-hidden rounded-lg border border-line bg-paper/90 transition hover:border-mint"
              >
                <div
                  className="h-20 w-24 shrink-0 bg-cover bg-center sm:h-24 sm:w-28"
                  style={{
                    backgroundImage: `url(${item.cover_photo_url ?? ""})`,
                    backgroundColor: "#c5d6cc",
                  }}
                />
                <div className="min-w-0 flex-1 space-y-1 py-2 pr-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink">
                      {displayClassName(item.class_id)}
                    </h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="line-clamp-1 text-xs text-muted">
                    {item.summary_blog}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-[family-name:var(--font-display)] text-base font-bold text-mint">
                      {item.total_score} 分
                    </span>
                    <span className="text-muted">{item.date}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TopBoard({ inspections }: { inspections: InspectionDoc[] }) {
  return (
    <section className="panel animate-rise overflow-hidden">
      <div className="bg-mint px-3 py-2 text-white sm:px-4">
        <h2 className="font-[family-name:var(--font-display)] text-base font-bold">
          今日優良
        </h2>
      </div>
      <ol className="grid grid-cols-3 divide-x divide-line/40">
        {inspections.map((item, index) => (
          <li key={item.inspection_id} className="p-2.5 sm:p-3">
            <Link href={classHref(item.class_id)} className="block space-y-1">
              <p className="text-[11px] text-muted">#{index + 1}</p>
              <p className="truncate text-sm font-semibold text-ink">
                {displayClassName(item.class_id)}
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
                {item.total_score}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
