/* 11/25 唯讀審核（三位 Astra Ultra）指出、今晚發布一起修的三項：
   ①（高）兒童模式說「資料零收集」，開 App 卻照樣連大廳（連線帶裝置代號）→ m/02-shell.js 啟動時讀 fmCfg，家長關線上大廳或開兒童模式就不連（NET_KIDOFF）。
   ②（高）家長每日時間：切到背景那一刻 document.hidden 已經是 true，useTick 直接 return，上次記到切背景之間的時間全丟；
      審核重播「前景 10 秒、背景 5 秒」120 次，實際 20 分鐘記成 0 分 → m/05-settings.js 切背景那一次照算（useTick(1)）。
   ③ 迷宮陷阱題第 4 次答錯、叫你回入口之後棋盤還能下，再走正解就保住寶物、守衛反被暈眩 → m/07z9m-maze.js 判負（lost）後不再接受落子、提示鈕關掉。
   ①② 抽出來在 vm 跑（行為）；③ 用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = f => fs.readFileSync(path.join(ROOT, "xiangqi-db/m", f), "utf8").replace(/\r\n/g, "\n");
const SHELL = M("02-shell.js"), SET = M("05-settings.js"), MAZE = M("07z9m-maze.js");

function useKit() {
  const a = SET.indexOf("let useT=Date.now(),useH=location.hash;"), b = SET.indexOf("\nconst useFmt=", a);
  assert.ok(a > 0 && b > a, "抓得到 useTick 那段");
  let now = 0; const L = {}, data = {};
  const c = {
    Date: { now: () => now }, location: { hash: "#/cpu" }, Math, Object,
    document: { hidden: false, addEventListener: (k, f) => { L[k] = f } },
    addEventListener: () => { }, setInterval: () => 0,
    store: { get: (k, d) => k in data ? JSON.parse(JSON.stringify(data[k])) : d, set: (k, v) => { data[k] = JSON.parse(JSON.stringify(v)) } },
    usePlace: () => "練功房", localDay: () => "2026-11-25"
  };
  vm.createContext(c); vm.runInContext(SET.slice(a, b), c);
  return { c, L, data, tick: ms => { now += ms }, };
}

test("家長計時：前景 10 秒、背景 5 秒來回 120 次＝前景 20 分鐘都記得到（原本會記成 0）", () => {
  const K = useKit();
  for (let i = 0; i < 120; i++) {
    K.tick(10000); K.c.document.hidden = true; K.L.visibilitychange();   /* 前景 10 秒後切背景 */
    K.tick(5000); K.c.document.hidden = false; K.L.visibilitychange();   /* 背景 5 秒後回來 */
  }
  assert.equal(K.data.useDay["2026-11-25"], 120 * 10000, "每日用量＝前景時間");
  assert.equal(K.data.useStat.t, 120 * 10000);
});

test("家長計時：背景期間不算（回前景時從回來那一刻重新起算）", () => {
  const K = useKit();
  K.tick(10000); K.c.document.hidden = true; K.L.visibilitychange();
  K.tick(600000); K.c.document.hidden = false; K.L.visibilitychange();   /* 背景 10 分鐘 */
  K.tick(5000); K.c.useTick();
  assert.equal(K.data.useDay["2026-11-25"], 15000, "只有前景的 10＋5 秒");
});

test("家長計時：在背景時一般的定時記錄（不帶參數）不能記時間（#185 審查：原本這項拿掉 hidden 判斷照樣綠）", () => {
  const K = useKit();
  K.tick(10000); K.c.document.hidden = true; K.L.visibilitychange();   /* 前景 10 秒後切背景：記 10 秒 */
  K.tick(15000); K.c.useTick();   /* 背景中每 15 秒的 setInterval 照跑 */
  K.tick(15000); K.c.useTick();
  assert.equal(K.data.useDay["2026-11-25"], 10000, "背景那 30 秒不能算進去");
});

function kidOff(cfg) {
  const a = SHELL.indexOf("const NET_KIDOFF="), b = SHELL.indexOf("\n", a);
  assert.ok(a > 0 && b > a, "抓得到 NET_KIDOFF");
  const c = { store: { get: (k, d) => k === "fmCfg" && cfg ? cfg : d } };
  vm.createContext(c); vm.runInContext(SHELL.slice(a, b) + ";this.v=NET_KIDOFF;", c); return c.v;
}

test("兒童模式或家長關線上大廳：啟動時不連大廳；平常照連", () => {
  assert.equal(kidOff({ kid: true }), true, "兒童模式");
  assert.equal(kidOff({ net: false }), true, "家長關線上大廳");
  assert.equal(kidOff({ kid: false, net: true }), false);
  assert.equal(kidOff(null), false, "沒設定過");
  /* #185 審查：只有 XQNet.start() 看 NET_KIDOFF；同一個區塊下一行起的事件（新版通知、邀請、配對、積分…）照常登記，家長之後打開大廳、進大廳自己連上時才收得到邀請 */
  assert.match(SHELL, /const NET_KIDOFF=[^\n]*\nif\(OFF&&window\.XQNet\)\{if\(!NET_KIDOFF\)XQNet\.start\(\);[^\n]*\n\s*XQNet\.on\("version"/, "只擋 start，事件照常登記");
  assert.doesNotMatch(SHELL, /if\(OFF&&window\.XQNet&&!NET_KIDOFF\)/, "不能把整段事件包進條件");
  assert.doesNotMatch(SHELL.slice(SHELL.indexOf("const NET_KIDOFF="), SHELL.indexOf("const NET_KIDOFF=") + 300), /fmNetOff\(\)/, "不能在這裡叫 fmNetOff（後面才宣告的常數，會出錯回 false）");
});

test("〔原始碼〕迷宮：判負（拖回入口）後不再接受落子、提示鈕關掉", () => {
  assert.match(MAZE, /let pcs=jhMzFen\(P\.fen\),sel=null,won=false,mzLost=false,last=null;/);
  assert.match(MAZE, /const pick=\(c,r\)=>\{if\(won\|\|mzLost\)return;/);
  const i = MAZE.indexOf('if(got==="back"){'); assert.ok(i > 0);
  const seg = MAZE.slice(i, i + 200);
  assert.match(seg, /^if\(got==="back"\)\{\{const eb=[^}]*\}mzLost=true;/, "判負那一刻（拿掉逃跑鈕後、出「回到入口」鈕前）就標 mzLost（不叫 lost：下面「回到入口」那段有 const lost）");
  assert.match(seg, /data-a="hint"[^;]*;if\(h\)h\.disabled=true/, "提示鈕關掉");
});
