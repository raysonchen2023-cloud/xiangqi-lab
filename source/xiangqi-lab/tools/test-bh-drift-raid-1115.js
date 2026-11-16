// 11/15 開發者「星槎啟航會概率遇到黑洞，但已經有觀星臺，這邊要怎麼設計玩法？」→ 選單選：偏航＝突發的星淵急襲短戰。
// m/07bh-blackhole.js：bhDriftRaid、bhOffer 的文案與按鈕、bhStart 的分流；m/07bht-td.js：bhtdRaidDrift。
// 觀星臺照舊開選關；偏航而且急襲已開（破過第 1 關）＝直接開一場急襲；還沒破第 1 關或要先下練習賽＝照舊開選關。
// 用法：node --test xiangqi-lab/tools/test-bh-drift-raid-1115.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m");
const BH = fs.readFileSync(path.join(M, "07bh-blackhole.js"), "utf8"), TD = fs.readFileSync(path.join(M, "07bht-td.js"), "utf8");
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, "找得到 " + a); const j = s.indexOf(b, i); assert.ok(j > i, "找得到結尾 " + b); return s.slice(i, j + b.length) };
const DRIFT = cut(TD, "function bhtdRaidDrift(k,cover){", "}catch(e){return false}}");
/* 11/16 取消隊長、全隊招式：急襲帶的招改由 bhtdPick（bhtdLearned＝全隊已學會的招）決定，一起拿來跑 */
const PICK = cut(TD, "const bhtdLearned=", "return a.length?a:un.slice(0,4).map(s=>s.id)};");
const START = cut(BH, "function bhStart(k,cover){", 'setTimeout(()=>toast("✦ 星樞："+BH_TXT.voice[1]),900)})}');

/* 假的塔防環境：SK 六招（Lv1、1、6、12、17、23），角色 x_swordboy */
const mkDrift = o => { const calls = [];
  const env = { ptyLearned: o.team ? SK => SK.filter(s => o.team.includes(s.id)) : undefined, bhtdProg: () => o.P, bhtdRdOpen: P => !!(P && P.c && P.c[1]), bhtlNeed: o.need == null ? undefined : () => o.need, bhtdChar: () => "x_swordboy", bhtdL: () => o.L || 1,
    BHTD: { stats: ck => ({ ck }), SK: [["a", 1], ["b", 1], ["c", 6], ["d", 12], ["e", 17], ["f", 23]].map(([id, lv]) => ({ id, lv, ch: "x_swordboy" })).concat([{ id: "z", lv: 1, ch: "x_shi" }]) },
    bhtdRaid: (k, cover, pk) => { if (o.boom) throw new Error("x"); calls.push([k, cover, pk]) } };
  const f = new Function(...Object.keys(env), PICK + DRIFT + "return bhtdRaidDrift")(...Object.values(env)); return { f, calls } };

test("〔行為〕急襲還沒開（沒破第 1 關）、或要先下練習賽：不接手，照舊開選關", () => {
  let x = mkDrift({ P: { c: {}, sk: {} } }); assert.equal(x.f("han", true), false); assert.equal(x.calls.length, 0);
  x = mkDrift({ P: { c: { 1: 1 }, sk: {} }, need: true }); assert.equal(x.f("han", true), false); assert.equal(x.calls.length, 0);
  x = mkDrift({ P: null }); assert.equal(x.f("han", true), false);
});

test("〔行為〕急襲已開：直接開一場；招式＝上次選的（還沒解鎖的拿掉；11/16 全隊招式：有隊伍時全隊已學會的都能帶，最多 4 招），沒選過就前四招", () => {
  let x = mkDrift({ P: { c: { 1: 1 }, sk: { x_swordboy: ["b", "f", "z", "a"] } }, L: 6 });
  assert.equal(x.f("tang", true), true); assert.deepEqual(x.calls, [["tang", true, ["b", "a"]]]);
  x = mkDrift({ P: { c: { 1: 1 }, sk: {} }, L: 23, need: false });
  assert.equal(x.f("song", undefined), true); assert.deepEqual(x.calls[0][2], ["a", "b", "c", "d"], "沒選過＝已解鎖的前四招");
  x = mkDrift({ P: { c: { 1: 1 }, sk: { x_swordboy: ["f"] } }, L: 1 });
  x.f("qin", true); assert.deepEqual(x.calls[0][2], ["a", "b"], "存的招都還沒解鎖＝退回前幾招");
  /* 11/16 全隊招式：有隊伍時招式池＝全隊已學會的（別的夥伴的也能帶），存在 P.sk["*"]，比舊的單人那份優先 */
  x = mkDrift({ P: { c: { 1: 1 }, sk: { "*": ["z", "b", "f"], x_swordboy: ["a"] } }, team: ["a", "b", "z"] });
  x.f("han", true); assert.deepEqual(x.calls[0][2], ["z", "b"], "P.sk[\"*\"]：夥伴的招也算、沒學會的拿掉");
  x = mkDrift({ P: { c: { 1: 1 }, sk: {} }, team: ["a", "b", "c", "d", "e", "z"] });
  x.f("han", true); assert.deepEqual(x.calls[0][2], ["a", "b", "c", "d"], "沒選過＝全隊已學會的前四招（一場最多 4 招）");
});

test("〔行為〕開急襲時出錯：回 false，讓偏航退回選關，不會卡住", () => {
  const x = mkDrift({ P: { c: { 1: 1 }, sk: {} }, boom: 1 }); assert.equal(x.f("han", true), false);
});

/* bhStart 的分流 */
const mkStart = o => { const log = [];
  const env = { bhtdLock: () => o.lock || "", toast: t => log.push("toast:" + t), bhMus: () => {}, shipDockCover: k => log.push("dock:" + k), BHTD_ON: o.on !== false,
    bhtdSelect: (k, c) => log.push("select:" + k + ":" + c), bhtdRaidDrift: o.noDrift ? undefined : (k, c) => { log.push("drift:" + k + ":" + c); return !!o.drift },
    bhPreload: () => {}, store: { get: () => 0, set: () => {} }, jStart: () => log.push("jStart"), bhLevel: () => 3, BH_TXT: { voice: ["", ""] }, location: {}, setTimeout: () => {} };
  const f = new Function(...Object.keys(env), START + ";return bhStart")(...Object.values(env)); return { f, log } };

test("〔行為〕偏航（cover 不是 false、有目的站）而且急襲接手：不開選關", () => {
  for (const cv of [true, undefined]) { const x = mkStart({ drift: 1 }); x.f("han", cv); assert.deepEqual(x.log, ["drift:han:" + cv]) }
});

test("〔行為〕偏航但急襲沒接手：照舊開選關", () => {
  const x = mkStart({ drift: 0 }); x.f("han", true); assert.deepEqual(x.log, ["drift:han:true", "select:han:true"]);
});

test("〔行為〕不是偏航（cover＝false，例如開發者測試入口）或沒有目的站：直接開選關，不問急襲", () => {
  let x = mkStart({ drift: 1 }); x.f("han", false); assert.deepEqual(x.log, ["select:han:false"]);
  x = mkStart({ drift: 1 }); x.f("", true); assert.deepEqual(x.log, ["select::true"]);
});

test("〔行為〕定軌力用完：兩邊都不開，星槎照航線停靠；沒有 bhtdRaidDrift 的舊組合照舊開選關", () => {
  let x = mkStart({ drift: 1, lock: "定軌力不足" }); x.f("han", true); assert.deepEqual(x.log, ["toast:🌫 定軌力不足", "dock:han"]);
  x = mkStart({ noDrift: 1 }); x.f("han", true); assert.deepEqual(x.log, ["select:han:true"]);
});

test("〔原始碼〕偏航視窗：急襲已開時說明與按鈕換成急襲、按了直接開打（不再多一張星樞棋局說明）；還沒開的人文案照舊", () => {
  assert.ok(BH.includes('const bhDriftRaid=()=>{if(typeof sg2DriftOk==="function")return sg2DriftOk();try{return typeof bhtdRdOpen==="function"&&typeof bhtdProg==="function"&&typeof bhtdRaidDrift==="function"&&!(typeof bhtlNeed==="function"&&bhtlNeed())&&bhtdRdOpen(bhtdProg())}catch(e){return false}};'));
  assert.ok(BH.includes('function bhOffer(k,next,cover){const n=store.get("bhCount",0)||0,rd=bhDriftRaid();'));
  assert.ok(BH.includes('[[rd?"⚡ 接受急襲":"🌀 接受棋局",()=>rd?bhStart(k,cover):bhIntro(k,cover)],["先回航線",'));
  assert.ok(BH.includes("這是一場星淵急襲，三到五分鐘分勝負，打贏有星塵。要接嗎？不接也不扣任何東西，星槎照原本的航線停靠。"));
  assert.ok(BH.includes("墨色星渦的中心，浮著一張巨大的棋盤。要下這一盤嗎？不下也不扣任何東西，星槎照原本的航線停靠。"), "原本的文案還在");
  assert.ok(BH.includes('<h2>${n||rd?"星槎偏航":esc(BHX_FD.title)}</h2>') && BH.includes('${n?bhSay(BH_TXT.again):rd?"":BHX_FD.desc.map('), "急襲時不放「星樞未醒、棋力低一階、不計積分」那幾句（那是第一次下星樞棋局的說明，急襲有星塵、強度固定）");
  assert.ok(TD.includes("const bhtdRdOpen=P=>!!(P&&P.c&&P.c[1]);"), "急襲還是破第 1 關才開");
});
