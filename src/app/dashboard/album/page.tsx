"use client";

import AlbumGrid from "@/components/album/AlbumGrid";

export default function AlbumPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl auto space-y-6 animate-fade-in-up">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            共有アルバム
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            練習の様子や試合の動画をアップロードして、チーム全員で共有しましょう。
          </p>
        </div>
        
        {/* アップロード領域・ボタン */}
        <div className="flex gap-2">
          <button className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-ag-lime-500 to-emerald-500 text-white hover:from-ag-lime-600 hover:to-emerald-600 transition-colors shadow-md shadow-ag-lime-500/20 flex items-center gap-2 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            アップロード
          </button>
        </div>
      </div>

      {/* ドラッグ＆ドロップ用アップロードエリア（簡易UI） */}
      <div className="border-2 border-dashed border-ag-gray-200 rounded-2xl p-6 bg-ag-gray-50/50 flex flex-col items-center justify-center text-center transition-colors hover:bg-ag-lime-50 hover:border-ag-lime-300 group cursor-pointer">
        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-ag-lime-500 mb-3 group-hover:scale-110 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <p className="text-sm font-bold text-ag-gray-800">
          ここに写真や動画をドラッグ＆ドロップするか、クリックしてファイルを選択
        </p>
        <p className="text-[11px] text-ag-gray-400 mt-1">
          JPEG, PNG, MP4（最大 500MB）に対応しています
        </p>
      </div>

      {/* アルバムグリッド */}
      <AlbumGrid />
    </div>
  );
}
