"use client";

const categories = [
  { name: "施設費", amount: 24500, percentage: 38, icon: "🏢", color: "bg-blue-400" },
  { name: "備品費", amount: 18000, percentage: 28, icon: "🏸", color: "bg-ag-lime-400" },
  { name: "指導費", amount: 10000, percentage: 15, icon: "👨‍🏫", color: "bg-purple-400" },
  { name: "交通費", amount: 5600, percentage: 9, icon: "🚗", color: "bg-amber-400" },
  { name: "飲食費", amount: 3200, percentage: 5, icon: "🍵", color: "bg-emerald-400" },
  { name: "その他", amount: 3000, percentage: 5, icon: "📦", color: "bg-ag-gray-400" },
];

// 月別データのモック
const monthlyData = [
  { month: "10月", income: 54000, expense: 38000 },
  { month: "11月", income: 57000, expense: 42000 },
  { month: "12月", income: 51000, expense: 55000 },
  { month: "1月", income: 60000, expense: 41000 },
  { month: "2月", income: 54000, expense: 39000 },
  { month: "3月", income: 85000, expense: 64300 },
];

export default function MonthlyChart() {
  const maxValue = Math.max(...monthlyData.flatMap((d) => [d.income, d.expense]));

  return (
    <div className="space-y-6">
      {/* 月別収支グラフ */}
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">📈</span>
            <h3 className="text-sm font-bold text-ag-gray-800">月別収支推移</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-ag-lime-400" />
              収入
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-300" />
              支出
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-end gap-3 h-44">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end justify-center h-36">
                  {/* 収入バー */}
                  <div
                    className="w-5 rounded-t-md bg-gradient-to-t from-ag-lime-500 to-ag-lime-300 transition-all duration-500"
                    style={{ height: `${(d.income / maxValue) * 100}%` }}
                    title={`収入: ¥${d.income.toLocaleString()}`}
                  />
                  {/* 支出バー */}
                  <div
                    className="w-5 rounded-t-md bg-gradient-to-t from-red-400 to-red-200 transition-all duration-500"
                    style={{ height: `${(d.expense / maxValue) * 100}%` }}
                    title={`支出: ¥${d.expense.toLocaleString()}`}
                  />
                </div>
                <span className="text-[10px] text-ag-gray-400 font-medium">{d.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* カテゴリ別支出 */}
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h3 className="text-sm font-bold text-ag-gray-800">カテゴリ別支出（今月）</h3>
          </div>
        </div>

        {/* 横棒グラフ風表示 */}
        <div className="p-5 space-y-3">
          {/* 円グラフ風ドーナツバー */}
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className={`${cat.color} transition-all duration-500`}
                style={{ width: `${cat.percentage}%` }}
                title={`${cat.name}: ${cat.percentage}%`}
              />
            ))}
          </div>

          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center gap-3">
              <span className="text-base w-7 text-center">{cat.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ag-gray-700">{cat.name}</span>
                  <span className="text-sm font-bold text-ag-gray-800">¥{cat.amount.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-ag-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cat.color} transition-all duration-500`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-ag-gray-400 w-10 text-right">{cat.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
