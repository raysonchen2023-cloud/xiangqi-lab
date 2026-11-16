// 11/17 Windows 測試員 B（候選版 0156）N-3（P3）：一盤切到危急曲〈將星懸命〉（bh_10）後回觀星臺開另一關，新的一盤開場 BGM.force 還是 bh_10，
//   35 秒保留時間到了才切回。修法（07bh bhSgMus）：BH_CR 記下是哪一盤（st.id），換了一盤就清掉，新的一盤從關卡曲開始；同一盤照舊保留 35 秒、解除後再等 10 秒。
// 不開瀏覽器：從 m/07bh-blackhole.js 抽出 BH_SG／bhSgBase／bhSgMus，用假的 bgmForce 實際跑。用法：node --test xiangqi-lab/tools/test-bh-sg-bgm-1117b.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const BH = rd("xiangqi-db/m/07bh-blackhole.js");
const a = BH.indexOf("const BH_SG="), b = BH.indexOf("function bhMusTick(");
assert.ok(a > 0 && b > a, "07bh 找得到選曲那段");
const GRP = [{ id: "pro", lv: [31, 32] }, { id: "e", lv: [10, 12] }, { id: "m", lv: [3, 22] }, { id: "h", lv: [13, 14] }];
function kit() {
  const log = { force: [] };
  const env = { SG2G: { MODE: "gate-siege-v2", GRP }, bgmForce: f => log.force.push(f), bhMus() { }, bhChord() { }, bhChordOff() { }, sessionStorage: { getItem: () => null } };
  const names = Object.keys(env);
  return Object.assign(new Function(...names, BH.slice(a, b) + ";return{bhSgMus}")(...names.map(k => env[k])), { log });
}
const st = (id, lv, o) => Object.assign({ id, td: { mode: "gate-siege-v2", lv, diff: 1, kmax: 30, s: { b: ["K"], h: [30], x: [30] } }, check: -1, turn: "r", human: "r" }, o || {});
const last = K => K.log.force[K.log.force.length - 1];

test("〔N-3〕上一盤切到危急曲、沒放滿 35 秒就開另一盤：新的一盤第一下就是關卡曲", () => {
  const K = kit();
  K.bhSgMus(st("g1", 3), 1); assert.equal(last(K), "bh_7.mp3");
  K.bhSgMus(st("g1", 3, { check: 4 }), 1000); assert.equal(last(K), "bh_10.mp3", "被將軍切危急曲");
  K.bhSgMus(st("g2", 10), 5000); assert.equal(last(K), "bh_6.mp3", "換一盤（序章／易）＝星門微瀾，不留將星懸命");
  K.bhSgMus(st("g2", 10), 6000); assert.equal(last(K), "bh_6.mp3");
});

test("〔照舊〕同一盤裡危急曲至少 35 秒、解除後再等 10 秒", () => {
  const K = kit();
  K.bhSgMus(st("g1", 3, { check: 4 }), 1); K.bhSgMus(st("g1", 3), 20000);   /* now＝0 會被當成沒給、改用 Date.now()，從 1 開始 */ assert.equal(last(K), "bh_10.mp3", "同一盤還沒滿 35 秒");
  K.bhSgMus(st("g1", 3), 30000); assert.equal(last(K), "bh_10.mp3", "解除 10 秒了，但還沒放滿 35 秒");
  K.bhSgMus(st("g1", 3), 36000); assert.equal(last(K), "bh_7.mp3", "滿 35 秒、解除也超過 10 秒才切回");
  assert.ok(BH.includes("if(BH_CR&&BH_CR.id!==st.id)BH_CR=null;"));
});
