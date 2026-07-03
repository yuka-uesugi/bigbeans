import { Member } from "@/data/memberList";
import type { MembershipType } from "./attendances";

// ─────────────────────────────────────────────
// 会員種別の「月ごとの適用」ルール
//
// ・種別変更は月単位（月の初めから適用）。
// ・名簿(members)の membershipHistory に
//   「YYYY-MM の月から type になった」という履歴を持つ。
// ・料金計算は「参加ボタンを押した日」ではなく
//   「練習日がどの月か × その月のその人の種別」で行う。
// ─────────────────────────────────────────────

/** 会員種別の変更履歴の1件分（from は "YYYY-MM"） */
export interface MembershipHistoryEntry {
  type: MembershipType;
  from: string;
}

/** Date → "YYYY-MM" */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" などの日付文字列 → "YYYY-MM"（読めなければ null） */
export function monthOfDateStr(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})-(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

/** "YYYY-MM" に n ヶ月足す */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

/** "YYYY-MM" → "2026年8月" のような表示 */
export function formatMonthJa(month: string | undefined | null): string {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${y}年${m}月`;
}

/**
 * 種別履歴から「その月に有効な種別」を求める。
 * 履歴が無い場合や、その月より前の履歴が1件も無い場合は null
 * （＝履歴からは判定できない。呼び出し側でフォールバックする）。
 */
export function typeFromHistory(
  member: Pick<Member, "membershipHistory"> | null | undefined,
  month: string
): MembershipType | null {
  const history = member?.membershipHistory;
  if (!history || history.length === 0) return null;
  let result: MembershipHistoryEntry | null = null;
  for (const entry of history) {
    if (!entry?.from || !entry?.type) continue;
    if (entry.from <= month && (!result || entry.from > result.from)) {
      result = entry;
    }
  }
  return result ? result.type : null;
}

/**
 * 練習の料金・バッジ計算に使う会員種別を決める。優先順位:
 *  1. 名簿の種別履歴（練習日の月で判定）… 月単位の変更を正しく反映する
 *  2. 出欠データに保存された種別（参加ボタンを押した時点のスナップショット）
 *  3. 名簿の現在の種別
 */
export function resolveMembershipTypeForEvent(
  member: Member | null | undefined,
  snapshotType: MembershipType | undefined,
  eventDateStr: string | undefined | null
): MembershipType | undefined {
  const month = monthOfDateStr(eventDateStr);
  if (month && member) {
    const fromHistory = typeFromHistory(member, month);
    if (fromHistory) return fromHistory;
  }
  return snapshotType ?? member?.membershipType ?? undefined;
}

// ─────────────────────────────────────────────
// 年度のルール：ビックビーンズの年度は「2月始まり」（2月〜翌1月）。
// 年度更新（継続・種別変更）は年末ごろに申請し、翌年度の2月から適用される。
// ─────────────────────────────────────────────

/** 今年度の開始月（"YYYY-02"）。1月は前年2月始まりの年度に属する。 */
export function currentFiscalYearStart(today: Date = new Date()): string {
  const year = today.getMonth() + 1 >= 2 ? today.getFullYear() : today.getFullYear() - 1;
  return `${year}-02`;
}

/** 来年度の開始月（"YYYY-02"）。年度更新の種別変更はこの月から適用する。 */
export function nextFiscalYearStart(today: Date = new Date()): string {
  return addMonths(currentFiscalYearStart(today), 12);
}

/**
 * 申請の締切ルール：「適用月の前月25日まで」に申請が必要。
 * 今日申請した場合に選べる、いちばん早い適用月("YYYY-MM")を返す。
 * 例）7月3日に申請 → 8月から適用OK。7月26日に申請 → 9月から。
 */
export function earliestEffectiveMonth(today: Date = new Date()): string {
  const base = new Date(today.getFullYear(), today.getMonth(), 1);
  base.setMonth(base.getMonth() + (today.getDate() <= 25 ? 1 : 2));
  return monthKey(base);
}
