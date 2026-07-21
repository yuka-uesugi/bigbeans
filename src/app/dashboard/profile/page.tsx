"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Member } from "@/data/memberList";
import { enablePush, disablePush, isPushSupported, type PushSubJSON } from "@/lib/push";
import { calculateFiscalAge, calculateTodayAge, getMemberByEmail, getAllMembers } from "@/lib/members";
import { subscribeToMyReservationsInEvents, type ReservationData } from "@/lib/reservations";
import { subscribeToMyAttendanceRecords, type AttendanceData } from "@/lib/attendances";
import { getAllEvents, type EventData } from "@/lib/events";
import {
  subscribeToNotifications,
  markAllRead,
  type NotificationData,
} from "@/lib/notifications";
import { subscribeToFacilities, subscribeToHamaspo } from "@/lib/facilities";
import type { FacilityCard, HamaspoCard } from "@/data/facilityCards";
import { createRenewalApplication, type RenewalType } from "@/lib/applications";

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

  // 代理編集（admin / supporter のみ）
  const canProxy = role === "admin" || role === "supporter";
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [proxyMemberId, setProxyMemberId] = useState<string>("");
  const [myReservations, setMyReservations] = useState<(ReservationData & { eventId: string })[]>([]);
  const [myAttendances, setMyAttendances] = useState<(AttendanceData & { eventId: string })[]>([]);
  const [eventMap, setEventMap] = useState<Record<string, EventData>>({});
  const [futureEventIds, setFutureEventIds] = useState<string[]>([]);
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

  // 代理編集中かどうか（選択中のメンバーを開いている状態）
  const isProxy = canProxy && proxyMemberId !== "" && profile !== null && String(profile.id) === proxyMemberId;

  // 4月1日基準の年齢計算
  const fiscalAge = profile?.birthday ? calculateFiscalAge(profile.birthday, 2026) : null;
  const todayAge = profile?.birthday ? calculateTodayAge(profile.birthday) : null;

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

  // 代理編集用：全メンバー一覧を取得（admin / supporter のみ）
  useEffect(() => {
    if (!canProxy) return;
    getAllMembers().then((list) => setAllMembers(list.sort((a, b) => a.id - b.id)));
  }, [canProxy]);

  // 代理編集：選択メンバーが変わったらプロフィールを差し替え
  useEffect(() => {
    if (!proxyMemberId) return;
    const found = allMembers.find((m) => String(m.id) === proxyMemberId);
    if (found) {
      setProfile(found);
      setIsEditing(false);
    }
  }, [proxyMemberId, allMembers]);

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

  // 予定を読み込み、イベント情報マップと「今日以降の予定ID」を用意する。
  // この「今日以降の予定ID」を使って、各予定を1件ずつ直接読む方式で
  // 自分の予約・出欠を集める（横断インデックス不要で確実に動く）。
  useEffect(() => {
    getAllEvents().then((events) => {
      const map: Record<string, EventData> = {};
      for (const e of events) map[e.id] = e;
      setEventMap(map);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const future = events
        .filter((e) => new Date(e.date + "T00:00:00") >= today)
        .map((e) => e.id);
      setFutureEventIds(future);
    });
  }, []);

  // 自分の予約を購読（今日以降の予定のみ・索引不要方式）
  useEffect(() => {
    if (!user?.uid || futureEventIds.length === 0) return;
    const unsub = subscribeToMyReservationsInEvents(futureEventIds, user.uid, setMyReservations);
    return () => unsub();
  }, [user?.uid, futureEventIds]);

  // 自分の出欠回答を購読（プロフィールのメンバーIDが確定してから・索引不要方式）
  useEffect(() => {
    if (!profile?.id || futureEventIds.length === 0) return;
    const unsub = subscribeToMyAttendanceRecords(futureEventIds, String(profile.id), setMyAttendances);
    return () => unsub();
  }, [profile?.id, futureEventIds]);

  const handleSave = async () => {
    if (!profile) return;

    // メールはログイン照合の鍵。余分な空白を除き、小文字に統一して保存する
    // （照合は大文字小文字まで完全一致が必要なため、表記ゆれを防ぐ）
    const normalizedEmail = (profile.email || "").trim().toLowerCase();
    const originalEmail = isProxy
      ? allMembers.find((m) => String(m.id) === proxyMemberId)?.email ?? profile.email
      : profile.email;

    if (isProxy && normalizedEmail !== originalEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        alert("メールアドレスの形式が正しくありません。入力内容をご確認ください。");
        return;
      }
      const ok = confirm(
        `${profile.name} さんのメールアドレスを変更します。\n\n` +
          `変更前: ${originalEmail || "（未登録）"}\n` +
          `変更後: ${normalizedEmail}\n\n` +
          `※メールはログインと名簿を結びつける鍵です。\n` +
          `本人がGoogleログインに使うアドレスと完全に同じにしてください。\n` +
          `違うアドレスにすると、本人がログインしても名簿と照合されず\n` +
          `ビジター扱いになってしまいます。\n\nこの内容で保存しますか？`
      );
      if (!ok) return;
    }

    try {
      const memberRef = doc(db, "members", String(profile.id));
      // 代理編集の場合は uid を上書きしない
      const saveData = isProxy
        ? { ...profile, email: normalizedEmail }
        : { ...profile, uid: user?.uid ?? profile.uid };
      await setDoc(memberRef, saveData, { merge: true });
      if (isProxy) {
        setProfile({ ...profile, email: normalizedEmail });
        // 手元の一覧も更新しておく（次回の変更チェックが正しく働くように）
        setAllMembers((prev) =>
          prev.map((m) => (String(m.id) === proxyMemberId ? { ...m, ...profile, email: normalizedEmail } : m))
        );
      }
      setIsEditing(false);
      const who = isProxy ? `${profile.name} さんの` : "";
      alert(`${who}プロフィールを更新しました。名簿ページにも即座に反映されます。`);
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました。");
    }
  };

  // 通知の受け取り方法は、編集モードに関係なくその場で即保存する。
  // （どれを選んだかがすぐ反映されるので、初めての人でも迷わない）
  const [notifySaved, setNotifySaved] = useState<string | null>(null);
  const saveNotificationPref = async (
    key: "practiceUpdates" | "lightMemberRequests",
    value: "email" | "app" | "both" | "none"
  ) => {
    if (!profile) return;
    const nextPrefs = { ...(profile.notificationPrefs || {}), [key]: value };
    // 画面はすぐ更新（押した瞬間に選択が反映される）
    setProfile({ ...profile, notificationPrefs: nextPrefs });

    // 「予定・アンケート・お知らせ」で受け取り方法を切り替えたとき、
    // 「アプリ通知」なら通知の許可を取り、この端末の宛先を保存する。
    // それ以外（メール・受け取らない）ならこの端末の宛先を消す。
    // ※ 代理編集中（他人の設定をいじっている）ときは、この端末で購読すると
    //   宛先が本人ではなく操作者のものになってしまうため、端末の処理は行わない。
    if (key === "practiceUpdates" && !isProxy) {
      try {
        // 「アプリ通知」または「メール＋アプリ」を選んだら、この端末で通知を許可して宛先を保存する
        if (value === "app" || value === "both") {
          if (!isPushSupported()) {
            alert(
              "この端末では、アイコンに出るお知らせ（プッシュ通知）に対応していません。\n" +
              "スマホのホーム画面にアプリを追加したうえで、追加したアイコンから開いてお試しください。\n" +
              "（設定自体は保存され、アプリを開いたときの通知欄では確認できます）"
            );
          } else {
            const sub = await enablePush();
            if (!sub) {
              alert(
                "通知の許可がとれませんでした。\n" +
                "スマホの設定で、このアプリの通知を「許可」にしてから、もう一度「アプリ通知」を押してください。"
              );
            } else {
              await savePushSubToMember(String(profile.id), sub);
            }
          }
        } else {
          const endpoint = await disablePush();
          if (endpoint) await removePushSubFromMember(String(profile.id), endpoint);
        }
      } catch (e) {
        console.error("プッシュ通知の切り替えに失敗:", e);
        // 宛先の処理に失敗しても、設定自体の保存は続行する
      }
    }

    try {
      const memberRef = doc(db, "members", String(profile.id));
      await setDoc(memberRef, { notificationPrefs: nextPrefs }, { merge: true });
      setNotifySaved(key);
      setTimeout(() => setNotifySaved((prev) => (prev === key ? null : prev)), 2000);
    } catch (error) {
      console.error("通知設定の保存に失敗:", error);
      alert("通知設定の保存に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
    }
  };

  // この端末の宛先を、本人の名簿ドキュメント(members/{id}.pushSubs)に保存する。
  // 同じ端末の古い宛先は取り除いてから追加する（重複防止）。
  const savePushSubToMember = async (memberId: string, sub: PushSubJSON) => {
    const memberRef = doc(db, "members", memberId);
    const snap = await getDoc(memberRef);
    const current: string[] = (snap.data()?.pushSubs as string[]) || [];
    const filtered = current.filter((s) => {
      try {
        return (JSON.parse(s) as PushSubJSON).endpoint !== sub.endpoint;
      } catch {
        return false;
      }
    });
    filtered.push(JSON.stringify(sub));
    await setDoc(memberRef, { pushSubs: filtered }, { merge: true });
  };

  // 「この端末にテスト通知を送る」ボタンの状態と処理。
  // お知らせ投稿ではないので、他人にもメールにも一切影響しない（自分の端末だけ）。
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "none" | "error">("idle");
  const sendSelfTest = async () => {
    try {
      setTestState("sending");
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setTestState("error");
        return;
      }
      const res = await fetch("/api/notify-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "self",
          title: "テスト通知",
          body: "これが届けば、アプリ通知の設定は成功です。",
          link: "/dashboard/calendar",
          idToken,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { sent?: number };
      if (res.ok && (json.sent ?? 0) > 0) setTestState("sent");
      else setTestState("none");
    } catch (e) {
      console.error("テスト通知の送信に失敗:", e);
      setTestState("error");
    }
  };

  // この端末の宛先を、本人の名簿ドキュメントから取り除く。
  const removePushSubFromMember = async (memberId: string, endpoint: string) => {
    const memberRef = doc(db, "members", memberId);
    const snap = await getDoc(memberRef);
    const current: string[] = (snap.data()?.pushSubs as string[]) || [];
    const filtered = current.filter((s) => {
      try {
        return (JSON.parse(s) as PushSubJSON).endpoint !== endpoint;
      } catch {
        return false;
      }
    });
    if (filtered.length !== current.length) {
      await setDoc(memberRef, { pushSubs: filtered }, { merge: true });
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
  if (!user) {
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
          <div className="text-xs text-ag-gray-300 italic">
            ※Googleログインが有効です
          </div>
        </div>

      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-20">

      {/* 代理編集バナー（admin / supporter のみ表示） */}
      {canProxy && (
        <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-black text-sky-700 uppercase tracking-widest mb-1">
              {role === "admin" ? "管理者" : "サポーター"} — 代理編集モード
            </p>
            <p className="text-xs font-bold text-sky-600">
              PC操作が苦手なメンバーの代わりにプロフィールを編集できます。
            </p>
          </div>
          <select
            value={proxyMemberId}
            onChange={(e) => {
              setProxyMemberId(e.target.value);
              if (!e.target.value) {
                // 自分自身に戻す
                if (user?.email) {
                  getMemberByEmail(user.email).then((m) => m && setProfile(m));
                }
                setIsEditing(false);
              }
            }}
            className="px-4 py-2 text-sm font-bold border-2 border-sky-300 rounded-xl bg-white text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400 min-w-[180px]"
          >
            <option value="">自分のページ</option>
            {allMembers.map((m) => (
              <option key={m.id} value={String(m.id)}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            {proxyMemberId
              ? `${profile?.name ?? ""} さんのページ（代理編集）`
              : "マイページ（プロフィール編集）"}
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
              {isEditing && isProxy ? (
                <div className="mt-1">
                  <input
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="example@gmail.com"
                    className="w-full max-w-sm bg-amber-50 border-2 border-amber-300 rounded-xl px-3 py-2 text-sm font-bold text-ag-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <p className="text-xs font-bold text-amber-700 mt-1 leading-relaxed">
                    ※メールはログインとの照合キーです。本人がGoogleログインに使う
                    アドレスと完全に同じものを入力してください（代理編集でのみ変更できます）。
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ag-gray-500 mt-1">{profile.email}</p>
              )}
              
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                 <div className="flex flex-col items-center md:items-start">
                   <span className="text-[10px] uppercase font-bold text-ag-gray-400 tracking-wider">基準年齢（4/1時点）</span>
                   <span className="text-lg font-bold text-ag-gray-800">{fiscalAge != null ? `${fiscalAge}歳` : "-"}</span>
                 </div>
                 <div className="flex flex-col items-center md:items-start">
                   <span className="text-[10px] uppercase font-bold text-ag-gray-400 tracking-wider">今日の年齢</span>
                   <span className="text-lg font-bold text-ag-gray-800">{todayAge != null ? `${todayAge}歳` : "-"}</span>
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
              <label className="text-xs font-bold text-ag-gray-500">ふりがな</label>
              {isEditing ? (
                <input type="text" value={profile.furigana || ""} onChange={(e) => setProfile({...profile, furigana: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="うえすぎ ゆか" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.furigana || "-"}</p>
              )}
            </div>
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
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">はまっこカード有効期限 (YYYY/MM/DD)</label>
              {isEditing ? (
                <input type="text" value={profile.hamakkoExpiry || ""} onChange={(e) => setProfile({...profile, hamakkoExpiry: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="2028/02/28" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.hamakkoExpiry || "-"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">入会日 (YYYY/MM/DD)</label>
              {isEditing ? (
                <input type="text" value={profile.joinedDate || ""} onChange={(e) => setProfile({...profile, joinedDate: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="2020/04/01" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.joinedDate || "-"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">LINE ID</label>
              {isEditing ? (
                <input type="text" value={profile.lineId || ""} onChange={(e) => setProfile({...profile, lineId: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.lineId || "-"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ag-gray-500">審判資格の有効年度 (YYYY)</label>
              {isEditing ? (
                <input type="text" value={profile.refereeYear || ""} onChange={(e) => setProfile({...profile, refereeYear: e.target.value})} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="2026" />
              ) : (
                <p className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 px-4 py-2.5 rounded-xl">{profile.refereeYear ? `${profile.refereeYear}年度まで有効` : "-"}</p>
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

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-ag-gray-400 uppercase tracking-widest">三地区</h4>
              <div className="space-y-3">
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">代表枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles?.threeDistrictRep || ""} onChange={(e) => setProfile({...profile, gymRoles: {...(profile.gymRoles || {}), threeDistrictRep: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles?.threeDistrictRep || "-"}</p>
                   )}
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">連絡枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles?.threeDistrictContact || ""} onChange={(e) => setProfile({...profile, gymRoles: {...(profile.gymRoles || {}), threeDistrictContact: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles?.threeDistrictContact || "-"}</p>
                   )}
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-ag-gray-400 uppercase tracking-widest">その他</h4>
              <div className="space-y-3">
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">代表枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles?.otherRep || ""} onChange={(e) => setProfile({...profile, gymRoles: {...(profile.gymRoles || {}), otherRep: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles?.otherRep || "-"}</p>
                   )}
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400">連絡枠</label>
                   {isEditing ? (
                     <input type="text" value={profile.gymRoles?.otherContact || ""} onChange={(e) => setProfile({...profile, gymRoles: {...(profile.gymRoles || {}), otherContact: e.target.value}})} className="w-full border-b text-sm py-1" />
                   ) : (
                     <p className="text-sm font-bold">{profile.gymRoles?.otherContact || "-"}</p>
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
            {/* 予定・アンケート・お知らせの通知 */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-ag-gray-600 block">
                予定・アンケート・お知らせの通知
                <span className="block text-xs font-normal text-ag-gray-400 mt-1 leading-relaxed">
                  新しい予定・アンケート・お知らせが追加されたときの受け取り方法です。ボタンをタップするとすぐに保存されます。
                  <br />
                  ※「アプリ通知」を選ぶと、スマホに通知が届き、アプリのアイコンに赤い印（未読の数）が付きます。初回は「通知を許可」を押してください（iPhoneはホーム画面に追加したアイコンから開く必要があります）。
                  <br />
                  ※慣れるまでは「メール＋アプリ」がおすすめです。アプリの通知がきちんと届くのを確かめてから、「アプリ通知」だけに切り替えるとメールが止まります。
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['email', 'app', 'both', 'none'] as const).map(method => {
                  const selected = (profile.notificationPrefs?.practiceUpdates || "email") === method;
                  const label =
                    method === 'email' ? 'メール' :
                    method === 'app' ? 'アプリ通知' :
                    method === 'both' ? 'メール＋アプリ' : '受け取らない';
                  return (
                    <button
                      key={`practice-${method}`}
                      type="button"
                      onClick={() => saveNotificationPref("practiceUpdates", method)}
                      className={`py-3 px-2 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${
                        selected
                          ? "bg-sky-500 border-sky-500 text-white shadow-md"
                          : "bg-white border-ag-gray-200 text-ag-gray-500 hover:border-sky-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {notifySaved === "practiceUpdates" && (
                <p className="text-xs font-black text-emerald-600">保存しました</p>
              )}

              {/* 自分の端末にだけテスト通知を送る（他人・メールには影響しない） */}
              {(profile.notificationPrefs?.practiceUpdates === "app" ||
                profile.notificationPrefs?.practiceUpdates === "both") && (
                <div className="pt-3 mt-2 border-t border-dashed border-ag-gray-200">
                  <button
                    type="button"
                    onClick={sendSelfTest}
                    disabled={testState === "sending"}
                    className="w-full py-3 px-4 rounded-2xl text-base font-black border-2 border-sky-500 text-sky-600 bg-white hover:bg-sky-50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {testState === "sending" ? "送信中..." : "この端末にテスト通知を送る"}
                  </button>
                  <p className="text-xs font-bold text-ag-gray-400 mt-2 leading-relaxed">
                    自分の端末にだけ届く確認用です。他の人やメールには一切送られません。
                  </p>
                  {testState === "sent" && (
                    <p className="text-sm font-black text-emerald-600 mt-2 leading-relaxed">
                      送信しました。数秒待って、通知とアイコンの赤い印を確認してください（アプリを一度ホーム画面に戻すと見えやすいです）。
                    </p>
                  )}
                  {testState === "none" && (
                    <p className="text-sm font-black text-amber-600 mt-2 leading-relaxed">
                      この端末の宛先が見つかりませんでした。もう一度上の「メール＋アプリ」または「アプリ通知」を押して、通知を「許可」してください。
                    </p>
                  )}
                  {testState === "error" && (
                    <p className="text-sm font-black text-red-500 mt-2 leading-relaxed">
                      送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ライト会員の申請依頼 */}
            <div className="space-y-3 pt-4 border-t border-ag-gray-100">
              <label className="text-xs font-bold text-ag-gray-500 block">ライト会員の申請依頼</label>
              <div className="grid grid-cols-3 gap-2">
                {(['email', 'app', 'none'] as const).map(method => {
                  const selected = (profile.notificationPrefs?.lightMemberRequests || "email") === method;
                  return (
                    <button
                      key={`light-${method}`}
                      type="button"
                      onClick={() => saveNotificationPref("lightMemberRequests", method)}
                      className={`py-3 px-2 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${
                        selected
                          ? "bg-sky-500 border-sky-500 text-white shadow-md"
                          : "bg-white border-ag-gray-200 text-ag-gray-500 hover:border-sky-200"
                      }`}
                    >
                      {method === 'email' ? 'メール' : method === 'app' ? 'アプリ通知' : '受け取らない'}
                    </button>
                  );
                })}
              </div>
              {notifySaved === "lightMemberRequests" && (
                <p className="text-xs font-black text-emerald-600">保存しました</p>
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
                    {n.type === "task" ? (
                      <>
                        <p className="text-xs font-black text-ag-gray-700 truncate">
                          新しい担当: {n.taskTitle}
                        </p>
                        <p className="text-xs font-bold text-ag-gray-500 mt-0.5">
                          <span className="text-ag-gray-700">{n.assignedByName}</span>さんが担当に設定しました{n.deadline ? `（期限: ${n.deadline.replace(/-/g, "/")}）` : ""}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-black text-ag-gray-700 truncate">
                          「{n.suggestionTitle}」に返信がありました
                        </p>
                        <p className="text-xs font-bold text-ag-gray-500 mt-0.5">
                          <span className="text-ag-gray-700">{n.replyAuthor}</span>：{n.replyBody.slice(0, 40)}{n.replyBody.length > 40 ? "…" : ""}
                        </p>
                      </>
                    )}
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
              // 出欠回答一覧（参加・不参加どちらも表示。予約でカバーされていないもの）
              const reservedEventIds = new Set(myReservations.map(r => r.eventId));
              const answeredList = myAttendances.filter(
                a => (a.status === "attend" || a.status === "absent") && !reservedEventIds.has(a.eventId)
              );

              if (activeReservations.length === 0 && answeredList.length === 0) {
                return <p className="text-sm text-ag-gray-400 font-bold text-center py-6">まだ回答した予定はありません</p>;
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

                  {answeredList.map((a) => {
                    const event = eventMap[a.eventId];
                    const dateStr = event
                      ? (() => {
                          const d = new Date(event.date + "T00:00:00");
                          const day = ["日","月","火","水","木","金","土"][d.getDay()];
                          return `${d.getMonth() + 1}/${d.getDate()}（${day}）`;
                        })()
                      : a.eventId;
                    const isAttend = a.status === "attend";
                    return (
                      <div key={a.eventId} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-ag-gray-50 border border-ag-gray-100">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isAttend ? "bg-ag-lime-500" : "bg-ag-gray-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-ag-gray-900">{dateStr}</span>
                            {event && <span className="text-xs font-bold text-ag-gray-500">{event.location}</span>}
                            <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-100">出欠回答</span>
                          </div>
                          <span className={`text-xs font-bold ${isAttend ? "text-ag-lime-600" : "text-ag-gray-500"}`}>
                            {isAttend ? "参加" : "不参加"}
                          </span>
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

      </div>

      {/* 年度更新モーダル */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                      onClick={async () => {
                        if (!profile || !user) return;
                        try {
                          const members = await getAllMembers();
                          const officialCount = members.filter(m => m.membershipType !== "light").length;
                          await createRenewalApplication({
                            applicantName: profile.name,
                            applicantUid: user.uid,
                            applicantEmail: user.email ?? "",
                            renewalType: renewalForm.type as RenewalType,
                            reason: renewalForm.reason,
                            officialMemberCount: officialCount || 15,
                          });
                          setRenewalStep("completed");
                        } catch {
                          alert("申請の送信に失敗しました。再度お試しください。");
                        }
                      }}
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
