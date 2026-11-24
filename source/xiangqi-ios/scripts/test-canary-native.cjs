// iOS 原生檢查金絲雀 canary-native.js 的自我測試（AGENTS.md「P0 出口驗證要難作假」，2026-11-23）
//   乾淨的副本要全過、每個壞樣本都要被抓到；再把 check-native.js 的判斷一條一條改成恆真（放在整份副本裡），對應的壞樣本要回 4（檢查失靈）。
// 用法：node --test source/xiangqi-ios/scripts/test-canary-native.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const HERE = __dirname, IOS = path.join(HERE, ".."), REPO = path.join(IOS, "..", "..");
const CHECK = path.join(HERE, "check-native.js"), CANARY = path.join(HERE, "canary-native.js");
const { KINDS, exitOf, toolSha, run } = require("./canary-native.js");
/* #135 審查④：壞樣本名稱寫死（不從受測程式取），少一種、多一種、改名都會紅 */
const EXPECTED_KINDS = ["copyDiff","port","whoami","rng","challenge","oneTime","whoamiAnswer","establish","establishIf","establishElse","establishGuard","establishCase","establishLocalFunc","establishHelper","verifiedElsewhere","inUse","eaddrinuse","acceptLocalOnly","loopback","sourceCheck","leftover","superVDL","runCheck","loadTwice","phaseGate","loadUnverified","runningUnverified","directLoad","halfSecond","alert","retryDelays","retryCap","manualRetry","bilingual","guidance","keepSave","foreground","brace","ctrl","gcNetwork","gcPlayerId","gcLogin","wdPath","fgLog","gcObjc","gcJsName","gcMethods","gcWebCall","wdReload","widgetMain","widgetURL","widgetNet","widgetCtrl","widgetFile","appGroup","gcEntitle","widgetPlist","webScheme","webNet","installGc","regSpeech","regGuarded","regOther","spObjc","spMethods","spOrder","spMain","spWarm","spLang","spAmbient","spOnce","spBg","spNet","spCtrl","spInstall","spCopy","board","whoamiTake","estOneBlock","estTickFunc","estNoReturn","estElseAfter","estFuncTwice","srcCancel","leftoverRead","lvpLoad","vbLoad","vbRunning","loadFile","loadReq","showRetry","failedPhase","zhBusy","zhGuide","noDiskCache","clearIDB","onBroken","fgFlag","installSrv","gcClass","wdIdent","wdListedNoFunc","wdWebNone","wdReq","wdCtrl","gcAuth","gcPresent","gcKeep","gcPid","gcTeam","gcName","gcAlias","wdBox","wdData","widgetBundle","widgetOpen","widgetReq","widgetJpg","wdDataFile","groupMissing","groupExtra","webSchemeRe","webXhr","webBeacon","webSocket","webXQNet","webIRT","instGcFile","instWdFile","instClasses","instScheme","regSuper","regLoop","regInit","regThird","spClass","spIdent","spJs","spNoFunc","spExtraFunc","spQueue","spLate","spSpeakU","spMainSync","spMainAsync","spMainActor","spWarmZh","spWarmCode","spVoice","spEn","spSilent","spAppSession","spCatLate","spBgNote","spRec","spCam","spAuth","spReq","spInstFiles","spInstConcat","spInstFilter","spPkgList","spPkgDup","boardSpeak","ctrl00","ctrl01","ctrl02","ctrl03","ctrl04","ctrl05","ctrl06","ctrl07","ctrl08","ctrl0b","ctrl0c","ctrl0e","ctrl0f","ctrl10","ctrl11","ctrl12","ctrl13","ctrl14","ctrl15","ctrl16","ctrl17","ctrl18","ctrl19","ctrl1a","ctrl1b","ctrl1c","ctrl1d","ctrl1e","ctrl1f","ctrl7f","estOrTrue","estOrMid","wdObjc","wdClass","gcIdent","wdJs","gcCtrl","wdNet","gcReq","ctrlVC","regPlugin","groupMissWD","groupMissWidget","groupMissApp","groupExtraWD","groupExtraWidget","groupExtraWidgetEnt","braceBad","strOpen","strEOF","wdJpg","vbMissing","halfAfter","capVDL","capLoadWV","capDidLoad","capRegInst","pbxMissing","pkgGc","pkgWd","pkgGcDup","infoScheme","gcCopyDiff","install"];
/* #135 審查①②③：check-native.js 的子條件改壞清單（寫死）。每一條只拿掉一個子條件或正規式裡的一個字，指定的壞樣本要回 4 */
const MUT = [
  ["一次性考題：issueChallenge","check(/func issueChallenge\\(\\)/.test(srvCode) && ","check(true && ","challenge"],
  ["whoami：takeAnswer(for: challenge)","check(hw.includes(\"takeAnswer(for: challenge)\") && ","check(true && ","whoamiTake"],
  ["whoami：let a = answer","&& hw.includes(\"let a = answer\"), \"whoami",", \"whoami","whoamiAnswer"],
  ["establish：至少 2 個 if 區塊","check(vBlocks.length >= 2 && ","check(vBlocks.length >= 1 && ","estOneBlock"],
  ["establish：verifyNow 字數＝if 區塊數","&& vTok === vBlocks.length\n","\n","estTickFunc"],
  ["establish：if 區塊裡要有 return .verified","/\\breturn\\s+\\.verified\\b/.test(b.inner) && ","true && ","estNoReturn"],
  ["establish：if 區塊後不能接 else","&& !/^\\s*else\\b/.test(est.slice(b.end)))",")","estElseAfter"],
  ["establish：合格區塊外不能有 .verified","&& !/\\.verified\\b/.test(srvCode.replace(est, vRest))","","establishGuard"],
  ["establish：整份只能有一個 func verifyNow","&& (srvCode.match(/\\bfunc\\s+verifyNow\\b/g) || []).length === 1,",",","estFuncTwice"],
  ["來源位址：a.isLoopback","check(srvCode.includes(\"a.isLoopback\") && ","check(true && ","sourceCheck"],
  ["來源位址：conn.cancel(); return","&& srvCode.includes(\"conn.cancel(); return\"), \"accept()",", \"accept()","srcCancel"],
  ["leftover：putLeftover","check(srvCode.includes(\"putLeftover(conn, rest)\") && ","check(true && ","leftover"],
  ["leftover：readRequest(conn, buffer: rest)","&& srvCode.includes(\"readRequest(conn, buffer: rest)\"), \"leftover",", \"leftover","leftoverRead"],
  ["loadVerifiedPage：有 loadWebView()","check(lvp.includes(\"loadWebView()\") && ","check(true && ","lvpLoad"],
  ["loadVerifiedPage：phase == .running","&& lvp.includes(\"self.phase == .running\"), \"loadWebView() 只在",", \"loadWebView() 只在","phaseGate"],
  ["loadVerifiedPage 恰好兩次","check(count(vcCode, \"loadVerifiedPage()\") === 2 && ","check(true && ","loadUnverified"],
  ["verified 區塊裡呼叫 loadVerifiedPage","&& vb.includes(\"loadVerifiedPage()\"), \"只有驗證通過",", \"只有驗證通過","vbLoad"],
  ["phase = .running 恰好一次","check(count(vcCode, \"phase = .running\") === 1 && ","check(true && ","runningUnverified"],
  ["verified 區塊裡 phase = .running","&& vb.includes(\"phase = .running\"), \"只有驗證通過才進",", \"只有驗證通過才進","vbRunning"],
  ["直接載入：.load(URLRequest","check(!/\\.load\\(URLRequest|loadFileURL|\\.load\\(\\s*req/.test(vcCode)","check(!/loadFileURL|\\.load\\(\\s*req/.test(vcCode)","directLoad"],
  ["直接載入：loadFileURL","check(!/\\.load\\(URLRequest|loadFileURL|\\.load\\(\\s*req/.test(vcCode)","check(!/\\.load\\(URLRequest|\\.load\\(\\s*req/.test(vcCode)","loadFile"],
  ["直接載入：.load(req","check(!/\\.load\\(URLRequest|loadFileURL|\\.load\\(\\s*req/.test(vcCode)","check(!/\\.load\\(URLRequest|loadFileURL/.test(vcCode)","loadReq"],
  ["提示視窗：UIAlertController","check(!vcCode.includes(\"UIAlertController\") && ","check(true && ","alert"],
  ["提示視窗：showRetry","&& !vcCode.includes(\"showRetry\"), \"沒有一直重跳",", \"沒有一直重跳","showRetry"],
  ["重試上限：retryIndex < retryDelays.count","check(/retryIndex < retryDelays\\.count/.test(hd) && ","check(true && ","retryCap"],
  ["重試上限：phase = .failed","&& /phase = \\.failed/.test(hd), \"自動重試有上限",", \"自動重試有上限","failedPhase"],
  ["中英：中文","check(vc.includes(\"另一個 App 占用了\") && ","check(true && ","zhBusy"],
  ["中英：英文","&& vc.includes(\"Another app is using\"), \"錯誤畫面中英文都有",", \"錯誤畫面中英文都有","bilingual"],
  ["處理方式：中文","check(vc.includes(\"請關閉其他 App\") && ","check(true && ","zhGuide"],
  ["處理方式：英文","&& vc.includes(\"Close other apps\"), \"錯誤畫面有處理方式",", \"錯誤畫面有處理方式","guidance"],
  ["只清快取：有清 DiskCache","check(vcCode.includes(\"WKWebsiteDataTypeDiskCache\") && ","check(true && ","noDiskCache"],
  ["只清快取：不清 LocalStorage","WKWebsiteDataType(LocalStorage|IndexedDBDatabases)","WKWebsiteDataType(IndexedDBDatabases)","keepSave"],
  ["只清快取：不清 IndexedDB","WKWebsiteDataType(LocalStorage|IndexedDBDatabases)","WKWebsiteDataType(LocalStorage)","clearIDB"],
  ["回前景：willEnterForeground","check(vcCode.includes(\"UIApplication.willEnterForegroundNotification\") && ","check(true && ","foreground"],
  ["回前景：onBroken","&& vcCode.includes(\"onBroken\"), \"回前景",", \"回前景","onBroken"],
  ["回前景 log：NSLog","check(vc.includes(\"NSLog(\\\"[XQLoopback] 回前景重驗通過\") && ","check(true && ","fgLog"],
  ["回前景 log：foregroundRecheck","&& /if self\\.phase == \\.running \\{ self\\.foregroundRecheck = true \\}/.test(vc), \"回前景重驗通過時",", \"回前景重驗通過時","fgFlag"],
  ["install：XQLoopbackServer.swift","check(inst.includes(\"\\\"XQLoopbackServer.swift\\\"\") && ","check(true && ","installSrv"],
  ["install：XQBridgeViewController.swift","&& inst.includes(\"\\\"XQBridgeViewController.swift\\\"\"), \"install-native.js 會複製兩支",", \"install-native.js 會複製兩支","install"],
  ["外掛 @objc 名稱","check(s.includes(\"@objc(\" + p.cls + \")\") && ","check(true && ","gcObjc"],
  ["外掛 CAPPlugin 類別","&& c.includes(\"class \" + p.cls + \": CAPPlugin, CAPBridgedPlugin\"), p.cls",", p.cls","gcClass"],
  ["外掛 identifier","check(s.includes(\"public let identifier = \\\"\" + p.cls + \"\\\"\") && ","check(true && ","wdIdent"],
  ["外掛 jsName","&& s.includes(\"public let jsName = \\\"\" + p.js + \"\\\"\"), p.cls",", p.cls","gcJsName"],
  ["外掛方法：登記的都有 func","listed.every(n => funcs.includes(n)) && funcs.every(n => listed.includes(n)), p.cls","funcs.every(n => listed.includes(n)), p.cls","wdListedNoFunc"],
  ["外掛方法：func 都有登記","&& funcs.every(n => listed.includes(n)), p.cls + \"：pluginMethods",", p.cls + \"：pluginMethods","gcMethods"],
  ["網頁呼叫：有呼叫","check(used.length > 0 && used.every","check(used.every","wdWebNone"],
  ["網頁呼叫：都有","check(used.length > 0 && used.every(n => listed.includes(n)), \"07gc","check(used.length > 0, \"07gc","gcWebCall"],
  ["外掛網路：URLSession","check(!/URLSession|URLRequest|https?:\\/\\//.test(c), p.file","check(!/URLRequest|https?:\\/\\//.test(c), p.file","gcNetwork"],
  ["外掛網路：URLRequest","check(!/URLSession|URLRequest|https?:\\/\\//.test(c), p.file","check(!/URLSession|https?:\\/\\//.test(c), p.file","wdReq"],
  ["外掛控制字元","check(!/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/.test(s), p.file","check(true, p.file","wdCtrl"],
  ["GC 登入：authenticateHandler","check(/authenticateHandler/.test(gc) && ","check(true && ","gcAuth"],
  ["GC 登入：不 present","&& !/present\\(\\s*viewController/.test(gc) && ","&& ","gcPresent"],
  ["GC 登入：收著 loginVC","&& /self\\.loginVC = viewController/.test(gc), \"Game Center 登入",", \"Game Center 登入","gcKeep"],
  ["GC 隱私：playerID","/playerID|gamePlayerID|teamPlayerID|displayName|alias/","/gamePlayerID|teamPlayerID|displayName|alias/","gcPid"],
  ["GC 隱私：gamePlayerID","/playerID|gamePlayerID|teamPlayerID|displayName|alias/","/playerID|teamPlayerID|displayName|alias/","gcPlayerId"],
  ["GC 隱私：teamPlayerID","/playerID|gamePlayerID|teamPlayerID|displayName|alias/","/playerID|gamePlayerID|displayName|alias/","gcTeam"],
  ["GC 隱私：displayName","/playerID|gamePlayerID|teamPlayerID|displayName|alias/","/playerID|gamePlayerID|teamPlayerID|alias/","gcName"],
  ["GC 隱私：alias","/playerID|gamePlayerID|teamPlayerID|displayName|alias/","/playerID|gamePlayerID|teamPlayerID|displayName/","gcAlias"],
  ["WD：reloadAllTimelines","check(wd.includes(\"WidgetCenter.shared.reloadAllTimelines()\") && ","check(true && ","wdReload"],
  ["WD：App Group 容器","&& wd.includes(\"forSecurityApplicationGroupIdentifier\"), \"XQWidgetData：寫",", \"XQWidgetData：寫","wdBox"],
  ["WD：不收 ..","check(wd.includes(\"rel.contains(\\\"..\\\")\") && ","check(true && ","wdPath"],
  ["WD：只收 data/","&& wd.includes(\"hasPrefix(\\\"data/\\\")\"), \"XQWidgetData：圖",", \"XQWidgetData：圖","wdData"],
  ["小工具：@main","check(/@main\\s+struct XQWidgetBundle: WidgetBundle/.test(wc) && ","check(true && ","widgetBundle"],
  ["小工具：URL 常數","check(w.includes(\"static let openURL = URL(string: \\\"\" + SCHEME + \"://canju\\\")\") && ","check(true && ","widgetURL"],
  ["小工具：widgetURL","&& wc.includes(\".widgetURL(XQWidgetConfig.openURL)\"), \"小工具：點了開",", \"小工具：點了開","widgetOpen"],
  ["小工具網路：URLSession","check(!/URLSession|URLRequest|https?:\\/\\//.test(wc)","check(!/URLRequest|https?:\\/\\//.test(wc)","widgetNet"],
  ["小工具網路：URLRequest","check(!/URLSession|URLRequest|https?:\\/\\//.test(wc)","check(!/URLSession|https?:\\/\\//.test(wc)","widgetReq"],
  ["小工具檔名：today.jpg","for (const k of [\"dataFile = \\\"today.json\\\"\", \"imageFile = \\\"today.jpg\\\"\"])","for (const k of [\"dataFile = \\\"today.json\\\"\"])","widgetJpg"],
  ["小工具檔名：小工具那邊","check(w.includes(k) && wd.includes(k)","check(wd.includes(k)","widgetFile"],
  ["小工具檔名：WD 那邊","check(w.includes(k) && wd.includes(k)","check(w.includes(k)","wdDataFile"],
  ["App Group：四處都有","check(groups.every(s => s.includes(GROUP)) && ","check(true && ","groupMissing"],
  ["App Group：沒有別的 group","&& groups.every(s => (s.match(/group\\.com\\.[\\w.]+/g) || []).every(g => g === GROUP)), \"App Group",", \"App Group","groupExtra"],
  ["07gc 網址：xqqianqiu://","check(web.includes(\"xqqianqiu:\\\\/\\\\/\") && ","check(true && ","webSchemeRe"],
  ["07gc 網址：canju","&& web.includes(\"\\\"canju\\\":\\\"#/canju\\\"\"), \"07gc",", \"07gc","webScheme"],
  ["07gc 不連網：fetch","/\\bfetch\\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\\b|shareIRT/","/XMLHttpRequest|sendBeacon|WebSocket|XQNet\\b|shareIRT/","webNet"],
  ["07gc 不連網：XMLHttpRequest","/\\bfetch\\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\\b|shareIRT/","/\\bfetch\\(|sendBeacon|WebSocket|XQNet\\b|shareIRT/","webXhr"],
  ["07gc 不連網：sendBeacon","/\\bfetch\\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\\b|shareIRT/","/\\bfetch\\(|XMLHttpRequest|WebSocket|XQNet\\b|shareIRT/","webBeacon"],
  ["07gc 不連網：WebSocket","/\\bfetch\\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\\b|shareIRT/","/\\bfetch\\(|XMLHttpRequest|sendBeacon|XQNet\\b|shareIRT/","webSocket"],
  ["07gc 不連網：XQNet","/\\bfetch\\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\\b|shareIRT/","/\\bfetch\\(|XMLHttpRequest|sendBeacon|WebSocket|shareIRT/","webXQNet"],
  ["07gc 不連網：shareIRT","/\\bfetch\\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\\b|shareIRT/","/\\bfetch\\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\\b/","webIRT"],
  ["install gc：--gc-widget","check(inst.includes(\"\\\"--gc-widget\\\"\") && ","check(true && ","installGc"],
  ["install gc：GC 檔","&& inst.includes(\"\\\"XQGameCenterPlugin.swift\\\"\") && ","&& ","instGcFile"],
  ["install gc：WD 檔","&& inst.includes(\"\\\"XQWidgetDataPlugin.swift\\\"\")\n","\n","instWdFile"],
  ["install gc：類別清單","    && inst.includes(\"\\\"XQGameCenterPlugin\\\", \\\"XQWidgetDataPlugin\\\"\") && ","    && ","instClasses"],
  ["install gc：網址","&& inst.includes(\"const URL_SCHEME = \\\"\" + SCHEME + \"\\\"\"), \"install-native.js --gc-widget",", \"install-native.js --gc-widget","instScheme"],
  ["註冊：super.capacitorDidLoad","&& /super\\.capacitorDidLoad\\(\\)/.test(body) && ","&& ","regSuper"],
  ["註冊：XQSpeech instance","&& /bridge\\?\\.registerPluginInstance\\(XQSpeechPlugin\\(\\)\\)/.test(body), \"XQBridge",", \"XQBridge","regSpeech"],
  ["註冊：for name in","check(raw.includes(\"for name in [\\\"XQGameCenterPlugin\\\", \\\"XQWidgetDataPlugin\\\"]\") && ","check(true && ","regLoop"],
  ["註冊：as? CAPPlugin.Type","&& /NSClassFromString\\(name\\) as\\? CAPPlugin\\.Type/.test(body) && ","&& ","regGuarded"],
  ["註冊：type.init()","&& /registerPluginInstance\\(type\\.init\\(\\)\\)/.test(body), \"XQBridge",", \"XQBridge","regInit"],
  ["註冊：恰好兩處","check((vcCode.match(/registerPluginInstance\\(/g) || []).length === 2 && ","check(true && ","regThird"],
  ["註冊：沒有別的方式","&& !/registerPluginType|registerPlugin\\(/.test(vcCode), \"XQBridge",", \"XQBridge","regOther"],
  ["語音：@objc","check(s.includes(\"@objc(XQSpeechPlugin)\") && ","check(true && ","spObjc"],
  ["語音：類別","&& c.includes(\"class XQSpeechPlugin: CAPPlugin, CAPBridgedPlugin\") && ","&& ","spClass"],
  ["語音：identifier","&& s.includes(\"public let identifier = \\\"XQSpeechPlugin\\\"\") && ","&& ","spIdent"],
  ["語音：jsName","&& s.includes(\"public let jsName = \\\"XQSpeech\\\"\"), \"XQSpeech：@objc",", \"XQSpeech：@objc","spJs"],
  ["語音方法：都有 func","check([\"speak\", \"stop\", \"isAvailable\"].every(n => listed.includes(n) && funcs.includes(n))","check([\"speak\", \"stop\", \"isAvailable\"].every(n => listed.includes(n))","spNoFunc"],
  ["語音方法：func 都有登記","&& funcs.every(n => listed.includes(n)), \"XQSpeech：speak",", \"XQSpeech：speak","spExtraFunc"],
  ["語音順序：work 佇列","check(/private let work = DispatchQueue\\(label: \"xq\\.speech\"/.test(s) && ","check(true && ","spQueue"],
  ["語音順序：有先回傳","sp.indexOf(\"call.resolve([\\\"ok\\\": true])\") >= 0 && ","","spOrder"],
  ["語音順序：回傳在 async 前","sp.indexOf(\"call.resolve([\\\"ok\\\": true])\") < sp.indexOf(\"work.async\") && ","","spLate"],
  ["語音順序：async 裡 speak","&& /work\\.async[\\s\\S]*s\\.speak\\(u\\)/.test(sp), \"XQSpeech：先回傳",", \"XQSpeech：先回傳","spSpeakU"],
  ["語音主執行緒：DispatchQueue.main","check(!/DispatchQueue\\.main|\\.main\\.async|MainActor/.test(c)","check(!/\\.main\\.async|MainActor/.test(c)","spMainSync"],
  ["語音主執行緒：.main.async","check(!/DispatchQueue\\.main|\\.main\\.async|MainActor/.test(c)","check(!/DispatchQueue\\.main|MainActor/.test(c)","spMainAsync"],
  ["語音主執行緒：MainActor","check(!/DispatchQueue\\.main|\\.main\\.async|MainActor/.test(c)","check(!/DispatchQueue\\.main|\\.main\\.async/.test(c)","spMainActor"],
  ["語音預熱：原文","check(/work\\.asyncAfter\\(deadline: \\.now\\(\\) \\+ [\\d.]+\\)[\\s\\S]{0,200}ensureSynth\\(\\)[\\s\\S]{0,80}voice\\(for: \"zh\"\\)/.test(s) && ","check(true && ","spWarmZh"],
  ["語音預熱：程式碼","&& /work\\.asyncAfter/.test(c), \"XQSpeech：App 啟動後",", \"XQSpeech：App 啟動後","spWarmCode"],
  ["語音語言：AVSpeechSynthesisVoice","check(/AVSpeechSynthesisVoice\\(language: w\\)/.test(c) && ","check(true && ","spVoice"],
  ["語音語言：中文清單","&& s.includes(\"[\\\"zh-TW\\\", \\\"zh-Hant\\\", \\\"zh-HK\\\"]\") && ","&& ","spLang"],
  ["語音語言：英文清單","&& s.includes(\"[\\\"en-US\\\", \\\"en-GB\\\", \\\"en\\\"]\") && ","&& ","spEn"],
  ["語音語言：找不到就不出聲","&& /guard let v = self\\.voice\\(for: key\\) else \\{ return \\}/.test(c), \"XQSpeech：語言",", \"XQSpeech：語言","spSilent"],
  ["語音音訊：ambient","check(/setCategory\\(\\.ambient/.test(c) && ","check(true && ","spAmbient"],
  ["語音音訊：usesApplicationAudioSession","&& /usesApplicationAudioSession = true/.test(c), \"XQSpeech：AVAudioSession",", \"XQSpeech：AVAudioSession","spAppSession"],
  ["語音一次：只設一次","check((c.match(/setCategory\\(/g) || []).length === 1 && ","check(true && ","spOnce"],
  ["語音一次：在 speak 前","&& c.indexOf(\"setCategory(\") < c.indexOf(\"@objc func speak(\"), \"XQSpeech：音訊類別",", \"XQSpeech：音訊類別","spCatLate"],
  ["語音背景：通知","check(/UIApplication\\.didEnterBackgroundNotification/.test(c) && ","check(true && ","spBgNote"],
  ["語音背景：stopSpeaking","&& /stopSpeaking\\(at: \\.immediate\\)/.test(c.slice(c.indexOf(\"private func stopAll()\"))), \"XQSpeech：進背景",", \"XQSpeech：進背景","spBg"],
  ["語音權限：requestRecordPermission","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","/AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","spRec"],
  ["語音權限：AVCaptureDevice","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","/requestRecordPermission|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","spCam"],
  ["語音權限：requestAuthorization","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","/requestRecordPermission|AVCaptureDevice|URLSession|URLRequest|https?:\\/\\//","spAuth"],
  ["語音網路：URLSession","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLRequest|https?:\\/\\//","spNet"],
  ["語音網路：URLRequest","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|https?:\\/\\//","spReq"],
  ["install 語音：FILES","check(inst.includes(\"{ name: \\\"XQSpeechPlugin.swift\\\", type: \\\"sourcecode.swift\\\", phase: \\\"Sources\\\" }\") && ","check(true && ","spInstFiles"],
  ["install 語音：BASE_CLASSES","&& inst.includes(\"const BASE_CLASSES = [\\\"XQSpeechPlugin\\\"];\") && ","&& ","spInstall"],
  ["install 語音：不再 concat","&& !/packageClassList = list.concat/.test(inst) && ","&& ","spInstConcat"],
  ["install 語音：清掉舊的","&& inst.includes(\"cfg.packageClassList = list.filter(c => !OURS.includes(c));\"), \"install-native.js：預設",", \"install-native.js：預設","spInstFilter"],
  ["01-board：N.has","check(w.includes(\"N.has(\\\"XQSpeech\\\")\") && ","check(true && ","board"],
  ["01-board：speak","&& /plug\\(\"XQSpeech\"\\)[\\s\\S]{0,80}\\.speak\\(\\{text:/.test(w), \"01-board",", \"01-board","boardSpeak"],
  ["語音 packageClassList：沒有 XQSpeechPlugin","check(!list.includes(\"XQSpeechPlugin\") && ","check(true && ","spPkgList"],
  ["語音 packageClassList：沒有重複","&& new Set(list).size === list.length, \"packageClassList 沒有 XQSpeechPlugin",", \"packageClassList 沒有 XQSpeechPlugin","spPkgDup"],
  ["控制字元：只認 \\x01","  const m = s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/);","  const m = s.match(/[\\x01]/);","ctrl00"],
  ["控制字元：少 \\x7F","  const m = s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/);","  const m = s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/);","ctrl7f"],
  ["控制字元：少 \\x0B\\x0C","  const m = s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/);","  const m = s.match(/[\\x00-\\x08\\x0E-\\x1F\\x7F]/);","ctrl0b"],
  ["控制字元：少 \\x00","  const m = s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/);","  const m = s.match(/[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/);","ctrl00"],
  ["控制字元：少 \\x1F","  const m = s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/);","  const m = s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1E\\x7F]/);","ctrl1f"],
];
/* 沒辦法單獨測的子條件：跟別條重疊、或在程式碼裡出不來。原文還在就好（拿掉也不會讓金絲雀判失靈，原因寫在第四欄） */
const REDUNDANT = [
  ["一次性考題：takeAnswer 簽名","&& /func takeAnswer\\(for c: String\\)/.test(srvCode), \"有一次性考題",", \"有一次性考題","跟「考題查過就作廢」用同一個簽名找函式本體，改簽名兩條一起紅"],
  ["establish：establishNow 裡不能宣告 verifyNow","&& !/\\bfunc\\s+verifyNow\\b/.test(est) && ","&& ","任何宣告都多一個 verifyNow 字，先被「verifyNow 字數＝if 區塊數」抓到"],
  ["viewDidLoad：找得到","check(vdl !== null && !vdl.includes(\"super.viewDidLoad\")","check(!(vdl||\"\").includes(\"super.viewDidLoad\")","找不到 viewDidLoad 時「viewDidLoad 先開伺服器＋驗證」也會紅"],
  ["外掛方法：有登記","check(listed.length > 0 && listed.every(n => funcs.includes(n))","check(listed.every(n => funcs.includes(n))","兩支外掛的方法 07gc-native.js 都有呼叫，沒登記會先被「07gc 呼叫的方法外掛都有」抓到"],
  ["外掛網路：http","check(!/URLSession|URLRequest|https?:\\/\\//.test(c), p.file","check(!/URLSession|URLRequest/.test(c), p.file","swiftCode 把字串換成空白、// 又是註解開頭，https:// 在程式碼裡出不來"],
  ["小工具網路：http","check(!/URLSession|URLRequest|https?:\\/\\//.test(wc)","check(!/URLSession|URLRequest/.test(wc)","同上，https:// 在程式碼裡出不來"],
  ["註冊：capacitorDidLoad 存在","check(dl >= 0 && /super\\.capacitorDidLoad","check(/super\\.capacitorDidLoad","找不到 capacitorDidLoad 時，下面兩條也讀不到內容一起紅"],
  ["語音方法：都有登記","check([\"speak\", \"stop\", \"isAvailable\"].every(n => listed.includes(n) && funcs.includes(n))","check([\"speak\", \"stop\", \"isAvailable\"].every(n => funcs.includes(n))","沒登記但有 func，「func 都有登記」一定先紅"],
  ["語音網路：http","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest/","同上，https:// 在程式碼裡出不來"],
];
/* #135 審查④：盲測（每條判斷整條改成恆真）的確切條數 */
const BLIND_N = 135;
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });
const tmp = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); made.push(d); return d };
const runCanary = (canary, args = []) => cp.spawnSync(process.execPath, [canary, ...args], { encoding: "utf8" });

/* 整份副本（跟金絲雀一樣：source/xiangqi-ios 不含 node_modules，加上 check-native 讀的兩支網頁檔），回傳副本裡的 canary-native.js */
function repoCopy() {
  const R = tmp("xq-cnrepo-");
  /* #135 審查⑤：path.relative 沒有前導斜線，最上層的 node_modules、build 原本排除不到；ios/App/App/public 也排除（跟金絲雀一樣） */
  const SKIP = /(^|[\\/])(node_modules|Pods|DerivedData|build)([\\/]|$)|^ios[\\/]App[\\/]App[\\/]public([\\/]|$)/;
  fs.cpSync(IOS, path.join(R, "source", "xiangqi-ios"), { recursive: true, filter: (s) => !SKIP.test(path.relative(IOS, s)) });
  for (const f of ["source/xiangqi-db/m/07gc-native.js", "source/xiangqi-db/m/01-board.js"]) { const a = path.join(REPO, ...f.split("/")); if (fs.existsSync(a)) { const b = path.join(R, ...f.split("/")); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b) } }
  return { R, canary: path.join(R, "source", "xiangqi-ios", "scripts", "canary-native.js"), check: path.join(R, "source", "xiangqi-ios", "scripts", "check-native.js") };
}

test("乾淨的全過、每一種壞樣本都被 check-native.js 抓到；收據記兩支工具的雜湊", () => {
  const out = path.join(tmp("xq-cnout-"), "r.json"), r = runCanary(CANARY, ["--out", out]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.pass, true); assert.equal(R.code, 0); assert.equal(R.full, true);
  assert.deepEqual(R.kinds, Object.keys(KINDS));
  for (const x of R.results) { assert.equal(x.caught, true, x.kind); assert.equal(x.exit, 1, x.kind) }
  assert.equal(R.toolPins["source/xiangqi-ios/scripts/check-native.js"], toolSha(CHECK));
  assert.deepEqual(Object.keys(KINDS), EXPECTED_KINDS, "壞樣本清單要跟測試裡寫死的一樣（#135 審查④）");
});

/* check-native 裡每一條「check(條件, "訊息…")」：找到訊息裡有某個壞樣本 expect 的那一行，把條件改成恆真 */
function blindLine(src, expect) {
  const lines = src.split("\n"), hits = lines.map((l, i) => [l, i]).filter(([l]) => /^\s*check\(/.test(l) && l.includes(JSON.stringify(expect).slice(1, -1)));
  return hits.map(([, i]) => i);
}
test("check-native.js 每一條判斷改成恆真，對應的壞樣本都要回 4（檢查失靈），不會被當成通過", () => {
  const { canary, check } = repoCopy(), orig = fs.readFileSync(check, "utf8");
  let tried = 0;
  for (const [k, K] of Object.entries(KINDS)) {
    const idx = blindLine(orig, K.expect);
    if (!idx.length) continue;   /* 訊息是組出來的（兩份相同、沒有收尾、某檔沒有控制字元）：下一項另外測 */
    const lines = orig.split("\n"); for (const i of idx) lines[i] = lines[i].replace(/^(\s*)check\(/, "$1check(true || ");
    fs.writeFileSync(check, lines.join("\n"));
    const r = runCanary(canary, ["--only", k]);
    assert.equal(r.status, 4, k + "（" + K.expect + "）改成恆真後金絲雀要回 4：" + r.stdout + r.stderr);
    assert.match(r.stdout, /check-native 本身失靈/);
    tried++;
  }
  fs.writeFileSync(check, orig);
  console.log("盲測：" + tried + " 條判斷改成恆真，都判出失靈");
  assert.equal(tried, BLIND_N, "盲測的條數要跟寫死的一樣（#135 審查④：原本是「至少」）");
});

test("子條件改壞清單：每一條只拿掉一個子條件或一個字，指定的壞樣本要回 4；重疊清單的原文還在（#135 審查①②③）", () => {
  const { canary, check } = repoCopy(), orig = fs.readFileSync(check, "utf8");
  assert.equal(MUT.length, 135); assert.equal(REDUNDANT.length, 9);
  for (const [name, from, to, kind] of MUT) {
    assert.equal(orig.split(from).length - 1, 1, name + "：要改的原文在 check-native.js 裡要剛好一處");
    assert.ok(KINDS[kind], name + "：指定的壞樣本 " + kind + " 要存在");
    fs.writeFileSync(check, orig.replace(from, to));
    const r = runCanary(canary, ["--only", kind]);
    assert.equal(r.status, 4, name + "（拿掉後用 " + kind + " 測）金絲雀要回 4：" + r.stdout + r.stderr);
  }
  fs.writeFileSync(check, orig);
  for (const [name, from] of REDUNDANT) assert.equal(orig.split(from).length - 1, 1, name + "：重疊清單裡的原文要還在（改了就要重新判斷能不能單獨測）");
});

test("訊息是組出來的那幾條也測：兩份相同、括號沒收尾、控制字元、外掛不連網、install-native", () => {
  const { canary, check } = repoCopy(), orig = fs.readFileSync(check, "utf8");
  const cases = [
    ["copyDiff", 'else check(rd(b) === sa, f + " 兩份相同', 'else check(true, f + " 兩份相同'],
    ["brace", 'for (const [c, l] of stack) bad.push(', 'for (const [c, l] of stack) if (false) bad.push('],
    ["ctrl", "  check(!m, f + \" 沒有控制字元\");", "  check(true, f + \" 沒有控制字元\");"],
    ["gcNetwork", 'check(!/URLSession|URLRequest|https?:\\/\\//.test(c), p.file + "：沒有網路程式', 'check(true, p.file + "：沒有網路程式'],
    /* 回到 11/23 前只數 verifyNow( 次數的寫法（#127 之後的結構比對前面加一個「舊寫法成立就放行」）：「true || verifyNow(…)」、else、guard、case、區域 func、func ok() 都繞得過 */
    ...["establish", "establishElse", "establishGuard", "establishCase", "establishLocalFunc", "establishHelper"].map((k) => [k, "check(vBlocks.length >= 2 && vTok === vBlocks.length", "check(count(est, \"verifyNow(\") >= 2 && est.includes(\"return .verified\") || vBlocks.length >= 2 && vTok === vBlocks.length"]),
  ];
  for (const [k, from, to] of cases) {
    assert.ok(orig.includes(from), "測試要改的那一行還在：" + from.slice(0, 50));
    fs.writeFileSync(check, orig.replace(from, to));
    const r = runCanary(canary, ["--only", k]);
    assert.equal(r.status, 4, k + " 改壞後金絲雀要回 4：" + r.stdout + r.stderr);
  }
  fs.writeFileSync(check, orig);
});

test("測試不成立回 2：不認得的壞樣本、空的 --only、不認得的參數、參數沒給值、乾淨的副本就沒過", () => {
  assert.equal(runCanary(CANARY, ["--only", "亂寫"]).status, 2);
  assert.equal(runCanary(CANARY, ["--only", ""]).status, 2);
  assert.equal(runCanary(CANARY, ["--only", " , "]).status, 2);
  assert.equal(runCanary(CANARY, ["--olny", "port"]).status, 2);
  assert.equal(runCanary(CANARY, ["--only"]).status, 2);
  const { canary, R } = repoCopy(), p = path.join(R, "source", "xiangqi-ios", "native", "ios", "XQLoopbackServer.swift");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("static let port: UInt16 = 47821", "static let port: UInt16 = 1"));
  const r = runCanary(canary, ["--only", "port"]); assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stderr, /乾淨的副本沒過/);
  assert.equal(exitOf([{ caught: true }], true), 0);
  assert.equal(exitOf([{ caught: false, unfit: true }, { caught: false }], false), 4, "失靈優先");
  assert.equal(exitOf([{ caught: false, unfit: true }], false), 2);
  const x = run({ only: "port", log: () => {} }); assert.equal(x.code, 0); assert.equal(x.receipt.full, false, "--only 不算完整");
});

test("壞樣本做失敗（要改的那段不見了）不會被當成通過：回 2", () => {
  const { canary, R } = repoCopy(), p = path.join(R, "source", "xiangqi-ios", "native", "ios", "XQBridgeViewController.swift");
  /* 把「Close other apps」改掉、check-native 那條也同步改掉（乾淨的還是全過），guidance 這個壞樣本就找不到要改的字 */
  for (const f of [p, path.join(R, "source", "xiangqi-ios", "ios", "App", "App", "XQBridgeViewController.swift")]) fs.writeFileSync(f, fs.readFileSync(f, "utf8").split("Close other apps").join("Quit other apps"));
  const c = path.join(R, "source", "xiangqi-ios", "scripts", "check-native.js"); fs.writeFileSync(c, fs.readFileSync(c, "utf8").split("Close other apps").join("Quit other apps"));
  const r = runCanary(canary, ["--only", "guidance"]); assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stdout, /做壞樣本失敗/);
});
