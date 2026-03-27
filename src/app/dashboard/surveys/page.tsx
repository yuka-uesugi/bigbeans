"use client";

import SurveyList from "@/components/surveys/SurveyList";

export default function SurveysPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            アンケート・決議
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            合宿の日程や親睦会の出欠、チームの方針をサクッと多数決で決定します。
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-ag-lime-500 to-emerald-500 text-white hover:from-ag-lime-600 hover:to-emerald-600 transition-colors shadow-md shadow-ag-lime-500/20 flex items-center gap-2 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新しくアンケートを作成
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex items-center gap-4 border-b border-ag-gray-200">
        <button className="px-4 py-3 text-sm font-bold text-ag-lime-600 border-b-2 border-ag-lime-500">
          すべて
        </button>
        <button className="px-4 py-3 text-sm font-bold text-ag-gray-400 hover:text-ag-gray-600 transition-colors">
          あなたが未回答
        </button>
        <button className="px-4 py-3 text-sm font-bold text-ag-gray-400 hover:text-ag-gray-600 transition-colors">
          終了済み
        </button>
      </div>

      {/* アンケートリスト */}
      <SurveyList />
    </div>
  );
}
