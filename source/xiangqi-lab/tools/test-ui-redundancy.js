// 11/12 ChatGPT「UI 冗餘與語意盤查」（開發者轉來，正式站 20261112-0100）處理的自動測試，不開瀏覽器。文件：xiangqi-db/story/104_ChatGPT_UI冗餘盤查處理.md
//   場景入口不加說明小字（11/11 茶肆小字被嫌雜）：建議加小字的改用改名、改順序、短暫提示；這份測試順便把關「沒有新增常駐小字」。
//   測試名稱照新規定標類別：只檢查原始碼文字的加〔原始碼〕；混合（原始碼＋執行邏輯）加〔混合〕；真的執行邏輯的不加。
// 用法：node --test xiangqi-lab/tools/test-ui-redundancy.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(path.join(M, f), "utf8").replace(/\r\n/g, "\n");
// 從原始碼切出某一段（純常數／純函式），用 Function 求值——不載整個模組（會用到很多全域） */
const evalPick = (src, re, expr) => { const m = re.exec(src); assert.ok(m, "找不到：" + re); return new Function(m[0] + ";return (" + expr + ");")(); };

/* ========== 第 1 項：練功房（07z5-cpuroom）主按鈕隨模式、一行資訊、去重複 ========== */
const CR = rd("07z5-cpuroom.js");
test("練功房主按鈕隨已選模式寫字（CR_GO）", () => {
  const G = evalPick(CR, /^const CR_GO=\{[^}]*\};/m, "CR_GO");
  assert.equal(G.rank, "開始晉級賽"); assert.equal(G.free, "開始練習"); assert.equal(G.blind, "開始盲棋");
});
test("練功房卡只留一行會影響決定的資訊（crInfo）：級數／執棋／算不算分", () => {
  const crInfo = evalPick(CR, /^function crInfo\(md,lv,sd,o\)\{[\s\S]*?\n(?=function crDiffSheet)/m, "(crEn=()=>false,crT=s=>String(s),crInfo)");   /* 11/17 D 第 29 輪 Y9：crInfo 先看 crEn()（中文介面＝false） */
  assert.equal(crInfo("free", 6, "r", { passed: false }), "第 6 級 · 執紅先走 · 不扣段位分");
  assert.equal(crInfo("free", 6, "b", { passed: true }), "第 6 級（已通關） · 執黑後走 · 不扣段位分");
  assert.equal(crInfo("rank", 6, "r", { rank: "業餘2級" }), "對手照段位「業餘2級」配 · 執紅先走 · 算段位分");
  assert.match(crInfo("blind", 3, "r", {}), /偷看 3 次/);
});
test("〔原始碼〕練功房卡不再重複同名標題與三種模式說明；晉級賽保留中途重開判負規則；三模式比較收進「模式差在哪？」", () => {
  // 卡片 innerHTML 只放一行 cr-one、晉級賽多一行 cr-rule、一顆「模式差在哪？」；不再印 T[0]（標題）、T[1]、T[2]
  assert.match(CR, /class="cr-one">\$\{esc\(info\)\}/);
  assert.doesNotMatch(CR, /<h3>\$\{T\[0\]\}<\/h3><p>\$\{T\[1\]\}<\/p><small>\$\{T\[2\]\}<\/small>/, "不再重複標題與模式說明");
  assert.match(CR, /const CR_RULE="可回來續下；若未下完就另開新局，原局判負。"/, "11/12 ChatGPT 文案檢查第 1 條（開發者核准）改的新字");
  assert.match(CR, /rk\?`<p class="cr-rule">⚠ \$\{esc\(CR_RULE\)\}<\/p>`:""/, "晉級賽才顯示重開判負規則");
  assert.match(CR, /function crDiffSheet\(\)/); assert.match(CR, /id="crDiff"/);
  assert.doesNotMatch(CR, /安心練習不怕輸/, "舊的重複文案已移除");
});
test("〔原始碼〕說明不被裁、小帥不遮：卡片標 data-bot-avoid；crFit 照看得到的範圍重排；不改 bot3d.js", () => {
  assert.match(CR, /<div class="cr-card" data-bot-avoid>/);
  assert.match(CR, /function crFit\(P\)/);
  // 螢幕報讀名稱＝主按鈕字＋那一行資訊，跟實際開局一致
  assert.ok(CR.includes('gb.setAttribute("aria-label",crEn()?crT(CR_GO[md])+": "+(zx?crT(info):info):CR_GO[md]+"："+info)'));   /* 11/17 D 第 29 輪 Y9：英文介面讀英文 */
});

/* ========== 第 2 項：學習場景首次只把「新手訓練營」標成 hot（07y-hubmap） ========== */
const HUB = rd("07y-hubmap.js");
test("首次主行動 hot 只剩一個（hbFirstHot）：新手訓練營 hot、象棋規則不 hot", () => {
  const f = evalPick(HUB, /^const hbFirstHot=\([^\n]*?;/m, "hbFirstHot");
  assert.equal(f("hbCamp", true), true, "新手訓練營＝首次主行動");
  assert.equal(f("hbTerms", true), false, "象棋規則照一般入口");
  assert.equal(f("hbCamp", false), false, "回訪不 hot");
  assert.equal(f("hbCup", true), false);
});
test("〔原始碼〕fresh 跟首頁 hmNew 同一套（campSeen／record／tsmProgNow）；不動 hbBridge 區塊", () => {
  assert.match(HUB, /const fresh=!store\.get\("campSeen",false\)[^\n]*tsmProgNow\(\)\.any\);/);
  assert.match(HUB, /hbHot\(o\.c\)\|\|hbFirstHot\(o\.id,fresh\)/);
  /* hbBridge（首頁橋上石桌）是開發者本機還沒發布的區塊：本機版要保留；公開倉庫沒有它時，每個呼叫處都要先判斷 typeof，不然會當掉（W69 第 8 項，11/22） */
  if (/function hbBridge\(\)/.test(HUB)) return;
  for (const f of fs.readdirSync(M).filter(n => n.endsWith(".js"))) {
    const t = rd(f), calls = (t.match(/hbBridge\(\)/g) || []).length, guards = (t.match(/typeof hbBridge==="function"/g) || []).length;
    assert.ok(guards >= 1 || calls === 0, f + "：公開版沒有 hbBridge，呼叫前要先判斷 typeof");
  }
});

/* ========== 第 3 項：對戰、學習場景返回只留一個真的出口（07w9-exits + 07w-shipwalk） ========== */
const EX = rd("07w9-exits.js"), SHW = rd("07w-shipwalk.js");
test("出口標籤縮短成單一目的地（EXITS 學習／對戰）", () => {
  const E = evalPick(EX, /^const EXITS=\{[\s\S]*?\};/m, "EXITS");
  assert.deepEqual(E["/hub/learn"].slice(0, 3), [52, 86, "‹ 回棋鎮"]);
  assert.deepEqual(E["/hub/battle"].slice(0, 3), [78, 87, "‹ 回棋鎮"]);
  assert.equal(E["/hub/learn"][3], "#/"); assert.equal(E["/hub/battle"][3], "#/");
});
test("〔原始碼〕初次提示改成讓真的出口外框亮起（shwXHi/.ex-hi），不再放像按鈕的假「出去」提示", () => {
  // shwXTip 不再建立「‹ 出去」節點，改呼叫 shwXHi 讓真的出口閃
  assert.doesNotMatch(SHW, /e\.textContent="‹ 出去"/, "不再放假的出去提示");
  assert.match(SHW, /function shwXTip\(S\)\{[^\n]*shwXHi\(/);
  assert.match(SHW, /function shwXHi\(F,n\)/);
  assert.match(SHW, /\.querySelector\("\.ex-spot"\)/, "優先亮圖上真的出口");
  assert.match(EX, /\.shp-spot\.ex-hi,#back\.ex-hi\{animation:exHi/, "出口外框亮起的樣式");
  // 長標籤縮短可讀：EX_HUB_LB 單一目的地，exIn 把超出畫面的往內推
  assert.match(EX, /const EX_HUB_LB="‹ 回棋鎮";/);
  assert.match(EX, /function exIn\(s\)/);
  assert.doesNotMatch(EX, /出"\+xqHubName\(k\.slice\(5\)\)[^\n]*・回棋鎮/, "不再組「出觀星閣・回棋鎮」長標籤");
});

/* ========== 第 4 項：對戰場景頂部常駐提示移除、改首次短暫提示（07y-hubmap） ========== */
test("〔原始碼〕移除常駐 hb-tag 提示；首次進對戰頁改用短暫提示 hbBtlTip，線上入口名稱＝線上對戰", () => {
  assert.doesNotMatch(HUB, /想算段位、選級數、找真人或打比賽，就進/, "常駐提示已移除");
  assert.doesNotMatch(HUB, /class="hb-tag"/, "常駐提示節點已移除");
  assert.match(HUB, /const HB_BTL_TIP="找真人選「線上對戰」；自己練選「挑戰電腦」";/);
  assert.match(HUB, /function hbBtlTip\(\)[\s\S]*?store\.set\("hbBtlTip",1\)/, "只提示一次（記 store hbBtlTip）");
  assert.match(HUB, /if\(hub==="battle"\)hbBtlTip\(\);/);
  // 線上入口把「線上對戰」放前面，「走進天井」留給場景
  const LM = rd("07x2-lobbymap.js");
  assert.match(LM, /const LM_NET_NM="線上對戰";/);
  assert.match(LM, /\.replace\(\/線上對戰・觀戰\|線上對戰\/,LM_NET_NM\)/);
});

/* ========== 第 5 項：首頁（07z-homemap）三狀態按鈕、同桌對弈統一名稱 ========== */
const HM = rd("07z-homemap.js");
test("首頁首次主按鈕＝學走第一手，進新手訓練營（HM_FIRST，執行）", () => {
  const F = evalPick(HM, /^const HM_FIRST=\{[^}]*\};/m, "HM_FIRST");
  assert.equal(F.t, "🔰 學走第一手"); assert.equal(F.go, "#/camp"); assert.equal(F.s, "從新手訓練營開始");
});
test("〔原始碼〕首頁三狀態：首次＝學走第一手、有未完棋局＝接著下、回訪＝快速對局（不弄壞續局 hmQuickId／rsGoOnce）", () => {
  assert.match(HM, /let R=nw\?Object\.assign\(\{\},HM_FIRST\):\{go:"#\/cpu",t:"♟ 快速對局"/, "回訪＝快速對局");
  assert.match(HM, /set\(\{go:"#\/pvp",t:"▶ 接著下",s:"線上對局"\}\)/, "有未完線上棋局＝接著下");
  assert.match(HM, /t:"▶ 接著下",s:String\(g\.t\)/, "有未完棋局＝接著下");
  assert.match(HM, /store\.get\("hmQuickId"/); assert.match(HM, /rsGoOnce/, "續局邏輯保留");
});
test("〔混合〕兩處同機入口統一叫「同桌對弈」；螢幕報讀加「兩人共用這台裝置」，畫面不加小字", () => {
  const nm = evalPick(HM, /^const HM_PVP_NM=[^\n]*?;/m, "HM_PVP_NM");
  assert.equal(nm, "👥 同桌對弈");
  const al = evalPick(HM, /^const HM_PVP_NM=[^\n]*?;/m, "HM_PVP_AL");
  assert.equal(al, "同桌對弈：兩人共用這台裝置");
  assert.doesNotMatch(HM, /"👥 身邊同桌"/, "首頁不再叫身邊同桌");
  assert.ok(HM.includes(' aria-label="${esc(id==="hmQuick"?HM_PVP_AL:hmAl(lab(id)))}"'), "螢幕報讀 aria-label（同桌對弈加說明、其他入口去掉開頭圖示），畫面不加小字");
  /* 11/13 開發者實機旁白錄影：入口前的圖示被念成「帆船」「交叉的劍」「羊皮紙卷」——語音標籤去掉開頭圖示 */
  const hmAl = evalPick(HM, /^const HM_PVP_NM=[^\n]*?;/m, "hmAl");
  for (const [t, w] of [["⛵ 雲河星槎", "雲河星槎"], ["⚔️ 觀星閣", "觀星閣"], ["📜 今日推薦", "今日推薦"], ["📚 藏譜石窟", "藏譜石窟"], ["九宮", "九宮"]]) assert.equal(hmAl(t), w, t);
  assert.ok(HM.includes('fb.setAttribute("aria-label","回報問題")') && HM.includes('id="hmInst" aria-label="加到主畫面"'), "回報問題、加到主畫面的語音標籤不念圖示");
  // 對戰場景同類也叫同桌對弈（07y HUB_DEF 的卡片選擇器指向 #/pvp；名稱由卡片標題帶，02-shell 已是「👥 同桌對弈」）
  assert.match(rd("02-shell.js"), /👥 同桌對弈/);
});

/* ========== 第 6 項：棋譜庫（10b-libmap）三入口改「第一步要做什麼」 ========== */
const LB = rd("10b-libmap.js");
test("棋譜庫三入口照第一步命名（LB_SPOTS），進入後保留正式書名", () => {
  const S = evalPick(LB, /^const LB_SPOTS=\[[\s\S]*?\];/m, "LB_SPOTS");
  const byId = Object.fromEntries(S.map(x => [x[0], x[3]]));
  assert.equal(byId.lbGm, "🏆 瀏覽大師棋譜");
  assert.equal(byId.lbBio, "🖼 按棋手找譜");
  assert.equal(byId.lbTour, "📦 按賽事找譜");
  // 進入後的面板／清單保留正式書名
  assert.match(LB, /book\("gmgames","大師對局"\)/);
  assert.match(LB, /sheet\(`🖼 特級大師（/); assert.match(LB, /sheet\("📦 比賽對局"/);
});
test("〔原始碼〕返回後保留選人或選冊結果（LB_LAST）、回同一部書面板照原樣打開（LB_PN）", () => {
  assert.match(LB, /const LB_LAST=\{bio:"",tour:""\};/);
  assert.match(LB, /LB_LAST\.bio=n;/); assert.match(LB, /LB_LAST\.tour=g\.key;/);
  assert.match(LB, /n===LB_LAST\.bio\?" lb-last":""/); assert.match(LB, /g\.key===LB_LAST\.tour\?" lb-last":""/);
  assert.match(LB, /function lbPnBack\(c0,now\)/); assert.match(LB, /const o=lbPnBack\(cK\);if\(o\)/, "回同一部書重新打開面板");
});

/* ========== 第 7 項：設定棋盤外觀（07s2-setmap）依控制結果命名 ========== */
const SM = rd("07s2-setmap.js");
test("棋盤外觀三入口依控制結果命名（SM_SPOTS）", () => {
  const S = evalPick(SM, /^const SM_SPOTS=\[[\s\S]*?\];/m, "SM_SPOTS");
  const byId = Object.fromEntries(S.map(x => [x[0], x[3]]));
  assert.equal(byId.smFan, "🪭 朝代配色");
  assert.equal(byId.smWin, "🪟 淺色／深色");
  assert.equal(byId.smBoard, "♟ 試看棋盤");
});
test("面板小節標題換成同一套字（SM_SECNM）", () => {
  const N = evalPick(SM, /^const SM_SECNM=\{[^}]*\};/m, "SM_SECNM");
  assert.equal(N["棋盤的朝代樣式"], "朝代配色");
  assert.equal(N["棋盤風格"], "棋盤材質");
  assert.equal(N["深淺色"], "淺色／深色");
});
test("〔原始碼〕場景入口與面板小節標題一致（smSecNm 套在 setMap 與各入口面板 EW）", () => {
  assert.match(SM, /function smSecNm\(root\)/);
  assert.match(SM, /smCss\(\);smSecNm\(root\);/, "整卷面板也換字");
  assert.match(SM, /if\(!n\)\{epBack\(\);return false\}smSecNm\(EW\);/, "各入口面板搬過來後也換字");
});

/* ========== 全站把關：這次改動沒有新增常駐說明小字、沒有控制字元 ========== */
test("〔原始碼〕改過的檔沒有控制字元或 CR（Bash 反斜線事件、Python CRLF 事件）", () => {
  for (const f of ["07z5-cpuroom.js", "07y-hubmap.js", "07x2-lobbymap.js", "07w9-exits.js", "07w-shipwalk.js", "07z-homemap.js", "10b-libmap.js", "07s2-setmap.js"]) {
    const raw = fs.readFileSync(path.join(M, f), "utf8");
    assert.doesNotMatch(raw, /[\x00-\x08\x0b\x0c\x0e-\x1f]/, f + " 有控制字元");
    assert.ok(!/\r/.test(raw), f + " 有 CR");
  }
});
