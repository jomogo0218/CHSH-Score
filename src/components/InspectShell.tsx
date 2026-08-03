import Link from "next/link";
import { CLASS_ROSTER, INSPECTION_CATEGORIES } from "@/lib/constants";
import { ClassRosterPicker } from "@/components/ClassRosterPicker";

export function InspectShell({ classId }: { classId?: string }) {
  const selected = CLASS_ROSTER.find((c) => c.class_id === classId);

  return (
    <div className="space-y-4">
      <section className="panel p-3 sm:p-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
          組長快速評分
        </h1>
        <p className="mt-1 text-sm text-muted">
          請選班後進入正式評分表單。
        </p>
        {selected ? (
          <p className="mt-2 rounded-lg bg-leaf/15 px-3 py-2 text-sm font-semibold text-ink">
            目前班級：{selected.class_name}（{selected.class_id}）
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">請先選擇班級。</p>
        )}
      </section>

      <section className="panel p-3 sm:p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">選擇班級</h2>
        <ClassRosterPicker selectedId={classId} />
      </section>

      <section className="panel p-3 sm:p-4 opacity-90">
        <h2 className="mb-2 text-sm font-semibold text-ink">評分項目</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {INSPECTION_CATEGORIES.map((cat) => (
            <li
              key={cat}
              className="flex items-center justify-between rounded-lg border border-dashed border-line bg-paper/70 px-3 py-2 text-sm"
            >
              <span>{cat}</span>
              <span className="text-xs text-muted">滿分</span>
            </li>
          ))}
        </ul>
        {selected ? (
          <Link
            href={`/inspect/${selected.class_id}`}
            className="mt-3 inline-block rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-white"
          >
            開始評分
          </Link>
        ) : null}
      </section>
    </div>
  );
}
