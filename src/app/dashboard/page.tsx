"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import NextPracticeDetail from "@/components/dashboard/NextPracticeDetail";
import AnnouncementsBoard from "@/components/dashboard/AnnouncementsBoard";
import SuggestionBox from "@/components/dashboard/SuggestionBox";
import BalanceCard from "@/components/dashboard/BalanceCard";
import Link from "next/link";

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
  
  useEffect(() => {
    if (isVisitor && !isAllowedPath) {
      router.push("/dashboard");
    }
  }, [isVisitor, isAllowedPath, router]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* ⚠️ 未回答アラート（メンバーのみ） */}
      {!isVisitor && (
        <Link href="/dashboard/calendar" className="block max-w-3xl mx-auto cursor-pointer group">
          <div className="bg-red-50 border-4 border-red-500 rounded-3xl p-5 shadow-lg group-hover:scale-[1.02] group-hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-400 opacity-20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="text-5xl animate-bounce drop-shadow-sm">⚠️</div>
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight leading-tight mb-2">
                  まだ出欠を回答していない<br className="sm:hidden" />練習が 2件 あります！
                </h2>
                <p className="text-lg font-black text-red-800/80 bg-red-100 inline-block px-3 py-1 rounded-xl">
                  ここをタップして、カレンダーから回答をお願いします👆
                </p>
              </div>
              <div className="hidden sm:block text-red-500 font-black text-4xl">&rsaquo;</div>
            </div>
          </div>
        </Link>
      )}

      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-ag-gray-900 tracking-tight">
            {isVisitor ? "ゲストさん、こんにちは！" : `${greeting}！ 👋`}
          </h1>
          <p className="text-xl font-black text-ag-gray-700 mt-2 bg-ag-lime-50/50 inline-block px-3 py-1 rounded-lg">
            その次の練習：4/22（水）12:00〜15:00 （※4/15は試合のため練習なし）
          </p>
        </div>
        <div className="text-lg font-black text-ag-gray-500 bg-white border-2 border-ag-gray-100 px-4 py-2 rounded-xl shadow-sm self-start lg:self-auto">
          {now.getMonth() + 1}/{now.getDate()} {String(hour).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
        </div>
      </div>

      {/* メイン：直近練習詳細 + 本日の会計（メンバーのみ） */}
      <div className={`grid grid-cols-1 ${isVisitor ? "" : "lg:grid-cols-[1fr_400px]"} gap-6`}>
        {/* 直近練習詳細 */}
        <NextPracticeDetail />

        {/* 右サイドコラム（メンバーのみ） */}
        {!isVisitor && (
          <div className="space-y-6">
            <BalanceCard />
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
          <h3 className="text-2xl font-black text-sky-900 mb-3">ビジターの皆様へ 🏸</h3>
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
