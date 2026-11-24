/* W101（11/24）開發者截圖：中炮門掌門局「還沒切到棋盤，掌門就先落子了」。
   3D 園子開場的名言封面（park3d.js）要停 5～9 秒，掌門照門派棋路 0.9 秒就落子——玩家看到棋盤時「炮二平五」早就走完了。
   改法（src/local.js）：電腦先手的第一步，先等 0.6 秒讓畫面建好，封面（<html> 的 pk-veil）還在就再等，最多 20 秒。
   playFirstWait 抽出來在 vm 跑（行為）；接線和 park3d 的 pk-veil 掛上、拿掉用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const LOC = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "local.js"), "utf8");
const P3D = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "park3d.js"), "utf8");
function waitFn() {
  const a = LOC.indexOf("const FIRST_SETTLE="), b = LOC.indexOf("const veilOn=", a);
  assert.ok(a > 0 && b > a, "抓得到 playFirstWait 那一段");
  const c = {}; vm.createContext(c); vm.runInContext(LOC.slice(a, b) + ";this.f=playFirstWait;this.K=[FIRST_SETTLE,FIRST_MAX];", c);
  return c;
}

test("playFirstWait：開局 0.6 秒內先等畫面建好；封面還在每 0.3 秒再看；封面收掉就走；最多等 20 秒", () => {
  const { f, K } = waitFn();
  assert.deepEqual([...K], [600, 20000]);
  assert.equal(f(0, 0, false), 600, "剛開局：先等 0.6 秒（封面要等畫面畫出來才掛上）");
  assert.equal(f(0, 450, true), 150);
  assert.equal(f(0, 700, true), 300, "封面還在：再等");
  assert.equal(f(0, 8000, true), 300, "名言封面 5～9 秒都要等");
  assert.equal(f(0, 700, false), 0, "沒有封面（平面棋盤）或封面收掉：可以走");
  assert.equal(f(0, 20000, true), 0, "封面萬一一直沒收：20 秒後照走，不會卡住");
});

test("〔原始碼〕playEngine 一開頭、在棋友棋路與引擎之前，電腦先手（還沒走過任何一步）就照 playFirstWait 延後", () => {
  const i = LOC.indexOf("async function playEngine(){"), body = LOC.slice(i, i + 1200);
  const g = body.indexOf("if(!P.moves.length){if(FIRST.id!==P.id)FIRST={id:P.id,t0:Date.now()};const w=playFirstWait(FIRST.t0,Date.now(),veilOn());if(w){setTimeout(playEngine,w);return}}");
  assert.ok(g > 0, "有延後那一行");
  assert.ok(g < body.indexOf("npcKeyOf(P,localStorage)"), "排在棋友棋路（掌門 0.9 秒落子）之前");
  assert.ok(g > body.indexOf("if(!P||P.result||P.turn===P.human||playBusy)return;"), "輪到玩家、忙碌中照舊直接回");
  assert.match(LOC, /const veilOn=\(\)=>\{try\{return typeof document!=="undefined"&&!!document\.documentElement&&document\.documentElement\.classList\.contains\("pk-veil"\)\}catch\(e\)\{return false\}\};/);
});

test("〔原始碼〕依賴的訊號還在：park3d 封面掛上時加 pk-veil，封面收掉（reveal）或園子關掉（destroy）時拿掉", () => {
  assert.match(P3D, /el\.append\(veil\);try\{document\.documentElement\.classList\.add\("pk-veil"\)\}catch\(e\)\{\}/);
  assert.match(P3D, /veil\.style\.opacity=0;setTimeout\(\(\)=>veil\.remove\(\),400\);try\{document\.documentElement\.classList\.remove\("pk-veil"\)\}catch\(e\)\{\}/, "reveal 拿掉");
  assert.match(P3D, /function destroy\(\)\{[^}]*if\(!shown\)document\.documentElement\.classList\.remove\("pk-veil"\)/, "沒看到就關掉也拿掉");
});
