"use client";

import { useEffect, useState } from "react";
import { subscribeToCardTeamNames } from "@/lib/facilities";

interface ResponsibleTeamFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * 予定の「担当（施設取得会）」の入力欄。
 *
 * ここに入れた団体名が、カレンダーの詳細カードに「担当: ○○」として出る
 * （メンバーだけに見える。ビジターには出さない）。
 * 受付での支払いにどのカードを見せるか分かるようにするための項目なので、
 * 打ち間違いが起きないよう、登録カード一覧から候補ボタンを出している。
 */
export default function ResponsibleTeamField({ value, onChange }: ResponsibleTeamFieldProps) {
  const [cardNames, setCardNames] = useState<string[]>([]);

  useEffect(() => {
    const unsub = subscribeToCardTeamNames(setCardNames);
    return () => unsub();
  }, []);

  return (
    <div>
      <label className="text-[10px] font-black text-ag-gray-500 uppercase tracking-widest block mb-2">
        担当（施設取得会）
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: ビッグビーンズ、チャリチャリ、トリプルス"
        className="w-full bg-ag-gray-50 border border-ag-gray-100 rounded-2xl px-4 py-3 text-sm text-ag-gray-800 focus:ring-2 focus:ring-ag-lime-300 outline-none"
      />

      {cardNames.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-bold text-ag-gray-400 mb-1.5">
            登録カードから選ぶ（タップで入ります）
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cardNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange(value === name ? "" : name)}
                className={`text-sm font-black px-3 py-1.5 rounded-xl border transition-colors ${
                  value === name
                    ? "bg-ag-lime-500 border-ag-lime-500 text-white"
                    : "bg-white border-ag-gray-200 text-ag-gray-600 hover:bg-ag-gray-50"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs font-bold text-ag-gray-400 leading-relaxed">
        カレンダーの予定に「担当: ○○」と表示されます（メンバーのみ。ビジターには出ません）
      </p>
    </div>
  );
}
