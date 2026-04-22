import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export type AttendanceStatus = "attend" | "absent" | "pending" | null;
export type MembershipType = "official" | "light" | "coach" | "visitor";

export interface AttendanceData {
  memberId: string;
  name: string;
  status: AttendanceStatus;
  membershipType?: MembershipType;
  isPaid?: boolean;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

const EVENTS_COLLECTION = "events";
const ATTENDANCES_SUBCOLLECTION = "attendances";

/**
 * 出欠（または支払状況など含む）データを部分更新する
 */
export async function updateAttendance(
  eventId: string,
  memberId: string | number,
  data: Partial<AttendanceData>
): Promise<void> {
  const ref = doc(db, EVENTS_COLLECTION, eventId, ATTENDANCES_SUBCOLLECTION, String(memberId));
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ─────────────────────────────────────────────
// 読み取り
// ─────────────────────────────────────────────

/**
 * 特定イベントの全出欠データを取得する
 */
export async function getAttendances(eventId: string): Promise<AttendanceData[]> {
  const ref = collection(db, EVENTS_COLLECTION, eventId, ATTENDANCES_SUBCOLLECTION);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({
    memberId: doc.id,
    ...doc.data(),
  })) as AttendanceData[];
}

/**
 * 特定イベントの出欠をリアルタイムで購読する
 */
export function subscribeToAttendances(
  eventId: string,
  callback: (attendances: AttendanceData[]) => void
): Unsubscribe {
  const ref = collection(db, EVENTS_COLLECTION, eventId, ATTENDANCES_SUBCOLLECTION);
  return onSnapshot(ref, (snapshot) => {
    const attendances = snapshot.docs.map((doc) => ({
      memberId: doc.id,
      ...doc.data(),
    })) as AttendanceData[];
    callback(attendances);
  });
}

// ─────────────────────────────────────────────
// 書き込み
// ─────────────────────────────────────────────

/**
 * Firestoreの書き込みにタイムアウトを設定するヘルパー
 */
function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestoreへの書き込みが${ms / 1000}秒以内に完了しませんでした。`)), ms)
    ),
  ]);
}

/**
 * 出欠を回答する（作成 or 更新）
 * @param eventId イベントID
 * @param memberId メンバーID（Firestoreのドキュメントキー）
 * @param name メンバー名
 * @param status 出欠ステータス
 * @param updatedBy 回答者（自己回答 or 代理回答者名）
 */
export async function setAttendance(
  eventId: string,
  memberId: string,
  name: string,
  status: AttendanceStatus,
  updatedBy?: string,
  membershipType?: MembershipType
): Promise<void> {
  const ref = doc(db, EVENTS_COLLECTION, eventId, ATTENDANCES_SUBCOLLECTION, memberId);
  await withTimeout(setDoc(ref, {
    name,
    status,
    ...(membershipType ? { membershipType } : {}),
    updatedAt: Timestamp.now(),
    updatedBy: updatedBy || name,
  }, { merge: true }));

  // 正会員が回答したとき、全員回答チェックを非同期で実行
  if (membershipType === "official" && (status === "attend" || status === "absent")) {
    checkAndTriggerEarlyUnlock(eventId).catch(() => {});
  }
}

/**
 * 正会員全員が回答したかをチェックし、完了していれば早期解禁フラグを立てる
 */
async function checkAndTriggerEarlyUnlock(eventId: string): Promise<void> {
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) return;

  const eventData = eventSnap.data();
  const config = eventData.bookingConfig;
  if (!config || config.lightUnlockedEarly) return; // すでに解禁済みならスキップ

  const officialTotal: number = config.officialTotalCount ?? 15;

  // 正会員の回答数をカウント
  const attendancesRef = collection(db, EVENTS_COLLECTION, eventId, ATTENDANCES_SUBCOLLECTION);
  const snap = await getDocs(attendancesRef);
  const officialAnswered = snap.docs.filter((d) => {
    const data = d.data();
    return (
      data.membershipType === "official" &&
      (data.status === "attend" || data.status === "absent")
    );
  }).length;

  if (officialAnswered >= officialTotal) {
    await updateDoc(eventRef, { "bookingConfig.lightUnlockedEarly": true });
  }
}

/**
 * 出欠データを削除する
 */
export async function deleteAttendance(
  eventId: string,
  memberId: string
): Promise<void> {
  const ref = doc(db, EVENTS_COLLECTION, eventId, ATTENDANCES_SUBCOLLECTION, memberId);
  await withTimeout(deleteDoc(ref));
}

/**
 * メンバー一覧から一括で初期出欠データを作成する（未回答状態）
 */
export async function initializeAttendances(
  eventId: string,
  members: Array<{ id: string | number; name: string }>
): Promise<void> {
  for (const member of members) {
    const ref = doc(
      db,
      EVENTS_COLLECTION,
      eventId,
      ATTENDANCES_SUBCOLLECTION,
      String(member.id)
    );
    await withTimeout(setDoc(ref, {
      name: member.name,
      status: null,
      updatedAt: Timestamp.now(),
      updatedBy: "system",
    }, { merge: true }));
  }
}
