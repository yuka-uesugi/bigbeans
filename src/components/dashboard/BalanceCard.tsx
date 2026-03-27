"use client";

export default function BalanceCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ag-lime-500 via-ag-lime-400 to-ag-lime-600 p-6 text-white shadow-lg col-span-full lg:col-span-2">
      {/* 背景装飾 */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />
      <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium text-white/80 mb-1">チーム総残高</p>
            <h2 className="text-4xl font-bold tracking-tight">¥ 128,450</h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-2xl">💰</span>
          </div>
        </div>

        <div className="flex gap-6">
          <div>
            <p className="text-xs text-white/60 mb-0.5">今月の収入</p>
            <p className="text-lg font-semibold flex items-center gap-1">
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              ¥ 85,000
            </p>
          </div>
          <div>
            <p className="text-xs text-white/60 mb-0.5">今月の支出</p>
            <p className="text-lg font-semibold flex items-center gap-1">
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
              ¥ 42,300
            </p>
          </div>
          <div className="ml-auto">
            <p className="text-xs text-white/60 mb-0.5">未納者</p>
            <p className="text-lg font-semibold">3名</p>
          </div>
        </div>
      </div>
    </div>
  );
}
