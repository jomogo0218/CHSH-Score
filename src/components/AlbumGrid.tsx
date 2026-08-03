import type { InspectionDoc, InspectionItemDoc } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export function AlbumGrid({
  inspections,
  itemsByInspection,
}: {
  inspections: InspectionDoc[];
  itemsByInspection: Record<string, InspectionItemDoc[]>;
}) {
  if (inspections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-8 text-center text-sm text-muted">
        尚無巡檢相簿
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {inspections.map((insp) => {
        const items = itemsByInspection[insp.inspection_id] ?? [];
        const photos =
          items.length > 0
            ? items
            : [
                {
                  item_id: "cover",
                  photo_url: insp.cover_photo_url ?? "",
                  category: "封面",
                  note: insp.summary_blog,
                  score_deduction: 0,
                },
              ];

        return (
          <article key={insp.inspection_id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
                {insp.date.replaceAll("-", "/")}
              </h3>
              <StatusBadge status={insp.status} />
              <span className="text-sm text-mint">{insp.total_score} 分</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((item) => (
                <figure
                  key={item.item_id}
                  className="overflow-hidden rounded-lg border border-line bg-paper/90"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.photo_url}
                    alt={item.note}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <figcaption className="space-y-0.5 p-2 text-[11px]">
                    <p className="font-semibold text-ink">{item.category}</p>
                    <p className="line-clamp-2 text-muted">{item.note}</p>
                    {item.score_deduction !== 0 ? (
                      <p
                        className={`font-medium ${
                          item.score_deduction > 0 ? "text-mint" : "text-coral"
                        }`}
                      >
                        {item.score_deduction > 0 ? "+" : ""}
                        {item.score_deduction} 分
                      </p>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
