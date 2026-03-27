"use client";

import FeatureCard from "@/components/ui/FeatureCard";

const features = [
  {
    icon: "📅",
    title: "スマート出欠・カレンダー",
    description:
      "Googleカレンダーと双方向同期。練習・試合の出欠を4択でサクッと回答。ビジター向けの閲覧ページも自動生成。",
  },
  {
    icon: "💰",
    title: "AI家計簿・会計",
    description:
      "チャットで「コート代3000円」と入力するだけ。AIが自動で仕訳・記帳。レシートOCRにも対応。",
  },
  {
    icon: "🏸",
    title: "シャトル・備品在庫",
    description:
      "「シャトル3本使用」の一言で在庫を自動更新。在庫が少なくなると管理者にアラートを自動通知。",
  },
  {
    icon: "📝",
    title: "練習レポート",
    description:
      "箇条書きメモをAIがブログ風に清書。動画埋め込みや過去データからの苦手分析にも対応。",
  },
  {
    icon: "📸",
    title: "共有アルバム",
    description:
      "日付・イベント別にフォルダ管理。メンバーだけがアップロード・閲覧できる安全なギャラリー。",
  },
  {
    icon: "📊",
    title: "アンケート・日程調整",
    description:
      "簡単なアンケート作成と候補日からの日程調整。面倒なやり取りをなくしてスマートに決定。",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 px-6 bg-ag-gray-50" id="features">
      <div className="max-w-6xl mx-auto">
        {/* セクションヘッダー */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-ag-lime-100/60 border border-ag-lime-200/30">
            <span className="text-xs font-semibold text-ag-lime-600 tracking-wider uppercase">
              主な機能
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-ag-gray-900 mb-4">
            チーム運営の
            <span className="text-ag-lime-500">すべて</span>を、
            <br />
            ひとつのアプリで。
          </h2>
          <p className="text-ag-gray-400 max-w-xl mx-auto">
            面倒な管理業務はAIに任せて、あなたはプレーに集中しましょう。
          </p>
        </div>

        {/* 機能カードグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
