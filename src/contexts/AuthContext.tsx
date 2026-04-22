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
import { getUserRole, createPendingUser, type AppRole } from "@/lib/userRoles";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithDummy: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setSessionCookie();
          // Firestoreからロールを取得、未登録なら pending で作成
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
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged が発火してロール取得・cookie設定まで行う
    } catch (error) {
      console.error("ログインエラー:", error);
      throw error;
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

  // 開発・テスト用のダミーログイン
  const loginWithDummy = () => {
    const dummy = {
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
      providerId: "dummy",
    } as unknown as User;
    setUser(dummy);
    setRole("member"); // ダミーは member 扱い
    setSessionCookie();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, loginWithDummy, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
