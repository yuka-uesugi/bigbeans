"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { icon: "🏠", label: "ダッシュボード", href: "/dashboard" },
  { icon: "📅", label: "出欠・カレンダー", href: "/dashboard/calendar" },
  { icon: "💰", label: "会計・家計簿", href: "/dashboard/finance" },
  { icon: "🏸", label: "備品・在庫", href: "/dashboard/inventory", badge: "2" },
  { icon: "📝", label: "レポート・議事録", href: "/dashboard/reports" },
  { icon: "📸", label: "共有アルバム", href: "/dashboard/album" },
  { icon: "📊", label: "アンケート", href: "/dashboard/surveys" },
];

const bottomNavItems: NavItem[] = [
  { icon: "👥", label: "メンバー名簿", href: "/dashboard/members" },
  { icon: "📋", label: "規約・チーム情報", href: "/dashboard/rules" },
  { icon: "👤", label: "マイページ", href: "/dashboard/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchParams = useSearchParams();
  const isVisitor = searchParams.get("role") === "visitor";

  const isActive = (href: string) => {
    const targetPath = isVisitor ? `${href}?role=visitor` : href;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isDisabled = isVisitor && item.href !== "/dashboard/calendar";
    const href = isVisitor ? `${item.href}?role=visitor` : item.href;

    return (
      <Link
        href={isDisabled ? "#" : href}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
          setMobileOpen(false);
        }}
        className={`
          group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
          transition-all duration-200 relative
          ${isDisabled ? "opacity-50 cursor-not-allowed grayscale" : "cursor-pointer"}
          ${
            isActive(item.href) && !isDisabled
              ? "bg-ag-lime-100 text-ag-lime-800 shadow-sm"
              : "text-ag-gray-500 hover:bg-ag-gray-100 hover:text-ag-gray-800"
          }
          ${collapsed ? "justify-center px-3" : ""}
        `}
      >
        <span className="text-lg flex-shrink-0">
          {isDisabled ? "🔒" : item.icon}
        </span>
        {!collapsed && (
          <>
            <span className="truncate">
              {item.label}
              {isDisabled && <span className="ml-2 text-[10px] bg-ag-gray-100 text-ag-gray-400 px-1.5 py-0.5 rounded">会員限定</span>}
            </span>
            {item.badge && !isDisabled && (
              <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* モバイルハンバーガー */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-shadow cursor-pointer"
        aria-label="メニューを開く"
      >
        <svg className="w-5 h-5 text-ag-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* モバイルオーバーレイ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* サイドバー本体 */}
      <Suspense fallback={<div className="w-[260px] bg-white border-r border-ag-gray-200" />}>
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40
            flex flex-col bg-white border-r border-ag-gray-200/60
            transition-all duration-300 ease-out
            ${collapsed ? "w-[72px]" : "w-[260px]"}
            ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
        {/* ロゴエリア */}
        <div className={`flex items-center gap-3 px-5 py-5 border-b border-ag-gray-100 ${collapsed ? "justify-center px-3" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ag-lime-400 to-ag-lime-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-sm font-bold">AG</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-bold text-ag-gray-900 truncate">Anti-Gravity</h1>
              <p className="text-[10px] text-ag-gray-400 truncate">チーム運営OS</p>
            </div>
          )}
        </div>

        {/* メインナビ */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className={`text-[10px] font-semibold text-ag-gray-300 uppercase tracking-wider mb-2 ${collapsed ? "text-center" : "px-4"}`}>
            {collapsed ? "•••" : "メインメニュー"}
          </div>
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* ボトムナビ */}
        <div className="px-3 py-4 border-t border-ag-gray-100 space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* ビジター共有用URL (追加) */}
          <div className={`mt-4 mx-1 p-3 bg-ag-lime-50 rounded-xl border border-ag-lime-100 ${collapsed ? "hidden" : "block"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-ag-lime-700 uppercase tracking-wider">ビジター用URL</span>
              <span className="text-[10px] bg-white text-ag-lime-600 px-1.5 py-0.5 rounded border border-ag-lime-200 ml-auto">共有用</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-[10px] text-ag-gray-500 bg-white/50 px-2 py-1 rounded border border-ag-lime-200 flex-1 truncate">
                bigbeans.ag/v/visitor
              </code>
              <button className="p-1.5 bg-white rounded-lg border border-ag-lime-200 text-ag-lime-600 hover:bg-ag-lime-100 transition-colors shadow-sm cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 折りたたみボタン（デスクトップ用） */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center py-3 border-t border-ag-gray-100 text-ag-gray-400 hover:text-ag-gray-600 hover:bg-ag-gray-50 transition-colors cursor-pointer"
          aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </aside>
    </Suspense>
    </>
  );
}
