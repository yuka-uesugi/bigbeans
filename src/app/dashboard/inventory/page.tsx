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
          <h1 className="text-3xl sm:text-4xl font-black text-ag-gray-900 flex items-center gap-3 tracking-tight">
            <span className="text-4xl">📦</span>
            備品・在庫管理
          </h1>
          <p className="text-base sm:text-lg font-bold text-ag-gray-500 mt-2 leading-relaxed">
            シャトルや備品の残量を見える化し、発注モレを防ぎます。中古シャトルの譲渡記録もこちらから。
          </p>
        </div>
        <div className="flex gap-3">
          <button className="w-full sm:w-auto px-6 py-4 text-base font-black rounded-2xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-all shadow-md active:scale-95 border-2 border-ag-lime-500">
            📦 Amazon一括発注
          </button>
        </div>
      </div>

      {/* トップアラート (老眼対策) */}
      <div className="flex items-start gap-4 p-6 rounded-[2rem] bg-red-50 border-2 border-red-100 text-red-800 shadow-sm overflow-hidden">
        <span className="text-4xl filter drop-shadow animate-pulse flex-shrink-0">⚠️</span>
        <div className="space-y-1">
          <h4 className="text-lg sm:text-xl font-black">発注アラート：シャトルが不足しています！</h4>
          <p className="text-base sm:text-lg font-bold text-red-600/80 leading-relaxed tracking-tight">
            「エアロセンサ300」の在庫が規定値（5ダース）を下回っています。次回の練習（3/29）までに補充をおすすめします。
          </p>
        </div>
      </div>

      {/* メインレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start pb-24">
        {/* 左側：在庫リスト + 中古シャトル管理 */}
        <div className="space-y-8 flex flex-col h-full">
          <StockOverview />
          <div className="mt-2 text-center text-ag-gray-300 font-bold tracking-widest opacity-30 select-none">● ● ●</div>
          <UsedShuttleManager />
        </div>

        {/* 右側：タイムライン履歴 */}
        <div className="space-y-8 flex flex-col h-full px-1">
          {/* 総シャトルカード (老眼対策版) */}
          <div className="bg-gradient-to-br from-ag-lime-500 to-ag-lime-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden ring-4 ring-ag-lime-100">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/20 blur-xl" />
            <div className="absolute bottom-4 right-8 text-8xl opacity-10 rotate-12 select-none">🏸</div>
            <p className="text-base font-black text-white/80 mb-3 tracking-widest uppercase">総シャトル在庫</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl sm:text-7xl font-black tracking-tighter">22</span>
              <span className="text-xl font-black opacity-90">ダース</span>
            </div>
            <p className="text-sm sm:text-base font-black text-white/70 mt-6 bg-ag-lime-700/40 px-4 py-2 rounded-xl inline-block border border-ag-lime-400/30">
              <span className="mr-1">💡</span> 予想消費ベース: 残り約6回分の練習可能
            </p>
          </div>

          <UsageHistory />
        </div>
      </div>
    </div>
  );
}
