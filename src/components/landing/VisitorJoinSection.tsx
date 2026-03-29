"use client";

import { useState } from "react";

export default function VisitorJoinSection() {
  const [form, setForm] = useState({
    name: "", furigana: "", birthdate: "", contact: "",
    invitedBy: "", rank: "B", ageGroup: "30代", teamName: "",
    targetMemberType: "regular" as "regular" | "light", motivation: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) return;
    setSubmitted(true);
  };

  return (
    <section className="py-24 px-6 bg-white border-t border-ag-gray-100" id="join-form">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <span className="inline-block text-xl mb-3">📝</span>
          <h2 className="text-3xl font-black text-ag-gray-900 mb-2">チームへのご入会申請</h2>
          <p className="text-base font-bold text-ag-gray-600 max-w-md mx-auto leading-relaxed mb-8">
            まずはビジターとして練習にご参加いただき、チームの雰囲気を知っていただいた後の申請をおすすめします！
          </p>

          {/* 新規加入特典バナー */}
          <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 p-1.5 rounded-3xl shadow-xl transform hover:scale-[1.02] transition-transform max-w-xl mx-auto mb-10">
            <div className="bg-white/95 backdrop-blur-sm px-6 py-6 rounded-2xl border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300 opacity-20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-400 opacity-20 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-sm font-black text-white bg-red-600 px-4 py-1.5 rounded-full tracking-widest shadow-md mb-4 animate-bounce">
                  ✨ 今なら入会特典あり ✨
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-ag-gray-900 leading-snug mb-3">
                  ささやかながら、<br className="sm:hidden"/>
                  <span className="text-red-600">オフィシャルゼッケン</span>を<br/>
                  チームからプレゼントします！🎁
                </h3>
                <p className="text-lg font-black text-ag-gray-600 mt-2 bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-200">
                  新メンバー大歓迎！一緒にバドミントンを楽しみましょう！
                </p>
              </div>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="bg-ag-lime-50 rounded-3xl p-12 text-center border border-ag-lime-100 animate-scale-in">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-black text-ag-lime-800 mb-3">申請を送信しました！</h3>
            <p className="text-ag-lime-700/80 text-sm max-w-md mx-auto leading-relaxed">
              役員にて確認後、ご連絡先にお知らせいたします。<br />
              ここに入力いただいた内容は承認されると自動でプロフィールに反映されますので、二度手間はありません！
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-ag-gray-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1">お名前 <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                  placeholder="例: 上杉由華"
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300 transition-shadow" />
              </div>
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1">ふりがな</label>
                <input type="text" value={form.furigana} onChange={e => setForm({...form, furigana: e.target.value})}
                  placeholder="例: うえすぎ ゆか"
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300 transition-shadow" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1">ランク目安</label>
                <select value={form.rank} onChange={e => setForm({...form, rank: e.target.value})}
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-shadow">
                  <option value="A">A ランク（上級）</option>
                  <option value="B">B ランク（中級）</option>
                  <option value="C">C ランク（初級）</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1">年代</label>
                <select value={form.ageGroup} onChange={e => setForm({...form, ageGroup: e.target.value})}
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-shadow">
                  {["10代","20代","30代","40代","50代","60代以上"].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1">
                ご連絡先（LINE ID または メールアドレス） <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} required
                placeholder="役員からの連絡に使用します"
                className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300 transition-shadow" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1">お誘いしたメンバー</label>
                <input type="text" value={form.invitedBy} onChange={e => setForm({...form, invitedBy: e.target.value})}
                  placeholder="例: 石川さん"
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300 transition-shadow" />
              </div>
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1">現在所属のチーム</label>
                <input type="text" value={form.teamName} onChange={e => setForm({...form, teamName: e.target.value})}
                  placeholder="例: なし / 〇〇クラブ"
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300 transition-shadow" />
              </div>
            </div>

            <div className="p-5 bg-ag-gray-50 rounded-2xl border border-ag-gray-200">
              <label className="text-xs font-black text-ag-gray-700 uppercase block mb-3">ご希望の会員種別</label>
              
              <div className="space-y-3">
                {/* 通常会員 (推奨) */}
                <button
                  type="button"
                  onClick={() => setForm({...form, targetMemberType: "regular"})}
                  className={`w-full text-left p-4 rounded-xl transition-all border-2 
                    ${form.targetMemberType === "regular" 
                      ? "bg-white border-ag-lime-500 shadow-md ring-4 ring-ag-lime-50" 
                      : "bg-white border-ag-gray-200 hover:border-ag-lime-300"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                        ${form.targetMemberType === "regular" ? "border-ag-lime-500 bg-ag-lime-500" : "border-gray-300 bg-white"}`}>
                        {form.targetMemberType === "regular" && <div className="w-2 h-2 bg-white rounded-full"/>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-black text-base ${form.targetMemberType === "regular" ? "text-ag-lime-700" : "text-ag-gray-700"}`}>
                            通常会員（基本）
                          </span>
                          <span className="px-2 py-0.5 bg-ag-lime-100 text-ag-lime-700 text-[9px] font-black rounded-full">おすすめ</span>
                        </div>
                        <p className="text-xs text-ag-gray-500 font-bold leading-relaxed">
                          チームの主力メンバーです。定期的に練習に参加し、入会半年後から当番などを分担します。<br/>
                          <span className="text-ag-lime-700 mt-1 inline-block">💡 試合のエントリーや、定員のある練習への参加は「通常会員」が最優先となります。</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </button>

                {/* ライト会員 (特例) */}
                <button
                  type="button"
                  onClick={() => setForm({...form, targetMemberType: "light"})}
                  className={`w-full text-left p-4 rounded-xl transition-all border-2 
                    ${form.targetMemberType === "light" 
                      ? "bg-white border-sky-400 shadow-md" 
                      : "bg-white/60 border-ag-gray-200 hover:border-sky-200"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                      ${form.targetMemberType === "light" ? "border-sky-500 bg-sky-500" : "border-gray-300 bg-white"}`}>
                      {form.targetMemberType === "light" && <div className="w-2 h-2 bg-white rounded-full"/>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-black text-base ${form.targetMemberType === "light" ? "text-sky-800" : "text-ag-gray-700"}`}>
                          ライト会員（特例・承認制）
                        </span>
                      </div>
                      <p className="text-[10px] text-ag-gray-500 font-bold leading-relaxed mb-2">
                        育児・介護・遠方などの理由で参加頻度が限られる方向けの特例です（月2回程度）。※ライト会員でも半年後からできる範囲で当番をお願いしています。
                      </p>
                      {form.targetMemberType === "light" && (
                        <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 mt-2">
                          <p className="text-[10px] text-sky-700 font-bold flex gap-1">
                            <span className="shrink-0">⚠️</span>
                            <span>ライト会員のお申し込みは、通常会員の60%の署名承認が必要です。志望動機欄に「ライト会員を希望する具体的な理由」を必ず記載してください。</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1">志望動機などをどうぞ！</label>
              <textarea rows={4} value={form.motivation} onChange={e => setForm({...form, motivation: e.target.value})}
                placeholder="バドミントン歴やプレースタイル、チームに期待することなど自由に書いてください"
                className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-ag-lime-300 transition-shadow leading-relaxed" />
            </div>

            <button
              type="submit"
              disabled={!form.name.trim() || !form.contact.trim()}
              className="w-full py-4 bg-ag-lime-500 text-white font-black text-lg rounded-xl hover:bg-ag-lime-600 shadow-lg shadow-ag-lime-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              入力内容で申請する
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
