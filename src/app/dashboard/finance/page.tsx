"use client";

import { useState, useEffect } from "react";
import ChatInput from "@/components/finance/ChatInput";
import TransactionList from "@/components/finance/TransactionList";
import PaymentStatus from "@/components/finance/PaymentStatus";
import MonthlyChart from "@/components/finance/MonthlyChart";
import AnnualReport from "@/components/finance/AnnualReport";
import { subscribeToPaymentCollections, PaymentCollectionEvent } from "@/lib/payments";
import { subscribeToTransactionsByMonth, subscribeToTransactionsByCalendarYear, methodBucket, type TransactionEntry } from "@/lib/transactions";
import { subscribeToClubSettings, updateClubSettings } from "@/lib/settings";
import { useAuth } from "@/contexts/AuthContext";

export default function FinancePage() {
  // 期首残高はデータベース上「管理者(admin)のみ」書き込み可能なため、
  // ボタンも管理者にだけ表示する（会計担当に出すと押しても保存に失敗するため）。
  const { role } = useAuth();
  const canEditOpening = role === "admin";
  const [viewMode, setViewMode] = useState<"daily" | "annual">("daily");
  const [collections, setCollections] = useState<PaymentCollectionEvent[]>([]);
  const [currentMonthTxIncome, setCurrentMonthTxIncome] = useState(0);
  const [currentMonthTxExpense, setCurrentMonthTxExpense] = useState(0);
  // 暦年の全取引（残高内訳の計算用）
  const [yearEntries, setYearEntries] = useState<TransactionEntry[]>([]);
  // 期首残高（今年スタート時点の現金・口座）
  const [cashOpening, setCashOpening] = useState(0);
  const [bankOpening, setBankOpening] = useState(0);
  // 期首残高の編集
  const [editingOpening, setEditingOpening] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [bankInput, setBankInput] = useState("");
  const [savingOpening, setSavingOpening] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  useEffect(() => {
    const unsubPayments = subscribeToPaymentCollections((data) => {
      setCollections(data);
    });
    const unsubMonthTx = subscribeToTransactionsByMonth(currentYear, currentMonth, (entries) => {
      setCurrentMonthTxIncome(entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0));
      setCurrentMonthTxExpense(entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0));
    });
    const unsubYearTx = subscribeToTransactionsByCalendarYear(currentYear, setYearEntries);
    const unsubSettings = subscribeToClubSettings((s) => {
      setCashOpening(s.cashOpeningBalance ?? 0);
      setBankOpening(s.bankOpeningBalance ?? 0);
    });
    return () => { unsubPayments(); unsubMonthTx(); unsubYearTx(); unsubSettings(); };
  }, [currentYear, currentMonth]);

  // 残高の内訳（現金 / クラブ）を計算
  // income=入金, expense=出金, transfer=現金↔口座の移動（合計には影響しない）
  let cashDelta = 0, clubDelta = 0;
  for (const e of yearEntries) {
    if (e.type === "income") {
      if (methodBucket(e.method) === "cash") cashDelta += e.amount; else clubDelta += e.amount;
    } else if (e.type === "expense") {
      if (methodBucket(e.method) === "cash") cashDelta -= e.amount; else clubDelta -= e.amount;
    } else if (e.type === "transfer") {
      if (methodBucket(e.method) === "cash") cashDelta -= e.amount; else clubDelta -= e.amount;
      const to = e.toMethod ?? "銀行振込";
      if (methodBucket(to) === "cash") cashDelta += e.amount; else clubDelta += e.amount;
    }
  }
  const cashBalance = cashOpening + cashDelta;
  const clubBalance = bankOpening + clubDelta;
  const currentBalance = cashBalance + clubBalance;

  const openEditOpening = () => {
    setCashInput(String(cashOpening));
    setBankInput(String(bankOpening));
    setEditingOpening(true);
  };

  const saveOpening = async () => {
    const cash = parseInt(cashInput.replace(/[,，]/g, ""), 10);
    const bank = parseInt(bankInput.replace(/[,，]/g, ""), 10);
    if (isNaN(cash) || isNaN(bank)) { alert("金額を数字で入力してください"); return; }
    setSavingOpening(true);
    try {
      await updateClubSettings({ cashOpeningBalance: cash, bankOpeningBalance: bank });
      setEditingOpening(false);
    } catch (e) {
      console.error("期首残高の保存エラー:", e);
      alert("保存に失敗しました（権限が無い可能性があります）");
    } finally {
      setSavingOpening(false);
    }
  };

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
          {/* 残高サマリー（現金 / クラブ / 合計） */}
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-ag-gray-700">残高サマリー</h3>
          {canEditOpening && !editingOpening && (
            <button
              onClick={openEditOpening}
              className="text-xs font-black text-ag-lime-600 hover:text-ag-lime-700 underline"
            >
              期首残高を設定
            </button>
          )}
        </div>

        {editingOpening ? (
          <div className="space-y-3 rounded-xl bg-ag-lime-50/60 border border-ag-lime-200/60 p-4">
            <p className="text-xs font-bold text-ag-gray-600">
              今年スタート時点（1月1日）の残高を入力してください。以後の収入・支出・振替を足し引きして残高を表示します。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-black text-ag-gray-600">現金（手元）</span>
                <div className="flex items-center gap-1 bg-white border-2 border-ag-gray-200 rounded-xl px-3 mt-1 focus-within:border-ag-lime-400">
                  <span className="font-black text-ag-gray-400">¥</span>
                  <input type="number" inputMode="numeric" value={cashInput} onChange={(e) => setCashInput(e.target.value)}
                    className="w-full min-w-0 py-2 text-right font-black text-ag-gray-900 bg-transparent outline-none" placeholder="0" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-black text-ag-gray-600">クラブ（PayPay・口座）</span>
                <div className="flex items-center gap-1 bg-white border-2 border-ag-gray-200 rounded-xl px-3 mt-1 focus-within:border-ag-lime-400">
                  <span className="font-black text-ag-gray-400">¥</span>
                  <input type="number" inputMode="numeric" value={bankInput} onChange={(e) => setBankInput(e.target.value)}
                    className="w-full min-w-0 py-2 text-right font-black text-ag-gray-900 bg-transparent outline-none" placeholder="0" />
                </div>
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={saveOpening} disabled={savingOpening}
                className="flex-1 py-2.5 rounded-xl bg-ag-lime-500 hover:bg-ag-lime-600 disabled:opacity-50 text-white text-sm font-black transition-colors">
                {savingOpening ? "保存中..." : "保存する"}
              </button>
              <button onClick={() => setEditingOpening(false)}
                className="px-4 py-2.5 rounded-xl bg-ag-gray-100 hover:bg-ag-gray-200 text-ag-gray-700 text-sm font-black transition-colors">
                やめる
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 現金残高 */}
            <div className="rounded-xl bg-ag-gray-50 border border-ag-gray-200/60 p-4">
              <p className="text-xs font-bold text-ag-gray-400 mb-1">現金残高（手元）</p>
              <p className={`text-xl sm:text-2xl font-black ${cashBalance < 0 ? "text-red-600" : "text-ag-gray-900"}`}>¥{cashBalance.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-ag-gray-400 mt-1">期首 ¥{cashOpening.toLocaleString()} + 今年の現金収支</p>
            </div>
            {/* クラブ残高 */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs font-bold text-blue-400 mb-1">クラブ残高（PayPay・口座）</p>
              <p className={`text-xl sm:text-2xl font-black ${clubBalance < 0 ? "text-red-600" : "text-blue-700"}`}>¥{clubBalance.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-blue-300 mt-1">期首 ¥{bankOpening.toLocaleString()} + 今年の口座収支</p>
            </div>
            {/* 合計 */}
            <div className="col-span-2 lg:col-span-1 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-4 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
              <p className="text-xs font-bold text-white/80 mb-1">合計（総トータル）</p>
              <p className="text-xl sm:text-2xl font-black">¥{currentBalance.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-white/70 mt-1">現金 ＋ クラブ</p>
            </div>
          </div>
        )}
      </div>

      {/* 概要カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-ag-lime-500 to-ag-lime-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <p className="text-xs text-white/70 mb-1">現在の集金総額（収入）</p>
          <p className="text-2xl font-bold">¥{totalIncome.toLocaleString()}</p>
          <p className="text-xs text-white/60 mt-1">全ての集金リストの合計</p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">当月の集金実績</p>
          <p className="text-2xl font-bold text-ag-lime-600">¥{currentMonthPaid.toLocaleString()}</p>
          <p className="text-xs text-ag-gray-400 mt-1 flex items-center gap-1">
            目標: ¥{currentMonthTarget.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">今月の支出</p>
          <p className="text-2xl font-bold text-red-500">¥{currentMonthTxExpense.toLocaleString()}</p>
          <p className="text-xs text-ag-gray-400 mt-1">
            収入 ¥{currentMonthTxIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
          <p className="text-xs text-ag-gray-400 mb-1">当月 集金回収率</p>
          <p className="text-2xl font-bold text-ag-gray-800">{recoveryRate}%</p>
          <p className="text-xs text-ag-gray-400 mt-1">{currentMonthPaidCount}/{currentMonthTargetCount}名 納入済</p>
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
