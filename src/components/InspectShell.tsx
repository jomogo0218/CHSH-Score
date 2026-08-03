import Link from "next/link";
import { CLASS_ROSTER, GRADE_LABELS, GRADE_ORDER, INSPECTION_CATEGORIES } from "@/lib/constants";

export function InspectShell({ classId }: { classId?: string }) {
  const selected = CLASS_ROSTER.find((c) => c.class_id === classId);

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-mint">
          組長快速評分
        </h1>
        <p className="mt-2 text-muted">
          第 2 週接相機、前端壓縮（≤300KB）、寫入 Firestore 與 MQTT 發布。第 3
          週訂閱門口按鈕 `school/button/{"{classId}"}` 自動切班。
        </p>
        {selected ? (
          <p className="mt-4 rounded-lg bg-leaf/15 px-4 py-3 font-semibold text-ink">
            目前班級：{selected.class_name}（{selected.class_id}）
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">
            請選擇班級，或等待 ESP32 按鈕觸發跳轉。
          </p>
        )}
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="mb-3 font-semibold text-ink">選擇班級</h2>
        <div className="max-h-56 space-y-2.5 overflow-y-auto">
          {GRADE_ORDER.map((grade) => (
            <div key={grade}>
              <p className="mb-1 text-xs font-semibold text-muted">
                {GRADE_LABELS[grade]}
              </p>
              <div className="flex flex-wrap gap-2">
                {CLASS_ROSTER.filter((c) => c.grade === grade).map((c) => (
                  <Link
                    key={c.class_id}
                    href={`/inspect/${c.class_id}`}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      c.class_id === classId
                        ? "border-mint bg-mint text-white"
                        : "border-line bg-paper hover:bg-leaf/15"
                    }`}
                  >
                    {c.class_name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5 sm:p-6 opacity-90">
        <h2 className="mb-3 font-semibold text-ink">評分表單（佔位）</h2>
        <p className="mb-4 text-sm text-muted">
          預設各區滿分，點選缺失項目後自動扣分（第 2 週實作）。
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {INSPECTION_CATEGORIES.map((cat) => (
            <li
              key={cat}
              className="flex items-center justify-between rounded-lg border border-dashed border-line bg-paper/70 px-4 py-3"
            >
              <span>{cat}</span>
              <span className="text-sm text-muted">滿分</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl bg-mint/50 px-5 py-2.5 font-semibold text-white"
          >
            拍照上傳（第 2 週）
          </button>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl border border-line px-5 py-2.5 font-semibold text-muted"
          >
            發布並廣播（第 2／3 週）
          </button>
        </div>
      </section>
    </div>
  );
}
