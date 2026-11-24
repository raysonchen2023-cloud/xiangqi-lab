/* W101（11/24）開發者截圖：中炮門掌門局「還沒切到棋盤，掌門就先落子了」。
   3D 園子開場的名言封面（park3d.js）要停 5～9 秒，掌門照門派棋路 0.9 秒就落子——玩家看到棋盤時「炮二平五」早就走完了。
   改法（src/local.js）：電腦先手的第一步，至少等 0.6 秒，之後要棋盤真的看得到（#bbox 顯示；3D 開著時 .park3d 建好、封面 pk-veil 收掉）才走，最多 20 秒。
   預覽站實測過只看 pk-veil 不夠：封面開局 0.8 秒才掛上，之前看起來沒有封面，第一步 0.98 秒就走了。
   playFirstWait 抽出來在 vm 跑（行為）；接線、就緒判斷和 park3d 的訊號用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const LOC = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "local.js"), "utf8");
const P3D = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "park3d.js"), "utf8");
function waitFn() {
  const a = LOC.indexOf("const FIRST_SETTLE="), b = LOC.indexOf("const boardReady=", a);
  assert.ok(a > 0 && b > a, "抓得到 playFirstWait 那一段");
  const c = {}; vm.createContext(c); vm.runInContext(LOC.slice(a, b) + ";this.f=playFirstWait;this.K=[FIRST_SETTLE,FIRST_MAX,FIRST_VEIL_MAX];", c);
  return c;
}

test("playFirstWait：至少等 0.6 秒；棋盤還看不到就每 0.3 秒再看；看得到就走；最多等 20 秒", () => {
  const { f, K } = waitFn();
  assert.deepEqual([...K], [600, 20000, 90000]);
  assert.equal(f(0, 0, true, false), 600, "剛開局：就算看起來就緒也至少等 0.6 秒");
  assert.equal(f(0, 450, false, false), 150);
  assert.equal(f(0, 700, false, false), 300, "棋盤還看不到（3D 還沒建好）：再等");
  assert.equal(f(0, 8000, false, true), 300, "名言封面 5～9 秒都要等");
  assert.equal(f(0, 700, true, false), 0, "看得到棋盤：可以走");
  assert.equal(f(0, 20000, false, false), 0, "棋盤一直沒出現、3D 一直沒建好：20 秒後照走，不會卡住");
});

test("#134 Android 預驗：慢的機器封面停 23 秒——封面還在時不受 20 秒上限，另外最多等 90 秒", () => {
  const { f } = waitFn();
  assert.equal(f(0, 21700, false, true), 300, "21.7 秒封面還在（模擬器實際情況）：不能走");
  assert.equal(f(0, 23400, true, false), 0, "23.4 秒封面收掉、看得到棋盤：走");
  assert.equal(f(0, 89000, false, true), 300);
  assert.equal(f(0, 90000, false, true), 0, "90 秒保險：封面萬一一直沒收掉也不會永遠不走");
  assert.equal(f(0, 300, false, true), 300, "0.6 秒內封面就掛上：照樣等");
});

test("〔原始碼〕playEngine 一開頭、在棋友棋路與引擎之前，電腦先手（還沒走過任何一步）就照 playFirstWait 延後；就緒＝棋盤顯示、3D 建好、封面收掉", () => {
  const i = LOC.indexOf("async function playEngine(){"), body = LOC.slice(i, i + 1200);
  const g = body.indexOf("if(!P.moves.length){if(FIRST.id!==P.id)FIRST={id:P.id,t0:Date.now()};const w=playFirstWait(FIRST.t0,Date.now(),boardReady(),veilOn());if(w){setTimeout(playEngine,w);return}}");
  assert.ok(g > 0, "有延後那一行");
  assert.ok(g < body.indexOf("npcKeyOf(P,localStorage)"), "排在棋友棋路（掌門 0.9 秒落子）之前");
  assert.ok(g > body.indexOf("if(!P||P.result||P.turn===P.human||playBusy)return;"), "輪到玩家、忙碌中照舊直接回");
  const r = LOC.slice(LOC.indexOf("const boardReady="), LOC.indexOf("let FIRST="));
  assert.ok(r.includes('if(document.documentElement.classList.contains("pk-veil"))return false;'), "封面還在：不就緒");
  assert.ok(r.includes('const hb=document.querySelector("#bbox");if(!hb||!hb.offsetParent)return false;'), "對局頁的棋盤還沒顯示：不就緒");
  assert.ok(r.includes('if(typeof parkOn==="function"&&parkOn()){const k=[...document.querySelectorAll(".park3d")].some(e=>e.style.display!=="none"&&e.isConnected);if(!k)return false}'), "3D 開著但園子還沒建好：不就緒（封面要等園子建好才掛上）");
});

test("〔原始碼〕依賴的訊號還在：park3d 的根元素是 .park3d；封面掛上時加 pk-veil，封面收掉（reveal）或園子關掉（destroy）時拿掉", () => {
  assert.ok(P3D.includes('el.className="park3d"'));
  assert.ok(P3D.includes('el.append(veil);try{document.documentElement.classList.add("pk-veil")}catch(e){}'), "封面掛上");
  assert.ok(P3D.includes('veil.style.opacity=0;setTimeout(()=>veil.remove(),400);try{document.documentElement.classList.remove("pk-veil")}catch(e){}'), "reveal 拿掉");
  assert.match(P3D, /function destroy\(\)\{[^}]*if\(!shown\)document\.documentElement\.classList\.remove\("pk-veil"\)/, "沒看到就關掉也拿掉");
});
