"use client";

import { useState } from "react";

export default function VisitorJoinSection() {
  const [form, setForm] = useState({
    name: "", furigana: "", birthdate: "", contact: "",
    invitedBy: "", rank: "B", ageGroup: "30代", teamName: "",
    targetMemberType: "light" as "regular" | "light", motivation: "",
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
          <p className="text-sm text-ag-gray-500 max-w-md mx-auto leading-relaxed">
            まずはビジターとして練習にご参加いただき、チームの雰囲気を知っていただいた後の申請をおすすめします！
          </p>
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

            <div className="p-5 bg-sky-50 rounded-2xl border border-sky-100">
              <label className="text-xs font-black text-sky-700 uppercase block mb-3">希望される会員種別</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "regular", label: "通常会員", desc: "月に3〜4回参加します" },
                  { id: "light", label: "ライト会員", desc: "月に2回程度参加します" }
                ].map(opt => (
                  <button
                    key={opt.id} type="button"
                    onClick={() => setForm({...form, targetMemberType: opt.id as "regular" | "light"})}
                    className={`p-4 text-left rounded-xl transition-all border-2 
                      ${form.targetMemberType === opt.id 
                        ? "bg-white border-sky-400 shadow-md" 
                        : "bg-white/50 border-transparent hover:bg-white"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center 
                        ${form.targetMemberType === opt.id ? "border-sky-500 bg-sky-500" : "border-gray-300 bg-white"}`}>
                        {form.targetMemberType === opt.id && <div className="w-1.5 h-1.5 bg-white rounded-full"/>}
                      </div>
                      <span className="font-black text-sky-900">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-sky-700/70 ml-6 font-bold">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {form.targetMemberType === "light" && (
                <p className="text-[10px] text-sky-600 mt-3 flex items-start gap-1">
                  <span className="text-xs">💡</span>
                  ライト会員のお申し込みは、通常会員の半数以上の承認で正式登録となります。結果はこちらの連絡先にお知らせします。
                </p>
              )}
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
