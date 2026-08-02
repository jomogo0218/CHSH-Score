import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type {
  ClassDoc,
  CommentDoc,
  InspectionDoc,
  InspectionItemDoc,
  InspectionStatus,
  UserDoc,
} from "@/lib/types";

/** 大廳／看板預設最多讀取筆數（控 Firestore 讀取） */
export const LATEST_INSPECTIONS_LIMIT = 30;
/** 班級頁近期巡檢上限 */
export const CLASS_INSPECTIONS_LIMIT = 10;

function requireDb() {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore 尚未設定");
  return db;
}

export async function fetchClass(classId: string): Promise<ClassDoc | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, "classes", classId));
  if (!snap.exists()) return null;
  return { class_id: snap.id, ...(snap.data() as DocumentData) } as ClassDoc;
}

export async function fetchInspectionsByClass(
  classId: string,
  max = CLASS_INSPECTIONS_LIMIT,
): Promise<InspectionDoc[]> {
  const db = requireDb();
  try {
    const q = query(
      collection(db, "inspections"),
      where("class_id", "==", classId),
      orderBy("date", "desc"),
      limit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map(
      (d) => ({ inspection_id: d.id, ...d.data() }) as InspectionDoc,
    );
  } catch {
    // 缺複合索引時：仍限制回傳筆數，絕不掃全表
    const q = query(
      collection(db, "inspections"),
      where("class_id", "==", classId),
      limit(Math.min(max * 3, 40)),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ inspection_id: d.id, ...d.data() }) as InspectionDoc)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, max);
  }
}

export async function fetchLatestInspections(
  max = LATEST_INSPECTIONS_LIMIT,
): Promise<InspectionDoc[]> {
  const db = requireDb();
  const q = query(
    collection(db, "inspections"),
    orderBy("created_at", "desc"),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ inspection_id: d.id, ...d.data() }) as InspectionDoc,
  );
}

export async function fetchInspectionItems(
  inspectionId: string,
): Promise<InspectionItemDoc[]> {
  const db = requireDb();
  const q = query(
    collection(db, "inspection_items"),
    where("inspection_id", "==", inspectionId),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ item_id: d.id, ...d.data() }) as InspectionItemDoc,
  );
}

export async function fetchComments(
  inspectionId: string,
): Promise<CommentDoc[]> {
  const db = requireDb();
  const q = query(
    collection(db, "comments"),
    where("inspection_id", "==", inspectionId),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ comment_id: d.id, ...d.data() }) as CommentDoc,
  );
}

export async function fetchUserProfile(uid: string): Promise<UserDoc | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

export async function isAdminUser(uid: string): Promise<boolean> {
  const profile = await fetchUserProfile(uid);
  return profile?.role === "admin";
}

export interface PublishInspectionInput {
  classId: string;
  inspectorId: string;
  summaryBlog: string;
  categories: Array<{
    category: string;
    score_deduction: number;
    note: string;
    photo_url?: string;
  }>;
  coverPhotoUrl?: string;
}

export async function publishInspection(
  input: PublishInspectionInput,
): Promise<InspectionDoc> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase 尚未設定");
  }
  const db = requireDb();
  const date = new Date().toISOString().slice(0, 10);
  const inspectionId = `${date}_${input.classId}`;
  const deduction = input.categories.reduce(
    (sum, c) => sum + Math.abs(Math.min(0, c.score_deduction)),
    0,
  );
  const totalScore = Math.max(0, 100 - deduction);
  const hasDeduction = deduction > 0;
  const status: InspectionStatus = hasDeduction ? "pending_fix" : "pass";
  const createdAt = new Date().toISOString();

  const inspection: InspectionDoc = {
    inspection_id: inspectionId,
    date,
    class_id: input.classId,
    inspector_id: input.inspectorId,
    total_score: totalScore,
    summary_blog: input.summaryBlog,
    status,
    cover_photo_url: input.coverPhotoUrl,
    created_at: createdAt,
  };

  await setDoc(doc(db, "inspections", inspectionId), inspection);

  for (const cat of input.categories) {
    if (cat.score_deduction === 0 && !cat.photo_url && !cat.note) continue;
    await addDoc(collection(db, "inspection_items"), {
      inspection_id: inspectionId,
      category: cat.category,
      score_deduction: cat.score_deduction,
      note: cat.note,
      photo_url: cat.photo_url ?? "",
      photo_timestamp: new Date().toTimeString().slice(0, 8),
    });
  }

  return inspection;
}
