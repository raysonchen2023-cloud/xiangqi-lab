/* W106（11/24）迷宮像素材質載不到時改向 CDN 要一次（m/07z9m-maze.js jhMzTexLoad）。
   iMac Claude 2 預驗 #139 發現：TextureLoader 用不掛在頁面上的 img 載圖，沒有 service worker 的網頁版走不到 00-util 的 CDN 補抓，
   材質還沒進網站時一律退回程式畫的磚紋。比照 #129 掉入迷宮轉場的做法。
   jhMzTexLoad 抽出來在 vm 配假的 TextureLoader 跑（行為） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-maze.js"), "utf8");
function load(okSet) {
  const a = SRC.indexOf("function jhMzTexLoad("), b = SRC.indexOf("\nasync function jhMzWorld3(", a);
  assert.ok(a > 0 && b > a, "抓得到 jhMzTexLoad");
  const calls = [];
  const c = {
    calls, XQ_CDN: "https://cdn.example/",
    xqCdnRel: (u) => (/^data\//.test(u) ? u : ""),
    T3: { NearestFilter: 1, ClampToEdgeWrapping: 2, sRGBEncoding: 3, TextureLoader: function () { this.load = (url, ok, _p, err) => { calls.push(url); okSet.has(url) ? ok({ repeat: { set() {} }, wrapS: 0 }) : err(new Error("404")) } } },
  };
  vm.createContext(c); vm.runInContext(SRC.slice(a, b) + ";this.f=jhMzTexLoad;", c);
  return c;
}

test("同源載得到：只要一次，不碰 CDN", () => {
  const c = load(new Set(["data/maze/tex/central_wall.webp"])), mat = {};
  assert.equal(c.f(c.T3, "data/maze/tex/central_wall.webp", mat, []), true);
  assert.deepEqual([...c.calls], ["data/maze/tex/central_wall.webp"]); assert.ok(mat.map, "材質換上");
});
test("同源載不到：改向 XQ_CDN＋相對路徑要一次，載到就換上", () => {
  const c = load(new Set(["https://cdn.example/data/maze/tex/central_wall.webp"])), mat = {};
  c.f(c.T3, "data/maze/tex/central_wall.webp", mat, []);
  assert.deepEqual([...c.calls], ["data/maze/tex/central_wall.webp", "https://cdn.example/data/maze/tex/central_wall.webp"]); assert.ok(mat.map, "CDN 的材質換上");
});
test("CDN 也載不到：只重試一次，不會一直重試（照舊用程式畫的磚紋）", () => {
  const c = load(new Set()), mat = {};
  c.f(c.T3, "data/maze/tex/central_wall.webp", mat, []);
  assert.equal(c.calls.length, 2, "原本一次＋CDN 一次：" + c.calls.join("、")); assert.equal(mat.map, undefined);
});
test("不是 data/ 底下的網址（xqCdnRel 回空字串）：不往 CDN 要", () => {
  const c = load(new Set()), mat = {};
  c.f(c.T3, "https://elsewhere.example/x.webp", mat, []);
  assert.equal(c.calls.length, 1);
});
