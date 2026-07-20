"use client";

import type { EventData } from "@/lib/events";

interface AgendaViewProps {
  events: EventData[];
  isVisitor: boolean;
  onSelectEvent: (event: EventData) => void;
}

const TYPE_CONFIG: Record<string, { label: string; border: string; badge: string; bg: string }> = {
  practice: { label: "練習",   border: "border-l-ag-lime-500",  badge: "bg-ag-lime-100 text-ag-lime-700",  bg: "" },
  match:    { label: "試合",   border: "border-l-blue-400",     badge: "bg-blue-100 text-blue-700",        bg: "" },
  event:    { label: "行事",   border: "border-l-purple-400",   badge: "bg-purple-100 text-purple-700",    bg: "" },
  deadline: { label: "締切",   border: "border-l-red-400",      badge: "bg-red-100 text-red-700",          bg: "" },
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function isWednesdayPractice(evt: EventData): boolean {
  if (evt.type !== "practice") return false;
  return new Date(evt.date + "T00:00:00").getDay() === 3;
}

function isDeadlineSoon(evt: EventData): boolean {
  if (evt.type !== "deadline") return false;
  const diff = (new Date(evt.date + "T00:00:00").getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 7;
}

function groupByMonth(events: EventData[]): { key: string; label: string; events: EventData[] }[] {
  const map: Record<string, EventData[]> = {};
  for (const e of events) {
    const [y, m] = e.date.split("-");
    const key = `${y}-${m}`;
    if (!map[key]) map[key] = [];
    map[key].push(e);
  }
  return Object.entries(map).map(([key, evts]) => {
    const [y, m] = key.split("-");
    return { key, label: `${y}年 ${parseInt(m)}月`, events: evts };
  });
}

export default function AgendaView({ events, isVisitor, onSelectEvent }: AgendaViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const groups = groupByMonth(upcoming);

  if (groups.length === 0) {
    return (
      <div className="py-24 text-center text-ag-gray-400">
        <p className="text-lg font-bold">今後の予定はありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(({ key, label, events: groupEvents }) => (
        <div key={key}>
          {/* 月ヘッダー */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-base font-black text-ag-gray-500 tracking-widest">{label}</span>
            <div className="flex-1 h-px bg-ag-gray-200" />
          </div>

          <div className="space-y-3">
            {groupEvents.map((evt) => {
              const d = new Date(evt.date + "T00:00:00");
              const dayIdx = d.getDay();
              const dayStr = DAYS[dayIdx];
              const isWed = isWednesdayPractice(evt);
              const soonDeadline = isDeadlineSoon(evt);
              const cfg = TYPE_CONFIG[evt.type] ?? TYPE_CONFIG.event;
              const isToday = d.getTime() === today.getTime();

              return (
                <button
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className={[
                    "w-full text-left bg-white rounded-2xl border-l-4 shadow-sm transition-all",
                    "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                    cfg.border,
                    isWed ? "ring-2 ring-ag-lime-200" : "border border-ag-gray-100",
                    soonDeadline ? "animate-pulse ring-2 ring-red-300" : "",
                  ].join(" ")}
                >
                  <div className="flex items-stretch gap-0">
                    {/* 日付列 */}
                    <div className={[
                      "shrink-0 w-20 flex flex-col items-center justify-center py-4 px-2 rounded-l-2xl gap-0.5",
                      isWed ? "bg-ag-lime-50" : "bg-ag-gray-50",
                    ].join(" ")}>
                      {/* 月/日 */}
                      <span className={[
                        "text-base font-black leading-none",
                        dayIdx === 0 ? "text-red-400" : dayIdx === 6 ? "text-blue-400" : "text-ag-gray-500",
                      ].join(" ")}>
                        {d.getMonth() + 1}/{d.getDate()}
                      </span>
                      {/* 曜日 */}
                      <span className={[
                        "text-3xl font-black leading-none tracking-tighter",
                        dayIdx === 0 ? "text-red-500" : dayIdx === 6 ? "text-blue-500" : isWed ? "text-ag-lime-600" : "text-ag-gray-800",
                      ].join(" ")}>
                        {dayStr}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-black text-white bg-ag-lime-500 px-2 py-0.5 rounded-full mt-1">TODAY</span>
                      )}
                    </div>

                    {/* コンテンツ列 */}
                    <div className="flex-1 px-4 py-4 min-w-0">
                      {/* バッジ群 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        {isWed && (
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-ag-lime-500 text-white">
                            定期練習
                          </span>
                        )}
                        {soonDeadline && (
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-red-500 text-white">
                            締切間近
                          </span>
                        )}
                      </div>

                      {/* 時間 */}
                      <p className="text-base font-black text-ag-gray-700 leading-none mb-1">
                        {evt.time}
                      </p>

                      {/* タイトル */}
                      <p className="text-lg font-black text-ag-gray-900 leading-snug">
                        {evt.title}
                      </p>

                      {/* 場所 */}
                      <p className="text-base font-bold text-ag-gray-500 mt-1">
                        {evt.location}
                      </p>

                      {/* 備考（description）。内輪の連絡が含まれるためメンバー限定 */}
                      {evt.description && !isVisitor && (
                        <p className="text-sm text-ag-gray-400 mt-0.5">
                          {evt.description}
                        </p>
                      )}

                      {/* タップ誘導ラベル */}
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="text-xs font-black text-ag-lime-600 bg-ag-lime-50 border border-ag-lime-200 px-3 py-1 rounded-full">
                          詳細・出欠を確認
                        </span>
                        <svg className="w-3.5 h-3.5 text-ag-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
