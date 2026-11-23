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

`copy-www.js` 會改寫 `scripts/.www-files.json`，變成這次複製的清單，再拿來給 `check-www.js` 用；套用覆蓋後，`index.html` 和 `release.json` 會被列為大小不符，這是預期的。（這裡講的是你自己跑 `copy-www.js` 新產生的清單；本倉庫存的 `scripts/.www-files.json` 已經改成覆蓋後的大小，見下方「已知差異」。）要和這一版的候選安裝包逐檔比對，請用倉庫裡原本那份清單（每個檔的大小，加上檔案內容的 sha1 前 12 碼；這是一般的 sha1，不是 git 的 blob id）：`git -C $W/web show HEAD:source/xiangqi-ios/scripts/.www-files.json`。

送審前的 P0-IMG 檢查（2026-11-23 起，AGENTS.md「P0 出口驗證要難作假」）：用倉庫那份清單檢查要送審的 `www`，加上跟 CDN 現行版比，再對要送審的 `.ipa` 跑金絲雀。

```
node scripts/check-www.js --dir www --list scripts/.www-files.json --cdn
node scripts/canary-www.js --pkg <要送審的 .ipa> --list scripts/.www-files.json --cdn --out <收據.json>
```

- `check-www.js` 比對清單裡每個檔的大小；有記 sha1 的檔，內容也要一樣。加 `--cdn` 時，包裡 `data/` 的檔再跟 CDN 現行版（`cdn-manifest.json`）逐檔比，App 會要的檔不同就擋（W42）。讀不到檔案清單（例如 `--list` 路徑打錯）或讀不到 CDN 清單都回 3（缺驗），不能當沒問題；要接值的參數放最後沒給值、或給了空值，回 1；也認 `--dir=X` 這種寫法；不認得的參數（打錯字，例如 `--cnd`）回 1。`--all` 只影響印多少，不影響判定。檔名大小寫要完全一樣（macOS 預設不分大小寫，iPhone 分），用目錄列表比對。
- `canary-www.js` 把 `www` 複製一份（macOS 用 APFS 複製，幾秒就好），在副本上做 25 種壞樣本，每一類固定測頭、中、尾三個檔，再加一個用種子挑的；全部候選挑頭、中、尾＋隨機，另外每一層（完整父目錄＋副檔名，例如 data/pset/ming/ 的 .png 自己一層；背景音樂照朝代）都挑 1 個，不抽樣；檔多的壞樣本一次在同一份副本弄壞好幾個，每個檔的錯誤都要出現在 ✘／△ 那一行；根目錄的程式檔、7 支核心程式每次全部都測；控制字元第一支程式檔 30 個全插、其他每支各插一個；nohash 另外測大於 20 MB 的檔。只改清單的壞樣本（nohash、cdnmiss、cdnfail）不複製整份 www（`--seed` 可以指定，收據會記下來）：拿掉首頁素材、拿掉一首背景音樂、拿掉一個引擎檔、拿掉一個核心程式、前幾大的檔只留一半、同樣大小但內容被換（另外固定測最大的兩個記了 sha1 的檔）、`native-bridge.js` 移到 App 程式後面、`native-bridge.js` 移到 `capacitor.js` 前面、程式檔插控制字元（check-www 認的 30 個控制字元都插過，插在檔頭、檔中、檔尾）、首頁素材改成大小寫不同的檔名、拿掉 capacitor.js／native-bridge.js 標籤、清單裡重要檔的雜湊拿掉（要回 3）、拿掉一個清單有但不在任何特定名單裡的檔（要報「少了」）、拿掉 `preload.json` 的 `big` 列的大檔、App 會要的檔換成舊副本而且清單也照舊副本改（只有跟 CDN 比才抓得到）、CDN 清單少一個 App 會要的檔（要回 3）、CDN 清單讀不到（要回 3）。再用同一支 `check-www.js`、跟正式用法一樣的參數檢查，每一種都要得到預期的結束代碼，而且錯誤裡要有那一處的檔名和原因。
- 結束代碼：0＝乾淨的全過、壞樣本都被抓到；4＝有壞樣本沒被抓到（檢查失靈，這一輪結果不算）；2＝測試不成立（含參數沒給值）；3＝讀不到 CDN 清單（缺驗）。金絲雀先驗乾淨的那份，乾淨的有錯回 2，之後才讀 CDN。
- 給了 `--pkg`，金絲雀檢查的就是安裝包裡那份 `public`（`.ipa` 會先解開 `Payload/*.app/public`），不能再另外給 `--dir`；收據的包跟被檢查的內容一定是同一份。
- 收據記下每一種壞樣本挑了哪個檔、種子、兩支工具的 SHA-256（CRLF 換成 LF）、`public` 的樹雜湊、安裝包的 SHA-256、清單的 SHA-256 和 origin/main 那份清單的 SHA-256、origin/main 上兩支工具的 SHA-256、比對時本機 origin/main 的提交、包裡 `release.json` 的版號。
- `.ipa` 會整包解開（不靠萬用字元），解完核對 public 底下的檔數跟 zip 目錄一樣；zip 裡有重複的檔名項目就回 2。`--seed` 要是非負整數。
- **送審只看金絲雀的收據。** 上面那道單獨的 `check-www.js … --cdn` 指令只是給人看的，結果不算數：金絲雀自己會在副本上做乾淨的那次檢查和每個壞樣本，判定都來自那裡。
- 每一次檢查（乾淨的、每個壞樣本、`--cdn` 那次）都在各自全新的暫存資料夾裡、同樣形狀的路徑上跑（`<暫存>/xq-XXXX/<亂數>/Payload/App.app/public`），清單和 CDN 清單也寫在那一次自己的資料夾、檔名固定（`list.json`、`cdn-manifest.json`），參數除了亂數路徑完全一樣；每次跑完立刻刪掉，檢查時看不到別份副本。乾淨的那次除了最先跑，也在壞樣本中間隨機一個位置和最後各用全新副本再跑一次，要都回 0，不一致就判失靈（4）。
- 整批缺檔：`nodata`（整個 `data/` 不見）、`rmdir`（拿掉檔案最多的 3 個素材目錄）、`mani`（`release.json` 和三份清單檔各拿掉一次）每次都測。
- 執行環境：金絲雀要用乾淨的 `node` 直接跑。`NODE_OPTIONS` 有值，或 node 帶了參數（`--require`、`--import` 等），金絲雀直接回 2；叫 `check-www.js` 時拿掉所有 `NODE_*` 環境變數。收據記 node 版本、node 參數和 `NODE_OPTIONS`。
- `check-www.js --cdn`（自己下載正式 CDN 清單）那次要回 0，而且「跟 CDN 現行版比了 N 個檔」的 N 要跟金絲雀用本機那份 CDN 清單檢查時一樣，才算正式 CDN 那條路驗過。
- 加了 `--cdn`，卻讀不到 `check-www.js` 裡的正式 CDN 網址，回 2。
- 比對錯誤訊息要精確：檔名後面要接行尾或分隔字元，「少了 park3d.json」那行不算抓到「少了 park3d.js」。
- **已知限制（設計上修不掉）：** 改壞的 check-www 如果「只牽涉一個檔就放行」，真包剛好只少一個檔時，金絲雀測不出來（每個壞樣本都弄壞好幾個檔或測得到）；刻意偵測執行環境的工具也可能分得出哪一次是真包。這兩類要靠兩件事擋：CI 用假 www 跑的自我測試（`test-canary-www.cjs`），以及**工具鎖定**（收據的工具雜湊要等於 main 版，CI 用 main 版工具重跑）。**工具鎖定是送審前置條件**，還沒做好之前，送審不能只看這張收據，還要開發者本人看實機三項。
- 之後要改 `check-www.js`：自我測試裡大約 50 條改壞案例是照 check-www 的原句比對的，原句改了，那幾條會報「測試要改的那一行還在」而紅。照 AGENTS.md「guard-base 紅燈不越過」拆成依序合併的 PR：先在測試加新原句的案例（舊的留著），再改 check-www，最後拿掉舊案例。
- 已知限制：只有一支檔、或極少數檔失靈的改壞，抽樣不一定抽得到；所以下面這些每次都測：控制字元和缺檔測核心程式、根目錄程式檔、引擎；「內容被換掉」（swap）測 index.html、7 支核心程式、根目錄的 .js／.mjs、最大的兩個記了雜湊的檔、所有大於 20 MB 記了雜湊的檔。
- git 用 `--no-replace-objects`、拿掉 `GIT_*` 環境變數讀 origin/main；收據記下實際用到的 git、unzip 路徑。
- 種子：有安裝包時由「安裝包 SHA-256＋origin/main 提交」推出來，重跑一樣，不能自己挑；給了 `--seed` 的收據一律不算送審用。
- 送審只收 `full: true` 的收據。金絲雀本身要回 0（全部抓到；回 4 或 2 都不算），而且下面五個條件都要成立：`--pkg` 給的是 `.ipa`（`.app` 只有資料夾的樹雜湊，對不到送審的檔）、加了 `--cdn`（正式 CDN；`--cdn-manifest` 給的本機檔不算）、沒有 `--only`、用的清單和 `check-www.js`、`canary-www.js` 兩支工具都跟 `origin/main` 那一版一模一樣（拿包重產的清單、改過的工具都不算）、清單的 `siteVersion` 跟包裡 `public/release.json` 的 `version` 一樣。要在有 `origin` 的倉庫裡跑，先 `git fetch origin main`（收據的 `bind.mainCommit` 記下比對時 origin/main 在哪一版）。正式 CDN 的網址只定義在 `check-www.js` 一個地方，金絲雀從那裡讀。
- 工具雜湊和清單雜湊都是工具自己算的，只抓得到不小心改過；故意偽造要靠之後的 CI 核對（打送審標籤前，CI 用 main 版工具和 main 的清單重算收據裡的 `toolPins`、`bind.listMainSha256`）。只核對雜湊不夠：執行環境可以被動過，工具一個字沒改也能拿到 0，所以 CI 要拿收據記的那個 `.ipa`，用 main 版工具在乾淨的環境重跑金絲雀，結果要一樣。**這個 CI 核對還沒做（後續工單，跟 Android 的工具鎖定 CI 一起），做好之前，送審不能只認這張收據，還要照 AGENTS.md 由開發者本人看實機三項。**

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
