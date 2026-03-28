"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { CalendarEvent } from "./CalendarGrid";
import { practiceSchedule, PracticeEvent, DetailedRegistration } from "@/data/practiceSchedule";

interface EventDetailProps {
  date: number;
  month: number;
  year: number;
  events: CalendarEvent[];
  onResponseChange: (eventId: number, response: string) => void;
}

const practiceOptions = [
  { value: "attend", label: "参加", icon: "✅", color: "bg-ag-lime-500 hover:bg-ag-lime-600 text-white border-ag-lime-500" },
  { value: "absent", label: "不参加", icon: "❌", color: "bg-red-500 hover:bg-red-600 text-white border-red-500" },
  { value: "pending", label: "保留", icon: "🤔", color: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" },
];

const responseLabels: Record<string, { label: string; color: string; bg: string }> = {
  attend: { label: "参加", color: "text-ag-lime-700", bg: "bg-ag-lime-50" },
  absent: { label: "不参加", color: "text-red-600", bg: "bg-red-50" },
  pending: { label: "保留", color: "text-amber-600", bg: "bg-amber-50" },
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function EventDetail({
  date,
  month,
  year,
  events,
  onResponseChange,
}: EventDetailProps) {
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<"regular" | "visitor">("regular");
  const [activeTab, setActiveTab] = useState<"detail" | "members">("detail");
  
  // ビジター登録フォームの状態
  const [isAddingVisitor, setIsAddingVisitor] = useState(false);
  const [visitorForm, setVisitorForm] = useState<Partial<DetailedRegistration>>({
    name: "",
    rank: "B",
    ageGroup: "30代",
    teamName: "",
    comment: ""
  });

  // URLパラメータからロール判定
  useEffect(() => {
    const role = searchParams.get("role");
    if (role === "visitor") setUserType("visitor");
  }, [searchParams]);

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-8 text-center sticky top-24">
        <div className="text-4xl mb-3">📅</div>
        <h3 className="text-lg font-bold text-ag-gray-800 mb-2">
          {month}/{date}（{DAYS[new Date(year, month - 1, date).getDay()]}）
        </h3>
        <p className="text-sm text-ag-gray-400">予定はありません</p>
      </div>
    );
  }

  // 実データがあるか確認
  const eventKey = `${year}-${month}-${date}`;
  const richEvent = (practiceSchedule[eventKey]?.[0] as PracticeEvent) || events[0];
  const dayOfWeek = new Date(year, month - 1, date).getDay();

  const handleVisitorSubmit = () => {
    if (!visitorForm.name) return;
    alert(`${visitorForm.name}さんを登録しました（※デモ動作）`);
    setIsAddingVisitor(false);
    setVisitorForm({ name: "", rank: "B", ageGroup: "30代", teamName: "", comment: "" });
  };

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-xl overflow-hidden animate-fade-in-up md:sticky md:top-24">
      {/* ヘッダー */}
      <div className={`px-6 py-6 ${
        richEvent.type === "practice" ? "bg-gradient-to-br from-ag-lime-500 to-emerald-500" : "bg-ag-gray-800"
      } text-white`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md uppercase tracking-widest">
            {richEvent.type === "practice" ? "🏸 Practice" : "📅 Event"}
          </span>
          {richEvent.responsibleTeam && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-black/20 border border-white/20">
              担当: {richEvent.responsibleTeam}
            </span>
          )}
        </div>
        <h3 className="text-xl font-extrabold mb-3 leading-tight">{richEvent.title}</h3>
        <div className="space-y-1.5 opacity-90">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-4 h-4 flex items-center justify-center bg-white/20 rounded">📍</span>
            {richEvent.location}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-4 h-4 flex items-center justify-center bg-white/20 rounded">⏰</span>
            {richEvent.time}
          </div>
        </div>
        {richEvent.description && (
          <div className="mt-4 p-3 bg-white/10 rounded-xl text-[11px] border border-white/10 italic">
            {richEvent.description}
          </div>
        )}
      </div>

      {/* タブ */}
      <div className="flex border-b border-ag-gray-100 bg-ag-gray-50/50">
        <button onClick={() => setActiveTab("detail")} className={`flex-1 py-3 text-xs font-bold transition-all ${activeTab === "detail" ? "text-ag-lime-600 border-b-2 border-ag-lime-500 bg-white" : "text-ag-gray-400"}`}>参加者</button>
        <button onClick={() => setActiveTab("members")} className={`flex-1 py-3 text-xs font-bold transition-all ${activeTab === "members" ? "text-ag-lime-600 border-b-2 border-ag-lime-500 bg-white" : "text-ag-gray-400"}`}>詳細設定</button>
      </div>

      <div className="p-5 max-h-[500px] overflow-y-auto custom-scrollbar">
        {activeTab === "detail" ? (
          <div className="space-y-6">
            {/* あなたの回答 (ビジター時も表示) */}
            <div className="p-4 bg-ag-lime-50/50 rounded-2xl border border-ag-lime-100">
               <h4 className="text-[10px] font-extrabold text-ag-lime-600 uppercase mb-3 tracking-widest">あなたの出欠回答</h4>
               <div className="flex gap-2">
                 {practiceOptions.map(opt => (
                   <button 
                     key={opt.value} 
                     onClick={() => onResponseChange(richEvent.id, opt.value)}
                     className={`flex-1 py-2.5 rounded-xl border-2 text-[11px] font-bold transition-all ${richEvent.myResponse === opt.value ? "bg-ag-lime-500 border-ag-lime-500 text-white shadow-md" : "bg-white border-ag-gray-100 text-ag-gray-400 hover:border-ag-lime-200"}`}
                   >
                     {opt.icon} {opt.label}
                   </button>
                 ))}
               </div>
            </div>

            {/* ビジター登録ボタン (メンバーのみ、またはビジター自身) */}
            <div>
               {!isAddingVisitor ? (
                 <button 
                   onClick={() => setIsAddingVisitor(true)}
                   className="w-full py-3 px-4 bg-white border-2 border-dashed border-ag-gray-200 rounded-2xl text-xs font-bold text-ag-gray-500 hover:border-ag-lime-400 hover:text-ag-lime-600 transition-all flex items-center justify-center gap-2"
                 >
                   <span className="text-lg">+</span> ビジターを登録する
                 </button>
               ) : (
                 <div className="p-5 bg-ag-gray-50 rounded-2xl border border-ag-gray-200 animate-scale-in">
                    <h5 className="text-[10px] font-extrabold text-ag-gray-400 uppercase mb-4 tracking-widest">ビジター情報入力</h5>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-ag-gray-500 block mb-1">お名前</label>
                        <input type="text" value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})} className="w-full bg-white border border-ag-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-ag-lime-500 outline-none" placeholder="例: 佐藤 健" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-ag-gray-500 block mb-1">ランク (L基準)</label>
                          <select value={visitorForm.rank} onChange={e => setVisitorForm({...visitorForm, rank: e.target.value as "A"|"B"|"C"})} className="w-full bg-white border border-ag-gray-200 rounded-xl px-3 py-2 text-xs outline-none">
                            <option value="A">A ランク</option><option value="B">B ランク</option><option value="C">C ランク</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-ag-gray-500 block mb-1">年齢層</label>
                          <select value={visitorForm.ageGroup} onChange={e => setVisitorForm({...visitorForm, ageGroup: e.target.value})} className="w-full bg-white border border-ag-gray-200 rounded-xl px-3 py-2 text-xs outline-none">
                            <option>10代</option><option>20代</option><option>30代</option><option>40代</option><option>50代</option><option>60代以上</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-ag-gray-500 block mb-1">所属チーム</label>
                        <input type="text" value={visitorForm.teamName} onChange={e => setVisitorForm({...visitorForm, teamName: e.target.value})} className="w-full bg-white border border-ag-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-ag-lime-500 outline-none" placeholder="例: フリー、○○クラブ" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setIsAddingVisitor(false)} className="flex-1 py-2 text-xs font-bold text-ag-gray-400">キャンセル</button>
                        <button onClick={handleVisitorSubmit} className="flex-[2] py-2 bg-ag-lime-500 text-white rounded-xl text-xs font-bold hover:bg-ag-lime-600 shadow-lg shadow-ag-lime-500/20">登録する</button>
                      </div>
                    </div>
                 </div>
               )}
            </div>

            {/* 参加者リスト */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest flex items-center justify-between">
                <span>参加者リスト</span>
                <span className="bg-ag-gray-100 px-2 py-0.5 rounded text-ag-gray-500">{richEvent.registrations.length} 名</span>
              </h4>
              <div className="divide-y divide-ag-gray-50 border border-ag-gray-50 rounded-2xl overflow-hidden bg-white shadow-sm">
                {richEvent.registrations.length > 0 ? richEvent.registrations.map(reg => (
                  <div key={reg.id} className="p-4 flex items-start gap-3 hover:bg-ag-gray-50/50 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${reg.type === "visitor" ? "bg-sky-100 text-sky-600 border border-sky-200" : "bg-ag-lime-100 text-ag-lime-700 border border-ag-lime-200"}`}>
                      {reg.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-ag-gray-800">{reg.name}</span>
                        {reg.rank && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">ランク{reg.rank}</span>}
                        {reg.type === "visitor" && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-sky-100 text-sky-400 italic">Visitor</span>}
                      </div>
                      <p className="text-[10px] text-ag-gray-400 truncate mt-0.5">
                        {reg.teamName ? `${reg.teamName} / ` : ""}{reg.ageGroup || ""} {reg.invitedBy ? `(紹介: ${reg.invitedBy})` : ""}
                      </p>
                      {reg.comment && (
                        <p className="text-[10px] text-ag-gray-500 mt-1.5 p-2 bg-ag-gray-50 rounded-lg italic border-l-2 border-ag-gray-200">
                          「{reg.comment}」
                        </p>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-ag-gray-300 text-xs italic">
                    まだ参加予約はありません
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center py-10">
            <div className="w-16 h-16 bg-ag-gray-100 rounded-full flex items-center justify-center mx-auto text-3xl">⚙️</div>
            <p className="text-sm text-ag-gray-500">
              この予定の詳細な構成員設定や<br />定員変更は役員のみ可能です
            </p>
            <button className="text-xs font-bold text-ag-lime-600 hover:underline">役員メニューを開く</button>
          </div>
        )}
      </div>
    </div>
  );
}
