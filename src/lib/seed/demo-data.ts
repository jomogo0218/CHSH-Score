import type {
  ClassDoc,
  CommentDoc,
  InspectionDoc,
  InspectionItemDoc,
} from "@/lib/types";
import { CLASS_ROSTER } from "@/lib/constants";

const placeholder = (seed: string, w = 800, h = 500) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const teachers = ["王老師", "李老師", "陳老師", "林老師", "黃老師"];

/** 完整班級骨架（頭像／橫幅用 placeholder） */
export const allClasses: ClassDoc[] = CLASS_ROSTER.map((c, index) => ({
  class_id: c.class_id,
  grade: c.grade,
  class_name: c.class_name,
  homeroom_teacher: teachers[index % teachers.length],
  avatar_url: placeholder(`av${c.class_id}`, 200, 200),
  banner_url: placeholder(`bn${c.class_id}`, 1200, 360),
}));

/** UI 預覽用假資料（較豐富內容） */
export const DEMO_CLASSES: ClassDoc[] = [
  {
    class_id: "j101",
    grade: 1,
    class_name: "國一1班",
    homeroom_teacher: "王老師",
    avatar_url: placeholder("avatarj101", 200, 200),
    banner_url: placeholder("bannerj101", 1200, 360),
    motto: "整潔是我們的日常儀式。",
  },
  {
    class_id: "j102",
    grade: 1,
    class_name: "國一2班",
    homeroom_teacher: "李老師",
    avatar_url: placeholder("avatarj102", 200, 200),
    banner_url: placeholder("bannerj102", 1200, 360),
    motto: "掃完再玩，玩得更開心。",
  },
  {
    class_id: "j201",
    grade: 2,
    class_name: "國二1班",
    homeroom_teacher: "陳老師",
    avatar_url: placeholder("avatarj201", 200, 200),
    banner_url: placeholder("bannerj201", 1200, 360),
    motto: "角落也要被看見。",
  },
  {
    class_id: "s4zhong",
    grade: 4,
    class_name: "高一忠",
    homeroom_teacher: "林老師",
    avatar_url: placeholder("avatars4zhong", 200, 200),
    banner_url: placeholder("banners4zhong", 1200, 360),
    motto: "環境好，心情也好。",
  },
  {
    class_id: "s6xin",
    grade: 6,
    class_name: "高三信",
    homeroom_teacher: "黃老師",
    avatar_url: placeholder("avatars6xin", 200, 200),
    banner_url: placeholder("banners6xin", 1200, 360),
    motto: "畢業前，留下乾淨的足跡。",
  },
];

export const DEMO_INSPECTIONS: InspectionDoc[] = [
  {
    inspection_id: "2026-08-02_j101",
    date: "2026-08-02",
    class_id: "j101",
    inspector_id: "admin",
    total_score: 95,
    summary_blog: "教室與外掃出色，廁所略有水漬，整體優良。",
    status: "pass",
    cover_photo_url: placeholder("inspj101", 640, 420),
    created_at: "2026-08-02T08:20:00Z",
  },
  {
    inspection_id: "2026-08-02_j102",
    date: "2026-08-02",
    class_id: "j102",
    inspector_id: "admin",
    total_score: 82,
    summary_blog: "外掃區有飲料罐，教室掃具未歸位，請中午前改善。",
    status: "pending_fix",
    cover_photo_url: placeholder("inspj102", 640, 420),
    created_at: "2026-08-02T08:35:00Z",
  },
  {
    inspection_id: "2026-08-02_j201",
    date: "2026-08-02",
    class_id: "j201",
    inspector_id: "admin",
    total_score: 90,
    summary_blog: "教室明亮整潔，廁所已清過，繼續保持。",
    status: "pass",
    cover_photo_url: placeholder("inspj201", 640, 420),
    created_at: "2026-08-02T08:48:00Z",
  },
  {
    inspection_id: "2026-08-02_s4zhong",
    date: "2026-08-02",
    class_id: "s4zhong",
    inspector_id: "admin",
    total_score: 78,
    summary_blog: "廁所積水與落葉，教室地板有紙屑，列為待改善。",
    status: "pending_fix",
    cover_photo_url: placeholder("insps4zhong", 640, 420),
    created_at: "2026-08-02T09:05:00Z",
  },
  {
    inspection_id: "2026-08-01_s6xin",
    date: "2026-08-01",
    class_id: "s6xin",
    inspector_id: "admin",
    total_score: 88,
    summary_blog: "昨日缺失已改善並附照片，今日複查通過銷案。",
    status: "fixed",
    cover_photo_url: placeholder("insps6xin", 640, 420),
    created_at: "2026-08-01T08:40:00Z",
  },
];

export const DEMO_ITEMS: InspectionItemDoc[] = [
  {
    item_id: "item_j102_01",
    inspection_id: "2026-08-02_j102",
    category: "教室",
    score_deduction: -5,
    note: "掃具未歸位",
    photo_url: placeholder("itemj102a", 640, 420),
    photo_timestamp: "08:36:10",
  },
  {
    item_id: "item_j102_02",
    inspection_id: "2026-08-02_j102",
    category: "外掃",
    score_deduction: -5,
    note: "飲料罐未清",
    photo_url: placeholder("itemj102b", 640, 420),
    photo_timestamp: "08:37:02",
  },
  {
    item_id: "item_s4zhong_01",
    inspection_id: "2026-08-02_s4zhong",
    category: "廁所",
    score_deduction: -8,
    note: "排水孔落葉積水",
    photo_url: placeholder("items4zhonga", 640, 420),
    photo_timestamp: "09:06:20",
  },
  {
    item_id: "item_j101_01",
    inspection_id: "2026-08-02_j101",
    category: "外掃",
    score_deduction: 0,
    note: "外掃區整潔",
    photo_url: placeholder("itemj101a", 640, 420),
    photo_timestamp: "08:21:00",
  },
];

export const DEMO_COMMENTS: CommentDoc[] = [
  {
    comment_id: "comm_s6xin_01",
    inspection_id: "2026-08-01_s6xin",
    author_role: "class_health_officer",
    author_name: "張小明（衛生股長）",
    content: "報告組長，廁所落葉已清理乾淨！",
    reply_photo_url: placeholder("fixs6xin", 640, 420),
    created_at: "2026-08-01T12:10:00Z",
  },
  {
    comment_id: "comm_j102_01",
    inspection_id: "2026-08-02_j102",
    author_role: "teacher",
    author_name: "李老師",
    content: "已請衛生股長中午複查。",
    created_at: "2026-08-02T09:20:00Z",
  },
];

export function getDemoClass(classId: string) {
  return (
    DEMO_CLASSES.find((c) => c.class_id === classId) ??
    allClasses.find((c) => c.class_id === classId)
  );
}

export function getClassById(classId: string) {
  return getDemoClass(classId);
}

export function getInspectionsForClass(classId: string) {
  return DEMO_INSPECTIONS.filter((i) => i.class_id === classId).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export function getItemsForInspection(inspectionId: string) {
  return DEMO_ITEMS.filter((i) => i.inspection_id === inspectionId);
}

export function getCommentsForInspection(inspectionId: string) {
  return DEMO_COMMENTS.filter((c) => c.inspection_id === inspectionId);
}

export function getTodayTopClasses(limit = 3): InspectionDoc[] {
  return [...DEMO_INSPECTIONS]
    .filter((i) => i.date === "2026-08-02")
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, limit);
}

export function getLatestFeed(): InspectionDoc[] {
  return [...DEMO_INSPECTIONS].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}
