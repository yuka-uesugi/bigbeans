import NextPracticeDetail from "@/components/dashboard/NextPracticeDetail";
import AnnouncementsBoard from "@/components/dashboard/AnnouncementsBoard";
import SuggestionBox from "@/components/dashboard/SuggestionBox";
import BalanceCard from "@/components/dashboard/BalanceCard";
import Link from "next/link";

export default function DashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* ⚠️ 未回答アラート（老眼対策の特大バナー） */}
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

      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-ag-gray-900 tracking-tight">
            {greeting}！ 👋
          </h1>
          <p className="text-xl font-black text-ag-gray-700 mt-2 bg-ag-lime-50/50 inline-block px-3 py-1 rounded-lg">
            その次の練習：4/22（水）12:00〜15:00 （※4/15は試合のため練習なし）
          </p>
        </div>
        <div className="text-lg font-black text-ag-gray-500 bg-white border-2 border-ag-gray-100 px-4 py-2 rounded-xl shadow-sm self-start lg:self-auto">
          {now.getMonth() + 1}/{now.getDate()} {String(hour).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
        </div>
      </div>

      {/* メイン：直近練習詳細（ヒーローカード） + 本日の会計 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* 直近練習詳細（最重要情報） */}
        <NextPracticeDetail />

        {/* 右サイドコラム */}
        <div className="space-y-6">
          {/* 本日の会計集計・チェックリスト */}
          <BalanceCard />
        </div>
      </div>

      {/* お知らせ ＆ 意見箱 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnnouncementsBoard />
        <SuggestionBox />
      </div>
    </div>
  );
}
