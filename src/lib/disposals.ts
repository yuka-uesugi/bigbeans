/**
 * 中古シャトル処分記録のFirestore CRUDライブラリ
 * コレクション: disposals
 */
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "disposals";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export interface DisposalEntry {
  name: string;       // 引取人名
  quantity: number;   // 個数
}

export interface DisposalRecord {
  id: string;
  date: string;                       // "2026-02-04" 形式
  type: "寄付" | "買取";
  entries: DisposalEntry[];           // 1回の処分で複数人対応
  totalQuantity: number;              // 合計個数
  totalPrice: number;                 // 合計金額（買取: 1個10円、寄付: 0円）
  note: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type DisposalWriteData = Omit<DisposalRecord, "id">;

// ─────────────────────────────────────────────
// タイムアウトヘルパー
// ─────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestoreへの書き込みが${ms / 1000}秒以内に完了しませんでした。`)), ms)
    ),
  ]);
}

// ─────────────────────────────────────────────
// 読み取り
// ─────────────────────────────────────────────

/**
 * 処分記録をリアルタイム購読（新しい順）
 */
export function subscribeToDisposals(
  callback: (records: DisposalRecord[]) => void
): () => void {
  const q = query(collection(db, COLLECTION), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const records: DisposalRecord[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as DisposalRecord[];
    callback(records);
  });
}

// ─────────────────────────────────────────────
// 書き込み
// ─────────────────────────────────────────────

/**
 * 処分記録を新規作成
 */
export async function createDisposal(
  data: Omit<DisposalWriteData, "createdAt" | "updatedAt">
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const now = Timestamp.now();
  await withTimeout(setDoc(ref, {
    ...data,
    createdAt: now,
    updatedAt: now,
  }));
  return ref.id;
}

/**
 * 処分記録を削除
 */
export async function deleteDisposal(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, COLLECTION, id)));
}

// ─────────────────────────────────────────────
// 初期データ投入
// ─────────────────────────────────────────────

/**
 * 初期処分データをFirestoreに投入
 */
export async function seedDisposalData(): Promise<number> {
  const initialData: Omit<DisposalWriteData, "createdAt" | "updatedAt">[] = [
    {
      date: "2026-02-04",
      type: "寄付",
      entries: [
        { name: "播川", quantity: 60 },
        { name: "上杉", quantity: 60 },
      ],
      totalQuantity: 120,
      totalPrice: 0,
      note: "",
    },
    {
      date: "2026-02-04",
      type: "買取",
      entries: [
        { name: "富岡", quantity: 40 },
      ],
      totalQuantity: 40,
      totalPrice: 400,
      note: "1個10円で買取",
    },
    {
      date: "2026-03-25",
      type: "寄付",
      entries: [
        { name: "黒岩", quantity: 20 },
        { name: "石井", quantity: 20 },
        { name: "播川", quantity: 20 },
      ],
      totalQuantity: 60,
      totalPrice: 0,
      note: "",
    },
  ];

  const results = await Promise.allSettled(
    initialData.map((item) => createDisposal(item))
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  console.log(`処分データ投入: ${successCount}/${initialData.length}件成功`);
  return successCount;
}
