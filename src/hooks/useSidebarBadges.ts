"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToApplications, type ApplicationData } from "@/lib/applications";
import { subscribeToInventory, type InventoryItem } from "@/lib/inventory";

/**
 * 左メニューのバッジに出す「本物の件数」を割り出す共通フック。
 *
 * - pendingApplications: 対応待ちの申請件数（pending=承認待ち または voting=投票中）
 * - lowStockItems: 補充が必要な備品数（現在在庫 <= 最小在庫）
 *
 * 以前はメニューに "3" や "2" の固定値が入っていたが、これで実数に置き換える。
 */
export function useSidebarBadges() {
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => subscribeToApplications((data) => setApplications(data)), []);
  useEffect(() => subscribeToInventory((data) => setInventory(data)), []);

  const pendingApplications = useMemo(
    () => applications.filter((a) => a.status === "pending" || a.status === "voting").length,
    [applications]
  );

  const lowStockItems = useMemo(
    () => inventory.filter((i) => (i.currentStock ?? 0) <= (i.minStock ?? 0)).length,
    [inventory]
  );

  return { pendingApplications, lowStockItems };
}
