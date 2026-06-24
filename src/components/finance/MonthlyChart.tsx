"use client";

import { useState, useEffect, useMemo } from "react";
import { subscribeToTransactionsByFiscalYear, type TransactionEntry } from "@/lib/transactions";

// ─────────────────────────────────────────────
// カテゴリマスター（ChatInput でも import して使う）
// ─────────────────────────────────────────────

export interface FinanceCategory {
  id: string;
  label: string;
  /** 入力ボタン用の短い表示名（省略時は label の「（」より前を使う） */
  short?: string;
  icon: string;
  type: "income" | "expense";
}

// ★2026年(令和8年度)〜 収入も項目をシンプルに統合（10→6項目）
//   「休会費」は撤廃。過去データ・自動生成(ビジター料/ライト会員費)も報告書側で合算します。
export const INCOME_CATEGORIES: FinanceCategory[] = [
  { id: "登録費", label: "登録費", icon: "", type: "income" },
  { id: "月会費", label: "月会費", icon: "", type: "income" },
  { id: "参加費（ライト会員）", label: "参加費（ライト会員）", short: "ライト会員", icon: "", type: "income" },
  { id: "参加費（ビジター）", label: "参加費（ビジター）", short: "ビジター", icon: "", type: "income" },
  { id: "参加費（第2練習）", label: "参加費（第2練習）", short: "第2練習", icon: "", type: "income" },
  { id: "その他収入", label: "その他収入（シャトル売却含む）", icon: "", type: "income" },
];

// ★2026年(令和8年度)〜 項目をシンプルに統合（21→11項目）
//   過去に旧項目で入力したデータも、決算報告書側のマッピングで合算されます。
export const EXPENSE_CATEGORIES: FinanceCategory[] = [
  { id: "コーチ料", label: "コーチ料", icon: "", type: "expense" },
  { id: "コーチ料(山口)", label: "コーチ料 (山口コーチ)", short: "コーチ料(山口)", icon: "", type: "expense" },
  { id: "コーチお車代", label: "コーチお車代", icon: "", type: "expense" },
  { id: "コート代", label: "コート代（冷暖費含む）", icon: "", type: "expense" },
  { id: "交通費", label: "交通費", icon: "", type: "expense" },
  { id: "シャトル代", label: "シャトル代", icon: "", type: "expense" },
  { id: "消耗品費", label: "消耗品費（インク・事務用品・印刷）", icon: "", type: "expense" },
  { id: "通信・手数料", label: "通信・手数料（振込・郵送）", icon: "", type: "expense" },
  { id: "登録料", label: "登録料（団体・SC）", icon: "", type: "expense" },
  { id: "交際・行事費", label: "交際・行事費（総会・お楽しみ会・贈答・お祝い等）", icon: "", type: "expense" },
  { id: "その他支出", label: "その他支出", icon: "", type: "expense" },
];

// ─────────────────────────────────────────────
// カテゴリグルーピング（グラフ表示用）
// ─────────────────────────────────────────────

const CATEGORY_GROUPS = [
  { name: "コーチ料",    ids: ["コーチ料", "コーチ料(山口)", "コーチお車代"], color: "bg-purple-400", tw: "purple" },
  { name: "コート代",    ids: ["コート代", "冷暖費"],                          color: "bg-blue-400",   tw: "blue"   },
  { name: "シャトル代",  ids: ["シャトル代"],                                  color: "bg-ag-lime-400",tw: "lime"   },
  { name: "交際・行事費",ids: ["交際・行事費", "総会", "お楽しみ会", "お祝い・送別品", "お中元・お歳暮", "市本部差し入れ代", "ユニフォーム・応援グッズ"], color: "bg-emerald-400",tw: "emerald"},
  { name: "その他",      ids: [],                                             color: "bg-ag-gray-300", tw: "gray"  },
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
