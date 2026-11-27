"use strict";
/* 各派碑刻內容（11/24）：lore 的件數跟地圖上的 L 一樣多、id 不重複、中英文標題與內文都有、src 有寫；
   用 vm 載入共用迷宮＋lore.js＋該派，真的走到每一塊碑前讀一次，讀到的就是 lore 照「由上到下、由左到右」的順序。另外接上像素材質路徑。 */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), R = (f) => fs.readFileSync(path.join(M, f), "utf8");
const SIDS = [["pawn", "07z9m-pawn.js"]].concat(fs.existsSync(path.join(M, "07z9m-elephant.js")) ? [["elephant", "07z9m-elephant.js"]] : []);
function load(file) {
  const c = { store: { get: (k, d) => d, set() {} }, jhL: (z) => z, esc: (s) => String(s), addXP() {}, xqFlag: () => true, location: { hash: "" }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array, Date };
  vm.createContext(c); vm.runInContext(R("07z9m-maze.js") + "\n" + R("07z9m-lore.js") + "\n" + R(file) + ";this.X={jhMzNew,jhMzStep,JH_MZ_LV}", c); return c.X;
}
for (const [sid, file] of SIDS) test(sid + "：碑刻件數跟地圖一致、內容齊全、走過去讀得到；材質路徑接上", () => {
  const X = load(file), lv = X.JH_MZ_LV[sid], L = [];
  lv.map.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "L") L.push([x, y]) }));
  assert.ok(Array.isArray(lv.lore) && lv.lore.length === L.length && L.length >= 3, "lore " + (lv.lore || []).length + " 件、地圖 L " + L.length + " 塊");
  assert.equal(new Set(lv.lore.map((x) => x.id)).size, lv.lore.length, "id 不重複");
  for (const it of lv.lore) {
    assert.ok(["stele", "slip", "doc"].includes(it.kind), it.id + " kind");
    assert.ok(it.title[0] && it.title[1] && it.body[0] && it.body[1] && it.src, it.id + " 中英文標題、內文、出處都有");
    assert.ok(it.body[0].length <= 120, it.id + " 中文內文 120 字以內");
  }
  const S = X.jhMzNew(sid), got = [];
  for (const [x, y] of L) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const px = x - dx, py = y - dy, c = S.lv.map[py] && S.lv.map[py][px]; if (!c || /[#DRHLWX~os]/.test(c)) continue;   /* o＝列炮戲箱、s＝順炮鹽灶（11/26 撞字元改名，原本是 X、Z） */
    S.player.x = px; S.player.y = py; const e = X.jhMzStep(S, dx, dy); assert.equal(e.ev, "lore"); got.push(e.id); break;
  }
  assert.deepEqual(got, lv.lore.map((x) => x.id), "地圖上由上到下讀到的就是 lore 的順序");
  assert.deepEqual({ ...lv.tex }, { floor: "data/maze/tex/" + sid + "_floor.webp", side: "data/maze/tex/" + sid + "_wall.webp" });
});
