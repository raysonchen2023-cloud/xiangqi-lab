// W80 開局的來處（開發者 11/23：「剛剛跟門下棋友對戰，按返回後，不是回到門派，請修正類似的出入口問題」）
//   vm 跑真的程式（不是比對字串）：
//   - 07-legend.js 的 jRetSet／jRetOf／jRetTake／jParkBackBtn 和真的 jBack、jPlace 那兩行；按下園子結算視窗的返回鈕看去哪；
//   - 07z9b 的 jhRetPlace／jhRetHere／jhMatePlay／jhKickStart、07z9-school 的 zmStart、07z9c 的 jhScrGuardStart：從原始檔抽出整個函式，
//     用假的 jStart（會先跑真的 jRetTake）開局，檢查記下的來處；之後從渡口開局，紀錄清掉、照舊回渡口。
//   - 02-shell 的 bkName：返回鍵的字。
//   iMac Claude 1 審查（#76）：原本多數只比對字串，ret／jhRetHere 改成什麼都不做、記錯網址、結算改回寫死都照樣綠；這一版每一種都會紅。
// 用法：node --test xiangqi-lab/tools/test-jret-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const LEG = rd("xiangqi-db/m/07-legend.js"), JH = rd("xiangqi-db/m/07z9b-jianghu.js"), SC = rd("xiangqi-db/m/07z9-school.js"), SR = rd("xiangqi-db/m/07z9c-screen.js"), SH = rd("xiangqi-db/m/02-shell.js"), CG = rd("xiangqi-db/m/08b-cpugame.js");

/* 從原始碼抽出一個頂層函式（到下一個頂層宣告為止） */
function fnSrc(src, head) {
  const a = src.indexOf(head); assert.ok(a >= 0, "找得到 " + head);
  const m = /\n(function |async function |const |let |\/\*|try\{|if\()/.exec(src.slice(a + 1));
  return src.slice(a, m ? a + 1 + m.index : src.length);
}
/* 07-legend：W80 那一段到 jPlace 那一行結束（包含真的 jBack、jPlace） */
const LSEG = (() => { const a = LEG.indexOf("let JRET_ARM=null;"), p = LEG.indexOf("const jPlace="), b = LEG.indexOf("\n", p); assert.ok(a > 0 && p > a && b > p); return LEG.slice(a, b) })();

function world(hash) {
  const mem = {}, clock = { t: 1_800_000_000_000 }, starts = [], ups = [];
  const c = {
    store: { get: (k, d) => (k in mem && mem[k] != null ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    location: { hash: hash || "#/jianghu/hall/central" },
    navKey: (h) => String(h || "").replace(/^#/, "").split("?")[0],
    Date: class extends Date { static now() { return clock.t } }, JSON, String, Math, Object, Array, setTimeout: () => 0,
    upTo: (h) => ups.push(h), toast() {}, CNUM: (n) => String(n),
    jRunGet: () => null, jFindStage: () => null, jChapterHref: () => "#/shelf/1", gxtBhBack: () => "#/adventure",
    jhL: (zh, en) => (c.__en ? en : zh), jhSch: (s) => ({ central: { nm: c.__en ? "Central Cannon School" : "中炮門" }, horse: { nm: c.__en ? "Horse Opening School" : "起馬門" }, screen: { nm: c.__en ? "Screen Horse School" : "屏風馬門" } }[s] || null),
    jhNm: (x) => ({ x_swordboy: c.__en ? "Sword Boy" : "劍童" }[x] || x),
    oscL: (zh) => zh,
    INN: [{ id: "i1" }], SECRETS: [{ id: "s1" }], innLvN: () => 3, innRlv: () => null, secretLv: () => 5, parkNpcLv: () => 3, JH_MATE_KEEP_MS: 45000,
    ptyGet: () => ({ look: "x_swordboy" }), PTY: { has: () => !c.__notIn, ORDER: ["x_swordboy"] },
    oscGet: () => ({}), oscSchE: (id) => ({ central: { nm: c.__en ? "Central Cannon School" : "中炮門" } }[id] || null), zmGet: () => ({}), zmArgs: () => ({ human: "r" }),
    OSC: { zmRlv: () => 0, MST: [{ id: "m1", sid: "screen" }], side: () => "r", act: () => c.__act || "" }, jhKickOf: () => ({ a: "central", b: "screen", fen: "x" }),
    JH_SCR_J: "jh:guard:screen", JH_SCR_GUARD: { fen: "x", turn: "b", limit: 10 },
  };
  vm.createContext(c);
  const code = LSEG + "\n" + "let jhMateKeep=null;\n" +
    [fnSrc(JH, "function jhRetPlace("), fnSrc(JH, "function jhRetHere("), fnSrc(JH, "function jhMatePlay("), fnSrc(JH, "function jhKickArgs("), fnSrc(JH, "function jhKickStart("),
      fnSrc(SC, "function zmStart("), fnSrc(SR, "function jhScrGuardStart(")].join("\n") +
    "\n;async function jStart(id,b,go){jRetTake(id);__starts.push(id);}" +
    "\n;this.T={jRetSet,jRetOf,jRetTake,jBack,jPlace,jParkBackBtn,jhRetPlace,jhRetHere,jhMatePlay,jhKickStart,zmStart,jhScrGuardStart};";
  c.__starts = starts;
  vm.runInContext(code, c);
  return { T: c.T, c, clock, starts, ups };
}

test("真的 jBack／jPlace：沒有來處時照舊（園子回渡口、驛站回驛站、觀星臺等不受影響）", () => {
  const { T } = world();
  assert.equal(T.jBack("park"), "#/port"); assert.equal(T.jPlace("park"), "渡口");
  assert.equal(T.jBack("inn:3"), "#/journey/inn"); assert.equal(T.jPlace("inn:3"), "驛站");
  assert.equal(T.jBack("gxd:x"), "#/guanxing"); assert.equal(T.jBack("jh:guard:screen"), "#/shelf/1");
});

test("門下棋友（園子型）：在中炮門門內頁按「切磋」→ 開局前記下來處；對局頁返回、結算視窗返回鈕都回中炮門門內頁", () => {
  const { T, c, starts, ups } = world("#/jianghu/hall/central");
  T.jhMatePlay({ can: true, kind: "npc", id: "w15" }, "central");
  assert.deepEqual(starts, ["park"]);
  c.location.hash = "#/journey/play";
  assert.equal(T.jBack("park"), "#/jianghu/hall/central"); assert.equal(T.jPlace("park"), "中炮門");
  const [label, go] = T.jParkBackBtn(); assert.equal(label, "‹ 回中炮門"); go(); assert.deepEqual(ups, ["#/jianghu/hall/central"], "結算視窗的返回鈕");
});

test("門下棋友（驛站型、秘境型）：回那一派的門內頁；不在門內頁時也照傳進來的派別", () => {
  const A = world("#/jianghu/hall/horse"); A.T.jhMatePlay({ can: true, kind: "inn", id: "i1" }, "horse"); A.c.location.hash = "#/journey/play";
  assert.equal(A.T.jBack("inn:i1"), "#/jianghu/hall/horse"); assert.equal(A.T.jPlace("inn:i1"), "起馬門");
  const B = world("#/journey/play"); B.T.jhMatePlay({ can: true, kind: "secret", id: "s1" }, "central");
  assert.equal(B.T.jBack("inn:s1"), "#/jianghu/hall/central");
});

test("挑戰掌門、十州踢館：照開局當下所在的頁面（長卷＝十州棋館、門派修行頁＝門派修行、門內頁＝派名）", () => {
  const A = world("#/jianghu"); A.T.zmStart({ id: "m1", pre: "" }, "x_swordboy"); A.c.location.hash = "#/journey/play";
  assert.deepEqual([A.T.jBack("inn:m1"), A.T.jPlace("inn:m1")], ["#/jianghu", "十州棋館"]);
  const B = world("#/school/x_swordboy"); B.T.zmStart({ id: "m1", pre: "" }, "x_swordboy"); B.c.location.hash = "#/journey/play";
  assert.deepEqual([B.T.jBack("inn:m1"), B.T.jPlace("inn:m1")], ["#/school/x_swordboy", "劍童的門派"]);
  const Z = world("#/school/masters"); Z.T.zmStart({ id: "m1", pre: "" }, "x_swordboy"); Z.c.location.hash = "#/journey/play";
  assert.deepEqual([Z.T.jBack("inn:m1"), Z.T.jPlace("inn:m1")], ["#/school/masters", "十派掌門"], "從十派掌門頁開掌門局：寫十派掌門、回十派掌門頁（#76 第二輪審查）");
  const K = world("#/jianghu/hall/central"); K.T.jhKickStart("central>screen", "x_swordboy"); K.c.location.hash = "#/journey/play";
  assert.deepEqual([K.T.jBack("inn:m1"), K.T.jPlace("inn:m1")], ["#/jianghu/hall/central", "中炮門"]);
  const H = world("#/port"); H.T.zmStart({ id: "m1", pre: "" }, "x_swordboy");
  assert.equal(H.T.jBack("inn:m1"), "#/journey/inn", "不是從十州棋館／門派頁開的不登記");
});

test("屏風馬門守中宮：對局頁返回回屏風馬門門內（原本 jh:guard: 落到石桌往事書架）", () => {
  const { T, c } = world("#/jianghu/hall/screen"); T.jhScrGuardStart(); c.location.hash = "#/journey/play";
  assert.deepEqual([T.jBack("jh:guard:screen"), T.jPlace("jh:guard:screen")], ["#/jianghu/hall/screen", "屏風馬門"]);
});

test("之後從渡口自己開園子棋（沒有登記）：紀錄清掉，返回鍵、結算返回鈕都照舊回渡口；對局頁「換一位棋友」（同代號）則保留", () => {
  const { T, c, ups } = world("#/jianghu/hall/central");
  T.jhMatePlay({ can: true, kind: "npc", id: "w15" }, "central");
  c.location.hash = "#/journey/play"; T.jRetTake("park");
  assert.equal(T.jBack("park"), "#/jianghu/hall/central", "對局頁再開同一個代號＝保留");
  c.location.hash = "#/port"; T.jRetTake("park");
  assert.equal(T.jBack("park"), "#/port"); const [l, go] = T.jParkBackBtn(); assert.equal(l, "‹ 回渡口"); go(); assert.deepEqual(ups, ["#/port"]);
});

test("紀錄 12 小時後失效；網址不是 #/ 開頭的不採用", () => {
  const { T, clock } = world(); T.jRetSet("park", "#/jianghu/hall/central", "中炮門"); T.jRetTake("park");
  clock.t += 11 * 3600e3; assert.equal(T.jBack("park"), "#/jianghu/hall/central");
  clock.t += 2 * 3600e3; assert.equal(T.jBack("park"), "#/port");
  const B = world(); B.T.jRetSet("park", "javascript:alert(1)", "x"); B.T.jRetTake("park"); assert.equal(B.T.jBack("park"), "#/port");
});

test("修行頁 #/school/<角色> 照 oscHome 標題：已入派＝某某的某派修行（英文只寫派名）、還沒入派＝某某的門派、不在隊伍＝門派修行；從這頁挑戰掌門，返回與結算鈕也照這個（#76 第三輪審查）", () => {
  const J = world("#/school/x_swordboy"); J.c.__act = "central"; J.T.zmStart({ id: "m1", pre: "" }, "x_swordboy"); J.c.location.hash = "#/journey/play";
  assert.deepEqual([J.T.jBack("inn:m1"), J.T.jPlace("inn:m1")], ["#/school/x_swordboy", "劍童的中炮門修行"]);
  J.c.__en = true; assert.equal(J.T.jPlace("inn:m1"), "Central Cannon School", "英文只寫派名，跟 oscHome 的英文標題一樣");
  const N = world("#/school/x_swordboy"); assert.equal(N.T.jhRetPlace("#/school/x_swordboy"), "劍童的門派");
  N.c.__en = true; assert.equal(N.T.jhRetPlace("#/school/x_swordboy"), "Sword Boy's School");
  const O = world(); O.c.__notIn = true; assert.equal(O.T.jhRetPlace("#/school/x_swordboy"), "門派修行");
  const L = world(); assert.equal(L.T.jhRetPlace("#/school/x_swordboy/central_03"), "劍童・中炮門"); L.c.__en = true; assert.equal(L.T.jhRetPlace("#/school/x_swordboy/central_03"), "Central Cannon School");
  assert.equal(L.T.jhRetPlace("#/school/x_swordboy/nosuch_01"), "Sword Boy's School", "課程代號查不到派時退回角色頁的名字");
});

test("英文介面：派名不截斷，開局後才換語言也跟著變（#76 第二輪審查：原本存死、截成 12 字）", () => {
  const { T, c } = world("#/jianghu/hall/central"); T.jhMatePlay({ can: true, kind: "npc", id: "w15" }, "central"); c.location.hash = "#/journey/play";
  assert.equal(T.jPlace("park"), "中炮門");
  c.__en = true;
  assert.equal(T.jPlace("park"), "Central Cannon School"); assert.equal(T.jParkBackBtn()[0], "‹ 回Central Cannon School");
  const E = world("#/school/masters"); E.c.__en = true; E.T.zmStart({ id: "m1", pre: "" }, "x_swordboy"); E.c.location.hash = "#/journey/play";
  assert.equal(E.T.jPlace("inn:m1"), "Ten School Masters");
  const L = world(); L.T.jRetSet("park", "#/port/somewhere", "A Very Long Place Name Over Twelve"); L.T.jRetTake("park");
  assert.equal(L.T.jPlace("park"), "A Very Long Place Name Over Twelve", "算不出名字時用存的，而且不截斷");
});

test("返回鍵的字：bkName 對十州棋館、門內頁、門派修行寫名字（門內頁寫派名），其他頁照舊", () => {
  const m = SH.match(/function bkName\(h\)\{[\s\S]*?\n  let n="";[^\n]*\n/); assert.ok(m);
  const w = world();
  const c = { navKey: (h) => String(h).replace(/^#/, ""), BK_NAME: [["/port", "渡口"]], usePlace: () => "", xqHubName: () => "", jhRetPlace: w.T.jhRetPlace };
  vm.createContext(c); vm.runInContext(m[0] + ";this.bkName=bkName;", c);
  assert.equal(c.bkName("#/jianghu/hall/central"), "中炮門"); assert.equal(c.bkName("#/jianghu"), "十州棋館"); assert.equal(c.bkName("#/school/x"), "門派修行");
  assert.equal(c.bkName("#/school"), "開局棋路"); assert.equal(c.bkName("#/school/masters"), "十派掌門"); assert.equal(c.bkName("#/school/x_swordboy"), "劍童的門派"); assert.equal(c.bkName("#/school/x_swordboy/central_01"), "劍童・中炮門", "課程頁照 oscPlay 標題"); assert.equal(c.bkName("#/port"), "渡口");
});

test("〔原始碼〕jStart 第一件事核對來處；對局頁頂端返回鍵先看來處；園子結算視窗用 jParkBackBtn；jBack 原本的開頭照舊（test-fb897）", () => {
  assert.match(LEG, /async function jStart\(id,b,go,force\)\{jRetTake\(id\);/);
  assert.ok(CG.indexOf("jRetOf(st.journey)?\"^\"+jRetOf(st.journey).back") > 0 && CG.indexOf("jRetOf(st.journey)?\"^\"") < CG.indexOf("st.journey===\"park\"?\"^#/port\""));
  assert.match(CG, /false,typeof jParkBackBtn==="function"\?jParkBackBtn\(\):\["‹ 回渡口",\(\)=>upTo\("#\/port"\)\]\);/);
  assert.ok(LEG.includes('const jBack=j=>String(j||"").startsWith("gx:")?"#/adventure":'));
});
