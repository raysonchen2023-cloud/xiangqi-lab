// 11/17 Windows 測試員 D P3-1（P3），開發者選單選「小帥那句兼顧節氣」：
//   立冬那幾天，換季小籤寫「❄ 冬天到了」（照節氣，sw7CardSea），首頁圖照 11/9 的分界還是黃柳秋景（SW7_HSEA 立冬＝autumn，不動），
//   小帥卻說「哇，換季了！柳樹都變黃了，葉子掉到河裡了！」，像還在秋天。
//   修法：07w7 sw7SeaSay(節氣, 圖的季節)：小籤季節跟圖季節不一樣的那幾天（立冬：冬／秋景；立秋、處暑：秋／夏景）說兼顧兩邊的那句（SW7_SEA_MIX）；
//   一樣就照舊 SW7_SEA_TXT 的 say。圖、飄的東西、小籤都不動。
// 不開瀏覽器：vm 跑 07w7 的季節表與 sw7SeaSay、用假元素跑 sw7SeaPlay。用法：node --test xiangqi-lab/tools/test-season-say-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), W7 = fs.readFileSync(path.join(ROOT, "xiangqi-db/m/07w7-seasons.js"), "utf8").replace(/\r\n/g, "\n"), L = W7.split("\n");
const grab = head => { const i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n") };
const SRC = [grab("const SW7_SPRING="), grab("const SW7_HSEA="), grab("const SW7_SEA_TXT="), grab("function sw7CardSea("), grab("const SW7_SEA_MIX="), grab("function sw7SeaSay("), grab("function sw7SeaPlay(")].join("\n");
const TERMS = ["立春", "雨水", "驚蟄", "春分", "清明", "穀雨", "立夏", "小滿", "芒種", "夏至", "小暑", "大暑", "立秋", "處暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"];
function kit(term, extra) {
  const said = [], els = [];
  const mk = () => { const e = { style: { setProperty() { } }, classList: { add() { }, remove() { } }, setAttribute() { }, innerHTML: "", remove() { } }; els.push(e); return e };
  const env = { sw7RM: () => true, performance: { now: () => 0 }, requestAnimationFrame: () => 0, document: { createElement: mk }, esc: s => String(s), setTimeout: f => f(),
    BOT: { say: t => said.push(t) }, SW7_PAGES: [{ k: "home" }], sw7TermFor: () => term, window: {} };
  const names = Object.keys(env);
  const o = new Function(...names, (extra || SRC) + ";return{SW7_HSEA,SW7_SEA_TXT,sw7SeaPlay,sw7SeaSay:typeof sw7SeaSay==='function'?sw7SeaSay:null}")(...names.map(k => env[k]));
  return Object.assign(o, { said, els, play: sea => { o.sw7SeaPlay({ append() { } }, { isConnected: false, style: {} }, sea); return els.find(e => /<b>/.test(e.innerHTML)) } });
}

/* 11/17 晚開發者選單「季節照節氣、立冬起就是冬景」：SW7_HSEA 改成跟小籤（sw7CardSea）同一套，圖跟小籤不會再不同季，兼顧的那句（SW7_SEA_MIX）留著但用不到 */
test("〔重現〕立冬：小籤冬天、圖也是冬景、小帥照冬天那句", () => {
  const K = kit("立冬"); const slip = K.play(K.SW7_HSEA["立冬"]);
  assert.equal(K.SW7_HSEA["立冬"], "winter", "圖改照節氣");
  assert.match(slip.innerHTML, /❄ 冬天到了/, "小籤不動");
  assert.deepEqual(K.said, [K.SW7_SEA_TXT.winter.say]);
  assert.ok(!/上限/.test(K.said[0]));
});

test("〔全節氣〕圖跟小籤一律同一季：小帥照那一季的 say（立秋、處暑、立冬也一樣）", () => {
  const K = kit("");
  for (const t of TERMS) {
    const sea = K.SW7_HSEA[t], got = K.sw7SeaSay(t, sea);
    assert.equal(got, K.SW7_SEA_TXT[sea].say, t);
  }
  assert.equal(K.sw7SeaSay("", "spring"), K.SW7_SEA_TXT.spring.say, "節氣還不知道：照圖");
});

test("〔照舊〕圖換季那幾天（白露、小雪、立春、立夏）小帥那句跟以前一模一樣；飄的東西照圖的季節", () => {
  for (const [t, sea] of [["白露", "autumn"], ["小雪", "winter"], ["立春", "spring"], ["立夏", "summer"]]) { const K = kit(t); K.play(sea); assert.deepEqual(K.said, [K.SW7_SEA_TXT[sea].say], t) }
  assert.ok(W7.includes('const kind=sea==="autumn"?"leaf":sea==="winter"?"frost":"petal"'), "飄的東西照圖的季節（沒動）");
});

test("〔對照〕拿掉修補（舊 sw7SeaPlay 直接說 T.say）：立冬還是「柳樹都變黃了」", () => {
  const old = SRC.replace('BOT.say(say,5);else window.dispatchEvent(new CustomEvent("xq-bot-said",{detail:say}))', 'BOT.say(T.say,5);else window.dispatchEvent(new CustomEvent("xq-bot-said",{detail:T.say}))');
  assert.notEqual(old, SRC);
  const K = kit("立冬", old); K.play("autumn"); assert.deepEqual(K.said, ["哇，換季了！柳樹都變黃了，葉子掉到河裡了！"]);
});
