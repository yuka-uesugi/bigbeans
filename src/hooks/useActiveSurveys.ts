"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToSurveys, type SurveyData } from "@/lib/surveys";

/**
 * 受付中（status === "active"）のアンケートを購読し、
 * 「自分がまだ回答していない受付中アンケート」を割り出す共通フック。
 *
 * - activeSurveys: 受付中のアンケート一覧（新しい順）
 * - unansweredSurveys: 自分が未回答の受付中アンケート一覧
 * - unansweredCount: 未回答の受付中アンケート件数（バッジ用）
 *
 * バナー（ダッシュボード上部）と左メニューのバッジで共用する。
 */
export function useActiveSurveys() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);

  useEffect(() => {
    return subscribeToSurveys((data) => setSurveys(data));
  }, []);

  const activeSurveys = useMemo(
    () => surveys.filter((s) => s.status === "active"),
    [surveys]
  );

  const unansweredSurveys = useMemo(() => {
    const uid = user?.uid ?? "";
    if (!uid) return [] as SurveyData[];
    return activeSurveys.filter((s) => !s.voterMap?.[uid]);
  }, [activeSurveys, user]);

  return {
    activeSurveys,
    unansweredSurveys,
    unansweredCount: unansweredSurveys.length,
  };
}
