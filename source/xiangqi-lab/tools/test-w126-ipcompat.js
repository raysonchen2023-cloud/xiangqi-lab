// W126（開發者 11/26「包交出後就修」）：iPhone 版在 iPadOS 26 相容視窗裡，左上紅黃綠視窗鈕蓋住頂欄返回鈕、首頁星晷。
// 00-util xqIpCompatOf 判斷「原生 App＋iPad（或 Macintosh＋多點觸控）＋手機寬」，html 加 xq-ipcompat，m.css 讓 #topbar 左邊多留 76px。
// 不開瀏覽器：判斷函式從 00-util.js 抽出來在 vm 跑；開關 class 的那段用假 document 跑。用法 node --test xiangqi-lab/tools/test-w126-ipcompat.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const DB = path.join(__dirname, "../../xiangqi-db");
const U = fs.readFileSync(path.join(DB, "m/00-util.js"), "utf8").replace(/\r\n/g, "\n"), CSS = fs.readFileSync(path.join(DB, "m.css"), "utf8");
const pick = re => { const m = U.match(re); assert.ok(m, "00-util.js 找不到 " + re); return m[0] };
const FN = [pick(/^function xqNat\(\)\{.*$/m), pick(/^function xqIpCompatOf\(.*$/m), pick(/^function xqIpCompat\(\)\{.*$/m)].join("\n");
const TOG = pick(/^if\(typeof document!=="undefined"&&document\.documentElement\)\{const f=\(\)=>\{try\{document\.documentElement\.classList\.toggle\("xq-ipcompat".*$/m);

const UA = {
  ipadApp: "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 XQQianqiuApp/1",
  macTouchApp: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) XQQianqiuApp/1",
  iphoneApp: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 XQQianqiuApp/1",
  ipadSafari: "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  androidApp: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 XQQianqiuApp/1",
};
function run(ua, tp, w, native) {
  const cls = new Set(), ev = {};
  const ctx = vm.createContext({
    window: native ? { XQ_NATIVE: true } : {}, navigator: { userAgent: ua, maxTouchPoints: tp }, innerWidth: w,
    document: { documentElement: { classList: { toggle: (c, on) => { on ? cls.add(c) : cls.delete(c) } } } },
    addEventListener: (t, f) => { ev[t] = f },
  });
  vm.runInContext(FN + "\n" + TOG, ctx);
  return { on: () => cls.has("xq-ipcompat"), ctx, ev };
}

test("判斷：只有原生 App 在 iPad 相容視窗（手機寬）才加；iPhone、真 iPad 寬度、Safari 網頁版、Android、沒觸控的 Mac 都不加", () => {
  assert.equal(run(UA.ipadApp, 5, 390, false).on(), true, "iPad UA、手機寬");
  assert.equal(run(UA.macTouchApp, 5, 430, false).on(), true, "iPadOS 報 Macintosh＋多點觸控");
  assert.equal(run(UA.ipadSafari, 5, 390, true).on(), true, "UA 沒帶 XQQianqiuApp 但 native-bridge 設了 XQ_NATIVE");
  assert.equal(run(UA.iphoneApp, 5, 390, false).on(), false, "iPhone");
  assert.equal(run(UA.ipadApp, 5, 820, false).on(), false, "真 iPad 寬度");
  assert.equal(run(UA.ipadSafari, 5, 390, false).on(), false, "Safari 網頁版：有網址列、沒有視窗鈕");
  assert.equal(run(UA.androidApp, 5, 390, false).on(), false, "Android");
  assert.equal(run(UA.macTouchApp, 0, 430, false).on(), false, "Mac 沒觸控");
  assert.equal(run(UA.ipadApp, 5, 500, false).on(), false, "500 起不算手機寬");
  assert.equal(run(UA.ipadApp, 5, 0, false).on(), false, "量不到寬度不加");
});

test("轉向、改視窗大小時重算：手機寬→寬→手機寬，class 跟著加、拿掉、再加", () => {
  const r = run(UA.ipadApp, 5, 390, false);
  assert.equal(typeof r.ev.resize, "function", "有掛 resize");
  assert.equal(r.on(), true);
  r.ctx.innerWidth = 1024; r.ev.resize(); assert.equal(r.on(), false);
  r.ctx.innerWidth = 375; r.ev.resize(); assert.equal(r.on(), true);
});

test("m.css：xq-ipcompat 時 #topbar 左邊留 76px，寫在檔尾、!important，蓋得過 html body.bh-field #topbar 的內距", () => {
  const rule = "html.xq-ipcompat body #topbar{padding-left:76px!important}";
  const i = CSS.lastIndexOf(rule);
  assert.ok(i > 0, "有這條規則");
  assert.ok(i > CSS.lastIndexOf("html body.bh-field #topbar{"), "寫在 bh-field 頂欄之後");
  assert.equal(CSS.slice(0, i).split("{").length, CSS.slice(0, i).split("}").length, "不在 @media 或其他區塊裡面");
  assert.match(CSS, /\.topbar\{[^}]*padding:calc\(var\(--safeT\) \+ 6px\) 6px 6px/, "一般情況頂欄內距照舊");
});
