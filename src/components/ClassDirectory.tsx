import Link from "next/link";
import type { ClassDoc } from "@/lib/types";
import { GRADE_LABELS, GRADE_ORDER } from "@/lib/constants";

export function ClassDirectory({ classes }: { classes: ClassDoc[] }) {
  return (
    <section className="panel animate-rise p-3 sm:p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
        班級名冊
      </h2>
      <div className="mt-3 space-y-3">
        {GRADE_ORDER.map((grade) => (
          <div key={grade}>
            <h3 className="mb-1.5 text-xs font-semibold text-muted">
              {GRADE_LABELS[grade]}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {classes
                .filter((c) => c.grade === grade)
                .map((c) => (
                  <Link
                    key={c.class_id}
                    href={`/classes/${c.class_id}`}
                    className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs transition hover:border-mint hover:bg-leaf/15 sm:text-sm"
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
