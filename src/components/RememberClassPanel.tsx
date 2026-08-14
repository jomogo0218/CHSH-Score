"use client";

import { useMemo, useState } from "react";
import { CLASS_ROSTER, GRADE_LABELS, GRADE_ORDER } from "@/lib/constants";
import { usePinnedClass } from "@/lib/class-pin/use-pinned-class";

function chipLabel(className: string, grade: number): string {
  if (grade <= 3) {
    const m = /(\d+)班$/.exec(className);
    return m ? `${m[1]}班` : className;
  }
  return className.replace(/^高[一二三]/, "");
}

/**
 * 尚未記住本班時的引導：點一下即釘選，之後午餐／領用會自動帶入。
 */
export function RememberClassPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { classId: pinned, pin } = usePinnedClass();
  const [gradeFilter, setGradeFilter] = useState<(typeof GRADE_ORDER)[number] | "all">(
    "all",
  );

  const grades = useMemo(() => {
    if (gradeFilter === "all") return GRADE_ORDER;
    return GRADE_ORDER.filter((g) => g === gradeFilter);
  }, [gradeFilter]);

  if (pinned) return null;

  return (
    <section className="panel animate-rise space-y-3 p-3 sm:p-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          先選本班，幫你記住
        </h2>
        <p className="mt-0.5 text-xs text-muted sm:text-sm">
          {compact
            ? "點一下班級即可記住，回報時自動帶入。"
            : "點一下你的班級即可記住。之後午餐回報、領用申請都會自動帶入，免再重選。"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setGradeFilter("all")}
          className={`btn-block px-2.5 py-1.5 text-xs ${
            gradeFilter === "all" ? "btn-primary" : ""
          }`}
        >
          全部
        </button>
        {GRADE_ORDER.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGradeFilter(g)}
            className={`btn-block px-2.5 py-1.5 text-xs ${
              gradeFilter === g ? "btn-primary" : ""
            }`}
          >
            {GRADE_LABELS[g]}
          </button>
        ))}
      </div>

      <div className="grid max-h-[min(50vh,28rem)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {grades.map((grade) => {
          const list = CLASS_ROSTER.filter((c) => c.grade === grade);
          return (
            <div
              key={grade}
              className="rounded-lg border border-line/80 bg-paper/70 p-2.5"
            >
              <p className="mb-1.5 text-xs font-semibold text-muted">
                {GRADE_LABELS[grade]}
                <span className="ml-1 font-normal">（{list.length}）</span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {list.map((c) => (
                  <button
                    key={c.class_id}
                    type="button"
                    onClick={() => pin(c.class_id)}
                    title={`${c.class_name}｜導師 ${c.homeroom_teacher || "—"}`}
                    className="btn-block btn-chip flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center"
                  >
                    <span className="text-sm font-bold leading-tight text-ink">
                      {chipLabel(c.class_name, grade)}
                    </span>
                    <span className="text-[12px] font-semibold leading-snug text-ink">
                      {c.homeroom_teacher || "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
