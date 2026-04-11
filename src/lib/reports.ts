import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Report {
  id?: string;
  title: string;
  date: string;
  type: string;
  content: string;
  authorId: string;
  authorName: string;
  tags: string[];
  status: "draft" | "published";
  createdAt?: any;
  updatedAt?: any;
}

const REPORTS_COLLECTION = "reports";

/**
 * レポート一覧をリアルタイムで取得する（更新日時の降順）
 */
export function subscribeToReports(callback: (reports: Report[]) => void) {
  const q = query(
    collection(db, REPORTS_COLLECTION),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Report[];
    callback(reports);
  });
}

/**
 * 新規レポートを作成する
 */
export async function createReport(data: Omit<Report, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * レポートを更新する
 */
export async function updateReport(id: string, data: Partial<Omit<Report, "id" | "createdAt">>): Promise<void> {
  if (!id) throw new Error("IDが指定されていません");
  const docRef = doc(db, REPORTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * レポートを削除する
 */
export async function deleteReport(id: string): Promise<void> {
  if (!id) throw new Error("IDが指定されていません");
  const docRef = doc(db, REPORTS_COLLECTION, id);
  await deleteDoc(docRef);
}
