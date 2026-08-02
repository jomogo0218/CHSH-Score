import type { InspectionDoc } from "@/lib/types";
import { getDemoClass } from "@/lib/seed/demo-data";
import { StatusBadge } from "@/components/StatusBadge";

export function LiveBoard({ items }: { items: InspectionDoc[] }) {
  const latest = items[0];

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="animate-rise">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
          即時看板
        </h1>
        <p className="mt-0.5 text-xs text-muted">最新巡察分數與狀態</p>
      </header>

      {latest ? (
        <section className="panel grid gap-0 overflow-hidden sm:grid-cols-[140px_1fr]">
          <div
            className="h-32 bg-cover bg-center sm:h-auto sm:min-h-36"
            style={{ backgroundImage: `url(${latest.cover_photo_url})` }}
          />
          <div className="flex flex-col justify-center gap-1.5 p-3 sm:p-4">
            <StatusBadge status={latest.status} />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold sm:text-xl">
              {getDemoClass(latest.class_id)?.class_name ?? latest.class_id}
            </h2>
            <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-mint">
              {latest.total_score}
            </p>
            <p className="line-clamp-2 text-sm text-muted">{latest.summary_blog}</p>
          </div>
        </section>
      ) : null}

      <section className="panel p-3 sm:p-4">
        <h3 className="mb-2 text-sm font-semibold text-ink">近期動態</h3>
        <ul className="divide-y divide-line/50">
          {items.slice(0, 8).map((item) => (
            <li
              key={item.inspection_id}
              className="flex items-center justify-between gap-2 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                {getDemoClass(item.class_id)?.class_name ?? item.class_id}
              </span>
              <span className="shrink-0 font-bold text-mint">{item.total_score}</span>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
