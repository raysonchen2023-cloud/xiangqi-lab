// 11/17 第 22 輪（候選版 1248 複驗後的剩餘項目）：S7 錯棋重練提示行、S5／S6／R22-3 合作殘譜英文、S3／R22-2 總覽紙條、S2 大廳出口、S4 ⋯ 的 aria、S1 #/theme 清單、R22-4 申冤 44、R22-5 擂主卡。
// 標準：App Store 審查 2.1、4.0。不開瀏覽器，vm／純計算。外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法：node --test xiangqi-lab/tools/test-r22-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const CJK = /[㐀-鿿豈-﫿]/;
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const I18N = M("07i18n.js");
function i18nKit(withExt) {
  const ctx = { console, Math, JSON, Intl, Date, Map, WeakMap, Set, RegExp, String, Object, Array, store: { get: (k, d) => k === "lang" ? "en" : d, set() { } } };
  vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;", ctx);
  vm.runInContext("this.I18N_CSS=" + between(I18N, "const I18N_CSS=", "function i18nCss()").replace(/^const I18N_CSS=/, "").replace(/;\s*$/, "") + ";", ctx);
  if (withExt && HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}
const allT = (C, L) => { for (const s of L) { const t = C.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) } };

test("S7：錯棋重練每一題的提示行（前面有「🔁 第 N 步：」）整行英文；棋評用語（妙著、正著、穩著、緩著、失著、敗著）都有英文", { skip: SKIP }, () => {
  const C = i18nKit(true), B = M("08b-cpugame.js");
  assert.ok(B.includes("s2.textContent=`🔁 第 ${P0.ply} 步：上次你走「${P0.cn}」是${P0.q}，這次呢？`"), "樣板沒變");
  const QO = vm.runInNewContext("(" + B.match(/const QO=(\[[^\]]+\])/)[1] + ")");
  assert.deepEqual(JSON.parse(JSON.stringify(QO)), ["妙著", "正著", "穩著", "緩著", "失著", "敗著"]);
  for (const q of QO) {
    for (const pre of ["🔁 ", ""]) { const t = C.i18nText(pre + "第 1 步：上次你走「炮二平五」是" + q + "，這次呢？"); assert.ok(t && !CJK.test(t) && t.includes("\"C2.5\""), q + " → " + t) }
    allT(C, [q, "這次走「馬8進7」，電腦評分中…", "❌ 「炮二平五」還是" + q + "，按 ↶ 悔棋再想一次（第 2 次）", "❌ 「炮二平五」是" + q + "，沒有比上次的失著好，按 ↶ 悔棋再想一次（第 2 次）",
      "✅ 「炮二平五」是" + q + "！比上次的失著進步了，這題練會了。可以繼續跟電腦下完，也可以直接結束這題", "👍 「炮二平五」是" + q + "，比上次的失著好，這題算練會了；想挑戰正著，按 ↶ 悔棋再試（第 1 次）"]);
  }
  assert.equal(C.i18nText("🔁 第 1 步：上次你走「炮二平五」是失著，這次呢？"), "🔁 Move 1: last time you played \"C2.5\", rated Mistake. What about this time?");
});

test("S5／S6／R22-3：合作殘譜說明、殘篇閣說明、目標視窗的操作說明，英文介面整段英文（不黏字、沒有全形句點）；中文照舊", () => {
  const Q = M("07q2-coop.js");
  const run = (lang, expr) => vm.runInNewContext(expr, { i18nLang: () => lang });
  const desc = Q.match(/<div class="muted" style="font-size:13px;margin-bottom:4px">\$\{(\(typeof i18nLang[^}]+)\}<\/div>/)[1];
  assert.equal(run("en", desc), "On one phone, one person plays Red and one plays Black, taking turns. It's not about winning: work <b>together</b> to reach the goal in the manual.");
  assert.equal(run("zh", desc), "同一支手機：紅方一個人、黑方一個人輪流走。不是比輸贏，要<b>一起</b>達成棋譜上的目標。");
  const lob = Q.match(/<b>🧩 合力補全殘篇<\/b><p style="margin:6px 0 0;line-height:1\.6">\$\{(\(typeof i18nLang[^}]+)\}<\/p>/)[1], en = run("en", lob);
  assert.ok(!CJK.test(en) && en.includes("The <b>Reader</b> sees") && en.includes("The <b>Player</b> moves") && en.includes("within 3 moves</b>. Unscored"), en);
  assert.match(run("zh", lob), /目標：<b>3 步之內將死黑方<\/b>。不計分，隨時可以離開。$/);
  const gb = between(Q, "function goalBox(){", "\n  draw();");
  assert.ok(gb.includes("Orange dashed frames</span> mark where pieces must go") && gb.includes("<b>make way for each other</b>, not capture each other.") && gb.includes("棋盤上<span style=\"color:#E39B0F\">橘色虛線框</span>"));
  assert.ok(!CJK.test(between(gb, "?`<p class=\"muted\"><span style=\"color:#E39B0F\">Orange", ":`<p class=\"muted\">棋盤上").replace(/'<span[^']*'/g, "")), "英文那段沒有中文");
});
test("S5／R22-3：殘篇閣 AI 按鈕、7 題開場泡泡有英文；R22-5 擂主卡主按鈕和擂台提示", { skip: SKIP }, () => {
  const C = i18nKit(true), Q = M("07q2-coop.js");
  allT(C, [...Q.matchAll(/intro:"([^"]+)"/g)].map(m => m[1]));
  allT(C, ["跟小帥 AI 一起玩（小帥看譜、我下棋）", "🤖 跟小帥 AI 一起玩（小帥看譜、我下棋）", "跟小帥 AI 一起玩", "挑戰擂主", "⚔ 挑戰擂主"]);
  assert.equal(C.i18nText("打贏擂主，船艙印的「擂台」那一邊就會亮起來（千秋印譜）。"), "Beat the champion to light up the Arena side of your Cabin seal in the Qianqiu seal album.");
  assert.equal(C.i18nText("船艙印"), "Cabin seal", "跟其他地方一樣叫 Cabin seal");
  assert.ok(M("06-cpu.js").includes('<button class="btn" id="arGo" style="flex:2">⚔ 挑戰擂主</button>'));
});
test("S1：#/theme 清單的說明列（說明・N 題・正確率 N%）英文", { skip: SKIP }, () => {
  const C = i18nKit(true), L = M("07-legend.js");
  assert.ok(L.includes("<span>${esc(d)}・${n} 題${pc!=null?`・正確率 ${pc}%`:\"\"}</span>"));
  const TH = vm.runInNewContext(L.match(/const THEMES=(\[[^\n]*?\]\]);/)[1]);
  for (const [, d] of TH) allT(C, [d + "・410 題", d + "・31 題・正確率 50%"]);
});

test("S3／R22-2：英文總覽標籤自己就是一塊招牌，至少跟紙條一樣寬一樣高、字換行置中；不再另外畫直條", () => {
  const css = i18nKit(false).I18N_CSS;
  assert.match(css, /html\[lang=en\] #stmOv \.lb\{z-index:1;white-space:normal!important;text-align:center;min-width:calc\(7\.5cqw \+ 2px\);max-width:27cqw;min-height:calc\(19\.8cqw \+ 2px\);margin:-1px 0 0 -1px;box-sizing:border-box;display:flex;align-items:center;justify-content:center/);
  assert.ok(!/#stmOv \.lb::before/.test(css));
  const map = vm.runInNewContext("(" + M("07z6-sitemap.js").match(/const STM_MAP=(\{[^;]+\});/)[1] + ")");
  for (const k in map) { const c = map[k].card; assert.ok((c[2] - c[0]) <= 7.5 + 1e-9 && (c[3] - c[1]) * 1376 / 768 <= 19.8 + 1e-9, k + "：招牌蓋得住紙條") }
});
test("S2：英文大廳出口標籤可以換行、字小一點，整段留在按鈕裡", () => {
  const css = i18nKit(false).I18N_CSS;
  assert.match(css, /html\[lang=en\] \.shp-spot\.ex-spot\{max-width:min\(52vw,210px\)\}html\[lang=en\] \.shp-spot\.ex-spot b\{white-space:normal;font-size:12\.5px;line-height:1\.2;letter-spacing:0;text-align:center\}/);
  assert.ok(M("07w9-exits.js").includes('s.className="shp-spot ex-spot"'));
});
test("S4：頂欄按鈕的 data-lb 一換，「⋯」的讀螢幕名稱當場跟著換", () => {
  const S = M("02-shell.js");
  assert.ok(S.includes('try{const mo=new MutationObserver(()=>{if(m.isConnected)m.setAttribute("aria-label",al())});bs.forEach(x=>mo.observe(x,{attributes:true,attributeFilter:["data-lb"]}))}catch(e){}'));
  assert.ok(M("06-cpu.js").includes('b.setAttribute("aria-label",l);b.dataset.lb=l}'), "3D 鈕切換時會換 data-lb");
});
test("R22-4：青銅匭三個口各多撐 1px（375×812 換成整數像素後也有 44）", () => {
  const FB = M("07s3-feedback.js"), fbp = vm.runInNewContext(between(FB, "function fbpSlotLay(", "/* 類型籤：") + ";({fbpSlotLay})");
  for (const [W, Hs] of [[375, 812], [393, 852], [430, 932], [320, 568]]) {
    const H = W * 1376 / 768, pc = (x, y) => [x / 768 * W, y / 1376 * H], sw = .056 * W, sh = .024 * H, bx = ([x, y], w, h) => ({ x: x - w / 2, y: y - h / 2, w, h }), ss = 23 * 2 / 7.68 / 100 * W;
    const L = [bx(pc(657, 784), sw, sh), bx(pc(716, 781), sw, sh), bx(pc(672, 719), sw, sh), bx(pc(617, 842), ss, ss)], R = fbp.fbpSlotLay(L, { l: 0, r: W, t: 0, b: H }, 44);
    assert.ok(R, W + "：排得出來"); void Hs;
    for (let i = 0; i < 3; i++) { const q = R[i], lo = v => Math.ceil(v), hi = v => Math.floor(v); assert.ok(hi(q.r) - lo(q.l) >= 44 && hi(q.b) - lo(q.t) >= 44 && q.l >= 0 && q.r <= W, W + " 第 " + i + " 個口：" + JSON.stringify(q)) }
    for (let i = 0; i < 4; i++) for (let k = i + 1; k < 4; k++) { const p = R[i], q = R[k]; assert.ok(!(Math.min(p.r, q.r) - Math.max(p.l, q.l) > .5 && Math.min(p.b, q.b) - Math.max(p.t, q.t) > .5), W + "：" + i + "," + k + " 重疊") }
  }
});

// ---------- 第 22 輪 B ----------
test("N22-1：⋯ 選單的項目一定等卡片那筆退完（popstate）才做；history.back 延後 0／300／600／900／2000ms 都成功，不靠計時", async () => {
  const S = M("02-shell.js"), src = between(S, "function topMoreRun(f,after){", "\nfunction setTabs(");
  assert.ok(!/setTimeout\(go,\d+\)/.test(src), "沒有「等不到就先做」的計時");
  const mk = (st, delay) => { const log = [], L = {}; const ctx = { log, loc: "#/arena", history: { state: st, back() { log.push("back"); setTimeout(() => { ctx.history.state = null; ctx.loc = "#/arena(上一筆)"; (L.popstate || []).slice().forEach(f => f()) }, delay) } },
    closeSheet: a => log.push(a === true ? "close(true)" : "close"), addEventListener: (k, f) => { (L[k] = L[k] || []).push(f) }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter(x => x !== f) }, setTimeout };
    vm.createContext(ctx); vm.runInContext(src, ctx); return ctx };
  await Promise.all([0, 300, 600, 900, 2000].map(async d => {
    const A = mk({ xqSheet: 1 }, d); let after = 0;
    A.topMoreRun(() => { A.log.push("goUp@" + A.loc + ":" + JSON.stringify(A.history.state)); A.loc = "#/adventure" }, () => after++);
    await new Promise(r => setTimeout(r, d + 120));
    assert.deepEqual(A.log, ["close(true)", "back", "goUp@#/arena(上一筆):null"], d + "ms：退完才換頁");
    assert.equal(A.loc, "#/adventure", d + "ms：停在目的地，沒被退回");
    assert.ok(after >= 1, d + "ms：做完有更新「⋯」的名字");
  }));
  const B = mk(null, 0); B.topMoreRun(() => B.log.push("f")); await new Promise(r => setTimeout(r, 30)); assert.deepEqual(B.log, ["close", "f"], "沒有卡片紀錄照舊馬上做");
  const E = mk({ xqSheet: 1 }, 0); E.history.back = () => { throw new Error("no history") }; E.topMoreRun(() => E.log.push("f")); await new Promise(r => setTimeout(r, 30)); assert.deepEqual(E.log, ["close(true)", "f"], "退不了（丟錯）才當場做");
  /* 上一頁的行為沒動：選單開著按上一頁＝00-util 的 popstate 關卡片（closeSheet(true)）、留在原頁 */
  assert.ok(M("00-util.js").includes('const b=$("#sheet");if(b&&b.classList.contains("show")&&!b.dataset.closing){closeSheet(true);return}'));
});
test("N22-2：選單項目做完（#/pvp 切 3D）當場重寫「⋯」的讀螢幕名稱；N22-3 星門圍城對局中那顆照實際效果叫（其他對局不變）", () => {
  const S = M("02-shell.js");
  assert.ok(S.includes('topMoreItem(b,f,()=>{if(m.isConnected)m.setAttribute("aria-label",al())})'));   /* 第 23 輪 R23-1：多包一層只認第一次 */
  assert.ok(S.includes('if(typeof gsvParkLb==="function"&&/^(回棋盤模式|去園子下棋（3D）)$/.test(v)){const g=gsvParkLb();if(g)return g}'));
  const G = M("07bhg-gatesiege.js"), src = between(G, "function gsvParkLb(){", "\nfunction gsvParkBtn(){");
  const run = (on, vw) => vm.runInNewContext(src + ";gsvParkLb()", { GSV_ST: on ? {} : null, gsvIs: () => true, gsvVw: () => vw, document: { body: { classList: { contains: k => on && k === "gsv-on" } } } });
  assert.equal(run(true, "flat"), "切到 3D 星盤"); assert.equal(run(true, "tilt"), "回平面棋盤"); assert.equal(run(false, "flat"), null, "不在星門圍城＝照原本的名字");
  assert.ok(G.includes('body.gsv-on #topRight button[data-lb="回棋盤模式"],body.gsv-on #topRight button[data-lb="去園子下棋（3D）"]'), "data-lb 照舊（藏頂欄那顆、pkSwTb 靠它找）");
  if (HAS_EXT) { const C = i18nKit(true); assert.equal(C.i18nText("切到 3D 星盤"), "Switch to 3D star board"); assert.equal(C.i18nText("回平面棋盤"), "Back to 2D board") }
});
