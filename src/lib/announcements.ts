import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

export type AnnouncementType = "info" | "normal" | "match_result" | "match_info" | "report" | "minutes";

export interface Attachment {
  url: string;
  name: string;
  fileType: "image" | "pdf";
}

export interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  author: string;        // 投稿者の表示名
  authorUid?: string;    // 投稿者のuid（本人判定用。過去の投稿には無い）
  date: string;
  isPinned: boolean;
  type: AnnouncementType;
  attachments?: Attachment[];
  createdAt?: Timestamp;
  // 関連するカレンダー予定（相互リンク用・任意）
  relatedEventId?: string;
  relatedEventTitle?: string;
  relatedEventDate?: string; // "2026-07-27" 形式
}

type AnnouncementWriteData = Omit<AnnouncementData, "id">;

const ANNOUNCEMENTS_COLLECTION = "announcements";

function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestoreへの書き込みが${ms / 1000}秒以内に完了しませんでした。`)), ms)
    ),
  ]);
}

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
      const announcements = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AnnouncementData[];
      callback(announcements);
    },
    (error) => {
      console.error("[Firestore] onSnapshotエラー:", error);
      callback([], error);
    }
  );
}

export async function uploadAttachments(files: File[], announcementId: string): Promise<Attachment[]> {
  return Promise.all(
    files.map(async (file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const fileType: "image" | "pdf" = ext === "pdf" ? "pdf" : "image";
      const path = `announcements/${announcementId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return { url, name: file.name, fileType };
    })
  );
}

export async function createAnnouncement(
  data: Omit<AnnouncementWriteData, "createdAt" | "attachments">,
  files: File[] = []
): Promise<string> {
  const docRef = doc(collection(db, ANNOUNCEMENTS_COLLECTION));

  const attachments: Attachment[] = files.length > 0
    ? await uploadAttachments(files, docRef.id)
    : [];

  // 関連予定は指定があるときだけ保存する（undefined を書くと Firestore に拒否されるため除外）
  const { relatedEventId, relatedEventTitle, relatedEventDate, ...rest } = data;

  await withTimeout(setDoc(docRef, {
    ...rest,
    attachments,
    ...(relatedEventId
      ? { relatedEventId, relatedEventTitle: relatedEventTitle ?? "", relatedEventDate: relatedEventDate ?? "" }
      : {}),
    createdAt: Timestamp.now(),
  }));
  return docRef.id;
}

export async function updateAnnouncement(
  id: string,
  data: {
    title: string;
    body: string;
    type: AnnouncementType;
    isPinned: boolean;
    relatedEventId?: string;
    relatedEventTitle?: string;
    relatedEventDate?: string;
  },
  existingAttachments: Attachment[] = [],
  newFiles: File[] = []
): Promise<void> {
  // 追加ファイルがあればアップロードし、既存の添付にあとから足す（追記用途）
  const uploaded: Attachment[] = newFiles.length > 0 ? await uploadAttachments(newFiles, id) : [];
  const attachments = [...existingAttachments, ...uploaded];

  const { relatedEventId, relatedEventTitle, relatedEventDate } = data;

  await withTimeout(updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), {
    title: data.title,
    body: data.body,
    type: data.type,
    isPinned: data.isPinned,
    attachments,
    // 関連予定：指定があれば保存、無ければフィールドごと削除する
    ...(relatedEventId
      ? { relatedEventId, relatedEventTitle: relatedEventTitle ?? "", relatedEventDate: relatedEventDate ?? "" }
      : { relatedEventId: deleteField(), relatedEventTitle: deleteField(), relatedEventDate: deleteField() }),
  }));
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id)));
}
