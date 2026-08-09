export const THEME_IDS = [
  "campus",
  "ink",
  "sun",
  "night",
  "sky",
  "atelier",
  "plum",
  "sakura",
  "abyss",
  "gold",
  "cocoa",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_STORAGE_KEY = "chsh-theme";

export const THEMES: ReadonlyArray<{
  id: ThemeId;
  label: string;
  swatch: string;
  themeColor: string;
}> = [
  { id: "campus", label: "校園綠", swatch: "#2a6b58", themeColor: "#2a6b58" },
  { id: "ink", label: "墨筆", swatch: "#2c4a3e", themeColor: "#2c4a3e" },
  { id: "sun", label: "暖陽", swatch: "#c46a2d", themeColor: "#c46a2d" },
  { id: "night", label: "夜間", swatch: "#5ec2a0", themeColor: "#1c232c" },
  { id: "sky", label: "天藍", swatch: "#2b6ea8", themeColor: "#2b6ea8" },
  { id: "atelier", label: "畫報", swatch: "#3a7a62", themeColor: "#2f5d4c" },
  { id: "plum", label: "梅紫", swatch: "#7b3fa0", themeColor: "#7b3fa0" },
  { id: "sakura", label: "櫻粉", swatch: "#d46a8a", themeColor: "#d46a8a" },
  { id: "abyss", label: "深海", swatch: "#3ec8e0", themeColor: "#121c28" },
  { id: "gold", label: "金秋", swatch: "#c9a227", themeColor: "#c9a227" },
  { id: "cocoa", label: "可可", swatch: "#6b4226", themeColor: "#6b4226" },
];

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

export function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
  const spec = THEMES.find((t) => t.id === id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && spec) meta.setAttribute("content", spec.themeColor);
}

const THEME_COLORS: Record<ThemeId, string> = {
  campus: "#2a6b58",
  ink: "#2c4a3e",
  sun: "#c46a2d",
  night: "#1c232c",
  sky: "#2b6ea8",
  atelier: "#2f5d4c",
  plum: "#7b3fa0",
  sakura: "#d46a8a",
  abyss: "#121c28",
  gold: "#c9a227",
  cocoa: "#6b4226",
};

/** 進頁面前套用，避免閃一下預設綠 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var ok=${JSON.stringify(THEME_IDS)};if(!t||ok.indexOf(t)<0)return;document.documentElement.setAttribute("data-theme",t);var c=${JSON.stringify(THEME_COLORS)}[t];var m=document.querySelector('meta[name="theme-color"]');if(m&&c)m.setAttribute("content",c)}catch(e){}})();`;
