import Link from "next/link";
import type { InspectionDoc } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { getDemoClass } from "@/lib/seed/demo-data";

export function HallFeed({ items }: { items: InspectionDoc[] }) {
  return (
    <section className="panel animate-rise p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
          最新巡察佐證
        </h2>
        <p className="mt-1 text-sm text-muted">
          點進班級可看照片；待改善班級請清掃後於留言板回報
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const cls = getDemoClass(item.class_id);
          return (
            <li key={item.inspection_id}>
              <Link
                href={`/classes/${item.class_id}`}
                className="group block overflow-hidden rounded-xl border border-line bg-paper/90 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
              >
                <div
                  className="h-36 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                  style={{
                    backgroundImage: `url(${item.cover_photo_url ?? "https://picsum.photos/seed/fallback/800/500"})`,
                  }}
                />
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">
                      {cls?.class_name ?? item.class_id}
                    </h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted">
                    {item.summary_blog}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
                      {item.total_score} 分
                    </span>
                    <span className="text-muted">{item.date}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TopBoard({ inspections }: { inspections: InspectionDoc[] }) {
  return (
    <section className="panel animate-rise overflow-hidden">
      <div className="border-b border-line/50 bg-mint px-5 py-3 text-white sm:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          今日優良
        </h2>
        <p className="text-sm text-white/85">本日巡察得分較高的班級</p>
      </div>
      <ol className="grid gap-0 sm:grid-cols-3">
        {inspections.map((item, index) => {
          const cls = getDemoClass(item.class_id);
          return (
            <li
              key={item.inspection_id}
              className="border-line/40 p-5 sm:border-r sm:last:border-r-0"
            >
              <Link href={`/classes/${item.class_id}`} className="block space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf/20 text-sm font-bold text-mint">
                    {index + 1}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cls?.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full border-2 border-white object-cover shadow"
                  />
                  <div>
                    <p className="font-semibold text-ink">
                      {cls?.class_name ?? item.class_id}
                    </p>
                    <p className="text-xs text-muted">{cls?.homeroom_teacher}</p>
                  </div>
                </div>
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-mint">
                  {item.total_score}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
