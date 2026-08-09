"use client";

import { useEffect, useRef, useState } from "react";
import {
  THEME_STORAGE_KEY,
  THEMES,
  applyTheme,
  isThemeId,
  type ThemeId,
} from "@/lib/theme/themes";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("campus");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(id: ThemeId) {
    setTheme(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    applyTheme(id);
    setOpen(false);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`風格：${current.label}`}
        title={`風格：${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-muted transition hover:bg-leaf/15 hover:text-mint"
      >
        <span
          className="h-3.5 w-3.5 rounded-full border border-line"
          style={{ background: current.swatch }}
        />
        <span className="hidden sm:inline">風格</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 min-w-36 rounded-lg border border-line bg-paper p-1 shadow-md"
        >
          {THEMES.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === theme}
                onClick={() => select(item.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  item.id === theme
                    ? "bg-leaf/20 font-semibold text-mint"
                    : "text-ink hover:bg-leaf/10"
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-line"
                  style={{ background: item.swatch }}
                />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
