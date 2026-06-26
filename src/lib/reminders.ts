import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// 催促メールの「承認待ちリクエスト」を管理する仕組み。
//   流れ:
//     1) 幹事（リスト作成者）が催促ボタンを押す → ここにリクエストを1件保存
//     2) 承認できる人（代表=admin／サポーター）の画面に「承認待ち」として出る
//     3) 承認 → 催促メールを送信してこのリクエストを削除
//        却下 → 送信せずにこのリクエストを削除
//   ※ 代表(admin)自身が催促する場合はこの仕組みを通さず、その場で送信する。
// ─────────────────────────────────────────────

const REMINDERS_COLLECTION = "reminderRequests";

export interface ReminderRequest {
  id: string;
  collectionId: string; // どの集金リストか
  collectionTitle: string; // 集金の名称（例: 納涼会費）
  memberId: string | number; // 催促する相手（未納の人）
  memberName: string;
  amount: number; // 請求額
  requestedBy: string; // 申請した幹事のUID
  requestedByName: string; // 申請した幹事の名前
  status: "pending"; // 承認待ち（承認・却下したら削除するので基本 pending のみ）
  createdAt: Timestamp;
}

/**
 * 催促の承認リクエストを新規作成する（幹事が催促ボタンを押したとき）
 */
export async function createReminderRequest(
  data: Omit<ReminderRequest, "id" | "status" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, REMINDERS_COLLECTION), {
    ...data,
    status: "pending",
    createdAt: Timestamp.now(),
  });
}

/**
 * 承認待ちのリクエストをリアルタイムに購読する（承認者=代表・サポーターの画面用）
 */
export function subscribeToPendingReminders(
  callback: (requests: ReminderRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, REMINDERS_COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ReminderRequest[];
    callback(requests);
  });
}

/**
 * リクエストを削除する（承認して送信したあと、または却下したあと）
 */
export async function removeReminderRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, REMINDERS_COLLECTION, id));
}
