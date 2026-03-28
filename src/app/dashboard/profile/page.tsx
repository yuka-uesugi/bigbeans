"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { memberList, Member } from "@/data/memberList";
import { calculateFiscalAge, getMemberByEmail, updateMember, upsertMember } from "@/lib/members";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Member | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 4月1日基準の年齢計算
  const fiscalAge = profile?.birthday ? calculateFiscalAge(profile.birthday, 2026) : null;

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.email) return;
      setIsLoading(true);
      try {
        const memberData = await getMemberByEmail(user.email);
        if (memberData) {
          setProfile(memberData);
        } else {
          // 名簿にないメールアドレスの場合は、空のテンプレを表示するか、新規作成を促す
          setProfile({
            id: Date.now(),
            name: user.displayName || "",
            email: user.email,
            gymRoles: {},
            postCode: "",
            address: "",
            phone: ""
          });
        }
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchProfile();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      // id を文字列として Firestore ドキュメント ID に使用
      const memberRef = doc(db, "members", String(profile.id));
      await setDoc(memberRef, profile, { merge: true });
      setIsEditing(false);
      alert("プロフィールを更新しました。名簿ページにも即座に反映されます。");
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました。");
    }
  };

  // 【管理用】名簿の初期データをFirestoreに流し込む
  const syncInitialData = async () => {
    if (!confirm("現在定義されている全19名の名簿データをFirestoreに流し込みます。よろしいですか？")) return;
    setIsSyncing(true);
    try {
      for (const m of memberList) {
        await upsertMember(m);
      }
      alert("全件の同期が完了しました。リロードしてご確認ください。");
      window.location.reload();
    } catch (error) {
      console.error("同期エラー:", error);
      alert("同期に失敗しました。");
    } finally {
      setIsSyncing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ag-lime-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-ag-gray-200 shadow-sm max-w-md mx-auto mt-20">
        <h2 className="text-xl font-bold text-ag-gray-800 mb-4">ログインが必要です</h2>
        <p className="text-sm text-ag-gray-400 mb-6">自分の情報を編集するにはログインしてください。</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-20">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">👤</span>
            マイページ（プロフィール編集）
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            ここで修正・保存した情報は、即座にチーム共有の名簿に反映されます。
          </p>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 text-sm font-bold rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-all shadow-lg shadow-ag-lime-500/20"
            >
              保存する
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 text-sm font-bold rounded-xl bg-white border border-ag-gray-200 text-ag-gray-700 hover:bg-ag-gray-50 transition-all shadow-sm"
            >
              編集モード
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* 基本情報カード */}
        <div className="bg-white rounded-3xl border border-ag-gray-200/60 p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-ag-lime-100/30 to-transparent rounded-bl-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 mb-10">
            <div className="relative w-28 h-28 rounded-full border-4 border-white shadow-xl bg-gradient-to-tr from-ag-lime-400 to-emerald-400 flex items-center justify-center text-white text-4xl font-bold">
              {profile.name?.[0] || "?"}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="text-2xl font-bold text-ag-gray-900 border-b-2 border-ag-lime-500 focus:outline-none bg-transparent px-1 text-center md:text-left"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-ag-gray-900">{profile.name}</h2>
                )}
                
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.role || ""}
                    onChange={(e) => setProfile({...profile, role: e.target.value})}
                    placeholder="役職 (代表・会計等)"
                    className="px-3 py-1 text-xs font-bold border border-ag-gray-200 rounded-lg focus:ring-2 focus:ring-ag-lime-500"
                  />
                ) : (
                  profile.role && (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-ag-lime-100 text-ag-lime-700 border border-ag-lime-200">
                      🏅 {profile.role}
                    </span>
                  )
                )}
              </div>
              <p className="text-sm text-ag-gray-500 mt-1">{profile.email}</p>
              
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                 <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-ag-gray-400 tracking-wider">基準年齢 (4/1時点)</span>
                   <span className="text-lg font-bold text-ag-gray-800">{fiscalAge ? `${fiscalAge}歳` : "-"}</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-ag-gray-400 tracking-wider">日バ会員番号</span>
                   {isEditing ? (
                     <input type="text" value={profile.jbaId || ""} onChange={(e) => setProfile({...profile, jbaId: e.target.value})} className="text-sm font-bold border-b border-ag-gray-200 focus:outline-none" />
                   ) : (
                     <span className="text-lg font-bold text-ag-gray-800">{profile.jbaId || "-"}</span>
                   )}
                 </div>
              </div>
            </div>
          </div>

          {/* 編集フォーム */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 pt-6 border-t border-ag-gray-100">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">生年月日 (YYYY/MM/DD)</label>
              {isEditing ? (
                <input type="text" value={profile.birthday || ""} onChange={(e) => setProfile({...profile, birthday: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="1990/01/01" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.birthday || "-"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">電話番号</label>
              {isEditing ? (
                <input type="tel" value={profile.phone || ""} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.phone || "-"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">郵便番号</label>
              {isEditing ? (
                <input type="text" value={profile.postCode || ""} onChange={(e) => setProfile({...profile, postCode: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.postCode || "-"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">現住所</label>
              {isEditing ? (
                <input type="text" value={profile.address || ""} onChange={(e) => setProfile({...profile, address: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.address || "-"}</p>
              )}
            </div>
          </div>
        </div>

        {/* 施設担当状況 (同期対象) */}
        <div className="bg-white rounded-3xl border border-ag-gray-200/60 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-ag-gray-900 mb-6 flex items-center gap-2">
            <span className="text-ag-lime-500">🏢</span> 施設担当・枠の登録状況
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-ag-gray-400 uppercase tracking-widest">都筑地区センター</h4>
              <div className="space-y-3">
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">代表枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles.tsuzukiRep || ""} onChange={(e) => setProfile({...profile, gymRoles: {...profile.gymRoles, tsuzukiRep: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles.tsuzukiRep || "-"}</p>
                   )}
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">連絡枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles.tsuzukiContact || ""} onChange={(e) => setProfile({...profile, gymRoles: {...profile.gymRoles, tsuzukiContact: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles.tsuzukiContact || "-"}</p>
                   )}
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-ag-gray-400 uppercase tracking-widest">スポーツセンター</h4>
              <div className="space-y-3">
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">代表枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles.sposenRep || ""} onChange={(e) => setProfile({...profile, gymRoles: {...profile.gymRoles, sposenRep: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles.sposenRep || "-"}</p>
                   )}
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">構成員枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles.sposenMember || ""} onChange={(e) => setProfile({...profile, gymRoles: {...profile.gymRoles, sposenMember: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles.sposenMember || "-"}</p>
                   )}
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* 開発・管理者用ツール */}
        <div className="p-6 border-2 border-dashed border-ag-gray-200 rounded-3xl bg-ag-gray-50/50">
          <h4 className="text-xs font-bold text-ag-gray-400 mb-3 uppercase tracking-tighter">開発・管理者ツール (限定公開)</h4>
          <div className="flex items-center gap-4">
            <button 
              onClick={syncInitialData}
              disabled={isSyncing}
              className="px-4 py-2 bg-ag-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50"
            >
              {isSyncing ? "同期中..." : "🔄 19名分の初期データをDBに流し込む"}
            </button>
            <p className="text-[10px] text-ag-gray-400 leading-tight">
              ※一度だけ実行してください。コード内の 19名 の名簿情報がクラウドDB（Firestore）に登録され、以後各人が編集可能になります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
