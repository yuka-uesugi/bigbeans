import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 本番アプリの住所（この住所でアクセスされたら、ログイン処理も同じ住所で行う）
const PRODUCTION_HOST = "bigbeans.vercel.app";

// ログイン処理を行う住所（authDomain）を決める。
// iPhone対策：本番ドメインからアクセスされている時は、アプリと同じ住所を使う。
// （そうしないと、別々の住所どうしのログイン受け渡しをiPhoneがブロックしてしまう）
// それ以外（ローカル開発・プレビュー等）は、これまで通り .env.local の値を使う。
function resolveAuthDomain(): string | undefined {
  if (typeof window !== "undefined" && window.location.hostname === PRODUCTION_HOST) {
    return PRODUCTION_HOST;
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
}

// Firebaseの設定を環境変数から取得
// （実際のキーは .env.local ファイルで管理します）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Next.js (SSR環境) でFirebaseが何度も初期化されるのを防ぐ
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 各インスタンスをエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
