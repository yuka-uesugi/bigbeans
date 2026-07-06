"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import NextPracticeDetail from "@/components/dashboard/NextPracticeDetail";
import SurveyAlertBanner from "@/components/dashboard/SurveyAlertBanner";
import AnnouncementsBoard from "@/components/dashboard/AnnouncementsBoard";
import SuggestionBox from "@/components/dashboard/SuggestionBox";
import BalanceCard from "@/components/dashboard/BalanceCard";

function DashboardContent() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは";

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const isVisitor = searchParams.get("role") === "visitor" && !user;
  const isAllowedPath = pathname === "/dashboard/calendar" || pathname === "/dashboard";

  // NextPracticeDetail と BalanceCard を同じ練習に同期させる
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  useEffect(() => {
    if (isVisitor && !isAllowedPath) {
      router.push("/dashboard");
    }
  }, [isVisitor, isAllowedPath, router]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      

      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-ag-gray-900 tracking-tight">
            {isVisitor ? "ゲストさん、こんにちは！" : `${greeting}！`}
          </h1>
        </div>
        <div className="text-lg font-black text-ag-gray-500 bg-white border-2 border-ag-gray-100 px-4 py-2 rounded-xl shadow-sm self-start lg:self-auto">
          {now.getMonth() + 1}/{now.getDate()} {String(hour).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
        </div>
      </div>

      {/* 受付中アンケートの告知バナー（未回答がある時だけ・メンバーのみ） */}
      {!isVisitor && <SurveyAlertBanner />}

      {/* メイン：直近練習詳細 + 本日の会計（メンバーのみ） */}
      <div className={`grid grid-cols-1 ${isVisitor ? "" : "lg:grid-cols-[1fr_400px]"} gap-6`}>
        {/* 直近練習詳細 */}
        <NextPracticeDetail onActiveEventChange={setActiveEventId} />

        {/* 右サイドコラム（メンバーのみ） */}
        {!isVisitor && (
          <div className="space-y-6">
            <BalanceCard eventId={activeEventId} />
          </div>
        )}
      </div>

      {/* お知らせ ＆ 意見箱（メンバーのみ） */}
      {!isVisitor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnnouncementsBoard />
          <SuggestionBox />
        </div>
      )}
      
      {/* ビジター向け案内 */}
      {isVisitor && (
        <div className="bg-sky-50 border-2 border-sky-100 rounded-3xl p-8 text-center sm:text-left shadow-sm">
          <h3 className="text-2xl font-black text-sky-900 mb-3">ビジターの皆様へ</h3>
          <p className="text-lg font-bold text-sky-800 leading-relaxed max-w-2xl">
            Big Beansの練習に興味を持っていただきありがとうございます！<br />
            上のカードから練習の参加予約が可能です。ぜひ一度コートに遊びに来てください。
          </p>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ag-gray-400 font-bold">読み込み中...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
