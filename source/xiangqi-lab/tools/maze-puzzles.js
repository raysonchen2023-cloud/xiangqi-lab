#!/usr/bin/env node
/* W87a（11/24）地底迷宮殘局題庫出題工具（不是測試，CI 不跑：要 Pikafish）。
   開發者 11/24（iMac Claude 1 轉）：「被暗匪抓住的聯續三題題目居然都一樣！請修正，而且都超簡單一步殺，這樣太無聊了」；
   之前的決定：第一層 2～3 步殺、照門派特色出題、Pikafish 驗證唯一解。
   做法：
     1. 從殘局題庫 data/canju/canju-set.json 挑「紅方先走、n 步殺（--n，預設 2,3）、主變 line 用 core.js 走完真的將死、最後一步是 --mate 指定的子（中炮門是炮 C）、
        全盤子數 ≤ --max-pieces」的題，照題號排；
     2. Pikafish（深度 --depth，預設 20）逐步核對：紅方每一步，所有合法著法裡「剩下步數內將死」的只有主變那一步（唯一解）；
        黑方每一步，主變的應著是「撐最久」的應法之一（不然題目的解答是在對方送死）；
     3. 照順序取 --door 題當石門、--trap 題當陷阱（石門優先取步數多的），寫進 --out 檔裡 /* ==JH_MZ_POOL:<名>== *\/ 那一段（const <名>={door:[…],trap:[…]}）。
   引擎結果記在 maze-puzzles-engine.json（局面＋走到第幾手 → 合格與否），沒有 PIKAFISH 時照紀錄重跑；--check 跟檔裡現在那一段逐字比對。
   用法：PIKAFISH=<pikafish 執行檔> node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_CENTRAL --out xiangqi-db/m/07z9m-maze.js --mate C --door 3 --trap 6
        --title-door "石門機關：炮的殺法" --title-trap "被暗匪逮住了" … 見下面 ARGS */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const SITE = fs.existsSync(path.join(ROOT, "xiangqi-lab", "site", "core.js")) ? path.join(ROOT, "xiangqi-lab", "site") : path.join(ROOT, "..");
const C = require(path.join(SITE, "core.js"));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d };
const ARGS = {
  name: arg("--name", "JH_MZ_POOL_CENTRAL"), out: arg("--out", path.join("xiangqi-db", "m", "07z9m-maze.js")), mate: arg("--mate", "C"),
  n: String(arg("--n", "2,3")).split(",").map(Number), maxPieces: +arg("--max-pieces", "16"), door: +arg("--door", "3"), trap: +arg("--trap", "6"), depth: +arg("--depth", "20"),
  tDoor: [arg("--title-door", "石門機關：炮的殺法"), arg("--title-door-en", "Stone door: a cannon's mate")],
  dDoor: [arg("--desc-door", "門上刻著一座拋石車。紅方先走，{n} 步將死黑方，門就會開。提示：炮要隔一個子才打得到。"), arg("--desc-door-en", "A catapult is carved on the door. Red to move: checkmate in {n} and the door opens. Hint: a cannon needs one piece to jump over.")],
  tTrap: [arg("--title-trap", "被暗匪逮住了"), arg("--title-trap-en", "Caught by a granary thief")],
  dTrap: [arg("--desc-trap", "暗匪把你按在糧袋堆旁：「解得開這局，就放你走。」紅方先走，{n} 步將死黑方。"), arg("--desc-trap-en", "The thief pins you by the grain sacks: \"Solve this and you can go.\" Red to move: checkmate in {n}.")],
};
const CHECK = process.argv.includes("--check");
const sq = (u) => [C.parseSq(u.slice(0, 2)), C.parseSq(u.slice(2, 4))];
const uci = (f, t) => C.iccs ? C.iccs(f, t) : "abcdefghi"[f % 9] + (9 - ((f / 9) | 0)) + "abcdefghi"[t % 9] + (9 - ((t / 9) | 0));
const board0 = (x) => C.parseFen(String(x.fen).split(" ")[0]);
/* 照主變走到第 k 手前的局面（回傳盤面與輪誰走）；主變有不合法的一步回 null */
function at(x, k) { let b = board0(x), s = "r"; for (let i = 0; i < k; i++) { const [f, t] = sq(x.line[i]); if (!b[f] || C.sideOf(b[f]) !== s || !C.legal(b, s).some((m) => m[0] === f && m[1] === t)) return null; b = C.make(b, f, t); s = C.opp(s) } return { b, s } }
function mated(x) { const L = x.line; if (!Array.isArray(L) || L.length !== 2 * x.n - 1) return false; const e = at(x, L.length); return !!e && C.inCheck(e.b, e.s) && C.legal(e.b, e.s).length === 0 }
const lastPiece = (x) => { const e = at(x, x.line.length - 1); return e ? String(e.b[sq(x.line[x.line.length - 1])[0]] || "").toUpperCase() : "" };
const fenOf = (b, s) => C.fen(b, s).split(" ")[0];

const ENG_F = path.join(__dirname, "maze-puzzles-engine.json");
const ENG = fs.existsSync(ENG_F) ? JSON.parse(fs.readFileSync(ENG_F, "utf8")) : {};
/* 一個局面的所有合法著法的分數（走方觀點；mate＞0＝走方 N 步殺，mate＜0＝被殺） */
async function allMoves(E, b, s) {
  const L = C.legal(b, s).map(([f, t]) => uci(f, t)), r = await E.analyse(fenOf(b, s), s, { depth: ARGS.depth, multipv: L.length });
  const o = {}; for (const l of r.lines) o[l.pv[0]] = { mate: l.mate, cp: l.cp };
  return { moves: L, sc: o };
}
/* 核對一題：紅方每一步唯一解、黑方應著撐最久。回傳 {ok, why}；結果記在 ENG（key＝起始局面＋主變） */
async function verify(E, x) {
  const key = String(x.fen).split(" ")[0] + "|" + x.line.join(" ") + "@" + ARGS.depth;
  if (key in ENG) return ENG[key];
  if (!E) return null;
  let res = { ok: true, why: "" };
  for (let k = 0; k < x.line.length && res.ok; k++) {
    const e = at(x, k), left = Math.ceil((x.line.length - k) / 2), A = await allMoves(E, e.b, e.s);
    if (A.moves.some((m) => !(m in A.sc))) { res = { ok: false, why: `第 ${k + 1} 手有著法沒分析到（multipv 不足）` }; break }
    if (e.s === "r") {
      const win = A.moves.filter((m) => A.sc[m].mate != null && A.sc[m].mate > 0 && A.sc[m].mate <= left);
      if (win.length !== 1 || win[0] !== x.line[k]) res = { ok: false, why: `第 ${k + 1} 手（紅）剩 ${left} 步內將死的著法是 ${win.join("、") || "沒有"}，不是只有 ${x.line[k]}` };
    } else {
      const ms = A.moves.map((m) => A.sc[m].mate).filter((v) => v != null && v < 0), worst = Math.min(...ms);
      if (A.sc[x.line[k]].mate !== worst) res = { ok: false, why: `第 ${k + 1} 手（黑）主變的應著不是撐最久的（${A.sc[x.line[k]].mate} 對 ${worst}）` };
    }
  }
  ENG[key] = res; return res;
}

(async () => {
  const D = JSON.parse(fs.readFileSync(path.join(SITE, "data", "canju", "canju-set.json"), "utf8"));
  const cand = D.items.filter((x) => x && x.side === "r" && ARGS.n.includes(x.n) && mated(x) && lastPiece(x) === ARGS.mate && board0(x).filter(Boolean).length <= ARGS.maxPieces)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  console.log(`候選 ${cand.length} 題（${ARGS.n.join("、")} 步殺、${ARGS.mate} 收尾、子數 ≤ ${ARGS.maxPieces}）`);
  const E = process.env.PIKAFISH && !CHECK ? await require("./zm-engine.js").engine() : null;
  const ok = [];
  for (const x of cand) { const r = await verify(E, x); if (!r) continue; console.log((r.ok ? "✔ " : "✘ ") + x.id + " " + x.n + " 步" + (r.ok ? "" : "：" + r.why)); if (r.ok) ok.push(x) }
  if (E) { E.quit(); const o = {}; for (const k of Object.keys(ENG).sort()) o[k] = ENG[k]; fs.writeFileSync(ENG_F, JSON.stringify(o, null, 0).replace(/\},"/g, "},\n\"") + "\n") }
  /* 石門取步數多的、陷阱取剩下的；同一題不重複 */
  const byN = [...ok].sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1)), door = byN.slice(0, ARGS.door), used = new Set(door.map((x) => x.id)), trap = ok.filter((x) => !used.has(x.id)).slice(0, ARGS.trap);
  if (door.length < ARGS.door || trap.length < ARGS.trap) { console.log(`✘ 題目不夠：石門 ${door.length}／${ARGS.door}、陷阱 ${trap.length}／${ARGS.trap}`); process.exit(1) }
  const fill = (t, n) => t.split("{n}").join(String(n));
  const item = (x, T, Dd) => ({ id: x.id, zh: [T[0], fill(Dd[0], x.n)], en: [T[1], fill(Dd[1], x.n)], fen: String(x.fen).split(" ")[0], line: x.line });
  const body = `const ${ARGS.name}={door:[\n${door.map((x) => JSON.stringify(item(x, ARGS.tDoor, ARGS.dDoor))).join(",\n")}],\ntrap:[\n${trap.map((x) => JSON.stringify(item(x, ARGS.tTrap, ARGS.dTrap))).join(",\n")}]};\n`;
  const M0 = `/* ==JH_MZ_POOL:${ARGS.name}== */\n`, M1 = `/* ==/JH_MZ_POOL:${ARGS.name}== */`, OUT = path.join(ROOT, ARGS.out), SRC = fs.readFileSync(OUT, "utf8"), i0 = SRC.indexOf(M0), i1 = SRC.indexOf(M1);
  if (i0 < 0 || i1 < i0) { console.log(`✘ ${ARGS.out} 裡找不到 ${M0.trim()} 那一段`); process.exit(1) }
  const next = SRC.slice(0, i0) + M0 + body + SRC.slice(i1);
  if (CHECK) { const same = next === SRC; console.log(same ? "✔ 一樣：檔裡的題庫跟重跑結果逐字相同" : "✘ 不一樣"); process.exit(same ? 0 : 1) }
  fs.writeFileSync(OUT, next); console.log(`✔ 寫回 ${ARGS.out}：石門 ${door.length} 題、陷阱 ${trap.length} 題`);
})().catch((e) => { console.error("✘ " + (e && e.message || e)); process.exit(1) });
