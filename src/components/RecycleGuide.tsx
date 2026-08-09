const RECYCLE_REMINDERS = [
  {
    title: "紙類",
    tip: "書本、紙張可回收；量大請拿至回收屋藍色大籃。紙箱先拆解，整齊放籃旁。",
  },
  {
    title: "利樂包／紙容器／寶特瓶",
    tip: "請沖洗、壓扁（紙容器可堆疊）。瓶蓋多半是硬塑膠；封膜、吸管、吸管套丟一般垃圾。",
  },
  {
    title: "軟／硬塑膠",
    tip: "可回收塑膠請沖洗並儘量縮小體積。塑膠袋、封膜、吸管多半丟一般垃圾。",
  },
  {
    title: "一般垃圾注意",
    tip: "牛皮紙、衛生紙、油膩紙、木製品、碎玻璃丟一般垃圾；長寬高皆勿超過 30 公分。",
  },
] as const;

/** 資源回收分類說明（全站功能頁） */
export function RecycleGuide() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="animate-rise space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
          資源回收分類提醒
        </h1>
        <p className="text-sm text-muted">
          體衛組分類重點。詳細圖示請開啟完整寶典。
        </p>
      </header>

      <section className="panel space-y-3 p-3 sm:p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/docs/sorting-training.png"
          alt="由衛生組精心規劃的分類特訓班，保證您不出3日必成為轟動嘉華的分類高手"
          className="w-full max-w-lg rounded-lg border border-line bg-paper"
        />
        <ul className="grid gap-2 sm:grid-cols-2">
          {RECYCLE_REMINDERS.map((item) => (
            <li
              key={item.title}
              className="rounded-lg border border-line bg-paper/80 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted sm:text-sm">
                {item.tip}
              </p>
            </li>
          ))}
        </ul>
        <a
          href="/docs/recycle-guide.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg bg-mint px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-leaf"
        >
          開啟資源回收分類寶典（PDF）
        </a>
      </section>
    </div>
  );
}
