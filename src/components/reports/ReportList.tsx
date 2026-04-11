"use client";

import type { Report } from "@/lib/reports";
import { deleteReport } from "@/lib/reports";

interface ReportListProps {
  reports: Report[];
  currentUid?: string;
  onEdit: (report: Report) => void;
}

const typeColors: Record<string, string> = {
  "練習": "bg-ag-lime-100 text-ag-lime-700",
  "試合・大会": "bg-blue-100 text-blue-700",
  "合宿・イベント": "bg-purple-100 text-purple-700",
  "役員会議": "bg-amber-100 text-amber-700",
  "プロジェクト": "bg-emerald-100 text-emerald-700",
};

export default function ReportList({ reports, currentUid, onEdit }: ReportListProps) {
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("本当にこのレポートを削除しますか？")) {
      try {
        await deleteReport(id);
      } catch (err) {
        console.error(err);
        alert("削除に失敗しました");
      }
    }
  };
  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div 
          key={report.id} 
          onClick={() => onEdit(report)}
          className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded ${typeColors[report.type] || "bg-ag-gray-100 text-ag-gray-700"}`}>
                {report.type}
              </span>
              <span className="text-xs font-semibold text-ag-gray-400">{report.date}</span>
              {report.status === "draft" && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">下書き</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {report.authorId === currentUid && report.id && (
                <button 
                  onClick={(e) => handleDelete(report.id!, e)}
                  className="text-ag-gray-300 hover:text-red-500 transition-colors"
                  title="削除"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <span className="text-xs text-ag-gray-400 group-hover:text-ag-lime-600 transition-colors">
                詳細・編集 →
              </span>
            </div>
          </div>
          
          <h3 className="text-base font-bold text-ag-gray-900 mb-2 group-hover:text-ag-lime-600 transition-colors">
            {report.title}
          </h3>
          
          <div className="text-sm text-ag-gray-600 leading-relaxed mb-4 line-clamp-3 whitespace-pre-wrap">
            {report.content}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex flex-wrap gap-1.5">
              {(report.tags || []).map(tag => (
                <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-ag-gray-100 text-ag-gray-500 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-ag-gray-400">
              <div className="w-5 h-5 rounded-full bg-ag-gray-200 flex items-center justify-center text-ag-gray-600 text-[10px] font-bold">
                {report.authorName?.[0] || "?"}
              </div>
              {report.authorName}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
