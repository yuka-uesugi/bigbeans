import { archivo } from "./fonts";

export default function ReasonsSection() {
  const reasons = [
    {
      number: "1",
      title: "現役神奈川県代表による\n毎週の直接指導",
      description:
        "トップレベルの技術を、基礎から丁寧に。現役の神奈川県代表選手（女性）が毎週コーチングを行います。フォーム改善からゲーム戦術まで、初級者でも着実に上達できる環境です。",
      badge: "bg-[#2c55a8] text-white",
      bar: "bg-[#2c55a8]",
    },
    {
      number: "2",
      title: "大人スタート限定の大会で\n「全国」を目指せる夢",
      description:
        "私たちが出場する全国大会は「社会人になってからバドミントンを始めた人」限定の団体戦。学生時代の経験がなくても、大人になってから始めて全国の舞台に立てる——それがビッグビーンズの最大の魅力です。",
      badge: "bg-[#ffd826] text-[#16294d]",
      bar: "bg-[#ffd826]",
    },
    {
      number: "3",
      title: "ライフスタイルに沿った\n柔軟な会費制",
      description:
        "基本は通常会員（月額）ですが、子育て中や介護、お仕事など諸々の事情がある方のために「都度払い」の制度もご用意しています。まずは一度ご相談ください！",
      badge: "bg-[#5d8f1f] text-white",
      bar: "bg-[#5d8f1f]",
    },
  ];

  return (
    <section className="bb-light py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* セクションヘッダー */}
        <div className="text-center mb-16 sm:mb-20">
          <p className={`${archivo.className} text-xs sm:text-sm font-bold text-[#2c55a8] tracking-[0.35em] mb-4`}>
            WHY BIG BEANS?
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#16294d] leading-tight tracking-tight">
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
              className="bg-white rounded-2xl p-8 sm:p-9 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative"
            >
              {/* 上端のカラーバー */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${reason.bar}`} />

              {/* ナンバー */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${reason.badge} text-xl font-black mb-6`}>
                {reason.number}
              </div>

              {/* タイトル */}
              <h3 className="text-xl font-black text-[#16294d] mb-4 leading-snug whitespace-pre-line">
                {reason.title}
              </h3>

              {/* 説明 */}
              <p className="text-base sm:text-lg font-bold text-slate-600 leading-relaxed flex-1">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
