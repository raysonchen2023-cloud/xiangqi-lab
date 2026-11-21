// 簡易 CDP 連線（Android WebView，經 adb forward）。只讀狀態、設 localStorage、送觸控；不改 App 程式。
"use strict";
const http = require("http");
function getJSON(url) { return new Promise((ok, no) => { http.get(url, r => { let s = ""; r.on("data", d => s += d); r.on("end", () => { try { ok(JSON.parse(s)) } catch (e) { no(e) } }) }).on("error", no) }) }
async function pageWs(port) { const L = await getJSON(`http://127.0.0.1:${port}/json/list`); const p = L.find(x => x.type === "page"); if (!p) throw new Error("找不到 WebView 頁面"); return p.webSocketDebuggerUrl }
async function connect(port) {
  const url = await pageWs(port);
  const ws = new WebSocket(url); let id = 0; const pend = new Map(), handlers = [];
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = e => no(new Error("CDP 連不上")) });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const { ok, no } = pend.get(m.id); pend.delete(m.id); m.error ? no(new Error(m.error.message)) : ok(m.result) } else if (m.method) handlers.forEach(h => h(m)) };
  ws.onclose = () => { for (const { no } of pend.values()) no(new Error("CDP 斷了")); pend.clear() };
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; pend.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); no(new Error("CDP 逾時 " + method)) } }, 30000) });
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error("頁面例外：" + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result.value };
  return { send, ev, on: h => handlers.push(h), close: () => ws.close(), ws };
}
module.exports = { connect, getJSON };
