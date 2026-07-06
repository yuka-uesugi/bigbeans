"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberByEmail, getAllMembers } from "@/lib/members";
import { createBroadcast } from "@/lib/notifications";
import type { Member } from "@/data/memberList";
import {
  subscribeToLotteries,
  createLottery,
  drawSlot,
  finalizeLottery,
  deleteLottery,
  tracePath,
  traceColumn,
  type LotteryData,
  type LotteryTarget,
} from "@/lib/lotteries";

// ─────────────────────────────────────────────
// あみだくじページ
// ・作成：対象はオフィシャル＋ライト全員（外すことも可能）、当たり人数と締切を指定
// ・各自が期限までに縦線を選んで引く。引かないと自動的に「当たり（負け）」
// ・期限が来るか全員引いたら結果発表（あみだの線をたどるアニメーション付き）
// ─────────────────────────────────────────────

function formatDeadline(ts: LotteryData["deadline"]): string {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}時${d.getMinutes() > 0 ? String(d.getMinutes()).padStart(2, "0") + "分" : ""}`;
}

export default function LotteryPage() {
  const { user, role } = useAuth();
  const [myMember, setMyMember] = useState<Member | null>(null);
  const [myName, setMyName] = useState("");
  const [lotteries, setLotteries] = useState<LotteryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 同じくじを二重に確定しないためのメモ
  const finalizing = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.email) return;
    getMemberByEmail(user.email).then((m) => {
      if (m) {
        setMyMember(m);
        setMyName(m.name);
      } else {
        setMyName(user.displayName ?? "");
      }
    });
  }, [user]);

  useEffect(() => {
    const unsub = subscribeToLotteries((items) => {
      setLotteries(items);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // 締切が過ぎた、または全員が引いたくじを自動で確定する
  useEffect(() => {
    const now = Date.now();
    lotteries.forEach((l) => {
      if (l.status !== "open") return;
      const slots = l.slots ?? {};
      const allDrawn = l.targets.length > 0 && l.targets.every((t) => slots[t.memberId] !== undefined);
      const passed = l.deadline?.toDate ? l.deadline.toDate().getTime() <= now : false;
      if ((allDrawn || passed) && !finalizing.current.has(l.id)) {
        finalizing.current.add(l.id);
        finalizeLottery(l.id)
          .then((winners) => {
            // このブラウザで確定できた場合だけ、結果を全員に通知する（重複防止）
            if (winners) {
              void createBroadcast({
                type: "announcement",
                title: `あみだくじ結果：${l.title}`,
                body: `当たりは ${winners.map((w) => w.name).join("・")} さんです`,
                link: "/dashboard/lottery",
                createdByName: myName || "あみだくじ",
              });
            }
          })
          .catch(() => {});
      }
    });
  }, [lotteries, myName]);

  const selected = lotteries.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ag-gray-900">あみだくじ</h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            幹事決めなどの抽選に。期限までに引かないと自動的に「当たり」になります
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 text-sm font-black rounded-xl bg-ag-lime-500 text-white hover:bg-ag-lime-600 transition-colors shadow-sm"
        >
          新しいくじを作る
        </button>
      </div>

      {/* 一覧 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ag-lime-500" />
        </div>
      ) : lotteries.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-ag-gray-200">
          <p className="text-ag-gray-400 font-bold">まだくじがありません。「新しいくじを作る」から始めましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lotteries.map((l) => {
            const slots = l.slots ?? {};
            const drawnCount = l.targets.filter((t) => slots[t.memberId] !== undefined).length;
            const isFinished = l.status === "finished";
            const myId = myMember ? String(myMember.id) : "";
            const isMyTurn =
              !isFinished && l.targets.some((t) => t.memberId === myId) && slots[myId] === undefined;
            return (
              <div
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className="bg-white rounded-3xl border border-ag-gray-100 shadow-md p-5 hover:border-ag-lime-200 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    isFinished ? "bg-ag-gray-100 text-ag-gray-500" : "bg-ag-lime-100 text-ag-lime-700"
                  }`}>
                    {isFinished ? "結果発表" : "受付中"}
                  </span>
                  {isMyTurn && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500 text-white animate-pulse">
                      未回答：引いてください
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-ag-gray-800">{l.title}</h3>
                {isFinished && l.winners ? (
                  <p className="text-sm font-bold text-red-600 mt-2">
                    当たり：{l.winners.map((w) => w.name).join("・")} さん
                  </p>
                ) : (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-bold text-ag-gray-500">
                      {drawnCount} / {l.targets.length} 人が引きました
                    </p>
                    <p className="text-xs text-ag-gray-400">締切：{formatDeadline(l.deadline)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateLotteryModal
          myUid={user?.uid ?? ""}
          myName={myName}
          onClose={() => setShowCreate(false)}
        />
      )}

      {selected && (
        <LotteryDetailModal
          lottery={selected}
          myMember={myMember}
          canManage={role === "admin" || role === "supporter" || selected.createdByUid === user?.uid}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 作成モーダル
// ─────────────────────────────────────────────
function CreateLotteryModal({
  myUid, myName, onClose,
}: {
  myUid: string;
  myName: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [winnersCount, setWinnersCount] = useState(2);
  // 締切の初期値：3日後の21時
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [deadlineDate, setDeadlineDate] = useState(defaultDate);
  const [deadlineHour, setDeadlineHour] = useState(21);
  const [candidates, setCandidates] = useState<LotteryTarget[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 対象者：オフィシャル＋ライトの全員（種別未設定はオフィシャル扱いで含める）
  useEffect(() => {
    getAllMembers().then((members) => {
      const list = members
        .filter((m) => !m.membershipType || m.membershipType === "official" || m.membershipType === "light")
        .sort((a, b) => a.id - b.id)
        .map((m) => ({ memberId: String(m.id), name: m.name }));
      setCandidates(list);
    }).catch(() => {});
  }, []);

  const targets = candidates.filter((c) => !excluded.has(c.memberId));

  const toggleExclude = (memberId: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || targets.length < 2 || winnersCount >= targets.length) return;
    setIsSubmitting(true);
    try {
      const [y, m, d] = deadlineDate.split("-").map(Number);
      const deadline = new Date(y, m - 1, d, deadlineHour, 0, 0);
      await createLottery({
        title: title.trim(),
        winnersCount,
        deadline,
        targets,
        createdByUid: myUid,
        createdByName: myName,
      });
      void createBroadcast({
        type: "announcement",
        title: `あみだくじ開始：${title.trim()}`,
        body: `締切（${m}月${d}日 ${deadlineHour}時）までにくじを引いてください。引かないと自動的に当たりになります`,
        link: "/dashboard/lottery",
        createdByName: myName,
      });
      onClose();
    } catch {
      alert("くじの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 bg-gradient-to-br from-ag-lime-500 to-emerald-600 text-white px-6 py-5 rounded-t-3xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">新しいあみだくじ</h2>
            <p className="text-xs text-white/70 mt-1">作成すると全員に通知が届きます</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm shrink-0" aria-label="閉じる">✕</button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">タイトル *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：忘年会の幹事決め"
              className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-3 text-base font-bold outline-none focus:ring-2 focus:ring-ag-lime-300"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">当たり（負け）の人数</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setWinnersCount(n)}
                  className={`py-3 rounded-xl text-base font-black border-2 transition-all ${
                    winnersCount === n
                      ? "border-ag-lime-500 bg-ag-lime-50 text-ag-lime-700"
                      : "border-ag-gray-100 bg-white text-ag-gray-500 hover:bg-ag-gray-50"
                  }`}>
                  {n}名
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">くじを引く締切</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="flex-1 bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-3 text-sm font-bold outline-none"
              />
              <select
                value={deadlineHour}
                onChange={(e) => setDeadlineHour(Number(e.target.value))}
                className="bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-3 text-sm font-bold outline-none"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h}時</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-ag-gray-400 mt-2 leading-relaxed">
              締切までに引かなかった人は、自動的に「当たり」になります。
            </p>
          </div>

          <div>
            <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">
              参加する人（{targets.length}名） — タップで外す/戻す
            </label>
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-3 bg-ag-gray-50 rounded-2xl border border-ag-gray-100">
              {candidates.length === 0 ? (
                <p className="text-xs text-ag-gray-400">名簿を読み込み中...</p>
              ) : candidates.map((c) => {
                const isExcluded = excluded.has(c.memberId);
                return (
                  <button key={c.memberId} onClick={() => toggleExclude(c.memberId)}
                    className={`text-xs font-bold px-3 py-2 rounded-full border-2 transition-all ${
                      isExcluded
                        ? "bg-white text-ag-gray-300 border-ag-gray-100 line-through"
                        : "bg-ag-lime-50 text-ag-lime-700 border-ag-lime-200"
                    }`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {winnersCount >= targets.length && targets.length > 0 && (
            <p className="text-xs font-bold text-red-500">当たりの人数が参加者より多くなっています</p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-ag-gray-400 border border-ag-gray-100 rounded-xl">キャンセル</button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || targets.length < 2 || winnersCount >= targets.length || isSubmitting}
              className="flex-[2] py-3 bg-ag-lime-500 text-white rounded-xl text-sm font-black hover:bg-ag-lime-600 shadow-lg disabled:opacity-40"
            >
              {isSubmitting ? "作成中..." : "くじを作って全員に知らせる"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// くじ詳細モーダル（引く・結果発表）
// ─────────────────────────────────────────────
const COL_W = 64;       // 縦線の間隔
const LEVEL_H = 24;     // 横線1段の高さ
const TOP_PAD = 52;     // 上の名前ラベル分
const BOTTOM_PAD = 44;  // 下の番号・当たりマーク分
const SIDE_PAD = 36;

function LotteryDetailModal({
  lottery, myMember, canManage, onClose,
}: {
  lottery: LotteryData;
  myMember: Member | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const [traceFrom, setTraceFrom] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const slots = useMemo(() => lottery.slots ?? {}, [lottery.slots]);
  const n = lottery.targets.length;
  const isFinished = lottery.status === "finished";
  const myId = myMember ? String(myMember.id) : "";
  const isTarget = lottery.targets.some((t) => t.memberId === myId);
  const mySlot = slots[myId];
  const undrawn = lottery.targets.filter((t) => slots[t.memberId] === undefined);

  // 列番号 → 引いた人（いれば）
  const colOwner: Record<number, string> = {};
  Object.entries(slots).forEach(([memberId, col]) => {
    const t = lottery.targets.find((x) => x.memberId === memberId);
    if (t) colOwner[col] = t.name;
  });

  // 結果発表後：あみだの結果で当たった人の着地列に「当」マークを付ける
  const winningCols = useMemo(() => {
    if (!isFinished || !lottery.winners) return new Set<number>();
    const cols = new Set<number>();
    lottery.winners.forEach((w) => {
      if (w.via === "kuji" && slots[w.memberId] !== undefined) {
        cols.add(traceColumn(lottery.rungs, lottery.levels, slots[w.memberId]));
      }
    });
    return cols;
  }, [isFinished, lottery, slots]);

  const width = SIDE_PAD * 2 + (n - 1) * COL_W;
  const height = TOP_PAD + (lottery.levels + 1) * LEVEL_H + BOTTOM_PAD;
  const x = (col: number) => SIDE_PAD + col * COL_W;
  const y = (level: number) => TOP_PAD + level * LEVEL_H;

  // アニメーション用の経路
  const tracePoints = useMemo(() => {
    if (traceFrom === null) return null;
    return tracePath(lottery.rungs, lottery.levels, traceFrom).map((p) => ({ px: x(p.col), py: y(p.level) }));
  }, [traceFrom, lottery.rungs, lottery.levels]);

  const traceLength = useMemo(() => {
    if (!tracePoints) return 0;
    let len = 0;
    for (let i = 1; i < tracePoints.length; i++) {
      len += Math.abs(tracePoints[i].px - tracePoints[i - 1].px) + Math.abs(tracePoints[i].py - tracePoints[i - 1].py);
    }
    return len;
  }, [tracePoints]);

  const handlePickColumn = async (col: number) => {
    if (isFinished) {
      // 結果発表後は、引いた線をタップするとたどるアニメーションを再生
      if (colOwner[col]) setTraceFrom(col);
      return;
    }
    if (!isTarget || mySlot !== undefined || !myMember) return;
    if (colOwner[col]) return; // 使用済みの線
    if (!confirm(`左から ${col + 1} 番目の線でくじを引きますか？\n一度引くと変更できません。`)) return;
    setIsDrawing(true);
    try {
      await drawSlot(lottery.id, myId, col);
    } catch (e) {
      alert(e instanceof Error ? e.message : "くじを引けませんでした");
    } finally {
      setIsDrawing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`「${lottery.title}」を削除しますか？`)) return;
    try {
      await deleteLottery(lottery.id);
      onClose();
    } catch {
      alert("削除に失敗しました");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <style>{`@keyframes amida-dash { to { stroke-dashoffset: 0; } }`}</style>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 bg-ag-gray-900 text-white px-6 py-5 rounded-t-3xl flex items-center justify-between">
          <div>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
              isFinished ? "bg-white/20 text-white" : "bg-ag-lime-400 text-ag-gray-900"
            }`}>
              {isFinished ? "結果発表" : "受付中"}
            </span>
            <h2 className="text-lg font-black mt-1">{lottery.title}</h2>
            {!isFinished && (
              <p className="text-xs text-white/60">締切：{formatDeadline(lottery.deadline)}</p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm shrink-0" aria-label="閉じる">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* 結果発表 */}
          {isFinished && lottery.winners && (
            <div className="p-5 bg-red-50 rounded-2xl border-2 border-red-100 text-center">
              <p className="text-[10px] font-extrabold text-red-400 uppercase mb-2">当たり（{lottery.winnersCount}名）</p>
              <p className="text-2xl font-black text-red-600 leading-relaxed">
                {lottery.winners.map((w) => w.name).join("・")} さん
              </p>
              {lottery.winners.some((w) => w.via === "undrawn") && (
                <p className="text-xs font-bold text-red-400 mt-2">
                  {lottery.winners.filter((w) => w.via === "undrawn").map((w) => w.name).join("・")} さんは期限までに引かなかったため自動的に当たりです
                </p>
              )}
            </div>
          )}

          {/* 自分の状態・操作案内 */}
          {!isFinished && (
            <div className={`p-4 rounded-2xl border text-sm font-bold ${
              isTarget && mySlot === undefined
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-ag-gray-50 border-ag-gray-100 text-ag-gray-500"
            }`}>
              {!isTarget
                ? "このくじの対象ではありません（結果は見られます）"
                : mySlot === undefined
                  ? "下のあみだくじの、空いている線（上の丸）をタップして引いてください。結果は締切後に発表されます"
                  : `あなたは左から ${mySlot + 1} 番目の線を選びました。結果発表をお待ちください`}
            </div>
          )}

          {/* あみだくじ本体（横スクロール可） */}
          <div className="overflow-x-auto rounded-2xl border border-ag-gray-100 bg-ag-gray-50/50">
            <svg width={width} height={height} className="block">
              {/* 縦線 */}
              {Array.from({ length: n }, (_, col) => (
                <line key={col} x1={x(col)} y1={y(0)} x2={x(col)} y2={y(lottery.levels + 1)}
                  stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
              ))}

              {/* 横線（結果発表までは隠して、お楽しみにする） */}
              {isFinished && lottery.rungs.map((r, i) => (
                <line key={i} x1={x(r.col)} y1={y(r.level)} x2={x(r.col + 1)} y2={y(r.level)}
                  stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
              ))}
              {!isFinished && (
                <text x={width / 2} y={y(Math.floor(lottery.levels / 2))} textAnchor="middle"
                  fontSize={28} fontWeight={900} fill="#cbd5e1">？ ？ ？</text>
              )}

              {/* たどるアニメーション */}
              {isFinished && tracePoints && (
                <polyline
                  key={traceFrom}
                  points={tracePoints.map((p) => `${p.px},${p.py}`).join(" ")}
                  fill="none" stroke="#f59e0b" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={traceLength} strokeDashoffset={traceLength}
                  style={{ animation: "amida-dash 1.8s ease-in-out forwards" }}
                />
              )}

              {/* 上の丸（引く場所）と名前 */}
              {Array.from({ length: n }, (_, col) => {
                const owner = colOwner[col];
                const canPick = !isFinished && isTarget && mySlot === undefined && !owner && !isDrawing;
                const isMine = mySlot === col;
                return (
                  <g key={col} onClick={() => handlePickColumn(col)}
                    style={{ cursor: canPick || (isFinished && owner) ? "pointer" : "default" }}>
                    <circle cx={x(col)} cy={y(0) - 16} r={14}
                      fill={owner ? (isMine ? "#65a30d" : "#e2e8f0") : "#ffffff"}
                      stroke={canPick ? "#65a30d" : "#94a3b8"} strokeWidth={canPick ? 3 : 2} />
                    {!owner && canPick && (
                      <text x={x(col)} y={y(0) - 11} textAnchor="middle" fontSize={14} fontWeight={900} fill="#65a30d">＋</text>
                    )}
                    <text x={x(col)} y={y(0) - 36} textAnchor="middle" fontSize={11} fontWeight={700}
                      fill={isMine ? "#4d7c0f" : "#475569"}>
                      {owner ? owner.split(/[ 　]/)[0] : ""}
                    </text>
                  </g>
                );
              })}

              {/* 下の番号と当たりマーク */}
              {Array.from({ length: n }, (_, col) => (
                <g key={col}>
                  {isFinished && winningCols.has(col) ? (
                    <>
                      <circle cx={x(col)} cy={y(lottery.levels + 1) + 18} r={15} fill="#dc2626" />
                      <text x={x(col)} y={y(lottery.levels + 1) + 23} textAnchor="middle" fontSize={13} fontWeight={900} fill="#ffffff">当</text>
                    </>
                  ) : (
                    <text x={x(col)} y={y(lottery.levels + 1) + 22} textAnchor="middle" fontSize={11} fontWeight={700} fill="#94a3b8">
                      {col + 1}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
          {isFinished && (
            <p className="text-[10px] text-ag-gray-400 -mt-2">
              名前の丸をタップすると、その人の線をたどるアニメーションが見られます
            </p>
          )}

          {/* 未回答者 */}
          {!isFinished && undrawn.length > 0 && (
            <div className="p-4 bg-ag-gray-50 rounded-2xl border border-ag-gray-100">
              <p className="text-[10px] font-extrabold text-ag-gray-400 uppercase mb-2">
                まだ引いていない人（{undrawn.length}名）
              </p>
              <p className="text-xs font-bold text-ag-gray-600 leading-relaxed">
                {undrawn.map((t) => t.name).join("・")}
              </p>
            </div>
          )}

          {/* 削除（作成者・管理者・サポーター） */}
          {canManage && (
            <button onClick={handleDelete}
              className="w-full py-2.5 text-xs font-bold text-red-400 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
              このくじを削除する
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
