import Link from "next/link";
import { CLASS_ROSTER, GRADE_LABELS, GRADE_ORDER } from "@/lib/constants";

function chipLabel(className: string, grade: number): string {
  if (grade <= 3) {
    const m = /(\d+)班$/.exec(className);
    return m ? `${m[1]}班` : className;
  }
  // 高一忠 → 忠
  return className.replace(/^高[一二三]/, "");
}

type Props = {
  selectedId?: string;
  /** 連結前綴，預設巡察頁 */
  hrefOf?: (classId: string) => string;
};

/**
 * 全校名冊選班：國中／高中分年段，手機與電腦皆完整顯示（不裁切）。
 */
export function ClassRosterPicker({
  selectedId,
  hrefOf = (id) => `/inspect/${id}`,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {GRADE_ORDER.map((grade) => {
        const classes = CLASS_ROSTER.filter((c) => c.grade === grade);
        return (
          <div
            key={grade}
            className="rounded-lg border border-line/80 bg-paper/70 p-2.5"
          >
            <p className="mb-1.5 text-xs font-semibold text-muted">
              {GRADE_LABELS[grade]}
              <span className="ml-1 font-normal text-muted/80">
                （{classes.length}）
              </span>
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {classes.map((c) => {
                const selected = c.class_id === selectedId;
                return (
                  <Link
                    key={c.class_id}
                    href={hrefOf(c.class_id)}
                    title={c.class_name}
                    aria-label={c.class_name}
                    aria-current={selected ? "page" : undefined}
                    className={`flex min-h-9 items-center justify-center rounded-md border px-1 py-1.5 text-center text-xs font-medium transition sm:min-h-10 sm:text-sm ${
                      selected
                        ? "border-mint bg-mint text-white"
                        : "border-line bg-white text-ink hover:border-mint hover:bg-leaf/15"
                    }`}
                  >
                    {chipLabel(c.class_name, grade)}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
