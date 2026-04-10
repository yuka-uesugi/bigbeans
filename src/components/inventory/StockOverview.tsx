"use client";

import { useState, useEffect } from "react";
import {
  subscribeToInventory,
  adjustStock,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  type InventoryItem,
} from "@/lib/inventory";

interface EditingItem {
  id: string;
  name: string;
  shuttleType: string;
  grade: string;
  unitPrice: string;
  minStock: string;
  supplier: string;
}

export default function StockOverview() {
  const [stocks, setStocks] = useState<InventoryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新規追加フォーム
  const [newForm, setNewForm] = useState({
    shuttleType: "",
    grade: "③",
    unitPrice: "",
    supplier: "ラケットショップFUJI",
  });

  // Firestoreリアルタイム購読
  useEffect(() => {
    const unsubscribe = subscribeToInventory((items) => {
      setStocks(items);
    });
    return () => unsubscribe();
  }, []);

  const getStatus = (stk: number, min: number): "good" | "low" | "critical" => {
    if (stk <= 0) return "critical";
    if (stk <= min) return "low";
    return "good";
  };

  const handleAdjust = async (id: string, delta: number) => {
    try {
      await adjustStock(id, delta);
    } catch (err) {
      console.error("在庫調整エラー:", err);
      alert("在庫の調整に失敗しました。");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この備品を削除しますか？")) return;
    try {
      await deleteInventoryItem(id);
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました。");
    }
  };

  const handleAdd = async () => {
    if (!newForm.shuttleType.trim()) return;
    setIsSubmitting(true);
    try {
      const name = `${newForm.shuttleType} ＃${newForm.grade === "③" ? "３" : "４"}`;
      await createInventoryItem({
        name,
        category: "シャトル",
        shuttleType: newForm.shuttleType.trim(),
        grade: newForm.grade,
        currentStock: 0,
        unit: "ダース",
        minStock: parseInt(newForm.unitPrice) ? 2 : 3,
        unitPrice: parseInt(newForm.unitPrice) || 0,
        supplier: newForm.supplier.trim(),
      });
      setNewForm({ shuttleType: "", grade: "③", unitPrice: "", supplier: "ラケットショップFUJI" });
      setIsAdding(false);
    } catch (err) {
      console.error("追加エラー:", err);
      alert("備品の追加に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      const name = `${editingItem.shuttleType} ＃${editingItem.grade === "③" ? "３" : "４"}`;
      await updateInventoryItem(editingItem.id, {
        name,
        shuttleType: editingItem.shuttleType,
        grade: editingItem.grade,
        unitPrice: parseInt(editingItem.unitPrice) || 0,
        minStock: parseInt(editingItem.minStock) || 3,
        supplier: editingItem.supplier,
      });
      setEditingItem(null);
    } catch (err) {
      console.error("更新エラー:", err);
      alert("更新に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors = {
    good: "bg-ag-lime-100 text-ag-lime-700",
    low: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700 animate-pulse",
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

      {/* 新規追加フォーム */}
      {isAdding && (
        <div className="p-6 bg-ag-gray-50 border-b-2 border-ag-gray-100 space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-black text-ag-gray-500 mb-1 block ml-1">シャトル種類名</label>
              <input
                type="text"
                value={newForm.shuttleType}
                onChange={(e) => setNewForm({ ...newForm, shuttleType: e.target.value })}
                placeholder="例: エアロセンサ700"
                className="w-full px-4 py-3 text-lg font-bold border-2 border-ag-gray-200 rounded-2xl outline-none focus:border-ag-lime-400 bg-white shadow-sm"
              />
            </div>
            <div>
              <label className="text-sm font-black text-ag-gray-500 mb-1 block ml-1">番手</label>
              <div className="flex bg-white rounded-2xl border-2 border-ag-gray-200 p-1 shadow-sm">
                {["③", "④"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setNewForm({ ...newForm, grade: g })}
                    className={`flex-1 py-2.5 text-lg font-black rounded-xl transition-all ${newForm.grade === g ? "bg-ag-lime-500 text-white shadow" : "text-ag-gray-400"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-black text-ag-gray-500 mb-1 block ml-1">単価（円/ダース）</label>
              <input
                type="number"
                value={newForm.unitPrice}
                onChange={(e) => setNewForm({ ...newForm, unitPrice: e.target.value })}
                placeholder="例: 6930"
                className="w-full px-4 py-3 text-lg font-bold border-2 border-ag-gray-200 rounded-2xl outline-none focus:border-ag-lime-400 bg-white shadow-sm"
              />
            </div>
            <div>
              <label className="text-sm font-black text-ag-gray-500 mb-1 block ml-1">仕入先</label>
              <input
                type="text"
                value={newForm.supplier}
                onChange={(e) => setNewForm({ ...newForm, supplier: e.target.value })}
                className="w-full px-4 py-3 text-lg font-bold border-2 border-ag-gray-200 rounded-2xl outline-none focus:border-ag-lime-400 bg-white shadow-sm"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={isSubmitting || !newForm.shuttleType.trim()}
            className="w-full py-4 text-lg font-black bg-ag-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "追加中..." : "リストに追加する"}
          </button>
        </div>
      )}

      {/* 編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="text-xl font-black text-ag-gray-800">備品を編集</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-black text-ag-gray-500 mb-1 block">シャトル種類名</label>
                <input type="text" value={editingItem.shuttleType}
                  onChange={(e) => setEditingItem({ ...editingItem, shuttleType: e.target.value })}
                  className="w-full px-4 py-3 text-base font-bold border-2 border-ag-gray-200 rounded-2xl outline-none focus:border-ag-lime-400 bg-white" />
              </div>
              <div>
                <label className="text-sm font-black text-ag-gray-500 mb-1 block">番手</label>
                <div className="flex bg-ag-gray-50 rounded-2xl border-2 border-ag-gray-200 p-1">
                  {["③", "④"].map((g) => (
                    <button key={g} type="button"
                      onClick={() => setEditingItem({ ...editingItem, grade: g })}
                      className={`flex-1 py-2 text-base font-black rounded-xl transition-all ${editingItem.grade === g ? "bg-ag-lime-500 text-white" : "text-ag-gray-400"}`}
                    >{g}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-black text-ag-gray-500 mb-1 block">単価（円）</label>
                  <input type="number" value={editingItem.unitPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, unitPrice: e.target.value })}
                    className="w-full px-4 py-3 text-base font-bold border-2 border-ag-gray-200 rounded-2xl outline-none focus:border-ag-lime-400" />
                </div>
                <div>
                  <label className="text-sm font-black text-ag-gray-500 mb-1 block">最低在庫</label>
                  <input type="number" value={editingItem.minStock}
                    onChange={(e) => setEditingItem({ ...editingItem, minStock: e.target.value })}
                    className="w-full px-4 py-3 text-base font-bold border-2 border-ag-gray-200 rounded-2xl outline-none focus:border-ag-lime-400" />
                </div>
              </div>
              <div>
                <label className="text-sm font-black text-ag-gray-500 mb-1 block">仕入先</label>
                <input type="text" value={editingItem.supplier}
                  onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                  className="w-full px-4 py-3 text-base font-bold border-2 border-ag-gray-200 rounded-2xl outline-none focus:border-ag-lime-400" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingItem(null)}
                className="flex-1 py-3 text-base font-black border-2 border-ag-gray-200 text-ag-gray-500 rounded-2xl hover:bg-ag-gray-50">
                キャンセル
              </button>
              <button onClick={handleEditSave} disabled={isSubmitting}
                className="flex-[2] py-3 text-base font-black bg-ag-lime-500 text-white rounded-2xl hover:bg-ag-lime-600 shadow-lg disabled:opacity-50">
                {isSubmitting ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
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
            {stocks.map((item) => {
              const status = getStatus(item.currentStock, item.minStock);
              return (
                <tr key={item.id} className="hover:bg-ag-lime-50/20 transition-colors group">
                  <td className="px-6 py-6 sm:py-8">
                    <div className="flex items-center gap-3">
                      <p className="text-lg sm:text-xl font-black text-ag-gray-900 leading-tight">{item.name}</p>
                    </div>
                    <div className="text-xs sm:text-sm text-ag-gray-500 font-bold mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="bg-ag-gray-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-tighter">{item.category}</span>
                      <span>¥{item.unitPrice.toLocaleString()}/ダース</span>
                      <button
                        onClick={() => setEditingItem({
                          id: item.id,
                          name: item.name,
                          shuttleType: item.shuttleType,
                          grade: item.grade,
                          unitPrice: String(item.unitPrice),
                          minStock: String(item.minStock),
                          supplier: item.supplier,
                        })}
                        className="text-[10px] font-black text-ag-lime-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        編集
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-6 sm:py-8 text-center">
                    <span className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-black border-2 shadow-sm ${statusColors[status]} ${status === 'critical' ? 'border-red-200 ring-2 ring-red-100' : 'border-transparent'}`}>
                      {statusLabels[status]}
                    </span>
                  </td>
                  <td className="px-6 py-6 sm:py-8">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl sm:text-4xl font-black ${status === "critical" ? "text-red-600" : "text-ag-gray-900"}`}>
                        {item.currentStock}
                      </span>
                      <span className="text-base sm:text-lg font-black text-ag-gray-400">{item.unit}</span>
                    </div>
                    <div className="w-28 sm:w-32 h-3 bg-ag-gray-100 rounded-full mt-3 overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${status === 'critical' ? 'bg-red-500' : status === 'low' ? 'bg-amber-400' : 'bg-ag-lime-500'}`}
                        style={{ width: `${Math.min(100, (item.currentStock / (item.minStock * 2)) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-6 sm:py-8 text-right">
                    <div className="flex items-center justify-end gap-2 sm:gap-3">
                      <button
                        onClick={() => handleAdjust(item.id, -1)}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border-2 border-ag-gray-200 text-ag-gray-400 hover:text-ag-gray-900 hover:border-ag-gray-400 flex items-center justify-center transition-all shadow-sm active:scale-90 text-2xl font-black"
                      >-</button>
                      <button
                        onClick={() => handleAdjust(item.id, 1)}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 flex items-center justify-center transition-all shadow-lg active:scale-90 text-2xl font-black"
                      >+</button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-12 h-12 sm:w-14 sm:h-14 ml-2 sm:ml-4 rounded-2xl text-red-300 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-90"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {stocks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-lg font-bold text-ag-gray-300">
                  現在、備品は登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
