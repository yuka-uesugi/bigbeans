/**
 * Googleカレンダーへの追加URL生成ユーティリティ
 *
 * Googleカレンダーは `/calendar/render?action=TEMPLATE` でURLパラメータから
 * 予定作成画面を初期化できる。日時は UTC の `YYYYMMDDTHHmmssZ` 形式。
 */

interface GoogleCalendarEventInput {
  title: string;
  /** "2026-05-06" 形式 */
  date: string;
  /** "9:00-12:00" 形式（"-" 区切り、24時間表記） */
  time: string;
  location?: string;
  description?: string;
}

/** "9:00" や "13:30" を { h, m } に */
function parseTime(t: string): { h: number; m: number } {
  const [hStr, mStr] = t.trim().split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  return { h, m };
}

/** 日本時間の Date を UTC 形式 YYYYMMDDTHHmmssZ にフォーマット */
function toGCalUTC(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
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

/**
 * Googleカレンダー用の追加URLを生成する
 */
export function buildGoogleCalendarUrl(event: GoogleCalendarEventInput): string {
  const [y, mo, d] = event.date.split("-").map(Number);

  // 時刻をパース。"9:00-12:00" 形式
  let startDate: Date;
  let endDate: Date;
  if (event.time && event.time.includes("-")) {
    const [startStr, endStr] = event.time.split("-").map((s) => s.trim());
    const { h: sh, m: sm } = parseTime(startStr);
    const { h: eh, m: em } = parseTime(endStr);
    // JST(+9) として解釈し、UTC に変換するため -9 する
    startDate = new Date(Date.UTC(y, mo - 1, d, sh - 9, sm));
    endDate = new Date(Date.UTC(y, mo - 1, d, eh - 9, em));
  } else {
    // 時間不明：終日扱い
    startDate = new Date(Date.UTC(y, mo - 1, d));
    endDate = new Date(Date.UTC(y, mo - 1, d, 23, 59));
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGCalUTC(startDate)}/${toGCalUTC(endDate)}`,
  });

  if (event.location) params.set("location", event.location);
  if (event.description) params.set("details", event.description);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
