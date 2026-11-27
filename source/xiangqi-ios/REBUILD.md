# 象棋千秋 iOS：從公開倉庫重建

這份給想自己編出 iOS App 的人看，例如審查者、開發者換電腦，或依 GPL 取得原始碼的人。

App 依 GPL-3.0-or-later 授權；象棋引擎 Pikafish 是 GPL-3。這個資料夾是 iOS App 的原生部分：Xcode 專案、Swift 原生程式、Capacitor 設定、建置腳本，以及「原生版網頁和公開網頁不同的地方」（`web-overlay/`）。網頁程式本身在這個倉庫的根目錄和 `source/`。

## 一、對應版本

| 項目 | 值 |
| --- | --- |
| App 內版號（`XQ_BUILD`） | `20261126-0626`（TestFlight 建置號 1） |
| 網頁基底：本倉庫的提交 | `8cf646457e1504338a053a809844c2acc13daca7`（標籤 `web-20261126-0626`） |
| iOS 原生專案：本倉庫的提交 | `8cf646457e1504338a053a809844c2acc13daca7`（同一個標籤的 `source/xiangqi-ios`） |
| 重建後 `www/index.html` 的 SHA-256 | `234487ab5c58c91544931db83cd30ff5084f221144b8b04b17503327acb454ca` |
| 安裝包 | 2026-11-26 從標籤 `web-20261126-0626` 建，上傳 TestFlight（建置號 1，只給內部測試群組；還沒上 App Store），`App.ipa` SHA-256 `bf2677b1…6f1da`。上一版 `20261123-1652` 見 [VERSIONS.md](VERSIONS.md) |

其他版本請見 [VERSIONS.md](VERSIONS.md)。

## 二、工具版本

| 項目 | 驗證過的版本 |
| --- | --- |
| macOS | 27.2（Apple 晶片） |
| Xcode | 27.2（27B52） |
| Node.js | 26.13.1（`package.json` 要求 ≥ 22） |
| npm | 11.20.0 |
| Capacitor | core、ios、cli 8.6.2（Swift Package Manager，`package-lock.json` 已釘住） |
| 最低 iOS | 17.0，支援 iPhone 和 iPad（`TARGETED_DEVICE_FAMILY = 1,2`，W107 #152 起；之前的建置只支援 iPhone） |

## 三、步驟

下面的 `$W` 是一個全新的空資料夾。

### 1. 取原始碼

```
git clone https://github.com/raysonchen2023-cloud/xiangqi-lab.git $W/web
git -C $W/web -c core.autocrlf=false checkout 58e0de2fae0b0da7272bacfe072f6ff1529844d0   # 原生專案用這個提交（見第一節）
cp -R $W/web/source/xiangqi-ios $W/ios      # 原生專案；網頁內容另外由下一步的 --ref 從標籤讀
cd $W/ios
npm ci
```

### 2. 做網頁成品

```
node scripts/copy-www.js --site $W/web --ref c1ecf3fd8f9db36c936ecd607eaf66e04dfa6063 --cdn-fetch
```

- 程式和小檔讀自 `--ref` 指定的提交（用 `git ls-tree`／`cat-file` 讀，不需要 checkout）。
- 圖片、音樂、3D 模型、大師棋譜這些大檔不在 git 裡，放在 CDN（`https://xiangqi-cdn.pages.dev/`）。`--cdn-fetch` 會依 CDN 的 `cdn-manifest.json` 下載缺少或內容不同的檔，約 840 MB，要連網。
- 腳本會在 `index.html` 的 `<meta charset>` 後面插入 `capacitor.js` 和 `native-bridge.js` 兩行。

### 3. 套用原生版覆蓋

```
patch -s www/index.html < web-overlay/index.html.patch
cp web-overlay/release.json web-overlay/native-build.json www/
shasum -a 256 www/index.html     # 應該等於第一節的 7b899589…
```

`copy-www.js` 會改寫 `scripts/.www-files.json`，變成這次複製的清單，再拿來給 `check-www.js` 用；套用覆蓋後，`index.html` 和 `release.json` 會被列為大小不符，這是預期的。（這裡講的是你自己跑 `copy-www.js` 新產生的清單；本倉庫存的 `scripts/.www-files.json` 已經改成覆蓋後的大小，見下方「已知差異」。）要和這一版的候選安裝包逐檔比對，請用倉庫裡原本那份清單（每個檔的大小，加上檔案內容的 sha1 前 12 碼；這是一般的 sha1，不是 git 的 blob id）：`git -C $W/web show HEAD:source/xiangqi-ios/scripts/.www-files.json`。

送審前的 P0-IMG 檢查（2026-11-23 起，AGENTS.md「P0 出口驗證要難作假」）：用倉庫那份清單檢查要送審的 `www`，加上跟 CDN 現行版比，再對要送審的 `.ipa` 跑金絲雀。

```
node scripts/check-www.js --dir www --list scripts/.www-files.json --cdn
node scripts/canary-www.js --pkg <要送審的 .ipa> --list scripts/.www-files.json --cdn --out <收據.json>
```

- `check-www.js` 比對清單裡每個檔的大小；有記 sha1 的檔，內容也要一樣。加 `--cdn` 時，包裡 `data/` 的檔再跟 CDN 現行版（`cdn-manifest.json`）逐檔比，App 會要的檔不同就擋（W42）。讀不到檔案清單（例如 `--list` 路徑打錯）或讀不到 CDN 清單都回 3（缺驗），不能當沒問題；要接值的參數放最後沒給值、或給了空值，回 1；也認 `--dir=X` 這種寫法；不認得的參數（打錯字，例如 `--cnd`）回 1。`--all` 只影響印多少，不影響判定。檔名大小寫要完全一樣（macOS 預設不分大小寫，iPhone 分），用目錄列表比對。
- `canary-www.js` 把 `www` 複製一份（macOS 用 APFS 複製，幾秒就好），在副本上做 27 種壞樣本，每一類固定測頭、中、尾三個檔，再加一個用種子挑的；全部候選挑頭、中、尾＋隨機，另外每一層（完整父目錄＋副檔名，例如 data/pset/ming/ 的 .png 自己一層；背景音樂照朝代）都挑 1 個，不抽樣；檔多的壞樣本一次在同一份副本弄壞好幾個，每個檔的錯誤都要出現在 ✘／△ 那一行；根目錄的程式檔、7 支核心程式每次全部都測；控制字元第一支程式檔 30 個全插、其他每支各插一個；nohash 另外測大於 20 MB 的檔。只改清單的壞樣本（nohash、cdnmiss、cdnfail）不複製整份 www（`--seed` 可以指定，收據會記下來）：拿掉首頁素材、拿掉一首背景音樂、拿掉一個引擎檔、拿掉一個核心程式、前幾大的檔只留一半、同樣大小但內容被換（另外固定測最大的兩個記了 sha1 的檔）、`native-bridge.js` 移到 App 程式後面、`native-bridge.js` 移到 `capacitor.js` 前面、程式檔插控制字元（check-www 認的 30 個控制字元都插過，插在檔頭、檔中、檔尾）、首頁素材改成大小寫不同的檔名、拿掉 capacitor.js／native-bridge.js 標籤、清單裡重要檔的雜湊拿掉（要回 3）、拿掉一個清單有但不在任何特定名單裡的檔（要報「少了」）、拿掉 `preload.json` 的 `big` 列的大檔、App 會要的檔換成舊副本而且清單也照舊副本改（只有跟 CDN 比才抓得到）、CDN 清單少一個 App 會要的檔（要回 3）、CDN 清單讀不到（要回 3）。再用同一支 `check-www.js`、跟正式用法一樣的參數檢查，每一種都要得到預期的結束代碼，而且錯誤裡要有那一處的檔名和原因。
- 結束代碼：0＝乾淨的全過、壞樣本都被抓到；4＝有壞樣本沒被抓到（檢查失靈，這一輪結果不算）；2＝測試不成立（含參數沒給值，以及 `check-www.js` 卡住超過時限）；3＝讀不到 CDN 清單（缺驗）。金絲雀先驗乾淨的那份，乾淨的有錯回 2，之後才讀 CDN。
- 子程序時限：金絲雀叫的每個子程序（`cp`、`unzip`、`git`、`check-www.js`）最多 300 秒，超過就殺掉。乾淨的那次、任何一個壞樣本、乾淨重跑或正式 `--cdn` 那次卡住，都判「測試不成立」（回 2），收據寫明哪一次卡住；但只要有一個壞樣本是真的沒被抓到，照樣回 4，不會被卡住蓋掉。`XQ_CANARY_SUB_MS` 只給自我測試縮短時限用：1 秒～1 小時之間取整數，大於 0 但不到 1 秒的拉到 1 秒，其他（沒給、0、負數、文字、Infinity、超過 1 小時）一律用 300 秒。金絲雀執行時出了沒預料到的錯（例如暫存資料夾不存在），也回 2；`--out` 的收據寫不進去時，原本全過的降成 2，失靈的 4 照樣是 4。
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
- **送審前人工核對工具（工具鎖定的 CI 上線前必做）：** 收據裡的 `toolsBound` 是工具自己算的，不能單獨當依據。打送審標籤前，用下面的指令確認本機跑的兩支工具跟 origin/main 逐位元相同（兩行都要印出 `一樣`）：
  ```
  git fetch origin main
  for f in check-www.js canary-www.js; do git diff --quiet origin/main -- source/xiangqi-ios/scripts/$f && echo "$f 一樣" || echo "$f 不一樣（不能送審）"; done
  ```
- **開發者 2026-11-24 的決定（#67 第十八次審查前）：** 被改壞的 check-www「刻意認出自己正在被金絲雀測、只對真包放水」這一類（靠參數、檔名、暫存路徑、同層、順序、時間、存狀態，或在收據最後才算雜湊時看得到原包），列為已知限制，不擋合併；不小心改壞、會讓錯的結果判成通過的照舊要改。工具鎖定的 CI 上線前，靠上面的人工核對擋。
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

- 2026-11-26（`20261126-0626`，TestFlight 建置號 1）：照本流程從標籤 `web-20261126-0626` 建（`8cf6464`，原生專案用同一個標籤的本資料夾），`index.html` 是 `234487ab…`，共 4,721 個檔。`web-overlay/release.json`、`native-build.json` 換成 0626 版（跟 `App.ipa` 裡的逐位元相同，2026-11-27 補進本倉庫）。建包時另外照當天清單做了三步，都已在本倉庫：迷宮材質 8 張登記在 `scripts/.www-files.json`、根目錄 `zh.js` 在標籤上已跟 `source/xiangqi-lab/src/zh.js` 相同（跟包裡的也相同）、pbxproj 的 `TARGETED_DEVICE_FAMILY = 1`。
- 2026-11-23（`20261123-1652`）：iOS 候選包照本流程從標籤 `web-20261123-1652` 建，原生專案用 `58e0de2`（同樣用 iMac 本機的 `tools-imac/stage-from-tag.sh` 串步驟），`index.html` 是 `7b899589…`，共 4,712 個檔。這一版的 `web-overlay/release.json`、`native-build.json` 已換成 1652 版。
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
- `canary-native.js` 把 `source/xiangqi-ios`（不含 `node_modules`、`build`、`Pods`、`DerivedData`、`ios/App/App/public`）和 check-native 會讀的兩支網頁檔（`07gc-native.js`、`01-board.js`）整份複製到暫存資料夾；有 `node_modules/@capacitor/ios` 的話，另外只複製 check-native 讀的 `CAPBridgeViewController.swift`、`CapacitorBridge.swift`。在副本上一次改壞一處，再用複製過去、內容一模一樣的 `check-native.js` 檢查。
  - 一共 250 種壞樣本，每一種都要被判失敗（結束代碼 1），而且錯誤裡要有那一條判斷的字。
  - **每個子條件、每個字都有自己的壞樣本**（#135 審查）：一條判斷裡用 `&&` 接起來的每一段、正規式裡用 `|` 列的每一個字，各做一個「只有它抓得到」的壞樣本；控制字元照 canary-www 的做法，30 個字元各插一次。
  - 乾淨的副本要全過。
  - 會改到兩份 Swift 的壞樣本，`native/ios` 和 `ios/App/App` 兩份一起改，只讓要測的那一條判斷抓得到。
- 結束代碼：
  - 0：壞樣本全部抓到；
  - 4：有壞樣本沒被抓到，代表 check-native 本身失靈，這一輪的結果不可信；
  - 2：測試不成立，例如乾淨的副本就沒過、壞樣本做不出來、參數錯。
- 自我測試 `test-canary-native.cjs`：
  - 壞樣本的名稱清單寫死在測試裡，只能增加：少一種、改名、換順序都紅，新增照樣綠；
  - 把 `check-native.js` 的每一條判斷逐一改成恆真，對應的壞樣本都要回 4（至少 153 條，寫死的那幾種一定要在）；
  - **子條件改壞清單**（寫死 143 條）：每一條只拿掉一個子條件或正規式裡的一個字，指定的壞樣本要回 4；
  - 訊息是組出來的幾條（兩份相同、括號沒收尾、控制字元、外掛不連網、install-native、establish 退回舊寫法）另外測。
- **沒辦法單獨測的子條件**（跟別條重疊，或在程式碼裡出不來），寫在自我測試的 `REDUNDANT` 清單和原因裡，例如：
  - 網路判斷裡的 `https?://`：check-native 先用 `swiftCode` 把字串換成空白、`//` 又是註解開頭，程式碼裡出不來；
  - 「establishNow 裡不能宣告 func verifyNow」：任何宣告都會多一個 `verifyNow` 字，先被「verifyNow 字數＝if 區塊數」抓到。
- 鎖住四段的三條（簽章在原文只能一處、在程式碼只能一處、不能在 `#if` 裡）各有專屬壞樣本 `vnDecoyBefore`、`vnDecoyOnly`、`vnIfDebug`（#143 審查找到的繞法：字串裡放簽章＋改名替身＋假 verifyNow、`#if DEBUG` 包住真的再用協定預設實作補一個假的），不列為重疊。
- 要有 `node_modules/@capacitor/ios` 或外掛已裝進 Xcode 專案才會跑的判斷（Capacitor 的 viewDidLoad、loadWebView、capacitorDidLoad、registerPluginInstance；packageClassList 列了 Game Center／小工具、Info.plist 的網址、pbxproj 登記了卻缺檔、外掛兩份相同）：CI 和一般的倉庫副本裡只會出警告，金絲雀在副本裡做一份合格的假 Capacitor 檔、假的「已裝進 Xcode」狀態，再各弄壞一處來測（#135 複審④）。
- 2026-11-23 做金絲雀時發現一個缺口：check-native 判斷「establish 一定經過 verifyNow」原本只數 `verifyNow(` 出現幾次，寫成 `true || verifyNow(…)` 就繞過了。#127 改成比對結構：`verifyNow` 只能以 `if verifyNow(timeout: 秒) {` 出現至少兩次、每個區塊裡要 `return .verified` 而且不接 `else`、合格區塊以外整份不能有 `.verified`、整份只有一個 `func verifyNow`。
- #142 起，check-native 把驗證用到的四段程式（`verifyNow`、`issueChallenge`、`randomHex`、`XQFlag`）去掉註解、壓掉空白後比 sha256 前 16 碼（`PINS`），簽章在原文和程式碼裡都要剛好一處、不能在 `#if` 裡、不准 `extension XQLoopbackServer`、四個名字只宣告一次。`verifyNow` 本體直接 `return true`、三元式、死碼、網址藏註解、XQFlag 恆真、考題固定答案這些繞法，金絲雀各有一個壞樣本（`vn…`）。**要正當修改這四段時，要在計分規則 PR 裡一起更新 `PINS`。**
- 還沒擋到（另開工單）：`verifySession` 換成假的 URLProtocol、全域覆寫 `==`、`origin` 改指向、`dropChallenge` 不作廢、whoami 不看 `originOK`。
- 子程序時限：金絲雀叫 `check-native.js` 最多 120 秒，卡住判「測試不成立」（回 2）；`XQ_CANARY_SUB_MS` 只給自我測試縮短用。
- 收據另外記 `origin/main` 上兩支工具的雜湊（`mainToolPins`）和提交（`mainCommit`），拿不到就是 null，給之後 CI 的工具鎖定核對。
- 不認得的參數（不是 `--` 開頭、也不是 `--only`／`--out` 後面的值）回 2，不再默默忽略。
- **Windows 取出時要用 LF**（`git config core.autocrlf false` 再取出）。金絲雀改檔前會先把 CRLF 換成 LF，但其他工具不一定會；用 autocrlf 取出的副本，有些比對會對不上。CI 和 iMac 是 LF，不受影響。
