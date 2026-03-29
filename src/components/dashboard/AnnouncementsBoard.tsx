"use client";

import { useState } from "react";

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: "4/15は練習休み",
    body: "2部予選会のため、4月15日（水）の練習はお休みです。試合出場の方は頑張ってください！",
    author: "上杉",
    date: "3/28",
    isPinned: true,
    type: "caution" as const,
  },
  {
    id: 2,
    title: "新年度会費についてのご連絡",
    body: "4月より新年度がスタートします。通常会員の方は4月末日までに年間会費をお振込みください。詳細は会計ページをご確認ください。",
    author: "上杉",
    date: "3/27",
    isPinned: true,
    type: "info" as const,
  },
  {
    id: 3,
    title: "ユニフォームのデザイン案をお送りします",
    body: "今年度のユニフォームデザイン案を近日中に共有します。意見お聞かせください。",
    author: "田中",
    date: "3/25",
    isPinned: false,
    type: "normal" as const,
  },
];

const typeStyle = {
  caution: { bg: "bg-red-50", border: "border-red-100", badge: "bg-red-100 text-red-600", icon: "⚠️" },
  info: { bg: "bg-sky-50", border: "border-sky-100", badge: "bg-sky-100 text-sky-600", icon: "📌" },
  normal: { bg: "bg-white", border: "border-ag-gray-100", badge: "bg-ag-gray-100 text-ag-gray-500", icon: "📢" },
};

export default function AnnouncementsBoard() {
  const [expanded, setExpanded] = useState<number | null>(1);

  return (
    <div className="bg-white rounded-3xl border border-ag-gray-100 shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-5 border-b-2 border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📣</span>
          <h3 className="text-xl font-black text-ag-gray-800 tracking-wide">お知らせ</h3>
          <span className="text-sm font-black bg-red-500 text-white rounded-full px-2.5 py-0.5 shadow-sm">
            {ANNOUNCEMENTS.filter(a => a.isPinned).length}
          </span>
        </div>
        <button className="text-sm font-black text-ag-lime-700 hover:text-ag-lime-800 bg-ag-lime-50 hover:bg-ag-lime-100 px-3 py-1.5 rounded-lg transition-colors">
          新着を投稿 +
        </button>
      </div>
      <div className="divide-y-2 divide-ag-gray-100">
        {ANNOUNCEMENTS.map((a) => {
          const style = typeStyle[a.type];
          const isOpen = expanded === a.id;
          return (
            <div key={a.id} className={`${style.bg} border-l-4 ${a.type === "caution" ? "border-l-red-400" : a.type === "info" ? "border-l-sky-400" : "border-l-ag-gray-200"}`}>
              <button
                onClick={() => setExpanded(isOpen ? null : a.id)}
                className="w-full px-5 py-5 text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{style.icon}</span>
                  {a.isPinned && (
                    <span className="text-xs font-black bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded shadow-sm uppercase">PIN</span>
                  )}
                  <span className="text-lg font-black text-ag-gray-900 flex-1 tracking-wide">{a.title}</span>
                  <span className={`text-ag-gray-400 text-sm font-black transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-ag-gray-500 pl-9">
                  <span>{a.author}</span>
                  <span>•</span>
                  <span>{a.date}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pl-14">
                  <p className="text-base font-bold text-ag-gray-700 leading-relaxed bg-white/50 p-4 rounded-xl border border-ag-gray-100">{a.body}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
