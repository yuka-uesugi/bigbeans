"use client";

import { useState } from "react";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "./MonthlyChart";
import { addTransaction, type PaymentMethod } from "@/lib/transactions";
import { useAuth } from "@/contexts/AuthContext";
import { useCanEditFinance } from "@/hooks/useCanEditFinance";
import { VENUE_OPTIONS } from "@/data/venueOptions";

// 日付を YYYY-MM-DD 形式で取得
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ボタンに表示する短い名前（「（…）」の補足は省く）
function shortLabel(label: string): string {
  return label.split("（")[0];
}

export default function ChatInput() {
  const { user } = useAuth();
  const canEdit = useCanEditFinance();
  const [mode, setMode] = useState<"expense" | "income" | "transfer">("expense");
  const [method, setMethod] = useState<PaymentMethod>("現金");
  const [transactionDate, setTransactionDate] = useState<string>(todayStr());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // 振替の向き（現金→口座 / 口座→現金）
  const [transferDir, setTransferDir] = useState<"cashToClub" | "clubToCash">("cashToClub");
  const [amount, setAmount] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const categories = mode === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const amountNum = parseInt(amount.replace(/[,，]/g, ""), 10);
  const amountOk = !isNaN(amountNum) && amountNum > 0;
  const canSave = mode === "transfer" ? amountOk : !!selectedCategory && amountOk;
  // 「コート代」を選んだときだけ、メモ欄で利用場所を候補から選べるようにする（手入力も可）
  const showVenueList = mode === "expense" && selectedCategory === "コート代";

  // 会計担当・サポーター・管理者以外は入力不可（閲覧のみ）
  if (!canEdit) {
    return (
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5 flex items-start gap-3">
        <svg className="w-5 h-5 text-ag-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <p className="text-sm font-black text-ag-gray-700">経費の入力は会計担当・サポーターのみ可能です</p>
          <p className="text-xs font-bold text-ag-gray-400 mt-1">
            会計の内容は下の「取引履歴」やグラフでどなたでも確認できます。
          </p>
        </div>
      </div>
    );
  }

  const switchMode = (next: "expense" | "income" | "transfer") => {
    setMode(next);
    setSelectedCategory(null);
    setSavedMsg(null);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setSavedMsg(null);
    try {
      if (mode === "transfer") {
        // 振替：現金↔口座のお金の移動。収支には影響しない。
        const fromMethod: PaymentMethod = transferDir === "cashToClub" ? "現金" : "銀行振込";
        const toMethod: PaymentMethod = transferDir === "cashToClub" ? "銀行振込" : "現金";
        const dirLabel = transferDir === "cashToClub" ? "現金 → 口座（クラブ）" : "口座（クラブ） → 現金";
        await addTransaction({
          date: transactionDate,
          description: memo.trim() || dirLabel,
          amount: amountNum,
          type: "transfer",
          categoryId: "振替",
          enteredBy: user?.displayName || "不明",
          method: fromMethod,
          toMethod,
        });
        setSavedMsg(`振替 ${dirLabel} ¥${amountNum.toLocaleString()} を記録しました`);
      } else {
        if (!selectedCategory) return;
        const cat = categories.find((c) => c.id === selectedCategory);
        const description = memo.trim() || (cat ? shortLabel(cat.label) : selectedCategory);
        await addTransaction({
          date: transactionDate,
          description,
          amount: amountNum,
          type: mode,
          categoryId: selectedCategory,
          enteredBy: user?.displayName || "不明",
          method,
        });
        setSavedMsg(`${shortLabel(cat?.label ?? "")} ¥${amountNum.toLocaleString()} を記帳しました`);
      }
      // 次の入力に備えてリセット（取引日・支払い方法は引き継ぐ）
      setSelectedCategory(null);
      setAmount("");
      setMemo("");
    } catch (e) {
      console.error("家計簿保存エラー:", e);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black text-ag-gray-800">かんたん経費入力</h3>
          <span className="text-xs font-bold text-ag-gray-400 bg-ag-gray-50 px-2 py-0.5 rounded-full">選んで入力</span>
        </div>
        <div className="flex bg-ag-gray-100 rounded-xl p-1">
          <button
            onClick={() => switchMode("expense")}
            className={`px-3 sm:px-4 py-1.5 text-sm font-black rounded-lg transition-all ${mode === "expense" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500"}`}
          >
            支出
          </button>
          <button
            onClick={() => switchMode("income")}
            className={`px-3 sm:px-4 py-1.5 text-sm font-black rounded-lg transition-all ${mode === "income" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500"}`}
          >
            収入
          </button>
          <button
            onClick={() => switchMode("transfer")}
            className={`px-3 sm:px-4 py-1.5 text-sm font-black rounded-lg transition-all ${mode === "transfer" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500"}`}
          >
            振替
          </button>
        </div>
      </div>

      {/* 取引日 */}
      <div className="px-4 sm:px-5 py-3 bg-ag-lime-50/60 border-b border-ag-gray-100 flex items-center gap-2 sm:gap-3 justify-end">
        <label className="flex items-center gap-2 text-sm font-black text-ag-gray-700">
          <span>取引日</span>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="px-2 py-1.5 bg-white border border-ag-gray-200 rounded-lg text-sm font-bold text-ag-gray-800 focus:outline-none focus:border-ag-lime-300"
          />
          <button
            type="button"
            onClick={() => setTransactionDate(todayStr())}
            className="text-xs font-black text-ag-lime-600 hover:text-ag-lime-700 underline whitespace-nowrap"
          >
            今日
          </button>
        </label>
      </div>

      {/* 入力エリア */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* 保存完了メッセージ */}
        {savedMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-ag-lime-50 border border-ag-lime-200/60 animate-fade-in-up">
            <svg className="w-5 h-5 text-ag-lime-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-black text-ag-gray-700">{savedMsg}</p>
          </div>
        )}

        {/* 1. 振替モード：お金の移動の向きを選ぶ */}
        {mode === "transfer" ? (
          <div>
            <p className="text-sm font-black text-ag-gray-700 mb-2">1. お金の移動の向きを選ぶ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { dir: "cashToClub" as const, label: "現金 → 口座（クラブ）", hint: "集めた現金を口座に入金" },
                { dir: "clubToCash" as const, label: "口座（クラブ） → 現金", hint: "口座からおろして手元に" },
              ]).map((opt) => {
                const active = transferDir === opt.dir;
                return (
                  <button
                    key={opt.dir}
                    type="button"
                    onClick={() => { setTransferDir(opt.dir); setSavedMsg(null); }}
                    className={`min-h-[60px] px-4 py-3 rounded-xl text-left leading-tight transition-all cursor-pointer border-2 ${
                      active
                        ? "bg-ag-lime-500 border-ag-lime-500 text-white shadow-sm"
                        : "bg-white border-ag-gray-200 text-ag-gray-700 hover:border-ag-lime-300 hover:bg-ag-lime-50/40"
                    }`}
                  >
                    <span className="block text-sm font-black">{opt.label}</span>
                    <span className={`block text-[11px] font-bold mt-0.5 ${active ? "text-white/80" : "text-ag-gray-400"}`}>{opt.hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-bold text-ag-gray-400 mt-2">
              ※ 振替は収入・支出には数えません。現金残高とクラブ残高の間でお金が移動するだけです。
            </p>
          </div>
        ) : (
          /* 1. 項目を選ぶ */
          <div>
            <p className="text-sm font-black text-ag-gray-700 mb-2">
              1. {mode === "expense" ? "支出" : "収入"}の項目を選ぶ
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    title={cat.label}
                    onClick={() => { setSelectedCategory(cat.id); setSavedMsg(null); }}
                    className={`min-h-[52px] px-3 py-2.5 rounded-xl text-sm font-black text-center leading-tight transition-all cursor-pointer border-2 ${
                      active
                        ? "bg-ag-lime-500 border-ag-lime-500 text-white shadow-sm"
                        : "bg-white border-ag-gray-200 text-ag-gray-700 hover:border-ag-lime-300 hover:bg-ag-lime-50/40"
                    }`}
                  >
                    {cat.short ?? shortLabel(cat.label)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. 金額を入れる */}
        <div>
          <p className="text-sm font-black text-ag-gray-700 mb-2">2. 金額を入れる</p>
          <div className="flex items-center gap-1 bg-ag-gray-50 border-2 border-ag-gray-200 rounded-xl px-4 focus-within:border-ag-lime-400 transition-colors">
            <span className="text-2xl font-black text-ag-gray-400">¥</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setSavedMsg(null); }}
              className="w-full min-w-0 text-2xl font-black text-ag-gray-900 bg-transparent py-3 text-right outline-none"
              placeholder="0"
              min={0}
              inputMode="numeric"
            />
          </div>
        </div>

        {/* 3. メモ・支払い方法（任意） */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            list={showVenueList ? "venue-options" : undefined}
            className="w-full min-w-0 text-base font-bold text-ag-gray-800 bg-ag-gray-50 border-2 border-ag-gray-200 rounded-xl px-3 py-2.5 placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-400"
            placeholder={showVenueList ? "利用場所を選ぶ（手入力も可）例：白山地区センター" : "メモ（任意）例：渡辺コーチ 3時間"}
          />
          {showVenueList && (
            <datalist id="venue-options">
              {VENUE_OPTIONS.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          )}
          {mode !== "transfer" && (
            <label className="flex items-center gap-2 text-sm font-black text-ag-gray-600 sm:justify-end">
              <span className="whitespace-nowrap">支払い</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="text-sm font-bold bg-ag-gray-50 border-2 border-ag-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-ag-lime-400 cursor-pointer"
              >
                {(["現金", "PayPay", "銀行振込", "その他"] as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="w-full py-3.5 sm:py-4 rounded-2xl bg-ag-lime-500 hover:bg-ag-lime-600 disabled:bg-ag-gray-200 disabled:cursor-not-allowed text-white text-base sm:text-lg font-black transition-colors cursor-pointer shadow-sm"
        >
          {isSaving
            ? "保存中..."
            : canSave
              ? `${mode === "transfer" ? "この振替を記録する" : "この内容で記帳する"}（¥${amountNum.toLocaleString()}）`
              : mode === "transfer"
                ? "金額を入れてください"
                : "項目を選んで金額を入れてください"}
        </button>
      </div>
    </div>
  );
}
