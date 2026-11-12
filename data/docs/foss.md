# 開源建置與授權

最後核對：2026 年 11 月 12 日（第 11 輪 X7，給 F-Droid 和其他自由軟體平台的審查參考）。這一頁是整理，不是法律意見。

## 先講結論

《象棋千秋》**目前不符合 F-Droid 的收錄條件**，不打算假裝符合。主要卡在三件事：

1. **App 本身不是自由軟體。** 原創的程式、畫面、美術和文字 © 陳泓昇，倉庫裡沒有 App 自己的開源授權檔（LICENSE／COPYING）。
2. **公開倉庫放的是編譯後的成品，不是原始碼。** [github.com/raysonchen2023-cloud/xiangqi-lab](https://github.com/raysonchen2023-cloud/xiangqi-lab) 是建置工具的輸出；原始模組和建置工具只在開發者電腦上。這是開發者的決定（不公開原始模組、倉庫也不設成私有）。所以 F-Droid 要求的「由 F-Droid 的伺服器從公開原始碼建置」目前做不到。
3. **只有網頁 App，沒有 Android 安裝檔。** F-Droid 收的是 Android App；目前沒有 Android 包裝（iOS 打包也暫緩）。

做到的部分：第三方程式庫和字型的授權全文齊全；Pikafish（GPL-3.0）改過的原始碼和建置腳本公開在倉庫；沒有任何分析、廣告、崩潰回報或閉源 SDK；每一版都有 release.json 指紋可以核對。下面逐項列。

## 逐項對照

| F-Droid 要求 | 現況 | 符不符合 | 要怎樣才符合 |
|---|---|---|---|
| App 本身用自由軟體授權（OSI／FSF 認可） | 沒有授權檔，© 陳泓昇 | **不符合** | 開發者選一個自由授權。因為要和 GPL-3.0 的 Pikafish 一起散布，GPL-3.0 最單純。這是開發者的決定，本輪不改 |
| 從公開原始碼建置 | 倉庫只有成品；原始模組（`xiangqi-db/m.html`、`m/*.js`、`m.css`）、規則程式 `xiangqi-referee.js`、建置工具都只在本機 | **不符合** | 原始模組、建置工具、建置說明放進公開倉庫。開發者已決定不公開，所以這一項目前做不到 |
| 倉庫裡有建置需要的全部素材 | GitHub 只放瘦身版：大部分圖片、音樂、3D 模型只放在 Cloudflare CDN，不進 git | **不符合** | 素材也要能從公開來源取得（例如放進倉庫或發布附件） |
| 是 Android App，F-Droid 伺服器能建出安裝檔 | 只有網頁 App（PWA） | **不符合** | 做一個不依賴 Google Play 服務、本身也開源、能從原始碼建置的 Android 包裝（把網頁資源打包進 App，不是只開網址） |
| 不含閉源相依（Google Play 服務、Firebase、廣告 SDK 等） | `foss-audit.js` 查 10 類，一個都沒有 | **符合** | — |
| 第三方元件授權相容、全文齊全 | 程式庫、引擎、字型的授權全文都在 `licenses/` 和根目錄 | **符合** | 版本沒記錄的幾項（opencc-js、字型）補上版本 |
| GPL 元件提供對應原始碼 | 上游標籤＋改過的 `uci.cpp`＋建置腳本都公開 | **大致符合** | 釘住 Emscripten 版本、存編譯紀錄；放一份完整原始碼包，不只靠上游標籤（見下面〈Pikafish〉） |
| 非自由素材（NonFreeAssets） | 神經網路權重不得商用；AI 生成的圖片、音樂；Windows 語音輸出；chasoft 棋譜資料庫沒有授權檔 | 會被標「NonFreeAssets」；語音和 chasoft 棋譜要先釐清能不能散布 | 見下面〈素材〉 |
| 非自由網路服務（NonFreeNet） | 線上大廳用 EMQX Cloud；意見回饋用 Google 表單；Google／Gemini 外連按鈕 | 會被標「NonFreeNet」 | 改用自由軟體架的伺服器，或接受這個標記 |
| 追蹤（Tracking） | 匿名卡關訊號、對局評分、學習進度**預設開**（可以關）；第 10 項匿名健康摘要**預設關** | 預設開的三項很可能被標「Tracking」 | 改成預設關，或第一次打開時先問。這是產品決定，本輪不改 |
| 可重現建置 | 網站每一版有 release.json；外部能核對 index.html、sw.js 的雜湊，但不能自己重建 | **部分** | 原始碼公開後，別人才能自己建一次再比對 |

## 第三方元件與授權

授權全文總表在 [licenses/](https://raysonchen2023-cloud.github.io/xiangqi-lab/licenses/README.md)，每一項的來源、用途、狀態在〈素材與授權〉（[credits.md](credits.md)）。這裡補上版本、檔案和這次查到的缺口：

| 元件 | 版本 | 授權 | App 裡的檔案 | 授權全文 | 備註 |
|---|---|---|---|---|---|
| three.js | r149 | MIT | `three.min.js`、`GLTFLoader.mjs`、`BufferGeometryUtils.mjs` | `licenses/three.js-MIT.txt` | 兩個 `.mjs` 的檔頭註明改了 import 的來源（改用 App 已載入的 `window.THREE`），有沒有其他改動這次沒有逐行跟上游比對；credits.md 寫「原檔照用」不夠精確 |
| jsQR | 1.4.0 | Apache-2.0 | `jsQR.min.js` | `licenses/jsQR-Apache-2.0.txt` | jsDelivr 壓縮版，原樣 |
| QRCode.js（davidshimjs） | master（SHA-1 2d06c1f823f3…） | MIT | `qrcode.min.js` | `licenses/qrcodejs-MIT.txt` | 跟上游逐位元相同 |
| opencc-js | **沒記錄** | MIT | `opencc-cn2t.js`、`opencc-t2cn.js` | `LICENSE-opencc-js.txt` | 缺：版本號 |
| OpenCC 轉換字典（opencc-js 內含） | 同上 | Apache-2.0 | 同上 | `licenses/OpenCC-dictionary-Apache-2.0.txt` | — |
| Pikafish 引擎 | Pikafish-2026-09-06 | GPL-3.0 | `engine/pikafish.wasm`、`engine/pikafish.js` | `LICENSE-Pikafish-GPL3.txt` | `pikafish.js` 是 Emscripten 產生的載入程式（Emscripten 是 MIT／NCSA 雙授權） |
| Pikafish 神經網路權重 | 隨上面那版 | Pikafish NNUE 授權：**未經許可不得商用** | `engine/pikafish.nnue` | `NNUE-License.md` | 不是自由授權，見下面 |
| 七個朝代字型（子集） | **沒記錄** | SIL OFL 1.1 | `data/fonts/xq-*.woff2` | `licenses/font-*.txt`、`data/fonts/LICENSES.md` | 改了字型內部名稱；缺：各字型的上游版本號 |

自己寫的程式（`index.html` 裡的 App 主程式、`core.js`、`engine.js`、`local.js`、`net.js`、`bot3d.js`、`map3d.js`、`park3d.js`、`zh.js`、`sw.js`、`three-shim.mjs`）© 陳泓昇，AI（Claude、ChatGPT Codex）協助撰寫，**沒有開源授權**。

## Pikafish（GPL-3.0）的對應原始碼

- **上游：** [official-pikafish/Pikafish](https://github.com/official-pikafish/Pikafish) 標籤 `Pikafish-2026-09-06`（開發者電腦上的檢出：commit `4c17cee11f88`，2026 年 9 月 6 日）。
- **改了什麼：** 只有 `src/uci.cpp`（瀏覽器沒有標準輸入，改成由網頁呼叫 `uci_command()` 把指令放進佇列）。改過的完整檔案和建置腳本公開在倉庫的 [pikafish-src/](https://github.com/raysonchen2023-cloud/xiangqi-lab/tree/main/pikafish-src)（11 月 12 日查證：`main` 分支有 `pikafish-src/uci.cpp`、`pikafish-src/build-wsl.sh`，最後修改 10 月 30 日；開發者電腦上的上游檢出只有 `src/uci.cpp` 被改過，跟倉庫那份逐位元相同）。
- **怎麼建：**
  1. 取上游標籤 `Pikafish-2026-09-06` 的原始碼。
  2. 用 `pikafish-src/uci.cpp` 換掉 `src/uci.cpp`。
  3. 在 Linux（開發者用 WSL 的 Ubuntu 24.04）執行 `pikafish-src/build-wsl.sh`：自動安裝 Emscripten，用跟 Pikafish Makefile `ARCH=wasm32` 相同的參數（`-O3`、SIMD、多執行緒）加上網頁打包選項編譯。
  4. 輸出 `out/pikafish.js`、`out/pikafish.wasm`，就是 App 的 `engine/` 那兩個檔。
- **目前發布的檔案指紋（SHA-1 前 12 碼）：** `pikafish.wasm` d568cded4f5b、`pikafish.js` 77eca54d3204、`pikafish.nnue` 3a043e259a72。
- **缺口（credits.md「待確認」第 7 項同一件事）：**
  - 建置腳本裝的是「最新版」Emscripten，沒有釘版本，也沒有存當時的編譯紀錄；`pikafish.wasm` 裡也沒有記錄編譯器版本。所以同一份原始碼重編，不一定得到逐位元相同的檔案。
  - 對應原始碼靠「上游標籤＋改過的檔」。上游哪天刪了標籤就對不起來；更穩的做法是在倉庫或發布附件放一份完整原始碼包。
  - 引擎是獨立的 `.wasm` 檔，App 只用文字指令（UCI）跟它溝通。這樣算 GPL 的「聚合散布」還是「衍生作品」，沒有定論；如果要上架，要先研究清楚。

## 神經網路權重（不得商用）

- `pikafish.nnue` 的授權（[NNUE-License.md](https://raysonchen2023-cloud.github.io/xiangqi-lab/NNUE-License.md)）：只能合法使用；**未經許可不得商用**。
- 《象棋千秋》不收費、沒有內購和廣告，在這個條件下隨 App 提供。**沒有書面許可**；要收費或商用之前，要先取得 Pikafish 團隊許可或換權重。
- 從自由軟體平台的角度，這是**非自由素材**。Pikafish 官方說 Fairy-Stockfish 象棋版的權重是 CC0，但那不是本 App 用的檔案，能不能換用沒有測過。

## 素材

| 類別 | 來源與權利 | 狀態 | 自由軟體平台的角度 |
|---|---|---|---|
| 3D 模型（`.glb`） | Tripo **付費 API 帳戶**產出；依 Tripo 使用者協議第 5.2.2 條，付費使用者擁有輸出的全部權利，**權利歸開發者**（credits.md 第五項 11/12 已更正：先前誤寫「免費方案」） | 已確認，付款紀錄由開發者保存 | 作者自有、沒有開放授權 |
| 圖片 | AI 生成（Gemini，部分 OpenAI），開發者修圖 | 待開發者確認逐張來源（API 或 App） | 沒有開放授權 |
| 背景音樂 | Gemini Lyria 生成 | 待開發者確認 | 沒有開放授權 |
| 走棋音效 | 程式合成，腳本在 `xiangqi-db/tools/audio_src/` | 已確認自有 | 沒有開放授權 |
| 語音（12 檔） | Windows 內建語音合成的輸出 | 灰色、偏不允許再散布 | 要先換掉或改用手機即時朗讀 |
| 比賽與大師棋譜 | chasoft 社群資料庫，**沒有授權檔** | 待開發者確認 | 授權不明 |
| 字型 | SIL OFL 1.1 | 已確認 | 自由 |

## 可重現建置：現在怎麼從原始碼組出網站

原始碼在開發者電腦上，網站是這樣組出來的：

1. **原始碼：** `xiangqi-db/m.html`（頁面骨架，每支程式一行 `//#include m/xx.js`）、`xiangqi-db/m/*.js`（約 90 支模組，共用同一個全域）、`xiangqi-db/m.css`；`xiangqi-lab/src/*.js`（`net.js`、`local.js`、`park3d.js` 等，原樣複製）；`xiangqi-referee.js`（規則、記譜、裁判，`core.js` 從這裡抽出來）；資料和素材在 `xiangqi-db/`。
2. **組頁面：** `xiangqi-db/tools/mhtml.js` 的 `assemble()` 把每一行 `//#include` 換成那支檔案的內容、`m.css` 換成 `<style>`，組出來跟拆檔以前逐字一樣。
3. **建網站：** `node xiangqi-lab/tools/build-site.js` 清空 `site/`（保留 `.git`）→ 從裁判程式抽出 `core.js` → 複製引擎和權重 → 複製資料（簡體來源轉繁體）→ 組好的頁面改成離線版寫成 `index.html` → 複製 `src/*` → 授權檔、`pikafish-src/`、README → 產生 `preload.json` → 算版本號（全部檔案的 SHA-1；內容沒變就沿用上一版號碼）寫進 `sw.js` 和 `index.html`。
4. **發布檢查：** `node xiangqi-lab/tools/verify-release.js site/index.html site/sw.js --manifest site/release.json` 檢查控制字元、`index.html` 和 `sw.js` 版本一致、每一段內嵌程式的語法，並逐支比對每個模組有沒有原封不動在 `index.html` 裡；有錯就不准發。
5. **寫指紋：** 同一個指令寫出 [release.json](https://raysonchen2023-cloud.github.io/xiangqi-lab/release.json)：版本、`index.html` 和 `sw.js` 的 SHA-1 前 12 碼、每支模組的指紋、跟原始碼不一樣的模組（`differsFromSource`），發布時再補上 `buildSource`、`intentionalDiffs`（刻意不發布的差異和原因）。
6. **上傳：** 圖片、音樂等大檔用 `cdn-deploy.js` 同步到 Cloudflare；GitHub 倉庫只放程式、引擎、小資料檔。

**任何人都能核對的：** 打開 release.json，下載同一個網站的 `index.html`、`sw.js` 各算一次 SHA-1、取前 12 碼比對，再跟 App 設定頁的版本號比對。步驟見〈版本說明〉（[release-notes.md](release-notes.md)）。

**外部核對不了的：** `modules` 那一欄（原始模組不公開，只有開發者能重算）；整個網站能不能從原始碼重建一次（同上）。

## 檢查工具 foss-audit.js

`node xiangqi-lab/tools/foss-audit.js` 掃發布出去的 `xiangqi-lab/site/`，列出：每個第三方元件的檔案、授權全文、GPL 對應原始碼在不在；檔名或檔頭像別人的、卻沒登記的檔；程式碼裡有沒有分析、廣告、崩潰回報 SDK（Google Analytics、Firebase、Sentry、Facebook、AdSense、OneSignal、Bugsnag、Matomo、百度統計等 10 類）；程式碼裡出現的每個外部網域是什麼；素材各類的檔數和授權狀態。有缺授權檔、找到追蹤 SDK、或有沒登記的第三方檔，就以代碼 1 結束。測試：`xiangqi-lab/tools/test-foss-audit.js`（8 項）。

**2026 年 11 月 12 日的結果：** 掃 4,498 個檔，**授權全文齊全、沒有找到追蹤或閉源 SDK、沒有沒登記的第三方檔**；App 本身沒有授權檔（照實列出）。

程式碼裡出現的外部網域：

| 網域 | 是什麼 |
|---|---|
| d23f1132.ala.asia-southeast1.emqxsl.com | 線上大廳 MQTT（開發者租用的 EMQX Cloud，新加坡；非自由網路服務） |
| broker.emqx.io | 線上大廳的備用伺服器（EMQX 公開免費伺服器） |
| xiangqi-cdn.pages.dev、raysonchen2023-cloud.github.io | 網站本身和大檔（Cloudflare Pages、GitHub Pages） |
| script.google.com、docs.google.com | 意見回饋（Google 表單；非自由網路服務） |
| api.open-meteo.com、geocoding-api.open-meteo.com | 問小帥查天氣（玩家自己問才連） |
| zh.wikipedia.org | 問小帥查百科（玩家自己問才連） |
| www.google.com、gemini.google.com | 外連按鈕（玩家按了才開） |
| ntfy.sh | 開發者模式找電腦位址（玩家用不到） |
| github.com、www.cccs.org.tw | 說明和出處連結 |
| www.w3.org、www.jsdelivr.com | XML 命名空間和檔頭註解，不是連線 |

素材檔數（實際掃到）：圖片 3,993 個、3D 模型 139 個、背景音樂 101 個、音效 60 個、語音 12 個、字型 7 個、比賽與大師棋譜 4 個、古譜 5 個。

## 如果要上 F-Droid，要做的事（給開發者決定）

- **維持現狀（不公開原始模組）：** 進不了 F-Droid 主倉庫。可以考慮自己架一個 F-Droid 相容的第三方倉庫，放自己簽名的安裝檔，但一樣要先有 Android 包裝。
- **要進主倉庫：**
  1. 選一個自由授權（建議 GPL-3.0），加上 LICENSE。
  2. 公開原始模組、`xiangqi-referee.js` 需要的部分、建置工具和建置說明，讓 F-Droid 的伺服器能從原始碼建出同一個網站。
  3. 做一個開源、不依賴 Google Play 服務的 Android 包裝。
  4. 權重：接受「NonFreeAssets」標記，或取得 Pikafish 團隊許可，或改成第一次使用時另外下載。
  5. 預設開的三種匿名資料改成預設關或先問，避免「Tracking」標記。
  6. 語音 12 檔換成手機即時朗讀；chasoft 棋譜釐清授權或換來源。
  7. Emscripten 釘版本、存編譯紀錄、放完整的 Pikafish 原始碼包。

本輪只做文件和檢查：**沒有改任何授權，也沒有把原始模組放上公開倉庫。**
