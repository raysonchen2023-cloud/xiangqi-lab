#!/usr/bin/env node
"use strict";
// 每日同題公開對照工具（評比第 15 輪 X5，評審 P68.2、P02.9、P12.5、P07.7）：讓任何人用公開倉庫（source/ 的程式＋data/ 的資料）核對
// 「每天出的題是照公開規則算出來的、出過的題沒有被偷改」。不連網、不用裝套件，Node.js 20 以上。
//
//   node verify-daily.js                    全部核對：① 用程式（07dq-daily.js）重算名冊檔 data/daily-roster.json 裡的每一天，題號、編號、份量都要一樣
//                                           ② 名冊（DQ.GEN 每一批、DQ.DROP 下架）跟名冊檔記的一樣 ③ 題庫 data/canju/canju-set.json 裡那幾題的內容雜湊跟名冊檔記的一樣
//   node verify-daily.js --date 2026-11-20  只看那一天：份量、候選題數、前 28 天跳過哪些題、雜湊最小的是哪題、題目內容雜湊
//   node verify-daily.js --changes          列出名冊的每一批（新一批從哪天起生效、各幾題）和每一筆下架
//   node verify-daily.js --diff 舊.json [新.json] [--as-of 2027-03-01]   比對兩版名冊檔（新的省略＝現在這份）：哪幾天的題變了；只准從「新加的一批／新下架」
//                                           生效那天起變，而且 --as-of（新版發布那天，預設今天臺灣日期）和以前的日子一天都不准變
//                                           （檔名也可以寫 git:<版本>，例如 git:HEAD~3，從公開倉庫的歷史拿 data/daily-roster.json）
//   node verify-daily.js --history          在公開倉庫（git）裡把 data/daily-roster.json 的每一版依序兩兩比對（上面那個 --diff，發布那天＝提交日期）
//   node verify-daily.js --write            （開發者）照程式重產名冊檔；內容只看程式和題庫，同樣的輸入每次產生一模一樣的檔
// 選項：--src <07dq-daily.js 或已發布的 index.html>（預設 source 裡的 xiangqi-db/m/07dq-daily.js）、--data <data 資料夾>、--roster <名冊檔>、--json（印原始結果）
// 結束代碼：0＝全部對得上；1＝有對不上的（印 ✖ 和原因）。
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto"), cp = require("child_process");

const TO_DEFAULT = "2029-12-31";
const sha = s => crypto.createHash("sha256").update(s, "utf8").digest("hex");
/* 正規化 JSON：物件的鍵照字母排序（題庫檔換縮排、換鍵的順序，雜湊不變） */
const canon = x => Array.isArray(x) ? "[" + x.map(canon).join(",") + "]" : x && typeof x === "object" ? "{" + Object.keys(x).sort().map(k => JSON.stringify(k) + ":" + canon(x[k])).join(",") + "}" : JSON.stringify(x === undefined ? null : x);
/* 題目內容雜湊：q＝題面（題號、局面 FEN、輪到誰、幾步殺）；a＝答案（主線 line、應法樹 tree）。各取 SHA-256 前 16 個十六進位字 */
const HM = new WeakMap(), memo = (x, k, f) => { let m = HM.get(x); if (!m) HM.set(x, m = {}); return m[k] || (m[k] = f()) };
const qHash = x => memo(x, "q", () => sha(canon([x.id, x.fen, x.side, x.n])).slice(0, 16));
const aHash = x => memo(x, "a", () => sha(canon([x.line || null, x.tree || null])).slice(0, 16));

/* 找檔：開發者電腦（xiangqi-lab/tools）、source/run-tests.js 的暫存配置、公開倉庫（source/xiangqi-lab/tools → 倉庫根目錄的 data/）都認得 */
function findData(arg) {
  const c = arg ? [path.resolve(arg)] : [path.join(__dirname, "..", "site", "data"), path.join(__dirname, "..", "..", "..", "data")];
  for (const d of c) if (fs.existsSync(path.join(d, "canju", "canju-set.json"))) return d;
  throw new Error("找不到 data 資料夾（要有 canju/canju-set.json），用 --data 指定。找過：" + c.join("、"));
}
function findSrc(arg) {
  const c = arg ? [path.resolve(arg)] : [path.join(__dirname, "..", "..", "xiangqi-db", "m", "07dq-daily.js")];
  for (const f of c) if (fs.existsSync(f)) return f;
  throw new Error("找不到每日同題程式 07dq-daily.js，用 --src 指定（也可以給已發布的 index.html）。找過：" + c.join("、"));
}
/* 從程式檔（或組好的 index.html）切出「名冊＋挑題」那一段：const DQ={ … 到「成績」那一段之前。只執行這段純函式，不碰畫面、存檔 */
function loadDQ(text) {
  const s = String(text).replace(/\r\n/g, "\n"), a = s.indexOf("const DQ={"), b = s.indexOf("/* ---------- 成績 ---------- */", a);
  if (a < 0 || b < 0) throw new Error("程式裡找不到每日同題的名冊（const DQ={ … /* ---------- 成績 ---------- */）");
  const code = s.slice(a, b);
  const ctx = { Date, Math, JSON, Set, Map, Object, Array, String, Number, isNaN, decodeURIComponent };
  vm.createContext(ctx); vm.runInContext(code + "\n;this.X={DQ,dqToday,dqNo,dqSlot,dqAdd,dqHash,dqIds,dqBestId,dqPickId,dqRosterFrom}", ctx, { filename: "07dq-daily.js（名冊與挑題）" });
  return { X: ctx.X, code, codeHash: sha(code) };
}
const idsOf = (g, s) => String(g[s] || "").split(/\s+/).filter(Boolean);
/* 名冊摘要：每一批的生效日、三種份量各幾題、題號清單的雜湊；下架清單；整份名冊的雜湊 */
function rosterSummary(DQ) {
  const gen = (DQ.GEN || []).map(g => ({ from: g.from, sip: idsOf(g, "sip").length, cup: idsOf(g, "cup").length, pot: idsOf(g, "pot").length, h: sha(canon(["sip", "cup", "pot"].map(s => idsOf(g, s)))).slice(0, 16) }));
  const drop = (DQ.DROP || []).map(d => ({ id: d.id, from: d.from }));
  return { gen, drop, rosterHash: sha(canon({ gen: (DQ.GEN || []).map(g => [g.from, ...["sip", "cup", "pot"].map(s => idsOf(g, s))]), drop: drop.map(d => [d.id, d.from]) })) };
}
/* 照程式產生名冊檔的內容（不含產生時間，同樣的程式＋題庫每次一模一樣） */
function build(src, bank, to) {
  const { X } = src, DQ = X.DQ, by = new Map(bank.items.map(x => [x.id, x])), days = [];
  for (let k = DQ.EPOCH; k <= to; k = X.dqAdd(k, 1)) {
    const id = X.dqPickId(k), x = id && by.get(id);
    days.push([k, X.dqNo(k), X.dqSlot(k), id || null, x ? qHash(x) : null, x ? aHash(x) : null]);
  }
  const sum = rosterSummary(DQ);
  return {
    v: 1,
    about: "象棋千秋「每日同題」公開名冊：從第一天起每天（臺灣日期）出哪一題。任何人可以用 source/xiangqi-lab/tools/verify-daily.js 照公開的程式重算、核對題目內容沒被改，並用 git 歷史比對每一版（過去的日子不准變）。說明見 data/docs/daily.md 第 10 節。",
    epoch: DQ.EPOCH, to, norep: DQ.NOREP,
    rule: "份量照星期（臺灣日期）：週一二 sip 一口、週三到五 cup 一盞、週六日 pot 一壺。那天可出的題＝名冊 gen 裡生效日 ≤ 那天的每一批合起來、扣掉 drop 裡生效日 ≤ 那天的；挑 dqHash(\"日期|題號\") 最小的，前 norep 天同份量排第一的題跳過。",
    hash: { q: "SHA-256(正規化 JSON [題號, fen, side, n]) 前 16 字", a: "SHA-256(正規化 JSON [line, tree]) 前 16 字", rosterHash: "SHA-256(正規化 JSON {gen:[[生效日, 一口題號[], 一盞題號[], 一壺題號[]]…], drop:[[題號, 生效日]…]})" },
    gen: sum.gen, drop: sum.drop, rosterHash: sum.rosterHash,
    cols: ["日期", "編號", "份量", "題號", "題面雜湊 q", "答案雜湊 a"],
    days, daysHash: sha(canon(days))
  };
}
/* 名冊檔寫成好讀又好比對（git diff 一天一行）的格式 */
function stringify(R) {
  const head = Object.assign({}, R); delete head.days; delete head.daysHash;
  const lines = JSON.stringify(head, null, 1).replace(/\n}$/, "");
  return lines + ",\n \"days\": [\n" + R.days.map(d => "  " + JSON.stringify(d)).join(",\n") + "\n ],\n \"daysHash\": " + JSON.stringify(R.daysHash) + "\n}\n";
}
/* 核對：回傳 {ok, bad:[原因…], notes:[…], n} */
function verify(src, bank, R) {
  const bad = [], notes = [], X = src.X, by = new Map(bank.items.map(x => [x.id, x]));
  if (!R || R.v !== 1 || !Array.isArray(R.days)) return { ok: false, bad: ["名冊檔格式不對（v 要是 1、要有 days）"], notes, n: 0 };
  if (sha(canon(R.days)) !== R.daysHash) bad.push("名冊檔的 days 跟它自己記的 daysHash 對不上（檔案被改過、或只改了一部分）");
  if (R.epoch !== X.DQ.EPOCH) bad.push(`第一天不一樣：名冊檔 ${R.epoch}、程式 ${X.DQ.EPOCH}`);
  const sum = rosterSummary(X.DQ);
  if (sum.rosterHash !== R.rosterHash) {
    bad.push("程式裡的名冊（DQ.GEN／DQ.DROP）跟名冊檔記的不一樣：" + diffGen(R, sum));
  }
  if (R.norep !== X.DQ.NOREP) bad.push(`不重複天數不一樣：名冊檔 ${R.norep}、程式 ${X.DQ.NOREP}`);
  let n = 0, lastK = null;
  for (const d of R.days) {
    const [k, no, slot, id, qh, ah] = d; n++;
    if (lastK && X.dqAdd(lastK, 1) !== k) bad.push(`日期沒有一天接一天：${lastK} 之後是 ${k}`); lastK = k;
    const id2 = X.dqPickId(k), no2 = X.dqNo(k), s2 = X.dqSlot(k);
    if (id2 !== id || no2 !== no || s2 !== slot) { bad.push(`${k}：名冊檔寫 #${no} ${slot} ${id}，程式算出來是 #${no2} ${s2} ${id2}`); continue }
    const x = by.get(id);
    if (!x) { bad.push(`${k}：題庫裡找不到 ${id}`); continue }
    if (!x.tree || !(x.n > 0)) bad.push(`${k}：${id} 沒有解答樹`);
    if (qHash(x) !== qh) bad.push(`${k}：${id} 的題面（局面、輪到誰、幾步殺）跟名冊檔記的不一樣（記 ${qh}、現在 ${qHash(x)}）`);
    if (aHash(x) !== ah) bad.push(`${k}：${id} 的答案（主線、應法樹）跟名冊檔記的不一樣（記 ${ah}、現在 ${aHash(x)}）`);
  }
  if (R.days.length && R.days[0][0] !== X.DQ.EPOCH) bad.push("名冊檔不是從第一天開始");
  notes.push(`核對 ${n} 天（${R.epoch}～${R.to}），名冊 ${sum.gen.length} 批、下架 ${sum.drop.length} 筆，程式那段的雜湊 ${src.codeHash.slice(0, 16)}`);
  return { ok: !bad.length, bad, notes, n };
}
function diffGen(R, sum) {
  const o = [], A = R.gen || [], B = sum.gen;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const a = A[i], b = B[i];
    if (!a) o.push(`程式多了第 ${i + 1} 批（${b.from} 起）`); else if (!b) o.push(`程式少了第 ${i + 1} 批（${a.from} 起）`);
    else if (canon(a) !== canon(b)) o.push(`第 ${i + 1} 批不同（名冊檔 ${a.from} ${a.sip}/${a.cup}/${a.pot} ${a.h}；程式 ${b.from} ${b.sip}/${b.cup}/${b.pot} ${b.h}）`);
  }
  if (canon(R.drop || []) !== canon(sum.drop)) o.push(`下架清單不同（名冊檔 ${JSON.stringify(R.drop || [])}；程式 ${JSON.stringify(sum.drop)}）`);
  return o.join("；") || "（摘要相同，題號細節不同）";
}
/* 兩版名冊檔比對：變了的日子、名冊的變更；只准從新一批／新下架生效那天起變。asOf＝新版發布那天（臺灣日期）：那天和以前的日子一天都不准變（已經出過了） */
function diff(A, B, asOf) {
  const bad = [], notes = [], ch = [];
  const ga = A.gen || [], gb = B.gen || [];
  for (let i = 0; i < ga.length; i++) if (!gb[i] || canon(ga[i]) !== canon(gb[i])) bad.push(`舊的第 ${i + 1} 批（${ga[i].from} 起）被改掉或拿掉了（名冊只准往後加）`);
  const newGen = gb.slice(ga.length);
  for (const g of newGen) ch.push(`新的一批：${g.from} 起，一口 ${g.sip}、一盞 ${g.cup}、一壺 ${g.pot} 題`);
  const key = d => d.id + "|" + d.from, da = new Set((A.drop || []).map(key)), db = new Set((B.drop || []).map(key));
  for (const k of da) if (!db.has(k)) bad.push(`下架紀錄 ${k} 被拿掉了（只准往後加）`);
  const newDrop = (B.drop || []).filter(d => !da.has(key(d)));
  for (const d of newDrop) ch.push(`下架：${d.id}，${d.from} 起不再出`);
  const eff = [...newGen.map(g => g.from), ...newDrop.map(d => d.from)].sort()[0] || null;
  const mb = new Map(B.days.map(d => [d[0], d])), changed = [];
  for (const d of A.days) { const e = mb.get(d[0]); if (!e) continue; if (canon(d) !== canon(e)) changed.push([d, e]) }
  for (const [d, e] of changed) {
    const what = d[3] !== e[3] ? `題 ${d[3]} → ${e[3]}` : d[4] !== e[4] ? `${d[3]} 題面雜湊變了` : d[5] !== e[5] ? `${d[3]} 答案雜湊變了` : "編號或份量變了";
    if (d[3] !== e[3] || d[1] !== e[1] || d[2] !== e[2]) { if (!eff || d[0] < eff) bad.push(`${d[0]}：${what}（這天早於新的一批／下架的生效日 ${eff || "（沒有新的一批）"}，不准變）`); else if (asOf && d[0] <= asOf) bad.push(`${d[0]}：${what}（新版發布那天 ${asOf} 以前已經出過的題，不准變）`); else notes.push(`${d[0]}：${what}`) }
    else bad.push(`${d[0]}：${what}（同一題的內容改了；要換題請下架再加新的一批）`);
  }
  if (A.days.length && B.days.length && B.days[0][0] !== A.days[0][0]) bad.push("第一天不一樣");
  const extra = B.days.length - A.days.length;
  if (eff && asOf) { const d7 = new Date(Date.parse(asOf + "T12:00:00Z") + 7 * 864e5).toISOString().slice(0, 10); if (eff < d7) notes.unshift(`⚠ 新的一批／下架 ${eff} 起生效，離發布那天 ${asOf} 不到 7 天（建議至少 7 天，讓新程式先傳到大家手機上）`) }
  return { ok: !bad.length, bad, notes, changes: ch, changedDays: changed.length, effective: eff, extendedDays: extra > 0 ? extra : 0, asOf: asOf || null };
}
/* 一天的詳細算法（給人看） */
function explain(src, bank, k) {
  const X = src.X, DQ = X.DQ, s = X.dqSlot(k), P = X.dqIds(k, s), id = X.dqPickId(k), by = new Map(bank.items.map(x => [x.id, x])), x = id && by.get(id);
  const skip = [];
  for (let i = 1; i <= DQ.NOREP; i++) { const j = X.dqAdd(k, -i); if (j < DQ.EPOCH) break; if (X.dqSlot(j) !== s) continue; const r = X.dqBestId(X.dqIds(j, s), j, null); if (r && P.includes(r) && !skip.includes(r)) skip.push(r) }
  const top = P.map(i => [i, X.dqHash(k + "|" + i)]).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 5);
  return { date: k, no: X.dqNo(k), slot: s, slotName: (DQ.SLOT[s] || [])[0], candidates: P.length, skipped: skip, top, pick: id, q: x ? qHash(x) : null, a: x ? aHash(x) : null, title: x && x.src ? x.src.title || "" : "" };
}
const readJSON = f => JSON.parse(fs.readFileSync(f, "utf8"));
/* git:<版本> → 從 data 資料夾所在的 git 倉庫拿那一版的 data/daily-roster.json */
function readRoster(spec, dataDir) {
  if (/^git:/.test(spec)) {
    const top = cp.execFileSync("git", ["-C", dataDir, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const rel = path.relative(top, path.join(dataDir, "daily-roster.json")).split(path.sep).join("/");
    return JSON.parse(cp.execFileSync("git", ["-C", top, "show", spec.slice(4) + ":" + rel], { encoding: "utf8", maxBuffer: 64e6 }));
  }
  return readJSON(path.resolve(spec));
}
function history(dataDir) {
  const top = cp.execFileSync("git", ["-C", dataDir, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const rel = path.relative(top, path.join(dataDir, "daily-roster.json")).split(path.sep).join("/");
  const tw = t => new Date(Date.parse(t) + 8 * 36e5).toISOString().slice(0, 10);   /* 提交時間換成臺灣日期 */
  const revs = cp.execFileSync("git", ["-C", top, "log", "--reverse", "--format=%H %cI", "--", rel], { encoding: "utf8" }).trim().split("\n").filter(Boolean).map(l => l.split(" ")).map(([h, t]) => [h, tw(t)]);
  return { top, rel, revs };
}

module.exports = { loadDQ, build, stringify, verify, diff, explain, qHash, aHash, canon, rosterSummary, findData, findSrc, TO_DEFAULT };

if (require.main === module) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null }, has = k => argv.includes(k);
  let code = 0;
  try {
    const dataDir = findData(opt("--data")), srcFile = findSrc(opt("--src")), rosterFile = path.resolve(opt("--roster") || path.join(dataDir, "daily-roster.json"));
    const src = loadDQ(fs.readFileSync(srcFile, "utf8")), bank = readJSON(path.join(dataDir, "canju", "canju-set.json"));
    const out = (o, txt) => console.log(has("--json") ? JSON.stringify(o) : txt);
    if (has("--write")) {
      const R = build(src, bank, opt("--to") || (fs.existsSync(rosterFile) ? readJSON(rosterFile).to : TO_DEFAULT));
      fs.writeFileSync(rosterFile, stringify(R)); console.log(`寫好 ${rosterFile}（${R.days.length} 天，名冊 ${R.gen.length} 批）`);
    } else if (opt("--date")) {
      const e = explain(src, bank, opt("--date")), R = fs.existsSync(rosterFile) ? readJSON(rosterFile) : null, row = R && R.days.find(d => d[0] === e.date);
      out(e, `${e.date}（#${e.no}，${e.slotName}）：候選 ${e.candidates} 題；前 ${src.X.DQ.NOREP} 天同份量第一順位、今天跳過：${e.skipped.join(" ") || "無"}\n` +
        `雜湊最小的前 5 題：${e.top.map(([i, h]) => i + "(" + h + ")").join("、")}\n挑到：${e.pick}${e.title ? "（" + e.title + "）" : ""}；題面雜湊 ${e.q}、答案雜湊 ${e.a}\n` +
        (row ? (row[3] === e.pick && row[4] === e.q && row[5] === e.a ? "✔ 跟名冊檔一樣" : `✖ 名冊檔寫的是 ${row[3]} ${row[4]} ${row[5]}`) : "（名冊檔沒有這一天）"));
      if (row && !(row[3] === e.pick && row[4] === e.q && row[5] === e.a)) code = 1;
    } else if (has("--changes")) {
      const S = rosterSummary(src.X.DQ);
      out(S, S.gen.map((g, i) => `第 ${i + 1} 批：${g.from} 起，一口 ${g.sip}、一盞 ${g.cup}、一壺 ${g.pot} 題（題號雜湊 ${g.h}）`).join("\n") + "\n" +
        (S.drop.length ? S.drop.map(d => `下架：${d.id}，${d.from} 起不再出`).join("\n") : "下架：（沒有）") + `\n名冊雜湊 ${S.rosterHash.slice(0, 16)}`);
    } else if (opt("--diff")) {
      const i = argv.indexOf("--diff"), j = argv[i + 2] && !/^--/.test(argv[i + 2]) ? argv[i + 2] : rosterFile, A = readRoster(argv[i + 1], dataDir), B = readRoster(j, dataDir), r = diff(A, B, opt("--as-of") || src.X.dqToday());
      out(r, [...r.changes, `變了的日子 ${r.changedDays} 天${r.effective ? "（新的一批／下架從 " + r.effective + " 起生效）" : ""}${r.extendedDays ? "，新增 " + r.extendedDays + " 天" : ""}`, ...r.notes.slice(0, 40), ...r.bad.map(b => "✖ " + b), r.ok ? "✔ 過去的日子都沒變" : "✖ 有不准變的地方被改了"].join("\n"));
      if (!r.ok) code = 1;
    } else if (has("--history")) {
      const H = history(dataDir);
      if (!H.revs.length) console.log(`git 歷史裡還沒有 ${H.rel}（還沒發布過）`);
      for (let j = 1; j < H.revs.length; j++) {
        const A = readRoster("git:" + H.revs[j - 1][0], dataDir), B = readRoster("git:" + H.revs[j][0], dataDir), r = diff(A, B, H.revs[j][1]);
        console.log(`${H.revs[j - 1][1]} ${H.revs[j - 1][0].slice(0, 7)} → ${H.revs[j][1]} ${H.revs[j][0].slice(0, 7)}：${r.ok ? "✔" : "✖"} ${[...r.changes, "變了 " + r.changedDays + " 天", ...r.bad].join("；")}`);
        if (!r.ok) code = 1;
      }
      if (H.revs.length === 1) console.log(`只有一版（${H.revs[0][1]} ${H.revs[0][0].slice(0, 7)}），沒有可以比的`);
    } else {
      const R = readJSON(rosterFile), r = verify(src, bank, R);
      out(r, [...r.notes, ...r.bad.slice(0, 50).map(b => "✖ " + b), r.bad.length > 50 ? `……還有 ${r.bad.length - 50} 項` : "", r.ok ? `✔ 名冊檔 ${path.basename(rosterFile)} 跟程式算的、題庫裡的題目內容都一樣` : "✖ 對不上"].filter(Boolean).join("\n"));
      if (!r.ok) code = 1;
    }
  } catch (e) { console.error("✖ " + (e && e.message || e)); code = 1 }
  process.exitCode = code;
}
