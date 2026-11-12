# Android 與 F-Droid 路線圖

最後核對：2026 年 11 月 13 日（評比第 14 輪 F3 寫成）。這一頁是計畫和現況整理，不是法律意見。**目前還沒有任何 Android 安裝檔**；下面寫的骨架只在開發者電腦上，沒有編譯過、沒有在手機上跑過。

## 先講結論

- **骨架有了，安裝檔還沒有。** 開發者電腦上的 `xiangqi-android/` 是 Capacitor 8.6.2 專案：用 npm 裝了官方的 `@capacitor/android`，在**沒有 Android SDK** 的 Windows 上跑 `npx cap add android` 產生了 Gradle 專案；拿掉了 Google 服務外掛、寫了引擎多執行緒要用的原生碼草稿、F-Droid 建置設定草稿和商店文字草稿。要建出 APK 還要裝 Android 工具鏈（JDK、Android SDK、Gradle），這次**沒有裝**，等開發者決定。
- **最大的技術風險是引擎。** Pikafish 是多執行緒 WebAssembly，要 `SharedArrayBuffer`。Android 的 WebView 不支援網頁版用的 COOP／COEP 跨來源隔離；2026 年 10 月 21 日 androidx.webkit 1.18.0 才新增官方的開法（允許清單＋`Document-Isolation-Policy` 標頭）。骨架照這個寫了草稿，**沒有實機驗證**；手機上的 WebView 太舊就不能用，要有備案（Android 版改用 NDK 編原生 Pikafish）。
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
| 原生碼 | Swift：`XQLoopbackServer.swift`、`XQBridgeViewController.swift` | Java：`MainActivity.java`、`XQWebViewClient.java`（草稿） |
| 原生橋接（觸覺、分享、關 service worker…） | `src/native-bridge.js` | **還沒做**；可以沿用 iOS 那支，外掛換 Android 版 |
| 網址被當成「本機測試」 | 要套 N1～N3（`127.x`） | 一樣要套：`localhost` 也會被 `net.js` 當成測試機、進測試房（見下面〈要做的事〉第 3 步） |

## 引擎多執行緒：COOP／COEP 與 SharedArrayBuffer

**問題：** 引擎用 Emscripten `-pthread` 編，記憶體是共用的（`SharedArrayBuffer`）；`engine.js` 沒有 `crossOriginIsolated` 就直接丟錯，沒有單執行緒備援。網頁版靠 `sw.js` 替每個回應補 COOP／COEP 標頭。Android WebView 不行：Chromium 的說法是 WebView 沒有「每個網站一個渲染程序」的隔離，所以一直不開 `SharedArrayBuffer`，也不支援 COOP。

**官方開法（2026 年 10 月）：** androidx.webkit 1.18.0 新增 `Profile#setCrossOriginIsolatedAllowlist`。App 把信任的來源放進允許清單，該來源的頁面再帶 `Document-Isolation-Policy` 回應標頭，就能用 `SharedArrayBuffer`；官方文件提醒只能放自己信任的來源。手機上的 WebView 版本要支援（`WebViewFeature.CROSS_ORIGIN_ISOLATED_ALLOWLIST`），要在執行時查。

**骨架的寫法（草稿，沒編譯）：**

1. `android/variables.gradle`：`androidxWebkitVersion` 從 Capacitor 預設的 1.14.0 改成 1.18.0；`app/build.gradle` 加 `androidx.webkit` 相依。
2. `MainActivity.java`：在 Capacitor 開始載入頁面**之前**，查 `MULTI_PROFILE`、`CROSS_ORIGIN_ISOLATED_ALLOWLIST` 兩個功能，有就把 `https://localhost` 放進允許清單；再換成下面的 WebViewClient、從頭載入一次。
3. `XQWebViewClient.java`：繼承 Capacitor 的 `BridgeWebViewClient`，只替 `https://localhost` 的回應補 `Document-Isolation-Policy: isolate-and-require-corp`、`Cross-Origin-Opener-Policy`、`Cross-Origin-Embedder-Policy`、`Cross-Origin-Resource-Policy: same-origin`（Capacitor 的本機伺服器沒有加自訂標頭的設定，讀 `@capacitor/android` 8.6.2 原始碼確認）。跨站從 CDN 補的檔不經過這裡，CDN 已帶 `Cross-Origin-Resource-Policy: cross-origin`。

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
| `android/` | `npx cap add android` 產生的 Gradle 專案（compileSdk／targetSdk 36、minSdk 24＝Android 7.0、Gradle 8.14.3、Android Gradle 外掛 8.13.0） | 產生成功（不需要 Android SDK）；**沒有編譯過** |
| `android/build.gradle`、`app/build.gradle` | 拿掉 `com.google.gms:google-services` 外掛和套用它的段落；加 `dependenciesInfo { includeInApk = false; includeInBundle = false }`（F-Droid 不收 Google 加密的相依資訊區塊） | 改好 |
| `android/.gitignore` | 改成讓 Capacitor 產生的設定檔可以提交，F-Droid 建置時就不用跑 Capacitor CLI（CLI 8 要 Node 22，F-Droid 的 Debian 是 Node 20） | 改好 |
| `MainActivity.java`、`XQWebViewClient.java` | 跨來源隔離允許清單＋標頭（上一節） | 草稿 |
| `scripts/make-www.js` | 只用公開倉庫做網頁成品；可以直接寫進 `android/app/src/main/assets/public`；`--assets` 補只在 CDN 的大檔；`native-build.json` 不寫建置時間（才能逐位元重現） | 11/13 對公開倉庫 `20261113-0452` 實測：check-build 一致，513 個檔、106.9 MB |
| `scripts/check-skeleton.js` | 不用 SDK、不連網的檢查：沒有 Google Play 服務／Firebase、關掉相依資訊區塊、webkit ≥ 1.18.0、原生碼有允許清單和標頭、來源固定、沒有二進位檔、F-Droid 草稿欄位齊全 | 11/13 全部通過（只列「有 gradle-wrapper.jar」提醒） |
| `fdroid/com.raysonchen.xiangqiqianqiu.yml` | 給 fdroiddata 的建置設定草稿（下面〈F-Droid 路線〉） | 草稿，還不能送 |
| `fastlane/metadata/android/zh-TW`、`en-US` | 商店標題、短說明、長說明（F-Droid 從倉庫讀） | 草稿 |
| `www/index.html` | 只是佔位頁，讓 `cap add` 有東西可以複製 | — |

**還沒做的：** 原生橋接（觸覺、分享、存檔匯出、關 service worker、每日提醒）、圖示和啟動畫面、簽章金鑰、`localhost` 被當成測試機的修補、編譯、實機測試。

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
| 1 | 決定下面〈要開發者決定的事〉的前 4 項（工具鏈、appId、引擎路線、專案放哪） | **開發者** | — |
| 2 | 裝 Android 工具鏈（見決定 1），`cd xiangqi-android/android` 跑 `gradlew assembleDebug` 編出第一個 APK | Claude（裝之前先問） | 半天，大部分是下載 |
| 3 | 修補「本機測試」判斷：`net.js`、`05-settings.js reportPlayer()`、`05b-save.js fnTest()` 加 `window.XQ_NATIVE`（跟 iOS 的 N1～N3 同一套，`localhost` 也會中） | Claude | 1 小時＋發布網頁版 |
| 4 | 原生橋接：沿用 `xiangqi-ios/src/native-bridge.js`，外掛換 `@capacitor/haptics`、`share`、`filesystem`、`app`、`splash-screen` 的 Android 版；關掉 service worker | Claude | 1 天 |
| 5 | 實機驗證引擎（上面〈怎麼驗證〉）；WebView 不行就走備案 B | Claude＋**開發者的手機** | 半天；備案 B 另加 3～5 天 |
| 6 | 圖示、啟動畫面、簽章金鑰（金鑰由開發者保管） | Claude 準備、**開發者保管** | 半天 |
| 7 | Google Play：帳號、封閉測試、資料安全、內容分級，送審 | **開發者**（付款、身分驗證、送出） | 帳號 1～2 天＋封閉測試 14 天 |
| 8 | F-Droid：解決預編引擎和大檔、把 Android 專案放上公開倉庫打 tag、用 fdroidserver 自己試建、送 fdroiddata 合併請求 | Claude 準備、**開發者送出** | 看第 5 步和大檔的決定 |

## 要開發者決定的事

1. **要不要在這台電腦裝 Android 工具鏈。** 最少要 JDK 21、Android SDK 命令列工具（platform 36、build-tools）、Gradle 8.14.3（`gradlew` 會自己下載），合計約 3～5 GB；或裝 Android Studio（再多幾 GB）。這次照規則**沒有裝**。
2. **appId（Android 叫 applicationId）。** 草稿用跟 iOS 一樣的 `com.raysonchen.xiangqiqianqiu`；上架後不能改。
3. **引擎走哪條路。** A：WebView 允許清單（骨架已寫，挑 WebView 版本）；B：NDK 原生 Pikafish（較穩、F-Droid 較順，工多）。
4. **Android 專案放哪。** 草稿假設放進 `xiangqi-lab` 公開倉庫的 `android/`；也可以另開一個倉庫（F-Droid 的 `Repo`、`subdir` 跟著改）。
5. **大檔怎麼給。** APK 只放瘦身版、執行時從 CDN 抓；或 Play Asset Delivery；或把素材放到公開的發布附件給 F-Droid。
6. **上不上 Google Play、F-Droid 主倉庫、還是先自架 F-Droid 倉庫。**
7. **三種匿名資料預設開還是關**（影響 F-Droid 的 Tracking 標記和 Play 的資料安全表單）。
8. **版本號規則**（草稿：versionName＝網站版本號、versionCode＝yyMMddHH）、**最低 Android 版本**（Capacitor 預設 Android 7.0）。

## 可重現驗證包

任何人拿公開倉庫就能一次重跑全部核對、留一份紀錄：

```
node source/xiangqi-lab/tools/verify-all.js --out 紀錄.txt
```

依序跑 `check-build`（`index.html` 由 `source/` 組出）、`release-verify`（雜湊、版本號跟 release.json 一致）、`pikafish-verify`（引擎跟建置紀錄比對）、`run-tests`（自動測試），不連網、不開瀏覽器。11 月 13 日對公開版 `20261113-0452` 的紀錄是 `verification-log-20261113-0452.txt`，四步全部通過（測試 639 項）。細節在〈開源建置與授權〉（[foss.md](foss.md)）的〈可重現驗證包〉。

## 限制

- 骨架**沒有編譯過**，Java 草稿可能有編譯錯誤；`androidx.webkit` 1.18.0 的允許清單是 2026 年 10 月的新功能，這次只讀官方文件，**沒有在任何手機上試過**，各家手機的 WebView 支援到哪一版也還不知道。
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
