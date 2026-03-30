"use client";

import { useState } from "react";

type Status = "todo" | "doing" | "done";
type Category = "運営" | "会計" | "大会" | "施設" | "その他";

interface Task {
  id: number;
  title: string;
  assignees: string[];
  deadline: string;
  status: Status;
  category: Category;
  note: string;
  priority: "high" | "medium" | "low";
}

const INITIAL_TASKS: Task[] = [
  { id: 1, title: "4月の練習場所予約確認", assignees: ["上杉", "田中"], deadline: "2026-04-01", status: "done", category: "施設", note: "さくらBADO・BB・トリプルスに確認済み", priority: "high" },
  { id: 2, title: "新年度会費の振込案内を送る", assignees: ["上杉"], deadline: "2026-04-10", status: "doing", category: "会計", note: "LINEグループで案内する", priority: "high" },
  { id: 3, title: "大会申込書の作成", assignees: ["佐藤", "鈴木"], deadline: "2026-04-20", status: "todo", category: "大会", note: "春季市民大会エントリー締切4/20", priority: "medium" },
  { id: 4, title: "ユニフォームデザイン案の収集", assignees: ["田中"], deadline: "2026-05-01", status: "todo", category: "運営", note: "希望者にアンケートをとる", priority: "low" },
  { id: 5, title: "5月練習場所の仮押さえ", assignees: ["上杉"], deadline: "2026-04-15", status: "todo", category: "施設", note: "中川西・北山田を確認", priority: "high" },
];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; headerBg: string; icon: string }> = {
  todo:  { label: "未着手", color: "text-ag-gray-500", bg: "bg-ag-gray-50", headerBg: "bg-ag-gray-100", icon: "○" },
  doing: { label: "進行中", color: "text-amber-600", bg: "bg-amber-50", headerBg: "bg-amber-100", icon: "▷" },
  done:  { label: "完了",   color: "text-ag-lime-600", bg: "bg-ag-lime-50", headerBg: "bg-ag-lime-100", icon: "✓" },
};

const PRIORITY_CONFIG = {
  high:   { label: "高",  color: "text-red-500",    bg: "bg-red-50 border-red-200" },
  medium: { label: "中",  color: "text-amber-500",  bg: "bg-amber-50 border-amber-200" },
  low:    { label: "低",  color: "text-ag-gray-400", bg: "bg-ag-gray-50 border-ag-gray-200" },
};

const MEMBERS = ["上杉", "田中", "佐藤", "鈴木", "山田", "渡辺", "伊藤", "中村", "小林", "加藤"];
const CATEGORIES: Category[] = ["運営", "会計", "大会", "施設", "その他"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Task>>({
    title: "", assignees: [], deadline: "", status: "todo",
    category: "運営", note: "", priority: "medium",
  });

  const handleAddTask = () => {
    if (!form.title?.trim()) return;
    const newTask: Task = {
      id: Date.now(),
      title: form.title!,
      assignees: form.assignees || [],
      deadline: form.deadline || "",
      status: form.status as Status || "todo",
      category: form.category as Category || "その他",
      note: form.note || "",
      priority: form.priority as "high" | "medium" | "low" || "medium",
    };
    setTasks([...tasks, newTask]);
    setShowForm(false);
    setForm({ title: "", assignees: [], deadline: "", status: "todo", category: "運営", note: "", priority: "medium" });
  };

  const moveTask = (id: number, newStatus: Status) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const isOverdue = (deadline: string) => deadline && new Date(deadline) < new Date();

  const columns: Status[] = ["todo", "doing", "done"];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-ag-gray-900 flex items-center gap-3 tracking-tight">
            <span className="text-4xl">✅</span> タスク管理
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
                  <div className="flex flex-col items-center justify-center h-48 text-ag-gray-300 text-lg font-bold italic gap-2 opacity-50">
                    <span className="text-4xl">📭</span>
                    タスクなし
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
                        <p className="text-xl sm:text-2xl font-black text-ag-gray-900 leading-[1.2] tracking-tight">{task.title}</p>
                      </div>

                      {/* 期限 */}
                      {task.deadline && (
                        <div className={`flex items-center gap-2 text-base sm:text-lg font-black ${overdue ? "text-red-600 bg-red-50 p-2 rounded-xl border border-red-100" : "text-ag-gray-500"}`}>
                          <span className="text-xl">{overdue ? "⚠️" : "📅"}</span>
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

                      {/* ステータス移動ボタン (老眼対応版) */}
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
                            {status === "todo" ? "着手する →" : "完了！ ✓"}
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

      {/* タスク追加モーダル (老眼対応) */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-ag-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowForm(false)} />
          <div className="relative w-full sm:max-w-xl rounded-[2.5rem] bg-white shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-br from-ag-gray-800 to-ag-gray-900 text-white px-8 py-6">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <span className="text-3xl">✨</span> 新しいタスクを追加
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
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Task["priority"]})}
                    className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-5 py-4 text-lg font-black outline-none appearance-none cursor-pointer focus:border-ag-lime-400 focus:bg-white shadow-sm">
                    <option value="high">高（お急ぎ）</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-black text-ag-gray-500 uppercase block mb-2 ml-1">カテゴリ</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as Category})}
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
                <div className="flex flex-wrap gap-2.5">
                  {MEMBERS.map(m => {
                    const selected = form.assignees?.includes(m);
                    return (
                      <button key={m} onClick={() => {
                        const cur = form.assignees || [];
                        setForm({...form, assignees: selected ? cur.filter(a => a !== m) : [...cur, m]});
                      }} className={`px-5 py-2.5 rounded-2xl text-base font-black border-2 transition-all shadow-sm ${selected ? "bg-ag-lime-500 text-white border-ag-lime-500 scale-105" : "bg-white text-ag-gray-500 border-ag-gray-200 hover:bg-ag-gray-50"}`}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-ag-gray-500 uppercase block mb-2 ml-1">備考・詳細メモ</label>
                <textarea rows={3} value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                  placeholder="追加情報があれば入力してください"
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-200 rounded-2xl px-6 py-4 text-lg font-bold outline-none resize-none focus:border-ag-lime-400 focus:bg-white shadow-sm" />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowForm(false)} className="flex-1 py-5 text-lg font-black text-ag-gray-400 border-2 border-ag-gray-100 rounded-[1.5rem] hover:bg-ag-gray-50 transition-all">キャンセル</button>
                <button onClick={handleAddTask} className="flex-[2] py-5 bg-ag-lime-500 text-white rounded-[1.5rem] text-xl font-black hover:bg-ag-lime-600 shadow-xl shadow-ag-lime-500/20 active:scale-95 transition-all">
                  以上の項目で追加する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
