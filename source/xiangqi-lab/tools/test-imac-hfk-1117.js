// 11/17 iMac 測試員 H（P2-3、P3）、F（P2-2、P3）、K（P1、P2、P3）這一批的修正。
// 不開瀏覽器：vm 執行真的程式片段，或從原始碼取出樣式字串算規則；實機的點擊判定（elementFromPoint）、相機位置請 iMac 複驗。
// 用法：node --test xiangqi-lab/tools/test-imac-hfk-1117.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
/* 11/18 公開證據（0319）：公開副本（ROOT 有 STAGE-MANIFEST.json）沒有 xiangqi-ios、xiangqi-lab/site、xiangqi-lab/src 的支援／隱私頁、xiangqi-db/art/docs、xiangqi-db/i18n-en.json（只放 CDN）。
   site 的檔、文件原稿、支援／隱私頁退回倉庫根目錄那一份（跟線上同一份：../、../data/docs/、../support.html）；還是找不到的子測試照實標略過、寫原因。開發者電腦上（沒有 STAGE-MANIFEST.json）照常跑，缺檔照樣失敗 */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json")) || !fs.existsSync(path.join(ROOT, "xiangqi-ios"));   /* 公開副本的 run-tests 會把 source/ 抄到暫存資料夾（沒有 STAGE-MANIFEST.json），所以也看有沒有 xiangqi-ios */
function alt(p) { p = String(p); if (!PUB || fs.existsSync(path.join(ROOT, p))) return p;
  for (const [re, to] of [[/^xiangqi-lab\/site\//, "../"], [/^xiangqi-db\/art\/docs(\/|$)/, "../data/docs$1"], [/^xiangqi-lab\/src\/(support|privacy)\.html$/, "../$1.html"]]) if (re.test(p)) { const q = p.replace(re, to); if (fs.existsSync(path.join(ROOT, q))) return q }
  return p }
function skipMissing(t0) {
  const why = p => { const s = String(p || "").split(String.fromCharCode(92)).join("/");
    return /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /xiangqi-lab\/(site|src)\//.test(s) ? "沒有 " + s.slice(s.indexOf("xiangqi-lab/")) + "（公開副本不含）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = PUB && e && e.code === "ENOENT" ? (why(e.path) || "公開副本沒有這個檔：" + String(e.path || "").split(String.fromCharCode(92)).join("/").split("/").slice(-2).join("/")) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };
const IOS = fs.existsSync(path.join(ROOT, "xiangqi-ios")) ? false : "沒有 xiangqi-ios";
const U = M("00-util.js");
const TAP = vm.runInNewContext(between(U, "const TAP44_CSS=", ";\n").replace("const TAP44_CSS=", ""));

test("H P2-3：擂台也能切平面——頂欄一律有 parkBtn、開擂台／換擂主不再硬切 3D；寬度 < 500 進擂台預設平面、寬的照舊 3D（只算這一局）", () => {
  const B = M("08b-cpugame.js"), HQ = M("03-home-quiz.js");
  assert.ok(B.includes("...[parkBtn(()=>{draw();topBar()})],") && !B.includes("...(lk?[]:[parkBtn("), "擂台下到一半也有切換鈕");
  assert.ok(!/if\(s\.arena&&!s\.result&&!parkOn\(\)\)\{store\.set\("park3d",true\)/.test(B) && !/if\(lk&&!parkOn\(\)\)store\.set\("park3d",true\)/.test(B), "render 不再硬切 3D");
  assert.ok(B.includes("const arenaStart=(era,lv)=>{if(PARK&&PARK.era!==era)") && B.includes('const arenaBtn=["🏯",()=>arenaSheet(store.get("era","classic"),arenaStart),"朝代擂台"];'));
  const src = between(HQ, "const arP3Want=", "\nfunction arP3Back(){");
  for (const [w, want] of [[466, false], [402, false], [499, false], [500, true], [820, true]]) {
    const S = new Map(); const ctx = { innerWidth: w, store: { get: (k, d) => S.has(k) ? S.get(k) : d, set: (k, v) => S.set(k, v) } }; vm.createContext(ctx);
    vm.runInContext(src + ";arP3On()", ctx); assert.equal(S.get("park3d"), want, "寬 " + w);
    assert.deepEqual(JSON.parse(JSON.stringify(S.get("arP3Bak"))), { v: null }, "記下原本的設定，離開擂台就還原");
  }
});

test("H P2-3：3D 園子按「＋」放大後點棋子不會被當成「點兩下回全盤」——點到棋盤格一律照常選子、走子，只有點在棋盤外的兩下才回正", () => {
  const P = rd("xiangqi-lab/src/park3d.js");
  const seg = between(P, "const i0=pick(e.clientX,e.clientY),onPc=i0>=0||i0===-2;", "let fg=null;");
  /* 跑一次：同一個判斷式在兩下相隔 200ms、鏡頭已放大（tzoom≠HOME.z）時，點到格子不 reset，點到外面才 reset */
  const run = (pk, lastTap) => { let r = 0; const ctx = { e: { clientX: 1, clientY: 1 }, pick: () => pk, now: 1000, lastTap, tyaw: 0, tpitch: .5, tzoom: .6, HOME: { p: .5, z: 1 }, reset: () => { r++ } };
    vm.createContext(ctx); vm.runInContext("(function(){" + seg.replace("let fg=null;", "") + "})()", ctx); return { r, lastTap: ctx.lastTap } };
  assert.equal(run(12, 800).r, 0, "點到格子（選子、落點）不回正"); assert.equal(run(-2, 800).r, 0, "點到兩顆子中間（要選）也不回正");
  assert.equal(run(-1, 800).r, 1, "棋盤外點兩下照舊回正"); assert.equal(run(-1, 500).r, 0, "隔太久不算兩下");
  assert.equal(run(12, 0).lastTap, 0, "點到格子不記成第一下");
});

test("H P3-1：平面棋盤點擊判定本來就是「最近的交叉點」（每點的判定範圍＝到相鄰格中心距離的一半，邊線外再多半格）", () => {
  const B = M("01-board.js"), code = between(B, "const sqAt=e=>{", "-1};", true);
  const S = 30, X0 = 20, Y0 = 20; const mk = flip => { const ctx = { S, X0, Y0, flip, svg: { createSVGPoint: () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y } } }), getScreenCTM: () => ({ inverse: () => null }) } }; vm.createContext(ctx); vm.runInContext(code + ";this.f=sqAt", ctx); return ctx.f };
  const f = mk(false);
  assert.equal(f({ clientX: X0 + 4 * S, clientY: Y0 + 5 * S }), 5 * 9 + 4, "正中間");
  assert.equal(f({ clientX: X0 + 4 * S + .49 * S, clientY: Y0 + 5 * S - .49 * S }), 5 * 9 + 4, "偏了快半格也還是同一點");
  assert.equal(f({ clientX: X0 + 4 * S + .51 * S, clientY: Y0 + 5 * S }), 5 * 9 + 5, "過了半格才換鄰點");
  assert.ok(f({ clientX: X0 - .49 * S, clientY: Y0 - .49 * S }) === 0, "邊線外半格內也算（-0 也是第 0 格）");
  assert.equal(f({ clientX: X0 - .51 * S, clientY: Y0 }), -1);
  assert.equal(mk(true)({ clientX: X0, clientY: Y0 }), 89, "翻轉盤照樣");
});

test("H P3-2／P3-3／P3-4／P3-5／P3-10、F P3-1：小鈕撐到 44、棋規展開不疊 3D 鈕、車輪戰桌號不切字、中文窄螢幕標題兩行、灰色悔棋", () => {
  for (const s of ["#rf button,.st-tabs button,.st-seg button,.st-res button,#dmP,#dmG,#dmN{min-height:44px}", ".rg-go{min-height:44px;display:flex!important;", "details.rule-note[open]+.pk3d-back button{margin-top:6px}", ".sim-tb{height:auto!important;min-height:44px;", "@media (max-width:480px){html:not([lang^=en]) #title:not(:has(*)){white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;", ".xq-off{opacity:.45;filter:grayscale(1)}"]) assert.ok(TAP.includes(s), s);
  assert.ok(U.includes('s.textContent=SAFE_LR_CSS+"\\n"+TAP44_CSS;'), "跟 SAFE_LR_CSS 一起注入");
  /* m.css 的 .pk3d-back button 是 margin-top:-14px（疊上去的原因）；rule-note 是 details，3D 鈕緊接在它後面 */
  assert.ok(rd("xiangqi-db/m.css").includes(".pk3d-back button{position:relative;isolation:isolate;min-height:44px;margin-top:-14px;"));
  assert.ok(U.includes('note=document.createElement("details");note.className="rule-note muted"') && M("06-cpu.js").includes('(vw.querySelector(".rule-note")||st).after(r)'));
  assert.ok(M("08s-simul.js").includes(".sim-tb{position:relative;flex:1 0 30px;min-width:30px;max-width:58px;height:42px;"), "原本固定 42 高");
  /* 千秋盃屏風、首頁、星槎入口都是 .shp-spot：07z 的 ::before 撐到 44；星槎「🌀 立體」m.css 的 .shp-gy::before 上下各 11px */
  assert.ok(M("07y7-cupmap.js").includes('<button class="shp-spot cp2-tag" id="cp2Scr"'));
  assert.ok(M("07z-homemap.js").includes(".shp-spot::before,.shp-hs::before,.po-sight::before{content:\"\";position:absolute;"));
  assert.ok(rd("xiangqi-db/m.css").includes(".shp-gy::before{content:\"\";position:absolute;left:-4px;right:-4px;top:-11px;bottom:-11px}"));
  /* P3-10 */
  const B = M("08b-cpugame.js");
  assert.ok(B.includes('acts.undo.hidden=false;acts.undo.classList.toggle("xq-off",noU);acts.undo.setAttribute("aria-disabled",noU?"true":"false");'));
  assert.ok(B.includes('if(KIND(st)==="cpu"){vibrate(5);return toast(cgT("undo.cpuNo","挑戰電腦不能悔棋（要比真實力）；擂台、石桌往事的對局可以悔棋"))}'));
  assert.ok(B.indexOf('if(st.practice){if(!st.moves.some(m=>m.by===st.human)){vibrate(5);return toast(cgT("undo.noMove","還沒有可以悔的棋：走過一步以後才能悔棋"))}return post("/play/undo")}if(KIND(st)==="cpu")') > 0, "錯棋重練照舊能悔棋（11/17 B 第 29 輪 N29-1：還沒走棋時說明）");
  assert.ok(M("07i18n.js").includes('"undo.cpuNo":"No undo against the computer'));
});

test("H P3-6：練功房 10～18 級原意是「只提示不鎖」→ 字改成不像鎖住；H P3-9：快棋模式、預走跟著設定房間「試看棋盤」一起出現", () => {
  const C = M("07z5-cpuroom.js");
  assert.ok(C.includes("後兩卷在前一卷還沒通關任何一級時畫淡一點（只是提醒，照樣可以選）。"), "原本的設計意圖");
  assert.ok(C.includes('${dim?"・可以直接選，建議先贏過前一卷":""}') && !C.includes('${dim?"・前一卷還沒通關":""}'));
  assert.ok(M("07i18n.js").includes('"可以直接選，建議先贏過前一卷":"open to play; beating the previous scroll first is suggested"'));
  const SM = M("07s2-setmap.js"); assert.ok(SM.includes('smBoard:["el:#pv","sec:#th","el:#hiCon","sec:#mv","sec:#rsO","sec:#blitzSw"]'));
  /* 05-settings：#blitzSw、#premoveSw 跟在「電腦下棋節奏」標題底下、中間沒有別的標題（sec: 會整段搬過去） */
  const S5 = M("05-settings.js"), a = S5.indexOf('data-i18n="set.pace">電腦下棋節奏'), b1 = S5.indexOf('id="blitzSw"'), b2 = S5.indexOf('id="premoveSw"');
  assert.ok(a > 0 && b1 > a && b2 > b1); assert.ok(!S5.slice(a + 10, b2).includes('class="sec-t"'), "同一段");
});

test("F P2-2、K P3-7：還沒遇到的夥伴、秘境棋友、園子棋友改成「尚未相遇」（七星夥伴是整個人的剪影）；石桌往事目錄未開的回寫「尚未開啟」；英文同步", () => {
  const P = M("07pty-party.js");
  /* 11/17 B 第 29 輪 N29-2：淺色底搬到外層 .pty-sil（濾鏡不再壓黑底），test-r29b-1117.js 驗 */
  assert.ok(P.includes('return`<div class="pty-c lk"><span class="pty-sil">${img}</span><div><div class="pty-n">尚未相遇<small>'));
  assert.ok(P.includes(".pty-c.lk img{filter:brightness(0) opacity(.62);object-fit:contain;object-position:center bottom;background:none;") && P.includes(".pty-sil{display:block;width:64px;height:85px;border-radius:8px;overflow:hidden;background:radial-gradient("), "剪影不裁、淺色底");
  assert.ok(P.includes('const img=`<img src="data/xs/prev_${c}.webp" alt="">`;'), "用現有立繪（不出新圖）");
  const L = M("07-legend.js"), G = M("07d-garden.js");
  assert.ok(!/？？？/.test(P.replace(/\/\*[\s\S]*?\*\//g, "")) && !L.includes('<b>？？？</b>') && !L.includes('"？？？（還沒找到）"') && !L.includes(':"？？？"}') && !G.includes("<b>？？？</b><small>還沒遇過</small>"));
  assert.ok(L.includes('<b>${locked?"尚未相遇":esc(x.name)}</b>') && L.includes('${o?esc(title(k)):"尚未開啟"}') && G.includes("<b>尚未相遇</b>"));
  const I = M("07i18n.js"); assert.ok(I.includes('"尚未相遇":"Not met yet"') && I.includes('"尚未開啟":"Not opened yet"'));
});

test("K P1-1：觀星臺四個全螢幕面板頂列讓開左右安全區；往下滑（pointer 或 touch）等於按 ✕，只按一次；Esc 也能關", () => {
  assert.ok(TAP.includes(".gx-top,.gxd-top,#dglXs .xs-top{padding-left:calc(12px + env(safe-area-inset-left,0px))!important;padding-right:calc(12px + env(safe-area-inset-right,0px))!important}"));
  const L = vm.runInNewContext(between(U, "const XQ_OV_SWIPE=", ";\n").replace("const XQ_OV_SWIPE=", ""));
  assert.deepEqual(JSON.parse(JSON.stringify(L)), [[".gx-ov", ".gx-x"], [".gxd-ov", ".gxd-x"], ["#dglXs", '[data-x="close"]']]);
  assert.ok(M("07gx-galaxy.js").includes('ov.className="gx-ov"') && M("07gxp-gatepano.js").includes('ov.className="gx-ov gxp"') && M("07gxd-daily.js").includes('ov.querySelector(".gxd-x").onclick') && M("07dgl-stamina.js").includes('o.id="dglXs"') && M("07dgl-stamina.js").includes('data-x="close" aria-label="關閉">✕</button>'));
  /* 用假的 document 跑那一段 */
  const code = between(U, "const XQ_OV_SWIPE=", "function safeLRCss(){");
  const H = {}; let clicks = 0, now = 1000;
  const btn = { click: () => { clicks++ } }, ov = { scrollTop: 0, dataset: {}, querySelector: s => s === ".gx-x" ? btn : null };
  const tgt = { closest: s => s === ".gx-ov" ? ov : null };
  const document = { addEventListener: (t, f) => { H[t] = f }, contains: () => true, querySelector: () => null };
  const ctx = { document, innerHeight: 678, Date: { now: () => now } }; vm.createContext(ctx); vm.runInContext(code, ctx);
  H.pointerdown({ target: tgt, clientX: 200, clientY: 120, isPrimary: true }); now += 300; H.pointerup({ clientX: 210, clientY: 260 });
  assert.equal(clicks, 1, "往下滑 140px：按了 ✕");
  /* 同一下滑 touch 也送到：不再按第二次 */
  H.touchstart({ target: tgt, touches: [{ clientX: 200, clientY: 120 }] }); H.touchend({ changedTouches: [{ clientX: 210, clientY: 260 }] });
  assert.equal(clicks, 1, "只按一次");
  /* 新的面板：pointer 被取消（iPhone 回彈）時 touch 照樣關得掉 */
  ov.dataset = {}; H.pointerdown({ target: tgt, clientX: 200, clientY: 100, isPrimary: true }); H.pointercancel(); H.touchstart({ target: tgt, touches: [{ clientX: 200, clientY: 100 }] }); now += 200; H.touchend({ changedTouches: [{ clientX: 205, clientY: 230 }] });
  assert.equal(clicks, 2, "pointercancel 後 touch 照樣能關");
  ov.dataset = {}; H.pointerdown({ target: tgt, clientX: 200, clientY: 500, isPrimary: true }); H.pointerup({ clientX: 200, clientY: 650 }); assert.equal(clicks, 2, "從下半部滑（清單、棋盤）不算");
  ov.dataset = {}; ov.scrollTop = 40; H.pointerdown({ target: tgt, clientX: 200, clientY: 100, isPrimary: true }); H.pointerup({ clientX: 200, clientY: 300 }); assert.equal(clicks, 2, "還沒捲到頂不算");
  ov.scrollTop = 0; H.pointerdown({ target: tgt, clientX: 200, clientY: 100, isPrimary: true }); H.pointerup({ clientX: 330, clientY: 210 }); assert.equal(clicks, 2, "橫著滑（全景拖曳）不算");
  ov.dataset = {}; document.querySelector = s => s === ".gx-ov" ? ov : null; H.keydown({ key: "Escape" }); assert.equal(clicks, 3, "Esc");
});

test("K P1-2、P1-3、P2-1、P2-2：頁面內容區（棋盤、3D、車輪戰）讓開側邊安全區；首頁節氣章讓開；底部抽屜 ✕ 44×44；暗幕一點就關；角色小選單、暱稱 44；角色選單不跑出畫面", () => {
  for (const s of ["#view.view,.view{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}", "html .sw7-now{right:calc(3% + env(safe-area-inset-right,0px))}", ".sheet .sh-x{width:44px;height:44px;line-height:44px;top:4px}", ".scrim,.xqs-s{cursor:pointer;touch-action:manipulation}", ".shw-menu button{min-height:44px}", "html .me-nick{right:calc(10px + env(safe-area-inset-right,0px))}", ".me-nick::after{content:\"\";position:absolute;left:0;right:0;top:50%;height:44px;"]) assert.ok(TAP.includes(s), s);
  assert.ok(rd("xiangqi-db/m.html").includes('<div class="view" id="view"></div>'), "棋盤、3D 園子都在 #view 裡");
  /* SAFE_LR_CSS 原本就讓開的：頂欄（全站地圖鈕在 #topRight 裡）、首頁稱號與修為（.hq-h）、sheet 的 ✕ */
  const SL = vm.runInNewContext(between(U, "const SAFE_LR_CSS=", ";   /*").replace("const SAFE_LR_CSS=", ""));
  for (const s of [".topbar{padding-left:calc(6px + env(safe-area-inset-left,0px));padding-right:calc(6px + env(safe-area-inset-right,0px))}", "html .hq-h{padding-right:calc(14px + env(safe-area-inset-right,0px))}", ".sheet .sh-x{right:calc(10px + env(safe-area-inset-right,0px))}"]) assert.ok(SL.includes(s), s);
  assert.ok(U.includes("{const t0=Date.now();sc.onclick=()=>{if(Date.now()-t0<350)return;closeSheet()}}") && U.includes('sh.addEventListener("touchend",e=>{if(y0!=null&&e.changedTouches[0].clientY-y0>60)closeSheet();y0=null})'), "暗幕點一下、往下拉都會關");
  assert.ok(M("07w-shipwalk.js").includes("lim=(window.visualViewport?visualViewport.height:innerHeight)-42;if(r.bottom>lim)menu.style.top="));
});

test("K P2-5：全站地圖、今日推薦、棋理頁不再寫「小實驗：」；英文同步；功能（網址）不動", () => {
  const all = ["07z6-sitemap.js", "07f-ship.js", "07z7-lesson.js"].map(f => [f, M(f).replace(/\/\*[\s\S]*?\*\//g, "")]);
  for (const [f, s] of all) assert.ok(!s.includes("小實驗："), f);
  const SM = M("07z6-sitemap.js"); assert.ok(SM.includes('["棋理體驗・唐站","#/lesson/tang",') && SM.includes('["先吃子還是先解圍","#/lab/grab",'));
  const J = JSON.parse(rd("xiangqi-db/i18n-en.json")).en;
  for (const k of ["棋理體驗・唐站", "先吃子還是先解圍", "⚖️ 先吃子還是先解圍？", "🧩 唐站棋理體驗", "⚖️ 先吃子還是先解圍", "⚖️ 下一題：先吃子還是先解圍"]) { assert.ok(J[k], k); assert.ok(!/Mini Lab|experiment/i.test(J[k]), k) }
});

test("K P3-3：殘篇閣的「🧪 測試房」只在測試房出現；正式房（xq_netRoot 沒設、或設成 xq_test 以外的正式值）不會出現", () => {
  const C = M("07q2-coop.js"), fn = between(C, "const cplTestRoom=", ";\n").replace("const cplTestRoom=", "");
  const run = root => { const N = { root: () => root }; return vm.runInNewContext("(" + fn + ")()", { window: { XQNet: N }, XQNet: N }) };
  assert.equal(run("xqlab-r7k2q/v1"), false, "正式大廳"); assert.equal(run("xqlab-test-xq_test/v1"), true); assert.equal(run("xqlab-test-local/v1"), true);
  assert.equal(vm.runInNewContext("(" + fn + ")()", { window: {} }), false, "還沒連線");
  assert.ok(C.includes("${cplTestRoom()?'<p class=\"muted\" style=\"font-size:12px;margin-top:10px\">🧪 測試房</p>':\"\"}"), "字只在 cplTestRoom() 為真時畫");
  const N = rd("xiangqi-lab/src/net.js"); assert.ok(N.includes('let ROOT="xqlab-r7k2q/v1";') && N.includes('if(r&&/^[\\w-]{3,40}$/.test(r))ROOT="xqlab-test-"+r+"/v1"'), "沒設 xq_netRoot＝正式房");
});

test("K P3-4：原生包不放 source/（App 內沒有地方讀本機 source/，GPL 原始碼連到公開倉庫）", { skip: IOS }, () => {
  const CW = rd("xiangqi-ios/scripts/copy-www.js"); assert.ok(CW.includes("  /^source(\\/|$)/,"));
  const re = /^source(\/|$)/; for (const p of ["source/xiangqi-lab/tools/test-family.js", "source/README.md", "source"]) assert.ok(re.test(p), p); for (const p of ["data/docs/foss.md", "sw.js", "resources/x"]) assert.ok(!re.test(p), p);
  for (const f of fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js"))) { const s = M(f); assert.ok(!/fetch\(\s*["'`](\.\/)?source\//.test(s) && !/["'`]source\/[\w-]+\.js/.test(s), f + " 讀本機 source/") }
  assert.ok(M("05-settings.js").includes('${L(ABOUT_REPO+"/tree/main/source","source/")}'), "關於頁連公開倉庫");
});

test("K P3-6：直接開 #/legend（沒帶哪一段）補一句從哪裡進、一顆去書架；#/ouyu、#/qqev 本來就有說明卡", () => {
  const S = M("08-scene.js"); assert.ok(S.includes("「回到當年」要從石桌往事進來：在星槎的書架打開一回，讀完點「🕰 回到當年」，就會帶你到那一盤當年的棋。") && S.includes('g.onclick=()=>{location.hash="#/ship/shelf"}'));
  assert.ok(M("07h-qqev.js").includes("這件雲河怪事已經過去了。") && M("07w5-ouyu.js").includes("這位客人已經走了。下次在渡口、驛站遇到再幫他吧。"));
});

test("K P3-9：護眼／休息提醒在剛換進對局頁時不跳（等這盤下完）；第二次 16 分鐘是「等一下再說」的 15 分鐘再提醒", () => {
  const F = M("07m5-family.js");
  assert.ok(F.includes("if(FM_E.pc&&now-FM_E.pc<5000&&!fmBusy())return true;"));
  assert.ok(F.includes("FM_EYE_SNOOZE=15") && F.includes("FM_E.due=FM_E.acc+FM_EYE_SNOOZE*6e4"), "略過＝15 分鐘後再提醒（設計如此）");
});

/* ---------- 11/17 第二批（協調者補的三件事＋第 9 節） ---------- */
test("開關定案：問小帥的 Google AI／Gemini 兩版都拿掉（ASK_EXT_AI_WEB＝false）、古譜講解只給開發者（AN_LLM_WEB＝false）；說明文件不再分 App 版和網頁版", () => {
  assert.ok(M("09-askbot.js").includes("const ASK_EXT_AI_WEB=false;") && M("10-db.js").includes("const AN_LLM_WEB=false;"));
  const P = rd("xiangqi-db/art/docs/privacy.md"), H = rd("xiangqi-lab/src/privacy.html"), F = rd("xiangqi-db/art/docs/family.md");
  assert.equal(P, rd("xiangqi-lab/site/data/docs/privacy.md")); assert.equal(F, rd("xiangqi-lab/site/data/docs/family.md"));
  assert.ok(P.includes("- 問小帥沒有「Google AI 回答」「問 Gemini」這兩顆（2026 年 11 月 17 日拿掉），不會把你的問題送到 Google。"));
  assert.ok(!/按「Google」「Gemini」會打開外部網站|App 版沒有「Google AI 回答」|不顯示 Google／Gemini 按鈕/.test(P));
  assert.ok(H.includes("問小帥沒有「Google AI 回答」「問 Gemini」這兩顆") && H.includes('Ask Xiao Shuai has no "Google AI answer" or "Ask Gemini" buttons') && !/On the web, the "Google"|網頁版按「Google」/.test(H));
  assert.ok(!F.includes("「🔎 Google AI 回答」「✨ 問 Gemini」按鈕不顯示。"), "家長文件不再說「兒童模式才不顯示」");
  if (!IOS) assert.ok(rd("xiangqi-ios/appstore/app-privacy.md").includes("問小帥的 Google／Gemini 按鈕 11/17 已經拿掉"));
});

test("檢舉 7 天內處理：limits.md、支援頁、審核備註同一個說法；metadata 待勾項目勾掉", () => {
  const L = rd("xiangqi-db/art/docs/limits.md"); assert.equal(L, rd("xiangqi-lab/site/data/docs/limits.md"));
  assert.ok(L.includes("- 目前沒有即時客服；開發者逐筆看，檢舉 7 天內處理。") && !L.includes("處理時間沒有保證"));
  assert.ok(rd("xiangqi-lab/src/support.html").includes("目標在 7 天內處理"));
  if (!IOS) { const MD = rd("xiangqi-ios/appstore/metadata.md"); assert.ok(MD.includes("> ☑ 檢舉處理時限「7 天」：開發者 11/17 回覆「檢舉 7 天內可以處理」") && !MD.includes("檢舉處理時限「7 天」要開發者確認做得到")); assert.ok(MD.includes("Reports are handled within 7 days.")) }
});

test("K P2-3：被相機切到的字——石桌往事封面直排標題、開場名句、找棋子提示列讓開側邊安全區；殘篇閣說明在 .view 裡（.view 已讓開）；找棋子的提示鈕 44", () => {
  for (const s of ["html .bk-title{right:calc(16px + env(safe-area-inset-right,0px))}", "html .ld-q{padding-left:calc(28px + env(safe-area-inset-left,0px));padding-right:calc(28px + env(safe-area-inset-right,0px))}", "html .xsm-ban{left:calc(8px + env(safe-area-inset-left,0px));right:calc(8px + env(safe-area-inset-right,0px))}", ".xsm-ban button{min-height:44px;min-width:44px}"]) assert.ok(TAP.includes(s), s);
  const C = rd("xiangqi-db/m.css");
  assert.ok(C.includes(".bk-title{position:absolute;right:16px;top:16px;") && C.includes(".bk-title b{writing-mode:vertical-rl;"), "直排標題原本貼右上 16px");
  assert.ok(C.includes(".ld-q{position:absolute;left:0;right:0;top:max(7vh,env(safe-area-inset-top,0px));padding:0 28px;"), "名句原本左右只有 28px");
  assert.ok(M("07xsm-ximarket.js").includes('<button type="button" data-h>💡 提示</button>') && M("07xsm-ximarket.js").includes(".xsm-ban button{flex:none;min-height:36px;"));
  assert.ok(M("07q2-coop.js").includes('v.className="view";') && M("07q2-coop.js").includes("只能用暗語提示"), "殘篇閣說明在 .view 裡");
});

test("K P2-4：石桌往事封面下的「讀第一回／闖關」留出底部安全區；滿版圖頁可以往下捲出安全區；捲不動的頁面，靠下的入口自己往上挪", () => {
  assert.ok(TAP.includes(".bk-mark{margin-bottom:calc(14px + env(safe-area-inset-bottom,0px))}") && TAP.includes(".view:has(> .shp-page){padding-bottom:env(safe-area-inset-bottom,0px)}"));
  assert.ok(M("07-legend.js").includes('id="bkRead"') && M("07xsm-ximarket.js").includes('["xsmVisit","七星來訪",81,74'));
  const code = between(U, "function xqSpotClampY(){", "\ntry{const go=");
  const mk = (scroll, tops) => {
    const spots = tops.map(([top, b]) => ({ style: { top }, dataset: {}, getBoundingClientRect() { const sh = this.style.top.match(/- (\d+)px\)$/); const d = sh ? +sh[1] : 0; return { height: 30, bottom: b - d } } }));
    const V = { scrollHeight: scroll ? 900 : 678, clientHeight: 678, querySelectorAll: () => spots };
    const ctx = { innerHeight: 678, window: {}, getComputedStyle: () => ({ overflowY: "auto" }), document: { getElementById: () => V, createElement: () => ({ style: {}, remove() {}, get offsetHeight() { return 34 } }), body: { append() {} } } };
    vm.createContext(ctx); vm.runInContext(code + ";this.f=xqSpotClampY", ctx); return { f: ctx.f, spots };
  };
  const A = mk(false, [["74%", 691], ["40%", 300]]); A.f();
  assert.equal(A.spots[0].style.top, "calc(74% - 53px)", "691 → 678−34−6＝638，往上 53px"); assert.equal(A.spots[1].style.top, "40%", "看得到的不動");
  A.f(); assert.equal(A.spots[0].style.top, "calc(74% - 53px)", "再量一次照原位重算，不會越挪越高");
  const B = mk(true, [["74%", 691]]); B.f(); assert.equal(B.spots[0].style.top, "74%", "捲得動的頁面不挪（捲下去看得到）");
  assert.ok(U.includes('addEventListener("hashchange",go);addEventListener("resize",go);addEventListener("orientationchange",go)'));
});

test("F P3-2：棋話一頁（.shl-board）、古戰場（.bt2）不顯示甲板上走路的小人（body 直屬的 .xqbot）", () => {
  assert.ok(TAP.includes("body:has(.shl-board)>.xqbot,body:has(.bt2)>.xqbot{display:none!important}"));
  assert.ok(M("07f-ship.js").includes('<div class="shl-board"') && M("07g-battle.js").includes('class="bt2'));
  assert.ok(M("07f-ship.js").includes('const SHS_NOBOT="<style>body:has(.shs-card)>.xqbot{display:none!important}</style>";'), "跟說明卡頁同一套做法");
});

test("我的角色頁、二十八宿：修為、園子棋友兩顆鈕至少 44；提示棋、棋罐那幾格是 56 高的資訊格（不是按鈕）；二十八宿每宿的點擊判定是整片扇形（.h）", () => {
  assert.ok(TAP.includes("#meXp,#gdMeB,#gdMeH{min-height:44px;min-width:44px}"));
  const L = M("07-legend.js"); assert.ok(L.includes('<button id="meXp" aria-label="修為 Lv') && L.includes('<div class="hx"><span>🫙</span><b>${jarN()}<small>棋罐'));
  assert.ok(rd("xiangqi-db/m.css").includes("display:flex;align-items:center;justify-content:center;gap:6px;height:56px;padding:0 14px;"), ".hx 56 高");
  const D = M("07dgl-stamina.js"); assert.ok(D.includes("r0=DGL_XS_R-46,r1=DGL_XS_R+46") && D.includes("#dglXs svg .h{fill:transparent}"), "扇形徑向 92（圖寬 768 的座標），手機上約 56px");
});

test("K P3-8（開發者選「星空場景不放凳子」）：今日異象、自由擺陣、十三星系、黑洞這類星空環景不放兩張石鼓凳；園子、橋上、車輪戰棋館、雲河鎮照舊", () => {
  const P = rd("xiangqi-lab/src/park3d.js"), f = vm.runInNewContext("(" + between(P, "function parkSkyBg(bg){", "\n").replace(/\n$/, "") + ")");
  /* App 各處實際傳給 park3d 的環景（ex.bg） */
  const G = M("07gx-galaxy.js"), D = M("07gxd-daily.js"), S = M("08s-simul.js"), Y = M("07y-hubmap.js"), B = M("08b-cpugame.js");
  assert.ok(G.includes('return{bg:"data/park/blackhole_360.webp",ground:gxGround(id),indoor:true,') && D.includes('return{bg:"data/park/blackhole_360.webp",ground:"data/gxground/"'), "十三星系、今日異象／自由擺陣用星空環景（indoor）");
  assert.ok(M("07bh-blackhole.js").includes('bg:"data/park/bh_far2.webp"') && M("07bhw-wheel.js").includes('bg:"data/park/bh_far2.webp"'));
  for (const bg of ["data/park/blackhole_360.webp", "data/park/bh_far2.webp", "data/park/blackhole_360.webp?v=2"]) assert.equal(f(bg), true, bg);
  for (const bg of ["data/park/simul_360.webp", "data/park/bridge_ming_360.webp", "data/park/j1_360.webp", "data/pano/classic_ground.webp", null, undefined, "#05060d"]) assert.equal(f(bg), false, String(bg));
  assert.ok(S.includes('bg:"data/park/simul_360.webp"') && B.includes("bg:JS0?`data/park/j${JR[JS0.r].k}_360.webp`"), "這些照舊放凳子");
  if (Y.includes("function hbBridge(")) assert.ok(Y.includes('bg:"data/park/bridge_"'), "橋上環景（07y hbBridge）照舊放凳子");   /* 11/18：橋上環景還沒發布（公開副本的 07y 沒有 hbBridge），有這個功能的版本才驗 */
  /* 兩處放凳子的地方都看 X.sky；X.sky 由 opt.bg 算 */
  assert.ok(P.includes("if(X.indoor){F3D=true;if(!X.sky)for(const[x,z]of STOOLS){K.at(x,0,z);OX=x;OZ=z;f.stool()}}"));
  assert.ok(P.includes("else{F3D=true;f.bench();if(!X.sky)for(const[x,z]of STOOLS){K.at(x,0,z);OX=x;OZ=z;f.stool()}"));
  assert.ok(P.includes("indoor:!!opt.indoor,giant:!!opt.giant,sky:parkSkyBg(opt.bg)});"));
  assert.ok(P.includes("STOOLS=[[-14.5,1.5],[14.5,-1.5]]"), "左右各一張（就是那兩個白圓）");
});

test("K P3-5、H P3-8：字級變大——沒設 text-size-adjust，iOS 轉向／摺疊後會自動放大文字（Text Autosizing），版面跟著被撐開；補上 100%", () => {
  assert.ok(TAP.includes("html{-webkit-text-size-adjust:100%;text-size-adjust:100%}"));
  assert.ok(!/text-size-adjust/.test(rd("xiangqi-db/m.css")), "m.css 原本沒有");
});
