/**
 * 規約・運営データの構造化定数
 * 年度初めに更新する情報をここに集約しています
 * 最終更新: 2026年4月
 */

// ─────────────────────────────────────────────
// 予約解禁スケジュール規約
// ─────────────────────────────────────────────

/**
 * 練習予約の解禁スケジュール
 *
 * 会員数の変化に合わせてここの値を変更するだけで
 * アプリ全体の予約ルールが更新されます。
 */
export const BOOKING_SCHEDULE_RULES = {
  /**
   * 通常会員の予約開始: 練習がカレンダーに追加された瞬間から。
   * （以前は「練習日の2ヶ月前」を自動計算していたが、会場抽選の結果が
   * 　出るタイミングがまちまちなため「追加した時点」を起点に変更）
   */
  /** ライト会員の解禁: 通常会員解禁から何日後（例: 5 → 5日後） */
  lightDelayDays: 5,
  /** ビジターの解禁: 通常会員解禁から何日後（例: 10 → 10日後） */
  visitorDelayDays: 10,
} as const;

// ─────────────────────────────────────────────
// 車代エリア区分
// ─────────────────────────────────────────────

export interface CarFeeArea {
  label: string;           // 距離表示
  fee: number;             // 片道料金（1人 or 2人の場合）
  feeThreePlus?: number;   // 3人以上の場合の料金
  isActualCost?: boolean;  // 実費精算の場合（H クラス）
  description: string;     // 対象地域の説明
}

export const CAR_FEE_AREAS: Record<string, CarFeeArea> = {
  A: { label: "10km圏内",   fee: 200, description: "都筑区内 (北山田、仲町台、中川、中山、荏田)" },
  B: { label: "20km圏内",   fee: 300, description: "近隣区 (港北、藤が丘、あざみ野、白山)" },
  C: { label: "30km圏内",   fee: 400, description: "神奈川区、保土ヶ谷、旭、青葉区遠方、町田、川崎" },
  D: { label: "31〜40km圏", fee: 600, feeThreePlus: 500, description: "中、大和、川崎多摩・カルッツ" },
  E: { label: "41〜55km圏", fee: 700, feeThreePlus: 600, description: "戸塚・港南・南・泉・栄、庭間・舎行、調布" },
  F: { label: "56〜70km圏", fee: 800, feeThreePlus: 700, description: "磯子・金沢、海老名・寒川" },
  G: { label: "71〜85km圏", fee: 1000, feeThreePlus: 800, description: "平塚・茅ヶ崎・横須賀" },
  H: { label: "86km以上",   fee: 0, isActualCost: true,  description: "小田原（実費精算）" },
};

// ─────────────────────────────────────────────
// 練習場所マスター
// ─────────────────────────────────────────────

export interface FacilityData {
  id: string;
  name: string;
  area: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
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
    drivers: ["富岡", "五十嵐"],
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
    coach: "富岡",
    drivers: ["上前", "山本", "黒岩"],
    passengers: ["上杉", "西脇", "藤田", "村井", "伊藤", "小川", "原田", "播川"],
    keywords: ["中山", "緑SC", "緑スポーツ"],
  },
  {
    id: "aoba-sc",
    name: "青葉スポーツセンター",
    area: "A",
    coach: "五十嵐",
    drivers: ["山本", "富岡", "上前", "播川"],
    passengers: ["伊藤", "小川", "原田", "上杉", "西脇", "藤田", "黒岩", "村井"],
    keywords: ["青葉SC", "青葉スポーツ"],
  },

  // ── エリア B（¥300） ──
  {
    id: "fujigaoka",
    name: "藤が丘地区センター",
    area: "B",
    coach: "伊藤",
    drivers: ["播川", "富岡", "上前"],
    passengers: ["山本", "小川", "原田", "上杉", "黒岩", "村井", "西脇", "藤田"],
    keywords: ["藤が丘", "藤ヶ丘"],
  },
  {
    id: "hakusan",
    name: "白山地区センター",
    area: "B",
    coach: "上前",
    drivers: ["富岡", "播川", "山本"],
    passengers: ["西脇", "藤田", "上杉", "五十嵐", "村井", "小川", "伊藤", "原田"],
    keywords: ["白山"],
  },
  {
    id: "kozukue",
    name: "小机 / 十日市場",
    area: "B",
    coach: "富岡",
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
    coach: "富岡",
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
    members: ["山本", "伊藤", "播川", "石川", "戸越", "冨永", "石井た"],
    note: "冨永・石井たは後半（8月〜）から加入",
  },
  {
    months: [4, 5, 10, 11],
    members: ["五十嵐", "小川", "黒岩", "上杉", "石井", "中野", "満沢"],
    note: "中野・満沢は後半（10月〜）から加入",
  },
  {
    months: [6, 7, 12, 1],
    members: ["上前", "西脇", "藤田", "原田", "富岡", "西嶌", "杉村"],
    note: "お楽しみ会担当／西嶌・杉村は後半（12月〜）から加入",
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
  note: "乗り合わせの都合上、契約時間外でも練習の最初から最後までご参加いただいています。※送迎は契約条件には含まれません。",
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
