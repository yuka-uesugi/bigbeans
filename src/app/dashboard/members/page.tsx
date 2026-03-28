"use client";

import { useState } from "react";
import { memberList, Member } from "@/data/memberList";

export default function MembersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = memberList.filter(m => 
    m.name.includes(searchTerm) || 
    m.email.includes(searchTerm) || 
    m.address.includes(searchTerm) ||
    m.role?.includes(searchTerm)
  );

  const getGymRoleBadge = (role: string | undefined, color: string) => {
    if (!role) return null;
    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${color}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-fade-in-up pb-24">
      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">👥</span>
            メンバー名簿（2026年2月現在）
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            チームの全メンバー情報です。役職、連絡先、各施設の担当状況などを確認できます。
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
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-ag-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ag-lime-500 bg-white"
            />
          </div>
          <button className="px-5 py-2.5 bg-ag-lime-50 text-ag-lime-700 font-bold text-sm rounded-2xl border border-ag-lime-200 hover:bg-ag-lime-100 transition-all flex items-center gap-2 shadow-sm cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            名簿出力 (CSV)
          </button>
        </div>
      </div>

      {/* 名簿テーブル */}
      <div className="bg-white rounded-3xl border border-ag-gray-200/60 shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-ag-gray-50/80 border-b border-ag-gray-200 text-[10px] font-bold text-ag-gray-500 uppercase tracking-widest">
                <th className="px-4 py-4 whitespace-nowrap sticky left-0 bg-ag-gray-50 z-10 shadow-sm">氏名 / 役職</th>
                <th className="px-4 py-4 whitespace-nowrap">日バID / 審判</th>
                <th className="px-4 py-4 whitespace-nowrap">連絡先 / 住所</th>
                <th className="px-4 py-4 whitespace-nowrap border-l border-ag-gray-100 bg-emerald-50/30 text-emerald-800">施設担当 (都筑)</th>
                <th className="px-4 py-4 whitespace-nowrap bg-sky-50/30 text-sky-800">施設担当 (スポセン)</th>
                <th className="px-4 py-4 whitespace-nowrap bg-amber-50/30 text-amber-800">施設担当 (他)</th>
                <th className="px-4 py-4 whitespace-nowrap">基本情報 (年齢・入会)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ag-gray-50">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-ag-lime-50/20 transition-colors group">
                  {/* 氏名 / 役職 */}
                  <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-ag-lime-50/20 z-10 shadow-sm transition-colors border-r border-ag-gray-50">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ag-gray-900 text-sm">{member.name}</span>
                        {member.role && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-sm ${
                            member.role === '代表' ? 'bg-red-500 text-white border-red-600' :
                            member.role === '会計' ? 'bg-amber-400 text-white border-amber-500' :
                            'bg-sky-100 text-sky-700 border-sky-200'
                          }`}>
                            {member.role}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-ag-gray-400 font-mono">#{String(member.id).padStart(2, '0')}</span>
                    </div>
                  </td>

                  {/* 日バID / 審判 */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono text-ag-gray-700">{member.jbaId || "-"}</span>
                      {member.refereeYear && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] bg-ag-gray-100 text-ag-gray-500 px-1 py-0.5 rounded">審判</span>
                          <span className="text-[10px] font-bold text-ag-gray-400">'{member.refereeYear.slice(-2)}期</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 連絡先 / 住所 */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1 max-w-[200px]">
                      <a href={`mailto:${member.email}`} className="text-[11px] font-medium text-ag-lime-700 hover:underline truncate">{member.email}</a>
                      <a href={`tel:${member.phone}`} className="text-[10px] font-mono font-bold text-ag-gray-500 hover:text-ag-lime-600">{member.phone}</a>
                      <span className="text-[10px] text-ag-gray-400 truncate mt-0.5">{member.postCode} {member.address}</span>
                    </div>
                  </td>

                  {/* 施設担当 (都筑) */}
                  <td className="px-4 py-4 border-l border-ag-gray-50 bg-emerald-50/10">
                    <div className="flex flex-col gap-1.5">
                      {getGymRoleBadge(member.gymRoles.tsuzukiRep, "bg-emerald-100 text-emerald-800 border-emerald-200")}
                      {getGymRoleBadge(member.gymRoles.tsuzukiContact, "bg-white text-emerald-600 border-emerald-100")}
                      {!member.gymRoles.tsuzukiRep && !member.gymRoles.tsuzukiContact && <span className="text-xs text-ag-gray-300">-</span>}
                    </div>
                  </td>

                  {/* 施設担当 (スポセン) */}
                  <td className="px-4 py-4 bg-sky-50/10">
                    <div className="flex flex-col gap-1.5">
                      {getGymRoleBadge(member.gymRoles.sposenRep, "bg-sky-100 text-sky-800 border-sky-200")}
                      {getGymRoleBadge(member.gymRoles.sposenMember, "bg-white text-sky-600 border-sky-100")}
                      {!member.gymRoles.sposenRep && !member.gymRoles.sposenMember && <span className="text-xs text-ag-gray-300">-</span>}
                    </div>
                  </td>

                  {/* 施設担当 (他) */}
                  <td className="px-4 py-4 bg-amber-50/10">
                    <div className="flex flex-col gap-1.5">
                      {getGymRoleBadge(member.gymRoles.threeDistrictRep, "bg-amber-100 text-amber-800 border-amber-200")}
                      {getGymRoleBadge(member.gymRoles.threeDistrictContact, "bg-white text-amber-600 border-amber-100")}
                      {getGymRoleBadge(member.gymRoles.otherRep, "bg-ag-gray-100 text-ag-gray-700 border-ag-gray-200")}
                      {!member.gymRoles.threeDistrictRep && !member.gymRoles.threeDistrictContact && !member.gymRoles.otherRep && <span className="text-xs text-ag-gray-300">-</span>}
                    </div>
                  </td>

                  {/* 基本情報 */}
                  <td className="px-4 py-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-ag-gray-500">
                      <div><span className="text-ag-gray-300 font-bold mr-1">年齢:</span><span className="text-ag-gray-700 font-bold">{member.age || "-"}歳</span></div>
                      <div><span className="text-ag-gray-300 font-bold mr-1">入会:</span><span>{member.joinedDate || "-"}</span></div>
                      <div className="col-span-2"><span className="text-ag-gray-300 font-bold mr-1">生月:</span><span>{member.birthday || "-"}</span></div>
                      {member.hamakkoExpiry && (
                        <div className="col-span-2 mt-1">
                          <span className="text-pink-600/60 font-bold mr-1">はまっこ:</span>
                          <span className="text-pink-600 font-mono text-[9px]">{member.hamakkoExpiry}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* フッター情報 */}
        <div className="px-6 py-4 bg-ag-gray-50 border-t border-ag-gray-100 flex items-center justify-between">
          <p className="text-[10px] text-ag-gray-400 font-medium">
            全 {memberList.length} 名在籍
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] text-ag-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> 役員
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-ag-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 施設担当
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
