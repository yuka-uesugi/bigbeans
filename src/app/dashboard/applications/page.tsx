"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberByEmail, getAllMembers, addMemberFromApplication, applyMembershipChange } from "@/lib/members";
import {
  subscribeToApplications,
  createJoinApplication,
  createRenewalApplication,
  createMembershipChangeApplication,
  signApplication,
  approveApplication,
  rejectApplication,
  RENEWAL_LABELS,
  RENEWAL_NEEDS_VOTE,
  MEMBERSHIP_CHANGE_LABELS,
  MEMBERSHIP_CHANGE_NEEDS_VOTE,
  STATUS_LABELS,
  type ApplicationData,
  type RenewalType,
  type MembershipChangeType,
} from "@/lib/applications";
import { earliestEffectiveMonth, addMonths, formatMonthJa, nextFiscalYearStart } from "@/lib/membership";
import { createBroadcast } from "@/lib/notifications";
import type { Member } from "@/data/memberList";

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────
export default function ApplicationsPage() {
  const { user, role } = useAuth();
  const [myName, setMyName] = useState("");
  // ログイン中ユーザーの uid はそのまま導出できる（state に入れる必要なし）
  const myUid = user?.email ? user.uid : "";
  const [myMember, setMyMember] = useState<Member | null>(null);
  const [officialCount, setOfficialCount] = useState(15);

  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "join" | "renewal" | "membership_change" | "mine">("all");
  const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ログインユーザーの名前・uid・名簿情報を取得
  useEffect(() => {
    if (!user?.email) return;
    getMemberByEmail(user.email).then((m) => {
      if (m) {
        setMyName(m.name);
        setMyMember(m);
      } else {
        setMyName(user.displayName ?? "");
      }
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
  // 種別変更の承認は部長（アプリ上は管理者権限）＋管理者・サポーター
  const canApproveChange = role === "admin" || role === "supporter";

  const filtered = applications.filter((a) => {
    if (activeTab === "mine") return a.applicantUid === user?.uid;
    if (activeTab === "join") return a.type === "join";
    if (activeTab === "renewal") return a.type === "renewal";
    if (activeTab === "membership_change") return a.type === "membership_change";
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
          <p className="text-sm text-ag-gray-400 mt-1">入会申請・年度更新・会員種別変更の一覧と承認</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {myMember && (myMember.membershipType === "light" || myMember.membershipType === "official" || !myMember.membershipType) && (
            <button
              onClick={() => setShowChangeForm(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-sm"
            >
              種別変更申請
            </button>
          )}
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
          ["membership_change", "種別変更"],
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
                      {app.type === "join" ? "入会申請" : app.type === "membership_change" ? "会員種別変更申請" : "年度更新申請"} · {submittedDate}
                    </p>
                  </div>
                  <span className="text-ag-gray-200 text-xl">›</span>
                </div>

                {app.renewalType && (
                  <div className={`text-xs font-bold ${RENEWAL_LABELS[app.renewalType].color} mb-2`}>
                    {RENEWAL_LABELS[app.renewalType].label}
                  </div>
                )}
                {app.type === "membership_change" && app.changeType && (
                  <div className={`text-xs font-bold ${MEMBERSHIP_CHANGE_LABELS[app.changeType].color} mb-2`}>
                    {MEMBERSHIP_CHANGE_LABELS[app.changeType].label}
                    {app.effectiveMonth && `（${formatMonthJa(app.effectiveMonth)}から）`}
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
          canApproveChange={canApproveChange}
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

      {showChangeForm && myMember && (
        <MembershipChangeModal
          myName={myName}
          myUid={myUid}
          myEmail={user?.email ?? ""}
          myMember={myMember}
          officialCount={officialCount}
          onClose={() => setShowChangeForm(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 申請詳細モーダル
// ─────────────────────────────────────────────
function ApplicationModal({
  app, myName, myUid, isAdmin, canApproveChange, onClose,
}: {
  app: ApplicationData;
  myName: string;
  myUid: string;
  isAdmin: boolean;
  canApproveChange: boolean;
  onClose: () => void;
}) {
  const [isSigning, setIsSigning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const status = STATUS_LABELS[app.status];
  const renewalCfg = app.renewalType ? RENEWAL_LABELS[app.renewalType] : null;
  const changeCfg = app.type === "membership_change" && app.changeType
    ? MEMBERSHIP_CHANGE_LABELS[app.changeType]
    : null;
  const progress =
    app.requiredSignatures > 0
      ? Math.min((app.signatures.length / app.requiredSignatures) * 100, 100)
      : 0;
  const alreadySigned = app.signatures.some((s) => s.memberUid === myUid);
  const submittedDate = app.submittedAt?.toDate
    ? app.submittedAt.toDate().toLocaleDateString("ja-JP")
    : "";

  // 会員種別が変わる申請（月単位の種別変更、または年度更新の種別変更）。
  // 署名が揃っても自動承認せず、承認者（部長・管理者・サポーター）の承認で名簿に反映する。
  const isTypeChangeApp =
    app.type === "membership_change" ||
    (app.type === "renewal" &&
      (app.renewalType === "regular_to_light" || app.renewalType === "light_to_regular"));

  const handleSign = async () => {
    if (!myName || !myUid || alreadySigned) return;
    setIsSigning(true);
    try {
      await signApplication(
        app.id, myName, myUid, app.signatures, app.requiredSignatures,
        !isTypeChangeApp
      );
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
      // 会員種別変更の場合は、承認と同時に名簿へ「適用月から新種別」を登録する
      if (app.type === "membership_change") {
        if (app.memberId == null || !app.changeType || !app.effectiveMonth) {
          alert("承認しましたが、申請データに不足があり名簿へ自動反映できませんでした。名簿画面から手動で変更してください。");
        } else {
          const newType = app.changeType === "light_to_official" ? "official" : "light";
          await applyMembershipChange(app.memberId, newType, app.effectiveMonth);
          const label = newType === "official" ? "オフィシャル" : "ライト";
          void createBroadcast({
            type: "announcement",
            title: `${app.applicantName}さんが${formatMonthJa(app.effectiveMonth)}から${label}会員になります`,
            link: "/dashboard/applications",
            createdByName: myName,
          });
          alert(`承認しました。${formatMonthJa(app.effectiveMonth)}の練習分から自動で${label}会員の料金になります。`);
        }
      }
      // 年度更新の種別変更の場合は、承認と同時に「来年度（2月）から新種別」を名簿へ登録する
      if (app.type === "renewal" &&
        (app.renewalType === "regular_to_light" || app.renewalType === "light_to_regular")) {
        const member = app.applicantEmail ? await getMemberByEmail(app.applicantEmail) : null;
        if (!member) {
          alert("承認しました。※名簿で該当メンバーが見つからなかったため、種別の変更は名簿画面から手動で行ってください（適用は来年度2月から）。");
        } else {
          const newType = app.renewalType === "light_to_regular" ? "official" : "light";
          const from = nextFiscalYearStart();
          await applyMembershipChange(member.id, newType, from);
          const label = newType === "official" ? "オフィシャル" : "ライト";
          void createBroadcast({
            type: "announcement",
            title: `${app.applicantName}さんが${formatMonthJa(from)}（来年度）から${label}会員になります`,
            link: "/dashboard/applications",
            createdByName: myName,
          });
          alert(`承認しました。${formatMonthJa(from)}（来年度の初め）の練習分から自動で${label}会員の料金になります。`);
        }
      }
    } catch {
      alert("承認に失敗しました（名簿への反映も含めて完了していない可能性があります）");
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
              {app.type === "join" ? "入会申請" : app.type === "membership_change" ? "会員種別変更申請" : "年度更新申請"} · {submittedDate}
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

          {/* 会員種別変更の内容 */}
          {changeCfg && (
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <p className="text-[9px] font-extrabold text-purple-400 uppercase mb-1">変更内容</p>
              <p className={`text-sm font-extrabold ${changeCfg.color}`}>{changeCfg.label}</p>
              {app.effectiveMonth && (
                <p className="text-xs font-bold text-ag-gray-600 mt-1.5">
                  適用開始：<strong className="text-purple-700">{formatMonthJa(app.effectiveMonth)}の練習分から</strong>（月の初めから適用）
                </p>
              )}
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
                  ["メール", app.email || (app.contact?.includes("@") ? app.contact : undefined)],
                  ["LINE", app.lineId || (app.contact && !app.contact.includes("@") ? app.contact : undefined)],
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

          {/* 承認者アクション（種別が変わる申請：部長＝管理者・サポーター権限） */}
          {canApproveChange && isTypeChangeApp && (app.status === "pending" || app.status === "voting") && (
            <div className="pt-2 space-y-2">
              {app.type === "renewal" && (
                <p className="text-[10px] font-bold text-ag-gray-500">
                  年度更新の種別変更です。承認すると<strong>来年度（2月）の練習分から</strong>新しい種別が自動で適用されます。
                </p>
              )}
              {app.status === "voting" && app.signatures.length < app.requiredSignatures && (
                <p className="text-[10px] font-bold text-amber-600">
                  署名がまだ揃っていません。通常は署名が揃ってから承認してください（承認者の判断で先に決定することもできます）。
                </p>
              )}
              <div className="flex gap-3">
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
                  className="flex-[2] py-3 bg-purple-500 text-white rounded-xl text-sm font-black hover:bg-purple-600 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  承認して名簿に反映する
                </button>
              </div>
            </div>
          )}

          {/* 管理者アクション（投票中の強制決定） */}
          {isAdmin && app.status === "voting" && !isTypeChangeApp && (
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
    applicantName: "", furigana: "", birthdate: "", email: "",
    invitedBy: "", rank: "B", ageGroup: "30代", teamName: "",
    targetMemberType: "regular" as "regular" | "light", motivation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.applicantName.trim() || !form.email.trim()) return;
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
              <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">メールアドレス *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="mail@example.com" className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ag-lime-300" />
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
              <button onClick={handleSubmit} disabled={!form.applicantName.trim() || !form.email.trim() || isSubmitting}
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
            {needsVote ? (
              <p className="text-xs text-ag-gray-400 mt-2">
                通常会員 {Math.ceil(officialCount * 0.6)} 名の署名
                {renewalType === "regular_to_light" ? "と、承認者の承認で確定します" : "で承認されます"}
              </p>
            ) : renewalType === "light_to_regular" ? (
              <p className="text-xs text-ag-gray-400 mt-2">承認者（部長・管理者）が確認次第、確定します</p>
            ) : null}
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

// ─────────────────────────────────────────────
// 会員種別変更申請フォーム（月単位・月初から適用）
// ─────────────────────────────────────────────
function MembershipChangeModal({
  myName, myUid, myEmail, myMember, officialCount, onClose,
}: {
  myName: string;
  myUid: string;
  myEmail: string;
  myMember: Member;
  officialCount: number;
  onClose: () => void;
}) {
  // 現在の種別（未設定はオフィシャル扱い）から、変更後の種別は自動で決まる
  const currentType = myMember.membershipType ?? "official";
  const changeType: MembershipChangeType =
    currentType === "light" ? "light_to_official" : "official_to_light";
  const currentLabel = currentType === "light" ? "ライト会員" : "オフィシャル会員";
  const targetLabel = currentType === "light" ? "オフィシャル会員" : "ライト会員";
  const needsVote = MEMBERSHIP_CHANGE_NEEDS_VOTE[changeType];

  // 締切ルール：適用月の前月25日まで。今日から選べる適用月を4つ用意する
  const firstMonth = earliestEffectiveMonth();
  const monthOptions = [0, 1, 2, 3].map((n) => addMonths(firstMonth, n));

  const [effectiveMonth, setEffectiveMonth] = useState(firstMonth);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (needsVote && !reason.trim()) return;
    if (!myName || !myUid) {
      alert("ログイン情報が取得できません。再読み込みしてください。");
      return;
    }
    setIsSubmitting(true);
    try {
      await createMembershipChangeApplication({
        applicantName: myName,
        applicantUid: myUid,
        applicantEmail: myEmail,
        memberId: myMember.id,
        changeType,
        effectiveMonth,
        reason,
        officialMemberCount: officialCount,
      });
      // ベル通知・メールで全員に知らせる（署名や承認をお願いするため）
      void createBroadcast({
        type: "announcement",
        title: `会員種別変更の申請：${myName}さん`,
        body: `${currentLabel} → ${targetLabel}（${formatMonthJa(effectiveMonth)}から）${needsVote ? "。署名にご協力ください。" : ""}`,
        link: "/dashboard/applications",
        createdByName: myName,
      });
      setSubmitted(true);
      setTimeout(onClose, 2500);
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
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-5 rounded-t-3xl">
          <h2 className="text-lg font-black">会員種別変更申請</h2>
          <p className="text-xs text-white/70 mt-1">申請者: {myName || "（取得中）"}</p>
        </div>
        {submitted ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-ag-lime-500 rounded-full flex items-center justify-center text-white text-xl font-black mx-auto mb-4 shadow-lg">OK</div>
            <p className="font-black text-ag-gray-700 text-xl">申請を送信しました</p>
            <p className="text-xs text-ag-gray-400 mt-2">
              {needsVote
                ? `通常会員 ${Math.ceil(officialCount * 0.6)} 名の署名と、承認者の承認で確定します`
                : "承認者（部長・管理者）が確認次第、確定します"}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* 変更内容（自動決定） */}
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <p className="text-[10px] font-black text-purple-400 uppercase mb-2">変更内容</p>
              <p className="text-base font-black text-ag-gray-800">
                {currentLabel} <span className="text-purple-500 mx-1">→</span> {targetLabel}
              </p>
            </div>

            {/* 適用月 */}
            <div>
              <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">いつから変更しますか？（月の初めから適用）</label>
              <div className="grid grid-cols-2 gap-2">
                {monthOptions.map((m) => (
                  <button key={m} onClick={() => setEffectiveMonth(m)}
                    className={`py-3 rounded-xl text-sm font-black border transition-all ${effectiveMonth === m ? "bg-purple-500 text-white border-purple-500 shadow" : "bg-white text-ag-gray-500 border-ag-gray-200"}`}>
                    {formatMonthJa(m)}から
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-ag-gray-400 mt-2 leading-relaxed">
                締切：変更したい月の<strong>前の月の25日まで</strong>に申請してください（承認のお手続きに時間がかかるため）。
                例：8月から変更したい場合は7月25日まで。
              </p>
            </div>

            {/* 理由（ライトになる方向は必須＋署名が必要） */}
            {needsVote ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <label className="text-[10px] font-black text-amber-700 uppercase block mb-2">
                  申請理由 <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-amber-600 mb-3 leading-relaxed">
                  ライト会員への変更には、通常会員 {officialCount} 名の60%（{Math.ceil(officialCount * 0.6)} 名）以上の署名が必要です。
                  参加頻度が少なくなる理由を具体的に記載してください。
                </p>
                <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="例：育児・介護のため月2回程度の参加になります。"
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-300 leading-relaxed" />
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">一言（任意）</label>
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="例：毎回参加できるようになったのでオフィシャルに変更します。"
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none leading-relaxed" />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-ag-gray-400 border border-ag-gray-100 rounded-xl">キャンセル</button>
              <button onClick={handleSubmit} disabled={(needsVote && !reason.trim()) || isSubmitting || !myName}
                className="flex-[2] py-3 bg-purple-500 text-white rounded-xl text-sm font-black hover:bg-purple-600 shadow-lg disabled:opacity-40">
                {isSubmitting ? "送信中..." : "申請する"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
