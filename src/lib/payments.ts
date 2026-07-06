import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAllMembers } from "./members";

export type PaymentStatus = "paid" | "unpaid" | "partial";

export interface MemberPaymentDetail {
  memberId: string | number;
  name: string;
  status: PaymentStatus;
  paidAmount: number;
  method: string | null; // "PayPay", "現金", "銀行振込" など
  date: string | null;
  targetAmount: number; // 請求金額（オフィシャルとライトで違う場合があるため保持）
  note?: string; // 備考（例: 先払い済み・一部のみ・後日まとめて など）
}

export interface PaymentCollectionEvent {
  id: string; // "2026-05-monthly" など
  title: string; // "2026年 5〜7月分月謝"
  type: "monthly" | "registration" | "other";
  payments: Record<string, MemberPaymentDetail>; // key は memberId
  createdBy?: string; // このリストを作った人（幹事）のログインUID。操作権限の判定に使う
  createdByName?: string; // 作った人の表示名（画面に「担当: ◯◯」と出すため）
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const PAYMENTS_COLLECTION = "paymentCollections";

/**
 * すべての集金イベントをリアルタイムに購読する
 */
export function subscribeToPaymentCollections(
  callback: (events: PaymentCollectionEvent[]) => void
): Unsubscribe {
  const q = query(collection(db, PAYMENTS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PaymentCollectionEvent[];
    callback(events);
  });
}

/**
 * 集金イベントを新規作成（またはリセット）し、名簿から対象者を抽出して支払いリストを初期化する
 */
export async function createPaymentCollection(
  id: string,
  title: string,
  type: "monthly" | "registration",
  amounts: { official: number; light: number } // 今回の集金での請求額設定
): Promise<void> {
  const docRef = doc(db, PAYMENTS_COLLECTION, id);
  const now = Timestamp.now();

  // 現在の名簿を取得
  const members = await getAllMembers();

  const payments: Record<string, MemberPaymentDetail> = {};

  members.forEach((member) => {
    const memberIdUrlSafe = String(member.id);
    const mType = member.membershipType || "official"; // デフォルトをオフィシャルとする

    // 【除外条件】
    // コーチやビジターは月謝・登録費の対象外
    if (mType === "coach" || mType === "visitor") return;

    // 月謝の場合は「オフィシャル」のみが対象
    if (type === "monthly" && mType !== "official") return;

    // 請求金額の決定
    const targetAmount = mType === "official" ? amounts.official : amounts.light;

    if (targetAmount > 0) {
      payments[memberIdUrlSafe] = {
        memberId: member.id,
        name: member.name,
        status: "unpaid",
        paidAmount: 0,
        method: null,
        date: null,
        targetAmount: targetAmount,
      };
    }
  });

  const eventData: Partial<PaymentCollectionEvent> = {
    title,
    type,
    payments,
    updatedAt: now,
  };

  // 既に存在する場合は上書き作成させないためにgetDocチェックすることもできるが、ここでは初期化ボタンとして動作させる
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    eventData.createdAt = now;
  }

  await setDoc(docRef, eventData, { merge: true });
}

/**
 * 集金イベントを新規作成 (手動でメンバーと金額を指定)
 */
export async function createManualPaymentCollection(
  id: string,
  title: string,
  type: "monthly" | "registration" | "other",
  selectedMembers: Array<{ memberId: string | number; name: string; amount: number }>,
  creator?: { uid: string; name: string } // このリストを作る人（幹事）。操作権限の判定に使う
): Promise<void> {
  const docRef = doc(db, PAYMENTS_COLLECTION, id);
  const now = Timestamp.now();

  const payments: Record<string, MemberPaymentDetail> = {};

  selectedMembers.forEach((m) => {
    const memberIdUrlSafe = String(m.memberId);
    payments[memberIdUrlSafe] = {
      memberId: m.memberId,
      name: m.name,
      status: "unpaid",
      paidAmount: 0,
      method: null,
      date: null,
      targetAmount: m.amount,
    };
  });

  const eventData: Partial<PaymentCollectionEvent> = {
    title,
    type,
    payments,
    updatedAt: now,
  };

  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    eventData.createdAt = now;
    // 担当者は新規作成のときだけ記録する（既存リストの担当者を上書きしない）
    if (creator) {
      eventData.createdBy = creator.uid;
      eventData.createdByName = creator.name;
    }
  }

  await setDoc(docRef, eventData, { merge: true });
}

/**
 * 特定メンバーの支払い状況を更新する
 */
export async function updateMemberPayment(
  collectionId: string,
  memberId: string | number,
  updateData: Partial<MemberPaymentDetail>
): Promise<void> {
  const docRef = doc(db, PAYMENTS_COLLECTION, collectionId);

  // ネストされたフィールドを更新するには "payments.MEMBER_ID.status" のようなドット記法を使う
  const updatePayload: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  for (const [key, value] of Object.entries(updateData)) {
    updatePayload[`payments.${memberId}.${key}`] = value;
  }

  await updateDoc(docRef, updatePayload);
}

/**
 * 既存の集金リストに対象メンバーを1人追加する
 */
export async function addMemberToCollection(
  collectionId: string,
  member: { memberId: string | number; name: string; amount: number }
): Promise<void> {
  const docRef = doc(db, PAYMENTS_COLLECTION, collectionId);
  const detail: MemberPaymentDetail = {
    memberId: member.memberId,
    name: member.name,
    status: "unpaid",
    paidAmount: 0,
    method: null,
    date: null,
    targetAmount: member.amount,
  };
  await updateDoc(docRef, {
    [`payments.${member.memberId}`]: detail,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 既存の集金リストから対象メンバーを1人外す
 */
export async function removeMemberFromCollection(
  collectionId: string,
  memberId: string | number
): Promise<void> {
  const docRef = doc(db, PAYMENTS_COLLECTION, collectionId);
  await updateDoc(docRef, {
    [`payments.${memberId}`]: deleteField(),
    updatedAt: Timestamp.now(),
  });
}

/**
 * 集金イベント自体を削除する
 */
export async function deletePaymentCollection(id: string): Promise<void> {
  const docRef = doc(db, PAYMENTS_COLLECTION, id);
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(docRef);
}
