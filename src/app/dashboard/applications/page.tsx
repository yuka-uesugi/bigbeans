"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberByEmail, getAllMembers, addMemberFromApplication } from "@/lib/members";
import {
  subscribeToApplications,
  createJoinApplication,
  createRenewalApplication,
  signApplication,
  approveApplication,
  rejectApplication,
  RENEWAL_LABELS,
  RENEWAL_NEEDS_VOTE,
  STATUS_LABELS,
  type ApplicationData,
  type AppStatus,
  type RenewalType,
} from "@/lib/applications";

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────
export default function ApplicationsPage() {
  const { user, role } = useAuth();
  const [myName, setMyName] = useState("");
  const [myUid, setMyUid] = useState("");
  const [officialCount, setOfficialCount] = useState(15);

  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "join" | "renewal" | "mine">("all");
  const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ログインユーザーの名前・uid を取得
  useEffect(() => {
    if (!user?.email) return;
    setMyUid(user.uid);
    getMemberByEmail(user.email).then((m) => {
      if (m) setMyName(m.name);
      else setMyName(user.displayName ?? "");
    });
  }, [user]);

  // 通常会員数を取得（60%計算用）
  useEffect(() => {
    getAllMembers().then((members) => {
      const count = members.filter((m) => m.membershipType !== "light").length;
      if (count > 0) setOfficialCount(count);
    });
  }, []);

  // Firestoreをリアルタイム購読
  useEffect(() => {
    const unsub = subscribeToApplications((data) => {
      setApplications(data);
      setIsLoading(false);
      // 開いているモーダルも最新化
      setSelectedApp((prev) => {
        if (!prev) return null;
        return data.find((a) => a.id === prev.id) ?? null;
      });
    });
    return () => unsub();
  }, []);

  const isAdmin = role === "admin";

  const filtered = applications.filter((a) => {
    if (activeTab === "mine") return a.applicantUid === user?.uid;
    if (activeTab === "join") return a.type === "join";
    if (activeTab === "renewal") return a.type === "renewal";
    return true;
  });

  const pendingCount = applications.filter(
    (a) => a.status === "pending" || a.status === "voting"
  ).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ag-gray-900 flex items-center gap-2">
            申請管理
            {pendingCount > 0 && (
              <span className="text-sm font-black bg-red-500 text-white rounded-full px-2.5 py-0.5 shadow-sm">
                {pendingCount}件
              </span>
            )}
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">入会申請・年度更新申請の一覧と承認</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRenewalForm(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm"
          >
            年度更新申請
          </button>
          <button
            onClick={() => setShowJoinForm(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-sm"
          >
            入会申請
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-ag-gray-100 p-1 rounded-2xl w-fit">
        {([
          ["all", "すべて"],
          ["join", "入会申請"],
          ["renewal", "年度更新"],
          ["mine", "自分の申請"],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setActiveTab(val)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === val
                ? "bg-white text-ag-gray-800 shadow"
                : "text-ag-gray-400 hover:text-ag-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 申請リスト */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ag-lime-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-ag-gray-400 font-bold">
          申請はありません
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((app) => {
            const status = STATUS_LABELS[app.status];
            const progress =
              app.requiredSignatures > 0
                ? Math.min((app.signatures.length / app.requiredSignatures) * 100, 100)
                : 0;
            const submittedDate = app.submittedAt?.toDate
              ? app.submittedAt.toDate().toLocaleDateString("ja-JP")
              : "";
            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className="bg-white rounded-3xl border border-ag-gray-100 shadow-md p-5 hover:border-ag-lime-200 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${status.bg} ${status.color} inline-block mb-2`}
                    >
                      {status.label}
                    </span>
                    <h3 className="text-base font-black text-ag-gray-800">{app.applicantName}</h3>
                    <p className="text-xs text-ag-gray-400 mt-0.5">
                      {app.type === "join" ? "入会申請" : "年度更新申請"} · {submittedDate}
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
                    ランク{app.rank} / {app.ageGroup}
                    {app.invitedBy && ` / 紹介: ${app.invitedBy}`}
                  </div>
                )}

                {app.requiredSignatures > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-ag-gray-400 mb-1">
                      <span>署名進捗</span>
                      <span className="font-bold">
                        {app.signatures.length} / {app.requiredSignatures} 名
                      </span>
                    </div>
                    <div className="h-2 bg-ag-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ag-lime-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedApp && (
        <ApplicationModal
          app={selectedApp}
          myName={myName}
          myUid={myUid}
          isAdmin={isAdmin}
          onClose={() => setSelectedApp(null)}
        />
      )}

      {showJoinForm && (
        <JoinApplicationModal onClose={() => setShowJoinForm(false)} />
      )}

      {showRenewalForm && (
        <RenewalApplicationModal
          myName={myName}
          myUid={myUid}
          myEmail={user?.email ?? ""}
          officialCount={officialCount}
          onClose={() => setShowRenewalForm(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 申請詳細モーダル
// ─────────────────────────────────────────────
function ApplicationModal({
  app, myName, myUid, isAdmin, onClose,
}: {
  app: ApplicationData;
  myName: string;
  myUid: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [isSigning, setIsSigning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const status = STATUS_LABELS[app.status];
  const renewalCfg = app.renewalType ? RENEWAL_LABELS[app.renewalType] : null;
  const progress =
    app.requiredSignatures > 0
      ? Math.min((app.signatures.length / app.requiredSignatures) * 100, 100)
      : 0;
  const alreadySigned = app.signatures.some((s) => s.memberUid === myUid);
  const submittedDate = app.submittedAt?.toDate
    ? app.submittedAt.toDate().toLocaleDateString("ja-JP")
    : "";

  const handleSign = async () => {
    if (!myName || !myUid || alreadySigned) return;
    setIsSigning(true);
    try {
      await signApplication(app.id, myName, myUid, app.signatures, app.requiredSignatures);
    } catch {
      alert("署名に失敗しました");
    } finally {
      setIsSigning(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm(`「${app.applicantName}」の申請を承認しますか？`)) return;
    setIsProcessing(true);
    try {
      await approveApplication(app.id);
      // 入会申請の場合は、承認と同時に名簿(members)へ自動追加する
      if (app.type === "join") {
        const added = await addMemberFromApplication(app);
        if (added) {
          alert(`承認しました。「${added.name}」さんを名簿に追加しました（会員番号 ${added.id}）。`);
        } else {
          alert("承認しました。※同じ連絡先のメンバーが既に名簿にあるため、名簿への自動追加は行いませんでした。");
        }
      }
    } catch {
      alert("承認に失敗しました（名簿への追加も含めて反映されていない可能性があります）");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm(`「${app.applicantName}」の申請を却下しますか？`)) return;
    setIsProcessing(true);
    try {
      await rejectApplication(app.id);
    } catch {
      alert("却下に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        {/* ヘッダー */}
        <div className="sticky top-0 px-6 py-5 bg-ag-gray-900 text-white rounded-t-3xl sm:rounded-t-3xl flex items-center justify-between z-10">
          <div>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            <h2 className="text-lg font-black mt-1">{app.applicantName}</h2>
            <p className="text-xs text-white/60">
              {app.type === "join" ? "入会申請" : "年度更新申請"} · {submittedDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 申請種別 */}
          {renewalCfg && (
            <div className="p-4 bg-ag-gray-50 rounded-2xl border border-ag-gray-100">
              <p className="text-[9px] font-extrabold text-ag-gray-400 uppercase mb-1">申請種別</p>
              <p className={`text-sm font-extrabold ${renewalCfg.color}`}>
                {renewalCfg.label}
              </p>
            </div>
          )}

          {/* 入会申請の詳細 */}
          {app.type === "join" && (
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["ランク", app.rank],
                  ["年齢層", app.ageGroup],
                  ["所属チーム", app.teamName],
                  ["紹介者", app.invitedBy],
                  ["連絡先", app.contact],
                  ["希望種別", app.targetMemberType === "regular" ? "通常会員" : "ライト会員"],
                ] as [string, string | undefined][]
              ).map(([label, value]) => (
                <div key={label} className="p-3 bg-ag-gray-50 rounded-xl">
                  <p className="text-[9px] font-extrabold text-ag-gray-400 uppercase mb-1">{label}</p>
                  <p className="text-sm font-bold text-ag-gray-800">{value || "-"}</p>
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

          {/* 申請理由 */}
          {app.reason && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[9px] font-extrabold text-amber-600 uppercase mb-2">申請理由</p>
              <p className="text-sm text-ag-gray-700 leading-relaxed italic">{app.reason}</p>
            </div>
          )}

          {/* 署名セクション */}
          {app.requiredSignatures > 0 && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-ag-gray-600 mb-2">
                  <span>署名進捗</span>
                  <span>
                    {app.signatures.length} / {app.requiredSignatures} 名（60%以上で承認）
                  </span>
                </div>
                <div className="h-3 bg-ag-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ag-lime-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {app.signatures.length > 0 && (
                <div>
                  <p className="text-[9px] font-extrabold text-ag-gray-400 uppercase mb-2">
                    署名済みメンバー
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {app.signatures.map((sig) => (
                      <span
                        key={sig.memberUid}
                        className="text-[10px] font-bold bg-ag-lime-50 text-ag-lime-700 border border-ag-lime-200 px-2.5 py-1 rounded-full"
                      >
                        ✓ {sig.memberName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 署名ボタン */}
              {app.status === "voting" && myName && (
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
                  {alreadySigned ? (
                    <p className="text-sm font-bold text-ag-lime-700 text-center">
                      ✓ あなた（{myName}）はすでに署名しています
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-extrabold text-sky-700 mb-1">承認署名</p>
                      <p className="text-[10px] text-sky-600 mb-3 leading-relaxed">
                        承認の意思がある場合は署名してください。<br />
                        署名者: <strong>{myName}</strong> として記録されます。
                      </p>
                      <button
                        onClick={handleSign}
                        disabled={isSigning}
                        className="w-full py-3 bg-sky-500 text-white rounded-xl text-sm font-black hover:bg-sky-600 transition-colors disabled:opacity-50"
                      >
                        {isSigning ? "署名中..." : `${myName} として署名する`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 管理者アクション（入会申請） */}
          {isAdmin && app.type === "join" && app.status === "pending" && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                却下する
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-[2] py-3 bg-ag-lime-500 text-white rounded-xl text-sm font-black hover:bg-ag-lime-600 shadow-lg shadow-ag-lime-500/20 disabled:opacity-50"
              >
                承認する
              </button>
            </div>
          )}

          {/* 管理者アクション（投票中の強制決定） */}
          {isAdmin && app.status === "voting" && (
            <div className="flex gap-3 pt-2 border-t border-ag-gray-100">
              <p className="text-[10px] text-ag-gray-400 mb-2 w-full">管理者による強制決定:</p>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-red-50 text-red-500 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                否決
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-ag-lime-50 text-ag-lime-700 border border-ag-lime-200 rounded-xl text-xs font-bold hover:bg-ag-lime-100 transition-colors disabled:opacity-50"
              >
                強制承認
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 入会申請フォーム
// ─────────────────────────────────────────────
function JoinApplicationModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    applicantName: "", furigana: "", birthdate: "", contact: "",
    invitedBy: "", rank: "B", ageGroup: "30代", teamName: "",
    targetMemberType: "regular" as "regular" | "light", motivation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.applicantName.trim() || !form.contact.trim()) return;
    setIsSubmitting(true);
    try {
      await createJoinApplication(form);
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch {
      alert("申請の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-ag-lime-500 to-emerald-600 text-white px-6 py-5 rounded-t-3xl">
          <h2 className="text-lg font-black">入会申請フォーム</h2>
          <p className="text-xs text-white/70 mt-1">入力完了後、役員が確認・承認します</p>
        </div>
        {submitted ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-ag-lime-500 rounded-full flex items-center justify-center text-white text-xl font-black mx-auto mb-4 shadow-lg">OK</div>
            <p className="font-black text-ag-gray-700 text-xl">申請を送信しました</p>
            <p className="text-xs text-ag-gray-400 mt-2">役員が確認次第ご連絡します</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">お名前 *</label>
                <input type="text" value={form.applicantName} onChange={e => setForm({ ...form, applicantName: e.target.value })} placeholder="例: 杉村 麻衣" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" />
              </div>
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">ふりがな</label>
                <input type="text" value={form.furigana} onChange={e => setForm({ ...form, furigana: e.target.value })} placeholder="例: すぎむら まい" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">ランク（自己申告）</label>
                <select value={form.rank} onChange={e => setForm({ ...form, rank: e.target.value })} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="A">A ランク</option>
                  <option value="B">B ランク</option>
                  <option value="C">C ランク</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">年齢層</label>
                <select value={form.ageGroup} onChange={e => setForm({ ...form, ageGroup: e.target.value })} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  {["10代", "20代", "30代", "40代", "50代", "60代以上"].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">連絡先（LINE/メール） *</label>
              <input type="text" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="line_id または mail@example.com" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">紹介者</label>
                <input type="text" value={form.invitedBy} onChange={e => setForm({ ...form, invitedBy: e.target.value })} placeholder="例: 石川" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">所属チーム</label>
                <input type="text" value={form.teamName} onChange={e => setForm({ ...form, teamName: e.target.value })} placeholder="例: フリー、石川チーム" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">希望会員種別</label>
              <div className="grid grid-cols-2 gap-2">
                {([["regular", "通常会員（月4回参加）"], ["light", "ライト会員（月2回程度）"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setForm({ ...form, targetMemberType: val })}
                    className={`py-3 rounded-xl text-xs font-bold border transition-all ${form.targetMemberType === val ? "bg-ag-lime-500 text-white border-ag-lime-500 shadow" : "bg-white text-ag-gray-500 border-ag-gray-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">志望動機・一言</label>
              <textarea rows={3} value={form.motivation} onChange={e => setForm({ ...form, motivation: e.target.value })} placeholder="参加したい理由や自己紹介など" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none leading-relaxed" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-ag-gray-400 border border-ag-gray-100 rounded-xl">キャンセル</button>
              <button onClick={handleSubmit} disabled={!form.applicantName.trim() || !form.contact.trim() || isSubmitting}
                className="flex-[2] py-3 bg-ag-lime-500 text-white rounded-xl text-sm font-black hover:bg-ag-lime-600 shadow-lg disabled:opacity-40">
                {isSubmitting ? "送信中..." : "申請する"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 年度更新申請フォーム
// ─────────────────────────────────────────────
function RenewalApplicationModal({
  myName, myUid, myEmail, officialCount, onClose,
}: {
  myName: string;
  myUid: string;
  myEmail: string;
  officialCount: number;
  onClose: () => void;
}) {
  const [renewalType, setRenewalType] = useState<RenewalType>("continue_regular");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const needsVote = RENEWAL_NEEDS_VOTE[renewalType];

  const handleSubmit = async () => {
    if (needsVote && !reason.trim()) return;
    if (!myName || !myUid) {
      alert("ログイン情報が取得できません。再読み込みしてください。");
      return;
    }
    setIsSubmitting(true);
    try {
      await createRenewalApplication({
        applicantName: myName,
        applicantUid: myUid,
        applicantEmail: myEmail,
        renewalType,
        reason,
        officialMemberCount: officialCount,
      });
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch {
      alert("申請の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-6 py-5 rounded-t-3xl">
          <h2 className="text-lg font-black">年度更新申請</h2>
          <p className="text-xs text-white/70 mt-1">申請者: {myName || "（取得中）"}</p>
        </div>
        {submitted ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-ag-lime-500 rounded-full flex items-center justify-center text-white text-xl font-black mx-auto mb-4 shadow-lg">OK</div>
            <p className="font-black text-ag-gray-700 text-xl">申請を送信しました</p>
            {needsVote && <p className="text-xs text-ag-gray-400 mt-2">通常会員 {Math.ceil(officialCount * 0.6)} 名の署名で承認されます</p>}
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-3">来年度の希望</label>
              <div className="space-y-2">
                {(Object.entries(RENEWAL_LABELS) as [RenewalType, typeof RENEWAL_LABELS[RenewalType]][]).map(([val, cfg]) => (
                  <button key={val} onClick={() => setRenewalType(val)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${renewalType === val ? "border-2 border-ag-lime-400 bg-ag-lime-50" : "border-ag-gray-100 bg-white hover:bg-ag-gray-50"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${renewalType === val ? "border-ag-lime-500 bg-ag-lime-500" : "border-ag-gray-300"}`}>
                      {renewalType === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-extrabold ${cfg.color}`}>{cfg.label}</p>
                      {RENEWAL_NEEDS_VOTE[val] && (
                        <p className="text-[9px] text-ag-gray-400 mt-0.5">
                          ※通常会員 {officialCount} 名の60%（{Math.ceil(officialCount * 0.6)} 名）以上の署名承認が必要
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {needsVote && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <label className="text-[10px] font-black text-amber-700 uppercase block mb-2">
                  申請理由 <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-amber-600 mb-3 leading-relaxed">
                  参加頻度が少なくなる理由を具体的に記載してください。
                </p>
                <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="例：育児・介護のため月2回程度の参加になります。"
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-300 leading-relaxed" />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-ag-gray-400 border border-ag-gray-100 rounded-xl">キャンセル</button>
              <button onClick={handleSubmit} disabled={(needsVote && !reason.trim()) || isSubmitting || !myName}
                className="flex-[2] py-3 bg-sky-500 text-white rounded-xl text-sm font-black hover:bg-sky-600 shadow-lg disabled:opacity-40">
                {isSubmitting ? "送信中..." : "申請する"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
