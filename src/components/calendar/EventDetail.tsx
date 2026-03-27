"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { CalendarEvent } from "./CalendarGrid";

interface EventDetailProps {
  date: number;
  month: number;
  year: number;
  events: CalendarEvent[];
  onResponseChange: (eventId: number, response: string) => void;
}

// 出欠メンバーのモックデータ
interface MemberAttendance {
  id: number;
  name: string;
  avatar: string;
  response: "attend" | "absent" | "pending" | "basic" | "consult" | null;
  isVisitor?: boolean;
  invitedBy?: string;
  comment?: string;
}

const mockMembers: MemberAttendance[] = [
  { id: 1, name: "管理者（あなた）", avatar: "管", response: null },
  { id: 2, name: "田中太郎", avatar: "田", response: "attend" },
  { id: 3, name: "佐藤花子", avatar: "佐", response: "attend" },
  { id: 4, name: "鈴木一郎", avatar: "鈴", response: "absent" },
  { id: 5, name: "山田次郎", avatar: "山", response: "attend" },
  { id: 6, name: "高橋三郎", avatar: "高", response: "pending" },
  { id: 7, name: "渡辺四郎", avatar: "渡", response: "attend" },
  { id: 8, name: "伊藤五郎", avatar: "伊", response: "basic" },
  { id: 9, name: "中村六子", avatar: "中", response: "attend" },
  { id: 10, name: "小林七美", avatar: "小", response: null },
  { id: 11, name: "加藤八郎", avatar: "加", response: "attend" },
  { id: 12, name: "吉田九子", avatar: "吉", response: "attend" },
  { id: 13, name: "山口十郎", avatar: "口", response: "absent" },
  { id: 14, name: "松本十一", avatar: "松", response: "attend" },
  { id: 15, name: "井上十二", avatar: "井", response: "attend" },
  { id: 16, name: "木村十三", avatar: "木", response: null },
  { id: 17, name: "林十四子", avatar: "林", response: "attend" },
  { id: 18, name: "清水十五", avatar: "清", response: "attend" },
];

const practiceOptions = [
  { value: "attend", label: "参加", icon: "✅", color: "bg-ag-lime-500 hover:bg-ag-lime-600 text-white border-ag-lime-500" },
  { value: "absent", label: "不参加", icon: "❌", color: "bg-red-500 hover:bg-red-600 text-white border-red-500" },
  { value: "pending", label: "保留", icon: "🤔", color: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" },
  { value: "basic", label: "基礎のみ", icon: "🏃", color: "bg-sky-500 hover:bg-sky-600 text-white border-sky-500" },
];

const matchOptions = [
  { value: "attend", label: "参加", icon: "✅", color: "bg-ag-lime-500 hover:bg-ag-lime-600 text-white border-ag-lime-500" },
  { value: "absent", label: "不参加", icon: "❌", color: "bg-red-500 hover:bg-red-600 text-white border-red-500" },
  { value: "consult", label: "相談したい", icon: "💬", color: "bg-purple-500 hover:bg-purple-600 text-white border-purple-500" },
];

const responseLabels: Record<string, { label: string; color: string; bg: string }> = {
  attend: { label: "参加", color: "text-ag-lime-700", bg: "bg-ag-lime-50" },
  absent: { label: "不参加", color: "text-red-600", bg: "bg-red-50" },
  pending: { label: "保留", color: "text-amber-600", bg: "bg-amber-50" },
  basic: { label: "基礎のみ", color: "text-sky-600", bg: "bg-sky-50" },
  consult: { label: "相談したい", color: "text-purple-600", bg: "bg-purple-50" },
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function EventDetail({
  date,
  month,
  year,
  events,
  onResponseChange,
}: EventDetailProps) {
  // テスト用の会員種別ステート（本来はAuthContext等から取得）
  const [userType, setUserType] = useState<"regular" | "light" | "visitor">("regular");
  const [activeTab, setActiveTab] = useState<"detail" | "members">("detail");
  const [visitors, setVisitors] = useState<MemberAttendance[]>([
    { id: 101, name: "鈴木さん(ビジター)", avatar: "ビ", response: "attend", isVisitor: true, invitedBy: "田中太郎", comment: "練習相手として" }
  ]);
  const [isAddingVisitor, setIsAddingVisitor] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ name: "", comment: "" });
  const searchParams = useSearchParams();
  const dayOfWeek = new Date(year, month - 1, date).getDay();
  const isMasked = userType === "visitor";

  // URLパラメータから初期ロールを設定
  useEffect(() => {
    const role = searchParams.get("role");
    if (role === "visitor") {
      setUserType("visitor");
    }
  }, [searchParams]);

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">📅</div>
        <h3 className="text-lg font-bold text-ag-gray-800 mb-2">
          {month}/{date}（{DAYS[dayOfWeek]}）
        </h3>
        <p className="text-sm text-ag-gray-400">
          この日に予定はありません
        </p>
      </div>
    );
  }

  const event = events[0]; // 1日1イベントと仮定
  const options = event.type === "practice" ? practiceOptions : matchOptions;

  // 予約開始日の計算（シミュレーション上の今日は2026年3月27日）
  const eventDate = new Date(year, month - 1, date);
  const today = new Date(2026, 2, 27); // 3月27日
  
  const getRegistrationStartDate = () => {
    const d = new Date(eventDate);
    if (userType === "regular" || userType === "light") {
      // 通常・ライト会員は制限なし（90日前など十分前に設定）
      d.setDate(d.getDate() - 90);
    } else {
      // ビジターは21日前
      d.setDate(d.getDate() - 21);
    }
    return d;
  };

  const startDate = getRegistrationStartDate();
  const isOpen = today >= startDate;
  const isFull = event.attendees >= event.total && event.myResponse === null;
  const daysUntilOpen = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // 出欠統計
  const attendCount = mockMembers.filter((m) => m.response === "attend").length;
  const absentCount = mockMembers.filter((m) => m.response === "absent").length;
  const pendingCount = mockMembers.filter((m) => m.response === "pending").length;
  const basicCount = mockMembers.filter((m) => m.response === "basic").length;
  const noResponseCount = mockMembers.filter((m) => m.response === null).length;

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden animate-fade-in-up">
      {/* イベントヘッダー */}
      <div className={`px-6 py-5 ${
        event.type === "practice"
          ? "bg-gradient-to-r from-ag-lime-500 to-ag-lime-400"
          : event.type === "match"
          ? "bg-gradient-to-r from-blue-500 to-blue-400"
          : "bg-gradient-to-r from-purple-500 to-purple-400"
      } text-white`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
            {event.type === "practice" ? "🏸 練習" : event.type === "match" ? "🏆 試合" : "🎉 イベント"}
          </span>
        </div>
        <h3 className="text-xl font-bold mb-1">{event.title}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-white/80">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {year}/{month}/{date}（{DAYS[dayOfWeek]}）
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {event.time}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {event.location}
          </span>
        </div>
      </div>

      {/* あなたの回答セクション */}
      <div className="px-6 py-5 border-b border-ag-gray-100">
        <h4 className="text-sm font-bold text-ag-gray-800 mb-3 flex items-center gap-2">
          <span className="text-base">🙋</span>
          あなたの回答
          {event.myResponse === null && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 animate-pulse">
              未回答
            </span>
          )}
        </h4>

        {/* 検証用ロール切り替え（シミュレーション） */}
        <div className="mb-6 p-4 bg-ag-gray-50/80 rounded-2xl border border-ag-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="text-sm">🧪</span> 表示ロールの切り替え
            </h5>
            <span className="text-[9px] text-ag-gray-400 bg-white px-1.5 py-0.5 rounded border border-ag-gray-100">検証用モード</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-ag-gray-100">
            {(["regular", "light", "visitor"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setUserType(t)}
                className={`
                  relative py-2 px-1 rounded-lg text-xs font-bold transition-all duration-200
                  ${userType === t 
                    ? "bg-ag-lime-500 text-white shadow-sm ring-1 ring-ag-lime-400" 
                    : "text-ag-gray-400 hover:text-ag-gray-600 hover:bg-ag-gray-50"
                  }
                `}
              >
                {t === "regular" ? "通常会員" : t === "light" ? "ライト会員" : "ビジター"}
                {userType === t && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                )}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[9px] text-ag-gray-400 leading-relaxed text-center px-2">
            ※実際の運用ではログインユーザーの権限に基づき自動判定されますが、ここでは動作確認のために手動で切り替え可能です。
          </p>
        </div>

        {!isOpen ? (
          <div className={`border rounded-xl p-4 text-center ${
            userType === "visitor" ? "bg-sky-50 border-sky-100" : "bg-ag-gray-50 border-ag-gray-200"
          }`}>
            <p className={`text-sm font-bold ${userType === "visitor" ? "text-sky-700" : "text-ag-gray-600"}`}>
              {userType === "visitor" ? "📢 ビジター予約 受付前" : "🔒 予約受付前です"}
            </p>
            <p className="text-[11px] text-ag-gray-400 mt-1">
              {userType === "regular" ? "通常会員" : userType === "light" ? "ライト会員" : "ビジター会員"}の予約開始まであと <span className="text-ag-lime-600 font-bold">{daysUntilOpen}日</span>
              <br />
              （{startDate.getMonth() + 1}/{startDate.getDate()} より受付開始）
            </p>
            {userType === "visitor" && (
              <p className="mt-2 text-[10px] text-sky-600 font-medium bg-white/50 py-1 rounded-lg">
                ※通常・ライト会員は28日前から先行予約可能です
              </p>
            )}
          </div>
        ) : isFull ? (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-red-600">
              🈵 満員のため予約できません
            </p>
            <p className="text-[11px] text-red-400 mt-1">
              定員（{event.total}名）に達しました。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userType === "visitor" && (
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-2 flex items-center gap-2">
                <span className="text-xs">👋</span>
                <p className="text-[10px] font-bold text-sky-700">現在は「ビジター枠」として予約可能です</p>
              </div>
            )}
            <div className={`grid gap-2 ${options.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
              {options.map((opt) => {
                const isSelected = event.myResponse === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onResponseChange(event.id, opt.value)}
                    className={`
                      flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200 cursor-pointer
                      ${isSelected
                        ? opt.color
                        : "bg-white border-ag-gray-200 hover:border-ag-gray-300 text-ag-gray-600 hover:bg-ag-gray-50"
                      }
                    `}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ビジター追加ボタン */}
        <div className="mt-4">
          {!isAddingVisitor ? (
            <button 
              onClick={() => setIsAddingVisitor(true)}
              className="w-full py-2 px-4 bg-ag-gray-50 text-ag-gray-600 border border-ag-gray-200 border-dashed rounded-xl text-xs font-bold hover:bg-ag-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span> ビジターを呼ぶ
            </button>
          ) : (
            <div className="p-4 bg-ag-gray-50 rounded-xl border border-ag-gray-200 animate-fade-in-up">
               <h5 className="text-[10px] font-bold text-ag-gray-500 mb-3 uppercase tracking-wider">ビジター登録</h5>
               <div className="space-y-3">
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400 block mb-1">お名前</label>
                   <input 
                     type="text" 
                     value={newVisitor.name}
                     onChange={(e) => setNewVisitor({...newVisitor, name: e.target.value})}
                     className="w-full bg-white border border-ag-gray-200 rounded-lg px-3 py-1.5 text-xs text-ag-gray-800 focus:ring-1 focus:ring-ag-lime-500 outline-none" 
                     placeholder="例: 佐藤 健"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-ag-gray-400 block mb-1">紹介コメント（練習相手・勧誘など）</label>
                   <input 
                     type="text" 
                     value={newVisitor.comment}
                     onChange={(e) => setNewVisitor({...newVisitor, comment: e.target.value})}
                     className="w-full bg-white border border-ag-gray-200 rounded-lg px-3 py-1.5 text-xs text-ag-gray-800 focus:ring-1 focus:ring-ag-lime-500 outline-none" 
                     placeholder="例: 高校時代の友人。勧誘対象です。"
                   />
                 </div>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setIsAddingVisitor(false)}
                     className="flex-1 py-1.5 text-xs font-bold text-ag-gray-400 hover:text-ag-gray-600"
                   >
                     キャンセル
                   </button>
                   <button 
                     disabled={!newVisitor.name}
                     onClick={() => {
                        setVisitors([...visitors, {
                          id: Date.now(),
                          name: newVisitor.name,
                          avatar: newVisitor.name.substring(0, 1),
                          response: "attend",
                          isVisitor: true,
                          invitedBy: "管理者（あなた）",
                          comment: newVisitor.comment
                        }]);
                        setIsAddingVisitor(false);
                        setNewVisitor({ name: "", comment: "" });
                     }}
                     className="flex-[2] py-1.5 bg-ag-lime-500 text-white rounded-lg text-xs font-bold hover:bg-ag-lime-600 shadow-sm disabled:opacity-50 transition-colors"
                   >
                     登録する
                   </button>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex border-b border-ag-gray-100">
        <button
          onClick={() => setActiveTab("detail")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors cursor-pointer ${
            activeTab === "detail"
              ? "text-ag-lime-700 border-b-2 border-ag-lime-500"
              : "text-ag-gray-400 hover:text-ag-gray-600"
          }`}
        >
          出欠状況
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors cursor-pointer ${
            activeTab === "members"
              ? "text-ag-lime-700 border-b-2 border-ag-lime-500"
              : "text-ag-gray-400 hover:text-ag-gray-600"
          }`}
        >
          メンバー一覧
          {userType === "visitor" && <span className="ml-1 text-[10px]">🔒</span>}
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === "detail" ? (
        <div className="p-5">
          {/* 出欠サマリーバー */}
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {attendCount > 0 && (
              <div className="bg-ag-lime-400 transition-all" style={{ width: `${(attendCount / mockMembers.length) * 100}%` }} />
            )}
            {basicCount > 0 && (
              <div className="bg-sky-400 transition-all" style={{ width: `${(basicCount / mockMembers.length) * 100}%` }} />
            )}
            {pendingCount > 0 && (
              <div className="bg-amber-400 transition-all" style={{ width: `${(pendingCount / mockMembers.length) * 100}%` }} />
            )}
            {absentCount > 0 && (
              <div className="bg-red-400 transition-all" style={{ width: `${(absentCount / mockMembers.length) * 100}%` }} />
            )}
            {noResponseCount > 0 && (
              <div className="bg-ag-gray-200 transition-all" style={{ width: `${(noResponseCount / mockMembers.length) * 100}%` }} />
            )}
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "参加", count: attendCount, color: "text-ag-lime-600", bg: "bg-ag-lime-50" },
              { label: "基礎のみ", count: basicCount, color: "text-sky-600", bg: "bg-sky-50" },
              { label: "保留", count: pendingCount, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "不参加", count: absentCount, color: "text-red-600", bg: "bg-red-50" },
              { label: "未回答", count: noResponseCount, color: "text-ag-gray-500", bg: "bg-ag-gray-50" },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                <div className={`text-xl font-bold ${stat.color}`}>{stat.count}</div>
                <div className="text-[10px] text-ag-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ビジター向けアプリ訴求バナー (追加) */}
          {userType === "visitor" && (
            <div className="mt-6 p-5 bg-gradient-to-br from-ag-gray-900 to-ag-gray-800 rounded-2xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-ag-lime-400/20 blur-3xl -mr-16 -mt-16" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-ag-lime-400 text-ag-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Recommended</span>
                  <h6 className="text-sm font-bold">アプリ版でもっと便利に</h6>
                </div>
                <ul className="space-y-2.5 mb-5">
                  <li className="flex items-start gap-2.5 text-xs text-ag-gray-300">
                    <span className="text-ag-lime-400 flex-shrink-0">📱</span>
                    <span><strong>場所確定通知</strong>：2ヶ月前に練習場所が決まると即座にポップアップでお知らせ。</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-ag-gray-300">
                    <span className="text-ag-lime-400 flex-shrink-0">🔔</span>
                    <span><strong>キャンセル待ち</strong>：満員の练习に空きが出た際、優先的に通知を受け取れます。</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-white text-ag-gray-900 rounded-xl text-xs font-bold hover:bg-ag-lime-50 transition-colors shadow-sm cursor-pointer">
                  アプリをダウンロードして参加する
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-[360px] overflow-y-auto">
          {/* メンバー一覧 */}
          <div className="divide-y divide-ag-gray-50">
            {mockMembers.map((member) => {
              const resp = member.response ? responseLabels[member.response] : null;
              
              return (
                <div key={member.id} className="px-5 py-3 flex items-center justify-between hover:bg-ag-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      isMasked ? "bg-ag-gray-200" : "bg-gradient-to-br from-ag-lime-300 to-ag-lime-500"
                    }`}>
                      {isMasked ? "?" : member.avatar}
                    </div>
                    <span className={`text-sm font-medium ${isMasked ? "text-ag-gray-300" : "text-ag-gray-800"}`}>
                      {isMasked ? "？ ？ ？" : member.name}
                    </span>
                  </div>
                  {resp && !isMasked ? (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${resp.bg} ${resp.color}`}>
                      {resp.label}
                    </span>
                  ) : isMasked ? (
                    <span className="text-[10px] text-ag-gray-300 italic">非公開</span>
                  ) : (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-ag-gray-100 text-ag-gray-400">
                      未回答
                    </span>
                  )}
                </div>
              );
            })}

            {/* ビジター一覧 */}
            {visitors.length > 0 && (
              <div className="mt-4">
                <div className="px-5 py-2 bg-ag-gray-50/50 border-y border-ag-gray-100 text-[10px] font-extrabold text-ag-gray-400 uppercase tracking-widest">
                   👥 ビジター・紹介枠
                </div>
                {visitors.map((visitor) => (
                  <div key={visitor.id} className="px-5 py-4 border-b border-ag-gray-50 bg-sky-50/10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs ring-2 ring-sky-200">
                          {visitor.avatar}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${isMasked ? "text-ag-gray-300" : "text-ag-gray-800"}`}>
                            {isMasked ? "？ ？ ？" : visitor.name}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-max mt-1 ${
                            isMasked ? "text-ag-gray-300 bg-ag-gray-50" : "text-sky-600 bg-sky-50"
                          }`}>
                            紹介者: {isMasked ? "？ ？" : visitor.invitedBy}
                          </span>
                          {visitor.comment && !isMasked && (
                            <p className="text-[11px] text-ag-gray-500 mt-1.5 italic bg-white p-2 rounded-lg border border-ag-gray-100">
                              「{visitor.comment}」
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-ag-lime-50 text-ag-lime-700">
                        参加
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
