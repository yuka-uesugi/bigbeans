import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  runTransaction,
  serverTimestamp,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { FACILITY_CARDS, HAMASPO_CARDS, type FacilityCard, type HamaspoCard } from "@/data/facilityCards";

const FACILITY_COLLECTION = "facility_cards";
const HAMASPO_COLLECTION = "hamaspo_cards";
const BACKUP_COLLECTION = "facility_backups";

export interface FacilityBackup {
  id: string;
  name: string;
  createdAt: Timestamp;
  facilities: FacilityCard[];
  hamaspo: HamaspoCard[];
}

// ─────────────────────────────────────────────
// リアルタイム取得 (Subscribe)
// ─────────────────────────────────────────────

export function subscribeToFacilities(callback: (data: FacilityCard[]) => void) {
  const q = query(collection(db, FACILITY_COLLECTION)); // 並び順はクライアント側で既存配列に合わせてソートするか、後付でorderフィールド等による
  return onSnapshot(q, (snapshot) => {
    const cards = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FacilityCard[];
    callback(cards);
  });
}

export function subscribeToHamaspo(callback: (data: HamaspoCard[]) => void) {
  const q = query(collection(db, HAMASPO_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const cards = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as HamaspoCard[];
    callback(cards);
  });
}

// ─────────────────────────────────────────────
// 更新処理
// ─────────────────────────────────────────────

export async function updateFacility(id: string, data: Partial<FacilityCard>) {
  if (!id) throw new Error("IDが必要です");
  const docRef = doc(db, FACILITY_COLLECTION, id);
  // dataからidフィールド自体は除外して更新するのが安全
  const { id: _, ...updateData } = data as any;
  
  // undefinedな値を削除してFirebaseエラーを防ぐ
  const cleanData = JSON.parse(JSON.stringify(updateData));
  
  // ドキュメントが存在しない場合のエラーを防ぐため、setDoc(..., { merge: true }) を使用する
  await setDoc(docRef, cleanData, { merge: true });
}

export async function updateHamaspo(id: string, data: Partial<HamaspoCard>) {
  if (!id) throw new Error("IDが必要です");
  const docRef = doc(db, HAMASPO_COLLECTION, id);
  const { id: _, ...updateData } = data as any;
  
  // undefinedな値を削除してFirebaseエラーを防ぐ
  const cleanData = JSON.parse(JSON.stringify(updateData));

  // ドキュメントが存在しない場合のエラーを防ぐため、setDoc(..., { merge: true }) を使用する
  await setDoc(docRef, cleanData, { merge: true });
}

// ─────────────────────────────────────────────
// シード処理（初期データ投入）
// ─────────────────────────────────────────────

export async function seedFacilitiesData(): Promise<void> {
  try {
    // トランザクションやバッチを気にせず一気に流し込んでもよいが、バッチ処理で流し込む
    await runTransaction(db, async (transaction) => {
      // 1. 地区センター
      for (const card of FACILITY_CARDS) {
        // id をドキュメントIDにして既存上書き/新規作成
        const docRef = doc(db, FACILITY_COLLECTION, card.id);
        const { id, ...data } = card; // idを除外して保存
        transaction.set(docRef, { ...data, orderIndex: FACILITY_CARDS.findIndex(c => c.id === id) });
      }

      // 2. ハマスポ
      for (const [index, card] of HAMASPO_CARDS.entries()) {
        const id = card.id; // "'00072809" などをそのまま使用
        // IDに含まれる特殊文字対策として、英数字部分などでIDを作り直すか考慮。
        // ここではidからシングルクォートを取り除いてドキュメントIDにする
        const docId = id.replace(/[^a-zA-Z0-9]/g, ""); 
        const docRef = doc(db, HAMASPO_COLLECTION, docId);
        transaction.set(docRef, { ...card, id: docId, orderIndex: index });
      }
    });
    console.log("初期データの投入が完了しました");
  } catch (err) {
    console.error("シード処理中にエラー:", err);
    throw err;
  }
}

// ─────────────────────────────────────────────
// バックアップ管理
// ─────────────────────────────────────────────

/** 現在の状態をバックアップとして保存 */
export async function saveBackup(name: string, facilities: FacilityCard[], hamaspo: HamaspoCard[]): Promise<void> {
  try {
    const backupRef = doc(collection(db, BACKUP_COLLECTION));
    await setDoc(backupRef, {
      name,
      createdAt: serverTimestamp(),
      facilities,
      hamaspo
    });
  } catch (err) {
    console.error("バックアップ作成エラー:", err);
    throw err;
  }
}

/** バックアップ一覧を取得 */
export function getBackups(callback: (backups: FacilityBackup[]) => void) {
  const q = query(collection(db, BACKUP_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const backups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FacilityBackup[];
    callback(backups);
  });
}

/** 指定したバックアップから復元 */
export async function restoreFromBackup(backupId: string): Promise<void> {
  try {
    const backupDoc = await getDoc(doc(db, BACKUP_COLLECTION, backupId));
    if (!backupDoc.exists()) throw new Error("バックアップが見つかりません");
    
    const data = backupDoc.data() as FacilityBackup;
    
    await runTransaction(db, async (transaction) => {
      // 1. 地区センター
      for (const card of data.facilities) {
        const docRef = doc(db, FACILITY_COLLECTION, card.id);
        const { id, ...facilityData } = card;
        transaction.set(docRef, facilityData, { merge: false }); // 完全上書き
      }

      // 2. ハマスポ
      for (const card of data.hamaspo) {
        const docRef = doc(db, HAMASPO_COLLECTION, card.id);
        transaction.set(docRef, card, { merge: false }); // 完全上書き
      }
    });
  } catch (err) {
    console.error("復元エラー:", err);
    throw err;
  }
}

/** バックアップを削除 */
export async function deleteBackup(backupId: string): Promise<void> {
  await deleteDoc(doc(db, BACKUP_COLLECTION, backupId));
}
