import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  onSnapshot,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { Member } from "@/data/memberList";

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
export function calculateFiscalAge(birthDateStr: string | undefined, fiscalYear: number = 2026): number | null {
  if (!birthDateStr) return null;
  
  // スラッシュをハイフンに変換してパース (YYYY/MM -> YYYY/MM/01)
  const normalizedDate = birthDateStr.includes("/") ? birthDateStr.replace(/\//g, "-") : birthDateStr;
  const parts = normalizedDate.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parts[2] ? parseInt(parts[2]) : 1;

  const birthDate = new Date(year, month - 1, day);
  const targetDate = new Date(fiscalYear, 3, 1); // 4月1日 (0-indexed なので 3)

  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const m = targetDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
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
 * メンバーを新規作成または上書きする (Seeding用)
 */
export async function upsertMember(member: Member): Promise<void> {
  const memberRef = doc(db, MEMBERS_COLLECTION, String(member.id));
  await setDoc(memberRef, member, { merge: true });
}
