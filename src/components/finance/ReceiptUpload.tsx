"use client";

import { useState } from "react";

export default function ReceiptUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // モック：アップロード成功
    setUploaded(true);
    setTimeout(() => setUploaded(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-ag-gray-100">
        <h3 className="text-sm font-extrabold text-ag-gray-800 tracking-tight tracking-wider">レシートAI解析</h3>
        <span className="text-[10px] text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-full font-black uppercase ring-1 ring-zinc-100 shadow-sm">OCR SYSTEM</span>
      </div>

      {/* ドロップエリア */}
      <div className="p-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center gap-3 py-10 px-4
            rounded-xl border-2 border-dashed transition-all duration-200
            ${isDragging
              ? "border-ag-lime-400 bg-ag-lime-50/50 scale-[1.02]"
              : "border-ag-gray-200 bg-ag-gray-50/30 hover:border-ag-gray-300 hover:bg-ag-gray-50"
            }
            ${uploaded ? "border-ag-lime-400 bg-ag-lime-50" : ""}
          `}
        >
          {uploaded ? (
            <>
              <div className="w-14 h-14 rounded-full bg-ag-lime-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-ag-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-ag-lime-700">解析完了！</p>
                <p className="text-xs text-ag-gray-400 mt-1">¥3,240（飲料水・軽食）を検出しました</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-ag-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-ag-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-ag-gray-600">
                  レシート・領収書をアップロード
                </p>
                <p className="text-xs text-ag-gray-400 mt-1">
                  ドラッグ&ドロップ または クリックで選択
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={() => { setUploaded(true); setTimeout(() => setUploaded(false), 3000); }}
              />
            </>
          )}
        </div>

        {/* 最近のOCR結果 */}
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold text-ag-gray-400 uppercase tracking-wider">最近のスキャン</p>
          {[
            { name: "receipt_20260322.jpg", amount: "¥4,500", category: "施設費", date: "3/22" },
            { name: "receipt_20260315.jpg", amount: "¥1,200", category: "飲食費", date: "3/15" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-ag-gray-50 hover:bg-ag-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-ag-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">📄</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ag-gray-700 truncate">{r.name}</p>
                <p className="text-[10px] text-ag-gray-400">{r.date} • {r.category}</p>
              </div>
              <span className="text-xs font-bold text-ag-gray-700">{r.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
