#!/usr/bin/env node
/* W48-S2 屏風馬門兩套題庫的建置腳本（不是測試，CI 不跑：要載入 50 MB 的 nnue，全部跑完要十幾分鐘）。
   產出：
     data/zmhall/screen-errata.json  課堂挑錯著 20 題（從 data/opening-school/screen.json 第 1～16 課的主線取材；第 17～22 課學生執紅，不用）
     data/zmhall/screen-abacus.json  算盤算帳 30 題（從大師對局 data/gmgames.json 第 20～40 手抽局面）
   引擎：App 自己的網頁版 Pikafish（網站根目錄 engine/，在 Node 裡跑；載入方式同 tools/kick-verify.js）
     Threads 1、Hash 64 MB、每次搜尋前 ucinewgame，固定深度 16，所以重跑結果一樣。分數一律換成厘兵（100＝一兵）。
   挑錯著的規則（Windows Claude 1 交辦單 W48-S2）：
     ・壞著是黑方（屏風馬方）的著法，索引 ≥3；壞著只用課程裡本來就有的錯著（錯著節點 err、各步的 bad 選項），引擎要算出比最佳著差 ≥150
     ・壞著後面接課程裡的續著（錯著節點 4 手、bad 選項 3 手），每一手都用 core.js 檢查合法；整串 6～14 手
     ・ok＝壞著前的局面裡跟最佳著差 ≤40 的著法（MultiPV 16 搜出來的），best＝最佳著，drop＝最佳著減壞著
     ・why 用課程的說法：錯著節點用課程原本那句；bad 選項用下面 WHY 表裡依課程寫的一句
   算盤算帳的規則：
     ・局面取自大師對局主線第 20～40 手、上一手沒有吃子、輪走方沒被將軍；分數是紅方觀點
     ・>+150 答 r，<−150 答 b，|分數|≤60 答 =，中間的不要；三種各 10 題，每盤棋最多一題
     ・子力：車 9、馬 4、炮 4.5、仕象各 2、兵 1、過河兵 2；子力差 ≥3 而且跟答案同方向寫 material，否則 position，均勢 even
   gmgames.json 很大，只放 CDN 而且切成兩塊：網站根目錄 data/ 底下沒有（或 --gm 沒指定）就照 CDN 的 gmgames.json.parts.json 下載接回、核對 sha1（只讀，不存檔）。
   用法：node xiangqi-lab/tools/screen-quiz-build.js            產生兩個檔
         node xiangqi-lab/tools/screen-quiz-build.js --check    重跑一次，跟倉庫裡的檔逐位元比對，不一樣就結束碼 1 */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..", "..");
/* 開發者電腦：xiangqi-lab/site；公開倉庫：source/ 的上一層就是網站根目錄 */
const SITE = fs.existsSync(path.join(ROOT, "xiangqi-lab", "site", "core.js")) ? path.join(ROOT, "xiangqi-lab", "site") : path.join(ROOT, ".."), EDIR = path.join(SITE, "engine");
const C = require(path.join(SITE, "core.js"));
const CHECK = process.argv.includes("--check");
const DEPTH = 16, V = "1122";
const OUT_E = path.join(SITE, "data", "zmhall", "screen-errata.json"), OUT_A = path.join(SITE, "data", "zmhall", "screen-abacus.json");

/* bad 選項的說明：鍵是「課程/例題/著法」，照該課在教什麼寫一句，不寫引擎分數 */
const WHY = {
  "screen_01/a/b7b4": "還有一匹馬在家就急著動炮，屏風馬要先把兩匹馬都跳到正位。",
  "screen_01/b/h7d7": "另一匹馬還沒跳就先調炮，中卒沒人保護，被中炮打掉。",
  "screen_02/a/c7b9": "正位馬又退回家，白白浪費一步，屏風馬也少了一匹。",
  "screen_02/b/g7h9": "正位馬退回家，屏風馬少一匹，前面出的子都白費了。",
  "screen_05/a/e6e5": "中卒挺出去就離開雙馬的保護，被中炮一口吃掉。",
  "screen_06/a/c7e8": "正位馬退到窩心，屏風馬拆掉了，出子也慢了一步。",
  "screen_04/a/g7e8": "紅車已經過河，正位馬卻退到窩心，屏風馬拆掉了。",
  "screen_07/a/c5c4": "三路卒衝過河沒人保護，被對方的兵吃掉。",
  "screen_08/a/b7b3": "炮衝到對方陣地沒有子保護，巡河車一橫過來就捉住它。",
  "screen_09/a/g5g4": "七路卒再往前衝就沒人保護，被對方的兵吃掉。",
  "screen_10/a/g6g5": "對方三兵正看著七路，卒挺上去就被兵吃掉。",
  "screen_11/a/b7b2": "炮衝進對方陣地，被中炮橫過來吃掉，出子變成送子。",
  "screen_12/a/b9a9": "車剛出到二路又退回邊上，等於少出一個子。",
  "screen_13/a/b7b9": "炮退回底線白走一步，讓對方先動手。",
  "screen_14/a/h7h2": "炮衝到對方車口，雙方兌掉車之後你白丟一個炮。",
  "screen_15/a/h7h4": "炮升到對方車口，兌掉車之後你白丟一個炮。",
  "screen_16/a/g9i7": "象飛到邊上不守中路，對方馬就順勢跳上來。",
  "screen_04/b/h9i9": "車離開八路，八路的炮沒人保護，被對方車吃掉。",
};

function play(mv) {
  let bd = C.parseFen(C.START), s = "r";
  for (const u of mv) {
    const f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4));
    if (!bd[f] || C.sideOf(bd[f]) !== s || !C.legal(bd, s).some(([x, y]) => x === f && y === t)) return null;
    bd = C.make(bd, f, t); s = C.opp(s);
  }
  return { bd, s };
}

let send, ask;
async function boot() {
  const PM = require(path.join(EDIR, "pikafish.js")), NNUE = fs.readFileSync(path.join(EDIR, "pikafish.nnue"));
  let W = [];
  const mod = await PM({ arguments: [], locateFile: (f) => path.join(EDIR, f), mainScriptUrlOrBlob: path.join(EDIR, "pikafish.js"), print: (l) => W.slice().forEach((w) => w(l)), printErr: () => {}, preRun: [(m) => m.FS.writeFile("/pikafish.nnue", NNUE)] });
  send = (c) => mod.ccall("uci_command", null, ["string"], [c]);
  const until = (p, e) => new Promise((r) => { const w = (l) => { if (e) e(l); if (p(l)) { W = W.filter((x) => x !== w); r(l) } }; W.push(w) });
  ask = (c, p, e) => { const q = until(p, e); send(c); return q };
  await ask("uci", (l) => l === "uciok"); send("setoption name Threads value 1"); send("setoption name Hash value 64"); await ask("isready", (l) => l === "readyok");
}
/* 回傳深度 DEPTH 那一層每條變化的 {mv, cp, pv}，cp 是輪走方觀點；殺棋換成 ±30000 */
async function search(pos, multipv, only) {
  send("setoption name MultiPV value " + multipv);
  send("ucinewgame"); await ask("isready", (l) => l === "readyok");
  send("position " + pos);
  const lines = new Map();
  await ask("go depth " + DEPTH + (only ? " searchmoves " + only : ""), (l) => l.startsWith("bestmove"), (l) => {
    if (!l.startsWith("info ") || !l.includes(" pv ") || l.includes("bound")) return;
    const d = +(l.match(/ depth (\d+)/) || [])[1], k = +(l.match(/ multipv (\d+)/) || [0, 1])[1], s = l.match(/ score (cp|mate) (-?\d+)/);
    if (!s) return;
    const cp = s[1] === "mate" ? (+s[2] > 0 ? 30000 : -30000) : +s[2], pv = l.split(" pv ")[1].trim().split(" ");
    lines.set(k, { d, mv: pv[0], cp, pv });
  });
  const all = [...lines.values()], top = Math.max(...all.map((x) => x.d));
  return all.filter((x) => x.d === top).sort((a, b) => b.cp - a.cp);
}

/* ── 課堂挑錯著 ── */
function candidates(ex) {
  /* 沿主線走，收集學生（黑方）可以犯錯的點：錯著節點、各步的 bad 選項 */
  const mv = [...ex.pre], out = [];
  let n = ex.root;
  while (n) {
    if (n.k === "err") { out.push({ at: mv.length, kind: "err", list: [{ bad: n.bad, l: n.l, why: n.w }] }); n = n.n }
    else if (n.k === "mv") {
      if (n.bad) out.push({ at: mv.length, kind: "bad", list: Object.keys(n.bad).sort().map((k) => ({ bad: k, l: n.bad[k].l, x: n.bad[k].x })) });
      const o = n.ok[n.h]; mv.push(n.h); if (o.r) mv.push(o.r); n = o.n;
    } else n = n.n;
  }
  return { line: mv, pts: out };
}
/* 壞著前局面的候選著：MultiPV 16；第 16 條還在最佳著 40 以內就加到 32，確保 ok 沒漏 */
async function okList(pre) {
  let top = await search("startpos moves " + pre.join(" "), 16);
  if (top.length === 16 && top[0].cp - top[15].cp <= 40) top = await search("startpos moves " + pre.join(" "), 32);
  return top;
}
/* 同一點有好幾個 bad 選項時，先試不丟大子的（看起來比較像會走的棋）：不吃虧的 → 丟卒 → 丟炮 → 丟馬；送車不用 */
const XORD = { "": 0, P: 1, C: 2, N: 3 };
async function errata(lessons) {
  const items = [], used = new Set(), cnt = {};
  /* 第一輪每課取例題 a，第二輪取例題 b、第三輪例題 c，湊滿 20 題 */
  for (let round = 0; round < 3 && items.length < 20; round++) {
    for (const L of lessons) {
      if (items.length >= 20) break;
      const ex = L.ex[round]; if (!ex) continue;
      const { line, pts } = candidates(ex);
      /* 錯著節點優先；再從主線深處往前找 */
      const order = pts.filter((p) => p.at % 2 === 1 && p.at >= 3).sort((a, b) => (a.kind === "err" ? 0 : 1) - (b.kind === "err" ? 0 : 1) || b.at - a.at);
      let got = null;
      for (const p of order) {
        const pre = line.slice(0, p.at), P0 = play(pre);
        if (!P0) continue;
        /* 動將帥的不用（不像會走的棋）；已經出過的壞著往後排，免得 20 題都是同一種錯 */
        const list = p.list.filter((c) => c.x !== "R" && (P0.bd[C.parseSq(c.bad.slice(0, 2))] || "").toUpperCase() !== "K").sort((a, b) => (cnt[a.bad] || 0) - (cnt[b.bad] || 0) || (XORD[a.x || ""] ?? 9) - (XORD[b.x || ""] ?? 9));
        let top = null;
        for (const c of list) {
          const mv = [...pre, c.bad, ...c.l];
          if (mv.length < 6 || mv.length > 14 || c.l.length < 2 || c.l.length > 4 || !play(mv)) continue;
          /* 不同課的主線可能走到同一個局面：用局面＋壞著去重 */
          const key = pre.join(" ") + "|" + c.bad; if (used.has(key)) continue;
          if (!top) top = await okList(pre);
          const best = top[0];
          let w = top.find((x) => x.mv === c.bad);
          if (!w) w = (await search("startpos moves " + pre.join(" "), 1, c.bad))[0];
          const drop = best.cp - w.cp;
          if (drop < 150 || Math.abs(best.cp) >= 20000) continue;
          const ok = top.filter((x) => best.cp - x.cp <= 40).map((x) => x.mv);
          const why = c.why || WHY[L.id + "/" + ex.id + "/" + c.bad] || "";
          got = { id: "", lesson: L.id, mv, wrong: p.at, ok, best: best.mv, drop, why, _src: L.id + "/" + ex.id + (p.kind === "err" ? " 錯著節點" : " bad 選項") + (c.x ? " 丟" + c.x : "") };
          used.add(key); cnt[c.bad] = (cnt[c.bad] || 0) + 1; break;
        }
        if (got) break;
      }
      if (got) { got.id = "e" + String(items.length + 1).padStart(2, "0"); items.push(got); console.log(got.id, got._src, got.mv.length + " 手", "壞著第 " + got.wrong + " 手 " + got.mv[got.wrong], "差 " + got.drop, "ok " + got.ok.join(","), got.why ? "" : "（缺 why）") }
      else console.log("  " + L.id + "/" + ex.id + " 找不到差 ≥150 的錯著");
    }
  }
  return items;
}

/* ── 算盤算帳 ── */
const MV = { R: 9, N: 4, C: 4.5, A: 2, B: 2, P: 1 };
function material(bd) {
  const m = { r: 0, b: 0 };
  for (let i = 0; i < 90; i++) {
    const p = bd[i]; if (!p) continue;
    const s = C.sideOf(p), T = p.toUpperCase(); if (T === "K") continue;
    let v = MV[T];
    if (T === "P" && (s === "r" ? (i / 9 | 0) <= 4 : (i / 9 | 0) >= 5)) v = 2;
    m[s] += v;
  }
  return m;
}
async function loadGm() {
  /* 本機有就用本機（--gm <檔> 可指定）；沒有就照 CDN 的分塊清單（gmgames.json.parts.json，超過 20 MB 的檔切塊存）下載接回，核對 sha1 */
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
async function abacus(G) {
  const want = { r: 10, b: 10, "=": 10 }, have = { r: 0, b: 0, "=": 0 }, items = [];
  const N = G.length;
  /* 用固定步長走過整個對局庫（跟 N 互質），每盤棋看一個固定的手數，所以重跑挑到的局面一樣 */
  for (let k = 0; k < N && items.length < 30; k++) {
    const gi = (k * 7919) % N, g = G[gi], main = g.lines && g.lines.find((x) => x.parent == null);
    if (g.board || !main || main.moves.length < 41) continue;
    const ply = 20 + (k * 13) % 21;
    let bd = C.parseFen(C.START), s = "r", okp = true, cap = false;
    for (let i = 0; i < ply; i++) {
      const [f, t] = main.moves[i];
      if (!bd[f] || C.sideOf(bd[f]) !== s || !C.legal(bd, s).some(([x, y]) => x === f && y === t)) { okp = false; break }
      cap = !!bd[t]; bd = C.make(bd, f, t); s = C.opp(s);
    }
    if (!okp || cap || C.inCheck(bd, s)) continue;
    const fen = C.fen(bd, s) + " - - 0 1";
    const r = (await search("fen " + fen, 1))[0];
    if (!r || Math.abs(r.cp) >= 20000) continue;
    const cp = s === "r" ? r.cp : -r.cp;
    const ans = cp > 150 ? "r" : cp < -150 ? "b" : Math.abs(cp) <= 60 ? "=" : null;
    if (!ans || have[ans] >= want[ans]) continue;
    const mat = material(bd), dm = mat.r - mat.b;
    const why = ans === "=" ? "even" : Math.abs(dm) >= 3 && (ans === "r" ? dm > 0 : dm < 0) ? "material" : "position";
    have[ans]++;
    items.push({ id: "a" + String(items.length + 1).padStart(2, "0"), fen, ans, cp, mat, why, src: "gm" + gi + "@" + ply });
    console.log(items.at(-1).id, ans, String(cp).padStart(5), why.padEnd(8), JSON.stringify(mat), g.year + " " + g.red + "－" + g.black, "第 " + ply + " 手");
  }
  if (items.length < 30) throw Error("算盤題只湊到 " + items.length + " 題：" + JSON.stringify(have));
  return items;
}

const dump = (items) => '{"v":"' + V + '","items":[\n' + items.map((x) => JSON.stringify(x)).join(",\n") + "\n]}\n";
(async () => {
  const t0 = Date.now();
  await boot();
  const S = JSON.parse(fs.readFileSync(path.join(SITE, "data", "opening-school", "screen.json"), "utf8"));
  /* 只用學生執黑的課（主線第一個練習點在奇數手） */
  const black = S.lessons.filter((L) => { const c = candidates(L.ex[0]); return c.pts.length && c.pts.every((p) => p.at % 2 === 1) });
  console.log("執黑的課 " + black.length + " 課：" + black.map((L) => L.id).join(" "));
  const E = await errata(black);
  if (E.length < 20) throw Error("挑錯著只湊到 " + E.length + " 題");
  const miss = E.filter((x) => !x.why);
  E.forEach((x) => delete x._src);
  const A = await abacus(await loadGm());
  const out = [[OUT_E, dump(E)], [OUT_A, dump(A)]];
  console.log("花了 " + Math.round((Date.now() - t0) / 1000) + " 秒");
  if (miss.length) { console.log("✘ 這幾題 bad 選項還沒寫 why（補進 WHY 表）：" + miss.map((x) => x.id + " " + x.lesson + " " + x.mv[x.wrong]).join("、")); process.exit(1) }
  if (CHECK) {
    let bad = 0;
    for (const [f, s] of out) { const same = fs.existsSync(f) && fs.readFileSync(f, "utf8") === s; if (!same) bad++; console.log((same ? "✔ 一樣 " : "✘ 不一樣 ") + path.relative(SITE, f)) }
    process.exit(bad ? 1 : 0);
  }
  fs.mkdirSync(path.dirname(OUT_E), { recursive: true });
  for (const [f, s] of out) { fs.writeFileSync(f, s); console.log("✔ 寫入 " + path.relative(SITE, f) + "（" + Buffer.byteLength(s) + " 位元組）") }
  process.exit(0);
})().catch((e) => { console.error("✘", e.message || e); process.exit(1) });
