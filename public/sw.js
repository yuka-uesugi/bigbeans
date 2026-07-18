/*
 * ビックビーンズ サービスワーカー（プッシュ通知の受け皿）
 *   - push       : サーバーから届いた通知を画面に表示し、アイコンに赤バッジを付ける
 *   - notificationclick : 通知をタップしたらアプリの該当ページを開く
 *   ※ このファイルはブラウザが直接読み込むため、ビルド対象外（素のJavaScriptで書く）
 */

// 新しいSWを待たずすぐ有効化する（更新がすぐ届くように）
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
      // アプリアイコンに赤いバッジ（未読の印）を付ける。
      // 数字はアプリを開いたときに正確な未読数へ更新される。
      if (self.navigator.setAppBadge) {
        try {
          await self.navigator.setAppBadge();
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
