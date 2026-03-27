"use client";

import { useState } from "react";

interface MediaItem {
  id: string;
  type: "photo" | "video";
  url: string;
  title: string;
  date: string;
  author: string;
  tags: string[];
}

const mockMedia: MediaItem[] = [
  {
    id: "1",
    type: "photo",
    url: "https://images.unsplash.com/photo-1622279457486-69d73ce184fc?auto=format&fit=crop&q=80&w=800",
    title: "春季大会 男子ダブルス決勝",
    date: "2026/03/21",
    author: "田中太郎",
    tags: ["大会", "試合"],
  },
  {
    id: "2",
    type: "video",
    url: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=800",
    title: "【動画】クリアのフォーム確認（佐藤）",
    date: "2026/03/18",
    author: "佐藤花子",
    tags: ["フォーム", "練習"],
  },
  {
    id: "3",
    type: "photo",
    url: "https://images.unsplash.com/photo-1574629810360-7efbb1925695?auto=format&fit=crop&q=80&w=800",
    title: "新しいシャトル大量入荷！",
    date: "2026/03/10",
    author: "管理者",
    tags: ["備品", "日常"],
  },
  {
    id: "4",
    type: "photo",
    // 汎用的なスポーツ/チーム風の画像
    url: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&q=80&w=800",
    title: "練習後の集合写真",
    date: "2026/02/28",
    author: "管理部",
    tags: ["集合写真", "イベント"],
  },
  {
    id: "5",
    type: "video",
    url: "https://images.unsplash.com/photo-1611804598150-10f74fb9fbee?auto=format&fit=crop&q=80&w=800",
    title: "【動画】ダブルスのローテーション",
    date: "2026/02/15",
    author: "コーチ",
    tags: ["戦術", "練習"],
  },
  {
    id: "6",
    type: "photo",
    url: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=800",
    title: "忘年会にて",
    date: "2025/12/28",
    author: "田中太郎",
    tags: ["飲み会", "イベント"],
  },
];

export default function AlbumGrid() {
  const [filter, setFilter] = useState("all");

  const filteredMedia = filter === "all" 
    ? mockMedia 
    : mockMedia.filter(m => m.tags.includes(filter) || m.type === filter);

  return (
    <div className="space-y-6">
      {/* フィルター・タブ群 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button 
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === "all" ? "bg-ag-lime-500 text-white shadow-md shadow-ag-lime-500/30" : "bg-white text-ag-gray-600 border border-ag-gray-200 hover:bg-ag-gray-50"}`}
        >
          すべて
        </button>
        {["video", "試合", "練習", "イベント"].map((tag) => (
          <button 
            key={tag}
            onClick={() => setFilter(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === tag ? "bg-ag-lime-500 text-white shadow-md shadow-ag-lime-500/30" : "bg-white text-ag-gray-600 border border-ag-gray-200 hover:bg-ag-gray-50"}`}
          >
            {tag === "video" ? "🎥 動画のみ" : `#${tag}`}
          </button>
        ))}
      </div>

      {/* グリッドレイアウト（Masonry風のアプローチ） */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {filteredMedia.map((item) => (
          <div 
            key={item.id} 
            className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-ag-gray-200/50 bg-white"
          >
            {/* メディア画像本体 */}
            <div className="relative aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={item.url} 
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* 動画アイコン（オーバーレイ） */}
              {item.type === "video" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}

              {/* グラデーション・メタデータ（ホバー時表示） */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <p className="text-white text-sm font-bold truncate">{item.title}</p>
                <div className="flex items-center justify-between mt-1 text-white/80 text-[10px]">
                  <span>{item.date}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[8px] font-bold text-white">
                      {item.author[0]}
                    </div>
                    <span>{item.author}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 下部情報バー（常に表示） */}
            <div className="px-4 py-3 bg-white">
              <h4 className="text-xs font-bold text-ag-gray-800 truncate mb-1.5">{item.title}</h4>
              <div className="flex flex-wrap gap-1">
                {item.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 bg-ag-gray-100 text-ag-gray-500 rounded text-[9px] font-bold">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            
            {/* 右上のアクションボタン（ホバー時） */}
            <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full items-center justify-center text-ag-gray-600 shadow-sm opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all hidden sm:flex">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
