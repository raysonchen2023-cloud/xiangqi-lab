// W109（iMac Claude 2 審 #155 時發現，線上就有；開發者選「送審前修」）：首頁寬版圖（07z HMW：home_p34、home_l1610）同源 404 時，
// 00-util 在 window 的擷取監聽先把 src 改去 XQ_CDN、設 cdnTry=1，同一次事件接著 07z 的 onerror 馬上退回原圖，CDN 補抓被蓋掉。
// 修法：07z hmwFail——src 已經指向 XQ_CDN、cdnTry 剛設好時先等，CDN 那次也失敗才退回；hmwSet 換網址時清掉 cdnTry。
// 不開瀏覽器：把整個 07z 和 00-util 真正的那幾行（XQ_CDN、xqNat、xqCdnRel、error 擷取監聽）一起載進 vm，照瀏覽器順序觸發（擷取監聽先、元素 onerror 後）。
// 用法 node --test xiangqi-lab/tools/test-w109-home-cdn.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC_Z = M("m/07z-homemap.js"), U = M("m/00-util.js").split("\n");
const pick = re => { const l = U.find(x => re.test(x)); assert.ok(l, "00-util 找不到 " + re); return l };
const SRC_U = [pick(/^const XQ_CDN=/), pick(/^function xqNat\(\)/), pick(/^const xqCdnRel=/), pick(/^addEventListener\("error"/)].join("\n");

function env() {
  let H = null;
  const loc = { href: "https://x.test/m/x.html", origin: "https://x.test", pathname: "/m/x.html", hash: "#/" };
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, cancelAnimationFrame: () => { }, isFinite, Math, Object, String, JSON, URL,
    addEventListener: (t, f) => { if (t === "error") H = f }, location: loc, navigator: { userAgent: "" }, window: {} });
  vm.runInContext("const SHW_PG0={W:768,H:1376,el:38,home:'home',look0:[45,90],h:[.045,60,.0009]};", ctx);
  vm.runInContext(SRC_U, ctx); vm.runInContext(SRC_Z, ctx);
  const img = { tagName: "IMG", dataset: {}, _src: "", complete: false, naturalWidth: 0, onerror: null, L: [], getAttribute(n) { return n === "src" ? this._src : null },
    get src() { return this._src }, set src(v) { this._src = v; this.complete = false; this.naturalWidth = 0 }, get currentSrc() { return this._src }, addEventListener(t, f) { this.L.push([t, f]) } };
  const P = { dataset: {}, isConnected: true, style: { setProperty() { }, removeProperty() { } }, querySelector: q => q === ":scope>img" ? img : null, querySelectorAll: () => [] };
  const fire = () => { H({ target: img }); if (img.onerror) img.onerror() };   // 擷取監聽先跑，再輪到元素自己的 onerror
  return { ctx, P, img, fire, H: () => H, R: s => vm.runInContext(s, ctx) };
}
const ORIG = "data/homemap/home.webp?v=1";

test("原地換成寬版（hmwSet）：同源 404 先等 CDN 補抓，CDN 也失敗才退回原圖；退回後原圖同源再 404 照樣去 CDN 補抓", () => {
  const E = env(), { P, img, fire, R } = E, CDN = R("XQ_CDN");
  assert.equal(typeof E.H(), "function", "00-util 的擷取監聽掛上了");
  img._src = ORIG; P.dataset.hmw = ""; P._hmSrc0 = ORIG;
  R("hmwSet")(P, "l1610");
  assert.equal(P.dataset.hmw, "l1610"); assert.match(img._src, /home_l1610\.webp/);
  img.complete = true; fire();   // 同源 404
  assert.ok(img._src.startsWith(CDN) && /home_l1610\.webp/.test(img._src), "00-util 改去 CDN 補抓寬版：" + img._src);
  assert.equal(P.dataset.hmw, "l1610", "還在等 CDN，不能馬上退回（以前在這裡就退回，把補抓蓋掉）");
  assert.equal(R("HMW_BAD.l1610"), undefined);
  img.complete = true; fire();   // CDN 也 404
  assert.equal(P.dataset.hmw, "", "CDN 也失敗才退回原圖"); assert.equal(img._src, ORIG); assert.equal(R("HMW_BAD.l1610"), 1, "這次開 App 不再試");
  assert.equal(img.dataset.cdnTry, undefined, "換網址清掉 cdnTry");
  img.complete = true; E.H()({ target: img });   // 原圖同源也 404
  assert.ok(img._src.startsWith(CDN) && /home\.webp/.test(img._src), "原圖還能去 CDN 補抓，不會破圖：" + img._src);
});

test("CDN 補抓成功＝留在寬版；直版 p34 也一樣", () => {
  for (const k of ["l1610", "p34"]) {
    const { P, img, fire, R } = env(), CDN = R("XQ_CDN");
    img._src = ORIG; P.dataset.hmw = ""; P._hmSrc0 = ORIG; R("hmwSet")(P, k);
    img.complete = true; fire();
    assert.ok(img._src.startsWith(CDN), k); img.complete = true; img.naturalWidth = 2560;
    assert.equal(P.dataset.hmw, k, k + " 補抓成功，留在寬版"); assert.equal(R("HMW_BAD." + k), undefined);
  }
});

test("開頁就是寬版（07z 209 行那條路）：onerror 也走 hmwFail，一樣先等 CDN", () => {
  assert.match(SRC_Z, /if\(hk\)\{const im1=P\.querySelector\(":scope>img"\);im1\.onerror=\(\)=>hmwFail\(P\)\}/);
  const { P, img, fire, R } = env(), CDN = R("XQ_CDN");
  P.dataset.hmw = "l1610"; P._hmSrc0 = ORIG; img._src = R("hmwSrc")("l1610"); img.onerror = () => R("hmwFail")(P);   // 跟 209 行一樣
  img.complete = true; fire();
  assert.ok(img._src.startsWith(CDN)); assert.equal(P.dataset.hmw, "l1610", "開頁那條路也先等 CDN");
  img.complete = true; fire();
  assert.equal(P.dataset.hmw, ""); assert.equal(img._src, ORIG, "CDN 也失敗才退回原圖");
});

test("用原圖時（hmw 是空的）載不到：hmwFail 不做事，照舊交給 00-util 補抓；原始碼裡退回寬版只剩 hmwFail 一處", () => {
  const { P, img, fire, R } = env(), CDN = R("XQ_CDN");
  P.dataset.hmw = ""; img._src = ORIG; img.onerror = () => R("hmwFail")(P);
  img.complete = true; fire();
  assert.ok(img._src.startsWith(CDN) && /home\.webp/.test(img._src)); assert.equal(P.dataset.hmw, "");
  assert.equal((SRC_Z.match(/HMW_BAD\[kk\]=1;hmwSet\(P,""\)/g) || []).length, 1, "只有 hmwFail 裡退回");
  assert.match(SRC_Z, /im\.onerror=\(\)=>hmwFail\(P\);if\(im\.dataset\)delete im\.dataset\.cdnTry;im\._hmwCdn="";/, "原地換圖時掛 hmwFail、清 cdnTry");
});
