"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToSuggestions,
  createSuggestion,
  deleteSuggestion,
  addReply,
  type SuggestionData
} from "@/lib/suggestions";
import { createReplyNotification } from "@/lib/notifications";

const CATEGORIES = [
  { value: "question",   label: "❓ 質問",     color: "bg-sky-50 border-sky-200 text-sky-700" },
  { value: "suggestion", label: "💡 提案・意見", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { value: "request",    label: "🙏 お願い",    color: "bg-purple-50 border-purple-200 text-purple-700" },
  { value: "other",      label: "📝 その他",    color: "bg-ag-gray-50 border-ag-gray-200 text-ag-gray-600" },
];

const DRAFT_KEY = "suggestion_draft";

type FormState = { category: string; title: string; body: string; isAnonymous: boolean };

const EMPTY_FORM: FormState = { category: "question", title: "", body: "", isAnonymous: true };

function loadDraft(): FormState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(form: FormState) {
  try {
    const isEmpty = !form.title.trim() && !form.body.trim();
    if (isEmpty) {
      localStorage.removeItem(DRAFT_KEY);
    } else {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  } catch {}
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export default function SuggestionBox() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 検索・フィルタ
  const [searchQuery, setSearchQuery] = useState("");
  const [myPostsOnly, setMyPostsOnly] = useState(false);

  // 返信
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const formRef = useRef(form);
  formRef.current = form;

  // 下書き復元チェック
  useEffect(() => {
    const draft = loadDraft();
    if (draft && (draft.title.trim() || draft.body.trim())) {
      setHasDraft(true);
    }
  }, []);

  // フォームを開いたとき下書きを復元
  useEffect(() => {
    if (!showForm) return;
    const draft = loadDraft();
    if (draft) setForm(draft);
  }, [showForm]);

  // 入力変更時に下書き保存
  useEffect(() => {
    if (!showForm) return;
    saveDraft(form);
    const draft = loadDraft();
    setHasDraft(!!(draft && (draft.title.trim() || draft.body.trim())));
  }, [form, showForm]);

  useEffect(() => {
    return subscribeToSuggestions((data) => setSuggestions(data));
  }, []);

  const updateForm = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setIsSubmitting(true);
    try {
      const today = new Date();
      await createSuggestion({
        category: form.category as any,
        title: form.title,
        body: form.body,
        author: form.isAnonymous ? "匿名" : (user?.displayName || "匿名"),
        authorUid: user?.uid,
        date: `${today.getMonth() + 1}/${today.getDate()}`,
        isAnonymous: form.isAnonymous,
        replies: [],
        resolved: false,
      });
      clearDraft();
      setHasDraft(false);
      setSubmitted(true);
      setTimeout(() => {
        setShowForm(false);
        setSubmitted(false);
        setForm(EMPTY_FORM);
      }, 2000);
    } catch {
      alert("投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (suggestion: SuggestionData) => {
    if (!replyBody.trim()) return;
    setIsReplying(true);
    try {
      const now = new Date();
      const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
      const replyId = Math.random().toString(36).slice(2, 9);
      const replyAuthor = user?.displayName || "匿名";
      await addReply(suggestion.id, replyId, replyAuthor, replyBody, dateStr);

      // 自分以外の投稿者に通知
      if (suggestion.authorUid && suggestion.authorUid !== user?.uid) {
        await createReplyNotification(suggestion.authorUid, {
          suggestionId: suggestion.id,
          suggestionTitle: suggestion.title,
          replyAuthor,
          replyBody,
        }).catch(() => {});
      }
      setReplyBody("");
    } catch {
      alert("返信に失敗しました");
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("この投稿を削除してもよろしいですか？")) {
      await deleteSuggestion(id).catch(() => alert("削除に失敗しました"));
    }
  };

  // フィルタ適用
  const filtered = suggestions.filter((s) => {
    if (myPostsOnly && user) {
      if (s.authorUid !== user.uid) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-ag-gray-100 shadow-md overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-5 border-b-2 border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <h3 className="text-xl font-black text-ag-gray-800 tracking-wide">質問・意見箱</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && !showForm && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              下書きあり
            </span>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm font-black bg-ag-lime-500 text-white px-4 py-2 rounded-xl hover:bg-ag-lime-600 transition-colors shadow-sm"
          >
            {showForm ? "× 閉じる" : "+ 投稿する"}
          </button>
        </div>
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
              {/* 下書き復元バナー */}
              {hasDraft && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-amber-700">下書きを復元しました</span>
                  <button
                    onClick={() => { setForm(EMPTY_FORM); clearDraft(); setHasDraft(false); }}
                    className="text-[10px] font-bold text-amber-600 hover:underline"
                  >
                    クリア
                  </button>
                </div>
              )}

              {/* カテゴリ */}
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-2">カテゴリ</label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateForm({ category: c.value })}
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
                  onChange={(e) => updateForm({ title: e.target.value })}
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
                  onChange={(e) => updateForm({ body: e.target.value })}
                  placeholder="詳しい内容があればこちらに書いてください"
                  className="w-full bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-3 text-base font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-4 focus:ring-ag-lime-100 outline-none resize-none leading-relaxed transition-all placeholder-ag-gray-300"
                />
              </div>

              {/* 匿名 + 送信 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => updateForm({ isAnonymous: !form.isAnonymous })}
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

      {/* 検索・フィルタバー */}
      <div className="px-5 py-3 border-b border-ag-gray-100 flex gap-3 items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="キーワードで検索..."
            className="w-full pl-9 pr-3 py-2 bg-ag-gray-50 border border-ag-gray-200 rounded-xl text-xs font-bold text-ag-gray-700 focus:ring-2 focus:ring-ag-lime-300 outline-none"
          />
        </div>
        {user && (
          <button
            onClick={() => setMyPostsOnly(!myPostsOnly)}
            className={`text-[10px] font-black px-3 py-2 rounded-xl border-2 whitespace-nowrap transition-all ${
              myPostsOnly
                ? "bg-ag-lime-100 border-ag-lime-400 text-ag-lime-700"
                : "bg-white border-ag-gray-200 text-ag-gray-400 hover:border-ag-gray-300"
            }`}
          >
            自分の投稿
          </button>
        )}
      </div>

      {/* 投稿一覧 */}
      <div className="divide-y-2 divide-ag-gray-100">
        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-ag-gray-400 font-bold text-sm">
            {searchQuery || myPostsOnly ? "条件に合う投稿がありません" : "ご意見・ご質問はまだありません"}
          </div>
        ) : (
          filtered.map((post) => {
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
                        {post.authorUid && user && post.authorUid === user.uid && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-600">自分</span>
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
                  <div className="px-5 pb-5 mt-2 pt-4 bg-ag-gray-50 border-t border-ag-gray-100">
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
                        repliesArray.map((reply) => (
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

                    {/* 返信入力 */}
                    <div className="flex gap-2 items-start mt-4">
                      <textarea
                        rows={1}
                        placeholder="返信を入力..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        className="flex-1 bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none resize-none"
                        style={{ minHeight: "44px" }}
                      />
                      <button
                        onClick={() => handleReplySubmit(post)}
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
