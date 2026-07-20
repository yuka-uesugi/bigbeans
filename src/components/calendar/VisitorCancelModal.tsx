"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// ─────────────────────────────────────────────
// ビジター本人が申し込みを取り消すためのモーダル
//
// 未ログインのビジターは予約データを直接書き換えられない（権限がない）ため、
// 入力されたメールアドレスをサーバー(/api/visitor-cancel)へ送り、
// 申し込み時の連絡先と一致したときだけサーバー側で取り消してもらう。
// ─────────────────────────────────────────────

interface VisitorCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  /** 取り消しが成功したときに呼ばれる（一覧の再読み込みなどに使う） */
  onCancelled?: () => void;
}

export default function VisitorCancelModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onCancelled,
}: VisitorCancelModalProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [doneMessage, setDoneMessage] = useState("");

  // サーバー側では document が無いため、ブラウザに出てからポータルを使う
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // モーダルを開いている間は後ろのページをスクロールさせない
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // 開き直したときに前回の入力・結果が残らないようにする
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setError("");
      setDoneMessage("");
      setSending(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    if (!confirm(`${eventTitle} の申し込みを取り消します。よろしいですか？`)) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/visitor-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, email: email.trim() }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        cancelledNames?: string[];
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "取り消しに失敗しました。");
        return;
      }
      const names = json.cancelledNames ?? [];
      setDoneMessage(
        names.length > 0
          ? `${names.join("さん・")}さんの申し込みを取り消しました。`
          : "申し込みを取り消しました。"
      );
      onCancelled?.();
    } catch {
      setError("通信に失敗しました。電波の良いところで、もう一度お試しください。");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-10 pb-6 px-4 sm:items-center sm:pt-0">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-ag-gray-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-sm bg-white rounded-[1.5rem] shadow-2xl animate-scale-in flex flex-col max-h-[88vh]">
        <div className="shrink-0 bg-gradient-to-r from-ag-gray-600 to-ag-gray-800 px-6 py-4 text-white rounded-t-[1.5rem]">
          <h2 className="text-lg font-black tracking-tight">申し込みを取り消す</h2>
          <p className="text-white/80 text-xs font-bold mt-0.5">{eventTitle}</p>
        </div>

        {doneMessage ? (
          <div className="p-6 space-y-5">
            <p className="text-base font-black text-ag-gray-700 leading-relaxed">{doneMessage}</p>
            <p className="text-sm font-bold text-ag-gray-500 leading-relaxed">
              またのご参加をお待ちしています。
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-ag-gray-700 text-white font-black text-base rounded-xl hover:bg-ag-gray-800 transition-all"
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <p className="text-sm font-bold text-ag-gray-500 leading-relaxed">
              申し込みのときに入力したメールアドレスを入れてください。
              ご本人の確認ができたら取り消します。
            </p>

            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 text-base font-bold border-2 border-ag-gray-100 rounded-xl focus:border-sky-500 focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-sm font-bold text-red-600 leading-relaxed bg-red-50 border border-red-100 rounded-xl p-3">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-ag-gray-500 font-black text-sm border-2 border-ag-gray-100 rounded-xl hover:bg-ag-gray-50 transition-all"
              >
                やめる
              </button>
              <button
                type="submit"
                disabled={!email.trim() || sending}
                className="flex-[2] py-3 bg-ag-gray-700 text-white font-black text-sm rounded-xl hover:bg-ag-gray-800 shadow-lg disabled:opacity-40 transition-all"
              >
                {sending ? "取り消しています..." : "申し込みを取り消す"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
