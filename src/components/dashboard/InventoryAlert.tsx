"use client";

interface InventoryItem {
  id: number;
  name: string;
  current: number;
  min: number;
  unit: string;
  status: "ok" | "low" | "critical";
}

const items: InventoryItem[] = [
  { id: 1, name: "シャトルコック（エアロセンサ700）", current: 6, min: 12, unit: "本", status: "critical" },
  { id: 2, name: "シャトルコック（エアロセンサ500）", current: 18, min: 12, unit: "本", status: "ok" },
  { id: 3, name: "グリップテープ", current: 4, min: 10, unit: "本", status: "low" },
  { id: 4, name: "スポーツドリンク粉末", current: 3, min: 5, unit: "袋", status: "low" },
];

const statusConfig = {
  ok: { dot: "bg-ag-lime-400", bg: "bg-ag-lime-50", text: "text-ag-lime-700", label: "十分" },
  low: { dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700", label: "不足" },
  critical: { dot: "bg-red-400", bg: "bg-red-50", text: "text-red-700", label: "要補充" },
};

export default function InventoryAlert() {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏸</span>
          <h3 className="text-sm font-bold text-ag-gray-800">備品在庫</h3>
        </div>
        <button className="text-xs font-medium text-ag-lime-600 hover:text-ag-lime-700 transition-colors cursor-pointer">
          在庫管理 →
        </button>
      </div>

      {/* アイテム一覧 */}
      <div className="divide-y divide-ag-gray-100">
        {items.map((item) => {
          const s = statusConfig[item.status];
          const percentage = Math.min((item.current / item.min) * 100, 100);
          return (
            <div key={item.id} className="px-5 py-3.5 hover:bg-ag-gray-50/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-ag-gray-700 truncate pr-4">{item.name}</p>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-ag-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.status === "critical"
                        ? "bg-red-400"
                        : item.status === "low"
                        ? "bg-amber-400"
                        : "bg-ag-lime-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-ag-gray-500 font-medium flex-shrink-0">
                  {item.current}{item.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
