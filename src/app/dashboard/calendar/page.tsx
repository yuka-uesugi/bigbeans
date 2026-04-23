"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import type { CalendarEvent } from "@/components/calendar/CalendarGrid";
import EventDetail from "@/components/calendar/EventDetail";
import AgendaView from "@/components/calendar/AgendaView";
import UnansweredTaskList from "@/components/calendar/UnansweredTaskList";
import AddEventModal from "@/components/calendar/AddEventModal";
import EditEventModal from "@/components/calendar/EditEventModal";
import VisitorGuideSection from "@/components/landing/VisitorGuideSection";
import MemberBenefitsSection from "@/components/landing/MemberBenefitsSection";
import VisitorJoinSection from "@/components/landing/VisitorJoinSection";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToEventsByMonth, getAllEvents, seedEventsFromSchedule, type EventData } from "@/lib/events";
import { practiceSchedule } from "@/data/practiceSchedule";
import { getMemberByEmail } from "@/lib/members";
import { subscribeToAnsweredEvents } from "@/lib/attendances";
import type { Member } from "@/data/memberList";
function CalendarContent() {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [practiceFilter, setPracticeFilter] = useState<"all" | "practice">("all");
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firestoreEvents, setFirestoreEvents] = useState<EventData[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [myMember, setMyMember] = useState<Member | null>(null);
  const [answeredEventIds, setAnsweredEventIds] = useState<Set<string>>(new Set());

  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  // カレンダーモード：当月のみリアルタイム購読
  useEffect(() => {
    if (viewMode !== "calendar") return;
    const unsubscribe = subscribeToEventsByMonth(currentYear, currentMonth, (events, error) => {
      if (error) {
        console.error("Calendar load error:", error);
        setCalendarError("予定情報の取得に失敗しました。データベース権限がないか、ログインが必要です。");
        setFirestoreEvents([]);
      } else {
        setCalendarError(null);
        setFirestoreEvents(events);
      }
    });
    return () => unsubscribe();
  }, [currentYear, currentMonth, viewMode]);

  // リストモード：全イベントを一括取得（onSnapshot は使わない）
  useEffect(() => {
    if (viewMode !== "list") return;
    getAllEvents()
      .then((evts) => { setAllEvents(evts); setCalendarError(null); })
      .catch((err) => {
        console.error("Agenda load error:", err);
        setCalendarError("予定情報の取得に失敗しました。");
      });
  }, [viewMode]);

  // ログインユーザーのメンバー情報を取得
  useEffect(() => {
    if (!user?.email) { setMyMember(null); return; }
    getMemberByEmail(user.email).then(setMyMember).catch(() => setMyMember(null));
  }, [user?.email]);

  // 当月イベントのうち自分が回答済みのものをリアルタイム追跡（未回答リスト連動）
  useEffect(() => {
    if (!myMember || firestoreEvents.length === 0) {
      setAnsweredEventIds(new Set());
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureEventIds = firestoreEvents
      .filter((e) => new Date(e.date + "T00:00:00") >= today && e.location && e.location !== "未定")
      .map((e) => e.id);
    const unsub = subscribeToAnsweredEvents(futureEventIds, String(myMember.id), setAnsweredEventIds);
    return () => unsub();
  }, [myMember?.id, firestoreEvents.map((e) => e.id).join(",")]);

  // FirestoreデータをCalendarGrid用の形式に変換
  const eventDataForGrid: Record<string, CalendarEvent[]> = {};
  for (const evt of firestoreEvents) {
    // "2026-04-08" → そのままキーとして使用
    if (!eventDataForGrid[evt.date]) {
      eventDataForGrid[evt.date] = [];
    }
    eventDataForGrid[evt.date].push({
      id: evt.id,
      title: evt.title,
      type: evt.type,
      time: evt.time,
      location: evt.location,
      attendees: 0,
      total: evt.maxCapacity,
      responsibleTeam: evt.responsibleTeam,
    });
  }
  
  if (loading) return <div className="p-12 text-center text-ag-gray-400 font-bold">カレンダーを読み込み中...</div>;
  if (calendarError) return (
    <div className="p-12 max-w-lg mx-auto mt-12 bg-red-50 border-2 border-red-200 rounded-3xl text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-black text-red-800 mb-2">エラーが発生しました</h2>
      <p className="text-sm font-bold text-red-600 mb-6">{calendarError}</p>
      <p className="text-xs text-red-400">※ 本番環境やゲストモードでのログイン権限が不足している可能性があります。</p>
    </div>
  );
  
  const isVisitor = searchParams.get("role") === "visitor" && !user;
  const { role } = useAuth();
  const isAdmin = role === "admin";



  const scrollToDetail = () => {
    setTimeout(() => {
      document.getElementById("event-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSelectDate = (date: number, events: CalendarEvent[]) => {
    setSelectedDate(date);
    setSelectedEvents(events);
    scrollToDetail();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDate(today.getDate());
    
    // 今日のイベントがあればセットする処理（簡易版）
    // NOTE: 実働時はここで取得関数を呼び出すなどしてデータセットを行う
    setSelectedEvents([]);
  };

  const handleSelectEvent = (event: EventData) => {
    const dateParts = event.date.split("-");
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);

    // 月や年が異なる場合は切り替える
    if (year !== currentYear || month !== currentMonth) {
      setCurrentYear(year);
      setCurrentMonth(month);
    }

    const calEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      type: event.type,
      time: event.time,
      location: event.location,
      attendees: 0,
      total: event.maxCapacity,
      responsibleTeam: event.responsibleTeam,
    };

    setSelectedDate(day);
    setSelectedEvents([calEvent]);
    // カレンダーモードのときのみグリッド切り替え（リストモードはそのまま詳細を開く）
    if (viewMode !== "list") setViewMode("calendar");
    
    // 画面上部へスクロール（モバイル対応）
    scrollToDetail();
  };

  const handleResponseChange = (eventId: string | number, response: string) => {
    setSelectedEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, myResponse: response as CalendarEvent["myResponse"] } : e
      )
    );
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ag-gray-900 tracking-tight">
            {isVisitor ? "練習スケジュール" : "カレンダー"}
          </h1>
          {isVisitor && (
            <p className="text-xs font-bold text-ag-gray-400 mt-0.5">体験・見学の方はこちらから参加予約できます</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* メンバー：表示切り替え */}
          {!isVisitor && (
            <div className="flex bg-ag-gray-100 p-1 rounded-xl shadow-inner">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  viewMode === "list" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500"
                }`}
              >
                リスト
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  viewMode === "calendar" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500"
                }`}
              >
                カレンダー
              </button>
            </div>
          )}
          {!isVisitor && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 text-xs font-black rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-sm"
            >
              + 追加
            </button>
          )}
        </div>
      </div>

      {/* フィルタタブ（メンバーのみ・リスト表示時） */}
      {!isVisitor && viewMode === "list" && (
        <div className="flex gap-1 bg-ag-gray-100 p-1 rounded-xl w-fit">
          {(["all", "practice"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPracticeFilter(f)}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${
                practiceFilter === f ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-400 hover:text-ag-gray-600"
              }`}
            >
              {f === "all" ? "すべての予定" : "練習のみ"}
            </button>
          ))}
        </div>
      )}


      {/* カレンダー + 詳細パネル (カレンダーモード) */}
      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* カレンダーグリッド */}
        <CalendarGrid
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
          eventData={eventDataForGrid}
          isVisitor={isVisitor}
        />

        {/* 詳細パネル */}
        <div id="event-detail-panel" className="scroll-mt-24">
          {selectedDate ? (
            <Suspense fallback={<div className="p-8 text-center text-ag-gray-400">読み込み中...</div>}>
              <EventDetail
                date={selectedDate}
                month={currentMonth}
                year={currentYear}
                events={selectedEvents}
                onResponseChange={handleResponseChange}
                onEditEvent={(e) => setEditingEvent(e)}
              />
            </Suspense>
          ) : (
            <div className="bg-white rounded-3xl border border-ag-gray-200/60 shadow-md p-6 sticky top-24">
              <div className="mb-4 flex items-center justify-between border-b-2 border-ag-gray-100 pb-3">
                <h3 className="text-xl font-black text-ag-gray-800">
                  次の練習（予定）
                </h3>
              </div>
              
              {(() => {
                const nextPractices = firestoreEvents
                  .filter(e => e.type === "practice" && new Date(e.date + "T00:00:00").getTime() >= new Date().setHours(0,0,0,0))
                  .sort((a,b) => a.date.localeCompare(b.date));
                
                if (nextPractices.length === 0) {
                  return (
                    <div className="py-12 text-center text-ag-gray-400">
                      <p className="text-lg font-bold italic">No Plans</p>
                      <p className="text-xs mt-2">今月の練習予定はまだありません</p>
                    </div>
                  );
                }

                const nextP = nextPractices[0];
                const d = new Date(nextP.date + "T00:00:00");
                const dayStr = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];

                return (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-3xl font-black text-ag-gray-900 mb-1">{d.getMonth() + 1}/{d.getDate()}({dayStr})</div>
                      <div className="text-lg font-bold text-ag-gray-600">{nextP.location} {nextP.time}</div>
                    </div>

                    <div className="bg-ag-gray-50 rounded-2xl p-4 mb-6 border border-ag-gray-200">
                       <div className="flex justify-between items-center text-sm font-black text-ag-gray-700 mb-2">
                          <span>定員：</span>
                          <span className="text-xl text-ag-lime-600">{nextP.maxCapacity || 24}名</span>
                       </div>
                       <p className="text-xs text-ag-gray-400 mt-1">※日付を選択すると詳細な出欠確認ができます。</p>
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedDate(d.getDate());
                        setSelectedEvents([nextP as any]);
                      }}
                      className="w-full py-4 bg-ag-lime-500 text-white text-xl font-black rounded-2xl shadow-lg hover:bg-ag-lime-600 transition-all mb-4"
                    >
                       詳細を見る
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      ) : (
        /* アジェンダ（リスト）表示モード */
        <AgendaView
          events={(() => {
            const src = allEvents.length > 0 ? allEvents : firestoreEvents;
            // ビジターは practice のみ表示（固定）
            if (isVisitor) return src.filter((e) => e.type === "practice");
            // メンバーはフィルタに従う
            return practiceFilter === "practice"
              ? src.filter((e) => e.type === "practice")
              : src;
          })()}
          isVisitor={isVisitor}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {/* アジェンダ選択時の詳細モーダル */}
      {viewMode === "list" && selectedDate && selectedEvents.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedDate(null); setSelectedEvents([]); }} />
          <div className="relative w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex justify-end p-3 bg-white/80 backdrop-blur-sm rounded-t-3xl sm:rounded-t-3xl">
              <button
                onClick={() => { setSelectedDate(null); setSelectedEvents([]); }}
                className="px-4 py-1.5 text-sm font-black text-ag-gray-500 bg-ag-gray-100 rounded-xl hover:bg-ag-gray-200 transition-colors"
              >
                閉じる
              </button>
            </div>
            <Suspense fallback={<div className="p-8 text-center text-ag-gray-400">読み込み中...</div>}>
              <EventDetail
                date={selectedDate}
                month={currentMonth}
                year={currentYear}
                events={selectedEvents}
                onResponseChange={handleResponseChange}
                onEditEvent={(e) => setEditingEvent(e)}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* 未回答リスト（下部に表示） */}
      {!isVisitor && (
         <UnansweredTaskList
           events={firestoreEvents}
           answeredEventIds={answeredEventIds}
           onSelectEvent={handleSelectEvent}
         />
      )}

      {/* 予定追加モーダル */}
      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultDate={
          selectedDate
            ? { year: currentYear, month: currentMonth, day: selectedDate }
            : undefined
        }
      />

      {/* 予定編集モーダル */}
      {editingEvent && (
        <EditEventModal
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          event={editingEvent}
          eventDate={
            firestoreEvents.find(e => e.id === editingEvent.id)?.date ||
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
          }
          bookingConfig={firestoreEvents.find(e => e.id === editingEvent.id)?.bookingConfig}
          attachments={firestoreEvents.find(e => e.id === editingEvent.id)?.attachments}
          onDeleted={() => {
            setSelectedDate(null);
            setSelectedEvents([]);
            setEditingEvent(null);
          }}
        />
      )}
      
      {/* ビジター向けコンテンツ (ビジターモード時のみ下部に表示) */}
      {isVisitor && (
        <div className="pt-12 border-t border-ag-gray-200 mt-12 overflow-hidden rounded-[3rem] bg-white shadow-sm pb-10">
          <VisitorGuideSection />
          <MemberBenefitsSection />
          <VisitorJoinSection />
        </div>
      )}

      {/* 管理者向け: スケジュール同期ボタン（常時表示） */}
      {isAdmin && (
        <div className="bg-ag-gray-50 border border-ag-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-black text-ag-gray-600 mb-0.5">管理者ツール: スケジュール同期</p>
            <p className="text-[10px] text-ag-gray-400 leading-relaxed">
              practiceSchedule.ts を更新したらこのボタンでFirestoreに反映します。既存データは上書き、新しいものは追加されます。
            </p>
          </div>
          <button
            onClick={async () => {
              if (!confirm("practiceSchedule.ts のデータをFirestoreに同期します。既存データは上書きされます。よろしいですか？")) return;
              setIsSeeding(true);
              try {
                const count = await seedEventsFromSchedule(practiceSchedule as any);
                alert(`${count}件のイベントを同期しました。`);
              } catch (err) {
                console.error(err);
                alert("同期に失敗しました。");
              } finally {
                setIsSeeding(false);
              }
            }}
            disabled={isSeeding}
            className="shrink-0 px-5 py-2.5 bg-ag-gray-800 text-white text-xs font-black rounded-xl hover:bg-black transition-all disabled:opacity-50"
          >
            {isSeeding ? "同期中..." : "スケジュールを同期"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ag-gray-400">Loading calendar...</div>}>
      <CalendarContent />
    </Suspense>
  );
}
