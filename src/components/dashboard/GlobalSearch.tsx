"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToMembers } from "@/lib/members";
import { getAllEvents, type EventData } from "@/lib/events";
import { subscribeToTransactionsByCalendarYear, type TransactionEntry } from "@/lib/transactions";
import { subscribeToTasks, type TaskData } from "@/lib/tasks";
import type { Member } from "@/data/memberList";

type Category = "feature" | "member" | "event" | "task" | "finance";

// 検索結果の1件を表す共通の形
type SearchResult = {
  key: string;
  category: Category;
  title: string;     // 太字で出す主タイトル
  subtitle: string;  // 下に薄く出す補足
  link: string;      // クリックしたときの遷移先
};

// 表示順とカテゴリ見出し（「ページ・機能」を一番上に出す）
const CATEGORY_ORDER: Category[] = ["feature", "member", "event", "task", "finance"];
const CATEGORY_LABEL: Record<Category, string> = {
  feature: "ページ・機能",
  member: "メンバー",
  event: "予定",
  task: "タスク",
  finance: "経費",
};

// ── アプリの「どこを見ればいいか」案内リスト ──
// label＝画面名、where＝場所の補足、keywords＝この言葉でも見つかる同義語。
// 例:「配車」「相乗り」と打っても乗り合わせ表に届くようにしている。
type Feature = { label: string; where: string; keywords: string[]; link: string };
const FEATURES: Feature[] = [
  // サイドメニューの各ページ
  { label: "出欠・カレンダー", where: "予定と出欠の入力", keywords: ["出欠", "カレンダー", "予定", "スケジュール", "練習日", "日程"], link: "/dashboard/calendar" },
  { label: "タスク管理", where: "やることリスト", keywords: ["タスク", "やること", "todo", "宿題", "作業", "仕事"], link: "/dashboard/tasks" },
  { label: "アンケート・決議", where: "みんなへの投票・決議", keywords: ["アンケート", "決議", "投票", "賛成", "反対"], link: "/dashboard/surveys" },
  { label: "あみだくじ", where: "幹事・役割決め", keywords: ["あみだ", "あみだくじ", "くじ", "幹事決め", "くじ引き"], link: "/dashboard/lottery" },
  { label: "申請管理", where: "会員種別の変更申請など", keywords: ["申請", "種別変更", "会員種別", "休部", "退部"], link: "/dashboard/applications" },
  { label: "会計・家計簿", where: "お金の記録・残高", keywords: ["会計", "家計簿", "経費", "お金", "集金", "残高", "支払", "収支"], link: "/dashboard/finance" },
  { label: "備品・在庫", where: "シャトルなどの持ち物", keywords: ["備品", "在庫", "シャトル", "持ち物", "道具"], link: "/dashboard/inventory" },
  { label: "共有アルバム", where: "写真の共有", keywords: ["アルバム", "写真", "画像", "フォト"], link: "/dashboard/album" },
  { label: "予約管理", where: "練習の予約状況", keywords: ["予約", "予約管理", "申し込み"], link: "/dashboard/reservations" },
  { label: "メンバー名簿", where: "連絡先・住所など", keywords: ["名簿", "メンバー", "連絡先", "住所", "電話"], link: "/dashboard/members" },
  { label: "規約・チーム情報", where: "ルール・チームの情報", keywords: ["規約", "ルール", "チーム情報", "会則"], link: "/dashboard/rules" },
  { label: "マイページ", where: "自分の情報・通知設定", keywords: ["マイページ", "プロフィール", "通知設定", "自分の設定"], link: "/dashboard/profile" },
  // 規約ページの中のセクション（タブを開いた状態で飛ぶ）
  { label: "当番表（役員・組織分担）", where: "規約・チーム情報の中", keywords: ["当番", "当番表", "係", "役員", "組織", "分担", "担当"], link: "/dashboard/rules?tab=organization" },
  { label: "SNS・募集サイトの担当", where: "規約・チーム情報の中", keywords: ["sns", "インスタ", "募集サイト", "担当メモ"], link: "/dashboard/rules?tab=organization" },
  { label: "乗り合わせ・車代", where: "規約・チーム情報の中", keywords: ["乗り合わせ", "乗合", "相乗り", "配車", "車代", "車", "精算"], link: "/dashboard/rules?tab=transport" },
  { label: "費用・登録規定", where: "規約・チーム情報の中", keywords: ["会費", "料金", "費用", "参加費", "ビジター料金", "値段"], link: "/dashboard/rules?tab=fees" },
  { label: "予約ルール", where: "規約・チーム情報の中", keywords: ["予約ルール", "解禁", "予約解禁"], link: "/dashboard/rules?tab=booking" },
  { label: "練習場所・登録カード", where: "規約・チーム情報の中", keywords: ["場所", "体育館", "施設", "登録カード", "会場", "地区セン"], link: "/dashboard/rules?tab=facilities" },
  { label: "試合・連盟・保険", where: "規約・チーム情報の中", keywords: ["試合", "大会", "連盟", "保険", "エントリー"], link: "/dashboard/rules?tab=matches" },
];

// 予定の種類を日本語ラベルにする
const EVENT_TYPE_LABEL: Record<EventData["type"], string> = {
  practice: "練習",
  match: "試合",
  event: "イベント",
  deadline: "締め切り",
};

// 検索は「入れた文字がどこかに含まれていれば一致」の素直な方式。
// 大文字小文字は区別しない（メールアドレス等のため）。
function includesQuery(haystack: string | undefined, q: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(q);
}

export default function GlobalSearch() {
  const router = useRouter();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // データは初回フォーカス時にだけ読み込む（常時読み込むと通信のムダになるため）
  const [activated, setActivated] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  // 初回フォーカス後、ログイン中のときだけ検索対象データを読み込む
  useEffect(() => {
    if (!activated || !user) return;

    const unsubMembers = subscribeToMembers(setMembers);
    const unsubTasks = subscribeToTasks(setTasks);

    const thisYear = new Date().getFullYear();
    const unsubTx = subscribeToTransactionsByCalendarYear(thisYear, setTransactions);

    let alive = true;
    getAllEvents()
      .then((data) => {
        if (alive) setEvents(data);
      })
      .catch(() => {});

    return () => {
      alive = false;
      unsubMembers();
      unsubTasks();
      unsubTx();
    };
  }, [activated, user]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // 入力に合わせて絞り込む
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];
    const countOf = (c: Category) => out.filter((r) => r.category === c).length;

    // ページ・機能（ログイン前でも出せる案内。まず「どこを見ればいい？」に答える）
    for (const f of FEATURES) {
      if (includesQuery(f.label, q) || f.keywords.some((k) => k.toLowerCase().includes(q))) {
        out.push({
          key: `feature-${f.link}`,
          category: "feature",
          title: f.label,
          subtitle: f.where,
          link: f.link,
        });
      }
      if (countOf("feature") >= 8) break;
    }

    // メンバー（名前・ふりがな・メール・住所・役職）
    for (const m of members) {
      if (
        includesQuery(m.name, q) ||
        includesQuery(m.furigana, q) ||
        includesQuery(m.email, q) ||
        includesQuery(m.address, q) ||
        includesQuery(m.role, q)
      ) {
        out.push({
          key: `member-${m.id}`,
          category: "member",
          title: m.name,
          subtitle: m.role || m.email || "メンバー",
          link: `/dashboard/members?q=${encodeURIComponent(m.name)}`,
        });
      }
      if (countOf("member") >= 6) break;
    }

    // 予定（タイトル・場所・日付・備考・担当）。新しい日付が上に来るよう並べ替え
    const sortedEvents = [...events].sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const ev of sortedEvents) {
      if (
        includesQuery(ev.title, q) ||
        includesQuery(ev.location, q) ||
        includesQuery(ev.date, q) ||
        includesQuery(ev.description, q) ||
        includesQuery(ev.responsibleTeam, q)
      ) {
        out.push({
          key: `event-${ev.id}`,
          category: "event",
          title: ev.title || EVENT_TYPE_LABEL[ev.type],
          subtitle: `${ev.date}　${ev.location || ""}`.trim(),
          link: `/dashboard/calendar?eventId=${encodeURIComponent(ev.id)}`,
        });
      }
      if (countOf("event") >= 6) break;
    }

    // タスク（件名・メモ・カテゴリ・担当）
    for (const t of tasks) {
      const assignees = (t.assignees || []).join(" ");
      if (
        includesQuery(t.title, q) ||
        includesQuery(t.note, q) ||
        includesQuery(t.category, q) ||
        includesQuery(assignees, q)
      ) {
        const statusLabel = t.status === "done" ? "完了" : t.status === "doing" ? "進行中" : "未着手";
        out.push({
          key: `task-${t.id}`,
          category: "task",
          title: t.title,
          subtitle: `${statusLabel}　${t.category || ""}`.trim(),
          link: `/dashboard/tasks`,
        });
      }
      if (countOf("task") >= 6) break;
    }

    // 経費（内容・カテゴリ・金額）。新しい日付が上に来るよう並べ替え
    const sortedTx = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const t of sortedTx) {
      const amountStr = String(t.amount);
      if (
        includesQuery(t.description, q) ||
        includesQuery(t.categoryId, q) ||
        includesQuery(amountStr, q)
      ) {
        const sign = t.type === "expense" ? "-" : t.type === "income" ? "+" : "";
        out.push({
          key: `tx-${t.id}`,
          category: "finance",
          title: t.description || t.categoryId || "経費",
          subtitle: `${t.date}　${sign}¥${t.amount.toLocaleString()}`,
          link: `/dashboard/finance`,
        });
      }
      if (countOf("finance") >= 6) break;
    }

    return out;
  }, [query, members, events, tasks, transactions]);

  const handleSelect = (link: string) => {
    setOpen(false);
    setQuery("");
    router.push(link);
  };

  const renderGroup = (category: Category) => {
    const list = results.filter((r) => r.category === category);
    if (list.length === 0) return null;
    return (
      <div key={category}>
        <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-ag-gray-400">
          {CATEGORY_LABEL[category]}
        </p>
        {list.map((r) => (
          <button
            key={r.key}
            onClick={() => handleSelect(r.link)}
            className="w-full text-left px-4 py-2.5 hover:bg-ag-gray-50 transition-colors cursor-pointer flex flex-col"
          >
            <span className="text-sm font-bold text-ag-gray-800 truncate">{r.title}</span>
            <span className="text-xs text-ag-gray-500 mt-0.5 truncate">{r.subtitle}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex items-center gap-3 flex-1 max-w-md">
      <div className="relative w-full">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setActivated(true);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="メンバー、予定、経費を検索..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-ag-gray-50 border border-transparent text-sm text-ag-gray-700 placeholder:text-ag-gray-400 focus:outline-none focus:border-ag-lime-300 focus:bg-white focus:ring-2 focus:ring-ag-lime-100 transition-all"
        />

        {/* 検索結果ドロップダウン */}
        {open && query.trim() && (
          <div className="absolute left-0 right-0 top-12 bg-white rounded-2xl shadow-lg border border-ag-gray-200/60 overflow-hidden z-50 animate-scale-in">
            <div className="max-h-[70vh] overflow-y-auto py-1">
              {results.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-ag-gray-400">
                  「{query}」に一致する結果はありません
                </p>
              ) : (
                CATEGORY_ORDER.map((c) => renderGroup(c))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
