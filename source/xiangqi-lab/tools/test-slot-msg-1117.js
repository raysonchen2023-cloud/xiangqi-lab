// 11/17 Windows 測試員 D P3-2（P3）：開新局時跳的「石桌往事還有一盤沒下完」也用在觀星臺、星門的局，
//   例如「『觀星臺・今日異象』下到第 1 回合。石桌往事一次只留一盤……」；另外紅黑各走過一步仍顯示「第 1 回合」。
//   原因：07-legend jStart 的視窗字寫死石桌往事（觀星臺 gxd:、黑洞／星門圍城 bh:、幻譜星門 gx:、古戰場 bt: 都跟石桌往事共用 /play 的 journey 那一格）；
//   回合用 Math.ceil(手數/2)＝「下完幾個回合」，2 手還是 1。對局頁教練（10d）、攔路棋客（07h）、星淵（07bht td.rnd+1）都是「正要下的那一步在第幾回合」。
//   修法：jSlotMsg（照手上那一盤的類型換標題和說明；石桌往事的局字樣照舊）、jRnd（Math.floor(手數/2)+1，黑先多算一手）；
//   07-legend 繼續下卡片、07m4 中斷接續、05b 開頭畫面「▶ 接著下」、03 首頁「⏳ 下到第 N 回合」同一套。
// 不開瀏覽器：vm 跑 07-legend 的 jRnd／jSlotMsg；其他幾處照字面檢查。用法：node --test xiangqi-lab/tools/test-slot-msg-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const LG = rd("xiangqi-db/m/07-legend.js");
const grab = head => { const L = LG.split("\n"), i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n") };
const c = vm.createContext({}); vm.runInContext([grab("const jRnd="), grab("function jSlotMsg(")].join("\n") + ";this.T={jRnd,jSlotMsg};", c);
const { jRnd, jSlotMsg } = c.T;

test("〔回合〕正要下的那一步在第幾回合：0、1 手＝第 1 回合；紅黑各走一步（2 手）＝第 2 回合；黑先多算一手", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 7].map(n => jRnd(n)), [1, 1, 2, 2, 3, 4]);
  assert.deepEqual([0, 1, 2, 3].map(n => jRnd(n, "b")), [1, 2, 2, 3], "黑先：黑 1 手後輪紅，已是第 2 回合");
  assert.equal(jRnd(undefined), 1);
  /* 跟對局頁教練（10d）同一套：第 n+1 步在第幾回合 */
  const coach = (n, side) => side === "r" ? Math.ceil(n / 2) : Math.floor(n / 2) + 1;
  for (let n = 0; n < 12; n++)assert.equal(jRnd(n), coach(n + 1, "r"), "紅先第 " + (n + 1) + " 步");
});

test("〔重現〕手上是「觀星臺・今日異象」（紅黑各一步）：不寫石桌往事、寫第 2 回合", () => {
  const M = jSlotMsg("gxd:omen20261117", 2, "觀星臺・今日異象");
  assert.equal(M.h, "觀星臺還有一盤沒下完");
  assert.equal(M.p, "「觀星臺・今日異象」下到第 2 回合。這一盤跟新的這一局用同一張棋桌，一次只留一盤；開新的，那一盤就不留了。");
  assert.ok(!/石桌往事/.test(M.h + M.p));
});

test("〔各類型〕星門圍城、黑洞、幻譜星門、古戰場都不寫石桌往事；石桌往事自己的局（章回棋路、驛站、園子）字樣照舊", () => {
  const T = (j, nm) => jSlotMsg(j, 5, nm);
  assert.equal(T("bh:gs3", "黑洞・星樞棋局").h, "星門圍城還有一盤沒下完");
  assert.equal(T("bh:gs3h", "x").h, "星門圍城還有一盤沒下完", "困難版");
  assert.equal(T("bh:td2", "x").h, "黑洞還有一盤沒下完"); assert.equal(T("bh:xu", "x").h, "黑洞還有一盤沒下完");
  assert.equal(T("gx:3", "幻譜星門・x").h, "幻譜星門還有一盤沒下完"); assert.equal(T("bt:1", "古戰場・x").h, "古戰場還有一盤沒下完");
  assert.equal(T("gxd:free", "觀星臺・自由擺陣").h, "觀星臺還有一盤沒下完");
  for (const j of ["bh:gs3", "bh:td2", "gx:3", "bt:1", "gxd:free"]) assert.ok(!/石桌往事/.test(T(j, "x").h + T(j, "x").p), j);
  for (const j of ["r1s2", "inn:laoqiao", "park", "char:x"]) {
    const M = T(j, "章回棋路・某關");
    assert.equal(M.h, "石桌往事還有一盤沒下完", j); assert.equal(M.em, "🪨");
    assert.equal(M.p, "「章回棋路・某關」下到第 3 回合。石桌往事一次只留一盤，開新的，那一盤就不留了。");
  }
  for (const j of ["gxd:x", "bh:gs1", "r1"]) assert.ok(!/上限/.test(T(j, "x").h + T(j, "x").p));
});

test("〔接線〕jStart 用 jSlotMsg、按鈕照舊；其他「下到第 N 回合」改成同一套", () => {
  assert.ok(LG.includes('{const M=jSlotMsg(g.journey,g.n,jName(g.journey));modal(`<div class="em">${M.em}</div><h2>${esc(M.h)}</h2><p class="muted">${esc(M.p)}</p>`,'));
  assert.ok(LG.includes('[["⏳ 繼續那一盤",()=>{location.hash="#/journey/play"}],["放棄，開新的",fresh],["取消",null,true]])}}'));
  assert.ok(!LG.includes("<h2>石桌往事還有一盤沒下完</h2>"), "標題不再寫死");
  assert.ok(LG.includes("下到第 ${jRnd(g.n)} 回合・"), "07-legend 繼續下卡片");
  assert.ok(rd("xiangqi-db/m/07m4-resume.js").includes('下到第 ${Math.floor((n+(st0==="b"?1:0))/2)+1} 回合・'), "07m4 中斷接續");
  assert.ok(rd("xiangqi-db/m/03-home-quiz.js").includes("下到第 ${Math.floor(g.n/2)+1} 回合・"), "03 首頁");
  assert.ok(rd("xiangqi-db/m/05b-save.js").includes('n=Math.floor(((g.moves||[]).length+(g.startTurn==="b"?1:0))/2)+1;'), "05b 開頭畫面");
  for (const f of ["07-legend.js", "07m4-resume.js", "03-home-quiz.js", "05b-save.js"]) assert.ok(!/下到第 \$\{Math\.ceil/.test(rd("xiangqi-db/m/" + f)), f + " 沒有舊算法");
});
