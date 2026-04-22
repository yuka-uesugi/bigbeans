"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  type AnnouncementData,
  type AnnouncementType,
} from "@/lib/announcements";

type Mode = "board" | "minutes";
type FilterValue = AnnouncementType | "all";

const TYPE_STYLES: Record<string, { bg: string; accent: string; badge: string; icon: string; label: string }> = {
  normal:       { bg: "bg-white",      accent: "border-l-ag-gray-200",  badge: "bg-ag-gray-100 text-ag-gray-500",   icon: "📢", label: "通常" },
  info:         { bg: "bg-sky-50",     accent: "border-l-sky-400",      badge: "bg-sky-100 text-sky-600",           icon: "📌", label: "重要" },
  match_result: { bg: "bg-emerald-50", accent: "border-l-emerald-400",  badge: "bg-emerald-100 text-emerald-700",   icon: "🏆", label: "試合結果" },
  match_info:   { bg: "bg-purple-50",  accent: "border-l-purple-400",   badge: "bg-purple-100 text-purple-700",     icon: "📋", label: "試合要綱" },
  report:       { bg: "bg-amber-50",   accent: "border-l-amber-400",    badge: "bg-amber-100 text-amber-700",       icon: "📝", label: "レポート" },
  minutes:      { bg: "bg-indigo-50",  accent: "border-l-indigo-400",   badge: "bg-indigo-100 text-indigo-700",     icon: "📒", label: "議事録" },
  caution:      { bg: "bg-red-50",     accent: "border-l-red-400",      badge: "bg-red-100 text-red-600",           icon: "⚠️", label: "警告" },
};

const BOARD_FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all",          label: "すべて" },
  { value: "normal",       label: "通常" },
  { value: "info",         label: "重要" },
  { value: "match_result", label: "試合結果" },
  { value: "match_info",   label: "試合要綱" },
];

const MINUTES_FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all",     label: "すべて" },
  { value: "report",  label: "レポート" },
  { value: "minutes", label: "議事録" },
];

// このSetに含まれる type は議事録タブに分類される
const MINUTES_TYPES = new Set<string>(["report", "minutes"]);

const renderWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:text-sky-800 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function AnnouncementsBoard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("board");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; type: AnnouncementType; isPinned: boolean }>({
    title: "", body: "", type: "normal", isPinned: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<FilterValue>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
    });
    return () => unsubscribe();
  }, []);

  const filterOptions = mode === "board" ? BOARD_FILTER_OPTIONS : MINUTES_FILTER_OPTIONS;

  const displayed = useMemo(() => {
    const modeFiltered = announcements.filter(a =>
      mode === "board" ? !MINUTES_TYPES.has(a.type) : MINUTES_TYPES.has(a.type)
    );
    const filtered = filterType === "all"
      ? modeFiltered
      : modeFiltered.filter(a => a.type === filterType);
    return sortOrder === "asc" ? [...filtered].reverse() : filtered;
  }, [announcements, mode, filterType, sortOrder]);

  const pinnedCount = useMemo(() =>
    announcements.filter(a =>
      a.isPinned && (mode === "board" ? !MINUTES_TYPES.has(a.type) : MINUTES_TYPES.has(a.type))
    ).length,
  [announcements, mode]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setFilterType("all");
    setExpanded(null);
    setForm({ title: "", body: "", type: newMode === "board" ? "normal" : "report", isPinned: false });
    setFiles([]);
    setShowForm(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles(prev => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setIsSubmitting(true);
    try {
      const today = new Date();
      const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
      await createAnnouncement({
        title: form.title,
        body: form.body,
        type: form.type,
        isPinned: form.isPinned,
        author: user?.displayName || "匿名",
        date: dateStr,
      }, files);
      setForm({ title: "", body: "", type: mode === "board" ? "normal" : "report", isPinned: false });
      setFiles([]);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create announcement", error);
      alert("投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("このお知らせを削除してもよろしいですか？")) {
      try {
        await deleteAnnouncement(id);
      } catch (error) {
        console.error("Failed to delete announcement", error);
        alert("削除に失敗しました");
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-ag-gray-100 shadow-md overflow-hidden">

      {/* モードタブ */}
      <div className="flex border-b-2 border-ag-gray-100">
        <button
          onClick={() => handleModeChange("board")}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-4 text-sm font-black transition-colors ${
            mode === "board"
              ? "text-ag-gray-900 border-b-2 border-ag-gray-900 bg-white"
              : "text-ag-gray-400 hover:text-ag-gray-600 hover:bg-ag-gray-50"
          }`}
        >
          <span>📣</span> お知らせ
          {mode === "board" && pinnedCount > 0 && (
            <span className="text-xs font-black bg-red-500 text-white rounded-full px-2 py-0.5 shadow-sm">{pinnedCount}</span>
          )}
        </button>
        <button
          onClick={() => handleModeChange("minutes")}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-4 text-sm font-black transition-colors ${
            mode === "minutes"
              ? "text-ag-gray-900 border-b-2 border-ag-gray-900 bg-white"
              : "text-ag-gray-400 hover:text-ag-gray-600 hover:bg-ag-gray-50"
          }`}
        >
          <span>📒</span> 議事録・レポート
          {mode === "minutes" && pinnedCount > 0 && (
            <span className="text-xs font-black bg-red-500 text-white rounded-full px-2 py-0.5 shadow-sm">{pinnedCount}</span>
          )}
        </button>
      </div>

      {/* 投稿ボタン */}
      <div className="flex items-center justify-end px-5 py-3 border-b border-ag-gray-100">
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-black text-ag-lime-700 hover:text-ag-lime-800 bg-ag-lime-50 hover:bg-ag-lime-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? "× 閉じる" : "新規投稿 +"}
        </button>
      </div>

      {/* 投稿フォーム */}
      {showForm && (
        <div className="px-5 py-5 border-b border-ag-gray-50 bg-ag-gray-50/50 space-y-3">
          <input
            type="text"
            placeholder="タイトル"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-2 text-md font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none"
          />
          <textarea
            placeholder={mode === "board" ? "お知らせの内容を記述..." : "議事録・レポートの内容を記述..."}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={mode === "minutes" ? 6 : 3}
            className="w-full bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none resize-none"
          />

          {/* ファイル添付 */}
          <div className="bg-white border-2 border-dashed border-ag-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-black text-ag-gray-500 hover:text-ag-gray-700 bg-ag-gray-50 hover:bg-ag-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-ag-gray-200"
              >
                📎 写真・PDFを添付
              </button>
              <span className="text-[10px] text-ag-gray-400 font-bold">複数選択可</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 bg-ag-gray-100 text-ag-gray-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                    <span>{f.name.endsWith(".pdf") ? "📄" : "🖼️"}</span>
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-ag-gray-400 hover:text-red-500 ml-1 font-black">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AnnouncementType })}
                className="bg-white border-2 border-ag-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-ag-gray-700"
              >
                {mode === "board" ? (
                  <>
                    <option value="normal">通常</option>
                    <option value="info">重要</option>
                    <option value="match_result">試合結果</option>
                    <option value="match_info">試合要綱</option>
                  </>
                ) : (
                  <>
                    <option value="report">レポート</option>
                    <option value="minutes">議事録</option>
                  </>
                )}
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                  className="accent-ag-lime-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-ag-gray-600">ピン留め</span>
              </label>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !form.title.trim() || !form.body.trim()}
              className="px-4 py-2 bg-ag-lime-500 text-white rounded-xl text-xs font-black hover:bg-ag-lime-600 transition-colors disabled:opacity-40"
            >
              {isSubmitting ? (files.length > 0 ? "アップロード中..." : "送信中...") : "投稿する"}
            </button>
          </div>
        </div>
      )}

      {/* フィルター・ソートバー */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-ag-gray-100 bg-ag-gray-50/30">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={`text-xs font-black px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterType === opt.value
                  ? "bg-ag-gray-800 text-white shadow-sm"
                  : "bg-white text-ag-gray-500 border border-ag-gray-200 hover:bg-ag-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}
          className="text-xs font-black text-ag-gray-500 hover:text-ag-gray-700 bg-white border border-ag-gray-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          {sortOrder === "desc" ? "新しい順 ▼" : "古い順 ▲"}
        </button>
      </div>

      {/* 一覧 */}
      <div className="divide-y-2 divide-ag-gray-100">
        {displayed.length === 0 ? (
          <div className="px-5 py-8 text-center text-ag-gray-400 font-bold text-sm">
            {mode === "board" ? "お知らせはまだありません" : "議事録・レポートはまだありません"}
          </div>
        ) : (
          displayed.map((a) => {
            const style = TYPE_STYLES[a.type] ?? TYPE_STYLES.normal;
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className={`${style.bg} border-l-4 ${style.accent}`}>
                <div
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="w-full px-5 py-5 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{style.icon}</span>
                    {a.isPinned && (
                      <span className="text-xs font-black bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded shadow-sm uppercase">PIN</span>
                    )}
                    <span className={`text-xs font-black px-2 py-0.5 rounded-md ${style.badge}`}>{style.label}</span>
                    <span className="text-lg font-black text-ag-gray-900 flex-1 tracking-wide">{a.title}</span>
                    {(a.attachments?.length ?? 0) > 0 && (
                      <span className="text-xs text-ag-gray-400 font-bold shrink-0">📎 {a.attachments!.length}</span>
                    )}
                    <button
                      onClick={(e) => handleDelete(a.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-ag-gray-300 hover:text-red-500 transition-all text-xs mr-2 font-bold px-2 py-1 rounded bg-white hover:bg-red-50 shrink-0"
                    >
                      削除
                    </button>
                    <span className={`text-ag-gray-400 text-sm font-black transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}>▼</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-ag-gray-500 pl-9">
                    <span>{a.author}</span>
                    <span>•</span>
                    <span>{a.date}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 pl-14 space-y-3">
                    <p className="text-base font-bold text-ag-gray-700 leading-relaxed bg-white/50 p-4 rounded-xl border border-ag-gray-100 whitespace-pre-wrap">
                      {renderWithLinks(a.body)}
                    </p>
                    {a.attachments && a.attachments.length > 0 && (
                      <div className="space-y-3">
                        {a.attachments.filter(att => att.fileType === "image").map((att, i) => (
                          <img
                            key={i}
                            src={att.url}
                            alt={att.name}
                            className="max-w-full rounded-xl border border-ag-gray-100 shadow-sm"
                          />
                        ))}
                        <div className="flex flex-wrap gap-2">
                          {a.attachments.filter(att => att.fileType === "pdf").map((att, i) => (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-white border border-ag-gray-200 hover:border-ag-gray-400 px-4 py-2.5 rounded-xl text-sm font-bold text-ag-gray-700 hover:text-ag-gray-900 transition-colors shadow-sm"
                            >
                              <span className="text-lg">📄</span>
                              <span>{att.name}</span>
                              <span className="text-xs text-ag-gray-400">↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
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
