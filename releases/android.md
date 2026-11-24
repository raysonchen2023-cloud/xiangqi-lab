# Android 版本與原始碼對應表

依 GPL-3.0-or-later，每個散佈過的版本都要有完全對應的原始碼。這張表記錄 Google Play 測試軌上傳過的每一版（2026-11-21 從 Play Console「所有應用程式套件」核對，共 10 版），以及各版的原始碼在哪裡。

- **網頁基底**：原生版網頁所根據的公開倉庫提交，也就是安裝包 `native-build.json` 裡的 `sharedWebCommit`。
- **原生原始碼**：在 `source/xiangqi-android/`（共用建置鏈）加上 `source/xiangqi-android-variants/<版本>/`（該版差異）。組法見[變體說明](../source/xiangqi-android-variants/README.md)。
- 之後每次送審，送出前先在公開倉庫打 tag `android-<versionCode>`，並在這張表加一列。App 內的原始碼連結會改成指向該版的 tag（併入下一個發布版）。
  - **怎麼打（W69 流程盤點中 14，2026-11-23 起）：** 候選包通過 P0 閘門（`p0-gate.js` 全過）、送審前，建包的人跑：先把這一版的變體資料夾（含 `VARIANT-MANIFEST.json`）合併進 main，再跑 `gh workflow run tag-native.yml --ref main -f platform=android -f build=<versionCode> -f web=<網頁版號> -f variant_commit=<那個 main 提交，40 碼> -f pkg_sha256=<AAB 的 SHA-256>`。由 GitHub Actions 打在 `web-<網頁版號>` 的提交（網頁跟 AAB 一樣），並核對變體清單的 `webCommit`、`siteVersion`；變體提交與 AAB 雜湊寫進標籤說明。同號不覆寫。iOS 一樣，`platform=ios`、`build=<build>`、`pkg_sha256` 填 IPA 的雜湊。版本標籤受規則集保護，不准改、不准刪；打錯只能換新的建置號。
  - **產物比對也是送審閘門的一項（W91，2026-11-24 起）：** `p0-gate.js` 除了 P0-IMG、P0-UPD、P0-3D，還要收一份 `aab-diff.js` 的報告，缺了、或任一項不符就不能送審，也不能豁免。跑法（在 `source/xiangqi-android`）：
    ```
    node scripts/aab-diff.js <Play 現行版.aab> <要送審的.aab> --strict --old-code=<Play 現行版的 versionCode> --new-code=<這一版的 versionCode> [--expect-removed=… --expect-added=… --expect-shrunk=…] [--ack=<確認清單.json>] --json=aab-diff.json --md=aab-diff.md
    node scripts/p0-gate.js --aab <要送審的.aab> --build <網頁版號> --old-aab <Play 現行版.aab> [--ack <確認清單.json>] --diff-receipt aab-diff-receipt.json --reports img.json upd.json 3d-12.json 3d-16.json 3d-canary-12.json 3d-canary-16.json aab-diff.json
    ```
    - 閘門核對：新版雜湊＝要送審的 AAB、舊版寫明 versionCode 而且不是同一個檔、新版 versionCode 比舊版大、用 `--strict` 跑、`aab-diff.js` 跟 origin/main 那一版一樣（工具鎖定）。
    - **閘門自己重算（#102 起）：** 閘門用 `--old-aab` 那一包和送審的 AAB，自己用（跟 main 一樣的）`aab-diff.js` 重算紅黃項與金絲雀，不信報告裡的紅黃與 pass；報告比的舊版也要是 `--old-aab` 這一包。確認清單用閘門自己收的 `--ack`（人寫的那份）；放行參數照報告記的。舊版是不是真的 Play 現行版，閘門看不到 Play，只能核對報告有寫；跑的人要從 Play Console「所有應用程式套件」確認。
    - **版本碼（#102 第三、四輪）：** 閘門照 protobuf 結構讀兩包 manifest 裡 Android 真正用的整數（compiled_item），字串欄位要是純十進位而且跟整數相等，不然擋；新舊版本碼都要跟報告一樣，新的要比舊的大。新舊兩包不到 3 個檔不同也擋（正常發版 index.html、sw.js、manifest 都會變）。四種金絲雀逐項核對。
    - **還擋不了的（#102 第六輪照實寫）：** 做一包假的「舊版」其實不難：從真的舊版拿出 manifest 等原檔，放進一個改過的包，版本碼、字串和整數就都對得上，再多改幾個檔就過了「變動不到 3 個檔」那一條。閘門現在只能確認新舊兩包彼此一致，**確認不了舊包真的是 Play 上那一包**。真正的防線是 W91c：把 `--old-aab` 的 SHA-256 綁到公開倉庫 `android-<oldCode>` 標籤記的 `pkg_sha256`。在那之前，舊版一律用從 Play 下載、或建包當時封存的原檔，跑的人要自己核對。
    - 黃項：人看過後把報告裡的確認碼寫進 `--ack` 清單再跑（aab-diff 與閘門用同一份）；紅項不能確認。新增的檔不在現行包本來就有的位置（例如根目錄多了說明文件），或驗證紀錄、證據頁（含 `data/docs/evidence/` 子資料夾，大小寫不分）、任何一層的 `AGENTS.md`、`CLAUDE.md`、`releases/` 進了安裝包，也算黃。
    - 金絲雀：`aab-diff.js` 每次都從這個候選包自己做四種壞樣本（刪一個首頁素材、把一個 js 縮成 0 位元組、多帶一個 `.jks`、多一個沒確認的說明文件；後兩種的檔名新舊兩包都沒有），用同一套參數與確認清單判斷；前三種要紅、第四種要黃，少一種沒抓到，報告就 `pass: false`，閘門擋。
    - **金絲雀擋得到、擋不到的（#102 複審照實寫）：** 放行參數寫成全部放行（例如 `--expect-removed=.`），刪首頁素材那個壞樣本就不紅，金絲雀會抓到；但比較細的放寬（例如 `--expect-shrunk=.` 配上檔案只截一半、或剛好避開金絲雀挑的那一張圖）金絲雀不一定抓得到。所以放行參數一律原樣印在閘門輸出與收據裡，**送審前要有人看過「放行」那一節**，不能只看金絲雀通過。
    - 閘門會印出舊版 versionCode、放行參數、重算結果，確認過的黃項確認碼逐筆印出；通過時寫出 `--diff-receipt` 收據 JSON（送審 AAB、舊版、新版版本碼、放行參數原樣、確認碼逐筆、工具雜湊），送審收據附這份。

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
