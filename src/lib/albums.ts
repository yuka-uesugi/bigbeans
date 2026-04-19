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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";

export interface MediaItem {
  id: string;
  type: "photo" | "video";
  url: string;
  title: string;
  date: string; // YYYY/MM/DD
  author: string;
  tags: string[];
  createdAt?: Timestamp;
  storagePath: string; // 削除用にStorageのパスを記録
}

const ALBUMS_COLLECTION = "albums";

// Firestoreの書き込みにタイムアウトを設定するヘルパー
function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`処理が${ms / 1000}秒以内に完了しませんでした。`)), ms)
    ),
  ]);
}

/**
 * メディア一覧をリアルタイムで購読する
 */
export function subscribeToMedia(
  callback: (media: MediaItem[], error?: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, ALBUMS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const mediaList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MediaItem[];
      callback(mediaList);
    },
    (error) => {
      console.error("[Firestore] onSnapshotエラー:", error);
      callback([], error);
    }
  );
}

/**
 * ファイルをStorageにアップロードし、Firestoreにメタデータを保存する
 */
export async function uploadMedia(
  file: File,
  author: string,
  title: string,
  tags: string[] = []
): Promise<string> {
  // 1. Storageへのアップロード
  // 重複を避けるためタイムスタンプとランダム文字列をファイル名に付与
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
  const storagePath = `albums/${filename}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // ファイルタイプ（videoかphotoか簡易判定）
  const type = file.type.startsWith("video/") ? "video" : "photo";

  // 今日の日付フォーマット
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  // 2. Firestoreへメタデータを保存
  const docRef = doc(collection(db, ALBUMS_COLLECTION));
  await withTimeout(setDoc(docRef, {
    type,
    url,
    title: title || file.name,
    date: dateStr,
    author,
    tags,
    createdAt: Timestamp.now(),
    storagePath, // 削除用のパス
  }));

  return docRef.id;
}

/**
 * メディアをStorageおよびFirestore両方から削除する
 */
export async function deleteMedia(id: string, storagePath: string): Promise<void> {
  // 1. Storage から削除
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn("Storage 上のファイル削除に失敗しましたが、処理を継続します。", error);
  }

  // 2. Firestore から削除
  await withTimeout(deleteDoc(doc(db, ALBUMS_COLLECTION, id)));
}
