// 11/15 開發者「不是這種鏡像反轉，請參考遊戲最開頭的黑洞對戰旋轉的方法，讓一根手指可以移動看到任何角度的畫面」：
// 黑洞塔防大棋盤的一指拖曳改成跟自由鏡頭一樣繞整球（上下不設限、頭頂方向照 gntUp 連續轉），放手回到比較近的正面或盤底預設。
// 用法：node --test xiangqi-lab/tools/test-td-orbit.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "park3d.js"), "utf8");
const PI = Math.PI;

test("〔原始碼〕塔防鏡頭仰角不再夾 ±86°、不再到盤底硬翻 up，改用 gntUp", () => {
  const cam = SRC.match(/const tdCam=\(\)=>\{[\s\S]*?gntClear\(false\);tdDeco\(\)\};/);
  assert.ok(cam, "找得到 tdCam");
  assert.ok(!/86\*PI\/180/.test(cam[0]), "tdCam 不能再夾仰角");
  assert.ok(!/cam\.up\.set\(0,e<0\?-1:1,0\)/.test(cam[0]), "不能再用盤底硬翻 up");
  assert.ok(/gntUp\(ya,e\)/.test(cam[0]), "頭頂方向用 gntUp（跟開場黑洞對戰一樣）");
});

test("〔原始碼〕一指拖曳照每次移動量累加，轉過頭頂左右跟著反過來", () => {
  assert.ok(/TDOR\.yaw-=\(FLIPUP\?-1:1\)\*\(e\.clientX-P\.orb\.x\)\*\.008;TDOR\.el\+=\(e\.clientY-P\.orb\.y\)\*\.005;/.test(SRC), "拖曳要累加、上下不夾、FLIPUP 反向");
  assert.ok(!/-2\.75,\.5\)/.test(SRC), "舊的仰角上下限要拿掉");
});

test("〔原始碼〕意見回饋 1136：頭頂漢字牌（headOf＋07bht-td pnm）、底座光環＋敵方青描邊（tdDeco）", () => {
  assert.ok(/return\{el,draw,destroy,say,screenOf,headOf,/.test(SRC), "park3d 要匯出 headOf");
  assert.ok(/const headOf=i=>\{[\s\S]{0,400}myv\(HDV\)/.test(SRC), "headOf 要照背面鏡像（myv）");
  assert.ok(/gntClear\(false\);tdDeco\(\)\};/.test(SRC), "塔防鏡頭每格檢查光環／描邊");
  assert.ok(/try\{tdDeco\(\)\}catch\(e\)\{\}tdDragEnd\(true\)/.test(SRC), "切換塔防鏡頭時也要開關光環／描邊");
  const TD = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07bht-td.js"), "utf8");
  assert.ok(/k:"pnm "\+\(r\?"r":"b"\)/.test(TD), "bhtdMarks 每顆子一塊漢字牌");
  assert.ok(/classList\.contains\("pnm"\)\?\(PARK&&PARK\.v&&PARK\.v\.headOf\?PARK\.v\.headOf\(q\):null\)/.test(TD), "字牌用 headOf 定位");
  assert.ok(/\.bt-mk\.pnm\.r\{background:#FFF8EA;color:#B3121F/.test(TD) && /\.bt-mk\.pnm\.b\{background:#14204A;color:#fff/.test(TD), "我方白底朱字、敵方深藍底白字");
});

test("放手回正：回到比較近的正面（仰角差 0）或盤底（仰角差 ±180°）", () => {
  const m = SRC.match(/const tdElT=\(\)=>\{if\(!TDC\)return 0;([\s\S]*?)\};/);
  assert.ok(m, "找得到 tdElT");
  const make = el => new Function("TDC", "TDOR", "PI", "return (()=>{if(!TDC)return 0;" + m[1] + "})()")("tilt", { el }, PI);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(make(0), 0));
  assert.ok(near(make(.4), 0), "稍微抬高放手＝回正面");
  assert.ok(near(make(-1.2), 0), "還沒過一半＝回正面");
  assert.ok(near(make(-2), -PI), "轉過一半＝停在盤底");
  assert.ok(near(make(-PI - .3), -PI), "盤底附近＝停在盤底");
  assert.ok(near(make(-2 * PI + .2), -2 * PI), "繞一整圈回到正面（同一個角度，不倒轉回去）");
  assert.ok(near(make(3.5), PI), "往另一邊轉到盤底也一樣");
  assert.strictEqual(new Function("TDC", "TDOR", "PI", "return (()=>{if(!TDC)return 0;" + m[1] + "})()")(null, { el: 2 }, PI), 0, "不是塔防鏡頭＝0");
});
