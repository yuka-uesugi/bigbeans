"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToNotifications,
  subscribeToBroadcasts,
  subscribeToLastReadBroadcastAt,
  setLastReadBroadcastAt,
  markAllRead,
  type NotificationData,
  type BroadcastData,
} from "@/lib/notifications";

// ベルやサイドバーで使う、統一された通知1件分のデータ
export interface FeedItem {
  id: string;
  source: "broadcast" | "reply";
  title: string;       // 主たる文言
  body?: string;       // 補足
  link: string;        // タップ時の遷移先
  createdAt: Timestamp;
  read: boolean;
}

/**
 * 個人通知（返信）と全員向け通知（ブロードキャスト）を1つにまとめて返す共通フック。
 * - items: 新しい順に並んだ通知一覧
 * - unreadCount: 未読件数
 * - markAllAsRead: すべて既読にする
 */
export function useNotificationFeed() {
  const { user } = useAuth();
  const [personal, setPersonal] = useState<NotificationData[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastData[]>([]);
  const [lastReadAt, setLastReadAt] = useState<Timestamp | null>(null);

  // 個人通知（返信）を購読
  useEffect(() => {
    if (!user?.uid) {
      setPersonal([]);
      return;
    }
    return subscribeToNotifications(user.uid, setPersonal);
  }, [user?.uid]);

  // 全員向け通知を購読
  useEffect(() => {
    if (!user?.uid) {
      setBroadcasts([]);
      return;
    }
    return subscribeToBroadcasts(setBroadcasts);
  }, [user?.uid]);

  // 全員向け通知の最終既読時刻を購読
  useEffect(() => {
    if (!user?.uid) {
      setLastReadAt(null);
      return;
    }
    return subscribeToLastReadBroadcastAt(user.uid, setLastReadAt);
  }, [user?.uid]);

  const items = useMemo<FeedItem[]>(() => {
    const readMs = lastReadAt ? lastReadAt.toMillis() : 0;

    const fromBroadcasts: FeedItem[] = broadcasts.map((b) => ({
      id: `b_${b.id}`,
      source: "broadcast",
      title: b.title,
      body: b.body,
      link: b.link,
      createdAt: b.createdAt,
      read: b.createdAt ? b.createdAt.toMillis() <= readMs : true,
    }));

    const fromPersonal: FeedItem[] = personal.map((n) => ({
      id: `p_${n.id}`,
      source: "reply",
      title: `「${n.suggestionTitle}」に返信がありました`,
      body: `${n.replyAuthor}：${n.replyBody}`,
      link: "/dashboard/rules",
      createdAt: n.createdAt,
      read: n.read,
    }));

    return [...fromBroadcasts, ...fromPersonal].sort((a, b) => {
      const am = a.createdAt ? a.createdAt.toMillis() : 0;
      const bm = b.createdAt ? b.createdAt.toMillis() : 0;
      return bm - am;
    });
  }, [broadcasts, personal, lastReadAt]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  async function markAllAsRead() {
    if (!user?.uid) return;
    const tasks: Promise<void>[] = [];
    // 全員向け: 最終既読時刻を今に更新
    tasks.push(setLastReadBroadcastAt(user.uid));
    // 個人向け: 未読の返信通知を既読化
    const unreadPersonalIds = personal.filter((n) => !n.read).map((n) => n.id);
    if (unreadPersonalIds.length > 0) {
      tasks.push(markAllRead(user.uid, unreadPersonalIds));
    }
    await Promise.all(tasks).catch(() => {});
  }

  return { items, unreadCount, markAllAsRead };
}

/** 「たった今 / ○分前 / ○時間前 / ○日前」の相対時刻文字列を返す */
export function relativeTime(ts: Timestamp | null | undefined, nowMs: number): string {
  if (!ts) return "";
  const diff = nowMs - ts.toMillis();
  if (diff < 0) return "たった今";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}週間前`;
  const month = Math.floor(day / 30);
  return `${month}ヶ月前`;
}
