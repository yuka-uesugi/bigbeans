import {
  collection,
  doc,
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
import { BOOKING_SCHEDULE_RULES } from "@/data/rulesData";

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
  label: string;
  url: string;
  fileType?: "pdf" | "image" | "url";
  storagePath?: string;
}

export interface EventData {
  id: string;
  title: string;
  type: "practice" | "match" | "event" | "deadline";
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
 */
export async function getNextPractice(): Promise<EventData | null> {
  const practices = await getUpcomingPractices(1);
  return practices[0] ?? null;
}

/**
 * 直近の練習イベントを複数件取得する
 */
export async function getUpcomingPractices(limit: number = 5): Promise<EventData[]> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("date", ">=", todayStr),
    orderBy("date", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as EventData)
    .filter((e) => e.type === "practice")
    .slice(0, limit);
}

/**
 * 単一イベントをリアルタイムで購読する
 */
export function subscribeToEvent(
  eventId: string,
  callback: (event: EventData | null) => void
): Unsubscribe {
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as EventData);
    } else {
      callback(null);
    }
  });
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
 *
 * publishedAt（正会員の解禁時刻）は「カレンダーに追加した瞬間」。
 * 会場抽選の結果が出るタイミングが会場ごとに違うため、
 * 練習日からの逆算ではなく追加時点を起点にする。
 */
export async function initBookingConfig(
  eventId: string,
  defaults: {
    maxCapacity?: number;
    memberReservedSlots?: number;
    lightUnlockDelayDays?: number;
    visitorUnlockDelayDays?: number;
    officialTotalCount?: number;
  }
): Promise<void> {
  const config: BookingConfig = {
    publishedAt: Timestamp.now(),
    lightUnlockDelayDays: defaults.lightUnlockDelayDays ?? BOOKING_SCHEDULE_RULES.lightDelayDays,
    visitorUnlockDelayDays: defaults.visitorUnlockDelayDays ?? BOOKING_SCHEDULE_RULES.visitorDelayDays,
    officialTotalCount: defaults.officialTotalCount ?? 15,
    memberReservedSlots: defaults.memberReservedSlots ?? 2,
    lightUnlockedEarly: false,
    visitorUnlockedEarly: false,
  };
  await updateBookingConfig(eventId, config);
}

/**
 * 旧ルールのままの「今日以降の予定」を現行の解禁ルールに合わせて一括更新する。
 *
 * 対象と変更内容（緩める方向にしか変えない）:
 * - 解禁起点（publishedAt）が未来の日付（旧「練習日の2ヶ月前」自動計算の名残）→ 今すぐに変更
 * - ライト解禁 7日（旧既定値）→ 現行ルールの日数
 * - ビジター解禁 14日（旧既定値）→ 現行ルールの日数
 * 管理者が個別に設定したそれ以外の値には触らない。
 *
 * @returns 更新した件数
 */
export async function applyCurrentBookingRuleToFutureEvents(): Promise<number> {
  const events = await getAllEvents();
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = Timestamp.now();

  let updated = 0;
  for (const ev of events) {
    const bc = ev.bookingConfig;
    if (!bc || ev.date < todayStr) continue;

    const next: BookingConfig = { ...bc };
    let changed = false;

    if (bc.publishedAt && bc.publishedAt.toMillis() > now.toMillis()) {
      next.publishedAt = now;
      changed = true;
    }
    if (bc.lightUnlockDelayDays === 7) {
      next.lightUnlockDelayDays = BOOKING_SCHEDULE_RULES.lightDelayDays;
      changed = true;
    }
    if (bc.visitorUnlockDelayDays === 14) {
      next.visitorUnlockDelayDays = BOOKING_SCHEDULE_RULES.visitorDelayDays;
      changed = true;
    }

    if (changed) {
      await updateBookingConfig(ev.id, next);
      updated++;
    }
  }
  return updated;
}

/**
 * 現行ルールに合っていない「今日以降の予定」の件数を数える（点検用・書き込みなし）。
 */
export function countOutdatedBookingConfigs(events: EventData[]): number {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const nowMs = Date.now();
  return events.filter((ev) => {
    const bc = ev.bookingConfig;
    if (!bc || ev.date < todayStr) return false;
    return (
      (bc.publishedAt && bc.publishedAt.toMillis() > nowMs) ||
      bc.lightUnlockDelayDays === 7 ||
      bc.visitorUnlockDelayDays === 14
    );
  }).length;
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
    id: number | string;
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
  const entries: { dateKey: string; id: number | string }[] = [];

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
