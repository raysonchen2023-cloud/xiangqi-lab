// 11/18 開發者選「掌門胸前圓牌印上門派字」：派名第一個字、掌門執紅＝紅字執黑＝黑字；立繪由 xiangqi-db/tools/zm_disc_char.py 印上，
// 3D 模型由 bot3d.js figure 的 gch／gred 照 ring3d.json 的圓牌位置貼上。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), M = path.join(ROOT, "xiangqi-db", "m"), SRC = path.join(ROOT, "xiangqi-lab", "src");
const rd = f => fs.readFileSync(f, "utf8");
const Z = rd(path.join(M, "07z9-school.js"));
const gch = () => { const m = Z.match(/const ZM_GCH=(\{[^}]*\});/); assert.ok(m, "07z9 有 ZM_GCH"); return vm.runInNewContext("(" + m[1] + ")") };
const sch = () => { const a = Z.indexOf("const SCH=["), b = Z.indexOf("];", a); return vm.runInNewContext("(" + Z.slice(a + 10, b + 1) + ")") };

test("門派字＝派名第一個字，十派各一、不重複", () => {
  const G = gch(), S = sch();
  assert.equal(Object.keys(G).length, 10);
  for (const s of S) assert.equal(G[s.id], [...s.nm][0], s.id);
  assert.equal(new Set(Object.values(G)).size, 10);
});

test("掌門對局的外觀帶 gch，紅黑跟掌門執子方一致（黑方四派黑字）", () => {
  assert.match(Z, /gch:ZM_GCH\[m\.sid\],gred:OSC\.mside\(m\)==="r"/);
  const bs = Z.match(/const BSIDE=(\[[^\]]*\])/); assert.ok(bs);
  assert.deepEqual(vm.runInNewContext(bs[1]).sort(), ["opposite_cannon", "palace_horse", "same_cannon", "screen"]);
});

test("bot3d：figure 收 gch／gred，胸前字照指定顏色畫，用完重設", () => {
  const B = rd(path.join(SRC, "bot3d.js"));
  assert.match(B, /if\(typeof o\.gch==="string"&&\[\.\.\.o\.gch\]\.length===1\)\{PCO=o\.gch;PCR=!!o\.gred\}/);
  assert.match(B, /finally\{PCO=null;PCR=null\}/);
  assert.match(B, /const glyTex=\(ch,k,rd\)=>cv\(512,\(g,n\)=>\{const h=n\/2,red=rd!=null\?!!rd:/);
  assert.match(B, /meCh=PC\(\),meRd=PCR,/); assert.match(B, /glyTex\(meCh,meK,meRd\)/);
});

test("ring3d.json 有十位掌門的圓牌位置（數值合理），兩份一致", t => {
  /* 公開副本（source/）沒有 xiangqi-db/art 和 site：改讀倉庫根目錄的 data/tripo_app；glydepth.json 只在 CDN，沒有就不查 */
  let A = path.join(ROOT, "xiangqi-db", "art", "tripo_app"), S = path.join(ROOT, "xiangqi-lab", "site", "data", "tripo_app");
  if (!fs.existsSync(path.join(A, "ring3d.json"))) A = path.join(ROOT, "..", "data", "tripo_app");
  if (!fs.existsSync(path.join(A, "ring3d.json"))) return t.skip("沒有 tripo_app/ring3d.json（公開副本的 run-tests 把 source/ 抄到暫存資料夾，倉庫的 data/ 也不在旁邊）");   /* W57：原本直接 return，會被算成通過 */
  const R = JSON.parse(rd(path.join(A, "ring3d.json")));
  for (const s of Object.keys(gch())) {
    const v = R["n_zm_" + s]; assert.ok(Array.isArray(v) && v.length >= 3, s);
    assert.ok(v[0] > .4 && v[0] < .6 && v[1] > .6 && v[1] < .8 && v[2] > .2 && v[2] < .32, s + " " + v);
  }
  if (fs.existsSync(path.join(S, "ring3d.json"))) assert.equal(rd(path.join(S, "ring3d.json")), rd(path.join(A, "ring3d.json")));
});
test("深度表 glydepth.json 也算過十位掌門（W57：從上一支拆出）", t => {
  let A = path.join(ROOT, "xiangqi-db", "art", "tripo_app");
  if (!fs.existsSync(path.join(A, "glydepth.json"))) A = path.join(ROOT, "..", "data", "tripo_app");
  if (!fs.existsSync(path.join(A, "glydepth.json"))) return t.skip("沒有 tripo_app/glydepth.json（只放 CDN）");
  const D = rd(path.join(A, "glydepth.json"));
  for (const s of Object.keys(gch())) assert.ok(D.includes("zm_" + s), "glydepth 有 " + s);
});
