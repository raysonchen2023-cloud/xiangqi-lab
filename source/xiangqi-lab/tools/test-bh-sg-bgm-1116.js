// 11/16 開發者「找 OpenAI 設計黑洞玩法的 BGM，制作5首歌，除了開頭的黑洞第一站是用原本的 BGM，其他玩家玩到黑洞对战的时候，切到另外5首 BGM」
//   選單：第一站＝新旅程開頭的黑洞序局（照舊）；對戰換新、偏航視窗 bh_1 與結算 bh_5 留舊；照關卡分＋危急切換（至少 35 秒、解除後再等 10 秒）
// 不開瀏覽器：從 m/07bh-blackhole.js 抽出 BH_SG／bhSgBase／bhSgMus，用假的 bgmForce、sessionStorage 實際跑
// 用法：node --test tools/test-bh-sg-bgm-1116.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const BH = rd("xiangqi-db/m/07bh-blackhole.js"), SG2 = rd("xiangqi-db/m/07sg2-siege2.js");
const a = BH.indexOf("const BH_SG="), b = BH.indexOf("function bhMusTick(");
assert.ok(a > 0 && b > a, "07bh 找得到新選曲那段");
const GRP = [{ id: "pro", lv: [31, 32] }, { id: "e", lv: [10, 12] }, { id: "m", lv: [3, 22] }, { id: "h", lv: [13, 14] }];
function kit() {
  const log = { force: [], mus: [] }, ss = {};
  const env = {
    SG2G: { MODE: "gate-siege-v2", GRP },
    bgmForce: f => { if (log.force[log.force.length - 1] !== f) log.force.push(f) },
    bhMus: k => log.mus.push(k), bhChord: () => { }, bhChordOff: () => { },
    sessionStorage: { getItem: k => k in ss ? ss[k] : null, setItem: (k, v) => { ss[k] = String(v) }, removeItem: k => { delete ss[k] } },
    Date: { now: () => 0 }
  };
  const names = Object.keys(env);
  const o = new Function(...names, BH.slice(a, b) + ";return{BH_SG,bhSgMus,bhSgBase}")(...names.map(k => env[k]));
  return Object.assign(o, { log, ss });
}
const st = (lv, o) => Object.assign({ td: { mode: "gate-siege-v2", lv, diff: 1, kmax: 30, s: { b: ["K", "R"], x: [30, 20] } }, check: -1, turn: "r", human: "r" }, o || {});

test("〔行為〕照關卡分：序章與易＝星門微瀾、中＝雲河圍陣、難組或難度「難」＝樞影逼城", () => {
  const K = kit();
  K.bhSgMus(st(31), 1); assert.equal(K.log.force.pop(), "bh_6.mp3");
  K.bhSgMus(st(10), 2); assert.equal(K.log.force.pop(), "bh_6.mp3");
  K.bhSgMus(st(3), 3); assert.equal(K.log.force.pop(), "bh_7.mp3");
  K.bhSgMus(st(13), 4); assert.equal(K.log.force.pop(), "bh_9.mp3");
  const s = st(10); s.td.diff = 3; K.bhSgMus(s, 5); assert.equal(K.log.force.pop(), "bh_9.mp3", "易關選難度「難」也放樞影逼城");
});

test("〔行為〕偏航急襲（sessionStorage bhDrift）：墨潮湧兵與雲河圍陣輪播（同一個陣列，不會每步重設）", () => {
  const K = kit(); K.ss.bhDrift = "1"; K.bhSgMus(st(3), 1); K.bhSgMus(st(3), 2);
  assert.deepEqual(K.log.force, [K.BH_SG.raid]); assert.deepEqual(K.BH_SG.raid, ["bh_8.mp3", "bh_7.mp3"]);
});

test("〔行為〕危急切將星懸命：被將軍或帥的體力不到三成；至少放 35 秒、解除後再等 10 秒才切回", () => {
  const K = kit(), safe = st(3), chk = st(3, { check: 4, turn: "r" }), low = st(3); low.td.s.x[0] = 8;
  K.bhSgMus(safe, 0); assert.equal(K.log.force[K.log.force.length - 1], "bh_7.mp3");
  K.bhSgMus(chk, 1000); assert.equal(K.log.force[K.log.force.length - 1], "bh_10.mp3", "被將軍");
  K.bhSgMus(chk, 20000); K.bhSgMus(safe, 30000); assert.equal(K.log.force[K.log.force.length - 1], "bh_10.mp3", "30 秒解除：還沒滿 35 秒");
  K.bhSgMus(safe, 37000); assert.equal(K.log.force[K.log.force.length - 1], "bh_10.mp3", "滿 35 秒但解除才 7 秒");
  K.bhSgMus(safe, 41000); assert.equal(K.log.force[K.log.force.length - 1], "bh_7.mp3", "切回關卡曲");
  K.bhSgMus(low, 50000); assert.equal(K.log.force[K.log.force.length - 1], "bh_10.mp3", "帥體力 8／30 不到三成");
  const ok = st(3); ok.td.s.x[0] = 12; const K2 = kit(); K2.bhSgMus(ok, 0); assert.equal(K2.log.force[0], "bh_7.mp3", "12／30 不算危急");
});

test("〔行為〕結算放舊的 bh_5（end）；不是星門圍城的局交回原本的規則", () => {
  const K = kit(); assert.equal(K.bhSgMus(st(3, { result: { w: "r" } }), 1), true); assert.deepEqual(K.log.mus, ["end"]);
  assert.equal(K.bhSgMus({ journey: "bh:tang" }, 1), false); assert.equal(K.bhSgMus({ td: { mode: "td" } }, 1), false);
});

test("〔原始碼〕接點：bhMusTick 先跳過序局再問 bhSgMus；偏航視窗 bh_1、序局照舊；偏航記號在 sg2Drift 設、選關出戰清掉", () => {
  assert.ok(BH.includes('function bhMusTick(st){if(st&&st.journey===BHX_ID)return;   /* 序局放第 2 首（開場配樂），不跟著局面切 bh_1～5 */\n  if(bhSgMus(st))return;'));
  assert.ok(BH.includes('const BH_MUS={fall:"bh_1.mp3",wake:"bh_2.mp3",play:"bh_3.mp3",danger:"bh_4.mp3",end:"bh_5.mp3"};'), "舊的 bh_1～5 照舊");
  assert.ok(SG2.includes('function sg2Drift(k,cover){if(!sg2DriftOk())return false;try{sessionStorage.setItem("bhDrift","1")}catch(e){}'));
  assert.ok(SG2.includes('["⚔ 出戰",()=>{try{sessionStorage.removeItem("bhDrift")}catch(e){}const Q=gsvProg();'));
});

/* 第 20 輪評比改善第 2 項：只在 CDN 的資料不在時照實標「略過」，不再靜靜算通過 */
test("配樂檔 bh_6～10 與新曲名都在（配樂只放 CDN）", t => {
  const D = path.join(ROOT, "xiangqi-lab", "site", "data", "bgm", "blackhole"), T = path.join(ROOT, "xiangqi-lab", "site", "data", "bgm", "titles.json");
  if (!fs.existsSync(path.join(D, "bh_1.mp3")) || !fs.existsSync(T)) return t.skip("沒有 data/bgm/blackhole 配樂與新曲名（只放 CDN，公開副本沒有）");
  for (let n = 6; n <= 10; n++) assert.ok(fs.existsSync(path.join(D, "bh_" + n + ".mp3")), "bh_" + n + ".mp3");
  const J = JSON.parse(fs.readFileSync(T, "utf8")); for (const [n, s] of [[6, "星門微瀾"], [7, "雲河圍陣"], [8, "墨潮湧兵"], [9, "樞影逼城"], [10, "將星懸命"]]) assert.equal(J["blackhole/bh_" + n + ".mp3"], s);
});
