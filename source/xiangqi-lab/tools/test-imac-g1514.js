// 11/17 iMac 測試員 G（iPad Air 11、原生 1514）：G-1 名帖「檢舉」看不見、G-2 相機權限說明照實際用途、G-4 文件裡的 Game Center／小工具照建置內容、#/fbadmin 原生版擋掉。
// 不開瀏覽器，vm／純計算；畫面上的實際顏色、大小請 iMac 複驗。
// 用法：node --test xiangqi-lab/tools/test-imac-g1514.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const IOS = path.join(ROOT, "xiangqi-ios"), HAS_IOS = fs.existsSync(IOS), SKIP_IOS = HAS_IOS ? false : "沒有 xiangqi-ios";

/* WCAG 對比 */
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) };

test("G-1（P1）：名帖的「🚩 檢舉」「🚫 封鎖」「解除封鎖」鈕自帶深底淺字＋框線，不管名帖底色都看得清楚（對比 ≥ 4.5:1）、高 44；網頁版同一支程式", () => {
  const X = M("07x4-lobbysafe.js");
  const rep = X.match(/#sheet \.lbs-row button\[data-lbs\],\.lbs-row button\[data-lbs\]\{min-height:(\d+)px;[^}]*border:2px solid (#[0-9A-F]{6})!important;background:(#[0-9A-F]{6})!important;color:(#[0-9A-F]{6})!important;opacity:1!important\}/i); assert.ok(rep, "檢舉鈕規則");
  const blk = X.match(/\.lbs-row button\[data-lbs="un"\]\{border-color:(#[0-9A-F]{6})!important;background:(#[0-9A-F]{6})!important;color:(#[0-9A-F]{6})!important\}/i); assert.ok(blk, "封鎖／解除封鎖鈕規則");
  assert.ok(+rep[1] >= 44, "高 44");
  const r1 = ratio(rep[4], rep[3]), r2 = ratio(blk[3], blk[2]); assert.ok(r1 >= 4.5 && r2 >= 4.5, `檢舉 ${r1.toFixed(1)}:1、封鎖 ${r2.toFixed(1)}:1`);
  /* G 量到的舊顏色：字 rgb(30,19,12) 疊在 rgb(31,26,21) 上，對比只有 1.1:1 */
  assert.ok(ratio("#1E130C", "#1F1A15") < 1.2);
  /* 鈕的底色本身在淺色名帖、深色名帖上都看得出邊（框線跟名帖底色也有對比） */
  for (const bg of ["#1F1A15", "#F6EFE2"]) assert.ok(ratio(rep[2], bg) >= 1.5 || ratio(rep[3], bg) >= 3, "檢舉鈕在 " + bg + " 上看得出來");
  /* 新規則在原本規則後面、而且 !important，蓋得過原本的 background:var(--card);color:inherit */
  assert.ok(X.indexOf("#sheet .lbs-row button[data-lbs],.lbs-row button[data-lbs]{") > X.indexOf(".lbs-row button{font:inherit;"));
  assert.ok(X.includes('`<button type="button" data-lbs="rep">🚩 檢舉</button><button type="button" data-lbs="blk">🚫 封鎖</button>`'), "鈕還在、字照舊");
});

test("G-2（P1）：相機權限說明照實際用途（意見回饋附圖選「拍照」）；換手機掃 QR 已經沒有入口；四個地方一致", { skip: SKIP_IOS }, () => {
  const ZH = "在「意見回饋」附上圖片時，如果選「拍照」，會用相機拍一張附在回饋裡。照片只在你按下送出時，隨回饋一起傳給開發者。";
  const EN = "Used only if you choose “Take Photo” when attaching a picture to Feedback. The photo is sent with your feedback only when you tap Send.";
  const P = rd("xiangqi-ios/ios/App/App/Info.plist"); assert.ok(P.includes("<key>NSCameraUsageDescription</key>\n\t<string>" + ZH + "</string>"));
  assert.ok(rd("xiangqi-ios/ios/App/App/zh-Hant.lproj/InfoPlist.strings").includes('"NSCameraUsageDescription" = "' + ZH + '";'));
  assert.ok(rd("xiangqi-ios/ios/App/App/en.lproj/InfoPlist.strings").includes('"NSCameraUsageDescription" = "' + EN + '";'));
  assert.ok(rd("xiangqi-ios/scripts/install-native.js").includes('addKey("NSCameraUsageDescription", "<string>' + ZH + '</string>");'));
  for (const f of ["ios/App/App/Info.plist", "ios/App/App/zh-Hant.lproj/InfoPlist.strings", "ios/App/App/en.lproj/InfoPlist.strings", "scripts/install-native.js", "appstore/app-privacy.md"]) assert.ok(!/掃描舊手機|scan the QR code on your old phone|只在掃 QR 時用/.test(rd("xiangqi-ios/" + f)), "舊說法拿掉：" + f);
  /* 實際用到相機的地方：意見回饋的 <input type=file accept=image/*>（iOS 會給「拍照」選項）；getUserMedia 掃 QR 只在 connectSheet 裡，而 connectSheet 沒有任何地方叫它 */
  const all = fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js")).map(f => [f, M(f)]);
  assert.ok(M("05-settings.js").includes('<input type="file" id="fi" accept="image/*" multiple hidden>'));
  const gum = all.filter(([, s]) => s.includes("getUserMedia")).map(([f]) => f); assert.deepEqual(gum, ["02-shell.js"]);
  const callers = all.reduce((n, [, s]) => n + (s.match(/connectSheet\(\)/g) || []).length, 0); assert.equal(callers, 1, "connectSheet 只有定義、沒人呼叫");
  assert.ok(!all.some(([, s]) => /capture=/.test(s)), "沒有 capture 屬性的直接拍照");
  assert.match(rd("xiangqi-ios/appstore/app-privacy.md"), /相機只在「意見回饋」附圖時選「拍照」才用/);
});

/* G-4 */
const G = M("07gc-native.js"), feat = vm.runInNewContext(between(G, "function gcnDocFeat(t,keep){", "\ntry{if(typeof xqDocVar") + ";gcnDocFeat");
const S = M("05-settings.js"), xqDocVar = vm.runInNewContext(between(S, "function xqDocVar(", "function xqDocBtns(") + ";xqDocVar");
test("G-4：隱私、家長文件裡的 Game Center、桌面小工具，只在原生 App 真的有那個外掛（XQNative.has）時才顯示；目前的建置兩個都沒有 → 不寫", () => {
  const P = rd("xiangqi-lab/site/data/docs/privacy.md"), F = rd("xiangqi-lab/site/data/docs/family.md");
  assert.equal(P, rd("xiangqi-db/art/docs/privacy.md")); assert.equal(F, rd("xiangqi-db/art/docs/family.md"));
  const show = (t, k) => xqDocVar(feat(t, k), true);
  /* 都沒有（目前送審的建置） */
  for (const t of [P, F]) { const o = show(t, { gc: false, widget: false }); assert.ok(!/Game Center|今日茶單|桌面小工具/.test(o), "不寫 Game Center、小工具"); assert.ok(!/gc-only|widget-only/.test(o), "標記都拿乾淨") }
  assert.match(show(P, { gc: false, widget: false }), /### 13\. 每日提醒（只有 App 版）/);
  assert.match(show(P, { gc: false, widget: false }), /每日提醒（每日同題頁下方「🔔 每天提醒我做每日同題」）/, "每日提醒照寫");
  assert.match(show(F, { gc: false, widget: false }), /- 每日提醒是裝置本機通知：本來就不經過伺服器/);
  /* 只有 Game Center／只有小工具／都有 */
  { const o = show(P, { gc: true, widget: false }); assert.match(o, /### 13\. Game Center 成就、每日提醒（只有 App 版）/); assert.ok(!/今日茶單/.test(o)); assert.match(o, /第 13 項 Game Center 成就不回報/) }
  { const o = show(P, { gc: false, widget: true }); assert.match(o, /### 13\. 每日提醒、桌面小工具（只有 App 版）/); assert.ok(!/Game Center/.test(o)); assert.match(o, /今日茶單/) }
  { const o = show(P, { gc: true, widget: true }); assert.match(o, /### 13\. Game Center 成就、每日提醒、桌面小工具（只有 App 版）/) }
  /* 網頁版本來就看不到（包在 app-only 裡） */
  for (const t of [P, F]) { const w = xqDocVar(feat(t, { gc: true, widget: true }), false); assert.ok(!/Game Center|今日茶單/.test(w)) }
  /* 判斷照外掛：原生 App＋XQNative.has；包一層 xqDocVar（文件顯示前都經過它） */
  assert.ok(G.includes('function gcnHasPlug(n){try{const N=window.XQNative;return!!(gcnNat()&&N&&typeof N.has==="function"&&N.has(n))}catch(e){return false}}'));
  assert.ok(G.includes('keep=keep||{gc:gcnHasPlug("XQGameCenter"),widget:gcnHasPlug("XQWidgetData")}'));
  assert.ok(G.includes('try{if(typeof xqDocVar==="function"&&!xqDocVar.__gcn){const f0=xqDocVar;xqDocVar=function(t,nat){return xqDocEnNote(f0(xqDocClean(gcnDocFeat(t)),nat))};xqDocVar.__gcn=1}}catch(e){}'));   /* D Y7：外面再包英文說明 */   /* 11/17 I P1-3：中間多一層 xqDocClean（藏開發用內容） */
  assert.ok(S.includes("t=xqDocVar(t,setNat());"), "05-settings 顯示文件前叫 xqDocVar（沒改 05-settings）");
});
test("G-4：審查備註、App 隱私申報照建置內容：Notes 不寫 Game Center、小工具（另外放「裝了 --gc-widget 才換上」那一段）；申報表標註只有那種建置才有", { skip: SKIP_IOS }, () => {
  const s = rd("xiangqi-ios/appstore/metadata.md"), a = s.indexOf("```\nThank you"), b = s.indexOf("\n```", a + 3), N = s.slice(a + 4, b);
  assert.ok(!/Game Center|今日茶單|Today's tea/.test(N), "Notes 不寫");
  assert.ok(N.includes('Native 原生功能: Daily reminder (local notification):') && N.includes("每日提醒在每日同題頁下方。"));
  assert.ok(N.length <= 4000 && N.replace(/\n/g, "\r\n").length <= 4000);
  assert.ok(s.includes("目前 " + N.length + " 字（Windows 換行算 " + N.replace(/\n/g, "\r\n").length + " 字），上限 4000"));
  const after = s.slice(b); assert.match(after, /只有裝了 `node scripts\/install-native\.js --gc-widget`/); assert.ok(after.includes("Game Center achievements") && after.includes("今日茶單"));
  const AP = rd("xiangqi-ios/appstore/app-privacy.md");
  assert.ok(AP.includes("**Game Center 成就**（11/17 第 19 輪補，privacy.md 第 13 項；**只有裝了 --gc-widget 的建置才有**") && AP.includes("**桌面小工具「今日茶單」**（**只有裝了 --gc-widget 的建置才有**"));
});
test("#/fbadmin：原生 App 直接擋掉（回首頁），網頁版照舊", () => {
  const SH = M("02-shell.js");
  assert.ok(SH.includes('if(p[0]==="fbadmin"){if(typeof xqNat==="function"&&xqNat()){navReplace("#/");return}return screen=FbAdmin(v)}'));
  const ctx = { log: [], navReplace: h => ctx.log.push("go " + h), FbAdmin: () => (ctx.log.push("admin"), {}) };
  for (const nat of [true, false]) { ctx.log = []; ctx.xqNat = () => nat; vm.createContext(ctx); vm.runInContext("var screen;function r(p,v){" + 'if(p[0]==="fbadmin"){if(typeof xqNat==="function"&&xqNat()){navReplace("#/");return}return screen=FbAdmin(v)}' + "}r(['fbadmin'],{})", ctx); assert.deepEqual(ctx.log, nat ? ["go #/"] : ["admin"]) }
});

/* ======================= 開發者 D1／D2、G 的 P3 ======================= */
test("D1：關於頁的開發者寫「Hung-Sheng Chen」（跟 App Store 賣家名稱一致）；玩家看得到的地方不再有 hungshengc", () => {
  const S = M("05-settings.js"); assert.ok(S.includes('${aboutK("開發者")}<b>Hung-Sheng Chen</b>') && !S.includes("<b>hungshengc</b>"));
  for (const f of fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js"))) assert.ok(!M(f).includes("hungshengc"), f);
  for (const d of ["privacy.md", "family.md"]) assert.ok(!rd("xiangqi-lab/site/data/docs/" + d).includes("hungshengc"));
  if (HAS_IOS) for (const f of ["appstore/metadata.md", "appstore/app-privacy.md"]) assert.ok(!rd("xiangqi-ios/" + f).includes("hungshengc"), f);
});
test("D2：原生 App 三個匿名開關（卡住的地方、對局評分、學習進度）全新安裝預設關；已經有存檔的照原本（開著）；自己切過的不動；網頁版照舊", () => {
  const B = M("05b-save.js"), src = between(B, "function anonNatDefault(){", "\nanonNatDefault();");
  const run = (nat, fresh, init) => { const S = new Map(Object.entries(init || {})); const ctx = { window: { XQ_LANG_AUTO: fresh ? "en" : undefined }, xqNat: () => nat, store: { get: (k, d) => S.has(k) ? S.get(k) : d, set: (k, v) => S.set(k, v) } };
    vm.createContext(ctx); vm.runInContext(src + ";this.f=anonNatDefault", ctx); ctx.f(); return Object.fromEntries(S) };
  assert.deepEqual(run(true, true), { stkOff: true, cpuAnonOff: true, learnAnonOff: true }, "原生全新安裝：三個都關");
  assert.deepEqual(run(true, false), { stkOff: false, cpuAnonOff: false, learnAnonOff: false }, "原生老玩家：寫成開（照原本）");
  assert.deepEqual(run(true, true, { cpuAnonOff: false }), { cpuAnonOff: false, stkOff: true, learnAnonOff: true }, "自己切過的不動");
  assert.deepEqual(run(false, true), {}, "網頁版不動（照舊預設開）");
  /* 設定頁讀法：!store.get(…Off,false) → 寫成 true 就是關 */
  const S = M("05-settings.js"); assert.ok(S.includes('ca.checked=!store.get("cpuAnonOff",false)') && S.includes('lr.checked=!store.get("learnAnonOff",false)'));
  /* 文件：App 版寫預設關；App 隱私申報保留並寫理由 */
  const P = rd("xiangqi-lab/site/data/docs/privacy.md");
  for (const sw of ["📍 匿名記錄卡住的地方", "📊 匿名送出對局評分", "📈 匿名送出學習進度"]) { const nat = xqDocVar(feat(P, { gc: false, widget: false }), true), web = xqDocVar(P, false);
    assert.ok(nat.includes("App 版：**預設關閉**；你在設定 →「🔒 系統・隱私・家長」→ 隱私打開「" + sw + "」才會送"), sw); assert.ok(!web.includes("App 版：**預設關閉**；你在設定 →「🔒 系統・隱私・家長」→ 隱私打開「" + sw), "網頁版不出現：" + sw) }
  assert.match(xqDocVar(P, true), /### 3\. 匿名卡關訊號（App 版預設關，你打開才送）/); assert.match(xqDocVar(P, false), /### 3\. 匿名卡關訊號（預設開，可以關）/);
  if (HAS_IOS) { assert.match(rd("xiangqi-ios/appstore/app-privacy.md"), /申報照樣保留這幾項：Apple 的規則是「App 會收集的資料」都要申報/);
    assert.match(rd("xiangqi-ios/appstore/metadata.md"), /So are the three anonymous-data switches/) }
});
/* G P3-1 11/17 升 P2：改成「需要時才抓」，完整驗收在 test-netfetch-1117.js；這裡只留 fetch 共用（同一次開 App 只真的抓一次）和文件新說法 */
test("G P3-1：第 9 項寫「送過回饋才在開 App 時抓修正清單、進大廳才抓停權名單」；同一個資料檔同一次開 App 只真的抓一次", async () => {
  const P = rd("xiangqi-lab/site/data/docs/privacy.md"); assert.ok(xqDocVar(P, true).includes("如果你送過意見回饋，App 開啟時會從 Cloudflare 下載一次修正清單和開發者回覆") && xqDocVar(P, true).includes("會從 GitHub Pages 下載一次停權名單"));
  const U = M("00-util.js"), i = U.indexOf("(function(){try{const f0=typeof window!==\"undefined\"&&window.fetch;if(!f0||f0.__xqDedupe)return;"), j = U.indexOf("})();", i) + 5;
  let n = 0; class Resp { constructor(b) { this.b = b; this.ok = true } clone() { return new Resp(this.b) } }
  const win = { fetch: (u) => { n++; return Promise.resolve(new Resp(String(u))) } }; const ctx = { window: win, Date }; vm.createContext(ctx); vm.runInContext(U.slice(i, j), ctx);
  const a = await win.fetch("data/fixes.json?v=1"), b = await win.fetch("data/fixes.json?v=1"), c = await win.fetch("data/quiz.json");
  assert.equal(n, 2, "fixes.json 只抓一次，別的檔照常"); assert.notEqual(a, b, "各拿一份 clone");
  const d = await win.fetch("data/fixes.json?v=2"); assert.equal(n, 2, "過了 30 秒也一樣（同一次開 App）"); assert.notEqual(d, a);
  assert.ok(M("05-settings.js").includes('fetch("data/fixes.json?v="') && M("07s3-feedback.js").includes('fetch("data/fixes.json?v="'), "兩個地方各自抓（原因）");
});
test("G P3-2／P3-3：設定房間的「🔒 隱私・家長」寫出字；文牒 ✕、名冊 ✕、「隱私說明 ›」可點範圍撐到 44", () => {
  assert.ok(M("07s2-setmap.js").includes('["smLock",67,40.8,"🔒 隱私・家長","more","#dm"]'));
  /* 00-util 的 SAFE_LR_CSS 是樣板字串：先取出來執行，拿到真正的 CSS 再比 */
  const U = M("00-util.js"), css = vm.runInNewContext(between(U, "const SAFE_LR_CSS=", "`;   /*").replace("const SAFE_LR_CSS=", "") + "`");   /* 11/17 之後 SAFE_LR_CSS 後面還接了 TAP44_CSS 等，切到樣板字串結尾為止 */
  for (const s of [".hq-h button{min-width:44px;min-height:44px}", '.hq-pv::after{content:"";position:absolute;left:-8px;right:-8px;top:50%;height:44px;', '.mf-zx::after{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;']) assert.ok(css.includes(s), s);
  { const I = M("07i18n.js"), ctx = {}; vm.createContext(ctx); const a = I.indexOf("#I18N-PURE-BEGIN"), b = I.indexOf("/* #I18N-PURE-END */");
    vm.runInContext(I.slice(I.indexOf("\n", a) + 1, b) + ";this.T=i18nText", ctx); assert.equal(ctx.T("🔒 隱私・家長"), "🔒 Privacy", "內建字典（英文第一個畫面就有）") }
});
test("G P3-4／P3-5／P3-6／P3-8／P3-9／P3-10：不寫死 iPhone、換手機路徑、App 版藏開發用字、入口標籤在角色上面、回棋鎮回首頁、地圖頁狀態列深色字", () => {
  const P = rd("xiangqi-lab/site/data/docs/privacy.md"), F = rd("xiangqi-lab/site/data/docs/family.md");
  for (const t of [P, F]) { const nat = xqDocVar(feat(t, { gc: true, widget: true }), true); assert.ok(!/iPhone App|這支 iPhone|iPhone 系統|iPhone 本機/.test(nat), "App 版不寫死 iPhone：" + JSON.stringify(nat.match(/[sS]{0,40}(iPhone App|這支 iPhone|iPhone 系統|iPhone 本機)[sS]{0,10}/))) }
  assert.ok(!/test-health\.js|test-telemetry\.js|test-daily\.js|網頁版用的欄位/.test(xqDocVar(P, true)), "App 版藏開發用字"); assert.ok(/test-health\.js/.test(xqDocVar(P, false)), "網頁版照舊");
  assert.ok(M("07gc-native.js").includes('"Notifications are off for this app. Turn them on in the Settings app → Notifications."'));
  if (HAS_IOS) assert.ok(rd("xiangqi-ios/src/native-bridge.js").includes('why: "沒有通知權限（可到「設定」App → 通知 → 象棋千秋 打開）"'));
  assert.ok(M("05-settings.js").includes("在新手機打開象棋千秋 →「設定 → 🎒 換手機 → 新手機・輸入轉移碼」") && !M("09-askbot.js").includes("⚙ 系統 →"));
  assert.ok(M("07s2-setmap.js").includes('"🎒 換手機","more","#xfOut"'), "設定房間真的有「🎒 換手機」");
  assert.ok(M("00-util.js").includes("html .shp-spot:not(.ex-spot),html .shp-hs{z-index:155}") && /\.shw-me\{position:absolute;z-index:150;/.test(M("07w-shipwalk.js")), "標籤（155）在角色（150）上面");
  assert.ok(M("07w9-exits.js").includes('()=>{if(typeof goHome==="function")goHome();else location.hash="#/"}'), "回棋鎮一律 goHome（從大廳→地圖→設定→回星槎也一樣）");
  const Z6 = M("07z6-sitemap.js"); assert.ok(Z6.includes('P.setStyle({style:light?"LIGHT":"DARK"})') && Z6.includes("stmBar(true);") && Z6.includes("{const o=document.getElementById(\"stmOv\");if(!o)return;stmBar(false);"));
});
