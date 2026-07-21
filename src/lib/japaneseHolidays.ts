// 日本の祝日を計算する（外部ライブラリ不要・現行の祝日法に対応）。
//
// 対応している祝日:
//  - 日付固定の祝日（元日・建国記念の日・天皇誕生日 など）
//  - ハッピーマンデー（成人の日・海の日・敬老の日・スポーツの日）
//  - 春分の日・秋分の日（年ごとに変わる。1980〜2099年で有効な近似式を使用）
//  - 振替休日（祝日が日曜のとき、その後の平日を休みにする）
//  - 国民の休日（祝日と祝日に挟まれた平日を休みにする＝シルバーウィーク等）
//
// バドミントンサークルの予定表で「その日が祝日か」を色分け表示するために使う。

// 春分の日（1980〜2099年で有効な近似式）
function vernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

// 秋分の日（1980〜2099年で有効な近似式）
function autumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

// その月の「第n月曜日」の日付を返す
function nthMonday(year: number, month: number, n: number): number {
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=日, 1=月, ...
  const firstMonday = 1 + ((8 - firstDow) % 7);
  return firstMonday + (n - 1) * 7;
}

// "YYYY-MM-DD" のキーを作る
function key(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 年ごとの計算結果をキャッシュ（同じ年を何度も計算しないため）
const cache = new Map<number, Map<string, string>>();

// 指定した年の祝日を { "YYYY-MM-DD": "祝日名" } の形で返す
function getHolidaysForYear(year: number): Map<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  // 1) 基本の祝日（固定日・ハッピーマンデー・春分秋分）
  const base = new Map<string, string>();
  const add = (month: number, day: number, name: string) => base.set(key(year, month, day), name);

  add(1, 1, "元日");
  add(1, nthMonday(year, 1, 2), "成人の日");
  add(2, 11, "建国記念の日");
  if (year >= 2020) add(2, 23, "天皇誕生日");
  add(3, vernalEquinoxDay(year), "春分の日");
  add(4, 29, "昭和の日");
  add(5, 3, "憲法記念日");
  add(5, 4, "みどりの日");
  add(5, 5, "こどもの日");
  add(7, nthMonday(year, 7, 3), "海の日");
  add(8, 11, "山の日");
  add(9, nthMonday(year, 9, 3), "敬老の日");
  add(9, autumnalEquinoxDay(year), "秋分の日");
  add(10, nthMonday(year, 10, 2), "スポーツの日");
  add(11, 3, "文化の日");
  add(11, 23, "勤労感謝の日");

  // 結果（基本の祝日をコピーして、ここに振替・国民の休日を足す）
  const result = new Map(base);

  // 2) 国民の休日（基本の祝日と祝日に挟まれた平日）
  //    1/1〜12/31を1日ずつ見て、前後が両方とも基本の祝日で、その日が祝日でない平日なら追加
  const oneDay = 24 * 60 * 60 * 1000;
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d = new Date(d.getTime() + oneDay)) {
    const k = key(year, d.getMonth() + 1, d.getDate());
    if (base.has(k)) continue;
    if (d.getDay() === 0) continue; // 日曜は対象外
    const prev = new Date(d.getTime() - oneDay);
    const next = new Date(d.getTime() + oneDay);
    const kPrev = key(prev.getFullYear(), prev.getMonth() + 1, prev.getDate());
    const kNext = key(next.getFullYear(), next.getMonth() + 1, next.getDate());
    if (base.has(kPrev) && base.has(kNext)) {
      result.set(k, "国民の休日");
    }
  }

  // 3) 振替休日（基本の祝日が日曜のとき、その後の最初の「祝日でない日」を休みにする）
  for (const k of base.keys()) {
    const [y, m, dd] = k.split("-").map(Number);
    const date = new Date(y, m - 1, dd);
    if (date.getDay() !== 0) continue; // 日曜だけが対象
    let cursor = new Date(date.getTime() + oneDay);
    // すでに祝日（基本 or 国民の休日）ならさらに次の日へ
    while (result.has(key(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()))) {
      cursor = new Date(cursor.getTime() + oneDay);
    }
    result.set(key(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()), "振替休日");
  }

  cache.set(year, result);
  return result;
}

// 指定した日が祝日ならその名前を、祝日でなければ null を返す
export function getHolidayName(year: number, month: number, day: number): string | null {
  return getHolidaysForYear(year).get(key(year, month, day)) ?? null;
}
