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
      <div className="flex items-center justify-between px-5 py-5 border-b-2 border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <h3 className="text-xl font-black text-ag-gray-800 tracking-wide">質問・意見箱</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-black bg-ag-lime-500 text-white px-4 py-2 rounded-xl hover:bg-ag-lime-600 transition-colors shadow-sm"
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
                <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-2">カテゴリ</label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm({ ...form, category: c.value })}
                      className={`py-3 px-3 rounded-xl border-2 text-sm font-black transition-all ${
                        form.category === c.value ? c.color + " scale-[1.02] shadow-sm border-current" : "bg-white border-ag-gray-200 text-ag-gray-400 hover:bg-ag-gray-50"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* タイトル */}
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-2">タイトル</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例: 駐車場はありますか？"
                  className="w-full bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-4 focus:ring-ag-lime-100 outline-none transition-all placeholder-ag-gray-300"
                />
              </div>
              {/* 詳細 */}
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-2">詳細（任意）</label>
                <textarea
                  rows={3}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="詳しい内容があればこちらに書いてください"
                  className="w-full bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-3 text-base font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-4 focus:ring-ag-lime-100 outline-none resize-none leading-relaxed transition-all placeholder-ag-gray-300"
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
      <div className="divide-y-2 divide-ag-gray-100">
        {SAMPLE_POSTS.map((post) => {
          const cat = CATEGORIES.find((c) => c.value === post.category)!;
          return (
            <div key={post.id} className="px-5 py-5 hover:bg-ag-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-black px-2 py-1 rounded-lg border ${cat.color} shadow-sm`}>
                      {cat.label}
                    </span>
                    {post.resolved && (
                      <span className="text-xs font-black px-2 py-1 rounded-lg bg-ag-lime-50 border border-ag-lime-200 text-ag-lime-700 shadow-sm">✅ 解決済み</span>
                    )}
                  </div>
                  <p className="text-lg font-black text-ag-gray-900 mb-2 leading-snug">{post.title}</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-ag-gray-500">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                    <span>•</span>
                    <span className="text-ag-lime-600 bg-ag-lime-50 px-2 py-0.5 rounded-lg border border-ag-lime-100">💬 {post.replies}件</span>
                  </div>
                </div>
                <button className="text-ag-gray-300 hover:text-ag-lime-500 transition-colors text-2xl font-black px-2 py-4 bg-white hover:bg-ag-gray-50 rounded-xl border border-transparent hover:border-ag-gray-200">&rsaquo;</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
