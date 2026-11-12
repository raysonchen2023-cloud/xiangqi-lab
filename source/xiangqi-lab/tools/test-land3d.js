// 第 9 輪 F1（Gemini 改善單 6）：3D 一般落子落地那一刻有落子聲＋落點漣漪與塵
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..", ".."), rd = f => fs.readFileSync(path.join(R, f), "utf8");
const B = rd("xiangqi-db/m/01-board.js"), P3 = rd("xiangqi-lab/src/park3d.js");
const fnSrc = (() => { const a = B.indexOf("function landSound(giant){"), b = B.indexOf("\n", a); return B.slice(a, b) })();
const run = (st, gain) => { const log = [], store = { get: (k, d) => k in st ? st[k] : d }; const f = new Function("store", "sxmGain", "withAudio", "moveSound0", fnSrc + ";return landSound");
  f(store, () => gain, cb => cb(), cap => log.push(cap))(false); return log };

test("落子聲：預設 3D 落地敲一聲（不是吃子聲）", () => {
  assert.deepEqual(run({}, 1), [false]);
});
test("落子聲：已開 2D 落子聲的人不重複、棋子音量 0 不出聲、關掉 land3d 不出聲", () => {
  assert.deepEqual(run({ mvSound: true }, 1), []);
  assert.deepEqual(run({}, 0), []);
  assert.deepEqual(run({ land3d: false }, 1), []);
});
test("〔原始碼〕一般走子落地才叫 landFx（吃子不叫）；黑洞走子用 gntMove 的落地回呼；減少動態、省電只出聲", () => {
  assert.ok(P3.includes("end:()=>{at(g,L.t);if(!cap)landFx(L.t,false)}"));
  assert.ok(P3.includes("if(GIANT&&!cap)gntMove(g,GK,L.f,L.t,()=>landFx(L.t,true),{});"));
  assert.match(P3, /const landFx=\(ti,giant\)=>\{try\{if\(window\.XQ_LAND\)window\.XQ_LAND\(giant\)\}catch\(e\)\{\}if\(RDM\|\|PW\.on\)return;/);
  assert.ok(B.includes("window.XQ_LAND=landSound"));
});
