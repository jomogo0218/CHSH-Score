import type { InspectionStatus, UserRole } from "@/lib/types";

export const SITE_NAME = "嘉華體衛組環境評分";
export const SITE_SHORT_NAME = "環境評分";
export const SITE_TAGLINE = "巡察佐證 · 改善回報 · 評分輔助";
export const TEACHER_ZONE_LABEL = "環境";
export const TEACHER_ZONE_TAGLINE =
  "看自己班有沒有缺失（紅框呼吸燈）。可記住本班，點進去即可拍照回報改善。";
export const SITE_ORIGIN = "https://chsh-score.vercel.app";

/** 站內午餐佈告 */
export const LUNCH_LABEL = "午餐";
export const LUNCH_INBOX_PATH = "/lunch/inbox";

/** 高中班級德目（忠孝仁愛信） */
const SENIOR_STREAMS = [
  { id: "zhong", name: "忠" },
  { id: "xiao", name: "孝" },
  { id: "ren", name: "仁" },
  { id: "ai", name: "愛" },
  { id: "xin", name: "信" },
] as const;

type RosterEntry = {
  class_id: string;
  grade: number;
  class_name: string;
  homeroom_teacher: string;
};

function juniorClasses(
  grade: number,
  label: string,
  teachers: readonly string[],
): RosterEntry[] {
  return teachers.map((teacher, i) => {
    const n = i + 1;
    return {
      class_id: `j${grade}${String(n).padStart(2, "0")}`,
      grade,
      class_name: `${label}${n}班`,
      homeroom_teacher: teacher,
    };
  });
}

function seniorClasses(
  grade: number,
  label: string,
  teachers: Readonly<Record<(typeof SENIOR_STREAMS)[number]["id"], string>>,
): RosterEntry[] {
  return SENIOR_STREAMS.map((s) => ({
    class_id: `s${grade}${s.id}`,
    grade,
    class_name: `${label}${s.name}`,
    homeroom_teacher: teachers[s.id],
  }));
}

/**
 * 嘉華班級名冊（含導師）
 * 國一 1～5、國二 1～6、國三 1～5；高一～高三：忠孝仁愛信
 * grade：1=國一 … 3=國三，4=高一 … 6=高三
 */
export const CLASS_ROSTER: ReadonlyArray<RosterEntry> = [
  ...juniorClasses(1, "國一", ["黃佩綾", "姚譯婷", "彭舒渝", "葉峰銘", "崔茗喬"]),
  ...juniorClasses(2, "國二", [
    "王富寬",
    "陳勝璿",
    "鄧靜蓓",
    "許儷瓊",
    "劉芳貞",
    "王珊美",
  ]),
  ...juniorClasses(3, "國三", ["何月娥", "劉娜均", "王倫筑", "余姿瑩", "李映柔"]),
  ...seniorClasses(4, "高一", {
    zhong: "蔡孟儒",
    xiao: "張淑枝",
    ren: "周佩蓉",
    ai: "張振宇",
    xin: "黃崧浩",
  }),
  ...seniorClasses(5, "高二", {
    zhong: "張君楷",
    xiao: "陳國棟",
    ren: "鄭世杰",
    ai: "蔡孟儒",
    xin: "黃宇正",
  }),
  ...seniorClasses(6, "高三", {
    zhong: "黃子信",
    xiao: "黃文良",
    ren: "袁鳳笙",
    ai: "鍾慧容",
    xin: "陳耀祖",
  }),
];

export const GRADE_ORDER = [1, 2, 3, 4, 5, 6] as const;

export const GRADE_LABELS: Record<number, string> = {
  1: "國一",
  2: "國二",
  3: "國三",
  4: "高一",
  5: "高二",
  6: "高三",
};

export const INSPECTION_CATEGORIES = [
  "教室",
  "外掃",
  "廁所",
] as const;

/** 巡察「環境說明」罐頭文字（可點選，仍可自行修改） */
export const SUMMARY_PRESETS = [
  "各區整潔，維持良好，予以肯定。",
  "整體尚可，請繼續保持清掃習慣。",
  "教室掃具未歸位，請中午前改善。",
  "教室地面／走道有紙屑，請加強清掃。",
  "外掃區有飲料罐／垃圾，請儘速清理。",
  "外掃區落葉偏多，請加強清掃。",
  "廁所有積水／落葉，請清乾並保持通風。",
  "廁所異味偏重，請加強清潔與通風。",
  "先放佐證照片，請班級改善後回報銷案。",
  "複查通過，維持整潔，繼續保持。",
] as const;

export const STATUS_LABELS: Record<InspectionStatus, string> = {
  pass: "合格",
  pending_fix: "待改善",
  fixed: "已銷案",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "衛生組長",
  inspector: "評分員",
  class_health_officer: "衛生股長",
  teacher: "導師",
};

export const MQTT_TOPICS = {
  liveFeed: "school/clean/live_feed",
  classChannel: (classId: string) => `school/clean/class/${classId}`,
  button: (classId: string) => `school/button/${classId}`,
  staffAlert: "school/clean/staff_alert",
} as const;
