"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getNextPractice, subscribeToEvent, EventData } from "@/lib/events";
import { subscribeToAttendances, AttendanceData } from "@/lib/attendances";
import { subscribeToMembers } from "@/lib/members";
import { subscribeToVisitors, VisitorData } from "@/lib/visitors";
import { subscribeToReservations, ReservationData } from "@/lib/reservations";
import type { Member } from "@/data/memberList";
import { memberList as staticMemberList } from "@/data/memberList";
import { subscribeToClubSettings, ClubSettings } from "@/lib/settings";
import { calculateAttendanceFee, resolveFeeDurationHours } from "@/lib/fees";
import { resolveMembershipTypeForEvent } from "@/lib/membership";
import { EXPENSE_CATEGORIES } from "@/components/finance/MonthlyChart";
import type { PaymentMethod } from "@/lib/transactions";
import {
  subscribeToEventExpenses,
  subscribeToEventFinancials,
  addEventExpense,
  deleteEventExpense,
  toggleAttendancePayment,
  setAttendancePaymentMethod,
  setAttendanceFeeOverride,
  setCoachFeeOverride,
  finalizeEventAccounting,
  unfinalizeEventAccounting,
  EventExpense,
  EventFinancials,
} from "@/lib/dailyFinance";

type CollectionItem = {
  id: string; // memberId
  name: string;
  type: string;
  fee: number;
  baseFee: number;       // 自動算出時の金額（復元用）
  isOverridden: boolean; // 手動修正中か
  isWaived: boolean;     // 0円に設定済みか（会計対象外フラグ）
  collected: boolean;
  method: PaymentMethod; // 支払い方法（現金 / PayPay）
};

interface BalanceCardProps {
  /**
   * 表示対象の練習イベントID。未指定なら直近の練習を自動取得する
   */
  eventId?: string | null;
}

export default function BalanceCard({ eventId }: BalanceCardProps = {}) {
  const { user } = useAuth();
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [visitors, setVisitors] = useState<VisitorData[]>([]);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [financials, setFinancials] = useState<EventFinancials>({});

  // 個別メンバー料金の編集中入力欄（永続化値は attendance.feeOverride）
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberFeeInput, setMemberFeeInput] = useState("");

  // コーチ料の編集中入力欄（永続化値は events/{id}/financials/main.coachFeeOverride）
  const [isEditingCoachFee, setIsEditingCoachFee] = useState(false);
  const [coachFeeInput, setCoachFeeInput] = useState("");

  // 経費追加フォームのステート
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState(EXPENSE_CATEGORIES[0].id);
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseMethod, setNewExpenseMethod] = useState<PaymentMethod>("現金");
  const [newExpenseNote, setNewExpenseNote] = useState("");

  // 精算確定の処理中フラグ
  const [isFinalizing, setIsFinalizing] = useState(false);

  // 親から指定された eventId を優先。未指定の場合は直近練習を自動取得
  const [autoEventId, setAutoEventId] = useState<string | null>(null);
  const activeEventId = eventId !== undefined ? eventId : autoEventId;

  useEffect(() => {
    if (eventId !== undefined) return; // 親が制御しているので自動取得しない
    getNextPractice().then(evt => setAutoEventId(evt?.id ?? null));
  }, [eventId]);

  useEffect(() => {
    const unsubSettings = subscribeToClubSettings((data) => setSettings(data));
    const unsubMembers = subscribeToMembers((data) => setMembers(data));

    return () => {
      unsubSettings();
      unsubMembers();
    };
  }, []);

  useEffect(() => {
    if (!activeEventId) return;

    const unsubEvent = subscribeToEvent(activeEventId, (evt) => setActiveEvent(evt));
    const unsubAtt = subscribeToAttendances(activeEventId, (data) => setAttendances(data));
    const unsubVis = subscribeToVisitors(activeEventId, (data) => setVisitors(data));
    const unsubRes = subscribeToReservations(activeEventId, (data) => setReservations(data));
    const unsubExp = subscribeToEventExpenses(activeEventId, (data) => setExpenses(data));
    const unsubFin = subscribeToEventFinancials(activeEventId, (data) => setFinancials(data));

    return () => {
      unsubEvent();
      unsubAtt();
      unsubVis();
      unsubRes();
      unsubExp();
      unsubFin();
    };
  }, [activeEventId]);

  // コーチ出席判定
  // 種別バッジ(membershipType==="coach")で判定。古い参加データ対策として名前一致も予備で残す
  const hasCoach = useMemo(() => {
    return attendances.some(
      a => a.status === "attend" && (a.membershipType === "coach" || a.name === "渡辺 亜衣")
    );
  }, [attendances]);

  // 収集リストの生成（都度払い対象者：ライト + ビジター）
  const collections = useMemo<CollectionItem[]>(() => {
    if (!activeEvent || !settings) return [];

    // 出席メンバー由来
    const fromAttendances: CollectionItem[] = attendances
      .filter(a => a.status === "attend")
      .map(att => {
        // Firestore の members に membershipType がない場合は静的データにフォールバック
        const fsMember = members.find(m => String(m.id) === att.memberId);
        const staticMember = staticMemberList.find(m => String(m.id) === att.memberId);
        const member: Member | null =
          fsMember && (fsMember.membershipType || fsMember.membershipHistory?.length)
            ? fsMember
            : (staticMember ?? fsMember ?? null);

        // 会員種別は「練習日の月 × 種別変更履歴」で判定する（月単位の変更を正しく反映）。
        // 履歴が無ければ、出欠データのスナップショット → 名簿の現在種別の順で決める。
        const effectiveType =
          resolveMembershipTypeForEvent(member, att.membershipType, activeEvent.date) ?? "visitor";

        // コーチは回収対象外
        if (att.name === "渡辺 亜衣" || effectiveType === "coach") return null;

        // オフィシャルは月謝制なので会計対象外
        if (effectiveType === "official") return null;

        const { baseFee, label } = calculateAttendanceFee(
          { ...(member ?? ({} as Member)), membershipType: effectiveType },
          activeEvent.time,
          settings,
          hasCoach,
          activeEvent.location
        );

        const isOverridden = att.feeOverride !== undefined && att.feeOverride !== null;
        const finalFee = isOverridden ? att.feeOverride! : baseFee;

        return {
          id: att.memberId,
          name: att.name,
          type: label,
          fee: finalFee,
          baseFee,
          isOverridden,
          isWaived: isOverridden && att.feeOverride === 0,
          collected: !!att.isPaid,
          method: (att.paymentMethod ?? "現金") as PaymentMethod,
        } as CollectionItem;
      })
      .filter((c): c is CollectionItem => c !== null);

    // ビジター由来（events/{id}/visitors サブコレクション + reservations のビジター）
    type VisitorSource = { id: string; name: string };
    const visitorList: VisitorSource[] = [];
    const seenIds = new Set<string>();

    visitors.forEach(v => {
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id);
        visitorList.push({ id: v.id, name: v.name });
      }
    });

    // reservations 経由のビジター（modern flow）
    // memberType: "visitor" | "invited_official" | "invited_light" は会計対象（ビジター料金）
    reservations
      .filter(r => r.status === "confirmed")
      .filter(r => r.memberType === "visitor" || r.memberType === "invited_official" || r.memberType === "invited_light")
      .forEach(r => {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          visitorList.push({ id: r.id, name: r.name });
        }
      });

    const fromVisitors: CollectionItem[] = visitorList.map(v => {
      const { baseFee, label } = calculateAttendanceFee(
        null, // ビジターは Member 情報なし
        activeEvent.time,
        settings,
        hasCoach,
        activeEvent.location
      );
      // 出席データ（同IDの attendance に保存された feeOverride / isPaid）と紐付け
      const att = attendances.find(a => a.memberId === v.id);
      const isOverridden = att?.feeOverride !== undefined && att?.feeOverride !== null;
      const finalFee = isOverridden ? att!.feeOverride! : baseFee;

      return {
        id: v.id,
        name: v.name,
        type: label,
        fee: finalFee,
        baseFee,
        isOverridden,
        isWaived: isOverridden && att?.feeOverride === 0,
        collected: !!att?.isPaid,
        method: (att?.paymentMethod ?? "現金") as PaymentMethod,
      };
    });

    // attendances と visitors の重複を排除（visitor 側を優先）
    const visitorIds = new Set(fromVisitors.map(v => v.id));
    return [
      ...fromAttendances.filter(c => !visitorIds.has(c.id)),
      ...fromVisitors,
    ];
  }, [activeEvent, attendances, visitors, reservations, members, settings, hasCoach]);

  // 表示対象：金額が1円以上、または元々金額があったが0円に修正された人（復元可能にするため）
  const visibleCollections = useMemo(() => {
    return collections.filter(c => c.fee > 0 || c.isWaived);
  }, [collections]);

  // 自動算出されるコーチ料（場所優先で時間判定）
  const autoCoachFee = useMemo(() => {
    if (!hasCoach || !activeEvent || !settings) return 0;
    const duration = resolveFeeDurationHours(activeEvent.location, activeEvent.time);
    return duration >= 4 ? settings.fees.coachFee4h : settings.fees.coachFee3h;
  }, [hasCoach, activeEvent, settings]);

  // 最終的なコーチ料（Firestore保存の上書きを優先）
  const coachFeeOverride = financials.coachFeeOverride;
  const isCoachFeeOverridden = coachFeeOverride !== undefined && coachFeeOverride !== null;
  const finalCoachFee = isCoachFeeOverridden ? coachFeeOverride! : autoCoachFee;

  // 家計簿へ確定済みか。確定後は会計の編集をロックして、家計簿との不整合を防ぐ
  //（修正したいときは「確定を取り消す」を押してから操作する）
  const isFinalized = !!financials.finalizedAt;

  // 回収チェックのトグル（ダッシュボード内のみ。家計簿は精算確定時に一括反映）
  const handleToggleCollection = async (memberId: string, currentStatus: boolean) => {
    if (!activeEvent) return;
    await toggleAttendancePayment(activeEvent.id, memberId, currentStatus);
  };

  // 支払い方法（現金 / PayPay）の切り替え
  const handleSetMethod = async (memberId: string, method: PaymentMethod) => {
    if (!activeEvent) return;
    await setAttendancePaymentMethod(activeEvent.id, memberId, method);
  };

  // 個別メンバー料金の上書き（Firestore永続化）
  const handleUpdateMemberFee = async (memberId: string) => {
    if (!activeEvent) return;
    const val = parseInt(memberFeeInput, 10);
    await setAttendanceFeeOverride(activeEvent.id, memberId, isNaN(val) ? 0 : val);
    setEditingMemberId(null);
  };

  // 料金の「0円化」（会計対象外フラグ）
  const handleRemoveMemberFee = async (memberId: string) => {
    if (!activeEvent) return;
    await setAttendanceFeeOverride(activeEvent.id, memberId, 0);
  };

  // 料金の「復活」（自動算出に戻す）
  const handleRestoreMemberFee = async (memberId: string) => {
    if (!activeEvent) return;
    await setAttendanceFeeOverride(activeEvent.id, memberId, null);
  };

  // コーチ料の上書き（Firestore永続化）
  const handleUpdateCoachFee = async () => {
    if (!activeEvent) return;
    const val = parseInt(coachFeeInput, 10);
    await setCoachFeeOverride(activeEvent.id, isNaN(val) ? 0 : val);
    setIsEditingCoachFee(false);
  };

  const handleZeroCoachFee = async () => {
    if (!activeEvent) return;
    await setCoachFeeOverride(activeEvent.id, 0);
  };

  const handleRestoreCoachFee = async () => {
    if (!activeEvent) return;
    await setCoachFeeOverride(activeEvent.id, undefined);
  };

  // 経費項目追加（ダッシュボード内のみ。家計簿は精算確定時に一括反映）
  const handleAddExpense = async () => {
    if (!activeEvent || !newExpenseAmount) return;
    const amount = parseInt(newExpenseAmount, 10);
    if (isNaN(amount)) return;

    const category = EXPENSE_CATEGORIES.find(c => c.id === newExpenseCategoryId);
    const title = category?.short || category?.label || newExpenseCategoryId;
    const isCoachExpense = /コーチ|coach/i.test(newExpenseCategoryId);
    try {
      await addEventExpense(
        activeEvent.id,
        title,
        amount,
        isCoachExpense ? "coach" : "other",
        newExpenseCategoryId,
        newExpenseMethod,
        newExpenseNote.trim() || undefined
      );
      setIsAddingExpense(false);
      setNewExpenseCategoryId(EXPENSE_CATEGORIES[0].id);
      setNewExpenseAmount("");
      setNewExpenseMethod("現金");
      setNewExpenseNote("");
    } catch (e) {
      console.error("経費追加エラー:", e);
      alert("経費の追加に失敗しました。コンソールを確認してください。");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm("この経費を削除しますか？")) {
      await deleteEventExpense(expenseId);
    }
  };

  // 精算確定（家計簿に一括反映）
  const handleFinalize = async () => {
    if (!activeEvent) return;
    const incomeCount = collections.filter((c) => c.collected).length;
    const expenseCount = expenses.length;
    const msg = `本日の会計を家計簿に反映します。\n\n回収済み ${incomeCount}件 / 経費 ${expenseCount}件${hasCoach ? " / コーチ料あり" : ""}\n\nよろしいですか？`;
    if (!confirm(msg)) return;

    setIsFinalizing(true);
    try {
      const result = await finalizeEventAccounting({
        eventId: activeEvent.id,
        eventDate: activeEvent.date,
        enteredBy: user?.displayName || "ダッシュボード",
        incomeItems: collections
          .filter((c) => c.collected)
          .map((c) => ({
            memberId: c.id,
            name: c.name,
            amount: c.fee,
            typeLabel: c.type.includes("ライト") ? "ライト" : "ビジター",
            method: c.method,
          })),
        expenseItems: expenses.map((exp) => ({
          expenseId: exp.id,
          title: exp.title,
          amount: exp.amount,
          type: (exp.type === "coach" ? "coach" : "other") as "coach" | "other",
          categoryId: exp.categoryId,
          method: (exp.method ?? "現金") as PaymentMethod,
          note: exp.note,
        })),
        coachAutoFee: hasCoach && finalCoachFee > 0
          ? { amount: finalCoachFee, coachName: "渡辺 亜衣" }
          : undefined,
      });
      alert(`家計簿に反映しました。\n収入 ${result.incomeCount}件 / 経費 ${result.expenseCount}件${result.coachLogged ? " / コーチ料1件" : ""}`);
    } catch (e) {
      console.error("精算確定エラー:", e);
      alert("精算確定に失敗しました");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleUnfinalize = async () => {
    if (!activeEvent) return;
    if (!confirm("家計簿への反映を取り消します。よろしいですか？")) return;
    setIsFinalizing(true);
    try {
      await unfinalizeEventAccounting(activeEvent.id);
    } catch (e) {
      console.error("確定取消エラー:", e);
      alert("取り消しに失敗しました");
    } finally {
      setIsFinalizing(false);
    }
  };

  const collectedTotal = collections.filter(c => c.collected).reduce((sum, c) => sum + c.fee, 0);
  const pendingTotal = collections.filter(c => !c.collected).reduce((sum, c) => sum + c.fee, 0);
  
  const manualExpensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const TODAY_EXPENSES = finalCoachFee + manualExpensesTotal;
  const todayBalance = collectedTotal - TODAY_EXPENSES;

  if (!activeEvent) {
    return (
      <div className="bg-white border-2 border-ag-gray-200 rounded-[32px] p-6 text-center text-ag-gray-500">
        予定されている練習イベントがありません
      </div>
    );
  }

  const durationStr = resolveFeeDurationHours(activeEvent.location, activeEvent.time);

  return (
    <div className="bg-white border-2 border-ag-gray-200 shadow-xl rounded-[32px] overflow-hidden flex flex-col h-full max-h-[800px]">
      {/* ヘッダー部分 */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white relative flex-shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div>
            <h2 className="text-xl font-black tracking-widest drop-shadow-md">本日の会計</h2>
            <p className="text-sm font-bold text-blue-100 flex items-center gap-1">
              <span>{activeEvent.title}</span>({durationStr}H)
            </p>
          </div>
        </div>

        {/* 収支サマリー */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white text-ag-gray-900 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-blue-100">
            <p className="text-xs font-extrabold text-blue-600 mb-1">現在の回収額 (都度払い)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold">¥</span>
              <span className="text-3xl font-black tracking-tighter text-ag-gray-900">{collectedTotal.toLocaleString()}</span>
            </div>
            {collections.length > 0 ? (
              <p className={`text-xs font-bold mt-1 ${pendingTotal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {pendingTotal > 0 ? `残り ¥${pendingTotal.toLocaleString()}` : "全額回収完了"}
              </p>
            ) : (
              <p className="text-xs font-bold mt-1 text-ag-gray-400">対象者なし</p>
            )}
          </div>
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col justify-center">
            <p className="text-xs font-bold text-white/80 mb-1">本日の支出合計</p>
            <div className="flex items-baseline gap-1 text-white">
              <span className="text-lg font-bold">¥</span>
              <span className="text-3xl font-black tracking-tighter">{TODAY_EXPENSES.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 確定後ロックの案内 */}
        {isFinalized && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border-2 border-amber-200 text-xs font-bold text-amber-800 text-center">
            家計簿に確定済みのため、回収・経費の編集はロックされています。
            <br />
            修正するには、下の「確定を取り消す」を押してください。
          </div>
        )}

        {/* 回収チェックリスト */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3 border-b-2 border-ag-gray-100 pb-2">
            <h3 className="text-sm font-black text-ag-gray-900 flex items-center gap-1">
              回収リスト ({visibleCollections.length}名)
            </h3>
            <span className="text-xs font-extrabold bg-ag-gray-100 text-ag-gray-600 px-3 py-0.5 rounded-full">
              {visibleCollections.filter(c => c.collected).length}人完了
            </span>
          </div>

          <div className="space-y-2">
            {visibleCollections.length === 0 ? (
              <div className="text-center text-xs text-ag-gray-400 py-4 font-bold bg-ag-gray-50 rounded-xl">
                本日の都度払い対象者はいません
              </div>
            ) : (
              visibleCollections.map((item) => (
                <div 
                  key={item.id} 
                  className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-200 ${
                    item.collected
                      ? "bg-emerald-50 border-emerald-500 shadow-sm"
                      : item.isWaived
                      ? "bg-ag-gray-50 border-ag-gray-200 opacity-60"
                      : "bg-white border-ag-gray-100 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleCollection(item.id, item.collected)}
                        disabled={isFinalized}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          item.collected ? "border-emerald-500 bg-emerald-500 text-white" : "border-ag-gray-300 bg-white"
                        }`}
                      >
                        {item.collected && <svg className="w-3.5 h-3.5 font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div className="text-left">
                        <div className="text-sm font-black text-ag-gray-900">{item.name}</div>
                        <div className={`text-xs font-bold ${item.collected ? "text-emerald-700" : "text-ag-gray-500"}`}>
                          {item.type} {item.isOverridden && "(手動修正)"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-black ${item.collected ? "text-emerald-600" : (item.fee === 0 ? "text-ag-gray-400 line-through" : "text-ag-gray-900")}`}>
                        ¥{item.fee.toLocaleString()}
                      </div>
                      
                      {/* 修正・削除ボタン（確定後はロック） */}
                      {!editingMemberId && !isFinalized && (
                        <div className="flex gap-1">
                          {item.isWaived ? (
                            <button
                              onClick={() => handleRestoreMemberFee(item.id)}
                              className="px-2 h-7 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded text-blue-700 border border-blue-200 text-xs font-black"
                              title="金額を自動算出に戻す"
                            >
                              戻す
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setMemberFeeInput(String(item.fee));
                                  setEditingMemberId(item.id);
                                }}
                                className="px-2 h-7 flex items-center justify-center hover:bg-ag-gray-100 rounded text-ag-gray-500 hover:text-blue-600 text-xs font-black border border-ag-gray-200"
                              >
                                修正
                              </button>
                              <button
                                onClick={() => handleRemoveMemberFee(item.id)}
                                className="px-2 h-7 flex items-center justify-center hover:bg-red-50 rounded text-ag-gray-500 hover:text-red-600 text-xs font-black border border-ag-gray-200"
                              >
                                0円
                              </button>
                              {item.isOverridden && (
                                <button
                                  onClick={() => handleRestoreMemberFee(item.id)}
                                  className="px-2 h-7 flex items-center justify-center hover:bg-blue-50 rounded text-blue-600 text-xs font-black border border-blue-200"
                                  title="自動算出に戻す"
                                >
                                  戻す
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 支払い方法（現金 / PayPay）。確定後はロック */}
                  {!item.isWaived && (
                    <div className="mt-2 pt-2 border-t border-ag-gray-100 flex items-center gap-2">
                      <span className="text-xs font-bold text-ag-gray-400">支払方法</span>
                      <div className="flex gap-1">
                        {(["現金", "PayPay"] as PaymentMethod[]).map((m) => (
                          <button
                            key={m}
                            disabled={isFinalized}
                            onClick={() => handleSetMethod(item.id, m)}
                            className={`px-3 h-7 rounded-lg text-xs font-black border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              item.method === m
                                ? (m === "現金"
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : "bg-sky-500 text-white border-sky-500")
                                : "bg-white text-ag-gray-500 border-ag-gray-200 hover:bg-ag-gray-50"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 個別料金編集フォーム */}
                  {editingMemberId === item.id && (
                    <div className="mt-2 pt-2 border-t border-ag-gray-100 flex gap-2">
                       <input 
                        type="number" 
                        autoFocus
                        value={memberFeeInput}
                        onChange={e => setMemberFeeInput(e.target.value)}
                        className="flex-1 text-xs font-bold p-1.5 border border-blue-300 rounded outline-none"
                      />
                      <button 
                        onClick={() => handleUpdateMemberFee(item.id)}
                        className="bg-blue-500 text-white text-xs px-3 rounded-lg font-black"
                      >
                        保存
                      </button>
                      <button 
                        onClick={() => setEditingMemberId(null)}
                        className="text-xs text-ag-gray-400 font-bold px-2"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* かんたん経費リスト */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-3 border-b-2 border-ag-gray-100 pb-2">
            <h3 className="text-sm font-black text-ag-gray-900 flex items-center gap-1">
              本日の支出 ({expenses.length + (hasCoach ? 1 : 0)}件)
            </h3>
            {!isFinalized && (
              <button
                onClick={() => setIsAddingExpense(!isAddingExpense)}
                className="text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
              >
                + 経費追加
              </button>
            )}
          </div>

          <div className="space-y-2">
            {/* コーチ代 (自動/上書き対応) */}
            {hasCoach && (
              <div className={`p-3 rounded-xl border transition-all ${isEditingCoachFee ? "border-amber-300 bg-amber-50" : "border-red-100 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xs font-black text-red-900">渡辺 亜衣 コーチ料</div>
                    <div className="text-xs font-bold text-red-600 text-opacity-80">
                      {isCoachFeeOverridden ? "手動修正済み" : `自動算出 (${durationStr}H)`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-red-600">
                      -¥{finalCoachFee.toLocaleString()}
                    </div>
                    {!isEditingCoachFee && !isFinalized && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setCoachFeeInput(String(finalCoachFee));
                            setIsEditingCoachFee(true);
                          }}
                          className="px-2 h-7 flex items-center justify-center bg-white/50 hover:bg-white rounded border border-red-200 text-xs font-black text-red-700"
                        >
                          修正
                        </button>
                        <button
                          onClick={handleZeroCoachFee}
                          className="px-2 h-7 flex items-center justify-center bg-white/50 hover:bg-white rounded border border-red-200 text-xs font-black text-red-700"
                        >
                          0円
                        </button>
                        {isCoachFeeOverridden && (
                          <button
                            onClick={handleRestoreCoachFee}
                            className="px-2 h-7 flex items-center justify-center bg-white/50 hover:bg-white rounded border border-blue-200 text-xs font-black text-blue-700"
                            title="自動算出に戻す"
                          >
                            戻す
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isEditingCoachFee && (
                  <div className="mt-2 flex gap-2">
                    <input 
                      type="number" 
                      value={coachFeeInput}
                      onChange={e => setCoachFeeInput(e.target.value)}
                      className="flex-1 text-xs font-bold p-1.5 border border-amber-300 rounded outline-none"
                    />
                    <button 
                      onClick={handleUpdateCoachFee}
                      className="bg-amber-500 text-white text-xs px-2 rounded font-bold"
                    >
                      保存
                    </button>
                    <button 
                      onClick={() => setIsEditingCoachFee(false)}
                      className="text-xs text-ag-gray-400 font-bold"
                    >
                      戻る
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* 手動入力の経費 */}
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl border border-ag-gray-200 bg-white group">
                <div className="text-left">
                  <div className="text-xs font-black text-ag-gray-800">{exp.title}</div>
                  {exp.note && (
                    <div className="text-xs font-bold text-ag-gray-600">📝 {exp.note}</div>
                  )}
                  <div className="text-xs font-bold text-ag-gray-400">
                    <span className={`inline-block px-1.5 py-0.5 rounded mr-1 ${exp.method === "PayPay" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {exp.method ?? "現金"}
                    </span>
                    手動追加
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-black text-ag-gray-600">-¥{exp.amount.toLocaleString()}</div>
                  {!isFinalized && (
                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-ag-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isAddingExpense && !isFinalized && (
              <div className="p-3 bg-ag-gray-50 border border-ag-gray-200 rounded-xl space-y-2 mt-2">
                {/* 内訳：家計簿カテゴリから選択（プルダウン） */}
                <select
                  value={newExpenseCategoryId}
                  onChange={e => setNewExpenseCategoryId(e.target.value)}
                  className="w-full text-sm font-bold p-2 border border-ag-gray-200 rounded outline-none focus:border-blue-500 bg-white"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>

                {/* 備考（誰に支払ったか等のメモ。任意） */}
                <input
                  type="text"
                  placeholder="備考（例: 上前さんへ車代 / 任意）"
                  value={newExpenseNote}
                  onChange={e => setNewExpenseNote(e.target.value)}
                  className="w-full text-sm font-bold p-2 border border-ag-gray-200 rounded outline-none focus:border-blue-500"
                />

                {/* 支払い方法（現金 / PayPay） */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ag-gray-400">支払方法</span>
                  <div className="flex gap-1">
                    {(["現金", "PayPay"] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewExpenseMethod(m)}
                        className={`px-3 h-8 rounded-lg text-xs font-black border transition-colors ${
                          newExpenseMethod === m
                            ? (m === "現金"
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "bg-sky-500 text-white border-sky-500")
                            : "bg-white text-ag-gray-500 border-ag-gray-200 hover:bg-ag-gray-50"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="金額 (円)"
                    value={newExpenseAmount}
                    onChange={e => setNewExpenseAmount(e.target.value)}
                    className="w-full text-sm font-bold p-2 border border-ag-gray-200 rounded outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddExpense}
                    disabled={!newExpenseAmount}
                    className="bg-ag-gray-800 hover:bg-ag-gray-900 text-white font-bold text-xs px-4 rounded disabled:opacity-50"
                  >
                    追加
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* フッター残高 */}
      <div className="px-6 py-4 bg-ag-gray-50 border-t-2 border-ag-gray-200/60 flex-shrink-0 text-center space-y-3">
        <span className="text-sm font-black text-ag-gray-700">
          本日の最終現金 = <span className={`text-xl ${todayBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {todayBalance >= 0 ? `+¥${todayBalance.toLocaleString()}` : `-¥${Math.abs(todayBalance).toLocaleString()}`}
          </span>
        </span>

        {/* 精算確定ボタン */}
        {financials.finalizedAt ? (
          <div className="space-y-2">
            <div className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3">
              家計簿に確定済み（{new Date(financials.finalizedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}{financials.finalizedBy ? ` / ${financials.finalizedBy}` : ""}）
            </div>
            <button
              onClick={handleUnfinalize}
              disabled={isFinalizing}
              className="w-full py-2 text-xs font-black text-ag-gray-600 hover:text-red-600 border border-ag-gray-200 hover:border-red-200 rounded-xl bg-white transition-colors disabled:opacity-50"
            >
              {isFinalizing ? "取り消し中..." : "確定を取り消す（再精算する）"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleFinalize}
            disabled={isFinalizing || (collections.filter(c => c.collected).length === 0 && expenses.length === 0 && !hasCoach)}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isFinalizing ? "確定中..." : "本日の精算を確定して家計簿に反映"}
          </button>
        )}
      </div>
    </div>
  );
}
