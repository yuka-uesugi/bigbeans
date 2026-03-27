"use client";

import { useState } from "react";

interface UsedRecord {
  id: string;
  date: string;
  type: "売却" | "寄付・処分";
  user: string;
  quantity: number;
  totalPrice: number;
}

const mockRecords: UsedRecord[] = [
  { id: "1", date: "3/26 18:30", type: "売却", user: "上杉 由香", quantity: 50, totalPrice: 500 },
  { id: "2", date: "3/20 20:00", type: "寄付・処分", user: "五十嵐 美咲", quantity: 30, totalPrice: 0 },
];

export default function UsedShuttleManager() {
  const [records, setRecords] = useState<UsedRecord[]>(mockRecords);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // 新規登録用フォーム状態
  const [type, setType] = useState<"売却" | "寄付・処分">("売却");
  const [user, setUser] = useState("");
  const [quantity, setQuantity] = useState<number>(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.trim()) return;

    const totalPrice = type === "売却" ? quantity * 10 : 0;
    
    const newRecord: UsedRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'}),
      type,
      user: user.trim(),
      quantity,
      totalPrice
    };

    setRecords([newRecord, ...records]);
    setIsFormOpen(false);
    setUser("");
    setQuantity(10);
  };

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-ag-gray-100 flex items-center justify-between bg-gradient-to-r from-stone-50 to-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">♻️</span>
          <div>
            <h3 className="text-sm font-bold text-ag-gray-800">中古シャトル譲渡・処分ログ</h3>
            <p className="text-[10px] text-ag-gray-400">1個10円で買取、または寄付で処分</p>
          </div>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isFormOpen ? 'bg-ag-gray-100 text-ag-gray-600' : 'bg-ag-lime-50 text-ag-lime-600 hover:bg-ag-lime-100'}`}
        >
          {isFormOpen ? "キャンセル" : "+ 記録を追加"}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="p-4 bg-stone-50 border-b border-ag-gray-100 space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-ag-gray-500 mb-1 block">処理種別</label>
              <div className="flex bg-white rounded-lg border border-ag-gray-200 p-1 w-full">
                <button
                  type="button"
                  onClick={() => setType("売却")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${type === "売却" ? "bg-ag-lime-50 text-ag-lime-700 shadow-sm" : "text-ag-gray-400 hover:text-ag-gray-600"}`}
                >
                  💰 売却 (1個10円)
                </button>
                <button
                  type="button"
                  onClick={() => setType("寄付・処分")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${type === "寄付・処分" ? "bg-stone-200 text-stone-700 shadow-sm" : "text-ag-gray-400 hover:text-ag-gray-600"}`}
                >
                  🗑️ 寄付・無償処分
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-ag-gray-500">対象者 (引取人)</label>
              <input 
                type="text" 
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="部員名" 
                className="w-full px-3 py-2 text-xs border border-ag-gray-200 rounded-lg focus:ring-2 focus:ring-ag-lime-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-ag-gray-500">個数</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-ag-gray-200 rounded-lg focus:ring-2 focus:ring-ag-lime-500 outline-none" 
                />
                <span className="text-xs font-bold text-ag-gray-400">個</span>
              </div>
            </div>
            
            <div className="col-span-2 bg-white rounded-lg p-3 border border-ag-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-ag-gray-500">今回のお会計金額</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-ag-gray-800">
                  ¥{type === "売却" ? (quantity * 10).toLocaleString() : 0}
                </span>
                {type === "売却" && <span className="text-[9px] text-ag-lime-600 font-bold bg-ag-lime-50 px-1 py-0.5 rounded ml-2">※会計へ自動リンク予定</span>}
              </div>
            </div>
          </div>
          
          <button type="submit" className="w-full py-2.5 bg-ag-gray-800 text-white text-xs font-bold rounded-xl hover:bg-ag-gray-900 transition-colors shadow-sm">
            記録を保存する
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto max-h-[400px]">
        {records.length === 0 ? (
          <div className="p-8 text-center text-xs text-ag-gray-400">
            まだ記録はありません
          </div>
        ) : (
          <ul className="divide-y divide-ag-gray-50">
            {records.map((record) => (
              <li key={record.id} className="p-4 hover:bg-ag-gray-50/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${record.type === '売却' ? 'bg-ag-lime-100 text-ag-lime-800 border border-ag-lime-200' : 'bg-stone-200 text-stone-700 border border-stone-300'}`}>
                      {record.type === '売却' ? '💰' : '🗑️'} {record.type}
                    </span>
                    <span className="text-[10px] font-semibold text-ag-gray-400">{record.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-ag-gray-900 border-b-2 border-ag-lime-200">
                      ¥{record.totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-ag-gray-800 border-l-2 border-ag-gray-300 pl-2">
                    {record.user}
                  </span>
                  <span className="text-xs font-bold text-ag-gray-500 bg-white border border-ag-gray-100 px-2 py-0.5 rounded shadow-sm">
                    中古シャトル {record.quantity}個
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
