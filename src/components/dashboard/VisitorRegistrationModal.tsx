"use client";

import { useState } from "react";

// 登録フォームの入力内容
export interface VisitorFormData {
  name: string;
  rank: string;
  ageGroup: string;
  teamName: string;
  invitedBy: string;
}

interface VisitorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (visitor: VisitorFormData) => void;
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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-10 pb-6 px-4 sm:items-center sm:pt-0">

      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-ag-gray-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-sm bg-white rounded-[1.5rem] shadow-2xl animate-scale-in flex flex-col max-h-[88vh]">
        {/* ヘッダー（固定） */}
        <div className="shrink-0 bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-4 text-white rounded-t-[1.5rem]">
          <h2 className="text-lg font-black tracking-tight">
            {isVisitorMode ? "練習に参加する" : "ビジターを代理登録"}
          </h2>
          <p className="text-white/80 text-xs font-bold mt-0.5">
            {isVisitorMode
              ? "必要事項を入力して練習への参加を表明してください"
              : "知り合いのビジターを練習リストに追加します"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
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
              className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ランク */}
            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">ランク</label>
              <select
                value={form.rank}
                onChange={(e) => setForm({ ...form, rank: e.target.value })}
                className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white transition-all"
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
                className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white transition-all"
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
              className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white transition-all"
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
              className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white transition-all"
            />
            {isVisitorMode && (
              <p className="text-[10px] text-ag-gray-400 mt-2 ml-1 font-bold italic">
                ※BBメンバーからの紹介がある方のみご参加いただけます。
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-ag-gray-500 font-black text-sm border-2 border-ag-gray-100 rounded-xl hover:bg-ag-gray-50 transition-all"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || !form.invitedBy.trim()}
              className="flex-[2] py-3 bg-sky-500 text-white font-black text-sm rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 disabled:opacity-40 transition-all"
            >
              登録を確定する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
