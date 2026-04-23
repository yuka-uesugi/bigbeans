"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { memberList, Member } from "@/data/memberList";
import { calculateFiscalAge, getMemberByEmail, upsertMember } from "@/lib/members";
import { subscribeToMyReservations, type ReservationData } from "@/lib/reservations";
import { subscribeToMyAttendances, type AttendanceData } from "@/lib/attendances";
import { getAllEvents, type EventData } from "@/lib/events";
import {
  subscribeToNotifications,
  markAllRead,
  type NotificationData,
} from "@/lib/notifications";
import { subscribeToFacilities, subscribeToHamaspo } from "@/lib/facilities";
import type { FacilityCard, HamaspoCard } from "@/data/facilityCards";

const STATUS_STYLE: Record<string, { label: string; dot: string }> = {
  confirmed:  { label: "確定",           dot: "bg-emerald-500" },
  waitlisted: { label: "キャンセル待ち", dot: "bg-amber-400"   },
  cancelled:  { label: "キャンセル済み", dot: "bg-ag-gray-300" },
};

export default function ProfilePage() {
  const { user, role, loading: authLoading, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Member | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [myReservations, setMyReservations] = useState<(ReservationData & { eventId: string })[]>([]);
  const [myAttendances, setMyAttendances] = useState<(AttendanceData & { eventId: string })[]>([]);
  const [eventMap, setEventMap] = useState<Record<string, EventData>>({});
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [facilities, setFacilities] = useState<FacilityCard[]>([]);
  const [hamaspoCards, setHamaspoCards] = useState<HamaspoCard[]>([]);
  
  // 年度更新フロー用ステート
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalStep, setRenewalStep] = useState<"check_info" | "select_type" | "registrations" | "completed">("check_info");
  const [infoChecks, setInfoChecks] = useState({ 
    addressChanged: false, 
    emergencyChanged: false 
  });
  const [renewalForm, setRenewalForm] = useState({
    type: "continue_regular",
    reason: ""
  });
  const [registrations, setRegistrations] = useState({
    jba: true,
    pref: true,
    city: true,
    ward: true,
    refereeCorrect: false,
  });

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

  // 通知を購読
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToNotifications(user.uid, setNotifications);
  }, [user?.uid]);

  // 施設カード情報を購読（所属カード表示用）
  useEffect(() => {
    const unsubF = subscribeToFacilities(setFacilities);
    const unsubH = subscribeToHamaspo(setHamaspoCards);
    return () => { unsubF(); unsubH(); };
  }, []);

  // 自分の予約を購読
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToMyReservations(user.uid, setMyReservations);
    return () => unsub();
  }, [user?.uid]);

  // 自分の出欠回答を購読（プロフィールのメンバーIDが確定してから）
  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeToMyAttendances(String(profile.id), setMyAttendances);
    return () => unsub();
  }, [profile?.id]);

  // 予約・出欠に対応するイベント情報を取得
  useEffect(() => {
    const allEventIds = [
      ...myReservations.map(r => r.eventId),
      ...myAttendances.map(a => a.eventId),
    ];
    if (allEventIds.length === 0) return;
    getAllEvents().then((events) => {
      const map: Record<string, EventData> = {};
      for (const e of events) map[e.id] = e;
      setEventMap(map);
    });
  }, [myReservations.length, myAttendances.length]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      const memberRef = doc(db, "members", String(profile.id));
      // uid を記録して auth ユーザーとメンバーレコードを紐付ける
      await setDoc(memberRef, { ...profile, uid: user?.uid ?? profile.uid }, { merge: true });
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

  // ログイン前の表示
  if (!user && !isPreviewMode) {
    return (
      <div className="p-8 space-y-12 animate-fade-in-up">
        {/* 通常のログイン案内 */}
        <div className="text-center bg-white rounded-[32px] border border-ag-gray-200 shadow-xl max-w-md mx-auto mt-20 p-12">
          <div className="w-16 h-16 bg-ag-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-xl font-black text-ag-gray-400">USER</span>
          </div>
          <h2 className="text-2xl font-bold text-ag-gray-900 mb-4">ログインが必要です</h2>
          <p className="text-sm text-ag-gray-400 mb-8 leading-relaxed">
            自分の情報を編集したり、名簿を確認するにはログインしてください。
          </p>
          <div className="text-xs text-ag-gray-300 italic mb-6">
            ※Googleログインが有効です
          </div>

          <button 
             onClick={() => {
               setProfile({
                 id: 999,
                 name: "上杉 由華 (プレビュー)",
                 email: "yuka-uesugi@b-w-c.jp",
                 role: "代表",
                 gymRoles: { tsuzukiRep: "X", sposenRep: "オレンジ", sposenMember: "ベリー" },
                 postCode: "225-0024",
                 address: "青葉区市ヶ尾1055-1",
                 phone: "090-0000-0000",
                 birthday: "1974/9/9",
                 notificationPrefs: { practiceUpdates: "line", lightMemberRequests: "email" }
               });
               setIsPreviewMode(true);
             }}
             className="px-6 py-3 bg-sky-50 text-sky-600 text-xs font-bold rounded-xl border border-sky-200 hover:bg-sky-100 transition-colors"
          >
            ログインせずにUIだけ確認する（開発用プレビュー）
          </button>
        </div>

        {/* セットアップ用の管理ツール（ログイン前でもボタンだけは見えるように配置） */}
        <div className="max-w-md mx-auto p-8 border-2 border-dashed border-amber-200 rounded-[32px] bg-amber-50/20 text-center">
          <h4 className="text-xs font-bold text-amber-600 mb-4 uppercase tracking-tighter flex items-center justify-center gap-2">
            初回セットアップ
          </h4>
          <button 
            onClick={syncInitialData}
            disabled={isSyncing}
            className="w-full px-6 py-4 bg-ag-gray-900 text-white text-sm font-bold rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? "同期中..." : "名簿データをDBに登録"}
          </button>
          <p className="text-[10px] text-amber-600 mt-4 leading-tight font-medium max-w-[280px] mx-auto">
            名簿の初期データを作成します。一度実行するだけでOKです。
          </p>
        </div>
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
            マイページ（プロフィール編集）
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            ここで修正・保存した情報は、即座に共有名簿に反映されます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowRenewalModal(true); setRenewalStep("check_info"); }}
            className="px-5 py-2.5 text-sm font-bold rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
          >
            年度更新申請
          </button>

          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-all shadow-lg shadow-ag-lime-500/20"
            >
              保存する
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-white border border-ag-gray-200 text-ag-gray-700 hover:bg-ag-gray-50 transition-all shadow-sm"
            >
              編集モード
            </button>
          )}

          <button
            onClick={async () => {
              if (confirm("ログアウトしますか？")) await logout();
            }}
            className="px-5 py-2.5 text-sm font-bold rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 transition-all shadow-sm"
          >
            ログアウト
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 基本情報カード */}
        <div className="bg-white rounded-[32px] border border-ag-gray-200/60 p-8 shadow-sm relative overflow-hidden">
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
                    <span className="px-3 py-1 text-xs font-black rounded-full bg-ag-lime-100 text-ag-lime-700 border border-ag-lime-200">
                      {profile.role}
                    </span>
                  )
                )}
              </div>
              <p className="text-sm text-ag-gray-500 mt-1">{profile.email}</p>
              
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                 <div className="flex flex-col items-center md:items-start">
                   <span className="text-[10px] uppercase font-bold text-ag-gray-400 tracking-wider">基準年齢 (4/1時点)</span>
                   <span className="text-lg font-bold text-ag-gray-800">{fiscalAge ? `${fiscalAge}歳` : "-"}</span>
                 </div>
                 <div className="flex flex-col items-center md:items-start">
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

        {/* パーソナル情報 */}
        <div className="bg-white rounded-[32px] border border-ag-gray-200/60 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-ag-gray-900 mb-6 flex items-center gap-2">
            パーソナル情報
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 血液型 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">血液型</label>
              {isEditing ? (
                <div className="flex gap-2">
                  {(["A", "B", "O", "AB"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setProfile({ ...profile, bloodType: profile.bloodType === t ? undefined : t })}
                      className={`flex-1 py-2 rounded-xl text-sm font-black border-2 transition-all ${
                        profile.bloodType === t
                          ? "bg-ag-lime-500 border-ag-lime-500 text-white"
                          : "bg-white border-ag-gray-200 text-ag-gray-500 hover:border-ag-lime-300"
                      }`}
                    >
                      {t}型
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">
                  {profile.bloodType ? `${profile.bloodType}型` : "-"}
                </p>
              )}
            </div>

            {/* 出身地 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">出身地</label>
              {isEditing ? (
                <select
                  value={profile.hometown || ""}
                  onChange={(e) => setProfile({ ...profile, hometown: e.target.value || undefined })}
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm"
                >
                  <option value="">未選択</option>
                  {["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">
                  {profile.hometown || "-"}
                </p>
              )}
            </div>

            {/* 過去の部活・スポーツ歴 (タグ) */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-ag-gray-500">過去の部活・スポーツ歴</label>
              {isEditing ? (
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(profile.sportsHistory || []).map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 bg-ag-lime-100 text-ag-lime-800 text-xs font-bold px-3 py-1 rounded-full border border-ag-lime-200">
                        {tag}
                        <button
                          onClick={() => setProfile({ ...profile, sportsHistory: (profile.sportsHistory || []).filter((_, j) => j !== i) })}
                          className="text-ag-lime-500 hover:text-red-500 ml-0.5 font-black"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                          e.preventDefault();
                          const val = tagInput.trim().replace(/,$/, "");
                          if (val && !(profile.sportsHistory || []).includes(val)) {
                            setProfile({ ...profile, sportsHistory: [...(profile.sportsHistory || []), val] });
                          }
                          setTagInput("");
                        }
                      }}
                      placeholder="例: バドミントン部・テニス部（Enterで追加）"
                      className="flex-1 bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm"
                    />
                    <button
                      onClick={() => {
                        const val = tagInput.trim();
                        if (val && !(profile.sportsHistory || []).includes(val)) {
                          setProfile({ ...profile, sportsHistory: [...(profile.sportsHistory || []), val] });
                        }
                        setTagInput("");
                      }}
                      className="px-4 py-2 bg-ag-lime-100 text-ag-lime-700 rounded-xl text-xs font-black hover:bg-ag-lime-200"
                    >
                      追加
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 py-1">
                  {(profile.sportsHistory || []).length === 0 ? (
                    <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl w-full">-</p>
                  ) : (
                    (profile.sportsHistory || []).map((tag, i) => (
                      <span key={i} className="bg-ag-lime-100 text-ag-lime-800 text-xs font-bold px-3 py-1.5 rounded-full border border-ag-lime-200">
                        {tag}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 施設担当状況 (同期対象) */}
        <div className="bg-white rounded-[32px] border border-ag-gray-200/60 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-ag-gray-900 mb-6 flex items-center gap-2">
            施設担当・枠の登録状況
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-ag-gray-400 uppercase tracking-widest">都筑地区センター</h4>
              <div className="space-y-3">
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">代表枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles?.tsuzukiRep || ""} onChange={(e) => setProfile({...profile, gymRoles: {...(profile.gymRoles || {}), tsuzukiRep: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles?.tsuzukiRep || "-"}</p>
                   )}
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">連絡枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles?.tsuzukiContact || ""} onChange={(e) => setProfile({...profile, gymRoles: {...(profile.gymRoles || {}), tsuzukiContact: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles?.tsuzukiContact || "-"}</p>
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
                     <input type="text" value={profile.gymRoles?.sposenRep || ""} onChange={(e) => setProfile({...profile, gymRoles: {...(profile.gymRoles || {}), sposenRep: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles?.sposenRep || "-"}</p>
                   )}
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">構成員枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles?.sposenMember || ""} onChange={(e) => setProfile({...profile, gymRoles: {...(profile.gymRoles || {}), sposenMember: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles?.sposenMember || "-"}</p>
                   )}
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* 通知設定 */}
        <div className="bg-white rounded-[32px] border border-ag-gray-200/60 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-ag-gray-900 mb-6 flex items-center gap-2">
            通知設定 (受取方法の選択)
          </h3>
          
          <div className="space-y-6">
            {/* 練習場所の追加・変更 */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-ag-gray-500 block">練習場所の追加・変更など</label>
              {isEditing ? (
                <div className="flex flex-wrap gap-4">
                  {(['email', 'app', 'none'] as const).map(method => (
                    <label key={`practice-${method}`} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="practiceUpdates"
                        value={method}
                        checked={(profile.notificationPrefs?.practiceUpdates || "email") === method}
                        onChange={(e) => setProfile({...profile, notificationPrefs: {...(profile.notificationPrefs || {}), practiceUpdates: e.target.value as any}})}
                        className="text-sky-500 focus:ring-sky-500 w-4 h-4"
                      />
                      <span className="text-sm font-bold text-ag-gray-700">
                        {method === 'email' ? 'メール' : method === 'app' ? 'アプリ通知' : '受け取らない'}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl w-fit border border-ag-gray-100">
                  {(() => {
                    const method = profile.notificationPrefs?.practiceUpdates || "email";
                    return method === 'email' ? 'メール' : method === 'app' ? 'アプリ通知' : '受け取らない';
                  })()}
                </p>
              )}
            </div>

            {/* ライト会員の申請依頼 */}
            <div className="space-y-3 pt-4 border-t border-ag-gray-100">
              <label className="text-xs font-bold text-ag-gray-500 block">ライト会員の申請依頼</label>
              {isEditing ? (
                <div className="flex flex-wrap gap-4">
                  {(['email', 'app', 'none'] as const).map(method => (
                    <label key={`light-${method}`} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="lightMemberRequests"
                        value={method}
                        checked={(profile.notificationPrefs?.lightMemberRequests || "email") === method}
                        onChange={(e) => setProfile({...profile, notificationPrefs: {...(profile.notificationPrefs || {}), lightMemberRequests: e.target.value as any}})}
                        className="text-sky-500 focus:ring-sky-500 w-4 h-4"
                      />
                      <span className="text-sm font-bold text-ag-gray-700">
                        {method === 'email' ? 'メール' : method === 'app' ? 'アプリ通知' : '受け取らない'}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl w-fit border border-ag-gray-100">
                  {(() => {
                    const method = profile.notificationPrefs?.lightMemberRequests || "email";
                    return method === 'email' ? 'メール' : method === 'app' ? 'アプリ通知' : '受け取らない';
                  })()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* お知らせ（返信通知） */}
        {user && notifications.length > 0 && (
          <div className="bg-white rounded-[32px] border border-ag-gray-200/60 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ag-gray-900 flex items-center gap-2">
                🔔 お知らせ
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </h3>
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={() => markAllRead(user.uid, notifications.filter((n) => !n.read).map((n) => n.id))}
                  className="text-xs font-bold text-ag-gray-400 hover:text-ag-gray-600"
                >
                  すべて既読にする
                </button>
              )}
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAllRead(user.uid, [n.id])}
                  className={`flex gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    n.read ? "bg-ag-gray-50 border-ag-gray-100" : "bg-sky-50 border-sky-200 hover:bg-sky-100"
                  }`}
                >
                  <span className="text-lg shrink-0">{n.read ? "💬" : "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-ag-gray-700 truncate">
                      「{n.suggestionTitle}」に返信がありました
                    </p>
                    <p className="text-xs font-bold text-ag-gray-500 mt-0.5">
                      <span className="text-ag-gray-700">{n.replyAuthor}</span>：{n.replyBody.slice(0, 40)}{n.replyBody.length > 40 ? "…" : ""}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 自分の予約・出欠状況 */}
        {user && (
          <div className="bg-white rounded-[32px] border border-ag-gray-200/60 p-8 shadow-sm">
            <h3 className="text-lg font-bold text-ag-gray-900 mb-5 flex items-center gap-2">
              🏸 自分の参加予定・出欠状況
            </h3>

            {(() => {
              // 予約一覧（キャンセル以外）
              const activeReservations = myReservations.filter(r => r.status !== "cancelled");
              // 出欠回答一覧（attend のみ、予約でカバーされていないもの）
              const reservedEventIds = new Set(myReservations.map(r => r.eventId));
              const attendanceOnly = myAttendances.filter(
                a => a.status === "attend" && !reservedEventIds.has(a.eventId)
              );

              if (activeReservations.length === 0 && attendanceOnly.length === 0) {
                return <p className="text-sm text-ag-gray-400 font-bold text-center py-6">参加予定はまだありません</p>;
              }

              return (
                <div className="space-y-2">
                  {activeReservations.map((r) => {
                    const event = eventMap[r.eventId];
                    const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.confirmed;
                    const dateStr = event
                      ? (() => {
                          const d = new Date(event.date + "T00:00:00");
                          const day = ["日","月","火","水","木","金","土"][d.getDay()];
                          return `${d.getMonth() + 1}/${d.getDate()}（${day}）`;
                        })()
                      : r.eventId;
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-ag-gray-50 border border-ag-gray-100">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${ss.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-ag-gray-900">{dateStr}</span>
                            {event && <span className="text-xs font-bold text-ag-gray-500">{event.location}</span>}
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">予約</span>
                          </div>
                          <span className={`text-xs font-bold ${r.status === "waitlisted" ? "text-amber-600" : "text-emerald-600"}`}>
                            {ss.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {attendanceOnly.map((a) => {
                    const event = eventMap[a.eventId];
                    const dateStr = event
                      ? (() => {
                          const d = new Date(event.date + "T00:00:00");
                          const day = ["日","月","火","水","木","金","土"][d.getDay()];
                          return `${d.getMonth() + 1}/${d.getDate()}（${day}）`;
                        })()
                      : a.eventId;
                    return (
                      <div key={a.eventId} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-ag-gray-50 border border-ag-gray-100">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-ag-lime-500" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-ag-gray-900">{dateStr}</span>
                            {event && <span className="text-xs font-bold text-ag-gray-500">{event.location}</span>}
                            <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-100">出欠回答</span>
                          </div>
                          <span className="text-xs font-bold text-ag-lime-600">参加</span>
                        </div>
                      </div>
                    );
                  })}

                  {myReservations.filter(r => r.status === "cancelled").length > 0 && (
                    <p className="text-xs text-ag-gray-400 font-bold text-center pt-1">
                      キャンセル済み {myReservations.filter(r => r.status === "cancelled").length}件
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 所属カード情報 */}
        {(() => {
          if (!profile?.name) return null;
          const lastName = profile.name.split(/\s+/)[0];
          const matched: { facilityName: string; teamName: string; role: string }[] = [];

          for (const fc of facilities) {
            for (const reg of fc.registrations) {
              if (reg.representative && reg.representative.includes(lastName))
                matched.push({ facilityName: fc.name, teamName: reg.teamName, role: "代表者" });
              else if (reg.contact && reg.contact.includes(lastName))
                matched.push({ facilityName: fc.name, teamName: reg.teamName, role: "連絡者" });
              else if (reg.members && reg.members.split(/[・,、]/).some((m) => m.trim().includes(lastName)))
                matched.push({ facilityName: fc.name, teamName: reg.teamName, role: "構成員" });
            }
          }
          for (const hc of hamaspoCards) {
            if (hc.representative && hc.representative.includes(lastName))
              matched.push({ facilityName: hc.teamName, teamName: hc.teamName, role: "代表者" });
            else if (hc.members && hc.members.split(/[・,、]/).some((m) => m.trim().includes(lastName)))
              matched.push({ facilityName: hc.teamName, teamName: hc.teamName, role: "構成員" });
          }

          if (matched.length === 0) return null;
          return (
            <div className="bg-white rounded-[32px] border-2 border-emerald-100 shadow-sm p-8">
              <h3 className="text-xl font-black text-emerald-900 mb-6 flex items-center gap-3">
                <span className="text-2xl">🏢</span> 所属カード情報
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {matched.map((m, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">{m.role}</span>
                    <div className="min-w-0">
                      <div className="font-black text-ag-gray-900 text-sm truncate">{m.facilityName}</div>
                      <div className="text-xs font-bold text-ag-gray-500 truncate">{m.teamName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="p-8 border-2 border-dashed border-ag-gray-200 rounded-[32px] bg-ag-gray-50/50">
          <h4 className="text-xs font-bold text-ag-gray-400 mb-3 uppercase tracking-tighter">一括同期ツール (限定公開)</h4>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <button 
              onClick={syncInitialData}
              disabled={isSyncing}
              className="px-6 py-3 bg-ag-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all disabled:opacity-50"
            >
              {isSyncing ? "同期中..." : "実データをDBに上書き"}
            </button>
            <p className="text-[10px] text-ag-gray-400 leading-tight flex-1">
              ※コード内の名簿情報をFirestoreへコピーします。各メンバーが自分で編集を始める前の「一括投入」として使用してください。
            </p>
          </div>
        </div>
      </div>

      {/* 年度更新モーダル */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRenewalModal(false)} />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-6 py-5 rounded-t-3xl sm:rounded-t-3xl flex justify-between items-center sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-black">年度更新申請</h2>
                <p className="text-xs text-white/70 mt-1">来年度の会員更新と登録情報の確認</p>
              </div>
              <button onClick={() => setShowRenewalModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">✕</button>
            </div>

            <div className="p-6">
              {/* ステップ1：登録情報の確認 */}
              {renewalStep === "check_info" && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-sm text-sky-800 font-bold mb-2">
                    申請の前に、登録情報に変更がないか確認してください。
                  </div>

                  {/* 住所確認 */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-ag-gray-500">Q1. 前回の申請から【ご住所】に変更はありましたか？</label>
                    <div className="flex gap-3">
                      <button onClick={() => setInfoChecks({...infoChecks, addressChanged: false})} className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all ${!infoChecks.addressChanged ? "border-sky-500 bg-sky-50 text-sky-700" : "border-ag-gray-200 text-ag-gray-400"}`}>変更なし</button>
                      <button onClick={() => setInfoChecks({...infoChecks, addressChanged: true})} className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all ${infoChecks.addressChanged ? "border-amber-500 bg-amber-50 text-amber-700" : "border-ag-gray-200 text-ag-gray-400"}`}>変更あり</button>
                    </div>
                    {infoChecks.addressChanged && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3 mt-2">
                        <p className="text-[10px] font-bold text-amber-700">新しい住所を入力してください</p>
                        <input type="text" placeholder="郵便番号" className="w-full px-3 py-2 text-sm rounded-lg border border-amber-200" />
                        <input type="text" placeholder="都道府県・市区町村・番地" className="w-full px-3 py-2 text-sm rounded-lg border border-amber-200" />
                      </div>
                    )}
                  </div>


                  {/* 緊急連絡先確認 */}
                  <div className="space-y-3 pt-4 border-t border-ag-gray-100">
                    <label className="text-xs font-black text-ag-gray-500">Q2. 【緊急連絡先】に変更はありましたか？</label>
                    <div className="flex gap-3">
                      <button onClick={() => setInfoChecks({...infoChecks, emergencyChanged: false})} className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all ${!infoChecks.emergencyChanged ? "border-sky-500 bg-sky-50 text-sky-700" : "border-ag-gray-200 text-ag-gray-400"}`}>変更なし</button>
                      <button onClick={() => setInfoChecks({...infoChecks, emergencyChanged: true})} className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all ${infoChecks.emergencyChanged ? "border-amber-500 bg-amber-50 text-amber-700" : "border-ag-gray-200 text-ag-gray-400"}`}>変更あり</button>
                    </div>
                    {infoChecks.emergencyChanged && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mt-2">
                        <input type="text" placeholder="氏名・続柄・電話番号を入力" className="w-full px-3 py-2 text-sm rounded-lg border border-amber-200" />
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setRenewalStep("select_type")}
                    className="w-full mt-6 py-4 bg-sky-500 text-white text-base font-black rounded-xl hover:bg-sky-600 shadow-xl shadow-sky-500/20 transition-all"
                  >
                    次へ（更新種別の選択）
                  </button>
                </div>
              )}

              {/* ステップ2：更新種別の選択 */}
              {renewalStep === "select_type" && (
                <div className="space-y-5 animate-fade-in-up">
                  <div>
                    <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-3">来年度の希望</label>
                    <div className="space-y-2">
                      {[
                        { id: "continue_regular", label: "通常会員として継続", color: "text-ag-lime-700" },
                        { id: "regular_to_light", label: "ライト会員へ変更", color: "text-sky-700", needsVote: true },
                        { id: "withdraw", label: "退会する", color: "text-red-700" },
                      ].map((opt) => (
                        <button key={opt.id} onClick={() => setRenewalForm({...renewalForm, type: opt.id})}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${renewalForm.type === opt.id ? `border-2 border-sky-400 bg-sky-50` : "border-ag-gray-100 bg-white hover:bg-ag-gray-50"}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${renewalForm.type === opt.id ? "border-sky-500 bg-sky-500" : "border-ag-gray-300"}`}>
                            {renewalForm.type === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className={`text-sm font-extrabold ${opt.color}`}>{opt.label}</p>
                            {opt.needsVote && <p className="text-[9px] text-ag-gray-400 mt-0.5">※通常会員15名の60%（9名）以上の署名承認が必要</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {renewalForm.type === "regular_to_light" && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <label className="text-[10px] font-black text-amber-700 uppercase block mb-2">変更の理由 <span className="text-red-500">*</span></label>
                      <p className="text-[10px] text-amber-600 mb-3 leading-relaxed">
                        ライト会員への変更には通常会員による60%署名承認が必要です。参加頻度が少なくなる理由を具体的に記載してください。
                      </p>
                      <textarea rows={4} value={renewalForm.reason} onChange={e => setRenewalForm({...renewalForm, reason: e.target.value})}
                        placeholder="例：育児・介護のため月2回程度の参加になりますが、引き続きチームに貢献したいです。"
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-300 leading-relaxed" />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setRenewalStep("check_info")} className="flex-1 py-3 text-sm font-bold text-ag-gray-500 border border-ag-gray-200 rounded-xl">戻る</button>
                    <button 
                      onClick={() => setRenewalStep("registrations")}
                      disabled={renewalForm.type === "regular_to_light" && !renewalForm.reason.trim()}
                      className="flex-[2] py-3 bg-sky-500 text-white rounded-xl text-base font-black hover:bg-sky-600 shadow-xl shadow-sky-500/20 disabled:opacity-40 transition-all"
                    >
                      次へ（連盟登録・審判等に関する希望）
                    </button>
                  </div>
                </div>
              )}

              {/* ステップ3：各種登録・審判の確認 */}
              {renewalStep === "registrations" && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-sm text-sky-800 font-bold mb-2">
                    来年度の各連盟への登録希望と、現在の審判資格状況の確認をお願いします。
                  </div>

                  {/* 連盟登録 */}
                  <div className="space-y-4">
                    <label className="text-xs font-black text-ag-gray-500 block">■ 各種連盟への登録希望（チェックを入れてください）</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "jba", label: "日バ登録" },
                        { id: "pref", label: "神奈川県登録" },
                        { id: "city", label: "横浜市登録" },
                        { id: "ward", label: "都筑区登録" },
                      ].map(item => (
                        <label key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${registrations[item.id as keyof typeof registrations] ? "border-sky-500 bg-sky-50" : "border-ag-gray-200 bg-white"}`}>
                          <input type="checkbox" className="w-5 h-5 text-sky-600 rounded drop-shadow-sm" 
                            checked={registrations[item.id as keyof typeof registrations] as boolean} 
                            onChange={e => setRegistrations({...registrations, [item.id]: e.target.checked})} />
                          <span className={`text-sm font-black ${registrations[item.id as keyof typeof registrations] ? "text-sky-800" : "text-ag-gray-500"}`}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 審判資格の確認 */}
                  <div className="space-y-4 pt-6 border-t border-ag-gray-200">
                    <label className="text-xs font-black text-ag-gray-500 block">■ 公認審判員資格の確認</label>
                    <div className="bg-ag-gray-100 border border-ag-gray-200 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-ag-gray-100">
                        <span className="text-xs font-black text-ag-gray-500">あなたの現在の登録データ：</span>
                        <span className="text-lg font-black text-ag-gray-900 px-2 border-b-4 border-ag-lime-400">
                          {profile?.refereeYear ? `${profile.refereeYear}年度まで有効` : "未登録 / データ無し"}
                        </span>
                      </div>
                      <label className="flex items-start gap-3 mt-4 p-4 bg-white rounded-xl border-2 transition-all cursor-pointer select-none hover:bg-sky-50 hover:border-sky-200">
                        <input type="checkbox" className="w-5 h-5 text-sky-600 rounded mt-0.5" 
                           checked={registrations.refereeCorrect} 
                           onChange={e => setRegistrations({...registrations, refereeCorrect: e.target.checked})} />
                        <span className="text-sm font-bold text-ag-gray-700 leading-relaxed">
                          登録されている審判資格の内容（有効期限など）で間違いないことを確認しました。
                          <span className="block text-[10px] text-red-500 mt-1.5 font-bold">※もし今年度に新規取得や更新手続きをされた場合は、このチェックを外して役員にお申し出ください。</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button onClick={() => setRenewalStep("select_type")} className="flex-1 py-4 text-sm font-bold text-ag-gray-500 border border-ag-gray-200 rounded-xl hover:bg-ag-gray-50 transition-colors">戻る</button>
                    <button 
                      onClick={() => setRenewalStep("completed")}
                      disabled={!registrations.refereeCorrect}
                      className="flex-[2] py-4 bg-sky-500 text-white rounded-xl text-base font-black hover:bg-sky-600 shadow-xl shadow-sky-500/20 disabled:opacity-40 transition-all"
                    >
                      申請内容を確定して送信
                    </button>
                  </div>
                </div>
              )}

              {/* ステップ4：完了 */}
              {renewalStep === "completed" && (
                <div className="py-12 text-center animate-fade-in-up">
                  <div className="w-16 h-16 bg-ag-lime-500 rounded-full flex items-center justify-center text-white text-xl font-black mx-auto mb-4 shadow-lg">OK</div>
                  <h3 className="text-2xl font-black text-ag-gray-800 mb-2">更新申請を送信しました</h3>
                  <p className="text-sm text-ag-gray-500 leading-relaxed max-w-sm mx-auto">
                    申請ありがとうございます。<br />
                    修正された登録情報があれば、承認後に自動でプロフィールに反映されます。
                  </p>
                  <button 
                    onClick={() => setShowRenewalModal(false)}
                    className="mt-8 px-8 py-3 bg-ag-gray-100 text-ag-gray-600 text-sm font-bold rounded-xl hover:bg-ag-gray-200"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
