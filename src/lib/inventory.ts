/**
 * 在庫管理のFirestore CRUDライブラリ
 * コレクション: inventory
 */
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  increment,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "inventory";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;           // 表示名（例: "ニューオフィシャル ＃３"）
  category: string;       // カテゴリ（例: "シャトル"）
  shuttleType: string;    // シャトル種類名（例: "ニューオフィシャル"）
  grade: string;          // 番手（例: "③", "④"）
  currentStock: number;   // 現在の在庫（ダース単位）
  unit: string;           // 単位（例: "ダース"）
  minStock: number;       // 最小在庫（アラート閾値）
  unitPrice: number;      // 割引単価（円/ダース）
  supplier: string;       // 仕入先
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export type InventoryWriteData = Omit<InventoryItem, "id">;

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
 * 全在庫アイテムをリアルタイム購読
 */
export function subscribeToInventory(
  callback: (items: InventoryItem[]) => void
): () => void {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const items: InventoryItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as InventoryItem[];
    
    // JS側で並び替え（種類順 -> 番手順）
    items.sort((a, b) => {
      if (a.shuttleType !== b.shuttleType) {
        return a.shuttleType.localeCompare(b.shuttleType, 'ja-JP');
      }
      return a.grade.localeCompare(b.grade, 'ja-JP');
    });

    callback(items);
  });
}

// ─────────────────────────────────────────────
// 書き込み
// ─────────────────────────────────────────────

/**
 * 在庫アイテムを新規作成
 */
export async function createInventoryItem(
  data: Omit<InventoryWriteData, "createdAt" | "updatedAt">
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
 * 在庫アイテムを更新
 */
export async function updateInventoryItem(
  id: string,
  data: Partial<Omit<InventoryWriteData, "createdAt" | "updatedAt">>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await withTimeout(updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
  }));
}

/**
 * 在庫数を増減する（increment使用）
 */
export async function adjustStock(
  id: string,
  delta: number
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await withTimeout(updateDoc(ref, {
    currentStock: increment(delta),
    updatedAt: Timestamp.now(),
  }));
}

/**
 * 在庫アイテムを削除
 */
export async function deleteInventoryItem(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, COLLECTION, id)));
}

// ─────────────────────────────────────────────
// 初期データ投入
// ─────────────────────────────────────────────

/**
 * 初期在庫データをFirestoreに投入（2026年4月8日時点）
 */
export async function seedInventoryData(): Promise<number> {
  const initialData = [
    // ニューオフィシャル
    { name: "ニューオフィシャル ＃３", category: "シャトル", shuttleType: "ニューオフィシャル", grade: "③", currentStock: 5, unit: "ダース", minStock: 3, unitPrice: 6930, supplier: "ラケットショップFUJI" },
    { name: "ニューオフィシャル ＃４", category: "シャトル", shuttleType: "ニューオフィシャル", grade: "④", currentStock: 2, unit: "ダース", minStock: 3, unitPrice: 6930, supplier: "ラケットショップFUJI" },
    // エアロ500
    { name: "エアロセンサ500 ＃３", category: "シャトル", shuttleType: "エアロ500", grade: "③", currentStock: 1, unit: "ダース", minStock: 2, unitPrice: 5148, supplier: "ラケットショップFUJI" },
    { name: "エアロセンサ500 ＃４", category: "シャトル", shuttleType: "エアロ500", grade: "④", currentStock: 2, unit: "ダース", minStock: 2, unitPrice: 5148, supplier: "ラケットショップFUJI" },
    // エアロ700
    { name: "エアロセンサ700 ＃３", category: "シャトル", shuttleType: "エアロ700", grade: "③", currentStock: 0, unit: "ダース", minStock: 2, unitPrice: 6336, supplier: "ラケットショップFUJI" },
    { name: "エアロセンサ700 ＃４", category: "シャトル", shuttleType: "エアロ700", grade: "④", currentStock: 0, unit: "ダース", minStock: 2, unitPrice: 6336, supplier: "ラケットショップFUJI" },
  ];

  const results = await Promise.allSettled(
    initialData.map((item) => createInventoryItem(item))
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  console.log(`在庫データ投入: ${successCount}/${initialData.length}件成功`);
  return successCount;
}
