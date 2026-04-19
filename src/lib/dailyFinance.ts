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
} from "firebase/firestore";
import { db } from "./firebase";
import { updateAttendance } from "./attendances";

// イベントごとの経費データモデル
export interface EventExpense {
  id: string;        // ex: "exp-timestamp"
  eventId: string;   // 紐づく練習イベントID
  title: string;     // 「渡辺 亜衣 コーチ料」や「シャトル代」
  amount: number;    // 金額
  type: "coach" | "other"; // 種別
  createdAt: string; // ISO文字など
}

const EXPENSES_COLLECTION = "eventExpenses";

/**
 * 特定イベントに関連する経費の一覧をリアルタイム取得
 */
export function subscribeToEventExpenses(
  eventId: string,
  callback: (expenses: EventExpense[]) => void
) {
  const q = query(
    collection(db, EXPENSES_COLLECTION),
    where("eventId", "==", eventId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const exps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EventExpense[];
    callback(exps);
  });
}

/**
 * 経費を新規追加する
 */
export async function addEventExpense(
  eventId: string,
  title: string,
  amount: number,
  type: "coach" | "other" = "other"
): Promise<string> {
  const expenseId = `exp-${Date.now()}`;
  const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
  const now = new Date().toISOString();
  
  await setDoc(expenseRef, {
    eventId,
    title,
    amount,
    type,
    createdAt: now,
  });
  
  return expenseId;
}

/**
 * 経費を削除する
 */
export async function deleteEventExpense(expenseId: string): Promise<void> {
  const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
  await deleteDoc(expenseRef);
}

/**
 * 参加者の回収ステータス (isPaid) をトグル更新する
 * 内部的には attendances コレクションの isPaid フィールドを更新する
 */
export async function toggleAttendancePayment(eventId: string, memberId: string | number, currentIsPaid: boolean): Promise<void> {
  await updateAttendance(eventId, memberId, { isPaid: !currentIsPaid });
}
