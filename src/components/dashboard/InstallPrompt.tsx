"use client";

import { useEffect, useState } from "react";

/**
 * アプリ化（ホーム画面に追加）への誘導バナー
 *
 * - Android / Chrome：ブラウザの「インストール」機能を直接呼び出します。
 * - iPhone / Safari：手動手順（共有ボタン → ホーム画面に追加）を案内します。
 * - すでにアプリとして開いている場合や、ユーザーが「あとで」を押した場合は表示しません。
 */

// 「あとで」を押したあと、再表示しない期間（日）
const SNOOZE_DAYS = 14;
const SNOOZE_KEY = "bb-install-snooze";

// beforeinstallprompt イベントの型（標準の型定義に含まれないため自前で定義）
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // すでにアプリ（スタンドアロン）として開いているなら何もしない
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari 独自プロパティ
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (isStandalone) return;

    // 「あとで」を押してからの期間チェック
    const snoozedAt = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (snoozedAt && Date.now() - snoozedAt < SNOOZE_DAYS * 86400000) return;

    // iOS（iPhone / iPad）判定
    const ua = window.navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) ||
      // iPadOS は Mac を名乗るためタッチ対応で補完
      (ua.includes("macintosh") && "ontouchend" in document);
    setIsIOS(ios);

    if (ios) {
      // iOS は beforeinstallprompt が来ないので、そのまま案内バナーを表示
      setVisible(true);
      return;
    }

    // Android / Chrome：インストール可能になったタイミングで表示
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // インストール完了したらバナーを消す
    const installedHandler = () => setVisible(false);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setVisible(false);
    setShowIOSGuide(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      // iOS は自動インストールできないため手順を表示
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    if (choice.outcome === "dismissed") snooze();
  };

  if (!visible) return null;

  return (
    <>
      {/* === 誘導バナー（画面下に固定） === */}
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:bottom-6 sm:right-6 sm:left-auto sm:px-0 sm:pb-0 pointer-events-none">
        <div className="pointer-events-auto mx-auto w-full max-w-md animate-fade-in-up rounded-3xl border border-ag-lime-200 bg-white/90 p-4 shadow-lg backdrop-blur-md sm:w-96">
          <div className="flex items-start gap-3">
            {/* アプリアイコン */}
            <div className="shrink-0 overflow-hidden rounded-2xl border border-ag-lime-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png"
                alt="Big Beans"
                className="h-12 w-12 object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ag-gray-800">
                アプリにしませんか？
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ag-gray-500">
                ホーム画面に追加すると、アイコンから1タップで開けて、毎回ログインせずサクサク使えます。
              </p>
            </div>

            {/* 閉じる（×） */}
            <button
              onClick={snooze}
              aria-label="閉じる"
              className="shrink-0 rounded-full p-1.5 text-ag-gray-400 transition-colors hover:bg-ag-gray-100 hover:text-ag-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-ag-lime-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-ag-lime-600 hover:shadow-lg active:bg-ag-lime-700"
            >
              {isIOS ? "追加のしかたを見る" : "アプリとして追加"}
            </button>
            <button
              onClick={snooze}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-ag-gray-500 transition-colors hover:bg-ag-gray-100"
            >
              あとで
            </button>
          </div>
        </div>
      </div>

      {/* === iOS向け：手順の案内オーバーレイ === */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-md animate-scale-in rounded-3xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png"
                alt="Big Beans"
                className="h-11 w-11 rounded-xl border border-ag-lime-200"
              />
              <div>
                <p className="text-base font-bold text-ag-gray-800">
                  ホーム画面に追加する手順
                </p>
                <p className="text-xs text-ag-gray-500">iPhone / iPad の場合</p>
              </div>
            </div>

            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ag-lime-100 text-xs font-bold text-ag-lime-700">
                  1
                </span>
                <p className="text-sm leading-relaxed text-ag-gray-700">
                  画面下（Safari）の
                  <span className="mx-1 inline-flex translate-y-0.5 items-center">
                    {/* 共有アイコン */}
                    <svg
                      className="h-5 w-5 text-ag-lime-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v12m0-12L8 8m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
                      />
                    </svg>
                  </span>
                  「共有」ボタンをタップします。
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ag-lime-100 text-xs font-bold text-ag-lime-700">
                  2
                </span>
                <p className="text-sm leading-relaxed text-ag-gray-700">
                  メニューを下にスクロールし、
                  <span className="font-semibold text-ag-gray-800">
                    「ホーム画面に追加」
                  </span>
                  を選びます。
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ag-lime-100 text-xs font-bold text-ag-lime-700">
                  3
                </span>
                <p className="text-sm leading-relaxed text-ag-gray-700">
                  右上の
                  <span className="font-semibold text-ag-gray-800">「追加」</span>
                  をタップすれば完了です。
                </p>
              </li>
            </ol>

            <button
              onClick={snooze}
              className="mt-5 w-full rounded-xl bg-ag-lime-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-ag-lime-600 active:bg-ag-lime-700"
            >
              わかりました
            </button>
          </div>
        </div>
      )}
    </>
  );
}
