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
 * 全校名冊選班：國中／高中分年段，顯示導師姓名。
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {classes.map((c) => {
                const selected = c.class_id === selectedId;
                return (
                  <Link
                    key={c.class_id}
                    href={hrefOf(c.class_id)}
                    title={`${c.class_name}｜導師 ${c.homeroom_teacher || "—"}`}
                    aria-label={`${c.class_name}，導師 ${c.homeroom_teacher || "未設定"}`}
                    aria-current={selected ? "page" : undefined}
                    className={`btn-block btn-chip flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center ${
                      selected ? "btn-primary" : ""
                    }`}
                  >
                    <span
                      className={`font-[family-name:var(--font-noto)] text-sm font-bold leading-tight tracking-normal subpixel-antialiased [text-rendering:optimizeLegibility] ${
                        selected ? "text-white" : "text-ink"
                      }`}
                    >
                      {chipLabel(c.class_name, grade)}
                    </span>
                    <span
                      className={`font-[family-name:var(--font-noto)] text-[13px] font-semibold leading-snug tracking-normal subpixel-antialiased [text-rendering:optimizeLegibility] ${
                        selected ? "text-white" : "text-ink"
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
  );
}
