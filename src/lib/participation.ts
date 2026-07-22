import {
  collection,
  doc,
  getDocs,
  runTransaction,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BookingConfig } from "./events";
import {
  getUnlockStage,
  canReserve,
  type ReservationMemberType,
  type ReservationData,
  type ReservationStatus,
} from "./reservations";
import {
  setAttendance,
  deleteAttendance,
  type AttendanceData,
  type MembershipType,
} from "./attendances";

// ─────────────────────────────────────────────
// 参加登録の統一エンジン
//
// 参加の入口（カレンダーの参加ポチ・ダッシュボードの参加ボタン・ビジター登録）は
// すべてこのファイルの joinPractice / cancelParticipation を通す。
//
// 記録は2か所に書くが、役割を分ける:
//  - 出欠データ(attendances) … 「参加者の名簿」。人数表示・会計・参加メンバー一覧の正。
//  - 予約データ(reservations) … 「順番待ちの台帳」。解禁ルール・キャンセル待ちの管理用。
//
// 定員カウントは countOccupied（出欠＋予約の合算・重複除外）に一本化する。
// ─────────────────────────────────────────────

const EVENTS_COLLECTION = "events";
const RESERVATIONS_SUBCOLLECTION = "reservations";

/**
 * 出欠データの読み取り（未ログインのビジターは権限がなく読めないため、
 * 失敗したら空配列で続行する。その場合の定員判定は予約データのみで行う）
 */
async function safeGetAttendances(eventId: string): Promise<AttendanceData[]> {
  try {
    const snap = await getDocs(collection(db, EVENTS_COLLECTION, eventId, "attendances"));
    return snap.docs.map((d) => d.data()) as AttendanceData[];
  } catch {
    return [];
  }
}

/** "[V] 田中" → "田中" */
const stripV = (s: string) => s.replace(/^\[V\] /, "");

/** ビジター扱いの種別か（招待ビジター含む） */
const isVisitorTier = (t: ReservationMemberType) =>
  t === "visitor" || t === "invited_official" || t === "invited_light";

/** 出欠データに書く表示名（ビジターは "[V] " を付ける既存ルールを踏襲） */
const attendanceDisplayName = (name: string, memberType: ReservationMemberType) =>
  isVisitorTier(memberType) ? `[V] ${stripV(name)}` : stripV(name);

/** 予約種別 → 出欠スナップショットの会員種別 */
const toMembershipType = (t: ReservationMemberType): MembershipType =>
  t === "official" ? "official" : t === "light" ? "light" : "visitor";

/** この予約に対応する出欠データがあるか（ID → 名前の順で照合） */
export function reservationHasAttendance(
  r: Pick<ReservationData, "id" | "uid" | "name"> & { attendanceId?: string },
  attendances: Pick<AttendanceData, "memberId" | "name" | "status">[]
): boolean {
  return attendances.some(
    (a) =>
      a.status === "attend" &&
      (a.memberId === r.attendanceId ||
        a.memberId === r.id ||
        a.memberId === r.uid ||
        stripV(a.name) === stripV(r.name))
  );
}

/**
 * 埋まっている枠の数（＝定員バー・満員判定に使う唯一のカウント）。
 * 出欠の「参加」＋ 出欠にまだ載っていない確定予約 の合算。
 */
export function countOccupied(
  attendances: Pick<AttendanceData, "memberId" | "name" | "status">[],
  reservations: (Pick<ReservationData, "id" | "uid" | "name" | "status"> & {
    attendanceId?: string;
  })[]
): number {
  const attending = attendances.filter((a) => a.status === "attend").length;
  const reservationOnly = reservations.filter(
    (r) => r.status === "confirmed" && !reservationHasAttendance(r, attendances)
  ).length;
  return attending + reservationOnly;
}

export interface JoinPracticeInput {
  eventId: string;
  /** 出欠ドキュメントID（メンバー＝名簿ID、ビジター＝visitor-xxx などの一意ID） */
  attendanceId: string;
  /** 予約レコードの uid（ログインメンバー＝Auth uid、ビジター＝attendanceIdと同じでよい） */
  uid: string;
  /** 素の名前（"[V] " なし） */
  name: string;
  memberType: ReservationMemberType;
  /** 出欠スナップショット用（名簿上の種別。省略時は memberType から自動変換） */
  membershipType?: MembershipType;
  invitedBy?: string;
  rank?: "A" | "B" | "C";
  ageGroup?: string;
  teamName?: string;
  /** 出欠の「登録者」欄（代理登録者名など。省略時は本人名） */
  registeredBy?: string;
  /** 予約ルール一式（無い練習ではルールなしで出欠のみ記録） */
  config: BookingConfig | null | undefined;
  maxCapacity: number;
  /** 解禁ステージ判定用：正会員の回答数（参加/欠席） */
  officialAnsweredCount: number;
  /** 解禁ステージ判定用：ライト会員全員が回答済みか（isLightAllAnswered で計算。省略時 false） */
  lightAllAnswered?: boolean;
}

export type JoinPracticeResult = { status: Exclude<ReservationStatus, "cancelled"> };

/**
 * 参加登録の唯一の入口。
 *  - 解禁前 → エラー（メッセージ付き）
 *  - 空きあり → 予約(confirmed)＋出欠(attend) を記録
 *  - 満員 → 予約(waitlisted) のみ記録（キャンセル待ち）
 *  - すでに登録済みなら二重登録せず現在の状態を返す
 */
export async function joinPractice(input: JoinPracticeInput): Promise<JoinPracticeResult> {
  const {
    eventId, attendanceId, uid, name, memberType,
    invitedBy, rank, ageGroup, teamName, registeredBy,
    config, maxCapacity, officialAnsweredCount, lightAllAnswered,
  } = input;

  const displayName = attendanceDisplayName(name, memberType);
  const membershipType = input.membershipType ?? toMembershipType(memberType);

  // ルール未設定の練習：従来どおり出欠のみ記録
  if (!config) {
    await setAttendance(eventId, attendanceId, displayName, "attend", registeredBy ?? name, membershipType);
    return { status: "confirmed" };
  }

  const stage = getUnlockStage(config, officialAnsweredCount, lightAllAnswered ?? false);
  const reservationsRef = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);
  // 予約ドキュメントは「参加者(出欠ID)ごとに1つ」の固定IDにする。
  // 同じ人の登録が同時に何回走っても全員が同じドキュメントを取り合うため、
  // 構造的に重複が生まれない（連打・電波不良時の多重実行対策。2026-07-22に
  // 同一人物の予約が同時刻に5〜7件できる事故が実際に起きた）。
  const myDocRef = doc(reservationsRef, `r-${attendanceId}`);

  const status = await runTransaction(db, async (tx) => {
    // 固定IDのドキュメントはトランザクション読み取りで見る。
    // 並行するトランザクションはここで直列化され、2番目以降は既存分を検知できる。
    const mySnap = await tx.get(myDocRef);
    const [resSnap, attendances] = await Promise.all([
      getDocs(reservationsRef),
      safeGetAttendances(eventId),
    ]);
    const reservations = resSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReservationData[];

    // すでに有効な予約があれば二重登録しない（固定ID → 旧ランダムIDの順で確認）
    // ※ uid照合は会員本人の予約に限定する。旧データではビジター招待の予約に
    //   招待者のuidが入っており、招待者本人の参加登録と混同してしまうため。
    const myExisting = mySnap.exists()
      ? ({ id: mySnap.id, ...mySnap.data() } as ReservationData)
      : undefined;
    if (myExisting && myExisting.status !== "cancelled") {
      return myExisting.status as Exclude<ReservationStatus, "cancelled">;
    }
    const mine = reservations.find(
      (r) =>
        r.id !== myDocRef.id &&
        r.status !== "cancelled" &&
        (r.attendanceId === attendanceId ||
          (r.uid === uid && !isVisitorTier(r.memberType)))
    );
    if (mine) return mine.status as Exclude<ReservationStatus, "cancelled">;

    const occupied = countOccupied(attendances, reservations);
    const result = canReserve(memberType, stage, occupied, maxCapacity, config);

    if (result === "not_yet") {
      const label = memberType === "visitor" ? "ビジター" : "ライト会員";
      throw new Error(`まだ${label}の受付開始前です。解禁までお待ちください。`);
    }

    const newStatus: Exclude<ReservationStatus, "cancelled"> =
      result === "waitlist" ? "waitlisted" : "confirmed";

    tx.set(myDocRef, {
      uid,
      name: stripV(name),
      memberType,
      status: newStatus,
      reservedAt: Timestamp.now(),
      attendanceId,
      ...(invitedBy ? { invitedBy } : {}),
      ...(rank ? { rank } : {}),
      ...(ageGroup ? { ageGroup } : {}),
      ...(teamName ? { teamName } : {}),
    });

    return newStatus;
  });

  // 確定した人は参加者名簿（出欠）にも載せる
  if (status === "confirmed") {
    await setAttendance(eventId, attendanceId, displayName, "attend", registeredBy ?? name, membershipType);
  }

  return { status };
}

/**
 * 参加のキャンセル（予約＋出欠をまとめて処理し、キャンセル待ちがいれば自動繰り上げ）。
 *  - keepAttendance: true にすると出欠データは消さない
 *    （「欠席」への切り替え時など、呼び出し側が出欠を書き換えるケース用）
 */
export async function cancelParticipation(
  eventId: string,
  target: { reservationId?: string; attendanceId?: string; uid?: string },
  maxCapacity: number,
  config: BookingConfig | null | undefined,
  opts?: { keepAttendance?: boolean }
): Promise<{ cancelled: boolean; promotedName?: string }> {
  const reservationsRef = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);

  let promoted: (ReservationData & { attendanceId?: string }) | null = null;
  let cancelledReservation: (ReservationData & { attendanceId?: string }) | null = null;

  await runTransaction(db, async (tx) => {
    promoted = null;
    cancelledReservation = null;

    const snap = await getDocs(reservationsRef);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as (ReservationData & {
      attendanceId?: string;
    })[];

    const found = all.find(
      (r) =>
        r.status !== "cancelled" &&
        (r.id === target.reservationId ||
          (target.attendanceId !== undefined && r.attendanceId === target.attendanceId) ||
          // uid照合は会員本人の予約に限定（旧データのビジター招待予約を誤キャンセルしないため）
          (target.uid !== undefined && r.uid === target.uid && !isVisitorTier(r.memberType)))
    );
    if (!found) return;

    cancelledReservation = found;
    tx.update(doc(reservationsRef, found.id), { status: "cancelled" });

    // 確定枠が空いたらキャンセル待ちの先頭を繰り上げ
    if (found.status === "confirmed" && config) {
      const confirmedCount = all.filter((r) => r.status === "confirmed").length - 1;
      const effectiveMax = config.lightUnlockedEarly
        ? maxCapacity
        : maxCapacity - config.memberReservedSlots;

      if (confirmedCount < effectiveMax) {
        const waitlisted = all
          .filter((r) => r.status === "waitlisted")
          .sort((a, b) => a.reservedAt.toMillis() - b.reservedAt.toMillis());
        if (waitlisted.length > 0) {
          promoted = waitlisted[0];
          tx.update(doc(reservationsRef, promoted.id), { status: "confirmed" });
        }
      }
    }
  });

  // 出欠データの後始末（自分の分を消す）
  const cancelled = cancelledReservation as (ReservationData & { attendanceId?: string }) | null;
  if (!opts?.keepAttendance) {
    const attId = cancelled?.attendanceId ?? target.attendanceId;
    if (attId) await deleteAttendance(eventId, attId).catch(() => {});
    // 予約が見つからない（ルール導入前の登録など）場合も出欠だけは消す
    if (!cancelled && !attId && target.uid) {
      await deleteAttendance(eventId, target.uid).catch(() => {});
    }
  }

  // 繰り上がった人を参加者名簿（出欠）に載せる
  const p = promoted as (ReservationData & { attendanceId?: string }) | null;
  if (p) {
    await setAttendance(
      eventId,
      p.attendanceId ?? p.id,
      attendanceDisplayName(p.name, p.memberType),
      "attend",
      "キャンセル待ちから自動繰り上げ",
      toMembershipType(p.memberType)
    ).catch(() => {});
  }

  return { cancelled: !!cancelled, promotedName: p ? p.name : undefined };
}

/**
 * 早期解禁後などに、空き枠分のキャンセル待ちをまとめて繰り上げる
 * （繰り上げた人は出欠にも記録する）
 */
export async function promoteWaitlisted(
  eventId: string,
  maxCapacity: number
): Promise<number> {
  const reservationsRef = collection(db, EVENTS_COLLECTION, eventId, RESERVATIONS_SUBCOLLECTION);

  const [resSnap, attendances] = await Promise.all([
    getDocs(reservationsRef),
    safeGetAttendances(eventId),
  ]);
  const all = resSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as (ReservationData & {
    attendanceId?: string;
  })[];

  const availableSlots = maxCapacity - countOccupied(attendances, all);
  if (availableSlots <= 0) return 0;

  const waitlisted = all
    .filter((r) => r.status === "waitlisted")
    .sort((a, b) => a.reservedAt.toMillis() - b.reservedAt.toMillis())
    .slice(0, availableSlots);

  let promotedCount = 0;
  for (const r of waitlisted) {
    await updateDoc(doc(reservationsRef, r.id), { status: "confirmed" });
    await setAttendance(
      eventId,
      r.attendanceId ?? r.id,
      attendanceDisplayName(r.name, r.memberType),
      "attend",
      "キャンセル待ちから自動繰り上げ",
      toMembershipType(r.memberType)
    ).catch(() => {});
    promotedCount++;
  }

  return promotedCount;
}
