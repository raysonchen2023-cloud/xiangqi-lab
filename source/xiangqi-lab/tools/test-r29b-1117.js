// 11/17 測試員 B 第 29 輪（候選版 2120）N29-1～N29-7。不開瀏覽器：原始碼、vm 跑純函式、從座標推算。
// 用法：node --test xiangqi-lab/tools/test-r29b-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };

test("N29-1：挑戰電腦的灰色悔棋不用 disabled（點得到），灰色＋aria-disabled；晉級賽、練功房點了一律說明不能悔棋（走沒走過都一樣）；錯棋重練沒走棋說明還沒有可以悔的、走過一步照原本悔棋", () => {
  const C = M("08b-cpugame.js");
  /* 11/18 第 31 輪 N31-1：錯棋重練的 KIND 是 "practice"，也不設 disabled（test-r31-1118.js 跑各種對局的狀態） */
  assert.ok(C.includes('acts.undo.disabled=!undoK&&(st.ranked||noMv);'), "挑戰電腦、錯棋重練不設 disabled（其他對局照舊）");
  assert.ok(C.includes('noU=(cpuK&&!st.practice)||(!!st.practice&&noMv);') && C.includes('acts.undo.classList.toggle("xq-off",noU);acts.undo.setAttribute("aria-disabled",noU?"true":"false");'));
  assert.ok(C.includes("if(!st.practice&&!acts.undo.disabled&&!noU)acts.undo.innerHTML="), "晉級賽不顯示悔棋符張數");
  /* 跑 undoAsk */
  const fn = between(C, "  function undoAsk(){", "const n=undoLeft();");
  const run = st => { const L = []; const ctx = { st, KIND: s => s.kind, vibrate() {}, toast: s => L.push(["toast", s]), post: u => L.push(["post", u]), cgT: (k, z) => k + "|" + z, itemBlock: () => "" };
    vm.createContext(ctx); vm.runInContext(fn + "return['go']}" + ";this.r=undoAsk()", ctx); return L[0] || ctx.r };
  assert.match(run({ kind: "cpu", ranked: true, human: "r", moves: [{ by: "r" }] })[1], /^undo\.cpuNo\|挑戰電腦不能悔棋/, "晉級賽：說明");
  assert.match(run({ kind: "cpu", ranked: true, human: "r", moves: [] })[1], /^undo\.cpuNo/, "晉級賽還沒走：一樣說明");
  assert.match(run({ kind: "cpu", ranked: false, human: "r", moves: [] })[1], /^undo\.cpuNo/, "練功房（挑戰電腦、不算分）還沒走：一樣說明（原本 disabled 點不出來）");
  assert.match(run({ kind: "cpu", ranked: false, human: "r", moves: [{ by: "r" }] })[1], /^undo\.cpuNo/, "練功房走過一步：照原本點了說明");
  assert.match(run({ kind: "cpu", practice: true, human: "r", moves: [] })[1], /^undo\.noMove\|還沒有可以悔的棋/, "錯棋重練（st.practice）還沒走");
  assert.deepEqual(run({ kind: "cpu", practice: true, human: "r", moves: [{ by: "r" }, { by: "b" }] }), ["post", "/play/undo"], "錯棋重練走過一步：照原本悔棋");
  assert.ok(M("07i18n.js").includes('"undo.noMove":"Nothing to undo yet: you can undo after you\'ve made a move"'));
  assert.ok(M("00-util.js").includes(".xq-off{opacity:.45;filter:grayscale(1)}"), "灰色樣式");
});

test("N29-2：卡冊沒遇到的夥伴：淺色底在外層 .pty-sil，濾鏡只壓人物圖（看得出人形，不再整格灰）", () => {
  const P = M("07pty-party.js");
  assert.ok(P.includes('return`<div class="pty-c lk"><span class="pty-sil">${img}</span><div>'));
  const sil = (P.match(/\.pty-sil\{[^}]*\}/) || [""])[0], im = (P.match(/\.pty-c\.lk img\{[^}]*\}/) || [""])[0];
  assert.ok(/background:radial-gradient\(ellipse at 50% 38%,#fffaf0/.test(sil) && /width:64px;height:85px/.test(sil), "底在外層");
  assert.ok(/filter:brightness\(0\) opacity\(\.62\)/.test(im) && /background:none/.test(im) && !/radial-gradient/.test(im), "濾鏡那一層沒有底色");
  assert.ok(!/\.pty-sil\{[^}]*filter/.test(P), "外層沒有濾鏡");
});

test("N29-3：序幕卡回開頭畫面再「▶ 繼續」：開場途中不先 goHome（history.go 晚一步會把網址換回首頁）；序幕卡一定等到在星槎頁才出", () => {
  const S = M("05b-save.js"), ln = S.split("\n").find(l => l.includes('on("#tGo",'));
  assert.ok(ln.includes('let mid="";try{mid=typeof stqXuMid==="function"?stqXuMid():""}catch(e){}if(!/^(xu|land|pro)$/.test(mid)&&!/^(#\\/?)?$/.test(location.hash||""))goHome();'));
  const Q = M("07stq-starter.js");
  assert.ok(Q.includes('const pro=n=>{try{if(!onA()&&n<4){location.hash="#/adventure";setTimeout(()=>pro(n+1),400);return}prologue()}catch(e){}};setTimeout(()=>pro(0),500);return m}'));
  /* 模擬：0.5 秒那一刻網址被 history.go 換回 #/，下一輪換回 #/adventure 才出序幕卡 */
  const body = between(Q, 'if(m==="pro"){', "return m}") + "return m}";
  const T = []; const loc = { hash: "#/" }; let shown = null;
  const ctx = { location: loc, prologue: () => { shown = loc.hash }, setTimeout: (f, ms) => T.push(f) }; vm.createContext(ctx);
  vm.runInContext("(function(m){" + body + "})('pro')", ctx);
  assert.equal(loc.hash, "#/adventure"); loc.hash = "#/";   /* history.go 晚到 */
  while (T.length && shown == null) T.shift()();
  assert.equal(shown, "#/adventure", "序幕卡出現時在星槎頁");
});

test("N29-4：「新地點開放」過場照季節選圖（觀星臺 gxtSrc、西市 xsmSrc），載不到退回原圖；觀星臺開局過場（07gxd gate）也照季節", () => {
  const U = M("07ulk-unlockfx.js");
  const ctx = { innerWidth: 390, innerHeight: 844, gxtKind: (W, av, vw, vh) => W / av >= 1.5 && Math.min(vw, vh) >= 600 ? "w" : "", gxtSrc: (k, d) => `gx:${k}:${d}:winter`, xsmSrc: (d, t) => `xm:${d}:${t}:winter` };
  vm.createContext(ctx); vm.runInContext(between(U, "const ULK_PLACES=", "/* 11/17 Windows 測試員 B-3") + between(U, "function ulkImg(p,day){", "const ulkDay=") + ";this.f=ulkImg;this.P=ULK_PLACES", ctx);
  const g = ctx.P.find(p => p.k === "gxt"), x = ctx.P.find(p => p.k === "xsm");
  assert.equal(ctx.f(g, true), "gx::true:winter"); assert.equal(ctx.f(x, false), "xm:false:false:winter");
  ctx.innerWidth = 1280; ctx.innerHeight = 720; assert.equal(ctx.f(g, false), "gx:w:false:winter", "橫螢幕用寬版");
  delete ctx.gxtSrc; delete ctx.xsmSrc; assert.equal(ctx.f(g, true), "data/guanxing/gx_tai_day.webp", "沒有 07gxt 才用原圖");
  assert.ok(U.includes('o.innerHTML=`<img src="${ulkImg(p,ulkDay())}" alt="">') && U.includes("im.onerror=()=>{if(im.getAttribute(\"src\")!==f0)im.src=f0}"), "冬景載不到退回原圖");
  assert.ok(M("07gxd-daily.js").includes('gate:{img:[(()=>{try{if(typeof gxtSrc==="function")return gxtSrc("w",false)}catch(e){}return"data/guanxing/gx_tai_w.webp"})()]'));
  /* 其他模組沒有再寫死觀星臺、西市的圖 */
  const bad = []; for (const f of fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js") && !/^07(gxt|xsm|ulk)/.test(f))) { const s = M(f).replace(/\/\*[\s\S]*?\*\//g, ""); if (/["`](data\/(guanxing\/gx_tai|ximarket\/xm_)[^"`]*\.webp)/.test(s) && !/return"data\/guanxing\/gx_tai_w\.webp"/.test(s)) bad.push(f) }
  assert.deepEqual(bad, []);
});

test("N29-5：練習頁頂欄 430 寬以下一行：任務燈 22px、「我會下棋」可在鈕裡換行；390 寬中英文都放得下「⋯」", () => {
  const Q = M("07stq-starter.js");
  const r = "@media (max-width:430px){#stqPg .stq-top{flex-wrap:nowrap;gap:6px}#stqPg .stq-lp{gap:3px}#stqPg .stq-lp span{width:22px;height:22px;font-size:12px}#stqPg .stq-sk{flex:1 1 auto;min-width:0;white-space:normal;font-size:13px;line-height:1.15;padding:4px 8px}}";
  assert.ok(Q.includes(r));
  assert.ok(Q.includes("#stqPg .stq-mo{flex:none;width:44px;height:44px;"), "⋯ 不縮");
  for (const [W, txt, cw] of [[390, "我會下棋，直接開始", 13], [390, "I can play, start now", 13 * .55], [375, "我會下棋，直接開始", 13], [320, "我會下棋，直接開始", 13]]) {
    const avail = W - 16, lamps = 6 * 22 + 5 * 3, sk = avail - lamps - 44 - 2 * 6, inner = sk - 16 - 3;
    assert.ok(sk > 60, `${W}：「我會下棋」還有 ${sk}px`);
    const lines = Math.ceil([...txt].length * cw / inner); assert.ok(lines <= 2, `${W} ${txt}：${lines} 行`); assert.ok(lines * 13 * 1.15 + 8 + 3 <= 44, "高照舊 44");
  }
});

test("N29-6：冷開會出開頭畫面時，同一段 script 先蓋同色底幕（首頁不閃），saveBoot 跑完下一格拿掉；不改 m.html", () => {
  const S = M("05b-save.js");
  const f = vm.runInNewContext("(" + between(S, "function xqBootCovNeed(o){", "\n").replace("function xqBootCovNeed", "function") + ")");
  const b = { wd: false, shown: false, pro: false, upd: false, hash: "" };
  assert.equal(f(b), true); assert.equal(f({ ...b, hash: "#/" }), true);
  for (const k of ["wd", "shown", "pro", "upd"]) assert.equal(f({ ...b, [k]: true }), false, k);
  assert.equal(f({ ...b, hash: "#/cpu" }), false, "深連結不蓋");
  assert.ok(S.includes('d.id="xqBootCov";d.setAttribute("aria-hidden","true");d.style.cssText="position:fixed;inset:0;z-index:9997;background:#F3ECDD";document.body.append(d);setTimeout(xqBootCovOff,4000)'));
  assert.ok(S.includes('setTimeout(()=>{try{saveBoot()}catch(e){console.warn("saveBoot",e)}try{requestAnimationFrame(()=>xqBootCovOff())}catch(e){xqBootCovOff()}},0);'));
  assert.ok(rd("xiangqi-db/m.css").includes("#xqTitle{--text:#2a2018;") && /#xqTitle\{[^}]*z-index:9998;[^}]*background:#F3ECDD/.test(rd("xiangqi-db/m.css")), "底幕跟開頭畫面同色、低一層");
  const H = rd("xiangqi-db/m.html"), i0 = H.indexOf("//#include m/02-shell.js"), i5 = H.indexOf("//#include m/05b-save.js");
  assert.ok(i0 > 0 && i5 > i0 && H.slice(i0, i5).split("<script").length === 1, "02-shell（route）和 05b 在同一段 script：底幕在瀏覽器畫第一格之前就蓋上");
});

test("N29-7：聽雨茶坊的小帥只站暗棋桌前那塊地面（四塊透明禁區 data-bot-avoid，不攔點選）；窗、櫃台茶壺、左邊桌凳都在禁區", () => {
  const X = M("07xsm-ximarket.js"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(between(X, "const XSM_TEA_FLOOR=", "const XSM_RAIN=") + between(X, "const XSM_RAIN=", "\n") + between(X, "const XSM_TEA_SPOTS=", "\n") + ";this.F=XSM_TEA_FLOOR;this.N=XSM_TEA_NOBOT;this.h=xsmTeaNoBot();this.R=XSM_RAIN;this.S=XSM_TEA_SPOTS", ctx);
  const inN = (x, y) => ctx.N.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
  /* 整張圖除了地面那塊都在禁區 */
  for (let x = 0; x <= 100; x += 2) for (let y = 0; y <= 100; y += 2) { const fl = x > ctx.F[0] && x < ctx.F[2] && y > ctx.F[1] && y < ctx.F[3]; assert.equal(inN(x, y), !fl, `${x},${y}`) }
  for (const r of ctx.R) assert.ok(inN((r[0] + r[2]) / 2, (r[1] + r[3]) / 2), "窗");
  assert.ok(inN(70, 70) && inN(60, 78) && inN(10, 75), "櫃台茶壺、櫃台前緣、左邊桌凳");
  /* 地面那塊夠小帥站：390 寬時圖 390×699 */
  const w = (ctx.F[2] - ctx.F[0]) / 100 * 390, h = (ctx.F[3] - ctx.F[1]) / 100 * 699; assert.ok(w >= 100 && h >= 180, `${w}×${h}`);
  assert.ok(ctx.h.split('data-bot-avoid aria-hidden="true"').length === 5);
  assert.ok(X.includes(".xsm-tea .xsm-nobot{position:absolute;z-index:0;pointer-events:none;background:none}"), "不攔點選、看不到");
  assert.ok(X.includes("+xsmTeaNoBot()+xsmBtns(XSM_TEA_SPOTS)"), "只放在茶坊");
  assert.ok(rd("xiangqi-lab/src/bot3d.js").includes("[data-bot-avoid]"), "bot3d 會避開 data-bot-avoid");
});
