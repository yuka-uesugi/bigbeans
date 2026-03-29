"use client";

import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";

function VisitorGuardContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();
  const isVisitor = searchParams.get("role") === "visitor" && !user;
  const isCalendar = pathname === "/dashboard/calendar";

  if (isVisitor && !isCalendar) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-ag-gray-50 min-h-[80vh] animate-fade-in">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-4xl mb-6 ring-1 ring-ag-gray-200">
          🔒
        </div>
        <h2 className="text-2xl font-bold text-ag-gray-900 mb-2 text-center">
          この機能は会員限定です
        </h2>
        <p className="text-ag-gray-500 text-center max-w-md mb-8 leading-relaxed">
          チームの活動詳細、会計報告、メンバー名簿などは正会員（またはライト会員）のみ閲覧可能です。
          <br />
          まずは練習に参加して、チームの雰囲気を感じてみませんか？
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Link
            href="/dashboard/calendar?role=visitor"
            className="flex-1 py-4 bg-ag-lime-500 text-white rounded-2xl font-bold text-center hover:bg-ag-lime-600 transition-all shadow-sm"
          >
            練習の予定を見る
          </Link>
          <Link
            href="/"
            className="flex-1 py-4 bg-white text-ag-gray-700 border border-ag-gray-200 rounded-2xl font-bold text-center hover:bg-ag-gray-50 transition-all shadow-sm"
          >
            ログイン・トップへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function VisitorGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <VisitorGuardContent>{children}</VisitorGuardContent>
    </Suspense>
  );
}
