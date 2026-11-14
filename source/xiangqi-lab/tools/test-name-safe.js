// 紅藍隊 R05（威脅模型 I6）：自由文字名字的安全顯示（m/07x4-lobbysafe.js 的 lbnBad、lbnPick、lbnShow）自動測試。
// 不開瀏覽器：
//   ① 從 07x4 切出「名字安全顯示」那一段（只用稱號表、lbsHash、lbsTitleAt）放進 vm：惡意名字案例庫全部換成稱號、正常名字 0 誤擋（手寫 70 個＋大廳角色 32 位＋系統稱號 576 組）。
//   ② 整支 07x4 放進 vm（假的 store、localStorage）：兒童模式、自己選稱號時看別人一律稱號；自己的名字照原樣；設定頁對自己不合格的名字只提示不擋；棋譜庫讀出來的線上對局對手名字也換。
//   ③ 掃 m/*.js：大廳名冊、邀請視窗、觀戰、棋友資料卡、千秋盃名冊、對局名牌、殘篇閣這些顯示別人名字的地方都走 lbnShow（或 lbnPeer、lbnSeat），
//      插進 innerHTML 的都包 esc()；不包 esc() 的只能是 toast、textContent、playerHTML 這些自己會轉義的地方。
// 用法：node --test xiangqi-lab/tools/test-name-safe.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "../../xiangqi-db/m");
const rd = f => fs.readFileSync(path.join(M, f), "utf8").replace(/\r\n/g, "\n");
const SAFE = rd("07x4-lobbysafe.js"), UTIL = rd("00-util.js");
function cut(src, a, b, name) { const i = src.indexOf(a), j = src.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + name); return src.slice(i, j) }
const line = (src, head) => { const l = src.split("\n").find(x => x.startsWith(head)); assert.ok(l, "找不到 " + head); return l };
const ESC_SRC = line(UTIL, "const esc=");
const PURE = [ESC_SRC, line(SAFE, "const LBS_PLACE="), line(SAFE, "const LBS_ROLE="), line(SAFE, "function lbsHash("), line(SAFE, "const lbsTitleAt="),
  cut(SAFE, "/* ---------- 紅藍隊 R05", "/* ---------- 名字安全顯示：以上", "07x4 的名字安全顯示")].join("\n");
const J = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
const T = (() => { const ctx = {}; vm.createContext(ctx); vm.runInContext(PURE + "\n;this.T={esc,lbnBad,lbnPick,lbnIsTitle,lbnTitleOf,lbsTitleAt,lbsHash,LBN_WHY,LBS_PLACE,LBS_ROLE,LBN_BAD_WORDS};", ctx); return ctx.T })();

/* 惡意名字案例庫：[名字, 預期原因]（原因照 lbnBad 檢查的先後：len、invis、empty、mark、html、url、mail、digit、contact、imp、rude） */
const BAD = [
  ["加我LINE 12345", "digit"], ["開發者公告", "imp"], ["www.xx.com", "url"], ["xx.com", "url"], ["http://bad.tw", "url"], ["ｗｗｗ．ｘｘ．ｃｏｍ", "url"],
  ["xx 點 com", "url"], ["xx。com", "url"], ["abc@gmail", "mail"], ["a@b", "mail"], ["IG@abc", "mail"], ["寄 gmail 給我", "mail"],
  ["0912345678", "digit"], ["０９１２３４５６７８", "digit"], ["零九一二三四五六七八", "digit"], ["①②③④", "digit"], ["1-2-3-4", "digit"],
  ["壹貳參肆", "digit"], ["09 12 34 56", "digit"], ["電話〇九一二", "digit"], ["1..2..3..4", "digit"],
  ["加我好友", "contact"], ["LINE: abc", "contact"], ["ig abc", "contact"], ["Discord小明", "contact"], ["加賴abc", "contact"], ["微信xx", "contact"],
  ["L.I.N.E 小明", "contact"], ["lineid abc", "contact"], ["私訊我", "contact"], ["FB小明", "contact"], ["小明的電話", "contact"],
  ["官方客服", "imp"], ["系統公告", "imp"], ["開 發 者", "imp"], ["開.發.者", "imp"], ["裁判長", "imp"], ["Admin", "imp"], ["官方_小幫手", "imp"],
  ["管理員阿明", "imp"], ["Official", "imp"], ["开发者", "imp"], ["系统消息", "imp"],
  ["小​明", "invis"], ["‮moc.xx", "invis"], ["⁦小明⁩", "invis"], ["小明﻿", "invis"], ["ㅤ", "invis"], ["\u0007鈴", "invis"],
  ["小明‍", "invis"], ["‎‏", "invis"], ["小­明", "invis"], ["小⠀明", "invis"],
  ["   ", "empty"], ["", "empty"], ["　　", "empty"],
  ["Z̵̴̡̛", "mark"],
  ["<img src=x>", "html"], ["<script>", "html"], ["＜b＞hi", "html"], ["\"><svg onload=1>", "html"],
  ["<img src=x onerror=alert(1)>", "len"], ["a".repeat(17), "len"], ["小明".repeat(9), "len"],
  /* 11/13 不雅字詞清單 LBN_BAD_WORDS：髒話、性相關、歧視、人身攻擊（中英文；夾空白、標點、全形、大寫一樣擋） */
  ["幹你娘", "rude"], ["幹 你 娘", "rude"], ["幹.你.娘", "rude"], ["操你媽", "rude"], ["他媽的小明", "rude"], ["靠北啦", "rude"], ["雞掰人", "rude"], ["傻逼", "rude"],
  ["傻B", "rude"], ["草泥馬", "rude"], ["屌你老母", "rude"], ["撲街仔", "rude"], ["約炮王", "rude"], ["做愛", "rude"], ["援交妹", "rude"], ["巨乳控", "rude"],
  ["A片達人", "rude"], ["強姦犯", "rude"], ["婊子", "rude"], ["支那豬", "rude"], ["黑鬼", "rude"], ["死gay", "rude"], ["娘炮", "rude"], ["高麗棒子", "rude"],
  ["你去死", "rude"], ["去死吧", "rude"], ["死全家", "rude"], ["白癡", "rude"], ["白痴小明", "rude"], ["智障", "rude"], ["腦殘", "rude"], ["廢物", "rude"],
  ["人渣", "rude"], ["賤人", "rude"], ["雜種", "rude"], ["王八蛋", "rude"], ["畜生", "rude"],
  ["fuck", "rude"], ["FUCK YOU", "rude"], ["f.u.c.k", "rude"], ["f u c k", "rude"], ["ｆｕｃｋ", "rude"], ["MotherFucker", "rude"], ["Bitch", "rude"], ["bastard", "rude"],
  ["asshole", "rude"], ["dumbass", "rude"], ["shit", "rude"], ["Bullshit", "rude"], ["shitty", "rude"], ["ass", "rude"], ["kiss my ass", "rude"], ["a.s.s", "rude"],
  ["cunt", "rude"], ["pussy", "rude"], ["dickhead", "rude"], ["penis", "rude"], ["porn", "rude"], ["sex", "rude"], ["SexyGirl", "rude"], ["sexy girl", "rude"],
  ["slut", "rude"], ["whore", "rude"], ["nigger", "rude"], ["faggot", "rude"], ["retard", "rude"], ["Nazi", "rude"], ["Hitler", "rude"], ["idiot", "rude"],
  ["moron", "rude"], ["STFU", "rude"], ["小明ass", "rude"], ["boobs", "rude"], ["rape", "rude"], ["killyourself", "rude"]
];
/* 正常但容易誤擋的名字（不雅字詞清單 0 誤擋）：中文的單字（幹、操、屌…）出現在正常詞裡；英文 Scunthorpe 問題（短字藏在長字裡） */
const NEAR = ["能幹", "幹部", "樹幹", "才幹", "苦幹實幹", "幹勁十足", "小明很能幹", "體操", "操場", "操盤手", "情操高尚", "早操", "雞排", "雞腿飯", "小雞", "雞蛋糕",
  "三小時", "生日快樂", "媽媽的小幫手", "我媽的拿手菜", "其他媽媽", "死黨", "失去死黨", "色彩", "性格", "個性", "自性", "黑馬", "黑白棋", "炮打翻山", "打炮過河", "中炮",
  "逼宮", "逼近", "兩頭蛇", "王八卦", "人參", "老母雞", "垃圾分類", "廢物利用", "老司機", "小妹妹", "大奶奶", "陰天", "陰陽", "淫雨霏霏", "射手", "精神", "牛奶", "奶茶",
  "畜牧", "支持", "那支筆", "神鬼", "鬼馬", "棒棒糖", "日本旅遊", "太陽", "智慧", "白雲", "笨蛋", "小笨蛋", "北七", "王八",
  "assassin", "Class", "Glass", "Bass", "Cassie", "Assad", "Sussex", "Essex", "Middlesex", "Sexton", "Sextant", "Dickens", "Dickson", "Dick Chen", "Scunthorpe",
  "Penistone", "Hancock", "Peacock", "Hitchcock", "Cockburn", "Cocktail", "Ashita", "Matsushita", "Shiitake", "Arsenal", "Analyn", "Canal", "Grape", "Drape",
  "Rapeseed", "Nazir", "Fagan", "Titus", "Tito", "Pussycat", "Cumming", "Moroni", "Idiotes", "Hello Kitty", "Shih Tzu", "Twain", "Fuk Wing", "Kao", "Ho Chen",
  "Wanda", "Bitcoin", "Pornchai", "Therapist", "Grassy", "Kassandra", "Massimo", "Lassie", "Harassment"];
/* 正常名字：中文名、英文名、帶「小」「阿」的暱稱、emoji、全形、日韓文、App 自己給的預設名字 */
const GOOD = ["小明", "阿華", "小美", "阿嬤愛下棋", "王小明", "陳大文", "李阿伯", "林家小妹", "象棋小王子", "楚河漢界", "小兵過河", "炮打翻山", "馬走日字",
  "阿公的棋友", "小胖", "阿肥", "阿偉", "小寶貝", "棋聖", "臥龍先生", "張三丰", "歐陽小鳳", "一心一意", "三三", "七七", "九九八十一", "一二三木頭人", "十全十美",
  "千里馬", "萬里長城", "五子棋王", "四季", "愛下棋的貓", "阿Q", "小A", "小明2", "2B鉛筆", "Messi10", "Kevin", "Caroline", "Madeline", "Tiger Lee", "Big Ben",
  "Eileen", "Pauline", "Igor", "Craig", "Sophia", "John Smith", "Leo Chen", "Linda", "Online小子", "Badminton", "Mr. Wang", "A-Bao", "Alice", "Iris", "Phoenix",
  "Ｋｅｖｉｎ", "小明😀", "👨‍👩‍👧 一家人", "❤️小花", "👍🏻阿德", "さくら", "민수", "小雨・晴天", "棋友28AB", "棋友1234", "阿德 (Ted)", "小新&小葵"];
/* 大廳角色（tools/lobby-bots.js 的 NAMES）也不能被擋 */
/* 11/13 第 17 輪 F1：lobby-bots.js 是營運程式、不公開，公開副本改讀 fixtures/lobby-bot-names.json；開發者電腦上兩邊都在時核對一樣（見最後一個測試） */
const BOTS_FIX = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "lobby-bot-names.json"), "utf8")).names;
const BOTS_SRC = (() => { let s; try { s = fs.readFileSync(path.join(__dirname, "lobby-bots.js"), "utf8") } catch (e) { return null } const m = /const NAMES = \[([\s\S]*?)\];/.exec(s); assert.ok(m, "找不到 lobby-bots.js 的 NAMES");
  return [...m[1].replace(/\/\/.*$/gm, "").matchAll(/"([^"]+)"/g)].map(x => x[1]) })();
const BOTS = BOTS_SRC || BOTS_FIX;
test("大廳角色名字：fixtures/lobby-bot-names.json 跟 lobby-bots.js 的 NAMES 一樣（公開副本沒有 lobby-bots.js，只檢查名單不是空的）", () => {
  assert.ok(BOTS_FIX.length >= 32);
  if (BOTS_SRC) assert.deepEqual(BOTS_FIX, BOTS_SRC, "lobby-bots.js 改了名單，要重寫 fixtures/lobby-bot-names.json");
});

test("① 惡意名字案例庫：每一個都判不合格（原因照預期），顯示時換成系統稱號，轉義後沒有 < > \"", () => {
  assert.ok(BAD.length >= 60, "案例至少 60 個（實際 " + BAD.length + "）");
  let blocked = 0;
  BAD.forEach(([nm, why], i) => {
    assert.equal(T.lbnBad(nm), why, JSON.stringify(nm) + " 要判成 " + why);
    const shown = T.lbnPick("p" + i, nm, {});
    assert.ok(T.lbnIsTitle(shown), JSON.stringify(nm) + " 要換成稱號（實際 " + shown + "）");
    assert.equal(shown, T.lbnTitleOf("p" + i, nm), "稱號用代號算");
    assert.doesNotMatch(T.esc(shown), /[<>"]/);
    assert.ok(T.LBN_WHY[why], "設定頁提示要有原因說明：" + why);
    blocked++;
  });
  assert.equal(blocked, BAD.length);
});

test("① 正常名字 0 誤擋：手寫 " + GOOD.length + " 個＋大廳角色＋576 組系統稱號都照原樣顯示", () => {
  assert.ok(GOOD.length >= 30, "正常案例至少 30 個");
  assert.ok(BOTS.length >= 30, "大廳角色名單讀得到（" + BOTS.length + " 位）");
  const miss = [];
  for (const nm of [...GOOD, ...BOTS]) { const why = T.lbnBad(nm); if (why || T.lbnPick("p1", nm, {}) !== nm) miss.push(nm + "→" + why) }
  let titles = 0;
  for (const a of T.LBS_PLACE) for (const b of T.LBS_ROLE) { titles++; if (T.lbnBad(a + b) || T.lbnPick("x", a + b, { kid: true }) !== a + b) miss.push(a + b) }
  assert.equal(titles, 576);
  assert.deepEqual(miss, [], "誤擋：" + miss.join("、"));
});

test("① 不雅字詞清單：" + BAD.filter(x => x[1] === "rude").length + " 個不雅名字都判成 rude；" + NEAR.length + " 個正常但容易誤擋的名字（能幹、體操、assassin、Dickens、Sussex…）0 誤擋", () => {
  const rude = BAD.filter(x => x[1] === "rude");
  assert.ok(rude.length >= 60, "不雅案例至少 60 個（實際 " + rude.length + "）");
  assert.ok(NEAR.length >= 100, "容易誤擋的正常名字至少 100 個（實際 " + NEAR.length + "）");
  const miss = rude.filter(([nm]) => T.lbnBad(nm) !== "rude").map(([nm]) => nm + "→" + (T.lbnBad(nm) || "沒擋"));
  assert.deepEqual(miss, [], "沒擋到：" + miss.join("、"));
  const wrong = NEAR.filter(nm => T.lbnBad(nm) || T.lbnPick("p1", nm, {}) !== nm).map(nm => nm + "→" + T.lbnBad(nm));
  assert.deepEqual(wrong, [], "誤擋：" + wrong.join("、"));
  assert.equal(T.LBN_WHY.rude, "有不雅或罵人的字");
});
test("〔原始碼〕不雅字詞清單 LBN_BAD_WORDS：獨立常數、註解寫開發者可以直接增刪；中文都是詞組（只有屄、肏是單字），沒有「幹」「操」「屌」「日」這種單字", () => {
  const src = cut(SAFE, "/* 不雅字詞清單", "let LBN_BADW=", "LBN_BAD_WORDS");
  assert.match(src, /開發者可以直接增刪/); assert.match(src, /const LBN_BAD_WORDS=\{/);
  const B = T.LBN_BAD_WORDS, words = [];
  for (const k of ["zhSwear", "zhSex", "zhHate", "zhAttack"]) words.push(...B[k].source.replace(/\(\?![^)]*\)/g, "").split("|"));
  assert.ok(words.length >= 120, "中文詞數：" + words.length);
  const single = words.filter(w => [...w].length < 2);
  assert.deepEqual(single.sort(), ["屄", "肏"].sort(), "單字：" + single.join("、"));
  const en = [...B.enAny.source.split("|"), ...B.enW.source.split("|")];
  assert.ok(en.length >= 40, "英文詞數：" + en.length);
  assert.ok(!B.enAny.source.split("|").some(w => /^(?:ass|sex|cunt|cock|tit|anal|rape|nazi|shit|dick|porn|fag)$/.test(w)), "會藏在正常英文字裡的短字要放 enW（要字邊界）");
});
test("① 稱號：同一個代號每次都一樣、跟自己選稱號的第一個候選相同；兒童在看一律稱號；自己照原樣；沒名字沒代號就空白", () => {
  const id = "a1b2c3d4e5", t = T.lbnTitleOf(id, "x");
  assert.equal(t, T.lbsTitleAt(T.lbsHash(id)));
  assert.equal(T.lbnTitleOf(id, "別的名字"), t, "稱號只跟代號有關");
  assert.equal(T.lbnPick(id, "小明", { kid: true }), t, "兒童在看：正常名字也換稱號");
  assert.equal(T.lbnPick(id, "加我LINE 12345", { kid: true }), t);
  assert.equal(T.lbnPick(id, "長安小棋童", { kid: true }), "長安小棋童", "對方本來就用稱號就照原樣");
  assert.equal(T.lbnPick(id, "加我LINE 12345", { me: true, kid: true }), "加我LINE 12345", "自己的畫面照常顯示自己取的名字");
  assert.equal(T.lbnPick(id, "小明", {}), "小明");
  assert.equal(T.lbnPick("", "", {}), "", "沒名字也沒代號：空白（呼叫的地方自己補「棋友」）");
  assert.ok(T.lbnIsTitle(T.lbnPick("", "加我LINE 12345", {})), "沒有代號就用名字算稱號");
  assert.equal(T.lbnPick("", "加我LINE 12345", {}), T.lbnPick("", "加我LINE 12345", {}));
});

/* ② 整支 07x4 放進 vm */
function phone(opt) {
  opt = opt || {};
  const ls = new Map(Object.entries(opt.ls || {})), localStorage = { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const store = { get(k, d) { const v = ls.get("m_" + k); if (v == null) return d; try { return JSON.parse(v) } catch (e) { return d } }, set(k, v) { ls.set("m_" + k, JSON.stringify(v)) } };
  const DBX = { "/db/items?c=pvp&limit=500": { name: "真人對局", items: [{ id: "g1", red: "我自己", black: "加我LINE 12345", mine: "r" }, { id: "g2", red: "小明", black: "我自己", mine: "b" }, { id: "g3", red: "紅方", black: "黑方" }] },
    "/db/items?c=peek": { name: "棋友的對局", items: [{ id: "k1", red: "開發者公告", black: "阿華", net: true }] },
    "/db/item?c=pvp&id=g1": { id: "g1", red: "我自己", black: "www.xx.com", mine: "r", net: true },
    "/db/items?c=play": { items: [{ id: "c1", red: "你", black: "幻影棋客" }] } };
  const st = { name: opt.myName == null ? "我自己" : opt.myName, toasts: [], pub: 0 };
  const ctx = { localStorage, store, setTimeout: () => 0, clearTimeout() {}, console, Date, Math, JSON, String, Array, Object, Set, Map, Promise, RegExp, Error, Number,
    meInfo: () => ({ id: "me1", name: st.name }), myName: () => st.name, fmKid: () => !!opt.kid, toast: t => st.toasts.push(t),
    setMyName: n => { st.name = String(n || "").trim().slice(0, 16) },
    api: async u => { if (!DBX[u]) throw new Error("沒有 " + u); return DBX[u] }, DBX, st };
  if (opt.people) ctx.XQNet = { people: () => opt.people, me: () => ({ id: "me1" }), refresh() { st.pub++ }, pubProf() {}, on() {}, active: () => false };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(ESC_SRC + "\n" + SAFE + "\n;this.R={lbnShow,lbnSeat,lbnPeer,lbsSetHTML,lbnTitleOf,lbnIsTitle,api,lbsTitle,lbsTitleCands,lbsTpGroup,lbsTpMore,lbsTpSet,lbsSetMode,lbsTitleAt,setMyName:n=>setMyName(n)};", ctx);
  return ctx;
}
test("② lbnShow：一般玩家只換不合格的；兒童模式（07m5 fmKid）、自己選了「稱號」（xq_pubNm＝t，新玩家預設）看別人一律稱號；自己照原樣", () => {
  const N = phone({ ls: { xq_pubNm: '"n"' } }).R;
  assert.equal(N.lbnShow("p1", "小明"), "小明");
  assert.equal(N.lbnShow({ id: "p1", name: "小明" }), "小明", "也可以直接給玩家物件");
  assert.equal(N.lbnShow("p1", "加我LINE 12345"), N.lbnTitleOf("p1"));
  assert.equal(N.lbnShow({ id: "p2", name: "<img src=x onerror=alert(1)>" }), N.lbnTitleOf("p2"));
  assert.equal(N.lbnShow("me1", "加我LINE 12345"), "加我LINE 12345", "自己");
  for (const P of [phone({ kid: true, ls: { xq_pubNm: '"n"' } }).R, phone({ ls: { xq_pubNm: '"t"' } }).R]) {
    assert.equal(P.lbnShow("p1", "小明"), P.lbnTitleOf("p1"), "兒童在看：正常名字也換成稱號");
    assert.equal(P.lbnShow("p1", "長安小棋童"), "長安小棋童");
    assert.equal(P.lbnShow("me1", "我自己"), "我自己");
  }
  const P = phone({ ls: { xq_pubNm: '"n"' } }).R;
  assert.equal(P.lbnPeer({ id: "p9", name: "加我LINE 12345", ai: false }, "加我LINE 12345"), P.lbnTitleOf("p9"), "殘篇閣搭檔");
  assert.equal(P.lbnPeer({ id: "ai", name: "小帥", ai: true }, "小帥"), "小帥", "小帥 AI 照原樣");
  assert.equal(P.lbnPeer({ id: "p9", name: "阿華", ai: false }, "我自己"), "我自己", "不是搭檔的名字（自己）照原樣");
  assert.equal(P.lbnSeat("r", "我自己"), "我自己", "沒有線上對局時，自己的名字照原樣");
  assert.equal(P.lbnSeat("b", "開發者公告"), P.lbnTitleOf("", "開發者公告"));
});
test("② 設定頁：自己的名字不合格提示「這個名字不能在大廳顯示」和別人看到的稱號（就是對外送的那個）；正常名字、選了稱號都不提示", () => {
  const bad = phone({ myName: "加我LINE 0912", ls: { xq_pubNm: '"n"' } }), h = bad.R.lbsSetHTML();
  assert.match(h, /id="lbsNmBad"/); assert.match(h, /有 4 位以上的數字/); assert.ok(h.includes(bad.R.lbnTitleOf("me1")), "顯示別人會看到的稱號");
  assert.match(h, /這個名字不能在大廳顯示：<span>有 4 位以上的數字<\/span>。別人看到的是稱號：<b>([^<]+)<\/b>/);
  assert.equal(/別人看到的是稱號：<b>([^<]+)<\/b>/.exec(h)[1], bad.window.XQ_PUBNAME(bad.meInfo()), "提示的稱號＝對外送出的名字");
  assert.doesNotMatch(h, /data-tp=/, "沒選稱號就不出三選一");
  assert.match(phone({ myName: "幹你娘", ls: { xq_pubNm: '"n"' } }).R.lbsSetHTML(), /有不雅或罵人的字/);
  assert.doesNotMatch(phone({ myName: "小明", ls: { xq_pubNm: '"n"' } }).R.lbsSetHTML(), /lbsNmBad/);
  assert.doesNotMatch(phone({ myName: "加我LINE 0912", ls: { xq_pubNm: '"t"' } }).R.lbsSetHTML(), /lbsNmBad/, "選了稱號就不用提示");
  assert.match(phone({ myName: "開發者公告", ls: { xq_pubNm: '"n"' } }).R.lbsSetHTML(), /像官方或開發者/);
});
test("② 自動改送稱號：XQ_PUBNAME（net.js 在線狀態、邀請、戰績摘要問的）名字不合格就回稱號、合格回空字串（＝送自己的名字）；改名合格↔不合格會馬上重送並提示", () => {
  for (const nm of ["加我LINE 12345", "開發者公告", "fuck", "幹你娘", "www.xx.com"]) {
    const P = phone({ myName: nm, ls: { xq_pubNm: '"n"' } }), pn = P.window.XQ_PUBNAME(P.meInfo());
    assert.ok(P.R.lbnIsTitle(pn), nm + "：對外送稱號（實際 " + pn + "）"); assert.equal(pn, P.R.lbsTitle(), "跟設定頁、選稱號用的是同一個（xq_pubTitle）");
    assert.equal(P.myName(), nm, "存檔裡的名字不動（自己畫面照常）");
    assert.equal(P.R.lbnShow("me1", nm), nm, "自己看自己照原樣");
  }
  for (const nm of ["小明", "棋友28AB", "Dickens", "能幹的小兵", ""]) { const P = phone({ myName: nm, ls: { xq_pubNm: '"n"' } }); assert.equal(P.window.XQ_PUBNAME(P.meInfo()), "", JSON.stringify(nm) + "：照舊送自己的名字（空白由 net.js 補棋友＋代號）") }
  const T1 = phone({ myName: "小明", ls: { xq_pubNm: '"t"' } }); assert.ok(T1.R.lbnIsTitle(T1.window.XQ_PUBNAME(T1.meInfo())), "選了稱號一律送稱號");
  /* 改名：不合格 → 合格 → 不合格 */
  const P = phone({ myName: "加我LINE 12345", ls: { xq_pubNm: '"n"' }, people: [] }), t = P.R.lbsTitle();
  P.R.setMyName("小明"); assert.equal(P.window.XQ_PUBNAME(P.meInfo()), "", "改合格就恢復送自己的名字"); assert.equal(P.st.pub, 1, "馬上重送在線狀態");
  P.R.setMyName("小華"); assert.equal(P.st.pub, 2, "合格改合格：對外名字變了也重送");
  P.R.setMyName("小華"); assert.equal(P.st.pub, 2, "名字沒變不重送");
  P.R.setMyName("官方客服"); assert.equal(P.window.XQ_PUBNAME(P.meInfo()), t, "又改成不合格：送原本那個稱號"); assert.equal(P.st.pub, 3);
});
test("② 稱號三選一：線上沒人用的 3 個候選（第一組含現在的稱號）、「換一組」換 3 個新的、點一個存進 xq_pubTitle 並重送；撞名自動換照舊", () => {
  const busy = []; for (let i = 0; i < 576; i += 2) busy.push({ id: "o" + i, name: phone().R.lbsTitleAt(i) });   /* 線上一半的稱號有人用 */
  const P = phone({ myName: "小明", ls: { xq_pubNm: '"t"' }, people: busy }), R = P.R, used = new Set(busy.map(p => p.name));
  const c = J(R.lbsTitleCands(3, [], 0));
  assert.equal(c.length, 3); assert.equal(new Set(c.map(x => x.t)).size, 3, "3 個不重複");
  for (const x of c) { assert.ok(R.lbnIsTitle(x.t)); assert.equal(R.lbsTitleAt(x.i), x.t); assert.ok(!used.has(x.t), x.t + " 線上有人用了") }
  for (let s = 0; s < 40; s++) { const r = R.lbsTitleCands(3, ["長安小棋生"]); assert.equal(r.length, 3); assert.ok(r.every(x => !used.has(x.t) && x.t !== "長安小棋生")) }
  const cur = R.lbsTitle(), g = J(R.lbsTpGroup());
  assert.equal(g.length, 3); assert.equal(g[0].t, cur, "第一組的第一個是現在的稱號"); assert.equal(new Set(g.map(x => x.t)).size, 3);
  let h = R.lbsSetHTML();
  assert.equal((h.match(/data-tp="/g) || []).length, 3, "三顆稱號按鈕"); assert.match(h, new RegExp('data-tp="' + cur + '" class="on"'), "現在的稱號亮著");
  assert.match(h, /<button id="lbsTpMore">🔄 換一組<\/button>/);
  assert.doesNotMatch(h.slice(h.indexOf('id="lbsTp"'), h.indexOf("lbsTpMore")), /class="muted"|<span|<br/, "三選一沒有說明小字");
  const g2 = J(R.lbsTpMore()); assert.equal(g2.length, 3);
  assert.ok(g2.every(x => !g.some(y => y.t === x.t) && !used.has(x.t)), "換一組：3 個都是新的、線上沒人用");
  for (const G of [g, g2, c]) assert.equal(new Set(G.map(x => x.t.slice(0, 2))).size, 3, "一組 3 個地名都不一樣：" + G.map(x => x.t).join("、"));
  assert.equal(J(R.lbsTitleCands(3, [], 0)).length, 3);
  const full = phone({ ls: { xq_pubNm: '"t"' }, people: Array.from({ length: 575 }, (_, i) => ({ id: "o" + i, name: R.lbsTitleAt(i) })) }).R;
  assert.deepEqual(J(full.lbsTitleCands(3, [])).map(x => x.t), [R.lbsTitleAt(575)], "線上幾乎全被用掉：給得出幾個就給幾個");
  h = R.lbsSetHTML(); assert.doesNotMatch(h, /data-tp="[^"]*" class="on"/, "新的一組沒有現在的稱號就都不亮");
  const pub0 = P.st.pub;
  assert.equal(R.lbsTpSet(g2[1].t), true); assert.equal(R.lbsTitle(), g2[1].t, "點了就換");
  assert.deepEqual(JSON.parse(P.localStorage.getItem("xq_pubTitle")), { i: g2[1].i, t: g2[1].t }, "存在 xq_pubTitle");
  assert.equal(P.window.XQ_PUBNAME(P.meInfo()), g2[1].t, "對外送新的稱號"); assert.equal(P.st.pub, pub0 + 1, "馬上重送"); assert.match(P.st.toasts.pop(), new RegExp(g2[1].t));
  assert.match(R.lbsSetHTML(), new RegExp('data-tp="' + g2[1].t + '" class="on"'));
  assert.equal(R.lbsTpSet("不在這一組"), false); assert.equal(R.lbsTpSet(g2[1].t), false, "點現在這個不用重送"); assert.equal(R.lbsTitle(), g2[1].t);
  /* 新玩家：沒有 xq_pubTitle 就自動給一個（照代號算、避開線上有人用的） */
  const N = phone({ ls: { xq_pubNm: '"t"' }, people: busy }).R, t0 = N.lbsTitle(); assert.ok(N.lbnIsTitle(t0) && !used.has(t0));
  /* 撞名自動換：people 事件的處理照舊在 */
  assert.match(SAFE, /XQNet\.on\("people",\(\)=>\{if\(!lbsPubT\(/);
});
test("〔原始碼〕稱號三選一的版面：三顆一排（grid 三欄、不換行、字太長就省略號），換一組另起一行；沒動 src/net.js 的接法（XQ_PUBNAME 照舊）", () => {
  assert.match(SAFE, /#lbSafe \.lbs-tp\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(SAFE, /#lbSafe \.lbs-tp button,#lbSafe \.lbs-tp1 button\{[^}]*white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
  const NET = fs.readFileSync(path.join(__dirname, "../src/net.js"), "utf8");
  assert.match(NET, /window\.XQ_PUBNAME\(m\)/, "net.js 對外的名字照舊問 XQ_PUBNAME");
});
test("② 棋譜庫：線上對局（mine、net、棋友的對局）讀出來時對手名字換掉，自己那一方、同桌對弈、人機對局不動，存檔本身不改", async () => {
  const X = phone({ ls: { xq_pubNm: '"n"' } }), api = X.R.api;
  const a = J(await api("/db/items?c=pvp&limit=500"));
  assert.equal(a.items[0].red, "我自己"); assert.ok(X.R.lbnIsTitle(a.items[0].black), "對手不合格的名字換成稱號");
  assert.equal(a.items[1].red, "小明"); assert.equal(a.items[1].black, "我自己");
  assert.deepEqual([a.items[2].red, a.items[2].black], ["紅方", "黑方"], "同桌對弈（沒有 mine、net）不動");
  assert.equal(X.DBX["/db/items?c=pvp&limit=500"].items[0].black, "加我LINE 12345", "存檔本身不改");
  const k = J(await api("/db/items?c=peek")); assert.ok(X.R.lbnIsTitle(k.items[0].red)); assert.equal(k.items[0].black, "阿華");
  const one = J(await api("/db/item?c=pvp&id=g1")); assert.ok(X.R.lbnIsTitle(one.black)); assert.equal(one.red, "我自己");
  assert.deepEqual(J(await api("/db/items?c=play")).items[0], { id: "c1", red: "你", black: "幻影棋客" }, "人機對局不動");
  const K = phone({ kid: true }), b = J(await K.R.api("/db/items?c=pvp&limit=500"));
  assert.ok(K.R.lbnIsTitle(b.items[1].red), "兒童模式：正常的對手名字也換稱號"); assert.equal(b.items[1].black, "我自己");
});

/* ③ 盤點：顯示別人名字的地方 */
const SITES = {   /* 檔案：至少幾處走 lbnShow／lbnPeer／lbnSeat */
  "02-shell.js": 14, "03-home-quiz.js": 1, "04-stats.js": 4, "06c-cup.js": 5, "07hs-netsig.js": 1, "07q2-coop.js": 5, "07x2-lobbymap.js": 2,
  "07x4-lobbysafe.js": 10, "07y7-cupmap.js": 3, "09b-preload.js": 3, "11-watch.js": 1
};
const RAW = [   /* 改之前直接插原始名字的寫法，不能再出現 */
  [/(?<!data-[a-z]+="\$\{)esc\(\s*(?:p|on|x\.from|G\.red|G\.black|m\.a|m\.b|x|S\.champ)\.name\b/, "esc(某人.name)"],   /* data-pn 這類屬性只拿來傳給 oppCard，不顯示 */   /* 07x2 燈籠的 o.name 是上面 lit 已經走過 lbnShow 的 */
  [/\$\{(?:x\.from|r|z|x|p)\.name\}/, "${某人.name}"], [/(?<!data-on=")\$\{esc\(x\.opp\|\|/, "esc(x.opp)"], [/S\.champ\?S\.champ\.name/, "S.champ.name"],
  [/name:p\.name,cls/, "燈籠 name:p.name"], [/map\(p=>p\.name\)/, "map(p=>p.name)"], [/String\(p\.name\|\|""\)\.trim\(\)/, "cp2Nm 的 p.name"],
  [/featG\.red&&featG\.red\.name\)\|\|/, "千秋盃看板 featG.red.name"], [/x\.name\|\|PLAYER\[x\.by\]/, "聊天泡泡 x.name"],
  [/nm=x=>x==="r"\?st\.red:st\.black;/, "對局名牌 st.red"], [/\$\{S\.B\.name\}/, "殘篇閣 S.B.name"], [/\$\{d\.name\|\|""\}/, "殘篇閣泡泡 d.name"]
];
const ALLOW = [/<b>\$\{esc\(c\.name\)\}<\/b>\$\{c\.dev===d\.me/];   /* 02-shell whoSheet：自己電腦伺服器（/clients）列出的家裡裝置，不是線上陌生人 */
test("〔原始碼〕③ 盤點：大廳名冊、邀請、觀戰、資料卡、千秋盃、對局名牌、殘篇閣都走 lbnShow，沒有直接插原始名字", () => {
  for (const [f, n] of Object.entries(SITES)) {
    let s = rd(f); for (const a of ALLOW) s = s.replace(a, "");
    const k = (s.match(/\blbn(?:Show|Peer|Seat)\(/g) || []).length;
    assert.ok(k >= n, f + "：走 lbnShow 的地方至少 " + n + " 處（實際 " + k + "）");
    for (const [re, what] of RAW) { const m = re.exec(s); assert.ok(!m, f + " 還有直接插原始名字（" + what + "）：" + (m && s.slice(Math.max(0, m.index - 40), m.index + 60))) }
  }
});
test("〔原始碼〕③ 插進 HTML 的名字都包 esc()：沒包的 ${lbnShow(…)} 只能在 toast、textContent、playerHTML（自己會轉義）裡", () => {
  const ok = /(toast\(|textContent=|playerHTML\("[rb]",|sheet\(|`,)$/;
  for (const f of Object.keys(SITES)) {
    const s = rd(f);
    for (const m of s.matchAll(/\$\{(?:\([^)]*\)\?)?lbn(?:Show|Peer|Seat)\(/g)) {
      const bt = s.lastIndexOf("`", m.index), pre = s.slice(Math.max(0, bt - 20), bt);
      const report = f === "07x4-lobbysafe.js" && /`被檢舉的人：/.test(s.slice(bt, bt + 12));   /* 檢舉內容是純文字，送到開發者的表單 */
      const tcw = f === "02-shell.js" && /^XQNet\.on\("tcwait"[^\n]*toast\(/.test(s.slice(s.lastIndexOf("\n", bt) + 1).trim());   /* 時制不同的名單：串起來以後進 toast */
      assert.ok(ok.test(pre) || report || tcw, f + "：沒包 esc() 的名字插在 " + JSON.stringify(s.slice(bt - 30, m.index + 30)));
    }
  }
  /* playerHTML、showChat、sheet 標題自己會轉義 */
  assert.match(rd("05-settings.js"), /function playerHTML\([^)]*\)[\s\S]{0,1500}<b>\$\{esc\(name\)\}<\/b>/);
  assert.match(rd("08b-cpugame.js"), /function showChat\([\s\S]{0,600}esc\(mine\?"我":name\|\|""\)/);
  assert.match(rd("02-shell.js"), /function icoTitle\(t\)\{[^\n]*esc\(m\[2\]\):esc\(t\)\}/);
});
