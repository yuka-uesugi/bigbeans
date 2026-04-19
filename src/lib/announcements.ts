import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  author: string;
  date: string;
  isPinned: boolean;
  type: "caution" | "info" | "normal";
  createdAt?: Timestamp;
}

type AnnouncementWriteData = Omit<AnnouncementData, "id">;

const ANNOUNCEMENTS_COLLECTION = "announcements";

// Firestoreの書き込みにタイムアウトを設定するヘルパー
function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestoreへの書き込みが${ms / 1000}秒以内に完了しませんでした。`)), ms)
    ),
  ]);
}

/**
 * お知らせをリアルタイムで購読する
 */
export function subscribeToAnnouncements(
  callback: (announcements: AnnouncementData[], error?: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, ANNOUNCEMENTS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const announcements = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AnnouncementData[];
      callback(announcements);
    },
    (error) => {
      console.error("[Firestore] onSnapshotエラー:", error);
      callback([], error);
    }
  );
}

/**
 * お知らせを新規作成する
 */
export async function createAnnouncement(
  data: Omit<AnnouncementWriteData, "createdAt">
): Promise<string> {
  const docRef = doc(collection(db, ANNOUNCEMENTS_COLLECTION));
  await withTimeout(setDoc(docRef, {
    ...data,
    createdAt: Timestamp.now(),
  }));
  return docRef.id;
}

/**
 * お知らせを削除する
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id)));
}
