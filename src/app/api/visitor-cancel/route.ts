import { NextResponse } from "next/server";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cancelParticipation } from "@/lib/participation";
import { notifyStaffOfVisitorReservation } from "@/lib/reservationNotify";
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
      title?: string;
      date?: string;
    };
    const maxCapacity = eventData.maxCapacity || 24;
    const config = eventData.bookingConfig ?? null;

    // 3) 「いま有効な申し込み」だけに絞る。
    //    連絡先(visitorContacts)は取り消しても消えない台帳なので、同じ練習・同じメールで
    //    何度も申し込み→取り消しをすると古い記録が残る。絞らずに全部へ取り消しをかけると、
    //    取り消し済みの分まで「取り消しました」と数えて通知を連発してしまう
    //    （2026-07-20のテストで、1回の取り消しに通知が3件届いて発覚）。
    const resSnap = await getDocs(collection(db, "events", eventId, "reservations"));
    const activeReservations = resSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as { status?: string; attendanceId?: string; uid?: string }) }))
      .filter((r) => r.status !== "cancelled");
    const attSnap = await getDocs(collection(db, "events", eventId, "attendances"));
    const attendIds = new Set(
      attSnap.docs.filter((d) => (d.data() as { status?: string }).status === "attend").map((d) => d.id)
    );
    const activeMatched = matched.filter(
      (c) =>
        activeReservations.some((r) => r.attendanceId === c.id || r.uid === c.id || r.id === c.id) ||
        attendIds.has(c.id) // 予約ルールの無い練習では出欠だけが記録されるため、出欠側も見る
    );

    if (activeMatched.length === 0) {
      return NextResponse.json(
        { error: "この申し込みは、すでに取り消し済みです。" },
        { status: 404 }
      );
    }

    // 4) ロボットの権限でキャンセル（キャンセル待ちの繰り上げも通常どおり動く）
    const cancelledNames: string[] = [];
    const promotedNames: (string | undefined)[] = [];
    for (const c of activeMatched) {
      const result = await cancelParticipation(
        eventId,
        { attendanceId: c.id },
        maxCapacity,
        config
      );
      cancelledNames.push(c.name ?? "お名前不明");
      promotedNames.push(result.promotedName);
    }

    // 運営へ通知（メール＋スタッフの端末へプッシュ）。お知らせ目的なので失敗しても取り消しは成立させる
    for (let i = 0; i < cancelledNames.length; i++) {
      await notifyStaffOfVisitorReservation({
        kind: "cancelled",
        visitorName: cancelledNames[i],
        eventTitle: eventData.title ?? "練習",
        eventDate: eventData.date ?? "",
        promotedName: promotedNames[i],
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      cancelledNames,
      promotedCount: promotedNames.filter(Boolean).length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取り消しに失敗しました。";
    console.error("[visitor-cancel]", message);
    return NextResponse.json(
      { error: "取り消しの処理に失敗しました。時間をおいて試すか、メールでご連絡ください。" },
      { status: 500 }
    );
  }
}
