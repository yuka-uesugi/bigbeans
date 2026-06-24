"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberByEmail } from "@/lib/members";

/**
 * ログイン中のユーザーが「会計（取引）を編集」できるかを判定するフック。
 *
 * 編集できるのは次のいずれか:
 *   - アプリの管理者(admin)　※代表。締め出し防止のため常に編集可
 *   - 名簿(members)で role に「会計」と記載がある人（今年度の会計担当）
 *
 * 会計担当は年度ごとに変わるため、固定の役割を作らず、
 * 名簿データベースのメールアドレス照合で判定する（名簿基準）。
 * サポーターでも、名簿に「会計」が無い人は閲覧のみ（会計を触れるのは指定者だけ）。
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

  // 管理者(代表)は常に編集可。加えて名簿で「会計」の人だけ編集可（サポーターでも会計指定が無ければ閲覧のみ）。
  return role === "admin" || isAccountant;
}
