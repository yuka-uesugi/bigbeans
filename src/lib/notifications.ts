import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export interface NotificationData {
  id: string;
  type: "reply";
  suggestionId: string;
  suggestionTitle: string;
  replyAuthor: string;
  replyBody: string;
  createdAt: Timestamp;
  read: boolean;
}

const ROOT = "notifications";

export function subscribeToNotifications(
  uid: string,
  callback: (notifs: NotificationData[]) => void
): Unsubscribe {
  const q = query(
    collection(db, ROOT, uid, "items"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NotificationData[]),
    () => callback([])
  );
}

export async function createReplyNotification(
  targetUid: string,
  data: {
    suggestionId: string;
    suggestionTitle: string;
    replyAuthor: string;
    replyBody: string;
  }
): Promise<void> {
  const docRef = doc(collection(db, ROOT, targetUid, "items"));
  await setDoc(docRef, { ...data, type: "reply", createdAt: Timestamp.now(), read: false });
}

export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  await updateDoc(doc(db, ROOT, uid, "items", notifId), { read: true });
}

export async function markAllRead(uid: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => markNotificationRead(uid, id)));
}
