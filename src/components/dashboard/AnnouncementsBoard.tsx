"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  type AnnouncementData
} from "@/lib/announcements";

const typeStyle = {
  caution: { bg: "bg-red-50", border: "border-red-100", badge: "bg-red-100 text-red-600", icon: "⚠️" },
  info: { bg: "bg-sky-50", border: "border-sky-100", badge: "bg-sky-100 text-sky-600", icon: "📌" },
  normal: { bg: "bg-white", border: "border-ag-gray-100", badge: "bg-ag-gray-100 text-ag-gray-500", icon: "📢" },
};

export default function AnnouncementsBoard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "normal" as const, isPinned: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
      if (data.length > 0 && !expanded) {
        setExpanded(data[0].id);
      }
    });
    return () => unsubscribe();
  }, []);

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
      });
      
      setForm({ title: "", body: "", type: "normal", isPinned: false });
      setShowForm(false);
    } catch (error) {
      console.error("Failed to crate announcement", error);
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
      <div className="flex items-center justify-between px-5 py-5 border-b-2 border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📣</span>
          <h3 className="text-xl font-black text-ag-gray-800 tracking-wide">お知らせ</h3>
          <span className="text-sm font-black bg-red-500 text-white rounded-full px-2.5 py-0.5 shadow-sm">
            {announcements.filter(a => a.isPinned).length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-black text-ag-lime-700 hover:text-ag-lime-800 bg-ag-lime-50 hover:bg-ag-lime-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? "× 閉じる" : "新着を投稿 +"}
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-5 border-b border-ag-gray-50 bg-ag-gray-50/50 space-y-4">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="タイトル"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-2 text-md font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none"
            />
            <textarea
              placeholder="お知らせの内容を記述..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={3}
              className="w-full bg-white border-2 border-ag-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none resize-none"
            />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="bg-white border-2 border-ag-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-ag-gray-700"
                >
                  <option value="normal">通常</option>
                  <option value="info">重要</option>
                  <option value="caution">警告・休み等</option>
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
                {isSubmitting ? "送信中..." : "投稿する"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y-2 divide-ag-gray-100">
        {announcements.length === 0 ? (
          <div className="px-5 py-8 text-center text-ag-gray-400 font-bold text-sm">
            お知らせはまだありません
          </div>
        ) : (
          announcements.map((a) => {
            const style = typeStyle[a.type];
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className={`${style.bg} border-l-4 ${a.type === "caution" ? "border-l-red-400" : a.type === "info" ? "border-l-sky-400" : "border-l-ag-gray-200"}`}>
                <div
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="w-full px-5 py-5 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{style.icon}</span>
                    {a.isPinned && (
                      <span className="text-xs font-black bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded shadow-sm uppercase">PIN</span>
                    )}
                    <span className="text-lg font-black text-ag-gray-900 flex-1 tracking-wide">{a.title}</span>
                    
                    <button
                      onClick={(e) => handleDelete(a.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-ag-gray-300 hover:text-red-500 transition-all text-xs mr-2 font-bold px-2 py-1 rounded bg-white hover:bg-red-50"
                    >
                      削除
                    </button>

                    <span className={`text-ag-gray-400 text-sm font-black transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-ag-gray-500 pl-9">
                    <span>{a.author}</span>
                    <span>•</span>
                    <span>{a.date}</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-5 pb-5 pl-14">
                    <p className="text-base font-bold text-ag-gray-700 leading-relaxed bg-white/50 p-4 rounded-xl border border-ag-gray-100 whitespace-pre-wrap">{a.body}</p>
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
