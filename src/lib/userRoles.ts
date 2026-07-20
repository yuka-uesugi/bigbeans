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

export type AppRole = "admin" | "supporter" | "member" | "pending" | "rejected";

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

/**
 * ログイン記録に「メールアドレス」「表示名」が入っていない場合に、
 * Googleアカウントの情報で埋め直す（自己修復）。
 *
 * Firebaseコンソールで手作業で作ったログイン記録（初代管理者など）は role しか入っておらず、
 * 名簿との照合ができない・画面で名前が空欄になる、という問題が起きるため。
 * role には一切触らない。書き込めなかった場合（権限不足）は黙って諦める。
 */
export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  if (!email && !displayName) return;
  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Partial<UserRecord>;

    const patch: Record<string, string> = {};
    if (email && !(data.email ?? "").trim()) patch.email = email;
    if (displayName && !(data.displayName ?? "").trim()) patch.displayName = displayName;
    if (Object.keys(patch).length === 0) return;

    await updateDoc(ref, patch);
  } catch {
    // 権限不足などで書けなくても、ログイン自体は続行させる
  }
}

export async function approveUser(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role: "member" });
}

export async function setAdminRole(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role: "admin" });
}

export async function setSupporterRole(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role: "supporter" });
}

export async function revokeSupporterRole(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role: "member" });
}

export async function rejectUser(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role: "rejected" });
}

export async function reinstateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role: "pending" });
}

/** 名簿に登録済みのメールアドレスと照合して pending ユーザーを一括承認 */
export async function bulkApproveByMemberEmails(
  pendingUsers: UserRecord[],
  memberEmails: string[]
): Promise<number> {
  const emailSet = new Set(memberEmails.map((e) => e.toLowerCase()));
  const targets = pendingUsers.filter(
    (u) => u.role === "pending" && emailSet.has(u.email.toLowerCase())
  );
  await Promise.all(
    targets.map((u) => updateDoc(doc(db, USERS_COLLECTION, u.uid), { role: "member" }))
  );
  return targets.length;
}

export function subscribeToUsers(
  callback: (users: UserRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, USERS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    // ドキュメントID（＝本来のuid）を必ずuidにする。
    // 古い/壊れたデータで中身の uid 項目が空でも、正しい識別子で承認・却下などの操作ができるようにする。
    const users = snapshot.docs.map((d) => ({ ...(d.data() as UserRecord), uid: d.id }));
    callback(users);
  });
}
