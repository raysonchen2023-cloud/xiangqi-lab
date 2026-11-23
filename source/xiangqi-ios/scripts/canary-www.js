#!/usr/bin/env node
/* iOS P0-IMG 金絲雀（AGENTS.md「P0 出口驗證要難作假」，開發者 2026-11-23：「ios金絲雀也要做」「壞樣本能自己製作，包含媒體缺檔之類的，然後加入金絲雀比較深層的判斷（避免P0)」）
   做法：把要送審的包裡那份 public（或 www）整個複製一份（macOS 用 APFS 複製，幾秒、不佔空間），在副本上真的弄壞一處，
     再用同一支 check-www.js（--dir 指向副本）檢查。每一個壞樣本都必須被判失敗，而且錯誤裡要有那一處的檔名和原因；乾淨的那份必須全過。
     壞樣本走的是正式檢查的同一條路（同一支程式、真的檔案），不是在讀檔那一層假裝缺檔。
   挑哪個檔：每一類固定測「頭、中、尾」三個，再加一個用種子挑的隨機檔（PR #67 審查：只挑一個、隨機挑，正式檢查只查第一首背景音樂也會有幾次照樣過）。
     同一個種子挑到的檔一樣；沒給種子就隨機產生一個，收據記下來，要重現就照那個種子再跑。
   壞樣本（每一種都是一個會讓玩家看到 P0 的情況）：
     home     拿掉一個首頁素材（data/preload.json 列的）            → 開 App 首頁破圖
     bgm      拿掉一首背景音樂（data/bgm/index.json 列的）          → 媒體缺檔
     engine   拿掉一個引擎檔（pikafish.js／.wasm／.nnue）           → 電腦棋手不能下
     core     拿掉一個核心程式（capacitor.js、native-bridge.js…）  → 開不起來或原生功能失效
     big      前幾大的檔挑一個只留一半（不挑引擎檔）                → 切塊大檔沒接回、下載中斷（W30 類）
     swap     同樣大小、內容被換掉（清單有記 sha1 的檔）            → 雜湊不符
     bridge   index.html 裡 native-bridge.js 移到 App 程式後面      → 原生功能全部失效
     cdnstale App 會要的檔換成舊副本、清單也照舊副本改（加 --cdn 才跑） → 包跟 CDN 現行版不同（W42）：只有跟 CDN 比才抓得到
     cdnmiss  CDN 清單拿掉一個 App 會要的檔（加 --cdn 才跑）     → 要回 3：沒跟 CDN 比到不能當驗過
     cdnfail  CDN 清單讀不到（加 --cdn 才跑）                  → 要回 3：加了 --cdn 卻沒驗到 W42
     ctrl     程式檔插一個控制字元（check-www 認的 30 個全部插過，清單照改） → 程式壞掉
     bigpre   拿掉 preload.json 的 big 列的大檔（清單也拿掉）    → 開 App 要先下載的大檔缺
     capord   index.html 裡 native-bridge.js 移到 capacitor.js 前面（清單照改） → 原生橋接載入順序錯（原生能力偵測不到）
     nohash   清單裡引擎、App 會要的檔的雜湊拿掉（只剩大小） → 要回 3：W30 大小對、內容壞的大檔抓不到
     casehome 首頁素材改名成大小寫不同的同名檔 → iPhone 分大小寫，實機缺圖
     nocap／nobridge index.html 拿掉 capacitor.js／native-bridge.js 標籤 → 原生能力偵測不到
     listmiss 拿掉一個清單有、但不在上面任何名單裡的檔（3D 場景程式、場景圖、data/ 其他檔） → 那個畫面破圖或壞掉
   swap 除了頭、中、尾、隨機，另外固定測最大的兩個記了 sha1 的檔（W30：大小對、內容壞的切塊大檔）
   分層（PR #67 第八～十一次審查）：全部候選挑頭、中、尾＋隨機，另外每一層（完整父目錄＋副檔名；背景音樂照朝代）都挑 1 個，不抽樣；
     檔多的壞樣本一次弄壞好幾個（同一份副本），每個檔的錯誤都要出現在 ✘／△ 那一行（⚠ 警告不算）
   種子：有安裝包時由「安裝包 SHA-256＋origin/main 提交」推出來；給了 --seed 的收據不算送審用
   用法（送審）：node scripts/canary-www.js --pkg <要送審的 .ipa 或 .app> --cdn [--list <清單>] [--seed <種子>] --out <收據.json>
     --pkg 時檢查的就是包裡那份 Payload/*.app/public（.ipa 會先解開），不能再另外給 --dir（PR #67 審查：收據的包跟檢查的資料夾要是同一份）。
     沒有安裝包時可以用 --dir <www 資料夾> 先試，但那種收據 full＝false，送審不能用。
   結束代碼：0 乾淨的全過、每個壞樣本都被抓到；4 有壞樣本沒被抓到（檢查本身失靈，結果不可信）；2 測試不成立（乾淨的沒過、找不到可以弄壞的檔、解不開安裝包）；
     3 乾淨的沒錯、但加了 --cdn 卻讀不到 CDN 清單（缺驗）
   送審用的收據要 full＝true，五個條件都要成立（PR #67 第五次審查）：
     給了 --pkg 而且是 .ipa（收據的 SHA-256 才對得到送審的檔）、加了 --cdn（正式 CDN；--cdn-manifest 給的本機檔不算）、沒有 --only、
     用的清單和兩支工具都跟 origin/main 那一版一樣（不能拿包重產清單來比包，也不能用改過的工具）、
     清單的 siteVersion 跟包裡 public/release.json 的 version 一樣。
   金絲雀叫 check-www.js 的參數跟正式用法一樣（不加 --all）。 */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto"), cp = require("child_process");
const VAL_FLAGS = ["--pkg", "--dir", "--list", "--cdn-manifest", "--only", "--seed", "--out"], KNOWN = [...VAL_FLAGS, "--cdn"];
/* PR #67 第九次審查：認 --x=Y；不認得的旗標回 2 */
const argv = process.argv.slice(2).flatMap((a) => { const m = /^(--[a-z-]+)=(.*)$/s.exec(a); return m ? [m[1], m[2]] : [a] }), opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
/* PR #67 第十三次審查：不是 -- 開頭、也不是某個參數的值（-cdn、—cdn、cdn）也報錯，不悄悄忽略 */
const unknownFlag = (a) => a.find((x, i) => x.startsWith("--") ? !KNOWN.includes(x) : !(i > 0 && VAL_FLAGS.includes(a[i - 1])));
const missingVal = (a) => VAL_FLAGS.find((k) => { const i = a.indexOf(k); return i >= 0 && (i + 1 >= a.length || a[i + 1] === "" || String(a[i + 1]).startsWith("--")) });
const CHECK = path.join(__dirname, "check-www.js");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const sha1_12 = (b) => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
/* 工具雜湊：CRLF 換成 LF、單獨的 CR 保留（跟 Android tool-pin.js 同一種算法；單獨 CR 在 JS 裡算換行，不能忽略） */
const toolSha = (p) => sha256(Buffer.from(fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"), "utf8"));
/* 整個資料夾的雜湊：每個檔「相對路徑＋NUL＋SHA-256＋換行」照路徑排序後再算（收據綁住檢查的是哪一份內容） */
function treeSha(dir) {
  const out = [];
  /* 符號連結也算進去（記連到哪裡），.app 裡的 Frameworks 常有（PR #67 第三次審查） */
  const walk = (d, pre) => { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n), r = pre ? pre + "/" + n : n, st = fs.lstatSync(p); if (st.isSymbolicLink()) out.push(r + "\0L:" + fs.readlinkSync(p) + "\n"); else if (st.isDirectory()) walk(p, r); else if (st.isFile()) out.push(r + "\0" + sha256(fs.readFileSync(p)) + "\n") } };
  walk(dir, ""); return sha256(out.sort().join(""));
}
/* 挑檔：頭、中、尾，再加一個用種子挑的（mulberry32），去掉重複 */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function picks(list, rand) {
  if (!list.length) return [];
  const idx = [0, Math.floor((list.length - 1) / 2), list.length - 1, Math.floor(rand() * list.length)];
  return [...new Set(idx)].map((i) => list[i]);
}
const at = (D, rel) => path.join(D, ...rel.split("/"));
const rewrite = (p, b) => { fs.rmSync(p); fs.writeFileSync(p, b) };   /* 先刪再寫：APFS 複製或硬連結都不會改到原本那份 */
const ENGINE = ["engine/pikafish.js", "engine/pikafish.wasm", "engine/pikafish.nnue"];
const CORE = ["capacitor.js", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js", "zh.js"];
/* check-www.js 第 5 項認的每一個控制字元（\x00-\x08、\x0B、\x0C、\x0E-\x1F、\x7F，共 30 個，十六進位）；PR #67 第七次審查：不抽樣，全部都插 */
const CTRL_CH = [...Array(32).keys(), 0x7f].filter((c) => c !== 0x09 && c !== 0x0a && c !== 0x0d).map((c) => c.toString(16).padStart(2, "0"));   /* 十六進位；\x08 是 Bash 吃掉 \\b 會產生的字元 */
const CTRL = ["index.html", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js"];   /* check-www.js 第 5 項檢查控制字元的檔 */
const TAG_CAP = '<script src="capacitor.js"></script>', TAG_BR = '<script src="native-bridge.js"></script>';
/* 清單照改過的檔更新（只讓要測的那一條判斷抓得到，別的判斷不會順便抓到） */
const relist = (L, f, b) => ({ ...L, [f]: [b.length, sha1_12(b)] });
const POS = ["head", "mid", "tail"];
/* 檔中間：取中間附近的換行之後（不切斷多位元組字元） */
const midLine = (b) => { const i = b.indexOf(10, Math.floor(b.length / 2)); return i < 0 ? Math.floor(b.length / 2) : i + 1 };
/* 檔名大小寫翻轉：最後一段裡第一個能翻的字母 */
/* 改成大小寫不同的同名檔（macOS 不分大小寫，先改成暫名再改回） */
const caseRename = (D, f) => { const a = at(D, f), b = at(D, caseFlip(f)), t = a + ".xqtmp"; fs.renameSync(a, t); fs.renameSync(t, b) };
const caseFlip = (rel) => { const i = rel.lastIndexOf("/") + 1, n = rel.slice(i), j = n.search(/[A-Za-z]/); if (j < 0) return rel; const ch = n[j], t = ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase(); return rel.slice(0, i) + n.slice(0, j) + t + n.slice(j + 1) };
/* 錯誤裡要出現的字：要在「✘」（結束代碼 1）或「△」（結束代碼 3）開頭的那一行，⚠ 警告那一行不算（一次弄壞好幾個時，別的檔讓結束代碼變 1，這一個只出警告也不能當抓到）。
   字串＝那一行有這段；陣列＝同一行裡每一段都要有 */
/* PR #67 第十二次審查：精確比對，後面要接行尾或分隔字元（「少了 park3d.js」不能被「少了 park3d.json」那行當成抓到；U+1 不能被 U+1f 當成抓到） */
const hasTok = (l, e) => { for (let i = l.indexOf(e); i >= 0; i = l.indexOf(e, i + 1)) { const c = l[i + e.length]; if (c === undefined || /[\s（(、,，：:…；]/.test(c)) return true } return false };
const hit = (out, exp, mark) => out.split("\n").some((l) => l.startsWith(mark) && [].concat(exp).every((e) => hasTok(l, e)));
const preloadItems = (D) => (JSON.parse(fs.readFileSync(at(D, "data/preload.json"), "utf8")).items || []).map((x) => x[0]).filter((f) => fs.existsSync(at(D, f)));
const bigItems = (D) => (JSON.parse(fs.readFileSync(at(D, "data/preload.json"), "utf8")).big || []).map((x) => x[0]);
/* PR #67 第八次審查：分層挑檔。首頁 items、preload big、背景音樂每個朝代各自一層，每層各挑頭、中、尾＋隨機（混在一起照字母排，背景音樂幾乎挑不到） */
const bgmEras = (D) => { const B = JSON.parse(fs.readFileSync(at(D, "data/bgm/index.json"), "utf8")); return Object.entries(B).map(([era, list]) => (Array.isArray(list) ? list : []).filter((f) => typeof f === "string" && fs.existsSync(at(D, "data/bgm/" + era + "/" + f))).map((f) => "data/bgm/" + era + "/" + f)).filter((x) => x.length) };
/* PR #67 第九次審查：首頁 items 再照目錄分層（data/homemap/ 和 data/icons/ 各一層），只對某個目錄放水也抓得到 */
/* PR #67 第十一次審查：分層用「完整父目錄」（data/pset/ming/、data/icons/tang/ 這種三層目錄也各自一層），不再只到前兩層 */
const groupKey = (rel) => { const i = rel.lastIndexOf("/"); return i < 0 ? "(根目錄)" : rel.slice(0, i) };
const byDir = (list) => { const m = new Map(); for (const f of list) { const k = groupKey(f); if (!m.has(k)) m.set(k, []); m.get(k).push(f) } return [...m.values()] };
/* PR #67 第十次審查：目錄＋副檔名分層（判斷只對某種副檔名失靈，例如 .glb、.png 也抽得到） */
const extOf = (rel) => { const m = /\.([A-Za-z0-9]+)$/.exec(rel); return m ? m[1].toLowerCase() : "" };
const byDirExt = (list) => { const m = new Map(); for (const f of list) { const k = groupKey(f) + "|" + extOf(f); if (!m.has(k)) m.set(k, []); m.get(k).push(f) } return [...m.values()] };
const BIG = 20 * 1048576;
/* casedir 的候選：每個目錄（名字裡要有英文字母才翻得了）一次。錯誤照 check-www 的順序：preload → 背景音樂 → 清單「少了」，
   所以預期的那一行取「這個目錄底下（含子目錄）照那個順序排第一個的檔」，一定在印出來的前幾行。
   背景音樂目錄要底下沒有首頁素材；清單目錄要底下沒有首頁素材和背景音樂（不然先出現的是別種錯誤） */
const caseDirs = (D, L) => {
  const pre = [...preloadItems(D), ...bigItems(D).filter((x) => fs.existsSync(at(D, x)))], bgm = bgmFiles(D), lst = Object.keys(L).filter((f) => fs.existsSync(at(D, f)));
  const dirs = new Set(); for (const f of [...pre, ...bgm, ...lst]) { const parts = f.split("/"); for (let k = 1; k < parts.length; k++) dirs.add(parts.slice(0, k).join("/")) }
  const under = (d, arr) => arr.find((f) => f.startsWith(d + "/")), out = [];
  for (const d of [...dirs].sort()) {
    if (caseFlip(d) === d) continue;
    const p = under(d, pre), b = under(d, bgm), l = under(d, lst);
    if (p) out.push(d + "|" + p + "|p"); else if (b) out.push(d + "|" + b + "|b"); else if (l) out.push(d + "|" + l + "|l");
  }
  return out };
const needStrata = (D) => [...byDirExt(preloadItems(D)), bigItems(D).filter((f) => fs.existsSync(at(D, f))), ...bgmEras(D)].filter((x) => x.length);
const bgmFiles = (D) => { const B = JSON.parse(fs.readFileSync(at(D, "data/bgm/index.json"), "utf8")), o = []; for (const [era, list] of Object.entries(B)) for (const f of Array.isArray(list) ? list : []) if (typeof f === "string" && fs.existsSync(at(D, "data/bgm/" + era + "/" + f))) o.push("data/bgm/" + era + "/" + f); return o };

/* cdnstale／cdnmiss 用：每一層裡、CDN 清單有記雜湊的檔（stale 還要清單也有） */
const cdnStrata = (D, L, M, needList) => needStrata(D).map((s) => s.filter((rel) => M && Array.isArray(M[rel]) && M[rel][1] && (!needList || L[rel]) && fs.existsSync(at(D, rel)))).filter((x) => x.length);
/* 每一種壞樣本：cands 列出所有可以弄壞的檔；break 在副本上真的弄壞（需要時回傳改過的清單）；expect 是 check-www 錯誤裡要出現的字 */
const KINDS = {
  home: { batch: 15, cands: (D) => preloadItems(D), strata: (D) => byDirExt(preloadItems(D)), break: (D, f) => fs.rmSync(at(D, f)), expect: (f) => "preload.json 列了但沒有：" + f },
  /* PR #67 第十一次審查：檔名大小寫不同（macOS 不分大小寫，iPhone 分）。把首頁素材改名成大小寫不同的同名檔 */
  casehome: { batch: 15, cands: (D) => preloadItems(D).filter((f) => caseFlip(f) !== f), strata: (D) => byDirExt(preloadItems(D).filter((f) => caseFlip(f) !== f)),
    break: (D, f) => caseRename(D, f), expect: (f) => "preload.json 列了但沒有：" + f },
  bgm: { batch: 15, cands: (D) => bgmFiles(D), strata: (D) => bgmEras(D), break: (D, f) => fs.rmSync(at(D, f)), expect: (f) => "背景音樂清單有但沒有檔：" + f },
  /* PR #67 第十二次審查：大小寫不只首頁。背景音樂（每個朝代一層）和清單其他檔（每一層）也各自改成大小寫不同的檔名 */
  casebgm: { batch: 15, cands: (D) => bgmFiles(D).filter((f) => caseFlip(f) !== f), strata: (D) => bgmEras(D).map((s) => s.filter((f) => caseFlip(f) !== f)).filter((x) => x.length),
    break: (D, f) => caseRename(D, f), expect: (f) => "背景音樂清單有但沒有檔：" + f },
  caselist: { batch: 30, cands: (D, L) => KINDS.listmiss.cands(D, L).filter((f) => caseFlip(f) !== f), strata: (D, L) => byDirExt(KINDS.caselist.cands(D, L)),
    break: (D, f) => caseRename(D, f), expect: (f) => "少了 " + f },
  /* PR #67 第十三次審查：目錄名大小寫不同（iPhone 上整個目錄都缺）。候選寫成「目錄|要出現在錯誤裡的檔|哪一種錯」：
     首頁素材所在的目錄（錯誤是 preload 那一行）、背景音樂朝代目錄（背景音樂那一行）、清單其他檔所在的目錄（少了那一行）；每個目錄取它底下照錯誤順序排第一個檔 */
  casedir: { cands: (D, L) => caseDirs(D, L), always: (D, L) => caseDirs(D, L).filter((x) => !x.endsWith("|l")),   /* 首頁素材、背景音樂的目錄全測；清單其他目錄照分層抽 */
    strata: (D, L) => { const c = caseDirs(D, L); return ["p", "b", "l"].map((t) => c.filter((x) => x.endsWith("|" + t))).filter((x) => x.length) },
    break: (D, x) => { const [d] = x.split("|"), a = at(D, d), b = at(D, caseFlip(d)), t = a + ".xqtmp"; fs.renameSync(a, t); fs.renameSync(t, b) },
    expect: (x) => { const [, f, t] = x.split("|"); return (t === "p" ? "preload.json 列了但沒有：" : t === "b" ? "背景音樂清單有但沒有檔：" : "少了 ") + f } },
  engine: { cands: (D) => ENGINE.filter((f) => fs.existsSync(at(D, f))), break: (D, f) => fs.rmSync(at(D, f)), expect: (f) => "缺引擎 " + f },
  core: { cands: (D) => CORE.filter((f) => fs.existsSync(at(D, f))), always: (D) => CORE.filter((f) => fs.existsSync(at(D, f))), break: (D, f) => fs.rmSync(at(D, f)), expect: (f) => "缺 " + f },
  big: {
    cands: (D, L) => Object.entries(L).filter(([rel, [sz]]) => sz > 1024 && rel !== "index.html" && !rel.startsWith("engine/") && fs.existsSync(at(D, rel))).sort((a, b) => b[1][0] - a[1][0]).slice(0, 5).map((x) => x[0]),
    break: (D, f) => { const b = fs.readFileSync(at(D, f)); rewrite(at(D, f), b.subarray(0, Math.floor(b.length / 2))) },
    expect: (f) => "大小不對 " + f,
  },
  swap: {
    batch: 30,
    cands: (D, L) => Object.entries(L).filter(([rel, [sz, h]]) => h && sz >= 16 && rel !== "index.html" && fs.existsSync(at(D, rel))).map((x) => x[0]),
    strata: (D, L) => byDirExt(KINDS.swap.cands(D, L)),
    always: (D, L) => Object.entries(L).filter(([rel, [sz, h]]) => h && sz >= 16 && rel !== "index.html" && fs.existsSync(at(D, rel))).sort((a, b) => b[1][0] - a[1][0] || (a[0] < b[0] ? -1 : 1)).filter((x, k) => k < 2 || x[1][0] > BIG).map((x) => x[0]),   /* PR #67 第五次審查：W30 那種大檔一定要測到 */   /* PR #67 第十三次審查：大於 20 MB、記了雜湊的檔（W30 切塊大檔）全部都測，不只最大的兩個 */
    break: (D, f) => { const b = Buffer.from(fs.readFileSync(at(D, f))); b[Math.floor(b.length / 2)] ^= 0xff; rewrite(at(D, f), b) },
    expect: (f) => "內容跟清單不同 " + f,
  },
  bridge: {
    cands: (D) => { const h = fs.readFileSync(at(D, "index.html"), "utf8"); return h.includes('<script src="native-bridge.js"></script>') && h.includes('<script src="core.js"></script>') ? ["index.html"] : [] },
    break: (D, f) => { const tag = '<script src="native-bridge.js"></script>'; let h = fs.readFileSync(at(D, f), "utf8").replace(tag, ""); h = h.replace('<script src="core.js"></script>', '<script src="core.js"></script>' + tag); rewrite(at(D, f), Buffer.from(h, "utf8")) },
    expect: () => "index.html 裡 native-bridge.js 的位置不對",
  },
  /* PR #67 第十一次審查：拿掉 capacitor.js、native-bridge.js 的標籤（原生能力偵測不到） */
  nocap: { cands: (D) => fs.readFileSync(at(D, "index.html"), "utf8").includes(TAG_CAP) ? ["index.html"] : [],
    break: (D, f, L) => { const b = Buffer.from(fs.readFileSync(at(D, f), "utf8").replace(TAG_CAP, ""), "utf8"); rewrite(at(D, f), b); return { list: relist(L, f, b) } }, expect: () => "index.html 沒有插 capacitor.js／native-bridge.js" },
  nobridge: { cands: (D) => fs.readFileSync(at(D, "index.html"), "utf8").includes(TAG_BR) ? ["index.html"] : [],
    break: (D, f, L) => { const b = Buffer.from(fs.readFileSync(at(D, f), "utf8").replace(TAG_BR, ""), "utf8"); rewrite(at(D, f), b); return { list: relist(L, f, b) } }, expect: () => "index.html 沒有插 capacitor.js／native-bridge.js" },
  /* PR #67 第十二次審查：兩個標籤包在 HTML 註解裡（看起來有插、其實不會載入） */
  cmtcap: { cands: (D) => { const h = fs.readFileSync(at(D, "index.html"), "utf8"); return h.includes(TAG_CAP) && h.includes(TAG_BR) ? ["index.html"] : [] },
    break: (D, f, L) => { const b = Buffer.from(fs.readFileSync(at(D, f), "utf8").replace(TAG_CAP, "<!--" + TAG_CAP + "-->").replace(TAG_BR, "<!--" + TAG_BR + "-->"), "utf8"); rewrite(at(D, f), b); return { list: relist(L, f, b) } }, expect: () => "index.html 沒有插 capacitor.js／native-bridge.js" },
  cdnstale: {
    needsCdn: true, batch: 30,
    cands: (D, L, M) => cdnStrata(D, L, M, true).flat(), strata: (D, L, M) => cdnStrata(D, L, M, true),
    /* 模擬 W42：包裡放的是舊副本，清單也是照舊副本產生的（所以第 4 項比不出來），只有跟 CDN 比才抓得到 */
    break: (D, f, L) => { const b = Buffer.from(fs.readFileSync(at(D, f))); b[Math.floor(b.length / 2)] ^= 0xff; rewrite(at(D, f), b); return { list: relist(L, f, b) } },
    expect: (f) => "跟 CDN 現行版不同 " + f,
  },
  cdnmiss: {
    needsCdn: true, exit: 3, noClone: true, batch: 8,
    cands: (D, L, M) => cdnStrata(D, L, M, false).flat(), strata: (D, L, M) => cdnStrata(D, L, M, false),
    break: (D, f, L, M) => { const M2 = { ...M }; delete M2[f]; return { cdn: M2 } },
    expect: (f) => ["沒跟 CDN 比到", f],   /* 同一行要有那個檔名（一次弄壞好幾個，錯誤列前 10 個） */
  },
  cdnfail: {
    needsCdn: true, exit: 3, noClone: true,
    cands: () => ["cdn-manifest.json"],
    break: (D) => ({ cdnPath: path.join(D, "沒有這個-cdn-manifest.json") }),
    expect: () => "讀不到 CDN 清單",
  },
  ctrl: {
    /* PR #67 第六、七次審查：不只 \x01。候選是「檔｜字元」的組合，另外固定把 30 個控制字元各插一次到第一個檔 */
    cands: (D, L) => CTRL.filter((f) => L[f] && fs.existsSync(at(D, f))).flatMap((f) => CTRL_CH.flatMap((c) => POS.map((p) => f + "|" + c + "|" + p))),
    /* 第一個檔把 30 個控制字元都插一次；其他每一支程式檔也各固定插一個（PR #67 第十次審查：只抽樣時，少查某一支抽不到） */
    /* PR #67 第十一次審查：插在檔頭、檔中、檔尾三個位置（判斷只看檔尾的改壞也抓得到）；第一支 30 個字元輪流三個位置，其他每支三個位置各插一次 */
    always: (D, L) => { const fs6 = CTRL.filter((x) => L[x] && fs.existsSync(at(D, x))); return fs6.length ? [...CTRL_CH.map((c, i) => fs6[0] + "|" + c + "|" + POS[i % 3]), ...fs6.slice(1).flatMap((f) => POS.map((p) => f + "|01|" + p))] : [] },
    break: (D, fc, L) => { const [f, c, p] = fc.split("|"), o = fs.readFileSync(at(D, f)), x = Buffer.from([parseInt(c, 16)]), k = p === "head" ? 0 : p === "mid" ? midLine(o) : o.length;
      const b = Buffer.concat([o.subarray(0, k), x, o.subarray(k)]); rewrite(at(D, f), b); return { list: relist(L, f, b) } },
    expect: (fc) => { const [f, c] = fc.split("|"); return f + " 有控制字元 U+" + parseInt(c, 16).toString(16) },
  },
  nohash: {
    exit: 3, batch: 8,
    /* PR #67 第八次審查：清單裡引擎、App 會要的檔的雜湊被拿掉（只剩大小），要回 3 */
    cands: (D, L) => [ENGINE, ...needStrata(D)].flat().filter((f) => L[f] && L[f][1] && fs.existsSync(at(D, f))),
    /* 只改清單、跟目錄無關，粗分四層就好：引擎、首頁 items、preload big、背景音樂 */
    strata: (D, L) => [ENGINE, preloadItems(D), bigItems(D), bgmFiles(D), Object.keys(L).filter((f) => L[f][0] > BIG)].map((s) => s.filter((f) => L[f] && L[f][1] && fs.existsSync(at(D, f)))).filter((x) => x.length),   /* 最後一層：大於 20 MB 的檔（不一定是 App 會要的，PR #67 第十次審查） */
    noClone: true,
    always: (D, L) => Object.keys(L).filter((f) => L[f][0] > BIG && L[f][1] && fs.existsSync(at(D, f))),   /* PR #67 第十三次審查：大於 20 MB 那一層全測 */
    break: (D, f, L) => ({ list: { ...L, [f]: [L[f][0], null] } }),
    expect: (f) => ["清單沒記雜湊的重要檔", f],
  },
  listmiss: {
    /* PR #67 第六次審查：清單有、但不在任何特定名單（首頁、背景音樂、引擎、核心、控制字元檢查的檔）裡的檔，缺了只有「少了」那一行抓得到 */
    cands: (D, L) => { const skip = new Set([...preloadItems(D), ...bigItems(D), ...bgmFiles(D), ...ENGINE, ...CORE, ...CTRL, "data/preload.json", "data/bgm/index.json", "data/big-books.json", "release.json"]); return Object.keys(L).filter((rel) => !skip.has(rel) && fs.existsSync(at(D, rel))).sort() },
    /* PR #67 第九次審查：照目錄分層；根目錄的程式檔（3D 場景程式等）每次全部都測 */
    batch: 30,
    strata: (D, L) => byDirExt(KINDS.listmiss.cands(D, L)),
    always: (D, L) => KINDS.listmiss.cands(D, L).filter((rel) => !rel.includes("/") && /\.(m?js)$/.test(rel)),
    break: (D, f) => fs.rmSync(at(D, f)),
    expect: (f) => "少了 " + f,
  },
  bigpre: {
    cands: (D) => { const P = JSON.parse(fs.readFileSync(at(D, "data/preload.json"), "utf8")); return (P.big || []).map((x) => x[0]).filter((f) => fs.existsSync(at(D, f))) },
    break: (D, f, L) => { fs.rmSync(at(D, f)); const L2 = { ...L }; delete L2[f]; return { list: L2 } },
    expect: (f) => "preload.json 列了但沒有：" + f,
  },
  capord: {
    cands: (D) => { const h = fs.readFileSync(at(D, "index.html"), "utf8"); return h.includes(TAG_CAP) && h.includes(TAG_BR) ? ["index.html"] : [] },
    break: (D, f, L) => { const h = fs.readFileSync(at(D, f), "utf8").replace(TAG_BR, "").replace(TAG_CAP, TAG_BR + TAG_CAP), b = Buffer.from(h, "utf8"); rewrite(at(D, f), b); return { list: relist(L, f, b) } },
    expect: () => "index.html 裡 native-bridge.js 的位置不對",
  },
};

/* PR #67 第十二次審查：check-www 用乾淨的環境跑，拿掉 NODE_OPTIONS 等所有 NODE_*（不然 --require 一支小程式就能把 --dir 換成好的副本） */
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^NODE_/i.test(k)));
/* 金絲雀自己被動過：NODE_OPTIONS 有值，或 node 帶了參數（--require、--import、--loader…）。命令列直接跑時就回 2 */
const runtimeTaint = (env = process.env, execArgv = process.execArgv) => { const why = []; if (String(env.NODE_OPTIONS || "").trim()) why.push("NODE_OPTIONS=" + String(env.NODE_OPTIONS).slice(0, 80)); if (execArgv.length) why.push("node 參數 " + execArgv.join(" ").slice(0, 80)); return why };
function cloneDir(src, dst) {
  if (process.platform === "darwin") { const r = cp.spawnSync("cp", ["-cR", src, dst], { stdio: "ignore" }); if (r.status === 0) return }
  fs.cpSync(src, dst, { recursive: true });
}
/* 送審用（full＝true）只認正式 CDN；網址只定義在 check-www.js 一個地方，這裡從它的原始碼讀（PR #67 第六次審查：兩份網址，改了一份測不到） */
const OFFICIAL_CDN = (() => { const m = fs.readFileSync(CHECK, "utf8").match(/^const OFFICIAL_CDN = "(https:\/\/[^"]+)";/m); return m ? m[1] : null })();
const readManifest = (cdn) => /^https?:\/\//.test(cdn)
  ? cp.execFileSync(process.execPath, ["-e", "fetch(process.argv[1]).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}).then(t=>process.stdout.write(t)).catch(e=>{console.error(e.message);process.exit(1)})", cdn], { encoding: "utf8", maxBuffer: 256e6, timeout: 120000, stdio: ["ignore", "pipe", "pipe"] })
  : fs.readFileSync(cdn, "utf8");
/* 安裝包 → 包裡那份 public：.app 直接用 <.app>/public；.ipa 解開 Payload/*.app/public/ 到暫存資料夾 */
function pkgPublic(pkg, tmp) {
  const st = fs.statSync(pkg);
  if (st.isDirectory()) { const p = path.join(pkg, "public"); if (!fs.existsSync(path.join(p, "index.html"))) throw new Error(pkg + " 裡沒有 public/index.html"); return { dir: p, kind: "app", sha256: treeSha(pkg) } }
  const d = fs.mkdtempSync(path.join(tmp, "xq-canary-ipa-"));
  /* PR #67 第九次審查：整包解開（不靠萬用字元跨 /），解完核對 public 底下的檔數跟 zip 目錄一樣；同名項目重複也算解不開 */
  const ls = cp.spawnSync("unzip", ["-Z1", pkg], { encoding: "utf8", maxBuffer: 256e6 });
  if (ls.status !== 0) throw new Error("unzip 讀不了 " + pkg + " 的目錄：" + String(ls.stderr || ls.error || "").split("\n")[0]);
  const ents = String(ls.stdout).split("\n").filter((x) => /^Payload\/[^/]+\.app\/public\/.+[^/]$/.test(x));
  if (new Set(ents).size !== ents.length) throw new Error(pkg + " 裡有重複的檔名項目（" + (ents.length - new Set(ents).size) + " 筆）");
  const r = cp.spawnSync("unzip", ["-q", "-o", pkg, "-d", d], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("unzip 解不開 " + pkg + "：" + String(r.stderr || r.error || "").split("\n")[0]);
  const P = path.join(d, "Payload"), app = fs.existsSync(P) ? fs.readdirSync(P).filter((n) => n.endsWith(".app")) : [];
  if (app.length !== 1) throw new Error(pkg + " 的 Payload/ 裡要正好一個 .app，找到 " + app.length + " 個");
  const p = path.join(P, app[0], "public"); if (!fs.existsSync(path.join(p, "index.html"))) throw new Error(pkg + " 裡沒有 public/index.html");
  let n = 0; const walk = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(x, e.name)); else n++ } }; walk(p);
  if (n !== ents.length) throw new Error(pkg + " 解開後 public 有 " + n + " 個檔，zip 目錄列了 " + ents.length + " 個");
  return { dir: p, kind: "ipa", sha256: sha256(fs.readFileSync(pkg)), cleanup: d };
}

/* 結束代碼（純函式）：全抓到 0；有任何一個「做出來了卻沒被抓到」就是 4（檢查失靈，優先，不能被「不成立」蓋掉）；其餘沒過的是 2 */
/* origin/main 上那份清單（收據要綁住倉庫的清單，不能拿包重產）；讀不到就回 null，full 一律 false */
const ROOT = path.join(__dirname, "..", "..", "..");
function mainFromGit(rel) {
  if (rel === "@commit") { const r = cp.spawnSync("git", ["-C", ROOT, "rev-parse", "origin/main"], { encoding: "utf8" }); return r.status === 0 ? r.stdout.trim() : null }
  const r = cp.spawnSync("git", ["-C", ROOT, "show", "origin/main:" + rel], { maxBuffer: 64e6 });
  return r.status === 0 ? r.stdout : null;
}
const REL_LIST = "source/xiangqi-ios/scripts/.www-files.json", REL_CHECK = "source/xiangqi-ios/scripts/check-www.js", REL_CANARY = "source/xiangqi-ios/scripts/canary-www.js";
const normSha = (b) => sha256(Buffer.from(Buffer.from(b).toString("utf8").replace(/\r\n/g, "\n"), "utf8"));   /* 跟 toolSha 同一種算法 */
const exitOf = (results, pass) => (pass ? 0 : results.some((x) => !x.unfit && x.caught !== true) ? 4 : 2);

/* 主流程（自我測試直接呼叫）：回傳 { code, receipt } */
function run({ dir = null, list = null, cdn = null, pkg = null, only = null, seed = null, tmp = os.tmpdir(), log = console.log, readM = readManifest, mainFile = mainFromGit, selfCdn = null }) {   /* readM、mainFile、selfCdn 只給自我測試換掉下載、讀 origin/main、check-www 自己的 --cdn；命令列一律用真的 */
  const unfit = (why, code = 2) => ({ code, receipt: { tool: "P0-IMG-canary", platform: "ios", unfit: true, why } });
  if (pkg && dir) return unfit("給了 --pkg 就不要再給 --dir：檢查的就是包裡那份 public");
  let P = null;
  if (pkg) { try { P = pkgPublic(pkg, tmp); dir = P.dir } catch (e) { return unfit("安裝包：" + e.message) } }
  try {
    if (!dir || !fs.existsSync(path.join(dir, "index.html"))) return unfit("找不到要檢查的資料夾（--pkg 或 --dir）：" + dir);
    const LF = list ? path.resolve(list) : path.join(__dirname, ".www-files.json");
    let LJ; try { LJ = JSON.parse(fs.readFileSync(LF, "utf8")) } catch (e) { return unfit("讀不到清單 " + LF) }
    const L = LJ.files || {};
    const base = fs.mkdtempSync(path.join(tmp, "xq-canary-www-"));
    try {
      const check = (d, lf, cdnArg, more = []) => cp.spawnSync(process.execPath, [CHECK, "--dir", d, "--list", lf, ...(cdnArg ? ["--cdn-manifest", cdnArg] : []), ...more], { encoding: "utf8", maxBuffer: 256e6, env: cleanEnv() });   /* 跟正式用法一樣，不加 --all（PR #67 第五次審查） */
      /* CDN 清單只下載一次，乾淨的那份和每個壞樣本都用同一份，收據記下它的雜湊（PR #67 審查：分兩次下載，兩份可能不同） */
      let M = null, cdnFile = null, cdnSha = null;
      /* PR #67 第四次審查：先驗乾淨的樣本（不連 CDN），再讀 CDN。乾淨的有錯就回 2，不會被「CDN 讀不到」蓋成 3 */
      const pre = check(dir, LF, null);
      if (pre.status !== 0) return unfit("乾淨的樣本沒過 check-www.js（先修好再跑金絲雀）：" + String(pre.stderr).split("\n")[0]);
      if (cdn) { try { const txt = readM(cdn); M = JSON.parse(txt).files; cdnFile = path.join(base, "cdn-manifest.json"); fs.writeFileSync(cdnFile, txt); cdnSha = sha256(Buffer.from(txt, "utf8")) } catch (e) { return unfit("金絲雀讀不到 CDN 清單：" + cdn, 3) } }
      const clean = check(dir, LF, cdnFile);
      if (clean.status === 3) return unfit("乾淨的樣本沒錯，但 CDN 清單沒能比對（缺驗）：" + String(clean.stderr).split("\n")[0], 3);
      if (clean.status !== 0) return unfit("乾淨的樣本沒過 check-www.js（先修好再跑金絲雀）：" + String(clean.stderr).split("\n")[0]);
      if (only != null && !String(only).split(",").map((s) => s.trim()).filter(Boolean).length) return unfit("--only 沒有列任何壞樣本");   /* PR #67 第七次審查：空的 --only 不能回 0 */
      const want = only ? only.split(",").map((s) => s.trim()).filter(Boolean) : Object.keys(KINDS).filter((k) => cdn || !KINDS[k].needsCdn);
      for (const k of want) { if (!KINDS[k]) return unfit("不認得的壞樣本：" + k + "（可用：" + Object.keys(KINDS).join(" ") + "）"); if (KINDS[k].needsCdn && !cdn) return unfit(k + " 要加 --cdn 才能跑") }
      if (seed != null && seed !== "" && !/^\d+$/.test(String(seed))) return unfit("--seed 要是非負整數：" + seed);   /* PR #67 第九次審查：--seed abc 不能悄悄變 0 */
      const fromMain = (rel) => { try { return mainFile(rel) } catch (e) { return null } };
      const mainCommit = fromMain("@commit");
      /* PR #67 第十一次審查：送審用的種子不能自己挑。有安裝包時由「安裝包 SHA-256＋比對時的 origin/main 提交」推出來；給了 --seed 的收據一律不算送審用 */
      const seedGiven = seed != null && seed !== "", seedFrom = seedGiven ? "given" : P ? "pkg+mainCommit" : "random";
      const SEED = seedGiven ? Number(seed) >>> 0 : P ? parseInt(sha256(P.sha256 + "|" + (typeof mainCommit === "string" ? mainCommit : "")).slice(0, 8), 16) >>> 0 : crypto.randomInt(2 ** 31), rand = rng(SEED);
      const results = [];
      for (const k of want) {
        const K = KINDS[k];
        let cands = []; try { cands = K.cands(dir, L, M) } catch (e) { cands = [] }
        let strata = null; try { strata = K.strata ? K.strata(dir, L, M) : null } catch (e) { strata = null }
        /* 分層時：全部候選挑頭、中、尾＋隨機，另外每一層（完整父目錄＋副檔名）都挑 1 個——不再抽樣（PR #67 第十一次審查：只抽樣，檢查只對某目錄、某副檔名失靈時九成抽不到）。
           檔多的壞樣本一次弄壞好幾個（batch），每個檔的錯誤都要出現；這樣每一層都測到，跑 check-www 的次數也不會暴增 */
        const chosen = [...new Set([...picks(cands, rand), ...(strata ? strata.filter((s) => s.length).map((s) => s[Math.floor(rand() * s.length)]) : []), ...(K.always ? K.always(dir, L, M) : [])])];
        if (!chosen.length) { results.push({ kind: k, caught: false, unfit: true, why: "乾淨的樣本裡找不到可以弄壞的檔" }); continue }
        const size = K.batch || 1;
        for (let bi = 0; bi < chosen.length; bi += size) {
          const group = chosen.slice(bi, bi + size), tag = k + "-" + results.length;
          const D = K.noClone ? dir : path.join(base, tag);   /* 只改清單或 CDN 清單的壞樣本不動檔案，不用複製整份 */
          let lf = LF, cf = cdnFile, Lc = L, Mc = M, cdnPath = null;
          try {
            if (!K.noClone) cloneDir(dir, D);
            for (const f of group) { const B = K.break(D, f, Lc, Mc) || {}; if (B.list) Lc = B.list; if (B.cdn) Mc = B.cdn; if (B.cdnPath) cdnPath = B.cdnPath }
            if (Lc !== L) { lf = path.join(base, tag + "-list.json"); fs.writeFileSync(lf, JSON.stringify({ ...LJ, files: Lc })) }
            if (Mc !== M) { cf = path.join(base, tag + "-cdn.json"); fs.writeFileSync(cf, JSON.stringify({ files: Mc })) }
            if (cdnPath) cf = cdnPath;
          }
          catch (e) { for (const f of group) results.push({ kind: k, file: f, caught: false, unfit: true, why: "做壞樣本失敗：" + e.message }); if (!K.noClone) fs.rmSync(D, { recursive: true, force: true }); continue }
          const r = check(D, lf, cf), out = String(r.stdout) + String(r.stderr), want = K.exit || 1;
          for (const f of group) {
            const exp = K.expect(f), seen = hit(out, exp, want === 3 ? "△" : "✘"), caught = r.status === want && seen;
            results.push({ kind: k, file: f, candidates: cands.length, batch: group.length, expect: exp, exit: r.status, caught });
            log((caught ? "✔ " : "✘ ") + k + "：" + f + "（候選 " + cands.length + " 個" + (group.length > 1 ? "，同一份副本弄壞 " + group.length + " 個" : "") + "）" + (caught ? " 被抓到" : " 沒被抓到（結束代碼 " + r.status + "，錯誤裡" + (seen ? "有" : "沒有") + "「" + [].concat(exp).join("…") + "」）"));
          }
          if (!K.noClone) fs.rmSync(D, { recursive: true, force: true });
        }
      }
      const listSha = sha256(fs.readFileSync(LF)), mainBuf = fromMain(REL_LIST);
      const listMainSha256 = mainBuf ? sha256(mainBuf) : null, listBound = !!listMainSha256 && listMainSha256 === listSha;
      /* PR #67 第六次審查：工具也要是 origin/main 那一版（自己算的，只擋不小心改過；故意偽造要靠 CI 用 main 版工具重算） */
      const pins = { [REL_CHECK]: toolSha(CHECK), [REL_CANARY]: toolSha(__filename) };
      const mainPins = {}; for (const rel of Object.keys(pins)) { const b = fromMain(rel); mainPins[rel] = b ? normSha(b) : null }
      const toolsBound = Object.keys(pins).every((rel) => mainPins[rel] && mainPins[rel] === pins[rel]);
      let releaseVersion = null; try { releaseVersion = JSON.parse(fs.readFileSync(path.join(dir, "release.json"), "utf8")).version || null } catch (e) { }
      const verBound = !!releaseVersion && releaseVersion === LJ.siteVersion;
      /* PR #67 第七次審查：正式 CDN 時，乾淨的那份再用 check-www 自己的 --cdn 跑一次（走它自己的網址和下載），要回 0，正式指令那條路才算驗過 */
      let cdnViaCheck = null;
      /* PR #67 第十二次審查：只看結束代碼不夠（--cdn 網址那條路改成不比，也回 0）。要求「跟 CDN 現行版比了 N 個檔」的 N 跟本機 CDN 清單那次一樣 */
      const cmpN = (t) => { const m = /跟 CDN 現行版比了 (\d+) 個檔/.exec(String(t || "")); return m ? Number(m[1]) : null }, wantN = cmpN(clean.stdout);
      if (OFFICIAL_CDN && cdn === OFFICIAL_CDN) { const r = (selfCdn || ((d, lf) => check(d, lf, null, ["--cdn"])))(dir, LF, { cdnFile }); cdnViaCheck = { exit: r.status, n: cmpN(r.stdout), want: wantN, note: String(r.stderr || "").split("\n")[0].slice(0, 200) }; log((r.status === 0 && cdnViaCheck.n === wantN ? "✔ " : "✘ ") + "check-www --cdn 比了 " + cdnViaCheck.n + " 個檔（本機清單那次 " + wantN + "）；結束代碼 " + r.status) }
      const passAll = want.every((k) => results.some((x) => x.kind === k)) && results.every((x) => x.caught === true), code = exitOf(results, passAll);   /* PR #67 第九次審查：結束代碼先算好，full 要看它 */
      const receipt = {
        tool: "P0-IMG-canary", platform: "ios", at: new Date().toISOString(),
        sample: { dir: P ? "（安裝包裡的 public）" : path.basename(path.resolve(dir)), treeSha256: treeSha(dir), indexSha256: sha256(fs.readFileSync(path.join(dir, "index.html"))), listSha256: listSha, siteVersion: LJ.siteVersion || null, commit: LJ.commit || null, releaseVersion },
        bind: { mainCommit: typeof mainCommit === "string" ? mainCommit : null, listMainSha256, listBound, verBound, mainToolPins: mainPins, toolsBound },   /* mainCommit：比對時本機的 origin/main 在哪一版（CI 可以看是不是最新的） */   /* PR #67 第五次審查：清單要是 origin/main 那份、版號要跟包對得上 */
        pkg: P ? { file: path.basename(pkg), kind: P.kind, sha256: P.sha256 } : null,
        cdn: cdn ? { manifest: cdn, sha256: cdnSha } : null,
        /* 工具自己算、自己寫進收據：只抓得到本機不小心改過（例如忘了切回 main）；故意偽造要靠之後的 CI 用 main 版工具重跑（Android PR③） */
        toolPins: pins,
        seed: SEED, seedFrom, kinds: want, results,
        cdnViaCheck,
        runtime: { node: process.version, execArgv: process.execArgv.slice(0, 40), nodeOptions: process.env.NODE_OPTIONS || null },   /* PR #67 第十二次審查：記執行環境 */
        full: passAll && code === 0 && !only && !seedGiven && !!OFFICIAL_CDN && cdn === OFFICIAL_CDN && !!cdnViaCheck && cdnViaCheck.exit === 0 && cdnViaCheck.n != null && cdnViaCheck.n === cdnViaCheck.want && !!P && P.kind === "ipa" && listBound && verBound && toolsBound,   /* PR #67 第七次審查：讀不到網址（null）不能算正式 CDN；check-www 自己的 --cdn 也要回 0 */   /* 只認正式 CDN（第四次審查）；要 .ipa、清單是 main 那份、版號對得上（第五次審查） */
        pass: passAll, code,
      };
      return { code, receipt };
    } finally { fs.rmSync(base, { recursive: true, force: true }) }
  } finally { if (P && P.cleanup) fs.rmSync(P.cleanup, { recursive: true, force: true }) }
}

module.exports = { run, KINDS, toolSha, treeSha, picks, rng, exitOf, OFFICIAL_CDN, hit, hasTok, caseFlip, groupKey, runtimeTaint, cleanEnv };
if (require.main === module) {
  const mv = missingVal(argv); if (mv) { console.error("✘ 測試不成立：" + mv + " 後面要接值"); process.exit(2) }
  const uf = unknownFlag(argv); if (uf) { console.error("✘ 測試不成立：不認得的參數 " + uf); process.exit(2) }
  const tw = runtimeTaint(); if (tw.length) { console.error("✘ 測試不成立：金絲雀的執行環境被動過（" + tw.join("；") + "）。請用乾淨的 node 直接跑"); process.exit(2) }
  if (argv.includes("--cdn") && !OFFICIAL_CDN) { console.error("✘ 測試不成立：加了 --cdn，但讀不到 check-www.js 裡的正式 CDN 網址"); process.exit(2) }   /* PR #67 第十二次審查：不能不比 CDN 就回 0 */
  const cdn = opt("--cdn-manifest") || (argv.includes("--cdn") ? OFFICIAL_CDN : null);
  const { code, receipt } = run({ dir: opt("--dir"), list: opt("--list"), cdn, pkg: opt("--pkg"), only: opt("--only"), seed: opt("--seed") });
  if (receipt.unfit) console.error((code === 3 ? "△ 缺驗：" : "✘ 測試不成立：") + receipt.why);
  if (opt("--out")) fs.writeFileSync(opt("--out"), JSON.stringify(receipt, null, 1) + "\n");
  if (!receipt.unfit) console.log(receipt.pass
    ? `✔ 金絲雀：${receipt.results.length} 個壞樣本（${receipt.kinds.length} 種）都被 check-www.js 抓到；種子 ${receipt.seed}` + (receipt.full ? "" : "（full＝false，送審不能用：要 --pkg .ipa、--cdn、不加 --only、清單和兩支工具是 origin/main 那份、版號跟包一樣）")
    : "✘ 金絲雀沒過：" + [...new Set(receipt.results.filter((x) => !x.caught).map((x) => x.kind))].join("、") + (code === 4 ? "——檢查本身失靈，這一輪的 P0-IMG 結果不可信" : ""));
  process.exit(code);
}
