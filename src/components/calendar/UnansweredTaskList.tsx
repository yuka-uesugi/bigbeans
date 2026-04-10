"use client";

import { useState, useEffect } from "react";
import { getAllEvents, type EventData } from "@/lib/events";

export default function UnansweredTaskList() {
  const [unanswered, setUnanswered] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const allEvents = await getAllEvents();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        // 未来のイベントを抽出（出欠の回答状況はPhase 2以降で連動予定）
        const futureEvents = allEvents
          .filter((evt) => evt.date >= todayStr)
          .filter((evt) => evt.location && evt.location !== "未定" && evt.location !== "-")
          .sort((a, b) => a.date.localeCompare(b.date));

        setUnanswered(futureEvents);
      } catch (err) {
        console.error("イベント取得エラー:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border-2 border-ag-gray-100 shadow-sm mt-8">
        <p className="text-sm font-bold text-ag-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (unanswered.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border-2 border-ag-gray-100 shadow-sm mt-8">
        <h3 className="text-xl font-black text-ag-gray-800 mb-2">今後の予定はありません</h3>
        <p className="text-sm font-bold text-ag-gray-500">カレンダーから予定を追加してください。</p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/50 rounded-3xl border-2 border-amber-200 p-6 sm:p-8 mt-8 shadow-sm">
      <h3 className="font-black text-amber-900 text-xl flex items-center gap-3 mb-6">
        <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded-lg text-sm font-black">NOTICE</span>
        今後のイベント・練習 ({unanswered.length}件)
      </h3>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {unanswered.map((evt) => {
          const d = new Date(evt.date + "T00:00:00");
          const dayStr = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
          return (
            <div
              key={evt.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-100 shadow-sm hover:border-amber-300 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex flex-col items-center justify-center text-amber-800 shrink-0 ring-4 ring-amber-50">
                  <span className="text-[11px] font-black">{d.getMonth() + 1}月</span>
                  <span className="text-2xl font-black leading-none tracking-tighter">
                    {d.getDate()}<span className="text-xs ml-0.5">({dayStr})</span>
                  </span>
                </div>
                <div>
                  <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                    <span className="text-[10px] font-black bg-ag-gray-100 px-2 py-0.5 rounded text-ag-gray-600 tracking-widest">
                      {evt.time}
                    </span>
                    <span className="text-[10px] font-black bg-sky-100 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                      {evt.location}
                    </span>
                  </div>
                  <div className="font-black text-ag-gray-900 text-lg">{evt.title}</div>
                </div>
              </div>
              <button className="px-6 py-3 bg-amber-500 text-white text-sm font-black rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-600 shrink-0 hover:scale-105 transition-all">
                出欠を回答する ＞
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
