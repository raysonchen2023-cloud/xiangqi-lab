# 象棋千秋 Android：乾淨環境重建與發布版

最後核對：2026 年 11 月 13 日。這份是給「拿到原始碼、想自己編出一樣的 App」的人（F-Droid、審查者、開發者換電腦）看的步驟。背景與驗證結果在 `xiangqi-db/art/docs/android.md`（公開倉庫的 `data/docs/android.md`）。

**重點：** 同一份輸入（原生專案＋公開倉庫的某個 commit）、同一套釘住版本的工具，在全新的資料夾、全新的 Gradle 快取、全新的 npm 快取、全新的 debug 金鑰下重編，APK 拿掉簽章區塊後逐位元相同、AAB 解開後內容相同。簽章本來就跟金鑰走，一定不同。

## 一、釘住的版本

換任何一項，編出來的 APK 就可能不一樣（不是壞掉，只是不能逐位元比對）。

| 項目 | 版本 | 怎麼釘的 |
|---|---|---|
| JDK | Eclipse Temurin 21.0.13+9（LTS） | `android/build.gradle` 檢查主版本一定要 21（不是就停；真的要用別版加 `-PxqAllowJdk=true`）。Windows 下載檔 `OpenJDK21U-jdk_x64_windows_hotspot_21.0.13_9.zip`，SHA-256 `a4dbaa05fca4bd89d84584e58c459bd732efebb1722af80ab13c6516832004f9`；Linux 用同一版的 `OpenJDK21U-jdk_x64_linux_hotspot_21.0.13_9.tar.gz`（雜湊看 Adoptium 網站） |
| Gradle | 8.14.3（all） | `android/gradle/wrapper/gradle-wrapper.properties` 的 `distributionSha256Sum=ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c`，wrapper 下載後自己核對；`gradle-wrapper.jar` 的 SHA-256 `7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172`（跟 services.gradle.org 公布的一樣） |
| Android Gradle 外掛（AGP） | 8.13.0 | `android/build.gradle` 的 `classpath`；連同所有 Maven 相依（androidx、Kotlin、R8…共 389 個元件）的 SHA-256 都寫在 `android/gradle/verification-metadata.xml`，Gradle 下載後逐一核對，不符就停 |
| Android SDK Platform | android-36 r02 | `android/variables.gradle` 的 `compileSdkVersion = 36`；`sdkmanager "platforms;android-36"` 裝的要是 `Pkg.Revision=2`（看 `platforms/android-36/source.properties`） |
| Build-Tools | 35.0.0 | `android/variables.gradle` 的 `buildToolsVersion = '35.0.0'`，`app/build.gradle` 用它（也是 AGP 8.13.0 的預設） |
| minSdk／targetSdk | 24／36 | `android/variables.gradle` |
| androidx.webkit | 1.18.0 | `android/variables.gradle`（跨來源隔離允許清單要 1.18.0 以上） |
| Capacitor | `@capacitor/android`、`@capacitor/core`、`@capacitor/cli` 都是 8.6.2 | `package.json` 寫死版本（沒有 `^`），`package-lock.json` 有每個套件的 `integrity`（SHA-512），`npm ci` 照它核對 |
| Node.js／npm | Node 22 以上（參考建置 24.20.0）、npm 11.19.0 | 只用來跑 `npm ci`、`make-www.js`、`capacitor sync`；不進 APK |
| 網頁成品 | 公開倉庫 `github.com/raysonchen2023-cloud/xiangqi-lab` 的某個 commit | `make-www.js` 先跑 `source/check-build.js`：發布的 `index.html` 必須是 `source/` 組出來的；`native-build.json` 不寫時間 |

`xiangqi-android/build-records/toolchain-20261113.json` 有每個工具下載檔的網址和 SHA-256。

## 二、乾淨環境重建（照著打就好）

下面用 Windows PowerShell 寫；Linux／macOS 把 `gradlew.bat` 換成 `./gradlew`、環境變數用 `export`。

### 0. 準備

1. 裝 JDK 21.0.13+9、Android SDK 命令列工具，再用 `sdkmanager` 裝 `platforms;android-36` 和 `build-tools;35.0.0`（第一次會要你看過、同意 Android SDK 授權）。
2. 裝 Node.js 22 以上和 git。
3. 開一個**全新的空資料夾**當工作區，例如 `C:\xq-rebuild`。下面的快取也都放在裡面，跟你電腦原有的分開：

```
$W = "C:\xq-rebuild"
$env:JAVA_HOME = "<JDK 21.0.13+9 的資料夾>"
$env:ANDROID_HOME = "<Android SDK 的資料夾>"
$env:GRADLE_USER_HOME = "$W\gradle-home"         # 全新的 Gradle 快取：Gradle 本體和所有相依都重新下載、照 verification-metadata.xml 核對
$env:ANDROID_USER_HOME = "$W\android-user-home"  # 全新的 debug 金鑰（第一次編譯時自動產生）
$env:npm_config_cache = "$W\npm-cache"            # 全新的 npm 快取
```

路徑別太長（Windows 有 260 字元限制，Gradle 的中間檔路徑很深）。

### 1. 拿原始碼

- **原生專案**：`xiangqi-android/` 裡會進版本控制的檔（照 `.gitignore`：不含 `node_modules/`、`www/`、`android/**/build/`、`android/.gradle/`、`android/app/src/main/assets/public/`、`local.properties`、任何金鑰）。複製到 `$W\xiangqi-android`。
- **網頁**：公開倉庫的指定 commit。用 git 取，不要讓 git 改換行：

```
git -c core.autocrlf=false clone --no-checkout https://github.com/raysonchen2023-cloud/xiangqi-lab.git $W\web
git -C $W\web -c core.autocrlf=false checkout <commit>
```

### 2. 做網頁成品、放進 Android 專案

```
cd $W\xiangqi-android
npm ci --no-audit --no-fund
node scripts\make-www.js --repo $W\web        # 先跑 check-build；成品寫到 www\，含 native-build.json（網站版本號）
node node_modules\@capacitor\cli\bin\capacitor sync android   # 把 www 複製到 android\app\src\main\assets\public，另加 cordova.js、cordova_plugins.js
```

### 3. 編譯

```
cd $W\xiangqi-android\android
.\gradlew.bat assembleDebug --no-daemon --console=plain
.\gradlew.bat assembleRelease bundleRelease -PxqSigning=<簽章設定檔> --no-daemon --console=plain
```

- 不給 `-PxqSigning` 也能編：release 會是沒簽章的 `app-release-unsigned.apk` 和沒簽的 AAB（比對內容一樣有效）。
- 只是要證明流程能跑，可以拿第一步產生的 debug 金鑰當「暫時的發布金鑰」，簽章設定檔寫：

```
storeFile=C:/xq-rebuild/android-user-home/debug.keystore
storePassword=android
keyAlias=androiddebugkey
keyPassword=android
```

（這是 Android 公開的預設 debug 密碼，不是秘密；**用它簽的 App 不能上架**。）

成品：

| 檔 | 位置（`android/app/build/outputs/` 底下） |
|---|---|
| debug APK | `apk/debug/app-debug.apk` |
| release APK | `apk/release/app-release.apk`（沒簽章時是 `app-release-unsigned.apk`） |
| AAB（上傳 Google Play 用） | `bundle/release/app-release.aab` |

### 4. 比對

```
node scripts\repro-check.js --compare <別人編的 app-debug.apk> $W\xiangqi-android\android\app\build\outputs\apk\debug\app-debug.apk
```

- APK：要看到「拿掉簽章區塊後：逐位元相同」（結束代碼 0）。
- AAB：AAB 用 jar 簽章（`META-INF/*.SF`、`*.RSA`、`MANIFEST.MF` 在 ZIP 裡面），所以比「內容（不含簽章）：相同」、差異只有「簽章不同」。

### 一次做完：`scripts/clean-rebuild.js`

上面第 1～4 步寫成一支程式，在全新的 `--work` 資料夾裡全部重做一次，再跟參考成品比：

```
node scripts\clean-rebuild.js --web-repo <公開倉庫的本機 git> --web-rev <commit> --work <全新的空資料夾> --reference <放 app-debug.apk、app-release.apk、app-release.aab 的資料夾> --out build-records\rebuild-<日期>.json
```

它只複製 `git ls-files` 認得的檔（在 `--work` 裡建一個暫時的空 git 來判斷，不 commit、不動原本的專案），Gradle 快取、npm 快取、debug 金鑰都是全新的；release 用這把新 debug 金鑰當暫時金鑰簽。只需要 `JAVA_HOME`、`ANDROID_HOME`。

### 參考值（11/13，公開倉庫 commit `253d76925e8b9836a3567ea68e72b489dbfd1ccd`＝網站 `20261113-0540`）

| 成品 | 拿掉簽章後的 SHA-256（APK）／內容雜湊（AAB，每個項目解壓後、不含簽章） |
|---|---|
| debug APK | 拿掉簽章區塊後 `cb430e80e64b09cc488f8740eee9bcb66003ae87e9baf9754d5d70af81c1e9fd` |
| release APK | 拿掉簽章區塊後 `62ada3afd0e00152843084e9b934b3a7275e4fc6a862a0696fe18c5756e541c6` |
| AAB | 內容雜湊 `8f5aa2389508cda31c07955fa6265d17fff4d24e24c0fab581e72105a69aad3a` |

紀錄在 `build-records/rebuild-20261113.json`。換網站版本、改原生碼，這些值就會變。

## 三、發布版設定

`android/app/build.gradle`：

- **R8 縮減**：release 開 `minifyEnabled true`，規則用 `proguard-android-optimize.txt`＋`proguard-rules.pro`（Capacitor、androidx.webkit 自帶規則）。dex 從 6 個縮成 1 個；release APK 約 93 MB（大部分是網頁和引擎檔，R8 管不到）。
- **不寫 git commit 進 APK**：`vcsInfo.include = false`，從 git 編跟從原始碼包編才會一樣。
- **不放 Google 的相依資訊區塊**：`dependenciesInfo { includeInApk = false; includeInBundle = false }`（F-Droid 要求）。
- **版本號規則**（從輸入檔算，不看編譯時間）：
  - `versionName`＝網站版本號（`native-build.json` 的 `siteVersion`），例如 `20261113-0540`。
  - `versionCode`＝網站版本號的「年後兩碼＋月日＋時」：`20261113-0540` → `26111305`。只增不減；Google Play 上限 2100000000，用到 2099 年都夠。
  - 同一個小時要發兩版（versionCode 會撞）：加 `-PxqVersionCode=26111306`（必要時再加 `-PxqVersionName=…`）。
  - 沒有網頁成品時是 `1`／`0.0.0-dev`，只能自己測，不要上傳。
- **簽章**：從倉庫外面的 properties 檔讀（`-PxqSigning=<路徑>` 或環境變數 `XQ_SIGNING_PROPERTIES`），四行 `storeFile`、`storePassword`、`keyAlias`、`keyPassword`。倉庫的 `.gitignore` 擋了 `*.jks`、`*.keystore`、`*.p12`、`keystore.properties`、`signing.properties`；`scripts/check-skeleton.js` 也會擋 `android/` 裡的金鑰檔。

## 四、開發者要自己做的（Claude 不會、也不該代做）

1. **產生上傳金鑰**（只做一次，在自己的電腦）：

   ```
   keytool -genkeypair -v -keystore <倉庫外面的資料夾>\xq-upload.jks -alias xq-upload -keyalg RSA -keysize 4096 -validity 10000
   ```

   會問兩次密碼和姓名等資料。**金鑰檔和密碼不要放進任何倉庫、雲端同步資料夾、聊天、也不要給 AI**；另外備份一份到離線的地方（隨身碟、密碼管理器的附件）。
2. **寫簽章設定檔**（同樣放倉庫外面），例如 `<倉庫外面的資料夾>\xq-signing.properties`：

   ```
   storeFile=<倉庫外面的資料夾>/xq-upload.jks
   storePassword=<你設的密碼>
   keyAlias=xq-upload
   keyPassword=<你設的密碼>
   ```

3. **編正式版**：照第二節做網頁成品，然後 `gradlew.bat bundleRelease -PxqSigning=<上面那個檔>`，得到 `app-release.aab`。可以先用 `jarsigner -verify -verbose app-release.aab` 看簽章是不是你的金鑰。
4. **Play App Signing（Google Play 應用程式簽署）**：在 Play Console 建立 App 時選「讓 Google 產生並管理應用程式簽署金鑰」（新 App 的預設）。你上傳的 AAB 用「上傳金鑰」簽，Google 驗過後換成它保管的「應用程式簽署金鑰」發給玩家。上傳金鑰掉了可以透過 Play Console 申請重設（要等幾天）；應用程式簽署金鑰由 Google 保管、不會掉。第一次上傳後，到「測試與發布 → 設定 → 應用程式完整性」記下兩把金鑰的 SHA-256 憑證指紋。
5. **付款、身分驗證、封閉測試、資料安全表單、送審**：都要開發者本人在 Play Console 做（見 `android.md`〈Google Play 路線〉）。
6. **F-Droid**：F-Droid 預設用它自己的金鑰簽，不需要你的金鑰；要改發「你簽的版本」，要在 metadata 寫 `AllowedAPKSigningKeys`（你的金鑰憑證 SHA-256），靠的就是這份文件的可重現建置。

## 五、還沒驗證的

- 只在同一台 Windows 電腦上做過（全新資料夾、全新快取、全新金鑰）；別台電腦、Linux（F-Droid 的建置環境）、別家發行的 JDK 21 還沒試。
- F-Droid 草稿的建置方式（不跑 `capacitor sync`、`make-www.js --into` 直接寫進 assets）少了 `cordova.js`、`cordova_plugins.js` 兩個檔，跟這份步驟編出來的 APK 內容不會一樣；要對齊得在 `make-www.js` 補這兩個檔（還沒做）。
- 用正式上傳金鑰簽的 AAB、Google Play 的預先審查都還沒做（金鑰由開發者產生）。
