// 對戰後的角色成長（m/07grw-growth.js，開發者 11/15）＋星槎遠征令面板拿掉、配樂收藏搬到設定 → 聲音（m/07mnq-mainquest.js，開發者 11/15）
//   ① 純函式：快照比對只列有變化的項目、升級那一句、體力只比同一次開 App、換角色不比攻防、開 App 時的快照
//   ② vm 載入整支 07grw（假的 modal／角色卡數值／動畫計時器）：對局結束 grwArm 後第一個結果視窗才插、延後的視窗等畫出來、逾時不插、減少動態不跳數字、顯示完更新快照
//   ③ 接點：08b 結算（一般對電腦、黑洞塔防、星門圍城、黑洞星樞）、07bhw 車輪戰、05b JOURNEY_KEYS、m.html include、07i18n
//   ④ 遠征令拿掉：vm 載入 07mnq（假的 DOM）——入口都不見、配樂收藏與再看第一章在設定的聲音頁找得到
// 用法：node --test xiangqi-lab/tools/test-growth.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), M = path.join(ROOT, "xiangqi-db", "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const GRW = rd(path.join(M, "07grw-growth.js")), MNQ = rd(path.join(M, "07mnq-mainquest.js")), STQ = rd(path.join(M, "07stq-starter.js"));
const CPU = rd(path.join(M, "08b-cpugame.js")), BH = rd(path.join(M, "07bh-blackhole.js")), TD = rd(path.join(M, "07bht-td.js")), GSV = rd(path.join(M, "07bhg-gatesiege.js")), WHL = rd(path.join(M, "07bhw-wheel.js"));
const SAVE = rd(path.join(M, "05b-save.js")), SET = rd(path.join(M, "05-settings.js")), I18N = rd(path.join(M, "07i18n.js")), HTML = rd(path.join(ROOT, "xiangqi-db", "m.html"));
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到 " + a); const j = b ? s.indexOf(b, i) : s.length; assert.ok(j > i, "找不到 " + b); return s.slice(i, j) };
const J = x => x == null || typeof x !== "object" ? x : JSON.parse(JSON.stringify(x));

/* ---------- ① 純函式 ---------- */
function pure() {
  const ctx = {}; vm.createContext(ctx);
  return vm.runInContext(cut(GRW, "/* #GRW-PURE-BEGIN", "/* #GRW-PURE-END") + "\n;({GRW_V,GRW_ROWS,grwDiff,grwHtml,grwBootOf,grwSign})", ctx);
}
const SNAP = (x) => Object.assign({ v: 1, sid: "s1", c: "x_swordboy", lv: 3, r: 20, x: 5, atk: 108, def: 100, tal: 2, sk: 1 }, x || {});

test("快照比對：只列有變化的項目（一列「⚔️ 攻擊力 108 → 110（+2）▲」），沒變化的不顯示；什麼都沒變＝不插", () => {
  const P = pure();
  assert.deepEqual(J(P.GRW_ROWS).map(r => r[2]), ["天賦", "體力", "靈力", "攻擊力", "防禦力", "技能"], "六項照角色卡");
  const D = J(P.grwDiff(SNAP(), SNAP({ atk: 110, r: 22 })));
  assert.deepEqual(D.rows.map(r => r.k), ["r", "atk"]); assert.equal(D.lv, 0);
  assert.deepEqual(D.rows[1], { k: "atk", ic: "⚔️", nm: "攻擊力", a: 108, b: 110, d: 2 });
  const h = P.grwHtml(D);
  assert.match(h, /<i aria-hidden="true">⚔️<\/i><span class="grw-nm">攻擊力<\/span><span class="grw-v">108 → <b data-a="108" data-b="110">110<\/b><\/span><em>（\+2）<\/em><span class="grw-ar" aria-hidden="true">▲<\/span>/);
  assert.match(h, /class="grw-l up"/); assert.ok(!/防禦力|靈力|天賦|技能/.test(h), "沒變的不顯示");
  assert.ok(!/修為升到/.test(h), "沒升級不寫");
  assert.equal(P.grwHtml(P.grwDiff(SNAP(), SNAP())), "", "什麼都沒變＝空字串");
  assert.equal(P.grwHtml(P.grwDiff(null, SNAP())), "", "沒有快照（第一次）＝不插");
  /* 減少：照實際變化，灰色 ▼、全形減號 */
  const h2 = P.grwHtml(P.grwDiff(SNAP(), SNAP({ r: 17 })));
  assert.match(h2, /class="grw-l dn"[^]*體力[^]*20 → <b data-a="20" data-b="17">17<\/b>[^]*（−3）[^]*▼/);
});

test("修為升級另外寫一句「修為升到 Lv N！」；攻擊力、技能跟著變的也列出來", () => {
  const P = pure();
  const D = J(P.grwDiff(SNAP({ lv: 3 }), SNAP({ lv: 5, atk: 112, sk: 2 })));
  assert.equal(D.lv, 5); assert.deepEqual(D.rows.map(r => r.k), ["atk", "sk"]);
  const h = P.grwHtml(D);
  assert.match(h, /<p class="grw-lv"><span aria-hidden="true">✨<\/span> 修為升到 Lv 5！<\/p>/);
  assert.ok(h.indexOf("修為升到") < h.indexOf("攻擊力"), "升級那句在最上面");
  assert.equal(J(P.grwDiff(SNAP({ lv: 5 }), SNAP({ lv: 5 }))).lv, 0);
  assert.match(P.grwHtml({ rows: [], lv: 2 }), /修為升到 Lv 2！/, "只有升級也會插");
});

test("體力只比同一次開 App 的（定軌力不存檔）；換了角色不比攻擊、防禦、天賦、技能（靈力照比）；版本不對不比", () => {
  const P = pure();
  assert.deepEqual(J(P.grwDiff(SNAP(), SNAP({ sid: "s2", r: 30 }))).rows, [], "關 App 再開回滿不算成長");
  const D = J(P.grwDiff(SNAP(), SNAP({ c: "x_spiritgirl", atk: 90, def: 120, tal: 0, sk: 3, x: 7 })));
  assert.deepEqual(D.rows.map(r => r.k), ["x"]);
  assert.deepEqual(J(P.grwDiff(SNAP({ c: "" }), SNAP({ atk: 110 }))).rows, [], "還沒選角色時的快照：攻防不比");
  assert.deepEqual(J(P.grwDiff(SNAP({ v: 0 }), SNAP({ atk: 110 }))).rows, []);
  assert.deepEqual(J(P.grwDiff(SNAP({ r: undefined }), SNAP({ r: 10 }))).rows, [], "平日體力關掉時沒記體力");
});

test("開 App 時的快照（grwBootOf）：沒有＝記現在的；別次開 App 記的＝只把體力換成現在的；同一次＝不動", () => {
  const P = pure(), now = SNAP({ sid: "s9", r: 30, atk: 120 });
  assert.deepEqual(J(P.grwBootOf(null, now)), J(now));
  const z = J(P.grwBootOf(SNAP(), now));
  assert.equal(z.sid, "s9"); assert.equal(z.r, 30); assert.equal(z.atk, 108, "攻擊力不動（下一盤才顯示 108 → 120）");
  const o = SNAP({ sid: "s9" }); assert.equal(P.grwBootOf(o, now), o, "同一次開 App 不動");
  assert.equal("r" in J(P.grwBootOf(SNAP(), SNAP({ sid: "s9", r: undefined }))), false, "現在沒記體力就拿掉");
});

/* ---------- ② vm 載入整支 07grw ---------- */
function full(C) {
  const mem = {}, INS = [], RAF = [];
  let hold = false;
  const mkModal = (html, cls) => {
    const n = (s => (s.match(/data-a="/g) || []).length);
    const grwEl = { querySelectorAll: () => { const h = INS[INS.length - 1] || "", out = []; for (const m of h.matchAll(/data-a="([^"]+)" data-b="([^"]+)"/g)) out.push({ dataset: { a: m[1], b: m[2] }, textContent: "", isConnected: true, classList: { add() { } } }); return out } };
    return { cls, html, querySelector: s => s === ".mb" ? { insertAdjacentHTML: (p, h) => { assert.equal(p, "beforebegin", "插在按鈕上面"); INS.push(h) } } : s === ".grw" ? grwEl : null, _n: n };
  };
  const ctx = {
    store: { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } },
    modal: (html, buttons, cls) => hold ? null : mkModal(html, cls),
    dglName: () => C.c, xpInfo: () => ({ L: C.lv }), dglLive: () => C.live, DGL: { s: { r: 20 } }, dglShow: r => Math.ceil(r), dglXm: () => C.x,
    BHTD: { CH: { x_swordboy: {} }, stats: (c, L) => ({ atk: 1 + L * 0.02, def: 1, ck: c }), atkPt: a => Math.round(a * 100), defPt: d => Math.round(100 / d), SK: [{ ch: "x_swordboy", lv: 1 }, { ch: "x_swordboy", lv: 4 }] },
    bhtdTal() { }, bhtdDust: () => ({ t: C.t }),
    matchMedia: () => ({ matches: !!C.rm }), requestAnimationFrame: f => { RAF.push(f) }, performance: { now: () => 0 },
    document: { getElementById: () => null, createElement: () => ({}), head: { append() { } } }, Date, Math, JSON, String, Object, Array, console
  };
  vm.createContext(ctx);
  vm.runInContext(GRW, ctx, { filename: "07grw-growth.js" });
  return { ctx, mem, INS, RAF, C, setHold: v => { hold = v }, run: s => vm.runInContext(s, ctx) };
}
const C0 = () => ({ c: "x_swordboy", lv: 3, x: 5, t: [1], live: true, rm: false });

test("對局結束 grwArm 後，第一個結果視窗（cls 有 res）才插成長那一塊；別的視窗、沒結束對局、第二個視窗都不插；顯示完更新快照", () => {
  const T = full(C0());
  T.ctx.grwBoot(); assert.equal(T.mem.grw.lv, 3, "開 App 記下快照"); assert.equal(T.mem.grw.atk, 106); assert.equal(T.mem.grw.sk, 1);
  T.C.lv = 4; T.ctx.DGL.s.r = 22; T.C.x = 6;
  T.ctx.modal("<h2>你贏了！</h2>", [], "res"); assert.equal(T.INS.length, 0, "沒 grwArm（不是對局結束）不插");
  T.ctx.grwArm("cpu");
  T.ctx.modal("<p>確定？</p>", [], ""); assert.equal(T.INS.length, 0, "不是結果視窗不插");
  T.ctx.modal("<h2>你贏了！</h2>", [], "res bt-res"); assert.equal(T.INS.length, 1, "結果視窗插一次");
  const h = T.INS[0];
  assert.match(h, /修為升到 Lv 4！/); assert.match(h, /體力[^]*20 → <b data-a="20" data-b="22">22/); assert.match(h, /靈力[^]*5 → [^]*（\+1）/);
  assert.match(h, /攻擊力[^]*106 → <b data-a="106" data-b="108">108/); assert.match(h, /技能[^]*1 → [^]*2<\/b>/);
  assert.ok(!/防禦力|天賦/.test(h), "防禦力、天賦沒變不顯示");
  assert.equal(T.mem.grw.lv, 4, "顯示完更新快照"); assert.equal(T.mem.grw.atk, 108);
  T.ctx.modal("<h2>你贏了！</h2>", [], "res"); assert.equal(T.INS.length, 1, "同一盤第二個結果視窗不再插");
  /* 下一盤什麼都沒變：不插，快照照樣更新 */
  T.ctx.grwArm("cpu"); T.ctx.modal("<h2>和局</h2>", [], "res"); assert.equal(T.INS.length, 1);
  /* 天賦點亮（不是對局得到的）：下一盤結算一起告訴玩家 */
  T.C.t = [1, 2]; T.ctx.grwArm("bh:td"); T.ctx.modal("x", [], "res bt-res"); assert.match(T.INS[1], /天賦[^]*1 → [^]*2<\/b>/);
});

test("殺棋動畫延後的結果視窗（modal 回傳 null）等真的畫出來才插；過了 GRW_TTL 沒有結果視窗＝不插、快照不動（下一盤一起算）", () => {
  const T = full(C0()); T.ctx.grwBoot();
  T.C.lv = 5; T.setHold(true); T.ctx.grwArm("cpu");
  assert.equal(T.ctx.modal("x", [], "res"), null); assert.equal(T.INS.length, 0); assert.equal(T.mem.grw.lv, 3, "還沒畫出來，快照不動");
  T.setHold(false); T.ctx.modal("x", [], "res"); assert.equal(T.INS.length, 1); assert.match(T.INS[0], /Lv 5/);
  T.C.lv = 6; T.ctx.grwArm("bh:x"); T.run("GRW.arm=Date.now()-GRW_TTL-1");
  T.ctx.modal("x", [], "res"); assert.equal(T.INS.length, 1, "逾時不插"); assert.equal(T.mem.grw.lv, 5, "快照不動");
  T.ctx.grwArm("cpu"); T.ctx.modal("x", [], "res"); assert.match(T.INS[1], /修為升到 Lv 6！/, "下一盤一起算");
});

test("減少動態：不跳數字（不排 requestAnimationFrame），直接是新值；一般情況數字從舊值跳到新值", () => {
  const T = full(Object.assign(C0(), { rm: true })); T.ctx.grwBoot(); T.C.x = 8; T.ctx.grwArm("whl"); T.ctx.modal("x", [], "res");
  assert.equal(T.INS.length, 1); assert.equal(T.RAF.length, 0, "減少動態不跳"); assert.match(T.INS[0], /data-b="8">8<\/b>/, "HTML 本來就是新值");
  const U = full(C0()); U.ctx.grwBoot(); U.C.x = 8; U.ctx.grwArm("cpu"); U.ctx.modal("x", [], "res");
  assert.ok(U.RAF.length >= 1, "一般情況排動畫");
  /* 跑完動畫：最後停在新值 */
  const box = { querySelectorAll: () => [B] }, B = { dataset: { a: "5", b: "8" }, textContent: "", isConnected: true, classList: { add(c) { B.pop = c } } };
  U.RAF.length = 0; assert.equal(U.ctx.grwAnim(box), true); assert.equal(B.textContent, "5", "先顯示舊值");
  for (let t = 0, n = 0; U.RAF.length && n < 200; n++) { const f = U.RAF.shift(); t += 50; f(t) }
  assert.equal(B.textContent, "8"); assert.equal(B.pop, "pop");
  assert.equal(full(Object.assign(C0(), { rm: true })).ctx.grwAnim(box), false);
});

test("〔原始碼〕減少動態的樣式：@media (prefers-reduced-motion:reduce) 把 .grw 的動畫全關；升的那列綠色、降的灰色", () => {
  assert.match(GRW, /@media \(prefers-reduced-motion:reduce\)\{\.grw,\.grw \*\{animation:none!important;transition:none!important\}\}/);
  assert.match(GRW, /\.grw-l\.up em,\.grw-l\.up \.grw-ar\{color:#2e8b57\}/);
});

test("〔原始碼〕接點：08b 結算先 grwArm（一般對電腦、黑洞塔防、星門圍城、黑洞星樞都從這裡出）；07bhw 車輪戰結算 grwArm 後開結果視窗；05b JOURNEY_KEYS 有 grw；m.html 在 07mnq 後面 include；07i18n 翻得出升級那句", () => {
  const blk = cut(CPU, "if(st.result&&shownResult!==", "const win=st.result.w===st.human,draw0=");
  assert.ok(blk.includes('try{if(typeof grwArm==="function")grwArm(KIND(st))}catch(e){}'), "08b 結算那一段 grwArm");
  assert.ok(blk.indexOf("grwArm(") < blk.indexOf("journeyGameEnd(st)"), "在發修為之前（快照比的是這盤之後）");
  const tail = CPU.slice(CPU.indexOf("grwArm(KIND(st))"));
  for (const f of ["bhResultModal(st,win,draw0,XPR)", "battleResultModal(st,win,draw0,XPR)", "gxResultModal(st,win,draw0,XPR)"]) assert.ok(tail.includes(f), "08b 之後才分流：" + f);
  const bhr = cut(BH, "function bhResultModal(", "\n/*");
  assert.ok(bhr.includes("gsvResult(st,win,draw0,XPR)") && bhr.includes("bhtdResult(st,win,draw0,XPR)"), "星門圍城、黑洞塔防的結果視窗從 bhResultModal 分出去");
  assert.match(cut(TD, "function bhtdResult(", "\n/*"), /"res bt-res"\);/, "黑洞塔防結果視窗是 res");
  assert.match(cut(GSV, "function gsvResult(", "\n/*"), /\]\],"res"\)\}/, "星門圍城結果視窗是 res");
  const w0 = WHL.indexOf("function whlEnd("), w1 = WHL.indexOf('"res")},900)}', w0); assert.ok(w0 > 0 && w1 > w0, "找不到 whlEnd");
  const we = WHL.slice(w0, w1 + 13);
  assert.ok(we.includes('try{if(typeof grwArm==="function")grwArm("whl")}catch(e){}'), "車輪戰 grwArm");
  assert.ok(we.indexOf("grwArm(") < we.indexOf("modal(") && /\]\],"res"\)\},900\)\}/.test(we), "grwArm 後開 res 結果視窗");
  const keys = SAVE.match(/const JOURNEY_KEYS=\[([^\]]*)\]/); assert.ok(keys && /"mnq","grw","xsdRec"/.test(keys[1]), "JOURNEY_KEYS 有 grw（插在 mnq 後面，不動 test-bhtd-r2／test-ximarket 綁的尾巴）");
  assert.ok(SAVE.includes('"bhtl","gsv","whl","xsmSeen","dgl","gxtSeen"].map(k=>"m_"+k)'), "尾巴順序照舊");
  assert.ok(GRW.includes('store.get("grw",null)') && GRW.includes('store.set("grw",o)'), "只用 grw 這個鍵");
  const inc = [...HTML.matchAll(/^\/\/#include (m\/[\w.-]+\.js)$/gm)].map(m => m[1]), i = inc.indexOf("m/07grw-growth.js");
  assert.ok(i > inc.indexOf("m/07mnq-mainquest.js") && i > inc.indexOf("m/00-util.js") && i > inc.indexOf("m/07dgl-stamina.js"), "m.html include 07grw（在 00-util modal、07dgl 之後）");
  assert.ok(I18N.includes('[/^修為升到\\s*Lv\\s*(\\d+)！$/,m=>"XP up to Lv "+m[1]+"!"]'), "英文規則");
  for (const s of ["天賦", "體力", "靈力", "攻擊力", "防禦力", "技能", "角色成長"]) assert.ok(I18N.includes('"' + s + '":'), "字典有 " + s);
});

test("〔原始碼〕模組規矩：前綴 grw／GRW 只在 07grw 宣告；長行沒有 // 行內註解；沒有控制字元", () => {
  for (const f of fs.readdirSync(M).filter(f => f.endsWith(".js") && f !== "07grw-growth.js")) {
    const s = rd(path.join(M, f));
    assert.ok(!/(?:function|const|let|var)\s+(?:grw|GRW)[A-Za-z_]*/.test(s), f + " 宣告了 grw 開頭的名字");
  }
  for (const ln of GRW.split("\n")) if (!/^\s*(\/\*|\*|\/\/)/.test(ln)) assert.ok(!/[^:"'`]\/\/[^#]/.test(ln.replace(/https?:\/\/\S+/g, "")), "長行裡有 // 註解：" + ln.slice(0, 80));
  assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(GRW), "有控制字元");
});

/* ---------- ④ 遠征令拿掉：vm 載入 07mnq（假的 DOM） ---------- */
class El {
  constructor(t) { this.tag = t; this.children = []; this.innerHTML = ""; this.id = ""; this.btn = {}; this.parent = null }
  append(...c) { for (const x of c) { x.parent = this; this.children.push(x) } }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null }
  querySelector(s) { if (s[0] === "#") return this.children.find(c => c.id === s.slice(1)) || null; const m = /data-k=(\w+)/.exec(s); if (m && this.innerHTML.includes('data-k="' + m[1] + '"')) return this.btn[m[1]] || (this.btn[m[1]] = {}); return null }
  querySelectorAll() { return [] }
}
function mnq(state) {
  const mem = { mnq: state || {} }, SH = [], CALL = [];
  const ctx = {
    store: { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } },
    esc: s => String(s), localStorage: { getItem: () => null }, location: { hostname: "example.org", hash: "#/" },
    document: { getElementById: () => null, createElement: t => new El(t), head: { append() { } } },
    sheet: (t, build) => { const b = new El("div"); SH.push({ t, b }); build(b) }, closeSheet() { }, toast() { },
    stqMore: () => CALL.push("stqMore"), CODEX: [], console
  };
  vm.createContext(ctx);
  vm.runInContext(MNQ, ctx, { filename: "07mnq-mainquest.js" });
  vm.runInContext("mnqChapter=function(e){CALL.push('chapter:'+e)}", Object.assign(ctx, { CALL }));
  return { ctx, mem, SH, CALL };
}
const LIT = { seg: { c1o: 1, c1m: 1, c1e: 1 }, lamp: { classic: 1 }, gift: { a1: 1, a2: 1, a6: { qin: 1 } }, music: ["qin/bianzhong_1.mp3", "qin/zheng_1.mp3"], page: ["classic", "qin"] };

test("遠征令拿掉：開關 MNQ_PANEL_ON＝false；下一步不會再帶去面板（主線做完＝更多玩法）；萬一有人叫 mnqPanel 也只開配樂收藏，看不到 13 章清單和「即將開放」", () => {
  const T = mnq(LIT);
  assert.equal(vm.runInContext("MNQ_PANEL_ON", T.ctx), false);
  const n = J(T.ctx.mnqNextOf(J(LIT), { hasChar: true, firstWin: true, home: "qin", at: "qin", homeLabel: "秦朝" }));
  assert.deepEqual(n, { k: "more", t: "更多玩法" });
  assert.equal(vm.runInContext("mnqNextTxt", T.ctx)(n), "更多玩法");
  T.ctx.mnqGo(n); assert.deepEqual(T.CALL, ["stqMore"], "出發＝更多玩法清單");
  T.ctx.mnqPanel();
  assert.equal(T.SH.length, 1); assert.equal(T.SH[0].t, "♪ 配樂收藏");
  assert.ok(!/星槎遠征令|即將開放|航線亮了|／13/.test(T.SH[0].b.innerHTML), "沒有 13 章清單");
  assert.match(T.SH[0].b.innerHTML, /<button type="button" class="mnq-mu" data-m="qin\/bianzhong_1\.mp3">▶ /, "配樂收藏照舊列出收過的曲子");
  assert.equal((T.SH[0].b.innerHTML.match(/class="mnq-mu"/g) || []).length, 2);
});

test("〔混合〕千秋大百科「星槎遠征札記」：不再寫「航線亮燈 n／13」、點了開札記清單（不是遠征令）；札記頁的返回鈕回札記清單", () => {
  const T = mnq(LIT), cx = T.ctx.CODEX.find(c => c.id === "mnq");
  assert.ok(cx, "百科類別還在");
  assert.ok(!/遠征令/.test(cx.say)); assert.equal(J(cx.v()).s, "配樂 2 首"); assert.equal(J(cx.v()).x, 2);
  cx.go(); assert.equal(T.SH[0].t, "📜 星槎遠征札記"); assert.equal((T.SH[0].b.innerHTML.match(/class="item mnq-pg"/g) || []).length, 2);
  assert.ok(MNQ.includes('${MNQ_PANEL_ON?"↩ 回星槎遠征令":"↩ 回星槎遠征札記"}') && MNQ.includes('onclick=()=>MNQ_PANEL_ON?mnqPanel():mnqNotes()'), "札記頁返回鈕");
});

test("配樂收藏搬到設定 → 聲音 → 氛圍（mnqSndRow）：有收藏才出現「♪ 配樂收藏」、點了開收藏；同一處「🎬 再看第一章」點了播第一章；重畫不重複；新玩家什麼都不放", () => {
  const T = mnq(LIT), box = new El("div");
  T.ctx.mnqSndRow(box); T.ctx.mnqSndRow(box);
  assert.equal(box.children.length, 1, "設定頁重畫不重複");
  const d = box.children[0]; assert.equal(d.id, "mnqSnd");
  assert.match(d.innerHTML, /data-k="mu"><span><b>♪ 配樂收藏<\/b><small>配樂 2 首<\/small>/);
  assert.match(d.innerHTML, /data-k="c1"><span><b>🎬 再看第一章<\/b><small>河圖初渡<\/small>/);
  d.btn.mu.onclick(); assert.equal(T.SH[0].t, "♪ 配樂收藏");
  d.btn.c1.onclick(); assert.deepEqual(T.CALL, ["chapter:classic"]);
  /* 領過授印禮、還沒看完第一章（07stq 畢業的人）：寫「看第一章」；沒有收藏就不放配樂收藏那列 */
  const U = mnq({ gift: { a1: 1, a6: {} } }), b2 = new El("div"); U.ctx.mnqSndRow(b2);
  assert.match(b2.children[0].innerHTML, /🎬 看第一章/); assert.ok(!/配樂收藏/.test(b2.children[0].innerHTML));
  const V = mnq({}), b3 = new El("div"); V.ctx.mnqSndRow(b3); assert.equal(b3.children.length, 0, "全新玩家什麼都不放");
});

test("〔原始碼〕遠征令的入口都拿掉：07stq 更多玩法那顆跟著開關、遠征補給的按鈕改開配樂收藏、設定聲音頁叫 mnqSndRow、別的檔沒有人叫 mnqPanel", () => {
  const more = cut(STQ, "function stqMore(", "function stqAuto(");
  assert.ok(more.includes('if(typeof MNQ_PANEL_ON!=="undefined"&&MNQ_PANEL_ON)try{const M=mnqSt();mq=!!('), "更多玩法的「⛵ 星槎遠征令」只在開關打開時才放");
  assert.ok(MNQ.includes('btn=MNQ_PANEL_ON?["♪ 打開遠征令",()=>mnqPanel()]:["♪ 配樂收藏",()=>mnqMusic()];'), "遠征補給的按鈕");
  assert.ok(MNQ.includes("function mnqPanel(){if(!MNQ_PANEL_ON)return mnqMusic();"));
  assert.ok(MNQ.includes("const MNQ_PANEL_ON=false;"));
  assert.ok(SET.includes('bgmNow();if(typeof mnqSndRow==="function")try{mnqSndRow(s3)}catch(e){}'), "設定 → 聲音 → 氛圍（背景音樂那張卡）");
  for (const f of fs.readdirSync(M).filter(f => f.endsWith(".js") && f !== "07mnq-mainquest.js" && f !== "07stq-starter.js")) assert.ok(!rd(path.join(M, f)).includes("mnqPanel("), f + " 還在叫 mnqPanel");
  assert.ok(I18N.includes('"再看第一章":"Rewatch Chapter 1"') && I18N.includes('"看第一章":"Watch Chapter 1"'), "英文");
});
