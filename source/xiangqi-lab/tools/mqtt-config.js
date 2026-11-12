// 回饋 854（開發者 11/9：專用 MQTT 伺服器、降流量）：電腦上連線上大廳的程式（lobby-bots.js、cup-host.js、qa-players.js、watch-feedback.js、announce-version.js）
// 都從這裡拿伺服器網址和帳密，搬家時只改 tools/mqtt-config.json（照 mqtt-config.example.json 抄一份再填），不用改程式。
//   沒有 mqtt-config.json＝照舊連公開伺服器 broker.emqx.io、不帶帳密。
//   測試時可以指定另一份設定檔：參數 --mqtt-config <檔案>，或環境變數 XQ_MQTT_CONFIG=<檔案>（指定了卻找不到檔案就停下來，不會偷偷連到公開伺服器）
//   mqtt-config.json 裡有密碼，不要貼到對話裡、不要放進 git（tools/.gitignore 已經排除）
// App（手機）那邊的網址和帳密寫在 src/net.js 的 MQ。
"use strict";
const fs = require("fs"), path = require("path");
const DEF = { url: "wss://broker.emqx.io:8084/mqtt", username: "", password: "" };

function load(argv) {
  argv = argv || process.argv.slice(2);
  const i = argv.indexOf("--mqtt-config"), asked = i >= 0 ? argv[i + 1] : process.env.XQ_MQTT_CONFIG;
  const file = asked ? path.resolve(asked) : path.join(__dirname, "mqtt-config.json");
  let j = null;
  if (fs.existsSync(file)) {
    try { j = JSON.parse(fs.readFileSync(file, "utf8")) } catch (e) { throw new Error("MQTT 設定檔格式不對（" + file + "）：" + e.message) }
  } else if (asked) throw new Error("找不到 MQTT 設定檔：" + file);
  const c = { ...DEF, ...(j || {}) };
  /* 有填 host（EMQX Serverless 總覽頁的 Address，例如 xxxxxxxx.ala.us-east-1.emqxsl.com）就用 wss://host:port/path 組網址（port 預設 8084、path 預設 /mqtt，都可以改）；沒填 host 才看 url */
  const host = String(c.host || "").trim();
  if (host) { if (!/^[\w.-]+$/.test(host)) throw new Error("MQTT 設定檔的 host 只要寫主機名稱（不要 wss://、不要冒號）：" + host); const port = +c.port || 8084, p = String(c.path == null ? "/mqtt" : c.path); c.url = "wss://" + host + ":" + port + (p && p[0] !== "/" ? "/" + p : p) }
  c.url = String(c.url || ""); c.username = String(c.username || ""); c.password = String(c.password || "");
  if (!/^wss?:\/\/[^\s]+$/.test(c.url)) throw new Error("MQTT 設定檔的 url 要是 wss://… 開頭：" + c.url);
  c.file = j ? file : null;
  return c;
}

// MQTT 3.1.1 的 CONNECT 封包（clean session；遺囑 QoS 0；有帳號才帶帳密）
function connectPacket(o) {
  const te = new TextEncoder();
  const str = x => { const b = te.encode(x); return [b.length >> 8, b.length & 255, ...b] };
  const vlen = n => { const a = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; a.push(d) } while (n > 0); return a };
  const w = o.will; let fl = 0x02; if (w) fl |= 0x04 | (w.retain ? 0x20 : 0); if (o.username) fl |= 0x80 | (o.password ? 0x40 : 0);
  /* o.v5＝MQTT 5（協定版本 5；CONNECT 和遺囑各多一段屬性長度 0） */
  const ka = o.keepalive || 30, body = [0, 4, 77, 81, 84, 84, o.v5 ? 5 : 4, fl, ka >> 8, ka & 255, ...(o.v5 ? [0] : []), ...str(o.clientId)];
  if (w) { if (o.v5) body.push(0); body.push(...str(w.topic)); const p = te.encode(w.payload || ""); body.push(p.length >> 8, p.length & 255, ...p) }
  if (o.username) { body.push(...str(o.username)); if (o.password) body.push(...str(o.password)) }
  return new Uint8Array([0x10, ...vlen(body.length), ...body]);
}

// 給人看的說明（不印密碼）
const describe = c => c.url + (c.username ? "（帳號 " + c.username + "）" : "（沒有帳密）") + (c.file ? "・設定檔 " + c.file : "・預設值");

module.exports = { load, connectPacket, describe, DEFAULT_URL: DEF.url };

// 直接執行＝檢查設定檔連不連得上（只連線、訂閱一下就斷，不發任何訊息、不印密碼）：
//   node tools/mqtt-config.js                                   ← 檢查 tools/mqtt-config.json
//   node tools/mqtt-config.js --mqtt-config tools/mqtt-config.new.json --room citytest
if (require.main === module) {
  const argv = process.argv.slice(2), room = argv.includes("--room") ? argv[argv.indexOf("--room") + 1] : "citytest";
  let c; try { c = load(argv) } catch (e) { console.log("❌ " + e.message); process.exit(1) }
  const ROOT = room === "live" ? "xqlab-r7k2q/v1" : "xqlab-test-" + room + "/v1";
  console.log("連線到 " + describe(c) + "，房間 " + ROOT + " …");
  const WHY = { 1: "伺服器不支援這個 MQTT 版本", 2: "clientId 被拒絕", 3: "伺服器暫時不能用", 4: "帳號或密碼不對", 5: "這個帳號沒有權限連線" };
  const te = new TextEncoder(), td = new TextDecoder(), str = x => { const b = te.encode(x); return [b.length >> 8, b.length & 255, ...b] };
  let ws; try { ws = new WebSocket(c.url, ["mqtt"]) } catch (e) { console.log("❌ 網址不對：" + e.message); process.exit(1) }
  ws.binaryType = "arraybuffer"; const tm = setTimeout(() => { console.log("❌ 15 秒都連不上（網址、連接埠、路徑對嗎？公司或學校網路有沒有擋 8084？）"); process.exit(1) }, 15000);
  let got = 0;
  ws.onopen = () => ws.send(connectPacket({ clientId: "xqcheck" + Date.now().toString(36), keepalive: 30, username: c.username, password: c.password }));
  ws.onmessage = e => {
    const b = new Uint8Array(e.data), t = b[0] >> 4;
    if (t === 2) { if (b[3] !== 0) { console.log("❌ 伺服器拒絕連線：" + (WHY[b[3]] || "代碼 " + b[3])); process.exit(1) } console.log("✅ 連上了（帳密正確）"); const top = ROOT + "/sys/+"; ws.send(new Uint8Array([0x82, 2 + 2 + te.encode(top).length + 1, 0, 1, ...str(top), 0])) }
    else if (t === 9) { console.log(b[4] === 0x80 ? "❌ 不准訂閱 " + ROOT + "/sys/+（ACL 權限要再檢查）" : "✅ 可以訂閱 " + ROOT + "/sys/+"); setTimeout(() => { console.log(got ? "✅ 收到 " + got + " 則保留訊息（sys/ver、sys/bots…）" : "（這個房間目前沒有 sys/ 的保留訊息，正常）"); clearTimeout(tm); try { ws.send(new Uint8Array([0xE0, 0])); ws.close() } catch (x) { } process.exit(0) }, 2500) }
    else if (t === 3) got++;
  };
  ws.onerror = () => { }; ws.onclose = () => { };
}
