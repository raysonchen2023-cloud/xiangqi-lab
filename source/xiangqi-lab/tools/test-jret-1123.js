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

test("返回鍵的去處 bkTo：前院小卡留下 ~ 紀錄、在對局頁按上一頁回到門內頁時，跳過卡片和門內頁自己，字寫「回十州棋館」（#76 第四輪審查：原本找到自己，寫回中炮門卻去 #/jianghu）", () => {
  const w = world();
  const c = { navKey: (h) => String(h).replace(/^#/, ""), location: { hash: "#/jianghu/hall/central" }, NAV_H: ["#/jianghu", "#/jianghu/hall/central", "~#/jianghu/hall/central"], NAV_D: 2,
    BK_NAME: [["/port", "渡口"]], usePlace: () => "", xqHubName: () => "", jhRetPlace: w.T.jhRetPlace };
  vm.createContext(c);
  const nm = SH.match(/function bkName\(h\)\{[\s\S]*?\n  let n="";[^\n]*\n/); assert.ok(nm);
  vm.runInContext(fnSrc(SH, "function bkTo(") + "\n" + nm[0] + ";this.bkTo=bkTo;this.bkName=bkName;", c);
  assert.equal(c.bkTo(undefined), "#/jianghu"); assert.equal(c.bkName(c.bkTo(undefined)), "十州棋館");
  c.NAV_D = 3; c.NAV_H = ["#/jianghu", "#/jianghu/hall/central", "~#/jianghu/hall/central", "#/jianghu/hall/central"];
  assert.equal(c.bkTo(undefined), "#/jianghu", "卡片前後都是自己也一樣");
  c.NAV_D = 1; c.NAV_H = ["#/jianghu", "#/jianghu/hall/central"]; assert.equal(c.bkTo(undefined), "#/jianghu", "沒有卡片時照舊");
  c.NAV_D = 2; c.NAV_H = ["#/port", "#/jianghu"]; c.location.hash = "#/jianghu/hall/central"; assert.equal(c.bkTo(undefined), "#/jianghu", "上一筆不是自己就照舊用它");
  c.NAV_D = 2; c.NAV_H = ["#/jianghu/hall/central", "~#/jianghu/hall/central"]; assert.equal(c.bkTo(undefined), "", "往回全是自己和卡片：找不到就寫「返回」");
  assert.equal(c.bkTo("^#/port"), "#/port", "^ 開頭照舊直接用");
});

test("〔原始碼〕jStart 第一件事核對來處；對局頁頂端返回鍵先看來處；園子結算視窗用 jParkBackBtn；jBack 原本的開頭照舊（test-fb897）", () => {
  assert.match(LEG, /async function jStart\(id,b,go,force\)\{jRetTake\(id\);/);
  assert.ok(CG.indexOf("jRetOf(st.journey)?\"^\"+jRetOf(st.journey).back") > 0 && CG.indexOf("jRetOf(st.journey)?\"^\"") < CG.indexOf("st.journey===\"park\"?\"^#/port\""));
  assert.match(CG, /false,typeof jParkBackBtn==="function"\?jParkBackBtn\(\):\["‹ 回渡口",\(\)=>upTo\("#\/port"\)\]\);/);
  assert.ok(LEG.includes('const jBack=j=>String(j||"").startsWith("gx:")?"#/adventure":'));
});

/* W81（#76 第五輪審查建議 2、3，開發者 11/23「#76的兩個問題請找人來修」）：載入真的 jStart（和它的「繼續那一盤／放棄，開新的」選單）、
   真的 jName、jSlotMsg、zmAct；手上那盤由假的 /play/state 回傳，選單的按鈕記下來再按 */
function worldStart(stateJ) {
  const W = world("#/jianghu/hall/central"), c = W.c;
  W.btns = null; W.news = [];
  Object.assign(c, {
    api: async (p) => (p === "/play/state" ? (stateJ ? { journey: stateJ, moves: [1, 2, 3], result: null } : {}) : (W.news.push(p), { id: "g2" })),
    modal: (h, b) => { W.btns = b }, esc: (x) => String(x), rsFinGame: () => false, rsJId: () => "", diffDx: () => 0, parkNpcNew() {},
    ROAD_NAME: "雲河棋路", zmImg: () => "", NPC_LOOK: null, ZM_GCH: {}, igAct: () => null,
    oscSchE: (id) => ({ screen: { nm: c.__en ? "Screen Horse School" : "屏風馬門" }, central: { nm: c.__en ? "Central Cannon School" : "中炮門" } }[id] || null),
    oscL: (zh, en) => (c.__en ? en : zh),
  });
  c.OSC.mst = (j) => ({ zm_screen: { id: "zm_screen", sid: "screen", nm: "屏若山", en: "Ping Ruoshan", pc: "馬" } }[String(j || "").replace(/^inn:/, "")] || null);
  vm.runInContext([fnSrc(LEG, "function jName("), fnSrc(LEG, "const jRnd="), fnSrc(LEG, "function jSlotMsg("), fnSrc(LEG, "async function jStart("), fnSrc(SC, "function zmAct(")].join("\n") + "\n;this.R={jStart,jName,zmAct};", c);
  return W;
}

test("W81：先開掌門局沒下完，再到門內按門下棋友：選「⏳ 繼續那一盤」，掌門局照舊回屏風馬門；選「放棄，開新的」，新的那盤回中炮門、掌門局的紀錄清掉", async () => {
  for (const pick of ["繼續那一盤", "放棄，開新的"]) {
    const W = worldStart("inn:zm_screen"), { T, c } = W;
    T.jRetSet("inn:zm_screen", "#/jianghu/hall/screen", "屏風馬門"); T.jRetTake("inn:zm_screen");   /* 掌門局從屏風馬門開過了 */
    T.jRetSet("park", "#/jianghu/hall/central", "中炮門");   /* 到中炮門門內按門下棋友：開局前先登記 */
    let went = null; await c.R.jStart("park", {}, (x) => { went = x });
    assert.ok(Array.isArray(W.btns), "手上有另一盤沒下完：要跳出選單");
    const b = W.btns.find((x) => String(x[0]).includes(pick)); assert.ok(b, "找得到「" + pick + "」");
    await b[1]();
    if (pick === "繼續那一盤") {
      assert.equal(c.location.hash, "#/journey/play");
      assert.equal(T.jBack("inn:zm_screen"), "#/jianghu/hall/screen", "掌門局返回去處：照舊回屏風馬門門內頁（修之前被門下棋友的紀錄蓋掉，落回驛站）");
      assert.equal(T.jPlace("inn:zm_screen"), "屏風馬門", "掌門局結算寫的地名");
    } else {
      assert.equal(went, true, "開了新的那一盤"); assert.deepEqual(W.news, ["/play/new"]);
      assert.equal(T.jBack("park"), "#/jianghu/hall/central"); assert.equal(T.jPlace("park"), "中炮門");
      assert.equal(T.jRetOf("inn:zm_screen"), null, "被放棄的掌門局，來處紀錄一起清掉");
    }
  }
  /* 沒有另一盤時不跳選單，直接開；從渡口開園子照舊清掉園子那一筆、不動別的代號 */
  const N = worldStart(null);
  N.T.jRetSet("inn:zm_screen", "#/jianghu/hall/screen", "屏風馬門"); N.T.jRetTake("inn:zm_screen");
  N.T.jRetSet("park", "#/jianghu/hall/central", "中炮門"); N.T.jRetTake("park");   /* 園子之前從中炮門開過一盤，留著紀錄 */
  assert.equal(N.T.jBack("park"), "#/jianghu/hall/central");
  N.c.location.hash = "#/port"; await N.c.R.jStart("park", {}, () => {});
  assert.equal(N.btns, null); assert.equal(N.T.jBack("park"), "#/port", "從渡口開園子：回渡口");
  assert.equal(N.T.jBack("inn:zm_screen"), "#/jianghu/hall/screen", "別的代號的紀錄不受影響");
});

test("W81：掌門局的對局頁標題寫「派名掌門・名字」，中英文都對；找不到掌門、一般驛站照舊", () => {
  const W = worldStart(null), R = W.c.R;
  assert.equal(R.jName("inn:zm_screen"), "屏風馬門掌門・屏若山");
  W.c.__en = true; assert.equal(R.jName("inn:zm_screen"), "Screen Horse School master · Ping Ruoshan"); W.c.__en = false;
  assert.equal(R.jName("inn:zm_nobody"), "驛站", "找不到掌門：照舊");
  assert.equal(R.jName("inn:x9"), "驛站", "一般驛站代號不受影響");
});
