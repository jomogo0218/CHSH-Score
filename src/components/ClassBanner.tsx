import type { ClassDoc } from "@/lib/types";

export function ClassBanner({ classDoc }: { classDoc: ClassDoc }) {
  return (
    <section className="panel overflow-hidden">
      <div
        className="class-banner-art relative h-28 bg-cover bg-center sm:h-36"
        style={{ backgroundImage: `url(${classDoc.banner_url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-2.5 left-3 flex items-end gap-3">
          <div
            className="class-avatar-art h-12 w-12 shrink-0 rounded-xl border-2 border-white bg-cover bg-center shadow sm:h-14 sm:w-14"
            style={{ backgroundImage: `url(${classDoc.avatar_url})` }}
            aria-hidden
          />
          <div className="pb-0.5 text-white">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold drop-shadow sm:text-2xl">
              {classDoc.class_name}
            </h1>
            <p className="text-xs text-white/90">
              導師 {classDoc.homeroom_teacher}
              {classDoc.motto ? ` · ${classDoc.motto}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
