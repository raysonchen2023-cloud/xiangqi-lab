// 11/17 Windows 測試員 D 第 4 輪（English 介面）的程式修正，不開瀏覽器：
//   P2-4 西市、書架、行囊的出口寫死去處（從對局頁直接跳過來不再寫「↩ 回園子對局」）
//   P2-5 英文書架三本書的標籤可換行、翻譯完再貼邊一次
//   P3-1 星門圍城資料卡「防 N（…）」英文時括號前留空（不再黏成 DEF 31(…）
//   P3-2 「正在播放」曲名與樂器之間的分隔號改用間隔號「·」
//   測試員 B 第 6 輪 N6-2～N6-6：園子縮放提示的朱印不翻、英文窄螢幕標題換兩行、3D 門記號 Gate N、toast 先翻再量寬度、播報區念英文
//   測試員 D 第 7 輪 P2-1～P3-3＋測試員 B 第 7 輪 N7-1：快速對局切換鈕、返回鈕寬度上限、3D 封面換行、3D 走棋提示、古戰場 SVG 地圖英文、縮放泡泡、👁 aria-label、播報區不重複
//   第 8 批：👁 重畫後放回同一顆（P3-2 重修）、我的角色頁標籤換行、3D 封面大標、N8-2 播報區換英文與換頁清掉、古戰場英文戰役名折行與往內收
// 用法：node --test xiangqi-lab/tools/test-r4-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const M = f => fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");

test("西市回首頁、書架與行囊回星槎（寫死去處）", () => {
  const W = M("07w9-exits.js");
  assert.ok(W.includes('"/ximarket":[64,91,"🏘 回棋鎮","#/"]'), "西市");
  assert.ok(W.includes('"/ship/shelf":[16,90,"⛵ 回星槎","#/adventure"]'), "書架");
  assert.ok(W.includes('"/ship/bag":[16,90,"⛵ 回星槎","#/adventure"]'), "行囊");
});
test("英文書架標籤可換行，翻譯完再貼邊", () => {
  const S = M("07f-ship.js");
  assert.match(S, /const SHELF_EN_CSS=`<style>html\[lang\^=en\] :is\(#sb1,#sb2,#sb3\)\{white-space:normal;/);
  assert.ok(S.includes('"第 1～14 章・全書"]],SHELF_EN_CSS);'), "書架頁帶上樣式");
  assert.ok(S.includes('shpFit(v);setTimeout(()=>{if(v.isConnected)shpFit(v)},700);return{}}'), "翻完再貼邊");
});
test("資料卡括號那段包成 .sg2-ex，英文時左邊留空", () => {
  const G = M("07sg2-siege2.js");
  assert.ok(G.includes('<span class="sg2-ex">（${esc(ex.join("、"))}）</span>'));
  assert.ok(G.includes("html[lang^=en] .sg2-ex{margin-left:.3em}"));
});
test("正在播放的分隔號是間隔號", () => {
  const B = M("01-board.js");
  assert.ok(B.includes('<span style="margin:0 .25em">·</span><span>${ins}</span>'));
  assert.ok(!B.includes('<span style="margin:0 .25em">・</span>'));
});
test("「N 回合後」「打了 N 回合」數字跟字同一個節點（英文分單複數）", () => {
  const G = M("07sg2-siege2.js"), H = M("07bhg-gatesiege.js");
  assert.ok(G.includes("・<b>${n} 回合後</b></button>`"), "07sg2 下一波");
  assert.ok(H.includes("・<b>${g.inR} 回合後</b></button>`"), "07bhg 下一波");
  assert.ok(G.includes("<b>打了 ${sg2Rnds(st)} 回合</b><span class=\"sg2-ex\">・帥 ${hp(kr)}・敵將 ${hp(kb)}</span></p>"), "07sg2 結算");
});
test("英文 3D 場名（.pkname）讓出右上視角鈕、太長可換行；只對 html[lang^=en]", () => {
  const C = M("06-cpu.js");
  assert.ok(C.includes('if(typeof document.getElementById==="function"&&!document.getElementById("pkEnCss")){const s=document.createElement("style");s.id="pkEnCss";'), "06-cpu 注入樣式");
  assert.ok(C.includes("html[lang^=en] .pkname{left:calc(50% - 52px);width:max-content;max-width:calc(100% - 124px);box-sizing:border-box;white-space:normal;"), "讓出右邊視角鈕的寬度、可換行");
  assert.ok(C.includes("@media (orientation:landscape) and (max-height:600px){html[lang^=en] .pkname{left:10px;max-width:calc(100% - 20px)}}"), "橫向照舊靠左");
  assert.ok(!/(^|[^\]] )\.pkname\{left:calc/.test(C), "中文不套用");
});
test("星門圍城的難度英文跟選關按鈕一致（中＝Medium，不是 Normal）", () => {
  const I = M("07i18n.js");
  assert.ok(I.includes('"Medium: enemy stats as listed, AI looks 2 moves ahead"'));
  assert.ok(I.includes('"On Medium and Hard the Star Pivot casts skills too'));
  assert.ok(!I.includes('"On Normal and Hard the Star Pivot'));
});

/* ---------- 11/17 測試員 B 第 6 輪（English 介面）P3：N6-2～N6-6 ---------- */
const vm = require("vm");
const LAB6 = f => fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8").replace(/\r\n/g, "\n");
/* 07i18n.js 的 PURE 區段＋指定的函式丟進 vm（doc＝假的 document） */
function i18nVm(extra, ctx) {
  const S = M("07i18n.js"), a = S.indexOf("#I18N-PURE-BEGIN"), b = S.indexOf("/* #I18N-PURE-END */");
  ctx = Object.assign({ console }, ctx || {}); vm.createContext(ctx);
  vm.runInContext(S.slice(S.indexOf("\n", a) + 1, b) + "\n" + (extra || "") + ";this.R={i18nText}", ctx);
  return ctx;
}
const fnSrc = (S, head, tail) => { const i = S.indexOf(head), j = S.indexOf(tail, i); assert.ok(i >= 0 && j > i, "原始碼找不到 " + head); return S.slice(i, j) };

test("N6-2 快速對局 3D 園子縮放提示：樣板照舊（外掛字典翻整句）、朱印的城名單字不翻（「大」不會變 Large）", () => {
  const P = LAB6("park3d.js");
  assert.ok(P.includes("mhShow(\"mh-note\",`${C[0]}到${C[1]}有多遠？往外看就知道！<small>一直按右下角的「－」</small>`,7000)"), "提示樣板改了，i18n-en.json 的 pat 要跟著改");
  assert.ok(P.includes("<div class=\"mh-seal\" data-noi18n>${C[0].length<=2?C[0].split(\"\").join(\"<br>\"):\"印\"}</div>"), "朱印標 data-noi18n");
  assert.ok(P.includes("<div class=\"mh-lab\">原來我們在這裡・${C[0]}</div>"), "第一次拉遠的標籤樣板改了");
});
test("N6-3 英文 480px 以下頂欄標題可換兩行（所有頁面）；返回鈕的字照留；中文不套用", () => {
  const I = M("07i18n.js");
  assert.ok(I.includes('"@media (max-width:480px){html[lang=en] #title{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-size:calc(16px * min(var(--fz,1),1.3));line-height:1.15;letter-spacing:.02em;overflow-wrap:break-word}}",'), "I18N_CSS 有換行規則");
  const css = I.slice(I.indexOf("const I18N_CSS="), I.indexOf("].join(\"\\n\");", I.indexOf("const I18N_CSS=")));
  /* 第 7 輪 N7-1 起返回鈕有寬度上限（字留著、放不下才刪節號；快速對局切換鈕那頁只留「‹」），規則都只對英文、480px 以下（N7-1 測試在檔尾） */
  for (const r of css.match(/[^\s{}"]*[^{}"]*#back\b[^{]*\{/g) || []) assert.match(r, /^(@media \(max-width:480px\)\{)?html\[lang=en\] /, "返回鈕的規則只對英文：" + r);
  assert.ok(!/#back\{[^}]*font-size:0/.test(css.replace(/\.topbar:has\(\.cpu-seg\) #back\{[^}]*\}/g, "")), "一般頁面返回鈕的字照留（只有快速對局切換鈕那頁只留 ‹）");
  const tt = css.match(/[^\s{}"]* ?#title\{/g); assert.ok(tt.length >= 2); for (const r of tt) assert.equal(r, "html[lang=en] #title{", "只對英文：" + r);
  assert.ok(I.includes("function i18nCss(){try{if(document.getElementById(\"i18nCss\"))return;"), "英文開機注入一次");
});
test("N6-4 星門圍城 3D 盤上的門記號：英文寫「Gate N」、中文照舊「門 N」；英文標籤寬度照字", () => {
  const G = M("07bhg-gatesiege.js"), T = M("07bht-td.js");
  const src = fnSrc(G, "const GSV_GND=", "/* 一個記號在 3D 星盤上放哪");
  const run = lang => { const c = { document: { documentElement: { lang } } }; vm.createContext(c); vm.runInContext(src + ";this.f=gsvMk3", c); return c.f([{ sq: 3, k: "gate", t: "門<i>4</i>" }, { sq: 5, k: "dp", t: "補" }], [], {}) };
  const en = run("en"), zh = run("zh-Hant");
  assert.deepEqual(JSON.parse(JSON.stringify(en.filter(m => m.k === "gt"))), [{ sq: 3, k: "gt", c: "bt", t: "Gate 4" }]);
  assert.deepEqual(JSON.parse(JSON.stringify(zh.filter(m => m.k === "gt"))), [{ sq: 3, k: "gt", c: "bt", t: "門 4" }]);
  assert.equal(en.find(m => m.k === "lb lbdp").t, "補", "補給點的字照舊（翻譯器換）");
  assert.ok(G.includes("html[lang^=en] #gsvOv .bt-mk.gt{width:min-content;min-width:1.7em}"), "英文標籤寬度照字");
  assert.ok(T.includes("L.push({k:\"gt\",sq:q,t:`${/^en/.test((document.documentElement||{}).lang||\"\")?\"Gate\":\"門\"} ${n}`})"), "舊版塔防 3D 也一樣");
});
test("N6-5 英文時 toast 先翻再量寬度（星門圍城開局那句不再被切掉）；中文不包", () => {
  const I = M("07i18n.js"), say = fnSrc(I, "function i18nSay(", "\n/* 英文模式開機"), wrap = I.split("\n").find(l => l.includes("toast=function(m)"));
  assert.ok(wrap && I.indexOf(wrap) > I.indexOf("function i18nBoot(") && I.indexOf(wrap) < I.indexOf("i18nCss();i18nTabKeys();"), "包在 i18nBoot 裡（英文才包）");
  assert.ok(I.indexOf("if(i18nLang()!==\"en\"){i18nHintOnce();return}") < I.indexOf(wrap), "中文在包之前就 return");
  const c = i18nVm("var out=[];function toast(m){out.push(m)}\n" + say + "\n" + wrap, { document: { querySelectorAll: () => [] } });
  vm.runInContext("toast(\"🌠 星門圍城・序章 A1\");toast(\"這句翻不出來的話照原樣ㄅ\");toast(3)", c);
  assert.equal(c.out[0], "🌠 Star Gate Siege · Prologue A1", "內建翻得出的開局那句（易／中／難 N 在外掛字典，test-i18n-ext-1117 測）");
  assert.equal(c.out[1], "這句翻不出來的話照原樣ㄅ"); assert.equal(c.out[2], 3);
});
test("N6-6 讀螢幕播報區：視窗的字在第 160 字是空白時也對得上，念英文；英文時 modal 先翻再念", () => {
  const I = M("07i18n.js"), U = M("00-util.js"), say = fnSrc(I, "function i18nSay(", "\n/* 英文模式開機");
  const box = { innerText: "" }, c = i18nVm(say + "\nfunction i18nApply(b){b.innerText=\"🌠 Star Gate Siege  Prologue Easy\"}", { document: { querySelectorAll: s => s === ".modal .box" ? [box] : [] } });
  const txt = "🌠 " + "星".repeat(156) + " 序章 A1・攻擊不是吃子"; box.innerText = txt;
  const s = txt.replace(/\s+/g, " ").trim().slice(0, 160); assert.ok(/ $/.test(s), "重現：切到 160 字尾巴是空白");
  assert.equal(c.i18nSay(s), "🌠 Star Gate Siege Prologue Easy");
  box.innerText = "別的視窗"; assert.equal(c.i18nSay(s), s, "不是那個視窗就照原樣");
  assert.ok(U.includes("try{if(typeof i18nApply===\"function\"&&/^en/.test(document.documentElement.lang||\"\"))i18nApply(m.querySelector(\".box\"))}catch(e){}"), "00-util modal 英文時先翻");
  assert.ok(U.indexOf("i18nApply(m.querySelector(\".box\"))") < U.indexOf("axSay(m.querySelector(\".box\").innerText"), "先翻再念");
});

/* ---------- 11/17 測試員 D 第 7 輪（English 介面）P2-1～P3-3 程式修正、測試員 B 第 7 輪 N7-1 ---------- */
const I18N_CSS7 = () => { const I = M("07i18n.js"), a = I.indexOf("const I18N_CSS="); return I.slice(a, I.indexOf("].join(\"\\n\");", a)) };
test("P2-1 快速對局頂欄的晉級賽／練功房切換鈕：英文 480px 以下這一頁返回鈕只留「‹」、切換鈕的字可換兩行不截斷；中文不套用", () => {
  const css = I18N_CSS7(), C = M("08b-cpugame.js");
  assert.ok(C.includes("seg.className=\"cpu-seg\"") && C.includes("const t=$(\"#title\");t.textContent=\"\";t.append(seg)"), "切換鈕放在頂欄標題的位置（08b-cpugame.js）");
  assert.ok(css.includes("\"@media (max-width:480px){html[lang=en] .topbar:has(.cpu-seg) #back{font-size:0;padding:0 6px;max-width:none;text-align:center}html[lang=en] .topbar:has(.cpu-seg) #back b{font-size:28px}html[lang=en] .cpu-seg button{white-space:normal;text-overflow:clip;font-size:12.5px;line-height:1.1;padding:0 3px;letter-spacing:-.1px}}\""));
  const rules = (css.match(/"[^"\n]*"/g) || []).join("").replace(/@media [^{]*\{/g, "").match(/[^{}"]*\.cpu-seg[^{}"]*\{/g);
  assert.ok(rules.length >= 3); for (const r of rules) assert.match(r, /^html\[lang=en\] /, "只對英文：" + r);
});
test("N7-1 英文 480px 以下返回鈕最多佔頂欄 40%、放不下刪節號（字留在按鈕裡，讀螢幕念全文）；星門圍城只留「‹」的規則比它具體；中文不套用", () => {
  const css = I18N_CSS7(), G = M("07sg2-siege2.js"), SH = M("02-shell.js");
  assert.ok(css.includes("\"@media (max-width:480px){html[lang=en] #back{display:block;max-width:40%;min-width:44px;flex:0 1 auto;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:44px;text-align:left}html[lang=en] #back b{display:inline-block;vertical-align:top;line-height:40px}html[lang=en] body.gsv-on #back{text-align:center}}\""));
  assert.ok(G.includes("@media (max-width:480px){html[lang=en] body.gsv-on #back{font-size:0;padding:0 6px}html[lang=en] body.gsv-on #back b{font-size:28px}"), "星門圍城只留「‹」照舊");
  const spec = s => (s.match(/#[\w-]+/g) || []).length * 100 + (s.match(/\.[\w-]+|\[[^\]]+\]|:has\(/g) || []).length * 10 + (s.match(/(^|[\s>+~])[a-z]+/g) || []).length;
  assert.ok(spec("html[lang=en] body.gsv-on #back") > spec("html[lang=en] #back") && spec("html[lang=en] .topbar:has(.cpu-seg) #back") > spec("html[lang=en] #back"), "兩條只留「‹」的規則都比一般的寬度上限具體");
  assert.ok(SH.includes("B.innerHTML=\"<b>‹</b>\"+(nm?\"回\"+esc(nm):\"返回\")"), "返回鈕的字還在按鈕裡（讀螢幕的名字＝全文）");
  assert.ok(!/(^|[^\]] )#back\{/.test(css.replace(/html\[lang=en\] (body\.gsv-on |\.topbar:has\(\.cpu-seg\) )?#back/g, "")), "沒有不分語言的 #back 規則");
});
test("P2-2 快速對局 3D 封面：名言下面的白話說明可以換行（原本一行超出畫面右邊），出處和提示照舊", () => {
  const P = LAB6("park3d.js");
  assert.ok(P.includes("<div class=\"gt-q\" style=\"position:absolute;left:0;right:0;bottom:0;padding:56px 26px max(30px,env(safe-area-inset-bottom,0px));text-align:center;white-space:normal;overflow-wrap:anywhere;box-sizing:border-box;"), "封面下半段一律可換行");
  assert.ok(P.includes("<div class=\"gt-qn\" style=\"margin-top:6px;font:500 12px/1.55 sans-serif;text-wrap:balance;"), "白話說明平均換行");
  assert.ok(P.includes(">點一下畫面就進園子</div>"), "提示的字照舊（外掛字典翻）");
});
test("P2-3 3D 走棋提示：英文時第一句不拆成 <b> 好幾段（整句一個節點交給字典）；中文照舊粗體", () => {
  const C = M("06-cpu.js");
  assert.ok(C.includes("tp.innerHTML=(/^en/.test((document.documentElement||{}).lang||\"\")?\"先點你的棋子，再點綠點走過去。\":\"先點<b>你的棋子</b>，再點<b>綠點</b>走過去。\")+\"<br>看不清楚？按下面「▦ 平面棋盤」，棋子比較大。\";"));
});
test("P2-6 古戰場地圖（SVG，翻譯器不進去）：英文時地名、戰役名、無障礙名稱先查字典；戰役短名去掉 Battle of／Siege of／Campaign、（約）＝(approx.)；中文照舊", () => {
  const G = M("07g-battle.js"), src = fnSrc(G, "function btEn(", "function battleMapHTML(");
  const run = (lang, tr) => { const c = { document: { documentElement: { lang } }, i18nText: s => tr[s] == null ? null : tr[s] }; vm.createContext(c); vm.runInContext(src + ";this.f=btMapName;this.a=btMapAria;this.e=btEn", c); return c };
  const TR = { "桂陵之戰": "Battle of Guiling", "白登之圍": "Siege of Baideng", "寧夏之役": "Ningxia Campaign", "濰水之戰": "Battle of the Wei River", "太原保衛戰": "Defense of Taiyuan", "潼關之戰（211）": "Battle of Tong Pass (211)", "可以打": "Ready to fight", "咸陽": "Xianyang" };
  const en = run("en", TR), zh = run("zh-Hant", TR), J = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(J(en.f({ name: "桂陵之戰", approx: 1 })), { t: "Guiling", ap: " (approx.)", w: 17 * .56, L: ["Guiling (approx.)"] });
  assert.equal(en.f({ name: "白登之圍" }).t, "Baideng"); assert.equal(en.f({ name: "寧夏之役" }).t, "Ningxia"); assert.equal(en.f({ name: "濰水之戰" }).t, "Wei River");
  assert.equal(en.f({ name: "太原保衛戰" }).t, "Defense of Taiyuan", "中文沒去掉的（保衛戰）英文也不去掉");
  assert.equal(en.f({ name: "潼關之戰（211）" }).t, "Battle of Tong Pass (211)", "中文名尾巴不是之戰（括號）就整個照全名");
  assert.deepEqual(J(en.f({ name: "翻不出之戰", approx: 1 })), { t: "翻不出", ap: "（約）", w: 6 }, "字典沒有就照中文");
  assert.deepEqual(J(zh.f({ name: "桂陵之戰", approx: 1 })), { t: "桂陵", ap: "（約）", w: 5 }, "中文照舊");
  assert.equal(en.a({ name: "桂陵之戰" }, "可以打"), "Battle of Guiling · Ready to fight"); assert.equal(zh.a({ name: "桂陵之戰" }, "可以打"), "桂陵之戰・可以打");
  assert.equal(en.e("咸陽"), "Xianyang"); assert.equal(zh.e("咸陽"), null);
  assert.ok(G.includes("class=\"bt-ml${ty===\"r\"?\" rv\":\"\"}\">${esc(nE||nm)}</text>") && G.includes("nE=btEn(nm)"), "地名（第 8 批起英文時靠邊往內收）");
  assert.ok(G.includes("LB=cards.map(btMapName),place=cards.map((c,i)=>{const[x,y]=Q[i],tw=(LB[i].w+(c.flag?1:0))*fz,") && G.includes("nm=esc(LB[i].t),approx=esc(LB[i].ap),"), "戰役名與字寬");
  assert.ok(G.includes("`${c.flag?\"⭐\":\"\"}${nm}${approx}`}</text>") && G.includes("${j?\"\":c.flag?\"⭐\":\"\"}${esc(z)}</tspan>"), "⭐ 前綴照舊放在名字前面（英文折行時在第一行）");
  assert.equal((G.match(/aria-label="\$\{esc\(btMapAria\(c,s\?"已打下":o\?"可以打":"還沒開"\)\)\}"/g) || []).length, 2, "兩種戰役點的無障礙名稱");
  assert.ok(G.includes("aria-label=\"${esc(btEn(eraLabel(k)+\"戰役地圖\")||eraLabel(k)+\"戰役地圖\")}\""), "整張地圖的無障礙名稱");
});
test("P3-1 3D 縮放提示泡泡：英文時抬到左下「▦ 2D board」鈕上面、字小一點，最後一行不再被蓋住", () => {
  const css = I18N_CSS7(), P = LAB6("park3d.js"), MC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m.css"), "utf8");
  assert.ok(css.includes("\"html[lang=en] .mh-note{bottom:56px;font-size:12.5px;line-height:1.35}\""));
  assert.ok(P.includes(".mh-note{right:56px;bottom:14px;"), "park3d.js 泡泡原本的位置（中文照舊）");
  const pk = MC.match(/\n\.pk2d\{[^}]*\}/)[0], b = +pk.match(/bottom:(\d+)px/)[1], h = +pk.match(/min-height:(\d+)px/)[1];
  assert.ok(b + h < 56, "▦ 鈕的上緣（" + (b + h) + "px）在泡泡底下");
});
test("P3-2 星門圍城頂欄「👁」：每次都對一次 aria-label／title（跟現在的視角一致；英文直接給英文），不只在 dataset.v 換的那一次", () => {
  const G = M("07bhg-gatesiege.js"), src = fnSrc(G, "function gsvViewUi(", "function gsvViewOut(");
  const run = (lang, v, stale) => {
    const at = {}, b = { dataset: { v }, innerHTML: "x", title: "", setAttribute: (k, x) => { at[k] = String(x) }, getAttribute: k => k in at ? at[k] : null, addEventListener() {} };
    if (stale) { at["aria-label"] = stale; b.title = stale }
    const c = { BHTD_VW: { top: "全局俯視", tilt: "臨陣斜角", flat: "純淨平面" }, gsvVw: () => v, i18nText: s => ({ "視角：全局俯視（點一下換下一種）": "View: Overview (tap for the next one)", "視角：全局俯視": "View: Overview" })[s] || null,
      document: { documentElement: { lang }, getElementById: id => id === "topRight" ? { prepend() {} } : id === "gsvView" ? b : null } };
    vm.createContext(c); vm.runInContext(src + ";gsvViewUi()", c); return { at, b };
  };
  const en = run("en", "top", "View: Flat board (tap for the next one)");
  assert.equal(en.at["aria-label"], "View: Overview (tap for the next one)", "按鈕沒重畫（dataset.v 已經是 top）也會改成現在的視角");
  assert.equal(en.b.title, "View: Overview"); assert.equal(en.b.innerHTML, "x", "dataset.v 沒換就不重畫按鈕裡的字");
  const zh = run("zh-Hant", "top", "視角：純淨平面（點一下換下一種）");
  assert.equal(zh.at["aria-label"], "視角：全局俯視（點一下換下一種）"); assert.equal(zh.b.title, "視角：全局俯視");
  assert.equal(run("en", "tilt", "").at["aria-label"], "視角：臨陣斜角（點一下換下一種）", "字典翻不出就留中文（觀察器之後再換）");
});
test("P3-3 讀螢幕播報區：同一句 3 秒內只寫一次；視窗按鈕關掉時把那個視窗念過的那一行拿掉；英文包一層也回傳實際寫進去的那句", () => {
  const B = M("01-board.js"), U = M("00-util.js"), I = M("07i18n.js"), src = fnSrc(B, "const axKey=", "\n// 走棋音效");   /* 第 9 批起比對用 axKey（定義在 AX_LAST 前面） */
  const live = { children: [], append(d) { d.p = this; this.children.push(d) }, get firstChild() { return this.children[0] }, setAttribute() {} };
  let now = 1000, writes = 0; const c = { Date: { now: () => now }, setTimeout: f => f(),
    document: { body: { append() {} }, getElementById: id => id === "axLive" ? live : null, createElement: () => ({ textContent: "", remove() { const L = this.p.children, i = L.indexOf(this); if (i >= 0) L.splice(i, 1) } }) } };
  const a0 = live.append; live.append = function (d) { writes++; return a0.call(this, d) };
  vm.createContext(c); vm.runInContext(src + ";this.say=axSay;this.unsay=axUnsay", c);
  const A = "📲 Add Xiangqi Qianqiu to your Home Screen? …";
  assert.equal(c.say(A), A, "回傳寫進去的那句");
  for (let i = 0; i < 5; i++) { now += 400; c.say(A) }
  assert.equal(writes, 1, "同一句連著 6 次只寫 1 次"); assert.deepEqual(live.children.map(d => d.textContent), [A]);
  c.say("別的句子"); assert.equal(live.children.length, 2);
  c.unsay(A); assert.deepEqual(live.children.map(d => d.textContent), ["別的句子"], "視窗關掉：那一行拿掉，別的留著");
  c.say(A); assert.equal(live.children.length, 2, "拿掉之後同一句可以再念"); now += 3001; c.say(A); assert.equal(live.children.length, 3, "超過 3 秒的同一句照念");
  assert.ok(U.includes("b.onclick=()=>{m.remove();try{if(m._ax&&typeof axUnsay===\"function\")axUnsay(m._ax)}catch(e){}fn&&fn()};"), "00-util modal 按鈕關視窗時清掉");
  assert.ok(U.includes("m._ax=axSay(m.querySelector(\".box\").innerText"), "00-util modal 記住念過的那句");
  assert.ok(I.includes("axSay=function(t){return o.call(this,i18nSay(t))}"), "07i18n 英文包一層也把回傳值傳回去");
});
test("快速對局平面棋盤：英文窄螢幕「🧊 3D scene」鈕放到棋規徽章下一行（「📜 Rules this game: …」整句看得到）；中文照舊同一行", () => {
  const css = I18N_CSS7(), MC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m.css"), "utf8");
  assert.ok(css.includes("\"@media (max-width:600px){html[lang=en] .rule-note+.pk3d-back{margin-top:2px}}\""));
  assert.ok(MC.includes(".rule-note+.pk3d-back{margin-top:-30px;"), "m.css 中文照舊疊在同一行");
});
test("N8-1 新玩家第一次開網頁：隔離自動重整前，開頭畫面開著或還沒有旅程就拿掉 xqTitleShown（重整後照常出開頭畫面）", () => {
  const S = M("02-shell.js");
  assert.ok(S.includes('try{if((typeof TITLE!=="undefined"&&TITLE)||(typeof journey==="function"&&!journey()))sessionStorage.removeItem("xqTitleShown")}catch(e){}'));
  const i = S.indexOf('sessionStorage.removeItem("xqTitleShown")'), j = S.indexOf('location.reload()};', i);
  assert.ok(i > 0 && j > i && j - i < 400, "拿掉記號在 location.reload() 之前（同一個 go）");
});

/* ---------- 第 8 批：測試員 D 第 8 輪（P3-2 👁 重修、我的角色頁標籤、3D 封面大標）＋測試員 B 第 8 輪（N8-2 播報區、古戰場地圖標籤） ---------- */
test("第 8 批 P3-2（重修）星門圍城「👁」：頂欄重畫（#topRight 清空）後放回同一顆按鈕、名字照新視角重寫、剛按過就把焦點還給它；離開對局放掉", () => {
  const G = M("07bhg-gatesiege.js"), src = fnSrc(G, "function gsvViewUi(", "function gsvViewOut(");
  let attached = null, focus = 0, v = "flat", lis = null;
  const at = {}, mkB = () => ({ dataset: {}, innerHTML: "", title: "", setAttribute: (k, x) => { at[k] = String(x) }, getAttribute: k => k in at ? at[k] : null, addEventListener: (t, f) => { lis = f }, focus() { focus++ } });
  const tr = { prepend: b => { attached = b } };
  const c = { BHTD_VW: { top: "全局俯視", tilt: "臨陣斜角", flat: "純淨平面" }, gsvVw: () => v, gsvVwNext: x => ({ top: "tilt", tilt: "flat", flat: "top" })[x], gsvSetView: x => { v = x }, gsvViewMenu() {}, vibrate() {},
    i18nText: s => ({ "視角：全局俯視（點一下換下一種）": "View: Overview (tap for the next one)", "視角：臨陣斜角（點一下換下一種）": "View: Battle angle (tap for the next one)", "視角：純淨平面（點一下換下一種）": "View: Flat board (tap for the next one)" })[s] || null,
    document: { documentElement: { lang: "en" }, getElementById: id => id === "topRight" ? tr : id === "gsvView" ? attached : null, createElement: () => Object.assign(mkB(), {}) } };
  vm.createContext(c); vm.runInContext(src + ";this.ui=gsvViewUi", c);
  c.ui(); const b1 = attached; assert.ok(b1); b1.id = "gsvView"; assert.equal(at["aria-label"], "View: Flat board (tap for the next one)");
  for (const want of ["View: Overview (tap for the next one)", "View: Battle angle (tap for the next one)", "View: Flat board (tap for the next one)"]) {
    lis({ stopPropagation() {} });            /* 按一下：視角換下一種 */
    attached = null; c.ui();                  /* 08b 重畫頂欄把它清掉 → gsvTick 再叫一次 */
    assert.equal(attached, b1, "放回去的是同一顆（讀螢幕、鍵盤的焦點不會停在被丟掉的那顆）"); assert.equal(at["aria-label"], want);
  }
  assert.equal(focus, 3, "剛按過的那顆放回去時焦點也還給它");
  assert.ok(G.includes("GSV_TG=null;GSV_MK=\"\";GSV_HK=\"\";GSV_P3=0;GSV_VB=null;"), "gsvHide 放掉留著的那顆");
  assert.ok(G.includes("let GSV_VB=null,GSV_VBF=0;"));
});
test("第 8 批 P3-2 我的角色頁書齋牆標籤：英文時可換行、寬度照字（最多約螢幕 26%）、字小一點；中文照舊一行", () => {
  const css = I18N_CSS7(), Z = M("07z4-studymap.js");
  assert.ok(css.includes("\"html[lang=en] .mz-lb{white-space:normal;width:max-content;max-width:min(26vw,124px);text-align:center;padding:2px 4px 3px}html[lang=en] .mz-lb b{font-size:11.5px;line-height:1.15;letter-spacing:0}html[lang=en] .mz-lb small{font-size:11px;line-height:1.15}\""));
  assert.ok(Z.includes(".mz-lb{position:absolute;transform:translate(-50%,-100%);") && Z.includes("white-space:nowrap;"), "07z4 中文照舊（往上長的標籤底邊不動）");
});
test("第 8 批 P3-3 3D 封面大標：英文時小一點、行高拉開、副標往下（行內樣式要 !important 才蓋得過）；中文照舊", () => {
  const css = I18N_CSS7(), P = LAB6("park3d.js");
  assert.ok(css.includes("\"html[lang=en] .gt-t{font-size:22px!important;letter-spacing:.03em!important;line-height:1.2!important;padding:0 18px;text-wrap:balance}html[lang=en] .gt-s{margin-top:10px!important}\""));
  assert.ok(P.includes("<div class=\"gt-t\" style=\"font:900 26px 'Noto Serif TC','PMingLiU',serif;letter-spacing:.2em;margin-top:4px\"></div><div class=\"gt-s\" style=\"font:600 14px sans-serif;margin-top:4px\"></div>"), "park3d 封面大標、副標的行內樣式（中文照舊）");
});
test("N8-2 英文模式開機就跳的視窗（序局邀局）：播報區念的中文等外掛字典載完換成英文；中文模式、視窗已關、本來就是英文都不動；換頁清掉舊句子", async () => {
  const U = M("00-util.js"), I = M("07i18n.js"), B = M("01-board.js");
  const src = fnSrc(U, "function mdSayEn(", "/* 11/11 模擬玩家問題 8");
  const run = async (lang, m, box) => { const log = []; const c = { i18nLang: () => lang, i18nExtLoad: () => Promise.resolve(1), i18nApply: bx => { bx.innerText = box }, axUnsay: t => log.push(["un", t]), axSay: t => { log.push(["say", t]); return t }, Promise };
    vm.createContext(c); vm.runInContext(src + ";this.f=mdSayEn", c); c.f(m); await new Promise(r => setTimeout(r, 0)); return log };
  const ZH = "♟ 星樞棋局・序局 星盤展開，棋路成光。七星化作紅方棋子。", EN = "♟ Star Pivot Game · Prologue Game The star board unfolds...";
  const mk = conn => { const bx = { innerText: ZH }; return { _ax: ZH, isConnected: conn, querySelector: () => bx } };
  let m = mk(true); assert.deepEqual(await run("en", m, EN), [["un", ZH], ["say", EN]]); assert.equal(m._ax, EN, "記住新念的那句（關視窗時清這句）");
  assert.deepEqual(await run("zh", mk(true), EN), [], "中文模式不動");
  assert.deepEqual(await run("en", mk(false), EN), [], "視窗已經關了就不做");
  m = mk(true); m._ax = EN; assert.deepEqual(await run("en", m, EN), [], "本來就是英文");
  assert.deepEqual(await run("en", mk(true), ZH), [], "翻完還是一樣（翻不出）就不重念");
  assert.ok(U.includes("m._ax=axSay(m.querySelector(\".box\").innerText.replace(/\\s+/g,\" \").trim().slice(0,160))}catch(e){}try{mdSayEn(m)}catch(e){}return m}"), "00-util modal 念完叫 mdSayEn");
  assert.ok(I.includes("try{document.querySelectorAll(\".modal\").forEach(m=>{if(m._ax&&typeof mdSayEn===\"function\")mdSayEn(m)})}catch(e){}\n  try{i18nApply(document.body)}catch(e){}i18nWatch();i18nExtLoad()}"), "07i18n 開機時開著的視窗也換");
  /* 換頁清掉 1.5 秒以前的行 */
  const gs = fnSrc(B, "function axGc(", "\nif(typeof addEventListener"), now = Date.now(), L = [{ t: "舊", _at: now - 5000 }, { t: "新", _at: now - 200 }];
  const box = { children: L }; L.forEach(d => { d.remove = () => L.splice(L.indexOf(d), 1) });
  const c2 = { document: { getElementById: () => box }, Date }; vm.createContext(c2); vm.runInContext(gs + ";axGc()", c2);
  assert.deepEqual(L.map(d => d.t), ["新"]);
  assert.ok(B.includes("d.textContent=t;d._at=Date.now();r.append(d);") && B.includes("if(typeof addEventListener===\"function\")addEventListener(\"hashchange\",axGc);"));
});
test("第 8 批（測試員 B）古戰場地圖：英文戰役名折行（btWrap）、靠邊往內收；中文只有一行、照舊不收（每朝每卷都在框裡的檢查在 test-i18n-ext-1117 第 8 批）；地圖不能拖曳", () => {
  const G = M("07g-battle.js"), src = fnSrc(G, "function btEn(", "function battleMapHTML(");
  const c = { document: { documentElement: { lang: "zh-Hant" } }, i18nText: () => null }; vm.createContext(c); vm.runInContext(src + ";this.W=btWrap;this.f=btMapName", c);
  const J = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(J(c.W("Battle of Guiling", 18)), ["Battle of Guiling"]);
  assert.deepEqual(J(c.W("Nomad Dress and Mounted Archery · Zhao Conquers Zhongshan", 18)), ["Nomad Dress and", "Mounted Archery ·", "Zhao Conquers", "Zhongshan"]);
  assert.equal(c.W("a b c d e f g h i j k l m n o p q r s t u v w x y z", 1).length, 4, "最多 4 行");
  assert.deepEqual(J(c.W("Supercalifragilistic word", 10)), ["Supercalifragilistic", "word"], "一個字太長就自己一行");
  assert.equal(c.f({ name: "胡服騎射・趙滅中山" }).L, undefined, "中文沒有折行資料");
  assert.ok(G.includes("if(LB[i].L){const bx=pick[3],m=fz*.3,"), "只有英文（有折行資料）才往內收");
  assert.ok(G.includes("let tx=L[5]!=null?+L[5]:+x,ty2=L[6]!=null?+L[6]:+y;if(nE){tx=Math.max("), "地名只有英文才往內收");
  const B2 = G.slice(G.indexOf("function battleField2("), G.indexOf("/* ---------- 守城、讓子的入口"));
  assert.ok(!/bt2M[^;]*pointermove|M\.addEventListener\("(pointermove|touchmove|wheel)"/.test(B2), "地圖本身沒有拖曳／縮放（只有抽屜的拉把），所以超出就看不到，要在框裡");
});

/* ---------- 第 9 批：測試員 D 第 9 輪（P3-3 播報區重修、我的角色頁下排標籤與出口、古戰場頂欄短名與上緣） ---------- */
test("第 9 批 P3-3（重修）播報區：翻譯器不進 #axLive（不再原地改寫）；同一句去掉圖示後一樣也算重複；關視窗時照去掉圖示的字清", () => {
  const B = M("01-board.js"), src = fnSrc(B, "const axKey=", "\n// 走棋音效");
  const live = { children: [], append(d) { this.children.push(d); d.p = this }, get firstChild() { return this.children[0] } };
  let now = 1000; const c = { Date: { now: () => now }, setTimeout: f => f(), document: { body: {}, getElementById: id => id === "axLive" ? live : null,
    createElement: () => ({ textContent: "", remove() { const L = this.p.children; L.splice(L.indexOf(this), 1) } }) } };
  vm.createContext(c); vm.runInContext(src + ";this.say=axSay;this.unsay=axUnsay;this.key=axKey", c);
  const A = "📲 Add Xiangqi Qianqiu to your Home Screen? Once it's added…", A2 = "Add Xiangqi Qianqiu to your Home Screen?  Once it's added…";
  assert.equal(c.key(A), c.key(A2));
  c.say(A); now += 500; c.say(A2); assert.equal(live.children.length, 1, "一次有 📲、一次沒有＝同一句，只寫一次");
  c.unsay(A2); assert.equal(live.children.length, 0, "按 No thanks 關掉：照去掉圖示的字清掉");
  assert.ok(B.includes("r.setAttribute(\"aria-atomic\",\"false\");r.setAttribute(\"data-noi18n\",\"\");document.body.append(r)"), "#axLive 標 data-noi18n（07i18n i18nIsSkip 認這個）");
  assert.ok(M("07i18n.js").includes("el.hasAttribute(\"data-noi18n\")"), "07i18n 跳過 data-noi18n");
  const S2 = M("02-shell.js"); assert.ok(S2.includes("[[\"好，我現在加\",()=>{later();a2hsArrow(ua)}]") && S2.includes("[\"不用了\",never,true]]"), "加到主畫面視窗走 00-util modal 的按鈕（按鈕關視窗時 axUnsay）");
});
test("第 9 批 我的角色頁書齋牆下排（修為、大百科、提示棋、棋罐）英文更窄、大百科往下錯開；圖上出口英文時搬到左下走道（不壓千秋印譜、園子棋友）", () => {
  const css = I18N_CSS7(), W = M("07w9-exits.js");
  assert.ok(css.includes("\"html[lang=en] :is(#mzXp,#mzCodex,#mzBox,#mzJar) .mz-lb{max-width:min(19vw,82px)}html[lang=en] :is(#mzXp,#mzCodex,#mzBox,#mzJar) .mz-lb :is(b,small){font-size:10.5px}html[lang=en] #mzCodex .mz-lb{margin-top:30px}html[lang=en] .mz-wall>.ex-spot{left:19%!important;top:94%!important;max-width:36%}\""));
  assert.ok(W.includes("\"/me\":[50,87,\"🏘 回棋鎮\"]") && W.includes("P=document.querySelector(\"#view .shp-page\")") && W.includes("s.style.left=E[0]+\"%\";s.style.top=E[1]+\"%\""), "07w9 出口放在第一個 .shp-page（我的角色頁＝書齋牆）的 E[0]%、E[1]%（行內樣式，所以要 !important）");
});
test("第 9 批 P3-1 古戰場頂欄：英文用短名「⚔ Battlefield · 朝」（兩行內放得下），頁內大標照舊全名；中文不變", () => {
  const G = M("07g-battle.js"), src = fnSrc(G, "function btEn(", "function btMapName(") + fnSrc(G, "function btTopT(", "function Battlefield(");
  const EL = { classic: "青石園", qin: "秦朝", han: "漢朝", sanguo: "三國", weijin: "魏晉", nanbei: "南北朝", sui: "隋朝", tang: "唐朝", wudai: "五代", song: "宋朝", yuan: "元朝", ming: "明朝", qing: "清朝" };
  const run = lang => { const c = { document: { documentElement: { lang } }, i18nText: s => /古戰場/.test(s) ? "x" : null, eraLabel: k => EL[k] }; vm.createContext(c); vm.runInContext(src + ";this.f=btTopT", c); return c.f };
  const en = run("en"), zh = run("zh-Hant");
  assert.equal(en("qin"), "⚔ Battlefield · Qin"); assert.equal(en("classic"), "⚔ Battlefield · Cabin"); assert.equal(zh("qin"), "⚔ 古戰場・秦朝"); assert.equal(zh("classic"), "⚔ 古戰場・船艙");
  for (const k in EL) assert.ok(en(k).length <= 34 && !/[㐀-鿿]/.test(en(k)), k + "：" + en(k));
  assert.ok(G.includes("function Battlefield(v){const k=shipHere();setTop(btTopT(k),\"^#/port\");") && G.includes("<h2>⚔ ${esc(eraLabel(k))}古戰場</h2>"), "頂欄用短名、頁內大標照舊");
  assert.ok(G.includes("const TOPR=op.bare&&op.px&&btEn(\"古戰場\")?Math.min(h*.3,104*h*A/op.px):0;") && G.includes("ty2=Math.max(vy+TOPR+fsz*.7,ty2)") && G.includes("dy=bx[1]<vy+m+TOPR?vy+m+TOPR-bx[1]"), "英文地名、戰役名讓開上緣（頁名條＋卷分頁）");
});
