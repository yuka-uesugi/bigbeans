import { archivo } from "./fonts";

export default function AboutSection() {
  const items = [
    {
      label: "どんなサークルか",
      title: "20代から60代まで、\n一緒に打っています",
      description:
        "横浜市都筑区を中心に、緑区・青葉区の体育館で活動しているバドミントンサークルです。学生時代からの経験者もいれば、大人になってから始めた人、ブランクを経て戻ってきた人もいます。年齢も経験もばらばらですが、コートに立てば同じです。",
      bar: "bg-[#2c55a8]",
    },
    {
      label: "練習のこと",
      title: "毎週、コーチが\n見てくれます",
      description:
        "現役で神奈川県代表として戦っている選手が、毎週の練習を見てくれます。むずかしいことは言わず、その人その人に合わせて教えてくれるので、基礎から直したい人にも、ゲームの組み立てを覚えたい人にも合います。",
      bar: "bg-[#ffd826]",
    },
    {
      label: "これまでのこと",
      title: "気づいたら、\n全国まで行っていました",
      description:
        "大人になってから始めた人だけが出られる「全日本レディース（クラブ対抗）」という大会があります。仲間と練習を続けていたら、いつのまにか全国大会の舞台に立っていました。今でもみんなで、勝ち負けよりあの遠征が楽しかったね、という話をしています。",
      bar: "bg-[#5d8f1f]",
    },
  ];

  return (
    <section className="bb-light py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* セクションヘッダー */}
        <div className="text-center mb-16 sm:mb-20">
          <p className={`${archivo.className} text-xs sm:text-sm font-bold text-[#2c55a8] tracking-[0.35em] mb-4`}>
            ABOUT US
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#16294d] leading-tight tracking-tight">
            わたしたちのこと
          </h2>
        </div>

        {/* カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 sm:p-9 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative"
            >
              {/* 上端のカラーバー */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${item.bar}`} />

              {/* ラベル */}
              <p className="text-sm sm:text-base font-black text-[#2c55a8] mb-4 tracking-wide">
                {item.label}
              </p>

              {/* タイトル */}
              <h3 className="text-xl sm:text-2xl font-black text-[#16294d] mb-4 leading-snug whitespace-pre-line">
                {item.title}
              </h3>

              {/* 説明 */}
              <p className="text-base sm:text-lg font-bold text-slate-600 leading-relaxed flex-1">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
