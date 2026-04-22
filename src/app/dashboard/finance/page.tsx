"use client";

import { useState, useEffect } from "react";
import ChatInput from "@/components/finance/ChatInput";
import TransactionList from "@/components/finance/TransactionList";
import PaymentStatus from "@/components/finance/PaymentStatus";
import MonthlyChart from "@/components/finance/MonthlyChart";
import AnnualReport from "@/components/finance/AnnualReport";
import { subscribeToPaymentCollections, PaymentCollectionEvent } from "@/lib/payments";
import { subscribeToTransactionsByMonth } from "@/lib/transactions";

export default function FinancePage() {
  const [viewMode, setViewMode] = useState<"daily" | "annual">("daily");
  const [collections, setCollections] = useState<PaymentCollectionEvent[]>([]);
  const [currentMonthTxIncome, setCurrentMonthTxIncome] = useState(0);
  const [currentMonthTxExpense, setCurrentMonthTxExpense] = useState(0);

  const now = new Date();

  useEffect(() => {
    const unsubPayments = subscribeToPaymentCollections((data) => {
      setCollections(data);
    });
    const unsubTx = subscribeToTransactionsByMonth(now.getFullYear(), now.getMonth() + 1, (entries) => {
      setCurrentMonthTxIncome(entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0));
      setCurrentMonthTxExpense(entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0));
    });
    return () => { unsubPayments(); unsubTx(); };
  }, []);

  // 集計計算
  // チーム総残高: すべてのPaidAmountの合計（※支出は未実装のため仮の総計）
  const totalIncome = collections.reduce((sum, coll) => {
    return sum + Object.values(coll.payments).reduce((s, p) => s + p.paidAmount, 0);
  }, 0);

  // 今月の収入: IDが当月の年月（YYYY-MM）から始まるか、作成日時が当月のものを集計
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // "2026-04" 等
  const currentMonthCollections = collections.filter(c => {
     if (c.id.startsWith(currentMonthPrefix)) return true;
     if (!c.createdAt) return false;
     return c.createdAt.toDate().toISOString().startsWith(currentMonthPrefix);
  });
  
  const currentMonthIncome = currentMonthCollections.reduce((sum, coll) => {
    return sum + Object.values(coll.payments).reduce((s, p) => s + p.paidAmount, 0);
  }, 0);

  // 当月の回収率
  let currentMonthTarget = 0;
  let currentMonthPaid = 0;
  let currentMonthTargetCount = 0;
  let currentMonthPaidCount = 0;

  currentMonthCollections.forEach(c => {
    Object.values(c.payments).forEach(p => {
      currentMonthTarget += p.targetAmount;
      currentMonthPaid += p.paidAmount;
      if (p.targetAmount > 0) currentMonthTargetCount++;
      if (p.status === "paid") currentMonthPaidCount++;
    });
  });

  const recoveryRate = currentMonthTarget > 0 ? Math.round((currentMonthPaid / currentMonthTarget) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-ag-gray-900 flex items-center gap-3">
            チーム会計・決算
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            チームの収支管理・月謝徴収・経費入力
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* 表示切り替えトグル */}
          <div className="flex bg-ag-gray-100 p-1 rounded-xl shadow-inner w-full sm:w-auto">
            <button
              onClick={() => setViewMode("daily")}
              className={`flex-1 sm:px-6 py-2.5 text-sm font-black rounded-lg transition-all ${
                viewMode === "daily" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500 hover:text-ag-gray-700"
              }`}
            >
              月次・入力
            </button>
            <button
              onClick={() => setViewMode("annual")}
              className={`flex-1 sm:px-6 py-2.5 text-sm font-black rounded-lg transition-all ${
                viewMode === "annual" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500 hover:text-ag-gray-700"
              }`}
            >
              年度別報告書
            </button>
          </div>
          {viewMode === "annual" && (
            <button className="w-full sm:w-auto px-5 py-3 text-sm font-black rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-sm">
              PDF印刷
            </button>
          )}
        </div>
      </div>

      {viewMode === "annual" ? (
        <AnnualReport />
      ) : (
        <>
          {/* 概要カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-ag-lime-500 to-ag-lime-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <p className="text-xs text-white/70 mb-1">現在の集金総額（収入）</p>
          <p className="text-2xl font-bold">¥{totalIncome.toLocaleString()}</p>
          <p className="text-[10px] text-white/60 mt-1">全ての集金リストの合計</p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">当月の集金実績</p>
          <p className="text-2xl font-bold text-ag-lime-600">¥{currentMonthPaid.toLocaleString()}</p>
          <p className="text-[10px] text-ag-gray-400 mt-1 flex items-center gap-1">
            目標: ¥{currentMonthTarget.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">今月の支出</p>
          <p className="text-2xl font-bold text-red-500">¥{currentMonthTxExpense.toLocaleString()}</p>
          <p className="text-[10px] text-ag-gray-400 mt-1">
            収入 ¥{currentMonthTxIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">当月 集金回収率</p>
          <p className="text-2xl font-bold text-ag-gray-800">{recoveryRate}%</p>
          <p className="text-[10px] text-ag-gray-400 mt-1">{currentMonthPaidCount}/{currentMonthTargetCount}名 納入済</p>
        </div>
      </div>

      {/* 中段：AI入力 */}
      <div className="mb-6">
        <ChatInput />
      </div>

      {/* 下段：月謝状況 + グラフ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentStatus />
        <MonthlyChart />
      </div>

      {/* 取引履歴 */}
      <TransactionList />
        </>
      )}
    </div>
  );
}
