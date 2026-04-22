"use client";

import { useState, useEffect } from "react";
import { getAllMembers, calculateFiscalAge, updateMember } from "@/lib/members";
import { Member } from "@/data/memberList";
import UserApprovalPanel from "@/components/dashboard/UserApprovalPanel";

export default function MembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editTagInput, setEditTagInput] = useState("");

  // Firestoreからメンバー一覧を取得
  useEffect(() => {
    async function fetchMembers() {
      setIsLoading(true);
      try {
        const data = await getAllMembers();
        // ID順にソート (あるいは名前順)
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

  const handleToggleMembershipType = async (member: Member) => {
    const newType = member.membershipType === "light" ? "official" : "light";
    try {
      await updateMember(member.id, { membershipType: newType });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, membershipType: newType } : m));
    } catch (err) {
      console.error("種別変更エラー:", err);
      alert("種別の変更に失敗しました。");
    }
  };

  const handleEditOpen = (member: Member) => {
    setEditingMember(member);
    setEditTagInput("");
    setEditForm({
      name: member.name,
      role: member.role || "",
      email: member.email,
      phone: member.phone,
      postCode: member.postCode,
      address: member.address,
      birthday: member.birthday || "",
      joinedDate: member.joinedDate || "",
      hamakkoExpiry: member.hamakkoExpiry || "",
      jbaId: member.jbaId || "",
      refereeYear: member.refereeYear || "",
      bloodType: member.bloodType,
      hometown: member.hometown || "",
      sportsHistory: member.sportsHistory || [],
    });
  };

  const handleEditSave = async () => {
    if (!editingMember) return;
    setIsSaving(true);
    try {
      await updateMember(editingMember.id, editForm);
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...editForm } : m));
      setEditingMember(null);
    } catch (err) {
      console.error("メンバー編集エラー:", err);
      alert("保存に失敗しました。");
    } finally {
      setIsSaving(false);
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
            各メンバーがマイページで修正した内容は、リアルタイムでここに反映されます。
          </p>
        </div>
        
        {/* 検索・アクション */}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-ag-gray-50">
                {filteredMembers.map((member) => {
                  const fiscalAge = calculateFiscalAge(member.birthday, 2026);
                  return (
                    <tr key={member.id} className="hover:bg-ag-lime-50/10 transition-colors group">
                      {/* 氏名 / 役職 */}
                      <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-ag-lime-50/20 z-10 shadow-sm transition-colors border-r border-ag-gray-50">
                        <div className="flex flex-col gap-1">
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
                            <button
                              onClick={() => handleEditOpen(member)}
                              className="text-[9px] font-bold text-ag-lime-600 hover:text-ag-lime-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-ag-lime-50"
                            >編集</button>
                          </div>
                        </div>
                      </td>

                      {/* 種別 */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleMembershipType(member)}
                          className={`text-[10px] font-black px-3 py-1.5 rounded-full border-2 transition-all cursor-pointer active:scale-95 shadow-sm ${
                            member.membershipType === "light"
                              ? "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
                              : "bg-ag-lime-100 text-ag-lime-700 border-ag-lime-300 hover:bg-ag-lime-200"
                          }`}
                        >
                          {member.membershipType === "light" ? "ライト" : "オフィシャル"}
                        </button>
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
                        <div className="flex flex-col gap-1.5 ">
                          {getGymRoleBadge(member.gymRoles?.threeDistrictRep, "bg-amber-100 text-amber-800 border-amber-200")}
                          {getGymRoleBadge(member.gymRoles?.threeDistrictContact, "bg-white text-amber-600 border-amber-100")}
                          {getGymRoleBadge(member.gymRoles?.otherRep, "bg-ag-gray-100 text-ag-gray-700 border-ag-gray-200")}
                          {!member.gymRoles?.threeDistrictRep && !member.gymRoles?.threeDistrictContact && !member.gymRoles?.otherRep && <span className="text-xs text-ag-gray-300">-</span>}
                        </div>
                      </td>

                      {/* 基本情報 */}
                      <td className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-ag-gray-500">
                          <div><span className="text-ag-gray-300 font-bold mr-1">年齢:</span><span className="text-ag-gray-800 font-extrabold">{fiscalAge ? `${fiscalAge}歳` : "-"}</span></div>
                          <div><span className="text-ag-gray-300 font-bold mr-1">入会:</span><span className="font-medium">{member.joinedDate || "-"}</span></div>
                          <div className="col-span-2"><span className="text-ag-gray-300 font-bold mr-1">生月:</span><span>{member.birthday || "-"}</span></div>
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
      {/* メンバー編集モーダル */}
      {editingMember && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-ag-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setEditingMember(null)} />
          <div className="relative w-full sm:max-w-lg rounded-[2.5rem] bg-white shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-br from-ag-lime-600 to-ag-lime-700 text-white px-8 py-6">
              <h2 className="text-2xl font-black tracking-tight">
                {editingMember.name} の情報編集
              </h2>
              <p className="text-sm font-bold text-white/70 mt-1">
                ※将来的には本人・代表・事務局のみ編集可能にする予定です
              </p>
            </div>
            <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* 氏名・役職 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">氏名</label>
                  <input type="text" value={editForm.name || ""}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">役職</label>
                  <input type="text" value={editForm.role || ""}
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                    placeholder="例: 代表, 会計, 事務局"
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
                </div>
              </div>

              {/* 連絡先 */}
              <div>
                <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">メールアドレス</label>
                <input type="email" value={editForm.email || ""}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
              </div>
              <div>
                <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">電話番号</label>
                <input type="tel" value={editForm.phone || ""}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
              </div>

              {/* 住所 */}
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">郵便番号</label>
                  <input type="text" value={editForm.postCode || ""}
                    onChange={e => setEditForm({...editForm, postCode: e.target.value})}
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">住所</label>
                  <input type="text" value={editForm.address || ""}
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
                </div>
              </div>

              {/* 日バ・ID / 審判 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">日バID</label>
                  <input type="text" value={editForm.jbaId || ""}
                    onChange={e => setEditForm({...editForm, jbaId: e.target.value})}
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">審判更新年</label>
                  <input type="text" value={editForm.refereeYear || ""}
                    onChange={e => setEditForm({...editForm, refereeYear: e.target.value})}
                    placeholder="例: 2027"
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
                </div>
              </div>

              {/* 生年月日・入会日 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">生年月日 (YYYY/MM/DD)</label>
                  <input type="text" value={editForm.birthday || ""}
                    onChange={e => setEditForm({...editForm, birthday: e.target.value})}
                    placeholder="例: 1974/9/9"
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">入会日 (YYYY/MM)</label>
                  <input type="text" value={editForm.joinedDate || ""}
                    onChange={e => setEditForm({...editForm, joinedDate: e.target.value})}
                    placeholder="例: 2010/6"
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
                </div>
              </div>

              {/* はまっこ期限 */}
              <div>
                <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">はまっこ期限 (YYYY/MM/DD)</label>
                <input type="text" value={editForm.hamakkoExpiry || ""}
                  onChange={e => setEditForm({...editForm, hamakkoExpiry: e.target.value})}
                  placeholder="例: 2028/8/31"
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm" />
              </div>

              {/* パーソナル情報 */}
              <div className="pt-2 border-t border-ag-gray-100 space-y-4">
                <p className="text-xs font-black text-ag-gray-400 uppercase tracking-widest">パーソナル情報</p>

                {/* 血液型 */}
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">血液型</label>
                  <div className="flex gap-2">
                    {(["A", "B", "O", "AB"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, bloodType: editForm.bloodType === t ? undefined : t })}
                        className={`flex-1 py-2 rounded-xl text-sm font-black border-2 transition-all ${
                          editForm.bloodType === t
                            ? "bg-rose-500 border-rose-500 text-white"
                            : "bg-white border-ag-gray-200 text-ag-gray-500 hover:border-rose-300"
                        }`}
                      >
                        {t}型
                      </button>
                    ))}
                  </div>
                </div>

                {/* 出身地 */}
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">出身地</label>
                  <select
                    value={editForm.hometown || ""}
                    onChange={(e) => setEditForm({ ...editForm, hometown: e.target.value || undefined })}
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-3 text-base font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm"
                  >
                    <option value="">未選択</option>
                    {["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* スポーツ歴 */}
                <div>
                  <label className="text-xs font-black text-ag-gray-500 block mb-1 ml-1">過去の部活・スポーツ歴</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editForm.sportsHistory || []).map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 bg-ag-lime-100 text-ag-lime-800 text-xs font-bold px-3 py-1 rounded-full border border-ag-lime-200">
                        {tag}
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, sportsHistory: (editForm.sportsHistory || []).filter((_, j) => j !== i) })}
                          className="text-ag-lime-500 hover:text-red-500 ml-0.5 font-black leading-none"
                        >×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editTagInput.trim()) {
                          e.preventDefault();
                          const val = editTagInput.trim();
                          if (!(editForm.sportsHistory || []).includes(val)) {
                            setEditForm({ ...editForm, sportsHistory: [...(editForm.sportsHistory || []), val] });
                          }
                          setEditTagInput("");
                        }
                      }}
                      placeholder="例: バドミントン部（Enterで追加）"
                      className="flex-1 bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-4 py-2.5 text-sm font-bold focus:border-ag-lime-400 focus:bg-white outline-none shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = editTagInput.trim();
                        if (val && !(editForm.sportsHistory || []).includes(val)) {
                          setEditForm({ ...editForm, sportsHistory: [...(editForm.sportsHistory || []), val] });
                        }
                        setEditTagInput("");
                      }}
                      className="px-4 py-2 bg-ag-lime-100 text-ag-lime-700 rounded-xl text-xs font-black hover:bg-ag-lime-200 transition-colors"
                    >
                      追加
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setEditingMember(null)}
                  className="flex-1 py-4 text-lg font-black text-ag-gray-400 border-2 border-ag-gray-100 rounded-2xl hover:bg-ag-gray-50 transition-all">
                  キャンセル
                </button>
                <button onClick={handleEditSave} disabled={isSaving}
                  className="flex-[2] py-4 bg-ag-lime-600 text-white rounded-2xl text-xl font-black hover:bg-ag-lime-700 shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {isSaving ? "保存中..." : "変更を保存する"}
                </button>
              </div>
            </div>
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
