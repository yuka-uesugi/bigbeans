"use client";

import { useState } from "react";
import ChatInput from "@/components/finance/ChatInput";
import TransactionList from "@/components/finance/TransactionList";
import PaymentStatus from "@/components/finance/PaymentStatus";
import MonthlyChart from "@/components/finance/MonthlyChart";
import ReceiptUpload from "@/components/finance/ReceiptUpload";
import AnnualReport from "@/components/finance/AnnualReport";

export default function FinancePage() {
  const [viewMode, setViewMode] = useState<"daily" | "annual">("daily");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-ag-gray-900 flex items-center gap-3">
            <span className="text-4xl">💰</span>
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
              📝 月次・入力
            </button>
            <button
              onClick={() => setViewMode("annual")}
              className={`flex-1 sm:px-6 py-2.5 text-sm font-black rounded-lg transition-all ${
                viewMode === "annual" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500 hover:text-ag-gray-700"
              }`}
            >
              📊 年度別報告書
            </button>
          </div>
          {viewMode === "annual" && (
            <button className="w-full sm:w-auto px-5 py-3 text-sm font-black rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-sm">
              🖨️ PDF印刷
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
        </>
      )}
    </div>
  );
}
