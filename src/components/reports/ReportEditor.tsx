"use client";

import { useState, useEffect } from "react";
import type { Report } from "@/lib/reports";
import { createReport, updateReport } from "@/lib/reports";

interface ReportEditorProps {
  editingReport: Report | null;
  onClose: () => void;
  currentMember: any;
  currentUser: any;
}

export default function ReportEditor({ editingReport, onClose, currentMember, currentUser }: ReportEditorProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("練習");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingReport) {
      setTitle(editingReport.title);
      setDate(editingReport.date);
      setType(editingReport.type);
      setTagsInput(editingReport.tags?.join(",") || "");
      setContent(editingReport.content);
    } else {
      setTitle("");
      setDate(new Date().toISOString().split("T")[0]);
      setType("練習");
      setTagsInput("");
      setContent("");
    }
  }, [editingReport]);

  const handleSave = async (status: "draft" | "published") => {
    // [一時的措置] ログイン機能ができるまでは、未ログインでも「ゲスト」として保存可能にする
    const authorId = currentUser?.uid || "guest-id";
    const authorName = currentMember?.name || "ゲストユーザー";

    if (!title.trim() || !content.trim()) {
      alert("タイトルと本文は必須です");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        title,
        date,
        type,
        content,
        tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
        status,
        authorId,
        authorName,
      };

      if (editingReport?.id) {
        await updateReport(editingReport.id, data);
      } else {
        await createReport(data);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiAssist = async () => {
    if (!content.trim()) {
      alert("AIに要約・整頓させるための簡単なメモを本文に書いてください！");
      return;
    }
    
    setIsAiGenerating(true);
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content })
      });
      
      const data = await res.json();
      if (res.ok) {
        setContent(data.result);
      } else {
        alert("AI生成エラー: " + data.error);
        // エラー時はフォールバックでモック動作
        setContent(prev => prev + "\n\n【AI所見エラー発生】\n簡易モック動作: 本文が短すぎるかAPIキーが未設定です。");
      }
    } catch (err) {
      console.error(err);
      alert("ネットワークエラーが発生しました");
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-ag-gray-100 flex items-center justify-between bg-ag-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-sm font-bold text-ag-gray-800">
            {editingReport ? "レポートを編集" : "新規レポート作成"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="text-xs font-semibold px-3 py-1.5 bg-white text-ag-gray-600 border border-ag-gray-200 rounded-lg hover:bg-ag-gray-50 transition-colors disabled:opacity-50"
          >
            下書き保存
          </button>
          <button 
            onClick={() => handleSave("published")}
            disabled={isSaving}
            className="text-xs font-bold px-4 py-1.5 bg-ag-lime-500 text-white rounded-lg hover:bg-ag-lime-600 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? "保存中..." : "公開する"}
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* タイトル＆日付 */}
        <div className="flex gap-4">
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル（例: 土曜基礎打ちメイン）" 
            className="flex-1 px-4 py-2.5 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-900 font-bold placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-300 focus:bg-white transition-all"
          />
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40 px-4 py-2.5 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-700 bg-white focus:outline-none focus:border-ag-lime-300 transition-all"
          />
        </div>

        {/* タグと種類 */}
        <div className="flex items-center gap-3">
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-700 focus:outline-none focus:border-ag-lime-300 transition-all"
          >
            <option>練習</option>
            <option>試合・大会</option>
            <option>役員会議</option>
            <option>プロジェクト</option>
            <option>合宿・イベント</option>
          </select>
          <input 
            type="text" 
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="タグを追加（カンマ区切り）" 
            className="flex-1 px-4 py-2 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-700 placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-300 transition-all"
          />
        </div>

        {/* AIサポートアクション */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-ag-lime-50 to-emerald-50 rounded-xl border border-ag-lime-200/50">
          <span className="text-sm">🤖</span>
          <p className="text-xs text-ag-gray-600 flex-1">
            本日のスコアや簡単なメモから、AIがレポートを清書します。
          </p>
          <button 
            onClick={handleAiAssist}
            disabled={isAiGenerating}
            className="px-3 py-1.5 bg-ag-lime-500 hover:bg-ag-lime-600 disabled:bg-ag-lime-300 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isAiGenerating ? "生成中..." : "AIで文章を整える"}
          </button>
        </div>

        {/* メインエディタ */}
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="練習メニュー、気づいたこと、反省点などを記述してください..." 
          className="w-full flex-1 min-h-[200px] p-4 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-800 placeholder:text-ag-gray-400 resize-none focus:outline-none focus:border-ag-lime-300 focus:bg-white transition-all leading-relaxed"
        />
        
        {/* 未実装のアクションボタン（一時的に非表示または無効化） */}
        <div className="flex items-center gap-3 text-ag-gray-300 pointer-events-none mt-2">
          {/* <button className="p-2 hover:bg-ag-gray-100 rounded-lg transition-colors" title="画像を添付">🖼️</button> */}
          {/* <button className="p-2 hover:bg-ag-gray-100 rounded-lg transition-colors" title="動画リンクを添付">🎥</button> */}
          {/* <button className="p-2 hover:bg-ag-gray-100 rounded-lg transition-colors" title="スコアボードを表形式で挿入">📊</button> */}
          <span className="text-[10px]">※画像や動画の添付機能は今後のアップデートで追加予定です</span>
        </div>
      </div>
    </div>
  );
}
