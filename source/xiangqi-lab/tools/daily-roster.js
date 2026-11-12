// 每日同題名冊（xiangqi-db/m/07dq-daily.js 的 DQ.GEN）改版小工具（評比第 14 輪 X4）。不改任何檔，只印出來給人貼。
//   ① 檢查：名冊裡的題是不是都還在題庫裡、有解答樹（被刪掉＝那幾天會出不了題，要放回題庫）。
//   ② 列出：題庫裡符合份量（DQ.WANT）、還沒進名冊的新題，印成一批可以貼到 DQ.GEN 最後面的 {from,sip,cup,pot}。
//      from 預設＝今天（臺灣日期）＋ 7 天：留時間讓新題庫、新程式都傳到大家手機上；那天以前挑的題完全不變。
// 用法：node xiangqi-lab/tools/daily-roster.js [--from 2027-03-01] [--bank 題庫檔路徑]
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
const BANK = arg("--bank") || path.join(__dirname, "..", "site", "data", "canju", "canju-set.json");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07dq-daily.js"), "utf8");
const ctx = { console, Date, Math, JSON, Set, Map, Object, Array, String, Number, isNaN, Promise, store: { get: (k, d) => d, set() { } } };
vm.createContext(ctx); vm.runInContext(SRC + "\n;this.X={DQ,dqToday,dqAdd,dqRosterFrom}", ctx);
const X = ctx.X, D = JSON.parse(fs.readFileSync(BANK, "utf8")), by = new Map(D.items.map(x => [x.id, x]));
const R = new Set(); let bad = 0;
for (const g of X.DQ.GEN) for (const s of ["sip", "cup", "pot"]) for (const id of String(g[s] || "").split(/\s+/).filter(Boolean)) {
  R.add(id); const x = by.get(id); if (!x || !x.tree || !(x.n > 0)) { bad++; console.log(`✖ 名冊（${g.from} 那批、${s}）的 ${id} ${x ? "沒有解答樹" : "不在題庫裡"}`) }
}
console.log(bad ? `✖ 名冊有 ${bad} 題出問題（名冊的題不能從題庫刪；要下架請加 DQ.DROP）` : `✔ 名冊 ${R.size} 題都在題庫裡`);
const nw = X.dqRosterFrom(D), add = {}; let n = 0;
for (const s of ["sip", "cup", "pot"]) { add[s] = nw[s].filter(id => !R.has(id)); n += add[s].length }
const last = X.DQ.GEN[X.DQ.GEN.length - 1].from, from = arg("--from") || X.dqAdd(X.dqToday(), 7);
if (!n) { console.log("題庫裡沒有還沒進名冊的新題，不用加新的一批。"); process.exit(bad ? 1 : 0) }
if (!(from > last)) { console.log(`✖ --from ${from} 要比最後一批的 ${last} 晚`); process.exit(1) }
console.log(`新題 ${n} 題（一口 ${add.sip.length}、一盞 ${add.cup.length}、一壺 ${add.pot.length}）。貼到 DQ.GEN 最後面（前一批後面加逗號）：`);
console.log(`    {from:"${from}",\n    sip:"${add.sip.join(" ")}",\n    cup:"${add.cup.join(" ")}",\n    pot:"${add.pot.join(" ")}"}`);
process.exit(bad ? 1 : 0);
