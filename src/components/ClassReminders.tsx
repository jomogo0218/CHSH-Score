import Link from "next/link";
import { ScoringRubricPanel } from "@/components/ScoringRubricPanel";

/** 各班常駐：評分標準（資源回收已獨立為全站頁） */
export function ClassReminders() {
  return (
    <div className="space-y-4">
      <ScoringRubricPanel />
      <p className="text-xs text-muted">
        資源回收分類請見{" "}
        <Link href="/recycle" className="font-semibold text-mint underline">
          回收專頁
        </Link>
        。
      </p>
    </div>
  );
}
