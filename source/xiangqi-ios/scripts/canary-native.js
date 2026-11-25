#!/usr/bin/env node
/* iOS 原生檢查 check-native.js 的金絲雀（AGENTS.md「P0 出口驗證要難作假」，開發者 2026-11-23：「ios金絲雀也要做」「壞樣本能自己製作…加入金絲雀比較深層的判斷」）
   做法：把 source/xiangqi-ios（不含 node_modules）和 check-native 會讀的網頁檔（source/xiangqi-db/m/07gc-native.js、01-board.js）
     整份複製到暫存資料夾，在副本上一次改壞一處，再用「複製過去、內容一模一樣的」check-native.js 檢查。
     每一個壞樣本都必須被判失敗（結束代碼 1），而且錯誤裡要有那一條判斷的字；乾淨的副本必須全過。
   壞樣本對應的都是 11/17 App Store 審查修過的 P1、或之後加的原生能力（本機伺服器驗證、畫面只在驗證通過後載入、外掛不連網、不讀玩家 ID…）。
   會改到兩份 Swift 的壞樣本（native/ios 和 ios/App/App）兩份一起改，只讓要測的那一條抓得到；「兩份相同」另外有一個只改一份的壞樣本。
   用法：node scripts/canary-native.js [--only <名稱,…>] [--out <收據.json>]
   結束代碼：0 乾淨的全過、每個壞樣本都被抓到；4 有壞樣本沒被抓到（檢查失靈，check-native 的結果不可信）；2 測試不成立（乾淨的沒過、做壞樣本失敗、參數錯） */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto"), cp = require("child_process");
const IOS = path.join(__dirname, ".."), REPO = path.join(IOS, "..", "..");
const CHECK = path.join(__dirname, "check-native.js");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const toolSha = (p) => sha256(Buffer.from(fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"), "utf8"));
const WEBFILES = ["source/xiangqi-db/m/07gc-native.js", "source/xiangqi-db/m/01-board.js"];

/* 在副本裡改檔：f＝相對 source/xiangqi-ios 的路徑；fn(舊內容)→新內容；內容沒變就是做壞樣本失敗 */
function edit(R, f, fn) {
  const p = path.join(R, "source", "xiangqi-ios", ...f.split("/"));
  if (!fs.existsSync(p)) return false;
  const s = fs.readFileSync(p, "utf8"), t = fn(s);
  if (t === s) throw new Error(f + " 沒有改到（要改的那段不見了？）");
  fs.writeFileSync(p, t); return true;
}
/* 改 source/xiangqi-ios 以外的檔（相對倉庫根目錄），例如 check-native 讀的網頁檔 */
function editRepo(R, f, fn) {
  const p = path.join(R, ...f.split("/"));
  if (!fs.existsSync(p)) throw new Error("找不到 " + f);
  const s = fs.readFileSync(p, "utf8"), t = fn(s);
  if (t === s) throw new Error(f + " 沒有改到（要改的那段不見了？）");
  fs.writeFileSync(p, t);
}
/* 兩份 Swift 一起改（ios/App/App 沒有這支就只改 native/ios） */
const both = (name, fn) => (R) => { const a = edit(R, "native/ios/" + name, fn); edit(R, "ios/App/App/" + name, fn); if (!a) throw new Error("找不到 native/ios/" + name) };
const rep = (from, to) => (s) => { if (!s.includes(from)) throw new Error("找不到「" + from.slice(0, 40) + "」"); return s.replace(from, to) };
const repAll = (from, to) => (s) => { if (!s.includes(from)) throw new Error("找不到「" + from.slice(0, 40) + "」"); return s.split(from).join(to) };
/* 在某個函式的開頭大括號後面插一行 */
const inFunc = (sig, line) => (s) => { const i = s.indexOf(sig); if (i < 0) throw new Error("找不到函式 " + sig); const j = s.indexOf("{", i); return s.slice(0, j + 1) + "\n        " + line + s.slice(j + 1) };
/* 在某個函式裡（從簽名起算）換掉第一個出現的字 */
const repIn = (sig, from, to) => (s) => { const i = s.indexOf(sig); if (i < 0) throw new Error("找不到函式 " + sig); const j = s.indexOf(from, i); if (j < 0) throw new Error(sig + " 裡找不到「" + from + "」"); return s.slice(0, j) + to + s.slice(j + from.length) };
/* 在檔案最後一個「}」前面加一段 */
const beforeEnd = (code) => (s) => { const i = s.lastIndexOf("}"); return s.slice(0, i) + code + "\n" + s.slice(i) };
const SRV = "XQLoopbackServer.swift", VC = "XQBridgeViewController.swift", GC = "XQGameCenterPlugin.swift", WD = "XQWidgetDataPlugin.swift", SP = "XQSpeechPlugin.swift", WG = "native/ios-widget/";
const GCWEB = "source/xiangqi-db/m/07gc-native.js", BOARD = "source/xiangqi-db/m/01-board.js";

/* 副本裡的路徑（相對 source/xiangqi-ios） */
const iosp = (R, f) => path.join(R, "source", "xiangqi-ios", ...f.split("/"));
/* #135 複審④：要有 node_modules/@capacitor/ios 才跑的判斷——在副本裡做一份「合格」的假 Capacitor，再照參數弄壞一處 */
function capFake(R, o = {}) {
  const d = iosp(R, "node_modules/@capacitor/ios/Capacitor/Capacitor"); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "CAPBridgeViewController.swift"), "open class CAPBridgeViewController: UIViewController {\n    override open func loadView() {\n        " + (o.lv || "capacitorBridge = CapacitorBridge(x)\n        capacitorDidLoad()") + "\n    }\n    override open func viewDidLoad() {\n        " + (o.vdl || "super.viewDidLoad()\n        loadWebView()") + "\n    }\n    " + (o.lwv || "public final func loadWebView() {}") + "\n    open func capacitorDidLoad() {}\n}\n");
  fs.writeFileSync(path.join(d, "CapacitorBridge.swift"), "open class CapacitorBridge {\n    " + (o.reg || "public func registerPluginInstance(_ pluginInstance: CAPPlugin) {}") + "\n}\n");
}
/* #135 複審④：Game Center／小工具「已裝進 Xcode」才跑的判斷——pbxproj 登記兩支外掛、把外掛複製進 ios/App/App、Info.plist 加網址 */
function gcInstalled(R) {
  fs.appendFileSync(iosp(R, "ios/App/App.xcodeproj/project.pbxproj"), "\n/* XQGameCenterPlugin.swift */\n/* XQWidgetDataPlugin.swift */\n");
  for (const f of [GC, WD]) fs.copyFileSync(iosp(R, "native/ios/" + f), iosp(R, "ios/App/App/" + f));
  const ip = iosp(R, "ios/App/App/Info.plist"), s = fs.readFileSync(ip, "utf8"); if (!s.includes("<string>xqqianqiu</string>")) fs.writeFileSync(ip, s.replace("</dict>\n</plist>", "\t<key>XQScheme</key>\n\t<string>xqqianqiu</string>\n</dict>\n</plist>"));
}
/* 每一個壞樣本：break 在副本上弄壞一處；expect 是 check-native 錯誤（✘ 那一行）裡要出現的字 */
const KINDS = {
  /* 1. 兩份一樣 */
  copyDiff: { break: (R) => edit(R, "ios/App/App/" + VC, (s) => s + "\n// 只改了 ios/App/App 這一份\n"), expect: VC + " 兩份相同" },
  /* 2. 埠號（改了玩家存檔就不見） */
  port: { break: both(SRV, rep("static let port: UInt16 = 47821", "static let port: UInt16 = 47822")), expect: "埠號還是 47821" },
  /* 3. 本機伺服器驗證（11/17 P1） */
  whoami: { break: both(SRV, rep('static let whoamiPath = "/__xq_whoami"', 'static let whoamiPath = "/__xq_who"')), expect: "有 /__xq_whoami 驗證端點" },
  rng: { break: both(SRV, rep("var g = SystemRandomNumberGenerator()", "var g = XQPlainRandom()")), expect: "考題／答案用系統亂數" },
  challenge: { break: both(SRV, rep("private func issueChallenge()", "private func makeChallenge()")), expect: "有一次性考題" },
  oneTime: { break: both(SRV, repIn("private func takeAnswer(for c: String)", "challenges.removeValue(forKey: c)", "challenges[c]")), expect: "考題查過就作廢" },
  whoamiAnswer: { break: both(SRV, repIn("private func handleWhoami(", "let a = answer", "let a = Optional(\"x\")")), expect: "whoami 只回這次考題的答案" },
  establish: { break: both(SRV, (s) => { const i = s.indexOf("private func establishNow()"); const j = s.indexOf("verifyNow(", i); return s.slice(0, j) + "true || verifyNow(" + s.slice(j + "verifyNow(".length) }), expect: "establish 一定經過 verifyNow" },
  establishIf: { break: both(SRV, (s) => { const i = s.indexOf("private func establishNow()"); const j = s.indexOf("if verifyNow(timeout: 2.0) {", i); return s.slice(0, j) + "if true {" + s.slice(j + "if verifyNow(timeout: 2.0) {".length) }), expect: "establish 一定經過 verifyNow" },
  /* #127 審查（Windows Claude 2，新代理人 23 種改法）找到的繞法，check-native 現在都擋得住；每種各做一個壞樣本，確定沒有退回去 */
  establishElse: { break: both(SRV, (s) => s.replace("if verifyNow(timeout: 2.0) { return .verified }", "if verifyNow(timeout: 2.0) { xqLog(\"x\") } else { return .verified }")), expect: "establish 一定經過 verifyNow" },
  establishGuard: { break: both(SRV, (s) => s.replace("xqLog(\"還沒設定網頁資料夾\")\n            return .failed", "xqLog(\"還沒設定網頁資料夾\")\n            return .verified")), expect: "establish 一定經過 verifyNow" },
  establishCase: { break: both(SRV, (s) => s.replace("xqLog(\"監聽開不起來\")\n            return .failed", "xqLog(\"監聽開不起來\")\n            return .verified")), expect: "establish 一定經過 verifyNow" },
  establishLocalFunc: { break: both(SRV, (s) => s.replace("private func establishNow() -> Outcome {", "private func establishNow() -> Outcome {\n        func verifyNow (timeout: TimeInterval) -> Bool { return true }")), expect: "establish 一定經過 verifyNow" },
  establishHelper: { break: both(SRV, (s) => s.replace("private func establishNow() -> Outcome {", "private func xqOk() -> Outcome { .verified }\n    private func establishNow() -> Outcome {").replace("if verifyNow(timeout: 2.0) { return .verified }", "if true { return xqOk() }\n            if verifyNow(timeout: 2.0) { return .verified }")), expect: "establish 一定經過 verifyNow" },
  verifiedElsewhere: { break: both(SRV, beforeEnd("    func xqShortcut() -> EstablishOutcome { return .verified }")), expect: "verified 只會從 establishNow 回" },
  inUse: { break: both(SRV, repIn("private func startListening(", "if exact == .inUse {\n            return .inUse\n        }", "if exact == .inUse {\n            xqLog(\"占用\")\n        }")), expect: "位址被占用時不改綁萬用位址" },
  eaddrinuse: { break: both(SRV, repAll("EADDRINUSE", "EACCES")), expect: "有判斷 EADDRINUSE" },
  acceptLocalOnly: { break: both(SRV, rep("params.requiredInterfaceType = .loopback", "params.requiredInterfaceType = .loopback\n        params.acceptLocalOnly = true")), expect: "沒有 acceptLocalOnly = true" },
  loopback: { break: both(SRV, rep("params.requiredInterfaceType = .loopback", "params.requiredInterfaceType = .other")), expect: "只聽 loopback 介面" },
  sourceCheck: { break: both(SRV, repAll("a.isLoopback", "true")), expect: "accept() 仍檢查來源位址" },
  leftover: { break: both(SRV, rep("putLeftover(conn, rest)", "putLeftover(conn, Data())")), expect: "leftover 位元組修正還在" },
  /* 4. 畫面：驗證通過才載入（11/17 P1） */
  superVDL: { break: both(VC, inFunc("override func viewDidLoad()", "super.viewDidLoad()")), expect: "viewDidLoad 不呼叫 super" },
  runCheck: { break: both(VC, repIn("override func viewDidLoad()", "runCheck()", "xqSkipCheck()")), expect: "viewDidLoad 先開伺服器＋驗證" },
  loadTwice: { break: both(VC, inFunc("override func viewDidLoad()", "loadWebView()")), expect: "loadWebView() 只出現一次" },
  phaseGate: { break: both(VC, repIn("private func loadVerifiedPage()", "self.phase == .running", "true")), expect: "loadWebView() 只在 loadVerifiedPage 裡" },
  loadUnverified: { break: both(VC, inFunc("override func viewDidLoad()", "loadVerifiedPage()")), expect: "只有驗證通過（outcome == .verified）才呼叫 loadVerifiedPage" },
  runningUnverified: { break: both(VC, inFunc("override func viewDidLoad()", "phase = .running")), expect: "只有驗證通過才進 running" },
  directLoad: { break: both(VC, inFunc("override func viewDidLoad()", "webView?.load(URLRequest(url: URL(string: \"http://127.0.0.1:47821/\")!))")), expect: "畫面沒有其他直接載入網頁的地方" },
  halfSecond: { break: both(VC, inFunc("override func viewDidLoad()", "let xqDelay: TimeInterval = 0.5")), expect: "沒有 0.5 秒的重跳" },
  alert: { break: both(VC, inFunc("override func viewDidLoad()", "let xqAlert = UIAlertController(title: nil, message: nil, preferredStyle: .alert)")), expect: "沒有一直重跳的提示視窗" },
  retryDelays: { break: both(VC, rep("retryDelays: [TimeInterval] = [1, 2, 4]", "retryDelays: [TimeInterval] = [1, 2, 4, 8]")), expect: "自動重試 1、2、4 秒" },
  retryCap: { break: both(VC, repIn("private func handle(", "retryIndex < retryDelays.count", "true")), expect: "自動重試有上限" },
  manualRetry: { break: both(VC, repIn("@objc private func retryTapped()", "retryIndex = retryDelays.count", "retryIndex = 0")), expect: "手動「重試」只試一次" },
  bilingual: { break: both(VC, rep("Another app is using", "Another program uses")), expect: "錯誤畫面中英文都有" },
  guidance: { break: both(VC, rep("Close other apps", "Quit other programs")), expect: "錯誤畫面有處理方式" },
  keepSave: { break: both(VC, inFunc("override func viewDidLoad()", "let xqTypes: Set<String> = [WKWebsiteDataTypeLocalStorage]")), expect: "載入前只清 HTTP 快取，不動存檔" },
  foreground: { break: both(VC, repAll("UIApplication.willEnterForegroundNotification", "UIApplication.didBecomeActiveNotification")), expect: "回前景／監聽壞掉會重驗" },
  /* 6. 括號、控制字元 */
  brace: { break: both(VC, (s) => s + "\nextension XQBridgeViewController {\n"), expect: "沒有收尾" },
  ctrl: { break: both(SRV, (s) => s + "\n// 控制字元\u0001\n"), expect: SRV + " 沒有控制字元" },
  /* 7. 外掛（Game Center、小工具資料） */
  gcNetwork: { break: both(GC, beforeEnd("    func xqSend() { _ = URLSession.shared }")), expect: GC + "：沒有網路程式" },
  gcPlayerId: { break: both(GC, beforeEnd("    func xqWho() -> String { return GKLocalPlayer.local.gamePlayerID }")), expect: "不讀、不回傳玩家 ID 或暱稱" },
  gcLogin: { break: both(GC, rep("self.loginVC = viewController", "self.present(viewController)")), expect: "開 App 不主動跳登入畫面" },
  wdPath: { break: both(WD, rep('rel.contains("..")', 'rel.isEmpty')), expect: "圖只收安裝包 data/ 底下、不收「..」" },
  fgLog: { break: both(VC, rep("[XQLoopback] 回前景重驗通過", "[XQLoopback] 回前景 OK")), expect: "回前景重驗通過時 console 印一行" },
  gcObjc: { break: both(GC, rep("@objc(XQGameCenterPlugin)", "@objc(XQGC)")), expect: "XQGameCenterPlugin：@objc 名稱和 CAPPlugin" },
  gcJsName: { break: both(GC, rep('public let jsName = "XQGameCenter"', 'public let jsName = "XQGC"')), expect: "XQGameCenterPlugin：identifier" },
  gcMethods: { break: both(GC, beforeEnd("    @objc func xqHidden(_ call: CAPPluginCall) { call.resolve() }")), expect: "XQGameCenterPlugin：pluginMethods" },
  gcWebCall: { break: (R) => editRepo(R, GCWEB, rep('gcnCall("XQGameCenter","authenticate",{})', 'gcnCall("XQGameCenter","xqNoSuchMethod",{})')), expect: "07gc-native.js 呼叫 XQGameCenter 的方法" },
  wdReload: { break: both(WD, repAll("WidgetCenter.shared.reloadAllTimelines()", "_ = 0")), expect: "XQWidgetData：寫 App Group 後請小工具重畫" },
  widgetMain: { break: (R) => edit(R, WG + "XQTodayWidget.swift", rep(".supportedFamilies([.systemSmall, .systemMedium])", ".supportedFamilies([.systemSmall])")), expect: "小工具：有 @main、小中兩種尺寸" },
  widgetURL: { break: (R) => edit(R, WG + "XQTodayWidget.swift", rep("://canju\")", "://home\")")), expect: "小工具：點了開" },
  widgetNet: { break: (R) => edit(R, WG + "XQTodayWidget.swift", beforeEnd("    func xqSend() { _ = URLSession.shared }")), expect: "小工具：沒有網路程式" },
  widgetCtrl: { break: (R) => edit(R, WG + "XQTodayWidget.swift", (s) => s + "\n// \u0007\n"), expect: "XQTodayWidget.swift 沒有控制字元" },
  widgetFile: { break: (R) => edit(R, WG + "XQTodayWidget.swift", rep('dataFile = "today.json"', 'dataFile = "today2.json"')), expect: "小工具和 XQWidgetData 的檔名一樣：dataFile" },
  appGroup: { break: (R) => edit(R, "native/ios/App.entitlements", repAll("group.com.raysonchen.xiangqiqianqiu.shared", "group.com.raysonchen.xiangqiqianqiu.other")), expect: "App Group 四處一樣" },
  gcEntitle: { break: (R) => edit(R, "native/ios/App.entitlements", repAll("com.apple.developer.game-center", "com.apple.developer.game-centre")), expect: "App.entitlements 有 Game Center" },
  widgetPlist: { break: (R) => edit(R, WG + "Info.plist", repAll("com.apple.widgetkit-extension", "com.apple.other-extension")), expect: "小工具 Info.plist 是 widgetkit-extension" },
  webScheme: { break: (R) => editRepo(R, GCWEB, rep('"canju":"#/canju"', '"canju":"#/home"')), expect: "07gc-native.js 收" },
  webNet: { break: (R) => editRepo(R, GCWEB, (s) => s + "\n;fetch(\"/x\");\n"), expect: "07gc-native.js 不連網、不送資料" },
  installGc: { break: (R) => edit(R, "scripts/install-native.js", rep('"--gc-widget"', '"--gcw"')), expect: "install-native.js --gc-widget" },
  regSpeech: { break: both(VC, rep("bridge?.registerPluginInstance(XQSpeechPlugin())", "bridge?.registerPluginInstance(XQSpeechPlugin.init())")), expect: "capacitorDidLoad() 直接註冊 XQSpeechPlugin" },
  regGuarded: { break: both(VC, rep("NSClassFromString(name) as? CAPPlugin.Type", "NSClassFromString(name) as! CAPPlugin.Type")), expect: "Game Center、小工具有編進 App 才註冊" },
  regOther: { break: both(VC, inFunc("override func viewDidLoad()", "bridge?.registerPluginType(XQSpeechPlugin.self)")), expect: "只在 capacitorDidLoad 註冊這兩處" },
  spObjc: { break: both(SP, rep("@objc(XQSpeechPlugin)", "@objc(XQSP)")), expect: "XQSpeech：@objc 名稱、identifier、jsName" },
  spMethods: { break: both(SP, rep('CAPPluginMethod(name: "isAvailable"', 'CAPPluginMethod(name: "isAvail"')), expect: "XQSpeech：speak、stop、isAvailable 都有登記" },
  spOrder: { break: both(SP, repIn("@objc func speak(", 'call.resolve(["ok": true])', 'call.resolve(["ok": false])')), expect: "XQSpeech：先回傳" },
  spMain: { break: both(SP, beforeEnd("    func xqMain() { DispatchQueue.main.async {} }")), expect: "XQSpeech：沒有任何工作丟回主執行緒" },
  spWarm: { break: both(SP, repAll("work.asyncAfter(deadline:", "work.async(deadline:")), expect: "XQSpeech：App 啟動後在背景佇列先初始化" },
  spLang: { break: both(SP, rep('["zh-TW", "zh-Hant", "zh-HK"]', '["zh-CN"]')), expect: "XQSpeech：語言 zh-TW" },
  spAmbient: { break: both(SP, repAll("setCategory(.ambient", "setCategory(.playback")), expect: "XQSpeech：AVAudioSession 用 .ambient" },
  spOnce: { break: both(SP, beforeEnd("    func xqCat() { try? AVAudioSession.sharedInstance().setCategory(.ambient) }")), expect: "XQSpeech：音訊類別只在外掛載入時設一次" },
  spBg: { break: both(SP, repAll("stopSpeaking(at: .immediate)", "stopSpeaking(at: .word)")), expect: "XQSpeech：進背景 stopSpeaking" },
  spNet: { break: both(SP, beforeEnd("    func xqNet() { _ = URLSession.shared }")), expect: "XQSpeech：不要權限、沒有網路程式" },
  spCtrl: { break: both(SP, (s) => s + "\n// \u0008\n"), expect: "XQSpeechPlugin.swift 沒有控制字元" },
  spInstall: { break: (R) => edit(R, "scripts/install-native.js", rep('const BASE_CLASSES = ["XQSpeechPlugin"];', 'const BASE_CLASSES = [];')), expect: "install-native.js：預設就複製 XQSpeechPlugin" },
  spCopy: { break: (R) => { if (!edit(R, "ios/App/App/" + SP, (s) => s + "\n// 只改這一份\n")) throw new Error("ios/App/App 沒有 " + SP) }, expect: "XQSpeechPlugin.swift 兩份相同" },
  board: { break: (R) => editRepo(R, BOARD, repAll('N.has("XQSpeech")', 'N.has("XQS")')), expect: "01-board.js：原生版有 XQSpeech 就用它" },
  /* ===== #135 審查①②③：子條件、單一字、沒打到的判斷，各自一個「只有它抓得到」的壞樣本（自我測試的子條件改壞清單逐條對應） ===== */
  /* 伺服器 */
  whoamiTake: { break: both(SRV, repIn("private func handleWhoami(", "takeAnswer(for: challenge)", "takeAnswer(for:challenge)")), expect: "whoami 只回這次考題的答案" },
  estOneBlock: { break: both(SRV, rep("            if verifyNow(timeout: 2.0) { return .verified }\n", "")), expect: "establish 一定經過 verifyNow" },
  estTickFunc: { break: both(SRV, rep("private func establishNow() -> Outcome {", "private func establishNow() -> Outcome {\n        func `verifyNow`(timeout: TimeInterval) -> Bool { return true }")), expect: "establish 一定經過 verifyNow" },
  /* #144 複審：反引號 `verifyNow` 現在跟 verifyNow 同一個字，estTickFunc 也會被「establishNow 裡不能宣告 func verifyNow」抓到；補一個只有「verifyNow 字數＝if 區塊數」抓得到的：用 let＋callAsFunction 蓋掉（swiftc -typecheck 過） */
  estCallAs: { break: both(SRV, rep("private func establishNow() -> Outcome {", "private func establishNow() -> Outcome {\n        struct XQV { func callAsFunction(timeout: TimeInterval) -> Bool { true } }; let verifyNow = XQV()")), expect: "establish 一定經過 verifyNow" },
  estNoReturn: { break: both(SRV, (s) => { const i = s.indexOf("private func establishNow()"), j = s.indexOf("xqLog(\"驗證通過", i), k = s.indexOf("return .verified", j); if (i < 0 || j < 0 || k < 0) throw new Error("找不到第二個 if 區塊"); return s.slice(0, k) + "_ = 0" + s.slice(k + "return .verified".length) }), expect: "establish 一定經過 verifyNow" },
  estElseAfter: { break: both(SRV, rep("if verifyNow(timeout: 2.0) { return .verified }", "if verifyNow(timeout: 2.0) { return .verified } else { xqLog(\"x\") }")), expect: "establish 一定經過 verifyNow" },
  estFuncTwice: { break: both(SRV, beforeEnd("    private func verifyNow(timeout: Double, xq: Int) -> Bool { return true }")), expect: "establish 一定經過 verifyNow" },
  srcCancel: { break: both(SRV, repAll("conn.cancel(); return", "conn.cancel();return")), expect: "accept() 仍檢查來源位址" },
  leftoverRead: { break: both(SRV, rep("readRequest(conn, buffer: rest)", "readRequest(conn, buffer:rest)")), expect: "leftover 位元組修正還在" },
  /* 畫面 */
  lvpLoad: { break: both(VC, (s) => beforeEnd("    private func xqGo() { loadWebView() }")(repIn("private func loadVerifiedPage()", "self.loadWebView()", "self.xqGo()")(s))), expect: "loadWebView() 只在 loadVerifiedPage 裡" },
  vbLoad: { break: both(VC, rep("            loadVerifiedPage()\n            return\n        }", "            return\n        }\n        loadVerifiedPage()")), expect: "只有驗證通過（outcome == .verified）才呼叫 loadVerifiedPage" },
  vbRunning: { break: both(VC, (s) => repIn("@objc private func retryTapped()", "phase = .starting", "phase = .starting\n        if false { phase = .running }")(rep("            phase = .running\n            removeCover()", "            removeCover()")(s))), expect: "只有驗證通過才進 running" },
  loadFile: { break: both(VC, inFunc("override func viewDidLoad()", "webView?.loadFileURL(URL(fileURLWithPath: \"/\"), allowingReadAccessTo: URL(fileURLWithPath: \"/\"))")), expect: "畫面沒有其他直接載入網頁的地方" },
  loadReq: { break: both(VC, inFunc("override func viewDidLoad()", "if let req = Optional(URLRequest(url: URL(fileURLWithPath: \"/\"))) { webView?.load(req) }")), expect: "畫面沒有其他直接載入網頁的地方" },
  showRetry: { break: both(VC, beforeEnd("    private func showRetry() { }")), expect: "沒有一直重跳的提示視窗" },
  failedPhase: { break: both(VC, rep("        phase = .failed\n        showCover", "        phase=.failed\n        showCover")), expect: "自動重試有上限" },
  zhBusy: { break: both(VC, rep("另一個 App 占用了", "另一個App占用了")), expect: "錯誤畫面中英文都有" },
  zhGuide: { break: both(VC, rep("請關閉其他 App", "請關閉其他App")), expect: "錯誤畫面有處理方式" },
  noDiskCache: { break: both(VC, rep("[WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache]", "[WKWebsiteDataTypeMemoryCache]")), expect: "載入前只清 HTTP 快取" },
  clearIDB: { break: both(VC, rep("[WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache]", "[WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache, WKWebsiteDataTypeIndexedDBDatabases]")), expect: "載入前只清 HTTP 快取" },
  onBroken: { break: both(VC, repAll("XQLoopbackServer.shared.onBroken", "XQLoopbackServer.shared.onBreak")), expect: "回前景／監聽壞掉會重驗" },
  fgFlag: { break: both(VC, rep("if self.phase == .running { self.foregroundRecheck = true }", "if self.phase == .running {self.foregroundRecheck = true}")), expect: "回前景重驗通過時 console 印一行" },
  installSrv: { break: (R) => edit(R, "scripts/install-native.js", repAll('"XQLoopbackServer.swift"', '"XQLoopbackSrv.swift"')), expect: "install-native.js 會複製兩支 Swift" },
  /* 外掛（Game Center、小工具資料） */
  gcClass: { break: both(GC, rep("XQGameCenterPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate", "XQGameCenterPlugin: CAPPlugin, GKGameCenterControllerDelegate, CAPBridgedPlugin")), expect: "XQGameCenterPlugin：@objc 名稱和 CAPPlugin" },
  wdIdent: { break: both(WD, rep('public let identifier = "XQWidgetDataPlugin"', 'public let identifier = "XQWidgetData"')), expect: "XQWidgetDataPlugin：identifier" },
  wdListedNoFunc: { break: both(WD, rep('CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise)', 'CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),\n        CAPPluginMethod(name: "xqExtra", returnType: CAPPluginReturnPromise)')), expect: "XQWidgetDataPlugin：pluginMethods" },
  wdWebNone: { break: (R) => editRepo(R, GCWEB, repAll('gcnCall("XQWidgetData",', 'gcnCall( "XQWidgetData",')), expect: "07gc-native.js 呼叫 XQWidgetData 的方法" },
  wdReq: { break: both(WD, beforeEnd("    func xqReq() { _ = URLRequest(url: URL(fileURLWithPath: \"/\")) }")), expect: WD + "：沒有網路程式" },
  wdCtrl: { break: both(WD, (s) => s + "\n// \u0002\n"), expect: WD + " 沒有控制字元" },
  gcAuth: { break: both(GC, repAll("authenticateHandler", "authHandler")), expect: "開 App 不主動跳登入畫面" },
  gcPresent: { break: both(GC, beforeEnd("    func xqShow(_ viewController: UIViewController) { bridge?.viewController?.present( viewController, animated: true) }")), expect: "開 App 不主動跳登入畫面" },
  gcKeep: { break: both(GC, repAll("self.loginVC = viewController", "self.loginVC=viewController")), expect: "開 App 不主動跳登入畫面" },
  gcPid: { break: both(GC, beforeEnd("    func xqA() -> String { return GKLocalPlayer.local.playerID }")), expect: "不讀、不回傳玩家 ID 或暱稱" },
  gcTeam: { break: both(GC, beforeEnd("    func xqB() -> String { return GKLocalPlayer.local.teamPlayerID }")), expect: "不讀、不回傳玩家 ID 或暱稱" },
  gcName: { break: both(GC, beforeEnd("    func xqC() -> String { return GKLocalPlayer.local.displayName }")), expect: "不讀、不回傳玩家 ID 或暱稱" },
  gcAlias: { break: both(GC, beforeEnd("    func xqD() -> String { return GKLocalPlayer.local.alias }")), expect: "不讀、不回傳玩家 ID 或暱稱" },
  wdBox: { break: both(WD, repAll("forSecurityApplicationGroupIdentifier", "forSecurityApplicationGroupID")), expect: "XQWidgetData：寫 App Group 後請小工具重畫" },
  wdData: { break: both(WD, rep('hasPrefix("data/")', 'hasPrefix("data")')), expect: "XQWidgetData：圖只收安裝包 data/" },
  /* 小工具 */
  widgetBundle: { break: (R) => edit(R, WG + "XQTodayWidget.swift", rep("struct XQWidgetBundle: WidgetBundle", "struct XQWidgetBundle : WidgetBundle")), expect: "小工具：有 @main、小中兩種尺寸" },
  widgetOpen: { break: (R) => edit(R, WG + "XQTodayWidget.swift", rep(".widgetURL(XQWidgetConfig.openURL)", ".widgetURL( XQWidgetConfig.openURL)")), expect: "小工具：點了開" },
  widgetReq: { break: (R) => edit(R, WG + "XQTodayWidget.swift", beforeEnd("    func xqReq() { _ = URLRequest(url: URL(fileURLWithPath: \"/\")) }")), expect: "小工具：沒有網路程式" },
  widgetJpg: { break: (R) => edit(R, WG + "XQTodayWidget.swift", rep('imageFile = "today.jpg"', 'imageFile = "today.png"')), expect: "小工具和 XQWidgetData 的檔名一樣：imageFile" },
  wdDataFile: { break: both(WD, rep('dataFile = "today.json"', 'dataFile  = "today.json"')), expect: "小工具和 XQWidgetData 的檔名一樣：dataFile" },
  groupMissing: { break: (R) => edit(R, WG + "XQTodayWidget.entitlements", rep("<string>group.com.raysonchen.xiangqiqianqiu.shared</string>", "<string></string>")), expect: "App Group 四處一樣" },
  groupExtra: { break: (R) => edit(R, "native/ios/App.entitlements", rep("<string>group.com.raysonchen.xiangqiqianqiu.shared</string>", "<string>group.com.raysonchen.xiangqiqianqiu.shared</string>\n\t\t<string>group.com.raysonchen.other</string>")), expect: "App Group 四處一樣" },
  /* 07gc 網頁 */
  webSchemeRe: { break: (R) => editRepo(R, GCWEB, rep("xqqianqiu:\\/\\/", "xqqianqiu:[\\/]{2}")), expect: "07gc-native.js 收" },
  webXhr: { break: (R) => editRepo(R, GCWEB, (s) => s + "\n;new XMLHttpRequest();\n"), expect: "07gc-native.js 不連網、不送資料" },
  webBeacon: { break: (R) => editRepo(R, GCWEB, (s) => s + "\n;navigator.sendBeacon(\"/x\");\n"), expect: "07gc-native.js 不連網、不送資料" },
  webSocket: { break: (R) => editRepo(R, GCWEB, (s) => s + "\n;new WebSocket(\"wss://x\");\n"), expect: "07gc-native.js 不連網、不送資料" },
  webXQNet: { break: (R) => editRepo(R, GCWEB, (s) => s + "\n;XQNet.send({});\n"), expect: "07gc-native.js 不連網、不送資料" },
  webIRT: { break: (R) => editRepo(R, GCWEB, (s) => s + "\n;shareIRT({});\n"), expect: "07gc-native.js 不連網、不送資料" },
  /* install-native.js --gc-widget */
  instGcFile: { break: (R) => edit(R, "scripts/install-native.js", repAll('"XQGameCenterPlugin.swift"', '"XQGameCenter.swift"')), expect: "install-native.js --gc-widget" },
  instWdFile: { break: (R) => edit(R, "scripts/install-native.js", repAll('"XQWidgetDataPlugin.swift"', '"XQWidgetData.swift"')), expect: "install-native.js --gc-widget" },
  instClasses: { break: (R) => edit(R, "scripts/install-native.js", repAll('"XQGameCenterPlugin", "XQWidgetDataPlugin"', '"XQGameCenterPlugin","XQWidgetDataPlugin"')), expect: "install-native.js --gc-widget" },
  instScheme: { break: (R) => edit(R, "scripts/install-native.js", rep('const URL_SCHEME = "xqqianqiu"', 'const URL_SCHEME="xqqianqiu"')), expect: "install-native.js --gc-widget" },
  /* 註冊 */
  regSuper: { break: both(VC, rep("super.capacitorDidLoad()", "super.capacitorDidLoad( )")), expect: "capacitorDidLoad() 直接註冊 XQSpeechPlugin" },
  regLoop: { break: both(VC, rep('for name in ["XQGameCenterPlugin", "XQWidgetDataPlugin"]', 'for name in ["XQGameCenterPlugin","XQWidgetDataPlugin"]')), expect: "Game Center、小工具有編進 App 才註冊" },
  regInit: { break: both(VC, rep("registerPluginInstance(type.init())", "registerPluginInstance(type .init())")), expect: "Game Center、小工具有編進 App 才註冊" },
  regThird: { break: both(VC, inFunc("override func viewDidLoad()", "bridge?.registerPluginInstance(XQSpeechPlugin())")), expect: "只在 capacitorDidLoad 註冊這兩處" },
  /* 語音 */
  spClass: { break: both(SP, rep("class XQSpeechPlugin: CAPPlugin, CAPBridgedPlugin", "class XQSpeechPlugin: CAPPlugin,CAPBridgedPlugin")), expect: "XQSpeech：@objc 名稱、identifier、jsName" },
  spIdent: { break: both(SP, rep('public let identifier = "XQSpeechPlugin"', 'public let identifier = "XQSpeech"')), expect: "XQSpeech：@objc 名稱、identifier、jsName" },
  spJs: { break: both(SP, rep('public let jsName = "XQSpeech"', 'public let jsName = "XQSpeak"')), expect: "XQSpeech：@objc 名稱、identifier、jsName" },
  spNoFunc: { break: both(SP, rep("@objc func isAvailable(", "@objc public func isAvailable(")), expect: "XQSpeech：speak、stop、isAvailable" },
  spExtraFunc: { break: both(SP, beforeEnd("    @objc func xqExtra(_ call: CAPPluginCall) { call.resolve() }")), expect: "XQSpeech：speak、stop、isAvailable" },
  spQueue: { break: both(SP, rep('DispatchQueue(label: "xq.speech"', 'DispatchQueue(label: "xq.speak"')), expect: "XQSpeech：先回傳" },
  spLate: { break: both(SP, (s) => { const a = s.indexOf("@objc func speak("), b = s.indexOf("@objc func stop("), t = "        call.resolve([\"ok\": true])\n", i = s.indexOf(t, a); if (a < 0 || b < 0 || i < 0 || i > b) throw new Error("找不到 speak 的先回傳"); const s2 = s.slice(0, i) + s.slice(i + t.length), b2 = s2.indexOf("@objc func stop("), e = s2.lastIndexOf("    }", b2); return s2.slice(0, e) + "        call.resolve([\"ok\": true])\n" + s2.slice(e) }), expect: "XQSpeech：先回傳" },
  spSpeakU: { break: both(SP, rep("s.speak(u)", "s.speak( u)")), expect: "XQSpeech：先回傳" },
  spMainSync: { break: both(SP, beforeEnd("    func xqM1() { DispatchQueue.main.sync { } }")), expect: "XQSpeech：沒有任何工作丟回主執行緒" },
  spMainAsync: { break: both(SP, beforeEnd("    func xqM2() { OperationQueue.main.async { } }")), expect: "XQSpeech：沒有任何工作丟回主執行緒" },
  spMainActor: { break: both(SP, beforeEnd("    @MainActor func xqM3() { }")), expect: "XQSpeech：沒有任何工作丟回主執行緒" },
  spWarmZh: { break: both(SP, (s) => { const i = s.indexOf("work.asyncAfter(deadline:"), j = s.indexOf('voice(for: "zh")', i); if (i < 0 || j < 0) throw new Error("找不到預熱"); return s.slice(0, j) + 'voice(for: "en")' + s.slice(j + 'voice(for: "zh")'.length) }), expect: "XQSpeech：App 啟動後在背景佇列先初始化" },
  spWarmCode: { break: both(SP, (s) => repAll("work.asyncAfter(", "work .asyncAfter(")(s).replace("    @objc func speak(", "    // work.asyncAfter(deadline: .now() + 2.0) { ensureSynth(); voice(for: \"zh\") }\n    @objc func speak(")), expect: "XQSpeech：App 啟動後在背景佇列先初始化" },
  spVoice: { break: both(SP, rep("AVSpeechSynthesisVoice(language: w)", "AVSpeechSynthesisVoice(language:w)")), expect: "XQSpeech：語言" },
  spEn: { break: both(SP, rep('["en-US", "en-GB", "en"]', '["en-US", "en-GB"]')), expect: "XQSpeech：語言" },
  spSilent: { break: both(SP, rep("guard let v = self.voice(for: key) else { return }", "guard let v = self.voice(for: key) else {return}")), expect: "XQSpeech：語言" },
  spAppSession: { break: both(SP, rep("usesApplicationAudioSession = true", "usesApplicationAudioSession=true")), expect: "XQSpeech：AVAudioSession 用 .ambient" },
  spCatLate: { break: both(SP, rep('    public let jsName = "XQSpeech"', '    public let jsName = "XQSpeech"\n    @objc func speak(_ xq: Int) { }')), expect: "XQSpeech：音訊類別只在外掛載入時設一次" },
  spBgNote: { break: both(SP, repAll("UIApplication.didEnterBackgroundNotification", "UIApplication.willResignActiveNotification")), expect: "XQSpeech：進背景 stopSpeaking" },
  spRec: { break: both(SP, beforeEnd("    func xqP1() { AVAudioSession.sharedInstance().requestRecordPermission { _ in } }")), expect: "XQSpeech：不要權限、沒有網路程式" },
  spCam: { break: both(SP, beforeEnd("    func xqP2() { _ = AVCaptureDevice.authorizationStatus(for: .audio) }")), expect: "XQSpeech：不要權限、沒有網路程式" },
  spAuth: { break: both(SP, beforeEnd("    func xqP3() { SFSpeechRecognizer.requestAuthorization { _ in } }")), expect: "XQSpeech：不要權限、沒有網路程式" },
  spReq: { break: both(SP, beforeEnd("    func xqP4() { _ = URLRequest(url: URL(fileURLWithPath: \"/\")) }")), expect: "XQSpeech：不要權限、沒有網路程式" },
  spInstFiles: { break: (R) => edit(R, "scripts/install-native.js", rep('{ name: "XQSpeechPlugin.swift", type: "sourcecode.swift", phase: "Sources" }', '{ name: "XQSpeechPlugin.swift", type: "sourcecode.swift", phase: "Sources", xq: 1 }')), expect: "install-native.js：預設就複製 XQSpeechPlugin" },
  spInstConcat: { break: (R) => edit(R, "scripts/install-native.js", (s) => s + "\n// cfg.packageClassList = list.concat(OURS)\n"), expect: "install-native.js：預設就複製 XQSpeechPlugin" },
  spInstFilter: { break: (R) => edit(R, "scripts/install-native.js", rep("cfg.packageClassList = list.filter(c => !OURS.includes(c));", "cfg.packageClassList = list.filter((c) => !OURS.includes(c));")), expect: "install-native.js：預設就複製 XQSpeechPlugin" },
  spPkgList: { break: (R) => fs.writeFileSync(path.join(R, "source", "xiangqi-ios", "ios", "App", "App", "capacitor.config.json"), JSON.stringify({ packageClassList: ["XQSpeechPlugin"] })), expect: "packageClassList 沒有 XQSpeechPlugin" },
  spPkgDup: { break: (R) => fs.writeFileSync(path.join(R, "source", "xiangqi-ios", "ios", "App", "App", "capacitor.config.json"), JSON.stringify({ packageClassList: ["CAPCameraPlugin", "CAPCameraPlugin"] })), expect: "packageClassList 沒有 XQSpeechPlugin" },
  boardSpeak: { break: (R) => editRepo(R, BOARD, rep('.speak({text:', '.speak({ text:')), expect: "01-board.js：原生版有 XQSpeech 就用它" },
  /* 控制字元：check-native 認的 30 個字元（\x00-\x08、\x0B、\x0C、\x0E-\x1F、\x7F），兩份伺服器程式各插一個，每個字元一個壞樣本（照 canary-www 的做法） */
  ...Object.fromEntries([...Array(32).keys(), 127].filter((c) => ![9, 10, 13].includes(c)).map((c) => ["ctrl" + c.toString(16).padStart(2, "0"), { break: both(SRV, (s) => s + "\n// " + String.fromCharCode(c) + "\n"), expect: SRV + " 沒有控制字元" }])),
  /* ===== #135 複審（第二輪）：放寬 30 種裡漏掉的 21 種，各補壞樣本 ===== */
  /* ① if verifyNow(…) 後面再接條件 */
  estOrTrue: { break: both(SRV, rep("if verifyNow(timeout: 2.0) { return .verified }", "if verifyNow(timeout: 0.5) || true { return .verified }")), expect: "establish 一定經過 verifyNow" },
  estOrMid: { break: both(SRV, rep("if verifyNow(timeout: 2.0) { return .verified }", "if verifyNow(timeout: 2.0) == false || true { return .verified }")), expect: "establish 一定經過 verifyNow" },
  /* ② 外掛迴圈：兩支外掛各一個 */
  wdObjc: { break: both(WD, rep("@objc(XQWidgetDataPlugin)", "@objc(XQWD)")), expect: "XQWidgetDataPlugin：@objc 名稱和 CAPPlugin" },
  wdClass: { break: both(WD, rep("XQWidgetDataPlugin: CAPPlugin, CAPBridgedPlugin", "XQWidgetDataPlugin: CAPPlugin,CAPBridgedPlugin")), expect: "XQWidgetDataPlugin：@objc 名稱和 CAPPlugin" },
  gcIdent: { break: both(GC, rep('public let identifier = "XQGameCenterPlugin"', 'public let identifier = "XQGameCenter"')), expect: "XQGameCenterPlugin：identifier" },
  wdJs: { break: both(WD, rep('public let jsName = "XQWidgetData"', 'public let jsName = "XQWD"')), expect: "XQWidgetDataPlugin：identifier" },
  gcCtrl: { break: both(GC, (s) => s + "\n// \u0003\n"), expect: GC + " 沒有控制字元" },
  wdNet: { break: both(WD, beforeEnd("    func xqSend() { _ = URLSession.shared }")), expect: WD + "：沒有網路程式" },
  gcReq: { break: both(GC, beforeEnd("    func xqReq() { _ = URLRequest(url: URL(fileURLWithPath: \"/\")) }")), expect: GC + "：沒有網路程式" },
  /* ③ 其他子條件 */
  ctrlVC: { break: both(VC, (s) => s + "\n// \u0004\n"), expect: VC + " 沒有控制字元" },
  regPlugin: { break: both(VC, inFunc("override func viewDidLoad()", "bridge?.registerPlugin(XQSpeechPlugin.self)")), expect: "只在 capacitorDidLoad 註冊這兩處" },
  groupMissWD: { break: both(WD, rep('static let appGroup = "group.com.raysonchen.xiangqiqianqiu.shared"', 'static let appGroup = ""')), expect: "App Group 四處一樣" },
  groupMissWidget: { break: (R) => edit(R, WG + "XQTodayWidget.swift", rep('static let appGroup = "group.com.raysonchen.xiangqiqianqiu.shared"', 'static let appGroup = ""')), expect: "App Group 四處一樣" },
  groupMissApp: { break: (R) => edit(R, "native/ios/App.entitlements", rep("<string>group.com.raysonchen.xiangqiqianqiu.shared</string>", "<string></string>")), expect: "App Group 四處一樣" },
  groupExtraWD: { break: both(WD, (s) => s + "\n// group.com.raysonchen.other\n"), expect: "App Group 四處一樣" },
  groupExtraWidget: { break: (R) => edit(R, WG + "XQTodayWidget.swift", (s) => s + "\n// group.com.raysonchen.other\n"), expect: "App Group 四處一樣" },
  groupExtraWidgetEnt: { break: (R) => edit(R, WG + "XQTodayWidget.entitlements", rep("<string>group.com.raysonchen.xiangqiqianqiu.shared</string>", "<string>group.com.raysonchen.xiangqiqianqiu.shared</string>\n\t\t<string>group.com.raysonchen.other</string>")), expect: "App Group 四處一樣" },
  braceBad: { break: both(VC, (s) => s + "\n)\n"), expect: "括號不配對" },
  strOpen: { break: both(SRV, (s) => s + "\nlet xqS = \"abc\n"), expect: "字串沒有收尾" },
  strEOF: { break: both(SRV, (s) => s + "\nlet xqS = \"\"\"\nabc\n"), expect: "字串到檔尾還沒收尾" },
  wdJpg: { break: both(WD, rep('imageFile = "today.jpg"', 'imageFile  = "today.jpg"')), expect: "小工具和 XQWidgetData 的檔名一樣：imageFile" },
  vbMissing: { break: both(VC, rep("if outcome == .verified {", "if outcome == XQLoopbackServer.Outcome.verified {")), expect: "只有驗證通過（outcome == .verified）才呼叫 loadVerifiedPage" },
  halfAfter: { break: both(VC, inFunc("override func viewDidLoad()", "DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { }")), expect: "沒有 0.5 秒的重跳" },
  /* ④ 要有 node_modules 或已裝進 Xcode 才跑的判斷：在副本裡做假檔 */
  capVDL: { break: (R) => capFake(R, { vdl: "super.viewDidLoad()\n        xqExtra()\n        loadWebView()" }), expect: "Capacitor 的 viewDidLoad 只有" },
  capLoadWV: { break: (R) => capFake(R, { lwv: "func loadWebView() {}" }), expect: "Capacitor 的 loadWebView() 子類別叫得到" },
  capDidLoad: { break: (R) => capFake(R, { lv: "capacitorBridge = CapacitorBridge(x)\n        xqOther()" }), expect: "Capacitor（node_modules）：loadView 建好 bridge 就呼叫 capacitorDidLoad" },
  capRegInst: { break: (R) => capFake(R, { reg: "public func registerPlugin(_ pluginInstance: CAPPlugin) {}" }), expect: "Capacitor（node_modules）：loadView 建好 bridge 就呼叫 capacitorDidLoad" },
  pbxMissing: { break: (R) => edit(R, "ios/App/App.xcodeproj/project.pbxproj", (s) => s + "\n/* XQGameCenterPlugin.swift */\n"), expect: "pbxproj 已登記 XQGameCenterPlugin.swift" },
  pkgGc: { break: (R) => { gcInstalled(R); fs.writeFileSync(iosp(R, "ios/App/App/capacitor.config.json"), JSON.stringify({ packageClassList: ["XQGameCenterPlugin"] })) }, expect: "packageClassList 沒有 XQGameCenterPlugin、XQWidgetDataPlugin" },
  pkgWd: { break: (R) => { gcInstalled(R); fs.writeFileSync(iosp(R, "ios/App/App/capacitor.config.json"), JSON.stringify({ packageClassList: ["XQWidgetDataPlugin"] })) }, expect: "packageClassList 沒有 XQGameCenterPlugin、XQWidgetDataPlugin" },
  pkgGcDup: { break: (R) => { gcInstalled(R); fs.writeFileSync(iosp(R, "ios/App/App/capacitor.config.json"), JSON.stringify({ packageClassList: ["CAPCameraPlugin", "CAPCameraPlugin"] })) }, expect: "packageClassList 沒有 XQGameCenterPlugin、XQWidgetDataPlugin" },
  infoScheme: { break: (R) => { gcInstalled(R); const ip = iosp(R, "ios/App/App/Info.plist"); fs.writeFileSync(ip, fs.readFileSync(ip, "utf8").split("<string>xqqianqiu</string>").join("<string>xqqianqiu2</string>")) }, expect: "Info.plist 有網址 xqqianqiu://" },
  gcCopyDiff: { break: (R) => { gcInstalled(R); fs.appendFileSync(iosp(R, "ios/App/App/" + GC), "\n// 只改這一份\n") }, expect: GC + " 兩份相同" },
  /* install-native.js 要複製兩支 Swift */
  install: { break: (R) => edit(R, "scripts/install-native.js", rep('"XQBridgeViewController.swift"', '"XQBridgeVC.swift"')), expect: "install-native.js 會複製兩支 Swift" },
};

function copyTree(R) {
  const dst = path.join(R, "source", "xiangqi-ios");
  /* #135 審查⑤：path.relative 算出來沒有前導斜線，最上層的 node_modules、build 原本排除不到；ios/App/App/public（網頁副本，幾百 MB）check-native 不讀，也排除 */
  const SKIP = /(^|[\\/])(node_modules|Pods|DerivedData|build)([\\/]|$)|^ios[\\/]App[\\/]App[\\/]public([\\/]|$)/;
  fs.cpSync(IOS, dst, { recursive: true, filter: (src) => !SKIP.test(path.relative(IOS, src)) });
  for (const f of WEBFILES) { const a = path.join(REPO, ...f.split("/")); if (fs.existsSync(a)) { const b = path.join(R, ...f.split("/")); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b) } }
  /* node_modules 裡的 Capacitor 檔（有才複製，check-native 找不到只會警告） */
  /* check-native 讀這兩支：CAPBridgeViewController.swift（viewDidLoad、loadView）和 CapacitorBridge.swift（registerPluginInstance）；有才複製 */
  for (const f of ["CAPBridgeViewController.swift", "CapacitorBridge.swift"]) {
    const cap = path.join(IOS, "node_modules", "@capacitor", "ios", "Capacitor", "Capacitor", f);
    if (fs.existsSync(cap)) { const b = path.join(dst, "node_modules", "@capacitor", "ios", "Capacitor", "Capacitor", f); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(cap, b) }
  }
}
const exitOf = (results, pass) => (pass ? 0 : results.some((x) => !x.unfit && x.caught !== true) ? 4 : 2);

function run({ only = null, tmp = os.tmpdir(), log = console.log } = {}) {
  const unfit = (why) => ({ code: 2, receipt: { tool: "P0-native-canary", platform: "ios", unfit: true, why } });
  const want = only == null ? Object.keys(KINDS) : String(only).split(",").map((s) => s.trim()).filter(Boolean);
  if (!want.length) return unfit("--only 沒有列任何壞樣本");
  for (const k of want) if (!KINDS[k]) return unfit("不認得的壞樣本：" + k + "（可用：" + Object.keys(KINDS).join(" ") + "）");
  const base = fs.mkdtempSync(path.join(tmp, "xq-canary-native-"));
  try {
    const R0 = path.join(base, "clean"); copyTree(R0);
    const C0 = path.join(R0, "source", "xiangqi-ios", "scripts", "check-native.js");
    if (toolSha(C0) !== toolSha(CHECK)) return unfit("複製過去的 check-native.js 跟原本的不一樣");
    const check = (R) => cp.spawnSync(process.execPath, [path.join(R, "source", "xiangqi-ios", "scripts", "check-native.js")], { encoding: "utf8", maxBuffer: 64e6 });
    const clean = check(R0);
    if (clean.status !== 0) return unfit("乾淨的副本沒過 check-native.js（先修好再跑金絲雀）：" + String(clean.stderr).split("\n").filter(Boolean).slice(0, 3).join("／"));
    const results = [];
    for (const k of want) {
      const K = KINDS[k], R = path.join(base, k);
      fs.cpSync(R0, R, { recursive: true });
      try { K.break(R) } catch (e) { results.push({ kind: k, caught: false, unfit: true, why: "做壞樣本失敗：" + e.message }); log("✘ " + k + "：做壞樣本失敗（" + e.message + "）"); continue }
      const r = check(R), err = String(r.stderr), line = err.split("\n").find((l) => l.startsWith("✘ ") && l.includes(K.expect));
      const caught = r.status === 1 && !!line;
      results.push({ kind: k, expect: K.expect, exit: r.status, caught });
      log((caught ? "✔ " : "✘ ") + k + (caught ? " 被抓到" : " 沒被抓到（結束代碼 " + r.status + "，錯誤裡" + (line ? "有" : "沒有") + "「" + K.expect + "」）"));
      fs.rmSync(R, { recursive: true, force: true });
    }
    const pass = results.length === want.length && results.every((x) => x.caught === true), code = exitOf(results, pass);
    const receipt = {
      tool: "P0-native-canary", platform: "ios", at: new Date().toISOString(), kinds: want, results, pass, code,
      toolPins: { "source/xiangqi-ios/scripts/check-native.js": toolSha(CHECK), "source/xiangqi-ios/scripts/canary-native.js": toolSha(__filename) },
      full: code === 0 && only == null,
    };
    return { code, receipt };
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
}

module.exports = { run, KINDS, exitOf, toolSha };
if (require.main === module) {
  const argv = process.argv.slice(2).flatMap((a) => { const m = /^(--[a-z-]+)=(.*)$/s.exec(a); return m ? [m[1], m[2]] : [a] });
  const KNOWN = ["--only", "--out"];
  const bad = argv.find((a) => a.startsWith("--") && !KNOWN.includes(a));
  if (bad) { console.error("✘ 測試不成立：不認得的參數 " + bad); process.exit(2) }
  const opt = (k) => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; if (v == null || v === "" || v.startsWith("--")) { console.error("✘ 測試不成立：" + k + " 後面要接值"); process.exit(2) } return v };
  const { code, receipt } = run({ only: opt("--only") });
  if (receipt.unfit) console.error("✘ 測試不成立：" + receipt.why);
  const out = opt("--out"); if (out) fs.writeFileSync(out, JSON.stringify(receipt, null, 1) + "\n");
  if (!receipt.unfit) console.log(receipt.pass ? `✔ 原生檢查金絲雀：${receipt.results.length} 個壞樣本都被 check-native.js 抓到` + (receipt.full ? "" : "（只跑部分）")
    : "✘ 原生檢查金絲雀沒過：" + receipt.results.filter((x) => !x.caught).map((x) => x.kind).join("、") + (code === 4 ? "——check-native 本身失靈，這一輪結果不可信" : ""));
  process.exit(code);
}
