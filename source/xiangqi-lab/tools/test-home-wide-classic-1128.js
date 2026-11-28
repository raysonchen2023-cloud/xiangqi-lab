// 11/28 #255 第 4 項（開發者 iPad 實機：經典世界首頁橫向只有中間一條）：千秋時光之苑四季日夜 8 張橫版 home_classic_<季>[_night]_l1610（07z HMW_CL）。
// 從 07z-homemap.js 抽出 HMW 那一整段（const HMW_ON 到 function hmwSet 之前）和 hmWvRefreshCl，在 vm 裡真的執行；sw7HomeWx、localStorage、Image 用假的。
// 不開瀏覽器。用法 node --test xiangqi-lab/tools/test-home-wide-classic-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const Z = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db/m/07z-homemap.js"), "utf8").replace(/\r\n/g, "\n");
const SEG = Z.slice(Z.indexOf("const HMW_ON=true"), Z.indexOf("function hmwSet("));
const RF = Z.slice(Z.indexOf("function hmWvRefreshCl("), Z.indexOf("function hmWvRefresh("));
const SEAS = ["spring", "summer", "autumn", "winter"];
const ALL8 = SEAS.flatMap(s => ["classic_" + s, "classic_" + s + "_night"]);

/* 每次新開一份：wv＝sw7HomeWx() 回傳值；dev＝localStorage xqScwDev；cdn＝把 HMW_CL_CDN 打開 */
function load({ wv = "", dev = false, cdn } = {}) {   /* cdn：true 強制打開、false 強制關掉、沒帶＝照原始碼（11/28 #267 起預設打開） */
  const imgs = [], sets = [];
  const ctx = {
    sw7HomeWx: () => ctx._wv, _wv: wv,
    localStorage: { getItem: k => (k === "xqScwDev" && dev ? "1" : null) },
    HM_IMGV: "hm", HM_SPOTS: [["hmShip", 0, 0, "星槎"], ["hmBattle", 0, 0, "對戰"], ["hmLearn", 0, 0, "學習"], ["hmRec", 0, 0, "紀錄"], ["hmQuick", 0, 0, "同桌"]],
    SHW_HOMEMAP: {}, SHW_PG0: {},
    Image: function () { imgs.push(this) },
    hmwSet: (P, k) => sets.push(k), sw7Tick: () => { },
    document: { documentElement: { clientHeight: 820 } }, innerHeight: 820
  };
  vm.createContext(ctx);
  vm.runInContext(SEG + "\n" + RF + "\n" + (cdn === true ? "HMW_CL_CDN=true;" : cdn === false ? "HMW_CL_CDN=false;" : "")   /* 11/28 #267：原始碼預設已是 true；cdn:false＝強制關掉（例如 CDN 出事退回），沒帶＝照原始碼 */ +
    "this.api={HMW,HMW_CL,HMW_BAD,hmwKind,hmwBase,hmwPick,hmwSrc,hmwSpots,hmwClWv,hmwFail,hmWvRefreshCl,HM_SPOTS_L1610}", ctx);
  return { ctx, api: ctx.api, imgs, sets };
}
/* iPad 13 吋橫向（可用 1366×900）、直向（1024×1250）、近正方形（1000×1000） */
const LAND = { W: 1366, av: 900, vw: 1366, vh: 1024 }, PORT = { W: 1024, av: 1250, vw: 1024, vh: 1366 }, SQ = { W: 1000, av: 1000, vw: 1000, vh: 1100 };

test("8 個變體都登記，名字跟 07w7 sw7HomeWx 經典世界回傳的一樣（classic_<季>[_night]），檔名照 home_<變體>_l1610", () => {
  const { api } = load({ wv: "classic_spring", dev: true });
  assert.deepEqual([...api.HMW_CL].sort(), [...ALL8].sort());
  for (const w of ALL8) {
    const { api: a } = load({ wv: w, dev: true });
    assert.equal(a.hmwSrc("l1610"), `data/homemap/home_${w}_l1610.webp?v=1128`, w);
    assert.equal(a.hmwSrc("p34"), "data/homemap/home_p34.webp?v=0910", "直版不受影響");
  }
  /* 07w7 真的會回傳這幾個名字：照原始碼確認 classic_ 前綴＋s2＋nt 的組法還在 */
  const W7 = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db/m/07w7-seasons.js"), "utf8");
  assert.match(W7, /if\(typeof hbIsCl==="function"&&hbIsCl\(\)\)return"classic_"\+s2\+nt;/);
});

test("開關關掉時（HMW_CL_CDN＝false）：正式玩家經典世界照舊不換橫版；開發用開關 xqScwDev＝1 才換（11/28 #267 起原始碼預設打開）", () => {
  const off = load({ wv: "classic_autumn", cdn: false });
  assert.equal(off.api.hmwBase(), false); assert.equal(off.api.hmwPick(LAND), ""); assert.equal(off.api.hmwClWv(), "");
  assert.match(Z, /let HMW_CL_CDN=true;/, "11/28 圖已上 CDN（#255），#267 打開；要退回就改回 false");
  const dev = load({ wv: "classic_autumn", dev: true, cdn: false });
  assert.equal(dev.api.hmwBase(), true); assert.equal(dev.api.hmwPick(LAND), "l1610");
  const on = load({ wv: "classic_autumn", cdn: true });
  assert.equal(on.api.hmwPick(LAND), "l1610", "打開以後不用開發開關");
  const def = load({ wv: "classic_autumn" });
  assert.equal(def.api.hmwPick(LAND), "l1610", "照原始碼（預設打開）：正式玩家橫向就換");
});

test("經典世界只有橫版：橫向換 l1610；直向、近正方形照舊用直式變體（不能拿原圖的 home_p34 頂替）", () => {
  const { api } = load({ wv: "classic_winter_night", cdn: true });
  assert.equal(api.hmwKind(PORT.W, PORT.av, PORT.vw, PORT.vh), "p34", "hmwKind 本身照舊會回 p34");
  assert.equal(api.hmwPick(PORT), "", "但經典世界不用 p34");
  assert.equal(api.hmwPick(SQ), "");
  assert.equal(api.hmwPick(LAND), "l1610");
});

test("不是經典世界的變體（宋的季節、朝代、雨雪、晨昏）照舊不換；沒有變體照舊用原圖的寬版", () => {
  for (const w of ["spring", "autumn_night", "snow", "rain", "tang_summer", "summer_dawn", "classic"]) {
    const { api } = load({ wv: w, cdn: true });
    assert.equal(api.hmwPick(LAND), "", w); assert.equal(api.hmwSrc("l1610"), "data/homemap/home_l1610.webp?v=0910", w);
  }
  const base = load({ wv: "", cdn: true });
  assert.equal(base.api.hmwPick(LAND), "l1610"); assert.equal(base.api.hmwPick(PORT), "p34");
  assert.equal(base.api.hmwSrc("l1610"), "data/homemap/home_l1610.webp?v=0910");
});

test("入口座標沿用 l1610；只有秋夜的書院山門（hmLearn）x +0.35%、y −1.4%，其他 7 張、其他入口不動", () => {
  const L = load({ wv: "", cdn: true }).api.hmwSpots("l1610");
  for (const w of ALL8) {
    const S = load({ wv: w, cdn: true }).api.hmwSpots("l1610");
    for (const [id, x, y, lab] of S) {
      const o = L.find(s => s[0] === id);
      const fx = w === "classic_autumn_night" && id === "hmLearn";
      assert.equal(x, fx ? +(o[1] + .35).toFixed(2) : o[1], w + " " + id + " x");
      assert.equal(y, fx ? +(o[2] - 1.4).toFixed(2) : o[2], w + " " + id + " y");
      assert.ok(lab, "大字照 HM_SPOTS");
    }
  }
  const A = load({ wv: "classic_autumn_night", cdn: true }).api;
  assert.deepEqual([...A.hmwSpots("l1610").find(s => s[0] === "hmLearn").slice(1, 3)], [78.85, 25.6], "78.5＋0.35、27−1.4");
  assert.equal(JSON.stringify(A.hmwSpots("p34")), JSON.stringify(load({ wv: "", cdn: true }).api.hmwSpots("p34")), "直版座標不受影響");
});

test("經典橫版載不到（CDN 也失敗）：只關經典那 8 張（HMW_BAD.cl），原圖的 home_l1610 照用", () => {
  const { api, sets } = load({ wv: "classic_spring", cdn: true });
  const P = { dataset: { hmw: "l1610" }, _hmWv: "classic_spring", querySelector: () => ({ dataset: {}, getAttribute: () => "data/homemap/home_classic_spring_l1610.webp" }) };
  api.hmwFail(P);
  assert.equal(api.HMW_BAD.cl, 1); assert.equal(api.HMW_BAD.l1610, undefined); assert.deepEqual([...sets], [""], "退回原圖");
  assert.equal(api.hmwPick(LAND), "", "這次開 App 經典世界不再試");
  assert.equal(api.hmwKind(LAND.W, LAND.av, LAND.vw, LAND.vh), "l1610", "原圖寬版照舊可用");
});

test("橫版開著跨過入夜：先載好下一張橫版才換（hmwSet），載不到留著現在這張；同一張不重載", () => {
  const t = load({ wv: "classic_summer", cdn: true });
  const P = { isConnected: true, dataset: { hmw: "l1610" }, _hmWv: "classic_summer" };
  assert.equal(t.api.hmWvRefreshCl(P), false, "同一張不動"); assert.equal(t.imgs.length, 0);
  t.ctx._wv = "classic_summer_night";
  assert.equal(t.api.hmWvRefreshCl(P), true);
  assert.equal(t.imgs[0].src, "data/homemap/home_classic_summer_night_l1610.webp?v=1128");
  assert.equal(P._hmWvBusy, true); assert.deepEqual(t.sets, [], "圖還沒載好不換");
  t.imgs[0].onload();
  assert.equal(P._hmWv, "classic_summer_night"); assert.deepEqual(t.sets, ["l1610"]); assert.equal(P._hmWvBusy, false);
  assert.equal(P._hmSrc0, "data/homemap/home_classic_summer_night.webp?v=hm", "之後轉直向退回的是新的這個變體（iMac Claude 2 驗 #256）");
  t.ctx._wv = "classic_autumn";
  t.api.hmWvRefreshCl(P); t.imgs[1].onerror();
  assert.equal(P._hmWv, "classic_summer_night", "載不到留著"); assert.deepEqual(t.sets, ["l1610"]);
});

test("homeMap、hmWvRefresh 接上了：退回原圖時退回這個變體的直式圖；有經典橫版也掛每分鐘換圖；hmWvRefresh 先問經典橫版", () => {
  const H = Z.slice(Z.indexOf("function homeMap("), Z.indexOf("function homeMap(") + 6000);
  assert.match(H, /const cw=hk==="l1610"\?hmwClWv\(\):"";/);
  assert.match(H, /P\._hmSrc0=cw\?`data\/homemap\/home_\$\{cw\}\.webp\?v=\$\{HM_IMGV\}`:hk\?/);
  assert.match(H, /if\(cw\)P\._hmWv=cw;/);
  assert.match(H, /if\(cw\)\{const tm=setInterval\(\(\)=>\{if\(!P\.isConnected\)\{clearInterval\(tm\);return\}try\{hmWvRefresh\(P\)\}catch\(e\)\{\}\},60000\)\}/);
  assert.match(Z, /function hmWvRefresh\(P\)\{if\(P&&P\.isConnected&&!P\._hmWvBusy&&P\.dataset\.hmw==="l1610"&&HMW_CL\.has\(P\._hmWv\|\|""\)\)return hmWvRefreshCl\(P\);/);
});
