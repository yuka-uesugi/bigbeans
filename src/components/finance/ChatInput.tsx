"use client";

import { useState } from "react";

interface ParsedExpense {
  item: string;
  amount: number;
  category: string;
}

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedExpense[] | null>(null);
  const [mode, setMode] = useState<"expense" | "income">("expense");

  const handleSubmit = () => {
    if (!input.trim()) return;

    setIsProcessing(true);

    // AIパース処理のモック（実際にはAPIコール）
    setTimeout(() => {
      // 入力をパースするモックロジック
      const parsed: ParsedExpense[] = [];
      const patterns = input.match(/(\S+?)(\d[\d,]+)円/g);
      if (patterns) {
        patterns.forEach((match) => {
          const m = match.match(/(\S+?)(\d[\d,]+)円/);
          if (m) {
            const item = m[1].replace(/代$/, "");
            const amount = parseInt(m[2].replace(/,/g, ""), 10);
            let category = "その他支出";
            if (item.includes("コート") || item.includes("体育館")) category = "コート代";
            else if (item.includes("シャトル")) category = "シャトル代";
            else if (item.includes("コーチ") || item.includes("指導")) category = "コーチ料";
            else if (item.includes("駐車") || item.includes("交通")) category = "交通費";
            else if (item.includes("月謝") || item.includes("会費")) category = "月会費";
            else if (item.includes("ビジター")) category = "ビジター料";
            else if (item.includes("総会") || item.includes("菓子")) category = "総会";
            parsed.push({ item: item + "代", amount, category });
          }
        });
      }

      if (parsed.length === 0) {
        // デフォルトパース結果
        parsed.push({ item: input, amount: 0, category: "不明" });
      }

      setParsedResult(parsed);
      setIsProcessing(false);
    }, 1200);
  };

  const handleConfirm = () => {
    setParsedResult(null);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const categoryIcons: Record<string, string> = {
    "コート代": "🏢",
    "シャトル代": "🏸",
    "コーチ料": "👨‍🏫",
    "交通費": "🚗",
    "総会": "🍵",
    "月会費": "💳",
    "入会費": "🔰",
    "ビジター料": "👤",
    "古シャトル売却": "♻️",
    "その他支出": "📦",
    "その他収入": "📦",
    不明: "❓",
  };

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="text-sm font-bold text-ag-gray-800">AI経費入力</h3>
          <span className="text-[10px] text-ag-gray-400 bg-ag-gray-50 px-2 py-0.5 rounded-full">自然言語対応</span>
        </div>

        {/* 収入/支出の切り替え */}
        <div className="flex bg-ag-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode("expense")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              mode === "expense" ? "bg-white text-ag-gray-800 shadow-sm" : "text-ag-gray-400"
            }`}
          >
            支出
          </button>
          <button
            onClick={() => setMode("income")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              mode === "income" ? "bg-white text-ag-gray-800 shadow-sm" : "text-ag-gray-400"
            }`}
          >
            収入
          </button>
        </div>
      </div>

      {/* 入力例 */}
      <div className="px-5 py-3 bg-ag-lime-50/50 border-b border-ag-gray-100">
        <p className="text-[11px] text-ag-gray-500">
          💡 例: 「今日のコート代3000円、コーチ代5000円、駐車場代800円」
        </p>
      </div>

      {/* 入力エリア */}
      <div className="p-5">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "expense"
                ? "経費を入力してください... 例: コート代3000円、シャトル代5000円"
                : "収入を入力してください... 例: 田中さん月謝3000円"
            }
            className="w-full min-h-[80px] p-4 pr-14 rounded-xl bg-ag-gray-50 border border-ag-gray-200/60 text-sm text-ag-gray-800 placeholder:text-ag-gray-400 resize-none focus:outline-none focus:border-ag-lime-300 focus:ring-2 focus:ring-ag-lime-100 transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-xl bg-ag-lime-500 hover:bg-ag-lime-600 disabled:bg-ag-gray-200 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm"
          >
            {isProcessing ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

        {/* パース結果 */}
        {parsedResult && (
          <div className="mt-4 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🤖</span>
              <p className="text-xs font-semibold text-ag-gray-600">AIが以下の内容を検出しました：</p>
            </div>

            <div className="space-y-2 mb-4">
              {parsedResult.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-ag-lime-50 border border-ag-lime-200/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{categoryIcons[item.category] || "📦"}</span>
                    <div>
                      <p className="text-sm font-semibold text-ag-gray-800">{item.item}</p>
                      <p className="text-[10px] text-ag-gray-400">{item.category}</p>
                    </div>
                  </div>
                  <span className="text-base font-bold text-ag-gray-800">
                    ¥{item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* 合計 */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-ag-gray-50 mb-4">
              <span className="text-sm font-semibold text-ag-gray-600">合計</span>
              <span className="text-lg font-bold text-ag-gray-900">
                ¥{parsedResult.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
              </span>
            </div>

            {/* 確定ボタン */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-ag-lime-500 hover:bg-ag-lime-600 text-white text-sm font-bold transition-colors cursor-pointer shadow-sm"
              >
                ✅ 記帳する
              </button>
              <button
                onClick={() => setParsedResult(null)}
                className="px-4 py-2.5 rounded-xl bg-ag-gray-100 hover:bg-ag-gray-200 text-ag-gray-600 text-sm font-medium transition-colors cursor-pointer"
              >
                修正
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
