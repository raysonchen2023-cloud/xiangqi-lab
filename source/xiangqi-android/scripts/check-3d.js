#!/usr/bin/env node
// 象棋千秋 Android：封測 P0-3D「3D 落點按不到」的真實觸控檢查（W67，2026-11-22；原本是開發者電腦 tmp/ 的矩陣腳本，整理進公開倉庫）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：W02（11/19）黑方翻面時，棋盤上方的縮放、切換按鈕蓋住落點，觸控被按鈕接走；用程式合成的點擊測不出來。
//   所以這支一律用 adb shell input tap 送「真實觸控」，起點、落點都點，成不成功只看 App 的棋譜有沒有多出那一步。
// 九個情境（同發版回歸驗收規則「封測 P0 永久測項」）：一般電腦 cpu、驛站 inn、同桌紅方 pvp-red、同桌翻面後黑方 pvp-black、
//   車輪戰三桌 simul、黑洞正面 bhx-front、黑洞背面 bhx-back、星門圍城俯視 siege-top、星門圍城斜看 siege-iso
// 每個情境：關掉 App 重開 → 確認版號、在測試房 xq_test → 用 App 自己的函式開局（不走 UI）→ 等 3D 就緒、鏡頭停穩
//   → 從合法著法挑「起點與落點都在畫面安全區、落點是空格」的候選 → 真實觸控點起點（點在棋子身上，見 bodyPoint），確認 PARK.last.o.sel 選中
//   → 選子後鏡頭可能換角度，落點重新等停穩再量；黑洞背面落點改按十字鍵＋落子（見 padPresses）
//   （選不到就換下一個候選，最多 4 個，報告記下選不到的子）→ 量落點被誰蓋住（elementFromPoint）
//   每一步先掃「所有合法落點」有沒有被按鈕或其他元件蓋住，有一格被蓋住就不算過（W02 就是這種）；同桌紅黑先挑上緣帶的落點
//   已知問題只認 .github/p0-known.json 裡情境、種類相符而且沒過期限的（例如 W68 黑洞背面前排擋子）
//   → 真實觸控點落點 → 6 秒內棋譜多出 f、t 相符的那一步才算過
// 座標：PARK.v.screenOf(格號) 回 CSS 像素；乘 devicePixelRatio，再加上 WebView 在螢幕上的位移（uiautomator dump 量）
// 自我反測 --self-test：同桌翻面後黑方跑兩次，一次正常（要過），一次在落點上蓋一層透明遮罩（重現 W02「觸控被接走」，要被判失敗）；
//   兩次都照預期才結束碼 0。改動這支的判斷邏輯後要跑一次，證明它還抓得到 W02。
// 用法：node scripts/check-3d.js --build <版號> [--serial emulator-5580] [--port 9291] [--out p0-3d] [--only <情境正規式>]
//         [--self-test] [--allow-real-device] [--aab-apk <aab-to-apk.js 產生的 aab-apk.json：拉回手機實際安裝的 APK 比 SHA-256，對上才寫進報告>] [--known <已知問題清單，預設倉庫 .github/p0-known.json>]
//   需要：已開好的模擬器（或加 --allow-real-device 的實體手機）、已裝好要驗的候選包、adb（環境變數 ADB 或 PATH）
//   會關掉重開 App、在測試房 xq_test 開新局；不會解除安裝、不刪存檔
//   [--rounds N]（預設 2）：九情境整組連跑 N 輪，每一輪都全過才算過（W69 流程盤點第 5 項，開發者 11/23 選「連續 2 輪」：
//     不再接受「失敗後重跑到過」）。每次執行不論過不過都追加一行到 <out>/attempts.jsonl；報告記這是同一個 AAB／Android 版本的第幾次嘗試、之前失敗幾次
//     （環境不成立、例外結束也會記；紀錄跟著 --out 資料夾走：同一個候選包請一直用同一個 --out，換資料夾就看不到之前的失敗）
// 結束代碼：0＝全部通過（或 --self-test 兩次都照預期）；1＝有情境沒過；2＝用法錯誤或環境不成立（版號不對、不在測試房、量不到 WebView），不能當通過
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

const SCENARIOS = ["cpu", "inn", "pvp-red", "pvp-black", "simul", "bhx-front", "bhx-back", "siege-top", "siege-iso"];
/* 畫面安全區（CSS 像素）：上面是標題列與按鈕、下面是操作列，太靠邊的格子手指點不準 */
const SAFE = { x: 30, top: 160, bottom: 140 };
const MAX_START_TRIES = 4;
/* 黑洞第一戰是殘局題，App 只接受正解 BHX_SOL＝22→13（其他合法著法會直接取消選子），所以黑洞只試這一步 */
const PREFER = { bhx: [[22, 13]] }, ONLY = { bhx: true };
/* 起點點在棋子身上的高度（格子＝0、頭頂＝1）：依序試，真人點不到也會換個位置再點；黑洞背面 22 號俥 11/22 實測 0.5、1.1 選得到，0.3、0.7 選不到 */
const BODY_TRIES = [0.3, 0.5, 0.15, 0.7, 1.1];

/* ---- 純函式（CI 的 test-check-3d-1122.js 會測） ---- */
/* 從合法著法挑候選：落點是空格、起點與落點都在安全區；pts 是 {格號: {x,y}}（CSS 像素），沒有的格子視為不在畫面上 */
const inSafe = (p, vw, vh) => !!p && p.x > SAFE.x && p.x < vw - SAFE.x && p.y > SAFE.top && p.y < vh - SAFE.bottom;
/* prefer：先試的著法（黑洞沿用 11/19 閘門的 22→13：背面視角棋盤壓得很扁，最後一排格子太小點不準） */
/* topFirst：先挑落點在畫面上緣帶（在畫面內、但比安全區上緣還高）的著法——W02 就是上方按鈕蓋住這一帶的落點（流程盤點第 6 項） */
const inTop = (p, vw) => !!p && p.x > SAFE.x && p.x < vw - SAFE.x && p.y > 0 && p.y <= SAFE.top;
function chooseMoves(legal, board, pts, vw, vh, max = MAX_START_TRIES, prefer = [], only = false, topFirst = false) {
  const out = [], used = new Set();
  const P = prefer.filter(([f, t]) => legal.some(([a, b]) => a === f && b === t)), L = only ? P : P.concat(legal);
  if (topFirst && !only) for (const [f, t] of legal) {
    if (board[t] || used.has(f) || !inSafe(pts[f], vw, vh) || !inTop(pts[t], vw)) continue;
    used.add(f); out.push([f, t]); if (out.length >= max) return out;
  }
  for (const [f, t] of L) {
    const pref = prefer.some(([a, b]) => a === f && b === t);   /* 先試的著法可以是吃子（黑洞 22→13 吃士） */
    if ((board[t] && !pref) || used.has(f) || !inSafe(pts[f], vw, vh) || !inSafe(pts[t], vw, vh)) continue;
    used.add(f); out.push([f, t]);
    if (out.length >= max) break;
  }
  return out;
}
/* 鏡頭停穩：最後三次取樣，起點與落點的位置都動不到 1 個 CSS 像素 */
function settled(samples) {
  if (samples.length < 3) return false;
  const L = samples.slice(-3), d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  return L.every((s) => d(s.f, L[0].f) < 1 && d(s.t, L[0].t) < 1);
}
/* 起點要點在棋子身上：App 判斷點到哪顆子，比的是棋子身體的投影，不是格子在棋盤面的位置。
   黑洞的大角色身體比格子高出一截，點在腳下會被判成「跟旁邊那顆一樣近」而不選（11/22 Android 16 實測：0～10% 選不到、20～60% 選得到）；
   一般 3D 棋子 headOf 就等於 screenOf，這裡等於點格子 */
const BODY = 0.3;
function bodyPoint(base, head, k = BODY) { if (!head) return base; return { x: base.x + (head.x - base.x) * k, y: base.y + (head.y - base.y) * k } }
/* 黑洞背面：棋盤幾乎平著看，落點用手指點不準，App 在黑洞巨盤提供十字鍵＋「落子」（park3d.js padUI：▲ 往對方陣地、▶ 往畫面右邊）。
   照玩家實際操作（開發者 11/22 選單）：真實觸控點子，再按十字鍵把游標從起點移到落點、按落子。
   算要按哪個鍵、按幾下：rowUp＝按 ▲ 一下列號變多少（紅方不翻面時 −1）；rightUp＝按 ▶ 一下行號變多少（看畫面上右邊那一格是 +1 還是 −1） */
function padPresses(from, to, rowUp, rightUp) {
  const D = (to / 9 | 0) - (from / 9 | 0), E = to % 9 - from % 9, out = [];
  if (D) out.push({ key: D * rowUp > 0 ? "up" : "dn", n: Math.abs(D) });
  if (E) out.push({ key: E * rightUp > 0 ? "rt" : "lf", n: Math.abs(E) });
  return out;
}
/* 已知問題（流程盤點第 4 項）：只認 .github/p0-known.json 裡、情境與種類相符、版號沒超過期限的那一筆；清單沒有或過期就不放行 */
function knownFor(list, scenario, kind, build) {
  const b = String(build || "").slice(0, 8);
  return (list || []).find((x) => x && x.check === "p0-3d" && x.scenario === scenario && x.kind === kind && /^[0-9]{8}$/.test(String(x.until)) && b && b <= String(x.until)) || null;
}
/* 落點有沒有被蓋住（流程盤點第 6 項）：每一個合法落點在畫面內的，elementFromPoint 都要是 3D 畫布；回傳被蓋住的清單 */
function covered(hits) { return hits.filter((h) => h.inView && h.tag !== "CANVAS") }
/* CSS 像素 → 螢幕實體像素（真實觸控用） */
function toDevice(p, dpr, off) { return { x: Math.round(p.x * dpr + off.x), y: Math.round(p.y * dpr + off.y) } }
/* 棋譜在原本長度之後有沒有多出這一步 */
function moved(before, moves, mv) { return moves.some((m, i) => i >= before && m.f === mv[0] && m.t === mv[1]) }
/* uiautomator dump 裡 WebView 的位置 */
function webViewBounds(xml) {
  const m = /class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(xml) || /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*class="android\.webkit\.WebView"/.exec(xml);
  return m ? { x: +m[1], y: +m[2], right: +m[3], bottom: +m[4] } : null;
}
/* 嘗試紀錄（W69 流程盤點第 5 項）：同一個 AAB＋同一個 Android 版本，之前跑過幾次、失敗幾次（純函式） */
function priorAttempts(lines, aabSha256, android) {
  const same = lines.map((l) => { try { return JSON.parse(l) } catch (e) { return null } }).filter((x) => x && x.aabSha256 && x.aabSha256 === aabSha256 && String(x.android) === String(android));
  return { before: same.length, failedBefore: same.filter((x) => x.pass !== true).length };
}
/* 每一輪都全過才算過（已知問題照清單放行）；rounds＝每一輪的結果陣列（純函式） */
const roundPass = (results) => results.length > 0 && results.every((r) => r.pass === true || (r.pass === null && !!r.known));
module.exports = { priorAttempts, roundPass, SCENARIOS, SAFE, PREFER, ONLY, BODY_TRIES, BODY, inSafe, inTop, bodyPoint, padPresses, knownFor, covered, chooseMoves, settled, toDevice, moved, webViewBounds };
if (require.main !== module) return;

/* ---- 實機流程 ---- */
const { connect } = require("./cdp.js");
const { checkDevice } = require("./device-guard.js");
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d };
const O = { build: arg("--build"), serial: arg("--serial", "emulator-5580"), port: Number(arg("--port", 9291)), out: path.resolve(arg("--out", "p0-3d")),
  only: arg("--only"), selfTest: process.argv.includes("--self-test"), allowReal: process.argv.includes("--allow-real-device"),
  rounds: Number(arg("--rounds", 2)),
  aabApk: arg("--aab-apk"), known: arg("--known", [path.join(__dirname, "..", "..", "..", ".github", "p0-known.json"), path.join(__dirname, "..", "..", "xiangqi-lab", "site", ".github", "p0-known.json")].find((f) => fs.existsSync(f)) || "") };   /* 公開倉庫：source/ 的上一層；開發者電腦：xiangqi-lab/site */
/* 已知問題清單：讀不到就當沒有（不放行任何已知問題）。報告記下清單路徑與 SHA-256；不是倉庫 .github 那一份時印 ⚠（PR #42 審查①：--known 可指到任何檔，等於繞過逐行審） */
const REPO_KNOWN = path.join(__dirname, "..", "..", "..", ".github", "p0-known.json");
const KNOWN_RAW = (() => { try { return fs.readFileSync(O.known) } catch (e) { return null } })();
const KNOWN = (() => { try { const j = JSON.parse(String(KNOWN_RAW)); return Array.isArray(j.items) ? j.items : [] } catch (e) { return [] } })();
const KNOWN_FROM_REPO = !!O.known && fs.existsSync(REPO_KNOWN) && path.resolve(O.known) === path.resolve(REPO_KNOWN);
/* PR #58 審查：倉庫那份也要跟 origin/main 逐位元組一樣，本機改過、沒開 PR 的不算數（結束代碼 2） */
if (KNOWN_FROM_REPO) { const pin = require("./repo-pin.js").sameAsMain(REPO_KNOWN); if (!pin.ok) { console.error("測試不成立：" + pin.msg); process.exit(2) } }
if (!O.build) { console.error("用法：node scripts/check-3d.js --build <版號> [--serial emulator-5580] [--port 9291] [--out p0-3d] [--only <情境>] [--rounds 2] [--self-test]"); process.exit(2) }
if (!Number.isInteger(O.rounds) || O.rounds < 1 || O.rounds > 9) { console.error("✘ --rounds 要是 1～9 的整數：" + arg("--rounds")); process.exit(2) }
const PKG = "com.raysonchen.xiangqiqianqiu", ADB = process.env.ADB || "adb";
/* PR #58 審查：環境不成立或例外結束也要寫進嘗試紀錄（CUR＝目前知道的 AAB 與 Android 版本） */
let CUR = { aabSha256: null, android: null };
const logAttempt = (o) => { try { fs.mkdirSync(O.out, { recursive: true }); fs.appendFileSync(path.join(O.out, "attempts.jsonl"), JSON.stringify({ at: new Date().toISOString(), aabSha256: CUR.aabSha256 || null, android: CUR.android || null, build: O.build, ...o }) + "\n") } catch (e) { } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const adb = (...a) => cp.execFileSync(ADB, ["-s", O.serial, ...a], { encoding: "utf8", timeout: 120000, maxBuffer: 30e6 }).trim();
const shot = (name) => { try { fs.writeFileSync(path.join(O.out, name + ".png"), cp.execFileSync(ADB, ["-s", O.serial, "exec-out", "screencap", "-p"], { maxBuffer: 30e6 })) } catch (e) { } };
class Unfit extends Error { }   /* 環境不成立（結束碼 2） */
/* 模擬器當掉、adb 斷線：是測試環境的問題，不是 App 沒過，一律當「測試不成立」 */
const OFFLINE = /device offline|device '?[^ ]*'? not found|no devices.emulators found|device unauthorized/i;
function online() { try { return cp.execFileSync(ADB, ["-s", O.serial, "get-state"], { encoding: "utf8", timeout: 15000 }).trim() === "device" } catch (e) { return false } }

async function ready() {
  adb("shell", "am", "force-stop", PKG); await sleep(800);
  adb("shell", "am", "start", "-n", PKG + "/.MainActivity");
  let last = "";
  for (let i = 0; i < 60; i++) {
    let c;
    try {
      const pid = adb("shell", "pidof", PKG).split(" ")[0]; if (!pid) throw Error("App 沒在跑");
      adb("forward", "tcp:" + O.port, "localabstract:webview_devtools_remote_" + pid);
      c = await connect(O.port);
      const b = await c.ev(`typeof XQ_BUILD==="string"&&typeof store!=="undefined"?XQ_BUILD:""`);
      if (b && b !== O.build) throw new Unfit("App 版號是 " + b + "，不是要驗的 " + O.build);
      if (b) {
        const ok = await c.ev(`(()=>{localStorage.setItem('xq_netRoot',JSON.stringify('xq_test'));
          if(!["xqlab-test-local/v1","xqlab-test-xq_test/v1"].includes(XQNet.root())){location.reload();return false}
          if(typeof titleClose==="function")titleClose();document.querySelector('#tCont')?.click();for(const m of document.querySelectorAll('.modal'))m.remove();
          document.querySelector('#preov .pre-skip:not([hidden])')?.click();
          store.set('focusBoard',false);store.set('park3d',true);store.set('parkView','topfit');store.set('autoFlip',true);if(typeof applyEra==="function"){store.set('era','classic');applyEra()}
          return true})()`);
        if (ok) { await sleep(800); return c }
      }
    } catch (e) { if (e instanceof Unfit) { c?.close(); throw e } last = e.message }
    c?.close(); await sleep(1000);
  }
  throw new Unfit(O.build + " 的 WebView 一直沒就緒（" + last + "）");
}
function bounds() {
  for (let i = 0; i < 3; i++) {
    try { adb("shell", "uiautomator", "dump", "/sdcard/xq-3d-window.xml"); const b = webViewBounds(adb("shell", "cat", "/sdcard/xq-3d-window.xml")); if (b) return b } catch (e) { }
  }
  throw new Unfit("量不到 WebView 在螢幕上的位置");
}
/* 開局：一律用 App 自己的函式，不走 UI */
const START = {
  cpu: `(async()=>{await api('/play/new',{human:'r',level:1,ranked:false});const h='#/cpu',same=location.hash===h;location.hash=h;if(same)route();return true})()`,
  inn: `new Promise(ok=>{const id='inn:'+INN[0].id;jStart(id,{human:'r',lx:1,journey:id},()=>{const same=location.hash==='#/journey/play';location.hash='#/journey/play';if(same)route();ok(true)},true)})`,
  pvp: `(async()=>{store.set('pvpSeat',null);await api('/pvp/new',{red:'QA red',black:'QA black'});const same=location.hash==='#/pvp';location.hash='#/pvp';if(same)route();return true})()`,
  simul: `(async()=>{await api('/simul/new',{n:3,lx:1});const same=location.hash==='#/simul';location.hash='#/simul';if(same)route();return true})()`,
  bhx: `(()=>{store.set('parkView','');jStart(BHX_ID,{human:'r',lx:1,journey:BHX_ID,lv:{fen:BHX_FEN,turn:'r',noPerpetual:true}},()=>{location.hash='#/journey/play'},true);return true})()`,
  siege: `(()=>{gsvStart(31,'classic',false,[],true,false,1);return true})()`,
};
const READY = {
  base: `!!(typeof PARK!=="undefined"&&PARK&&PARK.last&&PARK.v.el.isConnected&&PARK.v.el.getBoundingClientRect().width>0&&!pkGateEat()&&!document.querySelector('#pgate:not(.out),#preov:not(.out),.scrim.show'))`,
  bhx: `typeof BHFX_XUID!=="undefined"&&PARK.last.ex&&PARK.last.ex.allStars&&!bhfxXuBusy()`,
  siege: `typeof GSV_ST!=="undefined"&&GSV_ST&&GSV_ST.journey==="bh:gs31"`,
};
const STATE = { cpu: "/play/state", inn: "/play/state", pvp: "/pvp/state", simul: "/simul/state", bhx: "/play/state", siege: "/play/state" };

/* 一步：挑候選 → 真實觸控選子 → 量落點 → 真實觸控落點 → 看棋譜 */
async function step(c, kind, tb, off, name, R, inject, usePad) {
  const st = `(async()=>{const raw=await api(${JSON.stringify(STATE[kind])}),s=${tb != null ? `raw.tb[${tb}]` : "raw"};return {id:s.id,turn:s.turn,board:s.board,legal:s.legal,n:s.moves.length}})()`;
  const S = await c.ev(st);
  /* 切視角後鏡頭會飛一段：先拿兩個參考格等它整體停穩，再量候選（不然量到的是飛行途中的位置） */
  const ref = [S.legal[0][0], S.legal[S.legal.length - 1][1]], rs = [];
  for (let i = 0; i < 40 && !settled(rs); i++) { await sleep(250); rs.push(await c.ev(`({f:PARK.v.screenOf(${ref[0]}),t:PARK.v.screenOf(${ref[1]})})`)) }
  const pts = await c.ev(`(()=>{const o={};for(const [f,t] of ${JSON.stringify(S.legal)}){for(const q of [f,t])if(!(q in o)){const p=PARK.v.screenOf(q);if(p)o[q]={x:p.x,y:p.y}}}return {o,w:innerWidth,h:innerHeight,dpr:devicePixelRatio}})()`);
  /* 落點有沒有被蓋住：所有合法落點在畫面內的都量一次（用十字鍵落子的黑洞背面不必）；
     殘局題（ONLY，例如黑洞第一戰）App 只接受正解，只量正解的落點——其他格子在這一關本來就不能走 */
  const scanMoves = ONLY[kind] ? S.legal.filter(([f, t]) => (PREFER[kind] || []).some(([a, b]) => a === f && b === t)) : S.legal;
  if (!usePad) {
    const hits = await c.ev(`(()=>{const out=[],seen=new Set(),w=innerWidth,h=innerHeight;for(const [f,t] of ${JSON.stringify(scanMoves)}){if(seen.has(t))continue;seen.add(t);const p=PARK.v.screenOf(t);if(!p)continue;const inView=p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h;const e=inView?document.elementFromPoint(p.x,p.y):null;out.push({t,x:Math.round(p.x),y:Math.round(p.y),inView,tag:e?e.tagName:"",by:e?(e.id||String(e.className||"")||e.tagName):""})}return out})()`);
    const bad = covered(hits);
    R.coverChecked = hits.filter((h) => h.inView).length;
    if (bad.length) R.covered = bad;
  }
  /* 用十字鍵時落點不必在安全區（不用手指點），只要起點點得到 */
  const cand = chooseMoves(S.legal, S.board, usePad ? Object.fromEntries(Object.entries(pts.o).map(([k, v]) => [k, S.legal.some(([f]) => f === +k) ? v : { x: pts.w / 2, y: pts.h / 2 }])) : pts.o, pts.w, pts.h, MAX_START_TRIES, PREFER[kind] || [], !!ONLY[kind], kind === "pvp");
  if (!cand.length) throw Error("畫面安全區裡沒有能走的著法");
  R.misses = [];
  for (const mv of cand) {
    /* 鏡頭停穩才點（A12 鏡頭還在動時點下去會偏 35 像素） */
    const smp = [];
    for (let i = 0; i < 40 && !settled(smp); i++) { await sleep(250); smp.push(await c.ev(`({f:PARK.v.screenOf(${mv[0]}),h:PARK.v.headOf?PARK.v.headOf(${mv[0]}):null,t:PARK.v.screenOf(${mv[1]})})`)) }
    if (!settled(smp)) throw Error("鏡頭 10 秒內沒停穩");
    let t = smp[smp.length - 1].t;
    if (!inSafe(smp[smp.length - 1].f, pts.w, pts.h) || (!usePad && !inSafe(t, pts.w, pts.h))) { R.misses.push({ move: mv, why: "鏡頭停穩後起點或落點跑出安全區" }); continue }
    let sel = false, a = null;
    R.startTries = [];
    for (const k of BODY_TRIES) {
      /* 每試一下都重量（第一下點擊可能讓鏡頭跳出開場運鏡） */
      const q = await c.ev(`({f:PARK.v.screenOf(${mv[0]}),h:PARK.v.headOf?PARK.v.headOf(${mv[0]}):null})`);
      a = toDevice(bodyPoint(q.f, q.h, k), pts.dpr, off);
      adb("shell", "input", "tap", String(a.x), String(a.y));
      for (let i = 0; i < 6 && !sel; i++) { await sleep(150); sel = await c.ev(`PARK.last.o.sel===${mv[0]}`) }
      R.startTries.push({ k, tap: a, sel });
      if (sel) break;
      const other = await c.ev(`PARK.last.o.sel`);
      if (other >= 0) { await c.ev(`cgPlay.tap(${other})`); await sleep(300) }   /* 選到別顆就取消，再試下一個高度 */
    }
    if (!sel) { R.misses.push({ move: mv, tap: a, why: "起點試了 " + BODY_TRIES.length + " 個高度都沒選中（被前排的子擋住）" }); continue }
    if (usePad) {
      const G = await c.ev(`(()=>{const P=document.querySelector('.gpad');if(!P||getComputedStyle(P).display==='none')return null;const r=b=>{if(!b)return null;const q=b.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2}};
        const bs=[...P.querySelectorAll('button')],f=l=>bs.find(b=>b.getAttribute('aria-label')===l);
        const r0=${mv[0]}/9|0,c0=${mv[0]}%9,c1=c0<8?c0+1:c0-1,a=PARK.v.screenOf(r0*9+c0),b=PARK.v.screenOf(r0*9+c1);
        return {up:r(f('往上（對方陣地）')),dn:r(f('往下（自己陣地）')),lf:r(f('往左')),rt:r(f('往右')),go:r(P.querySelector('.pad-go')),flip:PARK.last.o.flip===true,right:(b.x>a.x)===(c1>c0)?1:-1}})()`);
      if (!G || !G.go) throw Error("選子後沒出現十字鍵");
      const plan = padPresses(mv[0], mv[1], G.flip ? 1 : -1, G.right);
      R.pad = plan;
      for (const { key, n } of plan) for (let i = 0; i < n; i++) { const q = toDevice(G[key], pts.dpr, off); adb("shell", "input", "tap", String(q.x), String(q.y)); await sleep(300) }
      const st2 = await c.ev(`(()=>{const g=document.querySelector('.gpad .pad-go'),t=document.querySelector('.gpad .pad-tip');return {ok:!!g&&!g.disabled,tip:t?t.textContent:""}})()`);
      R.padTip = st2.tip;
      if (!st2.ok) throw Error("十字鍵移完，落子按不下去（" + st2.tip + "）");
      shot(name + "-before");
      const b = toDevice(G.go, pts.dpr, off);
      adb("shell", "input", "tap", String(b.x), String(b.y));
      let ok = false;
      for (let i = 0; i < 30 && !ok; i++) { await sleep(200); const m = await c.ev(`(async()=>{const s=await api('/play/state');return s.moves.map(x=>({f:x.f,t:x.t}))})()`); ok = moved(S.n, m, mv) }
      shot(name + "-after");
      Object.assign(R, { move: mv, startTap: a, goTap: b, turn: S.turn, pass: ok });
      if (!ok) R.error = "按落子後棋譜沒有多出這一步";
      return R;
    }
    /* 選子可能讓鏡頭換角度（黑洞開場鏡頭第一下點擊會跳到下棋視角）：落點重新等停穩、重新量 */
    const ts = [];
    for (let i = 0; i < 40 && !settled(ts); i++) { await sleep(250); const q = await c.ev(`PARK.v.screenOf(${mv[1]})`); ts.push({ f: q, t: q }) }
    if (!settled(ts)) throw Error("選子後鏡頭 10 秒內沒停穩");
    t = ts[ts.length - 1].t;
    if (!inSafe(t, pts.w, pts.h)) throw Error("選子後落點跑出安全區");
    if (inject) await c.ev(`(()=>{const d=document.createElement('div');d.id='xq3dInject';d.style.cssText='position:fixed;left:${t.x - 40}px;top:${t.y - 40}px;width:80px;height:80px;z-index:2147483647;background:rgba(0,0,0,0)';d.addEventListener('pointerdown',e=>e.stopPropagation(),true);document.body.append(d);return true})()`);
    const hit = await c.ev(`(()=>{const e=document.elementFromPoint(${t.x},${t.y});return {tag:e?.tagName||"",cls:String(e?.className||""),id:e?.id||""}})()`);
    shot(name + "-before");
    const b = toDevice(t, pts.dpr, off);
    adb("shell", "input", "tap", String(b.x), String(b.y));
    let ok = false;
    for (let i = 0; i < 30 && !ok; i++) { await sleep(200); const m = await c.ev(`(async()=>{const raw=await api(${JSON.stringify(STATE[kind])}),s=${tb != null ? `raw.tb[${tb}]` : "raw"};return s.moves.map(x=>({f:x.f,t:x.t}))})()`); ok = moved(S.n, m, mv) }
    if (inject) await c.ev(`document.getElementById('xq3dInject')?.remove()`);
    shot(name + "-after");
    Object.assign(R, { move: mv, startTap: a, targetTap: b, targetHit: hit, turn: S.turn, topBand: inTop(t, pts.w), pass: ok && !R.covered });
    if (ok && R.covered) R.error = "有 " + R.covered.length + " 個合法落點被蓋住：" + R.covered.map((x) => x.t + "（" + x.by + "）").join("、");
    if (!ok) R.error = "點了落點棋譜沒有多出這一步" + (hit.tag !== "CANVAS" ? "（落點被 " + (hit.id || hit.cls || hit.tag) + " 蓋住）" : "");
    return R;
  }
  const k = knownFor(KNOWN, name, "start-unselectable", O.build);
  if (k) { R.pass = null; R.known = k.id + "（期限 " + k.until + "）：" + R.misses.map((x) => x.move.join("→")).join("、") + " 的起點點不到"; return R }
  throw Error("候選的起點都選不到：" + R.misses.map((x) => x.move.join("→")).join("、"));
}

async function run(name, inject) {
  const R = { name, build: O.build }, kind = name.split("-")[0];
  let c;
  if (!online()) throw new Unfit(O.serial + " 不在線（模擬器當掉或 adb 斷線）");
  try {
    c = await ready(); const off = bounds(); R.webView = off;
    await c.ev(START[kind === "pvp" ? "pvp" : kind]);
    let ok = false;
    for (let i = 0; i < 80 && !ok; i++) { await sleep(300); ok = await c.ev(READY.base + (READY[kind] ? "&&" + READY[kind] : "")) }
    if (!ok) throw Error("3D 沒就緒：" + (await c.ev(`document.body.innerText.slice(-300)`)));
    if (kind === "bhx") { await c.ev(name === "bhx-back" ? `PARK.v.setView('under')` : `PARK.v.setView(BHX_CAM)`); await sleep(600) }
    if (kind === "siege") { await c.ev(`gsvSetView(${JSON.stringify(name === "siege-iso" ? "iso" : "top")})`); await sleep(600) }
    if (name === "pvp-black") {
      /* 先讓紅方走一步（也用真實觸控），等翻面後再驗黑方 */
      const r0 = {}; await step(c, "pvp", null, off, name + "-red", r0, false);
      if (!r0.pass) throw Error("翻面前紅方那一步就沒過：" + r0.error);
      for (let i = 0; i < 20; i++) { await sleep(250); if (await c.ev(`PARK.last.o.flip===true`)) break }
      R.flipped = await c.ev(`PARK.last.o.flip===true`);
      if (!R.flipped) throw Error("紅方走完沒有翻面（autoFlip）");
    }
    if (kind === "simul") {
      R.tables = [];
      for (let n = 0; n < 3; n++) { await c.ev(`document.querySelector('.sim-tb[data-i="${n}"]')?.click()`); await sleep(500); const r = {}; await step(c, "simul", n, off, name + "-" + n, r, inject); R.tables.push(r); if (!r.pass) break }
      R.pass = R.tables.length === 3 && R.tables.every((x) => x.pass);
    } else await step(c, kind === "pvp" ? "pvp" : kind, null, off, name, R, inject, name === "bhx-back");
  } catch (e) {
    if (e instanceof Unfit) throw e;
    if (OFFLINE.test(String(e.message)) || !online()) throw new Unfit(O.serial + " 在跑「" + name + "」時斷線（" + String(e.message).trim().split(/\r?\n/).pop().slice(0, 80) + "）");
    R.pass = false; R.error = R.error || e.message;
  }
  finally { c?.close() }
  return R;
}

(async () => {
  fs.mkdirSync(O.out, { recursive: true });
  if (!online()) throw new Unfit(O.serial + " 不在線：先開好模擬器（adb devices 要看得到）");
  const g = checkDevice((...a) => adb(...a), O.allowReal);
  if (!g.ok) throw new Unfit(g.message);
  if (g.message) console.log(g.message);
  /* 送審閘門 p0-gate.js（W69 第 3 項，PR #44 審查後）：--aab-sha 只會照抄雜湊，停用；改帶 aab-to-apk.js 的 aab-apk.json，
     從手機拉回實際安裝的 base.apk 算 SHA-256 比對，對上才把 AAB 雜湊寫進報告（apkBound） */
  if (process.argv.includes("--aab-sha")) throw new Unfit("--aab-sha 已停用（只會照抄雜湊、核對不到實際 APK）：改帶 --aab-apk <aab-to-apk.js 產生的 aab-apk.json>");
  let BIND = { aabSha256: null, apkSha256: null, apkBound: false };
  if (O.aabApk) {
    const AB = require("./apk-bind.js"), rb = AB.readBind(O.aabApk); if (!rb.ok) throw new Unfit(rb.msg);
    const ia = AB.installedApkSha((args) => cp.execFileSync(ADB, ["-s", O.serial, ...args], { encoding: "utf8", timeout: 300000, maxBuffer: 30e6 }), PKG, O.out);
    if (!ia.ok) throw new Unfit(ia.msg);
    const bd = AB.bind(rb.rec, ia.sha, "手機上實際安裝的 APK"); if (!bd.ok) throw new Unfit(bd.msg);
    BIND = bd.fields; CUR.aabSha256 = BIND.aabSha256; console.log(`✔ 手機上的 App 就是從送審 AAB（${BIND.aabSha256.slice(0, 12)}）產生的 APK`);
  } else console.log("⚠ 沒帶 --aab-apk：這份報告沒綁送審 AAB，p0-gate.js 不收");
  const S = { tool: "P0-3D", build: O.build, serial: O.serial, android: adb("shell", "getprop", "ro.build.version.release"),
    webview: (adb("shell", "dumpsys", "package", "com.google.android.webview").match(/versionName=(\S+)/) || [])[1] || "", at: new Date().toISOString(),
    ...BIND, known: KNOWN.map((x) => x.id + "≤" + x.until),
    knownFile: { path: O.known || "（沒有）", sha256: KNOWN_RAW ? require("crypto").createHash("sha256").update(KNOWN_RAW).digest("hex") : null, fromRepo: KNOWN_FROM_REPO },
    /* PR #42 審查②：只跑部分情境（--only）或自我反測不算完整，送審只認 full＝true */
    full: !O.only && !O.selfTest, results: [],
    /* 2026-11-23（AGENTS.md「P0 出口驗證要難作假」）：--self-test 就是 P0-3D 的金絲雀（落點蓋遮罩要被判失敗），送審閘門要收 Android 12、16 各一份；
       toolPins＝這支與共用模組的雜湊（tool-pin.js），閘門拿去跟 origin/main 比 */
    selfTest: !!O.selfTest, toolPins: require("./tool-pin.js").pinsFor("P0-3D") };
  CUR = S;
  if (KNOWN.length && !KNOWN_FROM_REPO) console.log("⚠ 已知問題清單不是倉庫 .github/p0-known.json（" + O.known + "）：這份沒經過逐行審，送審不能用");
  if (O.selfTest) {
    const a = await run("pvp-black", false), b = await run("pvp-black", true);
    S.results.push({ ...a, expect: "pass" }, { ...b, name: "pvp-black＋落點遮罩", expect: "fail" });
    S.pass = a.pass === true && b.pass === false;
    console.log((a.pass ? "✔" : "✘") + " 正常：同桌翻面後黑方" + (a.pass ? "通過" : "沒過（" + a.error + "）"));
    console.log((b.pass === false ? "✔" : "✘") + " 反測：落點蓋遮罩（重現 W02）" + (b.pass === false ? "被判失敗（" + b.error + "）" : "竟然通過，這支抓不到 W02"));
  } else {
    /* W69 流程盤點第 5 項：同一次執行連跑 O.rounds 輪，每輪都全過才算過；任一輪沒過就停（不再「重跑到過」） */
    S.rounds = O.rounds; S.roundsPassed = 0;
    for (let rd = 1; rd <= O.rounds; rd++) {
    if (O.rounds > 1) console.log(`── 第 ${rd}／${O.rounds} 輪`);
    const RR = [];
    for (const n of SCENARIOS.filter((x) => !O.only || new RegExp(O.only).test(x))) {
      const r = await run(n, false); r.round = rd; RR.push(r); S.results.push(r);
      console.log((r.pass ? "✔ " : r.known ? "⚠ " : "✘ ") + n.padEnd(10) + (r.pass ? "" : " " + (r.known || r.error)) + (r.misses && r.misses.length ? "　（先換過 " + r.misses.length + " 個選不到的起點）" : "") + (r.startTries && r.startTries.length > 1 ? "　（起點點了 " + r.startTries.length + " 下才選中）" : ""));
    }
    if (!roundPass(RR)) break;
    S.roundsPassed = rd;
    }
    S.pass = S.roundsPassed === O.rounds && roundPass(S.results);
  }
  /* 嘗試紀錄：先算之前的，再把這次追加進去（不論過不過） */
  const AF = path.join(O.out, "attempts.jsonl");
  const prevLines = (() => { try { return fs.readFileSync(AF, "utf8").split("\n").filter(Boolean) } catch (e) { return [] } })();
  const pa = priorAttempts(prevLines, S.aabSha256, S.android);
  S.attempt = pa.before + 1; S.failedBefore = pa.failedBefore;
  fs.appendFileSync(AF, JSON.stringify({ at: S.at, aabSha256: S.aabSha256, android: S.android, build: S.build, full: S.full, rounds: S.rounds || 0, roundsPassed: S.roundsPassed || 0, pass: !!S.pass }) + "\n");
  if (S.failedBefore) console.log(`⚠ 這個 AAB 在 Android ${S.android} 之前失敗過 ${S.failedBefore} 次（第 ${S.attempt} 次嘗試）：報告照實記下，送審閘門會列出`);
  fs.writeFileSync(path.join(O.out, "summary.json"), JSON.stringify(S, null, 2));
  console.log((S.pass ? "✔ 通過" : "✘ 沒過") + "：" + S.results.length + " 項" + (S.full ? "（九情境完整）" : "（只跑部分情境：送審不能用）") + "，報告 " + path.join(O.out, "summary.json"));
  process.exit(S.pass ? 0 : 1);
})().catch((e) => { logAttempt({ pass: false, unfit: e instanceof Unfit, error: String(e.message).slice(0, 200) }); console.error((e instanceof Unfit ? "測試不成立：" : "✘ ") + e.message); process.exit(e instanceof Unfit ? 2 : 1) });
