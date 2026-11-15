// 開發者 11/16（星淵遠征選關視窗截圖）「重新設計排版 太亂了 玩家不知道到底要玩哪個」「車輪戰和星門圍城也都能上線」
// 選單決定：版面「一顆主按鈕」、觀星臺天頂的「黑洞車輪戰」解鎖直接開車輪戰、星門圍城與車輪戰的過關獎勵先維持不給。
//   m/07bht-td.js bhtdSelect：最上面一張主卡（要打的是哪一場＋出戰鈕）→ 關卡一排小格（關號＋星數）→ 其他玩法（星門圍城、車輪戰、星淵急襲、練習賽）
//     → 出戰設定收起來（招式、戰鬥演出、陣地規則）。關卡、解鎖、招式、獎勵的規則都沒有變。
//   m/07gxt-guanxing.js：GXT_SPOTS 的黑洞車輪戰不再是未通，GXT_ACT.gxtSimul＝gxtWheel（定軌力用完照樣先擋）。
// 這裡是原始碼比對加上觀星臺入口的行為；畫面在本機候選版手機尺寸看過（紀錄在提交訊息）。
// 用法：node --test xiangqi-lab/tools/test-bhtd-select-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = f => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const TD = rd("xiangqi-db/m/07bht-td.js"), GXT = rd("xiangqi-db/m/07gxt-guanxing.js");
const i0 = TD.indexOf("function bhtdSelect(k,cover){"), i1 = TD.indexOf("function bhtdOpen(){"), SEL = TD.slice(i0, i1);

test("〔原始碼〕找得到選關視窗那一段", () => { assert.ok(i0 > 0 && i1 > i0) });

test("〔原始碼〕由上到下：主卡 → 關卡 → 其他玩法 → 出戰設定（收起來）；底下只剩「之後再來」", () => {
  const at = s => { const i = SEL.indexOf(s); assert.ok(i >= 0, "找不到 " + s); return i };
  const a = at('<div class="bt-next">${nextHTML()}</div>'), b = at('<p class="bt-sec">關卡</p><div class="bt-cards">${cards()}</div>'), c = at('<p class="bt-sec">其他玩法</p><div class="bt-alts">${alts()}</div>'), d = at('<details class="bt-set"><summary>出戰設定'), e = at('<div class="bt-sklist">${skHTML()}</div>'), f = at('<details class="bt-rule"><summary>陣地規則</summary>');
  assert.ok(a < b && b < c && c < d && d < e && e < f, "順序");
  assert.ok(!/<details class="bt-set" open/.test(SEL), "出戰設定預設收著");
  assert.ok(SEL.includes('[later],"prolog bt-sel bt-sel2");'), "視窗底下的按鈕只有「之後再來」（或回航）");
});

test("〔原始碼〕主卡：一打開就是要打的那一關與出戰鈕；選別的關、選急襲，主卡跟著換", () => {
  assert.ok(SEL.includes('<button type="button" class="btn bt-go" data-go="1">⚔ 出戰</button>'));
  assert.ok(SEL.includes('if(e.target.closest("[data-go]")){vibrate(5);m.remove();if(sel==="rd")bhtdRaid(k,cover,pk);else bhtdStart(sel,k,cover,pk);return}'), "出戰＝照選的那一場開打，帶目前選的招式");
  assert.ok(SEL.includes('kind=I.dn?"再打一次":"下一關";name=`第 ${sel} 關　${I.V.nm}`'), "寫關名；破過的寫「再打一次」");
  assert.ok(SEL.includes('if(sel==="rd"){kind="⚡ 急襲";name="星淵急襲";sub="中局殘陣・約 3～5 分鐘"}'));
  assert.ok(SEL.includes('m.querySelector(".bt-next").innerHTML=nextHTML();'), "重畫時主卡一起更新");
  assert.ok(SEL.includes("let sel=1;for(let n=1;n<=BHTD.LV.length;n++)if(bhtdOpenLv(P,n))sel=n;"), "預設選最新開放的那一關（原本的規則）");
});

test("〔原始碼〕關卡是小格（手機一列三格）：關號＋星數；讀屏照舊念完整的關名、狀態與數值；鎖住的關照舊擋", () => {
  assert.ok(SEL.includes('<b aria-hidden="true">${n}</b><small class="ok" aria-hidden="true">${okS}</small>'));
  assert.ok(SEL.includes('okS=op?(dn?(s3?"★".repeat(s3)+"☆".repeat(3-s3):"✓"):"挑戰"):"🔒"'));
  assert.ok(SEL.includes('aria-label="${esc(`第 ${n} 關 ${V.nm}，${okL}${op?"":"（先破上一關）"}，星樞推算 ${ai.depth} 步，星樞元氣 ${hp}；${bhtdTags(V).join("；")}`)}"'));
  assert.ok(SEL.includes('if(!bhtdOpenLv(P,n)){toast("🔒 先破第 "+(n-1)+" 關");return}'));
  assert.ok(TD.includes(".bt-sel2 .bt-cards{grid-template-columns:repeat(3,1fr);") && TD.includes(".bt-sel2 .bt-cards .bt-card{min-height:46px;"), "手機一列三格（每格夠寬夠高，不小於 44），寬螢幕一列六格");
});

test("〔原始碼〕其他玩法四張：星門圍城、車輪戰（進各自的畫面）、星淵急襲（換成要打的那一場）、練習賽", () => {
  assert.ok(SEL.includes('const alts=()=>`${typeof gsvCard==="function"?gsvCard():""}${typeof whlCard==="function"?whlCard():""}${rcard()}${typeof bhtlCard==="function"?bhtlCard():""}`;'));
  assert.ok(SEL.includes('if(e.target.closest("[data-gsv]")&&typeof gsvSelect==="function"){vibrate(5);m.remove();gsvSelect(k,cover);return}'));
  assert.ok(SEL.includes('if(e.target.closest("[data-whl]")&&typeof whlOpen==="function"){vibrate(5);m.remove();whlOpen();return}'));
  assert.ok(SEL.includes('if(!rdOk){toast("🔒 先破第 1 關，才開星淵急襲");return}vibrate(5);sel="rd";paint();'), "急襲沒開照舊擋");
  assert.ok(TD.includes(".bt-alts{display:grid;grid-template-columns:1fr 1fr;gap:6px}") && TD.includes(".bt-sel2 .bt-alts .bt-card{min-height:48px;"));
});

/* ---------- 觀星臺：天頂黑洞＝黑洞車輪戰 ---------- */
function gxt(o) {
  o = o || {}; const log = { toast: [], whl: 0 };
  const ctx = { console, store: { get: (k, d) => d, set() { } }, toast: x => log.toast.push(x), vibrate() { }, esc: s => String(s), document: { getElementById: () => null, querySelector: () => null, createElement: () => ({}), head: { append() { } }, body: {} },
    addEventListener() { }, removeEventListener() { }, sessionStorage: { getItem: () => null, setItem() { }, removeItem() { } }, location: { hash: "#/guanxing" }, matchMedia: () => ({ matches: false }), innerWidth: 375, innerHeight: 812 };
  if (o.lock) { ctx.dglBhLock = () => true; ctx.dglBhLockMsg = () => "定軌力用完了" }
  if (!o.noWhl) ctx.whlOpen = () => { log.whl++ };
  vm.createContext(ctx); vm.runInContext(GXT + ";this.__X={GXT_SPOTS,GXT_ACT,GXT_OFF}", ctx); return Object.assign(ctx.__X, { log });
}

test("〔行為〕觀星臺的黑洞車輪戰不再是「星軌未通」：點了直接開車輪戰；定軌力用完先擋；還沒做的兩個照舊未通", () => {
  const A = gxt(); assert.deepEqual(Array.from(A.GXT_SPOTS).filter(s => s[6]).map(s => s[1]), ["今日異象", "自由擺陣"]);
  A.GXT_ACT.gxtSimul(); assert.equal(A.log.whl, 1); assert.equal(A.log.toast.length, 0);
  const B = gxt({ lock: 1 }); B.GXT_ACT.gxtSimul(); assert.equal(B.log.whl, 0); assert.match(B.log.toast[0], /定軌力用完了/);
  const C = gxt({ noWhl: 1 }); C.GXT_ACT.gxtSimul(); assert.equal(C.log.toast[0], "🌌 " + C.GXT_OFF, "沒有車輪戰模組時不會壞");
});
