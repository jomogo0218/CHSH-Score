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
  author_role: UserRole | "class_health_officer" | "teacher" | "admin";
  author_name: string;
  content: string;
  reply_photo_url?: string;
  created_at: string;
}

export interface UserDoc {
  display_name: string;
  role: UserRole;
  class_id?: string;
}

export interface LiveFeedPayload {
  class_id: string;
  score: number;
  note: string;
  photo_url: string;
  created_at: string;
  status?: InspectionStatus;
}
