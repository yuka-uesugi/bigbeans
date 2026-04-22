import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  runTransaction,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export interface SurveyOption {
  id: string;
  text: string;
  imageUrl?: string;
  externalLink?: string;
}

export interface SurveyData {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: "active" | "closed";
  options: SurveyOption[];
  votesByOption: Record<string, number>; // optionId -> 票数
  voterMap: Record<string, string>;      // uid -> optionId
  commentMap: Record<string, string>;    // uid -> 連絡事項
  nameMap: Record<string, string>;       // uid -> 表示名
  referenceLink?: { url: string; label: string };
  bannerImage?: string;
  createdBy: string;
  createdAt?: Timestamp;
}

const SURVEYS_COLLECTION = "surveys";

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestoreへの書き込みが${ms / 1000}秒以内に完了しませんでした。`)), ms)
    ),
  ]);
}

export function subscribeToSurveys(
  callback: (surveys: SurveyData[], error?: Error) => void
): Unsubscribe {
  const q = query(collection(db, SURVEYS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const surveys = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as SurveyData[];
      callback(surveys);
    },
    (error) => {
      console.error("[Firestore] surveys onSnapshot error:", error);
      callback([], error);
    }
  );
}

export async function createSurvey(
  data: Omit<SurveyData, "id" | "votesByOption" | "voterMap" | "commentMap" | "nameMap" | "createdAt">
): Promise<string> {
  const docRef = doc(collection(db, SURVEYS_COLLECTION));
  const votesByOption: Record<string, number> = {};
  data.options.forEach((opt) => { votesByOption[opt.id] = 0; });
  await withTimeout(setDoc(docRef, {
    ...data,
    votesByOption,
    voterMap: {},
    commentMap: {},
    nameMap: {},
    createdAt: Timestamp.now(),
  }));
  return docRef.id;
}

export async function updateSurvey(
  surveyId: string,
  data: Pick<SurveyData, "title" | "description" | "deadline" | "options" | "referenceLink">
): Promise<void> {
  await withTimeout(updateDoc(doc(db, SURVEYS_COLLECTION, surveyId), {
    title: data.title,
    description: data.description,
    deadline: data.deadline,
    options: data.options,
    ...(data.referenceLink ? { referenceLink: data.referenceLink } : { referenceLink: null }),
  }));
}

export async function voteSurvey(
  surveyId: string,
  optionId: string,
  uid: string,
  displayName: string,
  comment: string
): Promise<void> {
  const docRef = doc(db, SURVEYS_COLLECTION, surveyId);
  await withTimeout(
    runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists()) throw new Error("アンケートが見つかりません");
      const data = snap.data() as Omit<SurveyData, "id">;
      if (data.status === "closed") throw new Error("このアンケートは終了しています");
      if (data.voterMap[uid]) throw new Error("すでに投票済みです");
      const votesByOption = { ...data.votesByOption, [optionId]: (data.votesByOption[optionId] ?? 0) + 1 };
      const voterMap = { ...data.voterMap, [uid]: optionId };
      const commentMap = comment.trim() ? { ...data.commentMap, [uid]: comment.trim() } : data.commentMap;
      const nameMap = { ...data.nameMap, [uid]: displayName };
      tx.update(docRef, { votesByOption, voterMap, commentMap, nameMap });
    })
  );
}

export async function changeVote(
  surveyId: string,
  newOptionId: string,
  uid: string,
  displayName: string,
  comment: string
): Promise<void> {
  const docRef = doc(db, SURVEYS_COLLECTION, surveyId);
  await withTimeout(
    runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists()) throw new Error("アンケートが見つかりません");
      const data = snap.data() as Omit<SurveyData, "id">;
      if (data.status === "closed") throw new Error("このアンケートは終了しています");
      const oldOptionId = data.voterMap[uid];
      const votesByOption = { ...data.votesByOption };
      if (oldOptionId) {
        votesByOption[oldOptionId] = Math.max(0, (votesByOption[oldOptionId] ?? 1) - 1);
      }
      votesByOption[newOptionId] = (votesByOption[newOptionId] ?? 0) + 1;
      const voterMap = { ...data.voterMap, [uid]: newOptionId };
      const commentMap = comment.trim()
        ? { ...data.commentMap, [uid]: comment.trim() }
        : { ...data.commentMap, [uid]: "" };
      const nameMap = { ...data.nameMap, [uid]: displayName };
      tx.update(docRef, { votesByOption, voterMap, commentMap, nameMap });
    })
  );
}

export async function closeSurvey(surveyId: string): Promise<void> {
  await withTimeout(updateDoc(doc(db, SURVEYS_COLLECTION, surveyId), { status: "closed" }));
}

export async function deleteSurvey(surveyId: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, SURVEYS_COLLECTION, surveyId)));
}
