"use client";

import { useState, useEffect } from "react";
import {
  subscribeToUsers,
  approveUser,
  setAdminRole,
  type UserRecord,
  type AppRole,
} from "@/lib/userRoles";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_STYLES: Record<AppRole, { badge: string; label: string }> = {
  admin:   { badge: "bg-red-100 text-red-700 border border-red-200",    label: "管理者" },
  member:  { badge: "bg-ag-lime-100 text-ag-lime-700 border border-ag-lime-200", label: "メンバー" },
  pending: { badge: "bg-amber-100 text-amber-700 border border-amber-200", label: "承認待ち" },
};

export default function UserApprovalPanel() {
  const { role: myRole } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToUsers(setUsers);
  }, []);

  if (myRole !== "admin") return null;

  const pendingUsers = users.filter((u) => u.role === "pending");
  const otherUsers = users.filter((u) => u.role !== "pending");

  const handle = async (uid: string, action: "approve" | "admin") => {
    setProcessing(uid);
    try {
      if (action === "approve") await approveUser(uid);
      else await setAdminRole(uid);
    } catch {
      alert("更新に失敗しました");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border-2 border-ag-gray-200 shadow-xl overflow-hidden">
      <div className="px-8 py-6 bg-gradient-to-r from-red-50 to-white border-b-2 border-ag-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-black text-ag-gray-900 text-xl flex items-center gap-3">
            ユーザー管理
            {pendingUsers.length > 0 && (
              <span className="text-sm font-black bg-red-500 text-white rounded-full px-2.5 py-0.5 shadow-sm">
                {pendingUsers.length}件 承認待ち
              </span>
            )}
          </h3>
          <p className="text-sm font-bold text-ag-gray-400 mt-1">
            Googleログインしたユーザーの承認・権限管理（管理者のみ表示）
          </p>
        </div>
      </div>

      {/* 承認待ちユーザー */}
      {pendingUsers.length > 0 && (
        <div className="px-8 py-5 border-b border-ag-gray-100 bg-amber-50/40">
          <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">承認待ち</p>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div key={u.uid} className="flex items-center justify-between gap-4 bg-white rounded-2xl px-5 py-4 border border-amber-200 shadow-sm">
                <div className="min-w-0">
                  <p className="font-black text-ag-gray-900 truncate">{u.displayName}</p>
                  <p className="text-xs font-bold text-ag-gray-400 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handle(u.uid, "approve")}
                    disabled={processing === u.uid}
                    className="px-4 py-2 bg-ag-lime-500 hover:bg-ag-lime-600 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {processing === u.uid ? "処理中..." : "承認する"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 承認済みユーザー一覧 */}
      <div className="px-8 py-5">
        <p className="text-xs font-black text-ag-gray-400 uppercase tracking-widest mb-3">登録済みユーザー</p>
        {otherUsers.length === 0 ? (
          <p className="text-sm font-bold text-ag-gray-400 py-4 text-center">登録済みユーザーはいません</p>
        ) : (
          <div className="space-y-2">
            {otherUsers.map((u) => {
              const style = ROLE_STYLES[u.role];
              return (
                <div key={u.uid} className="flex items-center justify-between gap-4 bg-ag-gray-50/50 rounded-2xl px-5 py-3 border border-ag-gray-100">
                  <div className="min-w-0 flex items-center gap-3">
                    <div>
                      <p className="font-black text-ag-gray-900 truncate text-sm">{u.displayName}</p>
                      <p className="text-xs font-bold text-ag-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${style.badge}`}>
                      {style.label}
                    </span>
                    {u.role === "member" && (
                      <button
                        onClick={() => handle(u.uid, "admin")}
                        disabled={processing === u.uid}
                        className="text-[11px] font-black text-ag-gray-400 hover:text-red-600 bg-white hover:bg-red-50 border border-ag-gray-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        管理者に昇格
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
