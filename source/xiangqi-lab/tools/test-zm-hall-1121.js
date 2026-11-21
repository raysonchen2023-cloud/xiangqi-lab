// W48（11/21）十派門內場景頁 #/jianghu/hall/<派>（m/07z9b-jianghu.js JhHall）：先做中炮門
//   滿版門內圖（圖上不畫人、不寫字）＋掌門坐姿立繪疊在大廳主位；可點掌門大廳、講棋堂、前院、山門。
//   圖讀不到（還沒放上 CDN、史學顧問還沒審完）就退回長卷、打開原本的小卡，而且這次開 App 不再顯示「走進山門」，免得繞圈子。
// 用法：node --test xiangqi-lab/tools/test-zm-hall-1121.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const JH = rd("xiangqi-db/m/07z9b-jianghu.js"), OS = rd("xiangqi-db/m/07z9-school.js"), SH = rd("xiangqi-db/m/02-shell.js");
const HALL = JH.slice(JH.indexOf("/* ---------- W48 十派門內場景"));

function load() {
  const c = { jhL: (zh) => zh, jhT: (s) => s, esc: (s) => String(s), document: undefined };
  vm.createContext(c);
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n" + HALL + ";this.R={JH_HALL,JH_HALL_W,JH_HALL_H,JH_HALL_BAD,jhHallPc,jhHallMates}", c);
  return c;
}

test("門內設定：只列有圖的派（先只有中炮門）；主位與四個地點都在原圖 768×1376 範圍內", () => {
  const { R, OSC } = load();
  assert.deepEqual(Object.keys(R.JH_HALL), ["central"]);
  for (const [sid, H] of Object.entries(R.JH_HALL)) {
    assert.ok(OSC.SCH.some((s) => s.id === sid), sid);
    for (const [k, p] of Object.entries({ seat: H.seat, ...H.spots })) assert.ok(p[0] > 0 && p[0] < R.JH_HALL_W && p[1] > 0 && p[1] < R.JH_HALL_H, sid + " " + k + " " + p);
    assert.deepEqual(Object.keys(H.spots).sort(), ["gate", "hall", "study", "yard"]);
    assert.ok(H.spots.hall[1] < H.spots.study[1] && H.spots.study[1] < H.spots.yard[1] && H.spots.yard[1] < H.spots.gate[1], "由上往下：大廳、講棋堂、前院、山門");
    assert.ok(H.w > 40 && H.w < 160, "立繪寬度合理：" + H.w);
  }
});

test("座標換成百分比：jhHallPc", () => {
  const { R } = load();
  assert.equal(R.jhHallPc([384, 688]), "left:50.00%;top:50.00%");
  assert.equal(R.jhHallPc([0, 0]), "left:0.00%;top:0.00%");
});

test("前院：列出這一派的門下棋友與他們在哪裡（驛站、園子、秘境）", () => {
  const { R, OSC } = load();
  for (const s of OSC.SCH) {
    const L = R.jhHallMates(s.id), want = Object.values(OSC.NPC).filter((x) => x[0] === s.id).length;
    assert.equal(L.length, want, s.id);
    for (const x of L) assert.ok(["驛站", "園子", "秘境"].includes(x.at), s.id + " " + x.k + " " + x.at);
  }
  const C = R.jhHallMates("central").map((x) => x.nm + "@" + x.at);
  assert.ok(C.length >= 1, "中炮門至少有一位門人");
});

test("〔原始碼〕路由：#/jianghu/hall/<派> 排在長卷之前，不會被長卷吃掉", () => {
  const a = SH.indexOf('if(p[0]==="jianghu"&&p[1]==="hall"&&typeof JhHall==="function")return screen=JhHall(v,p[2]);'), b = SH.indexOf('if(p[0]==="jianghu"&&typeof Jianghu==="function")return screen=Jianghu(v);');
  assert.ok(a > 0 && b > a);
});

test("〔原始碼〕圖讀不到：記下這一派、退回長卷開原本的小卡；小卡在門內或讀圖失敗過就不顯示「走進山門」", () => {
  assert.match(JH, /img\.onerror=\(\)=>\{JH_HALL_BAD\.add\(sid\);back\(\)\}/);
  assert.match(JH, /const back=\(\)=>\{f\.classList\.remove\("on"\);location\.hash="#\/jianghu";setTimeout\(\(\)=>\{try\{jhSheet\(sid\)\}catch\(e\)\{\}\},700\)\}/);
  assert.match(JH, /\$\{JH_HALL\[sid\]&&!inHall&&!JH_HALL_BAD\.has\(sid\)\?`<button class="btn" id="jhHallGo">/);
  assert.match(JH, /inHall=location\.hash==="#\/jianghu\/hall\/"\+sid/);
});

test("〔原始碼〕掌門立繪疊在主位、可以點（＝掌門小卡）；讀不到立繪就拿掉，不留破圖", () => {
  assert.match(JH, /z\.className="jh-hall-zm";z\.src=`data\/npc\/\$\{m\.id\}\.webp`/);
  assert.match(JH, /z\.onclick=\(\)=>jhSheet\(sid\);z\.onerror=\(\)=>z\.remove\(\)/);
});

test("門內圖原檔（只在開發者電腦；發布時才放上 CDN）：尺寸 768×1376、大小合理", (t) => {
  const p = path.join(ROOT, "xiangqi-db", "art", "zmhall", "central.webp");
  if (!fs.existsSync(p)) return t.skip("沒有 xiangqi-db/art/zmhall/central.webp（美術原檔只在開發者電腦，公開副本沒有）");
  const b = fs.readFileSync(p);
  assert.equal(b.toString("ascii", 0, 4), "RIFF"); assert.equal(b.toString("ascii", 8, 12), "WEBP");
  assert.ok(b.length > 100e3 && b.length < 600e3, "約 0.1～0.6 MB：" + b.length);
});

/* ---------- 前院門下棋友（開發者 11/21「門下棋友也站在前院給玩家點選和對話」）---------- */
function loadMates(extra = {}) {
  const calls = { park: [], jstart: [] };
  const c = {
    jhL: (zh) => zh, jhT: (s) => s, esc: (s) => String(s), document: undefined,
    jhSch: (id) => ({ nm: id + "門", op: id + "開局", say: id + "的要點" }),
    jhWindDay: (d) => d.toISOString().slice(0, 10), jhWindHash: (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 } return h >>> 0 },
    jhIntelOn: () => false, jhIntelSch: (s) => s,
    PARK_NPC: [{ id: "w15_yuan_archer", say: "百步穿楊。" }, { id: "niao", say: "畫眉聽得懂棋。" }],
    NPC_BOND: { w15_yuan_archer: { l: ["拉弓要穩。"], c: ["蒙古騎兵擅長騎射。"] } },
    INN: [{ id: "tea", say: "喝口茶再下。" }], SECRETS: [{ id: "liuji", say: "「運籌帷幄。」", who: "元末明初的謀士" }],
    jSecrets: () => ({}), parkNpcNew: (game, lv, keep) => { calls.park.push(keep); return keep },
    jStart: (id, b, go) => { calls.jstart.push(id); }, store: { set() {}, get: (k, d) => d },
    JhHall: () => ({}), setTimeout: () => {}, ...extra,
  };
  vm.createContext(c);
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n" + HALL + ";this.R={JH_HALL,JH_HALL_W,JH_HALL_H,JH_MATE_W,jhMateInfo,jhMatesOf,jhMatesShown,jhMateTip,jhMateIntel,jhMatePlay}", c);
  return { c, calls };
}

test("前院門人：園子棋友用閒聊與小知識、能下；秘境人物沒遇過不能下並說明原因；立繪路徑分 npc／actors", () => {
  const { c } = loadMates(), R = c.R;
  const a = R.jhMateInfo("npc:w15_yuan_archer");
  assert.equal(a.kind, "npc"); assert.equal(a.img, "data/npc/w15_yuan_archer.webp"); assert.equal(a.can, true); assert.equal(a.at, "園子");
  assert.deepEqual([...a.lines], ["百步穿楊。", "拉弓要穩。", "蒙古騎兵擅長騎射。"]);
  const s = R.jhMateInfo("secret:liuji");
  assert.equal(s.img, "data/actors/liuji.webp"); assert.equal(s.can, false); assert.match(s.why, /先在秘境遇到/);
  assert.equal(s.lines[0], "運籌帷幄。", "秘境台詞去掉外層引號");
  const t = R.jhMateInfo("inn:tea");
  assert.equal(t.at, "驛站"); assert.equal(t.can, true);
  const met = loadMates({ jSecrets: () => ({ liuji: 1 }) }).c.R.jhMateInfo("secret:liuji");
  assert.equal(met.can, true, "遇過就能下");
});

test("前院站誰：能下的排前面；同一天固定；最多站設定的人數", () => {
  const { c } = loadMates(), R = c.R, d = new Date(2026, 10, 21, 10);
  const L = R.jhMatesShown("central", 3, d);
  assert.ok(L.length <= 3 && L.length >= 1);
  const firstCant = L.findIndex((m) => !m.can); if (firstCant >= 0) assert.ok(L.slice(firstCant).every((m) => !m.can), "能下的都在前面");
  assert.deepEqual(L.map((m) => m.k), R.jhMatesShown("central", 3, new Date(2026, 10, 21, 22)).map((m) => m.k), "同一天上午晚上一樣");
  for (const s of c.OSC.SCH) assert.ok(R.jhMatesShown(s.id, 2, d).length <= 2, s.id);
});

test("前院互動：請教講本派開局要點；打聽掌門——還沒打聽到說要贏一盤，打聽到了照實說", () => {
  const { c } = loadMates(), R = c.R;
  assert.equal(R.jhMateTip("central"), "我們central門講究central開局：central的要點");
  assert.match(R.jhMateIntel("central"), /贏我一盤，我就告訴你/);
  const on = loadMates({ jhIntelOn: () => true, jhIntelSch: () => "same_cannon" }).c.R;
  assert.match(on.jhMateIntel("central"), /今天打算走same_cannon開局/);
});

test("切磋一盤：園子棋友指定由他坐下（只用一次）；驛站旅人走驛站開法；不能下的不開局", () => {
  const { c, calls } = loadMates();
  const R = c.R;
  R.jhMatePlay(R.jhMateInfo("npc:w15_yuan_archer"));
  assert.deepEqual(calls.jstart, ["park"]);
  c.parkNpcNew("g1", 2); c.parkNpcNew("g2", 2);
  assert.equal(calls.park[0], "w15_yuan_archer"); assert.ok(!calls.park[1], "指定只用一次，下一盤不指定、照常隨機");
  R.jhMatePlay(R.jhMateInfo("inn:tea"));
  assert.equal(calls.jstart[1], "inn:tea");
  R.jhMatePlay(R.jhMateInfo("secret:liuji"));
  assert.equal(calls.jstart.length, 2, "沒遇過的秘境人物不開局");
});

test("〔原始碼〕前院門人：站位在原圖範圍內、立繪大小合理；JhHall 與 parkNpcNew 的包裝只做一次", () => {
  const { c } = loadMates(), R = c.R;
  for (const p of R.JH_HALL.central.mates) assert.ok(p[0] > 0 && p[0] < R.JH_HALL_W && p[1] > 0 && p[1] < R.JH_HALL_H, String(p));
  assert.ok(R.JH_MATE_W > 40 && R.JH_MATE_W < 140);
  assert.match(JH, /if\(typeof parkNpcNew==="function"&&!parkNpcNew\.jhMate\)/);
  assert.match(JH, /if\(typeof JhHall==="function"&&!JhHall\.jhMate\)/);
  assert.match(JH, /\.jh-mate-say\{[^}]*color:#3b2a14/, "對話框在深色主題也看得清楚（固定深色字）");
});

test("PR #21 再審（C 路徑）：jStart 先跳選單就 return，玩家之後按「放棄，開新的」才抽人——坐下的仍是指定的門人", async () => {
  const timers = [];
  const { c, calls } = loadMates({ jStart: () => undefined, setTimeout: (f, ms) => { timers.push({ f, ms }) } });
  c.R.jhMatePlay(c.R.jhMateInfo("npc:w15_yuan_archer"));
  await new Promise((r) => setImmediate(r));   /* 玩家在選單想一下才按：jStart 那次流程早就結束了 */
  c.parkNpcNew("g-fresh", 2);
  assert.equal(calls.park[0], "w15_yuan_archer", "選單之後才開新局，仍坐指定的人");
  c.parkNpcNew("g-next", 2);
  assert.ok(!calls.park[1], "用掉就清，下一盤照常隨機");
});

test("PR #21 審查：沒用掉（接續舊盤、取消、API 出錯）時，到期計時器清掉；下一盤不會被指定", () => {
  const timers = [];
  const { c, calls } = loadMates({ jStart: () => Promise.resolve(), setTimeout: (f, ms) => { timers.push({ f, ms }) } });
  c.R.jhMatePlay(c.R.jhMateInfo("npc:w15_yuan_archer"));
  assert.equal(timers.length, 1); assert.equal(timers[0].ms, 45000);
  timers[0].f();
  c.parkNpcNew("g9", 2);
  assert.ok(!calls.park[0], "到期清掉後不再指定：" + calls.park[0]);
});

test("PR #21 審查：指定超過 45 秒就不算數（就算計時器還沒跑）", () => {
  let now = 1_000_000;
  class FakeDate extends Date { static now() { return now } }
  const { c, calls } = loadMates({ Date: FakeDate, setTimeout: () => {} });
  c.R.jhMatePlay(c.R.jhMateInfo("npc:w15_yuan_archer"));
  now += 46_000;
  c.parkNpcNew("g11", 2);
  assert.ok(!calls.park[0], "46 秒後不用");
});

test("PR #21 審查（反向對照補測）：外部傳進來的指定（例如攔路棋客）優先", () => {
  const { c, calls } = loadMates({ setTimeout: () => {} });
  c.R.jhMatePlay(c.R.jhMateInfo("npc:w15_yuan_archer"));
  c.parkNpcNew("g12", 2, "forced");
  assert.equal(calls.park[0], "forced");
});

test("PR #21 再審（反向對照補測）：前院能下的優先——就算不能下的那位雜湊排在前面", () => {
  /* 讓秘境人物（不能下）的雜湊比較小：沒有「能下的優先」時他會排第一 */
  const { c } = loadMates({ jhWindHash: (s) => (s.includes("secret:") ? 0 : 999) });
  const L = c.R.jhMatesShown("central", 3, new Date(2026, 10, 21));
  assert.equal(L[0].can, true, "第一位要是能下的：" + L[0].k);
  assert.equal(L[L.length - 1].k, "secret:liuji", "不能下的排最後");
});

/* PR #22 審查（iMac）：第三位的名牌跟左右兩個各疊 12px 高。名牌照 jhMateCss 算大小：字 12px、行高 1.2、上下 padding 2px、邊框 1px、左右 padding 6px；
   375 寬手機上 1 CSS px＝768/375 原圖像素。名字長度用這一派登記的門人裡最長的（至少 5 字），所有站位一起站滿時名牌兩兩不能重疊。 */
test("PR #22 審查：前院站滿時，門人名牌兩兩不重疊（375 寬手機、用本派最長的名字算）", () => {
  const { R, OSC } = load();
  const px = 768 / 375, H = (12 * 1.2 + 2 * 2 + 2) * px;
  for (const [sid, hall] of Object.entries(R.JH_HALL)) {
    if (!hall.mates) continue;
    const n = Math.max(5, ...Object.values(OSC.NPC).filter((x) => x[0] === sid).map((x) => [...x[2]].length));
    const W = (n * 12 + 6 * 2 + 2) * px;
    const box = ([x, y]) => [x - W / 2, y + 14, x + W / 2, y + 14 + H];
    const B = hall.mates.map(box);
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], b = B[j], hit = a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
      assert.ok(!hit, `${sid} 第 ${i + 1}、${j + 1} 位的名牌重疊：${hall.mates[i]} ／ ${hall.mates[j]}（名字 ${n} 字）`);
    }
  }
});

test("PR #22 審查：只有兩位時左右對稱站（前兩個站位對中軸 384 對稱、同一高度）", () => {
  const { R } = load();
  const [a, b] = R.JH_HALL.central.mates;
  assert.equal(a[0] + b[0], 768, "左右對稱");
  assert.equal(a[1], b[1], "同一高度");
});
