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
  { id: 99, date: "3/26", description: "中古シャトル売却代（50個）", amount: 500, type: "income", category: "古シャトル売却", user: "上杉 由香", method: "自動連携" },
  { id: 1, date: "3/26", description: "コート代（青葉台小学校）", amount: 3000, type: "expense", category: "コート代", user: "鈴木一郎", method: "現金" },
  { id: 2, date: "3/26", description: "コーチ代（3月分）", amount: 5000, type: "expense", category: "コーチ料", user: "鈴木一郎", method: "現金" },
  { id: 3, date: "3/26", description: "駐車場代", amount: 800, type: "expense", category: "交通費", user: "鈴木一郎", method: "現金" },
  { id: 4, date: "3/25", description: "佐藤花子 - 3月月謝", amount: 3000, type: "income", category: "月会費", user: "佐藤花子", method: "PayPay" },
  { id: 5, date: "3/25", description: "ニューオフィシャル 1ダース購入", amount: 5000, type: "expense", category: "シャトル代", user: "管理者", method: "現金" },
  { id: 6, date: "3/24", description: "田中太郎 - 3月月謝", amount: 3000, type: "income", category: "月会費", user: "田中太郎", method: "PayPay" },
  { id: 7, date: "3/24", description: "山田次郎 - 入会費", amount: 1000, type: "income", category: "入会費", user: "山田次郎", method: "銀行振込" },
  { id: 8, date: "3/22", description: "コート代（スポーツセンター）", amount: 4500, type: "expense", category: "コート代", user: "管理者", method: "現金" },
  { id: 9, date: "3/22", description: "総会 お菓子・飲料代", amount: 1200, type: "expense", category: "総会", user: "管理者", method: "現金" },
  { id: 10, date: "3/20", description: "渡辺四郎 - ビジター代", amount: 500, type: "income", category: "ビジター料", user: "渡辺四郎", method: "現金" },
];

const categoryIcons: Record<string, string> = {
  "コート代": "",
  "シャトル代": "",
  "コーチ料": "",
  "交通費": "",
  "総会": "",
  "月会費": "",
  "入会費": "",
  "ビジター料": "",
  "古シャトル売却": "",
  "その他支出": "",
};

const methodBadge: Record<string, string> = {
  現金: "bg-ag-gray-200 text-ag-gray-800",
  PayPay: "bg-red-100 text-red-700",
  銀行振込: "bg-blue-100 text-blue-700",
  自動連携: "bg-ag-lime-100 text-ag-lime-800 border border-ag-lime-300",
};

export default function TransactionList() {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
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
                tx.type === "income" ? "bg-ag-lime-100 text-ag-lime-700" : "bg-red-100 text-red-700"
              }`}>
                <span className="text-[10px] font-black uppercase">{tx.category.substring(0, 2)}</span>
              </div>

              {/* 詳細 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-base font-black text-ag-gray-900 truncate">{tx.description}</p>
                  <span className={`flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded ${methodBadge[tx.method] || methodBadge["現金"]}`}>
                    {tx.method}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-ag-gray-500">
                  <span>{tx.date}</span>
                  <span className="text-ag-gray-300">|</span>
                  <span className="text-ag-gray-700">{tx.category}</span>
                  <span className="text-ag-gray-300">|</span>
                  <span>{tx.user}</span>
                </div>
              </div>

              {/* 金額 */}
              <span className={`text-xl tracking-tight font-black flex-shrink-0 ${
                tx.type === "income" ? "text-ag-lime-700" : "text-red-600"
              }`}>
                {tx.type === "income" ? "+" : "-"}¥{tx.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
