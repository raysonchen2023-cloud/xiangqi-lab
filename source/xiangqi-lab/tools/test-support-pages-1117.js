// 11/17：App Store Connect 的支援網址、隱私權政策網址改成乾淨的網頁版（support.html、privacy.html，放網站根目錄），不用 GitHub 的 blob 頁面。
// 檢查：兩頁存在、沒有開發用字（test-*.js、網頁版用的欄位、測試項數）、不載入任何外部資源、有聯絡信箱、互相有連結；
// sw.js 不會把這兩頁換成 App 的 index.html；build-site 會複製進 site/；iOS 包不放；metadata.md 換成新網址；三處隱私說法一致。
// 用法：node --test xiangqi-lab/tools/test-support-pages-1117.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
/* 11/18 公開證據（0319）：公開副本（ROOT 有 STAGE-MANIFEST.json）沒有 xiangqi-ios、xiangqi-lab/site、xiangqi-lab/src 的支援／隱私頁、xiangqi-db/art/docs、xiangqi-db/i18n-en.json（只放 CDN）。
   site 的檔、文件原稿、支援／隱私頁退回倉庫根目錄那一份（跟線上同一份：../、../data/docs/、../support.html）；還是找不到的子測試照實標略過、寫原因。開發者電腦上（沒有 STAGE-MANIFEST.json）照常跑，缺檔照樣失敗 */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json")) || !fs.existsSync(path.join(ROOT, "xiangqi-ios"));   /* 公開副本的 run-tests 會把 source/ 抄到暫存資料夾（沒有 STAGE-MANIFEST.json），所以也看有沒有 xiangqi-ios */
function alt(p) { p = String(p); if (!PUB || fs.existsSync(path.join(ROOT, p))) return p;
  for (const [re, to] of [[/^xiangqi-lab\/site\//, "../"], [/^xiangqi-db\/art\/docs(\/|$)/, "../data/docs$1"], [/^xiangqi-lab\/src\/(support|privacy)\.html$/, "../$1.html"]]) if (re.test(p)) { const q = p.replace(re, to); if (fs.existsSync(path.join(ROOT, q))) return q }
  return p }
function skipMissing(t0) {
  const why = p => { const s = String(p || "").split(String.fromCharCode(92)).join("/");
    return /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /xiangqi-lab\/(site|src)\//.test(s) ? "沒有 " + s.slice(s.indexOf("xiangqi-lab/")) + "（公開副本不含）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = PUB && e && e.code === "ENOENT" ? (why(e.path) || "公開副本沒有這個檔：" + String(e.path || "").split(String.fromCharCode(92)).join("/").split("/").slice(-2).join("/")) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const IOS = fs.existsSync(path.join(ROOT, "xiangqi-ios")) ? false : "沒有 xiangqi-ios";
const SUP = "xiangqi-lab/src/support.html", PRI = "xiangqi-lab/src/privacy.html", MAIL = "xiangqiqianqiu.app@gmail.com";
const BASE = "https://raysonchen2023-cloud.github.io/xiangqi-lab/";
const text = h => h.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");

test("兩頁存在、是完整的 HTML（doctype、charset、viewport、標題），中英對照", () => {
  for (const [f, zh, en] of [[SUP, "象棋千秋 支援", "Xiangqi Qianqiu Support"], [PRI, "象棋千秋 隱私權政策", "Xiangqi Qianqiu Privacy Policy"]]) {
    if (!fs.existsSync(path.join(ROOT, alt(f)))) { if (PUB) { const e = new Error("ENOENT " + f); e.code = "ENOENT"; e.path = f; throw e } assert.fail(f) }
    const h = rd(f);
    assert.match(h, /^<!doctype html>\n<html lang="zh-Hant">/); assert.ok(h.includes('<meta charset="utf-8">') && h.includes('name="viewport"'));
    assert.ok(h.includes("<h1>" + zh + "</h1>") && h.includes("<h1>" + en + "</h1>"), f + " 中英標題");
    assert.ok(h.includes('<section id="zh" lang="zh-Hant">') && h.includes('<section id="en" lang="en">'));
    assert.ok(h.includes("@media (prefers-color-scheme:dark)") && h.includes("color-scheme"), "深淺色都可以看");
  }
});

test("沒有開發用字：test-*.js、網頁版用的欄位、測試項數、只在 App 裡看得懂的「見第 N 項」", () => {
  for (const f of [SUP, PRI]) {
    const t = text(rd(f));
    assert.ok(!/test-[\w-]*\.js/.test(rd(f)), f + "：test-*.js");
    assert.ok(!/網頁版用的欄位|xiangqi-lab\/tools|（\d+ 項）|\(\d+ (tests|items)\)/.test(t), f + "：開發用字");
    assert.ok(!/見第\s*\d+\s*項|第\s*\d+～\d+\s*項|see item \d+/i.test(t), f + "：見第 N 項");
    assert.ok(!/m_dqDaily|localStorage 的 `|IndexedDB）：xqlab|web-only|app-only|gc-only|widget-only/.test(rd(f)), f + "：內部名稱、文件標記");
  }
});

test("不載入任何外部資源：沒有 script、外部樣式、圖片、字型、iframe、CSS url()／@import；favicon 用 data:", () => {
  for (const f of [SUP, PRI]) {
    const h = rd(f);
    assert.ok(!/<script|<iframe|<img|<video|<audio|<source|<object|<embed/i.test(h), f + "：沒有會載入東西的標籤");
    assert.ok(!/url\(|@import/i.test(h), f + "：CSS 沒有 url()／@import");
    const links = [...h.matchAll(/<link\b[^>]*>/g)].map(m => m[0]);
    assert.deepEqual(links, ['<link rel="icon" href="data:,">'], f + "：唯一的 <link> 是 data: 圖示（瀏覽器就不會去要 favicon.ico）");
    for (const m of h.matchAll(/\b(?:src|srcset|poster|data)=["']?([^"'\s>]+)/g)) assert.fail(f + "：" + m[0]);
    /* 外部網址只能出現在 <a> 連結裡（點了才開），而且這兩頁目前連 <a> 也只有站內和 mailto */
    for (const m of h.matchAll(/href="([^"]+)"/g)) assert.ok(/^(#|support\.html|privacy\.html|mailto:|data:,)/.test(m[1]), f + "：連結 " + m[1]);
  }
});

test("有聯絡信箱（可點的 mailto）、互相有連結；支援頁有四個常見問題", () => {
  const S = rd(SUP), P = rd(PRI);
  for (const h of [S, P]) assert.ok(h.includes('href="mailto:' + MAIL + '"') && h.includes(">" + MAIL + "</a>"));
  assert.ok(S.includes('href="privacy.html"') && S.includes('href="privacy.html#en"'), "支援 → 隱私");
  assert.ok(P.includes('href="support.html"'), "隱私 → 支援");
  for (const q of ["存檔放在哪裡？", "換手機怎麼把存檔搬過去？", "怎麼刪除我的資料？", "檢舉多久會處理？"]) assert.ok(S.includes(q), q);
  for (const q of ["Where is my save stored?", "How do I move my save to a new phone?", "How do I delete my data?", "How soon are reports handled?"]) assert.ok(S.includes(q), q);
  assert.ok(S.includes("設定 → 🎒 換手機 → 新手機・輸入轉移碼"), "換手機路徑跟 App 一致");
  /* 檢舉時限跟審查備註同一個數字 */
  if (!IOS) assert.ok(rd("xiangqi-ios/appstore/metadata.md").includes("Reports are handled within 7 days.") && S.includes("目標在 7 天內處理") && S.includes("within 7 days"));
});

test("隱私權政策公開版：這次的修正都寫進去（需要時才抓、飛鴿規則、App 版匿名開關預設關、Game Center 和小工具看建置內容）", () => {
  const P = rd(PRI);
  assert.ok(P.includes("如果你送過意見回饋，App 開啟時會從 Cloudflare 下載一次修正清單和開發者回覆，讓你收到飛鴿傳書"));
  assert.ok(P.includes("沒送過就只在打開意見回饋時下載"));
  assert.ok(P.includes("進入線上大廳（或千秋盃、觀戰這些連線功能）時，會從 GitHub Pages 下載一次停權名單；同一次開 App 只下載一次"));
  assert.ok(P.includes("只打開意見回饋頁、沒有送出，不算"));
  assert.ok(P.includes("這兩個網站跟任何連線一樣會看到你的 IP 位址，但不會收到你的名字、存檔或棋譜"));
  assert.ok(P.includes("兒童模式開著，或家長關閉線上大廳時，這兩份都不下載"));
  assert.ok(P.includes("If you have sent feedback, the app downloads the fix list and developer replies from Cloudflare once when it opens"));
  assert.ok(/<b>App 版預設關閉<\/b>，你打開才送；2026 年 11 月 17 日以前就裝了 App、沒關過的，維持原本的狀態/.test(P), "匿名開關 App 版預設關");
  assert.ok(P.includes("<b>Off by default in the app</b>; sent only if you turn them on."));
  assert.ok(P.includes("只有內建這兩項功能的 App 版本才有") && P.includes("exist only in app builds that include them"), "Game Center、小工具看建置內容");
  assert.ok(P.includes("相機：只在「意見回饋」附圖時你選「拍照」才用"), "相機用途照實際（不是掃 QR）");
  assert.ok(!/掃 QR|QR 碼時用/.test(P));
  assert.ok(P.includes("Hung-Sheng Chen"));
});

test("三處說法一致：App 內設定的隱私卡片（07x4）、privacy.md、privacy.html、iOS app-privacy.md 都有同一句修正清單說明", () => {
  const X4 = rd("xiangqi-db/m/07x4-lobbysafe.js"), nat = X4.match(/const XQ_NETWHEN_NAT="([^"]+)"/)[1];
  const fix = nat.split("。")[0] + "。";
  assert.equal(fix, "如果你送過意見回饋，App 開啟時會從 Cloudflare 下載一次修正清單和開發者回覆，讓你收到飛鴿傳書；沒送過就只在打開意見回饋時下載。");
  const P = rd(PRI).replace(/（App 裡告訴你「你回報的問題修好了」或開發者回你的信）/, "");
  assert.ok(P.includes(fix), "privacy.html");
  assert.ok(rd("xiangqi-db/art/docs/privacy.md").includes(fix), "privacy.md");
  if (!IOS) assert.ok(rd("xiangqi-ios/appstore/app-privacy.md").includes(fix), "app-privacy.md");
  /* privacy.md 相機那句也更正了 */
  assert.ok(rd("xiangqi-db/art/docs/privacy.md").includes("相機只在「意見回饋」附圖時你選「拍照」才用"));
});

test("sw.js：這兩頁（含不帶 .html）直接問網路，不會被換成 App 的 index.html；App 本身照舊", () => {
  const W = rd("xiangqi-lab/src/sw.js");
  const line = W.split("\n").find(l => l.includes("(support|privacy)")); assert.ok(line, "有放行規則");
  const re = new RegExp(line.match(/if\(\/(.+)\/\.test\(url\.pathname\)\)return;/)[1]);
  for (const p of ["/xiangqi-lab/support.html", "/xiangqi-lab/support", "/xiangqi-lab/privacy.html", "/xiangqi-lab/privacy", "/xiangqi-lab/privacy/"]) assert.ok(re.test(p), p);
  for (const p of ["/xiangqi-lab/", "/xiangqi-lab/index.html", "/xiangqi-lab/data/docs/privacy.md", "/xiangqi-lab/data/docs/support.md"]) assert.ok(!re.test(p), p);
  assert.ok(W.indexOf(line) < W.indexOf("e.respondWith((async()=>{"), "放行在「頁面一律給 index.html」之前");
  assert.ok(W.indexOf(line) < W.indexOf('isPage=req.mode==="navigate"'));
});

test("build-site 把 src/ 整個複製進 site/（兩頁跟著進網站根目錄）；iOS 包不放這兩頁", () => {
  assert.ok(rd("xiangqi-lab/tools/build-site.js").includes("for(const f of fs.readdirSync(SRC))fs.copyFileSync(path.join(SRC,f),path.join(SITE,f));"));
  if (!IOS) { const C = rd("xiangqi-ios/scripts/copy-www.js"); assert.ok(C.includes("/^(support|privacy)\\.html$/,"), "copy-www SKIP");
    const re = /^(support|privacy)\.html$/; assert.ok(re.test("support.html") && re.test("privacy.html") && !re.test("data/docs/privacy.md")) }
});

test("metadata.md：支援網址、隱私權政策網址換成新網頁；聯絡人姓名、信箱；電話留給開發者本人填；賣家名稱", { skip: IOS }, () => {
  const M = rd("xiangqi-ios/appstore/metadata.md");
  assert.ok(M.includes("| 支援網址 | `" + BASE + "support.html` |"));
  assert.ok(M.includes("| 隱私權政策網址 | `" + BASE + "privacy.html` |"));
  assert.ok(M.includes("| 行銷網址（選填） | `" + BASE + "` | 網頁版 |"), "行銷網址照舊");
  assert.ok(M.includes("| 聯絡人・姓名 | Hung-Sheng Chen（Apple 開發者帳號開通後，照帳號上的法定姓名核對） |"));
  assert.ok(M.includes("| 聯絡人・Email | " + MAIL + "（支援信箱） |"));
  assert.ok(/\| 聯絡人・電話 \| ☐ 開發者本人在 App Store Connect 填（這裡不代填、不猜）。審查期間審查員可能會打電話或寄信，電話和信箱都要有人看 \|/.test(M));
  assert.ok(!/聯絡人・電話 \| [^☐]*\d{4}/.test(M), "沒有代填電話號碼");
  assert.ok(M.includes("| 賣家名稱（Seller） | **Hung-Sheng Chen** |") && M.includes("Apple 開發者帳號開通後，照帳號上的法定姓名核對；拼法不同就連關於頁一起改"));
  const s = M, a = s.indexOf("```\nThank you"), b = s.indexOf("\n```", a + 3), N = s.slice(a + 4, b);
  assert.ok(N.includes("Privacy policy: " + BASE + "privacy.html · Support: " + BASE + "support.html"), "審核備註也換新網址");
  assert.ok(!/\| (支援網址|隱私權政策網址) \|[^|]*blob\/main/.test(M), "表格不再用 blob 頁");
});
