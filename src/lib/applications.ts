import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  arrayUnion,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export type AppType = "join" | "renewal";
export type RenewalType =
  | "continue_regular"
  | "continue_light"
  | "regular_to_light"
  | "light_to_regular"
  | "withdraw";
export type AppStatus = "pending" | "voting" | "approved" | "rejected";

export interface AppSignature {
  memberName: string;
  memberUid: string;
  signedAt: Timestamp;
}

export interface ApplicationData {
  id: string;
  type: AppType;
  applicantName: string;
  applicantUid?: string;
  applicantEmail?: string;
  submittedAt: Timestamp;
  status: AppStatus;

  // 年度更新
  renewalType?: RenewalType;
  reason?: string;

  // 入会申請
  furigana?: string;
  birthdate?: string;
  contact?: string;
  invitedBy?: string;
  rank?: string;
  ageGroup?: string;
  teamName?: string;
  targetMemberType?: "regular" | "light";
  motivation?: string;

  signatures: AppSignature[];
  requiredSignatures: number;
}

// ライト変更・継続には60%署名が必要
export const RENEWAL_NEEDS_VOTE: Record<RenewalType, boolean> = {
  continue_regular: false,
  continue_light:   true,
  regular_to_light: true,
  light_to_regular: false,
  withdraw:         false,
};

export const RENEWAL_LABELS: Record<RenewalType, { label: string; color: string }> = {
  continue_regular: { label: "通常会員として継続",      color: "text-ag-lime-700" },
  continue_light:   { label: "ライト会員として継続",     color: "text-sky-700" },
  regular_to_light: { label: "通常→ライト会員へ変更",   color: "text-amber-700" },
  light_to_regular: { label: "ライト→通常会員へ昇格",   color: "text-purple-700" },
  withdraw:         { label: "退会",                     color: "text-red-700" },
};

export const STATUS_LABELS: Record<AppStatus, { label: string; bg: string; color: string }> = {
  pending:  { label: "受付済み",     bg: "bg-ag-gray-100", color: "text-ag-gray-600" },
  voting:   { label: "署名受付中",   bg: "bg-amber-100",   color: "text-amber-700" },
  approved: { label: "承認済み",     bg: "bg-ag-lime-100", color: "text-ag-lime-700" },
  rejected: { label: "否決",         bg: "bg-red-100",     color: "text-red-600" },
};

const COLLECTION = "applications";

// ─────────────────────────────────────────────
// 読み取り
// ─────────────────────────────────────────────

export function subscribeToApplications(
  callback: (apps: ApplicationData[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ApplicationData));
  });
}

// ─────────────────────────────────────────────
// 入会申請
// ─────────────────────────────────────────────

export async function createJoinApplication(data: {
  applicantName: string;
  furigana?: string;
  birthdate?: string;
  contact: string;
  invitedBy?: string;
  rank?: string;
  ageGroup?: string;
  teamName?: string;
  targetMemberType: "regular" | "light";
  motivation?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    type: "join",
    status: "pending",
    submittedAt: Timestamp.now(),
    signatures: [],
    requiredSignatures: 0,
    ...data,
  });
  return ref.id;
}

// ─────────────────────────────────────────────
// 年度更新申請
// ─────────────────────────────────────────────

export async function createRenewalApplication(data: {
  applicantName: string;
  applicantUid: string;
  applicantEmail?: string;
  renewalType: RenewalType;
  reason?: string;
  officialMemberCount: number; // 通常会員総数（60%計算用）
}): Promise<string> {
  const needsVote = RENEWAL_NEEDS_VOTE[data.renewalType];
  const requiredSignatures = needsVote ? Math.ceil(data.officialMemberCount * 0.6) : 0;
  const status: AppStatus = needsVote ? "voting" : "approved";

  const ref = await addDoc(collection(db, COLLECTION), {
    type: "renewal",
    status,
    submittedAt: Timestamp.now(),
    signatures: [],
    requiredSignatures,
    applicantName: data.applicantName,
    applicantUid: data.applicantUid,
    applicantEmail: data.applicantEmail ?? "",
    renewalType: data.renewalType,
    reason: data.reason ?? "",
  });
  return ref.id;
}

// ─────────────────────────────────────────────
// 署名
// ─────────────────────────────────────────────

export async function signApplication(
  appId: string,
  memberName: string,
  memberUid: string,
  currentSignatures: AppSignature[],
  requiredSignatures: number
): Promise<void> {
  const ref = doc(db, COLLECTION, appId);
  const newSig: AppSignature = {
    memberName,
    memberUid,
    signedAt: Timestamp.now(),
  };
  const newCount = currentSignatures.length + 1;
  const nowApproved = newCount >= requiredSignatures;

  await updateDoc(ref, {
    signatures: arrayUnion(newSig),
    ...(nowApproved ? { status: "approved" } : {}),
  });
}

// ─────────────────────────────────────────────
// 管理者アクション
// ─────────────────────────────────────────────

export async function approveApplication(appId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, appId), { status: "approved" });
}

export async function rejectApplication(appId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, appId), { status: "rejected" });
}
