// 11/17 iMac 測試員 G P3-1 升 P2（準則 5.1.1／5.1.2，兒童取向）：停權名單 banlist.json 進大廳才抓、修正清單 fixes.json 送過回饋才在開 App 時抓、兒童模式都不抓。
// 驗收照 performance.getEntriesByType("resource") 的語意：把真的會發出去的請求（最底層 fetch）一筆筆記成 resource 項目，看名稱裡有沒有 banlist.json／fixes.json。
// 用真的程式碼：00-util 的 fetch 共用、05-settings 的 postForm／sendRecord／myFixes／checkFixes 與開 App 計時器、07m5 的家長／兒童模式、
// 07s3 的飛鴿（fblPending／fblCheck 與計時器）、07x4 的停權名單、檢舉進度與尾段的「什麼時候抓」。計時器、時鐘用假的；送出回饋用 stub（不真的送）。
// 用法：node --test xiangqi-lab/tools/test-netfetch-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40) + " … " + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };
const tail = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "切不到：" + a.slice(0, 40)); return s.slice(i) };

const U = M("00-util.js"), S5 = M("05-settings.js"), FM = M("07m5-family.js"), S3 = M("07s3-feedback.js"), X4 = M("07x4-lobbysafe.js");
const CODE = [
  between(U, "(function(){try{const f0=typeof window!==\"undefined\"&&window.fetch;if(!f0||f0.__xqDedupe)return;", "w.__xqDedupe=1;window.fetch=w}catch(e){}})();", true),
  between(S5, "async function postForm(rec){", "// 走棋音效選單"),
  between(S5, "async function fixHash(id){", "setTimeout(()=>{if(OFF)checkFixes()},800);", true),
  between(FM, "const FM_KID_SES=", "\n"),
  between(FM, "function fmCfg(){", "\n/*"), between(FM, "function fmNetOff(){", "\n"), between(FM, "const fmKid=()=>", "\n"), between(FM, "function fmKidRec(r){", "\n"),
  between(FM, "if(typeof postForm===\"function\"){const f0=postForm;postForm=async function(rec){if(fmKid())", "\n"),
  between(S3, "const FBL_ON=true;", "if(FBL_ON){addEventListener(\"hashchange\",()=>setTimeout(fblCheck,2200));setTimeout(fblCheck,6000)}", true),
  between(X4, "const lbsLs=", "\n"),
  between(X4, "const LBS_BAN_GAP=", "/* 改了名單"),
  between(X4, "function lbsMine(){", "function lbsMineWhen("),
  tail(X4, "/* ---------- 11/17 iMac 測試員 G P3-1 升 P2"),
].join("\n");

const FIXES = { items: [], replies: [], reports: {} };
function boot(LS, opt) {
  opt = opt || {};
  let clock = 1.8e12;
  const timers = [], H = {}, entries = [];
  const ls = { getItem: k => LS.has(k) ? LS.get(k) : null, setItem: (k, v) => LS.set(k, String(v)), removeItem: k => LS.delete(k) };
  class VDate extends Date { constructor(...a) { if (a.length) super(...a); else super(clock) } static now() { return clock } }
  const base = (u, o) => {   /* 最底層：真的發出去的請求。performance 的 resource 項目 name 是完整網址 */
    const name = new URL(String(u && u.url || u), "https://raysonchen2023-cloud.github.io/xiangqi-lab/").href; entries.push({ name, initiatorType: "fetch", startTime: clock });
    if (opt.fail && opt.fail(name)) return Promise.resolve({ ok: false, status: 503, json: async () => null, clone() { return this } });
    const mk = () => ({ ok: true, status: 200, json: async () => /banlist/.test(name) ? { v: 1, ids: {} } : JSON.parse(JSON.stringify(FIXES)), clone: mk });
    return Promise.resolve(mk());
  };
  const win = {};
  const ctx = {
    window: win, console, URL, URLSearchParams, TextEncoder, crypto: globalThis.crypto, Uint8Array, JSON, Promise, Map, Set, Object, Array, String, Math, Error, RegExp,
    Date: VDate, localStorage: ls, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: Object.assign({ onLine: true, userAgent: "test", sendBeacon: () => true }, opt.nav || {}),
    location: { hash: opt.hash || "#/", href: "https://x/" },
    document: { querySelector: s => s === ".shw-me" ? { getBoundingClientRect: () => ({ left: 0, top: 0, width: 50, height: 80, bottom: 80 }), addEventListener() {}, removeEventListener() {} } : null, contains: () => true, getElementById: () => null, body: { classList: { toggle() {} } } },
    addEventListener: (t, f) => { (H[t] = H[t] || []).push(f) }, removeEventListener: (t, f) => { H[t] = (H[t] || []).filter(x => x !== f) },
    setTimeout: (f, ms) => { timers.push({ at: clock + (+ms || 0), f }); return timers.length }, clearTimeout() {}, requestAnimationFrame() {},
    store: { get: (k, d) => { const v = ls.getItem("m_" + k); return v == null ? d : JSON.parse(v) }, set: (k, v) => ls.setItem("m_" + k, JSON.stringify(v)) },
    OFF: true, FM_ON: true, DEVMODE: () => false, meInfo: () => ({ id: "dev-id-123", name: "棋友" }), XQ_BUILD: "20261117-1800",
    FEEDBACK_FORM: { action: "https://docs.google.com/forms/d/e/STUB/formResponse", entries: { type: "entry.1", text: "entry.2", id: "entry.3" } },
    toast() {}, modal() {}, sheet() {}, vibrate() {}, esc: s => String(s), fixList: () => "", route() {},
  };
  win.fetch = base; ctx.fetch = (...a) => win.fetch(...a);
  Object.assign(win, { XQ_BUILD: ctx.XQ_BUILD });
  vm.createContext(ctx);
  /* 程式裡的 window.X 跟全域 X 要是同一個：window 指回 context 自己 */
  ctx.window = ctx; ctx.fetch = base;
  vm.runInContext(CODE.replace(/window\.fetch/g, "globalThis.fetch"), ctx, { filename: "netfetch-modules.js" });
  const flush = async () => { for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)) };
  const run = async ms => { const end = clock + ms; for (;;) { timers.sort((a, b) => a.at - b.at); const t = timers[0]; if (!t || t.at > end) break; timers.shift(); clock = Math.max(clock, t.at); try { await t.f() } catch (e) {} await flush() } clock = end; await flush() };
  const go = async (h, ms) => { const old = ctx.location.hash; ctx.location.hash = h; for (const f of (H.hashchange || []).slice()) try { f({ oldURL: "https://x/" + old }) } catch (e) {} await flush(); await run(ms == null ? 5000 : ms) };
  /* 打開意見回饋頁：07s3 FeedbackPage 的告示榜就是叫 myFixes() */
  const openFeedback = async () => { await go("#/feedback", 0); await vm.runInContext("myFixes()", ctx); await flush(); await run(3000) };
  const names = re => entries.filter(e => re.test(e.name)).map(e => e.name);
  return { ctx, run, go, openFeedback, entries, names, flush, getEntriesByType: t => t === "resource" ? entries.slice() : [] };
}
const BAN = /\/data\/banlist\.json/, FIX = /\/data\/fixes\.json/;
const playAGame = async A => { await A.run(20000); await A.go("#/cpu"); await A.go("#/play/cpu"); await A.run(60000); await A.go("#/") ; await A.run(15000) };

test("沒送過回饋的新存檔：開 App、回首頁、下一盤棋——零筆外部連線（resource 裡沒有 banlist.json、fixes.json）", async () => {
  const A = boot(new Map());
  await playAGame(A);
  assert.deepEqual(A.getEntriesByType("resource"), [], "開 App 到下完一盤，一筆請求都沒有");
});

test("停權名單：進線上大廳才出現，同一次開 App 只抓一次；千秋盃、加入對局也算；看電腦對戰不算", async () => {
  const A = boot(new Map());
  await A.run(20000); assert.equal(A.names(BAN).length, 0, "進大廳前沒有");
  await A.go("#/watch/ai"); assert.equal(A.names(BAN).length, 0, "看電腦對戰不用名單");
  await A.go("#/lobby"); assert.equal(A.names(BAN).length, 1, "進大廳抓一次");
  await A.go("#/"); await A.go("#/lobby"); await A.go("#/cup"); await A.go("#/join/abc"); await A.run(30 * 60000); await A.go("#/lobby");
  assert.equal(A.names(BAN).length, 1, "同一次開 App 只抓一次");
  assert.equal(A.names(FIX).length, 0, "進大廳不會順便抓修正清單");
  /* 重開 App 再進大廳：再抓一次（名單要能即時更新，準則 1.2） */
  const B = boot(new Map()); await B.run(10000); assert.equal(B.names(BAN).length, 0); await B.go("#/join/xyz"); assert.equal(B.names(BAN).length, 1, "直接開加入對局的連結也算");
  /* 直接用 #/lobby 網址開 App */
  const C = boot(new Map(), { hash: "#/lobby" }); await C.run(3000); assert.equal(C.names(BAN).length, 1);
});

test("停權名單抓失敗：不算抓過，1 分鐘後再進大廳會重試；成功後就不再抓", async () => {
  let bad = true; const A = boot(new Map(), { fail: n => bad && /banlist/.test(n) });
  await A.go("#/lobby"); assert.equal(A.names(BAN).length, 1);
  await A.go("#/"); await A.go("#/lobby", 1000); assert.equal(A.names(BAN).length, 1, "1 分鐘內不重試");
  bad = false; await A.run(61000); await A.go("#/"); await A.go("#/lobby"); assert.equal(A.names(BAN).length, 2, "失敗後重試一次");
  await A.run(61000); await A.go("#/"); await A.go("#/lobby"); assert.equal(A.names(BAN).length, 2, "成功後同一次開 App 不再抓");
});

test("修正清單：沒送過時只在打開意見回饋時出現，而且只出現一次（之後回首頁的飛鴿用同一份）", async () => {
  const A = boot(new Map());
  await A.run(20000); assert.equal(A.names(FIX).length, 0, "開 App 不抓");
  await A.openFeedback(); assert.equal(A.names(FIX).length, 1, "打開意見回饋抓一次");
  await A.go("#/"); await A.run(20000); await A.openFeedback(); await A.go("#/"); await A.run(20000);
  assert.equal(A.names(FIX).length, 1, "再打開、回首頁（飛鴿檢查）都不會再連");
  assert.equal(A.names(BAN).length, 0);
});

test("新存檔打開意見回饋頁、不送出，重開 App：fixes.json 不應該出現", async () => {
  const LS = new Map();
  const A = boot(LS); await A.run(10000); await A.openFeedback(); assert.equal(A.names(FIX).length, 1);
  await A.go("#/");
  assert.equal(JSON.parse(LS.get("m_fbSentAt") || "0"), 0, "只打開不算送過");
  const B = boot(LS); await playAGame(B);
  assert.equal(B.names(FIX).length, 0, "重開 App 後 resource 裡沒有 fixes.json");
  assert.deepEqual(B.getEntriesByType("resource"), []);
});

test("送出成功（stub sendBeacon 回 true，不真的送）後重開 App：開 App 時 fixes.json 出現一次（修正通知、飛鴿、檢舉進度共用）", async () => {
  const LS = new Map(); const sent = [];
  const A = boot(LS, { nav: { sendBeacon: (u, b) => { sent.push(String(u)); return true } } });
  await A.run(10000); await A.openFeedback();
  const ok = await vm.runInContext("sendRecord({type:'🐞 錯誤回報',text:'棋子不見了',id:'dev-id-123'})", A.ctx); await A.flush();
  assert.equal(ok, true); assert.equal(sent.length, 1, "stub 收到一筆（沒有真的連網）"); assert.ok(sent[0].includes("/forms/d/e/STUB/"));
  assert.ok(JSON.parse(LS.get("m_fbSentAt")) > 0, "送成功才記 fbSentAt");
  const B = boot(LS); await B.run(20000);
  assert.equal(B.names(FIX).length, 1, "開 App 抓一次");
  await B.openFeedback(); await B.go("#/"); await B.run(20000); await B.go("#/lobby");
  assert.equal(B.names(FIX).length, 1, "同一次開 App 只抓一次");
  assert.equal(B.names(BAN).length, 1, "停權名單照樣進大廳才抓");
});

test("送出失敗（沒網路、進排隊）不算送過；排隊的之後補送成功才算", async () => {
  const LS = new Map();
  const A = boot(LS, { nav: { onLine: false, sendBeacon: () => false } });
  A.ctx.fetch = () => Promise.reject(new Error("offline")); vm.runInContext("globalThis.fetch=fetch", A.ctx);
  const ok = await vm.runInContext("sendRecord({type:'💡 建議',text:'想要更多殘局'})", A.ctx); await A.flush();
  assert.equal(ok, false); assert.equal(JSON.parse(LS.get("m_fbQueue")).length, 1, "進排隊");
  assert.ok(!(JSON.parse(LS.get("m_fbSentAt") || "0") > 0), "排隊中不算送過");
  const B = boot(LS); await B.run(20000); assert.equal(B.names(FIX).length, 0, "重開 App 不抓");
  await vm.runInContext("flushFeedback()", B.ctx); await B.flush();
  assert.ok(JSON.parse(LS.get("m_fbSentAt")) > 0, "補送成功後才記");
  const C = boot(LS); await C.run(20000); assert.equal(C.names(FIX).length, 1);
  /* 玩家登記（不是意見回饋）送成功不算 */
  const L2 = new Map(); const D = boot(L2); await vm.runInContext("sendRecord({type:'👤 玩家登記',text:'x'})", D.ctx); await D.flush();
  assert.ok(!(JSON.parse(L2.get("m_fbSentAt") || "0") > 0));
});

test("兒童模式、家長關閉線上大廳：開 App、進大廳、打開意見回饋，banlist.json 和 fixes.json 都不出現（送過回饋也一樣）", async () => {
  for (const cfg of [{ kid: true }, { net: false }]) {
    const LS = new Map([["m_fmCfg", JSON.stringify(cfg)], ["m_fbSentAt", JSON.stringify(1.7e12)], ["m_fbMine", JSON.stringify([{ at: 1.7e12, t: "舊回饋" }])]]);
    const A = boot(LS);
    await A.run(20000); await A.go("#/lobby"); await A.go("#/cup"); await A.openFeedback(); await A.go("#/"); await A.run(20000);
    const F = await vm.runInContext("myFixes()", A.ctx);
    assert.deepEqual(A.getEntriesByType("resource"), [], JSON.stringify(cfg) + "：一筆都沒有");
    assert.equal(F.quiet, 1, "告示榜顯示「不下載」而不是讀不到");
    assert.equal((await vm.runInContext("fblPending()", A.ctx)).length, 0, "不飛鴿");
    assert.equal((await vm.runInContext("lbsMineFetch(true)", A.ctx)).length, 0, "我的檢舉也不連");
  }
  /* 兒童模式送的回饋（只有文字、沒有線上 ID）不記成送過：關掉兒童模式後開 App 也不抓 */
  const LS = new Map([["m_fmCfg", JSON.stringify({ kid: true })]]); const A = boot(LS);
  await vm.runInContext("sendRecord({type:'🐞 錯誤回報',text:'x'})", A.ctx); await A.flush();
  assert.ok(!(JSON.parse(LS.get("m_fbSentAt") || "0") > 0));
});

test("舊存檔（這版以前送過，沒有 fbSentAt）：有 fbMine 且不是全部在排隊、或有已送出的檢舉 → 當送過，開 App 抓一次；只有排隊中的 → 不算", async () => {
  const L1 = new Map([["m_fbMine", JSON.stringify([{ at: 1.7e12, ty: "🐞", t: "舊回饋" }])]]);
  const A = boot(L1); await A.run(20000); assert.equal(A.names(FIX).length, 1); assert.ok(JSON.parse(L1.get("m_fbSentAt")) > 0);
  const L2 = new Map([["m_lbRepMine", JSON.stringify([{ rid: "R-1111-7K3Q", at: 1.7e12, name: "x", st: "sent" }])]]);
  const B = boot(L2); await B.run(20000); assert.equal(B.names(FIX).length, 1, "已送出的檢舉也要能收到處理進度");
  const L3 = new Map([["m_fbMine", JSON.stringify([{ at: 1.7e12, t: "a" }])], ["m_fbQueue", JSON.stringify([{ type: "🐞", text: "a" }])]]);
  const C = boot(L3); await C.run(20000); assert.equal(C.names(FIX).length, 0, "寫了但還在排隊＝沒送出");
  assert.equal(JSON.parse(L3.get("m_fbSentAt")), 0, "補記只做一次（記 0）");
});

test("原始碼：只改「什麼時候叫」——native-bridge 的轉向照舊；開 App 不再無條件抓停權名單；三處說明同一套說法", () => {
  assert.ok(!X4.includes("setTimeout(()=>{try{if(OFF)lbsBanFetch()}catch(e){}},2500);"), "拿掉開 App 2.5 秒就抓停權名單");
  assert.match(X4, /addEventListener\("hashchange",lbsBanRoute\)/);
  assert.ok(S3.includes("(typeof myFixes===\"function\"?myFixes():Promise.resolve(null))"), "信房告示榜照舊叫 myFixes（打開才抓）");
  const IOS = path.join(ROOT, "xiangqi-ios");
  if (fs.existsSync(IOS)) {
    const NB = rd("xiangqi-ios/src/native-bridge.js");
    assert.ok(NB.includes('if (rel === "data/banlist.json") {') && NB.includes('if (rel === "data/fixes.json") {'), "native-bridge 轉向還在");
    const AP = rd("xiangqi-ios/appstore/app-privacy.md");
    assert.ok(AP.includes("如果你送過意見回饋，App 開啟時會從 Cloudflare 下載一次修正清單和開發者回覆，讓你收到飛鴿傳書；沒送過就只在打開意見回饋時下載。"));
    assert.match(AP, /隱私標籤不另外勾選/);
  }
  const P = rd("xiangqi-db/art/docs/privacy.md");
  assert.equal(P, rd("xiangqi-lab/site/data/docs/privacy.md"), "兩份 privacy.md 一樣");
  assert.ok(P.includes("- 如果你送過意見回饋，App 開啟時會從 Cloudflare 下載一次修正清單和開發者回覆，讓你收到飛鴿傳書；沒送過就只在打開意見回饋時下載。"));
  assert.match(P, /會從 GitHub Pages 下載一次停權名單/);
  assert.match(P, /跟任何連線一樣會看到你的 IP 位址，但不會收到你的名字、存檔或棋譜/);
  assert.match(P, /只打開意見回饋頁、沒有送出，不算/);
  assert.ok(!/每次打開 App，會讀兩個公開的資料檔/.test(P), "舊說法拿掉");
  /* App 內設定隱私卡片：中英都有 */
  const I = M("07i18n.js");
  for (const k of ["XQ_NETWHEN_NAT", "XQ_NETWHEN_WEB"]) { const m = X4.match(new RegExp("const " + k + "=(\"[^\"]+\");")); assert.ok(m, k); assert.ok(I.includes(m[1] + ":\"If you have sent feedback,"), k + " 有英文") }
  assert.ok(X4.match(/const XQ_NETWHEN_NAT="([^"]+)"/)[1].startsWith("如果你送過意見回饋，App 開啟時會從 Cloudflare 下載一次修正清單和開發者回覆，讓你收到飛鴿傳書；沒送過就只在打開意見回饋時下載。"));
});
