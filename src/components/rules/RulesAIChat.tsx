"use client";

import { useState } from "react";

export default function RulesAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "こんにちは！チーム規約・当番・車代について何でも聞いてください。" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    // ユーザーの入力を追加
    const userMsg = { role: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // AIの返答をモック（本来はここでGemini/OpenAI等のAPIを呼び出します）
    setTimeout(() => {
      let aiText = "申し訳ありません、その質問に対する答えは規約に見つかりませんでした。";
      
      const q = userMsg.text;
      if (q.includes("車代") || q.includes("青葉") || q.includes("交通費") || q.includes("いくら")) {
        aiText = "青葉SC・中川西・緑SC・都筑SCなどへの車代（交通費）は【エリアA：区内（10キロ圏）】に該当するため、一人あたり 200円 になります。距離によっては300円〜となります。詳細は「車代・乗り合わせ」タブをご確認ください！";
      } else if (q.includes("コーチ") || q.includes("迎え") || q.includes("乗り合わせ") || q.includes("誰")) {
        aiText = "コーチの送迎（車出し）は体育館によって異なります。\n都筑SC・北山田の場合は上杉さん、中川西・青葉SCの場合は五十嵐さん、藤が丘周辺は伊藤さんがメインで担当します。詳しくは「車代・乗り合わせ」タブをご確認ください！";
      } else if (q.includes("当番") || q.includes("今月")) {
        aiText = "2月・3月の練習当番チームは「山本、伊藤、播川、石川、戸越」の皆さんです。";
      } else if (q.includes("規約") || q.includes("ルール") || q.includes("遅刻")) {
        aiText = "当チームの規約については、左のタブ「チーム基本規約」をご確認ください。遅刻や出欠回答の締切などのルールが記載されています。";
      }

      setMessages(prev => [...prev, { role: "ai", text: aiText }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <>
      {/* フローティングボタン */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 w-14 h-14 bg-gradient-to-r from-ag-lime-500 to-emerald-500 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer z-50 animate-bounce"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* チャットウィンドウ */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-ag-gray-200/60 flex flex-col z-50 overflow-hidden animate-scale-in flex-shrink-0" style={{ height: "480px", maxHeight: "80vh" }}>
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-ag-lime-500 to-emerald-500 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">規約サポートアシスタント</h3>
                <p className="text-[10px] text-white/80">ルール・車代・当番を質問できます</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-white/70 transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-ag-gray-50/50 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-tr from-emerald-500 to-ag-lime-500 text-white rounded-tr-sm shadow-sm' 
                    : 'bg-white border border-ag-gray-200 text-ag-gray-700 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white border border-ag-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-ag-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-ag-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-ag-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* 入力エリア */}
          <div className="p-3 bg-white border-t border-ag-gray-100 flex items-center gap-2">
            <input 
              type="text" 
              placeholder="(例) 青葉SCまでの車代は？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // IME変換中のエンターは無視する
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleSend();
                }
              }}
              className="flex-1 bg-ag-gray-50 border border-transparent focus:border-ag-lime-300 focus:bg-white focus:ring-2 focus:ring-ag-lime-100 rounded-xl px-4 py-2 text-sm text-ag-gray-700 outline-none transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-ag-lime-50 text-ag-lime-600 hover:bg-ag-lime-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-5 h-5 -ml-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: "rotate(45deg)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
