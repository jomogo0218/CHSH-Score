import type { InspectionDoc } from "@/lib/types";
import { getDemoClass } from "@/lib/seed/demo-data";
import { StatusBadge } from "@/components/StatusBadge";

export function LiveBoard({ items }: { items: InspectionDoc[] }) {
  const latest = items[0];

  return (
    <div className="min-h-[70vh] space-y-6">
      <header className="animate-rise text-center">
        <p className="text-sm tracking-[0.25em] text-muted">LOBBY LIVE BOARD</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-mint sm:text-5xl">
          校園環境即時看板
        </h1>
        <p className="mt-2 text-muted">
          第 3 週串接 MQTT `school/clean/live_feed` 後 0 秒更新
        </p>
      </header>

      {latest ? (
        <section className="panel grid gap-6 overflow-hidden p-0 lg:grid-cols-2">
          <div
            className="min-h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${latest.cover_photo_url})` }}
          />
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
            <StatusBadge status={latest.status} />
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              {getDemoClass(latest.class_id)?.class_name ?? latest.class_id}
            </h2>
            <p className="font-[family-name:var(--font-display)] text-6xl font-bold text-mint sm:text-7xl">
              {latest.total_score}
            </p>
            <p className="text-lg leading-relaxed text-muted">
              {latest.summary_blog}
            </p>
          </div>
        </section>
      ) : null}

      <section className="panel p-5">
        <h3 className="mb-3 font-semibold text-ink">近期動態</h3>
        <ul className="divide-y divide-line/50">
          {items.slice(0, 6).map((item) => (
            <li
              key={item.inspection_id}
              className="flex items-center justify-between gap-3 py-3 text-sm sm:text-base"
            >
              <span>
                {getDemoClass(item.class_id)?.class_name ?? item.class_id}
              </span>
              <span className="font-bold text-mint">{item.total_score}</span>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
