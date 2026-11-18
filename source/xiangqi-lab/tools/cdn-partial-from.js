#!/usr/bin/env node
/* 11/18 補救用：跟 cdn-partial.js 一樣「只帶指定路徑」，但比對的基準換成「指定的舊 cdn-manifest.json＋那次部署的網址」，
   不是 CDN 目前的版本（CDN 已經被誤推時，目前版本本身就是錯的）。
   用法：node xiangqi-lab/tools/cdn-partial-from.js <舊 manifest 檔> <舊部署網址> "<帶上的路徑正則>" ["<允許刪除的路徑正則>"]
     stage 裡跟舊 manifest 不同、又不在帶上清單的檔 → 從舊部署網址抓回舊版；舊 manifest 沒有的新檔 → 拿掉；
     舊 manifest 有、stage 沒有的檔 → 只有符合「允許刪除」才放行，否則停止。 */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ST = path.join(__dirname, "..", "cf", "stage");
const [OLDF, BASE0, ALLOW0, DEL0] = process.argv.slice(2);
if (!OLDF || !BASE0 || !ALLOW0) { console.log("用法：node cdn-partial-from.js <舊 manifest> <舊部署網址> <帶上正則> [允許刪除正則]"); process.exit(2) }
const BASE = BASE0.replace(/\/?$/, "/"), ALLOW = new RegExp(ALLOW0), DEL = new RegExp(DEL0 || "^$");
const enc = rel => rel.split("/").map(encodeURIComponent).join("/");
(async () => {
  const old = JSON.parse(fs.readFileSync(OLDF, "utf8"));
  const mp = path.join(ST, "cdn-manifest.json"), man = JSON.parse(fs.readFileSync(mp, "utf8"));
  const took = [], rev = [], drop = [];
  for (const [rel, v] of Object.entries(man.files)) {
    const o = old.files[rel];
    if (o && o[0] === v[0] && o[1] === v[1]) continue;
    if (ALLOW.test(rel)) { took.push(rel); continue }
    if (!o) { fs.unlinkSync(path.join(ST, rel)); delete man.files[rel]; drop.push(rel); continue }
    if (v[0] > 20e6 || o[0] > 20e6) throw new Error("切塊的大檔改過，這支不處理：" + rel);
    const r = await fetch(BASE + enc(rel));
    if (!r.ok) throw new Error(r.status + " " + rel);
    const b = Buffer.from(await r.arrayBuffer());
    if (crypto.createHash("sha1").update(b).digest("hex").slice(0, o[1].length) !== o[1]) throw new Error("抓回的檔指紋不對：" + rel);
    fs.writeFileSync(path.join(ST, rel), b); man.files[rel] = o; rev.push(rel);
  }
  for (const k of Object.keys(old.files)) if (!man.files[k] && !DEL.test(k)) throw new Error("舊的有、stage 沒有（會被刪掉）而且不在允許刪除清單：" + k);
  man.n = Object.keys(man.files).length;
  fs.writeFileSync(mp, JSON.stringify(man));
  console.log("帶上 CDN（" + took.length + "）：\n  " + took.join("\n  "));
  console.log("換回舊版（" + rev.length + "）：" + rev.join("、"));
  console.log("拿掉的新檔（" + drop.length + "）：" + drop.join("、"));
  console.log("刪除：" + Object.keys(old.files).filter(k => !man.files[k]).join("、"));
})().catch(e => { console.error("✘ " + e.message); process.exit(1) });
