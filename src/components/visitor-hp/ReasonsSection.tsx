export default function ReasonsSection() {
  const reasons = [
    {
      number: "01",
      title: "現役神奈川県代表による\n毎週の直接指導",
      description:
        "トップレベルの技術を、基礎から丁寧に。現役の神奈川県代表選手（女性）が毎週コーチングを行います。フォーム改善からゲーム戦術まで、初級者でも着実に上達できる環境です。",
      accent: "from-ag-lime-500 to-emerald-500",
      accentLight: "bg-ag-lime-50",
      accentText: "text-ag-lime-700",
    },
    {
      number: "02",
      title: "大人スタート限定の大会で\n「全国」を目指せる夢",
      description:
        "私たちが出場する全国大会は「社会人になってからバドミントンを始めた人」限定の団体戦。学生時代の経験がなくても、大人になってから始めて全国の舞台に立てる——それがビッグビーンズの最大の魅力です。",
      accent: "from-amber-500 to-orange-500",
      accentLight: "bg-amber-50",
      accentText: "text-amber-700",
    },
    {
      number: "03",
      title: "ライフスタイルに沿った\n柔軟な会費制",
      description:
        "基本は通常会員（月額）ですが、子育て中や介護、お仕事など諸々の事情がある方のために「都度払い」の制度もご用意しています。まずは一度ご相談ください！",
      accent: "from-sky-500 to-blue-500",
      accentLight: "bg-sky-50",
      accentText: "text-sky-700",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* セクションヘッダー */}
        <div className="text-center mb-16 sm:mb-20">
          <span className="inline-block text-xs font-black text-ag-lime-600 uppercase tracking-[0.3em] mb-4 bg-ag-lime-50 px-4 py-2 rounded-full border border-ag-lime-100">
            Why Big Beans?
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ag-gray-900 tracking-tighter leading-tight">
            ビッグビーンズが
            <br className="sm:hidden" />
            選ばれる3つの理由
          </h2>
        </div>

        {/* カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reasons.map((reason, i) => (
            <div
              key={i}
              className="group relative bg-white rounded-[2.5rem] border-2 border-ag-gray-100 p-8 sm:p-10 shadow-lg hover:shadow-2xl hover:border-ag-lime-200 transition-all duration-300 flex flex-col"
            >
              {/* ナンバー */}
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${reason.accent} text-white text-xl font-black mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                {reason.number}
              </div>

              {/* タイトル */}
              <h3 className="text-xl sm:text-2xl font-black text-ag-gray-900 mb-4 leading-snug tracking-tight whitespace-pre-line">
                {reason.title}
              </h3>

              {/* 説明 */}
              <p className="text-base sm:text-lg font-medium text-ag-gray-500 leading-relaxed flex-1">
                {reason.description}
              </p>

              {/* ボトム装飾 */}
              <div className={`mt-6 h-1.5 rounded-full bg-gradient-to-r ${reason.accent} opacity-30 group-hover:opacity-100 transition-opacity`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
