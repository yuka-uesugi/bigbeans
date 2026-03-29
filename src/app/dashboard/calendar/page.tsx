"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import type { CalendarEvent } from "@/components/calendar/CalendarGrid";
import EventDetail from "@/components/calendar/EventDetail";
import CalendarStats from "@/components/calendar/CalendarStats";
import AddEventModal from "@/components/calendar/AddEventModal";
import VisitorGuideSection from "@/components/landing/VisitorGuideSection";
import MemberBenefitsSection from "@/components/landing/MemberBenefitsSection";
import VisitorJoinSection from "@/components/landing/VisitorJoinSection";
import { useAuth } from "@/contexts/AuthContext";

function CalendarContent() {
  const [currentMonth, setCurrentMonth] = useState(4); // 4月（最新の練習予定から開始）
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const { user } = useAuth();
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

  const handleResponseChange = (eventId: number, response: string) => {
    setSelectedEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, myResponse: response as CalendarEvent["myResponse"] } : e
      )
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">📅</span>
            出欠・カレンダー
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            練習・試合の予定確認と出欠回答
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors cursor-pointer shadow-sm"
          >
            + 予定を追加
          </button>
          <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-ag-gray-600 border border-ag-gray-200 hover:bg-ag-gray-50 transition-colors cursor-pointer">
            📤 Googleカレンダー同期
          </button>
        </div>
      </div>

      {/* カレンダー + 詳細パネル */}
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
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-8 text-center sticky top-24">
              <div className="text-5xl mb-4 opacity-50">📅</div>
              <h3 className="text-base font-bold text-ag-gray-700 mb-2">
                日付を選択してください
              </h3>
              <p className="text-sm text-ag-gray-400 leading-relaxed">
                カレンダーの日付をクリックすると
                <br />
                予定の詳細と出欠回答ができます
              </p>

              {/* 未回答の予定リスト */}
              <div className="mt-6 pt-5 border-t border-ag-gray-100">
                <h4 className="text-xs font-semibold text-ag-gray-500 mb-3 text-left">
                  ⚠️ 未回答の予定
                </h4>
                <div className="space-y-2">
                  {[
                    { date: "4/1(水)", title: "水曜練習", time: "9:00-12:00" },
                    { date: "4/8(水)", title: "水曜練習", time: "12:00-15:00" },
                  ].map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100 text-left"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ag-gray-800">
                          {item.date} {item.title}
                        </p>
                        <p className="text-[10px] text-ag-gray-400">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 予定追加の案内 (ビジター以外) */}
              {!isVisitor && (
                <div className="mt-5">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full py-3 bg-ag-lime-50 border border-ag-lime-100 border-dashed rounded-2xl text-xs font-bold text-ag-lime-600 hover:bg-ag-lime-100 transition-colors"
                  >
                    + 新しい予定を追加する
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 統計カード（下部に移動） */}
      {!isVisitor && (
         <div className="mt-8">
           <CalendarStats />
         </div>
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

      {/* ビジター向けコンテンツ (ビジターモード時のみ下部に表示) */}
      {isVisitor && (
        <div className="pt-12 border-t border-ag-gray-200 mt-12 overflow-hidden rounded-[3rem] bg-white shadow-sm pb-10">
          <VisitorGuideSection />
          <MemberBenefitsSection />
          <VisitorJoinSection />
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
