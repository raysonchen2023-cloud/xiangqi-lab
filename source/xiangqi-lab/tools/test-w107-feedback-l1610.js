// W107-L 第 1 批：意見回饋頁（07s3「驛站信房」）iPad 橫向專用橫式圖。只有原圖 fb_day，條目寫在 07s3 自己（FBP_L1610）。
// 檢查：條目登記進 07sw 的 SCW、跟原本常數一一對應（三口銅匭順序、類型、圖示）、座標在圖內；飛鴿在橫式圖不飛；
// render 照當下的圖選座標（橫式用 fx 的 2560 像素，原圖照舊 768×1376）、橫直切換整頁重畫時保留信上的字和類型。
// 用法 node --test xiangqi-lab/tools/test-w107-feedback-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), S3 = M("m/07s3-feedback.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const CONSTS = cut(S3, "const FBP_PAPER=", ";") + "\n" + cut(S3, "const FBP_SHENYUAN=", ";") + "\n" + cut(S3, "const FBP_SLOT=", ";") + "\n";
const ENTRY = cut(S3, "const FBP_L1610=", 'SCW["feedback/fb_day"]=FBP_L1610;');

function load() {
  const ctx = vm.createContext({ localStorage: { getItem: () => null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); vm.runInContext(CONSTS + ENTRY, ctx);
  return ctx;
}

test("條目：fb_day 登記在 07sw 的 SCW，檔名加 _l1610、2560×1600；07s3 的圖網址找得到它；夜版沒有登記（照舊直圖）", () => {
  const C = load(), SCW = vm.runInContext("SCW", C), A = SCW["feedback/fb_day"];
  assert.ok(A); assert.equal(A.f, "feedback/fb_day_l1610"); assert.equal(A.w, 2560); assert.equal(A.h, 1600); assert.equal(A.ready, true);
  assert.equal(vm.runInContext('scwKey("data/feedback/fb_day.webp?v=2310")', C), "feedback/fb_day");
  assert.equal(SCW["feedback/fb_night"], undefined, "夜版沒有橫式圖");
});

test("銅匭：三口的類型、名稱、圖示、順序跟原本 FBP_SLOT 一樣，座標由左到右；送出時照 ty() 的序號投進對的那一口", () => {
  const C = load(), S0 = vm.runInContext("FBP_SLOT", C), S1 = vm.runInContext("FBP_L1610.fx.slot", C);
  assert.equal(S1.length, 3);
  for (let i = 0; i < 3; i++) { assert.equal(S1[i][0], S0[i][0]); assert.equal(S1[i][1], S0[i][1], "名稱（申冤用同一個常數）"); assert.equal(S1[i][4], S0[i][4]) }
  assert.ok(S1[0][2] < S1[1][2] && S1[1][2] < S1[2][2], "左中右");
  for (const s of S1) assert.ok(s[2] > 0 && s[2] < 2560 && s[3] > 0 && s[3] < 1600);
});

test("疊圖座標：信箋三點、印、待送數、附件、回條、類型小籤都在圖內；信箋 o→x 往右、o→y 往下", () => {
  const C = load(), F = vm.runInContext("FBP_L1610.fx", C), E = vm.runInContext("FBP_L1610", C);
  const { o, x, y } = F.paper;
  for (const p of [o, x, y, F.seal, F.pill, F.jade, F.slipN]) assert.ok(p[0] > 0 && p[0] < 2560 && p[1] > 0 && p[1] < 1600, String(p));
  assert.ok(x[0] > o[0], "o→x 往右"); assert.ok(y[1] > o[1], "o→y 往下");
  assert.ok(F.seal[2] > 20 && F.seal[2] < 120, "印的半徑照信箋放大");
  for (const [l, t, w, h] of F.slips) assert.ok(l > 0 && t > 0 && l + w < 2560 && t + h < 1600);
  assert.ok(F.tyY > 0 && F.tyY < Math.min(...F.slot.map(s => s[3])), "類型小籤欄在銅匭上面");
  for (const id of ["fbpWrite", "fbpBoard"]) { const p = E.S[id]; assert.ok(p && p[0] > 0 && p[0] < 100 && p[1] > 0 && p[1] < 100, id) }
  assert.ok(E.exit[0] > 0 && E.exit[0] < 100);
});

test("走路：邊的兩端都是節點、每個節點接得到 home；書桌桌面跳點接到節點", () => {
  const C = load(), W = vm.runInContext("FBP_L1610.walk", C), N = Object.keys(W.N), E = W.E.split(" ").map(e => e.split("-"));
  for (const [a, b] of E) { assert.ok(N.includes(a), a); assert.ok(N.includes(b), b) }
  const seen = new Set(["home"]); let g = true;
  while (g) { g = false; for (const [a, b] of E) { if (seen.has(a) && !seen.has(b)) { seen.add(b); g = true } if (seen.has(b) && !seen.has(a)) { seen.add(a); g = true } } }
  assert.deepEqual([...seen].sort(), N.slice().sort());
  for (const [n] of W.TB.desk.hops) assert.ok(N.includes(n), "跳點 " + n);
  assert.equal(W.W, 2560); assert.equal(W.home, "home");
});

test("〔混合〕飛鴿：橫式圖（data-scw 有值）不飛、回 false，照舊投進銅匭；原圖照舊往下走（不被這條擋）", () => {
  const src = cut(S3, "function fbpFly(P,paper){", "\n");
  assert.match(src, /^function fbpFly\(P,paper\)\{if\(P&&P\.dataset&&P\.dataset\.scw\)return false;/);
  const ctx = vm.createContext({ matchMedia: () => ({ matches: true }) });   // 原圖這條用「減少動態」讓它停在下一行，證明沒被橫式那條擋
  vm.runInContext(cut(S3, "function fbpFly(P,paper){", "\n") + "return \"原圖往下\"}", ctx);
  assert.equal(vm.runInContext("fbpFly", ctx)({ dataset: { scw: "l1610" } }), false);
  assert.equal(vm.runInContext("fbpFly", ctx)({ dataset: { scw: "" } }), "原圖往下");
});

test("座標組 GEO：橫式圖用條目 fx（2560×1600、類型小籤 tyY 760），原圖用原本的常數（768×1376、520）；兩組每一欄都有", () => {
  const src = cut(S3, "const GEO=w=>{", "TYY:F?F.tyY:520}};");
  const ctx = vm.createContext({ Math, Object });
  vm.runInContext(CONSTS + ENTRY + cut(S3, "const FBP_SEAL=", ";") + "\n" + cut(S3, "const FBP_SLIPS=", ";") + "\n" + cut(S3, "const fbpPc=", ";") + "\n" + src, ctx);
  const W = vm.runInContext("GEO(true)", ctx), N = vm.runInContext("GEO(false)", ctx), F = vm.runInContext("FBP_L1610.fx", ctx);
  assert.equal(W.GW, 2560); assert.equal(W.GH, 1600); assert.equal(W.TYY, 760); assert.equal(W.SLOT, F.slot); assert.equal(W.PAPER, F.paper); assert.equal(W.PILL, F.pill); assert.equal(W.SLIPN, F.slipN);
  assert.deepEqual(JSON.parse(JSON.stringify(W.pc(1280, 800))), [50, 50]);
  assert.equal(N.GW, 768); assert.equal(N.GH, 1376); assert.equal(N.TYY, 520); assert.equal(N.SLOT, vm.runInContext("FBP_SLOT", ctx)); assert.equal(N.pc, vm.runInContext("fbpPc", ctx));
  for (const k of ["PAPER", "SLOT", "SEAL", "SLIPS", "PILL", "JADE", "SLIPN"]) { assert.ok(W[k], "橫式缺 " + k); assert.ok(N[k], "原圖缺 " + k) }
});

test("走路出口：橫式圖的記憶名 fbpL 登記自己的出口（json 建議的位置），不動直圖的 fbp", () => {
  const ctx = vm.createContext({ SHW_EXITS: { fbp: { at: [10, 86], ln: "mid lft", out: [-8, 88], r: [0, 79, 18, 95] } } });
  vm.runInContext(cut(S3, 'if(typeof SHW_EXITS!=="undefined"&&SHW_EXITS&&!("fbpL" in SHW_EXITS))', "};"), ctx);
  const X = vm.runInContext("SHW_EXITS", ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(X.fbpL)), { at: [8, 94], ln: "home lft", out: [-8, 96], r: [0, 86, 14, 100] });
  assert.deepEqual(X.fbp.at, [10, 86], "直圖的出口不動");
  const N = vm.runInContext("FBP_L1610.walk.N", load());
  for (const n of X.fbpL.ln.split(" ")) assert.ok(N[n], "出口接的節點在橫式路網裡：" + n);
});

test("〔原始碼〕render 照 scwPre 選圖；換圖用 place() 原地重放（不整頁重畫）；掛 scwMount（記憶名照圖換 fbp／fbpL）；類型小籤橫式時往內收", () => {
  assert.match(S3, /const dk=fbpDark\(\),src=`data\/feedback\/\$\{dk\?"fb_night":"fb_day"\}\.webp\?v=\$\{FBP_IMGV\}`,pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\},G=pre\.k\?FBP_L1610\.fx:null;/);
  assert.match(S3, /let\{GW,GH,pc,PAPER,SLOT,SEAL,SLIPS,PILL,JADE,SLIPN,TYY\}=GEO\(!!G\);/);
  assert.match(S3, /<img src="\$\{pre\.src\}" alt="驛站信房">/);
  assert.match(S3, /const fit=\(\)=>\{const k=P\.clientWidth\/GW;if\(!k\)return;const\{o,x,y\}=PAPER,/, "箋紙照當下的圖寬算");
  assert.match(S3, /if\(!fly\)\{const sl=SLOT\[ty\(\)\],k=P\.clientWidth\/GW,\{o\}=PAPER;/, "投進銅匭照當下的座標");
  assert.match(S3, /const place=\(\)=>\{\(\{GW,GH,pc,PAPER,SLOT,SEAL,SLIPS,PILL,JADE,SLIPN,TYY\}=GEO\(!!\(typeof scwCur==="function"&&scwCur\(P\)\)\)\);/, "place 照當下的圖重算");
  for (const sel of [".fbp-slot", ".fbp-ty", ":scope>.fbp-seal", ".fbp-thumbs", ".fbp-q", ".fbp-slipn", ".fbp-slip"]) assert.ok(cut(S3, "const place=()=>{", "fit();fbpHit(P)};").includes('"' + sel + '"'), "place 重放 " + sel);
  assert.match(S3, /tyE\.dataset\.t0=tyE\.style\.top/, "fbpHit 的起點跟著換");
  assert.match(S3, /pfx:pre\.k\?"fbpL":"fbp",cfg0:cfg,apply:place,\s*onCfg:x=>\{o\.pfx=x\.W===2560\?"fbpL":"fbp"\}\};/);
  assert.doesNotMatch(S3, /apply:\(\)=>setTimeout\(\(\)=>\{if\(st\.stop/, "不再整頁重畫");
  assert.match(S3, /shwPage\(v,cfgNow,pre\.k\?"fbpL":"fbp"\)/);
  assert.match(S3, /\.fbp-page\.scw-l \.fbp-ty\{right:4%\}/);
  assert.deepEqual(S3.split("\n").filter(l => /\/7\.68|\/13\.76/.test(l)), ["const fbpPc=(x,y)=>[x/7.68,y/13.76];"], "render 裡不再寫死 768×1376（只剩 fbpPc 那一行）");
});
