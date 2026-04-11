"use client";

import { useState, useEffect } from "react";
import {
  subscribeToTasks,
  createTask,
  updateTask,
  deleteTask,
  seedTaskData,
  type TaskData,
  type TaskStatus,
  type TaskCategory,
  type TaskPriority,
} from "@/lib/tasks";
import { subscribeToMembers, upsertMember } from "@/lib/members";
import { memberList } from "@/data/memberList";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; headerBg: string; icon: string }> = {
  todo:  { label: "未着手", color: "text-ag-gray-500", bg: "bg-ag-gray-50", headerBg: "bg-ag-gray-100", icon: "○" },
  doing: { label: "進行中", color: "text-amber-600", bg: "bg-amber-50", headerBg: "bg-amber-100", icon: "▷" },
  done:  { label: "完了",   color: "text-ag-lime-600", bg: "bg-ag-lime-50", headerBg: "bg-ag-lime-100", icon: "✓" },
};

const PRIORITY_CONFIG = {
  high:   { label: "高",  color: "text-red-500",    bg: "bg-red-50 border-red-200" },
  medium: { label: "中",  color: "text-amber-500",  bg: "bg-amber-50 border-amber-200" },
  low:    { label: "低",  color: "text-ag-gray-400", bg: "bg-ag-gray-50 border-ag-gray-200" },
};

const CATEGORIES: TaskCategory[] = ["運営", "会計", "大会", "施設", "その他"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [isSeedingMembers, setIsSeedingMembers] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    assignees: string[];
    deadline: string;
    status: TaskStatus;
    category: TaskCategory;
    note: string;
    priority: TaskPriority;
  }>({
    title: "", assignees: [], deadline: "", status: "todo",
    category: "運営", note: "", priority: "medium",
  });

  // Firestoreリアルタイム購読
  useEffect(() => {
    const unsubTasks = subscribeToTasks((data) => {
      setTasks(data);
    });
    const unsubMembers = subscribeToMembers((data) => {
      setMembers(data);
    });
    return () => {
      unsubTasks();
      unsubMembers();
    };
  }, []);

  const handleAddTask = async () => {
    if (!form.title.trim()) return;
    setIsSubmitting(true);
    try {
      await createTask({
        title: form.title,
        assignees: form.assignees,
        deadline: form.deadline,
        status: form.status,
        category: form.category,
        note: form.note,
        priority: form.priority,
      });
      setShowForm(false);
      setForm({ title: "", assignees: [], deadline: "", status: "todo", category: "運営", note: "", priority: "medium" });
    } catch (err) {
      console.error("タスク追加エラー:", err);
      alert("タスクの追加に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveTask = async (id: string, newStatus: TaskStatus) => {
    try {
      await updateTask(id, { status: newStatus });
    } catch (err) {
      console.error("ステータス変更エラー:", err);
      alert("ステータスの変更に失敗しました。");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("このタスクを削除しますか？")) return;
    try {
      await deleteTask(id);
    } catch (err) {
      console.error("タスク削除エラー:", err);
      alert("削除に失敗しました。");
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const count = await seedTaskData();
      alert(`タスク${count}件をFirestoreに投入しました！`);
    } catch (err) {
      console.error("データ投入エラー:", err);
      alert("データ投入に失敗しました。");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSeedMembers = async () => {
    setIsSeedingMembers(true);
    try {
      for (const m of memberList) {
        await upsertMember(m);
      }
      alert(`名簿データ${memberList.length}件をFirestoreに投入しました！`);
    } catch (err) {
      console.error("名簿投入エラー:", err);
      alert("名簿の投入に失敗しました。");
    } finally {
      setIsSeedingMembers(false);
    }
  };

  const isOverdue = (deadline: string) => deadline && new Date(deadline) < new Date();

  const columns: TaskStatus[] = ["todo", "doing", "done"];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-ag-gray-900 tracking-tight">
            タスク管理
          </h1>
          <p className="text-base sm:text-lg font-bold text-ag-gray-500 mt-2">担当者・期限・進行状況を一元管理</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto px-8 py-4 bg-ag-lime-500 text-white rounded-2xl text-lg font-black hover:bg-ag-lime-600 transition-all shadow-md active:scale-95"
        >
          + タスクを追加
        </button>
      </div>

      {/* カンバンボード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(status => {
          const cfg = STATUS_CONFIG[status];
          const col = tasks.filter(t => t.status === status);
          return (
            <div key={status} className="bg-white rounded-[2.5rem] border-2 border-ag-gray-100 shadow-xl overflow-hidden flex flex-col h-full">
              {/* カラムヘッダー */}
              <div className={`px-6 py-5 ${cfg.headerBg} flex items-center justify-between border-b-2 border-ag-gray-100/50`}>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-black ${cfg.color}`}>{cfg.icon}</span>
                  <h3 className={`text-xl font-black tracking-tight ${cfg.color}`}>{cfg.label}</h3>
                </div>
                <span className="text-sm font-black bg-white text-ag-gray-600 px-3.5 py-1.5 rounded-full shadow-sm ring-1 ring-ag-gray-100">
                  {col.length}件
                </span>
              </div>

              {/* タスクリスト */}
              <div className="p-4 space-y-4 min-h-[300px] flex-1 bg-ag-gray-50/30">
                {col.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-ag-gray-300 text-lg font-black italic gap-2 opacity-50">
                    EMPTY
                    <p className="text-sm">タスクなし</p>
                  </div>
                )}
                {col.map(task => {
                  const pCfg = PRIORITY_CONFIG[task.priority];
                  const overdue = isOverdue(task.deadline) && task.status !== "done";
                  return (
                    <div key={task.id}
                      className="bg-white rounded-3xl p-6 border-2 border-ag-gray-100 hover:border-ag-lime-400 hover:shadow-xl transition-all space-y-4 group"
                    >
                      {/* タイトルと優先度 */}
                      <div className="flex items-start gap-3">
                        <span className={`text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-lg border-2 shrink-0 mt-1 shadow-sm uppercase ${pCfg.bg} ${pCfg.color}`}>
                          {pCfg.label}
                        </span>
                        <p className="text-xl sm:text-2xl font-black text-ag-gray-900 leading-[1.2] tracking-tight flex-1">{task.title}</p>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-black shrink-0"
                        >削除</button>
                      </div>

                      {/* 期限 */}
                      {task.deadline && (
                        <div className={`flex items-center gap-2 text-base sm:text-lg font-black ${overdue ? "text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100" : "text-ag-gray-500"}`}>
                          <span className="text-sm font-black uppercase tracking-tighter opacity-70">
                            {overdue ? "ALERT" : "DUE"}
                          </span>
                          <span className="tracking-tight">{overdue ? "【期限超過】" : ""}{task.deadline.replace(/-/g, "/")}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        {/* 担当者 */}
                        {task.assignees.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {task.assignees.map(a => (
                              <span key={a} className="text-xs sm:text-sm font-black bg-ag-gray-100 border-2 border-ag-gray-200 text-ag-gray-700 px-3 py-1 rounded-full shadow-sm">
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* カテゴリ */}
                        <span className="inline-block text-xs sm:text-sm font-black bg-ag-lime-100 text-ag-lime-700 border-2 border-ag-lime-200 px-3 py-1 rounded-xl shadow-sm">
                          {task.category}
                        </span>
                      </div>

                      {/* 備考 */}
                      {task.note && (
                        <p className="text-sm sm:text-base text-ag-gray-500 font-bold leading-relaxed bg-ag-gray-50 p-4 rounded-2xl border border-ag-gray-100 italic">
                          {task.note}
                        </p>
                      )}

                      {/* ステータス移動ボタン */}
                      <div className="flex gap-3 pt-2">
                        {status !== "todo" && (
                          <button onClick={() => moveTask(task.id, status === "doing" ? "todo" : "doing")}
                            className="flex-1 py-4 text-base sm:text-lg font-black bg-white border-2 border-ag-gray-200 text-ag-gray-500 rounded-2xl hover:bg-ag-gray-50 hover:border-ag-gray-300 transition-all shadow-sm active:scale-95">
                            ← 戻す
                          </button>
                        )}
                        {status !== "done" && (
                          <button onClick={() => moveTask(task.id, status === "todo" ? "doing" : "done")}
                            className="flex-1 py-4 text-base sm:text-lg font-black bg-ag-lime-500 text-white rounded-2xl hover:bg-ag-lime-600 shadow-lg shadow-ag-lime-500/20 active:scale-95 transition-all">
                            {status === "todo" ? "着手する →" : "完了"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* タスク追加モーダル */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-ag-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowForm(false)} />
          <div className="relative w-full sm:max-w-xl rounded-[2.5rem] bg-white shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-br from-ag-gray-800 to-ag-gray-900 text-white px-8 py-6">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                新しいタスクを追加
              </h2>
            </div>
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-sm font-black text-ag-gray-500 uppercase block mb-2 ml-1">タスク名</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="例: 大会申込書の作成"
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-6 py-4 text-lg font-bold focus:border-ag-lime-400 focus:bg-white outline-none transition-all shadow-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-black text-ag-gray-500 uppercase block mb-2 ml-1">優先度</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as TaskPriority})}
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-5 py-4 text-lg font-black outline-none appearance-none cursor-pointer focus:border-ag-lime-400 focus:bg-white shadow-sm">
                    <option value="high">高（お急ぎ）</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-black text-ag-gray-500 uppercase block mb-2 ml-1">カテゴリ</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as TaskCategory})}
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-5 py-4 text-lg font-black outline-none appearance-none cursor-pointer focus:border-ag-lime-400 focus:bg-white shadow-sm">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-ag-gray-500 uppercase block mb-2 ml-1">期限（いつまで？）</label>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-6 py-4 text-lg font-bold outline-none cursor-pointer focus:border-ag-lime-400 focus:bg-white shadow-sm" />
              </div>

              <div>
                <label className="text-sm font-black text-ag-gray-500 uppercase block mb-3 ml-1">担当者（だれ？）</label>
                
                {/* 選択済みの担当者（タグ形式） */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.assignees.map(a => (
                    <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-ag-lime-500 text-white rounded-xl text-sm font-black shadow-sm">
                      {a}
                      <button type="button" onClick={() => setForm({...form, assignees: form.assignees.filter(name => name !== a)})}
                        className="hover:bg-ag-lime-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                        ✕
                      </button>
                    </span>
                  ))}
                  {form.assignees.length === 0 && <span className="text-ag-gray-300 text-sm font-bold ml-1 italic">未設定</span>}
                </div>

                {/* プルダウン選択 */}
                <select 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !form.assignees.includes(val)) {
                      setForm({...form, assignees: [...form.assignees, val]});
                    }
                    e.target.value = ""; // リセット
                  }}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-5 py-4 text-lg font-black outline-none appearance-none cursor-pointer focus:border-ag-lime-400 focus:bg-white shadow-sm"
                >
                  <option value="">+ 担当者を追加...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.name} disabled={form.assignees.includes(m.name)}>
                      {m.name} {m.role ? `(${m.role})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ag-gray-400 mt-2 ml-1">※プルダウンから選択して追加してください</p>
              </div>

              <div>
                <label className="text-sm font-black text-ag-gray-500 uppercase block mb-2 ml-1">備考・詳細メモ</label>
                <textarea rows={3} value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                  placeholder="追加情報があれば入力してください"
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-6 py-4 text-lg font-bold outline-none resize-none focus:border-ag-lime-400 focus:bg-white shadow-sm" />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowForm(false)} className="flex-1 py-5 text-lg font-black text-ag-gray-400 border-2 border-ag-gray-100 rounded-[1.5rem] hover:bg-ag-gray-50 transition-all">キャンセル</button>
                <button onClick={handleAddTask} disabled={isSubmitting}
                  className="flex-[2] py-5 bg-ag-lime-500 text-white rounded-[1.5rem] text-xl font-black hover:bg-ag-lime-600 shadow-xl shadow-ag-lime-500/20 active:scale-95 transition-all disabled:opacity-50">
                  {isSubmitting ? "追加中..." : "以上の項目で追加する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 初期データ投入ボタン（データが空の時のみ） */}
      <div className="flex flex-col sm:flex-row gap-6 mt-8">
        {tasks.length === 0 && (
          <div className="flex-1 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center">
            <h3 className="text-xl font-black text-amber-900 mb-3">タスクデータがありません</h3>
            <p className="text-base font-bold text-amber-700 mb-4">サンプルタスクをFirestoreに投入しますか？</p>
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="w-full px-8 py-3 bg-amber-600 text-white font-black rounded-xl shadow-lg hover:bg-amber-700 transition-all disabled:opacity-50"
            >
              {isSeeding ? "投入中..." : "サンプルタスクを投入"}
            </button>
          </div>
        )}

        {members.length === 0 && (
          <div className="flex-1 bg-ag-lime-50 border-2 border-ag-lime-200 rounded-2xl p-6 text-center">
            <h3 className="text-xl font-black text-ag-lime-900 mb-3">名簿データがありません</h3>
            <p className="text-base font-bold text-ag-lime-700 mb-4">保存されている名簿（{memberList.length}名）をFirestoreに投入しますか？</p>
            <button
              onClick={handleSeedMembers}
              disabled={isSeedingMembers}
              className="w-full px-8 py-3 bg-ag-lime-600 text-white font-black rounded-xl shadow-lg hover:bg-ag-lime-700 transition-all disabled:opacity-50"
            >
              {isSeedingMembers ? "投入中..." : "名簿データをFirestoreに投入"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
