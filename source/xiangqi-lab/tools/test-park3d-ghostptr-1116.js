// 11/16 開發者 hspx P0「不知道滑到那個地方 導致轉動旋轉會壞掉失常」「會無法兩指放大或是正常旋轉畫面」「也無法正常點擊角色移動」：
//   手指滑出畫面、碰到按鈕或被系統手勢搶走時，iPhone 有時不送 pointerup／pointercancel，ptrs 留下一根看不見的手指，
//   之後一根手指按下去就被當成兩指捏合：拖曳變縮放、真捏合距離算錯、點擊不選子。
// 不開瀏覽器：從 src/park3d.js 抽出觸控那段（ptrGhost 到觸控板捏合之前），用假的 canvas 派事件實際跑
// 用法：node --test tools/test-park3d-ghostptr-1116.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "../src/park3d.js"), "utf8").replace(/\r\n/g, "\n");
const a = SRC.indexOf("    const ptrGhost=e=>"), b = SRC.indexOf("    // 觸控板捏合", a);
assert.ok(a > 0 && b > a, "park3d.js 找得到觸控那段");
const CODE = SRC.slice(a, b);

function kit() {
  const H = {}, log = { tap: [], zoom: [] };
  const cvs = { addEventListener: (k, f) => { H[k] = f }, setPointerCapture: () => { } };
  const env = { cvs, log, GIANT: true, TELE: null, TDC: null, TDP: null, FULL: true, FLIPUP: false, W: 390, H: 400, ZMIN: .2, ZMAX: 3, HOME: { p: .5, z: 1 } };
  const f = new Function("env", `
    let {cvs,log,GIANT,TELE,TDC,TDP,FULL,FLIPUP,W,H,ZMIN,ZMAX,HOME}=env;
    const ptrs=new Map(),TDPT=new Map(),TDOR={pin:null,hold:0,z:1};let down=null,lastTap=0,pinch=null,tyaw=0,tpitch=.5,tzoom=1,userZ=false,tapAmb=null;
    const IN={ph:""},opt={onTap:i=>log.tap.push(i)},clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
    const spread=()=>{const p=[...ptrs.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};
    const inEnd=()=>{},gntFocus=()=>null,reset=()=>{},pick=()=>3,showAmb=()=>{},infoPick=()=>null,pwPoke=()=>{},tdDown=()=>{},tdMove=()=>{},tdUp=()=>{},tdDragEnd=()=>{},tapPiece=(i)=>opt.onTap(i);   /* W68（11/22）點棋子改走 tapPiece：背面疊子才跳選單（另見 test-park3d-stack-1122.js），這裡測觸控、照舊直接交給 onTap */
    const performance={now:()=>Date.now()};
    ${CODE}
    return{st:()=>({n:ptrs.size,pinch:!!pinch,down:!!down,yaw:tyaw,zoom:tzoom})}`);
  const o = f(env);
  const ev = (k, id, x, y, prim) => H[k]({ pointerId: id, clientX: x, clientY: y, isPrimary: !!prim });
  return { H, log, o, ev };
}

test("〔行為〕正常：一根手指點下去、放開＝選子", () => {
  const K = kit(); K.ev("pointerdown", 1, 100, 100, true); K.ev("pointerup", 1, 100, 100, true);
  assert.deepEqual(K.log.tap, [3]); assert.equal(K.o.st().n, 0);
});

test("〔行為〕P0：上一根手指沒送放開（殘留），下一根手指按下去照常拖曳轉動、照常點擊選子，不被當成兩指捏合", () => {
  const K = kit(); K.ev("pointerdown", 1, 100, 100, true); K.ev("pointermove", 1, 380, 100, true);   /* 滑出畫面，之後沒有 pointerup */
  K.ev("pointerdown", 2, 200, 200, true); assert.equal(K.o.st().pinch, false, "不是捏合"); assert.equal(K.o.st().n, 1, "殘留的那根清掉了");
  K.ev("pointermove", 2, 260, 200, true); assert.notEqual(K.o.st().yaw, 0, "左右拖曳會轉"); assert.equal(K.o.st().zoom, 1, "不會亂縮放");
  K.ev("pointerup", 2, 260, 200, true);
  K.ev("pointerdown", 3, 150, 150, true); K.ev("pointerup", 3, 150, 150, true); assert.deepEqual(K.log.tap, [3], "點擊照常選子");
});

test("〔行為〕兩指捏合照常：第二根手指（不是 isPrimary）不會清掉第一根；殘留時捏合的距離也照真的兩根算", () => {
  const K = kit(); K.ev("pointerdown", 9, 0, 0, true);   /* 殘留 */
  K.ev("pointerdown", 1, 100, 100, true); K.ev("pointerdown", 2, 200, 100, false); assert.equal(K.o.st().pinch, true);
  K.ev("pointermove", 2, 300, 100, false); assert.ok(Math.abs(K.o.st().zoom - .5) < 1e-9, "兩指拉開一倍＝放大（zoom 減半）");
});

test("〔行為〕失去追蹤（lostpointercapture）沒送 pointerup 也當放開；正常放開之後再來不會出錯", () => {
  const K = kit(); K.ev("pointerdown", 1, 100, 100, true); K.ev("pointerdown", 2, 200, 100, false); assert.equal(K.o.st().pinch, true);
  K.ev("lostpointercapture", 2, 0, 0, false); assert.equal(K.o.st().pinch, false); assert.equal(K.o.st().n, 1);
  K.ev("pointerup", 1, 100, 100, true); K.ev("lostpointercapture", 1, 0, 0, true); assert.equal(K.o.st().n, 0);
});

test("〔原始碼〕pointerdown 一進來先 ptrGhost（塔防的 TDPT 一起清）", () => {
  assert.ok(SRC.includes('cvs.addEventListener("pointerdown",e=>{ptrGhost(e);if(TDC){tdDown(e);return}'));
  assert.ok(/const ptrGhost=e=>\{if\(!e\.isPrimary\)return;.*TDPT\.clear\(\)/.test(SRC));
  assert.ok(SRC.includes('cvs.addEventListener("lostpointercapture",'));
});
