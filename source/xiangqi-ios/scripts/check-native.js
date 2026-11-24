#!/usr/bin/env node
/* 原生碼原始碼比對檢查（Windows 上就能跑，不用編譯 Swift）。
   11/17 App Store 審查（iMac 測試員）兩個 P1 修完後加的，防止之後改回去：
     1. native/ios/ 和 ios/App/App/ 的 XQLoopbackServer.swift、XQBridgeViewController.swift 兩份要一模一樣
     2. 埠號還是 47821（改了玩家存檔就不見）
     3. 有 /__xq_whoami 一次性考題驗證；位址被占用時不改綁萬用位址；不再設 acceptLocalOnly
     4. 畫面：驗證通過才 loadWebView()；viewDidLoad 不呼叫 super（Capacitor 的 super 會直接載入）；
        沒有 0.5 秒的無限重跳、沒有 UIAlertController；自動重試 1、2、4 秒；錯誤畫面中英都有
     5. node_modules 裡 Capacitor 的 viewDidLoad 還是只有 super.viewDidLoad()＋loadWebView()（不然第 4 點的假設就不成立）
     6. 兩支 Swift 的括號配對（跳過字串、註解、字串內插），抓明顯的打字錯誤
   用法：node scripts/check-native.js */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const HERE = path.join(__dirname, "..");
const SRC = path.join(HERE, "native", "ios");
const APP = path.join(HERE, "ios", "App", "App");
const bad = [], warn = [], ok = [];
const rd = p => fs.readFileSync(p, "utf8").replace(/\r\n?/g, "\n");
const sha = s => crypto.createHash("sha256").update(s).digest("hex");
function check(cond, msg) { (cond ? ok : bad).push(msg); }

/* Swift 粗略斷詞：回傳「只剩程式碼」的文字（註解、字串內容換成空白，字串內插的程式碼保留），並檢查括號配對 */
function swiftCode(src, name) {
  let i = 0, out = "";
  const stack = [], pairs = { ")": "(", "]": "[", "}": "{" };
  const line = () => src.slice(0, i).split("\n").length;
  function err(m) { bad.push(name + " 第 " + line() + " 行附近：" + m); }
  function code(stopAtParen) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "/" && n === "*") {
        let d = 0;
        while (i < src.length) {
          if (src[i] === "/" && src[i + 1] === "*") { d++; i += 2; continue; }
          if (src[i] === "*" && src[i + 1] === "/") { d--; i += 2; if (d === 0) break; continue; }
          i++;
        }
        out += " ";
        continue;
      }
      if (c === "\"" || (c === "#" && /^#+"/.test(src.slice(i, i + 8)))) { str(); continue; }
      if (stopAtParen && c === "(") depth++;
      if (stopAtParen && c === ")") { if (depth === 0) { i++; out += ")"; return; } depth--; }
      if ("([{".includes(c)) stack.push([c, line()]);
      if (")]}".includes(c)) {
        const t = stack.pop();
        if (!t || t[0] !== pairs[c]) { err("括號不配對：多了或錯了「" + c + "」"); return; }
      }
      out += c; i++;
    }
    if (stopAtParen) err("字串內插 \\( 沒有收尾");
  }
  function str() {
    let hashes = 0;
    while (src[i] === "#") { hashes++; i++; }
    const multi = src.startsWith("\"\"\"", i);
    const close = (multi ? "\"\"\"" : "\"") + "#".repeat(hashes);
    i += multi ? 3 : 1;
    out += "\"";
    const esc = "\\" + "#".repeat(hashes);
    while (i < src.length) {
      if (src.startsWith(close, i)) { i += close.length; out += "\""; return; }
      if (!multi && src[i] === "\n") { err("字串沒有收尾"); return; }
      if (src.startsWith(esc, i)) {
        i += esc.length;
        if (src[i] === "(") { i++; out += "("; code(true); continue; }
        i++; continue;
      }
      i++;
    }
    err("字串到檔尾還沒收尾");
  }
  code(false);
  for (const [c, l] of stack) bad.push(name + "：第 " + l + " 行的「" + c + "」沒有收尾");
  return out;
}

/* 取出 code 裡「func 名稱(…) {…}」的函式本體 */
function body(code, sig) {
  const at = code.indexOf(sig);
  if (at < 0) return null;
  const open = code.indexOf("{", at);
  let d = 0;
  for (let j = open; j < code.length; j++) {
    if (code[j] === "{") d++;
    else if (code[j] === "}") { d--; if (d === 0) return code.slice(open + 1, j); }
  }
  return null;
}
const count = (s, sub) => s.split(sub).length - 1;

/* 1. 兩份一樣 */
const files = {};
for (const f of ["XQLoopbackServer.swift", "XQBridgeViewController.swift"]) {
  const a = path.join(SRC, f), b = path.join(APP, f);
  if (!fs.existsSync(a)) { bad.push("找不到 " + a); continue; }
  const sa = rd(a);
  files[f] = sa;
  if (!fs.existsSync(b)) warn.push("ios/App/App/ 還沒有 " + f + "（先跑 node scripts/install-native.js）");
  else check(rd(b) === sa, f + " 兩份相同（sha256 " + sha(sa).slice(0, 12) + "…）");
}
const srv = files["XQLoopbackServer.swift"] || "", vc = files["XQBridgeViewController.swift"] || "";
const srvCode = swiftCode(srv, "XQLoopbackServer.swift"), vcCode = swiftCode(vc, "XQBridgeViewController.swift");

/* 2. 埠號 */
check(/static let port: UInt16 = 47821\b/.test(srvCode), "埠號還是 47821");

/* 3. 伺服器驗證 */
check(srv.includes("static let whoamiPath = \"/__xq_whoami\""), "有 /__xq_whoami 驗證端點");
check(srvCode.includes("SystemRandomNumberGenerator"), "考題／答案用系統亂數");
check(/func issueChallenge\(\)/.test(srvCode) && /func takeAnswer\(for c: String\)/.test(srvCode), "有一次性考題（issueChallenge／takeAnswer）");
const tk = body(srvCode, "func takeAnswer(for c: String)") || "";
check(tk.includes("challenges.removeValue(forKey: c)"), "考題查過就作廢（一次性）");
const hw = body(srvCode, "private func handleWhoami(") || "";
check(hw.includes("takeAnswer(for: challenge)") && hw.includes("let a = answer"), "whoami 只回這次考題的答案");
const est = body(srvCode, "private func establishNow()") || "";
/* 11/23 iOS 金絲雀：只數 verifyNow( 的次數，寫成「true || verifyNow(…)」就繞過了。
   #127 審查（Windows Claude 2，新代理人 23 種改法）：只數次數也擋不住「return .verified 搬到 if 外面、else、guard、case」和「在 establishNow 裡另宣告一個 verifyNow 蓋掉」。改成比對結構：
   ① verifyNow 這個字（\b 邊界，中間夾空白、註解都算）只能以「if verifyNow(timeout: 秒) {」出現，至少 2 次；
   ② 每個這種 if 區塊裡都要有 return .verified，區塊後面不能接 else；
   ③ 把這些 if 區塊整段拿掉後，establishNow 剩下的文字不能再有 .verified；
   ④ establishNow 裡不能宣告 func verifyNow，整份伺服器程式也只能有一個 func verifyNow */
const vBlocks = [], vIfRe = /\bif\s+verifyNow\(timeout:\s*[\d.]+\)\s*\{/g;
for (let m; (m = vIfRe.exec(est));) {
  const open = m.index + m[0].length - 1; let d = 0, close = -1;
  for (let j = open; j < est.length; j++) { if (est[j] === "{") d++; else if (est[j] === "}") { d--; if (d === 0) { close = j; break } } }
  vBlocks.push({ start: m.index, end: close < 0 ? est.length : close + 1, inner: close < 0 ? "" : est.slice(open + 1, close) });
}
const vRest = vBlocks.reduceRight((t, b) => t.slice(0, b.start) + " " + t.slice(b.end), est);
const vTok = (est.match(/\bverifyNow\b/g) || []).length;
check(vBlocks.length >= 2 && vTok === vBlocks.length
  && vBlocks.every((b) => /\breturn\s+\.verified\b/.test(b.inner) && !/^\s*else\b/.test(est.slice(b.end)))
  && !/\.verified\b/.test(srvCode.replace(est, vRest))   /* #127 複審：不只 establishNow 剩下的部分，整份伺服器程式在合格的 if 區塊以外都不能出現 .verified（擋「private func ok() -> Outcome { .verified }」再 return ok()、Outcome.verified、static let） */
  && !/\bfunc\s+verifyNow\b/.test(est) && (srvCode.match(/\bfunc\s+verifyNow\b/g) || []).length === 1,
  "establish 一定經過 verifyNow 才回 verified");
check(!/return \.verified/.test(srvCode.replace(est, "")), "verified 只會從 establishNow 回");
/* #127、#135 審查（Windows Claude 2）：establish 只確認「一定經過 verifyNow」，verifyNow 本體寫成 return true 也會過。本體要真的去問 whoami、比對答案：
   ① 發一題考題（issueChallenge），網址帶 whoamiPath + "?c=" + 考題；② 期待值是這題的答案；③ 回應要 200，內容去掉空白後等於期待值才算過；④ 有送出請求（task.resume）；
   ⑤ 本體裡帶值的 return 只能是 false 或 passed.value（不能 return true、不能回別的東西），而且至少有一個 return passed.value */
const vfy = body(srvCode, "private func verifyNow(timeout: TimeInterval) -> Bool") || "", vfyRaw = body(srv, "private func verifyNow(timeout: TimeInterval) -> Bool") || "";
const vfyRet = [...vfy.matchAll(/\breturn\s+([^\s};]+)/g)].map((m) => m[1]);
check(vfy.includes("let ch = issueChallenge()") && vfyRaw.includes("XQLoopbackServer.whoamiPath + \"?c=\" + ch.challenge")
  && vfy.includes("let expected = ch.answer") && vfy.includes("http.statusCode == 200")
  && vfy.includes("passed.value = body.trimmingCharacters(in: .whitespacesAndNewlines) == expected") && vfy.includes("task.resume()")
  && vfyRet.length > 0 && vfyRet.every((v) => v === "false" || v === "passed.value") && vfyRet.includes("passed.value"),
  "verifyNow 真的去問 whoami、比對這題的答案才回通過（不能直接 return true）");
const sl = body(srvCode, "private func startListening(") || "";
check(/if exact == \.inUse \{\s*return \.inUse\s*\}/.test(sl), "位址被占用時不改綁萬用位址");
check(srvCode.includes("EADDRINUSE"), "有判斷 EADDRINUSE");
check(!/acceptLocalOnly\s*=\s*true/.test(srvCode), "沒有 acceptLocalOnly = true（11/16 模擬器會擋掉 127.0.0.1）");
check(/params\.requiredInterfaceType = \.loopback/.test(srvCode), "只聽 loopback 介面");
check(srvCode.includes("a.isLoopback") && srvCode.includes("conn.cancel(); return"), "accept() 仍檢查來源位址");
check(srvCode.includes("putLeftover(conn, rest)") && srvCode.includes("readRequest(conn, buffer: rest)"), "leftover 位元組修正還在");

/* 4. 畫面 */
const vdl = body(vcCode, "override func viewDidLoad()");
check(vdl !== null && !vdl.includes("super.viewDidLoad"), "viewDidLoad 不呼叫 super（不讓 Capacitor 直接載入）");
check(vdl !== null && vdl.includes("runCheck()"), "viewDidLoad 先開伺服器＋驗證");
check(count(vcCode, "loadWebView()") === 1, "loadWebView() 只出現一次");
const lvp = body(vcCode, "private func loadVerifiedPage()") || "";
check(lvp.includes("loadWebView()") && lvp.includes("self.phase == .running"), "loadWebView() 只在 loadVerifiedPage 裡、而且要 phase == .running");
const hd = body(vcCode, "private func handle(") || "";
const vb = body(hd, "if outcome == .verified") || "";
check(count(vcCode, "loadVerifiedPage()") === 2 && vb.includes("loadVerifiedPage()"), "只有驗證通過（outcome == .verified）才呼叫 loadVerifiedPage");
check(count(vcCode, "phase = .running") === 1 && vb.includes("phase = .running"), "只有驗證通過才進 running");
check(!/\.load\(URLRequest|loadFileURL|\.load\(\s*req/.test(vcCode), "畫面沒有其他直接載入網頁的地方");
check(!/\b0\.5\b/.test(vcCode), "沒有 0.5 秒的重跳");
check(!vcCode.includes("UIAlertController") && !vcCode.includes("showRetry"), "沒有一直重跳的提示視窗（UIAlertController／showRetry）");
check(vcCode.includes("retryDelays: [TimeInterval] = [1, 2, 4]"), "自動重試 1、2、4 秒");
check(/retryIndex < retryDelays\.count/.test(hd) && /phase = \.failed/.test(hd), "自動重試有上限，用完才顯示錯誤畫面");
const rt = body(vcCode, "@objc private func retryTapped()") || "";
check(rt.includes("retryIndex = retryDelays.count"), "手動「重試」只試一次，不會自己連跳");
check(vc.includes("另一個 App 占用了") && vc.includes("Another app is using"), "錯誤畫面中英文都有");
check(vc.includes("請關閉其他 App") && vc.includes("Close other apps"), "錯誤畫面有處理方式");
check(vcCode.includes("WKWebsiteDataTypeDiskCache") && !/WKWebsiteDataType(LocalStorage|IndexedDBDatabases)/.test(vcCode), "載入前只清 HTTP 快取，不動存檔");
check(vcCode.includes("UIApplication.willEnterForegroundNotification") && vcCode.includes("onBroken"), "回前景／監聽壞掉會重驗");
check(vc.includes("NSLog(\"[XQLoopback] 回前景重驗通過") && /if self\.phase == \.running \{ self\.foregroundRecheck = true \}/.test(vc), "回前景重驗通過時 console 印一行（11/17 iMac 建議，方便確認）");

/* 5. Capacitor 假設 */
const capP = path.join(HERE, "node_modules", "@capacitor", "ios", "Capacitor", "Capacitor", "CAPBridgeViewController.swift");
if (!fs.existsSync(capP)) warn.push("找不到 " + capP + "，沒辦法確認 Capacitor 的 viewDidLoad");
else {
  const cap = swiftCode(rd(capP), "CAPBridgeViewController.swift");
  const b = (body(cap, "override open func viewDidLoad()") || "").replace(/\s+/g, "");
  check(b === "super.viewDidLoad()loadWebView()", "Capacitor 的 viewDidLoad 只有 super.viewDidLoad()＋loadWebView()（不呼叫 super 是安全的）");
  check(/public final func loadWebView\(\)/.test(cap), "Capacitor 的 loadWebView() 子類別叫得到");
}

/* install-native.js 會複製這兩支 */
const inst = rd(path.join(__dirname, "install-native.js"));
check(inst.includes("\"XQLoopbackServer.swift\"") && inst.includes("\"XQBridgeViewController.swift\""), "install-native.js 會複製兩支 Swift");

/* 控制字元 */
for (const [f, s] of Object.entries(files)) {
  const m = s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
  check(!m, f + " 沒有控制字元");
}

/* 7. 11/17 Game Center、今日茶單小工具（native/ios/XQGameCenterPlugin.swift、XQWidgetDataPlugin.swift、native/ios-widget/）
   11/18 起外掛由 XQBridgeViewController.swift 的 capacitorDidLoad() 註冊（NSClassFromString 找得到才註冊；npx cap sync 重寫 packageClassList 也不影響），install-native.js --gc-widget 只複製檔案 */
{
  const WSRC = path.join(HERE, "native", "ios-widget");
  const PLUG = [
    { file: "XQGameCenterPlugin.swift", cls: "XQGameCenterPlugin", js: "XQGameCenter" },
    { file: "XQWidgetDataPlugin.swift", cls: "XQWidgetDataPlugin", js: "XQWidgetData" },
  ];
  const GROUP = "group.com.raysonchen.xiangqiqianqiu.shared", SCHEME = "xqqianqiu";
  const WEB = path.join(HERE, "..", "xiangqi-db", "m", "07gc-native.js");
  const web = fs.existsSync(WEB) ? rd(WEB) : null;
  if (!web) warn.push("找不到 " + WEB + "，沒辦法比對網頁端呼叫的方法名稱");
  const pbxP = path.join(HERE, "ios", "App", "App.xcodeproj", "project.pbxproj");
  const installed = fs.existsSync(pbxP) && rd(pbxP).includes("/* XQGameCenterPlugin.swift */");
  const srcs = {};
  for (const p of PLUG) {
    const a = path.join(SRC, p.file);
    if (!fs.existsSync(a)) { bad.push("找不到 " + a); continue; }
    const s = rd(a), c = swiftCode(s, p.file);
    srcs[p.file] = s;
    const b = path.join(APP, p.file);
    if (fs.existsSync(b)) check(rd(b) === s, p.file + " 兩份相同（sha256 " + sha(s).slice(0, 12) + "…）");
    else if (installed) bad.push("pbxproj 已登記 " + p.file + "，但 ios/App/App/ 沒有這個檔（再跑 node scripts/install-native.js）");
    else warn.push("ios/App/App/ 還沒有 " + p.file + "（等付費開發者帳號通過後跑 node scripts/install-native.js --gc-widget）");
    check(s.includes("@objc(" + p.cls + ")") && c.includes("class " + p.cls + ": CAPPlugin, CAPBridgedPlugin"), p.cls + "：@objc 名稱和 CAPPlugin＋CAPBridgedPlugin 對得上（XQBridgeViewController 用 NSClassFromString 找）");
    check(s.includes("public let identifier = \"" + p.cls + "\"") && s.includes("public let jsName = \"" + p.js + "\""), p.cls + "：identifier＝" + p.cls + "、jsName＝" + p.js);
    const listed = [...s.matchAll(/CAPPluginMethod\(name: "(\w+)", returnType: CAPPluginReturnPromise\)/g)].map(m => m[1]);
    const funcs = [...c.matchAll(/@objc func (\w+)\(_ call: CAPPluginCall\)/g)].map(m => m[1]);
    check(listed.length > 0 && listed.every(n => funcs.includes(n)) && funcs.every(n => listed.includes(n)), p.cls + "：pluginMethods（" + listed.join("、") + "）每個都有 @objc func，沒有漏登記的");
    if (web) {
      const used = [...web.matchAll(new RegExp("gcnCall\\(\"" + p.js + "\",\"(\\w+)\"", "g"))].map(m => m[1]);
      check(used.length > 0 && used.every(n => listed.includes(n)), "07gc-native.js 呼叫 " + p.js + " 的方法（" + [...new Set(used)].join("、") + "）外掛都有");
    }
    check(!/URLSession|URLRequest|https?:\/\//.test(c), p.file + "：沒有網路程式（不送資料）");
    check(!/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(s), p.file + " 沒有控制字元");
  }
  const gc = srcs["XQGameCenterPlugin.swift"] || "";
  check(/authenticateHandler/.test(gc) && !/present\(\s*viewController/.test(gc) && /self\.loginVC = viewController/.test(gc), "Game Center 登入：開 App 不主動跳登入畫面（先收著，玩家按 showDashboard 才顯示）");
  check(!/playerID|gamePlayerID|teamPlayerID|displayName|alias/.test(swiftCode(gc, "XQGameCenterPlugin.swift")), "Game Center：不讀、不回傳玩家 ID 或暱稱");
  const wd = srcs["XQWidgetDataPlugin.swift"] || "";
  check(wd.includes("WidgetCenter.shared.reloadAllTimelines()") && wd.includes("forSecurityApplicationGroupIdentifier"), "XQWidgetData：寫 App Group 後請小工具重畫");
  check(wd.includes("rel.contains(\"..\")") && wd.includes("hasPrefix(\"data/\")"), "XQWidgetData：圖只收安裝包 data/ 底下、不收「..」");
  /* 小工具 */
  const wf = path.join(WSRC, "XQTodayWidget.swift");
  if (!fs.existsSync(wf)) bad.push("找不到 " + wf);
  else {
    const w = rd(wf), wc = swiftCode(w, "XQTodayWidget.swift");
    check(/@main\s+struct XQWidgetBundle: WidgetBundle/.test(wc) && wc.includes(".supportedFamilies([.systemSmall, .systemMedium])"), "小工具：有 @main、小中兩種尺寸");
    check(w.includes("static let openURL = URL(string: \"" + SCHEME + "://canju\")") && wc.includes(".widgetURL(XQWidgetConfig.openURL)"), "小工具：點了開 " + SCHEME + "://canju");
    check(!/URLSession|URLRequest|https?:\/\//.test(wc), "小工具：沒有網路程式");
    check(!/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(w), "XQTodayWidget.swift 沒有控制字元");
    for (const k of ["dataFile = \"today.json\"", "imageFile = \"today.jpg\""]) check(w.includes(k) && wd.includes(k), "小工具和 XQWidgetData 的檔名一樣：" + k);
    const groups = [wd, w, rd(path.join(SRC, "App.entitlements")), rd(path.join(WSRC, "XQTodayWidget.entitlements"))];
    check(groups.every(s => s.includes(GROUP)) && groups.every(s => (s.match(/group\.com\.[\w.]+/g) || []).every(g => g === GROUP)), "App Group 四處一樣：" + GROUP);
    check(rd(path.join(SRC, "App.entitlements")).includes("com.apple.developer.game-center"), "App.entitlements 有 Game Center");
    check(rd(path.join(WSRC, "Info.plist")).includes("com.apple.widgetkit-extension"), "小工具 Info.plist 是 widgetkit-extension");
  }
  if (web) check(web.includes("xqqianqiu:\\/\\/") && web.includes("\"canju\":\"#/canju\""), "07gc-native.js 收 " + SCHEME + "://canju → #/canju");
  if (web) check(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\b|shareIRT/.test(web), "07gc-native.js 不連網、不送資料");
  /* install-native.js */
  check(inst.includes("\"--gc-widget\"") && inst.includes("\"XQGameCenterPlugin.swift\"") && inst.includes("\"XQWidgetDataPlugin.swift\"")
    && inst.includes("\"XQGameCenterPlugin\", \"XQWidgetDataPlugin\"") && inst.includes("const URL_SCHEME = \"" + SCHEME + "\""), "install-native.js --gc-widget：複製兩支外掛、加網址 " + SCHEME);
  /* 已經裝了：packageClassList 不再列這兩支（改由 XQBridgeViewController 註冊，列了會註冊兩次）、也沒有重複的 */
  const cfgP = path.join(APP, "capacitor.config.json");
  if (installed) {
    let list = [];
    try { list = JSON.parse(rd(cfgP)).packageClassList || []; } catch (e) {}
    check(PLUG.every(p => !list.includes(p.cls)) && new Set(list).size === list.length, "packageClassList 沒有 XQGameCenterPlugin、XQWidgetDataPlugin（改由 XQBridgeViewController 註冊），也沒有重複的");
    check(rd(path.join(APP, "Info.plist")).includes("<string>" + SCHEME + "</string>"), "Info.plist 有網址 " + SCHEME + "://");
  } else warn.push("Game Center／小工具外掛還沒裝進 Xcode 專案（等付費開發者帳號通過，見 notes/gamecenter-setup.md、notes/widget-setup.md）");
  /* 11/18 iMac 套用 1041：cap sync 會重寫 packageClassList → 外掛改在 XQBridgeViewController 的 capacitorDidLoad() 註冊 */
  {
    const dl = vcCode.indexOf("override func capacitorDidLoad()"), body = dl < 0 ? "" : vcCode.slice(dl, vcCode.indexOf("\n    }", dl));
    const raw = vc.slice(vc.indexOf("override func capacitorDidLoad()"), vc.indexOf("\n    }", vc.indexOf("override func capacitorDidLoad()")));   /* 原文（swiftCode 會把字串內容換成空白） */
    check(dl >= 0 && /super\.capacitorDidLoad\(\)/.test(body) && /bridge\?\.registerPluginInstance\(XQSpeechPlugin\(\)\)/.test(body), "XQBridgeViewController：capacitorDidLoad() 直接註冊 XQSpeechPlugin（registerPluginInstance，cap sync 不影響）");
    check(raw.includes("for name in [\"XQGameCenterPlugin\", \"XQWidgetDataPlugin\"]") && /NSClassFromString\(name\) as\? CAPPlugin\.Type/.test(body) && /registerPluginInstance\(type\.init\(\)\)/.test(body), "XQBridgeViewController：Game Center、小工具有編進 App 才註冊（NSClassFromString）");
    check((vcCode.match(/registerPluginInstance\(/g) || []).length === 2 && !/registerPluginType|registerPlugin\(/.test(vcCode), "XQBridgeViewController：只在 capacitorDidLoad 註冊這兩處，沒有別的註冊方式");
    const CAPD = path.join(HERE, "node_modules", "@capacitor", "ios", "Capacitor", "Capacitor"), CAPVC = path.join(CAPD, "CAPBridgeViewController.swift"), CAPBR = path.join(CAPD, "CapacitorBridge.swift");
    const cv = fs.existsSync(CAPVC) ? rd(CAPVC) : "";
    if (cv) check(/capacitorBridge = CapacitorBridge\([\s\S]{0,400}\)\s*capacitorDidLoad\(\)/.test(cv.slice(cv.indexOf("func loadView()"))) && /public func registerPluginInstance\(_ pluginInstance: CAPPlugin\)/.test(rd(CAPBR)), "Capacitor（node_modules）：loadView 建好 bridge 就呼叫 capacitorDidLoad、有 registerPluginInstance（viewDidLoad 沒叫 super 也照樣會註冊）");
    else warn.push("找不到 node_modules 的 CAPBridgeViewController.swift，沒辦法確認 capacitorDidLoad 的呼叫點");
  }
}

/* 8. 11/18 語音報棋外掛 XQSpeech（native/ios/XQSpeechPlugin.swift）：AVSpeechSynthesizer 在自己的序列佇列朗讀，不碰主執行緒（11/17 主執行緒卡 60 秒的那次）；
   預設就裝（install-native.js 的 FILES、BASE_CLASSES），不需要付費帳號、不需要權限 */
{
  const f = path.join(SRC, "XQSpeechPlugin.swift");
  if (!fs.existsSync(f)) bad.push("找不到 " + f);
  else {
    const s = rd(f), c = swiftCode(s, "XQSpeechPlugin.swift");
    check(s.includes("@objc(XQSpeechPlugin)") && c.includes("class XQSpeechPlugin: CAPPlugin, CAPBridgedPlugin") && s.includes("public let identifier = \"XQSpeechPlugin\"") && s.includes("public let jsName = \"XQSpeech\""), "XQSpeech：@objc 名稱、identifier、jsName 對得上");
    const listed = [...s.matchAll(/CAPPluginMethod\(name: "(\w+)", returnType: CAPPluginReturnPromise\)/g)].map(m => m[1]);
    const funcs = [...c.matchAll(/@objc func (\w+)\(_ call: CAPPluginCall\)/g)].map(m => m[1]);
    check(["speak", "stop", "isAvailable"].every(n => listed.includes(n) && funcs.includes(n)) && funcs.every(n => listed.includes(n)), "XQSpeech：speak、stop、isAvailable 都有登記也都有 @objc func");
    const sp = s.slice(s.indexOf("@objc func speak("), s.indexOf("@objc func stop("));   /* 用原文（swiftCode 會把字串內容換成空白，["ok": true] 就認不出來） */
    check(/private let work = DispatchQueue\(label: "xq\.speech"/.test(s) && sp.indexOf("call.resolve([\"ok\": true])") >= 0 && sp.indexOf("call.resolve([\"ok\": true])") < sp.indexOf("work.async") && /work\.async[\s\S]*s\.speak\(u\)/.test(sp), "XQSpeech：先回傳，朗讀放在自己的序列佇列（work.async 裡才 speak）");
    check(!/DispatchQueue\.main|\.main\.async|MainActor/.test(c), "XQSpeech：沒有任何工作丟回主執行緒");
    check(/work\.asyncAfter\(deadline: \.now\(\) \+ [\d.]+\)[\s\S]{0,200}ensureSynth\(\)[\s\S]{0,80}voice\(for: "zh"\)/.test(s) && /work\.asyncAfter/.test(c), "XQSpeech：App 啟動後在背景佇列先初始化（建立朗讀器、取語音），不等第一次吃子");
    check(/AVSpeechSynthesisVoice\(language: w\)/.test(c) && s.includes("[\"zh-TW\", \"zh-Hant\", \"zh-HK\"]") && s.includes("[\"en-US\", \"en-GB\", \"en\"]") && /guard let v = self\.voice\(for: key\) else \{ return \}/.test(c), "XQSpeech：語言 zh-TW → zh-Hant → zh-HK、en-US → en-GB → en；找不到語音就不出聲");
    check(/setCategory\(\.ambient/.test(c) && /usesApplicationAudioSession = true/.test(c), "XQSpeech：AVAudioSession 用 .ambient（跟靜音開關、跟別的 App 的音樂混音），usesApplicationAudioSession＝true");
    check((c.match(/setCategory\(/g) || []).length === 1 && c.indexOf("setCategory(") < c.indexOf("@objc func speak("), "XQSpeech：音訊類別只在外掛載入時設一次（朗讀前不重設，不改配樂播放時的設定）");
    check(/UIApplication\.didEnterBackgroundNotification/.test(c) && /stopSpeaking\(at: \.immediate\)/.test(c.slice(c.indexOf("private func stopAll()"))), "XQSpeech：進背景 stopSpeaking(at: .immediate)，清掉排隊的（回前景不補念）");
    check(!/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\/\//.test(c), "XQSpeech：不要權限、沒有網路程式（朗讀在手機上處理）");
    check(!/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(s), "XQSpeechPlugin.swift 沒有控制字元");
    check(inst.includes("{ name: \"XQSpeechPlugin.swift\", type: \"sourcecode.swift\", phase: \"Sources\" }") && inst.includes("const BASE_CLASSES = [\"XQSpeechPlugin\"];") && !/packageClassList = list.concat/.test(inst) && inst.includes("cfg.packageClassList = list.filter(c => !OURS.includes(c));"), "install-native.js：預設就複製 XQSpeechPlugin；packageClassList 不再加、舊版加的會清掉（註冊改在 XQBridgeViewController）");
    const pbxP = path.join(HERE, "ios", "App", "App.xcodeproj", "project.pbxproj"), b = path.join(APP, "XQSpeechPlugin.swift");
    if (fs.existsSync(pbxP) && rd(pbxP).includes("/* XQSpeechPlugin.swift */")) {
      check(fs.existsSync(b) && rd(b) === s, "XQSpeechPlugin.swift 兩份相同");
      let list = []; try { list = JSON.parse(rd(path.join(APP, "capacitor.config.json"))).packageClassList || []; } catch (e) {}
      check(!list.includes("XQSpeechPlugin") && new Set(list).size === list.length, "packageClassList 沒有 XQSpeechPlugin（改由 XQBridgeViewController 註冊，免得兩次）、沒有重複的");
    } else warn.push("XQSpeechPlugin 還沒裝進 Xcode 專案（跑 node scripts/install-native.js）");
    const B1 = path.join(HERE, "..", "xiangqi-db", "m", "01-board.js");
    if (fs.existsSync(B1)) { const w = rd(B1); check(w.includes("N.has(\"XQSpeech\")") && /plug\("XQSpeech"\)[\s\S]{0,80}\.speak\(\{text:/.test(w), "01-board.js：原生版有 XQSpeech 就用它（沒有才退回 speechSynthesis）"); }
  }
}

for (const m of ok) console.log("✔ " + m);
for (const m of warn) console.log("⚠ " + m);
for (const m of bad) console.error("✘ " + m);
console.log(bad.length ? `\n${bad.length} 項沒過` : `\n全部 ${ok.length} 項通過`);
process.exit(bad.length ? 1 : 0);
