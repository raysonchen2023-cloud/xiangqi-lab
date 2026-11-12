// 👧 兒童模式＋防沉迷（評比第 4 輪 P20「嚴格把關臺灣家長」）的自動測試，不開瀏覽器、不連網路：
//   ① 資料零收集：兒童模式開著時 src/net.js 的 shareIRT 不排隊（XQ_ANON_OK＋07x4 的 XQ_SELFBANNED 兩道都擋）、fmKidPurge 丟掉排隊中的匿名資料和玩家登記、
//      05-settings.js reportPlayer 不送玩家登記、意見回饋（postForm 包一層）只送文字
//   ② 無陌生人互動：fmNetOff、fmKidGate（千秋盃、線上入座、殘篇閣、觀戰轉到大廳說明頁）、net.js 的配對、邀請、千秋盃報名被擋；07x4 大廳換成說明頁
//   ③ 防沉迷：兒童模式每次遊玩提醒（20／30／45／60 分鐘、10 分鐘後再提醒、休息 5 分鐘重算）、晚上提示、跨日重置、一般玩家 60 分鐘提醒（一段一次、可關）
//   ④ 不開外站：xqExtOpen、問小帥（天氣、維基百科不查）
//   ⑤ 文件與設定：family.md（兩邊同步）、privacy.md 連到它、XQDOC 有 family、第一次進大廳的安全須知
// 07m5-family.js 的「兒童模式核心」段（const FM_ON 到「兒童模式核心：以上」）用 vm 載入真正的程式；時間用假的 Date。
// 用法：node --test xiangqi-lab/tools/test-family.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const J = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
function cut(src, a, b, name, inclEnd) { const i = src.indexOf(a), j = src.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + name); return src.slice(i, inclEnd ? j + b.length : j) }
const MIN = 6e4;

const FAM = rd(path.join(DB, "m/07m5-family.js")), SAFE = rd(path.join(DB, "m/07x4-lobbysafe.js")), SAVE = rd(path.join(DB, "m/05b-save.js")), SET = rd(path.join(DB, "m/05-settings.js"));
const SHELL = rd(path.join(DB, "m/02-shell.js")), LEG = rd(path.join(DB, "m/07-legend.js"));
const CORE = cut(FAM, "const FM_ON=true;", "/* ---------- 兒童模式核心：以上 ---------- */", "07m5 兒童模式核心");
const LRN = cut(SAVE, "function lrnAnonType(", "window.XQ_ANON_OK=x=>!lrnAnonType(x)||lrnAnonOn();", "05b-save.js 的學習進度開關", true);
const LOCALDAY = cut(LEG, "function localDay(){", "\n", "07-legend.js 的 localDay");
const SELFBAN = cut(SAFE, "{const sb0=window.XQ_SELFBANNED;", "\n", "07x4 家長關大廳＝停權");
const POSTFORM = cut(FAM, 'if(typeof postForm==="function"){const f0=postForm;', "\n", "07m5 包 postForm");
const ASK = (() => { const i = FAM.indexOf("const FM_KID_ASK="); assert.ok(i >= 0, "找不到 07m5 問小帥只用 App 內容"); const j = FAM.indexOf("\n/* ", i); return FAM.slice(i, j > i ? j : FAM.length) })();
const EXT = cut(FAM, "const FM_EXT_FREE=", "\ndocument.addEventListener(", "07m5 xqExtOpen");
const REPORT = cut(SET, "async function reportPlayer(){", "\nsetTimeout(()=>{flushFeedback();reportPlayer()},8000);", "05-settings.js reportPlayer");

function memStorage() { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)) }, removeItem: k => { m.delete(k) }, map: m } }
/* 一支假手機：site/core.js＋src/net.js（真的）＋05b 學習進度開關＋07m5 兒童模式核心＋07x4 的停權包裝 */
function phone(start) {
  const T = { now: start || new Date(2026, 10, 11, 10, 0, 0).getTime() };
  const RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(T.now) } static now() { return T.now } }
  const ctx = { console, URL, URLSearchParams, Date: FD, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, clearInterval() { }, localStorage: memStorage(),
    location: { href: "http://localhost/", hash: "#/", pathname: "/", search: "", hostname: "localhost" }, history: { replaceState() { } }, navigator: { onLine: true },
    Event: class { constructor(t) { this.type = t } }, CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d && d.detail } },
    addEventListener() { }, removeEventListener() { }, dispatchEvent() { return true }, document: { hidden: false, addEventListener() { } }, atob: s => Buffer.from(s, "base64").toString("binary") };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(rd(path.join(LAB, "site/core.js")), ctx, { filename: "core.js" });
  vm.runInContext(rd(path.join(LAB, "src/net.js")), ctx, { filename: "net.js" });
  vm.runInContext('var store={get(k,d){const v=localStorage.getItem("m_"+k);if(v==null)return d;try{return JSON.parse(v)}catch(e){return d}},set(k,v){localStorage.setItem("m_"+k,JSON.stringify(v))}};\n' + LOCALDAY + "\n" + LRN, ctx, { filename: "05b-save.js（切出來的）" });
  vm.runInContext("window.XQ_SELFBANNED=()=>false;\n" + CORE, ctx, { filename: "07m5-family.js（兒童模式核心）" });
  const run = (code, f) => vm.runInContext(code, ctx, { filename: f || "test" });
  const P = { ctx, T, run, net: ctx.XQNet, ev: c => run(c),
    set: (k, v) => run(`store.set(${JSON.stringify(k)},${JSON.stringify(v)})`), get: (k, d) => J(run(`store.get(${JSON.stringify(k)},${JSON.stringify(d === undefined ? null : d)})`)),
    cfg: o => P.set("fmCfg", Object.assign({}, P.get("fmCfg", {}) || {}, o)),
    q: () => J(JSON.parse(ctx.localStorage.getItem("xq_irtQ") || "[]")).map(x => x.t || "quiz"),
    at: (y, mo, d, h, mi) => { T.now = new Date(y, mo - 1, d, h, mi || 0, 0).getTime() },
    /* 每 15 秒一次 fmSesAdd（像 fmTick），連續 m 分鐘 */
    play: m => { for (let i = 0; i < m * 4; i++) { T.now += 15e3; run(`fmSesAdd(15e3,${T.now})`) } },
    due: () => run("fmSesDue()") };
  return P;
}
const kidOn = (P, o) => P.cfg(Object.assign({ kid: true }, o || {}));

/* ---------- ① 資料零收集 ---------- */
test("設定：fmCfg 預設兒童模式關、每次 30 分鐘、晚上 21:30；fmNetOff 兒童模式時回 true", () => {
  const P = phone();
  assert.deepEqual(J(P.run("fmCfg()")), { eye: true, lim: 0, late: "", net: true, kid: false, ses: 30, night: "21:30" });
  assert.equal(P.run("fmNetOff()"), false); assert.equal(P.run("fmKid()"), false);
  kidOn(P); assert.equal(P.run("fmKid()"), true); assert.equal(P.run("fmNetOff()"), true, "兒童模式＝大廳關（沿用 fmNetOff 路徑）");
  P.cfg({ ses: 7, night: "" }); assert.equal(P.run("fmCfg().ses"), 30, "不在 20／30／45／60 的值回預設"); assert.equal(P.run("fmCfg().night"), "", "\"\"＝不提醒");
  P.cfg({ ses: 45, night: "22:00" }); assert.equal(P.run("fmCfg().ses"), 45); assert.equal(P.run("fmCfg().night"), "22:00");
  P.cfg({ kid: false, net: false }); assert.equal(P.run("fmNetOff()"), true, "只關大廳也照舊");
});
test("shareIRT：兒童模式開著時，卡關、對局評分、學習進度都不排隊（XQ_ANON_OK 這一道就擋得住）", () => {
  const P = phone();
  P.net.shareIRT({ t: "stk", sid: "a" }); P.net.shareIRT({ t: "cpu", aid: "b" }); P.net.shareIRT({ t: "tal", v: 2 });
  assert.deepEqual(P.q(), ["stk", "cpu", "tal"], "平常照常排隊");
  P.ctx.localStorage.removeItem("xq_irtQ"); kidOn(P);
  assert.equal(P.ctx.XQ_SELFBANNED(), false, "這裡還沒接 07x4，只靠 XQ_ANON_OK");
  for (const x of [{ t: "stk", sid: "a" }, { t: "cpu", aid: "b" }, { t: "tal", v: 2 }, { t: "fun", v: 1 }, { t: "cj", v: 2 }, { t: "rd", v: 2 }, { v: 1, r: [] }]) P.net.shareIRT(x);
  assert.deepEqual(P.q(), [], "一筆都沒排進去");
  assert.equal(P.ctx.XQ_ANON_OK({ t: "stk" }), false); assert.equal(P.ctx.XQ_ANON_OK({ t: "cpu" }), false);
});
test("shareIRT：接上 07x4 的包裝後，兒童模式＝XQ_SELFBANNED，net.js 照停權處理（第二道）", () => {
  const P = phone(); P.run(SELFBAN, "07x4（切出來的）");
  assert.equal(P.ctx.XQ_SELFBANNED(), false); kidOn(P); assert.equal(P.ctx.XQ_SELFBANNED(), true);
  P.run("window.XQ_ANON_OK=()=>true");   /* 就算第一道失效 */
  P.net.shareIRT({ t: "stk", sid: "a" }); assert.deepEqual(P.q(), [], "停權判斷也擋住");
});
test("fmKidPurge：丟掉排隊中的匿名資料和玩家登記，意見回饋拿掉 ID／名字／段位／聯絡方式／截圖／頁面，檢舉和刪除請求原樣", () => {
  const P = phone();
  P.net.shareIRT({ t: "stk", sid: "a" }); P.net.shareIRT({ t: "cpu", aid: "b" }); P.net.shareIRT({ t: "fun", v: 1 }); assert.equal(P.q().length, 3);
  const fb = { type: "🐞 錯誤", text: "棋子不見了", id: "dev1", name: "小明", rank: "九級", contact: "LINE abc", img: "data:image/jpeg;base64,xx", page: "#/cpu", ver: "v1", dev: "手機" };
  const rep = { type: "🚩 檢舉", text: "[R-1111-AAAA] 🚩 檢舉線上玩家", id: "dev1", name: "小明", contact: "", rid: "R-1111-AAAA" };
  const del = { type: "🗑 刪除請求", text: "[D-1111-BBBB]", id: "dev1", name: "", rid: "D-1111-BBBB" };
  P.set("fbQueue", [{ type: "👤 玩家", text: "總共用了 1 小時", id: "dev1", name: "小明" }, fb, rep, del, { type: "👤 玩家", id: "dev1" }]);
  kidOn(P); const n = P.run("fmKidPurge()");
  assert.equal(n, 2, "丟掉兩筆玩家登記"); assert.deepEqual(P.q(), [], "排隊中的匿名資料全丟");
  const Q = P.get("fbQueue", []);
  assert.deepEqual(Q.map(r => r.type), ["🐞 錯誤", "🚩 檢舉", "🗑 刪除請求"]);
  assert.deepEqual(Q[0], Object.assign({}, fb, { id: "", name: "", rank: "", contact: "", img: "", page: "" }), "意見回饋只留文字、類型、版本、裝置類型");
  assert.deepEqual(Q[1], rep); assert.deepEqual(Q[2], del);
});
test("玩家登記：reportPlayer 平常會送，兒童模式（或家長關大廳）完全不送", async () => {
  const P = phone(); P.ctx.location.hostname = "raysonchen2023-cloud.github.io";
  P.run('var OFF=true,FEEDBACK_FORM={action:"https://example.invalid/form"},SENT=[];async function feedbackInfo(){return{id:"dev1",name:"小明",rank:"九級 1000分",ver:"v",dev:"手機",page:"#/cpu",role:"玩家"}}function meInfo(){return{id:"dev1"}}async function sendRecord(r){SENT.push(r);return true}function useSummary(){return"總共用了 1 小時"}\n' + REPORT, "05-settings.js reportPlayer（切出來的）");
  await P.run("reportPlayer()"); assert.equal(P.run("SENT.length"), 1, "平常照送"); assert.equal(P.run("SENT[0].page"), "", "本來就不送頁面");
  P.set("playerRep", null); P.run("SENT.length=0"); kidOn(P);
  await P.run("reportPlayer()"); assert.equal(P.run("SENT.length"), 0, "兒童模式不送");
  P.cfg({ kid: false, net: false }); await P.run("reportPlayer()"); assert.equal(P.run("SENT.length"), 0, "家長關大廳也不送");
});
test("意見回饋：兒童模式時 postForm 只送文字；玩家登記直接吞掉不送；檢舉照送", async () => {
  const P = phone();
  P.run("var SENTF=[];var postForm=async function(rec){SENTF.push(rec)};\n" + POSTFORM, "07m5 postForm 包裝");
  const fb = { type: "💡 建議", text: "想要更多殘局", id: "dev1", name: "小明", rank: "九級", contact: "0912", img: "data:x", page: "#/canju", ver: "v1", dev: "手機" };
  P.ctx.__fb = fb; await P.run("postForm(__fb)"); assert.deepEqual(J(P.run("SENTF[0]")), fb, "平常原樣");
  kidOn(P); P.run("SENTF.length=0");
  await P.run("postForm(__fb)"); await P.run('postForm({type:"👤 玩家",id:"dev1",name:"小明"})'); await P.run('postForm({type:"🚩 檢舉",text:"x",id:"dev1",rid:"R-1111-AAAA"})');
  const S = J(P.run("SENTF"));
  assert.equal(S.length, 2, "玩家登記沒送");
  assert.deepEqual(S[0], Object.assign({}, fb, { id: "", name: "", rank: "", contact: "", img: "", page: "" }));
  assert.equal(S[1].type, "🚩 檢舉"); assert.equal(S[1].id, "dev1");
  assert.match(FAM, /body\.fm-kid \.fbw>div:has\(\.fba\),body\.fm-kid \.fbw>div:has\(>#fc\)\{display:none!important\}/, "表單上的截圖／檔案、聯絡方式藏起來");
});

/* ---------- ② 無陌生人互動 ---------- */
test("fmKidGate：兒童模式時千秋盃、線上入座、殘篇閣、觀戰轉到大廳說明頁；同桌對弈、殘局、挑戰電腦照常", () => {
  const P = phone(), G = h => P.run(`fmKidGate(${JSON.stringify(h)})`);
  for (const h of ["#/cup", "#/join/r", "#/coop/lobby", "#/watch", "#/pvp"]) assert.equal(G(h), null, "平常不擋 " + h);
  kidOn(P);
  for (const h of ["#/cup", "#/join/r", "#/coop/lobby", "#/watch", "#/watch/abc"]) assert.equal(G(h), "#/lobby", h);
  for (const h of ["#/", "#/pvp", "#/coop", "#/coop/d/1", "#/canju", "#/cpu", "#/settings", "#/watch/ai", "#/lobby"]) assert.equal(G(h), null, "不擋 " + h);
  assert.match(SHELL, /function route\(\)\{\n\s*try\{if\(typeof fmRouteGate==="function"&&fmRouteGate\(\)\)return\}/, "02-shell.js route() 一開始就問 fmRouteGate");
  assert.ok(/function fmRouteGate\(\)\{try\{if\(!FM_ON\)return false;const kg=fmKidGate\(\);if\(kg\)\{[^}]*navReplace\(kg\);return true\}/.test(FAM), "fmRouteGate 先看兒童模式");
});
test("net.js：兒童模式（接上 07x4）時不能配對、邀請、報名千秋盃", () => {
  const P = phone(); P.run(SELFBAN, "07x4（切出來的）"); kidOn(P);
  P.net.seek(true); assert.equal(P.net.seeking(), false, "配對被關掉");
  assert.equal(P.net.invite({ id: "someone", name: "陌生人" }), null, "邀請送不出去");
  assert.equal(P.net.cupReq("reg"), false, "千秋盃報名送不出去");
});
test("〔原始碼〕07x4：大廳在 fmNetOff 時換成說明頁，兒童模式有自己的說明（同桌對弈按鈕）；第一次進大廳跳安全須知、設定可重看", () => {
  assert.match(SAFE, /Lobby=function\(v\)\{try\{if\(typeof fmNetOff==="function"&&fmNetOff\(\)\)return lbsParentOffPage\(v\)\}/);
  assert.ok(/if\(typeof fmKid==="function"&&fmKid\(\)\)\{[\s\S]{0,600}兒童模式：線上大廳關著[\s\S]{0,1500}id="lbpPvp"/.test(SAFE), "兒童模式說明頁有同桌對弈按鈕");
  const intro = cut(SAFE, "function lbsIntro(again){", "\nif(typeof Lobby===", "lbsIntro");
  for (const w of ["只能用快捷語", "不要給個資", "🚩 檢舉", "🚫 封鎖", "家長可以關掉大廳", "兒童模式"]) assert.ok(intro.includes(w), "安全須知要講：" + w);
  assert.match(SAFE, /if\(!store\.get\("lbIntro",0\)&&!window\.XQ_SELFBANNED\(\)\)setTimeout/, "第一次進大廳（沒被關掉）才自動跳");
  assert.match(SAFE, /id="lbsIn"[\s\S]*lbsIntro\(true\)/, "設定「🛡 線上大廳」可以重看");
  assert.match(FAM, /id="fmLbI"[\s\S]*lbsIntro\(true\)/, "「👪 家長與護眼」也可以重看");
});

/* ---------- ③ 防沉迷 ---------- */
test("兒童模式每次遊玩提醒：20 分鐘到了才提醒；按了 10 分鐘後再提醒；家長可設 20／30／45／60", () => {
  const P = phone(); kidOn(P, { ses: 20 });
  P.play(19); assert.equal(P.due(), null, "19 分鐘還沒到");
  P.play(1); assert.equal(P.due(), "kid", "20 分鐘到");
  P.run("fmSesDone('kid')"); assert.equal(P.due(), null, "按了以後先不吵");
  P.play(9); assert.equal(P.due(), null); P.play(1); assert.equal(P.due(), "kid", "10 分鐘後再提醒");
  for (const m of [30, 45, 60]) { const Q = phone(); kidOn(Q, { ses: m }); Q.play(m - 1); assert.equal(Q.due(), null, m + " 分鐘前"); Q.play(1); assert.equal(Q.due(), "kid", m + " 分鐘") }
});
test("每次遊玩：切到背景或停著不動 5 分鐘＝休息過，重新算；不到 5 分鐘接著算", () => {
  const P = phone(); kidOn(P, { ses: 20 });
  P.play(15); P.T.now += 4 * MIN + 30e3; P.play(5); assert.equal(P.due(), "kid", "停 4 分半（下一次記錄離上次不到 5 分鐘）不算休息");
  const Q = phone(); kidOn(Q, { ses: 20 });
  Q.play(19); Q.T.now += 5 * MIN; assert.equal(Q.due(), null, "停 5 分鐘＝重新算");
  Q.play(1); assert.equal(Q.run("fmSesGet().acc"), MIN, "從 0 開始累積");
  Q.play(18); assert.equal(Q.due(), null); Q.play(1); assert.equal(Q.due(), "kid");
});
test("跨日重置：每次遊玩、家長加的時間、每天上限、晚上提示都按日期重新算", () => {
  const P = phone(); P.at(2026, 11, 11, 23, 41); kidOn(P, { ses: 20, lim: 30 });
  P.play(18); assert.equal(P.due(), null);
  P.play(2); assert.equal(P.run("fmSesGet().d"), "2026-11-12", "過了半夜換新的一天"); assert.equal(P.due(), null, "跨日重新算");
  assert.ok(P.run("fmSesGet().acc") <= 2 * MIN);
  P.set("fmX", { d: "2026-11-11", add: 30 }); assert.equal(P.run("fmX().add"), 0, "家長昨天加的時間今天歸零");
  P.set("useDay", { "2026-11-11": 31 * MIN }); assert.equal(P.run("fmLock()"), null, "昨天玩超過，今天不鎖");
  P.set("useDay", { "2026-11-12": 31 * MIN }); assert.equal(P.run("fmLock()"), "lim", "今天玩超過 30 分鐘就鎖（只能看不能開新局）");
});
test("兒童模式晚上提示：21:30 以後到早上 6 點每晚一次，不擋；隔天晚上再提醒；可以設不提醒", () => {
  const P = phone(); kidOn(P);
  P.at(2026, 11, 11, 21, 29); assert.equal(P.run("fmNtDue()"), false);
  P.at(2026, 11, 11, 21, 30); assert.equal(P.run("fmNtDue()"), true);
  P.run("fmNtDone()"); assert.equal(P.run("fmNtDue()"), false, "今晚提醒過了");
  P.at(2026, 11, 12, 1, 0); assert.equal(P.run("fmNtDue()"), false, "半夜 1 點還是同一晚");
  P.at(2026, 11, 12, 6, 0); assert.equal(P.run("fmNtDue()"), false, "早上 6 點以後不提醒");
  P.at(2026, 11, 12, 21, 31); assert.equal(P.run("fmNtDue()"), true, "隔天晚上再提醒");
  assert.equal(P.run("fmLock()"), null, "晚上提示不擋（要擋用 late）");
  P.cfg({ night: "" }); assert.equal(P.run("fmNtDue()"), false, "不提醒");
  P.cfg({ kid: false, night: "21:30" }); assert.equal(P.run("fmNtDue()"), false, "一般玩家沒有晚上提示");
});
test("一般玩家：連續 60 分鐘提醒一次（同一段只一次），休息過再算；可以關掉", () => {
  const P = phone();
  P.play(59); assert.equal(P.due(), null); P.play(1); assert.equal(P.due(), "gen");
  P.run("fmSesDone('gen')"); P.play(90); assert.equal(P.due(), null, "同一段只提醒一次");
  P.T.now += 6 * MIN; P.play(60); assert.equal(P.due(), "gen", "休息過、又玩 60 分鐘再提醒");
  P.set("fmGenOff", true); assert.equal(P.due(), null, "關掉就不提醒");
  P.set("fmGenOff", false); assert.equal(P.due(), "gen");
  kidOn(P, { ses: 60 }); assert.equal(P.due(), "kid", "兒童模式改用家長設的時間");
});
test("〔原始碼〕提醒排程：fmTick 有操作才累積；fmTry 先等 fmSafe（下完這盤、換頁）才跳，順序＝時間到＞晚上＞每次遊玩＞護眼", () => {
  assert.match(FAM, /if\(now-FM_E\.act<FM_IDLE\)\{FM_E\.acc\+=dt;fmSesAdd\(dt,now\)\}/);
  assert.match(FAM, /const nt=fmNtDue\(\),sd=nt\?null:fmSesDue\(\);if\(!nt&&!sd&&!eye\)return;if\(!fmSafe\(\)\)return;\n\s*if\(nt\)\{fmNtCard\(\);return\}if\(sd\)\{fmSesCard\(sd\);return\}fmEye\(\)\}/);
  assert.ok(/function fmSafe\(\)\{[\s\S]{0,600}return!fmBusy\(\)\}/.test(FAM), "對局、解題中間不跳");
  assert.match(FAM, /<h2>\$\{kid\?"🍵 休息一下吧"/, "兒童模式的提示是「休息一下吧」");
});

/* ---------- ④ 不開外站 ---------- */
test("外站：兒童模式時 xqExtOpen 不開、不出家長題；問小帥不查天氣和維基百科，時間、計算、背詩照常", async () => {
  const P = phone();
  P.run("var OPENED=[],GATED=0,TOASTS=[];function toast(t){TOASTS.push(t)}function fmGate(w,ok){GATED++}window.open=u=>{OPENED.push(u);return{}};\n" + EXT, "07m5 xqExtOpen");
  P.run('xqExtOpen("https://www.google.com/")'); assert.equal(P.run("GATED"), 1, "平常要家長答題");
  kidOn(P); P.run('xqExtOpen("https://gemini.google.com/app")');
  assert.equal(P.run("GATED"), 1, "兒童模式連題目都不出"); assert.equal(P.run("OPENED.length"), 0); assert.match(P.run("TOASTS[0]"), /兒童模式不打開/);
  P.run('var CALLS=[];async function worldAsk(k,q){CALLS.push(k);return{title:"net",text:k}}async function chessWiki(q){CALLS.push("cw");return{title:"wiki"}}function worldPoem(q){return/靜夜思/.test(q)?{title:"〈靜夜思〉李白",text:"床前明月光"}:null}\n' + ASK, "07m5 問小帥");
  const A = async (k, q) => J(await P.run(`worldAsk(${JSON.stringify(k)},${JSON.stringify(q)})`));
  assert.equal((await A("wx", "台北天氣")).title, "這題要上網查"); assert.equal((await A("wiki", "黑洞是什麼")).title, "這題要上網查");
  assert.equal((await A("poem", "靜夜思")).title, "〈靜夜思〉李白", "背詩用 App 內的詩"); assert.equal((await A("poem", "某首沒收的詩")).title, "這題要上網查");
  assert.equal((await A("time", "現在幾點")).text, "time"); assert.equal((await A("calc", "35×12")).text, "calc");
  assert.equal(await P.run('chessWiki("屏風馬")'), null);
  assert.deepEqual(J(P.run("CALLS")), ["time", "calc"], "天氣、維基百科一次都沒呼叫");
  P.cfg({ kid: false }); assert.equal((await A("wx", "台北天氣")).title, "net", "關掉兒童模式照舊");
  assert.match(FAM, /body\.fm-kid #aiB\{display:none!important\}/, "Google／Gemini 按鈕藏起來");
  assert.match(FAM, /body\.fm-kid a\[href\^="http:\/\/"\],body\.fm-kid a\[href\^="https:\/\/"\]\{pointer-events:none/, "外站連結變純文字");
});

/* ---------- ⑤ 文件與設定 ---------- */
test("〔原始碼〕文件：family.md 兩邊一樣、逐項列資料零收集；privacy.md 連到它；XQDOC 有 family", () => {
  const A = rd(path.join(DB, "art/docs/family.md")), B = rd(path.join(LAB, "site/data/docs/family.md"));
  assert.equal(A, B, "art/docs 和 site/data/docs 要同步");
  for (const w of ["## 兒童模式做了什麼", "### 1. 資料零收集", "完全不離開手機", "匿名卡關訊號", "匿名對局評分", "匿名學習進度", "玩家登記", "### 2. 不跟陌生人互動", "同桌對弈照常", "## 防沉迷規則", "20／30／45／60", "## 家長怎麼設定"]) assert.ok(A.includes(w), "family.md 要有：" + w);
  const PA = rd(path.join(DB, "art/docs/privacy.md")), PB = rd(path.join(LAB, "site/data/docs/privacy.md"));
  assert.equal(PA, PB, "privacy.md 兩邊同步"); assert.match(PA, /## 兒童模式（資料零收集）[\s\S]*family\.md/);
  assert.match(SET, /const XQDOC=\{privacy:\["privacy","🔒 隱私與資料使用"\],family:\["family","👨‍👩‍👧 家長與兒童模式"\],/);
  assert.match(FAM, /data-xqdoc="family"/, "家長卡片上有說明按鈕");
});
test("〔原始碼〕兒童模式開關要過家長確認題（fmGate）；fmEdit 存檔不會把兒童模式蓋掉", () => {
  assert.ok(/card\.querySelector\("#fmKidB"\)\.onclick=\(\)=>\{vibrate\(5\);fmGate\([\s\S]{0,120}?,\(\)=>fmKidEdit\(card\)\)\}/.test(FAM), "兒童模式按鈕先過 fmGate");
  assert.match(FAM, /store\.set\("fmCfg",Object\.assign\(\{\},store\.get\("fmCfg",null\)\|\|\{\},\{eye:!!N\.eye/, "fmEdit 合併存");
  assert.match(FAM, /if\(on\)n=fmKidPurge\(\)/, "打開時丟排隊資料");
});
