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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-ag-gray-900 flex items-center gap-2">
            <span>✅</span> タスク管理
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">担当者・期限・進行状況を一元管理</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 bg-ag-lime-500 text-white rounded-xl text-sm font-bold hover:bg-ag-lime-600 transition-colors shadow-sm"
        >
          + タスクを追加
        </button>
      </div>

      {/* カンバンボード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {columns.map(status => {
          const cfg = STATUS_CONFIG[status];
          const col = tasks.filter(t => t.status === status);
          return (
            <div key={status} className="bg-white rounded-3xl border border-ag-gray-100 shadow-md overflow-hidden">
              {/* カラムヘッダー */}
              <div className={`px-5 py-4 ${cfg.headerBg} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-black ${cfg.color}`}>{cfg.icon}</span>
                  <h3 className={`text-sm font-extrabold ${cfg.color}`}>{cfg.label}</h3>
                </div>
                <span className="text-xs font-bold bg-white text-ag-gray-500 px-2.5 py-1 rounded-full shadow-sm">
                  {col.length}件
                </span>
              </div>

              {/* タスクリスト */}
              <div className="p-3 space-y-3 min-h-[200px]">
                {col.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-ag-gray-200 text-sm italic">
                    タスクなし
                  </div>
                )}
                {col.map(task => {
                  const pCfg = PRIORITY_CONFIG[task.priority];
                  const overdue = isOverdue(task.deadline) && task.status !== "done";
                  return (
                    <div key={task.id}
                      className="bg-ag-gray-50 rounded-2xl p-4 border border-ag-gray-100 hover:border-ag-lime-200 hover:shadow-sm transition-all space-y-3"
                    >
                      {/* タイトルと優先度 */}
                      <div className="flex items-start gap-2">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${pCfg.bg} ${pCfg.color}`}>
                          {pCfg.label}
                        </span>
                        <p className="text-sm font-extrabold text-ag-gray-800 leading-tight">{task.title}</p>
                      </div>

                      {/* 期限 */}
                      {task.deadline && (
                        <div className={`flex items-center gap-1.5 text-xs font-bold ${overdue ? "text-red-500" : "text-ag-gray-400"}`}>
                          <span>{overdue ? "⚠️" : "📅"}</span>
                          <span>{overdue ? "期限超過：" : ""}{task.deadline.replace(/-/g, "/")}</span>
                        </div>
                      )}

                      {/* 担当者 */}
                      {task.assignees.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.assignees.map(a => (
                            <span key={a} className="text-[10px] font-bold bg-white border border-ag-gray-200 text-ag-gray-600 px-2 py-0.5 rounded-full">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* カテゴリ */}
                      <span className="inline-block text-[9px] font-bold bg-ag-lime-50 text-ag-lime-700 border border-ag-lime-100 px-2 py-0.5 rounded">
                        {task.category}
                      </span>

                      {/* 備考 */}
                      {task.note && (
                        <p className="text-[10px] text-ag-gray-400 italic leading-relaxed">{task.note}</p>
                      )}

                      {/* ステータス移動ボタン */}
                      <div className="flex gap-1.5 pt-1">
                        {status !== "todo" && (
                          <button onClick={() => moveTask(task.id, status === "doing" ? "todo" : "doing")}
                            className="flex-1 py-1.5 text-[10px] font-bold bg-white border border-ag-gray-200 text-ag-gray-400 rounded-xl hover:bg-ag-gray-100 transition-colors">
                            ← 戻す
                          </button>
                        )}
                        {status !== "done" && (
                          <button onClick={() => moveTask(task.id, status === "todo" ? "doing" : "done")}
                            className="flex-1 py-1.5 text-[10px] font-bold bg-ag-lime-500 text-white rounded-xl hover:bg-ag-lime-600 transition-colors">
                            {status === "todo" ? "着手 →" : "完了 ✓"}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-ag-gray-800 to-ag-gray-900 text-white px-6 py-5">
              <h2 className="text-lg font-black">新しいタスクを追加</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">タスク名</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="例: 大会申込書の作成"
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ag-lime-300 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">優先度</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Task["priority"]})}
                    className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-3 text-sm outline-none">
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">カテゴリ</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as Category})}
                    className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-3 text-sm outline-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">期限</label>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})}
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-2">担当者</label>
                <div className="flex flex-wrap gap-2">
                  {MEMBERS.map(m => {
                    const selected = form.assignees?.includes(m);
                    return (
                      <button key={m} onClick={() => {
                        const cur = form.assignees || [];
                        setForm({...form, assignees: selected ? cur.filter(a => a !== m) : [...cur, m]});
                      }} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selected ? "bg-ag-lime-500 text-white border-ag-lime-500" : "bg-white text-ag-gray-500 border-ag-gray-200"}`}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-ag-gray-400 uppercase block mb-1">備考</label>
                <textarea rows={3} value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                  className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-sm font-bold text-ag-gray-400 border border-ag-gray-100 rounded-xl">キャンセル</button>
                <button onClick={handleAddTask} className="flex-[2] py-3 bg-ag-lime-500 text-white rounded-xl text-sm font-black hover:bg-ag-lime-600 shadow-lg shadow-ag-lime-500/20">追加する</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
