"use strict";
/* 開發者 11/24「開工單從程式上擋」：測試流量（本機、區網、預覽站、測試房、模擬器）不記、不送卡住紀錄；正式站和真機照舊。
   用 vm 跑 m/05b-save.js 真的 stkTestEnv／stkOn；iOS 模擬器的 XQSim/1 標記看 XQBridgeViewController.swift（兩份一樣）。 */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SAVE = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "05b-save.js"), "utf8");
const fn = (name) => { const m = SAVE.match(new RegExp("^function " + name + "\\(.*$", "m")); assert.ok(m, "抓得到 " + name); let s = m[0], i = SAVE.indexOf(s) + s.length;
  while (!/^\s*$|^(function|const|let|\/\*)/.test(SAVE.slice(i + 1).split("\n")[0])) { const ln = SAVE.slice(i + 1).split("\n")[0]; s += "\n" + ln; i += ln.length + 1 } return s };
function load({ origin = "https://raysonchen2023-cloud.github.io", ua = "Mozilla/5.0 (iPhone)", nat = false, netRoot = null, stkOff = false, dev = false } = {}) {
  const c = { location: { origin, hostname: new URL(origin).hostname }, navigator: { userAgent: ua, webdriver: false }, window: { XQ_NATIVE: nat },
    localStorage: { getItem: (k) => (k === "xq_netRoot" ? netRoot : null) }, store: { get: (k, d) => (k === "stkOff" ? stkOff : d) },
    APP_HOME: "https://raysonchen2023-cloud.github.io/xiangqi-lab/", xqNat: () => nat, DEVMODE: () => dev, fnTest: () => false, URL, String };
  vm.createContext(c); vm.runInContext(fn("stkTestEnv") + "\n" + fn("stkOn") + "\n;this.X={stkTestEnv,stkOn};", c); return c.X;
}
test("網頁版：只有正式站送；本機、區網、預覽站、開了測試房都不送", () => {
  assert.equal(load().stkOn(), true, "正式站照舊送");
  for (const o of ["http://localhost:8838", "http://127.0.0.1:8933", "http://192.168.1.104:8000", "https://77b724dd.xiangqi-preview.pages.dev", "https://xiangqi-cdn.pages.dev"])
    assert.equal(load({ origin: o }).stkOn(), false, o + " 不送");
  assert.equal(load({ netRoot: "xqlab-test/v1" }).stkOn(), false, "測試房不送");
  assert.equal(load({ stkOff: true }).stkOn(), false, "玩家自己關掉照舊不送");
});
test("原生 App：真機送；iOS 模擬器（XQSim/1）、Android 模擬器（sdk_gphone…）不送；本機網址不算測試", () => {
  const ios = "Mozilla/5.0 (iPhone; CPU iPhone OS 27_2 like Mac OS X) AppleWebKit/605.1.15 XQQianqiuApp/1";
  assert.equal(load({ origin: "http://127.0.0.1:47821", nat: true, ua: ios }).stkOn(), true, "iPhone 真機（App 的頁面在 127.0.0.1）照舊送");
  assert.equal(load({ origin: "http://127.0.0.1:47821", nat: true, ua: ios + " XQSim/1" }).stkOn(), false, "iOS 模擬器不送");
  const and = (m) => `Mozilla/5.0 (Linux; Android 16; ${m} Build/BP2A; wv) AppleWebKit/537.36 Chrome/133.0 Mobile Safari/537.36 XQQianqiuApp/1`;
  assert.equal(load({ origin: "https://localhost", nat: true, ua: and("Pixel 9") }).stkOn(), true, "Android 真機照舊送");
  for (const m of ["sdk_gphone64_arm64", "sdk_gphone64_x86_64", "Android SDK built for x86"]) assert.equal(load({ origin: "https://localhost", nat: true, ua: and(m) }).stkOn(), false, m + " 不送");
});
test("〔原始碼〕iOS 模擬器在識別字串加 XQSim/1（只在模擬器，兩份 Swift 一樣）", () => {
  const a = fs.readFileSync(path.join(ROOT, "xiangqi-ios", "native", "ios", "XQBridgeViewController.swift"), "utf8"), b = fs.readFileSync(path.join(ROOT, "xiangqi-ios", "ios", "App", "App", "XQBridgeViewController.swift"), "utf8");
  assert.equal(a, b);
  assert.match(a, /#if targetEnvironment\(simulator\)\n[^\n]*\n\s*descriptor\.appendedUserAgentString = \(descriptor\.appendedUserAgentString \?\? "XQQianqiuApp\/1"\) \+ " XQSim\/1"\n\s*#endif/);
});
