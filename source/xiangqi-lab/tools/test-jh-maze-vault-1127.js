/* W172（11/27 第一支中炮、飛相；11/28 第二支起馬、仙人指路）漕運鑰匙開地底迷宮的隱藏密室（m/07z9m-vault.js；漕運 m/07z9b-jianghu.js 的 jhCanalMark）：
   用 vm 跑真的程式（m.html 裡全部 07z9m-*，加上漕運那一段），存檔、修為用假的記下呼叫。
   規則：漕船停在那一州時解題拿鑰匙（只發給第二層有密室的派、只發一次）；N＝銅鎖門，有鑰匙才開、開過永久開；p＝殘譜架，第一次讀給修為；
   鑰匙只開密室：石門、水窪、各派機關照舊。
   「改壞驗證」：同一組檢查拿去跑改壞的程式（沒鑰匙也開、重建後門又關上、鑰匙重複發、鑰匙順便開石門、開密室順便算踩過踏板、重建時連石門一起拆、開過密室後每走一步才偷偷算踩過踏板），一定要抓得到。
   四派（漕船停的四州）：淮安＝中炮、泗州＝飛相、徐州＝起馬、揚州＝仙人指路；screen 有第二層但不在漕運航線上，當「沒有密室」的對照。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), M = path.join(ROOT, "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const HTML = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8");
const FILES = [...HTML.matchAll(/^\/\/#include m\/(07z9m-[\w-]+\.js)$/gm)].map((m) => m[1]);
const JH = rd("07z9b-jianghu.js"), OS = rd("07z9-school.js"), CANAL = JH.slice(JH.indexOf("/* ---------- W46 十州漕運殘局"));
const fnLine = (src, head) => { const l = src.split("\n").find((x) => x.startsWith(head)); assert.ok(l, "找不到 " + head); return l };
const DAY = "2026-11-27";
const VAULTS = [["central", "淮安", "中炮門"], ["elephant", "泗州", "飛相門"], ["horse", "徐州", "起馬門"], ["pawn", "揚州", "仙人指路門"]];
const VSIDS = VAULTS.map((v) => v[0]);

function load(patch = {}, opt = {}) {
  const mem = {}, calls = { xp: [] };
  const c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: (n, why, key) => calls.xp.push([n, key]), xqFlag: () => true, vibrate: () => {}, jhGo: () => {}, jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: () => ({ style: {}, dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {} }), head: { append() {} }, body: { append() {} } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
    cjDay: () => DAY, toast: () => {}, closeSheet() {}, sheet: () => {}, cjXMode: (id) => ({ orig: id }), Jianghu: () => ({}), JH_W: 3024, JH_H: 1340,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false }); c.location = { href: "http://x/index.html#/", hash: "#/" };
  vm.createContext(c);
  for (const f of FILES) vm.runInContext(patch[f] ? patch[f](rd(f)) : rd(f), c);
  if (opt.canal) vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n"
    + "const jhSch=id=>OSC.SCH.find(s=>s.id===id);\n" + fnLine(JH, "function jhWindHash(") + "\n" + (patch.canal ? patch.canal(CANAL) : CANAL)
    + ";this.R={jhCanalMark,jhCanalXM,jhCanalGet}", c);
  return { c, mem, calls, V: () => (mem.jhMzKey ? JSON.parse(mem.jhMzKey) : {}) };
}
/* 開一局第二層，玩家站在密室門左邊（7,2），清掉守衛 */
function atDoor(c, sid) {
  const S = c.jhMzNew(c.jhMzLvN(sid, 2)); S.guards = []; S.player = { x: 7, y: 2, face: 1 }; return S;
}
const cell = (S, x, y) => (S.grid[y] || [])[x];

/* 各項檢查寫成函式：改壞驗證拿同一組去跑 */
function chkLocked(c, sid = "central", port = "淮安") {   /* 沒鑰匙：擋住、說明州名、不動、不算回合、格子還是 N */
  const S = atDoor(c, sid), t0 = S.turn, r = c.jhMzStep(S, 1, 0);
  return r.ev === "bump" && r.msg[0].includes(port) && S.player.x === 7 && S.turn === t0 && cell(S, 8, 2) === "N";
}
function chkGiveOnce(c, V) {   /* 只發給有密室的派、只發一次 */
  const a = c.jhMzVaultGive("central"), b = c.jhMzVaultGive("central");
  return !!a && a.zh === "中炮門" && b === null && !!V().central.got && c.jhMzVaultGive("screen") === null && c.jhMzVaultGive("nosuch") === null;
}
function chkOpenStays(c, sid = "central", other = "elephant") {   /* 有鑰匙：打開、走得進去；重建、新開局都還開著；另一派沒拿鑰匙的照舊是門 */
  c.jhMzVaultGive(sid); const S = atDoor(c, sid), r = c.jhMzStep(S, 1, 0);
  if (r.ev !== "secret" || cell(S, 8, 2) !== ".") return false;
  c.jhMzStep(S, 1, 0); if (S.player.x !== 8) return false;
  c.jhMzReset(S, true); if (cell(S, 8, 2) !== ".") return false;
  const S2 = c.jhMzNew(c.jhMzLvN(sid, 2)); return cell(S2, 8, 2) === "." && cell(c.jhMzNew(c.jhMzLvN(other, 2)), 8, 2) === "N";
}
function chkNoBypass(c, sid = "central") {   /* 有鑰匙、密室開了：踏板、石門都沒被動到；重建格子（新開局、被拖回入口）、再新開一局，石門都還在原位、沒踩踏板碰到照樣打不開 */
  c.jhMzVaultGive(sid); const S = atDoor(c, sid); if (c.jhMzStep(S, 1, 0).ev !== "secret") return false;
  if (S.plate !== false || S.doorOpen !== false) return false;
  const findD = (X) => { for (let y = 0; y < X.H; y++) for (let x = 0; x < X.W; x++) if (cell(X, x, y) === "D") return { x, y }; return null };
  const d0 = findD(S); if (!d0) return false;
  const knock = (X) => { const d = findD(X); if (!d || d.x !== d0.x || d.y !== d0.y) return false; X.guards = []; X.player = { x: d.x, y: d.y + 1, face: 1 }; return c.jhMzStep(X, 0, -1).ev === "locked" };
  if (!knock(S)) return false;
  c.jhMzReset(S, true); if (S.plate || S.doorOpen || !knock(S)) return false;
  c.jhMzReset(S, false); if (S.plate || S.doorOpen || !knock(S)) return false;
  const S2 = c.jhMzNew(c.jhMzLvN(sid, 2)); return !S2.plate && !S2.doorOpen && knock(S2);
}
function chkWalkAfter(c, sid = "central") {   /* W217：開過密室後在石門後面正常走幾步（進密室、出來、往回走、往上走），每一步之後踏板、石門都沒被動到；最後走到石門前碰到照樣打不開 */
  c.jhMzVaultGive(sid); const S = atDoor(c, sid); if (c.jhMzStep(S, 1, 0).ev !== "secret") return false;
  const steps = [[1, 0], [-1, 0], [-1, 0], [-1, 0], [0, -1], [0, 1], [1, 0]]; let moved = 0;
  for (const [dx, dy] of steps) { const x0 = S.player.x, y0 = S.player.y; c.jhMzStep(S, dx, dy); if (S.player.x !== x0 || S.player.y !== y0) moved++; if (S.plate || S.doorOpen) return false }
  if (moved < 5) return false;   /* 要真的走動，不然等於沒測 */
  let d = null; for (let y = 0; y < S.H && !d; y++) for (let x = 0; x < S.W; x++) if (cell(S, x, y) === "D") { d = { x, y }; break }
  if (!d) return false; S.guards = []; S.player = { x: d.x, y: d.y + 1, face: 1 }; return c.jhMzStep(S, 0, -1).ev === "locked";
}

test("登記：07z9m-vault.js 排在 m.html 全部迷宮檔最後；只包漕船停靠四派（中炮、飛相、起馬、仙人指路）的第二層；N 擋路擋視線、p 擋路不擋視線；3D、平面畫法都有", () => {
  assert.equal(FILES[FILES.length - 1], "07z9m-vault.js");
  { const k = load(); assert.equal(k.c.jhMzLvN("screen", 2).layer, 2, "對照組 screen 要有第二層"); assert.notEqual(k.c.jhMzLvN("screen", 2)._vault, 1) } assert.ok(FILES.indexOf("07z9m-fall.js") < FILES.indexOf("07z9m-vault.js"));
  const { c } = load(), G = (n) => vm.runInContext(n, c);   /* const 宣告的全域，vm 外拿不到，要在裡面取 */
  for (const ch of "Np") { assert.equal(typeof G("JH_MZ_OBJ")[ch], "function", "3D " + ch); assert.equal(typeof G("JH_MZ_TILE")[ch], "function", "平面 " + ch) }
  assert.deepEqual(Object.keys(G("JH_MZ_VAULT")).sort(), [...VSIDS].sort(), "密室資料剛好四派");
  for (const sid of VSIDS) {
    const L = c.jhMzLvN(sid, 2); assert.equal(L._vault, 1, sid); assert.ok(L.solid.includes("N") && L.solid.includes("p"), sid + " solid");
    assert.ok(L.opaque.includes("N") && !L.opaque.includes("p"), sid + " opaque"); assert.equal(L.map[2], "#####...Np#####", sid + " 地圖");
  }
  for (const sid of Object.keys(G("JH_MZ_LV"))) for (let n = 1; n <= 3; n++) {
    const L = c.jhMzLvN(sid, n); if (!L || L.layer !== n) continue;
    if (!(VSIDS.includes(sid) && n === 2)) { assert.notEqual(L._vault, 1, sid + " 第 " + n + " 層不該被包"); assert.ok(!L.map.join("").match(/[Np]/), sid + " 第 " + n + " 層地圖不該有 N、p") }
  }
});

test("沒鑰匙：朝銅鎖門走只說漕船停在哪一州能拿鑰匙，不開門、不動、不算回合", () => {
  for (const [sid, port] of VAULTS) assert.ok(chkLocked(load().c, sid, port), sid + " 沒鑰匙要擋、說" + port);
});

test("發鑰匙：只發給第二層有密室的派、只發一次；密室開過也不再發", () => {
  const { c, V } = load(); assert.ok(chkGiveOnce(c, V));
  const k2 = load(); k2.c.jhMzVaultGive("elephant"); const S = atDoor(k2.c, "elephant"); k2.c.jhMzStep(S, 1, 0);
  assert.ok(k2.V().elephant.open); const m = JSON.parse(k2.mem.jhMzKey); delete m.elephant.got; k2.mem.jhMzKey = JSON.stringify(m);
  assert.equal(k2.c.jhMzVaultGive("elephant"), null, "開過的密室不再發鑰匙");
});

test("有鑰匙：打開銅鎖門走得進去；重建格子（被拖回入口、重新開局）門還開著；沒開過的派照舊是門", () => {
  for (const sid of VSIDS) assert.ok(chkOpenStays(load().c, sid, sid === "central" ? "elephant" : "central"), sid);
});

test("殘譜架：第一次讀跳卡片、給修為一次（vault:<派>）；之後照樣讀得到、不再給", () => {
  const { c, calls } = load(); c.jhMzVaultGive("central"); const S = atDoor(c, "central"); c.jhMzStep(S, 1, 0); c.jhMzStep(S, 1, 0);
  const r1 = c.jhMzStep(S, 1, 0); assert.equal(r1.ev, "lore"); assert.equal(r1.first, true); assert.match(r1.card.title[0], /殘譜/); assert.ok(r1.card.body[0].length > 40);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.xp)), [[20, "vault:central"]]);
  const r2 = c.jhMzStep(S, 1, 0); assert.equal(r2.ev, "lore"); assert.equal(r2.first, false); assert.equal(calls.xp.length, 1, "第二次不再給修為");
  const seen = new Set();
  for (const [sid] of VAULTS) {   /* 四派各有自己的殘譜（標題不重複、中英都有），修為去重鍵帶派名 */
    const k = load(); k.c.jhMzVaultGive(sid); const X = atDoor(k.c, sid); k.c.jhMzStep(X, 1, 0); k.c.jhMzStep(X, 1, 0); const r = k.c.jhMzStep(X, 1, 0);
    assert.equal(r.ev, "lore", sid); assert.ok(r.card.body[0].length > 40 && r.card.body[1].length > 40, sid + " 殘譜中英都要有");
    assert.ok(!seen.has(r.card.title[0]), sid + " 殘譜標題重複"); seen.add(r.card.title[0]);
    assert.deepEqual(JSON.parse(JSON.stringify(k.calls.xp)), [[20, "vault:" + sid]], sid);
  }
});

test("鑰匙只開密室：開密室不動踏板和石門；開過以後再正常走幾步也不動（W217）；重建、新開局後石門還在、沒踩踏板照樣打不開；水窪等該派機關的結果跟沒鑰匙時一樣", () => {
  for (const sid of VSIDS) { assert.ok(chkNoBypass(load().c, sid), sid + " 開密室"); assert.ok(chkWalkAfter(load().c, sid), sid + " 開過再走幾步") }
  /* 飛相第二層的淤泥 m：有鑰匙、沒鑰匙走同一步，結果要一樣 */
  const run = (withKey) => { const { c } = load(); if (withKey) c.jhMzVaultGive("elephant"); const S = c.jhMzNew(c.jhMzLvN("elephant", 2)); S.guards = [];
    let m = null; for (let y = 0; y < S.H && !m; y++) for (let x = 1; x < S.W; x++) if (S.grid[y][x] === "m" && S.grid[y][x - 1] === ".") { m = { x, y }; break }
    S.player = { x: m.x - 1, y: m.y, face: 1 }; const r = c.jhMzStep(S, 1, 0); return JSON.stringify([r.ev, r.stop, S.player.x, S.player.y]) };
  assert.equal(run(true), run(false));
});

test("漕運：解開那一班就發那一派的密室鑰匙並在結果寫出來（四州都有）；今天已經解過的再解也拿得到；沒發鑰匙時回傳值跟原本一樣", () => {
  const { c, R, V } = (() => { const k = load({}, { canal: true }); return { ...k, R: k.c.R } })();
  const a = JSON.parse(JSON.stringify(R.jhCanalMark("central", DAY, {})));
  assert.equal(a.first, true); assert.deepEqual(a.key, { zh: "中炮門", en: "Central Cannon" }); assert.ok(V().central.got);
  assert.deepEqual(JSON.parse(JSON.stringify(R.jhCanalMark("central", DAY, {}))), { first: false }, "同一天再解：已經拿過，不再帶 key");
  assert.deepEqual(JSON.parse(JSON.stringify(R.jhCanalMark("horse", DAY, {}))), { first: true, key: { zh: "起馬門", en: "Horse Opening" } }, "徐州：起馬門的鑰匙");
  assert.deepEqual(JSON.parse(JSON.stringify(R.jhCanalMark("pawn", DAY, {}))), { first: true, key: { zh: "仙人指路門", en: "Immortal Points the Way" } }, "揚州：仙人指路門的鑰匙");
  assert.ok(V().horse.got && V().pawn.got);
  assert.deepEqual(JSON.parse(JSON.stringify(R.jhCanalMark("central", "2026-11-01", {}))), { first: false }, "不是今天");
  /* 今天已經解過（功能上線前），再解一次也發 */
  const k2 = load({}, { canal: true }); k2.mem.jhCanal = JSON.stringify({ d: DAY, s: { elephant: { t: 1, p: 0 } }, pick: {} });
  const b = JSON.parse(JSON.stringify(k2.c.R.jhCanalMark("elephant", DAY, {}))); assert.equal(b.first, false); assert.equal(b.key.zh, "飛相門");
  /* 結果畫面：有 key 才多一句 */
  const k3 = load({}, { canal: true }); k3.mem.jhCanal = JSON.stringify({ d: DAY, s: {}, pick: { [DAY + "/central"]: "p1" } });
  const X = k3.c.R.jhCanalXM("central", DAY, "p1"); assert.equal(typeof X.done, "function");
  assert.match(X.done({ first: true, key: { zh: "中炮門", en: "Central Cannon" } }), /密室/); assert.doesNotMatch(X.done({ first: true }), /密室/);
});

test("改壞驗證：沒鑰匙也開、重建後門又關上、鑰匙重複發、鑰匙順便開石門、開密室順便算踩過踏板、重建時連石門一起拆、開過密室後每走一步才算踩過踏板，上面的檢查都要抓得到", () => {
  const V = rd("07z9m-vault.js"), P = (from, to) => ({ "07z9m-vault.js": (s) => { assert.ok(s.includes(from), "改壞點不存在：" + from); return s.replace(from, to) } });
  { const k = load(P("if (!m.got && !m.open) return {", "if (false) return {")); assert.equal(chkLocked(k.c), false, "沒鑰匙也開") }
  { const k = load(P("jhMzReset = function (S, full) {", "jhMzResetX = function (S, full) {")); assert.equal(chkOpenStays(k.c), false, "重建後門又關上") }
  { const k = load(P("if (m.got || m.open) return null;", "")); assert.equal(chkGiveOnce(k.c, k.V), false, "鑰匙重複發") }
  /* 鑰匙順便開石門：密室模組自己處理 D（但石門的判斷在 onStep 之前，所以改壞版應該照樣被擋——要證明這條路走不到，改成在 jhMzStep 前面攔） */
  { const k = load({ "07z9m-maze.js": (s) => s.replace('if(c==="D")return S.plate?{ev:"door"}:{ev:"locked"};', 'if(c==="D"&&!(typeof jhMzVaultOf==="function"&&jhMzVaultOf("central").got))return S.plate?{ev:"door"}:{ev:"locked"};if(c==="D")return{ev:"door"};') });
    assert.equal(chkNoBypass(k.c), false, "鑰匙順便開石門") }
  { const k = load(P('S.grid[ny][nx] = ".";', 'S.grid[ny][nx] = "."; S.plate = true;')); assert.equal(chkNoBypass(k.c), false, "開密室時順便算成踩過踏板") }
  { const k = load(P('if (S.grid[y][x] === "N") S.grid[y][x] = ".";', 'if (S.grid[y][x] === "N" || S.grid[y][x] === "D") S.grid[y][x] = ".";')); assert.equal(chkNoBypass(k.c), false, "重建格子時連石門一起拆掉") }
  { const k = load(P("  return typeof prev === \"function\" ? prev(S, dx, dy, c) : null;", "  if (jhMzVaultOf(S.lv.sid).open) S.plate = true; return typeof prev === \"function\" ? prev(S, dx, dy, c) : null;"));
    assert.equal(chkNoBypass(k.c), true, "延後版：開門那一下沒動踏板，舊的檢查抓不到（W217 的起因）"); assert.equal(chkWalkAfter(k.c), false, "開過密室後每走一步才偷偷算踩過踏板") }
  { const k = load(P("  return typeof prev === \"function\" ? prev(S, dx, dy, c) : null;", "  if (jhMzVaultOf(S.lv.sid).open && S.player.x < 7) S.doorOpen = true; return typeof prev === \"function\" ? prev(S, dx, dy, c) : null;"));
    assert.equal(chkWalkAfter(k.c), false, "開過密室後走離密室才偷偷打開石門") }
  assert.ok(V.includes("jhMzReset = function (S, full)"));
});

test("〔原始碼〕07z9m-vault.js：LF、沒有控制字元、沒有 // 註解；全域名稱都有 JH_MZ_VAULT／jhMzVault 前綴；存檔清單加了 m_jhMzKey", () => {
  const V = rd("07z9m-vault.js");
  assert.doesNotMatch(V, /\r/); assert.doesNotMatch(V, /[\x00-\x08\x0b\x0c\x0e-\x1f]/); assert.ok(!V.includes("//"), "m/*.js 串成同一個 script，不准用 // 註解");
  const names = [...V.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]).concat([...V.matchAll(/^const [^;\n]*?,\s*([A-Z_][A-Z0-9_]*)\s*=/gm)].map((m) => m[1]));
  for (const n of names) assert.match(n, /^(JH_MZ_VAULT|jhMzVault)/, "全域名稱要有前綴：" + n);
  assert.match(rd("05b-save.js"), /^JOURNEY_KEYS\.push\("m_jhMzKey"\);/m);
});
