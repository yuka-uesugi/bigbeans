"use client";

import { useState, useEffect } from "react";

export type Participant = {
  id: string;
  name: string;
  membershipType: "official" | "light" | "visitor" | "coach";
  rank?: string;
  joinIntent?: boolean;
  excludedFromGame?: boolean; // ゲーム不参加（見学など）
};

// 1つのコート（グループ）の型
export type Group = {
  id: string;
  name: string;
  members: Participant[];
};

// 1ゲーム（セッション）の型
export type Session = {
  id: string;
  name: string;
  unassigned: Participant[];
  groups: Group[];
};

export default function PracticeGrouping({
  initialParticipants,
  onRemoveParticipant,
}: {
  initialParticipants: Participant[];
  onRemoveParticipant?: (id: string) => void;
}) {
  // モード：練習モード（1セッションのみ）、ゲームモード（複数セッション＋優先度表示）
  const [mode, setMode] = useState<"practice" | "game">("practice");

  // 初期セッション生成
  const createInitialSession = (id: string, name: string): Session => ({
    id,
    name,
    unassigned: [...initialParticipants],
    groups: [
      { id: "g1", name: "コートA", members: [] },
      { id: "g2", name: "コートB", members: [] },
      { id: "g3", name: "コートC", members: [] },
    ],
  });

  // 練習モードのセッション状態
  const [practiceSession, setPracticeSession] = useState<Session>(
    createInitialSession("p1", "練習グループ")
  );

  // ゲームモードの複数セッション状態
  const [gameSessions, setGameSessions] = useState<Session[]>([
    createInitialSession("g_1", "第1試合"),
  ]);
  const [activeGameSessionId, setActiveGameSessionId] = useState<string>("g_1");

  // 【重要】外部から参加者データ(initialParticipants)が更新されたら、未割り当てリストを同期する
  useEffect(() => {
    const syncUnassigned = (session: Session) => {
      // 既にいずれかのコートに配置済みの人のIDを取得
      const assignedIds = new Set(session.groups.flatMap(g => g.members.map(m => m.id)));
      // 新しい参加者リストのうち、まだどこにも配置されていない人だけを「未割り当て」にセット
      return initialParticipants.filter(p => !assignedIds.has(p.id));
    };

    setPracticeSession(prev => ({ ...prev, unassigned: syncUnassigned(prev) }));
    setGameSessions(prev => prev.map(s => ({ ...s, unassigned: syncUnassigned(s) })));
  }, [initialParticipants]);
  // アクティブなセッションを決定
  const activeSession =
    mode === "practice"
      ? practiceSession
      : gameSessions.find((s) => s.id === activeGameSessionId) || gameSessions[0];

  const activeSessionIndex =
    mode === "game" ? gameSessions.findIndex((s) => s.id === activeGameSessionId) : 0;

  // ━━━━ 統計データの計算 ━━━━
  
  // 各メンバーの累計出場回数と前回休み状況を計算
  const getMemberStats = () => {
    const playCounts: Record<string, number> = {};
    const restedLastGame: Set<string> = new Set();
    
    // 全参加者の初期化
    initialParticipants.forEach(p => {
      playCounts[p.id] = 0;
    });

    // 過去の全セッションをループしてカウント
    gameSessions.forEach((session, idx) => {
      // 出場回数のカウント
      session.groups.forEach(group => {
        group.members.forEach(m => {
          if (playCounts[m.id] !== undefined) playCounts[m.id]++;
        });
      });

      // 「前回休み」の判定（現在のアクティブセッションの一つ前の状態を見る）
      if (idx === activeSessionIndex - 1) {
        session.unassigned.forEach(p => restedLastGame.add(p.id));
      }
    });

    return { playCounts, restedLastGame };
  };

  const { playCounts, restedLastGame } = getMemberStats();

  // ━━━━ 選択状態管理 ━━━━
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hintMsg, setHintMsg] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // エラー/ヒントの自動消去
  useEffect(() => {
    if (errorMsg || hintMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
        setHintMsg(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, hintMsg]);

  // ━━━━ 移動ロジック（刷新版） ━━━━

  // 重複チェック
  const isAlreadyInCurrentGame = (memberId: string) => {
    return activeSession.groups.some(g => g.members.some(m => m.id === memberId));
  };

  const togglePersonSelection = (id: string, context: "pool" | "group" = "pool") => {
    const member = initialParticipants.find(p => p.id === id);
    if (!member || excludedIds.has(id)) return;

    if (context === "pool" && isAlreadyInCurrentGame(id)) {
      setErrorMsg(`${member.name}さんはこのゲームに配置済みです`);
      return;
    }

    if (context === "group" && selectedDestination) {
        movePeopleToDestination([id], selectedDestination);
        return;
    }

    if (selectedDestination) {
      movePeopleToDestination([id], selectedDestination);
      if ((playCounts[id] || 0) >= 3) {
        setHintMsg(`${member.name}さんは出場回数が多いです`);
      }
      return;
    }

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  const handleDestinationTap = (destId: string) => {
    // 目的地が「unassigned（リストへ戻す）」の場合
    if (destId === "unassigned") {
       if (selectedIds.length > 0) {
         movePeopleToDestination(selectedIds, "unassigned");
         setSelectedIds([]);
       } else {
         setSelectedDestination(selectedDestination === "unassigned" ? null : "unassigned");
       }
       return;
    }

    if (selectedIds.length > 0) {
      movePeopleToDestination(selectedIds, destId);
      setSelectedIds([]);
    } else {
      setSelectedDestination(selectedDestination === destId ? null : destId);
    }
  };

  const movePeopleToDestination = (personIds: string[], destId: string) => {
    const movingParticipants = personIds.map(pid => 
      initialParticipants.find(p => p.id === pid)
    ).filter(p => p !== undefined) as Participant[];
    
    if (movingParticipants.length === 0) return;

    if (mode === "practice") {
      setPracticeSession(prev => {
        const newGroups = prev.groups.map(g => {
          const filteredMembers = g.members.filter(m => !personIds.includes(m.id));
          if (g.id === destId) {
            return { ...g, members: [...filteredMembers, ...movingParticipants] };
          }
          return { ...g, members: filteredMembers };
        });

        const newUnassigned = prev.unassigned.filter(m => !personIds.includes(m.id));
        if (destId === "unassigned") {
          newUnassigned.push(...movingParticipants);
        }

        return { ...prev, unassigned: newUnassigned, groups: newGroups };
      });
    } else {
      setGameSessions(prevSessions => prevSessions.map(session => {
        if (session.id !== activeGameSessionId) return session;

        const newGroups = session.groups.map(g => {
          const filteredMembers = g.members.filter(m => !personIds.includes(m.id));
          if (g.id === destId) {
            return { ...g, members: [...filteredMembers, ...movingParticipants] };
          }
          return { ...g, members: filteredMembers };
        });

        const newUnassigned = session.unassigned.filter(m => !personIds.includes(m.id));
        if (destId === "unassigned") {
          newUnassigned.push(...movingParticipants);
        }

        return { ...session, unassigned: newUnassigned, groups: newGroups };
      }));
    }
  };

  // ━━━━ セッション＆グループ管理 ━━━━
  const addGameSession = () => {
    const newId = `g_${Date.now()}`;
    const newName = `第${gameSessions.length + 1}試合`;
    
    // 全員未配置の状態の新セッション（カウントは履歴ベースなので、ここでは空のコートを用意するだけ）
    const newSession: Session = {
      id: newId,
      name: newName,
      unassigned: [...initialParticipants],
      groups: activeSession.groups.map(g => ({ ...g, id: `${g.id}_${Date.now()}`, members: [] })),
    };

    setGameSessions([...gameSessions, newSession]);
    setActiveGameSessionId(newId);
    setSelectedIds([]);
    setSelectedDestination(null);
  };

  // ゲーム参加・不参加の切り替え
  const toggleGameParticipation = (id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addGroup = () => {
    const newId = `g${Date.now()}`;
    const newName = `コート ${activeSession.groups.length + 1}`;
    updateActiveSession({
      ...activeSession,
      groups: [...activeSession.groups, { id: newId, name: newName, members: [] }]
    });
  };

  const removeGroup = (groupId: string) => {
    const groupToRemove = activeSession.groups.find(g => g.id === groupId);
    if (!groupToRemove) return;
    const newUnassigned = [...activeSession.unassigned, ...groupToRemove.members];
    const newGroups = activeSession.groups.filter(g => g.id !== groupId);
    updateActiveSession({
      ...activeSession,
      unassigned: newUnassigned,
      groups: newGroups,
    });
  };

  // ━━━━ UIパーツ描画 ━━━━

  const renderMember = (m: Participant, context: "pool" | "group" = "pool") => {
    const isSelected = selectedIds.includes(m.id);
    const isPriority = restedLastGame.has(m.id);
    const isActive = isAlreadyInCurrentGame(m.id);
    const isExcluded = excludedIds.has(m.id);
    const count = playCounts[m.id] || 0;
    const type = m.membershipType;

    // メンバー種別ごとのアクセント（枠色、背景、文字色など）
    let badgeColor = "bg-ag-gray-500";
    let baseStyle = "border-ag-gray-200 text-ag-gray-700 bg-white";
    
    if (type === "official") {
        badgeColor = "bg-ag-lime-500";
        baseStyle = "border-ag-lime-400 text-ag-lime-900 bg-ag-lime-50 hover:bg-ag-lime-100";
    } else if (type === "light") {
        badgeColor = "bg-emerald-400";
        baseStyle = "border-emerald-400 border-dashed text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-[3px]";
    } else if (type === "visitor") {
        badgeColor = "bg-sky-500";
        baseStyle = "border-sky-400 text-sky-900 bg-sky-50 shadow-[0_inset_0_0_10px_rgba(14,165,233,0.1)] hover:bg-sky-100";
    } else if (type === "coach") {
        badgeColor = "bg-amber-500";
        baseStyle = "border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100";
    }

    // 状態に基づいた全体スタイルの組み合わせ
    let style = `${baseStyle} hover:brightness-95`;
    if (isExcluded) {
      style = "bg-ag-gray-50 border-ag-gray-200 text-ag-gray-300 opacity-40 grayscale";
    } else if (isActive && context === "pool") {
      style = "bg-ag-gray-50 border-ag-gray-200 text-ag-gray-300 opacity-60 cursor-not-allowed grayscale";
    } else if (isPriority && context === "pool") {
      style = `${baseStyle} border-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-pulse`;
    } else if (isSelected) {
      style = "bg-ag-lime-500 text-white border-ag-lime-600 shadow-lg scale-110 z-10 brightness-110";
    }

    return (
      <div key={m.id} className="relative group inline-flex">
        <div
          onClick={(e) => {
            e.stopPropagation();
            togglePersonSelection(m.id, context);
          }}
          className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-2xl text-base sm:text-lg font-black transition-all border-2 select-none ${style}`}
        >
          {isPriority && !isActive && context === "pool" && <span className="text-xl">✨</span>}
          <span className="leading-none">{m.name.replace("[V] ", "")}</span>
          
          {/* 出場回数バッジ (右上) */}
          <div className={`absolute -top-2 -right-2 w-6 h-6 ${badgeColor} text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm`}>
            {count}
          </div>
        </div>

        {/* 不参加切り替えボタン (プールにいるときだけ表示) */}
        {context === "pool" && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleGameParticipation(m.id);
              }}
              className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm z-30 transition-all ${
                isExcluded ? "bg-red-500 text-white" : "bg-white border text-ag-gray-400 hover:bg-ag-gray-100"
              }`}
            >
              {isExcluded ? "▶️" : "⏸"}
            </button>
        )}

        {/* メンバー削除ボタン (手動でメンバーから外す) */}
        {onRemoveParticipant && context === "pool" && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`${m.name}さんを本日の参加メンバーから完全に外します（削除）。よろしいですか？`)) {
                   onRemoveParticipant(m.id);
                }
              }}
              className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white shadow-sm z-30 transition-all font-black scale-90 opacity-80 hover:opacity-100 hover:scale-100"
            >
              ✕
            </button>
        )}
      </div>
    );
  };

  // ━━━━ メイン描画 ━━━━

  return (
    <div className="mt-8 space-y-6">
      {/* エラー/警告通知エリア */}
      <div className="fixed top-20 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {errorMsg && (
          <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-black animate-in slide-in-from-right duration-300">
            🚫 {errorMsg}
          </div>
        )}
        {hintMsg && (
          <div className="bg-amber-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-black animate-in slide-in-from-right duration-300">
            💡 {hintMsg}
          </div>
        )}
      </div>

      {/* 🌟 巨大モードトグル 🌟 */}
      <div className="flex rounded-2xl bg-ag-gray-100 p-1.5 mb-6 max-w-sm mx-auto shadow-inner">
        <button
          onClick={() => setMode("practice")}
          className={`flex-1 py-4 px-4 rounded-xl font-black text-base transition-all ${
            mode === "practice" ? "bg-white text-ag-gray-900 shadow-md" : "text-ag-gray-400"
          }`}
        >
          🏸 練習
        </button>
        <button
          onClick={() => setMode("game")}
          className={`flex-1 py-4 px-4 rounded-xl font-black text-base transition-all ${
            mode === "game" ? "bg-ag-lime-500 text-white shadow-md shadow-ag-lime-200" : "text-ag-gray-400"
          }`}
        >
          🔥 ゲーム
        </button>
      </div>

      {/* ゲーム回し操作パネル */}
      <div className="border-t border-ag-gray-100 pt-6">
        {mode === "game" && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
            {gameSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setActiveGameSessionId(session.id);
                  setSelectedIds([]);
                  setSelectedDestination(null);
                }}
                className={`flex-shrink-0 px-6 py-3 rounded-t-xl font-black text-base transition-all border-b-4 ${
                  activeGameSessionId === session.id
                    ? "border-ag-lime-50 border-b-ag-lime-500 text-ag-lime-700 bg-ag-lime-50/50"
                    : "border-transparent text-ag-gray-400 hover:text-ag-gray-600"
                }`}
              >
                {session.name}
              </button>
            ))}
            <button
              onClick={addGameSession}
              className="flex-shrink-0 px-5 py-2.5 font-black text-sm bg-ag-gray-100 hover:bg-ag-gray-200 text-ag-gray-700 rounded-full transition-colors ml-2"
            >
              ＋ 次の試合
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* ━━━━ メンバープール（15人全員） ━━━━ */}
          <div 
            className={`rounded-3xl border-2 p-6 transition-all bg-ag-gray-50/50 ${
              selectedDestination === "unassigned" ? "border-black bg-white shadow-xl" : "border-ag-gray-200"
            }`}
            onClick={() => handleDestinationTap("unassigned")}
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏸</span>
                <h4 className="text-lg font-black text-ag-gray-800 tracking-tight">
                  メンバープール（おやすみ中を優先表示）
                </h4>
              </div>
              <div className="text-[10px] text-ag-gray-400 font-bold uppercase tracking-widest">
                All Participants ({initialParticipants.length})
              </div>
            </div>

            <div className="flex flex-wrap gap-3 sm:gap-4">
              {/* お休み中のメンバーを上にソート */}
              {[...initialParticipants]
                .sort((a, b) => {
                  const aActive = isAlreadyInCurrentGame(a.id) ? 1 : 0;
                  const bActive = isAlreadyInCurrentGame(b.id) ? 1 : 0;
                  if (aActive !== bActive) return aActive - bActive;
                  
                  const aPrio = restedLastGame.has(a.id) && !excludedIds.has(a.id) ? 0 : 1;
                  const bPrio = restedLastGame.has(b.id) && !excludedIds.has(b.id) ? 0 : 1;
                  return aPrio - bPrio;
                })
                .map(m => renderMember(m, "pool"))}
            </div>
            
            {selectedDestination === "unassigned" && (
              <div className="mt-4 text-center text-ag-lime-600 font-black text-sm animate-bounce">
                👇 人を選んでここに戻す
              </div>
            )}
          </div>

          {/* ━━━━ コート（グループ） ━━━━ */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-black text-ag-gray-800 flex items-center gap-2">
              <span className="text-2xl">🏟️</span> コート配置
            </h4>
            <button
              onClick={addGroup}
              className="text-xs font-black bg-black text-white px-4 py-2 rounded-xl hover:bg-ag-gray-800 transition"
            >
              ＋ コート追加
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSession.groups.map(group => {
              const isSelectedDest = selectedDestination === group.id;
              return (
                <div
                  key={group.id}
                  className={`rounded-3xl border-2 p-5 min-h-[160px] flex flex-col transition-all relative ${
                    isSelectedDest ? "border-black bg-white shadow-2xl scale-[1.02] z-10" : "border-ag-gray-200 bg-white"
                  }`}
                  onClick={() => handleDestinationTap(group.id)}
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-ag-gray-100">
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => {
                        const newGroups = activeSession.groups.map(g =>
                          g.id === group.id ? { ...g, name: e.target.value } : g
                        );
                        updateActiveSession({ ...activeSession, groups: newGroups });
                      }}
                      className="font-black text-xl text-ag-gray-800 bg-transparent border-none p-0 focus:ring-0 w-2/3"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGroup(group.id);
                      }}
                      className="text-ag-gray-400 hover:text-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </div>

                  <div className="flex-1 flex flex-wrap gap-3 content-start">
                    {group.members.map(m => renderMember(m, "group"))}
                    {group.members.length === 0 && !isSelectedDest && (
                      <div className="m-auto text-ag-gray-300 font-bold text-sm italic">
                        メンバー未配置
                      </div>
                    )}
                  </div>
                  
                  {isSelectedDest && (
                    <div className="absolute top-0 right-0 -mt-3 -mr-2 bg-black text-white text-[10px] font-black px-4 py-1.5 rounded-full animate-bounce shadow-lg z-20">
                      👈 ここにポンポン入れる
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
