"use client";

import { useState } from "react";

// =============================
// 型定義
// =============================
type AppType = "join" | "renewal";
type RenewalType = "continue_regular" | "continue_light" | "regular_to_light" | "light_to_regular" | "withdraw";
type AppStatus = "pending" | "approved" | "rejected" | "voting";

interface Signature {
  memberName: string;
  signedAt: string;
}

interface Application {
  id: number;
  type: AppType;
  applicantName: string;
  submittedAt: string;
  status: AppStatus;
  renewalType?: RenewalType;
  reason?: string;
  signatures: Signature[];
  requiredSignatures: number; // 承認に必要な署名数（通常会員15名の60% = 9名）
  // 入会申請用
  rank?: string;
  ageGroup?: string;
  teamName?: string;
  invitedBy?: string;
  contact?: string;
  targetMemberType?: "regular" | "light";
  motivation?: string;
}

// =============================
// サンプルデータ
// =============================
const SAMPLE_APPLICATIONS: Application[] = [
  {
    id: 1,
    type: "join",
    applicantName: "杉村 麻衣",
    submittedAt: "2026-04-08",
    status: "pending",
    rank: "B",
    ageGroup: "30代",
    teamName: "石川チーム",
    invitedBy: "石川",
    contact: "sugimura@example.com",
    targetMemberType: "light",
    motivation: "バドミントンが好きで、定期的に練習できる場を探していました。石川さんに声をかけていただきました。",
    signatures: [],
    requiredSignatures: 0,
  },
  {
    id: 2,
    type: "renewal",
    applicantName: "高橋 三郎",
    submittedAt: "2026-10-01",
    status: "voting",
    renewalType: "regular_to_light",
    reason: "来年度より育児のため練習に参加できる回数が減ります。ライト会員として継続したいと思います。",
    signatures: [
      { memberName: "上杉", signedAt: "2026-10-02" },
      { memberName: "田中", signedAt: "2026-10-02" },
      { memberName: "佐藤", signedAt: "2026-10-03" },
      { memberName: "鈴木", signedAt: "2026-10-03" },
      { memberName: "山田", signedAt: "2026-10-04" },
    ],
    requiredSignatures: 9,
  },
  {
    id: 3,
    type: "renewal",
    applicantName: "渡辺 四郎",
    submittedAt: "2026-10-01",
    status: "approved",
    renewalType: "continue_light",
    reason: "引き続きライト会員として参加させていただきたいです。仕事の都合上、月2回程度の参加になります。",
    signatures: [
      { memberName: "上杉", signedAt: "2026-10-02" },
      { memberName: "田中", signedAt: "2026-10-02" },
      { memberName: "佐藤", signedAt: "2026-10-02" },
      { memberName: "鈴木", signedAt: "2026-10-03" },
      { memberName: "山田", signedAt: "2026-10-03" },
      { memberName: "渡辺", signedAt: "2026-10-03" },
      { memberName: "伊藤", signedAt: "2026-10-04" },
      { memberName: "中村", signedAt: "2026-10-04" },
      { memberName: "小林", signedAt: "2026-10-05" },
    ],
    requiredSignatures: 9,
  },
];

const RENEWAL_LABELS: Record<RenewalType, { label: string; color: string; needsVote: boolean }> = {
  continue_regular: { label: "通常会員として継続", color: "text-ag-lime-700", needsVote: false },
  continue_light:   { label: "ライト会員として継続", color: "text-sky-700", needsVote: true },
  regular_to_light: { label: "通常→ライト会員へ変更", color: "text-amber-700", needsVote: true },
  light_to_regular: { label: "ライト→通常会員へ昇格", color: "text-purple-700", needsVote: false },
  withdraw:         { label: "退会", color: "text-red-700", needsVote: false },
};

const STATUS_LABELS: Record<AppStatus, { label: string; bg: string; color: string }> = {
  pending:  { label: "受付済み", bg: "bg-ag-gray-100", color: "text-ag-gray-600" },
  voting:   { label: "署名受付中", bg: "bg-amber-100", color: "text-amber-700" },
  approved: { label: "承認済み", bg: "bg-ag-lime-100", color: "text-ag-lime-700" },
  rejected: { label: "否決", bg: "bg-red-100", color: "text-red-600" },
};

// =============================
// メインコンポーネント
// =============================
export default function ApplicationsPage() {
  const [applications, setApplications] = useState(SAMPLE_APPLICATIONS);
  const [activeTab, setActiveTab] = useState<"all" | "join" | "renewal">("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showRenewalForm, setShowRenewalForm] = useState(false);

  // 署名実行
  const handleSign = (appId: number) => {
    if (!signatureName.trim()) return;
    setApplications(prev => prev.map(app => {
      if (app.id !== appId) return app;
      const already = app.signatures.some(s => s.memberName === signatureName);
      if (already) return app;
      const newSigs = [...app.signatures, { memberName: signatureName, signedAt: new Date().toLocaleDateString("ja-JP") }];
      const approved = newSigs.length >= app.requiredSignatures;
      return { ...app, signatures: newSigs, status: approved ? "approved" : "voting" };
    }));
    setSignatureName("");
    // selectedAppも更新
    setSelectedApp(prev => {
      if (!prev || prev.id !== appId) return prev;
      const already = prev.signatures.some(s => s.memberName === signatureName);
      if (already) return prev;
      const newSigs = [...prev.signatures, { memberName: signatureName, signedAt: new Date().toLocaleDateString("ja-JP") }];
      const approved = newSigs.length >= prev.requiredSignatures;
      return { ...prev, signatures: newSigs, status: approved ? "approved" : "voting" };
    });
  };

  const filtered = applications.filter(a => activeTab === "all" || a.type === (activeTab === "join" ? "join" : "renewal"));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ag-gray-900 flex items-center gap-2">
            申請管理
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">入会申請・年度更新申請の一覧と承認</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRenewalForm(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm">
            年度更新申請
          </button>
          <button onClick={() => setShowJoinForm(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-sm">
            入会申請
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-ag-gray-100 p-1 rounded-2xl w-fit">
        {([["all","すべて"],["join","入会申請"],["renewal","年度更新"]] as const).map(([val, label]) => (
          <button key={val} onClick={() => setActiveTab(val)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === val ? "bg-white text-ag-gray-800 shadow" : "text-ag-gray-400 hover:text-ag-gray-600"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 申請リスト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(app => {
          const status = STATUS_LABELS[app.status];
          const progress = app.requiredSignatures > 0
            ? Math.min((app.signatures.length / app.requiredSignatures) * 100, 100)
            : 0;
          return (
            <div key={app.id}
              onClick={() => setSelectedApp(app)}
              className="bg-white rounded-3xl border border-ag-gray-100 shadow-md p-5 hover:border-ag-lime-200 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${status.bg} ${status.color} inline-block mb-2`}>
                    {status.label}
                  </span>
                  <h3 className="text-base font-black text-ag-gray-800">{app.applicantName}</h3>
                  <p className="text-xs text-ag-gray-400 mt-0.5">
                    {app.type === "join" ? "入会申請" : "年度更新申請"} · {app.submittedAt}
                  </p>
                </div>
                <span className="text-ag-gray-200 text-xl">›</span>
              </div>

              {app.renewalType && (
                <div className={`text-xs font-bold ${RENEWAL_LABELS[app.renewalType].color} mb-2`}>
                  {RENEWAL_LABELS[app.renewalType].label}
                </div>
              )}
              {app.type === "join" && (
                <div className="text-xs text-ag-gray-500 mb-2">
                  ランク{app.rank} / {app.ageGroup} / 紹介: {app.invitedBy}
                </div>
              )}

              {/* 署名進捗バー（承認が必要なケース） */}
              {app.requiredSignatures > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-ag-gray-400 mb-1">
                    <span>署名進捗</span>
                    <span className="font-bold">{app.signatures.length} / {app.requiredSignatures} 名</span>
                  </div>
                  <div className="h-2 bg-ag-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-ag-lime-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 詳細モーダル */}
      {selectedApp && (
        <ApplicationModal
          app={selectedApp}
          signatureName={signatureName}
          onNameChange={setSignatureName}
          onSign={() => handleSign(selectedApp.id)}
          onClose={() => setSelectedApp(null)}
        />
      )}

      {/* 入会申請フォームモーダル */}
      {showJoinForm && <JoinApplicationModal onClose={() => setShowJoinForm(false)} />}

      {/* 年度更新申請フォームモーダル */}
      {showRenewalForm && <RenewalApplicationModal onClose={() => setShowRenewalForm(false)} />}
    </div>
  );
}

// =============================
// 申請詳細モーダル
// =============================
function ApplicationModal({
  app, signatureName, onNameChange, onSign, onClose
}: {
  app: Application;
  signatureName: string;
  onNameChange: (v: string) => void;
  onSign: () => void;
  onClose: () => void;
}) {
  const status = STATUS_LABELS[app.status];
  const renewalCfg = app.renewalType ? RENEWAL_LABELS[app.renewalType] : null;
  const progress = app.requiredSignatures > 0 ? Math.min((app.signatures.length / app.requiredSignatures) * 100, 100) : 0;
  const alreadySigned = app.signatures.some(s => s.memberName === signatureName);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 px-6 py-5 bg-ag-gray-900 text-white rounded-t-3xl sm:rounded-t-3xl flex items-center justify-between">
          <div>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            <h2 className="text-lg font-black mt-1">{app.applicantName}</h2>
            <p className="text-xs text-white/60">{app.type === "join" ? "入会申請" : "年度更新申請"} · {app.submittedAt}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* 申請種別 */}
          {renewalCfg && (
            <div className="p-4 bg-ag-gray-50 rounded-2xl border border-ag-gray-100">
              <p className="text-[9px] font-extrabold text-ag-gray-400 uppercase mb-1">申請種別</p>
              <p className={`text-sm font-extrabold ${renewalCfg.color}`}>{renewalCfg.label}</p>
            </div>
          )}

          {/* 入会申請の詳細 */}
          {app.type === "join" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ["ランク", app.rank],
                ["年齢層", app.ageGroup],
                ["所属チーム", app.teamName],
                ["紹介者", app.invitedBy],
                ["連絡先", app.contact],
                ["希望種別", app.targetMemberType === "regular" ? "通常会員" : "ライト会員"],
              ].map(([label, value]) => (
                <div key={label as string} className="p-3 bg-ag-gray-50 rounded-xl">
                  <p className="text-[9px] font-extrabold text-ag-gray-400 uppercase mb-1">{label}</p>
                  <p className="text-sm font-bold text-ag-gray-800">{value}</p>
                </div>
              ))}
              {app.motivation && (
                <div className="col-span-2 p-3 bg-ag-gray-50 rounded-xl">
                  <p className="text-[9px] font-extrabold text-ag-gray-400 uppercase mb-1">志望動機</p>
                  <p className="text-sm text-ag-gray-700 leading-relaxed">{app.motivation}</p>
                </div>
              )}
            </div>
          )}

          {/* 理由（更新申請） */}
          {app.reason && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[9px] font-extrabold text-amber-600 uppercase mb-2">申請理由</p>
              <p className="text-sm text-ag-gray-700 leading-relaxed italic">{app.reason}</p>
            </div>
          )}

          {/* 署名セクション（60%承認が必要なケース） */}
          {app.requiredSignatures > 0 && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-ag-gray-600 mb-2">
                  <span>署名進捗</span>
                  <span>{app.signatures.length} / {app.requiredSignatures} 名（60%以上で承認）</span>
                </div>
                <div className="h-3 bg-ag-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-ag-lime-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* 署名済みメンバー */}
              {app.signatures.length > 0 && (
                <div>
                  <p className="text-[9px] font-extrabold text-ag-gray-400 uppercase mb-2">署名済みメンバー</p>
                  <div className="flex flex-wrap gap-2">
                    {app.signatures.map(sig => (
                      <span key={sig.memberName} className="flex items-center gap-1 text-[10px] font-bold bg-ag-lime-50 text-ag-lime-700 border border-ag-lime-200 px-2.5 py-1 rounded-full">
                        SIGNED: {sig.memberName}
                        <span className="text-ag-lime-400 text-[8px]">({sig.signedAt})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 署名入力 */}
              {app.status === "voting" && (
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
                  <p className="text-xs font-extrabold text-sky-700 mb-3">
                    承認署名を行う
                  </p>
                  <p className="text-[10px] text-sky-600 mb-3 leading-relaxed">
                    署名は記録として残ります。承認の意思がある場合のみ、あなたの名前を正確に入力して署名してください。
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={signatureName}
                      onChange={e => onNameChange(e.target.value)}
                      placeholder="あなたの名前（例: 上杉）"
                      className="flex-1 bg-white border border-sky-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-300"
                    />
                    <button
                      onClick={onSign}
                      disabled={!signatureName.trim() || alreadySigned}
                      className="px-4 py-2 bg-sky-500 text-white rounded-xl text-xs font-black hover:bg-sky-600 transition-colors disabled:opacity-40"
                    >
                      {alreadySigned ? "署名済" : "署名する"}
                    </button>
                  </div>
                  {alreadySigned && (
                    <p className="text-[10px] text-amber-600 mt-2">このメンバーはすでに署名しています</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 役員用アクション（入会申請） */}
          {app.type === "join" && app.status === "pending" && (
            <div className="flex gap-3 pt-2">
              <button className="flex-1 py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">
                却下する
              </button>
              <button className="flex-[2] py-3 bg-ag-lime-500 text-white rounded-xl text-sm font-black hover:bg-ag-lime-600 shadow-lg shadow-ag-lime-500/20">
                承認する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================
// 入会申請フォーム（ビジター用）
// =============================
function JoinApplicationModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", furigana: "", birthdate: "", contact: "",
    invitedBy: "", rank: "B", ageGroup: "30代", teamName: "",
    targetMemberType: "regular" as "regular" | "light", motivation: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!form.name.trim() || !form.contact.trim()) return;
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-ag-lime-500 to-emerald-600 text-white px-6 py-5 rounded-t-3xl sm:rounded-t-3xl">
          <h2 className="text-lg font-black">入会申請フォーム</h2>
          <p className="text-xs text-white/70 mt-1">入力完了後、役員が確認・承認します</p>
        </div>
        {submitted ? (
          <div className="p-12 text-center"><div className="w-16 h-16 bg-ag-lime-500 rounded-full flex items-center justify-center text-white text-xl font-black mx-auto mb-4 shadow-lg">OK</div><p className="font-black text-ag-gray-700 text-xl">申請を送信しました</p><p className="text-xs text-ag-gray-400 mt-2">役員が確認次第ご連絡します</p></div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">お名前 *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例: 杉村 麻衣" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" /></div>
              <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">ふりがな</label>
                <input type="text" value={form.furigana} onChange={e => setForm({...form, furigana: e.target.value})} placeholder="例: すぎむら まい" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">ランク（自己申告）</label>
                <select value={form.rank} onChange={e => setForm({...form, rank: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="A">A ランク</option><option value="B">B ランク</option><option value="C">C ランク</option></select></div>
              <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">年齢層</label>
                <select value={form.ageGroup} onChange={e => setForm({...form, ageGroup: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  {["10代","20代","30代","40代","50代","60代以上"].map(a => <option key={a}>{a}</option>)}</select></div>
            </div>
            <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">連絡先（LINE/メール） *</label>
              <input type="text" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} placeholder="例: line_id または mail@example.com" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">紹介者</label>
                <input type="text" value={form.invitedBy} onChange={e => setForm({...form, invitedBy: e.target.value})} placeholder="例: 石川" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" /></div>
              <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">所属チーム</label>
                <input type="text" value={form.teamName} onChange={e => setForm({...form, teamName: e.target.value})} placeholder="例: フリー、石川チーム" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" /></div>
            </div>
            <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">希望会員種別</label>
              <div className="grid grid-cols-2 gap-2">
                {([["regular","通常会員（月4回参加）"],["light","ライト会員（月2回程度）"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setForm({...form, targetMemberType: val})}
                    className={`py-3 rounded-xl text-xs font-bold border transition-all ${form.targetMemberType === val ? "bg-ag-lime-500 text-white border-ag-lime-500 shadow" : "bg-white text-ag-gray-500 border-ag-gray-200"}`}>
                    {label}
                  </button>
                ))}</div></div>
            <div><label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">志望動機・一言</label>
              <textarea rows={3} value={form.motivation} onChange={e => setForm({...form, motivation: e.target.value})} placeholder="参加したい理由や自己紹介など、自由にどうぞ" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none leading-relaxed" /></div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-ag-gray-400 border border-ag-gray-100 rounded-xl">キャンセル</button>
              <button onClick={handleSubmit} disabled={!form.name.trim() || !form.contact.trim()}
                className="flex-[2] py-3 bg-ag-lime-500 text-white rounded-xl text-sm font-black hover:bg-ag-lime-600 shadow-lg shadow-ag-lime-500/20 disabled:opacity-40">申請する</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================
// 年度更新申請フォーム
// =============================
function RenewalApplicationModal({ onClose }: { onClose: () => void }) {
  const [renewalType, setRenewalType] = useState<RenewalType>("continue_regular");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const needsVote = RENEWAL_LABELS[renewalType].needsVote;

  const handleSubmit = () => {
    if (needsVote && !reason.trim()) return;
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-6 py-5 rounded-t-3xl sm:rounded-t-3xl">
          <h2 className="text-lg font-black">年度更新申請</h2>
          <p className="text-xs text-white/70 mt-1">来年度の会員種別を選択して申請してください</p>
        </div>
        {submitted ? (
          <div className="p-12 text-center"><div className="w-16 h-16 bg-ag-lime-500 rounded-full flex items-center justify-center text-white text-xl font-black mx-auto mb-4 shadow-lg">OK</div><p className="font-black text-ag-gray-700 text-xl">申請を送信しました</p></div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-3">来年度の希望</label>
              <div className="space-y-2">
                {(Object.entries(RENEWAL_LABELS) as [RenewalType, typeof RENEWAL_LABELS[RenewalType]][]).map(([val, cfg]) => (
                  <button key={val} onClick={() => setRenewalType(val)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${renewalType === val ? `border-2 border-ag-lime-400 bg-ag-lime-50` : "border-ag-gray-100 bg-white hover:bg-ag-gray-50"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${renewalType === val ? "border-ag-lime-500 bg-ag-lime-500" : "border-ag-gray-300"}`}>
                      {renewalType === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-extrabold ${cfg.color}`}>{cfg.label}</p>
                      {cfg.needsVote && <p className="text-[9px] text-ag-gray-400 mt-0.5">※通常会員15名の60%（9名）以上の署名承認が必要</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {needsVote && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <label className="text-[10px] font-black text-amber-700 uppercase block mb-2">申請理由 <span className="text-red-500">*</span></label>
                <p className="text-[10px] text-amber-600 mb-3 leading-relaxed">
                  ライト会員への申請・変更には通常会員による60%署名承認が必要です。参加頻度が少なくなる理由を具体的に記載してください。
                </p>
                <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="例：育児・介護のため月2回程度の参加になります。チームへの貢献は引き続き尽くしたいと思っています。"
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-300 leading-relaxed" />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-ag-gray-400 border border-ag-gray-100 rounded-xl">キャンセル</button>
              <button onClick={handleSubmit} disabled={needsVote && !reason.trim()}
                className="flex-[2] py-3 bg-sky-500 text-white rounded-xl text-sm font-black hover:bg-sky-600 shadow-lg shadow-sky-500/20 disabled:opacity-40">申請する</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
