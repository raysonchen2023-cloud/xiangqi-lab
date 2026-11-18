// 11/17 第 11 輪：
//   N11-1【P1】（測試員 B）星門圍城打贏 → 按「↻ 再打一次」→ 新的一盤又兩手將死：沒有結算視窗、存檔 gsv 沒記這一盤（A1 勝場還是 1）。
//     原因：08b-cpugame.js 結算的「這一盤處理過了」鍵是「結果＋步數」（JSON.stringify(st.result)+st.moves.length），不含這一盤的 id；
//       「再打一次」（07sg2 sg2Result → 07bhg gsvStart → jStart）留在同一個對局頁、shownResult 沒清，新的一盤結果（{w:r,why:將死}）和步數都跟上一盤一樣，
//       整段結算（grwArm、journeyGameEnd → bhGameEnd → gsvEnd 記錄、bhResultModal → sg2Result 結果視窗）都被當成已經處理過跳掉。
//     修法：鍵加上 st.id（cgResKey），同一盤輪詢多次照樣只結算一次。
//   iMac 模擬器 A【P2】全新安裝在開頭畫面點一下，落在首頁「還沒登船」：重新載入後 sessionStorage 的 xqTitleShown 還在，05b saveBoot 就略過開頭畫面（＝不進新手練習）。
//     修法：07stq stqFresh（沒旅程、沒練習紀錄、看不出玩過）時照樣出開頭畫面。
//   iMac 模擬器 B【P1?】原生 App 點一下卡 60 秒：01-board unlockAudio → primeVoice 在點擊當下做靜音 speechSynthesis.speak；原生 App 改成不暖機。
// 不開瀏覽器：vm 載 07bhg＋07sg2（真的 gsvEnd／sg2End／sg2Result）和 08b 結算那一句判斷。用法：node --test xiangqi-lab/tools/test-r11-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = f => fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");
const CPU = M("08b-cpugame.js"), GSV = M("07bhg-gatesiege.js"), SG2 = M("07sg2-siege2.js"), SAVE = M("05b-save.js"), STQ = M("07stq-starter.js"), BOARD = M("01-board.js");
const cutLine = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到：" + a); const j = s.indexOf("\n", i); return s.slice(i, j < 0 ? s.length : j) };

/* 08b 對局頁的結算判斷（原始碼原樣切出來）＋ 07bhg／07sg2 真的記錄與結果視窗 */
function kit() {
  const mem = {}, modals = [], starts = [];
  const store = { get: (k, d) => k in mem ? JSON.parse(mem[k]) : d, set: (k, v) => { mem[k] = JSON.stringify(v) } };
  const ctx = { console, Math, JSON, Date, store, toast() { }, vibrate() { }, esc: s => String(s), setTimeout: () => 0, innerWidth: 390, innerHeight: 844,
    modal: (h, b, c) => { modals.push({ h, b, c }); return {} } };
  vm.createContext(ctx);
  vm.runInContext(GSV + "\n" + SG2 + "\n;gsvCss=function(){};gsvStart=function(){__starts.push([].slice.call(arguments))};", Object.assign(ctx, { __starts: starts }));
  /* 08b：const cgResKey=… 那一行＋「if(st.result&&shownResult!==…){shownResult=…;」那一句（到 const xp0= 之前） */
  const keyLine = cutLine(CPU, "const cgResKey="), a = CPU.indexOf("if(st.result&&shownResult!=="), b = CPU.indexOf("const xp0=", a);
  assert.ok(a > 0 && b > a, "08b 結算判斷");
  const gate = CPU.slice(a, b);
  vm.runInContext(`${keyLine}\nlet shownResult=null;this.__fired=[];
    this.__poll=function(st){${gate}this.__fired.push(st.id);gsvEnd(st);gsvResult(st,st.result.w===st.human,!st.result.w,"")}};`, ctx);
  return { ctx, mem, modals, starts, store };
}
/* 一盤序章 A1（關 31、易）：紅方兩手將死（紅、黑、紅＝3 步） */
function game(ctx, id) {
  const td = vm.runInContext(`SG2G.boot({lv:31,diff:1,sq:null,tal:null},{board:GSV.startBoard(31),turn:"r"})`, ctx);
  td.over = { w: "r", why: "將死" }; td.rnd = 1;
  return { id, journey: "bh:gs31", human: "r", td, result: { w: "r", why: "將死" }, moves: [{ by: "r" }, { by: "b" }, { by: "r" }] };
}

test("〔N11-1〕打完 → ↻ 再打一次 → 再打完：第二盤也出結果視窗、也記進存檔 gsv（A1 勝場 2）", () => {
  const K = kit(), { ctx } = K;
  const g1 = game(ctx, "g-a1-1");
  ctx.__poll(g1); ctx.__poll(g1); ctx.__poll(g1);   /* 對局頁每 1.5 秒輪詢：同一盤只結算一次 */
  assert.deepEqual([...ctx.__fired], ["g-a1-1"]); assert.equal(K.modals.length, 1, "第一盤一個結果視窗");
  assert.equal(K.modals[0].c, "res"); assert.match(K.modals[0].h, /破陣/);
  const again = K.modals[0].b.find(x => /再打一次/.test(x[0])); assert.ok(again, "結果視窗有「↻ 再打一次」");
  again[1](); assert.equal(K.starts.length, 1, "按了就 gsvStart 同一關");
  assert.equal(K.starts[0][0], 31);
  const g2 = game(ctx, "g-a1-2");   /* jStart 開的新一盤：新 id，結果、步數都跟上一盤一樣 */
  ctx.__poll(g2); ctx.__poll(g2);
  assert.deepEqual([...ctx.__fired], ["g-a1-1", "g-a1-2"], "第二盤也結算（改之前這裡只有第一盤）");
  assert.equal(K.modals.length, 2, "第二盤也有結果視窗"); assert.match(K.modals[1].h, /破陣/);
  const P = K.store.get("gsv", null);
  assert.ok(P && P.g.includes("g-a1-1") && P.g.includes("g-a1-2"), "已記錄盤號清單 g 兩盤都在：" + JSON.stringify(P && P.g));
  assert.equal(P.v2[31][1].w, 2, "A1（易）勝場 2");
});

test("〔N11-1〕原因：舊的鍵（結果＋步數）兩盤一模一樣，新的鍵帶 id 就分得開", () => {
  const K = kit(), g1 = game(K.ctx, "x1"), g2 = game(K.ctx, "x2"), old = s => JSON.stringify(s.result) + s.moves.length;
  assert.equal(old(g1), old(g2), "改之前：第二盤的鍵跟第一盤一樣 → 被當成已經結算過");
  const key = vm.runInContext(cutLine(CPU, "const cgResKey=").replace("const cgResKey=", "(").replace(/;\s*$/, "") + ")", K.ctx);
  assert.notEqual(key(g1), key(g2)); assert.equal(key(g1), key(game(K.ctx, "x1")), "同一盤同一個鍵");
});

test("〔N11-1〕08b 四個地方都用 cgResKey，沒有留舊的鍵", () => {
  assert.ok(!/shownResult=JSON\.stringify\((st|s)\.result\)/.test(CPU), "沒有舊寫法");
  assert.equal((CPU.match(/shownResult=cgResKey\((st|s)\)/g) || []).length, 4);
  assert.ok(CPU.includes("if(st.result&&shownResult!==cgResKey(st)){shownResult=cgResKey(st);"));
  assert.ok(!/(^|[^.\w])cgResKey\s*=/.test(M("00-util.js") + M("02-shell.js") + M("07-legend.js")), "名字沒撞");
});

/* ---------- iMac 模擬器 A：全新玩家重新載入後不落到首頁 ---------- */
function bootKit(o) {
  const calls = [], ss = { xqTitleShown: o.shown ? "1" : null };
  const ctx = { console, Date, JSON, Math, calls, STQ_ON: true, STQ_V: 1,
    journey: () => o.J ? { c: "x" } : null, stqSt0: () => o.stq || null, stqEnvNow: () => o.env || {},
    titleScreen: x => calls.push(x), navigator: { webdriver: false }, location: { hash: o.hash || "" },
    sessionStorage: { getItem: k => ss[k] == null ? null : ss[k] } };
  vm.createContext(ctx);
  const fresh = cutLine(STQ, "function stqFresh(){"), old = cutLine(STQ, "function stqOldOf(E){");
  const a = SAVE.indexOf("  if(shown&&typeof stqFresh"), b = SAVE.indexOf("titleScreen({})}", a);
  assert.ok(a > 0 && b > a, "05b saveBoot 最後兩句");
  vm.runInContext(`${old}\n${fresh}\nthis.__boot=function(){let shown=!!sessionStorage.getItem("xqTitleShown");${SAVE.slice(a, b)}titleScreen({})};`, ctx);
  ctx.__boot(); return calls;
}
test("〔模擬器 A〕全新玩家（沒旅程、沒練習紀錄）重新載入、xqTitleShown 還在：照樣出開頭畫面（stqBoot 接手進新手練習）", () => {
  assert.equal(bootKit({ shown: true }).length, 1, "全新玩家＋已記號：還是出開頭畫面");
  assert.equal(bootKit({ shown: false }).length, 1, "沒記號照舊");
});
test("〔模擬器 A〕不是全新玩家：照舊略過（有旅程、練習做過、看得出玩過、網址帶頁面）", () => {
  assert.equal(bootKit({ shown: true, J: true }).length, 0, "有旅程");
  assert.equal(bootKit({ shown: true, stq: { st: "done" } }).length, 0, "新手練習做過");
  assert.equal(bootKit({ shown: true, env: { played: true } }).length, 0, "玩過");
  assert.equal(bootKit({ shown: true, env: { restored: true } }).length, 0, "雙份存檔還原");
  assert.equal(bootKit({ shown: false, hash: "#/cpu" }).length, 0, "網址帶頁面");
});
test("〔模擬器 A〕接線：stqFresh 跟 stqBoot 判斷同一套（沒旅程、沒 stq、stqOldOf 為假）；02-shell 的 go() 沒動", () => {
  assert.ok(STQ.includes("function stqFresh(){if(!STQ_ON)return false;try{if(journey())return false;if(stqSt0())return false;return!stqOldOf(stqEnvNow())}catch(e){return false}}"));
  assert.ok(SAVE.includes('if(shown&&typeof stqFresh==="function"&&stqFresh())shown=false;'));
  assert.ok(M("02-shell.js").includes('if((typeof TITLE!=="undefined"&&TITLE)||(typeof journey==="function"&&!journey()))sessionStorage.removeItem("xqTitleShown")'));
});

/* ---------- iMac 模擬器 B：原生 App 點一下不暖機 speak ---------- */
function voiceKit(o) {
  const spoke = [];
  const syn = { speak: u => spoke.push(u), cancel() { }, getVoices: () => [] };
  const ctx = { spoke, speechSynthesis: syn, SpeechSynthesisUtterance: function (t) { this.text = t },
    window: { speechSynthesis: syn, XQ_NATIVE: !!o.native }, navigator: { userAgent: o.ua || "Mozilla/5.0 (iPhone) Safari" } };
  vm.createContext(ctx);
  vm.runInContext(cutLine(BOARD, "function voiceNoPrime(){") + "\n" + cutLine(BOARD, "let voicePrimed=false;") + "\nthis.__p=primeVoice;", ctx);
  ctx.__p(); ctx.__p(); return spoke;
}
test("〔模擬器 B，11/18 改〕網頁版也不在點擊當下 speak 暖機了（只取語音清單；第一次朗讀排到空檔，見 test-r32-1118.js）", () => {
  const s = voiceKit({}); assert.equal(s.length, 0);
});
test("〔模擬器 B〕原生 App（XQ_NATIVE 或 UA 帶 XQQianqiuApp/）：點擊時不呼叫 speechSynthesis.speak", () => {
  assert.equal(voiceKit({ native: true }).length, 0, "XQ_NATIVE");
  assert.equal(voiceKit({ ua: "Mozilla/5.0 (iPhone) AppleWebKit XQQianqiuApp/1.0" }).length, 0, "UA");
});
test("〔模擬器 B〕原始碼：點擊解鎖照舊叫 primeVoice（網頁版不變）；真的要報「吃」「將軍」才 speak（sayCall 沒加原生限制）", () => {
  assert.ok(BOARD.includes("const unlockAudio=()=>{primeVoice();"));
  assert.ok(BOARD.includes("const primeVoice=()=>{if(voicePrimed||!window.speechSynthesis)return;voicePrimed=true;try{pickVoice()}catch(e){}};"), "11/18：只取語音清單，不 speak");
  const say = cutLine(BOARD, "function sayCall(text){"); assert.ok(!/voiceNoPrime|XQ_NATIVE/.test(say), "sayCall 不擋（原生 App 改走 XQSpeech 外掛）");
  /* 其他模組沒有別的暖機 speak（空字串／靜音朗讀） */
  const dir = path.join(__dirname, "..", "..", "xiangqi-db", "m");
  for (const f of fs.readdirSync(dir).filter(x => /\.js$/.test(x) && x !== "01-board.js")) {
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    assert.ok(!/speechSynthesis\.speak\(/.test(s), f + " 也有 speechSynthesis.speak");
  }
});
