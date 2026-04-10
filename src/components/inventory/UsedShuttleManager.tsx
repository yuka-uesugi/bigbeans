"use client";

import { useState, useEffect } from "react";
import {
  subscribeToDisposals,
  createDisposal,
  deleteDisposal,
  type DisposalRecord,
  type DisposalEntry,
} from "@/lib/disposals";

export default function UsedShuttleManager() {
  const [records, setRecords] = useState<DisposalRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォーム状態
  const [type, setType] = useState<"寄付" | "買取">("買取");
  const [entries, setEntries] = useState<DisposalEntry[]>([{ name: "", quantity: 10 }]);
  const [note, setNote] = useState("");

  // Firestoreリアルタイム購読
  useEffect(() => {
    const unsubscribe = subscribeToDisposals((data) => {
      setRecords(data);
    });
    return () => unsubscribe();
  }, []);

  const addEntry = () => {
    setEntries([...entries, { name: "", quantity: 10 }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof DisposalEntry, value: string | number) => {
    setEntries(entries.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const totalQuantity = entries.reduce((sum, e) => sum + (e.quantity || 0), 0);
  const totalPrice = type === "買取" ? totalQuantity * 10 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validEntries = entries.filter((e) => e.name.trim() && e.quantity > 0);
    if (validEntries.length === 0) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await createDisposal({
        date: today,
        type,
        entries: validEntries,
        totalQuantity: validEntries.reduce((sum, e) => sum + e.quantity, 0),
        totalPrice: type === "買取" ? validEntries.reduce((sum, e) => sum + e.quantity, 0) * 10 : 0,
        note: note.trim(),
      });

      // リセット
      setIsFormOpen(false);
      setEntries([{ name: "", quantity: 10 }]);
      setNote("");
    } catch (err) {
      console.error("処分記録の追加エラー:", err);
      alert("記録の追加に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    try {
      await deleteDisposal(id);
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました。");
    }
  };

  // 日付のフォーマット
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border-2 border-ag-gray-100 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="px-6 py-5 border-b-2 border-ag-gray-100 flex items-center justify-between bg-gradient-to-r from-stone-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-stone-300 rounded-full mr-1" />
          <div>
            <h3 className="text-lg sm:text-xl font-black text-ag-gray-800 tracking-tight">中古シャトル譲渡・処分ログ</h3>
            <p className="text-sm font-bold text-ag-gray-500">買取（1個10円）または寄付・処分</p>
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`text-base font-black px-5 py-2.5 rounded-2xl transition-all shadow-md active:scale-95 ${isFormOpen ? 'bg-ag-gray-100 text-ag-gray-600 border-2 border-ag-gray-200' : 'bg-ag-lime-500 text-white hover:bg-ag-lime-600'}`}
        >
          {isFormOpen ? "閉じる" : "+ 記録を追加"}
        </button>
      </div>

      {/* フォーム */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="p-6 bg-stone-50 border-b-2 border-ag-gray-100 space-y-6 animate-fade-in-up">
          {/* 種別選択 */}
          <div>
            <label className="text-sm font-black text-ag-gray-500 mb-2 block ml-1 uppercase tracking-widest">処理種別を選択</label>
            <div className="flex bg-white rounded-2xl border-2 border-ag-gray-200 p-1.5 w-full shadow-sm">
              <button type="button" onClick={() => setType("買取")}
                className={`flex-1 py-3 text-base font-black rounded-xl transition-all ${type === "買取" ? "bg-ag-lime-500 text-white shadow-lg" : "text-ag-gray-400 hover:text-ag-gray-600"}`}
              >買取 (10円/個)</button>
              <button type="button" onClick={() => setType("寄付")}
                className={`flex-1 py-3 text-base font-black rounded-xl transition-all ${type === "寄付" ? "bg-stone-500 text-white shadow-lg" : "text-ag-gray-400 hover:text-ag-gray-600"}`}
              >寄付・無償処分</button>
            </div>
          </div>

          {/* 引取人リスト（複数人対応） */}
          <div className="space-y-3">
            <label className="text-sm font-black text-ag-gray-500 ml-1 uppercase tracking-widest">引取人と個数</label>
            {entries.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  value={entry.name}
                  onChange={(e) => updateEntry(idx, "name", e.target.value)}
                  placeholder="名前を入力"
                  className="flex-1 px-4 py-3 text-lg font-bold border-2 border-ag-gray-200 rounded-2xl focus:border-ag-lime-400 outline-none bg-white shadow-sm"
                />
                <input
                  type="number"
                  min="1"
                  required
                  value={entry.quantity}
                  onChange={(e) => updateEntry(idx, "quantity", Number(e.target.value))}
                  className="w-24 px-4 py-3 text-lg font-black border-2 border-ag-gray-200 rounded-2xl focus:border-ag-lime-400 outline-none bg-white shadow-sm text-center"
                />
                <span className="text-base font-black text-ag-gray-500">個</span>
                {entries.length > 1 && (
                  <button type="button" onClick={() => removeEntry(idx)}
                    className="w-10 h-10 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xl font-black transition-all"
                  >✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addEntry}
              className="w-full py-2.5 border-2 border-dashed border-ag-gray-200 rounded-2xl text-base font-black text-ag-gray-400 hover:border-ag-gray-400 hover:text-ag-gray-600 transition-all"
            >+ 引取人を追加</button>
          </div>

          {/* 備考 */}
          <div>
            <label className="text-sm font-black text-ag-gray-500 mb-1 block ml-1">備考</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="例: 練習後にまとめて処分"
              className="w-full px-4 py-3 text-base font-bold border-2 border-ag-gray-200 rounded-2xl focus:border-ag-lime-400 outline-none bg-white shadow-sm"
            />
          </div>

          {/* 合計 */}
          <div className="bg-white rounded-2xl p-5 border-2 border-ag-lime-100 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-base font-black text-ag-gray-500">合計</span>
              <span className="text-lg font-black text-ag-gray-700 ml-2">{totalQuantity}個</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-ag-gray-900">
                ¥{totalPrice.toLocaleString()}
              </span>
              {type === "買取" && <span className="text-xs text-ag-lime-700 font-black bg-ag-lime-100 px-2 py-1 rounded-lg border border-ag-lime-200">※会計へ自動リンク</span>}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-5 bg-ag-gray-900 text-white text-xl font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "保存中..." : "記録を保存する"}
          </button>
        </form>
      )}

      {/* 記録リスト */}
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
                    <span className={`text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl border-2 shadow-sm ${record.type === '買取' ? 'bg-ag-lime-100 text-ag-lime-800 border-ag-lime-200' : 'bg-stone-200 text-stone-700 border-stone-300'}`}>
                      {record.type}
                    </span>
                    <span className="text-sm font-bold text-ag-gray-400 bg-ag-gray-50 px-2 rounded-lg">{formatDate(record.date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-black text-ag-gray-900 border-b-4 border-ag-lime-300 leading-none">
                      ¥{record.totalPrice.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                    >削除</button>
                  </div>
                </div>
                {/* 引取人リスト */}
                <div className="space-y-1.5 mt-3">
                  {record.entries?.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-lg sm:text-xl font-black text-ag-gray-800 border-l-4 border-ag-gray-300 pl-4">
                        {entry.name}
                      </span>
                      <span className="text-base sm:text-lg font-black text-ag-gray-600 bg-white border-2 border-ag-gray-100 px-4 py-1 rounded-2xl shadow-sm">
                        中古シャトル <span className="text-ag-lime-600 underline underline-offset-4">{entry.quantity}個</span>
                      </span>
                    </div>
                  ))}
                </div>
                {record.note && (
                  <p className="text-sm text-ag-gray-500 font-bold mt-2 italic">{record.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
