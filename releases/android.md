# Android 版本與原始碼對應表

依 GPL-3.0-or-later，每個散佈過的版本都要有完全對應的原始碼。這張表記錄 Google Play 測試軌上傳過的每一版（2026-11-21 從 Play Console「所有應用程式套件」核對，共 10 版），以及各版的原始碼在哪裡。

- **網頁基底**：原生版網頁所根據的公開倉庫提交，也就是安裝包 `native-build.json` 裡的 `sharedWebCommit`。
- **原生原始碼**：在 `source/xiangqi-android/`（共用建置鏈）加上 `source/xiangqi-android-variants/<版本>/`（該版差異）。組法見[變體說明](../source/xiangqi-android-variants/README.md)。
- 之後每次送審，送出前先在公開倉庫打 tag `android-<versionCode>`，並在這張表加一列。App 內的原始碼連結會改成指向該版的 tag（併入下一個發布版）。
  - **怎麼打（W69 流程盤點中 14，2026-11-23 起）：** 候選包通過 P0 閘門（`p0-gate.js` 全過）、送審前，建包的人跑：先把這一版的變體資料夾（含 `VARIANT-MANIFEST.json`）合併進 main，再跑 `gh workflow run tag-native.yml --ref main -f platform=android -f build=<versionCode> -f web=<網頁版號> -f variant_commit=<那個 main 提交，40 碼> -f pkg_sha256=<AAB 的 SHA-256>`。由 GitHub Actions 打在 `web-<網頁版號>` 的提交（網頁跟 AAB 一樣），並核對變體清單的 `webCommit`、`siteVersion`；變體提交與 AAB 雜湊寫進標籤說明。同號不覆寫。iOS 一樣，`platform=ios`、`build=<build>`、`pkg_sha256` 填 IPA 的雜湊。版本標籤受規則集保護，不准改、不准刪；打錯只能換新的建置號。
  - **產物比對也是送審閘門的一項（W91，2026-11-24 起）：** `p0-gate.js` 除了 P0-IMG、P0-UPD、P0-3D，還要收一份 `aab-diff.js` 的報告，缺了、或任一項不符就不能送審，也不能豁免。跑法（在 `source/xiangqi-android`）：
    ```
    node scripts/aab-diff.js <Play 現行版.aab> <要送審的.aab> --strict --old-code=<Play 現行版的 versionCode> --new-code=<這一版的 versionCode> [--expect-removed=… --expect-added=… --expect-shrunk=…] [--ack=<確認清單.json>] --json=aab-diff.json --md=aab-diff.md
    node scripts/p0-gate.js --aab <要送審的.aab> --build <網頁版號> --reports img.json upd.json 3d-12.json 3d-16.json 3d-canary-12.json 3d-canary-16.json aab-diff.json
    ```
    - 閘門核對：新版雜湊＝要送審的 AAB、舊版寫明 versionCode 而且不是同一個檔、用 `--strict` 跑、紅項 0、沒確認的黃項 0、結束代碼 0、`aab-diff.js` 跟 origin/main 那一版一樣（工具鎖定）。舊版是不是真的 Play 現行版，閘門看不到 Play，只能核對報告有寫；跑的人要從 Play Console「所有應用程式套件」確認。
    - 黃項：人看過後把報告裡的確認碼寫進 `--ack` 清單再跑；紅項不能確認。新增的檔不在現行包本來就有的位置（例如根目錄多了說明文件、`releases/`），或驗證紀錄、證據頁進了安裝包，也算黃。
    - 金絲雀：`aab-diff.js` 每次都從這個候選包自己做四種壞樣本（刪一個首頁素材、把一個 js 縮成 0 位元組、多帶一個 `.jks`、多一個沒確認的 `AGENTS.md`），用同一套參數與確認清單判斷；前三種要紅、第四種要黃，少一種沒抓到，報告就 `pass: false`，閘門擋。參數寫太寬（例如 `--expect-removed=.`）會讓金絲雀抓不到。
    - 閘門會印出舊版 versionCode、放行參數、確認過的黃項數，送審收據照抄。

| versionCode | versionName | 種類 | 網頁基底 | 原生原始碼 | 對應程度 |
|---|---|---|---|---|---|
| 26112104 | 20261121-0643-mini | 封測小包 | `2ca12e1` | `variants/mini-26112104` | ✅ 完整：網頁套差異後與 AAB 逐位元相同；原生檔建置後未改 |
| 26112103 | 20261121-0133-mini-w30 | 封測小包 | `fff2b9f` | `variants/mini-26112103` | ✅ 完整：同上（原生檔與 26112104 相同） |
| 26112102 | 20261121-0133-mini | 封測小包 | `fff2b9f` | `variants/mini-26112102` | ⚠️ 缺 1 檔：`XQCdnFallback.java` 舊版（之後被 W30 改寫，沒有另外留存）；其餘完整 |
| 26112023 | 20261120-1902 | 全離線 | `dc04ae4` | `variants/offline-26112023` | ✅ 完整（網頁逐位元相同；原生檔建置後未改） |
| 26112021 | 20261120-1406-w21 | 全離線 | `3355041` | `variants/offline-26112021` | ✅ 完整（同上） |
| 26112016 | 20261120-1406 | 瘦身版 | `3355041` | 網頁同 `variants/offline-26112021` 的 `web-overlay`；原生 — | ⚠️ 部分：iMac 留存的 AAB（SHA-256 `43d9b848a1ab1747…`）拆包核對，網頁用 `3355041` 套 `offline-26112021/web-overlay/index.html.patch` 後逐位元相同；原生 Java 原始碼沒有留存，只剩編譯後的 dex（原生修正 3 項：retire-pwa-cache-recheck、no-cold-start-webview-prompt、local-3d-board-controls-docked） |
| 26112007 | 20261120-0260 | 待查 | 待查 | — | ❌ 缺口：Windows、iMac 都沒有留存 AAB 與建置資料夾 |
| 26111922 | 20261119-2251 | 待查 | 待查 | — | ❌ 缺口：Windows、iMac 都沒有留存 AAB 與建置資料夾 |
| 26111817 | 20261118-1740 | 瘦身版 | 待查 | 推定為公開倉庫 11/18 匯出的 `source/xiangqi-android`（未驗證） | ❌ 缺口：未驗證 |
| 26111814 | 20261118-1423 | 瘦身版 | 待查 | 同上（未驗證） | ❌ 缺口：未驗證 |

**缺口的後續處理**：其餘缺口版本可以從 Play Console 下載原始 AAB，把網頁拆出來核對，原生 Java 則只剩編譯後的形式。目前測試軌上只開放最新的 26112104，較早的版本都已被取代。
