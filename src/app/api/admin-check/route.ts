import { NextResponse } from "next/server";
import {
  verifyFirebaseIdToken,
  fetchUserRole,
  signInAsRobot,
  fetchMembersForReminder,
} from "@/lib/firebaseRest";
import { memberList } from "@/data/memberList";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─────────────────────────────────────────────
// 管理者用のシステム診断API（読み取りのみ・メールは一切送らない）
//   1) 呼び出し元が管理者(admin/supporter)か確認
//   2) A: ロボット役アカウントがログインできるか（＝7日前催促が毎晩動くか）
//   3) B: 会員種別が未設定のメンバーがいないか（誤ってビジター料金になる恐れ）
// ─────────────────────────────────────────────

type Body = { idToken?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const idToken = body.idToken;
  if (!idToken) {
    return NextResponse.json({ error: "認証情報がありません。" }, { status: 401 });
  }

  let sender: { uid: string; email?: string };
  try {
    sender = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "ログインの確認に失敗しました。" }, { status: 401 });
  }

  // 管理者チェック（自分の users ドキュメントは必ず読めるので確実）
  const role = await fetchUserRole(idToken, sender.uid);
  if (role !== "admin" && role !== "supporter") {
    return NextResponse.json({ error: "この機能は管理者・サポーターのみ実行できます。" }, { status: 403 });
  }

  // ── A: ロボット役のログイン確認（催促メールの自動送信が動くかの要） ──
  const robot: { ok: boolean; error?: string } = { ok: false };
  try {
    await signInAsRobot();
    robot.ok = true;
  } catch (e) {
    robot.error = e instanceof Error ? e.message : "不明なエラー";
  }

  // ── B: 会員種別の未設定チェック ──
  const members: {
    ok: boolean;
    total: number;
    typed: number;
    missingNames: string[];
    needsAttention: string[];
    error?: string;
  } = { ok: false, total: 0, typed: 0, missingNames: [], needsAttention: [] };

  try {
    const list = await fetchMembersForReminder(idToken);
    // 静的名簿（コードに埋め込みの土台データ）で種別が分かる人を集めておく。
    // Firestoreで未設定でも、静的名簿に種別があれば実際には正しく判定される。
    const staticById = new Map<string, string>();
    const staticByName = new Map<string, string>();
    for (const m of memberList) {
      if (m.membershipType) {
        staticById.set(String(m.id), m.membershipType);
        staticByName.set(m.name, m.membershipType);
      }
    }

    members.total = list.length;
    for (const m of list) {
      if (m.membershipType) {
        members.typed++;
        continue;
      }
      const label = m.name || m.email;
      members.missingNames.push(label);
      // 静的名簿にも種別が無い人は、実際に「ビジター」扱いになってしまう＝要対応
      const covered = staticById.has(m.id) || staticByName.has(m.name);
      if (!covered) members.needsAttention.push(label);
    }
    members.ok = true;
  } catch (e) {
    members.error = e instanceof Error ? e.message : "名簿の読み取りに失敗しました。";
  }

  return NextResponse.json({ robot, members });
}
