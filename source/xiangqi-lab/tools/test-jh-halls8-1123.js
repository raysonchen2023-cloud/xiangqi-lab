// W48 其餘八派門內頁（開發者 11/23：「剩下 8 個門派的門內圖請開始繪製」「請盡快完成這項門派任務的工作」）：m/07z9l-halls.js
//   vm 跑真的 07z9l：每派 JH_HALL（版本、座位、裁切、四個地點、玩法入口）都在、座標在圖內；門內頁畫完後補上玩法入口、出口改「出山門」；
//   點玩法入口會呼叫那一派玩法模組開出來的函式（函式名稱也核對各派模組真的有定義）。
// 用法：node --test xiangqi-lab/tools/test-jh-halls8-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SRC = rd("xiangqi-db/m/07z9l-halls.js");
const SIDS = ["cross_palace", "horse", "advisor_corner", "palace_horse", "opposite_cannon", "same_cannon", "elephant", "pawn"];
const MOD = { jhGongOpen: "07z9d-gongpao", jhQimaOpen: "07z9f-qima", jhShijiaoOpen: "07z9e-shijiao", jhFanggongOpen: "07z9g-fanggong",
  jhLiepaoOpen: "07z9h-liepao", jhShunpaoOpen: "07z9i-shunpao", jhFeixiangOpen: "07z9j-feixiang", jhXianrenOpen: "07z9k-xianren" };

/* 最小的假 DOM：門內頁 P 底下有圖、四個地點標籤 */
function el(tag) { return { tag, dataset: {}, style: {}, children: [], className: "", innerHTML: "", alt: "" } }
function page(sid) {
  const P = el("div"), img = el("img");
  P.children.push(img);
  for (const k of ["hall", "study", "yard", "gate"]) { const b = el("button"); b.className = "shp-spot jh-hall-spot"; b.dataset.k = k; P.children.push(b) }
  const note = el("p"); note.className = "jh-windnote jh-hall-note"; P.children.push(note);
  P.querySelector = (q) => {
    if (q === "img") return img;
    if (q === ".jh-hall-note") return note;
    let m = q.match(/^\.jh-hall-spot\[data-k="([^"]+)"\]$/); if (m) return P.children.find((c) => c.className.includes("jh-hall-spot") && c.dataset.k === m[1]) || null;
    if (q === ".jh-hall-spot") return P.children.find((c) => c.className.includes("jh-hall-spot")) || null;
    return null;
  };
  P.insertBefore = (n, ref) => { const i = P.children.indexOf(ref); P.children.splice(i < 0 ? P.children.length : i, 0, n) };
  const v = { querySelector: (q) => (q === ".jh-hall" ? P : null) };
  return { v, P, img };
}
function load(o = {}) {
  const called = [], toasts = [], wrapped = [];
  const c = {
    window: {}, document: { createElement: el },
    jhL: (zh, en) => (o.en ? en : zh), esc: (s) => String(s), vibrate() {}, toast: (s) => toasts.push(s),
    jhHallPc: ([x, y]) => `left:${x};top:${y}`,
    JH_HALL: { central: { v: "1122" }, screen: { v: "1123" } },
    JhHall: function (v, sid) { wrapped.push(sid); return {} },
  };
  if (o.flags) {   /* W72 遠端開關：假的 xqFlag、JH_HALL_BAD、location、xqflags 事件 */
    c.xqFlag = (k) => !o.flags.off.includes(k); c.JH_HALL_BAD = new Set(); c.location = { hash: "#/jianghu/hall/x" };
    c.window.addEventListener = (t, f) => { if (t === "xqflags") o.flags.listen = f };
  }
  for (const fn of Object.keys(MOD)) if (!(o.missing || []).includes(fn)) c.window[fn] = (lv) => called.push([fn, lv]);
  vm.createContext(c); vm.runInContext(SRC + "\n;this.JH_HALLS8=JH_HALLS8;", c);
  return { c, called, toasts, wrapped };
}

test("W72 遠端開關：halls8 關掉＝八派都進不了門內（小卡不顯示走進山門、直接打網址退回長卷）；中炮、屏風馬不受影響", () => {
  const F = { off: ["halls8"] }, { c, wrapped } = load({ flags: F });
  for (const sid of SIDS) assert.ok(c.JH_HALL_BAD.has(sid), sid + " 放進 JH_HALL_BAD");
  assert.ok(!c.JH_HALL_BAD.has("central") && !c.JH_HALL_BAD.has("screen"));
  const { v } = page("horse"); c.location.hash = "#/jianghu/hall/horse"; c.JhHall(v, "horse");
  assert.equal(c.location.hash, "#/jianghu"); assert.ok(!wrapped.includes("horse"), "沒畫門內頁");
  const s = page("central"); c.JhHall(s.v, "central"); assert.ok(wrapped.includes("central"), "中炮門照常");
});

test("W72 遠端開關：play_<派> 只關那一派的玩法入口，門內頁照常；其他派入口照放", () => {
  const { c } = load({ flags: { off: ["play_same_cannon"] } });
  const a = page("same_cannon"); c.JhHall(a.v, "same_cannon");
  assert.equal(a.P.querySelector('.jh-hall-spot[data-k="posts"]'), null, "順炮門沒有玩法入口");
  assert.match(a.P.querySelector('.jh-hall-spot[data-k="gate"]').innerHTML, /出山門/, "門內頁其他部分照常");
  const b = page("pawn"); c.JhHall(b.v, "pawn"); assert.ok(b.P.querySelector('.jh-hall-spot[data-k="rock"]'), "仙人指路門入口照放");
});

test("W72 遠端開關：設定檔晚到（xqflags 事件）才說關 halls8，也會補進 JH_HALL_BAD；沒有 00f 模組（沒有 xqFlag）時全部開著", () => {
  const F = { off: [] }, { c } = load({ flags: F });
  assert.equal(c.JH_HALL_BAD.size, 0);
  F.off.push("halls8"); F.listen(); assert.equal(c.JH_HALL_BAD.size, 8);
  const N = load(); const q = page("elephant"); N.c.JhHall(q.v, "elephant"); assert.ok(q.P.querySelector('.jh-hall-spot[data-k="pavilion"]'));
});

test("八派都有 JH_HALL：版本、座位、裁切（藏住棋子字）、四個地點、玩法入口；座標都在 768×1376 圖內；不動中炮、屏風馬", () => {
  const { c } = load();
  for (const sid of SIDS) {
    const H = c.JH_HALL[sid]; assert.ok(H, sid);
    assert.match(H.v, /^\d{4}$/); assert.equal(H.w, 60, sid + " 立繪寬 60（史學顧問 192：略大）"); assert.ok(H.cut >= 0.42 && H.cut < 0.45, sid + " 裁切要藏住棋子字");
    for (const k of ["hall", "study", "gate"]) assert.ok(H.spots[k], sid + " 少 " + k);
    assert.equal(Object.keys(H.extra).length, 1, sid + " 一個玩法入口");
    for (const p of [H.seat, ...Object.values(H.spots), ...Object.values(H.extra)]) assert.ok(p[0] > 0 && p[0] < 768 && p[1] > 0 && p[1] < 1376, sid + " 座標在圖內：" + p);
  }
  assert.deepEqual(Object.keys(c.JH_HALL.central), ["v"], "中炮門不動"); assert.deepEqual(Object.keys(c.JH_HALL.screen), ["v"], "屏風馬門不動");
});

test("門內頁畫完：補上玩法入口（插在地點標籤前面）、出口改「出山門」、換圖說；點入口呼叫那一派的玩法函式", () => {
  const { c, called } = load();
  for (const sid of SIDS) {
    const { v, P, img } = page(sid);
    c.JhHall(v, sid);
    const H = c.JH_HALLS8[sid], k = H.play.k, b = P.querySelector(`.jh-hall-spot[data-k="${k}"]`);
    assert.ok(b, sid + " 玩法入口"); assert.equal(P.children.indexOf(b), 1, sid + " 插在第一個地點標籤前面（圖後面）");
    assert.match(b.innerHTML, new RegExp(H.play.zh.slice(0, 4)));
    assert.match(P.querySelector('.jh-hall-spot[data-k="gate"]').innerHTML, /出山門回十州棋館/, sid + " 出口不是搭船");
    assert.equal(img.alt, H.alt[0]);
    const n = P.querySelector(".jh-hall-note"), hs = H.spots.hall;
    assert.equal(n.style.left, (hs[0] / 768 * 100).toFixed(2) + "%", sid + " 順風小字跟著大廳標籤（不是中炮門寫死的位置）");
    assert.equal(n.style.top, ((hs[1] + 46) / 1376 * 100).toFixed(2) + "%");
    b.onclick({ stopPropagation() {} });
    assert.deepEqual(called.at(-1)[0], H.play.fn, sid);
    c.JhHall(v, sid); assert.equal(P.children.filter((x) => x.dataset.k === k).length, 1, sid + " 重畫不會多一顆");
  }
  assert.equal(called.length, 8);
});

test("中炮、屏風馬不受影響；玩法函式沒載到時只跳提示、不當掉；英文標籤", () => {
  const { c, called, toasts } = load({ missing: ["jhXianrenOpen"] });
  for (const sid of ["central", "screen"]) { const { v, P } = page(sid); c.JhHall(v, sid); assert.equal(P.children.length, 6, sid + " 沒多東西（圖、四個地點、順風小字）"); assert.equal(P.querySelector(".jh-hall-note").style.top, undefined, sid + " 順風小字照 07z9b 原位"); assert.equal(P.querySelector('.jh-hall-spot[data-k="gate"]').innerHTML, "", sid + " 出口不改") }
  const { v, P } = page("pawn"); c.JhHall(v, "pawn"); P.querySelector('.jh-hall-spot[data-k="rock"]').onclick({ stopPropagation() {} });
  assert.equal(called.length, 0); assert.equal(toasts.length, 1);
  const E = load({ en: true }), q = page("horse"); E.c.JhHall(q.v, "horse");
  assert.match(q.P.querySelector('.jh-hall-spot[data-k="post"]').innerHTML, /Hitching post/); assert.match(q.img.alt, /^Inside the Horse Opening/);
});

test("〔原始碼〕玩法函式名稱都真的在各派模組裡定義；m.html 在八派模組之後載入 07z9l；過宮炮改叫焙紙牆（史學顧問 192）", () => {
  for (const [fn, f] of Object.entries(MOD)) assert.match(rd(`xiangqi-db/m/${f}.js`), new RegExp(`^(async )?function ${fn}\\(`, "m"), fn + " 在 " + f);
  const mh = rd("xiangqi-db/m.html"), at = (f) => mh.indexOf(`//#include m/${f}.js`);
  assert.ok(at("07z9l-halls") > 0);
  for (const f of Object.values(MOD).concat(["07z9b-jianghu", "07z9c-screen"])) assert.ok(at(f) > 0 && at(f) < at("07z9l-halls"), f + " 要在 07z9l 前面");
  const gp = rd("xiangqi-db/m/07z9d-gongpao.js"); assert.match(gp, /📜 焙紙牆・宣紙蓋子位/); assert.ok(!/晾紙架/.test(gp));
  assert.ok(!SRC.includes("\r") && !/[^:]\/\/ /.test(SRC.replace(/https?:\/\//g, "")), "LF、沒有行內 // 註解");
});
