/** Firestore / app domain types */

export type UserRole =
  | "admin"
  | "class_health_officer"
  | "teacher"
  | "inspector";

export type InspectionStatus = "pass" | "pending_fix" | "fixed";

export interface ClassDoc {
  class_id: string;
  grade: number;
  class_name: string;
  homeroom_teacher: string;
  avatar_url: string;
  banner_url: string;
  motto?: string;
}

export interface InspectionDoc {
  inspection_id: string;
  date: string;
  class_id: string;
  inspector_id: string;
  total_score: number;
  /** 當日扣分項目數；舊資料可能沒有 */
  deficiency_count?: number;
  summary_blog: string;
  status: InspectionStatus;
  cover_photo_url?: string;
  created_at: string;
}

export interface InspectionItemDoc {
  item_id: string;
  inspection_id: string;
  category: string;
  score_deduction: number;
  note: string;
  photo_url: string;
  photo_timestamp: string;
  gps_location?: string;
}

export interface CommentDoc {
  comment_id: string;
  inspection_id: string;
  /** 方便 rules／列表過濾同班銷案 */
  class_id?: string;
  author_role: UserRole | "class_health_officer" | "teacher" | "admin";
  author_name: string;
  content: string;
  reply_photo_url?: string;
  created_at: string;
  /** 此則留言是否同時將巡檢標為已銷案 */
  marks_fixed?: boolean;
}

export interface UserDoc {
  display_name: string;
  role: UserRole;
  class_id?: string;
}

export type SupplyStatus = "pending" | "ready" | "done" | "rejected";

export interface SupplyRequestDoc {
  request_id: string;
  class_id: string;
  item_id: string;
  item_label: string;
  quantity: number;
  note: string;
  applicant_name: string;
  status: SupplyStatus;
  created_at: string;
  updated_at?: string;
}

export type TelegramBindingRole = "staff" | "teacher";

export interface TelegramBindingDoc {
  chat_id: string;
  role: TelegramBindingRole;
  class_id: string;
  username?: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LiveFeedPayload {
  class_id: string;
  score: number;
  note: string;
  photo_url: string;
  created_at: string;
  status?: InspectionStatus;
  inspection_id?: string;
  deficiency_count?: number;
}

/** 午餐菜單（民國年 date，如 115/8/14） */
export type LunchMealType = "Lunch" | "Dinner";

export interface LunchMenuDoc {
  menu_id: string;
  date: string;
  type: LunchMealType;
  dishes: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
}

export type LunchReportKind = "feedback" | "portion" | "leftover" | "safety";
export type LunchReportStatus = "pending" | "acked" | "closed";

export interface LunchReportDoc {
  report_id: string;
  kind: LunchReportKind;
  class_id: string;
  class_name: string;
  dish?: string;
  dishes?: string[];
  rating?: number;
  portion?: "too_little" | "ok" | "too_much";
  leftover?: string;
  reason?: string;
  comment?: string;
  cleaning?: boolean;
  photo_urls?: string[];
  menu_date?: string;
  status: LunchReportStatus;
  source: string;
  created_at: string;
  updated_at?: string;
}
