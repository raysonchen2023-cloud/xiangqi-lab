// W45② 十州踢館令（開發者 11/22 選單：配對照表、贏了給印記＋棋譜＋修為 30、戰書旗先用程式畫）：m/07z9b-jianghu.js 檔尾 JH_KICK 那一段。
//   打敗 A 派掌門 → B 派山門插戰書旗；用 A 派開局挑戰 B 派掌門，從定式走完的局面開下（lv.fen），玩家執 A 派那一方。
//   這裡用 vm 跑真的 OSC 核心（07z9-school.js）和踢館程式，外面的存檔、開局、修為用假的記下呼叫。
//   定式的引擎評分（均勢）要另外跑 xiangqi-lab/tools/kick-verify.js（要載入 50 MB 的 nnue，不放進 CI）。
// 用法：node --test xiangqi-lab/tools/test-jh-kick-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const JH = rd("xiangqi-db/m/07z9b-jianghu.js"), OS = rd("xiangqi-db/m/07z9-school.js"), SAVE = rd("xiangqi-db/m/05b-save.js");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const KICK = JH.slice(JH.indexOf("/* ---------- W45② 十州踢館令"));
const J = (x) => JSON.parse(JSON.stringify(x));   /* vm 裡做出來的陣列跟這邊不是同一個 realm，deepEqual 前先轉一次 */
const fnLine = (src, head) => { const l = src.split("\n").find((x) => x.startsWith(head)); assert.ok(l, "找不到 " + head); return l };

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { jstart: [], xp: [], toast: [], hash: [], end0: 0, again0: 0 };
  const c = {
    window: { XQCore: C }, document: undefined, location: { set hash(h) { calls.hash.push(h) } },
    jhL: (zh) => zh, esc: (s) => String(s), oscEn: () => false, i18nWxf: () => null,
    store: { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } },
    toast: (s) => calls.toast.push(s), setTimeout: (f) => f(), closeSheet() {},
    addXP: (n, why, key) => calls.xp.push([n, key]),
    ptyGet: () => ({ look: "pojun" }), PTY: { has: (P, c2) => c2 === "pojun" || c2 === "tianji", ORDER: ["pojun", "tianji"] },
    jStart: (id, b, go) => { calls.jstart.push({ id, b }); go(o.fresh !== false) },
    zmGameEnd: () => { calls.end0++; return true }, zmAgainArgs: (j) => { calls.again0++; mem.zmCur = { id: j.replace(/^inn:/, ""), rl: 10, c: "pojun" }; return { human: "x", journey: j } },
    Jianghu: () => ({}),
  };
  vm.createContext(c);
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n"
    + "function zmGet(){try{return OSC.zmNorm(store.get('zm',null),PTY.ORDER)}catch(e){return OSC.zmBlank()}}\n"
    + fnLine(OS, "const zmLv=") + "\n" + fnLine(OS, "function zmArgs(") + "\n"
    + "const jhSch=id=>OSC.SCH.find(s=>s.id===id);\n" + KICK
    + ";this.R={JH_KICK,jhKickK,jhKickOf,jhKickGet,jhKickAt,jhKickArgs,jhKickStart,jhKickEnd,jhKickHTML,jhKickCn,zmArgs,zmGameEnd,zmAgainArgs}", c);
  return { c, R: c.R, mem, calls };
}
const beatZm = (...ids) => ({ zm: { adj: {}, r: { pojun: Object.fromEntries(ids.map((id) => ["zm_" + id, { n: 1, w: 1, l: 0, d: 0 }])) } } });

test("相剋表＝開發者 11/22 選的那張：十派各一組、下帖的不是自己", () => {
  const { R, c } = load();
  assert.deepEqual(J(R.JH_KICK.map((k) => k.a + ">" + k.b)), ["central>screen", "screen>central", "palace_horse>central", "same_cannon>central", "opposite_cannon>central",
    "cross_palace>central", "pawn>elephant", "elephant>cross_palace", "horse>pawn", "advisor_corner>horse"]);
  const ids = c.OSC.SCH.map((s) => s.id);
  assert.deepEqual(J(R.JH_KICK.map((k) => k.a).sort()), [...ids].sort(), "打敗每一派的掌門都有一面戰書");
  for (const k of R.JH_KICK) { assert.ok(ids.includes(k.b)); assert.notEqual(k.a, k.b) }
});

test("定式：雙方各三步都合法；寫在表裡的局面＝從開局照走六步的結果、輪紅走", () => {
  const { R } = load();
  for (const k of R.JH_KICK) {
    const mv = k.mv.split(" ");
    assert.equal(mv.length, 6, k.a + " 要雙方各三步");
    let b = C.parseFen(C.START.split(" ")[0]), s = "r";
    for (const u of mv) {
      const f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4));
      assert.ok(b[f] && C.sideOf(b[f]) === s && C.legal(b, s).some(([x, y]) => x === f && y === t), k.a + " 不合法：" + u);
      b = C.make(b, f, t); s = C.opp(s);
    }
    assert.equal(s, "r");
    assert.equal(C.fen(b, s).split(" ")[0], k.fen, k.a + " 的局面跟走法對不上");
    assert.ok(!C.inCheck(b, "r") && !C.inCheck(b, "b"), k.a + " 定式走完不能有人被將");
  }
});

test("定式第一步就是 A 派的招牌開局（玩家執紅的五派）；玩家執黑的四派，黑方第一步是本派的招牌", () => {
  const { R, c } = load();
  const first = { central: "h2e2", pawn: "c3c4", elephant: "g0e2", horse: "h0g2", cross_palace: "h2d2", advisor_corner: "b2d2" };
  const blackFirst = { screen: ["h9g7", "b9c7"], palace_horse: ["b9c7", "h9g7"], same_cannon: ["h7e7"], opposite_cannon: ["b7e7"] };
  for (const k of R.JH_KICK) {
    const mv = k.mv.split(" ");
    if (c.OSC.side(k.a) === "r") assert.equal(mv[0], first[k.a], k.a);
    else { assert.equal(mv[0], "h2e2", k.a + "：紅方架中炮"); assert.ok(blackFirst[k.a].includes(mv[1]), k.a + "：黑方第一步 " + mv[1]) }
  }
});

test("戰書出現的條件：A 派掌門被打敗過才有；破陣紀錄照存檔", () => {
  assert.deepEqual(J(load().R.jhKickAt("central")), [], "還沒打敗任何掌門：沒有戰書");
  const { R } = load({ store: beatZm("screen", "pawn") });
  assert.deepEqual(J(R.jhKickAt("central").map((k) => k.a)), ["screen"]);
  assert.deepEqual(J(R.jhKickAt("elephant").map((k) => k.a)), ["pawn"]);
  assert.deepEqual(J(R.jhKickAt("screen")), [], "中炮門掌門沒被打敗，屏風馬門不下帖");
  const W = load({ store: { ...beatZm("screen"), jhKick: { w: { "screen>central": { t: 5, g: "g-1", c: "pojun" }, "bogus>x": { t: 1 } } } } }).R;
  const L = W.jhKickAt("central");
  assert.equal(L[0].won.g, "g-1");
  assert.deepEqual(J(Object.keys(W.jhKickGet().w)), ["screen>central"], "表外的鍵讀檔時丟掉");
});

test("接下戰書：照掌門那一盤開（驛站 inn:zm_<B>），玩家執 A 派那一方、從定式局面開下；zmCur 記上 kick", () => {
  const { R, calls, mem } = load({ store: beatZm("screen", "pawn") });
  R.jhKickStart("screen>central", "pojun");
  let j = calls.jstart.at(-1);
  assert.equal(j.id, "inn:zm_central"); assert.equal(j.b.journey, "inn:zm_central");
  assert.equal(j.b.human, "b", "屏風馬：玩家執黑"); assert.equal(j.b.lv.turn, "r");
  assert.equal(j.b.lv.fen, R.jhKickOf("screen>central").fen);
  assert.deepEqual(J(mem.zmCur), { id: "zm_central", rl: 10, c: "pojun", kick: "screen>central" });
  R.jhKickStart("pawn>elephant", "pojun");
  j = calls.jstart.at(-1);
  assert.equal(j.b.human, "r", "仙人指路：玩家執紅（飛相門掌門平常執紅，這盤改執黑）");
  assert.equal(calls.hash.at(-1), "#/journey/play");
});

test("接下戰書時手上已經有同一位掌門下到一半的棋：接著下那一盤，不算踢館", () => {
  const { R, mem } = load({ store: beatZm("screen"), fresh: false });
  R.jhKickStart("screen>central", "pojun");
  assert.ok(!("kick" in mem.zmCur), "接續舊盤：zmCur 拿掉 kick");
});

test("沒有修行角色不能踢館", () => {
  const { R, calls } = load({ store: beatZm("screen") });
  R.jhKickStart("screen>central", "nobody");
  assert.equal(calls.jstart.length, 0);
  assert.match(calls.toast[0], /要先有修行角色/);
});

test("下完：贏了記破陣（局號、角色）＋修為 30，只給一次；再贏不改第一次的局號", () => {
  const { R, calls, mem } = load({ store: { ...beatZm("screen"), zmCur: { id: "zm_central", rl: 10, c: "pojun", kick: "screen>central" } } });
  assert.equal(R.zmGameEnd({ id: "g-1", human: "b", result: { w: "b" } }, { id: "inn:zm_central" }), true, "原本的掌門結算照跑、回傳照舊");
  assert.equal(calls.end0, 1);
  assert.equal(mem.jhKick.w["screen>central"].g, "g-1"); assert.equal(mem.jhKick.w["screen>central"].c, "pojun");
  assert.deepEqual(calls.xp, [[30, "kick:g-1"]]);
  assert.ok(mem.oscClaim["kick:screen>central"]);
  assert.ok(calls.toast.some((s) => /已破陣/.test(s)));
  R.zmGameEnd({ id: "g-2", human: "b", result: { w: "b" } }, { id: "inn:zm_central" });
  assert.equal(calls.xp.length, 1, "同一組第二次贏不再給修為");
  assert.equal(mem.jhKick.w["screen>central"].g, "g-1", "保留第一次破陣那一盤");
});

test("下完：輸、和、不是踢館的掌門盤、zmCur 對不上這位掌門，都不記破陣", () => {
  const cur = { id: "zm_central", rl: 10, c: "pojun", kick: "screen>central" };
  for (const [st, P, zc, why] of [
    [{ id: "g", human: "b", result: { w: "r" } }, { id: "inn:zm_central" }, cur, "輸"],
    [{ id: "g", human: "b", result: { w: "" } }, { id: "inn:zm_central" }, cur, "和"],
    [{ id: "g", human: "b", result: { w: "b" } }, { id: "inn:zm_central" }, { id: "zm_central", rl: 10, c: "pojun" }, "一般掌門盤"],
    [{ id: "g", human: "b", result: { w: "b" } }, { id: "inn:zm_screen" }, cur, "zmCur 是別的掌門"],
    [{ id: "g", human: "b", result: { w: "b" } }, { id: "inn:zm_central" }, { ...cur, kick: "pawn>elephant" }, "kick 的 B 不是這位掌門"],
  ]) {
    const { R, mem, calls } = load({ store: { zmCur: zc } });
    R.zmGameEnd(st, P);
    assert.ok(!mem.jhKick, why + "：不該記破陣"); assert.equal(calls.xp.length, 0, why + "：不該給修為");
  }
});

test("再下一盤：上一盤是踢館就照樣從定式局面開、玩家執同一方，zmCur 保留 kick；一般掌門盤不動", () => {
  let { R, mem, calls } = load({ store: { zmCur: { id: "zm_central", rl: 10, c: "pojun", kick: "screen>central" } } });
  const a = R.zmAgainArgs("inn:zm_central", 0);
  assert.equal(calls.again0, 1);
  assert.equal(a.human, "b"); assert.equal(a.lv.fen, R.jhKickOf("screen>central").fen);
  assert.equal(mem.zmCur.kick, "screen>central");
  ({ R, mem } = load({ store: { zmCur: { id: "zm_central", rl: 10, c: "pojun" } } }));
  const b = R.zmAgainArgs("inn:zm_central", 0);
  assert.equal(b.human, "x", "一般盤照原本的參數"); assert.ok(!b.lv); assert.ok(!("kick" in mem.zmCur));
});

test("小卡：有戰書才多一段；寫出下帖的話、定式記譜、執哪一方；破陣過的有印記和「看破陣那一盤」", () => {
  assert.equal(load().R.jhKickHTML("central", "pojun"), "");
  const h = load({ store: beatZm("screen") }).R.jhKickHTML("central", "pojun");
  assert.match(h, /中炮門下帖：敢用你學的屏風馬來破嗎？/);
  assert.match(h, /你執黑：炮二平五 馬8進7 傌二進三 車9平8 俥一平二 馬2進3/);
  assert.match(h, /data-kick="screen>central"/); assert.doesNotMatch(h, /data-kickg/);
  const w = load({ store: { ...beatZm("screen"), jhKick: { w: { "screen>central": { t: 1, g: "g-7", c: "pojun" } } } } }).R.jhKickHTML("central", "pojun");
  assert.match(w, /已破陣/); assert.match(w, /data-kickg="g-7"/); assert.match(w, /再踢一次館/);
  assert.doesNotMatch(load({ store: beatZm("screen") }).R.jhKickHTML("central", ""), /data-kick=/, "沒有修行角色不放按鈕");
});

test("〔原始碼〕掛接：小卡插入踢館段與按鈕；存檔鍵跟旅程走；包裝只包一次；看棋譜走 #/db/play/", () => {
  assert.match(JH, /\$\{m\?jhIntelHTML\(sid,m,mates\):""\}\$\{typeof jhKickHTML==="function"\?jhKickHTML\(sid,c\):""\}/);
  assert.match(JH, /const q=s=>b\.querySelector\(s\);if\(typeof jhKickBind==="function"\)jhKickBind\(b,c\);\n    if\(q\("#jhHallGo"\)\)/);
  assert.match(SAVE, /^JOURNEY_KEYS\.push\("m_jhKick"\);/m);
  assert.ok(SAVE.indexOf('JOURNEY_KEYS.push("m_jhKick")') < SAVE.indexOf("const JK=new Set(JOURNEY_KEYS)"), "要在 JK 建立之前");
  for (const f of ["zmGameEnd", "zmAgainArgs", "Jianghu"]) assert.match(JH, new RegExp(f + "\\.jhKick=1"), f + " 只包一次");
  assert.match(JH, /location\.hash="#\/db\/play\/"\+encodeURIComponent\(x\.dataset\.kickg\)/);
});

test("〔原始碼〕W65：戰書段的連結（看破陣那一盤）固定深色字，不跟深色主題的 --ink 變淺；跟淺米底的對比夠", () => {
  const m = JH.match(/\.jh-kick-row \.jh-link\{color:(#[0-9a-f]{6})/i);
  assert.ok(m, "要有 .jh-kick-row .jh-link 的固定字色");
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] };
  const bg = JH.match(/\.jh-kick-row\{[^}]*background:(#[0-9a-f]{6})/i)[1], L1 = lum(bg), L2 = lum(m[1]);
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  assert.ok(ratio >= 4.5, "WCAG AA 對比至少 4.5：" + ratio.toFixed(2));
});
