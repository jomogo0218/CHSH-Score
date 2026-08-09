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
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { invalidateCache } from "@/lib/cache/ttl";
import { classIdAliases } from "@/lib/classes/ids";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { computeInspectionTotal } from "@/lib/constants/scoring-rubric";
import { countDeficiencies, deficiencyCountOf } from "@/lib/scoring/deficiency";
import { taiwanDateString } from "@/lib/time/taiwan";
import type {
  ClassDoc,
  CommentDoc,
  InspectionDoc,
  InspectionItemDoc,
  InspectionStatus,
  UserDoc,
  UserRole,
} from "@/lib/types";

/** 大廳／看板預設最多讀取筆數（控 Firestore 讀取，略增以涵蓋本週累計） */
export const LATEST_INSPECTIONS_LIMIT = 50;
/** 學期榜：自學期初起，上限避免一次掃太多 */
export const SEMESTER_INSPECTIONS_LIMIT = 500;
/** 班級頁巡檢＋歷史檔案上限 */
export const CLASS_INSPECTIONS_LIMIT = 40;

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

function mapInspectionDocs(
  docs: Array<{ id: string; data: () => DocumentData }>,
): InspectionDoc[] {
  return docs.map((d) => ({ inspection_id: d.id, ...d.data() }) as InspectionDoc);
}

export async function fetchInspectionsByClass(
  classId: string,
  max = CLASS_INSPECTIONS_LIMIT,
): Promise<InspectionDoc[]> {
  const db = requireDb();
  const aliases = classIdAliases(classId);

  try {
    const q = query(
      collection(db, "inspections"),
      where("class_id", "in", aliases),
      orderBy("date", "desc"),
      limit(max),
    );
    const snap = await getDocs(q);
    return mapInspectionDocs(snap.docs);
  } catch {
    // 缺 in+date 索引時：各別名分開查，絕不掃全表
    const snaps = await Promise.all(
      aliases.map((id) =>
        getDocs(
          query(
            collection(db, "inspections"),
            where("class_id", "==", id),
            orderBy("date", "desc"),
            limit(max),
          ),
        ).catch(() =>
          getDocs(
            query(
              collection(db, "inspections"),
              where("class_id", "==", id),
              limit(Math.min(max * 3, 40)),
            ),
          ),
        ),
      ),
    );
    const map = new Map<string, InspectionDoc>();
    for (const snap of snaps) {
      for (const d of snap.docs) {
        map.set(d.id, { inspection_id: d.id, ...d.data() } as InspectionDoc);
      }
    }
    return [...map.values()]
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

export async function fetchInspectionsSince(
  startDate: string,
  max = SEMESTER_INSPECTIONS_LIMIT,
): Promise<InspectionDoc[]> {
  const db = requireDb();
  try {
    const q = query(
      collection(db, "inspections"),
      where("date", ">=", startDate),
      orderBy("date", "desc"),
      limit(max),
    );
    const snap = await getDocs(q);
    return mapInspectionDocs(snap.docs);
  } catch {
    return fetchLatestInspections(Math.min(max, 200));
  }
}

export async function fetchInspection(
  inspectionId: string,
): Promise<InspectionDoc | null> {
  if (!isFirebaseConfigured()) return null;
  const db = requireDb();
  const snap = await getDoc(doc(db, "inspections", inspectionId));
  if (!snap.exists()) return null;
  return { inspection_id: snap.id, ...snap.data() } as InspectionDoc;
}

/** 今日巡察：同時嘗試 j101 與舊碼 101 文件 ID */
export async function fetchTodayInspection(
  classId: string,
): Promise<InspectionDoc | null> {
  const date = taiwanDateString();
  for (const id of classIdAliases(classId)) {
    const found = await fetchInspection(`${date}_${id}`);
    if (found) return found;
  }
  return null;
}

export async function fetchInspectionItems(
  inspectionId: string,
): Promise<InspectionItemDoc[]> {
  const db = requireDb();
  const q = query(
    collection(db, "inspection_items"),
    where("inspection_id", "==", inspectionId),
    limit(40),
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
    /** 可為正分或負分；欄位名沿用 score_deduction */
    score_deduction: number;
    /** 是否已點選標準（含選 0 分） */
    scored?: boolean;
    note: string;
    /** 同一項目可多張；發布時拆成多筆 inspection_items */
    photo_urls?: string[];
  }>;
  coverPhotoUrl?: string;
  /**
   * append：同日追加照片／評分，保留舊細項
   * replace：整筆覆寫（刪除舊細項）
   */
  mode?: "append" | "replace";
}

export async function publishInspection(
  input: PublishInspectionInput,
): Promise<InspectionDoc> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase 尚未設定");
  }
  const db = requireDb();
  const date = taiwanDateString();
  const mode = input.mode ?? "replace";

  let inspectionId = `${date}_${input.classId}`;
  let existing: InspectionDoc | null = null;
  const primarySnap = await getDoc(doc(db, "inspections", inspectionId));
  if (primarySnap.exists()) {
    existing = {
      inspection_id: primarySnap.id,
      ...primarySnap.data(),
    } as InspectionDoc;
  } else {
    for (const alias of classIdAliases(input.classId)) {
      if (alias === input.classId) continue;
      const altId = `${date}_${alias}`;
      const altSnap = await getDoc(doc(db, "inspections", altId));
      if (!altSnap.exists()) continue;
      inspectionId = altId;
      existing = {
        inspection_id: altSnap.id,
        ...altSnap.data(),
      } as InspectionDoc;
      break;
    }
  }

  const newScores = input.categories
    .filter((c) => c.scored === true)
    .map((c) => ({
      category: c.category,
      score: c.score_deduction,
    }));

  let totalScore: number;
  let deficiencyCount: number;
  let status: InspectionStatus;
  let summaryBlog = input.summaryBlog;
  let coverPhotoUrl = input.coverPhotoUrl;
  let createdAt = new Date().toISOString();

  if (mode === "append" && existing) {
    createdAt = existing.created_at;
    coverPhotoUrl = input.coverPhotoUrl || existing.cover_photo_url;
    if (
      existing.summary_blog &&
      input.summaryBlog &&
      input.summaryBlog !== existing.summary_blog
    ) {
      summaryBlog = `${existing.summary_blog}；${input.summaryBlog}`;
    } else {
      summaryBlog = input.summaryBlog || existing.summary_blog;
    }

    if (newScores.length > 0) {
      const existingItems = await getDocs(
        query(
          collection(db, "inspection_items"),
          where("inspection_id", "==", inspectionId),
        ),
      );
      const scoreByCat = new Map<string, number>();
      for (const d of existingItems.docs) {
        const data = d.data() as {
          category?: string;
          score_deduction?: number;
        };
        if (!data.category) continue;
        const next = data.score_deduction ?? 0;
        const prev = scoreByCat.get(data.category);
        // 同項目多張時分數通常在第一筆；保留非 0 分
        if (prev === undefined) {
          scoreByCat.set(data.category, next);
        } else if (next !== 0) {
          scoreByCat.set(data.category, next);
        }
      }
      for (const s of newScores) {
        scoreByCat.set(s.category, s.score);
      }
      const merged = [...scoreByCat.values()];
      totalScore = computeInspectionTotal(merged);
      deficiencyCount = countDeficiencies(merged);
      const hasPenalty = merged.some((s) => s < 0);
      status = hasPenalty
        ? "pending_fix"
        : existing.status === "fixed"
          ? "fixed"
          : "pass";
    } else {
      totalScore = existing.total_score;
      deficiencyCount = existing.deficiency_count ?? deficiencyCountOf(existing);
      status = existing.status;
    }
  } else {
    const scoresForTotal = newScores.map((s) => s.score);
    totalScore = computeInspectionTotal(scoresForTotal);
    deficiencyCount = countDeficiencies(scoresForTotal);
    status = scoresForTotal.some((s) => s < 0) ? "pending_fix" : "pass";
  }

  const inspection: InspectionDoc = {
    inspection_id: inspectionId,
    date,
    class_id: input.classId,
    inspector_id: input.inspectorId,
    total_score: totalScore,
    deficiency_count: deficiencyCount,
    summary_blog: summaryBlog,
    status,
    cover_photo_url: coverPhotoUrl,
    created_at: createdAt,
  };

  await setDoc(doc(db, "inspections", inspectionId), inspection);

  if (mode === "replace") {
    const existingItems = await getDocs(
      query(
        collection(db, "inspection_items"),
        where("inspection_id", "==", inspectionId),
      ),
    );
    if (!existingItems.empty) {
      const batch = writeBatch(db);
      existingItems.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  const stamp = new Date().toTimeString().slice(0, 8);
  for (const cat of input.categories) {
    const urls = (cat.photo_urls ?? []).filter(Boolean);
    const scored = cat.scored === true;
    if (!scored && urls.length === 0 && !cat.note) continue;

    if (urls.length === 0) {
      await addDoc(collection(db, "inspection_items"), {
        inspection_id: inspectionId,
        category: cat.category,
        score_deduction: scored ? cat.score_deduction : 0,
        note: cat.note,
        photo_url: "",
        photo_timestamp: stamp,
      });
      continue;
    }

    for (let i = 0; i < urls.length; i++) {
      const multi = urls.length > 1;
      await addDoc(collection(db, "inspection_items"), {
        inspection_id: inspectionId,
        category: cat.category,
        score_deduction: i === 0 && scored ? cat.score_deduction : 0,
        note: multi
          ? `${cat.note || cat.category}（${i + 1}/${urls.length}）`
          : cat.note,
        photo_url: urls[i],
        photo_timestamp: stamp,
      });
    }
  }

  invalidateCache(`class:${input.classId}`);
  invalidateCache("hall:");
  invalidateCache("board:");

  return inspection;
}

export interface PostCommentInput {
  inspectionId: string;
  classId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  replyPhotoUrl?: string;
  markFixed?: boolean;
}

export async function postComment(
  input: PostCommentInput,
): Promise<CommentDoc> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase 尚未設定");
  }
  const db = requireDb();
  const createdAt = new Date().toISOString();
  const payload = {
    inspection_id: input.inspectionId,
    class_id: input.classId,
    author_role: input.authorRole,
    author_name: input.authorName,
    content: input.content.trim(),
    reply_photo_url: input.replyPhotoUrl ?? "",
    created_at: createdAt,
    marks_fixed: Boolean(input.markFixed),
  };

  const ref = await addDoc(collection(db, "comments"), payload);

  if (input.markFixed) {
    await updateDoc(doc(db, "inspections", input.inspectionId), {
      status: "fixed" satisfies InspectionStatus,
    });
  }

  invalidateCache(`class:${input.classId}`);
  invalidateCache("hall:");
  invalidateCache("board:");

  return { comment_id: ref.id, ...payload };
}

/** 組長確認已改善成功（僅改 status → fixed，不刪照片） */
export async function markInspectionFixed(
  inspectionId: string,
  classId: string,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase 尚未設定");
  }
  const db = requireDb();
  await updateDoc(doc(db, "inspections", inspectionId), {
    status: "fixed" satisfies InspectionStatus,
  });
  invalidateCache(`class:${classId}`);
  invalidateCache("hall:");
  invalidateCache("board:");
}
