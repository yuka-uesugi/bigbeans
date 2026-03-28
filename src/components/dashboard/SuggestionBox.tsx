"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "question", label: "❓ 質問", color: "bg-sky-50 border-sky-200 text-sky-700" },
  { value: "suggestion", label: "💡 提案・意見", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { value: "request", label: "🙏 お願い", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { value: "other", label: "📝 その他", color: "bg-ag-gray-50 border-ag-gray-200 text-ag-gray-600" },
];

const SAMPLE_POSTS = [
  { id: 1, category: "question", title: "駐車場はありますか？", author: "匿名", date: "3/27", replies: 2, resolved: false },
  { id: 2, category: "suggestion", title: "ユニフォームのカラーを変えてほしい", author: "田中", date: "3/25", replies: 5, resolved: false },
  { id: 3, category: "request", title: "初心者向け基礎練習の時間を設けてほしい", author: "匿名", date: "3/20", replies: 3, resolved: true },
];

export default function SuggestionBox() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "question", title: "", body: "", isAnonymous: true });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSubmitted(true);
    setTimeout(() => { setShowForm(false); setSubmitted(false); setForm({ category: "question", title: "", body: "", isAnonymous: true }); }, 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-ag-gray-100 shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <h3 className="text-sm font-extrabold text-ag-gray-800">質問・意見箱</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] font-bold bg-ag-lime-500 text-white px-3 py-1.5 rounded-xl hover:bg-ag-lime-600 transition-colors"
        >
          {showForm ? "× 閉じる" : "+ 投稿する"}
        </button>
      </div>

      {/* 投稿フォーム */}
      {showForm && (
        <div className="px-5 py-5 border-b border-ag-gray-50 bg-ag-gray-50/50 space-y-4">
          {submitted ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-sm font-bold text-ag-gray-700">投稿しました！</p>
            </div>
          ) : (
            <>
              {/* カテゴリ選択 */}
              <div>
                <label className="text-[9px] font-black text-ag-gray-400 uppercase tracking-widest block mb-2">カテゴリ</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm({ ...form, category: c.value })}
                      className={`py-2 px-3 rounded-xl border text-[10px] font-bold transition-all ${
                        form.category === c.value ? c.color + " scale-[1.02] shadow-sm" : "bg-white border-ag-gray-100 text-ag-gray-400"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* タイトル */}
              <div>
                <label className="text-[9px] font-black text-ag-gray-400 uppercase tracking-widest block mb-2">タイトル</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例: 駐車場はありますか？"
                  className="w-full bg-white border border-ag-gray-200 rounded-xl px-3 py-2.5 text-xs text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none"
                />
              </div>
              {/* 詳細 */}
              <div>
                <label className="text-[9px] font-black text-ag-gray-400 uppercase tracking-widest block mb-2">詳細（任意）</label>
                <textarea
                  rows={3}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="詳しい内容があればこちらに書いてください"
                  className="w-full bg-white border border-ag-gray-200 rounded-xl px-3 py-2.5 text-xs text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none resize-none leading-relaxed"
                />
              </div>
              {/* 匿名設定 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setForm({ ...form, isAnonymous: !form.isAnonymous })}
                    className={`w-10 h-5 rounded-full transition-all cursor-pointer ${form.isAnonymous ? "bg-ag-lime-500" : "bg-ag-gray-200"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-all shadow ${form.isAnonymous ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-[10px] font-bold text-ag-gray-600">匿名で投稿</span>
                </label>
                <button
                  onClick={handleSubmit}
                  disabled={!form.title.trim()}
                  className="px-4 py-2 bg-ag-lime-500 text-white rounded-xl text-[10px] font-black hover:bg-ag-lime-600 transition-colors disabled:opacity-40"
                >
                  投稿する
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 投稿一覧 */}
      <div className="divide-y divide-ag-gray-50">
        {SAMPLE_POSTS.map((post) => {
          const cat = CATEGORIES.find((c) => c.value === post.category)!;
          return (
            <div key={post.id} className="px-5 py-4 hover:bg-ag-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border ${cat.color}`}>
                      {cat.label}
                    </span>
                    {post.resolved && (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-ag-lime-50 border border-ag-lime-100 text-ag-lime-700">✅ 解決済み</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-ag-gray-800 mb-1">{post.title}</p>
                  <div className="flex items-center gap-2 text-[9px] text-ag-gray-400">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>💬 {post.replies}件の返信</span>
                  </div>
                </div>
                <button className="text-ag-gray-300 hover:text-ag-lime-500 transition-colors text-sm">›</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
