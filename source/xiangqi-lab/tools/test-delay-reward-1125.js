/* 11/25 W119：W118（開局特效晚播）之後掃同類「延遲執行、執行時沒再確認狀態」，開發者選「修好高的再發布」的 4 處：
   1. 古戰場（07g-battle.js）、千秋殘局（07f-ship.js）、漕運殘局（07z9b-jianghu.js）：「已領」記號當下寫進存檔，修為卻包在 setTimeout 裡 1.6～3.2 秒後才發；
      這段時間 App 被關掉，下次已經不是第一次，修為永遠補不回來。
   2. 千秋起手式修成（07q-chardiff.js chdOpEnd）：done 先寫，修為 +40 和珍品 3.2 秒後才發，同上。
   3. 幻譜星門鏡像關卡電腦走子（src/local.js playEngine 的 styleMove）：0.7 秒後才走，沒比對同一盤、同一步，也沒驗合法；換盤時會把舊盤的走法套到新盤並存檔。
   改法：addXP 多 opt.chipDelay（修為當下寫進存檔，震動和小標籤延後）；呼叫端不再用 setTimeout 包 addXP；chdGiveRelic 多 fxDelay（珍品當下寫進存檔，開箱特效延後）；
   styleMove 照上一行棋友棋路，比對 id、步數、legal。
   addXP 抽出來在 vm 跑（行為）；呼叫處用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const LEG = rd("xiangqi-db/m/07-legend.js"), BTL = rd("xiangqi-db/m/07g-battle.js"), SHIP = rd("xiangqi-db/m/07f-ship.js"),
  JH = rd("xiangqi-db/m/07z9b-jianghu.js"), CHD = rd("xiangqi-db/m/07q-chardiff.js"), LOC = rd("xiangqi-lab/src/local.js");

function xpKit() {
  const a = LEG.indexOf("function addXP("), m = /\nfunction /.exec(LEG.slice(a + 10)), b = m ? a + 10 + m.index : -1;
  assert.ok(a > 0 && b > a, "抓得到整個 addXP");
  const data = { xp: 100, xpDay: "2026-11-25", xpKeys: {} }, timers = [], chips = [];
  const c = {
    store: { get: (k, d) => (k in data ? data[k] : d), set: (k, v) => { data[k] = v } },
    localDay: () => "2026-11-25", xpInfo: x => { const t = x == null ? data.xp : x; return { total: t, L: Math.floor(t / 1000) + 1, title: "公士" } },
    vibrate() { }, xpChip: t => chips.push(t), Object,
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length }
  };
  vm.createContext(c); vm.runInContext(LEG.slice(a, b) + ";this.addXP=addXP;", c);
  return { addXP: c.addXP, data, timers, chips };
}

test("addXP 帶 chipDelay：修為當下就寫進存檔，小標籤等計時到了才出現（期間關掉 App 修為也不會少）", () => {
  const K = xpKit();
  K.addXP(15, "古戰場", "bt:test", { chipDelay: 1600 });
  assert.equal(K.data.xp, 115, "修為當下就加了");
  assert.equal(K.data.xpKeys["bt:test"], 1, "領過的記號也當下寫");
  assert.equal(K.chips.length, 0, "小標籤還沒出現");
  assert.equal(K.timers.length, 1); assert.equal(K.timers[0].ms, 1600);
  K.timers[0].f();
  assert.equal(K.chips.length, 1); assert.match(K.chips[0], /\+15 修為/);
});

test("addXP 沒帶 chipDelay：跟以前一樣，小標籤立刻出現", () => {
  const K = xpKit();
  K.addXP(10, "練習", "x:1");
  assert.equal(K.data.xp, 110); assert.equal(K.chips.length, 1); assert.equal(K.timers.length, 0);
});

test("addXP 同一個 key 不重複發（帶 chipDelay 也一樣）", () => {
  const K = xpKit();
  K.addXP(15, "古戰場", "bt:dup", { chipDelay: 1600 }); K.addXP(15, "古戰場", "bt:dup", { chipDelay: 1600 });
  assert.equal(K.data.xp, 115);
});

test("〔原始碼〕古戰場、千秋殘局、漕運殘局、千秋起手式：addXP 不再包在 setTimeout 裡，改帶 chipDelay", () => {
  for (const [nm, s] of [["07g-battle", BTL], ["07f-ship", SHIP], ["07z9b-jianghu", JH], ["07q-chardiff", CHD]])
    assert.doesNotMatch(s, /setTimeout\(\(\)=>\{?(?:try\{)?(?:if\(typeof addXP==="function"\))?addXP\(/, nm + " 還有用 setTimeout 包 addXP");
  assert.equal((BTL.match(/\{chipDelay:(1600|3200)\}\)/g) || []).length, 4, "古戰場四處（首勝、百戰之將、卷、照年份的卷）");
  assert.match(SHIP, /addXP\(15,"千秋殘局",`ship:\$\{k\}:\$\{id\}`,\{chipDelay:1600\}\)/);
  assert.match(JH, /addXP\(JH_CANAL_XP,jhL\("漕運殘局","Canal puzzle"\),"cy:"\+day\+":"\+sid,\{chipDelay:1600\}\)/);
});

test("〔原始碼〕千秋起手式修成：修為、珍品當下發，開箱特效延後（chdGiveRelic 的 fxDelay）", () => {
  const f = CHD.slice(CHD.indexOf("function chdOpEnd("), CHD.indexOf("\n", CHD.indexOf("setTimeout(()=>{try{if(o.done)", CHD.indexOf("function chdOpEnd("))));
  const iX = f.indexOf('addXP(40,"起手式","op:"+c,{chipDelay:3200})'), iR = f.indexOf('chdGiveRelic(c,"千秋起手式・"+CHD_OP[c].nm+"修成",3200)'), iT = f.indexOf("setTimeout(()=>{try{if(o.done)");
  assert.ok(iX > 0 && iR > 0 && iT > 0, "三段都找得到");
  assert.ok(iX < iT && iR < iT, "修為、珍品在計時器之前發");
  assert.match(CHD, /function chdGiveRelic\(c,from,fxDelay\)\{/);
  assert.match(CHD, /store\.set\("relics",M\);if\(typeof relicFx==="function"\)\{if\(fxDelay>0\)setTimeout\(\(\)=>relicFx\(pick\[0\],it,\{from\}\),fxDelay\);else relicFx\(pick\[0\],it,\{from\}\)\}/, "珍品先存，特效才延後");
});

test("〔原始碼〕鏡像關卡電腦走子：0.7 秒後走之前比對同一盤、同一步、走法合法", () => {
  assert.match(LOC, /const sm=styleMove\(\);if\(sm\)\{playBusy=true;const sid=P\.id,sn=P\.moves\.length;setTimeout\(\(\)=>\{try\{if\(P&&P\.id===sid&&P\.moves\.length===sn&&!P\.result&&P\.turn!==P\.human&&legal\(P\.board,P\.turn\)\.some\(\(\[a,b\]\)=>a===sm\[0\]&&b===sm\[1\]\)\)playApply\(sm\[0\],sm\[1\]\)\}/);
});
