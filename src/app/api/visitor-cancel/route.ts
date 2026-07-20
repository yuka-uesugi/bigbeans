import { NextResponse } from "next/server";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cancelParticipation } from "@/lib/participation";
import type { BookingConfig } from "@/lib/events";

// ─────────────────────────────────────────────
// ビジター本人による予約の取り消し（サーバー経由）
//
// なぜサーバーを通すのか:
//  未ログインのビジターに予約(reservations)の更新権限を渡すことはできない。
//  キャンセルは空き枠が出るとキャンセル待ちの先頭を自動で繰り上げる＝
//  「他人の予約を書き換える」処理を含むため、ルールを緩めると
//  誰でも他人のデータを触れてしまう。
//
//  そこでルールは触らず、ここで「ロボット役」の専用アカウントとしてログインし、
//  本人確認が取れたときだけキャンセル処理を実行する。
//
// 本人確認のしかた:
//  申し込み時に登録したメールアドレスを入力してもらい、visitorContacts と照合する。
//  visitorContacts は外部から読めない（メンバーのみ）ので、身分証の代わりになる。
// ─────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ロボット役のアカウントでログインする（すでにログイン済みなら何もしない） */
async function ensureRobotSignedIn(): Promise<void> {
  const email = process.env.FIREBASE_ROBOT_EMAIL;
  const password = process.env.FIREBASE_ROBOT_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "ロボット用ログイン設定（FIREBASE_ROBOT_EMAIL / FIREBASE_ROBOT_PASSWORD）が未設定です。"
    );
  }
  if (auth.currentUser?.email?.toLowerCase() === email.toLowerCase()) return;
  await signInWithEmailAndPassword(auth, email, password);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { eventId?: string; email?: string };
    const eventId = (body.eventId ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();

    if (!eventId || !email) {
      return NextResponse.json(
        { error: "練習の情報とメールアドレスの両方が必要です。" },
        { status: 400 }
      );
    }

    await ensureRobotSignedIn();

    // 1) この練習の申し込みの中から、入力されたメールアドレスの人を探す
    const contactsSnap = await getDocs(
      query(collection(db, "visitorContacts"), where("eventId", "==", eventId))
    );
    const matched = contactsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as { name?: string; email?: string }) }))
      .filter((c) => (c.email ?? "").trim().toLowerCase() === email);

    if (matched.length === 0) {
      return NextResponse.json(
        {
          error:
            "この練習で、そのメールアドレスの申し込みが見つかりませんでした。申し込みのときに入力したメールアドレスをご確認ください。",
        },
        { status: 404 }
      );
    }

    // 2) 練習の定員・予約ルールを読む
    const eventSnap = await getDoc(doc(db, "events", eventId));
    if (!eventSnap.exists()) {
      return NextResponse.json({ error: "練習の情報が見つかりませんでした。" }, { status: 404 });
    }
    const eventData = eventSnap.data() as {
      maxCapacity?: number;
      bookingConfig?: BookingConfig;
    };
    const maxCapacity = eventData.maxCapacity || 24;
    const config = eventData.bookingConfig ?? null;

    // 3) ロボットの権限でキャンセル（キャンセル待ちの繰り上げも通常どおり動く）
    const cancelledNames: string[] = [];
    const promotedNames: string[] = [];
    for (const c of matched) {
      const result = await cancelParticipation(
        eventId,
        { attendanceId: c.id },
        maxCapacity,
        config
      );
      cancelledNames.push(c.name ?? "お名前不明");
      if (result.promotedName) promotedNames.push(result.promotedName);
    }

    return NextResponse.json({ ok: true, cancelledNames, promotedCount: promotedNames.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取り消しに失敗しました。";
    console.error("[visitor-cancel]", message);
    return NextResponse.json(
      { error: "取り消しの処理に失敗しました。時間をおいて試すか、メールでご連絡ください。" },
      { status: 500 }
    );
  }
}
