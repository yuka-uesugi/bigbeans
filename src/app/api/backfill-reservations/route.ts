import { NextResponse } from "next/server";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDocs, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { verifyFirebaseIdToken, fetchUserRole } from "@/lib/firebaseRest";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─────────────────────────────────────────────
// 予約データの照合・修復（管理者用バックフィル）
//
// 背景:
//  参加登録には「予約(reservations)」と「出欠(attendances)」の2つの台帳がある。
//  統一エンジン導入前の登録や、旧・代理登録（出欠だけを直接書く作りだった）では
//  予約が作られておらず、ビジター向け画面（予約ベースの人数表示）に映らない
//  参加者が生まれていた（2026-07-20に7/29の練習で出欠20名・予約3件と発覚）。
//
// このAPIは、今日以降の練習について
//  「出欠が参加(attend)なのに、対応する予約が無い人」を探し、
//  予約(confirmed)を後追いで作成して2つの台帳を一致させる。
//  すでに参加が確定している人の後追い登録なので、定員判定はせず必ず confirmed にする。
//
// 使い方:
//  規約ページの管理者用ボタンから呼ぶ。dryRun=true なら書き込まず報告だけ返す。
//  呼び出し元が admin / supporter であることを idToken で確認し、
//  書き込みはロボット役アカウント（メンバー権限）で行う。
// ─────────────────────────────────────────────

type Body = { idToken?: string; dryRun?: boolean };

/** "[V] 田中" → "田中" */
const stripV = (s: string) => s.replace(/^\[V\] /, "");

/** 今日の日付を JST で "2026-07-20" 形式にする */
function todayJst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

async function ensureRobotSignedIn(): Promise<void> {
  const email = process.env.FIREBASE_ROBOT_EMAIL;
  const password = process.env.FIREBASE_ROBOT_PASSWORD;
  if (!email || !password) {
    throw new Error("ロボット用ログイン設定が未設定です。");
  }
  if (auth.currentUser?.email?.toLowerCase() === email.toLowerCase()) return;
  await signInWithEmailAndPassword(auth, email, password);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  if (!body.idToken) {
    return NextResponse.json({ error: "認証情報がありません。" }, { status: 401 });
  }
  let sender: { uid: string };
  try {
    sender = await verifyFirebaseIdToken(body.idToken);
  } catch {
    return NextResponse.json({ error: "ログインの確認に失敗しました。" }, { status: 401 });
  }
  const role = await fetchUserRole(body.idToken, sender.uid);
  if (role !== "admin" && role !== "supporter") {
    return NextResponse.json(
      { error: "この機能は管理者・サポーターのみ実行できます。" },
      { status: 403 }
    );
  }

  const dryRun = body.dryRun !== false; // 省略時は「報告だけ」（安全側に倒す）

  try {
    await ensureRobotSignedIn();

    const today = todayJst();

    // 今日以降の「練習」を対象にする（過去の表示は運営に影響しないため触らない）
    const eventsSnap = await getDocs(collection(db, "events"));
    const targets = eventsSnap.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as {
          type?: string;
          date?: string;
          title?: string;
          createdAt?: Timestamp;
          bookingConfig?: { publishedAt?: Timestamp };
        }),
      }))
      .filter((e) => e.type === "practice" && (e.date ?? "") >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

    const report: {
      eventId: string;
      date: string;
      title: string;
      attendCount: number;
      reservationCount: number;
      missing: string[];
      created: number;
      /** 解禁起点（publishedAt）が後からリセットされてズレていたか */
      unlockBaseBroken: boolean;
      /** 今回の修復で解禁起点を「予定の追加時」に戻したか */
      unlockBaseFixed: boolean;
    }[] = [];

    for (const ev of targets) {
      const [attSnap, resSnap] = await Promise.all([
        getDocs(collection(db, "events", ev.id, "attendances")),
        getDocs(collection(db, "events", ev.id, "reservations")),
      ]);

      const attendances = attSnap.docs.map((d) => ({
        memberId: d.id,
        ...(d.data() as { name?: string; status?: string; membershipType?: string }),
      }));
      const reservations = resSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as { uid?: string; name?: string; status?: string; attendanceId?: string }),
      }));
      const active = reservations.filter((r) => r.status !== "cancelled");

      // 「参加」なのに対応する予約が無い人を探す（ID → 名前の順で照合。participation.ts と同じ考え方）
      const attends = attendances.filter((a) => a.status === "attend");
      const missing = attends.filter(
        (a) =>
          !active.some(
            (r) =>
              r.attendanceId === a.memberId ||
              r.id === a.memberId ||
              r.uid === a.memberId ||
              stripV(r.name ?? "") === stripV(a.name ?? "")
          )
      );

      let created = 0;
      if (!dryRun) {
        for (const a of missing) {
          const name = stripV(a.name ?? "名前不明");
          // 種別は出欠のスナップショット → 名前の [V] 印の順で判定
          const memberType =
            a.membershipType === "light"
              ? "light"
              : a.membershipType === "visitor" || (a.name ?? "").startsWith("[V]")
                ? "visitor"
                : "official";
          // すでに参加確定している人の後追い登録なので、定員判定はせず confirmed で作る
          await setDoc(doc(collection(db, "events", ev.id, "reservations")), {
            uid: a.memberId,
            name,
            memberType,
            status: "confirmed",
            reservedAt: Timestamp.now(),
            attendanceId: a.memberId,
          });
          created++;
        }
      }

      // 解禁起点（bookingConfig.publishedAt）の点検・修復。
      // 予定の編集時にルールが再作成されると起点が「編集した日」になり、
      // ライト・ビジターの解禁日が練習日より後にずれる事故が起きていた
      // （2026-07-20の担当カード保存で実際に発生）。
      // 「起点が予定の追加時より1日以上あと」ならリセットされたと判断し、追加時に戻す。
      const pub = ev.bookingConfig?.publishedAt;
      const created2 = ev.createdAt;
      const unlockBaseBroken =
        !!pub && !!created2 && pub.toMillis() - created2.toMillis() > 24 * 3600 * 1000;
      let unlockBaseFixed = false;
      if (unlockBaseBroken && !dryRun) {
        await updateDoc(doc(db, "events", ev.id), {
          "bookingConfig.publishedAt": created2,
        });
        unlockBaseFixed = true;
      }

      report.push({
        eventId: ev.id,
        date: ev.date ?? "",
        title: ev.title ?? "",
        attendCount: attends.length,
        reservationCount: active.length,
        missing: missing.map((a) => stripV(a.name ?? a.memberId)),
        created,
        unlockBaseBroken,
        unlockBaseFixed,
      });
    }

    return NextResponse.json({ ok: true, dryRun, report });
  } catch (e) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    console.error("[backfill-reservations]", message);
    return NextResponse.json(
      { error: "照合・修復の処理に失敗しました。時間をおいてお試しください。" },
      { status: 500 }
    );
  }
}
