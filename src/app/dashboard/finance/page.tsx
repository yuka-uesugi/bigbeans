"use client";

import ChatInput from "@/components/finance/ChatInput";
import TransactionList from "@/components/finance/TransactionList";
import PaymentStatus from "@/components/finance/PaymentStatus";
import MonthlyChart from "@/components/finance/MonthlyChart";
import ReceiptUpload from "@/components/finance/ReceiptUpload";

export default function FinancePage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">💰</span>
            会計・家計簿
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            チームの収支管理・月謝徴収・経費入力
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-ag-gray-600 border border-ag-gray-200 hover:bg-ag-gray-50 transition-colors cursor-pointer">
            📥 CSVエクスポート
          </button>
          <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-ag-gray-600 border border-ag-gray-200 hover:bg-ag-gray-50 transition-colors cursor-pointer">
            📊 Googleシート同期
          </button>
        </div>
      </div>

      {/* 概要カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-ag-lime-500 to-ag-lime-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <p className="text-xs text-white/70 mb-1">チーム総残高</p>
          <p className="text-2xl font-bold">¥128,450</p>
          <p className="text-[10px] text-white/60 mt-1">前月比 +¥20,700</p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">今月の収入</p>
          <p className="text-2xl font-bold text-ag-lime-600">¥85,000</p>
          <p className="text-[10px] text-ag-gray-400 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-ag-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            前月比 +12%
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">今月の支出</p>
          <p className="text-2xl font-bold text-red-500">¥64,300</p>
          <p className="text-[10px] text-ag-gray-400 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
            前月比 +8%
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">月謝回収率</p>
          <p className="text-2xl font-bold text-ag-gray-800">70%</p>
          <p className="text-[10px] text-ag-gray-400 mt-1">7/10名 納入済</p>
        </div>
      </div>

      {/* 中段：AI入力 + レシートOCR */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <ChatInput />
        <ReceiptUpload />
      </div>

      {/* 下段：月謝状況 + グラフ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentStatus />
        <MonthlyChart />
      </div>

      {/* 取引履歴 */}
      <TransactionList />
    </div>
  );
}
