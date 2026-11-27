// 11/17 開發者選單「第一次打開時介面語言照系統語言」（原生 App、網頁版都一樣）：m.html 開頭那段（XQ_LANG_OF）只在還沒有任何存檔時決定一次。
// 另外：審查備註的語言說明、iOS 包排除 data/docs/android.md、原生回前景重驗通過印一行。不開瀏覽器，vm／純計算。
// 用法：node --test xiangqi-lab/tools/test-lang-default-1117.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const ROOT = path.join(__dirname, "..", "..");
/* 11/18 公開證據（0319）：公開副本（ROOT 有 STAGE-MANIFEST.json）沒有 xiangqi-ios、xiangqi-lab/site、xiangqi-lab/src 的支援／隱私頁、xiangqi-db/art/docs、xiangqi-db/i18n-en.json（只放 CDN）。
   site 的檔、文件原稿、支援／隱私頁退回倉庫根目錄那一份（跟線上同一份：../、../data/docs/、../support.html）；還是找不到的子測試照實標略過、寫原因。開發者電腦上（沒有 STAGE-MANIFEST.json）照常跑，缺檔照樣失敗 */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json")) || process.env.XQ_PUBLIC_COPY === "1";   /* 公開副本：倉庫的 source/run-tests.js 會設 XQ_PUBLIC_COPY=1（W69 盤點高 7：以前用「沒有 xiangqi-ios」判斷，run-tests 複製 iOS 後就判錯） */
function alt(p) { p = String(p); if (!PUB || fs.existsSync(path.join(ROOT, p))) return p;
  for (const [re, to] of [[/^xiangqi-lab\/site\//, "../"], [/^xiangqi-db\/art\/docs(\/|$)/, "../data/docs$1"], [/^xiangqi-lab\/src\/(support|privacy)\.html$/, "../$1.html"]]) if (re.test(p)) { const q = p.replace(re, to); if (fs.existsSync(path.join(ROOT, q))) return q }
  return p }
function skipMissing(t0) {
  const why = p => { const s = String(p || "").split(String.fromCharCode(92)).join("/");
    return /xiangqi-ios[\\/](www([\\/]|$)|ios[\\/]App[\\/]App[\\/](public([\\/]|$)|capacitor\.config\.json))/.test(s) ? "沒有 iOS 建置產物 xiangqi-ios/www、ios/App/App/public、capacitor.config.json（cap sync 產生，.gitignore 不進倉庫）" : /xiangqi-ios[\\/]appstore/.test(s) ? "沒有 xiangqi-ios/appstore（App Store 上架文案與隱私申報有聯絡人資料，只在開發者電腦）" : /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /xiangqi-lab\/(site|src)\//.test(s) ? "沒有 " + s.slice(s.indexOf("xiangqi-lab/")) + "（公開副本不含）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = PUB && e && e.code === "ENOENT" ? (why(e.path) || "公開副本沒有這個檔：" + String(e.path || "").split(String.fromCharCode(92)).join("/").split("/").slice(-2).join("/")) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const HTML = rd("xiangqi-db/m.html");
const LANG_JS = (() => { const i = HTML.indexOf("window.XQ_LANG_OF=f"), a = HTML.lastIndexOf("<script>", i), b = HTML.indexOf("</script>", i); assert.ok(i > 0 && a > 0 && b > i, "m.html 有第一次打開的語言判斷"); return HTML.slice(a + 8, b) })();

/* 跑一次「打開 App」：store＝localStorage 初始內容，nav＝navigator */
function boot(store, nav, opts) {
  opts = opts || {};
  const ls = new Map(Object.entries(store || {})), ss = new Map(), soft = [];
  const localStorage = { get length() { return ls.size }, key: i => [...ls.keys()][i] ?? null, getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const win = { localStorage, sessionStorage: { setItem: (k, v) => ss.set(k, v), getItem: k => ss.get(k) ?? null }, navigator: nav || {}, JSON };
  if (!opts.noSave) win.XQSave = { soft: (k, v) => { soft.push(k); localStorage.setItem(k, v) } };
  win.window = win; vm.createContext(win); vm.runInContext(LANG_JS, win);
  return { ls: Object.fromEntries(ls), ss: Object.fromEntries(ss), soft, auto: win.XQ_LANG_AUTO, of: win.XQ_LANG_OF };
}

test("系統語言對照：iMac 實測的四種（en-US、zh-TW、zh-CN、ja）和 iPad／Mac 不帶地區的 zh-Hant；兩層判斷", () => {
  const of = boot({ m_x: "1" }, {}).of;
  const T = { "en-US": "en", "zh-TW": "tw", "zh-CN": "cn", "ja": "en", "zh-Hant": "tw",
    "zh-HK": "tw", "zh-MO": "tw", "zh-Hant-TW": "tw", "zh-Hant-HK": "tw", "zh_TW": "tw", "ZH-tw": "tw",
    "zh-SG": "cn", "zh-Hans": "cn", "zh-Hans-CN": "cn", "zh": "cn", "zh-MY": "cn",
    "en": "en", "en-GB": "en", "fr-FR": "en", "ko-KR": "en", "": "en" };
  for (const [k, v] of Object.entries(T)) assert.equal(of(k), v, k);
  assert.ok(LANG_JS.includes('return/^zh[-_](tw|hk|mo|hant)/i.test(t)?"tw":/^zh/i.test(t)?"cn":"en"'), "兩層：繁中 → 其他 zh 簡中 → 其他英文");
});

test("第一次打開（沒有任何存檔）：英文系統 → English；繁中系統 → 繁中（不寫）；簡中系統 → 簡中（zh.js 的 xq_zhMode）；都記 m_langAuto，用 XQSave.soft 寫", () => {
  { const r = boot({}, { languages: ["en-US"], language: "en-US" }); assert.equal(r.ls.m_lang, '"en"'); assert.equal(r.ls.m_langAuto, '"en"'); assert.equal(r.ls.xq_zhMode, undefined); assert.equal(r.ss.xqLangAuto, "1"); assert.deepEqual(r.soft.sort(), ["m_lang", "m_langAuto"]) }
  { const r = boot({}, { languages: ["zh-TW"], language: "zh-TW" }); assert.equal(r.ls.m_lang, undefined); assert.equal(r.ls.xq_zhMode, undefined); assert.equal(r.ls.m_langAuto, '"tw"') }
  { const r = boot({}, { languages: ["zh-CN"], language: "zh-CN" }); assert.equal(r.ls.xq_zhMode, '"cn"'); assert.equal(r.ls.m_lang, undefined); assert.equal(r.ls.m_langAuto, '"cn"') }
  { const r = boot({}, { languages: ["ja"], language: "ja" }); assert.equal(r.ls.m_lang, '"en"', "日文系統（App 沒有日文）→ 英文") }
  { const r = boot({}, { languages: ["zh-Hant"] }); assert.equal(r.ls.m_langAuto, '"tw"', "iPad／Mac 不帶地區") }
  { const r = boot({}, { languages: [], language: "en-US" }); assert.equal(r.ls.m_lang, '"en"', "languages 是空的就看 language") }
  { const r = boot({}, { languages: ["en-US"] }, { noSave: true }); assert.equal(r.ls.m_lang, '"en"', "沒有 XQSave（IndexedDB 不能用）時直接寫 localStorage") }
  /* 07i18n 讀得到：store "lang"＝localStorage m_lang（JSON）；zh.js 讀 xq_zhMode（JSON） */
  assert.ok(rd("xiangqi-db/m/00-util.js").includes('const store={get(k,d){try{const v=localStorage.getItem("m_"+k);return v==null?d:JSON.parse(v)}'));
  assert.ok(rd("xiangqi-db/m/07i18n.js").includes('function i18nLang(){try{return store.get("lang",null)==="en"?"en":"zh"}catch(e){return"zh"}}'));
  assert.ok(rd("xiangqi-lab/site/zh.js").includes('const mode=()=>{try{return JSON.parse(localStorage.getItem("xq_zhMode"))||"tw"}catch(e){return"tw"}};'));
});

test("選過語言的、老玩家（已經有存檔）、已經自動決定過的：一律不動", () => {
  const nav = { languages: ["en-US"], language: "en-US" };
  for (const st of [{ m_lang: '"en"' }, { xq_zhMode: '"tw"' }, { xq_zhMode: '"cn"' }, { m_xp: "120" }, { xq_me: '{"id":"x"}' }, { m_langAuto: '"tw"' }, { m_hmSea: '"autumn"', m_cpuRanked: "true" }]) {
    const r = boot(st, nav); assert.deepEqual(r.ls, st, JSON.stringify(st)); assert.equal(r.soft.length, 0); assert.equal(r.auto, undefined);
  }
  /* 跟 App 無關的鍵（別的網頁、外掛寫的）不算存檔 */
  { const r = boot({ "CapacitorStorage.x": "1", foo: "1" }, nav); assert.equal(r.ls.m_lang, '"en"') }
  /* 07i18n 的「建議英文」提示：自動選過（m_langAuto）就不再跳 */
  assert.ok(rd("xiangqi-db/m/07i18n.js").includes('function i18nSuggest(){try{if(localStorage.getItem("m_lang")!=null||localStorage.getItem("m_langAuto")!=null)return null;'));
});

test("順序：存檔雙份那段之後、zh.js 和主程式之前；存檔被系統清掉的老玩家，從 IndexedDB 搬回來時自動選的語言不算數", () => {
  const iSave = HTML.indexOf("window.XQSave="), iLang = HTML.indexOf("window.XQ_LANG_OF=f"), iMain = HTML.indexOf('<script>\n"use strict";');
  assert.ok(iSave > 0 && iSave < iLang && iLang < iMain, "XQSave → 語言 → 主程式");
  assert.ok(rd("xiangqi-lab/tools/build-site.js").includes('rep(`<script>\\n"use strict";`,`<script>window.XQ_OFFLINE=true;'), "zh.js 由 build-site 插在主程式前面（語言判斷之後）");
  assert.ok(HTML.includes('if(sessionStorage.getItem("xqLangAuto")){["m_lang","xq_zhMode","m_langAuto"].forEach(function(k){try{if(K.indexOf(k)<0)oR.call(localStorage,k)}catch(e){}})}'));
  const iRm = HTML.indexOf('if(sessionStorage.getItem("xqLangAuto"))'), iCopy = HTML.indexOf("miss.forEach(function(j){try{oS.call(localStorage,K[j],V[j])}");
  assert.ok(iRm > 0 && iRm < iCopy, "先拿掉自動選的，再從 IndexedDB 搬回來");
  /* 每段 inline script 都能解析 */
  const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(HTML))) if (!m[1].includes("//#include")) new Function(m[1]);
});

test("審查備註：改成「照手機系統語言、要看中文到設定切換」，中英都有；CRLF 也在 4000 字內", () => {
  const md = rd("xiangqi-ios/appstore/metadata.md"), i = md.indexOf("## 五、App 審查資訊"), sec = md.slice(i), blk = sec.slice(sec.indexOf("```") + 3, sec.indexOf("```", sec.indexOf("```") + 3));
  assert.ok(blk.includes('Language: follows the device (English device → English). For Chinese: Settings (step 3) → globe icon at top right → "繁體中文".'));
  assert.ok(blk.includes("語言：照手機語言（英文系統用英文）。要看中文：「設定」→ 右上角地球儀 →「繁體中文」。"));
  assert.ok(!blk.includes("the app starts in Traditional Chinese") && !blk.includes("預設繁體中文"), "舊說法拿掉");
  /* 字數用 .length（UTF-16，emoji 算 2；跟 test-r19、test-r20-dbe 同一套，比較保守） */
  assert.ok(blk.length <= 4000 && blk.replace(/\n/g, "\r\n").length <= 4000, "4000 字：" + blk.replace(/\n/g, "\r\n").length);
  /* 標題寫的字數照 test-r19 的切法（```Thank you 到結尾 ```，不含前後換行） */
  const a = md.indexOf("```\nThank you"), b = md.indexOf("\n```", a + 3), N = md.slice(a + 4, b);
  const n = md.match(/目前 (\d+) 字（Windows 換行算 (\d+) 字）/); assert.equal(+n[1], N.length); assert.equal(+n[2], N.replace(/\n/g, "\r\n").length);
  assert.ok(rd("xiangqi-db/m/05-settings.js").includes('["tw","繁體中文","zh-Hant"]') || rd("xiangqi-db/m/07i18n.js").includes('["tw","繁體中文","zh-Hant"]'), "語言選單真的有「繁體中文」");
});

test("iOS 包排除 data/docs/android.md（網頁版照舊）；其他說明文件照包", () => {
  const C = rd("xiangqi-ios/scripts/copy-www.js"), s = C.slice(C.indexOf("const SKIP = ["), C.indexOf("];", C.indexOf("const SKIP = [")) + 2);
  const SKIP = vm.runInNewContext(s.replace("const SKIP = ", "").replace(/;s*$/, ""));
  const skip = r => SKIP.some(x => x.test(r));
  assert.ok(skip("data/docs/android.md")); for (const r of ["data/docs/privacy.md", "data/docs/a11y.md", "data/docs/android-x.md", "index.html", "data/i18n-en.json"]) assert.ok(!skip(r), r);
  assert.ok(rd("xiangqi-db/m/05-settings.js").includes('XQDOC_NATNO=["release","evidence","funnel","android","a11y"]'), "原生版本來就不出 Android 說明的按鈕");
});

test("原生：回前景重驗通過在 console 印一行；check-native.js 全部通過", () => {
  const vc = rd("xiangqi-ios/native/ios/XQBridgeViewController.swift");
  assert.ok(vc.includes('if foregroundRecheck { NSLog("[XQLoopback] 回前景重驗通過（%@）", XQLoopbackServer.shared.origin) }'));
  assert.ok(vc.includes("if self.phase == .running { self.foregroundRecheck = true }"));
  assert.ok(!vc.includes("XQ_SYS_LANG"), "不從 Swift 傳系統語言（iMac 實測 navigator.language 就是系統語言）");
  assert.equal(rd("xiangqi-ios/ios/App/App/XQBridgeViewController.swift"), vc, "兩份一樣");
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, "xiangqi-ios/scripts/check-native.js")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /全部 \d+ 項通過/);
});
