/* W195（外部審核第 8 項，P2）：地底迷宮「再走一次」開的新一趟，第一次掌門提示也要免費。
   原本：通關後按「再走一次」，畫面用 Object.assign(S, jhMzNew(…)) 接新一趟；jhMzNew 沒寫 hintUsed，上一趟的 hintUsed:true 留下來，
   新一趟第一次提示就扣 1 點門派貢獻（2→1），貢獻是 0 就直接被拒絕；要退出門派再進來（整個重開 S）才恢復。
   這裡照畫面的真實寫法重播「走一趟用過提示→通關→再走一次→提示」：再走一次的那段原始碼從 07z9m-maze.js 抽出來核對，純邏輯用 vm 實跑。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-maze.js"), "utf8").replace(/\r\n/g, "\n");
function load(mem = {}) {
  const c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze" }) });
  vm.createContext(c); vm.runInContext(SRC, c); return c;
}
/* 畫面上「再走一次」的寫法（從原始碼確認），照它接新一趟 */
const again = (c, S, LV, clear) => Object.assign(S, c.jhMzNew(LV, clear, c.jhMzPtrGet(LV)));

test("「再走一次」的寫法還是 Object.assign(S, jhMzNew(…))（本測試重播的就是這條路）", () => {
  assert.match(SRC, /o\.querySelector\('\[data-a="again"\]'\)\.onclick=\(\)=>\{shut\(o\);const n2=jhMzNew\(LV,R\.G\.clear,jhMzPtrGet\(LV\)\);Object\.assign\(S,n2\);/);
});

test("W195：用過提示、通關、再走一次——新一趟第一次提示免費，不扣門派貢獻（存檔 2 點照舊是 2）", () => {
  const mem = { jhMaze: JSON.stringify({ clear: 1, best: 30, gong: 2, page: 0, box: 0 }) }, c = load(mem);
  const S = c.jhMzNew("central", 1);
  assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: true, cost: 0 }, "第一趟第一次免費");
  assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: true, cost: 1 }, "第一趟第二次花 1 點");
  assert.equal(JSON.parse(mem.jhMaze).gong, 1);
  again(c, S, "central", 2);
  assert.equal(c.jhMzHintCost(S), 0, "新一趟提示要花 0 點");
  assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: true, cost: 0 }, "新一趟第一次免費");
  assert.equal(JSON.parse(mem.jhMaze).gong, 1, "存檔的貢獻沒被扣");
  assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: true, cost: 1 }, "新一趟第二次照規則花 1 點");
  assert.equal(JSON.parse(mem.jhMaze).gong, 0);
});

test("W195：門派貢獻已經是 0 時再走一次，第一次提示照樣給（原本直接被拒絕）；第二次才說不夠", () => {
  const mem = { jhMaze: JSON.stringify({ clear: 3, best: 30, gong: 0, page: 0, box: 0 }) }, c = load(mem);
  const S = c.jhMzNew("central", 3);
  c.jhMzUseHint(S);
  assert.equal(c.jhMzUseHint(S).ok, false, "第一趟第二次：沒有貢獻就不給");
  for (let i = 0; i < 3; i++) {
    again(c, S, "central", 4 + i);
    assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: true, cost: 0 }, "第 " + (i + 2) + " 趟第一次免費");
    assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: false, need: 1, have: 0 }, "第 " + (i + 2) + " 趟第二次不夠");
  }
});

test("W195：別派（jhMzDef 登記的派，一樣從 jhMzNew 開新一趟）再走一次也一樣，沒有門派貢獻的派也照樣每趟免費一次", () => {
  const c = load({});
  vm.runInContext('jhMzDef("w195a",{map:["#####","#@.>#","#####"],guards:[],pool:{}});jhMzDef("w195b",{map:["#####","#@.>#","#####"],guards:[],pool:{},rew:[{k:"page",zh:"頁",en:"p"}]});', c);
  const ids = Object.keys(vm.runInContext("JH_MZ_LV", c));
  assert.ok(ids.includes("central") && ids.includes("w195a") && ids.includes("w195b"));
  for (const id of ids) {
    const S = c.jhMzNew(id, 0);
    c.jhMzUseHint(S);
    again(c, S, id, 1);
    assert.equal(S.hintUsed, false, id + "：再走一次後 hintUsed 是 false");
    assert.equal(c.jhMzHintCost(S), 0, id);
  }
});
