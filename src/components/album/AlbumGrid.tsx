"use client";

import { useState, useEffect } from "react";
import { subscribeToMedia, deleteMedia, type MediaItem } from "@/lib/albums";

export default function AlbumGrid() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const unsubscribe = subscribeToMedia((data) => {
      setMedia(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string, storagePath: string) => {
    if (confirm("このメディアを削除してもよろしいですか？")) {
      try {
        await deleteMedia(id, storagePath);
      } catch (error) {
        console.error("Failed to delete media", error);
        alert("削除に失敗しました。");
      }
    }
  };

  const filteredMedia = filter === "all" 
    ? media 
    : media.filter(m => m.tags?.includes(filter) || m.type === filter);

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
      {filteredMedia.length === 0 ? (
        <div className="py-12 text-center text-ag-gray-400 font-bold text-sm">
          メディアがありません
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {filteredMedia.map((item) => (
            <div 
              key={item.id} 
              className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-ag-gray-200/50 bg-white"
            >
              {/* メディア画像本体 */}
              <div className="relative aspect-[4/3] bg-ag-gray-100 flex items-center justify-center overflow-hidden">
                {item.type === "video" ? (
                  <video 
                    src={item.url}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    preload="metadata"
                  />
                ) : (
                  <img 
                    src={item.url} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                
                {/* 動画アイコン（オーバーレイ） */}
                {item.type === "video" && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform pointer-events-none">
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}

                {/* グラデーション・メタデータ（ホバー時表示） */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
                  <p className="text-white text-sm font-bold truncate">{item.title}</p>
                  <div className="flex items-center justify-between mt-1 text-white/80 text-[10px]">
                    <span>{item.date}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[8px] font-bold text-white">
                        {(item.author || "匿")[0]}
                      </div>
                      <span>{item.author}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 下部情報バー（常に表示） */}
              <div className="px-4 py-3 bg-white">
                <h4 className="text-xs font-bold text-ag-gray-800 truncate mb-1.5" title={item.title}>{item.title}</h4>
                <div className="flex flex-wrap gap-1">
                  {item.tags?.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-ag-gray-100 text-ag-gray-500 rounded text-[9px] font-bold">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* 右上のアクションボタン（常にhoverで表示） */}
              <button 
                onClick={() => handleDelete(item.id, item.storagePath)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full items-center justify-center text-ag-gray-600 shadow-sm opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all hidden sm:flex"
                title="削除する"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
