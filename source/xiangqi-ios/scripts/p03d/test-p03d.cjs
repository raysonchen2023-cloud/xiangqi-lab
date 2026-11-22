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

test("p03d.js、wir.js 能編譯（語法沒壞）", () => {
  for (const f of ["p03d.js", "wir.js"]) assert.doesNotThrow(() => new vm.Script(rd(f).replace(/^#!.*\n/, ""), { filename: f }), f);
});

test("p03d.js：防「沒驗到卻算通過」的關卡都在", () => {
  const S = rd("p03d.js");
  assert.match(S, /if \(!LIST\[k\]\) \{ R\[k\] = \{ ok: false/, "情境打錯要記成失敗，不能 continue 跳過");
  assert.match(S, /P03D_EXPECT_BUILD && info\.b !== process\.env\.P03D_EXPECT_BUILD\) \{[^}]*process\.exit\(2\)/, "App 執行時的 XQ_BUILD 跟包不一樣要結束代碼 2");
  assert.match(S, /if \(cover !== "CANVAS"\) throw new Error\(/, "落點被非 CANVAS 元素蓋住要判失敗（W02）");
  assert.match(S, /P03D_FAULT === "cover"/, "反測注入（模擬 W02）");
  assert.match(S, /process\.exit\(bad\.length \? 1 : 0\)/, "有失敗結束代碼要非 0");
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
