/* 第 22 輪評比 P2（11/25）：地底迷宮的殘局，手滑點到不合棋規的位置（例：選紅車後點斜線空格）也被當成解題失敗，
   扣嘗試次數，陷阱題第 4 次還會被拖回入口。改法（m/07z9m-maze.js）：落子前 jhMzLegal 先用 XQCore 規則核對紅方這一步合不合法；
   不合法只提示、不算答錯，合法但不是正解才照原本算一次。
   jhMzLegal 抽出來配真正的規則核心（core.js）在 vm 跑（行為）；點擊流程有沒有先核對再算失敗用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const MAZE = fs.readFileSync(path.join(ROOT, "xiangqi-db/m/07z9m-maze.js"), "utf8").replace(/\r\n/g, "\n");
const CORE_F = [path.join(ROOT, "xiangqi-lab/site/core.js"), path.join(ROOT, "..", "core.js")].find(f => fs.existsSync(f));

function kit() {
  const a = MAZE.indexOf("function jhMzLegal("), b = MAZE.indexOf("\n", a);
  assert.ok(a > 0 && b > a, "抓得到 jhMzLegal");
  const c = { console };
  vm.createContext(c);
  if (CORE_F) { vm.runInContext(fs.readFileSync(CORE_F, "utf8") + ";this.XQCore=XQCore;", c) }
  vm.runInContext(MAZE.slice(a, b) + ";this.jhMzLegal=jhMzLegal;", c);
  const f = MAZE.indexOf("function jhMzFen("), g = MAZE.indexOf("\n", f);
  vm.runInContext(MAZE.slice(f, g) + ";this.jhMzFen=jhMzFen;", c);
  return c;
}

const START = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR";

test("不合棋規的落點判成不合法；合法的照常放行", { skip: !CORE_F && "沒有 core.js" }, () => {
  const K = kit(), pcs = K.jhMzFen(START);
  assert.equal(K.jhMzLegal(pcs, "a0b1"), false, "車走斜線");
  assert.equal(K.jhMzLegal(pcs, "a0a2"), true, "車直走兩格");
  assert.equal(K.jhMzLegal(pcs, "b0b3"), false, "傌不能直走");
  assert.equal(K.jhMzLegal(pcs, "b0c2"), true, "傌走日");
  assert.equal(K.jhMzLegal(pcs, "h2e2"), true, "炮二平五");
  assert.equal(K.jhMzLegal(pcs, "h2h9"), true, "炮隔著黑砲打馬");
  assert.equal(K.jhMzLegal(pcs, "h2h7"), false, "炮沒有隔一子不能吃");
});

test("走完自己被將軍的那一步也算不合法（照真正的規則核心）", { skip: !CORE_F && "沒有 core.js" }, () => {
  /* 紅帥 e0、紅仕 e1 擋在黑車 e9 前面，黑將在 d9：仕離開中路會讓帥被將；帥走 d0 會跟黑將照面；只剩帥走 f0 合法 */
  const K = kit(), pcs = K.jhMzFen("3kr4/9/9/9/9/9/9/9/4A4/4K4");
  assert.equal(K.jhMzLegal(pcs, "e1d2"), false, "仕走開會被將");
  assert.equal(K.jhMzLegal(pcs, "e0d0"), false, "帥將照面");
  assert.equal(K.jhMzLegal(pcs, "e0f0"), true, "帥橫走到 f0");
});

test("規則核心不在時照舊放行（不會擋住解題）", () => {
  const a = MAZE.indexOf("function jhMzLegal("), b = MAZE.indexOf("\n", a), c = {};
  vm.createContext(c); vm.runInContext(MAZE.slice(a, b) + ";this.jhMzLegal=jhMzLegal;", c);
  assert.equal(c.jhMzLegal([{ p: "R", r: 9, c: 0 }], "a0b1"), true);
});

test("〔原始碼〕點擊流程：先核對合不合法、不合法就提示並 return，之後才交給 jhMzTry 算對錯", () => {
  const i = MAZE.indexOf("const mv=jhMzMv(sel,{c,r});");
  assert.ok(i > 0, "找得到落子那一行");
  const seg = MAZE.slice(i, i + 600);
  const L = seg.indexOf("if(!jhMzLegal(pcs,mv)){"), R = seg.indexOf("return}"), T = seg.indexOf("jhMzTry(S,id,mv)");
  assert.ok(L >= 0 && R > L && T > R, "jhMzLegal 的檢查與 return 在 jhMzTry 之前");
  assert.match(seg.slice(L, R), /不算答錯/, "提示玩家這次不算答錯");
  assert.doesNotMatch(seg.slice(L, R), /fails/, "不合法時不碰失敗計數");
});
