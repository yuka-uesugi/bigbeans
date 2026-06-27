"use client";

import { useState, useEffect } from "react";
import { getAllMembers, calculateFiscalAge, calculateTodayAge, updateMember, deleteMember } from "@/lib/members";
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

  const handleChangeMembershipType = async (member: Member, newType: NonNullable<Member["membershipType"]>) => {
    // 念のためサーバー側ルールと同じく権限を再チェック
    if (!canEditMembershipType) return;
    if (newType === member.membershipType) return;
    try {
      await updateMember(member.id, { membershipType: newType });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, membershipType: newType } : m));
    } catch (err) {
      console.error("種別変更エラー:", err);
      alert("種別の変更に失敗しました。");
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
                          {member.role && (
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
                          <select
                            value={member.membershipType ?? "official"}
                            onChange={(e) => handleChangeMembershipType(member, e.target.value as NonNullable<Member["membershipType"]>)}
                            title="会員種別を選択（管理者・サポーターのみ）"
                            className={`text-[11px] font-black px-3 py-1.5 rounded-full border-2 shadow-sm cursor-pointer ${membershipBadgeClass(member.membershipType)}`}
                          >
                            {MEMBERSHIP_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`text-[11px] font-black px-3 py-1.5 rounded-full border-2 shadow-sm inline-block ${membershipBadgeClass(member.membershipType)}`}
                          >
                            {membershipLabel(member.membershipType)}
                          </span>
                        )}
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
    </div>
  );
}
