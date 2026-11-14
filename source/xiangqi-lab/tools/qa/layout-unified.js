// 一鍵重跑「統一口徑」版面量測（第 17 輪改善 4）：依序（同一時間只開一個無頭瀏覽器）用 device-fit.js 量每一版，再用 layout-compare.js 對照。
//
// 用法（在 <專案根目錄> 下）：
//   node xiangqi-lab/tools/qa/layout-unified.js --out xiangqi-db/tools/review_loop/rounds/r17/layout \
//     --ver "0931=git:854ff3c" --ver "1942=git:3edc95c" --ver "本機=url:http://localhost:8821/xiangqi-lab/"（寫 commit，不要寫 origin/main：量的途中有新發布就會換版）
//   版本寫法：git:<ref>＝公開倉庫已發布檔（本機伺服器送出，不連正式站）；url:<網址>＝已經在跑的本機伺服器；local＝device-fit.js --local（m.html 現組）
//   --skip-measure：不重量，只拿 <out>/<代號>/device-fit.json 重新對照
//   --extra "本機,1942"：這幾版另外量新內容頁（觀星臺、西市；先寫 bhWin=1、主線 A1 禮包領過，觀星臺和西市才開），放 <out>/<代號>-extra/
// 每一版都是 21 種行動裝置 × 8 頁（device-fit.js --dev 21）。安全規則同 device-fit.js：每個分頁 xq_netRoot＝"xq_test"、用完即丟的瀏覽器設定。
"use strict";
const cp = require("child_process"), path = require("path"), fs = require("fs");
const HOME = path.join(__dirname, "..", "..", "..");
const argv = process.argv.slice(2), all = k => argv.map((a, i) => a === k ? argv[i + 1] : null).filter(Boolean), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const OUT = path.resolve(HOME, arg("--out", "xiangqi-db/tools/review_loop/rounds/r17/layout"));
const VERS = all("--ver").map(s => { const i = s.indexOf("="); return { label: s.slice(0, i), src: s.slice(i + 1) } });
const EXTRA = (arg("--extra", "") || "").split(",").filter(Boolean);
/* 新內容頁要先解鎖：觀星臺看 bhWin＞0、西市看主線 A1 禮包領過（07xsm xsmGot） */
const EXTRA_STORE = { bhWin: 1, mnq: { seg: {}, qte: {}, lamp: {}, gift: { a1: 1763000000000, a6: {} }, title: {}, clue: {}, page: [], music: [] } };
const FIT = path.join(__dirname, "device-fit.js"), CMP = path.join(__dirname, "layout-compare.js");
const log = (...a) => console.log(new Date().toLocaleTimeString("zh-TW", { hour12: false }), ...a);
function srcArgs(src, port) {
  if (src === "local") return ["--local", "--port", String(port)];
  if (src.startsWith("git:")) return ["--git", src.slice(4), "--port", String(port)];
  if (src.startsWith("url:")) return ["--url", src.slice(4)];
  throw new Error("版本寫法不對：" + src);
}
function run(args) {
  log("node", path.relative(HOME, FIT), args.join(" "));
  const r = cp.spawnSync(process.execPath, [FIT, ...args], { cwd: HOME, stdio: "inherit", windowsHide: true });
  if (r.status !== 0) log("⚠ device-fit 結束碼", r.status);
  return r.status;
}
if (!VERS.length) { console.error("至少一個 --ver 代號=來源"); process.exit(1) }
fs.mkdirSync(OUT, { recursive: true });
const runLog = { startedAt: new Date().toISOString(), vers: VERS, steps: [] };
let port = 8871;
if (!argv.includes("--skip-measure")) for (const V of VERS) {
  const t0 = Date.now(), dir = path.join(OUT, V.label);
  const st = run([...srcArgs(V.src, port++), "--dev", "21", "--outdir", dir]);
  runLog.steps.push({ label: V.label, src: V.src, dir, exit: st, sec: Math.round((Date.now() - t0) / 1000) });
  if (EXTRA.includes(V.label)) {
    const t1 = Date.now(), d2 = path.join(OUT, V.label + "-extra");
    const s2 = run([...srcArgs(V.src, port++), "--dev", "21", "--extra", "--page", "guanxing,ximarket", "--store", JSON.stringify(EXTRA_STORE), "--outdir", d2]);
    runLog.steps.push({ label: V.label + "-extra", src: V.src, dir: d2, exit: s2, sec: Math.round((Date.now() - t1) / 1000) });
  }
}
const cargs = [CMP, ...VERS.flatMap(V => ["--run", `${V.label}=${path.join(OUT, V.label)}`]), "--out", OUT, ...all("--ref").flatMap(r => ["--ref", r])];
cp.spawnSync(process.execPath, cargs, { cwd: HOME, stdio: "inherit", windowsHide: true });
const ex = VERS.filter(V => EXTRA.includes(V.label) && fs.existsSync(path.join(OUT, V.label + "-extra", "device-fit.json")));
if (ex.length) cp.spawnSync(process.execPath, [CMP, ...ex.flatMap(V => ["--run", `${V.label}=${path.join(OUT, V.label + "-extra")}`]), "--out", path.join(OUT, "extra"), "--page", "guanxing"], { cwd: HOME, stdio: "inherit", windowsHide: true });
runLog.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(OUT, "run-log.json"), JSON.stringify(runLog, null, 1));
log("全部完成", OUT);
