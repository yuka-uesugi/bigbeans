"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToSuggestions,
  createSuggestion,
  deleteSuggestion,
  addReply,
  type SuggestionData
} from "@/lib/suggestions";

const CATEGORIES = [
  { value: "question", label: "❓ 質問", color: "bg-sky-50 border-sky-200 text-sky-700" },
  { value: "suggestion", label: "💡 提案・意見", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { value: "request", label: "🙏 お願い", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { value: "other", label: "📝 その他", color: "bg-ag-gray-50 border-ag-gray-200 text-ag-gray-600" },
];

export default function SuggestionBox() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "question" as const, title: "", body: "", isAnonymous: true });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 返信機能関連の状態
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSuggestions((data) => {
      setSuggestions(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setIsSubmitting(true);
    
    try {
      const today = new Date();
      const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
      
      await createSuggestion({
        category: form.category as any,
        title: form.title,
        body: form.body,
        author: form.isAnonymous ? "匿名" : (user?.displayName || "匿名"),
        date: dateStr,
        isAnonymous: form.isAnonymous,
        replies: [], // 新規作成時は空配列
        resolved: false,
      });

      setSubmitted(true);
      setTimeout(() => {
        setShowForm(false);
        setSubmitted(false);
        setForm({ category: "question", title: "", body: "", isAnonymous: true });
      }, 2000);
    } catch (error) {
      console.error("Failed to crate suggestion", error);
      alert("投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (suggestionId: string) => {
    if (!replyBody.trim()) return;
    setIsReplying(true);
    try {
      const today = new Date();
      const dateStr = `${today.getMonth() + 1}/${today.getDate()} ${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')}`;
      const replyId = Math.random().toString(36).slice(2, 9);
      await addReply(suggestionId, replyId, user?.displayName || "匿名", replyBody, dateStr);
      setReplyBody(""); // フォームをクリア
    } catch (error) {
      console.error("Failed to add reply", error);
      alert("返信に失敗しました");
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("この投稿を削除してもよろしいですか？")) {
      try {
        await deleteSuggestion(id);
      } catch (error) {
        console.error("Failed to delete suggestion", error);
        alert("削除に失敗しました");
      }
    }
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
                      onClick={() => setForm({ ...form, category: c.value as any })}
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
                  disabled={isSubmitting || !form.title.trim()}
                  className="px-4 py-2 bg-ag-lime-500 text-white rounded-xl text-[10px] font-black hover:bg-ag-lime-600 transition-colors disabled:opacity-40"
                >
                  {isSubmitting ? "送信中..." : "投稿する"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 投稿一覧 */}
      <div className="divide-y-2 divide-ag-gray-100">
        {suggestions.length === 0 ? (
          <div className="px-5 py-8 text-center text-ag-gray-400 font-bold text-sm">
            ご意見・ご質問はまだありません
          </div>
        ) : (
          suggestions.map((post) => {
            const cat = CATEGORIES.find((c) => c.value === post.category) || CATEGORIES[3];
            const isExpanded = expandedItem === post.id;
            const repliesArray = Array.isArray(post.replies) ? post.replies : [];
            const replyCount = repliesArray.length;

            return (
              <div key={post.id} className="group">
                <div 
                  className="px-5 py-5 hover:bg-ag-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedItem(isExpanded ? null : post.id)}
                >
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
                      <div className="flex items-center gap-2 text-sm font-bold text-ag-gray-500 flex-wrap">
                        <span>{post.author}</span>
                        <span>•</span>
                        <span>{post.date}</span>
                        <span>•</span>
                        <span className="text-ag-lime-600 bg-ag-lime-50 px-2 py-0.5 rounded-lg border border-ag-lime-100">💬 {replyCount}件</span>
                        
                        <button
                          onClick={(e) => handleDelete(post.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-ag-gray-300 hover:text-red-500 transition-all text-xs font-bold px-2 py-1 ml-auto rounded bg-white hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    <button className="text-ag-gray-300 hover:text-ag-lime-500 transition-colors text-2xl font-black px-2 py-4 bg-white hover:bg-ag-gray-50 rounded-xl border border-transparent hover:border-ag-gray-200">
                      <span className={`inline-block transition-transform ${isExpanded ? "rotate-90 text-ag-lime-500" : ""}`}>
                        &rsaquo;
                      </span>
                    </button>
                  </div>
                </div>

                {/* 展開領域 */}
                {isExpanded && (
                  <div className="px-5 pb-5 mt-2 pt-4 bg-ag-gray-50 border-t border-ag-gray-100 inner-shadow-sm">
                    {/* 詳細 */}
                    <div className="mb-5">
                      <h4 className="text-xs font-black text-ag-gray-500 uppercase tracking-widest mb-2">詳細</h4>
                      <p className="text-sm font-bold text-ag-gray-700 leading-relaxed bg-white p-4 rounded-xl border border-ag-gray-200 whitespace-pre-wrap">
                        {post.body || "（詳細はありません）"}
                      </p>
                    </div>

                    {/* 返信一覧 */}
                    <div className="space-y-3 mb-5 pl-4 border-l-2 border-ag-lime-200">
                      <h4 className="text-xs font-black text-ag-gray-500 uppercase tracking-widest">返信 ({replyCount})</h4>
                      {repliesArray.length === 0 ? (
                         <p className="text-xs font-bold text-ag-gray-400">まだ返信はありません</p>
                      ) : (
                        repliesArray.map(reply => (
                          <div key={reply.id} className="bg-white rounded-lg p-3 border border-ag-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-bold text-xs text-ag-gray-800">{reply.author}</span>
                              <span className="text-[10px] font-bold text-ag-gray-400">{reply.createdAt}</span>
                            </div>
                            <p className="text-sm font-bold text-ag-gray-700 whitespace-pre-wrap">{reply.body}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* 返信入力フォーム */}
                    <div className="flex gap-2 items-start mt-4">
                      <textarea
                        rows={1}
                        placeholder="返信を入力..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        className="flex-1 bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none resize-none"
                        style={{ minHeight: '44px' }}
                      />
                      <button
                        onClick={() => handleReplySubmit(post.id)}
                        disabled={isReplying || !replyBody.trim()}
                        className="bg-ag-lime-500 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-ag-lime-600 transition-colors disabled:opacity-40 whitespace-nowrap h-[44px]"
                      >
                        {isReplying ? "..." : "送信"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
