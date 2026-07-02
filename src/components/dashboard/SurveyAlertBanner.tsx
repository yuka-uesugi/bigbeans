"use client";

import Link from "next/link";
import { useActiveSurveys } from "@/hooks/useActiveSurveys";

/**
 * ダッシュボード上部に出す「受付中アンケート」の告知バナー。
 * 自分が未回答の受付中アンケートがある時だけ表示する（無い時は何も出さない）。
 * 全員が最初に見る場所なので、これで見落としを防ぐ。
 */
export default function SurveyAlertBanner() {
  const { unansweredSurveys } = useActiveSurveys();

  if (unansweredSurveys.length === 0) return null;

  return (
    <Link
      href="/dashboard/surveys"
      className="block rounded-2xl border-2 border-ag-lime-300 bg-gradient-to-r from-ag-lime-50 to-emerald-50 px-5 py-4 sm:px-6 sm:py-5 shadow-sm hover:shadow-md hover:border-ag-lime-400 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* アイコン */}
        <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-ag-lime-500 flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>

        {/* 本文 */}
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-black text-ag-lime-800 leading-tight">
            回答をお願いします（受付中のアンケート {unansweredSurveys.length}件）
          </p>
          <div className="mt-1.5 space-y-0.5">
            {unansweredSurveys.slice(0, 3).map((s) => (
              <p key={s.id} className="text-sm sm:text-base font-bold text-ag-gray-700 truncate">
                ・{s.title}
                <span className="ml-2 text-xs sm:text-sm font-bold text-ag-gray-400">締切 {s.deadline}</span>
              </p>
            ))}
            {unansweredSurveys.length > 3 && (
              <p className="text-sm font-bold text-ag-gray-400">ほか {unansweredSurveys.length - 3}件</p>
            )}
          </div>
        </div>

        {/* ボタン風の矢印（スマホでは非表示にせず小さく） */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-ag-lime-500 text-white text-sm sm:text-base font-black shadow-sm">
          <span className="hidden sm:inline">回答する</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
