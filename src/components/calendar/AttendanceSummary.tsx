"use client";

import { useState } from "react";
import type { Member } from "@/data/memberList";
import type { AttendanceData, AttendanceStatus } from "@/lib/attendances";

// ─────────────────────────────────────────────
// 回答状況まとめ（参加・不参加・保留・未回答）
// 名簿(roster)と出欠データを突き合わせて、
// 「まだ何も答えていない人」も見えるようにするコンポーネント。
// 数字ボタンをタップすると、その区分の名前一覧が開閉する。
// ※ ビジターは名簿にいない（参加時だけ登録される）ため、
//   「未回答」の計算対象には含めない。
// ─────────────────────────────────────────────

interface AttendanceSummaryProps {
  roster: Member[];
  attendances: AttendanceData[];
}

type GroupKey = "attend" | "absent" | "pending" | "unanswered";

interface Group {
  key: GroupKey;
  label: string;
  names: string[];
  countColor: string;
  activeClass: string;
  chipClass: string;
}

export default function AttendanceSummary({ roster, attendances }: AttendanceSummaryProps) {
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);

  // この名簿メンバーが回答済みか（ID一致か名前一致で status が入っていれば回答済み）
  const hasAnswered = (m: Member) =>
    attendances.some(
      (a) => (a.memberId === String(m.id) || a.name === m.name) && a.status != null
    );

  const namesByStatus = (status: AttendanceStatus) =>
    attendances.filter((a) => a.status === status).map((a) => a.name);

  const unansweredNames = roster
    .filter((m) => m.membershipType !== "visitor")
    .filter((m) => !hasAnswered(m))
    .map((m) => m.name);

  const groups: Group[] = [
    {
      key: "attend",
      label: "参加",
      names: namesByStatus("attend"),
      countColor: "text-ag-lime-600",
      activeClass: "border-ag-lime-400 bg-ag-lime-50",
      chipClass: "bg-ag-lime-50 text-ag-lime-700 border-ag-lime-100",
    },
    {
      key: "absent",
      label: "不参加",
      names: namesByStatus("absent"),
      countColor: "text-red-500",
      activeClass: "border-red-300 bg-red-50",
      chipClass: "bg-red-50 text-red-600 border-red-100",
    },
    {
      key: "pending",
      label: "保留",
      names: namesByStatus("pending"),
      countColor: "text-amber-500",
      activeClass: "border-amber-300 bg-amber-50",
      chipClass: "bg-amber-50 text-amber-600 border-amber-100",
    },
    {
      key: "unanswered",
      label: "未回答",
      names: unansweredNames,
      countColor: "text-ag-gray-500",
      activeClass: "border-ag-gray-300 bg-ag-gray-100",
      chipClass: "bg-ag-gray-100 text-ag-gray-600 border-ag-gray-200",
    },
  ];

  const open = groups.find((g) => g.key === openGroup) ?? null;

  return (
    <div className="space-y-2 pt-2">
      <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">
        回答状況（タップで名前を表示）
      </h4>
      <div className="grid grid-cols-4 gap-2">
        {groups.map((g) => (
          <button
            key={g.key}
            onClick={() => setOpenGroup(openGroup === g.key ? null : g.key)}
            className={`py-2.5 rounded-2xl border-2 transition-all text-center ${
              openGroup === g.key
                ? g.activeClass
                : "border-ag-gray-100 bg-white hover:border-ag-gray-200"
            }`}
          >
            <div className={`text-xl font-black leading-none ${g.countColor}`}>{g.names.length}</div>
            <div className="text-[11px] font-bold text-ag-gray-600 mt-1">{g.label}</div>
          </button>
        ))}
      </div>
      {open && (
        <div className="p-3 rounded-2xl border border-ag-gray-100 bg-white">
          <p className="text-xs font-black text-ag-gray-500 mb-2">
            {open.label}（{open.names.length}名）
          </p>
          {open.names.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {open.names.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className={`px-2.5 py-1.5 rounded-lg border text-sm font-bold ${open.chipClass}`}
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-ag-gray-400">該当する人はいません</p>
          )}
        </div>
      )}
    </div>
  );
}
