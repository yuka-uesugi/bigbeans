import BalanceCard from "@/components/dashboard/BalanceCard";
import UpcomingPractice from "@/components/dashboard/UpcomingPractice";
import QuickActions from "@/components/dashboard/QuickActions";
import InventoryAlert from "@/components/dashboard/InventoryAlert";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import MemberOverview from "@/components/dashboard/MemberOverview";

export default function DashboardPage() {
  // 現在の日時（表示用）
  const now = new Date();
  const greeting = now.getHours() < 12 ? "おはようございます" : now.getHours() < 18 ? "こんにちは" : "こんばんは";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900">
            {greeting}！ 👋
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            チームの最新状況をお届けします
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ag-gray-400">
            最終更新: {now.getFullYear()}/{String(now.getMonth() + 1).padStart(2, "0")}/{String(now.getDate()).padStart(2, "0")} {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
          </span>
          <button className="w-8 h-8 rounded-lg bg-white border border-ag-gray-200/60 flex items-center justify-center hover:bg-ag-gray-50 transition-colors cursor-pointer shadow-sm">
            <svg className="w-4 h-4 text-ag-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 上段：残高 + クイックアクション */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BalanceCard />
        <QuickActions />
      </div>

      {/* 中段：練習予定 + 在庫 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingPractice />
        <InventoryAlert />
      </div>

      {/* 下段：アクティビティ + メンバー概要 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed />
        <MemberOverview />
      </div>
    </div>
  );
}
