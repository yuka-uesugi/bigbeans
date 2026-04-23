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

export interface DutyTeam {
  months: number[];
  members: string[];
  label: string;
  note?: string;
}

export interface TransportVehicle {
  driver: string;
  passengers: string[];
}

export interface TransportEntry {
  area: string;   // "A" | "B" | "C"
  venue: string;  // e.g. "仲町台"
  vehicles: TransportVehicle[];
}

export interface BookingDefaults {
  maxCapacity: number;            // 最大定員 (21)
  memberReservedSlots: number;    // 正会員専用確保枠 (2)
  lightUnlockDelayDays: number;   // ライト解禁までの日数 (7)
  visitorUnlockDelayDays: number; // ビジター解禁までの日数 (14)
  officialMemberCount: number;    // 正会員総数 (15)
}

export interface ClubSettings {
  paypayLink: string;
  fees: SystemFees;
  dutyTeams?: DutyTeam[];
  bookingDefaults?: BookingDefaults;
  transportData?: TransportEntry[];
}

const SETTINGS_COLLECTION = "settings";
const GENERAL_DOC_ID = "general";

export const DEFAULT_BOOKING: BookingDefaults = {
  maxCapacity: 21,
  memberReservedSlots: 2,
  lightUnlockDelayDays: 7,
  visitorUnlockDelayDays: 14,
  officialMemberCount: 15,
};

const defaultSettings: ClubSettings = {
  paypayLink: "",
  bookingDefaults: DEFAULT_BOOKING,
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
  },
  dutyTeams: [
    { months: [2, 3, 8, 9], members: ["山本", "伊藤", "播川", "石川", "戸越"], label: "Team A" },
    { months: [4, 5, 10, 11], members: ["五十嵐", "小川", "黒岩", "上杉", "石井"], label: "Team B" },
    { months: [6, 7, 12, 1], members: ["上前", "西脇", "藤田", "原田", "富岡", "村井(休部中)"], label: "Team C", note: "※12・1月はお楽しみ会担当も兼務" },
  ],
  transportData: [
    { area: "A", venue: "都筑SC", vehicles: [{ driver: "上杉（コーチ）", passengers: [] }] },
    { area: "A", venue: "仲町台", vehicles: [
      { driver: "上杉（コーチ）", passengers: ["上前", "西脇", "藤田"] },
      { driver: "富岡", passengers: ["黒岩", "村井", "播川"] },
      { driver: "五十嵐", passengers: [] },
    ]},
    { area: "A", venue: "中川西", vehicles: [
      { driver: "五十嵐", passengers: ["上杉", "藤田", "上前", "村井", "伊藤", "小川", "原田", "播川"] },
      { driver: "山本", passengers: [] },
      { driver: "西脇", passengers: [] },
      { driver: "黒岩", passengers: [] },
    ]},
    { area: "A", venue: "北山田", vehicles: [
      { driver: "上杉（コーチ）", passengers: ["西脇", "上前", "藤田", "伊藤", "小川", "原田"] },
      { driver: "五十嵐", passengers: [] },
      { driver: "山本", passengers: [] },
    ]},
    { area: "A", venue: "中山 / 緑SC", vehicles: [
      { driver: "富岡", passengers: ["上杉", "西脇", "藤田", "村井", "伊藤", "小川", "原田", "播川"] },
      { driver: "上前", passengers: [] },
      { driver: "山本", passengers: [] },
      { driver: "黒岩", passengers: [] },
    ]},
    { area: "A", venue: "青葉SC", vehicles: [
      { driver: "五十嵐", passengers: ["伊藤", "小川", "原田", "上杉", "西脇", "藤田", "黒岩", "村井"] },
      { driver: "山本", passengers: [] },
      { driver: "富岡", passengers: [] },
      { driver: "上前", passengers: [] },
      { driver: "播川", passengers: [] },
    ]},
    { area: "B", venue: "藤ヶ丘", vehicles: [
      { driver: "伊藤（コーチ）", passengers: ["山本", "小川", "原田", "上杉", "黒岩", "村井", "西脇", "藤田"] },
      { driver: "播川", passengers: [] },
      { driver: "富岡", passengers: [] },
      { driver: "上前", passengers: [] },
    ]},
    { area: "B", venue: "白山", vehicles: [
      { driver: "上前", passengers: ["西脇", "藤田", "上杉", "五十嵐", "村井", "小川", "伊藤", "原田"] },
      { driver: "富岡", passengers: [] },
      { driver: "播川", passengers: [] },
      { driver: "山本", passengers: [] },
    ]},
    { area: "B", venue: "小机 / 十日市場", vehicles: [{ driver: "富岡", passengers: [] }] },
    { area: "B", venue: "美しが丘西", vehicles: [{ driver: "上杉（コーチ）", passengers: [] }] },
    { area: "B", venue: "長津田", vehicles: [{ driver: "播川", passengers: [] }] },
    { area: "C", venue: "港北 / 神奈川SC", vehicles: [
      { driver: "富岡", passengers: ["上杉", "黒岩", "村井", "藤田", "西脇", "上前", "山本", "小川"] },
      { driver: "播川", passengers: [] },
      { driver: "五十嵐", passengers: [] },
      { driver: "伊藤", passengers: [] },
    ]},
  ],
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
