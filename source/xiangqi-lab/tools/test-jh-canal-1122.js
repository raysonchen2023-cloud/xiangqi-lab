// W46 十州漕運殘局（開發者 11/22「門派任務版」範圍）：m/07z9b-jianghu.js 檔尾 JH_CANAL 那一段。
//   漕船每個時辰沿運河換一州停靠（徐州→泗州→淮安→揚州）；點船挑這一天這一州的一～三步殺（帶該派殺法標籤），進殘局頁的外掛模式（#/canju/cy/…）。
//   這裡用 vm 跑真的踢館程式和題庫（data/canju/canju-set.json），存檔、修為、殘局頁用假的記下呼叫。
// 用法：node --test xiangqi-lab/tools/test-jh-canal-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const JH = rd("xiangqi-db/m/07z9b-jianghu.js"), OS = rd("xiangqi-db/m/07z9-school.js"), SAVE = rd("xiangqi-db/m/05b-save.js");
const CANAL = JH.slice(JH.indexOf("/* ---------- W46 十州漕運殘局"));
const J = (x) => JSON.parse(JSON.stringify(x));   /* vm 裡做出來的陣列跟這邊不是同一個 realm */
const SETP = [path.join(ROOT, "xiangqi-lab", "site", "data", "canju", "canju-set.json"), path.join(ROOT, "..", "data", "canju", "canju-set.json")].find((p) => fs.existsSync(p));
const SET = SETP ? JSON.parse(fs.readFileSync(SETP, "utf8")) : null;
const COREP = [path.join(ROOT, "xiangqi-lab", "site", "core.js"), path.join(ROOT, "..", "core.js")].find((p) => fs.existsSync(p));
const CORE = COREP ? require(COREP) : null;
const fnLine = (src, head) => { const l = src.split("\n").find((x) => x.startsWith(head)); assert.ok(l, "找不到 " + head); return l };

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { xp: [], toast: [], sheet: [], x0: [] };
  const c = {
    window: o.noCore ? {} : { XQCore: CORE }, document: undefined, jhL: (zh) => zh, esc: (s) => String(s), JH_W: 3024, JH_H: 1340,
    store: { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } },
    toast: (s) => calls.toast.push(s), setTimeout: (f) => f(), closeSheet() {}, vibrate() {},
    addXP: (n, why, key) => calls.xp.push([n, key]), cjDay: () => o.day || "2026-11-22",
    cjData: async () => { if (!SET) throw new Error("no set"); return SET },
    sheet: (t, f) => calls.sheet.push(t), cjXMode: (id) => { calls.x0.push(id); return { orig: id } }, Jianghu: () => ({}),
  };
  vm.createContext(c);
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n"
    + "const jhSch=id=>OSC.SCH.find(s=>s.id===id);\n" + fnLine(JH, "function jhWindHash(") + "\n" + CANAL
    + ";this.R={JH_CANAL,JH_CANAL_XP,jhShichen,jhCanalStop,jhCanalMated,jhCanalPool,jhCanalPick,jhCanalGet,jhCanalXM,jhCanalMark,jhCanalOpen,cjXMode}", c);
  return { c, R: c.R, mem, calls };
}

test("運河四州由北往南：徐州（起馬）→泗州（飛相）→淮安（中炮）→揚州（仙人指路）；停靠點在長卷圖內", () => {
  const { R, c } = load();
  assert.deepEqual(J(R.JH_CANAL.map((s) => s.zh + ":" + s.sid)), ["徐州:horse", "泗州:elephant", "淮安:central", "揚州:pawn"]);
  for (const s of R.JH_CANAL) {
    assert.ok(c.OSC.SCH.some((x) => x.id === s.sid), s.sid);
    assert.ok(s.at[0] > 0 && s.at[0] < 3024 && s.at[1] > 0 && s.at[1] < 1340, s.zh + " " + s.at);
    assert.ok(s.th.length >= 1);
  }
});

test("時辰：子時 23～1 點＝0、丑時＝1…；每個時辰換一州、四個時辰繞一圈", () => {
  const { R } = load();
  const at = (h, m = 0) => new Date(2026, 10, 22, h, m);
  assert.equal(R.jhShichen(at(23)), 0); assert.equal(R.jhShichen(at(0, 59)), 0); assert.equal(R.jhShichen(at(1)), 1);
  assert.equal(R.jhShichen(at(11)), 6); assert.equal(R.jhShichen(at(22, 59)), 11);
  const seq = [23, 1, 3, 5, 7, 9, 11].map((h) => R.jhCanalStop(at(h)).sid);
  assert.deepEqual(J(seq), ["horse", "elephant", "central", "pawn", "horse", "elephant", "central"], "子時徐州、丑時泗州、寅時淮安、卯時揚州、辰時又回徐州");
  assert.equal(R.jhCanalStop(at(1)).sid, R.jhCanalStop(at(2, 59)).sid, "同一個時辰內不換");
});

test("題庫（真的 canju-set.json）：每一州都有題；全是殺棋、一～三步殺、帶這一州的殺法標籤", (t) => {
  if (!SET) return t.skip("沒有 data/canju/canju-set.json");
  const { R } = load();
  for (const st of R.JH_CANAL) {
    const L = R.jhCanalPool(SET.items, st);
    assert.ok(L.length >= 5, st.zh + " 題數太少：" + L.length);
    for (const x of L) {
      assert.ok(x.n >= 1 && x.n <= 3, x.id + " 步數 " + x.n);
      assert.ok(x.th.includes("殺棋"), x.id);
      assert.ok(x.th.some((t2) => st.th.includes(t2)), x.id + " 標籤 " + x.th);
      assert.equal(R.jhCanalMated(x), true, x.id + " 照主變走完要真的將死");
    }
  }
});

test("Pikafish 盤整 P1（11/24）：標「殺棋」但主變走完沒將死的題不收（gm2010-p491R1AKA3r 是保勝題）；沒有規則核心時題庫是空的，不能當成全收", (t) => {
  if (!SET || !CORE) return t.skip("沒有 canju-set.json 或 core.js");
  const { R } = load();
  const x = SET.items.find((y) => y.id === "gm2010-p491R1AKA3r");
  assert.ok(x && x.th.includes("殺棋") && x.th.includes("臥槽馬") && x.n === 1, "題目還在、標籤還是殺棋（不然這項測不到東西）");
  assert.equal(R.jhCanalMated(x), false, "傌八進七之後黑方還有合法著");
  for (const st of R.JH_CANAL) assert.ok(!R.jhCanalPool(SET.items, st).some((y) => y.id === x.id), st.zh + " 不能收 gm2010");
  const fake = Object.assign({}, SET.items.find((y) => R.jhCanalMated(y) && y.n === 1));
  assert.equal(R.jhCanalMated(Object.assign({}, fake, { line: [] })), false, "主變長度不對");
  assert.equal(R.jhCanalMated(Object.assign({}, fake, { line: ["a0a9"] })), false, "主變不合法");
  const L0 = load({ noCore: true });
  for (const st of L0.R.JH_CANAL) assert.equal(L0.R.jhCanalPool(SET.items, st).length, 0, "沒有規則核心：一題都不收");
});

test("挑題：同一天同一州固定一題；換一天會換題（看 30 天至少換過）", (t) => {
  if (!SET) return t.skip("沒有 data/canju/canju-set.json");
  const { R } = load();
  for (const st of R.JH_CANAL) {
    assert.equal(R.jhCanalPick(SET.items, st, "2026-11-22").id, R.jhCanalPick(SET.items, st, "2026-11-22").id);
    const ids = new Set(Array.from({ length: 30 }, (_, i) => R.jhCanalPick(SET.items, st, "2026-12-" + String(i + 1).padStart(2, "0")).id));
    assert.ok(ids.size > 3, st.zh + " 30 天只出 " + ids.size + " 題");
  }
});

test("點漕船：挑好這一班的題記進存檔、開小卡；題庫載不到就提示", async (t) => {
  if (!SET) return t.skip("沒有 data/canju/canju-set.json");
  const { R, mem, calls } = load();
  await R.jhCanalOpen();
  const st = R.jhCanalStop(), k = "2026-11-22/" + st.sid;
  assert.equal(mem.jhCanal.d, "2026-11-22");
  assert.equal(mem.jhCanal.pick[k], R.jhCanalPick(SET.items, st, "2026-11-22").id);
  assert.equal(calls.sheet.length, 1);
  const bad = load(); bad.c.cjData = async () => { throw new Error("x") };
  await bad.R.jhCanalOpen();
  assert.match(bad.calls.toast[0], /題庫載入失敗/);
});

test("殘局頁外掛模式：題號要跟這一班挑好的一樣、日期要是今天；別的網址交給原本的 cjXMode", () => {
  const { R, calls } = load({ store: { jhCanal: { d: "2026-11-22", s: {}, pick: { "2026-11-22/central": "jc100" } } } });
  const ok = R.cjXMode("cy/central/2026-11-22/jc100");
  assert.equal(ok.id, "jc100"); assert.equal(ok.back(), "#/jianghu"); assert.equal(ok.rk, "cjRunCy"); assert.ok(!ok.err);
  assert.match(R.cjXMode("cy/central/2026-11-22/jc999").err, /對不上/);
  assert.match(R.cjXMode("cy/central/2026-11-21/jc100").err, /開走了/);
  assert.match(R.cjXMode("cy/nowhere/2026-11-22/jc100").err, /找不到/);
  assert.deepEqual(J(R.cjXMode("r/tang/3")), { orig: "r/tang/3" }); assert.deepEqual(J(calls.x0), ["r/tang/3"]);
});

test("解開：每天每一州第一次不看答案解開修為 +15，只給一次；換一天重新算；換日讀存檔清掉前一天", () => {
  const { R, mem, calls } = load({ store: { jhCanal: { d: "2026-11-22", s: {}, pick: { "2026-11-22/pawn": "jc1" } } } });
  const XM = R.jhCanalXM("pawn", "2026-11-22", "jc1");
  assert.deepEqual(J(XM.mark({ perfect: true })), { first: true });
  assert.deepEqual(J(calls.xp), [[15, "cy:2026-11-22:pawn"]]);
  assert.equal(mem.jhCanal.s.pawn.p, 1);
  assert.match(XM.done({ first: true }), /漕船脫困！修為 \+15/);
  assert.deepEqual(J(R.jhCanalXM("pawn", "2026-11-22", "jc1").mark({ perfect: false })), { first: false }, "同一天再解不給");
  assert.equal(calls.xp.length, 1);
  assert.equal(R.jhCanalXM("pawn", "2026-11-22", "jc1").ans.includes("已經解開"), true, "解過的再看答案提示不一樣");
  const nx = load({ day: "2026-11-23", store: { jhCanal: mem.jhCanal } });
  assert.deepEqual(J(nx.R.jhCanalGet("2026-11-23")), { d: "2026-11-23", s: {}, pick: {} }, "換日清掉");
});

test("〔原始碼〕掛接：存檔鍵跟旅程走；殘局頁與長卷只包一次；殘局頁路由會把 cy/… 整段交給 CanjuPlay", () => {
  assert.match(SAVE, /^JOURNEY_KEYS\.push\("m_jhCanal"\);/m);
  assert.ok(SAVE.indexOf('JOURNEY_KEYS.push("m_jhCanal")') < SAVE.indexOf("const JK=new Set(JOURNEY_KEYS)"));
  assert.match(JH, /cjXMode\.jhCanal=1/); assert.match(JH, /Jianghu\.jhCanal=1/);
  assert.match(rd("xiangqi-db/m/02-shell.js"), /if\(p\[0\]==="canju"\)return screen=p\[1\]\?CanjuPlay\(v,decodeURIComponent\(p\.slice\(1\)\.join\("\/"\)\)\)/);
  assert.match(rd("xiangqi-db/m/07c-canju.js"), /typeof cjXMode==="function"\?cjXMode\(id\):null/, "殘局頁照舊從 cjXMode 拿外掛模式");
});

test("〔混合〕漕船圖（開發者 11/22「這船太醜了 找gemini畫圖」）：原檔 webp、大小合理；讀不到退回程式畫的 SVG", (t) => {
  /* 圖只放 CDN（.gitignore 的 /data/**），公開倉庫沒有：開發者電腦上驗原檔 */
  const p = [path.join(ROOT, "xiangqi-db", "art", "canal", "barge.webp"), path.join(ROOT, "xiangqi-lab", "site", "data", "canal", "barge.webp"), path.join(ROOT, "..", "data", "canal", "barge.webp")].find((x) => fs.existsSync(x));
  assert.match(JH, /const JH_CANAL_IMG="data\/canal\/barge\.webp";/);
  assert.match(JH, /onerror="this\.outerHTML=jhCanalSvg\(\)"/);
  assert.match(JH, /b\.className="jh-canal";b\.innerHTML=jhCanalImg\(\);/);
  if (!p) return t.skip("沒有 xiangqi-db/art/canal/barge.webp（美術原檔只在開發者電腦，公開副本沒有）");
  const b = fs.readFileSync(p);
  assert.equal(b.toString("ascii", 0, 4), "RIFF"); assert.equal(b.toString("ascii", 8, 12), "WEBP");
  assert.ok(b.length > 5e3 && b.length < 80e3, "約 5～80 KB：" + b.length);
});

test("〔原始碼〕11/22 開發者實機截圖「這船重疊了，而且很像飄起來」：停靠點避開長卷上原有的船與岸；船貼著水面", () => {
  const S = JH.slice(JH.indexOf("const JH_CANAL=["), JH.indexOf("const JH_CANAL_XP"));
  const at = Object.fromEntries([...S.matchAll(/sid:"(\w+)"[^}]*?at:\[(\d+),(\d+)\]/g)].map((m) => [m[1], [+m[2], +m[3]]]));
  assert.deepEqual(Object.keys(at).sort(), ["central", "elephant", "horse", "pawn"]);
  /* 舊座標都壓到長卷上的東西（徐州壓在原本畫的小船、淮安壓到碼頭與停著的船、泗州碰到棧橋與石橋、揚州碰到松樹），不能改回去 */
  const OLD = { horse: [200, 720], elephant: [528, 712], central: [900, 552], pawn: [1580, 650] };
  for (const k in OLD) assert.notDeepEqual(at[k], OLD[k], k + " 不能回到舊座標");
  /* 徐州：漕船要整艘蓋住長卷原本那艘小船（原圖約 x165～230、y730～757）；船身＝錨點左右 53、上 19～下 22 像素 */
  const [hx, hy] = at.horse;
  assert.ok(hx - 53 <= 165 && hx + 53 >= 230 && hy - 19 <= 730 && hy + 22 >= 757, "徐州漕船要蓋住原本的小船：" + at.horse);
  /* 不再像浮起來：陰影不往下偏、船底一截淡出（吃水）、船底有水紋、晃動不超過 2px */
  assert.match(JH, /\.jh-canal\{[^}]*filter:drop-shadow\(0 0 1px /, "陰影不往下偏");
  assert.doesNotMatch(JH, /\.jh-canal\{[^}]*drop-shadow\(0 [1-9]/);
  assert.match(JH, /\.jh-canal \.jh-canal-img,\.jh-canal \.jh-canal-svg\{[^}]*mask-image:linear-gradient\(to bottom/, "船底吃水");
  assert.match(JH, /\.jh-canal::after\{content:""/, "船底水紋");
  const bob = (JH.match(/@keyframes jhCanalBob\{[^@\n]*?translate:0 -([\d.]+)px/) || [])[1];
  assert.ok(bob && +bob <= 2, "晃動不超過 2px：" + bob);
});
