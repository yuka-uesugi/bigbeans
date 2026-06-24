import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyFirebaseIdToken, fetchMembersPrefs } from "@/lib/firebaseRest";
import { memberList, type Member } from "@/data/memberList";

// nodemailer と jose は Node.js 環境が必要（Edge では動かない）
export const runtime = "nodejs";

// ─────────────────────────────────────────────
// 全員向けメール通知の送信API
//   呼び出し元: createBroadcast（予定・アンケート・お知らせの追加時）
//   流れ:
//     1) 送信者のログイン（IDトークン）を確認し、メンバー以外はお断り
//     2) 名簿＋Firestoreの設定から「メールを受け取る人」を集める
//     3) Gmail から BCC で一斉送信（宛先は互いに見えない＝個人情報保護）
// ─────────────────────────────────────────────

type Body = {
  type?: string;
  title?: string;
  body?: string;
  link?: string;
  createdByName?: string;
  idToken?: string;
};

// 「メールで受け取る」と判断するか（未設定・email は受け取る。app/none/line は受け取らない）
function wantsEmail(prefs: Member["notificationPrefs"]): boolean {
  const m = prefs?.practiceUpdates;
  return m === undefined || m === "email";
}

export async function POST(req: Request) {
  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { title, body, link, createdByName, idToken } = payload;

  if (!idToken) {
    return NextResponse.json({ error: "認証情報がありません。" }, { status: 401 });
  }
  if (!title) {
    return NextResponse.json({ error: "件名がありません。" }, { status: 400 });
  }

  // 1) 送信者がログイン済みの本人か確認（なりすまし・いたずら送信の防止）
  //    サービスアカウント鍵は使わず、Googleの公開鍵で ID トークンを検証する。
  try {
    await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "ログインの確認に失敗しました。" }, { status: 401 });
  }

  // 2) 宛先を集める（名簿を土台にし、Firestore の最新設定で上書き）
  //    email をキーに、重複を除いてまとめる。
  const byEmail = new Map<string, { email: string; prefs: Member["notificationPrefs"] }>();

  for (const m of memberList) {
    if (m.email) {
      byEmail.set(m.email.toLowerCase(), { email: m.email, prefs: m.notificationPrefs });
    }
  }

  // Firestore の members（マイページで編集された最新の受取設定）を反映。
  // 送信者本人の権限（ID トークン）で REST 経由で読み取る。鍵は不要。
  try {
    const prefs = await fetchMembersPrefs(idToken);
    for (const p of prefs) {
      byEmail.set(p.email.toLowerCase(), {
        email: p.email,
        prefs: { practiceUpdates: p.practiceUpdates },
      });
    }
  } catch (e) {
    // Firestore が読めなくても、名簿（静的）だけで送信は続行する
    console.error("Firestore members 読み取りに失敗（名簿のみで続行）:", e);
  }

  const recipients = Array.from(byEmail.values())
    .filter((r) => wantsEmail(r.prefs))
    .map((r) => r.email);

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, message: "メール受信を希望する宛先がありませんでした。" });
  }

  // 3) Gmail から送信
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return NextResponse.json(
      { error: "メール送信の設定（GMAIL_USER / GMAIL_APP_PASSWORD）が未設定です。" },
      { status: 500 }
    );
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bigbeans.vercel.app").replace(/\/$/, "");
  const fullLink = link ? `${siteUrl}${link.startsWith("/") ? "" : "/"}${link}` : siteUrl;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const safeBody = (body || "").trim();
  const textLines = [
    title,
    "",
    ...(safeBody ? [safeBody, ""] : []),
    `アプリで見る: ${fullLink}`,
    "",
    "──────────",
    "ビックビーンズ（bigbeans）からの自動通知です。",
    "メール通知の停止は、アプリのマイページ →「通知設定」で変更できます。",
  ];
  const text = textLines.join("\n");

  const html = `
  <div style="font-family:-apple-system,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;max-width:560px;margin:0 auto;padding:8px;color:#1f2937;">
    <div style="background:#84cc16;color:#fff;padding:14px 18px;border-radius:14px 14px 0 0;font-weight:bold;font-size:15px;">
      ビックビーンズ お知らせ
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:20px 18px;">
      <p style="font-size:17px;font-weight:bold;margin:0 0 10px;line-height:1.5;">${escapeHtml(title)}</p>
      ${safeBody ? `<p style="font-size:14px;color:#4b5563;margin:0 0 18px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(safeBody)}</p>` : ""}
      <a href="${fullLink}" style="display:inline-block;background:#84cc16;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">アプリで詳しく見る</a>
      ${createdByName ? `<p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">投稿者: ${escapeHtml(createdByName)}</p>` : ""}
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:18px 0;" />
      <p style="font-size:11px;color:#9ca3af;line-height:1.6;margin:0;">
        この通知はビックビーンズ（bigbeans）から自動送信されています。<br />
        メール通知の停止は、アプリのマイページ →「通知設定」からいつでも変更できます。
      </p>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `ビックビーンズ <${user}>`,
      to: user, // 表向きの宛先は自分自身（メンバーは BCC に隠す）
      bcc: recipients,
      subject: `【ビックビーンズ】${title}`,
      text,
      html,
    });
  } catch (e) {
    console.error("メール送信に失敗:", e);
    return NextResponse.json({ error: "メールの送信に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ sent: recipients.length });
}

// HTML に値を埋め込むときの最低限のエスケープ（崩れ・注入の防止）
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
