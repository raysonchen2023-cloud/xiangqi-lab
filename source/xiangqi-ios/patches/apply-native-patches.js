#!/usr/bin/env node
/* 原生 App 需要的小修補（改 xiangqi-db/m/*.js 和 xiangqi-lab/src/net.js）。
   這支「預設只檢查、不改檔」；確定要套用時才加 --apply。說明見 patches/README.md。
   用法（在 myClaude 底下任何地方都可以跑）：
     node xiangqi-ios/patches/apply-native-patches.js            檢查每個修補：找得到／已套用／找不到（原始檔改過了）
     node xiangqi-ios/patches/apply-native-patches.js --apply    套用（只改「找得到」的；每改一個檔就 node --check，失敗就還原）
     node xiangqi-ios/patches/apply-native-patches.js --only N1,N2
   套用後要照平常流程：node xiangqi-lab/tools/build-site.js → 測試 → 發布（網頁版也會帶著這些修補，但 window.XQ_NATIVE 只有原生 App 會是 true，網頁版行為不變）。
   注意：xiangqi-db/m/*.js 常有別的代理在改，套用前先確認沒人正在改同一支。 */
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "..", "..");
const args = process.argv.slice(2), APPLY = args.includes("--apply");
const ONLY = (() => { const i = args.indexOf("--only"); return i >= 0 ? new Set(String(args[i + 1] || "").split(",")) : null; })();

const P = [
  {
    id: "N1", need: "必要", file: "xiangqi-lab/src/net.js",
    why: "原生 App 的網址是 http://127.0.0.1:47821，會被當成「電腦本機測試」而一律進測試房 xqlab-test-local；原生 App 的玩家要進正式大廳",
    find: 'if(ROOT==="xqlab-r7k2q/v1"&&(/^(localhost|127\\.|\\[::1\\]|192\\.168\\.|10\\.)/.test(h)',
    repl: 'if(ROOT==="xqlab-r7k2q/v1"&&!(typeof window!=="undefined"&&window.XQ_NATIVE===true)&&(/^(localhost|127\\.|\\[::1\\]|192\\.168\\.|10\\.)/.test(h)',
  },
  {
    id: "N2", need: "必要", file: "xiangqi-db/m/05-settings.js",
    why: "reportPlayer() 看到 127.x 就不送玩家登記；原生 App 要照網頁版的規則（可在設定關掉、家長關大廳不送）",
    find: 'if(/^(localhost|127\\.|\\[::1\\])/.test(location.hostname))return;',
    repl: 'if(!window.XQ_NATIVE&&/^(localhost|127\\.|\\[::1\\])/.test(location.hostname))return;',
  },
  {
    id: "N3", need: "必要", file: "xiangqi-db/m/05b-save.js",
    why: "fnTest() 看到 127.x 就當測試機：新手流程、卡關訊號、健康摘要都會被標成測試或不送；原生 App 不是測試機",
    find: 'localStorage.getItem("xq_netRoot")!=null||/^(localhost|127\\.|\\[::1\\])|\\.localhost$/.test(location.hostname)',
    repl: 'localStorage.getItem("xq_netRoot")!=null||(!window.XQ_NATIVE&&/^(localhost|127\\.|\\[::1\\])|\\.localhost$/.test(location.hostname))',
  },
  {
    id: "N4", need: "建議", file: "xiangqi-db/m/05-settings.js",
    why: "「關於 → 檢查更新」在原生 App 沒有 service worker，會顯示「沒有網路」；改成說明由 App Store 更新",
    find: 'async function updCheck(b){b.disabled=true;b.textContent="檢查中…";',
    repl: 'async function updCheck(b){if(window.XQ_NATIVE){b.disabled=true;b.textContent="新版由 App Store 更新";return}b.disabled=true;b.textContent="檢查中…";',
  },
  {
    id: "N5", need: "建議", file: "xiangqi-db/m/05-settings.js",
    why: "「刪除這支手機的全部資料」時，順便取消原生的每日提醒通知",
    find: 'try{window.XQNet&&XQNet.forget&&XQNet.forget()}catch(e){}',
    repl: 'try{window.XQNet&&XQNet.forget&&XQNet.forget()}catch(e){}try{window.XQNative&&XQNative.daily&&XQNative.daily.disable()}catch(e){}',
  },
];

let bad = 0;
const byFile = new Map();
for (const p of P) {
  if (ONLY && !ONLY.has(p.id)) continue;
  const fp = path.join(ROOT, ...p.file.split("/"));
  if (!fs.existsSync(fp)) { console.log(`✘ ${p.id} 找不到檔案 ${p.file}`); bad++; continue; }
  const s = byFile.has(fp) ? byFile.get(fp) : fs.readFileSync(fp, "utf8");
  const nFind = s.split(p.find).length - 1, nRepl = s.split(p.repl).length - 1;
  let st;
  if (nRepl >= 1) st = "已套用";
  else if (nFind === 1) st = "找得到";
  else if (nFind === 0) { st = "找不到（原始檔改過了，請照 README 手動改）"; bad++; }
  else { st = `找到 ${nFind} 處（不唯一，請手動改）`; bad++; }
  console.log(`${st === "找得到" ? "•" : st === "已套用" ? "✔" : "✘"} ${p.id}［${p.need}］${p.file}：${st}\n    ${p.why}`);
  if (APPLY && st === "找得到") byFile.set(fp, s.replace(p.find, p.repl));
  else if (!byFile.has(fp)) byFile.set(fp, s);
}
if (APPLY) {
  for (const [fp, s] of byFile) {
    const old = fs.readFileSync(fp, "utf8");
    if (old === s) continue;
    if (/\r/.test(s) && !/\r/.test(old)) { console.log("✘ 不寫 " + fp + "：會多出 CR"); continue; }
    fs.writeFileSync(fp, s);
    const r = cp.spawnSync(process.execPath, ["--check", fp], { encoding: "utf8" });
    if (r.status !== 0) { fs.writeFileSync(fp, old); console.log("✘ " + fp + " 改完語法檢查失敗，已還原：\n" + r.stderr); bad++; }
    else console.log("✔ 已寫入並通過 node --check：" + path.relative(ROOT, fp));
  }
} else console.log("\n（只檢查，沒有改任何檔。要套用加 --apply）");
process.exitCode = bad ? 1 : 0;
