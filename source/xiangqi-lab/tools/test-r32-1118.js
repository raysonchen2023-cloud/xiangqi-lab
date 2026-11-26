// 11/18 iMac 測試員 R（0319）與開發者當天的決定：
//   P1 App 內「素材與授權」只放對外版（內部台帳另外放，不進 App、網站）；說明文件的 ~~刪除線~~ 不顯示
//   拿掉 12 個 Windows 語音音檔，語音報棋一律用系統語音（原生 App 走 XQSpeech 外掛：AVSpeechSynthesizer 在背景佇列；網頁版 speechSynthesis＋第一次排到空檔＋3 秒保護）
//   P3 序局將死後鎖住、4.5 秒內出結果卡；練習頁小題進度留著；「更多玩法」不綁第一章；經典圖示不畫英文字；拿掉第二章、第一章改名「楔子」；新安裝判斷不算測試房設定
// 不開瀏覽器：vm 跑程式片段、原始碼檢查。Swift 只做靜態檢查（xiangqi-ios/scripts/check-native.js）；實際朗讀、主執行緒會不會卡，要在 iMac 重建後用 sample 看、最後在開發者 iPhone 實機驗。
// 用法：node --test xiangqi-lab/tools/test-r32-1118.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
/* 11/18 公開證據（0319）：公開副本（ROOT 有 STAGE-MANIFEST.json）沒有 xiangqi-ios、xiangqi-lab/site、xiangqi-lab/src 的支援／隱私頁、xiangqi-db/art/docs、xiangqi-db/i18n-en.json（只放 CDN）。
   site 的檔、文件原稿、支援／隱私頁退回倉庫根目錄那一份（跟線上同一份：../、../data/docs/、../support.html）；還是找不到的子測試照實標略過、寫原因。開發者電腦上（沒有 STAGE-MANIFEST.json）照常跑，缺檔照樣失敗 */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json")) || process.env.XQ_PUBLIC_COPY === "1";   /* 公開副本：倉庫的 source/run-tests.js 會設 XQ_PUBLIC_COPY=1（W69 盤點高 7：以前用「沒有 xiangqi-ios」判斷，run-tests 複製 iOS 後就判錯） */
function alt(p) { p = String(p); if (!PUB || fs.existsSync(path.join(ROOT, p))) return p;
  for (const [re, to] of [[/^xiangqi-lab\/site\//, "../"], [/^xiangqi-db\/art\/docs(\/|$)/, "../data/docs$1"], [/^xiangqi-lab\/src\/(support|privacy)\.html$/, "../$1.html"]]) if (re.test(p)) { const q = p.replace(re, to); if (fs.existsSync(path.join(ROOT, q))) return q }
  return p }
function skipMissing(t0) {
  const why = p => { const s = String(p || "").split(String.fromCharCode(92)).join("/");
    return /xiangqi-ios[\\/](www([\\/]|$)|ios[\\/]App[\\/]App[\\/](public([\\/]|$)|capacitor\.config\.json))/.test(s) ? "沒有 iOS 建置產物 xiangqi-ios/www、ios/App/App/public、capacitor.config.json（cap sync 產生，.gitignore 不進倉庫）" : /xiangqi-ios[\\/]appstore/.test(s) ? "沒有 xiangqi-ios/appstore（App Store 上架文案與隱私申報有聯絡人資料，只在開發者電腦）" : /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /xiangqi-lab\/(site|src)\//.test(s) ? "沒有 " + s.slice(s.indexOf("xiangqi-lab/")) + "（公開副本不含）" : /docs-internal/.test(s) ? "沒有內部台帳（公開副本不含）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = PUB && e && e.code === "ENOENT" ? why(e.path) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };
const CJK = /[㐀-鿿]/;
/* 拿掉註解後的字串片段（畫面上的字） */
const strs = src => { const s = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1"); return s.split(/[`"']/) };

/* ---------- P1 素材與授權：對外版 ---------- */
const BAD = /tools\/|\.py\b|\.ps1\b|\.sh\b|開發者回覆[：:]|Claude 核對|判斷：|未查證|開發者決定|~~/;
test("P1：素材與授權（App、網站顯示的 credits.md）只有素材、來源、授權、致謝——沒有腳本路徑、開發紀錄、內部判斷、刪除線；語音那項改成系統語音", () => {
  const C = rd("xiangqi-db/art/docs/credits.md");
  const bad = C.split("\n").filter(l => BAD.test(l)); assert.deepEqual(bad, [], "內部用字");
  for (const s of ["未經許可不得商用", "已向 Pikafish 團隊說明", "已向資料庫作者說明本 App 的用法並詢問授權", "## 詢問中的事項", "「吃！」「將軍！」用手機系統內建的語音即時朗讀", "2026-11-17 西市、觀星臺冬景 7 張"]) assert.ok(C.includes(s), s);
  assert.ok(!/data\/voice|Windows|志偉|雅婷|台帳/.test(C), "不再提語音檔、Windows 語音、內部台帳");
});
test("P1：內部台帳另放 xiangqi-db/docs-internal/credits-internal.md，不在 art/docs（不會同步到網站）；App、網站、組版工具都沒有引用它", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "xiangqi-db/docs-internal/credits-internal.md")) || PUB, "內部台帳在");
  assert.ok(!fs.existsSync(path.join(ROOT, alt("xiangqi-db/art/docs") , "credits-internal.md")), "不在 art/docs");
  const hits = []; for (const d of ["xiangqi-db/m", "xiangqi-lab/tools"]) for (const f of fs.readdirSync(path.join(ROOT, d)).filter(f => /\.(js|html|css)$/.test(f) && !/^test-/.test(f))) if (rd(d + "/" + f).includes("credits-internal")) hits.push(d + "/" + f);
  assert.deepEqual(hits, []);
});
test("P1：App 內顯示的每份文件（原生版白名單＋網頁版的素材與授權）經過 xqDocClean／xqDocVar 後沒有內部用字；~~刪除線~~ 整行不顯示", () => {
  const SET = M("05-settings.js"), G = M("07gc-native.js");
  const code = SET.slice(SET.indexOf("const XQDOC="), SET.indexOf("function xqDocSheet(")).replace(/\{const s=document\.createElement\("style"\)[^\n]*\n/, "");
  const kit = nat => new Function("esc", "provDoc", "window", "navigator", code + ";return{XQDOC_NAT,xqDocVar}")(s => s, s => s, { XQ_NATIVE: nat }, { userAgent: "x" });
  const ctx = {}; vm.createContext(ctx); vm.runInContext(between(G, "const XQDOC_DROP=", "try{if(typeof xqDocVar===\"function\"&&!xqDocVar.__gcn)") + ";this.c=xqDocClean", ctx);
  for (const [nat, list] of [[true, kit(true).XQDOC_NAT], [false, ["credits"]]]) { const K = kit(nat);
    for (const f of list) { const o = K.xqDocVar(ctx.c(rd("xiangqi-db/art/docs/" + f + ".md")), nat), L = o.split("\n").filter(l => BAD.test(l)); assert.deepEqual(L, [], (nat ? "原生 " : "網頁 ") + f) } }
  assert.equal(ctx.c("1. 甲\n2. ~~做完了~~（已確認）\n3. 乙"), "1. 甲\n3. 乙", "劃掉的那一項整行不顯示");
  assert.deepEqual([...kit(true).XQDOC_NAT].sort(), ["credits", "family", "privacy", "rules", "support"]);
});

/* ---------- 語音：拿掉音檔、改系統語音 ---------- */
test("語音：程式不再讀 data/voice，組版不再複製、預存清單不列；設定頁試聽直接念；音效圖鑑、關於頁照實寫", () => {
  const all = fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js"));
  assert.deepEqual(all.filter(f => /data\/voice|loadVc|playVc|VC_RAW|\.wav`/.test(M(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/sfx\/\$\{k\}-\$\{x\}\.wav/g, ""))), []);
  assert.ok(!rd("xiangqi-lab/tools/build-site.js").includes('readdirSync(path.join(ROOT,"xiangqi-db","voice"))'), "build-site 不再複製 xiangqi-db/voice");
  assert.ok(!/"voice"/.test(between(rd("xiangqi-lab/tools/preload-list.js"), "const DIRS=[", "]")), "preload 清單不列 voice");
  assert.ok(M("05-settings.js").includes('setTimeout(()=>{sayCall("將軍");setTimeout(()=>sayCall("吃"),1100)},0)'));
  assert.ok(M("11c-a11ysnd.js").includes("「吃！」「將軍！」，用手機系統語音即時朗讀（不附語音檔），可選男聲、女聲"));
  assert.ok(!/語音檔照原來源|voice clips/.test(M("07x4-lobbysafe.js") + M("05-settings.js")), "關於頁不再說有語音檔");
  for (const f of ["sound.md", "ai-assets.md"].concat(PUB ? [] : ["foss.md"])) assert.ok(   /* 公開副本：foss.md 是證據腳本跑完測試後才換成這一版的（照 art/docs 正本蓋章），線上那份還是上一版，不驗 */!/志偉|雅婷|Windows 語音|Windows 內建語音/.test(rd("xiangqi-db/art/docs/" + f)), f);
});

const B1 = () => M("01-board.js");
function voiceKit(o) {
  const src = between(B1(), "const V_MALE=", "function withAudio(");
  const said = [], log = { speak: [], cancel: 0, idle: 0, timers: [] }, ls = new Map(o.ls || []);
  const ss = { getVoices: () => o.voices || [], speak: u => { log.speak.push(u); if (o.start) u.onstart && u.onstart() }, cancel: () => { log.cancel++ } };
  const ctx = { store: { get: (k, d) => (o.store || {})[k] !== undefined ? o.store[k] : d }, sxmGain: () => 1, sxmAllOff: () => false, i18nLang: () => o.en ? "en" : "zh",
    window: { speechSynthesis: o.noSS ? undefined : ss, XQNative: o.nat ? { has: n => n === "XQSpeech", plug: () => ({ speak: a => { said.push(a); return Promise.resolve({ ok: true }) } }) } : undefined, dispatchEvent() {} },
    speechSynthesis: ss, SpeechSynthesisUtterance: function (t) { this.text = t }, CustomEvent: function () {}, navigator: { userAgent: "x" },
    localStorage: { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)) },
    requestIdleCallback: f => { log.idle++; log.idleF = f }, setTimeout: (f, ms) => { log.timers.push([f, ms]); return log.timers.length }, clearTimeout() {} };
  ctx.window.speechSynthesis = ctx.window.speechSynthesis; vm.createContext(ctx); vm.runInContext(src + ";this.sayCall=sayCall;this.ttsPickVoice=ttsPickVoice;this.ttsLine=ttsLine", ctx);
  return { ctx, said, log, ls };
}
test("語音：挑語音只用 getVoices——中文介面 zh-TW／zh-Hant 優先、英文介面挑 en（en-US 優先），挑不到這個語言就是 null（不出聲）", () => {
  const { ctx } = voiceKit({});
  const V = [{ lang: "zh-CN", name: "Tingting" }, { lang: "zh-TW", name: "Meijia" }, { lang: "en-GB", name: "Daniel" }, { lang: "en-US", name: "Samantha" }];
  assert.equal(ctx.ttsPickVoice(V, false, "f").v.lang, "zh-TW"); assert.equal(ctx.ttsPickVoice(V, true, "m").v.lang, "en-US");
  assert.equal(ctx.ttsPickVoice([{ lang: "zh-Hant-TW", name: "x" }], false, "m").v.lang, "zh-Hant-TW");
  assert.equal(ctx.ttsPickVoice([{ lang: "ja-JP", name: "Kyoko" }], false, "m").v, null, "沒有中文語音＝不出聲");
  assert.equal(ctx.ttsPickVoice([], true, "m").v, null);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.ttsLine("將軍", true, "m", "n", false))), { say: "Check!", lang: "en-US", rate: 1.2, pitch: 0.45 });
  assert.equal(ctx.ttsLine("吃", false, "f", "f", true).say, "吃！");
});
test("語音：原生 App 有 XQSpeech 外掛就用它（不碰 speechSynthesis）；網頁版第一次排到空檔、挑不到語音不念、3 秒沒開始就記住這支手機的系統語音不可靠", () => {
  /* 原生 */
  let K = voiceKit({ nat: true, voices: [{ lang: "zh-TW", name: "Meijia" }] }); K.ctx.sayCall("將軍");
  assert.equal(K.said.length, 1); assert.equal(K.said[0].text, "將軍！"); assert.equal(K.said[0].lang, "zh-TW"); assert.equal(K.log.speak.length, 0, "原生版不呼叫 speechSynthesis.speak");
  K = voiceKit({ nat: true, en: true }); K.ctx.sayCall("吃"); assert.equal(K.said[0].text, "Capture!"); assert.equal(K.said[0].lang, "en-US");
  /* 網頁版：第一次不在當下念，排到空檔 */
  K = voiceKit({ voices: [{ lang: "zh-TW", name: "Meijia" }], start: true }); K.ctx.sayCall("吃");
  assert.equal(K.log.speak.length, 0, "第一次不同步呼叫 speak"); assert.equal(K.log.idle, 1); K.log.idleF(); assert.equal(K.log.speak.length, 1, "空檔才念");
  K.ctx.sayCall("將軍"); assert.equal(K.log.speak.length, 2, "第二次起直接念");
  /* 挑不到語音：不念 */
  K = voiceKit({ voices: [{ lang: "ja-JP", name: "Kyoko" }] }); K.ctx.sayCall("吃"); K.log.idleF(); assert.equal(K.log.speak.length, 0);
  /* 3 秒沒開始 */
  K = voiceKit({ voices: [{ lang: "zh-TW", name: "Meijia" }], start: false }); K.ctx.sayCall("吃"); K.log.idleF(); assert.equal(K.log.speak.length, 1);
  const T = K.log.timers.find(t => t[1] === 3000); assert.ok(T, "3 秒保護"); T[0](); assert.equal(K.ls.get("xqTtsBad"), "1", "記住不可靠（只記本機）"); assert.ok(K.log.cancel >= 1);
  K.ctx.sayCall("將軍"); assert.equal(K.log.speak.length, 1, "之後都不念");
  /* 有 onstart 就不記 */
  K = voiceKit({ voices: [{ lang: "zh-TW", name: "Meijia" }], start: true }); K.ctx.sayCall("吃"); K.log.idleF(); const T2 = K.log.timers.find(t => t[1] === 3000); T2[0](); assert.equal(K.ls.has("xqTtsBad"), false);
  /* 原生 App 不做 speak 暖機（B 的保護）：primeVoice 只取清單 */
  assert.ok(B1().includes("const primeVoice=()=>{if(voicePrimed||!window.speechSynthesis)return;voicePrimed=true;try{pickVoice()}catch(e){}};") && !/new SpeechSynthesisUtterance\(" "\)/.test(B1()));
  /* 「不可靠」只記本機：換手機轉移碼、存檔匯出都拿掉 */
  assert.ok(M("05-settings.js").includes("data:(d=>{delete d.xqTtsBad;return d})(XQSave.dump())") && (M("05b-save.js").match(/delete dump\.xqTtsBad;/g) || []).length === 2);
});
test("語音（原生）：XQSpeech 外掛的靜態檢查（check-native.js 第 8 節）——背景佇列、先回傳、啟動後先初始化、zh-TW→zh-Hant→zh-HK、.ambient＋usesApplicationAudioSession、進背景 stopSpeaking；install-native 預設裝", () => {
  const S = rd("xiangqi-ios/native/ios/XQSpeechPlugin.swift"), I = rd("xiangqi-ios/scripts/install-native.js"), C = rd("xiangqi-ios/scripts/check-native.js");
  assert.ok(S.includes('public let jsName = "XQSpeech"') && /private let work = DispatchQueue\(label: "xq\.speech"/.test(S) && !/DispatchQueue\.main/.test(S));
  assert.ok(S.includes("setCategory(.ambient") && S.includes("s.usesApplicationAudioSession = true") && S.includes("UIApplication.didEnterBackgroundNotification") && S.includes("stopSpeaking(at: .immediate)"));
  assert.ok(S.includes('static let zhLangs = ["zh-TW", "zh-Hant", "zh-HK"]') && S.includes('static let enLangs = ["en-US", "en-GB", "en"]'));
  assert.ok(I.includes('{ name: "XQSpeechPlugin.swift", type: "sourcecode.swift", phase: "Sources" }') && I.includes('const BASE_CLASSES = ["XQSpeechPlugin"];'));
  assert.ok(C.includes("/* 8. 11/18 語音報棋外掛 XQSpeech"));
  const r = require("child_process").spawnSync(process.execPath, [path.join(ROOT, "xiangqi-ios/scripts/check-native.js")], { encoding: "utf8" });
  const fails = (r.stdout + r.stderr).split("\n").filter(l => l.startsWith("✘") && /XQSpeech/.test(l)); assert.deepEqual(fails, [], "check-native 的 XQSpeech 各項");
});

/* ---------- P3 ---------- */
test("P3 序局將死：當下蓋透明鎖（點一下＝馬上出結果卡）、4.5 秒內一定出「星盤暫合」；結果卡出來時拿掉鎖；一般黑洞局照舊", () => {
  const B = M("07bh-blackhole.js");
  assert.ok(B.includes("const BHX_MATE_MS=4500;") && B.includes("const hold=xu?BHX_MATE_MS:15000;") && B.includes("if(xu){bhxLock();setTimeout(()=>{try{if(MODAL_HOLD>Date.now()||MODAL_Q.length)modalSkip()}catch(e){}},BHX_MATE_MS)}"));
  assert.ok(/d\.style\.cssText="position:fixed;inset:0;z-index:8999;/.test(B) && B.includes('if(t==="click")try{modalSkip()}catch(x){}') && B.includes("setTimeout(bhxUnlock,20000)"));
  assert.ok(B.includes("function bhxAfter(){bhxEnd();try{if(!(MODAL_HOLD>Date.now()))bhxUnlock();"));
});
test("P3 練習頁：回開頭畫面再繼續，同一課接回做到的那一小題（walk／eat 照前面幾格走過、check／mate 換到那一題）；這課做完就清掉", () => {
  const Q = M("07stq-starter.js"), ctx = {}; vm.createContext(ctx);
  const C = { parseFen: f => ({ f, mv: [] }), make: (B, f, t) => ({ f: B.f, mv: B.mv.concat([[f, t]]), R: t }) };
  vm.runInContext(between(Q, "const STQ_T=[", "\nconst STQ_TX=").replace("const STQ_T=", "this.STQ_T=") + "\n" + between(Q, "const stqCount=", "\n") + "\n" + between(Q, "function stqSubOf(", "\nfunction stqSubSave(") + ";this.of=stqSubOf;this.bd=stqSubBoard", ctx);
  const T = ctx.STQ_T;
  assert.equal(ctx.of({ sub: { n: 0, step: 2 } }, 0, T[0]), 2); assert.equal(ctx.of({ sub: { n: 0, step: 2 } }, 1, T[1]), 0, "別課不算"); assert.equal(ctx.of({ sub: { n: 2, step: 9 } }, 2, T[2]), 0, "超過題數不算");
  assert.equal(ctx.of({ sub: { n: 5, step: 1 } }, 5, T[5]), 0, "對局課照舊從頭");
  /* walk：從題目局面，俥依序走到前兩格 */
  const B = { f: T[0].fen, mv: [], indexOf: null }; const fake = { parseFen: f => { const b = Array(90).fill(null); b[81] = "R"; return b }, make: (b, f, t) => { const n = b.slice(); n[t] = n[f]; n[f] = null; return n } };
  const b2 = ctx.bd(fake, T[0], 2); assert.equal(b2.indexOf("R"), T[0].tg[1], "俥在第 2 格");
  const p = ctx.bd({ parseFen: f => f }, T[2], 1); assert.equal(p, T[2].ps[1], "check 換到第 2 題");
  assert.ok(Q.includes("stqSubSave(U.n,U.step);stqGoal();stqDraw();return}") && Q.includes("if(S.sub&&S.sub.n<=n)delete S.sub;stqSave(S);"));
});
test("P3「更多玩法」不綁第一章：看過開場、楔子還沒看完時，首頁主按鈕下面多一顆「更多玩法 ›」（裡面有重看開場）；設定的入口照舊", () => {
  const Q = M("07mnq-mainquest.js"), f = vm.runInNewContext("(" + between(Q, "function mnqMoreShow(", "\n").replace("function mnqMoreShow", "function") + ")");
  assert.equal(f({ k: "c1" }, 1, true), true); assert.equal(f({ k: "c1" }, 0, true), false, "沒看過開場不放"); assert.equal(f({ k: "more" }, 1, true), false, "主按鈕已經是更多玩法");
  assert.ok(Q.includes('m.textContent="更多玩法 ›"') && Q.includes("mnqMoreSync(b,sh);") && /\.mnq-more\{[^}]*min-height:44px/.test(Q));
  assert.ok(M("07stq-starter.js").includes("${stqXuReplayOk()?`<button type=\"button\" class=\"item\" data-k=\"op\">"), "更多玩法裡有重看開場");
});
test("拿掉第二章：開發者試玩也不開；楔子看完不跳「下一步」卡、直接回首頁說一句；第二章資料留著（舊存檔不壞）", () => {
  const Q = M("07mnq-mainquest.js");
  assert.ok(Q.includes("const MNQ_CHAP=Object.fromEntries(Object.entries(MNQ_CHAP_ALL).filter(([,c])=>!c.off));"), "第二章（off）一律不上線");
  assert.ok(/qin:\{vn:"qin",qte:"c2",set:"c2",rite:"step",open:"reach",off:1\}/.test(Q), "第二章資料還在");
  assert.ok(Q.includes("card:null,") && Q.includes("fin=()=>{mnfMusicStop(1);mnqC1Done()}") && Q.includes("if(!lastSeg)return play(j+1);fin()}})};"), "不換成下一步卡");
  assert.ok(!/mnqTaskCard\(/.test(Q.replace(/function mnqTaskCard\(/, "")), "沒有地方再叫下一步卡");
  assert.ok(Q.includes('toast("📖 楔子看完了。想再看一次：設定 → 聲音 → 氛圍")'));
});
test("第一章改名「楔子」（英文 Prelude）：首頁按鈕、更多玩法、設定的重看、授印禮、電影標題（標籤）；畫面上的字不再寫第一章", () => {
  for (const f of ["07stq-starter.js", "07mnq-mainquest.js"]) { const L = strs(M(f)).filter(s => /第一章/.test(s)); assert.deepEqual(L, [], f) }
  assert.ok(M("07stq-starter.js").includes('"📖 接著看楔子":"📖 楔子"') && M("07stq-starter.js").includes('c1=lit?"再看楔子":"看楔子"'));
  const Q = M("07mnq-mainquest.js"); assert.ok(Q.includes('const MNQ_C1="楔子";') && Q.includes('const N=mnqChLabel(era)+"・";') && Q.includes('btn=["⛵ 開始楔子",') && Q.includes('["⛵","楔子・河圖初渡"]') && Q.includes('"🎬 再看楔子":"🎬 看楔子"'));
  const S = M("07i18n.js"), a = S.indexOf("#I18N-PURE-BEGIN"), b = S.indexOf("/* #I18N-PURE-END */"), c = {}; vm.createContext(c); vm.runInContext(S.slice(S.indexOf("\n", a) + 1, b) + ";this.T=i18nText", c);
  for (const [z, e] of [["📖 楔子", "📖 Prelude"], ["📖 接著看楔子", "📖 Continue the Prelude"], ["⛵ 開始楔子", "⛵ Start the Prelude"], ["🎬 再看楔子", "🎬 Rewatch the Prelude"], ["更多玩法 ›", "More ways to play ›"]]) assert.equal(c.T(z), e, z);
  assert.ok(!CJK.test(c.T("楔子・河圖初渡")) && /^Prelude · /.test(c.T("楔子・河圖初渡")), "電影標籤");
  assert.ok(M("07bh-blackhole.js").includes("才開始楔子。"));
});
test("新安裝判斷：只看手機裡有沒有存檔（m_／xq_ 開頭的鍵），測試房、測試開關（xq_netRoot 等）不算——測試房也驗得到全新安裝的預設（語言照系統、原生版三個匿名開關預設關）", () => {
  const H = rd("xiangqi-db/m.html"), i = H.indexOf("window.XQ_LANG_OF=f"), s = H.lastIndexOf("<script>", i), code = H.slice(s + 8, H.indexOf("</script>", i));
  const run = keys => { const m = new Map(keys.map(k => [k, "1"])), w = { localStorage: { get length() { return m.size }, key: n => [...m.keys()][n], setItem: (k, v) => m.set(k, v), getItem: k => m.get(k) }, navigator: { languages: ["en-US"] } };
    w.window = w; vm.createContext(w); vm.runInContext(code.replace(/sessionStorage\.setItem\([^)]*\)/, "0"), w); return w.XQ_LANG_AUTO || null };
  assert.equal(run([]), "en", "全新"); assert.equal(run(["xq_netRoot", "xq_mqtt", "xq_stqQa"]), "en", "只有測試房設定＝還是全新"); assert.equal(run(["m_xp"]), null, "有存檔＝老玩家"); assert.equal(run(["xq_netRoot", "xq_record"]), null);
  assert.ok(M("05b-save.js").includes("const fresh=!!(typeof window!==\"undefined\"&&window.XQ_LANG_AUTO);"), "原生版匿名開關照同一個判斷");
});

/* ---------- 11/18 P1：序局 3D 卡頓、魔王慢慢出來 ---------- */
const BH = () => M("07bh-blackhole.js");
test("P1 序局：要用的九顆棋子人＝盤面上的棋子（跟 park3d GNT_X／GNT_XS 同一份對照），加魔王；電影一開始就排下載（15 秒後、空閒時），邀局卡時一顆一顆解析", () => {
  const B = BH(), ctx = {}; vm.createContext(ctx);
  vm.runInContext(between(B, "const BHX_GNT=", "\n") + "\n" + between(B, "function bhxNeedGlb(", "\n") + "\n" + 'const BHX_FEN="' + (B.match(/BHX_FEN="([^"]+)"/) || [])[1] + '";this.f=bhxNeedGlb;this.G=BHX_GNT;this.FEN=BHX_FEN', ctx);
  const need = [...ctx.f(ctx.FEN)].sort();
  assert.deepEqual(need, ["x_bing", "x_martialgirl", "x_miaogirl", "x_shi", "x_shuai", "x_spiritgirl", "x_swordboy", "xs_jiang", "xs_shi"].map(k => "data/tripo_app/" + k + ".glb").sort(), "紅方七種、黑將黑士");
  const P3 = rd("xiangqi-lab/src/park3d.js"), gx = vm.runInNewContext("(" + between(P3, "const GNT_X=", ",GNT_CH").replace("const GNT_X=", "") + ")"), gxs = vm.runInNewContext("(" + between(P3, "const GNT_XS=", ",GNT_GLYB").replace("const GNT_XS=", "") + ")");
  for (const k in gx) assert.equal(ctx.G[k], gx[k], "紅 " + k); for (const k in gxs) assert.equal(ctx.G[k.toLowerCase()], gxs[k], "黑 " + k);
  assert.ok(B.includes("bhxPreFetch();   /* 11/18 P1") && B.indexOf("bhxPreFetch();") < B.indexOf("bhxFilm(OP_FILM1,bhxIntro)"), "電影開始時就排下載");
  assert.ok(/BHX_PF=new Promise\(res=>setTimeout\(res,delay==null\?15000:delay\)\)/.test(B) && B.includes("await new Promise(r=>bhxIdle(r));try{await fetch(u,"), "15 秒後、每個檔之前讓出主執行緒");
  assert.ok(B.includes("bhxIdle0(()=>{try{bhxPreImg()}catch(e){}try{bhxPreFetch(0)}catch(e){}try{bhxPreParse()}catch(e){}},{timeout:2500});"), "邀局卡：接著下載、開始解析（11/18 N33-3 前面多了電影圖 bhxPreImg）");
  assert.ok(B.includes("for(const u of L){await new Promise(r=>bhxIdle(r));try{await window.XQGLB(u)}catch(e){}}"), "一顆一顆解析，中間讓出主執行緒");
  assert.ok(M("06-cpu.js").includes("window.XQGLB=url=>GLBC[url]||(GLBC[url]="), "XQGLB 記住解析好的結果（park3d、bot3d、bossfx3d 共用）");
  assert.ok(rd("xiangqi-lab/src/park3d.js").includes('glb:"data/tripo_app/"+(blk?GNT_XS[bm?bm.k:K]:wd?GNT_WOOD:GNT_X[K])+".glb"'), "park3d 用的網址跟預先解析的一樣");
});
test("P1 序局：入局後黑洞底幕蓋著，等 3D 畫面出現＋九顆棋子人＋魔王都好了才淡出；2 秒還沒好寫「星盤展開中…」；最多 15 秒；序局照樣不能略過", () => {
  const B = BH(), f = vm.runInNewContext("(" + between(B, "function bhxRevealWait(o){", "\n").replace("function bhxRevealWait", "function") + ")");
  assert.equal(f({ shown: true, models: true, boss: true, ms: 100 }), false, "都好了就不等");
  for (const k of ["shown", "models", "boss"]) assert.equal(f(Object.assign({ shown: true, models: true, boss: true, ms: 100 }, { [k]: false })), true, k + " 還沒好就再等");
  assert.equal(f({ shown: false, models: false, boss: false, ms: 15000 }), false, "最多 15 秒");
  /* 11/25 W120：入局的回呼多了「還在序局這一盤」的檢查（xok＝jPlayOk），bhxReveal 照樣在開場那句之後、同一個回呼裡馬上叫 */
  assert.ok(B.includes('const rn=ROUTE_N,xok=still=>jPlayOk(rn,BHX_ID,still);location.hash="#/journey/play";setTimeout(()=>{if(!xok())return;bhBell();toast("✦ 星樞："+BHX_TXT.start)},900);bhxReveal();   /* 11/25 W120') && B.includes("/* 11/16 OpenAI 審查：慢的手機 3D 還沒出來就拿掉黑底會閃出別頁") && !B.includes("const bhxWaitPark="), "入局改走 bhxReveal");
  assert.ok(B.includes("if(!hint&&ms>2000){hint=true;bhxHint(true)}") && B.includes('h.textContent="星盤展開中…"'));
  assert.ok(B.includes("requestAnimationFrame(()=>requestAnimationFrame(()=>{bhxHint(false);bhxBack(false)}))"), "多等兩格才淡出");
  assert.ok(B.includes("PARK.v.whenShown(()=>{S.shown=true})") && B.includes("BHFX.ready.then("), "等 park3d 畫面、魔王的 ready");
  assert.ok(/bhxLocked/.test(M("08b-cpugame.js")) && B.includes("function bhxLocked("), "序局鎖定照舊");
});
test("P1 序局：狀態列判斷看整疊（elementsFromPoint）第一個自己有不透明底色的層，透明的全螢幕層不會讓淺色頂欄判成暗底", () => {
  const Z = M("07z6-sitemap.js"), ctx = { getComputedStyle: e => ({ backgroundColor: e.bg }) }; vm.createContext(ctx); vm.runInContext(between(Z, "function xqBarPick(", "\n") + ";this.p=xqBarPick", ctx);
  const R = ctx.p([{ nodeType: 1, bg: "rgba(0, 0, 0, 0)" }, { nodeType: 1, bg: "rgb(248, 240, 220)" }, { nodeType: 1, bg: "rgb(5, 6, 13)" }]);
  assert.equal(JSON.stringify(R), JSON.stringify([248, 240, 220]), "透明層跳過，拿到淺色頂欄");
  assert.ok(Z.includes("c=xqBarPick(document.elementsFromPoint(px,1))"));
});

/* ---------- 11/18 P1 退步：七星還沒落地，圖上就有七顆紅光 ---------- */
test("P1 七星紅光：原圖（畫好七個紅光）等最後一顆星落地才淡入；減少動態 1.2 秒；星雨的時間跟這裡用同一組常數", () => {
  const B = BH(), ctx = {}; vm.createContext(ctx); vm.runInContext(between(B, "const BHX_MET=", "\n") + "\n" + between(B, "function bhxStarLand(", "\n") + ";this.f=bhxStarLand;this.M=BHX_MET", ctx);
  const last = ctx.f(7, false); assert.ok(Math.abs(last - (0.8 + 6 * 0.13 + 1.5)) < 1e-9, "最後一顆落地 " + last + " 秒");
  for (let i = 0; i < 7; i++) assert.ok(0.8 + i * 0.13 + 1.5 <= last + 1e-9, "第 " + (i + 1) + " 顆在紅光亮之前落地");
  assert.equal(ctx.f(7, true), 1.2);
  assert.ok(B.includes("setTimeout(()=>{d.style.opacity=\"1\"},Math.round(at*1000)+50)") && !/setTimeout\(\(\)=>\{d\.style\.opacity="1"\},1300\)/.test(B), "不再 1.3 秒就亮");
  assert.ok(B.includes("d:BHX_MET.d0+i*BHX_MET.dk") && B.includes("const fl=BHX_MET.fl;"), "星雨用同一組常數");
  assert.ok(B.includes('p4:{img:"data/story0/s0_4.webp",imgN:"data/story0/s0_4n.webp"') && B.includes("bg.style.backgroundImage=PG?`url(${PG.imgN||PG.img})"), "這一格先放抹掉紅光的 s0_4n（電影版）");
  assert.ok(B.includes("o.style.backgroundImage=`url(${P.imgN||P.img}),url(data/park/bh_far2.webp)`"), "分頁版（減少動態）也先放 s0_4n");
  assert.ok(/function bhxMeteor\(o,onDone,opt\)\{opt=opt\|\|\{\};bhxStarRev\(o\);/.test(B), "電影、分頁、補播、重看開場都經過 bhxMeteor → bhxStarRev");
});

/* ---------- 11/18：開場兩段電影的字幕與換圖 ---------- */
test("電影字幕：兩段電影每一個換圖點（下一鏡、鏡頭內疊圖、星雨、片尾）之前的最後一行字，都已經淡入完（0.9 秒）＋讀完（每行至少 1.2 秒、每字 0.2 秒）", () => {
  const B = BH(), grab = name => { const i = B.indexOf("const " + name + "="), j = B.indexOf("]};", i); return vm.runInNewContext("(" + B.slice(i + name.length + 7, j + 2) + ")") };
  const read = t => Math.max(1.2, [...t].length * .2), bad = [];
  for (const name of ["OP_FILM1", "OP_FILM2"]) { const F = grab(name);
    F.shots.forEach((s, i) => { const lines = (s.say || []).concat(s.nar ? [[s.nar[0], "說書人：" + s.nar[1]]] : []);
      const ch = (s.ly || []).map(([lt]) => lt).concat(s.meteor != null ? [s.meteor] : []).concat([i + 1 < F.shots.length ? F.shots[i + 1].at : F.end]);
      for (const c of ch) { const before = lines.filter(([ts]) => ts < c); if (!before.length) continue; const [ts, t] = before[before.length - 1]; if (c + 1e-6 < ts + .9 + read(t)) bad.push(name + " 鏡" + i + " @" + c + "：「" + t + "」") } }) }
  assert.deepEqual(bad, []);
  assert.ok(/\.bx-l\{[^}]*transition:opacity \.9s/.test(B), "字幕淡入 0.9 秒（上面的算法照這個）");
  const F2 = grab("OP_FILM2"), s1 = F2.shots[1], p3 = s1.ly.find(x => x[1] === "p3");
  assert.ok(p3[2] >= 2, "青石化成石桌的溶接至少 2 秒"); assert.ok(s1.say.filter(([ts]) => ts < p3[0]).length === 2, "兩行字都出完才溶接");
});
