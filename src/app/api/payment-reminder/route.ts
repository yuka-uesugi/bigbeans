import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyFirebaseIdToken, fetchMemberContactById } from "@/lib/firebaseRest";

// nodemailer と jose は Node.js 環境が必要（Edge では動かない）
export const runtime = "nodejs";

// ─────────────────────────────────────────────
// 集金の「催促メール」を、未納の方ひとりに個別送信するAPI
//   呼び出し元: 集金リスト画面の「催促」（代表が直接、または承認後）
//   流れ:
//     1) 送信者のログイン（IDトークン）を確認し、ログイン外の人はお断り
//     2) 宛先は送信者が自由に決められない。会員番号(memberId)から
//        名簿の正規メールアドレスをサーバー側で引き当てて、そこにだけ送る
//     3) Gmail から本人宛に送信（一斉ではなく個別なので to に直接入れる）
// ─────────────────────────────────────────────

type Body = {
  idToken?: string;
  memberId?: string | number; // 宛先解決用（このIDのメンバーの登録メールに送る）
  title?: string; // 集金の名称（例: 納涼会費）
  amount?: number; // 請求額
  paypayLink?: string; // 送金先（任意）
  organizerName?: string; // 集金担当者（幹事）の名前。差出人表示用
};

export async function POST(req: Request) {
  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { idToken, memberId, title, amount, paypayLink, organizerName } = payload;

  if (!idToken) {
    return NextResponse.json({ error: "認証情報がありません。" }, { status: 401 });
  }
  if (memberId === undefined || memberId === null || memberId === "") {
    return NextResponse.json({ error: "宛先（メンバー）が指定されていません。" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "集金の名称がありません。" }, { status: 400 });
  }

  // 1) 送信者がログイン済みの本人か確認（なりすまし・いたずら送信の防止）
  try {
    await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "ログインの確認に失敗しました。" }, { status: 401 });
  }

  // 2) 宛先を名簿から引く（送信者が宛先を自由に指定できないようにする）
  let contact: { name: string; email: string } | null;
  try {
    contact = await fetchMemberContactById(idToken, memberId);
  } catch (e) {
    console.error("名簿の読み取りに失敗:", e);
    return NextResponse.json({ error: "名簿の読み取りに失敗しました。" }, { status: 500 });
  }
  if (!contact) {
    return NextResponse.json(
      { error: "この方はメールアドレスが名簿に登録されていないため、メールで催促できません。" },
      { status: 404 }
    );
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

  // 認証情報の空白を除去（貼り付け時に紛れ込んだ空白を取り除く）
  const userClean = user.trim();
  const passClean = pass.replace(/\s+/g, "");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: userClean, pass: passClean },
  });

  const amountText = typeof amount === "number" && amount > 0 ? `¥${amount.toLocaleString()}` : null;
  const paypay = (paypayLink || "").trim();

  const textLines = [
    `${contact.name} 様`,
    "",
    `「${title}」のお支払いがまだ確認できていません。`,
    ...(amountText ? [`ご請求額: ${amountText}`] : []),
    "お手数ですが、お支払いをお願いいたします。",
    "",
    ...(paypay ? [`PayPay送金先: ${paypay}`, ""] : []),
    `アプリで確認する: ${siteUrl}`,
    "",
    "──────────",
    ...(organizerName ? [`集金担当: ${organizerName}`] : []),
    "ビックビーンズ（bigbeans）からの集金のお知らせです。",
  ];
  const text = textLines.join("\n");

  const html = `
  <div style="font-family:-apple-system,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;max-width:560px;margin:0 auto;padding:8px;color:#1f2937;">
    <div style="background:#84cc16;color:#fff;padding:14px 18px;border-radius:14px 14px 0 0;font-weight:bold;font-size:15px;">
      ビックビーンズ 集金のお願い
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:20px 18px;">
      <p style="font-size:15px;font-weight:bold;margin:0 0 12px;">${escapeHtml(contact.name)} 様</p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 14px;line-height:1.7;">
        「${escapeHtml(title)}」のお支払いがまだ確認できていません。<br />
        お手数ですが、お支払いをお願いいたします。
      </p>
      ${amountText ? `<p style="font-size:16px;font-weight:bold;margin:0 0 14px;color:#1f2937;">ご請求額: ${escapeHtml(amountText)}</p>` : ""}
      ${paypay ? `<a href="${escapeHtml(paypay)}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;margin:0 0 12px;">PayPayで支払う</a><br />` : ""}
      <a href="${siteUrl}" style="display:inline-block;background:#84cc16;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">アプリで確認する</a>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:18px 0;" />
      <p style="font-size:11px;color:#9ca3af;line-height:1.6;margin:0;">
        ${organizerName ? `集金担当: ${escapeHtml(organizerName)}<br />` : ""}
        この通知はビックビーンズ（bigbeans）から送信されています。
      </p>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `ビックビーンズ <${userClean}>`,
      to: contact.email,
      subject: `【ビックビーンズ】「${title}」お支払いのお願い`,
      text,
      html,
    });
  } catch (e) {
    console.error("催促メール送信に失敗:", e);
    return NextResponse.json({ error: "メールの送信に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ sent: 1, to: contact.name });
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
