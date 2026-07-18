/*
 * ビックビーンズ サービスワーカー（プッシュ通知の受け皿）
 *   - push       : サーバーから届いた通知を画面に表示し、アイコンに赤バッジを付ける
 *   - notificationclick : 通知をタップしたらアプリの該当ページを開く
 *   ※ このファイルはブラウザが直接読み込むため、ビルド対象外（素のJavaScriptで書く）
 */

// 新しいSWを待たずすぐ有効化する（更新がすぐ届くように）
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// ── バッジの件数を保存する小さなデータ置き場（IndexedDB）──
//   サービスワーカーとアプリ画面の両方から同じ数字を読み書きするために使う。
//   これで「閉じている間に届いた件数」を数えて、アイコンに赤い数字を出せる。
function badgeDbGet() {
  return new Promise((resolve) => {
    const open = indexedDB.open("bb-badge", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("kv");
    open.onsuccess = () => {
      try {
        const req = open.result.transaction("kv", "readonly").objectStore("kv").get("count");
        req.onsuccess = () => resolve(Number(req.result) || 0);
        req.onerror = () => resolve(0);
      } catch (e) {
        resolve(0);
      }
    };
    open.onerror = () => resolve(0);
  });
}
function badgeDbSet(n) {
  return new Promise((resolve) => {
    const open = indexedDB.open("bb-badge", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("kv");
    open.onsuccess = () => {
      try {
        const tx = open.result.transaction("kv", "readwrite");
        tx.objectStore("kv").put(n, "count");
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    };
    open.onerror = () => resolve();
  });
}

// サーバーからのプッシュを受信
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ビックビーンズ", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "ビックビーンズ";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "bigbeans-notify",
    renotify: true,
    data: { url: data.url || "/dashboard/calendar" },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // アプリアイコンに赤い数字バッジ（未読の件数）を付ける。
      // 届くたびに1つずつ増やす（LINEのような❶❷…）。開いて読んだら0に戻る。
      if (self.navigator.setAppBadge) {
        try {
          const next = (await badgeDbGet()) + 1;
          await badgeDbSet(next);
          await self.navigator.setAppBadge(next);
        } catch (e) {
          /* 未対応環境では黙って無視 */
        }
      }
    })()
  );
});

// 通知をタップしたとき
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard/calendar";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // すでに開いているタブがあればそれを使う
      for (const client of allClients) {
        if ("focus" in client) {
          try {
            await client.navigate(targetUrl);
          } catch (e) {
            /* navigate 不可の環境ではそのまま focus */
          }
          return client.focus();
        }
      }
      // 開いていなければ新しく開く
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});
