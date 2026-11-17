// 11/17 第 23 輪（候選版 1342 複驗後）：T1 錯棋重練評分後的提示、T2 電腦棋手狀態列與 src/local.js 的訊息、T3 棋盤格讀螢幕後綴、T4 星門圍城開局「⋯」名稱、T5 擂台 3D 入場過場。
// 標準：App Store 審查 2.1、4.0。不開瀏覽器，vm／純計算。外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法：node --test xiangqi-lab/tools/test-r23-1117.js
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
  const ctx = { console, Math, JSON, Intl, Date, Map, WeakMap, Set, RegExp, String, Object, Array };
  vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;this.i18nWxf=i18nWxf;this.i18nPcName=i18nPcName;", ctx);
  if (withExt && HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}
const allT = (C, L) => { for (const s of L) { const t = C.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) } };
const QO = ["妙著", "正著", "穩著", "緩著", "失著", "敗著"], PCS = ["R", "N", "C", "P", "B", "A", "K", "r", "n", "c", "p", "b", "a", "k"];

// ---------- T1 ----------
test("T1：錯棋重練評分後的每一種組合（👍／❌ 兩種 × 第幾次 × 沒提示／再錯一次／提示一～三 × 棋評 × 棋子），英文介面整句英文", () => {
  const B = M("08b-cpugame.js"), src = between(B, "function rdxEn(){", "\n/* 評分後那一行") + "\n" + between(B, "function rdxLine(o){", "\nfunction rdxSay(");
  const K = i18nKit(false);
  const ctx = { i18nLang: () => "en", i18nText: s => K.i18nText(s), i18nWxf: s => K.i18nWxf(s), i18nPcName: p => K.i18nPcName(p), parkOn: () => false };
  vm.createContext(ctx); vm.runInContext(src + "\n" + between(B, "function rdxSay(pc,cap,ck){", "\n") + ";this.rdxLine=rdxLine;this.rdxSay=rdxSay;", ctx);
  const says = [];
  for (const pc of PCS) for (const cap of [null, ...PCS]) for (const ck of [false, true]) { const s = ctx.rdxSay(pc, cap, ck); assert.ok(!CJK.test(s) && /^Move your (General|Advisor|Elephant|Horse|Chariot|Cannon|Soldier)/.test(s), s); says.push(s) }
  let n = 0;
  for (const q of QO) for (const q0 of QO) for (const ok of [true, false]) for (const same of [true, false]) for (const lv of [-1, 0, 1, 2, 3]) for (const fail of [1, 2, 5]) {
    const line = ctx.rdxLine({ ok, same, cn: "炮二平五", q, q0, fail, bc: "馬8進7", say: says[(n++) % says.length], lv });
    assert.ok(!CJK.test(line), line);
    assert.ok(line.includes("\"C2.5\"") && line.includes("(attempt " + fail + ")"), line);
    if (lv === 3) assert.ok(line.includes("\n💡 Hint 3:") && line.includes("\"H8+7\""), line);
    if (lv === -1) assert.ok(line.endsWith(" · one more miss and you get a hint"), line);
  }
  assert.ok(n > 1000);
  /* 原始碼：四個地方都接上了 */
  assert.ok(B.includes("if(rdxEn()){s2.textContent=rdxLine({ok,same:m.q===P0.q||(qi(P0.q)>=4&&qi(m.q)>=4)||qi(m.q)>=9,cn:m.cn,q:m.q,q0:P0.q,fail,bc,say,lv:!HM?0:fail>=4?3:fail>=3?2:fail>=2?1:-1})}else"));
  assert.ok(B.includes("say=rdxEn()?rdxSay(pc,cap,ck):"));
  assert.ok(B.includes('stuckNudge(rdxEn()?`Stuck? ${say?say+". ":""}The piece in the ${rdxMk()} is the key. Tap ↶ Undo and try again!`'));
  assert.ok(B.includes("toast(rdxEn()?`Tap ↶ Undo to go back to the start and you'll see the suggested move (${rdxMk()})`"));
});
test("T1：錯棋重練其他幾句（開頭那行、評分中、練會了）中文樣板英文介面都翻得出；中文版的「・再錯一次就給提示」也有句型", { skip: SKIP }, () => {
  const C = i18nKit(true);
  for (const q of QO) allT(C, ["🔁 第 3 步：上次你走「炮二平五」是" + q + "，這次呢？", "這次走「炮二平五」，電腦評分中…", "✅ 「炮二平五」是正著！比上次的" + q + "進步了，這題練會了。可以繼續跟電腦下完，也可以直接結束這題",
    "❌ 「炮二平五」還是" + q + "，按 ↶ 悔棋再想一次（第 1 次）・再錯一次就給提示", "按 ↶ 悔棋回到起點，就看得到建議的那一步（藍框）", "按 ↶ 悔棋回到起點，就看得到建議的那一步（黃圈）", "💡 在棋盤上看建議", "▶ 推演後面", "✅ 練會了，結束這題"]);
});

// ---------- T2 ----------
test("T2：電腦棋手出問題時狀態列的三種訊息、src/local.js 其他給玩家看的訊息，英文介面翻得出（放進 DOM 的字只補字典、不改 src）", { skip: SKIP }, () => {
  const C = i18nKit(true), L = rd("xiangqi-lab/src/local.js");
  const three = ["⏳ 電腦棋手一時沒想好，幾秒後會自動再想一次", "⏳ 電腦棋手卡住了，正在重新啟動；等不及可以按「新局」重新開一盤", "⚠ 沒有網路，電腦棋手還沒下載到這支手機。連上網路會自動接著下，也可以先去同桌對弈。"];
  for (const s of three) assert.ok(L.includes(s), "local.js 原文：" + s);
  allT(C, three);
  allT(C, ["超時判負", "等待中…", "積分挑戰不能悔棋", "這局已經結束，不能悔棋", "現在不能提示", "挑戰電腦不提供提示，要靠自己", "手機裡沒有這個資料夾，可以按「從電腦同步」下載", "離線版不支援：/api/x",
    "Pikafish 積分挑戰（入門1）", "Pikafish 第3級「業1」", "Pikafish 第3級「業1」・🚗獎勵", "石桌往事・Pikafish 第3級「業1」", "笑面掌櫃・Pikafish 第3級「業1」・🚗獎勵", "專2・全力（每步 3 秒）",
    "吃車", "吃卒", "捉傌", "研究", "Pikafish 引擎下載失敗（timeout），請確認網路後再試一次"]);
  /* local.js、engine.js 的中文字串段：除了註解、內部用的（開局庫說明）和組字用的片段，都翻得出 */
  const miss = [];
  for (const f of ["xiangqi-lab/src/local.js", "xiangqi-lab/src/engine.js"]) {
    const T = rd(f).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of T.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) { const s = m[1].trim(); if (!s || !CJK.test(s) || s.length < 4) continue; const t = C.i18nText(s); if (t == null || CJK.test(t)) miss.push(s) }
  }
  const FRAG = /^(Pikafish 積分挑戰（|Pikafish 第|・🚗獎勵|，可以按「從電腦同步」下載|（每步 3 秒）|離線版不支援：|不支援：|只看一步|往後算|開局庫|Pikafish 引擎下載失敗（|），請確認網路後再試一次|<棋盤>)/;   /* 組字用的片段（整句另外驗）、內部用的格式說明 */
  assert.deepEqual(miss.filter(s => !FRAG.test(s)), []);
});

// ---------- T3 ----------
test("T3：棋盤格讀螢幕名稱的後綴（已選取、預定落點、可以吃、可以走到這裡、被將軍、剛走到這裡）英文介面直接英文；11b 找選中格子兩種都認", () => {
  const B = M("01-board.js"), suf = vm.runInNewContext("(" + B.match(/const AX_SUF=(\[\[[^\n]+\]\]);/)[1] + ")");
  assert.equal(suf[0].length, 6); assert.equal(suf[1].length, 6);
  for (const s of suf[1]) assert.ok(/^, [a-z]/.test(s) && !CJK.test(s), s);
  assert.deepEqual(JSON.parse(JSON.stringify(suf[0])), ["，已選取", "，預定落點，再按一次落子", "，可以吃", "，可以走到這裡", "，被將軍", "，剛走到這裡"]);
  const K = i18nKit(false); suf[0].forEach((z, i) => assert.equal(", " + K.i18nText(z.slice(1)), suf[1][i], "跟 07i18n 的翻法一樣：" + z));
  assert.ok(B.includes("{const X=AX_SUF[(typeof i18nLang===\"function\"&&i18nLang()===\"en\")?1:0];if(sq===o.sel)t+=X[0];"));
  assert.ok(M("11b-a11y.js").includes("[aria-label*='已選取'],#view .ax-sq [data-k][aria-label*=', selected']"));
});

// ---------- T4 ----------
test("T4：星門圍城開局時「⋯」的名稱也照 gsvParkLb（建立後再對兩次，gsvViewUi 每次通知重寫）", () => {
  const S = M("02-shell.js");
  assert.ok(S.includes('{const rf=()=>{if(!m.isConnected){document.removeEventListener("xq-topmore",rf);return}const a=al();if(m.getAttribute("aria-label")!==a)m.setAttribute("aria-label",a)};document.addEventListener("xq-topmore",rf);setTimeout(rf,0);setTimeout(rf,900)}'));
  assert.ok(M("07bhg-gatesiege.js").includes('if(b.title!==L[1])b.title=L[1];try{document.dispatchEvent(new Event("xq-topmore"))}catch(e){}}'));
});

// ---------- T5 ----------
test("T5：擂台 3D 入場過場的兩行字（park3d.js 放進 DOM 的）英文介面翻得出，不用改 src", { skip: SKIP }, () => {
  const P = rd("xiangqi-lab/src/park3d.js");
  assert.ok(P.includes('letter-spacing:.2em;margin-top:4px">擂台開擂</div><div class="ag-t" style="font:600 14px sans-serif;margin-top:4px">擂主登台中</div>'), "是 DOM 的字（不是畫在 canvas 上）");
  allT(i18nKit(true), ["擂台開擂", "擂主登台中"]);
});

// ---------- 第 23 輪 E ----------
test("R23-1：「⋯」同一項在 popstate 回來前被觸發兩次（同一瞬間、popstate 前後各一次）只退一次、只做一次", async () => {
  const S = M("02-shell.js"), src = between(S, "function topMoreItem(b,f,after){", "\nfunction setTabs(");
  const mk = delay => { const log = [], L = {}; const ctx = { log, history: { state: { xqSheet: 1 }, back() { log.push("back"); setTimeout(() => { ctx.history.state = null; (L.popstate || []).slice().forEach(f => f()) }, delay) } },
    closeSheet: a => log.push(a === true ? "close(true)" : "close"), addEventListener: (k, f) => { (L[k] = L[k] || []).push(f) }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter(x => x !== f) }, setTimeout };
    vm.createContext(ctx); vm.runInContext("function topMoreItem(b,f,after){" + src.slice("function topMoreItem(b,f,after){".length), ctx); return ctx };
  /* 同一瞬間兩次 */
  const A = mk(300), sheetA = { dataset: {} }, f = () => A.log.push("f");
  A.topMoreItem(sheetA, f); A.topMoreItem(sheetA, f);
  await new Promise(r => setTimeout(r, 400)); assert.deepEqual(A.log, ["close(true)", "back", "f"]);
  /* 不同的觸發來源（同一張選單、或別處又叫一次 topMoreRun）在等 popstate 時也不理 */
  const B = mk(300), sheetB = { dataset: {} }; B.topMoreItem(sheetB, () => B.log.push("f1")); B.topMoreRun(() => B.log.push("f2"));
  await new Promise(r => setTimeout(r, 400)); assert.deepEqual(B.log, ["close(true)", "back", "f1"]);
  /* popstate 前後各一次：後面那次同一張選單也不理（不會再退、再做） */
  const C = mk(200), sheetC = { dataset: {} }; C.topMoreItem(sheetC, () => C.log.push("f"));
  await new Promise(r => setTimeout(r, 100)); C.topMoreItem(sheetC, () => C.log.push("f-before"));
  await new Promise(r => setTimeout(r, 200)); C.topMoreItem(sheetC, () => C.log.push("f-after"));
  await new Promise(r => setTimeout(r, 100)); assert.deepEqual(C.log, ["close(true)", "back", "f"]);
  /* 退完以後，新的選單照常可以用 */
  C.history.state = { xqSheet: 1 }; C.topMoreItem({ dataset: {} }, () => C.log.push("next"));
  await new Promise(r => setTimeout(r, 300)); assert.deepEqual(C.log.slice(3), ["close(true)", "back", "next"]);
  assert.ok(S.includes("function topMore(tr,right){try{topMoreRun.w=false}catch(e){}"), "頂欄重畫（新的頁面）就不再等上一張選單");
});
test("R23-2：系統給的預設名字「棋友＋4 碼」（net.js、舊版預設名）英文介面顯示 Player ＋4 碼；玩家自己取的名字不動；不改 src/net.js", { skip: SKIP }, () => {
  const C = i18nKit(true);
  assert.equal(C.i18nText("棋友77bf"), "Player 77bf"); assert.equal(C.i18nText("棋友7F4C"), "Player 7F4C");
  assert.equal(C.i18nText("棋友77bf（下棋人）"), "Player 77bf (Player)"); assert.equal(C.i18nText("先不要，用「棋友7F4C」"), "Not now, use \"Player 7F4C\"");
  assert.equal(C.i18nText("棋友12345"), null, "不是 4 碼的不當成預設名");
  assert.match(C.i18nText("金陵小校尉（下棋人）") || "", /^金陵小校尉 \(Player\)$/, "玩家自己取的名字照原文");
  assert.ok(rd("xiangqi-lab/src/net.js").includes('const d="棋友"+id.slice(0,4);'), "net.js 照舊（傳出去的名字不變）");
});

// ---------- 第 23 輪 B ----------
test("N23-1：「切到 3D 星盤／回平面棋盤」內建字典就翻得出（外掛字典還沒載到也行），「⋯」的讀螢幕名稱組出來也是英文", () => {
  const K = i18nKit(false);
  assert.equal(K.i18nText("切到 3D 星盤"), "Switch to 3D star board"); assert.equal(K.i18nText("回平面棋盤"), "Back to 2D board");
  assert.ok(M("02-shell.js").includes('return"More: "+L.map(t=>{const e=i18nText(t);'), "「⋯」的名稱逐項用 i18nText 組英文");
  if (HAS_EXT) { const j = JSON.parse(fs.readFileSync(EXT, "utf8")); assert.equal(j.en["切到 3D 星盤"], "Switch to 3D star board") }
});
test("N23-2：星門圍城開局（gsvTick fresh）一掛上 gsv-on 就通知「⋯」重寫名稱", () => {
  assert.ok(M("07bhg-gatesiege.js").includes('if(fresh){GSV_TG=null;GSV_INFO=false;GSV_HK="";setTimeout(()=>{try{document.dispatchEvent(new Event("xq-topmore"))}catch(e){}},0)}'));
});
test("N23-3：星門圍城切 3D 只影響這一局——記下原本的 park3d，切回平面、離開星門圍城、下次開 App（不在對局頁）時還原；玩家自己開的 3D 不動", () => {
  const G = M("07bhg-gatesiege.js"), src = between(G, "function gsvP3On(){", "\nfunction gsvP3Sync(){");
  const mk = init => { const mem = Object.assign({}, init); const ctx = { mem, store: { get: (k, d) => k in mem ? mem[k] : d, set: (k, v) => { mem[k] = v } }, location: { hash: "#/journey/play" } }; vm.createContext(ctx); vm.runInContext("function gsvP3On(){" + src.slice("function gsvP3On(){".length), ctx); return ctx };
  /* 新手：原本沒設（預設平面） */
  const A = mk({}); A.gsvP3On(); assert.equal(A.mem.park3d, true); assert.deepEqual(JSON.parse(JSON.stringify(A.mem.gsvP3Bak)), { v: null });
  A.gsvP3On(); assert.deepEqual(JSON.parse(JSON.stringify(A.mem.gsvP3Bak)), { v: null }, "再開一次不蓋掉記下的原值");
  assert.equal(A.gsvP3Back(), true); assert.equal(A.mem.park3d, null); assert.equal(A.mem.gsvP3Bak, null); assert.equal(A.gsvP3Back(), false, "沒記就不動");
  /* 原本選平面（false） */
  const B = mk({ park3d: false }); B.gsvP3On(); B.gsvP3Back(); assert.equal(B.mem.park3d, false);
  /* 玩家自己開的 3D：不記、不還原 */
  const C = mk({ park3d: true }); C.gsvP3On(); assert.equal(C.mem.gsvP3Bak, undefined); assert.equal(C.gsvP3Back(), false); assert.equal(C.mem.park3d, true);
  /* 接線：要 3D 的兩個地方都走 gsvP3On；切回平面、gsvHide 都還原；載入時不在對局頁就還原 */
  assert.ok(G.includes('if(s==="ask"){gsvP3On();GSV_P3=1}') && G.includes('if(v!=="flat"){gsvP3On();GSV_P3=1;GSV_V3=v}else gsvP3Back()'));
  assert.ok(G.includes('try{gsvViewMenu(false)}catch(e){}gsvP3Back()}'));
  assert.ok(G.includes('try{if(typeof location!=="undefined"&&!/^#\\/journey\\/play/.test(location.hash||""))gsvP3Back()}catch(e){}'));
  assert.ok(!/store\.set\("park3d",true\)/.test(between(G, "function gsvP3Sync(){", "\nfunction gsvFlat(")), "gsvP3Sync 不再直接開 park3d");
});
test("B 備註：「⋯」連點兩下，第二下落在剛開的卡片暗幕上不會把卡片關掉（暗幕出現 0.35 秒內點了不關）", () => {
  const U = M("00-util.js");
  assert.ok(U.includes("{const t0=Date.now();sc.onclick=()=>{if(Date.now()-t0<350)return;closeSheet()}}"));
  assert.ok(M("02-shell.js").includes("function topMoreItem(b,f,after){if(b&&b.dataset){if(b.dataset.tmr)return false;b.dataset.tmr=\"1\"}return topMoreRun(f,after)}"), "選單那一側只認第一次");
});
