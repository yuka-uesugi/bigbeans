"use client";

export default function MemberBenefitsSection() {
  return (
    <section className="py-24 px-6 bg-ag-gray-50" id="benefits">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* セクションタイトル */}
        <div className="text-center">
          <span className="inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-ag-lime-600 bg-ag-lime-100 border border-ag-lime-200 px-4 py-1.5 rounded-full mb-4">
            MEMBER BENEFITS
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-ag-gray-900 leading-tight">
            チームのメンバーになると<br className="sm:hidden" />メリットがたくさん
          </h2>
        </div>

        {/* 比較表 */}
        <div className="bg-white rounded-3xl border border-ag-gray-200 shadow-sm overflow-x-auto mb-4">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 w-[28%] p-4 bg-ag-gray-100 border-b border-r border-ag-gray-200 text-sm font-black text-ag-gray-600">
                  特典・機能
                </th>
                  <th className="w-1/4 p-4 bg-ag-lime-50 border-b border-r border-ag-gray-200 text-center">
                    <div className="text-sm font-black text-ag-lime-700">通常会員</div>
                    <div className="text-[10px] text-ag-lime-600 mt-1 font-bold">月4回参加</div>
                  </th>
                  <th className="w-1/4 p-4 bg-sky-50 border-b border-r border-ag-gray-200 text-center">
                    <div className="text-sm font-black text-sky-700">ライト会員</div>
                    <div className="text-[10px] text-sky-600 mt-1 font-bold">月2回程度</div>
                  </th>
                  <th className="w-1/4 p-4 bg-white border-b border-ag-gray-200 text-center">
                    <div className="text-sm font-black text-ag-gray-600">ビジター</div>
                    <div className="text-[10px] text-ag-gray-400 mt-1 font-bold">都度参加</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { label: "予約タイミング", regular: "2ヶ月前〜", light: "5週間前〜", visitor: "3週間前〜" },
                  { label: "キャンセル待ち", regular: "最優先割込", light: "2番目", visitor: "最後尾" },
                  { label: "参加費", regular: "もっともお得", light: "お得", visitor: "通常料金" },
                  { label: "メンバー名簿・プロフ", regular: "◯", light: "◯", visitor: "×" },
                  { label: "共有アルバム", regular: "◯", light: "◯", visitor: "×" },
                  { label: "運営・タスク管理", regular: "◯", light: "◯", visitor: "×" },
                  { label: "チーム内アンケート", regular: "◯", light: "◯", visitor: "×" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-ag-gray-100 last:border-0 group hover:bg-ag-gray-50 transition-colors">
                    <td className="sticky left-0 z-10 w-[28%] bg-white group-hover:bg-ag-gray-50 p-4 border-r border-ag-gray-100 font-extrabold text-ag-gray-700">
                      {row.label}
                    </td>
                    <td className="p-4 border-r border-ag-gray-100 text-center font-black text-ag-lime-600">
                      {row.regular}
                    </td>
                    <td className="p-4 border-r border-ag-gray-100 text-center font-bold text-sky-600">
                      {row.light}
                    </td>
                    <td className="p-4 text-center font-medium text-ag-gray-500">
                      {row.visitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {/* コールトゥアクション */}
        <div className="bg-gradient-to-br from-ag-lime-500 to-emerald-600 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black mb-4 flex items-center justify-center gap-3">
              <span>🤝</span>
              一緒にバドミントンを楽しみませんか？
            </h3>
            <p className="text-white/90 mb-8 max-w-xl mx-auto font-medium leading-relaxed">
              Big Beansは、バドミントンを愛するメンバーが集まるアットホームなチームです。
              まずはビジターとして練習に参加し、雰囲気を体感してみてください！
            </p>
            <a 
              href="#join-form" 
              className="inline-block bg-white text-ag-lime-600 px-8 py-4 rounded-full font-black text-lg hover:bg-ag-lime-50 hover:scale-105 transition-all shadow-lg"
            >
              入会を申し込む
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
