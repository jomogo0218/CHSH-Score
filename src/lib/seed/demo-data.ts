import type {
  ClassDoc,
  CommentDoc,
  InspectionDoc,
  InspectionItemDoc,
  InspectionStatus,
} from "@/lib/types";
import { CLASS_ROSTER } from "@/lib/constants";
import { taiwanDateString } from "@/lib/time/taiwan";

/** 圖文相符的示範圖（SVG 標籤，不依賴外網隨機圖） */
function themedPhoto(
  title: string,
  subtitle: string,
  bg: string,
  w = 800,
  h = 500,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#1a2e28"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="16" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)"/>
  <text x="50%" y="46%" text-anchor="middle" fill="#f7fbf8" font-family="Noto Sans TC, sans-serif" font-size="42" font-weight="700">${title}</text>
  <text x="50%" y="58%" text-anchor="middle" fill="#c5e0d4" font-family="Noto Sans TC, sans-serif" font-size="22">${subtitle}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const PHOTO = {
  classroomClean: themedPhoto("教室", "整潔明亮 · 掃具歸位", "#2a6b58"),
  classroomMess: themedPhoto("教室", "掃具未歸位 · 待改善", "#c45a42"),
  outdoorClean: themedPhoto("外掃", "走廊／外掃區整潔", "#3d8f72"),
  outdoorLitter: themedPhoto("外掃", "飲料罐未清 · 待改善", "#d9922f"),
  restroomClean: themedPhoto("廁所", "已清掃乾淨", "#2a6b58"),
  restroomMess: themedPhoto("廁所", "積水落葉 · 待改善", "#c45a42"),
  coverPass: themedPhoto("巡察佐證", "整體合格", "#2a6b58", 640, 420),
  coverPending: themedPhoto("巡察佐證", "待班級改善", "#c45a42", 640, 420),
  coverFixed: themedPhoto("改善回報", "已銷案複查通過", "#3d8f72", 640, 420),
} as const;

type ScenePhoto = keyof typeof PHOTO;

function avatarPhoto(name: string) {
  return themedPhoto(name.slice(0, 2), name, "#1f4d40", 200, 200);
}
function bannerPhoto(name: string) {
  return themedPhoto(name, "嘉華體衛組 · 環境評分", "#2a6b58", 1200, 360);
}

const teachers = ["王老師", "李老師", "陳老師", "林老師", "黃老師", "張老師"];

/** 完整班級骨架 */
export const allClasses: ClassDoc[] = CLASS_ROSTER.map((c, index) => ({
  class_id: c.class_id,
  grade: c.grade,
  class_name: c.class_name,
  homeroom_teacher: teachers[index % teachers.length],
  avatar_url: avatarPhoto(c.class_name),
  banner_url: bannerPhoto(c.class_name),
}));

/** 較豐富的示範班級（有班訓） */
export const DEMO_CLASSES: ClassDoc[] = [
  "j101",
  "j102",
  "j203",
  "j305",
  "s4zhong",
  "s4ren",
  "s5xiao",
  "s6xin",
].map((id, i) => {
  const base = allClasses.find((c) => c.class_id === id)!;
  const mottos = [
    "整潔是我們的日常儀式。",
    "掃完再玩，玩得更開心。",
    "角落也要被看見。",
    "一小步清掃，一大步改變。",
    "環境好，心情也好。",
    "仁心從身邊環境開始。",
    "孝親也要愛護公物。",
    "畢業前，留下乾淨的足跡。",
  ];
  return { ...base, motto: mottos[i] };
});

type SeedSpec = {
  class_id: string;
  daysAgo: number;
  hour: number;
  minute: number;
  score: number;
  status: InspectionStatus;
  summary: string;
  items: Array<{
    category: string;
    deduction: number;
    note: string;
    photo: ScenePhoto;
  }>;
  comment?: { name: string; role: "teacher" | "class_health_officer"; content: string };
};

function dateDaysAgo(daysAgo: number): string {
  return taiwanDateString(new Date(Date.now() - daysAgo * 86_400_000));
}

function isoAt(daysAgo: number, hour: number, minute: number): string {
  const date = dateDaysAgo(daysAgo);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${date}T${hh}:${mm}:00+08:00`;
}

/** 模擬約兩週巡察節奏：多班、多狀態、多日期 */
const SEED_SPECS: SeedSpec[] = [
  // —— 今天 ——
  {
    class_id: "j101",
    daysAgo: 0,
    hour: 8,
    minute: 15,
    score: 96,
    status: "pass",
    summary: "教室與外掃出色，廁所維持乾淨，整體優良。",
    items: [
      { category: "教室", deduction: 0, note: "掃具歸位、黑板乾淨", photo: "classroomClean" },
      { category: "外掃", deduction: 0, note: "外掃區無垃圾", photo: "outdoorClean" },
      { category: "廁所", deduction: -4, note: "洗手台略有水漬（已提醒）", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j203",
    daysAgo: 0,
    hour: 8,
    minute: 40,
    score: 82,
    status: "pending_fix",
    summary: "外掃有飲料罐，教室掃具未歸位，請中午前改善。",
    items: [
      { category: "教室", deduction: -5, note: "掃具未歸位", photo: "classroomMess" },
      { category: "外掃", deduction: -5, note: "飲料罐未清", photo: "outdoorLitter" },
      { category: "廁所", deduction: -8, note: "尚可", photo: "restroomClean" },
    ],
  },
  {
    class_id: "s4zhong",
    daysAgo: 0,
    hour: 9,
    minute: 5,
    score: 88,
    status: "pass",
    summary: "高一忠整體整潔，廁所複查通過。",
    items: [
      { category: "教室", deduction: 0, note: "座位區乾淨", photo: "classroomClean" },
      { category: "外掃", deduction: -5, note: "花台旁落葉已掃", photo: "outdoorClean" },
      { category: "廁所", deduction: -7, note: "乾淨", photo: "restroomClean" },
    ],
  },
  {
    class_id: "s5xiao",
    daysAgo: 0,
    hour: 9,
    minute: 30,
    score: 74,
    status: "pending_fix",
    summary: "廁所排水孔落葉積水，教室紙屑偏多。",
    items: [
      { category: "教室", deduction: -8, note: "走道有紙屑", photo: "classroomMess" },
      { category: "外掃", deduction: -5, note: "尚可", photo: "outdoorClean" },
      { category: "廁所", deduction: -13, note: "排水孔落葉積水", photo: "restroomMess" },
    ],
  },
  {
    class_id: "j305",
    daysAgo: 0,
    hour: 10,
    minute: 0,
    score: 91,
    status: "pass",
    summary: "國三5班維持良好，繼續保持。",
    items: [
      { category: "教室", deduction: 0, note: "整潔", photo: "classroomClean" },
      { category: "外掃", deduction: -4, note: "整潔", photo: "outdoorClean" },
      { category: "廁所", deduction: -5, note: "整潔", photo: "restroomClean" },
    ],
  },
  // —— 昨天 ——
  {
    class_id: "j102",
    daysAgo: 1,
    hour: 8,
    minute: 20,
    score: 79,
    status: "fixed",
    summary: "昨日外掃與教室缺失，下午已改善並回報銷案。",
    items: [
      { category: "教室", deduction: -5, note: "掃具未歸位（已改善）", photo: "classroomMess" },
      { category: "外掃", deduction: -8, note: "飲料罐（已清）", photo: "outdoorLitter" },
      { category: "廁所", deduction: -8, note: "合格", photo: "restroomClean" },
    ],
    comment: {
      name: "李老師",
      role: "teacher",
      content: "中午已請衛生股長清完，附改善照。",
    },
  },
  {
    class_id: "s4ren",
    daysAgo: 1,
    hour: 8,
    minute: 55,
    score: 93,
    status: "pass",
    summary: "高一仁教室明亮，外掃乾淨。",
    items: [
      { category: "教室", deduction: 0, note: "優良", photo: "classroomClean" },
      { category: "外掃", deduction: 0, note: "優良", photo: "outdoorClean" },
      { category: "廁所", deduction: -7, note: "良好", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j204",
    daysAgo: 1,
    hour: 9,
    minute: 15,
    score: 85,
    status: "pending_fix",
    summary: "廁所地面潮滑，請加強拖地與通風。",
    items: [
      { category: "教室", deduction: 0, note: "整潔", photo: "classroomClean" },
      { category: "外掃", deduction: -5, note: "尚可", photo: "outdoorClean" },
      { category: "廁所", deduction: -10, note: "地面潮滑", photo: "restroomMess" },
    ],
  },
  {
    class_id: "s6xin",
    daysAgo: 1,
    hour: 10,
    minute: 10,
    score: 90,
    status: "pass",
    summary: "高三信畢業季仍維持整潔，予以肯定。",
    items: [
      { category: "教室", deduction: 0, note: "整潔", photo: "classroomClean" },
      { category: "外掃", deduction: -5, note: "整潔", photo: "outdoorClean" },
      { category: "廁所", deduction: -5, note: "整潔", photo: "restroomClean" },
    ],
  },
  // —— 近一週 ——
  {
    class_id: "j103",
    daysAgo: 2,
    hour: 8,
    minute: 25,
    score: 87,
    status: "pass",
    summary: "外掃區落葉已清，教室維持良好。",
    items: [
      { category: "教室", deduction: 0, note: "良好", photo: "classroomClean" },
      { category: "外掃", deduction: -5, note: "落葉已清", photo: "outdoorClean" },
      { category: "廁所", deduction: -8, note: "良好", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j201",
    daysAgo: 2,
    hour: 9,
    minute: 0,
    score: 72,
    status: "fixed",
    summary: "教室與廁所雙項缺失，隔日複查通過。",
    items: [
      { category: "教室", deduction: -10, note: "桌椅下紙屑", photo: "classroomMess" },
      { category: "外掃", deduction: -5, note: "尚可", photo: "outdoorClean" },
      { category: "廁所", deduction: -13, note: "異味／積水", photo: "restroomMess" },
    ],
    comment: {
      name: "衛生股長小華",
      role: "class_health_officer",
      content: "報告組長，教室紙屑與廁所已處理完畢！",
    },
  },
  {
    class_id: "s4ai",
    daysAgo: 3,
    hour: 8,
    minute: 35,
    score: 94,
    status: "pass",
    summary: "高一愛各區滿分邊緣，表現穩定。",
    items: [
      { category: "教室", deduction: 0, note: "優", photo: "classroomClean" },
      { category: "外掃", deduction: 0, note: "優", photo: "outdoorClean" },
      { category: "廁所", deduction: -6, note: "優", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j301",
    daysAgo: 3,
    hour: 9,
    minute: 20,
    score: 80,
    status: "pending_fix",
    summary: "外掃區紙屑與塑膠袋，請加強午休清掃。",
    items: [
      { category: "教室", deduction: -5, note: "尚可", photo: "classroomClean" },
      { category: "外掃", deduction: -10, note: "紙屑塑膠袋", photo: "outdoorLitter" },
      { category: "廁所", deduction: -5, note: "尚可", photo: "restroomClean" },
    ],
  },
  {
    class_id: "s5zhong",
    daysAgo: 4,
    hour: 8,
    minute: 10,
    score: 89,
    status: "pass",
    summary: "高二忠整體合格，廁所略潮。",
    items: [
      { category: "教室", deduction: 0, note: "整潔", photo: "classroomClean" },
      { category: "外掃", deduction: -4, note: "整潔", photo: "outdoorClean" },
      { category: "廁所", deduction: -7, note: "略潮", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j105",
    daysAgo: 4,
    hour: 9,
    minute: 45,
    score: 76,
    status: "fixed",
    summary: "廁所缺失已改善銷案。",
    items: [
      { category: "教室", deduction: -5, note: "尚可", photo: "classroomClean" },
      { category: "外掃", deduction: -5, note: "尚可", photo: "outdoorClean" },
      { category: "廁所", deduction: -14, note: "落葉積水（已清）", photo: "restroomMess" },
    ],
    comment: {
      name: "王老師",
      role: "teacher",
      content: "廁所已清乾，請複查。",
    },
  },
  {
    class_id: "s6ren",
    daysAgo: 5,
    hour: 8,
    minute: 50,
    score: 92,
    status: "pass",
    summary: "高三仁維持高標，外掃無死角。",
    items: [
      { category: "教室", deduction: 0, note: "優良", photo: "classroomClean" },
      { category: "外掃", deduction: 0, note: "優良", photo: "outdoorClean" },
      { category: "廁所", deduction: -8, note: "良好", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j202",
    daysAgo: 5,
    hour: 10,
    minute: 5,
    score: 83,
    status: "pass",
    summary: "佐證拍照完整，未扣分，僅提醒注意掃具。",
    items: [
      { category: "教室", deduction: 0, note: "掃具提醒", photo: "classroomClean" },
      { category: "外掃", deduction: 0, note: "整潔", photo: "outdoorClean" },
      { category: "廁所", deduction: 0, note: "整潔", photo: "restroomClean" },
    ],
  },
  {
    class_id: "s4xin",
    daysAgo: 6,
    hour: 8,
    minute: 30,
    score: 70,
    status: "fixed",
    summary: "三區皆有缺失，班級積極改善後銷案。",
    items: [
      { category: "教室", deduction: -10, note: "雜物堆放", photo: "classroomMess" },
      { category: "外掃", deduction: -10, note: "落葉垃圾", photo: "outdoorLitter" },
      { category: "廁所", deduction: -10, note: "異味", photo: "restroomMess" },
    ],
    comment: {
      name: "衛生股長阿哲",
      role: "class_health_officer",
      content: "三區都清完了，謝謝組長提醒。",
    },
  },
  {
    class_id: "j304",
    daysAgo: 7,
    hour: 9,
    minute: 0,
    score: 95,
    status: "pass",
    summary: "本週優良示範班，各區接近滿分。",
    items: [
      { category: "教室", deduction: 0, note: "優", photo: "classroomClean" },
      { category: "外掃", deduction: 0, note: "優", photo: "outdoorClean" },
      { category: "廁所", deduction: -5, note: "優", photo: "restroomClean" },
    ],
  },
  {
    class_id: "s5ai",
    daysAgo: 8,
    hour: 8,
    minute: 45,
    score: 86,
    status: "pass",
    summary: "高二愛穩定合格。",
    items: [
      { category: "教室", deduction: -4, note: "良好", photo: "classroomClean" },
      { category: "外掃", deduction: -5, note: "良好", photo: "outdoorClean" },
      { category: "廁所", deduction: -5, note: "良好", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j206",
    daysAgo: 9,
    hour: 9,
    minute: 25,
    score: 78,
    status: "pending_fix",
    summary: "外掃區持續有飲料杯，請班規宣導。",
    items: [
      { category: "教室", deduction: -5, note: "尚可", photo: "classroomClean" },
      { category: "外掃", deduction: -12, note: "飲料杯", photo: "outdoorLitter" },
      { category: "廁所", deduction: -5, note: "尚可", photo: "restroomClean" },
    ],
  },
  {
    class_id: "s6xiao",
    daysAgo: 10,
    hour: 8,
    minute: 15,
    score: 90,
    status: "pass",
    summary: "高三孝整潔穩定。",
    items: [
      { category: "教室", deduction: 0, note: "整潔", photo: "classroomClean" },
      { category: "外掃", deduction: -5, note: "整潔", photo: "outdoorClean" },
      { category: "廁所", deduction: -5, note: "整潔", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j104",
    daysAgo: 11,
    hour: 10,
    minute: 20,
    score: 84,
    status: "fixed",
    summary: "教室掃具問題已改善。",
    items: [
      { category: "教室", deduction: -8, note: "掃具（已改善）", photo: "classroomMess" },
      { category: "外掃", deduction: -4, note: "整潔", photo: "outdoorClean" },
      { category: "廁所", deduction: -4, note: "整潔", photo: "restroomClean" },
    ],
    comment: {
      name: "陳老師",
      role: "teacher",
      content: "掃具櫃已重整，請複查。",
    },
  },
  {
    class_id: "s5xin",
    daysAgo: 12,
    hour: 8,
    minute: 55,
    score: 88,
    status: "pass",
    summary: "高二信外掃優良。",
    items: [
      { category: "教室", deduction: -5, note: "良好", photo: "classroomClean" },
      { category: "外掃", deduction: 0, note: "優良", photo: "outdoorClean" },
      { category: "廁所", deduction: -7, note: "良好", photo: "restroomClean" },
    ],
  },
  {
    class_id: "j302",
    daysAgo: 13,
    hour: 9,
    minute: 10,
    score: 81,
    status: "pass",
    summary: "兩週前巡察紀錄：整體尚可。",
    items: [
      { category: "教室", deduction: -6, note: "尚可", photo: "classroomClean" },
      { category: "外掃", deduction: -6, note: "尚可", photo: "outdoorClean" },
      { category: "廁所", deduction: -7, note: "尚可", photo: "restroomClean" },
    ],
  },
];

function coverFor(status: InspectionStatus, firstPhotoKey: ScenePhoto): string {
  if (status === "fixed") return PHOTO.coverFixed;
  if (status === "pending_fix") return PHOTO.coverPending;
  return PHOTO[firstPhotoKey] ?? PHOTO.coverPass;
}

function buildSeed(): {
  inspections: InspectionDoc[];
  items: InspectionItemDoc[];
  comments: CommentDoc[];
} {
  const inspections: InspectionDoc[] = [];
  const items: InspectionItemDoc[] = [];
  const comments: CommentDoc[] = [];

  for (const spec of SEED_SPECS) {
    const date = dateDaysAgo(spec.daysAgo);
    const inspectionId = `${date}_${spec.class_id}`;
    const created = isoAt(spec.daysAgo, spec.hour, spec.minute);
    const firstPhoto = spec.items[0]?.photo ?? "coverPass";

    inspections.push({
      inspection_id: inspectionId,
      date,
      class_id: spec.class_id,
      inspector_id: "admin",
      total_score: spec.score,
      summary_blog: spec.summary,
      status: spec.status,
      cover_photo_url: coverFor(spec.status, firstPhoto),
      created_at: created,
    });

    spec.items.forEach((it, idx) => {
      items.push({
        item_id: `item_${inspectionId}_${idx}`,
        inspection_id: inspectionId,
        category: it.category,
        score_deduction: it.deduction,
        note: it.note,
        photo_url: PHOTO[it.photo],
        photo_timestamp: `${String(spec.hour).padStart(2, "0")}:${String(spec.minute + idx).padStart(2, "0")}:00`,
      });
    });

    if (spec.comment) {
      comments.push({
        comment_id: `comm_${inspectionId}`,
        inspection_id: inspectionId,
        class_id: spec.class_id,
        author_role: spec.comment.role,
        author_name: spec.comment.name,
        content: spec.comment.content,
        reply_photo_url:
          spec.status === "fixed" ? PHOTO.restroomClean : undefined,
        created_at: isoAt(spec.daysAgo, Math.min(spec.hour + 3, 16), 10),
        marks_fixed: spec.status === "fixed",
      });
    }
  }

  inspections.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { inspections, items, comments };
}

const SEED = buildSeed();

export const DEMO_INSPECTIONS: InspectionDoc[] = SEED.inspections;
export const DEMO_ITEMS: InspectionItemDoc[] = SEED.items;
export const DEMO_COMMENTS: CommentDoc[] = SEED.comments;

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
  const today = taiwanDateString();
  const todayList = DEMO_INSPECTIONS.filter((i) => i.date === today);
  const pool =
    todayList.length > 0
      ? todayList
      : DEMO_INSPECTIONS.filter((i) => i.date === DEMO_INSPECTIONS[0]?.date);
  return [...pool]
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, limit);
}

export function getLatestFeed(): InspectionDoc[] {
  return [...DEMO_INSPECTIONS].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}
