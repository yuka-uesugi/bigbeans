"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllEvents, updateBookingConfig, type EventData } from "@/lib/events";
import {
  subscribeToReservations,
  cancelReservation,
  deleteReservation,
  getUnlockStage,
  getUnlockStatusText,
  promoteWaitlistedAfterUnlock,
  type ReservationData,
  type UnlockStage,
} from "@/lib/reservations";
import { subscribeToAttendances, type AttendanceData } from "@/lib/attendances";
import { subscribeToMembers } from "@/lib/members";
import type { Unsubscribe } from "firebase/firestore";
import type { Member } from "@/data/memberList";

// ─────────────────────────────────────────────
// 定数・ヘルパー
// ─────────────────────────────────────────────

const MEMBER_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  official:         { label: "正会員",         color: "bg-purple-100 text-purple-700" },
  light:            { label: "ライト",          color: "bg-sky-100 text-sky-700" },
  invited_official: { label: "招待(正)",        color: "bg-violet-100 text-violet-700" },
  invited_light:    { label: "招待(ライト)",    color: "bg-indigo-100 text-indigo-700" },
  visitor:          { label: "ビジター",        color: "bg-amber-100 text-amber-700" },
};

const STATUS_STYLE: Record<string, { label: string; dot: string; text: string }> = {
  confirmed:  { label: "確定",       dot: "bg-emerald-500", text: "text-emerald-700" },
  waitlisted: { label: "キャンセル待ち", dot: "bg-amber-400",   text: "text-amber-700"   },
  cancelled:  { label: "キャンセル済み", dot: "bg-ag-gray-300", text: "text-ag-gray-400"  },
};

const STAGE_INFO: Record<UnlockStage, { label: string; color: string }> = {
  official_only:    { label: "正会員のみ",       color: "bg-purple-100 text-purple-700 border-purple-200" },
  light_unlocked:   { label: "ライトまで解禁",   color: "bg-sky-100 text-sky-700 border-sky-200" },
  visitor_unlocked: { label: "全員開放中",        color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${day}）`;
}

function formatTimestamp(ts: { toDate: () => Date } | undefined) {
  if (!ts) return "-";
  const d = ts.toDate();
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────
// イベントカード（展開で予約一覧）
// ─────────────────────────────────────────────

function EventReservationCard({
  event,
  dbMembers,
  isAdmin,
}: {
  event: EventData;
  dbMembers: Member[];
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [unlockSaving, setUnlockSaving] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const unsubR = subscribeToReservations(event.id, setReservations);
    const unsubA = subscribeToAttendances(event.id, setAttendances);
    return () => { unsubR(); unsubA(); };
  }, [expanded, event.id]);

  const config = event.bookingConfig;
  const maxCapacity = event.maxCapacity || 21;

  const officialAnsweredCount = attendances.filter(a => {
    const m = dbMembers.find(
      mb => String(mb.id) === String(a.memberId) || mb.name === a.name
    );
    return (m?.membershipType === "official" || a.membershipType === "official") &&
      (a.status === "attend" || a.status === "absent");
  }).length;

  const stage: UnlockStage = config ? getUnlockStage(config, officialAnsweredCount) : "official_only";
  const stageInfo = STAGE_INFO[stage];

  const confirmed = reservations.filter(r => r.status === "confirmed");
  const waitlisted = reservations.filter(r => r.status === "waitlisted");
  const cancelled = reservations.filter(r => r.status === "cancelled");
  const pct = Math.min((confirmed.length / maxCapacity) * 100, 100);

  const handleCancel = async (r: ReservationData) => {
    if (!config) return;
    if (!confirm(`${r.name}さんの予約をキャンセルしますか？\nキャンセル待ちがいれば自動で繰り上がります。`)) return;
    setProcessing(r.id);
    try {
      await cancelReservation(event.id, r.id, maxCapacity, config);
    } catch (e: any) {
      alert(`キャンセルに失敗しました: ${e.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (r: ReservationData) => {
    if (!confirm(`${r.name}さんの予約データを完全に削除しますか？（キャンセル待ち繰り上げは行われません）`)) return;
    setProcessing(r.id);
    try {
      await deleteReservation(event.id, r.id);
    } catch (e: any) {
      alert(`削除に失敗しました: ${e.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleUnlock = async (field: "lightUnlockedEarly" | "visitorUnlockedEarly", value: boolean) => {
    if (!config) return;
    setUnlockSaving(true);
    try {
      await updateBookingConfig(event.id, { ...config, [field]: value });
      if (value && field === "lightUnlockedEarly") {
        const promoted = await promoteWaitlistedAfterUnlock(event.id, maxCapacity);
        if (promoted > 0) alert(`${promoted}名のキャンセル待ちを確定に繰り上げました。`);
      }
    } catch (e: any) {
      alert(`更新に失敗しました: ${e.message}`);
    } finally {
      setUnlockSaving(false);
    }
  };

  const activeReservations = reservations.filter(r => r.status !== "cancelled");

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-100 shadow-sm overflow-hidden">
      {/* カードヘッダー */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 text-left hover:bg-ag-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="text-center shrink-0 w-14">
              <div className="text-xs font-bold text-ag-gray-400">{new Date(event.date + "T00:00:00").getMonth() + 1}月</div>
              <div className="text-2xl font-black text-ag-gray-900 leading-none">{new Date(event.date + "T00:00:00").getDate()}</div>
              <div className="text-xs text-ag-gray-400 font-bold">
                {["日", "月", "火", "水", "木", "金", "土"][new Date(event.date + "T00:00:00").getDay()]}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stageInfo.color}`}>
                  {stageInfo.label}
                </span>
                {!config && (
                  <span className="text-[10px] font-bold text-ag-gray-400 bg-ag-gray-100 px-2 py-0.5 rounded-full">予約設定なし</span>
                )}
              </div>
              <div className="text-base font-black text-ag-gray-900 truncate">{event.title || "練習"}</div>
              <div className="text-xs font-bold text-ag-gray-500">{event.location} {event.time}</div>
            </div>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            {/* 予約カウント */}
            <div className="text-right hidden sm:block">
              <div className="text-xs text-ag-gray-400 font-bold">確定 / 定員</div>
              <div className="text-xl font-black text-ag-gray-900">
                {confirmed.length}
                <span className="text-sm text-ag-gray-400 font-bold"> / {maxCapacity}</span>
              </div>
              {waitlisted.length > 0 && (
                <div className="text-xs font-bold text-amber-600">待ち {waitlisted.length}名</div>
              )}
            </div>

            {/* 定員バー（モバイル兼用） */}
            <div className="w-20 hidden sm:block">
              <div className="h-2 bg-ag-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <span className={`text-ag-gray-400 text-sm font-black transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
          </div>
        </div>

        {/* モバイル用カウント */}
        <div className="sm:hidden flex items-center gap-3 mt-3 pt-3 border-t border-ag-gray-100">
          <div className="flex-1 h-2 bg-ag-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-emerald-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-black text-ag-gray-700">{confirmed.length} / {maxCapacity}名</span>
          {waitlisted.length > 0 && (
            <span className="text-xs font-bold text-amber-600">待ち{waitlisted.length}</span>
          )}
        </div>
      </button>

      {/* 展開：詳細パネル */}
      {expanded && (
        <div className="border-t border-ag-gray-100">

          {/* 管理コントロール（admin & bookingConfig あり時のみ） */}
          {isAdmin && config && (
            <div className="px-5 py-4 bg-ag-gray-50 border-b border-ag-gray-100">
              <div className="text-[10px] font-black text-ag-gray-400 uppercase tracking-widest mb-3">管理者コントロール</div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-white border border-ag-gray-200 rounded-xl px-3 py-2 hover:bg-ag-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.lightUnlockedEarly}
                    onChange={(e) => handleToggleUnlock("lightUnlockedEarly", e.target.checked)}
                    disabled={unlockSaving}
                    className="w-4 h-4 accent-sky-500"
                  />
                  <span className="text-xs font-bold text-ag-gray-700">ライト早期解禁</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white border border-ag-gray-200 rounded-xl px-3 py-2 hover:bg-ag-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.visitorUnlockedEarly}
                    onChange={(e) => handleToggleUnlock("visitorUnlockedEarly", e.target.checked)}
                    disabled={unlockSaving}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-xs font-bold text-ag-gray-700">ビジター早期解禁</span>
                </label>
                {unlockSaving && <span className="text-xs text-ag-gray-400 font-bold self-center">保存中...</span>}
              </div>
              <div className="text-[10px] text-ag-gray-400 font-bold mt-2">
                ライト解禁: {config.lightUnlockDelayDays}日 / ビジター解禁: {config.visitorUnlockDelayDays}日 / 正会員枠: {config.memberReservedSlots} / 正会員総数: {config.officialTotalCount}名
              </div>
            </div>
          )}

          {/* 予約なし */}
          {activeReservations.length === 0 && (
            <div className="px-5 py-8 text-center text-ag-gray-400 text-sm font-bold">
              まだ予約がありません
            </div>
          )}

          {/* 予約一覧 */}
          {activeReservations.length > 0 && (
            <div className="divide-y divide-ag-gray-50">
              {/* 確定 */}
              {confirmed.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-emerald-50 text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                    確定 {confirmed.length}名
                  </div>
                  {confirmed.map((r) => (
                    <ReservationRow key={r.id} r={r} isAdmin={isAdmin} processing={processing} onCancel={handleCancel} onDelete={handleDelete} />
                  ))}
                </div>
              )}

              {/* キャンセル待ち */}
              {waitlisted.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-amber-50 text-[10px] font-black text-amber-700 uppercase tracking-widest">
                    キャンセル待ち {waitlisted.length}名
                  </div>
                  {waitlisted.map((r) => (
                    <ReservationRow key={r.id} r={r} isAdmin={isAdmin} processing={processing} onCancel={handleCancel} onDelete={handleDelete} />
                  ))}
                </div>
              )}

              {/* キャンセル済み（折りたたみ） */}
              {cancelled.length > 0 && (
                <details className="group">
                  <summary className="px-5 py-2 bg-ag-gray-50 text-[10px] font-black text-ag-gray-400 uppercase tracking-widest cursor-pointer list-none flex items-center justify-between hover:bg-ag-gray-100">
                    <span>キャンセル済み {cancelled.length}名</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  {cancelled.map((r) => (
                    <ReservationRow key={r.id} r={r} isAdmin={isAdmin} processing={processing} onCancel={handleCancel} onDelete={handleDelete} />
                  ))}
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReservationRow({
  r,
  isAdmin,
  processing,
  onCancel,
  onDelete,
}: {
  r: ReservationData;
  isAdmin: boolean;
  processing: string | null;
  onCancel: (r: ReservationData) => void;
  onDelete: (r: ReservationData) => void;
}) {
  const typeInfo = MEMBER_TYPE_LABEL[r.memberType] ?? { label: r.memberType, color: "bg-ag-gray-100 text-ag-gray-600" };
  const statusStyle = STATUS_STYLE[r.status] ?? STATUS_STYLE.confirmed;
  const isBusy = processing === r.id;

  return (
    <div className={`px-5 py-3 flex items-center gap-3 hover:bg-ag-gray-50 transition-colors ${r.status === "cancelled" ? "opacity-50" : ""}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusStyle.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-ag-gray-900">{r.name}</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${typeInfo.color}`}>{typeInfo.label}</span>
          {r.rank && <span className="text-[10px] font-bold text-ag-gray-400 bg-ag-gray-100 px-1.5 py-0.5 rounded">{r.rank}ランク</span>}
          {r.ageGroup && <span className="text-[10px] text-ag-gray-400 font-bold">{r.ageGroup}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {r.invitedBy && (
            <span className="text-[10px] font-bold text-ag-gray-400">紹介: {r.invitedBy}</span>
          )}
          {r.teamName && (
            <span className="text-[10px] font-bold text-ag-gray-400">{r.teamName}</span>
          )}
          <span className="text-[10px] text-ag-gray-300 font-bold">{formatTimestamp(r.reservedAt as any)}</span>
        </div>
      </div>

      {isAdmin && r.status !== "cancelled" && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onCancel(r)}
            disabled={isBusy}
            className="px-2.5 py-1.5 text-[10px] font-black text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {isBusy ? "..." : "キャンセル"}
          </button>
          <button
            onClick={() => onDelete(r)}
            disabled={isBusy}
            className="px-2.5 py-1.5 text-[10px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 border border-ag-gray-200 hover:border-red-200 rounded-lg transition-colors disabled:opacity-50"
          >
            削除
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────

export default function ReservationsPage() {
  const { user, role } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [dbMembers, setDbMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const isAdmin = role === "admin";

  useEffect(() => {
    const unsubMembers = subscribeToMembers(setDbMembers);
    getAllEvents().then((data) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsubMembers();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const practiceEvents = events
    .filter((e) => e.type === "practice")
    .filter((e) => {
      if (filter === "upcoming") return e.date >= today;
      if (filter === "past") return e.date < today;
      return true;
    })
    .sort((a, b) => (filter === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  const withConfig = practiceEvents.filter((e) => e.bookingConfig);
  const withoutConfig = practiceEvents.filter((e) => !e.bookingConfig);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-ag-gray-900 tracking-tight">予約管理</h1>
          <p className="text-base font-bold text-ag-gray-500 mt-1">
            練習ごとの予約状況と解禁ステージを管理します
          </p>
        </div>

        {/* フィルタ */}
        <div className="flex bg-ag-gray-100 p-1 rounded-xl shadow-inner">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
                filter === f ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500 hover:text-ag-gray-700"
              }`}
            >
              {f === "upcoming" ? "今後" : f === "past" ? "過去" : "全て"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ag-gray-400 font-bold animate-pulse">読み込み中...</div>
      ) : (
        <>
          {/* 予約設定済みイベント */}
          {withConfig.length > 0 && (
            <div className="space-y-3">
              {withConfig.map((event) => (
                <EventReservationCard
                  key={event.id}
                  event={event}
                  dbMembers={dbMembers}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}

          {/* 予約設定なしイベント */}
          {withoutConfig.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-ag-gray-200" />
                <span className="text-xs font-black text-ag-gray-400 uppercase tracking-wider">予約設定なし（{withoutConfig.length}件）</span>
                <div className="flex-1 h-px bg-ag-gray-200" />
              </div>
              <div className="space-y-2">
                {withoutConfig.map((event) => (
                  <EventReservationCard
                    key={event.id}
                    event={event}
                    dbMembers={dbMembers}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          )}

          {practiceEvents.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-ag-gray-100 rounded-3xl">
              <p className="text-lg font-black text-ag-gray-400 italic">No Practices</p>
              <p className="text-sm text-ag-gray-400 mt-2 font-bold">
                {filter === "upcoming" ? "今後の練習予定はありません" : "条件に合う練習が見つかりません"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
