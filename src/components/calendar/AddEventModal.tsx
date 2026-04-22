"use client";

import { useState } from "react";
import { createEvent, initBookingConfig } from "@/lib/events";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: { year: number; month: number; day: number };
}

// 種別設定
const EVENT_TYPES = [
  { value: "practice", label: "練習", icon: "🏸", color: "bg-ag-lime-500 border-ag-lime-500 text-white", selectedBg: "from-ag-lime-500 to-emerald-500" },
  { value: "match", label: "試合", icon: "🏆", color: "bg-blue-500 border-blue-500 text-white", selectedBg: "from-blue-500 to-blue-600" },
  { value: "event", label: "イベント", icon: "🎉", color: "bg-purple-500 border-purple-500 text-white", selectedBg: "from-purple-500 to-purple-600" },
  { value: "deadline", label: "申込み締切", icon: "⚠️", color: "bg-red-500 border-red-500 text-white", selectedBg: "from-red-500 to-red-600" },
];

const LOCATIONS = [
  "白山",
  "仲町台",
  "中川西",
  "北山田",
  "美しが丘西",
  "その他（自由入力）",
];

export default function AddEventModal({ isOpen, onClose, defaultDate }: AddEventModalProps) {
  const today = new Date();
  const [form, setForm] = useState({
    type: "practice" as string,
    title: "",
    date: defaultDate
      ? `${defaultDate.year}-${String(defaultDate.month).padStart(2, "0")}-${String(defaultDate.day).padStart(2, "0")}`
      : today.toISOString().split("T")[0],
    timeStart: "09:00",
    timeEnd: "12:00",
    locationPreset: "仲町台",
    locationCustom: "",
    responsibleTeam: "",
    description: "",
    maxCapacity: "24",
    isSubmitting: false,
    isSuccess: false,
  });

  const selectedType = EVENT_TYPES.find((t) => t.value === form.type)!;
  const isCustomLocation = form.locationPreset === "その他（自由入力）";

  const handleSubmit = async () => {
    if (!form.title && form.type !== "practice") return;
    setForm((f) => ({ ...f, isSubmitting: true }));

    try {
      // timeStart と timeEnd を合体させて time を作る ("09:00-12:00")
      let combinedTime = "";
      if (form.type !== "deadline") {
        combinedTime = `${form.timeStart}-${form.timeEnd}`;
      }

      const capacity = parseInt(form.maxCapacity, 10) || 24;
      const eventId = await createEvent({
        title: form.title || (form.type === "practice" ? "練習" : "イベント"),
        type: form.type as any,
        date: form.date,
        time: combinedTime,
        location: isCustomLocation ? form.locationCustom : form.locationPreset,
        description: form.description,
        responsibleTeam: form.responsibleTeam,
        maxCapacity: capacity,
        dutyMembers: [],
      });

      if (form.type === "practice") {
        await initBookingConfig(eventId, { maxCapacity: capacity });
      }

      setForm((f) => ({ ...f, isSubmitting: false, isSuccess: true }));
      setTimeout(() => {
        onClose();
        setForm((f) => ({ ...f, isSuccess: false }));
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました。保存できませんでした。");
      setForm((f) => ({ ...f, isSubmitting: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-slide-up">
        {/* 成功オーバーレイ */}
        {form.isSuccess && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white rounded-3xl">
            <div className="text-7xl mb-4 animate-bounce">✅</div>
            <p className="text-lg font-black text-ag-gray-800">予定を追加しました！</p>
          </div>
        )}

        {/* ヘッダー */}
        <div className={`px-6 pt-6 pb-5 bg-gradient-to-br ${selectedType.selectedBg} text-white rounded-t-3xl sm:rounded-t-3xl`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <span className="text-2xl">{selectedType.icon}</span>
              予定を追加
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* 種別選択 */}
          <div className="grid grid-cols-4 gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setForm({ ...form, type: t.value })}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all
                  ${form.type === t.value
                    ? "bg-white border-white text-ag-gray-800 shadow-lg scale-105"
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-[9px] font-black truncate w-full text-center px-1">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* フォーム本体 */}
        <div className="px-6 py-6 space-y-5">
          {/* タイトル */}
          <div>
            <label className="text-[10px] font-black text-ag-gray-500 uppercase tracking-widest block mb-2">
              タイトル
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={
                form.type === "practice"
                  ? "例: 水曜練習（任意）"
                  : form.type === "match"
                  ? "例: 2部春季大会"
                  : form.type === "event"
                  ? "例: 歓迎モーニング会"
                  : "例: 春季大会 申込み締切"
              }
              className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 focus:border-transparent outline-none transition-all placeholder:text-ag-gray-300"
            />
          </div>

          {/* 日付 */}
          <div>
            <label className="text-[10px] font-black text-ag-gray-500 uppercase tracking-widest block mb-2">
              日付
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none transition-all"
            />
          </div>

          {/* 時間（申込み締切タイプ以外） */}
          {form.type !== "deadline" && (
            <div>
              <label className="text-[10px] font-black text-ag-gray-500 uppercase tracking-widest block mb-2">
                時間
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={form.timeStart}
                  onChange={(e) => setForm({ ...form, timeStart: e.target.value })}
                  className="flex-1 bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none"
                />
                <span className="text-ag-gray-300 font-bold">〜</span>
                <input
                  type="time"
                  value={form.timeEnd}
                  onChange={(e) => setForm({ ...form, timeEnd: e.target.value })}
                  className="flex-1 bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none"
                />
              </div>
            </div>
          )}

          {/* 場所（申込み締切タイプ以外） */}
          {form.type !== "deadline" && (
            <div>
              <label className="text-[10px] font-black text-ag-gray-500 uppercase tracking-widest block mb-2">
                場所
              </label>
              <select
                value={form.locationPreset}
                onChange={(e) => setForm({ ...form, locationPreset: e.target.value, locationCustom: "" })}
                className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none mb-2"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              {isCustomLocation && (
                <input
                  type="text"
                  value={form.locationCustom}
                  onChange={(e) => setForm({ ...form, locationCustom: e.target.value })}
                  placeholder="場所を入力してください"
                  className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none"
                />
              )}
            </div>
          )}

          {/* 担当・主催（練習・試合タイプ） */}
          {(form.type === "practice" || form.type === "match") && (
            <div>
              <label className="text-[10px] font-black text-ag-gray-500 uppercase tracking-widest block mb-2">
                担当（施設取得会）
              </label>
              <input
                type="text"
                value={form.responsibleTeam}
                onChange={(e) => setForm({ ...form, responsibleTeam: e.target.value })}
                placeholder="例: BB、チャリチャリ、トリプルス"
                className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none"
              />
            </div>
          )}

          {/* 定員（練習のみ） */}
          {form.type === "practice" && (
            <div>
              <label className="text-[10px] font-black text-ag-gray-500 uppercase tracking-widest block mb-2">
                定員 <span className="text-ag-gray-300 normal-case">(標準: 24名)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={form.maxCapacity}
                  onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })}
                  min="1"
                  max="50"
                  className="w-28 bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-center font-bold text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none"
                />
                <span className="text-sm text-ag-gray-400">名</span>
                <button
                  onClick={() => setForm({ ...form, maxCapacity: "24" })}
                  className="text-[10px] font-bold text-ag-lime-600 hover:underline"
                >
                  24に戻す
                </button>
              </div>
            </div>
          )}

          {/* 備考 */}
          <div>
            <label className="text-[10px] font-black text-ag-gray-500 uppercase tracking-widest block mb-2">
              備考・詳細
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={
                form.type === "practice"
                  ? "例: ラビットさんから譲ってもらった枠。山口コーチ来訪予定。"
                  : form.type === "match"
                  ? "例: 2部予選会のため通常練習は休み。ユニフォーム着用必須。"
                  : form.type === "event"
                  ? "例: 歓迎会後にモーニング。9:30〜テラス席予約済。"
                  : "例: 〇〇大会の申込みはこちら → https://..."
              }
              rows={4}
              className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSubmit}
            disabled={form.isSubmitting}
            className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg
              bg-gradient-to-r ${selectedType.selectedBg} text-white
              hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2`}
          >
            {form.isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>
                {selectedType.icon} 予定を追加する
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
