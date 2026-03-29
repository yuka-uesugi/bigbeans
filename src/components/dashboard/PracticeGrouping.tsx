"use client";

import { useState } from "react";

export type Participant = {
  id: string;
  name: string;
  isVisitor: boolean;
  rank?: string;
  joinIntent?: boolean;
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
}: {
  initialParticipants: Participant[];
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

  // ━━━━ 選択状態管理 ━━━━
  // 1. 複数人を一気に選ぶための配列
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // 2. 「先にコートを選ぶ」操作のための目的地の保持
  const [selectedDestination, setSelectedDestination] = useState<"unassigned" | string | null>(null);

  // アクティブなセッションを決定
  const activeSession =
    mode === "practice"
      ? practiceSession
      : gameSessions.find((s) => s.id === activeGameSessionId) || gameSessions[0];

  const activeSessionIndex =
    mode === "game" ? gameSessions.findIndex((s) => s.id === activeGameSessionId) : 0;

  // 状態の更新をモードに応じて振り分け
  const updateActiveSession = (newSession: Session) => {
    if (mode === "practice") {
      setPracticeSession(newSession);
    } else {
      setGameSessions((prev) =>
        prev.map((s) => (s.id === newSession.id ? newSession : s))
      );
    }
  };

  // ━━━━ 優先度計算（ゲームモード専用） ━━━━
  const getPriorityIds = () => {
    if (mode === "practice" || activeSessionIndex === 0) return [];
    // 直前の試合でお休み（unassigned）だった人のIDリストを取得
    const prevSession = gameSessions[activeSessionIndex - 1];
    return prevSession.unassigned.map((p) => p.id);
  };
  const priorityIds = getPriorityIds();

  // ━━━━ ドラッグ＆タップ 移動ロジック ━━━━

  // メンバーをタップした時
  const togglePersonSelection = (id: string) => {
    if (selectedDestination) {
      // パターンB：先にコート（目的地）を選択している状態で人をタップ
      // タップした人を即座にその目的地へ移動させる！
      movePeopleToDestination([id], selectedDestination);
      return;
    }

    // パターンA：通常の人選択モード
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id)); // 選択解除
    } else {
      setSelectedIds([...selectedIds, id]); // 選択追加
    }
  };

  // コート（未割り当てプール含む）をタップした時
  const handleDestinationTap = (destId: "unassigned" | string) => {
    if (selectedIds.length > 0) {
      // パターンAの終着点：人が複数選ばれている時にコートを押すと、全員をそこへ一括移動！
      movePeopleToDestination(selectedIds, destId);
      setSelectedIds([]); // 選択クリア
    } else {
      // パターンBの開始点：誰も選ばれていない時にコートを押すと、「ここに入れるモード」になる
      if (selectedDestination === destId) {
        setSelectedDestination(null); // 解除
      } else {
        setSelectedDestination(destId);
      }
    }
  };

  // 実際の人員移動処理
  const movePeopleToDestination = (personIds: string[], destId: "unassigned" | string) => {
    const newSession: Session = {
      ...activeSession,
      unassigned: [...activeSession.unassigned],
      groups: activeSession.groups.map(g => ({ ...g, members: [...g.members] }))
    };

    const movingParticipants: Participant[] = [];

    // 元の場所から抜き取る
    for (const pid of personIds) {
      let found = false;
      const unIdx = newSession.unassigned.findIndex(p => p.id === pid);
      if (unIdx !== -1) {
        movingParticipants.push(newSession.unassigned[unIdx]);
        newSession.unassigned.splice(unIdx, 1);
        found = true;
      }
      if (!found) {
        for (const g of newSession.groups) {
          const gIdx = g.members.findIndex(p => p.id === pid);
          if (gIdx !== -1) {
            movingParticipants.push(g.members[gIdx]);
            g.members.splice(gIdx, 1);
            break;
          }
        }
      }
    }

    // 先に選ばれた人（リスト作成順）が新しい場所へ入る
    if (destId === "unassigned") {
      newSession.unassigned.push(...movingParticipants);
    } else {
      const gIdx = newSession.groups.findIndex(g => g.id === destId);
      if (gIdx !== -1) {
        newSession.groups[gIdx].members.push(...movingParticipants);
      }
    }

    updateActiveSession(newSession);
  };

  // ━━━━ セッション＆グループ管理 ━━━━
  const addGameSession = () => {
    const newId = `g_${Date.now()}`;
    const newName = `第${gameSessions.length + 1}試合`;
    const newSession = createInitialSession(newId, newName);
    setGameSessions([...gameSessions, newSession]);
    setActiveGameSessionId(newId);
    setSelectedIds([]);
    setSelectedDestination(null);
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

  // メンバー描画内部コンポーネント
  const renderMember = (m: Participant) => {
    const isSelected = selectedIds.includes(m.id);
    const isPriority = priorityIds.includes(m.id);

    // 見た目の設定
    let baseStyle = "bg-white text-ag-gray-700 border-ag-gray-200 hover:bg-ag-gray-50"; // 通常
    if (isSelected) {
      baseStyle = "bg-ag-lime-500 text-white border-ag-lime-600 shadow-[0_4px_10px_rgba(132,204,22,0.4)] scale-110 z-10 relative";
    } else if (isPriority) {
      baseStyle = "bg-red-50 text-red-700 border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.3)] animate-pulse";
    } else if (m.isVisitor) {
      baseStyle = "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100";
    }

    return (
      <div
        key={m.id}
        onClick={(e) => {
          e.stopPropagation();
          togglePersonSelection(m.id);
        }}
        className={`cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-lg font-black tracking-wide border-2 transition-all ${baseStyle}`}
      >
        {isPriority && !isSelected && <span className="text-base mr-1">🔥</span>}
        {m.name}
        {m.rank && (
          <span className={`text-xs px-1.5 py-0.5 rounded opacity-90 shrink-0 ${isSelected ? "bg-white/30" : "bg-black/5"}`}>
            {m.rank}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8">
      {/* 🌟 巨大モードトグル 🌟 */}
      <div className="flex rounded-2xl bg-ag-gray-100 p-1.5 mb-6 max-w-sm mx-auto shadow-inner">
        <button
          onClick={() => {
            setMode("practice");
            setSelectedIds([]);
            setSelectedDestination(null);
          }}
          className={`flex-1 py-4 px-4 rounded-xl font-black text-base transition-all ${
            mode === "practice"
              ? "bg-white text-ag-gray-900 shadow-md"
              : "text-ag-gray-400 hover:text-ag-gray-600"
          }`}
        >
          🏸 練習グループ
        </button>
        <button
          onClick={() => {
            setMode("game");
            setSelectedIds([]);
            setSelectedDestination(null);
          }}
          className={`flex-1 py-4 px-4 rounded-xl font-black text-base transition-all ${
            mode === "game"
              ? "bg-ag-lime-500 text-white shadow-md shadow-ag-lime-200"
              : "text-ag-gray-400 hover:text-ag-gray-600"
          }`}
        >
          🔥 ゲーム回し
        </button>
      </div>

      <div className="border-t border-ag-gray-100 pt-6">
        {/* ヘッダーメッセージ */}
        <div className="mb-4">
          <p className="text-sm text-ag-gray-500 font-bold flex items-center gap-2">
            <span className="bg-ag-gray-100 text-ag-gray-600 px-2 py-0.5 rounded text-xs">操作Tip</span>
            【A】複数人選んでからコートを押す / 【B】コートを選んでから人をポンポン入れる
          </p>
        </div>

        {/* ゲームモード専用タブ */}
        {mode === "game" && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none border-b border-ag-gray-100 px-2">
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
                    ? "border-ag-lime-500 text-ag-lime-700 bg-ag-lime-50/50"
                    : "border-transparent text-ag-gray-400 hover:text-ag-gray-600 hover:bg-ag-gray-50"
                }`}
              >
                {session.name}
              </button>
            ))}
            <button
              onClick={addGameSession}
              className="flex-shrink-0 px-5 py-2.5 font-black text-sm bg-ag-gray-100 hover:bg-ag-gray-200 text-ag-gray-700 rounded-full transition-colors ml-2 shadow-sm whitespace-nowrap"
            >
              ＋ 次の試合を作る
            </button>
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
          
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-extrabold text-ag-gray-600 bg-ag-gray-100 px-3 py-1 rounded-full">
              編集中：{activeSession.name}
            </div>
            <button
              onClick={addGroup}
              className="text-xs font-black bg-black text-white px-4 py-2 rounded-xl hover:bg-ag-gray-800 transition shadow-md"
            >
              ＋ コート追加
            </button>
          </div>

          {/* 未割り当てプール */}
          <div
            className={`mb-5 rounded-3xl border-2 p-5 min-h-[100px] transition-colors relative ${
              selectedDestination === "unassigned"
                ? "border-black bg-ag-gray-100 shadow-inner"
                : selectedIds.length > 0 && activeSession.unassigned.every(p => !selectedIds.includes(p.id))
                ? "border-ag-lime-300 border-dashed bg-ag-lime-50/50 cursor-pointer"
                : "border-ag-gray-200 border-dashed bg-ag-gray-50"
            }`}
            onClick={() => handleDestinationTap("unassigned")}
          >
            {selectedDestination === "unassigned" && (
               <div className="absolute top-0 right-0 -mt-3 -mr-2 bg-black text-white text-xs font-black px-4 py-1.5 rounded-full animate-bounce shadow-lg z-20 border-2 border-white">
                 👈 ここにポンポン入れる
               </div>
            )}
            <div className="text-sm font-black text-ag-gray-400 mb-3 tracking-wide">
              休憩・未割り当て ({activeSession.unassigned.length}名)
            </div>
            {/* ゲームモードで、優先者がいる場合の案内 */}
            {mode === "game" && priorityIds.length > 0 && activeSession.unassigned.some(p => priorityIds.includes(p.id)) && (
              <div className="text-sm font-black text-red-600 mb-3 flex items-center gap-1.5 bg-red-50 inline-block px-3 py-1.5 rounded-lg border border-red-200 shadow-sm">
                <span className="text-lg">🔥</span> 前回お休みの人がいます（優先）
              </div>
            )}
            
            <div className="flex flex-wrap gap-2.5">
              {activeSession.unassigned.map(renderMember)}
            </div>
          </div>

          {/* グループリスト */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeSession.groups.map(group => {
              const isSelectedDest = selectedDestination === group.id;
              const isTargetHint = !isSelectedDest && selectedIds.length > 0 && !group.members.some(m => selectedIds.includes(m.id));

              return (
                <div
                  key={group.id}
                  className={`rounded-3xl border-2 p-5 min-h-[140px] flex flex-col transition-all relative ${
                    isSelectedDest
                      ? "border-black bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.05)] scale-[1.02] z-10"
                      : isTargetHint
                      ? "border-ag-lime-400 bg-ag-lime-50 cursor-pointer"
                      : "border-ag-gray-200 bg-white"
                  }`}
                  onClick={() => handleDestinationTap(group.id)}
                >
                  {isSelectedDest && (
                     <div className="absolute top-0 right-0 -mt-3 -mr-2 bg-black text-white text-xs font-black px-4 py-1.5 rounded-full animate-bounce shadow-lg z-20 border-2 border-white">
                       👈 ここにポンポン入れる
                     </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4 border-b-2 border-ag-gray-100 pb-3">
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => {
                        const newGroups = activeSession.groups.map(g =>
                          g.id === group.id ? { ...g, name: e.target.value } : g
                        );
                        updateActiveSession({ ...activeSession, groups: newGroups });
                      }}
                      className="font-black text-xl text-ag-gray-800 bg-transparent border-none p-0 focus:ring-0 w-2/3 truncate placeholder-ag-gray-300"
                      placeholder="コート名"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGroup(group.id);
                      }}
                      className="text-ag-gray-400 hover:text-red-600 text-sm font-black transition-colors px-3 py-1.5 bg-ag-gray-50 hover:bg-red-50 rounded-lg"
                    >
                      削除
                    </button>
                  </div>

                  <div className="flex-1 flex flex-wrap gap-2.5 content-start">
                    {group.members.map(renderMember)}
                    {group.members.length === 0 && !isSelectedDest && !isTargetHint && (
                      <span className="text-sm text-ag-gray-300 font-bold m-auto">空き</span>
                    )}
                    {isTargetHint && (
                      <span className="text-sm text-ag-lime-600 font-black m-auto animate-pulse flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                        一気に入れる
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
