"use client";

import { useState } from "react";

export default function ReportEditor() {
  const [content, setContent] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleAiAssist = () => {
    setIsAiGenerating(true);
    // AIアシストのモック
    setTimeout(() => {
      setContent(prev => prev + "\n\n【AI所見】\n今日のメニューからは、参加者の後衛からのスマッシュ決定率向上が課題として見受けられます。次回はトップ＆バックのローテーション練習を多めに入れると効果的です。");
      setIsAiGenerating(false);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-ag-gray-100 flex items-center justify-between bg-ag-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-sm font-bold text-ag-gray-800">新規レポート作成</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs font-semibold px-3 py-1.5 bg-white text-ag-gray-600 border border-ag-gray-200 rounded-lg hover:bg-ag-gray-50 transition-colors">下書き保存</button>
          <button className="text-xs font-bold px-4 py-1.5 bg-ag-lime-500 text-white rounded-lg hover:bg-ag-lime-600 transition-colors shadow-sm">
            公開する
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* タイトル＆日付 */}
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="タイトル（例: 土曜基礎打ちメイン）" 
            className="flex-1 px-4 py-2.5 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-900 font-bold placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-300 focus:bg-white transition-all"
          />
          <input 
            type="date" 
            className="w-40 px-4 py-2.5 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-700 bg-white focus:outline-none focus:border-ag-lime-300 transition-all"
            defaultValue="2026-03-29"
          />
        </div>

        {/* タグと種類 */}
        <div className="flex items-center gap-3">
          <select className="px-3 py-2 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-700 focus:outline-none focus:border-ag-lime-300 transition-all">
            <option>練習</option>
            <option>試合・大会</option>
            <option>役員会議</option>
            <option>プロジェクト</option>
            <option>合宿・イベント</option>
          </select>
          <input 
            type="text" 
            placeholder="タグを追加（カンマ区切り）" 
            className="flex-1 px-4 py-2 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-700 placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-300 transition-all"
          />
        </div>

        {/* AIサポートアクション */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-ag-lime-50 to-emerald-50 rounded-xl border border-ag-lime-200/50">
          <span className="text-sm">🤖</span>
          <p className="text-xs text-ag-gray-600 flex-1">
            本日のスコアや簡単なメモから、AIがレポートを清書します。
          </p>
          <button 
            onClick={handleAiAssist}
            disabled={isAiGenerating}
            className="px-3 py-1.5 bg-ag-lime-500 hover:bg-ag-lime-600 disabled:bg-ag-lime-300 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isAiGenerating ? "生成中..." : "AIで文章を整える"}
          </button>
        </div>

        {/* メインエディタ */}
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="練習メニュー、気づいたこと、反省点などを記述してください..." 
          className="w-full flex-1 min-h-[200px] p-4 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-800 placeholder:text-ag-gray-400 resize-none focus:outline-none focus:border-ag-lime-300 focus:bg-white transition-all leading-relaxed"
        />
        
        {/* ボトムバー */}
        <div className="flex items-center gap-3 text-ag-gray-400">
          <button className="p-2 hover:bg-ag-gray-100 rounded-lg transition-colors" title="画像を添付">🖼️</button>
          <button className="p-2 hover:bg-ag-gray-100 rounded-lg transition-colors" title="動画リンクを添付">🎥</button>
          <button className="p-2 hover:bg-ag-gray-100 rounded-lg transition-colors" title="スコアボードを表形式で挿入">📊</button>
        </div>
      </div>
    </div>
  );
}
