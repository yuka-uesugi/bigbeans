import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { Member } from "@/data/memberList";
import type { ApplicationData } from "./applications";
import type { MembershipType } from "./attendances";
import { monthKey, typeFromHistory } from "./membership";

const MEMBERS_COLLECTION = "members";

/**
 * 全メンバーをリアルタイム購読する
 */
export function subscribeToMembers(
  callback: (members: Member[]) => void
): () => void {
  const q = query(collection(db, MEMBERS_COLLECTION), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map(doc => ({ ...doc.data() } as Member));
    callback(members);
  });
}

/**
 * 4月1日現在の年齢を計算する
 * @param birthDateStr 生年月日 (YYYY/MM/DD)
 * @param fiscalYear 基準年度 (2026など)
 */
function parseBirthDate(birthDateStr: string): Date | null {
  const normalized = birthDateStr.includes("/") ? birthDateStr.replace(/\//g, "-") : birthDateStr;
  const parts = normalized.split("-");
  if (parts.length < 2) return null;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parts[2] ? parseInt(parts[2]) : 1;
  return new Date(year, month - 1, day);
}

function ageAt(birthDate: Date, targetDate: Date): number {
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const m = targetDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) age--;
  return age;
}

/** 年度基準年齢: fiscalYear年の4月1日時点の年齢 */
export function calculateFiscalAge(birthDateStr: string | undefined, fiscalYear: number = 2026): number | null {
  if (!birthDateStr) return null;
  const birthDate = parseBirthDate(birthDateStr);
  if (!birthDate) return null;
  return ageAt(birthDate, new Date(fiscalYear, 3, 1));
}

/** 今日時点の満年齢 */
export function calculateTodayAge(birthDateStr: string | undefined): number | null {
  if (!birthDateStr) return null;
  const birthDate = parseBirthDate(birthDateStr);
  if (!birthDate) return null;
  return ageAt(birthDate, new Date());
}

/**
 * 全メンバーを取得する
 */
export async function getAllMembers(): Promise<Member[]> {
  const querySnapshot = await getDocs(collection(db, MEMBERS_COLLECTION));
  return querySnapshot.docs.map(doc => ({ ...doc.data() } as Member));
}

/**
 * 特定のメールアドレスを持つメンバーを取得する
 */
export async function getMemberByEmail(email: string): Promise<Member | null> {
  const q = query(collection(db, MEMBERS_COLLECTION), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  return querySnapshot.docs[0].data() as Member;
}

/**
 * メンバー情報を更新する
 */
export async function updateMember(id: number | string, data: Partial<Member>): Promise<void> {
  const memberRef = doc(db, MEMBERS_COLLECTION, String(id));
  await updateDoc(memberRef, data);
}

/**
 * 会員種別の変更を名簿に反映する（管理者・サポーターのみ実行可）。
 * - membershipHistory に「effectiveMonth の月から newType」という履歴を追加する。
 * - 適用月がすでに来ていれば、現在の種別(membershipType)も切り替える。
 * - 適用月が未来なら履歴だけ追加し、月が来たら syncMembershipTypesWithHistory で自動反映される。
 *   （料金計算は履歴を直接見るので、切り替え前でも練習日ベースで正しく計算される）
 */
export async function applyMembershipChange(
  memberId: number | string,
  newType: MembershipType,
  effectiveMonth: string // "YYYY-MM"
): Promise<void> {
  const memberRef = doc(db, MEMBERS_COLLECTION, String(memberId));
  const snap = await getDoc(memberRef);
  if (!snap.exists()) {
    throw new Error(`名簿にメンバー（会員番号 ${memberId}）が見つかりません`);
  }
  const data = snap.data() as Member;

  // 同じ適用月の履歴があれば置き換える（誤登録のやり直しができるように）
  const history = (data.membershipHistory ?? []).filter((h) => h.from !== effectiveMonth);
  history.push({ type: newType, from: effectiveMonth });
  history.sort((a, b) => (a.from < b.from ? -1 : 1));

  const updates: Record<string, unknown> = { membershipHistory: history };
  const currentMonth = monthKey(new Date());
  if (effectiveMonth <= currentMonth) {
    // 履歴上いちばん新しい「適用済み」の種別を現在種別にする
    const current = typeFromHistory({ membershipHistory: history }, currentMonth);
    updates.membershipType = current ?? newType;
  }
  await updateDoc(memberRef, updates);
}

/**
 * 種別変更履歴から1件を取り消す（管理者・サポーターのみ実行可）。
 * まだ適用月が来ていない「予定」の取り消しに使う。
 * ※適用済みの履歴を消すと過去の料金計算が変わってしまうため、呼び出し側で未来の履歴に限定すること。
 */
export async function removeMembershipHistoryEntry(
  memberId: number | string,
  from: string // 取り消す履歴の適用月 "YYYY-MM"
): Promise<void> {
  const memberRef = doc(db, MEMBERS_COLLECTION, String(memberId));
  const snap = await getDoc(memberRef);
  if (!snap.exists()) {
    throw new Error(`名簿にメンバー（会員番号 ${memberId}）が見つかりません`);
  }
  const data = snap.data() as Member;
  const history = (data.membershipHistory ?? []).filter((h) => h.from !== from);
  await updateDoc(memberRef, { membershipHistory: history });
}

/**
 * 適用月が来た「予約済みの種別変更」を名簿の現在種別(membershipType)に反映する。
 * 管理者・サポーターが名簿画面を開いたときに呼ばれる（本人の権限では書き込めないため）。
 * 反映後のメンバー配列を返す。
 */
export async function syncMembershipTypesWithHistory(members: Member[]): Promise<Member[]> {
  const currentMonth = monthKey(new Date());
  const result: Member[] = [];
  for (const m of members) {
    const t = typeFromHistory(m, currentMonth);
    if (t && t !== (m.membershipType ?? "official")) {
      await updateMember(m.id, { membershipType: t });
      result.push({ ...m, membershipType: t });
    } else {
      result.push(m);
    }
  }
  return result;
}

/**
 * メンバーを新規作成または上書きする (Seeding用)
 */
export async function upsertMember(member: Member): Promise<void> {
  const memberRef = doc(db, MEMBERS_COLLECTION, String(member.id));
  await setDoc(memberRef, member, { merge: true });
}

/**
 * メンバーを名簿(members)から削除する。
 * ※退会に相当する操作のため、呼び出し側で管理者(admin)に限定し、確認を取ること。
 */
export async function deleteMember(id: number | string): Promise<void> {
  const memberRef = doc(db, MEMBERS_COLLECTION, String(id));
  await deleteDoc(memberRef);
}

/**
 * 承認された「入会申請」をもとに、正式メンバーを名簿(members)に自動追加する。
 * - 連絡先がメールアドレスで、同じメールの人がすでに名簿にいる場合は重複登録を避けて null を返す。
 * - 会員番号(id)は既存の最大値+1で自動採番する。
 * 追加したメンバー情報を返す（スキップ時は null）。
 */
export async function addMemberFromApplication(
  app: ApplicationData
): Promise<Member | null> {
  // メール：新項目(email)を優先。旧データは contact が @ を含めばメール扱い。
  const rawEmail = app.email?.trim() || (app.contact?.includes("@") ? app.contact.trim() : "");
  const email = rawEmail || undefined;
  // LINE：新項目(lineId)を優先。旧データは contact が @ を含まなければ LINE 扱い。
  const lineId = app.lineId?.trim() || (app.contact && !app.contact.includes("@") ? app.contact.trim() : "");

  // メールが一致する既存メンバーがいれば重複追加しない
  if (email) {
    const existing = await getMemberByEmail(email);
    if (existing) return null;
  }

  // 既存IDの最大値+1で新しい会員番号を採番
  const members = await getAllMembers();
  const maxId = members.reduce(
    (max, m) => (typeof m.id === "number" && m.id > max ? m.id : max),
    0
  );

  // 入会日（今年・今月）を「YYYY/M」で記録
  const now = new Date();
  const member: Member = {
    id: maxId + 1,
    name: app.applicantName,
    membershipType: app.targetMemberType === "light" ? "light" : "official",
    joinedDate: `${now.getFullYear()}/${now.getMonth() + 1}`,
  };

  // 任意項目は値があるときだけ入れる（Firestoreはundefinedを保存できないため）
  const furigana = app.furigana?.trim();
  if (furigana) member.furigana = furigana;
  if (email) member.email = email;
  if (lineId) member.lineId = lineId;
  // 生年月日 YYYY-MM-DD → YYYY/MM/DD に統一
  const birthday = app.birthdate?.trim().replace(/-/g, "/");
  if (birthday) member.birthday = birthday;

  await upsertMember(member);
  return member;
}
