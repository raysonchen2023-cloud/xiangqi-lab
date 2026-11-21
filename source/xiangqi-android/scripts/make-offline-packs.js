#!/usr/bin/env node
// 象棋千秋 Android 單機版（原型 11/18）：把只放 CDN 的素材分進 Play Asset Delivery 的 install-time 素材包
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 做的事：
//   1. 讀完整素材資料夾（cdn-deploy.js --stage 的成品）的 cdn-manifest.json：每個檔的大小與 sha1 前 12 碼
//   2. 公開倉庫已經有的檔留在基本模組（make-www.js 放進 www/），這裡只核對內容跟 manifest 一樣
//   3. 其餘的檔照 PACKS 分到 android/<包名>/src/main/assets/public/<原路徑>：install-time 素材包會併進 App 的 assets，
//      Capacitor 的本機伺服器照樣用 https://localhost/<原路徑> 提供，網頁程式不用改網址
//   4. 切塊的大檔（<檔>.parts.json＋.partN）在這裡接回整檔，核對大小與 sha1
//   5. ONLINE_ONLY 的檔不放進 App（很少用、留在線上，缺檔時 00-util.js 照舊改抓 CDN）
// 用法：node scripts/make-offline-packs.js --repo <公開倉庫> --stage <完整素材資料夾> [--android android] [--report <json>]
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { listFiles } = require("./make-www.js");
const HERE = path.join(__dirname, "..");

/* 素材包：名字只能英文字母、數字、底線，開頭要字母（Play 規則）；都用 install-time（不需要 Play Core 程式庫，F-Droid 也能接受） */
const PACKS = [
  { name: "xq_bgm", test: f => /^data\/bgm\//.test(f) },
  { name: "xq_models", test: f => /^data\/(tripo_app|park3d|map3d|bhtd)\//.test(f) },
  { name: "xq_games", test: f => /^data\/[^/]+\.json$/.test(f) || /^data\/qa\//.test(f) },
  { name: "xq_art", test: f => /^data\//.test(f) },
];
/* 留在線上：示範影片（只有說明文件連過去）；engine/ 一律用公開倉庫的（原生版不從網路抓程式碼） */
const ONLINE_ONLY = [/^data\/evidence\//, /^data\/docs\/evidence\//];

const sha1 = b => crypto.createHash("sha1").update(b).digest("hex");

function readStageFile(stage, rel) {
  const p = path.join(stage, rel);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  const pj = p + ".parts.json";
  if (!fs.existsSync(pj)) return null;
  const P = JSON.parse(fs.readFileSync(pj, "utf8")), dir = path.dirname(p);
  const buf = Buffer.concat(P.parts.map(x => {
    const b = fs.readFileSync(path.join(dir, x.f));
    if (b.length !== x.size) throw new Error("塊大小不對：" + x.f);
    return b;
  }));
  if (buf.length !== P.size || sha1(buf) !== P.sha1) throw new Error("接回的整檔大小或 sha1 不對：" + rel);
  return buf;
}

function makePacks({ repo, stage, android, log = console.log }) {
  const M = JSON.parse(fs.readFileSync(path.join(stage, "cdn-manifest.json"), "utf8")).files;
  const inRepo = new Set(listFiles(repo));
  const rep = { manifestAt: null, base: { files: 0, bytes: 0, hashMismatch: [] }, online: { files: 0, bytes: 0, list: [] }, packs: {}, missing: [] };
  for (const p of PACKS) {
    rep.packs[p.name] = { files: 0, bytes: 0 };
    fs.rmSync(path.join(android, p.name, "src", "main", "assets"), { recursive: true, force: true });
  }
  for (const rel of Object.keys(M).sort()) {
    const [size, h] = M[rel];
    if (inRepo.has(rel)) {
      const b = fs.readFileSync(path.join(repo, rel));
      rep.base.files++; rep.base.bytes += b.length;
      if (!sha1(b).startsWith(h)) rep.base.hashMismatch.push(rel);
      continue;
    }
    if (ONLINE_ONLY.some(r => r.test(rel))) { rep.online.files++; rep.online.bytes += size; rep.online.list.push(rel); continue; }
    const pk = PACKS.find(p => p.test(rel));
    if (!pk) { rep.missing.push(rel + "（沒有對應的素材包）"); continue; }
    const buf = readStageFile(stage, rel);
    if (!buf) { rep.missing.push(rel + "（素材資料夾裡沒有）"); continue; }
    if (buf.length !== size || !sha1(buf).startsWith(h)) { rep.missing.push(rel + "（內容跟 manifest 不符）"); continue; }
    const d = path.join(android, pk.name, "src", "main", "assets", "public", rel);
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.writeFileSync(d, buf);
    rep.packs[pk.name].files++; rep.packs[pk.name].bytes += buf.length;
  }
  /* 11/18 開發者選「一律用手機裡的」：單機標記檔放在 xq_art 素材包（只有 -PxqOffline 才併進 App）。原生 XQOfflineAssets 看到它才攔 CDN 請求，
     網頁也用它判斷「這是單機版」來跳過預先下載（瘦身版、F-Droid 版沒有這個檔，行為不變）。內容只寫檔數，不寫時間（可重現建置） */
  { const n = Object.values(rep.packs).reduce((a, v) => a + v.files, 0), d = path.join(android, "xq_art", "src", "main", "assets", "public", "xq-offline.json");
    fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, JSON.stringify({ offline: 1, files: n }) + "\n"); }
  const MB = n => (n / 1048576).toFixed(1) + " MB";
  log(`基本模組（公開倉庫）已有 ${rep.base.files} 個 manifest 檔，${MB(rep.base.bytes)}；內容不符 ${rep.base.hashMismatch.length} 個`);
  for (const [k, v] of Object.entries(rep.packs)) log(`  ${k.padEnd(10)} ${String(v.files).padStart(5)} 個檔  ${MB(v.bytes)}`);
  log(`留在線上 ${rep.online.files} 個檔，${MB(rep.online.bytes)}；有問題 ${rep.missing.length} 個`);
  return rep;
}

module.exports = { makePacks, PACKS, ONLINE_ONLY };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  const repo = opt("--repo"), stage = opt("--stage");
  if (!repo || !stage) { console.log("用法：node scripts/make-offline-packs.js --repo <公開倉庫> --stage <完整素材資料夾> [--android android] [--report <json>]"); process.exit(2) }
  try {
    const rep = makePacks({ repo: path.resolve(repo), stage: path.resolve(stage), android: path.resolve(opt("--android") || path.join(HERE, "android")) });
    if (opt("--report")) fs.writeFileSync(opt("--report"), JSON.stringify(rep, null, 1) + "\n");
    /* 公開倉庫跟 CDN 版本不同的檔：App 用倉庫那份（跟這一版的程式同一個 commit），只提醒 */
    if (rep.base.hashMismatch.length) console.log("⚠ 公開倉庫跟 CDN 內容不同（App 用倉庫的）：", rep.base.hashMismatch.join("、"));
    if (rep.missing.length) { console.log("✘ 有檔案對不上：", rep.missing.slice(0, 20)); process.exit(1) }
  } catch (e) { console.log("✘ " + e.message); process.exit(1) }
}
