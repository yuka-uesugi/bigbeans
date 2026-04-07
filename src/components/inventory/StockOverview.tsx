"use client";

import { useState } from "react";

interface StockItem {
  id: string;
  name: string;
  category: string;
  currentStk: number;
  unit: string;
  minStk: number;
  status: "good" | "low" | "critical";
  lastUpdate: string;
}

const initialStocks: StockItem[] = [
  { id: "1", name: "ニューオフィシャル ＃３", category: "シャトル", currentStk: 15, unit: "ダース", minStk: 5, status: "good", lastUpdate: "3/25" },
  { id: "2", name: "ニューオフィシャル ＃４", category: "シャトル", currentStk: 8, unit: "ダース", minStk: 5, status: "good", lastUpdate: "3/24" },
  { id: "3", name: "エアロ ＃３", category: "シャトル", currentStk: 10, unit: "ダース", minStk: 5, status: "good", lastUpdate: "3/15" },
  { id: "4", name: "エアロ ＃４", category: "シャトル", currentStk: 4, unit: "ダース", minStk: 5, status: "critical", lastUpdate: "3/18" },
];

export default function StockOverview() {
  const [stocks, setStocks] = useState(initialStocks);
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const updateStatus = (stk: number, min: number): "good" | "low" | "critical" => {
    if (stk <= min * 0.5) return "critical";
    if (stk <= min) return "low";
    return "good";
  };

  const handleAdjust = (id: string, delta: number) => {
    setStocks(stocks.map(item => {
      if (item.id === id) {
        const newStk = Math.max(0, item.currentStk + delta);
        return { 
          ...item, 
          currentStk: newStk, 
          status: updateStatus(newStk, item.minStk),
          lastUpdate: new Date().toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric'}) 
        };
      }
      return item;
    }));
  };

  const handleDelete = (id: string) => {
    if (confirm("この備品を削除しますか？")) {
      setStocks(stocks.filter(item => item.id !== id));
    }
  };

  const handleAdd = () => {
    if (!newItemName.trim()) return;
    const newItem: StockItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      category: "備品",
      currentStk: 0,
      unit: "個/ダース",
      minStk: 5,
      status: "critical",
      lastUpdate: new Date().toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric'})
    };
    setStocks([...stocks, newItem]);
    setNewItemName("");
    setIsAdding(false);
  };

  const statusColors = {
    good: "bg-ag-lime-100 text-ag-lime-700",
    low: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700 hover:bg-red-200 animate-pulse",
  };
  const statusLabels = { good: "十分", low: "補充推奨", critical: "要発注" };

  return (
    <div className="bg-white rounded-[2rem] border-2 border-ag-gray-100 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="px-6 py-5 border-b-2 border-ag-gray-100 flex items-center justify-between bg-ag-gray-50/50">
        <div className="flex items-center gap-3">
          <h3 className="text-lg sm:text-xl font-black text-ag-gray-800 tracking-tight">在庫マスター</h3>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-base font-black px-5 py-2.5 bg-ag-lime-500 text-white rounded-2xl hover:bg-ag-lime-600 transition-all shadow-md active:scale-95"
        >
          {isAdding ? "閉じる" : "+ 備品を追加"}
        </button>
      </div>

      {isAdding && (
        <div className="p-6 bg-ag-gray-50 border-b-2 border-ag-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 animate-slide-down">
          <input 
            type="text" 
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="新しく追加する備品名を入力..."
            className="flex-1 px-5 py-4 text-lg font-bold border-2 border-ag-gray-200 rounded-2xl outline-none focus:border-ag-lime-400 bg-white shadow-sm"
            autoFocus
          />
          <button 
            onClick={handleAdd}
            className="px-8 py-4 text-lg font-black bg-ag-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 whitespace-nowrap"
          >
            リストに追加する
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-ag-gray-100/50 text-[13px] font-black text-ag-gray-600 uppercase tracking-widest border-b-2 border-ag-gray-100">
              <th className="px-6 py-4 font-black">品名・種類</th>
              <th className="px-6 py-4 font-black text-center">残量状態</th>
              <th className="px-6 py-4 font-black">現在の在庫</th>
              <th className="px-6 py-4 font-black text-right">在庫の調整</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-ag-gray-50">
            {stocks.map((item) => (
              <tr key={item.id} className="hover:bg-ag-lime-50/20 transition-colors group">
                <td className="px-6 py-6 sm:py-8">
                  <div className="flex items-center gap-3">
                    <p className="text-lg sm:text-xl font-black text-ag-gray-900 leading-tight">{item.name}</p>
                  </div>
                  <p className="text-xs sm:text-sm text-ag-gray-500 font-bold mt-1.5 flex items-center gap-2">
                    <span className="bg-ag-gray-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-tighter">{item.category}</span>
                    <span>最終更新: {item.lastUpdate}</span>
                  </p>
                </td>
                <td className="px-6 py-6 sm:py-8 text-center">
                  <span className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-black border-2 shadow-sm ${statusColors[item.status]} ${item.status === 'critical' ? 'border-red-200 ring-2 ring-red-100 animate-pulse' : 'border-transparent'}`}>
                    {statusLabels[item.status]}
                  </span>
                </td>
                <td className="px-6 py-6 sm:py-8">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-3xl sm:text-4xl font-black ${item.status === "critical" ? "text-red-600" : "text-ag-gray-900"}`}>
                      {item.currentStk}
                    </span>
                    <span className="text-base sm:text-lg font-black text-ag-gray-400">{item.unit}</span>
                  </div>
                  <div className="w-28 sm:w-32 h-3 bg-ag-gray-100 rounded-full mt-3 overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${item.status === 'critical' ? 'bg-red-500' : item.status === 'low' ? 'bg-amber-400' : 'bg-ag-lime-500'}`} 
                      style={{ width: `${Math.min(100, (item.currentStk / (item.minStk * 2)) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-6 py-6 sm:py-8 text-right">
                  <div className="flex items-center justify-end gap-2 sm:gap-3">
                    <button 
                      onClick={() => handleAdjust(item.id, -1)}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border-2 border-ag-gray-200 text-ag-gray-400 hover:text-ag-gray-900 hover:border-ag-gray-400 flex items-center justify-center transition-all shadow-sm active:scale-90 text-2xl font-black"
                      title="1つ減らす"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => handleAdjust(item.id, 1)}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 flex items-center justify-center transition-all shadow-lg active:scale-90 text-2xl font-black"
                      title="1つ増やす"
                    >
                      +
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="w-12 h-12 sm:w-14 sm:h-14 ml-2 sm:ml-4 rounded-2xl text-red-300 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-90"
                      title="削除"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stocks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-lg font-bold text-ag-gray-300">
                  <div className="flex flex-col items-center gap-3">
                    現在、備品は登録されていません
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
