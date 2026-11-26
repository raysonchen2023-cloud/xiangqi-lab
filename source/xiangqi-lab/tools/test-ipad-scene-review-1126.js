/* W164、W165（11/26 20:28 外部複審，#159 iPad 橫向場景）：
   W164 營地橫式：路線是一圈，原本少接最後一段（w30→w0），完成第 12 課後走到結業旗要繞大半圈（約 3,088 像素，直線約 211）。
        用 vm 跑 07y2-campmap.js 的 cpCfgL 與 07w-shipwalk.js 的 shwPath（切出那幾段），算結業路線長度。
   W165 書齋橫式：07w6 換成橫式圖時一律不跳物件說明，亮格 12 件器物點不開。改成頁面給 D.wide（橫式座標）時照它判斷。
        用 vm 跑 07w6-sceneinfo.js 的 sciMount 與 07z4-studymap.js 的 MZ_L，在假的橫式畫面點亮格第一格，要跳出「青瓷玉壺春瓶」。
   兩項都有改壞驗證。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");

/* ---- W164 營地 ---- */
function campLen(campSrc) {
  const sw = rd("07w-shipwalk.js"), a = sw.indexOf("const shwPx="), b = sw.indexOf("/* 意見回饋 782", sw.indexOf("const shwPx="));
  if (a < 0 || b < 0) throw new Error("07w-shipwalk.js 找不到 shwPx～shwPath");
  const cp = campSrc.slice(campSrc.indexOf("const CP_LK="), campSrc.indexOf("if(typeof SHW_EXITS"));
  const c = { Math, Set, Object, JSON, Number, String, Array }; vm.createContext(c);
  vm.runInContext(sw.slice(a, b) + "\n" + cp + "\nvar __C=cpCfgL(13),__to=\"w\"+CP_NODE_L[12],__ids=shwPath(__C,__C.home,__to);" +
    "var __len=0;for(let i=1;i<__ids.length;i++)__len+=shwPx(__C,__C.N[__ids[i-1]],__C.N[__ids[i]]);var __dir=shwPx(__C,__C.N[__C.home],__C.N[__to]);", c);
  return { len: c.__len, dir: c.__dir, seg: c.__ids.length - 1 };
}
const campProblems = (src) => { const r = campLen(src); return r.len > Math.max(3 * r.dir, 600) ? [`結業路線繞遠：${Math.round(r.len)} 像素、${r.seg} 段（直線 ${Math.round(r.dir)}）`] : [] };

test("W164 營地橫式：完成第 12 課後走到結業旗不繞遠", () => {
  assert.deepEqual(campProblems(rd("07y2-campmap.js")), []);
});

/* ---- W165 書齋 ---- */
function studyShown(sciSrc, studySrc, scw) {
  const el = () => ({ style: {}, dataset: {}, classList: { add() {}, contains() { return false }, toggle() {} }, setAttribute() {}, append() {}, appendChild() {}, addEventListener() {}, querySelector() { return null }, querySelectorAll() { return [] } });
  const c = { document: { getElementById: () => null, createElement: el, addEventListener() {}, head: { append() {}, appendChild() {} }, body: { append() {} } }, addEventListener() {}, removeEventListener() {},
    store: { get: (k, d) => d, set() {} }, esc: String, setTimeout: () => 0, Math, JSON, Set, Map, Date, String, Number, Array, Object, __shown: [] };
  c.window = c; vm.createContext(c); vm.runInContext(sciSrc, c);
  vm.runInContext("sciShow=function(D,x){__shown.push(x.n)};sciHint=function(){};", c);
  /* 書齋：只取 MZ_L 與 MZ_RELIC，照 07z4 的方式組 it 與 wide（直向格子用一組假的） */
  const pick = (a, b) => studySrc.slice(studySrc.indexOf(a), studySrc.indexOf(b, studySrc.indexOf(a)));
  vm.runInContext(pick("const MZ_L={", "if(typeof SCW") + "\n" + pick("const MZ_RELIC=[", "const MZ_SCI=") , c);
  const usesWide = /wide:\{W:MZ_L\.W,H:MZ_L\.H,it:itW\}/.test(studySrc);
  vm.runInContext(`var __it=MZ_RELIC.map(([n,t,nd],i)=>({n,nd,t,s:[[[0,0],[1,0],[1,1],[0,1]]]}));
    var __itW=MZ_RELIC.map(([n,t,nd],i)=>{const c=MZ_L.cells[i];return{n,nd,t,s:[[[c[0]+6,c[1]+6],[c[2]-6,c[1]+6],[c[2]-6,c[3]-6],[c[0]+6,c[3]-6]]]}});
    var __D={k:"study",nm:"書齋",W:768,H:1376,it:__it${usesWide ? ",wide:{W:MZ_L.W,H:MZ_L.H,it:__itW}" : ""}};`, c);
  const H = {}, P = { dataset: scw ? { scw: "1" } : {}, classList: { contains: () => false }, contains: () => true, querySelector: () => null, append() {}, closest: () => null,
    addEventListener(t, f) { H[t] = f } };
  const I = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 2560, height: 1600 }), complete: true, naturalWidth: 2560, addEventListener() {} };
  c.__P = P; c.__I = I; vm.runInContext("sciMount(__P,__I,__D)", c);
  const cell = c.MZ_L ? vm.runInContext("MZ_L.cells[0]", c) : [120, 333, 256, 499];
  const tgt = { closest: () => null };
  H.click({ target: tgt, clientX: (cell[0] + cell[2]) / 2, clientY: (cell[1] + cell[3]) / 2, defaultPrevented: false });
  return c.__shown;
}
const studyProblems = (sci, study) => { const s = studyShown(sci, study, true); return s.includes("青瓷玉壺春瓶") ? [] : ["書齋橫式點亮格第一格要跳「青瓷玉壺春瓶」（實際 " + JSON.stringify(s) + "）"] };

test("W165 書齋橫式：點亮格器物跳說明", () => {
  assert.deepEqual(studyProblems(rd("07w6-sceneinfo.js"), rd("07z4-studymap.js")), []);
});

/* iMac Claude 1 預驗（11/26）：橫式珍品熱區 mzZhen 蓋住整個亮格櫃，手點格子打開的是珍品面板。
   熱區是按鈕、疊在畫面最上層，所以橫式 12 格的中心不能落在熱區裡。珍品熱區照說明文字放在下方櫃門。
   例外：橫式圖裡「修為」就是第 3 格的香爐、「秘境棋友」就是第 12 格的供石（標註圖刻意掛的），這兩格點了開功能。 */
const COVER_OK = { 3: "mzXp", 12: "mzSecret" };
function coverProblems(studySrc) {
  const c = {}; vm.createContext(c);
  vm.runInContext(studySrc.slice(studySrc.indexOf("const MZ_L={"), studySrc.indexOf("if(typeof SCW", studySrc.indexOf("const MZ_L={"))) + "\nvar __L=MZ_L;", c);
  const L = c.__L, bad = [];
  L.cells.forEach((q, i) => { const x = (q[0] + q[2]) / 2, y = (q[1] + q[3]) / 2;
    for (const s of L.spots) if (x >= s[1] && x <= s[3] && y >= s[2] && y <= s[4] && COVER_OK[i + 1] !== s[0]) bad.push(`亮格第 ${i + 1} 格被熱區 ${s[0]} 蓋住`); });
  return bad;
}
test("W165 書齋橫式：亮格 12 格不被熱區按鈕蓋住", () => {
  assert.deepEqual(coverProblems(rd("07z4-studymap.js")), []);
});

test("改壞驗證：營地少接環線、書齋沒給橫式座標，檢查都要抓得到", () => {
  const camp = rd("07y2-campmap.js"), badCamp = camp.replace(/\n  E\.push\(`w\$\{CP_L\.path\.length-1\}-w0`\);[^\n]*/, "");
  assert.notEqual(badCamp, camp); assert.ok(campProblems(badCamp).length > 0, "營地少接環線要抓得到");
  const study = rd("07z4-studymap.js"), badStudy = study.replace(",wide:{W:MZ_L.W,H:MZ_L.H,it:itW}", "");
  assert.notEqual(badStudy, study); assert.ok(studyProblems(rd("07w6-sceneinfo.js"), badStudy).length > 0, "書齋沒給橫式座標要抓得到");
  const badCover = study.replace('["mzZhen",115,883,678,1254,', '["mzZhen",102,269,742,858,');
  assert.notEqual(badCover, study); assert.ok(coverProblems(badCover).length > 0, "珍品熱區蓋住亮格要抓得到");
});
