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
const SHOWN = OS.match(/^function oscNpcShown\(k\)\{.*$/m)[0];   /* 11/24：門下棋友要不要列（秘境人物找到過才列） */

function load(sec = {}) {
  const c = { jhL: (zh) => zh, jhT: (s) => s, esc: (s) => String(s), document: undefined, jSecrets: () => sec };
  vm.createContext(c);
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n" + SHOWN + "\n" + HALL + ";this.R={JH_HALL,JH_HALL_W,JH_HALL_H,JH_HALL_BAD,jhHallPc,jhHallMates,JH_HALL_WALK}", c);
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

test("前院：列出這一派的門下棋友與他們在哪裡（驛站、園子、秘境）；11/24 起秘境人物要在秘境找到過才列", () => {
  const all = {}; { const { OSC } = load(); for (const k of Object.keys(OSC.NPC)) if (k.startsWith("secret:")) all[k.slice(7)] = 1 }
  const { R, OSC } = load(all);   /* 全部秘境人物都找到過：每一派列出全部門人 */
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
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n" + SHOWN + "\n" + HALL + ";this.R={JH_HALL,JH_HALL_W,JH_HALL_H,JH_MATE_W,jhMateInfo,jhMatesOf,jhMatesShown,jhMateTip,jhMateIntel,jhMatePlay}", c);
  return { c, calls };
}

test("前院門人：園子棋友用閒聊與小知識、能下；秘境人物沒遇過不能下並說明原因；立繪路徑分 npc／actors", () => {
  const { c } = loadMates(), R = c.R;
  const a = R.jhMateInfo("npc:w15_yuan_archer");
  assert.equal(a.kind, "npc"); assert.equal(a.img, "data/npc/w15_yuan_archer.webp"); assert.equal(a.can, true); assert.equal(a.at, "園子");
  assert.deepEqual([...a.lines], ["百步穿楊。", "拉弓要穩。", "蒙古騎兵擅長騎射。"]);
  /* 11/24 開發者：「我希望要現在秘境遇到才能出現在門下棋友那邊 不然都不能看到」——還沒在秘境找到的秘境人物不出現（不是「出現了卻不能下」） */
  assert.equal(R.jhMateInfo("secret:liuji"), null, "還沒在秘境找到：不出現");
  assert.ok(!R.jhMatesOf("central").some((m) => m.k === "secret:liuji"), "門下棋友名單也沒有他");
  const s = loadMates({ jSecrets: () => ({ liuji: 1 }) }).c.R.jhMateInfo("secret:liuji");
  assert.equal(s.img, "data/actors/liuji.webp"); assert.equal(s.can, true, "找到之後出現、能切磋"); assert.equal(s.why, "", "不再有「要先在秘境遇到他」的提示");
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
  const M2 = loadMates({ jSecrets: () => ({ liuji: 1 }) }); M2.c.R.jhMatePlay(M2.c.R.jhMateInfo("secret:liuji"));
  assert.deepEqual(M2.calls.jstart, ["inn:liuji"], "在秘境找到過的，前院切磋會開局");
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
  /* 11/24 起沒找到的秘境人物不出現，所以讓劉基「找到過、但秘境資料被拿掉」，當那位出現了卻不能下的人 */
  const { c } = loadMates({ jhWindHash: (s) => (s.includes("secret:") ? 0 : 999), jSecrets: () => ({ liuji: 1 }), SECRETS: [] });
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

/* PR #22 審查後開發者決定（iMac 轉達）：前院最多只站 2 位，超過 2 位就每天換一批。測試資料讓 3 位都能切磋，免得「能切磋的優先」把人固定住。 */
test("PR #22 審查：門人 3 位以上時前院只畫 2 位；同一天固定，換日期會換到別人", () => {
  const { c } = loadMates({ PARK_NPC: [{ id: "w15_yuan_archer", say: "百步穿楊。" }, { id: "fake_a", say: "甲。" }, { id: "fake_b", say: "乙。" }] }), R = c.R;
  c.OSC.NPC["npc:fake_a"] = ["central", "horse", "假門人甲"]; c.OSC.NPC["npc:fake_b"] = ["central", "pawn", "假門人乙"];
  const n = R.JH_HALL.central.mates.length;
  assert.equal(n, 2, "站位只留兩格");
  assert.match(JH, /jhMatesShown\(sid,H\.mates\.length\)/, "畫幾位照站位格數");
  assert.equal(R.jhMatesOf("central").filter((m) => m.can).length, 3, "測試資料：3 位都能切磋");
  const seen = new Set(), combos = new Set();
  for (let i = 0; i < 30; i++) {
    const L = R.jhMatesShown("central", n, new Date(2026, 10, 1 + i, 9)), k = L.map((m) => m.k);
    assert.equal(L.length, 2, "只站 2 位");
    assert.ok(L.every((m) => m.can), "能切磋的優先，秘境沒遇過的劉伯溫不會擠進來");
    assert.deepEqual(k, R.jhMatesShown("central", n, new Date(2026, 10, 1 + i, 21)).map((m) => m.k), "同一天早晚一樣");
    k.forEach((x) => seen.add(x)); combos.add(k.slice().sort().join("|"));
  }
  assert.ok(combos.size >= 2, "30 天裡至少換過一批：" + [...combos].join("；"));
  assert.equal(seen.size, 3, "3 位都輪得到：" + [...seen].join("、"));
});

test("PR #22 審查：只有兩位時左右對稱站（前兩個站位對中軸 384 對稱、同一高度）", () => {
  const { R } = load();
  const [a, b] = R.JH_HALL.central.mates;
  assert.equal(a[0] + b[0], 768, "左右對稱");
  assert.equal(a[1], b[1], "同一高度");
});

/* ---------- W48 門內 3D 走路（開發者 11/22「3D角色在這一頁也是要能跟在首頁一樣的移動操作方式」）：沿用 07w shwMount ---------- */
test("門內走路座標表：每個入口都有停靠點；路的兩端都是存在的節點；座標都在圖內；從碼頭起點走得到每個入口", () => {
  const { R } = load();
  for (const [sid, W] of Object.entries(R.JH_HALL_WALK)) {
    const H = R.JH_HALL[sid];
    assert.ok(H, sid + " 要先有門內圖設定");
    const inside = (p, s) => assert.ok(p[0] > 0 && p[0] < 100 && p[1] > 0 && p[1] < 100, s + " " + p);
    for (const [k, p] of Object.entries(W.N)) inside(p, sid + " 節點 " + k);
    const adj = {};
    for (const e of W.E.split(" ")) {
      const [a, b] = e.split("-");
      assert.ok(W.N[a] && W.N[b], sid + " 路 " + e + " 的兩端要是節點");
      (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a);
    }
    const want = ["hall", "study", "yard", "gate", "zm", ...H.mates.map((_, i) => "m" + i)].sort();
    assert.deepEqual(Object.keys(W.HS).sort(), want, sid + " 入口：四個地點、掌門、每一格門人，不多不少");
    const seen = new Set(["dock"]), q = ["dock"];
    while (q.length) for (const n of adj[q.shift()] || []) if (!seen.has(n)) { seen.add(n); q.push(n) }
    for (const [k, [n, x, y]] of Object.entries(W.HS)) {
      assert.ok(W.N[n], sid + " 入口 " + k + " 的停靠點 " + n + " 要是節點");
      assert.ok(seen.has(n), sid + " 從碼頭起點走不到入口 " + k);
      inside([x, y], sid + " 入口 " + k + " 面向");
    }
    H.mates.forEach((p, i) => {
      const [, x, y] = W.HS["m" + i];
      assert.ok(Math.abs(x - p[0] / 7.68) < 1 && Math.abs(y - p[1] / 13.76) < 4, sid + " 走到門人 m" + i + " 時要面向他：" + [x, y] + " vs " + p);
    });
  }
});

test("〔原始碼〕門內走路：圖載好才掛 shwMount；地點、門人、掌門都是入口（data-k）；立繪不跟標籤淡掉；名牌在角色上面", () => {
  assert.match(JH, /sel:"\.jh-hall-spot,\.jh-hall-mate,\.jh-hall-zm",keyOf:b=>b\.dataset\.k\|\|""/);
  assert.match(JH, /z\.className="jh-hall-mate";z\.dataset\.k="m"\+i;/);
  assert.match(JH, /zm\.dataset\.k="zm"/);
  assert.match(JH, /if\(!P\.isConnected\|\|!img\.naturalWidth\)return;/, "圖讀不到（退回小卡）時不掛");
  assert.match(JH, /\.jh-hall-mate\.shw-fade,\.jh-hall \.jh-hall-zm\.shw-fade\{opacity:1!important\}/);
  assert.match(JH, /\.jh-hall \.jh-hall-mate-tag\{z-index:4\}/);
  assert.match(JH, /JhHall\.jhWalk=1/, "包一層就好，不重複包");
});

/* ---------- PR #23 審查（iMac 要改 1 項）：門內頁沒寫出口，第一次進門亮的是頂欄返回鍵，「要回去，點這裡」也指著返回鍵；出口要是圖上的「‹ 搭船回十州棋館」 ---------- */
const SW = rd("xiangqi-db/m/07w-shipwalk.js");
function fakeEl(tag) {
  const cls = new Set();
  const el = {
    tag, dataset: {}, style: {}, children: [], isConnected: true, hidden: false,
    get className() { return [...cls].join(" ") }, set className(v) { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)) },
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    append(...a) { el.children.push(...a) }, closest: () => el, getClientRects: () => [1], offsetWidth: 1,
    querySelector(sel) { const c = sel.replace(/^\./, ""); return el.children.find((x) => x.classList && x.classList.contains(c)) || null },
  };
  return el;
}

test("PR #23 審查：門內頁有自己的出口設定（不套預設出口）；點碼頭下緣算出口、搭船標籤在那一塊裡", () => {
  const c = { document: undefined };
  vm.createContext(c);
  const exits = SW.slice(SW.indexOf("const SHW_EXIT_ON="), SW.indexOf("const SHW_XR="));
  const line = JH.split("\n").find((l) => l.startsWith('if(typeof SHW_EXITS!=="undefined"&&SHW_EXITS&&!("jhhall:*" in SHW_EXITS))'));
  assert.ok(line, "07z9b 要寫 jhhall:* 的出口");
  vm.runInContext(exits + "\n" + line + "\nthis.R={SHW_EXITS,shwExitCfg}", c);
  const { R } = load(), W = R.JH_HALL_WALK.central;
  const o = c.R.shwExitCfg({ mem: "jhhall:central", cfg: Object.assign({}, W, { home: "dock" }) });
  assert.ok(o.X, "門內頁要有出口");
  assert.deepEqual([...o.X.r], [38, 90, 62, 100], "用寫明的出口，不是預設的起點左右各 10%");
  assert.deepEqual([...o.X.out], [50, 104]);
  const g = R.JH_HALL.central.spots.gate, gx = g[0] / R.JH_HALL_W * 100, gy = g[1] / R.JH_HALL_H * 100;
  assert.ok(gx >= o.X.r[0] && gx <= o.X.r[2] && gy >= o.X.r[1] && gy <= o.X.r[3], "搭船標籤在出口那一塊裡：" + [gx, gy]);
});

test("PR #23 審查：第一次進門，出口亮框與「要回去，點這裡」都在「搭船」標籤上，不在頂欄返回鍵", () => {
  const P = fakeEl("div"), back = fakeEl("button"), bub = [];
  const doc = { createElement: fakeEl, querySelector: (s) => (s === "#topbar #back" ? back : null) };
  const spotSrc = JH.match(/const spot=\(k,label,go\)=>\{[^\n]*?P\.append\(b\)\};/);
  assert.ok(spotSrc, "找不到 spot()");
  const calls = JH.split("\n").filter((l) => /^  spot\("(hall|study|yard|gate)"/.test(l)).join("\n");
  const c = { document: doc, P, H: R0().JH_HALL.central, m: null, sid: "central", jhL: (z) => z, esc: String, jhHallPc: () => "", jhSheet() {}, jhHallStudy() {}, jhHallYard() {}, jhGo() {}, vibrate() {},
    setTimeout: () => 0, store: { get: () => 0, set() {} }, tmxBub: (b, t) => { bub.push([b, t]); return true } };
  vm.createContext(c);
  const hi = SW.slice(SW.indexOf("function shwXHi(F,n){"), SW.indexOf("function shwWin(S){"));
  vm.runInContext(spotSrc[0] + "\n" + calls + "\n" + hi + "\nthis.out=shwXHi(P,0)", c);
  const gate = P.children.find((x) => x.dataset.k === "gate");
  assert.ok(gate && gate.classList.contains("ex-spot"), "搭船標籤是出口（ex-spot）");
  assert.equal(P.children.filter((x) => x.classList.contains("ex-spot")).length, 1, "只有搭船一個出口");
  assert.equal(c.out, gate, "亮框在搭船標籤");
  assert.ok(gate.classList.contains("ex-hi") && !back.classList.contains("ex-hi"), "返回鍵不亮");
  assert.deepEqual(bub.map(([b, t]) => [b === gate, t]), [[true, "要回去，點這裡"]], "泡泡指著搭船標籤");
});
function R0() { return load().R }

/* 11/22 Windows Claude 2 查 W62 時發現：門內頁頂端順風提示英文折兩行、壓到「掌門大廳」標籤；實測中文一行也會壓到（375 寬：提示 84～124、標籤 103～138）。
   改成標籤正下方置中的一行小徽章。這裡照實際尺寸算：375 寬手機上圖高＝375×1376/768 CSS px，標籤高約 35px（照實測），徽章頂端要在標籤底下 */
test("門內頁順風徽章：在掌門大廳標籤正下方、不重疊；中英文都短到一行放得下；樣式比 .jh-windnote 更具體", () => {
  const { R } = load();
  const H = R.JH_HALL.central, imgH = 375 * R.JH_HALL_H / R.JH_HALL_W, labelHalf = 35 / 2;
  const labelBottom = (H.spots.hall[1] / R.JH_HALL_H) * imgH + labelHalf;
  const css = JH.match(/\.jh-hall \.jh-hall-note\{[^}]*\}/);
  assert.ok(css, "要用 .jh-hall .jh-hall-note（比之後插入的 .jh-windnote 更具體）");
  const top = +css[0].match(/top:([\d.]+)%/)[1];
  assert.ok(top / 100 * imgH > labelBottom + 2, `徽章頂端 ${(top / 100 * imgH).toFixed(1)}px 要在標籤底 ${labelBottom.toFixed(1)}px 下面`);
  assert.match(css[0], /left:50%/); assert.match(css[0], /translateX\(-50%\)/); assert.match(css[0], /white-space:nowrap/);
  const m = JH.match(/n\.textContent=jhL\("([^"]+)","([^"]+)"\);n\.title=/);
  assert.ok(m, "找不到門內頁順風徽章的字");
  assert.ok([...m[1]].length <= 8 && m[2].length <= 16, "中文 ≤8 字、英文 ≤16 字：" + m[1] + " / " + m[2]);
});

test("〔原始碼〕11/22 開發者「怎麼會坐在桌子上」→ 中炮門一起改：掌門立繪裁掉下半截，裁切線對齊桌子後緣（原圖 y≈275）", () => {
  const JHs = rd("xiangqi-db/m/07z9b-jianghu.js");
  const m = JHs.match(/  central:\{v:"\d+",seat:\[(\d+),(\d+)\],w:(\d+),cut:([\d.]+),/);
  assert.ok(m, "中炮門要有 cut");
  const y = +m[2], w = +m[3], cut = +m[4], line = y - w * 512 / 380 * cut;   /* 立繪 380×512 */
  assert.ok(cut > 0.2 && cut < 0.45, "裁掉下半截：" + cut);
  /* 11/22 史學顧問 191「全圖無字」：掌門抱的大棋子字（中）從立繪高 0.58 起，裁切要藏住 */
  assert.ok(cut >= 0.42, "要藏住棋子上的字：" + cut);
  assert.ok(Math.abs(line - 275) <= 4, "裁切線要對齊桌子後緣：" + line.toFixed(1));
  assert.match(JHs, /\(H\.cut\?`;clip-path:inset\(0 0 \$\{H\.cut\*100\}% 0\);-webkit-clip-path:/, "JhHall 照 cut 裁");
});

test("11/24 開發者實機（劉伯溫）：前院不再寫「要先在秘境遇到他，才能切磋」——沒找到的不站前院，找到的直接能下", () => {
  assert.ok(!/要先在秘境遇到他，才能切磋/.test(HALL));
  const shown = loadMates().c.R.jhMatesShown("central", 3, new Date(2026, 10, 24));
  assert.ok(shown.every((m) => m.k !== "secret:liuji"), "沒找到：前院看不到");
  const met = loadMates({ jSecrets: () => ({ liuji: 1 }), jhWindHash: (s) => (s.includes("secret:") ? 0 : 999) }).c.R.jhMatesShown("central", 3, new Date(2026, 10, 24));
  assert.ok(met.some((m) => m.k === "secret:liuji" && m.can), "找到之後：前院站得到他，而且能切磋");
});

test("11/24 開發者：沒在秘境找到的秘境人物，前院清單、打聽提示、掌門小卡、修行頁的師友都不列；找到之後才列", () => {
  const { R, OSC } = load(), secs = Object.entries(OSC.NPC).filter(([k]) => k.startsWith("secret:"));
  assert.ok(secs.length > 0, "測試資料要有秘境人物");
  for (const s of OSC.SCH) {
    const L = R.jhHallMates(s.id);
    assert.ok(L.every((x) => !x.k.startsWith("secret:")), s.id + "：沒找到的秘境人物不列");
    assert.equal(L.length, Object.entries(OSC.NPC).filter(([k, x]) => x[0] === s.id && !k.startsWith("secret:")).length, s.id + "：驛站、園子的照列");
  }
  const [k0, x0] = secs[0], one = load({ [k0.slice(7)]: 1 }).R.jhHallMates(x0[0]);
  assert.ok(one.some((x) => x.k === k0), "找到過的那一位才列出來");
  assert.ok(!/這一派目前沒有登記的門人/.test(JH), "空清單不再說「沒有登記的門人」");
  assert.match(JH, /const mates=jhSheetMates\(sid\)/, "掌門小卡用 jhSheetMates（行為見下一項）"); assert.match(OS, /const FW=oscFellows\(sid\)/, "修行頁師友用 oscFellows（行為見下一項）");
});

/* #107 再審（iMac Claude 2）：門派的 who 欄位、掌門小卡、修行頁「師友」——用真的函式跑行為，不只比對原始碼 */
function loadWho(sec, opts = {}) {
  const fn = (src, name) => src.match(new RegExp("^function " + name + "\\(.*$", "m"))[0];
  const c = { jhT: (s) => s, oscT: (s) => s, jSecrets: opts.throws ? () => { throw new Error("壞掉") } : () => sec };
  vm.createContext(c);
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n" + ["oscNpcShown", "oscWhoShown", "oscFellows"].map((n) => fn(OS, n)).join("\n") + "\n" + fn(JH, "jhSheetMates"), c);
  return c;
}
test("#107 再審：門派 who 裡的秘境人物（常遇春、施耐庵、王冕…）沒找到就不印；總覽、師友、掌門小卡都照這個規則", () => {
  const none = loadWho({}), SCH = none.OSC.SCH, secName = (id) => none.OSC.NPC["secret:" + id][2];
  const sc = SCH.find((s) => s.who.split("、").includes(secName("changyuchun")));
  assert.ok(sc, "測試前提：有一派的 who 寫了常遇春");
  assert.ok(!none.oscWhoShown(sc.who).includes("常遇春"), "沒找到：who 裡的常遇春拿掉");
  assert.ok(none.oscWhoShown(sc.who).length >= 1, "其他人照列");
  assert.ok(loadWho({ changyuchun: 1 }).oscWhoShown(sc.who).includes("常遇春"), "找到過：照列");
  for (const s of SCH) {
    const F = none.oscFellows(s.id)[0];
    for (const [k, x] of Object.entries(none.OSC.NPC)) if (k.startsWith("secret:")) assert.ok(!F.includes(x[2]), s.id + " 師友不列沒找到的 " + x[2]);
    assert.ok(!/，以及。|，以及$|以及。/.test(F), s.id + " 沒有其他門人時不留「以及」：" + F);
    for (const n of none.jhSheetMates(s.id)) assert.ok(!Object.entries(none.OSC.NPC).some(([k, x]) => k.startsWith("secret:") && x[2] === n), s.id + " 掌門小卡不列沒找到的秘境人物：" + n);
  }
  const all = {}; for (const k of Object.keys(none.OSC.NPC)) if (k.startsWith("secret:")) all[k.slice(7)] = 1;
  const met = loadWho(all); assert.ok(SCH.some((s) => met.jhSheetMates(s.id).length > none.jhSheetMates(s.id).length), "全部找到過時掌門小卡會多出秘境人物");
  assert.match(OS, /\$\{oscWhoShown\(s\.who\)\.length\?/, "門派總覽「代表棋友」用 oscWhoShown");
});
test("#107 再審：oscNpcShown 讀存檔出錯時當作沒找到（不列），不會把秘境人物全放出來", () => {
  const c = loadWho({}, { throws: true }), k = Object.keys(c.OSC.NPC).find((x) => x.startsWith("secret:"));
  assert.equal(c.oscNpcShown(k), false); assert.equal(c.oscNpcShown("inn:tea"), true, "驛站、園子的照常");
});
