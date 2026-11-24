/* W96（11/24）秘境棋友吸引力第一組（m/07-legend.js）：雲河尋訪錄集滿保底、施耐庵的散佚手稿。
   開發者：「對玩家來說，找到秘境棋友有什麼好處。不就是個電腦玩家，一點吸引力都沒有，找gemini規劃幾個吸引人去找秘境棋友的文案」→ 文案 198，照推薦先做第一組。
   把 07-legend.js 的 W96 那一段抽出來，在 vm 裡配假的存檔跑；畫面上的接線用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07-legend.js"), "utf8");
const SAVE = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "05b-save.js"), "utf8");
function load(mem = {}) {
  const a = SRC.indexOf("/* ===== W96"), b = SRC.indexOf("function secretFind(", a); assert.ok(a > 0 && b > a, "找不到 W96 那一段");
  const c = { store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } }, Math, JSON, Date, Number, String, Object };
  vm.createContext(c);
  vm.runInContext(`const SECRETS=[{id:"liuji"},{id:"zhangsanfeng"},{id:"shinaian"},{id:"shenwansan"},{id:"changyuchun"},{id:"wangmian"}];
    const jSecrets=()=>store.get("secrets",{}),secretClues=()=>store.get("secretClue",{}),bag=()=>({boards:[],records:[],...store.get("bag",{})}),bagSave=B=>store.set("bag",B);
    const lingN=()=>store.get("lingN",0),lingAdd=d=>store.set("lingN",lingN()+d),esc=s=>String(s);` + SRC.slice(a, b) +
    ";this.secMsTry=secMsTry;this.secMsUse=secMsUse;this.secAllReward=secAllReward;this.secMsN=secMsN;this.secAllNote=secAllNote;this.N=[SEC_MS_NEED,SEC_MS_P,SEC_MS_DAY,SEC_ALL_BOARD];", c);
  return { c, mem, get: (k) => (k in mem ? JSON.parse(mem[k]) : undefined) };
}
const ALL = { liuji: 1, zhangsanfeng: 1, shinaian: 1, shenwansan: 1, changyuchun: 1, wangmian: 1 };

test("散佚手稿：點錯物件 20% 機會撿到（亂數 < .2）；每天最多 3 張、隔天重算；秘境棋友都找到了就不再掉", () => {
  const { c, get } = load(), t0 = new Date(2026, 10, 24, 9).getTime();
  assert.deepEqual(JSON.parse(JSON.stringify(c.N)).slice(0, 3), [3, 0.2, 3]);
  assert.equal(c.secMsTry(0.25, t0), 0, "亂數 .25：沒撿到"); assert.equal(c.secMsTry(0.19, t0), 1); assert.equal(c.secMsTry(0, t0), 2); assert.equal(c.secMsTry(0.1, t0), 3);
  assert.equal(c.secMsTry(0, t0 + 3600e3), 0, "同一天第 4 張不給"); assert.equal(c.secMsN(), 3);
  assert.equal(c.secMsTry(0, t0 + 86400e3), 4, "隔天又可以撿");
  const L = load({ secrets: JSON.stringify(ALL) }); assert.equal(L.c.secMsTry(0, t0), 0, "都找到了不再掉");
});

test("3 張手稿換一條線索：優先給還沒有線索的那一位，扣 3 張、記進 secretClue；不夠或都找到了換不了", () => {
  const { c, get } = load({ secMs: "2", secrets: JSON.stringify({ liuji: 1 }), secretClue: JSON.stringify({ zhangsanfeng: 5 }) });
  assert.equal(c.secMsUse(), null, "2 張不夠");
  const L = load({ secMs: "4", secrets: JSON.stringify({ liuji: 1 }), secretClue: JSON.stringify({ zhangsanfeng: 5 }) });
  const t = L.c.secMsUse(); assert.equal(t.id, "shinaian", "跳過已經找到的劉伯溫、已經有線索的張三丰"); assert.equal(L.get("secMs"), 1); assert.ok(L.get("secretClue").shinaian);
  const A = load({ secMs: "9", secrets: JSON.stringify(ALL) }); assert.equal(A.c.secMsUse(), null); assert.equal(A.get("secMs"), 9, "換不了就不扣");
});

test("雲河尋訪錄六位集滿：只發一次；沒有拓本送「雲河鎮石桌殘局拓本」（稀有），已經有稀有棋盤改送 3 枚將令；沒集滿不發", () => {
  const N = load({ secrets: JSON.stringify({ liuji: 1 }) }); assert.equal(N.c.secAllReward(), null, "沒集滿不發");
  const { c, get } = load({ secrets: JSON.stringify(ALL), bag: JSON.stringify({ boards: [{ rarity: "normal" }] }) });
  assert.deepEqual({ ...c.secAllReward() }, { rare: true }); const B = get("bag").boards; assert.equal(B.length, 2); assert.deepEqual([B[1].rarity, B[1].name, B[1].from], ["rare", "雲河鎮石桌殘局拓本", "雲河尋訪錄"]);
  assert.equal(c.secAllReward(), null, "只發一次"); assert.equal(get("bag").boards.length, 2);
  const R = load({ secrets: JSON.stringify(ALL), bag: JSON.stringify({ boards: [{ rarity: "rare", name: "雲河鎮石桌殘局拓本" }] }), lingN: "1" });
  assert.deepEqual({ ...R.c.secAllReward() }, { ling: 3 }); assert.equal(R.get("lingN"), 4); assert.equal(R.get("bag").boards.length, 1, "不重複送拓本");
  assert.match(c.secAllNote({ rare: true }), /整個雲河只有這一件/); assert.match(c.secAllNote({ ling: 3 }), /改送 3 枚將令/); assert.equal(c.secAllNote(null), "");
});

test("〔原始碼〕畫面接線：點錯物件撿手稿的提示、找到時檢查集滿並顯示尋訪錄進度、贏施耐庵必掉一張、秘境棋友清單有進度條與換線索鈕；新存檔鍵登記進存檔", () => {
  assert.ok(SRC.includes("if(!x||jSecrets()[x.id]){const m=secMsTry();if(m)setTimeout(()=>toast(`📝"), "點錯物件才試著撿手稿");
  assert.ok(SRC.includes("store.set(\"secrets\",S);vibrate([20,40,60]);const AR=secAllReward();") && SRC.includes("${secAllNote(AR)}"), "找到時檢查集滿、顯示獎勵");
  assert.ok(SRC.includes('if(x.id==="shinaian"&&!SECRETS.every(z=>jSecrets()[z.id])){const m=secMsN()+1;store.set("secMs",m);'), "贏施耐庵必掉一張");
  assert.ok(SRC.includes("📜 雲河尋訪錄 ${nF}／${SECRETS.length}") && SRC.includes('id="secMsUse"') && SRC.includes("const t=secMsUse();"), "清單上的進度與換線索鈕");
  assert.ok(SRC.includes("線索也會記在驛站的秘境棋友清單裡"), "說法跟實際一樣（驛站清單會顯示線索）");
  assert.ok(SAVE.includes('JOURNEY_KEYS.push("m_secMs","m_secMsDay","m_secAll");'), "新存檔鍵跟著存檔走");
});
