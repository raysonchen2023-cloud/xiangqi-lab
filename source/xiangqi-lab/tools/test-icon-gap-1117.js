// 11/17 Windows 測試員 B-10（P3）：主控台 404——data/icons/han/e_cheer.webp、data/icons/classic/e_cheer.webp、data/icons/han/e_phone.webp（畫面沒破圖）。
//   原因：02-shell icoSrc 一律先要「當朝」那張（🎉→e_cheer、📱→e_phone…），有幾個圖示不是每一朝都有畫；404 了 onerror 才依序借 classic、ming…，
//   借的第一站 classic 也沒有 e_cheer，又一個 404。
//   修法：ICO_GAP（哪幾朝沒畫）＋icoAt：當朝沒畫就直接要 ICO_ALT 裡第一個有畫的那朝。不畫新圖。
// 這裡逐一對 xiangqi-lab/site/data/icons 的檔：每個圖示名 × 每一朝，icoSrc 要的檔都要存在（補了圖、少了圖，表沒跟著改就會失敗）。
// 用法：node --test xiangqi-lab/tools/test-icon-gap-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const SH = rd("xiangqi-db/m/02-shell.js"), ICONS = path.join(ROOT, "xiangqi-lab/site/data/icons");
const line = head => { const L = SH.split("\n"), i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); return L[i] };
function kit(era, src) {
  const ctx = { store: { get: (k, d) => k === "era" ? era : d } }; vm.createContext(ctx);
  vm.runInContext((src || [line("const ICO_GAP="), line("function icoAt("), line("const icoSrc=")].join("\n")) + ";this.icoSrc=icoSrc;", ctx);
  return ctx.icoSrc;
}
const HAVE = fs.existsSync(ICONS), SKIP = "沒有 data/icons 圖示（只放 CDN，公開副本沒有）";
const ERAS = HAVE ? fs.readdirSync(ICONS).filter(d => fs.statSync(path.join(ICONS, d)).isDirectory()) : [];
const NAMES = [...new Set(ERAS.flatMap(e => fs.readdirSync(path.join(ICONS, e)).filter(f => f.endsWith(".webp")).map(f => f.slice(0, -5))))];
const has = u => fs.existsSync(path.join(ROOT, "xiangqi-lab/site", u));

test("〔重現〕測試員看到的三個 404：漢朝 🎉、經典 🎉、漢朝 📱 都改要有畫的那一朝", t => {
  if (!HAVE) return t.skip(SKIP);
  assert.ok(!has("data/icons/han/e_cheer.webp") && !has("data/icons/classic/e_cheer.webp") && !has("data/icons/han/e_phone.webp"), "前提：這三張真的沒有");
  for (const [era, n] of [["han", "e_cheer"], ["classic", "e_cheer"], ["han", "e_phone"]]) {
    const u = kit(era)(n); assert.ok(has(u), era + " " + n + " → " + u);
    assert.notEqual(u, `data/icons/${era}/${n}.webp`);
  }
  assert.equal(kit("han")("e_cheer"), "data/icons/ming/e_cheer.webp", "經典也沒有 → 借明朝（onerror 原本的借用順序 classic、ming…）");
  assert.equal(kit("han")("e_phone"), "data/icons/classic/e_phone.webp");
});

test("〔全部對檔〕每個圖示名 × 每一朝：icoSrc 要的檔都在（不再先 404 才借）", t => {
  if (!HAVE) return t.skip(SKIP);
  assert.ok(ERAS.length >= 13 && NAMES.length >= 80, "圖示資料夾在");
  const miss = [];
  for (const e of ERAS) { const f = kit(e); for (const n of NAMES) if (!has(f(n))) miss.push(e + "/" + n) }
  assert.deepEqual(miss, []);
});

test("〔照舊〕當朝有畫的照舊用當朝那張（只有缺的才換）", () => {
  assert.equal(kit("tang")("e_cheer"), "data/icons/tang/e_cheer.webp");
  assert.equal(kit("han")("home"), "data/icons/han/home.webp");
  assert.equal(kit("finale")("home"), "data/icons/finale/home.webp", "表上沒有的朝代、名字：原樣");
});

test("〔對照〕拿掉修補（舊 icoSrc）就會要到不存在的檔", t => {
  if (!HAVE) return t.skip(SKIP);
  const old = kit("han", 'const icoSrc=n=>`data/icons/${store.get("era","classic")}/${n}.webp`;');
  assert.ok(!has(old("e_cheer")) && !has(old("e_phone")));
});
