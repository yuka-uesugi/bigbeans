import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export interface BookingConfig {
  publishedAt: Timestamp;
  lightUnlockDelayDays: number;
  visitorUnlockDelayDays: number;
  officialTotalCount: number;
  memberReservedSlots: number;
  lightUnlockedEarly: boolean;
  visitorUnlockedEarly: boolean;
}

export interface EventAttachment {
  label: string;  // "要綱", "組み合わせ表" など
  url: string;    // https://... または Google Drive リンク
}

export interface EventData {
  id: string;
  title: string;
  type: "practice" | "match" | "event";
  date: string;        // "2026-04-08" 形式
  time: string;        // "12:00-15:00"
  location: string;
  description?: string;
  responsibleTeam?: string;
  maxCapacity: number;
  dutyMembers: string[];
  attachments?: EventAttachment[];
  bookingConfig?: BookingConfig;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Firestoreへの書き込み用（idを除外）
type EventWriteData = Omit<EventData, "id">;

const EVENTS_COLLECTION = "events";

// ─────────────────────────────────────────────
// 読み取り
// ─────────────────────────────────────────────

/**
 * 全イベントを取得する
 */
export async function getAllEvents(): Promise<EventData[]> {
  const q = query(collection(db, EVENTS_COLLECTION), orderBy("date", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventData[];
}

/**
 * 特定の日付のイベントを取得する
 * @param dateStr "2026-04-08" 形式
 */
export async function getEventsByDate(dateStr: string): Promise<EventData[]> {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("date", "==", dateStr)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventData[];
}

/**
 * 特定の月のイベントを取得する
 * @param year 年 (2026)
 * @param month 月 (1-12)
 */
export async function getEventsByMonth(
  year: number,
  month: number
): Promise<EventData[]> {
  // 月の開始日と終了日を計算
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventData[];
}

/**
 * 直近の練習イベントを取得する
 * ※複合インデックス不要: dateのみでクエリし、クライアント側でtype=practiceをフィルタ
 */
export async function getNextPractice(): Promise<EventData | null> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("date", ">=", todayStr),
    orderBy("date", "asc")
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  // クライアント側でtype=practiceをフィルタ
  const practiceDoc = snapshot.docs.find(
    (d) => d.data().type === "practice"
  );
  if (!practiceDoc) return null;

  return { id: practiceDoc.id, ...practiceDoc.data() } as EventData;
}

/**
 * イベントをリアルタイムで購読する（月単位）
 */
export function subscribeToEventsByMonth(
  year: number,
  month: number,
  callback: (events: EventData[], error?: Error) => void
): Unsubscribe {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EventData[];
      callback(events);
    },
    (error) => {
      console.error("[Firestore] onSnapshotエラー:", error);
      // エラー発生時は空配列とエラーオブジェクトを返す
      callback([], error);
    }
  );
}

// ─────────────────────────────────────────────
// 書き込み
// ─────────────────────────────────────────────

/**
 * Firestoreの書き込みにタイムアウトを設定するヘルパー
 * ※セキュリティルールの拒否やオフライン時にsetDocがハングする問題を防ぐ
 */
function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestoreへの書き込みが${ms / 1000}秒以内に完了しませんでした。ログイン状態やネットワーク接続を確認してください。`)), ms)
    ),
  ]);
}

/**
 * イベントを新規作成する
 */
export async function createEvent(
  data: Omit<EventWriteData, "createdAt" | "updatedAt">
): Promise<string> {
  const eventRef = doc(collection(db, EVENTS_COLLECTION));
  const now = Timestamp.now();
  await withTimeout(setDoc(eventRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
  }));
  return eventRef.id;
}

/**
 * イベントを更新する
 */
export async function updateEvent(
  id: string,
  data: Partial<EventWriteData>
): Promise<void> {
  const eventRef = doc(db, EVENTS_COLLECTION, id);
  await withTimeout(updateDoc(eventRef, {
    ...data,
    updatedAt: Timestamp.now(),
  }));
}

/**
 * イベントを削除する
 */
export async function deleteEvent(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, EVENTS_COLLECTION, id)));
}

/**
 * BookingConfig を初期化・更新する
 */
export async function updateBookingConfig(
  eventId: string,
  config: Partial<BookingConfig>
): Promise<void> {
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  await withTimeout(updateDoc(eventRef, {
    bookingConfig: config,
    updatedAt: Timestamp.now(),
  }));
}

/**
 * BookingConfig を初期設定する（練習登録時に呼ぶ）
 */
export async function initBookingConfig(
  eventId: string,
  defaults: { maxCapacity?: number; memberReservedSlots?: number; lightUnlockDelayDays?: number; visitorUnlockDelayDays?: number; officialTotalCount?: number }
): Promise<void> {
  const config: BookingConfig = {
    publishedAt: Timestamp.now(),
    lightUnlockDelayDays: defaults.lightUnlockDelayDays ?? 7,
    visitorUnlockDelayDays: defaults.visitorUnlockDelayDays ?? 14,
    officialTotalCount: defaults.officialTotalCount ?? 15,
    memberReservedSlots: defaults.memberReservedSlots ?? 2,
    lightUnlockedEarly: false,
    visitorUnlockedEarly: false,
  };
  await updateBookingConfig(eventId, config);
}

// ─────────────────────────────────────────────
// 初期データ投入（Seeding）
// ─────────────────────────────────────────────

/**
 * practiceSchedule.ts のデータをFirestoreに一括投入する
 * ※個別エラーハンドリングとバッチ処理で堅牢化
 */
export async function seedEventsFromSchedule(
  scheduleData: Record<string, Array<{
    id: number;
    title: string;
    type: string;
    time: string;
    location: string;
    description?: string;
    responsibleTeam?: string;
    attendees: number;
    total: number;
  }>>
): Promise<number> {
  const promises: Promise<void>[] = [];
  const entries: { dateKey: string; id: number }[] = [];

  for (const [dateKey, events] of Object.entries(scheduleData)) {
    // "2026-4-8" → "2026-04-08" に正規化
    const parts = dateKey.split("-");
    const normalizedDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;

    for (const evt of events) {
      const eventRef = doc(db, EVENTS_COLLECTION, `seed-${evt.id}`);
      const now = Timestamp.now();

      entries.push({ dateKey, id: evt.id });
      promises.push(
        setDoc(eventRef, {
          title: evt.title,
          type: evt.type,
          date: normalizedDate,
          time: evt.time,
          location: evt.location,
          description: evt.description || "",
          responsibleTeam: evt.responsibleTeam || "",
          maxCapacity: evt.total || 22,
          dutyMembers: [],
          createdAt: now,
          updatedAt: now,
        })
      );
    }
  }

  console.log(`[Seed] ${promises.length}件のイベントを送信中...`);
  const results = await Promise.allSettled(promises);

  let successCount = 0;
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      successCount++;
    } else {
      console.error(`[Seed] 失敗: ${entries[i].dateKey} (id=${entries[i].id})`, result.reason);
    }
  });

  console.log(`[Seed] 完了: ${successCount}/${promises.length}件 成功`);
  return successCount;
}
