// 11/17 iMac 測試員 V 驗 1514 原生 App（iPhone 18 Pro）的新發現：P2-1 記譜碑／術語碑中英混雜、P3-1～P3-7。
// 不開瀏覽器，vm／純計算；畫面上的實際大小、位置請 iMac 複驗。外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法：node --test xiangqi-lab/tools/test-imac-v1514.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const grab = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到 " + a); const re = /\n(?=\S)/g; re.lastIndex = i + 1; const m = re.exec(s); return s.slice(i, m ? m.index : s.length) };
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const CJK = /[㐀-鿿豈-﫿]/;
const I18N = M("07i18n.js"), W8 = M("07w8-shichen.js"), HQ = M("03-home-quiz.js");
function i18nKit(extra) {
  const ctx = {}; vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;" + (extra || ""), ctx);
  if (HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}

/* ---------- P2-1 ---------- */
test("P2-1：句子裡被 <b> 切開的短詞（「下面國字是<b>紅方</b>的路數」），整句翻不出就不翻那一小段，寧可整句中文；不在句子裡的按鈕照舊翻", () => {
  const K = i18nKit(grab(I18N, "function i18nHalf(n,pe,v){") + ";this.H=i18nHalf;");
  const el = (name, text, block) => ({ nodeType: 1, nodeName: name, textContent: text, closest: () => block || null });
  /* 記譜碑那一句（07y4 tbFiles） */
  const S = M("07y4-termsmap.js"); assert.ok(S.includes("<p>下面國字是<b>紅方</b>的路數"), "原句還在");
  const p1 = { textContent: "下面國字是紅方的路數（從紅方右手邊數起，一到九）；上面數字是黑方的路數（從黑方右手邊數起，1 到 9）。同一條線，紅方叫「二」，黑方叫「8」。" };
  assert.equal(K.H(null, el("B", "紅方", p1), "紅方"), true, "整句翻不出：「紅方」不翻");
  assert.ok(K.i18nText("紅方"), "（單獨的「紅方」字典翻得出，所以以前會變成 Red）");
  /* 整句翻得出的就照舊翻那一小段 */
  const full = "下棋時只留平面棋盤：收起 3D 園子、開局卷軸、吃子水墨字和小帥（朝代擂台除外）";
  assert.ok(K.i18nText(full)); assert.equal(K.H(null, el("B", "朝代擂台", { textContent: full }), "朝代擂台"), false);
  /* 不在句子裡（按鈕、標籤）、或那一段就是整句：照舊翻 */
  assert.equal(K.H(null, el("SPAN", "有例局", null), "有例局"), false);
  assert.equal(K.H(null, el("BUTTON", "紅方", p1), "紅方"), false, "按鈕不是行內小段");
  assert.equal(K.H(null, el("B", "紅方", { textContent: "紅方" }), "紅方"), false);
  assert.equal(K.H(null, el("B", "紅方", { textContent: "紅方 wins" }), "紅方"), false, "其他部分沒中文");
  assert.ok(I18N.includes("if(i18nHalf(n,pe,v))return;"), "接在 i18nTextNode 翻之前");
});
test("P2-1：術語碑介面英文——分類鈕（含「棋形」「俗語」）、搜尋提示；「目前選哪個」看 data-c 不看鈕上的字；示範鈕", { skip: SKIP }, () => {
  assert.ok(HQ.includes('const EN=typeof i18nLang==="function"&&i18nLang()==="en",CL={全部:"All",殺法:"Mates",開局:"Openings",戰術:"Tactics",棋形:"Shapes",規則:"Rules",俗語:"Sayings"};'));
  assert.ok(HQ.includes("b.dataset.c=c;b.textContent=EN&&CL[c]?CL[c]:c;"));
  assert.ok(HQ.includes('b.classList.toggle("on",(b.dataset.c||b.textContent)===cat)'), "選中狀態不受翻譯影響");
  assert.ok(HQ.includes('qi.placeholder="Search terms (Chinese names), e.g. 馬後炮, 屏風馬";qi.setAttribute("data-noi18n","")'));
  /* 資料裡的分類都有英文 */
  const D = JSON.parse(rd("xiangqi-lab/site/data/terms.json")), CL = { 全部: 1, 殺法: 1, 開局: 1, 戰術: 1, 棋形: 1, 規則: 1, 俗語: 1 };
  for (const t of D.items) assert.ok(CL[t.k], "分類有英文：" + t.k);
  const K = i18nKit(); for (const s of ["👀 看示範", "看示範", "找不到這個術語", "有例局", "👀 看答案", "↺ 再看一次", "◀ 上一步", "下一步 ▶", "↺ 重播"]) { const t = K.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) }
  /* 條目說明的份量（回報用）：59 條、說明約 1,900 字、示範說明約 970 字 */
  const n = D.items.length, d = D.items.reduce((a, t) => a + [...t.d].length, 0); assert.equal(n, 59); assert.ok(d > 1800 && d < 2100, "說明字數 " + d);
});

/* ---------- P3-1／P3-7：時辰鐘英文 ---------- */
test("P3-1／P3-7：英文時辰鐘第三行節氣用拼音簡寫（不再被截成 Sta…）；讀螢幕標籤英文整句", () => {
  const PY = vm.runInNewContext("(" + grab(W8, "const CLK_TERM_PY=").replace("const CLK_TERM_PY=", "").replace(/;\s*$/, "") + ")");
  const TD = M("07y5-todaymap.js"), TERMS = vm.runInNewContext("(" + grab(TD, "const TD_TERMS=").replace("const TD_TERMS=", "").replace(/;\s*$/, "") + ")").map(x => x[2]);
  assert.equal(Object.keys(PY).length, 24); for (const t of TERMS) assert.ok(/^[A-Z][a-z]+$/.test(PY[t]), t);
  assert.ok(Math.max(...Object.values(PY).map(s => s.length)) <= 11, "最長 11 個字母（Shuangjiang）");
  assert.ok(W8.includes('L[0].textContent=EN?T(day?`⛵ ${clkEraZh()}第 ${day} 天`:"⛵ 還沒登船")+(tm?" · "+(CLK_TERM_PY[tm]||T(tm)):""):'));
  /* 11/17 D 第 29 輪 Z6：剛開機外掛字典還沒到時 T() 翻不出 → 改用時鐘數字＋地支拼音＋節氣（字典沒到用拼音），不靠字典（test-r29d-1117.js 驗） */
  assert.ok(W8.includes("b.setAttribute(\"aria-label\",ship?T(\"雲河無歲月：在星槎上，時辰不走。點了看船齡\"):`It's ${hh[0]}:00–${hh[1]}:00 now (the ${CLK_ZHI_PY[i]} double-hour)${tmE?\", solar term: \"+tmE:\"\"}. Tap for the raft's age and the twelve double-hours`"));
  /* 07m5 護眼提醒標籤不折行（中文） */
  assert.ok(M("07m5-family.js").includes(".fm-row>span{flex:0 0 auto;white-space:nowrap}.fm-row>b{flex:1 1 auto;min-width:0}html[lang=en] .fm-row>span{flex:0 1 auto;white-space:normal}"));
});

/* ---------- P3-2 ---------- */
test("P3-2：第一章「破局！」解題時藏起「略過」是刻意設計（07mnf 檔頭：危機解題不能跳）", () => {
  const F = M("07mnf-mainfilm.js");
  assert.ok(F.includes("跳過：右上角常駐「略過」，電影隨時可以跳；危機解題不能跳（解題時「略過」藏起來）"));
  assert.ok(F.includes('const skip=()=>{if(fin||o.classList.contains("qt")||o.querySelector(".mnf-card"))return;'), "解題中（.qt）略過不動作");
});

/* ---------- P3-3 ---------- */
test("P3-3：進朝代擂台切 3D 只算這一局——記下原本的設定，離開 #/arena 就還原；擂台裡自己切過就照玩家的；App 關掉重開不在擂台也還原", () => {
  const src = HQ.slice(HQ.indexOf("const arP3Want="), HQ.indexOf("\nfunction arP3On(){")) + "\n" + grab(HQ, "function arP3On(){") + "\n" + grab(HQ, "function arP3Back(){") + "\n" + grab(HQ, "function arP3Leave(h){");
  const mk = init => { const S = new Map(Object.entries(init || {})); const ctx = { innerWidth: 820 /* 寬螢幕：進擂台切 3D；小於 500 預設平面見 test-imac-h1514.js H P2-3 */, store: { get: (k, d) => S.has(k) ? S.get(k) : d, set: (k, v) => S.set(k, v) } }; vm.createContext(ctx); vm.runInContext(src + ";this.on=arP3On;this.leave=arP3Leave", ctx); ctx.S = S; return ctx };
  { const C = mk({}); C.on(); assert.equal(C.S.get("park3d"), true); C.leave("#/arena"); assert.equal(C.S.get("park3d"), true, "還在擂台"); C.leave("#/cpu"); assert.equal(C.S.get("park3d"), null, "新存檔：還原成沒設定（新手第一盤預設平面）"); assert.equal(C.S.get("arP3Bak"), null) }
  { const C = mk({ park3d: false }); C.on(); C.leave("#/"); assert.equal(C.S.get("park3d"), false, "原本平面就回平面") }
  { const C = mk({ park3d: true }); C.on(); assert.equal(C.S.get("arP3Bak"), undefined, "原本就是 3D：不用記"); C.leave("#/"); assert.equal(C.S.get("park3d"), true) }
  { const C = mk({ park3d: false }); C.on(); C.S.set("park3d", false); C.S.set("arP3Bak", null); C.leave("#/"); assert.equal(C.S.get("park3d"), false, "擂台裡自己切過（parkBtn 清掉記號）：照玩家的") }
  { const C = mk({ park3d: true, arP3Bak: { v: false } }); C.leave("#/"); assert.equal(C.S.get("park3d"), false, "App 在擂台被關掉、下次在首頁打開：還原") }
  assert.ok(HQ.includes('{const ha=v.querySelector("#hArena");if(ha)ha.onclick=()=>{vibrate(5);arP3On();location.hash="#/arena"}}') && HQ.includes('if(kind==="arena")arP3On();'));
  assert.ok(M("07f-ship.js").includes('shipEra(k);if(typeof arP3On==="function")arP3On();else store.set("park3d",true);shipNav("#/arena",rep)}'));
  assert.ok(M("06-cpu.js").includes('else store.set("park3d",!parkOn());try{store.set("arP3Bak",null)}catch(x){}vibrate(8);'));
  assert.ok(HQ.includes('try{addEventListener("hashchange",()=>arP3Leave(location.hash));setTimeout(()=>arP3Leave(location.hash),0)}catch(e){}'));
});

/* ---------- P3-4 ---------- */
test("P3-4：設定頁改禁玩時間、每日提醒被改排時，當場 toast「每日提醒已改到 hh:mm」（中英）", async () => {
  const G = M("07gc-native.js"), src = grab(G, "function gcnFmChanged(){");
  for (const [lang, want] of [["zh", "🔔 每日提醒已改到 21:30"], ["en", "🔔 Daily reminder moved to 21:30"]]) {
    const log = []; const ctx = { gcnDqFix: () => Promise.resolve("21:30"), gcnKid: () => false, gcnLang: () => lang, GCN: { auth: true }, toast: m => log.push(m), document: { querySelector: () => null } };
    vm.createContext(ctx); vm.runInContext(src + ";this.f=gcnFmChanged", ctx); ctx.f(); await new Promise(r => setTimeout(r, 5)); assert.deepEqual(log, [want]);
  }
  { const log = []; const ctx = { gcnDqFix: () => Promise.resolve(""), gcnKid: () => false, gcnLang: () => "zh", GCN: { auth: true }, toast: m => log.push(m), document: { querySelector: () => null } };
    vm.createContext(ctx); vm.runInContext(src + ";this.f=gcnFmChanged", ctx); ctx.f(); await new Promise(r => setTimeout(r, 5)); assert.deepEqual(log, [], "沒改排不說") }
});

/* ---------- P3-5 ---------- */
test("P3-5：棋規碑「看走法／See the move」可點高度撐到 44（透明 ::after）；每日提醒時間選單高 44", () => {
  assert.ok(HQ.includes('s.textContent=".pill[data-pc]{position:relative}.pill[data-pc]::after{content:\\"\\";position:absolute;left:-4px;right:-4px;top:50%;height:44px;transform:translateY(-50%)}"'));
  assert.ok(HQ.includes("function rulesPlayEn(P){try{rulesPcCss()}catch(e){}") && HQ.includes("function rulesPlay(box){try{rulesPcCss()}catch(e){}"), "中英兩個版本都套");
  assert.ok(/data-pc="\$\{i\}"/.test(HQ), "膠囊有 data-pc");
  assert.ok(M("07gc-native.js").includes('<select id="gcnDqT" style="min-height:44px;height:44px;min-width:96px;padding:0 8px;font-size:16px"'));
});

/* ---------- P3-6 ---------- */
test("P3-6：星槎「回棋鎮」真的回首頁（以前借返回鈕＝回上一頁）；從首頁進快速對局返回鈕寫「回棋鎮」（以前寫「回渡口」，渡口在別處是 #/port）", () => {
  const X = M("07w9-exits.js"), B = M("08b-cpugame.js");
  assert.ok(X.includes('mk("ex-home",62,92,typeof hbIsCl==="function"&&hbIsCl()?"🏘 回時光之苑":"🏘 回棋鎮",()=>{if(typeof goHome==="function")goHome();else location.hash="#/"});'));
  assert.ok(B.includes('if(typeof hbHomeBack==="function"){hbHomeBack();try{const hb=$("#back");if(hb&&hb.dataset.to==="#/"&&/回渡口$/.test(hb.textContent))hb.innerHTML="<b>‹</b>回棋鎮"}catch(e){}}'));
  assert.ok(M("07y-hubmap.js").includes('b.dataset.to="#/";b.onclick=()=>goHome()'), "hbHomeBack 的目的地確實是首頁（07y 沒動）");
  /* 渡口在別處是港口頁 */
  assert.ok(X.includes('"/journey/inn":[18,86,"⛵ 回渡口"]'));
});
