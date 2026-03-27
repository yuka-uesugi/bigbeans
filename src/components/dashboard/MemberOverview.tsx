"use client";

interface Member {
  id: number;
  name: string;
  avatar: string;
  role: "管理者" | "会計" | "メンバー";
  paymentStatus: "paid" | "unpaid" | "partial";
  attendanceRate: number;
}

const members: Member[] = [
  { id: 1, name: "管理者（あなた）", avatar: "管", role: "管理者", paymentStatus: "paid", attendanceRate: 95 },
  { id: 2, name: "田中太郎", avatar: "田", role: "メンバー", paymentStatus: "paid", attendanceRate: 88 },
  { id: 3, name: "佐藤花子", avatar: "佐", role: "会計", paymentStatus: "paid", attendanceRate: 92 },
  { id: 4, name: "鈴木一郎", avatar: "鈴", role: "メンバー", paymentStatus: "unpaid", attendanceRate: 75 },
  { id: 5, name: "山田次郎", avatar: "山", role: "メンバー", paymentStatus: "unpaid", attendanceRate: 60 },
  { id: 6, name: "高橋三郎", avatar: "高", role: "メンバー", paymentStatus: "partial", attendanceRate: 82 },
];

const paymentConfig = {
  paid: { label: "納入済", class: "bg-ag-lime-50 text-ag-lime-700" },
  unpaid: { label: "未納", class: "bg-red-50 text-red-600" },
  partial: { label: "一部", class: "bg-amber-50 text-amber-600" },
};

const roleConfig = {
  管理者: "border-ag-lime-400",
  会計: "border-sky-400",
  メンバー: "border-ag-gray-300",
};

export default function MemberOverview() {
  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ag-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <h3 className="text-sm font-bold text-ag-gray-800">メンバー概要</h3>
          <span className="text-xs text-ag-gray-400 bg-ag-gray-50 px-2 py-0.5 rounded-full">{members.length}名</span>
        </div>
        <button className="text-xs font-medium text-ag-lime-600 hover:text-ag-lime-700 transition-colors cursor-pointer">
          全員表示 →
        </button>
      </div>

      {/* テーブルヘッダー */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 bg-ag-gray-50/50 text-[10px] font-semibold text-ag-gray-400 uppercase tracking-wider">
        <span>メンバー</span>
        <span className="text-center w-16">月謝</span>
        <span className="text-center w-16">出席率</span>
      </div>

      {/* メンバー一覧 */}
      <div className="divide-y divide-ag-gray-50">
        {members.map((member) => {
          const payment = paymentConfig[member.paymentStatus];
          return (
            <div key={member.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3 hover:bg-ag-gray-50/50 transition-colors">
              {/* アバター + 名前 */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-ag-lime-300 to-ag-lime-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 border-2 ${roleConfig[member.role]}`}>
                  {member.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ag-gray-800 truncate">{member.name}</p>
                  <p className="text-[10px] text-ag-gray-400">{member.role}</p>
                </div>
              </div>

              {/* 月謝 */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center w-16 ${payment.class}`}>
                {payment.label}
              </span>

              {/* 出席率 */}
              <div className="w-16 text-center">
                <span className={`text-sm font-bold ${
                  member.attendanceRate >= 80 ? "text-ag-lime-600" : member.attendanceRate >= 60 ? "text-amber-500" : "text-red-500"
                }`}>
                  {member.attendanceRate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
