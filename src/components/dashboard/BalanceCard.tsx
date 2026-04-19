"use client";

import { useState, useEffect, useMemo } from "react";
import { getNextPractice, EventData } from "@/lib/events";
import { subscribeToAttendances, AttendanceData } from "@/lib/attendances";
import { subscribeToMembers } from "@/lib/members";
import type { Member } from "@/data/memberList";
import { subscribeToClubSettings, ClubSettings } from "@/lib/settings";
import { calculateAttendanceFee, calculateDurationStr } from "@/lib/fees";
import { 
  subscribeToEventExpenses, 
  addEventExpense, 
  deleteEventExpense, 
  toggleAttendancePayment,
  EventExpense
} from "@/lib/dailyFinance";

type CollectionItem = {
  id: string; // memberId
  name: string;
  type: string;
  fee: number;
  collected: boolean;
};

export default function BalanceCard() {
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);

  // 個別メンバー料金の「手動上書き」用ステート
  const [memberFeeOverrides, setMemberFeeOverrides] = useState<Record<string, number | null>>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberFeeInput, setMemberFeeInput] = useState("");

  // コーチ料の「手動上書き」用ステート
  const [coachFeeOverride, setCoachFeeOverride] = useState<number | null>(null);
  const [isEditingCoachFee, setIsEditingCoachFee] = useState(false);
  const [coachFeeInput, setCoachFeeInput] = useState("");

  // 経費追加フォームのステート
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpenseTitle, setNewExpenseTitle] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");

  useEffect(() => {
    // 直近の練習を取得
    getNextPractice().then(evt => setActiveEvent(evt));

    const unsubSettings = subscribeToClubSettings((data) => setSettings(data));
    const unsubMembers = subscribeToMembers((data) => setMembers(data));

    return () => {
      unsubSettings();
      unsubMembers();
    };
  }, []);

  useEffect(() => {
    if (!activeEvent) return;
    
    const unsubAtt = subscribeToAttendances(activeEvent.id, (data) => setAttendances(data));
    const unsubExp = subscribeToEventExpenses(activeEvent.id, (data) => setExpenses(data));

    return () => {
      unsubAtt();
      unsubExp();
    };
  }, [activeEvent]);

  // コーチ出席判定
  const hasCoach = useMemo(() => {
    return attendances.some(a => a.name === "渡辺 亜衣" && a.status === "attend");
  }, [attendances]);

  // 収集リストの生成（都度払い対象者のみ）
  const collections = useMemo<CollectionItem[]>(() => {
    if (!activeEvent || !settings) return [];
    
    return attendances
      .filter(a => a.status === "attend")
      .map(att => {
        let member = members.find(m => String(m.id) === att.memberId);
        
        // 【修正】シミュレーション用の特別対応
        if (att.memberId === "SIM-LIGHT-ID" && !member) {
          member = { id: "SIM-LIGHT-ID", name: att.name, membershipType: "light" } as any;
        }

        // 【修正】名前または種別がコーチの場合は回収対象から除外
        if (att.name === "渡辺 亜衣" || member?.membershipType === "coach") {
           return null;
        }

        const { baseFee, label } = calculateAttendanceFee(member, activeEvent.time, settings, hasCoach);
        
        // 上書きされている場合はその金額を採用
        const finalFee = memberFeeOverrides[att.memberId] !== undefined && memberFeeOverrides[att.memberId] !== null
          ? memberFeeOverrides[att.memberId]!
          : baseFee;

        return {
          id: att.memberId,
          name: att.name,
          type: label,
          fee: finalFee,
          collected: !!att.isPaid,
          originalFee: baseFee // 元の金額を保持（復活時用）
        };
      })
      .filter((c): c is CollectionItem & { originalFee: number } => c !== null); 
  }, [activeEvent, attendances, members, settings, hasCoach, memberFeeOverrides]);

  // 表示対象：金額が1円以上、または元々金額があったが0円に修正された人（復元可能にするため）
  const visibleCollections = useMemo(() => {
    return collections.filter(c => c.fee > 0 || (memberFeeOverrides[c.id] === 0));
  }, [collections, memberFeeOverrides]);

  // 自動算出されるコーチ料
  const autoCoachFee = useMemo(() => {
    if (!hasCoach || !activeEvent || !settings) return 0;
    const duration = calculateDurationStr(activeEvent.time);
    return duration >= 4 ? settings.fees.coachFee4h : settings.fees.coachFee3h;
  }, [hasCoach, activeEvent, settings]);

  // 最終的なコーチ料（上書きを優先）
  const finalCoachFee = coachFeeOverride !== null ? coachFeeOverride : autoCoachFee;

  // シミュレーション：コーチ
  const handleSimulateCoach = async () => {
    if (!activeEvent) return;
    const { setAttendance } = await import("@/lib/attendances");
    const isAttending = attendances.some(a => a.name === "渡辺 亜衣" && a.status === "attend");
    await setAttendance(activeEvent.id, "SIM-COACH-ID", "渡辺 亜衣", isAttending ? "absent" : "attend", "demo");
    if (!isAttending) {
      setCoachFeeOverride(null); // リセット
    }
  };

  // シミュレーション：ライト会員
  const handleSimulateLight = async () => {
    if (!activeEvent) return;
    const { setAttendance } = await import("@/lib/attendances");
    const isAttending = attendances.some(a => a.name === "ライト会員(テスター)" && a.status === "attend");
    await setAttendance(activeEvent.id, "SIM-LIGHT-ID", "ライト会員(テスター)", isAttending ? "absent" : "attend", "demo");
  };

  // 回収チェックのトグル
  const handleToggleCollection = async (memberId: string, currentStatus: boolean) => {
    if (!activeEvent) return;
    await toggleAttendancePayment(activeEvent.id, memberId, currentStatus);
  };

  // 個別メンバー料金の上書き
  const handleUpdateMemberFee = (memberId: string) => {
    const val = parseInt(memberFeeInput, 10);
    setMemberFeeOverrides(prev => ({
      ...prev,
      [memberId]: isNaN(val) ? 0 : val
    }));
    setEditingMemberId(null);
  };

  // 料金の「0円化」
  const handleRemoveMemberFee = (memberId: string) => {
    setMemberFeeOverrides(prev => ({
      ...prev,
      [memberId]: 0
    }));
  };

  // 料金の「復活」
  const handleRestoreMemberFee = (memberId: string) => {
    setMemberFeeOverrides(prev => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  };

  // コーチ料の上書き
  const handleUpdateCoachFee = () => {
    const val = parseInt(coachFeeInput, 10);
    setCoachFeeOverride(isNaN(val) ? 0 : val);
    setIsEditingCoachFee(false);
  };

  // 経費項目
  const handleAddExpense = async () => {
    if (!activeEvent || !newExpenseTitle || !newExpenseAmount) return;
    const amount = parseInt(newExpenseAmount, 10);
    if (isNaN(amount)) return;
    
    await addEventExpense(activeEvent.id, newExpenseTitle, amount, "other");
    setIsAddingExpense(false);
    setNewExpenseTitle("");
    setNewExpenseAmount("");
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm("この経費を削除しますか？")) {
      await deleteEventExpense(expenseId);
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

  const durationStr = calculateDurationStr(activeEvent.time);

  return (
    <div className="bg-white border-2 border-ag-gray-200 shadow-xl rounded-[32px] overflow-hidden flex flex-col h-full max-h-[800px]">
      {/* ヘッダー部分 */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white relative flex-shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="flex flex-col gap-1">
            <button 
              onClick={handleSimulateLight}
              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold transition-all hover:bg-blue-100 shadow-sm"
              title="テスト用会員をリストに追加／削除します"
            >
              🧪 テスト参加（追加/削除）
            </button>
            <button 
              onClick={handleSimulateCoach}
              className={`px-3 py-1.5 rounded-lg flex items-center justify-center text-xs font-bold border transition-all shadow-sm ${
                hasCoach ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-ag-gray-50 text-ag-gray-500 border-ag-gray-300"
              }`}
              title="コーチの参加状態を切り替えます"
            >
              👩‍🏫 コーチ: {hasCoach ? "参加" : "不在"}
            </button>
          </div>
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
            <p className="text-[10px] font-extrabold text-blue-600 mb-1">現在の回収額 (都度払い)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold">¥</span>
              <span className="text-3xl font-black tracking-tighter text-ag-gray-900">{collectedTotal.toLocaleString()}</span>
            </div>
            {collections.length > 0 ? (
              <p className={`text-[10px] font-bold mt-1 ${pendingTotal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {pendingTotal > 0 ? `残り ¥${pendingTotal.toLocaleString()}` : "全額回収完了"}
              </p>
            ) : (
              <p className="text-[10px] font-bold mt-1 text-ag-gray-400">対象者なし</p>
            )}
          </div>
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-white/80 mb-1">本日の支出合計</p>
            <div className="flex items-baseline gap-1 text-white">
              <span className="text-lg font-bold">¥</span>
              <span className="text-3xl font-black tracking-tighter">{TODAY_EXPENSES.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 回収チェックリスト */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3 border-b-2 border-ag-gray-100 pb-2">
            <h3 className="text-sm font-black text-ag-gray-900 flex items-center gap-1">
              📋 回収リスト ({visibleCollections.length}名)
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
                      : (memberFeeOverrides[item.id] === 0)
                      ? "bg-ag-gray-50 border-ag-gray-200 opacity-60"
                      : "bg-white border-ag-gray-100 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleCollection(item.id, item.collected)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          item.collected ? "border-emerald-500 bg-emerald-500 text-white" : "border-ag-gray-300 bg-white"
                        }`}
                      >
                        {item.collected && <svg className="w-3.5 h-3.5 font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div className="text-left">
                        <div className="text-sm font-black text-ag-gray-900">{item.name}</div>
                        <div className={`text-[9px] font-bold ${item.collected ? "text-emerald-700" : "text-ag-gray-500"}`}>
                          {item.type} {memberFeeOverrides[item.id] !== undefined && memberFeeOverrides[item.id] !== null && "(手動修正)"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-black ${item.collected ? "text-emerald-600" : (item.fee === 0 ? "text-ag-gray-400 line-through" : "text-ag-gray-900")}`}>
                        ¥{item.fee.toLocaleString()}
                      </div>
                      
                      {/* 修正・削除ボタン (ホバー時または0円時表示) */}
                      {!editingMemberId && (
                        <div className="flex gap-1">
                          {memberFeeOverrides[item.id] === 0 ? (
                            <button 
                              onClick={() => handleRestoreMemberFee(item.id)}
                              className="w-7 h-7 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded text-blue-600 border border-blue-200 text-[10px] font-bold"
                              title="金額を元に戻す"
                            >
                              ↩️
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setMemberFeeInput(String(item.fee));
                                  setEditingMemberId(item.id);
                                }}
                                className="w-7 h-7 flex items-center justify-center hover:bg-ag-gray-100 rounded text-ag-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <span className="text-[10px]">✏️</span>
                              </button>
                              <button 
                                onClick={() => handleRemoveMemberFee(item.id)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded text-ag-gray-400 hover:text-red-500 transition-colors"
                              >
                                <span className="text-[10px]">🗑️</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

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
                        className="bg-blue-500 text-white text-[10px] px-3 rounded-lg font-black"
                      >
                        保存
                      </button>
                      <button 
                        onClick={() => setEditingMemberId(null)}
                        className="text-[10px] text-ag-gray-400 font-bold px-2"
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
              💸 本日の支出 ({expenses.length + (hasCoach ? 1 : 0)}件)
            </h3>
            <button 
              onClick={() => setIsAddingExpense(!isAddingExpense)}
              className="text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
            >
              + 経費追加
            </button>
          </div>

          <div className="space-y-2">
            {/* コーチ代 (自動/上書き対応) */}
            {hasCoach && (
              <div className={`p-3 rounded-xl border transition-all ${isEditingCoachFee ? "border-amber-300 bg-amber-50" : "border-red-100 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xs font-black text-red-900">渡辺 亜衣 コーチ料</div>
                    <div className="text-[9px] font-bold text-red-600 text-opacity-80">
                      {coachFeeOverride !== null ? "手動修正済み" : `自動算出 (${durationStr}H)`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-red-600">
                      -¥{finalCoachFee.toLocaleString()}
                    </div>
                    {!isEditingCoachFee && (
                      <div className="flex gap-1 shrink-0">
                        <button 
                          onClick={() => {
                            setCoachFeeInput(String(finalCoachFee));
                            setIsEditingCoachFee(true);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-white/50 hover:bg-white rounded border border-red-200 text-[10px]"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => setCoachFeeOverride(0)}
                          className="w-7 h-7 flex items-center justify-center bg-white/50 hover:bg-white rounded border border-red-200 text-[10px]"
                        >
                          🗑️
                        </button>
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
                      className="bg-amber-500 text-white text-[10px] px-2 rounded font-bold"
                    >
                      保存
                    </button>
                    <button 
                      onClick={() => setIsEditingCoachFee(false)}
                      className="text-[10px] text-ag-gray-400 font-bold"
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
                  <div className="text-[9px] font-bold text-ag-gray-400">手動追加</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-black text-ag-gray-600">-¥{exp.amount.toLocaleString()}</div>
                  <button onClick={() => handleDeleteExpense(exp.id)} className="text-ag-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}

            {isAddingExpense && (
              <div className="p-3 bg-ag-gray-50 border border-ag-gray-200 rounded-xl space-y-2 mt-2">
                <input 
                  type="text" 
                  placeholder="内訳 (例: シャトル代, 等)" 
                  value={newExpenseTitle}
                  onChange={e => setNewExpenseTitle(e.target.value)}
                  className="w-full text-xs font-bold p-2 border border-ag-gray-200 rounded outline-none focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="金額 (円)" 
                    value={newExpenseAmount}
                    onChange={e => setNewExpenseAmount(e.target.value)}
                    className="w-full text-xs font-bold p-2 border border-ag-gray-200 rounded outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={handleAddExpense}
                    disabled={!newExpenseTitle || !newExpenseAmount}
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
      <div className="px-6 py-4 bg-ag-gray-50 border-t-2 border-ag-gray-200/60 flex-shrink-0 text-center">
        <span className="text-sm font-black text-ag-gray-700">
          💰 本日の最終現金 = <span className={`text-xl ${todayBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {todayBalance >= 0 ? `+¥${todayBalance.toLocaleString()}` : `-¥${Math.abs(todayBalance).toLocaleString()}`}
          </span>
        </span>
      </div>
    </div>
  );
}
