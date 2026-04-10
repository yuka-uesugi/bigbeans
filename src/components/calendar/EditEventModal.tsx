"use client";

import { useState } from "react";
import { updateEvent, deleteEvent } from "@/lib/events";
import type { CalendarEvent } from "./CalendarGrid";

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
  eventDate: string; // "2026-05-27" 形式
  onDeleted?: () => void; // 削除後のコールバック
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

export default function EditEventModal({ isOpen, onClose, event, eventDate, onDeleted }: EditEventModalProps) {
  // 時間を分割
  const timeParts = event.time?.split("-") || ["09:00", "12:00"];
  const timeStart = timeParts[0]?.trim() || "09:00";
  const timeEnd = timeParts[1]?.trim() || "12:00";

  // 場所がプリセットにあるか判定
  const isPreset = LOCATIONS.slice(0, -1).includes(event.location || "");

  const [form, setForm] = useState({
    type: (event.type || "practice") as string,
    title: event.title || "",
    date: eventDate,
    timeStart,
    timeEnd,
    locationPreset: isPreset ? (event.location || "仲町台") : "その他（自由入力）",
    locationCustom: isPreset ? "" : (event.location || ""),
    description: (event as any).description || "",
    maxCapacity: String(event.total || 24),
    responsibleTeam: (event as any).responsibleTeam || "",
    isSubmitting: false,
    isDeleting: false,
    isSuccess: false,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedType = EVENT_TYPES.find((t) => t.value === form.type) || EVENT_TYPES[0];
  const isCustomLocation = form.locationPreset === "その他（自由入力）";

  const handleSave = async () => {
    setForm((f) => ({ ...f, isSubmitting: true }));

    try {
      const location = isCustomLocation ? form.locationCustom : form.locationPreset;
      const title = form.title || `水曜練習 (${location})`;

      const eventType = form.type as "practice" | "match" | "event";
      const time = form.type === "deadline" ? "終日" : `${form.timeStart}-${form.timeEnd}`;
      const eventLocation = form.type === "deadline" ? "-" : location;

      await updateEvent(String(event.id), {
        title,
        type: eventType,
        date: form.date,
        time,
        location: eventLocation,
        description: form.description,
        responsibleTeam: form.responsibleTeam,
        maxCapacity: parseInt(form.maxCapacity) || 24,
      });

      setForm((f) => ({ ...f, isSubmitting: false, isSuccess: true }));
      setTimeout(() => {
        onClose();
        setForm((f) => ({ ...f, isSuccess: false }));
      }, 1200);
    } catch (err) {
      console.error("イベント更新エラー:", err);
      alert("予定の更新に失敗しました。");
      setForm((f) => ({ ...f, isSubmitting: false }));
    }
  };

  const handleDelete = async () => {
    setForm((f) => ({ ...f, isDeleting: true }));

    try {
      await deleteEvent(String(event.id));
      alert("予定を削除しました。");
      onClose();
      onDeleted?.();
    } catch (err) {
      console.error("イベント削除エラー:", err);
      alert("予定の削除に失敗しました。");
      setForm((f) => ({ ...f, isDeleting: false }));
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
            <p className="text-lg font-black text-ag-gray-800">予定を更新しました！</p>
          </div>
        )}

        {/* ヘッダー */}
        <div className={`px-6 pt-6 pb-5 bg-gradient-to-br ${selectedType.selectedBg} text-white rounded-t-3xl sm:rounded-t-3xl`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <span className="text-2xl">{selectedType.icon}</span>
              予定を編集
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
              placeholder="例: 水曜練習"
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

          {/* 時間 */}
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

          {/* 場所 */}
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

          {/* 担当 */}
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

          {/* 定員 */}
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
              placeholder="備考を入力..."
              rows={3}
              className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            disabled={form.isSubmitting || form.isDeleting}
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
              <>変更を保存する</>
            )}
          </button>

          {/* 削除セクション */}
          <div className="pt-4 border-t border-ag-gray-100">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 text-sm font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
              >
                この予定を削除する
              </button>
            ) : (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-black text-red-700 text-center">
                  本当にこの予定を削除しますか？
                </p>
                <p className="text-[10px] text-red-500 text-center">
                  出欠データやビジター登録も削除されます。この操作は取り消せません。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 bg-white border-2 border-ag-gray-200 text-ag-gray-600 font-black text-sm rounded-xl hover:bg-ag-gray-50 transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={form.isDeleting}
                    className="flex-1 py-3 bg-red-500 text-white font-black text-sm rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {form.isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        削除中...
                      </>
                    ) : (
                      "削除する"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
