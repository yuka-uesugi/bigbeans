"use client";

const stats = [
  { value: "0円", label: "月額料金", subtext: "完全無料で利用可能" },
  { value: "30秒", label: "出欠回答", subtext: "ワンタップで完了" },
  { value: "AI", label: "自動記帳", subtext: "チャットで経費入力" },
  { value: "∞", label: "メンバー数", subtext: "制限なし" },
];

export default function StatsSection() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-ag-lime-500 to-ag-lime-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-base font-semibold text-ag-gray-800 mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-ag-gray-400">{stat.subtext}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
