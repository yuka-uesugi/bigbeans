"use client";

interface Activity {
  id: number;
  user: string;
  avatar: string;
  action: string;
  detail: string;
  time: string;
  type: "attendance" | "finance" | "inventory" | "report" | "system";
}

const activities: Activity[] = [
  {
    id: 1,
    user: "田中太郎",
    avatar: "田",
    action: "出欠回答",
    detail: "3/29(土) の練習に「参加」と回答",
    time: "10分前",
    type: "attendance",
  },
  {
    id: 2,
    user: "佐藤花子",
    avatar: "佐",
    action: "月謝納入",
    detail: "3月分の月謝 ¥3,000 をPayPayで送金",
    time: "1時間前",
    type: "finance",
  },
  {
    id: 3,
    user: "鈴木一郎",
    avatar: "鈴",
    action: "経費入力",
    detail: "「コート代3000円、シャトル代5000円」",
    time: "2時間前",
    type: "finance",
  },
  {
    id: 4,
    user: "システム",
    avatar: "🤖",
    action: "在庫アラート",
    detail: "シャトルコック（エアロセンサ700）が残り6本です",
    time: "3時間前",
    type: "inventory",
  },
  {
    id: 5,
    user: "山田次郎",
    avatar: "山",
    action: "レポート投稿",
    detail: "3/25 練習レポートを投稿しました",
    time: "昨日",
    type: "report",
  },
];

const typeIconBg = {
  attendance: "bg-blue-100 text-blue-600",
  finance: "bg-emerald-100 text-emerald-600",
  inventory: "bg-amber-100 text-amber-600",
  report: "bg-purple-100 text-purple-600",
  system: "bg-ag-gray-100 text-ag-gray-600",
};

const typeIcon = {
  attendance: "📅",
  finance: "💰",
  inventory: "📦",
  report: "📝",
  system: "⚙️",
};

export default function ActivityFeed() {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">📣</span>
          <h3 className="text-sm font-bold text-ag-gray-800">最近のアクティビティ</h3>
        </div>
      </div>

      {/* アクティビティ一覧 */}
      <div className="divide-y divide-ag-gray-50">
        {activities.map((activity) => (
          <div key={activity.id} className="px-5 py-3.5 hover:bg-ag-gray-50/50 transition-colors">
            <div className="flex items-start gap-3">
              {/* アバター */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                activity.user === "システム"
                  ? "bg-ag-gray-100"
                  : "bg-gradient-to-br from-ag-lime-300 to-ag-lime-500 text-white"
              }`}>
                {activity.avatar}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-ag-gray-800">{activity.user}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeIconBg[activity.type]}`}>
                    {typeIcon[activity.type]} {activity.action}
                  </span>
                </div>
                <p className="text-xs text-ag-gray-500 truncate">{activity.detail}</p>
              </div>

              {/* 時間 */}
              <span className="text-[11px] text-ag-gray-400 flex-shrink-0 mt-0.5">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
