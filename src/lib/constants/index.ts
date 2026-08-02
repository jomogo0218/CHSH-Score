import type { InspectionStatus, UserRole } from "@/lib/types";

export const SITE_NAME = "嘉華體衛組環境評分";
export const SITE_SHORT_NAME = "環境評分";
export const SITE_TAGLINE = "巡察佐證 · 改善回報 · 評分輔助";

/** 高中 32 班名冊：高一 11、高二 11、高三 10 */
export const CLASS_ROSTER: ReadonlyArray<{
  class_id: string;
  grade: number;
  class_name: string;
}> = [
  ...Array.from({ length: 11 }, (_, i) => {
    const n = i + 1;
    return {
      class_id: `1${String(n).padStart(2, "0")}`,
      grade: 1,
      class_name: `一年${n}班`,
    };
  }),
  ...Array.from({ length: 11 }, (_, i) => {
    const n = i + 1;
    return {
      class_id: `2${String(n).padStart(2, "0")}`,
      grade: 2,
      class_name: `二年${n}班`,
    };
  }),
  ...Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    return {
      class_id: `3${String(n).padStart(2, "0")}`,
      grade: 3,
      class_name: `三年${n}班`,
    };
  }),
];

export const GRADE_LABELS: Record<number, string> = {
  1: "高一",
  2: "高二",
  3: "高三",
};

export const INSPECTION_CATEGORIES = [
  "黑板",
  "掃具",
  "走廊",
  "洗手台",
  "教室地板",
  "垃圾桶",
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
} as const;
