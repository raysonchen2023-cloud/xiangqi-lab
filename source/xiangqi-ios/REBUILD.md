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
要和這一版的候選安裝包逐檔比對，請用倉庫裡原本那份清單（每個檔的大小，加上 git 追蹤檔的 sha1 前 12 碼）：`git -C $W/web show HEAD:source/xiangqi-ios/scripts/.www-files.json`。

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

- 2026-11-22（`20261122-0804`）：iOS 候選包直接照本流程從標籤 `web-20261122-0804` 建（iMac 本機的輔助腳本 `tools-imac/stage-from-tag.sh`，不在本倉庫；它只是把本節步驟串起來，照本節指令手動做，結果相同），所以安裝包和本流程的重建結果相同：`index.html` 是 `0b3d774b…`，共 4,700 個檔；Release 實機版、Debug 模擬器版 `xcodebuild` 都成功。
- `web-overlay/release.json`、`native-build.json` 是「這一版」iOS 包的版本清單，每一版重產：`release.json` 是標籤的網頁版 `release.json` 加上原生欄位（`html` 是套補丁後 `index.html` 的 sha1，另有 `sharedWebCommit`、`packageFiles` 的 SHA-256）；`native-build.json` 是 `copy-www.js` 產生的。`scripts/.www-files.json` 裡 `index.html`、`release.json`、`native-build.json` 這三筆已經是套用覆蓋後的大小，所以直接用本倉庫存的這份清單時，`check-www.js` 不會報大小不符（和上方「自己跑 `copy-www.js` 新產生的清單」那種情況不同）。
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
