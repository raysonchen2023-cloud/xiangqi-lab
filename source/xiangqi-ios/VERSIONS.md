# 象棋千秋 iOS 版本與原始碼對應表

整理：iMac Claude（W32-B，2026-11-21）

## 散佈狀況

**2026-11-26 起有第一個 TestFlight 建置：** `20261126-0626`（建置號 1），只給 TestFlight 內部測試群組，還沒上 App Store、沒有外部測試。從這一版起 GPL 的原始碼提供義務開始，下表每一版都要寫「TestFlight 建置號」和對應的公開提交。

在那之前的建置都只用開發簽章，裝在開發者自己的 iPhone 和模擬器上做驗收，沒有對外散佈。

## 開發者 iPhone 裝過的版本

| App 內版號 | TestFlight 建置號 | 網頁基底（本倉庫提交） | 原生專案提交 | 能不能從本倉庫重建 |
| --- | --- | --- | --- | --- |
| `20261118-1909` | 無（開發簽章） | `f990368` | 未記錄 | 網頁可以；原生部分沒有公開 |
| `20261120-1557` | 無（開發簽章） | `7457bd6` | `4ca2ded`（未公開） | 網頁可以；原生部分和原生覆蓋沒有公開 |
| `20261120-1902` | 無（開發簽章） | `dc04ae4` | `4ca2ded`（未公開） | 同上 |
| `20261121-0102` | 無（開發簽章） | `ecc26e3` | `4ca2ded`（未公開） | 同上 |
| `20261121-0133` | 無（開發簽章） | `fff2b9f` | `4ca2ded`（未公開） | 同上；另外原生線修正當時還沒進網頁 |
| `20261121-0643` | 無（開發簽章） | `2ca12e1` | 本資料夾（`9d821d3` 起） | 可以：照當時的 REBUILD.md（`9d821d3`），index.html 逐位元相同 |
| `20261122-0804` | 無（開發簽章） | `6f85af4`（標籤 `web-20261122-0804`） | 本資料夾 | 可以：照當時的 REBUILD.md 從標籤建，index.html 是 `0b3d774b…` |
| `20261123-1652` | 無（開發簽章） | `c1ecf3f`（標籤 `web-20261123-1652`） | `58e0de2` | 可以：照當時的 REBUILD.md 從標籤建，index.html 是 `7b899589…` |
| **`20261126-0626`** | **1**（2026-11-26 上傳，TestFlight 內部） | **`8cf6464`**（標籤 `web-20261126-0626`） | **`8cf6464`**（同一個標籤） | **可以**：照 [REBUILD.md](REBUILD.md) 從標籤建，index.html 是 `234487ab…` |

- `4ca2ded` 是開發者本機的原生線提交，沒有推到公開倉庫。原生線的程式修正已經在 `2ca12e1`（20261121-0643）合進公開網頁，所以 0643 起不再依賴它。
- 0643 以前的版本都沒有對外散佈，GPL 的原始碼提供義務還沒開始。缺口留在這裡記錄，不另外補。

## 0626 重建核對（TestFlight 建置 1）

2026-11-27 iMac Claude 1 拿上傳的 `App.ipa` 和建包目錄，跟標籤 `web-20261126-0626` 的 `source/xiangqi-ios` 比：
- `App.ipa`：SHA-256 `bf2677b16f17eec0142202ac08b60ae14590e35595c2c7b1ea86453da9d6f1da`；`CFBundleVersion` 1、`CFBundleShortVersionString` 1.0。
- 包裡 `public/index.html` 的 SHA-256 `234487ab5c58c91544931db83cd30ff5084f221144b8b04b17503327acb454ca`（`XQ_BUILD="20261126-0626"`），跟建包目錄的 `www` 相同。
- 原生部分（`ios/App/App`、`project.pbxproj`、`native/`、`patches/`、`capacitor.config.json`）跟標籤相同，只差兩處，都不是原始碼：
  - `project.pbxproj` 的 `DEVELOPMENT_TEAM`：公開版刻意留空，建包時填開發者自己的 Team（見 REBUILD.md「簽章要自己填」）。
  - `ios/App/App/capacitor.config.json`、`config.xml`：`npx cap sync` 產生，已列在 `ios/.gitignore`。

## 0643 重建核對

- 套用 `web-overlay/index.html.patch` 後，`www/index.html` 的 SHA-256 是 `e6f2c861…5233e`，和開發者 iPhone 上實際載入的 index 相同。
- 已知差異：`park3d.js` 只差換行（安裝包是 CRLF），見 [REBUILD.md](REBUILD.md) 第四節。

## 以後每一版

送 TestFlight 或 App Store 前，在上表加一行，寫上：
- App 內版號
- TestFlight 建置號
- 網頁基底提交
- 本資料夾的提交

並確認照 REBUILD.md 能重建。
