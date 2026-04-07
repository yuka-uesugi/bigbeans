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
import { eventData } from "@/components/calendar/CalendarGrid";
import VisitorRegistrationModal from "@/components/dashboard/VisitorRegistrationModal";


function CalendarContent() {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(4); // 4月（最新の練習予定から開始）
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);


  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  
  if (loading) return <div className="p-12 text-center text-ag-gray-400 font-bold">カレンダーを読み込み中...</div>;
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
                  次の練習（直近）
                </h3>
                <span className="text-sm font-black bg-ag-lime-100 text-ag-lime-700 px-3 py-1 rounded-full">受付中</span>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-3xl font-black text-ag-gray-900 mb-1">4/8(水)</div>
                <div className="text-lg font-bold text-ag-gray-600">仲町台 12:00〜15:00</div>
              </div>

              <div className="bg-ag-gray-50 rounded-2xl p-4 mb-6 border border-ag-gray-200">
                 <div className="flex justify-between items-center text-sm font-black text-ag-gray-700 mb-2">
                    <span>定員まであと：</span>
                    <span className="text-xl text-ag-lime-600">18名空き</span>
                 </div>
                 <div className="w-full bg-ag-gray-200 rounded-full h-3">
                    <div className="bg-ag-lime-500 h-3 rounded-full" style={{ width: "20%" }}></div>
                 </div>
              </div>

              <button 
                onClick={() => setIsVisitorModalOpen(true)}
                className="w-full py-4 bg-ag-lime-500 text-white text-xl font-black rounded-2xl shadow-[0_8px_16px_rgba(132,204,22,0.3)] hover:scale-[1.02] hover:bg-ag-lime-600 transition-all mb-4"
              >
                 {isVisitor ? "参加予約する" : "ビジターを代理登録"}
              </button>



              <button className="w-full py-4 border-2 border-ag-gray-200 text-ag-gray-600 text-lg font-black rounded-2xl hover:bg-ag-gray-50 transition-all">
                 今回はお休み
              </button>

              {/* 予定追加の案内 (ビジター以外) */}
              {!isVisitor && (
                <div className="mt-8 pt-6 border-t border-ag-gray-100">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full py-4 bg-white border-2 border-ag-lime-200 border-dashed rounded-2xl text-base font-black text-ag-lime-600 hover:bg-ag-lime-50 transition-colors"
                  >
                    + 新たない予定を作成する
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      ) : (
        /* 📋 イベントリスト表示モード */
        <div className="bg-white rounded-3xl border border-ag-gray-200/60 shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-black text-ag-gray-800 border-b-2 border-ag-gray-100 pb-4 mb-6">今後の全予定リスト</h2>
          <div className="space-y-4">
            {Object.entries(eventData)
              .flatMap(([dateStr, evts]) => evts.map(e => ({ dateStr, ...e })))
              .sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime())
              .filter(e => new Date(e.dateStr) >= new Date(new Date().setHours(0,0,0,0)))
              .map((evt, idx) => {
                const dateObj = new Date(evt.dateStr);
                const dayStr = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border-2 border-ag-gray-100 hover:border-ag-lime-300 hover:bg-ag-lime-50/30 transition-all cursor-pointer">
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
                        参加 <span className="text-xl text-ag-gray-900">{evt.attendees}</span>/{evt.total}
                      </div>
                      <button className="px-6 py-2 bg-ag-lime-500 text-white text-sm font-black rounded-xl shadow-sm hover:bg-ag-lime-600">
                        詳細・出欠 ＞
                      </button>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      )}

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
