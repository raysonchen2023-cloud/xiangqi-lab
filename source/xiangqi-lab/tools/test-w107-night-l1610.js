// W107-L 夜景、四季：Windows Claude 2 11/25 出的 215 張＋Windows Claude 1 重畫、重出的 3 張，共 218 張 iPad 橫式圖（構圖照日間、座標共用）。07sw scwVarList／scwVarInit。
// 檢查：清單會用到的檔＝送來的 218 張（逐一寫死各類數量）；日間條目晚登記也接得上；複製的條目座標跟日間同一份、只換檔名；
// 夏季用日間那張、夏夜用夜景那張；不在清單的不登記；scwPre、scwSw7 找得到變體。
// 用法 node --test xiangqi-lab/tools/test-w107-night-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const SW = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/07sw-scenewide.js"), "utf8").replace(/\r\n/g, "\n");
const J = x => JSON.parse(JSON.stringify(x));
function load() {
  const ctx = vm.createContext({ localStorage: { getItem: k => k === "xqScwDev" ? "1" : null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); return ctx;
}
const day = (f, extra) => Object.assign({ ready: true, f, w: 2560, h: 1600, S: { a: [10, 20] }, exit: [50, 90], safe: { l: .12, r: .12, t: .05, b: .1 }, fx: { k: 1 }, sw7: { m: "semi" } }, extra || {});

test("清單：會用到的檔逐類寫死，合起來 218 張（215＋重畫、重出的 study_night_classic、canju_night_classic、study_night）全部到齊；鍵不重複", () => {
  const C = load(), L = J(vm.runInContext("scwVarList()", C)), keys = L.map(x => x[0]);
  assert.equal(new Set(keys).size, keys.length, "鍵不重複");
  const files = new Set(L.filter(x => !x[3]).map(x => x[2] ? x[2].replace(/_l1610$/, "") : x[0]));
  const by = {}; for (const f of files) { const d = f.split("/")[0]; by[d] = (by[d] || 0) + 1 }
  assert.deepEqual(by, { campmap: 2, canjumap: 4, cupmap: 5, exammap: 2, feedback: 1, gmmap: 4, openmap: 2, redomap: 2, setmap: 2, statmap: 2, studymap: 2, termsmap: 2, thememap: 2, todaymap: 5, lobbymap: 13, hubmap: 168 });
  assert.equal(files.size, 218); for (const f of ["studymap/study_night_classic", "canjumap/canju_night_classic", "studymap/study_night"]) assert.ok(files.has(f), "重畫、重出的 " + f);
  assert.equal(keys.length, 218 + 48, "外加 24 組夏季、夏夜");
});

test("日間條目晚登記也接得上：先查不到，日間那條登記後就複製一份（座標、安全區、疊圖、天氣同一份，只換檔名、記 base）", () => {
  const C = load(), R = s => vm.runInContext(s, C), E = R("scwEntry");
  assert.equal(E("campmap/camp_night"), null, "日間還沒登記");
  R("SCW['campmap/camp_day']=" + JSON.stringify(day("campmap/camp_day_l1610")));
  const e = J(E("campmap/camp_night"));
  assert.equal(e.f, "campmap/camp_night_l1610"); assert.equal(e.base, "campmap/camp_day");
  for (const k of ["S", "exit", "safe", "fx", "sw7", "w", "h", "ready"]) assert.deepEqual(e[k], J(R("SCW['campmap/camp_day']"))[k], k + " 跟日間一樣");
  assert.equal(E("campmap/camp_night_classic"), null, "經典的日間還沒登記就照舊不換");
  R("SCW['campmap/camp_day_classic']=" + JSON.stringify(day("campmap/camp_day_classic_l1610")));
  assert.equal(E("campmap/camp_night_classic").f, "campmap/camp_night_classic_l1610");
  assert.equal(E("campmap/camp_day").f, "campmap/camp_day_l1610", "日間那條不動");
});

test("各類對應：夜景 <名>_night<後綴>←<名>_day<後綴>；大廳 lobby<後綴>_night←lobby<後綴>；對戰、學習 <名>[_朝代]_<季>[_night]←<名>[_朝代]，夏季用日間那張、夏夜用夜景那張", () => {
  const C = load(), R = s => vm.runInContext(s, C), E = R("scwEntry");
  R("SCW['feedback/fb_day']=" + JSON.stringify(day("feedback/fb_day_l1610")) + ";SCW['todaymap/today_day_han']=" + JSON.stringify(day("todaymap/today_day_han_l1610")));
  assert.equal(E("feedback/fb_night").f, "feedback/fb_night_l1610"); assert.equal(E("todaymap/today_night_han").f, "todaymap/today_night_han_l1610");
  // 大廳、對戰、學習的日間條目 07sw 自己就有（SCW_ERA）
  assert.equal(E("lobbymap/lobby_tang_night").f, "lobbymap/lobby_tang_night_l1610"); assert.equal(E("lobbymap/lobby_tang_night").base, "lobbymap/lobby_tang");
  assert.equal(E("lobbymap/lobby_classic_night").f, "lobbymap/lobby_classic_night_l1610"); assert.equal(E("lobbymap/lobby_night").f, "lobbymap/lobby_night_l1610");
  assert.equal(E("hubmap/battle_han_autumn_night").f, "hubmap/battle_han_autumn_night_l1610"); assert.equal(E("hubmap/battle_han_autumn_night").base, "hubmap/battle_han");
  assert.equal(E("hubmap/battle_han_summer").f, R("SCW['hubmap/battle_han'].f"), "夏季＝日間那張");
  assert.equal(E("hubmap/battle_han_summer_night").f, "hubmap/battle_han_night_l1610", "夏夜＝夜景那張");
  assert.equal(E("hubmap/learn_ming_winter").f, "hubmap/learn_ming_winter_l1610"); assert.deepEqual(J(E("hubmap/learn_ming_winter").S), J(R("SCW['hubmap/learn_ming'].S")), "學習的入口座標照朝代那條");
  assert.equal(E("hubmap/battle_spring").f, "hubmap/battle_spring_l1610"); assert.equal(E("hubmap/learn_spring_night").f, "hubmap/learn_spring_night_l1610");
  assert.equal(E("hubmap/learn_song_night"), null, "學習沒有宋（HB_ERAS 也沒有）"); assert.equal(E("hubmap/battle_ming_night"), null, "對戰沒有明");
  assert.equal(E("canjumap/canju_night_classic").f, "canjumap/canju_night_classic_l1610", "重畫好的殘局經典夜景照經典日間登記"); assert.equal(E("canjumap/canju_night_classic").base, "canjumap/canju_day_classic");
  assert.equal(E("studymap/study_night_dawn"), null, "不在清單的不登記");
});

test("〔混合〕scwPre 開頁就選到夜景橫式圖（iPad 橫向）；scwSw7 用夜景橫式圖網址找得到天氣條目；直向照舊原圖", () => {
  const C = load(), R = s => vm.runInContext(s, C);
  R("SCW['setmap/set_day']=" + JSON.stringify(day("setmap/set_day_l1610")));
  const V = (w, h) => ({ clientWidth: w, clientHeight: h, scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }) });
  C.getComputedStyle = () => ({ paddingBottom: "0", paddingLeft: "0", paddingRight: "0" });
  C.document = { documentElement: { clientHeight: 820 } }; C.innerHeight = 820;
  const pre = R("scwPre")(V(1180, 820), "data/setmap/set_night.webp?v=3");
  assert.equal(pre.k, "l1610"); assert.match(pre.src, /^data\/setmap\/set_night_l1610\.webp\?v=/);
  C.document.documentElement.clientHeight = 1180; C.innerHeight = 1180;
  assert.deepEqual(J(R("scwPre")(V(820, 1180), "data/setmap/set_night.webp?v=3")), { src: "data/setmap/set_night.webp?v=3", k: "" }, "直向照舊");
  const base = s => s.indexOf("set_night") >= 0 ? { k: "set", re: /set/, rg: "s", m: "in" } : null;
  // 新載入、還沒叫過 scwEntry：第一個就叫 scwSw7 也要登記得到
  const C2 = load(); vm.runInContext("SCW['setmap/set_day']=" + JSON.stringify(day("setmap/set_day_l1610")), C2);
  assert.equal(J(vm.runInContext("scwSw7", C2)("data/setmap/set_night_l1610.webp?v=1125", base)).m, "semi", "scwSw7 自己會登記變體");
  const C3 = load(); vm.runInContext("SCW['setmap/set_day']=" + JSON.stringify(day("setmap/set_day_l1610")), C3);
  assert.equal(vm.runInContext("scwByF", C3)("data/setmap/set_night_l1610.webp").base, "setmap/set_day", "scwByF 自己會登記變體");
  const w = J(R("scwSw7")("data/setmap/set_night_l1610.webp?v=1125", base));
  assert.equal(w.m, "semi", "照條目的 sw7"); assert.equal(w.W, 2560);
  assert.equal(R("scwByF")("data/setmap/set_night_l1610.webp").base, "setmap/set_day");
});

test("各頁自己寫好的條目不蓋掉；登記完的不再處理（清單變短），沒新增時清單照舊", () => {
  const C = load(), R = s => vm.runInContext(s, C);
  R("SCW['thememap/theme_day']=" + JSON.stringify(day("thememap/theme_day_l1610")) + ";SCW['thememap/theme_night']=" + JSON.stringify(day("thememap/自己的_night", { S: { own: [1, 2] } })));
  assert.equal(R("scwEntry")("thememap/theme_night").f, "thememap/自己的_night", "不蓋掉已有的條目"); assert.deepEqual(J(R("SCW['thememap/theme_night'].S")), { own: [1, 2] });
  const n0 = R("SCW_VAR_TODO.length"); R("scwVarInit()"); const t0 = R("SCW_VAR_TODO");
  R("scwVarInit()"); assert.equal(R("SCW_VAR_TODO"), t0, "沒新增：不重建清單"); assert.equal(R("SCW_VAR_TODO.length"), n0);
  R("SCW['statmap/stat_day']=" + JSON.stringify(day("statmap/stat_day_l1610"))); R("scwVarInit()");
  assert.equal(R("SCW_VAR_TODO.length"), n0 - 1, "登記到一張，清單少一個"); assert.ok(!R("SCW_VAR_TODO").some(x => x[0] === "statmap/stat_night"));
});
