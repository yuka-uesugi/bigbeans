"use client";

import { useState } from "react";

interface VisitorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (visitor: any) => void;
  defaultIntroducer?: string;
  isVisitorMode: boolean;
}

export default function VisitorRegistrationModal({
  isOpen,
  onClose,
  onSubmit,
  defaultIntroducer = "",
  isVisitorMode,
}: VisitorRegistrationModalProps) {
  const [form, setForm] = useState({
    name: "",
    rank: "B",
    ageGroup: "30代",
    teamName: "",
    invitedBy: defaultIntroducer,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.invitedBy.trim()) return;
    onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">

      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-ag-gray-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-6 text-white">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <span className="text-3xl">🏸</span>
            {isVisitorMode ? "練習に参加する" : "ビジターを代理登録"}
          </h2>
          <p className="text-white/80 text-sm font-bold mt-1">
            {isVisitorMode 
              ? "必要事項を入力して、練習への参加を表明しましょう！" 
              : "知り合いのビジターさんを練習リストに追加します。"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* 名前 */}
          <div>
            <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例: 山田 花子"
              className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3.5 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ランク */}
            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">ランク</label>
              <select
                value={form.rank}
                onChange={(e) => setForm({ ...form, rank: e.target.value })}
                className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3.5 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
              >
                <option value="A">Aランク (上級)</option>
                <option value="B">Bランク (中級)</option>
                <option value="C">Cランク (初級)</option>
              </select>
            </div>
            {/* 年代 */}
            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">年代</label>
              <select
                value={form.ageGroup}
                onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3.5 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
              >
                {["10代", "20代", "30代", "40代", "50代", "60代以上"].map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 所属チーム */}
          <div>
            <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">所属チーム</label>
            <input
              type="text"
              value={form.teamName}
              onChange={(e) => setForm({ ...form, teamName: e.target.value })}
              placeholder="例: 〇〇クラブ / なし"
              className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3.5 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
            />
          </div>

          {/* 紹介者 */}
          <div>
            <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">
              紹介者 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.invitedBy}
              onChange={(e) => setForm({ ...form, invitedBy: e.target.value })}
              placeholder="例: 石川さん"
              className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3.5 text-base font-bold outline-none focus:border-sky-400 focus:bg-white transition-all shadow-sm"
            />
            {isVisitorMode && (
              <p className="text-[10px] text-ag-gray-400 mt-2 ml-1 font-bold italic">
                ※BBメンバーからの紹介がある方のみご参加いただけます。
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-ag-gray-500 font-black text-lg border-2 border-ag-gray-100 rounded-2xl hover:bg-ag-gray-50 transition-all"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || !form.invitedBy.trim()}
              className="flex-[2] py-4 bg-sky-500 text-white font-black text-lg rounded-2xl hover:bg-sky-600 shadow-xl shadow-sky-500/20 disabled:opacity-40 transition-all"
            >
              登録を確定する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
