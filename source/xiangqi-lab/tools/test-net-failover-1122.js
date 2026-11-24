// W53（11/22，App 審查 P-5「只有 IPv6 的網路」）：大廳連線「連不上就換下一個網址」（src/net.js 的 URLS、urlI、mqNext；開 App 一律從主伺服器開始，#146 審查拿掉了 mqRemember）
//   主伺服器只有 IPv4；備援入口 MQ.alt 要開發者授權建好有 IPv6 的端點才會填。11/24 開發者授權 Cloudflare 轉送，MQ.alt 填了 Worker xq-lobby-v6 一個入口。
//   這裡用測試房的 xq_mqtt.urls 放兩個假網址，假 MQTT 伺服器＋假時鐘，vm 載入真正的 src/net.js；不連任何伺服器、不開瀏覽器。
// 用法：node --test xiangqi-lab/tools/test-net-failover-1122.js
"use strict";
const { assert, test, fs, path, world, phone, noErrors, NET_SRC } = require("./net-harness.js");
const A = "wss://a.test:8084/mqtt", Bk = "wss://b.test:443/mqtt";

function store(init) { const m = new Map(init || []); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)) }, removeItem: k => { m.delete(k) }, map: m } }
/* xq_mqtt 只在測試房生效：假手機的 location 沒有 hostname，「本機網址強制進測試房」那條不會成立，所以明確設 xq_netRoot 進測試房 */
const cfg = urls => store([["xq_netRoot", JSON.stringify("failover")], ["xq_mqtt", JSON.stringify({ urls, user: "t", pass: "t" })]]);
/* 攔截連線：記下每次用的網址；blocked 裡的網址一律連不上（像只有 IPv6 的網路連不到只有 IPv4 的主機） */
function gate(S, B) {
  const att = B.attempt, urls = [], blocked = new Set();
  B.attempt = ws => {
    urls.push(ws.url);
    if (blocked.has(ws.url)) { S.add(() => { ws.readyState = 3; ws.onerror && ws.onerror({}); ws.onclose && ws.onclose({}) }, B.lat, 0, "broker"); return }
    att(ws);
  };
  return { urls, blocked };
}

test("只有一個網址（沒設備援）：每次都連那個網址，連不上也不亂換", async () => {
  /* 11/24 起正式版 MQ.alt 有 Cloudflare 轉送入口；「只有一個網址」改用測試房只給一個網址來驗，驗的行為不變 */
  const { S, B } = world(), g = gate(S, B);
  B.up = false;
  const P = phone(S, B, { id: "aaaa1111", name: "甲", storage: cfg([A]) });
  P.net.start(); await S.run(20000);
  assert.ok(g.urls.length >= 2, "有重試：" + g.urls.length);
  assert.equal(new Set(g.urls).size, 1, "只有一個網址：" + [...new Set(g.urls)].join("、"));
  B.up = true; await S.run(70000);
  assert.equal(P.net.status(), "up", "伺服器恢復後連得上");
  noErrors(S);
});

test("正式版設定（不是測試房）：主伺服器連不上時，下一次改連 Cloudflare 轉送入口（W53，11/24 開發者授權）", async () => {
  const MAIN = "wss://d23f1132.ala.asia-southeast1.emqxsl.com:8084/mqtt", CF = "wss://xq-lobby-v6.preview-w36.workers.dev/mqtt";
  const { S, B } = world(), g = gate(S, B), st = store();
  g.blocked.add(MAIN);
  const P = phone(S, B, { id: "aaaa1111", name: "甲", storage: st });
  P.net.start(); await S.run(15000);
  assert.equal(g.urls[0], MAIN, "先試主伺服器：" + g.urls.join(" → "));
  assert.equal(g.urls[1], CF, "連不上就換 Cloudflare 入口：" + g.urls.join(" → "));
  assert.equal(P.net.status(), "up", "備援連得上");
  noErrors(S);
});

test("主網址連不上（只有 IPv6 的網路）：下一次就換備援、連上", async () => {
  const { S, B } = world(), g = gate(S, B), st = cfg([A, Bk]);
  g.blocked.add(A);
  const P = phone(S, B, { id: "aaaa1111", name: "甲", storage: st });
  P.net.start(); await S.run(15000);
  assert.equal(g.urls[0], A, "先試主網址");
  assert.equal(g.urls[1], Bk, "連不上就換備援：" + g.urls.join(" → "));
  assert.equal(P.net.status(), "up", "備援連得上");
  noErrors(S);
});

test("重開 App：上次連的是備援（例如冷啟剛好沒網路、恢復時輪到備援），重開一律先試主伺服器，不黏在備援（#146 審查）", async () => {
  /* 先用一支手機重現：主伺服器暫時連不上 → 連到備援 */
  const w1 = world(), g1 = gate(w1.S, w1.B), st = cfg([A, Bk]);
  g1.blocked.add(A);
  const P1 = phone(w1.S, w1.B, { id: "aaaa1111", name: "甲", storage: st });
  P1.net.start(); await w1.S.run(15000);
  assert.equal(P1.net.status(), "up"); assert.equal(g1.urls[g1.urls.length - 1], Bk, "第一次開 App 停在備援：" + g1.urls.join(" → "));
  /* 重開 App（同一份存檔、舊版會留下的 xq_mqUrl 也放著），主伺服器這次正常 */
  st.setItem("xq_mqUrl", Bk);
  const w2 = world(), g2 = gate(w2.S, w2.B);
  const P2 = phone(w2.S, w2.B, { id: "aaaa1111", name: "甲", storage: st });
  P2.net.start(); await w2.S.run(3000);
  assert.equal(g2.urls[0], A, "重開先試主伺服器：" + g2.urls.join(" → "));
  assert.equal(P2.net.status(), "up"); assert.equal(g2.urls[g2.urls.length - 1], A, "連上的是主伺服器");
  noErrors(w1.S); noErrors(w2.S);
});

test("連上之後才斷（網路晃一下）：重連還用同一個網址，不換", async () => {
  const { S, B } = world(), g = gate(S, B), st = cfg([A, Bk]);
  const P = phone(S, B, { id: "aaaa1111", name: "甲", storage: st });
  P.net.start(); await S.run(3000);
  assert.equal(P.net.status(), "up"); assert.equal(g.urls[g.urls.length - 1], A);
  const n0 = g.urls.length;
  P.offline(); await S.run(45000); P.online(); P.fire("online"); await S.run(15000);
  assert.equal(P.net.status(), "up", "網路回來連得上");
  const after = g.urls.slice(n0);
  assert.ok(after.length >= 1, "有重連");
  assert.equal(after[after.length - 1], A, "最後連上的還是主網址：" + after.join(" → "));
  noErrors(S);
});

test("兩個都連不上：輪流試；主網址恢復後連得回來", async () => {
  const { S, B } = world(), g = gate(S, B), st = cfg([A, Bk]);
  g.blocked.add(A); g.blocked.add(Bk);
  const P = phone(S, B, { id: "aaaa1111", name: "甲", storage: st });
  P.net.start(); await S.run(60000);
  assert.ok(g.urls.length >= 4, "重試了好幾次：" + g.urls.length);
  for (let i = 1; i < 4; i++) assert.notEqual(g.urls[i], g.urls[i - 1], "相鄰兩次換網址：" + g.urls.slice(0, 4).join(" → "));
  g.blocked.delete(A); await S.run(130000);
  assert.equal(P.net.status(), "up", "主網址恢復後連上");
  noErrors(S);
});

test("舊版留下的 xq_mqUrl 是清單外的網址：照樣從主網址開始", async () => {
  const { S, B } = world(), g = gate(S, B), st = cfg([A, Bk]);
  st.setItem("xq_mqUrl", "wss://old.test/mqtt");
  const P = phone(S, B, { id: "aaaa1111", name: "甲", storage: st });
  P.net.start(); await S.run(3000);
  assert.equal(g.urls[0], A);
  assert.equal(P.net.status(), "up");
  noErrors(S);
});

test("〔原始碼〕正式版的備援清單 MQ.alt 只有開發者 11/24 授權的 Cloudflare 轉送入口；多網址設定只在測試房（xq_mqtt.urls）生效", () => {
  /* 11/24 開發者授權 Cloudflare 轉送（W53）：MQ.alt 只能是這一個入口；要加別的網址，照舊先問開發者 */
  assert.match(NET_SRC, /const MQ=\{[^}]*,alt:\["wss:\/\/xq-lobby-v6\.preview-w36\.workers\.dev\/mqtt"\]\};/, "MQ.alt 只能是開發者 11/24 授權的 Cloudflare 轉送入口");
  assert.match(NET_SRC, /if\(\/\^xqlab-test-\/\.test\(ROOT\)\)try\{const t=JSON\.parse\(localStorage\.getItem\("xq_mqtt"\)\|\|"null"\);[\s\S]{0,300}if\(t&&Array\.isArray\(t\.urls\)\)/, "urls 只在測試房的區塊裡讀");
  assert.match(NET_SRC, /cli\.ondown=was=>\{cli=null;if\(!was\)mqNext\(\);/, "只有「沒連上就斷」才換網址");
  assert.ok(!/localStorage\.(get|set)Item\("xq_mqUrl"/.test(NET_SRC), "不再讀寫 xq_mqUrl（#146 審查：開 App 一律先試主伺服器）");
});
