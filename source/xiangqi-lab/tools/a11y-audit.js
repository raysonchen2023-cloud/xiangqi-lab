// 11/12 無障礙靜態稽核（評比循環第 3 輪「無障礙專家」P16：建立自動稽核報告）
// 用 xiangqi-db/tools/mhtml.js 的 assemble() 組出完整的 m.html（m.css＋m/*.js），不開瀏覽器，只看原始碼：
//   ① 圖示按鈕（按鈕裡只有 emoji／符號）沒有 aria-label
//   ② <img> 沒有 alt
//   ③ 可以點的 div／span 等（行內 onclick、cursor:pointer）沒有 role
//   ④ m.css 同一條規則裡前景（color）／背景（background）色碼組合的 WCAG 對比不足（一般字 4.5:1、大字 3:1）
//   ⑤ JS 建的圖示按鈕（createElement("button") 後 textContent 只有符號）沒有 aria-label
// 動態稽核（真的開頁面跑 axe-core）由開發者之後用正式瀏覽器補；這支只做靜態、找得到原始碼行號的部分。
// 用法：
//   node tools/a11y-audit.js                → 寫 xiangqi-db/story/92_無障礙稽核報告.md（有 a11y-baseline.json 就附修前數字）
//   node tools/a11y-audit.js --save-baseline → 把現在的結果存成「修前」基準 tools/a11y-baseline.json
//   node tools/a11y-audit.js --json          → 把結果印成 JSON
"use strict";
const fs = require("fs"), path = require("path");
const LAB = path.join(__dirname, ".."), DBDIR = path.join(LAB, "../xiangqi-db");
const REPORT = path.join(DBDIR, "story/92_無障礙稽核報告.md"), BASE = path.join(__dirname, "a11y-baseline.json");

// ---------- 顏色與對比（WCAG 2.x 相對亮度） ----------
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], red: [255, 0, 0, 1], transparent: [0, 0, 0, 0] };
function parseColor(s) {
  if (s == null) return null; s = String(s).trim().toLowerCase();
  if (NAMED[s]) return NAMED[s].slice();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map(c => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = s.match(/^rgba?\(([^)]*)\)$/);
  if (m) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean);
    if (p.length < 3) return null;
    const ch = x => /%$/.test(x) ? parseFloat(x) * 2.55 : parseFloat(x);
    const a = p[3] == null ? 1 : /%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    const r = [ch(p[0]), ch(p[1]), ch(p[2]), a];
    return r.some(x => !isFinite(x)) ? null : r;
  }
  m = s.match(/^hsla?\(([^)]*)\)$/);
  if (m) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean);
    if (p.length < 3) return null;
    const H = (parseFloat(p[0]) % 360 + 360) % 360 / 360, S = parseFloat(p[1]) / 100, L = parseFloat(p[2]) / 100, A = p[3] == null ? 1 : /%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    const f = t => { t = (t + 1) % 1; const q = L < .5 ? L * (1 + S) : L + S - L * S, pp = 2 * L - q; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < .5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp };
    return [f(H + 1 / 3) * 255, f(H) * 255, f(H - 1 / 3) * 255, A];
  }
  return null;
}
const blend = (fg, bg) => { const a = fg[3] == null ? 1 : fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1] };
function relLum(c) { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]) }
// 對比值（1～21）；fg、bg 可以是字串或 [r,g,b,a]；半透明前景先疊在背景上；半透明背景疊在 base（預設紙色）上
function contrast(fg, bg, base) {
  const F = typeof fg === "string" ? parseColor(fg) : fg, B0 = typeof bg === "string" ? parseColor(bg) : bg;
  if (!F || !B0) return null;
  const Bs = typeof base === "string" ? parseColor(base) : base || [243, 237, 226, 1];
  const B = (B0[3] == null || B0[3] >= 1) ? B0 : blend(B0, Bs), Fb = (F[3] == null || F[3] >= 1) ? F : blend(F, B);
  const a = relLum(Fb), b = relLum(B);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

// ---------- CSS 解析 ----------
function splitTop(s, sep) { const out = []; let d = 0, q = "", cur = ""; for (const ch of s) { if (q) { if (ch === q) q = ""; cur += ch; continue } if (ch === '"' || ch === "'") { q = ch; cur += ch; continue } if (ch === "(") d++; else if (ch === ")") d--; if (ch === sep && d === 0) { out.push(cur); cur = "" } else cur += ch } if (cur.trim()) out.push(cur); return out }
function parseDecls(body) { const o = []; for (const d of splitTop(body, ";")) { const i = d.indexOf(":"); if (i < 0) continue; const p = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim(); if (p) o.push([p, v.replace(/\s*!important\s*$/i, ""), /!important\s*$/i.test(v)]) } return o }
// 回傳 [{sel, decls, media:[...], line}]；@keyframes 裡面不算
function parseCss(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "));
  const rules = [], stack = []; let i = 0, start = 0;
  const lineAt = k => src.slice(0, k).split("\n").length;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "{") {
      const pre = src.slice(start, i).trim();
      if (pre.startsWith("@")) { stack.push(pre); start = i + 1; i++; continue }
      let d = 1, j = i + 1; while (j < src.length && d) { if (src[j] === "{") d++; else if (src[j] === "}") d--; j++ }
      if (!stack.some(s => /^@(-webkit-)?keyframes/i.test(s))) rules.push({ sel: pre, decls: parseDecls(src.slice(i + 1, j - 1)), media: stack.slice(), line: lineAt(start + (src.slice(start, i).length - src.slice(start, i).trimStart().length)) });
      i = j; start = j; continue;
    }
    if (ch === "}") { stack.pop(); start = i + 1 }
    else if (ch === ";" && stack.length === 0) start = i + 1;
    i++;
  }
  return rules;
}
const isDarkMedia = m => m.some(x => /prefers-color-scheme\s*:\s*dark/i.test(x));
function varScopes(rules) {
  const light = {}, dark = {}, scoped = [];
  for (const r of rules) {
    const vs = r.decls.filter(d => d[0].startsWith("--")); if (!vs.length) continue;
    for (const s0 of splitTop(r.sel, ",")) {
      const s = s0.trim();
      if (/^:root$/.test(s) && !isDarkMedia(r.media)) vs.forEach(d => light[d[0]] = d[1]);
      else if (/^:root(:not\(\[data-theme=light\]\))?$/.test(s) && isDarkMedia(r.media) || /^:root\[data-theme=dark\]$/.test(s)) vs.forEach(d => dark[d[0]] = d[1]);
      else scoped.push({ sel: s, vars: Object.fromEntries(vs.map(d => [d[0], d[1]])) });
    }
  }
  return { light, dark, scoped };
}
function resolveVars(v, vars, depth) {
  depth = depth || 0; if (depth > 12 || !/var\(/.test(v)) return v;
  const out = v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g, (m, n, fb) => vars[n] != null ? vars[n] : fb != null ? fb.trim() : "§");
  return resolveVars(out, vars, depth + 1);
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black|transparent)\b/;
function firstColor(v) { if (v == null) return null; if (/gradient\(|url\(|§|currentcolor|inherit|initial|unset|color-mix/i.test(v)) return null; const m = v.match(COLOR_RE); return m ? m[0] : null }
const fontPx = decls => { let px = null, bold = false; for (const [p, v] of decls) { if (p === "font-size") { const m = v.match(/^([\d.]+)px$/); if (m) px = +m[1] } if (p === "font-weight" && /bold|[7-9]00/.test(v)) bold = true; if (p === "font") { const m = v.match(/([\d.]+)px/); if (m) px = +m[1]; if (/\b(bold|[7-9]00)\b/.test(v)) bold = true } } return { px, bold } };
const isLarge = f => f.px != null && (f.px >= 24 || f.px >= 18.66 && f.bold);
// 每條同時寫了 color 和 background 色碼的規則，算對比
function auditCss(css, opt) {
  opt = opt || {};
  const rules = parseCss(css), V = varScopes(rules), out = [], unknown = [], over = [];
  // 後面同一個選擇器（同一個 @media）又寫了 color／background：照後面的算（檔尾的修正段蓋過前面）
  const rk = r => r.media.join("|") + "§" + r.sel.replace(/\s+/g, " ").trim(), last = {};
  rules.forEach((r, i) => { const k = rk(r); for (const p of ["color", "bg"]) { const d = r.decls.filter(x => p === "color" ? x[0] === "color" : x[0] === "background-color" || x[0] === "background").pop(); if (d) last[k + "|" + p] = d } });
  for (const r of rules) {
    if (/:disabled|\[disabled\]|::?-webkit-scrollbar|::selection/i.test(r.sel)) continue;
    const c0 = r.decls.filter(d => d[0] === "color").pop(), b0 = r.decls.filter(d => d[0] === "background-color" || d[0] === "background").pop();
    if (!c0 || !b0) continue;
    const col = last[rk(r) + "|color"] || c0, bg = last[rk(r) + "|bg"] || b0;
    if (col !== c0 || bg !== b0) { if (rules.find(x => rk(x) === rk(r)) !== r) continue }   // 只在第一條報，後面的覆寫不重複報
    let worst = null;
    for (const s0 of splitTop(r.sel, ",")) {
      const s = s0.trim(), dark = isDarkMedia(r.media) || /\[data-theme=dark\]/.test(s);
      const vars = Object.assign({}, V.light, dark ? V.dark : {});
      for (const sc of V.scoped) if (s !== sc.sel && s.startsWith(sc.sel) && /[\s>+~.:\[]/.test(s[sc.sel.length] || "")) Object.assign(vars, sc.vars);
      const fc = firstColor(resolveVars(col[1], vars)), bc = firstColor(resolveVars(bg[1], vars));
      if (!fc || !bc) { unknown.push({ sel: r.sel, line: r.line }); break }
      const B = parseColor(bc); if (!B || B[3] === 0) { unknown.push({ sel: r.sel, line: r.line }); break }
      // 半透明底：多半疊在圖片或別的深色框上，靜態算不準 → 列「待實機量」；只有深色字配很淡的底（透明度 25% 以下，例如 #B5452B 字配 #B5452B22 底）當成疊在紙色上照算
      const F0 = parseColor(fc);
      if (B[3] < 1 && !(F0 && relLum(F0) < .5 && B[3] <= .25)) { over.push({ sel: r.sel, line: r.line, file: opt.file || "m.css", fg: fc, bg: bc, ratioOnWhite: Math.round(contrast(fc, bc, "#FFFFFF") * 100) / 100, ratioOnBlack: Math.round(contrast(fc, bc, "#000000") * 100) / 100 }); worst = null; break }
      const ratio = contrast(fc, bc, resolveVars(dark ? (V.dark["--bg"] || "#15110D") : (V.light["--bg"] || "#F3EDE2"), vars));
      if (ratio == null) continue;
      if (!worst || ratio < worst.ratio) worst = { ratio, fg: fc, bg: bc, sel: s };
    }
    if (!worst) continue;
    const f = fontPx(r.decls), need = isLarge(f) ? 3 : 4.5;
    out.push({ kind: "contrast", sel: r.sel, line: r.line, file: opt.file || "m.css", ratio: Math.round(worst.ratio * 100) / 100, fg: worst.fg, bg: worst.bg, need, large: isLarge(f), fail: worst.ratio < need, aaa: worst.ratio >= (isLarge(f) ? 4.5 : 7) });
  }
  return { checks: out, issues: out.filter(x => x.fail), unknown, over };
}

// ---------- 標記（HTML 與 JS 模板字串）掃描 ----------
// 從 i（"<" 的位置）找開始標籤的結尾：跳過引號、${…}
function tagEnd(s, i) {
  let q = "", d = 0;
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (d > 0) { if (c === "{") d++; else if (c === "}") d--; continue }
    if (c === "$" && s[j + 1] === "{") { d = 1; j++; continue }
    if (q) { if (c === q) q = ""; continue }
    if (c === '"' || c === "'") { q = c; continue }
    if (c === "`" || c === "\n") return -1;
    if (c === ">") return j;
  }
  return -1;
}
// 把 ${…} 換成 \u0001（動態內容），標籤拿掉
function stripDyn(s) { let o = "", d = 0; for (let j = 0; j < s.length; j++) { const c = s[j]; if (d > 0) { if (c === "{") d++; else if (c === "}") { d--; if (!d) o += "\u0001" } continue } if (c === "$" && s[j + 1] === "{") { d = 1; j++; continue } o += c } return o }
const attrOf = (a, n) => { const m = a.match(new RegExp("(?:^|[\\s\"'])" + n + "\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", "i")); return m ? m[1].replace(/^["']|["']$/g, "") : null };
const hasAttr = (a, n) => new RegExp("(?:^|[\\s\"'])" + n + "(?:\\s*=|[\\s>]|$)", "i").test(a);
const LETTER = /[\p{L}\p{N}]/u;
// 按鈕裡的字：拿掉標籤、HTML 實體（&nbsp; 這種）；有 alt 的圖片算字
function visibleText(inner) { return stripDyn(inner).replace(/<img\b[^>]*\balt="([^"]+)"[^>]*>/gi, " $1 ").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;|&#\d+;/gi, " ").trim() }
const NAMEATTR = a => hasAttr(a, "aria-label") || hasAttr(a, "aria-labelledby");
const CLICK_TAGS = /^(div|span|li|section|p|b|i|td|em|small|strong|label|article|figure)$/i;
function auditMarkup(text, opt) {
  opt = opt || {};
  const where = opt.where || (k => ({ file: opt.file || "?", line: text.slice(0, k).split("\n").length }));
  const issues = [], warn = [];
  const re = /<([a-zA-Z][\w-]*)\b/g; let m;
  while ((m = re.exec(text))) {
    const tag = m[1].toLowerCase(), i = m.index;
    if (tag === "style" || tag === "script") { const e = text.indexOf("</" + tag, i); if (e > 0 && tag === "style") { re.lastIndex = e; continue } }
    const e = tagEnd(text, i); if (e < 0) continue;
    const attrs = text.slice(i + 1 + tag.length, e), A = stripDyn(attrs), at = where(i), snip = text.slice(i, Math.min(e + 1, i + 160)).replace(/\s+/g, " ");
    if (tag === "button") {
      const close = text.indexOf("</button>", e); if (close < 0 || close - e > 4000) continue;
      const inner = text.slice(e + 1, close), vis = visibleText(inner), dyn = vis.includes("\u0001"), txt = vis.replace(/\u0001/g, "");
      if (NAMEATTR(A) || hasAttr(A, "hidden")) continue;
      if (LETTER.test(txt)) continue;
      if (dyn) continue;   // 字是程式填的，靜態看不出來
      if (!txt.replace(/\s/g, "")) { warn.push({ kind: "empty-button", ...at, snip }); continue }   // 空按鈕：多半執行時才填字，列為待確認
      issues.push({ kind: "icon-button", ...at, snip: snip + inner.slice(0, 30).replace(/\s+/g, " "), title: attrOf(A, "title") });
      continue;
    }
    if (tag === "img") {
      if (!A.trim()) continue;   // 註解裡寫的「<img>」
      if (!hasAttr(A, "alt")) issues.push({ kind: "img-alt", ...at, snip });
      else if (/role=["']?button/i.test(A) && attrOf(A, "alt") === "" && !NAMEATTR(A)) issues.push({ kind: "icon-button", ...at, snip });
      continue;
    }
    if (CLICK_TAGS.test(tag)) {
      const click = hasAttr(A, "onclick") || /cursor\s*:\s*pointer/i.test(attrOf(A, "style") || "");
      if (click && !hasAttr(A, "role")) issues.push({ kind: "click-norole", ...at, snip });
      if (/role=["']?button/i.test(A) && !hasAttr(A, "tabindex") && !hasAttr(A, "aria-hidden")) issues.push({ kind: "role-notab", ...at, snip });
      if (hasAttr(A, "role") && /role=["']?button/i.test(A) && !NAMEATTR(A)) {
        const close = text.indexOf("</" + tag + ">", e), inner = close > 0 && close - e < 2000 ? text.slice(e + 1, close) : "";
        const vis = visibleText(inner); if (!LETTER.test(vis.replace(/\u0001/g, "")) && !vis.includes("\u0001")) issues.push({ kind: "icon-button", ...at, snip });
      }
    }
    // 行內 style 同時寫死前景、背景色碼
    const st = attrOf(A, "style");
    if (st && !/\u0001/.test(st)) {
      const d = parseDecls(st), c = d.filter(x => x[0] === "color").pop(), b = d.filter(x => x[0] === "background" || x[0] === "background-color").pop();
      const fc = c && firstColor(c[1]), bc = b && firstColor(b[1]);
      if (fc && bc) { const r = contrast(fc, bc), f = fontPx(d), need = isLarge(f) ? 3 : 4.5; if (r != null && r < need) issues.push({ kind: "contrast", ...at, snip, ratio: Math.round(r * 100) / 100, fg: fc, bg: bc, need }) }
    }
  }
  // JS 建的按鈕：x=document.createElement("button") … x.textContent="✕"（同一行）沒有 aria-label
  const lines = text.split("\n"); let off = 0;
  for (const ln of lines) {
    const cm = ln.matchAll(/(\b[\w$]+)=document\.createElement\(["']button["']\)/g);
    for (const c of cm) {
      const v = c[1].replace(/\$/g, "\\$"), tm = ln.slice(c.index).match(new RegExp("\\b" + v + "\\.(?:textContent|innerText|innerHTML)=([\"'`])((?:(?!\\1).){0,40})\\1(?!\\s*\\+)"));
      if (!tm) continue;
      const t = tm[2].replace(/<[^>]*>/g, "");
      if (LETTER.test(t) || /\$\{/.test(tm[2])) continue;
      const rest = ln.slice(c.index, c.index + 1200);
      if (new RegExp("\\b" + v + "\\.setAttribute\\([\"']aria-label|\\b" + v + "\\.ariaLabel\\s*=|aria-label").test(rest)) continue;
      issues.push({ kind: "js-icon-button", ...where(off + c.index), snip: ln.slice(c.index, c.index + 140) });
    }
    off += ln.length + 1;
  }
  return { issues, warn };
}

// ---------- 組 m.html、對應回原始檔 ----------
function loadApp() {
  const MH = require(path.join(DBDIR, "tools/mhtml.js"));
  const html = MH.assemble(), segs = [];
  let from = 0;
  for (const f of MH.parts()) {
    const body = fs.readFileSync(path.join(DBDIR, f), "utf8").replace(/\n$/, "");
    const k = html.indexOf(body, from); if (k < 0) continue;
    segs.push({ f, a: k, b: k + body.length }); from = k + body.length;
  }
  const where = k => { const s = segs.find(x => k >= x.a && k < x.b); if (s) return { file: "xiangqi-db/" + s.f, line: html.slice(s.a, k).split("\n").length }; return { file: "xiangqi-db/m.html（組好的）", line: html.slice(0, k).split("\n").length } };
  const st = html.indexOf("<style>"), se = html.indexOf("</style>", st);
  return { html, where, css: fs.readFileSync(path.join(DBDIR, "m.css"), "utf8"), st, se };
}
const KIND = { "icon-button": "圖示按鈕沒有 aria-label", "js-icon-button": "JS 建的圖示按鈕沒有 aria-label", "img-alt": "<img> 沒有 alt", "click-norole": "可點的 div／span 沒有 role", "role-notab": "role=button 的 div／span 沒有 tabindex（鍵盤到不了）", contrast: "前景／背景對比不足" };
function runAudit() {
  const A = loadApp();
  // m.css 那段換成同樣行數的空白，標記掃描不會掃到樣式
  const h2 = A.st > 0 && A.se > A.st ? A.html.slice(0, A.st) + A.html.slice(A.st, A.se).replace(/[^\n]/g, " ") + A.html.slice(A.se) : A.html;
  const mk = auditMarkup(h2, { where: A.where }), cs = auditCss(A.css, { file: "xiangqi-db/m.css" });
  const issues = mk.issues.concat(cs.issues), count = {};
  for (const k of Object.keys(KIND)) count[k] = issues.filter(x => x.kind === k).length;
  return { at: new Date().toISOString(), total: issues.length, count, issues, warn: mk.warn, css: { checked: cs.checks.length, aaa: cs.checks.filter(x => x.aaa).length, unknown: cs.unknown.length, over: cs.over } };
}
const key = x => x.kind + "|" + x.file + "|" + (x.sel || x.snip || "").slice(0, 80);
// 第 5 輪：音效圖鑑直接讀 m/11c-a11ysnd.js 的 AXS_DEX（報告跟程式同一份，不會各寫各的）
function loadDex() {
  const src = fs.readFileSync(path.join(DBDIR, "m/11c-a11ysnd.js"), "utf8"), m = src.match(/const AXS_DEX=(\[[\s\S]*?\]\]);/);
  return m ? require("vm").runInNewContext(m[1]) : [];
}
const P16T = "`xiangqi-lab/tools/test-a11y-p16.js`", AUDT = "`xiangqi-lab/tools/test-a11y-audio.js`", A11T = "`xiangqi-lab/tools/test-a11y.js`";
// 第 5 輪：P16.3／P16.4／P16.5 怎麼驗證（證據頁；設定 → ♿ 無障礙「📋 測試與證據」打開的就是這份，所以放最前面）
function evidence() {
  const L = [];
  L.push("## P16.3／P16.4／P16.5 怎麼驗證（證據頁）", "",
    "每個功能一列：怎麼重現、對應的自動測試（`node --test` 跑，不開瀏覽器）、目前限制、還沒完成的事。自動測試只證明程式邏輯和 CSS 規則存在；畫面實際長相要看 Chrome 實拍，聽感要戴耳機實測；**目前沒有真人視障者試用、VoiceOver 實機待 iOS 版**。", "",
    "### P16.3 低視力與高對比", "",
    "| 功能 | 怎麼重現 | 自動測試 | 目前限制 | 未完成 |", "|---|---|---|---|---|",
    "| 高對比主題 | 設定 → 系統 → ♿ 無障礙 → 高對比主題，看首頁、設定、對局 | " + A11T + "「高對比主題：文字、按鈕、棋盤線、棋子字都 7:1 以上」「m.css 的高對比段跟 axmHcv() 同一組色碼」 | 主要文字對比目標 7:1；圖片上的字、朝代配色、半透明底另外量 | Chrome 實拍、axe-core 動態稽核 |",
    "| 鍵盤焦點框 | 用鍵盤 Tab 走首頁、設定；按 B 到棋盤再按方向鍵 | " + P16T + "「低視力 CSS：焦點框 ≥2px 高對比、棋盤焦點加三角形狀、✕ 點選區 44px、字級 2 倍確認框可捲動、棋鐘不截斷有外框」 | 一般模式藍框 3px（對淺、深底都 3:1 以上）；螢幕報讀、高對比是黃黑雙框；棋盤格另加四邊三角形 | 各朝代配色下實拍 |",
    "| 點選區 44px | 卡片右上 ✕、結果視窗按鈕；螢幕報讀、高對比、最大字級下的按鈕 | 同上 | 平面棋盤每格在 390 寬手機約 40px（棋盤 560 單位寬、每格 60），比 44 小；點偏一格內會吸到最近的合法落點。矮螢幕（高 620 以下、橫放）一般模式的動作列按鈕 38px，螢幕報讀、高對比、大字級時拉回 44px | 列表裡的小膠囊按鈕（例如「觀看」）沒有全面放大 |",
    "| 字級 2 倍不爆版 | 棋盤 → 更多設定 → 字級 → 最大；看首頁、設定卡片、確認框、對局 | 同上；" + A11T + "「字級：多超大 1.6、最大 2.0；系統字級換算與最接近的檔位」 | 這裡只檢查 CSS 規則（換行、內部捲動、不出橫向捲動），沒有量實際畫面；超過 2 倍沒保證 | Chrome 375、390 寬實拍 |",
    "| 棋鐘 | 高對比＋最大字級，下一盤有棋鐘的對局 | 同上 | 高對比時 2px 黑框，輪到的一方再加黑色外框 | 實拍 |",
    "| 換字級、高對比的提示 | 切換時跳 toast，螢幕報讀同時念 | " + P16T + "「文案：螢幕報讀模式第一次介紹 60 字內、聲音說明 40 字內、字級與高對比切換提示」 | 畫面上不常駐說明字 | — |", "",
    "### P16.4 聽覺回饋與空間感", "",
    "| 功能 | 怎麼重現 | 自動測試 | 目前限制 | 未完成 |", "|---|---|---|---|---|",
    "| 🎼 音效圖鑑 | 設定 → ♿ 無障礙 → 🎼 音效圖鑑，每列按 ▶ | " + P16T + "「音效圖鑑：九列對到 axsTone 九種，名稱、聲音、意思都在 15 字內」「音效圖鑑：白話描述跟實際音色一致（幾聲、高低、往上往下、波形用字）」 | 要使用者按下才播放；「走子音效」「吃子音效」都關時不響 | 真耳機聽感 |",
    "| 左右聲像 | 圖鑑的 ◀ 左・九路、● 中・五路、右・一路 ▶；戴耳機下棋 | " + AUDT + "「axsPan：紅方視角 九路（最左）＝左聲道 -0.8、一路（最右）＝右 +0.8、五路置中；每一路一樣寬」；" + P16T + "「axsPreview：提示音沒開也能試聽，pan 對到那一路；靜音時不響」 | 只分左右，不是 3D 環繞；Safari 14.1 以前沒有 StereoPanner，退回置中 | 實機耳機 |",
    "| 聲音之外的文字 | 螢幕報讀模式下被將軍、吃子、時間剩 10 秒、超時 | " + P16T + "「文字備援：將軍走 assertive、吃子念在每步那句、時間快到與超時念出來（超時 assertive）；不重複」 | 超時要棋鐘顯示到 0:00 才念 | VoiceOver 實機 |",
    "| 🔍 聲音事件紀錄 | 開發者模式 → 設定 → ♿ 無障礙 → 🔍 聲音事件紀錄 | " + P16T + "「聲音事件紀錄：最多 20 筆，念成「吃子／第 3 路／偏右／已播放」；沒播寫原因；只在開發者模式有按鈕」 | 一般玩家看不到；只記這次開 App 之後的 | — |", "",
    "### P16.5 無障礙心智模型", "",
    "| 功能 | 怎麼重現 | 自動測試 | 目前限制 | 未完成 |", "|---|---|---|---|---|",
    "| W 我在哪裡 | 螢幕報讀模式任何一頁按 W | " + P16T + "「W 鍵我在哪裡：頁面、焦點、輪到誰、選到哪顆、上一步；? 說明與 AXM_HELP 有寫；W 沒被別的快捷鍵佔用」 | 只有實體鍵盤；VoiceOver 手勢沒有對應 | iOS 版 |",
    "| 本頁地圖 | 螢幕報讀模式進首頁、茶肆、大廳、學習、棋譜庫、對局頁 | " + P16T + "「本頁地圖：首頁、茶肆、大廳、學習、棋譜庫、對局頁各一句，方位照空間導覽；其他頁沒有；只念一次」 | 每頁只在這次開 App 第一次進來念（W 鍵隨時再念）；星槎、渡口、驛站還沒有 | — |",
    "| 空間導覽語意化 | ? 鍵 → 🧭 空間導覽；讀螢幕用標題、地標跳 | " + P16T + "「空間導覽文件語意化：xqDocHtml 出 h1～h3、section、表格；#view 補 main 地標；導覽第一段照 ChatGPT 版」 | 文件在卡片（對話框）裡打開；主畫面的 main 地標在卡片後面 | VoiceOver 轉輪實測 |",
    "| 園子地點清單 | 螢幕報讀模式挑戰電腦，Tab 到「🌳 園子地點清單」 | " + AUDT + "「axsPlaces：照由近到遠，附在哪裡；名字照那一朝（PARK_INFO）」 | 螢幕報讀模式以園子地點清單替代 3D 場景探索，目前提供重點地點介紹 | — |", "");
  return L;
}
function round5(dex) {
  const L = [];
  L.push("## 第 5 輪：低視力、聲音圖鑑、我在哪裡（P16.3／P16.4／P16.5）", "",
    "照 Gemini、ChatGPT 的 101 號改善建議做（`xiangqi-db/story/gemini_app/101_無障礙專家改善_Gemini回覆.md`、`xiangqi-db/story/chatgpt_app/101_無障礙專家改善_ChatGPT回覆.md`）；測試 " + P16T + "。兩份建議裡的 axe-core 動態稽核、截圖組要開瀏覽器，這一輪沒做。", "",
    "### P16.4 音效圖鑑（照 `axsTone` 實際的音色寫）", "");
  for (const d of dex) L.push("- **" + d[1] + "**：" + d[2] + "——" + d[3]);
  L.push("",
    "- 位置：設定 → 系統 → ♿ 無障礙「🎧 聲音方位與動作提示音」下面「🎼 音效圖鑑」。每列一個名稱、意思、聲音描述和 ▶ 試聽按鈕（aria-label「試聽：將軍」這種）；下面「◀ 左・九路」「● 中・五路」「右・一路 ▶」試聽左右，並寫明翻轉棋盤時左右對調。",
    "- 試聽是使用者自己按的，所以提示音開關沒開也會播；App 內的「走子音效」「吃子音效」都關時不播、會說原因。Gemini 建議的「碎裂聲」「蜂鳴」、ChatGPT 的「急促三聲」「滴答聲」跟實際音色不符，沒有照用。",
    "- **文字備援**：吃子本來就念在每一步那句（「電腦走 車1平2，吃紅方 兵」）；時間剩 5 分、1 分、30 秒、10 秒本來就會念；這輪加上「你的時間到了，超時」。將軍那一步、超時改念在 `role=alert`、`aria-live=assertive` 的播報區（11c `axsAlert`），整句只念一次，不在 polite 區重複。提示音開著、沒開螢幕報讀模式也會念。",
    "- **聲音事件紀錄**（開發者模式才有按鈕）：最近 20 筆「吃子／第 3 路／偏右／已播放」，沒播出來的寫原因（提示音沒開、走子吃子音效都關、App 在背景），試聽寫「試聽」。",
    "- 聲音設定說明縮成一句（40 字內）：「以左右聲像提示棋子在第幾路，不同動作不同音色；可先試聽。」音量、靜音的細節移到圖鑑。", "",
    "### P16.5 我在哪裡、本頁地圖、文件語意化", "",
    "- **W 鍵**（螢幕報讀與鍵盤模式；原本沒有任何快捷鍵用 W）：念「你在：頁名。焦點在：…（按鈕／開關／棋盤格；卡片裡的會說是哪張卡片）」，下棋的頁面再加輪到誰、選了哪顆、上一步，最後是本頁地圖。寫進 ? 說明卡和 `AXM_HELP`。",
    "- **本頁地圖**：首頁、茶肆（`#/hub/battle`）、大廳（`#/lobby`）、學習（`#/hub/learn`）、棋譜庫（`#/db`）、下棋的頁面，換頁念頁名時第一次多念一句（只念給讀螢幕，畫面上不加字），方位照 `a11y-tour.md`。對局頁是「你坐在石桌前，棋盤在正中間，對手在對面。由上到下：對手的名牌和棋鐘、棋盤、你的名牌和棋鐘、狀態列、走過的著法；最下面一排是動作按鈕」（照 05-settings `gameLayout` 的順序）。",
    "- **文件語意化**：`xqDocHtml` 把 `#` 轉成 h1（卡片標題已經寫了，h1 只給螢幕報讀）、`##` 轉成 h2 並把每段包成 `section`（有名字的地標）、`###` 轉成 h3、`| 表格 |` 轉成 `table`（`th scope=col`）；文件包在 `article` 裡。主畫面 `#view` 補 `role=main`、頂欄補 `role=banner`。",
    "- 空間導覽第一段改用 ChatGPT 版：「想像你站在楚河渡口棋鎮：上方是星槎入口，左岸茶肆，右岸學習，橋上有石桌可下棋。進入園子後，你坐在桌前，棋盤在正前方，對手在對面。」（核對首頁版面：星槎在上方正中間河上、對戰牌坊在左岸、書院在右岸、身邊同桌的石桌在橋上，一致）。", "",
    "### P16.3 低視力", "",
    "- 一般模式的鍵盤焦點框 3px `#1F6FEB`（外推 2px）；螢幕報讀、高對比照舊黃黑雙框。棋盤格焦點除了黃黑框，四邊各加一個指向格心的三角形——沒用四角括號，因為高對比棋盤的「可以吃」已經是四角瞄準框。",
    "- 卡片右上 ✕ 外擴可點範圍到 44px（看起來還是 36px）；結果視窗次要按鈕 44px 高；螢幕報讀、高對比、超大／最大字級時按鈕、選項、動作列、導覽列至少 44px 高。",
    "- 字級放大時確認框太高改成在框外上下捲動（以前置中會切掉頂端）；卡片內文不出橫向捲動。棋鐘不換行、不被擠小；高對比時 2px 黑框，輪到的一方再加黑色外框。",
    "- 文案：螢幕報讀模式第一次打開念「" + "已開啟螢幕報讀與鍵盤模式。用 Tab 換區塊、B 到棋盤、方向鍵移動、Enter 選子或落子，按 ? 看說明。" + "」，之後只提 ? 和 W；切高對比、放大字級時跳 toast 並念出來，畫面上不常駐說明字。", "",
    "### 誠實表述（這一輪改的）", "",
    "- 聲音方位寫成「以左右聲像提示棋子在第幾路」，不寫 3D 環繞；音量寫「跟著手機音量，App 內沒有獨立音量」；**iPhone 靜音鍵打開仍會響**（01-board 把 audioSession 設成 playback），要安靜得關掉 App 內的走子、吃子音效——所以不宣稱會跟著系統靜音。",
    "- 高對比寫「主要文字對比 7 比 1 以上（圖片上的字另外檢查）」；跟著系統字級寫「盡量跟著，實際效果依手機與瀏覽器而定」；螢幕報讀模式寫「以園子地點清單替代 3D 場景探索」；VoiceOver 實機待 iOS 版、還沒有真人視障者試用。", "");
  return L;
}
function report(R, B) {
  const L = [];
  L.push("# 92 無障礙稽核報告（靜態）", "");
  L.push("> 由 `xiangqi-lab/tools/a11y-audit.js` 自動產生（" + R.at.slice(0, 16).replace("T", " ") + " UTC）。用 `xiangqi-db/tools/mhtml.js` 組出完整 m.html，只看原始碼，不開瀏覽器。", "> 動態稽核（真的開頁面跑 axe-core、VoiceOver／TalkBack 實測）請開發者用正式瀏覽器補；見文末「需要人工實機驗證」。", "");
  const dex = loadDex();
  L.push(...evidence());
  L.push("## 總表", "", "| 類別 | 修前 | 現在 | 修掉 |", "|---|---:|---:|---:|");
  let tb = 0;
  for (const k of Object.keys(KIND)) { const b = B ? (B.count[k] || 0) : null; if (b != null) tb += b; L.push(`| ${KIND[k]} | ${b == null ? "—" : b} | ${R.count[k]} | ${b == null ? "—" : Math.max(0, b - R.count[k])} |`) }
  L.push(`| **合計** | ${B ? tb : "—"} | **${R.total}** | ${B ? Math.max(0, tb - R.total) : "—"} |`, "");
  L.push(`- m.css 裡同時寫了前景和背景色碼的規則：${R.css.checked} 條；達到 AAA（一般字 7:1、大字 4.5:1）的 ${R.css.aaa} 條；色碼用漸層、圖片或執行時才知道（朝代配色）而算不出來的 ${R.css.unknown} 條。`);
  L.push(`- 空的按鈕（原始碼裡沒有字，多半執行時才填字）${R.warn.length} 個，不算問題，列在最後待人工確認。`, "");
  if (B) {
    const now = new Set(R.issues.map(key)), fixed = B.issues.filter(x => !now.has(key(x)));
    L.push("## 這次修掉的（" + fixed.length + "）", "");
    for (const x of fixed.slice(0, 200)) L.push(`- ${KIND[x.kind]}：\`${x.file}:${x.line}\`　${x.sel ? "`" + x.sel.slice(0, 70) + "`（" + x.ratio + ":1）" : "`" + String(x.snip).slice(0, 90).replace(/`/g, "'") + "`"}`);
    L.push("");
  }
  L.push("## 還沒修的（" + R.total + "）", "");
  for (const k of Object.keys(KIND)) {
    const xs = R.issues.filter(x => x.kind === k); if (!xs.length) continue;
    L.push("### " + KIND[k] + "（" + xs.length + "）", "");
    for (const x of xs.slice(0, 120)) L.push(`- \`${x.file}:${x.line}\`　${x.sel ? "`" + x.sel.slice(0, 80) + "`　" + x.fg + " / " + x.bg + " ＝ " + x.ratio + ":1（要 " + x.need + "）" : "`" + String(x.snip).slice(0, 110).replace(/`/g, "'") + "`" + (x.ratio ? "　" + x.ratio + ":1" : "")}`);
    if (xs.length > 120) L.push(`- ……另外 ${xs.length - 120} 個`);
    L.push("");
  }
  const ov = R.css.over || [];
  if (ov.length) { L.push("## 待實機量：半透明底上的字（" + ov.length + "）", "", "疊在圖片或深色框上，實際對比要看底下是什麼；下面列出疊在純白、純黑上的對比，純白那欄低於 4.5 的優先實測。", ""); for (const x of ov) L.push(`- \`${x.file}:${x.line}\`　\`${x.sel.slice(0, 70)}\`　${x.fg} / ${x.bg}：白底 ${x.ratioOnWhite}:1、黑底 ${x.ratioOnBlack}:1`); L.push("") }
  if (R.warn.length) { L.push("## 待人工確認：空按鈕（" + R.warn.length + "）", ""); for (const x of R.warn.slice(0, 60)) L.push(`- \`${x.file}:${x.line}\`　\`${x.snip.slice(0, 100).replace(/`/g, "'")}\``); L.push("") }
  L.push("## 掃不到的（靜態稽核的限制）", "",
    "- 用 JS 一行一行組出來、或 `el.onclick=` 掛上去的可點 div：看不出來會被點，只能靠動態稽核。",
    "- 執行時的朝代配色（applyEra 寫在 html 的 style）、深色模式下各頁的實際疊色、圖片上的字：要在瀏覽器裡量。",
    "- 執行時的保險：`m/11b-a11y.js` 會幫還沒有名字的圖示按鈕補 aria-label（照 title 或常見圖示的意思）、`<img>` 沒 alt 補 alt=\"\"、對話框補 role=\"dialog\"／aria-modal／焦點鎖。這些在靜態報告裡不算修好，只算保險。", "");
  L.push("## 第 4 輪：聽覺回饋、空間導覽、過場提示（P16.4／P16.5／P21.3）", "",
    "程式在 `xiangqi-db/m/11c-a11ysnd.js`（前綴 axs），測試 `xiangqi-lab/tools/test-a11y-audio.js`（node --test，用假的 AudioContext，不開瀏覽器）。",
    "",
    "### P16.4 聽覺回饋與空間感（做了）",
    "",
    "- **不同動作不同提示音**：" + dex.map(d => d[1] + "（" + d[2] + "）").join("、") + "。走不了＝選了子點到不能走的地方、或選到一步都走不了的子。九種的波形＋音高組合都不一樣（測試逐一比對）；描述見第 5 輪「音效圖鑑」。",
    "- **立體聲方位（左右聲像，不是 3D 環繞）**：Web Audio `StereoPannerNode` 照棋子在畫面上的那一路放左右，最左一欄 -0.8、正中間 0、最右一欄 +0.8。路數跟格子念的一樣（玩家看出去右邊數來：一路在最右、九路在最左）；翻轉棋盤（執黑）左右跟著對調。落子、吃子在落點那一格響，將軍在被將的帥（將）那一格響，選子在選的那一格響，走不了在點的那一格響；輪到你、時間提示置中。",
    "- **時間提示**：你的棋鐘跨過 60、30、10 秒各響一次，到 0 響「超時」；對手的棋鐘只響超時。同一個門檻只響一次，時間加回去（下一盤、加秒）才會再響。原本 11b 念「你的時間剩…」照舊。",
    "- **開關**：設定 → 系統 → ♿ 無障礙「🎧 聲音方位與動作提示音」（store `axSnd`）。沒選過＝跟著螢幕報讀模式（螢幕報讀模式開才開）；一般模式完全照原本的音效（`moveSound`、喊「吃」「將軍」不動）。旁邊有「🔈 試聽左右」。",
    "- **音量、靜音**：App 沒有另外的音量滑桿，提示音跟原本走棋音效同一級（照手機音量）；iPhone 靜音鍵打開時仍會響（audioSession＝playback）。「走子音效」「吃子音效」都關＝提示音也不響；App 在背景不響；聲音還沒被點選喚醒時不硬叫。開著時落子、吃子改播有方位的提示音，取代原本置中的叩聲（不會兩個疊在一起）。",
    "- 怎麼驗：`node --test xiangqi-lab/tools/test-a11y-audio.js`（pan 值對路數、翻轉、九種音不同、開關、靜音、背景、超時門檻只觸發一次、01-board 的接線）；手動：戴耳機開螢幕報讀模式，挑戰電腦走左邊的俥、右邊的炮，聽左右耳。",
    "",
    "### P16.5 無障礙心智模型（做了）",
    "",
    "- **空間導覽**文件 `xiangqi-db/art/docs/a11y-tour.md`（同步 `xiangqi-lab/site/data/docs/a11y-tour.md`）：每頁共同骨架（頂欄、主畫面、底部導覽列）與 Tab 順序；首頁楚河渡口棋鎮（星槎在上、左岸對戰／茶肆、右岸學習、橋上石桌）；茶肆的八仙桌、挑戰電腦、二樓千秋盃；大廳；學習頁由近到遠；棋譜庫書房；從首頁經星槎、渡口到園子的路線；3D 園子的擺設；棋盤方位與聲音方位。",
    "- 入口：螢幕報讀模式按 **?** 鍵除了念鍵盤說明，另外開說明卡，裡面有「🧭 空間導覽」；**G** 鍵直接開；設定 → ♿ 無障礙卡片也有一顆。照現有 `XQDOC`（05-settings.js 加 `tour`），所以隱私卡片的文件按鈕也看得到。",
    "- **園子地點清單**：螢幕報讀模式不畫 3D 園子（focusOn），園子裡能點的東西改成按鈕列（你的角色、正中間的桌子、桌上的茶杯、對面的對手、左右的凳子、對手後面的長椅、燈籠、兩種樹、遠方的風景，名字照那一朝的 `PARK_INFO`），點一項＝在 3D 園子裡點那樣東西（06-cpu.js `parkInfo`，介紹卡、掀茶杯找棋譜照舊）。入口在對局頁棋盤前面（只給螢幕報讀、鍵盤用的按鈕，聚焦時才浮出來）和 ? 說明卡。沒有改 `src/park3d.js`。",
    "",
    "### P21.3 狀態提示與過場回饋（做了，只在螢幕報讀模式）",
    "",
    "- 換頁：等新頁畫好（0.5 秒）念「頁面：」加頂欄標題（去掉圖示；沒有標題用網址對照）。",
    "- 長時間載入：象棋引擎（包住 `XQEngine` 的 load／prefetch／search，分「象棋引擎載入」「象棋引擎下載」）、等圖的水墨畫面（#preov）、畫面上短短的「載入中…／讀取中…／下載中…」字樣；超過 0.8 秒還沒好才念「…中…」，好了念「…完成」，很快就好的不念。別的模組可以呼叫 `axsBusy(\"名稱\", promise)`。",
    "",
    "### 還沒做／沒驗",
    "",
    "- **沒有實機測過**：iPhone VoiceOver、Android TalkBack、真的耳機左右聲道、iOS 靜音鍵下的行為都還沒試；自動測試用的是假的 AudioContext。",
    "- Safari 14.1 以前沒有 `StereoPannerNode`，會退回置中（不報錯）。",
    "- 提示音接在平面棋盤（01-board 的 Board）上。螢幕報讀模式一律平面棋盤所以都有；一般模式手動打開提示音、又在 3D 園子下棋時，哪些聲音會出來沒有測。3D 園子裡轉頭、縮放、俯視平視沒有螢幕報讀的替代。",
    "- 換頁念頁名靠頂欄標題，個別頁面晚於 0.5 秒才寫標題的會念到舊名；載入提示靠字樣比對，沒寫「載入中」字樣的等待畫面念不到。",
    "- 空間導覽是照程式裡的入口座標寫的，星槎甲板、渡口、驛站細部還沒寫進去。", "");
  L.push(...round5(dex));
  L.push("## 需要人工實機驗證", "",
    "1. iPhone VoiceOver：對局頁開「♿ 螢幕報讀與鍵盤模式」，左右滑動能依序讀到每一格（「紅方 炮，八路，第三排」），點兩下選子、再點兩下預定落點、再點一次落子；每步後讀「你走…；電腦走…；輪到你」。",
    "2. 電腦鍵盤：Tab 進棋盤後方向鍵移動、Enter 選子落子；B 鍵跳回棋盤、R 讀出盤面；開卡片／確認框時 Tab 不會跑到後面，關掉後焦點回到原本的按鈕。",
    "3. 高對比主題：淺色、深色、各朝代下，文字與棋盤線、棋子字都清楚（用 axe-core 或 Chrome DevTools 對比工具量）。",
    "4. 字級「超大 1.6」「最大 2.0」：390 寬（iPhone 13/14/15）首頁、設定、挑戰電腦對局、殘局、石桌往事、意見回饋頁沒有橫向捲動、按鈕沒有被切掉。",
    "5. 「跟著系統字級」：iPhone 設定 → 輔助使用 → 顯示與文字大小 → 更大的文字，切到最大，回到 App 後字級跟著變。",
    "6. axe-core 全站跑一次（首頁、設定、對局、殘局、棋譜庫、卡片與確認框開著時），把結果補進這份報告。",
    "7. 聲音方位（P16.4）：戴耳機、螢幕報讀模式挑戰電腦，走最左邊的俥（九路）左耳響、最右邊（一路）右耳響、中炮置中；執黑翻轉後左右對調；選子、落子、吃子、將軍、點到不能走的地方、電腦走完、輪到你的聲音聽得出不同；把「走子音效」「吃子音效」都關掉後完全不響；設定裡「🔈 試聽左右」。",
    "8. 時間提示：線上對局或有棋鐘的對局，剩 60、30、10 秒各嗶一次、時間到響「超時」，同一門檻不重複。",
    "9. 換頁與載入（P21.3）：VoiceOver 開著換頁會念「頁面：棋譜」這類頁名；第一次下載引擎、棋譜庫下載時念「載入中…」「載入完成」，不會一直重複念。",
    "10. 空間導覽與園子地點清單（P16.5）：? 鍵說明卡、G 鍵、設定的「🧭 空間導覽」都打得開；對局頁 Tab 到「🌳 園子地點清單」，點桌子、茶杯、對手都會跳出介紹卡；照導覽寫的 Tab 順序實際走一遍首頁、茶肆、學習頁、棋譜庫。",
    "11. 第 5 輪低視力（Chrome 實拍）：375、390 寬，字級「最大」＋高對比，首頁、設定 → ♿ 無障礙（含音效圖鑑卡片）、挑戰電腦對局（棋鐘外框、數字沒被切）、結果確認框（太高時能上下捲、頂端沒被切）、空間導覽卡片；整頁沒有橫向捲動、字沒有重疊；Tab 焦點框一般模式藍框、螢幕報讀／高對比黃黑框，棋盤格焦點有四邊三角形。",
    "12. 第 5 輪聲音：音效圖鑑九個 ▶ 逐一聽，跟描述（幾聲、往上往下、高低）對得上；左／中／右試聽戴耳機分得出左右；開發者模式的聲音事件紀錄有對應的「已播放」。",
    "13. 第 5 輪螢幕報讀：螢幕報讀模式按 W 念出頁面、焦點、輪到誰、選了哪顆、上一步；第一次進首頁、茶肆、大廳、學習、棋譜庫、對局頁會多念本頁地圖；被將軍、超時時讀螢幕先插話念出來。", "");
  return L.join("\n");
}
module.exports = { parseColor, contrast, relLum, parseCss, auditCss, auditMarkup, runAudit, report, KIND };
if (require.main === module) {
  const R = runAudit(), a = process.argv.slice(2);
  if (a.includes("--json")) { console.log(JSON.stringify(R, null, 1)); return }
  if (a.includes("--save-baseline")) { fs.writeFileSync(BASE, JSON.stringify({ at: R.at, total: R.total, count: R.count, issues: R.issues.map(x => ({ kind: x.kind, file: x.file, line: x.line, sel: x.sel, snip: x.snip, ratio: x.ratio })) }, null, 1)); console.log("修前基準已存：" + BASE + "（" + R.total + " 個問題）"); return }
  const B = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, "utf8")) : null;
  fs.writeFileSync(REPORT, report(R, B));
  console.log("稽核完成：" + R.total + " 個問題" + (B ? "（修前 " + B.total + "）" : "") + "，報告寫到 " + REPORT);
  for (const k of Object.keys(KIND)) console.log("  " + KIND[k] + "：" + R.count[k] + (B ? "（修前 " + (B.count[k] || 0) + "）" : ""));
}
