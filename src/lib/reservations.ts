import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
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
  | "visitor";          // 一般ビジター（2週間後解禁）

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
 * - official_only  : 公開直後〜1週間（正会員・invited_official のみ予約可）
 * - light_unlocked : 1週間後 or 正会員全員回答済み（ライト・invited_light も解禁）
 * - visitor_unlocked: 2週間後（一般ビジターも解禁）
 */
export function getUnlockStage(
  config: BookingConfig,
  officialAnsweredCount: number
): UnlockStage {
  const now = Date.now();
  const base = config.publishedAt.toMillis();
  const DAY_MS = 86_400_000;

  const allAnswered = officialAnsweredCount >= config.officialTotalCount;

  if (
    now >= base + config.visitorUnlockDelayDays * DAY_MS ||
    config.visitorUnlockedEarly
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
    return "ライト会員解禁中（2週間後にビジター解禁）";
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
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReservationData[]);
  });
}

/** 予約一覧を一度取得 */
export async function getReservations(eventId: string): Promise<ReservationData[]> {
  const ref = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);
  const snap = await getDocs(query(ref, orderBy("reservedAt", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReservationData[];
}

/**
 * 予約を作成する（トランザクション、定員チェック付き）
 * - ok        → confirmed で作成
 * - waitlist  → waitlisted で作成
 * - not_yet   → エラー（解禁前）
 */
export async function createReservation(
  eventId: string,
  data: Omit<ReservationWriteData, "reservedAt" | "status">,
  stage: UnlockStage,
  maxCapacity: number,
  config: BookingConfig
): Promise<{ status: ReservationStatus; id: string }> {
  const reservationsRef = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);
  const newDocRef = doc(reservationsRef);

  const result = await withTimeout(
    runTransaction(db, async (tx) => {
      // 最新の confirmed 数を取得
      const snap = await getDocs(reservationsRef);
      const existing = snap.docs.map((d) => d.data()) as ReservationWriteData[];
      const confirmedCount = existing.filter((r) => r.status === "confirmed").length;

      const reserveResult = canReserve(
        data.memberType,
        stage,
        confirmedCount,
        maxCapacity,
        config
      );

      if (reserveResult === "not_yet") {
        throw new Error("まだ予約解禁前です");
      }

      const status: ReservationStatus =
        reserveResult === "waitlist" ? "waitlisted" : "confirmed";

      tx.set(newDocRef, {
        ...data,
        status,
        reservedAt: Timestamp.now(),
      });

      return status;
    })
  );

  return { status: result, id: newDocRef.id };
}

/**
 * 予約をキャンセルする。
 * キャンセル後、キャンセル待ちがいれば1名を自動で confirmed に昇格させる
 */
export async function cancelReservation(
  eventId: string,
  reservationId: string,
  maxCapacity: number,
  config: BookingConfig
): Promise<void> {
  const reservationsRef = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);
  const cancelRef = doc(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION, reservationId);

  await withTimeout(
    runTransaction(db, async (tx) => {
      const snap = await getDocs(reservationsRef);
      const all = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as ReservationWriteData),
      })) as ReservationData[];

      // キャンセル対象
      const target = all.find((r) => r.id === reservationId);
      if (!target) throw new Error("予約が見つかりません");

      tx.update(cancelRef, { status: "cancelled" });

      // キャンセル待ちで最も早い人を昇格
      if (target.status === "confirmed") {
        const confirmedCount = all.filter((r) => r.status === "confirmed").length - 1;
        const effectiveMax = config.lightUnlockedEarly ? maxCapacity : maxCapacity - config.memberReservedSlots;

        if (confirmedCount < effectiveMax) {
          const waitlisted = all
            .filter((r) => r.status === "waitlisted")
            .sort((a, b) => a.reservedAt.toMillis() - b.reservedAt.toMillis());

          if (waitlisted.length > 0) {
            const promoteRef = doc(
              db,
              EVENTS_COLLECTION,
              eventId,
              RESERVATIONS_SUBCOLLECTION,
              waitlisted[0].id
            );
            tx.update(promoteRef, { status: "confirmed" });
          }
        }
      }
    })
  );
}

/**
 * 正会員全員回答により早期解禁された後、
 * waitlisted のキャンセル待ち者を空き枠分 confirmed に昇格させる
 */
export async function promoteWaitlistedAfterUnlock(
  eventId: string,
  maxCapacity: number
): Promise<number> {
  const reservationsRef = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);
  const snap = await getDocs(reservationsRef);
  const all = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as ReservationWriteData),
  })) as ReservationData[];

  const confirmedCount = all.filter((r) => r.status === "confirmed").length;
  const availableSlots = maxCapacity - confirmedCount;
  if (availableSlots <= 0) return 0;

  const waitlisted = all
    .filter((r) => r.status === "waitlisted")
    .sort((a, b) => a.reservedAt.toMillis() - b.reservedAt.toMillis())
    .slice(0, availableSlots);

  let promoted = 0;
  for (const r of waitlisted) {
    const ref = doc(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION, r.id);
    await updateDoc(ref, { status: "confirmed" });
    promoted++;
  }

  return promoted;
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
