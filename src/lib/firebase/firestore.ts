import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import type {
  ClassDoc,
  CommentDoc,
  InspectionDoc,
  InspectionItemDoc,
  UserDoc,
} from "@/lib/types";

function requireDb() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error("Firestore 尚未設定");
  }
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
): Promise<InspectionDoc[]> {
  const db = requireDb();
  const q = query(
    collection(db, "inspections"),
    where("class_id", "==", classId),
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
