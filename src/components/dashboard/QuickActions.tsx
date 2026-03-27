"use client";

const actions = [
  { icon: "✋", label: "出欠回答", color: "from-ag-lime-400 to-ag-lime-500", href: "/dashboard/calendar" },
  { icon: "💬", label: "経費入力", color: "from-emerald-400 to-emerald-500", href: "/dashboard/finance" },
  { icon: "📷", label: "レシート", color: "from-amber-400 to-amber-500", href: "/dashboard/finance" },
  { icon: "📝", label: "レポート", color: "from-sky-400 to-sky-500", href: "/dashboard/reports" },
];

export default function QuickActions() {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚡</span>
        <h3 className="text-sm font-bold text-ag-gray-800">クイックアクション</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-ag-gray-50 hover:bg-ag-gray-100 border border-transparent hover:border-ag-gray-200/60 transition-all duration-200 cursor-pointer"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
              <span className="text-lg">{action.icon}</span>
            </div>
            <span className="text-xs font-medium text-ag-gray-600 group-hover:text-ag-gray-800 transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
