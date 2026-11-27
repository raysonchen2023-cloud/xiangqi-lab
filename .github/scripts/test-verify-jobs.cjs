// verify.yml 拆成同時跑的工作（W183，開發者 11/27 選「改成同時跑」）的自我測試。
// 用法：node --test .github/scripts/test-verify-jobs.cjs
// 鎖住四件事：
//   ① 拆開前的 24 條檢查指令一條不少、各只出現一次，放在該放的工作（清單寫死在這裡，不從 verify.yml 讀，改 verify.yml 改不到基準）；
//   ② 分支保護的必要檢查叫 verify：verify 工作要 needs 兩個工作、if: always()（被略過的必要檢查會被當成通過）；
//   ③ 除了 verify 的 always()，沒有工作層的 if、沒有 continue-on-error（不准改成條件式略過或失敗照過）；
//   ④ 實跑 verify 的彙整指令：兩個都 success 才結束代碼 0，失敗、取消、略過、空值都要 1；
//   ⑤ 每一步的步驟層 if、id 照拆開前寫死；⑥ 彙整那一步不准有 if、shell、continue-on-error（#242 審查建議 1、2）；
//   ⑦ 整份 verify.yml（不算整行註解）寫死雜湊；⑧ 只准最基本的 YAML 寫法，連雜湊一起改時也擋得住常見的繞法（#242 複審）。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), cp = require("child_process");
const Y = fs.readFileSync(path.join(__dirname, "..", "workflows", "verify.yml"), "utf8");

/* 拆開前（main 937fdfa1）的 run 指令。selftest-ios：自我測試＋iOS 四步；full：其餘全部 */
const SELFTEST_IOS = [
  "node --test .github/scripts/test-check-text.cjs .github/scripts/test-ci-mode.cjs .github/scripts/test-guard-scan.cjs .github/scripts/test-skip-checks.cjs .github/scripts/test-test-classified.cjs .github/scripts/test-tag-release.cjs .github/scripts/test-check-evidence.cjs .github/scripts/test-base-guard.cjs .github/scripts/test-release-guard.cjs .github/scripts/test-todo-checks.cjs .github/scripts/test-zero-assert.cjs .github/scripts/test-check-verify-log.cjs .github/scripts/test-test-empty.cjs .github/scripts/test-tag-native.cjs",
  "node source/xiangqi-ios/scripts/check-native.js",
  "node --test source/xiangqi-ios/scripts/p03d/test-p03d.cjs",
  "node --test source/xiangqi-ios/scripts/test-canary-www.cjs",
  "node --test source/xiangqi-ios/scripts/test-canary-native.cjs"
];
const FULL = [
  "node .github/scripts/ci-mode.cjs \"$HEAD_REF\" \"$EVENT_NAME\" >> \"$GITHUB_OUTPUT\"",
  "node .github/scripts/check-text.cjs \"origin/$BASE_REF\"",
  "node .github/scripts/guard-release-files.cjs \"origin/$BASE_REF\"",
  "node source/check-build.js --out index.html",
  "node source/xiangqi-lab/tools/verify-all.js --skip release-verify --out verify-ci.txt --tally-out tally-ci.json",
  "node source/xiangqi-lab/tools/oss-scan.js source",
  "node .github/scripts/guard-release-pr.cjs \"origin/$BASE_REF\"",
  "node source/xiangqi-lab/tools/verify-all.js --out verify-ci.txt --tally-out tally-ci.json",
  "node source/xiangqi-lab/tools/make-evidence.js --verify verify-ci.txt --tally tally-ci.json --out evidence-ci.md --report-out testkinds-ci.json",
  "node .github/scripts/check-evidence.cjs data/docs/evidence.md evidence-ci.md",
  "node .github/scripts/check-verify-log.cjs . verify-ci.txt",
  "node source/xiangqi-lab/tools/release-sync-check.js --dir .",
  "node .github/scripts/check-fake-skip.cjs",
  "node .github/scripts/check-zero-assert.cjs \"$RUNNER_TEMP/assert-count\" verify-ci.txt",
  "node .github/scripts/check-test-skips.cjs verify-ci.txt",
  "node .github/scripts/check-test-todos.cjs tally-ci.json --base \"origin/$BASE_REF\"",
  "node .github/scripts/check-test-empty.cjs tally-ci.json",
  "node .github/scripts/check-test-classified.cjs \"origin/$BASE_REF\"",
  "node .github/scripts/scan-changed.cjs \"origin/$BASE_REF\" \"$RUNNER_TEMP/changed-files\""
];

/* 依縮排兩格的工作代號切出每個工作的原文 */
function jobs(y) {
  const lines = y.split("\n"), i = lines.indexOf("jobs:"), out = {};
  let cur = null;
  for (const l of lines.slice(i + 1)) {
    const m = /^  ([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (m) { cur = m[1]; out[cur] = []; continue }
    if (cur) out[cur].push(l);
  }
  for (const k in out) out[k] = out[k].join("\n");
  return out;
}
/* 自我測試那條只准在後面加檔（新增的自我測試），原本的檔一個都不能少、順序不變；其他每條要一字不差 */
const SELF0 = SELFTEST_IOS[0];
const same = (x, r) => x === r || (r === SELF0 && x.startsWith(r + " ") && /^( \.github\/scripts\/test-[a-z0-9-]+\.cjs)+$/.test(x.slice(r.length)));
const runsOf = (s) => s.split("\n").filter((l) => /^\s+run: /.test(l)).map((l) => l.replace(/^\s+run: /, ""));

test("① 拆開前的 24 條檢查指令都在、各只出現一次，放在該放的工作", () => {
  const J = jobs(Y);
  assert.deepEqual(Object.keys(J).sort(), ["full", "selftest-ios", "verify"], "工作只能有這三個");
  const all = runsOf(Y);
  for (const r of [...SELFTEST_IOS, ...FULL]) assert.equal(all.filter((x) => same(x, r)).length, 1, "這條要剛好出現一次：" + r);
  for (const r of SELFTEST_IOS) assert.ok(runsOf(J["selftest-ios"]).some((x) => same(x, r)), "要在 selftest-ios：" + r);
  for (const r of FULL) assert.ok(runsOf(J.full).some((x) => same(x, r)), "要在 full：" + r);
  /* full 要照原本的先後順序（完整驗證先產生 verify-ci.txt、tally-ci.json，後面的稽核才讀得到） */
  const order = runsOf(J.full).filter((r) => FULL.includes(r));
  assert.deepEqual(order, FULL, "full 裡的順序要跟拆開前一樣");
  assert.match(runsOf(J["selftest-ios"]).find((x) => same(x, SELF0)), / \.github\/scripts\/test-verify-jobs\.cjs(\s|$)/, "這支自我測試自己也要在 CI 跑");
  /* 兩個工作都要 checkout（完整歷史，比對 origin/main 要用）、裝 Node 24 */
  for (const k of ["selftest-ios", "full"]) {
    assert.match(J[k], /- uses: actions\/checkout@v4\n\s+with:\n\s+fetch-depth: 0/, k + " 要完整 checkout");
    assert.match(J[k], /- uses: actions\/setup-node@v4\n\s+with:\n\s+node-version: 24/, k + " 要裝 Node 24");
  }
  assert.match(J.full, /BASE_REF: \$\{\{ github\.base_ref \|\| 'main' \}\}/, "full 要有 BASE_REF");
});

test("② verify 工作：needs 兩個工作、if: always()、沒有 name（必要檢查的名稱就是 verify）", () => {
  const v = jobs(Y).verify;
  assert.match(v, /^    needs: \[selftest-ios, full\]$/m);
  assert.match(v, /^    if: always\(\)$/m);
  assert.doesNotMatch(v, /^    name:/m, "verify 不能另取名字，不然必要檢查 verify 對不到");
  assert.deepEqual(runsOf(v), ["|"], "verify 只有一步彙整");
});

test("③ 沒有工作層的條件、沒有 continue-on-error", () => {
  const J = jobs(Y);
  for (const k of ["selftest-ios", "full"]) assert.doesNotMatch(J[k], /^    if:/m, k + " 不能有工作層的 if");
  assert.doesNotMatch(Y, /continue-on-error/, "不准失敗照過");
  for (const k of ["selftest-ios", "full", "verify"]) assert.doesNotMatch(J[k], /^    strategy:/m, "不准用 matrix 改變要跑的東西");
  /* selftest-ios 的五步拆開前就沒有條件，拆開後也不能加 */
  assert.doesNotMatch(J["selftest-ios"], /^\s+if:/m, "selftest-ios 的步驟不能加條件");
});

test("④ 實跑彙整指令：兩個都 success 才 0；失敗、取消、略過、空值都 1", () => {
  const v = jobs(Y).verify.split("\n");
  const i = v.findIndex((l) => /^\s+run: \|$/.test(l));
  const ind = /^(\s*)/.exec(v[i + 1])[1].length;
  const script = v.slice(i + 1).filter((l) => l.trim() === "" || /^(\s*)/.exec(l)[1].length >= ind).map((l) => l.slice(ind)).join("\n");
  assert.match(script, /R_SELFTEST_IOS/); assert.match(script, /R_FULL/);
  assert.match(v.join("\n"), /R_SELFTEST_IOS: \$\{\{ needs\.selftest-ios\.result \}\}/);
  assert.match(v.join("\n"), /R_FULL: \$\{\{ needs\.full\.result \}\}/);
  const run = (a, b) => cp.spawnSync("bash", ["-c", script], { env: { ...process.env, R_SELFTEST_IOS: a, R_FULL: b }, encoding: "utf8" }).status;
  assert.equal(run("success", "success"), 0);
  for (const bad of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(run(bad, "success"), 1, "selftest-ios=" + JSON.stringify(bad) + " 要算不過");
    assert.equal(run("success", bad), 1, "full=" + JSON.stringify(bad) + " 要算不過");
  }
  assert.equal(run("failure", "failure"), 1);
});

/* 拆開前（main 937fdfa1）每一步的步驟層 if 與 id，照抄過來寫死（#242 審查建議 2）：條件不能改、不能加、不能拿掉 */
const STEP_IF = [
  [
    "run:node --test .github/scripts/test-check-text.cjs .github/scripts/test-ci-mode.cjs .github/scripts/test-guard-scan.cjs .github/scripts/test-skip-checks.cjs .github/scripts/test-test-classified.cjs .github/scripts/test-tag-release.cjs .github/scripts/test-check-evidence.cjs .github/scripts/test-base-guard.cjs .github/scripts/test-release-guard.cjs .github/scripts/test-todo-checks.cjs .github/scripts/test-zero-assert.cjs .github/scripts/test-check-verify-log.cjs .github/scripts/test-test-empty.cjs .github/scripts/test-tag-native.cjs",
    null,
    null
  ],
  [
    "run:node source/xiangqi-ios/scripts/check-native.js",
    null,
    null
  ],
  [
    "run:node --test source/xiangqi-ios/scripts/p03d/test-p03d.cjs",
    null,
    null
  ],
  [
    "run:node --test source/xiangqi-ios/scripts/test-canary-www.cjs",
    null,
    null
  ],
  [
    "run:node --test source/xiangqi-ios/scripts/test-canary-native.cjs",
    null,
    null
  ],
  [
    "run:node .github/scripts/ci-mode.cjs \"$HEAD_REF\" \"$EVENT_NAME\" >> \"$GITHUB_OUTPUT\"",
    null,
    "mode"
  ],
  [
    "run:node .github/scripts/check-text.cjs \"origin/$BASE_REF\"",
    null,
    null
  ],
  [
    "run:node .github/scripts/guard-release-files.cjs \"origin/$BASE_REF\"",
    "steps.mode.outputs.mode == 'feature'",
    null
  ],
  [
    "run:node source/check-build.js --out index.html",
    "steps.mode.outputs.mode == 'feature'",
    null
  ],
  [
    "run:node source/xiangqi-lab/tools/verify-all.js --skip release-verify --out verify-ci.txt --tally-out tally-ci.json",
    "steps.mode.outputs.mode == 'feature'",
    null
  ],
  [
    "run:node source/xiangqi-lab/tools/oss-scan.js source",
    "steps.mode.outputs.mode == 'feature'",
    null
  ],
  [
    "run:node .github/scripts/guard-release-pr.cjs \"origin/$BASE_REF\"",
    "steps.mode.outputs.mode == 'release'",
    null
  ],
  [
    "run:node source/xiangqi-lab/tools/verify-all.js --out verify-ci.txt --tally-out tally-ci.json",
    "steps.mode.outputs.mode == 'release'",
    null
  ],
  [
    "run:node source/xiangqi-lab/tools/make-evidence.js --verify verify-ci.txt --tally tally-ci.json --out evidence-ci.md --report-out testkinds-ci.json",
    null,
    null
  ],
  [
    "run:node .github/scripts/check-evidence.cjs data/docs/evidence.md evidence-ci.md",
    "steps.mode.outputs.mode == 'release'",
    null
  ],
  [
    "run:node .github/scripts/check-verify-log.cjs . verify-ci.txt",
    "steps.mode.outputs.mode == 'release'",
    null
  ],
  [
    "run:node source/xiangqi-lab/tools/release-sync-check.js --dir .",
    "steps.mode.outputs.mode == 'release'",
    null
  ],
  [
    "run:node .github/scripts/check-fake-skip.cjs",
    null,
    null
  ],
  [
    "run:node .github/scripts/check-zero-assert.cjs \"$RUNNER_TEMP/assert-count\" verify-ci.txt",
    null,
    null
  ],
  [
    "run:node .github/scripts/check-test-skips.cjs verify-ci.txt",
    null,
    null
  ],
  [
    "run:node .github/scripts/check-test-todos.cjs tally-ci.json --base \"origin/$BASE_REF\"",
    null,
    null
  ],
  [
    "run:node .github/scripts/check-test-empty.cjs tally-ci.json",
    null,
    null
  ],
  [
    "run:node .github/scripts/check-test-classified.cjs \"origin/$BASE_REF\"",
    null,
    null
  ],
  [
    "run:node .github/scripts/scan-changed.cjs \"origin/$BASE_REF\" \"$RUNNER_TEMP/changed-files\"",
    null,
    null
  ],
  [
    "uses:actions/upload-artifact@v4",
    "always()",
    null
  ]
];

/* 找某個鍵的值：任意縮排、前面可以有「- 」（後面幾個空格都行）、鍵名可加單／雙引號、冒號前可以有空格 */
const KEYRE = (k) => new RegExp("^\\s*(?:-\\s+)?(?:" + k + "|'" + k + "'|\"" + k + "\")\\s*:[ \\t]*(.*)$", "m");

/* 步驟層的鍵：只認步驟本身那一層（第一行「      - 」後面，或剛好縮排 8 格），鍵名加引號、冒號前有空格也認得。
   env 底下、run 區塊裡同名的行縮排比較深，不算（#242 第三輪：誘餌 if 放在 env 底下，會被「整步第一個符合的行」誤認）。
   同一步出現兩次以上就回傳一個不可能的值，讓 ⑤ 判失敗。
   「- 」後多空格、整份的怪寫法由 ⑧ 擋。 */
function stepKey(t, k) {
  const re = new RegExp("^(?:        |      - )(?:" + k + "|'" + k + "'|\"" + k + "\")\\s*:[ \\t]*(.*)$", "gm");
  const all = [...t.matchAll(re)].map((m) => m[1]);
  if (all.length > 1) return "〔" + k + " 出現 " + all.length + " 次〕";
  return all[0] || null;
}

/* 切出某個工作的每一步：回傳 [{ key, if, id, text }] */
function stepsOf(jobText) {
  const out = []; let cur = null;
  for (const l of jobText.split("\n")) {
    if (l.startsWith("      - ")) { if (cur) out.push(cur); cur = [l]; } else if (cur) cur.push(l);
  }
  if (cur) out.push(cur);
  return out.map((s) => {
    const t = s.join("\n");
    const run = (/^\s+run: (.*)$/m.exec(t) || [])[1], uses = (/^\s+(?:- )?uses: (.*)$/m.exec(t) || [])[1];
    return { key: run ? "run:" + run : "uses:" + uses, if: stepKey(t, "if"), id: stepKey(t, "id"), text: t };
  });
}

test("⑤ 每一步的步驟層 if、id 都跟拆開前一樣（功能／發布模式的條件、id: mode、上傳紀錄的 always()）", () => {
  const J = jobs(Y), all = [...stepsOf(J["selftest-ios"]), ...stepsOf(J.full)];
  for (const [key, iff, id] of STEP_IF) {
    const hit = all.filter((s) => s.key === key || (key === "run:" + SELF0 && same(s.key.slice(4), SELF0)));
    assert.equal(hit.length, 1, "這一步要剛好一個：" + key);
    assert.equal(hit[0].if, iff, "步驟層 if 不能改：" + key);
    assert.equal(hit[0].id, id, "步驟 id 不能改：" + key);
  }
  /* 拆開後沒有多出別的步驟（checkout、setup-node 兩個工作各一次） */
  const extra = all.filter((s) => !/actions\/(checkout|setup-node)@v4/.test(s.key) && !STEP_IF.some(([k]) => k === s.key || (k === "run:" + SELF0 && same(s.key.slice(4), SELF0))));
  assert.deepEqual(extra.map((s) => s.key), [], "不准多出步驟");
});

test("⑥ verify 彙整那一步：不准有步驟層 if、shell、continue-on-error、working-directory（步驟被略過或換了執行程式，工作會算成功）", () => {
  const S = stepsOf(jobs(Y).verify);
  assert.equal(S.length, 1, "verify 只有一步");
  for (const k of ["if", "shell", "continue-on-error", "working-directory", "uses"]) assert.doesNotMatch(S[0].text, KEYRE(k), "彙整步驟不准有 " + k);
  assert.doesNotMatch(Y, KEYRE("defaults"), "任何層級都不准用 defaults 改 shell");
});

/* ⑦ 整份 verify.yml 寫死雜湊（#242 複審：鍵名比對怎麼寫都有合法 YAML 繞得過，改成整份鎖死）。
   整份逐位元組算，註解也算（#242 第三輪：略過註解行的話，註解行裡夾 U+0085 就能藏進真的鍵）。
   任何字元改了都要紅：on、env、shell、defaults、引號鍵、多空格、註解……都包含。
   要改 verify.yml：連這個雜湊一起改，同一個 PR 會被當成計分規則 PR 逐行審（AGENTS.md「PR 審查標準」）。
   重算：用 sha256 算 .github/workflows/verify.yml 整個檔（例如 sha256sum） */
const VERIFY_YML_SHA256 = "1667ea710b491bf5967a4134a407b257236bbc917cbeb67225e4ecf5bc749533";
test("⑦ 整份 verify.yml（逐位元組，註解也算）跟寫死的雜湊一樣", () => {
  assert.doesNotMatch(Y, /\r/, "不能有 CR");
  const h = require("crypto").createHash("sha256").update(fs.readFileSync(path.join(__dirname, "..", "workflows", "verify.yml"))).digest("hex");
  assert.equal(h, VERIFY_YML_SHA256, "verify.yml 改了：要連這支測試的 VERIFY_YML_SHA256 一起改，並當計分規則 PR 逐行審");
});

/* ⑧ 結構保險：雜湊更新時給審查者的第二道防線。只准最基本的 YAML 寫法，看起來像在繞過的寫法一律擋。
   run／path 這種「|」區塊的內容是指令文字，不檢查。 */
function yamlProblems(y) {
  const bad = [];
  /* YAML 也會當成換行或特殊字元的：CR、C1 控制字元（含 U+0085 NEL）、U+2028／2029、U+FEFF。一律不准（#242 第三輪） */
  const odd = /[\r\u0080-\u009f\u2028\u2029\ufeff]/.exec(y);
  if (odd) bad.push("有不准用的字元 U+" + odd[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));
  const lines = y.split("\n");
  let block = -1;
  lines.forEach((raw, i) => {
    const n = i + 1, ind = /^(\s*)/.exec(raw)[1].length;
    if (block >= 0) { if (raw.trim() === "" || ind > block) return; block = -1 }
    if (raw.trim() === "" || /^\s*#/.test(raw)) return;
    if (/\t/.test(/^\s*/.exec(raw)[0])) { bad.push(n + "：縮排有 tab"); return }
    let s = raw.slice(ind), col = ind;
    if (s.startsWith("-")) {
      if (!/^- \S/.test(s)) { bad.push(n + "：「-」後面要剛好一個空格"); return }
      s = s.slice(2); col += 2;
    }
    const m = /^([A-Za-z0-9_-]+):(?: (.*))?$/.exec(s);
    if (!m) { if (raw.slice(ind).startsWith("- ") && !/[:{}&*!]/.test(s)) return; bad.push(n + "：不是「鍵: 值」的基本寫法（鍵名不准加引號、冒號前不准有空格）：" + s.slice(0, 40)); return }
    const [, key, val = ""] = m;
    if (["shell", "defaults", "continue-on-error"].includes(key)) bad.push(n + "：不准用 " + key);
    if (key === "<<") bad.push(n + "：不准用合併鍵");
    if (/^[{&*!]/.test(val) || /\s[&*!][A-Za-z]/.test(" " + val.replace(/\$\{\{[^}]*\}\}/g, ""))) bad.push(n + "：不准用 {…}、錨點、別名、標籤：" + val.slice(0, 40));
    if (/^[|>][-+]?$/.test(val)) block = col;
  });
  return bad;
}

test("⑧ verify.yml 只用最基本的 YAML 寫法：沒有 shell、defaults、continue-on-error；鍵名不加引號、冒號前沒空格、「-」後一個空格；沒有 {…}、錨點、別名、標籤", () => {
  assert.deepEqual(yamlProblems(Y), []);
  /* 檢查器自己也要會抓（不然 ⑧ 永遠是綠的） */
  for (const [what, y] of [
    ["引號鍵", "jobs:\n  a:\n    steps:\n      - 'if': false\n"], ["雙引號鍵", "jobs:\n  a:\n    \"shell\": x\n"], ["冒號前空格", "a:\n  if  : false\n"],
    ["- 後多空格", "s:\n  -   if: false\n"], ["shell", "s:\n  - run: x\n    shell: sh\n"], ["defaults", "defaults:\n  run:\n    shell: sh\n"],
    ["continue-on-error", "s:\n  - run: x\n    continue-on-error: true\n"], ["flow mapping", "s:\n  - {run: x, if: false}\n"], ["錨點", "a: &x\n  b: 1\n"], ["別名", "a: *x\n"],
    ["合併鍵", "a:\n  <<: *x\n"], ["標籤", "a: !!str x\n"], ["tab 縮排", "a:\n\tb: 1\n"],
    ["註解行夾 U+0085", "a:\n  # 註解\u0085  if: false\n"], ["U+2028", "a: 1\u2028b: 2\n"], ["U+2029", "a: 1\u2029b: 2\n"], ["U+FEFF", "\ufeffa: 1\n"], ["CR", "a: 1\r\n"]]) assert.notDeepEqual(yamlProblems(y), [], "⑧ 要抓到：" + what);
  assert.deepEqual(yamlProblems("a:\n  run: |\n    echo \"x: y\" && 'q': 1\n  b: ${{ x || 'main' }}\n  c: [x, y]\n"), [], "| 區塊的內容、${{ }}、[a, b] 不能誤擋");
});
