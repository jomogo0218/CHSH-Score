"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  THEMES,
  applyTheme,
  isThemeId,
  type ThemeId,
} from "@/lib/theme/themes";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const id = isThemeId(stored) ? stored : DEFAULT_THEME_ID;
    setTheme(id);
    applyTheme(id);
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
        className="btn-block btn-nav"
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
          className="absolute right-0 z-50 mt-2 grid max-h-[70vh] w-[min(18rem,calc(100vw-2rem))] grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-line bg-paper p-2 shadow-md"
        >
          {THEMES.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === theme}
                onClick={() => select(item.id)}
                className={`btn-block btn-nav w-full min-h-9 justify-start px-2 py-1.5 text-sm ${
                  item.id === theme ? "btn-primary" : ""
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
