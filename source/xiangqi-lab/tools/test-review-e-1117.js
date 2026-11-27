// 11/17 App Store 送審前，Apple 審查員（測試員 E）找到的問題：每一項都測「原生 App 藏起來／改說法」和「網頁版照舊」。
// 原生 App＝window.XQ_NATIVE 為真，或 UA 帶 XQQianqiuApp/（00-util.js xqNat；05-settings.js setNat 沒有 xqNat 時自己判斷）。
// 用法：node --test xiangqi-lab/tools/test-review-e-1117.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm");
/* 公開副本沒有 iOS 專案（xiangqi-ios）、文件原稿（xiangqi-db/art/docs）、英文外掛字典（只放 CDN）：讀不到這幾類檔時標成略過、寫原因；其他錯誤照樣失敗（1144 公開證據補） */
function skipMissing(t0) {
  const why = p => { const s = String(p || "").split(String.fromCharCode(92)).join("/");
    return /xiangqi-ios[\\/](www([\\/]|$)|ios[\\/]App[\\/]App[\\/](public([\\/]|$)|capacitor\.config\.json))/.test(s) ? "沒有 iOS 建置產物 xiangqi-ios/www、ios/App/App/public、capacitor.config.json（cap sync 產生，.gitignore 不進倉庫）" : /xiangqi-ios[\\/]appstore/.test(s) ? "沒有 xiangqi-ios/appstore（App Store 上架文案與隱私申報有聯絡人資料，只在開發者電腦）" : /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = e && e.code === "ENOENT" ? why(e.path) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const UA_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 XQQianqiuApp/1";
const UA_WEB = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const lineOf = (src, start) => { const i = src.indexOf(start); assert.ok(i >= 0, "找不到：" + start); return src.slice(i, src.indexOf("\n", i)) };
const PLAT = /Android|Google Play|F-Droid|安卓|Play 商店/;

// ---------- 共用：05-settings.js 的說明文件段（XQDOC～xqDocSheet 之前），跟 test-docs-md.js 同一種取法 ----------
const SET = M("05-settings.js");
function docKit(nat, ua) {
  const code = SET.slice(SET.indexOf("const XQDOC="), SET.indexOf("function xqDocSheet(")).replace(/\{const s=document\.createElement\("style"\)[^\n]*\n/, "");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  return new Function("esc", "provDoc", "window", "navigator", code + ";return{XQDOC,XQDOC_NAT,XQDOC_NATNO,setNat,xqDocShow,xqDocVar,xqDocBtns,xqDocHtml,xqDocLink}")(esc, s => s, { XQ_NATIVE: nat }, { userAgent: ua || UA_WEB });
}
const btnKeys = h => [...h.matchAll(/data-xqdoc="([^"]+)"/g)].map(m => m[1]);

// ---------- 1. 主線未開放章 ----------
test("1 主線：原生 App 不出現「第N章即將開放」、不跳「這一章即將開放」；網頁版照舊", () => {
  const S = M("07mnq-mainquest.js");
  const run = nat => { const toasts = []; const f = new Function("MNQ_CN", "toast", "xqNat", lineOf(S, "const mnqNextTxt=") + "\n" + lineOf(S, "function mnqSoon(){") + "\nreturn{mnqNextTxt,mnqSoon}")(["一", "二", "三"], t => toasts.push(t), () => nat); return { ...f, toasts } };
  const n = { k: "panel", t: "星槎遠征令", soon: 2 };
  const A = run(true), W = run(false);
  assert.equal(A.mnqNextTxt(n), "星槎遠征令");
  assert.equal(W.mnqNextTxt(n), "第二章即將開放");
  A.mnqSoon(); W.mnqSoon();
  assert.deepEqual(A.toasts, []); assert.deepEqual(W.toasts, ["這一章即將開放"]);
  assert.ok(!/toast\("這一章即將開放"\)/.test(S.replace(lineOf(S, "function mnqSoon(){"), "")), "三處都改走 mnqSoon");
  assert.equal((S.match(/mnqSoon\(\)/g) || []).length, 4, "定義一次＋三處呼叫");
  assert.match(S, /\.filter\(r=>!nat\|\|r\.ok\)/, "遠征令面板：原生版只列已開放的章");
  assert.match(S, /航線亮了 \$\{lit\}／\$\{nat\?RT\.length:13\} 盞/);
});

// ---------- 2. 玩家登記預設 ----------
function reportRun(nat, saved) {
  const i = SET.indexOf("async function reportPlayer(){"), j = SET.indexOf("\nsetTimeout(()=>{flushFeedback();reportPlayer()}", i);
  const kit = docKit(nat, nat ? UA_APP : UA_WEB);
  let reached = false;
  const ctx = { OFF: true, FEEDBACK_FORM: { action: "https://example.invalid/form" }, navigator: { webdriver: false, userAgent: nat ? UA_APP : UA_WEB }, window: { XQ_NATIVE: nat },
    location: { hostname: nat ? "localhost" : "raysonchen2023-cloud.github.io" }, fnTest: () => false, fmNetOff: () => false, setNat: kit.setNat,
    store: { get: (k, d) => (k in saved ? saved[k] : d), set() {} }, feedbackInfo: async () => { reached = true; throw new Error("停在這裡") } };
  vm.createContext(ctx); vm.runInContext(SET.slice(i, j), ctx);
  return vm.runInContext("reportPlayer()", ctx).then(() => reached, () => reached);
}
test("2 玩家登記：原生版沒選過＝不送、自己打開才送；網頁版沒選過＝照舊送、關掉不送", async () => {
  assert.equal(await reportRun(true, {}), false, "原生版預設不送");
  assert.equal(await reportRun(true, { repOff: false }), true, "原生版玩家自己打開");
  assert.equal(await reportRun(true, { repOff: true }), false);
  assert.equal(await reportRun(false, {}), true, "網頁版預設照舊送");
  assert.equal(await reportRun(false, { repOff: true }), false);
  assert.match(SET, /rp\.checked=!store\.get\("repOff",typeof setNat==="function"&&setNat\(\)\);/, "開關的初始值跟送出判斷用同一個預設");
  assert.match(SET, /\(\(typeof setNat==="function"&&setNat\(\)\)\?'<b [^>]*>玩家登記預設關閉，你在下面打開「📨 送出玩家登記給開發者」才會送。<\/b>':''\)\+'App 每 7 天/, "隱私卡片在原生版寫明預設關");
  const P = rd("xiangqi-db/art/docs/privacy.md"), kit = docKit(true);
  /* 11/17 iMac G P3-4 起不寫死 iPhone（iPad 也會跑）→「App 版」 */ assert.match(kit.xqDocVar(P, true), /App 版：\*\*預設關閉\*\*/); assert.ok(!/App 版：\*\*預設關閉\*\*/.test(kit.xqDocVar(P, false)), "網頁版隱私說明不出現原生版那句");
});

// ---------- 3. 設定：進階、證據類文件 ----------
test("3 設定：原生版說明文件只留隱私、家長、授權、棋規、聯絡支援；網頁版全部照舊", () => {
  const A = docKit(true, UA_APP), W = docKit(false), Aua = docKit(false, UA_APP);
  assert.deepEqual(btnKeys(A.xqDocBtns()), ["privacy", "family", "credits", "rules", "support"]);
  assert.deepEqual(btnKeys(Aua.xqDocBtns()), ["privacy", "family", "credits", "rules", "support"], "只看 UA 也認得出原生 App");
  assert.deepEqual(btnKeys(W.xqDocBtns()), Object.keys(W.XQDOC));
  for (const k of ["release", "evidence", "funnel", "android", "a11y"]) { assert.equal(A.xqDocShow(k), false, k); assert.equal(W.xqDocShow(k), true, k) }
  assert.match(A.xqDocLink("版本", "release-notes.md"), /^版本$/, "原生版：連到不開的文件只留字");
  assert.match(A.xqDocLink("局例", "rules-cases.md"), /^局例$/, "原生版：不在 XQDOC 的檔只留字");
  assert.match(A.xqDocLink("棋規", "rules.md"), /data-xqdoc="rules"/);
  assert.match(W.xqDocLink("版本", "release-notes.md"), /data-xqdoc="release"/);
  assert.match(W.xqDocLink("局例", "rules-cases.md"), /<a href="data\/docs\/rules-cases\.md"/);
  assert.match(SET, /function xqDocSheet\(k\)\{const d=XQDOC\[k\];if\(!d\|\|!xqDocShow\(k\)\)return;/, "直接叫 xqDocSheet 也開不了");
  assert.match(SET, /\$\{OFF&&!\(typeof setNat==="function"&&setNat\(\)\)\?'<div class="sec-t" data-sm-title="進階"/, "原生版整段進階（開發者模式登入）不出現");
  const A11Y = M("11b-a11y.js");
  assert.match(A11Y, /\+\(\(typeof xqNat==="function"&&xqNat\(\)\)\?`<\/div>`:`<div class="row"[^`]*data-xqdoc="a11y"[^`]*📋 測試與證據<\/button><\/div><\/div>`\)\}/, "無障礙頁的「📋 測試與證據」原生版不放");
});

// ---------- 4. 老闆鍵 ----------
test("4 老闆鍵：原生版開關不出現、快捷鍵不觸發；網頁版照舊", () => {
  const F = M("07fm-focus.js");
  const kit = (nat, saved) => new Function("store", "xqNat", lineOf(F, "function fcmBossNat(){") + "\n" + lineOf(F, "function fcmBossEnabled(){") + "\nreturn fcmBossEnabled")({ get: (k, d) => (k in saved ? saved[k] : d) }, () => nat);
  assert.equal(kit(true, {})(), false); assert.equal(kit(true, { bossKey: true })(), false, "原生版就算存過打開也不觸發");
  assert.equal(kit(false, {})(), true); assert.equal(kit(false, { bossKey: false })(), false);
  assert.match(F, /function fcmBoss\(on\)\{on=!!on;if\(on===FCM\.boss\)return false;if\(on&&fcmBossNat\(\)\)return false;/);
  assert.match(F, /on:fcmBossEnabled\(\)\|\|FCM\.boss/, "Esc 兩下照 fcmBossEnabled");
  assert.match(F, /if\(fcmT3Step\(FCM\.t3,ev\)&&\(fcmBossEnabled\(\)\|\|FCM\.boss\)\)/, "三指點一下照 fcmBossEnabled");
  assert.match(SET, /\$\{\(typeof setNat==="function"&&setNat\(\)\)\?"":`<label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>🙈 老闆鍵<\/b>[^`]*aria-label="老闆鍵"><\/label>`\}/, "設定頁的老闆鍵開關原生版不出現");
});

// ---------- 5. 2.3.10 Android／Google Play／F-Droid ----------
test("5a 震動說明、分享視窗的安裝教學、舊 WebView 提示：原生版不提 Android；網頁版照舊", () => {
  assert.match(SET, /\$\{\(typeof setNat==="function"&&setNat\(\)\)\?"落子、吃子、將軍、點錯時手機震一下（用手機內建的觸覺回饋）":"落子、吃子、將軍、點錯時手機震一下（Android 有效；iPhone 的瀏覽器不支援震動）"\}/);
  const SH = M("02-shell.js");
  assert.match(SH, /\$\{xqNat\(\)\?"":`<p class="muted" style="text-align:center;margin:4px 0 10px">iPhone：Safari 打開 → 分享 →「加入主畫面」<br>Android：Chrome 選單 →「加到主畫面」<br>有新版會自動更新，不用再分享一次。<\/p>`\}/);
  const ow = ua => new Function("navigator", lineOf(SH, "const NATIVE_IOS=") + "\n" + lineOf(SH, "const NATIVE_OLDWV=") + "\nreturn NATIVE_OLDWV")({ userAgent: ua, maxTouchPoints: 5 });   /* 11/17 第 18 輪 E-7：iOS 判斷拆成 NATIVE_IOS */
  assert.ok(!PLAT.test(ow(UA_APP)), "iPhone 原生 App 的提示不提 Android、Play 商店"); assert.match(ow(UA_APP), /iOS/);
  assert.match(ow("Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/133.0 Mobile Safari/537.36 XQQianqiuApp/1"), /Android System WebView/, "Android 原生 App 照舊");
});
const DOCS_ART = "xiangqi-db/art/docs/", DOCS_SITE = fs.existsSync(path.join(ROOT, "xiangqi-lab/site/data/docs")) ? "xiangqi-lab/site/data/docs/" : "../data/docs/";   /* 公開副本（source/）沒有 xiangqi-lab/site：文件在倉庫根目錄 data/docs（線上那份） */
const CHANGED = ["limits.md", "privacy.md", "sound.md", "a11y-tour.md", "architecture.md", "foss.md", "focus-modes.md"];
test("5b 文件標記：web-only／app-only 成對、art 跟 site 兩份一樣；轉換後不留標記", () => {
  const kit = docKit(false);
  for (const f of CHANGED) {
    const a = rd(DOCS_ART + f); assert.equal(a, rd(DOCS_SITE + f), f + " 兩份要一樣");
    for (const t of ["web-only", "app-only"]) assert.equal((a.match(new RegExp("<!--" + t + "-->", "g")) || []).length, (a.match(new RegExp("<!--/" + t + "-->", "g")) || []).length, f + " " + t + " 要成對");
    for (const nat of [true, false]) assert.ok(!/<!--\/?(web|app)-only-->/.test(kit.xqDocVar(a, nat)), f + " 轉換後不留標記");
  }
  // 純函式本身：整行標記連行拿掉（表格不斷開）、行內標記只拿掉那一段
  const T = "| a | b |\n|---|---|\n<!--web-only-->\n| 網 | 頁 |\n<!--/web-only-->\n<!--app-only-->\n| 原 | 生 |\n<!--/app-only-->\n| c | d |\n前<!--web-only-->W<!--/web-only--><!--app-only-->A<!--/app-only-->後";
  assert.equal(kit.xqDocVar(T, true), "| a | b |\n|---|---|\n| 原 | 生 |\n| c | d |\n前A後");
  assert.equal(kit.xqDocVar(T, false), "| a | b |\n|---|---|\n| 網 | 頁 |\n| c | d |\n前W後");
});
test("5c 原生 App 開得到的說明文件都沒有 Android、Google Play、F-Droid、安卓；網頁版 foss.md 照舊", () => {
  const kit = docKit(true, UA_APP);
  const reach = new Set(Object.keys(kit.XQDOC).filter(k => kit.xqDocShow(k)).map(k => kit.XQDOC[k][0] + ".md"));
  for (const f of reach) { const h = kit.xqDocVar(rd(DOCS_SITE + f), true); const m = h.split("\n").find(l => PLAT.test(l)); assert.ok(!m, f + "：" + (m || "").slice(0, 80)) }
  const web = docKit(false).xqDocVar(rd(DOCS_SITE + "foss.md"), false);
  assert.match(web, /F-Droid 缺口：三類/); assert.match(web, /Android 的打算見/);
  assert.equal(web, rd(DOCS_SITE + "foss.md").split("\n").filter(l => !/^<!--\/?(web|app)-only-->$/.test(l)).join("\n").replace(/<!--\/?(web|app)-only-->/g, ""), "網頁版內容跟原本一樣（只拿掉標記）");
});
test("5d m/*.js 的字串常值裡，Android 只剩下：裝置判斷、Android 原生 App 的舊 WebView 提示、網頁版的震動說明、網頁版的 Android 文件按鈕", () => {
  const D = path.join(ROOT, "xiangqi-db/m"), hit = [];
  for (const f of fs.readdirSync(D).filter(f => f.endsWith(".js") && f !== "07i18n.js")) {
    const S = fs.readFileSync(path.join(D, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, a) => a + " ".repeat(m.length - a.length));
    const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g; let m;
    while ((m = re.exec(S))) { const s = m[1] ?? m[2] ?? m[3]; if (PLAT.test(s)) hit.push(f + "｜" + s.slice(Math.max(0, s.search(PLAT) - 20), s.search(PLAT) + 40)) }
  }
  const ok = [/^00-util\.js｜/, /^02-shell\.js｜.*Android System WebVi/, /^05-settings\.js｜📱 Android/, /^05-settings\.js｜.*Android 有效；iPhone 的瀏覽器不支援震動/];
  for (const h of hit) assert.ok(ok.some(r => r.test(h)), "多出來的：" + h);
});

// ---------- 6. 2.1 文件的網頁版說法 ----------
test("6 已知限制、隱私：原生版顯示原生版的寫法；網頁版照舊", () => {
  const kit = docKit(false), L = rd(DOCS_SITE + "limits.md"), P = rd(DOCS_SITE + "privacy.md");
  const La = kit.xqDocVar(L, true), Lw = kit.xqDocVar(L, false), Pa = kit.xqDocVar(P, true), Pw = kit.xqDocVar(P, false);
  for (const s of ["還沒有上架 App Store", "加入主畫面", "還沒在 iPhone 實機上驗過", "瀏覽器支援 WebAssembly"]) { assert.ok(!La.includes(s), "原生版不該有：" + s); assert.ok(Lw.includes(s), "網頁版要有：" + s) }
  assert.match(La, /都在安裝包裡，裝好就能離線下棋/);
  assert.ok(!Pa.includes("在瀏覽器清除這個網站的資料")); assert.ok(Pw.includes("在瀏覽器清除這個網站的資料"));
  assert.ok(Pa.includes("直接刪掉 App 也一樣")); assert.ok(!Pw.includes("直接刪掉 App 也一樣"));
  assert.ok(!Pa.includes("存在瀏覽器快取")); assert.ok(Pw.includes("存在瀏覽器快取"));
  assert.match(SET, /都存在<b>這支手機<\/b>\$\{\(typeof setNat==="function"&&setNat\(\)\)\?"的 App 裡":"的瀏覽器裡"\}/, "關於與授權頁：資料存在哪裡");
  assert.match(SET, /\$\{\(typeof setNat==="function"&&setNat\(\)\)\?"刪掉 App 也一樣":"刪掉 App、或在瀏覽器清除這個網站的資料也一樣"\}/);
  assert.match(SET, /\.then\(t=>\{if\(!b\.isConnected\)return;t=xqDocVar\(t,setNat\(\)\);/, "文件檢視器真的有套 xqDocVar");
});

// ---------- 7. 轉橫向提示 ----------
test("7 星樞棋局直橫皆滿版；塔防原生版不顯示轉向提示", () => {
  const BH = M("07bh-blackhole.js"), TD = M("07bht-td.js");
  assert.doesNotMatch(BH, /手機轉成橫向，黑洞星盤會滿版/, "一般黑洞星樞棋局直橫向均滿版");
  assert.match(TD, /\+\(port&&!\(typeof xqNat==="function"&&xqNat\(\)\)\?"<p>📱 手機轉成橫向，星盤會更大<\/p>":""\)/);
  const tail = (port, nat) => new Function("port", "xqNat", "return \"\"" + TD.match(/\+\(port&&!\(typeof xqNat==="function"&&xqNat\(\)\)\?"<p>📱 手機轉成橫向，星盤會更大<\/p>":""\)/)[0])(port, () => nat);
  assert.equal(tail(true, true), ""); assert.match(tail(true, false), /轉成橫向/); assert.equal(tail(false, false), "");
});

// ---------- 8. 2.5.2 不從 CDN 下載可執行程式碼 ----------
function utilEnv(nat) {
  const U = M("00-util.js"), a = U.indexOf("const XQ_CDN="), b = U.indexOf("},true);", a) + "},true);".length;
  const ctx = { URL, window: { XQ_NATIVE: nat }, navigator: { userAgent: UA_WEB }, location: { href: "https://raysonchen2023-cloud.github.io/xiangqi-lab/#/", origin: "https://raysonchen2023-cloud.github.io", pathname: "/xiangqi-lab/" }, addEventListener() {} };
  vm.createContext(ctx); vm.runInContext(U.slice(a, b), ctx); return ctx;
}
test("8a 00-util：原生版只替 data/ 向 CDN 補抓，engine/ 不補；網頁版 data/、engine/ 都補", () => {
  const A = utilEnv(true), W = utilEnv(false);
  assert.equal(vm.runInContext('xqCdnRel("engine/pikafish.wasm")', A), ""); assert.equal(vm.runInContext('xqCdnRel("engine/pikafish.js")', A), "");
  assert.equal(vm.runInContext('xqCdnRel("data/pset/qin/rR.webp")', A), "data/pset/qin/rR.webp");
  assert.equal(vm.runInContext('xqCdnRel("engine/pikafish.wasm")', W), "engine/pikafish.wasm");
  assert.equal(vm.runInContext('xqCdnRel("data/pset/qin/rR.webp")', W), "data/pset/qin/rR.webp");
  const U = utilEnv(false); U.navigator.userAgent = UA_APP; assert.equal(vm.runInContext('xqCdnRel("engine/pikafish.wasm")', U), "", "只看 UA 也認得出原生 App");
});
function bridgeRun() {
  const calls = [];
  const ctx = { URL, console: { log() {} }, location: { href: "http://127.0.0.1:8321/index.html", origin: "http://127.0.0.1:8321" }, navigator: { userAgent: UA_APP }, Navigator: function () {}, document: { addEventListener() {} }, addEventListener() {},
    Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios", isPluginAvailable: () => false, Plugins: {} } };
  ctx.self = ctx; ctx.window = ctx; ctx.Navigator.prototype = {};
  ctx.fetch = (u) => { u = String(u); calls.push(u); return /xiangqi-cdn\.pages\.dev/.test(u) ? Promise.resolve({ ok: true, url: u }) : Promise.reject(new TypeError("連不上本機")) };
  vm.createContext(ctx); vm.runInContext(rd("xiangqi-ios/src/native-bridge.js"), ctx);
  return { ctx, calls };
}
test("8b native-bridge.js：本機抓不到時，data/ 改抓 CDN，engine/ 照原本的錯誤回報、不向網路要；三份副本一樣", async () => {
  const { ctx, calls } = bridgeRun();
  assert.equal(ctx.XQ_NATIVE, true);
  const r = await vm.runInContext('fetch("data/pset/qin/rR.webp")', ctx); assert.equal(r.url, "https://xiangqi-cdn.pages.dev/data/pset/qin/rR.webp");
  calls.length = 0;
  await assert.rejects(vm.runInContext('fetch("engine/pikafish.wasm")', ctx), /連不上本機/);
  assert.ok(!calls.some(u => /xiangqi-cdn/.test(u)), "engine/ 不能改向 CDN：" + calls.join(","));
  const src = rd("xiangqi-ios/src/native-bridge.js");
  assert.equal(rd("xiangqi-ios/www/native-bridge.js"), src); assert.equal(rd("xiangqi-ios/ios/App/App/public/native-bridge.js"), src);
  const L = JSON.parse(rd("xiangqi-ios/scripts/.www-files.json")).files["native-bridge.js"];
  assert.equal(L[0], fs.readFileSync(path.join(ROOT, "xiangqi-ios/src/native-bridge.js")).length, "check-www.js 用的清單要跟著改");
});

// ---------- 9. 英文殘留 ----------
test("9 開場畫面「⚔ 新的旅程」切英文有翻譯（內建字典，原生、網頁都一樣）", () => {
  const S = M("07i18n.js"), a = S.indexOf("#I18N-PURE-BEGIN"), b = S.indexOf("/* #I18N-PURE-END */"), ctx = {};
  vm.createContext(ctx); vm.runInContext(S.slice(S.indexOf("\n", a) + 1, b) + ";this.R={i18nText}", ctx);
  assert.match(M("05b-save.js"), /id="tNew">⚔ 新的旅程<\/button>/);
  assert.equal(ctx.R.i18nText("⚔ 新的旅程"), "⚔ New Journey");
  for (const s of ["這支手機的 iOS 版本太舊，電腦棋手無法運作；請到「設定 → 一般 → 軟體更新」更新 iOS", "落子、吃子、將軍、點錯時手機震一下（用手機內建的觸覺回饋）", "玩家登記預設關閉，你在下面打開「📨 送出玩家登記給開發者」才會送。",
    "想打開，請家長到「設定房間的 🔒 系統・隱私・家長 → 👪 家長與護眼 → 👧 兒童模式」。", "想打開，請家長到「設定房間的 🔒 系統・隱私・家長 → 👪 家長與護眼 → 🔒 家長修改」。"]) assert.ok(ctx.R.i18nText(s), "新字串要有英文：" + s);
});

// ---------- 10. 原生設定 ----------
test("10 原生設定：loggingBehavior＝none、CFBundleLocalizations 有 en、CAPACITOR_DEBUG 只在 Debug 設定檔", () => {
  for (const p of ["xiangqi-ios/capacitor.config.json", "xiangqi-ios/ios/App/App/capacitor.config.json"]) assert.equal(JSON.parse(rd(p)).loggingBehavior, "none", p);
  const pl = rd("xiangqi-ios/ios/App/App/Info.plist"), arr = pl.match(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/)[1];
  assert.deepEqual([...arr.matchAll(/<string>([^<]+)<\/string>/g)].map(m => m[1]), ["zh-Hant", "en"]);
  assert.match(pl, /<key>CAPACITOR_DEBUG<\/key>\s*<string>\$\(CAPACITOR_DEBUG\)<\/string>/, "建置設定變數，原樣留著");
  assert.match(rd("xiangqi-ios/ios/debug.xcconfig"), /CAPACITOR_DEBUG = true/);
  const pbx = rd("xiangqi-ios/ios/App/App.xcodeproj/project.pbxproj");
  const blocks = [...pbx.matchAll(/\/\* (Debug|Release) \*\/ = \{\s*isa = XCBuildConfiguration;([\s\S]*?)\n\t\t\};/g)];
  assert.ok(blocks.some(b => b[1] === "Release"));
  for (const b of blocks) if (b[1] === "Release") assert.ok(!/debug\.xcconfig/.test(b[2]), "Release 不能吃 debug.xcconfig（正式版 CAPACITOR_DEBUG 是空的，網頁檢查器關著）");
  assert.match(rd("xiangqi-ios/scripts/install-native.js"), /<string>zh-Hant<\/string>\\n\\t\\t<string>en<\/string>/, "重跑 install-native.js 也帶 en");
});

// ---------- 11. 審查備註 ----------
test("11 審查備註：檢舉封鎖、入口名稱照實際畫面，中英都有，4000 字以內", () => {
  const md = rd("xiangqi-ios/appstore/metadata.md"), i = md.indexOf("## 五、App 審查資訊");
  const sec = md.slice(i), blk = sec.slice(sec.indexOf("```") + 3, sec.indexOf("```", sec.indexOf("```") + 3));
  assert.ok([...blk].length <= 4000, "Notes 欄 4000 字：" + [...blk].length);
  assert.ok(!/Long-press/i.test(blk), "舊的「長按檢舉」說法要拿掉");
  /* 11/17 第 18 輪 E-1：備註照實際畫面重寫（沒有底部分頁列、從 🗺 地圖進、全新安裝先到新手練習），名稱跟著換；這裡驗新寫法 */
  assert.match(blk, /Tap a player's name: the profile card ends with "🚩 檢舉" \(Report\) and "🚫 封鎖" \(Block\)/);
  assert.match(blk, /點玩家名字，資料卡最下面有「🚩 檢舉」「🚫 封鎖」/);
  const src = fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).map(f => M(f)).join("\n") + rd("xiangqi-db/m.html");
  for (const s of ["🗺", "象棋千秋總覽", "≡ 顯示全部入口清單", "新手練習", "我會下棋，直接開始", "出發", "👥 同桌對弈", "對弈茶樓", "挑戰電腦", "線上大廳", "服務亭", "📊 檢討", "🚩 檢舉", "🚫 封鎖", "系統・隱私・家長", "👪 家長與護眼", "👧 開啟兒童模式（家長）", "🔒 家長修改",
    "📨 送出玩家登記給開發者", "🗑 申請刪除我在伺服器上的資料", "🗑 刪除這支手機的全部資料", "🎨 素材與授權"]) { assert.ok(blk.includes(s), "備註要寫：" + s); assert.ok(src.includes(s), "畫面上真的有：" + s) }
  for (const s of ["There is no bottom tab bar", "Xiangqi Qianqiu Overview", "Beginner practice", "Battle Teahouse", "Play the computer", "Online lobby", "Service Kiosk", "Report", "Block", "System · Privacy · Parents", "Parents and eye breaks", "Assets and licenses"]) assert.ok(blk.includes(s), "英文：" + s);
});

// ---------- 12. 點擊區 44pt ----------
const HM = M("07z-homemap.js");
const solve = (() => { const a = HM.indexOf("/*R07SOLVE{*/"), b = HM.indexOf("/*}R07SOLVE*/"); return new Function(HM.slice(a, b) + ";return r07Solve")() })();
const ov = (p, q) => Math.min(p.r, q.r) - Math.max(p.l, q.l) > .5 && Math.min(p.b, q.b) - Math.max(p.t, q.t) > .5;
test("12a 首頁入口、設定房間、新手營、意見回饋的場景標籤都是 .shp-spot，07z 的透明點選範圍（至少 44×44、不重疊）照樣套到", () => {
  assert.match(HM, /s\.textContent=`\.shp-spot::before,\.shp-hs::before,\.po-sight::before\{content:"";position:absolute;\n  left:var\(--r7l,min\(-4px,calc\(\(100% - 44px\) \/ 2\)\)\)/);
  assert.match(M("07s2-setmap.js"), /<button class="shp-spot" id="\$\{id\}" aria-label=/, "設定房間的標籤（含 🔒 系統・隱私・家長）");
  assert.match(M("07y2-campmap.js"), /\.camp-page \.shp-spot\.cp-flag\{/, "新手營的課程旗");
  assert.match(HM, /class="shp-spot/, "首頁入口");
});
test("12b 意見回饋：青銅匭三個口、類型小籤加透明點選範圍（看起來不變），算出來不重疊、比原本大", () => {
  const S = M("07s3-feedback.js");
  assert.match(S, /\.fbp-slot::before,\.fbp-ty>button::before,\.fbp-page \.fbp-seal::before\{content:"";position:absolute;left:var\(--r7l,/);
  assert.match(S, /fbpHitBind\(P\);/); assert.match(S, /fbpSlotLay\(L,B,M\)/); assert.match(S, /R=r07Solve\(L,\{b:B,min:M\}\)\.H/);   /* 11/17 第 18 輪 E-5：三個口＋兵印一起排（fbpSlotLay，test-r18-1117.js 驗 44×44），排不出來才退回 r07Solve */
  const css = S.slice(S.indexOf("function fbpCss(){"), S.indexOf("function fbpHit("));
  assert.match(css, /\.fbp-slot\{position:absolute;width:5\.6%;height:2\.4%;/, "三個口的大小沒改");
  assert.ok(!/\.fbp-ty>button\{[^}]*(width|height|padding|margin)/.test(css), "類型小籤只加 position:relative，大小不動");
  const SL = eval(S.match(/const FBP_SLOT=(\[[^\n]*\]);/)[1].replace(/FBP_SHENYUAN/g, '"申冤"'));
  for (const W of [390, 375, 430]) {
    const H = W * 1376 / 768, w = W * .056, h = H * .024;
    const L = SL.map(([, , x, y]) => ({ x: x / 768 * W - w / 2, y: y / 1376 * H - h / 2, w, h }));
    const R = solve(L, { b: { l: 0, r: W, t: 0, b: H } });
    R.H.forEach((q, i) => { assert.ok(q.l <= L[i].x + .01 && q.r >= L[i].x + L[i].w - .01 && q.t <= L[i].y + .01 && q.b >= L[i].y + L[i].h - .01, "要蓋住原本的口"); assert.ok((q.r - q.l) * (q.b - q.t) > L[i].w * L[i].h * 1.5, "點選範圍要變大") });
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(!ov(R.H[i], R.H[j]), `寬 ${W}：第 ${i + 1}、${j + 1} 個口的點選範圍不能重疊`);
    const P = [0, 1, 2].map(i => ({ x: 0, y: i * 27.5, w: 74, h: 23.5 })), RP = solve(P, {});
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(!ov(RP.H[i], RP.H[j]), "類型小籤的點選範圍不能重疊");
    RP.H.forEach(q => assert.ok(q.r - q.l >= 44, "小籤點選範圍至少 44 寬"));
  }
});
test("12c 3D 棋盤鏡頭鈕（34×34、間隔 6）、🎥 視角鈕：透明點選範圍 44 寬、相鄰剛好不重疊；樣式在 06-cpu 自己注入", () => {
  const C = M("06-cpu.js"), css = C.match(/s\.id="pkHitCss";s\.textContent=`([^`]*)`/)[1];
  assert.match(C, /function parkUi\(host,pv\)\{pkHitCss\(\);/); assert.match(C, /zb\.className="fvz";pkHitCss\(\);/);
  assert.match(css, /\.pkview::before\{content:"";position:absolute;left:min\(-4px,calc\(\(100% - 44px\) \/ 2\)\);right:min\(-4px,calc\(\(100% - 44px\) \/ 2\)\);top:min\(-4px,calc\(\(100% - 44px\) \/ 2\)\);bottom:min\(-4px,calc\(\(100% - 44px\) \/ 2\)\)\}/);
  /* W31（11/21）：原生線加了 Android App 專用的 3D 控制列停靠（.pk-control-dock，鏡頭鈕在列裡直接 44×44）；只在 Android App 啟用，網頁照舊 */
  assert.ok(!/(width|height|padding|margin|font)\s*:/.test(css.replace(/::before\{[^}]*\}/g, "").replace(/\.pk-control-dock[^{]*\{[^}]*\}/g, "")), "只加 ::before 和 position:relative，按鈕本身看起來不變（停靠列除外）");
  assert.match(css, /\.pk-control-dock \.pzoom>button\{width:44px!important;height:44px!important\}/, "停靠列裡的鏡頭鈕 44×44");
  assert.match(M("09b-preload.js"), /dockControls:!NET&&!seat&&\/Android\.\*XQQianqiuApp\\\/\/\.test\(navigator\.userAgent\)/, "停靠只在 Android App（同一支手機對弈）啟用，網頁不變");
  const px = re => +css.match(re)[1];
  const side = px(/\.pzoom>button::before,\.fvz>button::before\{[^}]*left:(-?\d+)px/), tb = px(/\.pzoom>button::before,\.fvz>button::before\{[^}]*top:(-?\d+)px/);
  const first = px(/:first-child::before\{top:(-?\d+)px/), last = px(/:last-child::before\{bottom:(-?\d+)px/);
  const B = 34, bd = 1, gap = +C.match(/\.pzoom,\.fvz\{gap:(\d+)px!important\}/)[1], pad = B - 2 * bd;   // ::before 從框線內緣（padding box）起算；11/17 第 18 輪 E-5：間隔 6 → 12（相鄰兩顆的點選範圍才撐得到 44 高）
  assert.equal(gap, 12);
  assert.ok(pad - 2 * tb >= 44, "中間那幾顆也至少 44 高");
  assert.ok(pad - 2 * side >= 44, "寬至少 44");
  assert.ok(2 * (-tb - bd) <= gap, "相鄰兩顆往中間撐的總和不超過間隔（不重疊）");
  assert.ok(pad - tb - first >= 44 && pad - tb - last >= 44, "最上、最下那顆至少 44 高");
  const pv = 29, inset = Math.min(-4, (pv - bd * 0 - 44) / 2); assert.ok(pv - 2 * inset >= 44, "🎥 視角鈕（約 67×29）點選範圍至少 44 高");
});

// ---------- 13. P3 小項 ----------
test("13 大廳安全須知寫實際的按鈕名稱；系統分頁隱私卡片直接有「刪除這支手機的全部資料」（兩版都有，沿用兩次確認）", () => {
  const LB = M("07x4-lobbysafe.js");
  assert.ok(!LB.includes("小鎖匣"), "不再寫小鎖匣");
  assert.match(LB, /「設定房間的 🔒 系統・隱私・家長 → 👪 家長與護眼」可以關閉線上大廳/);
  const ext = JSON.parse(rd("xiangqi-db/i18n-en.json")).en;
  assert.ok(Object.keys(ext).some(k => k.includes("設定房間的 🔒 系統・隱私・家長 → 👪 家長與護眼")), "外掛字典的鍵跟著改");
  assert.equal(rd("xiangqi-db/i18n-en.json"), rd("xiangqi-lab/site/data/i18n-en.json"), "外掛字典兩份一樣");
  assert.match(SET, /\+esc\(srvDelLine\(\)\)\+'<\/div>'\+'<button type="button" class="btn ghost" id="wipeB"[^>]*>🗑 刪除這支手機的全部資料<\/button>'\+'<label/, "不分原生、網頁都放");
  assert.match(SET, /const wb=v\.querySelector\("#wipeB"\);if\(wb\)wb\.onclick=\(\)=>\{vibrate\(5\);wipeAsk\(\)\};/, "沿用 wipeAsk（確認兩次）");
  assert.match(SET, /function wipeAsk\(\)\{[\s\S]*?\["下一步",\(\)=>setTimeout\(wipeAsk2,120\)\]/);
  assert.match(rd(DOCS_SITE + "privacy.md"), /設定「🔒 系統・隱私・家長」的隱私卡片、「📜 關於與開源授權」裡也有同一顆/);
});
