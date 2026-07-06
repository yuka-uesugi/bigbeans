"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserRole, createPendingUser, type AppRole } from "@/lib/userRoles";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  /** ログイン処理が進行中かどうか（ボタンの「ログイン中...」表示用） */
  signingIn: boolean;
  /** ログイン失敗時にユーザーへ見せるメッセージ（成功時は null） */
  authError: string | null;
  /** エラーメッセージを消す（ボタンを押し直した時など） */
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

/** Firebaseのエラーコードを、メンバーにも分かる日本語メッセージへ変換する */
function toFriendlyAuthMessage(error: unknown): string {
  const code = (error as { code?: string } | null | undefined)?.code;
  switch (code) {
    case "auth/network-request-failed":
      return "ネットワークに接続できませんでした。電波やWi-Fiの状態を確認して、もう一度お試しください。";
    case "auth/popup-blocked":
      return "ポップアップがブロックされました。別の方法でログインを試みます…";
    case "auth/unauthorized-domain":
      return "このページからはログインできない設定になっています。お手数ですが代表までご連絡ください。";
    case "auth/account-exists-with-different-credential":
      return "このメールアドレスは別の方法で登録済みです。代表までご連絡ください。";
    default:
      return "ログインに失敗しました。少し時間をおいて、もう一度お試しください。";
  }
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function setSessionCookie() {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `bb_session=1; path=/; expires=${expires}; SameSite=Strict`;
}

function clearSessionCookie() {
  document.cookie = "bb_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
}

/** in-app browser（LINE・メール等）かどうかを判定 */
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line|Snapchat|Twitter|MicroMessenger|WebView|wv/.test(ua)
    || (ua.includes("iPhone") && !ua.includes("Safari"));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // リダイレクト後の認証結果を処理（in-app browser からのログイン戻り）
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error("Redirect result error:", err);
      setAuthError(toFriendlyAuthMessage(err));
    });
  }, []);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setSessionCookie();
          let r = await getUserRole(currentUser.uid);
          if (r === null) {
            await createPendingUser(
              currentUser.uid,
              currentUser.email ?? "",
              currentUser.displayName ?? "名無し"
            );
            r = "pending";
          }
          setRole(r);
        } else {
          clearSessionCookie();
          setRole(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Auth state observation error:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Auth initialization failed:", error);
      setLoading(false);
      return () => {};
    }
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setAuthError(null);
    setSigningIn(true);
    try {
      if (isInAppBrowser()) {
        // in-app browser ではリダイレクト方式を使用（このあとページが遷移する）
        await signInWithRedirect(auth, provider);
        return;
      }
      // 通常ブラウザはポップアップ
      await signInWithPopup(auth, provider);
      // 成功：onAuthStateChanged がユーザーと権限を反映する
    } catch (error) {
      const code = (error as { code?: string } | null | undefined)?.code;

      // ユーザーが自分でポップアップを閉じた／連打した場合は、エラー表示せず静かに終了
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }

      // ポップアップがブロックされた時だけ、リダイレクト方式で再試行する
      if (code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error("リダイレクトログインも失敗:", redirectError);
          setAuthError(toFriendlyAuthMessage(redirectError));
          throw redirectError;
        }
      }

      console.error("ログインエラー:", error);
      setAuthError(toFriendlyAuthMessage(error));
      throw error;
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      clearSessionCookie();
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signingIn, authError, clearAuthError, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
