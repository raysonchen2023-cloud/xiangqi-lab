// 三個 P0 發布版完整流程回歸（tools/qa/p0-regress.js）的自動測試，不開瀏覽器：
//   行為：require 腳本匯出的純函式，真的跑清單、程序清單判斷（同一時間只能一個無頭瀏覽器）、挑章回殘局關、玩家選步、三項的判斷、git ls-tree 解析、報告與結束碼。
//   原始碼：腳本只開一個瀏覽器、開之前先等別的無頭瀏覽器、每個分頁都設測試房 xq_test、分頁／瀏覽器／伺服器都在 finally 關、有失敗結束碼 1。
// 用法：node --test xiangqi-lab/tools/test-p0-regress.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const P = require("./qa/p0-regress.js");
const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(__dirname, "qa", "p0-regress.js"), "utf8").replace(/\r\n/g, "\n");

test("清單：三個 P0（章回殘局回著、看我的棋力、冷開每日同題），修法檔案都在", () => {
  assert.deepEqual(P.ITEMS.map(i => i.id), ["journey", "stats", "daily"]);
  assert.deepEqual(P.ITEMS.map(i => i.no), [1, 2, 3]);
  assert.deepEqual(P.ITEMS.map(i => i.fix), ["xiangqi-lab/src/local.js", "xiangqi-db/m/08b-cpugame.js", "xiangqi-db/m/02-shell.js"]);
  for (const it of P.ITEMS) { assert.ok(it.name && it.fn && it.how, it.id); assert.ok(fs.existsSync(path.join(ROOT, it.fix)), it.fix + " 不在") }
  assert.match(P.DISCLAIMER, /不是實機/);
});

test("程序清單：PowerShell「pid<Tab>指令」與 ps「  pid 指令」兩種格式都讀得懂，空行略過", () => {
  const L = P.parseProcList("123\t\"C:\\node.exe\" a.js\r\n\r\n  456 node /x/b.js --y\nabc\n789\t");
  assert.deepEqual(L, [{ pid: 123, cmd: "\"C:\\node.exe\" a.js" }, { pid: 456, cmd: "node /x/b.js --y" }]);
});

test("同一時間只能一個無頭瀏覽器：device-fit／evidence-shots／p0-regress 在跑就算忙；自己、父程序、test-p0-regress.js 不算", () => {
  const L = [
    { pid: 1, cmd: "node xiangqi-lab/tools/qa/device-fit.js --local --port 8871" },
    { pid: 2, cmd: "\"C:\\Program Files\\nodejs\\node.exe\" C:\\x\\qa\\evidence-shots.js --only en" },
    { pid: 3, cmd: "node xiangqi-lab/tools/qa/p0-regress.js --local" },
    { pid: 4, cmd: "node --test test-p0-regress.js" },
    { pid: 5, cmd: "node tools/watch-feedback.js" },
    { pid: 6, cmd: "node xiangqi-lab/tools/qa/p0-regress.js --git" },
    { pid: 7, cmd: "node qa_monkey.js" },
  ];
  assert.deepEqual(P.busyProcs(L, [6, 99]).map(p => p.pid), [1, 2, 3, 7]);
  assert.deepEqual(P.busyProcs([{ pid: 9, cmd: "node device-fit.json.js" }, { pid: 10, cmd: "node my-device-fit.js" }], []).map(p => p.pid), []);
  assert.deepEqual(P.busyProcs([], [1]), []);
});

test("挑章回殘局關：只挑有指定局面的 play 步驟、跳過選項關與帶前置步的；優先電腦先走；journey＝h＋兩位數回數；等級夾在 1～8", () => {
  const L = { chapters: [
    { n: 1, title: "甲", game: { steps: [{ t: "guess", start: { fen: "x", turn: "r" } }, { t: "play", human: "r", ai: 1, start: { fen: "", turn: "r" } }] } },
    { n: 2, title: "乙", game: { steps: [{ t: "play", human: "r", ai: 12, start: { fen: "4k4/9/9/9/9/9/9/9/9/4K4", turn: "r" } }] } },
    { n: 3, title: "丙", game: { steps: [{ t: "play", human: "r", offer: [{}], start: { fen: "4k4/9/9/9/9/9/9/9/9/4K4", turn: "b" } }] } },
    { n: 4, title: "丁", game: { steps: [{ t: "play", human: "r", start: { fen: "4k4/9/9/9/9/9/9/9/9/4K4", turn: "b", moves: ["e9e8"] } }] } },
    { n: 5, title: "戊", game: { steps: [{ t: "talk" }, { t: "play", human: "b", ai: 0, noPerpetual: true, remove: ["a0"], goal: "survive", limit: 30, start: { fen: "4k4/9/9/9/9/9/9/9/9/4K4", turn: "r" } }] } },
  ] };
  const c = P.pickChapter(L);
  assert.equal(c.journey, "h05"); assert.equal(c.step, 1); assert.equal(c.human, "b"); assert.equal(c.cpuFirst, true);
  assert.equal(c.level, 3, "ai 0 → 預設 3"); assert.deepEqual(c.lv, { fen: "4k4/9/9/9/9/9/9/9/9/4K4", turn: "r", remove: ["a0"], noPerpetual: true });
  assert.equal(c.goal, "survive"); assert.equal(c.limit, 30);
  const only2 = P.pickChapter({ chapters: [L.chapters[1]] });
  assert.equal(only2.journey, "h02"); assert.equal(only2.cpuFirst, false); assert.equal(only2.level, 8);
  assert.equal(P.pickChapter({ chapters: [] }), null); assert.equal(P.pickChapter(null), null);
});

test("挑章回殘局關：真的 park-legend.json 挑得到電腦先走的殘局關（有這個檔才測）", t => {
  const f = path.join(ROOT, "xiangqi-lab", "site", "data", "park-legend.json");
  if (!fs.existsSync(f)) return t.skip("沒有 park-legend.json");
  const c = P.pickChapter(JSON.parse(fs.readFileSync(f, "utf8")));
  assert.ok(c && c.cpuFirst, "要有電腦先走的殘局關"); assert.match(c.journey, /^h\d{2}$/);
  assert.notEqual(c.lv.fen.split(" ")[0], "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR", "要是殘局不是標準開局");
});

test("玩家選步：照 [from,to] 排序取第一個，每次一樣；沒有合法著法回 null", () => {
  assert.deepEqual(P.pickHumanMove([[70, 67], [64, 55], [70, 61], [64, 54]]), [64, 54]);
  assert.deepEqual(P.pickHumanMove([[3, 4]]), [3, 4]);
  assert.equal(P.pickHumanMove([]), null); assert.equal(P.pickHumanMove(null), null);
});

const ch = { n: 1, title: "第一回", step: 1, lv: { fen: "2cRka3/9/9/9/9/9/9/9/9/4K4", turn: "b" } };
test("① 章回殘局判斷：電腦回 2 著、沒逾時、沒有不合法 → 全過；任一條不符就失敗", () => {
  const ok = { chapter: ch, created: true, startSet: "2cRka3/9", cpuMoves: 3, humanMoves: 2, result: null, illegal: [], lastMsg: "", timeouts: [] };
  assert.ok(P.judgeJourney(ok).every(c => c.ok));
  const fail = (patch, name) => { const c = P.judgeJourney(Object.assign({}, ok, patch)); assert.ok(c.some(x => !x.ok && x.name.includes(name)), JSON.stringify(patch)) };
  fail({ startSet: "" }, "殘局關");
  fail({ cpuMoves: 1 }, "至少回 2 著");
  fail({ timeouts: ["第 2 次輪到電腦，40 秒沒回"] }, "時限內");
  fail({ illegal: ["控制台：[engine] 引擎給出不合法著法 g3g4"] }, "不合法");
  fail({ lastMsg: "⏳ 電腦棋手一時沒想好，幾秒後會自動再想一次" }, "一時沒想好");
  assert.ok(P.judgeJourney(Object.assign({}, ok, { cpuMoves: 1, result: "紅方將死" })).every(c => c.ok), "電腦 1 著就分出勝負也算");
  assert.ok(P.judgeJourney({}).some(c => !c.ok), "什麼都沒量到要失敗");
});

test("② 看我的棋力判斷：到 #/stats、視窗關、捲回頂、畫面是棋力頁 → 全過", () => {
  const ok = { found: true, tapped: true, hash: "#/stats", modalLeft: false, scrollTop: 0, scrollY: 0, topText: "我的戰績", viewText: "開局 中局 殘局 殺法 穩定 線上段位 新手" };
  assert.ok(P.judgeStats(ok).every(c => c.ok));
  assert.ok(P.judgeStats(Object.assign({}, ok, { topText: "" })).every(c => c.ok), "標題沒抓到時，雷達五項也認得");
  for (const [patch, name] of [[{ found: false }, "看我的棋力"], [{ tapped: false }, "#/stats"], [{ hash: "#/cpu" }, "#/stats"], [{ modalLeft: true }, "已關掉"], [{ scrollTop: 640 }, "捲回頂"], [{ topText: "挑戰電腦", viewText: "第 1 級 初出茅廬" }, "我的棋力"]]) {
    assert.ok(P.judgeStats(Object.assign({}, ok, patch)).some(c => !c.ok && c.name.includes(name)), JSON.stringify(patch));
  }
});

test("③ 冷開每日同題判斷：沒有頁面錯誤、沒有修復畫面、網址還在、頁面有畫出來 → 全過", () => {
  const ok = { date: "2026-11-13", hash: "#/daily/2026-11-13", pageErrors: [], fixShown: false, viewChildren: 2, viewText: "題目準備中", topText: "🌏 每日同題", hasBoard: true };
  assert.ok(P.judgeDaily(ok).every(c => c.ok));
  for (const [patch, name] of [[{ pageErrors: ["ReferenceError: Cannot access 'DQ' before initialization"] }, "頁面錯誤"], [{ fixShown: true }, "修復畫面"], [{ hash: "#/" }, "分享連結"], [{ viewChildren: 0 }, "畫出來"], [{ topText: "", viewText: "首頁", hasBoard: false }, "畫出來"]]) {
    assert.ok(P.judgeDaily(Object.assign({}, ok, patch)).some(c => !c.ok && c.name.includes(name)), JSON.stringify(patch));
  }
});

test("git ls-tree 解析：路徑對 blob 雜湊、引號路徑還原、不是 blob 的略過", () => {
  const sha = "a".repeat(40), sha2 = "b".repeat(40);
  const m = P.parseLsTree(`100644 blob ${sha}\tindex.html\n040000 tree ${sha2}\tdata\n100644 blob ${sha2}\t"data/docs/evidence/\\346\\226\\260.png"\n`);
  assert.equal(m.get("index.html"), sha); assert.equal(m.size, 2); assert.equal(m.get("data/docs/evidence/新.png"), sha2);
  assert.equal(P.unquoteGit("\"a\\\\b\\\"c\""), "a\\b\"c"); assert.equal(P.unquoteGit("plain/路徑.md"), "plain/路徑.md");
});

test("報告與結束碼：全部通過 0；任一項失敗或沒跑 1；markdown 列出版本、每項檢查、控制台錯誤、截圖", () => {
  const it = (no, pass, extra) => Object.assign({ no, id: P.ITEMS[no - 1].id, name: P.ITEMS[no - 1].name, fix: P.ITEMS[no - 1].fix, fn: "f", how: "h", pass, checks: [{ name: "檢查一", ok: pass, detail: "a|b" }], build: "local-202611131200", url: "http://127.0.0.1:8843/xiangqi-lab/#/", consoleErrors: pass ? [] : ["[error] boom"], pageErrors: [], shots: ["P" + no + ".png"], notes: [], ms: 12000 }, extra);
  const R = { mode: "local", modeName: "本機組版", url: "http://127.0.0.1:8843/xiangqi-lab/", build: "local-202611131200", browser: "Chrome 1（headless）", startedAt: "2026-11-13T04:00:00Z", finishedAt: "2026-11-13T04:03:00Z", command: "node p0-regress.js --local", waited: [], items: [it(1, true), it(2, true), it(3, true)], errors: [] };
  assert.equal(P.exitCode(R), 0);
  const md = P.toMd(R);
  assert.match(md, /3／3 項通過/); assert.match(md, /local-202611131200/); assert.match(md, /shots\/P2\.png/); assert.match(md, /a／b/, "表格裡的 | 要換掉");
  const R2 = Object.assign({}, R, { items: [it(1, true), it(2, false), it(3, false, { skipped: true })] });
  assert.equal(P.exitCode(R2), 1);
  const md2 = P.toMd(R2); assert.match(md2, /❌ 失敗/); assert.match(md2, /⏸ 沒跑/); assert.match(md2, /\[error\] boom/);
  assert.equal(P.exitCode({ items: [] }), 1, "一項都沒有也算失敗"); assert.equal(P.exitCode(null), 1);
});

test("時間：twDate 用臺灣日期（UTC 16:30 已是隔天）、twTime 標臺灣", () => {
  assert.equal(P.twDate(Date.parse("2026-11-12T16:30:00Z")), "2026-11-13");
  assert.equal(P.twDate(Date.parse("2026-11-12T15:59:00Z")), "2026-11-12");
  assert.match(P.twTime("2026-11-13T01:02:03Z"), /^2026-11-13 09:02:03（臺灣）$/);
});

test("〔原始碼〕只開一個瀏覽器、開之前先等別的無頭瀏覽器、每個分頁設測試房、finally 一定關、有失敗結束碼 1、檔名不是 test- 開頭", () => {
  assert.equal((SRC.match(/chromium\.launch\(/g) || []).length, 1, "只能 launch 一次");
  assert.ok(SRC.indexOf("await waitIdle(R)") > 0 && SRC.indexOf("await waitIdle(R)") < SRC.indexOf("chromium.launch("), "要先等別的無頭瀏覽器再開");
  assert.match(SRC, /localStorage\.setItem\("xq_netRoot", JSON\.stringify\("xq_test"\)\)/);
  assert.equal((SRC.match(/browser\.newContext\(/g) || []).length, 1, "分頁都從 newCtx 開（都會設測試房）");
  assert.ok((SRC.match(/finally \{ await ctx\.close\(\)/g) || []).length >= 3, "三項的分頁都要在 finally 關");
  assert.match(SRC, /finally \{\n\s+if \(browser\) await browser\.close\(\)/);
  assert.match(SRC, /srv\.close\(/);
  assert.match(SRC, /process\.exitCode = exitCode\(R\)/);
  assert.ok(!fs.existsSync(path.join(__dirname, "qa", "test-p0-regress.js")));
});
