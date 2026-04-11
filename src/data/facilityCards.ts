/**
 * 練習場所・登録カード一覧表
 * ※オフィシャル会員限定情報
 * 最終更新: 2025年12月
 */

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export interface FacilityRegistration {
  teamName: string;       // 登録団体名
  slots: number;          // 抽選枠数
  id: string;             // 登録ID
  password: string;       // パスワード
}

export interface FacilityCard {
  id: string;
  name: string;             // 施設名
  releaseDay: string;       // 発売日
  drawDay: string;          // 抽選日
  hasAM: boolean;
  hasPM: boolean;
  paymentTiming: string;    // 支払い方法・タイミング
  registrations: FacilityRegistration[];
  representative: string;   // 代表者
  contact: string;          // 連絡者
  members?: string;         // 構成員
  parking: string;          // 駐車場
  notes: string;            // 備考
}

export interface HamaspoCard {
  renewalDate: string;      // 更新日
  releaseDay: string;       // 発売日
  drawDay: string;          // 抽選日
  hasAM: boolean;
  hasPM: boolean;
  paymentTiming: string;
  slots: number;
  teamName: string;
  id: string;
  password: string;
  representative: string;
  members: string;
  notes: string;
}

// ─────────────────────────────────────────────
// 地区センター系
// ─────────────────────────────────────────────

export const FACILITY_CARDS: FacilityCard[] = [
  {
    id: "tsuzuki",
    name: "都筑地区センター",
    releaseDay: "15日",
    drawDay: "2か月前10日",
    hasAM: true,
    hasPM: true,
    paymentTiming: "当日",
    registrations: [
      { teamName: "ビッグビーンズ", slots: 2, id: "2110005", password: "bb1964wed" },
      { teamName: "ベリー", slots: 2, id: "2110065", password: "Berry2020" },
      { teamName: "さくら", slots: 2, id: "2110089", password: "SakuraB5402" },
      { teamName: "セカンドゲーム", slots: 2, id: "2110012", password: "Second5080" },
      { teamName: "ポプラ（第2練）", slots: 2, id: "2110025", password: "Popura3452" },
    ],
    representative: "村井 庸子",
    contact: "新庄",
    parking: "中山・島田・新庄・北村、更新がないため継続利用許可済2025年7月現在",
    notes: "キャンセルは電話。団体登録更新なし。不定期で会員新ステム2021年（備品入力、ネット、補助ネット）。代表者：1団体のみ登録可能",
  },
  {
    id: "kitayamata",
    name: "北山田地区センター",
    releaseDay: "—",
    drawDay: "—",
    hasAM: false,
    hasPM: false,
    paymentTiming: "自主事業",
    registrations: [
      { teamName: "ビッグビーンズ", slots: 12, id: "18300111", password: "bb1964wed" },
    ],
    representative: "村井",
    contact: "村井",
    parking: "",
    notes: "キャンセルWEB可。団体登録更新なし",
  },
  {
    id: "nakagawa-nishi",
    name: "中川西地区センター",
    releaseDay: "15日",
    drawDay: "—",
    hasAM: false,
    hasPM: false,
    paymentTiming: "自主事業・当日",
    registrations: [
      { teamName: "さくらBADO", slots: 12, id: "18101001", password: "sakurabado" },
    ],
    representative: "山本 優美子",
    contact: "小川",
    parking: "",
    notes: "代表者：1団体のみ登録可能。構成員1名でOK",
  },
  {
    id: "nakamachidai",
    name: "仲町台地区センター",
    releaseDay: "—",
    drawDay: "—",
    hasAM: false,
    hasPM: false,
    paymentTiming: "自主事業",
    registrations: [
      { teamName: "トリプルス", slots: 12, id: "25200008", password: "triples2025" },
      { teamName: "タルト", slots: 12, id: "25100006", password: "tarttart1" },
      { teamName: "チャリチャリ", slots: 12, id: "2100047", password: "charichari89" },
    ],
    representative: "原田 / 戸越",
    contact: "戸越・宮岡",
    parking: "備品入力、駐車場、ネット、補助",
    notes: "P：前日14時先着電話受付。代表者5人分必要。2023年〜新システム。登録者名簿5人分必要",
  },
  {
    id: "nakayama",
    name: "中山地区センター",
    releaseDay: "11日",
    drawDay: "2か月前〜月末",
    hasAM: true,
    hasPM: true,
    paymentTiming: "当選後16日〜月末",
    registrations: [
      { teamName: "ビッグビーンズ", slots: 5, id: "22520027", password: "bb1964we" },
    ],
    representative: "五十嵐 明美",
    contact: "中山",
    parking: "",
    notes: "団体登録更新なし（連絡者）継続利用許可済",
  },
  {
    id: "hakusan",
    name: "白山地区センター",
    releaseDay: "—",
    drawDay: "2か月前当日〜応答日まで",
    hasAM: false,
    hasPM: false,
    paymentTiming: "—",
    registrations: [
      { teamName: "さくらBADO", slots: 4, id: "1538", password: "sakura88" },
    ],
    representative: "伊藤 深雪",
    contact: "上前",
    parking: "なし。近隣有料P利用。夏季エアコンなし注意",
    notes: "当選まですべて当日まで",
  },
  {
    id: "fujigaoka",
    name: "藤が丘地区センター",
    releaseDay: "13日",
    drawDay: "2か月前",
    hasAM: false,
    hasPM: false,
    paymentTiming: "当日",
    registrations: [
      { teamName: "ビッグビーンズ", slots: 2, id: "030522", password: "—" },
    ],
    representative: "—",
    contact: "上杉由華",
    parking: "1台のみ。1ヶ月前に予約。近隣有料Pあり",
    notes: "夏季エアコン注意。体育館担当メアド",
  },
  {
    id: "utsukushigaoka",
    name: "美しが丘西地区センター",
    releaseDay: "—",
    drawDay: "—",
    hasAM: false,
    hasPM: false,
    paymentTiming: "—",
    registrations: [
      { teamName: "—", slots: 2, id: "—", password: "—" },
    ],
    representative: "上杉由華",
    contact: "—",
    parking: "1団体、午前2台、午後3台",
    notes: "体育館担当メアド bb1964we... / 都区登録",
  },
];

// ─────────────────────────────────────────────
// ハマスポ / スポーツセンター
// ─────────────────────────────────────────────

export const HAMASPO_CARDS: HamaspoCard[] = [
  {
    renewalDate: "2028年3月",
    releaseDay: "3日",
    drawDay: "末日",
    hasAM: true,
    hasPM: true,
    paymentTiming: "OLor当日",
    slots: 8,
    teamName: "ベリー",
    id: "'00072809",
    password: "BBRryy159263",
    representative: "上杉",
    members: "北村 戸越 中山",
    notes: "各自有効期限は名簿参照。※共有：2025年7月名簿.xlsx",
  },
  {
    renewalDate: "2028年7月",
    releaseDay: "",
    drawDay: "",
    hasAM: true,
    hasPM: true,
    paymentTiming: "",
    slots: 8,
    teamName: "レグルス",
    id: "'00073810",
    password: "RRGrss753869",
    representative: "上杉",
    members: "播川 中村 原田",
    notes: "",
  },
  {
    renewalDate: "2028年10月",
    releaseDay: "",
    drawDay: "",
    hasAM: true,
    hasPM: true,
    paymentTiming: "",
    slots: 8,
    teamName: "ビッグビーンズ",
    id: "'00099370",
    password: "BBBbbb357241",
    representative: "小川",
    members: "中川（小川家族） 播川 原",
    notes: "・退部者に更新手数を依頼できるか確認（伊藤）元は、島田、石山、山入、入会を受ける。2027年までで済み（2026年3月了承）",
  },
  {
    renewalDate: "2029年1月",
    releaseDay: "",
    drawDay: "",
    hasAM: true,
    hasPM: true,
    paymentTiming: "",
    slots: 8,
    teamName: "オレンジ",
    id: "'00072909",
    password: "OORngg951623",
    representative: "上杉",
    members: "石井 伊藤 富岡 西脇",
    notes: "",
  },
];

// ─────────────────────────────────────────────
// 集計情報
// ─────────────────────────────────────────────

/** 地区センターの合計枠数: 83枠 */
export const TOTAL_DISTRICT_SLOTS = FACILITY_CARDS.reduce(
  (sum, f) => sum + f.registrations.reduce((s, r) => s + r.slots, 0), 0
);

/** ハマスポの合計枠数: 28枠（注:1コマ単純平均3コマ確保分） */
export const TOTAL_HAMASPO_SLOTS = HAMASPO_CARDS.reduce((sum, h) => sum + h.slots, 0);
