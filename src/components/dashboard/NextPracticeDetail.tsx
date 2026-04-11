"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import PracticeGrouping, { Participant } from "./PracticeGrouping";
import VisitorRegistrationModal from "./VisitorRegistrationModal";
import { getNextPractice, type EventData } from "@/lib/events";
import { subscribeToAttendances, type AttendanceData } from "@/lib/attendances";
import { subscribeToVisitors, registerVisitor, type VisitorData } from "@/lib/visitors";
import { getTransportInfoFromRules, getDutyTeamByMonth, CAR_FEE_AREAS } from "@/data/rulesData";

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  attend:  { bg: "bg-ag-lime-500",  text: "text-white", label: "参加" },
  absent:  { bg: "bg-red-400",      text: "text-white", label: "不参加" },
  pending: { bg: "bg-amber-400",    text: "text-white", label: "保留" },
};


export default function NextPracticeDetail() {
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [nextPractice, setNextPractice] = useState<EventData | null>(null);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [visitors, setVisitors] = useState<VisitorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isVisitorMode = searchParams.get("role") === "visitor" && !user;

  // Firestoreから直近の練習を取得
  useEffect(() => {
    async function fetchNext() {
      try {
        const practice = await getNextPractice();
        setNextPractice(practice);
      } catch (err) {
        console.error("直近練習の取得に失敗:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchNext();
  }, []);

  // 出欠データをリアルタイム購読
  useEffect(() => {
    if (!nextPractice) return;
    const unsubscribe = subscribeToAttendances(nextPractice.id, (data) => {
      setAttendances(data);
    });
    return () => unsubscribe();
  }, [nextPractice?.id]);

  // ビジターデータをリアルタイム購読
  useEffect(() => {
    if (!nextPractice) return;
    const unsubscribe = subscribeToVisitors(nextPractice.id, (data) => {
      setVisitors(data);
    });
    return () => unsubscribe();
  }, [nextPractice?.id]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="rounded-3xl overflow-hidden border border-ag-gray-100 shadow-2xl bg-white p-12 text-center">
        <div className="text-ag-gray-400 font-bold">練習予定を読み込み中...</div>
      </div>
    );
  }

  // データなし
  if (!nextPractice) {
    return (
      <div className="rounded-3xl overflow-hidden border border-ag-gray-100 shadow-2xl bg-white p-12 text-center">
        <div className="text-2xl font-black text-ag-gray-400 mb-2">直近の練習予定がありません</div>
        <p className="text-ag-gray-500 font-bold">カレンダーから予定を追加してください</p>
      </div>
    );
  }

  // 日付をフォーマット
  const dateObj = new Date(nextPractice.date + "T00:00:00");
  const dayStr = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const dateDisplay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

  const attendingMembers = attendances.filter(a => a.status === "attend");
  const attending = attendingMembers.length;
  const totalWithVisitors = attending + visitors.length;
  const pct = Math.min((totalWithVisitors / nextPractice.maxCapacity) * 100, 100);

  // 場所からコーチと車代を自動算出（構造化データを使用）
  const transportInfo = getTransportInfoFromRules(nextPractice.location);
  const { coach, fee, area, facility } = transportInfo;

  // 練習日の月から練習当番を自動判定
  const practiceMonth = dateObj.getMonth() + 1;
  const dutyTeam = getDutyTeamByMonth(practiceMonth);
  const dutyMembers = nextPractice.dutyMembers?.length > 0
    ? nextPractice.dutyMembers
    : dutyTeam?.members || [];

  // グループ分け用データ
  const participants: Participant[] = [
    ...attendingMembers.map((m) => ({ id: `m-${m.memberId}`, name: m.name, isVisitor: false })),
    ...visitors.map((v) => ({
      id: `v-${v.id}`,
      name: v.name,
      isVisitor: true,
      rank: v.rank,
      joinIntent: v.joinIntent,
    })),
  ];

  return (
    <div className="rounded-3xl overflow-hidden border border-ag-gray-100 shadow-2xl bg-white">

      {/* ヒーローヘッダー */}
      <div className="bg-gradient-to-br from-ag-lime-500 via-emerald-500 to-teal-600 text-white px-6 pt-6 pb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-full">
              NEXT PRACTICE
            </span>
            <div className="flex items-center gap-4 mt-2">
              <h2 className="text-4xl font-black leading-none tracking-tight">
                {dateDisplay}<span className="text-2xl text-white/70 ml-1">（{dayStr}）</span>
              </h2>
              {/* 練習当番 (PC版) */}
              {nextPractice.dutyMembers.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 shadow-sm border border-white/10">
                  <span className="text-xs font-bold text-white/80">練習当番:</span>
                  <span className="text-sm font-black tracking-wide text-white">{nextPractice.dutyMembers.join("・")}</span>
                </div>
              )}
            </div>
          </div>
          <Link href="/dashboard/calendar" className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors shrink-0">
            全予定 →
          </Link>
        </div>
        
        {/* 練習当番 (スマホ用) */}
        {nextPractice.dutyMembers.length > 0 && (
          <div className="sm:hidden mb-4 flex items-center justify-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 shadow-sm border border-white/10">
            <span className="text-xs font-bold text-white/80">練習当番:</span>
            <span className="text-sm font-black tracking-wide text-white">{nextPractice.dutyMembers.join("・")}</span>
          </div>
        )}

        {/* 場所・時間・コーチ・配車 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "場所", value: nextPractice.location },
            { label: "時間", value: nextPractice.time },
            { label: "コーチ", value: coach },
            { label: "車代目安", value: fee ? `エリア${area} ¥${fee}` : "要確認" },
          ].map(item => (
            <div key={item.label} className="bg-white/20 backdrop-blur-md rounded-2xl px-3 py-4 text-center flex flex-col items-center justify-center">
              <div className="text-[10px] text-white/70 font-bold mb-1 tracking-wider">{item.label}</div>
              <div className="text-lg md:text-xl font-black leading-tight truncate w-full">{item.value}</div>
            </div>
          ))}
        </div>

        {/* 車出し担当・乗り合わせ情報（施設データがある場合） */}
        {facility && (facility.drivers.length > 0 || facility.passengers.length > 0) && (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 mb-4 border border-white/20">
            <div className="flex flex-wrap gap-4 items-center">
              {facility.drivers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/60 tracking-wider">車出し:</span>
                  <div className="flex flex-wrap gap-1">
                    {facility.drivers.map(d => (
                      <span key={d} className="text-sm font-black bg-white/25 px-2.5 py-1 rounded-lg border border-white/20">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {facility.passengers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/60 tracking-wider">同乗:</span>
                  <span className="text-sm font-bold text-white/80">{facility.passengers.join("・")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 練習当番 */}
        {dutyMembers.length > 0 && (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 mb-5 border border-white/20 flex items-center gap-3">
            <span className="text-[10px] font-bold text-white/60 tracking-wider shrink-0">練習当番 ({practiceMonth}月):</span>
            <div className="flex flex-wrap gap-1.5">
              {dutyMembers.map(m => (
                <span key={m} className="text-sm font-black bg-amber-400/30 px-2.5 py-1 rounded-lg border border-amber-300/30">{m}</span>
              ))}
            </div>
            {dutyTeam?.note && (
              <span className="text-[10px] font-bold text-amber-200 bg-amber-500/30 px-2 py-0.5 rounded-lg ml-auto">{dutyTeam.note}</span>
            )}
          </div>
        )}

        {/* 定員バー */}
        <div>
          <div className="flex justify-between text-base text-white/90 mb-2 font-black tracking-wide">
            <span>参加状況：会員 {attending}名 ＋ ビジター {visitors.length}名</span>
            <span className="text-white font-black text-xl">{totalWithVisitors} / {nextPractice.maxCapacity}名</span>
          </div>
          <div className="h-5 bg-black/40 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-white/90 mt-2 font-bold tracking-wide">
            <span>0名</span>
            <span className="text-white font-extrabold">上限 {nextPractice.maxCapacity}名</span>
          </div>
        </div>
      </div>

      {/* 特記事項 */}
      {nextPractice.description && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-1 rounded">NOTE</span>
          <p className="text-sm text-amber-700 font-bold leading-relaxed">{nextPractice.description}</p>
        </div>
      )}

      {/* 参加者 ＋ ビジター を横並びで一覧化 */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* 参加者リスト */}
        <div className="md:col-span-1">
          <SectionTitle title="参加メンバー" count={`${attending}名`} />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {attendingMembers.length === 0 ? (
              <p className="text-ag-gray-400 font-bold text-sm py-4">まだ参加回答がありません</p>
            ) : (
              attendingMembers.map(m => (
                <span
                  key={m.memberId}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-lg font-black tracking-wide border-2 bg-ag-lime-500 text-white border-transparent shadow-sm"
                >
                  {m.name}
                </span>
              ))
            )}
          </div>
        </div>

        {/* ビジター一覧 */}
        <div className="md:col-span-1">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ag-gray-100">
            <SectionTitle title="ビジター" count={`${visitors.length}名`} noBorder />
            <button 
              onClick={() => setIsVisitorModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all
                ${isVisitorMode 
                  ? "bg-sky-500 text-white hover:bg-sky-600 ring-4 ring-sky-100" 
                  : "bg-ag-gray-100 text-ag-gray-600 hover:bg-ag-gray-200 border border-ag-gray-200"}`}
            >
              <span>{isVisitorMode ? "参加表明" : "＋ 代理登録"}</span>
            </button>
          </div>
          <div className="space-y-3 mt-3">
            {visitors.length === 0 ? (
              <p className="text-ag-gray-400 font-bold text-sm py-4">ビジター登録はまだありません</p>
            ) : (
              visitors.map(v => (
                <div key={v.id} className="flex items-center gap-4 p-4 bg-sky-50/60 rounded-2xl border-2 border-sky-200 shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-sky-200 text-sky-800 text-2xl font-black flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                    {v.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-ag-gray-900 truncate tracking-wide">{v.name}</span>
                      <span className="text-sm font-black bg-sky-300 text-sky-900 px-2.5 py-1 rounded shrink-0 shadow-sm">ランク{v.rank}</span>
                    </div>
                    <p className="text-base text-ag-gray-600 font-bold mt-1">紹介: {v.invitedBy}</p>
                  </div>
                  {v.joinIntent && (
                    <span className="text-sm font-black text-ag-lime-800 bg-ag-lime-100 border-2 border-ag-lime-300 shadow-sm px-3 py-2 rounded-xl shrink-0">
                      入部希望
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* グループ分け機能 */}
      <div className="p-5 bg-white">
        <PracticeGrouping initialParticipants={participants} />
      </div>

      {/* ビジター登録モーダル */}
      <VisitorRegistrationModal 
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        isVisitorMode={isVisitorMode}
        defaultIntroducer={user?.displayName || ""}
        onSubmit={async (visitor) => {
          if (!nextPractice) return;
          try {
            await registerVisitor(nextPractice.id, {
              name: visitor.name,
              rank: (visitor.rank as "A" | "B" | "C") || "B",
              invitedBy: visitor.introducer || "",
              teamName: visitor.teamName || "",
              joinIntent: visitor.joinIntent || false,
              comment: visitor.comment || "",
              registeredBy: user?.displayName || "visitor",
            });
            alert(`${visitor.name}さんの登録を受け付けました！`);
          } catch (err) {
            console.error("ビジター登録エラー:", err);
            alert("登録に失敗しました。もう一度お試しください。");
          }
        }}
      />

    </div>
  );
}

// セクション見出しパーツ（絵文字不使用）
function SectionTitle({ title, count, noBorder = false }: { title: string; count: string; noBorder?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${noBorder ? "" : "pb-3 border-b-2 border-ag-gray-100"}`}>
      <span className="text-xl font-black text-ag-gray-800 tracking-wide">{title}</span>
      <span className="ml-auto text-sm font-black bg-ag-gray-100 text-ag-gray-600 px-3 py-1.5 rounded-full">{count}</span>
    </div>
  );
}
