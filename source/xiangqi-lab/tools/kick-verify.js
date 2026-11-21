#!/usr/bin/env node
/* W45② 十州踢館令：相剋表 10 組定式的引擎核驗（不是測試，CI 不跑：要載入 50 MB 的 nnue，每組約十幾秒）。
   讀 xiangqi-db/m/07z9b-jianghu.js 裡的 JH_KICK，每一組：
     ・core.js 檢查雙方各三步都合法、走完的局面跟表裡的 fen 一樣
     ・App 自己的網頁版 Pikafish（網站根目錄 engine/pikafish.js＋.wasm＋.nnue，在 Node 裡跑；載入方式同 tools/engine-budget-check.js）
       Threads 1、Hash 64 MB、每組先 ucinewgame，固定深度搜尋；印出紅方觀點的分數（厘兵，100＝一兵）
   均勢的標準：|分數| ≤ 100（11/22 定稿時深度 18：+14～+61）。超過就印 ✘ 並以結束碼 1 結束。
   用法：node xiangqi-lab/tools/kick-verify.js [深度，預設 18] */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
/* 開發者電腦：xiangqi-lab/site；公開倉庫：source/ 的上一層就是網站根目錄 */
const SITE = fs.existsSync(path.join(ROOT, "xiangqi-lab", "site", "core.js")) ? path.join(ROOT, "xiangqi-lab", "site") : path.join(ROOT, ".."), EDIR = path.join(SITE, "engine");
const C = require(path.join(SITE, "core.js"));
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9b-jianghu.js"), "utf8");
const a = SRC.indexOf("const JH_KICK=["), b = SRC.indexOf("const jhKickK=");
if (a < 0 || b < a) { console.log("✘ 找不到 JH_KICK"); process.exit(1) }
const T = vm.runInNewContext(SRC.slice(a, b) + ";JH_KICK");
const DEPTH = +(process.argv[2] || 18), LIM = 100;
function line(mv) {
  let bd = C.parseFen(C.START.split(" ")[0]), s = "r"; const o = [];
  for (const u of mv) {
    const f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4));
    if (!bd[f] || C.sideOf(bd[f]) !== s || !C.legal(bd, s).some(([x, y]) => x === f && y === t)) return null;
    o.push(C.notate(bd, f, t)); bd = C.make(bd, f, t); s = C.opp(s);
  }
  return { cn: o.join(" "), fen: C.fen(bd, s).split(" ")[0], side: s };
}
(async () => {
  const PM = require(path.join(EDIR, "pikafish.js")), NNUE = fs.readFileSync(path.join(EDIR, "pikafish.nnue"));
  let W = [];
  const mod = await PM({ arguments: [], locateFile: (f) => path.join(EDIR, f), mainScriptUrlOrBlob: path.join(EDIR, "pikafish.js"), print: (l) => W.slice().forEach((w) => w(l)), printErr: () => {}, preRun: [(m) => m.FS.writeFile("/pikafish.nnue", NNUE)] });
  const send = (c) => mod.ccall("uci_command", null, ["string"], [c]);
  const until = (p, e) => new Promise((r) => { const w = (l) => { if (e) e(l); if (p(l)) { W = W.filter((x) => x !== w); r(l) } }; W.push(w) });
  const ask = (c, p, e) => { const q = until(p, e); send(c); return q };
  await ask("uci", (l) => l === "uciok"); send("setoption name Threads value 1"); send("setoption name Hash value 64"); await ask("isready", (l) => l === "readyok");
  let bad = 0;
  for (const k of T) {
    const mv = k.mv.split(" "), L = line(mv);
    if (!L || L.fen !== k.fen || L.side !== "r") { bad++; console.log("✘", k.a, "→", k.b, L ? "局面對不上" : "不合法"); continue }
    let v = null, d = 0;
    send("ucinewgame"); await ask("isready", (l) => l === "readyok");
    send("position startpos moves " + mv.join(" "));
    await ask("go depth " + DEPTH, (l) => l.startsWith("bestmove"), (l) => { const s = l.match(/ score (cp|mate) (-?\d+)/), dp = l.match(/ depth (\d+)/); if (s && l.includes(" pv ") && !l.includes("bound")) { v = s[1] === "mate" ? (+s[2] > 0 ? 30000 : -30000) : +s[2]; d = +dp[1] } });
    const ok = v != null && Math.abs(v) <= LIM; if (!ok) bad++;
    console.log(ok ? "✔" : "✘", k.a.padEnd(16), "→", k.b.padEnd(13), String(v).padStart(5), "深度" + d, L.cn);
  }
  console.log(bad ? `✘ ${bad} 組沒過` : `✔ ${T.length} 組都合法、局面對得上、|分數| ≤ ${LIM}`);
  process.exit(bad ? 1 : 0);
})();
