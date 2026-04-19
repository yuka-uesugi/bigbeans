"use client";

import { useRef, useState } from "react";
import AlbumGrid from "@/components/album/AlbumGrid";
import { uploadMedia } from "@/lib/albums";
import { useAuth } from "@/contexts/AuthContext";

export default function AlbumPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      alert("ファイルサイズが500MBを超えています。");
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "video/mp4"];
    if (!validTypes.includes(file.type)) {
      alert("対応していないファイル形式です。JPEG, PNG, MP4を選択してください。");
      return;
    }

    setIsUploading(true);
    try {
      await uploadMedia(file, user?.displayName || "匿名", file.name, []);
    } catch (error) {
      console.error(error);
      alert("アップロード中にエラーが発生しました。");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

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
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/jpeg, image/png, video/mp4" 
            onChange={handleFileChange} 
          />
          <button 
            onClick={handleUploadClick}
            disabled={isUploading}
            className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-ag-lime-500 to-emerald-500 text-white hover:from-ag-lime-600 hover:to-emerald-600 transition-colors shadow-md shadow-ag-lime-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                アップロード中...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                アップロード
              </>
            )}
          </button>
        </div>
      </div>

      {/* ドラッグ＆ドロップ用アップロードエリア（簡易UI） */}
      <div 
        onClick={handleUploadClick}
        className={`border-2 border-dashed border-ag-gray-200 rounded-2xl p-6 bg-ag-gray-50/50 flex flex-col items-center justify-center text-center transition-colors group ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-ag-lime-50 hover:border-ag-lime-300 cursor-pointer'}`}
      >
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
