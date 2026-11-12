#!/usr/bin/env node
// 新手流失漏斗（開發者 11/8 核准）：讀 collect-anon.js（或 lobby-bots.js）收到的匿名新手流程，算每一步還剩幾 %、中位數秒數
// 用法：node xiangqi-lab/tools/onboard-funnel.js            正式資料 xiangqi-db/onboard-funnel.jsonl
//       node xiangqi-lab/tools/onboard-funnel.js --test     測試資料 onboard-funnel.test.jsonl（本機、test1 房間、test:1）
//       --file 某個.jsonl 指定檔案；加 --days 7 只看最近 7 天開始的裝置；--ver 20261108 只看這個版本開頭的
// 同一台裝置（iid）會收到好幾筆（每多一步送一次整份），取步驟最多的那筆。
"use strict";
const fs = require("fs"), path = require("path");
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
const TEST = argv.includes("--test"), DAYS = +opt("--days") || 0, VER = opt("--ver") || "";
const FILE = opt("--file") || path.join(__dirname, "..", "..", "xiangqi-db", TEST ? "onboard-funnel.test.jsonl" : "onboard-funnel.jsonl");
const STEPS = [["open", "打開"], ["pre", "預載完成"], ["fw", "秒開局出現"], ["fw2", "秒開局走對或跳過"], ["pick", "選角完成"], ["pro", "序幕看完"], ["home", "進首頁"], ["g1", "第一盤開始"], ["g1e", "第一盤下完"]];
if (!fs.existsSync(FILE)) { console.log("還沒有資料：" + FILE); process.exit(0) }
const by = {};
for (const ln of fs.readFileSync(FILE, "utf8").split("\n")) {
  if (!ln.trim()) continue; let r; try { r = JSON.parse(ln) } catch (e) { continue }
  if (!r || !r.iid || !r.s) continue; if (!TEST && r.test) continue; if (VER && !String(r.ver || "").startsWith(VER)) continue;
  const o = by[r.iid]; if (!o || Object.keys(r.s).length >= Object.keys(o.s).length) by[r.iid] = { ...r, first: o ? o.first : r.at }
}
let D = Object.values(by); if (DAYS) D = D.filter(r => Date.now() - r.first <= DAYS * 864e5);
const val = (r, k) => k === "fw2" ? (r.s.fwok != null ? r.s.fwok : r.s.fwskip) : r.s[k];
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2) };
const fmt = s => s == null ? "—" : s < 120 ? s + " 秒" : s < 7200 ? (s / 60).toFixed(1) + " 分" : (s / 3600).toFixed(1) + " 小時";
const N = D.length;
console.log(`新手流失漏斗　${TEST ? "（測試資料）" : ""}${DAYS ? `最近 ${DAYS} 天・` : ""}${VER ? `版本 ${VER}・` : ""}共 ${N} 台新裝置`);
if (!N) process.exit(0);
const dev = {}; for (const r of D) dev[r.dev] = (dev[r.dev] || 0) + 1;
console.log("裝置：" + Object.entries(dev).map(([k, n]) => `${{ phone: "手機", tablet: "平板", desktop: "電腦" }[k] || k} ${n}`).join("、"));
console.log("");
console.log("步驟".padEnd(12, "　") + "到達　　還剩　　比上一步　中位數（距離打開）");
let prev = N;
for (const [k, nm] of STEPS) {
  const L = D.map(r => val(r, k)).filter(v => v != null), n = L.length;
  console.log(`${nm.padEnd(8, "　")}　${String(n).padStart(4)}　${(n * 100 / N).toFixed(0).padStart(4)}%　${prev ? (n * 100 / prev).toFixed(0).padStart(5) + "%" : "    —"}　　${fmt(med(L))}`);
  prev = n
}
const ok = D.filter(r => r.s.fwok != null).length, sk = D.filter(r => r.s.fwskip != null).length;
console.log("");
console.log(`秒開局：走對 ${ok}、跳過 ${sk}。走對的人下完第一盤：${D.filter(r => r.s.fwok != null && r.s.g1e != null).length}／${ok}；跳過的人：${D.filter(r => r.s.fwskip != null && r.s.g1e != null).length}／${sk}`);
/* 11/11 0923 版第一課走對後的三條路（nxcpu 下一盤簡單的棋、nxmore 再練一題、nxhome 先逛逛），fwok2＝第二題也走對；舊版沒有這幾步 */
const has = k => D.filter(r => r.s[k] != null), cpu = has("nxcpu"), more = has("nxmore"), home = has("nxhome");
if (cpu.length + more.length + home.length) {
  const g1e = a => a.filter(r => r.s.g1e != null).length;
  console.log(`第一課後的選擇：下一盤簡單的棋 ${cpu.length}、再練一題 ${more.length}（第二題走對 ${has("fwok2").length}）、先逛逛 ${home.length}`);
  console.log(`各條路下完第一盤：下一盤 ${g1e(cpu)}／${cpu.length}；再練一題 ${g1e(more)}／${more.length}；先逛逛 ${g1e(home)}／${home.length}`);
}
