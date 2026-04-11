"use client";

import { useState, useEffect } from "react";
import type { HamaspoCard } from "@/data/facilityCards";

interface HamaspoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: HamaspoCard | null;
  onSave: (id: string, data: Partial<HamaspoCard>) => Promise<void>;
}

export default function HamaspoEditModal({
  isOpen,
  onClose,
  card,
  onSave,
}: HamaspoEditModalProps) {
  const [form, setForm] = useState<Partial<HamaspoCard>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (card && isOpen) {
      setForm({ ...card });
    }
  }, [card, isOpen]);

  if (!isOpen || !card) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card?.id) return;
    
    setIsSaving(true);
    try {
      await onSave(card.id, form);
      onClose();
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-ag-gray-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-6 text-white shrink-0">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <span className="text-3xl">🏟️</span>
            ハマスポ情報編集
          </h2>
          <p className="text-white/80 text-sm font-bold mt-1">
            {form.teamName} の登録内容を更新します
          </p>
        </div>

        <div className="overflow-y-auto p-8 custom-scrollbar">
          <form id="hamaspo-edit-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">団体名</label>
                <input
                  type="text"
                  required
                  value={form.teamName || ""}
                  onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">更新日</label>
                <input
                  type="text"
                  value={form.renewalDate || ""}
                  onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">枠数</label>
                <input
                  type="number"
                  value={form.slots || 0}
                  onChange={(e) => setForm({ ...form, slots: Number(e.target.value) })}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div className="col-span-4">
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">ID</label>
                <input
                  type="text"
                  value={form.id || ""}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold font-mono outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">パスワード</label>
              <input
                type="text"
                value={form.password || ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl px-5 py-3 text-base font-bold font-mono outline-none focus:border-red-400 focus:bg-red-50 transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">代表者</label>
                <input
                  type="text"
                  value={form.representative || ""}
                  onChange={(e) => setForm({ ...form, representative: e.target.value })}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">構成員</label>
                <input
                  type="text"
                  value={form.members || ""}
                  onChange={(e) => setForm({ ...form, members: e.target.value })}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">備考</label>
              <textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
              />
            </div>

          </form>
        </div>

        <div className="p-6 border-t-2 border-ag-gray-100 bg-ag-gray-50 shrink-0 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 text-ag-gray-600 font-black text-lg border-2 border-ag-gray-200 bg-white rounded-2xl hover:bg-ag-gray-50 transition-all shadow-sm"
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="hamaspo-edit-form"
            disabled={isSaving}
            className="flex-[2] py-4 bg-sky-500 text-white font-black text-lg rounded-2xl hover:bg-sky-600 shadow-xl shadow-sky-500/20 disabled:opacity-40 transition-all"
          >
            {isSaving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
