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
  author: string;
  date: string;
  isPinned: boolean;
  type: AnnouncementType;
  attachments?: Attachment[];
  createdAt?: Timestamp;
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

  await withTimeout(setDoc(docRef, {
    ...data,
    attachments,
    createdAt: Timestamp.now(),
  }));
  return docRef.id;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id)));
}
