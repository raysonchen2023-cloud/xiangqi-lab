// 11/18 開發者「黑洞第一戰改成滿版戰鬥畫面」（選單：只有第一戰 bh:xu）：
//   頂欄、對手列、形勢條、場名、玩家列、輪到你、本關棋規、工具列收起來；3D／平面棋盤蓋滿螢幕；左上「⋯」（回開頭畫面、棋規、聲音、寶物）；
//   棋盤下緣「輪到你／星樞思考中…」＋四邊微光；開局淡入「星樞・黑洞星盤」；離開就恢復。只套在序局，其他對局不受影響。
// 不開瀏覽器：vm 跑 07bh 的片段（假 DOM），讀 CSS 算 375×812、430×932 的版面數字。實際畫面要測試員和實機看。
// 用法：node --test xiangqi-lab/tools/test-r39-1118.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, j) };
const BH = rd("xiangqi-db/m/07bh-blackhole.js");

function dom() {
  class El { constructor(t) { this.tag = t; this.children = []; this.parent = null; this.style = {}; this.attrs = {}; this.dataset = {}; this.id = ""; this._c = new Set(); this.textContent = ""; this.hidden = false;
      const me = this; this.classList = { add: (...a) => a.forEach(x => me._c.add(x)), remove: (...a) => a.forEach(x => me._c.delete(x)), contains: x => me._c.has(x), toggle: (x, on) => ((on ?? !me._c.has(x)) ? me._c.add(x) : me._c.delete(x)) } }
    append(...a) { for (const c of a) { c.parent = this; this.children.push(c) } } remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null }
    get isConnected() { let e = this; while (e.parent) e = e.parent; return e === D.html } setAttribute(k, v) { this.attrs[k] = String(v) } click() { this.onclick && this.onclick({ stopPropagation() {} }) }
    *walk() { for (const c of this.children) { yield c; yield* c.walk() } } }
  const D = {}; D.html = new El("html"); D.head = new El("head"); D.body = new El("body"); D.html.append(D.head, D.body);
  D.doc = { body: D.body, head: D.head, createElement: t => new El(t), getElementById: id => [...D.html.walk()].find(e => e.id === id) || null, querySelector: () => null };
  return D }
function kit(o) { o = o || {}; const D = dom(), T = [], modals = [], toasts = [];
  const ctx = { document: D.doc, location: { hash: o.hash || "#/journey/play" }, setTimeout: (f, ms) => { T.push([f, ms]); return T.length }, dispatchEvent() {}, Event: function () {}, matchMedia: () => ({ matches: !!o.rm }),
    getComputedStyle: () => ({ display: "none" }), modal: (h, b) => modals.push([h, b]), toast: s => toasts.push(s), esc: s => String(s), vibrate() {}, addEventListener() {}, stqXuLeave: o.noLeave ? undefined : () => toasts.push("LEAVE"), history: { back() {} } };
  if (o.noLeave) delete ctx.stqXuLeave;
  vm.createContext(ctx); vm.runInContext('const BHX_ID="bh:xu";' + between(BH, "function bhxLocked(st){", "\nlet BHX_W=0;") + ";this.X={bhxFullOn,bhxFullSync,bhxFullOff,bhxFullItems,bhxFullMenu,BHXF}", ctx);
  return { X: ctx.X, D, T, modals, toasts, ctx } }
const XU = (o) => Object.assign({ id: "g1", journey: "bh:xu", turn: "r", human: "r", result: null }, o || {});

test("只套在黑洞第一戰（序局 bh:xu）而且在對局頁：星門圍城、十三星系、今日異象、練功房、別頁都不套", () => {
  const { X } = kit();
  assert.equal(X.bhxFullOn(XU(), "#/journey/play"), true);
  for (const [st, h, why] of [[XU({ journey: "bh:qin" }), "#/journey/play", "十三星系"], [XU({ journey: "bh:gsv" }), "#/journey/play", "星門圍城"], [XU({ journey: "park" }), "#/journey/play", "園子"], [XU({ journey: null }), "#/cpu", "練功房"], [XU(), "#/adventure", "別頁"], [null, "#/journey/play", "沒有局面"]])
    assert.equal(X.bhxFullOn(st, h), false, why);
});

test("滿版：掛 body.bhx-full、左上「⋯」、下緣「輪到你」＋四邊微光；輪到星樞＝「星樞思考中…」；打完標籤收起；開局淡入「星樞・黑洞星盤」2 秒後淡出（一盤只一次）", () => {
  const K = kit(), { X, D } = K; X.bhxFullSync(XU());
  const b = D.body, g = id => K.D.doc.getElementById(id);
  assert.ok(b._c.has("bhx-full") && b._c.has("bhx-me")); assert.ok(g("bhxFullCss"), "CSS");
  const mo = g("bhxMo"); assert.equal(mo.textContent, "⋯"); assert.ok(/回開頭畫面/.test(mo.attrs["aria-label"]));
  assert.equal(g("bhxTurn").textContent, "輪到你"); assert.ok(g("bhxTurn")._c.has("me")); assert.equal(g("bhxTurn").attrs["aria-hidden"], "true", "讀螢幕照舊由棋盤播報，不重複念");
  const op = g("bhxOpp"); assert.equal(op.textContent, "星樞・黑洞星盤");
  const on = K.T.find(([, ms]) => ms === 30), off = K.T.find(([, ms]) => ms === 2530); assert.ok(on && off, "0.03 秒淡入、2.5 秒淡出"); on[0](); assert.ok(op._c.has("on")); off[0](); assert.ok(!op._c.has("on"));
  X.bhxFullSync(XU({ turn: "b" })); assert.equal(g("bhxTurn").textContent, "星樞思考中…"); assert.ok(!b._c.has("bhx-me"));
  const n = K.T.length; X.bhxFullSync(XU({ turn: "r" })); assert.ok(!K.T.slice(n).some(([, ms]) => ms === 2530), "同一盤不再淡入一次");
  X.bhxFullSync(XU({ result: "1-0" })); assert.equal(g("bhxTurn").hidden, true, "打完標籤收起"); assert.ok(b._c.has("bhx-full"), "結果卡、星盤暫合照舊在滿版上");
  const R = kit({ rm: true }); R.X.bhxFullSync(XU()); assert.ok(R.D.doc.getElementById("bhxOpp")._c.has("on"), "減少動態：直接出現"); assert.ok(R.T.some(([, ms]) => ms === 2000), "2 秒後直接消失");
});

test("離開就恢復：換成別的對局、換頁（hashchange）、回開頭畫面——拿掉 bhx-full、⋯、標籤；頂欄和底部列回來", () => {
  const K = kit(), { X, D } = K; X.bhxFullSync(XU());
  X.bhxFullSync(XU({ journey: "bh:qin", id: "g2" })); assert.ok(!D.body._c.has("bhx-full") && !D.body._c.has("bhx-me")); for (const id of ["bhxMo", "bhxTurn", "bhxOpp"]) assert.equal(K.D.doc.getElementById(id), null, id);
  X.bhxFullSync(XU()); K.ctx.location.hash = "#/"; X.bhxFullSync(XU()); assert.ok(!D.body._c.has("bhx-full"), "不在對局頁就收掉");
  assert.ok(BH.includes('addEventListener("hashchange",()=>{if(!/^#\\/journey\\/play/.test(location.hash||""))bhxFullOff()})'), "換頁就恢復");
  /* CSS 全部掛在 body.bhx-full 底下（拿掉 class 就恢復），沒有寫死在別的地方 */
  const css = between(BH, "s.textContent=`body.bhx-full{", "`;document.head.append(s)}");
  for (const line of css.split("\n")) assert.ok(/^(body\.bhx-full|#bhxMo|#bhxTurn|#bhxOpp|@media \(prefers-reduced-motion)/.test(line.replace(/^s\.textContent=`/, "")), "只影響序局：" + line.slice(0, 60));
});

test("「⋯」：序局還沒打完＝🚪 回開頭畫面（stqXuLeave，不算略過）、📜 本關棋規、🔊／🔇 聲音、🎒 寶物；沒有悔棋；打完換成 ↩ 返回", () => {
  const K = kit(); K.X.bhxFullSync(XU()); K.D.doc.getElementById("bhxMo").click();
  const [h, B] = K.modals[0], labels = B.map(x => x[0]);
  assert.deepEqual(Array.from(labels), ["🚪 回開頭畫面", "📜 本關棋規", "🔇 關掉聲音", "🎒 寶物", "關閉"]); assert.ok(!labels.some(l => /悔棋/.test(l)));
  B[0][1](); assert.deepEqual(K.toasts, ["LEAVE"], "叫 stqXuLeave");
  B[1][1](); assert.ok(/本關棋規/.test(K.modals[1][0]) && /不判長將長捉/.test(K.modals[1][0]), "棋規");
  B[3][1](); assert.equal(K.toasts[1], "這一戰用不到寶物", "找不到寶物鈕就說一句");
  assert.deepEqual(Array.from(K.X.bhxFullItems(false), x => x[1]), ["back", "rule", "snd", "bag"], "打完：返回");
});

test("接點：08b 每次畫好棋盤叫 bhxFullSync；序局不再掛橫向的 bh-full；park3d 滿版直式撐滿高度、多出來的上下平分", () => {
  assert.ok(rd("xiangqi-db/m/08b-cpugame.js").includes('try{if(typeof bhxFullSync==="function")bhxFullSync(st)}catch(e){}'));
  assert.ok(BH.includes("function bhParkEx(st){bhFull(bhIs(st)&&!(st&&st.journey===BHX_ID),st);"));
  const P = rd("xiangqi-lab/src/park3d.js");
  assert.ok(P.includes('const FULLV=pkFullV();if(FULLV&&rm>0&&rm<1e8)CAMV.hr=Math.max(.3,rm/W);') && P.includes("CAMV.dp=FULLV?0:") && P.includes("clamp(2*Math.atan(CAMV.ht*vr)*180/PI,38,FULLV?95:62)"));
  assert.ok(P.includes('document.body.classList.contains("bhx-full")&&getComputedStyle(b).position==="fixed"'), "只有序局滿版（body.bhx-full＋#bbox fixed）才這樣算");
});

/* 版面數字：照 CSS 的常數算（安全區：iPhone 13 mini／X 系列 375×812＝上 47／下 34；Pro Max 430×932＝上 59／下 34） */
test("版面數字（375×812、430×932，直式）：「⋯」、標籤、平面棋盤都在安全區裡、不互相蓋；3D 畫布滿版，左右視野跟原本一樣", () => {
  const css = between(BH, "s.textContent=`body.bhx-full{", "`;document.head.append(s)}");
  const num = re => +re.exec(css)[1];
  const moL = num(/#bhxMo\{[\s\S]*?left:calc\((\d+)px/), moT = num(/#bhxMo\{[\s\S]*?top:calc\((\d+)px/), moW = num(/#bhxMo\{[\s\S]*?width:(\d+)px/), moH = num(/#bhxMo\{[\s\S]*?height:(\d+)px/);
  const tnB = num(/#bhxTurn\{[\s\S]*?bottom:calc\((\d+)px/), svgV = num(/>svg\{[\s\S]*?padding:calc\(\$\{T\} \+ (\d+)px\)/), svgH = num(/>svg\{[\s\S]*?calc\(\$\{R\} \+ (\d+)px\)/);
  assert.ok(moW >= 44 && moH >= 44, "⋯ 至少 44×44");
  const out = {};
  for (const [W, H, T, B] of [[375, 812, 47, 34], [430, 932, 59, 34]]) {
    const mo = { x: moL, y: T + moT, w: moW, h: moH };
    const lab = { bottom: H - B - tnB, top: H - B - tnB - 24 };   /* 標籤一行 13px×1.5＋上下 4px ≈ 24px */
    const bx = { x: svgH, y: T + svgV, w: W - 2 * svgH, h: H - T - B - 2 * svgV }, s = Math.min(bx.w / 560, bx.h / 620), bw = 560 * s, bh = 620 * s, board = { x: bx.x + (bx.w - bw) / 2, y: bx.y + (bx.h - bh) / 2, w: bw, h: bh };
    assert.ok(mo.y >= T && mo.y + mo.h <= board.y, `${W}：⋯ 在瀏海下面、棋盤上面`); assert.ok(lab.top >= board.y + board.h && lab.bottom <= H - B, `${W}：標籤在棋盤下面、Home 條上面`);
    assert.ok(board.y >= T && board.y + board.h <= H - B && board.x >= 0 && board.x + board.w <= W, `${W}：平面棋盤整塊在安全區裡`);
    const hr = H / W, ht = .24, vr = Math.max(hr, 1.14), fov = Math.min(95, Math.max(38, 2 * Math.atan(ht * vr) * 180 / Math.PI)), hfov = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * W / H) * 180 / Math.PI;
    assert.ok(Math.abs(hfov - 2 * Math.atan(ht) * 180 / Math.PI) < 1e-9, "左右視野固定（棋盤不會被左右切掉）");
    out[W + "x" + H] = { more: mo, board: { x: +board.x.toFixed(1), y: +board.y.toFixed(1), w: +board.w.toFixed(1), h: +board.h.toFixed(1) }, label: lab, canvas: { w: W, h: H, fov: +fov.toFixed(1), hfov: +hfov.toFixed(1) } };
  }
  /* 報告用：node -e 印這份 */
  assert.deepEqual(out["375x812"].board, { x: 8, y: 213.8, w: 359, h: 397.5 }); assert.deepEqual(out["430x932"].board, { x: 8, y: 249.3, w: 414, h: 458.4 });
  assert.deepEqual(out["375x812"].more, { x: 8, y: 55, w: 44, h: 44 }); assert.deepEqual(out["430x932"].more, { x: 8, y: 67, w: 44, h: 44 });
  assert.deepEqual(out["375x812"].label, { bottom: 762, top: 738 }); assert.deepEqual(out["430x932"].label, { bottom: 882, top: 858 });
  assert.equal(out["375x812"].canvas.fov, 54.9); assert.equal(out["430x932"].canvas.fov, 55);
});
