"use client";

import { EventData } from "@/lib/events";

interface UnansweredTaskListProps {
  events: EventData[];
}

export default function UnansweredTaskList({ events }: UnansweredTaskListProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 未来の予定かつ、開催場所が決まっているもので、未回答(または保留)のものを抽出
  // ※ひとまず全ての利用者の「未回答」を判定するため、myResponseが無いというロジックはEventDetailに任せ、
  // ここでは暫定的に「これから来る予定」をすべて未回答扱いとしてリストアップする（仮実装・後でAttendanceAPIと連携可能）
  const unanswered = events
    .filter((e) => new Date(`${e.date}T00:00:00`) >= today)
    .filter((e) => e.location && e.location !== "未定")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (unanswered.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border-2 border-ag-gray-100 shadow-sm mt-8">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-xl font-black text-ag-gray-800 mb-2">未回答の予定はありません！</h3>
        <p className="text-sm font-bold text-ag-gray-500">すべての予定への回答が完了しています。ご協力ありがとうございます。</p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/50 rounded-3xl border-2 border-amber-200 p-6 sm:p-8 mt-8 shadow-sm">
      <h3 className="font-black text-amber-900 text-xl flex items-center gap-3 mb-6">
        <span className="text-2xl animate-bounce">⚠️</span>
        未回答のイベント・練習があります ({unanswered.length}件)
      </h3>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {unanswered.map((evt: any, idx: number) => {
          const d = new Date(`${evt.date}T00:00:00`);
          const dayStr = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
          return (
            <div
              key={idx}
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
                      📍 {evt.location}
                    </span>
                    {evt.myResponse === "pending" && (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                        保留中
                      </span>
                    )}
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
