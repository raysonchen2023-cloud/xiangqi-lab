// iOS 原生檢查金絲雀 canary-native.js 的自我測試（AGENTS.md「P0 出口驗證要難作假」，2026-11-23）
//   乾淨的副本要全過、每個壞樣本都要被抓到；再把 check-native.js 的判斷一條一條改成恆真（放在整份副本裡），對應的壞樣本要回 4（檢查失靈）。
// 用法：node --test source/xiangqi-ios/scripts/test-canary-native.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const HERE = __dirname, IOS = path.join(HERE, ".."), REPO = path.join(IOS, "..", "..");
const CHECK = path.join(HERE, "check-native.js"), CANARY = path.join(HERE, "canary-native.js");
let KINDS, exitOf, toolSha, run;   /* #262 第七輪：先跑完下面的 PRE（完整性檢查）才載入 canary-native.js */
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
/* W187（#241 第三輪審查的繞法 F）：壞樣本「怎麼改壞」也寫死，只能增加。
   原本只寫死名稱（EXPECTED_KINDS）和要被哪條判斷抓到（EXPECTS），把 rng 的改法順便改壞埠號、再把系統亂數那條的條件換成檢查埠號，全套照樣綠。
   第一版只寫死輔助函式和 KINDS；#262 審查（iMac Claude 1）找到 run() 裡偷改、再宣告一次、KINDS 結尾展開、新輔助偷改、KINDS 後面指派、開頭加敘述 6 種繞法，
   改成寫死整支 canary-native.js：去掉註解、空白壓成一格後，每個頂層敘述、KINDS 裡每個壞樣本、KINDS 的頭尾各算一段，取 SHA-256 前 16 碼。
   寫死的每一段都要還在、雜湊一樣。#262 第五輪起程式碼不准新增任何一段（前幾輪用語法白名單限制新程式，每輪都找到新繞法），
   新壞樣本改成加在 canary-native-kinds.json：純資料，只有 name／files／find／replace／expect，由 canary-native.js 裡寫死的 dataKind() 套用 */
const BREAK_SEGS = {"stmt:#!/usr/bin/env node":"4949218de757741f","stmt:\"use strict\";":"5ecf2f4d83e6260d","top:fs":"29fe21284bfce3fd","top:IOS":"cde1d44428047e4b","top:CHECK":"2e5a307164b6f687","top:sha256":"8e252a7f1aeb5da4","top:toolSha":"2118d8d212523d2f","top:WEBFILES":"0735755dda2931a0","top:edit":"6d170fe0b05a7d7f","top:editRepo":"fc0ea094b4a2d1ce","top:both":"d698743de634baf9","top:rep":"965930c84cc0b59a","top:repLast":"8b8d408dac931fb9","top:repAll":"8b36633650cfda08","top:inFunc":"ee2e3559ca1c816d","top:repIn":"21d22cd14a28d788","top:beforeEnd":"aa2f947ce7a56ee8","top:SRV":"8c6f433f3ddfcd41","top:GCWEB":"7f3651089be32eef","top:iosp":"0262ca64a59343c4","top:capFake":"cb75c2a7fd6f27d7","top:gcInstalled":"ead4c46e38056a8e","top:PBXF":"4c04ff9b25cfd02b","top:pbxAdd":"89b6a8bb3fd3d637","top:xcAdd":"17ee9a7167460434","top:xcCap":"5489d3a279637f7c","top:xcHidden":"da55654b8a1fd289","top:xcRefTo":"6852dabcec224566","top:grpRef":"dd146bcc17c8b39d","top:grpOne":"0530a71aa031740a","top:grpTwo":"00c6b952f9123cbf","top:xcPut":"b8229b3d1ad7e502","top:rep2":"c43631924e139591","kind:copyDiff":"9cd7b9ecbac4bc69","kind:port":"57b1756f9233c7c3","kind:whoami":"6f03e2233076d686","kind:rng":"6ec24a429c94bea3","kind:challenge":"af0c1300e64af950","kind:oneTime":"b4ffd92a4a70aa1d","kind:whoamiAnswer":"33e286ff61d9a079","kind:establish":"8e6a4650345fff98","kind:establishIf":"4bbd3c61d0609b0d","kind:establishElse":"7e48751c208695a1","kind:establishGuard":"1092474096533485","kind:establishCase":"533252485aae2b1a","kind:establishLocalFunc":"1efea2f9b4e8e196","kind:establishHelper":"2da9208cc5914c34","kind:verifiedElsewhere":"e43f023cd293eb85","kind:inUse":"f9e96a8fd18fb6df","kind:eaddrinuse":"a03067f9cad97414","kind:acceptLocalOnly":"2a3346f5b406503b","kind:loopback":"9c1bcae342a04b41","kind:sourceCheck":"2ae98fafd9290992","kind:leftover":"3f309e1cedec1a63","kind:superVDL":"0bccf89183ca07e5","kind:runCheck":"4bbdca1423ed44b3","kind:loadTwice":"0b1f586f324de583","kind:phaseGate":"e6eee2bb7172326a","kind:loadUnverified":"a21a858051c14eb1","kind:runningUnverified":"9eee941d409a3416","kind:directLoad":"7c0ee89d320dcfda","kind:halfSecond":"56715105995d1024","kind:alert":"d5184a0f815edcbe","kind:retryDelays":"e9fef4e99c196515","kind:retryCap":"f037a36034bd9afc","kind:manualRetry":"d656fbf996c4e8e0","kind:bilingual":"1b01858fef94dd28","kind:guidance":"0c9e2dbbcb4aed9a","kind:keepSave":"6594338db4fe453a","kind:foreground":"3cfb63252783b671","kind:brace":"e85bf68596a3050c","kind:ctrl":"0f4591d196d8614e","kind:gcNetwork":"c016ae4246d413de","kind:gcPlayerId":"f052cc2f90e29365","kind:gcLogin":"87fd331dd95292c6","kind:wdPath":"76a57aab63503905","kind:fgLog":"e64f8760a8906d16","kind:gcObjc":"e45225d3ccada189","kind:gcJsName":"cc25e6f376bdecad","kind:gcMethods":"6109c12b35940bfe","kind:gcWebCall":"c61d561b7dda2dcb","kind:wdReload":"af1a14b14cc0379f","kind:widgetMain":"1a254351674a375b","kind:widgetURL":"b9642f01f87214c8","kind:widgetNet":"afbc795f8f0ad2dc","kind:widgetCtrl":"8c73c4cd2f84e800","kind:widgetFile":"ca179b9b451181a4","kind:appGroup":"d0017a56ca271acc","kind:gcEntitle":"3d141ee5128e5226","kind:widgetPlist":"d445a10c3e0a1457","kind:webScheme":"4cbb749c82709d4d","kind:webNet":"effe05f1367e903d","kind:installGc":"a101e72845f54d56","kind:regSpeech":"32d0403b41a9493a","kind:regGuarded":"3d166bc1f64d7fcc","kind:regOther":"5b781b54a3a879a3","kind:spObjc":"4732212b9f749a08","kind:spMethods":"d21f9bf7d8d57b8d","kind:spOrder":"5875e7beeee266a8","kind:spMain":"06ff1c62d45ef97b","kind:spWarm":"dfc507c27bf254f5","kind:spLang":"cf8c32b521ef242f","kind:spAmbient":"0cb7d6c6b7ea59c3","kind:spOnce":"cd08a233a0e162d6","kind:spBg":"b97300a4d957362e","kind:spNet":"34caadb3666cffd0","kind:spCtrl":"73804242950d7d41","kind:spInstall":"53a992097e6e73fe","kind:spCopy":"9a55b623d80ad35d","kind:board":"f0c06aa881de7537","kind:whoamiTake":"ce009ee8b0b7fc8a","kind:estOneBlock":"5343203410a51435","kind:estTickFunc":"b58b0fdc7c76a2cf","kind:estCallAs":"16a1d29749459db0","kind:vnRawTriple":"e53f395ad60537cc","kind:vnTickFalse":"51955de5573f932e","kind:oddTriple":"f327114ce2bf9e9d","kind:oddTick":"fe436910ee1949b4","kind:oddRegex":"a90422c5bfb15efe","kind:oddRaw":"d7caa5464af5af8c","kind:oddSubdir":"f5b54dfaa1164734","kind:oddCommentClose":"142fc55f06dfe65a","kind:odd2028":"94ed8b172867e847","kind:odd2029":"8584e33f90637714","kind:odd0085":"ff58eb367dbf32b8","kind:oddTrailComment":"23bc631e0571b886","kind:oddVc":"a3b291c9e1f94bb3","kind:swiftVer6":"392b9d8c2f90e6be","kind:swiftBareRx":"0b8be3b0f2307008","kind:swiftXcconfig":"da8333dd14e60898","kind:swiftUpcoming":"f87d463fef399ded","kind:swiftInclude":"cc34c37fe4700998","kind:swiftOtherFlags":"8ce1fbf44aeb797d","kind:swiftFileFlags":"503823649c6af713","kind:swiftVerComment":"f3858f1812341282","kind:swiftMultiLine":"4cd3ea2eb910aa70","kind:swiftVerGone":"58e50f6082c034b7","kind:swiftXcMissing":"39ac7864d719a517","kind:swiftXcElsewhere":"4b36c65feb6037b5","kind:swiftQuotedComment":"80a581dc366e2c27","kind:swiftXcGroup":"445653ff5f19561a","kind:swiftCfgAnchor":"feecddb5f48931d6","kind:swiftArrayFlags":"ff62083a7731f177","kind:swiftCondKey":"918be1395d7287c4","kind:swiftProjDir":"3ca4a9b57f61a2c8","kind:swiftUnparsable":"0943bbed5dd86282","kind:swiftNl2028":"d972e97a4d23e5fb","kind:swiftXcNl2028":"99b6a24f79c6e3d4","kind:swiftSrcRootRef":"bb1014965ed94488","kind:swiftTwoProj":"f77f07c96a087917","kind:swiftBareGone":"fafb2ef67eed7f6b","kind:swiftBareOneGone":"09de293d020f3d4b","kind:swiftBareYes":"9feab2306ce45880","kind:swiftLk2029":"c5c4622ddb388ea7","kind:swiftLk0085":"d938ea4a8a316542","kind:swiftLk000B":"40935241cf61504c","kind:swiftLk000C":"94de0d4e6a981350","kind:swiftLkFEFF":"c187fb032d002714","kind:swiftLk200B":"3d86ef389510a016","kind:swiftLk2060":"08f5e98fd4eb51c5","kind:swiftLk00AD":"b9311f75482ad610","kind:swiftLk0001":"5df1208383bc6d4b","kind:swiftLk001E":"79d0e532e64a5244","kind:swiftLk007F":"848f5d8ca74de8e4","kind:swiftLk202E":"de25786cbc173b0a","kind:swiftLk2066":"6b96113de1514a37","kind:swiftPbxComment":"cffdaf40f165e548","kind:swiftPbxKeyNotStr":"60249ee030de6fdc","kind:swiftPbxNoEq":"dcb3f11343eb45c6","kind:swiftPbxNoSemi":"a862ca6c96931a61","kind:swiftPbxDupKey":"c310f97fe86574be","kind:swiftPbxArrComma":"f48a00fbfe0a4ed1","kind:swiftPbxBadChar":"03777e169dac639c","kind:swiftPbxTrailing":"83843ae479895f6d","kind:swiftProjExtra":"5a91c7b2ac8fa12a","kind:swiftRootMainGroup":"1ada75ac305e3b6b","kind:swiftProjRoot":"9747ea09de8c47d8","kind:swiftGroupLoop":"f38dc9ccad8543a5","kind:swiftBuiltProducts":"9f5454d2a9e8ada5","kind:swiftOrphanGroup":"63b58f86e6e256c6","kind:swiftNameDollar":"d29a78c2c27a616f","kind:swiftXcIos":"e3f795637886f839","kind:swiftXcApp":"9ceb83f19d46b56c","kind:swiftXcAppApp":"28e15b571a69f807","kind:swiftXcTrailCmt":"af4ab81e0d9828bd","kind:swiftXcCapVal":"90db610f3dafe511","kind:swiftLk0000":"8cbec306cb41aa48","kind:swiftLk0008":"09243136c7f36002","kind:swiftLk000E":"d8b36afcebcc1cce","kind:swiftLk001F":"79f8ae9cb2b23e27","kind:swiftLk200F":"1c2c92174f92dfa4","kind:swiftLk2064":"f72ffb7783ca8d5a","kind:swiftLk202A":"241366962dddf0fb","kind:swiftLk206F":"f9b6b9a5a0841432","kind:swiftXcCapTail":"cf2a21d89facb846","kind:swiftXcCapSuffix":"0300febe28871195","kind:swiftRootArray":"68fd245eaaed4b66","kind:swiftDupNoYes":"13a8c738f0c24724","kind:swiftIncHidden":"790cee27d45fc6c7","kind:swiftXcSlash":"39d3137b4d46f408","kind:swiftXcUpcoming":"f43df115497c09e5","kind:swiftXcCapKey":"78958727d0e0fc9a","kind:swiftXcCapMid":"1089397340554f78","kind:swiftXcCapEmpty":"a847e7309f781c0b","kind:swiftXcCapNoEq":"f24be365917360a6","kind:swiftCondFlags":"fdeab8b1856d760d","kind:swiftCondValue":"e69f71f25cd4b904","kind:swiftModeValue":"19823769f0265063","kind:swiftOptValue":"6d27bfb5fcd7662a","kind:swiftSrcRootBrace":"079a27d327e7488c","kind:swiftEscN":"13bf824782a1d5f7","kind:swiftEscT":"9c2957a8425d585b","kind:swiftCompFlagsCond":"38b79bd6a1dc3ff3","kind:swiftPbxCommentSlash":"4c95d68bd2161b52","kind:swiftPbxAt1":"ab2ff7b7d51eaba3","kind:swiftPbxSlashLine":"f1153971023f3794","kind:swiftPbxLastNoSemi":"2985a42d19f3f4ca","kind:swiftPbxColon":"bb5a2c642aa30e47","kind:swiftPbxSingleQuote":"3be1c3cbebbd3c40","kind:swiftPbxStar":"140fa0fc7fc029f6","kind:swiftPbxEmptyKey":"baf3369e2ab94f66","kind:swiftEscBackslash":"91b6f64f17f9c952","kind:swiftEscNEnd":"e14a43901c09d825","kind:swiftEscTSpace":"18c11c0a118a7717","kind:swiftChildrenStr":"5afd47241269ba6f","kind:swiftProjExtraNoMain":"959152006c0629fa","kind:swiftProjDirArr":"39a658064e52f271","kind:swiftProjRootArr":"ae5754bdf5d934fd","kind:swiftSrcRootBare":"3e92728ec304a6d3","kind:swiftTreeGroupish":"81272fce1db4149e","kind:swiftTreeSdkRoot":"aeaa091b39bcf3ff","kind:swiftMainGroupArr":"c4686588405c0964","kind:swiftCfgNoSettings":"ed0ed76e767b7515","kind:swiftCfgKeyCase":"814115187720cf53","kind:swiftBaseRefArr":"64344463d0ef6bcd","kind:swiftKeySwiftEnd":"0d5cc2de68d47970","kind:swiftKeySwiftMid":"e115a92ed4492c3d","kind:swiftValTrim":"684cb0dc09795f2c","kind:swiftValCase":"81740bfc83022949","kind:swiftValArrFirst":"50aa4ab7ea6f246f","kind:swiftValArrOne":"f93d4d0d0b0c6443","kind:swiftVer5":"1fac2c3a8c0023eb","kind:swiftModeSingle":"319c2a67b22bf313","kind:swiftOptSize":"78fced937b0a2d51","kind:swiftCompFlagsSuffix":"95bba41e401e7ae7","kind:swiftXcIncCmt":"6b1a17af3654a520","kind:swiftIncOptional":"37df350fa3c10391","kind:swiftXcDashCmt":"1066304d53b163d1","kind:swiftXcSemi":"0172a34d31e281b4","kind:swiftXcDebugKey":"9022a7af1cee4773","kind:swiftXcCapDash":"13334981d5839db3","kind:swiftXcCapColon":"10574ed5235a9767","kind:swiftXcCapUpper":"65582bc615797d25","kind:swiftXcCapYes":"d1aee5f2cdb16312","kind:swiftXcCapCmt":"2830fab1fe3389e4","kind:swiftXcCapPre":"adac37699bff895b","kind:swiftCfgAnchorKey":"b05a79a7fe9f807b","kind:swiftGroupDollar":"615fea261a1b74dd","kind:swiftParentTree":"380f5c3c6355be43","kind:swiftTwoParentsLast":"f52ce57044d209a2","kind:swiftTwoParentsFirst":"ac156c2fb6eabd58","kind:swiftRefDir":"5a013ea6517f2679","kind:swiftPathArr":"75b0aaba40fd4d91","kind:swiftWsPbx":"adeae591259a5b01","kind:swiftWsPbx2":"81aaf90a2dca91ba","kind:swiftWsXc":"373bfffcd61790c2","kind:swiftCommentI3":"7871a7a0800c489a","kind:swiftSecondRef":"ea009eb6ea2d7f8d","kind:swiftXcIndentCont":"ad4dbe4549b8c110","kind:swiftXcLongIndent":"e2553d2f9b200e41","kind:swiftFirstRefBad":"769a3e55ef175947","kind:swiftGroupDeep":"1617fb5bd2beaaec","kind:swiftCfgNoName":"94b7768bcf5d44e8","kind:swiftEscBsEmpty":"564df49246d923bf","kind:swiftCompFlagsCfg":"16269cdfa96e0299","kind:swiftProjDirSpace":"17906ce114d7295e","kind:swiftXcDeepLine":"508ad0321e4198d8","kind:swiftPbxCmtSemi":"c5620ae7a1f36089","kind:swiftNlFar":"6682978eef0b53b9","kind:swiftXcNlFar":"9d9994eb80777740","kind:swiftPbxChHash":"0abce6460f4d775c","kind:swiftPbxChBang":"bc520e859868ae6e","kind:swiftPbxChPct":"0b4f7b4185f8ac70","kind:swiftPbxChAmp":"4da1e0b3c509f1ab","kind:swiftPbxChLt":"9bc85b87df73daf8","kind:swiftPbxChGt":"2d903a5cc42fd1f8","kind:swiftPbxChQ":"32afd45b8163c1d7","kind:swiftPbxChTick":"06792ea387f41c6e","kind:swiftPbxChTilde":"f1c9891e343a34fc","kind:swiftPbxChBar":"624dfe78bf7ace01","kind:swiftPbxChCaret":"a085dbbd021d6e31","kind:swiftPbxChApos":"305012b6e6992d0b","kind:swiftPbxChBslash":"003f501b4fb624da","kind:swiftTwoParentsSecond":"55d474553baa6ecc","kind:swiftXcLongLine":"4560a85527dabd41","kind:swiftGroupDollarMid":"573407cba9e66029","kind:swiftParentSdk":"d8034351dc00fb75","kind:estNoReturn":"a3094d2a2933e6be","kind:estElseAfter":"482907982b9cf524","kind:estFuncTwice":"875dcde8e514486c","kind:srcCancel":"a35c3be27498f7fe","kind:leftoverRead":"2e3241263a149c62","kind:lvpLoad":"22e5d1ab6970512b","kind:vbLoad":"5914f28688180e21","kind:vbRunning":"03d054b332ff8e1f","kind:loadFile":"4b03df52347bc609","kind:loadReq":"f6b71867afe6f77a","kind:showRetry":"fdf6116de7b96169","kind:failedPhase":"ede50395ba46696e","kind:zhBusy":"007e06ac957ca71a","kind:zhGuide":"14a9b15b2f36e66f","kind:noDiskCache":"501df7050890b764","kind:clearIDB":"5e87455431eb5f41","kind:onBroken":"f0d4982219081437","kind:fgFlag":"30ffb0fcfc526490","kind:installSrv":"b708ca62bf5517cf","kind:gcClass":"1b1cbfe620c62595","kind:wdIdent":"47785bf5a8e70431","kind:wdListedNoFunc":"a6f111d20dd151b9","kind:wdWebNone":"bcd994b851945b9b","kind:wdReq":"ca6b959b9e837130","kind:wdCtrl":"ebd65d5d040488ec","kind:gcAuth":"ec29ee1283028e47","kind:gcPresent":"0462e9a72cb2e6d4","kind:gcKeep":"8244cd33be2ec069","kind:gcPid":"7f2a18d0addadecf","kind:gcTeam":"f0f405712b139fcc","kind:gcName":"29e7f7e38f9d8689","kind:gcAlias":"426457976cd11422","kind:wdBox":"11f70e73dd010fdb","kind:wdData":"da18984c947ac586","kind:widgetBundle":"b858900504e804b6","kind:widgetOpen":"2bcee20a449b1407","kind:widgetReq":"a58d483c7ddcc46d","kind:widgetJpg":"20625d2a84536d36","kind:wdDataFile":"773e28629f7df8f2","kind:groupMissing":"076180caff3090af","kind:groupExtra":"c68fa2a8f51a83b5","kind:webSchemeRe":"73eb00cee1451efd","kind:webXhr":"f999cfdc77b1eb4b","kind:webBeacon":"8f4a1615eaeb394b","kind:webSocket":"a4afce2ec3b967fd","kind:webXQNet":"e0e72b67097e85c1","kind:webIRT":"c372e87de145ce9b","kind:instGcFile":"c20f910ad0abc962","kind:instWdFile":"3189b263c62e5277","kind:instClasses":"8350906b87c8d534","kind:instScheme":"a44d11e4ef5238e8","kind:regSuper":"0d115f1feb4b2dd6","kind:regLoop":"05ff6bfdca48037c","kind:regInit":"d5a245a2c4e0c0be","kind:regThird":"f8033a8c5db97577","kind:spClass":"84ef1a4b5a9d5ce1","kind:spIdent":"641876503e44e1c7","kind:spJs":"288e11b862d56080","kind:spNoFunc":"ed2a19aeaf7a55e2","kind:spExtraFunc":"c2c886af885c4cce","kind:spQueue":"832a91d736297b0d","kind:spLate":"de74538a30db68aa","kind:spSpeakU":"0ba5092d34d830c5","kind:spMainSync":"2bb9b21b05686fea","kind:spMainAsync":"7bb46cbcb06cad19","kind:spMainActor":"642cbca3c9fc26e0","kind:spWarmZh":"45a897a1e78fcc75","kind:spWarmCode":"15ca03e3a07446cd","kind:spVoice":"6976a46a8a928735","kind:spEn":"99f8eccc7d9f6ba2","kind:spSilent":"38f49a17957a97b0","kind:spAppSession":"99f65a3fbae4554b","kind:spCatLate":"425efe7df8232b75","kind:spBgNote":"7d52bd5e4b42a545","kind:spRec":"15ade9d398c3fe1f","kind:spCam":"abddd84387109adb","kind:spAuth":"4694bbdc0399f2ea","kind:spReq":"ebe35533d134c24d","kind:spInstFiles":"2f031d8ed7cdbdee","kind:spInstConcat":"79d536b1625956c8","kind:spInstFilter":"92ba6a850dd5e053","kind:spPkgList":"e509652707a0e1a1","kind:spPkgDup":"824a948c7c53ca17","kind:boardSpeak":"0def1e97a377ac74","kind:…ctrl":"1f55109f584a5581","kind:estOrTrue":"a06c6b5b0e9ffb64","kind:estOrMid":"14926ad2caae370f","kind:wdObjc":"1c00c3d6f919011c","kind:wdClass":"6d49300f8cf6d976","kind:gcIdent":"aaa4981276652e0e","kind:wdJs":"9459cb169f9dc362","kind:gcCtrl":"88dcf000cae21525","kind:wdNet":"663b0902a005931f","kind:gcReq":"555b7c99cba9472d","kind:ctrlVC":"6794384ef72ac5db","kind:regPlugin":"be0501d0720369c0","kind:groupMissWD":"6ab9940ca5eb4de6","kind:groupMissWidget":"ef53178a04d1a0b1","kind:groupMissApp":"18d852b41b9dda58","kind:groupExtraWD":"6a34b5685ba44481","kind:groupExtraWidget":"d56f5e9881ad8153","kind:groupExtraWidgetEnt":"29a4947336dd2143","kind:braceBad":"c799696d323058ee","kind:strOpen":"821ba697514f91aa","kind:strEOF":"4f7b0a0417190d42","kind:wdJpg":"094970d6e6209136","kind:vbMissing":"e2089e7637c7fdae","kind:halfAfter":"1b82f8cb4afb9361","kind:capVDL":"35f1a3c5db51a2eb","kind:capLoadWV":"519efeacd20dbcb6","kind:capDidLoad":"d03999e132ad5120","kind:capRegInst":"860f7584e11980a8","kind:pbxMissing":"6600f66810b8ab41","kind:pkgGc":"d8f105f0b1ae03ea","kind:pkgWd":"7168e19f4060bcc8","kind:pkgGcDup":"10003b30f44c52db","kind:infoScheme":"b395162fcb86e662","kind:gcCopyDiff":"1ffdec50179e156a","kind:vnRetTrue":"992a31d91a74b528","kind:vnTernary":"53e9ea267005a7fb","kind:vnCmpTrue":"effa64c7a60ee5b1","kind:vnNo200":"1c345e30c6e138f5","kind:vnNoHost":"5ad70c63e7d35fe3","kind:vnDeadResume":"ade8a3d615bf4ad8","kind:vnUrlComment":"73240187eba8cac8","kind:vnFlagGetter":"1de58f800ba25895","kind:vnFixedAnswer":"d27bb4219dc40c1c","kind:vnHexZero":"90308b31af73a405","kind:vnStrDecoy":"c792a1464d0ff0c0","kind:vnIfFalse":"ccf9500e5e56dfb0","kind:vnIfDebug":"f88f5f5fd3db9cae","kind:vnDecoyBefore":"715f3331b1ba69e7","kind:vnDecoyOnly":"fa08b119d98e84f8","kind:vnExtension":"3277e8d77d19655e","kind:vnNestedFlag":"9bd4b83cd6dc20f5","kind:vnTypealias":"2fed5bda6969ec0c","kind:vnDupIssue":"a400d40313e91452","kind:vnDupHex":"ea06197ccde2ac6f","kind:vnSigTwice":"7eeeb8dd321a5446","kind:install":"0b70c0ab7006fb20","frame:KINDS":"cd2c7a613b9b990a","top:DATA_KINDS_FILE":"013805e25b2fe8bd","top:DATA_FIELDS":"4a38c4211157b884","top:dataKind":"90fca0ec9fd576f7","stmt:{ const list = JSON.parse(fs.readFileSync(DATA_KINDS_FILE, \"":"52167db7b2c0e122","top:copyTree":"e14bb8fdf23188a7","top:SUB_MS":"855e4e16af2e88ce","top:fromMain":"36614b7752badbdf","top:exitOf":"59364a70fb960092","top:run":"2f81a737b98f3ecf","stmt:module.exports = { run, KINDS, exitOf, toolSha };":"d1d96edfa5c8b1d6","stmt:if (require.main === module) {":"9a951cb4e1d81b10"};
/* #262 第五輪：整支 canary-native.js 的雜湊（前 16 碼；第六輪起算原檔、只換 LF、含註解）。新壞樣本加在 canary-native-kinds.json 不會動到它 */
/* #262 第六輪：canary-native-kinds.json 已有的每一項（JSON.stringify 後的 SHA-256 前 16 碼）照順序寫死，只准往後加 */
const DATA_LOCK = [];
const CANARY_SHA = "90f2c076c4a01f87";
/* W187 第三版（#262 第二輪審查：寫死文字擋不完，edit 這類名字可以在載入時被換掉）：再加「行為鎖」。
   子行程對每個壞樣本，用系統 cp 複製一份乾淨的專案、實際跑它的 break，再用系統 diff 記下改了、多了、少了哪些檔：原本有的檔只記改掉、加上的那幾行，新建的檔用 shasum 記整份內容，
   每種取一個雜湊寫死在 BREAK_FX，只能增加。不管名字怎麼被換掉，只要改法的實際效果變了就會紅 */
const BREAK_FX = {"copyDiff":"87378182928ac5a1","port":"30c98910adcae6ba","whoami":"cc24c1e18b1ad893","rng":"4b99974df46a8a5d","challenge":"2b4fbe054d8d40ca","oneTime":"6ddf77c12081a35f","whoamiAnswer":"b23da0b3953e31a0","establish":"82a863db5041c586","establishIf":"d3fce304df6a6394","establishElse":"dbd1e0496d57962c","establishGuard":"7405a3e13941ed1c","establishCase":"7405a3e13941ed1c","establishLocalFunc":"7041ecee944fe78c","establishHelper":"422570c125e5b3fd","verifiedElsewhere":"6c093237db833b24","inUse":"929e835ab5e65fb7","eaddrinuse":"0dca4957937ff5b8","acceptLocalOnly":"f8950b8a85a0325a","loopback":"8d6b8c94f8450ab5","sourceCheck":"f6ff65d1cdc68de5","leftover":"3f9d586c91890743","superVDL":"59234ba7dfc28420","runCheck":"0a1074ebe2cd87f2","loadTwice":"1a2e99aede70d9ae","phaseGate":"39b78f4fd194b198","loadUnverified":"f0c5b5d8fd469214","runningUnverified":"ff58532031cd5a97","directLoad":"7872cf69063a39cf","halfSecond":"dddde037ae742900","alert":"fb196ab012c1c5a7","retryDelays":"181d0b3e3e00c469","retryCap":"cfa7907207e126c9","manualRetry":"279d93302cfaa5cb","bilingual":"abe192e8fa9ebfcb","guidance":"d8ebe0b667a87c6b","keepSave":"f66269e512f8c456","foreground":"0c8869df966c5ce6","brace":"aa6ee20c2b84479a","ctrl":"0513794eb4821a71","gcNetwork":"c58412390a999746","gcPlayerId":"beb95d007d857ba7","gcLogin":"c0f8a2fb98df6ca0","wdPath":"eb1db19f6b8c1869","fgLog":"46cc4f61fc189b66","gcObjc":"818a4c6cc1451d70","gcJsName":"5f23b5fa52ab848e","gcMethods":"bb483a114c5ed850","gcWebCall":"f5b587472138daa5","wdReload":"77f852c4c635f555","widgetMain":"62cc269e9e2fb3ba","widgetURL":"eadb50f0b02a6da4","widgetNet":"aaff854e2966c4ed","widgetCtrl":"0cdb261c9ff1dc76","widgetFile":"02ccd35b086dfd99","appGroup":"77d491653e0fe99b","gcEntitle":"356dfdaa3102002b","widgetPlist":"fbb76de492bce83d","webScheme":"611233c3be441a12","webNet":"d0b8a9dcdcaa00fe","installGc":"840bd0c71fa9d1db","regSpeech":"e750c6bff6c161fc","regGuarded":"16c3a476cd5b9054","regOther":"ef8e4b2712404800","spObjc":"ae7cfab0e343ffff","spMethods":"183886bac8310ff0","spOrder":"3cdb93b836e8fbe0","spMain":"546515c804d8a851","spWarm":"0bdd15cfc125a987","spLang":"b019fd588cba00d6","spAmbient":"2e59c0ffa8114b5d","spOnce":"4a22ba92ebfdaa81","spBg":"f3adddb564c9a239","spNet":"c33aa7be4ee25c9a","spCtrl":"7da1fe4d321375ee","spInstall":"0272b669d6f220bf","spCopy":"fa6df91e2580c734","board":"4636baf7a4cecea5","whoamiTake":"2702e90d4dbdabae","estOneBlock":"bfb0b5647e44edf0","estTickFunc":"864111340693f5f4","estCallAs":"f7803850a0d05e10","vnRawTriple":"346bbd19afcc6466","vnTickFalse":"640159139058a0e8","oddTriple":"167ea2b0cefaf702","oddTick":"4e0da050ae0e8c9c","oddRegex":"c2c3da79e5afb6fb","oddRaw":"e8dc21e4363c7830","oddSubdir":"d195bbee0dd41a20","oddCommentClose":"318d4920b5d51522","odd2028":"a8b91490ef2d8565","odd2029":"ef18e6b0410c511f","odd0085":"f23f5ba3ca862c91","oddTrailComment":"c961ebf807d7fbbe","oddVc":"4e3fe2d9f6330da2","swiftVer6":"44659c9aedbc4d05","swiftBareRx":"7d15c5d3cc2bc4d6","swiftXcconfig":"4eb4e8c7c4b98d5d","swiftUpcoming":"19f57334fc556f42","swiftInclude":"1e28b4ab3d86539c","swiftOtherFlags":"32c6ffa9d7321f8d","swiftFileFlags":"d9510c9b7eaa01bc","swiftVerComment":"63a290f5ce3816e5","swiftMultiLine":"308bcc852de3fc7f","swiftVerGone":"e78835013e8de5b6","swiftXcMissing":"f448dc6fddb5f21b","swiftXcElsewhere":"2c6dc7efe6206596","swiftQuotedComment":"0ecb349e6ab34399","swiftXcGroup":"da13958caaf28110","swiftCfgAnchor":"e24d9643c86407e4","swiftArrayFlags":"0d3d45165047878f","swiftCondKey":"bca9bc6e39995e1f","swiftProjDir":"e3057f84c947cbc8","swiftUnparsable":"7e39501cf4dfa2bf","swiftNl2028":"5ea55e7a0e75f918","swiftXcNl2028":"b62412b472106ad3","swiftSrcRootRef":"57d7cc0ce1993d8d","swiftTwoProj":"d14f882e7fbf9cb8","swiftBareGone":"093954b0bc40ea67","swiftBareOneGone":"c78e5800564f6d66","swiftBareYes":"40b86f361fc33cc9","swiftLk2029":"11211f97112d37f2","swiftLk0085":"6a8d5f5d8722e4c3","swiftLk000B":"b8924abe02e34dc6","swiftLk000C":"944fa005e801b21f","swiftLkFEFF":"1e737876d7f15b39","swiftLk200B":"39277505b85d6b97","swiftLk2060":"e464893594b38112","swiftLk00AD":"06b3610f30534763","swiftLk0001":"fb7182f0dc0e84ef","swiftLk001E":"67c21a4b060f8b8d","swiftLk007F":"06fa0a979efaf271","swiftLk202E":"966447ea46a8608f","swiftLk2066":"7479915b38a796b2","swiftPbxComment":"1fc7c564c5dcb060","swiftPbxKeyNotStr":"14270475aed30daf","swiftPbxNoEq":"8313f380a4ea0745","swiftPbxNoSemi":"84225ea0a89b2453","swiftPbxDupKey":"41c7b67fbb46018d","swiftPbxArrComma":"9622692f497751dc","swiftPbxBadChar":"0047e4de90f4f817","swiftPbxTrailing":"a176865da962adb2","swiftProjExtra":"7b103ab6898607d4","swiftRootMainGroup":"fb26b5b2931b9ea5","swiftProjRoot":"d89e99d5937bfa37","swiftGroupLoop":"e78bf4adeb2395c5","swiftBuiltProducts":"96bded0c9ec2125b","swiftOrphanGroup":"87893b423b613916","swiftNameDollar":"d038e328c105027c","swiftXcIos":"0f15f3d9ac9404b6","swiftXcApp":"06d25ee88e307ca1","swiftXcAppApp":"e56891c81d3e0419","swiftXcTrailCmt":"f3fb7e0dd4094295","swiftXcCapVal":"b722dd92ad68c0ca","swiftLk0000":"f0edd86436bd1bb8","swiftLk0008":"c1bda3f6ff581840","swiftLk000E":"ab9408723e3c460d","swiftLk001F":"af2123bc8d28eba3","swiftLk200F":"74cdc4ab496a0d82","swiftLk2064":"522c0ec20b87b4a6","swiftLk202A":"8189cdaaa5664db8","swiftLk206F":"48d050d4a940a80b","swiftXcCapTail":"5b487c466ee5ef15","swiftXcCapSuffix":"b205ce5d637b5e74","swiftRootArray":"aeceacf6a3fe9798","swiftDupNoYes":"41c7b67fbb46018d","swiftIncHidden":"4d90b9c5d61eabe6","swiftXcSlash":"5e1151245dd4c30f","swiftXcUpcoming":"347590827ca56a10","swiftXcCapKey":"313a8f9857b616a0","swiftXcCapMid":"a55259020aac32b3","swiftXcCapEmpty":"0b12fe15ff6820b2","swiftXcCapNoEq":"7e5ad62b067a9aca","swiftCondFlags":"7e767aae4a1415fa","swiftCondValue":"de4434fdd883a775","swiftModeValue":"50a38b9881be0f17","swiftOptValue":"b45a3ed7b7397020","swiftSrcRootBrace":"89196dc36a70f2bc","swiftEscN":"9686eae1b054e168","swiftEscT":"ad49317cb3495e1e","swiftCompFlagsCond":"e20a35f910d211b0","swiftPbxCommentSlash":"b37f88ad0c1c7958","swiftPbxAt1":"f36bedd04d8e19d4","swiftPbxSlashLine":"622d67d7f9d65a57","swiftPbxLastNoSemi":"f212a6c0c44d7ec6","swiftPbxColon":"80080c3eaf25df73","swiftPbxSingleQuote":"30566efdeece2994","swiftPbxStar":"18c499d80e724e41","swiftPbxEmptyKey":"902328bcbd13c483","swiftEscBackslash":"ec0dcfa9003db504","swiftEscNEnd":"f042bee2e0cb388f","swiftEscTSpace":"35c45f06cc34cbe3","swiftChildrenStr":"55e292c4e9c79156","swiftProjExtraNoMain":"1f06db14c42d55b5","swiftProjDirArr":"066e05f8159ae551","swiftProjRootArr":"2e8116edc5bf4b2f","swiftSrcRootBare":"13bd725bb65a8bf3","swiftTreeGroupish":"27749b71a4f64fef","swiftTreeSdkRoot":"c5203708549f98cc","swiftMainGroupArr":"c1424d664a60aa00","swiftCfgNoSettings":"02ae78e6a6cb0195","swiftCfgKeyCase":"2b509a6b190bef5a","swiftBaseRefArr":"a379e7002f730418","swiftKeySwiftEnd":"c2c0c0d15ce929a3","swiftKeySwiftMid":"d3347adade8e942b","swiftValTrim":"f77d7765ad10d835","swiftValCase":"4946d360b331f30c","swiftValArrFirst":"10fcd6808473f9a3","swiftValArrOne":"56e97d1cf92bcb83","swiftVer5":"7e78bd9f71c8962a","swiftModeSingle":"3f7ce47b7802211d","swiftOptSize":"8a7567412c98822a","swiftCompFlagsSuffix":"0f77c8c39a1bc605","swiftXcIncCmt":"3d1af380f79ec954","swiftIncOptional":"456264bc8574a937","swiftXcDashCmt":"ceefee6a3f4cef83","swiftXcSemi":"3866209ec8a58877","swiftXcDebugKey":"466a7017a2c45a12","swiftXcCapDash":"6ec6cdb8604d06b2","swiftXcCapColon":"24ddae562cd8e618","swiftXcCapUpper":"a4f6d87e9a897034","swiftXcCapYes":"f9c6ed0b50ddb197","swiftXcCapCmt":"3a7aad9bd5898815","swiftXcCapPre":"58c8f6231a4c9b74","swiftCfgAnchorKey":"0212c0475817fd3d","swiftGroupDollar":"a04226fe8da98974","swiftParentTree":"4efccb5849fca02a","swiftTwoParentsLast":"f5c3a927ec4a8ac3","swiftTwoParentsFirst":"5b7947ff8ac0e526","swiftRefDir":"edcf4bf4d7e68155","swiftPathArr":"8dd9828ae979a0ee","swiftWsPbx":"275d1e015e001913","swiftWsPbx2":"7facc9e5c18858a1","swiftWsXc":"4fd3638820bc1bed","swiftCommentI3":"379445608146d61d","swiftSecondRef":"f2d115b6c3aa1b8c","swiftXcIndentCont":"f250baac0b1bb626","swiftXcLongIndent":"48845c7f9b611e0f","swiftFirstRefBad":"f2d115b6c3aa1b8c","swiftGroupDeep":"060a0909da08cf97","swiftCfgNoName":"2b710bfeffd781a2","swiftEscBsEmpty":"4c4fc607c5b2328b","swiftCompFlagsCfg":"0dba5ca139760e85","swiftProjDirSpace":"0d95c36c1cc8dd5d","swiftXcDeepLine":"35863bf10c9a596c","swiftPbxCmtSemi":"eaa0ea5e9f10e47f","swiftNlFar":"bb0bda32d4dd9603","swiftXcNlFar":"32c5ae7b00d43602","swiftPbxChHash":"e3dc3dd237ec1166","swiftPbxChBang":"9a88500cbb432371","swiftPbxChPct":"9473e501c3e40fc2","swiftPbxChAmp":"526fd809447767ac","swiftPbxChLt":"f8b68d1d25038b26","swiftPbxChGt":"acaa573dba48d7c6","swiftPbxChQ":"19ad6c7b8f78922c","swiftPbxChTick":"48d1393b27ceea21","swiftPbxChTilde":"1028ff1f6890089a","swiftPbxChBar":"3db54c437fb9c2cb","swiftPbxChCaret":"ef68824ea713a319","swiftPbxChApos":"950a7164699443d6","swiftPbxChBslash":"37067a9ac4205f1b","swiftTwoParentsSecond":"b684a500c3812499","swiftXcLongLine":"ae1e74d120b0d8bc","swiftGroupDollarMid":"76dab00ce4247e91","swiftParentSdk":"6f363d89fd8b8fc9","estNoReturn":"48a17e2d06007526","estElseAfter":"99687c2c67d89959","estFuncTwice":"caee1c5f97d2090a","srcCancel":"e9d6a24877edaa42","leftoverRead":"235b6d6dde72240a","lvpLoad":"562ea9ee3425c574","vbLoad":"3e990a2ae4ec299f","vbRunning":"f3888f24089b938e","loadFile":"de1030d7d697da5a","loadReq":"109a358eacab1ecf","showRetry":"e3ca3ebd3dd02383","failedPhase":"e82620de5f6bd921","zhBusy":"036e2dbd87144ecb","zhGuide":"dff7e8c61e4b7236","noDiskCache":"ae7b6f246029c0e0","clearIDB":"1967087e8751b697","onBroken":"e5e91bb14b3d860e","fgFlag":"c501e7dfd867b7da","installSrv":"6cc41da153b4a224","gcClass":"25fdff8cd841cb39","wdIdent":"87f87afaf99b0157","wdListedNoFunc":"d759b5780c873173","wdWebNone":"0f89321460260fb8","wdReq":"4df8b840157a2ff2","wdCtrl":"532d2035c95204b5","gcAuth":"129c14da4d46fd0e","gcPresent":"f176ab8fc9d58b1d","gcKeep":"7d3af21e01216a2d","gcPid":"76d2284c767b8a27","gcTeam":"d04b4217338b34bd","gcName":"0e71f54f778d472d","gcAlias":"7062f69cdc4205fe","wdBox":"69e9c0d49589e527","wdData":"b2d7d728a443bbf9","widgetBundle":"5cd9ccf35eebcbab","widgetOpen":"c5b84c14df433623","widgetReq":"b0edc5bf56e8fa83","widgetJpg":"517c707e72a521e7","wdDataFile":"1d12702bc312110d","groupMissing":"2bf048227f4249b1","groupExtra":"380d522208f3d10e","webSchemeRe":"aed4327e11754e33","webXhr":"c6f5fdd343c20f5e","webBeacon":"12453a6d9619cf7c","webSocket":"58bfb1382ec4c295","webXQNet":"196b286780770a5e","webIRT":"a1bf1b951a3d40c0","instGcFile":"5483116685087243","instWdFile":"ce7f0f7e799fef39","instClasses":"65c2b7e0d2355f95","instScheme":"8bb17dba83dd1a9b","regSuper":"e64f6b289c74e524","regLoop":"eb8fa86e6748a955","regInit":"56f612bc996c8b67","regThird":"df3d2aa4a7c300d9","spClass":"a5386aa6529fd87b","spIdent":"68dabbe3f48868c8","spJs":"3a634664b039f97c","spNoFunc":"fec080f41a4c6ea9","spExtraFunc":"b6cd4a6bc359daee","spQueue":"f2a34ab6a683d9ee","spLate":"28f92808f5b407db","spSpeakU":"e9ac47ab63e951ac","spMainSync":"ca4c40be2658db8b","spMainAsync":"1dfe3255f24b1140","spMainActor":"8b596fd9ed77c0cc","spWarmZh":"fe9e3e1b452048d1","spWarmCode":"c2c38d1c1a4d76bd","spVoice":"372c3d1472fa4f59","spEn":"881a0d11233661c3","spSilent":"398b3d33181fb91a","spAppSession":"d5a43b4049b6acb8","spCatLate":"839273667e4cbf17","spBgNote":"588b67bac2ba862c","spRec":"4ab398c3eaa4e080","spCam":"4ea45f2f3fccb332","spAuth":"f8ff171f379ba83e","spReq":"4033facf8ef74044","spInstFiles":"e5f1f5a3e6c05ff2","spInstConcat":"3b0c23ad22c25bf9","spInstFilter":"5abce344318d613d","spPkgList":"5014700c6b9c5d7f","spPkgDup":"ba56d6e1f0f7e359","boardSpeak":"1e7744d80de6d383","ctrl00":"359e789509152bb8","ctrl01":"ce5ae3cf53190678","ctrl02":"03e2b2b23738a4d4","ctrl03":"8864062ef8d04d8e","ctrl04":"95c8946dc9658164","ctrl05":"78da4f2f453b9510","ctrl06":"c405d706ebfc9b39","ctrl07":"b4c427b0879309c1","ctrl08":"c6566cf2de930dc3","ctrl0b":"fb47c16fef34ae22","ctrl0c":"c6ad74ef3f71aebe","ctrl0e":"9435a068b6099cb6","ctrl0f":"b2bd91f0f2ccfe4c","ctrl10":"76736b12f793a027","ctrl11":"6cd2d3089047f646","ctrl12":"ba17026049d32ab2","ctrl13":"abce1dc4e888f8d1","ctrl14":"89f228a65410f6f3","ctrl15":"fc29622ffc22b49c","ctrl16":"4cf86b648b274968","ctrl17":"aed10a2cdbe348c5","ctrl18":"982818601031e5e2","ctrl19":"78db238abd1d4179","ctrl1a":"42b8804112469ad6","ctrl1b":"5424c34bfe1e2613","ctrl1c":"e73f1145bd5cae72","ctrl1d":"92dc68836516b444","ctrl1e":"66c522c12832976d","ctrl1f":"42233acb94c46b40","ctrl7f":"62d55f091a3f5a72","estOrTrue":"dba50375315ecc3d","estOrMid":"d181a8dc63057245","wdObjc":"90017b3a395fee96","wdClass":"6856fa075e8c1a23","gcIdent":"27354527b800db3b","wdJs":"fde57206e6ffe32c","gcCtrl":"801bf9f7e178ba31","wdNet":"3ac34903d2b9781e","gcReq":"7ea2fd0facd2fc54","ctrlVC":"ee98be00825af465","regPlugin":"d6f54571b593e9a8","groupMissWD":"6e7552fb28253206","groupMissWidget":"7e732000422be2f3","groupMissApp":"59181fee68c524e6","groupExtraWD":"6afe4fc3d0bb3107","groupExtraWidget":"dbdefcb4a1ba19d3","groupExtraWidgetEnt":"190af69f2b4ec5f3","braceBad":"f7dea2938b6684a3","strOpen":"f5e48fc25a62f7a5","strEOF":"5fa7d6fbfacbf320","wdJpg":"d45638ddf390f843","vbMissing":"b3b2d12ca33d07b5","halfAfter":"6904b438cee68ffe","capVDL":"4c9873aac229c15e","capLoadWV":"e306f8b5eeaffdd4","capDidLoad":"c0470920062b38d2","capRegInst":"2306f648a27237ff","pbxMissing":"b201601a3c66eea0","pkgGc":"e419dab5c4b83c4d","pkgWd":"ccddc94d8bac4e4e","pkgGcDup":"2bd867353a20f229","infoScheme":"f606a145360f4435","gcCopyDiff":"769b6dbc1e570ab8","vnRetTrue":"028b715532f23fac","vnTernary":"baa27428c982fbc3","vnCmpTrue":"7730b607fcb65c81","vnNo200":"939417ca7a7f139c","vnNoHost":"8ab1115316ac7365","vnDeadResume":"6dc512e668079efc","vnUrlComment":"60333d881d91cbfd","vnFlagGetter":"23c5d6951fc8ed83","vnFixedAnswer":"2d8e9944cefa94c3","vnHexZero":"3c05605b62c62ddc","vnStrDecoy":"65e60704dd6b1384","vnIfFalse":"9e4ac33ca3360392","vnIfDebug":"38a862d25fce1a1c","vnDecoyBefore":"2a1c6014a260cf77","vnDecoyOnly":"1620abf21c8609eb","vnExtension":"c104140077be26e5","vnNestedFlag":"5504130e1a583ff2","vnTypealias":"a8e8b16730379356","vnDupIssue":"795c59fa88fc4ba2","vnDupHex":"62df5a8d116e3a75","vnSigTwice":"0d1272d647d0ac75","install":"24187decaa5c37b8"};
/* #262 第四輪（CI 紅：ubuntu 的 GNU diff 遇到 $(SRCROOT) 這種檔名會加引號，解析系統 diff 的輸出會跨平台不一致）：
   改成兩支子行程分工，不再用系統 diff／shasum：
   BREAK_FX_RUN 會載入 canary-native.js，只負責跑 break；BREAK_FX_CMP 不載入 canary-native.js，負責複製乾淨副本、比對結果。
   這樣載入 canary 時偷換 fs 或其他模組，也影響不到複製和比對。原本有的檔只記「少了、多了哪些行」（逐行計數相減、排序，不含行號），
   新建的檔記整份內容的 SHA-256，刪掉的檔記 D，新目錄記 A/，檔案類型變了記 T */
const BREAK_FX_RUN = String.raw`"use strict";
const fs = require("fs");
const [mode, canary, inp, out] = process.argv.slice(2);
const { KINDS } = require(canary);
if (mode === "keys") { fs.writeFileSync(out, JSON.stringify(Object.keys(KINDS))); process.exit(0) }
const map = JSON.parse(fs.readFileSync(inp, "utf8")), errs = {};
for (const [k, W] of Object.entries(map)) { try { KINDS[k].break(W) } catch (e) { errs[k] = "E " + String(e && e.message).split(W).join("<W>").slice(0, 200) } }
fs.writeFileSync(out, JSON.stringify(errs));
`;
const BREAK_FX_CMP = String.raw`"use strict";
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const [mode, P, inp, out] = process.argv.slice(2);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
if (mode === "prep") {
  const map = {};
  for (const k of JSON.parse(fs.readFileSync(inp, "utf8"))) { const W = fs.mkdtempSync(path.join(os.tmpdir(), "xq-w187fx-")); fs.cpSync(P, W, { recursive: true, verbatimSymlinks: true }); map[k] = W }
  fs.writeFileSync(out, JSON.stringify(map)); process.exit(0);
}
function walk(root) {
  const m = new Map(), st = [""];
  while (st.length) { const rel = st.pop();
    for (const n of fs.readdirSync(path.join(root, rel))) { const r = rel ? rel + "/" + n : n, q = path.join(root, r), l = fs.lstatSync(q);
      if (l.isSymbolicLink()) m.set(r, ["L", Buffer.from(fs.readlinkSync(q))]);
      else if (l.isDirectory()) { m.set(r, ["/", null]); st.push(r) }
      else m.set(r, ["F", Buffer.from(fs.readFileSync(q).toString("latin1").replace(/\r\n/g, "\n"), "latin1")]) } }   /* #262 第五輪問題 3：Windows autocrlf 的副本是 CRLF，edit 寫回 LF，先換成 LF 再比 */
  return m;
}
const lineDelta = (a, b) => { const c = new Map(); for (const l of a.toString("latin1").split("\n")) c.set(l, (c.get(l) || 0) + 1);
  const add = []; for (const l of b.toString("latin1").split("\n")) { const n = c.get(l) || 0; if (n > 0) c.set(l, n - 1); else add.push("+" + l) }
  const del = []; for (const [l, n] of c) for (let i = 0; i < n; i++) del.push("-" + l);
  return del.sort().concat(add.sort()).join("\n") };
const base = walk(P), byName = new Map(); for (const [r, v] of base) { const n = path.posix.basename(r); if (!byName.has(n)) byName.set(n, []); byName.get(n).push([r, v]) }
const [errs, map] = [JSON.parse(fs.readFileSync(inp, "utf8")), JSON.parse(fs.readFileSync(out + ".map", "utf8"))], res = {};
for (const [k, W] of Object.entries(map)) {
  const lines = errs[k] ? [errs[k]] : [], now = walk(W);
  for (const [r, [t, b]] of now) { const o = base.get(r);
    /* #262 第五輪問題 4：新檔如果是從原本某個同名檔複製來的（例如 gcInstalled 把 native/ios 的外掛複製進 ios/App/App），只記跟那個檔差了哪些行，
       不然一般 PR 改那支 Swift 就會紅；沒有同名檔才記整份內容 */
    if (!o && t === "F") { const src = (byName.get(path.posix.basename(r)) || []).filter((x) => x[1][0] === "F").map((x) => [x[0], lineDelta(x[1][1], b)]).sort((x, y) => x[1].length - y[1].length || (x[0] < y[0] ? -1 : 1))[0];
      lines.push(src ? "A " + r + " ~" + src[0] + " " + sha(src[1]) : "A " + r + " F" + sha(b)); continue }
    if (!o) lines.push(t === "/" ? "A/ " + r : "A " + r + " " + t + sha(b));
    else if (o[0] !== t) lines.push("T " + r + " " + o[0] + t);
    else if (t !== "/" && !o[1].equals(b)) lines.push("C " + r + " " + sha(lineDelta(o[1], b))) }
  for (const r of base.keys()) if (!now.has(r)) lines.push("D " + r);
  res[k] = lines.sort();
  fs.rmSync(W, { recursive: true, force: true });
}
fs.writeFileSync(out, JSON.stringify(res));
`;
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

/* ===== #262 第七輪（iMac Claude 1 審查：測試檔一開頭就 require 金絲雀、之後才讀檔算雜湊；金絲雀在載入時換掉 fs.readFileSync，
   讀自己時把加的那幾行去掉，雜湊、切段、U+2028 全都看不到）=====
   所以下面這段在 require("./canary-native.js") 之前跑完：讀檔、算雜湊、切段、DATA_LOCK、行為鎖（子行程）用的 fs、crypto、child_process 都還沒被動過。
   有一項不對就直接丟錯，整支測試檔載入失敗，不經過 assert（金絲雀之後換掉 assert 也藏不了）；後面的幾項測試只是把 PRE 的結果逐項列出來 */
function breakFx() {
  const { R: P } = repoCopy(), d = tmp("xq-w187c-"), runJs = path.join(d, "fx-run.cjs"), cmpJs = path.join(d, "fx-cmp.cjs");
  fs.writeFileSync(runJs, BREAK_FX_RUN); fs.writeFileSync(cmpJs, BREAK_FX_CMP);
  /* #262 第八輪：Windows 的 os.tmpdir() 看 TEMP、TMP、SystemRoot（還有 windir、USERPROFILE），沒帶就 mkdtemp 失敗；只帶有值的，不帶 undefined */
  const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "SystemRoot", "windir", "USERPROFILE"].filter((k) => process.env[k] != null).map((k) => [k, process.env[k]]));
  const go = (js, args, what) => { const r = cp.spawnSync(process.execPath, [js, ...args], { encoding: "utf8", maxBuffer: 64e6, timeout: 600000, env }); if (r.status !== 0) throw new Error("行為鎖的子行程沒跑完（" + what + "）：" + r.stdout + r.stderr) };
  const keys = path.join(d, "keys.json"), out = path.join(d, "fx.json"), errs = path.join(d, "errs.json");
  go(runJs, ["keys", CANARY, "-", keys], "列壞樣本");
  go(cmpJs, ["prep", P, keys, out + ".map"], "複製乾淨副本");
  go(runJs, ["break", CANARY, out + ".map", errs], "跑 break");
  go(cmpJs, ["cmp", P, errs, out], "比對");
  return JSON.parse(fs.readFileSync(out, "utf8"));
}
const PRE = (() => {
  const sha = (x) => crypto.createHash("sha256").update(x).digest("hex"), errs = [], KJ = path.join(HERE, "canary-native-kinds.json");
  const raw = fs.readFileSync(CANARY, "utf8");
  const u2028 = [CANARY, CHECK, KJ, __filename].filter((f) => /[\u2028\u2029]/.test(fs.readFileSync(f, "utf8"))).map((f) => path.basename(f));
  if (u2028.length) errs.push("有 U+2028 或 U+2029：" + u2028.join("、"));
  const whole = sha(raw.replace(/\r\n?/g, "\n")).slice(0, 16);
  if (whole !== CANARY_SHA) errs.push("canary-native.js 改了（整支原檔比對，含註解）");
  const now = breakSegs(raw, noComments, sha);
  for (const [k, hh] of Object.entries(BREAK_SEGS)) if (now.segs[k] !== hh) errs.push("寫死的段落不見了或改了：" + k);
  for (const k of Object.keys(now.segs)) if (!(k in BREAK_SEGS)) errs.push("canary-native.js 多了一段程式：" + k);
  const dataErr = []; let list = null;
  try { list = JSON.parse(fs.readFileSync(KJ, "utf8")) } catch (e) { dataErr.push("讀不到或不是 JSON") }
  if (!Array.isArray(list) || list.length < DATA_LOCK.length) dataErr.push("項目不准刪");
  else DATA_LOCK.forEach((h, i) => { if (sha(JSON.stringify(list[i])).slice(0, 16) !== h) dataErr.push("第 " + (i + 1) + " 項改了或順序換了") });
  for (const x of dataErr) errs.push("canary-native-kinds.json " + x);
  let got; try { got = breakFx() } catch (e) { for (const d of made) try { fs.rmSync(d, { recursive: true, force: true }) } catch (x) {} throw e }
  const fxBad = [];
  for (const [k, hh] of Object.entries(BREAK_FX)) if (!(k in got) || sha(got[k].join("\n")).slice(0, 16) !== hh) fxBad.push(k);
  for (const k of Object.keys(got)) if (!got[k].length) fxBad.push(k + "（什麼檔都沒改到）");
  if (fxBad.length) errs.push("壞樣本實際改的檔或內容變了（行為鎖）：" + fxBad.join("、"));
  /* #262 第八輪：丟錯時測試檔沒載完，test.after 不會跑，暫存副本（約 8.5 MB）要在這裡先清掉 */
  if (errs.length) { for (const d of made) try { fs.rmSync(d, { recursive: true, force: true }) } catch (e) {} throw new Error("載入 canary-native.js 之前的完整性檢查沒過（#262 第七輪）：\n" + errs.join("\n")) }
  return { u2028, whole, now, list, dataErr, got, fxBad };
})();
({ KINDS, exitOf, toolSha, run } = require("./canary-native.js"));

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
/* W187：把整支 canary-native.js 切成段落、算雜湊（先去掉註解，空白壓成一格）。
   頂層：每個從第 0 欄開始的敘述算一段（宣告用名字當鍵，其他敘述用第一行當鍵）；KINDS 裡：每個壞樣本一段（程式產生的那批用字首當鍵）。
   回傳 segs（鍵→雜湊）、topNames（頂層宣告的名字，含重複）、kindNames（KINDS 裡的名字，含重複） */
function breakSegs(src, noComments, sha) {
  const t = noComments(src.replace(/\r\n?/g, "\n")), L = t.split("\n");
  const k0 = L.findIndex((l) => /^const KINDS = \{/.test(l)), k1 = L.findIndex((l, i) => i > k0 && /^\};/.test(l));
  if (k0 < 0 || k1 < 0) throw new Error("canary-native.js 找不到 KINDS 的開頭或結尾");
  const norm = (a) => a.join("\n").replace(/\s+/g, " ").trim(), h = (s) => sha(s).slice(0, 16);
  const segs = {}, body = {}, topNames = [], kindNames = [];
  const put = (k, lines) => { const s = norm(lines); if (!s) return; let key = k, n = 2; while (key in segs) key = k + "#" + n++; segs[key] = h(s); body[key] = s };
  const topKey = (line) => { const m = line.match(/^(?:const|let|var)\s+([A-Za-z0-9_$]+)|^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/); if (m) { topNames.push(m[1] || m[2]); return "top:" + (m[1] || m[2]) } return "stmt:" + line.replace(/\s+/g, " ").trim().slice(0, 60) };
  const top = (from, to) => { let cur = null, buf = []; for (let i = from; i < to; i++) { if (/^[^\s})\]]/.test(L[i])) { if (cur) put(cur, buf); cur = topKey(L[i]); buf = [L[i]] } else if (cur) buf.push(L[i]); else if (L[i].trim()) { cur = "stmt:(開頭)"; buf = [L[i]] } } if (cur) put(cur, buf) };
  top(0, k0);
  { let cur = null, buf = []; for (let i = k0 + 1; i < k1; i++) {
      const m = L[i].match(/^  ([A-Za-z0-9_$]+): \{/), g = /^  \.\.\./.test(L[i]);
      if (m || g) { if (cur) put(cur, buf); if (m) kindNames.push(m[1]); cur = "kind:" + (m ? m[1] : "…" + ((L[i].match(/\["([A-Za-z0-9_]+)" \+/) || [, "spread"])[1])); buf = [L[i]] } else if (cur) buf.push(L[i]);
      else if (L[i].trim()) { cur = "kind:(開頭)"; buf = [L[i]] }   /* #262 第二輪：KINDS 開頭到第一個壞樣本之間不能放東西（例如 __proto__） */
    } if (cur) put(cur, buf) }
  put("frame:KINDS", [L[k0], L[k1]]);
  top(k1 + 1, L.length);
  return { segs, topNames, kindNames };
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

test("原生檢查的程式檔不准有 U+2028／U+2029（JS 當換行、本檔的去註解卻不當，// 後面接它的程式會被藏起來；#262 第六輪；第七輪起在載入金絲雀前檢查，見 PRE）", () => {
  assert.deepEqual(PRE.u2028, [], "有 U+2028 或 U+2029");
});
test("canary-native-kinds.json 已有的項目寫死，只准往後加（#262 第六輪；第七輪起在載入金絲雀前檢查，見 PRE）", () => {
  assert.deepEqual(PRE.dataErr, []);
});

test("整支 canary-native.js 的壞樣本改法、輔助函式、執行流程都寫死，不准新增程式；新壞樣本只能加在 canary-native-kinds.json（W187，#262 第五輪）", () => {
  const now = PRE.now;   /* #262 第七輪：用載入金絲雀之前切好的段落 */
  for (const [k, hh] of Object.entries(BREAK_SEGS)) {
    assert.ok(k in now.segs, "寫死的段落不見了或改了開頭（W187）：" + k);
    assert.equal(now.segs[k], hh, "寫死的段落改了：壞樣本改法、輔助函式或金絲雀執行流程變了，原本要抓的判斷可能被別條頂替（W187）：" + k);
  }
  const dup = (a) => [...new Set(a.filter((x, i) => a.indexOf(x) !== i))];
  assert.deepEqual(dup(now.topNames), [], "頂層同一個名字宣告兩次：後面的會蓋掉前面寫死的那個（W187，#262 審查 Fredecl）");
  assert.deepEqual(dup(now.kindNames), [], "KINDS 裡同一個壞樣本名字出現兩次：後面的會蓋掉前面（W187）");
  for (const k of Object.keys(now.segs)) assert.ok(k in BREAK_SEGS, "canary-native.js 多了一段程式：#262 第五輪起程式碼整支寫死、不准新增，新壞樣本請加在 canary-native-kinds.json（純資料）；真的要改程式就是計分規則 PR，連這裡的雜湊一起改（W187）：" + k);
  /* 段落只在第 0 欄切開，縮排的續行、空白壓縮後一樣的寫法（例如字串裡多一個空格）可能看不出來，所以整支再算一個雜湊：
     只去掉註解、CRLF 換 LF、刪掉去註解後的空白行，其他一個字都不動 */
  /* #262 第六輪：不先去註解（noComments 把 // 算到 \n 為止，JS 卻把 U+2028／U+2029 也當換行，註解後面接 U+2028 的程式會被執行、卻被當成註解去掉），整支原檔只換 LF 就算雜湊，註解也一起寫死 */
  assert.equal(PRE.whole, CANARY_SHA, "canary-native.js 改了（整支原檔比對，含註解）：#262 第五輪起整支寫死，新壞樣本請加在 canary-native-kinds.json（W187）");
  const DATA_NAMES = new Set(PRE.list.map((d) => d.name)), segK = Object.keys(now.segs).filter((k) => k.startsWith("kind:")).map((k) => k.slice(5));
  for (const k of Object.keys(KINDS)) assert.ok((KINDS[k].data === true && DATA_NAMES.has(k)) || segK.includes(k) || segK.some((g) => g.startsWith("…") && k.startsWith(g.slice(1))), "切段沒有涵蓋這個壞樣本，寫死不到它的改法（W187）：" + k);
});

test("新壞樣本只能是 canary-native-kinds.json 的純資料：路徑跳不出副本、格式不對就不載入，正常的照樣被抓到（W187，#262 第五輪）", () => {
  const { canary, R } = repoCopy(), J = path.join(path.dirname(canary), "canary-native-kinds.json");
  const load = (list) => { fs.writeFileSync(J, JSON.stringify(list)); return cp.spawnSync(process.execPath, ["-e", "require(process.argv[1])", canary], { encoding: "utf8" }) };
  const good = { name: "xqDataPort", files: ["native/ios/XQLoopbackServer.swift", "ios/App/App/XQLoopbackServer.swift"], find: "static let port: UInt16 = 47821", replace: "static let port: UInt16 = 47823", expect: "埠號還是 47821" };
  const S = good.files[0];
  const bad = {
    "跳出副本（第五輪問題 1）": { ...good, files: ["../../../clean/source/xiangqi-ios/" + S] }, "中間有 ..": { ...good, files: ["native/ios/../ios/" + "x.swift"] },
    "./ 開頭": { ...good, files: ["./" + S] }, "絕對路徑": { ...good, files: ["/" + S] }, "反斜線": { ...good, files: ["native\\ios\\XQLoopbackServer.swift"] },
    "改金絲雀自己": { ...good, files: ["scripts/check-native.js"] }, "大寫 Scripts": { ...good, files: ["Scripts/check-native.js"] }, "大寫 Node_Modules": { ...good, files: ["Node_Modules/x.swift"] }, "node_modules": { ...good, files: ["node_modules/x.swift"] }, "files 空的": { ...good, files: [] },
    "files 重複": { ...good, files: [S, S] }, "多一個欄位": { ...good, run: "x" }, "少一個欄位": { name: "xqA", files: [S], find: "a", replace: "b" },
    "名字重複": { ...good, name: "port" }, "名字大小寫不同也算重複": { ...good, name: "pOrt" }, "保留名稱 clean": { ...good, name: "clean" }, "保留名稱大小寫": { ...good, name: "cLean" }, "constructor": { ...good, name: "constructor" }, "toString": { ...good, name: "toString" }, "hasOwnProperty": { ...good, name: "hasOwnProperty" }, "名字不合格式": { ...good, name: "__proto__" }, "find 跟 replace 一樣": { ...good, replace: good.find },
    "expect 空的": { ...good, expect: "" }, "find 不是字串": { ...good, find: ["a"] },
  };
  for (const [why, d] of Object.entries(bad)) { const r = load([d]); assert.notEqual(r.status, 0, why + "：應該載入失敗"); assert.match(r.stderr, /canary-native-kinds\.json/, why) }
  assert.notEqual(load({}).status, 0, "不是陣列應該載入失敗");
  assert.notEqual(load([good, { ...good }]).status, 0, "同一個名字兩項應該載入失敗");
  /* 連結：檔案本身是指到副本外面的連結，套用時要判不成立（結束代碼 2），外面的檔不能被改 */
  if (process.platform !== "win32") {   /* Windows 建連結常常要系統管理員權限（EPERM），CI 在 ubuntu 跑這段 */
  const outside = path.join(tmp("xq-w187out-"), "XQLoopbackServer.swift"); fs.writeFileSync(outside, "static let port: UInt16 = 47821\n");
  fs.symlinkSync(outside, path.join(R, "source", "xiangqi-ios", "native", "ios", "zzLink.swift"));
  assert.equal(load([{ ...good, name: "xqLink", files: ["native/ios/zzLink.swift"] }]).status, 0);
  const rl = runCanary(canary, ["--only", "xqLink"]);
  assert.equal(rl.status, 2, "連結到副本外的檔要判不成立：" + rl.stdout + rl.stderr);
  assert.equal(fs.readFileSync(outside, "utf8"), "static let port: UInt16 = 47821\n", "副本外的檔被改了");
  fs.rmSync(path.join(R, "source", "xiangqi-ios", "native", "ios", "zzLink.swift"));
  }
  assert.equal(load([good]).status, 0);
  const r = runCanary(canary, ["--only", "xqDataPort"]);
  assert.equal(r.status, 0, "正常的純資料壞樣本要被抓到：" + r.stdout + r.stderr);
  assert.match(r.stdout, /✔ xqDataPort 被抓到/);
  const rf = (load([{ ...good, name: "xqMiss", find: "這段不存在" }]), runCanary(canary, ["--only", "xqMiss"]));
  assert.equal(rf.status, 2, "找不到 find 要判不成立：" + rf.stdout + rf.stderr);
});

test("每個壞樣本實際改了哪些檔、改成什麼也寫死，只能增加（W187 行為鎖，#262 第二輪審查；第七輪起在載入金絲雀前跑，見 PRE）", () => {
  for (const k of Object.keys(BREAK_FX)) assert.ok(k in PRE.got, "寫死行為的壞樣本不見了（W187）：" + k);
  assert.deepEqual(PRE.fxBad, [], "壞樣本實際改的檔或內容變了：改法、輔助函式或載入時的程式偷換了東西（W187 行為鎖）");
});

test("反證：金絲雀在載入時換掉 fs.readFileSync、讀自己時把加的那行藏起來，測試檔要在載入時就失敗（#262 第七輪）", () => {
  const { R } = repoCopy(), T = path.join(R, "source", "xiangqi-ios", "scripts", "test-canary-native.cjs"), C = path.join(path.dirname(T), "canary-native.js");
  /* 外層 node --test 會設 NODE_TEST_CONTEXT，子行程帶著它就不會真的跑那支測試檔（立刻回 0），要拿掉 */
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^NODE_TEST/.test(k)));
  const tryT = () => cp.spawnSync(process.execPath, ["--test", "--test-skip-pattern=.", T], { encoding: "utf8", maxBuffer: 64e6, timeout: 600000, env });
  const ok = tryT(); assert.equal(ok.status, 0, "對照組：沒動的副本，測試檔要載入得了：" + ok.stdout.slice(-800) + ok.stderr.slice(-800));
  assert.ok(+((ok.stdout.match(/^ℹ duration_ms ([\d.]+)/m) || [])[1] || 0) > 2000, "對照組：要真的載入、跑完 PRE（行為鎖要好幾秒），不是立刻回 0：" + ok.stdout.slice(-400));
  const src = fs.readFileSync(C, "utf8"), anchor = "module.exports = { run, KINDS, exitOf, toolSha };";
  assert.ok(src.includes(anchor));
  const atk = 'const __xqRF = fs.readFileSync; fs.readFileSync = function (p, ...a) { const r = __xqRF.call(this, p, ...a); if (String(p) === __filename) { const s = String(r).split("\\n").filter((l) => !l.includes("__xq" + "RF")).join("\\n"); return typeof r === "string" ? s : Buffer.from(s) } return r };\n';
  fs.writeFileSync(C, src.replace(anchor, atk + anchor));
  const hid = cp.spawnSync(process.execPath, ["-e", "const fs=require('fs');require(process.argv[1]);process.stdout.write(String(fs.readFileSync(process.argv[1],'utf8').includes('__xqRF')))", fs.realpathSync(C)], { encoding: "utf8" });
  assert.equal(hid.stdout, "false", "改壞要真的生效：載入後讀自己看不到加的那行（__filename 是實際路徑，測試檔讀的 CANARY 也是）：" + hid.stderr);
  const bad = tryT(); assert.notEqual(bad.status, 0, "改過的金絲雀，測試檔要載入失敗");
  assert.match(bad.stdout + bad.stderr, /載入 canary-native\.js 之前的完整性檢查沒過/);
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
