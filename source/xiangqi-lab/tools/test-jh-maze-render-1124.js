/* W87c（11/24）地底迷宮回味感：45 度斜俯視、像素材質介面、油燈閃爍、事件 msg／card 處理口（m/07z9m-maze.js）。
   開發者 11/24（iMac Claude 1 轉）：「禮拜四先換像素材質」「45 度斜俯視、更容易迷路的地圖（岔路、死路、暗門）、撿得到碑刻文書講漕運歷史」；油燈快熄時會閃。
   3D 畫面本身要靠 iOS、Android 預驗；這裡驗純函式和原始碼。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-maze.js"), "utf8");
function load(mem = {}) {
  const c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze" }) });
  vm.createContext(c); vm.runInContext(SRC, c); return c;
}
const R = (c, n) => vm.runInContext(n, c);

test("油燈閃爍：亮度倍率大多在 1 左右，偶爾暗一下（約 4% 暗到 .55、6% 暗到 .8）；每盞燈各閃各的；減少動態固定 1", () => {
  const c = load(), F = R(c, "jhMzFlick");
  let dip = 0, mid = 0, n = 0, lo = 9, hi = 0;
  for (let t = 0; t < 600000; t += 180) { const v = F(t, 3, false); n++; lo = Math.min(lo, v); hi = Math.max(hi, v); if (v < .62) dip++; else if (v < .88) mid++ }
  assert.ok(lo > .45 && hi < 1.12, "範圍：" + lo + "～" + hi);
  assert.ok(dip / n > .02 && dip / n < .07, "暗到 .55 的比例約 4%：" + (dip / n));
  assert.ok(mid / n > .03 && mid / n < .1, "暗到 .8 的比例約 6%：" + (mid / n));
  let same = 0; for (let t = 0; t < 60000; t += 180) if (Math.abs(F(t, 3, false) - F(t, 4, false)) < 1e-9) same++;
  assert.ok(same < 5, "兩盞燈不會同步閃");
  for (const t of [0, 1234, 99999]) assert.equal(F(t, 3, true), 1, "減少動態：不閃");
});

test("像素材質：載得到就換上，最近點取樣（不糊）、不做 mipmap、一格對應整張圖一次；載不到留著程式畫的；沒給網址不載", () => {
  const c = load(), TL = R(c, "jhMzTexLoad"), calls = [];
  const T3 = { NearestFilter: "N", ClampToEdgeWrapping: "E", sRGBEncoding: 3001, TextureLoader: function () { this.load = (u, ok, _p, bad) => calls.push({ u, ok, bad }) } };
  const old = { dispose() { this.gone = true } }, mat = { map: old, needsUpdate: false }, texs = [];
  assert.equal(TL(T3, "data/maze/central/floor.webp", mat, texs), true); assert.equal(calls[0].u, "data/maze/central/floor.webp");
  const t = { wrapS: 0, wrapT: 0, repeat: { set(a, b) { this.v = [a, b] } } };
  calls[0].ok(t);
  assert.deepEqual([t.magFilter, t.minFilter, t.generateMipmaps, t.wrapS, t.wrapT, t.repeat.v, t.encoding], ["N", "N", false, "E", "E", [1, 1], 3001]);
  assert.equal(mat.map, t); assert.equal(mat.needsUpdate, true); assert.ok(texs.includes(t)); assert.ok(old.gone, "換下來的程式畫材質釋放掉");
  const mat2 = { map: old }; TL(T3, "x.webp", mat2, []); calls[1].bad(new Error("404")); assert.equal(mat2.map, old, "載不到：留著程式畫的");
  assert.equal(TL(T3, "", mat2, []), false); assert.equal(TL(T3, undefined, mat2, []), false); assert.equal(calls.length, 2, "沒給網址不載");
  assert.equal(TL({}, "x.webp", mat2, []), false, "沒有 TextureLoader（舊版 three）不載");
});

test("斜俯視：鏡頭水平轉 45 度、俯角 35～40 度；方向鈕的斜箭頭跟畫面上的方向一致（北＝右上、東＝右下、南＝左下、西＝左上）", () => {
  const c = load(), ISO = R(c, "JH_MZ_ISO"), PAD = JSON.parse(JSON.stringify(R(c, "JH_MZ_PADG")));
  assert.ok(Math.abs(ISO.yaw - Math.PI / 4) < 1e-9); const el = ISO.el * 180 / Math.PI; assert.ok(el >= 35 && el <= 40, "俯角 " + el);
  /* 鏡頭在目標的 (sin yaw, ·, cos yaw) 方向往回看：畫面往上＝往鏡頭前方（-sin, -cos），畫面往右＝前方轉 90 度 */
  const fw = [-Math.sin(ISO.yaw), -Math.cos(ISO.yaw)], rt = [-fw[1], fw[0]];
  const scr = ([dx, dy]) => { const sx = dx * rt[0] + dy * rt[1], sy = dx * fw[0] + dy * fw[1]; return (sy > 0 ? "上" : "下") + (sx > 0 ? "右" : "左") };
  const want = { "上右": "↗", "下右": "↘", "下左": "↙", "上左": "↖" }, DIR = { u: [0, -1], r: [1, 0], d: [0, 1], l: [-1, 0] };
  for (const [k, flat, iso] of PAD) assert.equal(iso, want[scr(DIR[k])], k + "：畫面上是" + scr(DIR[k]) + "，箭頭要是 " + want[scr(DIR[k])]);
  assert.deepEqual(PAD.map((x) => x[1]), ["▲", "▶", "▼", "◀"], "平面版照舊");
  /* CSS 把四個鍵擺到對應的斜角（3×3 格子：右上 1/3、右下 3/3、左下 3/1、左上 1/1） */
  for (const [k, ga] of [["u", "1/3"], ["r", "3/3"], ["d", "3/1"], ["l", "1/1"]]) assert.ok(SRC.includes(`.jh-mz.iso .jh-mz-pad .${k}{grid-area:${ga}}`), k + " 擺在 " + ga);
});

test("〔原始碼〕斜俯視用正交鏡頭、材質三張分開（地面、牆側、牆頂）、燈火和手上的燈都照 jhMzFlick 閃；事件 msg 照 say 顯示、card 開卡片、走了沒動就停下自動走", () => {
  assert.ok(/new T3\.OrthographicCamera\(/.test(SRC) && !/new T3\.PerspectiveCamera\(/.test(SRC));
  for (const k of ["TX.floor,flM", "TX.side,side", "TX.top,topM"]) assert.ok(SRC.includes("jhMzTexLoad(T3," + k), k);
  assert.ok(SRC.includes("lamp.intensity=1.25*jhMzFlick(now,-1,RM)") && SRC.includes("lights[f.k].intensity=.9*fk"));
  assert.ok(SRC.includes("if(r.msg)say(jhL(r.msg[0],r.msg[1]));") && SRC.includes("if(r.card&&r.card.title&&r.card.body){path=[];held=null;card(r.card);return false}"));
  assert.ok(SRC.includes("S.player.x===x0&&S.player.y===y0"), "走了沒動（撞暗門、碑刻）就停下");
});

test("#105 審查建議：jhMzNew 的 ptr 傳 null、數字不會出錯（當沒給）；存檔的指標超過 1e6 當壞值歸 0", () => {
  const c = load({ jhMazePtr: JSON.stringify({ door: 1e20, trap: 2 }) });
  for (const p of [null, 5, "x", { door: null, trap: "" }]) assert.doesNotThrow(() => c.jhMzNew("central", 3, p));
  assert.deepEqual({ ...c.jhMzNew("central", 3, null).base }, { door: 3, trap: 3 }, "null＝沒給，照第幾次走");
  assert.deepEqual({ ...c.jhMzNew("central", 3, { door: 1e20, trap: 4 }).base }, { door: 3, trap: 4 }, "1e20 當壞值");
  assert.deepEqual({ ...c.jhMzPtrGet("central") }, { door: 0, trap: 2 }, "存檔 1e20 歸 0");
});

test("〔原始碼〕解殺題 kind:\"defend\"（飛相門，iMac Claude 1）：不顯示「N 步殺」那行；答對預設「解圍了！」、答錯「這步解不了圍」；派別 say 照舊優先", () => {
  assert.ok(SRC.includes('DEF=P.kind==="defend"'));
  assert.ok(SRC.includes('${N>1&&!DEF?`<p class="muted">'), "解殺題不寫幾步殺");
  assert.ok(SRC.includes('res(ZS(id)||(DEF?jhL("解圍了！","Threat stopped!"):jhL("將死！","Checkmate!")),"ok");'), "派別 say 優先，沒寫才用預設");
  assert.ok(SRC.includes('DEF?"這步解不了圍，黑方下一步還是殺得到，再想想。"'));
  /* 一手的解殺題照 line 比對就算解開（jhMzTry 不檢查是不是將死） */
  const c = load(); vm.runInContext('jhMzDef("deftest",{map:["#####","#@.>#","#####"],guards:[],pool:{door:[{kind:"defend",zh:["解","x"],en:["d","x"],fen:"4k4/9/9/9/9/9/9/9/9/2B1K4",line:["c0e2"]}],trap:[]}});', c);
  const S = c.jhMzNew("deftest", 0); c.jhMzEncounter(S, "door");
  assert.equal(c.jhMzTry(S, "door", "a0a1"), "bad"); assert.equal(c.jhMzTry(S, "door", "c0e2"), "ok", "一手就解開");
});

test("W97 掌門提示（開發者 11/24「每趟免費 1 次、之後花貢獻」）：每趟第一次免費；之後每次 1 點門派貢獻，先扣存檔、不夠再扣這趟撿到的；不夠就不給並說還差多少；新的一趟又免費一次", () => {
  const mem = { jhMaze: JSON.stringify({ clear: 1, best: 30, gong: 1, page: 0, box: 0 }) }, c = load(mem);
  const S = c.jhMzNew("central", 0); S.bag.gong = 1;
  assert.equal(c.jhMzHintCost(S), 0); assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: true, cost: 0 }, "第一次免費");
  assert.equal(c.jhMzHintCost(S), 1); assert.equal(c.jhMzMerit(S), 2, "存檔 1＋這趟 1");
  assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: true, cost: 1 }); assert.equal(JSON.parse(mem.jhMaze).gong, 0, "先扣存檔"); assert.equal(S.bag.gong, 1);
  assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: true, cost: 1 }); assert.equal(S.bag.gong, 0, "存檔沒了再扣這趟撿的");
  assert.deepEqual({ ...c.jhMzUseHint(S) }, { ok: false, need: 1, have: 0 }, "不夠：不給、說還差多少");
  const T = c.jhMzNew("central", 1); assert.deepEqual({ ...c.jhMzUseHint(T) }, { ok: true, cost: 0 }, "新的一趟又免費一次");
  vm.runInContext('jhMzDef("nogong",{map:["#####","#@.>#","#####"],guards:[],pool:{},rew:[{k:"page",zh:"頁",en:"p"}]});', c);
  const N = c.jhMzNew("nogong", 0); c.jhMzUseHint(N); assert.equal(c.jhMzMerit(N), 0); assert.equal(c.jhMzUseHint(N).ok, false, "沒有門派貢獻的門派只有免費那一次");
});

test("〔原始碼〕W97：提示只亮要動的子（不畫綠點）、答錯 3 次不再自動亮；按鈕寫這次要不要花貢獻；走對一步、換一題都要重新提示", () => {
  assert.ok(SRC.includes("const hint=S.hintOn===id&&!won,") && !SRC.includes("const hint=(S.fails[id]||0)>=3"), "提示看有沒有按，不看答錯次數");
  assert.ok(!/fill="#3f8f5f"/.test(SRC), "不畫落點綠點");
  assert.ok(SRC.includes("const puzzle=id=>{S.hintOn=null;") && SRC.includes('if(got==="next"){S.hintOn=null;'), "換題、走對一步都清掉");
  assert.ok(SRC.includes("這一趟免費 1 次") && SRC.includes("點門派貢獻"));
});

test("〔原始碼〕W99 暗匪殘局可以逃跑但先講清楚代價（開發者 11/24「講清楚＋加逃跑鈕」）：只有被抓的殘局有逃跑鈕和說明；卡片內確認（不用 confirm）；返回手勢、頁首返回、回首頁都先確認；關掉殘局時清掉多推的紀錄；石門的先退開照舊", () => {
  const J = SRC.slice(SRC.indexOf("function JhMaze("));
  assert.ok(J.includes('${id==="trap"?`<div class="jh-mz-esc">${escIdle()}</div>`:""}'), "只有被抓的殘局放逃跑區");
  assert.ok(J.includes('if(id==="trap"){trapO=o;escPush();escBind()}'), "被抓時推一筆紀錄");
  assert.ok(J.includes("這一層撿到的東西會全部丟掉，下次從入口重來") && J.includes("You can also run away, but you lose everything you picked up on this level"), "中英文說明代價");
  assert.ok(J.includes("逃跑（放棄這一層）") && J.includes("Run away (give up this level)") && J.includes("確定要逃跑嗎？") && J.includes("留下來解題"));
  assert.ok(!/\bconfirm\(/.test(J) && !/陣亡/.test(J), "不用 confirm()、不寫陣亡");
  assert.ok(J.includes("const shut=o=>{if(o===trapO){trapO=null;escPop()}o.remove();busy=false};"), "解開、被拖回入口時清掉多推的那筆紀錄");
  assert.ok(J.includes("const onPop=()=>{if(!alive()){off();return}if(escIgn){escIgn=false;return}if(trapO){escPush();escAsk()}};"), "返回手勢先確認，並把紀錄補回去");
  assert.ok(J.includes("closest('#back,[data-home=\"1\"]')") && J.includes('document.addEventListener("click",onHome,true)') && J.includes('document.removeEventListener("click",onHome,true)'), "頁首返回、回首頁鍵在捕獲階段先攔");
  assert.ok(J.includes('box.querySelector(\'[data-a="esc-yes"]\').onclick=()=>{trapO=null;o.remove();busy=false;escPop();setTimeout(()=>upTo(HALL),80)};'), "確定逃跑才回門內頁");
  assert.ok(J.includes('const bk=o.querySelector(\'[data-a="back"]\');if(bk)bk.onclick=()=>{S.pz=null;shut(o)};'), "石門的先退開照舊");
  /* 迷宮只在走完一層才存檔：逃跑後重新進來是 jhMzNew 整層重來（背包歸零） */
  const c = load(), S = c.jhMzNew("central", 0); S.bag.gong = 2; const T = c.jhMzNew("central", 0); assert.equal(T.bag.gong, 0, "重新進來背包是空的");
});

test("W87b 中炮門接上像素材質（地面、牆側；牆頂照舊程式畫），路徑在 data/maze/tex/（只放 CDN）", () => {
  const c = load(), lv = vm.runInContext("JH_MZ_LV", c).central;
  assert.deepEqual(JSON.parse(JSON.stringify(lv.tex)), { floor: "data/maze/tex/central_floor.webp", side: "data/maze/tex/central_wall.webp" });
});

test("中炮門碑刻文書 3 件（照 #108 的格式）：種類、中英標題與內文、出處寫明遊戲整理或虛構的部分", () => {
  const c = load(), L = vm.runInContext("JH_MZ_LV", c).central.lore;
  assert.equal(L.length, 3); assert.equal(new Set(L.map((x) => x.id)).size, 3);
  for (const x of L) { assert.ok(["stele", "slip", "doc"].includes(x.kind)); for (const k of ["title", "body"]) { assert.ok(x[k][0] && x[k][1]); assert.ok(!/[一-鿿]/.test(x[k][1]), x.id + " 英文沒有中文字") } assert.ok(/遊戲/.test(x.src), x.id + " 出處寫明遊戲的部分") }
  assert.ok(!/鐵扦|天工開物/.test(JSON.stringify(L)), "複核：查不到原文的鐵扦、對不上的天工開物出處都拿掉");
});
