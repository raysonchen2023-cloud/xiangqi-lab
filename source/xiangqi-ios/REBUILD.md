# 象棋千秋 iOS：從公開倉庫重建

這份給想自己編出 iOS App 的人看，例如審查者、開發者換電腦，或依 GPL 取得原始碼的人。

App 依 GPL-3.0-or-later 授權；象棋引擎 Pikafish 是 GPL-3。這個資料夾是 iOS App 的原生部分：Xcode 專案、Swift 原生程式、Capacitor 設定、建置腳本，以及「原生版網頁和公開網頁不同的地方」（`web-overlay/`）。網頁程式本身在這個倉庫的根目錄和 `source/`。

## 一、對應版本

| 項目 | 值 |
| --- | --- |
| App 內版號（`XQ_BUILD`） | `20261122-0804` |
| 網頁基底：本倉庫的提交 | `6f85af4c7aaefb61b6191e7d7762d5a246144ddc`（標籤 `web-20261122-0804`） |
| 重建後 `www/index.html` 的 SHA-256 | `0b3d774be9d27ff7e51d6cc8b62dcfdc0811c71917b8688383e99df32fddf7f4` |
| 候選安裝包 | 2026-11-22 從標籤 `web-20261122-0804` 建（開發簽章，iOS 候選驗收中；還沒上 TestFlight 或 App Store）。上一版 `20261121-0643` 見 [VERSIONS.md](VERSIONS.md) |

其他版本請見 [VERSIONS.md](VERSIONS.md)。

## 二、工具版本

| 項目 | 驗證過的版本 |
| --- | --- |
| macOS | 27.2（Apple 晶片） |
| Xcode | 27.2（27B52） |
| Node.js | 26.13.1（`package.json` 要求 ≥ 22） |
| npm | 11.20.0 |
| Capacitor | core、ios、cli 8.6.2（Swift Package Manager，`package-lock.json` 已釘住） |
| 最低 iOS | 17.0，只支援 iPhone |

## 三、步驟

下面的 `$W` 是一個全新的空資料夾。

### 1. 取原始碼

```
git clone https://github.com/raysonchen2023-cloud/xiangqi-lab.git $W/web
git -C $W/web -c core.autocrlf=false checkout 6f85af4c7aaefb61b6191e7d7762d5a246144ddc
cp -R $W/web/source/xiangqi-ios $W/ios      # 原生專案；用同一個倉庫裡含本資料夾的提交
cd $W/ios
npm ci
```

### 2. 做網頁成品

```
node scripts/copy-www.js --site $W/web --ref 6f85af4c7aaefb61b6191e7d7762d5a246144ddc --cdn-fetch
```

- 程式和小檔讀自 `--ref` 指定的提交（用 `git ls-tree`／`cat-file` 讀，不需要 checkout）。
- 圖片、音樂、3D 模型、大師棋譜這些大檔不在 git 裡，放在 CDN（`https://xiangqi-cdn.pages.dev/`）。`--cdn-fetch` 會依 CDN 的 `cdn-manifest.json` 下載缺少或內容不同的檔，約 840 MB，要連網。
- 腳本會在 `index.html` 的 `<meta charset>` 後面插入 `capacitor.js` 和 `native-bridge.js` 兩行。

### 3. 套用原生版覆蓋

```
patch -s www/index.html < web-overlay/index.html.patch
cp web-overlay/release.json web-overlay/native-build.json www/
shasum -a 256 www/index.html     # 應該等於第一節的 0b3d774b…
```

`copy-www.js` 會改寫 `scripts/.www-files.json`，變成這次複製的清單，再拿來給 `check-www.js` 用；套用覆蓋後，`index.html` 和 `release.json` 會被列為大小不符，這是預期的。（這裡講的是你自己跑 `copy-www.js` 新產生的清單；本倉庫存的 `scripts/.www-files.json` 已經改成覆蓋後的大小，見下方「已知差異」。）
要和這一版的候選安裝包逐檔比對，請用倉庫裡原本那份清單（每個檔的大小，加上檔案內容的 sha1 前 12 碼；這是一般的 sha1，不是 git 的 blob id）：`git -C $W/web show HEAD:source/xiangqi-ios/scripts/.www-files.json`。

`web-overlay/index.html.patch` 只有原生版才需要的 6 段：
- 原生版不用網頁的版本更新和 Service Worker（`appVer`、`xqWebUpdateOn`、`XQNet version`）。
- 「檢查更新」改成顯示「新版由 App Store／Google Play 更新」。
- 原生相容提示框可以捲動（`m.css`）。
- 冷啟提示的文字。

`release.json`、`native-build.json` 是這一版 iOS 包的版本清單，內容和網頁版不同。

### 4. 同步到 Xcode 專案並建置

```
npx cap sync ios
node scripts/install-native.js
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination "generic/platform=iOS" build
```

- 只想確認能不能編，可以用模擬器且不簽章：`-configuration Debug -destination "generic/platform=iOS Simulator" CODE_SIGNING_ALLOWED=NO`。
- **簽章要自己填：** 專案裡的 `DEVELOPMENT_TEAM` 是空的。請在 Xcode → Signing & Capabilities 選你自己的 Team，必要時改 Bundle Identifier。用免費 Apple ID 就能簽開發版，裝到你自己的 iPhone。

## 四、已知差異

- 2026-11-22（`20261122-0804`）：iOS 候選包直接照本流程從標籤 `web-20261122-0804` 建（iMac 本機的輔助腳本 `tools-imac/stage-from-tag.sh`，不在本倉庫；它只是把本節步驟串起來，照第三節「步驟」的指令手動做，結果相同），所以安裝包和本流程的重建結果相同：`index.html` 是 `0b3d774b…`，共 4,700 個檔；Release 實機版、Debug 模擬器版 `xcodebuild` 都成功。
- `web-overlay/release.json`、`native-build.json` 是「這一版」iOS 包的版本清單，每一版重產：`release.json` 是標籤的網頁版 `release.json` 加上原生欄位（`html` 是套補丁後 `index.html` 的 sha1，另有 `sharedWebCommit`、`packageFiles` 的 SHA-256）；`native-build.json` 是 `copy-www.js` 產生的。0804 這份的 `bytes`（119,126,859）少算了 `--cdn-fetch` 從 CDN 換進來的檔，實際安裝內容約 962 MB；這是 `copy-www.js` 先算大小、後下載 CDN 檔造成的，下一版起已修正（`bytes`、`byDir` 會在寫檔前重算）。0804 的這份清單保留原樣，因為它就是候選包裡的那一份，改了就和安裝包不一致。`scripts/.www-files.json` 裡 `index.html`、`release.json`、`native-build.json` 這三筆已經是套用覆蓋後的大小，所以直接用本倉庫存的這份清單時，`check-www.js` 不會報大小不符（和上方「自己跑 `copy-www.js` 新產生的清單」那種情況不同）。
- `index.html.patch` 套到新版 `index.html` 時，`patch` 可能因為行號位移留下 `www/index.html.orig`，要刪掉，不能進安裝包。
- 上一版 `20261121-0643` 的已知差異（那個安裝包是當時 Windows 的更新包，不是照本流程建的）：
  - `park3d.js`：安裝包是 CRLF 換行，本流程重建是 LF，內容相同。
  - `data/park/classic_360_bookcliff.webp`：安裝包裡有，當時公開倉庫和 CDN 都沒有。`park3d.js` 有引用這張圖（classic 朝代的長卷），網頁版因此從 0643 起缺長卷（W61），0804 已補上 CDN。
- 重建結果取決於 CDN 當時的內容。CDN 換檔之後，`--cdn-fetch` 會拿到新檔；要逐位元重現舊版，請比對 `scripts/.www-files.json`。

## 五、原生程式說明

- `ios/App/App/XQBridgeViewController.swift`：Capacitor 主畫面。改成從 App 內的本機伺服器載入網頁，並先確認回應的是自己的伺服器。
- `ios/App/App/XQLoopbackServer.swift`：只聽 127.0.0.1 的小型 HTTP 伺服器，送出跨來源隔離標頭，讓引擎可以多執行緒。
- `ios/App/App/XQSpeechPlugin.swift`：報棋語音（AVSpeechSynthesizer）。
- `native/ios/`：上面這些檔的來源版本，由 `install-native.js` 裝進 Xcode 專案。另有 Game Center（`XQGameCenterPlugin.swift`）和小工具資料（`XQWidgetDataPlugin.swift`）兩支外掛，目前的版本沒有編入（需要付費開發者帳號）。
- `native/ios-widget/`：「今日茶單」小工具，目前的版本沒有編入。
- `src/native-bridge.js`：網頁和原生之間的橋接，`copy-www.js` 會把它複製進 `www/`。

## 六、不在這裡的東西

簽章憑證、描述檔、Apple 帳號與 Team ID、Xcode 個人設定（xcuserdata）、建置產物（DerivedData、`ios/App/App/public/`、`www/`、`node_modules/`）。

## 原生檢查的金絲雀（2026-11-23 起，AGENTS.md「P0 出口驗證要難作假」）

```
node scripts/canary-native.js --out <收據.json>
```

- `check-native.js` 是原生碼的原始碼比對檢查：兩份 Swift 要一樣、埠號 47821、本機伺服器的一次性考題驗證、驗證通過才載入畫面、外掛不連網、不讀玩家 ID 等等。
- `canary-native.js` 會把 `source/xiangqi-ios`（不含 node_modules）和 check-native 會讀的兩支網頁檔（`07gc-native.js`、`01-board.js`）整份複製到暫存資料夾，在副本上一次改壞一處，再用複製過去、內容一模一樣的 `check-native.js` 檢查。
  - 一共 73 種壞樣本，每一種都要被判失敗（結束代碼 1），而且錯誤裡要有那一條判斷的字。
  - 乾淨的副本要全過。
  - 會改到兩份 Swift 的壞樣本，`native/ios` 和 `ios/App/App` 兩份一起改，只讓要測的那一條判斷抓得到。
- 結束代碼：
  - 0：壞樣本全部抓到；
  - 4：有壞樣本沒被抓到，代表 check-native 本身失靈，這一輪的結果不可信；
  - 2：測試不成立，例如乾淨的副本就沒過、壞樣本做不出來、參數錯。
- 自我測試 `test-canary-native.cjs` 會把 `check-native.js` 的每一條判斷逐一改成恆真，對應的壞樣本都要回 4。目前涵蓋 60 條，另外 5 條訊息是組出來的，另外測。
- 沒涵蓋的有兩類，在 CI 和一般的倉庫副本裡，check-native 只會出警告：
  - 要有 `node_modules/@capacitor/ios` 才會跑的 Capacitor 判斷；
  - Game Center／小工具已經裝進 Xcode 專案之後才會跑的 packageClassList、Info.plist 判斷。
- 2026-11-23 做金絲雀時發現一個缺口：check-native 判斷「establish 一定經過 verifyNow」原本只數 `verifyNow(` 出現幾次，寫成 `true || verifyNow(…)` 就繞過了。現在改成每一個 `verifyNow(` 都要是 `if verifyNow(timeout: 秒) {`，而且回 verified 的次數不能比它多。
