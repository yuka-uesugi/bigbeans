"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { CalendarEvent } from "./CalendarGrid";
import { practiceSchedule, PracticeEvent, DetailedRegistration } from "@/data/practiceSchedule";
import VisitorRegistrationModal from "@/components/dashboard/VisitorRegistrationModal";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToAttendances, setAttendance, AttendanceData, AttendanceStatus } from "@/lib/attendances";
import { subscribeToClubSettings, ClubSettings } from "@/lib/settings";
import { calculateAttendanceFee } from "@/lib/fees";
import { memberList, Member } from "@/data/memberList";

interface EventDetailProps {
  date: number;
  month: number;
  year: number;
  events: CalendarEvent[];
  onResponseChange: (eventId: number, response: string) => void;
  onEditEvent?: (event: CalendarEvent) => void;
}

const practiceOptions = [
  { value: "attend", label: "参加", icon: "✅", color: "bg-ag-lime-500 hover:bg-ag-lime-600 text-white border-ag-lime-500" },
  { value: "absent", label: "不参加", icon: "❌", color: "bg-red-500 hover:bg-red-600 text-white border-red-500" },
  { value: "pending", label: "保留", icon: "🤔", color: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" },
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
  onEditEvent,
}: EventDetailProps) {
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<"regular" | "light" | "visitor">("regular");
  const [activeTab, setActiveTab] = useState<"detail" | "members">("detail");
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  
  // キャンセル待ちの状態シミュレーション
  const [waitlistStatus, setWaitlistStatus] = useState<"none" | "waiting" | "notified" | "confirmed">("none");
  const [timer, setTimer] = useState(24 * 60 * 60); // 24時間 (秒)

  // フォーム状態
  const [isAddingVisitor, setIsAddingVisitor] = useState(false);
  const [visitorForm, setVisitorForm] = useState<Partial<DetailedRegistration>>({
    name: "",
    rank: "B",
    ageGroup: "30代",
    teamName: "",
    comment: ""
  });
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const { user, loading } = useAuth();
  const isVisitor = searchParams.get("role") === "visitor" && !user && !loading;

  const [settings, setSettings] = useState<ClubSettings | null>(null);

  useEffect(() => {
    const unsubSettings = subscribeToClubSettings((data) => {
      setSettings(data);
    });
    return () => unsubSettings();
  }, []);

  // 出欠の購読
  const currentEvent = events[0];
  const eventId = currentEvent?.id ? String(currentEvent.id) : null;

  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = subscribeToAttendances(eventId, (data) => {
      setAttendances(data);
    });
    return () => unsubscribe();
  }, [eventId]);

  const currentUserAttendance = user
    ? attendances.find((a) => a.memberId === user.uid)
    : null;
  const myResponse = currentUserAttendance?.status || null;

  // 渡辺 亜衣さん（コーチ）が「参加(attend)」しているか
  const hasCoach = attendances.some(a => a.name === "渡辺 亜衣" && a.status === "attend");

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

  // タイマー
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (waitlistStatus === "notified" && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [waitlistStatus, timer]);

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-ag-gray-200 shadow-2xl overflow-hidden animate-fade-in-up md:sticky md:top-24 p-8 text-center">
        <div className="text-4xl mb-4">🌙</div>
        <h3 className="text-xl font-black text-ag-gray-800 mb-2">{month}月{date}日の予定</h3>
        <p className="text-sm font-bold text-ag-gray-400 mb-6">この日の練習・イベント予定はまだありません。</p>
        {!isVisitor && (
          <button 
            onClick={() => {
              // page.tsxのsetIsAddModalOpenを直接呼べないため、将来的にはイベント伝搬やContextを使用
              // 現状は見た目重視
              alert("新規予定の追加は上部の「+予定を追加」から行えます。");
            }}
            className="w-full py-3 bg-ag-gray-100 text-ag-gray-600 rounded-xl font-bold text-sm border border-ag-gray-200"
          >
            新規予定を作成する
          </button>
        )}
      </div>
    );
  }

  const richEvent = currentEvent as any; // 実際のFirestore EventDataを使用
  const dayOfWeek = new Date(year, month - 1, date).getDay();

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
  // 実際の参加者数（"attend" の人数）
  const actualAttendees = attendances.filter(a => a.status === "attend").length;
  // TODO: 本番ではビジター予約も加算する
  
  const isFull = actualAttendees >= (richEvent.maxCapacity || 24);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}時間${m}分${s}秒`;
  };

  const { signInWithGoogle } = useAuth();

  return (
    <div className="bg-white rounded-3xl border border-ag-gray-200 shadow-2xl overflow-hidden animate-fade-in-up md:sticky md:top-24">
      {/* ヘッダー部分は共通 */}
      <div className={`px-6 py-7 ${
        richEvent.type === "practice" ? "bg-gradient-to-br from-ag-lime-500 to-emerald-600" : "bg-ag-gray-800"
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md truncate">
              {richEvent.type === "practice" ? "🏸 Practice" : "📅 Event"}
            </span>
            {richEvent.responsibleTeam && !isVisitor && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-black/20 border border-white/10 shrink-0">
                担当: {richEvent.responsibleTeam}
              </span>
            )}
          </div>
          {!isVisitor && onEditEvent && (
            <button
              onClick={() => onEditEvent(currentEvent)}
              className="text-[10px] font-bold px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors"
            >
              設定・削除
            </button>
          )}
        </div>
        <h3 className="text-2xl font-black mb-1">{richEvent.title}</h3>
        <p className="text-xs opacity-80">{richEvent.location} | {richEvent.time}</p>
        
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
             <div className="h-full bg-white" style={{ width: `${(actualAttendees / (richEvent.maxCapacity || 24)) * 100}%` }} />
          </div>
          <span className="text-[10px] font-bold whitespace-nowrap">{actualAttendees} / {richEvent.maxCapacity || 24} 名</span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* 予約・キャンセル待ちセクション */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">予約ステータス</h4>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${userType === "visitor" || regStatus.isOpen ? "bg-ag-lime-100 text-ag-lime-700" : "bg-ag-gray-100 text-ag-gray-400"}`}>
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
             <div className="space-y-3">
               <div className="grid grid-cols-3 gap-2">
                  {practiceOptions.map(opt => (
                     <button 
                       key={opt.value} 
                       onClick={async () => {
                         if (isVisitor && opt.value === "attend") {
                           setIsVisitorModalOpen(true);
                         } else if (user && eventId) {
                           const status = opt.value as AttendanceStatus;
                           await setAttendance(eventId, user.uid, user.displayName || "名称未設定", status);
                           onResponseChange(Number(eventId), opt.value);
                         }
                       }} 
                       disabled={!user && !(isVisitor && opt.value === "attend")}
                       className={`flex flex-col items-center gap-1 py-3 border-2 rounded-2xl transition-all ${!user && !(isVisitor && opt.value === "attend") ? "opacity-40 cursor-not-allowed grayscale" : ""} ${myResponse === opt.value ? "bg-ag-lime-500 border-ag-lime-500 text-white shadow-lg" : "bg-white border-ag-gray-100 text-ag-gray-400 hover:border-ag-lime-200"}`}
                     >
                       <span className="text-xl">{opt.icon}</span>
                       <span className="text-[10px] font-bold">{opt.label}</span>
                     </button>
                  ))}
               </div>
               
               {!user && !isVisitor && (
                 <div className="p-4 bg-ag-lime-50 border border-ag-lime-100 rounded-2xl text-center">
                   <p className="text-[11px] font-bold text-ag-lime-700 mb-2">回答するにはログインが必要です</p>
                   <button 
                    onClick={() => signInWithGoogle()}
                    className="w-full py-2 bg-ag-lime-500 text-white text-xs font-black rounded-lg shadow-sm hover:bg-ag-lime-600 transition-colors"
                   >
                     Googleでログインして回答する
                   </button>
                 </div>
               )}
             </div>

          ) : (
             <div className="p-6 bg-ag-gray-50 rounded-3xl border border-ag-gray-100 text-center text-ag-gray-400 italic text-xs">
                予約受付開始までお待ちください
             </div>
          )}
        </div>

        {/* 参加者リストは優先順位順に表示(シミュレーション) */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">参加予定者</h4>
            {(() => {
              const totalFees = attendances
                .filter(a => a.status === "attend")
                .reduce((sum, a) => {
                  const m = memberList.find(member => String(member.id) === a.memberId || member.name === a.name);
                  return sum + calculateAttendanceFee(m, richEvent.time, settings, hasCoach).baseFee;
                }, 0);
              return (
                <span className="text-[10px] font-bold text-ag-gray-500 bg-ag-gray-50 px-2.5 py-1 rounded-lg border border-ag-gray-100 flex items-center justify-between">
                  本日の集金見込: <strong className="text-ag-lime-600 text-sm ml-2">¥{totalFees.toLocaleString()}</strong>
                </span>
              );
            })()}
          </div>
          <div className="divide-y divide-ag-gray-50 border border-ag-gray-50 rounded-2xl overflow-hidden shadow-sm">
            {attendances
              .filter(a => a.status === "attend")
              .map(a => {
                const memberInfo = memberList.find(m => String(m.id) === a.memberId || m.name === a.name);
                const feeData = calculateAttendanceFee(memberInfo, richEvent.time, settings, hasCoach);
                const isPaid = false; // TODO: 実際は支払済ステータスを管理する

                return (
                  <div key={a.memberId} className="p-3 flex items-center gap-3 hover:bg-ag-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] bg-ag-lime-50 text-ag-lime-600 border border-ag-lime-100 flex-shrink-0">
                      {a.name?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-ag-gray-800">{a.name}</span>
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                          memberInfo?.membershipType === "coach" ? "bg-amber-100 text-amber-700" :
                          memberInfo?.membershipType === "light" ? "bg-sky-50 text-sky-600" :
                          memberInfo?.membershipType === "official" ? "bg-ag-lime-50 text-ag-lime-600" :
                          "bg-ag-gray-100 text-ag-gray-500"
                        }`}>
                          {memberInfo?.membershipType === "coach" ? "コーチ" : 
                           memberInfo?.membershipType === "official" ? "オフィシャル" : 
                           memberInfo?.membershipType === "light" ? "ライト" : "ビジター"}
                        </span>
                      </div>
                      <p className="text-[9px] text-ag-gray-400 mt-0.5 truncate">{feeData.label}</p>
                    </div>
                    {/* 参加費の表示 */}
                    <div className="text-right flex-shrink-0">
                      {feeData.baseFee > 0 ? (
                        <>
                          <div className="text-xs font-black text-ag-gray-800 font-mono">¥{feeData.baseFee.toLocaleString()}</div>
                          <div className="text-[8px] text-red-400 font-bold">当日払い</div>
                        </>
                      ) : (
                        <div className="text-xs font-bold text-ag-gray-400">¥0</div>
                      )}
                    </div>
                  </div>
                );
              })}
            {attendances.filter(a => a.status === "attend").length === 0 && (
              <div className="p-4 text-center text-xs text-ag-gray-400">まだ参加予定者がいません</div>
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

        <VisitorRegistrationModal
          isOpen={isVisitorModalOpen}
          onClose={() => setIsVisitorModalOpen(false)}
          isVisitorMode={isVisitor}
          defaultIntroducer={user?.displayName || ""}
          onSubmit={async (visitor) => {
            if (!eventId) return;
            const visitorId = `visitor-${Date.now()}`;
            // 参加希望者として attendance に登録する
            await setAttendance(eventId, visitorId, `[V] ${visitor.name}`, "attend", visitor.invitedBy);
            
            alert(`${visitor.name}さんの参加登録を受け付けました！`);
            setIsVisitorModalOpen(false);
          }}
        />

      </div>
    </div>
  );
}
