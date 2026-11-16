// 11/17 iPhone 模擬器測試第 6 項：首頁上方寫「立冬」，卻跳出「🍂 秋天到了」換季小籤。
//   原因：07w7 換季轉場（sw7SeaTurn → sw7SeaPlay）的小籤用的是「首頁換哪一張季節圖」那一套 SW7_HSEA（立秋、處暑柳樹還綠算夏，立冬才轉黃算秋），
//   跟頂端節氣（tdTerm）不是同一套。
//   修法：小籤（大字、古詩文、出處）的季節改照節氣算——立春～穀雨春、立夏～大暑夏、立秋～霜降秋、立冬～大寒冬（sw7CardSea，用 07w7 原本的 SW7_SPRING／SUMMER／WINTER）；
//   換哪一張圖、飄的東西、小帥那句（講的是圖上看到的）照舊跟著圖，所以每天都玩的人看到的跟以前一樣（圖換季那幾天：白露、小雪、立春、立夏，兩套剛好同一季）。
// 不開瀏覽器：把 07w7 的季節表、sw7CardSea、sw7SeaPlay 切出來，用假元素跑。用法：node --test xiangqi-lab/tools/test-season-card-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const W7 = rd("xiangqi-db/m/07w7-seasons.js"), L = W7.split("\n");
const grab = head => { const i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n") };
const SRC = [grab("const SW7_SPRING="), grab("const SW7_HSEA="), grab("const SW7_SEA_TXT="), grab("function sw7CardSea("), grab("const SW7_SEA_MIX="), grab("function sw7SeaSay("), grab("function sw7SeaPlay(")].join("\n");
const TERMS = ["立春", "雨水", "驚蟄", "春分", "清明", "穀雨", "立夏", "小滿", "芒種", "夏至", "小暑", "大暑", "立秋", "處暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"];

function kit(term) {
  const said = [], els = [];
  const mk = () => { const e = { style: { setProperty() { } }, classList: { add() { }, remove() { }, contains: () => false }, setAttribute() { }, innerHTML: "", remove() { } }; els.push(e); return e };
  const env = { sw7RM: () => true, performance: { now: () => 0 }, requestAnimationFrame: () => 0, document: { createElement: mk }, esc: s => String(s), setTimeout: f => f(),
    BOT: { say: t => said.push(t) }, SW7_PAGES: [{ k: "home" }], sw7TermFor: () => term, window: {} };
  const names = Object.keys(env);
  const o = new Function(...names, SRC + ";return{sw7CardSea,SW7_HSEA,SW7_SEA_TXT,sw7SeaPlay}")(...names.map(k => env[k]));
  const P = { append() { } }, ov = { isConnected: false, style: {} };
  return Object.assign(o, { said, els, play: sea => { o.sw7SeaPlay(P, ov, sea); return els.find(e => /<b>/.test(e.innerHTML)) } });
}

test("〔純計算〕小籤的季節照節氣：立春、立夏、立秋、立冬起算", () => {
  const K = kit(""), S = t => K.sw7CardSea(t);
  TERMS.forEach((t, i) => assert.equal(S(t), ["spring", "summer", "autumn", "winter"][Math.floor(i / 6)], t));
  assert.equal(S(""), "", "節氣還不知道：交回原本的");
});

test("〔行為〕首頁頂端「立冬」：小籤寫「冬天到了」，不是「秋天到了」；圖還是秋景，飄落葉、小帥說立冬了柳葉才剛轉黃", () => {
  const K = kit("立冬"); assert.equal(K.SW7_HSEA["立冬"], "autumn", "立冬的首頁圖照舊是秋景（柳葉轉黃）");
  const slip = K.play(K.SW7_HSEA["立冬"]);
  assert.match(slip.innerHTML, /冬天到了/); assert.ok(!/秋天到了/.test(slip.innerHTML));
  assert.match(slip.innerHTML, /歲寒，然後知松柏之後彫也/, "古詩文跟著小籤的季節");
  /* 11/17 D P3-1 開發者選單「小帥那句兼顧節氣」：圖上是黃柳秋景、小籤寫冬天，小帥說「立冬了，柳葉才剛轉黃」（test-season-say-1117.js 細測） */
  assert.deepEqual(K.said, ["哇，立冬了！柳葉才剛轉黃，一片一片飄到河裡了！"], "小帥那句兼顧節氣與圖");
  assert.ok(!/上限/.test(slip.innerHTML));
});

test("〔照舊〕圖換季的那幾天（白露、小雪、立春、立夏），小籤跟以前一模一樣", () => {
  for (const [t, sea] of [["白露", "autumn"], ["小雪", "winter"], ["立春", "spring"], ["立夏", "summer"]]) {
    const K = kit(t); assert.equal(K.SW7_HSEA[t], sea); const T = K.SW7_SEA_TXT[sea];
    assert.equal(K.play(sea).innerHTML, `<b>${T.e} ${T.n}</b><q>${T.q}</q><small>${T.s}</small>`, t);
  }
});

test("〔照舊〕換哪一張圖仍是 SW7_HSEA（sw7SeaNow 沒動）", () => {
  assert.ok(W7.includes('function sw7SeaNow(){try{const o=SW7_PAGES.find(x=>x.k==="home");return SW7_HSEA[sw7TermFor(null,o)]||"spring"}catch(e){return""}}'));
  assert.ok(W7.includes("C=SW7_SEA_TXT[sw7CardSea(sw7TermFor(null,SW7_PAGES.find(x=>x.k===\"home\")))]||T"), "小籤問頂端同一套節氣（sw7Term＝tdTerm）");
});
