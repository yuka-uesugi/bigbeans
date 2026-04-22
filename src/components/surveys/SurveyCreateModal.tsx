"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createSurvey, updateSurvey, type SurveyOption, type SurveyData } from "@/lib/surveys";

interface Props {
  onClose: () => void;
  survey?: SurveyData; // 渡された場合は編集モード
}

export default function SurveyCreateModal({ onClose, survey }: Props) {
  const { user } = useAuth();
  const isEdit = !!survey;

  const [title, setTitle] = useState(survey?.title ?? "");
  const [description, setDescription] = useState(survey?.description ?? "");
  const [deadline, setDeadline] = useState(() => {
    if (!survey?.deadline) return "";
    // "2026/4/30 23:59" → "2026-04-30"
    const d = new Date(survey.deadline.replace(/\//g, "-").replace(" 23:59", ""));
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [options, setOptions] = useState<{ text: string; externalLink: string }[]>(() =>
    survey?.options.map((o) => ({ text: o.text, externalLink: o.externalLink ?? "" })) ?? [
      { text: "", externalLink: "" },
      { text: "", externalLink: "" },
    ]
  );
  const [refLabel, setRefLabel] = useState(survey?.referenceLink?.label ?? "");
  const [refUrl, setRefUrl] = useState(survey?.referenceLink?.url ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const addOption = () => {
    if (options.length >= 8) return;
    setOptions([...options, { text: "", externalLink: "" }]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, field: "text" | "externalLink", value: string) => {
    setOptions(options.map((opt, idx) => idx === i ? { ...opt, [field]: value } : opt));
  };

  const canSubmit = title.trim() && deadline && options.every(o => o.text.trim());

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const builtOptions: SurveyOption[] = options.map((opt, i) => ({
        id: survey?.options[i]?.id ?? `o${i + 1}`,
        text: opt.text.trim(),
        ...(opt.externalLink.trim() ? { externalLink: opt.externalLink.trim() } : {}),
      }));

      const deadlineDate = new Date(deadline);
      const deadlineStr = `${deadlineDate.getFullYear()}/${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()} 23:59`;

      const refLink = refLabel.trim() && refUrl.trim()
        ? { label: refLabel.trim(), url: refUrl.trim() }
        : undefined;

      if (isEdit && survey) {
        await updateSurvey(survey.id, {
          title: title.trim(),
          description: description.trim(),
          deadline: deadlineStr,
          options: builtOptions,
          referenceLink: refLink,
        });
      } else {
        await createSurvey({
          title: title.trim(),
          description: description.trim(),
          deadline: deadlineStr,
          status: "active",
          options: builtOptions,
          createdBy: user?.displayName || "管理者",
          ...(refLink ? { referenceLink: refLink } : {}),
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert(isEdit ? "更新に失敗しました" : "アンケートの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 backdrop-blur-sm">
      <div className="relative mx-auto max-w-lg px-4 my-10">
      <div className="bg-white rounded-3xl shadow-2xl w-full flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ag-gray-100">
          <h2 className="text-lg font-black text-ag-gray-900">
            {isEdit ? "アンケートを編集" : "新しいアンケートを作成"}
          </h2>
          <button onClick={onClose} className="text-ag-gray-400 hover:text-ag-gray-700 font-black text-xl leading-none">×</button>
        </div>

        {/* フォーム */}
        <div className="px-6 py-5 space-y-4">
          {/* タイトル */}
          <div>
            <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-1.5">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：夏合宿の日程調整"
              className="w-full border-2 border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-1.5">説明文</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="アンケートの詳細や背景を書いてください"
              rows={3}
              className="w-full border-2 border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none resize-none"
            />
          </div>

          {/* 締切 */}
          <div>
            <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-1.5">
              締切日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border-2 border-ag-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none"
            />
          </div>

          {/* 選択肢 */}
          <div>
            <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-1.5">
              選択肢 <span className="text-red-500">*</span>
              <span className="text-ag-gray-400 normal-case font-bold ml-1">（最大8件）</span>
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateOption(i, "text", e.target.value)}
                      placeholder={`選択肢 ${i + 1}`}
                      className="w-full border-2 border-ag-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-ag-gray-800 focus:border-ag-lime-400 focus:ring-2 focus:ring-ag-lime-100 outline-none"
                    />
                    <input
                      type="url"
                      value={opt.externalLink}
                      onChange={(e) => updateOption(i, "externalLink", e.target.value)}
                      placeholder="関連URL（任意）"
                      className="w-full border border-ag-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-ag-gray-600 focus:border-ag-lime-400 outline-none placeholder:text-ag-gray-300"
                    />
                  </div>
                  <button
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="mt-2 text-ag-gray-300 hover:text-red-500 disabled:opacity-20 font-black text-lg leading-none"
                  >×</button>
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <button
                onClick={addOption}
                className="mt-2 text-xs font-black text-ag-lime-600 hover:text-ag-lime-700 bg-ag-lime-50 hover:bg-ag-lime-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                ＋ 選択肢を追加
              </button>
            )}
          </div>

          {/* 参考リンク */}
          <div>
            <label className="text-xs font-black text-ag-gray-500 uppercase tracking-widest block mb-1.5">参考リンク（任意）</label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={refLabel}
                onChange={(e) => setRefLabel(e.target.value)}
                placeholder="リンクのラベル（例：候補の合宿所）"
                className="w-full border border-ag-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-ag-gray-700 focus:border-ag-lime-400 outline-none"
              />
              <input
                type="url"
                value={refUrl}
                onChange={(e) => setRefUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-ag-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-ag-gray-700 focus:border-ag-lime-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ag-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-black text-ag-gray-500 hover:text-ag-gray-700 hover:bg-ag-gray-100 rounded-xl transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="px-5 py-2.5 text-sm font-black rounded-xl bg-gradient-to-r from-ag-lime-500 to-emerald-500 text-white hover:from-ag-lime-600 hover:to-emerald-600 transition-colors shadow-md shadow-ag-lime-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (isEdit ? "更新中..." : "作成中...") : (isEdit ? "変更を保存" : "アンケートを作成")}
          </button>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
