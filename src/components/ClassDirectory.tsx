import Link from "next/link";
import type { ClassDoc } from "@/lib/types";
import { GRADE_LABELS, GRADE_ORDER } from "@/lib/constants";
import { sameClass } from "@/lib/class-pin/storage";

function chipLabel(className: string, grade: number): string {
  if (grade <= 3) {
    const m = /(\d+)班$/.exec(className);
    return m ? `${m[1]}班` : className;
  }
  return className.replace(/^高[一二三]/, "");
}

export function ClassDirectory({
  classes,
  highlightClassId,
}: {
  classes: ClassDoc[];
  highlightClassId?: string | null;
}) {
  return (
    <section className="panel animate-rise p-3 sm:p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
        班級名冊
      </h2>
      <p className="mt-0.5 text-xs text-muted">
        共 {classes.length} 班 · 顯示導師姓名
        {highlightClassId
          ? " · 本班已標示"
          : " · 上方可先記住本班"}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {GRADE_ORDER.map((grade) => {
          const list = classes.filter((c) => c.grade === grade);
          return (
            <div
              key={grade}
              className="rounded-lg border border-line/80 bg-paper/70 p-2.5"
            >
              <h3 className="mb-1.5 text-xs font-semibold text-muted">
                {GRADE_LABELS[grade]}
                <span className="ml-1 font-normal">（{list.length}）</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {list.map((c) => {
                  const mine = sameClass(c.class_id, highlightClassId);
                  return (
                    <Link
                      key={c.class_id}
                      href={`/classes/${c.class_id}`}
                      title={`${c.class_name}｜導師 ${c.homeroom_teacher || "—"}`}
                      aria-label={`${c.class_name}，導師 ${c.homeroom_teacher || "未設定"}`}
                      className={`btn-block btn-chip flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center ${
                        mine ? "btn-primary mine-box" : ""
                      }`}
                    >
                      <span
                        className={`font-[family-name:var(--font-noto)] text-sm font-bold leading-tight tracking-normal subpixel-antialiased [text-rendering:optimizeLegibility] ${
                          mine ? "text-white" : "text-ink"
                        }`}
                      >
                        {chipLabel(c.class_name, grade)}
                      </span>
                      <span
                        className={`font-[family-name:var(--font-noto)] text-[13px] font-semibold leading-snug tracking-normal subpixel-antialiased [text-rendering:optimizeLegibility] ${
                          mine ? "text-white" : "text-ink"
                        }`}
                      >
                        {c.homeroom_teacher || "—"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
