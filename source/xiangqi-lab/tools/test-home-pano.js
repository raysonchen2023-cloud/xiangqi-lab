// 11/14 開發者「首頁角色往左邊走會看到西市，往右邊走會看到觀星臺」：千秋時光之苑首頁三屏長卷（xiangqi-db/m/07hmp-pano.js）。
// 不開瀏覽器：07z、07hmp 整份丟進 vm 跑純計算（挑不挑長卷、鏡頭跟角色、手指放開吸附哪一屏、路網延伸），再查圖檔尺寸和幾個接點的原始碼。
// 測試名稱照規定標類別：只檢查原始碼文字的加〔原始碼〕；混合加〔混合〕；真的執行邏輯的不加。
// 用法：node --test xiangqi-lab/tools/test-home-pano.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), DB = path.join(ROOT, "xiangqi-db");
const M = p => fs.readFileSync(path.join(DB, p), "utf8").replace(/\r\n/g, "\n");
const SRC_Z = M("m/07z-homemap.js"), SRC_P = M("m/07hmp-pano.js");
function load() {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, cancelAnimationFrame: () => { }, addEventListener: () => { }, isFinite, Math, Object, String, JSON });
  vm.runInContext("const SHW_PG0={W:768,H:1376,el:38,home:'home',look0:[45,90],h:[.045,60,.0009]};", ctx);
  vm.runInContext(SRC_Z, ctx); vm.runInContext(SRC_P, ctx);
  return ctx;
}
const C = load(), R = s => vm.runInContext(s, C);
const J = x => JSON.parse(JSON.stringify(x));
const hmpVar = R("hmpVar"), hmpSrc = R("hmpSrc"), hmpScr = R("hmpScr"), hmpFollow = R("hmpFollow"), hmpSnap = R("hmpSnap"), hmpWalk = R("hmpWalk"), hmwWalkCfg = R("hmwWalkCfg");
const HMP_PANO = J(R("HMP_PANO")), HMP_SIDE = J(R("HMP_SIDE")), HMP_ARROW = J(R("HMP_ARROW")), HMP_WALK = J(R("HMP_WALK")), HMP_IMGV = R("HMP_IMGV"), SHW_HOMEMAP = J(R("SHW_HOMEMAP"));
function webpSize(f) {
  const b = fs.readFileSync(f), t = b.toString("ascii", 12, 16);
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") throw new Error("不是 webp：" + f);
  if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (t === "VP8L") { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)] }
  throw new Error("看不懂的 webp：" + t);
}

test("挑不挑長卷：只有千秋時光之苑＋原圖（不是 iPad 寬版）＋這個變體有長卷；沒有就退回單張", () => {
  assert.equal(hmpVar("", "", true), "classic", "白天預設（07w7 沒回傳變體）＝home_classic 那張長卷");
  assert.equal(hmpVar("", "classic_autumn", true), "classic_autumn");
  assert.equal(hmpVar("", "classic_autumn_night", true), "classic_autumn_night");
  assert.equal(hmpVar("p34", "", true), "", "iPad 直版寬圖：照舊");
  assert.equal(hmpVar("l1610", "classic_autumn", true), "", "iPad 橫版寬圖：照舊");
  assert.equal(hmpVar("", "", false), "", "不是千秋時光之苑（朝代渡口）：照舊");
  assert.equal(hmpVar("", "classic_winter", true), "classic_winter", "九個變體（白天預設＋四季日夜）都有");
  assert.equal(hmpVar("", "classic_rain", true), "", "沒登記長卷的變體：退回單張");
  assert.equal(hmpVar("", "snow", true), "");
  R("HMP_BAD.classic_spring=1"); assert.equal(hmpVar("", "classic_spring", true), "", "這次開 App 載不到的長卷不再試"); R("delete HMP_BAD.classic_spring");
  assert.match(hmpSrc("classic_autumn", "l"), new RegExp(`^data/homemap/home_classic_autumn_pano_l\\.webp\\?v=${HMP_IMGV}$`));
});

test("登記的每個變體都有左右兩屏的圖（864×1376＝一屏 768＋多蓋中間那屏 96），中間那屏也在；而且工具的 BAND 跟樣式的 112.5% 對得上", { skip: fs.existsSync(path.join(DB, "tools", "homemap_pano.py")) ? false : "要讀只在開發者電腦的出圖工具 tools/homemap_pano.py 和 art/homemap 原圖（公開副本沒有；開發者電腦上照跑）" }, () => {
  const band = +(/^BAND = (\d+)/m.exec(M("tools/homemap_pano.py")) || [])[1];
  assert.equal(band, 96);
  assert.match(SRC_P, /\.hmp-w\{position:absolute;top:0;width:112\.5%/, "寬 = (768+96)/768");
  assert.match(SRC_P, /\.hmp-w\.r\{left:87\.5%\}/);
  assert.match(SRC_P, /width:88\.889%/, "疊色那層只蓋一屏寬（768/864）");
  const vs = Object.keys(HMP_PANO);
  assert.deepEqual(vs.slice().sort(), ["classic", ...["spring", "summer", "autumn", "winter"].flatMap(q => ["classic_" + q, "classic_" + q + "_night"])].sort(), "九個變體都接上");
  for (const v of vs) {
    for (const s of ["l", "r"]) {
      const f = path.join(DB, "art/homemap", `home_${v}_pano_${s}.webp`);
      assert.ok(fs.existsSync(f), "缺圖：" + f);
      assert.deepEqual(webpSize(f), [768 + band, 1376], f);
      assert.ok(fs.statSync(f).size < 270 * 1024, "太大：" + f);
    }
    assert.ok(fs.existsSync(path.join(DB, "art/homemap", `home_${v}.webp`)), "中間那屏不見了：" + v);
  }
});

test("鏡頭跟角色：走過橋頭才換屏，站在橋頭附近不會來回晃", () => {
  assert.equal(hmpFollow(50, 0), 0);
  assert.equal(hmpFollow(-3, 0), 0, "左岸平台邊（lbr）還在中間");
  assert.equal(hmpFollow(-14, 0), -1, "上了左邊木板");
  assert.equal(hmpFollow(-3, -1), -1, "從西市走回來，還沒下木板");
  assert.equal(hmpFollow(5, -1), 0, "回到中間平台");
  assert.equal(hmpFollow(103, 0), 0, "右邊木板起點（rp1）還在中間");
  assert.equal(hmpFollow(116, 0), 1, "走到觀星臺石牆下");
  assert.equal(hmpFollow(102, 1), 1);
  assert.equal(hmpFollow(95, 1), 0);
  assert.equal(hmpFollow(NaN, 1), 1, "量不到就不動");
  assert.deepEqual([-50, 50, 150].map(hmpScr), [-1, 0, 1]);
});

test("手指放開吸附：拖超過一屏寬 18% 或甩一下才換屏；往右拖＝看左邊；最多到兩邊", () => {
  assert.equal(hmpSnap(0, 40, 390, 0), 0, "拖一點點：回原屏");
  assert.equal(hmpSnap(0, 90, 390, 0), -1, "往右拖 90px（>70）：往左一屏（西市）");
  assert.equal(hmpSnap(0, -90, 390, 0), 1, "往左拖：觀星臺");
  assert.equal(hmpSnap(0, 30, 390, .8), -1, "甩一下");
  assert.equal(hmpSnap(0, 10, 390, .8), 0, "太短的甩不算");
  assert.equal(hmpSnap(-1, 200, 390, 0), -1, "已經在最左邊");
  assert.equal(hmpSnap(1, -200, 390, 0), 1, "已經在最右邊");
  assert.equal(hmpSnap(-1, -200, 390, 0), 0, "從西市往左拖：回中間");
});

test("走路路網延伸：新節點都接得上、從橋上石桌走得到西市市門和觀星臺石牆下；中間那屏的節點、入口一個都沒動", () => {
  const W = J(hmpWalk(Object.assign({}, SHW_HOMEMAP))), N = W.N;   /* vm 裡的陣列跟這邊不同一個 Array，先轉成純資料再比 */
  for (const k in SHW_HOMEMAP.N) assert.deepEqual(N[k], SHW_HOMEMAP.N[k], "中間節點被改：" + k);
  for (const k in SHW_HOMEMAP.HS) assert.deepEqual(W.HS[k], SHW_HOMEMAP.HS[k], "中間入口被改：" + k);
  assert.deepEqual(W.xr, [-100, 200], "點空地走路的範圍延伸到左右兩屏");
  assert.ok(W.dmax > 1.2, "過橋的長路放寬秒數");
  const E = W.E.trim().split(/\s+/).map(e => e.split("-"));
  for (const [a, b] of E) assert.ok(N[a] && N[b], "路接到不存在的節點：" + a + "-" + b);
  const adj = {}; for (const [a, b] of E) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a) }
  const seen = new Set(["home"]), q = ["home"]; while (q.length) for (const n of adj[q.shift()] || []) if (!seen.has(n)) { seen.add(n); q.push(n) }
  for (const k of Object.keys(N)) assert.ok(seen.has(k), "走不到：" + k);
  assert.equal(W.HS.hmpXsm[0], "mk"); assert.ok(N.mk[0] < -20 && N.mk[0] > -60, "西市市門前在左屏");
  assert.equal(W.HS.hmpGxt[0], "rp2"); assert.ok(N.rp2[0] > 100, "觀星臺石牆下在右屏");
  for (const k of Object.keys(HMP_WALK.N)) { const [x, y] = N[k]; assert.ok(x >= -100 && x <= 200 && y > 40 && y < 70, "節點超出範圍：" + k) }
  const YMAX = Math.max(...Object.values(SHW_HOMEMAP.N).map(p => p[1]));
  assert.ok(Math.max(...Object.values(HMP_WALK.N).map(p => p[1])) <= YMAX, "新節點不比原本最低的節點低（角色身高的基準不變）");
});

test("07z hmwWalkCfg：這一頁有長卷（P.dataset.hmp）才接上左右兩屏；寬版、沒有長卷照舊", () => {
  const P = { dataset: { hmp: "classic" } }, P0 = { dataset: { hmp: "" } };
  assert.ok(hmwWalkCfg("", P).N.mk, "長卷：有西市節點");
  assert.ok(!hmwWalkCfg("", P0).N.mk, "沒長卷：照舊");
  assert.ok(!hmwWalkCfg("").N.mk, "舊的呼叫方式（沒有 P）照舊");
  assert.ok(!hmwWalkCfg("p34", P).N.mk, "寬版：照舊");
  assert.deepEqual(J(hmwWalkCfg("", P0)), J(Object.assign({}, R("SHW_PG0"), SHW_HOMEMAP)));
});

test("〔原始碼〕入口只放大字：左右兩屏「🏮 西市」「🔭 觀星臺」、中間箭頭「← 西市」「觀星臺 →」，旁白另外說；沒有小字", () => {
  assert.deepEqual(HMP_SIDE.map(s => [s[0], s[1], s[2], s[5], s[6]]), [["hmpXsm", "🏮 西市", "西市", -1, "#/ximarket"], ["hmpGxt", "🔭 觀星臺", "觀星臺", 1, "#/guanxing"]]);
  assert.deepEqual(HMP_ARROW.map(a => [a[0], a[1], a[2], a[3]]), [["hmXsm", "← 西市", "往左看：西市", -1], ["hmGxt", "觀星臺 →", "往右看：觀星臺", 1]]);
  assert.ok(HMP_SIDE[0][3] < 0 && HMP_SIDE[0][3] > -100 && HMP_SIDE[1][3] > 100 && HMP_SIDE[1][3] < 200, "標籤在各自那一屏裡");
  assert.doesNotMatch(SRC_P, /<small>/, "入口不加說明小字");
  assert.match(SRC_P, /hmpOpen=id=>\{try\{return id==="hmpXsm"\?typeof xsmOpen==="function"&&xsmOpen\(\):typeof gxtOpen==="function"&&gxtOpen\(\)/, "解鎖條件照 07xsm／07gxt");
});

test("〔原始碼〕接點：07z 開頁呼叫 hmpInit、縮放傳 ext、換寬版呼叫 hmpSet、hmClamp 扣鏡頭位移；07t3、07w、07x 各一處；m.html 載入順序", () => {
  assert.match(SRC_Z, /if\(typeof hmpInit==="function"\)hmpInit\(P,hk,wv\)/);
  assert.match(SRC_Z, /zmPage\(v,typeof hmpZoomOpt==="function"\?hmpZoomOpt\(P\):null\)/);
  assert.match(SRC_Z, /if\(typeof hmpSet==="function"\)hmpSet\(P,k\)\}catch\(e\)\{\}[^\n]*\n  hmwWalk\(P,k\)\}/, "hmpSet 要在重掛走路角色之前");
  assert.match(SRC_Z, /function hmClamp\(P\)\{[^\n]*ox=parseFloat\(P\.style&&P\.style\.left\)\|\|0[^\n]*hmp-side/);
  const T3 = M("m/07t3-tabtube.js"); assert.match(T3, /const ox=parseFloat\(P\.style\.left\)\|\|0;P\.querySelectorAll\("\.shp-spot,\.po-sight"\)\.forEach\(b=>\{if\(b\.classList\.contains\("hmp-side"\)\)return;/);
  const W = M("m/07w-shipwalk.js"); assert.match(W, /xr=S\.C\.xr\|\|\[0,100\];if\(!\(p\[0\]>=xr\[0\]&&p\[0\]<=xr\[1\]/); assert.match(W, /Math\.min\(C\.dmax\|\|1\.2,/);
  const X = M("m/07x-zoom.js"); assert.match(X, /tx=cl\(tx,B\.W-s\*\(B\.ox\+B\.ew\+B\.er\),-s\*\(B\.ox-B\.el\)\)/); assert.match(X, /zmAttach\(W,P,o\|\|undefined\)/);
  const H = M("m.html"), i = s => H.indexOf("//#include m/" + s);
  assert.ok(i("07hmp-pano.js") > i("07xsm-ximarket.js") && i("07hmp-pano.js") > i("07gxt-guanxing.js") && i("07xsm-ximarket.js") > 0, "07hmp 要在 07xsm、07gxt 之後（它們也包 Home，先放好橋頭入口）");
  assert.doesNotMatch(SRC_P, /^[^\n]*[^:"'`]\/\/ [^\n]*$/m, "一行程式裡不插 // 註解");
});

test("〔原始碼〕11/14 開發者：長卷開著時中間橋頭「← 西市」「觀星臺 →」藏起來（太佔版面），只靠兩側 ‹ › 指引；藏起來時兩側箭頭不再當成重複、旁白照念", () => {
  assert.match(SRC_P, /if\(on\)\{if\(!b\._hmpO\)b\._hmpO=\{x:b\.hidden\};b\.hidden=true\}/, "長卷開著時藏起來");
  assert.match(SRC_P, /else if\(b\._hmpO\)\{b\.hidden=b\._hmpO\.x;delete b\._hmpO\}/, "長卷關掉時還原");
  assert.match(SRC_P, /dup=on&&i===0&&!!q&&!q\.hidden/, "標籤藏起來時，兩側箭頭的旁白、Tab 不要被關掉");
});
