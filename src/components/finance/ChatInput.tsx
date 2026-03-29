"use client";

import { useState } from "react";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "./MonthlyChart";

interface ParsedEntry {
  description: string;
  amount: number;
  categoryId: string;
}

// キーワード → カテゴリID の自動判定
function autoDetectCategory(text: string, type: "income" | "expense"): string {
  const t = text;
  if (type === "income") {
    if (t.includes("入会")) return "入会費";
    if (t.includes("月謝") || t.includes("会費")) return "月会費";
    if (t.includes("休会")) return "休会費";
    if (t.includes("ビジター") && (t.includes("練習会") || t.includes("第2"))) return "練習会ビジター料";
    if (t.includes("ビジター")) return "ビジター料";
    if (t.includes("体験") || t.includes("初参加")) return "体験会・初参加者";
    if (t.includes("休会中") || t.includes("休会練習")) return "休会中練習参加費";
    if (t.includes("第2") || t.includes("2練習")) return "第2練習参加費";
    if (t.includes("シャトル") && (t.includes("売") || t.includes("古"))) return "古シャトル売却";
    return "その他収入";
  } else {
    if (t.includes("山口") && t.includes("コーチ")) return "コーチ料(山口)";
    if (t.includes("コーチ") && t.includes("車")) return "コーチお車代";
    if (t.includes("コーチ") || t.includes("指導")) return "コーチ料";
    if (t.includes("コート") || t.includes("体育館") || t.includes("SC") && t.includes("代")) return "コート代";
    if (t.includes("電車") || t.includes("バス") || t.includes("交通") || t.includes("駐車")) return "交通費";
    if (t.includes("冷") || t.includes("暖")) return "冷暖費";
    if (t.includes("シャトル") || t.includes("エアロ") || t.includes("ニューオフィシャル")) return "シャトル代";
    if (t.includes("中元") || t.includes("歳暮") || t.includes("商品券")) return "お中元・お歳暮";
    if (t.includes("団体登録") || t.includes("連盟")) return "団体登録料";
    if (t.includes("SC登録") || t.includes("登録更新")) return "SC登録更新料";
    if (t.includes("振込") || t.includes("振り込み") || t.includes("手数料")) return "振り込み手数料";
    if (t.includes("郵送") || t.includes("郵便")) return "郵送料";
    if (t.includes("総会")) return "総会";
    if (t.includes("楽しみ会") || t.includes("お楽しみ")) return "お楽しみ会";
    if (t.includes("インク")) return "事務局インク代";
    if (t.includes("事務用品") || t.includes("封筒") || t.includes("コピー")) return "事務用品代";
    if (t.includes("市本部") || t.includes("差し入れ") || t.includes("菓子折")) return "市本部差し入れ代";
    if (t.includes("ユニフォーム") || t.includes("ゼッケン") || t.includes("応援") || t.includes("横断")) return "ユニフォーム・応援グッズ";
    if (t.includes("印刷") || t.includes("チラシ") || t.includes("募集")) return "部員募集印刷";
    if (t.includes("お祝い") || t.includes("送別") || t.includes("花") || t.includes("還暦") || t.includes("古希")) return "お祝い・送別品";
    return "その他支出";
  }
}

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsed, setParsed] = useState<ParsedEntry[] | null>(null);
  const [mode, setMode] = useState<"expense" | "income">("expense");

  const categories = mode === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      const results: ParsedEntry[] = [];
      // "〇〇代3000円" や "〇〇 3,000円" などを検出
      const patterns = input.match(/([^\s、,，。]+?)[\s　]*([\d,，]+)円/g);
      if (patterns) {
        patterns.forEach((match) => {
          const m = match.match(/([^\d]+?)[\s　]*([\d,，]+)円/);
          if (m) {
            const desc = m[1].trim();
            const amount = parseInt(m[2].replace(/[,，]/g, ""), 10);
            const categoryId = autoDetectCategory(desc, mode);
            results.push({ description: desc, amount, categoryId });
          }
        });
      }
      if (results.length === 0) {
        // 単純に全体を1件として扱う（数字を探す）
        const numMatch = input.match(/([\d,，]+)円/);
        const amount = numMatch ? parseInt(numMatch[1].replace(/[,，]/g, ""), 10) : 0;
        results.push({ description: input, amount, categoryId: mode === "income" ? "その他収入" : "その他支出" });
      }
      setParsed(results);
      setIsProcessing(false);
    }, 800);
  };

  const handleCategoryChange = (index: number, newCategoryId: string) => {
    if (!parsed) return;
    const updated = [...parsed];
    updated[index] = { ...updated[index], categoryId: newCategoryId };
    setParsed(updated);
  };

  const handleConfirm = () => {
    setParsed(null);
    setInput("");
  };

  const getCategoryLabel = (id: string) =>
    categories.find((c) => c.id === id)?.label || id;
  const getCategoryIcon = (id: string) =>
    categories.find((c) => c.id === id)?.icon || "📦";

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="text-base font-black text-ag-gray-800">かんたん経費入力</h3>
          <span className="text-xs font-bold text-ag-gray-400 bg-ag-gray-50 px-2 py-0.5 rounded-full">自動カテゴリ判定</span>
        </div>
        <div className="flex bg-ag-gray-100 rounded-xl p-1">
          <button
            onClick={() => { setMode("expense"); setParsed(null); }}
            className={`px-4 py-2 text-sm font-black rounded-lg transition-all ${mode === "expense" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500"}`}
          >
            支出
          </button>
          <button
            onClick={() => { setMode("income"); setParsed(null); }}
            className={`px-4 py-2 text-sm font-black rounded-lg transition-all ${mode === "income" ? "bg-white text-ag-gray-900 shadow-sm" : "text-ag-gray-500"}`}
          >
            収入
          </button>
        </div>
      </div>

      {/* ヒント */}
      <div className="px-5 py-3 bg-ag-lime-50/60 border-b border-ag-gray-100">
        <p className="text-sm font-bold text-ag-gray-600">
          💡 例：{mode === "expense"
            ? "「コーチ料6000円、コート代3000円、シャトル代5000円」"
            : "「田中さん月会費3000円、ビジター料1000円」"}
        </p>
      </div>

      {/* 入力エリア */}
      <div className="p-5">
        {!parsed ? (
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={mode === "expense"
                ? "支出を入力... 例: コート代3000円、シャトル代5000円"
                : "収入を入力... 例: 田中さん月会費3000円"}
              className="w-full min-h-[90px] p-4 pr-16 rounded-xl bg-ag-gray-50 border border-ag-gray-200/60 text-base font-bold text-ag-gray-800 placeholder:text-ag-gray-400 resize-none focus:outline-none focus:border-ag-lime-300 focus:ring-2 focus:ring-ag-lime-100 transition-all"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className="absolute bottom-3 right-3 w-12 h-10 rounded-xl bg-ag-lime-500 hover:bg-ag-lime-600 disabled:bg-ag-gray-200 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm font-black text-lg"
            >
              {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : "→"}
            </button>
          </div>
        ) : (
          <div className="animate-fade-in-up space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <p className="text-base font-black text-ag-gray-700">内容を確認してください。カテゴリは変更できます：</p>
            </div>

            {parsed.map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-ag-lime-50 border border-ag-lime-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(item.categoryId)}</span>
                    <span className="text-lg font-black text-ag-gray-900">{item.description}</span>
                  </div>
                  <span className="text-2xl font-black text-ag-gray-900">
                    ¥{item.amount.toLocaleString()}
                  </span>
                </div>
                {/* カテゴリドロップダウン */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-ag-gray-600 min-w-fit">📂 カテゴリ：</span>
                  <select
                    value={item.categoryId}
                    onChange={(e) => handleCategoryChange(i, e.target.value)}
                    className="flex-1 text-base font-black text-ag-gray-900 bg-white border-2 border-ag-lime-300 rounded-xl px-3 py-2 focus:outline-none focus:border-ag-lime-500 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            {/* 合計 */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-ag-gray-100 mt-2">
              <span className="text-base font-black text-ag-gray-700">合計</span>
              <span className="text-2xl font-black text-ag-gray-900">
                ¥{parsed.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
              </span>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleConfirm}
                className="flex-1 py-4 rounded-2xl bg-ag-lime-500 hover:bg-ag-lime-600 text-white text-lg font-black transition-colors cursor-pointer shadow-sm"
              >
                ✅ 記帳する
              </button>
              <button
                onClick={() => setParsed(null)}
                className="px-6 py-4 rounded-2xl bg-ag-gray-100 hover:bg-ag-gray-200 text-ag-gray-700 text-base font-black transition-colors cursor-pointer"
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
