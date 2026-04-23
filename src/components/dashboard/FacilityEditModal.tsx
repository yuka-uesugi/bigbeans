"use client";

import { useState, useEffect, useRef } from "react";
import type { FacilityCard, FacilityRegistration } from "@/data/facilityCards";
import { memberList } from "@/data/memberList";

interface FacilityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: FacilityCard | null;
  onSave: (id: string, data: Partial<FacilityCard>) => Promise<void>;
}

function MemberSuggestInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInput = (v: string) => {
    onChange(v);
    if (!v.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const lastName = v.split(/[・,、\s]/).pop()?.trim() ?? v.trim();
    if (!lastName) { setSuggestions([]); setShowSuggestions(false); return; }
    const matches = memberList
      .filter((m) => m.name.includes(lastName))
      .map((m) => m.name)
      .slice(0, 6);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const selectSuggestion = (name: string) => {
    // For members field (comma/・ separated list), append the selected name
    const parts = value.split(/[・,、]/);
    parts[parts.length - 1] = name;
    onChange(parts.join("・"));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={ref} className="relative">
      <label className="text-[10px] font-bold text-ag-gray-400 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => value && setSuggestions(memberList.filter((m) => m.name.includes(value)).map((m) => m.name).slice(0, 6))}
        placeholder={placeholder}
        className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white transition-all"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-emerald-200 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(name); }}
              className="w-full text-left px-4 py-2.5 text-sm font-bold text-ag-gray-800 hover:bg-emerald-50 transition-colors"
            >
              {name}
            </button>
          ))}
          <div className="px-4 py-1.5 text-[10px] text-ag-gray-400 font-bold bg-ag-gray-50 border-t border-ag-gray-100">
            候補にない場合はそのまま入力して確定
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacilityEditModal({
  isOpen,
  onClose,
  facility,
  onSave,
}: FacilityEditModalProps) {
  const [form, setForm] = useState<Partial<FacilityCard>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (facility && isOpen) {
      setForm(JSON.parse(JSON.stringify(facility)));
    }
  }, [facility, isOpen]);

  if (!isOpen || !facility) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility?.id) return;
    setIsSaving(true);
    try {
      await onSave(facility.id, form);
      onClose();
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegChange = (index: number, field: keyof FacilityRegistration, value: any) => {
    const newRegs = [...(form.registrations || [])];
    newRegs[index] = { ...newRegs[index], [field]: value };
    setForm({ ...form, registrations: newRegs });
  };

  const addRegistration = () => {
    const newRegs = [...(form.registrations || []), { teamName: "", slots: 0, id: "", password: "", representative: "", contact: "", members: "" }];
    setForm({ ...form, registrations: newRegs });
  };

  const removeRegistration = (index: number) => {
    const newRegs = (form.registrations || []).filter((_, i) => i !== index);
    setForm({ ...form, registrations: newRegs });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ag-gray-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6 text-white shrink-0">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <span className="text-3xl">🏢</span>
            施設情報編集
          </h2>
          <p className="text-white/80 text-sm font-bold mt-1">
            {form.name} の登録内容を更新します
          </p>
        </div>

        <div className="overflow-y-auto p-8 custom-scrollbar">
          <form id="facility-edit-form" onSubmit={handleSubmit} className="space-y-6">

            {/* 施設名 */}
            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">施設名</label>
              <input
                type="text"
                required
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
              />
            </div>

            {/* 発売日 / 抽選日 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">発売日</label>
                <input
                  type="text"
                  value={form.releaseDay || ""}
                  onChange={(e) => setForm({ ...form, releaseDay: e.target.value })}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">抽選日</label>
                <input
                  type="text"
                  value={form.drawDay || ""}
                  onChange={(e) => setForm({ ...form, drawDay: e.target.value })}
                  className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            {/* 登録団体（複数） */}
            <div className="bg-emerald-50/50 p-4 rounded-3xl border-2 border-emerald-100/50">
              <div className="flex items-center justify-between mb-4 px-2">
                <label className="text-sm font-black text-emerald-800 tracking-wide">登録団体（カード別に担当者を設定）</label>
                <button type="button" onClick={addRegistration} className="text-xs font-bold bg-white text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm hover:bg-emerald-50">＋ 団体を追加</button>
              </div>

              <div className="space-y-4">
                {form.registrations?.map((reg, index) => (
                  <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-ag-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">{reg.teamName || `カード${index + 1}`}</span>
                      <button type="button" onClick={() => removeRegistration(index)} className="w-7 h-7 flex items-center justify-center bg-ag-gray-100 text-ag-gray-400 rounded-xl hover:bg-red-100 hover:text-red-500 transition-colors text-sm">×</button>
                    </div>

                    {/* ID/PW/枠数 */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-bold text-ag-gray-400 block mb-1">団体名</label>
                        <input type="text" value={reg.teamName} onChange={(e) => handleRegChange(index, "teamName", e.target.value)} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] font-bold text-ag-gray-400 block mb-1">枠数</label>
                        <input type="number" value={reg.slots} onChange={(e) => handleRegChange(index, "slots", Number(e.target.value))} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                      </div>
                      <div className="col-span-8 sm:col-span-3">
                        <label className="text-[10px] font-bold text-ag-gray-400 block mb-1">ID</label>
                        <input type="text" value={reg.id} onChange={(e) => handleRegChange(index, "id", e.target.value)} className="w-full bg-ag-gray-50 border border-ag-gray-200 rounded-xl px-3 py-2 text-sm font-bold font-mono outline-none" />
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] font-bold text-ag-gray-400 block mb-1">パスワード</label>
                        <input type="text" value={reg.password} onChange={(e) => handleRegChange(index, "password", e.target.value)} className="w-full bg-red-50 text-red-600 border border-red-200 rounded-xl px-3 py-2 text-sm font-bold font-mono outline-none" />
                      </div>
                    </div>

                    {/* 担当者情報（カード別） */}
                    <div className="pt-3 border-t border-ag-gray-100 space-y-3">
                      <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">このカードの担当者</div>
                      <div className="grid grid-cols-2 gap-3">
                        <MemberSuggestInput
                          label="代表者"
                          value={reg.representative ?? ""}
                          onChange={(v) => handleRegChange(index, "representative", v)}
                          placeholder="姓で検索…"
                        />
                        <MemberSuggestInput
                          label="連絡者"
                          value={reg.contact ?? ""}
                          onChange={(v) => handleRegChange(index, "contact", v)}
                          placeholder="姓で検索…"
                        />
                      </div>
                      <MemberSuggestInput
                        label="構成員（・区切りで複数入力可）"
                        value={reg.members ?? ""}
                        onChange={(v) => handleRegChange(index, "members", v)}
                        placeholder="例: 上杉・西脇・富岡"
                      />
                    </div>
                  </div>
                ))}
                {form.registrations?.length === 0 && (
                  <p className="text-sm font-bold text-ag-gray-400 text-center py-4">登録団体はありません</p>
                )}
              </div>
            </div>

            {/* 駐車場 / 備考 */}
            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">駐車場</label>
              <textarea
                value={form.parking || ""}
                onChange={(e) => setForm({ ...form, parking: e.target.value })}
                rows={2}
                className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-black text-ag-gray-500 uppercase block mb-1.5 ml-1">備考</label>
              <textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full bg-ag-gray-50 border-2 border-ag-gray-100 rounded-2xl px-5 py-3 text-base font-bold outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
              />
            </div>

          </form>
        </div>

        <div className="p-6 border-t-2 border-ag-gray-100 bg-ag-gray-50 shrink-0 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 text-ag-gray-600 font-black text-lg border-2 border-ag-gray-200 bg-white rounded-2xl hover:bg-ag-gray-50 transition-all shadow-sm"
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="facility-edit-form"
            disabled={isSaving}
            className="flex-[2] py-4 bg-emerald-500 text-white font-black text-lg rounded-2xl hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 disabled:opacity-40 transition-all"
          >
            {isSaving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
