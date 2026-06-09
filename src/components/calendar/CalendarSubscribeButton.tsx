"use client";

import { useState } from "react";

const ICS_URL = "https://bigbeans.vercel.app/api/calendar.ics";
// Google カレンダー側で「URLから追加」する際は webcal:// でも https:// でも可
const GOOGLE_ADD_URL = `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?url=${encodeURIComponent(ICS_URL)}`;

export default function CalendarSubscribeButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ICS_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード非対応のフォールバック
      window.prompt("以下のURLをコピーしてください", ICS_URL);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-ag-gray-50 border-2 border-ag-gray-200 hover:border-ag-lime-300 rounded-xl text-xs font-black text-ag-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Googleカレンダーで購読
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-ag-gray-900 tracking-tight">
                  Googleカレンダーで購読
                </h3>
                <p className="text-sm font-bold text-ag-gray-500 mt-1">
                  練習・試合・イベントが自動的に同期されます
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ag-gray-100 text-ag-gray-500 font-black"
              >
                ✕
              </button>
            </div>

            {/* 推奨：直接リンク */}
            <div className="bg-ag-lime-50 rounded-2xl border-2 border-ag-lime-200 p-4">
              <p className="text-xs font-black text-ag-lime-700 uppercase tracking-widest mb-2">
                かんたん（PC推奨）
              </p>
              <a
                href={GOOGLE_ADD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-ag-lime-500 hover:bg-ag-lime-600 text-white rounded-xl text-sm font-black transition-colors"
              >
                Googleカレンダーで開く
              </a>
              <p className="text-xs font-bold text-ag-gray-600 mt-2 leading-relaxed">
                ボタンを押すと「URLから追加」画面が開きます。
              </p>
            </div>

            {/* 手動：URLをコピー */}
            <div className="bg-ag-gray-50 rounded-2xl border border-ag-gray-200 p-4 space-y-3">
              <p className="text-xs font-black text-ag-gray-600 uppercase tracking-widest">
                URLをコピーして手動追加
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-ag-gray-200 rounded-lg text-xs font-mono text-ag-gray-700 break-all">
                  {ICS_URL}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-ag-gray-800 hover:bg-ag-gray-900 text-white rounded-lg text-xs font-black whitespace-nowrap transition-colors"
                >
                  {copied ? "コピー済" : "コピー"}
                </button>
              </div>
              <ol className="text-xs font-bold text-ag-gray-600 space-y-1.5 leading-relaxed list-decimal list-inside">
                <li>Googleカレンダーを開く</li>
                <li>左メニュー「他のカレンダーを追加」→「URLで追加」</li>
                <li>上のURLを貼り付けて「カレンダーを追加」</li>
              </ol>
            </div>

            <p className="text-xs font-bold text-ag-gray-400 text-center leading-relaxed">
              ※ 同期反映は最大数時間かかる場合があります（Google側の仕様）
            </p>
          </div>
        </div>
      )}
    </>
  );
}
