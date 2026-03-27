"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // モックデータ: 大会エントリー情報や各種資格・IDを含む
  const [profile, setProfile] = useState({
    name: user?.displayName || "管理者",
    kana: "カンリシャ",
    gender: "指定なし",
    dob: "1990-01-01",
    phone: "090-0000-0000",
    address: "神奈川県横浜市青葉区...",
    status: "在籍",
    role: "admin", 
    executiveRole: "会長",
    executiveHistory: [
      { id: "1", year: "2023", role: "会計" },
      { id: "2", year: "2024", role: "副会長" },
    ],
    email: user?.email || "admin@example.com",
    playStyle: "Right", 
    experience: "10年以上",
    racket: "ASTROX 100 ZZ",
    // 競技・登録状況 (年度別管理)
    registrations: {
      jbaNum: "14-0001",
      umpire: true,
      umpireExpiry: "2027-03-31",
      years: { // 年度別の登録有無ステータス
        "2025": { membership: "通常会員", jba: true, pref: true, city: true, ward: true },
        "2026": { membership: "通常会員", reason: "", jba: false, pref: false, city: false, ward: false }, // 年末に更新する用
      }
    },
    // 施設予約・抽選登録状況（複数枚持てるように配列化）
    facility: {
      sportsCenters: [
        { id: "1", scId: "SC-12345678", teamName: "ベリー", role: "構成員", expiry: "2028-03-31" },
      ],
      districts: [
        { id: "1", teamName: "ビッグビーンズ", role: "連絡者" },
      ],
      passwordNote: "pass1234! (生年月日で登録)", // 備考欄のPW（名簿には出ない）
    },
    notifications: {
      practiceReminder: true,
      budgetAlert: true,
      inventoryAlert: true,
      surveyNew: true,
    }
  });

  const handleSave = () => {
    // 実際にデータベース(Firestore等)へ保存する処理
    setIsEditing(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-20">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">👤</span>
            マイページ（プロフィールと登録情報）
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            大会エントリー情報や各種登録状況を管理します。ここで入力した情報は自動的に「メンバー名簿」と同期されます。
          </p>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <button 
              onClick={handleSave}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-md shadow-ag-lime-500/20"
            >
              変更を保存する
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-white border border-ag-gray-200 text-ag-gray-700 hover:bg-ag-gray-50 transition-colors"
            >
              プロフィールを編集
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        
        {/* プライマリ情報（アバターと基本の連絡先） */}
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-ag-lime-100/50 to-transparent rounded-bl-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-md bg-gradient-to-tr from-ag-lime-400 to-emerald-400 flex items-center justify-center text-white text-3xl font-bold">
              {profile.name[0]}
            </div>

            <div className="flex-1 space-y-2 w-full">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {isEditing ? (
                  <div className="flex gap-2 w-full md:w-auto">
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      placeholder="氏名"
                      className="text-xl font-bold text-ag-gray-900 border-b-2 border-ag-lime-500 focus:outline-none bg-transparent w-full px-1"
                    />
                    <input 
                      type="text" 
                      value={profile.kana}
                      onChange={(e) => setProfile({...profile, kana: e.target.value})}
                      placeholder="フリガナ"
                      className="text-sm font-bold text-ag-gray-600 border-b-2 border-ag-lime-500 focus:outline-none bg-transparent w-full px-1"
                    />
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-ag-gray-900">{profile.name}</h2>
                    <span className="text-sm text-ag-gray-500">{profile.kana}</span>
                  </div>
                )}
                
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.executiveRole}
                    onChange={(e) => setProfile({...profile, executiveRole: e.target.value})}
                    placeholder="役職 (例: 会長, なし)"
                    className="w-32 px-2 py-1 text-xs font-bold bg-white border border-ag-gray-200 rounded-lg focus:ring-2 focus:ring-ag-lime-500"
                  />
                ) : (
                  profile.executiveRole !== "なし" && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full w-max mt-1 md:mt-0 bg-yellow-100 text-yellow-800 border border-yellow-200">
                      🏅 {profile.executiveRole}
                    </span>
                  )
                )}

                <span className={`px-2.5 py-1 text-xs font-bold rounded-full w-max mt-1 md:mt-0 bg-emerald-100 text-emerald-800 border border-emerald-200`}>
                  👑 管理者
                </span>
              </div>
              <p className="text-sm text-ag-gray-500">{profile.email}</p>
              
              <div className="mt-4 border-t border-ag-gray-100 pt-3">
                <h4 className="text-[10px] font-bold text-ag-gray-400 mb-2 uppercase">過去の役員履歴</h4>
                {isEditing ? (
                  <div className="space-y-2">
                    {profile.executiveHistory.map((hist, index) => (
                      <div key={hist.id} className="flex items-center gap-2">
                        <input type="text" value={hist.year} onChange={(e) => {
                          const newHist = [...profile.executiveHistory];
                          newHist[index].year = e.target.value;
                          setProfile({...profile, executiveHistory: newHist});
                        }} className="w-20 px-2 py-1 text-xs border border-ag-gray-200 rounded" placeholder="年度" />
                        <input type="text" value={hist.role} onChange={(e) => {
                          const newHist = [...profile.executiveHistory];
                          newHist[index].role = e.target.value;
                          setProfile({...profile, executiveHistory: newHist});
                        }} className="flex-1 px-2 py-1 text-xs border border-ag-gray-200 rounded" placeholder="役職名" />
                        <button onClick={() => {
                          setProfile({...profile, executiveHistory: profile.executiveHistory.filter(h => h.id !== hist.id)});
                        }} className="text-red-400 hover:text-red-600 font-bold px-1">×</button>
                      </div>
                    ))}
                    <button onClick={() => setProfile({...profile, executiveHistory: [...profile.executiveHistory, { id: Date.now().toString(), year: "2025", role: "" }]})} className="text-[10px] bg-ag-gray-100 text-ag-gray-600 px-2 py-1 rounded hover:bg-ag-gray-200 font-bold">+ 履歴を追加</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.executiveHistory.length > 0 ? profile.executiveHistory.map(hist => (
                      <span key={hist.id} className="text-[10px] px-2 py-0.5 bg-ag-gray-100 text-ag-gray-600 rounded border border-ag-gray-200 font-bold">
                        {hist.year} {hist.role}
                      </span>
                    )) : (
                      <span className="text-[10px] text-ag-gray-400">履歴なし</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 連絡先と基本情報 (エントリーに必須) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-1.5 md:col-span-2 bg-ag-gray-50/50 p-4 rounded-xl border border-ag-gray-100">
               <label className="text-xs font-bold text-ag-gray-500">チーム在籍ステータス</label>
               {isEditing ? (
                 <select value={profile.status} onChange={(e) => setProfile({...profile, status: e.target.value})} className="w-full sm:w-64 block bg-white border border-ag-gray-200 rounded-lg px-4 py-2 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-500">
                    <option value="在籍">在籍中</option>
                    <option value="退部">退部（履歴として保持）</option>
                    <option value="休部">休部中</option>
                 </select>
               ) : (
                 <div className="flex items-center gap-2 mt-1">
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${profile.status === "在籍" ? "bg-ag-lime-100 text-ag-lime-700 border border-ag-lime-200" : profile.status === "休部" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-stone-200 text-stone-600 border border-stone-300"}`}>
                     {profile.status === "在籍" ? "🎾 在籍中" : profile.status === "休部" ? "💤 休部中" : "👋 退部済み"}
                   </span>
                   {profile.status === "退部" && <span className="text-[10px] text-ag-gray-400">※施設予約カード等に名前が残っているため名簿上に履歴として保持されています</span>}
                 </div>
               )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-400">生年月日</label>
              {isEditing ? (
                <input type="date" value={profile.dob} onChange={(e) => setProfile({...profile, dob: e.target.value})} className="w-full bg-white border border-ag-gray-200 rounded-lg px-4 py-2 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-500" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2 rounded-lg">{profile.dob}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-400">性別</label>
              {isEditing ? (
                <select value={profile.gender} onChange={(e) => setProfile({...profile, gender: e.target.value})} className="w-full bg-white border border-ag-gray-200 rounded-lg px-4 py-2 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-500">
                  <option>男性</option><option>女性</option><option>指定なし</option>
                </select>
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2 rounded-lg">{profile.gender}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-400">電話番号</label>
              {isEditing ? (
                <input type="tel" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full bg-white border border-ag-gray-200 rounded-lg px-4 py-2 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-500" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2 rounded-lg">{profile.phone}</p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-ag-gray-400">現住所</label>
              {isEditing ? (
                <input type="text" value={profile.address} onChange={(e) => setProfile({...profile, address: e.target.value})} className="w-full bg-white border border-ag-gray-200 rounded-lg px-4 py-2 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-500" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2 rounded-lg">{profile.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* -------------------- 競技・資格登録情報 -------------------- */}
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-ag-gray-900 mb-5 flex items-center gap-2">
            <span className="text-ag-lime-500">🏸</span> 大会・資格登録状況
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* 地方連盟・協会登録 (年度ごと) */}
            <div className="space-y-4 md:col-span-2 p-4 border border-ag-gray-100 rounded-xl bg-ag-gray-50/50">
              <div className="flex items-center justify-between border-b border-ag-gray-200 pb-2">
                <h4 className="text-sm font-bold text-ag-gray-800">各協会・連盟 登録状況（年度別）</h4>
                <p className="text-xs text-ag-gray-500">※年末に次年度分をチェック</p>
              </div>
              
              <div className="space-y-4">
                {Object.keys(profile.registrations.years).sort().reverse().map((year) => (
                  <div key={year} className="flex flex-col sm:flex-row gap-4 items-start bg-white p-3 rounded-xl border border-ag-gray-100 shadow-sm relative">
                    <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[120px]">
                      <span className="text-sm font-extrabold text-ag-lime-700">{year}年度</span>
                      <div className="flex flex-col gap-1">
                        <select 
                          value={(profile.registrations.years as any)[year].membership || "通常会員"} 
                          onChange={(e) => {
                            const newYears = {...profile.registrations.years};
                            (newYears as any)[year].membership = e.target.value;
                            if (e.target.value !== "ライト会員(未申請)") {
                              (newYears as any)[year].reason = "";
                            }
                            setProfile({...profile, registrations: {...profile.registrations, years: newYears}});
                          }}
                          disabled={!isEditing}
                          className={`text-xs font-bold border rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-ag-lime-400 ${(profile.registrations.years as any)[year].membership?.includes('ライト') ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-ag-gray-50 border-ag-gray-200 text-ag-gray-700'}`}
                        >
                          <option value="通常会員">通常会員</option>
                          <option value="ライト会員(未申請)">ライト会員 (に移行したい)</option>
                          <option value="ライト会員申請中">ライト申請 (承認待ち)</option>
                          <option value="ライト会員">ライト会員 (承認済)</option>
                          <option value="退部">退部</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-3 w-full">
                      {/* ライト会員申請フォーム */}
                      {(profile.registrations.years as any)[year].membership === "ライト会員(未申請)" && isEditing && (
                        <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200 animate-fade-in-up">
                          <p className="text-[10px] font-bold text-amber-800 mb-1 flex items-center gap-1">
                            <span className="text-sm">⚠️</span> ライト会員になるには事情の公表とメンバーの60%の承認が必要です。
                          </p>
                          <textarea 
                            value={(profile.registrations.years as any)[year].reason || ""}
                            onChange={(e) => {
                              const newYears = {...profile.registrations.years};
                              (newYears as any)[year].reason = e.target.value;
                              setProfile({...profile, registrations: {...profile.registrations, years: newYears}});
                            }}
                            className="w-full text-xs p-2 border border-amber-200 rounded outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                            placeholder="例: 出産や仕事の都合により参加頻度が激減するため"
                            rows={2}
                          ></textarea>
                          <button 
                            type="button"
                            onClick={() => {
                              const newYears = {...profile.registrations.years};
                              (newYears as any)[year].membership = "ライト会員申請中";
                              setProfile({...profile, registrations: {...profile.registrations, years: newYears}});
                            }}
                            disabled={!(profile.registrations.years as any)[year].reason}
                            className="mt-2 w-full text-xs font-bold bg-amber-500 text-white rounded py-1.5 hover:bg-amber-600 shadow-sm disabled:bg-amber-200 disabled:cursor-not-allowed transition-colors"
                          >
                            メンバー宛に承認申請を送信する
                          </button>
                        </div>
                      )}
                      {(profile.registrations.years as any)[year].membership === "ライト会員申請中" && (
                        <div className="bg-sky-50 p-2 rounded-lg border border-sky-200 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-sky-700">⏳ 現在メンバーへ承認を求めています (現在の承認率: 45%)</span>
                          {isEditing && (
                            <button 
                              onClick={() => {
                                const newYears = {...profile.registrations.years};
                                (newYears as any)[year].membership = "通常会員";
                                setProfile({...profile, registrations: {...profile.registrations, years: newYears}});
                              }} 
                              className="text-[10px] text-sky-500 hover:text-sky-700 underline font-bold"
                            >
                              申請取消
                            </button>
                          )}
                        </div>
                      )}

                      {/* 連盟・協会チェックボックス */}
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-ag-gray-50 mt-1">
                        {[
                          { key: 'jba', label: '日本バド協会' },
                          { key: 'pref', label: '県登録' },
                          { key: 'city', label: '横浜市登録' },
                          { key: 'ward', label: '区登録' }
                        ].map(item => {
                          const isChecked = (profile.registrations.years as any)[year][item.key];
                          return (
                            <label key={item.key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${isEditing ? 'cursor-pointer hover:bg-ag-gray-50' : 'opacity-80 cursor-default'} ${isChecked ? 'bg-ag-lime-50 border-ag-lime-300' : 'bg-white border-ag-gray-200'}`}>
                              <input 
                                type="checkbox" 
                                disabled={!isEditing}
                                checked={isChecked} 
                                onChange={(e) => {
                                  const newYears = {...profile.registrations.years};
                                  (newYears as any)[year][item.key] = e.target.checked;
                                  setProfile({...profile, registrations: {...profile.registrations, years: newYears}});
                                }}
                                className="text-ag-lime-500 focus:ring-ag-lime-400 rounded-sm w-3.5 h-3.5"
                              />
                              <span className="text-[11px] font-semibold text-ag-gray-700">{item.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 審判資格 */}
            <div className="flex items-center justify-between p-3 border border-ag-gray-100 rounded-xl bg-ag-gray-50/50">
               <span className="text-sm font-bold text-ag-gray-800">公式審判資格</span>
               {isEditing ? (
                <select value={profile.registrations.umpire ? "あり" : "なし"} onChange={(e) => setProfile({...profile, registrations: {...profile.registrations, umpire: e.target.value === "あり"}})} className="bg-white border border-ag-gray-200 text-sm py-1 px-2 rounded">
                  <option>あり</option><option>なし</option>
                </select>
              ) : (
                <span className={`px-2 py-1 rounded text-xs font-bold ${profile.registrations.umpire ? "bg-amber-100 text-amber-800" : "bg-ag-gray-200 text-ag-gray-600"}`}>
                  {profile.registrations.umpire ? "資格保持者" : "なし"}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-400">審判資格 有効期限</label>
              {isEditing ? (
                <input type="date" value={profile.registrations.umpireExpiry} onChange={(e) => setProfile({...profile, registrations: {...profile.registrations, umpireExpiry: e.target.value}})} className="w-full bg-white border border-ag-gray-200 rounded-lg px-4 py-2 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-500" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2 rounded-lg">{profile.registrations.umpireExpiry}</p>
              )}
            </div>

          </div>
        </div>

        {/* -------------------- スポセン・地区センター登録情報 -------------------- */}
        <div className="bg-white rounded-2xl border border-ag-gray-200/60 p-6 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-ag-lime-500">🏢</span> 
            <h3 className="text-lg font-bold text-ag-gray-900">施設予約（抽選）担当・登録状況</h3>
            <span className="ml-2 text-[10px] bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded border border-sky-200">名簿へ同期</span>
          </div>

          <div className="space-y-8">
            {/* ハマスポ / スポーツセンター */}
            <div className="p-4 border border-ag-gray-100 rounded-xl bg-[#f0f9ff]/30 space-y-4">
              <div className="flex items-center justify-between border-b border-ag-gray-200 pb-2">
                <h4 className="text-sm font-bold text-ag-gray-800">スポーツセンター（ハマスポ）</h4>
                {isEditing && (
                  <button 
                    onClick={() => {
                      const newSc = [...profile.facility.sportsCenters, { id: Date.now().toString(), scId: "", teamName: "", role: "なし", expiry: "" }];
                      setProfile({...profile, facility: {...profile.facility, sportsCenters: newSc}});
                    }}
                    className="text-[10px] font-bold px-2 py-1 bg-sky-100 text-sky-700 rounded hover:bg-sky-200"
                  >
                    + カード追加
                  </button>
                )}
              </div>
              
              {profile.facility.sportsCenters.map((sc, index) => (
                <div key={sc.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3 rounded-lg border border-sky-100 relative">
                  {isEditing && profile.facility.sportsCenters.length > 1 && (
                     <button 
                       onClick={() => {
                         const newSc = profile.facility.sportsCenters.filter(item => item.id !== sc.id);
                         setProfile({...profile, facility: {...profile.facility, sportsCenters: newSc}});
                       }}
                       className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs shadow-sm hover:bg-red-200 z-10"
                     >
                       ×
                     </button>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ag-gray-500">役割</label>
                    {isEditing ? (
                      <select value={sc.role} onChange={(e) => {
                        const newSc = [...profile.facility.sportsCenters];
                        newSc[index].role = e.target.value;
                        setProfile({...profile, facility: {...profile.facility, sportsCenters: newSc}});
                      }} className="w-full bg-white border border-ag-gray-200 rounded-lg px-2 py-1.5 text-xs text-ag-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200">
                        <option>代表者</option><option>構成員</option><option>なし</option>
                      </select>
                    ) : (
                      <p className={`text-xs font-bold px-2 py-1.5 rounded-lg ${sc.role !== "なし" ? "bg-sky-50 text-sky-800" : "bg-ag-gray-50 text-ag-gray-400"}`}>{sc.role}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-ag-gray-500">登録カード名(団体名)</label>
                    {isEditing ? (
                      <input type="text" value={sc.teamName} onChange={(e) => {
                        const newSc = [...profile.facility.sportsCenters];
                        newSc[index].teamName = e.target.value;
                        setProfile({...profile, facility: {...profile.facility, sportsCenters: newSc}});
                      }} className="w-full bg-white border border-ag-gray-200 rounded-lg px-2 py-1.5 text-xs text-ag-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200" placeholder="ex: ベリー" />
                    ) : (
                      <p className="text-xs font-bold text-ag-gray-800 bg-white border border-ag-gray-100 px-2 py-1.5 rounded-lg">{sc.teamName || "-"}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ag-gray-500">個人ID</label>
                    {isEditing ? (
                      <input type="text" value={sc.scId} onChange={(e) => {
                        const newSc = [...profile.facility.sportsCenters];
                        newSc[index].scId = e.target.value;
                        setProfile({...profile, facility: {...profile.facility, sportsCenters: newSc}});
                      }} className="w-full bg-white border border-ag-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono text-ag-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                    ) : (
                      <p className="text-xs font-bold font-mono text-ag-gray-800 bg-white border border-ag-gray-100 px-2 py-1.5 rounded-lg">{sc.scId || "-"}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ag-gray-500">ID有効期限</label>
                    {isEditing ? (
                      <input type="date" value={sc.expiry} onChange={(e) => {
                        const newSc = [...profile.facility.sportsCenters];
                        newSc[index].expiry = e.target.value;
                        setProfile({...profile, facility: {...profile.facility, sportsCenters: newSc}});
                      }} className="w-full bg-white border border-ag-gray-200 rounded-lg px-2 py-1.5 text-xs text-ag-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                    ) : (
                      <p className="text-xs font-bold text-ag-gray-800 bg-white border border-ag-gray-100 px-2 py-1.5 rounded-lg">{sc.expiry || "-"}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 地区センター */}
            <div className="p-4 border border-ag-gray-100 rounded-xl bg-[#fdfaf0]/50 space-y-4">
              <div className="flex items-center justify-between border-b border-ag-gray-200 pb-2">
                <h4 className="text-sm font-bold text-ag-gray-800">地区センター・その他の施設</h4>
                {isEditing && (
                  <button 
                    onClick={() => {
                      const newDist = [...profile.facility.districts, { id: Date.now().toString(), teamName: "", role: "なし" }];
                      setProfile({...profile, facility: {...profile.facility, districts: newDist}});
                    }}
                    className="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                  >
                    + カード追加
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.facility.districts.map((dist, index) => (
                  <div key={dist.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-amber-100 relative">
                     {isEditing && profile.facility.districts.length > 1 && (
                       <button 
                         onClick={() => {
                           const newDist = profile.facility.districts.filter(item => item.id !== dist.id);
                           setProfile({...profile, facility: {...profile.facility, districts: newDist}});
                         }}
                         className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs shadow-sm hover:bg-red-200 z-10"
                       >
                         ×
                       </button>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ag-gray-500">役割</label>
                      {isEditing ? (
                        <select value={dist.role} onChange={(e) => {
                          const newDist = [...profile.facility.districts];
                          newDist[index].role = e.target.value;
                          setProfile({...profile, facility: {...profile.facility, districts: newDist}});
                        }} className="w-full bg-white border border-ag-gray-200 rounded-lg px-2 py-1.5 text-xs text-ag-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200">
                          <option>代表者</option><option>連絡者</option><option>なし</option>
                        </select>
                      ) : (
                        <p className={`text-xs font-bold px-2 py-1.5 rounded-lg ${dist.role !== "なし" ? "bg-amber-100/50 text-amber-800" : "bg-ag-gray-50 text-ag-gray-400"}`}>{dist.role}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ag-gray-500">登録カード名</label>
                      {isEditing ? (
                        <input type="text" value={dist.teamName} onChange={(e) => {
                          const newDist = [...profile.facility.districts];
                          newDist[index].teamName = e.target.value;
                          setProfile({...profile, facility: {...profile.facility, districts: newDist}});
                        }} className="w-full bg-white border border-ag-gray-200 rounded-lg px-2 py-1.5 text-xs text-ag-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200" placeholder="ex: ビッグビーンズ" />
                      ) : (
                        <p className="text-xs font-bold text-ag-gray-800 bg-white border border-ag-gray-100 px-2 py-1.5 rounded-lg">{dist.teamName || "-"}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* パスワード メモ (非公開) */}
            <div className="border border-red-100 rounded-xl bg-red-50/30 p-4">
               <div className="space-y-1.5">
                <label className="text-xs font-bold text-red-600 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  施設予約用パスワード・備考（※名簿には非公開）
                </label>
                {isEditing ? (
                  <input type="text" value={profile.facility.passwordNote} onChange={(e) => setProfile({...profile, facility: {...profile.facility, passwordNote: e.target.value}})} className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-sm text-ag-gray-800 focus:outline-none focus:ring-2 focus:ring-red-200" placeholder="パスワードのメモなど" />
                ) : (
                  <p className="text-sm font-mono text-ag-gray-800 bg-white border border-red-100 px-3 py-2 rounded-lg">
                    {profile.facility.passwordNote}
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
