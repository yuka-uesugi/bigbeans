import {
  collection,
  doc,
  getDocs,
  setDoc,
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

export interface AttendanceData {
  memberId: string;
  name: string;
  status: AttendanceStatus;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

const EVENTS_COLLECTION = "events";
const ATTENDANCES_SUBCOLLECTION = "attendances";

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
  updatedBy?: string
): Promise<void> {
  const ref = doc(db, EVENTS_COLLECTION, eventId, ATTENDANCES_SUBCOLLECTION, memberId);
  await withTimeout(setDoc(ref, {
    name,
    status,
    updatedAt: Timestamp.now(),
    updatedBy: updatedBy || name,
  }, { merge: true }));
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
