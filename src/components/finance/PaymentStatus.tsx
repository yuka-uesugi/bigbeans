"use client";

interface MemberPayment {
  id: number;
  name: string;
  avatar: string;
  status: "paid" | "unpaid" | "partial";
  amount: number;
  paidAmount: number;
  method: string | null;
  date: string | null;
}

const members: MemberPayment[] = [
  { id: 1, name: "管理者", avatar: "管", status: "paid", amount: 3000, paidAmount: 3000, method: "現金", date: "3/1" },
  { id: 2, name: "田中太郎", avatar: "田", status: "paid", amount: 3000, paidAmount: 3000, method: "PayPay", date: "3/24" },
  { id: 3, name: "佐藤花子", avatar: "佐", status: "paid", amount: 3000, paidAmount: 3000, method: "PayPay", date: "3/25" },
  { id: 4, name: "鈴木一郎", avatar: "鈴", status: "unpaid", amount: 3000, paidAmount: 0, method: null, date: null },
  { id: 5, name: "山田次郎", avatar: "山", status: "paid", amount: 3000, paidAmount: 3000, method: "銀行振込", date: "3/24" },
  { id: 6, name: "高橋三郎", avatar: "高", status: "partial", amount: 3000, paidAmount: 1500, method: "現金", date: "3/20" },
  { id: 7, name: "渡辺四郎", avatar: "渡", status: "paid", amount: 3000, paidAmount: 3000, method: "PayPay", date: "3/15" },
  { id: 8, name: "伊藤五郎", avatar: "伊", status: "unpaid", amount: 3000, paidAmount: 0, method: null, date: null },
  { id: 9, name: "中村六子", avatar: "中", status: "paid", amount: 3000, paidAmount: 3000, method: "PayPay", date: "3/10" },
  { id: 10, name: "小林七美", avatar: "小", status: "unpaid", amount: 3000, paidAmount: 0, method: null, date: null },
];

const statusConfig = {
  paid: { label: "納入済", class: "bg-ag-lime-50 text-ag-lime-700" },
  unpaid: { label: "未納", class: "bg-red-50 text-red-600" },
  partial: { label: "一部", class: "bg-amber-50 text-amber-600" },
};

export default function PaymentStatus() {
  const paidCount = members.filter((m) => m.status === "paid").length;
  const totalAmount = members.reduce((sum, m) => sum + m.amount, 0);
  const paidAmount = members.reduce((sum, m) => sum + m.paidAmount, 0);

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">💳</span>
          <h3 className="text-sm font-bold text-ag-gray-800">3月 月謝納入状況</h3>
        </div>
        <span className="text-xs font-medium text-ag-gray-400">
          {paidCount}/{members.length}名 納入済
        </span>
      </div>

      {/* 進捗バー */}
      <div className="px-5 py-3 bg-ag-gray-50/50 border-b border-ag-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-ag-gray-500">徴収進捗</span>
          <span className="text-xs font-bold text-ag-gray-700">
            ¥{paidAmount.toLocaleString()} / ¥{totalAmount.toLocaleString()}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-ag-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ag-lime-400 to-ag-lime-500 transition-all duration-500"
            style={{ width: `${(paidAmount / totalAmount) * 100}%` }}
          />
        </div>
      </div>

      {/* PayPayリンクボタン */}
      <div className="px-5 py-3 border-b border-ag-gray-100">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors cursor-pointer shadow-sm">
          <span>📱</span>
          PayPay送金リンクをコピー
        </button>
      </div>

      {/* メンバー一覧 */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-ag-gray-50">
        {members.map((member) => {
          const status = statusConfig[member.status];
          return (
            <div key={member.id} className="px-5 py-3 flex items-center justify-between hover:bg-ag-gray-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ag-lime-300 to-ag-lime-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {member.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ag-gray-800 truncate">{member.name}</p>
                  {member.date && (
                    <p className="text-[10px] text-ag-gray-400">{member.date} {member.method}で納入</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {member.status === "unpaid" && (
                  <button className="text-[10px] font-bold px-2 py-1 rounded-lg bg-ag-lime-50 text-ag-lime-600 hover:bg-ag-lime-100 transition-colors cursor-pointer">
                    催促
                  </button>
                )}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.class}`}>
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
