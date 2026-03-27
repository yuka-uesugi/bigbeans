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
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-ag-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏸</span>
          <h3 className="text-sm font-bold text-ag-gray-800">在庫マスター</h3>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-semibold px-3 py-1.5 bg-ag-lime-50 text-ag-lime-600 rounded-lg hover:bg-ag-lime-100 transition-colors"
        >
          {isAdding ? "キャンセル" : "+ 備品を追加"}
        </button>
      </div>

      {isAdding && (
        <div className="p-4 bg-ag-gray-50 border-b border-ag-gray-100 flex items-center gap-3">
          <input 
            type="text" 
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="備品名を入力..."
            className="flex-1 px-3 py-2 text-sm border border-ag-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-ag-lime-500"
            autoFocus
          />
          <button 
            onClick={handleAdd}
            className="px-4 py-2 text-sm font-bold bg-ag-lime-500 text-white rounded-xl hover:bg-ag-lime-600 transition-colors shadow-sm"
          >
            追加
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-ag-gray-50/50 text-[11px] font-semibold text-ag-gray-500 uppercase">
              <th className="px-5 py-3 font-medium">品名</th>
              <th className="px-5 py-3 font-medium text-center">ステータス</th>
              <th className="px-5 py-3 font-medium">在庫数</th>
              <th className="px-5 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ag-gray-50">
            {stocks.map((item) => (
              <tr key={item.id} className="hover:bg-ag-gray-50/50 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ag-gray-800">{item.name}</p>
                  </div>
                  <p className="text-[10px] text-ag-gray-400 mt-0.5">{item.category} • 最終更新: {item.lastUpdate}</p>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold ${statusColors[item.status]}`}>
                    {statusLabels[item.status]}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${item.status === "critical" ? "text-red-500" : "text-ag-gray-800"}`}>
                      {item.currentStk}
                    </span>
                    <span className="text-xs text-ag-gray-400">{item.unit}</span>
                  </div>
                  <div className="w-24 h-1.5 bg-ag-gray-100 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${item.status === 'critical' ? 'bg-red-400' : item.status === 'low' ? 'bg-amber-400' : 'bg-ag-lime-400'}`} 
                      style={{ width: `${Math.min(100, (item.currentStk / (item.minStk * 2)) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => handleAdjust(item.id, -1)}
                      className="w-8 h-8 rounded-full bg-ag-gray-50 text-ag-gray-600 hover:bg-ag-gray-200 flex items-center justify-center transition-colors font-bold"
                      title="消費 (-1)"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => handleAdjust(item.id, 1)}
                      className="w-8 h-8 rounded-full bg-ag-lime-50 text-ag-lime-600 hover:bg-ag-lime-100 flex items-center justify-center transition-colors font-bold"
                      title="補充 (+1)"
                    >
                      +
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="w-8 h-8 ml-2 rounded-full text-red-300 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stocks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-ag-gray-400">
                  現在、備品は登録されていません。右上のボタンから追加してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
