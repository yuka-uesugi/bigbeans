"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import PracticeGrouping, { Participant } from "./PracticeGrouping";
import VisitorRegistrationModal from "./VisitorRegistrationModal";
import { getNextPractice, EventData } from "@/lib/events";
import { subscribeToAttendances, AttendanceData } from "@/lib/attendances";
import { useEffect, useState } from "react";

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
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [nextPractice, setNextPractice] = useState<EventData | null>(null);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isVisitorMode = searchParams.get("role") === "visitor" && !user;

  // 直近の練習を取得
  useEffect(() => {
    async function load() {
      const p = await getNextPractice();
      setNextPractice(p);
      setLoading(false);
    }
    load();
  }, []);

  // 出欠を購読
  useEffect(() => {
    if (!nextPractice?.id) return;
    const unsubscribe = subscribeToAttendances(nextPractice.id, (data) => {
      setAttendances(data);
    });
    return () => unsubscribe();
  }, [nextPractice?.id]);

  if (loading) {
    return <div className="p-12 text-center text-ag-gray-400 font-bold animate-pulse">読み込み中...</div>;
  }

  if (!nextPractice) {
    return (
      <div className="rounded-3xl p-12 text-center border-2 border-dashed border-ag-gray-100 bg-ag-gray-50/30">
        <p className="text-xl font-black text-ag-gray-400 italic">No Upcoming Practice</p>
        <p className="text-sm text-ag-gray-400 mt-2 font-bold">直近の練習予定はまだ登録されていません。</p>
      </div>
    );
  }

  const attendingMembers = attendances.filter(a => a.status === "attend");
  const attendingCount = attendingMembers.length;
  // ※一旦ビジターは0として計算（後にビジター集計API追加）
  const totalWithVisitors = attendingCount; 
  const maxCapacity = nextPractice.maxCapacity || 24;
  const pct = Math.min((totalWithVisitors / maxCapacity) * 100, 100);

  // 日付のフォーマット
  const dateObj = new Date(nextPractice.date + "T00:00:00");
  const dayStr = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

  // 場所からコーチと車代を自動算出
  const { coach, fee } = getTransportInfo(nextPractice.location);

  // グループ分け用データ
  const participants: Participant[] = [
    ...attendingMembers.map((a) => ({ id: `m-${a.memberId}`, name: a.name, isVisitor: false })),
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
                {formattedDate}<span className="text-2xl text-white/70 ml-1">（{dayStr}）</span>
              </h2>
              {/* 練習当番 (PC版) */}
              <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 shadow-sm border border-white/10">
                <span className="text-xs font-bold text-white/80">📋 練習当番:</span>
                <span className="text-sm font-black tracking-wide text-white">{nextPractice.dutyMembers?.join("・") || "未定"}</span>
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
          <span className="text-sm font-black tracking-wide text-white">{nextPractice.dutyMembers?.join("・") || "未定"}</span>
        </div>

        {/* 場所・時間・担当・配車 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { icon: "📍", label: "場所", value: nextPractice.location },
            { icon: "⏰", label: "時間", value: nextPractice.time },
            { icon: "🏢", label: "担当", value: nextPractice.responsibleTeam || "BB" },
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
            <span>参加状況：会員 {attendingCount}名</span>
            <span className="text-white font-black text-xl">{totalWithVisitors} / {maxCapacity}名</span>
          </div>
          <div className="h-5 bg-black/40 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-white/90 mt-2 font-bold tracking-wide">
            <span>0名</span>
            <span className="text-white font-extrabold">上限 {maxCapacity}名</span>
          </div>
        </div>
      </div>

      {/* 特記事項 */}
      {nextPractice.description && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <span className="text-lg">📣</span>
          <p className="text-sm text-amber-700 font-bold leading-relaxed">{nextPractice.description}</p>
        </div>
      )}

      {/* ━━━━━ ② 参加者 ＋ ビジター を横並びで一覧化 ━━━━━ */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* 【左】参加者リスト */}
        <div className="md:col-span-1">
          <SectionTitle icon="🙋" title="参加メンバー" count={`${attendingCount}名`} />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {attendingMembers.map(a => (
                <span
                  key={a.memberId}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-lg font-black tracking-wide border-2 bg-ag-lime-500 text-white border-transparent shadow-sm"
                >
                  {a.name}
                </span>
            ))}
            {attendingCount === 0 && <p className="text-ag-gray-400 font-bold p-2 italic text-sm">参加予定者はまだいません</p>}
          </div>
        </div>

        {/* 【右】ビジター一覧 */}
        <div className="md:col-span-1">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ag-gray-100">
            <SectionTitle icon="👥" title="ビジター" count={`0名`} noBorder />
            <button 
              onClick={() => setIsVisitorModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all
                ${isVisitorMode 
                  ? "bg-sky-500 text-white hover:bg-sky-600 ring-4 ring-sky-100" 
                  : "bg-ag-gray-100 text-ag-gray-600 hover:bg-ag-gray-200 border border-ag-gray-200"}`}
            >
              <span>{isVisitorMode ? "✨ 参加表明" : "＋ 代理登録"}</span>
            </button>
          </div>
          <div className="space-y-3 mt-3">
            <p className="text-ag-gray-400 font-bold p-8 text-center italic text-sm bg-ag-gray-50/50 rounded-2xl border border-dashed border-ag-gray-100 uppercase tracking-widest">No Visitors</p>
          </div>
        </div>

      </div>

      {/* ━━━━━ ③ グループ分け機能 ━━━━━ */}
      <div className="p-5 bg-white">
        <PracticeGrouping initialParticipants={participants} />
      </div>

      {/* ビジター登録モーダル */}
      <VisitorRegistrationModal 
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        isVisitorMode={isVisitorMode}
        defaultIntroducer={user?.displayName || ""}
        onSubmit={(visitor) => {
          console.log("Registered visitor:", visitor);
          alert(`${visitor.name}さんの登録を受け付けました！（現在はデモのためリストには即時反映されません）`);
        }}
      />

    </div>
  );
}

// セクション見出しパーツ
function SectionTitle({ icon, title, count, noBorder = false }: { icon: string; title: string; count: string; noBorder?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${noBorder ? "" : "pb-3 border-b-2 border-ag-gray-100"}`}>
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-black text-ag-gray-800 tracking-wide">{title}</span>
      <span className="ml-auto text-sm font-black bg-ag-gray-100 text-ag-gray-600 px-3 py-1.5 rounded-full">{count}</span>
    </div>
  );
}
