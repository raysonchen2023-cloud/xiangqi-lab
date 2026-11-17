// 開發者 11/16「角色等級不能超過修為，這句話玩家看不懂」（選單選「直接講結果」）
// 「🌟 雲河七星」隊伍頁（xiangqi-db/m/07pty-party.js ptySheet／ptyCardHTML）：同一條規則的三處文字改成講結果，不解釋規則。
//   最上面：「修為 Lv 12（角色等級不能超過修為）」→「你的修為 Lv 12」＋一行「夥伴最高練到 Lv 12，你升級才會再往上」
//   夥伴練滿時卡片上：「（到修為上限）」→「（練滿了，等你升級）」
//   練滿還按＋星輝：「已經到修為上限了」→「已經跟你一樣高了，等你升級再練」
// 規則本身（夥伴等級不超過玩家的修為、頂到的那份轉進星輝）沒有變，那部分由 test-party-core.js 測。
// 用法：node --test xiangqi-lab/tools/test-pty-capsay-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path");
const PTY = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07pty-party.js"), "utf8").replace(/\r\n/g, "\n");

test("〔行為〕最上面那一行說明：講夥伴現在最高能練到幾級、怎樣才會再往上；修為滿級時不再說「你升級」", () => {
  const i = PTY.indexOf("const ptyCapSay="), j = PTY.indexOf("\n", i); assert.ok(i > 0);
  const f = new Function(PTY.slice(i, j) + ";return ptyCapSay")();
  assert.equal(f(12), "夥伴最高練到 Lv 12，你升級才會再往上"); assert.equal(f(1), "夥伴最高練到 Lv 1，你升級才會再往上");
  assert.equal(f(100), "夥伴最高練到 Lv 100"); assert.ok(f(57).length <= 24, "一行放得下");
});

test("〔原始碼〕畫面上不再出現「角色等級不能超過修為」「到修為上限」這兩種說法", () => {
  /* 註解裡會引用舊句子，所以只查畫面上會出現的那三種寫法 */
  assert.ok(!PTY.includes("<span>角色等級不能超過修為</span>")); assert.ok(!PTY.includes('"（到修為上限）"')); assert.ok(!PTY.includes('"已經到修為上限了"'));
  assert.ok(PTY.includes('<span>你的修為</span> <b>Lv ${L}</b></span>'), "最上面寫「你的修為」");
  assert.ok(PTY.includes('<p class="pty-m pty-cap">${ptyCapSay(L,ptyXpNd())}</p>'), "說明另外放一行");
});

test("〔原始碼〕夥伴練滿：卡片註記與按＋星輝的提示都改成講結果；練滿的人照舊沒有＋星輝鈕", () => {
  assert.ok(PTY.includes('${top?(L>=100?"（練滿了）":"（練滿了，等你升級）"):""}'));
  assert.ok(PTY.includes('toast(g?`✨ 給了 ${g} 星輝`:"已經跟你一樣高了，等你升級再練")'));
  assert.ok(PTY.includes('${top&&!room?"":`<button type="button" class="btn" data-a="give"${P.pool>0?"":" disabled"}>＋星輝</button>`}'), "11/17 B N17-1：練滿但這一級還沒加滿，照樣給＋星輝鈕；加滿了才沒有");
});

test("〔混合〕11/16 開發者「要怎麼升級？」→ 選單「寫還差幾點＋去哪裡賺」：最上面寫還差幾點；有夥伴練滿時多一行去哪裡賺修為＋去下一盤", () => {
  const i = PTY.indexOf("const ptyCapSay="), j = PTY.indexOf("\n", i);
  const f = new Function(PTY.slice(i, j) + ";return ptyCapSay")();
  assert.equal(f(1, 80), "夥伴最高練到 Lv 1，你的修為再 80 點升 Lv 2，才會再往上");
  assert.equal(f(100, 5), "夥伴最高練到 Lv 100", "滿級不寫還差幾點");
  const a = PTY.indexOf("function ptyXpHow("), b = PTY.indexOf("\n", PTY.indexOf("return`", a));
  const PT = { ORDER: ["x_swordboy", "x_miaogirl"], has: (P, c) => !!P.m[c], lv: (P, c, L) => Math.min(L, P.m[c].lv) };
  const how = new Function("PTY", PTY.slice(a, b) + ";return ptyXpHow")(PT);
  assert.match(how({ m: { x_swordboy: { lv: 1 } } }, 1), /贏 \+40、輸 \+15.*千秋殘局（\+15）.*星門圍城/);
  assert.match(how({ m: { x_swordboy: { lv: 1 } } }, 1), /id="ptyXpGo">♟ 去下一盤</);
  assert.equal(how({ m: { x_swordboy: { lv: 3 } } }, 5), "", "沒有人練滿就不出現");
  assert.equal(how({ m: { x_swordboy: { lv: 100 } } }, 100), "", "滿級不出現");
  assert.ok(PTY.includes('const g=b.querySelector("#ptyXpGo");if(g)g.onclick=()=>{try{vibrate(5)}catch(e){}closeSheet();location.hash="#/cpu"}'), "去下一盤＝關卡冊、到電腦對局");
  /* 點數要跟 addXP 一致 */
  const LEG = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07-legend.js"), "utf8");
  const ALL = fs.readdirSync(path.join(__dirname, "..", "..", "xiangqi-db", "m")).filter(x => x.endsWith(".js")).map(x => fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", x), "utf8")).join("\n");
  assert.ok(ALL.includes('st.result.w===st.human?40:15,"對局"') || /addXP\(st\.result\.w===st\.human\?40:15/.test(ALL), "對局贏 40 輸 15");
  assert.ok(/addXP\(15,"千秋殘局"/.test(ALL), "千秋殘局 15"); assert.ok(LEG.length > 0);
});
