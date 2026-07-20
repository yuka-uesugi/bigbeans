"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { CalendarEvent } from "./CalendarGrid";
import VisitorRegistrationModal from "@/components/dashboard/VisitorRegistrationModal";
import VisitorCancelModal from "./VisitorCancelModal";
import AttendanceSummary from "./AttendanceSummary";
import { useAuth } from "@/contexts/AuthContext";
import { deleteAttendance } from "@/lib/attendances";
import { subscribeToAttendances, setAttendance, AttendanceData, AttendanceStatus } from "@/lib/attendances";
import { subscribeToReservations, getUnlockStage, type ReservationData, type ReservationMemberType } from "@/lib/reservations";
import { joinPractice, cancelParticipation, countOccupied } from "@/lib/participation";
import { saveVisitorContact } from "@/lib/visitorContacts";
import type { BookingConfig } from "@/lib/events";
import { subscribeToClubSettings, ClubSettings } from "@/lib/settings";
import { subscribeToAnnouncements, type AnnouncementData } from "@/lib/announcements";
import { calculateAttendanceFee } from "@/lib/fees";
import { resolveAttendanceMember, isLightAllAnswered } from "@/lib/membership";
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
  /** 前の予定日へジャンプ（未指定なら矢印を表示しない） */
  onJumpPrev?: () => void;
  /** 次の予定日へジャンプ（未指定なら矢印を表示しない） */
  onJumpNext?: () => void;
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
  onJumpPrev,
  onJumpNext,
}: EventDetailProps) {
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<"regular" | "light" | "visitor">("regular");
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  
  // フォーム状態
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  // ビジター本人の申し込み取り消し（サーバー経由で本人確認する）
  const [isVisitorCancelOpen, setIsVisitorCancelOpen] = useState(false);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
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
    setAttendances([]);
    setReservations([]);
    const unsubscribe = subscribeToAttendances(eventId, (data) => {
      setAttendances(data);
    });
    // 予約（キャンセル待ち・定員カウント用）も購読
    const unsubReservations = subscribeToReservations(eventId, (data) => {
      setReservations(data);
    });
    return () => {
      unsubscribe();
      unsubReservations();
    };
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
    const config = (currentEvent?.bookingConfig as BookingConfig | undefined) ?? null;
    const maxCapacity = currentEvent?.maxCapacity || 24;
    try {
      if (status === "attend") {
        // 参加は統一エンジン経由（予約(reservations)も一緒に記録する）。
        // ここを setAttendance だけで済ませると、予約データが作られないまま
        // 出欠だけが増える＝ビジター向け画面の人数（予約ベース）に反映されない
        // 不具合になる（2026-07-20に7/29の練習で発覚：出欠20名に対し予約3件）。
        const reservationType: ReservationMemberType =
          m.membershipType === "light" ? "light" : "official";
        const result = await joinPractice({
          eventId,
          attendanceId: String(m.id),
          uid: String(m.id),
          name: m.name,
          memberType: reservationType,
          membershipType: m.membershipType,
          registeredBy: `${adminName}（代理）`,
          config,
          maxCapacity,
          officialAnsweredCount,
          lightAllAnswered,
        });
        if (result.status === "waitlisted") {
          alert(`満員のため${m.name}さんをキャンセル待ちに登録しました。空きが出ると自動で参加確定になります。`);
        }
      } else {
        await setAttendance(eventId, String(m.id), m.name, status, `${adminName}（代理）`, m.membershipType);
        // 参加以外に変更した場合は予約側もキャンセルし、キャンセル待ちの繰り上げを回す
        await cancelParticipation(
          eventId,
          { attendanceId: String(m.id) },
          maxCapacity,
          config,
          { keepAttendance: true }
        ).catch(() => {});
      }
      setProxyMemberId("");
    } catch (e) {
      console.error("代理登録エラー:", e);
      alert(e instanceof Error ? e.message : "代理登録に失敗しました。");
    }
  };

  // 料金・バッジ計算に使う会員種別の解決は共通関数に一本化
  // （ダッシュボードの参加メンバー欄・本日の会計と同じ判定）
  const eventDateStr = `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  const resolveMemberForFee = (a: AttendanceData): Member | undefined => {
    const { member, effectiveType } = resolveAttendanceMember(a, roster, memberList, eventDateStr);
    return { ...(member ?? ({} as Member)), membershipType: effectiveType };
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

  // 各会員種別の予約開始日を bookingConfig（掲載時点が起点）から計算
  const getBookingOpenDates = () => {
    const { lightDelayDays, visitorDelayDays } = BOOKING_SCHEDULE_RULES;

    const bc = richEvent.bookingConfig as
      | {
          publishedAt?: { toDate: () => Date };
          lightUnlockDelayDays?: number;
          visitorUnlockDelayDays?: number;
        }
      | undefined;

    if (bc?.publishedAt?.toDate) {
      const officialOpen = bc.publishedAt.toDate();
      const lightOpen   = new Date(officialOpen.getTime() + (bc.lightUnlockDelayDays ?? lightDelayDays)   * 86400000);
      const visitorOpen = new Date(officialOpen.getTime() + (bc.visitorUnlockDelayDays ?? visitorDelayDays) * 86400000);
      return { officialOpen, lightOpen, visitorOpen };
    }

    // ルール未設定の練習（旧データなど）は解禁制限がないため全員「受付中」扱い
    const past = new Date(0);
    return { officialOpen: past, lightOpen: past, visitorOpen: past };
  };

  const bookingDates = getBookingOpenDates();
  const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  // 実際の参加者数（"attend" の人数。イベント・試合の表示用）
  const actualAttendees = attendances.filter(a => a.status === "attend").length;

  // ── 予約ルール関連（統一エンジン用） ──
  const bookingConfig = (richEvent.bookingConfig as BookingConfig | undefined) ?? null;
  const eventMaxCapacity = richEvent.maxCapacity || 24;

  // 埋まっている枠 ＝ 出欠の「参加」＋出欠に載っていない確定予約（ダッシュボードと同じ数え方）
  const occupiedCount = countOccupied(attendances, reservations);
  const isFull = occupiedCount >= eventMaxCapacity;

  // 解禁ステージ判定用：正会員の回答数（参加/欠席）
  const officialAnsweredCount = attendances.filter(a => {
    const m = roster.find(mm => String(mm.id) === String(a.memberId) || mm.name === a.name);
    const isOfficial = m?.membershipType === "official" || a.membershipType === "official";
    return isOfficial && (a.status === "attend" || a.status === "absent");
  }).length;

  // ビジター前倒し解禁判定用：ライト会員全員が回答済みか
  const lightAllAnswered = isLightAllAnswered(roster, attendances);

  // 実際の解禁ステージ。日数経過だけでなく「正会員全員回答でライト前倒し」
  // 「ライトも全員回答でビジター前倒し」を反映する（参加エンジンと同じ判定）。
  // ルール未設定の予定は従来どおり全員受付中扱い
  const unlockStage = bookingConfig
    ? getUnlockStage(bookingConfig, officialAnsweredCount, lightAllAnswered)
    : "visitor_unlocked";
  const lightOpenNow = unlockStage !== "official_only";
  const visitorOpenNow = unlockStage === "visitor_unlocked";

  // 予約受付ステータス（日付到来 or 前倒し解禁のどちらかで受付中）
  const getRegistrationStatus = () => {
    const today = new Date();
    const { officialOpen, lightOpen, visitorOpen } = bookingDates;
    const label = (open: Date, name: string, earlyOpen: boolean) => {
      if (earlyOpen || today >= open) return { isOpen: true, message: `${name}：予約受付中` };
      const diffDays = Math.ceil((open.getTime() - today.getTime()) / 86400000);
      return { isOpen: false, message: `${name}：${fmtDate(open)}から受付開始（あと${diffDays}日）` };
    };
    if (userType === "regular") return label(officialOpen, "通常会員", false);
    if (userType === "light")   return label(lightOpen,    "ライト会員", lightOpenNow);
    return label(visitorOpen, "ビジター", visitorOpenNow);
  };

  const regStatus = getRegistrationStatus();

  // 自分の予約（キャンセル待ち表示用）
  // ※ uid照合は会員本人の予約（正会員・ライト）に限定。旧データではビジター招待の
  //   予約に招待者のuidが入っており、自分の予約と混同してしまうため。
  const myReservation = user
    ? reservations.find(
        r =>
          r.status !== "cancelled" &&
          ((r.uid === user.uid && (r.memberType === "official" || r.memberType === "light")) ||
            (myMember && r.attendanceId === String(myMember.id)))
      )
    : undefined;
  const waitlistQueue = reservations
    .filter(r => r.status === "waitlisted")
    .sort((a, b) => a.reservedAt.toMillis() - b.reservedAt.toMillis());
  const myWaitlistPosition =
    myReservation?.status === "waitlisted"
      ? waitlistQueue.findIndex(r => r.id === myReservation.id) + 1
      : 0;

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
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md truncate">
              {richEvent.type === "practice" ? "🏸 練習" :
               richEvent.type === "match" ? "🏆 試合" :
               richEvent.type === "deadline" ? "⚠️ 申込締切" : "🎉 イベント"}
            </span>
            {/* 担当カード（会場を取った登録カードの団体名）。受付での支払いに使うため
                メンバー限定。ビジターには絶対に出さない。 */}
            {richEvent.responsibleTeam && !isVisitor && (
              <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-xl bg-black/25 border border-white/20 shrink-0">
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
        {/* 日付（曜日）＋ 前後の予定へのジャンプ */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {onJumpPrev ? (
            <button
              onClick={onJumpPrev}
              className="shrink-0 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-sm font-black transition-colors"
              aria-label="前の予定へ"
            >
              ← 前
            </button>
          ) : <span />}
          <span className="text-xl font-black tracking-wide">
            {month}月{date}日（{["日", "月", "火", "水", "木", "金", "土"][new Date(year, month - 1, date).getDay()]}）
          </span>
          {onJumpNext ? (
            <button
              onClick={onJumpNext}
              className="shrink-0 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-sm font-black transition-colors"
              aria-label="次の予定へ"
            >
              次 →
            </button>
          ) : <span />}
        </div>
        <h3 className="text-2xl font-black mb-1">{richEvent.title}</h3>
        <p className="text-xs opacity-80">{richEvent.location}{richEvent.time ? ` | ${richEvent.time}` : ""}</p>

        {/* 予約人数バーは練習・イベントのみ（試合・締切では参加管理しないため隠す） */}
        {(richEvent.type === "practice" || richEvent.type === "event") && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
               <div className="h-full bg-white" style={{ width: `${((richEvent.type === "practice" ? occupiedCount : actualAttendees) / eventMaxCapacity) * 100}%` }} />
            </div>
            <span className="text-[10px] font-bold whitespace-nowrap">{richEvent.type === "practice" ? occupiedCount : actualAttendees} / {eventMaxCapacity} 名</span>
          </div>
        )}

        {/* Googleカレンダーに追加 */}
        <a
          href={buildGoogleCalendarUrl({
            title: richEvent.title,
            date: `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`,
            time: richEvent.time,
            location: richEvent.location,
            // 備考はメンバー限定。ビジターが追加したカレンダーに残らないようにする
            description: isVisitor ? undefined : richEvent.description,
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
            {richEvent.description && !isVisitor && (
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
        {/* 備考・詳細（入力があるときのみ表示）。内輪の連絡が含まれるためメンバー限定 */}
        {richEvent.description && !isVisitor && (
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
              { label: "通常会員", date: bookingDates.officialOpen, color: "text-ag-lime-700", earlyOpen: false },
              { label: "ライト会員", date: bookingDates.lightOpen, color: "text-sky-600", earlyOpen: lightOpenNow },
              { label: "ビジター",  date: bookingDates.visitorOpen, color: "text-ag-gray-500", earlyOpen: visitorOpenNow },
            ].map(({ label, date, color, earlyOpen }) => {
              const dateReached = new Date() >= date;
              const isOpen = dateReached || earlyOpen;
              return (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${color}`}>{label}</span>
                  <span className={`font-black ${isOpen ? "text-ag-lime-600" : "text-ag-gray-400"}`}>
                    {fmtDate(date)} 〜
                    {isOpen && (
                      <span className="ml-1.5 text-[9px] bg-ag-lime-100 text-ag-lime-700 px-1.5 py-0.5 rounded font-black">
                        {dateReached ? "受付中" : "前倒しで受付中"}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
            {(lightOpenNow || visitorOpenNow) && new Date() < bookingDates.visitorOpen && (
              <p className="text-[9px] font-bold text-ag-gray-400 pt-1">
                ※ 全員回答がそろうと、予定日より早く次の会員種別に開放されます
              </p>
            )}
          </div>

          {myReservation?.status === "waitlisted" ? (
             <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-3xl text-center">
                <p className="text-sm font-black text-amber-700 mb-1">⏳ キャンセル待ち中（{myWaitlistPosition}番目）</p>
                <p className="text-[10px] text-amber-600 mb-4">
                  空きが出ると自動で参加確定になります。
                </p>
                <button
                  onClick={async () => {
                    if (!eventId || !confirm("キャンセル待ちをやめますか？")) return;
                    await cancelParticipation(
                      eventId,
                      { reservationId: myReservation.id },
                      eventMaxCapacity,
                      bookingConfig
                    ).catch(() => alert("処理に失敗しました"));
                  }}
                  className="w-full py-3 bg-white text-amber-700 border-2 border-amber-300 rounded-2xl font-black text-xs transition-transform active:scale-95"
                >
                  キャンセル待ちをやめる
                </button>
             </div>
          ) : regStatus.isOpen ? (
             <div className="space-y-3">
               {isFull && myResponse !== "attend" && (
                 <div className="p-3 bg-ag-gray-900 text-white rounded-2xl text-center text-xs font-black">
                   🈵 満員です。「参加」を押すとキャンセル待ちに登録されます（空きが出ると自動確定）
                 </div>
               )}
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
                           try {
                             if (status === "attend") {
                               // 参加は統一エンジン経由（解禁・定員チェック＋予約と出欠の両方に記録）
                               const reservationType: ReservationMemberType =
                                 memberType === "light" ? "light" : "official";
                               const result = await joinPractice({
                                 eventId,
                                 attendanceId: memberId,
                                 uid: user.uid,
                                 name: memberName,
                                 memberType: reservationType,
                                 membershipType: memberType,
                                 config: bookingConfig,
                                 maxCapacity: eventMaxCapacity,
                                 officialAnsweredCount,
                                 lightAllAnswered,
                               });
                               if (result.status === "waitlisted") {
                                 alert("満員のためキャンセル待ちに登録しました。空きが出ると自動で参加確定になります。");
                               }
                             } else {
                               await setAttendance(eventId, memberId, memberName, status, memberName, memberType);
                               // 参加をやめた場合は予約側もキャンセルし、キャンセル待ちの繰り上げを回す
                               await cancelParticipation(
                                 eventId,
                                 { attendanceId: memberId, uid: user.uid },
                                 eventMaxCapacity,
                                 bookingConfig,
                                 { keepAttendance: true }
                               ).catch(() => {});
                             }
                             // 古いUID形式のレコードを自動削除
                             if (myMember && memberId !== user.uid) {
                               const { deleteAttendance } = await import("@/lib/attendances");
                               await deleteAttendance(eventId, user.uid).catch(() => {});
                             }
                             onResponseChange(Number(eventId), opt.value);
                           } catch (e) {
                             alert(e instanceof Error ? e.message : "登録に失敗しました");
                           }
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

               {/* 申し込みの取り消し。「参加」を押す場所とセットで見えるよう、すぐ下に大きく置く */}
               {isVisitor && eventId && (
                 <div className="p-4 bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl">
                   <p className="text-sm font-bold text-ag-gray-600 mb-2.5 leading-relaxed">
                     申し込みずみの方で、来られなくなったときはこちら
                   </p>
                   <button
                     onClick={() => setIsVisitorCancelOpen(true)}
                     className="w-full py-3.5 bg-white text-ag-gray-700 border-2 border-ag-gray-400 rounded-xl text-base font-black hover:bg-ag-gray-100 transition-colors"
                   >
                     申し込みを取り消す
                   </button>
                 </div>
               )}

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
                  const base = calculateAttendanceFee(m, richEvent.time, settings, hasCoach).baseFee;
                  // 当日会計で手動修正された金額があればそちらを使う
                  return sum + (a.feeOverride ?? base);
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
                // 当日会計で手動修正された金額があればそちらを表示する
                const displayFee = a.feeOverride ?? feeData.baseFee;

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
                        {displayFee > 0 ? (
                          <>
                            <div className="text-xs font-black text-ag-gray-800 font-mono">¥{displayFee.toLocaleString()}</div>
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
                            // 予約もあればキャンセルし、キャンセル待ちの繰り上げを回す
                            await cancelParticipation(
                              eventId,
                              { attendanceId: a.memberId },
                              eventMaxCapacity,
                              bookingConfig
                            );
                            await deleteAttendance(eventId, a.memberId).catch(() => {});
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

        {/* 取り消しモーダル本体。ボタンは上の参加ボタンのすぐ下に置いてある */}
        {eventId && (
          <VisitorCancelModal
            isOpen={isVisitorCancelOpen}
            onClose={() => setIsVisitorCancelOpen(false)}
            eventId={String(eventId)}
            eventTitle={richEvent.title}
          />
        )}

        <VisitorRegistrationModal
          isOpen={isVisitorModalOpen}
          onClose={() => setIsVisitorModalOpen(false)}
          isVisitorMode={isVisitor}
          defaultIntroducer={user?.displayName || ""}
          onSubmit={async (visitor) => {
            if (!eventId) return;
            const visitorId = `visitor-${Date.now()}`;
            // メンバーからの招待なら invited 扱い（解禁タイミングが招待者に準ずる）
            let memberType: ReservationMemberType = "visitor";
            if (user && myMember) {
              memberType = myMember.membershipType === "light" ? "invited_light" : "invited_official";
            }
            try {
              // 統一エンジン経由で登録（解禁・定員チェック付き。ルール未設定なら出欠のみ）
              const result = await joinPractice({
                eventId,
                attendanceId: visitorId,
                uid: visitorId,
                name: visitor.name,
                memberType,
                invitedBy: visitor.invitedBy || undefined,
                rank: visitor.rank as "A" | "B" | "C",
                ageGroup: visitor.ageGroup,
                teamName: visitor.teamName || undefined,
                registeredBy: visitor.invitedBy || user?.displayName || "Guest",
                config: bookingConfig,
                maxCapacity: eventMaxCapacity,
                officialAnsweredCount,
                lightAllAnswered,
              });
              // 連絡先は予約(誰でも読める)ではなく専用コレクションに分けて保存する
              if (visitor.email.trim()) {
                await saveVisitorContact({
                  id: visitorId,
                  name: visitor.name,
                  email: visitor.email.trim(),
                  eventId,
                });
              }
              // ビジター本人の申し込みは運営へ通知する（メンバーの代理登録は本人が把握しているので送らない）。
              // お知らせ目的なので、失敗しても登録は成立させる
              if (isVisitor) {
                fetch("/api/notify-reservation", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ eventId, name: visitor.name }),
                }).catch(() => {});
              }
              if (result.status === "waitlisted") {
                alert(`満員のため${visitor.name}さんをキャンセル待ちに登録しました。空きが出ると自動で参加確定になります。`);
              } else {
                alert(`${visitor.name}さんの参加登録を受け付けました！`);
              }
            } catch (e) {
              alert(e instanceof Error ? e.message : "登録に失敗しました");
            }
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
