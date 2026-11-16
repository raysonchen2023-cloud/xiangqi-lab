// 開發者 11/16：「除了意見回饋欄的按鈕，其他都要讓開發者的視角和玩家一樣，要看開發者的內容要到開發者測試台」
// 選單：測試台加一個總開關、本機也跟玩家一樣、自我檢查提示收進測試台紀錄。
//   02-shell.js：DEVUNLOCK（測試台「🔓 全部解鎖試玩」）、DEVTOOLS（「🛠 頁面上顯示開發者小工具」）、devNote（自我檢查紀錄，最多 30 筆）；DEVMODE 只管意見回饋管理、測試台入口、玩家看不到的差別。
//   各模組會改變畫面的特例改看 DEVUNLOCK／DEVTOOLS；本機網址不再自動解鎖；07dv-devtest.js 最上面一區「👁 開發者視角」。
// 這裡用 vm 跑 02-shell 那三個函式的定義，再查各模組原始碼。畫面在本機候選版手機尺寸看過（測試台兩個開關、解鎖前後觀星臺／西市／星門圍城全開）。
// 用法：node --test xiangqi-lab/tools/test-devview-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const rd = f => fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");
const SH = rd("02-shell.js");

function defs(st, off) {
  const a = SH.indexOf("const DEVMODE=()=>"), b = SH.indexOf("function devNote(t){"), e = SH.indexOf("\n", b);
  const ctx = { store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } }, OFF: off !== false, Date };
  vm.createContext(ctx); vm.runInContext(SH.slice(a, e) + "\n;this.__X={DEVMODE,DEVUNLOCK,DEVTOOLS,devNote};", ctx); return ctx.__X;
}

test("〔行為〕兩個開關預設關＝跟玩家一樣；開發者模式關著時開關存了也沒用；自我檢查紀錄最多 30 筆", () => {
  let X = defs({ devMode: true });
  assert.equal(X.DEVMODE(), true); assert.equal(X.DEVUNLOCK(), false, "開發者模式開著、沒開總開關＝不解鎖"); assert.equal(X.DEVTOOLS(), false);
  X = defs({ devMode: true, dvtUnlock: true, dvtTools: true }); assert.equal(X.DEVUNLOCK(), true); assert.equal(X.DEVTOOLS(), true);
  X = defs({ dvtUnlock: true, dvtTools: true }); assert.equal(X.DEVUNLOCK(), false, "一般玩家手動設了也沒用"); assert.equal(X.DEVTOOLS(), false);
  const st = { devLog: "壞掉的" }; X = defs(st); for (let i = 0; i < 35; i++) X.devNote("第 " + i + " 筆");
  assert.equal(st.devLog.length, 30); assert.equal(st.devLog[29][1], "第 34 筆"); assert.equal(st.devLog[0][1], "第 5 筆");
});

test("〔原始碼〕會改變畫面的特例都不再直接看 DEVMODE：解鎖類看 DEVUNLOCK、小工具看 DEVTOOLS、自我檢查用 devNote", () => {
  const U = '(typeof DEVUNLOCK==="function"&&DEVUNLOCK())', T = '(typeof DEVTOOLS==="function"&&DEVTOOLS())';
  const want = {
    "07bhg-gatesiege.js": ["function gsvDevAll(){if(GSV_ALL!=null)return GSV_ALL;try{return!!" + U + "}"],
    "07mnq-mainquest.js": ["function mnqPeekOk(){try{return!!" + U + "}"],
    "07stq-starter.js": ["function stqPeekOk(){try{return!!" + U + "}"],
    "07-legend.js": ["(book1Done()||" + U + ")", "${" + U + "?'<button class=\"lk\" id=\"bkDev\"", "debug:" + T],
    "07f-ship.js": ["if(!book1Done()&&!" + U + ")return toast(", 'devNote("🧪 新立體'],
    "07n-portfx.js": ["function pfxDev(P){if(!" + T + "||", 'devNote("🧪 船艙動態'],
    "07r-portwind.js": ["function pwdDev(P){if(!" + T + "||", 'devNote("🧪 渡口風'],
    "07e-garden2.js": ["const dev=" + T + "?(store.get(\"xhDev\",0)|0):0;"],
    "07u-women.js": ["return " + T + "&&!!(store.get(\"wmDev\",{})||{})[k]"],
    "07v-relicdrop.js": ["function rdForce(){try{return " + T + "?String("],
    "09b-preload.js": ["(" + T + "?[[\"👥\",()=>seatSheet(),\"連線對戰\"]]:[])"],
    "02r-reloadguard.js": ["function rlgSetMount(v){try{if(!" + T + ")return;"],
    "05-settings.js": ["<b id=\"aUse\">計算中…</b></div>${" + T + "?`", "return " + T + "?mxShadowReport(rep):null"],
  };
  for (const [f, L] of Object.entries(want)) { const s = rd(f); for (const x of L) assert.ok(s.includes(x), f + "：" + x.slice(0, 50)) }
  for (const f of ["07f-ship.js", "07n-portfx.js", "07r-portwind.js"]) assert.ok(!/DEVMODE\(\)\)toast\("🧪/.test(rd(f)), f + "：自我檢查不再跳提示");
  for (const f of ["07bhg-gatesiege.js", "07mnq-mainquest.js", "07stq-starter.js"]) assert.ok(!/Peek|DevAll/.test("") && !/function (gsvDevAll|mnqPeekOk|stqPeekOk)\(\)\{[^\n]*localhost/.test(rd(f)), f + "：本機網址不再自動解鎖");
});

test("〔原始碼〕意見回饋管理照舊只看 DEVMODE；測試台最上面一區「👁 開發者視角」有兩個開關和自我檢查紀錄", () => {
  assert.ok(rd("03-home-quiz.js").includes('!hub&&DEVMODE()&&typeof openFbAdmin==="function"?[["📋",openFbAdmin,"意見回饋管理"]]'), "首頁的 📋");
  assert.ok(rd("05-settings.js").includes('[...(OFF&&DEVMODE()?[["📋",openFbAdmin,"意見回饋管理"]]:[])'), "設定的 📋");
  const D = rd("07dv-devtest.js");
  for (const x of ['<div class="sec-t">👁 開發者視角</div>', 'row("dvU"', 'row("dvW"', 'row("dvL"', 'store.set("dvtUnlock",!un)', 'store.set("dvtTools",!tl)', 'store.set("devLog",[])'])
    assert.ok(D.includes(x), x);
  assert.ok(D.indexOf("👁 開發者視角") < D.indexOf("🌀 黑洞</div>"), "放在最上面");
});
