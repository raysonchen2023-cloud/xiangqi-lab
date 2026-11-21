#!/usr/bin/env node
/* 把 native/ios/ 的原生檔裝進 Capacitor 產生的 iOS 專案（ios/App/），可以重複跑（已經裝過的不會重複加）。
   做的事：
     1. 複製 XQLoopbackServer.swift、XQBridgeViewController.swift、PrivacyInfo.xcprivacy 到 ios/App/App/，並登記進 App.xcodeproj（Sources／Resources）。
     2. SceneDelegate.swift：rootViewController 改用 XQBridgeViewController（從本機伺服器載入，引擎多執行緒才能用）。
     3. Main.storyboard：同上（保險）。
     4. Info.plist：
        - NSAppTransportSecurity → NSAllowsLocalNetworking＝YES（允許 http://127.0.0.1 本機伺服器；不開放任意 http）
        - ITSAppUsesNonExemptEncryption＝NO（只用系統內建加密：HTTPS、WebCrypto）
        - UIRequiredDeviceCapabilities：armv7 → arm64
        - iPhone 只支援直式（跟網頁版 manifest 的 orientation: portrait 一樣）；iPad 四個方向都留（iPad 多工要求）
        - CFBundleDevelopmentRegion＝zh-Hant、CFBundleLocalizations＝[zh-Hant, en]（系統分享面板、權限視窗用繁體中文；App 內可切英文，所以也列 en）
        - 相機、麥克風、語音辨識、加入相簿的權限說明文字（網頁呼叫到時才會跳出來問）
     5'. 11/18：複製 XQSpeechPlugin.swift（語音報棋用 iOS 系統語音，JS 名稱 XQSpeech）並登記進 Sources（預設就裝，免費帳號也能用）。11/18 起註冊改在 XQBridgeViewController.swift 的 capacitorDidLoad()（registerPluginInstance），不靠 packageClassList，npx cap sync 不會把它拿掉
   用法：先 npx cap add ios（已做過），再 node scripts/install-native.js。之後每次 npx cap sync ios 都不會蓋掉這些改動。
   --gc-widget（11/17 加，等付費開發者帳號審核通過後才用）：另外裝 Game Center 與今日茶單小工具的兩支外掛
     5. 複製 XQGameCenterPlugin.swift、XQWidgetDataPlugin.swift 到 ios/App/App/ 並登記進 Sources
     6. 11/18 起：兩支也由 XQBridgeViewController.swift 的 capacitorDidLoad() 註冊（有編進 App 才找得到，NSClassFromString）；packageClassList 不再寫，舊版寫進去的這裡會清掉
        ※ 裝過一次之後不用再帶 --gc-widget，會自動維持（看 pbxproj 裡有沒有外掛檔）
     7. Info.plist 加網址 xqqianqiu://（點小工具開 App 的今日茶單）
     不會動：entitlements（Game Center、App Group 要付費帳號，免費 Personal Team 加了就簽不過）、小工具 target（見 notes/widget-setup.md、native/ios-widget/add-widget-target.rb）。 */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const HERE = path.join(__dirname, "..");
const SRC = path.join(HERE, "native", "ios");
const APP = path.join(HERE, "ios", "App", "App");
const PBX = path.join(HERE, "ios", "App", "App.xcodeproj", "project.pbxproj");

function die(m) { console.error("✘ " + m); process.exit(1); }
if (!fs.existsSync(PBX)) die("找不到 " + PBX + "（先跑 npx cap add ios）");
const id = s => crypto.createHash("sha1").update("xiangqi-ios:" + s).digest("hex").slice(0, 24).toUpperCase();
const noCR = s => s.replace(/\r\n?/g, "\n");
let changed = [];

/* ---------- 1. 檔案＋pbxproj ---------- */
const FILES = [
  { name: "XQLoopbackServer.swift", type: "sourcecode.swift", phase: "Sources" },
  { name: "XQBridgeViewController.swift", type: "sourcecode.swift", phase: "Sources" },
  { name: "PrivacyInfo.xcprivacy", type: "text.xml", phase: "Resources" },
  /* 11/18 語音報棋改用 iOS 系統語音（AVSpeechSynthesizer，在自己的佇列朗讀，不碰主執行緒；JS 名稱 XQSpeech）。預設就裝：不需要付費帳號、不需要權限 */
  { name: "XQSpeechPlugin.swift", type: "sourcecode.swift", phase: "Sources" },
];
/* 預設就裝的外掛（不用 --gc-widget）；名單只拿來清 packageClassList 舊的登記 */
const BASE_CLASSES = ["XQSpeechPlugin"];
/* --gc-widget 的兩支外掛（JS 名稱 XQGameCenter、XQWidgetData；網頁端 xiangqi-db/m/07gc-native.js） */
const GCW_FILES = [
  { name: "XQGameCenterPlugin.swift", type: "sourcecode.swift", phase: "Sources" },
  { name: "XQWidgetDataPlugin.swift", type: "sourcecode.swift", phase: "Sources" },
];
const GCW_CLASSES = ["XQGameCenterPlugin", "XQWidgetDataPlugin"];
const URL_SCHEME = "xqqianqiu";
let pbx = fs.readFileSync(PBX, "utf8");
/* 帶了 --gc-widget，或之前已經裝過（pbxproj 裡有外掛檔）就裝／維持 */
const GCW = process.argv.includes("--gc-widget") || pbx.includes("/* XQGameCenterPlugin.swift */");
for (const f of FILES.concat(GCW ? GCW_FILES : [])) {
  const src = path.join(SRC, f.name), dst = path.join(APP, f.name);
  if (!fs.existsSync(src)) die("找不到 " + src);
  const body = noCR(fs.readFileSync(src, "utf8"));
  if (!fs.existsSync(dst) || fs.readFileSync(dst, "utf8") !== body) { fs.writeFileSync(dst, body); changed.push("複製 " + f.name); }
  if (pbx.includes("/* " + f.name + " */")) continue;
  const ref = id("ref:" + f.name), bf = id("build:" + f.name);
  const ins = (re, text, what) => {
    const m = pbx.match(re);
    if (!m) die("project.pbxproj 找不到「" + what + "」，格式可能變了，請在 Xcode 手動把 " + f.name + " 拖進 App 資料夾");
    pbx = pbx.slice(0, m.index + m[0].length) + text + pbx.slice(m.index + m[0].length);
  };
  ins(/\/\* Begin PBXBuildFile section \*\/\n/, `\t\t${bf} /* ${f.name} in ${f.phase} */ = {isa = PBXBuildFile; fileRef = ${ref} /* ${f.name} */; };\n`, "PBXBuildFile");
  ins(/\/\* Begin PBXFileReference section \*\/\n/, `\t\t${ref} /* ${f.name} */ = {isa = PBXFileReference; lastKnownFileType = ${f.type}; path = ${f.name}; sourceTree = "<group>"; };\n`, "PBXFileReference");
  ins(/\/\* App \*\/ = \{\n\t+isa = PBXGroup;\n\t+children = \(\n/, `\t\t\t\t${ref} /* ${f.name} */,\n`, "App 群組");
  const phaseRe = f.phase === "Sources" ? /isa = PBXSourcesBuildPhase;\n\t+buildActionMask = \d+;\n\t+files = \(\n/ : /isa = PBXResourcesBuildPhase;\n\t+buildActionMask = \d+;\n\t+files = \(\n/;
  ins(phaseRe, `\t\t\t\t${bf} /* ${f.name} in ${f.phase} */,\n`, f.phase + " 建置階段");
  changed.push("登記進 Xcode 專案：" + f.name);
}
fs.writeFileSync(PBX, pbx);

/* ---------- 2. SceneDelegate ---------- */
{
  const p = path.join(APP, "SceneDelegate.swift");
  let s = fs.readFileSync(p, "utf8");
  if (s.includes("CAPBridgeViewController()")) { s = s.replace("CAPBridgeViewController()", "XQBridgeViewController()"); fs.writeFileSync(p, s); changed.push("SceneDelegate 改用 XQBridgeViewController"); }
  else if (!s.includes("XQBridgeViewController()")) console.warn("⚠ SceneDelegate.swift 找不到 CAPBridgeViewController()，請手動把根畫面換成 XQBridgeViewController()");
}

/* ---------- 3. Main.storyboard ---------- */
{
  const p = path.join(APP, "Base.lproj", "Main.storyboard");
  let s = fs.readFileSync(p, "utf8");
  const a = 'customClass="CAPBridgeViewController" customModule="Capacitor"';
  if (s.includes(a)) { s = s.replace(a, 'customClass="XQBridgeViewController" customModule="App" customModuleProvider="target"'); fs.writeFileSync(p, s); changed.push("Main.storyboard 改用 XQBridgeViewController"); }
}

/* ---------- 4. Info.plist ---------- */
{
  const p = path.join(APP, "Info.plist");
  let s = noCR(fs.readFileSync(p, "utf8"));
  const before = s;
  const addKey = (key, xml) => {
    if (s.includes("<key>" + key + "</key>")) return;
    const end = s.lastIndexOf("</dict>");
    s = s.slice(0, end) + "\t<key>" + key + "</key>\n\t" + xml + "\n" + s.slice(end);
  };
  addKey("NSAppTransportSecurity", "<dict>\n\t\t<key>NSAllowsLocalNetworking</key>\n\t\t<true/>\n\t</dict>");
  addKey("ITSAppUsesNonExemptEncryption", "<false/>");
  addKey("CFBundleLocalizations", "<array>\n\t\t<string>zh-Hant</string>\n\t\t<string>en</string>\n\t</array>");
  /* 11/17 App Store 審查（測試員 E）：App 內可以切英文介面，CFBundleLocalizations 要列 en；舊的只有 zh-Hant 的補上 */
  s = s.replace(/(<key>CFBundleLocalizations<\/key>\s*<array>\s*<string>zh-Hant<\/string>)(\s*<\/array>)/, "$1\n\t\t<string>en</string>$2");
  /* 權限說明（沒有這幾行，網頁一呼叫相機／麥克風，App 會直接閃退）：
     相機＝意見回饋附圖時選「拍照」（05-settings.js 的 <input type=file accept=image/*>，iOS 會給「拍照」選項；11/17 iMac G-2：02-shell.js 的 getUserMedia 掃 QR 已經沒有入口）；麥克風＋語音辨識＝聲控走棋（06-cpu.js webkitSpeechRecognition）；
     加入相簿＝分享面板裡按「儲存影像」存成績圖、週報圖 */
  addKey("NSCameraUsageDescription", "<string>在「意見回饋」附上圖片時，如果選「拍照」，會用相機拍一張附在回饋裡。照片只在你按下送出時，隨回饋一起傳給開發者。</string>");
  addKey("NSMicrophoneUsageDescription", "<string>使用「聲控走棋」時，聽你說出要走的棋。App 不錄音、不保存，也不會送給開發者。</string>");
  addKey("NSSpeechRecognitionUsageDescription", "<string>使用「聲控走棋」時，用 iOS 的語音辨識把你說的著法轉成文字（由 Apple 處理），App 不保存。</string>");
  addKey("NSPhotoLibraryAddUsageDescription", "<string>把每日同題成績圖、學習週報圖存到相簿。App 不會讀取你的相簿。</string>");
  s = s.replace(/(<key>CFBundleDevelopmentRegion<\/key>\s*<string>)en(<\/string>)/, "$1zh-Hant$2");
  s = s.replace(/(<key>UIRequiredDeviceCapabilities<\/key>\s*<array>\s*<string>)armv7(<\/string>)/, "$1arm64$2");
  s = s.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/,
    "$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2");
  if (GCW) {
    /* 7. 點小工具開 App：xqqianqiu://canju（src/native-bridge.js 不用改，07gc-native.js 收 appUrlOpen） */
    addKey("CFBundleURLTypes", "<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>com.raysonchen.xiangqiqianqiu.open</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>" + URL_SCHEME + "</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>");
    if (!s.includes("<string>" + URL_SCHEME + "</string>")) console.warn("⚠ Info.plist 已經有別的 CFBundleURLTypes，請在 Xcode → Info → URL Types 手動加一個 URL Scheme：" + URL_SCHEME);
  }
  if (s !== before) { fs.writeFileSync(p, s); changed.push("Info.plist（本機網路、加密聲明、arm64、iPhone 直式、繁中" + (GCW ? "、網址 " + URL_SCHEME + "://" : "") + "）"); }
}

/* ---------- 6. App 內外掛的註冊（11/18 iMac 套用 1041 起）：不再寫進 packageClassList ----------
   npx cap sync ios 會重寫 ios/App/App/capacitor.config.json，寫進 packageClassList 的會被拿掉（XQSpeech 不見、退回瀏覽器語音）。
   改成 XQBridgeViewController.swift 的 capacitorDidLoad() 用 bridge?.registerPluginInstance(...) 註冊（cap sync 不會影響）：
   XQSpeechPlugin 直接註冊；XQGameCenterPlugin、XQWidgetDataPlugin 有編進 App（--gc-widget）才用 NSClassFromString 找到註冊。
   這裡只做一件事：舊版 install-native 加進 packageClassList 的這三支拿掉（不然會註冊兩次：Capacitor 印「Overriding existing registered plugin」）。 */
{
  const OURS = BASE_CLASSES.concat(GCW_CLASSES);
  const p = path.join(APP, "capacitor.config.json");
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, "utf8");
    let cfg = null;
    try { cfg = JSON.parse(raw); } catch (e) { die(p + " 不是正確的 JSON：" + e.message); }
    const list = Array.isArray(cfg.packageClassList) ? cfg.packageClassList : null;
    const drop = list ? list.filter(c => OURS.includes(c)) : [];
    if (drop.length) {
      cfg.packageClassList = list.filter(c => !OURS.includes(c));
      fs.writeFileSync(p, JSON.stringify(cfg, null, "\t") + "\n");
      changed.push("capacitor.config.json 的 packageClassList 拿掉 " + drop.join("、") + "（改由 XQBridgeViewController 註冊）");
    }
  }
}

console.log(changed.length ? "✔ 已完成：\n  " + changed.join("\n  ") : "✔ 都裝過了，沒有要改的");
