import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  signInAsRobot,
  fetchPracticeEventsByDate,
  fetchAnsweredForEvent,
  fetchMembersForReminder,
  markReminderSent,
  type ReminderMember,
} from "@/lib/firebaseRest";

// nodemailer は Node.js 環境が必要（Edge では動かない）
export const runtime = "nodejs";
// 名簿・出欠を全件走査してメール送信するため、少し長めの実行時間を確保
export const maxDuration = 60;

// ─────────────────────────────────────────────
// 練習「7日前」の未回答者へ自動で催促メールを送るAPI（自動実行用）
//   呼び出し元: Vercel Cron（毎日1回・日本時間21時ごろ）
//   流れ:
//     1) Vercel Cron からの正規呼び出しかを CRON_SECRET で確認
//     2) ロボット役の専用アカウントでログイン（誰もログインしていないため）
//     3) 「今日から7日後」に予定されている練習を探す
//     4) その練習の出欠データと名簿を突き合わせ、未回答の人を割り出す
//     5) 未回答かつ「メールで受け取る」設定の人にだけ個別に催促メールを送る
//     6) 同じ練習に二度送らないよう、送信済みの印を付ける
//   ※ ビジターは名簿にいない（参加時のみ登録）ため、未回答の対象外。
// ─────────────────────────────────────────────

// 「メールで受け取る」と判断するか
// （未設定・email・both〔メール＋アプリ〕は受け取る。app/none/line は受け取らない）
function wantsEmail(practiceUpdates?: string): boolean {
  return practiceUpdates === undefined || practiceUpdates === "email" || practiceUpdates === "both";
}

// 日本時間(JST)基準で「今日からdays日後」の日付文字列（"YYYY-MM-DD"）を返す
function jstDateStrAfterDays(days: number): string {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const shifted = new Date(Date.now() + JST_OFFSET_MS + days * 24 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // 曜日算出用。UTC の Date で日付だけ扱う
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}月${d}日（${DAYS_JP[dow]}）`;
}

export async function GET(req: Request) {
  // 1) Vercel Cron（または管理者の手動確認）からの正規呼び出しかを確認する。
  //    CRON_SECRET を設定しておくと、Vercel は自動で
  //    「Authorization: Bearer <CRON_SECRET>」を付けて呼び出す。
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
    }
  }

  // メール送信設定の確認
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return NextResponse.json(
      { error: "メール送信の設定（GMAIL_USER / GMAIL_APP_PASSWORD）が未設定です。" },
      { status: 500 }
    );
  }

  // 2) ロボット役でログイン
  let idToken: string;
  try {
    idToken = await signInAsRobot();
  } catch (e) {
    console.error("ロボットのログインに失敗:", e);
    return NextResponse.json({ error: "ロボットのログインに失敗しました。" }, { status: 500 });
  }

  // 3) 7日後の練習を取得
  const targetDate = jstDateStrAfterDays(7);
  let practices;
  try {
    practices = await fetchPracticeEventsByDate(idToken, targetDate);
  } catch (e) {
    console.error("練習の取得に失敗:", e);
    return NextResponse.json({ error: "練習の取得に失敗しました。" }, { status: 500 });
  }

  // 対象の練習が無ければ、何もせず正常終了
  const pending = practices.filter((p) => !p.reminderSent);
  if (pending.length === 0) {
    return NextResponse.json({
      targetDate,
      practices: practices.length,
      message: "対象の練習がない、またはすべて送信済みです。",
      sent: 0,
    });
  }

  // 名簿は一度だけ読む
  let members: ReminderMember[];
  try {
    members = await fetchMembersForReminder(idToken);
  } catch (e) {
    console.error("名簿の取得に失敗:", e);
    return NextResponse.json({ error: "名簿の取得に失敗しました。" }, { status: 500 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bigbeans.vercel.app").replace(/\/$/, "");
  const userClean = user.trim();
  const passClean = pass.replace(/\s+/g, "");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: userClean, pass: passClean },
  });

  const results: Array<{ event: string; sent: number }> = [];

  for (const practice of pending) {
    // 4) 回答済みの人を特定
    let answered;
    try {
      answered = await fetchAnsweredForEvent(idToken, practice.id);
    } catch (e) {
      console.error(`出欠取得に失敗（${practice.title}）:`, e);
      continue; // この練習はスキップ（送信済みフラグも付けない＝翌日再挑戦）
    }

    // 未回答者 = 名簿のうち、ビジター以外・未回答・メール受取希望・メールあり
    const targets = members.filter((m) => {
      if (m.membershipType === "visitor") return false;
      if (!m.email) return false;
      if (!wantsEmail(m.practiceUpdates)) return false;
      const isAnswered =
        (m.id && answered.memberIds.has(m.id)) ||
        (m.name && answered.names.has(m.name));
      return !isAnswered;
    });

    if (targets.length === 0) {
      // 全員回答済み。二度と走査しないよう送信済みの印だけ付ける
      try {
        await markReminderSent(idToken, practice.id, new Date().toISOString());
      } catch (e) {
        console.error(`送信済みフラグ書き込みに失敗（${practice.title}）:`, e);
      }
      results.push({ event: practice.title, sent: 0 });
      continue;
    }

    // 5) 催促メールを送信（宛先は互いに見えない BCC）
    const dateLabel = formatDateLabel(practice.date);
    const place = practice.location ? `${practice.location}` : "";
    const timeText = practice.time ? `　${practice.time}` : "";
    const calendarUrl = `${siteUrl}/dashboard/calendar`;

    const textLines = [
      `${dateLabel} の練習について、出欠のお返事がまだ確認できていません。`,
      "",
      `【練習】${practice.title}`,
      ...(place ? [`【場所】${place}`] : []),
      ...(timeText ? [`【時間】${practice.time}`] : []),
      "",
      "お手数ですが、アプリから「参加・不参加」のお返事をお願いします。",
      "",
      `アプリで回答する: ${calendarUrl}`,
      "",
      "──────────",
      "ビックビーンズ（bigbeans）からの自動リマインドです。",
      "メール通知の停止は、アプリのマイページ →「通知設定」で変更できます。",
    ];
    const text = textLines.join("\n");

    const html = `
    <div style="font-family:-apple-system,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;max-width:560px;margin:0 auto;padding:8px;color:#1f2937;">
      <div style="background:#84cc16;color:#fff;padding:14px 18px;border-radius:14px 14px 0 0;font-weight:bold;font-size:16px;">
        出欠のお返事のお願い
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:20px 18px;">
        <p style="font-size:16px;font-weight:bold;margin:0 0 12px;line-height:1.6;">
          ${escapeHtml(dateLabel)} の練習について、<br />出欠のお返事がまだ確認できていません。
        </p>
        <div style="background:#f7fee7;border:1px solid #d9f99d;border-radius:12px;padding:12px 14px;margin:0 0 16px;font-size:15px;line-height:1.8;color:#3f6212;">
          <strong>練習：</strong>${escapeHtml(practice.title)}<br />
          ${place ? `<strong>場所：</strong>${escapeHtml(place)}<br />` : ""}
          ${practice.time ? `<strong>時間：</strong>${escapeHtml(practice.time)}` : ""}
        </div>
        <p style="font-size:15px;color:#4b5563;margin:0 0 16px;line-height:1.7;">
          お手数ですが、アプリから「参加・不参加」のお返事をお願いします。
        </p>
        <a href="${calendarUrl}" style="display:inline-block;background:#84cc16;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 24px;border-radius:10px;">アプリで回答する</a>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:18px 0;" />
        <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:0;">
          この通知はビックビーンズ（bigbeans）から自動送信されています。<br />
          メール通知の停止は、アプリのマイページ →「通知設定」からいつでも変更できます。
        </p>
      </div>
    </div>`;

    try {
      await transporter.sendMail({
        from: `ビックビーンズ <${userClean}>`,
        to: userClean, // 表向きの宛先は自分自身（宛先は BCC に隠す＝個人情報保護）
        bcc: targets.map((t) => t.email),
        subject: `【ビックビーンズ】${dateLabel} 練習の出欠をお願いします`,
        text,
        html,
      });
      // 6) 送信済みの印を付ける
      await markReminderSent(idToken, practice.id, new Date().toISOString());
      results.push({ event: practice.title, sent: targets.length });
    } catch (e) {
      console.error(`催促メール送信に失敗（${practice.title}）:`, e);
      // 送信失敗時はフラグを付けない（翌日の実行で再挑戦する）
      results.push({ event: practice.title, sent: 0 });
    }
  }

  const totalSent = results.reduce((s, r) => s + r.sent, 0);
  return NextResponse.json({ targetDate, results, sent: totalSent });
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
