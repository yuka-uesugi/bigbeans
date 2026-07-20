import nodemailer from "nodemailer";
import webpush from "web-push";
import { signInAsRobot, fetchStaffMembers, fetchMembersPushSubs } from "./firebaseRest";

// ─────────────────────────────────────────────
// ビジター予約の運営向け通知（サーバー専用）
//
// ビジターが予約したり取り消したりしても、これまで運営は誰も気づけなかった。
// ここで「共有Gmailへのメール」と「運営スタッフへのアプリ通知」を送る。
//
//  - メール宛先: 共有Gmail（GMAIL_USER 自身。問い合わせが集まる場所に揃える）
//  - プッシュ宛先: 名簿(members)で役職(role)が入っている人（代表・会計・事務局など）
//    のうち、アプリ通知を許可している端末
//  - 名簿の読み取りはロボット役アカウントで行う（未ログインのビジターには権限が無いため）
//  - 通知はお知らせ目的。失敗しても予約・取り消しの処理は成立させる（呼び出し側で握りつぶす）
// ─────────────────────────────────────────────

export type ReservationNotifyInput = {
  kind: "confirmed" | "waitlisted" | "cancelled";
  visitorName: string;
  eventTitle: string;
  eventDate: string; // "2026-07-29"
  /** 取り消しでキャンセル待ちから繰り上がった人（いれば） */
  promotedName?: string;
};

const kindLabel = (k: ReservationNotifyInput["kind"]) =>
  k === "confirmed" ? "予約（確定）" : k === "waitlisted" ? "予約（キャンセル待ち）" : "予約の取り消し";

export async function notifyStaffOfVisitorReservation(
  input: ReservationNotifyInput
): Promise<{ emailSent: boolean; pushSent: number }> {
  const { kind, visitorName, eventTitle, eventDate, promotedName } = input;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bigbeans.vercel.app").replace(/\/$/, "");
  const calendarUrl = `${siteUrl}/dashboard/calendar`;
  const title = `ビジターの${kindLabel(kind)}`;
  const lines = [
    `お名前: ${visitorName} さん`,
    `練習: ${eventDate}　${eventTitle}`,
    ...(promotedName ? [`繰り上げ: キャンセル待ちの ${promotedName} さんが自動で確定になりました`] : []),
  ];

  // ── メール（共有Gmailへ） ──
  let emailSent = false;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser.trim(), pass: gmailPass.replace(/\s+/g, "") },
      });
      await transporter.sendMail({
        from: `ビックビーンズ <${gmailUser.trim()}>`,
        to: gmailUser.trim(),
        subject: `【ビックビーンズ】${title}: ${visitorName}さん（${eventDate} ${eventTitle}）`,
        text: [
          `${title}がありました。`,
          "",
          ...lines,
          "",
          `参加者の確認: ${calendarUrl}`,
          "",
          "──────────",
          "ビックビーンズ（bigbeans）からの自動通知です。",
        ].join("\n"),
      });
      emailSent = true;
    } catch (e) {
      console.error("[reservationNotify] メール送信に失敗:", e);
    }
  } else {
    console.error("[reservationNotify] GMAIL_USER / GMAIL_APP_PASSWORD が未設定のためメールを送れません。");
  }

  // ── プッシュ（役職のあるスタッフの端末へ） ──
  let pushSent = 0;
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "https://bigbeans.vercel.app";
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);

      const idToken = await signInAsRobot();
      const staff = await fetchStaffMembers(idToken);
      const staffNames = staff.map((s) => s.name);
      if (staffNames.length > 0) {
        const subs = await fetchMembersPushSubs(idToken, { onlyNames: staffNames });
        const payload = JSON.stringify({
          title: `ビックビーンズ：${title}`,
          body: `${visitorName}さん / ${eventDate} ${eventTitle}${promotedName ? `（${promotedName}さんが繰り上げ確定）` : ""}`,
          url: calendarUrl,
        });
        await Promise.all(
          subs.map(async (sub) => {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
              pushSent++;
            } catch (e: unknown) {
              // 404/410 は宛先の失効（通知を切った等）。記録のみで続行。
              const status = (e as { statusCode?: number })?.statusCode;
              if (status !== 404 && status !== 410) {
                console.error("[reservationNotify] プッシュ送信に失敗:", status, e);
              }
            }
          })
        );
      }
    }
  } catch (e) {
    console.error("[reservationNotify] プッシュ通知の準備に失敗:", e);
  }

  return { emailSent, pushSent };
}
