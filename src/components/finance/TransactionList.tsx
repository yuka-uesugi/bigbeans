"use client";

import { useState, useEffect } from "react";
import { subscribeToTransactionsByMonth, deleteTransaction, type TransactionEntry } from "@/lib/transactions";
import { useAuth } from "@/contexts/AuthContext";

const METHOD_BADGE: Record<string, string> = {
  現金:     "bg-ag-gray-100 text-ag-gray-700",
  PayPay:   "bg-red-100 text-red-700",
  銀行振込: "bg-blue-100 text-blue-700",
  その他:   "bg-ag-gray-100 text-ag-gray-500",
};

export default function TransactionList() {
  const { role } = useAuth();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<TransactionEntry[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToTransactionsByMonth(year, month, setEntries);
    return () => unsub();
  }, [year, month]);

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`「${desc}」を削除しますか？`)) return;
    setDeleting(id);
    try {
      await deleteTransaction(id);
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  const income  = entries.filter(e => e.type === "income");
  const expense = entries.filter(e => e.type === "expense");
  const totalIncome  = income.reduce((s, e) => s + e.amount, 0);
  const totalExpense = expense.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <h3 className="text-base font-black text-ag-gray-800">取引履歴</h3>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ag-gray-100 text-ag-gray-500 font-black transition-colors">‹</button>
          <span className="text-sm font-black text-ag-gray-700 min-w-[72px] text-center">{year}年 {month}月</span>
          <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ag-gray-100 text-ag-gray-500 font-black transition-colors">›</button>
        </div>
      </div>

      {/* 月次サマリー */}
      <div className="grid grid-cols-3 divide-x divide-ag-gray-100 border-b border-ag-gray-100">
        <div className="px-4 py-3 text-center">
          <div className="text-[10px] font-bold text-ag-gray-400 mb-0.5">収入</div>
          <div className="text-lg font-black text-ag-lime-600">¥{totalIncome.toLocaleString()}</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-[10px] font-bold text-ag-gray-400 mb-0.5">支出</div>
          <div className="text-lg font-black text-red-500">¥{totalExpense.toLocaleString()}</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-[10px] font-bold text-ag-gray-400 mb-0.5">差引</div>
          <div className={`text-lg font-black ${balance >= 0 ? "text-ag-gray-900" : "text-red-600"}`}>
            {balance >= 0 ? "+" : ""}¥{balance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 一覧 */}
      {entries.length === 0 ? (
        <div className="px-5 py-10 text-center text-ag-gray-400 text-sm font-bold">
          この月の取引はまだありません
        </div>
      ) : (
        <div className="divide-y divide-ag-gray-50">
          {entries.map((e) => (
            <div key={e.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-ag-gray-50 transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${e.type === "income" ? "bg-ag-lime-500" : "bg-red-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-ag-gray-900 truncate">{e.description}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${METHOD_BADGE[e.method] ?? METHOD_BADGE["その他"]}`}>
                    {e.method}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold text-ag-gray-400">{e.categoryId}</span>
                  <span className="text-[10px] text-ag-gray-300">•</span>
                  <span className="text-[10px] text-ag-gray-400">{e.date}</span>
                  <span className="text-[10px] text-ag-gray-300">•</span>
                  <span className="text-[10px] text-ag-gray-400">{e.enteredBy}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-base font-black ${e.type === "income" ? "text-ag-lime-600" : "text-red-500"}`}>
                  {e.type === "income" ? "+" : "−"}¥{e.amount.toLocaleString()}
                </span>
                {role === "admin" && (
                  <button
                    onClick={() => handleDelete(e.id, e.description)}
                    disabled={deleting === e.id}
                    className="opacity-0 group-hover:opacity-100 text-ag-gray-300 hover:text-red-500 text-xs font-black px-2 py-1 rounded hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    {deleting === e.id ? "..." : "削除"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
