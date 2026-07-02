import type { NextConfig } from "next";

// ログイン処理（Firebase 認証）を行う本来の住所
const FIREBASE_AUTH_HOST = "team-management-service.firebaseapp.com";

const nextConfig: NextConfig = {
  // iPhone対策：ログイン処理をアプリと「同じ住所」で行うための転送設定。
  //   bigbeans.vercel.app/__/auth/...  →  firebaseapp.com/__/auth/...
  // これにより「別々の住所どうしのログイン受け渡し」が無くなり、
  // iPhone（Safari/Chrome）のプライバシー制限でログインが失敗する問題を防ぐ。
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${FIREBASE_AUTH_HOST}/__/auth/:path*`,
      },
      {
        source: "/__/firebase/:path*",
        destination: `https://${FIREBASE_AUTH_HOST}/__/firebase/:path*`,
      },
    ];
  },
};

export default nextConfig;
