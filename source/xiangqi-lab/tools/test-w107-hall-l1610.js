// W107-L 第 5 批：江湖會館十派門內頁（07z9b JhHall＋07z9l 八派＋07z9c 屏風馬門＋07z9m 迷宮入口）iPad 橫向專用橫式圖。
// 做法是「整套換」：jhHallUse(wide) 把 JH_HALL_W／H、JH_MATE_W、JH_HALL[派]、JH_HALLS8[派] 的 spots 與 play.at、JH_MZ_LV[派].hall.at、JH_HALL_WALK[派] 換成橫式或直式那一套。
// 檢查：十派都登記；量好的點照 json 寫死；jhHallUse 換過去、換回來每一欄都對（直式原值不被弄丟）；JhHall 開頁照 scwPre 選、轉向整頁重畫。
// 用法 node --test xiangqi-lab/tools/test-w107-hall-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), B = M("m/07z9b-jianghu.js"), L8 = M("m/07z9l-halls.js"), SC = M("m/07z9c-screen.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const J = x => JSON.parse(JSON.stringify(x));
const SIDS = ["central", "screen", "cross_palace", "horse", "advisor_corner", "palace_horse", "opposite_cannon", "same_cannon", "elephant", "pawn"];
function load() {
  const ctx = vm.createContext({ localStorage: { getItem: () => null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx);
  vm.runInContext(cut(B, "const JH_HALL={", "\n};") + "\n" + cut(B, "let JH_HALL_W=", ";") + "\n" + cut(B, "JH_HALL.central.mates=", ";") + "\n" + cut(B, "let JH_MATE_W=", ";") + "\n" + cut(B, "const JH_HALL_WALK={", "\n};") + "\n", ctx);
  vm.runInContext(cut(L8, "const JH_HALLS8={", "}};\n") + "\n" + cut(L8, 'if(typeof JH_HALL!=="undefined")for(const [sid,H] of Object.entries(JH_HALLS8))', "extra:{[H.play.k]:H.play.at}};"), ctx);
  vm.runInContext("JH_HALL.screen={v:'1',seat:[385,320],w:60,cut:.42,spots:{hall:[385,140],study:[385,740],gate:[384,1300]},extra:{horse:[380,950],abacus:[360,300]}};" + cut(SC, "JH_HALL_WALK.screen={", "\"wave\"]}};") + "\n", ctx);
  vm.runInContext("const JH_MZ_LV={central:{hall:{at:[530,395]}},pawn:{hall:{at:[560,860]}},elephant:{hall:{at:[560,860]}},cross_palace:{hall:{at:[560,1180]}}};", ctx);
  vm.runInContext(cut(B, "const JH_HALL_L=", 'safe:{l:.12,r:.12,t:.05,b:.10}};'), ctx);
  return ctx;
}

test("條目：十派都登記在 SCW（鍵 zmhall/<派>），檔名加 _l1610；量好的點照 json 寫死", () => {
  const C = load(), SCW = vm.runInContext("SCW", C), L = vm.runInContext("JH_HALL_L", C);
  for (const sid of SIDS) { const e = SCW["zmhall/" + sid]; assert.ok(e, sid); assert.equal(e.f, "zmhall/" + sid + "_l1610"); assert.equal(e.w, 2560); assert.ok(L[sid].spots.hall && L[sid].spots.gate, sid) }
  assert.equal(vm.runInContext('scwKey("data/zmhall/central.webp?v=1122")', C), "zmhall/central");
  assert.deepEqual(J(L.central.seat), [1312, 389]); assert.equal(L.central.w, 84); assert.deepEqual(J(L.central.spots.hall), [1296, 144]);
  assert.deepEqual(J(L.screen.extra), { horse: [1264, 1040], abacus: [1240, 331] }); assert.deepEqual(J(L.pawn.extra.rock), [1232, 1024]);
  assert.deepEqual(J(L.central.mates), [[1126, 1264], [1485, 1264]]);
  for (const sid of SIDS) for (const p of [L[sid].seat, ...Object.values(L[sid].spots), ...Object.values(L[sid].extra || {})]) assert.ok(p[0] > 0 && p[0] < 2560 && p[1] > 0 && p[1] < 1600, sid + " " + p);
});

test("jhHallUse：換成橫式時每一套都換對；換回直式全部還原成原值（直式原值存起來，不被弄丟）", () => {
  const C = load(), R = s => vm.runInContext(s, C), L = R("JH_HALL_L");
  const before = J(R("({W:JH_HALL_W,H:JH_HALL_H,mw:JH_MATE_W,c:JH_HALL.central,p:JH_HALLS8.pawn,mz:JH_MZ_LV.central.hall.at,w:JH_HALL_WALK.central})"));
  R("jhHallUse(true)");
  assert.equal(R("JH_HALL_W"), 2560); assert.equal(R("JH_HALL_H"), 1600); assert.equal(R("JH_MATE_W"), 70);
  for (const sid of SIDS) { const H = R("JH_HALL." + sid); assert.deepEqual(J(H.seat), J(L[sid].seat), sid); assert.equal(H.w, L[sid].w); assert.deepEqual(J(H.spots), J(L[sid].spots), sid) }
  assert.deepEqual(J(R("JH_HALLS8.pawn.play.at")), [1232, 1024], "八派玩法入口照 extra[play.k]"); assert.deepEqual(J(R("JH_HALLS8.cross_palace.spots")), J(L.cross_palace.spots));
  assert.deepEqual(J(R("JH_MZ_LV.central.hall.at")), J(R("JH_MZ_AT_L.central")), "迷宮入口換成橫式的位置");
  assert.equal(R("JH_HALL_WALK.central.W"), 2560); assert.deepEqual(J(R("JH_HALL_WALK.central.N.hall")), [50, 30]); assert.deepEqual(J(R("JH_HALL_WALK.screen.N.gate")), [50, 95]);
  assert.deepEqual(J(R("JH_HALL.central.mates")), J(L.central.mates));
  R("jhHallUse(false)");
  const after = J(R("({W:JH_HALL_W,H:JH_HALL_H,mw:JH_MATE_W,c:JH_HALL.central,p:JH_HALLS8.pawn,mz:JH_MZ_LV.central.hall.at,w:JH_HALL_WALK.central})"));
  delete after.p._p; delete after.w._p;
  assert.deepEqual(after, before, "換回直式＝原值");
  R("jhHallUse(true)"); R("jhHallUse(true)"); assert.equal(R("JH_HALL_W"), 2560, "重複叫不會亂"); R("jhHallUse(false)"); assert.deepEqual(J(R("JH_HALL.central.seat")), [387, 314]);
});

test("迷宮入口（Windows Claude 1 補量）照量好的點寫死、都在圖內、不跟同一派的地點和玩法入口疊在一起（相距超過 80px）", () => {
  const C = load(), Z = vm.runInContext("JH_MZ_AT_L", C), L = vm.runInContext("JH_HALL_L", C);
  assert.deepEqual(J(Z), { central: [1472, 424], pawn: [832, 1232], elephant: [1936, 544], cross_palace: [1920, 1152] });
  for (const [sid, p] of Object.entries(Z)) {
    assert.ok(p[0] > 0 && p[0] < 2560 && p[1] > 0 && p[1] < 1600, sid);
    for (const q of [...Object.values(L[sid].spots), ...Object.values(L[sid].extra || {})]) assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) > 80, sid + " 跟 " + q + " 太近");
  }
});

test("〔原始碼〕JhHall 開頁照 scwPre 決定整套用哪一種；轉向（apply）整頁重畫；JH_HALL_W／H、JH_MATE_W 改成 let", () => {
  assert.match(B, /const src0=`data\/zmhall\/\$\{sid\}\.webp\?v=\$\{H\.v\}`,pre=typeof scwPre==="function"\?scwPre\(v,src0\):\{src:src0,k:""\};if\(typeof jhHallUse==="function"\)jhHallUse\(!!pre\.k\);/);
  assert.match(B, /img\.src=pre\.src;/);
  assert.match(B, /scwMount\(P,\{key:scwKey\(src0\),src0,ids:\[\],apply:\(\)=>setTimeout\(\(\)=>\{if\(P\.isConnected&&location\.hash==="#\/jianghu\/hall\/"\+sid\)JhHall\(v,sid\)\},0\)\}\);/);
  assert.match(B, /^let JH_HALL_W=768,JH_HALL_H=1376;/m); assert.match(B, /^let JH_MATE_W=54;/m);
});

test("〔混合〕順風小字：直式、橫式都放在這一派大廳標籤正下方、在圖內；八派門內頁實跑 jhHalls8Hall 不再用 768／1376 當除數（審查 #170）", () => {
  const C = load(), R = s => vm.runInContext(s, C);
  R(cut(B, "const jhNoteAt=", "};"));
  R("var jhL=(a,b)=>a,esc=s=>s,jhHalls8On=()=>true;" + cut(L8, "function jhHalls8Hall(v,sid){", "P.insertBefore(b,P.querySelector(\".jh-hall-spot\"))}"));
  const run = sid => { const n = { style: {} }, P = { querySelector: q => q === ".jh-hall-note" ? n : {} }; R("jhHalls8Hall")({ querySelector: () => P }, sid); return [parseFloat(n.style.left), parseFloat(n.style.top)] };
  const note = sid => { const n = { style: {} }; R("jhNoteAt")(n, R("JH_HALL")[sid].spots.hall); return [parseFloat(n.style.left), parseFloat(n.style.top)] };
  assert.deepEqual(note("central"), [50, 11.48], "直式中炮門跟原本 CSS 的 50%／11.5% 一樣");
  const tall = {}; for (const sid of SIDS) tall[sid] = note(sid);
  R("jhHallUse(true)");
  for (const sid of SIDS) {
    const [l, t] = note(sid), hs = R("JH_HALL")[sid].spots.hall;
    assert.ok(l > 5 && l < 95 && t > 0 && t < 40, sid + " 橫式在圖內：" + l + "," + t);
    assert.ok(t > hs[1] / 1600 * 100 + 3, sid + " 在大廳標籤下面");
    assert.equal(l, +(hs[0] / 2560 * 100).toFixed(2), sid + " 跟大廳標籤對齊");
  }
  assert.deepEqual(run("horse"), note("horse"), "八派門內頁實跑跟 jhNoteAt 一樣");
  R("jhHallUse(false)");
  for (const sid of SIDS) assert.deepEqual(note(sid), tall[sid], sid + " 換回直式還原");
  assert.match(B, /n\.title=jhL\([^;]*\);jhNoteAt\(n,H\.spots&&H\.spots\.hall\);P\.append\(n\)\}/, "07z9b 門內頁產生小字時就照當下的圖放");
});
