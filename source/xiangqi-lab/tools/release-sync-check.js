#!/usr/bin/env node
// 象棋千秋：發布前「同版閘門」（評比第 16 輪改善清單第 1 項、第 17 輪 F1／F2：發布版、公開原始碼、驗證證據要同一版）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 對一份「要推上公開倉庫的候選版」（git 的某個 commit，或解開的資料夾）逐項核對，有一項不一致就以代碼 1 結束（發布工具看到非零就停）：
//   release          index.html、sw.js、release.json 三處版本號一樣、雜湊對得上（release-verify.js）→ 這一版的版本號 V
//   stage-manifest   source/STAGE-MANIFEST.json 記的版本是 V、記的 index.html 指紋跟候選版一樣（舊格式沒寫版本時，git 模式改查它記的 commit 的 index.html）
//   check-build      node source/check-build.js：source/ 組出來的 index.html 跟候選版逐字相同
//   verification-log source/ 裡只有一份驗證紀錄，而且是 verification-log-V.txt；紀錄寫的版本是 V、index.html 的 SHA-256 跟候選版一樣、每一步都是「通過」或「略過」
//   evidence         data/docs/evidence.md 標題是（版本 V），而且寫明「對應的發布版：`V`」（＝測試是對發布版的 source/ 跑的，不是開發者電腦上的工作區）
//   foss             data/docs/foss.md 寫的「對應的發布版：`V`」每一處都是 V
//   forbidden-files  公開的檔裡不能有：千秋盃裁判台 cup-host.js、金鑰與簽章檔（*.jks、*.keystore、*.p12、*.pfx、keystore.properties、signing.properties）、
//                    local.properties、mqtt-config.json、.env、開發者登入檔
//   private-lines    開發者刻意不發布的程式行不能出現在任何公開的文字檔：比對的是「去掉空白後的 SHA-256」，指紋檔只放開發者電腦
//                    （預設 <專案根目錄>/xiangqi-lab/release-guard/private-lines.json，不在 tools/、src/ 底下，oss-stage.js 不會帶出去）；
//                    找到只報檔名和行號，不印內容。外部沒有指紋檔時這一項「略過」；開發者發布時加 --require-private，沒有指紋檔就算失敗
//   secrets          node oss-scan.js source：金鑰、私鑰、密碼、token 掃描（找得到這支工具才跑）
//
// 用法：
//   node xiangqi-lab/tools/release-sync-check.js --git xiangqi-lab/site --ref <候選 commit> --require-private   發布前（commit-tree 做好、還沒 push）
//   node xiangqi-lab/tools/release-sync-check.js --dir <解開的倉庫資料夾>                                     核對一份解開的倉庫
//   node source/xiangqi-lab/tools/release-sync-check.js --dir .                                                外部在公開倉庫根目錄
//   其他：--json（印 JSON）  --skip a,b（略過某幾項，紀錄上會寫「指令略過」，不算通過）
//   產生私密指紋檔（開發者電腦，只印行數）：
//     node xiangqi-lab/tools/release-sync-check.js --make-private --from <本機模組> --base <發布版的同一支模組> --out <指紋檔>
//   發布前把 foss.md 的標記改成這一版：
//     node xiangqi-lab/tools/release-sync-check.js --stamp <版本> <foss.md>
// 結束代碼：全部通過（可以有略過）0；有不一致 1；用法錯誤、讀不到候選版 2。
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process"), crypto = require("crypto");
const HERE = __dirname;
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const sha1_12 = b => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
const VER_RE = /^\d{8}-\d{4}$/;
const MARK_RE = /對應的發布版：`(\d{8}-\d{4})`/g;
const DEFAULT_PRIVATE = path.join(HERE, "..", "..", "xiangqi-lab", "release-guard", "private-lines.json");
const TEXT_EXT = /\.(html?|js|mjs|cjs|json|md|txt|css|gs|py|sh|ps1|ya?ml|xml|gradle|properties|kts|java|kt|svg|csv|tsv|bat|cmd|toml|ini|cfg)$/i;
const FORBIDDEN = [
  { re: /(^|\/)cup-host\.js$/i, why: "千秋盃裁判台（營運程式）不公開" },
  { re: /\.(jks|keystore|p12|pfx)$/i, why: "金鑰／簽章檔" },
  { re: /(^|\/)(keystore|signing)\.properties$/i, why: "簽章設定（含密碼）" },
  { re: /(^|\/)local\.properties$/i, why: "本機 SDK 路徑設定" },
  { re: /(^|\/)mqtt-config\.json$/i, why: "MQTT 帳密" },
  { re: /(^|\/)\.env(\..+)?$/i, why: "環境變數檔" },
  { re: /(^|\/)\.xiangqi-[^/]*$/i, why: "開發者私密檔（金鑰、登入）" },
  { re: /(^|\/)\.last-version\.json$/i, why: "本機狀態" },
];
/* 去掉所有空白再算雜湊：縮排、換行方式、壓縮掉空白都抓得到 */
const normLine = s => String(s).replace(/\s+/g, "");
const lineHash = s => sha256("xq-private-line|" + normLine(s));
const MIN_LEN = 16;   /* 太短的行（例如一個大括號）不收進指紋，免得誤報 */

function walk(dir, rel = "", out = []) {
  let ents = [];
  try { ents = fs.readdirSync(path.join(dir, rel), { withFileTypes: true }) } catch (e) { return out }
  for (const e of ents) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) walk(dir, r, out); else if (e.isFile()) out.push(r);
  }
  return out;
}
const readOr = (p, d = null) => { try { return fs.readFileSync(p) } catch (e) { return d } };

/* ---------- 候選版來源：資料夾，或 git 某個 commit（git archive 解到暫存資料夾，不動倉庫的工作區、索引、分支） ---------- */
function fromGit(repo, ref) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xq-sync-"));
  const tar = path.join(tmp, "c.tar"), dir = path.join(tmp, "repo");
  fs.mkdirSync(dir);
  const r = cp.spawnSync("git", ["-C", repo, "-c", "core.autocrlf=false", "archive", "--format=tar", "-o", tar, ref], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("git archive 失敗：" + (r.stderr || "").trim());
  const t = cp.spawnSync("tar", ["-xf", path.join("..", "c.tar")], { cwd: dir, encoding: "utf8" });   /* 用相對路徑：GNU tar 會把「C:」當成遠端主機 */
  if (t.status !== 0) throw new Error("tar 解開失敗：" + (t.stderr || "").trim());
  fs.rmSync(tar, { force: true });
  const commit = cp.execFileSync("git", ["-C", repo, "rev-parse", ref + "^{commit}"], { encoding: "utf8" }).trim();
  return { dir, tmp, commit, repo };
}

/* ---------- 各項核對 ---------- */
function checkAll(o) {
  const D = o.dir, C = [], skip = new Set(o.skip || []);
  const add = (id, ok, msg, extra) => C.push(Object.assign({ id, ok: !!ok, msg }, extra || {}));
  const skipped = (id, msg) => C.push({ id, ok: true, skipped: true, msg });
  const want = id => { if (skip.has(id)) { skipped(id, "指令略過（--skip）：這一項沒有核對"); return false } return true };
  const P = (...a) => path.join(D, ...a);
  const files = walk(D);
  let V = null;

  /* release */
  {
    let RV = null; try { RV = require(path.join(HERE, "release-verify.js")) } catch (e) { }
    const f = { "index.html": readOr(P("index.html")), "sw.js": readOr(P("sw.js")), "release.json": readOr(P("release.json")) };
    if (!RV) add("release", false, "找不到 release-verify.js（要跟這支放同一個資料夾）");
    else {
      const r = RV.check(f); let R = null; try { R = JSON.parse(f["release.json"].toString("utf8")) } catch (e) { }
      V = R && VER_RE.test(R.version || "") ? R.version : null;
      add("release", r.ok && !!V, r.checks.map(c => (c.ok ? "✔ " : "✘ ") + c.msg).join("\n"));
    }
  }
  const html = readOr(P("index.html"));
  const htmlSha1 = html ? sha1_12(html) : null, htmlSha256 = html ? sha256(html) : null;

  /* stage-manifest */
  if (want("stage-manifest")) {
    const raw = readOr(P("source", "STAGE-MANIFEST.json"));
    let M = null; try { M = raw && JSON.parse(raw.toString("utf8")) } catch (e) { }
    if (!M) add("stage-manifest", false, "source/STAGE-MANIFEST.json 不存在或不是 JSON：公開原始碼沒有寫它是從哪一版切出來的");
    else if (M.version || M.indexSha1) {
      const okV = M.version === V, okH = !M.indexSha1 || M.indexSha1 === htmlSha1;
      add("stage-manifest", okV && okH, `STAGE-MANIFEST.json：版本 ${M.version || "（沒寫）"}、index.html 指紋 ${M.indexSha1 || "（沒寫）"}；候選版 ${V || "?"}、${htmlSha1 || "?"}` + (okV && okH ? "，一致" : "，不一致：source/ 不是這一版切出來的"));
    } else if (o.repo && M.commit) {
      let h = null; try { h = cp.execFileSync("git", ["-C", o.repo, "show", M.commit + ":index.html"], { maxBuffer: 256e6, stdio: ["ignore", "pipe", "ignore"] }) } catch (e) { }
      const ok = !!h && sha1_12(h) === htmlSha1;
      add("stage-manifest", ok, `STAGE-MANIFEST.json 沒寫版本（舊格式），改查它記的 commit ${String(M.commit).slice(0, 12)} 的 index.html：` + (h ? `指紋 ${sha1_12(h)}，候選版 ${htmlSha1}` + (ok ? "，一致" : "，不一致：source/ 是別一版切出來的") : "這個 commit 在倉庫裡找不到"));
    } else add("stage-manifest", false, "STAGE-MANIFEST.json 沒寫版本也沒有可查的 commit（要用新版 oss-stage.js 重產 source/）");
  }

  /* check-build */
  if (want("check-build")) {
    if (!fs.existsSync(P("source", "check-build.js"))) add("check-build", false, "source/check-build.js 不存在");
    else {
      const r = cp.spawnSync(process.execPath, [P("source", "check-build.js")], { cwd: D, encoding: "utf8", maxBuffer: 64e6 });
      add("check-build", r.status === 0, `node source/check-build.js → 結束代碼 ${r.status}\n` + ((r.stdout || "") + (r.stderr || "")).trim().split("\n").slice(-6).map(s => s.split(D).join("<倉庫資料夾>")).join("\n"));
    }
  }

  /* verification-log */
  if (want("verification-log")) {
    const logs = files.filter(f => /^source\/verification-log-[^/]+\.txt$/.test(f));
    const mine = "source/verification-log-" + V + ".txt";
    if (!V) add("verification-log", false, "沒有版本號，無法核對");
    else if (!logs.includes(mine)) add("verification-log", false, `source/ 裡沒有 ${mine}（現有：${logs.join("、") || "無"}）：驗證紀錄不是這一版的`);
    else {
      const s = fs.readFileSync(P(mine), "utf8"), bad = [];
      if (logs.length > 1) bad.push("source/ 裡還有別版的驗證紀錄：" + logs.filter(x => x !== mine).join("、") + "（只能留這一版的，免得看錯）");
      if (!s.includes("release.json：版本 " + V)) bad.push("紀錄裡寫的 release.json 版本不是 " + V);
      const m = s.match(/^\s*index\.html\s+([0-9a-f]{64})/m);
      if (!m) bad.push("紀錄裡找不到 index.html 的 SHA-256");
      else if (m[1] !== htmlSha256) bad.push(`紀錄裡的 index.html SHA-256 ${m[1].slice(0, 16)}…，候選版是 ${String(htmlSha256).slice(0, 16)}…`);
      const steps = [...s.matchAll(/^第 \d+ 步 (\S+)：(\S+?)（/gm)].map(x => [x[1], x[2]]);
      if (!steps.length) bad.push("紀錄裡沒有任何一步的結果");
      for (const [st, res] of steps) if (res !== "通過" && res !== "略過") bad.push(`第 ${st} 步是「${res}」`);
      add("verification-log", !bad.length, bad.length ? bad.join("\n") : `${mine}：版本 ${V}、index.html SHA-256 一致、${steps.length} 步都是通過或略過（${steps.map(x => x[0] + "：" + x[1]).join("、")}）`);
    }
  }

  /* evidence、foss：「對應的發布版：`V`」 */
  const marks = (rel, label, extra) => {
    const b = readOr(P(rel));
    if (!b) return add(label, false, rel + " 不存在");
    const s = b.toString("utf8"), got = [...s.matchAll(MARK_RE)].map(m => m[1]), bad = [];
    if (!got.length) bad.push(`${rel} 沒有寫「對應的發布版：\`版本\`」`);
    const off = got.filter(v => v !== V);
    if (off.length) bad.push(`${rel} 寫的對應發布版是 ${[...new Set(off)].join("、")}，候選版是 ${V}`);
    if (extra) extra(s, bad);
    add(label, !bad.length, bad.length ? bad.join("\n") : `${rel}：${got.length} 處都寫對應發布版 ${V}`);
  };
  if (want("evidence")) marks("data/docs/evidence.md", "evidence", (s, bad) => {
    const h = (s.match(/^# 驗證紀錄（版本 (\d{8}-\d{4})）/m) || [])[1];
    if (h !== V) bad.push(`evidence.md 標題的版本是 ${h || "（找不到）"}，候選版是 ${V}`);
  });
  if (want("foss")) marks("data/docs/foss.md", "foss");

  /* forbidden-files */
  if (want("forbidden-files")) {
    const hit = [];
    for (const f of files) for (const R of FORBIDDEN) if (R.re.test(f)) { hit.push(`${f}（${R.why}）`); break }
    add("forbidden-files", !hit.length, hit.length ? "公開的檔裡有不該公開的：\n" + hit.join("\n") : `掃 ${files.length} 個檔：沒有裁判台、金鑰、簽章設定、帳密檔`);
  }

  /* private-lines */
  if (want("private-lines")) {
    const pf = o.privateFile || DEFAULT_PRIVATE;
    let PL = null; try { PL = JSON.parse(fs.readFileSync(pf, "utf8")) } catch (e) { }
    if (!PL || !Array.isArray(PL.hashes) || !PL.hashes.length) {
      if (o.requirePrivate) add("private-lines", false, "找不到私密指紋檔（--require-private）：沒辦法確認刻意不發布的程式行沒有被帶出去");
      else skipped("private-lines", "沒有私密指紋檔（只在開發者電腦上），這一項略過");
    } else {
      const H = new Set(PL.hashes), hits = [];
      let n = 0;
      for (const f of files) {
        if (!TEXT_EXT.test(f)) continue;
        const b = readOr(P(f)); if (!b || b.length > 64e6 || b.includes(0)) continue;
        n++;
        const L = b.toString("utf8").split("\n");
        for (let i = 0; i < L.length; i++) { const t = normLine(L[i]); if (t.length >= MIN_LEN && H.has(lineHash(t))) hits.push(`${f} 第 ${i + 1} 行`) }
      }
      add("private-lines", !hits.length, hits.length ? `刻意不發布的程式行出現在公開的檔（只列位置）：\n${hits.join("\n")}` : `掃 ${n} 個文字檔：${PL.hashes.length} 行刻意不發布的程式（${PL.label || "指紋檔"}）都沒有出現`);
    }
  }

  /* secrets */
  if (want("secrets")) {
    const scan = path.join(HERE, "oss-scan.js");
    if (!fs.existsSync(scan) || !fs.existsSync(P("source"))) skipped("secrets", "找不到 oss-scan.js 或 source/，這一項略過");
    else {
      const r = cp.spawnSync(process.execPath, [scan, P("source")], { encoding: "utf8", maxBuffer: 64e6 });
      add("secrets", r.status === 0, `node oss-scan.js source → 結束代碼 ${r.status}\n` + ((r.stdout || "") + (r.stderr || "")).trim().split("\n").slice(-4).map(s => s.split(D).join("<倉庫資料夾>")).join("\n"));
    }
  }
  return { ok: C.every(c => c.ok), version: V, checks: C };
}

/* ---------- 私密指紋檔：from 有、base 沒有的行（去掉空白比對），只存雜湊、只印行數 ---------- */
function makePrivate(from, base, out, label) {
  const L = f => fs.readFileSync(f, "utf8").split("\r\n").join("\n").split("\n");
  const pub = new Set(L(base).map(normLine));
  const lines = L(from).filter(s => normLine(s).length >= MIN_LEN && !pub.has(normLine(s)));
  const J = { schema: "xq-private-lines/1", label: label || path.basename(from), madeAt: new Date().toISOString(), note: "去掉空白後 SHA-256（前綴 xq-private-line|）；只存雜湊，不存內容。這個檔不要放進任何公開的資料夾", hashes: [...new Set(lines.map(lineHash))] };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(J, null, 1) + "\n");
  return J.hashes.length;
}

/* ---------- foss.md 的標記改成這一版 ---------- */
function stamp(file, V) {
  const s = fs.readFileSync(file, "utf8");
  if (!s.match(MARK_RE)) throw new Error(file + " 裡沒有「對應的發布版：`版本`」標記");
  fs.writeFileSync(file, s.replace(MARK_RE, "對應的發布版：`" + V + "`"));
}

module.exports = { checkAll, fromGit, makePrivate, stamp, lineHash, normLine, walk, MARK_RE, FORBIDDEN };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  try {
    if (a.includes("--make-private")) {
      const from = opt("--from"), base = opt("--base"), out = opt("--out");
      if (!from || !base || !out) { console.log("用法：--make-private --from <本機模組> --base <發布版的同一支> --out <指紋檔> [--label 說明]"); process.exit(2) }
      const n = makePrivate(from, base, out, opt("--label"));
      console.log(`寫好 ${out}：${n} 行（只存雜湊）`); process.exit(0);
    }
    if (a.includes("--stamp")) {
      const V = opt("--stamp"), f = a[a.indexOf("--stamp") + 2];
      if (!VER_RE.test(V || "") || !f) { console.log("用法：--stamp <YYYYMMDD-HHMM> <foss.md>"); process.exit(2) }
      stamp(f, V); console.log(`${f}：對應的發布版改成 ${V}`); process.exit(0);
    }
    const dir = opt("--dir"), repo = opt("--git"), ref = opt("--ref") || "origin/main";
    if (!dir && !repo) { console.log("用法：node release-sync-check.js --git <倉庫> --ref <commit> | --dir <資料夾>  [--require-private] [--private <指紋檔>] [--skip a,b] [--json]"); process.exit(2) }
    let src, tmp = null;
    if (repo) { const g = fromGit(repo, ref); tmp = g.tmp; src = { dir: g.dir, repo, commit: g.commit } }
    else { if (!fs.existsSync(path.join(dir, "index.html"))) { console.log("找不到 " + path.join(dir, "index.html")); process.exit(2) } src = { dir: path.resolve(dir) } }
    let r;
    try { r = checkAll(Object.assign({}, src, { requirePrivate: a.includes("--require-private"), privateFile: opt("--private"), skip: String(opt("--skip") || "").split(",").filter(Boolean) })) }
    finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }) }
    if (a.includes("--json")) console.log(JSON.stringify(Object.assign({ source: repo ? `${repo}（git ${ref} = ${src.commit}）` : "<倉庫資料夾>" }, r), null, 1));
    else {
      console.log("同版閘門：" + (repo ? `git ${ref}（${src.commit.slice(0, 12)}）` : "<倉庫資料夾>") + "，候選版 " + (r.version || "?"));
      for (const c of r.checks) console.log(`\n${c.skipped ? "－" : c.ok ? "✔" : "✘"} ${c.id}\n` + c.msg.split("\n").map(s => "    " + s).join("\n"));
      console.log(r.ok ? "\n✔ 發布版、source/、驗證紀錄、evidence.md、foss.md 同一版，可以發布" : "\n✘ 版本不一致或有不該公開的東西：不准發布（結束代碼 1）");
    }
    process.exit(r.ok ? 0 : 1);
  } catch (e) { console.log("讀取失敗：" + e.message); process.exit(2) }
}
