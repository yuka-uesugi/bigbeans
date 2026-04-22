"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToSurveys,
  voteSurvey,
  changeVote,
  closeSurvey,
  deleteSurvey,
  type SurveyData,
} from "@/lib/surveys";
import SurveyCreateModal from "./SurveyCreateModal";

type Filter = "all" | "unanswered" | "closed";

interface Props {
  filter: Filter;
}

interface PendingVote {
  surveyId: string;
  optionId: string;
  comment: string;
}

export default function SurveyList({ filter }: Props) {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [pendingVote, setPendingVote] = useState<PendingVote | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyData | null>(null);
  const [changingVoteSurveyId, setChangingVoteSurveyId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToSurveys((data) => setSurveys(data));
  }, []);

  const displayed = useMemo(() => {
    const uid = user?.uid ?? "";
    if (filter === "closed") return surveys.filter((s) => s.status === "closed");
    if (filter === "unanswered") return surveys.filter((s) => s.status === "active" && !s.voterMap?.[uid]);
    return surveys;
  }, [surveys, filter, user]);

  const selectOption = (surveyId: string, optionId: string) => {
    if (pendingVote?.surveyId === surveyId && pendingVote.optionId === optionId) {
      setPendingVote(null);
    } else {
      setPendingVote({ surveyId, optionId, comment: "" });
    }
  };

  const handleVote = async () => {
    if (!user?.uid || !pendingVote || isVoting) return;
    setIsVoting(true);
    try {
      const isChanging = changingVoteSurveyId === pendingVote.surveyId;
      if (isChanging) {
        await changeVote(pendingVote.surveyId, pendingVote.optionId, user.uid, user.displayName || "匿名", pendingVote.comment);
        setChangingVoteSurveyId(null);
      } else {
        await voteSurvey(pendingVote.surveyId, pendingVote.optionId, user.uid, user.displayName || "匿名", pendingVote.comment);
      }
      setPendingVote(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "投票に失敗しました");
    } finally {
      setIsVoting(false);
    }
  };

  const handleClose = async (surveyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("このアンケートを終了しますか？")) return;
    try { await closeSurvey(surveyId); } catch { alert("終了処理に失敗しました"); }
  };

  const handleDelete = async (surveyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("このアンケートを削除しますか？この操作は元に戻せません。")) return;
    try { await deleteSurvey(surveyId); } catch { alert("削除に失敗しました"); }
  };

  if (displayed.length === 0) {
    return (
      <div className="text-center py-16 text-ag-gray-400 font-bold text-sm">
        {filter === "unanswered" ? "未回答のアンケートはありません" : "アンケートはまだありません"}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayed.map((survey) => {
          const uid = user?.uid ?? "";
          const myVote = survey.voterMap?.[uid] ?? null;
          const totalVotes = Object.values(survey.votesByOption ?? {}).reduce((a, b) => a + b, 0);
          const isClosed = survey.status === "closed";
          const hasVoted = myVote !== null;
          const isChanging = changingVoteSurveyId === survey.id;
          const isPending = pendingVote?.surveyId === survey.id;
          const canVote = !isClosed && (!hasVoted || isChanging);

          // 連絡事項一覧（コメントがある投票者だけ）
          const comments = Object.entries(survey.commentMap ?? {})
            .filter(([, c]) => c.trim())
            .map(([uid, comment]) => ({
              name: survey.nameMap?.[uid] ?? "匿名",
              comment,
              isMe: uid === user?.uid,
            }));

          return (
            <div
              key={survey.id}
              className={`flex flex-col bg-white rounded-2xl border overflow-hidden h-full ${
                isClosed
                  ? "border-ag-gray-200/40 opacity-70"
                  : "border-ag-gray-200/60 hover:shadow-lg transition-shadow"
              }`}
            >
              {/* ヘッダー */}
              <div className="px-5 py-4 border-b border-ag-gray-100 bg-ag-gray-50/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${isClosed ? "bg-ag-gray-200 text-ag-gray-600" : "bg-ag-lime-100 text-ag-lime-700"}`}>
                        {isClosed ? "終了" : "受付中"}
                      </span>
                      <span className="text-[10px] font-semibold text-ag-gray-400">締切: {survey.deadline}</span>
                    </div>
                    <h3 className="text-base font-bold text-ag-gray-900 leading-tight">{survey.title}</h3>
                  </div>
                  {/* 管理メニュー */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isClosed && (
                      <button
                        onClick={() => setEditingSurvey(survey)}
                        className="text-[10px] font-black text-ag-gray-400 hover:text-ag-lime-600 bg-white hover:bg-ag-lime-50 border border-ag-gray-200 px-2 py-1 rounded-lg transition-colors"
                      >
                        編集
                      </button>
                    )}
                    {!isClosed && (
                      <button
                        onClick={(e) => handleClose(survey.id, e)}
                        className="text-[10px] font-black text-ag-gray-400 hover:text-amber-600 bg-white hover:bg-amber-50 border border-ag-gray-200 px-2 py-1 rounded-lg transition-colors"
                      >
                        終了
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(survey.id, e)}
                      className="text-[10px] font-black text-ag-gray-400 hover:text-red-500 bg-white hover:bg-red-50 border border-ag-gray-200 px-2 py-1 rounded-lg transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>

              {/* 本文 */}
              <div className="p-5 flex-1 flex flex-col">
                {survey.description && (
                  <p className="text-xs text-ag-gray-600 mb-3 leading-relaxed">{survey.description}</p>
                )}

                {survey.referenceLink && (
                  <a
                    href={survey.referenceLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-bold text-ag-lime-600 hover:underline mb-4 bg-ag-lime-50 px-3 py-1.5 rounded-lg self-start"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {survey.referenceLink.label}
                  </a>
                )}

                {/* 選択肢 */}
                <div className="space-y-2 flex-1 flex flex-col justify-end mt-2">
                  {survey.options.map((option) => {
                    const votes = survey.votesByOption?.[option.id] ?? 0;
                    const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                    const isMyVote = myVote === option.id;
                    const isSelected = isPending && pendingVote?.optionId === option.id;
                    const showResult = hasVoted || isClosed;

                    return (
                      <button
                        key={option.id}
                        disabled={!canVote}
                        onClick={() => canVote && selectOption(survey.id, option.id)}
                        className={`relative w-full rounded-xl overflow-hidden transition-all text-left flex flex-col group
                          ${!canVote ? "cursor-default" : "hover:scale-[1.02] cursor-pointer"}
                          ${isMyVote ? "ring-2 ring-ag-lime-400" : isSelected ? "ring-2 ring-ag-lime-300" : "border border-ag-gray-200/80"}
                        `}
                      >
                        <div
                          className={`absolute top-0 left-0 bottom-0 transition-all duration-700 ease-in-out ${isMyVote ? "bg-ag-lime-100/60" : "bg-ag-gray-50"}`}
                          style={{ width: showResult ? `${percentage}%` : "0%" }}
                        />
                        <div className="relative z-10 w-full px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                              ${isMyVote || isSelected ? "border-ag-lime-500" : "border-ag-gray-300"}
                              ${!isClosed && !hasVoted ? "group-hover:border-ag-lime-400" : ""}
                            `}>
                              {(isMyVote || isSelected) && <div className="w-2 h-2 rounded-full bg-ag-lime-500" />}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold ${isMyVote || isSelected ? "text-ag-lime-800" : "text-ag-gray-700"}`}>
                                {option.text}
                              </span>
                              {option.externalLink && (
                                <a
                                  href={option.externalLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-blue-500 hover:underline mt-0.5 w-max"
                                >
                                  詳細を見る
                                </a>
                              )}
                            </div>
                          </div>
                          {showResult && (
                            <span className="text-xs font-bold text-ag-gray-500 whitespace-nowrap ml-2">
                              {percentage}% <span className="text-[10px] text-ag-gray-400 font-normal">({votes}票)</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 投票確認パネル（選択肢を選んだあと） */}
                {isPending && canVote && (
                  <div className="mt-3 bg-ag-lime-50 border border-ag-lime-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-black text-ag-lime-700">連絡事項があれば記入してください（任意）</p>
                    <textarea
                      value={pendingVote.comment}
                      onChange={(e) => setPendingVote({ ...pendingVote, comment: e.target.value })}
                      placeholder="例：その日は遅れて参加します"
                      rows={2}
                      className="w-full border border-ag-lime-200 bg-white rounded-lg px-3 py-2 text-xs font-bold text-ag-gray-700 outline-none resize-none focus:border-ag-lime-400"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setPendingVote(null)}
                        className="text-xs font-black text-ag-gray-500 hover:text-ag-gray-700 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleVote}
                        disabled={isVoting}
                        className="text-xs font-black text-white bg-ag-lime-500 hover:bg-ag-lime-600 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isVoting ? "投票中..." : "投票する"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 連絡事項一覧 */}
                {(hasVoted || isClosed) && comments.length > 0 && (
                  <div className="mt-3 border-t border-ag-gray-100 pt-3 space-y-1.5">
                    <p className="text-[10px] font-black text-ag-gray-400 uppercase tracking-widest mb-2">連絡事項</p>
                    {comments.map((c, i) => (
                      <div key={i} className={`text-xs rounded-lg px-3 py-2 ${c.isMe ? "bg-ag-lime-50 border border-ag-lime-100" : "bg-ag-gray-50"}`}>
                        <span className="font-black text-ag-gray-700">{c.name}</span>
                        <span className="text-ag-gray-400 mx-1">:</span>
                        <span className="font-bold text-ag-gray-600">{c.comment}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-ag-gray-100 flex items-center justify-between text-[11px] font-bold text-ag-gray-400">
                  <span>総投票数: {totalVotes}</span>
                  {hasVoted && !isClosed && changingVoteSurveyId !== survey.id && (
                    <button
                      onClick={() => {
                        setChangingVoteSurveyId(survey.id);
                        setPendingVote(null);
                      }}
                      className="text-[11px] font-black text-ag-gray-400 hover:text-ag-lime-600 underline underline-offset-2 transition-colors"
                    >
                      回答を変更する
                    </button>
                  )}
                  {hasVoted && !isClosed && changingVoteSurveyId === survey.id && (
                    <button
                      onClick={() => { setChangingVoteSurveyId(null); setPendingVote(null); }}
                      className="text-[11px] font-black text-ag-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors"
                    >
                      キャンセル
                    </button>
                  )}
                  {(isClosed || (!hasVoted && changingVoteSurveyId !== survey.id)) && hasVoted && (
                    <span className="text-ag-lime-600">✅ 投票ありがとうございました</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingSurvey && (
        <SurveyCreateModal survey={editingSurvey} onClose={() => setEditingSurvey(null)} />
      )}
    </>
  );
}
