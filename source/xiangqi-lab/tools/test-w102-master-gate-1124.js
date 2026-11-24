/* W102（11/24）開發者截圖：中炮門掌門局的 3D 封面寫「走進秦朝的驛站／旅人在燈下擺好棋盤了」→ 開發者選「改成中炮門的場景」。
   掌門局借用驛站的對局（inn:zm_<派>），封面與 3D 地點標籤原本照驛站寫。改成那一派的門內圖、「走進〇〇門」「掌門〇〇等你過招」，不帶朝代名言。
   擴充（同日開發者選 ChatGPT 場景盤點的 A、B、L，以及「掌門副標拿掉大廳」）：
   - 驛站旅人、秘境棋友的對局 3D 其實是停靠朝代的園子 → 封面、標籤改成園子（走進〇〇的園子／〇〇在石桌邊等你）；
   - 從十州門派點門下棋友 → 到園子裡下一盤；
   - 英文介面給英文。
   zmGate、zmPlace、cgGardenGate、cgParkLabel 抽出來在 vm 配假資料跑（行為）；08b-cpugame.js 的接線用原始碼比對（標〔原始碼〕） */
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
function loadCg(en, rets) {
  const a = CG.indexOf("const CG_ERA_EN="), b = CG.indexOf("/* 第 15 輪 X3 鍵值化", a);
  assert.ok(a > 0 && b > a, "抓得到 cgGardenGate 那一段");
  const c = { EN: !!en, RETS: rets || {} }; vm.createContext(c);
  vm.runInContext(`const i18nLang=()=>EN?"en":"zh";const store={get:(k,d)=>k==="jRets"?RETS:d};
    const PW={classic:"園子",qin:"苑囿",ming:"園林"};const eraLabel=k=>({classic:"青石園",qin:"秦朝",ming:"明朝"})[k];
    const parkName=k=>k==="classic"||!PW[k]?"青石園":eraLabel(k)+"的"+PW[k];` + CG.slice(a, b) + ";this.gg=cgGardenGate;this.pl=cgParkLabel;this.fs=cgFromSchool;", c);
  return c;
}

test("掌門局：封面是那一派的門內圖、走進中炮門、掌門葛青禾等你過招（不寫大廳），不帶朝代名言（沒有 qk）；地點標籤 🏯 中炮門", () => {
  const { g, p } = load(false), G = JSON.parse(JSON.stringify(g("inn:zm_central")));
  assert.deepEqual(G, { img: ["data/zmhall/central.webp"], icon: "🏯", title: "走進中炮門", sub: "掌門葛青禾等你過招", bg: "#2b2a22", walk: 2600 });
  assert.ok(!/大廳/.test(G.sub), "3D 進去是園子，副標不寫大廳（開發者選）");
  assert.ok(!("qk" in G) && !("quote" in G), "不帶朝代名言");
  assert.ok(G.img.every((u) => /^data\/[\w\/.-]+$/.test(u)), "圖片網址過得了 park3d 的白名單（不能帶 ?v=）");
  assert.equal(p("inn:zm_central"), "🏯 中炮門");
});
test("掌門局英文介面：Enter the Central Cannon School／Master Ge Qinghe is ready for a game", () => {
  const { g, p } = load(true), G = g("inn:zm_central");
  assert.equal(G.title, "Enter the Central Cannon School"); assert.equal(G.sub, "Master Ge Qinghe is ready for a game"); assert.equal(p("inn:zm_central"), "🏯 Central Cannon School");
});
test("不是掌門局（一般驛站旅人、石桌往事、沒有局）：zmGate／zmPlace 回 null", () => {
  const { g, p } = load(false);
  for (const j of ["inn:x_miaogirl", "park", "h01", "", null, "inn:zm_nope"]) { assert.equal(g(j), null, String(j)); assert.equal(p(j), null, String(j)) }
});

test("驛站旅人、秘境棋友：封面改成園子（3D 實際就是園子），不再寫驛站、燈下；標籤 🍃 〇〇的園子名", () => {
  const { gg, pl } = loadCg(false), G = JSON.parse(JSON.stringify(gg("inn:x_miaogirl", "qin", "駱躍梅")));
  assert.deepEqual(G, { img: ["data/parkgate/qin_ink.webp", "data/parkgate/qin.webp", "data/park/qin_360.webp"], icon: "🍃", title: "走進秦朝的苑囿", sub: "駱躍梅在石桌邊等你", bg: "#2b2a22", qk: "qin" });
  assert.ok(!/驛站|燈下/.test(G.title + G.sub));
  assert.equal(gg("inn:x", "ming", "").sub, "旅人在石桌邊等你", "沒有名字：旅人");
  assert.equal(pl("qin"), "🍃 秦朝的苑囿"); assert.equal(pl("classic"), "🍃 青石園");
});
test("從十州門派點門下棋友（jRets 返回處是 #/jianghu/hall/<派>）：到園子裡下一盤；其他來源照『走進〇〇』", () => {
  const R = { park: { j: "park", back: "#/jianghu/hall/central", t: 1 }, "inn:x_a": { j: "inn:x_a", back: "#/journey/inn", t: 1 } };
  const { gg, fs } = loadCg(false, R);
  assert.equal(fs("park"), true); assert.equal(fs("inn:x_a"), false); assert.equal(fs("inn:none"), false);
  assert.equal(gg("park", "qin", "老韓").title, "到園子裡下一盤"); assert.equal(gg("park", "qin", "老韓").sub, "老韓在石桌邊等你");
  assert.equal(gg("inn:x_a", "qin", "").title, "走進秦朝的苑囿");
});
test("英文介面：園子封面與標籤都是英文，不帶中文名字", () => {
  const { gg, pl } = loadCg(true, { park: { back: "#/jianghu/hall/central" } });
  const G = gg("inn:x", "qin", "駱躍梅");
  assert.equal(G.title, "Enter the Qin Garden"); assert.equal(G.sub, "Your opponent waits at the stone table");
  assert.equal(gg("park", "ming", "老韓").title, "A game in the garden");
  assert.equal(gg("inn:x", "classic", "").title, "Enter the Bluestone Garden");
  assert.equal(pl("qin"), "🍃 Qin Garden"); assert.ok(!/[一-鿿]/.test(G.title + G.sub + pl("qin")), "沒有中文");
});

test("〔原始碼〕08b-cpugame.js：封面先問 zmGate，再來驛站與門下棋友用 cgGardenGate，其餘園子封面也有英文；標籤先問 zmPlace，再來 cgParkLabel", () => {
  assert.ok(CG.includes('gate:st.journey&&!st.arena?(typeof zmGate==="function"&&zmGate(st.journey))||(k=>innAnyAct(st.journey)?cgGardenGate(st.journey,k,(innAnyAct(st.journey)||{}).name):st.journey==="park"&&cgFromSchool("park")?cgGardenGate("park",k,N&&N.name):'), "封面");
  assert.ok(CG.includes('title:cgL("走進"+parkName(k),"Enter "+cgParkEn(k)),sub:cgL("石桌就在前面","The stone table is just ahead")'), "一般園子封面有英文");
  assert.ok(CG.includes('bgName:JS0?"雲河鎮・"+JR[JS0.r].name:(typeof zmPlace==="function"&&zmPlace(st.journey))||innAnyAct(st.journey)||st.journey==="park"&&cgFromSchool("park")?(typeof zmPlace==="function"&&zmPlace(st.journey))||cgParkLabel(store.get("era","classic")):'), "標籤");
  assert.ok(!CG.includes('sub:"旅人在燈下擺好棋盤了"') && !CG.includes('"🏮 "+innName(store.get("era","classic"))'), "驛站字樣拿掉了");
});
