import {
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// ビジターの連絡先
//
// ★重要★ 連絡先(メールアドレス)は「予約(reservations)」には絶対に入れない。
// 予約は未ログインでも読める設定（firestore.rules の allow read: if true）に
// なっており、ビジター向け画面の人数表示がそれに依存している。
// そこにメールアドレスを入れると、誰にでも見える状態になってしまう。
// そのため連絡先だけをこの専用コレクションに分けて保存し、
// 読み取りはメンバーだけに限定している（firestore.rules 参照）。
// ─────────────────────────────────────────────

const COLLECTION = "visitorContacts";

export interface VisitorContact {
  /** 出欠・予約と紐づけるID（visitor-xxxxx と同じもの） */
  id: string;
  name: string;
  email: string;
  /** どの練習の申し込みで登録されたか */
  eventId: string;
  createdAt?: Timestamp;
}

/**
 * ビジターの連絡先を保存する。
 * 未ログインのビジター本人が書き込むため、作成のみ許可している。
 */
export async function saveVisitorContact(input: {
  id: string;
  name: string;
  email: string;
  eventId: string;
}): Promise<void> {
  await setDoc(doc(db, COLLECTION, input.id), {
    name: input.name,
    email: input.email,
    eventId: input.eventId,
    createdAt: Timestamp.now(),
  });
}

/** 連絡先を一覧で取得する（メンバーのみ読める） */
export async function getVisitorContacts(): Promise<VisitorContact[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VisitorContact[];
}

/** 連絡先の変更を購読する（メンバーのみ読める） */
export function subscribeVisitorContacts(
  callback: (contacts: VisitorContact[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VisitorContact[]);
    },
    () => {
      // 未ログイン（ビジター画面）では読めないので、静かに空で返す
      callback([]);
    }
  );
}
