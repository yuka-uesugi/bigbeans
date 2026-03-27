"use client";

import { useState } from "react";

interface ExternalLink {
  url: string;
  label: string;
}

interface SurveyOption {
  id: string;
  text: string;
  votes: number;
  imageUrl?: string; // 選択肢ごとの画像（ユニフォーム案などに）
  externalLink?: string; // 選択肢ごとのURL（お店の食べログなどに）
}

interface Survey {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: "active" | "closed";
  options: SurveyOption[];
  totalVotes: number;
  userVotedId: string | null;
  bannerImage?: string; // アンケート全体に対する参考画像
  referenceLink?: ExternalLink; // アンケート全体に対する参考リンク
}

const mockSurveys: Survey[] = [
  {
    id: "1",
    title: "夏合宿（8月）の日程調整",
    description: "今年の夏合宿の候補日です。参加希望の多い日程で宿を押さえにいきます。第1希望に投票してください。",
    deadline: "2026/04/15 23:59",
    status: "active",
    totalVotes: 18,
    userVotedId: null,
    referenceLink: {
      url: "#",
      label: "候補の合宿所（楽天トラベル）",
    },
    options: [
      { id: "o1", text: "8/1 (土) - 8/2 (日)", votes: 10 },
      { id: "o2", text: "8/8 (土) - 8/9 (日)", votes: 5 },
      { id: "o3", text: "8/22 (土) - 8/23 (日)", votes: 2 },
      { id: "o4", text: "今年は参加できない", votes: 1 },
    ],
  },
  {
    id: "2",
    title: "新しいチームTシャツのカラー案",
    description: "来期のチームTシャツのカラーを多数決で決定します。添付の画像を参考に、好きなカラーを選んでください。",
    deadline: "2026/03/30 12:00",
    status: "active",
    totalVotes: 25,
    userVotedId: "o2",
    options: [
      { 
        id: "o1", 
        text: "ネイビー 🔵", 
        votes: 12,
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200" 
      },
      { 
        id: "o2", 
        text: "チャコールグレー ⚫", 
        votes: 8,
        imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=200" 
      },
      { 
        id: "o3", 
        text: "ホワイト（ロゴのみ色） ⚪", 
        votes: 5,
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200&sat=-100" 
      },
    ],
  },
  {
    id: "3",
    title: "【終了】春の親睦会（飲み会）の場所",
    description: "練習後の親睦会の場所アンケートです。複数のお店をピックアップしました。",
    deadline: "2026/02/20",
    status: "closed",
    totalVotes: 20,
    userVotedId: "o1",
    options: [
      { id: "o1", text: "居酒屋（駅前チェーン）", votes: 12, externalLink: "#" },
      { id: "o2", text: "焼肉", votes: 6, externalLink: "#" },
      { id: "o3", text: "イタリアン", votes: 2, externalLink: "#" },
    ],
  },
];

export default function SurveyList() {
  const [surveys, setSurveys] = useState(mockSurveys);

  const handleVote = (surveyId: string, optionId: string) => {
    setSurveys(surveys.map(survey => {
      if (survey.id !== surveyId || survey.status === "closed" || survey.userVotedId !== null) return survey;
      
      const updatedOptions = survey.options.map(opt => 
        opt.id === optionId ? { ...opt, text: opt.text, votes: opt.votes + 1 } : opt
      );

      return {
        ...survey,
        totalVotes: survey.totalVotes + 1,
        userVotedId: optionId,
        options: updatedOptions,
      };
    }));
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    // 投票ボタンのクリックイベントを打ち消してリンクを開かせる
    e.stopPropagation();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {surveys.map(survey => (
        <div 
          key={survey.id} 
          className={`flex flex-col bg-white rounded-2xl border ${survey.status === 'closed' ? 'border-ag-gray-200/40 opacity-70' : 'border-ag-gray-200/60 transition-shadow hover:shadow-lg'} overflow-hidden h-full`}
        >
          {/* アンケートのヘッダー画像（ある場合） */}
          {survey.bannerImage && (
            <div className="h-32 w-full bg-ag-gray-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={survey.bannerImage} alt="Survey Banner" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}

          {/* ヘッダーエリア */}
          <div className="px-5 py-4 border-b border-ag-gray-100 flex items-start justify-between bg-ag-gray-50/50">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${survey.status === 'active' ? 'bg-ag-lime-100 text-ag-lime-700' : 'bg-ag-gray-200 text-ag-gray-600'}`}>
                  {survey.status === 'active' ? '受付中' : '終了'}
                </span>
                <span className="text-[10px] font-semibold text-ag-gray-400">
                  締切: {survey.deadline}
                </span>
              </div>
              <h3 className="text-base font-bold text-ag-gray-900 leading-tight">
                {survey.title}
              </h3>
            </div>
          </div>

          {/* 説明文・リンク */}
          <div className="p-5 flex-1 flex flex-col">
            <p className="text-xs text-ag-gray-600 mb-3 leading-relaxed">
              {survey.description}
            </p>
            
            {/* 参考リンク */}
            {survey.referenceLink && (
              <a 
                href={survey.referenceLink.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-bold text-ag-lime-600 hover:text-ag-lime-700 hover:underline mb-4 bg-ag-lime-50 px-3 py-1.5 rounded-lg self-start"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {survey.referenceLink.label}
              </a>
            )}

            {/* 選択肢リスト */}
            <div className="space-y-3 flex-1 flex flex-col justify-end mt-2">
              {survey.options.map(option => {
                const percentage = survey.totalVotes === 0 ? 0 : Math.round((option.votes / survey.totalVotes) * 100);
                const isVoted = survey.userVotedId === option.id;
                
                return (
                  <button
                    key={option.id}
                    disabled={survey.status === "closed" || survey.userVotedId !== null}
                    onClick={() => handleVote(survey.id, option.id)}
                    className={`relative w-full rounded-xl overflow-hidden transition-all text-left flex flex-col group
                      ${survey.status === 'closed' || survey.userVotedId !== null ? 'cursor-default' : 'hover:scale-[1.02] cursor-pointer'}
                      ${isVoted ? 'ring-2 ring-ag-lime-400' : 'border border-ag-gray-200/80'}
                    `}
                  >
                    {/* 背景色（結果表示） */}
                    <div 
                      className={`absolute top-0 left-0 bottom-0 transition-all duration-700 ease-in-out ${isVoted ? 'bg-ag-lime-100/60' : 'bg-ag-gray-50'}`}
                      style={{ width: `${survey.status === 'closed' || survey.userVotedId ? percentage : 0}%` }}
                    />
                    
                    {/* 選択肢に画像がある場合、上に表示（ユニフォーム等） */}
                    {option.imageUrl && (
                      <div className="w-full h-16 bg-ag-gray-100 flex-shrink-0 relative z-10 border-b border-ag-gray-200/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={option.imageUrl} alt={option.text} className="w-full h-full object-cover mix-blend-multiply" loading="lazy" />
                      </div>
                    )}
                    
                    {/* コンテンツ（テキストと票数） */}
                    <div className="relative z-10 w-full px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${isVoted ? 'border-ag-lime-500' : 'border-ag-gray-300'}
                          ${survey.status === 'active' && !survey.userVotedId && 'group-hover:border-ag-lime-400'}
                        `}>
                          {isVoted && <div className="w-2 h-2 rounded-full bg-ag-lime-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${isVoted ? 'text-ag-lime-800' : 'text-ag-gray-700'}`}>
                            {option.text}
                          </span>
                          {/* お店のリンクなどの場合に表示 */}
                          {option.externalLink && (
                            <a 
                              href={option.externalLink} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={handleLinkClick}
                              className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 mt-0.5 pointer-events-auto w-max"
                            >
                              詳細ページを見る
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {/* 結果のパーセンテージ */}
                      {(survey.userVotedId !== null || survey.status === "closed") && (
                        <span className="text-xs font-bold text-ag-gray-500 whitespace-nowrap ml-2">
                          {percentage}% <span className="text-[10px] text-ag-gray-400 font-normal">({option.votes}票)</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-ag-gray-100 flex items-center justify-between text-[11px] font-bold text-ag-gray-400">
              <span>総投票数: {survey.totalVotes}</span>
              {survey.userVotedId && <span className="text-ag-lime-600">✅ 投票ありがとうございました</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
