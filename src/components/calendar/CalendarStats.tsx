"use client";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subtext: string;
  color: string;
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <span className="text-lg">{icon}</span>
        </div>
        <span className="text-xs font-semibold text-ag-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-ag-gray-900">{value}</div>
      <div className="text-[11px] text-ag-gray-400 mt-0.5">{subtext}</div>
    </div>
  );
}

export default function CalendarStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon="📊"
        label="今月の出席率"
        value="78%"
        subtext="前月比 +5%"
        color="bg-ag-lime-50"
      />
      <StatCard
        icon="✅"
        label="参加回数"
        value="6回"
        subtext="全8回中"
        color="bg-emerald-50"
      />
      <StatCard
        icon="📅"
        label="次の練習"
        value="3/29"
        subtext="土 13:00-17:00"
        color="bg-sky-50"
      />
      <StatCard
        icon="⚠️"
        label="未回答"
        value="2件"
        subtext="回答してください"
        color="bg-amber-50"
      />
    </div>
  );
}
