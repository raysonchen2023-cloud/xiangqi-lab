// 11/22 W69①（流程盤點第 15 項「iOS 閘門沒定義或只在 iMac」）：iOS P0-3D 自動驗收腳本收進公開倉庫 xiangqi-ios/scripts/p03d/。
//   真正的驗收要 macOS＋模擬器（p0-3d.sh），CI 跑不了；這裡檢查「腳本本身沒被改壞、防假通過的關卡都還在」：
//   ① wir.js 的 binary plist 編解碼來回一致（Web Inspector 協定靠它）；② p03d.js、wir.js 能編譯；
//   ③ 防「沒驗到卻算通過」的關卡（情境打錯記失敗、核對版號、落點被蓋住判失敗、反測注入）都在；④ p0-3d.sh 核對模擬器上的包 SHA、安裝失敗就停、跑完抹掉。
//   反測（用有問題的版本要亮紅燈）在 iMac 實跑：P03D_FAULT=cover 時 8 個情境都判「落點被 BUTTON 蓋住」、結束代碼 1（見 README）。
// 用法（倉庫根目錄）：node --test source/xiangqi-ios/scripts/p03d/test-p03d.cjs   （CI 的 verify.yml 也跑這一支；不放在 xiangqi-lab/tools，因為 run-tests 的暫存區不含 xiangqi-ios）
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const D = __dirname;
const rd = (f) => fs.readFileSync(path.join(D, f), "utf8").replace(/\r\n/g, "\n");

test("wir.js：binary plist 編碼後再解碼，內容一樣（中文、大數字、位元資料、布林）", () => {
  const { bplistEncode, bplistDecode } = require(path.join(D, "wir.js"));
  const o = { __selector: "_rpc_forwardSocketData:", __argument: { WIRConnectionIdentifierKey: "ABC", 中文: "將軍", n: 300, big: 70000, d: Buffer.from("{\"id\":1}"), t: true, f: false } };
  const b = bplistEncode(o);
  assert.equal(b.toString("ascii", 0, 8), "bplist00");
  const r = bplistDecode(b);
  assert.equal(r.__selector, o.__selector);
  assert.equal(r.__argument.中文, "將軍");
  assert.equal(r.__argument.n, 300); assert.equal(r.__argument.big, 70000);
  assert.equal(Buffer.from(r.__argument.d).toString(), "{\"id\":1}");
  assert.equal(r.__argument.t, true); assert.equal(r.__argument.f, false);
});

test("rounds.js：連續 N 輪（預設 2）、每一輪都全過才算；嘗試紀錄只算同一個包＋同一個 iOS 版本（W69 流程盤點第 5 項）", () => {
  const { parseRounds, roundPass, runtimeMajor, priorAttempts } = require(path.join(D, "rounds.js"));
  assert.equal(parseRounds(undefined), 2); assert.equal(parseRounds(""), 2); assert.equal(parseRounds("3"), 3);
  for (const v of ["0", "10", "x", "1.5", "-1"]) assert.equal(parseRounds(v), null, "格式錯：" + v);
  assert.equal(roundPass({ prep: { ok: true }, cpu: { ok: true }, inn: { ok: true } }), true);
  assert.equal(roundPass({ cpu: { ok: true }, inn: { ok: false } }), false, "一個沒過＝這輪沒過");
  assert.equal(roundPass({ prep: { ok: true } }), false, "只有 prep、沒有情境不算過");
  assert.equal(roundPass({}), false);
  assert.equal(roundPass({ cpu: { ok: "yes" } }), false, "ok 要是 true");
  assert.equal(runtimeMajor("com.apple.CoreSimulator.SimRuntime.iOS-27-2"), "27");
  assert.equal(runtimeMajor("com.apple.CoreSimulator.SimRuntime.watchOS-12-0"), null, "不是 iOS 的不算");
  assert.equal(runtimeMajor("沒有版本"), null);
  /* 命令列：從 simctl 的 JSON 找出指定那台的 iOS 大版號 */
  const J = JSON.stringify({ devices: { "com.apple.CoreSimulator.SimRuntime.iOS-26-1": [{ udid: "U1" }], "com.apple.CoreSimulator.SimRuntime.iOS-27-2": [{ udid: "U2" }] } });
  const cli = (u) => require("child_process").spawnSync(process.execPath, [path.join(D, "rounds.js"), "ios", u], { input: J, encoding: "utf8" }).stdout;
  assert.equal(cli("U2"), "27"); assert.equal(cli("U1"), "26"); assert.equal(cli("沒有這台"), "");
  const A = "a".repeat(64), B = "b".repeat(64);
  const L = [{ indexSha256: A, ios: "26", pass: false }, { indexSha256: A, ios: "26", pass: true }, { indexSha256: A, ios: "18", pass: false }, { indexSha256: B, ios: "26", pass: false }, { indexSha256: A, ios: "26", pass: false, unfit: true }]
    .map((x) => JSON.stringify(x)).concat(["壞掉的一行"]);
  assert.deepEqual(priorAttempts(L, A, "26"), { before: 3, failedBefore: 2 }, "測試不成立的那次也算一次失敗");
  assert.deepEqual(priorAttempts(L, A, "18"), { before: 1, failedBefore: 1 });
  assert.deepEqual(priorAttempts(L, null, "26"), { before: 0, failedBefore: 0 }, "沒有包的雜湊不比");
  assert.deepEqual(priorAttempts(L.concat([JSON.stringify({ indexSha256: A, ios: "26", pass: false, fault: true })]), A, "26"), { before: 3, failedBefore: 2 }, "反測的紀錄不算（PR #61 審查②）");
  /* 命令列 unfit：p0-3d.sh 的 die() 追加一筆測試不成立（PR #61 審查③） */
  const os = require("os"), tf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "p03d-")), "att.jsonl");
  require("child_process").spawnSync(process.execPath, [path.join(D, "rounds.js"), "unfit", tf, A, "20261122-0804", "27", "U1", "p03d-x", "", "模擬器上裝的不是這個包"]);
  const u = JSON.parse(fs.readFileSync(tf, "utf8").trim());
  assert.equal(u.unfit, true); assert.equal(u.pass, false); assert.equal(u.fault, false); assert.equal(u.indexSha256, A); assert.equal(u.ios, "27"); assert.match(u.error, /不是這個包/);
  assert.deepEqual(priorAttempts([fs.readFileSync(tf, "utf8").trim()], A, "27"), { before: 1, failedBefore: 1 }, "測試不成立算一次沒過");
  assert.deepEqual(priorAttempts([], A, "26"), { before: 0, failedBefore: 0 });
});

test("p0-3d.sh：嘗試紀錄傳給 p03d.js，放在 output 底下的固定檔", () => {
  const S = rd("p0-3d.sh");
  assert.match(S, /ATT=\$\{OUT:h\}\/p03d-attempts\.jsonl/);
  assert.match(S, /P03D_ATTEMPTS=\$ATT /);
  assert.match(S, /IOSV=\$\(xcrun simctl list devices -j \| node \$HERE\/rounds\.js ios \$U\)/, "iOS 版本從模擬器系統讀");
  assert.match(S, / P03D_IOS=\$IOSV /);
  assert.match(S, /die\(\)\{[^\n]*node \$HERE\/rounds\.js unfit "\$ATT"/, "測試不成立也寫嘗試紀錄（PR #61 審查③）");
  assert.match(S, /echo "包：\$APP" \| tee \$OUT\/run\.txt\necho "模擬器 iOS/, "run.txt 先寫「包：」再追加，不被蓋掉（PR #61 審查①）");
  assert.doesNotMatch(rd("p03d.js"), /userAgent[^\n]*IOS|IOS[^\n]*\.ua\b/, "不用 WebView 的 userAgent 判 iOS 版本（凍結值）");
});

test("p03d.js、wir.js、rounds.js 能編譯（語法沒壞）", () => {
  for (const f of ["p03d.js", "wir.js", "rounds.js"]) assert.doesNotThrow(() => new vm.Script(rd(f).replace(/^#!.*\n/, ""), { filename: f }), f);
});

test("p03d.js：防「沒驗到卻算通過」的關卡都在", () => {
  const S = rd("p03d.js");
  assert.match(S, /if \(!LIST\[k\]\) \{ R\[k\] = \{ ok: false/, "情境打錯要記成失敗，不能 continue 跳過");
  assert.match(S, /P03D_EXPECT_BUILD && info\.b !== process\.env\.P03D_EXPECT_BUILD\) \{[^}]*process\.exit\(2\)/, "App 執行時的 XQ_BUILD 跟包不一樣要結束代碼 2");
  assert.match(S, /if \(cover !== "CANVAS"\) throw new Error\(/, "落點被非 CANVAS 元素蓋住要判失敗（W02）");
  assert.match(S, /P03D_FAULT === "cover"/, "反測注入（模擬 W02）");
  assert.match(S, /const good = prepOk && sc\.length > 0 && miss\.length === 0;/, "反測模式：每個情境都被擋到才回 0（PR #45 審查②）");
  assert.match(S, /process\.exit\(bad\.length \? 1 : 0\)/, "有失敗結束代碼要非 0");
  assert.match(S, /if \(!pass && !bad\.length\) bad\.push\(/, "沒過（含沒跑滿輪數）一定要記一項失敗，結束代碼才不會是 0");
  /* W69 流程盤點第 5 項（照 Android PR #58）：同一次執行連續 N 輪全過、每次嘗試都留紀錄 */
  assert.match(S, /const ROUNDS = FAULT \? 1 : RD\.parseRounds\(process\.env\.P03D_ROUNDS\);/, "預設連跑 2 輪（parseRounds）");
  assert.match(S, /if \(!RD\.roundPass\(R\)\) break;/, "任一輪沒過就停");
  assert.match(S, /const pass = P\.prep\.ok && roundsPassed === ROUNDS && RR\.length === ROUNDS && RR\.every\(\(x\) => RD\.roundPass\(x\)\);/, "每一輪都全過才算過");
  assert.match(S, /logAttempt\(\{ rounds: ROUNDS, roundsPassed, pass \}\);/, "跑完不論過不過都寫嘗試紀錄");
  assert.match(S, /\.catch\(async \(e\) => \{ log\("✘ " \+ e\.message\); logAttempt\(unfit\(e\.message\)\);/, "例外結束也寫嘗試紀錄");
  assert.match(S, /logAttempt\(unfit\("XQ_BUILD 不符：" \+ info\.b\)\); process\.exit\(2\);/, "版號不符（測試不成立）也寫嘗試紀錄");
  assert.match(S, /const unfit = \(error\) => \(\{ pass: false, unfit: true,/, "測試不成立記成沒過");
  assert.match(S, /path\.join\(path\.dirname\(OUT\), "p03d-attempts\.jsonl"\)/, "嘗試紀錄放在證據資料夾的上一層固定檔");
  assert.match(S, /x\.f === m\.f && x\.t === m\.t/, "棋譜新增那一步的起點、落點都要對");
  assert.match(S, /op: "tap"/, "點擊走 XCUITest 真實觸控");
  assert.doesNotMatch(S, /\.click\(\)\s*;?\s*\/\*\s*落點/, "落點不能用 JS click");
});

test("p0-3d.sh：核對模擬器上的包、安裝失敗就停、跑完抹掉；不寫死某台電腦的路徑", () => {
  const S = rd("p0-3d.sh");
  assert.match(S, /get_app_container \$U com\.raysonchen\.xiangqiqianqiu\.dev app/);
  assert.match(S, /\[ "\$IS" = "\$XS" \] \|\| die/, "模擬器上 index.html 的 SHA-256 要等於包裡的");
  assert.match(S, /fresh-app\.sh \$U "\$APP" > \$OUT\/fresh-app\.log 2>&1 \|\| die/, "抹掉／安裝失敗要停");
  assert.match(S, /P03D_EXPECT_BUILD=\$XB/);
  assert.match(S, /xcrun simctl erase \$U\n/, "跑完抹掉模擬器");
  for (const f of ["p0-3d.sh", "p03d.js", "fresh-app.sh", "README.md"]) assert.doesNotMatch(rd(f), /\/Users\/|tools-imac|D3440318/, f + " 沒有寫死某台電腦的路徑或模擬器");
});

test("P03D 測試專案：只有一支 XCUITest、用 bundle id 點 App（不動 App 專案）", () => {
  const P = rd("P03D.xcodeproj/project.pbxproj"), T = rd("P03DUITests/P03DUITests.swift");
  assert.match(P, /productType = "com\.apple\.product-type\.bundle\.ui-testing"/);
  assert.match(T, /XCUIApplication\(bundleIdentifier: bundle\)/);
  assert.match(T, /p\.tap\(\)/);
});
