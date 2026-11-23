#!/usr/bin/env node
/* W73 門派題庫的引擎驗證小工具（2026-11-23，iMac Claude 1）：用本機的 Pikafish（UCI）算局面，給 shunpao-build.js、shijiao-build.js 產生引擎紀錄。
   不是測試、CI 不跑（CI 沒有引擎）：引擎結果寫進倉庫的 *-engine.json，出題腳本照紀錄排除題目，--check 仍然逐字可重現。
   設定照 Windows Claude 1 的驗證（Pikafish 2026-09-06、Threads 4、Hash 256、nnue sha256 前 16 碼 7d13d73569a9b571）。
   用法（模組）：const E = await engine({ bin, nnue }); await E.analyse(fen, turn, { depth, searchmoves, multipv }); E.quit();
     fen＝本專案 core.js 的盤面字串（紅在下、只有盤面）；turn＝"r"／"b"。回傳 { mate, cp, pv, bestmove }，分數是輪走方的觀點；mate＝k 是輪走方 k 步殺、負的是被殺。
   引擎位置：環境變數 PIKAFISH（執行檔）、PIKAFISH_NNUE（預設跟執行檔同一個資料夾的 pikafish.nnue）。 */
"use strict";
const cp = require("child_process"), path = require("path"), fs = require("fs");

async function engine({ bin = process.env.PIKAFISH, nnue = process.env.PIKAFISH_NNUE, threads = 4, hash = 256 } = {}) {
  if (!bin || !fs.existsSync(bin)) throw new Error("找不到 Pikafish 執行檔：設環境變數 PIKAFISH");
  nnue = nnue || path.join(path.dirname(bin), "pikafish.nnue");
  const p = cp.spawn(bin, [], { cwd: path.dirname(bin), stdio: ["pipe", "pipe", "ignore"] });
  let buf = "", waiters = [];
  p.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); for (const w of waiters.slice()) w(l) } });
  const send = (s) => p.stdin.write(s + "\n");
  const until = (re, onLine) => new Promise((res) => { const w = (l) => { if (onLine) onLine(l); if (re.test(l)) { waiters = waiters.filter((x) => x !== w); res(l) } }; waiters.push(w) });
  send("uci"); await until(/^uciok/);
  send(`setoption name Threads value ${threads}`); send(`setoption name Hash value ${hash}`); send(`setoption name EvalFile value ${nnue}`);
  send("isready"); await until(/^readyok/);
  async function analyse(fen, turn, { depth = 22, searchmoves = null, multipv = 1 } = {}) {
    send("ucinewgame"); send(`setoption name MultiPV value ${multipv}`); send("isready"); await until(/^readyok/);
    send(`position fen ${fen} ${turn === "r" ? "w" : "b"} - - 0 1`);
    const lines = {};
    const done = until(/^bestmove/, (l) => {
      const m = /^info .*\bdepth (\d+).*\bmultipv (\d+).*\bscore (cp|mate) (-?\d+).*\bpv (.+)$/.exec(l) || /^info .*\bdepth (\d+)()().*\bscore (cp|mate) (-?\d+).*\bpv (.+)$/.exec(l);
      if (!m || /\b(?:lowerbound|upperbound)\b/.test(l)) return;
      const k = +(m[2] || 1); lines[k] = { depth: +m[1], [m[3]]: +m[4], pv: m[5].split(" ") };
    });
    send(`go depth ${depth}` + (searchmoves ? " searchmoves " + searchmoves.join(" ") : ""));
    const best = await done;
    const out = Object.keys(lines).sort((a, b) => a - b).map((k) => ({ mate: lines[k].mate ?? null, cp: lines[k].cp ?? null, pv: lines[k].pv, depth: lines[k].depth }));
    return { ...(out[0] || {}), lines: out, bestmove: best.split(" ")[1] };
  }
  return { analyse, quit: () => { send("quit"); p.stdin.end() } };
}
/* 本專案的格號（0＝左上 a9，紅在下）↔ UCI 著法（a0～i9，紅方底線是 0） */
const sq = (i) => "abcdefghi"[i % 9] + (9 - ((i / 9) | 0));
const uci = (f, t) => sq(f) + sq(t);
module.exports = { engine, uci, sq };
