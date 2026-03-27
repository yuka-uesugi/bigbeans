"use client";

interface Report {
  id: string;
  date: string;
  title: string;
  type: "練習" | "試合" | "合宿";
  author: string;
  summary: string;
  tags: string[];
}

const mockReports: Report[] = [
  {
    id: "1",
    date: "2026/3/25 (水)",
    title: "基礎打ち＆ダブルスゲーム練習",
    type: "練習",
    author: "管理者",
    summary: "クリアの飛距離を出すための体重移動を重点的に確認。後半のゲーム練習では、サーブレシーブからの3球目攻撃のミスが目立ったため、次回はレシーブ強化のメニューを取り入れる。",
    tags: ["クリア", "ダブルス", "レシーブ課題"],
  },
  {
    id: "2",
    date: "2026/3/21 (土)",
    title: "春季区民大会",
    type: "試合",
    author: "田中太郎",
    summary: "男子ダブルスはベスト8、女子ダブルスは初戦敗退。全体的にラリーのペース配分に課題。相手のスピードに付き合いすぎてスタミナを消耗するケースが多かった。動画アルバムに決勝戦の様子をアップしました。",
    tags: ["大会", "ベスト8", "スタミナ配分"],
  },
  {
    id: "3",
    date: "2026/3/18 (水)",
    title: "フットワーク強化・シャトル置き",
    type: "練習",
    author: "佐藤花子",
    summary: "コーチ指導日。リアクションステップのタイミングと、前衛でのプッシュのラケットの出し方について教わりました。素振りの動画を各自確認しておくこと。",
    tags: ["コーチ指導", "前衛", "ステップ"],
  },
];

const typeColors = {
  練習: "bg-ag-lime-100 text-ag-lime-700",
  試合: "bg-blue-100 text-blue-700",
  合宿: "bg-purple-100 text-purple-700",
};

export default function ReportList() {
  return (
    <div className="space-y-4">
      {mockReports.map((report) => (
        <div 
          key={report.id} 
          className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded ${typeColors[report.type]}`}>
                {report.type}
              </span>
              <span className="text-xs font-semibold text-ag-gray-400">{report.date}</span>
            </div>
            <span className="text-xs text-ag-gray-400 group-hover:text-ag-lime-600 transition-colors">
              詳細を見る →
            </span>
          </div>
          
          <h3 className="text-base font-bold text-ag-gray-900 mb-2 group-hover:text-ag-lime-600 transition-colors">
            {report.title}
          </h3>
          
          <p className="text-sm text-ag-gray-600 leading-relaxed mb-4 line-clamp-2">
            {report.summary}
          </p>

          <div className="flex items-center justify-between mt-4">
            <div className="flex flex-wrap gap-1.5">
              {report.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-ag-gray-100 text-ag-gray-500 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-ag-gray-400">
              <div className="w-5 h-5 rounded-full bg-ag-gray-200 flex items-center justify-center text-white text-[10px] font-bold">
                {report.author[0]}
              </div>
              {report.author}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
