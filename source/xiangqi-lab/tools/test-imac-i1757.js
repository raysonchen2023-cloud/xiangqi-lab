// 11/17 iMac 測試員 I（iPhone 18 Pro，1757，設定與系統）P1：設定項都有入口、隱私摘要照實際開關、說明文件藏開發用內容、授權頁與「待開發者確認」。
// 用法：node --test xiangqi-lab/tools/test-imac-i1757.js
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
    return /xiangqi-ios[\\/](www([\\/]|$)|ios[\\/]App[\\/]App[\\/](public([\\/]|$)|capacitor\.config\.json))/.test(s) ? "沒有 iOS 建置產物 xiangqi-ios/www、ios/App/App/public、capacitor.config.json（cap sync 產生，.gitignore 不進倉庫）" : /xiangqi-ios[\\/]appstore/.test(s) ? "沒有 xiangqi-ios/appstore（App Store 上架文案與隱私申報有聯絡人資料，只在開發者電腦）" : /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /xiangqi-lab\/(site|src)\//.test(s) ? "沒有 " + s.slice(s.indexOf("xiangqi-lab/")) + "（公開副本不含）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = PUB && e && e.code === "ENOENT" ? (why(e.path) || "公開副本沒有這個檔：" + String(e.path || "").split(String.fromCharCode(92)).join("/").split("/").slice(-2).join("/")) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };

test("P1-1：設定頁（05-settings Settings）每一個控制項都在設定房間某個器物的面板裡（沒有玩家走不到的設定）", () => {
  const S = M("05-settings.js"), T = between(S, "function Settings(v)", "let tbRefresh=");
  /* 照模板順序：分頁 → 段落標題 → 控制項 id */
  const items = []; let pane = "", head = ""; const re = /data-pane="([a-z]+)"|<div class="sec-t"([^>]*)>([^<]*)|id="([A-Za-z0-9_]+)"/g; let m;
  while ((m = re.exec(T))) { if (m[1]) { pane = m[1]; head = "" } else if (m[3] != null) { const t = (m[2].match(/data-sm-title="([^"]*)"/) || [])[1]; head = { t: (t || m[3]).trim(), hidden: /display:none/.test(m[2]) } } else if (m[4]) items.push({ id: m[4], pane, head }) }
  const SM = M("07s2-setmap.js"), EP = vm.runInNewContext("(" + between(SM, "const SM_EP=", ";").replace("const SM_EP=", "") + ")");
  const SPOTS = vm.runInNewContext("(" + between(SM, "const SM_SPOTS=", "]];", true).replace("const SM_SPOTS=", "").replace(/;$/, "").replace(/\/\*[\s\S]*?\*\//g, "") + ")");
  const headOf = id => { const x = items.find(i => i.id === id); return x && x.head && x.head.t };
  const cov = new Set(), why = {};
  const add = (id, w) => { cov.add(id); why[id] = why[id] || w };
  for (const [spot, L] of Object.entries(EP)) for (const k of L) { const i = k.indexOf(":"), t = k.slice(0, i), q = k.slice(i + 1);
    if (t === "title") items.filter(x => x.head && x.head.t === q).forEach(x => add(x.id, spot));
    else if (q[0] === "#") { const id = q.slice(1); if (t === "sec") { const h = headOf(id); items.filter(x => x.head && x.head.t === h && x.pane === (items.find(y => y.id === id) || {}).pane).forEach(x => add(x.id, spot)) } add(id, spot) } }
  /* 沒有 SM_EP、點了另外處理的器物：信插＝意見回饋頁（#fb）、手札＝修正紀錄（#fxh）、文牒＝驛路文牒（07s4：#about 那張卡、#aUpd 檢查更新）、書箱＝換手機（07s4：#xfOut／#xfIn） */
  for (const [spot, , , , , sel] of SPOTS) if (!EP[spot]) String(sel).split(",").forEach(s => s.trim()[0] === "#" && add(s.trim().slice(1), spot));
  ["aUpd", "xfIn", "aUse"].forEach(id => add(id, "07s4"));
  assert.ok(M("07s4-passmap.js").includes('const ub=doc.querySelector(".hq-upd");if(ub)ub.onclick=()=>{vibrate(5);const o=root.querySelector("#aUpd");if(o)o.click()};'), "文牒的朱印＝檢查更新");
  add("tbb", "smBoard"); assert.ok(/<div class="card" style="padding:10px"><div id="pv"[^\n]*\n\s*<div class="opt" id="tbb"/.test(T), "#tbb 跟 #pv 在同一張卡（el:#pv 整張搬）");
  add("srvDelSt", "smLock");   /* 狀態文字，跟 #srvDelB 同一段 */
  const hidden = items.filter(x => x.head && x.head.hidden).map(x => x.id);
  assert.deepEqual(hidden, [], "沒有藏起來的設定（對手形象、棋子樣式、3D 園子棋盤三段 11/17 連程式拿掉）");
  assert.ok(!/display:none[^>]*>[^<]*<\/div><div class="opt" id="(ol|ps)"|id="p3d"/.test(T) && !/querySelector\("#(ol|ps|p3d)"\)/.test(S), "05-settings 不留 #ol／#ps／#p3d");
  const miss = items.filter(x => x.pane && !hidden.includes(x.id) && !cov.has(x.id)).map(x => x.pane + "/" + (x.head ? x.head.t : "") + "/#" + x.id);
  assert.deepEqual(miss, [], "走不到的設定：" + miss.join("、"));
  /* I 點名的幾項 */
  for (const id of ["blitzSw", "premoveSw", "cbSw", "leftySw", "cleanSw", "hapSw", "paceO", "hiCon", "focB", "bossSw", "aLic"]) assert.ok(cov.has(id), id + "（" + (why[id] || "") + "）");
  assert.equal(why.blitzSw, "smBoard"); assert.equal(why.aLic, "smLock");
});

test("P1-2：驛路文牒「隱私說明」照這支手機的實際開關寫，中英一致；不再有「沒有送出任何資料／sends no data」", () => {
  const X = M("07x4-lobbysafe.js"), code = between(X, "function xqPrivRows(){", "\nfunction xqPrivSum(){");
  const run = (st, o) => { const S = new Map(Object.entries(st || {})); const ctx = { store: { get: (k, d) => S.has(k) ? S.get(k) : d }, lbsNetQuiet: () => !!(o && o.quiet), xqNat: () => !!(o && o.nat), i18nLang: () => (o && o.en) ? "en" : "zh" };
    vm.createContext(ctx); vm.runInContext(code + ";this.f=xqPrivRows", ctx); return ctx.f().join("\n") };
  /* 原生新安裝：玩家登記、三個匿名都關（05b anonNatDefault 寫 true） */
  const natNew = { stkOff: true, cpuAnonOff: true, learnAnonOff: true };
  const z = run(natNew, { nat: true }); assert.ok(z.includes("玩家登記：<b>關著</b>——不送。（App 版預設關）") && z.includes("匿名記錄卡住的地方：<b>關著</b>；匿名對局評分：<b>關著</b>；匿名學習進度：<b>關著</b>。（App 版這三個預設都關）"));
  assert.ok(!/每 7 天/.test(z), "關著就不寫每 7 天送");
  const e = run(natNew, { nat: true, en: true }); assert.ok(e.includes("Player registration: <b>Off</b> — nothing is sent. (Off by default in the app.)") && e.includes("Anonymous stuck signals: <b>Off</b>. Anonymous game scores: <b>Off</b>. Anonymous learning progress: <b>Off</b>."));
  /* 網頁版預設：登記開、三個匿名開 */
  const w = run({}, {}); assert.ok(w.includes("玩家登記：<b>開著</b>——每 7 天") && w.includes("匿名記錄卡住的地方：<b>開著</b>") && !w.includes("App 版預設關"));
  /* 自己打開登記、只關一個匿名 */
  const m = run({ repOff: false, cpuAnonOff: true }, { nat: true }); assert.ok(m.includes("玩家登記：<b>開著</b>") && m.includes("匿名對局評分：<b>關著</b>") && m.includes("匿名學習進度：<b>開著</b>"));
  /* 兒童模式／家長關大廳 */
  const k = run({ repOff: false }, { quiet: true }); assert.ok(k.includes("兒童模式或家長關閉線上大廳：以上全部不送") && k.includes("玩家登記：<b>關著</b>"));
  for (const s of [z, e, w, m, k]) assert.ok(!/沒有送出任何資料|sends no data/i.test(s));
  /* 接管 07s4 的「隱私說明 ›」：document 捕獲階段先接走，不再走中文標題比對那條路 */
  assert.ok(X.includes('document.addEventListener("click",e=>{const t=e.target&&e.target.closest&&e.target.closest(".hq-pv");if(!t)return;e.preventDefault();e.stopImmediatePropagation();'));
  assert.ok(M("07s4-passmap.js").includes('<button type="button" class="hq-pv">隱私說明 ›</button>'), "07s4 的鈕還是 .hq-pv");
  /* 摘要裡有說明文件、「📜 關於與開源授權」（I P1-4 的 iOS 入口）、城市選單 */
  const sum = between(X, "function xqPrivSum(){", "\ntry{document.addEventListener");
  assert.ok(sum.includes("xqDocBtns()") && sum.includes("📜 關於與開源授權") && sum.includes('document.querySelector("#aLic")') && sum.includes('document.querySelector("#myCityS")'));
});

test("P1-3：App 內顯示的說明文件（全部 data/docs）藏起開發用內容——test-*.js、原始碼檔名與行號、「沒有真人試玩」、「待開發者確認」", () => {
  const G = M("07gc-native.js"), fn = between(G, "const XQDOC_DROP=", "try{if(typeof xqDocVar===\"function\"&&!xqDocVar.__gcn)");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fn + ";this.f=xqDocClean", ctx);
  assert.ok(G.includes("xqDocVar=function(t,nat){return xqDocEnNote(f0(xqDocClean(gcnDocFeat(t)),nat))}"), "每份文件顯示前都經過（網頁版、原生版都一樣）");
  const D = path.join(ROOT, alt("xiangqi-db/art/docs")), bad = /test-[\w-]*\.js|\.js:\d+|`[^`\n]*\.js`|沒有真人試玩|待開發者確認/;
  for (const f of fs.readdirSync(D).filter(f => f.endsWith(".md"))) { const o = ctx.f(rd("xiangqi-db/art/docs/" + f)); const L = o.split("\n").filter(l => bad.test(l)); assert.deepEqual(L, [], f) }
  /* 正本照舊（GitHub 上給要查的人看）；內容不被砍壞 */
  const R = rd("xiangqi-db/art/docs/rules.md"), C = ctx.f(R);
  assert.ok(R.includes("`xiangqi-lab/tools/test-asian-rules.js`"), "正本不動");
  for (const s of ["《中華民國象棋規則》113 年修訂版", "11/16 起黑洞只剩這一種玩法。", "| 計分與否 | 晉級賽、線上積分可計分。**【程式已實作】** |"]) assert.ok(C.includes(s), s);
  assert.ok(C.length > R.length * .7, "只拿掉開發用的部分（棋規文件裡測試、程式位置的段落本來就多，約拿掉四分之一）");
  const one = s => ctx.f(s);
  assert.equal(one("- 主要自動測試：`xiangqi-lab/tools/test-asian-rules.js`（30 項）。"), "");
  assert.equal(one("- **程式：** `xiangqi-referee.js` 的 `repetitionVerdict`（第 178 行起）。"), "");
  assert.equal(one("- **沒有真人試玩**：只用腳本對打調過。"), "");
  assert.equal(one("見 foo.js:123 的說明"), "見的說明", "11/18 N33-5：拿掉檔名後中文字之間留下的空白也收掉（07gc xqDocTidy）");
});

test("P1-4：素材與授權頁不再有「待開發者確認」；NNUE 照實寫（作者條款禁止商用、本 App 免費非商業、11/17 已寄信詢問）；兩份正本一樣；關於與開源授權有 iOS 入口", () => {
  const C = rd("xiangqi-db/art/docs/credits.md"); assert.equal(C, rd("xiangqi-lab/site/data/docs/credits.md"));
  assert.ok(!C.includes("待開發者確認"));
  assert.ok(C.includes("- 狀態：權重的作者條款**禁止商用**。本 App 免費、不收費、沒有廣告、沒有內購，屬於非商業使用，照條款使用。2026-11-17 已寄信向 Pikafish 團隊說明這個用法並詢問，等回覆。"));
  assert.ok(!C.includes("沒有寫信問過、沒有書面許可") && !C.includes("目前沒有書面許可"), "不再同時寫「不得商用」和「沒有書面許可」");
  /* 11/18 iMac R P1：App 內只放對外版（內部判斷、開發者決定、待辦移到 xiangqi-db/docs-internal/credits-internal.md）；語音 12 檔拿掉、改系統語音 */
  assert.ok(C.includes("2026-11-17 已向資料庫作者說明本 App 的用法並詢問授權") && C.includes("## 詢問中的事項") && !C.includes("先保留") && !C.includes("開發者 11/17 決定"));
  assert.ok(M("07s2-setmap.js").includes('smLock:["sec:#axmSw","btn:#sh","btn:#a2h","sec:#fmSet","title:隱私","btn:#aLic","title:進階"]'), "小鎖匣有「📜 關於與開源授權」");
  assert.ok(M("05-settings.js").includes('<button class="btn ghost" id="aLic" style="width:100%;margin-top:8px">📜 關於與開源授權</button>'));
});

/* ---------- 11/17 I 的 P2、P3，和開發者選單定的素材授權四項 ---------- */
const U = M("00-util.js"), TAP = vm.runInNewContext(between(U, "const TAP44_CSS=", ";\n").replace("const TAP44_CSS=", ""));
const ctxI18n = () => { const SRC = M("07i18n.js"), a = SRC.indexOf("#I18N-PURE-BEGIN"), b = SRC.indexOf("/* #I18N-PURE-END */"); const c = {}; vm.createContext(c);
  vm.runInContext(SRC.slice(SRC.indexOf("\n", a) + 1, b) + ";this.R={i18nText,i18nExtMerge}", c); c.R.i18nExtMerge(JSON.parse(rd("xiangqi-db/i18n-en.json"))); return c.R.i18nText };

test("素材授權四項：圖片只寫工具、音樂照 Google 生成式 AI 條款（不做相似度檢查）、大師小傳畫面標出處、Pikafish 完整原始碼包已整理；「資料補齊中」拿掉", () => {
  const C = rd("xiangqi-db/art/docs/credits.md");
  assert.ok(C.includes("圖片由 Gemini、ChatGPT、gpt-image-2 等 AI 工具協助生成，再經人工挑選修改；各家條款都不主張生成內容的所有權"));
  assert.ok(C.includes("照 Google 的生成式 AI 條款使用") && !C.includes("相似度檢查 **資料補齊中**") && !/有沒有和既有曲目太像/.test(C));
  assert.ok(C.includes("每篇小傳在畫面上的生平卡最下面標「資料來源：」"));
  assert.ok(C.includes("完整對應原始碼＝上游標籤 Pikafish-2026-09-06（commit `4c17cee1`）的完整原始碼"));
  assert.ok(!C.includes("資料補齊中") && !C.includes("待開發者確認"));
  /* 小傳：每篇都有來源（72 篇），畫面一行「資料來源：」照網址列出 */
  const B = JSON.parse(rd(PUB && !fs.existsSync(path.join(ROOT, "xiangqi-db/gmbios.json")) ? "xiangqi-lab/site/data/gmbios.json" : "xiangqi-db/gmbios.json"));   /* 公開副本：大師小傳是倉庫根目錄 data/gmbios.json（線上那份）；run-tests 裡 xiangqi-lab/site＝倉庫根目錄（W69 盤點高 7：原本寫 ../data，在暫存資料夾裡找不到） */ const none = Object.keys(B).filter(k => !Array.isArray(B[k].src) || !B[k].src.length);
  assert.deepEqual(none, [], "沒有來源的小傳");
  const D = M("10-db.js"), fn = vm.runInNewContext("(" + between(D, "function bioSrcName(u){", "\n  function playerSheet(){").trim() + ")", { URL });
  assert.equal(fn("https://zh.wikipedia.org/zh-tw/x"), "維基百科"); assert.equal(fn("http://gdchess.com/xqplayer/x"), "廣東象棋網"); assert.equal(fn("https://www.anbuyi.com/x"), "anbuyi.com", "認不得的寫網域，不猜");
  assert.ok(D.includes('"資料來源："+p.src.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(bioSrcName(u))}</a>`).join("、")'));
});

test("I P2：英文誤譯（家長設定「分」→ min、存好 → Save）、音效圖鑑與換手機說明、3D 泡泡、驛路文牒字太小、官印英文直排、首頁頂欄英文換行、狀態列跟著畫面亮暗", () => {
  const F = M("07m5-family.js"); assert.ok(!F.includes('v+" 分"') && F.includes('v+" 分鐘"') && !F.includes('id="fmSave">存好<'));
  const T = ctxI18n();
  assert.equal(T("30 分鐘"), "30 min"); assert.equal(T("儲存"), "Save");
  for (const s of ["落子、吃子在 設定 → 聲音「棋子聲」選，全部是程式合成的仿材質聲，不是實物錄音：", "「吃！」「將軍！」，電腦語音合成錄成的音檔，男聲、女聲", "預先合成的音檔 9 種", "最近 20 個提示音事件，新的在上：哪一種、第幾路、偏左偏右、有沒有播出來。", "在新手機打開象棋千秋，點設定頁的包袱書箱，再點「新手機・輸入轉移碼」，輸入：", "我是小帥，幫你加油！"]) { const t = T(s); assert.ok(t && !/[一-鿿]/.test(t), s + " → " + t) }
  assert.ok(M("06-cpu.js").includes('for(const k of["say","oppSay"])if(typeof pv[k]==="function"){const f=pv[k];pv[k]=function(t,...a){return f.call(this,T(t),...a)}}'), "3D 泡泡先翻再交給 park3d");
  assert.ok(M("07x4-lobbysafe.js").includes('b.className="xq-hq-pv"') && M("07x4-lobbysafe.js").includes("font:800 15px/1.2"), "文牒標題列一顆正常大小的「🔒 隱私說明」");
  for (const s of ["html[lang^=en] .me-seal{writing-mode:horizontal-tb;", "html[lang^=en] #title .sw7-hd{white-space:normal;"]) assert.ok(TAP.includes(s), s);
  const Z = M("07z6-sitemap.js"); assert.ok(Z.includes("function xqBarAuto(){") && Z.includes("const xqBarLight=c=>(.2126*c[0]+.7152*c[1]+.0722*c[2])/255>.6;"));
  const L = vm.runInNewContext("(" + between(Z, "const xqBarLight=", ";\n").replace("const xqBarLight=", "") + ")");
  assert.equal(L([244, 237, 224]), true, "米色地圖、淺色頁：深色字"); assert.equal(L([255, 255, 255]), true, "高對比白底"); assert.equal(L([42, 31, 21]), false, "深色頁：白字"); assert.equal(L([0, 0, 0]), false);
});

test("I P3：換手機產生轉移碼前先確認（照實際規則）、點擊區、朝代配色提示看得到、面板高度跟內容、簡體用詞、彈窗避開動態島、護眼文案、冷啟動字級、最大字級版面、音效圖鑑不寫平台名、裝置代號看得到、切開關後面板留著", () => {
  const X = M("07x4-lobbysafe.js");
  assert.ok(X.includes("if(typeof xfSend===\"function\"&&!xfSend.__ask){const f0=xfSend;xfSend=function(){"), "包住 xfSend（設定頁、驛路文牒都叫它）");
  assert.ok(X.includes("暫放在線上大廳的伺服器 <b>30 分鐘</b>") && X.includes("<b>這支手機上的存檔照樣留著。</b>"));
  assert.ok(M("05-settings.js").includes('if(xo)xo.onclick=()=>{vibrate(5);xfSend()}') && M("07s4-passmap.js").includes('const gen=()=>{const o=root.querySelector("#xfOut");if(o)o.click();else if(typeof xfSend==="function")xfSend()};'));
  for (const s of ["html .toast{z-index:9990}", ".xqs.xqs{bottom:auto;max-height:", "#sndTry,#bgmTest{min-height:44px}", "#fcmBar{opacity:.78}", "html .modal{padding-top:max(24px,calc(env(safe-area-inset-top,0px) + 12px));", "html .fm-ov{padding-top:max(16px,calc(env(safe-area-inset-top,0px) + 10px));", "#stmOv::before{content:\"\";position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top,0px);", "html:is([data-fz=xxl],[data-fz=max]) .xqs.xqs{width:", "html:is([data-fz=xl],[data-fz=xxl],[data-fz=max]) :is(.btn,.xqs-b button,.sheet button){white-space:normal;"]) assert.ok(TAP.includes(s), s);
  assert.ok(M("05-settings.js").includes('{vibrate(8);toast(eraLockMsg(k));return}'), "鎖住的朝代本來就有說明，只是被面板蓋住（toast 70 < 面板 949）");
  assert.ok(M("07q-chardiff.js").includes('toast("本命化形還沒解鎖：雲河星槎 13 站的棋理都學會以後就能打開")'));
  /* 簡體用詞 */
  const I = M("07i18n.js"), W = vm.runInNewContext("(" + between(I, "const ZH_CN_WORDS=", ";   /* zh-lint-ok */\nfunction zhCnWords").replace("const ZH_CN_WORDS=", "").replace(/\/\*[^*]*\*\//g, "") + ")"), f = vm.runInNewContext("(" + between(I, "function zhCnWords(s){", "\n").replace(/^function zhCnWords/, "function") + ")", { ZH_CN_WORDS: W });
  assert.equal(f("连不到伺服器，萤幕会暗"), "连不到服务器，屏幕会暗"); assert.equal(f("意见回馈"), "意见反馈"); assert.equal(f("珐瑯杯"), "珐琅杯"); assert.equal(f("线上大厅的设定"), "在线大厅的设置");
  assert.equal(f("资料库、资料档、资料夹"), "数据库、数据文件、文件夹"); assert.equal(f("个人资料"), "个人资料", "「資料」只換確定是 data 的詞");
  for (const s of ["车马炮将军", "残局", "棋谱", "千秋盃", "将军！", "象棋千秋"]) assert.equal(f(s), s, "棋術語不動：" + s);
  assert.ok(I.includes("XQ_ZH.mode()!==\"cn\")return;"), "只在簡體模式");
  /* 護眼 */
  const FM = M("07m5-family.js"); assert.ok(FM.includes("${sn?`又過了 ${FM_EYE_SNOOZE} 分鐘囉。`:`你已經專心玩了 ${m} 分鐘囉。`}") && FM.includes("<span>選「等一下再說」或「提早結束」，會在 ${FM_EYE_SNOOZE} 分鐘後再提醒。</span>"));
  assert.ok((FM.match(/store\.set\("fmEyeSn",true\)/g) || []).length === 2, "等一下再說、提早結束都記");
  /* 冷啟動字級 */
  assert.ok(M("11b-a11y.js").includes("[300,1200,3000].forEach(t=>setTimeout(re,t));addEventListener(\"load\",re);addEventListener(\"pageshow\",re)"));
  /* 音效圖鑑不寫平台名 */
  assert.ok(!/Windows/.test(M("11c-a11ysnd.js").replace(/\/\*[\s\S]*?\*\//g, "")));
  /* 裝置代號 */
  assert.ok(X.includes("(meInfo()||{}).id") && X.includes("寫信申請刪除資料時附上") && rd("xiangqi-db/art/docs/support.md").includes("裝置代號在設定房間書案上的驛路文牒「🔒 隱私說明」裡"));
  /* 面板留著 */
  const S2 = M("07s2-setmap.js"); assert.ok(S2.includes("sessionStorage.setItem(\"smReopen\",id)") && S2.includes("if(ro&&SM_EP[ro])setTimeout(()=>{try{if(!ES.on()&&") && S2.includes("epOpen(ro)}catch(x){}},120)"));
  assert.ok(M("11b-a11y.js").includes('if(location.hash.indexOf("#/settings")===0&&typeof route==="function")route()'), "原因：高對比主題會整頁重畫");
});

test("05-settings 藏起來的三個設定（3D 園子棋盤、對手形象、棋子樣式）連程式拿掉，照 reps 流程（不直接改線上檔）", () => {
  const S = M("05-settings.js"); assert.ok(!/id="(p3d|ol|ps)"/.test(S) && !/querySelector\("#(p3d|ol|ps)"\)/.test(S) && !S.includes('[data-ol]') && !S.includes('v.querySelectorAll("[data-p]")'));
  assert.ok(S.includes("11/17 iMac I：藏起來（display:none）的這三個設定連同程式整段拿掉"));
  /* 對手形象、棋子樣式的設定值照舊讀（照目前的設定畫），只是不再有藏起來的開關 */
  assert.ok(M("01-board.js").includes('store.get("pieceStyle","3d")'));
});

test("11/24 簡體棋子字：OpenCC 把「傌」「俥」轉成罕見字「㐷」「伡」，兩岸用詞補一層改成「马」「车」；記譜「傌八進七」→「马八进七」；只有一個字的文字節點（棋盤上的棋子）也要處理", () => {
  const SITE = path.join(__dirname, "..", "site"), I = rd("xiangqi-db/m/07i18n.js");
  const occ = require(path.join(SITE, "opencc-t2cn.js")), conv = occ.Converter({ from: "tw", to: "cn" });
  assert.equal(conv("傌俥"), "㐷伡", "OpenCC 本身就是這樣轉（不然這項測不到東西）");
  const W = vm.runInNewContext("(" + between(I, "const ZH_CN_WORDS=", ";   /* zh-lint-ok */\nfunction zhCnWords").replace("const ZH_CN_WORDS=", "").replace(/\/\*[^*]*\*\//g, "") + ")");
  const f = (s) => { for (const [a, b] of W) if (s.includes(a)) s = s.split(a).join(b); return s };
  assert.equal(f(conv("帥仕相傌俥炮兵")), "帅仕相马车炮兵"); assert.equal(f(conv("將士象馬車砲卒")), "将士象马车砲卒");
  assert.equal(f(conv("傌八進七 俥一平二")), "马八进七 车一平二");
  assert.equal(f(conv("用下面的方向鈕")), "用下面的方向按钮");
  const i0 = I.indexOf("function zhCnWords(s){"), iife = I.slice(i0, I.indexOf("/* 11/18 第 30 輪", i0));
  assert.ok(iife.length > 200, "取得到兩岸用詞那一段");
  assert.ok(/fix=n=>\{const t=n\.nodeValue;if\(!t\|\|!\/\[㐀-鿿\]\/\.test\(t\)\)return;/.test(iife), "文字節點的判斷要含擴充 A 區（只有「㐷」一個字也要換）");
  assert.ok(!iife.includes("/[一-鿿]/"), "不能再用只到 U+4E00 的範圍");
});
