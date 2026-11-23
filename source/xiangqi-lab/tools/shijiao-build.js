#!/usr/bin/env node
/* W48-S3 仕角炮門「當鋪算兌子」出題腳本（不是測試，CI 不跑：要讀 33 MB 的大師對局）。
   從 data/gmgames.json 主線第 16～60 手、輪紅走的局面，找「紅方可以吃、吃了會引發一串互吃」的格子，
   用 m/07z9e-shijiao.js 自己的 jhSjSee 窮舉（同一支程式，App 和題庫算法一定一樣），寫回模組裡 JH_SJ_Q 那一段。
   篩選：輪紅走且沒被將軍；被捉的是黑方非將的子；帳裡沒有任何一步是將軍；淨得失不是 0；每盤棋最多一題；同一個局面同一格不重複出；每一級同一種「誰吃誰」（第一步）最多 3 題。
   難度：高級＝互吃 3～4 步且帳裡有炮或車；中級＝2～3 步且帳裡有過河兵或仕象；初級＝1～2 步的其餘。
   每級 20 題：吃 10、不吃 10（初級「吃」裡一步就吃完、對方吃不回的最多 4 題）。
   gmgames.json 本機沒有（或 --gm 沒指定）就照 CDN 的分塊清單下載接回、核對 sha1（只讀，不存檔）。
   W73（11/23 Windows Claude 1 用 Pikafish 驗出 13 題「吃」實戰大虧）：加引擎紀錄 shijiao-engine.json（紅方觀點的分數，cp；殺棋換算成 ±30000）：
     cap＝只搜「吃這一格」的著法、alt＝只搜其他著法。答案「吃」：alt−cap ≤ 50（吃是最佳或差不多）；答案「不吃」：alt−cap ≥ 100。
     紀錄裡沒有的候選題跳過；加 --engine（要設 PIKAFISH）才會現場算、補進紀錄。深度 20、Threads 4、Hash 256（照 Windows 的驗證）。
   用法：node xiangqi-lab/tools/shijiao-build.js --engine  用本機 Pikafish 算候選題、更新紀錄後寫回模組
         node xiangqi-lab/tools/shijiao-build.js           寫回模組
         node xiangqi-lab/tools/shijiao-build.js --check   重跑一次，跟模組裡現在的題庫逐字比對，不一樣就結束碼 1 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..", "..");
const SITE = fs.existsSync(path.join(ROOT, "xiangqi-lab", "site", "core.js")) ? path.join(ROOT, "xiangqi-lab", "site") : path.join(ROOT, "..");
const C = require(path.join(SITE, "core.js"));
const MOD = path.join(ROOT, "xiangqi-db", "m", "07z9e-shijiao.js");
const SRC = fs.readFileSync(MOD, "utf8");
const CHECK = process.argv.includes("--check");
const a = SRC.indexOf("const JH_SJ_V="), b = SRC.indexOf("/* 題庫：");
if (a < 0 || b < a) { console.log("✘ 模組裡找不到 jhSjSee"); process.exit(1) }
const X = vm.runInNewContext(SRC.slice(a, b) + ";({jhSjSee,jhSjVal})");
const M0 = "/* ==JH_SJ_Q== */\n", M1 = "/* ==/JH_SJ_Q== */";
const uci = (sq) => String.fromCharCode(97 + sq % 9) + (9 - (sq / 9 | 0));

async function loadGm() {
  const i = process.argv.indexOf("--gm"), f = i > 0 ? process.argv[i + 1] : path.join(SITE, "data", "gmgames.json");
  let buf;
  if (fs.existsSync(f)) buf = fs.readFileSync(f);
  else {
    const B = "https://xiangqi-cdn.pages.dev/data/", P = await (await fetch(B + "gmgames.json.parts.json")).json(), bs = [];
    for (const x of P.parts) { const r = Buffer.from(await (await fetch(B + x.f)).arrayBuffer()); if (r.length !== x.size) throw Error(x.f + " 大小不對"); bs.push(r) }
    buf = Buffer.concat(bs);
    if (crypto.createHash("sha1").update(buf).digest("hex") !== P.sha1) throw Error("gmgames.json 接回後 sha1 對不上");
  }
  console.log("gmgames.json sha1 " + crypto.createHash("sha1").update(buf).digest("hex") + "（" + buf.length + " 位元組）");
  return JSON.parse(buf.toString("utf8")).items;
}
function level(r) {
  const n = r.pv.length, cap = r.pv.map((x) => ({ T: x.cap.toUpperCase(), v: x.val }));
  if (n >= 3 && n <= 4 && cap.some((x) => x.T === "C" || x.T === "R")) return 3;
  if (n >= 2 && n <= 3 && cap.some((x) => (x.T === "P" && x.v === 2) || x.T === "A" || x.T === "B")) return 2;
  if (n <= 2) return 1;
  return 0;
}
const ENG_F = path.join(__dirname, "shijiao-engine.json"), USE_ENG = process.argv.includes("--engine");
const ENG = fs.existsSync(ENG_F) ? JSON.parse(fs.readFileSync(ENG_F, "utf8")) : {};
const sc = (x) => x.mate != null ? (x.mate > 0 ? 30000 - x.mate : -30000 - x.mate) : x.cp;
/* 引擎：吃這一格（所有吃到 T 的著法）跟其他著法各搜一次，回傳紅方觀點的分數 */
async function engJudge(E, bd, T) {
  const L = C.legal(bd, "r"), capM = L.filter(([, t]) => t === T).map(([f, t]) => uci(f) + uci(t)), altM = L.filter(([, t]) => t !== T).map(([f, t]) => uci(f) + uci(t));
  if (!capM.length || !altM.length) return null;
  const fen = C.fen(bd).split(" ")[0], a = await E.analyse(fen, "r", { depth: 20, searchmoves: capM }), b = await E.analyse(fen, "r", { depth: 20, searchmoves: altM });
  return { cap: sc(a), alt: sc(b) };
}
(async () => {
  const E = USE_ENG ? await require("./zm-engine.js").engine() : null;
  const G = await loadGm(), N = G.length;
  const want = { 1: { y: 10, n: 10 }, 2: { y: 10, n: 10 }, 3: { y: 10, n: 10 } }, have = { 1: { y: 0, n: 0, y1: 0 }, 2: { y: 0, n: 0 }, 3: { y: 0, n: 0 } }, out = [];
  const seen = new Set(), pair = {};   /* pair：每一級同一種「誰吃誰」（第一步吃子方＋被吃的子）最多 3 題（PR #37 審查②：中級原本一半是兵吃卒） */
  const pairKey = (lv, r) => lv + ":" + r.pv[0].p.toUpperCase() + r.pv[0].cap.toUpperCase();   /* 不同對局常走到同一個開局局面：用「局面＋被捉的格子」去重 */
  const full = () => [1, 2, 3].every((l) => have[l].y >= want[l].y && have[l].n >= want[l].n);
  for (let k = 0; k < N && !full(); k++) {
    const gi = (k * 7919) % N, g = G[gi], main = g.lines && g.lines.find((x) => x.parent == null);
    if (g.board || !main) continue;
    let bd = C.parseFen(C.START), s = "r", got = null;
    for (let i = 0; i < Math.min(main.moves.length, 61) && !got; i++) {
      if (i >= 16 && i % 2 === 0 && !C.inCheck(bd, "r")) {
        const tgt = [...new Set(C.legal(bd, "r").filter(([f, t]) => bd[t] && bd[t].toUpperCase() !== "K").map(([, t]) => t))].sort((x, y) => x - y);
        for (const T of tgt) {
          const r = X.jhSjSee(C, bd, "r", T, true);
          if (!r || r.chk || r.v === 0 || r.pv.length > 4) continue;
          if (seen.has(C.fen(bd, "r") + "|" + T)) continue;
          const lv = level(r), ans = r.v > 0 ? "y" : "n";
          if (!lv || have[lv][ans] >= want[lv][ans]) continue;
          if (lv === 1 && ans === "y" && r.pv.length === 1 && have[1].y1 >= 4) continue;
          if ((pair[pairKey(lv, r)] || 0) >= 3) continue;
          const key = C.fen(bd, "r") + "|" + T;   /* W73：引擎條件 */
          if (!(key in ENG)) { if (!E) continue; ENG[key] = await engJudge(E, bd, T) }
          const e = ENG[key]; if (!e) continue;
          if (ans === "y" ? e.alt - e.cap > 50 : e.alt - e.cap < 100) continue;
          got = { lv, T, r, ans, ply: i };
          break;
        }
      }
      const [f, t] = main.moves[i];
      if (!bd[f] || C.sideOf(bd[f]) !== s || !C.legal(bd, s).some(([x, y]) => x === f && y === t)) break;
      if (!got) { bd = C.make(bd, f, t); s = C.opp(s) }
    }
    if (!got) continue;
    const { lv, T, r, ans, ply } = got;
    seen.add(C.fen(bd, "r") + "|" + T);
    pair[pairKey(lv, r)] = (pair[pairKey(lv, r)] || 0) + 1;
    have[lv][ans]++; if (lv === 1 && ans === "y" && r.pv.length === 1) have[1].y1++;
    out.push({ lv, fen: C.fen(bd, "r") + " - - 0 1", t: T, ans, v: r.v, pv: r.pv.map((x) => uci(x.f) + uci(x.t)), src: "gm" + gi + "@" + ply });
  }
  if (E) { E.quit(); const o = {}; for (const k of Object.keys(ENG).sort()) o[k] = ENG[k]; fs.writeFileSync(ENG_F, JSON.stringify(o, null, 0).replace(/,"/g, ",\n\"") + "\n"); console.log("引擎紀錄：" + Object.keys(o).length + " 盤") }
  if (!full()) { console.log("✘ 題目湊不齊：" + JSON.stringify(have)); process.exit(1) }
  /* 依難度排、同難度照找到的順序；id 依序編 */
  out.sort((x, y) => x.lv - y.lv);
  out.forEach((q, i) => { q.id = "s" + String(i + 1).padStart(2, "0") });
  const items = out.map(({ id, lv, fen, t, ans, v, pv, src }) => ({ id, lv, fen, t, ans, v, pv, src }));
  for (const q of items) console.log(q.id, "級" + q.lv, q.ans === "y" ? "吃  " : "不吃", String(q.v).padStart(5), q.pv.length + " 步", q.src);
  const block = M0 + "const JH_SJ_Q=[\n" + items.map((q) => JSON.stringify(q)).join(",\n") + "\n];\n" + M1;
  const i0 = SRC.indexOf(M0), i1 = SRC.indexOf(M1);
  if (i0 < 0 || i1 < i0) { console.log("✘ 模組裡找不到 JH_SJ_Q 標記"); process.exit(1) }
  const next = SRC.slice(0, i0) + block + SRC.slice(i1 + M1.length);
  if (CHECK) { const same = next === SRC; console.log(same ? "✔ 一樣：模組裡的題庫跟重跑結果逐字相同" : "✘ 不一樣：模組裡的題庫跟重跑結果不同"); process.exit(same ? 0 : 1) }
  fs.writeFileSync(MOD, next);
  console.log("✔ 寫回 " + path.relative(ROOT, MOD) + "（" + items.length + " 題）");
})().catch((e) => { console.error("✘", e.message || e); process.exit(1) });
