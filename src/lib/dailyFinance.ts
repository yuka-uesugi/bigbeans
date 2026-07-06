import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { updateAttendance } from "./attendances";
import { addTransaction, deleteTransaction, type PaymentMethod } from "./transactions";

// イベントごとの経費データモデル
export interface EventExpense {
  id: string;        // ex: "exp-timestamp"
  eventId: string;   // 紐づく練習イベントID
  title: string;     // 「渡辺 亜衣 コーチ料」や「シャトル代」
  amount: number;    // 金額
  type: "coach" | "other"; // 種別（旧データ互換。コーチ料判定の予備に残す）
  /** 家計簿のカテゴリID（コート代・シャトル代など）。プルダウンで選択する。 */
  categoryId?: string;
  /** 支払い方法（現金 / PayPay）。未指定なら現金として扱う。 */
  method?: PaymentMethod;
  /** 備考（誰に支払ったか等のメモ）。家計簿の摘要にも反映される。 */
  note?: string;
  createdAt: string; // ISO文字など
  /** 家計簿（transactions）に同期した取引ID。削除時はこれも削除する */
  transactionId?: string;
}

const EXPENSES_COLLECTION = "eventExpenses";

/**
 * 特定イベントに関連する経費の一覧をリアルタイム取得
 *  ソートはクライアント側で行う（複合インデックス不要にするため）
 */
export function subscribeToEventExpenses(
  eventId: string,
  callback: (expenses: EventExpense[]) => void
) {
  const q = query(
    collection(db, EXPENSES_COLLECTION),
    where("eventId", "==", eventId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const exps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventExpense[];
      // createdAt 昇順
      exps.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
      callback(exps);
    },
    (err) => {
      console.error("[subscribeToEventExpenses] error:", err);
      callback([]);
    }
  );
}

/**
 * 経費を新規追加する
 *  - ダッシュボード当日会計のみに保存（家計簿との同期は精算確定時にまとめて行う）
 */
export async function addEventExpense(
  eventId: string,
  title: string,
  amount: number,
  type: "coach" | "other" = "other",
  categoryId?: string,
  method: PaymentMethod = "現金",
  note?: string
): Promise<string> {
  const expenseId = `exp-${Date.now()}`;
  const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
  const now = new Date().toISOString();

  await setDoc(expenseRef, {
    eventId,
    title,
    amount,
    type,
    method,
    ...(categoryId ? { categoryId } : {}),
    ...(note ? { note } : {}),
    createdAt: now,
  });

  return expenseId;
}

/**
 * 経費を削除する（家計簿に同期済みなら連動削除）
 */
export async function deleteEventExpense(expenseId: string): Promise<void> {
  const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
  const snap = await getDoc(expenseRef);
  if (snap.exists()) {
    const data = snap.data();
    if (data.transactionId) {
      try {
        await deleteTransaction(data.transactionId);
      } catch {
        // 既に削除済みの場合は無視
      }
    }
  }
  await deleteDoc(expenseRef);
}

/**
 * 参加者の回収ステータス (isPaid) をトグル更新する
 *  ダッシュボード内のみで完結。家計簿への反映は精算確定時にまとめて行う
 */
export async function toggleAttendancePayment(
  eventId: string,
  memberId: string | number,
  currentIsPaid: boolean
): Promise<void> {
  await updateAttendance(eventId, memberId, { isPaid: !currentIsPaid });
}

/**
 * 参加者の支払い方法（現金 / PayPay）を保存する
 *  - 回収チェック時にどちらで受け取ったかを記録。精算確定で家計簿へ反映される
 */
export async function setAttendancePaymentMethod(
  eventId: string,
  memberId: string | number,
  method: PaymentMethod
): Promise<void> {
  await updateAttendance(eventId, memberId, { paymentMethod: method });
}

// ─────────────────────────────────────────────
// 精算確定（家計簿への一括反映）
// ─────────────────────────────────────────────

export interface FinalizeInput {
  eventId: string;
  eventDate: string;       // "2026-05-06"
  enteredBy: string;       // 操作者名
  // 収入（回収済みのライト・ビジター）
  incomeItems: Array<{
    memberId: string;
    name: string;
    amount: number;
    typeLabel: string;     // "ライト" / "ビジター"
    method: PaymentMethod; // 現金 / PayPay
  }>;
  // 経費（手動追加された経費）
  expenseItems: Array<{
    expenseId: string;
    title: string;
    amount: number;
    type: "coach" | "other";
    categoryId?: string;   // 家計簿カテゴリ（プルダウン選択）
    method: PaymentMethod; // 現金 / PayPay
    note?: string;         // 備考（誰に支払ったか等）
  }>;
  // 自動算出されたコーチ料（hasCoach 時のみ。手動追加されたコーチ経費とは別）
  coachAutoFee?: {
    amount: number;        // 0 のときは登録しない
    coachName: string;
  };
}

export interface FinalizeResult {
  finalizedAt: string;     // ISO
  incomeCount: number;
  expenseCount: number;
  coachLogged: boolean;
}

/**
 * 練習当日の会計を確定し、家計簿（transactions）に一括反映する
 *  - 既に確定済みの場合は先に取り消してから再生成（再精算）
 */
export async function finalizeEventAccounting(input: FinalizeInput): Promise<FinalizeResult> {
  // 既存の確定をクリア
  await unfinalizeEventAccounting(input.eventId);

  // 収入：各回収済みメンバーの transaction を作成し、attendance に紐付け
  for (const item of input.incomeItems) {
    const description = `${item.name}（${item.typeLabel}）${input.eventDate}`;
    const categoryId = item.typeLabel === "ライト" ? "ライト会員費" : "ビジター料";
    const transactionId = await addTransaction({
      date: input.eventDate,
      description,
      amount: item.amount,
      type: "income",
      categoryId,
      enteredBy: input.enteredBy,
      method: item.method,
    });
    await updateAttendance(input.eventId, item.memberId, { transactionId });
  }

  // 経費：各 eventExpense の transaction を作成し、expense に紐付け
  for (const item of input.expenseItems) {
    const description = item.note ? `${item.title}（${item.note}）` : item.title;
    const transactionId = await addTransaction({
      date: input.eventDate,
      description,
      amount: item.amount,
      type: "expense",
      categoryId: item.categoryId ?? (item.type === "coach" ? "コーチ料" : "その他支出"),
      enteredBy: input.enteredBy,
      method: item.method,
    });
    const expenseRef = doc(db, EXPENSES_COLLECTION, item.expenseId);
    await setDoc(expenseRef, { transactionId }, { merge: true });
  }

  // 自動コーチ料：transaction を作成し financials に保存
  let coachLogged = false;
  let coachTransactionId: string | undefined;
  if (input.coachAutoFee && input.coachAutoFee.amount > 0) {
    coachTransactionId = await addTransaction({
      date: input.eventDate,
      description: `${input.coachAutoFee.coachName} コーチ料 ${input.eventDate}`,
      amount: input.coachAutoFee.amount,
      type: "expense",
      categoryId: "コーチ料",
      enteredBy: input.enteredBy,
      method: "現金",
    });
    coachLogged = true;
  }

  const finalizedAt = new Date().toISOString();
  const finRef = doc(db, "events", input.eventId, FINANCIALS_SUBCOLLECTION, FINANCIALS_DOC_ID);
  await setDoc(finRef, {
    finalizedAt,
    finalizedBy: input.enteredBy,
    coachTransactionId: coachTransactionId ?? null,
  }, { merge: true });

  return {
    finalizedAt,
    incomeCount: input.incomeItems.length,
    expenseCount: input.expenseItems.length,
    coachLogged,
  };
}

/**
 * 精算確定を取り消し、家計簿から該当する取引を削除する
 */
export async function unfinalizeEventAccounting(eventId: string): Promise<void> {
  // attendances に紐付く transaction を削除
  const attCol = collection(db, "events", eventId, "attendances");
  const attSnap = await getDocs(attCol);
  for (const a of attSnap.docs) {
    const txId = a.data().transactionId as string | undefined | null;
    if (txId) {
      try {
        await deleteTransaction(txId);
      } catch {
        // 削除済みは無視
      }
      await updateAttendance(eventId, a.id, { transactionId: null });
    }
  }

  // eventExpenses に紐付く transaction を削除
  const expQ = query(collection(db, EXPENSES_COLLECTION), where("eventId", "==", eventId));
  const expSnap = await getDocs(expQ);
  for (const e of expSnap.docs) {
    const txId = e.data().transactionId as string | undefined;
    if (txId) {
      try {
        await deleteTransaction(txId);
      } catch {
        // 削除済みは無視
      }
      await setDoc(e.ref, { transactionId: deleteField() }, { merge: true });
    }
  }

  // financials のコーチ料 transaction を削除
  const finRef = doc(db, "events", eventId, FINANCIALS_SUBCOLLECTION, FINANCIALS_DOC_ID);
  const finSnap = await getDoc(finRef);
  if (finSnap.exists()) {
    const coachTxId = finSnap.data().coachTransactionId as string | undefined | null;
    if (coachTxId) {
      try {
        await deleteTransaction(coachTxId);
      } catch {
        // 削除済みは無視
      }
    }
    await setDoc(finRef, {
      finalizedAt: deleteField(),
      finalizedBy: deleteField(),
      coachTransactionId: deleteField(),
    }, { merge: true });
  }
}

/**
 * 個別メンバーの参加費を手動で上書きする（永続化）
 *  - amount === null を渡すと上書き解除（自動算出に戻る）
 */
export async function setAttendanceFeeOverride(
  eventId: string,
  memberId: string | number,
  amount: number | null
): Promise<void> {
  await updateAttendance(eventId, memberId, { feeOverride: amount });
}

// ─────────────────────────────────────────────
// 当日会計サマリ（events/{eventId}/financials/main）
//  events ドキュメント本体は admin のみ書き込み可なので、
//  財務系の手動上書きはサブドキュメントに分離して isMember() で書ける構造にする
// ─────────────────────────────────────────────

const FINANCIALS_SUBCOLLECTION = "financials";
const FINANCIALS_DOC_ID = "main";

export interface EventFinancials {
  /**
   * コーチ料の手動上書き値（円）。
   * undefined: 自動算出。0: 明示的に 0円。
   */
  coachFeeOverride?: number | null;
  /** 精算確定時刻（ISO文字列）。未確定なら undefined */
  finalizedAt?: string;
  /** 精算確定者 */
  finalizedBy?: string;
  /** 自動コーチ料の家計簿取引ID（再精算時に削除する） */
  coachTransactionId?: string | null;
}

export function subscribeToEventFinancials(
  eventId: string,
  callback: (data: EventFinancials) => void
) {
  const ref = doc(db, "events", eventId, FINANCIALS_SUBCOLLECTION, FINANCIALS_DOC_ID);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as EventFinancials) : {});
  });
}

/**
 * イベントのコーチ料を手動で上書きする（永続化）
 *  - amount === undefined を渡すと上書き解除（自動算出に戻る）
 */
export async function setCoachFeeOverride(
  eventId: string,
  amount: number | null | undefined
): Promise<void> {
  const ref = doc(db, "events", eventId, FINANCIALS_SUBCOLLECTION, FINANCIALS_DOC_ID);
  if (amount === undefined) {
    await setDoc(ref, { coachFeeOverride: deleteField() }, { merge: true });
  } else {
    await setDoc(ref, { coachFeeOverride: amount }, { merge: true });
  }
}
