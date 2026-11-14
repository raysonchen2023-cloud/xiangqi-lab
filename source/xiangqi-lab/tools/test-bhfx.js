// 11/14 太虛星尊三招魔法 3D 接進 App（m/07bhf-bossfx.js＋src/bossfx3d.js＋park3d fxApi）的自動測試，不開瀏覽器
//   ① 純函式 bhfxPlan：照第十二節的表挑目標（隕星碎打大子、第二階段 3×3、帥不化墨；虛空鎖鎖過河子 2／4 顆、步步為營護住的不鎖；星河震標河界上的子）
//   ② 魔王在不在場：只有黑洞局＋開發者模式＋測試台開關；不在場不給 park3d bhBoss；沒建好特效時 bhfxPlay 回 false（平面棋盤維持現狀）
//   ③ 接線：m.html include、bhParkEx／bhTick 接點、park3d fxApi 與三次繪製掛勾、bossfx3d 新 api、測試台按鈕
//   ④ 載入量：bossfx3d.js 不在 m.html 裡直接載、data/bhtd 不在 preload.json 的資料夾、素材都在 art/bhtd
// 用法：node --test xiangqi-lab/tools/test-bhfx.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.join(__dirname, "..", ".."), rd = f => fs.readFileSync(path.join(R, f), "utf8");
const SRC = rd("xiangqi-db/m/07bhf-bossfx.js"), BH = rd("xiangqi-db/m/07bh-blackhole.js"), DV = rd("xiangqi-db/m/07dv-devtest.js"), HTML = rd("xiangqi-db/m.html");
const P3 = rd("xiangqi-lab/src/park3d.js"), FX = rd("xiangqi-lab/src/bossfx3d.js");
const C = require("../site/core.js");

function loadPure() {
  const i = SRC.indexOf("#BHFX-PURE-BEGIN"), j = SRC.indexOf("/* #BHFX-PURE-END */");
  assert.ok(i > 0 && j > i, "找不到 #BHFX-PURE 區段");
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(SRC.slice(SRC.indexOf("\n", i) + 1, j) + ";this.R={BHFX_K,bhfxPlan,bhfxSpot,bhfxEmptyPlan,bhfxModeOf}", ctx, { filename: "07bhf(純函式)" });
  return ctx.R;
}
const P = loadPure();
const plain = x => JSON.parse(JSON.stringify(x));
const empty = () => Array(90).fill(null);
const put = (b, list) => { for (const [p, c, r] of list) b[r * 9 + c] = p; return b; };

test("① 隕星碎：開局打價值最高、最靠左的俥；第二階段 3×3 只算盤內，化墨的是範圍內的紅子", () => {
  const b = C.parseFen(C.START);
  assert.deepEqual(plain(P.bhfxPlan("meteor", b, false)), { c: 0, r: 9, big: false, cells: [[0, 9]], kill: [[0, 9]] });
  const o = plain(P.bhfxPlan("meteor", b, true));
  assert.deepEqual(o.cells, [[0, 8], [1, 8], [0, 9], [1, 9]]);
  assert.deepEqual(o.kill, [[0, 9], [1, 9]]);
});
test("① 隕星碎：帥不在移除範圍；只打俥炮傌（同價挑最往前的），沒有大子就不放", () => {
  const b = put(empty(), [["K", 4, 9], ["R", 4, 8], ["A", 3, 8], ["P", 4, 3], ["k", 4, 0]]);
  const o = plain(P.bhfxPlan("meteor", b, true));
  assert.equal(o.c, 4); assert.equal(o.r, 8);
  assert.ok(!o.kill.some(([c, r]) => c === 4 && r === 9), "帥不化墨");
  assert.deepEqual(o.kill, [[3, 8], [4, 8]]);
  const b2 = put(empty(), [["K", 4, 9], ["N", 1, 7], ["N", 6, 5], ["C", 2, 9], ["k", 4, 0]]);
  assert.deepEqual([P.bhfxPlan("meteor", b2, false).c, P.bhfxPlan("meteor", b2, false).r], [2, 9], "炮（4.5）比傌（4）值錢");
  b2[9 * 9 + 2] = null;   /* 拿掉炮 */
  assert.deepEqual([P.bhfxPlan("meteor", b2, false).c, P.bhfxPlan("meteor", b2, false).r], [6, 5], "兩匹傌同價：挑最往前的");
  const b3 = put(empty(), [["K", 4, 9], ["P", 4, 3], ["A", 3, 9], ["k", 4, 0]]);
  assert.equal(P.bhfxPlan("meteor", b3, false), null);
});
test("① 虛空鎖：過河子最往前的先鎖，第一階段 2 顆、第二階段 4 顆；步步為營護住的那格不鎖；沒有過河子＝null", () => {
  const b = put(empty(), [["K", 4, 9], ["P", 0, 4], ["P", 2, 3], ["R", 6, 3], ["N", 8, 2], ["C", 1, 4], ["P", 4, 6], ["k", 4, 0]]);
  assert.deepEqual(plain(P.bhfxPlan("lock", b, false)), { cells: [[8, 2], [6, 3]] });
  assert.deepEqual(plain(P.bhfxPlan("lock", b, true)).cells, [[8, 2], [6, 3], [2, 3], [1, 4]]);
  assert.deepEqual(plain(P.bhfxPlan("lock", b, false, [2 * 9 + 8])).cells, [[6, 3], [2, 3]], "skip 的格子不鎖");
  assert.equal(P.bhfxPlan("lock", C.parseFen(C.START), false), null, "開局沒有過河子");
});
test("① 星河震：河界（第 4、5 列）上的子都標出來，分紅黑", () => {
  const b = put(empty(), [["K", 4, 9], ["P", 0, 4], ["p", 2, 5], ["R", 8, 5], ["N", 3, 6], ["k", 4, 0]]);
  assert.deepEqual(plain(P.bhfxPlan("river", b, true)), { big: true, hit: [[0, 4, "r"], [2, 5, "b"], [8, 5, "r"]] });
  assert.deepEqual(plain(P.bhfxPlan("river", empty(), false)), { big: false, hit: [] });
  assert.equal(P.bhfxPlan("nope", b, false), null);
});
test("① 招名、魔王站位（將位往黑方底線退 .45 格）", () => {
  assert.deepEqual(plain(P.BHFX_K), { meteor: "隕星碎", lock: "虛空鎖", river: "星河震" });
  assert.deepEqual(plain(P.bhfxSpot(4, 0)), [4, -.45]);
  assert.deepEqual(plain(P.bhfxSpot(3, 2, .2)), [3, 1.8]);
});

/* 整支檔在假環境裡載入（頂層只宣告，不會動畫面） */
function loadAll(o) {
  const S = Object.assign({ dvtTaixu: 0 }, o.store || {});
  const ctx = { window: {}, console, store: { get: (k, d) => (k in S ? S[k] : d), set: (k, v) => { S[k] = v; } }, bhIs: st => !!st && String(st.journey || "").startsWith("bh:"), dvtOn: () => !!o.dev, PARK: null, OFF: true, loadScript: async () => {}, toast: () => {} };
  vm.createContext(ctx);
  vm.runInContext(SRC + ";this.R={bhfxBossOn,bhfxParkEx,bhfxPlay,bhfxSync,bhfxTap}", ctx, { filename: "07bhf-bossfx.js" });
  return ctx.R;
}
test("② 魔王只在黑洞局＋開發者模式＋測試台開關都開時上場；其他時候不給 park3d bhBoss", () => {
  const bh = { journey: "bh:tang" }, cpu = { journey: null };
  assert.equal(loadAll({ dev: true, store: { dvtTaixu: 1 } }).bhfxBossOn(bh), true);
  assert.deepEqual(plain(loadAll({ dev: true, store: { dvtTaixu: 1 } }).bhfxParkEx(bh)), { bhBoss: { k: "taixu", h: 2.5 } });
  assert.equal(loadAll({ dev: true, store: { dvtTaixu: 1 } }).bhfxBossOn(cpu), false, "不是黑洞局");
  assert.equal(loadAll({ dev: false, store: { dvtTaixu: 1 } }).bhfxBossOn(bh), false, "不是開發者");
  assert.equal(loadAll({ dev: true, store: { dvtTaixu: 0 } }).bhfxBossOn(bh), false, "開關關著");
  assert.equal(loadAll({ dev: true }).bhfxParkEx(bh), null, "不在場＝null，不蓋掉塔防守關的 bhBoss");
});
test("② 特效還沒建（平面棋盤、沒有 3D）時 bhfxPlay 回 false；bhfxSync 沒有園子也不出錯", async () => {
  const A = loadAll({ dev: true, store: { dvtTaixu: 1 } });
  A.bhfxSync({ journey: "bh:tang" });
  assert.equal(await A.bhfxPlay("meteor", { c: 0, r: 9, cells: [[0, 9]], kill: [] }), false);
  assert.equal(await A.bhfxPlay("bogus", {}), false);
});

test("③ 接線：m.html include、bhParkEx 疊 bhfxParkEx、bhTick 叫 bhfxSync", () => {
  assert.ok(HTML.includes("//#include m/07bhtl-tdlearn.js\n//#include m/07bhf-bossfx.js\n"), "m.html 有 include 07bhf-bossfx.js");
  assert.ok(BH.includes('...(typeof bhtdParkEx==="function"?bhtdParkEx(st):null),...(typeof bhfxParkEx==="function"?bhfxParkEx(st):null)'), "疊在塔防守關後面（開了才蓋掉）");
  assert.match(BH, /function bhTick\(st\)\{try\{if\(typeof bhtdTick==="function"\)bhtdTick\(st\)\}catch\(e\)\{console\.warn\("\[bhtd\]",e\)\}try\{if\(typeof bhfxSync==="function"\)bhfxSync\(st\)\}/);
});
test("③ park3d：fxApi 交出場景、鏡頭、格子座標（翻盤也對）、棋子、星盤、倒影群組、掛勾；三次繪製前都叫掛勾；太虛星尊只藏黑將外觀", () => {
  assert.match(P3, /fxApi:\(\)=>GIANT\?\{T,scene:sc,camera:cam,el,/);
  assert.ok(P3.includes("cell:(c,r)=>new T.Vector3((flip?4-c:c-4)*GS,TOP,(flip?4.5-r:r-4.5)*GS)"), "格子座標跟 pos() 一樣算翻盤");
  assert.ok(P3.includes("board:bplane,mirror:MG,hook(f){FXH.add(f);return()=>FXH.delete(f)}"));
  assert.ok(P3.includes('if(GIANT&&FXH.size)fxH("main");if(GIANT&&MG){bplane.visible=false;BU.visible=false}rd.render(sc,cam);'), "主畫面前");
  assert.ok(P3.includes('o.position.y=2*MY-o.position.y;if(FXH.size)fxH("mirror");rd.render(sc,cam);'), "倒影前（省電不畫倒影時不叫）");
  assert.ok(P3.includes('if(FXH.size)fxH("board");for(const g of L)g.visible=false;BU.visible=true;bplane.visible=true;rd.render(sc,cam)}'), "星盤那一次前");
  assert.ok(P3.includes('if(p==="k")gntTxHide(g,!!(GBOSS&&GBOSS.k==="taixu"));'), "黑將換成魔王：只藏外觀");
  assert.ok(P3.includes("let hide=!!(g.userData&&g.userData.txHid);") && P3.includes("if(!hide&&on&&g!==GFOC&&g.parent)"), "鏡頭穿角色的自動藏／顯示（gntClear）不會把藏起來的黑將又打開（11/14 實測抓到）");
  /* 掛勾宣告在 gntMirror 前面（frame 第一次跑之前就初始化好） */
  assert.ok(P3.indexOf("const FXH=new Set()") > 0 && P3.indexOf("const FXH=new Set()") < P3.indexOf("const gntMirror=()=>"));
});
test("③ park3d gntTxHide：藏起來的子物件記下來，關掉時只放回藏過的那些", () => {
  const m = P3.match(/const gntTxHide=(\(g,on\)=>\{[\s\S]*?\}\});/);
  assert.ok(m, "找得到 gntTxHide");
  const f = vm.runInNewContext("(" + m[1].replace(/;$/, "") + ")");
  const ch = [{ visible: true }, { visible: false }, { visible: true }], g = { children: ch, userData: {} };
  f(g, true); assert.deepEqual(ch.map(c => c.visible), [false, false, false]);
  f(g, true); assert.deepEqual(ch.map(c => c.visible), [false, false, false], "重複叫不會把記錄蓋掉");
  f(g, false); assert.deepEqual(ch.map(c => c.visible), [true, false, true], "本來就藏著的那個不打開");
  assert.equal(g.userData.txHid, undefined);
  f(g, false); assert.deepEqual(ch.map(c => c.visible), [true, false, true], "沒藏過就不動");
});
test("③ bossfx3d：新 api（bossAt 跟著黑將、bossTurn、caoBase、poke）；倒影那一次不重新擺位", () => {
  assert.match(FX, /function place\(\)\{/);
  assert.match(FX, /if \(kind !== "mirror"\) place\(\);/);
  assert.match(FX, /api\.caoBase \|\| base/);
  assert.match(FX, /if \(api\.poke\) \{ try \{ api\.poke\(400\); \} catch \(e\) \{\} \}/);
  assert.match(FX, /window\.XQBossFx3D = \{create\};/);
});
test("③ 開發者測試台：三招按鈕、第二階段、魔王在場開關，重設會清掉", () => {
  assert.ok(DV.includes('data-tx="${k}"'));
  assert.ok(DV.includes("bhfxTry(x.dataset.tx)"));
  assert.match(DV, /const DVT_KEYS=\[[^\]]*"dvtTaixu","dvtTaixu2"\]/);
});
test("④ 載入量：一般首頁不載 bossfx3d.js、不預載 data/bhtd；素材都放在 art/bhtd（build-site 複製到 data/bhtd）", { skip: fs.existsSync(path.join(R, "xiangqi-db/art/bhtd")) ? false : "要讀只在開發者電腦的素材 art/bhtd（魔王模型、特效圖只放 CDN；公開副本沒有，開發者電腦上照跑）" }, () => {
  assert.ok(!/<script[^>]*bossfx3d/.test(HTML), "m.html 沒有直接載 bossfx3d.js");
  assert.ok(SRC.includes('loadScript((OFF?"bossfx3d.js":"/m/bossfx3d.js")'), "要用時才載");
  const PL = rd("xiangqi-lab/tools/preload-list.js"), dirs = PL.match(/const DIRS=\[([^\]]*)\]/)[1];
  assert.ok(!/"bhtd"/.test(dirs), "data/bhtd 不在開 App 預先下載的清單");
  const A = path.join(R, "xiangqi-db/art/bhtd");
  const glb = fs.statSync(path.join(A, "b_taixu.glb")).size;
  assert.ok(glb > 500e3 && glb < 1.3e6, "魔王用瘦身版（約 1 MB）");
  for (const n of ["meteor", "burst", "shards", "ink_splash", "seal", "chain_ring", "chain_bar", "chain_break", "river", "wave", "ripple", "droplets"]) assert.ok(fs.existsSync(path.join(A, "fx", n + ".webp")), "fx/" + n);
  for (const k of ["meteor", "lock", "river"]) assert.ok(fs.existsSync(path.join(A, "cao", "cao_" + k + ".webp")), "cao_" + k);
  /* 模組要的圖跟 art/bhtd 對得上 */
  const IM = FX.match(/const IMGS = \[([^\]]*)\]/)[1].match(/"(\w+)"/g).map(s => s.slice(1, -1));
  for (const n of IM) assert.ok(fs.existsSync(path.join(A, "fx", n + ".webp")), "bossfx3d 要的 " + n);
});

/* ---------- 11/14 序局：太虛星尊正式上場＋開場隕星碎示威 ---------- */
const BHX_FEN = BH.match(/BHX_FEN="([^"]+)"/)[1];
const around = (b, c, r) => { const L = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const cc = c + dc, rr = r + dr; if ((dr || dc) && cc >= 0 && cc <= 8 && rr >= 0 && rr <= 9 && b[rr * 9 + cc]) L.push(b[rr * 9 + cc]); } return L; };
test("⑤ 序局示威目標：只落在空格、kill 一定是空的；序局盤面挑河界中央（周圍 3×3 一顆子都沒有）", () => {
  const b = C.parseFen(BHX_FEN), o = plain(P.bhfxEmptyPlan(b));
  assert.equal(b[o.r * 9 + o.c], null, "落點是空格");
  assert.deepEqual(o.kill, []); assert.deepEqual(o.cells, [[o.c, o.r]]); assert.equal(o.big, false);
  assert.deepEqual(around(b, o.c, o.r), [], "周圍沒有子");
  assert.deepEqual([o.c, o.r], [4, 5]);
  assert.deepEqual(P.bhfxPlan("meteor", b, false).kill.length, 1, "對照：一般隕星碎會打到大子（示威不能用這個）");
});
test("⑤ 序局示威目標：找不到完全空的地方，退而求其次是周圍沒有紅子；再不行任何空格；整盤滿了＝null", () => {
  /* 開局盤面：河界每一格旁邊都有兵卒 → 挑周圍只有黑卒、沒有紅兵的黑方河岸中間 */
  const s = C.parseFen(C.START), o = P.bhfxEmptyPlan(s);
  assert.equal(s[o.r * 9 + o.c], null); assert.ok(around(s, o.c, o.r).every(p => p === p.toLowerCase()), "周圍沒有紅子");
  assert.deepEqual([o.c, o.r], [4, 4]);
  /* 除了一格以外全是黑子：那一格周圍只有黑子 → 照樣挑它，不打到紅子 */
  const b = Array(90).fill("p"); b[0] = null; b[89] = "K"; b[85] = "R";
  assert.deepEqual(plain(P.bhfxEmptyPlan(b)).cells, [[0, 0]]);
  /* 兩個空格：一格旁邊有紅子、一格旁邊只有黑子 → 挑沒紅子的那格 */
  const b2 = Array(90).fill("p"); b2[40] = null; b2[41] = "R"; b2[10] = null;
  assert.deepEqual([P.bhfxEmptyPlan(b2).c, P.bhfxEmptyPlan(b2).r], [1, 1]);
  assert.equal(P.bhfxEmptyPlan(Array(90).fill("p")), null);
});
test("⑤ 戰鬥演出設定：完整／簡化／關閉，不認得的當完整", () => {
  assert.equal(P.bhfxModeOf("simple"), "simple"); assert.equal(P.bhfxModeOf("off"), "off");
  assert.equal(P.bhfxModeOf("full"), "full"); assert.equal(P.bhfxModeOf(undefined), "full"); assert.equal(P.bhfxModeOf("??"), "full");
});
test("⑥ 系統「減少動態效果」（開發者 11/14）：完整當成簡化（跳過草書），簡化、關閉照設定", () => {
  assert.equal(P.bhfxModeOf("full", true), "simple");
  assert.equal(P.bhfxModeOf(undefined, true), "simple");
  assert.equal(P.bhfxModeOf("simple", true), "simple");
  assert.equal(P.bhfxModeOf("off", true), "off");
  assert.equal(P.bhfxModeOf("full", false), "full");
  assert.ok(SRC.includes('matchMedia("(prefers-reduced-motion:reduce)").matches'), "bhfxMode 讀系統設定");
});
test("⑥ 保險：魔王被收掉或 25 秒還沒播完，bhfxPlay 照樣回來（11/14 實測：中途離開對局，序局示威卡住、狀態條一直藏著）", () => {
  assert.ok(SRC.includes('const ab=new Promise(r=>{me.abort=()=>r("abort");tm=setTimeout(()=>r("late"),25000)});'));
  assert.ok(SRC.includes("tap?tap.p:new Promise(()=>{}),ab]"));
  assert.ok(SRC.includes("function bhfxOff(){const me=BHFX;BHFX=null;if(!me)return;try{if(me.abort)me.abort()}catch(e){}"), "收掉魔王前先結束正在播的招");
  assert.ok(SRC.includes("finally{if(tap)tap.off();clearTimeout(tm);me.abort=null;BHFX_CUR=null}"));
});
test("⑥ 魔王模型載不到（離線、CDN 掛了）：不給 bhBoss，黑將外觀放回來、序局照原本的樣子", () => {
  const S = { dvtTaixu: 0 }, ctx = { window: {}, console, store: { get: (k, d) => (k in S ? S[k] : d), set: () => {} }, bhIs: st => !!st && String(st.journey || "").startsWith("bh:"), dvtOn: () => false, PARK: null, OFF: true, loadScript: async () => {}, toast: () => {} };
  vm.createContext(ctx);
  vm.runInContext(SRC + ";this.R={bhfxParkEx}", ctx);
  assert.deepEqual(plain(ctx.R.bhfxParkEx({ journey: "bh:xu" })), { bhBoss: { k: "taixu", h: 2.5 } });
  vm.runInContext("PARK={v:1,last:null};BHFX={pv:1,noBoss:true};", ctx);
  assert.equal(ctx.R.bhfxParkEx({ journey: "bh:xu" }), null);
  vm.runInContext("PARK={v:2,last:null};", ctx);
  assert.deepEqual(plain(ctx.R.bhfxParkEx({ journey: "bh:xu" })), { bhBoss: { k: "taixu", h: 2.5 } }, "換了新的園子就再試一次");
  assert.ok(SRC.includes(".then(ok=>{if(BHFX!==me||(ok&&me.fx&&me.fx.boss))return ok;bhfxNoBoss(me);return false})"));
});
test("⑥ 手機橫向滿版示威期間藏上方狀態條（開發者 11/14），播完不管怎樣都放回來", () => {
  assert.ok(SRC.includes("@media (orientation:landscape) and (max-height:600px){body.bh-full.bhfx-xu #stat{visibility:hidden!important}}"), "只在橫向滿版、只藏 #stat");
  assert.ok(BH.includes("@media (orientation:landscape) and (max-height:600px){"), "跟 07bh 滿版排版同一個條件");
  assert.ok(SRC.includes('bhfxXuCss(true);try{me.pv.setView("bh_home")}'), "轉全盤那一刻藏");
  assert.ok(/finally\{BHFX_XUON=false;try\{bhfxXuCss\(false\)\}catch\(e\)\{\}cam\(\)\}/.test(SRC), "finally 放回（跳過、出錯也一樣）");
  /* 假 DOM：開、關 class，樣式只插一次 */
  const H = []; const cls = new Set();
  const ctx = { document: { body: { classList: { toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); } } }, head: { append: s => H.push(s) }, getElementById: id => H.find(s => s.id === id) || null, createElement: () => ({}) } };
  vm.createContext(ctx);
  vm.runInContext(SRC.match(/function bhfxXuCss\(on\)\{[\s\S]*?toggle\("bhfx-xu",!!on\)\}/)[0] + ";this.f=bhfxXuCss", ctx);
  ctx.f(true); assert.ok(cls.has("bhfx-xu")); ctx.f(true); assert.equal(H.length, 1, "樣式只插一次");
  ctx.f(false); assert.ok(!cls.has("bhfx-xu"));
});
test("⑤ 序局一定有魔王（不用開發者模式）；ex.bhBoss 帶魔王高度給絕殺動畫", () => {
  const xu = { journey: "bh:xu" };
  assert.equal(loadAll({ dev: false }).bhfxBossOn(xu), true);
  assert.deepEqual(plain(loadAll({ dev: false }).bhfxParkEx(xu)), { bhBoss: { k: "taixu", h: 2.5 } });
  assert.equal(loadAll({ dev: false }).bhfxBossOn({ journey: "bh:td1" }), false, "塔防關卡照舊沒有");
  assert.ok(SRC.includes('const BHFX_XU="bh:xu"') && BH.includes('const BHX_ID="bh:xu"'), "序局代號跟 07bh 一樣");
});
test("⑤ 點盤面跳過：捕獲階段攔下那一下（不傳到棋盤選子），只攔一次", async () => {
  const A = loadAll({ dev: false });
  const L = {}; const el = { addEventListener: (k, h, cap) => { assert.equal(cap, true); L[k] = h; }, removeEventListener: (k, h) => { if (L[k] === h) delete L[k]; } };
  const t = A.bhfxTap(el); let stop = 0, prev = 0;
  L.pointerdown({ stopPropagation: () => stop++, preventDefault: () => prev++, cancelable: true });
  assert.equal(await t.p, "tap"); assert.equal(stop, 1); assert.equal(prev, 1);
  assert.equal(L.pointerdown, undefined, "點過就拿掉監聽");
  const t2 = A.bhfxTap(el); t2.off(); assert.equal(L.pointerdown, undefined, "off() 拿掉監聽");
});
test("⑤ 接線：序局開場鏡頭讓位給示威、邀局時先下載魔王；bhfxPlay 照設定、點盤面跳過；示威播完轉回原角度", () => {
  assert.ok(BH.includes('const BHX_CAM={y:.6,p:.45,z:.65,foc:"a"};'));
  assert.ok(BH.includes('if(typeof bhfxXuBusy==="function"&&bhfxXuBusy())return;'), "示威在播時 bhxGo 的鏡頭先不轉");
  assert.ok(BH.includes("PARK.v.setView(BHX_CAM)"));
  assert.ok(BH.includes('try{if(typeof bhfxPre==="function")bhfxPre()}catch(e){}'), "邀局視窗就先下載");
  assert.ok(SRC.includes('me.fx.play(k,o,{cao:mode!=="simple"})'), "簡化＝跳過草書");
  assert.ok(SRC.includes('if(r==="tap"||r==="late"||r==="abort"){if(r!=="abort")try{me.fx.reset()}catch(e){}return"skip"}'), "點盤面＝特效收掉、直接結算");
  assert.ok(SRC.includes('if(mode==="off"){try{toast("✦ 太虛星尊："+BHFX_K[k])}'), "關閉＝只閃招名");
  assert.ok(SRC.includes("if(bhfxXuWant(st)&&BHFX_XUID!==st.id)bhfxXu(st,BHFX)"), "序局每盤只示威一次");
  assert.ok(/finally\{BHFX_XUON=false;[^}]*\}catch\(e\)\{\}cam\(\)\}/.test(SRC), "不管播沒播，最後都回序局原本的鏡頭");
});
test("⑤ 將死：魔王跟著黑將的縮放消融、黑將藏起來魔王也消失；星盤環和茶霧照魔王高度", () => {
  assert.ok(P3.includes("HH=GNT_H*s0*(g.userData&&g.userData.txHid&&GBOSS&&GBOSS.h>0?GBOSS.h:1)"));
  assert.ok(SRC.includes("bossAt:out=>{const k=A.find(\"k\");if(!k||!k.visible)return null;"));
  assert.ok(SRC.includes('bossScale:()=>{const k=A.find("k");return k?k.scale:null}'));
  assert.match(FX, /if \(api\.bossScale\) \{/);
  assert.match(FX, /if \(!\(po && po\.cao === false\)\) \{/);
});
