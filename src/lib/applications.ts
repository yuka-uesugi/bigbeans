import {
  collection,
  doc,
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

export type AppType = "join" | "renewal" | "membership_change";
export type RenewalType =
  | "continue_regular"
  | "continue_light"
  | "regular_to_light"
  | "light_to_regular"
  | "withdraw";
// 年度途中の会員種別変更（月単位・月初から適用）
export type MembershipChangeType = "light_to_official" | "official_to_light";
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

  // 会員種別変更（月単位）
  changeType?: MembershipChangeType;
  effectiveMonth?: string; // 適用月 "YYYY-MM"（この月の1日から新種別）
  memberId?: number;       // 名簿(members)の会員番号。承認時の反映に使う

  // 入会申請
  furigana?: string;
  birthdate?: string;
  email?: string;   // メールアドレス（ログイン用・必須）
  lineId?: string;  // LINE ID（連絡用・必須）
  contact?: string; // 旧データ互換（以前は連絡先1項目だった）
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

// 種別変更でも「ライトになる」方向は年度更新と同じく60%署名が必要
export const MEMBERSHIP_CHANGE_NEEDS_VOTE: Record<MembershipChangeType, boolean> = {
  light_to_official: false,
  official_to_light: true,
};

export const MEMBERSHIP_CHANGE_LABELS: Record<MembershipChangeType, { label: string; color: string }> = {
  light_to_official: { label: "ライト → オフィシャル会員へ変更", color: "text-purple-700" },
  official_to_light: { label: "オフィシャル → ライト会員へ変更", color: "text-amber-700" },
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
  email: string;   // メールアドレス（ログイン用・必須）
  lineId?: string; // LINE ID（任意。将来QR友だち追加に置き換え予定）
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
  // 種別が変わる申請は、承認者（部長・管理者・サポーター）の承認で確定させる。
  // 承認と同時に「来年度（2月）から新種別」が名簿へ自動反映される。
  const changesType =
    data.renewalType === "regular_to_light" || data.renewalType === "light_to_regular";
  const status: AppStatus = needsVote ? "voting" : changesType ? "pending" : "approved";

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
// 会員種別変更申請（月単位）
// ─────────────────────────────────────────────

export async function createMembershipChangeApplication(data: {
  applicantName: string;
  applicantUid: string;
  applicantEmail?: string;
  memberId: number;              // 名簿の会員番号
  changeType: MembershipChangeType;
  effectiveMonth: string;        // 適用月 "YYYY-MM"
  reason?: string;
  officialMemberCount: number;   // 通常会員総数（60%計算用）
}): Promise<string> {
  const needsVote = MEMBERSHIP_CHANGE_NEEDS_VOTE[data.changeType];
  const requiredSignatures = needsVote ? Math.ceil(data.officialMemberCount * 0.6) : 0;
  // ライトになる方向は署名集めから開始。オフィシャルになる方向は承認待ちから開始。
  // どちらも最後は部長（管理者・サポーター権限）の承認で名簿に反映される。
  const status: AppStatus = needsVote ? "voting" : "pending";

  const ref = await addDoc(collection(db, COLLECTION), {
    type: "membership_change",
    status,
    submittedAt: Timestamp.now(),
    signatures: [],
    requiredSignatures,
    applicantName: data.applicantName,
    applicantUid: data.applicantUid,
    applicantEmail: data.applicantEmail ?? "",
    memberId: data.memberId,
    changeType: data.changeType,
    effectiveMonth: data.effectiveMonth,
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
  requiredSignatures: number,
  // 署名が集まったら自動で承認済みにするか。
  // 種別変更申請は署名が揃った後も「承認者（部長・管理者・サポーター）の承認」を待つため false にする。
  autoApproveOnComplete: boolean = true
): Promise<void> {
  const ref = doc(db, COLLECTION, appId);
  const newSig: AppSignature = {
    memberName,
    memberUid,
    signedAt: Timestamp.now(),
  };
  const newCount = currentSignatures.length + 1;
  const nowApproved = autoApproveOnComplete && newCount >= requiredSignatures;

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
