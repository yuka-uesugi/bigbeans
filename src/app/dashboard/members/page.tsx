"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getAllMembers, calculateFiscalAge, calculateTodayAge, deleteMember, applyMembershipChange, removeMembershipHistoryEntry, syncMembershipTypesWithHistory } from "@/lib/members";
import { monthKey, addMonths, formatMonthJa, typeFromHistory, currentFiscalYearStart } from "@/lib/membership";
import { Member } from "@/data/memberList";
import UserApprovalPanel from "@/components/dashboard/UserApprovalPanel";
import { useAuth } from "@/contexts/AuthContext";

// 会員種別（料金区分）の選択肢。オフィシャル/ライト/ビジター/コーチの4種類。
const MEMBERSHIP_TYPES: { value: NonNullable<Member["membershipType"]>; label: string }[] = [
  { value: "official", label: "オフィシャル" },
  { value: "light", label: "ライト" },
  { value: "visitor", label: "ビジター" },
  { value: "coach", label: "コーチ" },
];

// 会員種別の表示ラベル（未設定はオフィシャル扱い）
function membershipLabel(type: Member["membershipType"]): string {
  return MEMBERSHIP_TYPES.find(t => t.value === type)?.label ?? "オフィシャル";
}

// 会員種別ごとのバッジ色（係バッジのコーチ＝青と区別するため、種別コーチは琥珀色にする）
function membershipBadgeClass(type: Member["membershipType"]): string {
  switch (type) {
    case "light":   return "bg-purple-100 text-purple-700 border-purple-300";
    case "coach":   return "bg-amber-100 text-amber-700 border-amber-300";
    case "visitor": return "bg-ag-gray-100 text-ag-gray-500 border-ag-gray-200";
    default:        return "bg-ag-lime-100 text-ag-lime-700 border-ag-lime-300"; // official
  }
}

export default function MembersPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  // 会員種別バッジ（料金区分に直結）の変更は管理者・サポーターのみ許可
  const canEditMembershipType = role === "admin" || role === "supporter";
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 種別変更モーダルの対象メンバー
  const [changeTarget, setChangeTarget] = useState<Member | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      setIsLoading(true);
      try {
        const data = await getAllMembers();
        setMembers(data.sort((a, b) => a.id - b.id));
      } catch (error) {
        console.error("名簿取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMembers();
  }, []);

  // 適用月が来た「予約済みの種別変更」を名簿の現在種別へ自動反映する
  // （本人の権限では書き込めないため、管理者・サポーターが名簿を開いたときに実行）
  useEffect(() => {
    if (!canEditMembershipType || isLoading || members.length === 0) return;
    syncMembershipTypesWithHistory(members)
      .then((updated) => {
        if (updated.some((m, i) => m !== members[i])) setMembers(updated);
      })
      .catch(() => {});
    // members を依存に入れると無限ループになるため、読み込み完了時に1回だけ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEditMembershipType, isLoading]);

  const filteredMembers = members.filter(m =>
    m.name.includes(searchTerm) ||
    (m.email && m.email.includes(searchTerm)) ||
    (m.address && m.address.includes(searchTerm)) ||
    (m.role && m.role.includes(searchTerm))
  );

  const getGymRoleBadge = (role: string | undefined, color: string) => {
    if (!role || role === "-") return null;
    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${color}`}>
        {role}
      </span>
    );
  };

  // 種別変更を適用月つきで保存する（履歴に残り、料金計算は練習日の月で判定される）
  const handleApplyMembershipChange = async (
    member: Member,
    newType: NonNullable<Member["membershipType"]>,
    effectiveMonth: string
  ) => {
    // 念のためサーバー側ルールと同じく権限を再チェック
    if (!canEditMembershipType) return;
    try {
      await applyMembershipChange(member.id, newType, effectiveMonth);
      // 画面上の表示も同じロジックで更新する
      const history = [
        ...(member.membershipHistory ?? []).filter(h => h.from !== effectiveMonth),
        { type: newType, from: effectiveMonth },
      ].sort((a, b) => (a.from < b.from ? -1 : 1));
      const nowMonth = monthKey(new Date());
      setMembers(prev => prev.map(m => m.id === member.id ? {
        ...m,
        membershipHistory: history,
        membershipType: effectiveMonth <= nowMonth
          ? (typeFromHistory({ membershipHistory: history }, nowMonth) ?? newType)
          : m.membershipType,
      } : m));
      setChangeTarget(null);
      if (effectiveMonth > nowMonth) {
        alert(`${formatMonthJa(effectiveMonth)}の練習分から「${membershipLabel(newType)}」の料金に自動で切り替わります。`);
      }
    } catch (err) {
      console.error("種別変更エラー:", err);
      alert("種別の変更に失敗しました。");
    }
  };

  // まだ適用月が来ていない「予定」の種別変更を取り消す
  const handleRemoveHistoryEntry = async (member: Member, from: string) => {
    if (!canEditMembershipType) return;
    if (!confirm(`「${formatMonthJa(from)}から${membershipLabel((member.membershipHistory ?? []).find(h => h.from === from)?.type)}」の予定を取り消しますか？`)) return;
    try {
      await removeMembershipHistoryEntry(member.id, from);
      const strip = (m: Member): Member => ({
        ...m,
        membershipHistory: (m.membershipHistory ?? []).filter(h => h.from !== from),
      });
      setMembers(prev => prev.map(m => m.id === member.id ? strip(m) : m));
      // モーダルを開いたままでも履歴表示が更新されるようにする
      setChangeTarget(prev => (prev && prev.id === member.id ? strip(prev) : prev));
    } catch (err) {
      console.error("履歴の取り消しエラー:", err);
      alert("予定の取り消しに失敗しました。");
    }
  };

  // 名簿からメンバーを削除する（管理者のみ・二重確認）
  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`「${member.name}」さんを名簿から削除します。よろしいですか？`)) return;
    if (!confirm(`本当に削除してよろしいですか？\nこの操作は元に戻せません。`)) return;
    try {
      await deleteMember(member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (err) {
      console.error("メンバー削除エラー:", err);
      alert("削除に失敗しました。権限（管理者）と通信環境をご確認ください。");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ag-lime-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-fade-in-up pb-24">
      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            メンバー名簿（クラウド同期版）
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            各メンバーがマイページで修正した内容は、リアルタイムでここに反映されます。編集はマイページから行ってください。
          </p>
        </div>

        {/* 検索 */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[280px] lg:w-80">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="名前・メール・住所・役職で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-ag-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ag-lime-500 bg-white shadow-sm"
            />
          </div>
          <button className="px-5 py-2.5 bg-ag-lime-50 text-ag-lime-700 font-bold text-sm rounded-2xl border border-ag-lime-200 hover:bg-ag-lime-100 transition-all flex items-center gap-2 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV出力
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-ag-gray-200">
          <p className="text-ag-gray-400">データがありません。マイページの「初期データ流し込み」を実行してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-ag-gray-200/60 shadow-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-ag-gray-50/80 border-b border-ag-gray-200 text-[10px] font-bold text-ag-gray-500 uppercase tracking-widest">
                  <th className="px-4 py-4 whitespace-nowrap sticky left-0 bg-ag-gray-50 z-10 shadow-sm font-extrabold">氏名 / 役職</th>
                  <th className="px-4 py-4 whitespace-nowrap">種別</th>
                  <th className="px-4 py-4 whitespace-nowrap">日バID / 審判</th>
                  <th className="px-4 py-4 whitespace-nowrap">連絡先 / 住所</th>
                  <th className="px-4 py-4 whitespace-nowrap border-l border-ag-gray-100 bg-emerald-50/20 text-emerald-800">施設担当 (都筑)</th>
                  <th className="px-4 py-4 whitespace-nowrap bg-sky-50/20 text-sky-800">施設担当 (スポセン)</th>
                  <th className="px-4 py-4 whitespace-nowrap bg-amber-50/20 text-amber-800 font-bold border-r border-ag-gray-100">施設担当 (他)</th>
                  <th className="px-4 py-4 whitespace-nowrap">基本情報 (年齢・入会)</th>
                  <th className="px-4 py-4 whitespace-nowrap">パーソナル</th>
                  <th className="px-4 py-4 whitespace-nowrap">はまっこ期限</th>
                  {isAdmin && <th className="px-4 py-4 whitespace-nowrap text-red-500">操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ag-gray-50">
                {filteredMembers.map((member) => {
                  const fiscalAge = calculateFiscalAge(member.birthday, 2026);
                  const todayAge = calculateTodayAge(member.birthday);
                  return (
                    <tr key={member.id} className="hover:bg-ag-lime-50/10 transition-colors group">
                      {/* 氏名 / 役職 */}
                      <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-ag-lime-50/20 z-10 shadow-sm transition-colors border-r border-ag-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ag-gray-900 text-sm">{member.name}</span>
                          {/* コーチは会員種別(料金区分)で表すため、役職バッジには出さない */}
                          {member.role && member.role !== "コーチ" && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shadow-sm ${
                              member.role === '代表' ? 'bg-red-500 text-white border-red-600' :
                              member.role === '会計' ? 'bg-amber-400 text-white border-amber-500' :
                              'bg-sky-100 text-sky-700 border-sky-200'
                            }`}>
                              {member.role}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 種別（変更は管理者・サポーターのみ。一般メンバーは表示専用） */}
                      <td className="px-4 py-4">
                        {canEditMembershipType ? (
                          <button
                            onClick={() => setChangeTarget(member)}
                            title="タップして会員種別を変更（管理者・サポーターのみ）"
                            className={`text-[11px] font-black px-3 py-1.5 rounded-full border-2 shadow-sm cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${membershipBadgeClass(member.membershipType)}`}
                          >
                            {membershipLabel(member.membershipType)} ▾
                          </button>
                        ) : (
                          <span
                            className={`text-[11px] font-black px-3 py-1.5 rounded-full border-2 shadow-sm inline-block ${membershipBadgeClass(member.membershipType)}`}
                          >
                            {membershipLabel(member.membershipType)}
                          </span>
                        )}
                        {(() => {
                          // 予約済みの種別変更（来月以降）があれば予定として表示する
                          const nowMonth = monthKey(new Date());
                          const upcoming = (member.membershipHistory ?? [])
                            .filter(h => h.from > nowMonth)
                            .sort((a, b) => (a.from < b.from ? -1 : 1))[0];
                          return upcoming ? (
                            <p className="text-[9px] font-bold text-purple-600 mt-1 whitespace-nowrap">
                              {formatMonthJa(upcoming.from)}から{membershipLabel(upcoming.type)}
                            </p>
                          ) : null;
                        })()}
                      </td>

                      {/* 日バID / 審判 */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-mono text-ag-gray-700">{member.jbaId || "-"}</span>
                          {member.refereeYear && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] bg-ag-gray-100 text-ag-gray-400 px-1 py-0.5 rounded">審判</span>
                              <span className="text-[10px] font-bold text-ag-gray-400">'{member.refereeYear.slice(-2)}期</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 連絡先 / 住所 */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 max-w-[220px]">
                          <a href={`mailto:${member.email}`} className="text-[11px] font-medium text-ag-lime-700 hover:underline truncate">{member.email}</a>
                          {member.lineId && (
                            <span className="text-[10px] font-bold text-green-600 truncate">LINE: {member.lineId}</span>
                          )}
                          <a href={`tel:${member.phone}`} className="text-[10px] font-mono font-bold text-ag-gray-500 hover:text-ag-lime-600">{member.phone}</a>
                          <span className="text-[10px] text-ag-gray-400 truncate mt-0.5">{member.postCode} {member.address}</span>
                        </div>
                      </td>

                      {/* 施設担当 (都筑) */}
                      <td className="px-4 py-4 border-l border-ag-gray-50 bg-emerald-50/5">
                        <div className="flex flex-col gap-1.5">
                          {getGymRoleBadge(member.gymRoles?.tsuzukiRep, "bg-emerald-100 text-emerald-800 border-emerald-200")}
                          {getGymRoleBadge(member.gymRoles?.tsuzukiContact, "bg-white text-emerald-600 border-emerald-100")}
                          {!member.gymRoles?.tsuzukiRep && !member.gymRoles?.tsuzukiContact && <span className="text-xs text-ag-gray-300">-</span>}
                        </div>
                      </td>

                      {/* 施設担当 (スポセン) */}
                      <td className="px-4 py-4 bg-sky-50/5">
                        <div className="flex flex-col gap-1.5">
                          {getGymRoleBadge(member.gymRoles?.sposenRep, "bg-sky-100 text-sky-800 border-sky-200")}
                          {getGymRoleBadge(member.gymRoles?.sposenMember, "bg-white text-sky-600 border-sky-100")}
                          {!member.gymRoles?.sposenRep && !member.gymRoles?.sposenMember && <span className="text-xs text-ag-gray-300">-</span>}
                        </div>
                      </td>

                      {/* 施設担当 (他) */}
                      <td className="px-4 py-4 bg-amber-50/5 border-r border-ag-gray-50">
                        <div className="flex flex-col gap-1.5">
                          {getGymRoleBadge(member.gymRoles?.threeDistrictRep, "bg-amber-100 text-amber-800 border-amber-200")}
                          {getGymRoleBadge(member.gymRoles?.threeDistrictContact, "bg-white text-amber-600 border-amber-100")}
                          {getGymRoleBadge(member.gymRoles?.otherRep, "bg-ag-gray-100 text-ag-gray-700 border-ag-gray-200")}
                          {!member.gymRoles?.threeDistrictRep && !member.gymRoles?.threeDistrictContact && !member.gymRoles?.otherRep && <span className="text-xs text-ag-gray-300">-</span>}
                        </div>
                      </td>

                      {/* 基本情報 */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 text-[10px] text-ag-gray-500">
                          <div className="flex items-center gap-2">
                            <span className="text-ag-gray-300 font-bold">4/1基準:</span>
                            <span className="text-ag-gray-800 font-extrabold">{fiscalAge != null ? `${fiscalAge}歳` : "-"}</span>
                            <span className="text-ag-gray-300 font-bold">今日:</span>
                            <span className="text-ag-gray-600 font-bold">{todayAge != null ? `${todayAge}歳` : "-"}</span>
                          </div>
                          <div><span className="text-ag-gray-300 font-bold mr-1">入会:</span><span className="font-medium">{member.joinedDate || "-"}</span></div>
                          <div><span className="text-ag-gray-300 font-bold mr-1">生年月日:</span><span>{member.birthday || "-"}</span></div>
                        </div>
                      </td>

                      {/* パーソナル */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          {member.bloodType && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 w-fit">
                              {member.bloodType}型
                            </span>
                          )}
                          {member.hometown && (
                            <span className="text-[10px] text-ag-gray-500 font-medium truncate">📍 {member.hometown}</span>
                          )}
                          {(member.sportsHistory || []).slice(0, 2).map((s, i) => (
                            <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-ag-lime-50 text-ag-lime-700 border border-ag-lime-100 w-fit max-w-[110px] truncate">
                              {s}
                            </span>
                          ))}
                          {(member.sportsHistory || []).length > 2 && (
                            <span className="text-[9px] text-ag-gray-400">+{(member.sportsHistory || []).length - 2}件</span>
                          )}
                          {!member.bloodType && !member.hometown && !(member.sportsHistory?.length) && (
                            <span className="text-xs text-ag-gray-300">-</span>
                          )}
                        </div>
                      </td>

                      {/* ハマっこ期限 */}
                      <td className="px-4 py-4">
                        {member.hamakkoExpiry ? (
                          <span className="text-pink-600 font-mono text-[10px] font-bold bg-pink-50 px-2 py-0.5 rounded border border-pink-100">{member.hamakkoExpiry}</span>
                        ) : (
                          <span className="text-ag-gray-300">-</span>
                        )}
                      </td>

                      {/* 操作（管理者のみ・削除） */}
                      {isAdmin && (
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="text-[10px] font-black px-3 py-1.5 rounded-full border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                          >
                            削除
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-ag-gray-50 border-t border-ag-gray-100 flex items-center justify-between">
            <p className="text-[10px] text-ag-gray-400 font-medium italic">
              ※年齢は 2026年4月1日 現在の基準年齢を表示しています。
            </p>
            <p className="text-[10px] text-ag-gray-400 font-medium">全 {members.length} 名在籍</p>
          </div>
        </div>
      )}

      {/* 管理者向けユーザー承認パネル */}
      <div className="max-w-3xl mx-auto pb-16">
        <UserApprovalPanel />
      </div>

      {/* 会員種別の変更モーダル（適用月つき・履歴表示） */}
      {changeTarget && (
        <MembershipTypeChangeModal
          member={changeTarget}
          onClose={() => setChangeTarget(null)}
          onSave={handleApplyMembershipChange}
          onRemoveEntry={handleRemoveHistoryEntry}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 会員種別の変更モーダル（管理者・サポーター用）
// 「どの種別に」「何月から」を選んで保存する。
// 適用月が未来なら予約として登録され、月が来たら自動で切り替わる。
// ─────────────────────────────────────────────
function MembershipTypeChangeModal({
  member, onClose, onSave, onRemoveEntry,
}: {
  member: Member;
  onClose: () => void;
  onSave: (member: Member, newType: NonNullable<Member["membershipType"]>, effectiveMonth: string) => Promise<void>;
  onRemoveEntry: (member: Member, from: string) => Promise<void>;
}) {
  const [newType, setNewType] = useState<NonNullable<Member["membershipType"]>>(member.membershipType ?? "official");
  const currentMonth = monthKey(new Date());
  // 年度は2月始まり。既存メンバーの種別登録には「年度初め（2月）から」を使う
  const fiscalStart = currentFiscalYearStart();
  const monthOptions = Array.from(
    new Set([fiscalStart, currentMonth, addMonths(currentMonth, 1), addMonths(currentMonth, 2)])
  ).sort();
  const [effectiveMonth, setEffectiveMonth] = useState(currentMonth);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(member, newType, effectiveMonth);
    } finally {
      setIsSaving(false);
    }
  };

  // ページ側のアニメーション(transform)の影響を受けないよう body 直下に描画する。
  // これで長い名簿ページでも、常に「画面」の中央（スマホでは画面下部）に表示される。
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 bg-ag-gray-900 text-white px-6 py-5 rounded-t-3xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">{member.name} さんの会員種別を変更</h2>
            <p className="text-xs text-white/60 mt-1">現在：{membershipLabel(member.membershipType)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm shrink-0"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* 新しい種別 */}
          <div>
            <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">新しい種別</label>
            <div className="grid grid-cols-2 gap-2">
              {MEMBERSHIP_TYPES.map(t => (
                <button key={t.value} onClick={() => setNewType(t.value)}
                  className={`py-3 rounded-xl text-sm font-black border-2 transition-all ${
                    newType === t.value
                      ? "border-ag-lime-500 bg-ag-lime-50 text-ag-lime-700"
                      : "border-ag-gray-100 bg-white text-ag-gray-500 hover:bg-ag-gray-50"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 適用月 */}
          <div>
            <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">いつの練習分から適用しますか？</label>
            <div className="grid grid-cols-2 gap-2">
              {monthOptions.map(m => (
                <button key={m} onClick={() => setEffectiveMonth(m)}
                  className={`py-3 rounded-xl text-sm font-black border-2 transition-all ${
                    effectiveMonth === m
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-ag-gray-100 bg-white text-ag-gray-500 hover:bg-ag-gray-50"
                  }`}>
                  {formatMonthJa(m)}から
                  {m === fiscalStart && <span className="block text-[9px] font-bold opacity-70">（年度初め）</span>}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ag-gray-400 mt-2 leading-relaxed">
              種別変更は月単位（月の初めから適用）です。選んだ月の練習は、参加ボタンを押した時期に関係なく新しい種別の料金で計算されます。
            </p>
          </div>

          {/* これまでの変更履歴（新しい順）。適用前の「予定」は取り消せる */}
          {(member.membershipHistory?.length ?? 0) > 0 && (
            <div>
              <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">種別変更の履歴</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {[...(member.membershipHistory ?? [])]
                  .sort((a, b) => (a.from < b.from ? 1 : -1))
                  .map((h) => {
                    const isFuture = h.from > currentMonth;
                    return (
                      <div key={h.from} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-ag-gray-50 border border-ag-gray-100">
                        <span className="text-xs font-bold text-ag-gray-700">
                          {formatMonthJa(h.from)}から {membershipLabel(h.type)}
                          {isFuture && (
                            <span className="ml-1.5 text-[9px] font-black text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">予定</span>
                          )}
                        </span>
                        {isFuture && (
                          <button
                            onClick={() => onRemoveEntry(member, h.from)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                          >
                            取り消し
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
              <p className="text-[9px] text-ag-gray-400 mt-1.5 leading-relaxed">
                すでに適用済みの履歴は、過去の練習の料金計算に使われているため取り消せません。
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-ag-gray-400 border border-ag-gray-100 rounded-xl">キャンセル</button>
            <button onClick={handleSave} disabled={isSaving}
              className="flex-[2] py-3 bg-ag-lime-500 text-white rounded-xl text-sm font-black hover:bg-ag-lime-600 shadow-lg disabled:opacity-40">
              {isSaving ? "保存中..." : "この内容で変更する"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
