"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

function HeroContent() {
  const { signInWithGoogle, user, role } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBlocked = searchParams.get("blocked") === "member-only";

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      // signInWithGoogle 内でエラーログ済み
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-mesh">
      {/* 装飾：幾何学パーティクル */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[8%] w-24 h-24 rounded-full bg-ag-lime-200/20 animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-[20%] right-[12%] w-16 h-16 rounded-full bg-ag-lime-300/15 animate-float-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-[25%] left-[15%] w-32 h-32 rounded-full bg-ag-lime-100/30 animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[35%] right-[8%] w-20 h-20 rounded-full bg-ag-lime-200/20 animate-float-slow" style={{ animationDelay: "3s" }} />
        <div className="absolute top-[55%] left-[45%] w-12 h-12 rounded-full bg-ag-lime-400/10 animate-float" style={{ animationDelay: "1.5s" }} />
        <svg className="absolute top-[12%] right-[25%] w-16 h-16 opacity-[0.07] animate-float-slow" style={{ animationDelay: "0.5s" }} viewBox="0 0 60 60" fill="currentColor">
          <circle cx="30" cy="45" r="8" className="text-ag-gray-900"/>
          <path d="M30 37 L20 10 Q30 5 40 10 Z" className="text-ag-gray-900"/>
        </svg>
        <svg className="absolute bottom-[18%] left-[30%] w-12 h-12 opacity-[0.05] animate-float" style={{ animationDelay: "2.5s" }} viewBox="0 0 60 60" fill="currentColor">
          <circle cx="30" cy="45" r="8" className="text-ag-gray-900"/>
          <path d="M30 37 L20 10 Q30 5 40 10 Z" className="text-ag-gray-900"/>
        </svg>
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto w-full">

        {/* 会員限定ページへのアクセスブロック時のバナー */}
        {isBlocked && (
          <div className="mb-8 bg-amber-50 border-2 border-amber-300 rounded-2xl px-6 py-4 animate-fade-in-up text-left shadow-sm max-w-xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🔒</span>
              <div>
                <p className="font-black text-amber-900 text-base leading-snug">
                  この機能はビッグビーンズ正会員限定です。
                </p>
                <p className="text-amber-700 font-bold text-sm mt-1 leading-relaxed">
                  ぜひ入会をご検討ください！月3,000円の固定費で毎週コーチ直接指導が受けられます。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ロゴ */}
        <div className="flex flex-col items-center gap-2 mb-6 animate-scale-in">
          <Image src="/logo-wide.png" alt="Big Beans Logo" width={240} height={80} className="object-contain" />
        </div>

        {/* メインタイトル */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-ag-gray-900 mb-6 animate-fade-in-up leading-snug tracking-tighter">
          <span className="bg-gradient-to-r from-ag-lime-600 via-ag-lime-500 to-ag-lime-400 bg-clip-text text-transparent">
            ようこそ
          </span>
          <br className="hidden sm:block" />
          <span className="text-4xl sm:text-5xl md:text-6xl ml-0 sm:ml-4 text-ag-gray-800">
            ビッグビーンズへ
          </span>
        </h1>

        {/* サブコピー */}
        <p className="text-xl sm:text-2xl text-ag-gray-600 mb-4 animate-fade-in-up font-bold" style={{ animationDelay: "150ms" }}>
          横浜・都筑区で活動するレディースバドミントンクラブ
        </p>

        <p className="text-base sm:text-lg text-ag-gray-400 mb-12 max-w-2xl mx-auto animate-fade-in-up leading-relaxed font-medium" style={{ animationDelay: "300ms" }}>
          現役の神奈川県代表選手が毎週直接コーチング。
          <br className="hidden sm:block" />
          20代〜60代が元気に活躍する、大人のためのバドミントン・コミュニティです。
        </p>

        {/* CTAボタン：2入り口を明確に分離 */}
        <div className="animate-fade-in-up max-w-2xl mx-auto" style={{ animationDelay: "450ms" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* 入り口①：メンバーログイン */}
            <div className="bg-white/80 backdrop-blur-sm border-2 border-ag-lime-200 rounded-3xl p-6 text-left shadow-sm hover:shadow-md hover:border-ag-lime-400 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-ag-lime-600 bg-ag-lime-100 px-2 py-0.5 rounded-md uppercase tracking-widest">Member</span>
              </div>
              <h3 className="text-lg font-black text-ag-gray-900 mb-1">正会員・ライト会員</h3>
              <p className="text-xs font-bold text-ag-gray-400 mb-4 leading-relaxed">
                Googleアカウントでログインしてダッシュボードへ
              </p>
              <button
                onClick={user && role !== "pending" ? () => router.push("/dashboard") : handleLogin}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-ag-lime-500 text-white rounded-2xl font-black shadow-md shadow-ag-lime-500/20 hover:bg-ag-lime-600 hover:scale-[1.02] transition-all active:scale-95 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                </svg>
                {user && role !== "pending" ? "ダッシュボードへ" : "Googleでログイン"}
              </button>
            </div>

            {/* 入り口②：ビジター向け */}
            <div className="bg-white/80 backdrop-blur-sm border-2 border-ag-gray-200 rounded-3xl p-6 text-left shadow-sm hover:shadow-md hover:border-ag-gray-300 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-ag-gray-500 bg-ag-gray-100 px-2 py-0.5 rounded-md uppercase tracking-widest">Visitor</span>
              </div>
              <h3 className="text-lg font-black text-ag-gray-900 mb-1">見学・体験参加</h3>
              <p className="text-xs font-bold text-ag-gray-400 mb-4 leading-relaxed">
                ログイン不要。練習日程の確認・参加予約ができます
              </p>
              <button
                onClick={() => router.push("/dashboard/calendar?role=visitor")}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-ag-gray-700 border-2 border-ag-gray-200 rounded-2xl font-black hover:bg-ag-gray-50 hover:border-ag-lime-300 hover:scale-[1.02] transition-all active:scale-95 text-sm"
              >
                練習日程・参加予約を見る
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>

          </div>
        </div>

        {/* スクロール誘導 */}
        <div className="mt-16 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <div className="flex flex-col items-center gap-2 text-ag-gray-300">
            <span className="text-xs font-bold uppercase tracking-[0.3em]">Scroll</span>
            <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}

export default function HeroSection() {
  return (
    <Suspense fallback={
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-mesh" />
    }>
      <HeroContent />
    </Suspense>
  );
}
