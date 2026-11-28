// W207（外部審核第 21 項，P2）棋力測驗：
// ① 題庫裡盤面、輪走方、答案都一樣的重複題（q60／q80 一題標業 3、一題標業 4，另有 q2／q4、q6／q10、q95／q103）載入時去掉，只留題號小的那一題；
// ② 首頁入口的說明跟實際題數一致：自適應測驗「至少 8 題、SE ≤ .35 或滿 20 題」結束，入口寫「約 8～20 題」，不再寫「每級 2 題」。
// 用實際的 data/quiz.json 跑 03-home-quiz 的 qzDedup（vm），不是只比對字串。用法 node --test xiangqi-lab/tools/test-quiz-dedup-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const Q = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/03-home-quiz.js"), "utf8").replace(/\r\n/g, "\n");
const DATA = [path.join(__dirname, "..", "site", "data", "quiz.json"), path.join(__dirname, "..", "..", "..", "data", "quiz.json")].find((f) => fs.existsSync(f));
const cut = (a, b) => { const i = Q.indexOf(a), j = Q.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return Q.slice(i, j + b.length) };
const c = vm.createContext({ Set }); vm.runInContext(cut("function qzDedup(items){", "return out}") + "\nthis.qzDedup=qzDedup;", c);
const key = (x) => x.board + "|" + x.side + "|" + x.f + "|" + x.t;

test("實際題庫：去掉 4 題重複（q4、q10、q80、q103），留下題號小的；去完沒有任何重複", () => {
  assert.ok(DATA, "找不到 data/quiz.json");
  const items = JSON.parse(fs.readFileSync(DATA, "utf8")).items, out = c.qzDedup(items);
  const gone = items.filter((x) => !out.includes(x)).map((x) => x.id).sort();
  assert.deepEqual(gone, ["q10", "q103", "q4", "q80"]);
  for (const id of ["q2", "q6", "q60", "q95"]) assert.ok(out.some((x) => x.id === id), id + " 留著");
  assert.equal(new Set(out.map(key)).size, out.length, "去完沒有重複");
  assert.equal(out.length, items.length - 4);
});

test("去重的鍵是盤面＋輪走方＋答案：輪走方或答案不同就不算重複", () => {
  const a = { id: "a", board: "x", side: "r", f: 1, t: 2 };
  assert.equal(c.qzDedup([a, { ...a, id: "b" }]).length, 1);
  assert.equal(c.qzDedup([a, { ...a, id: "b", side: "b" }]).length, 2);
  assert.equal(c.qzDedup([a, { ...a, id: "b", t: 3 }]).length, 2);
  assert.equal(c.qzDedup(null).length, 0);
});

test("測驗開始和接續上次都會先去重（cal 只做一次）", () => {
  assert.match(Q, /const cal=\(\)=>\{if\(D&&!D\._dd\)\{D\.items=qzDedup\(D\.items\);D\._dd=1\}/);
  assert.ok((Q.match(/D=D\|\|await api\("\/quiz\/data"\)\}catch\(e\)\{return toast\(e\.message\)\}\s*cal\(\);/g) || []).length >= 2, "start 和 resume 載入後都叫 cal()");
});

test("入口說明跟實際題數一致：程式至少 8 題、最多 20 題，入口寫「約 8～20 題」，不再寫「每級 2 題」", () => {
  assert.ok(Q.includes("const done=()=>ans.length>=20||(ans.length>=8&&est.se<=.35);"), "結束條件還是 8～20 題（改了要一起改入口說明）");
  assert.ok(Q.includes('"約 8～20 題・估出你的段位（新手～專2）"'));
  assert.ok(!Q.includes("每級 2 題"));
});
