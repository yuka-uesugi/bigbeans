"use client";

import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const { signInWithGoogle, user } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    await signInWithGoogle();
    router.push("/dashboard");
  };

  // 既にログインしている場合はボタンを変更等も可能ですが、
  // ここではシンプルにクリック時の動作のみを追加します。

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-mesh">
      {/* 装飾：浮遊するシャトルコック風パーティクル */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 円形パーティクル */}
        <div
          className="absolute top-[15%] left-[10%] w-20 h-20 rounded-full bg-ag-lime-200/30 animate-float"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute top-[25%] right-[15%] w-14 h-14 rounded-full bg-ag-lime-300/20 animate-float-slow"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-[20%] left-[20%] w-24 h-24 rounded-full bg-ag-lime-100/40 animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-[30%] right-[10%] w-16 h-16 rounded-full bg-ag-lime-200/25 animate-float-slow"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute top-[60%] left-[50%] w-10 h-10 rounded-full bg-ag-lime-400/15 animate-float"
          style={{ animationDelay: "1.5s" }}
        />

        {/* シャトルコック形の装飾 */}
        <div
          className="absolute top-[10%] right-[30%] text-6xl opacity-10 animate-float-slow"
          style={{ animationDelay: "0.5s" }}
        >
          🏸
        </div>
        <div
          className="absolute bottom-[15%] left-[35%] text-4xl opacity-8 animate-float"
          style={{ animationDelay: "2.5s" }}
        >
          🏸
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* ロゴバッジ */}
        <div className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 rounded-full bg-ag-lime-100/80 border border-ag-lime-300/30 animate-scale-in backdrop-blur-sm">
          <span className="text-lg">🏸</span>
          <span className="text-sm font-semibold text-ag-lime-700 tracking-wide">
            バドミントンチーム運営OS
          </span>
        </div>

        {/* メインタイトル */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-ag-gray-900 mb-6 animate-fade-in-up leading-tight tracking-tight">
          <span className="bg-gradient-to-r from-ag-lime-500 via-ag-lime-400 to-ag-lime-600 bg-clip-text text-transparent">
            Anti-Gravity
          </span>
        </h1>

        {/* サブタイトル */}
        <p
          className="text-xl sm:text-2xl text-ag-gray-600 mb-4 animate-fade-in-up font-light"
          style={{ animationDelay: "150ms" }}
        >
          運営の重さを、ゼロにする。
        </p>

        {/* 説明文 */}
        <p
          className="text-base sm:text-lg text-ag-gray-400 mb-10 max-w-2xl mx-auto animate-fade-in-up leading-relaxed"
          style={{ animationDelay: "300ms" }}
        >
          AIが出欠管理・会計・在庫・コミュニケーションを
          <br className="hidden sm:block" />
          自律的にサポート。チーム運営がもっと軽やかに。
        </p>

        {/* CTAボタン */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
          style={{ animationDelay: "450ms" }}
        >
          <Button size="lg" variant="primary" onClick={handleLogin}>
            <span>{user ? "ダッシュボードへ" : "Googleでログイン"}</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => router.push("/dashboard/calendar?role=visitor")}
          >
            ビジターとして閲覧
          </Button>
        </div>
      </div>

      {/* ボトムグラデーション */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
