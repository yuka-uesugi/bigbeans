"use client";

import { useState } from "react";

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export interface CalendarEvent {
  id: number;
  title: string;
  type: "practice" | "match" | "event";
  time: string;
  location: string;
  myResponse?: "attend" | "absent" | "pending" | "basic" | "consult" | null;
  attendees: number;
  total: number;
}

interface CalendarGridProps {
  selectedDate: number | null;
  onSelectDate: (date: number, events: CalendarEvent[]) => void;
  currentMonth: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

// モックイベントデータ（3月と4月）
const eventData: Record<string, CalendarEvent[]> = {
  "2026-3-5": [
    { id: 1, title: "通常練習", type: "practice", time: "19:00-21:00", location: "青葉台小学校 体育館", myResponse: "attend", attendees: 14, total: 24 },
  ],
  "2026-3-8": [
    { id: 2, title: "土曜練習", type: "practice", time: "13:00-17:00", location: "横浜市スポーツセンター", myResponse: "attend", attendees: 16, total: 24 },
  ],
  "2026-3-12": [
    { id: 3, title: "通常練習", type: "practice", time: "19:00-21:00", location: "青葉台小学校 体育館", myResponse: "absent", attendees: 11, total: 24 },
  ],
  "2026-3-15": [
    { id: 4, title: "区民大会 ダブルス", type: "match", time: "9:00-18:00", location: "横浜国際プール", myResponse: "attend", attendees: 8, total: 24 },
  ],
  "2026-3-19": [
    { id: 5, title: "通常練習", type: "practice", time: "19:00-21:00", location: "青葉台小学校 体育館", myResponse: "attend", attendees: 13, total: 24 },
  ],
  "2026-3-22": [
    { id: 6, title: "土曜練習", type: "practice", time: "13:00-17:00", location: "横浜市スポーツセンター", myResponse: "basic", attendees: 15, total: 24 },
  ],
  "2026-3-26": [
    { id: 7, title: "通常練習", type: "practice", time: "19:00-21:00", location: "青葉台小学校 体育館", myResponse: "attend", attendees: 12, total: 24 },
  ],
  "2026-3-29": [
    { id: 8, title: "土曜練習", type: "practice", time: "13:00-17:00", location: "横浜市スポーツセンター", myResponse: null, attendees: 24, total: 24 },
  ],
  "2026-4-2": [
    { id: 9, title: "通常練習", type: "practice", time: "19:00-21:00", location: "青葉台小学校 体育館", myResponse: null, attendees: 5, total: 24 },
  ],
  "2026-4-5": [
    { id: 10, title: "土曜練習", type: "practice", time: "13:00-17:00", location: "横浜市スポーツセンター", myResponse: null, attendees: 3, total: 24 },
  ],
  "2026-4-9": [
    { id: 11, title: "通常練習", type: "practice", time: "19:00-21:00", location: "青葉台小学校 体育館", myResponse: null, attendees: 0, total: 24 },
  ],
  "2026-4-13": [
    { id: 12, title: "春季市民大会", type: "match", time: "9:00-17:00", location: "横浜文化体育館", myResponse: null, attendees: 0, total: 24 },
  ],
  "2026-4-16": [
    { id: 13, title: "通常練習", type: "practice", time: "19:00-21:00", location: "青葉台小学校 体育館", myResponse: null, attendees: 0, total: 24 },
  ],
  "2026-4-20": [
    { id: 14, title: "お花見イベント 🌸", type: "event", time: "11:00-15:00", location: "鶴見川沿い公園", myResponse: null, attendees: 0, total: 24 },
  ],
  "2026-4-23": [
    { id: 15, title: "通常練習", type: "practice", time: "19:00-21:00", location: "青葉台小学校 体育館", myResponse: null, attendees: 0, total: 24 },
  ],
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

const typeConfig = {
  practice: { dot: "bg-ag-lime-400", label: "練習" },
  match: { dot: "bg-blue-400", label: "試合" },
  event: { dot: "bg-purple-400", label: "イベント" },
};

const responseConfig = {
  attend: { color: "bg-ag-lime-400", label: "参加" },
  absent: { color: "bg-red-400", label: "不参加" },
  pending: { color: "bg-amber-400", label: "保留" },
  basic: { color: "bg-sky-400", label: "基礎のみ" },
  consult: { color: "bg-purple-400", label: "相談" },
};

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const days: CalendarDay[] = [];

  // 前月の日
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      date: daysInPrevMonth - i,
      isCurrentMonth: false,
      isToday: false,
      events: [],
    });
  }

  // 当月の日
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`;
    days.push({
      date: d,
      isCurrentMonth: true,
      isToday: isCurrentMonth && today.getDate() === d,
      events: eventData[key] || [],
    });
  }

  // 次月の日（6行分まで埋める）
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: i,
      isCurrentMonth: false,
      isToday: false,
      events: [],
    });
  }

  return days;
}

const MONTH_NAMES = [
  "", "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

export default function CalendarGrid({
  selectedDate,
  onSelectDate,
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
}: CalendarGridProps) {
  const days = getCalendarDays(currentYear, currentMonth);

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ag-gray-100">
        <button
          onClick={onPrevMonth}
          className="w-9 h-9 rounded-xl hover:bg-ag-gray-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-ag-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-ag-gray-800">
          {currentYear}年 {MONTH_NAMES[currentMonth]}
        </h2>

        <button
          onClick={onNextMonth}
          className="w-9 h-9 rounded-xl hover:bg-ag-gray-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-ag-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 px-6 py-2.5 bg-ag-gray-50/50 border-b border-ag-gray-100">
        {Object.entries(typeConfig).map(([, cfg]) => (
          <div key={cfg.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span className="text-[11px] text-ag-gray-500">{cfg.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-ag-gray-300 ring-2 ring-ag-lime-400 ring-offset-1" />
          <span className="text-[11px] text-ag-gray-500">回答済</span>
        </div>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-ag-gray-100">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={`py-2.5 text-center text-xs font-semibold ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-ag-gray-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダー日付グリッド */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const isSelected = day.isCurrentMonth && day.date === selectedDate;
          const dayOfWeek = index % 7;

          return (
            <button
              key={index}
              onClick={() => day.isCurrentMonth && onSelectDate(day.date, day.events)}
              disabled={!day.isCurrentMonth}
              className={`
                relative min-h-[80px] p-1.5 border-b border-r border-ag-gray-100/60
                transition-all duration-150 cursor-pointer
                ${!day.isCurrentMonth ? "opacity-30 cursor-default" : "hover:bg-ag-lime-50/40"}
                ${isSelected ? "bg-ag-lime-50 ring-2 ring-inset ring-ag-lime-300" : ""}
                ${day.isToday ? "bg-ag-lime-50/60" : ""}
              `}
            >
              {/* 日付番号 */}
              <span
                className={`
                  inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                  ${day.isToday ? "bg-ag-lime-500 text-white" : ""}
                  ${dayOfWeek === 0 ? "text-red-400" : dayOfWeek === 6 ? "text-blue-400" : "text-ag-gray-700"}
                  ${!day.isCurrentMonth ? "text-ag-gray-300" : ""}
                `}
              >
                {day.date}
              </span>

              {/* イベントドット */}
              {day.events.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {day.events.map((evt) => (
                    <div key={evt.id} className="flex items-center gap-1 px-1">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${typeConfig[evt.type].dot} ${
                        evt.myResponse && evt.myResponse !== "pending" ? "ring-1 ring-ag-lime-400 ring-offset-1" : ""
                      }`} />
                      <span className="text-[9px] text-ag-gray-600 truncate leading-tight">
                        {evt.title.length > 6 ? evt.title.slice(0, 6) + "…" : evt.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 未回答マーク */}
              {day.events.some((e) => e.myResponse === null) && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { eventData, typeConfig, responseConfig };
export type { CalendarEvent as CalendarEventType };
