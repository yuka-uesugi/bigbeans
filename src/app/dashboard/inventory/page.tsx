"use client";

import StockOverview from "@/components/inventory/StockOverview";
import UsageHistory from "@/components/inventory/UsageHistory";
import UsedShuttleManager from "@/components/inventory/UsedShuttleManager";

export default function InventoryPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">🎾</span>
            備品・在庫管理
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            シャトルや備品の残量を見える化し、発注モレを防ぎます。中古シャトルの譲渡記録もこちらから。
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-xs font-bold rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-sm cursor-pointer border border-ag-lime-500">
            📦 Amazon一括発注
          </button>
        </div>
      </div>

      {/* トップアラート */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800">
        <span className="text-2xl filter drop-shadow animate-pulse">⚠️</span>
        <div>
          <h4 className="text-sm font-bold">発注アラート：シャトルが不足しています！</h4>
          <p className="text-xs text-red-600/80 mt-1">
            「エアロセンサ300」の在庫が規定値（5ダース）を下回っています。次回の練習（3/29）までに補充をおすすめします。
          </p>
        </div>
      </div>

      {/* メインレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start pb-20">
        {/* 左側：在庫リスト + 中古シャトル管理 */}
        <div className="space-y-6 flex flex-col h-full">
          <StockOverview />
          <div className="mt-2"></div>
          <UsedShuttleManager />
        </div>

        {/* 右側：タイムライン履歴 */}
        <div className="space-y-6 flex flex-col h-full">
          {/* 総シャトルカード */}
          <div className="bg-gradient-to-br from-ag-lime-500 to-ag-lime-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute bottom-2 right-4 text-6xl opacity-20">🏸</div>
            <p className="text-xs font-semibold text-white/80 mb-2">総シャトル在庫</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight">22</span>
              <span className="text-sm font-bold opacity-80">ダース</span>
            </div>
            <p className="text-[10px] text-white/60 mt-3 flex items-center gap-1">
              <span>予想消費ベース: 残り約6回分の練習</span>
            </p>
          </div>

          <UsageHistory />
        </div>
      </div>
    </div>
  );
}
