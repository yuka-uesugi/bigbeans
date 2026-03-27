"use client";

import { useState } from "react";

interface MemberFacility {
  scId?: string;
  teamName: string;
  role: string;
}

interface Member {
  id: string;
  name: string;
  kana: string;
  gender: "男性" | "女性";
  dob: string;
  phone: string;
  address: string;
  role: "管理者" | "メンバー";
  status: "在籍" | "退部" | "休部";
  membership: "通常会員" | "ライト会員" | "ライト申請中" | "退部予定";
  executiveRole: string; // 現在の役員・役職名
  executiveHistory: { year: string, role: string }[]; // 過去の役員履歴
  
  // 資格・登録
  registrationNo: string;
  umpire: string; // 「あり(有効期限)」 または 「-」
  years: { [year: string]: { membership?: string, jba: boolean, pref: boolean, city: boolean, ward: boolean } };
  
  // 施設・ID (複数枚保持対応)
  sportsCenters: MemberFacility[];
  districts: MemberFacility[];
}

const mockMembers: Member[] = [
  {
    id: "m1",
    name: "上杉 由香",
    kana: "ウエスギ ユカ",
    gender: "女性",
    dob: "1985/04/12",
    phone: "090-XXXX-XXXX",
    address: "神奈川県横浜市青葉区...",
    role: "管理者",
    status: "在籍",
    membership: "通常会員",
    executiveRole: "会長",
    executiveHistory: [{ year: "2023", role: "会計" }, { year: "2024", role: "副会長" }],
    registrationNo: "14-0001",
    umpire: "あり(2027-03-31)",
    years: {
      "2025": { membership: "通常会員", jba: true, pref: true, city: true, ward: true },
      "2026": { membership: "通常会員", jba: false, pref: false, city: false, ward: false },
    },
    sportsCenters: [{ scId: "SC-123", teamName: "ベリー", role: "構成員" }],
    districts: [{ teamName: "セカンドゲーム", role: "連絡者" }, { teamName: "ビッグビーンズ", role: "代表者" }]
  },
  {
    id: "m2",
    name: "山本 健太",
    kana: "ヤマモト ケンタ",
    gender: "男性",
    dob: "1990/08/25",
    phone: "080-XXXX-XXXX",
    address: "神奈川県横浜市都筑区中川...",
    role: "メンバー",
    status: "在籍",
    membership: "ライト会員",
    executiveRole: "会計",
    executiveHistory: [],
    registrationNo: "14-0025",
    umpire: "なし",
    years: {
      "2025": { membership: "ライト会員", jba: true, pref: true, city: false, ward: true },
      "2026": { membership: "ライト会員", jba: true, pref: true, city: false, ward: true },
    },
    sportsCenters: [{ scId: "SC-888", teamName: "レグルス", role: "代表者" }],
    districts: [{ teamName: "都筑中川地区センター", role: "代表者" }]
  },
  {
    id: "m3",
    name: "五十嵐 美咲",
    kana: "イガラシ ミサキ",
    gender: "女性",
    dob: "1993/11/03",
    phone: "070-XXXX-XXXX",
    address: "神奈川県川崎市高津区...",
    role: "メンバー",
    status: "退部",
    membership: "退部予定",
    executiveRole: "なし",
    executiveHistory: [{ year: "2022", role: "合宿係" }],
    registrationNo: "14-0033",
    umpire: "なし",
    years: {
      "2025": { membership: "退部予定", jba: false, pref: false, city: false, ward: false },
      "2026": { membership: "退部予定", jba: false, pref: false, city: false, ward: false },
    },
    sportsCenters: [{ scId: "SC-999", teamName: "ビッグビーンズ", role: "構成員" }],
    districts: [{ teamName: "ビッグビーンズ", role: "代表者" }]
  },
];

// チェックマーク用コンポーネント
const CheckMark = ({ checked, label }: { checked: boolean, label: string }) => {
  if (!checked) return <span className="text-[10px] text-ag-gray-300 font-bold hidden md:inline-block w-6 text-center">-</span>;
  return (
    <div className="flex flex-col items-center">
      <span className="text-ag-lime-500 text-sm">✔︎</span>
      <span className="text-[9px] text-ag-gray-500">{label}</span>
    </div>
  );
};

export default function MembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewYear, setViewYear] = useState("2025");

  const filteredActive = mockMembers.filter(m => 
    (m.status === "在籍" || m.status === "休部") &&
    (m.name.includes(searchTerm) || m.kana.includes(searchTerm) || m.address.includes(searchTerm))
  );

  const filteredRetired = mockMembers.filter(m => 
    m.status === "退部" &&
    (m.name.includes(searchTerm) || m.kana.includes(searchTerm) || m.address.includes(searchTerm))
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up pb-24">
      {/* ページヘッダー */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">👥</span>
            メンバー名簿（エントリー＆登録情報）
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            大会エントリーに必要な情報や、各種登録状況の確認ができます。※パスワードはマイページでのみ確認可能です。
          </p>
        </div>
        
        {/* 検索・アクション */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* 年度切り替え */}
          <div className="flex items-center gap-2 bg-ag-gray-50 border border-ag-gray-200 px-3 py-1.5 rounded-xl text-sm font-bold">
            <span className="text-ag-gray-500 text-xs">表示年度:</span>
            <select value={viewYear} onChange={(e) => setViewYear(e.target.value)} className="bg-transparent text-ag-lime-700 outline-none cursor-pointer">
              <option value="2025">2025年度</option>
              <option value="2026">2026年度</option>
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="名前や住所で検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-ag-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ag-lime-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 bg-ag-lime-50 text-ag-lime-600 font-bold text-sm rounded-xl border border-ag-lime-200 hover:bg-ag-lime-100 transition-colors whitespace-nowrap">
            CSV出力
          </button>
        </div>
      </div>

      {/* 名簿テーブル */}
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-ag-gray-50/50 border-b border-ag-gray-200 text-[11px] font-bold text-ag-gray-500 uppercase tracking-wider">
                <th className="px-3 py-3 whitespace-nowrap">氏名/フリガナ</th>
                <th className="px-3 py-3 whitespace-nowrap">性別/生年月日</th>
                <th className="px-3 py-3 whitespace-nowrap">連絡先</th>
                <th className="px-3 py-3 whitespace-nowrap">各種登録・審判</th>
                <th className="px-3 py-3 whitespace-nowrap border-l border-ag-gray-200/50 bg-sky-50/20 text-sky-800">ハマスポ枠・ID</th>
                <th className="px-3 py-3 whitespace-nowrap bg-amber-50/20 text-amber-800">地区センター枠</th>
                <th className="px-3 py-3 whitespace-nowrap text-center">コピー</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ag-gray-100">
              {filteredActive.map((member) => (
                <tr key={member.id} className={`hover:bg-ag-lime-50/30 transition-colors group ${member.status === "休部" ? "opacity-70" : ""}`}>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ag-gray-900 text-sm whitespace-nowrap">{member.name}</span>
                        {member.status === "休部" && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">休部</span>}
                        {member.membership === "ライト会員" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded border border-sky-200">
                            ライト
                          </span>
                        )}
                        {member.membership === "ライト申請中" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200 animate-pulse">
                            ライト申請中
                          </span>
                        )}
                        {member.executiveRole !== "なし" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">
                            {member.executiveRole}
                          </span>
                        )}
                      </div>
                      {/* 過去の役員履歴 */}
                      {member.executiveHistory && member.executiveHistory.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.executiveHistory.map((hist, idx) => (
                            <span key={idx} className="text-[8px] font-bold px-1 py-0.5 bg-ag-gray-100 text-ag-gray-500 rounded border border-ag-gray-200">
                              {hist.year} {hist.role}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-ag-gray-800 font-semibold">{member.gender}</span>
                      <span className="text-[10px] font-semibold text-ag-gray-500">{member.dob}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono text-ag-gray-700">{member.phone}</span>
                      <span className="text-[10px] text-ag-gray-500 max-w-[120px] truncate" title={member.address}>{member.address}</span>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex items-center gap-4">
                      {/* 各種登録 */}
                      <div className="flex gap-1.5 bg-ag-gray-50 rounded px-2 py-1 border border-ag-gray-100">
                        {member.years[viewYear] ? (
                          <>
                            <CheckMark checked={member.years[viewYear].jba} label="日バ" />
                            <CheckMark checked={member.years[viewYear].pref} label="県" />
                            <CheckMark checked={member.years[viewYear].city} label="市" />
                            <CheckMark checked={member.years[viewYear].ward} label="区" />
                          </>
                        ) : (
                          <span className="text-[10px] text-ag-gray-400 p-1">未設定</span>
                        )}
                      </div>
                      
                      {/* 審判 */}
                      {member.umpire !== "なし" && (
                         <div className="flex flex-col items-center justify-center border border-ag-lime-200 bg-ag-lime-50 rounded px-1.5 py-0.5">
                           <span className="text-[9px] font-bold text-ag-lime-800">審判</span>
                         </div>
                       )}
                    </div>
                  </td>

                  {/* スポセン（ハマスポ）枠 */}
                  <td className="px-3 py-3 border-l border-ag-gray-200/50 bg-sky-50/10">
                    {member.sportsCenters.length === 0 || member.sportsCenters.every(sc => sc.role === "なし") ? (
                      <span className="text-xs text-ag-gray-300">-</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {member.sportsCenters.filter(sc => sc.role !== "なし").map((sc, i) => (
                          <div key={i} className="flex flex-col gap-0.5 pb-2 border-b border-sky-100/50 last:border-0 last:pb-0 relative">
                            <div className="flex items-center gap-1.5 w-max">
                              <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${sc.role === '代表者' ? 'bg-sky-500 text-white' : 'border border-sky-300 text-sky-700'}`}>
                                {sc.role}
                              </span>
                              <span className="text-[11px] font-bold text-ag-gray-800">{sc.teamName}</span>
                            </div>
                            <span className="text-[10px] font-mono text-ag-gray-500">{sc.scId}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  
                  {/* 地区センター枠 */}
                  <td className="px-3 py-3 bg-amber-50/10">
                    {member.districts.length === 0 || member.districts.every(dist => dist.role === "なし") ? (
                      <span className="text-xs text-ag-gray-300">-</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {member.districts.filter(dist => dist.role !== "なし").map((dist, i) => (
                          <div key={i} className="flex items-center gap-1.5 w-max">
                            <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${dist.role === '代表者' ? 'bg-amber-500 text-white' : 'border border-amber-300 text-amber-700'}`}>
                              {dist.role}
                            </span>
                            <span className="text-[11px] font-bold text-ag-gray-800">{dist.teamName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <button 
                      onClick={() => navigator.clipboard.writeText(`${member.name}\t${member.kana}\t${member.dob}\t${member.registrationNo}\t${member.phone}\t${member.address}\t${member.years[viewYear]?.jba ? '日バ登録済' : ''}`)}
                      className="text-ag-gray-400 hover:text-ag-lime-500 transition-colors p-1.5 rounded-lg hover:bg-ag-lime-50 mx-auto block"
                      title="エントリー用の情報を一括コピー"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}

              {/* 退部者（施設カードなどの履歴保持） */}
              {filteredRetired.length > 0 && (
                <>
                  <tr className="bg-stone-50"><td colSpan={7} className="px-3 py-2 text-xs font-bold text-stone-500 border-t border-b border-stone-200">退部・履歴保持メンバー（施設カード等のため名前が残っています）</td></tr>
                  {filteredRetired.map((member) => (
                    <tr key={member.id} className="bg-stone-50/30 hover:bg-stone-100/50 transition-colors group opacity-60">
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-700 text-sm whitespace-nowrap">{member.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-stone-200 text-stone-600 rounded">退部</span>
                          </div>
                          {/* 過去の役員履歴 */}
                          {member.executiveHistory && member.executiveHistory.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.executiveHistory.map((hist, idx) => (
                                <span key={idx} className="text-[8px] font-bold px-1 py-0.5 bg-stone-200 text-stone-500 rounded border border-stone-300">
                                  {hist.year} {hist.role}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-stone-500">{member.gender}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] text-stone-400">非表示 (退部)</span>
                      </td>
                      <td className="px-3 py-3"><span className="text-xs text-stone-400">-</span></td>
                      {/* スポセン（ハマスポ）枠 */}
                      <td className="px-3 py-3 border-l border-stone-200/50 bg-stone-100/20">
                        {member.sportsCenters.length === 0 || member.sportsCenters.every(sc => sc.role === "なし") ? (
                          <span className="text-xs text-stone-300">-</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {member.sportsCenters.filter(sc => sc.role !== "なし").map((sc, i) => (
                              <div key={i} className="flex items-center gap-1.5 w-max">
                                <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${sc.role === '代表者' ? 'bg-stone-400 text-white' : 'border border-stone-300 text-stone-500'}`}>
                                  {sc.role}
                                </span>
                                <span className="text-[11px] font-bold text-stone-600">{sc.teamName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      
                      {/* 地区センター枠 */}
                      <td className="px-3 py-3 bg-stone-100/10">
                        {member.districts.length === 0 || member.districts.every(dist => dist.role === "なし") ? (
                          <span className="text-xs text-stone-300">-</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {member.districts.filter(dist => dist.role !== "なし").map((dist, i) => (
                              <div key={i} className="flex items-center gap-1.5 w-max">
                                <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${dist.role === '代表者' ? 'bg-stone-400 text-white' : 'border border-stone-300 text-stone-500'}`}>
                                  {dist.role}
                                </span>
                                <span className="text-[11px] font-bold text-stone-600">{dist.teamName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">-</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
