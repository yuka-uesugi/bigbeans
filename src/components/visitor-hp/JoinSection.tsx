import { archivo } from "./fonts";

export default function JoinSection() {
  const steps = [
    {
      step: "1",
      title: "メールでご連絡ください",
      body: "ページの下にあるお問い合わせ先へ、見学したい旨をお送りください。2〜3日以内にお返事します。",
    },
    {
      step: "2",
      title: "日程と会場をご案内します",
      body: "都合の合う練習日をご相談のうえ、当日の会場をお伝えします。持ち物や集合時間もそのときにご案内します。",
    },
    {
      step: "3",
      title: "まずは見学・体験から",
      body: "見学だけでも大丈夫です。打ってみたい方は体験参加もできます。入会するかどうかは、そのあとゆっくり決めてください。",
    },
  ];

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-6">
        {/* セクションヘッダー */}
        <div className="text-center mb-14 sm:mb-16">
          <p className={`${archivo.className} text-xs sm:text-sm font-bold text-[#2c55a8] tracking-[0.35em] mb-4`}>
            HOW TO JOIN
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#16294d] leading-tight tracking-tight">
            参加のしかた
          </h2>
        </div>

        {/* 3ステップ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-14 sm:mb-16">
          {steps.map((s, i) => (
            <div
              key={i}
              className="bg-[#f5f7fc] rounded-2xl p-7 sm:p-8 border-2 border-[#dbe3f5] flex flex-col"
            >
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#2c55a8] text-white text-lg font-black mb-5">
                {s.step}
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#16294d] mb-3 leading-snug">
                {s.title}
              </h3>
              <p className="text-base sm:text-lg font-bold text-slate-600 leading-relaxed flex-1">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        {/* 会費のご案内 */}
        <div className="rounded-2xl border-2 border-[#dbe3f5] overflow-hidden">
          <div className="bg-[#2c55a8] px-7 sm:px-9 py-5">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              会費について
            </h3>
          </div>
          <div className="bg-white px-7 sm:px-9 py-8 space-y-6">
            <div>
              <p className="text-lg sm:text-xl font-black text-[#16294d] mb-2">
                見学・体験のとき
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-600 leading-relaxed">
                ビジター料金（900円〜1,300円）でご参加いただけます。会場によって金額が変わります。
              </p>
            </div>

            <div className="border-t-2 border-[#eef1f8] pt-6">
              <p className="text-lg sm:text-xl font-black text-[#16294d] mb-2">
                入会したあと
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-600 leading-relaxed">
                基本は月額の通常会員です。ただ、子育てや介護、お仕事の都合で毎週は来られないという方のために、
                来た日だけお支払いいただく「都度払い」も用意しています。
                続け方は人それぞれでいいと思っているので、まずはご相談ください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
