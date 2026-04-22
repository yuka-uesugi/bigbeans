import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  arrayUnion,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ReplyData {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface SuggestionData {
  id: string;
  category: "question" | "suggestion" | "request" | "other";
  title: string;
  body: string;
  author: string;
  authorUid?: string;
  date: string;
  isAnonymous: boolean;
  replies: ReplyData[] | number; // 互換性のためnumberも許容
  resolved: boolean;
  createdAt?: Timestamp;
}

type SuggestionWriteData = Omit<SuggestionData, "id">;

const SUGGESTIONS_COLLECTION = "suggestions";

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
 * 質問・意見をリアルタイムで購読する
 */
export function subscribeToSuggestions(
  callback: (suggestions: SuggestionData[], error?: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, SUGGESTIONS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const suggestions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SuggestionData[];
      callback(suggestions);
    },
    (error) => {
      console.error("[Firestore] onSnapshotエラー:", error);
      callback([], error);
    }
  );
}

/**
 * 質問・意見を新規作成する
 */
export async function createSuggestion(
  data: Omit<SuggestionWriteData, "createdAt">
): Promise<string> {
  const docRef = doc(collection(db, SUGGESTIONS_COLLECTION));
  await withTimeout(setDoc(docRef, {
    ...data,
    createdAt: Timestamp.now(),
  }));
  return docRef.id;
}

/**
 * 質問・意見に返信を追加する
 */
export async function addReply(
  suggestionId: string,
  replyId: string,
  author: string,
  body: string,
  dateStr: string
): Promise<void> {
  const docRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);
  const reply: ReplyData = {
    id: replyId,
    author,
    body,
    createdAt: dateStr,
  };
  await withTimeout(updateDoc(docRef, {
    replies: arrayUnion(reply)
  }));
}

/**
 * 質問・意見を削除する
 */
export async function deleteSuggestion(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, SUGGESTIONS_COLLECTION, id)));
}
