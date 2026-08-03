import Link from "next/link";

export function ClassNotFound({ classId }: { classId: string }) {
  return (
    <div className="panel mx-auto max-w-lg space-y-3 p-4 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint">
        找不到此班級
      </h1>
      <p className="text-sm text-muted">
        網址班級代碼 <span className="font-mono text-ink">{classId}</span>{" "}
        不在目前名冊（國一～三、高一～三忠孝仁愛信）。
      </p>
      <p className="text-xs text-muted">
        若你使用舊版連結（例如 /classes/101），請改從大廳重新選班。
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <Link
          href="/"
          className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-white"
        >
          回大廳選班
        </Link>
        <Link
          href="/inspect"
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink"
        >
          巡察上傳
        </Link>
      </div>
    </div>
  );
}
