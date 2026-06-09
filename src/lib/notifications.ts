import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  orderBy,
  limit as fbLimit,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// 個人向け通知（意見箱への返信など）
//   保存先: users/{uid}/notifications/{id}
//   ※ 以前は notifications/{uid}/items に書いていたが、
//     firestore.rules の許可パスと食い違って拒否されていたため統一した。
// ─────────────────────────────────────────────

export interface NotificationData {
  id: string;
  type: "reply";
  suggestionId: string;
  suggestionTitle: string;
  replyAuthor: string;
  replyBody: string;
  createdAt: Timestamp;
  read: boolean;
}

// 個人通知のサブコレクション参照
function personalCol(uid: string) {
  return collection(db, "users", uid, "notifications");
}

export function subscribeToNotifications(
  uid: string,
  callback: (notifs: NotificationData[]) => void
): Unsubscribe {
  const q = query(personalCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NotificationData[]),
    () => callback([])
  );
}

export async function createReplyNotification(
  targetUid: string,
  data: {
    suggestionId: string;
    suggestionTitle: string;
    replyAuthor: string;
    replyBody: string;
  }
): Promise<void> {
  const docRef = doc(personalCol(targetUid));
  await setDoc(docRef, { ...data, type: "reply", createdAt: Timestamp.now(), read: false });
}

export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  await updateDoc(doc(db, "users", uid, "notifications", notifId), { read: true });
}

export async function markAllRead(uid: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => markNotificationRead(uid, id)));
}

// ─────────────────────────────────────────────
// 全員向け通知（ブロードキャスト）
//   保存先: broadcasts/{id}（1件＝1お知らせ。全員が同じものを見る）
//   既読管理は各自の「最終既読時刻」だけで行う（未読＝それより新しいもの）。
//   → メンバー全員の UID 一覧を持たなくてよい。
// ─────────────────────────────────────────────

export type BroadcastType = "event" | "survey" | "announcement";

export interface BroadcastData {
  id: string;
  type: BroadcastType;
  title: string;        // 例: 新しい予定: 4/12 練習
  body?: string;        // 補足（任意）
  link: string;         // タップ時の遷移先（例: /dashboard/calendar）
  createdByName?: string;
  createdAt: Timestamp;
}

const BROADCASTS = "broadcasts";

export function subscribeToBroadcasts(
  callback: (items: BroadcastData[]) => void,
  max: number = 30
): Unsubscribe {
  const q = query(collection(db, BROADCASTS), orderBy("createdAt", "desc"), fbLimit(max));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BroadcastData[]),
    (err) => {
      // 失敗時は静かに空にする（pending ユーザー等で読めない場合があるため）
      console.error("broadcasts 読み取りエラー:", err);
      callback([]);
    }
  );
}

export async function createBroadcast(data: {
  type: BroadcastType;
  title: string;
  link: string;
  body?: string;
  createdByName?: string;
}): Promise<void> {
  const docRef = doc(collection(db, BROADCASTS));
  await setDoc(docRef, {
    type: data.type,
    title: data.title,
    link: data.link,
    ...(data.body ? { body: data.body } : {}),
    ...(data.createdByName ? { createdByName: data.createdByName } : {}),
    createdAt: Timestamp.now(),
  });
}

// ─────────────────────────────────────────────
// 全員向け通知の「最終既読時刻」
//   保存先: notificationState/{uid} の lastReadBroadcastAt
// ─────────────────────────────────────────────

export function subscribeToLastReadBroadcastAt(
  uid: string,
  callback: (ts: Timestamp | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "notificationState", uid),
    (snap) => callback((snap.data()?.lastReadBroadcastAt as Timestamp) ?? null),
    () => callback(null)
  );
}

export async function getLastReadBroadcastAt(uid: string): Promise<Timestamp | null> {
  const snap = await getDoc(doc(db, "notificationState", uid));
  return (snap.data()?.lastReadBroadcastAt as Timestamp) ?? null;
}

export async function setLastReadBroadcastAt(uid: string): Promise<void> {
  await setDoc(
    doc(db, "notificationState", uid),
    { lastReadBroadcastAt: Timestamp.now() },
    { merge: true }
  );
}
