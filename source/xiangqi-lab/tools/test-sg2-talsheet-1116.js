// 開發者 11/16（天賦頁截圖）「這一頁的排版你重新設計，有夠亂七八糟」「點某個角色的天賦 只會出現那個角色的天賦描述 不是顯示所有的」
//   m/07sg2-siege2.js sg2TalSheet：改成底部面板（sheet）＋自己的樣式 sg2tCss：摘要卡（星塵大字＋兩行規則）、每位一張卡（小頭像、名字、Lv、狀態標籤、重置）、
//     天賦一列一個（左邊名稱＋效果、右邊價錢或「★ 已點亮」）；第三個參數 only＝只看這一位（標題「〇〇的天賦」）。
//   m/07dgl-stamina.js 角色卡的「天賦」、m/07pty-party.js 卡冊每張卡新加的「天賦」列都只看那一位；卡冊最上面、選關的天賦照舊看全隊。
// 這裡把 07sg2 的 sg2TalSheet 抽出來配假的 sheet、SG2G 跑；畫面在本機候選版手機尺寸看過。
// 用法：node --test xiangqi-lab/tools/test-sg2-talsheet-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const rd = f => fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");
const SG = rd("07sg2-siege2.js"), cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + a); return s.slice(i, j) };

function load(tal, dust) {
  const log = { sheets: [], toasts: [] }, DB = { sg2Tal: tal || {} };
  const TALC = { x_swordboy: [{ id: "a1", nm: "鐵輪", cost: 600, d: "俥的攻擊力 +4" }, { id: "a2", nm: "長驅", cost: 800, d: "俥直走 3 格以上去攻擊，這一下攻擊力 +6" }],
    x_miaogirl: [{ id: "b1", nm: "踏雪", cost: 600, d: "傌的體力 +6" }] };
  const TALM = {}, TAL_CK = {}; for (const ck in TALC) for (const t of TALC[ck]) { TALM[t.id] = t; TAL_CK[t.id] = ck }
  const ctx = { console, Math, JSON, esc: s => String(s), store: { get: (k, d) => (k in DB ? DB[k] : d), set: (k, v) => { DB[k] = v } }, toast: t => log.toasts.push(t), vibrate() { }, closeSheet() { }, setTimeout: f => f(), modal() { },
    document: { getElementById: () => ({}), createElement: () => ({}), head: { append() { } } }, gsvCss() { },
    sheet: (t, build) => { const b = { innerHTML: "", addEventListener() { } }; build(b); log.sheets.push({ t, html: b.innerHTML }) },
    SG2G: { TALC, TALM, TAL_CK, TAL_MAX: 2, talNeedL: ck => (ck === "x_swordboy" ? 1 : 16), talWhy: (o, id, d, L) => (L < 16 && TAL_CK[id] === "x_miaogirl" ? "五招都學會（Lv 16）才能點天賦" : d < TALM[id].cost ? "星塵不夠" : "") },
    sg2TalGet: () => DB.sg2Tal, sg2Dust: () => (dust == null ? 700 : dust), sg2DustAdd() { },
    sg2TalMembers: () => [{ ck: "x_swordboy", L: 3, nm: "齊轍" }, { ck: "x_miaogirl", L: 3, nm: "駱躍梅" }] };
  const E = ",true]]),200)})})}", i = SG.indexOf("function sg2tCss(){"), j = SG.indexOf(E, SG.indexOf("function sg2TalSheet(")) + E.length;
  assert.ok(i > 0 && j > i, "07sg2 有 sg2tCss、sg2TalSheet");
  vm.createContext(ctx); vm.runInContext(SG.slice(i, j), ctx);
  return { ctx, log };
}

test("〔行為〕全隊：摘要卡＋每位一張卡；天賦一列一個（名稱、效果靠左，價錢在右）；已點亮、點不了的分得出來", () => {
  const { ctx, log } = load({ x_swordboy: ["a1"] }, 700); ctx.sg2TalSheet(null, "‹ 回雲河七星");
  const { t, html } = log.sheets[0];
  assert.equal(t, "🌌 天賦");
  assert.ok(html.startsWith('<div class="sg2t-sum"><div class="d"><b>700</b><small>星塵</small></div><ul><li>全隊共用；每位最多點亮 2 個</li>'), "摘要卡在最上面");
  assert.equal((html.match(/class="sg2t-c"/g) || []).length, 2, "兩位各一張卡");
  assert.ok(html.includes('<span class="sg2t-tag ok">已點亮 1／2</span><button type="button" class="sg2t-r" data-r="x_swordboy">重置</button>'));
  assert.ok(html.includes('<span class="sg2t-tag">🔒 Lv 16 解鎖</span>'), "還沒解鎖的寫幾級解鎖");
  assert.ok(html.includes('<span class="x"><b>鐵輪</b><span>俥的攻擊力 +4</span></span><span class="p">★ 已點亮</span>'));
  assert.ok(html.includes('class="sg2t-t off" data-t="a2" data-w="星塵不夠"'), "星塵不夠的淡掉，點了說原因");
  assert.ok(html.includes('<span class="p">800 星塵</span>'));
  assert.ok(html.endsWith('<button type="button" class="btn sg2t-back" data-back="1">‹ 回雲河七星</button>'), "最下面一顆返回");
  assert.ok(!/text-align:center/.test(html), "不再置中");
});

test("〔行為〕只看一位：從角色點進來只出現那一位的天賦，標題寫名字", () => {
  const { ctx, log } = load({}, 700); ctx.sg2TalSheet(null, "‹ 回我的角色", "x_miaogirl");
  const { t, html } = log.sheets[0];
  assert.equal(t, "🌌 駱躍梅的天賦");
  assert.equal((html.match(/class="sg2t-c"/g) || []).length, 1);
  assert.ok(html.includes("踏雪") && !html.includes("鐵輪"), "只有這一位的天賦");
});

test("〔原始碼〕角色卡、卡冊每張卡的天賦只看那一位；卡冊最上面照舊看全隊", () => {
  assert.ok(rd("07dgl-stamina.js").includes('sg2TalSheet(()=>dglCard(),"‹ 回我的角色",dglWho())'));
  const P = rd("07pty-party.js");
  assert.ok(P.includes('data-a="tal"><span>天賦</span><b>${(sg2TalGet()[c]||[]).length}／${SG2G.TAL_MAX}</b>'), "卡冊每張卡多一列天賦");
  assert.ok(P.includes('if(a==="tal"){closeSheet();setTimeout(()=>sg2TalSheet(()=>ptySheet(),"‹ 回雲河七星",c),60);return}'));
  assert.ok(P.includes('sg2TalSheet(()=>ptySheet(),"‹ 回雲河七星");'), "最上面那列照舊全隊");
});
