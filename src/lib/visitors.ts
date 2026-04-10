import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export interface VisitorData {
  id: string;
  name: string;
  rank: "A" | "B" | "C";
  invitedBy: string;
  teamName?: string;
  ageGroup?: string;
  joinIntent: boolean;
  comment?: string;
  registeredAt?: Timestamp;
  registeredBy?: string;
}

// Firestoreへの書き込み用（idを除外）
type VisitorWriteData = Omit<VisitorData, "id">;

const EVENTS_COLLECTION = "events";
const VISITORS_SUBCOLLECTION = "visitors";

// ─────────────────────────────────────────────
// 読み取り
// ─────────────────────────────────────────────

/**
 * 特定イベントの全ビジターを取得する
 */
export async function getVisitors(eventId: string): Promise<VisitorData[]> {
  const ref = collection(db, EVENTS_COLLECTION, eventId, VISITORS_SUBCOLLECTION);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as VisitorData[];
}

/**
 * 特定イベントのビジターをリアルタイムで購読する
 */
export function subscribeToVisitors(
  eventId: string,
  callback: (visitors: VisitorData[]) => void
): Unsubscribe {
  const ref = collection(db, EVENTS_COLLECTION, eventId, VISITORS_SUBCOLLECTION);
  return onSnapshot(ref, (snapshot) => {
    const visitors = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as VisitorData[];
    callback(visitors);
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
 * ビジターを登録する
 */
export async function registerVisitor(
  eventId: string,
  data: Omit<VisitorWriteData, "registeredAt">
): Promise<string> {
  const ref = doc(collection(db, EVENTS_COLLECTION, eventId, VISITORS_SUBCOLLECTION));
  await withTimeout(setDoc(ref, {
    ...data,
    registeredAt: Timestamp.now(),
  }));
  return ref.id;
}

/**
 * ビジター情報を更新する
 */
export async function updateVisitor(
  eventId: string,
  visitorId: string,
  data: Partial<VisitorWriteData>
): Promise<void> {
  const ref = doc(db, EVENTS_COLLECTION, eventId, VISITORS_SUBCOLLECTION, visitorId);
  await withTimeout(setDoc(ref, data, { merge: true }));
}

/**
 * ビジターを削除する
 */
export async function deleteVisitor(
  eventId: string,
  visitorId: string
): Promise<void> {
  const ref = doc(db, EVENTS_COLLECTION, eventId, VISITORS_SUBCOLLECTION, visitorId);
  await withTimeout(deleteDoc(ref));
}

/**
 * practiceSchedule.ts のビジターデータをFirestoreに投入する
 */
export async function seedVisitorsFromSchedule(
  eventId: string,
  registrations: Array<{
    id: string;
    name: string;
    type: string;
    rank?: string;
    invitedBy?: string;
    teamName?: string;
    ageGroup?: string;
    comment?: string;
  }>
): Promise<number> {
  let count = 0;
  const visitorRegs = registrations.filter((r) => r.type === "visitor");

  for (const reg of visitorRegs) {
    const ref = doc(
      db,
      EVENTS_COLLECTION,
      eventId,
      VISITORS_SUBCOLLECTION,
      reg.id
    );
    await setDoc(ref, {
      name: reg.name,
      rank: reg.rank || "B",
      invitedBy: reg.invitedBy || "",
      teamName: reg.teamName || "",
      ageGroup: reg.ageGroup || "",
      joinIntent: false,
      comment: reg.comment || "",
      registeredAt: Timestamp.now(),
      registeredBy: "seed",
    });
    count++;
  }

  return count;
}
