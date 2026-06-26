import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyFirebaseIdToken, fetchApproverEmails } from "@/lib/firebaseRest";

// nodemailer と jose は Node.js 環境が必要（Edge では動かない）
export const runtime = "nodejs";

// ─────────────────────────────────────────────
// 催促の「承認をお願いします」メールを、承認できる人（代表・サポーター）へ送るAPI
//   呼び出し元: 幹事が催促ボタンを押したとき（承認待ちリクエストを作った直後）
//   流れ:
//     1) 申請者のログイン（IDトークン）を確認
//     2) 承認者（admin/supporter）のメールを名簿(userRoles)から集める
//     3) Gmail から BCC で一斉送信（宛先は互いに見えない）
//   ※ メールが送れなくても承認リクエスト自体はアプリに残るので、
//      承認者はアプリの「承認待ち」から承認できる（このメールはお知らせ目的）。
// ─────────────────────────────────────────────

type Body = {
  idToken?: string;
  collectionTitle?: string; // 集金の名称
  memberName?: string; // 催促する相手の名前
  amount?: number; // 請求額
  requestedByName?: string; // 申請した幹事の名前
};

export async function POST(req: Request) {
  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { idToken, collectionTitle, memberName, amount, requestedByName } = payload;

  if (!idToken) {
    return NextResponse.json({ error: "認証情報がありません。" }, { status: 401 });
  }

  // 1) 申請者がログイン済みの本人か確認
  try {
    await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "ログインの確認に失敗しました。" }, { status: 401 });
  }

  // 2) 承認者のメールを集める（読めない場合は「メールなしでも承認は可能」として穏便に終了）
  let recipients: string[] = [];
  try {
    recipients = await fetchApproverEmails(idToken);
  } catch (e) {
    console.error("承認者メールの取得に失敗（メール通知はスキップ）:", e);
    return NextResponse.json({ sent: 0, message: "承認者メールを取得できませんでした（アプリで承認できます）。" });
  }
  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, message: "承認者のメール宛先が見つかりませんでした。" });
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
  const financeUrl = `${siteUrl}/dashboard/finance`;

  const userClean = user.trim();
  const passClean = pass.replace(/\s+/g, "");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: userClean, pass: passClean },
  });

  const amountText = typeof amount === "number" && amount > 0 ? `¥${amount.toLocaleString()}` : "";
  const subjectName = memberName || "未納の方";

  const textLines = [
    "催促メールの送信について、承認のお願いです。",
    "",
    `集金: ${collectionTitle || "（名称なし）"}`,
    `相手: ${subjectName}`,
    ...(amountText ? [`請求額: ${amountText}`] : []),
    ...(requestedByName ? [`申請者（幹事）: ${requestedByName}`] : []),
    "",
    "アプリの会計ページを開いて「承認待ち」から、承認（送信）または却下をしてください。",
    `会計ページ: ${financeUrl}`,
    "",
    "──────────",
    "ビックビーンズ（bigbeans）からの自動通知です。",
  ];
  const text = textLines.join("\n");

  const html = `
  <div style="font-family:-apple-system,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;max-width:560px;margin:0 auto;padding:8px;color:#1f2937;">
    <div style="background:#f59e0b;color:#fff;padding:14px 18px;border-radius:14px 14px 0 0;font-weight:bold;font-size:15px;">
      ビックビーンズ 催促の承認のお願い
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:20px 18px;">
      <p style="font-size:14px;color:#4b5563;margin:0 0 14px;line-height:1.7;">
        催促メールの送信について、承認のお願いです。内容をご確認ください。
      </p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin:0 0 16px;">
        <tr><td style="color:#6b7280;padding:4px 0;">集金</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${escapeHtml(collectionTitle || "（名称なし）")}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">相手</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${escapeHtml(subjectName)}</td></tr>
        ${amountText ? `<tr><td style="color:#6b7280;padding:4px 0;">請求額</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${escapeHtml(amountText)}</td></tr>` : ""}
        ${requestedByName ? `<tr><td style="color:#6b7280;padding:4px 0;">申請者（幹事）</td><td style="text-align:right;padding:4px 0;font-weight:bold;">${escapeHtml(requestedByName)}</td></tr>` : ""}
      </table>
      <a href="${financeUrl}" style="display:inline-block;background:#84cc16;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">アプリで承認する</a>
      <p style="font-size:12px;color:#6b7280;margin:14px 0 0;line-height:1.6;">
        会計ページの「承認待ち」から、承認（送信）または却下ができます。
      </p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:18px 0;" />
      <p style="font-size:11px;color:#9ca3af;line-height:1.6;margin:0;">
        この通知はビックビーンズ（bigbeans）から自動送信されています。
      </p>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `ビックビーンズ <${userClean}>`,
      to: userClean, // 表向きの宛先は自分自身（承認者は BCC に隠す）
      bcc: recipients,
      subject: `【ビックビーンズ】催促の承認のお願い（${subjectName}）`,
      text,
      html,
    });
  } catch (e) {
    console.error("承認依頼メール送信に失敗:", e);
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
