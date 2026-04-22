"use client";

import { useRef, useState } from "react";
import { uploadEventFile } from "@/lib/storage";
import type { EventAttachment } from "@/lib/events";

interface AttachmentManagerProps {
  attachments: EventAttachment[];
  onChange: (attachments: EventAttachment[]) => void;
  uploadFolder: string;
}

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.bmp";

function AttachmentIcon({ fileType }: { fileType?: string }) {
  if (fileType === "pdf") return <span className="text-2xl">📄</span>;
  if (fileType === "image") return <span className="text-2xl">🖼️</span>;
  return <span className="text-2xl">🔗</span>;
}

export default function AttachmentManager({ attachments, onChange, uploadFolder }: AttachmentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ name: string; pct: number } | null>(null);
  const [urlEntry, setUrlEntry] = useState<{ label: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        setError(`${file.name} は20MBを超えているためアップロードできません`);
        continue;
      }
      setUploading({ name: file.name, pct: 0 });
      try {
        const result = await uploadEventFile(file, uploadFolder, (pct) =>
          setUploading({ name: file.name, pct })
        );
        onChange([
          ...attachments,
          { label: file.name.replace(/\.[^.]+$/, ""), url: result.url, fileType: result.fileType, storagePath: result.storagePath },
        ]);
      } catch (e) {
        setError(`${file.name} のアップロードに失敗しました`);
      } finally {
        setUploading(null);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addUrl = () => {
    if (!urlEntry?.url.trim()) return;
    onChange([...attachments, { label: urlEntry.label || urlEntry.url, url: urlEntry.url, fileType: "url" }]);
    setUrlEntry(null);
  };

  const remove = (idx: number) => {
    onChange(attachments.filter((_, i) => i !== idx));
  };

  const updateLabel = (idx: number, label: string) => {
    const next = [...attachments];
    next[idx] = { ...next[idx], label };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* 既存の添付一覧 */}
      {attachments.map((att, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          {att.fileType === "image" ? (
            <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-ag-gray-100">
              <img src={att.url} alt={att.label} className="w-full h-full object-cover" />
            </a>
          ) : (
            <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-ag-gray-50 border border-ag-gray-100 flex items-center justify-center shrink-0">
              <AttachmentIcon fileType={att.fileType} />
            </a>
          )}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={att.label}
              onChange={(e) => updateLabel(idx, e.target.value)}
              placeholder="ラベル"
              className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-xl px-3 py-1.5 text-xs text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none"
            />
            <p className="text-[10px] text-ag-gray-400 mt-0.5 truncate">{att.url}</p>
          </div>
          <button onClick={() => remove(idx)} className="text-ag-gray-300 hover:text-red-400 text-lg leading-none shrink-0 mt-1">×</button>
        </div>
      ))}

      {/* アップロード進捗 */}
      {uploading && (
        <div className="bg-ag-gray-50 rounded-xl px-4 py-3 border border-ag-gray-100">
          <div className="flex justify-between text-xs font-bold text-ag-gray-600 mb-1.5">
            <span className="truncate">{uploading.name}</span>
            <span>{Math.round(uploading.pct)}%</span>
          </div>
          <div className="h-1.5 bg-ag-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-ag-lime-400 rounded-full transition-all duration-200" style={{ width: `${uploading.pct}%` }} />
          </div>
        </div>
      )}

      {/* URLインライン入力 */}
      {urlEntry !== null && (
        <div className="bg-ag-gray-50 rounded-xl p-3 border border-ag-gray-100 space-y-2">
          <input
            type="text"
            value={urlEntry.label}
            onChange={(e) => setUrlEntry({ ...urlEntry, label: e.target.value })}
            placeholder="ラベル (例: 申込みフォーム)"
            className="w-full bg-white border border-ag-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-ag-lime-300 outline-none"
          />
          <input
            type="url"
            value={urlEntry.url}
            onChange={(e) => setUrlEntry({ ...urlEntry, url: e.target.value })}
            placeholder="https://..."
            className="w-full bg-white border border-ag-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-ag-lime-300 outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={addUrl} className="flex-1 py-1.5 bg-ag-lime-500 text-white text-xs font-bold rounded-lg hover:bg-ag-lime-600 transition-colors">追加</button>
            <button onClick={() => setUrlEntry(null)} className="flex-1 py-1.5 bg-ag-gray-100 text-ag-gray-500 text-xs font-bold rounded-lg hover:bg-ag-gray-200 transition-colors">キャンセル</button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-ag-gray-200 rounded-xl text-xs font-bold text-ag-gray-500 hover:border-ag-lime-300 hover:text-ag-lime-600 hover:bg-ag-lime-50/50 transition-all disabled:opacity-50"
        >
          <span>📁</span> ファイルを選択
        </button>
        <button
          type="button"
          onClick={() => setUrlEntry({ label: "", url: "" })}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-ag-gray-200 rounded-xl text-xs font-bold text-ag-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
        >
          <span>🔗</span> URLを追加
        </button>
      </div>
      <p className="text-[10px] text-ag-gray-400 text-center">PDF・JPG・PNG・HEIC（最大20MB）</p>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
