// 11/17 iPhone 模擬器測試第 8 項：新玩家第一次偏航（星門圍城・序章 A1）打完，結果視窗只有「↻ 再打一次／返回選關」，
//   按「返回選關」打開序章 A1～C3 的關卡列表，主線下一步（回星槎、停靠漢朝、駱躍梅加入）找不到，容易卡住。
//   修法（07sg2 sg2Result）：起航途中偏航來的這一盤（sessionStorage bhDrift：07sg2 sg2Drift 設、選關「出戰」清掉；bhRet 有目的站 k、cover＝要補停靠）
//   主按鈕改「⛵ 星槎回航」＝07bh bhReturn（回星槎頁、補跑那一站的停靠封面），「再打一次」留著當次要鈕；從觀星臺選關進來的照舊「再打一次／返回選關」。
// 不開瀏覽器：sg2Result 連同 sg2ResDrift／sg2ResHome 切出來，假的 modal、store、sessionStorage 實際跑。用法：node --test xiangqi-lab/tools/test-sg2-drift-result-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const SG2 = rd("xiangqi-db/m/07sg2-siege2.js"), BH = rd("xiangqi-db/m/07bh-blackhole.js");
const a = SG2.indexOf("function sg2Result("), b = SG2.indexOf("\nfunction sg2ResDrift("), c = SG2.indexOf("\n", SG2.indexOf("\nfunction sg2ResHome(") + 1);
assert.ok(a > 0 && b > a && c > b, "07sg2 找得到 sg2Result 和偏航判斷");
const SRC = SG2.slice(a, c);

function kit(o) {
  const ss = Object.assign({}, o.ss), st = Object.assign({}, o.store), log = { modal: null, start: [], select: [], ret: 0, hash: "" };
  const env = { gsvCss: () => { }, GSV: { LV: { 31: { nm: "初探星門" } } }, esc: s => String(s),
    store: { get: (k, d) => k in st ? st[k] : d, set: (k, v) => { st[k] = v } },
    sessionStorage: { getItem: k => k in ss ? ss[k] : null, removeItem: k => { delete ss[k] } },
    SG2G: { SKM: {}, stars: () => [1, 1, 0], goals: () => [{ t: "破陣" }, { t: "帥不倒" }, { t: "十回合內" }], nameOf: () => "序章 A1" }, SG2: { kingOf: () => 0 },
    gsvProg: () => ({ v2: {} }), sg2Award: () => null, modal: (h, btns, cls) => { log.modal = { h, btns, cls } },
    gsvStart: (...x) => log.start.push(x), gsvSelect: (...x) => log.select.push(x), bhReturn: () => { log.ret++ }, location: { set hash(h) { log.hash = h } } };
  const names = Object.keys(env);
  const f = new Function(...names, SRC + ";return{sg2Result,sg2ResDrift}")(...names.map(k => env[k]));
  const stt = { result: { why: "敵將倒下", w: "r" }, human: "r", td: { lv: 31, diff: 1, dnm: "易", nm: "初探星門", used: {}, rnd: 9, dep: 2, sk: null, s: { b: ["K"], h: [30], x: [30] } } };
  f.sg2Result(stt, true, false, "");
  const labels = log.modal.btns.map(x => x[0]), click = i => log.modal.btns[i][1]();
  return { f, log, ss, labels, click, ghost: log.modal.btns.map(x => !!x[2]) };
}
const DRIFT = { ss: { bhDrift: "1" }, store: { bhRet: { k: "han", cover: true, at: 1, first: false } } };

test("〔行為〕起航偏航來的序章 A1 破陣：主按鈕「⛵ 星槎回航」→ bhReturn（回星槎、補停靠漢朝）；沒有返回選關", () => {
  const K = kit(DRIFT);
  assert.deepEqual(K.labels, ["⛵ 星槎回航", "↻ 再打一次", "再看一下星盤"]);
  assert.deepEqual(K.ghost, [false, true, true], "回星槎是主按鈕（res 視窗第一顆、不是 ghost）");
  assert.equal(K.log.modal.cls, "res");
  K.click(0); assert.equal(K.log.ret, 1, "走 07bh bhReturn"); assert.equal(K.ss.bhDrift, undefined, "偏航記號清掉"); assert.equal(K.log.select.length, 0, "沒有開選關");
  const K2 = kit(DRIFT); K2.click(1); assert.deepEqual(K2.log.start[0].slice(0, 3), [31, "han", true], "再打一次照舊（同一關、同一個目的站）");
});

test("〔照舊〕從觀星臺選關進來（沒有 bhDrift）：再打一次／返回選關", () => {
  const K = kit({ ss: {}, store: { bhRet: { k: "classic", cover: false, at: 1 } } });
  assert.deepEqual(K.labels, ["↻ 再打一次", "返回選關", "再看一下星盤"]);
  K.click(1); assert.equal(K.log.select.length, 1); assert.equal(K.log.ret, 0);
  const K2 = kit({ ss: { bhDrift: "1" }, store: { bhRet: { k: "classic", cover: false, at: 1 } } });
  assert.deepEqual(K2.labels, ["↻ 再打一次", "返回選關", "再看一下星盤"], "沒有要補停靠（cover:false）：照舊");
});

test("〔接點〕bhReturn 回星槎頁並補跑停靠；偏航記號在 sg2Drift 設、選關出戰清掉", () => {
  assert.ok(BH.includes('function bhReturn(){const R=store.get("bhRet",null);store.set("bhRet",null);location.hash="#/adventure";'));
  assert.ok(BH.includes('if(R&&R.cover&&R.k&&typeof shipDockCover==="function")setTimeout(()=>{try{shipDockCover(R.k,()=>{})}catch(e){}},400)}'));
  assert.ok(SG2.includes('function sg2Drift(k,cover){if(!sg2DriftOk())return false;try{sessionStorage.setItem("bhDrift","1")}catch(e){}'));
  assert.ok(SG2.includes('["⚔ 出戰",()=>{try{sessionStorage.removeItem("bhDrift")}catch(e){}'));
});
