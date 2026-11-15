// 11/15 開發者在園子（雲弈閣・後園）的三個回報：
//   ①「這邊有一條線」：俯視時棋盤正中有一條直線＝人字頂兩片的屋脊墨線疊在一起；鏡頭在篷頂上方時墨線整個收掉。
//   ②（截圖圈香爐）平視時香爐壓在棋盤右上角上＝立牌左半邊插進棋盤木框；挪到木框外的桌面。
//   ③「花園的幻影棋客一樣要跟在電腦對戰選難度時，用有點透明的方式呈現 3D 幻影棋客角色」：對手是幻影棋客時整個人半透明、慢慢呼吸。
// 用法：node --test xiangqi-lab/tools/test-park-garden-1115.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "park3d.js"), "utf8");

test("〔原始碼〕遮篷：鏡頭在篷頂上方（俯視）時墨線整個收掉，平視才畫；篷面自己照舊淡成半透明", () => {
  const tick = SRC.match(/tick\(dt,cy\)\{const above=cy>EY\+1\.5,[^\n]*/);
  assert.ok(tick, "找得到遮篷的 tick");
  assert.ok(tick[0].includes("ink.opacity=above?0:.85;ink.visible=!above;"), "俯視時墨線不畫");
  assert.ok(!tick[0].includes("ink.opacity=above?.1:.85"), "不能留著原本淡淡的一條");
  assert.ok(tick[0].includes("op=above?.12:.9"), "篷面的淡出沒有改");
});

test("〔混合〕香爐：整張立牌在棋盤木框外、桌緣內（不會壓在棋盤角上、也不會懸在桌外）；煙跟著同一個位置", () => {
  const m = SRC.match(/use\("censer",im=>\{const x=([\d.]+),z=(-?[\d.]+),c=card\(im,\{x,y:\.015,z,h:1\.5,tilt:\.3\}\)/);
  assert.ok(m, "找得到香爐");
  const x = +m[1], z = +m[2], HALF = .8, FRAME = 5.51, FRAME_Z = 6.01, TABLE = 8.2;   /* 立牌高 1.5、圖近正方形＝半寬約 .8；棋盤木框半寬 5.51、半深 6.01；圓桌半徑 8.2（實機量的） */
  assert.ok(x - HALF >= FRAME || Math.abs(z) - HALF >= FRAME_Z, `香爐左緣 ${(x - HALF).toFixed(2)} 要在木框（${FRAME}）外`);
  assert.ok(Math.hypot(x + HALF, z) <= TABLE, `香爐最外緣離桌心 ${Math.hypot(x + HALF, z).toFixed(2)}，要在桌緣 ${TABLE} 裡`);
  assert.ok(z < 0, "還是放在對手那一側（茶杯的對角）");
  assert.match(SRC, /smk:\[x,1\.25,z,i\/4\]/, "煙用同一組 x、z");
});

test("〔原始碼〕幻影棋客半透明：只有 k:pika／k:pika2 會進來；材質複製後透明、照寫深度、不投影；每格更新；2D 立牌一樣淡；省電停住、減少動態不呼吸", () => {
  assert.ok(SRC.includes('OPPG=look&&/^k:pika2?$/.test(String(look.cus||""))?{n:0,op:.6,ms:new Set()}:null;'), "setOpp 判斷是不是幻影棋客");
  const re = /^k:pika2?$/;
  for (const k of ["k:pika", "k:pika2"]) assert.ok(re.test(k), k + " 算幻影棋客");
  for (const k of ["k:zg", "k:pika3", "x_swordboy", "", "k:pikax"]) assert.ok(!re.test(k), k + " 不算");
  const g = SRC.match(/const oppGhost=\(\)=>\{[\s\S]*?for\(const g of G\.ms\)g\.opacity=g\.userData\.o0\*op\};/);
  assert.ok(g, "找得到 oppGhost");
  assert.ok(g[0].includes("OPPG_RM?.6:.6+Math.sin(pwT()/1000*1.26)*.07"), "透明度 .53～.67、五秒一輪；時間用 pwT（省電時停住）；減少動態固定 .6");
  assert.ok(g[0].includes("g.transparent=true;g.depthWrite=true;"), "透明但照寫深度（不會透出身體裡面）");
  assert.ok(g[0].includes("const g=x.clone();"), "複製材質，不改到共用的原材質");
  assert.ok(g[0].includes("m.castShadow=false;"), "幻影不投影子");
  assert.ok(g[0].includes('if(m.name==="meGly")') && g[0].includes("this.material.opacity*=OPPG.op"), "胸前字牌自己算完透明度再乘一次");
  assert.ok(g[0].includes("oppSpr.sp.material.opacity=op"), "2D 立牌也淡");
  assert.ok(g[0].includes("if(G.n++%20===0)"), "每 20 格重看一次材質（模型晚到、水墨模式換材質會補上）");
  assert.ok(SRC.includes("if(OPPG)try{oppGhost()}catch(e){}"), "每格呼叫，出錯不影響園子");
  assert.match(SRC, /OPPG_RM=\(\(\)=>\{try\{return matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\}catch\(e\)\{return false\}\}\)\(\)/);
});

test("〔行為〕幻影棋客的材質處理：複製品透明、原材質不動；重看時不會一直複製；透明度照原本的比例乘", () => {
  /* 把 oppGhost 裡處理材質的那一段照原樣拿出來跑（mk 與最後一行） */
  const mkSrc = SRC.match(/const mk=x=>\{if\(!x\|\|!x\.clone\)return x;[\s\S]*?return g\};/);
  assert.ok(mkSrc);
  const G = { ms: new Set() };
  const mk = new Function("G", mkSrc[0] + "return mk")(G);
  const mat = o => ({ opacity: o, transparent: false, depthWrite: true, userData: {}, clone() { return { ...this, userData: { ...this.userData }, clone: this.clone } } });
  const a = mat(1), b = mat(.5);
  const ga = mk(a), gb = mk(b);
  assert.notStrictEqual(ga, a); assert.equal(a.transparent, false, "原材質不動");
  assert.equal(ga.transparent, true); assert.equal(ga.depthWrite, true); assert.equal(ga.userData.gh, 1);
  assert.equal(ga.userData.o0, 1); assert.equal(gb.userData.o0, .5);
  assert.strictEqual(mk(ga), ga, "已經處理過的不再複製"); assert.equal(G.ms.size, 2);
  assert.strictEqual(mk(null), null); const odd = {}; assert.strictEqual(mk(odd), odd, "沒有 clone 的東西原樣放回");
  for (const g of G.ms) g.opacity = g.userData.o0 * .6;
  assert.ok(Math.abs(ga.opacity - .6) < 1e-9 && Math.abs(gb.opacity - .3) < 1e-9, "原本半透明的東西照比例更淡");
});
