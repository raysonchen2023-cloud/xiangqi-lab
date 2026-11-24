/* W102（11/24）開發者截圖：中炮門掌門局的 3D 封面寫「走進秦朝的驛站／旅人在燈下擺好棋盤了」→ 開發者選「改成中炮門的場景」。
   掌門局借用驛站的對局（inn:zm_<派>），封面與 3D 地點標籤原本照驛站寫。改成那一派的門內圖、「走進〇〇門」「掌門〇〇在大廳等你」，不帶朝代名言。
   zmGate、zmPlace 抽出來在 vm 配假資料跑（行為）；08b-cpugame.js 的接線用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SCH = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9-school.js"), "utf8");
const CG = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "08b-cpugame.js"), "utf8");
function load(en) {
  const a = SCH.indexOf("function zmGate(j)"), b = SCH.indexOf("function zmStart(", a);
  assert.ok(a > 0 && b > a, "抓得到 zmGate、zmPlace");
  const c = { EN: !!en }; vm.createContext(c);
  vm.runInContext(`const MST={zm_central:{id:"zm_central",sid:"central",nm:"葛青禾",en:"Ge Qinghe"}};
    const OSC={mst:j=>MST[String(j).replace(/^inn:/,"")]||null};
    const zmAct=j=>/^inn:zm_/.test(String(j||""))&&OSC.mst(j)?{id:OSC.mst(j).id}:null;
    const oscSchE=id=>id==="central"?{nm:EN?"Central Cannon School":"中炮門"}:null;
    const oscL=(zh,en)=>EN?en:zh;` + SCH.slice(a, b) + ";this.g=zmGate;this.p=zmPlace;", c);
  return c;
}

test("掌門局：封面是那一派的門內圖、走進中炮門、掌門葛青禾在大廳等你，不帶朝代名言（沒有 qk）；地點標籤 🏯 中炮門", () => {
  const { g, p } = load(false), G = JSON.parse(JSON.stringify(g("inn:zm_central")));
  assert.deepEqual(G, { img: ["data/zmhall/central.webp"], icon: "🏯", title: "走進中炮門", sub: "掌門葛青禾在大廳等你", bg: "#2b2a22", walk: 2600 });
  assert.ok(!("qk" in G) && !("quote" in G), "不帶朝代名言");
  assert.ok(G.img.every((u) => /^data\/[\w\/.-]+$/.test(u)), "圖片網址過得了 park3d 的白名單（不能帶 ?v=）");
  assert.equal(p("inn:zm_central"), "🏯 中炮門");
});
test("英文介面：Enter the Central Cannon School／Master Ge Qinghe is waiting in the hall", () => {
  const { g, p } = load(true), G = g("inn:zm_central");
  assert.equal(G.title, "Enter the Central Cannon School"); assert.equal(G.sub, "Master Ge Qinghe is waiting in the hall"); assert.equal(p("inn:zm_central"), "🏯 Central Cannon School");
});
test("不是掌門局（一般驛站旅人、石桌往事、沒有局）：回 null，照原本的封面與標籤", () => {
  const { g, p } = load(false);
  for (const j of ["inn:x_miaogirl", "park", "h01", "", null, "inn:zm_nope"]) { assert.equal(g(j), null, String(j)); assert.equal(p(j), null, String(j)) }
});
test("〔原始碼〕08b-cpugame.js：封面先問 zmGate，沒有才照驛站／園子；地點標籤先問 zmPlace，沒有才寫〇〇的驛站", () => {
  assert.ok(CG.includes('gate:st.journey&&!st.arena?(typeof zmGate==="function"&&zmGate(st.journey))||(k=>innAnyAct(st.journey)?{img:["data/inn/"+k+"_ink.webp"'), "封面");
  assert.ok(CG.includes('innAnyAct(st.journey)?(typeof zmPlace==="function"&&zmPlace(st.journey))||"🏮 "+innName(store.get("era","classic"))'), "標籤");
  assert.ok(CG.includes('bgName:JS0?"雲河鎮・"+JR[JS0.r].name:(typeof zmPlace==="function"&&zmPlace(st.journey))||innAnyAct(st.journey)?'), "標籤先判斷掌門局");
});
