#!/usr/bin/env node
// 數學模型的「版本＋程式雜湊」紀錄（11/15 ChatGPT 第三次重評第五節、第六節 P2：給 skillPick 與驗證工具獨立版本，記錄固定方案與程式雜湊，
//   MXS 版本不變時也追得到建議程序的變更）。
// 記五樣東西，各有自己的版本號，互不代替：
//   mxs      影子模式的新準確度公式      版本 MXS.ver（m/05-settings.js）   雜湊：const MXS={ … mxShadowReport 那一段
//   pick     「建議先練」的判斷程序      版本 SK.PICK（m/04-stats.js）      雜湊：SK 的數字常數＋mxAxisPt … skillPick 那一段
//   compare  離線比較工具                版本 MXC_VER（tools/mx-compare.js） 雜湊：整支
//   sim      配對估計的模擬              版本 SIM_VER（tools/sim-phase-pair.js）雜湊：整支
//   docs     預先驗證方案（現行版＋已凍結的舊版）、外部公式參考                雜湊：整份文件
// 程式的雜湊先拿掉註解和行尾空白再算（SHA-256）：只改註解不用升版；改了任何算法或數字，雜湊就會變。文件的雜湊是整份（換行統一成 LF）。
// 用法：
//   node tools/mx-manifest.js           比對現在的檔案跟 tools/mx-manifest.json，列出哪裡不一樣（有不一樣就 exit 1）
//   node tools/mx-manifest.js --write   重寫 tools/mx-manifest.json。順序：先改程式 → 把對應的版本號加 1 → 跑這個。
//                                       方案改版時：新版另存一份檔（舊版不動）、在修訂紀錄寫理由，再把下面的 PLAN 指到新檔、跑這個。
// 測試 tools/test-mathmodel-80.js 會擋兩種情況：程式的雜湊變了但版本號沒變；版本號或文件變了但紀錄沒更新。
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DBD = path.join(LAB, "../xiangqi-db"), FILE = path.join(__dirname, "mx-manifest.json");
const PLAN = "story/數學模型_預先驗證方案_v1.1.md", PLAN_VER = "v1.1";   /* 現行的預先驗證方案 */
const DOCS = { plan: PLAN, planV1: "story/數學模型_預先驗證方案_v1.md", ref: "story/數學模型_外部公式參考.md" };
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), sha = s => crypto.createHash("sha256").update(s, "utf8").digest("hex");
/* 拿掉區塊註解、整行的 // 註解、行尾空白、空行（這幾段程式裡沒有含 "/*" 的字串或正規式） */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/\s+$/, "")).filter(l => l && !/^\s*\/\//.test(l)).join("\n");
const cut = (s, a, b, nm) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); if (i < 0 || j < i) throw new Error("找不到 " + nm); return s.slice(i, j) };
/* src（可省略）＝{settings, stats, compare, sim} 的原始碼字串，測試拿來試「改了程式」的情況 */
function compute(src) {
  src = src || {}; const S = src.settings || rd(path.join(DBD, "m/05-settings.js")), T = src.stats || rd(path.join(DBD, "m/04-stats.js")), out = {};
  const mxs = cut(S, "const MXS={", "\n/* 開發者模式才看得到：賽後報告並列新舊", "MXS…mxShadowReport"), cM = {}; vm.createContext(cM); vm.runInContext(cut(S, "const MXS={", "\nfunction mxAccDw(", "MXS") + ";this.v=MXS.ver", cM);
  out.mxs = { ver: cM.v, sha: sha(code(mxs)) };
  const skLine = cut(T, "const SK={", "\n", "SK"), num = Object.fromEntries([...skLine.matchAll(/([A-Z0-9]+):(-?[\d.]+)/g)].map(m => [m[1], +m[2]])), pick = cut(T, "function mxAxisPt(", "\n/* 開發者 11/11「下完一局", "mxAxisPt…skillPick");
  out.pick = { ver: num.PICK == null ? null : num.PICK, sk: num, sha: sha(JSON.stringify(num) + "\n" + code(pick)) };
  for (const [k, f, re] of [["compare", "mx-compare.js", /const MXC_VER = (\d+)/], ["sim", "sim-phase-pair.js", /const SIM_VER = (\d+)/]]) {
    const p = path.join(__dirname, f), s = src[k] || (fs.existsSync(p) ? rd(p) : null); out[k] = s == null ? null : { ver: +(re.exec(s) || [0, NaN])[1], sha: sha(code(s)) } }
  out.docs = { planVer: PLAN_VER }; for (const [k, f] of Object.entries(DOCS)) { const p = path.join(DBD, f); out.docs[k] = fs.existsSync(p) ? { file: f, sha: sha(rd(p)) } : null }
  return out;
}
/* 比對：回 [{part, kind, msg}]。kind "code"＝程式變了版本沒變；"stale"＝版本或文件變了、紀錄沒更新 */
function diff(now, rec) {
  const D = [], NM = { mxs: "新準確度公式（MXS.ver）", pick: "建議先練的判斷程序（SK.PICK）", compare: "離線比較工具（MXC_VER）", sim: "模擬（SIM_VER）" };
  for (const k of Object.keys(NM)) { const a = now[k], b = rec && rec[k]; if (!a) continue; if (!b) { D.push({ part: k, kind: "stale", msg: `${NM[k]}：紀錄裡沒有` }); continue }
    if (a.ver !== b.ver) D.push({ part: k, kind: "stale", msg: `${NM[k]}：版本 ${b.ver} → ${a.ver}，紀錄還沒更新（跑 mx-manifest.js --write）` });
    else if (a.sha !== b.sha) D.push({ part: k, kind: "code", msg: `${NM[k]}：程式變了，版本還是 ${a.ver}——改了算法或數字要先把版本加 1，再跑 mx-manifest.js --write` }) }
  for (const k of Object.keys(DOCS)) { const a = now.docs[k], b = rec && rec.docs && rec.docs[k]; if (!a) continue; if (!b || a.sha !== b.sha || a.file !== b.file) D.push({ part: "docs." + k, kind: "stale", msg: `${a.file}：內容跟紀錄的不一樣（方案改版要另存新檔、寫修訂紀錄，再跑 mx-manifest.js --write）` }) }
  return D;
}
function main() {
  const now = compute();
  if (process.argv.includes("--write")) { const old = fs.existsSync(FILE) ? JSON.parse(rd(FILE)) : null, D = diff(now, old).filter(d => d.kind === "code");
    if (D.length && !process.argv.includes("--force")) { for (const d of D) console.error("✖ " + d.msg); console.error("沒有寫入。（真的只是重排、沒有改算法：加 --force）"); process.exit(1) }
    fs.writeFileSync(FILE, JSON.stringify({ note: "由 tools/mx-manifest.js --write 產生，不要手改。", at: new Date().toISOString().slice(0, 10), ...now }, null, 1) + "\n"); console.log("寫好了：" + FILE) }
  const rec = fs.existsSync(FILE) ? JSON.parse(rd(FILE)) : null; if (!rec) { console.error("還沒有 mx-manifest.json，先跑 --write"); process.exit(1) }
  console.log(`MXS.ver ${now.mxs.ver}（${now.mxs.sha.slice(0, 12)}）｜SK.PICK ${now.pick.ver}（${now.pick.sha.slice(0, 12)}）｜MXC_VER ${now.compare ? now.compare.ver : "—"}｜SIM_VER ${now.sim ? now.sim.ver : "—"}｜方案 ${now.docs.planVer}（${now.docs.plan ? now.docs.plan.sha.slice(0, 12) : "沒有檔"}）`);
  const D = diff(now, rec); if (!D.length) { console.log("跟紀錄一致。"); return } for (const d of D) console.error("✖ " + d.msg); process.exit(1);
}
if (require.main === module) main();
module.exports = { compute, diff, code, FILE, PLAN, PLAN_VER, DOCS };
