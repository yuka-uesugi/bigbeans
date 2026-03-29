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
  // 初期セッションの生成
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

  const [sessions, setSessions] = useState<Session[]>([
    createInitialSession("s1", "第1回戦"),
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>("s1");

  // 選択中のメンバーを保持（移動・入れ替え元）
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // いま表示中のセッションを取得
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeSessionIndex = sessions.findIndex((s) => s.id === activeSessionId);

  // 全参加者の中からIDでParticipantを検索・取得（アクティブなセッションからのみ）
  const findParticipant = (id: string): Participant | undefined => {
    const un = activeSession.unassigned.find((p) => p.id === id);
    if (un) return un;
    for (const g of activeSession.groups) {
      const gm = g.members.find((p) => p.id === id);
      if (gm) return gm;
    }
    return undefined;
  };

  // 状態の更新をラッパーする関数
  const updateActiveSession = (newSession: Session) => {
    const newSessions = [...sessions];
    newSessions[activeSessionIndex] = newSession;
    setSessions(newSessions);
  };

  // セッションの追加
  const addSession = () => {
    const newId = `s${Date.now()}`;
    const newName = `第${sessions.length + 1}回戦`;
    const newSession = createInitialSession(newId, newName);
    setSessions([...sessions, newSession]);
    setActiveSessionId(newId);
    setSelectedId(null); // セッション切替時は選択をリセット
  };

  // セッションの切り替え
  const handleTabChange = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setSelectedId(null);
  };

  // メンバーをタップした時の処理（選択 or 入れ替え/移動先として決定）
  const handleMemberTap = (id: string) => {
    if (!selectedId) {
      // 誰も選択されていなければ、このメンバーを選択
      setSelectedId(id);
      return;
    }

    if (selectedId === id) {
      // 同じ人を再度タップしたら選択解除
      setSelectedId(null);
      return;
    }

    // 別の人が選択済みの場合 → 入れ替え（スワップ）処理
    const p1 = findParticipant(selectedId);
    const p2 = findParticipant(id);
    if (!p1 || !p2) return;

    // 現在の状態をコピーして新しい状態を作成
    const newSession: Session = {
      ...activeSession,
      unassigned: [...activeSession.unassigned],
      groups: activeSession.groups.map(g => ({ ...g, members: [...g.members] }))
    };

    // p1とp2の「所属場所」と「インデックス」を探す
    let p1Location: "unassigned" | string = "unassigned";
    let p1Index = newSession.unassigned.findIndex(p => p.id === p1.id);
    if (p1Index === -1) {
      for (const g of newSession.groups) {
        p1Index = g.members.findIndex(p => p.id === p1.id);
        if (p1Index !== -1) {
          p1Location = g.id;
          break;
        }
      }
    }

    let p2Location: "unassigned" | string = "unassigned";
    let p2Index = newSession.unassigned.findIndex(p => p.id === p2.id);
    if (p2Index === -1) {
      for (const g of newSession.groups) {
        p2Index = g.members.findIndex(p => p.id === p2.id);
        if (p2Index !== -1) {
          p2Location = g.id;
          break;
        }
      }
    }

    // 両方を対象リストから削除して、相手の場所へ挿入
    if (p1Location === "unassigned") newSession.unassigned.splice(p1Index, 1, p2);
    else newSession.groups.find(g => g.id === p1Location)!.members.splice(p1Index, 1, p2);

    if (p2Location === "unassigned") newSession.unassigned.splice(p2Index, 1, p1);
    else newSession.groups.find(g => g.id === p2Location)!.members.splice(p2Index, 1, p1);

    updateActiveSession(newSession);
    setSelectedId(null);
  };

  // グループ（または未割り当てプール）の空き領域をタップした時の処理（移動）
  const handleAreaTap = (targetId: "unassigned" | string) => {
    if (!selectedId) return;

    const p = findParticipant(selectedId);
    if (!p) return;

    const newSession: Session = {
      ...activeSession,
      unassigned: [...activeSession.unassigned],
      groups: activeSession.groups.map(g => ({ ...g, members: [...g.members] }))
    };

    // 元の場所から削除
    let removed = false;
    const unIndex = newSession.unassigned.findIndex(x => x.id === selectedId);
    if (unIndex !== -1) {
      newSession.unassigned.splice(unIndex, 1);
      removed = true;
    } else {
      for (const g of newSession.groups) {
        const mIndex = g.members.findIndex(x => x.id === selectedId);
        if (mIndex !== -1) {
          g.members.splice(mIndex, 1);
          removed = true;
          break;
        }
      }
    }

    if (!removed) return;

    // 新しい場所へ追加
    if (targetId === "unassigned") {
      newSession.unassigned.push(p);
    } else {
      const gIndex = newSession.groups.findIndex(g => g.id === targetId);
      if (gIndex !== -1) {
        newSession.groups[gIndex].members.push(p);
      }
    }

    updateActiveSession(newSession);
    setSelectedId(null);
  };

  // グループの追加と削除
  const addGroup = () => {
    const newId = `g${Date.now()}`;
    const newName = `グループ ${activeSession.groups.length + 1}`;
    updateActiveSession({
      ...activeSession,
      groups: [...activeSession.groups, { id: newId, name: newName, members: [] }]
    });
  };

  const removeGroup = (groupId: string) => {
    const groupToRemove = activeSession.groups.find(g => g.id === groupId);
    if (!groupToRemove) return;

    // グループ内のメンバーを未割り当てに戻す
    const newUnassigned = [...activeSession.unassigned, ...groupToRemove.members];
    const newGroups = activeSession.groups.filter(g => g.id !== groupId);

    updateActiveSession({
      ...activeSession,
      unassigned: newUnassigned,
      groups: newGroups,
    });
  };

  // メンバーを描画する内部コンポーネント
  const renderMember = (m: Participant) => {
    const isSelected = selectedId === m.id;
    return (
      <div
        key={m.id}
        onClick={(e) => {
          e.stopPropagation();
          handleMemberTap(m.id);
        }}
        className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-extrabold border transition-all ${
          isSelected
            ? "bg-ag-lime-100 text-ag-lime-700 border-ag-lime-500 shadow-[0_0_0_2px_rgba(132,204,22,0.3)] scale-105 z-10 relative" // 選択時
            : m.isVisitor
            ? "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100" // ビジター
            : "bg-white text-ag-gray-700 border-ag-gray-200 hover:bg-ag-gray-50" // 通常メンバー
        }`}
      >
        {m.name}
        {m.rank && (
          <span className="text-[10px] bg-white/50 px-1 py-0.5 rounded opacity-80 shrink-0">
            {m.rank}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 border-t border-ag-gray-100 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-black text-ag-gray-800 flex items-center gap-2">
             <span className="text-2xl">🏸</span> グループ分け（タップして移動・入れ替え）
          </h3>
          <p className="text-sm text-ag-gray-500 font-bold mt-1">選んでから空きスペースをタップで移動、人をタップで入れ替え。</p>
        </div>
      </div>

      {/* セッションタブ領域 */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none border-b border-ag-gray-100">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => handleTabChange(session.id)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-t-xl font-black text-sm transition-all border-b-2 ${
              activeSessionId === session.id
                ? "border-ag-lime-500 text-ag-lime-600 bg-ag-lime-50/50"
                : "border-transparent text-ag-gray-400 hover:text-ag-gray-600 hover:bg-ag-gray-50"
            }`}
          >
            {session.name}
          </button>
        ))}
        <button
          onClick={addSession}
          className="whitespace-nowrap px-4 py-2 font-black text-xs bg-ag-gray-100 hover:bg-ag-gray-200 text-ag-gray-600 rounded-full transition-colors ml-2 shadow-sm"
        >
          ＋ 次を追加
        </button>
      </div>

      {/* 選択中のセッション画面 */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-extrabold text-ag-gray-600 bg-ag-gray-100 px-3 py-1 rounded-full">
            編集中：{activeSession.name}
          </div>
          <button
            onClick={addGroup}
            className="text-xs font-black bg-black text-white px-4 py-2 rounded-xl hover:bg-ag-gray-800 transition shadow-md"
          >
            ＋ グループ追加
          </button>
        </div>

        {/* 未割り当てプール */}
        <div
          className={`mb-5 rounded-2xl border-2 border-dashed p-4 min-h-[100px] transition-colors ${
            selectedId && findParticipant(selectedId) && activeSession.unassigned.findIndex(p => p.id === selectedId) === -1
              ? "border-ag-lime-300 bg-ag-lime-50/50 cursor-pointer" // 別の場所の人が選択されていればドロップ先ハイライト
              : "border-ag-gray-200 bg-ag-gray-50"
          }`}
          onClick={() => handleAreaTap("unassigned")}
        >
          <div className="text-xs font-extrabold text-ag-gray-400 mb-2 uppercase tracking-wide">
            未割り当て ({activeSession.unassigned.length}名)
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSession.unassigned.map(renderMember)}
          </div>
        </div>

        {/* グループリスト */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeSession.groups.map(group => {
            const isTarget = selectedId && activeSession.groups.findIndex(g => g.id === group.id) !== -1 && !group.members.some(m => m.id === selectedId);

            return (
              <div
                key={group.id}
                className={`rounded-2xl border-2 p-4 min-h-[140px] flex flex-col transition-colors ${
                  isTarget
                    ? "border-ag-lime-400 bg-ag-lime-50 cursor-pointer shadow-inner"
                    : "border-ag-gray-100 bg-white shadow-sm"
                }`}
                onClick={() => handleAreaTap(group.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => {
                      const newGroups = activeSession.groups.map(g =>
                        g.id === group.id ? { ...g, name: e.target.value } : g
                      );
                      updateActiveSession({ ...activeSession, groups: newGroups });
                    }}
                    className="font-black text-ag-gray-800 bg-transparent border-none p-0 focus:ring-0 w-2/3 truncate"
                    onClick={(e) => e.stopPropagation()} // 入力中にグループ移動判定されないように
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGroup(group.id);
                    }}
                    className="text-ag-gray-300 hover:text-red-500 text-xs font-extrabold transition-colors px-2 py-1"
                  >
                    削除
                  </button>
                </div>

                <div className="flex-1 flex flex-wrap gap-2 content-start">
                  {group.members.map(renderMember)}
                  {group.members.length === 0 && !isTarget && (
                    <span className="text-sm text-ag-gray-300 font-bold m-auto">空き</span>
                  )}
                  {isTarget && (
                    <span className="text-sm text-ag-lime-500 font-extrabold m-auto animate-pulse">
                      ここへ移動
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
