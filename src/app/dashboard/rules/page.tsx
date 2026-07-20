"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { getMemberByEmail } from "@/lib/members";
// import 静的データはバックアップとして残すが、基本は型と合計数だけにしてコンポーネント内Stateを初期化するのに使う
import { FACILITY_CARDS, HAMASPO_CARDS, type FacilityCard, type HamaspoCard } from "@/data/facilityCards";
import {
  subscribeToFacilities,
  subscribeToHamaspo,
  updateFacility,
  updateHamaspo,
} from "@/lib/facilities";
import { subscribeToClubSettings, updateClubSettings, subscribeToTransportData, saveTransportData, subscribeToCarFeeAreas, saveCarFeeAreas, type ClubSettings, type DutyTeam, type AccountResponsibility, type TransportEntry, type CarFeeDoc } from "@/lib/settings";
import FacilityEditModal from "@/components/dashboard/FacilityEditModal";
import HamaspoEditModal from "@/components/dashboard/HamaspoEditModal";
import type { Member } from "@/data/memberList";
import { BOOKING_SCHEDULE_RULES } from "@/data/rulesData";

/**
 * 保存に失敗したとき、原因が分かる文章を返す。
 * 「失敗しました」だけだと、権限が無いのか通信が切れたのか分からず、
 * 同じ操作を何度も試すことになってしまうため。
 */
function describeSaveError(error: unknown, label: string): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "permission-denied") {
    return `${label}を保存する権限がありません。\nお手数ですが代表に連絡してください。`;
  }
  if (code === "unavailable") {
    return `通信が不安定で${label}を保存できませんでした。\n電波の良い場所でもう一度お試しください。`;
  }
  return `${label}の更新に失敗しました。時間をおいてもう一度お試しください。`;
}

function BookingRulesTab() {
  const { lightDelayDays, visitorDelayDays } = BOOKING_SCHEDULE_RULES;
  return (
    <div className="space-y-8 animate-fade-in text-ag-gray-900">
      {/* 概要カード */}
      <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-200 shadow-xl overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-sky-50 to-white border-b-2 border-ag-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-ag-gray-900 text-xl">練習予約の解禁スケジュール</h3>
            <p className="text-sm font-bold text-ag-gray-400 mt-1">
              会員種別ごとの予約開始タイミング（規約として定められています）
            </p>
          </div>
          <span className="text-xs font-black text-sky-800 bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200">
            2026年度 現行ルール
          </span>
        </div>

        <div className="p-8 space-y-6">
          {/* タイムライン */}
          <div className="relative">
            {[
              {
                label: "通常会員",
                timing: "練習がカレンダーに掲載されたらすぐ",
                detail: "最も早く予約が開放される。正会員全員が回答完了次第、ライト会員枠も早期解禁される。",
                color: "border-ag-lime-400 bg-ag-lime-50",
                badge: "bg-ag-lime-500 text-white",
                offset: 0,
              },
              {
                label: "ライト会員",
                timing: `通常会員解禁の ${lightDelayDays} 日後`,
                detail: `通常会員解禁から${lightDelayDays}日後、または通常会員全員が回答済みの場合に早期解禁。`,
                color: "border-sky-400 bg-sky-50",
                badge: "bg-sky-500 text-white",
                offset: lightDelayDays,
              },
              {
                label: "ビジター",
                timing: `通常会員解禁の ${visitorDelayDays} 日後`,
                detail: `通常会員解禁から${visitorDelayDays}日後、または正会員・ライト会員全員が回答済みの場合に早期解禁。予約状況に応じてキャンセル待ちになる場合あり。`,
                color: "border-amber-400 bg-amber-50",
                badge: "bg-amber-500 text-white",
                offset: visitorDelayDays,
              },
            ].map((item) => (
              <div key={item.label} className={`flex gap-5 items-start p-6 rounded-2xl border-2 mb-4 ${item.color}`}>
                <div className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-black ${item.badge}`}>
                  {item.label}
                </div>
                <div>
                  <p className="text-lg font-black text-ag-gray-900">{item.timing}</p>
                  <p className="text-sm font-bold text-ag-gray-500 mt-1">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ルール補足 */}
          <div className="bg-ag-gray-50 rounded-2xl border border-ag-gray-200 p-6 space-y-3 text-sm font-bold text-ag-gray-600 leading-relaxed">
            <p className="font-black text-ag-gray-800 text-base mb-3">補足事項</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>通常会員全員が出欠回答を完了した場合、ライト会員の解禁が早まる（早期解禁）。</li>
              <li>定員超過の場合はキャンセル待ち登録となる。キャンセルが出た順に自動昇格する。</li>
              <li>正会員・ライト会員から招待されたビジターは、招待者と同タイミングで予約可能。</li>
            </ul>
          </div>

          {/* 変更ガイド */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm font-bold text-amber-800">
            <p className="font-black text-amber-900 mb-1">ルールを変更したい場合</p>
            <p>
              <code className="bg-white px-2 py-0.5 rounded border border-amber-200 text-xs font-mono">
                src/data/rulesData.ts
              </code>{" "}
              の <code className="bg-white px-2 py-0.5 rounded border border-amber-200 text-xs font-mono">BOOKING_SCHEDULE_RULES</code> を編集するだけで、
              アプリ全体の予約ルールが一括で変わります（エンジニアへの依頼のみ）。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState("fees");
  const { user } = useAuth();
  const [currentMember, setCurrentMember] = useState<Member | null>(null);

  // 管理者用システム診断（読み取りのみ・メールは送らない）
  type DiagResult = {
    robot: { ok: boolean; error?: string };
    members: { ok: boolean; total: number; typed: number; missingNames: string[]; needsAttention: string[]; error?: string };
  };
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<DiagResult | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);
  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    setDiagResult(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setDiagError("ログイン情報が取得できませんでした。");
        return;
      }
      const res = await fetch("/api/admin-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDiagError(json?.error || "診断に失敗しました。");
        return;
      }
      setDiagResult(json as DiagResult);
    } catch (e) {
      console.error("システム診断に失敗:", e);
      setDiagError("診断に失敗しました。通信環境をご確認ください。");
    } finally {
      setDiagLoading(false);
    }
  };

  // ログインユーザーの会員種別を取得
  useEffect(() => {
    async function fetchMember() {
      if (user?.email) {
        try {
          const member = await getMemberByEmail(user.email);
          setCurrentMember(member);
        } catch (err) {
          console.error("会員情報取得エラー:", err);
        }
      }
    }
    fetchMember();
  }, [user]);

  const [facilities, setFacilities] = useState<FacilityCard[]>([]);
  const [hamaspoCards, setHamaspoCards] = useState<HamaspoCard[]>([]);
  
  // モーダル用
  const [editingFacility, setEditingFacility] = useState<FacilityCard | null>(null);
  const [editingHamaspo, setEditingHamaspo] = useState<HamaspoCard | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // 練習当番用
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);
  const [editingDutyTeams, setEditingDutyTeams] = useState<DutyTeam[] | null>(null);
  const [editingAccounts, setEditingAccounts] = useState<AccountResponsibility[] | null>(null);

  // 車代・乗り合わせ編集用
  const [transportData, setTransportData] = useState<TransportEntry[]>([]);
  const [editingTransport, setEditingTransport] = useState<TransportEntry[] | null>(null);
  const [passengerInputs, setPassengerInputs] = useState<Record<string, string>>({});

  // 車代精算基準表
  const [carFeeDoc, setCarFeeDoc] = useState<CarFeeDoc>({ areas: [], note: "燃費 10Km/1L 換算" });
  const [editingCarFee, setEditingCarFee] = useState<CarFeeDoc | null>(null);

  // Firestoreからデータ取得
  useEffect(() => {
    const unsubSettings = subscribeToClubSettings((settings) => {
      setClubSettings(settings);
    });
    const unsubTransport = subscribeToTransportData((entries) => {
      setTransportData(entries);
    });
    const unsubCarFee = subscribeToCarFeeAreas((data) => {
      setCarFeeDoc(data);
    });
    const unsubFacilities = subscribeToFacilities((data) => {
      const sorted = [...data].sort(
        (a, b) =>
          ((a as FacilityCard & { orderIndex?: number }).orderIndex ?? 0) -
          ((b as FacilityCard & { orderIndex?: number }).orderIndex ?? 0)
      );
      setFacilities(sorted);
    });
    const unsubHamaspo = subscribeToHamaspo((data) => {
      const sorted = [...data].sort(
        (a, b) =>
          ((a as HamaspoCard & { orderIndex?: number }).orderIndex ?? 0) -
          ((b as HamaspoCard & { orderIndex?: number }).orderIndex ?? 0)
      );
      setHamaspoCards(sorted);
    });
    return () => {
      unsubFacilities();
      unsubHamaspo();
      unsubSettings();
      unsubTransport();
      unsubCarFee();
    };
  }, []);

  const isOfficialMember = currentMember?.membershipType !== "light";
  // [一時的措置] ログイン機能ができるまでは誰でも編集可能にする
  const hasEditPermission = true;
  const mergedFacilities = FACILITY_CARDS.map(localCard => {
    const remoteCard = facilities.find(c => c.id === localCard.id);
    return remoteCard ? { ...localCard, ...remoteCard } : localCard;
  });

  const mergedHamaspo = HAMASPO_CARDS.map(localCard => {
    const remoteCard = hamaspoCards.find(c => c.id === localCard.id);
    if (!remoteCard) return localCard;
    // 写真リンクはコード側（facilityCards.ts）を正とする。
    // 画面から編集・保存したときに空のphotoUrlでリンクが消えるのを防ぐ。
    return { ...localCard, ...remoteCard, photoUrl: remoteCard.photoUrl || localCard.photoUrl };
  });


  const handleSaveDutyTeams = async () => {
    if (!editingDutyTeams) return;

    const seenMonths: number[] = [];
    for (let i = 0; i < editingDutyTeams.length; i++) {
      const team = editingDutyTeams[i];
      if (!team.label.trim()) {
        alert(`チーム ${i + 1} のチーム名が空です。`);
        return;
      }
      if (team.members.length === 0) {
        alert(`「${team.label}」のメンバーが0人です。少なくとも1人入力してください。`);
        return;
      }
      if (team.months.length === 0) {
        alert(`「${team.label}」の担当月が設定されていません。`);
        return;
      }
      for (const m of team.months) {
        if (m < 1 || m > 12) {
          alert(`「${team.label}」の担当月に1〜12以外の値（${m}）が含まれています。`);
          return;
        }
        if (seenMonths.includes(m)) {
          alert(`${m}月が複数のチームに重複して設定されています。`);
          return;
        }
        seenMonths.push(m);
      }
    }

    // リーダーがメンバーから外れている場合は掃除（Firestoreはundefinedを弾くので項目ごと削除）
    const cleanedTeams: DutyTeam[] = editingDutyTeams.map(team => {
      const { leader, ...rest } = team;
      return leader && team.members.includes(leader)
        ? { ...rest, leader }
        : rest;
    });

    setIsProcessing(true);
    try {
      await updateClubSettings({ dutyTeams: cleanedTeams });
      setEditingDutyTeams(null);
      alert("当番表を更新しました！ダッシュボードにも即時反映されます。");
    } catch (e) {
      console.error("当番表の更新エラー:", e);
      alert(describeSaveError(e, "当番表"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAccounts = async () => {
    if (!editingAccounts) return;
    for (let i = 0; i < editingAccounts.length; i++) {
      const acc = editingAccounts[i];
      if (!acc.service.trim()) {
        alert(`${i + 1} 番目のサービス名が空です。`);
        return;
      }
      if (!acc.person.trim()) {
        alert(`「${acc.service}」の担当者が空です。（担当未定の場合は「未設定」と入力してください）`);
        return;
      }
    }
    setIsProcessing(true);
    try {
      await updateClubSettings({ accountResponsibilities: editingAccounts });
      setEditingAccounts(null);
      alert("SNS・募集サイトの担当メモを更新しました。");
    } catch (e) {
      console.error("担当メモの更新エラー:", e);
      alert(describeSaveError(e, "担当メモ"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCarFee = async () => {
    if (!editingCarFee) return;
    setIsProcessing(true);
    try {
      await saveCarFeeAreas(editingCarFee);
      setEditingCarFee(null);
    } catch (err) {
      console.error("車代基準表保存エラー:", err);
      alert("保存に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };


  const handleSaveTransport = async () => {
    if (!editingTransport) return;
    setIsProcessing(true);
    try {
      await saveTransportData(editingTransport);
      setEditingTransport(null);
    } catch (err) {
      console.error("乗り合わせ保存エラー:", err);
      alert("保存に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs = [
    { id: "fees", name: "費用・登録規定", icon: "" },
    { id: "transport", name: "車代・精算基準", icon: "" },
    { id: "booking", name: "予約ルール", icon: "" },
    { id: "facilities", name: "練習場所・登録カード", icon: "" },
    { id: "organization", name: "役員・組織分担", icon: "" },
    { id: "matches", name: "試合・連盟・保険", icon: "" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-32">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-ag-gray-900 flex items-center gap-3 tracking-tighter">
            チーム規約・運営情報
          </h1>
          <p className="text-base sm:text-lg font-black text-ag-gray-500 mt-2 bg-ag-gray-50 px-4 py-2 rounded-xl border border-ag-gray-100 inline-block italic">
            最終更新: 2026年1月21日（コーチ契約・シャトル実績等確認済）
          </p>
        </div>
      </div>

      {/* タブナビゲーション (老眼対応) */}
      <div className="flex border-b-2 border-ag-gray-200 gap-8 overflow-x-auto custom-scrollbar pt-4 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 pb-4 font-black text-lg sm:text-xl transition-all border-b-4 whitespace-nowrap cursor-pointer active:scale-95 ${
              activeTab === tab.id 
                ? 'text-ag-lime-600 border-ag-lime-500 bg-ag-lime-50/30 px-6 rounded-t-xl' 
                : 'text-ag-gray-400 border-transparent hover:text-ag-gray-600 hover:bg-ag-gray-50/50 px-6'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* コンテンツエリア */}
      <div className="mt-6">
        {/* I & II. 費用・登録規定 */}
        {activeTab === "fees" && (
          <div className="space-y-8 animate-fade-in">
            {/* 練習費用比較表 */}
            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-200 shadow-xl overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-ag-lime-50 to-white border-b-2 border-ag-gray-100 flex items-center justify-between">
                <h3 className="font-black text-ag-gray-900 text-xl flex items-center gap-3">
                  区分・練習時間別 費用表
                </h3>
                <span className="text-xs font-black text-ag-lime-800 bg-ag-lime-100 px-3 py-1.5 rounded-xl tracking-widest uppercase border border-ag-lime-200 shadow-sm">固定+都度払い</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-base sm:text-lg">
                  <thead className="bg-ag-gray-100/50 text-ag-gray-600 text-xs font-black uppercase tracking-widest border-b-2 border-ag-gray-200">
                    <tr>
                      <th className="px-8 py-5 font-black">会員区分 / 登録条件</th>
                      <th className="px-8 py-5 font-black text-center">3時間練習費用</th>
                      <th className="px-8 py-5 font-black text-center">4時間練習費用</th>
                      <th className="px-8 py-5 font-black">備考・詳細</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-ag-gray-50 font-bold">
                    <tr className="hover:bg-ag-lime-50/20 transition-colors">
                      <td className="px-8 py-8">
                        <div className="font-black text-ag-gray-900 text-xl">通常会員</div>
                        <div className="text-sm text-ag-gray-500 mt-1">登録費済 + 月会費3,000円</div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="font-black text-ag-lime-700 text-2xl">固定 ¥750 相当</div>
                        <div className="text-xs text-ag-gray-400 mt-1">（月4回換算）</div>
                      </td>
                      <td className="px-8 py-8 text-center font-black text-ag-lime-700 text-2xl">固定 ¥750 相当</td>
                      <td className="px-8 py-8 text-sm text-ag-gray-600 leading-relaxed">
                        一番お得な主役プランです。
                      </td>
                    </tr>
                    <tr className="hover:bg-ag-lime-50/20 transition-colors">
                      <td className="px-8 py-8">
                        <div className="font-black text-ag-gray-900 text-xl">ライト会員</div>
                        <div className="text-sm text-ag-gray-500 mt-1 text-sky-600">登録費済・都度払い</div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="text-2xl font-black"><span className="font-mono text-ag-gray-900">¥850</span> / <span className="text-ag-gray-400 font-normal italic">¥650</span></div>
                        <div className="text-xs font-bold text-ag-gray-400 mt-1">コーチ 有 / 不在</div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="text-2xl font-black"><span className="font-mono text-ag-gray-900">¥1,050</span> / <span className="text-ag-gray-400 font-normal italic">¥850</span></div>
                        <div className="text-xs font-bold text-ag-gray-400 mt-1">コーチ 有 / 不在</div>
                      </td>
                      <td className="px-8 py-8 text-sm text-ag-gray-600 leading-relaxed bg-ag-gray-50/30">
                        850円の内訳: 通常(750) + 協力金100円<br/>
                        <span className="text-red-500">※笠井さん・第2練習：400円</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-ag-lime-50/50 transition-colors bg-ag-gray-50/20">
                      <td className="px-8 py-8 text-ag-gray-600">
                        <div className="font-black text-xl text-ag-gray-400">ビジター</div>
                        <div className="text-sm italic">非会員・当日払い</div>
                      </td>
                      <td className="px-8 py-8 text-center text-ag-gray-500 italic">
                        <div className="text-xl font-black"><span className="font-mono">¥1,100</span> / <span className="font-mono">¥900</span></div>
                      </td>
                      <td className="px-8 py-8 text-center text-ag-gray-500 italic">
                        <div className="text-xl font-black"><span className="font-mono">¥1,300</span> / <span className="font-mono">¥1,100</span></div>
                      </td>
                      <td className="px-8 py-8 text-sm text-ag-gray-400 italic">お客様価格設定です。</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>



            {/* コーチ契約情報 (老眼対策) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-amber-50 rounded-[2rem] border-2 border-amber-200 p-8 flex items-start gap-5 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-amber-300 flex items-center justify-center text-xl font-black shadow-sm flex-shrink-0 select-none">SH</div>
                <div>
                  <h4 className="text-xl font-black text-amber-950 mb-3 tracking-tight">コーチ契約内容 (2026/1時点)</h4>
                  <ul className="text-base sm:text-lg text-amber-900 space-y-3 font-bold list-none pl-1">
                    <li className="flex items-center gap-2"><span className="text-ag-lime-500 font-black">・</span> 3時間練習 (コーチング2H): <strong className="text-2xl text-amber-600 whitespace-nowrap ml-1 font-black">¥6,000</strong></li>
                    <li className="flex items-center gap-2"><span className="text-ag-lime-500 font-black">・</span> 4時間練習 (コーチング3H): <strong className="text-2xl text-amber-600 whitespace-nowrap ml-1 font-black">¥7,000</strong></li>
                    <li className="flex items-start gap-2"><span className="text-ag-lime-500 font-black">・</span> 車代（駐車場込）は部費より負担</li>
                    <li className="text-sm font-black italic opacity-60 mt-4 leading-relaxed bg-amber-100/50 p-3 rounded-xl">
                      ※乗り合わせの都合上、契約時間外でも練習の最初から最後までご参加いただいています。<br />
                      ※送迎は契約条件には含まれません。
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-ag-gray-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative ring-4 ring-ag-gray-800/50 flex flex-col justify-center">
                <div className="absolute -top-6 -right-6 p-4 opacity-5 text-8xl rotate-12 select-none font-black uppercase tracking-tighter">Finance</div>
                <h4 className="text-xl font-black mb-6 flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-ag-lime-400 animate-pulse"></span>
                  会費・登録の重要ルール
                </h4>
                <div className="space-y-6">
                  <div className="bg-white/5 p-4 rounded-2xl ring-1 ring-white/10">
                    <div className="text-xs text-ag-gray-400 font-black uppercase tracking-[0.2em] mb-1">年間登録費</div>
                    <div className="text-lg font-black text-white">正規会員：¥1,000 <span className="text-ag-gray-400 mx-1">/</span> ライト会員：¥3,000</div>
                    <div className="text-xs text-ag-gray-500 font-bold mt-1">(毎年2月支払い・返金不可)</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl ring-1 ring-white/10">
                    <div className="text-xs text-ag-gray-400 font-black uppercase tracking-[0.2em] mb-1">推奨支払い方法</div>
                    <div className="text-2xl font-black text-ag-lime-400 flex items-center gap-3">
                      PayPay推奨 <span className="text-xs bg-ag-lime-500/20 text-ag-lime-300 px-3 py-1 rounded-lg border border-ag-lime-500/40 tracking-widest font-bold">履歴必須</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ルールカード (老眼対策) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: "INFO", title: "1年ごとの更新制度", text: "毎年秋に次期（来年度）の継続意思を確認します。これにより「休部」区分はありません。リハビリ参加は基本無料（ゲーム練習参加はライト会員金額）です。" },
                { icon: "RULE", title: "ライト会員（救済措置）", text: "介護・仕事・療養など、週1回以上の参加が困難な方のための措置です。移行には現メンバーの60%以上の賛同が必要です。" },
                { icon: "RULE", title: "リハビリ措置について", text: "基礎打ち・見学のみの場合は無料です。一部でもゲーム練習へ参加する場合は、ライト会員の都度払い金額を徴収いたします。" }
              ].map((card, i) => (
                <div key={i} className="bg-white p-8 rounded-[2rem] border-2 border-ag-gray-100 shadow-lg hover:shadow-xl hover:border-ag-lime-200 transition-all flex flex-col gap-4">
                  <h4 className="text-xl font-black text-ag-gray-900 flex items-center gap-3">
                    <span className="text-2xl bg-ag-lime-50 w-10 h-10 rounded-xl flex items-center justify-center text-ag-lime-500">{card.icon}</span>
                    {card.title}
                  </h4>
                  <p className="text-base sm:text-lg font-bold text-ag-gray-600 leading-relaxed italic">
                    {card.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 予約ルール */}
        {activeTab === "booking" && (
          <BookingRulesTab />
        )}

        {/* IV. 練習場所・運用 (老眼対策) */}
        {activeTab === "facilities" && (
          <div className="space-y-8 animate-fade-in text-ag-gray-900">
            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-100 overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-ag-gray-100 bg-ag-gray-50/50">
                <h3 className="font-black text-ag-gray-900 text-xl sm:text-2xl mb-2 flex items-center gap-3">
                  体育館の確保と運用ルール
                </h3>
              </div>
              <div className="p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-10">
                  <div className="bg-white p-8 rounded-[2rem] border-2 border-ag-gray-100 shadow-sm">
                    <h4 className="text-lg sm:text-xl font-black text-ag-gray-800 mb-4 flex items-center justify-between border-b-2 border-ag-gray-50 pb-3">
                      <span>1. 確保の方針</span>
                      <span className="text-xs font-black text-white bg-ag-gray-900 px-3 py-1 rounded-lg tracking-widest italic shadow-sm">都筑区近郊</span>
                    </h4>
                    <p className="text-base sm:text-lg font-bold text-ag-gray-600 leading-relaxed italic">
                      移動負担軽減のため、遠方の体育館は行わず、都筑区近郊に絞って確保します。
                    </p>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border-2 border-ag-gray-100 shadow-sm">
                    <h4 className="text-lg sm:text-xl font-black text-ag-gray-800 mb-4 border-b-2 border-ag-gray-50 pb-3">2. エントリー分担</h4>
                    <ul className="text-base sm:text-lg font-bold text-ag-gray-600 leading-relaxed list-none space-y-4">
                      <li className="flex items-start gap-3">
                        <span className="text-ag-lime-500 mt-1">●</span>
                        <span>第3週：<strong className="text-ag-gray-900 font-black underline decoration-ag-lime-400">チームカード</strong>でスポセン最優先</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-ag-lime-500 mt-1">●</span>
                        <span>それ以外：各自の<strong className="text-ag-gray-900 font-black underline decoration-ag-lime-400">個人カード</strong>で地区センター等の確保にご協力ください。</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-10">
                  <div className="bg-ag-lime-500 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden ring-4 ring-ag-lime-100">
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/20 blur-xl"></div>
                    <h4 className="text-xl sm:text-2xl font-black mb-4 flex items-center gap-3">
                      空き枠の「拝借」ルール
                    </h4>
                    <p className="text-base sm:text-lg font-bold text-white/90 leading-relaxed mb-6">
                      チームカードでの当選枠で練習に使わない分などは、メンバーの上達や交流のために活用できます。
                    </p>
                    <div className="bg-white/20 p-5 rounded-2xl text-base font-black border border-white/30 italic shadow-inner">
                      手順：LINEで報告 → 相談し合い → 公平に使いましょう
                    </div>
                  </div>
                  <div className="p-8 bg-red-50 rounded-[2rem] border-2 border-red-100 shadow-sm">
                    <h4 className="text-lg sm:text-xl font-black text-red-900 mb-3 flex items-center gap-2">
                       体育館係の免責
                    </h4>
                    <p className="text-base sm:text-lg font-bold text-red-800 leading-relaxed">
                      役割は「抽選エントリーの管理」までです。当選結果（運）について係が責任を負うことはありません。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ↓ ここから旧施設登録カードの内容を統合 ↓ */}
            <div className="pt-20 border-t-4 border-ag-gray-100 border-dashed">
              <div className="flex flex-col items-center mb-10">
                <div className="text-ag-lime-500 text-4xl mb-4 font-black bg-ag-lime-50 w-16 h-16 rounded-full flex items-center justify-center border-2 border-ag-lime-100 italic">ID</div>
                <h2 className="text-3xl sm:text-4xl font-black text-ag-gray-900 tracking-tighter">施設登録カード・原本情報</h2>
                <div className="h-1.5 w-24 bg-ag-lime-400 rounded-full mt-4"></div>
                <p className="text-ag-gray-500 font-bold mt-4 italic">※各施設の抽選ID・パスワードおよび登録代表者の一覧です</p>
              </div>

              {user && !isOfficialMember ? (
                <div className="p-16 bg-white rounded-[3rem] border-2 border-ag-gray-100 text-center shadow-xl">
                  <div className="text-6xl mb-6">🔒</div>
                  <h3 className="text-2xl font-black text-ag-gray-800 mb-4">施設情報はオフィシャル会員限定です</h3>
                  <p className="text-ag-gray-500 font-bold leading-relaxed max-w-md mx-auto">
                    カード番号、パスワードなどの機密情報は、ライト会員のアカウントではご覧いただけません。
                  </p>
                </div>
              ) : (
                <>
                  {/* 地区センターセクション */}
                  <div className="bg-white rounded-[3rem] border-2 border-ag-gray-100 overflow-hidden shadow-2xl mb-12">
                    <div className="px-8 py-6 bg-gradient-to-r from-emerald-50 to-white border-b-2 border-ag-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-black text-ag-gray-900 text-xl sm:text-2xl">地区センター・登録カード一覧</h3>
                      </div>
                      <span className="text-sm font-black text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
                        合計 {mergedFacilities.reduce((sum, f) => sum + f.registrations.reduce((s, r) => s + r.slots, 0), 0)}枠
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-ag-gray-50/50">
                            <th className="px-3 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-50 sticky left-0 z-20 w-[90px] min-w-[90px] max-w-[90px] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">施設名</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[130px]">登録団体名</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 text-center w-12">枠</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[110px]">ID</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[110px]">パスワード</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[80px]">代表者</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[80px]">連絡者</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[140px]">構成員</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[120px]">発売日 / 抽選</th>
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[260px]">駐車場・備考</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ag-gray-100">
                          {mergedFacilities.map((facility) => (
                            <tr key={facility.id} className="hover:bg-ag-lime-50/30 transition-colors group">
                              <td className="px-3 py-4 align-top sticky left-0 z-10 bg-white group-hover:bg-ag-lime-50/30 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors w-[90px] min-w-[90px] max-w-[90px]">
                                <div className="flex flex-col gap-2">
                                  <span className="font-black text-sm text-ag-gray-900 leading-snug">{facility.name}</span>
                                  {hasEditPermission && (
                                    <button
                                      onClick={() => setEditingFacility(facility as FacilityCard)}
                                      className="self-start text-xs font-black bg-ag-lime-100 text-ag-lime-700 hover:bg-ag-lime-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                                    >
                                      編集
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-6 align-top space-y-2">
                                {facility.registrations.map((reg, idx) => (
                                  <div key={idx} className="font-black text-ag-gray-800 whitespace-nowrap">{reg.teamName}</div>
                                ))}
                              </td>
                              <td className="px-6 py-6 align-top space-y-2 text-center">
                                {facility.registrations.map((reg, idx) => (
                                  <div key={idx} className="font-black text-ag-lime-600">{reg.slots}</div>
                                ))}
                              </td>
                              <td className="px-6 py-6 align-top space-y-2 font-mono text-sm text-ag-gray-500">
                                {facility.registrations.map((reg, idx) => (
                                  <div key={idx}>{reg.id}</div>
                                ))}
                              </td>
                              <td className="px-6 py-6 align-top space-y-2 font-mono text-sm text-red-600 bg-red-50/30">
                                {facility.registrations.map((reg, idx) => (
                                  <div key={idx}>{reg.password}</div>
                                ))}
                              </td>
                              <td className="px-6 py-6 align-top space-y-2">
                                {facility.registrations.map((reg, idx) => (
                                  <div key={idx} className="text-sm font-bold text-ag-gray-700">{reg.representative || <span className="text-ag-gray-300">—</span>}</div>
                                ))}
                              </td>
                              <td className="px-6 py-6 align-top space-y-2">
                                {facility.registrations.map((reg, idx) => (
                                  <div key={idx} className="text-sm font-bold text-ag-gray-700">{reg.contact || <span className="text-ag-gray-300">—</span>}</div>
                                ))}
                              </td>
                              <td className="px-6 py-6 align-top space-y-2">
                                {facility.registrations.map((reg, idx) => (
                                  <div key={idx} className="text-xs text-ag-gray-500 leading-relaxed">{reg.members || <span className="text-ag-gray-300">—</span>}</div>
                                ))}
                              </td>
                              <td className="px-6 py-6 align-top">
                                <div className="text-sm font-black text-ag-gray-900">{facility.releaseDay}</div>
                                <div className="text-xs text-ag-gray-400 font-bold mt-1 italic">{facility.drawDay}</div>
                              </td>
                              <td className="px-6 py-6 align-top">
                                <div className="text-xs font-black text-ag-gray-800 leading-relaxed">
                                  P: {facility.parking}
                                </div>
                                <div className="text-xs text-ag-gray-400 font-bold mt-2 italic">
                                  {facility.notes}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ハマスポセクション */}
                  <div className="bg-white rounded-[3rem] border-2 border-ag-gray-100 overflow-hidden shadow-2xl mb-12">
                    <div className="px-8 py-6 bg-gradient-to-r from-sky-50 to-white border-b-2 border-ag-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-black text-ag-gray-900 text-xl sm:text-2xl">ハマスポ / スポーツセンター</h3>
                      </div>
                      <span className="text-sm font-black text-sky-800 bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200">
                        合計 {mergedHamaspo.reduce((sum, h) => sum + h.slots, 0)}枠
                      </span>
                    </div>
                    <div className="px-8 py-4 bg-sky-50/70 border-b-2 border-ag-gray-100">
                      <p className="text-sm sm:text-base font-black text-sky-900 leading-relaxed">
                        青い下線の団体名をタップすると登録カードの写真が開きます。支払いのときは受付でこの写真を見せてください。
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-ag-gray-50/50">
                            <th className="px-3 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-50 sticky left-0 z-20 w-[90px] min-w-[90px] max-w-[90px] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">団体名</th>
                            <th className="px-4 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 text-center w-12">枠</th>
                            <th className="px-4 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[110px]">ID</th>
                            <th className="px-4 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[110px]">パスワード</th>
                            <th className="px-4 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[72px]">代表者</th>
                            <th className="px-4 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[100px]">構成員</th>
                            <th className="px-4 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-100/30 min-w-[220px]">備考</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ag-gray-100">
                          {mergedHamaspo.map((card) => (
                            <tr key={card.id} className="hover:bg-sky-50/30 transition-colors group">
                              <td className="px-3 py-4 sticky left-0 z-10 bg-white group-hover:bg-sky-50/30 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors w-[90px] min-w-[90px] max-w-[90px]">
                                <div className="flex flex-col gap-1">
                                  {card.photoUrl ? (
                                    <a
                                      href={card.photoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-black text-sm text-sky-700 underline underline-offset-2 leading-snug hover:text-sky-900"
                                      title="タップするとカードの写真が開きます"
                                    >
                                      {card.teamName}
                                    </a>
                                  ) : (
                                    <div className="font-black text-sm text-ag-gray-900 leading-snug">{card.teamName}</div>
                                  )}
                                  <div className="text-xs text-sky-500 font-black italic">更新: {card.renewalDate}</div>
                                  {hasEditPermission && (
                                    <button
                                      onClick={() => setEditingHamaspo(card as HamaspoCard)}
                                      className="self-start text-xs font-black bg-sky-100 text-sky-700 hover:bg-sky-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors mt-1"
                                    >
                                      編集
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 font-black text-center text-sky-700">{card.slots}</td>
                              <td className="px-4 py-4 font-mono text-sm text-ag-gray-700">{card.id}</td>
                              <td className="px-4 py-4 font-mono text-sm text-red-600 bg-red-50/30">{card.password}</td>
                              <td className="px-4 py-4 text-sm text-ag-gray-600">{card.representative}</td>
                              <td className="px-4 py-4 text-sm text-ag-gray-500">{card.members}</td>
                              <td className="px-4 py-4 text-xs text-ag-gray-400 max-w-[200px] italic">{card.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-center text-sm font-bold text-ag-gray-400 italic pt-4">
                    ※この情報は変更があれば「編集」ボタンから更新してください（役員・管理者用）
                  </div>


                  {/* モーダル群 */}
                  <FacilityEditModal
                    isOpen={!!editingFacility}
                    onClose={() => setEditingFacility(null)}
                    facility={editingFacility}
                    onSave={updateFacility}
                  />
                  <HamaspoEditModal
                    isOpen={!!editingHamaspo}
                    onClose={() => setEditingHamaspo(null)}
                    card={editingHamaspo}
                    onSave={updateHamaspo}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* V. 役員・組織分担 (老眼対策) */}
        {activeTab === "organization" && (
          <div className="space-y-10 animate-fade-in text-ag-gray-900">
            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-100 shadow-xl p-8 lg:p-14">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                  <h3 className="font-black text-3xl sm:text-4xl text-ag-gray-900 mb-4 tracking-tighter">
                    BB 輪番・グループ制 組織概要
                  </h3>
                  <p className="text-lg sm:text-xl font-bold text-ag-gray-500 max-w-2xl mx-auto leading-relaxed italic">
                    運営は特定の個人ではなく、全員で少しずつ担当する「お互い様精神」で成り立っています。
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
                  {[
                    { role: "代表 (2年)", task: "連盟窓口、試合や講習会の申込" },
                    { role: "部長 (2年)", task: "チーム全体のまとめ、コーチ打ち合わせ" },
                    { role: "事務局 (1年)", task: "名簿・総会資料作成、掲示板管理" },
                    { role: "会計 (1年)", task: "部費集金、経費精算、シャトル管理、保険" },
                    { role: "体育館係", task: "練習場所手配・抽選エントリー管理" },
                    { role: "都筑区役員 (2年)", task: "都筑区レディース連盟の役員業務" },
                    { role: "練習当番 (2ヶ月)", task: "挨拶、シャトル管理、設営・片付け" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-5 p-6 bg-ag-gray-50/50 border-2 border-ag-gray-100 rounded-3xl hover:bg-white hover:border-ag-lime-400 hover:shadow-lg transition-all group">
                      <div className="w-12 h-12 rounded-2xl bg-ag-gray-100 border-2 border-ag-gray-200 flex items-center justify-center text-base font-black text-ag-gray-400 group-hover:bg-ag-lime-500 group-hover:text-white group-hover:border-ag-lime-400 transition-all">{i+1}</div>
                      <div>
                        <div className="text-lg sm:text-xl font-black text-ag-gray-900 tracking-tight">{item.role}</div>
                        <div className="text-sm sm:text-base font-bold text-ag-gray-500 mt-1.5 leading-relaxed">{item.task}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-ag-gray-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden ring-4 ring-ag-gray-800">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl select-none rotate-12 font-black uppercase">ORG</div>
                    <h4 className="font-black text-2xl mb-8 flex items-center gap-3">
                      【重要】 全員協力
                    </h4>
                    <div className="space-y-8">
                      <div className="flex gap-5">
                        <div className="w-8 h-8 rounded-full bg-ag-lime-500 flex items-center justify-center flex-shrink-0 text-sm font-black shadow-lg">1</div>
                        <p className="text-base sm:text-lg font-bold leading-relaxed shadow-sm">
                          <strong className="text-ag-lime-400 text-xl font-black block mb-1">練習当番：</strong>
                          ライト会員の方も、入部時からご協力いただきます。
                        </p>
                      </div>
                      <div className="flex gap-5">
                        <div className="w-8 h-8 rounded-full bg-ag-lime-500 flex items-center justify-center flex-shrink-0 text-sm font-black shadow-lg">2</div>
                        <p className="text-base sm:text-lg font-bold leading-relaxed shadow-sm">
                          <strong className="text-ag-lime-400 text-xl font-black block mb-1">役員担当：</strong>
                          入部2年目以降、状況を相談しながら順次担当をお願いします。
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border-2 border-amber-200 p-10 rounded-[2.5rem] shadow-sm flex flex-col justify-center">
                    <h4 className="text-xl sm:text-2xl font-black text-amber-900 mb-8 flex items-center gap-3">
                      役員手当と負担軽減
                    </h4>
                    <ul className="text-base sm:text-lg font-bold text-amber-800 space-y-6 list-none">
                      <li className="flex gap-4 items-start">
                        <span className="text-2xl text-amber-500 leading-none">●</span>
                        <span>役員手当として一人あたり<strong className="text-xl text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">年間2,000円</strong>を計上。</span>
                      </li>
                      <li className="flex gap-4 items-start">
                        <span className="text-2xl text-amber-500 leading-none">●</span>
                        <span>事務作業は練習時間内に完了させ、持ち帰りをなくします。</span>
                      </li>
                      <li className="flex gap-4 items-start">
                        <span className="text-2xl text-amber-500 leading-none">●</span>
                        <span>ゲーム時のカウントは「セルフカウント方式」を採用。</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 練習当番の管理 */}
              <div className="mt-16 pt-16 border-t-[3px] border-ag-gray-100 border-dashed">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                  <div>
                    <h3 className="font-black text-3xl sm:text-4xl text-ag-gray-900 tracking-tighter flex items-center gap-3">
                      練習当番チーム編成
                    </h3>
                    <p className="text-ag-gray-500 font-bold mt-2 text-lg">ダッシュボードに自動表示される当番表です。ここでメンバー編成を変更できます。</p>
                  </div>
                  {hasEditPermission && (
                    <button
                      onClick={() => setEditingDutyTeams(JSON.parse(JSON.stringify(clubSettings?.dutyTeams || [])))}
                      className="bg-ag-lime-100 text-ag-lime-700 hover:bg-ag-lime-200 px-6 py-2.5 rounded-xl font-black transition-colors shadow-sm"
                    >
                      編成を変更する
                    </button>
                  )}
                </div>

                {editingDutyTeams ? (
                  <div className="bg-ag-lime-50/50 border-2 border-ag-lime-200 p-8 rounded-[2.5rem] shadow-sm mb-12 animate-fade-in">
                    <h4 className="text-xl font-black text-ag-lime-900 mb-6 border-b-2 border-ag-lime-200 pb-3">チーム編成の編集</h4>
                    <div className="space-y-6">
                      {editingDutyTeams.map((team, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-ag-lime-100 space-y-4 relative">
                          {/* 簡易的な削除ボタンがあっても良いが今回は固定の3チーム想定 */}
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <input 
                              type="text" 
                              value={team.label} 
                              onChange={(e) => {
                                const newTeams = [...editingDutyTeams];
                                newTeams[idx].label = e.target.value;
                                setEditingDutyTeams(newTeams);
                              }}
                              className="font-black text-xl text-ag-gray-800 border-b-2 border-ag-lime-200 focus:border-ag-lime-500 outline-none w-full md:w-40 py-1 bg-transparent"
                              placeholder="チーム名"
                            />
                            <div className="flex items-center gap-3 flex-1 bg-ag-gray-50 p-2 rounded-xl border border-ag-gray-100">
                              <span className="text-sm font-black text-ag-gray-400 shrink-0">担当月(数字):</span>
                              <input 
                                type="text" 
                                value={team.months.join(",")} 
                                onChange={(e) => {
                                  const newTeams = [...editingDutyTeams];
                                  newTeams[idx].months = e.target.value.split(",").map(m => parseInt(m.trim())).filter(m => !isNaN(m));
                                  setEditingDutyTeams(newTeams);
                                }}
                                className="font-black text-lg text-ag-lime-700 bg-transparent outline-none w-full tracking-widest"
                                placeholder="例: 2,3,8,9"
                              />
                            </div>
                          </div>
                          <div className="bg-ag-gray-50 p-4 rounded-xl border border-ag-gray-100">
                            <div className="text-sm font-black text-ag-gray-400 mb-2">メンバー一覧 (「・」区切り)</div>
                            <input 
                              type="text" 
                              value={team.members.join("・")} 
                              onChange={(e) => {
                                const newTeams = [...editingDutyTeams];
                                newTeams[idx].members = e.target.value.split("・").map(m => m.trim()).filter(m => m !== "");
                                setEditingDutyTeams(newTeams);
                              }}
                              className="w-full font-black text-lg text-ag-gray-800 border-b-2 border-ag-gray-300 focus:border-ag-lime-500 outline-none py-1 bg-transparent"
                              placeholder="例: 山本・伊藤・石川"
                            />
                          </div>
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <div className="text-sm font-black text-amber-700 mb-2">リーダー (このチームの代表者)</div>
                            <select
                              value={team.leader && team.members.includes(team.leader) ? team.leader : ""}
                              onChange={(e) => {
                                const newTeams = [...editingDutyTeams];
                                newTeams[idx].leader = e.target.value || undefined;
                                setEditingDutyTeams(newTeams);
                              }}
                              className="w-full font-black text-lg text-amber-800 border-b-2 border-amber-300 focus:border-amber-500 outline-none py-1 bg-transparent"
                            >
                              <option value="">（リーダーなし）</option>
                              {team.members.map(member => (
                                <option key={member} value={member}>{member}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="text"
                              value={team.note || ""}
                              onChange={(e) => {
                                const newTeams = [...editingDutyTeams];
                                newTeams[idx].note = e.target.value;
                                setEditingDutyTeams(newTeams);
                              }}
                              className="w-full text-sm font-bold text-amber-700 border-b border-amber-200 focus:border-amber-500 outline-none py-2 bg-amber-50 px-3 rounded-xl"
                              placeholder="備考 (任意 例: ※12月はお楽しみ会担当)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-8 justify-end">
                      <button onClick={() => setEditingDutyTeams(null)} className="px-6 py-3 font-black text-ag-gray-500 hover:bg-ag-gray-100 rounded-xl transition-colors">キャンセル</button>
                      <button onClick={handleSaveDutyTeams} disabled={isProcessing} className="px-8 py-3 font-black text-white bg-ag-lime-500 hover:bg-ag-lime-600 rounded-xl transition-colors shadow-lg shadow-ag-lime-500/30 disabled:opacity-50 text-lg">
                        {isProcessing ? "保存中..." : "保存してダッシュボードに反映"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clubSettings?.dutyTeams?.map((team, idx) => {
                      const colors = [
                        { border: "border-ag-lime-300", bg: "bg-ag-lime-500", light: "bg-ag-lime-50", text: "text-ag-lime-700", monthBg: "bg-ag-lime-100 text-ag-lime-800 border-ag-lime-200" },
                        { border: "border-sky-300",     bg: "bg-sky-500",     light: "bg-sky-50",     text: "text-sky-700",     monthBg: "bg-sky-100 text-sky-800 border-sky-200" },
                        { border: "border-amber-300",   bg: "bg-amber-500",   light: "bg-amber-50",   text: "text-amber-700",   monthBg: "bg-amber-100 text-amber-800 border-amber-200" },
                      ][idx % 3];
                      return (
                        <div key={idx} className={`bg-white rounded-2xl border-2 ${colors.border} overflow-hidden`}>
                          <div className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 ${colors.light}`}>
                            {/* チーム名 */}
                            <div className={`${colors.bg} text-white text-xs font-black px-3 py-1 rounded-lg shrink-0`}>
                              チーム {idx + 1}
                            </div>
                            <h4 className={`font-black text-base ${colors.text}`}>{team.label || `チーム${idx + 1}`}</h4>
                            {/* 担当月バッジ */}
                            <div className="flex gap-1.5 flex-wrap sm:ml-auto">
                              {team.months.map(m => (
                                <span key={m} className={`text-xs font-black px-2.5 py-1 rounded-lg border ${colors.monthBg}`}>
                                  {m}月
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* メンバー */}
                          <div className="px-5 py-3 flex flex-wrap gap-2 items-center">
                            {team.members.map(member => {
                              const isLeader = team.leader === member;
                              return (
                                <span
                                  key={member}
                                  className={`text-sm font-bold px-3 py-1 rounded-xl border inline-flex items-center gap-1.5 ${
                                    isLeader
                                      ? "text-white bg-amber-500 border-amber-500 shadow-sm"
                                      : "text-ag-gray-800 bg-ag-gray-50 border-ag-gray-200"
                                  }`}
                                >
                                  {isLeader && (
                                    <span className="text-[10px] font-black bg-white text-amber-600 px-1.5 py-0.5 rounded-md leading-none">
                                      リーダー
                                    </span>
                                  )}
                                  {member}
                                </span>
                              );
                            })}
                            {team.note && (
                              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl ml-auto">
                                ※ {team.note}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SNS・募集サイトの担当メモ（パスワードは載せない） */}
            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-100 shadow-xl p-8 lg:p-14">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                <div>
                  <h3 className="font-black text-3xl sm:text-4xl text-ag-gray-900 tracking-tighter">
                    SNS・募集サイトの担当
                  </h3>
                  <p className="text-ag-gray-500 font-bold mt-2 text-lg">
                    Instagram・スポーツやろうよ！など、みんなで使う外部アカウントの担当と連絡先メモです。
                  </p>
                </div>
                {hasEditPermission && !editingAccounts && (
                  <button
                    onClick={() => setEditingAccounts(JSON.parse(JSON.stringify(clubSettings?.accountResponsibilities || [])))}
                    className="bg-ag-lime-100 text-ag-lime-700 hover:bg-ag-lime-200 px-6 py-2.5 rounded-xl font-black transition-colors shadow-sm shrink-0"
                  >
                    担当を変更する
                  </button>
                )}
              </div>

              {/* パスワードの在り処（固定の案内・重要） */}
              <div className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-6 mb-8">
                <h4 className="font-black text-lg sm:text-xl text-sky-900 mb-3 flex items-center gap-2">
                  ログイン情報（パスワード）の在り処
                </h4>
                <ul className="text-base font-bold text-sky-800 space-y-2 leading-relaxed">
                  <li>● 各アカウントのログインパスワードは、<strong>安全のためこのアプリには保存していません。</strong></li>
                  <li>● パスワードは<strong>クラブ共有のGmail（bigbeans.tsuduki@gmail.com）</strong>の「Googleパスワードマネージャー」で管理しています。</li>
                  <li>● 各アカウントの登録メールも共有Gmailに統一しているため、万一パスワードが分からなくなっても、共有Gmail宛の再設定メールから復旧できます。</li>
                  <li>● 担当を引き継ぐときは、この共有Gmailに入れるようにしてください（アクセス方法はシステム管理者へ）。</li>
                </ul>
              </div>

              {editingAccounts ? (
                <div className="bg-ag-lime-50/50 border-2 border-ag-lime-200 p-8 rounded-[2.5rem] shadow-sm animate-fade-in">
                  <h4 className="text-xl font-black text-ag-lime-900 mb-6 border-b-2 border-ag-lime-200 pb-3">担当メモの編集</h4>
                  <div className="space-y-6">
                    {editingAccounts.map((acc, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-ag-lime-100 space-y-4 relative">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <div className="text-sm font-black text-ag-gray-400 mb-1">サービス名</div>
                            <input
                              type="text"
                              value={acc.service}
                              onChange={(e) => {
                                const next = [...editingAccounts];
                                next[idx] = { ...next[idx], service: e.target.value };
                                setEditingAccounts(next);
                              }}
                              className="w-full font-black text-lg text-ag-gray-800 border-b-2 border-ag-gray-300 focus:border-ag-lime-500 outline-none py-1 bg-transparent"
                              placeholder="例: Instagram"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-black text-ag-gray-400 mb-1">アカウント名・URL（任意・公開情報のみ）</div>
                            <input
                              type="text"
                              value={acc.account || ""}
                              onChange={(e) => {
                                const next = [...editingAccounts];
                                next[idx] = { ...next[idx], account: e.target.value };
                                setEditingAccounts(next);
                              }}
                              className="w-full font-black text-lg text-ag-gray-800 border-b-2 border-ag-gray-300 focus:border-ag-lime-500 outline-none py-1 bg-transparent"
                              placeholder="例: @bigbeans_badmintonteam"
                            />
                          </div>
                        </div>
                        <div className="bg-ag-gray-50 p-4 rounded-xl border border-ag-gray-100">
                          <div className="text-sm font-black text-ag-gray-400 mb-1">現在の担当者</div>
                          <input
                            type="text"
                            value={acc.person}
                            onChange={(e) => {
                              const next = [...editingAccounts];
                              next[idx] = { ...next[idx], person: e.target.value };
                              setEditingAccounts(next);
                            }}
                            className="w-full font-black text-lg text-ag-lime-700 border-b-2 border-ag-gray-300 focus:border-ag-lime-500 outline-none py-1 bg-transparent"
                            placeholder="例: 山本（未定なら「未設定」）"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={acc.note || ""}
                            onChange={(e) => {
                              const next = [...editingAccounts];
                              next[idx] = { ...next[idx], note: e.target.value };
                              setEditingAccounts(next);
                            }}
                            className="w-full text-sm font-bold text-amber-700 border-b border-amber-200 focus:border-amber-500 outline-none py-2 bg-amber-50 px-3 rounded-xl"
                            placeholder="備考（任意 例: 練習の様子・大会報告を発信）"
                          />
                        </div>
                        <div className="flex justify-end pt-2 border-t border-ag-gray-100">
                          <button
                            onClick={() => {
                              if (confirm(`「${acc.service || "この項目"}」を削除しますか？`)) {
                                setEditingAccounts(editingAccounts.filter((_, i) => i !== idx));
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-black text-sm rounded-xl border-2 border-red-200 transition-colors"
                          >
                            この項目を削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setEditingAccounts([...editingAccounts, { service: "", account: "", person: "未設定", note: "" }])}
                    className="mt-6 px-6 py-3 font-black text-ag-lime-700 bg-ag-lime-100 hover:bg-ag-lime-200 rounded-xl transition-colors"
                  >
                    ＋ 行を追加
                  </button>
                  <div className="flex gap-4 mt-8 justify-end">
                    <button onClick={() => setEditingAccounts(null)} className="px-6 py-3 font-black text-ag-gray-500 hover:bg-ag-gray-100 rounded-xl transition-colors">キャンセル</button>
                    <button onClick={handleSaveAccounts} disabled={isProcessing} className="px-8 py-3 font-black text-white bg-ag-lime-500 hover:bg-ag-lime-600 rounded-xl transition-colors shadow-lg shadow-ag-lime-500/30 disabled:opacity-50 text-lg">
                      {isProcessing ? "保存中..." : "保存する"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {(clubSettings?.accountResponsibilities || []).map((acc, idx) => (
                    <div key={idx} className="bg-ag-gray-50/50 border-2 border-ag-gray-100 rounded-3xl p-6">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="font-black text-xl text-ag-gray-900">{acc.service}</span>
                        {acc.account && (
                          <span className="text-sm font-black text-ag-gray-500 bg-white border border-ag-gray-200 px-3 py-1 rounded-lg break-all">{acc.account}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-ag-gray-400">担当</span>
                        <span className={`text-lg font-black px-3 py-0.5 rounded-lg ${acc.person === "未設定" ? "text-amber-700 bg-amber-50 border border-amber-200" : "text-ag-lime-700 bg-ag-lime-50 border border-ag-lime-200"}`}>
                          {acc.person}
                        </span>
                      </div>
                      {acc.note && (
                        <p className="text-sm font-bold text-ag-gray-500 mt-3 leading-relaxed">{acc.note}</p>
                      )}
                    </div>
                  ))}
                  {(clubSettings?.accountResponsibilities || []).length === 0 && (
                    <p className="text-ag-gray-400 font-bold col-span-full">まだ登録がありません。「担当を変更する」から追加してください。</p>
                  )}
                </div>
              )}
            </div>

            {/* このアプリ（ホームページ）の詳細情報（普段は畳んでおく） */}
            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-100 shadow-xl p-8 lg:p-14">
              <details className="group">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-3xl sm:text-4xl text-ag-gray-900 tracking-tighter">
                      システム・技術の詳細情報
                    </h3>
                    <p className="text-ag-gray-500 font-bold mt-2 text-lg">
                      普段は開かなくて大丈夫です。万が一のときに、システム（AIO）が対応するための詳細
                      （ログイン情報の在り処など）をまとめています。※パスワードは載せていません（在り処のみ）。
                    </p>
                  </div>
                  <span className="shrink-0 mt-2 w-10 h-10 rounded-full bg-ag-gray-100 flex items-center justify-center text-ag-gray-500 group-open:rotate-180 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>

                <div className="mt-8">
                  <p className="inline-block text-base font-black text-sky-800 bg-sky-50 border border-sky-200 px-4 py-2 rounded-xl">
                    システム担当：上杉（AIO）　なにかあればAIOが対応します
                  </p>

                  {/* システム診断（読み取りのみ・メールは送らない）。
                      表示はログイン中なら出す。実行の可否はサーバー側で管理者・サポーターに限定。 */}
                  {user && (
                    <div className="mt-8 bg-white border-2 border-ag-gray-200 rounded-3xl p-6">
                      <h4 className="font-black text-xl text-ag-gray-900">システム診断（管理者用）</h4>
                      <p className="text-ag-gray-500 font-bold mt-1 leading-relaxed">
                        「7日前の自動催促メール」がちゃんと動くか、会員種別が未設定の人がいないかを確認します。
                        <b className="text-ag-gray-700">メールは一切送りません。データも変わりません。</b>
                      </p>
                      <button
                        onClick={runDiagnostics}
                        disabled={diagLoading}
                        className="mt-4 px-6 py-3 rounded-2xl font-black text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-md disabled:opacity-50"
                      >
                        {diagLoading ? "確認中..." : "システム診断を実行"}
                      </button>

                      {diagError && (
                        <p className="mt-4 text-base font-black text-red-600">{diagError}</p>
                      )}

                      {diagResult && (
                        <div className="mt-6 space-y-4">
                          {/* A: 自動催促（ロボット） */}
                          <div className={`rounded-2xl p-5 border-2 ${diagResult.robot.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                            <div className="font-black text-lg text-ag-gray-900">
                              7日前の自動催促メール：
                              <span className={diagResult.robot.ok ? "text-emerald-700" : "text-red-600"}>
                                {diagResult.robot.ok ? "　正常（毎晩21時ごろ自動で動きます）" : "　エラーあり"}
                              </span>
                            </div>
                            {!diagResult.robot.ok && (
                              <p className="text-sm font-bold text-red-600 mt-2 leading-relaxed break-words">
                                ロボット役のログインに失敗しています。原因: {diagResult.robot.error}
                              </p>
                            )}
                          </div>

                          {/* B: 会員種別 */}
                          <div className={`rounded-2xl p-5 border-2 ${
                            !diagResult.members.ok ? "bg-ag-gray-50 border-ag-gray-200"
                            : diagResult.members.needsAttention.length > 0 ? "bg-amber-50 border-amber-200"
                            : "bg-emerald-50 border-emerald-200"
                          }`}>
                            <div className="font-black text-lg text-ag-gray-900">会員種別のチェック</div>
                            {!diagResult.members.ok ? (
                              <p className="text-sm font-bold text-ag-gray-500 mt-2">読み取りに失敗: {diagResult.members.error}</p>
                            ) : (
                              <div className="mt-2 space-y-2">
                                <p className="text-base font-bold text-ag-gray-700">
                                  名簿 {diagResult.members.total} 人中、種別あり {diagResult.members.typed} 人。
                                </p>
                                {diagResult.members.needsAttention.length > 0 ? (
                                  <div className="text-sm font-bold text-amber-700 leading-relaxed">
                                    <p>要対応（種別が無く、ビジター扱いになる恐れ）{diagResult.members.needsAttention.length} 人：</p>
                                    <p className="text-ag-gray-800">{diagResult.members.needsAttention.join("・")}</p>
                                  </div>
                                ) : (
                                  <p className="text-base font-black text-emerald-700">問題なし。全員の種別が判定できます。</p>
                                )}
                                {diagResult.members.missingNames.length > diagResult.members.needsAttention.length && (
                                  <p className="text-xs font-bold text-ag-gray-400 leading-relaxed">
                                    ※ 参考：Firestore上は未設定だが元データで判定できる人が
                                    {diagResult.members.missingNames.length - diagResult.members.needsAttention.length} 人います（実害なし）。
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 土台となるサービスと、ログインに使うアカウントの一覧 */}
                  <div className="space-y-4 mt-8">
                {[
                  { name: "GitHub", use: "プログラム（ソースコード）の保管庫", login: "yuka-uesugi@b-w-c.jp（BWC・上杉個人）", where: "github.com/yuka-uesugi/bigbeans" },
                  { name: "Vercel", use: "ホームページを公開しているサービス（GitHubに変更を送ると自動で反映）", login: "yuka-uesugi@b-w-c.jp（BWC・上杉個人／GitHub連携ログイン）", where: "" },
                  { name: "Firebase", use: "データベース（会員・予約・会計・設定などの保存先）", login: "yuka.uesugi@all-in-one.jp（ALL-IN-ONE）が所有者", where: "プロジェクト名 team-management-service" },
                  { name: "Google Search Console", use: "検索対策（検索への登録・掲載状況の管理）。Firebaseとは別サービス", login: "bigbeans.tsuduki@gmail.com（BB・クラブ共有Gmail）", where: "所有権確認ファイルはコード内に設置済み" },
                  { name: "共有Gmail", use: "各サービスの登録メール・SNS・各種パスワードの金庫（パスワードマネージャー）", login: "bigbeans.tsuduki@gmail.com（BB・クラブ共有Gmail）", where: "" },
                  { name: "ドメイン（住所）", use: "ホームページのアドレス", login: "", where: "https://bigbeans.vercel.app/（Vercelの無料アドレス・独自ドメインなし）" },
                ].map((item, i) => (
                  <div key={i} className="bg-ag-gray-50/50 border-2 border-ag-gray-100 rounded-3xl p-6">
                    <div className="font-black text-xl text-ag-gray-900 mb-2">{item.name}</div>
                    <div className="text-base font-bold text-ag-gray-600 leading-relaxed">
                      <span className="text-ag-gray-400">用途：</span>{item.use}
                    </div>
                    {item.login && (
                      <div className="text-base font-bold text-ag-gray-700 leading-relaxed mt-1">
                        <span className="text-ag-gray-400">ログイン：</span>{item.login}
                      </div>
                    )}
                    {item.where && (
                      <div className="text-base font-bold text-ag-gray-600 leading-relaxed mt-1">
                        <span className="text-ag-gray-400">場所：</span>{item.where}
                      </div>
                    )}
                  </div>
                ))}
              </div>

                  {/* 呼び名の注意 */}
                  <p className="text-sm font-bold text-ag-gray-500 mt-4 leading-relaxed">
                    ※（BWC）＝上杉個人アカウント、（ALL-IN-ONE）＝Firebase所有アカウント、（BB）＝クラブ共有Gmail、の略です。
                    なお、アプリ画面下部に出る「ALL-IN-ONE」はこの運営システムの製品名で、アカウントではありません。
                  </p>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* III & VI. 試合・連盟・保険・おもてなし (老眼対策) */}
        {activeTab === "matches" && (
          <div className="space-y-10 animate-fade-in text-ag-gray-900">
            {/* ビックビーンズの歩み（大会の軌跡）※メンバー向けの記録 */}
            <div className="bg-ag-gray-900 text-white rounded-[2.5rem] overflow-hidden shadow-xl relative">
              <div className="absolute -bottom-8 -right-6 text-8xl sm:text-9xl font-black uppercase opacity-5 rotate-12 select-none pointer-events-none">HISTORY</div>
              <div className="p-10 lg:p-14 relative">
                <h4 className="font-black text-ag-lime-400 border-b-4 border-ag-lime-500 pb-4 text-2xl sm:text-3xl tracking-tighter">
                  大会の記録（全日本レディース クラブ対抗）
                </h4>
                <p className="text-base sm:text-lg font-bold text-ag-gray-300 leading-relaxed mt-5">
                  この大会は、学生時代にバドミントン経験がない人だけが出場できる、社会人スタート限定のレディースのクラブ対抗戦です（出場する6人の合計年齢が240歳以上、という条件もあります）。予選会で1〜3位に入ると全国大会、4〜6位で関東大会に進めます。ここに残すのは、社会人からバドミントンを始めたメンバーが積み重ねてきた挑戦の記録です。
                  <span className="block text-sm text-ag-gray-400 mt-2">※ 公開ホームページには順位などの細かい戦績は載せていません（初級者の方が入りにくくならないため）。ここはメンバー用の記録です。</span>
                </p>

                <ol className="mt-8 space-y-5">
                  {[
                    { year: "2011年", text: "初出場・ベスト16" },
                    { year: "2021年", text: "6位（初の関東大会）　※全国大会はコロナで中止" },
                    { year: "2023年", text: "3位（初の全国大会出場）", highlight: true },
                    { year: "2024年", text: "関東大会出場・ベスト8" },
                    { year: "2025年", text: "2度目の全国大会へ", highlight: true },
                    { year: "2026年", text: "ベスト8" },
                  ].map((row) => (
                    <li key={row.year} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
                      <span className={`shrink-0 inline-flex items-center justify-center w-24 py-1.5 rounded-full text-base font-black ${row.highlight ? "bg-ag-lime-400 text-ag-gray-900" : "bg-white/10 text-white ring-1 ring-white/15"}`}>
                        {row.year}
                      </span>
                      <span className={`text-lg sm:text-xl font-bold leading-relaxed ${row.highlight ? "text-white" : "text-ag-gray-200"}`}>
                        {row.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-100 overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ag-gray-100">
                <div className="p-10 space-y-6">
                  <h4 className="font-black text-ag-gray-900 border-b-2 border-ag-gray-50 pb-4 flex items-center gap-3 text-xl">
                    主要加盟団体
                  </h4>
                  <ul className="text-base font-bold text-ag-gray-700 space-y-2 leading-relaxed">
                    <li>都筑区レディース連盟</li>
                    <li>横浜市レディース連盟<span className="text-xs text-ag-gray-400 font-bold ml-1">（※市内在住在勤のみ）</span></li>
                    <li>神奈川県レディース連盟</li>
                    <li>日本バドミントン協会</li>
                    <li>神奈川県バドミントン協会</li>
                    <li>日本レディースバドミントン連盟</li>
                  </ul>
                  <div className="text-sm bg-ag-gray-50 p-5 rounded-2xl border-2 border-ag-gray-100 text-ag-gray-800 font-black shadow-inner">
                    団体登録料：部費負担<br/>
                    個人登録費：自己負担
                  </div>
                </div>
                <div className="p-10 space-y-6">
                  <h4 className="font-black text-ag-gray-900 border-b-2 border-ag-gray-50 pb-4 flex items-center gap-3 text-xl">
                    棄権防止・時間厳守
                  </h4>
                  <ul className="text-base sm:text-lg font-bold text-ag-gray-600 space-y-4 list-none">
                    <li className="flex gap-3">
                      <span className="text-ag-lime-500 text-xl">●</span>
                      <span>棄権防止のため、やむを得ず出られなくなった時はすみやかに代替者を探す。</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-ag-lime-500 text-xl">●</span>
                      <span>チーム役員に相談する。</span>
                    </li>
                  </ul>
                </div>
                <div className="p-10 bg-ag-gray-900 text-white space-y-6 relative overflow-hidden">
                  <div className="absolute -bottom-6 -right-6 p-4 opacity-5 text-8xl rotate-12 select-none font-black uppercase">HOST</div>
                  <h4 className="font-black text-ag-lime-400 border-b-2 border-white/10 pb-4 flex items-center gap-3 text-xl tracking-widest">
                    BB主催おもてなし
                  </h4>
                  <p className="text-base sm:text-lg font-bold text-ag-gray-300 leading-relaxed italic">
                    ビジターの方を温かく迎え、<span className="text-white font-black underline decoration-ag-lime-500 underline-offset-4">審判や片付けをさせない</span>精神を徹底します。
                  </p>
                  <div className="text-xs text-ag-lime-400 font-black bg-white/5 px-4 py-2 rounded-xl ring-1 ring-white/10 inline-block uppercase tracking-widest">
                    シャトル目安：1.5試合につき1個平均
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 p-8 rounded-[2rem] border-2 border-amber-200 shadow-sm ring-4 ring-amber-100/50">
              <h4 className="font-black text-amber-900 mb-3 flex items-center gap-3 text-xl sm:text-2xl">
                秋の県団体戦（育成優先方針）
              </h4>
              <p className="text-base sm:text-lg font-bold text-amber-800 leading-relaxed italic border-l-4 border-amber-300 pl-4">
                BBではチーム力の底上げと経験を最優先し、育成枠を含めた構成で臨みます。
              </p>
            </div>

            {/* 優先順位ルール (老眼対策) */}
            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-200 overflow-hidden shadow-xl mt-12 ring-8 ring-ag-gray-50">
              <div className="p-10 lg:p-14 bg-white">
                <h4 className="font-black text-ag-gray-900 border-b-4 border-ag-lime-500 pb-4 flex items-center gap-4 text-2xl sm:text-3xl tracking-tighter">
                  試合・練習の最優先権
                </h4>
                <p className="text-lg sm:text-xl font-bold text-ag-gray-600 leading-relaxed mt-6">
                  エントリー枠や定員に限りがある場合、以下の順位で優先されます。<br/>
                  <span className="text-ag-lime-700 bg-ag-lime-50 px-2 rounded-lg border border-ag-lime-100">積極的な参加が可能な方には「通常会員」を強くお勧めしています。</span>
                </p>
                <div className="mt-10 flex flex-col md:flex-row gap-6 items-stretch lg:px-10">
                  <div className="flex-1 bg-white border-4 border-ag-lime-500 p-8 rounded-[2rem] text-center shadow-2xl relative overflow-hidden ring-8 ring-ag-lime-100/50 scale-105 z-10">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-ag-lime-100 rounded-bl-full -z-10 blur-xl opacity-50"></div>
                    <div className="text-5xl font-black text-ag-lime-600 mb-4 drop-shadow-sm select-none">1位</div>
                    <div className="text-2xl font-black text-ag-gray-900">通常会員</div>
                    <div className="text-xs text-ag-gray-400 font-black mt-4 uppercase tracking-[0.3em]">TEAM MAIN STAR</div>
                  </div>
                  <div className="flex items-center justify-center text-ag-gray-200 font-black text-4xl rotate-90 md:rotate-0 px-2">▶</div>
                  <div className="flex-1 bg-white border-2 border-sky-200 p-8 rounded-[2rem] text-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-sky-50 rounded-bl-full -z-10 blur-sm"></div>
                    <div className="text-3xl font-black text-sky-500 mb-4 drop-shadow-sm">2位</div>
                    <div className="text-xl font-black text-ag-gray-900">ライト会員</div>
                  </div>
                  <div className="flex items-center justify-center text-ag-gray-200 font-black text-3xl rotate-90 md:rotate-0 px-2">▶</div>
                  <div className="flex-1 bg-ag-gray-50 border-2 border-ag-gray-100 p-8 rounded-[2rem] text-center grayscale opacity-80">
                    <div className="text-2xl font-black text-ag-gray-400 mb-4">3位</div>
                    <div className="text-xl font-black text-ag-gray-600">ビジター</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 精算・車代 (補助情報) */}
        {activeTab === "transport" && (
          <div className="space-y-12 animate-fade-in text-ag-gray-900">
            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-200 shadow-xl overflow-hidden ring-8 ring-ag-gray-50">
              <div className="px-8 py-6 bg-gradient-to-r from-amber-50 to-white border-b-2 border-amber-200 flex items-center justify-between">
                <h3 className="font-black text-amber-950 flex items-center gap-3 text-xl sm:text-2xl tracking-tighter">
                  車代・精算の標準基準表
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-amber-800 bg-amber-200/50 px-3 py-1.5 rounded-xl border border-amber-200 tracking-widest uppercase">{carFeeDoc.note}</span>
                  {!editingCarFee && (
                    <button
                      onClick={() => setEditingCarFee(JSON.parse(JSON.stringify(carFeeDoc)))}
                      className="text-xs font-black bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
                    >
                      編集
                    </button>
                  )}
                </div>
              </div>
              {editingCarFee ? (
                <div className="p-6 space-y-3">
                  {/* 注釈テキスト編集 */}
                  <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
                    <label className="text-xs font-black text-amber-700 uppercase tracking-widest block mb-2">表ヘッダーの注釈</label>
                    <input
                      type="text"
                      value={editingCarFee.note}
                      onChange={(e) => setEditingCarFee({ ...editingCarFee, note: e.target.value })}
                      className="w-full font-black text-base text-amber-900 border-b-2 border-amber-300 focus:border-amber-500 outline-none bg-transparent py-1"
                      placeholder="例: 燃費 10Km/1L 換算"
                    />
                  </div>
                  {(() => {
                    const areaColors: Record<string, string> = {
                      A: "text-red-600", B: "text-emerald-600", C: "text-amber-500",
                      D: "text-orange-500", E: "text-violet-500", F: "text-sky-500",
                      G: "text-pink-500", H: "text-ag-gray-500",
                    };
                    return editingCarFee.areas.map((area, idx) => (
                      <div key={area.id} className="bg-ag-gray-50 rounded-2xl border border-ag-gray-100 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-black w-8 ${areaColors[area.id] ?? ""}`}>{area.id}</span>
                          <input
                            type="text"
                            value={area.label}
                            onChange={(e) => {
                              const t = [...editingCarFee.areas];
                              t[idx] = { ...t[idx], label: e.target.value };
                              setEditingCarFee({ ...editingCarFee, areas: t });
                            }}
                            className="flex-1 font-bold text-base text-ag-gray-700 border-b-2 border-ag-gray-200 focus:border-amber-400 outline-none bg-transparent py-1"
                            placeholder="距離表示（例: 10km圏内）"
                          />
                        </div>
                        <div className="flex flex-wrap gap-4 pl-11">
                          {area.isActualCost ? (
                            <span className="text-sm font-black text-ag-gray-500">実費精算（固定）</span>
                          ) : area.feeThreePlus !== undefined ? (
                            <>
                              <label className="flex items-center gap-2 text-sm font-bold text-ag-gray-600">
                                2人:
                                <span className="font-black">¥</span>
                                <input
                                  type="number"
                                  value={area.fee}
                                  onChange={(e) => {
                                    const t = [...editingCarFee.areas];
                                    t[idx] = { ...t[idx], fee: Number(e.target.value) };
                                    setEditingCarFee({ ...editingCarFee, areas: t });
                                  }}
                                  className="w-24 font-black text-base border-b-2 border-ag-gray-200 focus:border-amber-400 outline-none bg-transparent text-center"
                                />
                              </label>
                              <label className="flex items-center gap-2 text-sm font-bold text-ag-gray-600">
                                3人〜:
                                <span className="font-black">¥</span>
                                <input
                                  type="number"
                                  value={area.feeThreePlus}
                                  onChange={(e) => {
                                    const t = [...editingCarFee.areas];
                                    t[idx] = { ...t[idx], feeThreePlus: Number(e.target.value) };
                                    setEditingCarFee({ ...editingCarFee, areas: t });
                                  }}
                                  className="w-24 font-black text-base border-b-2 border-ag-gray-200 focus:border-amber-400 outline-none bg-transparent text-center"
                                />
                              </label>
                            </>
                          ) : (
                            <label className="flex items-center gap-2 text-sm font-bold text-ag-gray-600">
                              料金:
                              <span className="font-black">¥</span>
                              <input
                                type="number"
                                value={area.fee}
                                onChange={(e) => {
                                  const t = [...editingCarFee.areas];
                                  t[idx] = { ...t[idx], fee: Number(e.target.value) };
                                  setEditingCarFee({ ...editingCarFee, areas: t });
                                }}
                                className="w-24 font-black text-base border-b-2 border-ag-gray-200 focus:border-amber-400 outline-none bg-transparent text-center"
                              />
                            </label>
                          )}
                        </div>
                        <div className="pl-11">
                          <input
                            type="text"
                            value={area.description}
                            onChange={(e) => {
                              const t = [...editingCarFee.areas];
                              t[idx] = { ...t[idx], description: e.target.value };
                              setEditingCarFee({ ...editingCarFee, areas: t });
                            }}
                            className="w-full font-bold text-sm text-ag-gray-600 border-b border-ag-gray-200 focus:border-amber-400 outline-none bg-transparent py-1 italic"
                            placeholder="対象エリア説明"
                          />
                        </div>
                      </div>
                    ));
                  })()}
                  <div className="flex gap-4 justify-end pt-2">
                    <button onClick={() => setEditingCarFee(null)} className="px-6 py-3 font-black text-ag-gray-500 hover:bg-ag-gray-100 rounded-xl transition-colors">キャンセル</button>
                    <button onClick={handleSaveCarFee} disabled={isProcessing} className="px-8 py-3 font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-lg disabled:opacity-50 text-base">
                      {isProcessing ? "保存中..." : "保存して反映"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-lg px-4">
                    <thead>
                      <tr className="bg-amber-100/30 text-amber-900 text-xs font-black border-b-2 border-amber-100 uppercase tracking-widest">
                        <th className="px-8 py-5 font-black">区分・距離</th>
                        <th className="px-8 py-5 font-black text-center">設定料金</th>
                        <th className="px-8 py-5 font-black">主な対象エリア</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-amber-50 font-bold">
                      {(() => {
                        const areaTextColors: Record<string, string> = {
                          A: "text-red-600", B: "text-emerald-600", C: "text-amber-500",
                          D: "text-orange-500", E: "text-violet-500", F: "text-sky-500",
                          G: "text-pink-500", H: "text-ag-gray-500",
                        };
                        return carFeeDoc.areas.map((area, idx) => (
                          <tr key={area.id} className={`hover:bg-amber-100/20 transition-colors ${idx % 2 === 1 ? "bg-amber-50/10" : ""}`}>
                            <td className="px-8 py-8">
                              <div className={`text-2xl font-black ${areaTextColors[area.id] ?? "text-ag-gray-600"}`}>
                                {area.id} <span className="text-sm font-bold text-ag-gray-500">({area.label})</span>
                              </div>
                            </td>
                            <td className="px-8 py-8 text-center">
                              {area.isActualCost ? (
                                <div className="text-lg font-black text-ag-gray-700">実費精算</div>
                              ) : area.feeThreePlus !== undefined ? (
                                <>
                                  <div className="text-xl font-black font-mono text-ag-gray-900">¥{area.fee.toLocaleString()} <span className="text-sm font-bold text-ag-gray-400">/ 2人</span></div>
                                  <div className="text-xl font-black font-mono text-ag-gray-900">¥{area.feeThreePlus.toLocaleString()} <span className="text-sm font-bold text-ag-gray-400">/ 3人〜</span></div>
                                </>
                              ) : (
                                <div className="text-3xl font-black font-mono text-ag-gray-900">¥{area.fee.toLocaleString()}</div>
                              )}
                            </td>
                            <td className="px-8 py-8 text-base sm:text-lg text-ag-gray-600 italic">
                              {area.description}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 乗り合わせ詳細（Firestore連動・全員編集可） */}
            <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-200 shadow-xl overflow-hidden mt-12 mb-16 ring-8 ring-ag-lime-50">
              <div className="px-8 py-6 bg-gradient-to-r from-ag-lime-500 to-ag-lime-600 border-b-2 border-ag-lime-700 flex items-center justify-between text-white">
                <div>
                  <h3 className="font-black text-xl sm:text-3xl flex items-center gap-4 tracking-tighter">
                    コーチ車 ＆ 乗り合わせ詳細表
                  </h3>
                  <p className="text-white/70 text-sm font-bold mt-1">誰でも編集・更新できます。変更はリアルタイムで全員に反映されます。</p>
                </div>
                {!editingTransport && (
                  <button
                    onClick={() => setEditingTransport(JSON.parse(JSON.stringify(transportData)))}
                    className="bg-white/20 hover:bg-white/30 text-white font-black px-5 py-2.5 rounded-xl border border-white/30 text-sm transition-all"
                  >
                    編集する
                  </button>
                )}
              </div>

              {editingTransport ? (
                <div className="p-8 space-y-6 animate-fade-in">
                  <div className="text-sm font-black text-ag-gray-500 bg-ag-gray-50 p-4 rounded-2xl border border-ag-gray-100">
                    各会場の車と同乗メンバーを編集してください。車代エリアは A〜H から選択してください。
                  </div>

                  {editingTransport.map((entry, ei) => {
                    const areaColorMap: Record<string, string> = {
                      A: "text-red-600 bg-red-50 border-red-200",
                      B: "text-emerald-600 bg-emerald-50 border-emerald-200",
                      C: "text-amber-600 bg-amber-50 border-amber-200",
                      D: "text-orange-600 bg-orange-50 border-orange-200",
                      E: "text-violet-600 bg-violet-50 border-violet-200",
                      F: "text-sky-600 bg-sky-50 border-sky-200",
                      G: "text-pink-600 bg-pink-50 border-pink-200",
                      H: "text-ag-gray-600 bg-ag-gray-50 border-ag-gray-200",
                    };
                    const areaColor = areaColorMap[entry.area] ?? "text-amber-600 bg-amber-50 border-amber-200";
                    return (
                      <div key={ei} className="bg-ag-gray-50 rounded-3xl border-2 border-ag-gray-100 p-6 space-y-4">
                        {/* 会場ヘッダー */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <select
                            value={entry.area}
                            onChange={(e) => {
                              const t = [...editingTransport];
                              t[ei] = { ...t[ei], area: e.target.value };
                              setEditingTransport(t);
                            }}
                            className={`font-black text-lg px-3 py-1.5 rounded-xl border-2 outline-none ${areaColor}`}
                          >
                            <option value="A">A（10km圏内 ¥200）</option>
                            <option value="B">B（20km圏内 ¥300）</option>
                            <option value="C">C（30km圏内 ¥400）</option>
                            <option value="D">D（31〜40km ¥600/¥500）</option>
                            <option value="E">E（41〜55km ¥700/¥600）</option>
                            <option value="F">F（56〜70km ¥800/¥700）</option>
                            <option value="G">G（71〜85km ¥1000/¥800）</option>
                            <option value="H">H（86km〜 実費）</option>
                          </select>
                          <input
                            type="text"
                            value={entry.venue}
                            onChange={(e) => {
                              const t = [...editingTransport];
                              t[ei] = { ...t[ei], venue: e.target.value };
                              setEditingTransport(t);
                            }}
                            className="flex-1 font-black text-xl text-ag-gray-900 border-b-2 border-ag-gray-300 focus:border-ag-lime-500 outline-none bg-transparent py-1"
                            placeholder="会場名"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingTransport(editingTransport.filter((_, i) => i !== ei))}
                            className="text-xs text-red-400 hover:text-red-600 font-black px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 transition-colors"
                          >
                            会場を削除
                          </button>
                        </div>

                        {/* 車リスト */}
                        <div className="space-y-3">
                          {entry.vehicles.map((v, vi) => {
                            const pKey = `${ei}-${vi}`;
                            return (
                              <div key={vi} className="bg-white rounded-2xl border border-ag-gray-100 p-4 shadow-sm space-y-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-ag-gray-400 w-12 shrink-0">{vi + 1}号車</span>
                                  <input
                                    type="text"
                                    value={v.driver}
                                    onChange={(e) => {
                                      const t = [...editingTransport];
                                      t[ei].vehicles[vi].driver = e.target.value;
                                      setEditingTransport(t);
                                    }}
                                    className="flex-1 font-black text-lg text-ag-lime-700 bg-ag-lime-50 border border-ag-lime-200 rounded-xl px-3 py-2 outline-none focus:border-ag-lime-500"
                                    placeholder="運転者名（例：上杉（コーチ））"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const t = [...editingTransport];
                                      t[ei].vehicles = t[ei].vehicles.filter((_, i) => i !== vi);
                                      setEditingTransport(t);
                                    }}
                                    className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center text-sm"
                                  >×</button>
                                </div>
                                <div className="pl-14">
                                  <div className="text-xs font-black text-ag-gray-400 mb-2 uppercase">同乗メンバー</div>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {v.passengers.map((p, pi) => (
                                      <span key={pi} className="flex items-center gap-1 bg-ag-gray-100 text-ag-gray-700 font-bold px-3 py-1 rounded-full text-sm">
                                        {p}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const t = [...editingTransport];
                                            t[ei].vehicles[vi].passengers = t[ei].vehicles[vi].passengers.filter((_, i) => i !== pi);
                                            setEditingTransport(t);
                                          }}
                                          className="text-ag-gray-400 hover:text-red-500 text-xs ml-1"
                                        >×</button>
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={passengerInputs[pKey] ?? ""}
                                      onChange={(e) => setPassengerInputs({ ...passengerInputs, [pKey]: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && passengerInputs[pKey]?.trim()) {
                                          e.preventDefault();
                                          const t = [...editingTransport];
                                          t[ei].vehicles[vi].passengers.push(passengerInputs[pKey].trim());
                                          setEditingTransport(t);
                                          setPassengerInputs({ ...passengerInputs, [pKey]: "" });
                                        }
                                      }}
                                      className="flex-1 text-sm font-bold border border-ag-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-ag-lime-400 bg-ag-gray-50"
                                      placeholder="名前を入力してEnterで追加"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!passengerInputs[pKey]?.trim()) return;
                                        const t = [...editingTransport];
                                        t[ei].vehicles[vi].passengers.push(passengerInputs[pKey].trim());
                                        setEditingTransport(t);
                                        setPassengerInputs({ ...passengerInputs, [pKey]: "" });
                                      }}
                                      className="px-3 py-1.5 text-sm font-bold bg-ag-gray-100 rounded-xl hover:bg-ag-gray-200 transition-colors"
                                    >追加</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              const t = [...editingTransport];
                              t[ei].vehicles.push({ driver: "", passengers: [] });
                              setEditingTransport(t);
                            }}
                            className="w-full py-3 text-sm font-bold text-ag-lime-600 bg-ag-lime-50 border-2 border-dashed border-ag-lime-200 rounded-2xl hover:bg-ag-lime-100 transition-colors"
                          >
                            ＋ 車を追加
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setEditingTransport([...editingTransport, { area: "A", venue: "", vehicles: [{ driver: "", passengers: [] }] }])}
                    className="w-full py-4 text-base font-bold text-ag-gray-600 bg-ag-gray-50 border-2 border-dashed border-ag-gray-200 rounded-2xl hover:bg-ag-gray-100 transition-colors"
                  >
                    ＋ 会場を追加
                  </button>

                  <div className="flex gap-4 justify-end pt-4">
                    <button onClick={() => setEditingTransport(null)} className="px-6 py-3 font-black text-ag-gray-500 hover:bg-ag-gray-100 rounded-xl transition-colors">キャンセル</button>
                    <button onClick={handleSaveTransport} disabled={isProcessing} className="px-8 py-3 font-black text-white bg-ag-lime-500 hover:bg-ag-lime-600 rounded-xl transition-colors shadow-lg shadow-ag-lime-500/30 disabled:opacity-50 text-base">
                      {isProcessing ? "保存中..." : "保存してリアルタイム反映"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {(() => {
                    const areaOrder = ["A", "B", "C", "D", "E", "F", "G", "H"];
                    const areaConfig: Record<string, { fee: string; label: string; headerBg: string; headerText: string; badge: string; driverBg: string; driverText: string; passengerBg: string }> = {
                      A: { fee: "¥200 / 人", label: "10km圏内",
                           headerBg: "bg-red-500",      headerText: "text-white",
                           badge: "bg-red-100 text-red-700 border-red-200",
                           driverBg: "bg-red-50 border-red-200",     driverText: "text-red-700",
                           passengerBg: "bg-white border-ag-gray-200 text-ag-gray-700" },
                      B: { fee: "¥300 / 人", label: "20km圏内",
                           headerBg: "bg-emerald-500",  headerText: "text-white",
                           badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
                           driverBg: "bg-emerald-50 border-emerald-200", driverText: "text-emerald-700",
                           passengerBg: "bg-white border-ag-gray-200 text-ag-gray-700" },
                      C: { fee: "¥400 / 人", label: "30km圏内",
                           headerBg: "bg-amber-500",    headerText: "text-white",
                           badge: "bg-amber-100 text-amber-700 border-amber-200",
                           driverBg: "bg-amber-50 border-amber-200",  driverText: "text-amber-700",
                           passengerBg: "bg-white border-ag-gray-200 text-ag-gray-700" },
                      D: { fee: "¥600(2人) / ¥500(3人〜)", label: "31〜40km圏",
                           headerBg: "bg-orange-500",   headerText: "text-white",
                           badge: "bg-orange-100 text-orange-700 border-orange-200",
                           driverBg: "bg-orange-50 border-orange-200", driverText: "text-orange-700",
                           passengerBg: "bg-white border-ag-gray-200 text-ag-gray-700" },
                      E: { fee: "¥700(2人) / ¥600(3人〜)", label: "41〜55km圏",
                           headerBg: "bg-violet-500",   headerText: "text-white",
                           badge: "bg-violet-100 text-violet-700 border-violet-200",
                           driverBg: "bg-violet-50 border-violet-200", driverText: "text-violet-700",
                           passengerBg: "bg-white border-ag-gray-200 text-ag-gray-700" },
                      F: { fee: "¥800(2人) / ¥700(3人〜)", label: "56〜70km圏",
                           headerBg: "bg-sky-500",      headerText: "text-white",
                           badge: "bg-sky-100 text-sky-700 border-sky-200",
                           driverBg: "bg-sky-50 border-sky-200",      driverText: "text-sky-700",
                           passengerBg: "bg-white border-ag-gray-200 text-ag-gray-700" },
                      G: { fee: "¥1,000(2人) / ¥800(3人〜)", label: "71〜85km圏",
                           headerBg: "bg-pink-500",     headerText: "text-white",
                           badge: "bg-pink-100 text-pink-700 border-pink-200",
                           driverBg: "bg-pink-50 border-pink-200",    driverText: "text-pink-700",
                           passengerBg: "bg-white border-ag-gray-200 text-ag-gray-700" },
                      H: { fee: "実費精算", label: "86km以上",
                           headerBg: "bg-ag-gray-700",  headerText: "text-white",
                           badge: "bg-ag-gray-100 text-ag-gray-700 border-ag-gray-200",
                           driverBg: "bg-ag-gray-50 border-ag-gray-200", driverText: "text-ag-gray-700",
                           passengerBg: "bg-white border-ag-gray-200 text-ag-gray-700" },
                    };
                    const entries = transportData;
                    const grouped = areaOrder.reduce<Record<string, TransportEntry[]>>((acc, a) => {
                      acc[a] = entries.filter((e) => e.area === a);
                      return acc;
                    }, {} as Record<string, TransportEntry[]>);

                    return areaOrder.map((area) => {
                      if (!grouped[area]?.length) return null;
                      const cfg = areaConfig[area];
                      return (
                        <div key={area} className="rounded-2xl overflow-hidden border border-ag-gray-200 shadow-sm">
                          {/* エリアヘッダー */}
                          <div className={`${cfg.headerBg} ${cfg.headerText} px-5 py-3 flex items-center gap-3`}>
                            <span className="text-2xl font-black">{area}</span>
                            <span className="text-sm font-bold opacity-80">{cfg.label}</span>
                            <span className="ml-auto text-xl font-black font-mono">{cfg.fee} / 人</span>
                          </div>

                          {/* 会場リスト */}
                          <div className="divide-y divide-ag-gray-100 bg-white">
                            {grouped[area].map((entry, ei) => (
                              <div key={ei} className="px-5 py-4">
                                {/* 会場名 */}
                                <div className="flex items-center gap-2 mb-3">
                                  <span className={`text-xs font-black px-2 py-0.5 rounded border ${cfg.badge}`}>{area}</span>
                                  <span className="font-black text-base text-ag-gray-900">{entry.venue}</span>
                                </div>

                                {/* 車リスト */}
                                <div className="space-y-2 pl-2">
                                  {entry.vehicles.map((v, vi) => (
                                    <div key={vi} className="flex items-start gap-3">
                                      {/* 車番号 + 運転者 */}
                                      <div className="shrink-0 flex items-center gap-2">
                                        <span className="text-xs font-black text-ag-gray-400 w-7 text-right">{vi + 1}</span>
                                        <div className={`font-black text-sm px-3 py-1.5 rounded-xl border ${cfg.driverBg} ${cfg.driverText} min-w-[64px] text-center`}>
                                          {v.driver || <span className="text-ag-gray-300 font-bold">未設定</span>}
                                        </div>
                                        <svg className="w-4 h-4 text-ag-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>

                                      {/* 同乗者 */}
                                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {v.passengers.length > 0 ? v.passengers.map((p, pi) => (
                                          <span key={pi} className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${cfg.passengerBg}`}>{p}</span>
                                        )) : (
                                          <span className="text-xs italic text-ag-gray-300 font-bold pt-1">同乗者未設定</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  <p className="text-xs italic text-ag-gray-400 font-bold text-center pt-2">
                    ※上記以外の体育館については、都度距離に応じて精算をお願いします。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}


          </div>
      </div>
  );
}
