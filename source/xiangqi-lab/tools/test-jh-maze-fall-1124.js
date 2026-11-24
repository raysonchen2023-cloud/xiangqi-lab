"use strict";
/* 掉入地底迷宮的轉場（m/07z9m-fall.js，開發者 11/24「做一個掉入迷宮的轉場」）：用 vm 跑真的程式，配假的 DOM／計時器。
   動畫本身（豎井往上捲、落地震動、標題淡入）要在瀏覽器看；這裡守住：什麼時候播、播什麼、怎麼收掉、材質怎麼載。 */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07z9m-fall.js"), "utf8");

function mk(o = {}) {
  const timers = [], listeners = {}, appended = [], imgs = [];
  const el = (tag) => {
    const e = { tagName: tag, className: "", style: { props: {}, setProperty(k, v) { this.props[k] = v } }, attrs: {}, children: [], isConnected: false, listeners: {}, dataset: {},
      classList: { add: (...c) => { e.className = (e.className + " " + c.join(" ")).trim() }, contains: (c) => e.className.split(" ").includes(c) },
      setAttribute(k, v) { this.attrs[k] = v }, addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f) },
      remove() { this.isConnected = false }, querySelector() { return null } };
    Object.defineProperty(e, "innerHTML", { set(v) { e._html = v }, get() { return e._html } });
    return e;
  };
  const c = {
    document: { getElementById: () => null, createElement: el, head: { append() {} }, body: { append: (e) => { e.isConnected = true; appended.push(e) } } },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length }, clearTimeout: (i) => { if (timers[i - 1]) timers[i - 1].f = null },
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f) }, removeEventListener: (t, f) => { listeners[t] = (listeners[t] || []).filter((g) => g !== f) },
    Image: function () { const im = { dataset: {}, set src(v) { im._src = v; imgs.push(im) }, get src() { return im._src } }; return im },
    location: { href: "http://x/index.html" + (o.start || "#/"), get hash() { const i = this.href.indexOf("#"); return i < 0 ? "" : this.href.slice(i) } }, window: {}, jhL: (zh, en) => (o.en ? en : zh), esc: (s) => String(s), vibrate: () => {}, XQ_CDN: "https://cdn.example/",
    xqCdnRel: (u) => (/^data\//.test(u) ? u : ""), jhMzOn: () => true, jhMzLv: (sid) => ({ sid, title: ["🕳 地底漕倉", "🕳 Underground granary"], tex: { side: "data/maze/tex/" + sid + "_wall.webp" } }),
    JhMaze: function (v, sid) { return { sid } }, Math, String, Object, Array, Number, JSON,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: !!o.rm });
  vm.createContext(c); vm.runInContext(SRC, c);
  const fire = (t, e) => (listeners[t] || []).slice().forEach((f) => f(e || {}));
  const run = (upto) => { for (const t of timers.slice().sort((a, b) => a.ms - b.ms)) if (t.f && t.ms <= upto) { const f = t.f; t.f = null; f() } };
  /* 換頁：真的順序是路由的 hashchange 先跑（裡面叫 JhMaze），這支的後跑；也測反過來 */
  const nav = (h, order = "router-first") => { const old = c.location.href; c.location.href = "http://x/index.html" + h; const e = { oldURL: old, newURL: c.location.href };
    if (order === "router-first") { if (/^#\/jianghu\/maze/.test(h)) c.JhMaze({}, "central"); fire("hashchange", e) } else { fire("hashchange", e); if (/^#\/jianghu\/maze/.test(h)) c.JhMaze({}, "central") } };
  return { c, appended, timers, fire, run, imgs, listeners, nav };
}

test("從門派大廳進迷宮才播（路由先跑、這支先跑兩種順序都對）；重新整理、從別處進來不播；同一次只播一次", () => {
  for (const order of ["router-first", "fall-first"]) {
    let T = mk({ start: "#/jianghu/maze" }); T.c.JhMaze({}, "central"); assert.equal(T.appended.length, 0, order + "：直接開在迷宮（重新整理）不播");
    T = mk(); T.nav("#/jianghu/map", order); T.nav("#/jianghu/maze", order); assert.equal(T.appended.length, 0, order + "：從江湖地圖進來不播");
    T = mk(); T.nav("#/jianghu/hall/central", order); T.nav("#/jianghu/maze", order);
    assert.equal(T.appended.length, 1, order + "：從大廳進來播（#129 iMac Claude 2 預驗：路由先跑時原本不播）");
    T.c.JhMaze({}, "central"); assert.equal(T.appended.length, 1, order + "：同一頁重畫不重播");
    T.nav("#/jianghu/hall/central", order); T.nav("#/jianghu/maze", order); assert.equal(T.appended.length, 2, order + "：回大廳再進來，再播一次");
    T = mk(); T.c.jhMzOn = () => false; T.nav("#/jianghu/hall/central", order); T.nav("#/jianghu/maze", order); assert.equal(T.appended.length, 0, order + "：迷宮關著不播");
  }
});

test("播的內容：該派的牆面材質、標題卡（拿掉開頭圖示、中英文）、跳過提示；不讓讀螢幕軟體念", () => {
  const T = mk(); const o = T.c.jhFallPlay(T.c.jhMzLv("pawn"));
  assert.match(o._html, /地底・第一層/); assert.match(o._html, /<b>地底漕倉<\/b>/, "標題拿掉「🕳 」"); assert.match(o._html, /點一下跳過/);
  assert.equal(o.attrs["aria-hidden"], "true");
  assert.equal(T.imgs[0].src, "data/maze/tex/pawn_wall.webp", "先載該派自己的牆面材質");
  T.imgs[0].onload(); assert.match(o.style.props["--jhfall-tex"], /pawn_wall\.webp/, "載好才換上");
  const E = mk({ en: true }); const oe = E.c.jhFallPlay(E.c.jhMzLv("central")); assert.match(oe._html, /Underground · Level 1/); assert.match(oe._html, /<b>Underground granary<\/b>/);
});

test("材質同源載不到，改向 CDN 要一次；CDN 也失敗就留程式畫的磚紋（不無限重試）", () => {
  const T = mk(); const o = T.c.jhFallPlay(T.c.jhMzLv("central")); const im = T.imgs[0];
  im.onerror(); assert.equal(im.src, "https://cdn.example/data/maze/tex/central_wall.webp");
  im.onerror(); assert.equal(T.imgs.length, 2, "第二次失敗不再重試"); assert.equal(o.style.props["--jhfall-tex"], undefined, "沒載到不設材質");
});

test("時間軸：1.2 秒落地（震、塵土）、1.3 秒標題、2.4 秒收掉；點一下或換頁馬上收", () => {
  let T = mk(); let o = T.c.jhFallPlay(T.c.jhMzLv("central"));
  T.run(1199); assert.ok(!o.classList.contains("land")); T.run(1200); assert.ok(o.classList.contains("land"));
  T.run(1300); assert.ok(o.classList.contains("card")); assert.ok(!o.classList.contains("out")); T.run(2400); assert.ok(o.classList.contains("out"), "2.4 秒淡出");
  T.run(9999); assert.equal(o.isConnected, false, "淡出後移除");
  T = mk(); o = T.c.jhFallPlay(T.c.jhMzLv("central")); o.listeners.click[0](); assert.ok(o.classList.contains("out"), "點一下跳過");
  T.run(9999); assert.ok(!o.classList.contains("land"), "跳過後計時器都清掉，不會再落地");
  T = mk(); o = T.c.jhFallPlay(T.c.jhMzLv("central")); T.fire("hashchange", {}); assert.ok(o.classList.contains("out"), "換頁就收");
});

test("減少動態：不捲、不震，只淡入淡出標題，0.9 秒收掉", () => {
  const T = mk({ rm: true }); const o = T.c.jhFallPlay(T.c.jhMzLv("central"));
  assert.ok(o.classList.contains("rm")); T.run(899); assert.ok(o.classList.contains("card")); assert.ok(!o.classList.contains("land"), "不震");
  T.run(900); assert.ok(o.classList.contains("out"));
});
