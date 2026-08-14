/** 各功能頁頂部主視覺（對齊環境頁 atelier-hero） */
export function PageHero({
  src,
  label,
}: {
  src: string;
  label?: string;
}) {
  return (
    <div
      className="page-hero h-28 overflow-hidden rounded-[0.75rem] bg-cover bg-center shadow-sm sm:h-36"
      style={{ backgroundImage: `url(${src})` }}
      role="img"
      aria-label={label}
    />
  );
}
