// 意見回饋 897（開發者 11/15，版本 1602，附截圖）：
//   1.「不應該出現這個紅圈入口」＝黑洞對局頁左上角的「‹ 回星槎」。原本只要是黑洞對局（bh:）就一律回星槎，還沒登船、開場序局、從觀星臺進來的人都會看到。
//      → 照實際從哪裡來：觀星臺開的回觀星臺；序局回首頁；星槎偏航（bhRet.cover）而且真的有航程才回星槎；其餘回首頁（m/07gxt-guanxing.js gxtBhBack、m/07-legend.js jBack）。
//   2.「黑洞大棋盤鏡像的楚河漢界沒有明顯的字跡，上下兩邊都是完美鏡像對稱」
//      → 河界字改成深色粗邊＋亮字（src/park3d.js drawRiver，正面與鏡像面同一支）；鑽到盤底看到的那一面補一層不受光的河界、盤底自己加自發光。
// 用法：node --test xiangqi-lab/tools/test-fb897-1115.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const rd = (...p) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8");
const GXT = rd("xiangqi-db", "m", "07gxt-guanxing.js"), LEG = rd("xiangqi-db", "m", "07-legend.js"), P3 = rd("xiangqi-lab", "src", "park3d.js");
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, "找不到 " + a); return s.slice(i, j) };

/* ---------- 1. 返回鈕 ---------- */
const BACK = GXT.match(/function gxtBhBack\(j\)\{[^\n]*?return"#\/"\}/);
const mkBack = o => { const ss = { getItem: k => (o.throwSS ? (() => { throw new Error("x") })() : k === "gxtFrom" && o.from ? "1" : null) };
  const store = { get: (k, d) => (o.throwStore ? (() => { throw new Error("x") })() : k === "bhRet" && o.ret !== undefined ? o.ret : d) };
  const gxtFromTd = () => { try { return ss.getItem("gxtFrom") === "1" } catch (e) { return false } };
  const args = ["store", "gxtFromTd"], vals = [store, gxtFromTd]; if (o.dock !== undefined) { args.push("shipDockList"); vals.push(() => o.dock) }
  return new Function(...args, BACK[0] + "return gxtBhBack")(...vals) };

test("〔原始碼〕找得到 gxtBhBack；黑洞對局的返回鈕交給它決定，別的對局照舊", () => {
  assert.ok(BACK, "gxtBhBack 是一行");
  assert.ok(LEG.includes('String(j||"").startsWith("bh:")?(typeof gxtBhBack==="function"?gxtBhBack(j):"#/adventure"):String(j||"").startsWith("bt:")?"#/battle":'), "jBack 的 bh: 分支");
  assert.ok(LEG.includes('const jBack=j=>String(j||"").startsWith("gx:")?"#/adventure":'), "星槎航程（gx:）照舊回星槎");
});

test("〔行為〕從首頁或選關進黑洞對局（不是偏航）＝回首頁，不出現星槎入口", () => {
  assert.equal(mkBack({ ret: { k: "han", cover: false }, dock: true })("bh:1"), "#/");
  assert.equal(mkBack({ ret: null, dock: true })("bh:1"), "#/");
  assert.equal(mkBack({ dock: true })("bh:rd"), "#/", "沒有 bhRet 紀錄");
});

test("〔行為〕還沒登船（沒有航程）就算紀錄寫偏航也回首頁", () => {
  assert.equal(mkBack({ ret: { k: "han", cover: true }, dock: null })("bh:1"), "#/");
  assert.equal(mkBack({ ret: { k: "han", cover: true } })("bh:1"), "#/", "連 shipDockList 都沒有");
});

test("〔行為〕星槎偏航進來而且有航程＝照舊回星槎", () => {
  assert.equal(mkBack({ ret: { k: "han", cover: true }, dock: [1] })("bh:1"), "#/adventure");
  assert.equal(mkBack({ ret: { k: "han", cover: true }, dock: [1] })("bh:rd"), "#/adventure");
});

test("〔行為〕開場序局（bh:xu）一律回首頁；從觀星臺開的一律回觀星臺", () => {
  assert.equal(mkBack({ ret: { k: "han", cover: true }, dock: [1] })("bh:xu"), "#/");
  assert.equal(mkBack({ from: 1, ret: { k: "han", cover: true }, dock: [1] })("bh:1"), "#/guanxing");
  assert.equal(mkBack({ from: 1 })("bh:xu"), "#/guanxing");
});

test("〔行為〕存檔讀不到（丟例外）＝回首頁，不會讓對局頁壞掉", () => {
  assert.equal(mkBack({ throwStore: 1, dock: [1] })("bh:1"), "#/");
  assert.equal(mkBack({ throwSS: 1, ret: { cover: true }, dock: [1] })("bh:1"), "#/adventure", "sessionStorage 壞掉＝當成不是觀星臺來的");
});

/* ---------- 2. 楚河漢界 ---------- */
const RIV = cut(P3, "function drawRiver(", "/* 開發者 11/12「黑洞的大棋盤不夠大");
const runRiver = (w, h) => { const log = []; const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : typeof k === "string" && /^(save|restore|drawImage|strokeText|fillText)$/.test(k) ? (...a) => log.push([k, a, { fs: t.fillStyle, ss: t.strokeStyle, lw: t.lineWidth, sb: t.shadowBlur, font: t.font }]) : undefined), set: (t, k, v) => { t[k] = v; return true } });
  new Function("loadImg", "BW", "SERIF", "BRIVER", RIV + ";return drawRiver")(() => ({}), 10.4, "serif", "data/park/bh_river.webp")(g, w, h, null); return log };
const rgba = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(",").map(Number); const x = String(s).replace("#", ""); return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)).concat(1) };
const lum = s => { const [r, g, b] = rgba(s); return (.2126 * r + .7152 * g + .0722 * b) / 255 };

test("〔行為〕河界字：先描深色粗邊、再填亮字，四個字都有、從左到右是楚河漢界", () => {
  const L = runRiver(1040, 1140), st = L.filter(x => x[0] === "strokeText"), fl = L.filter(x => x[0] === "fillText");
  assert.equal(st.map(x => x[1][0]).join(""), "楚河漢界"); assert.equal(fl.map(x => x[1][0]).join(""), "楚河漢界");
  assert.ok(L.indexOf(st[3]) < L.indexOf(fl[0]), "四個字的邊都描完才填字，邊不會蓋到旁邊的字");
  for (let i = 0; i < 4; i++) { assert.equal(st[i][1][1], fl[i][1][1], "邊和字同一個位置（橫）"); assert.equal(st[i][1][2], fl[i][1][2], "邊和字同一個位置（直）") }
  assert.ok(st[0][1][1] < st[1][1][1] && st[1][1][1] < st[2][1][1] && st[2][1][1] < st[3][1][1]);
});

test("〔行為〕邊夠深、字夠亮、邊夠粗（對比至少 0.6；邊寬不小於字高的 15%）", () => {
  const L = runRiver(1040, 1140), s = L.find(x => x[0] === "strokeText")[2], f = L.find(x => x[0] === "fillText")[2], u = 1040 / 10.4;
  assert.ok(lum(s.ss) < .15, "邊是深色：" + s.ss); assert.ok(rgba(s.ss)[3] >= .9, "邊幾乎不透明");
  assert.ok(lum(f.fs) > .8, "字是亮色：" + f.fs); assert.ok(lum(f.fs) - lum(s.ss) >= .6);
  const px = parseFloat(String(s.font).match(/([\d.]+)px/)[1]); assert.ok(px >= .6 * u, "字不小於 0.6 格"); assert.ok(s.lw >= .15 * px, "邊寬");
  assert.equal(f.sb, 0, "填字時不帶光暈，筆畫才不會糊");
});

test("〔行為〕兩種貼圖大小（手機、電腦）字的相對位置一樣＝正面與鏡像面對得起來", () => {
  const a = runRiver(1040, 1140).filter(x => x[0] === "fillText"), b = runRiver(1560, 1710).filter(x => x[0] === "fillText");
  for (let i = 0; i < 4; i++) { assert.ok(Math.abs(a[i][1][1] / 1040 - b[i][1][1] / 1560) < 1e-9); assert.ok(Math.abs(a[i][1][2] / 1140 - b[i][1][2] / 1710) < 1e-9) }
});

test("〔原始碼〕正面、鏡像面（朝上）、盤底（朝下）三處的河界都用同一支 drawRiver、同一張貼圖", () => {
  assert.ok(P3.includes("function drawBoard(g,w,h,onReady){try{if(BBOARD)drawBhBoard(g,w,h,onReady);else drawBoard0(g,w,h,onReady)}finally{if(BRIVER)try{drawRiver(g,w,h,onReady)}catch(e){}}}"), "正面貼圖");
  assert.ok(P3.includes("BRV=new T.Mesh(new T.PlaneGeometry(BW,BH),new T.MeshBasicMaterial({map:rtex,transparent:true,opacity:.95,"), "鏡像面（朝上）");
  assert.ok(P3.includes("const BRD=new T.Mesh(ug,new T.MeshBasicMaterial({map:rtex,transparent:true,opacity:.8,depthWrite:false,toneMapped:false,side:T.FrontSide}));BRD.position.z=.006;BRD.renderOrder=1;BU.add(BRD);"), "盤底（朝下）：用 BU 那份左右反過來的 UV、掛在 BU 底下、畫在 BU 之後");
});

test("〔原始碼〕盤底那面有自己的材質：照正面複製再加自發光，正面的材質不動", () => {
  assert.ok(P3.includes("const um=bm.clone();um.emissive=new T.Color(0xffffff);um.emissiveMap=btex;um.emissiveIntensity=.85;BU.material=um}"));
  assert.ok(P3.includes("const bm=bplane.material;bm.transparent=true;bm.opacity=.55;bm.depthWrite=false;bm.side=T.FrontSide;bm.needsUpdate=true;"), "正面照舊 55% 半透明");
  assert.ok(P3.indexOf("const bm=bplane.material;") < P3.indexOf("const um=bm.clone();"), "複製要在正面材質設好半透明之後");
});
