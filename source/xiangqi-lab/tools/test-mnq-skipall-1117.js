// 11/17 iMac 模擬器第 1 輪第 14 項（P3）：開場（第一章三段 c1o 河圖初渡、c1m 破局、c1e 古典之印）的「略過」只跳過當前一段，整段要按 3 次略過、2 次出發。
//   查到的流程（07mnq mnqChapter → 07mnf mnfPlay）：c1o 沒有危機題，略過＝任務卡「破局！出發」→ c1o 結束 → c1m 開頭就是破局題（必要，略過也照樣要解）
//   → 解完演殘局儀式 → c1m 接著播完（約 5.5 秒）→ c1e 整段 28 秒照播，要再按略過 → 任務卡「下一步」→ 出發。
//   修法：任何一段按了略過（任務卡按下去）＝整章略過：
//     07mnq mnqChapter：後面的段落沒有危機題就不播（直接記看過）；有危機題的用 jump 播；整章最後出跟看完一樣的「下一步」任務卡（mnqTaskCard）。
//     07mnf mnfPlay：opt.jump＝一開始就跳到危機題那一格；按過略過（jEnd）或 jump 的段落，危機題解完（含儀式）就結束、不再接著播。
//   結果：一次「略過」→ 任務卡「破局！出發」→ 破局題（必要）→ 儀式 → 「下一步」任務卡。
// 不開瀏覽器：vm 載 07mnf／07mnv／07mnq，把 mnfPlay 換成照 opt 行事的假播放器（看完、按略過、jump 都照真的規則回 onDone），驗 mnqChapter 的流程；mnfPlay 本身看原始碼。
// 用法：node --test xiangqi-lab/tools/test-mnq-skipall-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), M = path.join(ROOT, "xiangqi-db", "m"), rd = f => fs.readFileSync(path.join(M, f), "utf8").replace(/\r\n/g, "\n");
const MNF = rd("07mnf-mainfilm.js"), MNV = rd("07mnv-mainvn.js"), MNQ = rd("07mnq-mainquest.js");

/* how：每一段怎麼看——"watch"＝看完；"skip"＝按略過、任務卡按出發 */
function run(how) {
  const mem = { mnq: { gift: { a1: 1, a6: {} } } }, log = { play: [], task: [], go: [], rite: 0, qte: 0 };
  const ctx = { store: { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } },
    esc: s => String(s), localStorage: { getItem: () => null }, console, location: { hash: "#/" }, Promise, setTimeout: f => f() };
  vm.createContext(ctx);
  vm.runInContext(MNF + "\n" + MNV + "\n" + MNQ, ctx);
  const FILMS = vm.runInContext("MNF_FILMS", ctx);
  Object.assign(ctx, { mnfMusic() { }, mnfPre() { }, mnfMusicStop() { }, mnfVol() { }, mnqHomeSync() { }, cjData: () => Promise.resolve({ byId: {} }),
    mnqTaskCard: n => log.task.push(JSON.parse(JSON.stringify(n))), mnqGo: n => log.go.push(n), mnfSolveRite: o => { log.rite++; o.onDone && o.onDone() },
    /* 假播放器：跟真的 mnfPlay 一樣的規則——有危機題的段：jump 時一開始就解、解完 finish(true)；不是 jump 就播到題目、解完接著播完 finish(false)。
       how 是 skip 而且這段沒有危機題（或解完了）：任務卡按「出發」＝finish(true)，res.card＝1 */
    mnfPlay: (id, opt) => { const F = FILMS[id], q = F.shots.find(x => x.qte), mode = how(id);
      log.play.push({ id, jump: !!opt.jump, card: !!opt.card, keep: !!opt.keepMusic });
      const done = res => opt.onDone(res);
      if (q) { log.qte++; opt.onQte(q.qte, { mist: 0, moves: 1 }, () => done(opt.jump ? { skipped: true, qte: {} } : mode === "skip" ? { skipped: true, card: 1, qte: {} } : { skipped: false, qte: {} })); return }
      done(mode === "skip" ? { skipped: true, card: 1, qte: {} } : { skipped: false, qte: {} }) } });
  ctx.mnqChapter("classic");
  const S = JSON.parse(JSON.stringify(ctx.mnqSt()));
  return { log, S };
}

test("〔修〕第一段就按略過：破局題照樣出來（直接從題目開始），解完不再播 c1m 後半、c1e，直接出「下一步」任務卡", () => {
  const { log, S } = run(id => id === "c1o" ? "skip" : "watch");
  assert.deepEqual(log.play.map(x => x.id), ["c1o", "c1m"], "c1e 不播");
  assert.equal(log.play[1].jump, true, "c1m 一開始就到破局題");
  assert.equal(log.qte, 1, "破局題解了（不能跳）"); assert.equal(log.rite, 1, "殘局解開儀式照演");
  assert.equal(log.task.length, 1, "最後一張「下一步」任務卡"); assert.equal(log.go.length, 0);
  assert.ok(S.seg.c1o && S.seg.c1m && S.seg.c1e, "三段都記看過"); assert.ok(S.lamp.classic, "第一章點亮（古典之印）");
  assert.equal(log.play[1].card, false, "jump 的段不再出自己的略過卡");
});

test("〔修〕破局題解完才按略過（在 c1m）：c1e 不播，直接出「下一步」任務卡", () => {
  const { log } = run(id => id === "c1m" ? "skip" : "watch");
  assert.deepEqual(log.play.map(x => x.id), ["c1o", "c1m"]); assert.equal(log.task.length, 1);
});

test("〔照舊〕全部看完：三段都播，最後出「下一步」任務卡；只在最後一段按略過：那一段的任務卡照舊（出發＝mnqGo）", () => {
  let r = run(() => "watch"); assert.deepEqual(r.log.play.map(x => x.id), ["c1o", "c1m", "c1e"]); assert.equal(r.log.task.length, 1);
  assert.deepEqual(r.log.play.map(x => x.jump), [false, false, false]); assert.deepEqual(r.log.play.map(x => x.keep), [true, true, false], "段落之間配樂接續");
  r = run(id => id === "c1e" ? "skip" : "watch"); assert.deepEqual(r.log.play.map(x => x.id), ["c1o", "c1m", "c1e"]); assert.equal(r.log.task.length, 0); assert.equal(r.log.go.length, 1);
});

test("〔原始碼〕mnfPlay：jump 一開始就跳到危機題那一格；按過略過或 jump，危機題解完就結束這一段", () => {
  assert.ok(MNF.includes("let jEnd=!!opt.jump;"));
  assert.ok(MNF.includes('const go=()=>{if(jEnd){finish(true);return}seek(Q.at+.06);resume("qte")}'), "解完：jEnd 就結束");
  assert.ok(MNF.includes('card({t:(MNF_QTE[Q.qte]||{}).big||F.card.t,b:"出發"},()=>{jEnd=true;seek(Q.at);})'), "略過時同一段還有題：先解題、解完就結束");
  assert.ok(MNF.includes("if(opt.jump){const J=F.shots.find(x=>x.qte);if(J)seek(J.at)}"), "jump：從題目那一格開始");
  assert.ok(MNF.includes('<button class="mnf-k" type="button">略過</button>'), "略過鈕照舊");
});
