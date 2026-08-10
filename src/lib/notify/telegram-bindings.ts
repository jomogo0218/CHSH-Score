import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { classIdAliases } from "@/lib/classes/ids";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { TelegramBindingDoc, TelegramBindingRole } from "@/lib/types";

const COL = "telegram_bindings";

function requireDb() {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore 尚未設定");
  return db;
}

export function telegramBindingId(
  role: TelegramBindingRole,
  chatId: string,
  classId = "",
) {
  return role === "staff" ? `staff_${chatId}` : `teacher_${chatId}_${classId}`;
}

export async function upsertTelegramBinding(input: {
  chatId: string;
  role: TelegramBindingRole;
  classId?: string;
  username?: string;
}): Promise<TelegramBindingDoc> {
  const db = requireDb();
  const classId = input.role === "teacher" ? (input.classId ?? "").trim() : "";
  const id = telegramBindingId(input.role, input.chatId, classId);
  const now = new Date().toISOString();
  const payload: TelegramBindingDoc = {
    chat_id: String(input.chatId),
    role: input.role,
    class_id: classId,
    username: (input.username ?? "").slice(0, 64),
    active: true,
    created_at: now,
    updated_at: now,
  };
  await setDoc(doc(db, COL, id), payload, { merge: true });
  return payload;
}

export async function deactivateTelegramChat(chatId: string): Promise<number> {
  const db = requireDb();
  const snap = await getDocs(
    query(collection(db, COL), where("chat_id", "==", String(chatId))),
  );
  let n = 0;
  await Promise.all(
    snap.docs.map(async (d) => {
      await updateDoc(d.ref, { active: false, updated_at: new Date().toISOString() });
      n += 1;
    }),
  );
  return n;
}

export async function listTelegramBindings(): Promise<TelegramBindingDoc[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const db = requireDb();
    const snap = await getDocs(collection(db, COL));
    return snap.docs
      .map((d) => d.data() as TelegramBindingDoc)
      .filter((b) => b.active !== false && Boolean(b.chat_id));
  } catch {
    return [];
  }
}

export async function listStaffChatIds(): Promise<string[]> {
  const env = process.env.TELEGRAM_STAFF_CHAT_ID?.trim();
  const fromDb = (await listTelegramBindings())
    .filter((b) => b.role === "staff")
    .map((b) => b.chat_id);
  return [...new Set([...fromDb, ...(env ? [env] : [])])];
}

export async function listTeacherChatIds(classId: string): Promise<string[]> {
  const aliases = new Set(classIdAliases(classId));
  return [
    ...new Set(
      (await listTelegramBindings())
        .filter((b) => b.role === "teacher" && aliases.has(b.class_id))
        .map((b) => b.chat_id),
    ),
  ];
}
