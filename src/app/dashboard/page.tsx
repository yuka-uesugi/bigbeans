import NextPracticeDetail from "@/components/dashboard/NextPracticeDetail";
import AnnouncementsBoard from "@/components/dashboard/AnnouncementsBoard";
import SuggestionBox from "@/components/dashboard/SuggestionBox";
import BalanceCard from "@/components/dashboard/BalanceCard";

export default function DashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-ag-gray-900">
            {greeting}！ 👋
          </h1>
          <p className="text-base font-extrabold text-ag-gray-600 mt-1">
            次の練習：4/8（水）仲町台　12:00〜15:00
          </p>
        </div>
        <div className="text-sm font-black text-ag-gray-500">
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
