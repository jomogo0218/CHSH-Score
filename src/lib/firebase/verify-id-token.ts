import { NextRequest } from "next/server";

export type VerifiedFirebaseUser = {
  localId: string;
  email?: string;
  idToken: string;
};

export class AuthRequiredError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

function firebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
}

/**
 * 以 Firebase Auth REST 驗證 ID Token（不需 firebase-admin／服務帳戶）。
 */
export async function verifyBearerIdToken(
  request: NextRequest,
): Promise<VerifiedFirebaseUser> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new AuthRequiredError("Firebase 未設定");
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1]) {
    throw new AuthRequiredError("缺少登入憑證");
  }

  const idToken = match[1].trim();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  const data = (await res.json()) as {
    error?: { message?: string };
    users?: Array<{ localId?: string; email?: string }>;
  };

  if (!res.ok || !data.users?.[0]?.localId) {
    throw new AuthRequiredError(
      data.error?.message ?? "登入已失效，請重新登入",
    );
  }

  return {
    localId: data.users[0].localId,
    email: data.users[0].email,
    idToken,
  };
}

/** 用使用者自己的 ID Token 讀取 users/{uid}.role（rules 允許讀自己） */
async function fetchUserRole(
  uid: string,
  idToken: string,
): Promise<string | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new ForbiddenError("無法確認帳號權限，請稍後再試");
  }

  const data = (await res.json()) as {
    fields?: { role?: { stringValue?: string } };
  };
  return data.fields?.role?.stringValue ?? null;
}

/** Firebase 已設定時必須通過驗證；未設定則放行（本機 stub） */
export async function requireFirebaseUserIfConfigured(
  request: NextRequest,
): Promise<VerifiedFirebaseUser | null> {
  if (!firebaseConfigured()) return null;
  return verifyBearerIdToken(request);
}

/** 巡察上傳／MQTT：必須是 admin */
export async function requireAdminIfConfigured(
  request: NextRequest,
): Promise<VerifiedFirebaseUser | null> {
  if (!firebaseConfigured()) return null;
  const user = await verifyBearerIdToken(request);
  const role = await fetchUserRole(user.localId, user.idToken);
  if (role !== "admin") {
    throw new ForbiddenError("需要衛生組長（admin）權限");
  }
  return user;
}

/** 照片上傳：admin 或導師／衛生股長（改善回報也要上傳） */
export async function requireUploadRoleIfConfigured(
  request: NextRequest,
): Promise<VerifiedFirebaseUser | null> {
  if (!firebaseConfigured()) return null;
  const user = await verifyBearerIdToken(request);
  const role = await fetchUserRole(user.localId, user.idToken);
  const allowed = new Set([
    "admin",
    "teacher",
    "class_health_officer",
    "inspector",
  ]);
  if (!role || !allowed.has(role)) {
    throw new ForbiddenError(
      "此帳號沒有上傳權限。請確認 Firestore users/{uid} 已建立且 role 正確。",
    );
  }
  return user;
}
