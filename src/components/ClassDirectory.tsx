import Link from "next/link";
import type { ClassDoc } from "@/lib/types";
import { GRADE_LABELS, GRADE_ORDER } from "@/lib/constants";

function chipLabel(className: string, grade: number): string {
  if (grade <= 3) {
    const m = /(\d+)班$/.exec(className);
    return m ? `${m[1]}班` : className;
  }
  return className.replace(/^高[一二三]/, "");
}

export function ClassDirectory({ classes }: { classes: ClassDoc[] }) {
  return (
    <section className="panel animate-rise p-3 sm:p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
        班級名冊
      </h2>
      <p className="mt-0.5 text-xs text-muted">共 {classes.length} 班 · 點擊進入班級頁</p>
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
              <div className="grid grid-cols-6 gap-1.5">
                {list.map((c) => (
                  <Link
                    key={c.class_id}
                    href={`/classes/${c.class_id}`}
                    title={c.class_name}
                    aria-label={c.class_name}
                    className="flex min-h-9 items-center justify-center rounded-md border border-line bg-paper px-1 py-1.5 text-center text-xs font-medium transition hover:border-mint hover:bg-leaf/15 sm:min-h-10 sm:text-sm"
                  >
                    {chipLabel(c.class_name, grade)}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
