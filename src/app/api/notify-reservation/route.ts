import { NextResponse } from "next/server";
import { notifyStaffOfVisitorReservation } from "@/lib/reservationNotify";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─────────────────────────────────────────────
// ビジターが予約したことを運営に知らせるAPI
//   呼び出し元: ビジターモードの参加登録が成功した直後（EventDetail / NextPracticeDetail）
//
// ビジターは未ログインで IDトークンが無いため、代わりに
// 「その予約が本当にFirestoreに存在するか」を確認してから通知する。
// （予約(reservations)とイベント(events)は誰でも読める設定なので、認証なしで照合できる。
//   存在しない予約では通知が送れないため、いたずらの通知連打はできない）
// ─────────────────────────────────────────────

const PROJECT_ID = "team-management-service";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type Body = { eventId?: string; name?: string };

/** "[V] 田中" → "田中" */
const stripV = (s: string) => s.replace(/^\[V\] /, "");

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const eventId = (body.eventId ?? "").trim();
  const name = stripV((body.name ?? "").trim());
  if (!eventId || !name) {
    return NextResponse.json({ error: "練習の情報とお名前が必要です。" }, { status: 400 });
  }

  try {
    // 1) 予約が本当に存在するか照合（誰でも読める公開データなので認証不要）
    const resListRes = await fetch(
      `${FIRESTORE_BASE}/events/${encodeURIComponent(eventId)}/reservations?pageSize=300`,
      { cache: "no-store" }
    );
    if (!resListRes.ok) {
      return NextResponse.json({ error: "予約の確認に失敗しました。" }, { status: 500 });
    }
    const resList = (await resListRes.json()) as {
      documents?: Array<{ fields?: Record<string, { stringValue?: string }> }>;
    };
    const found = (resList.documents ?? [])
      .map((d) => ({
        name: stripV(d.fields?.name?.stringValue ?? ""),
        status: d.fields?.status?.stringValue ?? "",
        memberType: d.fields?.memberType?.stringValue ?? "",
      }))
      .find(
        (r) =>
          r.name === name &&
          r.status !== "cancelled" &&
          (r.memberType === "visitor" ||
            r.memberType === "invited_official" ||
            r.memberType === "invited_light")
      );
    if (!found) {
      return NextResponse.json({ error: "該当する予約が見つかりませんでした。" }, { status: 404 });
    }

    // 2) 練習の情報（タイトル・日付）を読む
    const evRes = await fetch(`${FIRESTORE_BASE}/events/${encodeURIComponent(eventId)}`, {
      cache: "no-store",
    });
    const evJson = (await evRes.json()) as {
      fields?: Record<string, { stringValue?: string }>;
    };
    const eventTitle = evJson.fields?.title?.stringValue ?? "練習";
    const eventDate = evJson.fields?.date?.stringValue ?? "";

    // 3) 運営へ通知（メール＋スタッフの端末へプッシュ）
    const result = await notifyStaffOfVisitorReservation({
      kind: found.status === "waitlisted" ? "waitlisted" : "confirmed",
      visitorName: name,
      eventTitle,
      eventDate,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[notify-reservation]", e instanceof Error ? e.message : e);
    // 通知はお知らせ目的。失敗しても予約自体は成立しているので 200 で返さず 500 だけ返す
    return NextResponse.json({ error: "通知の送信に失敗しました。" }, { status: 500 });
  }
}
