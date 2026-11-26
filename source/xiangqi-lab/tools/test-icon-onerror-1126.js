/* W152（11/26）圖示載不到時的備援（m/02-shell.js ETIMG 的 onerror）：
   原本 onerror 用正規式 /\/classic\//，寫在模板字串裡，\/ 被當成跳脫、輸出成 //classic//，後半段變成註解、整段語法錯誤；
   正式站進十州棋館時主控台兩次 SyntaxError: Unexpected end of input，圖示載不到時改抓經典版、再換表情文字的備援完全不會跑。
   這支：① 真的組出 ETIMG 的 HTML，把 onerror 拿去 new Function 編譯、用假的 img 實際跑兩次（第一次改抓經典版、第二次換成表情文字或舊圖）；
         ② 掃所有 m/*.js 的 onerror：裡面不能有反斜線（寫在模板字串或一般字串裡都會被當成跳脫吃掉，組出來的跟寫的不一樣）。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m");
const SH = fs.readFileSync(path.join(M, "02-shell.js"), "utf8");

function etimg() {
  const line = SH.split("\n").find((l) => l.startsWith("const ETIMG="));
  assert.ok(line, "02-shell.js 要有 const ETIMG=");
  const c = { icoSrc: (n) => "data/icons/qin/" + n + ".webp" }; vm.createContext(c);
  vm.runInContext(line.replace(/^const ETIMG=/, "this.ETIMG="), c);
  return c.ETIMG;
}
const attr = (html) => { const m = html.match(/onerror="([^"]*)"/); assert.ok(m, "要有 onerror：" + html.slice(0, 80)); return m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&") };
function fakeImg(src) { const img = { dataset: {}, src, removed: [], replaced: null, classList: { remove(k) { img.removed.push(k) } }, replaceWith(n) { img.replaced = n } }; return img }
const docStub = { createTextNode: (t) => ({ text: t }) };

test("ETIMG 組出來的 onerror 編譯得過（不是語法錯誤）", () => {
  const E = etimg();
  for (const [n, old, emo] of [["journey", "", "🗺"], ["cpu", "data/icons/old/cpu.png", "🤖"]]) {
    const code = attr(E(n, old, emo));
    assert.doesNotThrow(() => new Function("document", code), "onerror 要編譯得過：" + code);
    assert.ok(!code.includes("//classic//"), "不能出現 //classic//（反斜線被吃掉的樣子）");
  }
});

test("備援真的會跑：沒有舊圖時，第一次失敗改抓經典版圖示，經典版也失敗就換成表情文字", () => {
  const code = attr(etimg()("journey", "", "🗺")), run = new Function("document", code);
  const img = fakeImg("https://example.test/data/icons/qin/journey.webp");
  run.call(img, docStub); assert.equal(img.dataset.c, 1); assert.equal(img.src, "data/icons/classic/journey.webp", "改抓經典版");
  run.call(img, docStub); assert.deepEqual(img.replaced, { text: "🗺" }, "經典版也載不到：換成表情文字");
});

test("備援真的會跑：有舊圖時，經典版失敗後先換舊圖、舊圖也失敗才換表情文字；本來就是經典版的不再抓一次經典版", () => {
  const code = attr(etimg()("cpu", "data/icons/old/cpu.png", "🤖")), run = new Function("document", code);
  let img = fakeImg("https://example.test/data/icons/qin/cpu.webp");
  run.call(img, docStub); assert.equal(img.src, "data/icons/classic/cpu.webp");
  run.call(img, docStub); assert.equal(img.dataset.f, 1); assert.equal(img.src, "data/icons/old/cpu.png", "換舊圖"); assert.deepEqual(img.removed, ["eic"]);
  run.call(img, docStub); assert.deepEqual(img.replaced, { text: "🤖" }, "舊圖也載不到：換成表情文字");
  img = fakeImg("https://example.test/data/icons/classic/cpu.webp"); run.call(img, docStub);
  assert.notEqual(img.dataset.c, 1, "本來就是經典版：不再改抓經典版"); assert.equal(img.src, "data/icons/old/cpu.png");
});

test("所有 m/*.js 的 onerror 都沒有反斜線（寫在字串裡會被當成跳脫吃掉）", () => {
  const bad = [];
  for (const f of fs.readdirSync(M).filter((f) => f.endsWith(".js"))) {
    const s = fs.readFileSync(path.join(M, f), "utf8");
    for (const m of s.matchAll(/onerror=(["'])((?:(?!\1).)*)\1/g)) if (m[2].includes("\\")) bad.push(f + "：" + m[2].slice(0, 60));
  }
  assert.deepEqual(bad, []);
});
