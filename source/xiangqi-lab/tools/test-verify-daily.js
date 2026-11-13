// 評比第 15 輪 X5（評審 P68.2、P02.9、P12.5、P07.7）：每日同題公開名冊 site/data/daily-roster.json 與對照工具 tools/verify-daily.js。
//   ① 名冊檔跟程式（m/07dq-daily.js）重算的一模一樣、題目內容雜湊跟題庫一致；名冊檔就是工具照現在的程式＋題庫產生的（沒過期）
//   ② 竄改都抓得到：改名冊檔某一天、改題庫某題的局面或答案、偷改程式裡的名冊（刪題、改生效日、改第一天）
//   ③ 兩版名冊比對（--diff）：照規矩加新的一批、下架 → 只有生效日以後的日子變；偷改舊的一批、生效日設在已經出過的日子 → 抓出來
//   ④ 用已發布的 index.html（模組內嵌在網頁裡）也能核對；指令列用法與結束代碼
//   ⑤ 說明文件 daily.md 兩份一樣、寫了用法
// 不連網、不開瀏覽器。用法：node --test xiangqi-lab/tools/test-verify-daily.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const V = require("./verify-daily.js");
const LAB = path.join(__dirname, ".."), DATA = path.join(LAB, "site", "data"), MOD = path.join(LAB, "..", "xiangqi-db", "m", "07dq-daily.js");
const TEXT = fs.readFileSync(MOD, "utf8"), BANK = JSON.parse(fs.readFileSync(path.join(DATA, "canju", "canju-set.json"), "utf8"));
const ROSTER_RAW = fs.readFileSync(path.join(DATA, "daily-roster.json"), "utf8"), ROSTER = JSON.parse(ROSTER_RAW);
const SRC = V.loadDQ(TEXT), J = x => JSON.parse(JSON.stringify(x));
/* 改程式裡的名冊：在第 1 批後面加一批、或改 DROP */
const addGen = (t, g) => t.replace(/"\}\],\n(\s*\/\* 下架)/, `"},{from:"${g.from}",sip:"${g.sip || ""}",cup:"${g.cup || ""}",pot:"${g.pot || ""}"}],\n$1`);
const setDrop = (t, list) => t.replace("DROP:[]}", "DROP:" + JSON.stringify(list).replace(/"(id|from)":/g, "$1:") + "}");
const rosterIds = new Set(SRC.X.DQ.GEN.flatMap(g => ["sip", "cup", "pot"].flatMap(s => String(g[s] || "").split(/\s+/).filter(Boolean))));
const spare = BANK.items.filter(x => x.tree && x.n > 0 && !rosterIds.has(x.id)).map(x => x.id).sort();

test("① 名冊檔跟程式重算的每一天一樣、題目內容雜湊跟題庫一致（2026-11-13～2029-12-31）", () => {
  const r = V.verify(SRC, BANK, ROSTER);
  assert.deepEqual(r.bad, []); assert.equal(r.n, 1145); assert.equal(ROSTER.days.length, 1145);
  assert.deepEqual(ROSTER.days[0].slice(0, 4), ["2026-11-13", 1, "cup", "lk216"], "第 1 天＝#1 一盞（跟第 13 輪上線那天一樣）");
  const d = Object.fromEntries(ROSTER.days.map(x => [x[0], x]));
  assert.equal(d["2026-12-31"][1], 49); assert.equal(d["2027-01-01"][1], 50, "跨年號碼接著算");
  assert.equal(d["2028-02-29"][2], "sip", "閏日是星期二、一口");
  for (const x of ROSTER.days) assert.equal(x[3], SRC.X.dqPickId(x[0]), x[0]);
  assert.deepEqual(J(ROSTER.gen), [{ from: "2026-11-13", sip: 123, cup: 140, pot: 112, h: ROSTER.gen[0].h }]);
});

test("① 名冊檔就是工具照現在的程式＋題庫產生的：重產一次一字不差（沒有產生時間之類會變的東西）；LF、沒有控制字元", () => {
  const again = V.stringify(V.build(SRC, BANK, ROSTER.to));
  assert.equal(again, ROSTER_RAW, "名冊檔過期了：程式或題庫改了，要跑 node xiangqi-lab/tools/verify-daily.js --write 重產（git 歷史會留下這次變更）");
  assert.ok(!ROSTER_RAW.includes("\r")); assert.ok(!/[\x00-\x08\x0b-\x1f\x7f]/.test(ROSTER_RAW));
  assert.equal(V.stringify(V.build(SRC, BANK, ROSTER.to)), again, "兩次產生一樣");
});

test("② 竄改名冊檔：改某一天的題號、或只改 days 不改 daysHash，都抓得到", () => {
  const R = J(ROSTER); R.days[30][3] = R.days[31][3];
  const r = V.verify(SRC, BANK, R); assert.ok(!r.ok);
  assert.ok(r.bad.some(b => b.includes(R.days[30][0]) && b.includes("程式算出來是")), r.bad.join("\n"));
  assert.ok(r.bad.some(b => b.includes("daysHash")));
  const R2 = J(ROSTER); R2.days.splice(100, 1); R2.daysHash = V.canon && require("crypto").createHash("sha256").update(V.canon(R2.days)).digest("hex");
  assert.ok(V.verify(SRC, BANK, R2).bad.some(b => b.includes("一天接一天")), "少一天也抓得到");
});

test("② 竄改題庫：某天那題的局面、答案樹被改了，抓得到是哪一天哪一題", () => {
  const day = ROSTER.days[5], id = day[3], items = BANK.items.map(x => x.id === id ? Object.assign({}, x, { fen: x.fen.replace(/^(\d)/, (m, n) => String((+n % 8) + 1)) }) : x);
  const r = V.verify(SRC, { items }, ROSTER); assert.ok(!r.ok);
  assert.ok(r.bad.some(b => b.startsWith(day[0]) && b.includes(id) && b.includes("題面")), r.bad.slice(0, 3).join("\n"));
  const items2 = BANK.items.map(x => x.id === id ? Object.assign({}, x, { tree: { o: {} } }) : x);
  assert.ok(V.verify(SRC, { items: items2 }, ROSTER).bad.some(b => b.includes(id) && b.includes("答案")));
  const items3 = BANK.items.filter(x => x.id !== id);
  assert.ok(V.verify(SRC, { items: items3 }, ROSTER).bad.some(b => b.includes("題庫裡找不到 " + id)), "題庫刪了名冊的題");
  /* 換縮排、鍵的順序：雜湊不變 */
  const x0 = BANK.items.find(x => x.id === id), x1 = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(x0).reverse()), null, 3));
  assert.equal(V.qHash(x1), V.qHash(x0)); assert.equal(V.aHash(x1), V.aHash(x0));
});

test("② 偷改程式裡的名冊：從第 1 批刪一題、改第 1 批生效日、改第一天，都對不上", () => {
  const victim = ROSTER.days[3][3];
  const t1 = TEXT.replace(new RegExp(" " + victim + " "), " ");
  assert.notEqual(t1, TEXT);
  const r1 = V.verify(V.loadDQ(t1), BANK, ROSTER);
  assert.ok(r1.bad.some(b => b.includes("DQ.GEN")), "名冊雜湊不同"); assert.ok(r1.bad.some(b => b.startsWith(ROSTER.days[3][0])), "那天的題變了");
  const r2 = V.verify(V.loadDQ(TEXT.replace('GEN:[{from:"2026-11-13"', 'GEN:[{from:"2026-11-12"')), BANK, ROSTER); assert.ok(r2.bad.some(b => b.includes("第 1 批不同")));
  const r3 = V.verify(V.loadDQ(TEXT.replace('EPOCH:"2026-11-13"', 'EPOCH:"2026-11-14"')), BANK, ROSTER); assert.ok(r3.bad.some(b => b.includes("第一天不一樣")));
});

test("③ 照規矩加新的一批（生效日在未來）：只有那天以後的日子可能變；--diff 列出新的一批、判定合規", () => {
  assert.ok(spare.length >= 6, "題庫裡有還沒進名冊的題");
  const t = addGen(TEXT, { from: "2027-03-01", sip: spare.slice(0, 40).join(" "), cup: spare.slice(40, 80).join(" "), pot: spare.slice(80, 120).join(" ") });
  const S2 = V.loadDQ(t), R2 = V.build(S2, BANK, ROSTER.to), r = V.diff(ROSTER, R2, "2027-02-01");
  assert.ok(r.ok, r.bad.join("\n")); assert.equal(r.effective, "2027-03-01");
  assert.ok(r.changes.some(c => c.includes("新的一批") && c.includes("2027-03-01")));
  assert.ok(r.changedDays > 0, "加了 120 題，之後的日子一定有變");
  for (const n of r.notes.filter(n => /^\d{4}-/.test(n))) assert.ok(n.slice(0, 10) >= "2027-03-01", n);
  assert.deepEqual(V.verify(S2, BANK, R2).bad, [], "新的名冊檔跟新的程式一致");
  const rNear = V.diff(ROSTER, R2, "2027-02-25"); assert.ok(rNear.notes[0].startsWith("⚠"), "離發布不到 7 天要提醒");
});

test("③ 照規矩下架（生效日在未來）：那題從生效日起不再出、之前不變；生效日設在已經出過的日子＝抓出來", () => {
  const day = ROSTER.days.find(d => d[0] >= "2027-02-10" && d[2] === "cup"), id = day[3];
  const S2 = V.loadDQ(setDrop(TEXT, [{ id, from: "2027-02-01" }])), R2 = V.build(S2, BANK, ROSTER.to);
  const r = V.diff(ROSTER, R2, "2027-01-20"); assert.ok(r.ok, r.bad.join("\n"));
  assert.ok(r.changes.some(c => c.includes("下架") && c.includes(id)));
  assert.ok(R2.days.every(d => d[0] < "2027-02-01" || d[3] !== id), "生效日起不再出");
  const d0 = ROSTER.days.filter(d => d[0] < "2027-02-01"), d1 = R2.days.filter(d => d[0] < "2027-02-01"); assert.deepEqual(d1, d0, "之前一天都沒變");
  /* 生效日 2027-02-01、可是 2027-03-01 才發布：2/1～3/1 已經出過的題被換掉 */
  const late = V.diff(ROSTER, R2, "2027-03-01"); assert.ok(!late.ok); assert.ok(late.bad.some(b => b.includes("以前已經出過")), late.bad.join("\n"));
});

test("③ 偷改舊的一批（從第 1 批刪一題）：--diff 抓出「舊的第 1 批被改掉」和過去被換掉的日子", () => {
  const victim = ROSTER.days[3][3], S2 = V.loadDQ(TEXT.replace(new RegExp(" " + victim + " "), " ")), R2 = V.build(S2, BANK, ROSTER.to);
  const r = V.diff(ROSTER, R2, "2026-11-20"); assert.ok(!r.ok);
  assert.ok(r.bad.some(b => b.includes("舊的第 1 批")));
  assert.ok(r.bad.some(b => b.startsWith(ROSTER.days[3][0]) && b.includes("不准變")), r.bad.slice(0, 4).join("\n"));
  const R3 = J(ROSTER); R3.drop = [{ id: "x", from: "2027-01-01" }]; const r3 = V.diff(R3, ROSTER, "2026-12-01"); assert.ok(r3.bad.some(b => b.includes("下架紀錄")), "下架紀錄被拿掉也抓得到");
});

test("④ 用已發布的 index.html（模組內嵌在網頁裡）也能核對；--date、--changes、--diff、結束代碼", () => {
  const html = "<!doctype html><html><body><script>\nconst before=1;\n" + TEXT + "\nfunction after(){}\n</script></body></html>";
  assert.deepEqual(V.verify(V.loadDQ(html), BANK, ROSTER).bad, []);
  assert.throws(() => V.loadDQ("<html>沒有每日同題</html>"), /找不到/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xqvd-"));
  try {
    const run = (...a) => cp.spawnSync(process.execPath, [path.join(__dirname, "verify-daily.js"), ...a], { encoding: "utf8" });
    const ok = run(); assert.equal(ok.status, 0, ok.stdout + ok.stderr); assert.match(ok.stdout, /✔ 名冊檔/);
    const h = path.join(tmp, "index.html"); fs.writeFileSync(h, html);
    assert.equal(run("--src", h).status, 0, "--src 給 index.html");
    const d = run("--date", "2026-11-13"); assert.equal(d.status, 0); assert.match(d.stdout, /#1/); assert.match(d.stdout, /lk216/); assert.match(d.stdout, /✔ 跟名冊檔一樣/);
    assert.match(run("--changes").stdout, /第 1 批：2026-11-13 起，一口 123、一盞 140、一壺 112 題/);
    const bad = J(ROSTER); bad.days[10][3] = "lk001"; const bf = path.join(tmp, "bad.json"); fs.writeFileSync(bf, JSON.stringify(bad));
    const b = run("--roster", bf); assert.equal(b.status, 1); assert.match(b.stdout, /✖/);
    const df = run("--diff", bf, path.join(DATA, "daily-roster.json"), "--as-of", "2026-11-20"); assert.equal(df.status, 1, "舊版裡那天被改過＝不准變");
    const same = run("--diff", path.join(DATA, "daily-roster.json"), "--as-of", "2026-11-20"); assert.equal(same.status, 0); assert.match(same.stdout, /變了的日子 0 天/);
    const out = path.join(tmp, "r.json"); assert.equal(run("--write", "--roster", out).status, 0); assert.equal(fs.readFileSync(out, "utf8"), ROSTER_RAW, "--write 產生的跟倉庫裡的一樣");
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
});

test("〔原始碼〕daily.md：兩份逐字相同、寫了公開名冊檔、對照工具和它的用法", () => {
  const a = fs.readFileSync(path.join(DATA, "docs", "daily.md")), b = fs.readFileSync(path.join(LAB, "..", "xiangqi-db", "art", "docs", "daily.md"));
  assert.ok(a.equals(b)); const s = a.toString("utf8"); assert.ok(!s.includes("\r"));
  for (const k of ["daily-roster.json", "verify-daily.js", "--date", "--diff", "--history", "--changes", "--write", "題面雜湊", "答案雜湊"]) assert.ok(s.includes(k), k);
});
