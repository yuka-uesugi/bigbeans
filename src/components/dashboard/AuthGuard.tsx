"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const VISITOR_ALLOWED_PATHS = ["/dashboard", "/dashboard/calendar"];

function AuthGuardContent({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isVisitor = searchParams.get("role") === "visitor" && !user;

  // ログイン済みユーザーの ?role=visitor パラメータを除去
  useEffect(() => {
    if (!loading && user && searchParams.get("role") === "visitor") {
      router.replace(pathname);
    }
  }, [user, loading, searchParams, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-ag-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ビジターモード：許可パスのみ通過
  if (isVisitor) {
    if (VISITOR_ALLOWED_PATHS.includes(pathname)) {
      return <>{children}</>;
    }
    return <MemberOnlyScreen />;
  }

  // 未ログイン（クライアント側二重チェック）
  if (!user) {
    router.replace("/?blocked=member-only");
    return null;
  }

  // 承認待ち
  if (role === "pending") {
    return <PendingApprovalScreen />;
  }

  // member / admin → 通過
  return <>{children}</>;
}

function PendingApprovalScreen() {
  const { logout } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 animate-fade-in">
      <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-4xl mb-6 ring-1 ring-amber-200 shadow-sm">
        ⏳
      </div>
      <h2 className="text-2xl font-black text-ag-gray-900 mb-3 text-center">
        管理者の承認待ちです
      </h2>
      <p className="text-ag-gray-500 text-center max-w-md mb-8 leading-relaxed font-bold">
        アカウント登録が完了しました。管理者がアカウントを承認すると、すべての機能をご利用いただけます。
        <br />
        しばらくお待ちください。
      </p>
      <button
        onClick={logout}
        className="px-6 py-3 bg-white border-2 border-ag-gray-200 text-ag-gray-600 rounded-2xl font-black hover:bg-ag-gray-50 transition-colors"
      >
        ログアウト
      </button>
    </div>
  );
}

function MemberOnlyScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 animate-fade-in">
      <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-4xl mb-6 ring-1 ring-ag-gray-200">
        🔒
      </div>
      <h2 className="text-2xl font-black text-ag-gray-900 mb-3 text-center">
        この機能は会員限定です
      </h2>
      <p className="text-ag-gray-500 text-center max-w-md mb-8 leading-relaxed font-bold">
        チームの活動詳細、会計報告、メンバー名簿などは正会員（またはライト会員）のみ閲覧可能です。
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/dashboard?role=visitor"
          className="flex-1 py-4 bg-ag-lime-500 text-white rounded-2xl font-black text-center hover:bg-ag-lime-600 transition-all shadow-sm"
        >
          次回の練習を見る
        </Link>
        <Link
          href="/"
          className="flex-1 py-4 bg-white text-ag-gray-700 border border-ag-gray-200 rounded-2xl font-black text-center hover:bg-ag-gray-50 transition-all shadow-sm"
        >
          入会案内へ
        </Link>
      </div>
    </div>
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-ag-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthGuardContent>{children}</AuthGuardContent>
    </Suspense>
  );
}
