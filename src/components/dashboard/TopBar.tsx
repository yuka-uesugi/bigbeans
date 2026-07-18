"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useNotificationFeed, relativeTime } from "@/hooks/useNotificationFeed";

export default function TopBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { user, signInWithGoogle, logout } = useAuth();
  const router = useRouter();
  const { items, unreadCount, markAllAsRead } = useNotificationFeed();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // ベルを開いたら「今の時刻」を確定させ、相対時刻表示に使う
  const [nowMs, setNowMs] = useState(0);
  const openNotifications = () => {
    setNowMs(Date.now());
    setShowNotifications((v) => !v);
  };

  const handleItemClick = (link: string) => {
    setShowNotifications(false);
    markAllAsRead();
    router.push(link);
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-ag-gray-200/60 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* 検索バー */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="メンバー、予定、経費を検索..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-700 placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-300 focus:bg-white focus:ring-2 focus:ring-ag-lime-100 transition-all"
          />
        </div>
      </div>

      {/* 右側アクション */}
      <div className="flex items-center gap-2">
        {/* 通知ベル */}
        <div className="relative">
          <button
            onClick={openNotifications}
            className="relative w-10 h-10 rounded-xl hover:bg-ag-gray-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="通知"
          >
            <svg className="w-5 h-5 text-ag-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* 未読がある時だけ赤いバッジ（件数つき） */}
            {user && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* 通知ドロップダウン */}
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="fixed left-3 right-3 top-16 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 bg-white rounded-2xl shadow-lg border border-ag-gray-200/60 overflow-hidden z-50 animate-scale-in">
                <div className="px-4 py-3 border-b border-ag-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ag-gray-800">通知</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-[11px] font-medium text-ag-gray-400 hover:text-ag-gray-600 transition-colors cursor-pointer"
                    >
                      すべて既読
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!user ? (
                    <p className="px-4 py-8 text-center text-xs text-ag-gray-400">
                      ログインすると通知が表示されます
                    </p>
                  ) : items.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-ag-gray-400">
                      通知はまだありません
                    </p>
                  ) : (
                    items.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleItemClick(n.link)}
                        className={`w-full text-left px-4 py-3 hover:bg-ag-gray-50 transition-colors cursor-pointer border-b border-ag-gray-50 flex gap-2.5 ${
                          n.read ? "" : "bg-ag-lime-50/60"
                        }`}
                      >
                        {/* 未読マーカー */}
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            n.read ? "bg-transparent" : "bg-ag-lime-500"
                          }`}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-ag-gray-700 font-medium truncate">
                            {n.title}
                          </span>
                          {n.body && (
                            <span className="block text-xs text-ag-gray-500 mt-0.5 line-clamp-2">
                              {n.body}
                            </span>
                          )}
                          <span className="block text-[11px] text-ag-gray-400 mt-1">
                            {relativeTime(n.createdAt, nowMs)}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 区切り線 */}
        <div className="w-px h-8 bg-ag-gray-200 mx-1" />

        {/* ユーザーアバター / ログインボタン */}
        <div className="relative">
          {user ? (
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-ag-gray-50 transition-colors cursor-pointer"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-ag-gray-200 flex items-center justify-center text-ag-gray-500 text-xs font-bold shadow-sm">
                  {user.displayName?.[0] || "U"}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-ag-gray-800 leading-tight">
                  {user.displayName || "ログイン中"}
                </p>
                <p className="text-[10px] text-ag-gray-400 leading-tight truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>
              <svg className="w-4 h-4 text-ag-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => signInWithGoogle()}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-ag-gray-200 rounded-xl text-sm font-bold text-ag-gray-700 hover:bg-ag-gray-50 hover:border-ag-gray-300 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Googleでログイン</span>
              </button>
            </div>
          )}

          {/* ユーザメニュー */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-lg border border-ag-gray-200/60 overflow-hidden z-50 animate-scale-in py-2">
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/dashboard/profile");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-ag-gray-700 hover:bg-ag-gray-50 transition-colors"
                >
                  マイページ
                </button>
                <div className="border-t border-ag-gray-100 my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  ログアウト
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
