"use client";

import { useState, useEffect } from "react";
import StockOverview from "@/components/inventory/StockOverview";
import UsedShuttleManager from "@/components/inventory/UsedShuttleManager";
import { subscribeToInventory, seedInventoryData, type InventoryItem } from "@/lib/inventory";
import { seedDisposalData } from "@/lib/disposals";

export default function InventoryPage() {
  const [stocks, setStocks] = useState<InventoryItem[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  // Firestoreから在庫データを取得（総在庫カード用）
  useEffect(() => {
    const unsubscribe = subscribeToInventory((items) => {
      setStocks(items);
    });
    return () => unsubscribe();
  }, []);

  // 総在庫数の計算
  const totalStock = stocks.reduce((sum, item) => sum + item.currentStock, 0);

  // アラートが必要なアイテム
  const criticalItems = stocks.filter((item) => item.currentStock <= 0);
  const lowItems = stocks.filter((item) => item.currentStock > 0 && item.currentStock <= item.minStock);

  // 予想残り練習回数（1回の練習で約2ダース消費と仮定）
  const estimatedPractices = Math.floor(totalStock / 2);

  // 総在庫金額
  const totalValue = stocks.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const invCount = await seedInventoryData();
      const dispCount = await seedDisposalData();
      alert(`在庫${invCount}件、処分記録${dispCount}件をFirestoreに投入しました！`);
    } catch (err) {
      console.error("データ投入エラー:", err);
      alert("データ投入に失敗しました。コンソールを確認してください。");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-ag-gray-900 flex items-center gap-3 tracking-tight">
            備品・在庫管理
          </h1>
          <p className="text-base sm:text-lg font-bold text-ag-gray-500 mt-2 leading-relaxed">
            シャトルや備品の残量を見える化し、発注モレを防ぎます。中古シャトルの譲渡記録もこちらから。
          </p>
        </div>
      </div>

      {/* トップアラート */}
      {(criticalItems.length > 0 || lowItems.length > 0) && (
        <div className="flex items-start gap-4 p-6 rounded-[2rem] bg-red-50 border-2 border-red-100 text-red-800 shadow-sm overflow-hidden">
          <div className="w-2 self-stretch bg-red-500 rounded-full mr-2" />
          <div className="space-y-1">
            <h4 className="text-lg sm:text-xl font-black">
              {criticalItems.length > 0 ? "発注アラート：在庫切れのシャトルがあります！" : "補充推奨：在庫が少なくなっています"}
            </h4>
            <p className="text-base sm:text-lg font-bold text-red-600/80 leading-relaxed tracking-tight">
              {[...criticalItems, ...lowItems].map((item) => `「${item.name}」(${item.currentStock}${item.unit})`).join("、")}
              {criticalItems.length > 0 ? " — 早急に発注してください。" : " — 次回発注をおすすめします。"}
            </p>
          </div>
        </div>
      )}

      {/* メインレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start pb-24">
        {/* 左側：在庫リスト + 中古シャトル管理 */}
        <div className="space-y-8 flex flex-col h-full">
          <StockOverview />
          <div className="mt-2 text-center text-ag-gray-300 font-bold tracking-widest opacity-30 select-none">● ● ●</div>
          <UsedShuttleManager />
        </div>

        {/* 右側：総在庫カード */}
        <div className="space-y-8 flex flex-col h-full px-1">
          {/* 総シャトルカード */}
          <div className="bg-gradient-to-br from-ag-lime-500 to-ag-lime-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden ring-4 ring-ag-lime-100">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/20 blur-xl" />
            <div className="absolute bottom-4 right-8 text-8xl opacity-10 rotate-12 select-none font-black">STOCK</div>
            <p className="text-base font-black text-white/80 mb-3 tracking-widest uppercase">総シャトル在庫</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl sm:text-7xl font-black tracking-tighter">{totalStock}</span>
              <span className="text-xl font-black opacity-90">ダース</span>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm sm:text-base font-black text-white/70 bg-ag-lime-700/40 px-4 py-2 rounded-xl inline-block border border-ag-lime-400/30">
                <span className="mr-1">INFO:</span> 予想消費ベース: 残り約{estimatedPractices}回分の練習可能
              </p>
              <p className="text-sm font-bold text-white/60">
                総在庫金額: ¥{totalValue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 種類別サマリー */}
          {stocks.length > 0 && (
            <div className="bg-white rounded-[2rem] border-2 border-ag-gray-100 shadow-xl p-6">
              <h3 className="text-lg font-black text-ag-gray-800 mb-4">種類別サマリー</h3>
              <div className="space-y-4">
                {/* 種類ごとにグループ化 */}
                {Array.from(new Set(stocks.map((s) => s.shuttleType))).map((type) => {
                  const typeStocks = stocks.filter((s) => s.shuttleType === type);
                  const typeTotal = typeStocks.reduce((sum, s) => sum + s.currentStock, 0);
                  const typePrice = typeStocks[0]?.unitPrice || 0;
                  return (
                    <div key={type} className="flex items-center justify-between p-4 bg-ag-gray-50 rounded-2xl border border-ag-gray-100">
                      <div>
                        <p className="text-base font-black text-ag-gray-800">{type}</p>
                        <p className="text-xs font-bold text-ag-gray-500">
                          ¥{typePrice.toLocaleString()}/ダース
                          {typeStocks.map((s) => ` | ${s.grade}: ${s.currentStock}`).join("")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-black ${typeTotal === 0 ? "text-red-600" : "text-ag-gray-900"}`}>{typeTotal}</span>
                        <span className="text-sm font-black text-ag-gray-400 ml-1">ダース</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 初期データ投入ボタン（データが空の時のみ表示） */}
      {stocks.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center">
          <h3 className="text-xl font-black text-amber-900 mb-3">在庫データがありません</h3>
          <p className="text-base font-bold text-amber-700 mb-4">
            初期在庫データ（ニューオフィシャル・エアロ500・エアロ700）と処分履歴をFirestoreに一括投入しますか？
          </p>
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="px-8 py-3 bg-amber-600 text-white font-black rounded-xl shadow-lg hover:bg-amber-700 transition-all disabled:opacity-50"
          >
            {isSeeding ? "投入中..." : "初期データをFirestoreに投入"}
          </button>
        </div>
      )}
    </div>
  );
}
