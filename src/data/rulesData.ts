/**
 * 規約・運営データの構造化定数
 * 年度初めに更新する情報をここに集約しています
 * 最終更新: 2026年4月
 */

// ─────────────────────────────────────────────
// 車代エリア区分
// ─────────────────────────────────────────────

export interface CarFeeArea {
  label: string;      // 距離表示
  fee: number;        // 片道料金
  description: string; // 対象地域の説明
}

export const CAR_FEE_AREAS: Record<string, CarFeeArea> = {
  A: { label: "10km圏内", fee: 200, description: "都筑区内 (北山田、仲町台、中川、中山、荏田)" },
  B: { label: "20km圏内", fee: 300, description: "近隣区 (港北、藤が丘、あざみ野、白山)" },
  C: { label: "30km圏内", fee: 400, description: "神奈川区、保土ヶ谷、旭、青葉区遠方、町田、川崎" },
};

// ─────────────────────────────────────────────
// 練習場所マスター
// ─────────────────────────────────────────────

export interface FacilityData {
  id: string;
  name: string;
  area: "A" | "B" | "C";
  coach: string;           // メインコーチ担当
  drivers: string[];       // 車出し担当者リスト
  passengers: string[];    // 主な同乗メンバー
  keywords: string[];      // 場所名の部分一致キーワード（自動判定用）
}

export const FACILITIES: FacilityData[] = [
  // ── エリア A（¥200） ──
  {
    id: "tsuzuki-sc",
    name: "都筑スポーツセンター",
    area: "A",
    coach: "上杉",
    drivers: [],
    passengers: [],
    keywords: ["都筑", "都筑SC", "都筑スポーツ"],
  },
  {
    id: "nakamachidai",
    name: "仲町台地区センター",
    area: "A",
    coach: "上杉",
    drivers: ["冨岡", "五十嵐"],
    passengers: ["上前", "西脇", "藤田", "黒岩", "村井", "播川"],
    keywords: ["仲町台"],
  },
  {
    id: "nakagawa-nishi",
    name: "中川西地区センター",
    area: "A",
    coach: "五十嵐",
    drivers: ["山本", "西脇", "黒岩"],
    passengers: ["上杉", "藤田", "上前", "村井", "伊藤", "小川", "原田", "播川"],
    keywords: ["中川西"],
  },
  {
    id: "kitayamata",
    name: "北山田地区センター",
    area: "A",
    coach: "上杉",
    drivers: ["五十嵐", "山本"],
    passengers: ["西脇", "上前", "藤田", "伊藤", "小川", "原田"],
    keywords: ["北山田"],
  },
  {
    id: "nakayama",
    name: "中山地区センター / 緑SC",
    area: "A",
    coach: "冨岡",
    drivers: ["上前", "山本", "黒岩"],
    passengers: ["上杉", "西脇", "藤田", "村井", "伊藤", "小川", "原田", "播川"],
    keywords: ["中山", "緑SC", "緑スポーツ"],
  },
  {
    id: "aoba-sc",
    name: "青葉スポーツセンター",
    area: "A",
    coach: "五十嵐",
    drivers: ["山本", "冨岡", "上前", "播川"],
    passengers: ["伊藤", "小川", "原田", "上杉", "西脇", "藤田", "黒岩", "村井"],
    keywords: ["青葉SC", "青葉スポーツ"],
  },

  // ── エリア B（¥300） ──
  {
    id: "fujigaoka",
    name: "藤が丘地区センター",
    area: "B",
    coach: "伊藤",
    drivers: ["播川", "冨岡", "上前"],
    passengers: ["山本", "小川", "原田", "上杉", "黒岩", "村井", "西脇", "藤田"],
    keywords: ["藤が丘", "藤ヶ丘"],
  },
  {
    id: "hakusan",
    name: "白山地区センター",
    area: "B",
    coach: "上前",
    drivers: ["冨岡", "播川", "山本"],
    passengers: ["西脇", "藤田", "上杉", "五十嵐", "村井", "小川", "伊藤", "原田"],
    keywords: ["白山"],
  },
  {
    id: "kozukue",
    name: "小机 / 十日市場",
    area: "B",
    coach: "冨岡",
    drivers: [],
    passengers: [],
    keywords: ["小机", "十日市場"],
  },
  {
    id: "utsukushigaoka",
    name: "美しが丘西地区センター",
    area: "B",
    coach: "上杉",
    drivers: [],
    passengers: [],
    keywords: ["美しが丘", "美し西"],
  },
  {
    id: "nagatsuta",
    name: "長津田地区センター",
    area: "B",
    coach: "播川",
    drivers: [],
    passengers: [],
    keywords: ["長津田"],
  },

  // ── エリア C（¥400） ──
  {
    id: "kohoku-kanagawa",
    name: "港北 / 神奈川SC",
    area: "C",
    coach: "冨岡",
    drivers: ["播川", "五十嵐", "伊藤"],
    passengers: ["上杉", "黒岩", "村井", "藤田", "西脇", "上前", "山本", "小川"],
    keywords: ["港北", "神奈川SC", "神奈川スポーツ"],
  },
];

// ─────────────────────────────────────────────
// 場所名の自動マッチング
// ─────────────────────────────────────────────

/**
 * イベントの location 文字列から該当する施設データを検索する
 * 部分一致で判定するため、「仲町台地区センター」→ "仲町台" のように柔軟にマッチ
 */
export function findFacilityByLocation(location: string): FacilityData | null {
  if (!location) return null;
  for (const facility of FACILITIES) {
    for (const keyword of facility.keywords) {
      if (location.includes(keyword)) {
        return facility;
      }
    }
  }
  return null;
}

/**
 * 場所名からコーチ・車代情報を取得するヘルパー
 */
export function getTransportInfoFromRules(location: string) {
  const facility = findFacilityByLocation(location);
  if (!facility) {
    return { coach: "要確認", fee: 0, area: null as string | null, facility: null as FacilityData | null };
  }
  const areaData = CAR_FEE_AREAS[facility.area];
  return {
    coach: facility.coach,
    fee: areaData.fee,
    area: facility.area,
    facility,
  };
}

// ─────────────────────────────────────────────
// 2026年度 練習当番ローテーション
// ─────────────────────────────────────────────

export interface DutyTeam {
  months: number[];    // 対象月（1〜12）
  members: string[];   // 当番メンバーリスト
  note?: string;       // 特記事項
}

export const DUTY_ROTATION_2026: DutyTeam[] = [
  {
    months: [2, 3, 8, 9],
    members: ["山本", "伊藤", "播川", "石川", "戸越"],
  },
  {
    months: [4, 5, 10, 11],
    members: ["五十嵐", "小川", "黒岩", "上杉", "石井"],
  },
  {
    months: [6, 7, 12, 1],
    members: ["上前", "西脇", "藤田", "原田", "富岡"],
    note: "お楽しみ会担当",
  },
];

/**
 * 指定月の練習当番チームを取得する
 * @param month 月（1〜12）
 */
export function getDutyTeamByMonth(month: number): DutyTeam | null {
  return DUTY_ROTATION_2026.find(team => team.months.includes(month)) || null;
}

// ─────────────────────────────────────────────
// コーチ契約情報
// ─────────────────────────────────────────────

export const COACH_CONTRACT = {
  name: "SH",
  threeHourFee: 6000,      // 3時間練習（コーチング2H）
  fourHourFee: 7000,        // 4時間練習（コーチング3H）
  carExpense: "部費負担",   // 車代（駐車場込）
  note: "基本的に練習の全ての時間にご参加いただきます。",
};

// ─────────────────────────────────────────────
// 練習費用テーブル
// ─────────────────────────────────────────────

export const PRACTICE_FEES = {
  official: {
    label: "通常会員",
    monthlyFee: 3000,
    perPractice: 750,  // 月4回換算
    note: "月会費制。一番お得な主役プランです。",
  },
  light: {
    label: "ライト会員",
    threeHour: { withCoach: 850, noCoach: 650 },
    fourHour: { withCoach: 1050, noCoach: 850 },
    note: "850円の内訳: 通常(750) + 協力金100円",
    exception: "※笠井さん・第2練習：400円",
  },
  visitor: {
    label: "ビジター",
    threeHour: { withCoach: 1100, noCoach: 900 },
    fourHour: { withCoach: 1300, noCoach: 1100 },
    note: "お客様価格設定です。",
  },
  annualRegistration: 3000,     // 年間登録費（毎年2月・返金不可）
  paymentMethod: "PayPay推奨",
};
