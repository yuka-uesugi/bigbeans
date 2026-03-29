"use client";

import { useState } from "react";

const STEPS = [
  { icon: "📱", title: "ウェブから予約", desc: "カレンダーページから参加したい練習を選んで予約ボタンをタップ" },
  { icon: "✅", title: "前日までに確定", desc: "駐車場の台数制限があるため乗り合わせ制度を設けています。交通手段に不安がある方は事前にご相談ください" },
  { icon: "🏸", title: "練習当日", desc: "体育館に直接お越しください。参加費は当日現地でPayPay払い推奨です（現金も可）" },
];

const FEE_TABLE = [
  {
    label: "3時間練習",
    icon: "⏱️",
    rows: [
      { type: "ライト会員", withCoach: "850円", noCoach: "650円" },
      { type: "ビジター",   withCoach: "1,100円", noCoach: "900円" },
    ]
  },
  {
    label: "4時間練習",
    icon: "⏰",
    rows: [
      { type: "ライト会員", withCoach: "1,050円", noCoach: "850円" },
      { type: "ビジター",   withCoach: "1,300円", noCoach: "1,100円" },
    ]
  },
];

export default function VisitorGuideSection() {
  const [openFee, setOpenFee] = useState(false);

  return (
    <section className="py-20 px-6 bg-white" id="visitor-guide">
      <div className="max-w-4xl mx-auto space-y-16">

        {/* セクションタイトル */}
        <div className="text-center">
          <span className="inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-ag-lime-600 bg-ag-lime-50 border border-ag-lime-100 px-4 py-1.5 rounded-full mb-4">
            VISITOR GUIDE
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-ag-gray-900 leading-tight">
            ビジターとして<br className="sm:hidden" />参加するには？
          </h2>
        </div>

        {/* 参加条件 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🏅", label: "対象ランク", value: "A〜C ランク", note: "初心者（Cランク）も大歓迎！" },
            { icon: "⏰", label: "予約開始", value: "練習の3週間前から", note: "定員24名に達次第締切" },
            { icon: "👤", label: "紹介者", value: "メンバーの紹介があると◎", note: "紹介者なしでも申請可" },
          ].map(item => (
            <div key={item.label} className="bg-ag-gray-50 rounded-3xl p-6 border border-ag-gray-100 text-center hover:border-ag-lime-200 hover:shadow-md transition-all">
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest mb-2">{item.label}</div>
              <div className="text-base font-extrabold text-ag-gray-800 mb-1">{item.value}</div>
              <div className="text-xs text-ag-gray-400">{item.note}</div>
            </div>
          ))}
        </div>

        {/* 参加の流れ */}
        <div>
          <h3 className="text-xl font-extrabold text-ag-gray-800 mb-6 flex items-center gap-2">
            <span>🗺️</span> 参加の流れ
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex-1 relative">
                <div className="bg-white rounded-3xl border-2 border-ag-gray-100 p-5 hover:border-ag-lime-300 transition-all h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-ag-lime-500 text-white text-sm font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-xl">{step.icon}</span>
                  </div>
                  <p className="text-sm font-extrabold text-ag-gray-800 mb-2">{step.title}</p>
                  <p className="text-xs text-ag-gray-500 leading-relaxed">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:flex absolute top-1/2 -right-3 z-10 w-6 h-6 bg-ag-lime-500 rounded-full items-center justify-center text-white text-xs font-black">→</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 参加費 */}
        <div>
          <button
            onClick={() => setOpenFee(!openFee)}
            className="w-full flex items-center justify-between px-6 py-4 bg-ag-gray-50 rounded-2xl border border-ag-gray-100 hover:border-ag-lime-200 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">💴</span>
              <span className="text-sm font-extrabold text-ag-gray-800">今年度の参加費を確認する</span>
            </div>
            <span className={`text-ag-gray-400 transition-transform ${openFee ? "rotate-180" : ""}`}>▼</span>
          </button>

          {openFee && (
            <div className="mt-3 bg-white rounded-3xl border border-ag-gray-100 overflow-hidden shadow-sm animate-fade-in-up">
              {FEE_TABLE.map(group => (
                <div key={group.label} className="border-b border-ag-gray-50 last:border-0">
                  <div className="px-5 py-3 bg-ag-gray-50 flex items-center gap-2">
                    <span>{group.icon}</span>
                    <span className="text-sm font-extrabold text-ag-gray-700">{group.label}</span>
                  </div>
                  <div className="divide-y divide-ag-gray-50">
                    {group.rows.map(row => (
                      <div key={row.type} className="px-5 py-4 grid grid-cols-3 items-center gap-4">
                        <span className="text-sm font-bold text-ag-gray-700">{row.type}</span>
                        <div className="text-center">
                          <p className="text-[9px] text-ag-gray-400 mb-0.5">コーチあり</p>
                          <p className="text-base font-black text-ag-gray-800">{row.withCoach}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-ag-lime-600 mb-0.5">コーチなし割引</p>
                          <p className="text-base font-black text-ag-lime-700">{row.noCoach}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700 font-medium">💡 通常会員の参加費はご入会後にご案内します。ライト会員より割安です。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
