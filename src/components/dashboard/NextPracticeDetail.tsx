"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import PracticeGrouping, { Participant } from "./PracticeGrouping";
import VisitorRegistrationModal from "./VisitorRegistrationModal";
import { getNextPractice, EventData } from "@/lib/events";
import { subscribeToAttendances, AttendanceData } from "@/lib/attendances";
import { subscribeToMembers } from "@/lib/members";
import { Member } from "@/data/memberList";

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
  const [dbMembers, setDbMembers] = useState<Member[]>([]);
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

    const unsubMembers = subscribeToMembers((data) => setDbMembers(data));
    return () => unsubMembers();
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

  const attendingTotal = attendances.filter(a => a.status === "attend");
  
  // 会員（Official/Light）とビジターに分ける
  const memberParticipants = attendingTotal.filter(a => {
    const m = dbMembers.find(member => String(member.id) === String(a.memberId) || member.name === a.name);
    return m?.membershipType === "official" || m?.membershipType === "light";
  });
  
  const visitorParticipants = attendingTotal.filter(a => {
    const m = dbMembers.find(member => String(member.id) === String(a.memberId) || member.name === a.name);
    return !m || m.membershipType === "visitor" || a.memberId.toString().startsWith("visitor-");
  });

  const attendingCount = attendingTotal.length;
  const maxCapacity = nextPractice.maxCapacity || 24;
  const pct = Math.min((attendingCount / maxCapacity) * 100, 100);

  // 日付のフォーマット
  const dateObj = new Date(nextPractice.date + "T00:00:00");
  const dayStr = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

  // 場所からコーチと車代を自動算出
  const { coach, fee } = getTransportInfo(nextPractice.location);

  // グループ分け用データ
  const participants: Participant[] = attendingTotal.map((a) => {
    const m = dbMembers.find(member => String(member.id) === String(a.memberId) || member.name === a.name);
    
    let type: "official" | "light" | "visitor" | "coach" = "visitor";
    if (m?.membershipType === "official" || m?.membershipType === "light" || m?.membershipType === "coach") {
      type = m.membershipType;
    } else {
      // DBにないテストデータ等の判定
      const idStr = String(a.memberId).toLowerCase();
      const nStr = a.name;
      if (idStr.includes("sim-off") || nStr.includes("テスト田中") || nStr.includes("テスト佐藤") || nStr.includes("テスト鈴木") || nStr.includes("テスト高橋") || nStr.includes("テスト伊藤") || nStr.includes("テスト上杉")) {
        type = "official";
      } else if (idStr.includes("sim-light") || nStr.includes("テスト渡辺") || nStr.includes("テスト小林") || nStr.includes("テスト加藤")) {
        type = "light";
      } else if (idStr.includes("sim-coach") || nStr.includes("テストコーチ") || nStr === "渡辺 亜衣") {
        type = "coach";
      }
    }

    return { 
      id: String(a.memberId), 
      name: a.name, 
      membershipType: type
    };
  });

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
            <span>参加状況：{attendingCount}名</span>
            <span className="text-white font-black text-xl">{attendingCount} / {maxCapacity}名</span>
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

      {/* ━━━━━ ② 統合された参加者管理パネル (タップでコート分け) ━━━━━ */}
      <div className="p-5 bg-white min-h-[500px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-ag-gray-100">
           <h3 className="text-xl font-black text-ag-gray-800 flex items-center gap-2">
             🙋 本日の参加メンバー
           </h3>
           
           <div className="flex items-center gap-2">
             {/* 🧪 シミュレーションボタン (デバッグ用) */}
             <button
               onClick={async () => {
                 if (!nextPractice?.id) return;
                 
                 const confirmClear = window.confirm("⚠️ 現在の参加データをすべて削除し、純粋な「15名のテストデータ」に入れ替えますか？");
                 if (!confirmClear) return;
                 
                 const { setAttendance, getAttendances, deleteAttendance } = await import("@/lib/attendances");
                 
                 // 現在のデータを一旦全クリア
                 const currentAttendances = await getAttendances(nextPractice.id);
                 for (const a of currentAttendances) {
                    await deleteAttendance(nextPractice.id, a.memberId);
                 }
                 
                 // テストデータ定義 (オフィシャル, ライト, ビジターのミックス)
                 const testMembers = [
                   { id: "sim-off-1", name: "テスト田中", type: "official" },
                   { id: "sim-off-2", name: "テスト佐藤", type: "official" },
                   { id: "sim-off-3", name: "テスト鈴木", type: "official" },
                   { id: "sim-off-4", name: "テスト高橋", type: "official" },
                   { id: "sim-off-5", name: "テスト伊藤", type: "official" },
                   { id: "sim-light-1", name: "テスト渡辺", type: "light" },
                   { id: "sim-light-2", name: "テスト小林", type: "light" },
                   { id: "sim-light-3", name: "テスト加藤", type: "light" },
                   { id: "sim-vis-1", name: "ビジター太郎", type: "visitor" },
                   { id: "sim-vis-2", name: "ビジター花子", type: "visitor" },
                   { id: "sim-vis-3", name: "ビジター次郎", type: "visitor" },
                   { id: "sim-vis-4", name: "ビジター桃子", type: "visitor" },
                   { id: "sim-vis-5", name: "ビジター健太", type: "visitor" },
                   { id: "sim-coach-1", name: "テストコーチ", type: "coach" },
                   { id: "sim-off-6", name: "テスト上杉", type: "official" },
                 ];

                 for (const m of testMembers) {
                   await setAttendance(
                     nextPractice.id, 
                     m.id, 
                     m.name, 
                     "attend", 
                     "Simulation"
                   );
                 }
                 alert("15名のテストデータを投入しました！");
               }}
               className="px-4 py-2 bg-ag-gray-800 text-white rounded-2xl text-[10px] font-black hover:bg-black transition-all shadow-md"
             >
               🧪 15名テスト登録
             </button>

             <button 
                onClick={() => setIsVisitorModalOpen(true)}
                className={`px-4 py-2 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all active:scale-95
                  ${isVisitorMode 
                    ? "bg-sky-500 text-white hover:bg-sky-600 ring-4 ring-sky-100" 
                    : "bg-white text-sky-600 hover:bg-sky-50 border-2 border-sky-200"}`}
              >
                <span>{isVisitorMode ? "✨ 参加表明" : "＋ 代理登録"}</span>
              </button>
           </div>
        </div>
        
        <PracticeGrouping 
           initialParticipants={participants} 
           onRemoveParticipant={async (id) => {
             if (!nextPractice?.id) return;
             const { deleteAttendance } = await import("@/lib/attendances");
             await deleteAttendance(nextPractice.id, id);
           }}
        />
      </div>

      {/* ビジター登録モーダル */}
      <VisitorRegistrationModal 
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        isVisitorMode={isVisitorMode}
        defaultIntroducer={user?.displayName || ""}
        onSubmit={async (visitor) => {
          const { setAttendance } = await import("@/lib/attendances");
          if (nextPractice?.id) {
            await setAttendance(
              nextPractice.id, 
              `visitor-${Date.now()}`, 
              `[V] ${visitor.name}`, 
              "attend", 
              visitor.introducedBy || "Guest"
            );
            setIsVisitorModalOpen(false);
          }
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
