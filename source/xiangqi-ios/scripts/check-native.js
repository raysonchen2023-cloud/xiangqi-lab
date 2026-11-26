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

/* Swift 粗略斷詞：回傳「只剩程式碼」的文字（註解、字串內容換成空白，字串內插的程式碼保留），並檢查括號配對。
   keep＝true（#143 審查：#142 自己寫的 stripComments 不認得 #"…"#、""" 多行字串，會被騙）：去掉註解但字串內容照留、不回報錯誤——給鎖住四段的雜湊用，跟斷詞走同一套字串規則 */
function swiftCode(src, name, keep) {
  const SWIFT_KW = new Set("true false nil self Self super return if else guard switch case default for while repeat in do try catch throw throws rethrows func class struct enum protocol extension let var init deinit subscript typealias import static private fileprivate internal public open final lazy weak unowned inout as is some any where defer break continue fallthrough await async".split(" "));
  let i = 0, out = "";
  const stack = [], pairs = { ")": "(", "]": "[", "}": "{" };
  const line = () => src.slice(0, i).split("\n").length;
  function err(m) { if (!keep) bad.push(name + " 第 " + line() + " 行附近：" + m); }
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
      /* #144 複審：反引號識別字（SE-0451 原始識別字，Swift 5 模式也收）裡可以放 "、//、/*、#endif，不能當字串、註解、條件編譯。
         吃到同一行的下一個反引號；`名字` 跟 名字 是同一個識別字，所以一般名字拿掉反引號照原樣輸出，其他內容換成 _rawid_（兩種模式都一樣，雜湊、計數才看得到同一份） */
      if (c === "`") {
        const e = src.indexOf("`", i + 1), nl = src.indexOf("\n", i + 1);
        if (e < 0 || (nl >= 0 && nl < e)) { err("反引號識別字沒有在同一行收尾"); i++; continue; }
        const id = src.slice(i + 1, e);
        out += /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id) && !SWIFT_KW.has(id) ? id : "_rawid_";   /* #144 第二輪審查：`false` 是一般識別字，還原成 false 會跟關鍵字混在一起 */
        i = e + 1; continue;
      }
      /* #144 審查：原本只往後看 8 個字元，9 個以上 # 的原始字串認不到；改成不設上限。擴充正規式 #/…/#（Swift 5.7 起，# 數要配對）也要認，裡面的引號、// 不是字串、不是註解 */
      if (c === "#") { const m = /#+(["/])/y; m.lastIndex = i; const h = m.exec(src); if (h && h[1] === "/") { regex(h[0].length - 1); continue; } if (h) { str(); continue; } }
      if (c === "\"") { str(); continue; }
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
  function regex(hashes) {   /* #/…/#、##/…/##：到「/」加同樣多的 # 才收；反斜線跳脫下一個字元；keep 模式照留，否則換成 "" */
    const open = src.slice(i, i + hashes + 1), close = "/" + "#".repeat(hashes);
    i += hashes + 1;
    let body = "";
    while (i < src.length) {
      if (src.startsWith(close, i)) { i += close.length; out += keep ? open + body + close : "\"\""; return; }
      if (src[i] === "\\") { body += src.slice(i, i + 2); i += 2; continue; }
      body += src[i]; i++;
    }
    err("正規式到檔尾還沒收尾");
  }
  function str() {
    let hashes = 0;
    while (src[i] === "#") { hashes++; i++; }
    const multi = src.startsWith("\"\"\"", i);
    const close = (multi ? "\"\"\"" : "\"") + "#".repeat(hashes);
    const open = src.slice(i - hashes, i + (multi ? 3 : 1));
    i += multi ? 3 : 1;
    out += keep ? open : "\"";
    const esc = "\\" + "#".repeat(hashes);
    while (i < src.length) {
      if (src.startsWith(close, i)) { i += close.length; out += keep ? close : "\""; return; }
      if (!multi && src[i] === "\n") { err("字串沒有收尾"); return; }
      if (src.startsWith(esc, i)) {
        /* #150 審查（iMac Claude 2，新代理人）：一般字串裡的「\＋換行」以前當成續行、一路吞到下一個引號；Swift 在不成立的 #if compiler() 分支裡整段略過，
           兩邊對字串邊界的認定就不同，能把真程式藏進「字串」。單行字串本來就不能這樣寫，看不懂就拒絕 */
        if (!multi && src[i + esc.length] === "\n") { err("字串裡有「\\＋換行」（看不懂就拒絕）"); return; }
        if (keep) out += esc;
        i += esc.length;
        if (src[i] === "(") { i++; out += "("; code(true); continue; }
        if (keep) out += src[i] || "";
        i++; continue;
      }
      if (keep) out += src[i];
      i++;
    }
    err("字串到檔尾還沒收尾");
  }
  code(false);
  if (!keep) for (const [c, l] of stack) bad.push(name + "：第 " + l + " 行的「" + c + "」沒有收尾");
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
/* #127、#135、#142 審查（Windows Claude 2）：establish 只確認「一定經過 verifyNow」，verifyNow 本體寫成 return true 也會過；
   #142 第一版用「必要字串＋return 開頭的字」拼湊，三元式、死碼、網址放註解、拿掉 host／port 都繞得過。改成**鎖住驗證用到的四段程式**：
   verifyNow、issueChallenge、randomHex（考題和答案的亂數來源）、XQFlag（裝結果的旗標），各自去掉註解、壓掉所有空白後比 sha256 前 16 碼。
   任何改動都會紅；真的要改這四段，要在計分規則 PR 裡一起更新下面的雜湊（審查者看得到改了什麼） */
const srvNC = swiftCode(srv, "XQLoopbackServer.swift", true), pinOf = (sig) => { const b = body(srvNC, sig); return b == null ? null : sha(b.replace(/\s+/g, "")).slice(0, 16) };
const PINS = {
  "private func verifyNow(timeout: TimeInterval) -> Bool": "941fa6c241a05fb2",
  "private func issueChallenge() -> (challenge: String, answer: String)": "8425608f62ee03b5",
  "private static func randomHex(byteCount: Int) -> String": "34264236ae65312e",
  "fileprivate final class XQFlag: @unchecked Sendable": "55977411f211d262",
};
/* #142 複審（Windows Claude 2，新代理人）：鎖住的那份要是「真的」那份，旁邊也不能另放一份同名的。
   ① 四段的簽章在去註解的原文、swiftCode 斷詞後的程式碼裡都要剛好一處（字串、原始字串裡放一份假的就不只一處）；
   ② 鎖住的段落不能在 #if 裡（前面的 #if 和 #endif 要配平）；
   ③ native/ios、ios/App/App 所有 Swift 都不能有 extension XQLoopbackServer；四個名字只能宣告一次，XQFlag 整個專案只能宣告一次（巢狀、typealias 都算） */
const nameOf = (sig) => sig.replace(/^(private |fileprivate )*(static )?(final )?(func |class )/, "").split("(")[0].split(":")[0];
const pinBad = [];
for (const [sig, h] of Object.entries(PINS)) {
  const n = nameOf(sig), at = srvCode.indexOf(sig), pre = at < 0 ? "" : srvCode.slice(0, at);
  if (count(srvNC, sig) !== 1 || count(srvCode, sig) !== 1) { pinBad.push(n + "（簽章要剛好一處）"); continue }
  if ((pre.match(/#if\b/g) || []).length !== (pre.match(/#endif\b/g) || []).length) { pinBad.push(n + "（不能放在 #if 裡）"); continue }
  if (pinOf(sig) !== h) pinBad.push(n + "（內容改過了）");
}
const swiftAll = [SRC, APP].flatMap((d) => fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(".swift")).map((f) => ({ f: path.relative(HERE, path.join(d, f)), c: swiftCode(rd(path.join(d, f)), f) })) : []);
const extAt = swiftAll.filter((x) => /\bextension\s+XQLoopbackServer\b/.test(x.c)).map((x) => x.f);
if (extAt.length) pinBad.push("extension XQLoopbackServer（" + extAt.join("、") + "）");
/* #144 第二輪審查（Windows Claude 1，新代理人）：斷詞跟 Swift 對字串邊界的認定只要差一點（例如同一行收尾的 #"""x"#、反引號 `false`）就能騙過鎖。
   這些寫法專案現在都用不到，所以「看不懂就拒絕」：多行字串 """、反引號、#/ 正規式、原始字串開頭（前面不是引號的 #"；"#" 這種字元常值不算，
   引號緊接原始字串如 "x"#"y"# 本身編不過）一律算錯。
   #144 第四輪審查：只套 XQLoopbackServer 不夠（XQBridgeViewController 也能藏 extension、第二個 XQFlag），改成 native/ios、ios/App/App 底下每一份 Swift（含子資料夾）。
   整行都是 // 註解、而且不含 ＊/ 的行略過（多行字串、正規式的開頭會在別的行先被擋下，所以這種行不會落在字串裡；含 ＊/ 的可能是區塊註解的結尾，後面接真程式） */
{
  const swWalk = (d) => !fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (/^(Pods|build|DerivedData|node_modules)$/.test(e.name) ? [] : swWalk(path.join(d, e.name))) : e.name.endsWith(".swift") ? [path.join(d, e.name)] : []);
  const ODD = [[/"""/, "多行字串 \"\"\""], [/`/, "反引號"], [/#+\//, "#/ 正規式"], [/(^|[^"])#+"/m, "原始字串 #\"…\"#"], [/\\\n/, "行尾反斜線（字串續行）"]];
  /* #150 審查：條件編譯只放行專案用到的兩種條件（#if DEBUG、#if targetEnvironment(simulator)）。compiler()／swift() 這類版本條件不成立時，Swift 整段略過、不斷詞，
     斷詞卻照讀，能藏程式；其他條件（自訂旗標、os()、canImport()…）專案用不到，一樣看不懂就拒絕。#elseif 也算 */
  const IF_OK = /^!?\s*(DEBUG|targetEnvironment\(\s*simulator\s*\))$/;
  /* #150 第三輪複審：U+FEFF 這類看不見的格式字元，pinOf 的 \s 會把它去掉，Swift 卻把它當識別字的一部分（pass<FEFF>ed 跟 passed 是兩個名字，雜湊卻一樣）；
     零寬字元、軟連字號同理。跟特殊換行字元一起，整份原文直接拒絕（不改雜湊算法，PINS 不用重算） */
  const ODD_NL = /[\u2028\u2029\u0085\u000B\u000C\uFEFF\u200B-\u200F\u2060-\u2064\u00AD\u0000-\u0008\u000E-\u001F\u007F\u202A-\u202E\u2066-\u206F]/;   /* 第五輪：雙向控制字元（U+202A～202E、U+2066～206F）也一律不行 */   /* 第四輪複審順手建議：NUL 和其他 C0 控制字元（tab、換行、CR 以外）也一律不行；單獨的 CR 已被 rd() 換成換行 */   /* 第七輪審查：U+2028 這類字元 JS 跟 Swift 對「一行」的認定不同，一律不行；第八輪建議：整份原文直接檢查，不經過豁免（單獨的 \r 已被 rd() 換成換行，不用列） */
  for (const f of [...swWalk(SRC), ...swWalk(APP)]) {
    const raw = rd(f), code = raw.split("\n").filter((l) => !(/^\s*\/\//.test(l) && !l.includes("*/"))).join("\n");   /* #144 第六輪審查：在 /＊ … ＊/ 裡、以 // 開頭又含 ＊/ 的行，＊/ 後面是真程式，不能豁免；第七輪：用 includes 不用正規式的「.」（「.」不比對 U+2028／U+2029） */
    const odd = ODD.filter(([re]) => re.test(code)).map(([, n]) => n);
    /* #150 複審（iMac Claude 2，新代理人）：上一版只在行首找 #if、條件裡從 ／＊ 砍到行尾，兩種都繞得過（「#if DEBUG ／＊ x ＊／ && compiler(>=99)」、行中間的「／＊ ＊／ #if compiler(>=99)」）。
       改成：原文任何位置的 #if／#elseif 都抓，條件裡有 ／＊ 一律拒絕；斷詞後的程式碼（註解、字串都拿掉了）再找一次 #if，條件要在白名單裡 */
    for (const m of code.matchAll(/#(?:if|elseif)\b([^\n]*)/g)) { if (m[1].includes("/*")) { odd.push("條件編譯的條件裡有區塊註解"); break } const cond = m[1].replace(/\/\/.*$/, "").trim(); if (!IF_OK.test(cond)) { odd.push("條件編譯 #if " + cond); break } }
    const n0 = bad.length, tok = swiftCode(raw, path.basename(f)); bad.length = n0;   /* 只拿斷詞結果，錯誤由 swiftAll 那邊回報，這裡不重複 */
    for (const m of tok.matchAll(/#(?:if|elseif)\b([^\n]*)/g)) { const cond = m[1].trim(); if (!IF_OK.test(cond)) { odd.push("條件編譯 #if " + cond + "（斷詞後）"); break } }
    /* #150 複審：Swift 沒有字元常值，單引號不會出現在程式碼裡；但在不成立的 #if 分支裡，Swift 把字串內插裡的 ' 當成成對的引號，斷詞卻當普通字元，兩邊對字串邊界的認定不同。斷詞後還看得到 ' 就拒絕 */
    if (tok.includes("'")) odd.push("單引號（斷詞後的程式碼裡）");
    /* #150 第五輪複審：U+3164（諺文填充字）、U+034F、U+FE00 這類看不見的字元，Swift 會收進識別字（「private func ㅤtakeAnswer」跟 takeAnswer 是兩個名字），
       依名字計數、body() 都會被替身騙過。專案的 Swift 斷詞後（字串、註解都拿掉）全是 ASCII，所以出現任何非 ASCII 字元就拒絕 */
    { const m = /[^\x00-\x7F]/.exec(tok); if (m) odd.push("斷詞後的程式碼有非 ASCII 字元（U+" + m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0") + "）") }
    if (ODD_NL.test(raw)) odd.push("特殊換行或看不見的字元");
    if (odd.length) pinBad.push(path.relative(HERE, f) + " 不能有 " + odd.join("、") + "（斷詞可能跟 Swift 認定不同）");
  }
}
/* W69 設定鎖（從 #144 拆出來；#144 第三～五輪審查）：swiftCode 不認不加 # 的斜線正規式 /…/。Swift 5 預設是語法錯誤，繞不過去；
   但開了 bare-slash-regex（OTHER_SWIFT_FLAGS、SWIFT_UPCOMING_FEATURE_…、xcconfig）就合法，/"/ 配 /*" 能讓斷詞和 Swift 對字串邊界錯開。所以鎖住 Swift 編譯設定。
   第五輪審查：用文字比對會被「引號裡的 /＊ ＊/」「<group> 相對路徑」騙過（iMac 用 xcodebuild -showBuildSettings 實測過：Xcode 照語法讀，<group> 照群組階層算路徑）。
   所以照 pbxproj（OpenStep plist）的語法真正解析，看不懂就算錯：
   ① 每個 XCBuildConfiguration 只能有 isa、buildSettings、name、baseConfigurationReference 四個欄位（Xcode 16 的 baseConfigurationReferenceAnchor 這類新寫法一律不行）
   ② buildSettings 裡名字有 SWIFT 的設定只能是 SW_OK 的值（值寫死，陣列、$(變數) 拼不出別的旗標）；SWIFT_VERSION 至少一處；任何地方都不能有 COMPILER_FLAGS
   ③ baseConfigurationReference 照 sourceTree 和群組階層算出真正的路徑（只認 <group>、SOURCE_ROOT）；PBXProject 的 projectDirPath、projectRoot 要是空的
   ④ 算出來的、以及 ios/、ios/App/、ios/App/App/ 底下的 .xcconfig，每一行只能是空白、// 註解或 CAPACITOR_DEBUG = true／false；#include 一律不行；引用的檔要存在 */
/* #147 審查①②：Xcode 把 U+2028、U+2029 當換行，pbxproj、xcconfig 的 // 註解後面接它再寫設定，解析器當成同一行註解、Xcode 卻讀得到。
   特殊換行、CR 和看不見的字元（跟 Swift 那段的 ODD_NL 同一組，另加 \r），pbxproj 和每一份 xcconfig 出現就拒絕 */
const LOCK_NL = /[\r\u2028\u2029\u0085\u000B\u000C\uFEFF\u200B-\u200F\u2060-\u2064\u00AD\u0000-\u0008\u000E-\u001F\u007F\u202A-\u202E\u2066-\u206F]/;
function pbxParse(src) {
  let i = 0;
  const fail = (m) => { throw new Error(m + "（第 " + src.slice(0, i).split("\n").length + " 行）") };
  const ws = () => { for (;;) {
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src.startsWith("//", i)) { while (i < src.length && src[i] !== "\n") i++; continue }
    if (src.startsWith("/*", i)) { const e = src.indexOf("*/", i + 2); if (e < 0) fail("註解沒有收尾"); i = e + 2; continue }
    return } };
  const val = () => {
    ws(); const c = src[i];
    if (c === "{") { i++; const o = Object.create(null);
      for (;;) { ws(); if (src[i] === "}") { i++; return o }
        const k = val(); if (typeof k !== "string") fail("鍵不是字串"); ws(); if (src[i] !== "=") fail("少了 ="); i++;
        const v = val(); ws(); if (src[i] !== ";") fail("少了 ;"); i++;
        if (k in o) fail("重複的鍵 " + k); o[k] = v } }
    if (c === "(") { i++; const a = [];
      for (;;) { ws(); if (src[i] === ")") { i++; return a } a.push(val()); ws(); if (src[i] === ",") { i++; continue } if (src[i] === ")") { i++; return a } fail("陣列少了 ,") } }
    if (c === "\"") { i++; let s = "";
      for (;;) { if (i >= src.length) fail("字串沒有收尾"); const d = src[i++];
        if (d === "\"") return s;
        if (d === "\\") { const e = src[i++]; if (e === "n") s += "\n"; else if (e === "t") s += "\t"; else if (e === "\"" || e === "\\") s += e; else fail("看不懂的跳脫 \\" + e); continue }
        s += d } }
    const m = /[A-Za-z0-9_$+/:.-]+/y; m.lastIndex = i; const r = m.exec(src); if (!r) fail("看不懂的字元 " + JSON.stringify(src.slice(i, i + 8))); i = m.lastIndex; return r[0] };
  const root = val(); ws(); if (i !== src.length) fail("結尾多了東西"); return root;
}
{
  const pbxSV = path.join(HERE, "ios", "App", "App.xcodeproj", "project.pbxproj"), projDir = path.join(HERE, "ios", "App");
  const swBad = [], xcRefs = [];
  let P = null, svN = 0;
  if (!fs.existsSync(pbxSV)) swBad.push("找不到 pbxproj");
  else { const raw = rd(pbxSV); if (LOCK_NL.test(raw)) swBad.push("pbxproj 有特殊換行或看不見的字元（Xcode 把 U+2028／U+2029 當換行，// 註解後面的設定斷詞看不到）");
    try { P = pbxParse(raw) } catch (e) { swBad.push("pbxproj 看不懂：" + e.message) } }   /* 看不懂時 P 是 null、svN 是 0，下面的 check 也一定紅（雙保險；這行只是讓訊息好讀） */
  if (P) {
    const O = P.objects || {}, parent = {};
    for (const [id, o] of Object.entries(O)) if (Array.isArray(o.children)) for (const c of o.children) parent[c] = id;
    /* #147 審查④：只取第一個 PBXProject 會被「第二個 PBXProject 當 rootObject」騙過（PROJECT_DIR、SRCROOT 都換掉）。改成照 rootObject 取，而且整份只能有一個 PBXProject */
    const projN = Object.values(O).filter((o) => o.isa === "PBXProject").length, proj = (typeof P.rootObject === "string" && O[P.rootObject] && O[P.rootObject].isa === "PBXProject") ? O[P.rootObject] : {};
    if (projN !== 1 || proj.isa !== "PBXProject") swBad.push("PBXProject 要剛好一個，而且就是 rootObject（現在 " + projN + " 個）");
    if ((proj.projectDirPath || "") !== "" || (proj.projectRoot || "") !== "") swBad.push("PBXProject 的 projectDirPath／projectRoot 不是空的");
    /* #147 審查③：檔案參照、群組的 path／name 裡有 $（例如 $(SRCROOT)），Xcode 會展開、這裡不會，兩邊讀到不同的檔，一律看不懂 */
    const dirOf = (id, depth) => { const o = O[id]; if (!o || depth > 40) return null; if (/\$/.test(String(o.path || "") + String(o.name || ""))) return null;
      let base;
      if (o.sourceTree === "<group>") base = parent[id] ? dirOf(parent[id], depth + 1) : (id === proj.mainGroup ? projDir : null);
      else if (o.sourceTree === "SOURCE_ROOT") base = projDir;
      else return null;
      return base == null ? null : path.resolve(base, typeof o.path === "string" ? o.path : "") };
    const SW_OK = { SWIFT_VERSION: ["5.0"], SWIFT_ACTIVE_COMPILATION_CONDITIONS: ["", "DEBUG"], SWIFT_COMPILATION_MODE: ["wholemodule"], SWIFT_OPTIMIZATION_LEVEL: ["-O", "-Onone"],
      OTHER_SWIFT_FLAGS: ["$(inherited) \"-D\" \"COCOAPODS\" \"-DDEBUG\""] };
    const CFG_KEYS = new Set(["isa", "buildSettings", "name", "baseConfigurationReference"]);
    for (const [id, o] of Object.entries(O)) {
      if (o.isa !== "XCBuildConfiguration") continue;
      for (const k of Object.keys(o)) if (!CFG_KEYS.has(k)) swBad.push("XCBuildConfiguration 不認得的欄位 " + k);
      for (const [k, v] of Object.entries(o.buildSettings || {})) {
        if (k === "SWIFT_VERSION") svN++;
        if (/SWIFT/.test(k) && !(SW_OK[k] || []).includes(v)) swBad.push(k + " = " + JSON.stringify(v));   /* 編譯設定名都是大寫；陣列、帶 [sdk=…] 條件的都不在白名單 */
      }
      if (o.baseConfigurationReference != null) { const p = dirOf(o.baseConfigurationReference, 0); if (p) xcRefs.push(p); else swBad.push("baseConfigurationReference 的路徑看不懂（只認 <group>、SOURCE_ROOT）") }
    }
    if (/COMPILER_FLAGS/.test(JSON.stringify(O))) swBad.push("COMPILER_FLAGS");
  }
  const xcDirs = [path.join(HERE, "ios"), projDir, APP];
  const xcFiles = [...new Set([...xcRefs, ...xcDirs.flatMap((d) => fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(".xcconfig")).map((f) => path.join(d, f)) : [])])];
  for (const f of xcFiles) {
    if (!fs.existsSync(f)) { swBad.push("找不到 " + path.relative(HERE, f)); continue }
    const xraw = rd(f); if (LOCK_NL.test(xraw)) swBad.push(path.relative(HERE, f) + " 有特殊換行或看不見的字元");
    for (const l of xraw.split("\n")) if (l.trim() && !/^\s*\/\//.test(l) && !/^\s*CAPACITOR_DEBUG\s*=\s*(true|false)\s*$/.test(l)) swBad.push(path.relative(HERE, f) + "：" + l.trim());
  }
  check(svN > 0 && swBad.length === 0,
    "Swift 語言版本全是 5.0、沒開 bare-slash-regex（swiftCode 不認 /…/ 正規式；升 Swift 6 前要先補斷詞）" + (swBad.length ? "：不在白名單的設定 " + swBad.slice(0, 5).join("、") : "") + (svN ? "" : "：pbxproj 沒有 SWIFT_VERSION"));
}
for (const [n, re] of [["verifyNow", /\bfunc\s+verifyNow\b/g], ["issueChallenge", /\bfunc\s+issueChallenge\b/g], ["randomHex", /\bfunc\s+randomHex\b/g]]) if ((srvCode.match(re) || []).length !== 1) pinBad.push(n + "（宣告不只一次）");
const flagDecl = swiftAll.filter((x) => x.f.startsWith("native")).reduce((t, x) => t + (x.c.match(/\b(class|struct|enum|actor|protocol|typealias)\s+XQFlag\b/g) || []).length, 0);
if (flagDecl !== 1) pinBad.push("XQFlag（整個專案要剛好宣告一次，現在 " + flagDecl + " 次）");
check(pinBad.length === 0, "verifyNow 真的去問 whoami、比對這題的答案才回通過（verifyNow、issueChallenge、randomHex、XQFlag 跟鎖住的版本一樣）" + (pinBad.length ? "：" + pinBad.join("、") + "。如果是刻意改這四段，要在計分規則 PR 裡一起更新 check-native.js 的 PINS" : ""));
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
/* #150 第三輪複審：body() 只取第一處。用 #if DEBUG／#else 放兩份 establishNow（release 那份不經過 verifyNow），上面的檢查只看得到 DEBUG 那份。
   照 PINS 的做法：body() 拿來檢查的函式，簽章在斷詞後的程式碼裡都要剛好一處，而且不在 #if 裡（前面的 #if、#endif 要配平） */
{
  /* #150 第四輪複審：逐字簽章計數會被「真的那份多打一個空格、同檔另放一個替身寫一模一樣的簽章」騙過（計數數到替身、body() 也取到替身）。
     改成在斷詞後的程式碼裡依名字計數：func <名字> 剛好一處（多打空格、換行也數得到），位置也照名字找，前面的 #if、#endif 要配平 */
  const BODY_NAMES = [[srvCode, "takeAnswer"], [srvCode, "handleWhoami"], [srvCode, "establishNow"], [srvCode, "startListening"],
    [vcCode, "viewDidLoad"], [vcCode, "loadVerifiedPage"], [vcCode, "handle"], [vcCode, "retryTapped"]];
  const bodyBad = [];
  for (const [code, n] of BODY_NAMES) {
    const re = new RegExp("\\bfunc\\s+" + n + "\\b", "g"), hits = [...code.matchAll(re)];
    if (hits.length !== 1) { bodyBad.push(n + "（要剛好一處，現在 " + hits.length + " 處）"); continue }
    const pre = code.slice(0, hits[0].index);
    if ((pre.match(/#if\b/g) || []).length !== (pre.match(/#endif\b/g) || []).length) bodyBad.push(n + "（不能放在 #if 裡）");
  }
  check(bodyBad.length === 0, "檢查用到的函式（establishNow、handleWhoami、takeAnswer、startListening、viewDidLoad、loadVerifiedPage、handle、retryTapped）都剛好一處、不在 #if 裡" + (bodyBad.length ? "：" + bodyBad.join("、") : ""));
}
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
