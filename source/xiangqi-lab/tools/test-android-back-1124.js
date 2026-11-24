"use strict";
/* W100（11/24 開發者選「送審前修」）：Android App 按返回鍵先交給網頁回上一頁，首頁才收到背景。
   以前沒裝 @capacitor/app、MainActivity 也沒攔返回鍵，任何一頁按返回都直接回桌面；W99 殘局「先問要不要逃跑」在原生 App 上也沒作用。
   這支檢查：XQBackHandler.java 用 OnBackPressedCallback、先跑網頁那段 BACK_JS；BACK_JS 本身照 NAV_D 決定回上一頁或交還系統；
   共用版和最新封測變體（mini-26112401）的 MainActivity 都在 super.load() 之後裝上；變體設定檔的雜湊跟著更新。 */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const LAB = path.join(__dirname, ".."), AND = path.join(LAB, "..", "xiangqi-android");
const REL = ["android", "app", "src", "main", "java", "com", "raysonchen", "xiangqiqianqiu"];
const J = path.join(AND, ...REL);
/* 開發者電腦／公開倉庫的 source/ 底下，或 run-tests 暫存配置裡掛在 xiangqi-lab/site（＝倉庫根目錄）底下；都沒有就失敗（不略過） */
const VARS = [path.join(AND, "..", "xiangqi-android-variants"), path.join(LAB, "site", "source", "xiangqi-android-variants")].find((d) => fs.existsSync(path.join(d, "mini-26112401")));
const rd = (f) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const BH = rd(path.join(J, "XQBackHandler.java"));

/* 把 Java 裡 BACK_JS 的字串常數（"…" + "…" 接起來）還原成 JS */
function backJs() {
  const m = BH.match(/static final String BACK_JS = ([\s\S]*?);\n/);
  assert.ok(m, "抓得到 BACK_JS");
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => JSON.parse('"' + x[1] + '"')).join("");
}
function run(navD, len, opts = {}) {
  let backs = 0;
  const ctx = { history: { length: len, back() { if (opts.throws) throw new Error("x"); backs++ } } };
  if (navD !== undefined) ctx.NAV_D = navD;
  vm.createContext(ctx);
  return { r: vm.runInContext(backJs(), ctx), backs };
}

test("〔行為〕BACK_JS：App 裡有上一頁（NAV_D>0）就 history.back() 並回 back；在首頁、沒有 NAV_D、出錯都回 exit 交還系統", () => {
  assert.deepEqual(run(3, 8), { r: "back", backs: 1 }, "設定頁這種有上一頁的，回上一頁");
  assert.deepEqual(run(1, 2), { r: "back", backs: 1 });
  assert.deepEqual(run(0, 8), { r: "exit", backs: 0 }, "首頁 NAV_D 是 0：收到背景");
  assert.deepEqual(run(2, 1), { r: "exit", backs: 0 }, "瀏覽器紀錄只剩一筆：沒得回");
  assert.deepEqual(run(undefined, 5), { r: "exit", backs: 0 }, "頁面還沒載好、沒有 NAV_D：照系統預設");
  assert.deepEqual(run("3", 5), { r: "exit", backs: 0 }, "NAV_D 不是數字不算");
  assert.equal(run(2, 5, { throws: true }).r, "exit", "history.back 出錯也不能卡住返回鍵");
});

test("〔原始碼〕XQBackHandler：OnBackPressedCallback 先問網頁，只有明確回 back 才算網頁接手；不然暫時關掉自己、交還系統預設，再打開", () => {
  assert.match(BH, /import androidx\.activity\.OnBackPressedCallback;/);
  assert.match(BH, /getOnBackPressedDispatcher\(\)\.addCallback\(act, new OnBackPressedCallback\(true\)/);
  assert.match(BH, /wv\.evaluateJavascript\(BACK_JS, v -> \{\s*if \(!webHandled\(v\)\) systemBack\(act, self\);/);
  assert.match(BH, /return v != null && v\.contains\("back"\) && !v\.contains\("exit"\);/);
  const sb = BH.slice(BH.indexOf("static void systemBack("));
  const a = sb.indexOf("self.setEnabled(false)"), b = sb.indexOf("getOnBackPressedDispatcher().onBackPressed()"), c = sb.indexOf("self.setEnabled(true)");
  assert.ok(a > 0 && b > a && c > b, "先關自己→交還系統→再打開，不然會被自己攔到、無限迴圈");
  assert.ok(/finally \{\s*self\.setEnabled\(true\);/.test(sb), "交還系統出錯也要把自己打開，不然之後返回鍵都不經過網頁");
  assert.ok(!BH.includes("\r") && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(BH.replace(/[\t\n]/g, "")), "LF、沒有控制字元");
});

test("〔原始碼〕共用版和最新封測變體 mini-26112401 的 MainActivity 都在 super.load() 之後裝 XQBackHandler；變體設定檔雜湊對得上、修正清單有記", () => {
  assert.ok(VARS, "找得到 mini-26112401 變體");
  for (const f of [path.join(J, "MainActivity.java"), path.join(VARS, "mini-26112401", ...REL, "MainActivity.java")]) {
    const s = rd(f), ld = s.slice(s.indexOf("protected void load()"));
    const a = ld.indexOf("super.load();"), b = ld.indexOf("XQBackHandler.install(this, bridge);");
    assert.ok(a > 0 && b > a, f + "：要在 super.load()（bridge 建好）之後裝");
    assert.ok(ld.slice(0, b).lastIndexOf("if (bridge != null) {") > a, f + "：要在 bridge 不是 null 的區塊裡");
  }
  const VM = JSON.parse(fs.readFileSync(path.join(VARS, "mini-26112401", "VARIANT-MANIFEST.json"), "utf8"));
  assert.ok(VM.androidNativeFixes.includes("android-back-to-web-history"));
  const k = "android/app/src/main/java/com/raysonchen/xiangqiqianqiu/MainActivity.java";
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(VARS, "mini-26112401", k))).digest("hex"), VM.native[k], "變體設定檔的雜湊");
});
