"use client";

const logs = [
  { id: 1, date: "今日 14:00", item: "エアロセンサ700", amount: -2, unit: "ダース", user: "管理者", note: "土曜練習で使用" },
  { id: 2, date: "昨日 10:30", item: "エアロセンサ300", amount: -1, unit: "ダース", user: "管理者", note: "初心者コートで使用" },
  { id: 3, date: "3/25", item: "グリップテープ（白）", amount: -1, unit: "本", user: "田中太郎", note: "練習中に切れたため購入" },
  { id: 4, date: "3/24", item: "エアロセンサ700", amount: 10, unit: "ダース", user: "管理者", note: "Amazonから到着・補充" },
];

export default function UsageHistory() {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-ag-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="text-sm font-bold text-ag-gray-800">使用履歴（直近）</h3>
        </div>
      </div>

      <div className="p-5">
        <div className="relative border-l-2 border-ag-gray-100 ml-3 space-y-6">
          {logs.map((log) => (
            <div key={log.id} className="relative pl-6">
              {/* タイムラインのドット */}
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${log.amount > 0 ? "bg-ag-lime-400" : "bg-ag-gray-300"}`} />
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ag-gray-400">{log.date}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${log.amount > 0 ? "bg-ag-lime-50 text-ag-lime-600" : "bg-ag-gray-100 text-ag-gray-600"}`}>
                    {log.amount > 0 ? "+" : ""}{log.amount} {log.unit}
                  </span>
                </div>
                <p className="text-sm font-bold text-ag-gray-800">{log.item}</p>
                <div className="flex items-center gap-2 text-[11px] text-ag-gray-500 mt-1 pb-2">
                  <span className="bg-ag-gray-100 px-1.5 py-0.5 rounded">{log.user}</span>
                  <span>{log.note}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 py-2 text-xs font-semibold text-ag-gray-500 hover:text-ag-gray-800 hover:bg-ag-gray-50 rounded-xl transition-colors">
          すべての履歴を見る
        </button>
      </div>
    </div>
  );
}
