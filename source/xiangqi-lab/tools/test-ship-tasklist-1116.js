// hspx 開發者 11/16（手機截圖「還不能起航」）：「修正，然後剛剛我完成兩題千秋殘局 在啟航清單上卻沒有更新 還是顯示0/2」
//   ① 版面：清單每一列的字被擠成一行一個字。原因是「去」那顆按鈕吃到 .btn 預設的 width:100%，把整列佔滿。
//      m/07f-ship.js shipTaskList 改成兩行：上面勾、名字、進度、「去」（按鈕只有自己那麼寬），下面一行說明。
//   ② 解局沒有加：本機照正常流程解一題，清單有從 0/2 變 1/2。匿名作答紀錄（xiangqi-db/irt-responses.jsonl）查到那兩題是 04:44、04:45 解的
//      船艙站的題（xs-classic-N、sq318），而清單看的是航線最前面的漢站——算在船艙，沒有算錯，但清單沒講是哪一站。
//      清單標題和「解局」那一項現在都寫出站名。另外看答案走完的題本來就不算解開，清單的說明會講「有 n 題是看答案走完的，不算」；
//      題庫還沒載好時先不講，載好再畫一次。
// 這裡把那兩個函式從原始碼抽出來用 vm 跑；畫面在本機候選版手機尺寸看過。
// 用法：node --test xiangqi-lab/tools/test-ship-tasklist-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07f-ship.js"), "utf8").replace(/\r\n/g, "\n");
const cut = (a, b) => { const i = SRC.indexOf(a), j = SRC.indexOf(b, i); assert.ok(i > 0 && j > i, "找不到 " + a); return SRC.slice(i, j) };
const TASKS = cut("function shipTasks(k){", "function shipSailNeed(){"), LIST = cut("function shipTaskList(N,go){", "function shipGoalHTML(N){");

function load(o) {
  o = o || {}; const DB = Object.assign({ shipSolved: {}, cj: { solved: {} } }, o.db || {});
  const ctx = { store: { get: (k, d) => (k in DB ? DB[k] : d) }, esc: s => String(s), shipPuzzles: () => (o.bank === null ? null : ["a", "b", "c", "d"]), SHIP_PLAN: {}, shipPiece: () => "俥", shipShort: k => ({ classic: "船艙", qin: "秦", han: "漢" }[k] || k),
    SHIP_LV: [0, 0, 3], shipOrder: () => ["classic", "qin", "han"], xpInfo: () => ({ L: 2 }), SHIP_PER: 3 };
  vm.createContext(ctx); vm.runInContext(TASKS + ";" + LIST + ";this.__X={shipTasks,shipTaskList}", ctx); return ctx.__X;
}
const rec = { at: 1, h: 0 }, ans = { at: 1, p: 0, a: 1 }, own = { at: 1, p: 1, a: 0 };

test("〔行為〕解局的進度照舊只算自己解開的題；看答案走完的不算，清單的說明會講有幾題", () => {
  const A = load({ db: { shipSolved: { han: { a: rec } }, cj: { solved: { a: own, b: ans } } } }).shipTasks("han")[0];
  assert.equal(A.t, "解局"); assert.equal(A.p, "1/2"); assert.equal(A.ok, false);
  assert.equal(A.d, "解開「漢」這一站 2 題千秋殘局（有 1 題是看答案走完的，不算；不看答案再解一次就算）");
  const B = load({ db: { cj: { solved: { a: ans, b: ans } } } }).shipTasks("han")[0];
  assert.equal(B.p, "0/2"); assert.match(B.d, /有 2 題是看答案走完的/, "兩題都是看答案走完的：還是 0/2，但講得出原因");
});

test("〔行為〕沒有看答案、看了答案後來自己解開、已經解滿 2 題、這一站第四題以後的題：都不多講", () => {
  const plain = "解開「漢」這一站 2 題千秋殘局";
  assert.equal(load().shipTasks("han")[0].d, plain);
  assert.equal(load({ db: { shipSolved: { han: { a: rec } }, cj: { solved: { a: ans } } } }).shipTasks("han")[0].d, plain, "看過答案、後來自己解開的那一題不算進去");
  const full = load({ db: { shipSolved: { han: { a: rec, b: rec } }, cj: { solved: { c: ans } } } }).shipTasks("han")[0];
  assert.equal(full.p, "2/2"); assert.equal(full.ok, true); assert.equal(full.d, plain);
  assert.equal(load({ db: { cj: { solved: { d: ans } } } }).shipTasks("han")[0].d, plain, "只看這一站的 3 題");
});

test("〔行為〕題庫還沒載好（不知道這一站是哪三題）時不講，也不會壞；別站的紀錄不會算到這一站", () => {
  const A = load({ bank: null, db: { cj: { solved: { a: ans } } } }).shipTasks("han")[0];
  assert.equal(A.d, "解開「漢」這一站 2 題千秋殘局"); assert.equal(A.p, "0/2");
  assert.equal(load({ db: { shipSolved: { qin: { a: rec, b: rec } } } }).shipTasks("han")[0].p, "0/2");
});

test("〔混合〕在別站解的題算在那一站（開發者那兩題是船艙的）；清單標題和解局那一項都寫出是哪一站", () => {
  const K = load({ db: { shipSolved: { classic: { a: rec, b: rec } } } });
  assert.equal(K.shipTasks("han")[0].p, "0/2"); assert.equal(K.shipTasks("classic")[0].p, "2/2");
  assert.match(K.shipTasks("han")[0].d, /^解開「漢」這一站/); assert.match(K.shipTasks("classic")[0].d, /^解開「船艙」這一站/);
  assert.ok(SRC.includes(`<p><b>【'+esc(shipShort(N.k))+'・本站歷練】（'+N.n+'/'+SAIL_NEED+'）</b></p>`));
});

test("〔行為〕清單一列兩行：上面勾、名字、進度、「去」，下面說明；「去」只有自己那麼寬、夠大好按", () => {
  const K = load({ db: { shipSolved: { han: { a: rec, b: rec } } } }), T = K.shipTasks("han"), H = K.shipTaskList({ T }, true), rows = H.split("<li ").slice(1);
  assert.equal(rows.length, 5);
  for (const [i, r] of rows.entries()) {
    const top = r.slice(0, r.indexOf("</div>")), sub = r.slice(r.indexOf("</div>"));
    assert.ok(top.includes("<b ") && top.includes(T[i].t) && top.includes(T[i].p), "第一行有名字和進度");
    assert.ok(!top.includes(T[i].d) && sub.includes(T[i].d), "說明在第二行，不跟名字擠同一行");
  }
  const btn = H.match(/<button[^>]*>/g) || [];
  assert.equal(btn.length, 3, "做完的（解局）和沒有地方可去的（修為）沒有「去」");
  for (const b of btn) assert.ok(b.includes("flex:none") && b.includes("width:auto") && b.includes("min-height:44px"), "按鈕不再佔滿整列");
  assert.ok(rows[0].startsWith('style="padding:8px 0;border-top:1px solid rgba(128,128,128,.25);opacity:.7"'), "做完的那一列淡一點");
  assert.equal((K.shipTaskList({ T }, false).match(/<button/g) || []).length, 0, "人不在那一站時不給「去」");
});

test("〔原始碼〕打開清單時題庫還沒載好：載好以後重畫一次（人還在同一站、清單還開著才畫），「去」重新接上", () => {
  const G = cut("function shipGateSay(N){", "/* 起航 #/ship/sail");
  assert.ok(G.includes(`<div id="sgList">'+shipTaskList(N,here)+'</div>`));
  assert.ok(G.includes('if(!N.first&&shipPuzzles(N.k)===null)shipBank().then(()=>{const N2=shipSailNeed(),L=b.querySelector("#sgList");if(!N2||N2.first||N2.k!==N.k||!L||!L.isConnected)return;N=N2;L.innerHTML=shipTaskList(N,here);bind()}).catch(()=>{})'));
  assert.ok(G.includes('const bind=()=>b.querySelectorAll("[data-sg]").forEach(x=>x.onclick=()=>{const t=N.T[+x.dataset.sg];closeSheet();if(t&&t.go)location.hash=t.go});bind();'));
});
