// 象棋千秋 Android：把 App 讀 CDN、讀遠端開關的請求改向（W74～W76，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：網頁、Android、iOS 共用同一個 CDN，而且 CDN 沒有分版；網頁一上線，現行 App 的玩家就讀到新資料。
//   開發者 2026-11-23 看過外部評論後選「步驟 7 移到網頁上線前」「P0 加回退與開關測項」（發版回歸驗收規則「上線前相容、開關與 go/no-go」）：
//   W74 現行 App 讀新 CDN：網頁上線前，讓模擬器裡的 Play 現行版改讀「這版要上線的資料」（CDN 預覽分支網址，或本機組好的資料夾）。
//   W75 新 App 讀舊 CDN（回退情境）：網頁還沒上線，正式 CDN 就是上一版，不用改向，直接讀。
//   W76 遠端開關：把開關檔的回應換成指定內容（關掉某個功能），或讓它讀不到。
// 做法：CDP 的 Fetch 攔截。原生版的 Service Worker 沒有 fetch 處理（native-sw.js），請求都由頁面直接發出，所以在頁面這一層攔就涵蓋得到。
// 防作假：只要有攔，就一定攔「探測檔」data/__xq_route_probe.txt 回固定內容；頁面讀得到，才證明攔截真的生效（probeOk）。
//   讀不到＝攔截沒接上，這一輪測不成立，不能當成「新 CDN 沒問題」。
"use strict";
const fs = require("fs"), path = require("path");

const CDN = "https://xiangqi-cdn.pages.dev/";
const FLAGS_URL = "https://raw.githubusercontent.com/raysonchen2023-cloud/xiangqi-lab/main/data/flags.json";
const PROBE = "data/__xq_route_probe.txt", PROBE_BODY = "xq-route-ok";
const TYPES = { ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".mp4": "video/mp4", ".js": "text/javascript", ".mjs": "text/javascript", ".txt": "text/plain", ".html": "text/html",
  ".glb": "model/gltf-binary", ".wasm": "application/wasm" };

/* 一個請求怎麼處理（純函式，測試直接呼叫）。o＝{ to: 改向目標（https 網址或本機資料夾；沒給＝不改向）, flags: 開關檔要回的物件、"fail"＝讀不到、沒給＝不動 } */
function decide(url, o = {}) {
  const u = String(url || "").split("#")[0], q = u.indexOf("?");
  const base = q < 0 ? u : u.slice(0, q), qs = q < 0 ? "" : u.slice(q);
  if (base === FLAGS_URL) {
    if (o.flags === "fail") return { action: "fail" };
    if (o.flags && typeof o.flags === "object") return { action: "fulfill", status: 200, body: Buffer.from(JSON.stringify(o.flags)), type: "application/json" };
    return { action: "continue" };
  }
  if (!base.startsWith(CDN)) return { action: "continue" };
  const relRaw = base.slice(CDN.length);
  let rel; try { rel = decodeURIComponent(relRaw) } catch (e) { return { action: "fulfill", status: 400, body: Buffer.alloc(0), type: "text/plain" } }
  if (rel === PROBE) return { action: "fulfill", status: 200, body: Buffer.from(PROBE_BODY), type: "text/plain", probe: true };
  if (!o.to) return { action: "continue" };
  if (/^https:\/\//.test(o.to)) return { action: "redirect", url: o.to.replace(/\/?$/, "/") + relRaw + qs };
  /* 本機資料夾：跟 CDN 同樣的結構（cdn-deploy --stage 的輸出）；跑出資料夾外、找不到都回 404，跟 CDN 沒有那個檔一樣 */
  const root = path.resolve(o.to), f = path.resolve(root, ...rel.split("/"));
  const nf = { action: "fulfill", status: 404, body: Buffer.alloc(0), type: "text/plain", miss: rel };
  if (!f.startsWith(root + path.sep)) return nf;
  let st; try { st = fs.statSync(f) } catch (e) { return nf }
  if (!st.isFile()) return nf;
  return { action: "fulfill", status: 200, body: fs.readFileSync(f), type: TYPES[path.extname(f).toLowerCase()] || "application/octet-stream", file: rel };
}

/* 在已經連上的 CDP（cdp.js 的 connect）開攔截。回傳紀錄陣列：每個攔到的請求怎麼處理；探測檔有沒有被要過 */
async function routeCdn(c, o = {}) {
  const log = [];
  const patterns = [{ urlPattern: CDN + "*", requestStage: "Request" }];
  if (o.flags) patterns.push({ urlPattern: FLAGS_URL + "*", requestStage: "Request" });
  c.on(async (m) => {
    if (m.method !== "Fetch.requestPaused") return;
    const { requestId, request } = m.params;
    let d; try { d = decide(request.url, o) } catch (e) { d = { action: "fail", why: String(e.message || e) } }
    const row = { url: String(request.url).slice(0, 240), action: d.action };
    if (d.status) row.status = d.status; if (d.url) row.to = d.url.slice(0, 240); if (d.miss) row.miss = d.miss; if (d.probe) row.probe = true;
    log.push(row);
    try {
      if (d.action === "redirect") await c.send("Fetch.continueRequest", { requestId, url: d.url });
      else if (d.action === "fulfill") await c.send("Fetch.fulfillRequest", { requestId, responseCode: d.status,
        responseHeaders: [{ name: "Content-Type", value: d.type }, { name: "Access-Control-Allow-Origin", value: "*" }, { name: "Cache-Control", value: "no-store" }],
        body: d.body.toString("base64") });
      else if (d.action === "fail") await c.send("Fetch.failRequest", { requestId, errorReason: "ConnectionFailed" });
      else await c.send("Fetch.continueRequest", { requestId });
    } catch (e) { row.error = String(e.message || e) }
  });
  await c.send("Fetch.enable", { patterns });
  return log;
}

/* 頁面自己去讀探測檔：讀到固定內容＝攔截真的接上了 */
const PROBE_JS = `fetch(XQ_CDN+${JSON.stringify(PROBE)}+"?t="+Date.now(),{cache:"no-store"}).then(r=>r.text()).catch(e=>"讀不到："+e.message)`;
async function probeOk(c) { return (await c.ev(PROBE_JS)) === PROBE_BODY }

/* 一輪改向的摘要（寫進報告）：攔了幾個、改向幾個、新 CDN 缺哪些檔、有沒有送 CDP 失敗的 */
function summarize(log, probe) {
  const real = log.filter((r) => !r.probe);
  return { probeOk: probe === true, intercepted: real.length,
    redirected: real.filter((r) => r.action === "redirect" || (r.action === "fulfill" && r.status === 200)).length,
    missing: [...new Set(real.filter((r) => r.miss).map((r) => r.miss))], errors: real.filter((r) => r.error).map((r) => r.url + "：" + r.error).slice(0, 20),
    flags: real.filter((r) => r.url.startsWith(FLAGS_URL)).map((r) => r.action) };
}

module.exports = { decide, routeCdn, probeOk, summarize, CDN, FLAGS_URL, PROBE, PROBE_BODY, PROBE_JS };
