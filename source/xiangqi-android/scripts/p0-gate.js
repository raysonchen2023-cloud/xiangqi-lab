#!/usr/bin/env node
// 象棋千秋 Android：送審閘門——P0 報告都要綁在「這一個」要送審的 AAB 與版號上（W69 流程盤點第 3 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：以前 P0 報告只記檔名；送審的 AAB、驗過的 APK、P0-IMG 檢查的 AAB 是不是同一份，靠人記。
// 規則（封測 P0 永久測項：任何一項失敗或缺驗都不能送審）：
//   ・P0-IMG（check-aab-assets.js --cdn --out）一份、P0-UPD（check-upgrade.js --aab-apk 的 upgrade.json）一份、
//     P0-3D（check-3d.js --aab-apk 的 summary.json）Android 12 與 16 各一份（P0 規定兩個版本都要跑）
//   ・P0-UPD／P0-3D 要 apkBound＝true：工具自己算過實際測的 APK（--new 檔／手機上安裝的 base.apk），等於 aab-apk.json 記的 apkSha256（PR #44 審查：不能只照抄雜湊）
//   ・每份的 aabSha256＝要送審的 AAB 實際算出的 SHA-256（P0-UPD／P0-3D 用的 APK 要由 aab-to-apk.js 從這個 AAB 產生）
//   ・每份的版號＝--build（網頁版號 XQ_BUILD）：P0-IMG 看 siteVersion、P0-UPD 看 new.build、P0-3D 看 build
//   ・每份 pass＝true；P0-IMG 另外要 cdnChecked＝true 且 exitCode＝0（缺驗＝3 也不能送審）；
//     P0-UPD 不能用 --no-old-worker 跑（oldWorker＝true：舊 Worker 要實際接管過）；
//     P0-3D 要完整跑（full＝true：--only、--self-test 的不算），已知問題清單要用倉庫的 .github/p0-known.json（knownFile.fromRepo＝true）
//     （PR #42 審查後 Windows Claude 2 提的三欄）
//   ・P0-3D 要同一次執行連續 2 輪全過（rounds≥2 且 roundsPassed＝rounds；W69 流程盤點第 5 項，開發者 11/23 選「連續 2 輪」）；
//     之前失敗過的嘗試（failedBefore）照實列出，不擋但看得到
//   ・AAB-DIFF（aab-diff.js --strict --old-code --json，對 Play 現行版；W91，2026-11-24）一份：新版雜湊＝送審 AAB、舊版寫明 versionCode 且不是同一個檔、
//     紅項 0、沒確認的黃項 0、結束代碼 0、金絲雀（候選包自己做的四種壞樣本）都抓到；不能豁免。放行參數與確認過的黃項由 aabDiffInfo() 帶出、印在結果裡
// 例外（W69 流程盤點第 5 項，開發者 11/23 選「寫進倉庫豁免檔」）：
//   只有 WAIVABLE 列的四種能豁免，而且要寫在倉庫的 .github/p0-waivers.json（走 PR、iMac Claude 2 逐行審）；
//   每筆要綁同一個 AAB 的 SHA-256、寫原因（≥4 字）、決定人、決定日期（YYYY-MM-DD）。別處轉述的決定一律不算。
//   AAB 不符、版號不符、缺報告、沒通過、沒綁 APK、交兩份——這些不能豁免。
// 用法：node scripts/p0-gate.js --aab <要送審的.aab> --build <網頁版號 YYYYMMDD-HHMM> [--waivers <檔，預設倉庫 .github/p0-waivers.json>] --reports <報告…>
// 結束代碼：0＝可以送審；1＝不行（列出原因）；2＝用法錯誤
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const TP = require("./tool-pin.js");
const { MEDIA, NOTE_VIA_WEB, MAN_MISS_WHY, unknownWhy, cdnCanary } = require("./check-aab-assets.js");   /* 第十三、十四次複審：媒體檔、提醒與缺驗的固定文字都照破圖工具自己的定義；所以 check-aab-assets.js 也列進閘門的自我鎖定 */
const PROBE_RE = /^data\/__xq_p0_canary_[0-9a-f]{12}\.webp$/;   /* 金絲雀③的探測檔（check-aab-assets.js 產生的檔名），不是真的要補抓的檔 */

const TOOLS = ["P0-IMG", "P0-UPD", "P0-3D", "AAB-DIFF"], ANDROID_3D = ["12", "16"], ROUNDS_3D = 2;
const WAIVABLE = ["P0-IMG/cdn", "P0-UPD/old-worker", "P0-3D/partial", "P0-3D/rounds"];
const HEX64 = /^[0-9a-f]{64}$/;
const verOf = (j) => j.tool === "P0-IMG" ? j.siteVersion : j.tool === "P0-UPD" ? (j.new && j.new.build) : j.build;

/* 一筆豁免要齊全才算數（純函式） */
function validWaiver(w, aabSha) {
  return !!w && typeof w === "object" && WAIVABLE.includes(w.code) && HEX64.test(String(w.aabSha256 || "")) && w.aabSha256 === aabSha &&
    String(w.reason || "").trim().length >= 4 && String(w.decidedBy || "").trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(w.decidedAt || ""));
}

/* 純函式：aabSha＝實際算出的雜湊；build＝送審版號；reports＝[{file, json}]；waivers＝豁免檔的 items
   回傳 { ok, problems:[還擋著的…], waived:[豁免掉的…], notes:[不擋、照實列出的…] } */
/* 閘門自己探測 CDN（不靠 P0 工具）：manifest 要是合法 JSON、files 要有 data/ 的項目；亂數檔名的 HEAD 要回 404／410。任一個成立＝連得上。
   fetchFn 可注入（自我測試用假 fetch） */
const GATE_CDN = "https://xiangqi-cdn.pages.dev/";
/* 不能豁免時的說法（兩條豁免共用；第九次複審：措辭要把條件寫全） */
const NOT_ONLY_MISSING = "報告不是單純缺驗（要加 --cdn、結束代碼 3、沒通過、沒有 ✘、有沒驗到的項目，而且工具自己也連不上 CDN、沒拿到 404，逐項看也都只是 CDN 連不上）";
/* PR #66 第十次複審：不再一欄一欄補彙總欄位，改從報告的逐項清單（warnItems）自己重算「是不是全部都只是 CDN 連不上」。
   正確的工具在 CDN 全斷時：讀不到 cdn-manifest.json 那一筆（沒有 st）＋每個沒確認到的檔一筆（st 是 -1 連不上、429 或 5xx）；
   unknown＝這些筆數（至少 2）、warn＝清單長度、cdnCompared＝0（manifest 讀不到就不會比）、金絲雀③探測狀態也是連不上、金絲雀沒全過。
   有一筆 404（真的缺檔）、200、或欄位對不起來，就不是 CDN 的問題。回傳 null＝是單純 CDN 連不上；否則回傳原因 */
const DOWN_ST = (s) => Number.isInteger(s) && (s === -1 || s === 429 || (s >= 500 && s <= 599));
function onlyCdnDown(json) {
  const W = json && json.warnItems, c = json && json.canary;
  if (!Array.isArray(W)) return "報告沒有逐項清單（warnItems）";
  if (json.warn !== W.length) return `warn（${json.warn}）跟逐項清單筆數（${W.length}）不一樣`;
  if (W.filter((w) => w && w.f === "cdn-manifest.json" && !("st" in w)).length !== 1) return "逐項清單裡沒有「讀不到 cdn-manifest.json」那一筆";
  /* 第十二、十三次複審：不帶狀態的項目，除了 manifest 那一筆，只准是「同一個檔另有一筆帶狀態的缺驗、而且不是媒體檔」：
     原生不補抓、缺的是 JSON 時，正確的工具會多寫一筆「網頁程式會自己改抓 CDN」的提醒，那一筆 CDN 全斷時也會沒確認到（第十三次：上一輪誤擋了這種正確的包）。
     其他不帶狀態的（例如媒體檔的 W21 提醒、對不到缺驗項目的）不是 CDN 的問題 */
  /* 第十四次複審：上面那條可以被湊出來（會補抓的報告多加一筆同檔名、原因寫別的提醒也放行），改成一對一核對：
     原生會補抓時，一筆提醒都不准有；不會補抓時，每個要補抓、不是媒體、不是探測檔的缺驗，都剛好有一筆提醒，原因文字等於工具那句 NOTE_VIA_WEB */
  const isSt = (w) => !!w && typeof w === "object" && "st" in w;
  const st0 = W.filter(isSt), fb = !!(json.native && json.native.cdnFallback === true);
  const notes = W.filter((w) => !isSt(w) && !(w && w.f === "cdn-manifest.json"));
  const want = fb ? [] : st0.filter((w) => typeof w.f === "string" && !PROBE_RE.test(w.f) && !MEDIA.test(w.f)).map((w) => w.f).sort();
  const got = notes.map((w) => (w && w.why === NOTE_VIA_WEB && typeof w.f === "string" ? w.f : "?")).sort();
  if (JSON.stringify(got) !== JSON.stringify(want)) return `逐項清單有 CDN 以外的提醒，或提醒跟缺驗對不起來（${notes.slice(0, 3).map((w) => (w && w.f) || "?").join("、") || "少了提醒"}${fb ? "；原生會補抓時不該有提醒" : ""}），不是單純 CDN 連不上`;
  /* 第十四次複審建議：探測檔只能有一筆；每筆缺驗的原因文字要跟它的狀態碼對得上（工具 unknownWhy 寫的） */
  if (st0.filter((w) => PROBE_RE.test(String(w.f))).length !== 1) return "探測檔不是剛好一筆";
  /* 第十五次複審：欄位不能互相矛盾 —— 檔名要是字串、而且不重複；manifest 那一筆的原因照工具常數；
     金絲雀③那一塊用工具真的 cdnCanary 重算一次，要一模一樣；首頁、雜湊兩個金絲雀要真的弄壞過一個檔（「本來就缺」代表包裡有 ✘，不會是單純缺驗） */
  if (W.some((w) => !w || typeof w.f !== "string")) return "逐項清單有檔名不是字串的項目";
  if (new Set(st0.map((w) => w.f)).size !== st0.length) return "逐項清單同一個檔出現兩次";
  if (W.find((w) => w.f === "cdn-manifest.json").why !== MAN_MISS_WHY) return "「讀不到 cdn-manifest.json」那一筆的原因文字不是工具寫的";
  { const probe = st0.find((w) => PROBE_RE.test(w.f)), re = cdnCanary(probe.f, [], st0, { ok200: 0, manOk: false });
    if (!c || ["cdn404", "cdnUnreachable", "cdnStatus", "cdn"].some((k) => re[k] !== c[k])) return "金絲雀③的欄位跟用工具重算的不一樣"; }
  if (!c || !/^data\//.test(String(c.homeFile)) || !/^data\//.test(String(c.staleFile))) return "金絲雀①②沒有真的弄壞過包裡的檔（本來就缺＝包裡有 ✘）";
  const whyBad = st0.filter((w) => w.why !== unknownWhy(w.st));
  if (whyBad.length) return `缺驗的原因文字跟狀態碼對不起來（${whyBad.slice(0, 3).map((w) => w.f).join("、")}）`;
  /* 原生不會向 CDN 補抓時，要補抓的檔裡不能有媒體檔（探測檔除外）：缺的圖片、音樂在玩家手上就是破圖（W21），不能拿「CDN 連不上」豁免。
     JSON 這類資料檔網頁程式會自己改抓 CDN，照樣算 CDN 的問題。沒記 native 一律不算 */
  if (json.viaCdn > 0 && !(json.native && json.native.cdnFallback === true)) {
    const media = W.filter((w) => w && typeof w === "object" && "st" in w && typeof w.f === "string" && !PROBE_RE.test(w.f) && MEDIA.test(w.f));
    if (!json.native || media.length) return `原生不會向 CDN 補抓（native.cdnFallback 不是 true），要補抓的檔裡有媒體檔（${media.slice(0, 3).map((w) => w.f).join("、") || "沒記 native"}），不是 CDN 的問題`;
  }
  const st = W.filter((w) => w && typeof w === "object" && "st" in w), bad = st.filter((w) => !DOWN_ST(w.st));
  if (bad.length) return `逐項清單有不是「連不上」的狀態（${bad.slice(0, 3).map((w) => w.f + " " + w.st).join("、")}）`;
  if (json.unknown !== st.length + 1 || json.unknown < 2) return `unknown（${json.unknown}）跟逐項清單算出來的（${st.length + 1}）不一樣，或少於 2`;
  /* 第十一次複審：CDN 全斷時，每個要向 CDN 補抓的檔（viaCdn）加上探測檔都會沒確認到；工具少記了（例如把拿到 200 的也漏算）就對不起來 */
  if (!Number.isInteger(json.viaCdn) || st.length !== json.viaCdn + 1) return `沒確認到的檔數（${st.length}）跟要向 CDN 補抓的檔數加探測檔（${json.viaCdn}＋1）對不起來`;
  if (!Number.isInteger(json.need) || !Number.isInteger(json.inPack) || json.need !== json.inPack + json.viaCdn) return `need（${json.need}）不等於包裡（${json.inPack}）加向 CDN 補抓（${json.viaCdn}）`;
  if (json.cdnCompared !== 0) return `有跟 CDN 比對過（cdnCompared＝${json.cdnCompared}），manifest 是讀得到的`;
  if (!c || !DOWN_ST(c.cdnStatus) || c.ok !== false) return "金絲雀③的探測狀態不是「連不上」";
  return null;
}
/* 閘門自己探測 CDN。manifest 的 files 不是空的就算連得上（開發者第五次複審選的定義；第十次複審：原本只算 data/ 開頭的鍵，比這個定義寬，
   manifest 只有別的鍵時會被判成連不上、反而容易豁免）。manifest 正常就算連得上，亂數檔 HEAD 失敗也一樣（HEAD 可能被 CDN 擋，manifest 已經證明連得上） */
async function probeCdn(fetchFn = fetch, base = GATE_CDN, rnd = () => require("crypto").randomBytes(6).toString("hex")) {
  let manOk = false, manWhy = "", head = -1;
  const sig = () => (typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined);   /* 每次最多等 15 秒 */
  try { const r = await fetchFn(base + "cdn-manifest.json", { signal: sig() }); if (!r.ok) manWhy = "manifest HTTP " + r.status; else { let j = null; try { j = await r.json() } catch (e) { manWhy = "manifest 不是合法的 JSON" } const ks = j && j.files && typeof j.files === "object" && !Array.isArray(j.files) ? Object.keys(j.files) : []; manOk = ks.length > 0; manWhy = manOk ? "manifest " + ks.length + " 個檔" : j === null && manWhy ? manWhy : "manifest 是空的或格式不對" } } catch (e) { manWhy = "manifest 連不上" }
  try { head = (await fetchFn(base + "data/__xq_gate_probe_" + rnd() + ".webp", { method: "HEAD", signal: sig() })).status } catch (e) { head = -1 }
  const headOk = head === 404 || head === 410;
  return { reachable: manOk || headOk, manOk, head, at: new Date().toISOString(), detail: manWhy + "；亂數檔 HEAD " + (head === -1 ? "連不上" : head) };
}

/* opts.mainSha(路徑)＝origin/main 那一版去掉 CR 的 SHA-256（tool-pin.js 的 normSha）；沒給＝讀不到 main，每份報告都過不了工具鎖定 */
function gate(aabSha, build, reports, waivers = [], opts = {}) {
  const found = [], notes = [], seen = new Map();
  const add = (msg, code = null, android = null) => found.push({ msg, code, android });
  const mainSha = typeof opts.mainSha === "function" ? opts.mainSha : () => null;
  const apk3d = new Map();   /* "f12"／"c12" → apkSha256 */
  for (const { file, json } of reports) {
    if (!json || typeof json !== "object") { add(`${file}：讀不到 JSON`); continue }
    const t = json.tool;
    if (!TOOLS.includes(t)) { add(`${file}：tool 欄位不是 ${TOOLS.join("／")}（是 ${t}）`); continue }
    const av = t === "P0-3D" ? String(json.android || "").split(".")[0] : "";
    const canary3d = t === "P0-3D" && json.selfTest === true;
    const key = t === "P0-3D" ? `P0-3D${canary3d ? " 金絲雀" : ""}（Android ${av || "?"}）` : t;
    /* 工具鎖定（2026-11-23）：報告要記跑它的工具雜湊，而且要等於 origin/main 那一版；不能豁免 */
    for (const p of TP.checkPins(t, json.toolPins, mainSha)) add(`${key}：${p}`);
    /* W91（11/24，開發者「要不要把 aab-diff 列進 P0-IMG」）：新舊 AAB 產物比對（aab-diff.js --strict --json）一份；不能豁免。
       新版＝要送審的這個 AAB；舊版要寫明是 Play 上哪一版（--old-code）、而且不是同一個檔；--strict；紅項 0、沒確認的黃項 0、結束代碼 0；
       金絲雀（候選包自己做的四種壞樣本）都要抓到。放行參數、確認過的黃項原樣帶出去（收據要記）。
       保證範圍：舊版是不是真的 Play 現行版，閘門看不到 Play，只能核對報告有寫、而且跟新版不同 */
    if (t === "AAB-DIFF") {
      if (seen.has(key)) add(`${key} 有兩份報告（${seen.get(key)}、${file}）：只能交一份`);
      seen.set(key, file);
      if (!HEX64.test(String(json.newSha256 || ""))) add(`${key}：報告沒有記新版 AAB 的 SHA-256（newSha256）`);
      else if (json.newSha256 !== aabSha) add(`${key}：比對的新版（${json.newSha256.slice(0, 12)}）不是要送審的這個 AAB（${aabSha.slice(0, 12)}）`);
      if (!HEX64.test(String(json.oldSha256 || "")) || json.oldSha256 === aabSha) add(`${key}：舊版 AAB 的 SHA-256 沒記、或跟送審的是同一個（拿錯檔）`);
      if (!/^\d{1,10}$/.test(String(json.oldCode || "")) || +json.oldCode < 1) add(`${key}：沒寫舊版是 Play 上的哪一版（要用 --old-code=<versionCode> 跑）`);
      /* #102 審查建議⑤：新版的 versionCode 要寫，而且要比舊版大（Play 不收比較小的版本碼） */
      else if (!/^\d{1,10}$/.test(String(json.newCode || "")) || +json.newCode <= +json.oldCode) add(`${key}：新版的 versionCode 沒寫、或沒有比舊版（${json.oldCode}）大（要用 --new-code=<versionCode> 跑）`);
      /* #102 審查建議①：閘門自己用 main 版的 aab-diff 重算（--old-aab）；沒重算、或重算結果有紅項、沒確認的黃項、金絲雀沒抓到，都擋（不信報告裡的 red／yellow／pass） */
      const RE = opts.diffRe;
      if (!RE) add(`${key}：閘門沒有自己重算產物比對（要給 --old-aab <Play 現行版.aab>，確認清單用 --ack）：不能只信報告`);
      else {
        if (opts.oldSha && json.oldSha256 !== opts.oldSha) add(`${key}：報告比的舊版（${String(json.oldSha256 || "").slice(0, 12)}）不是 --old-aab 這一包（${opts.oldSha.slice(0, 12)}）`);
        if (RE.red.length) add(`${key}：閘門重算有紅項（${RE.red.slice(0, 3).map((x) => x.f).join("、")}）：紅項不能確認、也不能豁免`);
        if (RE.yellow.length) add(`${key}：閘門重算有沒確認的黃項（${RE.yellow.slice(0, 3).map((x) => x.f + "@" + x.ack.split("@").pop()).join("、")}）：人看過後寫進 --ack 清單`);
        if (!RE.canaryOk) add(`${key}：閘門重算的金絲雀沒抓到：這次的放行參數可能太寬，或比對失靈`);
      }
      if (json.strict !== true) add(`${key}：要用 --strict 跑（黃項沒確認也要擋）`);
      if (!Array.isArray(json.red) || json.red.length) add(`${key}：有紅項（${Array.isArray(json.red) ? json.red.slice(0, 3).map((x) => x.f).join("、") : "沒有 red 欄位"}）：紅項不能確認、也不能豁免`);
      if (!Array.isArray(json.yellow) || json.yellow.length) add(`${key}：有沒確認的黃項（${Array.isArray(json.yellow) ? json.yellow.slice(0, 3).map((x) => x.f).join("、") : "沒有 yellow 欄位"}）：人看過後寫進 --ack 清單再跑`);
      if (json.exitCode !== 0 || json.pass !== true) add(`${key}：沒有通過（exitCode＝${json.exitCode}、pass＝${json.pass}）`);
      const c = json.canary || {}, miss = ["home", "zeroJs", "jks", "yellow"].filter((k) => !(c[k] && c[k].ok === true));
      if (miss.length || c.ok !== true) add(`${key}：金絲雀沒抓到（${miss.join("、") || "ok≠true"}）：這次比對可能失靈，結果不可信`);
      continue;
    }
    if (t === "P0-3D" && HEX64.test(String(json.apkSha256 || ""))) apk3d.set((canary3d ? "c" : "f") + av, json.apkSha256);
    if (canary3d) {
      /* P0-3D 金絲雀＝check-3d.js --self-test：正常那次要過、落點蓋遮罩那次要被判失敗（pass＝true 代表兩次都照預期）；跟正式報告綁同一個 AAB、版號、APK */
      if (seen.has(key)) add(`${key} 有兩份報告（${seen.get(key)}、${file}）：只能交一份`);
      seen.set(key, file);
      if (!HEX64.test(String(json.aabSha256 || "")) || json.aabSha256 !== aabSha) add(`${key}：金絲雀要用同一個送審 AAB 跑（aabSha256 不符或沒記）`);
      if (json.build !== build) add(`${key}：驗的版號是 ${json.build}，不是要送審的 ${build}`);
      if (!(json.apkBound === true && HEX64.test(String(json.apkSha256 || "")))) add(`${key}：沒核對實際測的 APK 是從這個 AAB 產生的（要用 --aab-apk 跑）`);
      if (json.pass !== true) add(`${key}：自我反測沒有照預期（落點蓋遮罩沒被判失敗，或正常那次沒過）：這支 3D 檢查可能失靈，結果不可信`);
      continue;
    }
    if (seen.has(key)) add(`${key} 有兩份報告（${seen.get(key)}、${file}）：只能交一份`);
    seen.set(key, file);
    if (!HEX64.test(String(json.aabSha256 || ""))) add(`${key}：報告沒有記 AAB 的 SHA-256（aabSha256）`);
    else if (json.aabSha256 !== aabSha) add(`${key}：驗的是另一個 AAB（${json.aabSha256.slice(0, 12)}），不是要送審的這個（${aabSha.slice(0, 12)}）`);
    if (verOf(json) !== build) add(`${key}：驗的版號是 ${verOf(json)}，不是要送審的 ${build}`);
    /* P0-IMG 缺驗（結束代碼 3）時 pass 一定是 false：歸在可豁免的 P0-IMG/cdn 那一條，不另算「沒有通過」 */
    const imgMissing = t === "P0-IMG" && json.exitCode === 3;
    /* PR #66 第七、八次複審：「單純缺驗」才可能是 CDN 的問題：加了 --cdn、結束代碼 3、沒通過、沒有任何 ✘（redItems 空陣列、red＝0），而且真的有沒驗到的項目（unknown＞0）。
       豁免（要加 --cdn 那條、金絲雀③）都要先滿足這個；正確的工具在探測檔沒確認到時一定是 3＋沒通過，做不出 exit 0 又連不上的報告。
       PR #66 第九次複審：工具自己也要說 CDN 連不上（金絲雀③ cdnUnreachable＝true），而且沒拿到 CDN 的 404（cdn404＝false）；
       工具同一輪拿到過 404＝CDN 連得上，缺驗是別的原因（例如限流），重跑就好，不能拿閘門這邊離線來豁免 */
    const imgOnlyMissing = t === "P0-IMG" && json.cdnChecked === true && json.exitCode === 3 && json.pass === false
      && Array.isArray(json.redItems) && json.redItems.length === 0 && json.red === 0 && Number.isInteger(json.unknown) && json.unknown > 0
      && !!json.canary && json.canary.cdnUnreachable === true && json.canary.cdn404 === false
      && onlyCdnDown(json) === null;   /* 第十次複審：逐項重算 */
    if (json.pass !== true && !imgMissing) add(`${key}：沒有通過（pass＝${json.pass}）`);
    if ((t === "P0-UPD" || t === "P0-3D") && !(json.apkBound === true && HEX64.test(String(json.apkSha256 || ""))))
      add(`${key}：沒核對實際測的 APK 是從這個 AAB 產生的（要用 --aab-apk 跑，報告要有 apkBound＝true 與 apkSha256）`);
    if (t === "P0-IMG" && (json.cdnChecked !== true || json.exitCode !== 0)) {
      /* PR #66 第六次複審：這條也掛 P0-IMG/cdn，同樣要閘門自己也連不上 CDN 才准豁免（exit 3 可能是工具的 manifest 讀取寫壞了） */
      const p = opts.cdnProbe, gateDown = !!p && p.reachable === false;
      const why = json.cdnChecked !== true ? "" : gateDown ? `；閘門自己也連不上 CDN（${p.detail}）` : p && p.reachable === true ? `；閘門自己連得上 CDN（${p.detail}）：不能豁免` : "；閘門沒有自己探測 CDN：不能豁免";
      add(`P0-IMG：要加 --cdn 且結束代碼 0（cdnChecked＝${json.cdnChecked}、exitCode＝${json.exitCode}）${why}${json.cdnChecked === true && gateDown && !imgOnlyMissing ? "；" + NOT_ONLY_MISSING + "，不能豁免" : ""}`, gateDown && imgOnlyMissing ? "P0-IMG/cdn" : null);
    }
    /* 金絲雀（2026-11-23，AGENTS.md「P0 出口驗證要難作假」）：工具在實跑時故意弄壞的地方要被抓到；抓不到＝工具失靈，不能豁免 */
    if (t === "P0-IMG") {
      const c = json.canary || {};
      if (c.home !== true || c.stale !== true) add(`P0-IMG：金絲雀沒被抓到（拿掉首頁素材 ${c.home === true ? "✔" : "✘"}、改掉包裡檔的雜湊 ${c.stale === true ? "✔" : "✘"}）：這支破圖檢查可能失靈，結果不可信`);
      /* 深層金絲雀（2026-11-23「壞樣本自己做、測深層判斷」，PR②）：W21、W30、首頁真的刪、內容被改，都要抓到，不能豁免 */
      const d = c.deep || {}, dmiss = ["w21", "w30", "home", "hash"].filter((k) => !(d[k] && d[k].ok === true));
      if (dmiss.length) add(`P0-IMG：深層金絲雀沒抓到（${dmiss.join("、")}）：這支破圖檢查的深層判斷可能失靈，結果不可信`);
      /* W42 要 manifest 才做得出來；manifest 讀不到＝缺驗，豁免條件跟其他 CDN 缺驗一樣：單純缺驗、而且閘門自己也連不上（#66 第五次複審起） */
      if (!(d.w42 && d.w42.ok === true)) { const p = opts.cdnProbe, gateDown = !!p && p.reachable === false;
        add(`P0-IMG：深層金絲雀 W42（包跟 CDN 現行版不同）${d.w42 && d.w42.skip ? "沒驗（" + d.w42.skip + "）" : "沒抓到"}`, d.w42 && d.w42.skip && gateDown && imgOnlyMissing ? "P0-IMG/cdn" : null) }
      if (c.cdn404 !== true) {
        /* PR #66 第五次複審（開發者選）：豁免要靠工具以外的證據。工具壞掉時看到的跟真的斷線一樣，只在工具裡補反證補不完；
           所以只有報告說連不上（cdnUnreachable）、而且閘門自己連 CDN 也連不上（opts.cdnProbe.reachable＝false）才給豁免代碼 */
        const p = opts.cdnProbe, gateDown = !!p && p.reachable === false, gateUp = !!p && p.reachable === true;
        const why = c.cdnUnreachable !== true ? "：CDN 核對可能失靈，不能豁免"
          : gateUp ? `：閘門自己連得上 CDN（${p.detail}），報告卻說連不上：工具失靈，不能豁免`
          : !imgOnlyMissing ? "：" + NOT_ONLY_MISSING + "，報告跟「CDN 連不上」對不起來，不能豁免"
          : gateDown ? `：閘門自己也連不上 CDN（${p.detail}），沒驗到` : "：閘門沒有自己探測 CDN，不能豁免";
        /* cdnUnreachable＝true 已包含在 imgOnlyMissing 裡（第九次複審），這裡不再重複判斷 */
        add(`P0-IMG：金絲雀③ CDN 不存在的檔沒被判成沒有（${c.cdn || "沒驗"}）${why}`, gateDown && imgOnlyMissing ? "P0-IMG/cdn" : null);
      }
    }
    if (t === "P0-UPD" && !(json.canary && json.canary.dialog === true)) add("P0-UPD：金絲雀（假的「有新版本」視窗）沒被抓到：這支更新檢查可能失靈，結果不可信");
    if (t === "P0-UPD" && json.oldWorker !== true) add("P0-UPD：用 --no-old-worker 跑的不算（封測 P0 規則：舊 Worker 要實際接管過；流程盤點第 5 項）", "P0-UPD/old-worker");
    if (t === "P0-3D") {
      if (json.full !== true) add(`${key}：不是完整跑（full＝${json.full}；--only、--self-test 的不算）`, "P0-3D/partial", av);
      if (!(json.knownFile && json.knownFile.fromRepo === true)) add(`${key}：已知問題清單不是倉庫的 .github/p0-known.json（knownFile.fromRepo≠true）`);
      if (!(Number(json.rounds) >= ROUNDS_3D && json.roundsPassed === json.rounds))
        add(`${key}：要同一次執行連續 ${ROUNDS_3D} 輪全過（rounds＝${json.rounds}、roundsPassed＝${json.roundsPassed}；失敗後重跑到過的不算）`, "P0-3D/rounds", av);
      if (Number(json.failedBefore) > 0) notes.push(`${key}：這個 AAB 之前失敗過 ${json.failedBefore} 次（這份是第 ${json.attempt} 次嘗試）`);
    }
  }
  if (!seen.has("P0-IMG")) add("缺 P0-IMG 的報告（缺驗不能送審）");
  if (!seen.has("P0-UPD")) add("缺 P0-UPD 的報告（缺驗不能送審）");
  if (!seen.has("AAB-DIFF")) add("缺 AAB-DIFF 的報告（aab-diff.js 對 Play 現行版、--strict --old-code --json 跑；缺驗不能送審）");
  for (const v of ANDROID_3D) if (!seen.has(`P0-3D（Android ${v}）`)) add(`缺 Android ${v} 的 P0-3D 報告（P0 規定 Android 12 與 16 都要跑）`);
  /* PR #66 審查建議：同一個 Android 版本，金絲雀和正式報告要測同一個 APK（apkSha256 一樣） */
  for (const v of ANDROID_3D) { const f = apk3d.get("f" + v), c = apk3d.get("c" + v); if (f && c && f !== c) add(`P0-3D 金絲雀（Android ${v}）：測的 APK（${c.slice(0, 12)}）跟正式報告（${f.slice(0, 12)}）不是同一個`) }
  for (const v of ANDROID_3D) if (!seen.has(`P0-3D 金絲雀（Android ${v}）`)) add(`缺 Android ${v} 的 P0-3D 金絲雀（check-3d.js --self-test，同一個 AAB）：沒證明 3D 檢查抓得到 W02`);
  const ok3 = (waivers || []).filter((w) => validWaiver(w, aabSha));
  const problems = [], waived = [];
  for (const f of found) {
    const w = f.code && ok3.find((x) => x.code === f.code && (!f.android || !x.android || String(x.android) === f.android));
    if (w) waived.push(`${f.msg}——已豁免：${w.reason}（${w.decidedBy}，${w.decidedAt}）`); else problems.push(f.msg);
  }
  return { ok: problems.length === 0, problems, waived, notes };
}

/* #102 審查建議①（作者採用）：閘門不信報告本身——手上有新版 AAB，再收 --old-aab，用跟 origin/main 一樣的 aab-diff.js 自己重算紅黃項與金絲雀。
   放行參數照報告記的（印進收據、太寬的話金絲雀會抓到），確認清單用閘門自己收的 --ack（人寫的那份，不用報告裡的）。A、B＝兩包的索引（readZipIndex） */
function recomputeDiff(AD, A, B, args, ack) {
  const re = (k) => (args && typeof args[k] === "string" && args[k] ? new RegExp(args[k]) : undefined);
  const o = { expectRemoved: re("expect-removed"), expectAdded: re("expect-added"), expectShrunk: re("expect-shrunk"), ack: ack instanceof Set ? ack : new Set() };
  const r = AD.diffIndex(A, B, o), c = AD.canaryRun(A, B, o);
  return { red: r.red, yellow: r.yellow, acked: r.acked.map((y) => y.ack), allowed: r.allowed.length, canaryOk: c.ok === true, canary: c };
}
/* #102 審查④：收據（JSON）——送審 AAB、舊版、放行參數原樣、確認過的黃項確認碼逐筆、工具雜湊。閘門通過才寫 */
function aabDiffReceipt(aabSha, reports, re) {
  const x = (reports || []).find((r) => r && r.json && r.json.tool === "AAB-DIFF"), j = x && x.json;
  if (!j) return null;
  const args = {}; for (const k of ["expect-removed", "expect-added", "expect-shrunk"]) if (j.args && typeof j.args[k] === "string") args[k] = j.args[k];
  return { tool: "AAB-DIFF", aabSha256: aabSha, oldCode: j.oldCode || null, newCode: j.newCode || null, oldSha256: j.oldSha256 || null, args,
    acked: re ? re.acked.slice() : [], allowed: re ? re.allowed : null, recomputed: !!re, toolPins: j.toolPins || null };
}
/* W91：產物比對的摘要（舊版、放行參數、確認過的黃項），給命令列印出、收據記（不放進 gate() 的回傳，回傳格式不變） */
function aabDiffInfo(reports) {
  const x = (reports || []).find((r) => r && r.json && r.json.tool === "AAB-DIFF"), j = x && x.json;
  if (!j) return null;
  return { file: x.file, oldCode: j.oldCode || null, oldSha256: j.oldSha256 || null, args: j.args && typeof j.args === "object" ? j.args : {},
    acked: Array.isArray(j.acked) ? j.acked.map((y) => y && y.ack) : [], allowed: Array.isArray(j.allowed) ? j.allowed.length : 0 };
}

async function main() {
  process.exitCode = 2;   /* PR #66 第八次複審：探測卡住、程序提早結束時不能變成 0；只有最後判定才改掉 */
  const a = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
  const j = process.argv.indexOf("--reports"), AAB = a("--aab"), BUILD = a("--build");
  const files = j > 0 ? process.argv.slice(j + 1).filter((x) => !x.startsWith("--")) : [];
  if (!AAB || !BUILD || !files.length) { console.error("用法：node scripts/p0-gate.js --aab <要送審的.aab> --build <網頁版號 YYYYMMDD-HHMM> --old-aab <Play 現行版.aab> [--ack <確認清單.json>] [--diff-receipt <收據.json>] [--waivers <檔>] --reports <報告…>"); process.exit(2) }
  if (!/^\d{8}-\d{4}$/.test(BUILD)) { console.error("✘ --build 要是網頁版號（YYYYMMDD-HHMM）"); process.exit(2) }
  if (!fs.existsSync(AAB)) { console.error("✘ 找不到 AAB：" + AAB); process.exit(2) }
  /* 豁免檔：預設倉庫 .github/p0-waivers.json（scripts 在 source/xiangqi-android/scripts）；指定了卻讀不到或格式錯＝用法錯誤 */
  const REPO_W = path.join(__dirname, "..", "..", "..", ".github", "p0-waivers.json"), WF = a("--waivers") || REPO_W;
  let waivers = [];
  if (fs.existsSync(WF)) { try { const wj = JSON.parse(fs.readFileSync(WF, "utf8")); if (!Array.isArray(wj.items)) throw 0; waivers = wj.items } catch (e) { console.error("✘ 豁免檔格式錯（要有 items 陣列）：" + WF); process.exit(2) } }
  else if (a("--waivers")) { console.error("✘ 找不到豁免檔：" + WF); process.exit(2) }
  const fromRepo = fs.existsSync(REPO_W) && path.resolve(WF) === path.resolve(REPO_W);
  /* PR #58 審查：只比路徑不夠——本機直接改、沒開 PR 的豁免也會算數；要跟 origin/main 那份逐位元組一樣 */
  if (fromRepo) { const pin = require("./repo-pin.js").sameAsMain(REPO_W); if (!pin.ok) { console.error("✘ " + pin.msg); process.exit(2) } }
  /* 工具鎖定（2026-11-23）：origin/main 那一版的雜湊用 git 讀（先 fetch）；閘門自己和鎖定用的兩支也要跟 main 一樣 */
  const ROOT = path.join(__dirname, "..", "..", ".."), cp = require("child_process");
  let fetched = null;
  const mainSha = (p) => {
    try {
      if (fetched === null) { try { cp.execFileSync("git", ["-C", ROOT, "fetch", "-q", "origin", "main"], { stdio: "ignore", timeout: 60000 }); fetched = true } catch (e) { fetched = false } }
      if (!fetched) return null;
      return TP.normSha(cp.execFileSync("git", ["-C", ROOT, "show", "origin/main:" + p], { maxBuffer: 64e6, stdio: ["ignore", "pipe", "ignore"] }));
    } catch (e) { return null }
  };
  /* 第十四次複審：閘門讀 check-aab-assets.js 的規則（它又載入 bundle-home-assets.js），這兩支也要跟 main 一樣 */
  for (const f of ["p0-gate.js", "tool-pin.js", "repo-pin.js", "check-aab-assets.js", "bundle-home-assets.js", "aab-diff.js"]) {   /* #102：閘門自己用 aab-diff 重算，它也要跟 main 一樣 */
    const m = mainSha(TP.DIR + f), l = TP.normSha(fs.readFileSync(path.join(__dirname, f)));
    if (m !== l) { console.error(`✘ ${TP.DIR + f} ${m ? "跟 origin/main 那一版不一樣" : "讀不到 origin/main 那一版（git fetch 失敗或不在倉庫裡）"}：送審閘門本身要是審過的那一版`); process.exit(2) }
  }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(AAB)).digest("hex");
  const reports = files.map((file) => { let json = null; try { json = JSON.parse(fs.readFileSync(file, "utf8")) } catch (e) {} return { file, json } });
  /* 有 P0-IMG 報告說 CDN 連不上時，閘門自己連一次 CDN（結果印出來，豁免要靠它） */
  let cdnProbe = null;
  if (reports.some(({ json }) => json && json.tool === "P0-IMG" && (json.exitCode !== 0 || (json.canary && json.canary.cdnUnreachable === true)))) { cdnProbe = await probeCdn(); console.log(`閘門自己探測 CDN：${cdnProbe.reachable ? "連得上" : "連不上"}（${cdnProbe.detail}）`) }
  /* #102 審查建議①：產物比對由閘門自己重算（--old-aab＝Play 現行版、--ack＝人寫的確認清單）；放行參數照報告記的 */
  let diffRe = null, oldSha = null;
  const OLD = a("--old-aab"), ACK = a("--ack"), adRep = reports.find(({ json }) => json && json.tool === "AAB-DIFF");
  if (OLD) {
    if (!fs.existsSync(OLD)) { console.error("✘ 找不到 --old-aab：" + OLD); process.exit(2) }
    let ack = new Set();
    if (ACK) { try { const j = JSON.parse(fs.readFileSync(ACK, "utf8")); if (!Array.isArray(j) || !j.every((x) => typeof x === "string")) throw 0; ack = new Set(j) } catch (e) { console.error("✘ --ack 清單讀不到或格式不對（要是確認碼字串的陣列）：" + ACK); process.exit(2) } }
    try { const AD = require("./aab-diff.js"); oldSha = AD.sha256File(OLD); diffRe = recomputeDiff(AD, AD.readZipIndex(OLD), AD.readZipIndex(AAB), adRep && adRep.json && adRep.json.args, ack) }
    catch (e) { console.error("✘ 閘門重算產物比對失敗：" + (e && e.message)); process.exit(2) }
  }
  const r = gate(sha, BUILD, reports, fromRepo ? waivers : [], { mainSha, cdnProbe, diffRe, oldSha });
  console.log(`要送審的 AAB：${AAB}（版號 ${BUILD}）\n  SHA-256 ${sha}`);
  if (a("--waivers") && !fromRepo) console.log("⚠ 豁免檔不是倉庫的 .github/p0-waivers.json：沒經過逐行審，裡面的豁免一律不算");
  const AD = aabDiffInfo(reports);
  if (AD) { const d = AD, args = Object.entries(d.args).filter(([k]) => k !== "ack").map(([k, v]) => `--${k}=${v}`);
    console.log(`產物比對（AAB-DIFF）：舊版 versionCode ${d.oldCode}（${String(d.oldSha256 || "").slice(0, 12)}）；放行參數 ${args.length ? args.join(" ") : "沒有"}；${diffRe ? `閘門重算：紅 ${diffRe.red.length}、沒確認的黃 ${diffRe.yellow.length}、金絲雀${diffRe.canaryOk ? "都抓到" : "沒抓到"}、照參數放行 ${diffRe.allowed} 個` : "閘門沒有重算（沒給 --old-aab）"}`);
    if (diffRe) for (const k of diffRe.acked) console.log("  確認過的黃項：" + k) }
  for (const n of r.notes) console.log("⚠ " + n);
  for (const w of r.waived) console.log("△ " + w);
  /* #102 審查④：通過時寫出產物比對的收據 JSON（--diff-receipt） */
  if (r.ok && a("--diff-receipt")) { try { fs.writeFileSync(a("--diff-receipt"), JSON.stringify(aabDiffReceipt(sha, reports, diffRe), null, 1) + "\n"); console.log("收據：" + a("--diff-receipt")) } catch (e) { console.error("✘ 寫不出收據：" + e.message); process.exit(2) } }
  if (r.ok) { console.log("✔ P0-IMG、P0-UPD、P0-3D（Android 12、16）、AAB-DIFF 都綁在這個 AAB 與版號上、都通過" + (r.waived.length ? `（其中 ${r.waived.length} 項照倉庫豁免檔放行）` : "") + "：可以送審"); process.exit(0) }
  for (const p of r.problems) console.log("✘ " + p);
  console.log("✘ 不能送審"); process.exit(1);
}
module.exports = { probeCdn, GATE_CDN, gate, aabDiffInfo, recomputeDiff, aabDiffReceipt, validWaiver, onlyCdnDown, TOOLS, ANDROID_3D, ROUNDS_3D, WAIVABLE };
if (require.main === module) main().catch((e) => { console.error("✘ " + (e && e.message)); process.exit(2) });
