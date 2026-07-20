"use client";

import { Participant } from "./PracticeGrouping";

// 会員種別ごとの表示スタイル（色・ラベル）
const TYPE_STYLE: Record<
  Participant["membershipType"],
  { label: string; chip: string; badge: string }
> = {
  coach:    { label: "コーチ",   chip: "border-amber-400 bg-amber-50 text-amber-900",       badge: "bg-amber-500" },
  official: { label: "正会員",   chip: "border-ag-lime-400 bg-ag-lime-50 text-ag-lime-900", badge: "bg-ag-lime-500" },
  light:    { label: "ライト",   chip: "border-emerald-400 bg-emerald-50 text-emerald-900", badge: "bg-emerald-500" },
  visitor:  { label: "ビジター", chip: "border-sky-400 bg-sky-50 text-sky-900",             badge: "bg-sky-500" },
};

// 表示順（コーチ→正会員→ライト→ビジター）
const TYPE_ORDER: Participant["membershipType"][] = ["coach", "official", "light", "visitor"];

/**
 * 本日の参加メンバー一覧（毎回使う機能なので常時表示）
 * 人数サマリー＋種別が一目で分かる名前カードを大きくはっきり表示する
 */
export default function ParticipantList({
  participants,
  onRemoveParticipant,
  visitorEmails,
}: {
  participants: Participant[];
  onRemoveParticipant?: (id: string) => void;
  /** ビジターの連絡先（参加者ID → メールアドレス）。メンバーだけが取得できる */
  visitorEmails?: Record<string, string>;
}) {
  if (participants.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-ag-gray-200 bg-ag-gray-50/30 p-10 text-center">
        <p className="text-lg font-black text-ag-gray-400">まだ参加メンバーがいません</p>
      </div>
    );
  }

  const sorted = [...participants].sort(
    (a, b) => TYPE_ORDER.indexOf(a.membershipType) - TYPE_ORDER.indexOf(b.membershipType)
  );

  return (
    <div className="space-y-5">
      {/* 人数サマリー */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-black text-ag-gray-900 mr-1">
          合計 {participants.length}名
        </span>
        {TYPE_ORDER.map((t) => {
          const count = participants.filter((p) => p.membershipType === t).length;
          if (count === 0) return null;
          return (
            <span
              key={t}
              className={`text-sm font-black text-white px-3 py-1.5 rounded-full ${TYPE_STYLE[t].badge}`}
            >
              {TYPE_STYLE[t].label} {count}名
            </span>
          );
        })}
      </div>

      {/* メンバー一覧 */}
      <div className="flex flex-wrap gap-3">
        {sorted.map((p) => {
          const style = TYPE_STYLE[p.membershipType];
          return (
            <div
              key={p.id}
              className={`inline-flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3 ${style.chip}`}
            >
              <span className={`text-xs font-black text-white px-2 py-1 rounded-full ${style.badge}`}>
                {style.label}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-black leading-none">
                  {p.name.replace("[V] ", "")}
                </span>
                {/* ビジターの連絡先。当日の中止連絡などにすぐ使えるよう、押すとメールが開く */}
                {visitorEmails?.[p.id] && (
                  <a
                    href={`mailto:${visitorEmails[p.id]}`}
                    className="text-sm font-bold underline underline-offset-2 opacity-80 hover:opacity-100 break-all"
                  >
                    {visitorEmails[p.id]}
                  </a>
                )}
              </span>
              {onRemoveParticipant && (
                <button
                  onClick={() => {
                    if (window.confirm(`${p.name.replace("[V] ", "")}さんを本日の参加メンバーから外します（削除）。よろしいですか？`)) {
                      onRemoveParticipant(p.id);
                    }
                  }}
                  className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black bg-white/70 text-ag-gray-400 border border-ag-gray-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                  aria-label={`${p.name}を削除`}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
