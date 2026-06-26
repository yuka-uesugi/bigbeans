import { createRemoteJWKSet, jwtVerify } from "jose";

// ─────────────────────────────────────────────
// Firebase Admin（サービスアカウント鍵）を使わない、サーバー専用ヘルパー。
//   会社のセキュリティ設定で「鍵ファイルの作成」が禁止されているため、
//   鍵を一切持たずに次の2つを行う：
//     1) 送信者の本人確認（Googleの公開鍵で ID トークンを検証）
//     2) 名簿（members）の受取設定を、送信者本人の権限で読み取る（Firestore REST）
//   鍵をアプリに常駐させないので、元の方式より安全。
// ─────────────────────────────────────────────

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "team-management-service";

// Firebase の ID トークン（JWT）を検証するための Google 公開鍵（JWKS）。
// 公開鍵なので秘密の合言葉は不要。署名が本物かだけを確認できる。
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

/**
 * ブラウザから送られてきた Firebase の ID トークンを検証する。
 * 正しければ送信者の uid / email を返し、おかしければ例外を投げる。
 * （なりすまし・いたずら送信の防止。サービスアカウント鍵は使わない）
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email?: string }> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  return {
    uid: String(payload.sub || payload.user_id || ""),
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

export type MemberPref = {
  email: string;
  practiceUpdates?: "email" | "line" | "app" | "none";
};

/**
 * 名簿（members コレクション）を Firestore の REST API で読み取る。
 * 送信者本人の ID トークンで認証するので、Firestore のルール（メンバーは名簿閲覧可）に従う。
 * 読めなかった場合は例外を投げる（呼び出し側で静的名簿にフォールバックする想定）。
 */
export async function fetchMembersPrefs(idToken: string): Promise<MemberPref[]> {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/members`;
  const out: MemberPref[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(base);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      throw new Error(`Firestore REST 読み取りに失敗しました（${res.status}）。`);
    }

    const json = (await res.json()) as {
      documents?: Array<{ fields?: Record<string, any> }>;
      nextPageToken?: string;
    };

    for (const docItem of json.documents ?? []) {
      const f = docItem.fields ?? {};
      const email = f.email?.stringValue;
      if (!email) continue;
      const practiceUpdates =
        f.notificationPrefs?.mapValue?.fields?.practiceUpdates?.stringValue;
      out.push({ email, practiceUpdates });
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return out;
}

/**
 * 指定した会員番号（memberId）のメンバーの「名前」と「登録メールアドレス」を
 * 名簿（members）から探して返す。催促メールの宛先を、送信者が自由に指定できないように
 * （＝サーバー側が名簿の正規アドレスにだけ送るように）するためのヘルパー。
 * 見つからない／メール未登録の場合は null を返す。
 */
export async function fetchMemberContactById(
  idToken: string,
  memberId: string | number
): Promise<{ name: string; email: string } | null> {
  const target = String(memberId);
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/members`;
  let pageToken: string | undefined;

  do {
    const url = new URL(base);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      throw new Error(`Firestore REST 読み取りに失敗しました（${res.status}）。`);
    }

    const json = (await res.json()) as {
      documents?: Array<{ fields?: Record<string, any> }>;
      nextPageToken?: string;
    };

    for (const docItem of json.documents ?? []) {
      const f = docItem.fields ?? {};
      const idVal = f.id?.integerValue ?? f.id?.doubleValue ?? f.id?.stringValue;
      if (idVal === undefined || String(idVal) !== target) continue;
      const email = f.email?.stringValue;
      const name = f.name?.stringValue || "";
      if (!email) return null; // 名簿にいるがメール未登録
      return { name, email };
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return null; // 該当メンバーが見つからない
}

/**
 * 承認できる人（代表=admin／サポーター=supporter）のメールアドレスを
 * 権限一覧（userRoles）から集めて返す。催促の承認依頼メールの宛先に使う。
 * 読めなかった場合は例外を投げる（呼び出し側で「メール通知なしでも承認は可能」と扱う）。
 */
export async function fetchApproverEmails(idToken: string): Promise<string[]> {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/userRoles`;
  const out: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(base);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      throw new Error(`Firestore REST 読み取りに失敗しました（${res.status}）。`);
    }

    const json = (await res.json()) as {
      documents?: Array<{ fields?: Record<string, any> }>;
      nextPageToken?: string;
    };

    for (const docItem of json.documents ?? []) {
      const f = docItem.fields ?? {};
      const role = f.role?.stringValue;
      const email = f.email?.stringValue;
      if (!email) continue;
      if (role === "admin" || role === "supporter") {
        out.push(email);
      }
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return Array.from(new Set(out.map((e) => e.toLowerCase())));
}
