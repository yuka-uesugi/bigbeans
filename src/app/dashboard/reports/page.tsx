"use client";

import ReportList from "@/components/reports/ReportList";
import ReportEditor from "@/components/reports/ReportEditor";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberByEmail } from "@/lib/members";
import { subscribeToReports, type Report } from "@/lib/reports";
import type { Member } from "@/data/memberList";

export default function ReportsPage() {
  const { user } = useAuth();
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchMember() {
      if (user?.email) {
        try {
          const member = await getMemberByEmail(user.email);
          setCurrentMember(member);
        } catch (err) {
          console.error("会員情報取得エラー:", err);
        }
      }
    }
    fetchMember();
  }, [user]);

  useEffect(() => {
    const unsubscribe = subscribeToReports((data) => {
      setReports(data);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateNew = () => {
    setEditingReport(null);
    setIsEditorOpen(!isEditorOpen);
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setIsEditorOpen(true);
  };

  // 下書きは自分しか見えないようにする
  const visibleReports = reports.filter((r) => {
    if (r.status === "draft") {
      return r.authorId === user?.uid;
    }
    return true;
  }).filter((r) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return r.title.toLowerCase().includes(query) || 
           r.content?.toLowerCase().includes(query) ||
           r.tags?.some(t => t.toLowerCase().includes(query));
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* ページヘッダー */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            レポート・議事録
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            日々の練習や試合の反省、および役員会議やプロジェクトの議事録をチーム内で共有できます。
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCreateNew}
            className="px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm bg-ag-lime-500 text-white hover:bg-ag-lime-600"
          >
            {isEditorOpen && !editingReport ? "✕ 入力画面を閉じる" : "＋ 新規作成"}
          </button>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タグやキーワードで検索..."
              className="pl-10 pr-4 py-2 rounded-xl bg-white border border-ag-gray-200/60 text-sm text-ag-gray-700 placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-300 focus:ring-1 focus:ring-ag-lime-200 transition-all w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* メインレイアウト */}
      <div className={`grid grid-cols-1 ${isEditorOpen ? 'lg:grid-cols-[1fr_1fr]' : ''} gap-6 items-stretch`}>
        
        {/* 左側：レポートタイムライン */}
        <div className={`flex flex-col h-[calc(100vh-180px)] ${isEditorOpen ? 'hidden lg:flex' : 'flex'}`}>
          <h3 className="text-sm font-bold text-ag-gray-500 uppercase tracking-widest mb-4">Past Reports</h3>
          <div className="flex-1 overflow-y-auto pr-2 pb-8 custom-scrollbar">
            <ReportList 
              reports={visibleReports} 
              currentUid={user?.uid} 
              onEdit={handleEdit} 
            />
          </div>
        </div>

        {/* 右側：レポート作成エディタ */}
        {isEditorOpen && (
          <div className="flex flex-col h-[calc(100vh-180px)] pb-8 animate-fade-in">
            <ReportEditor 
              editingReport={editingReport} 
              onClose={() => setIsEditorOpen(false)} 
              currentMember={currentMember}
              currentUser={user}
            />
          </div>
        )}
        
      </div>
    </div>
  );
}
