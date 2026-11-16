// 開發者 11/16（雲河七星卡冊截圖）：「讓這頁也能看到角色的體力/靈力/攻擊力/防禦力/天賦/招式」
// 選單：體力、靈力＝每位自己的黑洞數值（元氣、靈力上限）；天賦是全隊共用的，放卡冊最上面一列。
//   m/07pty-party.js：每張卡多一排四格（ptyStatHTML，BHTD.stats 照這位的等級）、一列「招式 n／N ›」點開這位的招式清單（ptySkills）；
//     卡冊最上面一列「天賦（全隊共用）已點亮 n／N ›」開星塵天賦樹（ptyTalHTML），看完回卡冊。
//   m/07bht-td.js bhtdTal 多一個參數＝返回鈕的字（沒給照舊「回選關」）；角色卡（07dgl）傳「回我的角色」。
// 這裡把整支 07pty-party.js 放進 vm，配假的黑洞資料跑；畫面在本機候選版手機尺寸看過。
// 用法：node --test xiangqi-lab/tools/test-pty-stats-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const rd = f => fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");
const SRC = rd("07pty-party.js"), TD = rd("07bht-td.js"), DGL = rd("07dgl-stamina.js");

function load(o) {
  o = o || {}; const log = { sheets: [], tal: [] }, DB = {};
  const BHTD = { CH: { x_swordboy: {}, x_miaogirl: {} }, stats: (c, L) => ({ ck: c, L, hp: 50 + L, sp: 50, spRegen: 5, atk: 1 + L / 100, def: 1.25 }), atkPt: a => Math.round(a * 100), defPt: d => Math.round(100 / d),
    SK: [{ ch: "x_swordboy", lv: 6, nm: "直路衝鋒", cost: 30, d: "俥直走了幾格就扣幾格" }, { ch: "x_swordboy", lv: 1, nm: "一劍破甲", cost: 40, d: "移除敵方 1 顆兵" }, { ch: "x_miaogirl", lv: 1, nm: "躍馬", cost: 20, d: "" }], TAL: [1, 2, 3, 4, 5, 6, 7] };
  const ctx = { console, Math, JSON, Date, setTimeout: f => f(), store: { get: (k, d) => (k in DB ? DB[k] : d), set: (k, v) => { DB[k] = v } }, esc: s => String(s), toast() { }, vibrate() { }, closeSheet() { },
    WX_CHARS: { x_swordboy: { n: "齊轍", nk: "阿轍", pc: "俥", sx: "m" }, x_miaogirl: { n: "駱躍梅", nk: "小梅", pc: "傌", sx: "f" }, x_shuai: { n: "沈方庭", pc: "帥", sx: "m" } }, CHAR_ERA: { x_swordboy: "qin", x_miaogirl: "yuan" },
    eraLabel: k => ({ qin: "秦朝", yuan: "元朝", sanguo: "三國" }[k] || k), xpInfo: () => ({ L: 3 }),
    document: { getElementById: () => ({}), createElement: () => ({}), head: { append() { } } },
    sheet: (t, build) => { const b = { innerHTML: "", querySelector: () => ({}), querySelectorAll: () => [] }; build(b); log.sheets.push({ t, html: b.innerHTML }) },
    dglCss() { }, dglIc: () => "🔒 ", dglMx: () => 53 };
  if (!o.noBh) { ctx.BHTD = BHTD; ctx.bhtdDust = () => ({ t: ["a", "b"] }); ctx.bhtdTal = (back, lab) => log.tal.push(lab) }
  vm.createContext(ctx); vm.runInContext(SRC + "\n;this.__X={PTY,ptyStatHTML,ptyCardHTML,ptyTalHTML,ptyTeamHTML,ptySkills,ptySkPool};", ctx);
  const X = ctx.__X, P = X.PTY.blank(); P.m.x_swordboy = { xp: X.PTY.base(3), at: 0, how: "start" }; P.m.x_miaogirl = { xp: 0, at: 0, how: "ship" }; P.pool = 5; DB.party = P;
  return Object.assign(X, { log, P });
}

test("〔行為〕每位一排三格：靈力上限、攻擊力、防禦力，照這位自己的等級算；體力不再每位各寫各的（全隊一個數，寫在卡冊最上面）", () => {
  const K = load(), a = K.ptyStatHTML("x_swordboy", 3), b = K.ptyStatHTML("x_miaogirl", 1);
  assert.equal(a, '<div class="pty-st"><span><small>靈力上限</small><b>50</b></span><span><small>攻擊力</small><b>103</b></span><span><small>防禦力</small><b>80</b></span></div>', "黑洞的靈力是上限，寫「靈力上限」，跟角色卡上人間存著的「靈力 n／20」分開");
  assert.ok(b.includes("<small>攻擊力</small><b>101</b>") && !a.includes("體力") && !b.includes("體力"), "等級不同，數字不同；每位的卡上沒有體力");
  assert.equal(K.ptyStatHTML("x_shuai", 3), "", "黑洞資料裡沒有這位就不畫");
  assert.equal(load({ noBh: 1 }).ptyStatHTML("x_swordboy", 3), "", "黑洞模組沒載入就不畫，卡冊照樣開得起來");
});

test("〔行為〕卡片：已加入的有三格與可以點的「招式 n／N」；還沒加入的沒有；招式數照這位的等級", () => {
  const K = load(), A = K.ptyCardHTML(K.P, "x_swordboy", 3), B = K.ptyCardHTML(K.P, "x_miaogirl", 3), C = K.ptyCardHTML(K.P, "x_shuai", 3);
  assert.ok(A.includes('class="pty-st"') && A.includes('<button type="button" class="pty-row" data-a="sk"><span>招式</span><b>1／2</b><i aria-hidden="true">›</i></button>'), "齊轍 Lv 3：兩招學會一招");
  assert.ok(B.includes('<b>1／1</b>') && B.includes("<small>攻擊力</small><b>101</b>"), "小梅 Lv 1");
  assert.ok(!C.includes("pty-st") && !C.includes('data-a="sk"') && C.includes("？？？"), "還沒加入的只有剪影那一張");
  const m = A.slice(A.indexOf('<div class="pty-m">'), A.indexOf('<div class="pty-xp"')); assert.ok(!m.includes("招式"), "原本那一行小字裡的「招式 n／N」拿掉，不重複");
  assert.ok(!load({ noBh: 1 }).ptyCardHTML(K.P, "x_swordboy", 3).includes("pty-row"), "沒有黑洞模組時沒有招式列");
});

test("〔行為〕練滿的又正陪你走：按鈕都不用出現，不留一條空的按鈕列；其他人照舊（11/16 取消隊長：每張卡最多兩顆＝＋星輝、帶他出門，沒有「隊長」標籤與「設為隊長」）", () => {
  const K = load(), A = K.ptyCardHTML(K.P, "x_swordboy", 3), B = K.ptyCardHTML(K.P, "x_miaogirl", 3);
  assert.ok(!A.includes('class="pty-a"')); assert.ok(B.includes('class="pty-a"'));
  for (const a of ["give", "look"]) assert.ok(B.includes(`data-a="${a}"`), a);
  for (const h of [A, B]) { assert.ok(!h.includes('data-a="lead"') && !h.includes("隊長"), "沒有隊長標籤、沒有設為隊長鈕"); assert.ok((h.match(/data-a="(?:give|look|lead)"/g) || []).length <= 2, "最多兩顆鈕") }
  assert.ok(SRC.includes("黑洞裡全隊已學會的招都會帶上場") && !SRC.includes("最多 4 招"), "卡冊說明行：全隊招式全部帶上場（11/16 不限 4 招）");
  assert.ok(SRC.includes('[["帶"+ptyTa(L)+"出門",()=>{if(ptySetLook(c))try{toast("🚶 "+ptyNm(c)+"陪你走了")}catch(e){}}],["好",null,true]],"prolog")'), "加入卡只有「帶…出門」「好」（11/17 帶出門後 toast，見 test-pty-join-1117.js）");
  assert.ok(!/function ptySetLead\b/.test(SRC), "ptySetLead 刪掉");
});

test("〔行為〕卡冊最上面一列天賦：寫明全隊共用、已點亮幾個；沒有天賦樹可以開時不畫", () => {
  const K = load(), h = K.ptyTalHTML();
  assert.equal(h, '<button type="button" class="pty-row top" data-top="tal"><span>天賦</span><small>（全隊共用）</small><b><span>已點亮</span> 2／7</b><i aria-hidden="true">›</i></button>');
  assert.equal(load({ noBh: 1 }).ptyTalHTML(), "");
});

test("〔行為〕招式清單：標題是這位的名字；學會的排前面寫耗幾靈，還沒學會的寫幾級學會；有一顆回卡冊", () => {
  const K = load(); K.ptySkills("x_swordboy"); const S = K.log.sheets[0]; assert.equal(S.t, "齊轍的招式");
  const i = S.html.indexOf("一劍破甲"), j = S.html.indexOf("直路衝鋒"); assert.ok(i > 0 && j > i, "學會的在前");
  assert.ok(S.html.includes("40 <span>靈</span>") && S.html.includes("Lv 6 <span>學會</span>") && S.html.includes('<div class="dgl-ski lk">'));
  assert.ok(S.html.includes('id="ptySkB">‹ 回雲河七星</button>'));
  K.ptySkills("x_shuai"); assert.equal(K.log.sheets.length, 1, "沒有招式資料的不開空白清單");
});

test("〔原始碼〕接線：卡冊畫天賦列；點招式開清單、點天賦開天賦樹；天賦樹的返回鈕照從哪裡進來的寫", () => {
  assert.ok(SRC.includes('<p class="pty-m pty-cap">${ptyCapSay(L,ptyXpNd())}</p>`+ptyXpHow(P,L)+ptyTeamHTML()+ptyTalHTML()+PTY.ORDER.map(c=>ptyCardHTML(P,c,L)).join("")'));
  assert.ok(SRC.includes('if(a==="sk"){closeSheet();setTimeout(()=>ptySkills(c),60);return}'));
  assert.ok(SRC.includes('closeSheet();setTimeout(()=>{if(typeof sg2TalSheet==="function"&&typeof SG2G!=="undefined")sg2TalSheet(()=>ptySheet(),"‹ 回雲河七星");else bhtdTal(()=>ptySheet(),"‹ 回雲河七星")},60)'),"11/16 每位專屬天賦：有 v2 開 sg2TalSheet，沒有照舊開 bhtdTal");
  assert.ok(TD.includes("function bhtdTal(back,backL){bhtdCss();") && TD.includes('[[backL||"‹ 回選關",()=>{if(back)back()}]') && TD.includes("bhtdTal(back,backL)},true]]"), "沒給第二個參數照舊「回選關」；重置後重畫也帶著");
  assert.ok(DGL.includes('bhtdTal(()=>dglCard(),"‹ 回我的角色")'));
});

test("〔行為〕卡冊最上面一列全隊體力：就是人間體力的上限、也是進黑洞開局的體力（07dgl dglMx），不能點；沒有黑洞模組時不畫", () => {
  const K = load();
  assert.equal(K.ptyTeamHTML(), '<div class="pty-row top pty-team"><span>全隊體力</span><small>（人間、黑洞都是這個數）</small><b>53</b></div>');
  assert.equal(load({ noBh: 1 }).ptyTeamHTML(), "");
  assert.ok(SRC.includes(".pty-st{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);"), "每位的數值從四格變三格");
});
