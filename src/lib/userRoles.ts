import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export type AppRole = "admin" | "member" | "pending";

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  createdAt: Timestamp;
}

const USERS_COLLECTION = "users";

export async function getUserRole(uid: string): Promise<AppRole | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return (snap.data() as UserRecord).role ?? null;
}

export async function createPendingUser(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return; // すでに登録済みなら何もしない
  await setDoc(ref, {
    uid,
    email,
    displayName,
    role: "pending" as AppRole,
    createdAt: Timestamp.now(),
  });
}

export async function approveUser(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role: "member" });
}

export async function setAdminRole(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role: "admin" });
}

export function subscribeToUsers(
  callback: (users: UserRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, USERS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((d) => d.data() as UserRecord);
    callback(users);
  });
}
