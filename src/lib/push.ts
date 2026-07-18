"use client";

// ─────────────────────────────────────────────
// プッシュ通知（Web Push）のクライアント側ヘルパー
//   - サービスワーカーの登録
//   - 通知許可の取得＋購読（宛先＝PushSubscription の作成）
//   - 購読の解除
//   - アプリアイコンの赤バッジ（未読数）の同期
//   ※ 宛先の保存先は「本人の名簿ドキュメント（members/{id}）の pushSubs」。
//     別コレクションを作らないので Firestore ルールの追加が不要。
// ─────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// この端末・ブラウザがプッシュ通知に対応しているか
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// VAPID公開鍵（base64url文字列）を、購読に必要なバイト列へ変換する
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  // ArrayBuffer 由来にしておく（applicationServerKey の型に合わせる）
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

// サービスワーカーを登録して、その登録情報を返す（未対応なら null）
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.error("サービスワーカーの登録に失敗:", e);
    return null;
  }
}

// PushSubscription を、サーバーへ渡せる素直なJSON形へ変換する
export type PushSubJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function toPlain(sub: PushSubscription): PushSubJSON | null {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

/**
 * 通知の許可を求め、購読（宛先の作成）まで行う。
 * 成功したら宛先(JSON)を返す。許可されなかった・未対応なら null。
 */
export async function enablePush(): Promise<PushSubJSON | null> {
  if (!isPushSupported()) return null;
  if (!VAPID_PUBLIC_KEY) {
    console.error("VAPID公開鍵が未設定です（NEXT_PUBLIC_VAPID_PUBLIC_KEY）。");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = (await registerServiceWorker()) || (await navigator.serviceWorker.ready);
  if (!reg) return null;
  // 登録直後は ready を待つ（iOSで確実に有効化させる）
  await navigator.serviceWorker.ready;

  // すでに購読済みならそれを使う。無ければ新規購読。
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }
  return toPlain(sub);
}

/** いまの端末の購読を解除し、解除した宛先(endpoint)を返す（無ければ null）。 */
export async function disablePush(): Promise<string | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  } catch (e) {
    console.error("購読解除に失敗:", e);
    return null;
  }
}

/** 現在の通知許可の状態（"granted" | "denied" | "default" | "unsupported"） */
export function pushPermissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * アプリアイコンの赤バッジ（未読数）を同期する。
 * 0以下なら消す。未対応環境（PWA未インストール等）では黙って何もしない。
 */
export async function syncAppBadge(count: number): Promise<void> {
  try {
    if (count > 0 && "setAppBadge" in navigator) {
      await (navigator as Navigator & { setAppBadge: (n?: number) => Promise<void> }).setAppBadge(count);
    } else if ("clearAppBadge" in navigator) {
      await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
  } catch {
    /* 未対応・非インストール時は無視 */
  }
}
