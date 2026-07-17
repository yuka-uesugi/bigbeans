"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";
import { archivo } from "./fonts";

function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line|Snapchat|Twitter|MicroMessenger|WebView|wv/.test(ua)
    || (ua.includes("iPhone") && !ua.includes("Safari"));
}

function HeroContent() {
  const { signInWithGoogle, user, role, signingIn, authError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBlocked = searchParams.get("blocked") === "member-only";
  const inApp = typeof window !== "undefined" && isInAppBrowser();

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      // 失敗メッセージは authError に入るので、ここでは何もしない
    }
  };

  return (
    <section className="bb-navy relative min-h-screen flex items-center justify-center overflow-hidden py-16">
      {/* 装飾：横断幕ゆずりの白い楕円リング */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[1300px] max-w-none h-[620px] opacity-[0.10]"
          viewBox="0 0 1300 620"
          fill="none"
          aria-hidden
        >
          <ellipse cx="650" cy="310" rx="620" ry="270" stroke="#ffffff" strokeWidth="3" />
          <ellipse cx="650" cy="310" rx="560" ry="235" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
        {/* シャトル（白線画） */}
        <svg className="absolute top-[14%] right-[9%] w-14 h-14 opacity-20" viewBox="0 0 64 64" fill="none" aria-hidden>
          <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
            <path d="M22 38 L14 12 M32 36 L32 8 M42 38 L50 12 M14 12 Q32 2 50 12" />
          </g>
          <circle cx="32" cy="48" r="9" fill="#a3d02f" />
        </svg>
        <svg className="absolute bottom-[18%] left-[7%] w-11 h-11 opacity-15 rotate-[24deg]" viewBox="0 0 64 64" fill="none" aria-hidden>
          <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
            <path d="M22 38 L14 12 M32 36 L32 8 M42 38 L50 12 M14 12 Q32 2 50 12" />
          </g>
          <circle cx="32" cy="48" r="9" fill="#ffd826" />
        </svg>
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto w-full">

        {/* in-app browser 警告バナー */}
        {inApp && (
          <div className="mb-6 bg-white border-2 border-[#e08a3c] rounded-2xl px-6 py-4 max-w-xl mx-auto animate-fade-in-up text-left">
            <p className="font-black text-[#8a4a12] text-base mb-1">
              ブラウザアプリから開いてください
            </p>
            <p className="text-[#a3611f] font-bold text-sm leading-relaxed">
              LINEやメールのリンクからは Google ログインができません。<br />
              <strong>Safari</strong> または <strong>Chrome</strong> のアドレスバーに<br />
              <span className="font-black text-[#8a4a12]">bigbeans.vercel.app</span> と入力して開いてください。
            </p>
          </div>
        )}

        {/* 会員限定ページへのアクセスブロック時のバナー */}
        {isBlocked && (
          <div className="mb-8 bg-white border-2 border-[#ffd826] rounded-2xl px-6 py-4 animate-fade-in-up text-left shadow-sm max-w-xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-lg bg-[#ffd826] flex items-center justify-center text-xs font-black text-[#16294d]">限定</span>
              <div>
                <p className="font-black text-[#16294d] text-base leading-snug">
                  この機能はビッグビーンズ正会員限定です。
                </p>
                <p className="text-[#3d5384] font-bold text-sm mt-1 leading-relaxed">
                  ぜひ入会をご検討ください！月3,000円の固定費で毎週コーチ直接指導が受けられます。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 英字オーバーライン */}
        <p className={`${archivo.className} text-xs sm:text-sm font-bold text-[#9fb4e8] tracking-[0.35em] mb-5 animate-fade-in-up`}>
          LADIES BADMINTON CLUB — YOKOHAMA
        </p>

        {/* ロゴ */}
        <div className="flex flex-col items-center gap-2 mb-8 animate-scale-in">
          <div className="bg-white px-8 py-4 rounded-2xl shadow-xl">
            <Image src="/logo-wide.png" alt="Big Beans Logo" width={240} height={80} className="object-contain" />
          </div>
        </div>

        {/* メインタイトル */}
        <h1 className="font-black text-white mb-6 animate-fade-in-up tracking-tight">
          <span className="block text-4xl sm:text-5xl md:text-6xl leading-tight">
            ようこそ、
          </span>
          <span className="inline-block text-4xl sm:text-5xl md:text-6xl leading-tight mt-2 underline decoration-[#ffd826] decoration-[6px] underline-offset-[12px]">
            ビッグビーンズへ。
          </span>
        </h1>

        {/* サブコピー */}
        <p className="text-xl sm:text-2xl text-[#dbe4f8] mt-8 mb-4 animate-fade-in-up font-black" style={{ animationDelay: "150ms" }}>
          横浜・都筑区で活動するレディースバドミントンクラブ
        </p>

        <p className="text-base sm:text-lg text-[#9fb4e8] mb-12 max-w-2xl mx-auto animate-fade-in-up leading-relaxed font-bold" style={{ animationDelay: "300ms" }}>
          現役の神奈川県代表選手が毎週直接コーチング。
          <br className="hidden sm:block" />
          20代〜60代が元気に活躍する、大人のためのバドミントン・コミュニティです。
        </p>

        {/* CTAボタン：2入り口を明確に分離 */}
        <div className="animate-fade-in-up max-w-2xl mx-auto" style={{ animationDelay: "450ms" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* 入り口①：メンバーログイン */}
            <div className="bg-white rounded-2xl p-6 text-left shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-black text-[#2c55a8]">会員のかたは、こちら</span>
              </div>
              <h3 className="text-xl font-black text-[#16294d] mb-1">正会員・ライト会員</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 leading-relaxed">
                Googleアカウントでログインしてダッシュボードへ
              </p>
              <button
                onClick={user && role !== "pending" ? () => router.push("/dashboard") : handleLogin}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#2c55a8] text-white rounded-full font-black shadow-md hover:bg-[#234a97] hover:scale-[1.02] transition-all active:scale-95 text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {signingIn ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                    </svg>
                    {user && role !== "pending" ? "ダッシュボードへ" : "Googleでログイン"}
                  </>
                )}
              </button>

              {/* ログイン失敗メッセージ */}
              {authError && (
                <p className="mt-3 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 leading-relaxed">
                  {authError}
                </p>
              )}
            </div>

            {/* 入り口②：ビジター向け */}
            <div className="bg-white rounded-2xl p-6 text-left shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-black text-[#5d8f1f]">はじめてのかたは、こちら</span>
              </div>
              <h3 className="text-xl font-black text-[#16294d] mb-1">ビジター（体験・見学など）</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 leading-relaxed">
                ログイン不要。練習日程の確認・参加予約ができます
              </p>
              <button
                onClick={() => router.push("/dashboard/calendar?role=visitor")}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#ffd826] text-[#16294d] rounded-full font-black shadow-md hover:bg-[#f2ca0e] hover:scale-[1.02] transition-all active:scale-95 text-base"
              >
                練習日程・参加予約を見る
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>

          </div>
        </div>

        {/* スクロール誘導 */}
        <div className="mt-16 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <div className="flex flex-col items-center gap-2 text-[#6d84ba]">
            <span className={`${archivo.className} text-xs font-bold tracking-[0.3em]`}>SCROLL</span>
            <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HeroSection() {
  return (
    <Suspense fallback={
      <section className="bb-navy relative min-h-screen flex items-center justify-center" />
    }>
      <HeroContent />
    </Suspense>
  );
}
