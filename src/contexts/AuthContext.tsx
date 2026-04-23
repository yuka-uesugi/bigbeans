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
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
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

  // リダイレクト後の認証結果を処理
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error("Redirect result error:", err);
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
    try {
      if (isInAppBrowser()) {
        // in-app browser ではリダイレクト方式を使用
        await signInWithRedirect(auth, provider);
      } else {
        // 通常ブラウザはポップアップ
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      // ポップアップが失敗した場合もリダイレクトで再試行
      if (error?.code === "auth/popup-blocked" || error?.code === "auth/popup-closed-by-user") {
        await signInWithRedirect(auth, provider);
      } else {
        console.error("ログインエラー:", error);
        throw error;
      }
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
    <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
