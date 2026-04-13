"use client";

import { useEffect } from "react";

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラー内容をコンソールにも表示
    console.error("Calendar Page Crash Error:", error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto mt-12 bg-gray-50 border-2 border-red-200 rounded-3xl text-center">
      <div className="text-4xl mb-4">🚨</div>
      <h2 className="text-2xl font-black text-gray-800 mb-2">致命的なエラーが発生しました</h2>
      <p className="text-gray-600 mb-6 font-bold">申し訳ありません。カレンダー用プログラムの内部でクラッシュが発生しました。</p>
      
      {/* 開発者用：実際のエラーメッセージを画面に出力する（これで何が原因か特定できます） */}
      <div className="bg-white p-4 rounded-xl border border-red-100 text-left overflow-auto mb-6">
        <p className="text-sm font-mono text-red-600 font-bold mb-1">エラー内容（AIへの報告用）:</p>
        <p className="text-xs font-mono text-red-500 break-all">{error.message}</p>
        {error.stack && (
          <details className="mt-2 text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-600">詳細を表示</summary>
            <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
          </details>
        )}
      </div>

      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-ag-lime-500 text-white font-black rounded-xl hover:bg-ag-lime-600 shadow-sm"
      >
        もう一度読み込む (Reset)
      </button>
    </div>
  );
}
