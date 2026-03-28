"use client";

import { useState } from "react";
import Link from "next/link";

// 直近練習の詳細データ（後でFirestoreから取得）
const NEXT_PRACTICE = {
  date: "4/8",
  day: "水",
  time: "12:00〜15:00",
  location: "仲町台",
  responsible: "BB",
  fee: 700,
  attendees: 4,
  total: 24,
  coachCar: {
    driver: "山口コーチ",
    seats: 4,
    passengers: ["田中", "佐藤", "鈴木"],
  },
  carpools: [
    { driver: "石川", seats: 3, passengers: ["杉村", "満沢"] },
    { driver: "山本", seats: 4, passengers: [] },
  ],
  dutyMembers: ["田中", "佐藤"],
  visitors: [
    { name: "石井B", rank: "B", invitedBy: "石川" },
    { name: "杉村B", rank: "B", invitedBy: "石川" },
    { name: "満沢B", rank: "B", invitedBy: "石川" },
    { name: "鈴木庸子A", rank: "A", invitedBy: "上杉" },
  ],
  note: "♡ 新入部員歓迎モーニングinよこはま物語（9:30〜11:30 テラス席）",
};

export default function NextPracticeDetail() {
  const [openSection, setOpenSection] = useState<string | null>("carpool");
  const toggle = (key: string) => setOpenSection(openSection === key ? null : key);

  const attendPct = (NEXT_PRACTICE.attendees / NEXT_PRACTICE.total) * 100;

  return (
    <div className="rounded-3xl overflow-hidden border border-ag-gray-100 shadow-xl bg-white">
      {/* ヒーローヘッダー */}
      <div className="bg-gradient-to-br from-ag-lime-500 via-emerald-500 to-teal-500 text-white px-6 py-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-full">
              NEXT PRACTICE
            </span>
            <h2 className="text-3xl font-black mt-2 leading-none">
              {NEXT_PRACTICE.date}（{NEXT_PRACTICE.day}）
            </h2>
            <p className="text-white/80 text-sm mt-1">{NEXT_PRACTICE.time}</p>
          </div>
          <Link
            href="/dashboard/calendar"
            className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors"
          >
            全予定 →
          </Link>
        </div>

        {/* 場所・担当・参加費 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: "📍", label: "場所", value: NEXT_PRACTICE.location },
            { icon: "🏢", label: "担当", value: NEXT_PRACTICE.responsible },
            { icon: "💴", label: "参加費", value: `¥${NEXT_PRACTICE.fee.toLocaleString()}` },
          ].map((item) => (
            <div key={item.label} className="bg-white/15 backdrop-blur-md rounded-2xl p-3 text-center">
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-[9px] text-white/60 font-bold uppercase">{item.label}</div>
              <div className="text-xs font-extrabold mt-0.5">{item.value}</div>
            </div>
          ))}
        </div>

        {/* 参加人数バー */}
        <div>
          <div className="flex justify-between text-[10px] text-white/70 mb-1.5">
            <span>参加人数</span>
            <span className="font-bold">{NEXT_PRACTICE.attendees} / {NEXT_PRACTICE.total} 名</span>
          </div>
          <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${attendPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 特記事項 */}
      {NEXT_PRACTICE.note && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
          <span className="text-sm mt-0.5">📣</span>
          <p className="text-xs text-amber-700 font-medium leading-relaxed">{NEXT_PRACTICE.note}</p>
        </div>
      )}

      {/* アコーディオン詳細 */}
      <div className="divide-y divide-ag-gray-50">

        {/* 乗り合わせ情報 */}
        <Accordion
          id="carpool"
          icon="🚗"
          title="乗り合わせ情報"
          badge={`${NEXT_PRACTICE.carpools.length + 1} 台`}
          open={openSection === "carpool"}
          onToggle={() => toggle("carpool")}
        >
          <div className="space-y-3 pt-1">
            {/* コーチ車 */}
            <CarCard
              driver={NEXT_PRACTICE.coachCar.driver}
              passengers={NEXT_PRACTICE.coachCar.passengers}
              seats={NEXT_PRACTICE.coachCar.seats}
              isCoach
            />
            {NEXT_PRACTICE.carpools.map((c) => (
              <CarCard
                key={c.driver}
                driver={c.driver}
                passengers={c.passengers}
                seats={c.seats}
              />
            ))}
          </div>
        </Accordion>

        {/* 練習当番 */}
        <Accordion
          id="duty"
          icon="📋"
          title="練習当番"
          badge={`${NEXT_PRACTICE.dutyMembers.length} 名`}
          open={openSection === "duty"}
          onToggle={() => toggle("duty")}
        >
          <div className="flex flex-wrap gap-2 pt-1">
            {NEXT_PRACTICE.dutyMembers.map((m) => (
              <span key={m} className="bg-ag-lime-50 text-ag-lime-700 border border-ag-lime-100 rounded-xl px-3 py-1 text-xs font-bold">
                {m}
              </span>
            ))}
          </div>
        </Accordion>

        {/* ビジター情報 */}
        <Accordion
          id="visitors"
          icon="👥"
          title="ビジター"
          badge={`${NEXT_PRACTICE.visitors.length} 名`}
          open={openSection === "visitors"}
          onToggle={() => toggle("visitors")}
        >
          <div className="space-y-2 pt-1">
            {NEXT_PRACTICE.visitors.map((v) => (
              <div key={v.name} className="flex items-center gap-3 p-2.5 bg-sky-50/50 rounded-xl border border-sky-100/80">
                <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 text-[10px] font-black flex items-center justify-center">
                  {v.name[0]}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-ag-gray-800">{v.name}</span>
                  <span className="ml-1.5 text-[9px] bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded font-bold">ランク{v.rank}</span>
                  <p className="text-[9px] text-ag-gray-400">紹介: {v.invitedBy}</p>
                </div>
              </div>
            ))}
          </div>
        </Accordion>
      </div>
    </div>
  );
}

// アコーディオンUIパーツ
function Accordion({
  id, icon, title, badge, open, onToggle, children,
}: {
  id: string; icon: string; title: string; badge: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-ag-gray-50/50 transition-colors"
      >
        <span className="text-base">{icon}</span>
        <span className="text-sm font-bold text-ag-gray-800 flex-1 text-left">{title}</span>
        <span className="text-[9px] font-extrabold bg-ag-gray-100 text-ag-gray-500 px-2 py-0.5 rounded-full">{badge}</span>
        <span className={`text-ag-gray-300 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

// 乗り合わせカード
function CarCard({
  driver, passengers, seats, isCoach = false
}: {
  driver: string; passengers: string[]; seats: number; isCoach?: boolean;
}) {
  const empty = seats - passengers.length;
  return (
    <div className={`rounded-2xl p-3 border ${isCoach ? "bg-ag-lime-50 border-ag-lime-100" : "bg-ag-gray-50 border-ag-gray-100"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{isCoach ? "🏅" : "🚗"}</span>
        <span className="text-xs font-black text-ag-gray-800">{driver}</span>
        {isCoach && <span className="text-[8px] font-extrabold text-ag-lime-700 bg-ag-lime-100 px-1.5 py-0.5 rounded">コーチ車</span>}
        <span className="ml-auto text-[9px] text-ag-gray-400">空き <span className="font-bold text-ag-lime-600">{empty}</span> 席</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {passengers.map((p) => (
          <span key={p} className="text-[10px] bg-white text-ag-gray-600 border border-ag-gray-200 rounded-lg px-2 py-0.5 font-medium">{p}</span>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={i} className="text-[10px] border border-dashed border-ag-gray-200 text-ag-gray-300 rounded-lg px-2 py-0.5">空席</span>
        ))}
      </div>
    </div>
  );
}
