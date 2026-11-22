// W68（11/22 iMac Claude 2 複審 iOS P0-3D 腳本時記下；開發者選「點重疊處跳選單」）：黑洞第一戰「翻到棋盤背面」時，
//   鏡頭幾乎貼著盤底，中路前排的炮會把正後方的 22 號俥整個擋住，看不到也點不到。
//   先試過「擋住的前排半透明」：偵測對了，但背面是鏡像畫面，半透明人偶畫出來是一團黑影，所以改成點到疊住的子就跳一排按鈕選。
// 不開瀏覽器：從 src/park3d.js 抽出 gntStack／showStack／tapPiece 那段，用假的畫面座標與假的 DOM 實際跑。
// 用法：node --test tools/test-park3d-stack-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "../src/park3d.js"), "utf8").replace(/\r\n/g, "\n");
const a = SRC.indexOf("    const gntStack=i=>"), b = SRC.indexOf("    /* 望遠鏡：站在預設視角的位置", a);
assert.ok(a > 0 && b > a, "park3d.js 找得到 W68 那段");
const CODE = SRC.slice(a, b);

/* 黑洞第一戰的局面（BHX_FEN）：中路由上到下 4 將、13 士、22 俥、31 炮；85 帥在最下面 */
const FEN = "4k4/4a4/2N1R1N2/4C4/8P/9/9/9/9/4KAB2";
function board() { const b = Array(90).fill(null); FEN.split("/").forEach((row, r) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) c += +ch; else { b[r * 9 + c] = ch; c++ } } }); return b }
/* 背面視角的畫面：同一路 x 一樣，每排往下 24px，人偶高 30px（11/22 預覽站 402×874 量到的數字） */
const scr = (i) => ({ x: 40 + (i % 9) * 40, y: 300 + Math.floor(i / 9) * 24 });
function load(o = {}) {
  const made = [], taps = [];
  const mk = (tag) => { const e = { tag, style: {}, attrs: {}, kids: [], textContent: "", setAttribute(k, v) { this.attrs[k] = v }, append(...x) { this.kids.push(...x) }, remove() { this.removed = true }, onclick: null, onpointerdown: null }; made.push(e); return e };
  const B = board(), pieces = {}; B.forEach((p, i) => { if (p) pieces[i] = { visible: true } });
  const c = {
    UNDER: o.under !== false, GIANT: true, selI: o.sel == null ? -1 : o.sel, SNAP: { b: B, me: "r" }, pieces,
    screenOf: (i) => scr(i), headOf: (i) => { const s = scr(i); return { x: s.x, y: s.y - 30 } },
    el: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 402, height: 874 }), append(x) { this.last = x } },
    opt: { onTap: (i) => taps.push(i) },
    NAMES: { r: { K: "帥", A: "仕", B: "相", N: "傌", R: "俥", C: "炮", P: "兵" }, b: { K: "將", A: "士", B: "象", N: "馬", R: "車", C: "砲", P: "卒" } },
    sideOf: (p) => (p === p.toUpperCase() ? "r" : "b"),
    document: { createElement: mk }, setTimeout: () => 0, clearTimeout() {},
  };
  vm.createContext(c);
  vm.runInContext(CODE + ";this.R={gntStack,showStack,tapPiece,stkClose}", c);
  return { R: c.R, c, made, taps };
}

test("背面：中路從炮往後找，一路接到俥、士、將（前排→後排）；帥後面隔太遠不算疊", () => {
  const { R } = load();
  assert.deepEqual([...R.gntStack(31)], [31, 22, 13, 4]);
  assert.deepEqual([...R.gntStack(22)], [22, 13, 4]);
  assert.deepEqual([...R.gntStack(85)], [85]);
  assert.deepEqual([...R.gntStack(20)], [20], "旁邊那一路的傌後面沒有子");
});

test("正面（不是背面）一律不找疊子", () => {
  const { R } = load({ under: false });
  assert.deepEqual([...R.gntStack(31)], [31]);
});

test("背面點炮（後面疊著俥）：不直接選，跳出只有自己的子的按鈕（炮、俥；黑士、黑將不列）；按「俥」＝點 22 號", () => {
  const { R, c, made, taps } = load();
  R.tapPiece(31, 200, 400);
  assert.deepEqual(taps, [], "先不選");
  const menu = c.el.last; assert.ok(menu && menu.attrs.role === "menu");
  const btns = menu.kids.filter((k) => k.tag === "button");
  assert.deepEqual(btns.map((b) => b.textContent), ["炮", "俥"]);
  btns[1].onclick({ stopPropagation() {} });
  assert.deepEqual(taps, [22]);
  assert.ok(menu.removed, "按了就收起來");
  assert.ok(made.length > 0);
});

test("背面點帥（後面沒疊子）、正面點炮、已經選了子再點：都照舊直接交給 onTap，不跳選單", () => {
  let L = load(); L.R.tapPiece(85, 200, 600); assert.deepEqual(L.taps, [85]); assert.equal(L.c.el.last, undefined);
  L = load({ under: false }); L.R.tapPiece(31, 200, 400); assert.deepEqual(L.taps, [31]); assert.equal(L.c.el.last, undefined);
  L = load({ sel: 22 }); L.R.tapPiece(31, 200, 400); assert.deepEqual(L.taps, [31], "選了子以後點的是落點或換子，照舊"); assert.equal(L.c.el.last, undefined);
});

test("〔原始碼〕兩處點棋子都走 tapPiece；離開背面就收選單；半透明的試作已經拿掉", () => {
  assert.equal((SRC.match(/tapPiece\(i,e\.clientX,e\.clientY\)/g) || []).length, 2, "點擊處理兩處都改走 tapPiece");
  assert.match(SRC, /UNDER=cam\.position\.y<MY;if\(!UNDER\)stkClose\(\);/);
  assert.doesNotMatch(SRC, /gntXray|GXR\b/, "半透明試作（背面變黑影）不能留");
  assert.ok(!/[;})]\s*\/\/(?!#)/.test(CODE.split("\n").filter((l) => !/^\s*\/\*/.test(l)).join("\n").replace(/\/\*[\s\S]*?\*\//g, "")), "W68 這段沒有一行程式後面接 // 註解");
});
