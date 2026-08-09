"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAdmin, subscribeAuth } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { fetchUserProfile } from "@/lib/firebase/firestore";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

type NavLink = { href: string; label: string };

/** 導師／訪客：只留日常需要的 */
const TEACHER_LINKS: NavLink[] = [
  { href: "/", label: "大廳" },
  { href: "/recycle", label: "回收" },
];

/** 組長登入後：完整工具 */
const STAFF_LINKS: NavLink[] = [
  { href: "/", label: "大廳" },
  { href: "/board", label: "看板" },
  { href: "/recycle", label: "回收" },
  { href: "/usage", label: "用量" },
  { href: "/inspect", label: "巡察" },
];

function classIdFromPath(pathname: string): string | null {
  const m = /^\/classes\/([^/]+)/.exec(pathname);
  return m ? decodeURIComponent(m[1]) : null;
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured());

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAuthReady(true);
      return;
    }
    return subscribeAuth((user) => {
      if (!user) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }
      void fetchUserProfile(user.uid)
        .then((profile) => {
          setIsAdmin(profile?.role === "admin");
        })
        .catch(() => {
          setIsAdmin(false);
        })
        .finally(() => {
          setAuthReady(true);
        });
    });
  }, []);

  const classId = classIdFromPath(pathname);
  const links: NavLink[] = isAdmin
    ? STAFF_LINKS
    : [
        ...TEACHER_LINKS,
        ...(classId
          ? [{ href: `/classes/${classId}`, label: "本班" } satisfies NavLink]
          : []),
      ];

  async function onLogout() {
    try {
      await logoutAdmin();
    } catch {
      // ignore
    }
  }

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
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className={`rounded-md px-2 py-1.5 transition hover:bg-leaf/15 hover:text-mint ${
                  active ? "bg-leaf/20 font-semibold text-mint" : "text-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {authReady && isAdmin ? (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-md px-2 py-1.5 text-muted transition hover:bg-leaf/15 hover:text-mint"
            >
              登出
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md px-2 py-1.5 text-[11px] text-muted/70 transition hover:bg-leaf/15 hover:text-mint sm:text-xs"
            >
              組長
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
