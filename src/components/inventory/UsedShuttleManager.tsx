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
    <div className="bg-white rounded-[2rem] border-2 border-ag-gray-100 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="px-6 py-5 border-b-2 border-ag-gray-100 flex items-center justify-between bg-gradient-to-r from-stone-50 to-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl">♻️</span>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-ag-gray-800 tracking-tight">中古シャトル譲渡・処分ログ</h3>
            <p className="text-sm font-bold text-ag-gray-500">1個10円で買取、または寄付で処分</p>
          </div>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`text-base font-black px-5 py-2.5 rounded-2xl transition-all shadow-md active:scale-95 ${isFormOpen ? 'bg-ag-gray-100 text-ag-gray-600 border-2 border-ag-gray-200' : 'bg-ag-lime-500 text-white hover:bg-ag-lime-600'}`}
        >
          {isFormOpen ? "閉じる" : "+ 記録を追加"}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="p-6 bg-stone-50 border-b-2 border-ag-gray-100 space-y-6 animate-fade-in-up">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-black text-ag-gray-500 mb-2 block ml-1 uppercase tracking-widest">処理種別を選択</label>
              <div className="flex bg-white rounded-2xl border-2 border-ag-gray-200 p-1.5 w-full shadow-sm">
                <button
                  type="button"
                  onClick={() => setType("売却")}
                  className={`flex-1 py-3 text-base font-black rounded-xl transition-all ${type === "売却" ? "bg-ag-lime-500 text-white shadow-lg lg:scale-105" : "text-ag-gray-400 hover:text-ag-gray-600"}`}
                >
                  💰 売却 (1個10円)
                </button>
                <button
                  type="button"
                  onClick={() => setType("寄付・処分")}
                  className={`flex-1 py-3 text-base font-black rounded-xl transition-all ${type === "寄付・処分" ? "bg-stone-500 text-white shadow-lg lg:scale-105" : "text-ag-gray-400 hover:text-ag-gray-600"}`}
                >
                  🗑️ 寄付・無償処分
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-black text-ag-gray-500 ml-1">対象者 (引取人)</label>
              <input 
                type="text" 
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="部員名を入力" 
                className="w-full px-5 py-4 text-lg font-bold border-2 border-ag-gray-200 rounded-2xl focus:border-ag-lime-400 outline-none bg-white shadow-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-ag-gray-500 ml-1">個数</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-5 py-4 text-lg font-black border-2 border-ag-gray-200 rounded-2xl focus:border-ag-lime-400 outline-none bg-white shadow-sm" 
                />
                <span className="text-lg font-black text-ag-gray-600">個</span>
              </div>
            </div>
            
            <div className="col-span-2 bg-white rounded-2xl p-5 border-2 border-ag-lime-100 flex items-center justify-between shadow-sm">
              <span className="text-base font-black text-ag-gray-500">今回のお会計金額</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-ag-gray-900">
                  ¥{type === "売却" ? (quantity * 10).toLocaleString() : 0}
                </span>
                {type === "売却" && <span className="text-xs text-ag-lime-700 font-black bg-ag-lime-100 px-2 py-1 rounded-lg border border-ag-lime-200">※会計へ自動リンク</span>}
              </div>
            </div>
          </div>
          
          <button type="submit" className="w-full py-5 bg-ag-gray-900 text-white text-xl font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95">
            記録を保存する
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto max-h-[500px] bg-stone-50/30">
        {records.length === 0 ? (
          <div className="p-12 text-center text-lg font-bold text-ag-gray-300">
            まだ譲渡記録はありません
          </div>
        ) : (
          <ul className="divide-y-2 divide-ag-gray-100">
            {records.map((record) => (
              <li key={record.id} className="p-6 hover:bg-white transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl border-2 shadow-sm flex items-center gap-1.5 ${record.type === '売却' ? 'bg-ag-lime-100 text-ag-lime-800 border-ag-lime-200' : 'bg-stone-200 text-stone-700 border-stone-300'}`}>
                      {record.type === '売却' ? '💰' : '🗑️'} {record.type}
                    </span>
                    <span className="text-sm font-bold text-ag-gray-400 bg-ag-gray-50 px-2 rounded-lg">{record.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-ag-gray-900 border-b-4 border-ag-lime-300 leading-none">
                      ¥{record.totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl sm:text-2xl font-black text-ag-gray-800 border-l-4 border-ag-gray-300 pl-4 leading-tight">
                    {record.user}
                  </span>
                  <span className="text-base sm:text-lg font-black text-ag-gray-600 bg-white border-2 border-ag-gray-100 px-4 py-1.5 rounded-2xl shadow-sm">
                    中古シャトル <span className="text-ag-lime-600 underline underline-offset-4">{record.quantity}個</span>
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
