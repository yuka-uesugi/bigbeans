"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HeroSection() {
  const { signInWithGoogle, user } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    await signInWithGoogle();
    router.push("/dashboard");
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-mesh">
      {/* 装飾：幾何学パーティクル（絵文字不使用） */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[10%] left-[8%] w-24 h-24 rounded-full bg-ag-lime-200/20 animate-float"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute top-[20%] right-[12%] w-16 h-16 rounded-full bg-ag-lime-300/15 animate-float-slow"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-[25%] left-[15%] w-32 h-32 rounded-full bg-ag-lime-100/30 animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-[35%] right-[8%] w-20 h-20 rounded-full bg-ag-lime-200/20 animate-float-slow"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute top-[55%] left-[45%] w-12 h-12 rounded-full bg-ag-lime-400/10 animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        {/* シャトルコック風SVG装飾 */}
        <svg className="absolute top-[12%] right-[25%] w-16 h-16 opacity-[0.07] animate-float-slow" style={{ animationDelay: "0.5s" }} viewBox="0 0 60 60" fill="currentColor">
          <circle cx="30" cy="45" r="8" className="text-ag-gray-900"/>
          <path d="M30 37 L20 10 Q30 5 40 10 Z" className="text-ag-gray-900"/>
        </svg>
        <svg className="absolute bottom-[18%] left-[30%] w-12 h-12 opacity-[0.05] animate-float" style={{ animationDelay: "2.5s" }} viewBox="0 0 60 60" fill="currentColor">
          <circle cx="30" cy="45" r="8" className="text-ag-gray-900"/>
          <path d="M30 37 L20 10 Q30 5 40 10 Z" className="text-ag-gray-900"/>
        </svg>
      </div>

      {/* メインコンテンツ */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* ロゴと設立年補足 */}
        <div className="flex flex-col items-center gap-2 mb-6 animate-scale-in">
          <div className="relative inline-flex flex-col items-center">
            <Image 
              src="/logo-wide.png" 
              alt="Big Beans Logo" 
              width={240} 
              height={80} 
              className="object-contain"
            />

          </div>
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
        <p
          className="text-xl sm:text-2xl text-ag-gray-600 mb-4 animate-fade-in-up font-bold"
          style={{ animationDelay: "150ms" }}
        >
          横浜・都筑区で活動するレディースバドミントンクラブ
        </p>

        {/* 説明文 */}
        <p
          className="text-base sm:text-lg text-ag-gray-400 mb-12 max-w-2xl mx-auto animate-fade-in-up leading-relaxed font-medium"
          style={{ animationDelay: "300ms" }}
        >
          現役の神奈川県代表選手が毎週直接コーチング。
          <br className="hidden sm:block" />
          20代〜60代が元気に活躍する、大人のためのバドミントン・コミュニティです。
        </p>

        {/* CTAボタン */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
          style={{ animationDelay: "450ms" }}
        >
          <button
            onClick={user ? () => router.push("/dashboard") : handleLogin}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-ag-lime-500 text-white rounded-2xl text-lg font-black shadow-lg shadow-ag-lime-500/20 hover:bg-ag-lime-600 hover:scale-[1.02] transition-all active:scale-95"
          >
            <span>{user ? "ダッシュボードへ" : "メンバーログイン"}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/dashboard/calendar?role=visitor")}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-ag-gray-700 border-2 border-ag-gray-200 rounded-2xl text-lg font-black hover:bg-ag-gray-50 hover:border-ag-lime-300 hover:scale-[1.02] transition-all active:scale-95 shadow-sm"
          >
            練習見学・参加予約はこちら
          </button>
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

      {/* ボトムグラデーション */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
