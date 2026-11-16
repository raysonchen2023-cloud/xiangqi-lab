// 11/17 Windows 測試員 D P2-C（英文介面，中文也一樣）：星槎頁夥伴來訪泡泡（「方庭來串門子」＋一句台詞）蓋住右上「棋話一頁」入口的一半
//   （截圖 scratchpad\test-d\d2-en_ship_cheng_line.jpg）。
//   原因：07j-visit.js v7Place 只試 5 個角落、泡泡寬度固定；五個都會碰到入口時挑「蓋得最少」的——站名下面那一角只蓋到「棋話一頁」左邊一截，就被選了。
//   修法：① 照舊先試 5 個角落，再沿左右兩邊每 16px 往下找（v7Spot）；② 還是找不到就把泡泡縮窄再找（V7_SHRINK，最窄 V7_MINW）；
//         ③ 怎樣都會碰到：.v7-thru（泡泡本身點擊穿透，只留頭像、✕ 能按）；④ 0.7、2 秒後入口挪了位置又蓋到就重放。
//   07t-episodes 劇集小卡也借 v7Place，一起受惠。
// 不開瀏覽器：vm 跑 v7Cost／v7Spot／v7Place，假的 #view、入口方框（照截圖量、換成 390 寬）、泡泡寬高跟著 maxWidth 變。
// 用法：node --test xiangqi-lab/tools/test-visit-place-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), VIS = fs.readFileSync(path.join(ROOT, "xiangqi-db/m/07j-visit.js"), "utf8").replace(/\r\n/g, "\n");
const grab = head => { const L = VIS.split("\n"), i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n") };
const SRC = [grab("const V7_SHRINK="), grab("function v7Cost("), grab("function v7Spot("), grab("function v7Boxes("), grab("function v7Place(")].join("\n");

/* 截圖（270×580）量的方框 ×1.44 → 390 寬的手機；#view 從 65 到 835 */
const R = { left: 0, top: 65, right: 390, bottom: 835, width: 390, height: 770 };
const box = (l, r, t, b) => ({ left: l, right: r, top: t, bottom: b, width: r - l, height: b - t });
const CAP = box(0, 390, 65, 144), TALES = box(259, 360, 184, 210);
const SHIP = [TALES, box(173, 325, 320, 346), box(32, 230, 353, 379), box(108, 284, 379, 408), box(32, 144, 464, 490), box(32, 230, 616, 642),
  box(238, 346, 616, 642), box(168, 233, 662, 687), box(32, 144, 710, 734), box(168, 353, 763, 789), box(17, 108, 799, 824)];
const over = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

function kit(hs, size, src) {
  const timers = [], cls = new Set();
  const el = { style: {}, dataset: {}, isConnected: true, classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), toggle: (c, on) => on ? cls.add(c) : cls.delete(c) },
    get offsetWidth() { return size(this.style.maxWidth)[0] }, get offsetHeight() { return size(this.style.maxWidth)[1] },
    getBoundingClientRect() { const [w, h] = size(this.style.maxWidth), x = parseFloat(this.style.left), y = parseFloat(this.style.top); return box(x, x + w, y, y + h) } };
  const rects = hs.map(r => ({ getBoundingClientRect: () => r }));
  const v = { getBoundingClientRect: () => R, querySelector: s => s === ".shp-cap" ? { getBoundingClientRect: () => CAP } : null, querySelectorAll: () => rects.concat([{ getBoundingClientRect: () => CAP }]) };
  const ctx = { innerHeight: 835, document: { querySelectorAll: () => [] }, setTimeout: f => timers.push(f) };
  vm.createContext(ctx); vm.runInContext((src || SRC) + ";this.T={v7Place:typeof v7Place==='function'?v7Place:null,v7Spot:typeof v7Spot==='function'?v7Spot:null};", ctx);
  ctx.T.v7Place(v, el);
  return { el, cls, timers, rect: () => el.getBoundingClientRect(), hs };
}
const SZ = mw => { const w = mw ? Math.min(260, parseFloat(mw)) : 260; return [w, w >= 260 ? 96 : w >= 200 ? 110 : 126] };

test("〔重現〕截圖那一頁：泡泡不再蓋到「棋話一頁」，也不蓋任何入口、站名", () => {
  const K = kit(SHIP, SZ), q = K.rect();
  assert.equal(over(q, TALES), 0, "不蓋棋話一頁");
  for (const b of SHIP.concat([CAP])) assert.equal(over(q, b), 0, JSON.stringify(b));
  assert.ok(!K.cls.has("v7-thru"), "找得到不蓋的位置，不用穿透");
  assert.ok(q.left >= 0 && q.right <= 390 && q.top >= R.top && q.bottom <= 835, "在畫面裡");
});

test("〔對照〕拿掉修補（舊 v7Place：5 個角落、寬度固定）就會選到蓋住「棋話一頁」左邊那一角", () => {
  const OLD = `function v7Place(v,el){const R=v.getBoundingClientRect(),W=el.offsetWidth,H=el.offsetHeight,cap=v.querySelector(".shp-cap"),cb=cap?cap.getBoundingClientRect().bottom:R.top,
    top=Math.max(R.top,Math.min(cb,R.top+R.height*.3))+6,bot=Math.min(R.bottom,innerHeight)-H-14,
    C=[[R.left+8,top],[R.left+8,bot],[R.right-W-8,bot],[R.right-W-8,top],[R.left+8,R.top+8]],
    B=[...v.querySelectorAll(".shp-hs,.shp-cap,.shp-gy,#mdone"),...document.querySelectorAll(".xqbot,#sndPill")].map(e=>e.getBoundingClientRect()).filter(b=>b.width&&b.bottom>R.top&&b.top<R.bottom);
  const cost=([x,y])=>B.reduce((s,b)=>s+Math.max(0,Math.min(x+W,b.right)-Math.max(x,b.left))*Math.max(0,Math.min(y+H,b.bottom)-Math.max(y,b.top)),0);
  let best=C[0],bc=Infinity;for(const p of C){const c=cost(p);if(c<bc){bc=c;best=p}if(!c)break}
  el.style.left=Math.round(best[0])+"px";el.style.top=Math.round(best[1])+"px"}`;
  const K = kit(SHIP, SZ, OLD);
  assert.ok(over(K.rect(), TALES) > 0, "舊版蓋到棋話一頁");
});

test("〔縮窄〕左右兩邊上下都排滿、只剩左上那一角時：泡泡縮窄讓開右上的入口", () => {
  /* 左邊從站名下面到底都有入口，只有最上面那一格空著，但右上有個入口伸進來 */
  const hs = [box(230, 380, 160, 190)].concat(Array.from({ length: 12 }, (_, i) => box(10, 380, 280 + i * 45, 300 + i * 45)));
  const K = kit(hs, SZ), q = K.rect();
  for (const b of hs) assert.equal(over(q, b), 0);
  assert.ok(parseFloat(K.el.style.maxWidth) < 260, "縮窄了");
  assert.ok(parseFloat(K.el.style.maxWidth) >= 150, "最窄 150");
  assert.ok(!K.cls.has("v7-thru"));
});

test("〔穿透〕整頁都是入口、怎樣都會碰到：泡泡本身點擊穿透（只留頭像、✕ 能按），而且挑蓋得最少的位置", () => {
  const hs = Array.from({ length: 16 }, (_, i) => box(0, 390, 150 + i * 45, 175 + i * 45));
  const K = kit(hs, SZ); assert.ok(K.cls.has("v7-thru"));
  assert.ok(VIS.includes(".v7.v7-thru{pointer-events:none}.v7.v7-thru>img,.v7.v7-thru .v7x{pointer-events:auto}"), "CSS：泡泡穿透、頭像和 ✕ 照樣能按");
});

test("〔重放〕放好以後入口挪了位置（換英文字、推標籤）又蓋到：0.7、2 秒各看一次，蓋到就重放", () => {
  const hs = SHIP.map(b => Object.assign({}, b)), K = kit(hs, SZ);
  assert.equal(K.timers.length, 2, "排了兩次檢查");
  const q = K.rect(); Object.assign(hs[0], box(q.left + 20, q.left + 120, q.top + 10, q.top + 40));   /* 有個入口挪到泡泡底下 */
  K.timers[0](); const q2 = K.rect();
  assert.equal(over(q2, hs[0]), 0, "重放後不再蓋到挪過來的入口");
  assert.equal(K.timers.length, 2, "重放不會再多排檢查");
});

test("〔接線〕來訪泡泡、07t 劇集小卡都用 v7Place", () => {
  assert.match(VIS, /v\.append\(el\);v7Place\(v,el\);/);
  assert.match(fs.readFileSync(path.join(ROOT, "xiangqi-db/m/07t-episodes.js"), "utf8"), /if\(typeof v7Place==="function"\)v7Place\(v,el\)/);
});
