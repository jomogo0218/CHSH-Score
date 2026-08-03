import Link from "next/link";
import type { InspectionDoc } from "@/lib/types";
import { getDemoClass } from "@/lib/seed/demo-data";
import { StatusBadge } from "@/components/StatusBadge";

export function LiveBoard({ items }: { items: InspectionDoc[] }) {
  const latest = items[0];
  const rest = items.slice(0, 12);

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="animate-rise">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
          即時看板
        </h1>
        <p className="mt-0.5 text-xs text-muted">最新巡察分數與狀態</p>
      </header>

      {latest ? (
        <section className="panel flex items-center gap-3 overflow-hidden p-2.5 sm:gap-4 sm:p-3">
          <div
            className="h-14 w-14 shrink-0 rounded-lg bg-cover bg-center sm:h-16 sm:w-16"
            style={{
              backgroundImage: `url(${latest.cover_photo_url ?? ""})`,
              backgroundColor: "#c5d6cc",
            }}
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={latest.status} />
              <span className="text-[11px] text-muted">最新</span>
            </div>
            <h2 className="truncate font-[family-name:var(--font-display)] text-base font-bold sm:text-lg">
              {getDemoClass(latest.class_id)?.class_name ?? latest.class_id}
            </h2>
            <p className="line-clamp-1 text-xs text-muted">{latest.summary_blog}</p>
          </div>
          <p className="shrink-0 font-[family-name:var(--font-display)] text-3xl font-bold text-mint sm:text-4xl">
            {latest.total_score}
          </p>
        </section>
      ) : null}

      <section className="panel p-2.5 sm:p-3">
        <h3 className="mb-2 px-0.5 text-sm font-semibold text-ink">近期動態</h3>
        <ul className="divide-y divide-line/50">
          {rest.map((item) => {
            const name =
              getDemoClass(item.class_id)?.class_name ?? item.class_id;
            return (
              <li key={item.inspection_id}>
                <Link
                  href={`/classes/${item.class_id}`}
                  className="flex items-center gap-2.5 py-2 transition hover:bg-leaf/10"
                >
                  <div
                    className="h-9 w-9 shrink-0 rounded-md bg-cover bg-center sm:h-10 sm:w-10"
                    style={{
                      backgroundImage: `url(${item.cover_photo_url ?? ""})`,
                      backgroundColor: "#c5d6cc",
                    }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {item.date} · {item.summary_blog}
                    </p>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-display)] text-lg font-bold text-mint">
                    {item.total_score}
                  </span>
                  <StatusBadge status={item.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
