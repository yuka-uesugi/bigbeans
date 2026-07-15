import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BookingConfig } from "./events";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

/** 予約者の種別 */
export type ReservationMemberType =
  | "official"          // 正会員
  | "light"             // ライト会員
  | "invited_official"  // 正会員が招待したビジター（正会員と同タイミングで解禁）
  | "invited_light"     // ライト会員が招待したビジター（ライトと同タイミングで解禁）
  | "visitor";          // 一般ビジター（10日後解禁）

/** 予約のステータス */
export type ReservationStatus = "confirmed" | "waitlisted" | "cancelled";

/** 解禁ステージ */
export type UnlockStage = "official_only" | "light_unlocked" | "visitor_unlocked";

/** 予約可否の結果 */
export type ReserveResult = "ok" | "waitlist" | "not_yet" | "full";

export interface ReservationData {
  id: string;
  uid: string;                    // Firebase Auth uid（メンバー）/ 自動ID（ビジター）
  name: string;
  memberType: ReservationMemberType;
  status: ReservationStatus;
  reservedAt: Timestamp;
  attendanceId?: string;          // 対応する出欠ドキュメントのID（統一エンジン経由の予約に付く）
  invitedBy?: string;             // 招待者名（invited_* のみ）
  rank?: "A" | "B" | "C";        // ビジターのランク
  ageGroup?: string;
  teamName?: string;
  comment?: string;
}

type ReservationWriteData = Omit<ReservationData, "id">;

const EVENTS_COLLECTION = "events";
const RESERVATIONS_SUBCOLLECTION = "reservations";

// ─────────────────────────────────────────────
// ロジック関数（副作用なし・テスト可能）
// ─────────────────────────────────────────────

/**
 * 現在の解禁ステージを返す
 *
 * - official_only  : カレンダー追加直後〜5日（正会員・invited_official のみ予約可）
 * - light_unlocked : 5日後 or 正会員全員回答済み（ライト・invited_light も解禁）
 * - visitor_unlocked: 10日後 or 正会員＋ライト全員回答済み（一般ビジターも解禁）
 *
 * lightAllAnswered: ライト会員全員が回答済みか（isLightAllAnswered で計算して渡す。
 * 省略時は false ＝ 日数経過または手動解禁のみでビジター解禁）
 */
export function getUnlockStage(
  config: BookingConfig,
  officialAnsweredCount: number,
  lightAllAnswered: boolean = false
): UnlockStage {
  const now = Date.now();
  const base = config.publishedAt.toMillis();
  const DAY_MS = 86_400_000;

  const allAnswered = officialAnsweredCount >= config.officialTotalCount;

  if (
    now >= base + config.visitorUnlockDelayDays * DAY_MS ||
    config.visitorUnlockedEarly ||
    (allAnswered && lightAllAnswered)
  ) {
    return "visitor_unlocked";
  }

  if (
    now >= base + config.lightUnlockDelayDays * DAY_MS ||
    allAnswered ||
    config.lightUnlockedEarly
  ) {
    return "light_unlocked";
  }

  return "official_only";
}

/**
 * 予約可否を判定する
 *
 * 正会員専用確保枠ロジック:
 *   - 正会員全員が回答するまで → ライト・ビジターは (maxCapacity - memberReservedSlots) 枠まで
 *   - 正会員全員回答後（lightUnlockedEarly=true）→ 全員 maxCapacity 枠まで
 *
 * 正会員・invited_official は常に maxCapacity 全枠を使える
 */
export function canReserve(
  memberType: ReservationMemberType,
  stage: UnlockStage,
  confirmedCount: number,
  maxCapacity: number,
  config: BookingConfig
): ReserveResult {
  // 解禁前チェック
  if (memberType === "light" || memberType === "invited_light") {
    if (stage === "official_only") return "not_yet";
  }
  if (memberType === "visitor") {
    if (stage !== "visitor_unlocked") return "not_yet";
  }

  // 有効定員の計算
  const isOfficialTier =
    memberType === "official" || memberType === "invited_official";
  const effectiveMax =
    isOfficialTier || config.lightUnlockedEarly
      ? maxCapacity
      : maxCapacity - config.memberReservedSlots;

  if (confirmedCount >= effectiveMax) return "waitlist";
  return "ok";
}

/**
 * 解禁状況の表示テキストを返す
 */
export function getUnlockStatusText(
  stage: UnlockStage,
  config: BookingConfig,
  officialAnsweredCount: number
): string {
  const remaining = config.officialTotalCount - officialAnsweredCount;

  if (stage === "visitor_unlocked") return "全員に開放中";
  if (stage === "light_unlocked") {
    if (config.lightUnlockedEarly) return "正会員全員回答済み → ライト会員解禁中";
    return "ライト会員解禁中（全員回答または期日でビジター解禁）";
  }
  return `正会員のみ予約可（未回答 ${remaining}名 → 回答完了でライト解禁）`;
}

// ─────────────────────────────────────────────
// Firestore CRUD
// ─────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Firestoreへの書き込みが${ms / 1000}秒以内に完了しませんでした。`)),
        ms
      )
    ),
  ]);
}

/** 予約一覧をリアルタイム購読 */
export function subscribeToReservations(
  eventId: string,
  callback: (reservations: ReservationData[]) => void
): Unsubscribe {
  const ref = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);
  const q = query(ref, orderBy("reservedAt", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReservationData[]);
    },
    // 読み取り権限が無い場合などは空リストとして扱う（クライアント全体を巻き込まない）
    () => callback([])
  );
}

/** 予約一覧を一度取得 */
export async function getReservations(eventId: string): Promise<ReservationData[]> {
  const ref = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);
  const snap = await getDocs(query(ref, orderBy("reservedAt", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReservationData[];
}




/** 予約を削除（管理者用） */
export async function deleteReservation(eventId: string, reservationId: string): Promise<void> {
  const ref = doc(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION, reservationId);
  await withTimeout(deleteDoc(ref));
}

/** 特定ユーザーの全予約を collectionGroup で取得 */
export async function getMyReservations(uid: string): Promise<(ReservationData & { eventId: string })[]> {
  const q = query(
    collectionGroup(db, RESERVATIONS_SUBCOLLECTION),
    where("uid", "==", uid),
    orderBy("reservedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const pathParts = d.ref.path.split("/");
    const eventId = pathParts[pathParts.length - 3];
    return { id: d.id, eventId, ...d.data() } as ReservationData & { eventId: string };
  });
}

/** 特定ユーザーの全予約をリアルタイム購読 */
export function subscribeToMyReservations(
  uid: string,
  callback: (reservations: (ReservationData & { eventId: string })[]) => void
): Unsubscribe {
  const q = query(
    collectionGroup(db, RESERVATIONS_SUBCOLLECTION),
    where("uid", "==", uid),
    orderBy("reservedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => {
      const pathParts = d.ref.path.split("/");
      const eventId = pathParts[pathParts.length - 3];
      return { id: d.id, eventId, ...d.data() } as ReservationData & { eventId: string };
    }));
  });
}

/**
 * 指定イベント群の中から、自分（uid）の予約だけをリアルタイム購読する。
 * collectionGroup を使わず、各イベントのサブコレクションを個別に購読するため
 * 横断インデックス（collectionGroup index）が不要で確実に動作する。
 */
export function subscribeToMyReservationsInEvents(
  eventIds: string[],
  uid: string,
  callback: (reservations: (ReservationData & { eventId: string })[]) => void
): Unsubscribe {
  if (eventIds.length === 0) {
    callback([]);
    return () => {};
  }
  // イベントごとの結果を保持し、いずれかが更新されるたびに全体を通知する
  const perEvent = new Map<string, (ReservationData & { eventId: string })[]>();
  const unsubscribes = eventIds.map((eventId) => {
    const q = query(
      collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION),
      where("uid", "==", uid)
    );
    return onSnapshot(q, (snap) => {
      perEvent.set(
        eventId,
        snap.docs.map(
          (d) => ({ id: d.id, eventId, ...d.data() } as ReservationData & { eventId: string })
        )
      );
      callback([...perEvent.values()].flat());
    });
  });
  return () => unsubscribes.forEach((u) => u());
}
