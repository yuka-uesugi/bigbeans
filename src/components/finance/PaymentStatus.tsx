"use client";

import { useState, useEffect } from "react";
import { 
  subscribeToPaymentCollections, 
  updateMemberPayment, 
  createManualPaymentCollection,
  PaymentCollectionEvent, 
  MemberPaymentDetail 
} from "@/lib/payments";
import { 
  subscribeToClubSettings, 
  updateClubSettings, 
  ClubSettings 
} from "@/lib/settings";
import { subscribeToMembers } from "@/lib/members";
import type { Member } from "@/data/memberList";

const statusConfig = {
  paid: { label: "納入済", class: "bg-ag-lime-50 text-ag-lime-700" },
  unpaid: { label: "未納", class: "bg-red-50 text-red-600" },
  partial: { label: "一部", class: "bg-amber-50 text-amber-600" },
};

export default function PaymentStatus() {
  const [collections, setCollections] = useState<PaymentCollectionEvent[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [dbMembers, setDbMembers] = useState<Member[]>([]);
  
  // UI状態
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [paypayLinkInput, setPaypayLinkInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingAmountFor, setEditingAmountFor] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<string>("");
  
  // 新規集金作成フォーム用
  const [createConfig, setCreateConfig] = useState({
    title: "",
    baseMonth: "", // YYYY-MM
    type: "monthly" as "monthly" | "registration" | "other",
    baseAmount: 9000,
    selectedMembers: new Set<number>() 
  });
  
  useEffect(() => {
    const unsubColl = subscribeToPaymentCollections((data) => {
      setCollections(data);
      if (data.length > 0 && !activeCollectionId) {
        setActiveCollectionId(data[0].id);
      }
    });
    
    const unsubSettings = subscribeToClubSettings((data) => {
      setSettings(data);
      setPaypayLinkInput(data.paypayLink || "");
    });
    
    const unsubMembers = subscribeToMembers((data) => {
      setDbMembers(data);
    });

    return () => {
      unsubColl();
      unsubSettings();
      unsubMembers();
    };
  }, [activeCollectionId]);

  // 現在選択中の集金イベント
  const activeCollection = collections.find(c => c.id === activeCollectionId) || null;
  const paymentsList = activeCollection ? Object.values(activeCollection.payments) : [];
  
  const paidCount = paymentsList.filter(p => p.status === "paid").length;
  const totalAmount = paymentsList.reduce((sum, p) => sum + p.targetAmount, 0);
  const paidAmount = paymentsList.reduce((sum, p) => sum + p.paidAmount, 0);

  // 関数: PayPayリンク保存
  const handleSavePaypayLink = async () => {
    if (!settings) return;
    await updateClubSettings({ paypayLink: paypayLinkInput });
    setIsEditingLink(false);
  };
  
  // 関数: PayPayリンクコピー
  const handleCopyLink = () => {
    if (settings?.paypayLink) {
      navigator.clipboard.writeText(settings.paypayLink);
      alert("PayPayリンクをコピーしました");
    } else {
      alert("リンクが設定されていません");
    }
  };

  // 関数: ステータストグル
  const handleTogglePayment = async (memberId: string | number, currentStatus: string, targetAmount: number) => {
    if (!activeCollectionId) return;
    const nextStatus = currentStatus === "unpaid" ? "paid" : "unpaid";
    const nextPaidAmount = nextStatus === "paid" ? targetAmount : 0;
    
    await updateMemberPayment(activeCollectionId, memberId, {
      status: nextStatus as any,
      paidAmount: nextPaidAmount,
      date: nextStatus === "paid" ? new Date().toLocaleDateString('ja-JP') : null,
      method: nextStatus === "paid" ? "PayPay" : null
    });
  };

  // 個別の金額手動更新
  const handleSaveAmount = async (memberId: string) => {
    if (!activeCollectionId) return;
    const newAmount = parseInt(editingAmountValue);
    if (isNaN(newAmount)) {
      setEditingAmountFor(null);
      return;
    }
    await updateMemberPayment(activeCollectionId, memberId, {
      targetAmount: newAmount,
    });
    setEditingAmountFor(null);
  };

  // 新規作成用のメンバー選択を切り替え
  const toggleMemberSelection = (id: number) => {
    const newSelection = new Set(createConfig.selectedMembers);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setCreateConfig({ ...createConfig, selectedMembers: newSelection });
  };

  // 一括選択ショートカット
  const selectMembers = (type: "all" | "official" | "light" | "none") => {
    const newSelection = new Set<number>();
    if (type !== "none") {
      dbMembers.forEach(m => {
        if (m.membershipType === "coach" || m.membershipType === "visitor") return; // 除外
        
        const mType = m.membershipType || "official";
        
        if (type === "all" || (type === "official" && mType === "official") || (type === "light" && mType === "light")) {
          newSelection.add(m.id);
        }
      });
    }
    setCreateConfig({ ...createConfig, selectedMembers: newSelection });
  };

  // 手動集金リストの作成
  const handleCreateManualCollection = async () => {
    if (!createConfig.title || !createConfig.baseMonth) return;
    
    const id = `${createConfig.baseMonth}-${createConfig.type}-${Date.now().toString().slice(-4)}`;
    
    const membersData = Array.from(createConfig.selectedMembers).map(id => {
      const m = dbMembers.find(x => x.id === id);
      return { memberId: id, name: m?.name || "Unknown", amount: createConfig.baseAmount };
    });

    try {
      await createManualPaymentCollection(id, createConfig.title, createConfig.type, membersData);
      setActiveCollectionId(id);
      setIsCreating(false);
      setCreateConfig({ title: "", baseMonth: "", type: "monthly", baseAmount: 9000, selectedMembers: new Set() });
    } catch (e) {
      console.error(e);
      alert("作成に失敗しました");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-ag-gray-100 gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={activeCollectionId || ""}
            onChange={(e) => {
              if (e.target.value === "ADD_NEW") {
                setIsCreating(true);
                // 新規作成時はオフィシャルを選択済みにする
                selectMembers("official");
              } else {
                setActiveCollectionId(e.target.value);
                setIsCreating(false);
              }
            }}
            className="text-sm font-bold text-ag-gray-800 bg-ag-gray-50 border border-ag-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ag-lime-500 max-w-xs truncate"
          >
            <option value="" disabled>集金リストを選択</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
            <option value="ADD_NEW">+ カスタム集金リストを作る</option>
          </select>
        </div>
        
        {activeCollection && (
          <span className="text-xs font-medium text-ag-gray-400 bg-ag-gray-50 px-3 py-1 rounded-lg border border-ag-gray-100 whitespace-nowrap">
            {paidCount}/{paymentsList.length}名 納入済
          </span>
        )}
      </div>

      {isCreating ? (
        <div className="p-5 border-b border-ag-gray-100 bg-ag-lime-50/20 overflow-y-auto max-h-[500px]">
          <h4 className="text-sm font-black text-ag-gray-800 mb-4">新規集金リストの作成 (手動選択)</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-ag-gray-500 mb-1">イベント/年月ID (例: 2026-05等)</label>
                <input 
                  type="month" 
                  value={createConfig.baseMonth}
                  onChange={(e) => setCreateConfig({...createConfig, baseMonth: e.target.value})}
                  className="w-full text-sm font-bold bg-white border border-ag-gray-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ag-gray-500 mb-1">表示名 (内訳)</label>
                <input 
                  type="text" 
                  value={createConfig.title}
                  onChange={(e) => setCreateConfig({...createConfig, title: e.target.value})}
                  placeholder="例: シャトル代 / 大会参加費"
                  className="w-full text-sm font-bold bg-white border border-ag-gray-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-ag-gray-500 mb-1">一人あたりの基本の請求額 (円)</label>
                <input 
                  type="number" 
                  value={createConfig.baseAmount}
                  onChange={(e) => setCreateConfig({...createConfig, baseAmount: Number(e.target.value)})}
                  className="w-full text-sm font-bold bg-white border border-ag-gray-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ag-gray-500 mb-1">種別</label>
                <select 
                  value={createConfig.type} 
                  onChange={(e) => setCreateConfig({...createConfig, type: e.target.value as any})}
                  className="w-full text-sm font-bold bg-white border border-ag-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="monthly">月謝 (3カ月ごと)</option>
                  <option value="registration">登録費</option>
                  <option value="other">その他・都度参加費など</option>
                </select>
              </div>
            </div>

            <div className="mt-4 border-t border-ag-gray-200 pt-4">
              <label className="block text-xs font-bold text-ag-gray-600 mb-2">
                対象者の選択 ({createConfig.selectedMembers.size}名)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => selectMembers("all")} className="px-2 py-1 bg-ag-gray-200 text-ag-gray-700 text-[10px] rounded hover:bg-ag-gray-300 font-bold">全選択</button>
                <button onClick={() => selectMembers("official")} className="px-2 py-1 bg-ag-lime-100 text-ag-lime-700 text-[10px] rounded hover:bg-ag-lime-200 font-bold">ｵﾌｨｼｬﾙのみ</button>
                <button onClick={() => selectMembers("light")} className="px-2 py-1 bg-sky-100 text-sky-700 text-[10px] rounded hover:bg-sky-200 font-bold">ﾗｲﾄのみ</button>
                <button onClick={() => selectMembers("none")} className="px-2 py-1 bg-ag-gray-100 text-ag-gray-500 text-[10px] rounded hover:bg-ag-gray-200 font-bold">クリア</button>
              </div>
              
              {/* 名簿リスト */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-4 bg-white rounded-xl border border-ag-gray-200 shadow-inner">
                {dbMembers.filter(m => m.membershipType !== 'coach' && m.membershipType !== 'visitor').map(m => {
                  const mType = m.membershipType || "official";
                  return (
                  <label key={m.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-ag-lime-50 rounded-lg transition-colors border border-transparent hover:border-ag-lime-100">
                    <input 
                      type="checkbox" 
                      checked={createConfig.selectedMembers.has(m.id)}
                      onChange={() => toggleMemberSelection(m.id)}
                      className="rounded border-ag-gray-300 w-4 h-4 text-ag-lime-600 focus:ring-ag-lime-500"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-black text-ag-gray-800 truncate leading-tight">{m.name}</span>
                      <span className={`text-[9px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded-full ${mType === "official" ? "bg-ag-lime-50 text-ag-lime-600" : "bg-sky-50 text-sky-600"}`}>
                        {mType === "official" ? "オフィシャル" : "ライト"}
                      </span>
                    </div>
                  </label>
                )})}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-bold text-ag-gray-500 bg-ag-gray-100 rounded-lg hover:bg-ag-gray-200"
              >
                キャンセル
              </button>
              <button 
                onClick={handleCreateManualCollection}
                disabled={!createConfig.title || !createConfig.baseMonth || createConfig.selectedMembers.size === 0}
                className="px-4 py-2 text-xs font-black text-white bg-ag-lime-600 rounded-lg hover:bg-ag-lime-700 disabled:opacity-50"
              >
                リストを作成する
              </button>
            </div>
          </div>
        </div>
      ) : activeCollection ? (
        <>
          {/* 進捗バー */}
          <div className="px-5 py-3 bg-ag-gray-50/50 border-b border-ag-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-ag-gray-500">徴収進捗</span>
              <span className="text-xs font-bold text-ag-gray-700">
                ¥{paidAmount.toLocaleString()} / ¥{totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-ag-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-ag-lime-400 to-ag-lime-500 transition-all duration-500"
                style={{ width: totalAmount > 0 ? `${(paidAmount / totalAmount) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* PayPayリンクの表示・編集 */}
          <div className="px-5 py-3 border-b border-ag-gray-100 bg-sky-50/20">
            {isEditingLink ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={paypayLinkInput}
                  onChange={(e) => setPaypayLinkInput(e.target.value)}
                  placeholder="https://paypay.me/... (またはID)"
                  className="flex-1 px-3 py-2 text-xs font-bold border border-ag-gray-200 rounded-lg outline-none"
                />
                <button onClick={handleSavePaypayLink} className="px-3 py-2 text-xs font-bold bg-ag-lime-500 text-white rounded-lg">保存</button>
                <button onClick={() => setIsEditingLink(false)} className="px-3 py-2 text-xs font-bold bg-ag-gray-200 text-ag-gray-700 rounded-lg">取消</button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <button 
                  onClick={handleCopyLink}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-black transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="text-lg leading-none">🅿️</span> 会計用PayPay送金先をコピー
                </button>
                <button 
                  onClick={() => setIsEditingLink(true)}
                  className="w-10 h-10 flex items-center justify-center bg-ag-gray-100 hover:bg-ag-gray-200 text-ag-gray-500 rounded-xl transition-colors cursor-pointer"
                  title="リンクを編集"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>

          {/* メンバー一覧 */}
          <div className="overflow-y-auto flex-1 min-h-[300px] h-[380px] divide-y divide-ag-gray-50">
            {paymentsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-ag-gray-400 p-6 text-center">
                <p className="font-bold text-sm">対象となるメンバーがいません。</p>
              </div>
            ) : (
              paymentsList.map((member) => {
                const status = statusConfig[member.status];
                // 名前からアバター文字を生成 (最初の1文字)
                const avatar = member.name.charAt(0);
                
                return (
                  <div key={member.memberId} className="px-5 py-3 flex items-center justify-between hover:bg-ag-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ag-lime-300 to-ag-lime-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {avatar}
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black text-ag-gray-800 truncate leading-none">{member.name}</p>
                          {(() => {
                            const dbm = dbMembers.find(x => String(x.id) === String(member.memberId));
                            const mType = dbm?.membershipType || "official";
                            return (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mType === "official" ? "bg-ag-lime-50 text-ag-lime-600" : "bg-sky-50 text-sky-600"}`}>
                                {mType === "official" ? "オフィシャル" : "ライト"}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-1 group">
                          {editingAmountFor === member.memberId ? (
                            <div className="flex items-center gap-1">
                              ¥<input 
                                type="number" 
                                autoFocus
                                value={editingAmountValue}
                                onChange={e => setEditingAmountValue(e.target.value)}
                                onBlur={() => handleSaveAmount(String(member.memberId))}
                                onKeyDown={e => e.key === 'Enter' && handleSaveAmount(String(member.memberId))}
                                className="w-16 px-1 border-b border-ag-lime-400 focus:outline-none text-xs font-bold"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] text-ag-gray-400 font-bold whitespace-nowrap">
                                請求額: ¥{member.targetAmount.toLocaleString()}
                              </span>
                              <button 
                                onClick={() => {
                                  setEditingAmountFor(String(member.memberId));
                                  setEditingAmountValue(String(member.targetAmount));
                                }}
                                className="opacity-0 group-hover:opacity-100 px-1 py-0.5 text-[8px] bg-ag-gray-100 hover:bg-ag-gray-200 text-ag-gray-500 rounded transition-opacity"
                              >
                                修正
                              </button>
                            </>
                          )}
                          {member.date && <span className="ml-1 text-[8px] text-ag-lime-600 bg-ag-lime-50 px-1 py-0.5 rounded">{member.date}納入済</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {member.status === "unpaid" ? (
                        <>
                          <button 
                            className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-ag-gray-100 text-ag-gray-500 hover:bg-ag-gray-200 transition-colors cursor-pointer"
                          >
                            催促
                          </button>
                          <button 
                            onClick={() => handleTogglePayment(member.memberId, member.status, member.targetAmount)}
                            className="text-xs font-black px-3 py-1.5 rounded-lg bg-red-500 text-white shadow-sm hover:bg-red-400 transition-colors cursor-pointer"
                          >
                            未納
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleTogglePayment(member.memberId, member.status, member.targetAmount)}
                          className={`text-xs font-black px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer ${
                            member.status === 'paid' ? 'bg-ag-lime-500 text-white hover:bg-ag-lime-600' : 'bg-amber-400 text-white hover:bg-amber-500'
                          }`}
                        >
                          {status.label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : activeCollectionId && activeCollectionId !== "ADD_NEW" ? (
        <div className="flex flex-col items-center justify-center h-[380px] text-ag-gray-400">
          <div className="animate-spin text-4xl mb-4">⌛</div>
          <p className="font-bold">リストを読み込み中...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[380px] text-ag-gray-400">
          <p className="font-bold">集金データがありません</p>
          <p className="text-sm mt-2">画面上部から「新しい集金リストを作る」を選択してください</p>
        </div>
      )}
    </div>
  );
}
