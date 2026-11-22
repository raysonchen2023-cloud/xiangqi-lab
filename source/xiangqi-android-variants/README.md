# 象棋千秋 Android：已散佈版本的對應原始碼

這個資料夾放的是 Google Play 測試軌**已上傳過的每個 Android 版本**，對應的原生原始碼與原生版網頁差異。依 GPL-3.0-or-later，收到 App 的人都可以取得完全對應的原始碼。版本總表見 [releases/android.md](../../releases/android.md)。

## 怎麼組成

每一版都是「三層」疊起來的：

1. **共用建置鏈**：[source/xiangqi-android/](../xiangqi-android/)（Capacitor 專案、Gradle 設定、建置腳本，重建步驟見其中的 `REBUILD.md`）。
2. **這一版的原生差異**：本資料夾 `<版本>/android/` 底下的檔，用來覆蓋第 1 層同路徑的檔。沒有放的檔就跟第 1 層相同（`VARIANT-MANIFEST.json` 的 `sameAsBase` 是相同檔數）。
3. **這一版的網頁**：公開倉庫 `VARIANT-MANIFEST.json` 裡 `webCommit` 那個提交的網頁成品，加上 `web-overlay/`：
   - `index.html.patch`：原生版 `index.html` 跟公開網頁不同的段落（例如更新改由商店處理、原生版不用 Service Worker 更新）。
   - `xq-native-migration.html`：原生版第一次開啟時，清掉舊網頁版快取的遷移頁。
   - 原生版的 `sw.js` 由 `source/xiangqi-android/scripts/native-sw.js` 產生（`make-www.js` 會放進去）。

## 已驗證

- 每一版的公開網頁 `webCommit:index.html` 套用 `index.html.patch` 後，跟該版 AAB 裡的 `base/assets/public/index.html` **逐位元相同**（SHA-256 記在 `VARIANT-MANIFEST.json` 的 `aab`）。
- 原生檔取自該版建置資料夾，建置後沒再修改（以檔案修改時間對照 AAB 建置時間）。例外寫在 `missing`。
- 換行一律統一成 LF；Java、Gradle、JSON 的換行不影響編譯結果。

## 還沒驗證

- **沒有在乾淨環境從頭重建這些版本**，也沒有逐位元比對 APK。重建步驟沿用 `source/xiangqi-android/REBUILD.md`。差別是：網頁成品要先切到該版的 `webCommit`，再套用本資料夾的差異。

## 建包與送審（2026-11-22 起，W69 流程盤點第 3 項）

建包步驟已寫成 [`source/xiangqi-android/scripts/build-variant.js`](../xiangqi-android/scripts/build-variant.js)，不再手寫 build.sh。26112201 第一版就是漏了 `--home-art`，少了 81 個首頁素材。

```
# 1. 建 AAB：從網頁發布的 tag＋這一版的原生差異（每一步都檢查，任何一步不對就停）
node scripts/build-variant.js --repo <公開倉庫> --tag web-<版號> --variant <變體> --code <versionCode> --name <versionName> \
     --home-art <開發者電腦 xiangqi-db/art> --work <工作資料夾> --signing <signing.properties>
#    → <work>/out/xiangqi-<code>-<name>.aab 與 build-record.json（tag、提交、換成 CDN 現行版的檔、AAB 的 SHA-256）

# 2. P0 用的 APK 一律從「同一個 AAB」產（bundletool universal，同一把上傳金鑰）
node scripts/aab-to-apk.js --aab <上一步的 AAB> --signing <signing.properties> --out <資料夾> --bundletool <bundletool-all.jar>

# 3. P0 三項都帶這個 AAB 的 SHA-256
node scripts/check-aab-assets.js --aab <AAB> --cdn --out p0-img.json                         # P0-IMG（報告自己算 AAB 雜湊）
node scripts/check-upgrade.js --old <上一版 APK> --new <第 2 步的 APK> … --aab-sha <雜湊> --out <資料夾>   # P0-UPD（upgrade.json）
node scripts/check-3d.js --build <版號> --aab-sha <雜湊> …                                   # P0-3D（W67）

# 4. 送審閘門：三份報告都綁在這個 AAB 上、都通過，才能送審
node scripts/p0-gate.js --aab <AAB> --reports p0-img.json <資料夾>/upgrade.json <P0-3D 報告>
```

- `build-variant.js` 會把安裝包裡「需求清單內、跟 CDN 現行版不同」的素材換成 CDN 那份，並核對 SHA-1。W42 那 7 個舊副本，不再靠人記檔名。
- 變體設定檔的 `webRemove` 寫要從安裝包拿掉的檔，例如封測小包不放 `data/docs/evidence`。
- 重建比這支腳本還早的版本時，用 `--variant-from` 指定較新的變體資料夾，`build-record.json` 會記下來。

## 重建某一版（手動步驟，供參考）

以 `mini-26112104` 為例，工作區 `$W` 照 `REBUILD.md` 準備（現在用上面的 `build-variant.js` 一次做完）：

```
# 1. 原生專案：共用建置鏈＋這一版的原生差異
copy source/xiangqi-android        → $W/xiangqi-android
copy source/xiangqi-android-variants/mini-26112104/android/*  → $W/xiangqi-android/android/（覆蓋）

# 2. 網頁：公開倉庫切到 webCommit，再做原生版網頁
git -c core.autocrlf=false -C $W/web checkout 2ca12e10e84b3787dff8492803a8354fceca0944
cd $W/xiangqi-android && npm ci && node scripts/make-www.js --repo $W/web
git -c core.autocrlf=false -C www apply -p1 <本資料夾>/web-overlay/index.html.patch   （在 www/ 底下套用）
copy <本資料夾>/web-overlay/xq-native-migration.html → www/

# 3. 同步與編譯（封測小包不加 -PxqOffline；全離線版加 -PxqOffline=true 並先跑 scripts/make-offline-packs.js）
node node_modules/@capacitor/cli/bin/capacitor sync android
cd android && ./gradlew bundleRelease -PxqVersionCode=26112104 -PxqVersionName=20261121-0643-mini
```

## 素材

安裝包裡 `data/` 底下的圖片、音樂、3D 模型等是開發者自製素材，授權是 CC BY-NC-SA 4.0（見 `LICENSE-ASSETS.md`），不是程式原始碼。這些素材公開放在 CDN（`https://xiangqi-cdn.pages.dev/data/`）。封測小包把首頁用的少數素材打包進安裝包（`bundle-home-assets.js`），其餘執行時由 `XQCdnFallback` 向 CDN 下載。全離線版用 `make-offline-packs.js` 把素材放進四個 install-time 素材包。
