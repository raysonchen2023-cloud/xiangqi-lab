// hspx 1086（開發者 11/12）：黑洞局吃子加強＋黑洞專屬絕殺（星盤閉合＋化氣為茶）不退回通用水墨絕殺
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..", ".."), rd = f => fs.readFileSync(path.join(R, f), "utf8");
const P3 = rd("xiangqi-lab/src/park3d.js"), BH = rd("xiangqi-db/m/07bh-blackhole.js"), CG = rd("xiangqi-db/m/08b-cpugame.js");

test("〔原始碼〕park3d 對外有 mateFx，出錯也會叫 done（結果視窗不會卡住）", () => {
  assert.match(P3, /mateFx:o=>\{try\{return mateFx\(o\)\}catch\(e\)\{try\{o&&o\.done&&o\.done\(\)\}/);
  assert.match(P3, /const mateFx=o=>/);
});
test("〔原始碼〕吃子分鏡照 ChatGPT 141：將死那一步亮相 0.6 秒、物件 1.35 倍、命中停格 0.2 秒", () => {
  assert.match(P3, /GCAP=\{fin:\{su:\.6,s:1\.35\},norm:\{su:\.35,s:1\.2\}\}/);
  assert.match(P3, /GHIT=\{fin:\{hs:\.2,/);
  assert.match(P3, /const ETS=now<HSTOP\?0:FXTS/);
});
test("〔原始碼〕命中照真正撞到的時間觸發（cineHit 在 impact 裡）", () => {
  assert.match(P3, /const impact=\(\)=>\{cineHit\(x1,z1,fin\);/);
});
test("〔原始碼〕紅方吃子：被吃的星樞棋兵也吸進黑洞", () => {
  assert.match(P3, /if\(red\)gntSuck\(cap,\{K:mv\.K==="K"\?"K":"B"/);
  assert.match(P3, /gntCapFx\(cap,by,board,\{K:GK,f:L\.f,t:L\.t\}\)/);
});
test("〔原始碼〕絕殺等吃子播完才開始（CAPBUSY）", () => {
  assert.match(P3, /if\(CAPBUSY>0&&performance\.now\(\)-CAPB_T<7000\)/);
  assert.match(P3, /if\(cap&&GIANT\)\{CAPBUSY\+\+;CAPB_T=performance\.now\(\)\}/);
});
test("〔原始碼〕減少動態：不運鏡、不震、不閃", () => {
  assert.match(P3, /const cineGo=\(keys,o\)=>\{if\(RDM\|\|!GIANT\)return;/);
  assert.match(P3, /const fxShake=\(a,d\)=>\{if\(RDM\|\|/);
  assert.match(P3, /const fxFlash=\(a,d\)=>\{if\(RDM\|\|/);
});
test("〔原始碼〕黑洞局將死改走 bhMateFx，3D 沒開才放通用 killFx", () => {
  assert.match(CG, /if\(k>=0&&!\(typeof bhMateFx==="function"&&bhMateFx\(st,k\)\)\)\{MODAL_HOLD=Date\.now\(\)\+2700;killFx\(/);
  assert.match(BH, /function bhMateFx\(st,k\)\{try\{if\(!bhIs\(st\)/);
  assert.match(BH, /LAST_KFX=Date\.now\(\)\+15000/);
  assert.match(BH, /done:\(\)=>\{LAST_KFX=Date\.now\(\);if\(typeof modalSkip==="function"\)modalSkip\(\)/);
});
test("〔原始碼〕序局化茶、一般黑洞局化星砂", () => {
  assert.match(BH, /mateFx\(\{sq:k,tea:xu,/);
  assert.match(BH, /const xu=st\.journey===BHX_ID/);
});
