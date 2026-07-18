import { NextResponse } from "next/server";
import webpush from "web-push";
import { verifyFirebaseIdToken, fetchMembersPushSubs, type PushSubJSON } from "@/lib/firebaseRest";

// web-push と jose は Node.js 環境が必要（Edge では動かない）
export const runtime = "nodejs";

// ─────────────────────────────────────────────
// 全員向けプッシュ通知の送信API（Web Push・VAPID方式）
//   呼び出し元: createBroadcast（予定・アンケート・お知らせの追加時）
//   流れ:
//     1) 送信者のログイン（IDトークン）を確認し、メンバー以外はお断り
//     2) 名簿(members)から「アプリ通知を許可した人の宛先(pushSubs)」を集める
//     3) 各端末へ Web Push を送る（サービスアカウント鍵は使わない）
//   ※ FCMを使わないので、会社方針で禁止のサービスアカウント鍵が不要。
// ─────────────────────────────────────────────

type Body = {
  title?: string;
  body?: string;
  link?: string;
  idToken?: string;
};

export async function POST(req: Request) {
  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { title, body, link, idToken } = payload;

  if (!idToken) {
    return NextResponse.json({ error: "認証情報がありません。" }, { status: 401 });
  }
  if (!title) {
    return NextResponse.json({ error: "件名がありません。" }, { status: 400 });
  }

  // 1) 送信者がログイン済みの本人か確認（なりすまし・いたずら送信の防止）
  try {
    await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "ログインの確認に失敗しました。" }, { status: 401 });
  }

  // VAPIDキー（環境変数）の確認
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "https://bigbeans.vercel.app";
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: "プッシュ通知の設定（VAPIDキー）が未設定です。" },
      { status: 500 }
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  // 2) 宛先を集める（アプリ通知を許可した人だけ pushSubs を持つ）
  let subs: PushSubJSON[];
  try {
    subs = await fetchMembersPushSubs(idToken);
  } catch (e) {
    console.error("プッシュ宛先の読み取りに失敗:", e);
    return NextResponse.json({ error: "宛先の読み取りに失敗しました。" }, { status: 500 });
  }

  if (subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "アプリ通知を希望する宛先がありませんでした。" });
  }

  // 3) 通知の中身を作って各端末へ送信
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bigbeans.vercel.app").replace(/\/$/, "");
  const path = link ? `${link.startsWith("/") ? "" : "/"}${link}` : "/dashboard/calendar";
  const notificationPayload = JSON.stringify({
    title: `ビックビーンズ：${title}`,
    body: (body || "").trim(),
    url: `${siteUrl}${path}`,
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          notificationPayload
        );
        sent++;
      } catch (e: unknown) {
        failed++;
        // 404/410 は「宛先が失効」＝相手が通知を切った等。ここでは記録のみ。
        const status = (e as { statusCode?: number })?.statusCode;
        if (status !== 404 && status !== 410) {
          console.error("プッシュ送信に失敗:", status, e);
        }
      }
    })
  );

  return NextResponse.json({ sent, failed });
}
