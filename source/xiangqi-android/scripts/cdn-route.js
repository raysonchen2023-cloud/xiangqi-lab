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

/* ===== W74 包外檔讀取輪（#74 Android 12 實跑後補，iMac Claude 2 2026-11-23）=====
   現行 App 只在「包裡讀不到」時才向 CDN 補抓；0643 mini 包把 44 個畫面要用的檔都包了，掃畫面時一個 CDN 請求都沒有，
   改向到空資料夾也照樣 0 破圖：光掃畫面驗不到「現行 App 讀新 CDN」。所以 --cdn-to 時，掃完畫面在 App 頁面裡再跑一輪：
     1. 經由攔截讀新 CDN 的 cdn-manifest.json（讀不到＝現行 App 要補抓的檔全都會失敗＝紅燈）；
     2. 從清單挑 data/ 底下、2 MB 以內的檔，平均分散地試；包裡讀得到（回應不是從 CDN 來的）就跳過，只留包外才有的；
     3. 包外的檔經由攔截從 XQ_CDN 讀：狀態、大小、SHA-1（清單記的前幾碼）都要對得上，最多驗 OUTSIDE_MAX 個。
   「包裡讀得到」用回應網址判斷：App 要是把 fetch 包成「讀不到改問 CDN」，回應網址會是 CDN 的，照樣算包外。 */
const OUTSIDE_MAX = 30, OUTSIDE_PROBES = 800, OUTSIDE_SIZE = 2 * 1024 * 1024;
const OUTSIDE_JS = (n = OUTSIDE_MAX) => `(async () => {
  const out = { manifest: null, candidates: 0, probed: 0, checked: [], bad: [], hash: typeof crypto === "object" && !!crypto.subtle };
  let man;
  try { const r = await fetch(XQ_CDN + "cdn-manifest.json?t=" + Date.now(), { cache: "no-store" }); out.manifest = r.status; if (!r.ok) return out; man = await r.json() }
  catch (e) { out.manifest = "讀不到：" + e.message; return out }
  const files = Object.entries((man && man.files) || {}).filter(([f, v]) => f.startsWith("data/") && f.indexOf("__xq_") < 0 && Array.isArray(v) && v[0] > 0 && v[0] <= ${OUTSIDE_SIZE}).sort((a, b) => a[0] < b[0] ? -1 : 1);
  out.candidates = files.length;
  const hex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
  const step = Math.max(1, Math.floor(files.length / ${OUTSIDE_PROBES}));
  for (let i = 0; i < files.length; i += step) {
    if (out.checked.length + out.bad.length >= ${n} || out.probed >= ${OUTSIDE_PROBES}) break;
    const [f, v] = files[i]; out.probed++;
    let local = false;
    try { const r = await fetch(f + "?xqlocal=" + Date.now(), { cache: "no-store" }); local = r.ok && String(r.url).indexOf(XQ_CDN) !== 0 } catch (e) { }
    if (local) continue;
    try {
      const r = await fetch(XQ_CDN + f + "?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) { out.bad.push({ f, why: "狀態 " + r.status }); continue }
      const b = await r.arrayBuffer();
      if (b.byteLength !== v[0]) { out.bad.push({ f, why: "大小 " + b.byteLength + "，清單 " + v[0] }); continue }
      if (out.hash && v[1]) { const h = hex(await crypto.subtle.digest("SHA-1", b)); if (!h.startsWith(String(v[1]))) { out.bad.push({ f, why: "SHA-1 " + h.slice(0, 12) + "，清單 " + v[1] }); continue } }
      out.checked.push(f);
    } catch (e) { out.bad.push({ f, why: "讀不到：" + e.message }) }
  }
  return out;
})()`;
/* 包外檔讀取輪的判定（純函式）：清單讀不到或有檔不對＝1（現行 App 讀新 CDN 會壞）；一個包外檔都沒驗到＝2（驗不到）；其餘＝0 */
function judgeOutside(o) {
  if (!o || typeof o !== "object" || o.error) return { code: 2, why: "包外檔讀取輪沒有跑出結果" + (o && o.error ? "（" + o.error + "）" : "") };
  if (o.manifest !== 200) return { code: 1, why: `新 CDN 的 cdn-manifest.json 讀不到（${o.manifest}）：現行 App 要向 CDN 補抓的檔都會失敗` };
  if (Array.isArray(o.bad) && o.bad.length) return { code: 1, why: `${o.bad.length} 個包外才有的檔從新 CDN 讀不到或內容不對：` + o.bad.slice(0, 5).map((b) => `${b.f}（${b.why}）`).join("、") };
  if (!Array.isArray(o.checked) || !o.checked.length) return { code: 2, why: `找不到包外才有的檔（清單 ${o.candidates} 個、試了 ${o.probed} 個都在包裡）：驗不到現行 App 經由 CDN 讀資料` };
  return { code: 0, why: `${o.checked.length} 個包外才有的檔都從新 CDN 讀到，大小${o.hash ? "和 SHA-1 " : ""}都跟清單對得上` + (o.hash ? "" : "（這台沒有 crypto.subtle，只比大小）") };
}

module.exports = { decide, routeCdn, probeOk, summarize, judgeOutside, OUTSIDE_JS, OUTSIDE_MAX, OUTSIDE_PROBES, CDN, FLAGS_URL, PROBE, PROBE_BODY, PROBE_JS };
