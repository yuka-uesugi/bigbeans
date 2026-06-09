"use client";

import { useState, useEffect } from "react";
import {
  subscribeToUsers,
  approveUser,
  setAdminRole,
  setSupporterRole,
  revokeSupporterRole,
  rejectUser,
  reinstateUser,
  bulkApproveByMemberEmails,
  type UserRecord,
  type AppRole,
} from "@/lib/userRoles";
import { useAuth } from "@/contexts/AuthContext";
import { getAllMembers } from "@/lib/members";

const ROLE_STYLES: Record<AppRole, { badge: string; label: string }> = {
  admin:     { badge: "bg-red-100 text-red-700 border border-red-200",         label: "管理者" },
  supporter: { badge: "bg-sky-100 text-sky-700 border border-sky-200",         label: "サポーター" },
  member:    { badge: "bg-ag-lime-100 text-ag-lime-700 border border-ag-lime-200", label: "メンバー" },
  pending:   { badge: "bg-amber-100 text-amber-700 border border-amber-200",   label: "承認待ち" },
  rejected:  { badge: "bg-ag-gray-100 text-ag-gray-400 border border-ag-gray-200", label: "却下済み" },
};

export default function UserApprovalPanel() {
  const { role: myRole } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    return subscribeToUsers(setUsers);
  }, []);

  if (myRole !== "admin") return null;

  const pendingUsers  = users.filter((u) => u.role === "pending");
  const rejectedUsers = users.filter((u) => u.role === "rejected");
  const otherUsers    = users.filter((u) => u.role !== "pending" && u.role !== "rejected");

  const handle = async (uid: string, action: "approve" | "admin" | "supporter" | "revoke_supporter" | "reject" | "reinstate") => {
    setProcessing(uid);
    try {
      if (action === "approve") await approveUser(uid);
      else if (action === "admin") await setAdminRole(uid);
      else if (action === "supporter") await setSupporterRole(uid);
      else if (action === "revoke_supporter") await revokeSupporterRole(uid);
      else if (action === "reject") await rejectUser(uid);
      else if (action === "reinstate") await reinstateUser(uid);
    } catch {
      alert("更新に失敗しました");
    } finally {
      setProcessing(null);
    }
  };

  // 名簿に登録済みのメールアドレスと一致する「承認待ち」ユーザーをまとめて承認する
  const handleBulkApprove = async () => {
    if (bulkProcessing) return;
    const ok = window.confirm(
      "名簿（メンバー一覧）に登録されているメールアドレスと一致する「承認待ち」の人を、まとめて承認します。よろしいですか？"
    );
    if (!ok) return;

    setBulkProcessing(true);
    try {
      const members = await getAllMembers();
      const memberEmails = members
        .map((m) => m.email)
        .filter((e): e is string => !!e && e.trim() !== "");

      if (memberEmails.length === 0) {
        alert("名簿にメールアドレスが登録されている人がいませんでした。");
        return;
      }

      const count = await bulkApproveByMemberEmails(pendingUsers, memberEmails);
      if (count === 0) {
        alert("名簿のメールアドレスと一致する承認待ちの人はいませんでした。");
      } else {
        alert(`${count}人を承認しました。`);
      }
    } catch {
      alert("一括承認に失敗しました。時間をおいて、もう一度お試しください。");
    } finally {
      setBulkProcessing(false);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <p className="text-xs font-black text-amber-700 uppercase tracking-widest">承認待ち</p>
            <button
              onClick={handleBulkApprove}
              disabled={bulkProcessing}
              className="w-full sm:w-auto px-4 py-2.5 bg-ag-lime-500 hover:bg-ag-lime-600 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            >
              {bulkProcessing ? "処理中..." : "名簿のメールと一致する人をまとめて承認"}
            </button>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div key={u.uid} className="flex items-center justify-between gap-4 bg-white rounded-2xl px-5 py-4 border border-amber-200 shadow-sm">
                <div className="min-w-0">
                  <p className="font-black text-ag-gray-900 truncate">{u.displayName}</p>
                  <p className="text-xs font-bold text-ag-gray-400 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handle(u.uid, "reject")}
                    disabled={processing === u.uid}
                    className="px-4 py-2 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-sm font-black rounded-xl transition-colors disabled:opacity-50"
                  >
                    却下する
                  </button>
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

      {/* 却下済みユーザー */}
      {rejectedUsers.length > 0 && (
        <div className="px-8 py-5 border-t border-ag-gray-100 bg-ag-gray-50/40">
          <p className="text-xs font-black text-ag-gray-400 uppercase tracking-widest mb-3">却下済み</p>
          <div className="space-y-2">
            {rejectedUsers.map((u) => (
              <div key={u.uid} className="flex items-center justify-between gap-4 bg-white rounded-2xl px-5 py-3 border border-ag-gray-100 opacity-60">
                <div className="min-w-0">
                  <p className="font-black text-ag-gray-500 truncate text-sm line-through">{u.displayName}</p>
                  <p className="text-xs font-bold text-ag-gray-300 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-ag-gray-100 text-ag-gray-400 border border-ag-gray-200">却下済み</span>
                  <button
                    onClick={() => handle(u.uid, "reinstate")}
                    disabled={processing === u.uid}
                    className="text-[11px] font-black text-ag-gray-400 hover:text-ag-lime-600 bg-white hover:bg-ag-lime-50 border border-ag-gray-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    承認待ちに戻す
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
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${style.badge}`}>
                      {style.label}
                    </span>
                    {u.role === "member" && (
                      <>
                        <button
                          onClick={() => handle(u.uid, "supporter")}
                          disabled={processing === u.uid}
                          className="text-[11px] font-black text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          サポーター付与
                        </button>
                        <button
                          onClick={() => handle(u.uid, "admin")}
                          disabled={processing === u.uid}
                          className="text-[11px] font-black text-ag-gray-400 hover:text-red-600 bg-white hover:bg-red-50 border border-ag-gray-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          管理者に昇格
                        </button>
                      </>
                    )}
                    {u.role === "supporter" && (
                      <button
                        onClick={() => handle(u.uid, "revoke_supporter")}
                        disabled={processing === u.uid}
                        className="text-[11px] font-black text-ag-gray-400 hover:text-amber-700 bg-white hover:bg-amber-50 border border-ag-gray-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        権限を解除
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
