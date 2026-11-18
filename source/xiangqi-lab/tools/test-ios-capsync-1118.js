// 11/18 iMac 套用 1041：先跑 install-native、再跑 npx cap sync ios，cap sync 會重寫 ios/App/App/capacitor.config.json 的 packageClassList，
//   把 XQSpeechPlugin 拿掉 → App 裡沒有 XQSpeech，網頁退回瀏覽器語音（之前卡住過，P1 風險）。
//   改成 XQBridgeViewController.swift 的 capacitorDidLoad() 用 bridge?.registerPluginInstance(...) 註冊（cap sync 不碰 App 的 Swift 檔）；
//   install-native.js 不再寫 packageClassList，舊版寫進去的會清掉（免得註冊兩次）。
// 模擬：把 xiangqi-ios 的 scripts、native 和 ios/App（不含 867 MB 的 public）複製到暫存資料夾，在那裡跑 install-native.js → 模擬 cap sync 重寫 capacitor.config.json
//   → 再看 App 裡的 XQBridgeViewController.swift 還有註冊、packageClassList 沒有我們的外掛也沒有重複；再跑一次 install-native 也一樣。
// 只在開發者電腦上（有 xiangqi-ios/ios/App）；公開副本沒有就略過。
// 用法：node --test xiangqi-lab/tools/test-ios-capsync-1118.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), os = require("os"), { spawnSync } = require("child_process");
const IOS = path.join(__dirname, "..", "..", "xiangqi-ios"), APP0 = path.join(IOS, "ios", "App");
const HAVE = fs.existsSync(path.join(APP0, "App.xcodeproj", "project.pbxproj")) && fs.existsSync(path.join(IOS, "scripts", "install-native.js"));
const NO = "沒有 xiangqi-ios/ios/App（只在開發者電腦上；公開副本不含）";
const OURS = ["XQSpeechPlugin", "XQGameCenterPlugin", "XQWidgetDataPlugin"];

function sandbox(oldList) {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), "xq-capsync-"));
  fs.cpSync(path.join(IOS, "scripts"), path.join(T, "scripts"), { recursive: true });
  fs.cpSync(path.join(IOS, "native"), path.join(T, "native"), { recursive: true });
  fs.cpSync(APP0, path.join(T, "ios", "App"), { recursive: true, filter: s => !/[\\/]App[\\/]App[\\/]public([\\/]|$)/.test(s) && !/CapApp-SPM[\\/]\.build/.test(s) });
  /* 舊版 install-native 留下的樣子：packageClassList 裡有我們的外掛（測清掉、不重複） */
  const cfgP = path.join(T, "ios", "App", "App", "capacitor.config.json"), cfg = JSON.parse(fs.readFileSync(cfgP, "utf8"));
  if (oldList) { cfg.packageClassList = (cfg.packageClassList || []).filter(c => !OURS.includes(c)).concat(oldList); fs.writeFileSync(cfgP, JSON.stringify(cfg, null, "\t") + "\n") }
  return { T, cfgP, vcP: path.join(T, "ios", "App", "App", "XQBridgeViewController.swift"), run: (...a) => spawnSync(process.execPath, [path.join(T, "scripts", "install-native.js"), ...a], { encoding: "utf8", cwd: T }) };
}
/* npx cap sync ios 對 capacitor.config.json 做的事：照 capacitor.config.json 根目錄設定＋npm 外掛重寫一份，packageClassList＝npm 套件的外掛（不含 App 內自訂的） */
function capSync(S) {
  const root = JSON.parse(fs.readFileSync(path.join(IOS, "capacitor.config.json"), "utf8"));
  const npm = ["AppPlugin", "FilesystemPlugin", "HapticsPlugin", "LocalNotificationsPlugin", "PreferencesPlugin", "SharePlugin", "SplashScreenPlugin", "StatusBarPlugin"];
  fs.writeFileSync(S.cfgP, JSON.stringify(Object.assign({}, root, { packageClassList: npm }), null, "\t") + "\n");
}
const reg = s => /override func capacitorDidLoad\(\)[\s\S]{0,400}bridge\?\.registerPluginInstance\(XQSpeechPlugin\(\)\)/.test(s);
const list = S => JSON.parse(fs.readFileSync(S.cfgP, "utf8")).packageClassList || [];

test("先 install-native、再模擬 cap sync 重寫 capacitor.config.json：XQSpeech 的註冊仍然在（在 App 的 XQBridgeViewController.swift 裡，不靠 packageClassList）", { skip: HAVE ? false : NO }, () => {
  const S = sandbox(["XQSpeechPlugin"]);
  try {
    const r1 = S.run(); assert.equal(r1.status, 0, r1.stdout + r1.stderr);
    assert.ok(reg(fs.readFileSync(S.vcP, "utf8")), "install-native 之後：App 裡的 XQBridgeViewController.swift 有 capacitorDidLoad 註冊 XQSpeech");
    assert.ok(!list(S).some(c => OURS.includes(c)), "舊版留下的 packageClassList XQSpeechPlugin 清掉了（不會註冊兩次）：" + list(S).join());
    assert.ok(/packageClassList 拿掉 XQSpeechPlugin/.test(r1.stdout), r1.stdout);
    capSync(S);
    assert.ok(reg(fs.readFileSync(S.vcP, "utf8")), "cap sync 之後：註冊還在（cap sync 不碰 App 的 Swift 檔）");
    assert.ok(fs.existsSync(path.join(S.T, "ios", "App", "App", "XQSpeechPlugin.swift")) && fs.readFileSync(path.join(S.T, "ios", "App", "App.xcodeproj", "project.pbxproj"), "utf8").includes("/* XQSpeechPlugin.swift */"), "外掛檔還在、還在 Xcode 專案裡");
    const L = list(S); assert.ok(!L.some(c => OURS.includes(c)) && new Set(L).size === L.length, "packageClassList 沒有我們的外掛、沒有重複");
    const r2 = S.run(); assert.equal(r2.status, 0); assert.deepEqual(list(S), L, "再跑一次 install-native：packageClassList 不動（不會再加回去）"); assert.ok(reg(fs.readFileSync(S.vcP, "utf8")));
  } finally { fs.rmSync(S.T, { recursive: true, force: true }) }
});

test("Game Center、小工具（--gc-widget）也一樣：檔案裝進去、packageClassList 不列；BridgeVC 有編進 App 才用 NSClassFromString 註冊", { skip: HAVE ? false : NO }, () => {
  const S = sandbox(["XQSpeechPlugin", "XQGameCenterPlugin", "XQWidgetDataPlugin", "XQSpeechPlugin"]);
  try {
    const r = S.run("--gc-widget"); assert.equal(r.status, 0, r.stdout + r.stderr);
    for (const f of ["XQGameCenterPlugin.swift", "XQWidgetDataPlugin.swift"]) assert.ok(fs.existsSync(path.join(S.T, "ios", "App", "App", f)), f);
    const L = list(S); assert.ok(!L.some(c => OURS.includes(c)) && new Set(L).size === L.length, "重複的、我們的都清掉：" + L.join());
    capSync(S); const v = fs.readFileSync(S.vcP, "utf8");
    assert.ok(v.includes('for name in ["XQGameCenterPlugin", "XQWidgetDataPlugin"]') && /NSClassFromString\(name\) as\? CAPPlugin\.Type/.test(v) && /registerPluginInstance\(type\.init\(\)\)/.test(v));
    /* check-native 在沙盒裡也要過（BridgeVC 有註冊、packageClassList 沒重複） */
    const c = spawnSync(process.execPath, [path.join(S.T, "scripts", "check-native.js")], { encoding: "utf8", cwd: S.T });
    assert.ok(!/✘.*(capacitorDidLoad|packageClassList|registerPluginInstance)/.test(c.stdout), c.stdout.split("\n").filter(l => /✘/.test(l)).join("\n"));
  } finally { fs.rmSync(S.T, { recursive: true, force: true }) }
});
