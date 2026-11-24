/* W89（11/24）開發者在 iMac Claude 1 的選單選 Gemini 文案 2「掌門覆盤：角色化的賽後檢討」。
   Check（待辦總表）：中英文都有、十派各至少一組、輸棋不嘲諷；主修門派換人、沒拜師用夥伴；用現有立繪。
   07z9o-mentor.js 整支在 vm 裡跑（假的 ptyGet、OSC、WX_CHARS）；十派掌門名單從 07z9-school.js 的 MST 讀，不在測試裡寫死（行為）；
   m.html 引入順序、10-db.js 與 08b-cpugame.js 的接線用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", f), "utf8");
const MN = rd("m/07z9o-mentor.js"), SCH = rd("m/07z9-school.js");
const MST = [...SCH.matchAll(/\{id:"(zm_[a-z_]+)",sid:"([a-z_]+)",sec:"[a-z_]+",nm:"([^"]+)",en:"([^"]+)"/g)].map((m) => ({ id: m[1], sid: m[2], nm: m[3], en: m[4] }));
function load({ look = "x_swordboy", act = "", en = false } = {}) {
  const c = { MST, LOOK: look, ACT: act, EN: en }; vm.createContext(c);
  vm.runInContext(`const ptyGet=()=>({look:LOOK});const oscGet=()=>({});const OSC={MST,act:(o,c)=>c===LOOK?ACT:""};
    const oscEn=()=>EN;const oscSchE=id=>({nm:(EN?"School ":"")+id+"門"});const zmImg=m=>"data/npc/"+m.id+".webp";
    const WX_CHARS={x_swordboy:{n:"齊轍"},x_miaogirl:{n:"駱躍梅"}};const esc=s=>String(s).replace(/[<>&"]/g,"");` + MN +
    ";this.say=mntSay;this.who=mntWho;this.grp=mntGrp;this.L=MNT_LINES;this.P=MNT_PAL;", c);
  return c;
}
const CJK = /[㐀-鿿]/;

test("十派掌門都有四組台詞（好、慢、錯、整盤），中英都有、英文沒有中文字", () => {
  assert.equal(MST.length, 10, "07z9-school.js 讀得到十派掌門");
  const c = load();
  for (const m of MST) for (const g of ["g", "m", "b", "w"]) {
    const L = c.L[m.id] && c.L[m.id][g];
    assert.ok(Array.isArray(L) && L.length === 2 && L[0] && L[1], `${m.nm}（${m.id}）缺 ${g}`);
    assert.ok(CJK.test(L[0]) && !CJK.test(L[1]), `${m.nm} ${g} 中英放反或英文夾中文`);
    if (g !== "w") assert.ok(L[0].includes("「{mv}」") && L[1].includes("\"{mv}\""), `${m.nm} ${g} 要講到那一步`);
  }
  for (const g of ["g", "m", "b", "w"]) assert.ok(c.P[g] && CJK.test(c.P[g][0]) && !CJK.test(c.P[g][1]), "夥伴 " + g);
});

test("輸棋不嘲諷：錯、慢的台詞不罵人，錯著那句都帶回「看這步」", () => {
  const c = load(), BAD = /笨|蠢|爛|丟臉|廢物|沒救|活該|stupid|idiot|terrible|awful|hopeless|useless/i;
  for (const [id, L] of Object.entries(c.L)) for (const g of ["m", "b"]) assert.ok(!BAD.test(L[g][0] + L[g][1]), `${id} ${g} 有嘲諷字眼`);
  for (const [id, L] of [...Object.entries(c.L), ["夥伴", c.P]]) assert.ok(/看/.test(L.b[0]) && /look|see/i.test(L.b[1]), `${id} 錯著那句要帶玩家去看該怎麼走`);
});

test("評等分組：妙著、正著＝好；穩著、緩著＝慢；失著、敗著＝錯；全盤＝整盤；其他不講", () => {
  const c = load();
  for (const [q, g] of [["妙著", "g"], ["正著", "g"], ["穩著", "m"], ["緩著", "m"], ["失著", "b"], ["敗著", "b"], ["全盤", "w"], ["—", ""], ["", ""]]) assert.equal(c.grp(q), g, q);
  assert.equal(c.say("—", "炮二平五"), null, "沒有評等就不講");
});

test("主修哪派就是哪派掌門講，帶入那一步的棋譜；沒拜師換隨行夥伴", () => {
  for (const m of MST) {
    const c = load({ look: "x_miaogirl", act: m.sid }), S = c.say("失著", "車一平二");
    assert.equal(S.who.k, "zm"); assert.equal(S.who.nm, m.nm); assert.equal(S.who.img, "data/npc/" + m.id + ".webp");
    assert.ok(S.text.includes("「車一平二」") && !S.text.includes("{mv}"), m.nm + "：" + S.text);
  }
  const p = load({ look: "x_miaogirl", act: "" }).say("正著", "馬二進三");
  assert.equal(p.who.k, "pal"); assert.equal(p.who.nm, "駱躍梅"); assert.equal(p.who.img, "data/xs/prev_x_miaogirl.webp");
  assert.ok(p.text.includes("「馬二進三」"));
  assert.equal(load({ look: "x_nobody", act: "" }).say("正著", "馬二進三"), null, "角色資料讀不到就不講，不報錯");
});

test("英文介面：英文台詞、英文名字；整盤稱讚不留 {mv} 空殼", () => {
  const m = MST[0], c = load({ look: "x_swordboy", act: m.sid, en: true }), S = c.say("敗著", "C2=5");
  assert.ok(!CJK.test(S.text) && S.text.includes("\"C2=5\""), S.text); assert.equal(S.who.en, m.en);
  for (const en of [false, true]) for (const act of ["", m.sid]) {
    const W = load({ look: "x_swordboy", act, en }).say("全盤", "");
    assert.ok(W && W.text && !/\{mv\}|「」|""/.test(W.text), W && W.text);
  }
  assert.equal(load({ look: "x_swordboy", act: "", en: true }).who().en, "Qi Zhe");
});

test("〔原始碼〕接線：m.html 在 07z9-school 之後引入；檢討頁關鍵步放對話卡；沒有明顯錯著的提示改由掌門誇", () => {
  const H = rd("m.html"), a = H.indexOf("//#include m/07z9-school.js"), b = H.indexOf("//#include m/07z9o-mentor.js"), d = H.indexOf("//#include m/10-db.js");
  assert.ok(a > 0 && b > a && d > b, "引入順序");
  const DB = rd("m/10-db.js");
  assert.ok(DB.includes('if(typeof mntCard==="function")try{mntCard(note,KM&&!FREE?KM.q:"",KM&&!FREE?KM.m.cn:"")}catch(e){}'), "10-db.js 關鍵步模式呼叫 mntCard");
  const CG = rd("m/08b-cpugame.js");
  assert.ok(CG.includes('mntSay("全盤","")') && CG.includes("這盤沒有明顯的錯著，帶你看整盤的賽後報告"), "08b-cpugame.js 結算提示");
});
