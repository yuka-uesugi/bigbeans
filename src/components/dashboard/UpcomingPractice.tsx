"use client";

interface Practice {
  id: number;
  date: string;
  day: string;
  time: string;
  location: string;
  attendees: number;
  total: number;
  status: "upcoming" | "today" | "ended";
}

const practices: Practice[] = [
  {
    id: 1,
    date: "3/27",
    day: "木",
    time: "19:00 - 21:00",
    location: "青葉台小学校 体育館",
    attendees: 12,
    total: 18,
    status: "today",
  },
  {
    id: 2,
    date: "3/29",
    day: "土",
    time: "13:00 - 17:00",
    location: "横浜市スポーツセンター",
    attendees: 8,
    total: 18,
    status: "upcoming",
  },
  {
    id: 3,
    date: "4/2",
    day: "水",
    time: "19:00 - 21:00",
    location: "青葉台小学校 体育館",
    attendees: 5,
    total: 18,
    status: "upcoming",
  },
];

const statusLabel = {
  today: { text: "今日", bg: "bg-ag-lime-100 text-ag-lime-700" },
  upcoming: { text: "予定", bg: "bg-ag-gray-100 text-ag-gray-600" },
  ended: { text: "終了", bg: "bg-ag-gray-100 text-ag-gray-400" },
};

export default function UpcomingPractice() {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="text-sm font-bold text-ag-gray-800">直近の練習予定</h3>
        </div>
        <button className="text-xs font-medium text-ag-lime-600 hover:text-ag-lime-700 transition-colors cursor-pointer">
          全て表示 →
        </button>
      </div>

      {/* 練習一覧 */}
      <div className="divide-y divide-ag-gray-100">
        {practices.map((p) => (
          <div key={p.id} className="px-5 py-4 hover:bg-ag-gray-50/50 transition-colors">
            <div className="flex items-start gap-4">
              {/* 日付ブロック */}
              <div className="w-14 h-14 rounded-xl bg-ag-gray-50 flex flex-col items-center justify-center flex-shrink-0 border border-ag-gray-200/40">
                <span className="text-lg font-bold text-ag-gray-800 leading-none">{p.date.split("/")[1]}</span>
                <span className="text-[10px] font-medium text-ag-gray-400">{p.day}曜日</span>
              </div>

              {/* 詳細 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusLabel[p.status].bg}`}>
                    {statusLabel[p.status].text}
                  </span>
                  <span className="text-sm font-semibold text-ag-gray-800">{p.time}</span>
                </div>
                <p className="text-xs text-ag-gray-500 truncate">{p.location}</p>
              </div>

              {/* 参加状況 */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-ag-gray-800">
                  <span className="text-ag-lime-600">{p.attendees}</span>
                  <span className="text-ag-gray-300"> / {p.total}</span>
                </div>
                <p className="text-[10px] text-ag-gray-400">参加者</p>
                {/* プログレスバー */}
                <div className="w-16 h-1.5 rounded-full bg-ag-gray-100 mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ag-lime-400 to-ag-lime-500 transition-all duration-500"
                    style={{ width: `${(p.attendees / p.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
