import { ClassDirectory } from "@/components/ClassDirectory";
import { HallFeed, TopBoard } from "@/components/HallFeed";
import {
  allClasses,
  getLatestFeed,
  getTodayTopClasses,
} from "@/lib/seed/demo-data";

export default function HomePage() {
  const top = getTodayTopClasses(3);
  const feed = getLatestFeed();

  return (
    <div className="space-y-6">
      <section className="animate-rise space-y-2">
        <p className="text-sm tracking-widest text-muted">CAMPUS WRETCH HALL</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-ink sm:text-5xl">
          校園環境無名小站
        </h1>
        <p className="max-w-2xl text-muted">
          相簿、網誌與留言互動，取代硬邦邦的扣分單。今日巡檢動態即時上牆。
        </p>
      </section>

      <TopBoard inspections={top} />
      <HallFeed items={feed} />
      <ClassDirectory classes={allClasses} />
    </div>
  );
}
