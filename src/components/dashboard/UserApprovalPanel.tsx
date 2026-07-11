"use client";

import { useState, useEffect, useMemo } from "react";
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

// システム用アカウント（人ではなく、自動処理のためのアカウント）。
// メール・名前が未登録でも、ここに登録された uid は用途名で表示し「ボット」と分かるようにする。
// ※ボットを作り直して uid が変わったときは、ここも更新してください。
const SYSTEM_ACCOUNTS: Record<string, string> = {
  "rsKUdYSPhDWSAr0r7lqdtHC17vj2": "催促メール送信ボット",
};

const ROLE_STYLES: Record<AppRole, { badge: string; label: string }> = {
  admin:     { badge: "bg-red-100 text-red-700 border border-red-200",         label: "管理者" },
  supporter: { badge: "bg-sky-100 text-sky-700 border border-sky-200",         label: "サポーター" },
  member:    { badge: "bg-ag-lime-100 text-ag-lime-700 border border-ag-lime-200", label: "メンバー" },
  pending:   { badge: "bg-amber-100 text-amber-700 border border-amber-200",   label: "承認待ち" },
  rejected:  { badge: "bg-ag-gray-100 text-ag-gray-400 border border-ag-gray-200", label: "却下済み" },
};

export default function UserApprovalPanel() {
  const { role: myRole, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // 名簿（メンバー一覧）に登録されているメールアドレス。ログイン中のアカウントが
  // この名簿メールと一致しているかを、承認画面で見えるようにするために使う。
  const [rosterEmails, setRosterEmails] = useState<string[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);

  useEffect(() => {
    return subscribeToUsers(setUsers);
  }, []);

  useEffect(() => {
    getAllMembers()
      .then((ms) =>
        setRosterEmails(
          ms.map((m) => m.email).filter((e): e is string => !!e && e.trim() !== "")
        )
      )
      .catch(() => {})
      .finally(() => setRosterLoaded(true));
  }, []);

  // 名簿メールを「そのまま(exact)」と「小文字化(lower)」の2種類で持つ。
  // ログイン照合(getMemberByEmail)は大文字小文字も区別する完全一致なので、
  // 「小文字にすれば一致する＝大文字小文字だけ違う」ケースも警告として拾えるようにする。
  const { exactSet, lowerSet } = useMemo(() => {
    const exact = new Set(rosterEmails.map((e) => e.trim()));
    const lower = new Set(rosterEmails.map((e) => e.trim().toLowerCase()));
    return { exactSet: exact, lowerSet: lower };
  }, [rosterEmails]);

  // 名簿との一致状態を返す。match=完全一致 / case=大文字小文字だけ違う / none=名簿に無い
  const rosterStatus = (email: string): "match" | "case" | "none" => {
    const e = (email ?? "").trim();
    if (!e) return "none";
    if (exactSet.has(e)) return "match";
    if (lowerSet.has(e.toLowerCase())) return "case";
    return "none";
  };

  // 名簿一致状態のバッジ。名簿がまだ読み込めていない間は表示しない（誤って「名簿に無い」と出さないため）。
  const renderRosterBadge = (email: string) => {
    if (!rosterLoaded) return null;
    // メール未登録のアカウント（送信ボットや古いデータ）は会員照合の対象外。落ち着いた灰色で表示する。
    if (!(email ?? "").trim())
      return <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-ag-gray-100 text-ag-gray-400 border border-ag-gray-200">メール未登録</span>;
    const st = rosterStatus(email);
    if (st === "match")
      return <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-ag-lime-100 text-ag-lime-700 border border-ag-lime-200">名簿一致</span>;
    if (st === "case")
      return <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">大文字小文字が違う</span>;
    return <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-red-100 text-red-700 border border-red-200">名簿に無い</span>;
  };

  if (myRole !== "admin") return null;

  const pendingUsers  = users.filter((u) => u.role === "pending");
  const rejectedUsers = users.filter((u) => u.role === "rejected");
  const otherUsers    = users.filter((u) => u.role !== "pending" && u.role !== "rejected");

  const hasEmail = (u: UserRecord) => !!(u.email && u.email.trim() !== "");

  // 承認済み（メンバー・サポーター・管理者）で、メールは登録されているのに名簿と一致しない人。
  // ＝名簿に無いアドレスでログインしている本物の会員。ビジター料金が付くなどの原因。修正対象。
  const mismatchedMembers = rosterLoaded
    ? otherUsers.filter((u) => hasEmail(u) && rosterStatus(u.email) !== "match")
    : [];

  // メール自体が登録されていないアカウント（自動送信ボットや、古い・未使用のゴミデータ）。
  // 会員の照合対象ではないので、赤い「要確認」とは分けて落ち着いた別枠で表示する。
  const emailLessAccounts = rosterLoaded ? otherUsers.filter((u) => !hasEmail(u)) : [];

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

  // 承認済みユーザーの「承認解除」ボタン。
  // 事故防止のため、自分自身（管理者本人）と、自動送信ボットには表示しない。
  const renderRejectButton = (u: UserRecord) => {
    if (currentUser && u.uid === currentUser.uid) return null; // 自分は解除できない
    if (SYSTEM_ACCOUNTS[u.uid]) return null; // ボットは解除させない
    const name = u.displayName || u.email || "このアカウント";
    return (
      <button
        onClick={() => {
          if (!window.confirm(`「${name}」の承認を解除しますか？\nこの人はアプリを使えなくなります（あとで「承認待ちに戻す」で元に戻せます）。`)) return;
          handle(u.uid, "reject");
        }}
        disabled={processing === u.uid}
        className="text-[11px] font-black text-red-500 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
      >
        {processing === u.uid ? "処理中..." : "承認解除"}
      </button>
    );
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

      {/* 要確認：名簿とメールが違う登録者（修正対象のピックアップ） */}
      {mismatchedMembers.length > 0 && (
        <div className="px-8 py-5 border-b border-ag-gray-100 bg-red-50/50">
          <p className="text-sm font-black text-red-700 flex items-center gap-2">
            要確認：名簿とメールが違う登録者
            <span className="text-xs font-black bg-red-500 text-white rounded-full px-2.5 py-0.5">{mismatchedMembers.length}件</span>
          </p>
          <p className="text-xs font-bold text-ag-gray-500 mt-1 mb-3 leading-relaxed">
            下の人たちは、名簿に登録されたメールと違うアドレスでログインしています。<br />
            このままだと会員と認識されず、参加予約にビジター料金が付くなどの原因になります。<br />
            名簿に登録したメールアドレスでログインし直してもらってください。
          </p>
          <div className="space-y-2">
            {mismatchedMembers.map((u) => (
              <div key={u.uid} className="flex items-center justify-between gap-4 bg-white rounded-2xl px-5 py-3 border-2 border-red-200 shadow-sm">
                <div className="min-w-0">
                  <p className="font-black text-ag-gray-900 truncate text-sm">
                    {u.displayName || <span className="text-ag-gray-400">（名前未登録）</span>}
                  </p>
                  <p className="text-xs font-bold text-ag-gray-400 truncate">
                    {u.email || <span className="text-red-500">（メールアドレス未登録）</span>}
                  </p>
                  <p className="text-[10px] font-mono text-ag-gray-300 truncate mt-0.5">ID: {u.uid}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${ROLE_STYLES[u.role].badge}`}>
                    {ROLE_STYLES[u.role].label}
                  </span>
                  {renderRosterBadge(u.email)}
                  {renderRejectButton(u)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* メール未登録のアカウント（送信ボット・古いゴミデータなど。会員照合の対象外） */}
      {emailLessAccounts.length > 0 && (
        <div className="px-8 py-5 border-b border-ag-gray-100 bg-ag-gray-50/60">
          <p className="text-sm font-black text-ag-gray-600 flex items-center gap-2">
            メール未登録のアカウント
            <span className="text-xs font-black bg-ag-gray-400 text-white rounded-full px-2.5 py-0.5">{emailLessAccounts.length}件</span>
          </p>
          <p className="text-xs font-bold text-ag-gray-400 mt-1 mb-3 leading-relaxed">
            メールアドレスが登録されていないアカウントです。自動送信用のボットや、古い・未使用のデータの可能性があります。<br />
            心当たりがなければ、Firebaseコンソールで整理してください（ボットは消さないでください）。
          </p>
          <div className="space-y-2">
            {emailLessAccounts.map((u) => {
              const systemLabel = SYSTEM_ACCOUNTS[u.uid];
              return (
                <div key={u.uid} className="flex items-center justify-between gap-4 bg-white rounded-2xl px-5 py-3 border border-ag-gray-200">
                  <div className="min-w-0">
                    <p className="font-black text-ag-gray-600 truncate text-sm">
                      {systemLabel || u.displayName || "（名前未登録）"}
                    </p>
                    <p className="text-[10px] font-mono text-ag-gray-300 truncate mt-0.5">ID: {u.uid}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {systemLabel && (
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200">ボット</span>
                    )}
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${ROLE_STYLES[u.role].badge}`}>
                      {ROLE_STYLES[u.role].label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                  <div className="mt-1.5">{renderRosterBadge(u.email)}</div>
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
                    {renderRosterBadge(u.email)}
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
                    {renderRejectButton(u)}
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
