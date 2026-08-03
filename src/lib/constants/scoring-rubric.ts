/** 校園環境整潔競賽評分標準（衛生組修訂版）— 給班級與巡察參考 */

export type RubricLevel = {
  label: string;
  score: number;
};

export type RubricItem = {
  id: string;
  title: string;
  /** 單項分數區間說明，如「±1」「-3」 */
  range: string;
  note?: string;
  levels: RubricLevel[];
};

export type RubricSection = {
  id: string;
  title: string;
  intro?: string;
  items: RubricItem[];
};

export const SCORING_RUBRIC_META = {
  title: "校園環境整潔競賽評分標準",
  revision: "衛生組修訂版",
  globalNote: "各單項如重複沒改善，直接 −3 分。",
} as const;

export const SCORING_RUBRIC: ReadonlyArray<RubricSection> = [
  {
    id: "classroom",
    title: "一、教室區",
    items: [
      {
        id: "floor",
        title: "教室地板（含陽台走廊）",
        range: "±1",
        levels: [
          { label: "0～2 個垃圾", score: 1 },
          { label: "2～6 個垃圾", score: 0 },
          { label: "7 個以上垃圾", score: -1 },
        ],
      },
      {
        id: "hallway",
        title: "走廊地板",
        range: "±1",
        levels: [
          { label: "沒有垃圾（少許樹葉不扣分）", score: 1 },
          { label: "0～2 個垃圾", score: 0 },
          { label: "3 個以上垃圾", score: -1 },
        ],
      },
      {
        id: "blackboard",
        title: "黑板",
        range: "±1",
        note: "應到實到人數、繳交資料、中午抄寫作業等公告事項不列入計分。",
        levels: [
          { label: "板面有擦掉且板溝有擦乾淨", score: 2 },
          { label: "有做其中一項", score: 1 },
          { label: "二項都沒做", score: -1 },
        ],
      },
      {
        id: "windows",
        title: "門窗（盡量以走廊門窗為主）",
        range: "±2",
        note: "特殊結構（如鐵條／鐵柱）：明顯有清潔痕跡即不得扣分；乾淨無污垢可再視程度 +1～+2。",
        levels: [
          { label: "光亮潔淨", score: 2 },
          { label: "乾淨有擦過的痕跡", score: 1 },
          { label: "微髒無擦過的痕跡", score: 0 },
          { label: "特別髒有污垢", score: -1 },
          { label: "長期未擦有明顯污垢", score: -2 },
        ],
      },
      {
        id: "sink",
        title: "教室洗手台",
        range: "±1",
        note: "直接傾倒湯汁／廚餘／茶渣致堵塞或惡臭：−2。他班跨區傾倒經查證可改扣違規班 −2。",
        levels: [
          { label: "檯面與水槽乾淨無積水／殘渣", score: 1 },
          { label: "微髒或有些許水漬", score: 0 },
          { label: "有殘渣、污垢或堵塞", score: -1 },
          { label: "違規傾倒湯汁／廚餘／茶渣", score: -2 },
        ],
      },
      {
        id: "sorting",
        title: "教室內垃圾分類",
        range: "±2",
        note: "重點：一般垃圾、紙容器、塑膠容器。廚餘桶放學前未倒致發臭：−2。",
        levels: [
          { label: "三類完全落實、紙容器已堆疊且無混雜", score: 2 },
          { label: "標示明確但有極少數分類錯誤", score: 1 },
          { label: "分類混雜未確實，或紙餐盒未倒淨堆疊", score: -1 },
          { label: "長期未分類或隨意亂丟", score: -2 },
          { label: "廚餘桶放學前未倒致發臭", score: -2 },
        ],
      },
    ],
  },
  {
    id: "outdoor",
    title: "二、外掃區",
    items: [
      {
        id: "leaves",
        title: "雜草、落葉",
        range: "±2",
        note: "落葉多的掃區盡量以加分為主。",
        levels: [
          { label: "明顯掃痕乾淨，10 片落葉以內", score: 2 },
          { label: "明顯掃痕，10～20 片落葉", score: 1 },
          { label: "有掃痕，20～50 片落葉", score: 0 },
          { label: "完全無掃痕", score: -1 },
          { label: "已掃成堆未清理", score: -2 },
        ],
      },
      {
        id: "litter",
        title: "垃圾",
        range: "±2",
        note: "大件垃圾斟酌扣分。",
        levels: [
          { label: "完全無垃圾", score: 2 },
          { label: "0～2 個垃圾", score: 1 },
          { label: "3～5 個垃圾", score: 0 },
          { label: "6～10 個垃圾", score: -1 },
          { label: "長期沒掃", score: -2 },
        ],
      },
      {
        id: "bin",
        title: "垃圾桶",
        range: "−2",
        levels: [
          { label: "未滿", score: 0 },
          { label: "滿出", score: -1 },
          { label: "長期滿出", score: -2 },
        ],
      },
      {
        id: "tools",
        title: "掃具擺放",
        range: "−3",
        note: "掃區內散落掃具每件 −1（最多 −3）；掃具櫃未關直接 −2。",
        levels: [
          { label: "大致整齊（1 公尺內）", score: 0 },
          { label: "擴散到 1～2 公尺", score: -1 },
          { label: "已在 2 公尺外", score: -2 },
          { label: "掃具櫃未關", score: -2 },
          { label: "掃區散落掃具（多件）", score: -3 },
        ],
      },
    ],
  },
  {
    id: "restroom",
    title: "三、廁所區",
    intro: "除垃圾桶外，其他區域有垃圾斟酌再扣分。",
    items: [
      {
        id: "toilets",
        title: "小便池與大便池／馬桶",
        range: "±2",
        levels: [
          { label: "沒任何污漬與異味", score: 2 },
          { label: "少許污漬", score: 1 },
          { label: "有尿垢、糞垢或異味", score: 0 },
          { label: "污垢卡很厚", score: -1 },
          { label: "長期卡厚垢未清理", score: -2 },
        ],
      },
      {
        id: "restroom-sink",
        title: "洗手台",
        range: "±2",
        levels: [
          { label: "很乾淨", score: 2 },
          { label: "乾淨但有少許頭髮", score: 1 },
          { label: "灰塵或少許污垢", score: 0 },
          { label: "有大片污垢", score: -1 },
          { label: "長期沒掃", score: -2 },
        ],
      },
      {
        id: "restroom-floor",
        title: "地面",
        range: "±2",
        levels: [
          { label: "拖過且沒腳印", score: 2 },
          { label: "拖過有腳印，或沒拖過但不髒", score: 1 },
          { label: "沒拖過地板微髒", score: 0 },
          { label: "地板很髒", score: -1 },
          { label: "長期沒掃", score: -2 },
        ],
      },
      {
        id: "restroom-bin",
        title: "垃圾桶",
        range: "±3",
        levels: [
          { label: "洗過光亮潔淨", score: 3 },
          { label: "洗過乾淨（一成以內垃圾）", score: 2 },
          { label: "一至五成垃圾", score: 1 },
          { label: "五成至滿", score: 0 },
          { label: "滿出垃圾", score: -1 },
          { label: "滿出垃圾兩天", score: -2 },
          { label: "長期滿出", score: -3 },
        ],
      },
    ],
  },
] as const;

/** 基準分 100，再加各單項加減分（可超過 100） */
export const SCORE_BASE = 100;

/** 重複未改善之固定扣分 */
export const REPEAT_UNFIXED_PENALTY = -3;

export function formatRubricScore(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}

export function computeInspectionTotal(itemScores: number[]): number {
  const delta = itemScores.reduce((sum, s) => sum + s, 0);
  return Math.max(0, SCORE_BASE + delta);
}

export function flattenRubricItems() {
  return SCORING_RUBRIC.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionId: section.id,
      sectionTitle: section.title,
    })),
  );
}
