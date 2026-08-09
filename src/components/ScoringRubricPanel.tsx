import {
  SCORING_RUBRIC,
  SCORING_RUBRIC_META,
  formatRubricScore,
  type RubricSection,
} from "@/lib/constants/scoring-rubric";

function SectionBlock({ section }: { section: RubricSection }) {
  return (
    <details className="rounded-lg border border-line bg-paper/80 open:bg-paper">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {section.title}
          <span className="text-[11px] font-normal text-muted">展開</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-line px-3 py-2.5">
        {section.intro ? (
          <p className="text-xs text-muted">{section.intro}</p>
        ) : null}
        {section.items.map((item) => (
          <div key={item.id}>
            <p className="text-sm font-semibold text-ink">
              {item.title}{" "}
              <span className="text-xs font-normal text-muted">
                ({item.range})
              </span>
            </p>
            <ul className="mt-1 space-y-0.5">
              {item.levels.map((level) => (
                <li
                  key={`${item.id}-${level.label}`}
                  className="flex gap-2 text-xs leading-snug text-muted sm:text-[13px]"
                >
                  <span
                    className={`w-7 shrink-0 font-semibold tabular-nums ${
                      level.score > 0
                        ? "text-mint"
                        : level.score < 0
                          ? "text-coral"
                          : "text-muted"
                    }`}
                  >
                    {formatRubricScore(level.score)}
                  </span>
                  <span>{level.label}</span>
                </li>
              ))}
            </ul>
            {item.note ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted/90">
                ※ {item.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

/** 衛生組評分標準（可摺疊，手機友善） */
export function ScoringRubricPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-sm font-semibold text-ink">
          {SCORING_RUBRIC_META.title}
        </p>
        <p className="text-xs text-muted">{SCORING_RUBRIC_META.revision}</p>
        <p className="mt-1 rounded-md bg-coral/10 px-2.5 py-1.5 text-xs text-coral">
          {SCORING_RUBRIC_META.globalNote}
        </p>
      </div>
      {SCORING_RUBRIC.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
      {!compact ? (
        <p className="text-[11px] text-muted">
          以上為衛生組修訂標準，巡察評分與班級清掃請依此對照。
        </p>
      ) : null}
    </div>
  );
}
