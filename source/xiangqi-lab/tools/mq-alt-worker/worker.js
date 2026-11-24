/* W53 大廳 IPv6 備援入口（2026-11-24 開發者授權「Cloudflare 轉送」）
   只做一件事：把 wss://<這個 Worker>/mqtt 的 WebSocket 原封不動轉到 EMQX（xiangqi-lobby，新加坡）的 8084。
   Cloudflare 對外有 IPv6，只有 IPv6 的網路（App Store 審查常用）連不到 EMQX 時，App 的 net.js 會換到這個入口（MQ.alt）。
   不是通用代理：路徑不是 /mqtt、或不是 WebSocket 升級請求，一律 404；轉送目標寫死，不看用戶端給的網址。
   計費：每條連線算 1 次請求，訊息不算、連線時間不收（Workers 免費方案每天 10 萬次）。 */
const UPSTREAM = "https://d23f1132.ala.asia-southeast1.emqxsl.com:8084/mqtt";
export default {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname !== "/mqtt" || (req.headers.get("Upgrade") || "").toLowerCase() !== "websocket")
      return new Response("not found", { status: 404 });
    return fetch(UPSTREAM, { method: "GET", headers: req.headers });
  },
};
