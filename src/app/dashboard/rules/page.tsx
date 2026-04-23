"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberByEmail } from "@/lib/members";
// import 静的データはバックアップとして残すが、基本は型と合計数だけにしてコンポーネント内Stateを初期化するのに使う
import { FACILITY_CARDS, HAMASPO_CARDS, TOTAL_DISTRICT_SLOTS, TOTAL_HAMASPO_SLOTS, type FacilityCard, type HamaspoCard } from "@/data/facilityCards";
import { 
  subscribeToFacilities, 
  subscribeToHamaspo, 
  seedFacilitiesData, 
  updateFacility, 
  updateHamaspo,
  saveBackup,
  getBackups,
  restoreFromBackup,
  deleteBackup,
  type FacilityBackup
} from "@/lib/facilities";
import { subscribeToClubSettings, updateClubSettings, type ClubSettings, type DutyTeam, type TransportEntry, type TransportVehicle } from "@/lib/settings";
import FacilityEditModal from "@/components/dashboard/FacilityEditModal";
import HamaspoEditModal from "@/components/dashboard/HamaspoEditModal";
import type { Member } from "@/data/memberList";

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState("fees");
  const { user } = useAuth();
  const [currentMember, setCurrentMember] = useState<Member | null>(null);

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

  // バックアップ用
  const [backups, setBackups] = useState<FacilityBackup[]>([]);
  const [newBackupName, setNewBackupName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 練習当番用
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);
  const [editingDutyTeams, setEditingDutyTeams] = useState<DutyTeam[] | null>(null);

  // 車代・乗り合わせ編集用
  const [editingTransport, setEditingTransport] = useState<TransportEntry[] | null>(null);
  const [passengerInputs, setPassengerInputs] = useState<Record<string, string>>({});

  // Firestoreからデータ取得
  useEffect(() => {
    const unsubSettings = subscribeToClubSettings((settings) => {
      setClubSettings(settings);
    });
    const unsubFacilities = subscribeToFacilities((data) => {
      // 順序を保つためorderIndexでソート
      const sorted = [...data].sort((a, b) => (a as any).orderIndex - (b as any).orderIndex);
      setFacilities(sorted);
    });
    const unsubHamaspo = subscribeToHamaspo((data) => {
      const sorted = [...data].sort((a, b) => (a as any).orderIndex - (b as any).orderIndex);
      setHamaspoCards(sorted);
    });
    return () => {
      unsubFacilities();
      unsubHamaspo();
      unsubSettings();
    };
  }, []);

  // バックアップ一覧の取得
  useEffect(() => {
    const unsub = getBackups((data) => {
      setBackups(data);
    });
    return () => unsub();
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
    return remoteCard ? { ...localCard, ...remoteCard } : localCard;
  });

  const handleSeedData = async () => {
    if (confirm("【警告】プログラム内の初期データ（古いデータ）で全ての情報を上書きします。ご自身で編集した最新の内容は失われますが、本当によろしいですか？")) {
      try {
        await seedFacilitiesData();
        alert("初期データを流し込みました");
      } catch (err) {
        alert("エラーが発生しました");
      }
    }
  };

  const handleSaveBackup = async () => {
    if (!newBackupName.trim()) {
      alert("バックアップ名（例：2025年度確定版）を入力してください");
      return;
    }
    setIsProcessing(true);
    try {
      await saveBackup(newBackupName, mergedFacilities as FacilityCard[], mergedHamaspo as HamaspoCard[]);
      setNewBackupName("");
      alert("バックアップを保存しました");
    } catch (err) {
      alert("バックアップに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFromBackup = async (backup: FacilityBackup) => {
    if (confirm(`「${backup.name}」の内容で現在のデータを復元します。よろしいですか？`)) {
      setIsProcessing(true);
      try {
        await restoreFromBackup(backup.id);
        alert("復元が完了しました");
      } catch (err) {
        alert("復元に失敗しました");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (confirm("このバックアップを削除してもよろしいですか？")) {
      try {
        await deleteBackup(backupId);
      } catch (err) {
        alert("削除に失敗しました");
      }
    }
  };

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

    setIsProcessing(true);
    try {
      await updateClubSettings({ dutyTeams: editingDutyTeams });
      setEditingDutyTeams(null);
      alert("当番表を更新しました！ダッシュボードにも即時反映されます。");
    } catch (err) {
      alert("当番表の更新に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTransport = async () => {
    if (!editingTransport) return;
    setIsProcessing(true);
    try {
      await updateClubSettings({ transportData: editingTransport });
      setEditingTransport(null);
    } catch (err) {
      alert("保存に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs = [
    { id: "fees", name: "費用・登録規定", icon: "" },
    { id: "facilities", name: "練習場所・登録カード", icon: "" },
    { id: "organization", name: "役員・組織分担", icon: "" },
    { id: "matches", name: "試合・連盟・保険", icon: "" },
    { id: "transport", name: "車代・精算基準", icon: "" },
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
                        <div className="text-[10px] text-ag-gray-400 mt-1">コーチ 有 / 不在</div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="text-2xl font-black"><span className="font-mono text-ag-gray-900">¥1,050</span> / <span className="text-ag-gray-400 font-normal italic">¥850</span></div>
                        <div className="text-[10px] text-ag-gray-400 mt-1">コーチ 有 / 不在</div>
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
                      ※基本的に練習の全ての時間にご参加いただきます。
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
                            <th className="px-6 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-50 sticky left-0 z-20 min-w-[130px] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">施設名</th>
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
                              <td className="px-6 py-6 align-top sticky left-0 z-10 bg-white group-hover:bg-ag-lime-50/30 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors">
                                <div className="flex flex-col gap-2">
                                  <span className="font-black text-lg text-ag-gray-900 whitespace-nowrap">{facility.name}</span>
                                  {hasEditPermission && (
                                    <button 
                                      onClick={() => setEditingFacility(facility as FacilityCard)}
                                      className="self-start text-[10px] bg-ag-lime-100 text-ag-lime-700 hover:bg-ag-lime-200 px-2 py-1 rounded shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      ✏️ 編集
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
                                <div className="text-[10px] text-ag-gray-400 font-bold mt-2 italic">
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-ag-gray-50/50">
                            <th className="px-4 py-5 text-sm font-black text-ag-gray-400 uppercase tracking-widest bg-ag-gray-50 sticky left-0 z-20 min-w-[130px] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">団体名</th>
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
                              <td className="px-4 py-4 sticky left-0 z-10 bg-white group-hover:bg-sky-50/30 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors">
                                <div className="flex flex-col gap-1">
                                  <div className="font-black text-ag-gray-900">{card.teamName}</div>
                                  <div className="text-[10px] text-sky-500 font-black italic">更新: {card.renewalDate}</div>
                                  {hasEditPermission && (
                                    <button 
                                      onClick={() => setEditingHamaspo(card as HamaspoCard)}
                                      className="self-start text-[10px] bg-sky-100 text-sky-700 hover:bg-sky-200 px-2 py-1 rounded shadow-sm transition-colors mt-1"
                                    >
                                      ✏️ 編集
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

                  {/* バックアップ・復元管理エリア (管理者のみ表示可能にする) */}
                  {hasEditPermission && (
                    <div className="mt-16 space-y-8 p-10 bg-ag-gray-50/50 rounded-[3rem] border-2 border-ag-gray-100 border-dashed">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <h3 className="text-2xl font-black text-ag-gray-800 flex items-center gap-3">
                            <span className="text-3xl">💾</span> バックアップ・復元管理
                          </h3>
                          <p className="text-ag-gray-500 font-bold mt-1">現在の全データを保存したり、過去の確定版に戻したりできます。</p>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border-2 border-ag-gray-100 shadow-sm">
                          <input 
                            type="text"
                            placeholder="バックアップ名（例：2025年度確定版）"
                            value={newBackupName}
                            onChange={(e) => setNewBackupName(e.target.value)}
                            className="px-4 py-2 bg-transparent focus:outline-none font-bold text-ag-gray-700 w-64"
                          />
                          <button 
                            onClick={handleSaveBackup}
                            disabled={isProcessing}
                            className="bg-ag-gray-900 text-white px-6 py-2 rounded-xl font-black hover:bg-black transition-all shadow-md disabled:opacity-50"
                          >
                            {isProcessing ? "保存中..." : "今の状態を保存"}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {backups.length === 0 ? (
                          <div className="text-center py-10 text-ag-gray-400 font-bold italic bg-white rounded-2xl border border-ag-gray-100">
                            保存されたバックアップはまだありません
                          </div>
                        ) : (
                          backups.map((backup) => (
                            <div key={backup.id} className="bg-white p-6 rounded-2xl border border-ag-gray-200 flex items-center justify-between group hover:border-ag-lime-400 transition-all shadow-sm">
                              <div className="flex items-center gap-6">
                                <div className="text-xs font-black text-ag-gray-400 bg-ag-gray-50 px-3 py-1 rounded-lg">
                                  {backup.createdAt?.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-lg font-black text-ag-gray-800">{backup.name}</div>
                              </div>
                              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleRestoreFromBackup(backup)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-ag-lime-100 text-ag-lime-700 rounded-xl font-black hover:bg-ag-lime-200 transition-colors text-sm"
                                >
                                  ⏪ 復元
                                </button>
                                <button 
                                  onClick={() => handleDeleteBackup(backup.id)}
                                  className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-black hover:bg-red-100 transition-colors text-sm"
                                >
                                  🗑️ 削除
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* 最下部に目立たない形で初期化ボタンを移動 */}
                      <div className="mt-20 pt-10 border-t border-ag-gray-100 text-center">
                        <button 
                          onClick={handleSeedData}
                          className="text-ag-gray-300 hover:text-red-400 text-xs font-black transition-colors"
                        >
                          [高度な操作] 全てのデータをソースコードの初期状態に戻す
                        </button>
                      </div>
                    </div>
                  )}

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
                      <span className="text-4xl">📋</span> 練習当番チーム編成
                    </h3>
                    <p className="text-ag-gray-500 font-bold mt-2 text-lg">ダッシュボードに自動表示される当番表です。ここでメンバー編成を変更できます。</p>
                  </div>
                  {hasEditPermission && (
                    <button
                      onClick={() => setEditingDutyTeams(JSON.parse(JSON.stringify(clubSettings?.dutyTeams || [])))}
                      className="bg-ag-lime-100 text-ag-lime-700 hover:bg-ag-lime-200 px-6 py-2.5 rounded-xl font-black transition-colors shadow-sm"
                    >
                      ✏️ 編成を変更する
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {clubSettings?.dutyTeams?.map((team, idx) => (
                      <div key={idx} className="bg-white rounded-[2rem] border-2 border-ag-gray-100 shadow-lg p-8 hover:border-ag-lime-200 hover:shadow-xl transition-all group">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-ag-gray-50">
                          <h4 className="font-black text-2xl text-ag-gray-800 tracking-tighter">{team.label}</h4>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {team.months.map(m => (
                              <span key={m} className="w-10 h-10 rounded-xl bg-ag-lime-50 text-ag-lime-700 font-black flex items-center justify-center text-lg border-2 border-ag-lime-100 shadow-sm group-hover:bg-ag-lime-500 group-hover:text-white transition-colors">{m}月</span>
                            ))}
                          </div>
                        </div>
                        <ul className="flex flex-wrap gap-2.5 mb-6">
                          {team.members.map(member => (
                            <li key={member} className="bg-ag-gray-50 text-ag-gray-800 font-black px-4 py-2 rounded-xl border-2 border-ag-gray-100 shadow-sm text-lg">
                              {member}
                            </li>
                          ))}
                        </ul>
                        {team.note && (
                          <div className="text-sm font-black text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center gap-2">
                            <span>💡</span> {team.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* III & VI. 試合・連盟・保険・おもてなし (老眼対策) */}
        {activeTab === "matches" && (
          <div className="space-y-10 animate-fade-in text-ag-gray-900">
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
                    保険・試合遵守
                  </h4>
                  <ul className="text-base sm:text-lg font-bold text-ag-gray-600 space-y-4 list-none">
                    <li className="flex gap-3">
                      <span className="text-ag-lime-500 text-xl">●</span>
                      <span>スポーツ保険は年度初めに希望を確認（任意・年度更新）。</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-ag-lime-500 text-xl">●</span>
                      <span>試合は棄権防止のため時間厳守。欠席は速やかに連絡。</span>
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
                <span className="text-xs font-black text-amber-800 bg-amber-200/50 px-3 py-1.5 rounded-xl border border-amber-200 tracking-widest uppercase">燃費 10Km/1L 換算</span>
              </div>
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
                    <tr className="hover:bg-amber-100/20 transition-colors">
                      <td className="px-8 py-8">
                         <div className="text-2xl font-black text-red-600">A <span className="text-sm font-bold text-ag-gray-500">(10km圏内)</span></div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="text-3xl font-black font-mono text-ag-gray-900">¥200</div>
                      </td>
                      <td className="px-8 py-8 text-base sm:text-lg text-ag-gray-600 italic">
                        都筑区内 (北山田、仲町台、中川、中山、荏田)
                      </td>
                    </tr>
                    <tr className="hover:bg-amber-100/20 transition-colors">
                      <td className="px-8 py-8">
                         <div className="text-2xl font-black text-emerald-600">B <span className="text-sm font-bold text-ag-gray-500">(20km圏内)</span></div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="text-3xl font-black font-mono text-ag-gray-900">¥300</div>
                      </td>
                      <td className="px-8 py-8 text-base sm:text-lg text-ag-gray-600 italic">
                        近隣区 (港北、藤が丘、あざみ野、白山)
                      </td>
                    </tr>
                    <tr className="hover:bg-amber-100/20 transition-colors bg-amber-50/10">
                      <td className="px-8 py-8">
                         <div className="text-2xl font-black text-amber-500">C <span className="text-sm font-bold text-ag-gray-500">(30km圏内)</span></div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="text-3xl font-black font-mono text-ag-gray-900">¥400</div>
                      </td>
                      <td className="px-8 py-8 text-base sm:text-lg text-ag-gray-600 italic">
                        神奈川区、保土ヶ谷、旭、青葉区遠方、町田、川崎
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
                    onClick={() => setEditingTransport(JSON.parse(JSON.stringify(clubSettings?.transportData || [])))}
                    className="bg-white/20 hover:bg-white/30 text-white font-black px-5 py-2.5 rounded-xl border border-white/30 text-sm transition-all"
                  >
                    ✏️ 編集する
                  </button>
                )}
              </div>

              {editingTransport ? (
                <div className="p-8 space-y-6 animate-fade-in">
                  <div className="text-sm font-black text-ag-gray-500 bg-ag-gray-50 p-4 rounded-2xl border border-ag-gray-100">
                    各会場の車と同乗メンバーを編集してください。車代エリアは A（¥200）/ B（¥300）/ C（¥400）で入力します。
                  </div>

                  {editingTransport.map((entry, ei) => {
                    const areaColor = entry.area === "A" ? "text-red-600 bg-red-50 border-red-200" : entry.area === "B" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-amber-600 bg-amber-50 border-amber-200";
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
                            <option value="A">A エリア</option>
                            <option value="B">B エリア</option>
                            <option value="C">C エリア</option>
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
                                  <div className="text-[10px] font-black text-ag-gray-400 mb-2 uppercase">同乗メンバー</div>
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
                <div className="divide-y divide-ag-gray-100">
                  {(() => {
                    const areaOrder = ["A", "B", "C"];
                    const areaFee: Record<string, string> = { A: "¥200", B: "¥300", C: "¥400" };
                    const areaColor: Record<string, string> = {
                      A: "text-red-600 bg-red-50/60",
                      B: "text-emerald-600 bg-emerald-50/60",
                      C: "text-amber-600 bg-amber-50/60",
                    };
                    const entries = clubSettings?.transportData ?? [];
                    const grouped = areaOrder.reduce<Record<string, TransportEntry[]>>((acc, a) => {
                      acc[a] = entries.filter((e) => e.area === a);
                      return acc;
                    }, {} as Record<string, TransportEntry[]>);

                    return areaOrder.map((area) => {
                      if (!grouped[area]?.length) return null;
                      return (
                        <div key={area} className="flex flex-col sm:flex-row">
                          <div className={`flex-shrink-0 w-full sm:w-20 flex sm:flex-col items-center justify-center py-6 px-4 font-black text-3xl ${areaColor[area]}`}>
                            {area}
                            <span className="text-sm font-black text-ag-gray-500 sm:mt-2 ml-3 sm:ml-0">{areaFee[area]}</span>
                          </div>
                          <div className="flex-1 divide-y divide-ag-gray-50">
                            {grouped[area].map((entry, ei) => (
                              <div key={ei} className="px-8 py-6">
                                <div className="font-black text-xl text-ag-gray-900 mb-4">{entry.venue}</div>
                                <div className="space-y-3">
                                  {entry.vehicles.map((v, vi) => (
                                    <div key={vi} className="flex items-start gap-4">
                                      <div className="shrink-0 font-black text-base text-ag-lime-600 bg-ag-lime-50 px-4 py-2 rounded-2xl border-2 border-ag-lime-100 min-w-[80px] text-center">
                                        {v.driver || <span className="text-ag-gray-300">未設定</span>}
                                      </div>
                                      <div className="flex-1 flex flex-wrap gap-2 pt-1.5">
                                        {v.passengers.length > 0 ? v.passengers.map((p, pi) => (
                                          <span key={pi} className="text-sm font-bold text-ag-gray-600 bg-white px-3 py-1 rounded-xl border border-ag-gray-100 shadow-sm">{p}</span>
                                        )) : (
                                          <span className="text-sm italic text-ag-gray-300 font-bold">同乗者未設定</span>
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
                  <div className="px-8 py-5 text-sm italic text-ag-gray-400 font-bold bg-ag-gray-50">
                    ※上記以外の体育館については、都度距離に応じて精算をお願いします。
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


          </div>
      </div>
  );
}
