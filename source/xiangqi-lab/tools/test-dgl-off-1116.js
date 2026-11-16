// 開發者 11/16：「在首頁點選角色有一個人間體力和靈力。點進去我的角色頁又有不同數值的體力，先直接拿掉人間的體力靈力設定，太亂了」
// 選單：關掉並藏起來、存檔保留；二十八宿改成「打贏星門圍城的關亮一宿」。同日「這邊也要改成前面說的bar和排版」「不能在任何地方寫上限」。
//   m/07dgl-stamina.js：DGL_HUMAN=false → dglUserOff 一律 true（不扣、不退場、沒有修為加成）、星芒不再增加也不再變開局靈力、設定開關與頂欄兩條不畫；
//   角色卡、我的角色頁「黑洞裡的你」有黑洞新規則時用卡冊同一組四條（07pty ptyStatHTML），天賦開 sg2TalSheet、招式開 ptySkills；
//   二十八宿可以點亮的宿數＝星門圍城第一次打贏過的關數－已點亮的宿數（dglXiuWins／dglXiuLeft／dglXiuLight 第三個參數）。
// 人間體力本身的規則照舊在 test-dgl.js（載入時把開關打開）。畫面在本機候選版手機尺寸看過。
// 用法：node --test xiangqi-lab/tools/test-dgl-off-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const rd = f => fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");
const SRC = rd("07dgl-stamina.js");

function load(st) {
  st = st || {};
  const ctx = { console, Math, JSON, Date, Object, Set, isFinite, store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } }, esc: s => String(s), toast() { }, vibrate() { } };
  vm.createContext(ctx); vm.runInContext(SRC + "\n;this.__X={DGL_HUMAN,dglUserOff,dglLive,dglXmTake,dglXP,dglSetRow,dglXiuWins,dglXiuLeft,dglXiuLight};", ctx); return Object.assign(ctx.__X, { _st: st });
}

test("〔行為〕人間體力關掉：一律當成關閉、沒有修為加成；星芒不再增加、不再變開局靈力；設定裡沒有開關", () => {
  const C = load({ dgl: { x: 12, t: 0 } });
  assert.equal(C.DGL_HUMAN, false);
  assert.equal(C.dglUserOff(), true, "就算沒在設定關掉也當成關閉");
  assert.equal(C.dglLive(), false, "不扣、不退場、不加成");
  assert.equal(C.dglXmTake(10, 100, 10), 0, "星芒不再變開局靈力");
  C.dglXP("殘局", true); assert.equal(C._st.dgl.x, 12, "解題不再給星芒（存檔裡原本的星芒留著）");
  assert.equal(C.dglSetRow(), "", "設定裡不畫平日體力開關");
});

test("〔行為〕二十八宿：可以點亮的宿數＝星門圍城第一次打贏過的關數－已點亮；同一關不同難度只算一次；用星芒點亮過的照舊", () => {
  const C = load(), G = { c: { 1: { w: 2, l: 0 }, 2: { w: 0, l: 3 } }, h: { 1: { w: 1 } }, v2: { 3: { 1: { w: 1 }, 3: { w: 1 } }, 31: { 1: { w: 0, l: 1 } }, 32: { 2: { w: 1 } } } };
  assert.equal(C.dglXiuWins(G), 3, "第 1、3、32 關（第 1 關易中與難只算一次、第 2、31 關沒贏）");
  assert.equal(C.dglXiuWins(null), 0); assert.equal(C.dglXiuWins("壞的"), 0);
  assert.equal(C.dglXiuLeft({ t: 0 }, G), 3);
  assert.equal(C.dglXiuLeft({ t: (1 << 0) | (1 << 5) }, G), 1, "已經亮了兩宿");
  assert.equal(C.dglXiuLeft({ t: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) }, G), 0, "用星芒亮得比勝場多也不會變負的");
  const o = { t: 0, x: 0 }; let R = C.dglXiuLight(o, 4, 1);
  assert.equal(R.ok, true, "有勝場就能點亮，不用星芒"); assert.equal(o.t, 1 << 4); assert.equal(o.x, 0, "不扣星芒");
  R = C.dglXiuLight(o, 5, 0); assert.deepEqual([R.ok, R.why], [false, "win"], "沒有可用的勝場");
  R = C.dglXiuLight({ t: 0, x: 0 }, 5); assert.deepEqual([R.ok, R.why], [false, "poor"], "沒給第三個參數＝照舊花星芒（測試 test-dgl 用）");
});

test("〔原始碼〕角色卡、黑洞裡的你：有黑洞新規則就用卡冊四條，不寫「上限」、不畫人間兩條；天賦、招式接新規則", () => {
  const card = SRC.slice(SRC.indexOf("function dglCard(){"), SRC.indexOf("/* 角色卡的天賦、技能兩列"));
  assert.ok(card.includes('const NEW=typeof SG2G!=="undefined"&&typeof ptyStatHTML==="function",ad=NEW?dglCardSV():dglCardAD(lv);'));
  assert.ok(card.includes("const ts=NEW?dglCardTS2():dglCardTS(lv);"));
  assert.ok(card.includes('if(!DGL_HUMAN){}else if(off)red=') && card.includes('const xs=!DGL_HUMAN?"":'), "人間兩條不畫");
  assert.ok(card.includes('sg2TalSheet(()=>dglCard(),"‹ 回我的角色")') && card.includes("ptySkills(dglWho())"));
  const off = card.slice(card.indexOf("if(!DGL_HUMAN)more="), card.indexOf("const ts=NEW")).replace(/\/\*[^]*?\*\//g, "");   /* 註解不算畫面上的字 */
  assert.ok(off.length > 0 && !off.includes("上限") && !off.includes("星芒") && !off.includes("定軌力"), "細則不寫上限、星芒、定軌力");
  const me = SRC.slice(SRC.indexOf("function dglMeCard(){"), SRC.indexOf("  try{const c=dglName();", SRC.indexOf("function dglMeCard(){"))).replace(/\/\*[^]*?\*\//g, "");
  assert.ok(me.includes("ptyStatHTML(c,lv)") && !me.includes("上限") && !me.includes("每回合回靈") && !me.includes("星芒"), "黑洞裡的你＝四條，沒有上限、每回合回靈、星芒");
  assert.ok(SRC.includes("if(DGL_HUMAN&&sm&&!sm.querySelector(\".dgl-bars\"))"), "頂欄頭像下不加兩條");
  const G = rd("07grw-growth.js");
  assert.ok(G.includes("const GRW_ON=true,GRW_V=2,") && G.includes("o.r=u.hp;o.x=SG2G.spMaxOf(L);o.atk=u.atk;o.def=u.def;"), "對局後的成長提示也用卡冊同一套數字；舊快照不拿來比");
  assert.ok(!/上限照等級/.test(rd("07sg2-siege2.js")) && rd("07sg2-siege2.js").includes("每位夥伴各自一份（多少照等級）"), "黑洞規則說明不寫上限");
});
