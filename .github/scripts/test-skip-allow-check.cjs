// check-skip-allow.cjs 的自我測試（W69 流程盤點高 7）：用假的白名單、假的倉庫檔案清單跑判斷；再開一個暫存 git 倉庫跑命令列。
// 用法：node --test .github/scripts/test-skip-allow-check.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const { judge, fileOf, tally, norm } = require("./check-skip-allow.cjs");
const CHECK = path.join(__dirname, "check-skip-allow.cjs");

const E1 = "test-a.js：英文字典都有（沒有 xiangqi-db/i18n-en.json（只放 CDN））", E2 = "test-a.js：第二項（沒有 xiangqi-db/i18n-en.json（只放 CDN））", E3 = "test-b.js：上架文案（沒有 xiangqi-ios/appstore）";
const SRC = { "test-a.js": 'const p = "xiangqi-db/i18n-en.json";', "test-b.js": 'rd("xiangqi-ios/appstore/metadata.md")' };
const REPO = new Set(["source/xiangqi-ios/capacitor.config.json", "data/gmbios.json"]);
const base = (o) => judge(Object.assign({ allow: [E1, E2, E3], missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["source/xiangqi-ios/appstore"] }, baseAllow: [E1, E2, E3], baseHas: (f) => f in SRC, top: new Set(["source", "data", ".github"]),
  tracked: (p) => REPO.has(p) || [...REPO].some((f) => f.startsWith(p + "/")), onDisk: () => false, src: (f) => SRC[f] ?? null }, o));

test("每一條都寫了缺的檔、倉庫裡真的沒有、檔名出現在測試裡 → 通過", () => {
  const r = base({}); assert.deepEqual(r.bad, []); assert.deepEqual(r.grew, []); assert.equal(r.ok, true);
});

test("① 沒寫 missing、空陣列、不是陣列、空字串、不是字串 → 不成立", () => {
  for (const [m, why] of [[undefined, /沒寫缺哪個檔.*test-b\.js/], [[], /沒寫缺哪個檔.*test-b\.js/], ["x", /沒寫缺哪個檔.*test-b\.js/], [[""], /路徑是空的.*test-b\.js/], [[" "], /路徑是空的.*test-b\.js/], [[1], /不是字串.*test-b\.js/]]) {
    const missing = { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"] }; if (m !== undefined) missing[E3] = m;
    const r = base({ missing }); assert.equal(r.ok, false, JSON.stringify(m)); assert.match(r.bad.join("\n"), why, JSON.stringify(m));
  }
});

test("① 說缺的檔其實在倉庫裡（被追蹤，或是資料夾底下有檔，或是磁碟上有）→ 不成立", () => {
  const S2 = Object.assign({}, SRC, { "test-c.js": 'rd("xiangqi-lab/site/data/gmbios.json"); rd("xiangqi-ios/capacitor.config.json")' });
  const E4 = "test-c.js：小傳（沒有 data/gmbios.json）";
  let r = base({ allow: [E1, E2, E4], baseAllow: [E1, E2, E4], missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E4]: ["data/gmbios.json"] }, src: (f) => S2[f] ?? null });
  assert.match(r.bad.join("\n"), /說缺 data\/gmbios\.json，可是倉庫裡有/);
  r = base({ allow: [E1, E2, E4], baseAllow: [E1, E2, E4], missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E4]: ["source/xiangqi-ios"] }, src: (f) => S2[f] ?? null });
  assert.match(r.bad.join("\n"), /說缺 source\/xiangqi-ios，可是倉庫裡有/, "資料夾底下有被追蹤的檔，也算有");
  r = base({ onDisk: (p) => p === "source/xiangqi-ios/appstore" });
  assert.match(r.bad.join("\n"), /說缺 source\/xiangqi-ios\/appstore，可是倉庫裡有/, "磁碟上有也算");
});

test("① 缺檔的檔名沒出現在測試原始碼裡、路徑寫成絕對路徑或有 ..、找不到測試檔 → 不成立", () => {
  let r = base({ missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["source/xiangqi-ios/隨便寫的.md"] } });
  assert.match(r.bad.join("\n"), /檔名「隨便寫的\.md」沒出現在 test-b\.js 裡/);
  r = base({ missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["source/xiangqi-ios/appstore/metadata.webp"] } });
  assert.deepEqual(r.bad, [], "主檔名 metadata 有出現（測試用程式拼副檔名）也算");
  r = base({ missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["source/xiangqi-ios/rd.md"] } });
  assert.match(r.bad.join("\n"), /檔名「rd\.md」沒出現/, "主檔名太短（rd）不算");
  for (const [p, why] of [["/etc/passwd", /絕對路徑/], ["C:/x/appstore", /絕對路徑/], ["source/../appstore", /不能有 \. 或 \.\./], ["source/./appstore", /不能有 \. 或 \.\./], ["/", /絕對路徑/], ["//", /絕對路徑/], ["", /路徑是空的/], ["\\", /絕對路徑/]]) {
    r = base({ missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E3]: [p] } });
    assert.equal(r.ok, false, JSON.stringify(p)); assert.match(r.bad.join("\n"), why, JSON.stringify(p));
  }
  /* #62 審查（Windows Claude 2）：路徑第一段要是倉庫真的有的頂層資料夾；倉庫外的檔寫 relD/x 這種假路徑，「倉庫裡沒有」永遠成立 */
  r = base({ missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["relD/appstore"] } });
  assert.match(r.bad.join("\n"), /第一段「relD」不是倉庫裡的頂層資料夾/);
  assert.deepEqual(norm("source//xiangqi-ios/appstore/"), { q: "source/xiangqi-ios/appstore" }, "多餘的斜線收掉");
  r = base({ src: (f) => (f === "test-b.js" ? null : SRC[f]) });
  assert.match(r.bad.join("\n"), /找不到測試檔 test-b\.js/);
});

test("② missing、outside 有、白名單沒有的舊條目 → 不成立", () => {
  let r = base({ missing: { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["source/xiangqi-ios/appstore"], "test-z.js：舊的": ["x"] } });
  assert.match(r.bad.join("\n"), /missing 有、白名單沒有.*test-z\.js：舊的/);
  r = base({ outside: { "test-z.js：舊的": ["暫存區/x"] } });
  assert.match(r.bad.join("\n"), /outside 有、白名單沒有.*test-z\.js：舊的/);
});

test("outside：倉庫外的檔照實寫；第一段是倉庫的資料夾要改寫進 missing；空路徑、檔名沒出現在測試 → 不成立；只有 outside 也算有寫", () => {
  const M2 = { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"] };
  let r = base({ missing: M2, outside: { [E3]: ["開發者電腦的暫存區/relD/appstore"] } });
  assert.deepEqual(r.bad, [], "只有 outside、而且檔名出現在測試裡，算有寫");
  r = base({ missing: M2, outside: { [E3]: ["source/xiangqi-ios/appstore"] } });
  assert.match(r.bad.join("\n"), /第一段「source」是倉庫裡的資料夾，要寫進 missing/);
  r = base({ missing: M2, outside: { [E3]: ["/"] } });
  assert.match(r.bad.join("\n"), /outside 的 "\/"：要寫相對路徑/);
  r = base({ missing: M2, outside: { [E3]: ["暫存區/隨便寫的.md"] } });
  assert.match(r.bad.join("\n"), /倉庫外的 暫存區\/隨便寫的\.md 檔名「隨便寫的\.md」沒出現/);
  r = base({ missing: M2, outside: { [E3]: [] } });
  assert.match(r.bad.join("\n"), /沒寫缺哪個檔（missing 或 outside）/, "兩邊都空");
});

test("列出這次新增、刪掉的條目（給審查者逐條看）", () => {
  const r = base({ baseAllow: [E1, E2, "test-a.js：舊的那一條（舊原因）"] });
  assert.deepEqual(r.added, [E3]); assert.deepEqual(r.removed, ["test-a.js：舊的那一條（舊原因）"]);
});

test("③ 只能減不能增：總數變多、新的測試檔有略過 → 不成立；既有的檔改寫原因、拆成明列的略過（總數沒變多）、減少都可以", () => {
  let r = base({ baseAllow: [E1, E3] });
  assert.ok(r.grew.some((x) => /總數 2 → 3/.test(x)), r.grew.join("；"));
  assert.equal(r.ok, false);
  r = base({ baseAllow: [E1, E2, "test-z.js：別的（原因）"], baseHas: (f) => f === "test-a.js" });
  assert.ok(r.grew.some((x) => /test-b\.js：基準還沒有這支檔/.test(x)), "新的檔不能靠略過：" + r.grew.join("；"));
  assert.equal(r.ok, false);
  r = base({ baseAllow: [E1, "test-a.js：拆開前的那一項（舊原因）", "test-z.js：別處那一條（舊原因）"] });
  assert.deepEqual(r.grew, [], "既有的檔：test-b 原本 0 條、現在 1 條，但總數沒變多");
  r = judge({ allow: [E1], missing: { [E1]: ["source/xiangqi-db/i18n-en.json"] }, baseAllow: [E1, E2, E3], baseHas: () => true, top: new Set(["source"]), tracked: () => false, onDisk: () => false, src: (f) => SRC[f] });
  assert.equal(r.ok, true, "減少一定可以");
});

test("檔名解析、逐檔計數", () => {
  assert.equal(fileOf("test-x-1117.js：某項（原因）"), "test-x-1117.js"); assert.equal(fileOf("沒有檔名"), null);
  assert.deepEqual(tally([E1, E2, E3]), { "test-a.js": 2, "test-b.js": 1 });
});

test("命令列：暫存 git 倉庫裡跑；都對 0、條目不成立 1、變多 1、讀不到基準 2、沒給 --base 2", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-skipallow-"));
  try {
    const git = (...a) => cp.execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "core.autocrlf=false", ...a], { cwd: d });
    const put = (f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s) };
    const W = (allow, missing) => put(".github/test-skip-allow.json", JSON.stringify({ note: "x", allow, missing }, null, 1) + "\n");
    git("init", "-q");
    put("source/xiangqi-lab/tools/test-a.js", SRC["test-a.js"] + "\n"); put("source/xiangqi-lab/tools/test-b.js", SRC["test-b.js"] + "\n"); put("source/xiangqi-ios/capacitor.config.json", "{}\n");
    W([E1, E3], { [E1]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["source/xiangqi-ios/appstore"] });
    git("add", "-A"); git("commit", "-q", "-m", "base"); git("branch", "-q", "base");
    const run = (...a) => cp.spawnSync(process.execPath, [CHECK, ...a], { cwd: d, encoding: "utf8" });
    let r = run("--base", "base"); assert.equal(r.status, 0, r.stdout + r.stderr);
    W([E1, E3], { [E1]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["source/xiangqi-ios"] });
    r = run("--base", "base"); assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stderr, /可是倉庫裡有/);
    W([E1, E2, E3], { [E1]: ["source/xiangqi-db/i18n-en.json"], [E2]: ["source/xiangqi-db/i18n-en.json"], [E3]: ["source/xiangqi-ios/appstore"] });
    r = run("--base", "base"); assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stderr, /只能減、不能增/);
    r = run("--base", "沒有這個分支"); assert.equal(r.status, 2, r.stdout + r.stderr);
    r = run(); assert.equal(r.status, 2);
    put(".github/test-skip-allow.json", "{壞掉"); r = run("--base", "base"); assert.equal(r.status, 2);
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("〔原始碼〕verify.yml 兩種模式都跑這支，基準用環境變數傳；基準版守門兩組都跑", () => {
  const Y = fs.readFileSync(path.join(__dirname, "..", "workflows", "verify.yml"), "utf8");
  const i = Y.indexOf("check-skip-allow.cjs --base"), step = Y.slice(Y.lastIndexOf("- name:", i), Y.indexOf("\n      - name:", i));
  assert.ok(i > 0, "verify.yml 要跑 check-skip-allow.cjs");
  assert.doesNotMatch(step, /\n\s+if:/, "兩種模式都跑，不能用 if 跳過");
  assert.match(step, /--base "origin\/\$BASE_REF"/); assert.doesNotMatch(step, /\$\{\{/, "不直接嵌入欄位"); assert.match(Y, /\n      BASE_REF: \$\{\{ github\.base_ref/, "分支名走 job 的環境變數");
  assert.match(Y, /node --test [^\n]*\.github\/scripts\/test-skip-allow-check\.cjs/, "自我測試清單");
  const { STEPS } = require("./base-guard.cjs");
  for (const mode of ["feature", "release"]) assert.ok(STEPS("origin/main", mode).some(([, c]) => c.join(" ") === "node .github/scripts/check-skip-allow.cjs --base origin/main"), mode + " 模式要跑");
});
