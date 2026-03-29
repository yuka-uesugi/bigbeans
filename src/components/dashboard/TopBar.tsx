"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function TopBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const notifications = [
    { id: 1, text: "シャトルの在庫が残り6本です", time: "10分前", type: "warning" },
    { id: 2, text: "田中さんが3/29の練習に参加表明しました", time: "1時間前", type: "info" },
    { id: 3, text: "佐藤さんが月謝を納入しました", time: "3時間前", type: "success" },
  ];

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
            onClick={() => setShowNotifications(!showNotifications)}
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
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
          </button>

          {/* 通知ドロップダウン */}
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-lg border border-ag-gray-200/60 overflow-hidden z-50 animate-scale-in">
                <div className="px-4 py-3 border-b border-ag-gray-100">
                  <h3 className="text-sm font-semibold text-ag-gray-800">通知</h3>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3 hover:bg-ag-gray-50 transition-colors cursor-pointer border-b border-ag-gray-50">
                      <p className="text-sm text-ag-gray-700">{n.text}</p>
                      <p className="text-[11px] text-ag-gray-400 mt-1">{n.time}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-ag-gray-100">
                  <button className="text-xs font-medium text-ag-lime-600 hover:text-ag-lime-700 transition-colors cursor-pointer">
                    すべての通知を見る →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 区切り線 */}
        <div className="w-px h-8 bg-ag-gray-200 mx-1" />

        {/* ユーザーアバター */}
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-ag-gray-50 transition-colors cursor-pointer"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full shadow-sm" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-ag-gray-200 flex items-center justify-center text-ag-gray-500 text-xs font-bold shadow-sm">
                {user ? (user.displayName?.[0] || "U") : "V"}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-ag-gray-800 leading-tight">
                {user?.displayName || (user ? "ゲストユーザー" : "ビジター")}
              </p>
              <p className="text-[10px] text-ag-gray-400 leading-tight truncate max-w-[120px]">
                {user?.email || "ログインしていません"}
              </p>
            </div>

            <svg className="w-4 h-4 text-ag-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

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
