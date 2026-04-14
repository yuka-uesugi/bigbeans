"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import type { CalendarEvent } from "@/components/calendar/CalendarGrid";
import EventDetail from "@/components/calendar/EventDetail";
import UnansweredTaskList from "@/components/calendar/UnansweredTaskList";
import AddEventModal from "@/components/calendar/AddEventModal";
import EditEventModal from "@/components/calendar/EditEventModal";
import VisitorGuideSection from "@/components/landing/VisitorGuideSection";
import MemberBenefitsSection from "@/components/landing/MemberBenefitsSection";
import VisitorJoinSection from "@/components/landing/VisitorJoinSection";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToEventsByMonth, seedEventsFromSchedule, type EventData } from "@/lib/events";
import { practiceSchedule } from "@/data/practiceSchedule";
import VisitorRegistrationModal from "@/components/dashboard/VisitorRegistrationModal";


function CalendarContent() {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [firestoreEvents, setFirestoreEvents] = useState<EventData[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);


  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  // Firestoreから当月のイベントをリアルタイム取得
  useEffect(() => {
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
  }, [currentYear, currentMonth]);

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



  const handleSelectDate = (date: number, events: CalendarEvent[]) => {
    setSelectedDate(date);
    setSelectedEvents(events);
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
    };

    setSelectedDate(day);
    setSelectedEvents([calEvent]);
    setViewMode("calendar");
    
    // 画面上部へスクロール（モバイル対応）
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResponseChange = (eventId: string | number, response: string) => {
    setSelectedEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, myResponse: response as CalendarEvent["myResponse"] } : e
      )
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-ag-gray-900 tracking-tight">
            出欠・カレンダー
          </h1>
          <p className="text-base font-bold text-ag-gray-500 mt-2">
            練習・試合の予定確認と出欠回答
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* 表示切り替えトグル */}
          <div className="flex bg-ag-gray-100 p-1 rounded-xl shadow-inner w-full sm:w-auto">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex-1 sm:px-6 py-2.5 text-sm font-black rounded-lg transition-all ${
                viewMode === "calendar" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500 hover:text-ag-gray-700"
              }`}
            >
              カレンダー
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 sm:px-6 py-2.5 text-sm font-black rounded-lg transition-all ${
                viewMode === "list" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500 hover:text-ag-gray-700"
              }`}
            >
              リスト表示
            </button>
          </div>
          
          {!isVisitor && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 text-sm font-black rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-sm"
            >
              + 予定を追加
            </button>
          )}
        </div>
      </div>


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
        />

        {/* 詳細パネル */}
        <div>
          {selectedDate ? (
            <Suspense fallback={<div className="p-8 text-center text-ag-gray-400">読み込み中...</div>}>
              <EventDetail
                date={selectedDate}
                month={currentMonth}
                year={currentYear}
                events={selectedEvents}
                onResponseChange={handleResponseChange}
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
        /* イベントリスト表示モード */
        <div className="bg-white rounded-3xl border border-ag-gray-200/60 shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-black text-ag-gray-800 border-b-2 border-ag-gray-100 pb-4 mb-6">今後の全予定リスト</h2>
          <div className="space-y-4">
            {firestoreEvents.length === 0 ? (
              <div className="text-center py-12 text-ag-gray-400">
                <p className="text-lg font-bold">表示する予定がありません</p>
                <p className="text-sm mt-2">カレンダーモードから予定を追加してください</p>
              </div>
            ) : (
              firestoreEvents
                .filter((evt) => evt.date >= new Date().toISOString().split("T")[0])
                .map((evt, idx) => {
                  const dateObj = new Date(evt.date + "T00:00:00");
                  const dayStr = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
                  return (
                    <div key={evt.id || idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border-2 border-ag-gray-100 hover:border-ag-lime-300 hover:bg-ag-lime-50/30 transition-all cursor-pointer">
                      <div className="w-24 text-center shrink-0">
                        <div className="text-sm font-black text-ag-gray-500">{dateObj.getMonth() + 1}月</div>
                        <div className={`text-3xl font-black ${dateObj.getDay() === 0 ? "text-red-500" : dateObj.getDay() === 6 ? "text-blue-500" : "text-ag-gray-900"}`}>
                          {dateObj.getDate()}<span className="text-xl ml-1">({dayStr})</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 border-l-2 border-ag-gray-100 pl-4 sm:pl-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-black ${evt.type === 'practice' ? 'bg-ag-lime-100 text-ag-lime-700' : 'bg-blue-100 text-blue-700'}`}>
                            {evt.type === 'practice' ? '練習' : '試合/行事'}
                          </span>
                          <span className="text-sm font-black text-ag-gray-500">{evt.time}</span>
                        </div>
                        <h3 className="text-xl font-black text-ag-gray-900 truncate mb-1">{evt.title}</h3>
                        <p className="text-base font-bold text-ag-gray-600 truncate">LOCAL: {evt.location}</p>
                      </div>
                      <div className="shrink-0 flex items-center justify-between sm:flex-col sm:items-end sm:justify-center mt-3 sm:mt-0 pt-3 sm:pt-0 border-t-2 sm:border-t-0 border-ag-gray-100">
                        <div className="text-sm font-black text-ag-gray-500 mb-2">
                          定員 <span className="text-xl text-ag-gray-900">{evt.maxCapacity}</span>名
                        </div>
                        <button 
                          onClick={() => handleSelectEvent(evt)}
                          className="px-6 py-2 bg-ag-lime-500 text-white text-sm font-black rounded-xl shadow-sm hover:bg-ag-lime-600 active:scale-95 transition-all"
                        >
                          詳細・出欠 ＞
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* 未回答リスト（下部に表示） */}
      {!isVisitor && (
         <UnansweredTaskList events={firestoreEvents} onSelectEvent={handleSelectEvent} />
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
          onDeleted={() => {
            setSelectedDate(null);
            setSelectedEvents([]);
            setEditingEvent(null);
          }}
        />
      )}
      
      {/* ビジター登録モーダル */}
      <VisitorRegistrationModal 
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        isVisitorMode={isVisitor}
        defaultIntroducer={user?.displayName || ""}
        onSubmit={(visitor) => {
          console.log("Registered visitor from calendar:", visitor);
          alert(`${visitor.name}さんの参加予約（${currentMonth}/${selectedDate || '8'}）を受け付けました！`);
          setIsVisitorModalOpen(false);
        }}
      />


      {/* ビジター向けコンテンツ (ビジターモード時のみ下部に表示) */}
      {isVisitor && (
        <div className="pt-12 border-t border-ag-gray-200 mt-12 overflow-hidden rounded-[3rem] bg-white shadow-sm pb-10">
          <VisitorGuideSection />
          <MemberBenefitsSection />
          <VisitorJoinSection />
        </div>
      )}

      {/* 管理者向け: 初期データ投入ボタン */}
      {!isVisitor && firestoreEvents.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center">
          <h3 className="text-xl font-black text-amber-900 mb-3">データベースに予定がありません</h3>
          <p className="text-base font-bold text-amber-700 mb-4">既存の練習スケジュールデータをFirestoreに一括投入しますか？</p>
          <button
            onClick={async () => {
              setIsSeeding(true);
              try {
                const count = await seedEventsFromSchedule(practiceSchedule as any);
                alert(`${count}件のイベントをFirestoreに投入しました！`);
              } catch (err) {
                console.error(err);
                alert("投入に失敗しました。コンソールを確認してください。");
              } finally {
                setIsSeeding(false);
              }
            }}
            disabled={isSeeding}
            className="px-8 py-3 bg-amber-600 text-white font-black rounded-xl shadow-lg hover:bg-amber-700 transition-all disabled:opacity-50"
          >
            {isSeeding ? "投入中..." : "既存データをFirestoreに投入"}
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
