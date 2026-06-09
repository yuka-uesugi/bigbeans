"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberByEmail } from "@/lib/members";

/**
 * ログイン中のユーザーが「会計（取引）を編集」できるかを判定するフック。
 *
 * 編集できるのは次のいずれか:
 *   - アプリの管理者(admin)
 *   - アプリのサポーター(supporter)
 *   - 名簿(members)で role に「会計」と記載がある人（今年度の会計担当）
 *
 * 会計担当は年度ごとに変わるため、固定の役割を作らず、
 * 名簿データベースのメールアドレス照合で判定する（名簿基準）。
 */
export function useCanEditFinance(): boolean {
  const { user, role } = useAuth();
  const [isAccountant, setIsAccountant] = useState(false);

  useEffect(() => {
    let active = true;
    const email = user?.email;
    if (!email) {
      setIsAccountant(false);
      return;
    }
    getMemberByEmail(email)
      .then((member) => {
        if (!active) return;
        const memberRole = member?.role ?? "";
        setIsAccountant(memberRole.includes("会計"));
      })
      .catch(() => {
        if (active) setIsAccountant(false);
      });
    return () => {
      active = false;
    };
  }, [user?.email]);

  // 管理者・サポーターは常に編集可。加えて名簿で「会計」の人も編集可。
  return role === "admin" || role === "supporter" || isAccountant;
}
