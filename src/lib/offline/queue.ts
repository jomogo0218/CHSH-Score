import { postComment } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { pushStaffNotify } from "@/lib/notify/staff-push";
import { rememberClassFromReport } from "@/lib/class-pin/remember";
import { uploadInspectionPhoto } from "@/lib/r2/upload";
import { uploadFixPhoto } from "@/lib/r2/fix-upload";
import { saveLocalComment } from "@/lib/local/store";
import type { CommentDoc } from "@/lib/types";

const DB_NAME = "chsh-offline";
const STORE = "jobs";
const VERSION = 1;
export const OFFLINE_EVENT = "chsh-offline-queue";
export const OFFLINE_PHOTO_DONE = "chsh-offline-photo-done";

export type InspectPhotoJob = {
  id: string;
  type: "inspect-photo";
  classId: string;
  itemId: string;
  photoId: string;
  name: string;
  mime: string;
  bytes: ArrayBuffer;
  originalBytes: number;
  compressedBytes: number;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

export type FixReportJob = {
  id: string;
  type: "fix-report";
  classId: string;
  inspectionId: string;
  authorName: string;
  content: string;
  markFixed: boolean;
  photos: Array<{ name: string; mime: string; bytes: ArrayBuffer }>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

export type OfflineJob = InspectPhotoJob | FixReportJob;

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OFFLINE_EVENT));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB 開啟失敗"));
  });
}

export async function enqueueJob(job: OfflineJob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(job);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("離線佇列寫入失敗"));
  });
  db.close();
  emitChange();
}

export async function listJobs(): Promise<OfflineJob[]> {
  const db = await openDb();
  const jobs = await new Promise<OfflineJob[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as OfflineJob[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("離線佇列讀取失敗"));
  });
  db.close();
  return jobs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function deleteJob(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("離線佇列刪除失敗"));
  });
  db.close();
  emitChange();
}

export async function countJobs() {
  const db = await openDb();
  const n = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result ?? 0);
    req.onerror = () => reject(req.error ?? new Error("離線佇列計數失敗"));
  });
  db.close();
  return n;
}

async function patchJob(job: OfflineJob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(job);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("離線佇列更新失敗"));
  });
  db.close();
}

async function flushInspectPhoto(job: InspectPhotoJob) {
  const file = new File([job.bytes], job.name || "photo.jpg", {
    type: job.mime || "image/jpeg",
  });
  const uploaded = await uploadInspectionPhoto(file, { classId: job.classId });
  await deleteJob(job.id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OFFLINE_PHOTO_DONE, {
        detail: {
          queueId: job.id,
          photoId: job.photoId,
          itemId: job.itemId,
          photoUrl: uploaded.photoUrl,
        },
      }),
    );
  }
  return uploaded.photoUrl;
}

async function flushFixReport(job: FixReportJob) {
  const note = job.content.trim() || "已打掃完成，請複查。";
  const name = job.authorName.trim() || "導師";
  rememberClassFromReport({ classId: job.classId });
  const photoUrls: string[] = [];
  for (let i = 0; i < job.photos.length; i++) {
    const photo = job.photos[i];
    const file = new File([photo.bytes], photo.name || `fix_${i + 1}.jpg`, {
      type: photo.mime || "image/jpeg",
    });
    const photoUrl = await uploadFixPhoto(file, job.classId);
    photoUrls.push(photoUrl);
    const noteForPhoto =
      job.photos.length > 1 ? `${note}（${i + 1}/${job.photos.length}）` : note;
    const shouldMarkFixed = job.markFixed && i === job.photos.length - 1;
    if (isFirebaseConfigured()) {
      await postComment({
        inspectionId: job.inspectionId,
        classId: job.classId,
        authorName: name,
        authorRole: "teacher",
        content: noteForPhoto,
        replyPhotoUrl: photoUrl,
        markFixed: shouldMarkFixed,
      });
    } else {
      const local: CommentDoc = {
        comment_id: `offline_${job.id}_${i}`,
        inspection_id: job.inspectionId,
        class_id: job.classId,
        author_role: "teacher",
        author_name: name,
        content: noteForPhoto,
        reply_photo_url: photoUrl,
        created_at: new Date().toISOString(),
        marks_fixed: shouldMarkFixed,
      };
      saveLocalComment(local, shouldMarkFixed);
    }
  }
  await deleteJob(job.id);
  pushStaffNotify({
    type: "fix",
    classId: job.classId,
    inspectionId: job.inspectionId,
    authorName: name,
    note,
    photoUrls,
  });
}

export async function flushOfflineQueue(): Promise<{
  ok: number;
  fail: number;
  uploaded: Record<string, string>;
}> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: 0, fail: 0, uploaded: {} };
  }
  const jobs = await listJobs();
  let ok = 0;
  let fail = 0;
  const uploaded: Record<string, string> = {};
  for (const job of jobs) {
    try {
      if (job.type === "inspect-photo") {
        uploaded[job.photoId] = await flushInspectPhoto(job);
      } else {
        await flushFixReport(job);
      }
      ok += 1;
    } catch (err) {
      fail += 1;
      job.attempts += 1;
      job.lastError = err instanceof Error ? err.message : "同步失敗";
      try {
        await patchJob(job);
      } catch {
        // ignore
      }
    }
  }
  if (ok || fail) emitChange();
  return { ok, fail, uploaded };
}
