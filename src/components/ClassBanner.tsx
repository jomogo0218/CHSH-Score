import type { ClassDoc } from "@/lib/types";

export function ClassBanner({ classDoc }: { classDoc: ClassDoc }) {
  return (
    <section className="panel overflow-hidden">
      <div
        className="relative h-44 bg-cover bg-center sm:h-56"
        style={{ backgroundImage: `url(${classDoc.banner_url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-end gap-4 sm:left-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={classDoc.avatar_url}
            alt=""
            className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-lg sm:h-24 sm:w-24"
          />
          <div className="pb-1 text-white">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold drop-shadow">
              {classDoc.class_name}
            </h1>
            <p className="text-sm text-white/90">
              導師 {classDoc.homeroom_teacher}
              {classDoc.motto ? ` · ${classDoc.motto}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
