import { createRemoteJWKSet, jwtVerify } from "jose";

// ─────────────────────────────────────────────
// Firebase Admin（サービスアカウント鍵）を使わない、サーバー専用ヘルパー。
//   会社のセキュリティ設定で「鍵ファイルの作成」が禁止されているため、
//   鍵を一切持たずに次の2つを行う：
//     1) 送信者の本人確認（Googleの公開鍵で ID トークンを検証）
//     2) 名簿（members）の受取設定を、送信者本人の権限で読み取る（Firestore REST）
//   鍵をアプリに常駐させないので、元の方式より安全。
// ─────────────────────────────────────────────

// Firestore REST API のフィールド値（stringValue / integerValue など）を表す型
type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
};

type FirestoreFields = Record<string, FirestoreValue>;

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "team-management-service";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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
      documents?: Array<{ fields?: FirestoreFields }>;
      nextPageToken?: string;
    };

    for (const docItem of json.documents ?? []) {
      const f = docItem.fields ?? {};
      const email = f.email?.stringValue;
      if (!email) continue;
      const practiceUpdates =
        f.notificationPrefs?.mapValue?.fields?.practiceUpdates?.stringValue as
          | MemberPref["practiceUpdates"]
          | undefined;
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
      documents?: Array<{ fields?: FirestoreFields }>;
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
      documents?: Array<{ fields?: FirestoreFields }>;
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

// ─────────────────────────────────────────────
// 自動実行（Cron）用のヘルパー
//   誰もログインしていない自動実行では ID トークンが無い。
//   そこで「ロボット役」の専用アカウント（メール＋パスワード）で
//   プログラムが自動ログインし、その ID トークンで名簿などを読む。
//   これも鍵ファイル（サービスアカウント）を使わない方式。
// ─────────────────────────────────────────────

/**
 * ロボット役の専用アカウントでログインし、ID トークンを取得する。
 * 環境変数 FIREBASE_ROBOT_EMAIL / FIREBASE_ROBOT_PASSWORD と
 * 公開APIキー NEXT_PUBLIC_FIREBASE_API_KEY を使う（鍵ファイル不要）。
 */
export async function signInAsRobot(): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const email = process.env.FIREBASE_ROBOT_EMAIL;
  const password = process.env.FIREBASE_ROBOT_PASSWORD;
  if (!apiKey || !email || !password) {
    throw new Error(
      "ロボット用ログイン設定（NEXT_PUBLIC_FIREBASE_API_KEY / FIREBASE_ROBOT_EMAIL / FIREBASE_ROBOT_PASSWORD）が未設定です。"
    );
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    throw new Error(`ロボットのログインに失敗しました（${res.status}）。`);
  }
  const json = (await res.json()) as { idToken?: string };
  if (!json.idToken) {
    throw new Error("ロボットのログインに失敗しました（ID トークンが取得できませんでした）。");
  }
  return json.idToken;
}

export type ReminderEvent = {
  id: string;
  title: string;
  type: string;
  date: string;     // "2026-07-10"
  time?: string;
  location?: string;
  reminderSent: boolean; // すでに催促メールを送信済みか
};

/**
 * 指定日の「練習(practice)」イベントを取得する。
 * events は公開読み取りだが、他の読み取りと同じ ID トークンで統一して呼ぶ。
 */
export async function fetchPracticeEventsByDate(
  idToken: string,
  dateStr: string
): Promise<ReminderEvent[]> {
  const out: ReminderEvent[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${FIRESTORE_BASE}/events`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      throw new Error(`イベントの読み取りに失敗しました（${res.status}）。`);
    }

    const json = (await res.json()) as {
      documents?: Array<{ name?: string; fields?: FirestoreFields }>;
      nextPageToken?: string;
    };

    for (const docItem of json.documents ?? []) {
      const f = docItem.fields ?? {};
      if (f.date?.stringValue !== dateStr) continue;
      if (f.type?.stringValue !== "practice") continue;
      const id = (docItem.name ?? "").split("/").pop() ?? "";
      out.push({
        id,
        title: f.title?.stringValue ?? "練習",
        type: "practice",
        date: dateStr,
        time: f.time?.stringValue,
        location: f.location?.stringValue,
        reminderSent: Boolean(
          f.attendanceReminderSentAt?.stringValue ||
            f.attendanceReminderSentAt?.timestampValue
        ),
      });
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return out;
}

/**
 * あるイベントで「回答済み」の人を特定するための情報を返す。
 * status が入っている出欠データの memberId と name を集める。
 */
export async function fetchAnsweredForEvent(
  idToken: string,
  eventId: string
): Promise<{ memberIds: Set<string>; names: Set<string> }> {
  const memberIds = new Set<string>();
  const names = new Set<string>();
  let pageToken: string | undefined;

  do {
    const url = new URL(`${FIRESTORE_BASE}/events/${eventId}/attendances`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      throw new Error(`出欠データの読み取りに失敗しました（${res.status}）。`);
    }

    const json = (await res.json()) as {
      documents?: Array<{ name?: string; fields?: FirestoreFields }>;
      nextPageToken?: string;
    };

    for (const docItem of json.documents ?? []) {
      const f = docItem.fields ?? {};
      const status = f.status?.stringValue;
      // status が null（未回答の初期レコード）は「回答済み」に数えない
      if (!status) continue;
      const memberId =
        f.memberId?.stringValue ??
        f.memberId?.integerValue ??
        (docItem.name ?? "").split("/").pop();
      if (memberId) memberIds.add(String(memberId));
      const nm = f.name?.stringValue;
      if (nm) names.add(nm);
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return { memberIds, names };
}

export type ReminderMember = {
  id: string;
  name: string;
  email: string;
  membershipType?: string;
  practiceUpdates?: "email" | "line" | "app" | "none";
};

/**
 * 催促メールの宛先候補となる名簿を取得する。
 * メール送信に必要な id / name / email / membershipType / 受取設定をまとめて返す。
 */
export async function fetchMembersForReminder(
  idToken: string
): Promise<ReminderMember[]> {
  const out: ReminderMember[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${FIRESTORE_BASE}/members`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      throw new Error(`名簿の読み取りに失敗しました（${res.status}）。`);
    }

    const json = (await res.json()) as {
      documents?: Array<{ fields?: FirestoreFields }>;
      nextPageToken?: string;
    };

    for (const docItem of json.documents ?? []) {
      const f = docItem.fields ?? {};
      const email = f.email?.stringValue;
      if (!email) continue;
      const idVal =
        f.id?.integerValue ?? f.id?.doubleValue ?? f.id?.stringValue;
      out.push({
        id: idVal !== undefined ? String(idVal) : "",
        name: f.name?.stringValue ?? "",
        email,
        membershipType: f.membershipType?.stringValue,
        practiceUpdates: f.notificationPrefs?.mapValue?.fields?.practiceUpdates
          ?.stringValue as ReminderMember["practiceUpdates"] | undefined,
      });
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return out;
}

/**
 * イベントに「催促メール送信済み」の印を付ける（二重送信の防止）。
 * events の update はメンバー権限で許可されているため、ロボットの ID トークンで書ける。
 */
export async function markReminderSent(
  idToken: string,
  eventId: string,
  isoTime: string
): Promise<void> {
  const url = new URL(`${FIRESTORE_BASE}/events/${eventId}`);
  url.searchParams.set("updateMask.fieldPaths", "attendanceReminderSentAt");

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: { attendanceReminderSentAt: { stringValue: isoTime } },
    }),
  });
  if (!res.ok) {
    throw new Error(`送信済みフラグの書き込みに失敗しました（${res.status}）。`);
  }
}
