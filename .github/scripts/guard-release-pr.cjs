// 發布 PR 的產物守門（W69 流程盤點第 2 項，2026-11-22）：
//   為什麼：ci-mode.cjs 只看分支名，release/ 開頭就是發布模式，原本的「功能 PR 只准改 source/」守門不跑；
//   任何分支取名 release/x 就能直接改網站上的 data/、engine/、根目錄 js，而組版比對只管 index.html，這些檔沒有原始碼對照。
//   這支在發布模式逐檔核對「發布 PR 改到的每一個檔」都對得到來源，對不到就擋：
//     A. 發布產物本身：index.html、sw.js、release.json、data/docs/evidence.md、data/docs/foss.md、source/STAGE-MANIFEST.json、
//        source/verification-log-*.txt（另有組版比對、版號一致、證據重產、發布同步檢查把關）
//     B. 根目錄跟 source/xiangqi-lab/src/ 同名的檔（build-site.js 整包複製）：要跟 src 那份逐字相同
//     C. data/<路徑> 在 source/xiangqi-db/art/<路徑> 有素材原始資料：要跟原始資料逐字相同
//     D. data/、engine/ 在 CDN 的 cdn-manifest.json 有登記：大小與 SHA-1 前 12 碼要跟 CDN 一樣（先上 CDN、再發布）
//     E. 只放 GitHub、不上 CDN 的小檔（ONLY_GITHUB）：允許，列出來給審查看
//     其他（source/ 的程式、.github/、releases/ 以外、對不到來源的根目錄檔、刪除非 data/ 的檔）一律擋：要走功能 PR
// 用法：node .github/scripts/guard-release-pr.cjs [比較基準，預設 origin/main] [--manifest <cdn-manifest.json>]
// 結束代碼：0＝每個檔都對得到來源；1＝有對不到的；2＝用法或環境錯誤；3＝抓不到 CDN 清單（缺驗）
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs"), crypto = require("crypto");

const CDN = "https://xiangqi-cdn.pages.dev/";
const PRODUCTS = [/^index\.html$/, /^sw\.js$/, /^release\.json$/, /^data\/docs\/(evidence|foss)\.md$/, /^source\/STAGE-MANIFEST\.json$/, /^source\/verification-log-[0-9-]+\.txt$/];
/* 只放 GitHub、不上 CDN 的小檔（11/22 量過：倉庫 473 個 data／engine 檔裡不在 CDN 清單的就是這幾類） */
const ONLY_GITHUB = [/^data\/preload\.json$/, /^data\/big-books\.json$/, /^data\/banlist\.json$/, /^data\/docs\/evidence\/[^/]+\.png$/];

/* 判斷一個檔：c＝{status:"A"|"M"|"D", path}；ctx 提供查詢函式（測試可以注入）。回傳 {ok, why} */
function judgeOne(c, ctx) {
  const f = c.path;
  /* 驗證紀錄每版換新（#31 刪了 0643 那份、加了 0804 那份），可以刪；其他發布產物不能刪 */
  if (PRODUCTS.some((r) => r.test(f))) return c.status !== "D" ? { ok: true, why: "發布產物" }
    : /^source\/verification-log-/.test(f) ? { ok: true, why: "換掉上一版的驗證紀錄" } : { ok: false, why: "不能刪發布產物" };
  if (c.status === "D") return /^data\//.test(f) ? { ok: true, why: "刪除 data 檔（列出來給審查看）" } : { ok: false, why: "發布 PR 不能刪 data/ 以外的檔" };
  if (!f.includes("/") && ctx.srcHas(f)) return ctx.srcSame(f) ? { ok: true, why: "跟 source/xiangqi-lab/src 同一份" } : { ok: false, why: "跟 source/xiangqi-lab/src/" + f + " 不一樣（根目錄 js 只能由原始碼複製過來）" };
  if (/^data\//.test(f) && ctx.artHas(f.slice(5))) return ctx.artSame(f.slice(5)) ? { ok: true, why: "跟素材原始資料同一份" } : { ok: false, why: "跟 source/xiangqi-db/art/" + f.slice(5) + " 不一樣" };
  if (/^(data|engine)\//.test(f)) {
    const m = ctx.manifest[f];
    if (m) { const h = ctx.info(f); return h.size === m[0] && h.sha12 === m[1] ? { ok: true, why: "跟 CDN 同一份" } : { ok: false, why: `跟 CDN 不是同一份（大小 ${h.size}／CDN ${m[0]}，SHA-1 前 12 碼 ${h.sha12}／CDN ${m[1]}）：先上 CDN 再發布` } }
    if (ONLY_GITHUB.some((r) => r.test(f))) return { ok: true, why: "只放 GitHub 的小檔（列出來給審查看）" };
    return { ok: false, why: "CDN 清單沒有這個檔，也沒有素材原始資料：對不到來源" };
  }
  return { ok: false, why: "發布 PR 只能放發布產物與對得到來源的網站檔；source/ 的程式、.github/ 等要走功能 PR" };
}
function judge(changes, ctx) { return changes.map((c) => ({ ...c, ...judgeOne(c, ctx) })) }

/* git diff --name-status 的輸出 → [{status, path}]（改名當成刪除＋新增：--no-renames） */
function parseNameStatus(z) {
  const a = z.split("\0").filter((x) => x !== ""), out = [];
  for (let i = 0; i + 1 < a.length; i += 2) out.push({ status: a[i][0], path: a[i + 1] });
  return out;
}
module.exports = { PRODUCTS, ONLY_GITHUB, judgeOne, judge, parseNameStatus };
if (require.main !== module) return;

(async () => {
  const args = process.argv.slice(2), mi = args.indexOf("--manifest");
  const MAN = mi >= 0 ? args[mi + 1] : null, base = args.find((x, i) => !x.startsWith("--") && i !== mi + 1) || "origin/main";
  const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8", maxBuffer: 64e6 });
  let changes;
  try { changes = parseNameStatus(git("diff", "--name-status", "-z", "--no-renames", `${base}...HEAD`)) }
  catch (e) { console.error("✘ 讀不到跟 " + base + " 的差異：" + e.message); process.exit(2) }
  let manifest = null;
  if (MAN) manifest = JSON.parse(fs.readFileSync(MAN, "utf8")).files;
  else for (let t = 0; t < 4 && !manifest; t++) {
    if (t) await new Promise((r) => setTimeout(r, 1000 * t));
    try { const r = await fetch(CDN + "cdn-manifest.json?t=" + Date.now()); if (r.ok) manifest = (await r.json()).files } catch (e) { }
  }
  const needCdn = changes.some((c) => /^(data|engine)\//.test(c.path) && c.status !== "D");
  if (!manifest && needCdn) { console.error("△ 抓不到 CDN 的 cdn-manifest.json：這個發布 PR 改到 data／engine，沒辦法核對（缺驗）"); process.exit(3) }
  const exists = (f) => fs.existsSync(f), read = (f) => fs.readFileSync(f);
  const ctx = {
    manifest: manifest || {},
    srcHas: (f) => exists("source/xiangqi-lab/src/" + f),
    srcSame: (f) => exists(f) && read(f).equals(read("source/xiangqi-lab/src/" + f)),
    artHas: (r) => exists("source/xiangqi-db/art/" + r),
    artSame: (r) => exists("data/" + r) && read("data/" + r).equals(read("source/xiangqi-db/art/" + r)),
    info: (f) => { const b = read(f); return { size: b.length, sha12: crypto.createHash("sha1").update(b).digest("hex").slice(0, 12) } },
  };
  const R = judge(changes, ctx), bad = R.filter((x) => !x.ok);
  console.log(`發布 PR 改到 ${R.length} 個檔（比較基準 ${base}）：`);
  for (const x of R) console.log(`  ${x.ok ? "✔" : "✘"} ${x.status} ${x.path}｜${x.why}`);
  console.log(bad.length ? `✘ ${bad.length} 個檔對不到來源：發布 PR 只能放發布產物與對得到來源的網站檔` : "✔ 每個改到的檔都對得到來源");
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error("✘ " + (e.stack || e)); process.exit(2) });
