"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { CalendarEvent } from "./CalendarGrid";
import VisitorRegistrationModal from "@/components/dashboard/VisitorRegistrationModal";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToAttendances, setAttendance, type AttendanceData } from "@/lib/attendances";
import { subscribeToVisitors, registerVisitor, type VisitorData } from "@/lib/visitors";


interface EventDetailProps {
  date: number;
  month: number;
  year: number;
  events: CalendarEvent[];
  onResponseChange: (eventId: string | number, response: string) => void;
  onEdit?: (event: CalendarEvent) => void;
}

const practiceOptions = [
  { value: "attend", label: "参加", color: "bg-ag-lime-500 hover:bg-ag-lime-600 text-white border-ag-lime-500" },
  { value: "absent", label: "不参加", color: "bg-red-500 hover:bg-red-600 text-white border-red-500" },
  { value: "pending", label: "保留", color: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" },
];

const memberPriority = {
  regular: 1,
  light: 2,
  visitor: 3
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function EventDetail({
  date,
  month,
  year,
  events,
  onResponseChange,
  onEdit,
}: EventDetailProps) {
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<"regular" | "light" | "visitor">("regular");
  const [activeTab, setActiveTab] = useState<"detail" | "members">("detail");
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  
  // キャンセル待ちの状態シミュレーション
  const [waitlistStatus, setWaitlistStatus] = useState<"none" | "waiting" | "notified" | "confirmed">("none");
  const [timer, setTimer] = useState(24 * 60 * 60); // 24時間 (秒)

  // フォーム状態

  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const { user, loading } = useAuth();
  const isVisitor = searchParams.get("role") === "visitor" && !user && !loading;

  // Firestoreから出欠・ビジターデータを取得
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [visitors, setVisitors] = useState<VisitorData[]>([]);


  useEffect(() => {
    const role = searchParams.get("role");
    if (role === "visitor" && !user && !loading) {
      setUserType("visitor");
    } else {
      setUserType("regular");
    }
    
    // PWAガイドの表示判定 (モバイルのみ)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) setShowPWAGuide(true);
  }, [searchParams, user, loading]);

  // Firestoreリアルタイム購読
  useEffect(() => {
    if (events.length === 0) return;
    const eventId = String(events[0].id);

    const unsubAttendances = subscribeToAttendances(eventId, (data) => {
      setAttendances(data);
    });
    const unsubVisitors = subscribeToVisitors(eventId, (data) => {
      setVisitors(data);
    });

    return () => {
      unsubAttendances();
      unsubVisitors();
    };
  }, [events]);

  // タイマー
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (waitlistStatus === "notified" && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [waitlistStatus, timer]);

  if (events.length === 0) return null;

  const currentEvent = events[0];
  const eventId = String(currentEvent.id);
  const dayOfWeek = new Date(year, month - 1, date).getDay();
  const totalAttendees = attendances.filter(a => a.status === "attend").length + visitors.length;

  // 予約開始日の計算ロジック
  const getRegistrationStatus = () => {
    const today = new Date();
    const eventDate = new Date(year, month - 1, date);
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (userType === "regular") return { isOpen: true, message: "通常会員：予約受付中" };
    if (userType === "light") {
      return diffDays <= 35 
        ? { isOpen: true, message: "ライト会員：予約受付中" } 
        : { isOpen: false, message: `ライト会員：${35 - diffDays}日後に受付開始` };
    }
    return diffDays <= 21 
      ? { isOpen: true, message: "ビジター：予約受付中" } 
      : { isOpen: false, message: `ビジター：${21 - diffDays}日後に受付開始` };
  };

  const regStatus = getRegistrationStatus();
  const isFull = totalAttendees >= (currentEvent.total || 24);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}時間${m}分${s}秒`;
  };

  return (
    <div className="bg-white rounded-3xl border border-ag-gray-200 shadow-2xl overflow-hidden animate-fade-in-up md:sticky md:top-24">
      {/* ヘッダー部分は共通 */}
      <div className={`px-6 py-7 ${
        currentEvent.type === "practice" ? "bg-gradient-to-br from-ag-lime-500 to-emerald-600" : "bg-ag-gray-800"
      } text-white relative`}>
        {/* ホーム画面追加ガイドバナー */}
        {showPWAGuide && (
          <div className="mb-4 p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <div className="text-[10px] leading-tight">
                <p className="font-bold">ホーム画面に追加してアプリ化</p>
                <p className="opacity-80">共有ボタンから「ホームに追加」</p>
              </div>
            </div>
            <button onClick={() => setShowPWAGuide(false)} className="text-white/60 text-xs">✕</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md truncate">
            {currentEvent.type === "practice" ? "Practice" : "Event"}
          </span>
          <div className="flex items-center gap-2">
            {!isVisitor && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-black/20 border border-white/10 shrink-0">
                {currentEvent.location}
              </span>
            )}
            {!isVisitor && onEdit && (
              <button
                onClick={() => onEdit(currentEvent)}
                className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-white/20 border border-white/20 hover:bg-white/30 transition-colors shrink-0"
              >
                編集
              </button>
            )}
          </div>
        </div>
        <h3 className="text-2xl font-black mb-1">{currentEvent.title}</h3>
        <p className="text-xs opacity-80">{currentEvent.location} | {currentEvent.time}</p>
        
        {/* 定員ステータス */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
             <div className="h-full bg-white" style={{ width: `${(totalAttendees / (currentEvent.total || 24)) * 100}%` }} />
          </div>
          <span className="text-[10px] font-bold whitespace-nowrap">{totalAttendees} / {currentEvent.total || 24} 名</span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* 予約・キャンセル待ちセクション */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">予約ステータス</h4>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${regStatus.isOpen ? "bg-ag-lime-100 text-ag-lime-700" : "bg-ag-gray-100 text-ag-gray-400"}`}>
              {regStatus.message}
            </span>
          </div>

          {waitlistStatus === "notified" ? (
             <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-3xl animate-pulse">
                <div className="text-center">
                   <p className="text-sm font-black text-amber-700 mb-1">📢 空きが出ました！</p>
                   <p className="text-xs text-amber-600 mb-4">期限内に予約を確定してください</p>
                   <div className="text-lg font-mono font-bold text-amber-800 mb-4">
                     残り {formatTime(timer)}
                   </div>
                   <button onClick={() => setWaitlistStatus("confirmed")} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-300 transition-transform active:scale-95">予約を確定する</button>
                </div>
             </div>
          ) : waitlistStatus === "waiting" ? (
             <div className="p-5 bg-ag-gray-50 border border-ag-gray-100 rounded-3xl text-center">
                <p className="text-sm font-bold text-ag-gray-700 mb-1">⏳ キャンセル待ち中</p>
                <p className="text-[10px] text-ag-gray-400">
                  現在、通常会員が優先的に案内されます。<br />空きが出次第、通知が届きます。
                </p>
                {/* デモ用 */}
                <button onClick={() => setWaitlistStatus("notified")} className="mt-4 text-[9px] text-ag-gray-300 underline">(デモ: 空きが発生させる)</button>
             </div>
          ) : isFull ? (
             <button onClick={() => setWaitlistStatus("waiting")} className="w-full py-4 bg-ag-gray-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2">
               🈵 定員：キャンセル待ちに並ぶ
             </button>
          ) : regStatus.isOpen ? (
             <div className="grid grid-cols-3 gap-2">
                {practiceOptions.map(opt => (
                   <button 
                     key={opt.value} 
                     onClick={async () => {
                       if (isVisitor && opt.value === "attend") {
                         setIsVisitorModalOpen(true);
                       } else if (user) {
                         // Firestoreに出欠を保存
                         await setAttendance(
                           eventId,
                           String(user.uid),
                           user.displayName || "不明",
                           opt.value as any,
                           user.displayName || undefined
                         );
                         onResponseChange(currentEvent.id, opt.value);
                       }
                     }} 
                     className={`flex flex-col items-center gap-1 py-3 border-2 rounded-2xl transition-all ${currentEvent.myResponse === opt.value ? "bg-ag-lime-500 border-ag-lime-500 text-white shadow-lg" : "bg-white border-ag-gray-100 text-ag-gray-400 hover:border-ag-lime-200"}`}
                   >
                     <span className="text-sm font-black">{opt.label}</span>
                   </button>
                ))}
             </div>

          ) : (
             <div className="p-6 bg-ag-gray-50 rounded-3xl border border-ag-gray-100 text-center text-ag-gray-400 italic text-xs">
                予約受付開始までお待ちください
             </div>
          )}
        </div>

        {/* 参加者リストは優先順位順に表示(シミュレーション) */}
        <div className="space-y-3 pt-2">
          <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">参加予定者</h4>
          <div className="divide-y divide-ag-gray-50 border border-ag-gray-50 rounded-2xl overflow-hidden shadow-sm">
            {/* Firestoreの出欠データから参加者を表示 */}
            {attendances.filter(a => a.status === "attend").map(att => (
              <div key={att.memberId} className="p-3 flex items-center gap-3 hover:bg-ag-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] bg-ag-lime-50 text-ag-lime-600 border border-ag-lime-100">
                  {att.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ag-gray-800">{att.name}</span>
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-ag-lime-50 text-ag-lime-500">Member</span>
                  </div>
                  <p className="text-[9px] text-ag-gray-400">Big Beans</p>
                </div>
              </div>
            ))}
            {/* Firestoreのビジターデータ */}
            {visitors.map(v => (
              <div key={v.id} className="p-3 flex items-center gap-3 hover:bg-ag-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] bg-sky-50 text-sky-500 border border-sky-100">
                  {v.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ag-gray-800">{v.name}</span>
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-sky-50 text-sky-400">Visitor</span>
                  </div>
                  <p className="text-[9px] text-ag-gray-400">{v.teamName || "フリー"}</p>
                </div>
                {v.rank && <span className="text-[9px] font-black text-sky-600">{v.rank}</span>}
              </div>
            ))}
            {attendances.filter(a => a.status === "attend").length === 0 && visitors.length === 0 && (
              <div className="p-6 text-center text-ag-gray-400 text-xs font-bold">まだ参加者がいません</div>
            )}
          </div>
        </div>

        {/* 代理登録セクション */}
        <button 
          onClick={() => setIsVisitorModalOpen(true)} 
          className="w-full py-2 bg-ag-gray-50 text-ag-gray-400 border border-ag-gray-100 border-dashed rounded-xl text-[10px] font-bold hover:bg-ag-gray-100 transition-colors"
        >
          {isVisitor ? "+ 他のビジターを追加" : "+ ビジターを代理登録"}
        </button>

        {/* ビジター登録モーダル */}
        <VisitorRegistrationModal
          isOpen={isVisitorModalOpen}
          onClose={() => setIsVisitorModalOpen(false)}
          isVisitorMode={isVisitor}
          defaultIntroducer={user?.displayName || ""}
          onSubmit={async (visitor) => {
            try {
              await registerVisitor(eventId, {
                name: visitor.name,
                rank: (visitor.rank as "A" | "B" | "C") || "B",
                invitedBy: visitor.introducer || "",
                teamName: visitor.teamName || "",
                joinIntent: visitor.joinIntent || false,
                comment: visitor.comment || "",
                registeredBy: user?.displayName || "visitor",
              });
              alert(`${visitor.name}さんの登録を受け付けました！`);
              setIsVisitorModalOpen(false);
            } catch (err) {
              console.error("ビジター登録エラー:", err);
              alert("登録に失敗しました。");
            }
          }}
        />

      </div>
    </div>
  );
}
