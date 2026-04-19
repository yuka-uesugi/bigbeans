import { ClubSettings } from "./settings";
import { Member } from "@/data/memberList";

export type FeeCalculationResult = {
  durationHours: number;
  hasCoach: boolean;
  baseFee: number;
  label: string; // 料金の内訳理由など
};

/**
 * 練習時間（"13:00 - 17:00" のような文字列）から時間を計算する
 */
export function calculateDurationStr(timeStr: string): number {
  if (!timeStr || !timeStr.includes("-")) return 3; // デフォルト3時間
  
  try {
    const [start, end] = timeStr.split("-").map(s => s.trim());
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    
    const startObj = new Date();
    startObj.setHours(startH, startM, 0);
    
    const endObj = new Date();
    endObj.setHours(endH, endM, 0);
    
    const diffHours = (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60);
    return Math.round(diffHours * 10) / 10;
  } catch (e) {
    return 3;
  }
}

/**
 * あるメンバーのイベント単位（都度払い）での参加費を計算する
 * 
 * @param member メンバー情報（会員種別など） nullの場合はビジター扱い
 * @param eventTime イベントの時間文字列 (例: "13:00-17:00")
 * @param settings クラブの料金マスター
 * @param hasCoach コーチが参加しているかどうか
 * @returns 計算結果
 */
export function calculateAttendanceFee(
  member: Member | null | undefined,
  eventTime: string,
  settings: ClubSettings | null,
  hasCoach: boolean
): FeeCalculationResult {
  const durationHours = calculateDurationStr(eventTime);
  
  if (!settings) {
    return { durationHours, hasCoach, baseFee: 0, label: "ー (設定未ロード)" };
  }

  // 自動判別（オフィシャルとコーチは毎回0円）
  const membershipType = member?.membershipType || "visitor";

  if (membershipType === "official") {
    return { durationHours, hasCoach, baseFee: 0, label: "オフィシャル無料 (月謝制)" };
  }
  if (membershipType === "coach") {
    return { durationHours, hasCoach, baseFee: 0, label: "コーチ (無料)" };
  }

  const { fees } = settings;
  let fee = 0;
  let typeLabel = membershipType === "light" ? "ライト" : "ビジター";
  let coachLabel = hasCoach ? "コーチ有" : "コーチ無";
  let timeLabel = `${durationHours}時間`;

  // 料金テーブルは3時間と4時間のみなので、それにマッピング（2時間は3時間料金とするか手動にするため、一旦3時間料金をベースとする。本来は要確認だが実装をシンプルにする）
  const use4hFee = durationHours >= 4;

  if (membershipType === "light") {
    if (use4hFee) {
      fee = hasCoach ? fees.light4hCoach : fees.light4hNoCoach;
    } else {
      fee = hasCoach ? fees.light3hCoach : fees.light3hNoCoach;
    }
  } else {
    // メンバー登録がない = visitor
    if (use4hFee) {
      fee = hasCoach ? fees.visitor4hCoach : fees.visitor4hNoCoach;
    } else {
      fee = hasCoach ? fees.visitor3hCoach : fees.visitor3hNoCoach;
    }
  }

  return {
    durationHours,
    hasCoach,
    baseFee: fee,
    label: `${typeLabel}・${timeLabel}・${coachLabel}`
  };
}
