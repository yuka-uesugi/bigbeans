"use client";

import { useState } from "react";

// 本日の集計対象（モックデータ）
const INITIAL_COLLECTIONS = [
  { id: "v1", name: "石井B", type: "ビジター", fee: 700, collected: false },
  { id: "v2", name: "杉村B", type: "ビジター", fee: 700, collected: false },
  { id: "v3", name: "満沢B", type: "ビジター", fee: 700, collected: false },
  { id: "v4", name: "鈴木庸子", type: "ビジター", fee: 700, collected: false },
  { id: "l1", name: "林", type: "ライト会員", fee: 500, collected: false },
  { id: "l2", name: "井上", type: "ライト会員", fee: 500, collected: true }, // 最初から回収済みの例
];

// 本日の固定支出（モックデータ）
const TODAY_EXPENSES = 2400; // 例: 体育館代など

export default function BalanceCard() {
  const [collections, setCollections] = useState(INITIAL_COLLECTIONS);

  // 回収チェックのトグル
  const toggleCollection = (id: string) => {
    setCollections(collections.map(c => 
      c.id === id ? { ...c, collected: !c.collected } : c
    ));
  };

  // 集計計算
  const collectedTotal = collections
    .filter(c => c.collected)
    .reduce((sum, c) => sum + c.fee, 0);

  const pendingTotal = collections
    .filter(c => !c.collected)
    .reduce((sum, c) => sum + c.fee, 0);

  const expectedTotal = collections.reduce((sum, c) => sum + c.fee, 0);

  // 本日の残高：回収済み収入 - 固定支出
  const todayBalance = collectedTotal - TODAY_EXPENSES;

  return (
    <div className="bg-white border-2 border-ag-gray-200 shadow-xl rounded-[32px] overflow-hidden">
      {/* ヘッダー部分 */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/30 backdrop-blur-sm">
             💰
          </div>
          <div>
            <h2 className="text-xl font-black tracking-widest drop-shadow-md">本日の会計</h2>
            <p className="text-sm font-bold text-blue-100">集計・回収チェック</p>
          </div>
        </div>

        {/* 収支サマリー */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white text-ag-gray-900 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-blue-100">
            <p className="text-sm font-extrabold text-blue-600 mb-1">現在の回収額 (収入)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">¥</span>
              <span className="text-4xl font-black tracking-tighter text-ag-gray-900">{collectedTotal.toLocaleString()}</span>
            </div>
            <p className={`text-xs font-bold mt-1 ${pendingTotal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {pendingTotal > 0 ? `残り ¥${pendingTotal.toLocaleString()} 未回収` : "✅ 全額回収完了！"}
            </p>
          </div>
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col justify-center">
            <p className="text-sm font-bold text-white/80 mb-1">本日の支出 (予定)</p>
            <div className="flex items-baseline gap-1 text-white">
              <span className="text-lg font-bold">¥</span>
              <span className="text-3xl font-black tracking-tighter">{TODAY_EXPENSES.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 回収チェックリスト */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 border-b-2 border-ag-gray-100 pb-2">
          <h3 className="text-lg font-black text-ag-gray-900 flex items-center gap-2">
            📋 回収リスト
          </h3>
          <span className="text-sm font-extrabold bg-ag-gray-100 text-ag-gray-600 px-3 py-1 rounded-full">
            {collections.filter(c => c.collected).length} / {collections.length} 名完了
          </span>
        </div>

        <div className="space-y-3 mt-4">
          {collections.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleCollection(item.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                item.collected 
                  ? "bg-emerald-50 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                  : "bg-white border-ag-gray-200 hover:border-blue-400 hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* チェックボックス風のアイコン */}
                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-colors ${
                  item.collected ? "border-emerald-500 bg-emerald-500 text-white" : "border-ag-gray-300 bg-ag-gray-50"
                }`}>
                  {item.collected && <svg className="w-5 h-5 font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div className="text-left">
                  <div className="text-lg font-black text-ag-gray-900">{item.name}</div>
                  <div className={`text-xs font-bold ${item.collected ? "text-emerald-700" : "text-ag-gray-500"}`}>
                    {item.type}
                  </div>
                </div>
              </div>
              
              <div className={`text-xl font-black ${item.collected ? "text-emerald-600" : "text-ag-gray-900"}`}>
                ¥{item.fee}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 bg-ag-gray-50 border-t-2 border-ag-gray-200/60 mt-2 text-center">
        <span className="text-sm font-black text-ag-gray-700">
          💰 本日の最終残高 (収入 - 支出) = <span className={`text-xl ${todayBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>¥{todayBalance.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}
