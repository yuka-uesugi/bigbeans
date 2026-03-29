"use client";

import Link from "next/link";
import PracticeGrouping, { Participant } from "./PracticeGrouping";

// 直後の練習データ（後でFirestoreから取得）
const NEXT_PRACTICE = {
  date: "4/8",
  day: "水",
  time: "12:00〜15:00",
  location: "仲町台",
  responsible: "BB",
  fee: 700,
  total: 24,
  note: "♡ 歓迎モーニング in よこはま物語（9:30〜11:30 テラス席）",
  dutyMembers: ["田中", "佐藤"],
  // メンバー出欠リスト
  members: [
    { name: "上杉", status: "attend" },
    { name: "田中", status: "attend" },
    { name: "佐藤", status: "attend" },
    { name: "鈴木", status: "attend" },
    { name: "山田", status: "attend" },
    { name: "渡辺", status: "attend" },
    { name: "伊藤", status: "attend" },
    { name: "中村", status: "attend" },
    { name: "小林", status: "attend" },
    { name: "加藤", status: "attend" },
    { name: "高橋", status: "absent" },
    { name: "松本", status: "absent" },
    { name: "井上", status: "pending" },
    { name: "木村", status: "pending" },
    { name: "林", status: null },
  ],
  // ビジター
  visitors: [
    { name: "石井B", rank: "B", invitedBy: "石川", joinIntent: false },
    { name: "杉村B", rank: "B", invitedBy: "石川", joinIntent: true },
    { name: "満沢B", rank: "B", invitedBy: "石川", joinIntent: true },
    { name: "鈴木庸子", rank: "A", invitedBy: "上杉", joinIntent: false },
  ],
};

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  attend:  { bg: "bg-ag-lime-500",  text: "text-white", label: "参加" },
  absent:  { bg: "bg-red-400",      text: "text-white", label: "不参加" },
  pending: { bg: "bg-amber-400",    text: "text-white", label: "保留" },
};

// 体育館からコーチ車・車代を自動判定するヘルパー
function getTransportInfo(location: string) {
  const loc = location || "";
  let fee = 0;
  let coach = "要確認";

  // コーチ担当の判定
  if (loc.includes("都筑") || loc.includes("仲町台") || loc.includes("北山田") || loc.includes("美し西")) coach = "上杉";
  else if (loc.includes("中川西") || loc.includes("青葉SC")) coach = "五十嵐";
  else if (loc.includes("中山") || loc.includes("緑") || loc.includes("小机") || loc.includes("十日市場") || loc.includes("港北") || loc.includes("神奈川")) coach = "冨岡";
  else if (loc.includes("藤ヶ丘")) coach = "伊藤";
  else if (loc.includes("白山")) coach = "上前";
  else if (loc.includes("長津田")) coach = "播川";

  // 料金エリアの判定
  if (loc.includes("都筑") || loc.includes("仲町台") || loc.includes("中川西") || loc.includes("北山田") || loc.includes("中山") || loc.includes("緑") || loc.includes("青葉")) fee = 200;
  else if (loc.includes("藤ヶ丘") || loc.includes("白山") || loc.includes("小机") || loc.includes("十日市場") || loc.includes("美し西") || loc.includes("長津田")) fee = 300;
  else if (loc.includes("港北") || loc.includes("神奈川")) fee = 400;

  return { coach, fee };
}

export default function NextPracticeDetail() {
  const attending = NEXT_PRACTICE.members.filter(m => m.status === "attend").length;
  const totalWithVisitors = attending + NEXT_PRACTICE.visitors.length;
  const pct = Math.min((totalWithVisitors / NEXT_PRACTICE.total) * 100, 100);

  // 場所からコーチと車代を自動算出
  const { coach, fee } = getTransportInfo(NEXT_PRACTICE.location);

  // グループ分け用データ
  const participants: Participant[] = [
    ...NEXT_PRACTICE.members
      .filter((m) => m.status === "attend")
      .map((m) => ({ id: `m-${m.name}`, name: m.name, isVisitor: false })),
    ...NEXT_PRACTICE.visitors.map((v) => ({
      id: `v-${v.name}`,
      name: v.name,
      isVisitor: true,
      rank: v.rank,
      joinIntent: v.joinIntent,
    })),
  ];

  return (
    <div className="rounded-3xl overflow-hidden border border-ag-gray-100 shadow-2xl bg-white">

      {/* ━━━━━ ① ヒーローヘッダー ━━━━━ */}
      <div className="bg-gradient-to-br from-ag-lime-500 via-emerald-500 to-teal-600 text-white px-6 pt-6 pb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-full">
              NEXT PRACTICE
            </span>
            <div className="flex items-center gap-4 mt-2">
              <h2 className="text-4xl font-black leading-none tracking-tight">
                {NEXT_PRACTICE.date}<span className="text-2xl text-white/70 ml-1">（{NEXT_PRACTICE.day}）</span>
              </h2>
              {/* 練習当番 (PC版) */}
              <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 shadow-sm border border-white/10">
                <span className="text-xs font-bold text-white/80">📋 練習当番:</span>
                <span className="text-sm font-black tracking-wide text-white">{NEXT_PRACTICE.dutyMembers.join("・")}</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/calendar" className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors shrink-0">
            全予定 →
          </Link>
        </div>
        
        {/* 練習当番 (スマホ用) */}
        <div className="sm:hidden mb-4 flex items-center justify-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 shadow-sm border border-white/10">
          <span className="text-xs font-bold text-white/80">📋 練習当番:</span>
          <span className="text-sm font-black tracking-wide text-white">{NEXT_PRACTICE.dutyMembers.join("・")}</span>
        </div>

        {/* 場所・時間・担当・配車 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { icon: "📍", label: "場所", value: NEXT_PRACTICE.location },
            { icon: "⏰", label: "時間", value: NEXT_PRACTICE.time },
            { icon: "🏢", label: "担当", value: NEXT_PRACTICE.responsible },
            { icon: "🚗", label: "配車目安", value: fee ? `${coach} (¥${fee})` : coach },
          ].map(item => (
            <div key={item.label} className="bg-white/20 backdrop-blur-md rounded-2xl px-3 py-4 text-center flex flex-col items-center justify-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-[10px] text-white/70 font-bold mb-1 tracking-wider">{item.label}</div>
              <div className="text-lg md:text-xl font-black leading-tight truncate w-full">{item.value}</div>
            </div>
          ))}
        </div>

        {/* 定員バー */}
        <div>
          <div className="flex justify-between text-base text-white/90 mb-2 font-black tracking-wide">
            <span>参加状況：会員 {attending}名 ＋ ビジター {NEXT_PRACTICE.visitors.length}名</span>
            <span className="text-white font-black text-xl">{totalWithVisitors} / {NEXT_PRACTICE.total}名</span>
          </div>
          <div className="h-5 bg-black/40 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-white/90 mt-2 font-bold tracking-wide">
            <span>0名</span>
            <span className="text-white font-extrabold">上限 {NEXT_PRACTICE.total}名</span>
          </div>
        </div>
      </div>

      {/* 特記事項 */}
      {NEXT_PRACTICE.note && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <span className="text-lg">📣</span>
          <p className="text-sm text-amber-700 font-bold leading-relaxed">{NEXT_PRACTICE.note}</p>
        </div>
      )}

      {/* ━━━━━ ② 参加者 ＋ ビジター ＋ サマリー を横並びで一覧化 ━━━━━ */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* 【左】参加者リスト */}
        <div className="md:col-span-1">
          <SectionTitle icon="🙋" title="参加メンバー" count={`${attending}名`} />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {NEXT_PRACTICE.members
              .filter(m => m.status === "attend")
              .map(m => (
                <span
                  key={m.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-lg font-black tracking-wide border-2 bg-ag-lime-500 text-white border-transparent shadow-sm"
                >
                  {m.name}
                </span>
            ))}
          </div>
        </div>

        {/* 【中】ビジター一覧 */}
        <div className="md:col-span-1">
          <SectionTitle icon="👥" title="ビジター" count={`${NEXT_PRACTICE.visitors.length}名`} />
          <div className="space-y-3 mt-3">
            {NEXT_PRACTICE.visitors.map(v => (
              <div key={v.name} className="flex items-center gap-4 p-4 bg-sky-50/60 rounded-2xl border-2 border-sky-200 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-sky-200 text-sky-800 text-2xl font-black flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                  {v.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-ag-gray-900 truncate tracking-wide">{v.name}</span>
                    <span className="text-sm font-black bg-sky-300 text-sky-900 px-2.5 py-1 rounded shrink-0 shadow-sm">ランク{v.rank}</span>
                  </div>
                  <p className="text-base text-ag-gray-600 font-bold mt-1">紹介: {v.invitedBy}</p>
                </div>
                {v.joinIntent && (
                  <span className="text-sm font-black text-ag-lime-800 bg-ag-lime-100 border-2 border-ag-lime-300 shadow-sm px-3 py-2 rounded-xl shrink-0">
                    入部希望
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 【右】回答サマリー */}
        <div className="md:col-span-1">
          <SectionTitle icon="📊" title="回答サマリー" count={`${NEXT_PRACTICE.members.length}件`} />
          <div className="bg-ag-gray-50 rounded-2xl p-4 border border-ag-gray-200 mt-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "参加", count: NEXT_PRACTICE.members.filter(m => m.status === "attend").length, color: "text-ag-lime-700", bg: "bg-ag-lime-100 border border-ag-lime-200" },
                { label: "不参加", count: NEXT_PRACTICE.members.filter(m => m.status === "absent").length, color: "text-red-600", bg: "bg-red-50 border border-red-200" },
                { label: "保留", count: NEXT_PRACTICE.members.filter(m => m.status === "pending").length, color: "text-amber-700", bg: "bg-amber-100 border border-amber-200" },
                { label: "未回答", count: NEXT_PRACTICE.members.filter(m => m.status === null).length, color: "text-ag-gray-600", bg: "bg-ag-gray-100 border border-ag-gray-300" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <div className={`text-3xl font-black ${s.color}`}>{s.count}</div>
                  <div className="text-sm font-black text-ag-gray-700">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ━━━━━ ③ グループ分け機能 ━━━━━ */}
      <div className="p-5 bg-white">
        <PracticeGrouping initialParticipants={participants} />
      </div>

    </div>
  );
}

// セクション見出しパーツ
function SectionTitle({ icon, title, count }: { icon: string; title: string; count: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b-2 border-ag-gray-100">
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-black text-ag-gray-800 tracking-wide">{title}</span>
      <span className="ml-auto text-sm font-black bg-ag-gray-100 text-ag-gray-600 px-3 py-1.5 rounded-full">{count}</span>
    </div>
  );
}
