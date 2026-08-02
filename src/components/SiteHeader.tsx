import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

const links = [
  { href: "/", label: "大廳" },
  { href: "/board", label: "看板" },
  { href: "/qr", label: "QR" },
  { href: "/inspect", label: "巡察" },
  { href: "/login", label: "登入" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-md">
      <div className="site-shell flex items-center justify-between gap-2 py-2">
        <Link href="/" className="min-w-0 shrink">
          <span className="block truncate font-[family-name:var(--font-display)] text-base font-bold leading-tight tracking-wide text-mint sm:text-lg">
            {SITE_NAME}
          </span>
          <span className="hidden text-[11px] text-muted sm:block">
            {SITE_TAGLINE}
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5 text-xs sm:gap-1 sm:text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-1.5 text-muted transition hover:bg-leaf/15 hover:text-mint"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
