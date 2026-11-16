// 11/16 開發者：「船艙」改叫「渡口」；「渡口/驛站都是用最一開始調色的方式漸漸變成有顏色」（選單：雲河渡口＋13 驛站）。
//   07f portName：雲河那一站叫「渡口」。07p：PORTC_ERAS／PORTF_ERAS 加 classic（data/shipmap/port_classic_c、_f.webp），驛站 yzColor 進門從水墨暈開成全彩。
//   07n：雲河渡口的 WebGL 動態貼圖改用全彩版、暈開播完才啟動；07w6b：景點資料認得 port_classic_c／_f。
// 不開瀏覽器：純函式放進 vm 跑，接線查原始碼。
// 用法：node --test xiangqi-lab/tools/test-port-yz-color-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = f => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");
const SHIP = M("07f-ship.js"), PC = M("07p-portcolor.js"), PFX = M("07n-portfx.js"), SD = M("07w6b-scenedata.js"), YZ = M("07m-yizhan.js");

test("〔行為〕雲河那一站的渡口叫「渡口」，其他朝代照舊「某朝的渡口」", () => {
  const ctx = { eraLabel: k => ({ tang: "唐" })[k] || k }; vm.createContext(ctx);
  vm.runInContext(SHIP.slice(SHIP.indexOf("function portName("), SHIP.indexOf("\n", SHIP.indexOf("function portName("))) + ";this.f=portName;", ctx);
  assert.equal(ctx.f("classic"), "渡口"); assert.equal(ctx.f("tang"), "唐的渡口");
  assert.ok(SD.includes('{re:/data\\/shipmap\\/port_classic(_c|_f)?\\.webp/,D:{k:"pt_cl",nm:"雲河・渡口"'), "景點資料認得上色版、名稱改渡口");
});

test("〔行為〕驛站 yzColor：每次開 App 每個驛站第一次進門才播；減少動態不播；底圖先換成淡彩加灰階、入口先藏", () => {
  const mk = (ss, rm) => {
    const SS = new Map(Object.entries(ss || {})), cls = new Set(), log = [];
    const img = { style: {}, _src: "data/yizhan/tang_f.webp", getAttribute: () => img._src, set src(v) { img._src = v; log.push("src:" + v) }, get src() { return img._src } };
    const P = { isConnected: true, classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) }, querySelector: () => img };
    const ctx = { sessionStorage: { getItem: k => SS.get(k) ?? null, setItem: (k, v) => SS.set(k, v) }, matchMedia: () => ({ matches: !!rm }), JSON, setTimeout: () => 0, clearTimeout() { },
      Image: function () { }, Promise: Object.assign(function () { }, { all: () => ({ then() { } }) }), pcCss() { }, pcRun() { log.push("run") } };
    vm.createContext(ctx); vm.runInContext(PC.slice(PC.indexOf("const YZC_ON=")) + ";this.yz=yzColor;", ctx);
    ctx.yz(P, "tang"); return { img, cls, SS, log };
  };
  const a = mk();
  assert.equal(a.img.style.filter, "grayscale(1)", "底圖灰階＝水墨起點"); assert.equal(a.img._src, "data/yizhan/tang_c.webp", "底圖先換淡彩");
  assert.ok(a.cls.has("pc-run"), "入口先藏起來，暈完才淡入"); assert.deepEqual(JSON.parse(a.SS.get("yzcSeen")), { tang: 1 }, "記下這次開 App 播過");
  const b = mk({ yzcSeen: JSON.stringify({ tang: 1 }) }); assert.equal(b.img.style.filter, undefined, "同一次開 App 第二次進門不播"); assert.equal(b.img._src, "data/yizhan/tang_f.webp");
  const c = mk({}, true); assert.equal(c.img.style.filter, undefined, "減少動態不播"); assert.ok(!c.cls.has("pc-run"));
});

test("〔原始碼〕接線：雲河加進上色名單；pcRun 播完拿掉灰階；驛站頁插好就呼叫；07n 貼圖用全彩、暈開播完才啟動", () => {
  for (const n of ["PORTC_ERAS", "PORTF_ERAS"]) assert.match(PC, new RegExp("const " + n + '=\\[[^\\]]*"qing","classic"\\]'), n + " 有 classic");
  assert.ok(PC.includes('P.removeEventListener("click",skip,true);img.style.filter="";'), "pcRun 結束拿掉灰階");
  assert.ok(YZ.includes('v.insertBefore(pg,pad);if(typeof yzColor==="function")yzColor(pg,k);'), "驛站頁呼叫 yzColor");
  assert.ok(PFX.includes('Promise.all([pfxImg(),"layers/pm1_depth.png"'), "07n 貼圖用 pfxImg()");
  assert.ok(PFX.includes('?"port_classic_f.webp":"port_classic.webp"'), "有全彩就用全彩");
  assert.ok(PFX.includes('if(P.querySelector(".pfx-gl"))return;if(P.classList.contains("pc-run"))'), "不重複建畫布、暈開中先等");
  /* 上色圖只放 CDN：公開副本沒有任何場景圖（沒有原圖 port_classic.webp）就不查 */
  const SM = path.join(ROOT, "xiangqi-lab", "site", "data", "shipmap");
  if (fs.existsSync(path.join(SM, "port_classic.webp"))) for (const f of ["port_classic_c.webp", "port_classic_f.webp"]) assert.ok(fs.existsSync(path.join(SM, f)), f + " 在 site");
});
