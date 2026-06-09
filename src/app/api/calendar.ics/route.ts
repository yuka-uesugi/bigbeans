import { NextResponse } from "next/server";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventData } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 練習カレンダーの ICS フィード
 *
 * Googleカレンダーで「他のカレンダーを追加 → URL から追加」に
 * https://bigbeans.vercel.app/api/calendar.ics を貼り付けると
 * 全ての練習・試合・イベントが自動同期される
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "9:00" / "13:30" → { h, m } */
function parseTime(t: string): { h: number; m: number } {
  const [hStr, mStr] = (t || "").trim().split(":");
  return { h: Number(hStr) || 0, m: Number(mStr) || 0 };
}

/** Date を ICS の UTC 形式 YYYYMMDDTHHmmssZ に */
function toICSUTC(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/** ICS の改行・特殊文字エスケープ */
function escapeICS(text: string): string {
  return (text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildEventBlock(evt: EventData): string {
  const [y, mo, d] = evt.date.split("-").map(Number);

  let dtStart: string;
  let dtEnd: string;

  if (evt.time && evt.time.includes("-")) {
    const [startStr, endStr] = evt.time.split("-").map((s) => s.trim());
    const { h: sh, m: sm } = parseTime(startStr);
    const { h: eh, m: em } = parseTime(endStr);
    // JST(+9) を UTC に変換
    const startDate = new Date(Date.UTC(y, mo - 1, d, sh - 9, sm));
    const endDate = new Date(Date.UTC(y, mo - 1, d, eh - 9, em));
    dtStart = `DTSTART:${toICSUTC(startDate)}`;
    dtEnd = `DTEND:${toICSUTC(endDate)}`;
  } else {
    // 時刻不明：終日扱い
    dtStart = `DTSTART;VALUE=DATE:${y}${pad(mo)}${pad(d)}`;
    dtEnd = `DTEND;VALUE=DATE:${y}${pad(mo)}${pad(d)}`;
  }

  const summary = escapeICS(evt.title || "練習");
  const location = escapeICS(evt.location || "");
  const description = escapeICS(evt.description || "");
  const uid = `${evt.id}@bigbeans.vercel.app`;
  const dtstamp = toICSUTC(new Date());

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : "",
    description ? `DESCRIPTION:${description}` : "",
    "END:VEVENT",
  ].filter(Boolean).join("\r\n");
}

export async function GET() {
  try {
    // 過去30日〜未来1年分を出力
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date(today);
    toDate.setFullYear(toDate.getFullYear() + 1);

    const fromStr = `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`;
    const toStr = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`;

    const q = query(
      collection(db, "events"),
      where("date", ">=", fromStr),
      where("date", "<=", toStr),
      orderBy("date", "asc")
    );

    const snap = await getDocs(q);
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as EventData[];

    const eventBlocks = events.map(buildEventBlock).join("\r\n");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Big Beans//Practice Calendar//JA",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Big Beans 練習カレンダー",
      "X-WR-TIMEZONE:Asia/Tokyo",
      "X-WR-CALDESC:バドミントンチーム Big Beans の練習・試合・イベント予定",
      eventBlocks,
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="bigbeans.ics"',
        "Cache-Control": "public, max-age=300", // 5分キャッシュ
      },
    });
  } catch (err) {
    console.error("ICS feed error:", err);
    return NextResponse.json({ error: "Failed to generate ICS" }, { status: 500 });
  }
}
