// iOS 原生檢查金絲雀 canary-native.js 的自我測試（AGENTS.md「P0 出口驗證要難作假」，2026-11-23）
//   乾淨的副本要全過、每個壞樣本都要被抓到；再把 check-native.js 的判斷一條一條改成恆真（放在整份副本裡），對應的壞樣本要回 4（檢查失靈）。
// 用法：node --test source/xiangqi-ios/scripts/test-canary-native.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const HERE = __dirname, IOS = path.join(HERE, ".."), REPO = path.join(IOS, "..", "..");
const CHECK = path.join(HERE, "check-native.js"), CANARY = path.join(HERE, "canary-native.js");
const { KINDS, exitOf, toolSha, run } = require("./canary-native.js");
/* #135 審查④：壞樣本名稱寫死（不從受測程式取）；W69 β 改成只能增加：少一種、改名、換順序都會紅，新增照樣綠 */
const EXPECTED_KINDS = ["copyDiff","port","whoami","rng","challenge","oneTime","whoamiAnswer","establish","establishIf","establishElse","establishGuard","establishCase","establishLocalFunc","establishHelper","verifiedElsewhere","inUse","eaddrinuse","acceptLocalOnly","loopback","sourceCheck","leftover","superVDL","runCheck","loadTwice","phaseGate","loadUnverified","runningUnverified","directLoad","halfSecond","alert","retryDelays","retryCap","manualRetry","bilingual","guidance","keepSave","foreground","brace","ctrl","gcNetwork","gcPlayerId","gcLogin","wdPath","fgLog","gcObjc","gcJsName","gcMethods","gcWebCall","wdReload","widgetMain","widgetURL","widgetNet","widgetCtrl","widgetFile","appGroup","gcEntitle","widgetPlist","webScheme","webNet","installGc","regSpeech","regGuarded","regOther","spObjc","spMethods","spOrder","spMain","spWarm","spLang","spAmbient","spOnce","spBg","spNet","spCtrl","spInstall","spCopy","board","whoamiTake","estOneBlock","estTickFunc","estCallAs","vnRawTriple","vnTickFalse","oddTriple","oddTick","oddRegex","oddRaw","oddSubdir","oddCommentClose","odd2028","odd2029","odd0085","oddTrailComment","oddVc","swiftVer6","swiftBareRx","swiftXcconfig","swiftUpcoming","swiftInclude","swiftOtherFlags","swiftFileFlags","swiftVerComment","swiftMultiLine","swiftVerGone","swiftXcMissing","swiftXcElsewhere","swiftQuotedComment","swiftXcGroup","swiftCfgAnchor","swiftArrayFlags","swiftCondKey","swiftProjDir","swiftUnparsable","swiftNl2028","swiftXcNl2028","swiftSrcRootRef","swiftTwoProj","swiftBareGone","swiftBareOneGone","swiftBareYes","swiftLk2029","swiftLk0085","swiftLk000B","swiftLk000C","swiftLkFEFF","swiftLk200B","swiftLk2060","swiftLk00AD","swiftLk0001","swiftLk001E","swiftLk007F","swiftLk202E","swiftLk2066","swiftPbxComment","swiftPbxKeyNotStr","swiftPbxNoEq","swiftPbxNoSemi","swiftPbxDupKey","swiftPbxArrComma","swiftPbxBadChar","swiftPbxTrailing","swiftProjExtra","swiftRootMainGroup","swiftProjRoot","swiftGroupLoop","swiftBuiltProducts","swiftOrphanGroup","swiftNameDollar","swiftXcIos","swiftXcApp","swiftXcAppApp","swiftXcTrailCmt","swiftXcCapVal","swiftLk0000","swiftLk0008","swiftLk000E","swiftLk001F","swiftLk200F","swiftLk2064","swiftLk202A","swiftLk206F","swiftXcCapTail","swiftXcCapSuffix","swiftRootArray","swiftDupNoYes","swiftIncHidden","swiftXcSlash","swiftXcUpcoming","swiftXcCapKey","swiftXcCapMid","swiftXcCapEmpty","swiftXcCapNoEq","swiftCondFlags","swiftCondValue","swiftModeValue","swiftOptValue","swiftSrcRootBrace","swiftEscN","swiftEscT","swiftCompFlagsCond","swiftPbxCommentSlash","swiftPbxAt1","swiftPbxSlashLine","swiftPbxLastNoSemi","swiftPbxColon","swiftPbxSingleQuote","swiftPbxStar","swiftPbxEmptyKey","swiftEscBackslash","swiftEscNEnd","swiftEscTSpace","swiftChildrenStr","swiftProjExtraNoMain","swiftProjDirArr","swiftProjRootArr","swiftSrcRootBare","swiftTreeGroupish","swiftTreeSdkRoot","swiftMainGroupArr","swiftCfgNoSettings","swiftCfgKeyCase","swiftBaseRefArr","swiftKeySwiftEnd","swiftKeySwiftMid","swiftValTrim","swiftValCase","swiftValArrFirst","swiftValArrOne","swiftVer5","swiftModeSingle","swiftOptSize","swiftCompFlagsSuffix","swiftXcIncCmt","swiftIncOptional","swiftXcDashCmt","swiftXcSemi","swiftXcDebugKey","swiftXcCapDash","swiftXcCapColon","swiftXcCapUpper","swiftXcCapYes","swiftXcCapCmt","swiftXcCapPre","swiftCfgAnchorKey","swiftGroupDollar","swiftParentTree","swiftTwoParentsLast","swiftTwoParentsFirst","swiftRefDir","swiftPathArr","swiftWsPbx","swiftWsPbx2","swiftWsXc","swiftCommentI3","swiftSecondRef","swiftXcIndentCont","swiftXcLongIndent","swiftFirstRefBad","swiftGroupDeep","swiftCfgNoName","swiftEscBsEmpty","swiftCompFlagsCfg","swiftProjDirSpace","swiftXcDeepLine","swiftPbxCmtSemi","swiftNlFar","swiftXcNlFar","swiftPbxChHash","swiftPbxChBang","swiftPbxChPct","swiftPbxChAmp","swiftPbxChLt","swiftPbxChGt","swiftPbxChQ","swiftPbxChTick","swiftPbxChTilde","swiftPbxChBar","swiftPbxChCaret","swiftPbxChApos","swiftPbxChBslash","swiftTwoParentsSecond","swiftXcLongLine","swiftGroupDollarMid","swiftParentSdk","estNoReturn","estElseAfter","estFuncTwice","srcCancel","leftoverRead","lvpLoad","vbLoad","vbRunning","loadFile","loadReq","showRetry","failedPhase","zhBusy","zhGuide","noDiskCache","clearIDB","onBroken","fgFlag","installSrv","gcClass","wdIdent","wdListedNoFunc","wdWebNone","wdReq","wdCtrl","gcAuth","gcPresent","gcKeep","gcPid","gcTeam","gcName","gcAlias","wdBox","wdData","widgetBundle","widgetOpen","widgetReq","widgetJpg","wdDataFile","groupMissing","groupExtra","webSchemeRe","webXhr","webBeacon","webSocket","webXQNet","webIRT","instGcFile","instWdFile","instClasses","instScheme","regSuper","regLoop","regInit","regThird","spClass","spIdent","spJs","spNoFunc","spExtraFunc","spQueue","spLate","spSpeakU","spMainSync","spMainAsync","spMainActor","spWarmZh","spWarmCode","spVoice","spEn","spSilent","spAppSession","spCatLate","spBgNote","spRec","spCam","spAuth","spReq","spInstFiles","spInstConcat","spInstFilter","spPkgList","spPkgDup","boardSpeak","ctrl00","ctrl01","ctrl02","ctrl03","ctrl04","ctrl05","ctrl06","ctrl07","ctrl08","ctrl0b","ctrl0c","ctrl0e","ctrl0f","ctrl10","ctrl11","ctrl12","ctrl13","ctrl14","ctrl15","ctrl16","ctrl17","ctrl18","ctrl19","ctrl1a","ctrl1b","ctrl1c","ctrl1d","ctrl1e","ctrl1f","ctrl7f","estOrTrue","estOrMid","wdObjc","wdClass","gcIdent","wdJs","gcCtrl","wdNet","gcReq","ctrlVC","regPlugin","groupMissWD","groupMissWidget","groupMissApp","groupExtraWD","groupExtraWidget","groupExtraWidgetEnt","braceBad","strOpen","strEOF","wdJpg","vbMissing","halfAfter","capVDL","capLoadWV","capDidLoad","capRegInst","pbxMissing","pkgGc","pkgWd","pkgGcDup","infoScheme","gcCopyDiff","vnRetTrue","vnTernary","vnCmpTrue","vnNo200","vnNoHost","vnDeadResume","vnUrlComment","vnFlagGetter","vnFixedAnswer","vnHexZero","vnStrDecoy","vnIfFalse","vnIfDebug","vnDecoyBefore","vnDecoyOnly","vnExtension","vnNestedFlag","vnTypealias","vnDupIssue","vnDupHex","vnSigTwice","install"];
/* W110（#157，#148 複審找到的既有缺口）：每個壞樣本「要被哪一條判斷抓到」的 expect 也寫死。
   原本只寫死壞樣本名稱，刪掉 check-native 的某條判斷、再把那個壞樣本的 expect 改指向別條還在的判斷，全套照樣綠，那條保護就悄悄不見了。
   跟 EXPECTED_KINDS 一樣只能增加：寫死的每一個都要還在、expect 一字不差；新的壞樣本可以不在這裡（換回 main 版守門也綠），之後再補進來 */
const EXPECTS = {"copyDiff":"XQBridgeViewController.swift 兩份相同","port":"埠號還是 47821","whoami":"有 /__xq_whoami 驗證端點","rng":"考題／答案用系統亂數","challenge":"有一次性考題","oneTime":"考題查過就作廢","whoamiAnswer":"whoami 只回這次考題的答案","establish":"establish 一定經過 verifyNow","establishIf":"establish 一定經過 verifyNow","establishElse":"establish 一定經過 verifyNow","establishGuard":"establish 一定經過 verifyNow","establishCase":"establish 一定經過 verifyNow","establishLocalFunc":"establish 一定經過 verifyNow","establishHelper":"establish 一定經過 verifyNow","verifiedElsewhere":"verified 只會從 establishNow 回","inUse":"位址被占用時不改綁萬用位址","eaddrinuse":"有判斷 EADDRINUSE","acceptLocalOnly":"沒有 acceptLocalOnly = true","loopback":"只聽 loopback 介面","sourceCheck":"accept() 仍檢查來源位址","leftover":"leftover 位元組修正還在","superVDL":"viewDidLoad 不呼叫 super","runCheck":"viewDidLoad 先開伺服器＋驗證","loadTwice":"loadWebView() 只出現一次","phaseGate":"loadWebView() 只在 loadVerifiedPage 裡","loadUnverified":"只有驗證通過（outcome == .verified）才呼叫 loadVerifiedPage","runningUnverified":"只有驗證通過才進 running","directLoad":"畫面沒有其他直接載入網頁的地方","halfSecond":"沒有 0.5 秒的重跳","alert":"沒有一直重跳的提示視窗","retryDelays":"自動重試 1、2、4 秒","retryCap":"自動重試有上限","manualRetry":"手動「重試」只試一次","bilingual":"錯誤畫面中英文都有","guidance":"錯誤畫面有處理方式","keepSave":"載入前只清 HTTP 快取，不動存檔","foreground":"回前景／監聽壞掉會重驗","brace":"沒有收尾","ctrl":"XQLoopbackServer.swift 沒有控制字元","gcNetwork":"XQGameCenterPlugin.swift：沒有網路程式","gcPlayerId":"不讀、不回傳玩家 ID 或暱稱","gcLogin":"開 App 不主動跳登入畫面","wdPath":"圖只收安裝包 data/ 底下、不收「..」","fgLog":"回前景重驗通過時 console 印一行","gcObjc":"XQGameCenterPlugin：@objc 名稱和 CAPPlugin","gcJsName":"XQGameCenterPlugin：identifier","gcMethods":"XQGameCenterPlugin：pluginMethods","gcWebCall":"07gc-native.js 呼叫 XQGameCenter 的方法","wdReload":"XQWidgetData：寫 App Group 後請小工具重畫","widgetMain":"小工具：有 @main、小中兩種尺寸","widgetURL":"小工具：點了開","widgetNet":"小工具：沒有網路程式","widgetCtrl":"XQTodayWidget.swift 沒有控制字元","widgetFile":"小工具和 XQWidgetData 的檔名一樣：dataFile","appGroup":"App Group 四處一樣","gcEntitle":"App.entitlements 有 Game Center","widgetPlist":"小工具 Info.plist 是 widgetkit-extension","webScheme":"07gc-native.js 收","webNet":"07gc-native.js 不連網、不送資料","installGc":"install-native.js --gc-widget","regSpeech":"capacitorDidLoad() 直接註冊 XQSpeechPlugin","regGuarded":"Game Center、小工具有編進 App 才註冊","regOther":"只在 capacitorDidLoad 註冊這兩處","spObjc":"XQSpeech：@objc 名稱、identifier、jsName","spMethods":"XQSpeech：speak、stop、isAvailable 都有登記","spOrder":"XQSpeech：先回傳","spMain":"XQSpeech：沒有任何工作丟回主執行緒","spWarm":"XQSpeech：App 啟動後在背景佇列先初始化","spLang":"XQSpeech：語言 zh-TW","spAmbient":"XQSpeech：AVAudioSession 用 .ambient","spOnce":"XQSpeech：音訊類別只在外掛載入時設一次","spBg":"XQSpeech：進背景 stopSpeaking","spNet":"XQSpeech：不要權限、沒有網路程式","spCtrl":"XQSpeechPlugin.swift 沒有控制字元","spInstall":"install-native.js：預設就複製 XQSpeechPlugin","spCopy":"XQSpeechPlugin.swift 兩份相同","board":"01-board.js：原生版有 XQSpeech 就用它","whoamiTake":"whoami 只回這次考題的答案","estOneBlock":"establish 一定經過 verifyNow","estTickFunc":"establish 一定經過 verifyNow","estCallAs":"establish 一定經過 verifyNow","vnRawTriple":"verifyNow 真的去問 whoami","vnTickFalse":"verifyNow 真的去問 whoami","oddTriple":"verifyNow 真的去問 whoami","oddTick":"verifyNow 真的去問 whoami","oddRegex":"verifyNow 真的去問 whoami","oddRaw":"verifyNow 真的去問 whoami","oddSubdir":"verifyNow 真的去問 whoami","oddCommentClose":"verifyNow 真的去問 whoami","odd2028":"verifyNow 真的去問 whoami","odd2029":"verifyNow 真的去問 whoami","odd0085":"verifyNow 真的去問 whoami","oddTrailComment":"verifyNow 真的去問 whoami","oddVc":"verifyNow 真的去問 whoami","swiftVer6":"Swift 語言版本全是 5.0","swiftBareRx":"Swift 語言版本全是 5.0","swiftXcconfig":"Swift 語言版本全是 5.0","swiftUpcoming":"Swift 語言版本全是 5.0","swiftInclude":"Swift 語言版本全是 5.0","swiftOtherFlags":"Swift 語言版本全是 5.0","swiftFileFlags":"Swift 語言版本全是 5.0","swiftVerComment":"Swift 語言版本全是 5.0","swiftMultiLine":"Swift 語言版本全是 5.0","swiftVerGone":"Swift 語言版本全是 5.0","swiftXcMissing":"Swift 語言版本全是 5.0","swiftXcElsewhere":"Swift 語言版本全是 5.0","swiftQuotedComment":"Swift 語言版本全是 5.0","swiftXcGroup":"Swift 語言版本全是 5.0","swiftCfgAnchor":"Swift 語言版本全是 5.0","swiftArrayFlags":"Swift 語言版本全是 5.0","swiftCondKey":"Swift 語言版本全是 5.0","swiftProjDir":"Swift 語言版本全是 5.0","swiftUnparsable":"Swift 語言版本全是 5.0","swiftNl2028":"Swift 語言版本全是 5.0","swiftXcNl2028":"Swift 語言版本全是 5.0","swiftSrcRootRef":"Swift 語言版本全是 5.0","swiftTwoProj":"Swift 語言版本全是 5.0","swiftBareGone":"Swift 語言版本全是 5.0","swiftBareOneGone":"Swift 語言版本全是 5.0","swiftBareYes":"Swift 語言版本全是 5.0","swiftLk2029":"Swift 語言版本全是 5.0","swiftLk0085":"Swift 語言版本全是 5.0","swiftLk000B":"Swift 語言版本全是 5.0","swiftLk000C":"Swift 語言版本全是 5.0","swiftLkFEFF":"Swift 語言版本全是 5.0","swiftLk200B":"Swift 語言版本全是 5.0","swiftLk2060":"Swift 語言版本全是 5.0","swiftLk00AD":"Swift 語言版本全是 5.0","swiftLk0001":"Swift 語言版本全是 5.0","swiftLk001E":"Swift 語言版本全是 5.0","swiftLk007F":"Swift 語言版本全是 5.0","swiftLk202E":"Swift 語言版本全是 5.0","swiftLk2066":"Swift 語言版本全是 5.0","swiftPbxComment":"Swift 語言版本全是 5.0","swiftPbxKeyNotStr":"Swift 語言版本全是 5.0","swiftPbxNoEq":"Swift 語言版本全是 5.0","swiftPbxNoSemi":"Swift 語言版本全是 5.0","swiftPbxDupKey":"Swift 語言版本全是 5.0","swiftPbxArrComma":"Swift 語言版本全是 5.0","swiftPbxBadChar":"Swift 語言版本全是 5.0","swiftPbxTrailing":"Swift 語言版本全是 5.0","swiftProjExtra":"Swift 語言版本全是 5.0","swiftRootMainGroup":"Swift 語言版本全是 5.0","swiftProjRoot":"Swift 語言版本全是 5.0","swiftGroupLoop":"Swift 語言版本全是 5.0","swiftBuiltProducts":"Swift 語言版本全是 5.0","swiftOrphanGroup":"Swift 語言版本全是 5.0","swiftNameDollar":"Swift 語言版本全是 5.0","swiftXcIos":"Swift 語言版本全是 5.0","swiftXcApp":"Swift 語言版本全是 5.0","swiftXcAppApp":"Swift 語言版本全是 5.0","swiftXcTrailCmt":"Swift 語言版本全是 5.0","swiftXcCapVal":"Swift 語言版本全是 5.0","swiftLk0000":"Swift 語言版本全是 5.0","swiftLk0008":"Swift 語言版本全是 5.0","swiftLk000E":"Swift 語言版本全是 5.0","swiftLk001F":"Swift 語言版本全是 5.0","swiftLk200F":"Swift 語言版本全是 5.0","swiftLk2064":"Swift 語言版本全是 5.0","swiftLk202A":"Swift 語言版本全是 5.0","swiftLk206F":"Swift 語言版本全是 5.0","swiftXcCapTail":"Swift 語言版本全是 5.0","swiftXcCapSuffix":"Swift 語言版本全是 5.0","swiftRootArray":"Swift 語言版本全是 5.0","swiftDupNoYes":"Swift 語言版本全是 5.0","swiftIncHidden":"Swift 語言版本全是 5.0","swiftXcSlash":"Swift 語言版本全是 5.0","swiftXcUpcoming":"Swift 語言版本全是 5.0","swiftXcCapKey":"Swift 語言版本全是 5.0","swiftXcCapMid":"Swift 語言版本全是 5.0","swiftXcCapEmpty":"Swift 語言版本全是 5.0","swiftXcCapNoEq":"Swift 語言版本全是 5.0","swiftCondFlags":"Swift 語言版本全是 5.0","swiftCondValue":"Swift 語言版本全是 5.0","swiftModeValue":"Swift 語言版本全是 5.0","swiftOptValue":"Swift 語言版本全是 5.0","swiftSrcRootBrace":"Swift 語言版本全是 5.0","swiftEscN":"Swift 語言版本全是 5.0","swiftEscT":"Swift 語言版本全是 5.0","swiftCompFlagsCond":"Swift 語言版本全是 5.0","swiftPbxCommentSlash":"Swift 語言版本全是 5.0","swiftPbxAt1":"Swift 語言版本全是 5.0","swiftPbxSlashLine":"Swift 語言版本全是 5.0","swiftPbxLastNoSemi":"Swift 語言版本全是 5.0","swiftPbxColon":"Swift 語言版本全是 5.0","swiftPbxSingleQuote":"Swift 語言版本全是 5.0","swiftPbxStar":"Swift 語言版本全是 5.0","swiftPbxEmptyKey":"Swift 語言版本全是 5.0","swiftEscBackslash":"Swift 語言版本全是 5.0","swiftEscNEnd":"Swift 語言版本全是 5.0","swiftEscTSpace":"Swift 語言版本全是 5.0","swiftChildrenStr":"Swift 語言版本全是 5.0","swiftProjExtraNoMain":"Swift 語言版本全是 5.0","swiftProjDirArr":"Swift 語言版本全是 5.0","swiftProjRootArr":"Swift 語言版本全是 5.0","swiftSrcRootBare":"Swift 語言版本全是 5.0","swiftTreeGroupish":"Swift 語言版本全是 5.0","swiftTreeSdkRoot":"Swift 語言版本全是 5.0","swiftMainGroupArr":"Swift 語言版本全是 5.0","swiftCfgNoSettings":"Swift 語言版本全是 5.0","swiftCfgKeyCase":"Swift 語言版本全是 5.0","swiftBaseRefArr":"Swift 語言版本全是 5.0","swiftKeySwiftEnd":"Swift 語言版本全是 5.0","swiftKeySwiftMid":"Swift 語言版本全是 5.0","swiftValTrim":"Swift 語言版本全是 5.0","swiftValCase":"Swift 語言版本全是 5.0","swiftValArrFirst":"Swift 語言版本全是 5.0","swiftValArrOne":"Swift 語言版本全是 5.0","swiftVer5":"Swift 語言版本全是 5.0","swiftModeSingle":"Swift 語言版本全是 5.0","swiftOptSize":"Swift 語言版本全是 5.0","swiftCompFlagsSuffix":"Swift 語言版本全是 5.0","swiftXcIncCmt":"Swift 語言版本全是 5.0","swiftIncOptional":"Swift 語言版本全是 5.0","swiftXcDashCmt":"Swift 語言版本全是 5.0","swiftXcSemi":"Swift 語言版本全是 5.0","swiftXcDebugKey":"Swift 語言版本全是 5.0","swiftXcCapDash":"Swift 語言版本全是 5.0","swiftXcCapColon":"Swift 語言版本全是 5.0","swiftXcCapUpper":"Swift 語言版本全是 5.0","swiftXcCapYes":"Swift 語言版本全是 5.0","swiftXcCapCmt":"Swift 語言版本全是 5.0","swiftXcCapPre":"Swift 語言版本全是 5.0","swiftCfgAnchorKey":"Swift 語言版本全是 5.0","swiftGroupDollar":"Swift 語言版本全是 5.0","swiftParentTree":"Swift 語言版本全是 5.0","swiftTwoParentsLast":"Swift 語言版本全是 5.0","swiftTwoParentsFirst":"Swift 語言版本全是 5.0","swiftRefDir":"Swift 語言版本全是 5.0","swiftPathArr":"Swift 語言版本全是 5.0","swiftWsPbx":"Swift 語言版本全是 5.0","swiftWsPbx2":"Swift 語言版本全是 5.0","swiftWsXc":"Swift 語言版本全是 5.0","swiftCommentI3":"Swift 語言版本全是 5.0","swiftSecondRef":"Swift 語言版本全是 5.0","swiftXcIndentCont":"Swift 語言版本全是 5.0","swiftXcLongIndent":"Swift 語言版本全是 5.0","swiftFirstRefBad":"Swift 語言版本全是 5.0","swiftGroupDeep":"Swift 語言版本全是 5.0","swiftCfgNoName":"Swift 語言版本全是 5.0","swiftEscBsEmpty":"Swift 語言版本全是 5.0","swiftCompFlagsCfg":"Swift 語言版本全是 5.0","swiftProjDirSpace":"Swift 語言版本全是 5.0","swiftXcDeepLine":"Swift 語言版本全是 5.0","swiftPbxCmtSemi":"Swift 語言版本全是 5.0","swiftNlFar":"Swift 語言版本全是 5.0","swiftXcNlFar":"Swift 語言版本全是 5.0","swiftPbxChHash":"Swift 語言版本全是 5.0","swiftPbxChBang":"Swift 語言版本全是 5.0","swiftPbxChPct":"Swift 語言版本全是 5.0","swiftPbxChAmp":"Swift 語言版本全是 5.0","swiftPbxChLt":"Swift 語言版本全是 5.0","swiftPbxChGt":"Swift 語言版本全是 5.0","swiftPbxChQ":"Swift 語言版本全是 5.0","swiftPbxChTick":"Swift 語言版本全是 5.0","swiftPbxChTilde":"Swift 語言版本全是 5.0","swiftPbxChBar":"Swift 語言版本全是 5.0","swiftPbxChCaret":"Swift 語言版本全是 5.0","swiftPbxChApos":"Swift 語言版本全是 5.0","swiftPbxChBslash":"Swift 語言版本全是 5.0","swiftTwoParentsSecond":"Swift 語言版本全是 5.0","swiftXcLongLine":"Swift 語言版本全是 5.0","swiftGroupDollarMid":"Swift 語言版本全是 5.0","swiftParentSdk":"Swift 語言版本全是 5.0","estNoReturn":"establish 一定經過 verifyNow","estElseAfter":"establish 一定經過 verifyNow","estFuncTwice":"establish 一定經過 verifyNow","srcCancel":"accept() 仍檢查來源位址","leftoverRead":"leftover 位元組修正還在","lvpLoad":"loadWebView() 只在 loadVerifiedPage 裡","vbLoad":"只有驗證通過（outcome == .verified）才呼叫 loadVerifiedPage","vbRunning":"只有驗證通過才進 running","loadFile":"畫面沒有其他直接載入網頁的地方","loadReq":"畫面沒有其他直接載入網頁的地方","showRetry":"沒有一直重跳的提示視窗","failedPhase":"自動重試有上限","zhBusy":"錯誤畫面中英文都有","zhGuide":"錯誤畫面有處理方式","noDiskCache":"載入前只清 HTTP 快取","clearIDB":"載入前只清 HTTP 快取","onBroken":"回前景／監聽壞掉會重驗","fgFlag":"回前景重驗通過時 console 印一行","installSrv":"install-native.js 會複製兩支 Swift","gcClass":"XQGameCenterPlugin：@objc 名稱和 CAPPlugin","wdIdent":"XQWidgetDataPlugin：identifier","wdListedNoFunc":"XQWidgetDataPlugin：pluginMethods","wdWebNone":"07gc-native.js 呼叫 XQWidgetData 的方法","wdReq":"XQWidgetDataPlugin.swift：沒有網路程式","wdCtrl":"XQWidgetDataPlugin.swift 沒有控制字元","gcAuth":"開 App 不主動跳登入畫面","gcPresent":"開 App 不主動跳登入畫面","gcKeep":"開 App 不主動跳登入畫面","gcPid":"不讀、不回傳玩家 ID 或暱稱","gcTeam":"不讀、不回傳玩家 ID 或暱稱","gcName":"不讀、不回傳玩家 ID 或暱稱","gcAlias":"不讀、不回傳玩家 ID 或暱稱","wdBox":"XQWidgetData：寫 App Group 後請小工具重畫","wdData":"XQWidgetData：圖只收安裝包 data/","widgetBundle":"小工具：有 @main、小中兩種尺寸","widgetOpen":"小工具：點了開","widgetReq":"小工具：沒有網路程式","widgetJpg":"小工具和 XQWidgetData 的檔名一樣：imageFile","wdDataFile":"小工具和 XQWidgetData 的檔名一樣：dataFile","groupMissing":"App Group 四處一樣","groupExtra":"App Group 四處一樣","webSchemeRe":"07gc-native.js 收","webXhr":"07gc-native.js 不連網、不送資料","webBeacon":"07gc-native.js 不連網、不送資料","webSocket":"07gc-native.js 不連網、不送資料","webXQNet":"07gc-native.js 不連網、不送資料","webIRT":"07gc-native.js 不連網、不送資料","instGcFile":"install-native.js --gc-widget","instWdFile":"install-native.js --gc-widget","instClasses":"install-native.js --gc-widget","instScheme":"install-native.js --gc-widget","regSuper":"capacitorDidLoad() 直接註冊 XQSpeechPlugin","regLoop":"Game Center、小工具有編進 App 才註冊","regInit":"Game Center、小工具有編進 App 才註冊","regThird":"只在 capacitorDidLoad 註冊這兩處","spClass":"XQSpeech：@objc 名稱、identifier、jsName","spIdent":"XQSpeech：@objc 名稱、identifier、jsName","spJs":"XQSpeech：@objc 名稱、identifier、jsName","spNoFunc":"XQSpeech：speak、stop、isAvailable","spExtraFunc":"XQSpeech：speak、stop、isAvailable","spQueue":"XQSpeech：先回傳","spLate":"XQSpeech：先回傳","spSpeakU":"XQSpeech：先回傳","spMainSync":"XQSpeech：沒有任何工作丟回主執行緒","spMainAsync":"XQSpeech：沒有任何工作丟回主執行緒","spMainActor":"XQSpeech：沒有任何工作丟回主執行緒","spWarmZh":"XQSpeech：App 啟動後在背景佇列先初始化","spWarmCode":"XQSpeech：App 啟動後在背景佇列先初始化","spVoice":"XQSpeech：語言","spEn":"XQSpeech：語言","spSilent":"XQSpeech：語言","spAppSession":"XQSpeech：AVAudioSession 用 .ambient","spCatLate":"XQSpeech：音訊類別只在外掛載入時設一次","spBgNote":"XQSpeech：進背景 stopSpeaking","spRec":"XQSpeech：不要權限、沒有網路程式","spCam":"XQSpeech：不要權限、沒有網路程式","spAuth":"XQSpeech：不要權限、沒有網路程式","spReq":"XQSpeech：不要權限、沒有網路程式","spInstFiles":"install-native.js：預設就複製 XQSpeechPlugin","spInstConcat":"install-native.js：預設就複製 XQSpeechPlugin","spInstFilter":"install-native.js：預設就複製 XQSpeechPlugin","spPkgList":"packageClassList 沒有 XQSpeechPlugin","spPkgDup":"packageClassList 沒有 XQSpeechPlugin","boardSpeak":"01-board.js：原生版有 XQSpeech 就用它","ctrl00":"XQLoopbackServer.swift 沒有控制字元","ctrl01":"XQLoopbackServer.swift 沒有控制字元","ctrl02":"XQLoopbackServer.swift 沒有控制字元","ctrl03":"XQLoopbackServer.swift 沒有控制字元","ctrl04":"XQLoopbackServer.swift 沒有控制字元","ctrl05":"XQLoopbackServer.swift 沒有控制字元","ctrl06":"XQLoopbackServer.swift 沒有控制字元","ctrl07":"XQLoopbackServer.swift 沒有控制字元","ctrl08":"XQLoopbackServer.swift 沒有控制字元","ctrl0b":"XQLoopbackServer.swift 沒有控制字元","ctrl0c":"XQLoopbackServer.swift 沒有控制字元","ctrl0e":"XQLoopbackServer.swift 沒有控制字元","ctrl0f":"XQLoopbackServer.swift 沒有控制字元","ctrl10":"XQLoopbackServer.swift 沒有控制字元","ctrl11":"XQLoopbackServer.swift 沒有控制字元","ctrl12":"XQLoopbackServer.swift 沒有控制字元","ctrl13":"XQLoopbackServer.swift 沒有控制字元","ctrl14":"XQLoopbackServer.swift 沒有控制字元","ctrl15":"XQLoopbackServer.swift 沒有控制字元","ctrl16":"XQLoopbackServer.swift 沒有控制字元","ctrl17":"XQLoopbackServer.swift 沒有控制字元","ctrl18":"XQLoopbackServer.swift 沒有控制字元","ctrl19":"XQLoopbackServer.swift 沒有控制字元","ctrl1a":"XQLoopbackServer.swift 沒有控制字元","ctrl1b":"XQLoopbackServer.swift 沒有控制字元","ctrl1c":"XQLoopbackServer.swift 沒有控制字元","ctrl1d":"XQLoopbackServer.swift 沒有控制字元","ctrl1e":"XQLoopbackServer.swift 沒有控制字元","ctrl1f":"XQLoopbackServer.swift 沒有控制字元","ctrl7f":"XQLoopbackServer.swift 沒有控制字元","estOrTrue":"establish 一定經過 verifyNow","estOrMid":"establish 一定經過 verifyNow","wdObjc":"XQWidgetDataPlugin：@objc 名稱和 CAPPlugin","wdClass":"XQWidgetDataPlugin：@objc 名稱和 CAPPlugin","gcIdent":"XQGameCenterPlugin：identifier","wdJs":"XQWidgetDataPlugin：identifier","gcCtrl":"XQGameCenterPlugin.swift 沒有控制字元","wdNet":"XQWidgetDataPlugin.swift：沒有網路程式","gcReq":"XQGameCenterPlugin.swift：沒有網路程式","ctrlVC":"XQBridgeViewController.swift 沒有控制字元","regPlugin":"只在 capacitorDidLoad 註冊這兩處","groupMissWD":"App Group 四處一樣","groupMissWidget":"App Group 四處一樣","groupMissApp":"App Group 四處一樣","groupExtraWD":"App Group 四處一樣","groupExtraWidget":"App Group 四處一樣","groupExtraWidgetEnt":"App Group 四處一樣","braceBad":"括號不配對","strOpen":"字串沒有收尾","strEOF":"字串到檔尾還沒收尾","wdJpg":"小工具和 XQWidgetData 的檔名一樣：imageFile","vbMissing":"只有驗證通過（outcome == .verified）才呼叫 loadVerifiedPage","halfAfter":"沒有 0.5 秒的重跳","capVDL":"Capacitor 的 viewDidLoad 只有","capLoadWV":"Capacitor 的 loadWebView() 子類別叫得到","capDidLoad":"Capacitor（node_modules）：loadView 建好 bridge 就呼叫 capacitorDidLoad","capRegInst":"Capacitor（node_modules）：loadView 建好 bridge 就呼叫 capacitorDidLoad","pbxMissing":"pbxproj 已登記 XQGameCenterPlugin.swift","pkgGc":"packageClassList 沒有 XQGameCenterPlugin、XQWidgetDataPlugin","pkgWd":"packageClassList 沒有 XQGameCenterPlugin、XQWidgetDataPlugin","pkgGcDup":"packageClassList 沒有 XQGameCenterPlugin、XQWidgetDataPlugin","infoScheme":"Info.plist 有網址 xqqianqiu://","gcCopyDiff":"XQGameCenterPlugin.swift 兩份相同","vnRetTrue":"verifyNow 真的去問 whoami","vnTernary":"verifyNow 真的去問 whoami","vnCmpTrue":"verifyNow 真的去問 whoami","vnNo200":"verifyNow 真的去問 whoami","vnNoHost":"verifyNow 真的去問 whoami","vnDeadResume":"verifyNow 真的去問 whoami","vnUrlComment":"verifyNow 真的去問 whoami","vnFlagGetter":"verifyNow 真的去問 whoami","vnFixedAnswer":"verifyNow 真的去問 whoami","vnHexZero":"verifyNow 真的去問 whoami","vnStrDecoy":"verifyNow 真的去問 whoami","vnIfFalse":"verifyNow 真的去問 whoami","vnIfDebug":"verifyNow 真的去問 whoami","vnDecoyBefore":"verifyNow 真的去問 whoami","vnDecoyOnly":"verifyNow 真的去問 whoami","vnExtension":"verifyNow 真的去問 whoami","vnNestedFlag":"verifyNow 真的去問 whoami","vnTypealias":"verifyNow 真的去問 whoami","vnDupIssue":"verifyNow 真的去問 whoami","vnDupHex":"verifyNow 真的去問 whoami","vnSigTwice":"verifyNow 真的去問 whoami","install":"install-native.js 會複製兩支 Swift"};
/* expect 是程式組出來的（檔名＋固定字），送出錯誤的呼叫裡找不到整句；只有這幾句可以不在呼叫的字面裡，只能減少 */
const COMPOSED_EXPECTS = ["XQBridgeViewController.swift 兩份相同","XQLoopbackServer.swift 沒有控制字元","XQGameCenterPlugin.swift：沒有網路程式","XQGameCenterPlugin：@objc 名稱和 CAPPlugin","XQGameCenterPlugin：identifier","XQGameCenterPlugin：pluginMethods","07gc-native.js 呼叫 XQGameCenter 的方法","小工具和 XQWidgetData 的檔名一樣：dataFile","XQWidgetDataPlugin：identifier","XQWidgetDataPlugin：pluginMethods","07gc-native.js 呼叫 XQWidgetData 的方法","XQWidgetDataPlugin.swift：沒有網路程式","XQWidgetDataPlugin.swift 沒有控制字元","小工具和 XQWidgetData 的檔名一樣：imageFile","XQWidgetDataPlugin：@objc 名稱和 CAPPlugin","XQGameCenterPlugin.swift 沒有控制字元","XQBridgeViewController.swift 沒有控制字元","pbxproj 已登記 XQGameCenterPlugin.swift","Info.plist 有網址 xqqianqiu://","XQGameCenterPlugin.swift 兩份相同"];
/* 同一句訊息本來就涵蓋兩個壞樣本（wdPath 看「不收 ..」、wdData 看「只收 data/」，同一條 check 一起判）；只有這幾組可以出現在同一個呼叫裡，只能減少 */
const SHARED_EXPECTS = [["圖只收安裝包 data/ 底下、不收「..」", "XQWidgetData：圖只收安裝包 data/"]];
/* #135 審查①②③：check-native.js 的子條件改壞清單（寫死）。每一條只拿掉一個子條件或正規式裡的一個字，指定的壞樣本要回 4 */
const MUT = [
  ["看不懂就拒絕：含 */ 的 // 行不豁免", " && !l.includes(\"*/\")", "", "oddCommentClose"],
  ["Swift 設定：SWIFT_VERSION 至少一處", "check(svN > 0 && swBad.length === 0,", "check(swBad.length === 0,", "swiftVerGone"],
  ["Swift 設定：SWIFT 設定白名單", "if (/SWIFT/.test(k) && !(SW_OK[k] || []).includes(v)) swBad", "if (false) swBad", "swiftVer6"],
  ["Swift 設定：XCBuildConfiguration 欄位白名單", "if (!CFG_KEYS.has(k)) swBad", "if (false) swBad", "swiftCfgAnchor"],
  ["Swift 設定：不能有 COMPILER_FLAGS", "if (/COMPILER_FLAGS/.test(JSON.stringify(O))) swBad", "if (false) swBad", "swiftFileFlags"],
  ["Swift 設定：projectDirPath 要空", "if ((proj.projectDirPath || \"\") !== \"\" || ", "if (false || ", "swiftProjDir"],
  ["Swift 設定：<group> 照群組階層算路徑", "base = parent[id] ? dirOf(parent[id], depth + 1) : ", "base = parent[id] ? projDir : ", "swiftXcGroup"],
  ["Swift 設定：追 baseConfigurationReference", "[...new Set([...xcRefs, ", "[...new Set([", "swiftXcElsewhere"],
  ["Swift 設定：引用的 xcconfig 要存在", "if (!fs.existsSync(f)) { swBad.push(\"找不到 \"", "if (!fs.existsSync(f)) { void (\"找不到 \"", "swiftXcMissing"],
  ["Swift 設定：xcconfig 每行白名單", "&& !/^\\s*CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/.test(l)) swBad", "&& false) swBad", "swiftInclude"],
  ["Swift 設定：pbxproj 特殊換行","if (LOCK_NL.test(raw)) swBad","if (false) swBad","swiftNl2028"],
  ["Swift 設定：xcconfig 特殊換行","if (LOCK_NL.test(xraw)) swBad","if (false) swBad","swiftXcNl2028"],
  ["Swift 設定：檔案參照路徑不能有 $","if (/\\$/.test(String(o.path || \"\") + String(o.name || \"\"))) return null;","","swiftSrcRootRef"],
  ["Swift 設定：PBXProject 照 rootObject 取、剛好一個","proj = (typeof P.rootObject === \"string\" && O[P.rootObject] && O[P.rootObject].isa === \"PBXProject\") ? O[P.rootObject] : {};\n    if (projN !== 1 || proj.isa !== \"PBXProject\") swBad","proj = Object.values(O).find((o) => o.isa === \"PBXProject\") || {};\n    if (false) swBad","swiftTwoProj"],
  ["Swift 設定：每組設定都要明寫 SWIFT_ENABLE_BARE_SLASH_REGEX = NO","if ((o.buildSettings || {}).SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\") swBad","if (false) swBad","swiftBareOneGone"],
  ["Swift 設定：特殊字元 \\u2029","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk2029"],
  ["Swift 設定：特殊字元 \\u0085","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk0085"],
  ["Swift 設定：特殊字元 \\u000B","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk000B"],
  ["Swift 設定：特殊字元 \\u000C","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk000C"],
  ["Swift 設定：特殊字元 \\uFEFF","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLkFEFF"],
  ["Swift 設定：特殊字元 \\u200B-\\u200F","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk200B"],
  ["Swift 設定：特殊字元 \\u2060-\\u2064","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk2060"],
  ["Swift 設定：特殊字元 \\u00AD","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk00AD"],
  ["Swift 設定：特殊字元 \\u0000-\\u0008","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk0001"],
  ["Swift 設定：特殊字元 \\u000E-\\u001F","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk001E"],
  ["Swift 設定：特殊字元 \\u007F","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk007F"],
  ["Swift 設定：特殊字元 \\u202A-\\u202E","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u2066-\\u206F]/;","swiftLk202E"],
  ["Swift 設定：特殊字元 \\u2066-\\u206F","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E]/;","swiftLk2066"],
  ["Swift 設定：pbxproj 語法 註解沒有收尾","if (e < 0) fail(\"註解沒有收尾\"); i = e + 2;","if (e < 0) { i = src.length; continue } i = e + 2;","swiftPbxComment"],
  ["Swift 設定：pbxproj 語法 鍵不是字串","if (typeof k !== \"string\") fail(\"鍵不是字串\");","","swiftPbxKeyNotStr"],
  ["Swift 設定：pbxproj 語法 少了 =","if (src[i] !== \"=\") fail(\"少了 =\"); i++;","if (src[i] === \"=\") i++;","swiftPbxNoEq"],
  ["Swift 設定：pbxproj 語法 少了 ;","if (src[i] !== \";\") fail(\"少了 ;\"); i++;","if (src[i] === \";\") i++;","swiftPbxNoSemi"],
  ["Swift 設定：pbxproj 語法 重複的鍵","if (k in o) fail(\"重複的鍵 \" + k); ","","swiftPbxDupKey"],
  ["Swift 設定：pbxproj 語法 陣列少了 ,","fail(\"陣列少了 ,\") } }","} }","swiftPbxArrComma"],
  ["Swift 設定：pbxproj 語法 看不懂的字元","if (!r) fail(\"看不懂的字元 \" + JSON.stringify(src.slice(i, i + 8)));","if (!r) { i++; return \"\" }","swiftPbxBadChar"],
  ["Swift 設定：pbxproj 語法 結尾多了東西","if (i !== src.length) fail(\"結尾多了東西\");","","swiftPbxTrailing"],
  ["Swift 設定：PBXProject 只能一個（單獨拿掉數量）","if (projN !== 1 || proj.isa !== \"PBXProject\") swBad","if (proj.isa !== \"PBXProject\") swBad","swiftProjExtra"],
  ["Swift 設定：rootObject 要是 PBXProject（單獨拿掉）","if (projN !== 1 || proj.isa !== \"PBXProject\") swBad","if (projN !== 1) swBad","swiftRootMainGroup"],
  ["Swift 設定：照 rootObject 取（單獨改回取第一個）","proj = (typeof P.rootObject === \"string\" && O[P.rootObject] && O[P.rootObject].isa === \"PBXProject\") ? O[P.rootObject] : {};","proj = Object.values(O).find((o) => o.isa === \"PBXProject\") || {};","swiftRootMainGroup"],
  ["Swift 設定：projectRoot 要空"," || (proj.projectRoot || \"\") !== \"\"","","swiftProjRoot"],
  ["Swift 設定：群組循環上限","if (!o || depth > 40) return null;","if (!o) return null;","swiftGroupLoop"],
  ["Swift 設定：只認 <group>、SOURCE_ROOT","else return null;\n      return base","else base = projDir;\n      return base","swiftBuiltProducts"],
  ["Swift 設定：不在群組裡的 <group> 參照","(id === proj.mainGroup ? projDir : null)","projDir","swiftOrphanGroup"],
  ["Swift 設定：$ 也看 name","String(o.path || \"\") + String(o.name || \"\")","String(o.path || \"\")","swiftNameDollar"],
  ["Swift 設定：ios/ 底下的 xcconfig","const xcDirs = [path.join(HERE, \"ios\"), projDir, APP];","const xcDirs = [projDir, APP];","swiftXcIos"],
  ["Swift 設定：ios/App/ 底下的 xcconfig","const xcDirs = [path.join(HERE, \"ios\"), projDir, APP];","const xcDirs = [path.join(HERE, \"ios\"), APP];","swiftXcApp"],
  ["Swift 設定：ios/App/App/ 底下的 xcconfig","const xcDirs = [path.join(HERE, \"ios\"), projDir, APP];","const xcDirs = [path.join(HERE, \"ios\"), projDir];","swiftXcAppApp"],
  ["Swift 設定：xcconfig 只豁免整行 // 註解","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/\\/\\//.test(l) && !/^\\s*CAPACITOR","swiftXcTrailCmt"],
  ["Swift 設定：CAPACITOR_DEBUG 只能 true／false","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG/","swiftXcCapVal"],
  ["Swift 設定：特殊字元範圍 \\u0000-\\u0008 的下端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0001-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk0000"],
  ["Swift 設定：特殊字元範圍 \\u0000-\\u0008 的上端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0007\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk0008"],
  ["Swift 設定：特殊字元範圍 \\u000E-\\u001F 的下端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000F-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk000E"],
  ["Swift 設定：特殊字元範圍 \\u000E-\\u001F 的上端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001E\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk001F"],
  ["Swift 設定：特殊字元範圍 \\u200B-\\u200F 的下端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200C-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk200B"],
  ["Swift 設定：特殊字元範圍 \\u200B-\\u200F 的上端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200E\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk200F"],
  ["Swift 設定：特殊字元範圍 \\u2060-\\u2064 的下端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2061-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk2060"],
  ["Swift 設定：特殊字元範圍 \\u2060-\\u2064 的上端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2063\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftLk2064"],
  ["Swift 設定：特殊字元範圍 \\u202A-\\u202E 的下端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202B-\\u202E\\u2066-\\u206F]/;","swiftLk202A"],
  ["Swift 設定：特殊字元範圍 \\u202A-\\u202E 的上端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202D\\u2066-\\u206F]/;","swiftLk202E"],
  ["Swift 設定：特殊字元範圍 \\u2066-\\u206F 的下端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2067-\\u206F]/;","swiftLk2066"],
  ["Swift 設定：特殊字元範圍 \\u2066-\\u206F 的上端","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206E]/;","swiftLk206F"],
  ["Swift 設定：xcconfig 白名單行首 ^","!/^\\s*CAPACITOR_DEBUG\\s*=","!/CAPACITOR_DEBUG\\s*=","swiftXcCapTail"],
  ["Swift 設定：xcconfig 白名單行尾 \\s*$","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false)/","swiftXcCapSuffix"],
  ["Swift 設定：rootObject 要是字串","proj = (typeof P.rootObject === \"string\" && O[P.rootObject]","proj = (O[P.rootObject]","swiftRootArray"],
  ["Swift 設定：pbxproj 語法 看不懂的跳脫","else fail(\"看不懂的跳脫 \\\\\" + e);","else s += e;","swiftUnparsable"],
  ["看不懂就拒絕：只豁免以 // 開頭的行", ".filter((l) => !(/^\\s*\\/\\//.test(l) && ", ".filter((l) => !(/\\/\\//.test(l) && ", "oddTrailComment"],
  ["看不懂就拒絕：特殊換行字元（整份原文，不經過豁免）", "if (ODD_NL.test(raw)) odd.push", "if (false) odd.push", "odd0085"],
  ["看不懂就拒絕：子資料夾也要遞迴","e.isDirectory() ? (/^(Pods|build|DerivedData|node_modules)$/.test(e.name) ? [] : swWalk(path.join(d, e.name)))","e.isDirectory() ? []","oddSubdir"],
  ["看不懂就拒絕：每一份 Swift", "for (const f of [...swWalk(SRC), ...swWalk(APP)])", "for (const f of [path.join(SRC, \"XQLoopbackServer.swift\")])", "oddVc"],
  ["看不懂就拒絕：多行字串", "[/\"\"\"/, ", "[/(?!)/, ", "oddTriple"],
  ["看不懂就拒絕：反引號", "[/`/, ", "[/(?!)/, ", "oddTick"],
  ["看不懂就拒絕：#/ 正規式", "[/#+\\//, ", "[/(?!)/, ", "oddRegex"],
  ["看不懂就拒絕：原始字串", "[/(^|[^\"])#+\"/m, ", "[/(?!)/, ", "oddRaw"],
  ["鎖住四段：不能在 #if 裡","if ((pre.match(/#if\\b/g) || []).length !== (pre.match(/#endif\\b/g) || []).length) { pinBad.push(n + \"（不能放在 #if 裡）\"); continue }","if (false) { pinBad.push(n + \"（不能放在 #if 裡）\"); continue }","vnIfDebug"],
  ["鎖住四段：簽章在去註解的原文只能一處","if (count(srvNC, sig) !== 1 || count(srvCode, sig) !== 1)","if (count(srvCode, sig) !== 1)","vnDecoyBefore"],
  ["鎖住四段：簽章在斷詞後的程式碼只能一處","if (count(srvNC, sig) !== 1 || count(srvCode, sig) !== 1)","if (count(srvNC, sig) !== 1)","vnDecoyOnly"],
  ["鎖住四段：內容雜湊","if (pinOf(sig) !== h) pinBad.push","if (false) pinBad.push","vnRetTrue"],
  ["鎖住四段：不准 extension XQLoopbackServer","if (extAt.length) pinBad.push","if (false) pinBad.push","vnExtension"],
  ["鎖住四段：issueChallenge 只宣告一次","[\"issueChallenge\", /\\bfunc\\s+issueChallenge\\b/g], ","","vnDupIssue"],
  ["鎖住四段：randomHex 只宣告一次",", [\"randomHex\", /\\bfunc\\s+randomHex\\b/g]]","]","vnDupHex"],
  ["鎖住四段：XQFlag 全專案只宣告一次","if (flagDecl !== 1) pinBad.push","if (false) pinBad.push","vnNestedFlag"],
  ["一次性考題：issueChallenge","check(/func issueChallenge\\(\\)/.test(srvCode) && ","check(true && ","challenge"],
  ["whoami：takeAnswer(for: challenge)","check(hw.includes(\"takeAnswer(for: challenge)\") && ","check(true && ","whoamiTake"],
  ["whoami：let a = answer","&& hw.includes(\"let a = answer\"), \"whoami",", \"whoami","whoamiAnswer"],
  ["establish：至少 2 個 if 區塊","check(vBlocks.length >= 2 && ","check(vBlocks.length >= 1 && ","estOneBlock"],
  ["establish：verifyNow 字數＝if 區塊數","&& vTok === vBlocks.length\n","\n","estCallAs"],
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
  ["Swift 設定（放寬）：PBXProject 整條拿掉","if (projN !== 1 || proj.isa !== \"PBXProject\") swBad","if (false) swBad","swiftProjExtra"],
  ["Swift 設定（放寬）：dirOf $ 改 $(","if (/\\$/.test(","if (/\\$\\(/.test(","swiftSrcRootBrace"],
  ["Swift 設定（放寬）：dirOf SOURCE_ROOT 條件放寬（任何非 <group>）","else if (o.sourceTree === \"SOURCE_ROOT\") base = projDir;","else if (true) base = projDir;","swiftBuiltProducts"],
  ["Swift 設定（放寬）：SW_OK 不認得的鍵照收","(SW_OK[k] || []).includes(v)","(SW_OK[k] || [v]).includes(v)","swiftUpcoming"],
  ["Swift 設定（放寬）：SWIFT 正規式改 SWIFT_[A-Z]","if (/SWIFT/.test(k)","if (/SWIFT_[A-Z]+$/.test(k)","swiftUpcoming"],
  ["Swift 設定（放寬）：SW_OK 條件編譯收任何","SWIFT_ACTIVE_COMPILATION_CONDITIONS: [\"\", \"DEBUG\"]","SWIFT_ACTIVE_COMPILATION_CONDITIONS: { includes: () => true }","swiftCondValue"],
  ["Swift 設定（放寬）：CFG_KEYS 加 baseConfigurationReferenceRelativePath","\"baseConfigurationReference\"]);","\"baseConfigurationReference\", \"baseConfigurationReferenceRelativePath\"]);","swiftCfgAnchor"],
  ["Swift 設定（放寬）：baseRef 不追","if (o.baseConfigurationReference != null) {","if (false) {","swiftXcMissing"],
  ["Swift 設定（放寬）：xcconfig 註解錨點 ^ 拿掉","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","swiftXcTrailCmt"],
  ["Swift 設定（放寬）：CAP 鍵後 \\s* → .*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG.*=\\s*(true|false)\\s*$/","swiftXcCapKey"],
  ["Swift 設定（放寬）：CAP 值 → \\S*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*\\S*\\s*$/","swiftXcCapVal"],
  ["Swift 設定（放寬）：CAP 鍵 → CAPACITOR_\\w*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_\\w*\\s*=\\s*(true|false)\\s*$/","swiftXcCapKey"],
  ["Swift 設定（放寬）：物件 = 可用 : 代替","if (src[i] !== \"=\") fail(\"少了 =\"); i++;","if (src[i] !== \"=\" && src[i] !== \":\") fail(\"少了 =\"); i++;","swiftPbxColon"],
  ["Swift 設定（放寬）：字串 \\n 解成空","if (e === \"n\") s += \"\\n\";","if (e === \"n\") s += \"\";","swiftEscNEnd"],
  ["Swift 設定（放寬）：裸字 拿掉 y（往後找）","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.-]+/g;","swiftPbxAt1"],
  ["Swift 設定（放寬）：裸字 + → *（可空）","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.-]*/y;","swiftPbxEmptyKey"],
  ["Swift 設定（放寬）：dirOf $ 只看開頭","if (/\\$/.test(String(o.path || \"\")","if (/^\\$/.test(String(o.path || \"\")","swiftNameDollar"],
  ["Swift 設定（放寬）：dirOf SOURCE_ROOT 改 /ROOT/","else if (o.sourceTree === \"SOURCE_ROOT\") base = projDir;","else if (/ROOT/.test(o.sourceTree)) base = projDir;","swiftTreeSdkRoot"],
  ["Swift 設定（放寬）：XCBuildConfiguration 判斷整條拿掉（全部物件都當設定）","if (o.isa !== \"XCBuildConfiguration\") continue;","if (!o.buildSettings) continue;","swiftCfgNoSettings"],
  ["Swift 設定（放寬）：SWIFT 正規式 SWIFT_","if (/SWIFT/.test(k)","if (/SWIFT_/.test(k)","swiftKeySwiftEnd"],
  ["Swift 設定（放寬）：SW_OK 值只要前綴","!(SW_OK[k] || []).includes(v)","!(SW_OK[k] || []).some((x) => String(v).startsWith(x))","swiftOtherFlags"],
  ["Swift 設定（放寬）：SW_OK 條件編譯加 DEBUG XQ","SWIFT_ACTIVE_COMPILATION_CONDITIONS: [\"\", \"DEBUG\"]","SWIFT_ACTIVE_COMPILATION_CONDITIONS: [\"\", \"DEBUG\", \"DEBUG XQ\"]","swiftCondValue"],
  ["Swift 設定（放寬）：bare NO 不分大小寫",".SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\") swBad",".SWIFT_ENABLE_BARE_SLASH_REGEX.toUpperCase() !== \"NO\") swBad","swiftBareGone"],
  ["Swift 設定（放寬）：COMPILER_FLAGS 鍵名放寬 \\bCOMPILER_FLAGS\\b","if (/COMPILER_FLAGS/.test(JSON.stringify(O))) swBad","if (/\\bCOMPILER_FLAGS\\b/.test(JSON.stringify(O))) swBad","swiftCompFlagsSuffix"],
  ["Swift 設定（放寬）：xcconfig 註解 \\s* → [^A-Z]*","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^[^A-Z]*\\/\\//.test(l) && !/^\\s*CAPACITOR","swiftXcDashCmt"],
  ["Swift 設定（放寬）：CAP ^\\s* → ^[^=]*","!/^\\s*CAPACITOR_DEBUG\\s*=","!/^[^=]*CAPACITOR_DEBUG\\s*=","swiftXcCapDash"],
  ["Swift 設定（放寬）：CAP 鍵 \\S+","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","\\S+\\s*=\\s*(true|false)\\s*$/","swiftXcUpcoming"],
  ["Swift 設定（放寬）：CAP 值不分大小寫","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/i","swiftXcCapUpper"],
  ["Swift 設定（放寬）：CAP 值後 \\s* → [^\\n]*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false)[^\\n]*$/","swiftXcCapSuffix"],
  ["Swift 設定（放寬）：CAP 整條改 includes","&& !/^\\s*CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/.test(l)) swBad","&& !l.includes(\"CAPACITOR_DEBUG\")) swBad","swiftXcCapVal"],
  ["Swift 設定（放寬）：xcconfig 行 #include? 只擋 #include \"","for (const l of xraw.split(\"\\n\"))","for (const l of xraw.split(\"\\n\").filter((x) => !/^\\s*#include\\?/.test(x)))","swiftIncOptional"],
  ["Swift 設定（放寬）：NL 刪 2028","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\r\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","swiftNl2028"],
  ["Swift 設定（放寬）：NL 整條照收","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /(?!)/;","swiftNl2028"],
  ["Swift 設定（放寬）：跳脫 看不懂照收（含反斜線）","else fail(\"看不懂的跳脫 \\\\\" + e);","else s += \"\\\\\" + e;","swiftUnparsable"],
  ["Swift 設定（放寬）：projN 不算（=1）","const projN = Object.values(O).filter((o) => o.isa === \"PBXProject\").length,","const projN = 1,","swiftProjExtra"],
  ["Swift 設定（放寬）：projN!==1 拿掉","if (projN !== 1 || proj.isa","if (proj.isa","swiftProjExtra"],
  ["Swift 設定（放寬）：dirOf 上層不在時用 projDir","return base == null ? null : path.resolve(","return path.resolve(base == null ? projDir : base, ","swiftGroupLoop"],
  ["Swift 設定（放寬）：SWIFT 正規式加 ^","if (/SWIFT/.test(k)","if (/^SWIFT/.test(k)","swiftBareRx"],
  ["Swift 設定（放寬）：SW_OK SWIFT_VERSION 加 6.0","SWIFT_VERSION: [\"5.0\"]","SWIFT_VERSION: [\"5.0\", \"6.0\"]","swiftVer6"],
  ["Swift 設定（放寬）：SW_OK 編譯模式收任何","SWIFT_COMPILATION_MODE: [\"wholemodule\"]","SWIFT_COMPILATION_MODE: { includes: () => true }","swiftModeValue"],
  ["Swift 設定（放寬）：check 恆真","check(svN > 0 && swBad.length === 0,","check(true,","swiftVer6"],
  ["Swift 設定（放寬）：baseRef 看不懂不推","else swBad.push(\"baseConfigurationReference 的路徑看不懂（只認 <group>、SOURCE_ROOT）\")","","swiftSrcRootRef"],
  ["Swift 設定（放寬）：xcconfig 副檔名只收 debug",".filter((f) => f.endsWith(\".xcconfig\"))",".filter((f) => f.endsWith(\"debug.xcconfig\"))","swiftXcIos"],
  ["Swift 設定（放寬）：xcconfig 註解 \\s* → .*","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^.*\\/\\//.test(l) && !/^\\s*CAPACITOR","swiftXcTrailCmt"],
  ["Swift 設定（放寬）：CAP = 後 \\s* → .*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=.*(true|false)\\s*$/","swiftXcCapMid"],
  ["Swift 設定（放寬）：CAP 值 (true|false)?","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false)?\\s*$/","swiftXcCapEmpty"],
  ["Swift 設定（放寬）：CAP 鍵 → [A-Z_]+（任何鍵 true/false）","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","[A-Z_]+\\s*=\\s*(true|false)\\s*$/","swiftXcUpcoming"],
  ["Swift 設定（放寬）：ws \\s → [\\s\\S]（什麼都當空白）","while (i < src.length && /\\s/.test(src[i])) i++;","while (i < src.length && /[\\s@]/.test(src[i])) i++;","swiftPbxAt1"],
  ["Swift 設定（放寬）：陣列 , 可省（空白分隔）","if (src[i] === \")\") { i++; return a } fail(\"陣列少了 ,\") } }","if (src[i] === \")\") { i++; return a } continue } }","swiftPbxArrComma"],
  ["Swift 設定（放寬）：字串 \\t 解成空白","else if (e === \"t\") s += \"\\t\";","else if (e === \"t\") s += \" \";","swiftEscTSpace"],
  ["Swift 設定（放寬）：裸字 加 @","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.@-]+/y;","swiftPbxBadChar"],
  ["Swift 設定（放寬）：根 結尾只看非空白","const root = val(); ws(); if (i !== src.length) fail(\"結尾多了東西\");","const root = val(); ws(); if (src.slice(i).trim() && !/^[\\s\\S]*$/.test(src.slice(i))) fail(\"結尾多了東西\");","swiftPbxTrailing"],
  ["Swift 設定（放寬）：projN 只算有 mainGroup 的","filter((o) => o.isa === \"PBXProject\").length","filter((o) => o.isa === \"PBXProject\" && o.mainGroup).length","swiftProjExtraNoMain"],
  ["Swift 設定（放寬）：dirOf $ 改 \\$\\w","if (/\\$/.test(String(o.path || \"\")","if (/\\$\\w/.test(String(o.path || \"\")","swiftSrcRootRef"],
  ["Swift 設定（放寬）：CFG_KEYS 鍵名不分大小寫","if (!CFG_KEYS.has(k)) swBad","if (!CFG_KEYS.has(k) && !CFG_KEYS.has(k.replace(/^./, (x) => x.toLowerCase()))) swBad","swiftCfgKeyCase"],
  ["Swift 設定（放寬）：SWIFT 正規式 _SWIFT 或 ^SWIFT","if (/SWIFT/.test(k)","if (/(^|_)SWIFT/.test(k)","swiftKeySwiftMid"],
  ["Swift 設定（放寬）：SW_OK 值陣列取第一個","!(SW_OK[k] || []).includes(v)","!(SW_OK[k] || []).includes(Array.isArray(v) ? v[0] : v)","swiftValArrFirst"],
  ["Swift 設定（放寬）：SW_OK 編譯模式加 singlefile","SWIFT_COMPILATION_MODE: [\"wholemodule\"]","SWIFT_COMPILATION_MODE: [\"wholemodule\", \"singlefile\"]","swiftModeSingle"],
  ["Swift 設定（放寬）：COMPILER_FLAGS 結尾錨點","if (/COMPILER_FLAGS/.test(JSON.stringify(O))) swBad","if (/COMPILER_FLAGS\"/.test(JSON.stringify(O))) swBad","swiftCompFlagsCond"],
  ["Swift 設定（放寬）：xcconfig 註解 // 或 ;","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^\\s*(\\/\\/|;)/.test(l) && !/^\\s*CAPACITOR","swiftXcSemi"],
  ["Swift 設定（放寬）：CAP 鍵 \\w+","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","\\w+\\s*=\\s*(true|false)\\s*$/","swiftXcUpcoming"],
  ["Swift 設定（放寬）：CAP 鍵 CAPACITOR_DEBUG\\S*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\S*\\s*=\\s*(true|false)\\s*$/","swiftXcCapKey"],
  ["Swift 設定（放寬）：CAP 值 \\w+","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*\\w+\\s*$/","swiftXcCapVal"],
  ["Swift 設定（放寬）：CAP 值後允許 // 註解","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*(\\/\\/.*)?$/","swiftXcCapCmt"],
  ["Swift 設定（放寬）：CAP 整條改 startsWith","&& !/^\\s*CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/.test(l)) swBad","&& !l.trim().startsWith(\"CAPACITOR_DEBUG\")) swBad","swiftXcCapVal"],
  ["Swift 設定（放寬）：/* 找 */ 從 i 開始","src.indexOf(\"*/\", i + 2)","src.indexOf(\"*/\", i + 1)","swiftPbxCommentSlash"],
  ["Swift 設定（放寬）：跳脫 \\n 當 n","if (e === \"n\") s += \"\\n\";","if (e === \"n\") s += \"n\";","swiftEscN"],
  ["Swift 設定（放寬）：裸字 收任何非分隔","/[A-Za-z0-9_$+/:.-]+/y","/[^\\s;=,(){}\"]+/y","swiftPbxBadChar"],
  ["Swift 設定（放寬）：SWIFT 正規式加 $","if (/SWIFT/.test(k)","if (/SWIFT$/.test(k)","swiftVer6"],
  ["Swift 設定（放寬）：SW_OK 最佳化收任何","SWIFT_OPTIMIZATION_LEVEL: [\"-O\", \"-Onone\"]","SWIFT_OPTIMIZATION_LEVEL: { includes: () => true }","swiftOptValue"],
  ["Swift 設定（放寬）：svN 改成 >= 0","check(svN > 0 && swBad.length === 0,","check(svN >= 0 && swBad.length === 0,","swiftVerGone"],
  ["Swift 設定（放寬）：xcconfig 不存在不推","if (!fs.existsSync(f)) { swBad.push(\"找不到 \" + path.relative(HERE, f)); continue }","if (!fs.existsSync(f)) { continue }","swiftXcMissing"],
  ["Swift 設定（放寬）：xcconfig 註解 // → /","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^\\s*\\//.test(l) && !/^\\s*CAPACITOR","swiftXcSlash"],
  ["Swift 設定（放寬）：CAP 值後 \\s*$ → .*$","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false).*$/","swiftXcCapSuffix"],
  ["Swift 設定（放寬）：CAP 值 → .*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*.*$/","swiftXcCapVal"],
  ["Swift 設定（放寬）：CAP 鍵加 [^=]*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG[^=]*=\\s*(true|false)\\s*$/","swiftXcCapKey"],
  ["Swift 設定（放寬）：ws // 改成 /","if (src.startsWith(\"//\", i)) {","if (src.startsWith(\"/\", i) && src[i + 1] !== \"*\") {","swiftPbxSlashLine"],
  ["Swift 設定（放寬）：物件 } 前可省 ;（少了 ; 遇到 } 照收）","if (src[i] !== \";\") fail(\"少了 ;\"); i++;","if (src[i] === \"}\") { o[k] = v; continue } if (src[i] !== \";\") fail(\"少了 ;\"); i++;","swiftPbxLastNoSemi"],
  ["Swift 設定（放寬）：字串 看不懂的跳脫丟掉","else fail(\"看不懂的跳脫 \\\\\" + e);","else s += \"\";","swiftUnparsable"],
  ["Swift 設定（放寬）：裸字 加 [ ]（條件鍵不用引號）","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.\\[\\]*=-]+/y;","swiftPbxStar"],
  ["Swift 設定（放寬）：projectDirPath 只看 ===\"\" 以外的字串","if ((proj.projectDirPath || \"\") !== \"\" || ","if (typeof proj.projectDirPath === \"string\" && proj.projectDirPath !== \"\" || ","swiftProjDirArr"],
  ["Swift 設定（放寬）：dirOf $ 改 \\$[({]","if (/\\$/.test(String(o.path || \"\")","if (/\\$[({]/.test(String(o.path || \"\")","swiftSrcRootBare"],
  ["Swift 設定（放寬）：dirOf mainGroup 用 == 比（型別放寬）","(id === proj.mainGroup ? projDir : null)","(id == proj.mainGroup ? projDir : null)","swiftMainGroupArr"],
  ["Swift 設定（放寬）：SW_OK 值 trim 後比","!(SW_OK[k] || []).includes(v)","!(SW_OK[k] || []).includes(String(v).trim())","swiftValTrim"],
  ["Swift 設定（放寬）：SW_OK 值陣列 join","!(SW_OK[k] || []).includes(v)","!(SW_OK[k] || []).includes(Array.isArray(v) ? v.join(\" \") : v)","swiftValArrOne"],
  ["Swift 設定（放寬）：SW_OK 最佳化加 -Osize","SWIFT_OPTIMIZATION_LEVEL: [\"-O\", \"-Onone\"]","SWIFT_OPTIMIZATION_LEVEL: [\"-O\", \"-Onone\", \"-Osize\"]","swiftOptSize"],
  ["Swift 設定（放寬）：baseRef != null 改 typeof string","if (o.baseConfigurationReference != null) {","if (typeof o.baseConfigurationReference === \"string\") {","swiftBaseRefArr"],
  ["Swift 設定（放寬）：xcconfig 註解 // 或 /*","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^\\s*\\/[\\/*]/.test(l) && !/^\\s*CAPACITOR","swiftXcSlash"],
  ["Swift 設定（放寬）：CAP 鍵 CAPACITOR_DEBUG\\w*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\w*\\s*=\\s*(true|false)\\s*$/","swiftXcCapKey"],
  ["Swift 設定（放寬）：CAP = → [=:]","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*[=:]\\s*(true|false)\\s*$/","swiftXcCapColon"],
  ["Swift 設定（放寬）：CAP 值加 YES|NO","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false|YES|NO)\\s*$/","swiftXcCapYes"],
  ["Swift 設定（放寬）：CAP 值前 \\s* → [^a-z]*","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=[^a-z]*(true|false)\\s*$/","swiftXcCapPre"],
  ["Swift 設定（放寬）：check swBad.length === 0 → < 2","check(svN > 0 && swBad.length === 0,","check(svN > 0 && swBad.length < 2,","swiftVer6"],
  ["Swift 設定（放寬）：重複鍵 改成後蓋前不報","if (k in o) fail(\"重複的鍵 \" + k); o[k] = v","if (!(k in o)) o[k] = v","swiftDupNoYes"],
  ["Swift 設定（放寬）：跳脫 \\t 當 t","else if (e === \"t\") s += \"\\t\";","else if (e === \"t\") s += \"t\";","swiftEscT"],
  ["Swift 設定（放寬）：proj.isa 拿掉","|| proj.isa !== \"PBXProject\") swBad",") swBad","swiftRootMainGroup"],
  ["Swift 設定（放寬）：dirOf $ 只看 name","String(o.path || \"\") + String(o.name || \"\")","String(o.name || \"\")","swiftSrcRootRef"],
  ["Swift 設定（放寬）：SW_OK 只看鍵在不在","!(SW_OK[k] || []).includes(v)","!(k in SW_OK)","swiftVer6"],
  ["Swift 設定（放寬）：SWIFT 正規式 SWIFT_ 開頭或 _SWIFT_","if (/SWIFT/.test(k)","if (/^SWIFT_|_SWIFT_FLAGS$/.test(k)","swiftCondFlags"],
  ["Swift 設定（放寬）：SW_OK OTHER_SWIFT_FLAGS 收任何","OTHER_SWIFT_FLAGS: [\"$(inherited) \\\"-D\\\" \\\"COCOAPODS\\\" \\\"-DDEBUG\\\"\"]","OTHER_SWIFT_FLAGS: { includes: () => true }","swiftBareRx"],
  ["Swift 設定（放寬）：check 只看 svN","check(svN > 0 && swBad.length === 0,","check(svN > 0,","swiftVer6"],
  ["Swift 設定（放寬）：bare NO 改成 ===YES",".SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\") swBad",".SWIFT_ENABLE_BARE_SLASH_REGEX === \"YES\") swBad","swiftBareGone"],
  ["Swift 設定（放寬）：COMPILER_FLAGS 只看 ^","if (/COMPILER_FLAGS/.test(JSON.stringify(O))) swBad","if (/\"COMPILER_FLAGS\"/.test(JSON.stringify(O))) swBad","swiftCompFlagsCond"],
  ["Swift 設定（放寬）：xcDirs 全拿掉","const xcDirs = [path.join(HERE, \"ios\"), projDir, APP];","const xcDirs = [];","swiftXcIos"],
  ["Swift 設定（放寬）：xcconfig 註解 // → #","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^\\s*(\\/\\/|#)/.test(l) && !/^\\s*CAPACITOR","swiftIncHidden"],
  ["Swift 設定（放寬）：CAP ^\\s* → ^.*","!/^\\s*CAPACITOR_DEBUG\\s*=","!/^.*CAPACITOR_DEBUG\\s*=","swiftXcCapTail"],
  ["Swift 設定（放寬）：CAP $ 拿掉","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*/","swiftXcCapSuffix"],
  ["Swift 設定（放寬）：CAP = 拿掉","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=?\\s*(true|false)\\s*$/","swiftXcCapNoEq"],
  ["Swift 設定（放寬）：ws /* 註解只認到行尾","const e = src.indexOf(\"*/\", i + 2); if (e < 0) fail(\"註解沒有收尾\"); i = e + 2; continue }","const e0 = src.indexOf(\"*/\", i + 2), nl = src.indexOf(\"\\n\", i); const e = e0 < 0 ? -1 : e0; if (e < 0) { if (nl < 0) fail(\"註解沒有收尾\"); i = nl; continue } i = e + 2; continue }","swiftPbxComment"],
  ["Swift 設定（放寬）：物件 鍵可以是陣列（typeof 改 != null）","if (typeof k !== \"string\") fail(\"鍵不是字串\");","if (k == null) fail(\"鍵不是字串\");","swiftPbxKeyNotStr"],
  ["Swift 設定（放寬）：字串 \\\\ 解成兩個反斜線","else if (e === \"\\\"\" || e === \"\\\\\") s += e;","else if (e === \"\\\"\") s += e; else if (e === \"\\\\\") s += \"\\\\\\\\\";","swiftEscBackslash"],
  ["Swift 設定（放寬）：字串 單引號也當字串","if (c === \"\\\"\") { i++; let s = \"\";","if (c === \"\\\"\" || c === \"'\") { i++; let s = \"\";","swiftPbxSingleQuote"],
  ["Swift 設定（放寬）：裸字 加 *","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.*-]+/y;","swiftPbxStar"],
  ["Swift 設定（放寬）：children 不檢查陣列","if (Array.isArray(o.children)) for (const c of o.children) parent[c] = id;","if (o.children) for (const c of [].concat(o.children)) parent[c] = id;","swiftChildrenStr"],
  ["Swift 設定（放寬）：projectRoot 只看字串"," || (proj.projectRoot || \"\") !== \"\""," || typeof proj.projectRoot === \"string\" && proj.projectRoot !== \"\"","swiftProjRootArr"],
  ["Swift 設定（放寬）：dirOf <group> 改 /group/","if (o.sourceTree === \"<group>\") base","if (/group/.test(o.sourceTree)) base","swiftTreeGroupish"],
  ["Swift 設定（放寬）：SWIFT 正規式 \\bSWIFT","if (/SWIFT/.test(k)","if (/\\bSWIFT/.test(k)","swiftBareRx"],
  ["Swift 設定（放寬）：SW_OK 值不分大小寫","!(SW_OK[k] || []).includes(v)","!(SW_OK[k] || []).some((x) => x.toLowerCase() === String(v).toLowerCase())","swiftValCase"],
  ["Swift 設定（放寬）：SW_OK SWIFT_VERSION 5.0 → 5","SWIFT_VERSION: [\"5.0\"]","SWIFT_VERSION: [\"5.0\", \"5\"]","swiftVer5"],
  ["Swift 設定（放寬）：COMPILER_FLAGS 只看鍵","if (/COMPILER_FLAGS/.test(JSON.stringify(O))) swBad","if (/\"COMPILER_FLAGS\":/.test(JSON.stringify(O))) swBad","swiftCompFlagsCond"],
  ["Swift 設定（放寬）：xcconfig 註解 \\s* → \\W*","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^\\W*\\/\\//.test(l) && !/^\\s*CAPACITOR","swiftXcDashCmt"],
  ["Swift 設定（放寬）：CAP ^\\s* → ^\\W*","!/^\\s*CAPACITOR_DEBUG\\s*=","!/^\\W*CAPACITOR_DEBUG\\s*=","swiftXcCapDash"],
  ["Swift 設定（放寬）：CAP 鍵 [A-Z_]*DEBUG","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","[A-Z_]*DEBUG\\s*=\\s*(true|false)\\s*$/","swiftXcDebugKey"],
  ["Swift 設定（放寬）：CAP = → \\W","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*\\W\\s*(true|false)\\s*$/","swiftXcCapNoEq"],
  ["Swift 設定（放寬）：CAP 值 (true|false) 開頭就好（拿掉 \\s*$ 的 $）","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\b/","swiftXcCapCmt"],
  ["Swift 設定（放寬）：CAP \\s* → [\\s\\S]*（= 前）","CAPACITOR_DEBUG\\s*=\\s*(true|false)\\s*$/","CAPACITOR_DEBUG[\\s\\S]*=\\s*(true|false)\\s*$/","swiftXcCapKey"],
  ["Swift 設定（放寬）：xcconfig 行先 trim 掉 #include 再判","for (const l of xraw.split(\"\\n\"))","for (const l of xraw.split(\"\\n\").filter((x) => !/^\\s*#include/.test(x)))","swiftIncHidden"],
  ["Swift 設定（放寬）：dirOf 上層群組 $ 只看 name 以外（上層只看 path 開頭）","if (/\\$/.test(String(o.path || \"\") + String(o.name || \"\"))) return null;","if (/\\$/.test(depth > 0 ? String(o.path || \"\").slice(0, 1) : String(o.path || \"\") + String(o.name || \"\"))) return null;","swiftGroupDollarMid"],
  ["Swift 設定（放寬）：dirOf 上層群組 sourceTree 只擋 BUILT_PRODUCTS_DIR","else if (o.sourceTree === \"SOURCE_ROOT\") base = projDir;","else if (o.sourceTree === \"SOURCE_ROOT\" || depth > 0 && o.sourceTree !== \"BUILT_PRODUCTS_DIR\") base = projDir;","swiftParentSdk"],
  ["Swift 設定（放寬）：xcconfig 逐行 跳過太長的行","for (const l of xraw.split(\"\\n\"))","for (const l of xraw.split(\"\\n\").filter((x) => x.length < 1000))","swiftXcLongLine"],
  ["Swift 設定（放寬）：M19 COMPILER_FLAGS 只看 PBXBuildFile","if (/COMPILER_FLAGS/.test(JSON.stringify(O))) swBad","if (/COMPILER_FLAGS/.test(JSON.stringify(Object.values(O).filter((o) => o.isa === \"PBXBuildFile\")))) swBad","swiftCompFlagsCfg"],
  ["Swift 設定（放寬）：M7 裸字加 <","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.<-]+/y;","swiftPbxChLt"],
  ["Swift 設定（放寬）：M7 裸字加 ^","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.^-]+/y;","swiftPbxChCaret"],
  ["Swift 設定（放寬）：M1 CFG_KEYS 加 Anchor","\"baseConfigurationReference\"]);","\"baseConfigurationReference\", \"baseConfigurationReferenceAnchor\"]);","swiftCfgAnchorKey"],
  ["Swift 設定（放寬）：M8 上層群組 sourceTree 不查","else if (o.sourceTree === \"SOURCE_ROOT\") base = projDir;","else if (o.sourceTree === \"SOURCE_ROOT\" || depth > 0) base = projDir;","swiftParentTree"],
  ["Swift 設定（放寬）：M14 LOCK_NL 只看 pbxproj 前 50000 字","if (LOCK_NL.test(raw)) swBad","if (LOCK_NL.test(raw.slice(0, 50000))) swBad","swiftNlFar"],
  ["Swift 設定（放寬）：M20 projectDirPath 只看 trim","if ((proj.projectDirPath || \"\") !== \"\"","if (String(proj.projectDirPath || \"\").trim() !== \"\"","swiftProjDirSpace"],
  ["Swift 設定（放寬）：M7 裸字加 >","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.>-]+/y;","swiftPbxChGt"],
  ["Swift 設定（放寬）：M7 裸字加 '","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.'-]+/y;","swiftPbxChApos"],
  ["Swift 設定（放寬）：dirOf 深度上限 4000","depth > 40)","depth > 4000)","swiftGroupDeep"],
  ["Swift 設定（放寬）：M2 $ 只看參照本身（depth 0）","if (/\\$/.test(String(o.path || \"\") + String(o.name || \"\"))) return null;","if (depth === 0 && /\\$/.test(String(o.path || \"\") + String(o.name || \"\"))) return null;","swiftGroupDollar"],
  ["Swift 設定（放寬）：M9 xcconfig 逐行 只看前 3 行","for (const l of xraw.split(\"\\n\"))","for (const l of xraw.split(\"\\n\").slice(0, 3))","swiftXcDeepLine"],
  ["Swift 設定（放寬）：M15 ws // 註解 到 ; 為止","while (i < src.length && src[i] !== \"\\n\") i++; continue }","while (i < src.length && src[i] !== \"\\n\" && src[i] !== \";\") i++; continue }","swiftPbxCmtSemi"],
  ["Swift 設定（放寬）：M7 裸字加 #","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.#-]+/y;","swiftPbxChHash"],
  ["Swift 設定（放寬）：M7 裸字加 ?","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.?-]+/y;","swiftPbxChQ"],
  ["Swift 設定（放寬）：M7 裸字加 \\\\","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.\\\\-]+/y;","swiftPbxChBslash"],
  ["Swift 設定（放寬）：M10 bare NO 只查有 name 的","if ((o.buildSettings || {}).SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\")","if (o.name && (o.buildSettings || {}).SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\")","swiftCfgNoName"],
  ["Swift 設定（放寬）：M16 字串 \\\\ 解成空","else if (e === \"\\\"\" || e === \"\\\\\") s += e;","else if (e === \"\\\"\") s += e; else if (e === \"\\\\\") s += \"\";","swiftEscBsEmpty"],
  ["Swift 設定（放寬）：M7 裸字加 !","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.!-]+/y;","swiftPbxChBang"],
  ["Swift 設定（放寬）：M7 裸字加 `","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.`-]+/y;","swiftPbxChTick"],
  ["Swift 設定（放寬）：baseRef 只追 Debug","if (o.baseConfigurationReference != null) {","if (o.baseConfigurationReference != null && o.name === \"Debug\" && !xcRefs.length) {","swiftSecondRef"],
  ["Swift 設定（第六輪）：xcconfig 逐行切（縮排的續行也要看）","for (const l of xraw.split(\"\\n\"))","for (const l of xraw.split(/\\n(?=\\S)/))","swiftXcIndentCont"],
  ["Swift 設定（第六輪）：xcconfig 每行整行都看（不能只看前 200 字）","for (const l of xraw.split(\"\\n\")) if (l.trim()","for (const l of xraw.split(\"\\n\").map((x) => x.slice(0, 200))) if (l.trim()","swiftXcLongIndent"],
  ["Swift 設定（第七輪）：xcconfig 每行整行都看（不能只看前 1000 字）","for (const l of xraw.split(\"\\n\")) if (l.trim()","for (const l of xraw.split(\"\\n\").map((x) => x.slice(0, 1000))) if (l.trim()","swiftXcLongIndent"],
  ["Swift 設定（第六輪）：每個 baseConfigurationReference 都追（不能只追最後一個）","if (p) xcRefs.push(p); else swBad","if (p) xcRefs.splice(0, xcRefs.length, p); else swBad","swiftFirstRefBad"],
  ["Swift 設定（放寬）：M4 /* 從 i+3 找 */","src.indexOf(\"*/\", i + 2)","src.indexOf(\"*/\", i + 3)","swiftCommentI3"],
  ["Swift 設定（放寬）：M11 bare NO 只查有 buildSettings 的","if ((o.buildSettings || {}).SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\")","if (o.buildSettings && o.buildSettings.SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\")","swiftCfgNoSettings"],
  ["Swift 設定（放寬）：M17 xcconfig 白名單用 l.trim() 判註解","!/^\\s*\\/\\//.test(l)","!l.trim().startsWith(\"/\")","swiftXcSlash"],
  ["Swift 設定（放寬）：M7 裸字加 %","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.%-]+/y;","swiftPbxChPct"],
  ["Swift 設定（放寬）：M7 裸字加 ~","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.~-]+/y;","swiftPbxChTilde"],
  ["Swift 設定（放寬）：M6 只追第一個 baseRef（修正）","if (p) xcRefs.push(p);","if (p) { if (!xcRefs.length) xcRefs.push(p) }","swiftSecondRef"],
  ["Swift 設定（放寬）：COMPILER_FLAGS 只看 settings 欄位","if (/COMPILER_FLAGS/.test(JSON.stringify(O))) swBad","if (/COMPILER_FLAGS/.test(JSON.stringify(Object.values(O).map((o) => o.settings || {})))) swBad","swiftCompFlagsCfg"],
  ["Swift 設定（放寬）：M12 SW_OK 用 == 比","!(SW_OK[k] || []).includes(v)","!(SW_OK[k] || []).some((x) => x == v)","swiftValArrOne"],
  ["Swift 設定（放寬）：M7 裸字加 &","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.&-]+/y;","swiftPbxChAmp"],
  ["Swift 設定（放寬）：M7 裸字加 |","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.|-]+/y;","swiftPbxChBar"],
  ["Swift 設定（放寬）：LOCK_NL 只看 xcconfig 前 50000 字","if (LOCK_NL.test(xraw)) swBad","if (LOCK_NL.test(xraw.slice(0, 50000))) swBad","swiftXcNlFar"],
  ["Swift 設定（放寬）：/* 從 i+4 找","src.indexOf(\"*/\", i + 2)","src.indexOf(\"*/\", i + 4)","swiftCommentI3"],
  ["Swift 設定（放寬）：#222 B1 同一項目掛兩個群組不判錯", "if (seen.has(c)) swBad.push(\"同一個項目 \" + c + \" 掛在兩個群組底下\"); ", "", "swiftTwoParentsFirst"],
  ["Swift 設定（放寬）：#222 B1 seen 沒記", "; seen.add(c) }", "; void c }", "swiftTwoParentsFirst"],
  ["Swift 設定（放寬）：#222 B2 參照解到資料夾不擋", "if (!fs.statSync(f).isFile()) { swBad.push(path.relative(HERE, f) + \" 不是一般檔案\"); continue }", "", "swiftRefDir"],
  ["Swift 設定（放寬）：#222 B3 pbxproj 特殊空白不擋", "if (LOCK_WS.test(raw)) swBad.push(\"pbxproj 有特殊空白（U+00A0、U+3000 這類）\");", "", "swiftWsPbx"],
  ["Swift 設定（放寬）：#222 B3 xcconfig 特殊空白不擋", "if (LOCK_WS.test(xraw)) swBad.push(path.relative(HERE, f) + \" 有特殊空白（U+00A0、U+3000 這類）\");", "", "swiftWsXc"],
  ["Swift 設定（放寬）：#222 B3 LOCK_WS 漏 U+2000～U+200A", "\\u2000-\\u200A", "", "swiftWsPbx2"],
];
/* 沒辦法單獨測的子條件：跟別條重疊、或在程式碼裡出不來。原文還在就好（拿掉也不會讓金絲雀判失靈，原因寫在第四欄） */
const REDUNDANT = [
  ["鎖住四段：verifyNow 只宣告一次","[\"verifyNow\", /\\bfunc\\s+verifyNow\\b/g], ","","establish 那條已經要求整份只有一個 func verifyNow，一定先紅"],
  ["一次性考題：takeAnswer 簽名","&& /func takeAnswer\\(for c: String\\)/.test(srvCode), \"有一次性考題",", \"有一次性考題","跟「考題查過就作廢」用同一個簽名找函式本體，改簽名兩條一起紅"],
  ["establish：establishNow 裡不能宣告 verifyNow","&& !/\\bfunc\\s+verifyNow\\b/.test(est) && ","&& ","任何宣告都多一個 verifyNow 字，先被「verifyNow 字數＝if 區塊數」抓到"],
  ["viewDidLoad：找得到","check(vdl !== null && !vdl.includes(\"super.viewDidLoad\")","check(!(vdl||\"\").includes(\"super.viewDidLoad\")","找不到 viewDidLoad 時「viewDidLoad 先開伺服器＋驗證」也會紅"],
  ["外掛方法：有登記","check(listed.length > 0 && listed.every(n => funcs.includes(n))","check(listed.every(n => funcs.includes(n))","兩支外掛的方法 07gc-native.js 都有呼叫，沒登記會先被「07gc 呼叫的方法外掛都有」抓到"],
  ["外掛網路：http","check(!/URLSession|URLRequest|https?:\\/\\//.test(c), p.file","check(!/URLSession|URLRequest/.test(c), p.file","swiftCode 把字串換成空白、// 又是註解開頭，https:// 在程式碼裡出不來"],
  ["小工具網路：http","check(!/URLSession|URLRequest|https?:\\/\\//.test(wc)","check(!/URLSession|URLRequest/.test(wc)","同上，https:// 在程式碼裡出不來"],
  ["註冊：capacitorDidLoad 存在","check(dl >= 0 && /super\\.capacitorDidLoad","check(/super\\.capacitorDidLoad","找不到 capacitorDidLoad 時，下面兩條也讀不到內容一起紅"],
  ["語音方法：都有登記","check([\"speak\", \"stop\", \"isAvailable\"].every(n => listed.includes(n) && funcs.includes(n))","check([\"speak\", \"stop\", \"isAvailable\"].every(n => funcs.includes(n))","沒登記但有 func，「func 都有登記」一定先紅"],
  ["語音網路：http","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest|https?:\\/\\//","/requestRecordPermission|AVCaptureDevice|requestAuthorization|URLSession|URLRequest/","同上，https:// 在程式碼裡出不來"],
  ["Swift 設定：特殊字元 \\r","const LOCK_NL = /[\\r\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","const LOCK_NL = /[\\u2028\\u2029\\u0085\\u000B\\u000C\\uFEFF\\u200B-\\u200F\\u2060-\\u2064\\u00AD\\u0000-\\u0008\\u000E-\\u001F\\u007F\\u202A-\\u202E\\u2066-\\u206F]/;","rd() 讀檔時先把 \\r 換成 \\n，LOCK_NL 永遠比對不到 \\r（留著是雙保險）"],
  ["Swift 設定：pbxproj 語法 字串沒有收尾","if (i >= src.length) fail(\"字串沒有收尾\");","if (i >= src.length) return s;","字串沒收尾時後面一定少了 ; 或結尾多了東西，照樣被擋"],
  ["Swift 設定：pbxproj 看不懂推 swBad","catch (e) { swBad.push(\"pbxproj 看不懂：\" + e.message) }","catch (e) { }","看不懂時 P 是 null、svN 是 0，最後的 check 照樣紅（這行只讓訊息好讀）"],
  ["Swift 設定：找不到 pbxproj","if (!fs.existsSync(pbxSV)) swBad.push(\"找不到 pbxproj\");","if (!fs.existsSync(pbxSV)) void 0;","沒有 pbxproj 時 P 是 null、svN 是 0，最後的 check 照樣紅"],
  ["Swift 設定：群組 parent 對照表","for (const c of o.children) parent[c] = id;","for (const c of o.children) void c;","拿掉後 <group> 參照都找不到上層，只會判得更嚴"],
  ["Swift 設定：SWIFT_VERSION 計數","if (k === \"SWIFT_VERSION\") svN++;","","拿掉後 svN 永遠 0，最後的 check 永遠紅，只會判得更嚴"],
  ["Swift 設定：取 rootObject 時的 isa 判斷","&& O[P.rootObject].isa === \"PBXProject\") ?",") ?","下一行 proj.isa !== \"PBXProject\" 一定會擋（不是 PBXProject 就判失敗）"],
  ["Swift 設定：SW_OK 的 bare-slash-regex 只收 NO","SWIFT_ENABLE_BARE_SLASH_REGEX: [\"NO\"] };","SWIFT_ENABLE_BARE_SLASH_REGEX: [\"NO\", \"YES\"] };","放進 YES 時「每組都要明寫 NO」那條一定會擋"],
  ["Swift 設定（放寬）：ws // 註解吃到 2028","while (i < src.length && src[i] !== \"\\n\") i++; continue }","while (i < src.length && src[i] !== \"\\n\" && src[i] !== \"\\u2028\") i++; continue }","U+2028 在 pbxproj 裡整份先被 LOCK_NL 拒絕，註解停在哪裡不影響結果"],
  ["Swift 設定（放寬）：xcconfig 註解豁免整條拿掉（全部不豁免）","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^\\s*CAPACITOR","拿掉豁免只會把 // 註解行也判錯，只會更嚴"],
  ["Swift 設定（放寬）：ws \\s → [ \\t\\n]","while (i < src.length && /\\s/.test(src[i])) i++;","while (i < src.length && /[ \\t\\n]/.test(src[i])) i++;","少認幾種空白只會讓多出來的字元被當成看不懂而判錯，只會更嚴（\\r、U+000B、U+000C 本來就被 LOCK_NL 拒絕）"],
  ["Swift 設定（放寬）：ws /* 找最後一個 */","const e = src.indexOf(\"*/\", i + 2);","const e = src.lastIndexOf(\"*/\");","乾淨的副本就判失敗（金絲雀回 2，實跑），只會更嚴"],
  ["Swift 設定（放寬）：projN 用 /Project/ 判","filter((o) => o.isa === \"PBXProject\").length","filter((o) => /^PBXProject$/.test(o.isa)).length","isa 寫成陣列時正規式會把它也算進去，PBXProject 只會算得更多，projN !== 1 只會更嚴"],
  ["Swift 設定（放寬）：xcconfig 空行判斷 trim → 長度","if (l.trim() && !/^\\s*\\/\\//","if (l.replace(/[ \\t]/g, \"\") && !/^\\s*\\/\\//","只少認 tab、空白以外的空白字元，這種行改判成錯，只會更嚴"],
  ["Swift 設定（放寬）：xcconfig 空行豁免 trim 拿掉","if (l.trim() && !/^\\s*\\/\\//","if (!/^\\s*\\/\\//","乾淨的副本就判失敗（金絲雀回 2，實跑），只會更嚴"],
  ["Swift 設定（放寬）：物件 Object.create(null) → {}","if (c === \"{\") { i++; const o = Object.create(null);","if (c === \"{\") { i++; const o = {};","改成 {} 只會讓 constructor、__proto__ 這類鍵名被 k in o 當成重複而判錯；其他鍵名結果一樣，只會更嚴"],
  ["Swift 設定（放寬）：dirOf path 不是字串時照用","typeof o.path === \"string\" ? o.path : \"\"","String(o.path || \"\")","可以單獨測，但不構成繞過：原版 path 寫成陣列時算出資料夾、讀檔當掉（實跑：EISDIR、結束代碼 1，不印 ✘ 那一行，所以做不成會被抓到的壞樣本）；放寬後讀到真正的檔、內容照樣逐行檢查（實跑：指到壞旗標照樣紅）"],
  ["Swift 設定（放寬）：bare NO 只要不是 YES","(o.buildSettings || {}).SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\"","/^YES$/i.test((o.buildSettings || {}).SWIFT_ENABLE_BARE_SLASH_REGEX || \"YES\") === true && false || ((o.buildSettings || {}).SWIFT_ENABLE_BARE_SLASH_REGEX || \"YES\") === \"YES\"","NO 以外的值（例如 yes、XQ）都不在 SW_OK 白名單（只收 NO），一定先被擋"],
  ["Swift 設定（放寬）：xcconfig 空行 trim 後拿掉 // 再判","if (l.trim() && !/^\\s*\\/\\//","if (l.replace(/\\/\\/.*$/, \"\").trim() && !/^\\s*\\/\\//","// 前面只有空白的行本來就被註解豁免，其他行照樣進白名單判斷，結果一樣"],
  ["Swift 設定（放寬）：check svN > 0 → svN","check(svN > 0 && swBad.length === 0,","check(svN !== 0 && swBad.length === 0,","svN 只會加不會減，svN !== 0 跟 svN > 0 等價"],
  ["Swift 設定（放寬）：projN!==1 改 >1","if (projN !== 1 || proj.isa","if (projN > 1 || proj.isa","projN 是 0 時 proj 一定是 {}，proj.isa !== PBXProject 那半條擋（實跑：PBXProject 改名，放寬後照樣紅）"],
  ["Swift 設定（放寬）：字串 \\\" 解成空","else if (e === \"\\\"\" || e === \"\\\\\") s += e;","else if (e === \"\\\"\" || e === \"\\\\\") s += \"\";","乾淨的副本就判失敗（金絲雀回 2，實跑），只會更嚴"],
  ["Swift 設定（放寬）：P.objects 不是物件時","const O = P.objects || {}, parent = {};","const O = (typeof P.objects === \"object\" && P.objects) || {}, parent = {};","objects 不是物件時兩種寫法都找不到 PBXProject 和任何設定，svN 是 0，照樣紅"],
  ["Swift 設定（放寬）：SWIFT 不分大小寫（只更嚴）","if (/SWIFT/.test(k)","if (/swift/i.test(k)","多抓小寫的 swift 鍵名，只會更嚴"],
  ["Swift 設定（放寬）：xcconfig 副檔名不分大小寫（只更嚴）",".filter((f) => f.endsWith(\".xcconfig\"))",".filter((f) => /\\.xcconfig$/i.test(f))","多掃 .XCCONFIG 這類檔，只會更嚴"],
  ["Swift 設定（放寬）：xcconfig 註解 \\s* → [ \\t]*","!/^\\s*\\/\\//.test(l) && !/^\\s*CAPACITOR","!/^[ \\t]*\\/\\//.test(l) && !/^\\s*CAPACITOR","少豁免幾種空白開頭的註解行，只會更嚴"],
  ["Swift 設定（放寬）：xcconfig split 用 /\\r?\\n/","for (const l of xraw.split(\"\\n\"))","for (const l of xraw.split(/\\r?\\n/))","CR 在 xcconfig 裡整份先被 LOCK_NL 拒絕，切法不影響結果"],
  ["Swift 設定（放寬）：看不懂時改成空物件","catch (e) { swBad.push(\"pbxproj 看不懂：\" + e.message) }","catch (e) { P = {} }","P 變成空物件時找不到任何設定，svN 是 0，最後的 check 照樣紅"],
  ["Swift 設定（放寬）：xcconfig split 改 \\n 以外也行","for (const l of xraw.split(\"\\n\"))","for (const l of xraw.split(/[\\n\\u2028]/))","U+2028 在 xcconfig 裡整份先被 LOCK_NL 拒絕，多切一行不影響結果"],
  ["Swift 設定（放寬）：XCBuildConfiguration 用 /Configuration/ 判","if (o.isa !== \"XCBuildConfiguration\") continue;","if (!/^XCBuildConfiguration$/.test(o.isa)) continue;","isa 寫成陣列時正規式會把它也當設定組檢查，只會多查、更嚴"],
  ["Swift 設定（放寬）：bare NO 用 != 比",".SWIFT_ENABLE_BARE_SLASH_REGEX !== \"NO\") swBad",".SWIFT_ENABLE_BARE_SLASH_REGEX != \"NO\") swBad","差別只在值寫成陣列 (NO)；陣列不在 SW_OK 白名單，一定先被擋（實跑：(NO) 放寬後照樣紅）"],
  ["Swift 設定（放寬）：xcconfig 副檔名改 /xcconfig/",".filter((f) => f.endsWith(\".xcconfig\"))",".filter((f) => /\\.xcconfig$/.test(f))","/\\.xcconfig$/ 跟 endsWith(\".xcconfig\") 完全等價"],
  ["Swift 設定（放寬）：M13 dup 改 o[k]!==undefined","if (k in o) fail(","if (o[k] !== undefined) fail(","val() 只會回字串、物件或陣列，不會回 undefined；o 是 Object.create(null)，沒有繼承的鍵，o[k] !== undefined 跟 k in o 等價"],
  ["Swift 設定（放寬）：M7 裸字加 ,","const m = /[A-Za-z0-9_$+/:.-]+/y;","const m = /[A-Za-z0-9_$+/:.,-]+/y;","乾淨的副本就判失敗（金絲雀回 2，實跑），只會更嚴"],
  ["Swift 設定（放寬）：M5 */ 後 i=e+3","i = e + 2; continue","i = e + 3; continue","乾淨的副本就判失敗（金絲雀回 2，實跑），只會更嚴"],
  ["Swift 設定（放寬）：M18 SWIFT_VERSION 計數只在白名單內","if (k === \"SWIFT_VERSION\") svN++;","if (k === \"SWIFT_VERSION\" && v === \"5.0\") svN++;","SWIFT_VERSION 不是 5.0 時本來就被 SW_OK 白名單推進 swBad，差別只在 svN 有沒有加一，最後一樣判紅"],
  ["Swift 設定（放寬）：parent 只記每個群組的第一個 children（#222 B1 後）", "for (const c of o.children) parent[c] = id;", "for (const c of o.children.slice(0, 1)) parent[c] = id;", "#222 B1 先用「同一個項目掛在兩個群組底下」擋掉所有兩個上層的樣本，parent 怎麼記都不再構成繞過；B1 本身由 swiftTwoParentsFirst 和兩條 #222 B1 改壞項測"],
  ["Swift 設定（放寬）：M3 parent 先到先得（#222 B1 後）", "for (const c of o.children) parent[c] = id;", "for (const c of o.children) if (!(c in parent)) parent[c] = id;", "同上：B1 先擋掉兩個上層的樣本；swiftTwoParentsLast、swiftTwoParentsSecond 都由 B1 抓"],
  ["Swift 設定（放寬）：#222 B2 path 不是字串照用", "if (o.path != null && typeof o.path !== \"string\") return null; ", "", "照用的話 path 變成空字串、解到 ios/App 資料夾，下面「不是一般檔案」那層照樣擋（swiftPathArr 照樣被抓）；那層本身由 swiftRefDir 測"],
];
/* #135 審查④：盲測（每條判斷整條改成恆真）只能增加：總條數不能比 BLIND_N 少，而且 BLIND_KINDS 寫死的每一種都要還在盲測裡
   （#148 審查①：只比總數的話，拆掉一條判斷再補一種照抄的壞樣本，總數不變、保護卻少了一條） */
const BLIND_N = 169;   /* 合併後實際 169（135＋#144 新增 13＋#143 新增 21）；只能增加 */
const BLIND_KINDS = ["port", "whoami", "rng", "challenge", "oneTime", "whoamiAnswer", "verifiedElsewhere", "inUse", "eaddrinuse", "acceptLocalOnly", "loopback", "sourceCheck", "leftover", "superVDL", "runCheck", "loadTwice", "phaseGate", "loadUnverified", "runningUnverified", "directLoad", "halfSecond", "alert", "retryDelays", "retryCap", "manualRetry", "bilingual", "guidance", "keepSave", "foreground", "gcPlayerId", "gcLogin", "wdPath", "fgLog", "wdReload", "widgetMain", "widgetURL", "widgetNet", "widgetCtrl", "appGroup", "gcEntitle", "widgetPlist", "regSpeech", "regGuarded", "regOther", "spObjc", "spMethods", "spOrder", "spMain", "spWarm", "spLang", "spAmbient", "spOnce", "spBg", "spNet", "spCtrl", "spInstall", "spCopy", "whoamiTake", "srcCancel", "leftoverRead", "lvpLoad", "vbLoad", "vbRunning", "loadFile", "loadReq", "showRetry", "failedPhase", "zhBusy", "zhGuide", "noDiskCache", "clearIDB", "onBroken", "fgFlag", "installSrv", "gcAuth", "gcPresent", "gcKeep", "gcPid", "gcTeam", "gcName", "gcAlias", "wdBox", "wdData", "widgetBundle", "widgetOpen", "widgetReq", "groupMissing", "groupExtra", "regSuper", "regLoop", "regInit", "regThird", "spClass", "spIdent", "spJs", "spNoFunc", "spExtraFunc", "spQueue", "spLate", "spSpeakU", "spMainSync", "spMainAsync", "spMainActor", "spWarmZh", "spWarmCode", "spVoice", "spEn", "spSilent", "spAppSession", "spCatLate", "spBgNote", "spRec", "spCam", "spAuth", "spReq", "spInstFiles", "spInstConcat", "spInstFilter", "spPkgList", "spPkgDup", "regPlugin", "groupMissWD", "groupMissWidget", "groupMissApp", "groupExtraWD", "groupExtraWidget", "groupExtraWidgetEnt", "vbMissing", "halfAfter", "capVDL", "capLoadWV", "pkgGc", "pkgWd", "pkgGcDup", "install"];
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
  /* W69 β（#144 依序合併第 1 步，#148）：寫死的清單「只能增加」。完全相等會讓 guard-base 結構性紅燈：它把這支換回 main 版、canary-native.js 用 PR 版，
     任何新增壞樣本的 PR 換回後都對不上（#144 第八輪 guard-base 實際發生）。改成：寫死的每一個都要在、順序不變（不能刪、不能改名、不能換位置），新的只能接在後面或插在中間 */
  const kinds = Object.keys(KINDS); let at = -1;
  for (const k of EXPECTED_KINDS) { const j = kinds.indexOf(k); assert.ok(j > at, "壞樣本清單要包含測試裡寫死的每一個、順序不變（#135 審查④；W69 β 改成只能增加）：" + k); at = j }
});

/* W110 第二輪審查（#241）：把註解換成空白（換行留著），字串、反斜線跳脫的字元照舊；給 emitCalls 用，最外層的註解也不算 */
function noComments(src) {
  let o = "", i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") { o += " "; i++ } continue }
    if (c === "/" && src[i + 1] === "*") { const j = src.indexOf("*/", i + 2), e = j < 0 ? src.length : j + 2; o += src.slice(i, e).replace(/[^\n]/g, " "); i = e; continue }
    if (c === '"' || c === "'" || c === "`") { let j = i + 1; while (j < src.length && src[j] !== c && !(c !== "`" && src[j] === "\n")) { if (src[j] === "\\") j++; j++ } o += src.slice(i, j + 1); i = j + 1; continue }
    if (c === "\\") { o += src.slice(i, i + 2); i += 2; continue }
    o += c; i++;
  }
  return o;
}
/* W110 複審（#241）：check-native.js 裡每一個送出錯誤的呼叫（check(、err(、fail(、bad.push(）的參數文字。
   跨行、略過字串與註解裡的括號、反斜線跳脫的字元；註解本身不算，函式定義不算 */
function emitCalls(src) {
  const out = [], re = /(^|[^\w.$])(check|err|fail|bad\.push)\(/g; let m;
  while ((m = re.exec(src))) {
    const st = m.index + m[1].length;
    if (/function\s+$/.test(src.slice(Math.max(0, st - 12), st))) continue;
    let i = m.index + m[0].length, d = 1, s = "";
    while (i < src.length && d > 0) {
      const c = src[i];
      if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue }
      if (c === "/" && src[i + 1] === "*") { const j = src.indexOf("*/", i + 2); i = j < 0 ? src.length : j + 2; continue }
      if (c === '"' || c === "'" || c === "`") { let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === "\\") j++; j++ } s += src.slice(i, j + 1); i = j + 1; continue }
      if (c === "\\") { s += src.slice(i, i + 2); i += 2; continue }
      if (c === "(") d++; else if (c === ")") d--;
      s += c; i++;
    }
    out.push(s); re.lastIndex = i;
  }
  return out;
}
test("每個壞樣本的 expect 寫死、只能增加，而且都還在 check-native.js 裡（W110，#157）", () => {
  for (const [k, e] of Object.entries(EXPECTS)) {
    assert.ok(KINDS[k], "寫死 expect 的壞樣本不見了（W110）：" + k);
    assert.equal(KINDS[k].expect, e, "壞樣本的 expect 改了：等於換一條判斷去抓它，原本那條被刪掉也不會紅（W110，#157）：" + k);
  }
  /* 只看送出錯誤的呼叫（註解、其他字串不算）：每句 expect 都要出現在某個呼叫裡；
     同一個呼叫不能含兩句不同的 expect（#241 審查：把埠號那條的訊息也寫進「系統亂數」那句，再刪掉系統亂數那條，原本照樣綠）。
     一句是另一句的一部分（例如「XQSpeech：語言」和「XQSpeech：語言 zh-TW」）不算兩句 */
  const calls = emitCalls(noComments(fs.readFileSync(CHECK, "utf8"))), lit = (s) => JSON.stringify(s).slice(1, -1);
  const all = [...new Set(Object.values(EXPECTS))];
  for (const e of all) {
    if (COMPOSED_EXPECTS.includes(e)) continue;
    assert.ok(calls.some((c) => c.includes(lit(e))), "expect 的訊息不在 check-native.js 任何送出錯誤的呼叫裡：對應的判斷被刪掉或訊息改了（W110，#157）：" + e);
  }
  const shared = (a, b) => SHARED_EXPECTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  for (const c of calls) {
    const hit = all.filter((e) => c.includes(lit(e))), own = hit.filter((e) => !hit.some((x) => x !== e && x.includes(e)));
    for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++)
      assert.ok(shared(own[i], own[j]), "同一個送出錯誤的呼叫含兩句不同的 expect：一條判斷頂替了另一條（W110，#241 審查）：" + own[i] + "／" + own[j]);
  }
  /* 第二輪審查（#241）：原始碼看得到的只是字面，訊息可以用字串相加、變數帶出、註解裡放假的 check(…)。
     所以再實際跑一次 check-native.js，看它印出的每一行「✔ 」：同一行不能含兩句不同的 expect（規則跟上面一樣，SHARED_EXPECTS 例外）。
     有些句子只在失敗時才印、或要看環境（例如 node_modules），所以不要求每句都要出現 */
  const run = cp.spawnSync(process.execPath, [CHECK], { encoding: "utf8", maxBuffer: 64e6, timeout: 120000 });
  const okLines = String(run.stdout).split("\n").filter((l) => l.startsWith("✔ "));
  assert.ok(okLines.length > 0, "check-native.js 沒有印出任何 ✔ 行，這項檢查不成立（W110）：" + run.stderr);
  for (const l of okLines) {
    const hit = all.filter((e) => l.includes(e)), own = hit.filter((e) => !hit.some((x) => x !== e && x.includes(e)));
    for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++)
      assert.ok(shared(own[i], own[j]), "check-native.js 實際印出的同一行含兩句不同的 expect：一條判斷頂替了另一條（W110，#241 第二輪審查）：" + own[i] + "／" + own[j]);
  }
  for (const e of COMPOSED_EXPECTS) assert.ok(all.includes(e), "組出來的訊息清單只能列寫死的 expect（W110）：" + e);
  for (const p of SHARED_EXPECTS) for (const e of p) assert.ok(all.includes(e), "同句兩個壞樣本的例外只能列寫死的 expect（W110）：" + e);
});

/* check-native 裡每一條「check(條件, "訊息…")」：找到訊息裡有某個壞樣本 expect 的那一行，把條件改成恆真 */
function blindLine(src, expect) {
  const lines = src.split("\n"), hits = lines.map((l, i) => [l, i]).filter(([l]) => /^\s*check\(/.test(l) && l.includes(JSON.stringify(expect).slice(1, -1)));
  return hits.map(([, i]) => i);
}
test("check-native.js 每一條判斷改成恆真，對應的壞樣本都要回 4（檢查失靈），不會被當成通過", () => {
  const { canary, check } = repoCopy(), orig = fs.readFileSync(check, "utf8");
  let tried = 0; const blinded = new Set();
  for (const [k, K] of Object.entries(KINDS)) {
    const idx = blindLine(orig, K.expect);
    if (!idx.length) continue;   /* 訊息是組出來的（兩份相同、沒有收尾、某檔沒有控制字元）：下一項另外測 */
    const lines = orig.split("\n"); for (const i of idx) lines[i] = lines[i].replace(/^(\s*)check\(/, "$1check(true || ");
    fs.writeFileSync(check, lines.join("\n"));
    const r = runCanary(canary, ["--only", k]);
    assert.equal(r.status, 4, k + "（" + K.expect + "）改成恆真後金絲雀要回 4：" + r.stdout + r.stderr);
    assert.match(r.stdout, /check-native 本身失靈/);
    tried++; blinded.add(k);
  }
  fs.writeFileSync(check, orig);
  console.log("盲測：" + tried + " 條判斷改成恆真，都判出失靈");
  for (const k of BLIND_KINDS) assert.ok(blinded.has(k), "寫死要盲測的壞樣本沒有被盲測到（對應的判斷被拆掉或訊息改了；#148 審查①）：" + k);
  assert.ok(tried >= BLIND_N, "盲測的條數不能比寫死的少（#135 審查④；W69 β：新增壞樣本會讓條數變多，只能增加）：" + tried + " < " + BLIND_N);
});

test("子條件改壞清單：每一條只拿掉一個子條件或一個字，指定的壞樣本要回 4；重疊清單的原文還在（#135 審查①②③）", () => {
  const { canary, check } = repoCopy(), orig = fs.readFileSync(check, "utf8");
  assert.equal(MUT.length, 389); assert.equal(REDUNDANT.length, 49);
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
    /* #204 複審：Swift 設定鎖的訊息分兩行，blindLine 找不到，盲測沒涵蓋；整條改成恆真要被抓到 */
    ["swiftVer6", "check(svN > 0 && swBad.length === 0,", "check(true,"],
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

test("check-native 的 swiftCode 斷詞：keep 模式照 Swift 規則認原始字串、多行字串、內插、巢狀註解（#143 審查：自寫的 stripComments 被 #\"\\\"# 騙過）", () => {
  const src = fs.readFileSync(CHECK, "utf8"), a = src.indexOf("function swiftCode("), b = src.indexOf("\n/* 取出 code 裡");
  const bad = [], swiftCode = new Function("bad", src.slice(a, b) + "\nreturn swiftCode;")(bad);
  const K = (s) => swiftCode(s, "t.swift", true).replace(/\s+/g, " ").trim(), C = (s) => swiftCode(s, "t.swift").replace(/\s+/g, " ").trim();
  /* 審查者的 B：#"\"# 是一個完整的原始字串（內容是一個反斜線），後面的 "//" 是字串，不是註解 */
  assert.equal(K('let a = #"\\"#; let b = "//"; func f() { return 1 }'), 'let a = #"\\"#; let b = "//"; func f() { return 1 }');
  assert.equal(C('let a = #"\\"#; let b = "//"; func f() { return 1 }'), 'let a = ""; let b = ""; func f() { return 1 }');
  /* # 數要配對：##"…"# 不收尾，##"…"## 才收 */
  assert.equal(K('let a = ##"x "# y"##; g()'), 'let a = ##"x "# y"##; g()');
  /* 多行字串（含 #""" … """#）和 \( ) 內插 */
  assert.equal(K('let a = """\nhi \\(n + 1) "x"\n"""; h()'), 'let a = """ hi \\(n + 1) "x" """; h()');
  assert.equal(K('let a = #"""\nq """ \\#(m)\n"""#; k()'), 'let a = #""" q """ \\#(m) """#; k()');
  assert.equal(C('let a = "x \\(f(1)) y"'), 'let a = "(f(1))"');
  /* 巢狀區塊註解、行註解都拿掉；註解裡的引號不影響 */
  assert.equal(K('a /* b /* " */ c */ d // "e\nz'), "a d z");
  /* #144 審查：9 個以上 # 的原始字串（原本只往後看 8 個字元）、擴充正規式 #/…/#（裡面的引號、// 不是字串、不是註解）、多行字串裡的 //、一般跳脫 */
  const h9 = "#".repeat(9);
  assert.equal(C("let a = " + h9 + '"x "' + "#".repeat(8) + ' y // z"' + h9 + "; g()"), 'let a = ""; g()');   /* #144 第二輪審查③：K 模式原樣輸出分不出對錯，改用 C 模式 */
  assert.equal(C('if #available(iOS 16.0, *) { _ = #/x"//# }; f()'), 'if #available(iOS 16.0, *) { _ = "" }; f()');
  assert.equal(K('_ = ##/a/# "b"/##; f()'), '_ = ##/a/# "b"/##; f()');
  assert.equal(K('let a = """\n// 不是註解 /* 也不是\n"""; f()'), 'let a = """ // 不是註解 /* 也不是 """; f()');
  assert.equal(K('let a = "a\\"b\\\\"; f() // x'), 'let a = "a\\"b\\\\"; f()');
  /* #144 複審：反引號識別字裡的 "、//、/*、#endif 都不是字串、註解、條件編譯；`名字` 跟 名字 同一個識別字 */
  assert.equal(K('let `xa"` = 0; let xs = "//"; func f() { return 1 }'), 'let _rawid_ = 0; let xs = "//"; func f() { return 1 }');
  assert.equal(C('let `xw//` = 0; func f() { return 1 }'), "let _rawid_ = 0; func f() { return 1 }");
  assert.equal(C('let `xb/*` = 0; g() /* c */ h()'), "let _rawid_ = 0; g() h()");
  assert.equal(C('#if false\nlet `xz #endif` = 0\nf()\n#endif'), "#if false let _rawid_ = 0 f() #endif");
  assert.equal(C('private func `verifyNow`(timeout: T) -> Bool { true }'), "private func verifyNow(timeout: T) -> Bool { true }");
  assert.equal(C('let a = `false`; let b = `x`'), "let a = _rawid_; let b = x");   /* #144 第二輪審查②：關鍵字不還原 */
  assert.deepEqual(bad, [], "keep 模式不回報錯誤");
});

test("#135 審查的不擋項：CRLF 副本照樣做得出壞樣本、check-native 卡住判 2、不認得的參數回 2、收據記 main 的工具雜湊", () => {
  const { R, canary, check } = repoCopy();
  /* CRLF：兩份伺服器程式換成 CRLF（像 Windows autocrlf 取出的），原本做不出來的 establishGuard、establishCase、inUse 要照樣抓到 */
  for (const d of ["native/ios", "ios/App/App"]) { const f = path.join(R, "source", "xiangqi-ios", ...d.split("/"), "XQLoopbackServer.swift"); fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/\r?\n/g, "\r\n")) }
  let r = runCanary(canary, ["--only", "establishGuard,establishCase,inUse"]);
  assert.equal(r.status, 0, "CRLF 副本：" + r.stdout + r.stderr);
  /* 不認得的參數：不是 -- 開頭、也不是 --only／--out 的值 */
  r = runCanary(canary, ["--only", "port", "多的"]); assert.equal(r.status, 2); assert.match(r.stderr, /不認得的參數 多的/);
  /* 收據記 origin/main 上的工具雜湊和提交（拿不到就是 null，但欄位要在） */
  const out = path.join(tmp("xq-cnout2-"), "r.json"); r = runCanary(CANARY, ["--only", "port", "--out", out]); assert.equal(r.status, 0, r.stdout + r.stderr);
  const rc = JSON.parse(fs.readFileSync(out, "utf8")); assert.ok("mainToolPins" in rc && "mainCommit" in rc); assert.deepEqual(Object.keys(rc.mainToolPins).sort(), ["source/xiangqi-ios/scripts/canary-native.js", "source/xiangqi-ios/scripts/check-native.js"]);
  /* check-native 卡住：副本的 check-native 開頭插一個無窮迴圈，時限縮成 2 秒，要判測試不成立（2）而且寫明卡住 */
  fs.writeFileSync(check, fs.readFileSync(check, "utf8").replace('"use strict";', '"use strict"; for (;;) {}'));
  const t0 = Date.now(); r = cp.spawnSync(process.execPath, [canary, "--only", "port"], { encoding: "utf8", env: { ...process.env, XQ_CANARY_SUB_MS: "2000" } });
  assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stderr, /卡住/); assert.ok(Date.now() - t0 < 60000, "時限要生效");
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
