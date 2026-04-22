"use client";

import { useState } from "react";
import SurveyList from "@/components/surveys/SurveyList";
import SurveyCreateModal from "@/components/surveys/SurveyCreateModal";

type Tab = "all" | "unanswered" | "closed";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",        label: "すべて" },
  { id: "unanswered", label: "あなたが未回答" },
  { id: "closed",     label: "終了済み" },
];

export default function SurveysPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            アンケート・決議
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            合宿の日程や親睦会の出欠、チームの方針をサクッと多数決で決定します。
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-ag-lime-500 to-emerald-500 text-white hover:from-ag-lime-600 hover:to-emerald-600 transition-colors shadow-md shadow-ag-lime-500/20 flex items-center gap-2 self-start"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新しくアンケートを作成
        </button>
      </div>

      {/* タブ */}
      <div className="flex items-center gap-4 border-b border-ag-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "text-ag-lime-600 border-ag-lime-500"
                : "text-ag-gray-400 hover:text-ag-gray-600 border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* アンケートリスト */}
      <SurveyList filter={activeTab} />

      {/* 作成モーダル */}
      {showCreate && <SurveyCreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
