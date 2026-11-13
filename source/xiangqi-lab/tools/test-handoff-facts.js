// 交接單事實段自動產生＋核對公開連結（xiangqi-db/tools/review_loop/handoff-facts.js）的自動測試，不連網：
//   行為：require 純函式，真的解析 release.json、evidence.md、git log，算本輪發布清單，抽交接單提到的檔名／網址、對公開倉庫路徑、判定，產生事實段；
//         重演第 15 輪事件（交接單寫「threat-model.md 正式站 404」、實際已 200 → 要抓出來）。
//   原始碼：loop.js prompt 出題前跑 handoff-facts.js check、把事實段插進兩份題目、對不上就不出題。
// 評比循環的工具不在公開倉庫：找不到 handoff-facts.js 時整檔跳過（公開副本照樣跑得過）。
// 用法：node --test xiangqi-lab/tools/test-handoff-facts.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const RL = path.join(__dirname, "..", "..", "xiangqi-db", "tools", "review_loop");
if (!fs.existsSync(path.join(RL, "handoff-facts.js"))) { test("評比循環工具不在這個副本，跳過", t => t.skip("沒有 handoff-facts.js")); return }
const H = require(path.join(RL, "handoff-facts.js"));
const LOOP = fs.readFileSync(path.join(RL, "loop.js"), "utf8").replace(/\r\n/g, "\n");

test("release.json：讀出版本、雜湊、檢查時間；不是 JSON 或沒有版本回 null", () => {
  assert.deepEqual(H.parseRelease('{"version":"20261113-0931","checkedAt":"2026-11-13T01:31:13.860Z","html":"e38c4a35ff12","sw":"096d5e192931"}'), { version: "20261113-0931", checkedAt: "2026-11-13T01:31:13.860Z", html: "e38c4a35ff12", sw: "096d5e192931" });
  assert.equal(H.parseRelease("<html>404</html>"), null); assert.equal(H.parseRelease('{"v":1}'), null); assert.equal(H.parseRelease(null), null);
});

test("evidence.md：版本、通過數（千分位）、三類項數、產生時間；不是驗證紀錄回 null", () => {
  const t = "# 驗證紀錄（版本 20261113-0825）\n\n- 產生時間：2026/11/13 08:35:11（臺灣時間）\n- 結果：**1,286／1,286 項通過**，0 項失敗\n\n| 行為 | 1038 項（通過 1038） | x |\n| 混合 | 95 項（通過 95） | y |\n| 原始碼比對 | 153 項（通過 152） | z |\n";
  const e = H.parseEvidence(t);
  assert.equal(e.version, "20261113-0825"); assert.equal(e.pass, 1286); assert.equal(e.total, 1286); assert.match(e.generated, /2026\/11\/13 08:35:11/);
  assert.deepEqual(e.kinds, { 行為: { all: 1038, pass: 1038 }, 混合: { all: 95, pass: 95 }, 原始碼: { all: 153, pass: 152 } });
  assert.equal(H.parseEvidence("# 別的文件"), null);
});

const LOG = "854ff3c\t2026-11-13T09:31:00+08:00\t20261113-0931 iPad 寬版圖\n9c2dbac\t2026-11-13T08:35:00+08:00\t說明文件同步到 20261113-0825：威脅模型\na7d096d\t2026-11-13T08:28:00+08:00\t20261113-0825 修正\nb1b2b3b\t2026-11-13T08:20:00+08:00\t20261113-0820 上一輪\nc1c2c3c\t2026-11-13T07:00:00+08:00\t20261113-0700 更早\n";
test("git log 解析與本輪發布清單：從上一輪線上版之後算（沒有版本號的提交也算）；找不到就列最近幾筆並註明", () => {
  const L = H.parseGitLog(LOG);
  assert.equal(L.length, 5); assert.equal(L[0].version, "20261113-0931"); assert.equal(L[1].version, null); assert.equal(L[1].subject, "說明文件同步到 20261113-0825：威脅模型");
  const r = H.releasesSince(L, "20261113-0820");
  assert.equal(r.found, true); assert.deepEqual(r.list.map(c => c.hash), ["854ff3c", "9c2dbac", "a7d096d"]); assert.match(r.note, /0820 之後 3 筆/);
  const r2 = H.releasesSince(L, "20261101-0000", 2); assert.equal(r2.found, false); assert.equal(r2.list.length, 2); assert.match(r2.note, /找不到/);
  const r3 = H.releasesSince(L, null, 2); assert.equal(r3.list.length, 2); assert.match(r3.note, /沒有上一輪/);
  assert.equal(H.prevVersionFrom("線上版 **20261113-0820**（版本號＝…）"), "20261113-0820"); assert.equal(H.prevVersionFrom("沒寫"), null);
});

test("抽交接單提到的：反引號與一般文字裡的檔名、正式站網址；同一個只列一次、記行號；網址裡的路徑不重複算成檔名；Node.js 不算檔名", () => {
  const ho = "線上版 **20261113-0820**\n- `threat-model.md`（未公開）：資產、攻擊者\n- 工具 xiangqi-lab/tools/qa/evidence-shots.js 拍的；用 Node.js 跑\n- 看 https://raysonchen2023-cloud.github.io/xiangqi-lab/data/docs/a11y.md 。\n- 再提一次 `threat-model.md` 第 3 節\n- 外部 https://developer.apple.com/design/ 參考";
  const M = H.extractMentions(ho), by = t => M.find(m => m.token === t);
  assert.deepEqual(M.map(m => m.token).sort(), ["https://developer.apple.com/design/", "https://raysonchen2023-cloud.github.io/xiangqi-lab/data/docs/a11y.md", "threat-model.md", "xiangqi-lab/tools/qa/evidence-shots.js"].sort());
  assert.deepEqual(by("threat-model.md").lines, [2, 5]); assert.equal(by("threat-model.md").claimNot, true, "第 2 行寫了未公開");
  assert.equal(by("xiangqi-lab/tools/qa/evidence-shots.js").claimNot, false);
  assert.equal(M.filter(m => m.kind === "file" && /a11y/.test(m.token)).length, 0, "網址裡的 a11y.md 不另算檔名");
});

test("「交接單說未公開」的字樣：未公開、404、正式站還沒有、只在開發者電腦；「已公開／正式站可核對」算說公開", () => {
  for (const s of ["（未公開）", "正式站 404", "正式站還沒有", "目前只在開發者電腦上", "還沒同步", "不公開"]) assert.ok(H.NOT_PUB_RE.test(s), s);
  for (const s of ["已公開在 data/docs", "正式站可以核對", "公開倉庫裡有"]) assert.ok(H.PUB_RE.test(s), s);
  assert.ok(!H.NOT_PUB_RE.test("第 4048 項") && !H.NOT_PUB_RE.test("HTTP 200"));
});

const PATHS = ["index.html", "release.json", "manifest.json", "data/docs/threat-model.md", "data/docs/evidence.md", "data/daily-roster.json", "source/xiangqi-lab/tools/verify-daily.js", "source/xiangqi-lab/tools/qa/evidence-shots.js", "source/xiangqi-db/m/07fl-fill.js", "source/xiangqi-lab/src/manifest.json"];
test("對公開倉庫路徑：完整路徑或結尾相同；同名時 data/docs > 根目錄 > 其他 > source/；沒有的 .md 猜 data/docs/；正式站網址直接用；外部網址不檢查", () => {
  const r = (token, kind) => H.resolveMention({ token, kind: kind || "file" }, PATHS);
  assert.equal(r("threat-model.md").path, "data/docs/threat-model.md");
  assert.equal(r("xiangqi-lab/tools/qa/evidence-shots.js").path, "source/xiangqi-lab/tools/qa/evidence-shots.js");
  assert.equal(r("verify-daily.js").url, H.BASE + "source/xiangqi-lab/tools/verify-daily.js");
  assert.equal(r("manifest.json").path, "manifest.json");
  assert.equal(r("m/07fl-fill.js").path, "source/xiangqi-db/m/07fl-fill.js");
  const g = r("overflow-table.md"); assert.equal(g.path, "data/docs/overflow-table.md"); assert.equal(g.guessed, true);
  const n = r("loop.js"); assert.equal(n.path, null); assert.equal(n.url, null);
  const u = r(H.BASE + "data/docs/a11y.md", "url"); assert.equal(u.path, "data/docs/a11y.md"); assert.equal(u.external, false);
  assert.equal(r("https://developer.apple.com/x", "url").external, true);
});

test("判定：200＋說未公開＝❌說法過時；不是 200＋說公開或給正式站網址＝❌；不是 200＋說未公開＝未公開（時間）；沒說＝⚠ 未公開（--strict 算錯）", () => {
  const at = "2026-11-13T02:22:00Z", j = (m, s) => H.judgeMention(Object.assign({ kind: "file", fetchedAt: at, checkedAt: at, url: "u" }, m), s);
  let x = j({ status: 200, claimNot: true }); assert.equal(x.level, "error"); assert.match(x.verdict, /說法過時.*2026-11-13 10:22/);
  assert.equal(j({ status: 200 }).level, "ok");
  x = j({ status: 404, claimPub: true }); assert.equal(x.level, "error"); assert.match(x.verdict, /HTTP 404/);
  x = j({ status: 404, kind: "url" }); assert.equal(x.level, "error");
  x = j({ status: 404, claimNot: true }); assert.equal(x.level, "ok"); assert.match(x.verdict, /^未公開（HTTP 404，2026-11-13 10:22）$/);
  x = j({ status: undefined, url: null }); assert.equal(x.level, "warn"); assert.match(x.verdict, /不在公開倉庫/);
  assert.equal(j({ status: 0 }, true).level, "error", "--strict");
  assert.equal(H.judgeMention({ external: true }).level, "skip");
});

/* 事實資料（跟 handoff-facts.json 同格式） */
function sample(mentions) {
  const at = "2026-11-13T02:22:00Z";
  return { round: 16, generatedAt: at, base: H.BASE, live: { release: { status: 200, fetchedAt: at, parsed: { version: "20261113-0931", checkedAt: at, html: "e38c4a35ff12", sw: "096d5e192931" } }, evidence: { status: 200, fetchedAt: at, parsed: { version: "20261113-0825", pass: 1286, total: 1286, generated: "2026/11/13 08:35:11", kinds: { 行為: { all: 1038, pass: 1038 }, 混合: { all: 95, pass: 95 }, 原始碼: { all: 153, pass: 153 } } } } },
    origin: { head: { hash: "854ff3c", time: at, subject: "20261113-0931 iPad 寬版圖", version: "20261113-0931" }, release: { version: "20261113-0931" } },
    releases: { list: H.parseGitLog(LOG).slice(0, 3), note: "20261113-0820 之後 3 筆" },
    docs: [{ path: "data/docs/threat-model.md", status: 200, fetchedAt: at }, { path: "data/docs/new.md", status: 404, fetchedAt: at }], tools: [{ path: "source/xiangqi-lab/tools/verify-daily.js", status: 200, fetchedAt: at }],
    handoff: { file: "rounds/r16/handoff.md", exists: true }, mentions: mentions || [] };
}
test("重演第 15 輪事件：交接單寫「threat-model.md 正式站 404」，正式站其實 200 → ❌，事實段與題目都寫出來", () => {
  const ho = "線上版 **20261113-0931**\n- 新文件（`threat-model.md`）**正式站還沒有**（`threat-model.md` 正式站 404）\n- 測試 `verify-daily.js` 已公開";
  const at = "2026-11-13T02:22:00Z";
  const M = H.extractMentions(ho).map(m => Object.assign(m, H.resolveMention(m, PATHS), { status: 200, fetchedAt: at, checkedAt: at })).map(m => Object.assign(m, H.judgeMention(m)));
  const F = sample(M);
  assert.deepEqual(H.errorsOf(F).map(m => m.token), ["threat-model.md"]);
  const md = H.factsMd(F);
  assert.match(md, /❌ 說法過時/); assert.match(md, /\*\*20261113-0931\*\*/); assert.match(md, /1286／1286/); assert.match(md, /evidence\.md 的版本（20261113-0825）跟線上 App（20261113-0931）不同/);
  assert.match(md, /data\/docs\/new\.md（404）/); assert.match(md, /\| data\/docs\/threat-model\.md \| 200 \| 2026-11-13 10:22 \|/);
  const s = H.promptSection(F, true);
  assert.ok(s.length < 1500, "ChatGPT 精簡版不能太長：" + s.length); assert.match(s, /❌ 說法與正式站不符：`threat-model\.md`/); assert.match(s, /854ff3c、9c2dbac、a7d096d/);
  const full = H.promptSection(F, false);
  assert.ok(!/\| 檔案 \| 狀態 \| 抓取時間 \|/.test(full) && !/\n\| data\/docs\/new\.md \| 404 \|/.test(full), "題目完整版不放逐檔狀態表（在 handoff-facts.md）");
  assert.match(full, /逐檔狀態碼見 handoff-facts\.md/); assert.match(full, /交接單提到的檔名與網址/);
});

test("交接單還沒寫、公開文件全部 200：事實段照樣產生、不算錯", () => {
  const F = sample(); F.handoff.exists = false; F.docs = F.docs.slice(0, 1);
  assert.equal(H.errorsOf(F).length, 0);
  assert.match(H.factsMd(F), /還沒寫/); assert.match(H.promptSection(F, true), /全部 200/);
});

test("〔原始碼〕loop.js prompt 出題前跑 handoff-facts.js check、事實段插進 Gemini 與 ChatGPT 兩份題目、對不上就不出題（--facts-warn／--no-facts）", () => {
  assert.match(LOOP, /"handoff-facts\.js"\), "check", String\(n\)\]/);
  assert.match(LOOP, /const FX = factsFor\(n\);/);
  assert.match(LOOP, /ho\.trim\(\), FX\.full\.trim\(\), "## 評分表/); assert.match(LOOP, /ho\.trim\(\), FX\.short\.trim\(\), "## 評分表/);
  assert.match(LOOP, /--facts-warn/); assert.match(LOOP, /--no-facts/);
  assert.ok(LOOP.indexOf("const FX = factsFor(n);") < LOOP.indexOf("STAT.saveRoundStart(path.join(R(n), \"policy.json\")"), "要先核對再寫政策快照與題目");
});
