"use client";

import { useState, Suspense } from "react";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import type { CalendarEvent } from "@/components/calendar/CalendarGrid";
import EventDetail from "@/components/calendar/EventDetail";
import CalendarStats from "@/components/calendar/CalendarStats";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(3); // 3月
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);

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

  const handleResponseChange = (eventId: number, response: string) => {
    // 出欠回答を更新（モック：ローカルステートのみ更新）
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
          <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors cursor-pointer shadow-sm">
            + 予定を追加
          </button>
          <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-ag-gray-600 border border-ag-gray-200 hover:bg-ag-gray-50 transition-colors cursor-pointer">
            📤 Googleカレンダー同期
          </button>
        </div>
      </div>

      {/* 統計カード */}
      <CalendarStats />

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
                    { date: "3/29(土)", title: "土曜練習", time: "13:00-17:00" },
                    { date: "4/2(水)", title: "通常練習", time: "19:00-21:00" },
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
