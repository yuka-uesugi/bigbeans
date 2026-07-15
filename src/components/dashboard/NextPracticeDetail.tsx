"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import PracticeGrouping, { Participant } from "./PracticeGrouping";
import ParticipantList from "./ParticipantList";
import VisitorRegistrationModal from "./VisitorRegistrationModal";
import { getUpcomingPractices, EventData } from "@/lib/events";
import { subscribeToAttendances, AttendanceData } from "@/lib/attendances";
import { subscribeToMembers, getMemberByEmail } from "@/lib/members";
import { subscribeToClubSettings, type ClubSettings } from "@/lib/settings";
import { Member, memberList as staticMemberList } from "@/data/memberList";
import { resolveAttendanceMember } from "@/lib/membership";
import {
  subscribeToReservations,
  createReservation,
  cancelReservation,
  getUnlockStage,
  getUnlockStatusText,
  type ReservationData,
  type ReservationMemberType,
} from "@/lib/reservations";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";

function getTransportInfo(location: string) {
  const loc = location || "";
  let fee = 0;
  let coach = "要確認";

  if (loc.includes("都筑") || loc.includes("仲町台") || loc.includes("北山田") || loc.includes("美し西")) coach = "上杉";
  else if (loc.includes("中川西") || loc.includes("青葉SC")) coach = "五十嵐";
  else if (loc.includes("中山") || loc.includes("緑") || loc.includes("小机") || loc.includes("十日市場") || loc.includes("港北") || loc.includes("神奈川")) coach = "冨岡";
  else if (loc.includes("藤ヶ丘")) coach = "伊藤";
  else if (loc.includes("白山")) coach = "上前";
  else if (loc.includes("長津田")) coach = "播川";

  if (loc.includes("都筑") || loc.includes("仲町台") || loc.includes("中川西") || loc.includes("北山田") || loc.includes("中山") || loc.includes("緑") || loc.includes("青葉")) fee = 200;
  else if (loc.includes("藤ヶ丘") || loc.includes("白山") || loc.includes("小机") || loc.includes("十日市場") || loc.includes("美し西") || loc.includes("長津田")) fee = 300;
  else if (loc.includes("港北") || loc.includes("神奈川")) fee = 400;

  return { coach, fee };
}

const STAGE_BADGE: Record<string, { label: string; color: string }> = {
  official_only:    { label: "正会員のみ予約可", color: "bg-purple-100 text-purple-700 border-purple-200" },
  light_unlocked:   { label: "ライト会員まで解禁", color: "bg-sky-100 text-sky-700 border-sky-200" },
  visitor_unlocked: { label: "全員に開放中", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface NextPracticeDetailProps {
  /**
   * 表示中の練習が変わったときに親へ通知。BalanceCard 等と同期するため
   */
  onActiveEventChange?: (eventId: string | null) => void;
}

export default function NextPracticeDetail({ onActiveEventChange }: NextPracticeDetailProps = {}) {
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [upcomingPractices, setUpcomingPractices] = useState<EventData[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [dbMembers, setDbMembers] = useState<Member[]>([]);
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [myMember, setMyMember] = useState<Member | null>(null);
  const [isSelfBooking, setIsSelfBooking] = useState(false);

  // コート割ツール（利用頻度が低いため普段は折りたたみ）
  const [isCourtToolOpen, setIsCourtToolOpen] = useState(false);
  // 一度開いたら閉じても中身は保持する（コート配置が消えないように）
  const [courtToolMounted, setCourtToolMounted] = useState(false);

  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isVisitorMode = searchParams.get("role") === "visitor" && !user;

  // 表示中の練習
  const nextPractice = upcomingPractices[practiceIndex] ?? null;

  // 親に表示中の練習を通知（BalanceCard と同期）
  useEffect(() => {
    onActiveEventChange?.(nextPractice?.id ?? null);
  }, [nextPractice?.id, onActiveEventChange]);

  useEffect(() => {
    async function load() {
      const practices = await getUpcomingPractices(5);
      setUpcomingPractices(practices);
      setLoading(false);
    }
    load();

    const unsubMembers = subscribeToMembers((data) => setDbMembers(data));
    const unsubSettings = subscribeToClubSettings((settings) => setClubSettings(settings));

    return () => {
      unsubMembers();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    getMemberByEmail(user.email).then(setMyMember);
  }, [user?.email]);

  // 練習が切り替わったら出欠・予約をリセットして再購読
  useEffect(() => {
    if (!nextPractice?.id) return;
    setAttendances([]);
    setReservations([]);
    const unsubAttendances = subscribeToAttendances(nextPractice.id, (data) => {
      setAttendances(data);
    });
    const unsubReservations = subscribeToReservations(nextPractice.id, (data) => {
      setReservations(data);
    });
    return () => {
      unsubAttendances();
      unsubReservations();
    };
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

  // ── 予約システム情報 ──
  const config = nextPractice.bookingConfig;
  const maxCapacity = nextPractice.maxCapacity || 21;

  // 正会員の回答数（アンロックステージ判定用）
  const officialAnsweredCount = attendances.filter(a => {
    const m = dbMembers.find(
      member => String(member.id) === String(a.memberId) || member.name === a.name
    );
    const isOfficial =
      m?.membershipType === "official" || a.membershipType === "official";
    return isOfficial && (a.status === "attend" || a.status === "absent");
  }).length;

  const stage = config ? getUnlockStage(config, officialAnsweredCount) : "official_only";
  const unlockStatusText = config ? getUnlockStatusText(stage, config, officialAnsweredCount) : null;
  const stageBadge = STAGE_BADGE[stage];

  // 予約カウント（bookingConfig があれば予約システムを使用、なければ出欠で代替）
  const confirmedReservations = reservations.filter(r => r.status === "confirmed");
  const waitlistedReservations = reservations.filter(r => r.status === "waitlisted");
  const useReservations = !!config;

  const displayCount = useReservations
    ? confirmedReservations.length
    : attendances.filter(a => a.status === "attend").length;

  const pct = Math.min((displayCount / maxCapacity) * 100, 100);

  // ── 出欠（メンバー管理用） ──
  const attendingTotal = attendances.filter(a => a.status === "attend");

  const dateObj = new Date(nextPractice.date + "T00:00:00");
  const dayStr = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

  const { coach, fee } = getTransportInfo(nextPractice.location);

  const participants: Participant[] = attendingTotal.map((a) => {
    // 会計・カレンダーと同じ共通関数で種別を解決（練習日の月×種別履歴＋静的名簿フォールバック）
    const { effectiveType } = resolveAttendanceMember(a, dbMembers, staticMemberList, nextPractice.date);
    return {
      id: String(a.memberId),
      name: a.name,
      membershipType: effectiveType
    };
  });

  const currentDutyTeam = clubSettings?.dutyTeams?.find(t => t.months.includes(dateObj.getMonth() + 1))?.members.join("・") || "未定";

  // ── 予約ボタンの表示 ──
  // ビジターモード or ログイン済みメンバー どちらも表示
  const bookingButtonLabel = isVisitorMode ? "✨ 参加表明" : "＋ 代理登録";

  // ── 自分の予約 ──
  const myReservation = user
    ? reservations.find(r => r.uid === user.uid && r.status !== "cancelled")
    : undefined;
  const myMemberType: ReservationMemberType =
    myMember?.membershipType === "light" ? "light" : "official";

  return (
    <div className="rounded-3xl overflow-hidden border border-ag-gray-100 shadow-2xl bg-white">

      {/* ━━━━━ ① ヒーローヘッダー ━━━━━ */}
      <div className="bg-gradient-to-br from-ag-lime-500 via-emerald-500 to-teal-600 text-white px-6 pt-6 pb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                {practiceIndex === 0 ? "NEXT PRACTICE" : `UPCOMING ${practiceIndex + 1}`}
              </span>
              {/* 戻る・進むボタン */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPracticeIndex(i => Math.max(0, i - 1))}
                  disabled={practiceIndex === 0}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="前の練習"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-black text-white/80">{practiceIndex + 1} / {upcomingPractices.length}</span>
                <button
                  onClick={() => setPracticeIndex(i => Math.min(upcomingPractices.length - 1, i + 1))}
                  disabled={practiceIndex >= upcomingPractices.length - 1}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="次の練習"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <h2 className="text-4xl font-black leading-none tracking-tight">
                {formattedDate}<span className="text-2xl text-white/70 ml-1">（{dayStr}）</span>
              </h2>
              {/* 練習当番 (PC版) */}
              <div className="hidden sm:flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 bg-white/20 rounded-xl px-4 py-2 shadow-sm border border-white/10 mt-2 sm:mt-0">
                <span className="text-xs font-bold text-white/80">📋 練習当番</span>
                <span className="text-lg font-black tracking-wide text-white">{nextPractice.dutyMembers?.length ? nextPractice.dutyMembers.join("・") : currentDutyTeam}</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/calendar" className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors shrink-0">
            全予定 →
          </Link>
        </div>

        {/* 練習当番 (スマホ用) */}
        <div className="sm:hidden mb-4 flex flex-col items-center justify-center gap-1 bg-white/20 rounded-xl px-4 py-2.5 shadow-sm border border-white/10">
          <span className="text-xs font-bold text-white/80">📋 今月の練習当番</span>
          <span className="text-lg font-black tracking-wide text-white">{nextPractice.dutyMembers?.length ? nextPractice.dutyMembers.join("・") : currentDutyTeam}</span>
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

        {/* 予約解禁ステータス */}
        {unlockStatusText && (
          <div className="mb-3 flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 text-sm font-bold text-white/90">
            <span>🔓</span>
            <span>{unlockStatusText}</span>
          </div>
        )}

        {/* 定員バー */}
        <div>
          <div className="flex justify-between text-base text-white/90 mb-2 font-black tracking-wide">
            <span>
              {useReservations ? "予約状況" : "参加状況"}：{displayCount}名
              {waitlistedReservations.length > 0 && (
                <span className="ml-2 text-sm text-white/70">（キャンセル待ち {waitlistedReservations.length}名）</span>
              )}
            </span>
            <span className="text-white font-black text-xl">{displayCount} / {maxCapacity}名</span>
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

      {/* 解禁ステージバッジ */}
      {config && (
        <div className={`px-5 py-2.5 border-b flex items-center gap-2 text-xs font-black ${stageBadge.color} border-current/20`}>
          <span className="text-sm">🏷</span>
          <span>{stageBadge.label}</span>
          {waitlistedReservations.length > 0 && (
            <span className="ml-auto text-xs font-bold opacity-70">
              キャンセル待ち {waitlistedReservations.length}名
            </span>
          )}
        </div>
      )}

      {/* 特記事項 */}
      {nextPractice.description && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <span className="text-lg">📣</span>
          <p className="text-sm text-amber-700 font-bold leading-relaxed">{nextPractice.description}</p>
        </div>
      )}

      {/* Googleカレンダーに追加 */}
      <div className="px-5 py-3 bg-white border-b border-ag-gray-100 flex items-center justify-end">
        <a
          href={buildGoogleCalendarUrl({
            title: nextPractice.title || `練習 (${nextPractice.location})`,
            date: nextPractice.date,
            time: nextPractice.time,
            location: nextPractice.location,
            description: nextPractice.description,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-ag-gray-50 border-2 border-ag-gray-200 hover:border-ag-lime-300 rounded-xl text-xs font-black text-ag-gray-700 transition-colors"
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

      {/* エラー表示 */}
      {bookingError && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-red-700 font-bold">{bookingError}</p>
          <button onClick={() => setBookingError(null)} className="ml-auto text-red-400 hover:text-red-600 font-black">✕</button>
        </div>
      )}

      {/* ━━━━━ 自分の予約 ━━━━━ */}
      {user && config && (
        <div className="px-5 py-4 border-b border-ag-gray-100">
          {myReservation ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0
                  ${myReservation.status === "confirmed" ? "bg-ag-lime-100" : "bg-amber-100"}`}>
                  {myReservation.status === "confirmed" ? "✅" : "⏳"}
                </div>
                <div>
                  <p className="text-sm font-black text-ag-gray-800">
                    {myReservation.status === "confirmed" ? "予約確定済み" : "キャンセル待ち"}
                  </p>
                  <p className="text-xs font-bold text-ag-gray-400">{user.displayName}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("予約をキャンセルしますか？")) return;
                  setIsSelfBooking(true);
                  try {
                    await cancelReservation(nextPractice.id, myReservation.id, maxCapacity, config);
                  } catch {
                    setBookingError("キャンセルに失敗しました");
                  } finally {
                    setIsSelfBooking(false);
                  }
                }}
                disabled={isSelfBooking}
                className="px-4 py-2 text-xs font-black text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition-all disabled:opacity-50"
              >
                {isSelfBooking ? "処理中..." : "キャンセルする"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-ag-gray-800">{user.displayName} として参加する</p>
                <p className="text-xs font-bold text-ag-gray-400">
                  {myMemberType === "light" ? "ライト会員" : "正会員"}
                  {stage === "official_only" && myMemberType === "light" && (
                    <span className="text-amber-500 ml-1">（まだ解禁前）</span>
                  )}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!user || !nextPractice?.id) return;
                  setIsSelfBooking(true);
                  setBookingError(null);
                  try {
                    const memberName = myMember?.name || user.displayName || "名無し";
                    const result = await createReservation(
                      nextPractice.id,
                      { uid: user.uid, name: memberName, memberType: myMemberType },
                      stage,
                      maxCapacity,
                      config
                    );
                    if (result.status === "confirmed") {
                      // 出欠システムと連動（未回答から消す）
                      const { setAttendance } = await import("@/lib/attendances");
                      const memberId = myMember ? String(myMember.id) : user.uid;
                      await setAttendance(
                        nextPractice.id,
                        memberId,
                        memberName,
                        "attend",
                        memberName,
                        myMemberType === "light" ? "light" : "official"
                      );
                      // ※ 参加費は「予約した時点」では家計簿に記録しない。
                      //   実際に集金できたら、ダッシュボード「本日の会計」の回収リストで
                      //   現金/PayPayを選んでチェック → 精算確定で家計簿へ反映する。
                      //   （予約時に自動記録すると、未払いなのに反映される・常に現金になる
                      //    という不整合が起きるため廃止）
                    } else {
                      setBookingError("定員に達しているためキャンセル待ちに追加されました。空きが出ると自動で確定されます。");
                    }
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : "不明なエラー";
                    setBookingError(`予約に失敗しました: ${msg}`);
                  } finally {
                    setIsSelfBooking(false);
                  }
                }}
                disabled={isSelfBooking || (stage === "official_only" && myMemberType === "light")}
                className="px-5 py-3 bg-ag-lime-500 hover:bg-ag-lime-600 disabled:bg-ag-gray-200 disabled:text-ag-gray-400 text-white text-sm font-black rounded-2xl shadow-sm transition-all active:scale-95"
              >
                {isSelfBooking ? "処理中..." : "＋ 参加する"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━ ② 参加者管理パネル ━━━━━ */}
      <div className="p-5 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-ag-gray-100">
          <h3 className="text-xl font-black text-ag-gray-800 flex items-center gap-2">
            本日の参加メンバー
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBookingError(null);
                setIsVisitorModalOpen(true);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all active:scale-95
                ${isVisitorMode
                  ? "bg-sky-500 text-white hover:bg-sky-600 ring-4 ring-sky-100"
                  : "bg-white text-sky-600 hover:bg-sky-50 border-2 border-sky-200"}`}
            >
              <span>{bookingButtonLabel}</span>
            </button>
          </div>
        </div>

        {/* 参加メンバー一覧（毎回使う機能なので常時表示） */}
        <ParticipantList
          participants={participants}
          onRemoveParticipant={async (id) => {
            if (!nextPractice?.id) return;
            const { deleteAttendance } = await import("@/lib/attendances");
            await deleteAttendance(nextPractice.id, id);
          }}
        />

        {/* ━━━━━ コート割ツール（利用頻度が低いため下部に折りたたみ配置） ━━━━━ */}
        <div className="mt-8 pt-5 border-t-2 border-ag-gray-100">
          <button
            onClick={() => {
              setCourtToolMounted(true);
              setIsCourtToolOpen((prev) => !prev);
            }}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border-2 border-ag-gray-200 bg-ag-gray-50 hover:bg-ag-gray-100 transition-all active:scale-[0.99]"
          >
            <span className="text-left">
              <span className="block text-lg font-black text-ag-gray-800">コート割ツール</span>
              <span className="block text-sm font-bold text-ag-gray-500 mt-0.5">
                体育館でカードを忘れた時などに使えます
              </span>
            </span>
            <span className="flex-shrink-0 text-base font-black text-ag-gray-700 bg-white border-2 border-ag-gray-200 px-4 py-2 rounded-xl">
              {isCourtToolOpen ? "閉じる ▲" : "開く ▼"}
            </span>
          </button>

          {courtToolMounted && (
            <div className={isCourtToolOpen ? "" : "hidden"}>
              <PracticeGrouping
                initialParticipants={participants}
                onRemoveParticipant={async (id) => {
                  if (!nextPractice?.id) return;
                  const { deleteAttendance } = await import("@/lib/attendances");
                  await deleteAttendance(nextPractice.id, id);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ビジター登録モーダル */}
      <VisitorRegistrationModal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        isVisitorMode={isVisitorMode}
        defaultIntroducer={user?.displayName || ""}
        onSubmit={async (visitor) => {
          if (!nextPractice?.id) return;

          if (!config) {
            // bookingConfig未設定時は従来の出欠登録にフォールバック
            const { setAttendance } = await import("@/lib/attendances");
            await setAttendance(
              nextPractice.id,
              `visitor-${Date.now()}`,
              `[V] ${visitor.name}`,
              "attend",
              visitor.invitedBy || "Guest"
            );
            setIsVisitorModalOpen(false);
            return;
          }

          // 登録者のメンバータイプを判定
          let memberType: ReservationMemberType = "visitor";
          if (user && !isVisitorMode) {
            const m = dbMembers.find(
              member =>
                member.name === user.displayName ||
                String(member.id) === user.uid
            );
            memberType = m?.membershipType === "light" ? "invited_light" : "invited_official";
          }

          try {
            const result = await createReservation(
              nextPractice.id,
              {
                uid: user?.uid || `visitor-${Date.now()}`,
                name: visitor.name,
                memberType,
                invitedBy: visitor.invitedBy || undefined,
                rank: visitor.rank as "A" | "B" | "C",
                ageGroup: visitor.ageGroup,
                teamName: visitor.teamName || undefined,
              },
              stage,
              maxCapacity,
              config
            );

            if (result.status === "waitlisted") {
              alert(`${visitor.name}さんをキャンセル待ちリストに追加しました。定員に空きが出た際に自動的に確定されます。`);
            } else {
              alert(`${visitor.name}さんの予約が確定しました！`);
              // ※ ビジター参加費も予約確定時には家計簿へ記録しない。
              //   実際の集金は「本日の会計」回収リストで現金/PayPayを選んで行い、
              //   精算確定で家計簿へ反映する（未払い反映・現金固定の不整合を防止）。
            }
            setIsVisitorModalOpen(false);
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "不明なエラー";
            setBookingError(`登録に失敗しました: ${msg}`);
          }
        }}
      />

    </div>
  );
}
