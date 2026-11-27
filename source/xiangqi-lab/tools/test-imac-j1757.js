// 11/17 iMac 測試員 J（iPad Air 11，1757，學習與題目）：P1-1 古譜庫「請 Claude／GPT 講解」只給開發者；P1-2 分享連結不能是 127.0.0.1；P2 商店描述照實寫錯棋重練。
// 用法：node --test xiangqi-lab/tools/test-imac-j1757.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };
const IOS = fs.existsSync(path.join(ROOT, "xiangqi-ios")) ? false : "沒有 xiangqi-ios";
const SKIP_STORE = fs.existsSync(path.join(ROOT, "xiangqi-ios", "appstore")) ? false : "沒有 xiangqi-ios/appstore（App Store 上架文案與隱私申報有聯絡人資料，只在開發者電腦）";   /* W69 盤點高 7 */

test("P1-1：「請 Claude 講解」「請 GPT 講解」和「額度」那句只在開發者工具（DEVTOOLS）開著時出現；一般玩家（原生、網頁）看不到", () => {
  const D = M("10-db.js");
  const fn = between(D, "const AN_LLM_WEB=", "\n") + "\n" + between(D, "function anDev(){", "\n");
  assert.ok(D.includes("const AN_LLM_WEB=false;"), "開關預設：網頁版也只給開發者（等開發者回覆）");
  for (const [web, nat] of [[false, false], [false, true], [true, true], [true, false]]) {
    const ctx = { xqNat: () => nat }; vm.createContext(ctx); vm.runInContext(fn.replace("const AN_LLM_WEB=false;", "const AN_LLM_WEB=" + web + ";") + ";this.f=anDev", ctx);
    assert.equal(ctx.f(), web && !nat, `開關 ${web}、${nat ? "原生" : "網頁"}：一般玩家`);
    ctx.DEVTOOLS = () => false; assert.equal(ctx.f(), web && !nat); ctx.DEVTOOLS = () => true; assert.equal(ctx.f(), true, "開發者工具開著一律看得到");
  }
  /* 把分析面板那段樣板字串拿出來，照兩種身分算出 HTML */
  const tpl = between(D, "b.insertAdjacentHTML(\"beforeend\",`<div class=\"opt\" style=\"margin-top:12px\">", "`);", true).replace(/^b\.insertAdjacentHTML\("beforeend",/, "").replace(/\);$/, "");
  for (const dev of [false, true]) {
    const html = vm.runInNewContext(tpl, { anDev: () => dev });
    assert.equal(/請 Claude 講解|請 GPT 講解/.test(html), dev, (dev ? "開發者" : "一般玩家") + "：講解鈕");
    assert.equal(/額度/.test(html), dev, (dev ? "開發者" : "一般玩家") + "：額度那句");
    assert.ok(html.includes("分數是紅方視角，1.0 約等於一個兵。"), "分數說明照舊");
  }
  assert.ok(D.includes('{const ec=b.querySelector("#ec"),eg=b.querySelector("#eg");if(ec)ec.onclick=()=>explain("claude");if(eg)eg.onclick=()=>explain("gpt")}'), "沒有鈕也不會出錯");
  assert.ok(M("02-shell.js").includes("const DEVTOOLS=()=>DEVMODE()&&!!store.get(\"dvtTools\",false);"), "判斷條件跟開發者工具同一個");
  /* 英文：一般玩家看到的那句有翻譯 */
  assert.ok(M("07i18n.js").includes('"分數是紅方視角，1.0 約等於一個兵。":"Scores are from Red\'s point of view; 1.0 is about one pawn."'));
});

test("K P1-3：問小帥的「Google AI 回答」「問 Gemini」和那行說明整塊（#aiB）原生版一律不畫；網頁版看開關 ASK_EXT_AI_WEB；不畫時不留空白區塊", () => {
  const A = M("09-askbot.js");
  const fn = between(A, "const ASK_EXT_AI_WEB=", "\n") + "\n" + between(A, "function askExtAiOn(){", "\n");
  for (const [web, nat] of [[true, false], [true, true], [false, false], [false, true]]) {
    const ctx = { xqNat: () => nat }; vm.createContext(ctx); vm.runInContext(fn.replace(/const ASK_EXT_AI_WEB=(true|false);/, "const ASK_EXT_AI_WEB=" + web + ";") + ";this.f=askExtAiOn", ctx);
    assert.equal(ctx.f(), web && !nat, `開關 ${web}、${nat ? "原生" : "網頁"}`);
  }
  /* 樣板：#aiB 整塊（含「用你手機的網路直接問 Google（免費）」那行和兩顆鈕）都在 askExtAiOn() 的條件裡，關掉時是空字串 */
  const i = A.indexOf("${askExtAiOn()?`<div id=\"aiB\""), j = A.indexOf("`:\"\"}`;", i);
  assert.ok(i > 0 && j > i, "整塊包在條件裡");
  const blk = A.slice(i, j); for (const s of ["用你手機的網路直接問 Google（免費）", "🔎 Google AI 回答", "✨ 問 Gemini"]) assert.ok(blk.includes(s), s);
  assert.equal((A.replace(/\/\*[\s\S]*?\*\//g, "").match(/直接問 Google|Google AI 回答|問 Gemini<\/button>/g) || []).length, 3, "別處沒有（註解不算）");
  assert.ok(A.includes('if(b.querySelector("#aiB")){const aiB=b.querySelector("#aiB"),'), "沒畫的時候不綁按鈕，不會出錯");
});

test("P1-1 全站：一般玩家看得到的地方沒有「要連電腦、裁判程式、--tunnel、額度」這類開發者字樣", () => {
  /* 原本會被一般玩家看到的三處 */
  const S = M("02-shell.js"), D = M("10-db.js"), L = rd("xiangqi-lab/src/local.js");
  assert.ok(!S.includes("AI 對局只在開發者的電腦上") && S.includes("<b>這個頁面目前不開放</b>"), "舊的 AI 對局連結");
  assert.ok(D.includes('if(DEVREMOTE())empty("🏆","還沒有大師對局<br>從電腦同步到手機，沒網路也能看",["☁ 從電腦同步",()=>syncSheet()]);else empty("🏆","這裡還沒有大師對局",null)'), "大師對局空白頁");
  assert.ok(L.includes('if(!r)throw new Error((typeof DEVMODE==="function"&&DEVMODE())?"這個功能要連上電腦：在電腦執行裁判程式（加 --tunnel），再用手機掃電腦上的 QR code":"這個功能目前不能用");'), "local.js 連不到電腦的錯誤");
  /* 其餘出現這些字的地方都在開發者條件後面：連線到電腦（DEVMODE 設定裡）、連線對戰 seatSheet（DEVTOOLS）、從電腦同步 syncSheet（DEVREMOTE）、AI 對戰（!OFF||DEVREMOTE） */
  const W = M("11-watch.js"); assert.ok(W.includes("const RI=!OFF||DEVREMOTE();"));
  assert.ok(D.includes('if(DEVREMOTE()&&grp==="gm"){const x=document.createElement("button");x.className="sync";x.textContent="☁ 從電腦同步";'));
  assert.ok(M("09b-preload.js").includes('((typeof DEVTOOLS==="function"&&DEVTOOLS())?[["👥",()=>seatSheet(),"連線對戰"]]:[])'));
  assert.ok(M("02-shell.js").includes("const DEVREMOTE=()=>OFF&&DEVMODE()&&"));
});

test("P1-2：分享連結的開頭（xqShareBase）原生版、127.0.0.1、localhost 一律用公開網址；網頁版用自己的網址", () => {
  const U = M("00-util.js"), src = between(U, "function xqShareBase(){", "\nfunction xqNat(){") + "\n" + between(U, "function xqNat(){", "\n");
  const APP = "https://raysonchen2023-cloud.github.io/xiangqi-lab/";
  const run = (href, nat) => { const u = new URL(href); const ctx = { window: nat ? { XQ_NATIVE: true } : {}, navigator: { userAgent: nat ? "Mozilla/5.0 XQQianqiuApp/1.0" : "Mozilla/5.0" }, location: { origin: u.origin === "null" ? u.protocol + "//" + u.host : u.origin, pathname: u.pathname } }; vm.createContext(ctx); vm.runInContext(src + ";this.f=xqShareBase", ctx); return ctx.f() };
  for (const [h, nat] of [["http://127.0.0.1:47822/index.html", true], ["capacitor://localhost/index.html", true], ["https://localhost/index.html", true], ["https://localhost:8443/", false], ["http://192.168.1.5:8080/m.html", false], ["https://app.localhost/", false]]) {
    const b = run(h, nat); assert.equal(b, APP, h); assert.ok(!/127\.0\.0\.1|localhost/.test(b));
  }
  assert.equal(run("https://raysonchen2023-cloud.github.io/xiangqi-lab/", false), APP, "網頁版正式網址");
  assert.equal(run("https://xiangqi-cdn.pages.dev/test/", false), "https://xiangqi-cdn.pages.dev/test/", "別的 https 公開網址照用");
  /* 教練作業、分享局面：模擬原生環境實際組一次連結 */
  const C = M("10d-coach.js");
  assert.ok(C.includes('url=xqShareBase()+"#/hw/"+code,') && C.includes("const u=posRShareUrl(xqShareBase(),C.fen(b,side));"));
  const pr = vm.runInNewContext(between(C, "const posRShareUrl=", ";\n").replace("const posRShareUrl=", ""));
  const base = run("http://127.0.0.1:47822/index.html#/coach", true);
  const hw = base + "#/hw/" + "XQHW1.abc", pos = pr(base, "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w");
  for (const u of [hw, pos]) { assert.ok(!/127\.0\.0\.1|localhost/.test(u), u); assert.ok(u.startsWith(APP)) }
  assert.ok(pos.startsWith(APP + "#/pos?fen="));
});

test("P1-2 全站：組分享連結的地方不再直接用 location.href／location.origin", () => {
  const all = fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js"));
  for (const f of all) { const s = M(f);
    assert.ok(!/location\.href\.split\("#"\)\[0\]\+"#\//.test(s), f + "：location.href 組連結");
    assert.ok(!/posRShareUrl\(location\.href/.test(s), f);
    assert.ok(!/location\.origin\+location\.pathname\+`#connect=/.test(s), f + "：連線邀請");
    assert.ok(!/const app=\/\^https:\/\.test\(location\.origin\)/.test(s), f + "：連線 QR");
  }
  const S = M("02-shell.js"); assert.ok(S.includes('const app=(OFF?xqShareBase():APP_HOME)+"?openExternalBrowser=1";') && S.includes("const app=xqShareBase(),u="));
  assert.ok(M("09b-preload.js").includes("return xqShareBase()+`#connect="));
  assert.ok(M("07dq-daily.js").includes("function dqBase(){"), "每日同題本來就對（dqBase）");
});

test("P2：商店描述照實寫「錯棋重練」只收跟電腦對局裡走錯的步（中英）", { skip: SKIP_STORE }, () => {
  const T = rd("xiangqi-ios/appstore/metadata.md");
  assert.ok(!T.includes("錯題會回來讓你複習") && !T.includes("mistakes come back for review"));
  assert.ok(T.includes("跟電腦對局裡走錯的那幾步，會收進「錯棋重練」讓你再練一次"));
  assert.ok(T.includes('moves you got wrong in games against the computer are saved to "Mistake drills" so you can practice them again'));
  assert.ok(M("09-askbot.js").includes("和電腦下完，App 會把你走錯的局面收進「錯棋重練」"), "跟 App 內說法一致");
});
