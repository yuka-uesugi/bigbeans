"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { CalendarEvent } from "./CalendarGrid";
import VisitorRegistrationModal from "@/components/dashboard/VisitorRegistrationModal";
import AttendanceSummary from "./AttendanceSummary";
import { useAuth } from "@/contexts/AuthContext";
import { deleteAttendance } from "@/lib/attendances";
import { subscribeToAttendances, setAttendance, AttendanceData, AttendanceStatus } from "@/lib/attendances";
import { subscribeToClubSettings, ClubSettings } from "@/lib/settings";
import { subscribeToAnnouncements, type AnnouncementData } from "@/lib/announcements";
import { calculateAttendanceFee } from "@/lib/fees";
import { resolveMembershipTypeForEvent } from "@/lib/membership";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";
import { memberList, Member } from "@/data/memberList";
import { getMemberByEmail, getAllMembers } from "@/lib/members";
import { BOOKING_SCHEDULE_RULES } from "@/data/rulesData";

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

// 会員種別の短い表示ラベル（代理登録の選択肢用）
function membershipShort(type: Member["membershipType"]): string {
  return type === "light" ? "ライト" : type === "coach" ? "コーチ" : type === "visitor" ? "ビジター" : "オフィシャル";
}

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
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  
  // キャンセル待ちの状態シミュレーション
  const [waitlistStatus, setWaitlistStatus] = useState<"none" | "waiting" | "notified" | "confirmed">("none");
  const [timer, setTimer] = useState(24 * 60 * 60); // 24時間 (秒)

  // フォーム状態
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [myMember, setMyMember] = useState<Member | null>(null);
  // 代理出欠登録（管理者・サポーター用）
  const [roster, setRoster] = useState<Member[]>([]);
  const [proxyMemberId, setProxyMemberId] = useState<string>("");
  const { user, role, loading, signInWithGoogle } = useAuth();
  const isVisitor = searchParams.get("role") === "visitor" && !user && !loading;

  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [relatedAnnouncements, setRelatedAnnouncements] = useState<AnnouncementData[]>([]);

  useEffect(() => {
    const unsubSettings = subscribeToClubSettings((data) => {
      setSettings(data);
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    getMemberByEmail(user.email).then(setMyMember);
  }, [user?.email]);

  const [selectedEventIndex, setSelectedEventIndex] = useState(0);

  // 同日に複数イベントがある場合、最初に選択するのは practice 優先
  useEffect(() => {
    const practiceIdx = events.findIndex(e => e.type === "practice");
    setSelectedEventIndex(practiceIdx >= 0 ? practiceIdx : 0);
  }, [events.map(e => e.id).join(",")]);

  // 出欠の購読
  const currentEvent = events[selectedEventIndex] ?? events[0];
  const eventId = currentEvent?.id ? String(currentEvent.id) : null;

  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = subscribeToAttendances(eventId, (data) => {
      setAttendances(data);
    });
    return () => unsubscribe();
  }, [eventId]);

  // この予定に紐づくお知らせを購読（相互リンク）。未ログイン時は読めないので購読しない。
  useEffect(() => {
    if (!eventId || !user) {
      setRelatedAnnouncements([]);
      return;
    }
    const unsub = subscribeToAnnouncements((items) => {
      setRelatedAnnouncements(items.filter((a) => a.relatedEventId === eventId));
    });
    return () => unsub();
  }, [eventId, user]);

  const currentUserAttendance = user
    ? attendances.find((a) =>
        (myMember ? a.memberId === String(myMember.id) : false) ||
        a.memberId === user.uid
      )
    : null;
  const myResponse = currentUserAttendance?.status || null;

  // コーチ（コーチ種別のメンバー）が「参加(attend)」しているか
  // 種別バッジ(membershipType==="coach")で判定。古い参加データ対策として名前一致も予備で残す
  const hasCoach = attendances.some(
    a => a.status === "attend" && (a.membershipType === "coach" || a.name === "渡辺 亜衣")
  );

  // 代理出欠登録ができるのは管理者・サポーターのみ
  const canProxy = role === "admin" || role === "supporter";

  // 最新の名簿（Firestore）を読み込む。
  // 代理登録の選択肢に使うほか、会員種別の変更履歴（membershipHistory）を見て
  // 「練習日の月時点の種別」で料金を正しく計算するために全ログインユーザーで読み込む。
  useEffect(() => {
    if (!user) return;
    getAllMembers()
      .then(ms => setRoster([...ms].sort((a, b) => a.id - b.id)))
      .catch(() => {});
  }, [user?.uid]);

  // 管理者・サポーターが、選んだメンバーの出欠を代理で登録/変更する
  const handleProxyRegister = async (status: AttendanceStatus) => {
    if (!canProxy || !eventId || !proxyMemberId) return;
    const m = roster.find(r => String(r.id) === proxyMemberId);
    if (!m) return;
    const adminName = myMember?.name ?? user?.displayName ?? "管理者";
    try {
      await setAttendance(eventId, String(m.id), m.name, status, `${adminName}（代理）`, m.membershipType);
      setProxyMemberId("");
    } catch (e) {
      console.error("代理登録エラー:", e);
      alert("代理登録に失敗しました。");
    }
  };

  // 料金・バッジ計算に使う会員種別を決める。優先順位：
  //  1. 名簿(Firestore)の種別変更履歴（練習日の月で判定）… 月単位の種別変更を正しく反映
  //  2. 出欠データに保存された種別（参加ボタンを押した時点のスナップショット）
  //  3. 名簿の現在の種別（Firestore → 静的名簿の順にフォールバック）
  const eventDateStr = `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  const resolveMemberForFee = (a: AttendanceData): Member | undefined => {
    const fsMember = roster.find(m => String(m.id) === a.memberId || m.name === a.name);
    const staticMember = memberList.find(m => String(m.id) === a.memberId || m.name === a.name);
    // Firestore の名簿に種別情報（membershipType か変更履歴）があるときだけ Firestore を使い、
    // 未設定なら静的名簿にフォールバックする（未設定→ビジター扱いになる誤表示を防ぐ）
    const rosterMember =
      fsMember && (fsMember.membershipType || fsMember.membershipHistory?.length)
        ? fsMember
        : (staticMember ?? fsMember);
    const resolvedType = resolveMembershipTypeForEvent(rosterMember, a.membershipType, eventDateStr);
    if (resolvedType) {
      return { ...(rosterMember ?? ({} as Member)), membershipType: resolvedType };
    }
    return rosterMember;
  };

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

  const richEvent = currentEvent; // 実際のFirestore EventDataを使用

  // BOOKING_SCHEDULE_RULES から各会員種別の予約開始日を計算
  const getBookingOpenDates = () => {
    const { officialOpenMonthsBefore, lightDelayDays, visitorDelayDays } = BOOKING_SCHEDULE_RULES;
    const eventDate = new Date(year, month - 1, date);

    // bookingConfig の publishedAt があればそれを優先
    const bc = richEvent.bookingConfig as
      | {
          publishedAt?: { toDate: () => Date };
          lightUnlockDelayDays?: number;
          visitorUnlockDelayDays?: number;
        }
      | undefined;
    let officialOpen: Date;
    let lightOpen: Date;
    let visitorOpen: Date;

    if (bc?.publishedAt?.toDate) {
      officialOpen = bc.publishedAt.toDate();
      lightOpen    = new Date(officialOpen.getTime() + (bc.lightUnlockDelayDays ?? lightDelayDays)   * 86400000);
      visitorOpen  = new Date(officialOpen.getTime() + (bc.visitorUnlockDelayDays ?? visitorDelayDays) * 86400000);
    } else {
      officialOpen = new Date(eventDate);
      officialOpen.setMonth(officialOpen.getMonth() - officialOpenMonthsBefore);
      lightOpen    = new Date(officialOpen.getTime() + lightDelayDays   * 86400000);
      visitorOpen  = new Date(officialOpen.getTime() + visitorDelayDays * 86400000);
    }
    return { officialOpen, lightOpen, visitorOpen };
  };

  const bookingDates = getBookingOpenDates();
  const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  // 予約受付ステータス
  const getRegistrationStatus = () => {
    const today = new Date();
    const { officialOpen, lightOpen, visitorOpen } = bookingDates;
    const label = (open: Date, name: string) => {
      if (today >= open) return { isOpen: true, message: `${name}：予約受付中` };
      const diffDays = Math.ceil((open.getTime() - today.getTime()) / 86400000);
      return { isOpen: false, message: `${name}：${fmtDate(open)}から受付開始（あと${diffDays}日）` };
    };
    if (userType === "regular") return label(officialOpen, "通常会員");
    if (userType === "light")   return label(lightOpen,    "ライト会員");
    return label(visitorOpen, "ビジター");
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

  return (
    <div className="bg-white rounded-3xl border border-ag-gray-200 shadow-2xl overflow-hidden animate-fade-in-up md:sticky md:top-24">
      {/* 同日複数イベントの切り替えタブ */}
      {events.length > 1 && (
        <div className="flex border-b border-ag-gray-100 bg-ag-gray-50">
          {events.map((evt, idx) => (
            <button
              key={evt.id}
              onClick={() => setSelectedEventIndex(idx)}
              className={`flex-1 px-3 py-2.5 text-[11px] font-black truncate transition-all ${
                selectedEventIndex === idx
                  ? "bg-white text-ag-gray-900 border-b-2 border-ag-lime-500 -mb-px"
                  : "text-ag-gray-400 hover:text-ag-gray-600"
              }`}
            >
              {evt.type === "practice" ? "🏸" : "📅"} {evt.title}
            </button>
          ))}
        </div>
      )}

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
              {richEvent.type === "practice" ? "🏸 練習" :
               richEvent.type === "match" ? "🏆 試合" :
               richEvent.type === "deadline" ? "⚠️ 申込締切" : "🎉 イベント"}
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
        <p className="text-xs opacity-80">{richEvent.location}{richEvent.time ? ` | ${richEvent.time}` : ""}</p>

        {/* 予約人数バーは練習・イベントのみ（試合・締切では参加管理しないため隠す） */}
        {(richEvent.type === "practice" || richEvent.type === "event") && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
               <div className="h-full bg-white" style={{ width: `${(actualAttendees / (richEvent.maxCapacity || 24)) * 100}%` }} />
            </div>
            <span className="text-[10px] font-bold whitespace-nowrap">{actualAttendees} / {richEvent.maxCapacity || 24} 名</span>
          </div>
        )}

        {/* Googleカレンダーに追加 */}
        <a
          href={buildGoogleCalendarUrl({
            title: richEvent.title,
            date: `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`,
            time: richEvent.time,
            location: richEvent.location,
            description: richEvent.description,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-black text-white transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Googleカレンダーに追加
        </a>
      </div>

      <div className="p-5 space-y-6">

        {/* 試合・締め切り：添付ファイル表示のみ */}
        {(richEvent.type === "match" || richEvent.type === "deadline") && (
          <div className="space-y-4">
            {richEvent.description && (
              <div className="bg-ag-gray-50 rounded-2xl px-4 py-3 text-sm text-ag-gray-700 leading-relaxed border border-ag-gray-100 whitespace-pre-wrap">
                {richEvent.description}
              </div>
            )}

            {richEvent.attachments && richEvent.attachments.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">添付ファイル・リンク</h4>
                {/* 画像はグリッド表示 */}
                {richEvent.attachments.some((a) => a.fileType === "image") && (
                  <div className="grid grid-cols-2 gap-2">
                    {richEvent.attachments.filter((a) => a.fileType === "image").map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-ag-gray-100">
                        <img src={att.url} alt={att.label} className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                        {att.label && <p className="text-[10px] font-bold text-ag-gray-600 px-2 py-1 truncate">{att.label}</p>}
                      </a>
                    ))}
                  </div>
                )}
                {/* PDF・URLはリスト表示 */}
                {richEvent.attachments.filter((a) => a.fileType !== "image").map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-ag-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                    <span className="text-xl shrink-0">{att.fileType === "pdf" ? "📄" : "🔗"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-ag-gray-800 group-hover:text-blue-700 truncate">{att.label || "開く"}</div>
                      <div className="text-[10px] text-ag-gray-400 truncate">{att.url}</div>
                    </div>
                    <span className="text-ag-gray-300 group-hover:text-blue-400 shrink-0">→</span>
                  </a>
                ))}
              </div>
            ) : !richEvent.description && (
              <div className="py-8 text-center text-ag-gray-400 text-xs font-bold">
                「設定・削除」から要綱・組み合わせ表などを添付できます。
              </div>
            )}
          </div>
        )}

        {/* 練習専用：予約解禁スケジュール・料金・参加者・ビジター登録 */}
        {richEvent.type === "practice" && (<>
        {/* 備考・詳細（入力があるときのみ表示） */}
        {richEvent.description && (
          <div className="bg-ag-gray-50 rounded-2xl px-4 py-3 text-sm text-ag-gray-700 leading-relaxed border border-ag-gray-100 whitespace-pre-wrap mb-4">
            {richEvent.description}
          </div>
        )}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">予約ステータス</h4>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${userType === "visitor" || regStatus.isOpen ? "bg-ag-lime-100 text-ag-lime-700" : "bg-ag-gray-100 text-ag-gray-400"}`}>
              {regStatus.message}
            </span>
          </div>

          {/* 予約開始スケジュール */}
          <div className="bg-ag-gray-50 rounded-2xl border border-ag-gray-100 p-3 space-y-1.5">
            <p className="text-[9px] font-black text-ag-gray-400 uppercase tracking-widest mb-2">予約開始スケジュール</p>
            {[
              { label: "通常会員", date: bookingDates.officialOpen, color: "text-ag-lime-700" },
              { label: "ライト会員", date: bookingDates.lightOpen, color: "text-sky-600" },
              { label: "ビジター",  date: bookingDates.visitorOpen, color: "text-ag-gray-500" },
            ].map(({ label, date, color }) => {
              const isOpen = new Date() >= date;
              return (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${color}`}>{label}</span>
                  <span className={`font-black ${isOpen ? "text-ag-lime-600" : "text-ag-gray-400"}`}>
                    {fmtDate(date)} 〜
                    {isOpen && <span className="ml-1.5 text-[9px] bg-ag-lime-100 text-ag-lime-700 px-1.5 py-0.5 rounded font-black">受付中</span>}
                  </span>
                </div>
              );
            })}
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
                           const memberId = myMember ? String(myMember.id) : user.uid;
                           const memberName = myMember?.name || user.displayName || "名称未設定";
                           const memberType = myMember?.membershipType;
                           await setAttendance(eventId, memberId, memberName, status, memberName, memberType);
                           // 古いUID形式のレコードを自動削除
                           if (myMember && memberId !== user.uid) {
                             const { deleteAttendance } = await import("@/lib/attendances");
                             await deleteAttendance(eventId, user.uid).catch(() => {});
                           }
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
                  const m = resolveMemberForFee(a);
                  return sum + calculateAttendanceFee(m, richEvent.time, settings, hasCoach).baseFee;
                }, 0);
              return (
                <span className="text-[10px] font-bold text-ag-gray-500 bg-ag-gray-50 px-2.5 py-1 rounded-lg border border-ag-gray-100 flex items-center justify-between">
                  本日の集金見込: <strong className="text-ag-lime-600 text-sm ml-2">¥{totalFees.toLocaleString()}</strong>
                </span>
              );
            })()}
          </div>

          {/* 代理出欠登録（管理者・サポーター専用）。操作が苦手なメンバーの分を代わりに登録/変更できる */}
          {canProxy && eventId && (
            <div className="p-3 bg-sky-50/60 rounded-2xl border border-sky-100 space-y-2">
              <p className="text-[11px] font-bold text-sky-700">代理で出欠を登録・変更（管理者・サポーター用）</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={proxyMemberId}
                  onChange={(e) => setProxyMemberId(e.target.value)}
                  className="flex-1 text-sm font-bold px-3 py-2 rounded-xl border-2 border-sky-200 bg-white text-ag-gray-800"
                >
                  <option value="">メンバーを選択…</option>
                  {roster.map(m => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}（{membershipShort(m.membershipType)}）
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  {practiceOptions.map(opt => (
                    <button
                      key={opt.value}
                      disabled={!proxyMemberId}
                      onClick={() => handleProxyRegister(opt.value as AttendanceStatus)}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-black border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${opt.color}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-ag-gray-50 border border-ag-gray-50 rounded-2xl overflow-hidden shadow-sm">
            {attendances
              .filter(a => a.status === "attend")
              .map(a => {
                const memberInfo = resolveMemberForFee(a);
                const effectiveType = memberInfo?.membershipType;
                const feeData = calculateAttendanceFee(memberInfo, richEvent.time, settings, hasCoach);

                return (
                  <div key={a.memberId} className="group p-3 flex items-center gap-3 hover:bg-ag-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] bg-ag-lime-50 text-ag-lime-600 border border-ag-lime-100 flex-shrink-0">
                      {a.name?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-ag-gray-800">{a.name}</span>
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                          effectiveType === "coach" ? "bg-amber-100 text-amber-700" :
                          effectiveType === "light" ? "bg-sky-50 text-sky-600" :
                          effectiveType === "official" ? "bg-ag-lime-50 text-ag-lime-600" :
                          "bg-ag-gray-100 text-ag-gray-500"
                        }`}>
                          {effectiveType === "coach" ? "コーチ" :
                           effectiveType === "official" ? "オフィシャル" :
                           effectiveType === "light" ? "ライト" : "ビジター"}
                        </span>
                        {a.updatedBy && a.updatedBy.includes("代理") && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-orange-100 text-orange-600" title={a.updatedBy}>代理</span>
                        )}
                      </div>
                      <p className="text-[9px] text-ag-gray-400 mt-0.5 truncate">{feeData.label}</p>
                    </div>
                    {/* 参加費の表示 */}
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        {feeData.baseFee > 0 ? (
                          <>
                            <div className="text-xs font-black text-ag-gray-800 font-mono">¥{feeData.baseFee.toLocaleString()}</div>
                            <div className="text-[8px] text-red-400 font-bold">当日払い</div>
                          </>
                        ) : (
                          <div className="text-xs font-bold text-ag-gray-400">¥0</div>
                        )}
                      </div>
                      {role === "admin" && eventId && (
                        <button
                          onClick={async () => {
                            if (!confirm(`「${a.name}」の出欠データを削除しますか？`)) return;
                            await deleteAttendance(eventId, a.memberId);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-ag-gray-300 hover:text-red-500 text-[10px] font-black px-1.5 py-1 rounded hover:bg-red-50 transition-all"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            {attendances.filter(a => a.status === "attend").length === 0 && (
              <div className="p-4 text-center text-xs text-ag-gray-400">まだ参加予定者がいません</div>
            )}
          </div>

          {/* 回答状況まとめ（不参加・保留・未回答も見えるようにする）。名簿は個人情報のためログイン中のみ */}
          {user && roster.length > 0 && (
            <AttendanceSummary roster={roster} attendances={attendances} />
          )}
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
        </>)}

        {/* イベント・試合：シンプルな参加エントリー（料金・予約解禁なし） */}
        {(richEvent.type === "event" || richEvent.type === "match") && eventId && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">参加エントリー</h4>
            {user ? (
              <div className="grid grid-cols-3 gap-2">
                {practiceOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={async () => {
                      const status = opt.value as AttendanceStatus;
                      const memberId = myMember ? String(myMember.id) : user.uid;
                      const memberName = myMember?.name || user.displayName || "名称未設定";
                      const memberType = myMember?.membershipType;
                      await setAttendance(eventId, memberId, memberName, status, memberName, memberType);
                      if (myMember && memberId !== user.uid) {
                        await deleteAttendance(eventId, user.uid).catch(() => {});
                      }
                      onResponseChange(Number(eventId), opt.value);
                    }}
                    className={`flex flex-col items-center gap-1 py-3 border-2 rounded-2xl transition-all ${myResponse === opt.value ? "bg-ag-lime-500 border-ag-lime-500 text-white shadow-lg" : "bg-white border-ag-gray-100 text-ag-gray-400 hover:border-ag-lime-200"}`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-[10px] font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-ag-lime-50 border border-ag-lime-100 rounded-2xl text-center">
                <p className="text-[11px] font-bold text-ag-lime-700 mb-2">エントリーするにはログインが必要です</p>
                <button
                  onClick={() => signInWithGoogle()}
                  className="w-full py-2 bg-ag-lime-500 text-white text-xs font-black rounded-lg shadow-sm hover:bg-ag-lime-600 transition-colors"
                >
                  Googleでログインしてエントリー
                </button>
              </div>
            )}

            {/* 参加予定者（人数と名前のみ。料金計算はしない） */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">参加予定者</h4>
                <span className="text-[10px] font-bold text-ag-gray-500 bg-ag-gray-50 px-2.5 py-1 rounded-lg border border-ag-gray-100">{actualAttendees}名</span>
              </div>
              <div className="divide-y divide-ag-gray-50 border border-ag-gray-50 rounded-2xl overflow-hidden shadow-sm">
                {attendances.filter((a) => a.status === "attend").map((a) => (
                  <div key={a.memberId} className="group p-3 flex items-center gap-3 hover:bg-ag-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] bg-ag-lime-50 text-ag-lime-600 border border-ag-lime-100 flex-shrink-0">{a.name?.[0] || "?"}</div>
                    <span className="text-xs font-bold text-ag-gray-800 flex-1 min-w-0 truncate">{a.name}</span>
                    {role === "admin" && (
                      <button
                        onClick={async () => {
                          if (!confirm(`「${a.name}」のエントリーを削除しますか？`)) return;
                          await deleteAttendance(eventId, a.memberId);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-ag-gray-300 hover:text-red-500 text-[10px] font-black px-1.5 py-1 rounded hover:bg-red-50 transition-all shrink-0"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
                {actualAttendees === 0 && (
                  <div className="p-4 text-center text-xs text-ag-gray-400">まだ参加予定者がいません</div>
                )}
              </div>

              {/* 回答状況まとめ（不参加・保留・未回答も見えるようにする） */}
              {user && roster.length > 0 && (
                <AttendanceSummary roster={roster} attendances={attendances} />
              )}
            </div>
          </div>
        )}

        {/* 関連するお知らせ（全種別共通・相互リンク） */}
        {relatedAnnouncements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">関連するお知らせ</h4>
            {relatedAnnouncements.map((a) => (
              <a
                key={a.id}
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border-2 border-ag-gray-100 hover:border-ag-lime-300 hover:bg-ag-lime-50 transition-all group"
              >
                <span className="text-lg shrink-0">📢</span>
                <span className="flex-1 min-w-0 text-sm font-black text-ag-gray-800 group-hover:text-ag-lime-700 truncate">{a.title}</span>
                <span className="text-ag-gray-300 group-hover:text-ag-lime-400 shrink-0">→</span>
              </a>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
