// 11/17 英文外掛字典（xiangqi-db/i18n-en.json）補兩批漏翻的測試，不開瀏覽器：
//   ① 樂棚 103 首曲名（data/bgm/titles.json 的曲名直接寫在下面）都翻得出英文，加書名號《》的樣子也翻得出；內建原有的 3 首照內建
//   ② 雲河七星卡冊（ptyCapSay、ptyXpHow、每張卡的副標、帶她／他出門）、星塵天賦樹（全隊共用；每位最多點亮 N 個、Lv N 解鎖）：
//      換數字、換棋子、換朝代、她／他／他們、七位夥伴的名字都翻得出；原始碼的樣板改了這裡會擋下來（字典要跟著改）
//   ③ 內建翻得出的照內建（外掛只補翻不出的）；單獨一個棋子字（頭像圈、棋子章）不翻
//   ④ 第 2 批（測試員 D、候選版 0156）：起航頁與「還不能起航」、棋話一頁（13 站＋終章、星槎小知識）、七星來訪台詞、設定頁兩句、用詞統一（星輝／修為／城子／棋話一頁）
//   ⑤ 第 4 批（測試員回報）：星門圍城規則內文、選關卡名、下一波、加到主畫面、結算、幻譜星門（十三星勝利條件與台詞）、回園子對局
//   ⑥ 第 5 批（測試員第 5 輪）：星門預告、齊轍木棋靈、書架小人台詞、對局頁（電腦說明、棋規、3D 提示）、幻譜星門結果第一行、引擎下載提示
//   ⑦ 第 7 批（測試員 D 第 7 輪）：快速對局 3D 封面（名言白話說明、出處、進園子提示與 toast）、3D 走棋提示、黑洞偏航視窗與七星台詞、我的角色（出生年、金印、書齋物件）、古戰場（大標、地名、戰役名、地圖短名）
//   ⑧ 第 8 批（測試員 D／B 第 8 輪）：我的角色「？」細則、3D 效能紀錄、提示裡的按鈕名＝2D board、七星統一叫 Cloud River Seven Stars、古戰場每朝每卷英文標籤都在框裡
//   ⑩ 第 10 批：古戰場戰役清單（N・名、年代、卷開放條件）、英文戰役名不重疊（直式、橫式）、官階＝Rank
//   ⑫ 第 12 批：古戰場四種手機尺寸（直式 375×812、390×844，橫式 812×375、844×390）× 中英文：標籤不重疊、戰役點看得到、清單鈕在畫面內、字級
//   ⑬ 第 13 批：古戰場保守估算（英文字寬 .64、中文 1.05、行高 1.25、戰役點外圈含光暈），新玩家與全部打下兩種狀態
//   ⑭ 第 14 批：古戰場每個戰役名離自己的點比離別的點近、不超過 2.5 個字高（秦卷一、漢卷一、隋卷二點名，四種尺寸 × 中英文）
//   ⑮ 第 15 批：古戰場橫式只標編號（每朝每卷）、抽屜標籤與「年代・甲 對 乙（人）」格式
// 外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法 node --test xiangqi-lab/tools/test-i18n-ext-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = p => fs.readFileSync(path.join(ROOT, "xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json");
const CJK = /[㐀-鿿豈-﫿]/;
const SKIP = "沒有 xiangqi-db/i18n-en.json 英文外掛字典（只放 CDN，公開副本沒有）";

/* 07i18n.js 的 PURE 區段丟進 vm；ext＝true 併入外掛字典 */
function load(ext) {
  const S = M("m/07i18n.js"), a = S.indexOf("#I18N-PURE-BEGIN"), b = S.indexOf("/* #I18N-PURE-END */"), ctx = {};
  vm.createContext(ctx); vm.runInContext(S.slice(S.indexOf("\n", a) + 1, b) + ";this.R={i18nText,i18nExtMerge}", ctx);
  if (ext) ctx.R.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx.R;
}
const ok = (R, s) => { const t = R.i18nText(s); assert.ok(t != null && !CJK.test(t), JSON.stringify(s) + " → " + JSON.stringify(t)); return t };

/* data/bgm/titles.json（11/17 CDN 版）的 103 首曲名 */
const TITLES = [
  "松橋煙嵐", "石桌松蔭", "石上清泉", "楸枰對坐", "車馬爭先", "園中笑語", "空杯獨弈",
  "咸陽曉鐘", "長城風起", "禮樂肅雍", "兵棋論陣", "鐵騎破營", "凱旋歸家", "北道離人",
  "未央月色", "駝鈴西去", "上林春遊", "漢宮對局", "宮門決勝", "長安燈市", "出塞遙望",
  "赤壁夜江", "隆中待時", "空城獨吟", "帳中論兵", "火燒連營", "桃園結義", "五丈秋風",
  "竹林醉臥", "蘭亭曲水", "清談忘機", "山中爛柯", "一子定局", "流觴醉詠", "廣陵絕響",
  "雲岡石佛", "晨鐘佛光", "敕勒川", "僧將對枰", "禪機殺著", "春寺花鐘", "隔江相望",
  "運河初開", "揚州柳色", "暮色龍舟", "舟上博弈", "千帆急渡", "龍舟競渡", "寒夜河工",
  "長安燈火", "霓裳飛袖", "宮苑月夜", "曲江對弈", "車馬縱橫", "牡丹春宴", "陽關一杯",
  "韓府夜宴", "寒林", "秋山獨行", "燈下殘局", "夜半奇兵", "燭影歡宴", "春花秋月",
  "茶煙一縷", "汴河流水", "雨過天青", "書院論棋", "汴京急局", "上元燈夜", "回望北都",
  "草原長風", "石桌之約", "城頭鑼響", "帳前對弈", "萬馬一將", "掃桌六十年", "白頭重逢",
  "紫禁晨光", "秦淮燈影", "蘇州園林", "擂台對局", "中炮急攻", "寶船歸港", "雨中落第",
  "胡同晨光", "園中湖色", "戲散人歸", "茶館決局", "將軍抽車", "團圓夜", "空台絕唱",
  "墨渦墜槎", "星盤初醒", "七星連枝", "星樞逼將", "幻門留影", "星門微瀾", "雲河圍陣", "墨潮湧兵", "樞影逼城", "將星懸命",
  "渾天異象", "聽雨翻子",
];

test("樂棚：103 首曲名都翻得出（加《》也是），英文各不相同、首字大寫；內建原有的 3 首照內建", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  assert.equal(TITLES.length, 103); assert.equal(new Set(TITLES).size, 103);
  const B = load(false), X = load(true), seen = new Map();
  for (const s of TITLES) {
    const e = ok(X, s);
    assert.ok(/^[A-Z]/.test(e) && e.length <= 40, "曲名要短、首字大寫：" + s + " → " + e);
    assert.ok(!seen.has(e), "兩首撞同一個英文：" + seen.get(e) + "、" + s + " → " + e); seen.set(e, s);
    assert.equal(ok(X, "《" + s + "》"), "\"" + e + "\"", "書名號換英文雙引號：" + s);
    const b = B.i18nText(s); if (b != null) assert.equal(e, b, "內建翻得出的照內建：" + s);
  }
  assert.equal(X.i18nText("石桌松蔭"), "Shade by the Stone Table");
});

const PCS = ["俥", "傌", "炮", "相", "帥", "仕", "兵"];
const ERAS = ["青石園", "秦朝", "漢朝", "三國", "魏晉", "南北朝", "隋朝", "唐朝", "五代", "宋朝", "元朝", "明朝", "清朝"];
const NAMES = ["齊轍", "駱躍梅", "沈方庭", "鐵連城", "田飛燕", "步越溪", "雷借花"];

test("雲河七星卡冊：最上面兩行（換數字）、每張卡的副標（七種棋子 × 十三個朝代 × 練滿沒練滿）、帶她／他／他們出門", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), P = M("m/07pty-party.js");
  /* 測試員 D 看到的原句 */
  assert.equal(ok(X, "夥伴最高練到 Lv 12，你的修為再 260 點升 Lv 13，才會再往上"), "Partners can train up to Lv 12. Earn 260 more XP to reach Lv 13 and go higher.");
  assert.equal(ok(X, "下一盤電腦（贏 +40、輸 +15）、解千秋殘局（+15）、打星門圍城，都會加修為。"), "Play the computer (win +40, lose +15), solve Qianqiu endgames (+15) or fight the Star Gate Siege to earn XP.");
  assert.equal(ok(X, "俥・秦朝・Lv 12（練滿了，等你升級）"), "Chariot · Qin dynasty · Lv 12 (maxed out; level up to continue)");
  assert.equal(ok(X, "傌・元朝・Lv 4"), "Horse · Yuan dynasty · Lv 4");
  assert.equal(ok(X, "仕・明朝・Lv 4"), "Advisor · Ming dynasty · Lv 4");
  assert.equal(ok(X, "帶她出門"), "Bring her along"); assert.equal(ok(X, "帶他出門"), "Bring him along"); assert.equal(ok(X, "帶他們出門"), "Bring them along");
  /* ptyCapSay 直接從原始碼拿來跑，換各種等級與差幾點 */
  const m = /const ptyCapSay=([^;]+);/.exec(P); assert.ok(m, "07pty-party.js 找不到 ptyCapSay（改名了？字典要跟著看）");
  const cap = vm.runInNewContext("(" + m[1] + ")");
  for (const [L, nd] of [[1, 1], [12, 260], [13, 5], [57, 1234], [99, 88], [12, 0], [100, 0]]) {
    const e = ok(X, cap(L, nd)); if (nd > 0 && L < 100) assert.ok(e.includes("Lv " + L) && e.includes(nd + " more XP") && e.includes("Lv " + (L + 1)), e);
  }
  /* ptyXpHow 那一行：原始碼的字跟字典對得上；點數換了也翻得出 */
  const how = /<p class="pty-m pty-how">([^<]+)<\/p>/.exec(P); assert.ok(how, "07pty-party.js 找不到 ptyXpHow 那一行");
  ok(X, how[1]); ok(X, "下一盤電腦（贏 +50、輸 +20）、解千秋殘局（+10）、打星門圍城，都會加修為。");
  /* 卡片副標：樣板 C.pc・era・Lv n（練滿了…）還在原始碼裡 */
  assert.ok(P.includes("${esc(C.pc||\"\")}・${esc(era)}・Lv ${lv}") && P.includes("\"（練滿了）\":\"（練滿了，等你升級）\""), "07pty-party.js 卡片副標的樣板改了，字典 pat 要跟著改");
  assert.ok(P.includes("data-a=\"look\">設為隨行</button>"), "07pty-party.js「設為隨行」按鈕改了（11/18「帶他出門」改叫「隨行」，內建翻 Set as companion）");
  assert.equal(load(false).i18nText("設為隨行"), "Set as companion"); assert.equal(load(false).i18nText("隨行中"), "Your companion");
  for (const pc of PCS) for (const era of ERAS) for (const [lv, tail, en] of [[4, "", ""], [12, "（練滿了，等你升級）", " (maxed out; level up to continue)"], [100, "（練滿了）", " (maxed out)"]]) {
    const e = ok(X, pc + "・" + era + "・Lv " + lv + tail);
    assert.ok(e.endsWith(" · Lv " + lv + en), e);
  }
  /* 還沒加入的卡「星槎停靠〇〇時相遇」、陪你走的提示、招式頁標題 */
  for (const era of ERAS) ok(X, "星槎停靠" + era + "時相遇");
  for (const n of NAMES) { assert.ok(ok(X, n + "陪你走").endsWith(" is walking with you")); assert.ok(ok(X, n + "的招式").endsWith("'s skills")) }
});

test("星塵天賦樹：全隊共用；每位最多點亮 N 個、（🔒）Lv N 解鎖，換數字都翻得出", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), G = M("m/07sg2-siege2.js");
  assert.ok(G.includes("全隊共用；每位最多點亮 ${SG2G.TAL_MAX} 個") && G.includes("🔒 Lv ${need} 解鎖"), "07sg2-siege2.js 天賦樹的樣板改了，字典 pat 要跟著改");
  assert.equal(ok(X, "全隊共用；每位最多點亮 2 個"), "Shared by the whole team; up to 2 talents per companion");
  ok(X, "全隊共用；每位最多點亮 3 個");
  for (const n of [1, 4, 8, 12, 16, 100]) { assert.equal(ok(X, "Lv " + n + " 解鎖"), "Unlocks at Lv " + n); assert.equal(ok(X, "🔒 Lv " + n + " 解鎖"), "🔒 Unlocks at Lv " + n) }
});

test("內建翻得出的照內建；單獨一個棋子字不翻（黑洞頭像圈、星槎棋子章放不下英文）", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const B = load(false), X = load(true);
  const L = ["🚶 齊轍陪你走了", "🚶 沈方庭陪你走了", "天賦", "🌌 天賦", "秦朝", "南北朝", "石桌松蔭", "車馬爭先", "空杯獨弈"];
  for (const s of L) { const b = B.i18nText(s); assert.ok(b != null, "內建本來就翻得出：" + s); assert.equal(X.i18nText(s), b, s) }
  /* 外掛裡早就有的同系列句子，新加的句型不搶 */
  const OLD = { "夥伴最高練到 Lv 12，你升級才會再往上": "Partners can train up to Lv 12. Level up to go higher.", "夥伴最高練到 Lv 100": "Partners can train up to Lv 100",
    "（練滿了，等你升級）": "(maxed out; level up to continue)", "五招都學會（Lv 16）才能點天賦": "Learn all five moves (Lv 16) to unlock talents", "已點亮 1／2": "Lit 1/2", "（全隊共用）": "(shared by the whole team)" };
  for (const [s, e] of Object.entries(OLD)) assert.equal(X.i18nText(s), e, s);
  for (const pc of PCS.concat(["將", "士", "象", "馬", "車", "砲", "卒"])) assert.equal(X.i18nText(pc), null, "單字棋子不翻：" + pc);
});

/* 11/17：聲音頁「♪ 正在播放《曲名》」以前把曲名標 data-noi18n（當時沒有曲名英文），字典補齊後拿掉才翻得到 */
test("〔原始碼〕聲音頁的曲名不再標 data-noi18n", () => {
  const B = M("m/01-board.js");
  assert.ok(B.includes('${t?`<span style="margin-left:.3em">《${esc(t)}》</span>`'), "曲名 span 照常輸出（前面留間距，英文才不會黏成 Now playing\"…\"）");
  assert.ok(!B.includes("<span data-noi18n>《${esc(t)}》"), "不要再標 data-noi18n");
});

/* ===== 11/17 第 2 批（Windows 測試員 D，候選版 0156）：起航頁、棋話、七星來訪、設定頁、用詞統一 ===== */
/* 從原始碼抽 const NAME=<物件> 在 vm 裡求值（資料改了、多了站或台詞，這裡跟著測） */
function lit(S, name, ctx) {
  const m = new RegExp("(?:const|let|var)\\s+" + name + "\\s*=").exec(S); assert.ok(m, "原始碼找不到 " + name);
  let i = m.index + m[0].length; while (/\s/.test(S[i])) i++;
  const st = i; let dep = 0, q = null;
  for (; i < S.length; i++) {
    const c = S[i];
    if (q) { if (c === "\\") { i++; continue } if (c === q) q = null; continue }
    if (c === '"' || c === "'" || c === "`") { q = c; continue }
    if ("([{".includes(c)) dep++; else if (")]}".includes(c)) { dep--; if (!dep) { i++; break } }
  }
  return vm.runInNewContext("(" + S.slice(st, i) + ")", Object.assign({}, ctx || {}));
}
const ROUTE = ["classic", "qin", "han", "sanguo", "weijin", "nanbei", "sui", "tang", "wudai", "song", "yuan", "ming", "qing"];
const SHORT = { classic: "星槎", qin: "秦", han: "漢", sanguo: "三國", weijin: "魏晉", nanbei: "南北朝", sui: "隋", tang: "唐", wudai: "五代", song: "宋", yuan: "元", ming: "明", qing: "清" };
const CNUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四"];
const NK = ["阿轍", "小梅", "方庭", "城子", "燕子", "溪兒", "花兒"];

test("起航頁與「還不能起航」：說書人每一站的預告、本站歷練（換數字、各站）、五件事的勾、按鈕與說明", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), F = M("m/07f-ship.js"), LES = lit(F, "SHIP_LESSON");
  assert.equal(ok(X, "說書人：「客官，下一站竹林溪畔——雙相連環，教你如何死守成和。」"), "Storyteller: \"Next stop, traveler: the Bamboo Grove Stream. Linked elephants will teach you how to hold out for a draw.\"");
  for (const k of ROUTE) if (LES[k].pre) ok(X, "說書人：「" + LES[k].pre + "」");
  assert.equal(ok(X, "【本站歷練】完成 3 件事即可起航（1/3）"), "【This stop's tasks】 Finish 3 to set sail (1/3)");
  for (const n of [0, 2]) ok(X, "【本站歷練】完成 3 件事即可起航（" + n + "/3）");
  ok(X, "挑選你喜歡的任務，下棋、解題、看故事都可以喔！"); ok(X, "按「起航」看每一件怎麼做"); ok(X, "清單上還有好多好玩的事，陪我再解一題殘局嘛。");
  const box = ["⬜", "✅"];
  for (let m = 0; m < 32; m++) { const b = i => box[(m >> i) & 1]; assert.ok(ok(X, `${b(0)}解局　${b(1)}對弈　${b(2)}聽書　${b(3)}打擂　${b(4)}修為`).includes("Listen to stories")) }
  for (const nk of NK) { ok(X, nk + "：「等一下啦，我們還沒逛完這裡呢！」"); ok(X, nk + "：「行李收好啦！星槎準備出發！」") }
  for (const k of ROUTE.slice(1)) {
    const s = SHORT[k];
    ok(X, "還差一步・" + s); ok(X, "【" + s + "・本站歷練】（1/3）"); ok(X, "要先回到「" + s + "」那一站。按下面這顆，星槎會自動開回去。");
    ok(X, "⛵ 回" + s + "那一站"); ok(X, "⛵ 回" + s + "，翻開《棋話》"); ok(X, "翻開" + s + "的《棋話》，看一頁棋理（0/1）");
    ok(X, "解開「" + s + "」這一站 2 題千秋殘局"); ok(X, "解開「" + s + "」這一站 2 題千秋殘局（有 1 題是看答案走完的，不算；不看答案再解一次就算）");
  }
  assert.equal(ok(X, "還差一步・魏晉"), "Not ready yet · Wei-Jin");
  for (const s of ["在這一朝贏 1 盤棋，或下滿 3 盤（20 手以上，輸贏都算）", "讀這一站的故事一章，並解開章末那一局", "挑戰這一朝的擂主：贏，或撐過 30 手", "修為到 Lv 5（下棋、解題都會加）", "修為到 Lv 14（下棋、解題都會加）", "2/3 盤", "贏了", "去", "⚓ 船錨卡住了", "📘 看《棋話》", "說書人：「先翻開這一站的《棋話》看一頁，船錨就拉得起來。」"]) ok(X, s);
  /* 原始碼的樣板還是這樣寫（改了字典要跟著改） */
  for (const s of ["【本站歷練】完成 '+SAIL_NEED+' 件事即可起航（'", "挑選你喜歡的任務，下棋、解題、看故事都可以喔！", "按「起航」看每一件怎麼做", "N.T.map(x=>(x.ok?\"✅\":\"⬜\")+x.t).join(\"　\")", "還差一步・\"+esc(shipShort(nx))", "要先回到「'+esc(shipShort(N.k))+'」那一站。按下面這顆，星槎會自動開回去。", "⛵ 回'+esc(shipShort(N.k))+(N.first?'，翻開《棋話》':'那一站')"]) assert.ok(F.includes(s), "07f-ship.js 樣板改了：" + s);
  /* 「這一朝的棋：等待象戲」改譯 */
  assert.equal(ok(X, "📜 這一朝的棋：等待象戲"), "📜 Xiangqi of this dynasty: Still to Come");
});

test("棋話一頁：13 站＋終章的三行棋理、口訣、主場角色的話、章名、星槎小知識、這一朝的棋；入口與頁名同一個英文", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), F = M("m/07f-ship.js"), G = M("m/07d-garden.js");
  const LES = lit(F, "SHIP_LESSON"), LORE = lit(F, "SHIP_LORE"), END = lit(F, "SHIP_END"), SAY = lit(F, "SHIP_SAY"), STOP = lit(F, "SHIP_STOP"), HIST = lit(G, "HIST", { HIST_NOC: "" });
  assert.equal(ok(X, "象棋之勝負，全在擒獲敵方主帥。"), "In xiangqi, victory comes down to capturing the enemy general.");
  assert.equal(ok(X, "口訣：認清棋子，一眼尋殺"), "Mnemonic: Know the pieces, spot the mate at a glance");
  for (const k of ROUTE.concat(["finale"])) {
    const L = LES[k]; ok(X, L.t); ok(X, "📘 棋話一頁・" + (SHORT[k] || "終章")); ok(X, STOP[k].place);
    for (const x of L.x) ok(X, x);
    ok(X, "口訣：" + L.k); if (L.open) ok(X, "「" + L.open + "」"); if (L.done) ok(X, "「" + L.done + "」");
    if (HIST[k]) ok(X, "📜 這一朝的棋：" + HIST[k].t);
  }
  for (let i = 1; i <= 14; i++) { assert.equal(ok(X, "《雲河七星》第" + CNUM[i] + "章"), "Cloud River Seven Stars, Chapter " + i);   /* 第 8 批 P3-3：七星統一叫 Cloud River Seven Stars */ ok(X, "《雲河七星》第" + CNUM[i] + "章・讀過了") }
  for (const [a, b] of LORE) { ok(X, "🌌 星槎小知識・" + a); ok(X, b) }
  for (const s of END.x.concat(SAY)) ok(X, s);
  for (const s of ["這一朝還沒有今天的象棋；星槎石桌上的千秋殘局，題目出自明清古譜。", "✅ 這站的 3 題千秋殘局都解開了", "千秋殘局 3 題都自己解開，就算學會這一頁棋話"]) ok(X, s);
  const P = "A Page of Chess Tales";
  assert.equal(X.i18nText("棋話一頁"), P); assert.equal(X.i18nText("📘 棋話一頁"), "📘 " + P); assert.equal(X.i18nText("棋話一頁：魏晉"), P + ": Wei-Jin");
  assert.ok(!fs.readFileSync(EXT, "utf8").includes("Chess Tales Page"), "入口不要再叫 A Chess Tales Page");
});

test("七星來訪：七位每一句台詞、請託的三句（{名} 換七位小名、{你} 換你／妳）都翻得出；🚪 來串門子／🎁 回來了", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), V7 = lit(M("m/07j-visit.js"), "V7");
  assert.equal(ok(X, "「方庭呢？……沒事，我只是看看。」"), "\"Where's Fangting? ...Nothing. Just checking.\"");
  let n = 0;
  for (const c of Object.keys(V7)) {
    const all = V7[c].l.map(x => x[0]); for (const q of V7[c].q) all.push(q.ask, q.wait, q.thx);
    for (const s of all) for (const nm of NK.concat(["燕子姊姊"])) for (const you of ["你", "妳"]) {
      const e = ok(X, "「" + s.replace(/\{名\}/g, nm).replace(/\{你\}/g, you) + "」"); n++;
      if (s.includes("{名}")) assert.ok(!e.includes("{"), e);
    }
  }
  assert.ok(n > 700);
  for (const nm of NK) { ok(X, "🚪 " + nm + "來串門子"); ok(X, "🎁 " + nm + "回來了") }
  for (const s of ["還在等你：", "還在等妳：", "好，那下次再說。", "♟ 下完一盤棋（挑戰電腦、園子都算，雙方各走 5 步以上）", "🍵 解開一題殘局（一盞茶或千秋殘局都算，看答案不算）",
    "📖 讀《雲河七星》第二章（秦）・完成送 15 修為", "♟ 下完一盤棋（挑戰電腦、園子都算，雙方各走 5 步以上）　✅ 做到了", "沈方庭・帥・明・徽州當鋪少爺", "鐵連城・仕・明・鄰家哥哥"]) ok(X, s);
  assert.equal(X.i18nText("還在等你："), "Still waiting for you:");
});

test("設定頁：本命棋子那一句（七種棋子 × 夥伴名字）、旅途插曲說明（換次數）；官階是保留字不翻", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), S = M("m/05-settings.js"), E = M("m/07t-episodes.js");
  assert.ok(S.includes("本命棋子「${esc(botPc())}」跟著首頁的隨行夥伴（現在是${esc(meName())}）。"), "05-settings.js 本命棋子那句改了（11/18 改「隨行」）");
  assert.equal(ok(load(false), "本命棋子「俥」跟著首頁的隨行夥伴（現在是齊轍）。"), "Your signature piece, the Chariot, goes with your companion on the home screen (now Qi Zhe).");
  for (const pc of PCS) for (const nm of NAMES) ok(load(false), "本命棋子「" + pc + "」跟著首頁的隨行夥伴（現在是" + nm + "）。");
  assert.ok(E.includes("七星吵架、漏字信、不速之客、星夜茶話、大掃除；一天最多 "), "07t-episodes.js 旅途插曲說明改了");
  assert.equal(ok(X, "本命棋子「俥」跟著首頁陪你走的夥伴（現在是齊轍）。"), "Your signature piece, the Chariot, goes with the companion walking with you on the home screen (now Qi Zhe).");
  for (const pc of PCS) for (const nm of NAMES) ok(X, "本命棋子「" + pc + "」跟著首頁陪你走的夥伴（現在是" + nm + "）。");
  for (const n of [1, 2, 3]) ok(X, "七星吵架、漏字信、不速之客、星夜茶話、大掃除；一天最多 " + n + " 次，不會扣東西");
  assert.equal(X.i18nText("官階"), "Rank", "第 10 批起官階不是保留字，內建翻成 Rank（07s2 改用 data-sm-title 找段落）");
  assert.ok(!Object.prototype.hasOwnProperty.call(JSON.parse(fs.readFileSync(EXT, "utf8")).en, "官階"), "內建就有，外掛不用重複");
});

test("星門圍城 11/17 新字串：資料卡（原本／被打降／天賦／護帥）、攻擊預覽「防 D→D1」、跳字、短提示（七種棋子）、序章教學句（兩種結尾）、缺資料的舊句", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), G = M("m/07sg2-siege2.js");
  for (const s of ['ex.push("原本 "+full,"被打降 "+(full-D))', 'ex.push("天賦 +"+n)', 'ex.push("護帥 ×"+SG2.GUARD_K)', '"防"+c.D+"→"+', "`打不動・防 ${e.D0}→${e.D1}`", "`打不動・防 −${e.down}`",
    '"打不動："+(nm?"敵・"+nm+" ":"")+"防禦 "+e.D0+"→"+e.D1+"，這一手用掉了"', '"打不動：對方防禦降 "+e.down+"，這一手用掉了"', '"🛡 打不動：對方防禦 "+e.D0+" 比你的攻擊力 "+e.A+" 高，打不進去，它的防禦降到 "+e.D1+"。"', '"再打一次就打得穿":"多打幾次就打得穿"'])
    assert.ok(G.includes(s), "07sg2-siege2.js 樣板改了：" + s);
  assert.equal(ok(X, "（原本 31、被打降 18、招式 +5、士相護線 +10、天賦 +4、護帥 ×1.2、過河 +6）"), "(Originally 31, Lowered by 18, Move bonus +5, Advisor-Elephant line +10, Talent +4, General guard ×1.2, River crossing +6)");
  for (const s of ["（原本 40、被打降 9）", "（天賦 +4）", "（護帥 ×1.2）", "（天賦 +10、護帥 ×1.2）"]) ok(X, s);
  for (const [a, b] of [[31, 13], [8, 0], [120, 95]]) {
    assert.equal(ok(X, "防" + a + "→" + b), "DEF " + a + "→" + b); ok(X, "合力防" + a + "→" + b);
    assert.equal(ok(X, "打不動・防 " + a + "→" + b), "Can't break through · Def " + a + "→" + b);
    ok(X, "打不動：防禦 " + a + "→" + b + "，這一手用掉了");
    for (const pc of PCS.concat(["將", "士", "象", "馬", "車", "砲", "卒"])) { ok(X, "打不動：敵・" + pc + " 防禦 " + a + "→" + b + "，這一手用掉了"); ok(X, "敵・" + pc) }
  }
  assert.equal(ok(X, "打不動：敵・象 防禦 31→13，這一手用掉了"), "Can't break through: enemy Elephant defense 31→13, this move is used up");
  for (const s of ["打不動・防 −5", "防−5", "合力−12", "合力擊破", "打不動：對方防禦降 5，這一手用掉了", "🛡 打不動：對方防禦比你的攻擊力高，所以它的防禦降了 10。再打一次就打得穿"]) ok(X, s);
  for (const tail of ["再打一次就打得穿", "多打幾次就打得穿"]) assert.ok(ok(X, "🛡 打不動：對方防禦 31 比你的攻擊力 20 高，打不進去，它的防禦降到 21。" + tail).includes("defense 31 is higher than your attack 20"));
  for (const nm of NAMES.concat(["木棋靈"])) ok(X, nm + "・俥");
});

test("第 3 批（候選版 0239）：官階說明（秦、漢）、星門圍城選關（21 招鎖住的、序章 C3、天賦、目標首字大寫）、對局頁（回合數、靈、開局教學句、1～12 關的話與提示）、書架、園子地名", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), S = M("m/05-settings.js"), C = M("m/06-cpu.js"), G = M("m/07sg2-siege2.js"), F = M("m/07f-ship.js");
  assert.ok(S.includes("</span>就跟著升官（${RANKT(store.get(\"era\",\"classic\"),9)} → ${RANKT(store.get(\"era\",\"classic\"),1)}），官服、頂戴、腰帶都會換"), "05-settings.js 官階說明改了");
  const RT = lit(C, "RANK_T"), RN = lit(C, "RANK_NOTE");
  for (const e of Object.keys(RT)) { const T = RT[e].map(x => x + (e === "han" ? "官" : "")); const s = ok(X, "就跟著升官（" + T[8] + " → " + T[0] + "），官服、頂戴、腰帶都會換"); assert.ok(s.startsWith(" rises in rank"), "名字後面要有空格：" + s) }
  for (const s of Object.values(RN)) ok(X, s);
  /* 選關：每一招鎖住的樣子（🔒 LvN 招式・N 靈） */
  assert.ok(G.includes('${s.lv>g.L?"🔒 Lv"+s.lv+" ":""}${esc(s.nm)}・${s.cost} 靈'), "07sg2-siege2.js 招式列樣板改了");
  const SK = lit(G, "SK"); assert.ok(SK.length >= 21);
  for (const s of SK) assert.equal(ok(X, "🔒 Lv" + s.lv + " " + s.nm + "・" + s.cost + " 靈"), "🔒 Lv" + s.lv + " " + X.i18nText(s.nm + "・" + s.cost + " 靈"));
  assert.equal(ok(X, "序章 C3・結業：小星門圍城"), "Prologue C3 · Graduation: Mini Siege");
  const LV = lit(M("m/07bhg-gatesiege.js"), "LV", { GSV_W: {} });
  for (const k of Object.keys(LV)) { const V = LV[k]; if (V.code) ok(X, "序章 " + V.code + "・" + V.nm); if (V.say) { ok(X, "✦ 星樞：" + V.say); ok(X, "星樞：" + V.say) } if (V.tip) ok(X, "💡 " + V.tip) }
  assert.equal(ok(X, "🌌 天賦（已點亮 0）"), "🌌 Talents (0 lit)");
  assert.equal(ok(X, "20 回合內贏"), "Won within 20 rounds");
  /* 對局頁 */
  assert.ok(G.includes("<b>第 ${td.rnd+1}／${td.rlim} 回合</b>"), "07sg2-siege2.js 回合數是一個文字節點（英文走「第 N／M 回合」句型）");
  assert.ok(M("m/07bhg-gatesiege.js").includes("<b>第 ${td.rnd+1} 回合</b>"), "07bhg 回合數也是一個節點");
  assert.notEqual(X.i18nText("第"), "", "不再靠「第」翻成空字串的權宜條目"); assert.equal(X.i18nText("回合"), "rounds");
  assert.equal(ok(X, "第 3 回合"), "Round 3");
  assert.equal(ok(X, "第 1／60 回合"), "Round 1/60");
  for (const s of ["靈 20", "靈 20／40", "靈力 20／40"]) ok(X, s);
  assert.equal(ok(X, "星樞：走到敵子上是攻擊：攻擊力比對方防禦高就扣血，沒打死就停在原地，打死才移進去。").slice(0, 13), "Star Pivot: M");
  /* 書架、園子 */
  assert.ok(F.includes("\"讀到第\"+CNUM(L.n)+\"回・\"+esc(ROAD_NAME)+\" \"+p1+\"／\"+J.length+\" 關\""), "07f-ship.js 書架樣板改了");
  for (const n of ["一", "九", "十二", "二十三", "三十六"]) ok(X, "讀到第" + n + "回・章回棋路 5／36 關");
  ok(X, "明朝隆慶・過了 3／30 關");
  const PW = lit(C, "PW"), ERA = { qin: "秦朝", han: "漢朝", sanguo: "三國", weijin: "魏晉", nanbei: "南北朝", sui: "隋朝", tang: "唐朝", wudai: "五代", song: "宋朝", yuan: "元朝", ming: "明朝", qing: "清朝" };
  for (const [k, z] of Object.entries(ERA)) ok(X, z + "的" + PW[k]);
  assert.equal(ok(X, "秦朝的苑囿"), "Imperial park of the Qin dynasty");
});

test("第 4 批：星門圍城規則內文（小標後面那段）、選關卡名與目標列（易／中／難 1～8）、天賦鈕、下一波（門、棋種）、加到主畫面、結算（首破、打了 N 回合、看星盤）、幻譜星門（十三星的勝利條件與台詞）、回園子對局", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), G = M("m/07sg2-siege2.js"), H = M("m/07bhg-gatesiege.js"), SH = M("m/02-shell.js"), GX = M("m/07gx-galaxy.js"), GP = M("m/07gxp-gatepano.js");
  /* ① 規則：<b>小標</b> 跟後面的字是不同的文字節點，逐段翻；帶 ${…} 的換幾個數字都要翻得出 */
  const body = (S, fn) => { const i = S.indexOf("function " + fn + "(){return`"); assert.ok(i >= 0, "找不到 " + fn); return S.slice(S.indexOf("`", i) + 1, S.indexOf("</ul>`}", i)) };
  for (const n of [3, 6, 10, 20, 60]) for (const h of [body(G, "sg2RulesHTML"), body(H, "gsvRulesHTML")])
    for (const p of h.replace(/\$\{[^}]+\}/g, n).split(/<[^>]*>/)) if (CJK.test(p)) ok(X, p.trim());
  assert.ok(X.i18nText("都有自己的體力、攻擊力、防禦力，看那種棋子所屬角色的等級；敵方看關卡和難度。").startsWith(" has its own"), "接在小標後面，譯文開頭要留空格");
  assert.ok(X.i18nText("就吃不了：對方防禦力降「你攻擊力的一半」，你留在原地。兩種都用掉這一步。").startsWith(", you can't capture"));
  /* ② 選關：卡片「易 1・關卡名」（鎖住的加 🔒）、目標列「關名・關卡名（難度）：☆」、結算抬頭、開打 toast */
  assert.ok(G.includes("<b>${esc(LN)}・${esc(V.nm)}</b>") && G.includes("<p class=\"gsv-gl\">${esc(SG2G.nameOf(sel))}・${esc(V.nm||\"\")}（${SG2.DIFF[ds].nm}）："), "07sg2-siege2.js 選關卡片／目標列樣板改了");
  const LV = lit(H, "LV", { GSV_W: {} }), GRP = lit(G, "GRP");
  for (const g of GRP) g.lv.forEach((n, i) => {
    const LN = g.id === "pro" ? "序章 " + LV[n].code : g.nm + " " + (i + 1), nm = LV[n].nm;
    ok(X, LN + "・" + nm); ok(X, "🔒 " + LN + "・" + nm);
    for (const d of ["易", "中", "難"]) {
      for (const s of ["☆", "★"]) ok(X, LN + "・" + nm + "（" + d + "）：" + s);
      for (const why of ["將帥體力歸零", "將死", "困斃", "打滿 60 回合沒分勝負"]) ok(X, why + "・🌠 星門圍城・" + LN + "・" + nm + "（" + d + "）");
      ok(X, "🌠 星門圍城・" + LN + "・" + nm + "（" + d + "）");
    }
  });
  assert.equal(ok(X, "難 1・雙炮巡河"), "Hard 1 · Twin Cannons on Patrol");
  assert.equal(ok(X, "難 1・雙炮巡河（難）：☆"), "Hard 1 · Twin Cannons on Patrol (Hard): ☆");
  /* ③ 天賦鈕（有沒有 🌌 都翻） */
  for (const n of [0, 3, 14]) { assert.equal(ok(X, "天賦（已點亮 " + n + "）"), "Talents (" + n + " lit)"); ok(X, "🌌 天賦（已點亮 " + n + "）") }
  /* ④ 下一波：<span>下一波</span>「：門・棋×n、…・」<b>N</b> <span>回合後</span>；中間那段譯文尾巴留空格 */
  assert.ok(G.includes("<span>下一波</span>：${Object.keys(cnt).map(k=>esc(k)+\"×\"+cnt[k]).join(\"、\")}・<b>${n} 回合後</b>"), "07sg2-siege2.js 下一波樣板改了");
  assert.equal(ok(X, "1 回合後"), "In 1 round"); assert.equal(ok(X, "3 回合後"), "In 3 rounds"); assert.equal(ok(X, "打了 1 回合"), "Played 1 round");
  const GATES = ["左門", "中門", "右門"], PB = ["將", "士", "象", "馬", "車", "砲", "卒"];
  for (const gt of GATES) for (const pc of PB) { const s = ok(X, "：" + gt + "・" + pc + "×1・"); assert.ok(s.startsWith(": ") && s.endsWith(" · "), s) }
  assert.equal(ok(X, "：右門・卒×1・"), ": Right gate · Soldier ×1 · ");
  assert.equal(ok(X, "：左門・馬×2、中門・車×1・"), ": Left gate · Horse ×2, Center gate · Chariot ×1 · ");
  assert.equal(ok(X, "1 回合後"), "In 1 round"); assert.equal(ok(X, "3 回合後"), "In 3 rounds");
  /* ⑤ 加到主畫面（02-shell.js）：「或」夾在兩個 <b> 中間，譯文前後有空格 */
  assert.ok(SH.includes("<b>「加到主畫面」</b>或<b>「安裝應用程式」</b>"), "02-shell.js 第 2 步樣板改了");
  for (const s of ["加了之後，從主畫面點圖示就能打開，全螢幕、沒網路也能下棋。", "之後從主畫面點圖示就能打開，全螢幕、沒網路也能下棋。", "「加到主畫面」", "「安裝應用程式」"]) ok(X, s);
  assert.equal(X.i18nText("或"), " or ");
  /* ⑥ 結算：首破（有沒有星塵、✨／⭐）、「打了 <b>N</b> 回合・帥…・敵將…」、再看一下星盤（按鈕放得下） */
  assert.ok(G.includes("<b>打了 ${sg2Rnds(st)} 回合</b><span class=\"sg2-ex\">・帥 ${hp(kr)}・敵將 ${hp(kb)}</span>"), "07sg2-siege2.js 結算回合列樣板改了"); assert.equal(ok(X, "・帥 64／64・敵將 54／54"), "· General 64/64 · Enemy General 54/54");
  for (const d of ["易", "中", "難"]) for (const e of ["✨", "⭐"]) {
    assert.equal(ok(X, e + " 第一次破這一關（" + d + "）：修為 +20　🌌 星塵 +6（共 6）"), e + " First clear of this stage (" + X.i18nText(d) + "): XP +20 🌌 Stardust +6 (6 total)");
    ok(X, e + " 第一次破這一關（" + d + "）：修為 +20");
  }
  assert.equal(ok(X, "打了"), "Played");
  for (const [a, b] of [["64／64", "54／54"], ["倒下", "0／54"], ["12／64", "倒下"]]) { ok(X, "回合・帥 " + a + "・敵將 " + b); ok(X, "打了 2 回合・帥 " + a + "・敵將 " + b) }
  assert.equal(ok(X, "打了 2 回合・帥 64／64・敵將 54／54"), "Played 2 rounds · General 64/64 · Enemy General 54/54");
  assert.equal(ok(X, "打了 1 回合・帥 64／64・敵將 54／54"), "Played 1 round · General 64/64 · Enemy General 54/54");
  assert.ok(ok(X, "再看一下星盤").length <= 12, "結果視窗的按鈕放得下");
  /* ⑦ 幻譜星門：GX_TXT 每一句、十三星的名號／規則／勝利條件／台詞（卡片上帶「」）／星印批註、三檔星印、提示 */
  assert.ok(GX.includes("${g.goal?`<p>勝利條件：${esc(g.goal)}</p>`:\"\"}${say?`<p style=\"font-style:italic\">「${esc(say)}」</p>`:\"\"}"), "07gx-galaxy.js 星圖卡片樣板改了");
  assert.ok(GP.includes("左右拖曳繞一圈，點一顆星看看。打贏一位主宰，下一顆星就會亮。"), "07gxp-gatepano.js 提示改了");
  const GL = lit(GX, "GX_LIST"), GT = lit(GX, "GX_TXT"), GM = lit(GX, "GX_MODES"), GH = lit(GX, "GX_HINT");
  assert.ok(GL.length === 13);
  for (const s of Object.values(GT)) { ok(X, s); ok(X, "✦ " + s) }
  for (const s of [GT.pick, GT.invite]) ok(X, "幻影棋客：「" + s + "」");
  for (const s of [GT.off, GT.lock, GT.mirror]) ok(X, "「" + s + "」");
  ok(X, "左右拖曳繞一圈，點一顆星看看。打贏一位主宰，下一顆星就會亮。");
  for (const g of GL) {
    for (const s of [g.t, g.rule, "🔒 先打贏「" + g.t + "」", "✦ " + g.t + "：「" + GT.win + "」", "✦ " + g.t + "：「" + GT.lose + "」"]) ok(X, s);
    if (g.goal) assert.ok(ok(X, "勝利條件：" + g.goal).startsWith("Win condition: "));
    if (g.say) { ok(X, "「" + g.say + "」"); ok(X, "🌌 " + g.t + "：「" + g.say + "」"); ok(X, "🌌 " + g.t + "・第 1／3 局：「" + g.say + "」") }
    if (g.seal) ok(X, g.seal);
  }
  for (const m of GM) { ok(X, "✦ 已得" + m[3] + "，可以再挑戰更高一檔"); ok(X, m[1]); ok(X, m[3]) }
  for (const s of Object.values(GH)) ok(X, "💡 " + s);
  assert.equal(ok(X, "「這般殺陣，我已演練過萬次。」"), "\"I have rehearsed this killing formation ten thousand times.\"");
  /* ⑧ 回園子對局（07w9-exits.js 出口；只補字典） */
  assert.equal(ok(X, "↩ 回園子對局"), "↩ Back to the garden game");
});

test("第 5 批：星門預告（門・棋、延遲過／入侵）、齊轍木棋靈那句、書架小人的動作台詞與長按提示、對局頁（18 級電腦說明、棋規摺疊列與說明、3D 操作提示）、幻譜星門結果第一行、引擎下載提示", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), LAB = p => fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", p), "utf8").replace(/\r\n/g, "\n");
  const G = M("m/07sg2-siege2.js"), H = M("m/07bhg-gatesiege.js"), U = M("m/00-util.js"), GX = M("m/07gx-galaxy.js"), SH = M("m/02-shell.js");
  /* ① 星門預告：<b>N 回合後</b> 後面的「：門・棋、…」（07sg2）、「（第 N 回合結束）：門・棋（入侵）（已延遲一次）、…」（07bhg） */
  assert.ok(G.includes("<p><b>${Math.max(1,at-st.td.rnd)} 回合後</b>：${by[at].map(w=>esc(GSV.gateNm(w.sq)+\"・\"+GSV.PBN[w.p.toUpperCase()]+(w.dl?\"（延遲過）\":\"\"))).join(\"、\")}</p>"), "07sg2-siege2.js 星門預告樣板改了");
  assert.ok(H.includes("<p><b>${g.inR} 回合後</b>（第 ${g.at} 回合結束）：${g.ws.map(w=>esc(GSV.gateNm(w.sq)+\"・\"+GSV.PBN[w.p.toUpperCase()]+(w.tag===\"inv\"?\"（入侵）\":\"\")+(w.dl?\"（已延遲一次）\":\"\"))).join(\"、\")}</p>"), "07bhg-gatesiege.js 星門預告樣板改了");
  for (const g of ["左門", "中門", "右門"]) for (const p of ["將", "士", "象", "馬", "車", "砲", "卒"]) {
    for (const s of ["", "（延遲過）"]) assert.ok(ok(X, "：" + g + "・" + p + s).startsWith(": "));
    for (const s of ["", "（入侵）", "（已延遲一次）", "（入侵）（已延遲一次）"]) assert.ok(ok(X, "（第 5 回合結束）：" + g + "・" + p + s).startsWith(" (end of round 5): "));
  }
  assert.equal(ok(X, "：左門・馬、右門・馬"), ": Left gate · Horse, Right gate · Horse");
  assert.equal(ok(X, "：右門・車（延遲過）、左門・砲、左門・卒"), ": Right gate · Chariot (delayed), Left gate · Cannon, Left gate · Soldier");
  for (const s of ["站上門格可以擋住：擋一次延遲，延遲後又擋住就取消（截援）。", "下一波 1 回合後：右門・卒×1", "下一波 3 回合後：右門・卒×1、左門・馬×2"]) ok(X, s);
  /* ② 齊轍第一次看到木棋靈（07pty-party.js ptyWoodSay） */
  const PW = M("m/07pty-party.js").match(/function ptyWoodSay[\s\S]*?return"(齊轍：「[^"]+」)"/); assert.ok(PW, "07pty-party.js ptyWoodSay 改了");
  assert.ok(ok(X, PW[1]).startsWith("Qi Zhe: \""));
  /* ③ 書架、首頁小人（xiangqi-lab/src/bot3d.js）：每個動作的台詞 say、長按提示 HINTS */
  const B = LAB("bot3d.js"), SAY = [...new Set([...B.matchAll(/say:"([^"]+)"/g)].map(m => m[1]).filter(s => CJK.test(s)))];
  assert.ok(SAY.includes("吃飽了～") && SAY.length >= 25, "bot3d.js 動作台詞改了");
  for (const s of SAY) ok(X, s);
  const hi = B.indexOf("const HINTS=["); for (const m of B.slice(hi, B.indexOf("]", hi)).matchAll(/"([^"]+)"/g)) ok(X, m[1]);
  assert.equal(ok(X, "吃飽了～"), "I'm full!");
  /* ④ 對局頁：電腦說明（local.js 18 級：HUMANPICK DESC、LVDESC；舊 8 級 xiangqi-referee.js）、棋規摺疊列、3D 操作提示 */
  const LC = LAB("local.js"), DESC = JSON.parse(LC.match(/const DESC=(\[[^\]]+\]);/)[1]);
  assert.ok(LC.includes("const LVDESC=x=>x.movetime?`每步想 ${x.movetime/1000} 秒，不放水`:HP.on(x)?HP.DESC[x.hm]:`往後算 ${x.depth} 步，`+(x.margin>=500?\"常常亂走\":x.margin>=250?\"會漏子\":x.margin>=150?\"偶有失誤\":x.margin>=70?\"小失誤\":x.margin>=35?\"很少失誤\":\"幾乎不失誤\");"), "local.js LVDESC 改了");
  for (const s of DESC) ok(X, s);
  for (let d = 2; d <= 14; d++) for (const s of ["常常亂走", "會漏子", "偶有失誤", "小失誤", "很少失誤", "幾乎不失誤"]) assert.ok(ok(X, "往後算 " + d + " 步，" + s).startsWith("Looks " + d + " moves ahead, "));   /* 第 6 輪 D P3-3（scratchpad b6fix2.js）：整句譯文句首大寫 */
  for (const s of [0.3, 0.5, 1.2, 3]) ok(X, "每步想 " + s + " 秒，不放水");
  ok(X, "每步想 6 秒，人類幾乎贏不了");
  for (const m of fs.readFileSync(path.join(ROOT, "xiangqi-referee.js"), "utf8").matchAll(/\{n:\d,name:"[^"]+",desc:"([^"]+)"/g)) ok(X, m[1]);
  assert.equal(ok(X, "往後算 2 步，偶爾漏看、有時貪吃"), "Looks 2 moves ahead, sometimes misses things and can be greedy");
  assert.ok(U.includes("\"📜 本局棋規：\"+((st.rules&&st.rules.name)||\"亞洲棋例（直接捉子）\")"), "00-util.js 棋規徽章樣板改了");
  for (const s of ["📜 本局棋規：亞洲棋例（直接捉子）", "📜 本局棋規：中華民國象棋規則 113 年修訂版", "📜 本關棋規：不判長將長捉", "⚖️ 本局棋規：臺灣棋規（113 年版）", "⚖️ 本局棋規：臺灣棋規（113 年版）・計積分", "⚖️ 本局棋規：臺灣比賽規程（原型）・不計積分"]) ok(X, s);
  const T4 = U.match(/const T=tw\?"([^"]+)"\+RS\.name\+"([^"]+)"\s*:proto\?"([^"]+)"\+RS\.name\+"([^"]+)"\s*:np\?"([^"]+)"\s*:"([^"]+)";/); assert.ok(T4, "00-util.js 棋規說明段落改了");
  assert.ok(ok(X, T4[1] + "臺灣棋規（中華民國象棋規則 113 年修訂版）" + T4[2]).startsWith("This game uses \"Taiwan rules"));
  assert.ok(ok(X, T4[3] + "臺灣比賽規程（原型）" + T4[4]).startsWith("This game uses \"Taiwan tournament rules (prototype)\""));
  ok(X, T4[5]); ok(X, T4[6]);
  assert.ok(LAB("park3d.js").includes("hint.textContent=\"點棋子走棋・點物件看介紹・拖曳轉頭・兩指縮放\""), "park3d.js 操作提示改了");
  assert.equal(ok(X, "點棋子走棋・點物件看介紹・拖曳轉頭・兩指縮放"), "Tap a piece to move · Tap an object for info · Drag to look around · Pinch to zoom");
  /* ⑤ 幻譜星門結果第一行「為什麼・🌌 星系名（不計積分、不扣分）」：十三星＋第十四顆，認輸、將死、困斃、和局、離開、限著 */
  assert.ok(GX.includes("<p class=\"muted\">${esc((st.result&&st.result.why)||\"\")}・🌌 ${esc(g.t)}（不計積分、不扣分）</p>"), "07gx-galaxy.js 結果第一行樣板改了");
  const GT = lit(GX, "GX_LIST").map(g => g.t).concat(["第十四顆・鏡像", "星系"]);
  for (const g of GT) { for (const w of ["你認輸", "將死", "困斃", "雙方同意和棋", "中途離開，算輸", "遊戲自然限著：60 回合未吃子", "循環待核，同意和局"]) assert.ok(ok(X, w + "・🌌 " + g + "（不計積分、不扣分）").includes(" · 🌌 ")); ok(X, "・🌌 " + g + "（不計積分、不扣分）") }
  assert.equal(ok(X, "你認輸・🌌 紫淵・破軍幻影（不計積分、不扣分）"), "You resigned · 🌌 Ziyuan · Army-Breaker Phantom (no points gained or lost)");
  /* ⑥ 引擎下載（02-shell.js 自動下載、進度、首頁狀態；engine.js 失敗與重啟） */
  assert.ok(SH.includes("toast(\"✅ Pikafish 引擎已自動下載完成，離線也能下棋\")"), "02-shell.js 自動下載完成提示改了");
  for (const s of ["✅ Pikafish 引擎已自動下載完成，離線也能下棋", "✅ Pikafish 引擎下載完成", "✅ Pikafish 已在手機裡，可離線下棋與分析", "⬇ Pikafish 引擎還沒下載（約 48 MB）", "下載中…", "Pikafish 已下載，可以離線使用", "第一次使用：下載 Pikafish 引擎 35%（17／48 MB）", "⚠ 這支手機的 Android System WebView 版本太舊，電腦棋手無法運作；請到 Play 商店更新「Android System WebView」或「Chrome」"]) ok(X, s);
  for (const why of ["逾時", "Failed to fetch", "下載失敗：data/pikafish.nnue（404）"]) assert.ok(ok(X, "Pikafish 引擎下載失敗（" + why + "），請確認網路後再試一次").startsWith("Pikafish engine download failed ("));
  const EJ = LAB("engine.js"); for (const s of ["電腦棋手需要瀏覽器的「多執行緒模式」才能下棋，這次沒有開成功（背景的 Service Worker 沒有裝好）。請重新整理這一頁；還是不行，請換用最新版的 Chrome、Safari 或 Edge 再打開。", "電腦棋手啟動太久", "電腦棋手已重新啟動", "電腦棋手沒有回應，正在重新啟動（幾秒後自動再想一次）"]) { assert.ok(EJ.includes(s), "engine.js 改了：" + s); ok(X, s) }
});

test("用詞統一：星輝＝Starshine（不跟內建 星芒＝Starglow 撞）、修為＝XP、星塵＝Stardust；天賦樹分號後小寫；外掛裡城子＝Chengzi", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const B = load(false), X = load(true), J = JSON.parse(fs.readFileSync(EXT, "utf8"));
  assert.equal(B.i18nText("星芒"), "Starglow"); assert.equal(B.i18nText("星塵"), "Stardust"); assert.equal(B.i18nText("修為"), "XP");
  assert.equal(X.i18nText("星輝"), "Starshine"); assert.equal(X.i18nText("＋星輝"), "+ Starshine"); assert.equal(X.i18nText("✨ 給了 30 星輝"), "✨ Gave 30 Starshine");
  const para = X.i18nText("下棋、解題、黑洞過關得到的修為，一半自動分給隊上每一位，另一半變成星輝，由你分給想練的人。黑洞裡全隊已學會的招都會帶上場；「陪你走」是首頁上跟著你的那一位。");
  assert.ok(para.includes("XP") && para.includes("Starshine") && !/cultivation|starlight|Starglow/i.test(para), para);
  assert.equal(X.i18nText("五招都學會才能點；關卡外可以免費重置"), "Learn all five moves to unlock; outside stages you can reset for free");
  const rows = Object.entries(J.en).concat(J.pat.map(p => [p[0], p[1]]));
  for (const [k, v] of rows) {
    if (k.includes("星輝")) assert.ok(/Starshine/.test(v) && !/Starglow/.test(v), k + " → " + v);
    if (k.includes("修為")) assert.ok(!/cultivation/i.test(v), k + " → " + v);
    if (k.includes("城子")) assert.ok(!/\bCheng\b/.test(v), k + " → " + v);
  }
});

test("第 6 批（測試員 B 第 6 輪 N6-2）：快速對局 3D 園子縮放提示「A到B有多遠？往外看就知道！」（park3d.js MH_CITY 十二朝每一對）、小字「一直按右下角的「－」」、第一次拉遠的「原來我們在這裡・城」；星門圍城開局 toast", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), P = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "park3d.js"), "utf8").replace(/\r\n/g, "\n");
  assert.ok(P.includes("mhShow(\"mh-note\",`${C[0]}到${C[1]}有多遠？往外看就知道！<small>一直按右下角的「－」</small>`,7000)"), "park3d.js 縮放提示樣板改了");
  assert.ok(P.includes("<div class=\"mh-lab\">原來我們在這裡・${C[0]}</div>"), "park3d.js 拉遠標籤樣板改了");
  const MH = lit(P, "MH_CITY"), ERAS = Object.keys(MH);
  assert.equal(ERAS.length, 12, "十二朝都有");
  for (const e of ERAS) {
    const [a, b] = MH[e].map(c => c[0]);
    const s = ok(X, a + "到" + b + "有多遠？往外看就知道！");
    assert.match(s, /^How far is it from [A-Z][a-z']+ to [A-Z][a-z']+\? Zoom out and see!$/, e + "：" + s);
    assert.match(ok(X, "原來我們在這裡・" + a), /^So this is where we are · [A-Z][a-z']+$/);
    assert.match(ok(X, b), /^[A-Z][a-z']+$/, "第二座城單獨的標籤：" + b);
  }
  assert.equal(ok(X, "咸陽到邯鄲有多遠？往外看就知道！"), "How far is it from Xianyang to Handan? Zoom out and see!");
  assert.equal(ok(X, "開封到金陵有多遠？往外看就知道！"), "How far is it from Kaifeng to Jinling? Zoom out and see!");
  assert.equal(ok(X, "一直按右下角的「－」"), "Keep tapping \"－\" at the bottom right");
  assert.equal(X.i18nText("某城到某鎮有多遠？往外看就知道！"), null, "只認名城清單");
  /* N6-5：星門圍城開局 toast（07bhg：🌠 星門圍城・關名・開局（難度）） */
  assert.equal(ok(X, "🌠 星門圍城・易 1・交換要道（易）"), "🌠 Star Gate Siege · Easy 1 · Trade for the Key Lane (Easy)");
});

/* ===== 第 7 批（測試員 D 第 7 輪 P2-2～P2-6）：快速對局 3D 封面、進園子 toast、3D 走棋提示、黑洞偏航視窗、我的角色、古戰場地圖 ===== */
test("第 7 批 P2-2／P2-3：3D 封面名言的白話說明與出處（名言本身照古文）、「點一下畫面就進園子」、進園子 toast（各種 BOTN 名字）、3D 走棋提示整句", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), C = M("m/06-cpu.js"), P = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "park3d.js"), "utf8").replace(/\r\n/g, "\n");
  const PQ = lit(C, "PARK_Q");
  for (const k in PQ) for (const [q, who, src, n] of PQ[k]) {
    if (n) ok(X, n);
    ok(X, "── " + (who || "") + (src ? "　" + src : ""));
  }
  assert.equal(X.i18nText(PQ.qin[0][0]), null, "楚辭引文照原文（只翻白話說明）：" + PQ.qin[0][0]);
  assert.equal(ok(X, "「象棋」兩字最早出現在這裡，當時指六博一類的棋戲"), "The word \"xiangqi\" first appears here; back then it meant a board game like liubo");
  assert.equal(ok(X, "── 戰國楚辭　《楚辭・招魂》"), "── Songs of Chu (Warring States), \"Summoning the Soul\"");
  assert.ok(P.includes("veil.querySelector(\".gt-qw\").textContent=\"── \"+(Q.who||\"\")+(Q.src?\"　\"+Q.src:\"\")"), "park3d.js 出處行的樣板改了");
  assert.ok(P.includes(">點一下畫面就進園子</div>"), "park3d.js 封面提示改了");
  assert.equal(ok(X, "點一下畫面就進園子"), "Tap the screen to enter the garden");
  assert.ok(C.includes("`${fo?\"已關閉專注棋盤模式。\":\"\"}🌳 園子 3D 棋盤：${BOTN()}坐在對面跟你下（拖曳可以看四周）`"), "06-cpu.js 進園子 toast 樣板改了");
  const NM = ["小帥", "小帥妹", "小仕", "小相", "小車", "小馬", "小炮妹", "小兵", "小將", "小士", "小象", "小卒", "阿轍", "燕子", "花兒", "小梅", "方庭", "城子", "溪兒"];
  for (const nm of NM) {
    assert.match(ok(X, "🌳 園子 3D 棋盤：" + nm + "坐在對面跟你下（拖曳可以看四周）"), /^🌳 3D garden board: [A-Z][\w' -]+ sits across from you \(drag to look around\)$/);
    assert.match(ok(X, "已關閉專注棋盤模式。🌳 園子 3D 棋盤：" + nm + "坐在對面跟你下（拖曳可以看四周）"), /^Focus board mode off\. 🌳 3D garden board: /);
    ok(X, "我是" + nm + "，幫你加油！");
  }
  assert.equal(ok(X, "🌳 園子 3D 棋盤：阿轍坐在對面跟你下（拖曳可以看四周）"), "🌳 3D garden board: A-Zhe sits across from you (drag to look around)");
  assert.equal(ok(X, "先點你的棋子，再點綠點走過去。"), "Tap your piece first, then tap a green dot to move there.");
  ok(X, "看不清楚？按下面「▦ 平面棋盤」，棋子比較大。");
});

test("第 7 批 P2-4：星樞棋局封面副標、黑洞偏航視窗（星門圍城／急襲／星樞棋局、第一次必定偏航）、七星全名說話", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), BH = M("m/07bh-blackhole.js");
  assert.ok(BH.includes("gate:{img:[\"data/park/blackhole_360.webp\"],icon:\"🌀\",title:\"星樞棋局\",sub:\"墨色星渦的中心，有一張巨大的星盤\""), "07bh 封面改了");
  assert.equal(ok(X, "墨色星渦的中心，有一張巨大的星盤"), "At the heart of the ink star vortex lies a giant star board");
  const GXT = BH.match(/const BH_GXT_AT="([^"]+)";/)[1];
  const OF = BH.slice(BH.indexOf("function bhOffer("), BH.indexOf("function bhIntro("));
  const S1 = OF.match(/"(星渦裡浮著一盤星門圍城：打贏有星塵)"\+\(typeof gxtOpen[^?]+\?BH_GXT_AT:""\)\+\(f1\?"([^"]+)":"([^"]+)"\)/);
  assert.ok(S1, "07bh bhOffer 星門圍城那句樣板改了");
  for (const g of ["", GXT]) for (const e of [S1[2], S1[3]]) assert.ok(ok(X, S1[1] + g + e).startsWith("A Star Gate Siege floats in the star vortex"));
  const S2 = OF.match(/"(星渦裡浮著一盤下到一半的殘陣：[^"]+)"/)[1], S3 = OF.match(/\(f1\?"(墨色星渦的中心[^"]+)":"(墨色星渦的中心[^"]+)"\)/);
  assert.ok(S3, "07bh bhOffer 星樞棋局那句樣板改了");
  for (const s of [S2, S3[1], S3[2]]) ok(X, s);
  for (const s of ["雲河忽然倒流，星槎被墨色星渦牽引！", "雲河航線短暫偏入黑洞星盤；此局不計積分，也不扣分。", "星樞尚未完全甦醒，棋力會比你目前的實力低一階。", "千萬年來，星盤未曾有過此等變數……你是誰？", "星槎偏航", "⚡ 接受急襲", "🌀 接受棋局", "先回航線", "入局", "不計積分、不扣分。可以用＋／－或兩指縮放：拉遠看整盤，放大到最近就站在棋盤上。"]) { assert.ok(BH.includes(s), "07bh 改了：" + s); ok(X, s) }
  const TX = [...BH.slice(BH.indexOf("BH_TXT={"), BH.indexOf("const BH_FACE")).matchAll(/:\["([^"]+)","([^"]+)"\]/g)];
  assert.ok(TX.length >= 9, "BH_TXT 台詞");
  for (const [, , q] of TX) for (const w of ["齊轍", "田飛燕", "雷借花", "駱躍梅", "沈方庭", "鐵連城", "步越溪"]) assert.match(ok(X, w + "：「" + q + "」"), /^[A-Z][a-z]+ [A-Z][a-z]+: "/);
  assert.equal(ok(X, "✦ 星樞：「這一步……星盤上，早已落過千萬遍。」"), "✦ Star Pivot: \"This move... has been played on the star board ten million times already.\"");
});

test("第 7 批 P2-5：我的角色——七星的「朝代・出生年・幾歲上船」（pat，各朝代、公元前後）、金印 N／13、官階、書齋可點物件（各朝顯示名）", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), C = M("m/06-cpu.js"), L = M("m/07-legend.js"), Z = M("m/07z4-studymap.js");
  assert.ok(L.includes("return`${c.era}・${y} 年生${a?\"・\"+a+\"上船\":\"\"}`}"), "07-legend wxBornLine 樣板改了");
  const W = lit(C, "WX_CHARS");
  for (const id in W) { const c = W[id]; if (!c.born) continue; const y = (c.born.match(/（([^）]+)）/) || [])[1] || c.born, a = ((c.up || "").match(/([一二三四五六七八九十]+歲)$/) || [])[1] || "";
    assert.match(ok(X, `${c.era}・${y} 年生${a ? "・" + a + "上船" : ""}`), /· born \d+( BC)? · boarded at 1\d$/) }
  assert.equal(ok(X, "秦・前 225 年生・十三歲上船"), "Qin · born 225 BC · boarded at 13");
  assert.equal(ok(X, "清・1753 年生・十二歲上船"), "Qing · born 1753 · boarded at 12");
  for (const e of ["秦", "漢", "三國", "魏晉", "南北朝", "隋", "唐", "五代", "宋", "北宋", "南宋", "元", "明", "清"]) { ok(X, e + "・前 99 年生・十歲上船"); ok(X, e + "・1200 年生・十六歲上船"); ok(X, e + "・1200 年生") }
  assert.ok(Z.includes("lbl(\"mzSeal\",`金印 ${sealGoldN()}／13`)"), "07z4 金印標籤樣板改了");
  for (let g = 0; g <= 13; g++) assert.equal(ok(X, `金印 ${g}／13`), `Gold seals ${g}/13`);
  assert.equal(ok(X, "官階"), "Rank", "第 10 批：官階＝Rank");
  assert.equal(ok(X, "官階 新手"), "Rank Novice");
  const ER = ["", "classic", "qin", "han", "sanguo", "weijin", "nanbei", "sui", "tang", "wudai", "song", "yuan", "ming", "qing"], SC = ER.slice(2);
  const ET = (s, at) => { s = String(s || ""); const i = SC.indexOf(at); let p; do { p = s; s = s.replace(/\{\{(<?)([a-z]+):([^{}]*)\}\}/g, (m, lt, e, x) => { const f = SC.indexOf(e); return (i < 0 || f < 0 ? !lt : lt ? i < f : i >= f) ? x : "" }) } while (s !== p); return s };
  for (const s of lit(Z, "MZ_SPOTS")) if (s[5] !== "官階") ok(X, s[5]);
  for (const r of lit(Z, "MZ_RELIC")) for (const e of ER) ok(X, ET(r[2] || r[0], e));
  for (const s of lit(Z, "MZ_SCI")) for (const e of ER) ok(X, ET(s.nd || s.n, e));
  assert.equal(ok(X, "白瓷杯"), "White porcelain cup"); assert.equal(ok(X, "亮格櫃"), "Display cabinet");
});

test("第 7 批 P2-6：古戰場大標（各朝）、地圖地名（labels.json 全部）、戰役名（battles2.json 全部）、地圖上的短名（btMapName：去掉 Battle of／Siege of／Campaign、（約）＝(approx.)）", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const LF = path.join(ROOT, "xiangqi-db", "art", "eramap", "labels.json"), BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的地圖資料");
  const X = load(true), G = M("m/07g-battle.js"), EL = { qin: "秦朝", han: "漢朝", sanguo: "三國", weijin: "魏晉", nanbei: "南北朝", sui: "隋朝", tang: "唐朝", wudai: "五代", song: "宋朝", yuan: "元朝", ming: "明朝", qing: "清朝" };
  assert.ok(G.includes("<h2>⚔ ${esc(eraLabel(k))}古戰場</h2>") && G.includes("<h2>${esc(eraLabel(k))}古戰場</h2>"), "07g 大標樣板改了");
  for (const k in EL) { assert.equal(ok(X, "⚔ " + EL[k] + "古戰場"), "⚔ Ancient battlefield · " + X.i18nText(EL[k])); ok(X, EL[k] + "古戰場"); ok(X, EL[k] + "戰役地圖") }
  const LJ = JSON.parse(fs.readFileSync(LF, "utf8")), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  let nl = 0; for (const k in LJ) if (Array.isArray(LJ[k])) for (const L of LJ[k]) { ok(X, L[0]); nl++ }
  assert.ok(nl > 100, "地名有抽到");
  /* 07g 的 btMapName／btMapAria 丟進 vm，英文、翻譯器用真的字典 */
  const src = G.slice(G.indexOf("function btEn("), G.indexOf("function battleMapHTML("));
  const c = { document: { documentElement: { lang: "en" } }, i18nText: s => X.i18nText(s) }; vm.createContext(c); vm.runInContext(src + ";this.f=btMapName;this.a=btMapAria", c);
  let nb = 0;
  for (const k in BJ.eras) for (const b of BJ.eras[k]) {
    const full = ok(X, b.name), s = c.f(b); nb++;
    assert.ok(!CJK.test(s.t) && s.t.length > 1, b.name + " → " + s.t);
    if (/之戰$|之役$|之圍$/.test(b.name)) assert.ok(!/^(Battle|Siege) of /.test(s.t) && !/ Campaign$/.test(s.t), "地圖短名照中文規矩去掉：" + b.name + " → " + s.t);
    assert.equal(s.ap, b.approx ? " (approx.)" : "");
    assert.ok(full.includes(s.t), "短名是全名的一段：" + full + " / " + s.t);
    assert.equal(c.a(b, "可以打"), full + " · Ready to fight");
  }
  assert.ok(nb > 250, "戰役有抽到");
  assert.deepEqual(JSON.parse(JSON.stringify(c.f({ name: "桂陵之戰", approx: 1 }))), { t: "Guiling", ap: " (approx.)", w: 17 * .64, L: ["Guiling (approx.)"] });   /* 第 13 批起字寬係數 .64 */
  assert.equal(c.f({ name: "胡服騎射・趙滅中山" }).t, "Nomad Dress and Mounted Archery · Zhao Conquers Zhongshan");
  assert.equal(c.f({ name: "白登之圍" }).t, "Baideng"); assert.equal(c.f({ name: "寧夏之役" }).t, "Ningxia");
  ok(X, "（約）地點只能標大概"); ok(X, "旗艦戰役（先聽軍師獻策）　（約）地點只能標大概");
});

/* ===== 第 8 批（測試員 D 第 8 輪 P2-1、P2-2、P3-1、P3-3；測試員 B 第 8 輪古戰場）===== */
test("第 8 批 P2-1：我的角色視窗「？」細則（黑洞裡的數值兩句）、我的角色頁「黑洞裡的你」底下那句", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), D = M("m/07dgl-stamina.js");
  const S = D.match(/grp\("黑洞裡的數值",\["([^"]+)",\s*"([^"]+)"\]\)/); assert.ok(S, "07dgl 細則那段樣板改了");
  assert.ok(D.includes("const DGL_HUMAN=false;"), "人間體力關著（細則只有黑洞那段）；打開的話這裡要補人間體力那幾段");
  assert.equal(ok(X, "黑洞裡的數值"), "Values in the Black Hole");
  assert.match(ok(X, S[1]), /^Stamina, Spirit, Attack and Defense are this character's values in the Black Hole \(Star Gate Siege\).*Cloud River Seven Stars roster\.$/);
  assert.match(ok(X, S[2]), /^Bar length: /);
  assert.ok(D.includes("<p class=\"dgl-ks\"><span>修為越高，四項越強。</span></p>")); ok(X, "修為越高，四項越強。"); ok(X, "黑洞裡的你");
});
test("第 8 批 P2-2：設定 → 棋盤 3D 效能紀錄（目前／上次在園子、每秒幾幀、省電開關、原因、上次進場幾秒、園子沒開著）", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), C = M("m/06-cpu.js");
  for (const s of ["if(P&&P.live)return`目前：每秒 ${P.fps} 幀・省電 ${P.power?\"開\":\"關\"}${why(P.power)}${ld}`;", "if(P&&P.span)return`上次在園子：每秒 ${P.fps} 幀・省電 ${P.power?\"開\":\"關\"}${why(P.power)}${ld}`;",
    "return`目前：園子沒開著・省電 ${D&&D.on?\"開\":\"關\"}`", "`・上次進場 ${(P.revealMs/1000).toFixed(1)} 秒（圖片 ${P.readyMs==null?\"未載完\":(P.readyMs/1000).toFixed(1)+\" 秒\"}）`", "`（${P.why.join(\"、\")}）`"]) assert.ok(C.includes(s), "06-cpu pkPwNowTxt 樣板改了：" + s);
  const P3 = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "park3d.js"), "utf8");
  for (const s of ["\"手動開\"", "\"手動關\"", "\"電量低於 20%\"", "\"數據節省\"", "\"記憶體 \"+s.mem+\"GB\"", "\"處理器 \"+s.cores+\" 核\"", "\"畫面偏慢\""]) assert.ok(P3.includes(s), "park3d pwDecide 原因改了：" + s);
  const WHY = [[], ["手動開"], ["手動關"], ["電量低於 20%"], ["電量低於 20%", "處理器 4 核"], ["記憶體 2GB", "數據節省", "畫面偏慢"], ["電量低於 20%", "數據節省", "記憶體 1GB", "處理器 2 核", "畫面偏慢"]];
  const LD = ["", "・上次進場 6.2 秒（圖片 0.4 秒）", "・上次進場 12.0 秒（圖片 未載完）"];
  for (const pre of ["目前", "上次在園子"]) for (const fps of [2, 30, 60]) for (const pw of ["開", "關"]) for (const w of WHY) for (const ld of LD) {
    if (w.length && pw === "關" && w[0] !== "手動關") continue;
    const s = `${pre}：每秒 ${fps} 幀・省電 ${pw}${w.length ? "（" + w.join("、") + "）" : ""}${ld}`, e = ok(X, s);
    assert.ok(e.startsWith((pre === "目前" ? "Now" : "Last time in the garden") + ": " + fps + " fps · Power saving: " + (pw === "開" ? "On" : "Off")), s + " → " + e);
  }
  assert.equal(ok(X, "上次在園子：每秒 2 幀・省電 關・上次進場 6.2 秒（圖片 0.4 秒）"), "Last time in the garden: 2 fps · Power saving: Off · last load 6.2 s (images 0.4 s)");
  assert.equal(ok(X, "目前：每秒 30 幀・省電 開（電量低於 20%、處理器 4 核）"), "Now: 30 fps · Power saving: On (battery below 20%, 4-core processor)");
  for (const pw of ["開", "關"]) ok(X, "目前：園子沒開著・省電 " + pw);
  assert.equal(ok(X, "目前：園子沒開著・省電 關"), "Now: garden not open · Power saving: Off");
  ok(X, "目前：還沒進過園子（進園子下一會兒再回來看）");
});
test("第 8 批 P3-1：3D 走棋提示裡的按鈕名跟 3D 畫面左下那顆按鈕一樣（▦ 2D board）", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), C = M("m/06-cpu.js");
  assert.ok(C.includes("b.innerHTML='<span aria-hidden=\"true\">▦</span> 平面棋盤'"), "06-cpu 3D 左下那顆按鈕改了");
  const btn = X.i18nText("平面棋盤"); assert.equal(btn, "2D board");
  assert.ok(ok(X, "看不清楚？按下面「▦ 平面棋盤」，棋子比較大。").includes("\"▦ " + btn + "\""), "提示裡寫的按鈕名＝按鈕的譯名");
  assert.ok(ok(X, "換成平面棋盤：棋子比較大、比較好點").includes(btn), "按鈕的讀螢幕名稱也叫 2D board");
});
test("第 8 批 P3-3：雲河七星一律叫 Cloud River Seven Stars（我的角色視窗的按鈕、卡冊標題、返回鈕、小說書名），不再有 Seven Stars of (the) Cloud River；只有「七星」的照舊", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), J = JSON.parse(fs.readFileSync(EXT, "utf8")), P = M("m/07pty-party.js"), D = M("m/07dgl-stamina.js");
  assert.ok(P.includes("sheet(\"🌟 雲河七星\","), "卡冊標題"); assert.ok(D.includes("class=\"btn dgl-kme\" id=\"dglPty\">雲河七星</button>"), "我的角色視窗的按鈕");
  assert.equal(ok(X, "雲河七星"), "Cloud River Seven Stars"); assert.equal(ok(X, "🌟 雲河七星"), "🌟 Cloud River Seven Stars"); assert.equal(ok(X, "‹ 回雲河七星"), "‹ Back to Cloud River Seven Stars");
  assert.equal(ok(X, "《雲河七星》第一章"), "Cloud River Seven Stars, Chapter 1");
  for (const [k, v] of Object.entries(J.en).concat(J.pat.map(p => [p[0], p[1]]))) {
    assert.ok(!/Seven Stars of (the )?Cloud River/.test(v), k + " → " + v);
    if (k.includes("雲河七星")) assert.ok(v.includes("Cloud River Seven Stars"), k + " → " + v);
  }
});
test("第 8 批（測試員 B）古戰場地圖：直式手機每朝每卷的英文戰役名、地名都在取景框裡（太長的戰役名折行、靠邊往內收）", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const LF = path.join(ROOT, "xiangqi-db", "art", "eramap", "labels.json"), BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的地圖資料");
  const X = load(true), G = M("m/07g-battle.js"), LJ = JSON.parse(fs.readFileSync(LF, "utf8")), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  const src = G.slice(G.indexOf("function btEn("), G.indexOf("/* ---------- 古戰場頁 #/battle"));
  const c = { document: { documentElement: { lang: "en" } }, i18nText: s => X.i18nText(s), battleOpen: () => true, store: { get: (k, d) => d, set() {} }, matchMedia: () => ({ matches: true }), innerWidth: 390,
    esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])), eraLabel: k => k };
  vm.createContext(c); vm.runInContext(src + ";this.H=battleMapHTML;this.W=btWrap", c);
  assert.deepEqual(JSON.parse(JSON.stringify(c.W("Nomad Dress and Mounted Archery · Zhao Conquers Zhongshan (approx.)", 18))), ["Nomad Dress and", "Mounted Archery ·", "Zhao Conquers", "Zhongshan (approx.)"]);
  const num = s => +s, un = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  let nb = 0, nl = 0;
  for (const k in BJ.eras) {
    const all = BJ.eras[k], vols = [...new Set(all.map(b => b.vol || 1))];
    for (const A of [390 / 560, 390 / 700]) for (const vo of vols) {
      const idx = all.map((b, j) => j).filter(j => (all[j].vol || 1) === vo), cards = idx.map(j => all[j]);
      const html = c.H(k, cards, {}, null, LJ, { A, bare: 1, px: 390, k: 1.3, idx, sk: k + "/" + vo });
      const vb = html.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(num), [vx, , w] = vb, eps = w * .01;
      for (const m of html.matchAll(/transform="translate\(([-\d.]+) ([-\d.]+)\)"(?:(?!<\/g>).)*?<text x="([-\d.]+)" y="[-\d.]+" font-size="([\d.]+)"[^>]*text-anchor="(\w+)" class="bt-mn[^"]*">(.*?)<\/text><\/g>/g)) {
        const [, X0, , tx, fz, anc, body] = m, lines = body.includes("<tspan") ? [...body.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(z => un(z[1])) : [un(body)];
        const wd = Math.max(...lines.map(s => s.replace("⭐", "").length * .56 + (s.includes("⭐") ? 1 : 0))) * num(fz), x = num(X0) + num(tx);
        const L = anc === "start" ? x : anc === "end" ? x - wd : x - wd / 2;
        assert.ok(!CJK.test(body), k + " 戰役名沒翻：" + body);
        assert.ok(L >= vx - eps && L + wd <= vx + w + eps, `${k} 卷${vo} A=${A.toFixed(2)}：「${lines.join(" / ")}」超出取景框（${L.toFixed(1)}～${(L + wd).toFixed(1)}，框 ${vx.toFixed(1)}～${(vx + w).toFixed(1)}）`); nb++;
      }
      for (const m of html.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="([\d.]+)"[^>]*text-anchor="middle" dominant-baseline="middle" class="bt-ml[^"]*">(.*?)<\/text>/g)) {
        const s = un(m[3]), wd = s.length * .56 * num(m[2]), x = num(m[1]);
        assert.ok(x - wd / 2 >= vx - eps && x + wd / 2 <= vx + w + eps, `${k} 卷${vo}：地名「${s}」超出取景框`); nl++;
      }
    }
  }
  assert.ok(nb > 250 && nl > 50, "有檢查到戰役名 " + nb + "、地名 " + nl);
});

/* ===== 第 9 批（測試員 D／B 第 9 輪）===== */
test("第 9 批 P2-2：3D 效能紀錄的幀數、秒數、記憶體有小數也翻得出（park3d perf fps＝四捨五入到 0.1）；#pkPwNow 是單一文字節點", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), C = M("m/06-cpu.js"), P3 = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "park3d.js"), "utf8");
  assert.ok(P3.includes("fps:Math.round(r/n*10)/10"), "park3d 幀數的寫法改了");
  assert.ok(C.includes("<p class=\"muted\" id=\"pkPwNow\" style=\"font-size:12.5px;margin:0 2px\">${esc(pkPwNowTxt())}</p>") && C.includes("p.textContent=pkPwNowTxt()"), "#pkPwNow 整句一個文字節點");
  assert.equal(ok(X, "上次在園子：每秒 2.9 幀・省電 關・上次進場 8.7 秒（圖片 5.4 秒）"), "Last time in the garden: 2.9 fps · Power saving: Off · last load 8.7 s (images 5.4 s)");
  for (const pre of ["目前", "上次在園子"]) for (const fps of ["0", "2.9", "30", "59.8"]) for (const w of ["", "（記憶體 0.5GB、處理器 2 核）", "（手動開）", "（電量低於 20%、數據節省、畫面偏慢）"]) for (const ld of ["", "・上次進場 8.7 秒（圖片 5.4 秒）", "・上次進場 10.0 秒（圖片 未載完）"]) {
    const s = `${pre}：每秒 ${fps} 幀・省電 ${w ? "開" : "關"}${w}${ld}`; assert.ok(ok(X, s).includes(fps + " fps"), s);
  }
  assert.equal(ok(X, "記憶體 0.5GB"), "0.5 GB memory");
});
test("N9-1 古戰場（星槎還沒停靠）：「船艙沒有古戰場。…擂台旁邊就有「⚔ 古戰場」。」整句翻（台／臺兩種寫法），不再半中半英", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), G = M("m/07g-battle.js"), S = "船艙沒有古戰場。搭星槎到各朝代的渡口，擂台旁邊就有「⚔ 古戰場」。";
  assert.ok(G.includes("<div class=\"card muted\">" + S + "</div>"), "07g 那張卡的字改了");
  const E = "There's no ancient battlefield aboard. Sail the Star Raft to a dynasty's ferry; you'll find \"⚔ Ancient battlefield\" next to the arena.";
  assert.equal(ok(X, S), E); assert.equal(ok(X, S.replace("擂台", "擂臺")), E);
});
test("第 9 批 古戰場滿版地圖：英文時地名、戰役名不放進上緣被頁名條和「卷」分頁蓋住的那一條（約 104px）；左右也還在框裡", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const LF = path.join(ROOT, "xiangqi-db", "art", "eramap", "labels.json"), BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的地圖資料");
  const X = load(true), G = M("m/07g-battle.js"), LJ = JSON.parse(fs.readFileSync(LF, "utf8")), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  const src = G.slice(G.indexOf("function btEn("), G.indexOf("/* 11/17 測試員 D 第 9 輪 P3-1"));
  const c = { document: { documentElement: { lang: "en" } }, i18nText: s => X.i18nText(s), battleOpen: () => true, store: { get: (k, d) => d, set() {} }, matchMedia: () => ({ matches: true }), innerWidth: 375,
    esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])), eraLabel: k => k };
  vm.createContext(c); vm.runInContext(src + ";this.H=battleMapHTML", c);
  let n = 0;
  for (const k in BJ.eras) { const all = BJ.eras[k]; for (const vo of [...new Set(all.map(b => b.vol || 1))]) {
    const A = 375 / 600, idx = all.map((b, j) => j).filter(j => (all[j].vol || 1) === vo), html = c.H(k, idx.map(j => all[j]), {}, null, LJ, { A, bare: 1, px: 375, k: 1.3, idx, sk: k + "/" + vo });
    const [vx, vy, w, h] = html.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number), TOP = vy + Math.min(h * .3, 104 * h * A / 375), eps = h * .01;
    for (const m of html.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*class="bt-ml[^"]*">(.*?)<\/text>/g)) { assert.ok(+m[2] >= TOP - eps, `${k} 卷${vo} 地名「${m[4]}」在上緣那條裡`); n++ }
    for (const m of html.matchAll(/transform="translate\(([-\d.]+) ([-\d.]+)\)"(?:(?!<\/g>).)*?<text x="[-\d.]+" y="([-\d.]+)" font-size="([\d.]+)"[^>]*class="bt-mn[^"]*">(.*?)<\/text><\/g>/g)) { assert.ok(+m[2] + +m[3] - +m[4] >= TOP - eps, `${k} 卷${vo} 戰役名「${m[5]}」在上緣那條裡`); n++ }
  } }
  assert.ok(n > 300, "檢查了 " + n + " 個");
});

/* ===== 第 10 批（測試員 B 第 10 輪 N10-3／N10-4、開發者選單官階＝Rank）===== */
test("第 10 批 N10-3 古戰場戰役清單：「N・戰役名（⭐）」、年代各種寫法、「年代・狀態」、卷的開放條件、卷標頭——每朝每卷整組翻得出", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json"); if (!fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的戰役資料");
  const X = load(true), G = M("m/07g-battle.js"), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  for (const s of ["<b>${i+1}・${esc(c.name)}${c.flag?\" ⭐\":\"\"}</b><small>${esc(c.year)}・${s?(s.h?\"⚐ 用過提示\":\"🚩 已攻下\"):o?\"⚔ 可以打\":\"🔒 還沒開\"}</small>",
    "卷${BTL_VN[vo]||vo}・${battleVolSeals(k,vo,S)}／${cards.filter(z=>(z.vol||1)===vo).length}${o?\"\":\"　🔒 \"+esc(battleLockTxt(k,i))}",
    "return`卷${BTL_VN[q.pv]||q.pv}先打下 ${q.need} 場，卷${BTL_VN[vo]||vo}才會開`", "<b>${i+1}・${esc(c.name)}${c.flag?'<em class=\"bt-flag\">⭐ 旗艦戰役</em>':\"\"}</b>"]) assert.ok(G.includes(s), "07g 清單樣板改了：" + s);
  const VN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  let n = 0;
  for (const k in BJ.eras) BJ.eras[k].forEach((c, i) => {
    assert.match(ok(X, (i + 1) + "・" + c.name + (c.flag ? " ⭐" : "")), /^\d+ · [A-Z]/);
    ok(X, (i + 1) + "・" + c.name); ok(X, c.year);
    for (const st of ["🚩 已攻下", "⚐ 用過提示", "⚔ 可以打", "🔒 還沒開"]) assert.ok(ok(X, c.year + "・" + st).includes(" · "), c.year); n++ });
  assert.ok(n > 290);
  assert.equal(ok(X, "4・胡服騎射・趙滅中山"), "4 · Nomad Dress and Mounted Archery · Zhao Conquers Zhongshan");
  assert.equal(ok(X, "前 307–前 296 年"), "307–296 BCE"); assert.equal(ok(X, "約前 250 年代（趙孝成王時）"), "c. 250s BCE (reign of King Xiaocheng of Zhao)");
  for (let v = 2; v <= 5; v++) for (const need of [1, 3, 5]) {
    const L = `卷${VN[v - 1]}先打下 ${need} 場，卷${VN[v]}才會開`;
    assert.equal(ok(X, L), `Capture ${need} in Vol. ${v - 1} to open Vol. ${v}`); ok(X, "🔒 " + L);
    assert.equal(ok(X, `卷${VN[v]}・0／5　🔒 ${L}`), `Vol. ${v} · 0/5   🔒 Capture ${need} in Vol. ${v - 1} to open Vol. ${v}`);
  }
});
test("第 10 批 N10-4 古戰場英文戰役名：直式、橫式每朝每卷，標籤互相不重疊（估計的字框）", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const LF = path.join(ROOT, "xiangqi-db", "art", "eramap", "labels.json"), BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的地圖資料");
  const X = load(true), G = M("m/07g-battle.js"), LJ = JSON.parse(fs.readFileSync(LF, "utf8")), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  const src = G.slice(G.indexOf("function btEn("), G.indexOf("/* 11/17 測試員 D 第 9 輪 P3-1"));
  const c = { document: { documentElement: { lang: "en" } }, i18nText: s => X.i18nText(s), battleOpen: () => true, store: { get: (k, d) => d, set() {} }, matchMedia: () => ({ matches: true }), innerWidth: 390,
    esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])), eraLabel: k => k };
  vm.createContext(c); vm.runInContext(src + ";this.H=battleMapHTML", c);
  const un = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  let bad = [], n = 0;
  for (const k in BJ.eras) { const all = BJ.eras[k]; for (const vo of [...new Set(all.map(b => b.vol || 1))]) for (const [A, px] of [[390 / 600, 390], [490 / 334, 490]]) {
    const idx = all.map((b, j) => j).filter(j => (all[j].vol || 1) === vo), html = c.H(k, idx.map(j => all[j]), {}, null, LJ, { A, bare: 1, px, top: 108, k: px < 600 ? 1.3 : 1.1, idx, sk: k });
    const B = [];
    for (const m of html.matchAll(/transform="translate\(([-\d.]+) ([-\d.]+)\)"(?:(?!<\/g>).)*?<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*text-anchor="(\w+)" class="bt-mn[^"]*">(.*?)<\/text><\/g>/g)) {
      const [, X0, Y0, tx, ty, fz, anc, body] = m, L = body.includes("<tspan") ? [...body.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(z => un(z[1])) : [un(body)];
      const wd = Math.max(...L.map(s => s.replace("⭐", "").length * .56 + (s.includes("⭐") ? 1 : 0))) * +fz, x = +X0 + +tx, y = +Y0 + +ty, l = anc === "start" ? x : anc === "end" ? x - wd : x - wd / 2;
      B.push({ t: L.join(" "), b: [l, y - +fz * .8, l + wd, y + (L.length - 1) * +fz * 1.1 + +fz * .2] }); n++ }
    for (let a = 0; a < B.length; a++) for (let b = a + 1; b < B.length; b++) { const p = B[a].b, q = B[b].b, sh = Math.min(p[2], q[2]) - Math.max(p[0], q[0]), sv = Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
      if (sh > (p[2] - p[0]) * .08 && sv > (p[3] - p[1]) * .15) bad.push(`${k} 卷${vo} A=${A.toFixed(2)}：「${B[a].t}」×「${B[b].t}」`) }
  } }
  assert.ok(n > 500, "檢查了 " + n);
  assert.deepEqual(bad, [], "重疊的標籤");
});
test("第 10 批 C-7 官階＝Rank：說明句、讀螢幕名稱「官階 X」", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), CX = M("m/07i-codex.js");
  assert.ok(CX.includes("nm:\"官階\",lv:1,say:\"挑戰電腦的積分越高，官階越高（九品升到一品）；官名跟著朝代換。\""), "07i-codex 官階那一格改了");
  assert.equal(ok(X, "官階"), "Rank"); assert.equal(ok(X, "官階 新手"), "Rank Novice"); assert.equal(ok(X, "🏛 官階"), "🏛 Rank");
  assert.ok(ok(X, "挑戰電腦的積分越高，官階越高（九品升到一品）；官名跟著朝代換。").includes("rank"));
  assert.ok(ok(X, "修為、官階是等級，不算進去；寶物、棋盤、棋譜這些沒有上限的只寫已收。").startsWith("XP and rank"));
  for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(EXT, "utf8")).en)) if (k.includes("官階")) assert.ok(!/[Oo]fficial rank/.test(v), k + " → " + v);
});

/* ===== 第 12 批（測試員 B N12-2、測試員 D 第 12 輪）：古戰場四種手機尺寸 × 中英文 ===== */
test("第 12 批 古戰場：直式 375×812、390×844，橫式 812×375、844×390，中英文——標籤（地名＋戰役名）不重疊、戰役點完整在看得到的範圍（不在頁名條／卷分頁、清單鈕底下）、清單鈕在畫面內、字級跟直式差不多", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const LF = path.join(ROOT, "xiangqi-db", "art", "eramap", "labels.json"), BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的地圖資料");
  const X = load(true), G = M("m/07g-battle.js"), LJ = JSON.parse(fs.readFileSync(LF, "utf8")), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  const src = G.slice(G.indexOf("function btEn("), G.indexOf("/* 11/17 測試員 D 第 9 輪 P3-1"));
  const mk = lang => { const c = { document: { documentElement: { lang } }, i18nText: s => lang === "en" ? X.i18nText(s) : null, battleOpen: () => true, store: { get: (k, d) => d, set() {} }, matchMedia: () => ({ matches: true }), innerWidth: 390,
    esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])), eraLabel: k => k }; vm.createContext(c); vm.runInContext(src + ";this.H=battleMapHTML", c); return c.H };
  const un = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const cw = s => [...s].reduce((a, ch) => a + (/[㐀-鿿豈-﫿⭐（）・]/.test(ch) ? 1 : .56), 0);   /* 估計字寬（中文、全形＝1 個字級，英文約 0.56） */
  /* fit 的高度：畫面高－頂欄（約 59px）－寬螢幕的 12px，最少 200；頁名條＋卷分頁蓋住上面約 116px；清單鈕（底下 16px、高 46px）蓋住下面 68px */
  const VP = [[375, 812, 375, 0], [390, 844, 390, 0], [812, 375, 812, 0], [844, 390, 490, 1], [844, 390, 829, 1]];
  assert.ok(G.includes("W.style.height=Math.max(200,Math.round(vh-r.top-(wide()?12:0)))+\"px\";"), "fit 的高度算法改了，這裡的模擬要跟著改");
  const bad = []; let n = 0, nl = 0;
  for (const lang of ["zh-Hant", "en"]) { const H = mk(lang);
    for (const [vw, vh, px, wide] of VP) {
      const Hh = Math.max(200, vh - 59 - (wide ? 12 : 0)); assert.ok(59 + Hh <= vh, `${vw}×${vh}：地圖高度超出畫面`);
      assert.ok(Hh - 16 - 46 >= 0, `${vw}×${vh}：清單鈕在畫面內`);
      const A = px / Hh, k = px < 600 ? 1.3 : 1.1, TOP = 116, BOT = 68;
      for (const era in BJ.eras) { const all = BJ.eras[era]; for (const vo of [...new Set(all.map(b => b.vol || 1))]) {
        const idx = all.map((b, j) => j).filter(j => (all[j].vol || 1) === vo), html = H(era, idx.map(j => all[j]), {}, null, LJ, { A, bare: 1, px, top: TOP, bot: BOT, k, idx, sk: era });
        const [vx, vy, w, h] = html.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number), s = px / w, B = [], tag = `${lang} ${vw}×${vh} ${era} 卷${vo}`;
        for (const m of html.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*class="bt-ml[^"]*">(.*?)<\/text>/g)) { const t = un(m[4]), fz = +m[3], hw = cw(t) * fz / 2; B.push({ t, b: [+m[1] - hw, +m[2] - fz * .55, +m[1] + hw, +m[2] + fz * .55] }); nl++ }
        for (const m of html.matchAll(/class="bt-mk[^"]*"[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\)"(?:(?!<\/g>).)*?<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*text-anchor="(\w+)" class="bt-mn[^"]*">(.*?)<\/text><\/g>/g)) {
          const [, X0, Y0, tx, ty, fz0, anc, body] = m, fz = +fz0, L = body.includes("<tspan") ? [...body.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(z => un(z[1])) : [un(body)];
          const wd = Math.max(...L.map(cw)) * fz, x = +X0 + +tx, y = +Y0 + +ty, l = anc === "start" ? x : anc === "end" ? x - wd : x - wd / 2;
          B.push({ t: L.join(" "), b: [l, y - fz * .75, l + wd, y + (L.length - 1) * fz * 1.1 + fz * .2] });
          assert.ok(fz * s <= 15.5, `${tag}：戰役名字級 ${(fz * s).toFixed(1)}px 太大（直式約 12～13px）`);
          const cx = +X0, cy = +Y0, R = w * .021 * Math.min(k, 560 / px) * 1.3;
          if (!(cx - R >= vx - .01 && cx + R <= vx + w + .01 && cy - R >= vy + TOP / s - .5 && cy + R <= vy + h - BOT / s + .5)) bad.push(`${tag}：戰役點「${L.join(" ")}」被切到或在頁名條／清單鈕底下`);
          n++ }
        for (let a = 0; a < B.length; a++) for (let b = a + 1; b < B.length; b++) { const p = B[a].b, q = B[b].b, ox = Math.min(p[2], q[2]) - Math.max(p[0], q[0]), oy = Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
          if (ox * s > 3 && oy * s > 3) bad.push(`${tag}：「${B[a].t}」×「${B[b].t}」重疊 ${(ox * s).toFixed(0)}×${(oy * s).toFixed(0)}px`) }
      } }
    } }
  assert.ok(n > 2000 && nl > 1000, `檢查了戰役 ${n}、地名 ${nl}`);
  assert.deepEqual(bad, [], bad.length + " 個問題");
});

/* ===== 第 13 批（測試員 B N13-1、測試員 D 第 13 輪）：保守的估算字框（英文字寬 .64、中文 1.05、行高 1.25）＋每個戰役點的外圈含光暈（含自己那個）＋上緣分頁、底部清單鈕 ===== */
test("第 13 批 古戰場（保守估算）：直式 375×812、390×844，橫式 812×375、844×390，中英文——標籤不壓任何戰役點的外圈（含自己）、不壓別的標籤、不進分頁列和清單鈕；秦卷一的桂陵／伊闕、第 4 場四行標籤特別點名", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const LF = path.join(ROOT, "xiangqi-db", "art", "eramap", "labels.json"), BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的地圖資料");
  const X = load(true), G = M("m/07g-battle.js"), LJ = JSON.parse(fs.readFileSync(LF, "utf8")), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  const src = G.slice(G.indexOf("function btEn("), G.indexOf("/* 11/17 測試員 D 第 9 輪 P3-1"));
  const mk = lang => { const c = { document: { documentElement: { lang } }, i18nText: s => lang === "en" ? X.i18nText(s) : null, battleOpen: (k, i, S) => i === 0 || !!S[i - 1] || !!S[i], store: { get: (k, d) => d, set() {} }, matchMedia: () => ({ matches: true }), innerWidth: 390,
    esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])), eraLabel: k => k }; vm.createContext(c); vm.runInContext(src + ";this.H=battleMapHTML", c); return c.H };
  const un = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const cw = s => [...s].reduce((a, ch) => a + (/[㐀-鿿豈-﫿⭐（）・]/.test(ch) ? 1.05 : .64), 0);
  const VP = [[375, 812, 375, 0], [390, 844, 390, 0], [812, 375, 812, 0], [844, 390, 490, 1], [844, 390, 829, 1]], bad = [], seen = { gl: 0, yq: 0, n4: 0 };
  for (const lang of ["zh-Hant", "en"]) { const H = mk(lang);
    for (const [vw, vh, px, wide] of VP) for (const SS of ["fresh", "done"]) {
      const Hh = Math.max(200, vh - 59 - (wide ? 12 : 0)), A = px / Hh, k = px < 600 ? 1.3 : 1.1, TOP = 116, BOT = 68;
      for (const era in BJ.eras) { const all = BJ.eras[era]; for (const vo of [...new Set(all.map(b => b.vol || 1))]) {
        const idx = all.map((b, j) => j).filter(j => (all[j].vol || 1) === vo), cs = idx.map(j => all[j]), S0 = SS === "done" ? Object.fromEntries(idx.map(j => [j, {}])) : {}, html = H(era, cs, S0, null, LJ, { A, bare: 1, px, top: TOP, bot: BOT, k, idx, sk: era });
        const [vx, vy, w, h] = html.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number), s = px / w, r = w * .021 * Math.min(k, 560 / px), tag = `${lang} ${SS} ${vw}×${vh}${wide && px < 600 ? "(抽屜開)" : ""} ${era} 卷${vo}`;
        const top = vy + TOP / s, bot = vy + h - BOT / s, B = [], MKS = [];
        for (const m of html.matchAll(/<g class="bt-mk([^"]*)"[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\)"/g)) { const fl = / flag/.test(m[1]), rr = fl ? r * 1.3 : r, R = Math.max(/ seal/.test(m[1]) ? rr * 1.9 : / next/.test(m[1]) ? rr * 2.6 : rr * .9, fl ? rr * 2.15 : 0); MKS.push([+m[2] - R, +m[3] - R, +m[2] + R, +m[3] + R]) }
        for (const m of html.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*class="bt-ml[^"]*">(.*?)<\/text>/g)) { const t2 = un(m[4]), fz = +m[3], hw = cw(t2) * fz / 2; B.push({ t: t2, b: [+m[1] - hw, +m[2] - fz * .6, +m[1] + hw, +m[2] + fz * .6] }) }
        for (const m of html.matchAll(/class="bt-mk[^"]*"[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\)"(?:(?!<\/g>).)*?<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*text-anchor="(\w+)" class="bt-mn[^"]*">(.*?)<\/text><\/g>/g)) {
          const [, X0, Y0, tx, ty, fz0, anc, body] = m, fz = +fz0, L = body.includes("<tspan") ? [...body.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(z => un(z[1])) : [un(body)];
          const wd = Math.max(...L.map(cw)) * fz, x = +X0 + +tx, y = +Y0 + +ty, l = anc === "start" ? x : anc === "end" ? x - wd : x - wd / 2;
          B.push({ t: L.join(" "), b: [l, y - fz * .8, l + wd, y + (L.length - 1) * fz * 1.25 + fz * .25] }) }
        for (const x of B) {
          if (/^(伊闕|Yique)$/.test(x.t) && era === "qin" && vo === 1) seen.yq++; if (/桂陵|Guiling/.test(x.t)) seen.gl++; if (/胡服騎射|Nomad Dress/.test(x.t)) seen.n4++;
          for (const o of MKS) { const ox = Math.min(x.b[2], o[2]) - Math.max(x.b[0], o[0]), oy = Math.min(x.b[3], o[3]) - Math.max(x.b[1], o[1]); if (ox * s > 1 && oy * s > 1) bad.push(`${tag}：「${x.t}」壓到戰役點的外圈 ${(ox * s).toFixed(0)}×${(oy * s).toFixed(0)}px`) }
          if (x.b[1] < top - 1 / s || x.b[3] > bot + 1 / s) bad.push(`${tag}：「${x.t}」進到分頁列或清單鈕那一條`) }
        for (let a = 0; a < B.length; a++) for (let b = a + 1; b < B.length; b++) { const p = B[a].b, q = B[b].b, ox = Math.min(p[2], q[2]) - Math.max(p[0], q[0]), oy = Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
          if (ox * s > 1 && oy * s > 1) bad.push(`${tag}：「${B[a].t}」×「${B[b].t}」重疊 ${(ox * s).toFixed(0)}×${(oy * s).toFixed(0)}px`) }
      } }
    } }
  assert.ok(seen.gl > 0 && seen.n4 > 0, "桂陵、第 4 場都有檢查到");
  assert.deepEqual(bad, [], bad.length + " 個問題");
});

/* ===== 第 14 批（測試員 B N14-1、測試員 D 第 14 輪）：每個戰役名明確屬於自己的點 ===== */
test("第 14 批 古戰場：秦卷一、漢卷一、隋卷二（加上每朝每卷）直式兩種、橫式兩種尺寸，中英文——戰役名中心離自己的點比離別的點都近、離自己的點不超過 2.5 個字高；做不到的有細引線連回自己的點", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const LF = path.join(ROOT, "xiangqi-db", "art", "eramap", "labels.json"), BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的地圖資料");
  const X = load(true), G = M("m/07g-battle.js"), LJ = JSON.parse(fs.readFileSync(LF, "utf8")), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  const src = G.slice(G.indexOf("function btEn("), G.indexOf("/* 11/17 測試員 D 第 9 輪 P3-1"));
  const mk = lang => { const c = { document: { documentElement: { lang } }, i18nText: s => lang === "en" ? X.i18nText(s) : null, battleOpen: (k, i, S) => i === 0 || !!S[i - 1] || !!S[i], store: { get: (k, d) => d, set() {} }, matchMedia: () => ({ matches: true }), innerWidth: 390,
    esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])), eraLabel: k => k }; vm.createContext(c); vm.runInContext(src + ";this.H=battleMapHTML", c); return c.H };
  const un = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const cw = s => [...s].reduce((a, ch) => a + (/[㐀-鿿豈-﫿⭐（）・]/.test(ch) ? 1.05 : .64), 0);
  const VP = [[375, 812, 375, 0], [390, 844, 390, 0], [812, 375, 812, 0], [844, 390, 490, 1], [844, 390, 829, 1]], bad = [], NAMED = { "qin/1": 0, "han/1": 0, "sui/2": 0 }; let nLd = 0, n = 0;
  for (const lang of ["zh-Hant", "en"]) { const H = mk(lang);
    for (const [vw, vh, px, wide] of VP) for (const SS of ["fresh", "done"]) {
      const Hh = Math.max(200, vh - 59 - (wide ? 12 : 0)), A = px / Hh, k = px < 600 ? 1.3 : 1.1;
      for (const era in BJ.eras) { const all = BJ.eras[era]; for (const vo of [...new Set(all.map(b => b.vol || 1))]) {
        const idx = all.map((b, j) => j).filter(j => (all[j].vol || 1) === vo), S0 = SS === "done" ? Object.fromEntries(idx.map(j => [j, {}])) : {};
        const html = H(era, idx.map(j => all[j]), S0, null, LJ, { A, bare: 1, px, top: 116, bot: 68, k, idx, sk: era }), w = +html.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+)/)[1], fz0 = w * .024 * Math.min(k, 560 / px) * 1.05, r = w * .021 * Math.min(k, 560 / px);
        if ((era + "/" + vo) in NAMED) NAMED[era + "/" + vo]++;
        const P = [...html.matchAll(/<g class="bt-mk([^"]*)"[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\)"(?:(?!<\/g>).)*?(<path class="bt-ld" d="M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)"[^>]*>)?<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*text-anchor="(\w+)" class="bt-mn[^"]*">(.*?)<\/text><\/g>/g)];
        for (const [i, m] of P.entries()) {
          const fl = / flag/.test(m[1]), rr = fl ? r * 1.3 : r, VR = Math.max(/ seal/.test(m[1]) ? rr * 1.9 : / next/.test(m[1]) ? rr * 2.6 : rr * .9, fl ? rr * 2.15 : 0);
          const X0 = +m[2], Y0 = +m[3], fz = +m[11], anc = m[12], L = m[13].includes("<tspan") ? [...m[13].matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(z => un(z[1])) : [un(m[13])];
          const wd = Math.max(...L.map(cw)) * fz, x = X0 + +m[9], y = Y0 + +m[10], l = anc === "start" ? x : anc === "end" ? x - wd : x - wd / 2, b = [l, y - fz * .8, l + wd, y + (L.length - 1) * fz * 1.25 + fz * .25];
          const tag = `${lang} ${SS} ${vw}×${vh}${wide && px < 600 ? "(抽屜開)" : ""} ${era} 卷${vo}「${L.join(" ")}」`; n++;
          if (m[4]) { nLd++; assert.ok(Math.abs(Math.hypot(+m[5], +m[6]) - VR) < .05, tag + "：引線從自己的點的外圈出發"); const ex = X0 + +m[7], ey = Y0 + +m[8];
            assert.ok(ex >= b[0] - .2 && ex <= b[2] + .2 && ey >= b[1] - fz && ey <= b[3] + fz, tag + "：引線接到自己的字"); continue }
          const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, dOwn = Math.hypot(cx - X0, cy - Y0);
          for (const [j, q] of P.entries()) if (j !== i && Math.hypot(cx - +q[2], cy - +q[3]) <= dOwn) bad.push(`${tag}：字的中心離第 ${j + 1} 個點比離自己的點近`);
          const dist = Math.hypot(Math.max(b[0] - X0, 0, X0 - b[2]), Math.max(b[1] - Y0, 0, Y0 - b[3]));
          if (dist > VR + fz0 * 2.5 + .05) bad.push(`${tag}：離自己的點 ${(dist - VR).toFixed(1)}，超過 2.5 個字高（${(fz0 * 2.5).toFixed(1)}）`);
        }
      } }
    } }
  assert.ok(Object.values(NAMED).every(v => v >= 20), "秦卷一、漢卷一、隋卷二都在每種尺寸、中英文、兩種進度下檢查到");
  assert.ok(n > 3000, "檢查了 " + n + " 個戰役名（其中引線 " + nLd + " 個）");
  assert.deepEqual(bad, [], bad.length + " 個問題");
});

/* ===== 第 15 批（開發者選單「橫式只標編號」、測試員 D 排版穩定、測試員 B N15-1） ===== */
test("第 15 批 古戰場橫式（812×375、844×390 抽屜開／沒開）每朝每卷、中英文：不輸出戰役名、引線，只有編號（字至少 11px）；點與編號不進分頁列、清單鈕；地名不壓點、不互壓；同一卷排兩次一樣", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const LF = path.join(ROOT, "xiangqi-db", "art", "eramap", "labels.json"), BF = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有 xiangqi-db/art 的地圖資料");
  const X = load(true), G = M("m/07g-battle.js"), LJ = JSON.parse(fs.readFileSync(LF, "utf8")), BJ = JSON.parse(fs.readFileSync(BF, "utf8"));
  const src = G.slice(G.indexOf("function btEn("), G.indexOf("/* 11/17 測試員 D 第 9 輪 P3-1"));
  const mk = lang => { const c = { document: { documentElement: { lang } }, i18nText: s => lang === "en" ? X.i18nText(s) : null, battleOpen: (k, i, S) => i === 0 || !!S[i - 1] || !!S[i], store: { get: (k, d) => d, set() {} }, matchMedia: () => ({ matches: true }), innerWidth: 812,
    esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])), eraLabel: k => k }; vm.createContext(c); vm.runInContext(src + ";this.H=battleMapHTML", c); return c.H };
  const cw = s => [...s].reduce((a, ch) => a + (/[㐀-鿿豈-﫿⭐（）・]/.test(ch) ? 1.05 : .64), 0), un = s => s.replace(/&amp;/g, "&");
  const bad = []; let n = 0;
  for (const lang of ["zh-Hant", "en"]) { const H = mk(lang);
    for (const [vw, vh, px, wide] of [[812, 375, 812, 0], [844, 390, 490, 1], [844, 390, 829, 1]]) for (const SS of ["fresh", "done"]) {
      const Hh = Math.max(200, vh - 59 - (wide ? 12 : 0)), A = px / Hh;
      for (const era in BJ.eras) { const all = BJ.eras[era]; for (const vo of [...new Set(all.map(b => b.vol || 1))]) {
        const idx = all.map((b, j) => j).filter(j => (all[j].vol || 1) === vo), S0 = SS === "done" ? Object.fromEntries(idx.map(j => [j, {}])) : {}, op = { A, bare: 1, px, land: true, top: 116, bot: 68, k: 1.1, idx, sk: era };
        const html = H(era, idx.map(j => all[j]), S0, null, LJ, op), tag = `${lang} ${SS} ${vw}×${vh} ${era} 卷${vo}`; n++;
        if (html !== H(era, idx.map(j => all[j]), S0, null, LJ, Object.assign({}, op, { top: 113, bot: 70 }))) bad.push(tag + "：量到的高度差幾 px 就排得不一樣");
        if (/class="bt-mn|class="bt-ld/.test(html)) bad.push(tag + "：橫式還有戰役名或引線");
        const [vx, vy, w, h] = html.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number), s = px / w, r = w * .021 * Math.min(1.1, 560 / px), top = vy + 120 / s, bot = vy + h - 72 / s, MK = [];
        const G2 = [...html.matchAll(/<g class="bt-mk([^"]*)"[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\)"[^>]*aria-label="([^"]+)">(.*?)<\/g>/g)];
        if (G2.length !== idx.length) bad.push(tag + "：戰役點數目不對");
        for (const g of G2) { const fl = / flag/.test(g[1]), rr = fl ? r * 1.3 : r, R = Math.max(/ seal/.test(g[1]) ? rr * 1.9 : / next/.test(g[1]) ? rr * 2.6 : rr * .9, fl ? rr * 2.15 : 0), x = +g[2], y = +g[3];
          MK.push([x - R, y - R, x + R, y + R]);
          if (y - R < top - .5 / s || y + R > bot + .5 / s || x - R < vx - .01 || x + R > vx + w + .01) bad.push(`${tag}：第 ${g[4]} 的點進到分頁列／清單鈕或出框`);
          const nm = g[5].match(/<text y="[-\d.]+" font-size="([\d.]+)"[^>]*class="bt-mt">(\d+)<\/text>/); if (!nm) bad.push(`${tag}：「${g[4]}」沒有編號`); else if (+nm[1] * s < 11) bad.push(`${tag}：編號只有 ${(+nm[1] * s).toFixed(1)}px`);
          if (/[a-zA-Z]/.test(lang === "en" ? "" : "x") && !/[㐀-鿿]/.test(g[4])) bad.push(tag + "：中文讀螢幕名稱不見了");
          if (lang === "en" && /[㐀-鿿]/.test(g[4])) bad.push(`${tag}：英文讀螢幕名稱還是中文「${g[4]}」`) }
        const B = [];
        for (const m of html.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*class="bt-ml[^"]*">(.*?)<\/text>/g)) { const t2 = un(m[4]), fz = +m[3], hw = cw(t2) * fz / 2; B.push({ t: t2, b: [+m[1] - hw, +m[2] - fz * .6, +m[1] + hw, +m[2] + fz * .6] }) }
        for (const [a, x] of B.entries()) { for (const o of MK) if (Math.min(x.b[2], o[2]) - Math.max(x.b[0], o[0]) > 1 / s && Math.min(x.b[3], o[3]) - Math.max(x.b[1], o[1]) > 1 / s) bad.push(`${tag}：地名「${x.t}」壓到戰役點`);
          for (const y of B.slice(a + 1)) if (Math.min(x.b[2], y.b[2]) - Math.max(x.b[0], y.b[0]) > 1 / s && Math.min(x.b[3], y.b[3]) - Math.max(x.b[1], y.b[1]) > 1 / s) bad.push(`${tag}：地名「${x.t}」×「${y.t}」`);
          if (x.b[1] < top - 1 / s || x.b[3] > bot + 1 / s) bad.push(`${tag}：地名「${x.t}」進到分頁列或清單鈕` ) }
      } }
    } }
  assert.ok(n > 300, "排了 " + n + " 張");
  assert.deepEqual(bad, [], bad.length + " 個問題");
});
test("第 15 批 N15-1 古戰場抽屜：計謀、道理、殘局題、難度各自一個節點翻得出；「年代・甲 對 乙（人）」組合格式（pat，名字翻不出照原文）", t => {
  if (!fs.existsSync(EXT)) return t.skip(SKIP);
  const X = load(true), G = M("m/07g-battle.js");
  assert.ok(G.includes("<span class=\"bt-tag\">🗡 <span>計謀：</span><span>${esc(c.trick)}</span>　📘 <span>道理：</span><span>${esc(c.lesson)}</span></span>"), "07g 計謀、道理標籤各自一個節點");
  assert.ok(G.includes("`📜 <span>殘局題：</span><span>${esc(P.t)}</span>・<span>${cjLv(P.d)}</span>・<span>${cjSrc(P)}</span>`"), "07g 殘局題各段各自一個節點");
  assert.ok(G.includes("<small>${esc(c.year)}${c.sides?\"・\"+esc(c.sides):\"\"}"), "07g 年代・對陣樣板");
  for (const s of ["計謀：", "道理：", "殘局題：", "初級", "中級", "高級", "大師收官", "📜 史實", "出處：", "📜 歷史上其實是這樣", "📍 約在"]) ok(X, s);
  assert.equal(ok(X, "前 204 年・漢（韓信）對 趙"), "204 BCE · Han (Han Xin) vs Zhao");
  assert.equal(ok(X, "前 307–前 296 年・趙 對 中山"), "307–296 BCE · Zhao vs Zhongshan");
  assert.equal(X.i18nText("前 206 年・漢 對 雍（章邯）"), "206 BCE · Han vs Yong (章邯)", "人名之後大批翻譯，這批照原文");
  const BJ = path.join(ROOT, "xiangqi-db", "art", "canju", "battles2.json");
  if (fs.existsSync(BJ)) { const J = JSON.parse(fs.readFileSync(BJ, "utf8")); let n = 0, done = 0;
    for (const k in J.eras) for (const c of J.eras[k]) if (c.sides) { n++; const r = X.i18nText(c.year + "・" + c.sides); if (r != null && / vs /.test(r) && !/[㐀-鿿]/.test(r.replace(/\([^)]*\)/g, ""))) done++ }
    assert.ok(done / n > .5, `年代・對陣翻得出結構的 ${done}／${n}`) }
});
