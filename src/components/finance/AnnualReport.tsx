"use client";

import { useState } from "react";

interface ReportItem {
  id: string;
  name: string;
  amount: number;
  prevDiff: number;
  note: string;
  isHeader?: boolean;
}

interface YearData {
  reiwaYear: number;
  calYear: number;
  label: string;
  dateRange: string;
  treasurer: string;
  auditor: string;
  income: ReportItem[];
  expense: ReportItem[];
  isEditing?: boolean;
}

// ── 令和5年度 (2023) ──────────────────────────────────────────
const R5_INCOME: ReportItem[] = [
  { id: "i1", name: "前年度繰越金", amount: 105030, prevDiff: -172871, note: "R4年度より 繰り越し" },
  { id: "i2", name: "会費", amount: 0, prevDiff: 0, note: "", isHeader: true },
  { id: "i3", name: "入会費", amount: 0, prevDiff: 0, note: "" },
  { id: "i4", name: "月会費", amount: 735000, prevDiff: -61500, note: "¥3,000/月 12月現在21名 島田さん1月退会" },
  { id: "i5", name: "休会費", amount: 4000, prevDiff: 3000, note: "4月播川 6月小川 7月村井 8月〜10月都司" },
  { id: "i6", name: "ビジター料", amount: 3200, prevDiff: 1700, note: "村山コーチ講習会にビジター笠井さん1回300円8回 10/11ティンカーベル・ツカモトさん参加800円" },
  { id: "i7", name: "体験会・初参加者", amount: 0, prevDiff: 0, note: "" },
  { id: "i8", name: "練習会 ビジター料", amount: 9600, prevDiff: -9480, note: "4/12 ¥600×8名、7/5 ¥800×8名" },
  { id: "i9", name: "休会中練習参加費", amount: 2100, prevDiff: 2100, note: "1回700円 6/7小川, 9/20都司, 10/11都司" },
  { id: "i10", name: "第2練習参加費", amount: 22100, prevDiff: 3500, note: "1回¥300 計91回 延べ63名 (内7/4の8名ビジター¥700)" },
  { id: "i11", name: "古シャトル売却", amount: 17950, prevDiff: 11950, note: "NO286球・AS464球" },
  { id: "i12", name: "その他収入", amount: 1080, prevDiff: 1020, note: "R4年度インク代返納分1000円・団体戦参加料余剰金" },
];

const R5_EXPENSE: ReportItem[] = [
  { id: "e1", name: "コーチ料", amount: 258000, prevDiff: 5000, note: "4H7000円12回、3H6000円28回、2H6000円1回" },
  { id: "e2", name: "コーチ料 (山口コーチ)", amount: 54000, prevDiff: -6000, note: "6000円9回" },
  { id: "e3", name: "コーチお車代", amount: 11655, prevDiff: -265, note: "" },
  { id: "e4", name: "コート代", amount: 131610, prevDiff: -3210, note: "全61回 (4H:12回/3H:39回/2H1回/第2練:9回)" },
  { id: "e5", name: "交通費", amount: 2132, prevDiff: 2132, note: "体育館費支払いに行く際に発生した電車代・バス代" },
  { id: "e6", name: "冷暖費", amount: 2400, prevDiff: 1200, note: "都筑SC 2023年より7,8,9月は2時間につき¥600義務化" },
  { id: "e7", name: "シャトル代", amount: 285240, prevDiff: -90560, note: "AS 3180円36本、3480円10本 NO 4356円10本、4620円20本" },
  { id: "e8", name: "お中元・お歳暮", amount: 10000, prevDiff: 0, note: "フジ商品券 ¥5000×2" },
  { id: "e9", name: "団体登録料", amount: 7000, prevDiff: 0, note: "日、県、市、区" },
  { id: "e10", name: "SC登録更新料", amount: 0, prevDiff: -2400, note: "" },
  { id: "e11", name: "振り込み手数料", amount: 1048, prevDiff: 110, note: "団体登録・大会参加料" },
  { id: "e12", name: "郵送料", amount: 504, prevDiff: 504, note: "2/24交流大会・5/6団体戦・10/4技術講習会申し込み" },
  { id: "e13", name: "総会", amount: 2908, prevDiff: 2908, note: "ドリンク1928円、コピー110円、場所代870円" },
  { id: "e14", name: "お楽しみ会", amount: 8126, prevDiff: -203, note: "景品用お菓子代" },
  { id: "e15", name: "事務局インク代", amount: 1000, prevDiff: -1000, note: "" },
  { id: "e16", name: "事務用品代", amount: 987, prevDiff: 547, note: "月謝袋、ノート、フリクションペン、封筒、ビニール" },
  { id: "e17", name: "市本部の方差し入れ代", amount: 1580, prevDiff: 14, note: "クッキー8枚" },
  { id: "e18", name: "ユニフォーム・応援グッズ", amount: 11301, prevDiff: -126331, note: "団扇2710円 横断幕8591円" },
  { id: "e19", name: "部員募集印刷", amount: 0, prevDiff: 0, note: "" },
  { id: "e20", name: "お祝い・送別品", amount: 8120, prevDiff: 3975, note: "新住さん古希お祝い、島田さん・村山コーチ送別品" },
  { id: "e21", name: "その他支出", amount: 1634, prevDiff: -2787, note: "保険システム利用料、村山コーチ・フジ山本さんへのドリンク" },
];

// ── 令和6年度 (2024) ──────────────────────────────────────────
const R6_INCOME: ReportItem[] = [
  { id: "i1", name: "前年度繰越金", amount: 100815, prevDiff: -4215, note: "R5年度より 繰り越し" },
  { id: "i2", name: "会費", amount: 0, prevDiff: 0, note: "", isHeader: true },
  { id: "i3", name: "入会費", amount: 0, prevDiff: 0, note: "" },
  { id: "i4", name: "月会費", amount: 685500, prevDiff: -49500, note: "¥3,000/月 12月現在20名" },
  { id: "i5", name: "休会費", amount: 1000, prevDiff: -3000, note: "1月〜3月 原田" },
  { id: "i6", name: "ビジター料", amount: 7000, prevDiff: 3800, note: "山口コーチ練習会に笠井さん1回¥300・2回、都司さん¥800 6回、提督さん¥800 1回、飯塚さん¥800 1回" },
  { id: "i7", name: "体験会・初参加者", amount: 0, prevDiff: 0, note: "" },
  { id: "i8", name: "練習会 ビジター料", amount: 6400, prevDiff: -3200, note: "4/10 800円×8名" },
  { id: "i9", name: "休会中練習参加費", amount: 1400, prevDiff: -700, note: "1回¥700 原田2/28, 3/13" },
  { id: "i10", name: "第2練習参加費", amount: 0, prevDiff: -22100, note: "" },
  { id: "i11", name: "古シャトル売却", amount: 9660, prevDiff: -8290, note: "" },
  { id: "i12", name: "その他収入", amount: 4, prevDiff: -1076, note: "団体戦参加料余剰金" },
];

const R6_EXPENSE: ReportItem[] = [
  { id: "e1", name: "コーチ料", amount: 284000, prevDiff: 26000, note: "4H7000円2回 3H6000円45回" },
  { id: "e2", name: "コーチ料 (山口コーチ)", amount: 12000, prevDiff: -42000, note: "6000円2回" },
  { id: "e3", name: "コーチお車代", amount: 9830, prevDiff: -1825, note: "" },
  { id: "e4", name: "コート代", amount: 106490, prevDiff: -25120, note: "54回" },
  { id: "e5", name: "交通費", amount: 4104, prevDiff: 1972, note: "体育館費が支払いに行く際に発生した電車代" },
  { id: "e6", name: "冷暖費", amount: 0, prevDiff: -2400, note: "" },
  { id: "e7", name: "シャトル代", amount: 233200, prevDiff: -52040, note: "AS 3740円30本 NO 4840円X25本" },
  { id: "e8", name: "お中元・お歳暮", amount: 10000, prevDiff: 0, note: "フジ商品券 ¥5000×2" },
  { id: "e9", name: "団体登録料", amount: 6000, prevDiff: -1000, note: "日、県、市" },
  { id: "e10", name: "SC登録更新料", amount: 0, prevDiff: 0, note: "" },
  { id: "e11", name: "振り込み手数料", amount: 608, prevDiff: -440, note: "団体登録、大会参加料" },
  { id: "e12", name: "郵送料", amount: 504, prevDiff: 0, note: "市交流大会、市団体戦、講習会申し込み" },
  { id: "e13", name: "総会", amount: 2762, prevDiff: -146, note: "ドリンク1682円、コピー代210円、場所代870円" },
  { id: "e14", name: "お楽しみ会", amount: 11121, prevDiff: 2995, note: "お菓子代、小分け用袋" },
  { id: "e15", name: "事務局インク代", amount: 1000, prevDiff: 0, note: "" },
  { id: "e16", name: "事務用品代", amount: 640, prevDiff: -347, note: "封筒、テープ、コピー代" },
  { id: "e17", name: "市本部の方差し入れ代", amount: 1620, prevDiff: 40, note: "" },
  { id: "e18", name: "ユニフォーム・応援グッズ", amount: 0, prevDiff: -11301, note: "" },
  { id: "e19", name: "部員募集印刷", amount: 0, prevDiff: 0, note: "" },
  { id: "e20", name: "お祝い・送別品", amount: 10463, prevDiff: 2343, note: "都司さん送別品、村井さん・黒岩さん還暦、北村さん古希" },
  { id: "e21", name: "その他支出", amount: 4991, prevDiff: 3357, note: "保険シムテム料、山口コーチへのドリンク、募金 駐車場キャンセル代、審判代" },
];

// ── 令和7年度 (2025) ──────────────────────────────────────────
const R7_INCOME: ReportItem[] = [
  { id: "i1", name: "前年度繰越金", amount: 112446, prevDiff: 0, note: "R6年度より 繰り越し" },
  { id: "i2", name: "会費", amount: 0, prevDiff: 0, note: "", isHeader: true },
  { id: "i3", name: "入会費", amount: 1000, prevDiff: 1000, note: "石川(7月)" },
  { id: "i4", name: "月会費", amount: 573000, prevDiff: -112500, note: "¥3,000/月 16人/月" },
  { id: "i5", name: "休会費", amount: 9000, prevDiff: 8000, note: "村井・小川・戸越・石井" },
  { id: "i6", name: "ビジター料", amount: 110800, prevDiff: 104400, note: "98人/1,000円, 8人/1,200円, 4人/800円" },
  { id: "i7", name: "体験会・初参加者", amount: 2600, prevDiff: 2000, note: "体験会特典参加者 3名・笠井3回" },
  { id: "i8", name: "練習会 ビジター料", amount: 3000, prevDiff: -3400, note: "体験会10名 参加費300円" },
  { id: "i9", name: "休会中練習参加費", amount: 8800, prevDiff: 7400, note: "戸越2回石井4回/800円 小川8回/500円" },
  { id: "i10", name: "第2練習参加費", amount: 3600, prevDiff: 3600, note: "3/26仲町台 9名参加" },
  { id: "i11", name: "古シャトル売却", amount: 6880, prevDiff: -2780, note: "1/22, 4/2, 5/28, 9/10, 9/18, 12/17" },
  { id: "i12", name: "その他収入", amount: 360, prevDiff: 356, note: "余剰金" },
];

const R7_EXPENSE: ReportItem[] = [
  { id: "e1", name: "コーチ料", amount: 259000, prevDiff: -25000, note: "42回 (4H7回/3H35回)" },
  { id: "e2", name: "コーチ料 (山口コーチ)", amount: 18000, prevDiff: 6000, note: "3回" },
  { id: "e3", name: "コーチお車代", amount: 12247, prevDiff: 2417, note: "" },
  { id: "e4", name: "コート代", amount: 108300, prevDiff: 1810, note: "SC 7回 / 地区センター 41回" },
  { id: "e5", name: "交通費", amount: 2300, prevDiff: -1804, note: "コート代支払いの為の交通費" },
  { id: "e6", name: "冷暖費", amount: 1800, prevDiff: 1800, note: "都筑SC体験会" },
  { id: "e7", name: "シャトル代", amount: 159088, prevDiff: -74112, note: "エアロ500 21本, ニューオフィシャル 9本" },
  { id: "e8", name: "お中元・お歳暮", amount: 10000, prevDiff: 0, note: "6月/12月" },
  { id: "e9", name: "団体登録料", amount: 7000, prevDiff: 1000, note: "日・県・市2000円/区1000円" },
  { id: "e10", name: "SC登録更新料", amount: 2400, prevDiff: 2400, note: "レグルス6月 / BB9月 / オレンジ12月" },
  { id: "e11", name: "振り込み手数料", amount: 292, prevDiff: -313, note: "登録・スポーツ保険システム" },
  { id: "e12", name: "郵送料", amount: 0, prevDiff: -504, note: "" },
  { id: "e13", name: "総会", amount: 4174, prevDiff: 1412, note: "1/29, 3/5, 4/23, 1/14 会議室・印刷費・飲み物" },
  { id: "e14", name: "お楽しみ会", amount: 8625, prevDiff: -2496, note: "お菓子・備品レンタル料" },
  { id: "e15", name: "事務局インク代", amount: 0, prevDiff: -1000, note: "" },
  { id: "e16", name: "事務用品代", amount: 110, prevDiff: -500, note: "" },
  { id: "e17", name: "市本部の方差し入れ代", amount: 1296, prevDiff: -324, note: "菓子折" },
  { id: "e18", name: "ユニフォーム・応援グッズ", amount: 0, prevDiff: 0, note: "" },
  { id: "e19", name: "部員募集印刷", amount: 2900, prevDiff: 2900, note: "" },
  { id: "e20", name: "お祝い・送別品", amount: 8208, prevDiff: -2255, note: "送別の花/中川・中村・中山" },
  { id: "e21", name: "その他支出", amount: 4200, prevDiff: -791, note: "外部委託市レ試合参加費2人分3,400円/コーチ・ノック袋" },
];

// ── 令和8年度 (2026) 入力中 ──────────────────────────────────
const makeEmptyItems = (carryover: number): { income: ReportItem[]; expense: ReportItem[] } => ({
  income: [
    { id: "i1", name: "前年度繰越金", amount: carryover, prevDiff: 0, note: "R7年度より 繰り越し" },
    { id: "i2", name: "会費", amount: 0, prevDiff: 0, note: "", isHeader: true },
    { id: "i3", name: "入会費", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i4", name: "月会費", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i5", name: "休会費", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i6", name: "ビジター料", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i7", name: "体験会・初参加者", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i8", name: "練習会 ビジター料", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i9", name: "休会中練習参加費", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i10", name: "第2練習参加費", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i11", name: "古シャトル売却", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "i12", name: "その他収入", amount: 0, prevDiff: 0, note: "入力中" },
  ],
  expense: [
    { id: "e1", name: "コーチ料", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e2", name: "コーチ料 (山口コーチ)", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e3", name: "コーチお車代", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e4", name: "コート代", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e5", name: "交通費", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e6", name: "冷暖費", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e7", name: "シャトル代", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e8", name: "お中元・お歳暮", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e9", name: "団体登録料", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e10", name: "SC登録更新料", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e11", name: "振り込み手数料", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e12", name: "郵送料", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e13", name: "総会", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e14", name: "お楽しみ会", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e15", name: "事務局インク代", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e16", name: "事務用品代", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e17", name: "市本部の方差し入れ代", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e18", name: "ユニフォーム・応援グッズ", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e19", name: "部員募集印刷", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e20", name: "お祝い・送別品", amount: 0, prevDiff: 0, note: "入力中" },
    { id: "e21", name: "その他支出", amount: 0, prevDiff: 0, note: "入力中" },
  ],
});

const R8_DATA = makeEmptyItems(221546);

const YEAR_DATA: YearData[] = [
  {
    reiwaYear: 8, calYear: 2026,
    label: "令和8年度", dateRange: "令和8年 1月1日〜12月31日",
    treasurer: "（入力中）", auditor: "（入力中）",
    income: R8_DATA.income, expense: R8_DATA.expense, isEditing: true,
  },
  {
    reiwaYear: 7, calYear: 2025,
    label: "令和7年度", dateRange: "令和7年 1月1日〜12月31日",
    treasurer: "上前 祥子", auditor: "山本 優美子",
    income: R7_INCOME, expense: R7_EXPENSE,
  },
  {
    reiwaYear: 6, calYear: 2024,
    label: "令和6年度", dateRange: "令和6年 1月1日〜12月31日",
    treasurer: "中川 美春", auditor: "中村 清子",
    income: R6_INCOME, expense: R6_EXPENSE,
  },
  {
    reiwaYear: 5, calYear: 2023,
    label: "令和5年度", dateRange: "令和5年 1月1日〜12月31日",
    treasurer: "郡司 菓子", auditor: "中村 清子",
    income: R5_INCOME, expense: R5_EXPENSE,
  },
];

export default function AnnualReport() {
  const [selectedYear, setSelectedYear] = useState(7);

  const yearData = YEAR_DATA.find((y) => y.reiwaYear === selectedYear) || YEAR_DATA[1];

  const totalIncome = yearData.income
    .filter((i) => i.id !== "i1" && !i.isHeader)
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncomePrevDiff = yearData.income
    .filter((i) => i.id !== "i1" && !i.isHeader)
    .reduce((acc, curr) => acc + curr.prevDiff, 0);
  const totalExpense = yearData.expense.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpensePrevDiff = yearData.expense.reduce((acc, curr) => acc + curr.prevDiff, 0);
  const prevYearCarryover = yearData.income.find((i) => i.id === "i1")?.amount || 0;
  const currentBalance = totalIncome - totalExpense;
  const nextYearCarryover = prevYearCarryover + currentBalance;

  const fmt = (val: number) => val.toLocaleString("ja-JP");
  const fmtDiff = (val: number) => {
    if (val === 0) return "-";
    return val > 0 ? `+${val.toLocaleString("ja-JP")}` : val.toLocaleString("ja-JP");
  };

  return (
    <div className="bg-white rounded-[32px] border border-ag-gray-200/60 shadow-md p-6 lg:p-10">
      {/* ヘッダー & 年度選択 */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10 pb-6 border-b-2 border-ag-gray-200">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-ag-gray-900 tracking-wider mb-1">
            ビッグビーンズ会計報告
          </h2>
          <p className="text-base font-bold text-ag-gray-500">{yearData.dateRange}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {YEAR_DATA.map((y) => (
            <button
              key={y.reiwaYear}
              onClick={() => setSelectedYear(y.reiwaYear)}
              className={`relative px-4 py-3 rounded-2xl text-sm font-black transition-all border-2 ${
                selectedYear === y.reiwaYear
                  ? "bg-ag-gray-900 text-white border-ag-gray-900 shadow-lg scale-105"
                  : "bg-white text-ag-gray-700 border-ag-gray-200 hover:border-ag-gray-400"
              }`}
            >
              {y.isEditing && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  入力中
                </span>
              )}
              {y.label}
              <span className="block text-xs font-bold opacity-60">{y.calYear}年</span>
            </button>
          ))}
        </div>
      </div>

      {yearData.isEditing && (
        <div className="mb-8 p-5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-start gap-4">
          <span className="text-3xl">⚡</span>
          <div>
            <p className="text-xl font-black text-amber-800">この年度は現在入力中です</p>
            <p className="text-base font-bold text-amber-700 mt-1">
              2026年1月〜の実績を順次入力中。確定データが登録されると自動で反映されます。
            </p>
          </div>
        </div>
      )}

      {/* 収入の部 */}
      <div className="mb-12">
        <h3 className="text-2xl font-black text-ag-gray-800 mb-4 px-2 border-l-8 border-ag-lime-500">《収入の部》</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-ag-gray-100 border-y-2 border-ag-gray-800">
                <th className="p-4 text-base font-black text-ag-gray-800 w-1/4 border-r border-ag-gray-300">項目</th>
                <th className="p-4 text-base font-black text-ag-gray-800 text-right border-r border-ag-gray-300 w-36">収入 (円)</th>
                <th className="p-4 text-base font-black text-ag-gray-800 text-right border-r border-ag-gray-300 w-28">前年差</th>
                <th className="p-4 text-base font-black text-ag-gray-800">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ag-gray-200">
              {yearData.income.map((item) => {
                if (item.isHeader) {
                  return (
                    <tr key={item.id} className="bg-ag-gray-50/50">
                      <td colSpan={4} className="p-3 text-sm font-black text-ag-gray-600 pl-4">【{item.name}】</td>
                    </tr>
                  );
                }
                const isCarryover = item.id === "i1";
                return (
                  <tr key={item.id} className={isCarryover ? "bg-ag-gray-50" : "hover:bg-ag-lime-50 transition-colors"}>
                    <td className={`p-4 text-base border-r border-ag-gray-300 ${isCarryover ? "font-black" : "font-bold text-ag-gray-700 pl-8"}`}>
                      {item.name}
                    </td>
                    <td className="p-4 text-lg font-black text-ag-gray-900 text-right border-r border-ag-gray-300">
                      {isCarryover ? fmt(item.amount) : (item.amount === 0 && yearData.isEditing ? "---" : fmt(item.amount))}
                    </td>
                    <td className={`p-4 text-base font-bold text-right border-r border-ag-gray-300 ${item.prevDiff > 0 ? "text-ag-lime-600" : item.prevDiff < 0 ? "text-red-500" : "text-ag-gray-400"}`}>
                      {isCarryover ? "-" : fmtDiff(item.prevDiff)}
                    </td>
                    <td className="p-4 text-sm font-bold text-ag-gray-600">{item.note}</td>
                  </tr>
                );
              })}
              <tr className="bg-ag-lime-100/50 border-t-2 border-b-2 border-ag-gray-800">
                <td className="p-5 text-lg font-black text-center border-r border-ag-gray-300">収入合計</td>
                <td className="p-5 text-2xl font-black text-ag-lime-700 text-right border-r border-ag-gray-300">{fmt(totalIncome)}</td>
                <td className="p-5 text-base font-bold text-ag-gray-600 text-right border-r border-ag-gray-300">{fmtDiff(totalIncomePrevDiff)}</td>
                <td className="p-5"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 支出の部 */}
      <div className="mb-12">
        <h3 className="text-2xl font-black text-ag-gray-800 mb-4 px-2 border-l-8 border-red-500">《支出の部》</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-ag-gray-100 border-y-2 border-ag-gray-800">
                <th className="p-4 text-base font-black text-ag-gray-800 w-1/4 border-r border-ag-gray-300">項目</th>
                <th className="p-4 text-base font-black text-ag-gray-800 text-right border-r border-ag-gray-300 w-36">支出 (円)</th>
                <th className="p-4 text-base font-black text-ag-gray-800 text-right border-r border-ag-gray-300 w-28">前年差</th>
                <th className="p-4 text-base font-black text-ag-gray-800">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ag-gray-200">
              {yearData.expense.map((item) => (
                <tr key={item.id} className="hover:bg-red-50 transition-colors">
                  <td className="p-4 text-base font-bold text-ag-gray-700 border-r border-ag-gray-300 pl-8">{item.name}</td>
                  <td className="p-4 text-lg font-black text-ag-gray-900 text-right border-r border-ag-gray-300">
                    {item.amount === 0 && yearData.isEditing ? "---" : fmt(item.amount)}
                  </td>
                  <td className={`p-4 text-base font-bold text-right border-r border-ag-gray-300 ${item.prevDiff > 0 ? "text-ag-lime-600" : item.prevDiff < 0 ? "text-red-500" : "text-ag-gray-400"}`}>
                    {fmtDiff(item.prevDiff)}
                  </td>
                  <td className="p-4 text-sm font-bold text-ag-gray-600">{item.note}</td>
                </tr>
              ))}
              <tr className="bg-red-50 border-t-2 border-b-2 border-ag-gray-800">
                <td className="p-5 text-lg font-black text-center border-r border-ag-gray-300">支出合計</td>
                <td className="p-5 text-2xl font-black text-red-600 text-right border-r border-ag-gray-300">{fmt(totalExpense)}</td>
                <td className="p-5 text-base font-bold text-ag-gray-600 text-right border-r border-ag-gray-300">{fmtDiff(totalExpensePrevDiff)}</td>
                <td className="p-5"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 決算サマリー */}
      <div className="bg-ag-gray-50 border-4 border-ag-gray-800 rounded-2xl p-6 lg:p-10 max-w-3xl mx-auto shadow-sm">
        <div className="space-y-5">
          <div className="flex justify-between items-center border-b-2 border-dotted border-ag-gray-300 pb-4">
            <span className="text-xl font-black text-ag-gray-700">今年度収支 <span className="text-sm font-bold text-ag-gray-400">(収入合計 - 支出合計)</span></span>
            <span className="text-3xl font-black text-ag-gray-900">{fmt(currentBalance)} 円</span>
          </div>
          <div className="flex justify-between items-center border-b-2 border-dotted border-ag-gray-300 pb-4">
            <span className="text-xl font-black text-ag-gray-700">前年度繰越金</span>
            <span className="text-2xl font-black text-ag-gray-700">{fmt(prevYearCarryover)} 円</span>
          </div>
          <div className="flex justify-between items-center bg-ag-lime-100/50 p-5 rounded-xl border-2 border-ag-lime-500">
            <span className="text-2xl font-black text-ag-lime-800">次年度への繰越金</span>
            <span className="text-4xl font-black text-ag-lime-700 underline decoration-4 underline-offset-4">{fmt(nextYearCarryover)} 円</span>
          </div>
        </div>

        {!yearData.isEditing && (
          <div className="mt-10 text-right space-y-3">
            <p className="text-base font-bold text-ag-gray-700">上記の通り会計報告致します。</p>
            <p className="text-lg font-black text-ag-gray-900">{yearData.dateRange}</p>
            <div className="flex justify-end gap-16 mt-6 mr-4">
              <div className="text-center">
                <p className="text-sm font-bold text-ag-gray-500 mb-2">会　計</p>
                <div className="text-xl font-black text-ag-gray-900 inline-flex items-center gap-3">
                  <span>{yearData.treasurer}</span>
                  <div className="w-12 h-12 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-sm transform -rotate-12 opacity-80">印</div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-ag-gray-500 mb-2">会計監査</p>
                <div className="text-xl font-black text-ag-gray-900 inline-flex items-center gap-3">
                  <span>{yearData.auditor}</span>
                  <div className="w-12 h-12 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-sm transform rotate-6 opacity-80">印</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
