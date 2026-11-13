// 開發者 11/12「嚴格禁止電腦虛擬測試玩家跑到正式大廳」：net.js 選大廳房間的規則
// 只有「正式站上、不是自動化瀏覽器、沒設測試房」才進正式大廳；本機網址、自動化瀏覽器一律進測試房；測試房設定有沒有加引號都認得
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "net.js"), "utf8");
const i = SRC.indexOf("let ROOT="), j = SRC.indexOf("const MQA=", i);
/* 11/13：選房間那行多看 window.Capacitor（App 裡不套用本機網址那條），這裡給一個空的 window（瀏覽器），不然會丟錯、被 try 吞掉、一律留在正式大廳 */
const room = (host, netRoot, webdriver) => new Function("localStorage", "location", "navigator", "window", SRC.slice(i, j) + ";return ROOT")(
  { getItem: k => (k === "xq_netRoot" && netRoot != null ? netRoot : null) }, { hostname: host }, { webdriver: !!webdriver, userAgent: "" }, {});
const LIVE = "xqlab-r7k2q/v1", SITE = "raysonchen2023-cloud.github.io";

test("正式站上的真人才進正式大廳", () => {
  assert.equal(room(SITE, null, false), LIVE);
});
test("本機網址一律進測試房（不管有沒有設 xq_netRoot）", () => {
  for (const h of ["localhost", "127.0.0.1", "[::1]", "app.localhost", "192.168.1.5", "10.0.0.8"]) assert.notEqual(room(h, null, false), LIVE, h);
});
test("自動化瀏覽器（navigator.webdriver）就算開正式站也進測試房", () => {
  assert.notEqual(room(SITE, null, true), LIVE);
});
test("測試房設定加引號、沒加引號都認得（11/12 棋友a3d9 就是沒加引號掉進正式大廳）", () => {
  assert.equal(room(SITE, JSON.stringify("xq_test"), false), "xqlab-test-xq_test/v1");
  assert.equal(room(SITE, "xq_test", false), "xqlab-test-xq_test/v1");
});
