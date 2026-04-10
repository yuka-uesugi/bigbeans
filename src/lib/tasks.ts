/**
 * タスク管理のFirestore CRUDライブラリ
 * コレクション: tasks
 */
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "tasks";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export type TaskStatus = "todo" | "doing" | "done";
export type TaskCategory = "運営" | "会計" | "大会" | "施設" | "その他";
export type TaskPriority = "high" | "medium" | "low";

export interface TaskData {
  id: string;
  title: string;
  assignees: string[];
  deadline: string;
  status: TaskStatus;
  category: TaskCategory;
  note: string;
  priority: TaskPriority;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TaskWriteData = Omit<TaskData, "id">;

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
 * 全タスクをリアルタイム購読
 */
export function subscribeToTasks(
  callback: (tasks: TaskData[]) => void
): () => void {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const tasks: TaskData[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as TaskData[];
    callback(tasks);
  });
}

// ─────────────────────────────────────────────
// 書き込み
// ─────────────────────────────────────────────

/**
 * タスクを新規作成
 */
export async function createTask(
  data: Omit<TaskWriteData, "createdAt" | "updatedAt">
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
 * タスクを更新（ステータス変更含む）
 */
export async function updateTask(
  id: string,
  data: Partial<Omit<TaskWriteData, "createdAt" | "updatedAt">>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await withTimeout(updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
  }));
}

/**
 * タスクを削除
 */
export async function deleteTask(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, COLLECTION, id)));
}

// ─────────────────────────────────────────────
// 初期データ投入
// ─────────────────────────────────────────────

/**
 * 初期タスクデータをFirestoreに投入
 */
export async function seedTaskData(): Promise<number> {
  const initialTasks: Omit<TaskWriteData, "createdAt" | "updatedAt">[] = [
    { title: "4月の練習場所予約確認", assignees: ["上杉", "田中"], deadline: "2026-04-01", status: "done", category: "施設", note: "さくらBADO・BB・トリプルスに確認済み", priority: "high" },
    { title: "新年度会費の振込案内を送る", assignees: ["上杉"], deadline: "2026-04-10", status: "doing", category: "会計", note: "LINEグループで案内する", priority: "high" },
    { title: "大会申込書の作成", assignees: ["佐藤", "鈴木"], deadline: "2026-04-20", status: "todo", category: "大会", note: "春季市民大会エントリー締切4/20", priority: "medium" },
    { title: "ユニフォームデザイン案の収集", assignees: ["田中"], deadline: "2026-05-01", status: "todo", category: "運営", note: "希望者にアンケートをとる", priority: "low" },
    { title: "5月練習場所の仮押さえ", assignees: ["上杉"], deadline: "2026-04-15", status: "todo", category: "施設", note: "中川西・北山田を確認", priority: "high" },
  ];

  const results = await Promise.allSettled(
    initialTasks.map((task) => createTask(task))
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  console.log(`タスクデータ投入: ${successCount}/${initialTasks.length}件成功`);
  return successCount;
}
