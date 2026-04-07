export default function BeginnerMessage() {
  return (
    <section className="py-24 sm:py-32 bg-ag-lime-50/40 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-ag-lime-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-ag-lime-200/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="bg-white rounded-[3rem] border-2 border-ag-lime-100 p-10 sm:p-16 shadow-xl">
          {/* ラベル */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-ag-lime-500 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-sm font-black text-ag-lime-700 uppercase tracking-[0.2em]">
              Message for Beginners
            </span>
          </div>

          {/* タイトル */}
          <h2 className="text-3xl sm:text-4xl font-black text-ag-gray-900 mb-8 tracking-tighter leading-tight">
            初級者の方へ。
            <br />
            <span className="text-ag-lime-600">安心して飛び込んでください。</span>
          </h2>

          {/* 本文 */}
          <div className="space-y-6 text-lg sm:text-xl font-medium text-ag-gray-600 leading-relaxed">
            <p>
              ビッグビーンズのメンバーは、ほぼ全員が
              <strong className="text-ag-gray-900 font-black">「大人になってからバドミントンを始めた」</strong>
              人ばかりです。
            </p>
            <p>
              「ラケットの持ち方もわからない」からスタートしたメンバーが、
              今では全国大会の舞台に立っています。
              だからこそ、初心者の気持ちがわかる。
              <strong className="text-ag-gray-900 font-black">上手な人ばかりで萎縮する</strong>、
              なんてことはありません。
            </p>
            <p>
              「運動不足を解消したい」「新しい仲間がほしい」「久しぶりに体を動かしたい」——
              <br className="hidden sm:block" />
              どんな理由でも大歓迎です。まずは見学から、お気軽にどうぞ。
            </p>
          </div>


        </div>
      </div>
    </section>
  );
}
