# iOS P0-3D 自動驗收（模擬器）

寫：iMac Claude 1（2026-11-22，hsgo 認領，開發者選單同意）。審、用：iMac Claude 2。

照 Windows Claude 2 的 Android P0-3D 做法改成 iOS：進場和讀狀態用 JS，點擊用真實觸控，最後讀同一盤的棋譜確認。

## 一鍵跑

```bash
source/xiangqi-ios/scripts/p03d/p0-3d.sh <候選 App.app 路徑> [情境…]
```

- 不給路徑時，用 `build-s8` 的 Debug 模擬器包。
- 不給情境時全跑：`cpu inn pvp simul bhx-front bhx-back siege-top siege-iso`。
- 步驟：
  1. 抹掉模擬器、系統語言設繁中、裝包。
  2. 預寫測試房 `xq_netRoot=xq_test`、冷啟。
  3. 建 P03D 觸控伺服。
  4. 跑 `p03d.js`。
  5. **跑完再抹掉模擬器**。
- 結束代碼 0 表示全過。
- 證據放在 `$P03D_OUTDIR/p03d-<時間>/`（預設是目前目錄的 `output/`）：
  - `run.txt`：包路徑、XQ_BUILD、index SHA-256
  - `log.txt`、`result.json`
  - 每一步三張截圖：前、選子、後
  - `xcuitest.log`

## 組成

| 檔 | 做什麼 |
| --- | --- |
| `wir.js` | 透過模擬器的 Web Inspector（`webinspectord_sim.socket`）在 App 的 WKWebView 執行 JS。<br>**不改 App、不用 XQTMP 鉤子**，候選的 Debug 模擬器包可以直接用。<br>`node wir.js '<JS>'` 可單獨使用。 |
| `P03D.xcodeproj` | 獨立的 XCUITest 專案，用 bundle id 去點 App，不動 App 專案。<br>`testServe` 會常駐，輪詢 `cmd-<n>.json`，用 `XCUICoordinate.tap()` 真實觸控。 |
| `p03d.js` | 驅動：玩家狀態、進場、挑著法、等鏡頭停、點選子和落點、讀棋譜。 |
| `p0-3d.sh` | 包裝：乾淨模擬器、建置、跑、抹掉。 |
| `fresh-app.sh` | 抹掉模擬器、開機、裝包，第一次開啟前預寫測試房 `xq_netRoot=xq_test`。 |

## 判斷（照 Android）

- **玩家狀態**：照 `xiangqi-android/scripts/player-state.js`：繁中、開旅程、序局標成下過、駱躍梅入隊，授印禮的「收下」用真實觸控點。
- **進場**：一律用 JS，跟 Android 一樣：
  - 一般電腦：`/play/new`
  - 驛站：`jStart(inn:…)`
  - 同桌紅黑：`/pvp/new`
  - 車輪戰：`/simul/new`；切桌用真實觸控點 `.sim-tb`
  - 黑洞：`jStart(BHX_ID…)`
  - 星門圍城：`gsvStart(31…)`，再 `gsvSetView`
- **挑著法**：從 state 的 `legal` 挑，條件是：
  - 目標格是空的。
  - 起訖都在安全區：左右 30、上 160、下 140 點。
  - 起訖兩點的 `elementFromPoint` 都是 CANVAS。
  - 起點跟其他棋子的點擊位置至少隔 34 點。
  - 黑洞固定走 22→13。
- **座標**：`PARK.v.screenOf(格)`；黑洞巨型棋子取 `screenOf` 和 `headOf` 之間 45% 的位置（身體中段）。
  - WebView 從 (0,0) 起，CSS 像素就是 iOS point。
  - 點之前等同一格座標連兩次（間隔 250ms）差不到 1.5 點，因為選子後鏡頭會跟過去。
- **通過**：點完 6 秒內，棋譜多出 f、t 相符的那一步。
  - 落點真的被蓋住（不是 CANVAS）時，直接判失敗並寫出蓋住的元素，這就是 W02 類問題。

## 跟 Android 不同、要知道的地方

- **黑洞背面**：iOS 用玩家實際按的 ⇅（「轉到棋盤背面」）真實觸控切過去。
  - `setView("under")` 在 iPhone 直式比例下是貼著盤面的平視，棋子全疊在一起，不是玩家看到的背面。
- **選子的退路**：黑洞和星門圍城的選子，真實觸控 4 次沒選到時，改用 `cgPlay.tap(起點)`。
  - 這跟 Android 的 `android-p0-modes-2251.js` 一樣。
  - **落點仍是真實觸控**。`result.json` 每一步的 `sel` 欄會寫明用了哪種方式。
  - 2026-11-22 試跑時，只有**黑洞背面**用到退路：從背面看，前排的炮擋住後排的俥。
- **疊子選單（W68，PR #38 起）**：黑洞背面點到疊住的子，App 會跳「選哪顆？」選單；腳本用真實觸控點選單裡要選的那顆，`sel` 欄記成「真實觸控（疊子選單選「俥」）」，不算退路。
- **一般電腦、驛站、車輪戰**：對手是電腦，只驗紅方一步。真人紅黑都點的是同桌紅黑：第二步是 autoFlip 翻面後的黑方。

## 防止「沒驗到卻算通過」（11/22 iMac Claude 2 審查後加）

- 情境名稱打錯（例如 `bhx-bak`）記成失敗，結束代碼不會是 0。
- `p0-3d.sh` 檢查兩件事，不符就結束代碼 2，記成「測試不成立」：
  1. 裝完後用 `simctl get_app_container` 取模擬器上 App 的 `public/index.html`，跟要驗的包比 SHA-256。
  2. `p03d.js` 比對 App 執行時的 `XQ_BUILD` 跟包內的 `XQ_BUILD`。
- `fresh-app.sh`（抹掉、安裝）失敗時就停下，不會去驗舊 App。
- 總結會寫出哪些情境的選子用了退路 `cgPlay.tap`。
- 前置和就緒前移除的遮罩（`#tCont`、`.modal`、`#preov`）都寫進 log 和 `result.json` 的 `removed`。
- 挑著法時依情境名稱分散，不會每個情境都走同一步。

## 限制

- **只能跑模擬器的 Debug 包。** Release 包的 WebView 不能用 Web Inspector 檢查，實機也不行。
- 實機或 Release 包的 P0-3D 照驗收規則另外用人工觸控驗。

## 反測（W69：用有問題的版本跑要亮紅燈）

```bash
P03D_FAULT=cover source/xiangqi-ios/scripts/p03d/p0-3d.sh <App.app>
```

- 選子後、點落點前，在落點上放一顆按鈕，重現 W02（3D 暗綠落點被縮放、切換按鈕蓋住）。
- 每個情境都必須判「落點被 BUTTON 蓋住」。**全部擋到才回 0**（印「✔ 反測成立」）；有任何情境照常通過或因別的原因失敗，就回 1，表示腳本的偵測壞了。`result.json` 會記 `fault`、`faultCaught`、`faultMissed`。
- 為什麼用注入：W02 那一版的 iOS 包沒有留下來，所以只能用注入重現同一種故障。

## 需要的環境

- macOS＋Xcode（`xcrun simctl`、`xcodebuild`）、Node.js 18 以上。
- 有一台 iPhone 模擬器。預設找 `iPhone 18 Pro`，可以用 `P03D_DEVICE` 或 `P03D_UDID` 指定。
- 包要是**模擬器的 Debug 包**：WebView 要能用 Web Inspector 檢查。

## 規則

- **正式跑一律用 `p0-3d.sh`。** 直接跑 `node p03d.js` 不會比對包的 SHA 和版號，只能拿來除錯。

- 只用模擬器，一台機器一次一台。
- 進場用 JS 改過存檔，跑完一定要抹掉，腳本會自己抹。
- **寫、建、驗分開**：建候選包的人，不跑自己那個包的正式 P0-3D。
- 正式 P0-3D 要在實際待送審的候選包上跑。
