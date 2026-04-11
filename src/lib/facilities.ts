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
  runTransaction
} from "firebase/firestore";
import { db } from "./firebase";
import { FACILITY_CARDS, HAMASPO_CARDS, type FacilityCard, type HamaspoCard } from "@/data/facilityCards";

const FACILITY_COLLECTION = "facility_cards";
const HAMASPO_COLLECTION = "hamaspo_cards";

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
