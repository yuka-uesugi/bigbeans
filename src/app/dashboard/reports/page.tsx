"use client";

import ReportList from "@/components/reports/ReportList";
import ReportEditor from "@/components/reports/ReportEditor";

export default function ReportsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">📝</span>
            レポート・議事録
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            日々の練習や試合の反省、および役員会議やプロジェクトの議事録をチーム内で共有できます。
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="タグやキーワードで検索..."
              className="pl-10 pr-4 py-2 rounded-xl bg-white border border-ag-gray-200/60 text-sm text-ag-gray-700 placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-300 focus:ring-1 focus:ring-ag-lime-200 transition-all w-64"
            />
          </div>
        </div>
      </div>

      {/* メインレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-stretch">
        
        {/* 左側：レポートタイムライン */}
        <div className="flex flex-col h-[calc(100vh-180px)]">
          <h3 className="text-sm font-bold text-ag-gray-500 uppercase tracking-widest mb-4">Past Reports</h3>
          <div className="flex-1 overflow-y-auto pr-2 pb-8 custom-scrollbar">
            <ReportList />
          </div>
        </div>

        {/* 右側：レポート作成エディタ */}
        <div className="flex flex-col h-[calc(100vh-180px)] pb-8">
          <ReportEditor />
        </div>
        
      </div>
    </div>
  );
}
