/* W104（11/24）十州棋館的晚明轉場（m/07z9n-jhgate.js）。
   開發者：ChatGPT 場景盤點 K「星槎停在秦朝，進十州棋館卻是明朝風格」→ 選「十州棋館晚明轉場」，要 Gemini 做轉場、有「搭著星槎跑到了晚明」的歷史感；
   補充「如果去在明朝就不需要，只要簡單轉場即可」。
   播不播、文字、星線棋盤的格數抽出來在 vm 跑（行為）；包裝 Jianghu、m.html 載入順序、存檔鍵用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9n-jhgate.js"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8");
const SAVE = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "05b-save.js"), "utf8");
function load(en) {
  const a = SRC.indexOf("const jhgH="), b = SRC.indexOf("function jhgCss(", a);
  assert.ok(a > 0 && b > a, "抓得到判斷那一段");
  const c = { EN: !!en, location: { href: "https://x/#/home" } }; vm.createContext(c);
  vm.runInContext("const jhL=(zh,en)=>EN?en:zh;const JH_GATE_IMG='',JH_GATE_MS=0,JH_GATE_RM_MS=0,JH_GATE_LOAD_MS=0;" + SRC.slice(a, b) +
    ";this.want=jhgWant;this.text=jhgText;this.lines=jhgBoardLines;this.svg=jhgBoardSvg;this.done=n=>{JHG_DONE=n};", c);
  return c;
}

test("播不播：從別的朝代（含經典世界）走進十州棋館才播；停靠明朝、從十州棋館自己的頁回來、重新整理或直接開網址、同一次換頁播過了都不播", () => {
  const { want, done } = load(false), V = (from, n = 1) => ({ from, n });
  assert.equal(want(V("#/"), "qin"), true, "秦朝從首頁走進來：播");
  assert.equal(want(V("#/journey/inn"), "classic"), true, "經典世界也算別的時空");
  assert.equal(want(V("#/adventure"), "tang"), true);
  assert.equal(want(V("#/"), "ming"), false, "停靠明朝：開發者說只要簡單轉場");
  for (const f of ["#/jianghu/hall/central", "#/jianghu/maze", "#/jianghu/maze/cross_palace", "#/school", "#/school/central", "#/jianghu?x=1"]) assert.equal(want(V(f), "qin"), false, "從十州棋館自己的頁回來不播：" + f);
  assert.equal(want(V(""), "qin"), false, "重新整理、直接開網址（沒有上一頁）不播");
  done(1); assert.equal(want(V("#/", 1), "qin"), false, "同一次換頁播過了不再播"); assert.equal(want(V("#/", 2), "qin"), true, "下一次從外面進來又播");
  assert.equal(want(null, "qin"), false);
});
test("文字：第一次「星槎泊入晚明江淮」、之後「十州棋局再開」，標題「萬曆江淮・十州棋館」；英文介面全英文", () => {
  const z = load(false), e = load(true);
  assert.deepEqual(JSON.parse(JSON.stringify(z.text(true))), { say: "星槎泊入晚明江淮", title: "萬曆江淮・十州棋館" });
  assert.equal(z.text(false).say, "十州棋局再開");
  assert.deepEqual(JSON.parse(JSON.stringify(e.text(true))), { say: "The star raft drifts into the late Ming", title: "Ten Prefectures · Wanli Era" });
  assert.ok(!/[一-鿿]/.test(e.text(false).say + e.text(false).title));
});
test("星線棋盤是標準象棋盤：9 條直線、10 條橫線，中間 7 條直線在河界斷開、兩邊不斷，兩個九宮各兩條斜線（共 30 條）", () => {
  const { lines, svg } = load(false), L = JSON.parse(JSON.stringify(lines()));
  assert.equal(L.length, 30);
  const V = L.filter(([x1, , x2]) => x1 === x2), H = L.filter(([, y1, , y2]) => y1 === y2), D = L.filter(([x1, y1, x2, y2]) => x1 !== x2 && y1 !== y2);
  assert.deepEqual([...new Set(V.map((l) => l[0]))].sort((a, b) => a - b), [0, 10, 20, 30, 40, 50, 60, 70, 80], "9 條直線");
  assert.deepEqual(H.map((l) => l[1]).sort((a, b) => a - b), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90], "10 條橫線");
  for (const x of [0, 80]) assert.deepEqual(V.filter((l) => l[0] === x), [[x, 0, x, 90]], "兩邊直線不斷");
  for (const x of [10, 20, 30, 40, 50, 60, 70]) assert.deepEqual(V.filter((l) => l[0] === x), [[x, 0, x, 40], [x, 50, x, 90]], "中間直線在河界斷開：" + x);
  assert.equal(D.length, 4); for (const [x1, y1, x2, y2] of D) { assert.ok([x1, x2].every((x) => x === 30 || x === 50), "斜線在九宮的三條直線裡"); assert.ok((y1 <= 20 && y2 <= 20) || (y1 >= 70 && y2 >= 70), "斜線在兩端的九宮") }
  assert.equal((svg().match(/<line /g) || []).length, 30, "SVG 也畫 30 條");
});
test("〔原始碼〕包住 Jianghu（不改 07z9b）：頂欄換成萬曆江淮；只在 #/jianghu 本頁播；圖載到才播、換頁就收；m.html 排在 07z9b 之後、迷宮之前；看過的記號跟著旅程存檔", () => {
  assert.match(SRC, /try\{if\(typeof Jianghu==="function"&&!Jianghu\.jhGate\)\{const j0=Jianghu;Jianghu=function\(v\)\{const r=j0\.apply\(this,arguments\);/);
  assert.ok(SRC.includes('setTop(jhL("🗺 萬曆江淮・十州棋館","🗺 Ten Prefectures · Wanli Era"),"#/")'));
  assert.ok(SRC.includes('if(jhgWant(V,era)&&/^#\\/jianghu\\/?$/.test(String(location.hash).split("?")[0])){JHG_DONE=V.n;const here=location.hash;'));
  assert.ok(SRC.includes("jhgLoad(src=>{if(location.hash!==here)return;"), "圖載到時已經換頁就不播");
  assert.ok(SRC.includes('o.addEventListener("click",end);addEventListener("hashchange",end);'), "點一下、換頁都收掉");
  const iB = HTML.indexOf("//#include m/07z9b-jianghu.js"), iN = HTML.indexOf("//#include m/07z9n-jhgate.js"), iM = HTML.indexOf("//#include m/07z9m-maze.js");
  assert.ok(iB > 0 && iN > iB && iM > iN, "載入順序：07z9b → 07z9n → 07z9m（迷宮那支包在外層）");
  assert.ok(SAVE.includes('JOURNEY_KEYS.push("m_jhGateSeen");'));
  assert.ok(!/\/\/[^\n]*$/m.test(SRC.split("\n").filter((l) => !/^\s*(\/\*|\*|`)/.test(l) && /;\s*\/\//.test(l)).join("\n")), "同一行程式後面沒有 // 註解");
});
