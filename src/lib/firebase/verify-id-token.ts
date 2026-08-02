import { NextRequest } from "next/server";

export type VerifiedFirebaseUser = {
  localId: string;
  email?: string;
};

/**
 * 以 Firebase Auth REST 驗證 ID Token（不需 firebase-admin／服務帳戶）。
 * 未設定 Firebase 公開設定時回傳 null（本機 stub 模式）。
 */
export async function verifyBearerIdToken(
  request: NextRequest,
): Promise<VerifiedFirebaseUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;

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
  };
}

export class AuthRequiredError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

/** Firebase 已設定時必須通過驗證；未設定則放行（本機 stub） */
export async function requireFirebaseUserIfConfigured(
  request: NextRequest,
): Promise<VerifiedFirebaseUser | null> {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
  if (!configured) return null;
  return verifyBearerIdToken(request);
}
