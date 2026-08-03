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

/** 完整 32 班骨架（頭像／橫幅用 placeholder） */
export const allClasses: ClassDoc[] = CLASS_ROSTER.map((c, index) => ({
  class_id: c.class_id,
  grade: c.grade,
  class_name: c.class_name,
  homeroom_teacher: teachers[index % teachers.length],
  avatar_url: placeholder(`av${c.class_id}`, 200, 200),
  banner_url: placeholder(`bn${c.class_id}`, 1200, 360),
}));

/** 本週 UI 預覽用假資料（較豐富內容） */
export const DEMO_CLASSES: ClassDoc[] = [
  {
    class_id: "101",
    grade: 1,
    class_name: "一年1班",
    homeroom_teacher: "王老師",
    avatar_url: placeholder("avatar101", 200, 200),
    banner_url: placeholder("banner101", 1200, 360),
    motto: "整潔是我們的日常儀式。",
  },
  {
    class_id: "102",
    grade: 1,
    class_name: "一年2班",
    homeroom_teacher: "李老師",
    avatar_url: placeholder("avatar102", 200, 200),
    banner_url: placeholder("banner102", 1200, 360),
    motto: "掃完再玩，玩得更開心。",
  },
  {
    class_id: "201",
    grade: 2,
    class_name: "二年1班",
    homeroom_teacher: "陳老師",
    avatar_url: placeholder("avatar201", 200, 200),
    banner_url: placeholder("banner201", 1200, 360),
    motto: "角落也要被看見。",
  },
  {
    class_id: "205",
    grade: 2,
    class_name: "二年5班",
    homeroom_teacher: "林老師",
    avatar_url: placeholder("avatar205", 200, 200),
    banner_url: placeholder("banner205", 1200, 360),
    motto: "環境好，心情也好。",
  },
  {
    class_id: "301",
    grade: 3,
    class_name: "三年1班",
    homeroom_teacher: "黃老師",
    avatar_url: placeholder("avatar301", 200, 200),
    banner_url: placeholder("banner301", 1200, 360),
    motto: "畢業前，留下乾淨的足跡。",
  },
];

export const DEMO_INSPECTIONS: InspectionDoc[] = [
  {
    inspection_id: "2026-08-02_101",
    date: "2026-08-02",
    class_id: "101",
    inspector_id: "admin",
    total_score: 95,
    summary_blog: "教室與外掃出色，廁所略有水漬，整體優良。",
    status: "pass",
    cover_photo_url: placeholder("insp101", 640, 420),
    created_at: "2026-08-02T08:20:00Z",
  },
  {
    inspection_id: "2026-08-02_102",
    date: "2026-08-02",
    class_id: "102",
    inspector_id: "admin",
    total_score: 82,
    summary_blog: "外掃區有飲料罐，教室掃具未歸位，請中午前改善。",
    status: "pending_fix",
    cover_photo_url: placeholder("insp102", 640, 420),
    created_at: "2026-08-02T08:35:00Z",
  },
  {
    inspection_id: "2026-08-02_201",
    date: "2026-08-02",
    class_id: "201",
    inspector_id: "admin",
    total_score: 90,
    summary_blog: "教室明亮整潔，廁所已清過，繼續保持。",
    status: "pass",
    cover_photo_url: placeholder("insp201", 640, 420),
    created_at: "2026-08-02T08:48:00Z",
  },
  {
    inspection_id: "2026-08-02_205",
    date: "2026-08-02",
    class_id: "205",
    inspector_id: "admin",
    total_score: 78,
    summary_blog: "廁所積水與落葉，教室地板有紙屑，列為待改善。",
    status: "pending_fix",
    cover_photo_url: placeholder("insp205", 640, 420),
    created_at: "2026-08-02T09:05:00Z",
  },
  {
    inspection_id: "2026-08-01_301",
    date: "2026-08-01",
    class_id: "301",
    inspector_id: "admin",
    total_score: 88,
    summary_blog: "昨日缺失已改善並附照片，今日複查通過銷案。",
    status: "fixed",
    cover_photo_url: placeholder("insp301", 640, 420),
    created_at: "2026-08-01T08:40:00Z",
  },
];

export const DEMO_ITEMS: InspectionItemDoc[] = [
  {
    item_id: "item_102_01",
    inspection_id: "2026-08-02_102",
    category: "教室",
    score_deduction: -5,
    note: "掃具未歸位",
    photo_url: placeholder("item102a", 640, 420),
    photo_timestamp: "08:36:10",
  },
  {
    item_id: "item_102_02",
    inspection_id: "2026-08-02_102",
    category: "外掃",
    score_deduction: -5,
    note: "飲料罐未清",
    photo_url: placeholder("item102b", 640, 420),
    photo_timestamp: "08:37:02",
  },
  {
    item_id: "item_205_01",
    inspection_id: "2026-08-02_205",
    category: "廁所",
    score_deduction: -8,
    note: "排水孔落葉積水",
    photo_url: placeholder("item205a", 640, 420),
    photo_timestamp: "09:06:20",
  },
  {
    item_id: "item_101_01",
    inspection_id: "2026-08-02_101",
    category: "外掃",
    score_deduction: 0,
    note: "外掃區整潔",
    photo_url: placeholder("item101a", 640, 420),
    photo_timestamp: "08:21:00",
  },
];

export const DEMO_COMMENTS: CommentDoc[] = [
  {
    comment_id: "comm_301_01",
    inspection_id: "2026-08-01_301",
    author_role: "class_health_officer",
    author_name: "張小明（衛生股長）",
    content: "報告組長，廁所落葉已清理乾淨！",
    reply_photo_url: placeholder("fix301", 640, 420),
    created_at: "2026-08-01T12:10:00Z",
  },
  {
    comment_id: "comm_102_01",
    inspection_id: "2026-08-02_102",
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
