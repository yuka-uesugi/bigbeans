"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// AuthContextで共有するデータと関数の型定義
interface AuthContextType {
  user: User | null;         // ログインしているユーザー情報（未ログイン時はnull）
  loading: boolean;          // 認証状態の確認中かどうか
  signInWithGoogle: () => Promise<void>; // Googleログイン関数
  loginWithDummy: () => void;            // テスト用のダミーログイン関数
  logout: () => Promise<void>;           // ログアウト関数
}

// コンテキストの作成
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// コンテキストプロバイダーコンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初回マウント時に認証状態を監視開始
  useEffect(() => {
    try {
      // ユーザーのログイン・ログアウト状態が変化した時に発火するリスナー
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false); // 状態の確認が完了したらローディングを解除
      }, (error) => {
        console.error("Auth state observation error:", error);
        setLoading(false); // エラーが起きてもローディングは止める
      });

      // アンマウント時にリスナーを解除
      return () => unsubscribe();
    } catch (error) {
      console.error("Auth initialization failed:", error);
      setLoading(false);
      return () => {};
    }
  }, []);

  // Googleでのログイン処理
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // ポップアップでGoogleログイン画面を表示
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログインエラー:", error);
      // 将来的にToast等でユーザーにエラーを通知
    }
  };

  // ログアウト処理
  const logout = async () => {
    try {
      await signOut(auth);
      // ダミーユーザーのクリアも必要に応じて
      setUser(null);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  // 開発・テスト用のダミーログイン処理
  const loginWithDummy = () => {
    const dummy: User = {
      uid: "dummy-tester-123",
      email: "dummy@bigbeans.local",
      displayName: "テスト太郎 (ダミー)",
      photoURL: "",
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: "",
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => "dummy-token",
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      providerId: "dummy"
    } as User;
    setUser(dummy);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, loginWithDummy, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// コンテキストを使いやすくするためのカスタムフック
export const useAuth = () => useContext(AuthContext);
