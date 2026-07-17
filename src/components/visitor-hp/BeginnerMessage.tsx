import { archivo } from "./fonts";

export default function BeginnerMessage() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bb-navy relative rounded-2xl p-10 sm:p-16 shadow-2xl overflow-hidden">
          {/* 横断幕ゆずりの楕円リング */}
          <svg
            className="absolute -right-24 -top-24 w-[480px] h-[480px] opacity-[0.08] pointer-events-none"
            viewBox="0 0 480 480"
            fill="none"
            aria-hidden
          >
            <ellipse cx="240" cy="240" rx="230" ry="150" stroke="#ffffff" strokeWidth="3" transform="rotate(-18 240 240)" />
            <ellipse cx="240" cy="240" rx="200" ry="128" stroke="#ffffff" strokeWidth="1.5" transform="rotate(-18 240 240)" />
          </svg>

          <div className="relative">
            {/* ラベル */}
            <p className={`${archivo.className} text-xs sm:text-sm font-bold text-[#ffd826] tracking-[0.35em] mb-6`}>
              MESSAGE FOR BEGINNERS
            </p>

            {/* タイトル */}
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-8 leading-tight tracking-tight">
              初級者の方へ。
              <br />
              <span className="text-[#ffd826]">安心して飛び込んでください。</span>
            </h2>

            {/* 本文 */}
            <div className="space-y-6 text-lg sm:text-xl font-bold text-[#c3cfec] leading-relaxed">
              <p>
                ビッグビーンズのメンバーは、ほぼ全員が
                <strong className="text-white font-black">「大人になってからバドミントンを始めた」</strong>
                人ばかりです。
              </p>
              <p>
                大人になってからラケットを握ったメンバーが、
                今では全国大会の舞台に立っています。
                だからこそ、初級者の気持ちがわかる。
                <strong className="text-white font-black">上手な人ばかりで萎縮する</strong>、
                なんてことはありません。
              </p>
              <p>
                「運動不足を解消したい」「新しい仲間がほしい」「久しぶりに体を動かしたい」——
                <br className="hidden sm:block" />
                どんな理由でも大歓迎です。まずは見学から、お気軽にどうぞ。
              </p>
              <div className="bg-white/10 border border-[#ffd826]/60 rounded-xl px-6 py-5">
                <p className="text-base sm:text-lg font-bold text-[#ffe793] leading-relaxed">
                  ※ 全くの未経験の方には、まずバドミントン教室で基礎を身につけてからのご参加をおすすめしています。
                  ラケットに少し慣れたら、ぜひ遊びに来てください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
