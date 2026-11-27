// 11/17 測試員 D 第 29 輪（英文介面巡查，候選版 2120）：Y1（P1）序幕卡英文、整條開場路線沒有中文殘留；Y2～Y14、Z1～Z6。
// 不開瀏覽器：vm 載入 07i18n 的翻譯（內建＋外掛字典）和要測的函式，照英文介面實際組出來的字檢查。
// 用法：node --test xiangqi-lab/tools/test-r29d-1117.js
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
const CJK = /[\u3400-\u9fff]/;
const I18N = (ext = true) => { const S = M("07i18n.js"), a = S.indexOf("#I18N-PURE-BEGIN"), b = S.indexOf("/* #I18N-PURE-END */"); const c = {}; vm.createContext(c);
  vm.runInContext(S.slice(S.indexOf("\n", a) + 1, b) + ";this.R={i18nText,i18nExtMerge,i18nMove}", c); if (ext) c.R.i18nExtMerge(JSON.parse(rd("xiangqi-db/i18n-en.json"))); return c.R };
let R_ = null; const R = new Proxy({}, { get: (o, k) => (R_ || (R_ = I18N()))[k] }), T = s => R.i18nText(s);   /* 用到才載（外掛字典在公開副本沒有：在子測試裡讀不到才標略過，不會整支掛掉） */
/* 一支模組（或其中一段）裡的中文片段，英文介面翻不出的列出來 */
const untranslated = (src, allow) => { const s = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""), out = new Set();
  for (let p of s.split(/<[^>]*>|[`"'<>\n]|\$\{|\}/)) { p = p.trim(); if (p && CJK.test(p)) out.add(p) }
  return [...out].filter(p => !(allow || []).includes(p)).filter(p => { const t = T(p); return t == null || CJK.test(t) }) };

/* 七位角色（06-cpu WX_CHARS） */
const WX = (() => { const s = M("06-cpu.js"), L = []; for (const m of s.matchAll(/(x_[a-z]+):\{n:"([^"]*)"/g)) { const b = s.slice(m.index, m.index + 4000), nk = (b.match(/nk:"([^"]*)"/) || [])[1], say = (b.match(/say:"([^"]*)"/) || [])[1], pc = (b.match(/pc:"([^"]*)"/) || [])[1]; if (nk && say) L.push({ k: m[1], n: m[2], nk, say, pc }) } return L })();

test("Y1（P1）：序幕卡（降落後「齊轍登船」那張）英文介面三段都是英文；七位角色、經典和各朝代都一樣；按鈕「入局」＝Enter the game", () => {
  assert.equal(WX.length, 7, "七位");
  const src = between(M("05b-save.js"), "function prologue(){", "\n    /* 開發者 11/11 選 v3 規劃書 B01");
  /* body 的英文那一段：除了 ${} 裡交給字典的角色台詞、名字、朝代名，寫死的字沒有中文 */
  const enB = between(src, "const body=EN?`", "`\n    :`"); assert.ok(!CJK.test(enB.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, "")), "序幕英文那一份寫死的字有中文");
  const S5 = M("05b-save.js");
  assert.ok(S5.includes("const body=EN?`<p class=\"pl-say\">“${esc(TT(C.say))}”</p><p>A star raft called the “Cloud River” pulled up to the shore."));
  for (const C of WX) { for (const s of [C.say, C.nk]) { const t = T(s); assert.ok(t && !CJK.test(t), s + " → " + t) } }
  for (const e of ["秦", "漢", "三國", "魏晉", "南北朝", "隋", "唐", "宋", "元", "明", "清"]) { const t = T(e); assert.ok(t && !CJK.test(t), e + " → " + t) }
  assert.ok(!CJK.test("The stone table in the cabin lit up, and the wind carried voices from a thousand years ago."));
  assert.equal(T("入局"), "Enter the game", "Z5：入局不是 First Steps");
});

test("Y1：整條開場路線（開頭畫面、電影字幕、邀局卡、序局、星盤暫合、第 2 段電影、降落、序幕、練習六課、畢業、降落後的回家任務）英文介面沒有中文殘留", () => {
  const BH = M("07bh-blackhole.js");
  assert.deepEqual(untranslated(between(BH, "function bhXuStart", "function bhxLandNew")), [], "07bh 序局流程");
  assert.deepEqual(untranslated(between(BH, "const OP_FILM1", "const BHX_DUST")), [], "07bh 兩段電影字幕");
  assert.deepEqual(untranslated(M("07stq-starter.js"), ["練"]), [], "07stq 新手練習與畢業（畢業印章的「練」是印文，跟其他印章一樣照原字）");
  /* 降落後的回家任務、序幕、一步殺：英文介面走英文那一份（不經過字典），英文字串本身不能有中文 */
  const Q = between(BH, "function bhxQuest(hm,D){", "\n  modal(`<div class=\"em\">📜</div><h2>任務");
  assert.ok(Q.includes("Quest: return to ${esc(E)}") && !CJK.test(Q.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"我"|"之後再去"|i18nText/g, "")), "回家任務英文版");
  const FW = between(M("05b-save.js"), "function fwPaint(box,more){", "\n  draw()}");
  const pairs = [...FW.matchAll(/L\(\s*(["`])((?:(?!\1)[\s\S])*?)\1\s*,\s*(["`])((?:(?!\3)[\s\S])*?)\3\s*\)/g)];
  assert.ok(pairs.length >= 20, "一步殺每句都有英文（" + pairs.length + " 句）");
  for (const p of pairs) assert.ok(!CJK.test(p[4].replace(/\$\{[^}]*\}/g, "")), "英文那一份有中文：" + p[4].slice(0, 60));
  /* 一步殺的棋步：英文介面寫 WXF＋白話 */
  assert.deepEqual(JSON.parse(JSON.stringify(R.i18nMove("俥九平六"))), { wxf: "R9.6", say: "Chariot 9 traverses to 6" });
  assert.ok(FW.includes("m.wxf+\" (\"+m.say+\")\""));
});

test("Y3：開頭畫面的小連結（📱 從舊手機搬資料、📂 讀入存檔檔案）在內建字典，外掛字典還沒到也翻得出", () => {
  const B = I18N(false);
  assert.equal(B.i18nText("📱 從舊手機搬資料"), "📱 Move Data from Old Phone"); assert.equal(B.i18nText("📂 讀入存檔檔案"), "📂 Import Save File");
});

test("Y4、Y5、Y13、Y14、Z5：3D 鈕讀螢幕名稱、太虛星尊台詞、修為小籤、羈絆冊說明、場景圖 alt、晉級等級卡", () => {
  for (const s of ["搖桿：移動要去的格子", "望遠鏡：放大遠方", "關掉望遠鏡", "翻到棋盤背面", "轉到棋盤背面", "轉回棋盤正面", "調整棋距", "棋盤格距", "星隕！", "畫地為牢。", "退下！"]) { const t = I18N(false).i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) }
  /* park3d／bossfx3d 寫的中文都在字典裡（src 不動，交給翻譯器的屬性翻譯） */
  const P = rd("xiangqi-lab/src/park3d.js"); for (const m of P.matchAll(/setAttribute\("aria-label","([^"]*[\u3400-\u9fff][^"]*)"\)/g)) { const t = T(m[1]); assert.ok(t && !CJK.test(t), m[1]) }
  assert.equal(T("+30 修為（今日第一次練習 +20）"), "+30 XP (first practice today +20)");
  assert.equal(T("少遇到・遇過 2／12"), "Seldom met · met 2/12");
  for (const s of ["石桌往事的園子裡，女棋手偶爾會請你看一盤棋；幫她解開，羈絆就多一級。她們大多在自己家鄉的朝代出現。", "她們都是這個遊戲編出來的棋友；身分小卡寫的是她那個朝代的文化背景，不是她本人的史料。「稀有」「傳說」只表示多難遇到。", "頭像外框的顏色，代表她有多難遇到："]) assert.ok(T(s) && !CJK.test(T(s)), s);
  /* alt：翻譯器的屬性清單有 alt；寫死的場景圖 alt 都翻得出 */
  assert.ok(M("07i18n.js").includes('const I18N_ATTR=["aria-label","title","placeholder","label","alt"];'));
  const alts = new Set(); for (const f of fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js"))) for (const m of M(f).matchAll(/alt="([^"$<>+]*[\u3400-\u9fff][^"$<>+]*)"/g)) alts.add(m[1]);
  alts.add("聽雨茶坊：方桌、條凳、靠背椅，窗外下著雨，中間一張暗棋桌");
  for (const a of alts) { const t = T(a); assert.ok(t && !CJK.test(t), "alt：" + a) }
  assert.equal(T("再 50 分升「入門1」・0 勝 0 負 0 和"), "50 pts to Beginner 1 · 0W 0L 0D", "不再多一個引號");
  assert.ok(M("08b-cpugame.js").includes('<span class="pt"><b>${CR.pts||0}</b> ${typeof i18nLang==="function"&&i18nLang()==="en"?"pts":"分"}</span>'));
});

test("Y6：「關於與開源授權」英文介面整頁英文、粗體前後有空格；中文版「會送出去的」照現在實際寫", () => {
  const X = M("07x4-lobbysafe.js"), code = between(X, "if(typeof aboutLicSheet===\"function\"&&!aboutLicSheet.__xq){", "aboutLicSheet.__xq=1}", true);
  for (const en of [true, false]) for (const nat of [true, false]) { let html = "", title = ""; const b = { set innerHTML(h) { html = h }, get innerHTML() { return html }, querySelector: () => ({}) };
    const ctx = { aboutLicSheet() {}, i18nLang: () => en ? "en" : "zh", setNat: () => nat, ABOUT_REPO: "https://github.com/raysonchen2023-cloud/xiangqi-lab", sheet: (t, f) => { title = t; f(b) }, closeSheet() {}, wipeAsk() {}, setTimeout };
    vm.createContext(ctx); vm.runInContext(code + ";aboutLicSheet()", ctx);
    if (en) { const txt = html.replace(/<[^>]*>/g, " "); assert.ok(!CJK.test(txt), "英文版沒有中文：" + (txt.match(/[^\s]*[\u3400-\u9fff][^\s]*/) || [""])[0]); assert.ok(/a <b>free, non-commercial<\/b> project/.test(html) && /on <b>this device<\/b>/.test(html), "粗體前後有空格"); assert.equal(title, "📜 About and open-source licenses") }
    else assert.ok(html.includes("都寫在隱私說明") && html.includes('id="alPriv"') && !html.includes("會送出去的"), "11/17 E 第 29 輪 R29-3：不再自己列一份，改成連到隱私說明");
  }
  assert.ok(M("05-settings.js").includes("al.onclick=()=>{vibrate(5);aboutLicSheet()}"), "設定頁、隱私說明那顆都叫 aboutLicSheet（換掉這一個就好）");
});

test("Y7：英文介面打開說明文件，標題下面先說明只有中文；開發用字再多濾掉 m.css:行號、真人測試、m.html：、〔原始碼〕", () => {
  const G = M("07gc-native.js"), ctx = { i18nLang: () => "en" }; vm.createContext(ctx);
  vm.runInContext(between(G, "function xqDocEnNote(t){", "\nfunction xqDocClean(t){") + "\n" + between(G, "const XQDOC_DROP=", "try{if(typeof xqDocVar===\"function\"&&!xqDocVar.__gcn)") + ";this.n=xqDocEnNote;this.c=xqDocClean", ctx);
  const o = ctx.n("# 隱私與資料使用\n\n內文"); assert.ok(o.startsWith("# 隱私與資料使用\n\n> This document is available in Chinese only."));
  ctx.i18nLang = () => "zh"; assert.equal(ctx.n("# 標題\n內文"), "# 標題\n內文", "中文介面不加");
  const bad = /test-[\w-]*\.js|\.(?:js|css|html):\d+|`[^`\n]*\.(?:js|css|html)`|沒有真人試玩|待開發者確認|真人測試|〔原始碼〕|\bm\.html\s*[：:]/;
  for (const f of fs.readdirSync(path.join(ROOT, alt("xiangqi-db/art/docs"))).filter(f => f.endsWith(".md"))) { const L = ctx.c(rd("xiangqi-db/art/docs/" + f)).split("\n").filter(l => bad.test(l)); assert.deepEqual(L, [], f) }
  assert.ok(G.includes("xqDocVar=function(t,nat){return xqDocEnNote(f0(xqDocClean(gcnDocFeat(t)),nat))}"));
});

test("Y8：問小帥英文介面——標題、說明、輸入框提示是英文；英文問題不查中文百科，直接說還不會回答", () => {
  const A = M("09-askbot.js");
  assert.ok(A.includes('function askSheet(){sheet(askEn()?"🤖 Ask "+askNmEn():"🤖 問"+ASKN(),b=>{'));
  assert.ok(A.includes('placeholder="${askEn()?"Type a question in Chinese":"例如：五七炮是什麼？"}"'));
  const en = between(A, "b.innerHTML=(askEn()?`", "`\n    :`"); assert.ok(!CJK.test(en.replace(/<[^>]*>/g, "")), "英文說明沒有中文");
  const i = A.search(/if\(askEn\(\)&&!\/\[[^\]]+\]\/\.test\(q\)\)\{/); assert.ok(i > 0, "英文問題的判斷");
  const q = A.slice(i, A.indexOf("return}", i) + 7);
  assert.ok(q.includes("I can't answer that yet") && !CJK.test(q.replace(/\/\[[^\]]+\]\//, "")), "英文問題直接回英文卡、在查百科之前就停");
  const w = A.indexOf('worldAsk("wiki"'); assert.ok(w < 0 || i < w, "判斷在查百科之前");
});

test("Y9：練功房英文——說明、分組小字（不再 No. 1-Lv 4）、練習卡片、名牌和開始鈕的讀螢幕名稱", () => {
  const C = M("07z5-cpuroom.js"); void R.i18nText;   /* 先載字典（含外掛字典）：crT 會吞掉錯誤，讀不到外掛字典要在這裡就知道（公開副本標略過） */
  const tip = vm.runInNewContext(between(C, "const CR_LVTIP_EN=", ";\n").replace("const CR_LVTIP_EN=", "")); assert.ok(!CJK.test(tip));
  const ctx = { i18nLang: () => "en", i18nText: T }; vm.createContext(ctx); vm.runInContext(between(C, "const crEn=()=>", "\nconst CR_LVTIP_EN=") + "\n" + between(C, "function crInfo(md,lv,sd,o){", "\nfunction crDiffSheet") + ";this.f=crInfo", ctx);
  assert.equal(ctx.f("free", 6, "r", {}), "Level 6 · Red, moves first · no rank points lost");
  assert.equal(ctx.f("blind", 3, "b", { passed: true }), "Level 3 (cleared) · Black, moves second · unrated, 3 peeks");
  assert.equal(ctx.f("rank", 1, "r", { rank: "新手" }), "Opponent matched to rank “Novice” · Red, moves first · rated");
  assert.ok(C.includes('`Levels ${a}–${z}${note?" · "+esc(crT(note)):""}${dim?" · open to play; beating the previous scroll first is suggested":""}`'));
  assert.ok(C.includes('"Name plate. Tap to change opponent. Current opponent: "+crT(') && C.includes('gb.setAttribute("aria-label",crEn()?crT(CR_GO[md])+": "+'));
  for (const s of ["開始晉級賽", "開始練習", "開始盲棋", "初學乍練", "宗師之境", "高手也難勝"]) assert.ok(T(s) && !CJK.test(T(s)), s);
});

test("Y12：驛路文牒「產生轉移碼」跟設定頁一樣先確認——兩個入口都叫全域的 xfSend（被 07x4 包了確認），之後沒有模組再換掉它", () => {
  assert.ok(M("05-settings.js").includes('if(xo)xo.onclick=()=>{vibrate(5);xfSend()}'), "#xfOut 點下去時才找 xfSend（拿到包過的）");
  assert.ok(M("07s4-passmap.js").includes('const gen=()=>{const o=root.querySelector("#xfOut");if(o)o.click();else if(typeof xfSend==="function")xfSend()};'));
  const all = fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js"));
  const re = all.filter(f => /[^.\w]xfSend=[^=]/.test(M(f))); assert.deepEqual(re, ["07x4-lobbysafe.js"], "只有 07x4 換 xfSend");
  const order = rd("xiangqi-db/m.html"), i4 = order.indexOf("m/07x4-lobbysafe.js"); assert.ok(i4 > order.indexOf("m/05-settings.js") && i4 > order.indexOf("m/05b-save.js"), "07x4 在 05、05b 後面載入");
});

test("Z4：讀螢幕名稱用 axmTxt：每段文字之間補空格，不再「ContinueChariot」", () => {
  const A = M("11b-a11y.js"); assert.ok(A.includes("const raw=axmTxt(el),tx=raw.replace(/\\s+/g,\"\");"));
  const f = vm.runInNewContext("(" + between(A, "function axmTxt(el){", "\n").replace(/^function axmTxt/, "function") + ")", { NodeFilter: { SHOW_TEXT: 4 }, document: { createTreeWalker: (el) => { let i = 0; return { nextNode: () => el._t[i] ? { nodeValue: el._t[i++] } : null } } } });
  assert.equal(f({ _t: ["▶ Continue", "Chariot · Qi Zhe", " XP Lv 1 "] }), "▶ Continue Chariot · Qi Zhe XP Lv 1");
});

test("Z6：時辰鐘英文讀螢幕名稱不靠字典也是英文（剛開機外掛字典還沒到）", () => {
  const W = M("07w8-shichen.js");
  const PY = vm.runInNewContext(between(W, "const CLK_ZHI_PY=", ";").replace("const CLK_ZHI_PY=", "")); assert.equal(PY.length, 12); assert.equal(PY[11], "Hai");
  assert.ok(W.includes("b.setAttribute(\"aria-label\",ship?T(\"雲河無歲月：在星槎上，時辰不走。點了看船齡\"):`It's ${hh[0]}:00–${hh[1]}:00 now (the ${CLK_ZHI_PY[i]} double-hour)${tmE?\", solar term: \"+tmE:\"\"}."));
  assert.ok(/tmE=tm\?\(\(\)=>\{const x=T\(tm\);return x&&!\/\[[^\]]+\]\/\.test\(x\)\?x:\(CLK_TERM_PY\[tm\]\|\|""\)\}\)\(\):""/.test(W), "字典沒到用拼音");
});

test("Z1～Z3：320 寬開頭畫面引文、英文頂欄返回鈕只留「‹」、檢討頁狀態可以換行", () => {
  const U = M("00-util.js"), TAP = vm.runInNewContext(between(U, "const TAP44_CSS=", ";\n").replace("const TAP44_CSS=", ""));
  for (const s of ["@media (max-width:340px){#xqTitle .ld-qt{font-size:17px;", "@media (max-width:360px){html[lang^=en] #topbar #back{font-size:0;max-width:48px;min-width:44px}", "html[lang^=en] #view #stat{white-space:normal;text-overflow:clip}"]) assert.ok(TAP.includes(s), s);
  assert.ok(M("07i18n.js").includes("html[lang=en] #back{display:block;max-width:40%;"), "原本那條（具體度較低，被上面蓋過）");
});
