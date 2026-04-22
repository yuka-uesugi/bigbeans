import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export type TransactionType = "income" | "expense";
export type PaymentMethod = "現金" | "PayPay" | "銀行振込" | "その他";

export interface TransactionEntry {
  id: string;
  date: string;           // "2026-04-08"
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  enteredBy: string;
  method: PaymentMethod;
  createdAt: Timestamp;
}

type TransactionWrite = Omit<TransactionEntry, "id">;

const TRANSACTIONS_COLLECTION = "transactions";

/** 指定月の取引一覧をリアルタイム購読 */
export function subscribeToTransactionsByMonth(
  year: number,
  month: number,
  callback: (entries: TransactionEntry[]) => void
): Unsubscribe {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end   = `${year}-${String(month).padStart(2, "0")}-31`;
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("date", ">=", start),
    where("date", "<=", end),
    orderBy("date", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TransactionEntry[]);
  });
}

/** 指定年度（4月〜翌3月）の取引一覧をリアルタイム購読 */
export function subscribeToTransactionsByFiscalYear(
  fiscalYear: number,  // 2025 → 2025年4月〜2026年3月
  callback: (entries: TransactionEntry[]) => void
): Unsubscribe {
  const start = `${fiscalYear}-04-01`;
  const end   = `${fiscalYear + 1}-03-31`;
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("date", ">=", start),
    where("date", "<=", end),
    orderBy("date", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TransactionEntry[]);
  });
}

/** 取引を追加する */
export async function addTransaction(
  data: Omit<TransactionWrite, "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/** 取引を削除する */
export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
}
