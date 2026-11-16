// 11/16 開發者：「所有意外事件，只有已加入的夥伴角色才能觸發該角的特殊事件。」
//   七星改版後，夥伴是一路陸續加入的（07pty-party.js：ptyHas(c)；沒有旅程時 ptyHas 一律 false），可是很多隨機事件還照舊從七位裡挑人：
//   07j 七星來訪（串門子、請託回來道謝）、07q-buddy 驛站飛書／心結／七星獻策／闖禍解題頁、07f 渡口小卡・棋話一頁・學會了那句・船艙與秦站的台詞、
//   07w4 渡口 3D 主人、07t 插曲 1／3／4／5、06 園子七星打氣、07m2 驛站路過的七星客人、07q2 合作殘譜、07bh 黑洞台詞、07bhtl 練習賽旁白。
//   每一處都補了「已加入」的檢查（寫成 typeof ptyHas!=="function"||ptyHas(c)，舊環境沒有隊伍模組時照舊）。
// 不開瀏覽器：把挑人的函式從原始碼抽出來放進 vm 跑（沒加入的不會被挑到、加入後會），其他接線查原始碼。
// 用法：node --test xiangqi-lab/tools/test-pty-events-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = f => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");
const VIS = M("07j-visit.js"), BD = M("07q-buddy.js"), SHIP = M("07f-ship.js"), PH4 = M("07w4-porthost.js"), EP = M("07t-episodes.js"),
  CPU = M("06-cpu.js"), IG = M("07m2-innguest.js"), COOP = M("07q2-coop.js"), BH = M("07bh-blackhole.js"), BHTL = M("07bhtl-tdlearn.js");
const cutOf = SRC => (a, b) => { const i = SRC.indexOf(a), j = SRC.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + a); return SRC.slice(i, j) };
const ALL = ["x_swordboy", "x_spiritgirl", "x_martialgirl", "x_miaogirl", "x_shuai", "x_shi", "x_bing"];
const WX = { x_swordboy: { n: "齊轍", nk: "阿轍", pc: "俥" }, x_spiritgirl: { n: "田飛燕", nk: "燕子", pc: "相" }, x_martialgirl: { n: "雷借花", nk: "花兒", pc: "炮" },
  x_miaogirl: { n: "駱躍梅", nk: "小梅", pc: "傌" }, x_shuai: { n: "沈方庭", nk: "方庭", pc: "帥" }, x_shi: { n: "鐵連城", nk: "城子", pc: "仕" }, x_bing: { n: "步越溪", nk: "溪兒", pc: "兵" } };
/* 隊伍：joined＝已加入的名單；null＝沒有旅程 */
const party = joined => ({ ptyHas: c => !!joined && joined.includes(c), ptyGet: () => (joined ? { m: Object.fromEntries(joined.map(c => [c, {}])) } : null), ptyLook: () => "x_swordboy" });
const run = (code, ctx, ret) => { vm.createContext(ctx); vm.runInContext(code + ";this.__X=" + ret, ctx); return ctx.__X };
const rnd0 = () => Object.assign(Object.create(Math), { random: () => 0 });

test("〔行為〕07j 七星來訪：還沒加入的不來串門子；加入後才會被挑到；做完請託回來道謝也要已加入", () => {
  const code = cutOf(VIS)("function v7In(c)", "/* 挑一句");
  const mk = (joined, S) => run(code, Object.assign({ myChar: () => "x_swordboy", localDay: () => "d1", Date, Math: rnd0(), V7: Object.fromEntries(ALL.map(c => [c, { l: [], q: [] }])),
    V7_P: .35, V7_GAP: 1, V7_BACK: 1, V7_DAYMAX: 3, CHAR_ERA: {}, SHIP_STOP: {}, v7QDone: () => true }, party(joined)), "v7Pick")(S || { day: {}, last: 0 }, "han", "");
  assert.equal(mk(["x_swordboy"]), null, "只有齊轍（玩家自己）：沒人來串門子");
  assert.equal(mk(null), null, "沒有旅程：沒人來");
  assert.deepEqual({ ...mk(["x_swordboy", "x_miaogirl"]) }, { c: "x_miaogirl" }, "小梅加入後：挑得到她（也只挑得到她）");
  const back = joined => mk(joined, { day: {}, last: 0, q: { c: "x_shuai", id: "pz" } });
  assert.notEqual((back(["x_swordboy"]) || {}).back, 1, "請託人方庭還沒加入：不會回來道謝");
  assert.deepEqual({ ...back(["x_swordboy", "x_shuai"]) }, { c: "x_shuai", back: 1 }, "方庭已加入：回來道謝");
});

test("〔行為〕07t 插曲：1 吵架組兩位都要加入、3 旁觀者只挑已加入、4 茶話會不到兩位不觸發、5 大掃除闖禍的人要已加入", async () => {
  const cut = cutOf(EP), J = cut("const epJoined=", "function epOk(){");
  const EP_K = { S: "x_swordboy", Y: "x_spiritgirl", H: "x_martialgirl", M: "x_miaogirl", F: "x_shuai", L: "x_shi", X: "x_bing" };
  const talk = joined => run(J + cut("function ep1Talk(here)", "/* 替角色 c 挑一題"), Object.assign({ epMe: () => "x_swordboy", EP_K,
    EP1_TALK: { qing: [{ a: "X", b: "F" }, { a: "H", b: "L" }] } }, party(joined)), "ep1Talk")("qing");
  assert.equal(talk(["x_swordboy", "x_bing"]), null, "溪兒加入、方庭沒加入：第一組不選；第二組兩位都沒加入：不觸發");
  assert.equal(talk(["x_swordboy", "x_bing", "x_shuai"]).k, 0, "溪兒、方庭都加入：選第一組");
  assert.equal(talk(["x_swordboy", "x_martialgirl", "x_shi"]).k, 1, "只有花兒、城子：選第二組");

  const watch = joined => run(J + cut("function ep3Watchers(here)", "/* 對手多走一步"), Object.assign({ epMe: () => "x_swordboy", WX_CHARS: WX, Math: rnd0(),
    EP_PC: { x_swordboy: "R", x_spiritgirl: "B", x_martialgirl: "C", x_miaogirl: "N", x_shuai: "K", x_shi: "A", x_bing: "P" }, CHAR_ERA: {}, SHIP_STOP: {},
    epOne: a => a[0] }, party(joined)), "ep3Watchers")("tang");
  assert.deepEqual([...watch(["x_swordboy"])], [], "只有齊轍：沒有旁觀者（對手照樣來）");
  assert.deepEqual([...watch(["x_swordboy", "x_shi"])], ["x_shi"], "城子加入：只挑得到城子，不會冒出沒加入的第二位");

  const four = joined => { const log = []; const f = run(J + cut("function ep4Show(", "function ep4Sheet("), Object.assign({ epMe: () => "x_swordboy",
    EP4_OPEN: Object.fromEntries(ALL.map(c => [c, ["a", "b"]])), epSt: () => { log.push("st"); return { ntr: {} } }, ep4Key: () => "k", epCount() { }, epSave() { }, EP_P: { 4: 1 },
    epOne: a => a[0], epBubble: (v, w, cs) => log.push(cs.join("+")), ep4Sheet() { }, Math: rnd0() }, party(joined)), "ep4Show"); return { r: f(null, "home", "night", true), log } };
  let r = four(["x_swordboy", "x_shi"]);
  assert.equal(r.r, false, "已加入的夥伴（不算玩家）只有一位：茶話會不觸發"); assert.deepEqual(r.log, [], "也不記「今天抽過」");
  r = four(["x_swordboy", "x_shi", "x_miaogirl"]);
  assert.equal(r.r, true); assert.deepEqual(r.log, ["st", "x_miaogirl+x_shi"], "兩位都已加入：照常開，挑的是已加入的兩位");

  const five = async joined => { const S = { sw: { done: {}, t: {}, pend: 1 } };
    const f = run(J + cut("async function ep5Start(", "function ep5Show("), Object.assign({ epMe: () => "x_swordboy", epSt: () => S, epSave() { }, epCount() { }, epOne: a => a[0], Date,
      EP5_DROP: { N: ["x_miaogirl", "", ""], R: ["x_swordboy", "", ""], C: ["x_martialgirl", "", ""] },
      ep5Data: async () => ({ items: [{ id: "a", gone: { p: "N" } }, { id: "b", gone: { p: "C" } }, { id: "c", gone: { p: "R" } }] }) }, party(joined)), "ep5Start");
    return { cur: await f(true), S } };
  let x = await five(["x_swordboy"]);
  assert.equal(x.cur, null, "只有齊轍（玩家自己的子不掉）：沒人闖禍"); assert.equal(x.S.sw.pend, null, "取消這次大掃除，不佔著 15 分鐘");
  x = await five(["x_swordboy", "x_martialgirl"]);
  assert.equal(x.cur.c, "x_martialgirl", "花兒加入：掉子的是花兒，不會是還沒加入的小梅");
});

test("〔行為〕07w4 ph4Who：渡口主人還沒加入就不站出來（回空字串）", () => {
  const who = joined => run(cutOf(PH4)("function ph4Who(k)", "function ph4Mount("), Object.assign({ SHIP_LESSON: { han: { open: "嗨", openBy: "x_miaogirl" } }, SHIP_STOP: { han: { who: ["x_miaogirl"] } },
    shipAppr: () => false, shipLearned: () => false, WX_CHARS: WX, myChar: () => "x_swordboy" }, party(joined)), "ph4Who")("han");
  assert.equal(who(["x_swordboy"]), "", "小梅還沒加入：不站");
  assert.equal(who(["x_swordboy", "x_miaogirl"]), "x_miaogirl", "加入後：站出來");
});

test("〔行為〕07q-buddy：驛站飛書只寄已加入的人的信、心結要已加入、七星獻策沒加入就退回史實軍師、闖禍解題頁擋還沒加入的", () => {
  const cut = cutOf(BD), J = cut("const bdJoined=", "const bdDay=");
  const base = joined => Object.assign({ bdOk: () => true, bdMe: () => "x_swordboy", bdDay: () => "d", shipDockList: () => ["classic", "qin", "han", "sanguo"], shipAt: () => "sanguo",
    SHIP_ROUTE: ["qin", "han", "sanguo"], BD_ML: { qin: { c: "x_swordboy" }, han: { c: "x_miaogirl" } }, BD_ML_DAY: 2, bdCan: () => true, BUDDY_ON: true, WX_CHARS: WX,
    bdNk: c => WX[c].nk, bdTx: s => s, bdPc: c => WX[c].pc, BD_EV: { han: [{ c: "x_miaogirl", pz: "p" }] }, BD_KN: { x_miaogirl: { at: "han", rl: ["han", "r1"] } } }, party(joined));
  const arrive = joined => { const S = { ml: {}, kn: {}, ev: {} }; const X = run(J + cut("function bdArrive(){", "const bdGiftReady="),
    Object.assign(base(joined), { bdSt: () => S, bdSave() { } }), "bdArrive"); X(); return Object.keys(S.ml) };
  assert.deepEqual(arrive(["x_swordboy"]), [], "小梅還沒加入：漢朝那封信不寄（齊轍是玩家自己，本來就不寄）");
  assert.deepEqual(arrive(["x_swordboy", "x_miaogirl"]), ["han"], "小梅加入後：寄到");

  const kn = joined => run(J + cut("function bdKnReady(", "function bdHas("), Object.assign(base(joined), { bdSt: () => ({ kn: { x_miaogirl: { seen: 1 } } }) }), "bdKnReady")("x_miaogirl");
  assert.equal(kn(["x_swordboy"]), false, "心結：沒加入不出現"); assert.equal(kn(["x_swordboy", "x_miaogirl"]), true, "加入後出現");

  const card = { id: "han_1", flag: { opts: [{ who: "一位將軍", say: "s0", re: "r0" }, { who: "韓信", say: "s1", re: "r1", ok: 1 }, { who: "一位謀士", say: "s2", re: "r2" }] } };
  const plan = joined => run(J + cut("function bdPlanCard(", "function bdPlanDom("), Object.assign(base(joined), {
    BD_PLAN: { han_1: { w: ["一位將軍", "韓信", "一位謀士"], o: [["x_spiritgirl", "相", "a"], ["x_miaogirl", "傌", "b"], ["x_swordboy", "俥", "c"]] } } }), "bdPlanCard")(card);
  assert.equal(plan(["x_swordboy"]), null, "燕子、小梅都沒加入（齊轍是自己）：整張卡退回原本的史實軍師");
  const p2 = plan(["x_swordboy", "x_miaogirl"]);
  assert.deepEqual(Array.from(p2.flag.opts, o => o.who), ["一位將軍", "小梅・傌", "一位謀士"], "只有小梅加入：只有她那一策換成七星，燕子那策留給史實軍師");

  const xm = joined => run(J + cut("function bdEvXM(k)", "/* ---------- 2 驛站飛書"), Object.assign(base(joined), { bdSt: () => ({ ev: { han: { c: "x_miaogirl" } } }) }), "bdEvXM")("han");
  assert.ok(xm(["x_swordboy"]).err, "闖禍解題頁：闖禍的人沒加入（舊紀錄）就出錯誤、不開題");
  assert.equal(xm(["x_swordboy", "x_miaogirl"]).id, "p", "加入後照常開題");
});

test("〔行為〕07f shipSay：還沒加入的人說的句子濾掉，前一句濾光就換說書人；船艙第 2 題說書人不提還沒加入的小梅", () => {
  const cut = cutOf(SHIP);
  const say = (joined, k, id, slot) => run(cut("const SHIP_PLAN={", "/* 這一站這一難度") + cut("function shipSrcLine(P)", "const shipLine=") + cut("function shipByIn(", "function shipQuote("),
    Object.assign({ shipNum: s => String(s), shipAppr: () => false, shipPiece: () => "俥", WX_CHARS: WX, SHIP_STOP: {} }, party(joined)), "shipSay")(k, id, { src: {} }, slot);
  let S = say(["x_swordboy"], "qin", "zx076", 1);
  assert.deepEqual(Array.from(S.pre, x => x[0]), ["說書人"], "秦站 zx076：小梅還沒加入，前一句換說書人"); assert.deepEqual(Array.from(S.done, x => x[0]), ["齊轍"], "齊轍那句照說");
  S = say(["x_swordboy"], "qin", "zx075", 1);
  assert.deepEqual(Object.keys(S.wrong), [], "zx075 小梅的走錯提醒也濾掉");
  S = say(["x_swordboy", "x_miaogirl"], "qin", "zx075", 1);
  assert.deepEqual(Array.from(S.pre, x => x[0]), ["小梅"], "小梅加入後照原本由她說"); assert.ok(S.wrong.c8c9, "走錯提醒也回來");
  assert.equal(say(["x_swordboy"], "classic", "xs-classic-N", 1).pre[0][1], "同一盤，換一匹傌來收。", "船艙第 2 題：小梅沒加入，說書人不提她");
  assert.equal(say(["x_swordboy", "x_miaogirl"], "classic", "xs-classic-N", 1).pre[0][1], "同一盤，換小梅的傌來收。");
  const by = run(cut("function shipByIn(", "function shipQuote("), Object.assign({ WX_CHARS: WX, SHIP_STOP: { tang: { who: ["x_shi"] } } }, party(["x_swordboy"])), "shipByIn");
  assert.equal(by("tang", "teller"), true, "說書人一律可以"); assert.equal(by("tang", undefined), false, "沒寫＝主場第一位（城子）沒加入"); assert.equal(by("tang", "x_swordboy"), true);
});

test("〔原始碼〕07f 渡口小卡、棋話一頁、學會了那句：主人沒加入就改說書人或不畫；下船開場白與「選雲河七星開新旅程」那行沒動", () => {
  assert.ok(SHIP.includes('const byT=ap||!Ls.open||!shipByIn(k,lrn&&Ls.done?Ls.doneBy:Ls.openBy),W=byT?shipWho(k,"teller")'), "渡口上方小卡：主人沒加入＝說書人");
  assert.ok(SHIP.includes("${!ap&&Ls.open&&shipByIn(k,Ls.openBy)?`<div class=\"card port-say\"><img src=\"${Wo.img}\""), "棋話一頁：開場那句");
  assert.ok(SHIP.includes("${lrn&&!ap&&Ls.done&&shipByIn(k,Ls.doneBy)?`<div class=\"card port-say\"><img src=\"${Wd.img}\""), "棋話一頁：學會那句");
  assert.ok(SHIP.includes('${shipByIn(k,Ls.doneBy)?W.n+"：「"+Ls.done+"」":""}'), "千秋殘局過關的 outro");
  assert.ok(SHIP.includes("${Ls.done&&shipByIn(k,Ls.doneBy)?`<p class=\"shp-say\">${esc(W.n)}：「${esc(Ls.done)}」</p>`"), "解完卡片上學會了那句");
  assert.ok(SHIP.includes("if(typeof ptyArrive===\"function\"&&ptyArrive(k,done))return;"), "下船開場白原本的檢查還在");
});

test("〔行為〕06 園子七星打氣、07m2 驛站七星客人、07q2 合作殘譜：只挑／只列已加入的", () => {
  const park = joined => run(cutOf(CPU)("const PARK_VIS={", "/* 11/11 模擬玩家問題 8"), Object.assign({ store: { get: (k, d) => d }, myChar: () => "x_swordboy",
    TRIPO: Object.fromEntries(ALL.map(c => [c, 1])), WX_CHARS: WX, CHAR_ERA: {} }, party(joined)), "parkCrowd")();
  assert.equal(park(["x_swordboy"]).vis, undefined, "只有齊轍（玩家自己）：沒人來園子打氣");
  assert.equal(park(["x_swordboy", "x_bing"]).vis.c, "x_bing", "溪兒加入：來的是溪兒");

  const ig = joined => { const DB = {}; return run(cutOf(IG)("function igWxToday(){", "/* 今天這一站的客人"), Object.assign({ igDay: () => "d", igData: () => DB.innGuest || {}, igRnd: () => () => 0,
    store: { get: (k, d) => (k in DB ? DB[k] : d), set: (k, v) => { DB[k] = v } }, myChar: () => "x_swordboy", WX_CHARS: WX, SHIP_ROUTE: ["qin"], eraLocked: () => false,
    IG_XW: Object.fromEntries(ALL.map(c => [c, "x"])) }, party(joined)), "igWxToday")() };
  assert.equal(ig(["x_swordboy"]).c, null, "只有齊轍：沒有七星客人");
  assert.equal(ig(["x_swordboy", "x_shuai"]).c, "x_shuai", "方庭加入：來的是方庭");
  assert.ok(IG.includes("const me=typeof myChar===\"function\"?myChar():\"\";"), "「自己」改用 myChar()");

  const cj = joined => run(cutOf(COOP)("function cpdJoined(c)", "function cpdList("), party(joined), "cpdJoined");
  assert.equal(cj(null)("x_martialgirl"), true, "沒有旅程（同桌兩人玩）：七題照舊都列");
  assert.equal(cj(["x_swordboy"])("x_martialgirl"), false, "有旅程、花兒沒加入：不列她的棋譜"); assert.equal(cj(["x_swordboy"])("x_swordboy"), true);
  assert.ok(COOP.includes('k=who&&cpdJoined(who)?who:cpdJoined(k0)?k0:"x_swordboy"') && !COOP.includes('const k=who||"x_martialgirl"'), "沒指定時不再寫死花兒");
  assert.ok(COOP.includes("if(!P||!COOP_R||!cpdJoined(P.who)){navReplace(\"#/coop\");return{}}"), "直接連到沒加入的人的棋譜：回清單");
});

test("〔行為〕07bh 黑洞台詞、07bhtl 練習賽旁白：說話的人沒加入就換人（首頁小人或齊轍）", () => {
  const cut = cutOf(BH);
  const bh = joined => run(cut("const BH_FACE=", "function bhForced(){"), Object.assign({ esc: s => String(s), WX_CHARS: WX }, party(joined)), "{bhWho,bhSay}");
  let X = bh(["x_swordboy"]);
  assert.equal(X.bhWho("步越溪"), "齊轍", "溪兒沒加入：偏航那句換齊轍說"); assert.equal(X.bhWho("星樞"), "星樞", "星樞不換");
  assert.match(X.bhSay(["田飛燕", "局勢順風"]), /齊轍：「局勢順風」/); assert.match(X.bhSay(["田飛燕", "局勢順風"]), /prev_x_swordboy/, "頭像也跟著換");
  X = bh(["x_swordboy", "x_spiritgirl"]);
  assert.equal(X.bhWho("田飛燕"), "田飛燕", "燕子已加入：照原本由她說");
  assert.equal(bh(null).bhWho("雷借花"), "齊轍", "沒有旅程（序局）：一律齊轍");
  assert.ok(BH.includes("const say=(k,L,ms)=>{if(S[k])return;S[k]=1;L=[bhWho(L[0]),L[1]];"), "對局中領先／落後的提醒也換人");

  const g = joined => run(cutOf(BHTL)("function bhtlGuide()", "const bhtlSay="), Object.assign({ bhtdChar: () => "x_swordboy",
    BHTD: { CH: { x_swordboy: { n: "齊轍" }, x_spiritgirl: { n: "田飛燕" }, x_shi: { n: "鐵連城" } } } }, party(joined)), "bhtlGuide")();
  assert.equal(g(["x_swordboy"]).n, "齊轍", "田飛燕沒加入：練習賽旁白換齊轍"); assert.equal(g(["x_swordboy", "x_spiritgirl"]).n, "田飛燕");
});
