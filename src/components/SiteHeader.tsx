import Link from "next/link";

const links = [
  { href: "/", label: "校園大廳" },
  { href: "/board", label: "川堂看板" },
  { href: "/inspect", label: "組長評分" },
  { href: "/login", label: "登入" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="site-shell flex items-center justify-between gap-4 py-3">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-mint transition-colors group-hover:text-leaf">
            校園環境無名小站
          </span>
          <span className="hidden text-xs text-muted sm:inline">
            相簿 · 網誌 · 留言
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-1.5 text-muted transition hover:bg-leaf/15 hover:text-mint"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
