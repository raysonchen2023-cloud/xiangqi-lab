// 11/16 開發者「Claude 還沒做的三項開始做」：今日異象〈渾天異象〉、聽雨茶坊暗棋〈聽雨翻子〉兩首專屬配樂（開發者聽過說可以）
// 不開瀏覽器：抽出 07gxd 的 gxdTick、07xsd 的 xsdBgmOn，用假的 BGM／bgmForce 實際跑；接點用原始碼比對
// 用法：node --test tools/test-extra-bgm-1116.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const GXD = rd("xiangqi-db/m/07gxd-daily.js"), XSD = rd("xiangqi-db/m/07xsd-xsmdark.js"), XSM = rd("xiangqi-db/m/07xsm-ximarket.js"), CPU = rd("xiangqi-db/m/08b-cpugame.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找得到 " + a); return src.slice(i, j) };

test("〔行為〕今日異象、自由擺陣的局（journey gxd:）放渾天異象；別的局不動；已經在放就不重設", () => {
  const log = [], BGM = { force: null }, bgmForce = f => { BGM.force = f; log.push(f) };
  const o = new Function("BGM", "bgmForce", cut(GXD, "const GXD_BGM=", "if(typeof addEventListener") + ";return{GXD_BGM,gxdTick}")(BGM, bgmForce);
  assert.equal(o.GXD_BGM, "guanxing/yixiang_1.mp3");
  o.gxdTick({ journey: "bh:gs3" }); o.gxdTick({ journey: "xs-han-0" }); assert.deepEqual(log, [], "黑洞、別的局不動");
  o.gxdTick({ journey: "gxd:2026-11-16" }); o.gxdTick({ journey: "gxd:2026-11-16" }); o.gxdTick({ journey: "gxd:fabc" });
  assert.deepEqual(log, ["guanxing/yixiang_1.mp3"], "今日異象、自由擺陣都放，只設一次");
});

test("〔行為〕暗棋放聽雨翻子；樂棚正在放的不動", () => {
  const run = mu => { const log = [], BGM = { force: mu }, XSM_MU = { f: mu }, bgmForce = f => { BGM.force = f; log.push(f) };
    const o = new Function("BGM", "bgmForce", "XSM_MU", cut(XSD, "const XSD_BGM=", "function xsdPage(") + ";return{XSD_BGM,xsdBgmOn}")(BGM, bgmForce, XSM_MU); o.xsdBgmOn(); return { log, XSM_MU, o } };
  const a = run(null); assert.deepEqual(a.log, ["xsm/anqi_1.mp3"]);
  const b = run("tang/pipa_3.mp3"); assert.deepEqual(b.log, [], "樂棚點了一首正在放：不動");
});

test("〔原始碼〕接點：08b 每步叫 gxdTick；離開對局頁還原；暗棋頁走 xsdBgmOn；離開西市也停暗棋曲；配樂檔與曲名", () => {
  assert.ok(CPU.includes('if(typeof gxTick==="function")gxTick(st);if(typeof gxdTick==="function")gxdTick(st);'));
  assert.ok(GXD.includes('if(!/^#\\/journey\\/play/.test(location.hash)&&typeof BGM!=="undefined"&&BGM.force===GXD_BGM&&typeof bgmForce==="function")bgmForce(null)'), "離開對局頁還原");
  assert.ok(XSM.includes('function XsmPage(v,sub){try{if(xsmOpen()){if(sub==="dark"&&typeof xsdBgmOn==="function")xsdBgmOn();else xsmBgmOn()}}catch(e){}'));
  assert.ok(XSM.includes('(typeof XSD_BGM!=="undefined"&&f===XSD_BGM)'), "xsmBgmMine 認得暗棋曲（離開西市一起停）");
  /* 配樂與新曲名只在 CDN：本機有完整配樂資料才檢查 */
  const B = path.join(ROOT, "xiangqi-lab", "site", "data", "bgm");
  if (fs.existsSync(path.join(B, "blackhole", "bh_1.mp3"))) {
    for (const f of ["guanxing/yixiang_1.mp3", "xsm/anqi_1.mp3"]) assert.ok(fs.existsSync(path.join(B, f)), f);
    const J = JSON.parse(fs.readFileSync(path.join(B, "titles.json"), "utf8")); assert.equal(J["guanxing/yixiang_1.mp3"], "渾天異象"); assert.equal(J["xsm/anqi_1.mp3"], "聽雨翻子");
  }
});
