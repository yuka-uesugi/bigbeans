import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";

export interface SystemFees {
  officialMonthly: number;            // オフィシャル 月謝 (x3ヶ月分) 用の1ヶ月単価
  annualRegistrationOfficial: number; // オフィシャル年次登録費 (1000)
  annualRegistrationLight: number;    // ライト年次登録費 (3000)
  visitor3hNoCoach: number;
  visitor3hCoach: number;
  visitor4hNoCoach: number;
  visitor4hCoach: number;
  light3hNoCoach: number;
  light3hCoach: number;
  light4hNoCoach: number;
  light4hCoach: number;
  coachFee3h: number;                 // コーチ料 3時間 (6,000円)
  coachFee4h: number;                 // コーチ料 4時間 (7,000円)
}

export interface ClubSettings {
  paypayLink: string;
  fees: SystemFees;
}

const SETTINGS_COLLECTION = "settings";
const GENERAL_DOC_ID = "general";

const defaultSettings: ClubSettings = {
  paypayLink: "",
  fees: {
    officialMonthly: 3000,
    annualRegistrationOfficial: 1000,
    annualRegistrationLight: 3000,
    visitor3hNoCoach: 900,
    visitor3hCoach: 1100,
    visitor4hNoCoach: 1100,
    visitor4hCoach: 1300,
    light3hNoCoach: 850,
    light3hCoach: 1050,
    light4hNoCoach: 1050,
    light4hCoach: 1250,
    coachFee3h: 6000,
    coachFee4h: 7000,
  }
};

/**
 * クラブ設定を取得する。存在しない場合はデフォルトを返す
 */
export async function getClubSettings(): Promise<ClubSettings> {
  const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    // 既存設定に足りないフィールドをデフォルトで埋める
    return { ...defaultSettings, ...(snapshot.data() as Partial<ClubSettings>) };
  } else {
    return defaultSettings;
  }
}

/**
 * クラブ設定をリアルタイム講読する
 */
export function subscribeToClubSettings(callback: (settings: ClubSettings) => void): Unsubscribe {
  const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ ...defaultSettings, ...(snapshot.data() as Partial<ClubSettings>) });
    } else {
      callback(defaultSettings);
    }
  });
}

/**
 * クラブ設定を保存・更新する
 */
export async function updateClubSettings(updates: Partial<ClubSettings>): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
  await setDoc(docRef, updates, { merge: true });
}
