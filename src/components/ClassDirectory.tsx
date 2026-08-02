import Link from "next/link";
import type { ClassDoc } from "@/lib/types";
import { GRADE_LABELS } from "@/lib/constants";

export function ClassDirectory({ classes }: { classes: ClassDoc[] }) {
  const grades = [1, 2, 3] as const;

  return (
    <section className="panel animate-rise p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
        班級名冊導覽
      </h2>
      <p className="mt-1 text-sm text-muted">全校 32 班，點擊進入專屬小站</p>
      <div className="mt-5 space-y-5">
        {grades.map((grade) => (
          <div key={grade}>
            <h3 className="mb-2 text-sm font-semibold tracking-wider text-muted">
              {GRADE_LABELS[grade]}
            </h3>
            <div className="flex flex-wrap gap-2">
              {classes
                .filter((c) => c.grade === grade)
                .map((c) => (
                  <Link
                    key={c.class_id}
                    href={`/classes/${c.class_id}`}
                    className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm transition hover:border-mint hover:bg-leaf/15"
                  >
                    {c.class_name}
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
