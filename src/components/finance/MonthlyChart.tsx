"use client";

// チーム専用のカテゴリマスター（収入・支出共通）
export const INCOME_CATEGORIES = [
  { id: "入会費", label: "入会費", icon: "", type: "income" as const },
  { id: "月会費", label: "月会費", icon: "", type: "income" as const },
  { id: "休会費", label: "休会費", icon: "", type: "income" as const },
  { id: "ビジター料", label: "ビジター料", icon: "", type: "income" as const },
  { id: "体験会・初参加者", label: "体験会・初参加者", icon: "", type: "income" as const },
  { id: "練習会ビジター料", label: "練習会 ビジター料", icon: "", type: "income" as const },
  { id: "休会中練習参加費", label: "休会中練習参加費", icon: "", type: "income" as const },
  { id: "第2練習参加費", label: "第2練習参加費", icon: "", type: "income" as const },
  { id: "古シャトル売却", label: "古シャトル売却", icon: "", type: "income" as const },
  { id: "その他収入", label: "その他収入", icon: "", type: "income" as const },
];

export const EXPENSE_CATEGORIES = [
  { id: "コーチ料", label: "コーチ料", icon: "", type: "expense" as const },
  { id: "コーチ料(山口)", label: "コーチ料 (山口コーチ)", icon: "", type: "expense" as const },
  { id: "コーチお車代", label: "コーチお車代", icon: "", type: "expense" as const },
  { id: "コート代", label: "コート代", icon: "", type: "expense" as const },
  { id: "交通費", label: "交通費", icon: "", type: "expense" as const },
  { id: "冷暖費", label: "冷暖費", icon: "", type: "expense" as const },
  { id: "シャトル代", label: "シャトル代", icon: "", type: "expense" as const },
  { id: "お中元・お歳暮", label: "お中元・お歳暮", icon: "", type: "expense" as const },
  { id: "団体登録料", label: "団体登録料", icon: "", type: "expense" as const },
  { id: "SC登録更新料", label: "SC登録更新料", icon: "", type: "expense" as const },
  { id: "振り込み手数料", label: "振り込み手数料", icon: "", type: "expense" as const },
  { id: "郵送料", label: "郵送料", icon: "", type: "expense" as const },
  { id: "総会", label: "総会", icon: "", type: "expense" as const },
  { id: "お楽しみ会", label: "お楽しみ会", icon: "", type: "expense" as const },
  { id: "事務局インク代", label: "事務局インク代", icon: "", type: "expense" as const },
  { id: "事務用品代", label: "事務用品代", icon: "", type: "expense" as const },
  { id: "市本部差し入れ代", label: "市本部の方差し入れ代", icon: "", type: "expense" as const },
  { id: "ユニフォーム・応援グッズ", label: "ユニフォーム・応援グッズ", icon: "", type: "expense" as const },
  { id: "部員募集印刷", label: "部員募集印刷", icon: "", type: "expense" as const },
  { id: "お祝い・送別品", label: "お祝い・送別品", icon: "", type: "expense" as const },
  { id: "その他支出", label: "その他支出", icon: "", type: "expense" as const },
];

// カテゴリ別支出チャート（実績ベースに更新）
const categories = [
  { name: "コート代", amount: 108300, percentage: 18, icon: "", color: "bg-blue-400" },
  { name: "シャトル代", amount: 159088, percentage: 26, icon: "", color: "bg-ag-lime-400" },
  { name: "コーチ料", amount: 277000, percentage: 45, icon: "", color: "bg-purple-400" },
  { name: "交通費", amount: 2300, percentage: 0, icon: "", color: "bg-amber-400" },
  { name: "行事・総会", amount: 12799, percentage: 2, icon: "", color: "bg-emerald-400" },
  { name: "その他", amount: 50453, percentage: 9, icon: "", color: "bg-ag-gray-400" },
];

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
            <h3 className="text-base font-black text-ag-gray-800">月別収支推移</h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-ag-lime-400" /> 収入
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-300" /> 支出
            </span>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-3 h-44">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end justify-center h-36">
                  <div
                    className="w-5 rounded-t-md bg-gradient-to-t from-ag-lime-500 to-ag-lime-300 transition-all duration-500"
                    style={{ height: `${(d.income / maxValue) * 100}%` }}
                    title={`収入: ¥${d.income.toLocaleString()}`}
                  />
                  <div
                    className="w-5 rounded-t-md bg-gradient-to-t from-red-400 to-red-200 transition-all duration-500"
                    style={{ height: `${(d.expense / maxValue) * 100}%` }}
                    title={`支出: ¥${d.expense.toLocaleString()}`}
                  />
                </div>
                <span className="text-xs text-ag-gray-400 font-bold">{d.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* カテゴリ別支出 */}
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-ag-gray-800">カテゴリ別支出 (R7実績)</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex h-4 rounded-full overflow-hidden mb-5">
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
              <div className={`w-2 h-8 rounded-full ${cat.color}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base font-black text-ag-gray-800">{cat.name}</span>
                  <span className="text-base font-black text-ag-gray-900">¥{cat.amount.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-ag-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${cat.color} transition-all duration-500`} style={{ width: `${cat.percentage}%` }} />
                </div>
              </div>
              <span className="text-sm font-black text-ag-gray-500 w-10 text-right">{cat.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
