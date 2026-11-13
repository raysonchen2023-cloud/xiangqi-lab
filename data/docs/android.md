# Android 與 F-Droid 路線圖

最後核對：2026 年 11 月 13 日（評比第 14 輪 F3 寫成；第 15 輪 F3、F4 補上編譯與可重現建置）。這一頁是計畫和現況整理，不是法律意見。**11/13 已經在開發者電腦上編出 debug APK**（約 97 MB），兩次乾淨編譯逐位元相同；**還沒有在任何手機上跑過**，也還沒有正式簽章的發布版。11/13 在電腦的 Android 模擬器上跑過：新版 WebView 第一次開引擎能下棋，但再開一次跨來源隔離就消失；開發者決定改 App 原生碼修（Service Worker 的請求也補標頭），**已正式採用、重編 debug APK，模擬器上清掉資料連開 3 次都正常**（見〈模擬器驗證〉）。同一天再補上**發布版設定與外部可重建**（R8、版本號規則、AAB、Gradle 相依驗證、`xiangqi-android/REBUILD.md`；在全新資料夾、全新快取下重建，APK 拿掉簽章後逐位元相同，見〈發布版設定與乾淨環境重建〉），以及**舊 WebView 的降級提示**（原生 App 不再自動重整，改說明要更新什麼、哪些功能還能用，見〈舊 WebView 降級提示〉）；正式上傳金鑰仍由開發者自己產生。

## 先講結論

- **debug APK 編得出來了，而且可重現。** 開發者電腦上的 `xiangqi-android/` 是 Capacitor 8.6.2 專案；11/13 開發者同意後，在使用者資料夾裝了 JDK 21、Android SDK 命令列工具、platform 36、build-tools，用專案的 Gradle wrapper 編出 debug APK，原生碼**第一次編就通過、沒有改程式邏輯**。之後模擬器驗證找到「再開 App 隔離就掉」的問題，原生碼補了 Service Worker 那條路，重編（現在的 APK SHA-256 `8265202f…`）。清掉所有 build 資料夾連編兩次，APK 逐位元相同；複製到另一個資料夾、換一把 debug 金鑰再編，拿掉簽章區塊後也逐位元相同（見〈編譯與可重現建置〉）。APK 裡沒有 Google Play 服務、Firebase。
- **最大的技術風險是引擎。** Pikafish 是多執行緒 WebAssembly，要 `SharedArrayBuffer`。Android 的 WebView 不支援網頁版用的 COOP／COEP 跨來源隔離；2026 年 10 月 21 日 androidx.webkit 1.18.0 才新增官方的開法（允許清單＋`Document-Isolation-Policy` 標頭）。骨架照這個寫了，編譯通過，Android 模擬器（WebView 154）上跨來源隔離和引擎都驗過，但**沒有實機驗證**；手機上的 WebView 太舊就不能用（模擬器的 WebView 133 就不行），要有備案（Android 版改用 NDK 編原生 Pikafish）；在備案做好以前，App 遇到太舊的 WebView 會跳說明請玩家更新，不再自動重整（〈舊 WebView 降級提示〉）。
- **發布版和外部重建準備好了（不含正式金鑰）。** release 開 R8、版本號照網站版本號算（`20261113-0540` → versionCode `26111305`）、`bundleRelease` 編得出 AAB；工具鏈和所有 Gradle 相依都釘住版本和雜湊。照 `xiangqi-android/REBUILD.md` 在全新資料夾、全新快取、全新金鑰下重建，debug APK、release APK 拿掉簽章後逐位元相同，AAB 解開後內容相同。正式上傳金鑰和 Play App Signing 由開發者自己做。
- **兩條上架路線要的東西不一樣。** Google Play 要付費帳號、身分驗證、封閉測試、資料安全表單、AAB 格式；F-Droid 要它的伺服器能從公開原始碼建出 APK，而且不收預先編好的二進位檔。
- **F-Droid 會標的反特性（Anti-Features）：** NonFreeAssets（素材 CC BY-NC-SA 4.0、權重不得商用）、NonFreeNet（線上大廳 EMQX Cloud、意見回饋 Google 表單），以及很可能 Tracking（三種匿名資料預設開）。都是「收錄但標示」，不是拒收。
- **建議順序：** 先在手機上驗證引擎（決定走 WebView 還是原生），再做 Google Play 內部測試；F-Droid 等「預編的 `pikafish.wasm`」和「大檔只在 CDN」兩件事有解法再送。

## 跟 iOS 的做法比較

iOS 準備在 `xiangqi-ios/`（11/13，見那個資料夾的 `IMAC-DAY.md`、`notes/wasm-threads.md`）。Android 照同一個思路，但 WebView 不一樣：

| 項目 | iOS（`xiangqi-ios/`） | Android（`xiangqi-android/`） |
|---|---|---|
| App 裡網頁的來源 | App 內開本機伺服器 `http://127.0.0.1:47821` | Capacitor 內建的攔截 `https://localhost`（不開埠） |
| 引擎要的跨來源隔離 | WebKit 在 loopback 來源認 COOP／COEP，`crossOriginIsolated` 會是 true | WebView **不認** COOP／COEP；要 androidx.webkit 1.18.0 的允許清單＋`Document-Isolation-Policy` |
| 存檔跟著來源走 | 埠號 47821 上架後不能改 | `https://localhost` 上架後不能改（`capacitor.config.json` 的 `server.androidScheme`、`hostname`） |
| 網頁成品從哪來 | `scripts/copy-www.js`：開發者電腦上已發布的 commit＋大檔（855 MB） | `scripts/make-www.js`：**只用公開倉庫**（F-Droid 拿得到的），先跑 `source/check-build.js` 確認 `index.html` 是原始碼組出來的 |
| 原生碼 | Swift：`XQLoopbackServer.swift`、`XQBridgeViewController.swift` | Java：`MainActivity.java`、`XQWebViewClient.java`（已編譯、模擬器驗過，還沒上真機） |
| 原生橋接（觸覺、分享、關 service worker…） | `src/native-bridge.js` | **還沒做**；可以沿用 iOS 那支，外掛換 Android 版 |
| 網址被當成「本機測試」 | 要套 N1～N3（`127.x`） | 一樣要套：`localhost` 也會被 `net.js` 當成測試機、進測試房（見下面〈要做的事〉第 3 步） |

## 引擎多執行緒：COOP／COEP 與 SharedArrayBuffer

**問題：** 引擎用 Emscripten `-pthread` 編，記憶體是共用的（`SharedArrayBuffer`）；`engine.js` 沒有 `crossOriginIsolated` 就直接丟錯，沒有單執行緒備援。網頁版靠 `sw.js` 替每個回應補 COOP／COEP 標頭。Android WebView 不行：Chromium 的說法是 WebView 沒有「每個網站一個渲染程序」的隔離，所以一直不開 `SharedArrayBuffer`，也不支援 COOP。

**官方開法（2026 年 10 月）：** androidx.webkit 1.18.0 新增 `Profile#setCrossOriginIsolatedAllowlist`。App 把信任的來源放進允許清單，該來源的頁面再帶 `Document-Isolation-Policy` 回應標頭，就能用 `SharedArrayBuffer`；官方文件提醒只能放自己信任的來源。手機上的 WebView 版本要支援（`WebViewFeature.CROSS_ORIGIN_ISOLATED_ALLOWLIST`），要在執行時查。

**骨架的寫法（11/13 編譯通過；`Profile#setCrossOriginIsolatedAllowlist(Set<String>)` 和 `WebViewFeature.CROSS_ORIGIN_ISOLATED_ALLOWLIST` 用 `javap` 對過 androidx.webkit 1.18.0 的類別；還沒上機）：**

1. `android/variables.gradle`：`androidxWebkitVersion` 從 Capacitor 預設的 1.14.0 改成 1.18.0；`app/build.gradle` 加 `androidx.webkit` 相依。
2. `MainActivity.java`：在 Capacitor 開始載入頁面**之前**，查 `MULTI_PROFILE`、`CROSS_ORIGIN_ISOLATED_ALLOWLIST` 兩個功能，有就把 `https://localhost` 放進允許清單；再換成下面的 WebViewClient、從頭載入一次。
3. `XQWebViewClient.java`：繼承 Capacitor 的 `BridgeWebViewClient`，只替 `https://localhost` 的回應補 `Document-Isolation-Policy: isolate-and-require-corp`、`Cross-Origin-Opener-Policy`、`Cross-Origin-Embedder-Policy`、`Cross-Origin-Resource-Policy: same-origin`（Capacitor 的本機伺服器沒有加自訂標頭的設定，讀 `@capacitor/android` 8.6.2 原始碼確認）。跨站從 CDN 補的檔不經過這裡，CDN 已帶 `Cross-Origin-Resource-Policy: cross-origin`。這四個標頭只寫在 `XQWebViewClient.ISOLATION_HEADERS` 一份，補標頭的是 `addIsolationHeaders()`。
4. `MainActivity.installServiceWorkerClient()`（11/13 模擬器驗證後加，開發者決定採用）：Service Worker（網站的 `sw.js`）發的請求**不經過 WebViewClient**，走 `ServiceWorkerController` 的 `ServiceWorkerClient`；Capacitor 8.6.2 的 `Bridge` 自己設了一個、不加標頭，`sw.js` 存進快取的頁面就沒有 `Document-Isolation-Policy`，第二次開 App 起隔離就掉。在 `super.load()` 之後換成自己的 `ServiceWorkerClient`：一樣交給 Capacitor 的本機伺服器，再呼叫同一個 `addIsolationHeaders()`。跟 Capacitor 一樣看 `server.resolveServiceWorkerRequests` 設定。`check-skeleton.js` 的 `native.swclient` 檢查有沒有設、標頭是不是只有一份。

**怎麼驗證（裝好工具鏈、接上手機以後）：** 電腦 Chrome 開 `chrome://inspect` 連 App 的 WebView（要先在除錯版把 `webContentsDebuggingEnabled` 打開），主控台看 `crossOriginIsolated`、`typeof SharedArrayBuffer`、`location.origin` 要是 `true`、`"function"`、`"https://localhost"`；先設測試房 `localStorage.setItem("xq_netRoot", JSON.stringify("xq_test"))`，再挑戰電腦下三步、開飛航模式重下一盤、切背景 10 分鐘回來再下。

**備案：**

| 備案 | 做法 | 好處 | 代價 |
|---|---|---|---|
| B：NDK 原生 Pikafish（建議當主線評估） | Pikafish C++ 用 Android NDK 編成 `.so`（arm64-v8a＋NEON），寫一個 Capacitor 外掛收發 UCI 文字；`engine.js` 在原生 App 改走外掛 | 不用 `SharedArrayBuffer`、不挑 WebView 版本；原生比 WebAssembly 快；**F-Droid 可以用 `ndk:` 欄位從原始碼編**，也解掉「預編的 `pikafish.wasm`」問題 | 要改 `uci.cpp` 的輸入輸出、處理背景暫停；第一次做約 3～5 天；改的原始碼要公開（GPL） |
| C：單執行緒 WebAssembly | 拿掉 `-pthread` 重編，引擎放進一個 Worker 用 `postMessage` 溝通 | 任何 WebView 都能跑 | 只有 1 個執行緒，棋力明顯下降、高難度要重新校準；要改 Pikafish 的 `thread.cpp` |

## 骨架現況（做到哪）

| 檔案（`xiangqi-android/` 底下） | 內容 | 狀態 |
|---|---|---|
| `package.json`、`package-lock.json` | `@capacitor/android`、`@capacitor/core` 8.6.2（MIT），`@capacitor/cli` 8.6.2（開發用） | npm 裝好（98 個套件、28 MB，沒有任何 .jar／.so 等二進位檔） |
| `capacitor.config.json` | appId `com.raysonchen.xiangqiqianqiu`（跟 iOS 一樣，待決定）、名稱「象棋千秋」、來源 `https://localhost`、關掉網頁除錯 | 寫好 |
| `android/` | `npx cap add android` 產生的 Gradle 專案（compileSdk／targetSdk 36、minSdk 24＝Android 7.0、Gradle 8.14.3、Android Gradle 外掛 8.13.0） | 產生成功；11/13 `gradlew assembleDebug` 編譯通過 |
| `android/gradle/wrapper/gradle-wrapper.properties` | 加 `distributionSha256Sum`（Gradle 8.14.3 all 的官方 SHA-256），wrapper 下載後自己核對；`gradle-wrapper.jar` 的 SHA-256 也對過官方 | 11/13 改好 |
| `android/build.gradle`、`app/build.gradle` | 拿掉 `com.google.gms:google-services` 外掛和套用它的段落；加 `dependenciesInfo { includeInApk = false; includeInBundle = false }`（F-Droid 不收 Google 加密的相依資訊區塊） | 改好 |
| `android/.gitignore` | 改成讓 Capacitor 產生的設定檔可以提交，F-Droid 建置時就不用跑 Capacitor CLI（CLI 8 要 Node 22，F-Droid 的 Debian 是 Node 20） | 改好 |
| `MainActivity.java`、`XQWebViewClient.java` | 跨來源隔離允許清單＋標頭，Service Worker 的請求也補（上一節） | 編譯通過；11/13 補 Service Worker 那條路後重編，模擬器（WebView 154）驗過；還沒上真機 |
| `scripts/make-www.js` | 只用公開倉庫做網頁成品；可以直接寫進 `android/app/src/main/assets/public`；`--assets` 補只在 CDN 的大檔；`native-build.json` 不寫建置時間（才能逐位元重現） | 11/13 對公開倉庫 `20261113-0452` 實測：check-build 一致，513 個檔、106.9 MB；第 15 輪對 `20261113-0540`：517 個檔、107.0 MB，用來編 APK |
| `scripts/repro-check.js` | 可重現建置檢查：清掉所有 build 資料夾連編兩次、比對 APK（整檔、拿掉簽章區塊後、每個項目解壓後、dex、資源、assets、順序、時間）、掃 Google 服務、寫建置紀錄；`--compare`、`--inspect` 只看現成的 APK | 11/13 寫好、實際跑過 |
| `build-records/debug-20261113.json`、`toolchain-20261113.json` | debug 建置紀錄（工具版本、網站版本、APK 雜湊、兩次比對、跨路徑比對）；工具鏈紀錄（每個下載檔的來源、SHA-256、授權）；修 Service Worker 之前那一版的紀錄留在 `debug-20261113-pre-swfix.json` | 11/13 |
| `scripts/check-skeleton.js` | 不用 SDK、不連網的檢查：沒有 Google Play 服務／Firebase、關掉相依資訊區塊、webkit ≥ 1.18.0、原生碼有允許清單和標頭、Service Worker 的請求也補標頭（標頭清單只有一份）、來源固定、沒有二進位檔、F-Droid 草稿欄位齊全 | 11/13 全部通過（只列「有 gradle-wrapper.jar」提醒） |
| `fdroid/com.raysonchen.xiangqiqianqiu.yml` | 給 fdroiddata 的建置設定草稿（下面〈F-Droid 路線〉） | 草稿，還不能送 |
| `fastlane/metadata/android/zh-TW`、`en-US` | 商店標題、短說明、長說明（F-Droid 從倉庫讀） | 草稿 |
| `www/` | `make-www.js` 做出來的網頁成品（`npx cap sync android` 再複製到 `android/app/src/main/assets/public/`） | 11/13 是 `20261113-0540`；11/13 起 `.gitignore` 擋掉（重建時從公開倉庫重做） |
| `REBUILD.md` | 乾淨環境重建的步驟和指令、釘住的版本、發布版設定、開發者要自己做的事（上傳金鑰、Play App Signing） | 11/13 寫好、照著做過一次 |
| `scripts/clean-rebuild.js` | 照 `REBUILD.md` 在全新資料夾重建（只複製會進版本控制的檔、公開倉庫指定 commit、全新 npm／Gradle 快取、全新 debug 金鑰），再跟參考成品比對 debug APK、release APK、AAB | 11/13 寫好、實際跑過 |
| `android/gradle/verification-metadata.xml` | Gradle 相依驗證：AGP、androidx、Kotlin、R8 等 390 個元件的 SHA-256，下載後逐一核對，不符就停 | 11/13 |
| `build-records/rebuild-20261113.json` | 乾淨環境重建紀錄（三個成品的雜湊、比對結果、工具版本、每一步花的時間） | 11/13 |

**還沒做的：** 原生橋接（觸覺、分享、存檔匯出、關 service worker、每日提醒）、圖示和啟動畫面、正式上傳金鑰（開發者自己產生，步驟在 `REBUILD.md`）、`localhost` 被當成測試機的修補、實機測試。

## Google Play 路線

| 要什麼 | 說明 | 誰 |
|---|---|---|
| Play 開發者帳號 | 一次付 US$25；要完成身分驗證（個人帳號用真實姓名和證件） | **開發者本人**（付款、登入、證件） |
| 封閉測試 | 新的個人帳號要先找一定人數的測試者封閉測試一段時間才能上正式版（2024 年底起是 12 人、連續 14 天；以 Play Console 當時規定為準） | 開發者找測試者 |
| 目標 API 等級 | Capacitor 8 預設 targetSdk 36，符合 2026 年新 App 的要求（以 Play Console 為準） | — |
| AAB 格式＋簽章 | 上傳 Android App Bundle；Play App Signing 由 Google 保管發布金鑰，開發者保管上傳金鑰 | 開發者保管金鑰 |
| 大小 | 基本模組壓縮後上限約 200 MB：只含公開倉庫的瘦身版（約 107 MB）放得下；含全部圖、音樂、3D（約 870 MB）要用 Play Asset Delivery 或維持執行時從 CDN 抓 | 待決定 |
| 資料安全表單、隱私權政策 | 照實填線上大廳、意見回饋、匿名資料；隱私權政策網址可以用 `privacy.md` | Claude 準備文字、開發者送出 |
| 內容分級（IARC 問卷）、目標年齡 | App 有兒童模式；目標年齡含 13 歲以下就要符合「家庭」政策（廣告、資料蒐集更嚴） | 開發者決定 |
| GPL 與商店條款 | 跟 App Store 一樣，Pikafish 是別人的 GPL 程式；上架前請懂授權的人看，或取得 Pikafish 團隊同意（`xiangqi-ios/appstore/` 有給 Pikafish 的信草稿） | 開發者 |

## F-Droid 路線

F-Droid 主倉庫的條件：App 本身自由授權、公開原始碼、它的伺服器能從原始碼建出 APK、沒有閉源相依；有非自由的部分就標反特性。

**骨架已經照這些條件準備的：** 程式 GPL-3.0-or-later；沒有 Google Play 服務、Firebase、google-services 外掛；關掉 Google 的相依資訊區塊；網頁的 `index.html` 由 `source/` 組出並自動比對；F-Droid 建置不需要 Capacitor CLI，只要 Debian 內建的 Node 和 npm。

**建置設定草稿**（`xiangqi-android/fdroid/com.raysonchen.xiangqiqianqiu.yml`）：分類 Games、授權 GPL-3.0-or-later、原始碼和問題回報連到公開倉庫、反特性三項（附中英文原因）；建置區塊假設 Android 專案放在倉庫的 `android/`，`prebuild` 跑 `npm ci` 和 `make-www.js`，用 F-Droid 自己的 Gradle（刪掉 `gradle-wrapper.jar`）；版本號建議 versionName＝網站版本號、versionCode＝年月日時（例如 `26111304`）、tag＝`android-<網站版本號>`，自動更新看 tag。

**會被標的反特性：**

| 反特性 | 原因 | 能不能拿掉 |
|---|---|---|
| NonFreeAssets | 美術、3D、音樂、劇情文字 CC BY-NC-SA 4.0（限非商業）；`pikafish.nnue` 不得商用 | 開發者已決定素材用 CC BY-NC-SA；權重要 Pikafish 團隊許可或換權重 |
| NonFreeNet | 線上大廳連 EMQX Cloud；意見回饋送 Google 表單 | 改用自由軟體架的伺服器（例如自架 Mosquitto） |
| Tracking（很可能） | 匿名卡關訊號、對局評分、學習進度預設開 | 改成預設關或第一次先問 |
| TetheredNet（可能） | 線上大廳只能連開發者指定的伺服器 | 讓玩家可以自己填伺服器 |

**還擋著、送不出去的：**

1. **預先編好的 `engine/pikafish.wasm`。** F-Droid 會掃描原始碼裡的二進位檔，要在建置時從原始碼編。用 Emscripten 編要下載 emsdk 的預編譯 LLVM，F-Droid 可能不收；Android 版改用 NDK 編原生 Pikafish（上面備案 B）比較順。
2. **大檔只在 CDN。** 照草稿建出來的 APK 只含公開倉庫的瘦身版，缺的圖、音樂、3D 執行時從 CDN 抓（要連網）。要整包離線就得把素材放到 F-Droid 拿得到的公開來源。
3. **Android 專案還沒放上公開倉庫、沒有 tag。**
4. **APK 大小：** 瘦身版約 107 MB；整包約 870 MB，F-Droid 收不收這麼大的要先問維護者。

**簽章要注意：** F-Droid 預設用它自己的金鑰簽，跟 Google Play 版的簽章不同，玩家不能直接從一版換到另一版（要先移除，存檔會不見；要先用設定裡的「存檔匯出」）。做到逐位元可重現的話，F-Droid 可以改發開發者自己簽的版本（metadata 的 `Binaries`、`AllowedAPKSigningKeys`），這就要靠下面的驗證包那一套。

**Google 的開發者驗證：** Google 規定經過認證的 Android 手機只能裝「開發者有驗證身分」的 App，報導說 2026 年 9 月 30 日先在巴西、印尼、新加坡、泰國實施、2027 年擴大；F-Droid 公開反對，對它的影響還沒定論。這只影響那些地區的安裝，以 Google 和 F-Droid 的最新公告為準。

**另一條路：** 先自己架一個 F-Droid 相容的第三方倉庫，放自己簽名的 APK；不用等主倉庫審查，但一樣要先有 APK。

## 要做的事與順序

| 步 | 事情 | 誰 | 估計 |
|---|---|---|---|
| 1 | 決定下面〈要開發者決定的事〉的第 2～4 項（appId、引擎路線、專案放哪）；工具鏈 11/13 已同意 | **開發者** | — |
| 2 | ~~裝 Android 工具鏈、編出第一個 APK~~ **11/13 做完**：debug APK 編出來、兩次逐位元相同（〈編譯與可重現建置〉） | Claude | 實際約 1 小時 |
| 3 | 修補「本機測試」判斷：`net.js`、`05-settings.js reportPlayer()`、`05b-save.js fnTest()` 加 `window.XQ_NATIVE`（跟 iOS 的 N1～N3 同一套，`localhost` 也會中） | Claude | 1 小時＋發布網頁版 |
| 4 | 原生橋接：沿用 `xiangqi-ios/src/native-bridge.js`，外掛換 `@capacitor/haptics`、`share`、`filesystem`、`app`、`splash-screen` 的 Android 版；關掉 service worker | Claude | 1 天 |
| 5 | 實機驗證引擎（上面〈怎麼驗證〉）；WebView 不行就走備案 B | Claude＋**開發者的手機** | 半天；備案 B 另加 3～5 天 |
| 6 | 圖示、啟動畫面、簽章金鑰（金鑰由開發者保管） | Claude 準備、**開發者保管** | 半天 |
| 7 | Google Play：帳號、封閉測試、資料安全、內容分級，送審 | **開發者**（付款、身分驗證、送出） | 帳號 1～2 天＋封閉測試 14 天 |
| 8 | F-Droid：解決預編引擎和大檔、把 Android 專案放上公開倉庫打 tag、用 fdroidserver 自己試建、送 fdroiddata 合併請求 | Claude 準備、**開發者送出** | 看第 5 步和大檔的決定 |

## 要開發者決定的事

1. ~~要不要在這台電腦裝 Android 工具鏈。~~ **11/13 開發者同意，已裝**（約 2.7 GB，在 `<使用者資料夾>/android-dev/`，沒改系統 PATH）；要移除就整個資料夾刪掉。
2. **appId（Android 叫 applicationId）。** 草稿用跟 iOS 一樣的 `com.raysonchen.xiangqiqianqiu`；上架後不能改。
3. **引擎走哪條路。** A：WebView 允許清單（骨架已寫，挑 WebView 版本）；B：NDK 原生 Pikafish（較穩、F-Droid 較順，工多）。
4. **Android 專案放哪。** 草稿假設放進 `xiangqi-lab` 公開倉庫的 `android/`；也可以另開一個倉庫（F-Droid 的 `Repo`、`subdir` 跟著改）。
5. **大檔怎麼給。** APK 只放瘦身版、執行時從 CDN 抓；或 Play Asset Delivery；或把素材放到公開的發布附件給 F-Droid。
6. **上不上 Google Play、F-Droid 主倉庫、還是先自架 F-Droid 倉庫。**
7. **三種匿名資料預設開還是關**（影響 F-Droid 的 Tracking 標記和 Play 的資料安全表單）。
8. **版本號規則**（草稿：versionName＝網站版本號、versionCode＝yyMMddHH）、**最低 Android 版本**（Capacitor 預設 Android 7.0）。

## 編譯與可重現建置

11 月 13 日（評比第 15 輪 F3、F4）在開發者的 Windows 電腦上做。開發者事先同意安裝 Android 開發工具；只從官方來源下載，全部裝在使用者資料夾的 `android-dev/` 底下，**沒有改系統設定、沒有改全域 PATH**，每次編譯在指令裡設 `JAVA_HOME`、`ANDROID_HOME`、`ANDROID_USER_HOME`、`GRADLE_USER_HOME`。沒有開 Android 模擬器、沒有接手機。

### 工具鏈

| 工具 | 版本 | 來源 | 下載檔 SHA-256 |
|---|---|---|---|
| Eclipse Temurin JDK | 21.0.13+9 LTS | Adoptium（GitHub `adoptium/temurin21-binaries`） | `a4dbaa05fca4bd89d84584e58c459bd732efebb1722af80ab13c6516832004f9`（跟 Adoptium API 公布的一致） |
| Android SDK 命令列工具 | 23.0（build 16111833） | `dl.google.com/android/repository` | `e5885e2e59038c0778a85fc19f01de7ce7c567c105553f7617b936b1e0e87b2b`（SHA-1 跟 Google 套件清單一致） |
| Android CLI | 1.1.16717390 | 命令列工具 23 第一次執行時自動解開（`sdkmanager` 已改由它處理）；用 `--no-metrics` 跑 | — |
| SDK Platform | android-36 r02 | 同上 | `37607369a28c5b640b3a7998868d45898ebcb777565a0e85f9acf36f29631d2e` |
| Build-Tools | 35.0.0（AGP 預設，編譯用） | 同上 | `5753c679a1b90bcf6fbc9945a2ce39dfb9e74f1df0831a1e1866ae5b594326f0` |
| Build-Tools | 36.0.0（aapt2、apksigner 檢查用） | 同上 | `aa1095cb14d83e483818a748a2c06faaeb8e601561b06a356a119a1b2ca280d3` |
| Platform-Tools | 37.0.1（只裝不用） | 同上 | `45f4d63113e895ebde0c90f194099a4676b6ac653bd28d54314a9e022bbc1a99` |
| Gradle | 8.14.3 all（專案 wrapper 下載） | `services.gradle.org` | `ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c`（已寫進 `distributionSha256Sum`） |

SDK 套件的 SHA-1 都跟 Google 的套件清單（`repository2-3.xml`）對過。Android SDK 的標準授權（`developer.android.com/studio/terms`）在安裝套件時顯示並寫入 `sdk/licenses/`，照開發者的同意代為接受。合計約 2.7 GB（Gradle 快取 1.0 GB、SDK 595 MB、JDK 330 MB、Android CLI 232 MB、保留的下載檔 528 MB）。完整清單在 `xiangqi-android/build-records/toolchain-20261113.json`。

### 怎麼編

```
cd xiangqi-android
node scripts/make-www.js --repo <公開倉庫資料夾>
npx cap sync android
cd android
gradlew assembleDebug --no-daemon
```

網頁成品用公開倉庫 `20261113-0540`（check-build 一致，517 個檔、107.0 MB）。原生碼（`MainActivity.java`、`XQWebViewClient.java`）**第一次編就通過**，沒有要修的編譯錯誤；只改了檔頭的狀態註解。同一天模擬器驗證後補上 Service Worker 的標頭（〈引擎多執行緒〉第 4 步），網頁成品不變、只重編 APK，一樣第一次就編過。編譯時的警告只有兩個無害的：Capacitor 外掛專案用 `flatDir`、Android Gradle 外掛 8.13.0 看不懂命令列工具 23 寫的新版 SDK XML（第 4 版）。編完都用 `--no-daemon`，沒有留下常駐的 Gradle 程序。

### 編出來的 APK（debug）

現在的版本是 11/13 補上 Service Worker 標頭後重編的。之前那一版（SHA-256 `38892682a9340bb0ac3f8cee5237b94d32f4e5780ce5ad52de1a58aa68394f9d`，再開 App 隔離會掉）**不要再用**，紀錄留在 `build-records/debug-20261113-pre-swfix.json`。

| 項目 | 值 |
|---|---|
| 檔案 | `android/app/build/outputs/apk/debug/app-debug.apk` |
| 大小 | 101827290 位元組（約 97 MB；958 個項目，6 個 dex） |
| SHA-256 | `8265202f5a59c16fde3ddc48ad0e597a21131852d5ef69b7933bdb309e259e4a` |
| 拿掉簽章區塊後 SHA-256 | `e3bb53233cf6f0aee92dc41c35fd6f38769091775a1255d36b673759723e7225` |
| 內容雜湊（每個項目解壓後，不含簽章） | `6246818c4e0183da6398af368392cb99bf4f49f4b054934b89f2848c875b7383` |
| applicationId／版本 | `com.raysonchen.xiangqiqianqiu`，versionCode 1、versionName 1.0（還沒照版本號規則改） |
| minSdk／targetSdk／compileSdk | 24／36／36（`aapt2 dump badging`、`apkanalyzer manifest` 都對過） |
| 權限 | 只有 `INTERNET`；另一個 `…DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` 是 AndroidX core 自動加的 App 內部權限 |
| 簽章 | debug 金鑰，`apksigner verify` 通過，只用 v2 簽章（minSdk 24 不需要 v1）；沒有 Google 的相依資訊區塊 |
| Google Play 服務 | **沒有**。`apkanalyzer dex packages` 列出的套件只有 androidx、Capacitor、Cordova 相容層、Kotlin 標準庫、`org.chromium.support_lib_boundary`（androidx.webkit 的一部分）；`com.google` 底下只有 `com.google.common.util.concurrent.ListenableFuture` 一個介面（Guava 的 listenablefuture，Apache-2.0，自由授權）；`repro-check.js` 掃 dex 字串表也沒有 `com/google/android/gms`、`com/google/firebase`、Play Core |

### 可重現結果

用 `node scripts/repro-check.js --runs 2 --against <另一個 APK> --out build-records/debug-20261113.json`：

1. **同一個資料夾、清掉所有 build 資料夾連編兩次**（`android/app/build`、`android/build`、外掛的 build、`node_modules` 裡 capacitor-android 的 build、`android/.gradle`）：兩個 APK **逐位元相同**（上面的 SHA-256）。改原始碼註解前也用同一份輸入編過六次，六次都一樣（註解改了行號，dex 跟著變，所以紀錄是改完後重編的）。補 Service Worker 標頭後重跑一次同樣的檢查，兩次一樣逐位元相同。
2. **複製到另一個資料夾、用另一把新產生的 debug 金鑰編**：整檔 SHA-256 不同（補 Service Worker 標頭後是 `4b2b4aaba1338957a74ef6d9c073c5248738c38a46ccef840ba6a224b8793373`；之前那一版是 `847720b26fd145074ffdd6383e7a6a2703256092237644c87a63a6680ee67c4c`），差別**只在 APK 簽章區塊**；拿掉簽章區塊後逐位元相同，每個 dex、資源、assets、項目順序、檔案時間都一樣。所以編譯結果不受資料夾路徑影響。
3. **沒有需要消除的不一致。** Android Gradle 外掛已經把 ZIP 時間固定、項目排序固定；`make-www.js` 的 `native-build.json` 本來就不寫建置時間。

這代表 F-Droid 那種「拿開發者簽的 APK 的簽章、套到自己從原始碼編的 APK 上比對」的做法在 debug 版可行；release 版見下一節。

### 發布版設定與乾淨環境重建

11 月 13 日補上。步驟、指令、開發者要自己做的事都寫在 `xiangqi-android/REBUILD.md`。

**釘住的版本：** JDK Temurin 21.0.13+9（`android/build.gradle` 檢查主版本一定是 21）、Gradle 8.14.3（wrapper 核對發行包 SHA-256）、AGP 8.13.0、platform android-36 r02、build-tools 35.0.0（`variables.gradle` 的 `buildToolsVersion`）、Capacitor 8.6.2（`package.json` 寫死、`package-lock.json` 的 integrity）。新增 `android/gradle/verification-metadata.xml`：AGP、androidx、Kotlin、R8 等 390 個 Maven 元件的 SHA-256，Gradle 下載後逐一核對，不符就停。第一次在全新的 Gradle 快取試建時，它真的擋下兩個沒登記到的檔（`guava-parent-33.3.1-jre.pom`、`junit-bom-5.10.2.module`；在原本有快取的電腦上產生驗證檔時漏掉），補上雜湊後重新從頭建一次才通過。

**發布版設定（`app/build.gradle`）：** release 開 R8（`minifyEnabled true`、`proguard-android-optimize.txt`），dex 從 6 個縮成 1 個、release APK 97617196 位元組；`vcsInfo.include = false`（不把 git commit 寫進 APK）；版本號從網站版本號算：`versionName`＝`20261113-0540`、`versionCode`＝`26111305`（年後兩碼＋月日＋時，同一小時要重發用 `-PxqVersionCode` 覆寫）；簽章從倉庫外的 properties 檔讀（`-PxqSigning=<路徑>` 或 `XQ_SIGNING_PROPERTIES`），沒給就編沒簽章的版本。`bundleRelease` 編出 AAB（97595729 位元組）。**沒有產生、也沒有用任何正式金鑰**：流程是用每個環境自己的 debug 金鑰當暫時的發布金鑰跑的（`apksigner` 驗過 release APK 是 v2 簽章、`jarsigner` 驗過 AAB）。debug APK 也跟著用新的版本號，所以內容雜湊跟上面那版（versionCode 1）不同。

**乾淨環境重建：** 用 `scripts/clean-rebuild.js` 照 `REBUILD.md` 在一個全新的暫存資料夾重做一次：只複製會進版本控制的原生專案檔（101 個，用 `git ls-files` 照 `.gitignore` 判斷，原始碼指紋跟原專案一致），網頁從公開倉庫 commit `253d76925e8b9836a3567ea68e72b489dbfd1ccd`（`20261113-0540`）clone 出來再跑 `make-www.js`（含 check-build）、`capacitor sync`；npm 快取、Gradle 快取（重新下載 Gradle 和所有相依並核對雜湊）、debug 金鑰全部是新的。跟原專案清乾淨後編的參考成品比：

| 成品 | 參考建置 SHA-256 | 乾淨環境重建 SHA-256 | 拿掉簽章後 |
|---|---|---|---|
| debug APK | `77d40d51ec9642f607c51ad2cd8a6ddfc573566c1385f7183818624b1830abc1` | `22706796fd718e464f2b0ffcd483b21387ecedbe96654067e760bd80e1126ca1` | 逐位元相同：`cb430e80e64b09cc488f8740eee9bcb66003ae87e9baf9754d5d70af81c1e9fd` |
| release APK（R8） | `73f3a732f3dad558ea7418fbb4a0d5861e04931d24e5af7eb7a14497b30d2714` | `5dcdaadf367a36d797b2ab366dc9ad330aee2aebe82b07551580eea9b332d578` | 逐位元相同：`62ada3afd0e00152843084e9b934b3a7275e4fc6a862a0696fe18c5756e541c6` |
| AAB | `38953e3848efe4e22d373459410d1401028d9106ce91aa6e6ef47241e4260df9` | `161bc5d6e1b36dc7776cfe9f781022bd22a959d1f12098cccbf6d2d127ce5c52` | AAB 是 jar 簽章（簽章檔在 ZIP 裡），比解開後的內容：相同，`8f5aa2389508cda31c07955fa6265d17fff4d24e24c0fab581e72105a69aad3a` |

整檔雜湊不同只因為兩邊的 debug 金鑰不同；dex、資源、assets、項目順序、檔案時間全部一樣，三個都沒有 Google Play 服務、Firebase。重建花的時間：Gradle 第一次（含下載）約 2 分鐘、release＋AAB 約 1 分鐘。紀錄在 `build-records/rebuild-20261113.json`。

### 還沒驗證的

- **真機。** 沒有在任何手機上安裝、開啟過；畫面、觸控、存檔、線上大廳都沒試。
- **跨來源隔離在真機上是不是 true。** 模擬器（WebView 154）上已經是 true（〈模擬器驗證〉），真機還要用 `chrome://inspect` 看 `crossOriginIsolated`、`typeof SharedArrayBuffer`；這要看手機的 Android System WebView 版本支不支援 `CROSS_ORIGIN_ISOLATED_ALLOWLIST`（WebView 133 不支援）。不是 true 的話引擎載不起來，要走備案 B 或 C。
- **`MainActivity.load()` 先載入一次、換 WebViewClient 再重載**的順序，在真機上會不會閃一下或重複執行頁面腳本。
- **別台電腦、Linux（F-Droid 的建置環境）** 編出來是不是也一樣；這次只在同一台 Windows 換資料夾、換快取、換金鑰。
- **正式上傳金鑰簽的 AAB、Google Play 的預先審查**都還沒做（金鑰由開發者產生）；R8 縮過的 release APK 也還沒在模擬器或手機上開過（模擬器驗的是 debug APK）。
- F-Droid 草稿的建置方式（`make-www.js --into`、不跑 `capacitor sync`）少了 `cordova.js`、`cordova_plugins.js`，跟 `REBUILD.md` 的步驟編出來的 APK 不會逐位元相同；要對齊得讓 `make-www.js` 補這兩個檔。

### 要開發者做的事

- 拿一支 Android 7.0 以上的手機（Android System WebView 先在 Play 商店更新到最新），開「開發人員選項」和 USB 偵錯；裝這個 debug APK 前要先在 `capacitor.config.json` 暫時打開 `webContentsDebuggingEnabled` 重編（目前關著，`chrome://inspect` 看不到）。
- 決定〈要開發者決定的事〉第 2～4 項（appId、引擎路線、Android 專案放哪）。
- 發布用的上傳金鑰要由開發者自己產生、自己保管（不能放進任何倉庫），再到 Play Console 用 Play App Signing；指令和步驟在 `xiangqi-android/REBUILD.md`〈開發者要自己做的〉。

## 模擬器驗證

11 月 13 日開發者要求「在電腦安裝 Android 模擬器驗證」後做的。第一輪驗的是修正前的 debug APK（SHA-256 `38892682…`，沒有重編、沒有改設定）；找到問題、開發者決定改原生碼後，第二輪驗的是正式重編的 APK（SHA-256 `8265202f…`，見〈正式修法的驗證〉）。**模擬器不是真機**：結果代表「這個 WebView 版本＋這段原生碼」的行為，不代表各家手機。

**結論：** 新版 WebView（154）上，修正前的 APK 第一次開 App `crossOriginIsolated` 是 true、引擎 3 個執行緒、電腦會回著，但**關掉 App 再開一次就變回 false、引擎載不起來**。原因是 Service Worker 發的請求不經過 `XQWebViewClient`，存進快取的頁面少了 `Document-Isolation-Policy` 標頭（下面〈發現的問題〉第 1 項）。**修法已正式採用**：原生碼替 Service Worker 的請求也補同一組標頭，重編後清掉 App 資料連續冷啟動 3 次，每次都是 true，練功房電腦會回著。舊版 WebView（133，Android 16 映像內建）完全不支援，引擎一定載不起來，修法對它沒有影響（沒解）。

### 環境

| 項目 | 值 |
|---|---|
| 模擬器 | Android Emulator 37.2.13（build 16740729），`dl.google.com` 的 `emulator-windows_x64-16740729.zip`（455344678 位元組，sdkmanager 對過 Google 套件清單的 SHA-1），裝好 1.1 GB |
| 硬體加速 | `emulator -accel-check`：WHPX（Windows Hypervisor Platform）可用，**不用改任何系統設定** |
| 系統映像 A | `system-images;android-36;google_apis;x86_64` r7（Android 16，`BE2A.250530.026.F3`），下載檔 1895447397 位元組，裝好 4.3 GB；內建 Android System WebView **133.0.6943.137** |
| 系統映像 B | `system-images;android-canary-20261104;google_apis_ps16k;x86_64` r18（Android 17 開發中版本，API 37.2、16 KB 記憶體分頁，`ZP11.261016.008`，系統建置日 2026-10-28），下載檔 2403542166 位元組，裝好 8.3 GB；內建 WebView **154.0.8037.73** |
| 為什麼選 Google APIs 映像 | 內建的是 Google 版 Android System WebView（跟手機同一套 Chromium），不用登入 Google 帳號；不選 Play 商店映像（要登入才能更新 WebView）。映像 A 的 WebView 太舊、又不能更新，才再裝映像 B 看新版 WebView |
| 虛擬機 | Pixel 9 尺寸（1080×2424、420 dpi）、4 GB 記憶體、4 核、GPU 自動；`-no-snapshot -no-boot-anim` 開視窗跑，開機約 82～93 秒；同一時間只開一台，驗完都關了 |
| 讀 WebView 狀態 | Google APIs 映像是 userdebug 版，可除錯的 App 會自動開 `webview_devtools_remote_<pid>`，**不用改 `webContentsDebuggingEnabled`**；用 `adb forward` 接到電腦，透過 Chrome DevTools Protocol 讀 `crossOriginIsolated` 等值 |
| adb | 用自己的 adb 伺服器（埠 5038），沒有碰開發者原本開著的 adb（10/23 起、埠 5037）；兩輪驗完都已關 |

AVD 放在 `android-dev/android-user-home/avd/`（`xq_pixel9_api36`、`xq_pixel9_canary`）。沒有登入任何帳號。

### 結果（修正前的 APK `38892682…`）

| 項目 | 映像 A（WebView 133） | 映像 B（WebView 154） |
|---|---|---|
| 安裝、開啟 | `adb install` 約 4 秒；冷啟動到第一個畫面 3.2 秒 | 冷啟動 2.7 秒；之後 1.2～1.4 秒 |
| 首頁畫面 | 正常（`03-home-full.png`）；開頭約 15 秒是空的（`01-launch-15s.png`，見問題 2） | 第一次開出現開頭畫面、星渦影片、星槎序局（`12`～`14`），正常 |
| `crossOriginIsolated` | **false** | 第一次開 **true**；**關掉再開變 false**（`16-canary-relaunch.png`） |
| `typeof SharedArrayBuffer` | `"undefined"` | 第一次 `"function"`；再開 `"undefined"` |
| 回應標頭 | 頁面拿到的有 COOP／COEP／CORP（`sw.js` 補的），**沒有 `Document-Isolation-Policy`** | 同左；只有沒經過 Service Worker 的請求（例如 `sw.js` 本身）帶 `Document-Isolation-Policy` |
| 引擎 | 載入失敗：「瀏覽器還沒開啟多執行緒模式，請把 App 關掉重開一次」；練功房下炮二平五後**電腦不回著**（`05-cpu-move1.png`） | 第一次開：載入成功、3 個執行緒；再開：同左失敗 |
| logcat | App 沒有崩潰、沒有 ANR；錯誤只有模擬器繪圖驅動（`MESA`、`GFXSTREAM`）和 WebView 的 variations seed，跟 App 無關。沒看到資源載入失敗（App 關掉網頁主控台記錄，沒有逐筆看主控台） | 同左 |
| 記憶體 | App 程序 PSS 約 132 MB；渲染程序 RSS 約 506 MB；JS heap 58 MB（引擎沒載入） | 載入引擎後 App 程序 PSS 約 168 MB、渲染程序 RSS 約 215 MB、JS heap 133～141 MB；4 GB 的模擬器剩約 120 MB 可用 |

### 修法驗證（實驗版，不在專案裡）

把 Android 專案複製到暫存資料夾、只改兩個 Java 檔（`ServiceWorkerController` 也設一個會補同樣標頭的 `ServiceWorkerClient`），用同一套工具鏈編 debug APK，裝到映像 B、**清掉 App 資料**後測：

- 連續冷啟動 3 次，`crossOriginIsolated` 都是 true，不再自動重整；快取裡的 `index.html` 帶 `Document-Isolation-Policy: isolate-and-require-corp`。
- 練功房第 3 級：下炮二平五，引擎（3 個執行緒）載入加思考約 5 秒內回砲 2 進 7，盤面、評語正常（`21-fix-cpu-start.png`、`22-fix-cpu-reply.png`）。
- 冷啟動：Activity 1.3 秒；頁面 First Contentful Paint 0.7 秒、DOMContentLoaded 1.3 秒、load 4.5 秒。

改法存成 `xiangqi-android/verify/sw-client-isolation.patch`（實驗用寫法，留作紀錄）。開發者決定採用後，正式版的寫法見下一節。

### 正式修法的驗證（APK `8265202f…`）

開發者決定採用「改 App 原生碼」的修法（不改網站的 `sw.js`）。正式專案改兩個 Java 檔：`XQWebViewClient` 把四個標頭收成一份 `ISOLATION_HEADERS`、補標頭的邏輯抽成 `addIsolationHeaders()`；`MainActivity.installServiceWorkerClient()` 在 `super.load()` 之後設自己的 `ServiceWorkerClient`，呼叫同一個 `addIsolationHeaders()`（〈引擎多執行緒〉第 4 步）。註解寫明為什麼要補、補了哪些標頭。重編後照〈可重現結果〉的檢查，兩次逐位元相同。

在映像 B（WebView 154.0.8037.73）上，`adb install -r` 新 APK（裝上後在模擬器裡算 SHA-256 核對過是 `8265202f…`）、`pm clear` 清掉 App 資料，然後每次 `am force-stop` 再冷啟動：

| 次 | 冷啟動（Activity） | `crossOriginIsolated` | `typeof SharedArrayBuffer` | 頁面從哪來 | 快取裡的 `index.html` | 引擎 |
|---|---|---|---|---|---|---|
| 1（清完資料第一次） | 3.4 秒；FCP 2.3 秒 | true | `"function"` | 本機（WebViewClient） | 帶 `Document-Isolation-Policy: isolate-and-require-corp` | 載入成功 |
| 2 | 1.7 秒；FCP 0.5 秒 | true | `"function"` | Service Worker 快取 | 同上 | 載入成功 |
| 3 | 1.6 秒；FCP 1.0 秒 | true | `"function"` | Service Worker 快取（`deliveryType: cache`） | 同上 | 載入成功、3 個執行緒 |

- 三次都沒有自動重整（`sessionStorage` 的 `xqReload` 是空的）、`location.origin` 是 `https://localhost`、Service Worker 有在控制頁面。
- 第 3 次開著直接進練功房第 3 級（先設測試房 `xq_netRoot`；開頭畫面、加到主畫面視窗用 DevTools 和點「不用了」跳過）：下炮二平五，10 秒內電腦回砲 2 進 7（第 3 級故意會失著），盤面、評語正常（`34-swfix-cpu-start.png`、`35-swfix-cpu-reply.png`）。
- logcat 的 crash 緩衝區是空的，沒有 `FATAL EXCEPTION`、沒有 ANR。
- **映像 A（WebView 133）這次沒有重測**：它不支援 `CROSS_ORIGIN_ISOLATED_ALLOWLIST`，允許清單根本設不上，補不補標頭都一樣是 false、引擎載不起來，照舊無解（〈發現的問題〉第 4 項）。

### 舊 WebView 降級提示

11 月 13 日補上（〈發現的問題〉第 2、4 項）。改的是網頁 `xiangqi-db/m/02-shell.js` 的兩小段，只在原生 App（User-Agent 帶 `XQQianqiuApp/`）作用，網頁版照舊：

1. **不自動重整。** Service Worker 就緒後「沒有跨來源隔離就重整、同一次最多兩次」那段，加上「原生 App 不重整」：App 的隔離靠原生碼的允許清單，不靠 `sw.js`，重整不會好，只會讓開頭空白十幾秒。
2. **跳一次說明。** 原生 App 裡 `crossOriginIsolated` 不是 true、或沒有 `SharedArrayBuffer`，開啟約 2.5 秒後（畫面上有預載畫面、別的視窗、卡片就先等，最多等 90 秒）跳出：「這支手機的 Android System WebView 版本太舊，電腦棋手無法運作；請到 Play 商店更新『Android System WebView』或『Chrome』」，加上更新後要把 App 完全關掉再打開、照樣能用的功能（同桌對弈、殘局、古譜與大師對局、測驗、線上對弈）、要等更新才能用的功能（挑戰電腦、擂台、棋局分析與提示）、目前的 WebView 版本。按「這個版本不再跳出」之後，同一個 WebView 版本只在下方出一行提示。
3. **引擎直接回同一句話。** 引擎的下載、載入、搜尋都改成回這句（原本是「瀏覽器還沒開啟多執行緒模式，請把 App 關掉重開一次」，舊 WebView 怎麼重開都沒用），也不再背景下載 48 MB 的引擎檔。

這段改動還沒發布到網站，App 裡的網頁還是 `20261113-0540`。模擬器驗證用的 APK 是：乾淨環境重建的那份專案、網頁成品只把這兩小段原樣套進 `index.html`（其他不動），用該環境的 debug 金鑰編（SHA-256 `a5452804a5d5417453334258a7899c37371a1d2eac21ed3258682d84867ff4a3`，只供驗證，不要發布）。兩台都先移除舊版、裝這個 APK，同一時間只開一台，用自己的 adb 伺服器（埠 5038），沒碰開發者的 adb（埠 5037）；驗完兩台都關了。

| 項目 | 映像 A（WebView 133.0.6943.137） | 映像 B（WebView 154.0.8037.73） |
|---|---|---|
| `crossOriginIsolated`／`typeof SharedArrayBuffer` | false／`"undefined"` | true／`"function"` |
| 清掉資料後第一次開 | 開啟後 4.7 秒跳出說明（`41-oldwv-prompt.png`） | 不跳說明 |
| 自動重整 | **沒有**：開著 76 秒都是同一次載入（導覽類型 `navigate`、`xqReload` 是空的、頁面上設的記號還在） | 沒有 |
| 練功房下炮二平五 | 電腦不回著，下方寫那句話（`42-oldwv-cpu.png`）；引擎檔沒有下載（`xqlab-engine` 快取是空的） | 引擎 3 個執行緒，含第一次下載引擎約 20 秒內回象 3 進 5（`44-newwv-cpu-reply.png`） |
| 關掉再開 | 一樣不重整，再跳一次說明（`43-oldwv-relaunch.png`） | 頁面從 Service Worker 快取來（`deliveryType: cache`），隔離仍是 true、不跳說明 |

開頭畫面、開場影片、星槎序局是用點「入局」「略過」和 DevTools 藏起來跳過的（跟之前一樣）。映像 A 第一次用的驗證 APK 會等開頭畫面（`xqt-on`）結束才跳，開著 90 秒才出來，所以改成不等開頭畫面、重編再驗（上面是改好後的結果）。

### 發現的問題

1. **再開 App 引擎就壞（已修）。** Capacitor 8.6.2 的 `Bridge` 另外設了 `ServiceWorkerClient`，Service Worker 發的請求走那裡、不經過 `XQWebViewClient`，所以 `sw.js` 安裝時存進快取的頁面沒有 `Document-Isolation-Policy`；第二次起頁面從快取來，就沒有跨來源隔離。當時的修法二選一：(a) 原生碼也替 Service Worker 請求補標頭；(b) `sw.js` 的 `isolate()` 也補 `Document-Isolation-Policy`（改網站，網頁版也會收到這個標頭，沒驗）。**開發者選 (a)，已正式採用、重編、在模擬器驗過**（〈正式修法的驗證〉）。注意：舊快取裡的頁面不會自己變，裝過有問題版本的手機要等網站換版（快取名稱跟著版本號）才會好；Android 版還沒發布，目前沒有這種手機。
2. **沒有跨來源隔離時開頭空白約 15 秒。** `02-shell.js` 看到 `crossOriginIsolated` 是 false 會自動重整，同一次最多兩次；模擬器上首頁到第 15 秒還是空的。問題 1 修好後 WebView 154 上不再重整（正式修法驗證的三次 `xqReload` 都是空的）。**11/13 已改：** 原生 App 不再自動重整，WebView 太舊時改跳說明（〈舊 WebView 降級提示〉；網頁還沒發布）。
3. **App 裡跳出「把象棋千秋加到主畫面？」**（`02-home.png`、`16-canary-relaunch.png`），教使用者點瀏覽器選單，在原生 App 裡沒有意義；首頁下方也有「加到主畫面」鈕。App 的 User-Agent 帶 `XQQianqiuApp/1`，可以用來藏起來。
4. **WebView 133 不支援允許清單。** Android 16 映像內建的 WebView 133 沒有這個功能；手機上的 WebView 會從 Play 商店更新，但沒更新的手機、沒有 Play 商店的手機（F-Droid 使用者常見）引擎就不能用，要提示或走備案 B／C。**11/13 已加提示**（〈舊 WebView 降級提示〉）；沒有 Play 商店的手機照樣無解，要等備案 B。154 有支援；中間從哪一版開始支援沒有測。
5. 映像 B（Android 17）WebView 從螢幕最上面開始畫（狀態列疊在網頁上），映像 A 從狀態列下面開始；截圖裡標題沒有被蓋到，但深色頁面（星渦影片）狀態列圖示不明顯，要在真機再看。

### 截圖

在 `xiangqi-android/verify/`：`01-launch-15s.png`（A，開啟 15 秒還在重整）、`02-home.png`（A，加到主畫面視窗）、`03-home-full.png`（A，首頁）、`04-cpu.png`（A，練功房）、`05-cpu-move1.png`（A，電腦不回著、多執行緒錯誤）、`11-canary-launch-15s.png`、`12-canary-title.png`（B，開頭畫面）、`13-canary-film.png`（B，開場影片）、`14-canary-adventure.png`（B，星槎序局）、`15-canary-cpu.png`（B，序局星渦蓋住練功房）、`16-canary-relaunch.png`（B，再開後）、`21-fix-cpu-start.png`、`22-fix-cpu-reply.png`（實驗版，電腦回著）、`31-swfix-launch1.png`、`32-swfix-launch2.png`、`33-swfix-launch3.png`（正式版，清掉資料後連開 3 次的首頁）、`34-swfix-cpu-start.png`（正式版，練功房第 3 級開局）、`35-swfix-cpu-reply.png`（正式版，炮二平五後電腦回砲 2 進 7）、`41-oldwv-prompt.png`（A，降級說明）、`42-oldwv-cpu.png`（A，練功房寫那句話、電腦不回著）、`43-oldwv-relaunch.png`（A，關掉再開，不重整、再跳說明）、`44-newwv-cpu-reply.png`（B，炮二平五後電腦回象 3 進 5）。

### 模擬器驗不到的

- 真機的 ARM 處理器（模擬器是 x86_64，Pikafish WebAssembly 的速度、發熱、耗電都不代表手機）、各家廠商的 WebView 版本、低記憶體手機。
- 背景 10 分鐘回來、飛航模式、線上大廳、存檔匯出、觸覺回饋、3D 場景長時間跑（這次沒測）。
- 開場流程是用 DevTools 跳過的（關開頭畫面、直接切到練功房），新手流程本身沒有走完。

## 可重現驗證包

任何人拿公開倉庫就能一次重跑全部核對、留一份紀錄：

```
node source/xiangqi-lab/tools/verify-all.js --out 紀錄.txt
```

依序跑 `check-build`（`index.html` 由 `source/` 組出）、`release-verify`（雜湊、版本號跟 release.json 一致）、`pikafish-verify`（引擎跟建置紀錄比對）、`run-tests`（自動測試），不連網、不開瀏覽器。11 月 13 日對公開版 `20261113-0452` 的紀錄是 `verification-log-20261113-0452.txt`，四步全部通過（測試 639 項）。細節在〈開源建置與授權〉（[foss.md](foss.md)）的〈可重現驗證包〉。

## 限制

- debug APK 11/13 編得出來、可重現，Android 模擬器（WebView 154）上引擎能用，但**沒有在任何手機上試過**；`androidx.webkit` 1.18.0 的允許清單是 2026 年 10 月的新功能，只對過官方文件和函式庫的類別，各家手機的 WebView 支援到哪一版也還不知道。可重現只在同一台 Windows 電腦（換資料夾、換 debug 金鑰；11/13 再加全新的 npm／Gradle 快取，見〈發布版設定與乾淨環境重建〉）驗過。
- Google Play 的帳號、測試人數、大小上限、目標 API 這些規定常改，表格是 11 月 13 日查到的，送審前以 Play Console 為準；開發者驗證的實施狀況來自報導和 F-Droid 的公開信，不是 Google 官方文件。
- F-Droid 收不收 npm 下載的 Capacitor、收不收 870 MB 的 APK，都要等送出後維護者回覆；草稿照公開文件寫，沒有用 fdroidserver 實際試建。
- `npx cap add android` 在 Windows 產生的專案沒有放進任何 git 倉庫。

## 參考

- androidx.webkit 版本紀錄（1.18.0，2026-10-21，跨來源隔離允許清單）：https://developer.android.com/jetpack/androidx/releases/webkit
- `Profile#setCrossOriginIsolatedAllowlist` 文件：https://developer.android.com/reference/androidx/webkit/Profile
- Chromium：WebView 的 `crossOriginIsolated` 一直是 false：https://issues.chromium.org/issues/40914606
- Chrome：Android 88／桌面 92 的 SharedArrayBuffer 規定：https://developer.chrome.com/blog/enabling-shared-array-buffer
- F-Droid 建置設定欄位：https://f-droid.org/docs/Build_Metadata_Reference/
- F-Droid 收錄步驟：https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/
- F-Droid 反特性：https://f-droid.org/docs/Anti-Features/
- F-Droid 反對開發者驗證的公開信（2026-02-24）：https://f-droid.org/2026/02/24/open-letter-opposing-developer-verification.html
- Google Play 大小限制：https://support.google.com/googleplay/android-developer/answer/9859372
- iOS 版的同一個問題：`xiangqi-ios/notes/wasm-threads.md`（開發者電腦上）
