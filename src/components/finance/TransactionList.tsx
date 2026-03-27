"use client";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  user: string;
  method: string;
}

const transactions: Transaction[] = [
  { id: 99, date: "3/26", description: "中古シャトル売却代（50個）", amount: 500, type: "income", category: "シャトル売却", user: "上杉 由香", method: "自動連携" },
  { id: 1, date: "3/26", description: "コート代（青葉台小学校）", amount: 3000, type: "expense", category: "施設費", user: "鈴木一郎", method: "現金" },
  { id: 2, date: "3/26", description: "コーチ代（3月分）", amount: 5000, type: "expense", category: "指導費", user: "鈴木一郎", method: "現金" },
  { id: 3, date: "3/26", description: "駐車場代", amount: 800, type: "expense", category: "交通費", user: "鈴木一郎", method: "現金" },
  { id: 4, date: "3/25", description: "佐藤花子 - 3月月謝", amount: 3000, type: "income", category: "月謝", user: "佐藤花子", method: "PayPay" },
  { id: 5, date: "3/25", description: "シャトルコック 1ダース購入", amount: 5000, type: "expense", category: "備品費", user: "管理者", method: "現金" },
  { id: 6, date: "3/24", description: "田中太郎 - 3月月謝", amount: 3000, type: "income", category: "月謝", user: "田中太郎", method: "PayPay" },
  { id: 7, date: "3/24", description: "山田次郎 - 3月月謝", amount: 3000, type: "income", category: "月謝", user: "山田次郎", method: "銀行振込" },
  { id: 8, date: "3/22", description: "コート代（スポーツセンター）", amount: 4500, type: "expense", category: "施設費", user: "管理者", method: "現金" },
  { id: 9, date: "3/22", description: "飲料水購入", amount: 1200, type: "expense", category: "飲食費", user: "管理者", method: "現金" },
  { id: 10, date: "3/20", description: "渡辺四郎 - ビジター代", amount: 500, type: "income", category: "ビジター", user: "渡辺四郎", method: "現金" },
];

const categoryIcons: Record<string, string> = {
  施設費: "🏢",
  備品費: "🏸",
  指導費: "👨‍🏫",
  交通費: "🚗",
  飲食費: "🍵",
  月謝: "💳",
  ビジター: "👤",
  シャトル売却: "♻️",
  その他: "📦",
};

const methodBadge: Record<string, string> = {
  現金: "bg-ag-gray-100 text-ag-gray-600",
  PayPay: "bg-red-50 text-red-600",
  銀行振込: "bg-blue-50 text-blue-600",
  自動連携: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

export default function TransactionList() {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">📒</span>
          <h3 className="text-sm font-bold text-ag-gray-800">取引履歴</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs font-medium text-ag-gray-500 hover:text-ag-gray-700 px-3 py-1.5 rounded-lg hover:bg-ag-gray-50 transition-colors cursor-pointer">
            フィルター
          </button>
          <button className="text-xs font-medium text-ag-lime-600 hover:text-ag-lime-700 transition-colors cursor-pointer">
            全て表示 →
          </button>
        </div>
      </div>

      {/* 取引一覧 */}
      <div className="divide-y divide-ag-gray-50">
        {transactions.map((tx) => (
          <div key={tx.id} className="px-5 py-3.5 hover:bg-ag-gray-50/50 transition-colors">
            <div className="flex items-center gap-3">
              {/* カテゴリアイコン */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                tx.type === "income" ? "bg-ag-lime-50" : "bg-red-50"
              }`}>
                <span className="text-lg">{categoryIcons[tx.category] || "📦"}</span>
              </div>

              {/* 詳細 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-ag-gray-800 truncate">{tx.description}</p>
                  <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${methodBadge[tx.method] || methodBadge["現金"]}`}>
                    {tx.method}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ag-gray-400">
                  <span>{tx.date}</span>
                  <span>•</span>
                  <span>{tx.category}</span>
                  <span>•</span>
                  <span>{tx.user}</span>
                </div>
              </div>

              {/* 金額 */}
              <span className={`text-sm font-bold flex-shrink-0 ${
                tx.type === "income" ? "text-ag-lime-600" : "text-red-500"
              }`}>
                {tx.type === "income" ? "+" : "-"} ¥{tx.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
