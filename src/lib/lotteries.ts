import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// あみだくじ
//
// ・対象者（オフィシャル＋ライト全員が基本）が、各自のスマホで
//   期限までに縦線を1本選んで「引く」。
// ・期限までに引かなかった人は自動的に「当たり（負け）」になる。
// ・期限が来るか全員が引いたら結果を確定し、あみだの線をたどって発表する。
// ・横線（あみだの形）は作成時に決めて保存する（後から変わらない＝公平）。
// ─────────────────────────────────────────────

export interface LotteryTarget {
  memberId: string; // 名簿(members)の会員番号を文字列で
  name: string;
}

/** あみだの横線1本。level 段目で、col 番目と col+1 番目の縦線を結ぶ */
export interface LotteryRung {
  level: number;
  col: number;
}

export interface LotteryWinner {
  memberId: string;
  name: string;
  via: "kuji" | "undrawn"; // kuji=あみだの結果 / undrawn=期限までに引かなかった
}

export interface LotteryData {
  id: string;
  title: string;
  winnersCount: number;      // 当たり（負け）の人数
  deadline: Timestamp;       // くじを引く締切
  targets: LotteryTarget[];  // 対象者
  slots: Record<string, number>; // memberId → 選んだ縦線の番号（引いた人のみ）
  rungs: LotteryRung[];      // あみだの横線
  levels: number;            // 横線の段数
  status: "open" | "finished";
  winners?: LotteryWinner[];
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp;
  finishedAt?: Timestamp;
}

const COLLECTION = "lotteries";

// ─────────────────────────────────────────────
// 読み取り
// ─────────────────────────────────────────────

export function subscribeToLotteries(
  callback: (items: LotteryData[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as LotteryData[]),
    () => callback([])
  );
}

// ─────────────────────────────────────────────
// あみだの形の生成・トレース
// ─────────────────────────────────────────────

/**
 * あみだの横線をランダムに生成する。
 * 同じ段で隣り合う横線は作らない（線が交差しないあみだくじの基本ルール）。
 */
export function generateRungs(columns: number): { rungs: LotteryRung[]; levels: number } {
  const levels = Math.max(10, columns * 2);
  const rungs: LotteryRung[] = [];
  for (let level = 1; level <= levels; level++) {
    let col = 0;
    while (col < columns - 1) {
      if (Math.random() < 0.35) {
        rungs.push({ level, col });
        col += 2; // 隣の横線と繋がらないように1列飛ばす
      } else {
        col += 1;
      }
    }
  }
  return { rungs, levels };
}

/** 縦線 startCol の上から下までたどったときの、通過点の列番号を段ごとに返す（アニメーション用） */
export function tracePath(
  rungs: LotteryRung[],
  levels: number,
  startCol: number
): { col: number; level: number }[] {
  const points: { col: number; level: number }[] = [{ col: startCol, level: 0 }];
  let col = startCol;
  for (let level = 1; level <= levels; level++) {
    if (rungs.some((r) => r.level === level && r.col === col)) {
      points.push({ col, level });
      col += 1;
      points.push({ col, level });
    } else if (rungs.some((r) => r.level === level && r.col === col - 1)) {
      points.push({ col, level });
      col -= 1;
      points.push({ col, level });
    }
  }
  points.push({ col, level: levels + 1 });
  return points;
}

/** 縦線 startCol からたどった着地位置（一番下の列番号） */
export function traceColumn(rungs: LotteryRung[], levels: number, startCol: number): number {
  const path = tracePath(rungs, levels, startCol);
  return path[path.length - 1].col;
}

// ─────────────────────────────────────────────
// 作成・引く・確定・削除
// ─────────────────────────────────────────────

export async function createLottery(data: {
  title: string;
  winnersCount: number;
  deadline: Date;
  targets: LotteryTarget[];
  createdByUid: string;
  createdByName: string;
}): Promise<string> {
  const { rungs, levels } = generateRungs(data.targets.length);
  const ref = await addDoc(collection(db, COLLECTION), {
    title: data.title,
    winnersCount: data.winnersCount,
    deadline: Timestamp.fromDate(data.deadline),
    targets: data.targets,
    slots: {},
    rungs,
    levels,
    status: "open",
    createdByUid: data.createdByUid,
    createdByName: data.createdByName,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/**
 * くじを引く（空いている縦線を1本選ぶ）。
 * 同時に同じ線を選んでしまわないよう、トランザクションで確認してから保存する。
 */
export async function drawSlot(lotteryId: string, memberId: string, col: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, COLLECTION, lotteryId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("くじが見つかりません");
    const data = snap.data() as LotteryData;
    if (data.status !== "open") throw new Error("このくじはすでに終了しています");
    const slots = data.slots ?? {};
    if (slots[memberId] !== undefined) throw new Error("すでに引いています");
    if (Object.values(slots).includes(col)) {
      throw new Error("その線はたった今ほかの人が選びました。別の線を選んでください");
    }
    tx.update(ref, { [`slots.${memberId}`]: col });
  });
}

/** 配列をランダムに並べ替える（未回答者が多すぎる場合の抽選用） */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 結果を確定する。期限が来たとき（または全員が引いたとき）に呼ぶ。
 * 当たりの決め方：
 *  1. 期限までに引かなかった人が優先的に「当たり」（引かないと負けルール）
 *  2. 未回答だけで足りない分は、あみだの着地位置が左から順に「当たり」
 *  3. 未回答が当たり人数より多い場合は、未回答者の中から抽選
 * すでに確定済みなら何もしない。確定できたら true を返す（通知の重複送信防止用）。
 */
export async function finalizeLottery(lotteryId: string): Promise<LotteryWinner[] | null> {
  let result: LotteryWinner[] | null = null;
  await runTransaction(db, async (tx) => {
    const ref = doc(db, COLLECTION, lotteryId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as LotteryData;
    if (data.status !== "open") return;

    const slots = data.slots ?? {};
    const drawn = data.targets.filter((t) => slots[t.memberId] !== undefined);
    const undrawn = data.targets.filter((t) => slots[t.memberId] === undefined);

    let winners: LotteryWinner[];
    if (undrawn.length >= data.winnersCount) {
      // 引かなかった人だけで当たり人数に達している → その中から抽選（同数ならそのまま全員）
      winners = shuffle(undrawn)
        .slice(0, data.winnersCount)
        .map((t) => ({ memberId: t.memberId, name: t.name, via: "undrawn" as const }));
    } else {
      winners = undrawn.map((t) => ({ memberId: t.memberId, name: t.name, via: "undrawn" as const }));
      const need = data.winnersCount - undrawn.length;
      const ranked = drawn
        .map((t) => ({ t, land: traceColumn(data.rungs, data.levels, slots[t.memberId]) }))
        .sort((a, b) => a.land - b.land);
      winners.push(
        ...ranked.slice(0, need).map(({ t }) => ({ memberId: t.memberId, name: t.name, via: "kuji" as const }))
      );
    }

    tx.update(ref, { status: "finished", winners, finishedAt: Timestamp.now() });
    result = winners;
  });
  return result;
}

/** くじを削除する（作成者本人か管理者・サポーターのみ。呼び出し側で確認を取ること） */
export async function deleteLottery(lotteryId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, lotteryId));
}
