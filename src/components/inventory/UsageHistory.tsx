"use client";

const logs = [
  { id: 1, date: "今日 14:00", item: "エアロセンサ700", amount: -2, unit: "ダース", user: "管理者", note: "土曜練習で使用" },
  { id: 2, date: "昨日 10:30", item: "エアロセンサ300", amount: -1, unit: "ダース", user: "管理者", note: "初心者コートで使用" },
  { id: 3, date: "3/25", item: "グリップテープ（白）", amount: -1, unit: "本", user: "田中太郎", note: "練習中に切れたため購入" },
  { id: 4, date: "3/24", item: "エアロセンサ700", amount: 10, unit: "ダース", user: "管理者", note: "Amazonから到着・補充" },
];

export default function UsageHistory() {
  return (
    <div className="bg-white rounded-[2rem] border-2 border-ag-gray-100 shadow-xl overflow-hidden">
      <div className="px-6 py-5 border-b-2 border-ag-gray-100 flex items-center justify-between bg-ag-gray-50/50">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-black text-ag-gray-800 tracking-tight">使用履歴</h3>
        </div>
      </div>

      <div className="p-6">
        <div className="relative border-l-4 border-ag-gray-200 ml-4 space-y-8">
          {logs.map((log) => (
            <div key={log.id} className="relative pl-8">
              {/* タイムラインのドット */}
              <div className={`absolute -left-[14px] top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm ${log.amount > 0 ? "bg-ag-lime-500 ring-2 ring-ag-lime-100" : "bg-ag-gray-400 ring-2 ring-ag-gray-100"}`} />
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-ag-gray-500 bg-ag-gray-50 px-2 py-0.5 rounded-lg border border-ag-gray-100">{log.date}</span>
                  <span className={`text-base sm:text-lg font-black px-4 py-1.5 rounded-xl border-2 shadow-sm ${log.amount > 0 ? "bg-ag-lime-50 text-ag-lime-700 border-ag-lime-200" : "bg-ag-gray-50 text-ag-gray-700 border-ag-gray-200"}`}>
                    {log.amount > 0 ? "+" : ""}{log.amount} {log.unit}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-ag-gray-900 tracking-tight leading-tight">{log.item}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base font-bold text-ag-gray-600 mt-1 pb-2">
                  <span className="bg-ag-gray-100 text-ag-gray-800 px-3 py-1 rounded-xl shadow-sm border border-ag-gray-200 flex items-center gap-1.5">
                    <span className="text-xs opacity-50 font-normal">担当:</span> {log.user}
                  </span>
                  <span className="italic opacity-80 decoration-ag-gray-200 underline underline-offset-4">{log.note}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-6 py-4 text-base font-black text-ag-gray-600 hover:text-ag-gray-900 bg-ag-gray-50 hover:bg-ag-gray-100 border-2 border-ag-gray-200 rounded-[1.5rem] transition-all active:scale-95 shadow-sm">
          すべての使用履歴を確認
        </button>
      </div>
    </div>
  );
}
