"use client";

import { useState, useEffect, useMemo } from "react";
import { subscribeToTransactionsByFiscalYear, type TransactionEntry } from "@/lib/transactions";

// ─────────────────────────────────────────────
// カテゴリマスター（ChatInput でも import して使う）
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// カテゴリグルーピング（グラフ表示用）
// ─────────────────────────────────────────────

const CATEGORY_GROUPS = [
  { name: "コーチ料",  ids: ["コーチ料", "コーチ料(山口)", "コーチお車代"], color: "bg-purple-400", tw: "purple" },
  { name: "コート代",  ids: ["コート代"],                                   color: "bg-blue-400",   tw: "blue"   },
  { name: "シャトル代",ids: ["シャトル代"],                                  color: "bg-ag-lime-400",tw: "lime"   },
  { name: "行事・総会",ids: ["総会", "お楽しみ会", "お祝い・送別品"],         color: "bg-emerald-400",tw: "emerald"},
  { name: "その他",    ids: [],                                             color: "bg-ag-gray-300", tw: "gray"  },
];

// 4月〜3月の月ラベル
const FISCAL_MONTHS = ["4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月"];

function getCurrentFiscalYear(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

function fiscalMonthIndex(dateStr: string): number {
  // "2026-04-08" → 0(4月)〜11(3月)
  const month = parseInt(dateStr.slice(5, 7), 10);
  return month >= 4 ? month - 4 : month + 8;
}

// ─────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────

export default function MonthlyChart() {
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToTransactionsByFiscalYear(fiscalYear, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    return () => unsub();
  }, [fiscalYear]);

  // 月別収支
  const monthlyData = useMemo(() => {
    const grid = Array.from({ length: 12 }, (_, i) => ({ month: FISCAL_MONTHS[i], income: 0, expense: 0 }));
    for (const tx of transactions) {
      const idx = fiscalMonthIndex(tx.date);
      if (idx < 0 || idx > 11) continue;
      if (tx.type === "income")  grid[idx].income  += tx.amount;
      else                       grid[idx].expense += tx.amount;
    }
    return grid;
  }, [transactions]);

  // カテゴリ別支出
  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      totals[tx.categoryId] = (totals[tx.categoryId] ?? 0) + tx.amount;
    }

    const groups = CATEGORY_GROUPS.map((g) => {
      const amount = g.ids.length > 0
        ? g.ids.reduce((s, id) => s + (totals[id] ?? 0), 0)
        : 0;
      return { ...g, amount };
    });

    // 「その他」に残カテゴリを全部入れる
    const knownIds = new Set(CATEGORY_GROUPS.flatMap((g) => g.ids));
    const otherAmount = Object.entries(totals)
      .filter(([id]) => !knownIds.has(id))
      .reduce((s, [, v]) => s + v, 0);
    groups[groups.length - 1].amount += otherAmount;

    const total = groups.reduce((s, g) => s + g.amount, 0);
    return groups
      .filter((g) => g.amount > 0)
      .map((g) => ({ ...g, pct: total > 0 ? Math.round((g.amount / total) * 100) : 0 }));
  }, [transactions]);

  const maxBar = Math.max(1, ...monthlyData.flatMap((d) => [d.income, d.expense]));
  const totalIncome  = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // 表示する月：データがある最後の月まで（最低でも当月まで）
  const now = new Date();
  const currentFiscalMonth = fiscalYear === getCurrentFiscalYear()
    ? (now.getMonth() >= 3 ? now.getMonth() - 3 : now.getMonth() + 9)
    : 11;
  const visibleMonths = monthlyData.slice(0, currentFiscalMonth + 1);

  return (
    <div className="space-y-6">
      {/* 月別収支グラフ */}
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
          <h3 className="text-base font-black text-ag-gray-800">月別収支推移</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-ag-lime-400" />収入</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-300" />支出</span>
            </div>
            <div className="flex items-center gap-1 border border-ag-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setFiscalYear((y) => y - 1)}
                className="px-2 py-1 text-xs font-bold text-ag-gray-500 hover:bg-ag-gray-100 transition-colors"
              >‹</button>
              <span className="px-2 text-xs font-black text-ag-gray-700 whitespace-nowrap">
                {fiscalYear}年度
              </span>
              <button
                onClick={() => setFiscalYear((y) => y + 1)}
                disabled={fiscalYear >= getCurrentFiscalYear()}
                className="px-2 py-1 text-xs font-bold text-ag-gray-500 hover:bg-ag-gray-100 transition-colors disabled:opacity-30"
              >›</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-ag-gray-400 text-sm font-bold animate-pulse">
            読み込み中...
          </div>
        ) : (
          <div className="p-5">
            {/* 年度合計サマリー */}
            <div className="flex gap-4 mb-4">
              <span className="text-xs font-bold text-ag-gray-400">
                年度収入 <span className="text-ag-lime-600 font-black">¥{totalIncome.toLocaleString()}</span>
              </span>
              <span className="text-xs font-bold text-ag-gray-400">
                年度支出 <span className="text-red-500 font-black">¥{totalExpense.toLocaleString()}</span>
              </span>
              <span className="text-xs font-bold text-ag-gray-400">
                差引 <span className={`font-black ${totalIncome - totalExpense >= 0 ? "text-ag-gray-800" : "text-red-600"}`}>
                  {totalIncome - totalExpense >= 0 ? "+" : ""}¥{(totalIncome - totalExpense).toLocaleString()}
                </span>
              </span>
            </div>

            <div className="flex items-end gap-1.5 h-44 overflow-x-auto pb-1">
              {visibleMonths.map((d, i) => (
                <div key={d.month} className="flex-1 min-w-[28px] flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end justify-center h-36">
                    <div
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-ag-lime-500 to-ag-lime-300 transition-all duration-500 min-h-[2px]"
                      style={{ height: `${Math.max(2, (d.income / maxBar) * 100)}%` }}
                      title={`収入: ¥${d.income.toLocaleString()}`}
                    />
                    <div
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-red-400 to-red-200 transition-all duration-500 min-h-[2px]"
                      style={{ height: `${Math.max(2, (d.expense / maxBar) * 100)}%` }}
                      title={`支出: ¥${d.expense.toLocaleString()}`}
                    />
                  </div>
                  <span className="text-[9px] text-ag-gray-400 font-bold leading-none">{d.month}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* カテゴリ別支出 */}
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ag-gray-100">
          <h3 className="text-base font-black text-ag-gray-800">
            カテゴリ別支出
            <span className="text-xs font-bold text-ag-gray-400 ml-2">{fiscalYear}年度</span>
          </h3>
        </div>

        {loading ? (
          <div className="h-32 flex items-center justify-center text-ag-gray-400 text-sm font-bold animate-pulse">読み込み中...</div>
        ) : categoryData.length === 0 ? (
          <div className="px-5 py-8 text-center text-ag-gray-400 text-sm font-bold">支出データがありません</div>
        ) : (
          <div className="p-5 space-y-4">
            {/* 積み上げバー */}
            <div className="flex h-4 rounded-full overflow-hidden mb-5">
              {categoryData.map((cat) => (
                <div
                  key={cat.name}
                  className={`${cat.color} transition-all duration-500`}
                  style={{ width: `${cat.pct}%` }}
                  title={`${cat.name}: ${cat.pct}%`}
                />
              ))}
            </div>

            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${cat.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-ag-gray-800">{cat.name}</span>
                    <span className="text-sm font-black text-ag-gray-900">¥{cat.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ag-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.color} transition-all duration-700`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-black text-ag-gray-500 w-9 text-right shrink-0">{cat.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
