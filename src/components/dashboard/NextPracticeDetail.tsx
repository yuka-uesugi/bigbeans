"use client";

import Link from "next/link";

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

export default function NextPracticeDetail() {
  const attending = NEXT_PRACTICE.members.filter(m => m.status === "attend").length;
  const totalWithVisitors = attending + NEXT_PRACTICE.visitors.length;
  const pct = Math.min((totalWithVisitors / NEXT_PRACTICE.total) * 100, 100);

  return (
    <div className="rounded-3xl overflow-hidden border border-ag-gray-100 shadow-2xl bg-white">

      {/* ━━━━━ ① ヒーローヘッダー ━━━━━ */}
      <div className="bg-gradient-to-br from-ag-lime-500 via-emerald-500 to-teal-600 text-white px-6 pt-6 pb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-full">
              NEXT PRACTICE
            </span>
            <h2 className="text-4xl font-black mt-2 leading-none tracking-tight">
              {NEXT_PRACTICE.date}<span className="text-2xl text-white/70 ml-1">（{NEXT_PRACTICE.day}）</span>
            </h2>
          </div>
          <Link href="/dashboard/calendar" className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors shrink-0">
            全予定 →
          </Link>
        </div>

        {/* 場所・時間・担当（参加費は変動のため非表示） */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: "📍", label: "場所", value: NEXT_PRACTICE.location },
            { icon: "⏰", label: "時間", value: NEXT_PRACTICE.time },
            { icon: "🏢", label: "担当", value: NEXT_PRACTICE.responsible },
          ].map(item => (
            <div key={item.label} className="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-4 text-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs text-white/70 font-bold mb-1">{item.label}</div>
              <div className="text-2xl font-black leading-tight">{item.value}</div>
            </div>
          ))}
        </div>

        {/* 定員バー */}
        <div>
          <div className="flex justify-between text-sm text-white/80 mb-2 font-bold">
            <span>参加状況　会員 {attending}名 ＋ ビジター {NEXT_PRACTICE.visitors.length}名</span>
            <span className="text-white font-black text-base">{totalWithVisitors} / {NEXT_PRACTICE.total} 名</span>
          </div>
          <div className="h-4 bg-black/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-white/60 mt-1.5 font-semibold">
            <span>0名</span>
            <span className="text-white/80 font-bold">上限 {NEXT_PRACTICE.total}名</span>
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

      {/* ━━━━━ ② 参加者 ＋ 当番 ＋ ビジター を横並びで一覧化 ━━━━━ */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* 【左】参加者リスト */}
        <div className="md:col-span-1">
          <SectionTitle icon="🙋" title="会員 出欠" count={`${attending}名参加`} />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {NEXT_PRACTICE.members.map(m => {
              const s = m.status ? statusStyle[m.status] : null;
              return (
                <span
                  key={m.name}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-extrabold border
                    ${s ? `${s.bg} ${s.text} border-transparent` : "bg-ag-gray-50 text-ag-gray-400 border-ag-gray-100"}`}
                >
                  {m.name}
                  {!s && <span className="text-[10px] opacity-60">未</span>}
                </span>
              );
            })}
          </div>
          {/* 凡例 */}
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { label: "参加", bg: "bg-ag-lime-500" },
              { label: "不参加", bg: "bg-red-400" },
              { label: "保留", bg: "bg-amber-400" },
              { label: "未回答", bg: "bg-ag-gray-200" },
            ].map(leg => (
              <div key={leg.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${leg.bg}`} />
                <span className="text-xs font-bold text-ag-gray-400">{leg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 【中】当番 ＋ ビジター */}
        <div className="md:col-span-1 space-y-4">
          {/* 当番者 */}
          <div>
            <SectionTitle icon="📋" title="練習当番" count={`${NEXT_PRACTICE.dutyMembers.length}名`} />
            <div className="flex flex-wrap gap-2 mt-3">
              {NEXT_PRACTICE.dutyMembers.map(m => (
                <span key={m} className="bg-ag-lime-50 text-ag-lime-700 border border-ag-lime-200 rounded-xl px-4 py-2 text-base font-black">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* 出欠ステータスまとめ */}
          <div className="bg-ag-gray-50 rounded-2xl p-4 border border-ag-gray-100">
            <div className="text-xs font-extrabold text-ag-gray-400 uppercase mb-3">回答サマリー</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "参加", count: NEXT_PRACTICE.members.filter(m => m.status === "attend").length, color: "text-ag-lime-600", bg: "bg-ag-lime-50" },
                { label: "不参加", count: NEXT_PRACTICE.members.filter(m => m.status === "absent").length, color: "text-red-500", bg: "bg-red-50" },
                { label: "保留", count: NEXT_PRACTICE.members.filter(m => m.status === "pending").length, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "未回答", count: NEXT_PRACTICE.members.filter(m => m.status === null).length, color: "text-ag-gray-400", bg: "bg-ag-gray-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <div className={`text-3xl font-black ${s.color}`}>{s.count}</div>
                  <div className="text-xs font-bold text-ag-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 【右】ビジター一覧 */}
        <div className="md:col-span-1">
          <SectionTitle icon="👥" title="ビジター" count={`${NEXT_PRACTICE.visitors.length}名`} />
          <div className="space-y-2 mt-3">
            {NEXT_PRACTICE.visitors.map(v => (
              <div key={v.name} className="flex items-center gap-3 p-3 bg-sky-50/60 rounded-xl border border-sky-100">
                <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 text-base font-black flex items-center justify-center shrink-0">
                  {v.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-ag-gray-800 truncate">{v.name}</span>
                    <span className="text-xs font-black bg-sky-200 text-sky-700 px-2 py-0.5 rounded shrink-0">ランク{v.rank}</span>
                  </div>
                  <p className="text-xs text-ag-gray-400 font-medium">紹介: {v.invitedBy}</p>
                </div>
                {v.joinIntent && (
                  <span className="text-xs font-extrabold text-ag-lime-700 bg-ag-lime-50 border border-ag-lime-100 px-2 py-1 rounded-lg shrink-0">
                    入部希望
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// セクション見出しパーツ
function SectionTitle({ icon, title, count }: { icon: string; title: string; count: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b-2 border-ag-gray-100">
      <span className="text-lg">{icon}</span>
      <span className="text-base font-black text-ag-gray-800">{title}</span>
      <span className="ml-auto text-xs font-extrabold bg-ag-gray-100 text-ag-gray-500 px-2.5 py-1 rounded-full">{count}</span>
    </div>
  );
}
