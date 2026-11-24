// W71e①（#97 預驗建議，11/24 開發者「挪到送審前搞定」）：迷宮撞到跳不過的糧袋時，提示改說「炮只能隔一個子跳」
//   jhMzStep 撞到跳不過的糧袋（兩袋並排、袋子後面是牆或石門）回傳 {ev:"wall", block:"jump"}；一般的牆不帶 block；跳得過的糧袋照樣跳。
//   糧袋位置不寫死：從地圖上自動找，地圖改版（例如迷路版）也照樣測得到。畫面那一段用原始碼檢查訊息。
// 用法：node --test xiangqi-lab/tools/test-jh-maze-sack-1124.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-maze.js"), "utf8");

function load() {
  const mem = {};
  const c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP() {}, xqFlag: () => true,
    Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/hall/central" }) });
  vm.createContext(c); vm.runInContext(SRC, c);
  return c;
}
const D4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
/* 在地圖上找：站得上去的格 → 往某方向是糧袋 → 糧袋後面是實心（跳不過）或不是實心（跳得過） */
function find(c, S, blocked) {
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
    if (c.jhMzSolid(S, x, y)) continue;
    for (const [dx, dy] of D4) {
      const k = c.jhMzCell(S, x + dx, y + dy);
      if (!k || !S.lv.jump.includes(k)) continue;
      if (c.jhMzSolid(S, x + 2 * dx, y + 2 * dy) === blocked) return { x, y, dx, dy };
    }
  }
  return null;
}
const stand = (S, p) => { S.player.x = p.x; S.player.y = p.y; (S.guards || []).forEach(g => { g.stun = 99 }) };

test("撞到跳不過的糧袋：回傳 wall 加 block:\"jump\"、人不動、不算回合", () => {
  const c = load(), S = c.jhMzNew("central", 0, 0), p = find(c, S, true);
  assert.ok(p, "地圖上要有一顆跳不過的糧袋（兩袋並排或後面是牆）");
  stand(S, p); const t0 = S.turn, r = c.jhMzStep(S, p.dx, p.dy);
  assert.equal(r.ev, "wall"); assert.equal(r.block, "jump");
  assert.equal(S.player.x, p.x); assert.equal(S.player.y, p.y); assert.equal(S.turn, t0, "撞牆不算回合");
});

test("一般的牆不帶 block；跳得過的糧袋照樣跳過去", () => {
  const c = load(), S = c.jhMzNew("central", 0, 0);
  let wall = null;
  for (let y = 0; y < S.H && !wall; y++) for (let x = 0; x < S.W && !wall; x++) {
    if (c.jhMzSolid(S, x, y)) continue;
    for (const [dx, dy] of D4) if (c.jhMzCell(S, x + dx, y + dy) === "#") { wall = { x, y, dx, dy }; break }
  }
  stand(S, wall); const r = c.jhMzStep(S, wall.dx, wall.dy);
  assert.equal(r.ev, "wall"); assert.equal(r.block, undefined, "一般的牆不是糧袋");
  const S2 = c.jhMzNew("central", 0, 0), j = find(c, S2, false);
  assert.ok(j, "地圖上要有一顆跳得過的糧袋");
  stand(S2, j); const r2 = c.jhMzStep(S2, j.dx, j.dy);
  assert.equal(r2.ev, "jump"); assert.equal(S2.player.x, j.x + 2 * j.dx); assert.equal(S2.player.y, j.y + 2 * j.dy);
});

test("畫面：block 是 jump 時說「炮只能隔一個子跳」，其他牆照舊說「前面過不去。」（中英文都有）", () => {
  assert.ok(SRC.includes('r.block==="jump"?jhL("炮只能隔一個子跳：'), "撞到跳不過的糧袋要換訊息");
  assert.ok(SRC.includes("A cannon jumps over exactly one piece"), "英文也要有");
  assert.ok(SRC.includes('jhL("前面過不去。","Can\'t go that way.")'), "一般的牆照舊");
});
