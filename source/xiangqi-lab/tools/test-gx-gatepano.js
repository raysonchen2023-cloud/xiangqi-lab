// 開發者 11/15（手機選星頁截圖）「請 gemini 規劃觀星臺有什麼神秘的力量，可以直接通聯或前往 13 星系，另外重新繪製滿版環景的幻譜星門讓玩家選」
// 規劃 story/gemini_app/157（Gemini），開發者選「星碑共鳴」＋構圖「深淵凌空」＋過場完整版。
//   m/07gxp-gatepano.js：直式時整個畫面是一圈水墨環景，星球各自一張去背圖疊上去，左右拖曳繞一圈；橫向照舊用橫幅星圖。
//   m/07gx-galaxy.js：說明卡抽成 gxCardHtml／gxCardGo 兩版共用，多了星碑共鳴的文案。
//   m/07gxt-guanxing.js：從星圖石碑進星門的過場 gxtGate（完整版約 4.9 秒、簡化版約 1.5 秒）。
// 這裡把模組放進假環境實際跑純計算與說明卡；畫面、拖曳、過場在本機候選版手機尺寸看過（紀錄在提交訊息）。
// 用法：node --test xiangqi-lab/tools/test-gx-gatepano.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = f => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const GX = rd("xiangqi-db/m/07gx-galaxy.js"), GXP = rd("xiangqi-db/m/07gxp-gatepano.js"), GXT = rd("xiangqi-db/m/07gxt-guanxing.js"), MHTML = rd("xiangqi-db/m.html");

function kit(opt) {
  opt = opt || {}; const mem = {}, store = { get: (k, d) => k in mem ? JSON.parse(mem[k]) : d, set: (k, v) => { mem[k] = JSON.stringify(v) } };
  for (const k in opt.store || {}) store.set(k, opt.store[k]);
  const env = { store, window: {}, location: { hash: "#/guanxing" }, esc: s => String(s), vibrate() { }, toast() { }, modal() { }, jStart() { }, api: async () => ({}), rsFin() { },
    shipDocked: () => Array(opt.docked == null ? 9 : opt.docked).fill("x"), bhLevel: () => 8, setTimeout: f => { f(); return 0 }, fetch: async () => ({ json: async () => ({ items: [] }) }),
    document: { getElementById: () => null, querySelector: () => null, createElement: () => ({}), head: { append() { } }, body: { append() { } } }, innerWidth: opt.vw || 375, innerHeight: opt.vh || 812, matchMedia: () => ({ matches: false }) };
  const names = Object.keys(env);
  return new Function(...names, GX + "\n" + GXP + ";return{GX_LIST,GX_ORD,GX_TXT,GX_MODES,gxLock,gxCardHtml,GXP_P,GXP_W,GXP_H,GXP_K,gxpOn,gxpGeom,gxpSx,gxpCenter,gxpDelta,gxpNext,gxpIds,gxpStar,gxMapNow:()=>gxMap}")(...names.map(k => env[k]));
}
/* 存檔裡的星印 S（解鎖判斷讀的是存檔）；去過黑洞才看得到星門 */
const withSeal = (S, opt) => kit(Object.assign({}, opt, { store: Object.assign({ bhCount: 1, gxSeal: S }, (opt || {}).store) }));
const K = withSeal({}), G = K.gxpGeom(375, 812), ALL = [...K.GX_LIST.map(g => g.id), "mirror"], kOf = id => K.GXP_P[id][2] ? K.GXP_K : 1;
const ring = (a, b) => { const d = Math.abs(a - b) % K.GXP_W; return Math.min(d, K.GXP_W - d) };

test("〔行為〕直式手機用環景版；橫放、平板橫向、電腦、太矮的畫面照舊用橫幅星圖", () => {
  for (const [w, h] of [[375, 812], [390, 844], [430, 932], [360, 640], [768, 1024]]) assert.equal(K.gxpOn(w, h), true, w + "×" + h);
  for (const [w, h] of [[812, 375], [1024, 768], [1280, 800], [800, 820], [300, 400], [0, 812]]) assert.equal(K.gxpOn(w, h), false, w + "×" + h);
});

test("〔行為〕十三個星系與第十四顆都有位置，都在亮的那一帶裡、不出界；一圈在手機上大約兩屏半到三屏", () => {
  assert.deepEqual(Object.keys(K.GXP_P).sort(), ALL.slice().sort());
  for (const id of ALL) { const [x, y, w, h, r] = K.GXP_P[id]; assert.ok(x >= 0 && x < K.GXP_W, id + " x"); assert.ok(y - r * kOf(id) >= K.GXP_H * .14 && y + r * kOf(id) + 50 <= K.GXP_H * .70, id + " 在頂欄以下、說明卡以上（連星名）"); assert.ok(r > 0 && (id === "beichen" ? w === 0 : w >= r * 2 && h >= r * 2), id + " 尺寸") }
  assert.ok(G.W / 375 > 2.4 && G.W / 375 < 3.2, "一圈 " + (G.W / 375).toFixed(2) + " 屏");
});

test("〔混合〕去背圖的尺寸跟出圖工具記的一樣（位置表是照這些尺寸排的）", { skip: !fs.existsSync(path.join(ROOT, "xiangqi-db/art/gxgate/planets.json")) && "去背圖只在開發者電腦與 CDN，公開副本沒有 art/gxgate" }, () => {
  const J = JSON.parse(rd("xiangqi-db/art/gxgate/planets.json"));
  for (const id of ALL) { if (id === "beichen") { assert.ok(!J[id], "北辰就是背景上的黑洞，沒有去背圖"); continue } const p = K.GXP_P[id]; assert.deepEqual([p[2], p[3], p[4]], [J[id].w, J[id].h, J[id].r], id); assert.ok(fs.existsSync(path.join(ROOT, "xiangqi-db/art/gxgate/" + id + ".webp")), id + ".webp") }
  assert.ok(fs.existsSync(path.join(ROOT, "xiangqi-db/art/gxgate/pano.webp")));
});

test("〔行為〕星球兩兩不重疊（繞過接縫也算），星名也不會壓到別顆星", () => {
  for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) { const a = K.GXP_P[ALL[i]], b = K.GXP_P[ALL[j]], d = Math.hypot(ring(a[0], b[0]), a[1] - b[1]);
    assert.ok(d >= a[4] * kOf(ALL[i]) + b[4] * kOf(ALL[j]) + 20, ALL[i] + "／" + ALL[j] + " 距離 " + d.toFixed(0)) }
  for (const i of ALL) for (const j of ALL) { if (i === j) continue; const a = K.GXP_P[i], b = K.GXP_P[j], top = a[1] + a[4] * kOf(i), bot = top + 48, rb = b[4] * kOf(j);   /* 星名：球下方約 48 像素高、左右各 70 */
    const hit = ring(a[0], b[0]) < 70 + rb && b[1] + rb > top && b[1] - rb < bot; assert.ok(!hit, i + " 的星名被 " + j + " 壓到") }
});

test("〔行為〕順序：從黑洞往右繞一圈就是解鎖順序，第十四顆在搖光與開陽之間（黑洞的對面），最後回到黑洞口的北辰", () => {
  const bh = K.GXP_P.beichen[0], right = id => ((K.GXP_P[id][0] - bh) % K.GXP_W + K.GXP_W) % K.GXP_W, ord = K.GX_ORD.filter(id => id !== "beichen");
  for (let i = 1; i < ord.length; i++) assert.ok(right(ord[i]) > right(ord[i - 1]), ord[i - 1] + " → " + ord[i]);
  assert.equal(K.GX_ORD[K.GX_ORD.length - 1], "beichen");
  assert.ok(right("mirror") > right("yaoguang") && right("mirror") < right("kaiyang")); assert.ok(Math.abs(right("mirror") - K.GXP_W / 2) < K.GXP_W * .08, "差不多在正對面");
  for (const g of K.GX_LIST.filter(g => g.off)) assert.ok(K.GXP_P[g.id][1] > 700, g.n + "（星軌未通）在下排");
  assert.deepEqual(K.gxpIds(false), [...K.GX_ORD, "jiyue", "xuanbing", "shuchen", "tengshe"]); assert.equal(K.gxpIds(true).pop(), "mirror");
});

test("〔行為〕每顆星都夠好點：手機上按鈕不小於 56×56（最小的球也超過 44）", () => {
  for (const [w, h] of [[375, 812], [360, 640], [430, 932]]) { const g = K.gxpGeom(w, h);
    for (const id of ALL) { const p = K.GXP_P[id], k = g.sc * kOf(id), bw = Math.max(p[2] * k, p[4] * 2 * k, 56), bh = Math.max(p[3] * k, p[4] * 2 * k, 56); assert.ok(bw >= 56 && bh >= 56, id) } }
});

test("〔行為〕拖曳的位置換算：置中、繞一圈回到原位、一圈只出現一顆、環上走最短的那一段", () => {
  const m = 190 * G.sc * K.GXP_K;
  for (const id of ALL) { const X = K.gxpCenter(id, G); assert.ok(Math.abs(K.gxpSx(K.GXP_P[id][0], X, G, m) - 375 / 2) < 1e-6, id + " 置中");
    assert.ok(Math.abs(K.gxpSx(K.GXP_P[id][0], X + G.W, G, m) - 375 / 2) < 1e-6, "多繞一圈一樣"); assert.ok(Math.abs(K.gxpSx(K.GXP_P[id][0], X - 3 * G.W, G, m) - 375 / 2) < 1e-6) }
  for (let X = -500; X < 2600; X += 37) for (const id of ALL) { const x = K.gxpSx(K.GXP_P[id][0], X, G, m); assert.ok(x >= -m - 1e-6 && x < G.W - m, id + " @" + X) }
  assert.ok(Math.abs(K.gxpSx(10, 5 / 1 * 0 + (G.W - 5), G, m) - (10 * G.sc + 5)) < 1e-6, "接縫右邊的星從右側接上");
  assert.ok(K.gxpSx(K.GXP_W - 20, 0, G, m) < 0, "快要從左邊滑進來的星先擺在左邊外面");
  assert.equal(K.gxpDelta(0, 100, 1000), 100); assert.equal(K.gxpDelta(0, 900, 1000), -100); assert.equal(K.gxpDelta(950, 20, 1000), 70); assert.equal(K.gxpDelta(20, 950, 1000), -70);
});

test("〔行為〕一開頁對準下一顆要打的：沒星印是紫淵，一路往下，九個全破是第十四顆", () => {
  const nx = (S, all, opt) => withSeal(S, opt).gxpNext(S, all);
  assert.equal(nx({}, false), "ziyuan"); assert.equal(nx({ ziyuan: { t: 1 } }, false), "taisu"); assert.equal(nx({ ziyuan: { t: 1 }, taisu: { t: 0 }, tianyuan: { t: 2 } }, false), "yaoguang");
  const S = {}; for (const id of K.GX_ORD) S[id] = { t: 1 }; assert.equal(nx(S, true), "mirror"); assert.equal(nx(S, false), "beichen");
  assert.equal(nx({ ziyuan: { t: 1 }, taisu: { t: 1 }, tianyuan: { t: 1 } }, false, { docked: 0 }), "beichen", "下一顆被星槎進度鎖住：先停在黑洞");
  assert.equal(kit().gxpNext({}, false), "beichen", "還沒去過黑洞：每一顆都鎖著");
});

test("〔行為〕星球按鈕的狀態：已得星印、下一顆、鎖住、星軌未通各有樣式與報讀文字；北辰沒有去背圖", () => {
  const S1 = { ziyuan: { t: 1 } }, K1 = withSeal(S1), s = id => K1.gxpStar(id, S1, "taisu");
  assert.match(s("ziyuan"), /class="gxp-p on"/); assert.match(s("ziyuan"), /已得星印/); assert.match(s("ziyuan"), /<i>✦<\/i>/);
  assert.match(s("taisu"), /class="gxp-p nx"/); assert.match(s("tianyuan"), /class="gxp-p lk"/); assert.match(s("tianyuan"), /<i>🔒<\/i>/);
  assert.match(s("jiyue"), /class="gxp-p off"/); assert.match(s("jiyue"), /星軌未通/); assert.ok(!/🔒/.test(s("jiyue")), "未通的星不另外加鎖頭");
  assert.ok(!/<img/.test(s("beichen")), "北辰是背景上的黑洞"); assert.match(s("yuxiu"), /<img class="gxp-i" src="data\/gxgate\/yuxiu\.webp\?v=/);
  assert.match(K.gxpStar("mirror", {}, "mirror"), /aria-label="第十四顆・鏡像"/);
});

test("〔行為〕說明卡（兩版共用）：未通的星、還沒輪到的星引言換成批註；輪到的、打過的照舊是主宰的話；鎖住時三顆鍵不能按", () => {
  const S2 = { ziyuan: { t: 2 } }, off = K.gxCardHtml("jiyue", {}), lock = K.gxCardHtml("taisu", {}), open = K.gxCardHtml("ziyuan", {}), done = withSeal(S2).gxCardHtml("ziyuan", S2), mir = K.gxCardHtml("mirror", {});
  assert.ok(off.includes("「" + K.GX_TXT.off + "」") && off.includes("🔒 ")); assert.equal((off.match(/ disabled/g) || []).length, 3);
  assert.ok(lock.includes("「" + K.GX_TXT.lock + "」") && !lock.includes("守得此局")); assert.equal((lock.match(/ disabled/g) || []).length, 3);
  assert.ok(open.includes("「這般殺陣，我已演練過萬次。」") && open.includes("不計積分、不扣分") && !/ disabled/.test(open)); assert.equal((open.match(/class="gx-go"/g) || []).length, 3);
  assert.ok(done.includes("✦ 已得" + K.GX_MODES[2][3])); assert.ok(mir.includes("第十四顆・鏡像") && mir.includes(K.GX_TXT.go));
  for (const k of ["stele", "orbit", "off", "lock", "allp"]) assert.ok(K.GX_TXT[k] && K.GX_TXT[k].length <= 14, "文案 " + k + " 不超過 14 個字");
});

test("〔原始碼〕新模組接在星系模組後面、包住 gxMap；出錯或圖載不到退回橫幅星圖；拖曳放手不算點到星", () => {
  assert.match(MHTML, /\/\/#include m\/07gx-galaxy\.js\n\/\/#include m\/07gxp-gatepano\.js\n/);
  assert.ok(GXP.includes('if(typeof gxMap==="function"){const gxpF0=gxMap;gxMap=function(o){')); assert.ok(GXP.includes("if(!on)return gxpF0.apply(this,arguments);")); assert.ok(GXP.includes("im0.onerror=()=>{if(shut)return;close();flat(o)}"));
  assert.ok(GXP.includes('sky.addEventListener("click",e=>{if(moved){e.stopPropagation();e.preventDefault()}},true);')); assert.ok(GXP.includes("touch-action:none"));
  assert.ok(GXP.includes("@media (prefers-reduced-motion:reduce){.gxp-p.nx::before{animation:none}"), "減少動態：不閃"); assert.ok(GXP.includes("if(!smooth||RM||Math.abs(d)<2){setX(X+d);return}") && GXP.includes("if(!RM&&Math.abs(vx)>.05)"), "減少動態：不滑行");
  assert.ok(GXP.includes('<div class="gxp-dots" aria-hidden="true">'), "位置小點只是指示，不給報讀也不能點"); assert.equal(typeof K.gxMapNow(), "function");
  const mine = [...GXP.matchAll(/^(?:function\s+(\w+)|(?:const|let)\s+(\w+)=)/gm)].map(m => m[1] || m[2]); assert.ok(mine.length >= 12 && mine.every(n => /^gxp|^GXP_/.test(n)), "前綴都是 gxp／GXP_：" + mine.join(","));
  const others = fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js") && f !== "07gxp-gatepano.js").map(f => rd("xiangqi-db/m/" + f)).join("\n");
  for (const n of mine) assert.ok(!new RegExp("(?:function\\s+|const\\s+|let\\s+)" + n + "\\b").test(others), n + " 沒有撞名");
});

test("〔行為〕石碑過場的時間表：完整版各段依序、不超過 5 秒；減少動態或這次已經看過＝簡化版，不超過 1.6 秒", () => {
  const names = ["esc", "vibrate", "toast"], i0 = GXT.indexOf("const GXT_GATE="), i1 = GXT.indexOf("function gxtGateCss()");
  const T = new Function(GXT.slice(i0, i1) + ";return{GXT_GATE,gxtGatePlan}")();
  const F = T.gxtGatePlan(false, false); assert.equal(F.kind, "full"); assert.ok(0 < F.beam && F.beam < F.rise && F.rise < F.ink && F.ink < F.say && F.say < F.open && F.open < F.end && F.end <= 5000);
  for (const [rm, seen] of [[true, false], [false, true], [true, true]]) { const L = T.gxtGatePlan(rm, seen); assert.equal(L.kind, "lite"); assert.ok(L.ink <= L.say && L.say < L.open && L.open < L.end && L.end <= 1600) }
  for (const k of ["p", "w"]) for (const n of ["st", "ft", "mid", "bh"]) { const [x, y] = T.GXT_GATE[k][n]; assert.ok(x > 0 && x < 100 && y > 0 && y < 100, k + "." + n) }
  for (const k of ["p", "w"]) { const C = T.GXT_GATE[k]; assert.ok(C.ft[1] > C.st[1] && C.mid[1] > C.ft[1] && C.bh[1] < 20 && C.bh[0] === 50 && C.mid[0] === 50, k + "：碑上 → 碑腳 → 渾儀腳下 → 正上方的黑洞") }
  assert.ok(names.length === 3);
});

test("〔原始碼〕點星圖石碑＝播過場再開選星頁；點一下跳過、離開這一頁就收掉、不支援動畫的瀏覽器直接開", () => {
  assert.ok(GXT.includes("const GXT_ACT={gxtTd:gxtTd,") && GXT.includes("gxtGx:()=>gxtGate(),gxtSky:")); assert.ok(GXT.includes('open=()=>gxMap({from:"stele"})'));
  assert.ok(GXT.includes('if(!P||!im||gxtGate.busy||typeof document.body.animate!=="function"){open();return}'));
  assert.ok(GXT.includes('fx.onclick=()=>{vibrate(5);doOpen();finish(true)}')); assert.ok(GXT.includes('addEventListener("hashchange",bail)') && GXT.includes('removeEventListener("hashchange",bail)'));
  assert.ok(GXT.includes('sessionStorage.getItem("gxtGateFx")==="1"') && GXT.includes("gxtGatePlan(gxtRM(),seen)")); assert.ok(GXT.includes(".gxt-fx{position:fixed;inset:0;z-index:9600;"), "蓋在選星頁（9500）上面，墨散開才露出來");
  assert.ok(GXP.includes('o.from==="stele"?GX_TXT.orbit:GX_TXT.open'), "從石碑進來的開場白");
});
