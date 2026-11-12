# 開源建置與授權

最後核對：2026 年 11 月 13 日（第 11 輪 X7 寫成，第 13 輪 F2 補「可建置證據」和缺口分類；11 月 13 日開發者決定公開原始碼、改授權後更新；第 14 輪 F3 補 Android 路線圖和可重現驗證包；給 F-Droid 和其他自由軟體平台的審查參考）。這一頁是整理，不是法律意見。

## 先講結論

**11 月 13 日開發者的決定：** App 的程式碼改用 **GPL-3.0-or-later**（GNU GPL 第 3 版或更新版）授權、原始碼公開在倉庫的 `source/`，寫在程式檔裡的介面文字、場景小故事和對白也算程式；`data/` 底下開發者自製的素材（美術、AI 生成圖、3D 模型、音樂、長篇劇情等）用 **CC BY-NC-SA 4.0**，`gmbios.json` 和語音檔不在內；第三方元件照各自授權；公開倉庫只收 Issue、不收 Pull Request。這取代先前「原始模組只放本機、© 保留一切權利」的做法。

改了以後，《象棋千秋》**仍然不符合 F-Droid 的收錄條件**，不打算假裝符合。還卡在三件事：

1. **只有網頁 App，沒有 Android 安裝檔。** F-Droid 收的是 Android App，而且要它的伺服器能從原始碼建出安裝檔；目前沒有 Android 安裝檔（iOS 版另外在準備）。這是現在最主要的缺口。第 14 輪在開發者電腦上做了 Capacitor 骨架和 F-Droid 建置設定草稿（沒編譯、沒上機），怎麼上 Google Play 和 F-Droid、要決定什麼，整理在〈Android 與 F-Droid 路線圖〉（[android.md](android.md)）。
2. **公開的原始碼還建不出「整個網站」。** `source/` 能組出 `index.html`（`node source/check-build.js` 核對跟發布的逐字相同）和 `core.js`；但完整建置（`build-site.js`）還要用到只在開發者電腦上的資料檔和素材原始資料夾，大部分圖片、音樂、3D 模型也只放在 Cloudflare CDN、不進 git。
3. **有非自由素材。** 開發者的素材是 CC BY-NC-SA 4.0（限非商業，不算自由授權），神經網路權重 `pikafish.nnue` 也不得商用。F-Droid 對這種情形是收錄但標「NonFreeAssets」，不是拒收。

做到的部分：App 的程式碼有自由授權（GPL-3.0-or-later，跟 Pikafish 的 GPL 第 3 版相容）、原始碼公開；第三方程式庫和字型的授權全文齊全；Pikafish 改過的原始碼和建置腳本公開，而且第 13 輪在開發者電腦上**釘版本重編一次，跟發布的引擎逐位元相同**；沒有任何分析、廣告、崩潰回報或閉源 SDK；每一版都有 release.json 指紋可以核對，現在外部也能用公開的原始碼重算模組指紋。下面逐項列，缺口分成三類整理在〈F-Droid 缺口：三類〉。

## 逐項對照

| F-Droid 要求 | 現況 | 符不符合 | 要怎樣才符合 |
|---|---|---|---|
| App 本身用自由軟體授權（OSI／FSF 認可） | 程式碼 GPL-3.0-or-later（倉庫根目錄 `LICENSE`，11/13 起）；開發者素材 CC BY-NC-SA 4.0（`LICENSE-ASSETS.md`） | **程式符合**；素材不是自由授權 | 素材部分見下面「非自由素材」 |
| 從公開原始碼建置 | `source/` 有原始模組（`xiangqi-db/m.html`、`m/*.js`、`m.css`）、`src/*.js`、規則程式 `xiangqi-referee.js`、建置與測試工具；`check-build.js` 組出的 `index.html` 跟發布的逐字相同 | **部分符合** | 完整建置還要只在開發者電腦上的資料檔（`xiangqi-db/*.json` 等）和素材資料夾；要把這些也放到公開來源，並把 `build-site.js` 改成只靠公開檔案就能跑 |
| 倉庫裡有建置需要的全部素材 | GitHub 只放瘦身版：大部分圖片、音樂、3D 模型只放在 Cloudflare CDN，不進 git | **不符合** | 素材也要能從公開來源取得（例如放進倉庫或發布附件） |
| 是 Android App，F-Droid 伺服器能建出安裝檔 | 只有網頁 App（PWA）；開發者電腦上有 Capacitor 8.6.2 的 Android 骨架和 F-Droid 建置設定草稿（第 14 輪，沒編譯、沒上機，見 [android.md](android.md)） | **不符合** | 做一個不依賴 Google Play 服務、本身也開源、能從原始碼建置的 Android 包裝（把網頁資源打包進 App，不是只開網址）：編出 APK、驗證引擎在 Android WebView 的多執行緒、把 Android 專案放上公開倉庫；引擎的 `pikafish.wasm` 要能在建置時從原始碼編（或改用 NDK 原生引擎） |
| 不含閉源相依（Google Play 服務、Firebase、廣告 SDK 等） | `foss-audit.js` 查 10 類，一個都沒有 | **符合** | — |
| 第三方元件授權相容、全文齊全 | 程式庫、引擎、字型的授權全文都在 `licenses/` 和根目錄 | **符合** | 版本沒記錄的幾項（opencc-js、字型）補上版本 |
| GPL 元件提供對應原始碼 | 上游標籤＋改過的 `uci.cpp`＋建置腳本都公開；第 13 輪用 Emscripten 6.0.13 重編，跟發布的 `pikafish.wasm`、`pikafish.js` 逐位元相同 | **大致符合** | 公開的 `build-wsl.sh` 還是裝 latest、釘版本的腳本和建置紀錄還沒放上倉庫；沒有完整原始碼包（見下面〈Pikafish〉） |
| 非自由素材（NonFreeAssets） | 開發者素材 CC BY-NC-SA 4.0（限非商業）；神經網路權重不得商用；Windows 語音輸出；chasoft 棋譜資料庫沒有授權檔 | 會被標「NonFreeAssets」；語音和 chasoft 棋譜要先釐清能不能散布 | 見下面〈素材〉 |
| 非自由網路服務（NonFreeNet） | 線上大廳用 EMQX Cloud；意見回饋用 Google 表單；Google／Gemini 外連按鈕 | 會被標「NonFreeNet」 | 改用自由軟體架的伺服器，或接受這個標記 |
| 追蹤（Tracking） | 匿名卡關訊號、對局評分、學習進度**預設開**（可以關）；第 10 項匿名健康摘要**預設關** | 預設開的三項很可能被標「Tracking」 | 改成預設關，或第一次打開時先問。這是產品決定，本輪不改 |
| 可重現建置 | 引擎（Pikafish）能逐位元重建；`index.html`、`core.js` 能從 `source/` 重組、跟發布的比對；release.json 的模組指紋外部可以重算；第 14 輪起 `verify-all.js` 一個指令重跑全部核對、留純文字紀錄 | **部分** | 整個網站（資料檔、素材、`preload.json`、版本號）還要開發者電腦上的檔案才能重建一次 |

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

自己寫的程式（`index.html` 裡的 App 主程式、`core.js`、`engine.js`、`local.js`、`net.js`、`bot3d.js`、`map3d.js`、`park3d.js`、`zh.js`、`sw.js`、`three-shim.mjs`，以及 `source/` 裡的原始模組和工具）© 陳泓昇，AI（Claude、ChatGPT Codex）協助撰寫，**11/13 起依 GPL-3.0-or-later（第 3 版或更新版）授權**（全文在倉庫根目錄 `LICENSE`）。

## Pikafish（GPL-3.0）的對應原始碼

- **上游：** [official-pikafish/Pikafish](https://github.com/official-pikafish/Pikafish) 標籤 `Pikafish-2026-09-06`（開發者電腦上的檢出：commit `4c17cee11f88`，2026 年 9 月 6 日）。
- **改了什麼：** 只有 `src/uci.cpp`（瀏覽器沒有標準輸入，改成由網頁呼叫 `uci_command()` 把指令放進佇列）。改過的完整檔案和建置腳本公開在倉庫的 [pikafish-src/](https://github.com/raysonchen2023-cloud/xiangqi-lab/tree/main/pikafish-src)（11 月 12 日查證：`main` 分支有 `pikafish-src/uci.cpp`、`pikafish-src/build-wsl.sh`，最後修改 10 月 30 日；開發者電腦上的上游檢出只有 `src/uci.cpp` 被改過，跟倉庫那份逐位元相同）。
- **目前發布的檔案指紋：**

| 檔案 | SHA-256 | SHA-1 前 12 碼 | 大小 |
|---|---|---|---|
| `engine/pikafish.wasm` | `7fb6fc805a36ced6a55626a9513b7dda821b0bbb5e830fa17f120f1550a9a331` | d568cded4f5b | 727,020 位元組 |
| `engine/pikafish.js` | `dd5498bfb76381598d453a612d74e5e1955835452324c4d0b962a64fb44438f7` | 77eca54d3204 | 77,607 位元組 |
| `pikafish-src/uci.cpp`（改過的） | `149644b9781bbc7c3c8422ba9406ceaa20db1fad2d384ea96d0d8189ef20be5e` | — | — |
| 上游原本的 `src/uci.cpp` | `3b49ab2d2f06b5c7b1cbd3f0da77f96cac4cf5e94511953702e84ded9ca7a82c` | — | — |
| `engine/pikafish.nnue`（權重，不是編譯出來的） | — | 3a043e259a72 | — |

### 怎麼建（第 13 輪實際重跑過，結果逐位元相同）

| 項目 | 值 |
|---|---|
| 上游 | `Pikafish-2026-09-06`，commit `4c17cee11f888ae1d48a9494f2e2239f019f0a1f` |
| 改的檔 | 只有 `src/uci.cpp`（新增 32 行），換成倉庫的 `pikafish-src/uci.cpp`，SHA-256 見上表 |
| 主機 | WSL 的 Ubuntu 24.04（Windows 上的 Emscripten 會被「應用程式控制」擋，所以在 Linux 裡編） |
| 編譯器 | Emscripten **6.0.13**（emscripten-releases `eb132757325583b787fe9414b09afea9442b72ad`），Clang 24.0.0git（LLVM `83ee07799c341b60965f07892f7bb3d175da05be`），emsdk 附的 Node 24.19.0 |
| 編譯旗標 | `-O3 -DNDEBUG -std=c++17 -fno-exceptions -DIS_64BIT -msse -msse2 -mssse3 -msse4.1 -msimd128 -DUSE_SSE2 -DUSE_SSSE3 -DUSE_SSE41 -DUSE_POPCNT -DUSE_SLOPPY_ATOMICS -pthread -flto`（跟 Pikafish Makefile 的 `ARCH=wasm32` 相同） |
| 連結旗標 | `-sPROXY_TO_PTHREAD -sPTHREAD_POOL_SIZE=6 -sEXIT_RUNTIME=0 -sINITIAL_MEMORY=192MB -sALLOW_MEMORY_GROWTH -sMAXIMUM_MEMORY=2GB -sSTACK_SIZE=3MB -sDEFAULT_PTHREAD_STACK_SIZE=4MB -sMODULARIZE -sEXPORT_NAME=PikafishModule -sENVIRONMENT=web,worker,node -sEXPORTED_FUNCTIONS=_main,_uci_command -sEXPORTED_RUNTIME_METHODS=ccall,FS -sFILESYSTEM=1` |
| 原始檔順序 | `src/` 底下所有 `.cpp`（跳過 `universal`、`temp_builds`），`LC_ALL=C` 排序，共 36 個 |
| 編譯日期 | Pikafish 的版本字串會把 `__DATE__` 編進檔案；原版是 2026 年 10 月 30 日編的，重編要設 `SOURCE_DATE_EPOCH=1793361600`（2026-10-30 12:00 UTC） |

步驟（Linux）：

1. 取上游原始碼：`git clone https://github.com/official-pikafish/Pikafish && git -C Pikafish checkout 4c17cee11f888ae1d48a9494f2e2239f019f0a1f`
2. 用倉庫的 `pikafish-src/uci.cpp` 換掉 `Pikafish/src/uci.cpp`，`sha256sum` 要等於上表。
3. 裝 Emscripten 6.0.13：`git clone https://github.com/emscripten-core/emsdk && cd emsdk && ./emsdk install 6.0.13 && ./emsdk activate 6.0.13 && source ./emsdk_env.sh`（約 1 GB）。
4. 在 `Pikafish/src` 裡，設 `SOURCE_DATE_EPOCH=1793361600`、`LC_ALL=C`，用上表的旗標執行 `em++`（公開的 `pikafish-src/build-wsl.sh` 第 2 段就是這個指令；它的第 1 段裝的是 latest，要換成 6.0.13）。
5. `sha256sum pikafish.js pikafish.wasm`，跟上表比。

開發者電腦上把這幾步寫成 `xiangqi-wasm/build-pinned.sh`（檢查 commit 和 `uci.cpp` 雜湊、釘版本、固定日期和排序、留 `build.log`；已裝好 6.0.13 就不會下載）：

```
wsl.exe -d Ubuntu-24.04 -- bash xiangqi-wasm/build-pinned.sh xiangqi-wasm/Pikafish xiangqi-wasm/Pikafish/src/uci.cpp <輸出資料夾>
```

**2026 年 11 月 13 日重編的結果：**

- 設 `SOURCE_DATE_EPOCH=1793361600`：`pikafish.wasm`、`pikafish.js` 的 SHA-256 **都跟發布的相同**（編譯 34 秒）。
- 不設日期（當天 UTC 是 11 月 12 日）：`pikafish.js` 相同，`pikafish.wasm` 只差 5 個位元組，就是內嵌的日期字串「Oct 30」變成「Nov 12」。
- 紀錄存在開發者電腦的 `xiangqi-wasm/rebuild-20261113/`（`build.log`、`SHA256SUMS`、重編出來的兩個檔），建置紀錄 `xiangqi-wasm/build-record.json`。

**更正：** 第 11 輪這裡寫「`pikafish.wasm` 裡也沒有記錄編譯器版本」，**寫錯了**。wasm 沒有 producers 區段，但 Pikafish 的 `misc.cpp` 把編譯器的 `__VERSION__`（`Clang 24.0.0git (https://github.com/llvm/llvm-project 83ee0779…)`）和 `__DATE__`（`Oct 30 2026`）編進了資料區段，所以發布的檔案本身就能看出用哪一版編譯器、哪一天編的。

### 核對工具 pikafish-verify.js

`node xiangqi-lab/tools/pikafish-verify.js` 讀公開倉庫 `origin/main` 那一版（本機 git，不連網、不動工作區），跟 `xiangqi-wasm/build-record.json` 比對：檔案都在（含 GPL 授權全文）；wasm 檔頭（魔數、版本、能被 WebAssembly 編譯）；共用記憶體初始 192 MB、上限 2 GB（對應旗標）；內嵌的編譯器字串和日期；`pikafish.js` 是 Emscripten 載入程式、匯出名 `PikafishModule`、有 `_uci_command`；四個檔的 SHA-256；紀錄的 31 個旗標都出現在公開的 `build-wsl.sh`。加 `--rebuilt <資料夾>` 再比對自己重編的檔，`--dir <資料夾>` 改讀一份下載好的網站。有不符就以代碼 1 結束。

```
node xiangqi-lab/tools/pikafish-verify.js
node xiangqi-lab/tools/pikafish-verify.js --rebuilt xiangqi-wasm/rebuild-20261113
```

11 月 13 日的結果：全部符合；照實列一個提醒——公開的 `build-wsl.sh` 裝的是 latest，沒有釘版本。

### 還沒補的

- 公開倉庫裡的 `build-wsl.sh` 還是裝 latest；釘版本的 `build-pinned.sh` 和 `build-record.json` 只在開發者電腦上（要放進 `pikafish-src/`，得改建置工具並發布，本輪不發布）。在那之前，上面的表格和步驟就是公開的建置說明。
- 對應原始碼靠「上游 commit＋改過的檔」。上游哪天刪了就對不起來；更穩的做法是在倉庫或發布附件放一份完整原始碼包。
- 原始那次編譯（10 月 30 日）沒有存紀錄；上面的工具鏈是從開發者電腦上唯一裝著的 emsdk（10 月 30 日 06:37 啟用，比輸出檔早一分鐘）和 wasm 內嵌字串對出來的，再由逐位元相同的重編證實。
- 引擎是獨立的 `.wasm` 檔，App 只用文字指令（UCI）跟它溝通。這樣算 GPL 的「聚合散布」還是「衍生作品」，先前沒有定論；11/13 起 App 程式本身也是 GPL（GPL-3.0-or-later，可以用第 3 版跟 Pikafish 一起散布），不管算哪一種，程式部分的授權都相容。剩下要研究的是上架 App Store 時 GPL 的條件（見〈如果要上 F-Droid〉後面的說明）。

## 神經網路權重（不得商用）

- `pikafish.nnue` 的授權（[NNUE-License.md](https://raysonchen2023-cloud.github.io/xiangqi-lab/NNUE-License.md)）：只能合法使用；**未經許可不得商用**。
- 《象棋千秋》不收費、沒有內購和廣告，在這個條件下隨 App 提供。**沒有書面許可**；要收費或商用之前，要先取得 Pikafish 團隊許可或換權重。
- 從自由軟體平台的角度，這是**非自由素材**。Pikafish 官方說 Fairy-Stockfish 象棋版的權重是 CC0，但那不是本 App 用的檔案，能不能換用沒有測過。

## 素材

| 類別 | 來源與權利 | 狀態 | 自由軟體平台的角度 |
|---|---|---|---|
| 3D 模型（`.glb`） | Tripo **付費 API 帳戶**產出；依 Tripo 使用者協議第 5.2.2 條，付費使用者擁有輸出的全部權利，**權利歸開發者**（credits.md 第五項 11/12 已更正：先前誤寫「免費方案」） | 已確認，付款紀錄由開發者保存 | 作者自有，11/13 起 CC BY-NC-SA 4.0（非商業，不算自由） |
| 圖片 | AI 生成（Gemini，部分 OpenAI），開發者修圖 | 待開發者確認逐張來源（API 或 App） | 11/13 起 CC BY-NC-SA 4.0（非商業，不算自由） |
| 背景音樂 | Gemini Lyria 生成 | 待開發者確認 | 11/13 起 CC BY-NC-SA 4.0（非商業，不算自由） |
| 走棋音效 | 程式合成，腳本在 `xiangqi-db/tools/audio_src/` | 已確認自有 | 11/13 起 CC BY-NC-SA 4.0（非商業，不算自由） |
| 劇情、對白、題目講解等資料檔裡的文字 | 開發者構思，AI 協助撰寫 | 自有 | 11/13 起 CC BY-NC-SA 4.0（非商業，不算自由）；寫在程式檔（`.js`）裡的介面文字、場景小故事和對白跟著程式是 GPL-3.0-or-later |
| 語音（12 檔） | Windows 內建語音合成的輸出 | 灰色、偏不允許再散布 | 要先換掉或改用手機即時朗讀 |
| 比賽與大師棋譜 | chasoft 社群資料庫，**沒有授權檔** | 待開發者確認 | 授權不明 |
| 字型 | SIL OFL 1.1 | 已確認 | 自由 |

## 可重現建置：現在怎麼從原始碼組出網站

11/13 起原始碼公開在倉庫的 `source/`（資料夾配置跟開發者電腦一樣：`source/xiangqi-db/`、`source/xiangqi-lab/src`、`source/xiangqi-lab/tools`、`source/xiangqi-referee.js`）。公開的是**線上已發布的那一版**；開發者電腦上還沒發布的修改不在裡面。任何人都可以：

```
node source/check-build.js          # 從 source/ 組出 index.html，跟倉庫根目錄的 index.html 比對（忽略授權聲明、版本號、整包大小）
node source/run-tests.js            # 重跑自動測試（不連網、不開瀏覽器；在暫存資料夾組出開發時的資料夾配置）
```

11 月 13 日（對 `20261113-0330`）的結果：`index.html` 逐字一致；`core.js` 由 `xiangqi-referee.js` 抽出，跟發布的逐位元相同；release.json 的 97 支模組指紋有 96 支跟 `source/` 重算的相同，唯一不同的 `07y-hubmap.js` 就是 release.json 的 `differsFromSource` 申報的那支（開發者刻意不發布的 5 行，公開的是發布版）；50 個測試檔、637 項全部通過（另有 33 個測試檔要讀不公開的開發資料、素材原始檔，或測的是還沒發布的新功能，暫時沒放）。

開發者電腦上，網站是這樣組出來的：

1. **原始碼：** `xiangqi-db/m.html`（頁面骨架，每支程式一行 `//#include m/xx.js`）、`xiangqi-db/m/*.js`（約 90 支模組，共用同一個全域）、`xiangqi-db/m.css`；`xiangqi-lab/src/*.js`（`net.js`、`local.js`、`park3d.js` 等，原樣複製）；`xiangqi-referee.js`（規則、記譜、裁判，`core.js` 從這裡抽出來）；資料和素材在 `xiangqi-db/`。
2. **組頁面：** `xiangqi-db/tools/mhtml.js` 的 `assemble()` 把每一行 `//#include` 換成那支檔案的內容、`m.css` 換成 `<style>`，組出來跟拆檔以前逐字一樣。
3. **建網站：** `node xiangqi-lab/tools/build-site.js` 清空 `site/`（保留 `.git`）→ 從裁判程式抽出 `core.js` → 複製引擎和權重 → 複製資料（簡體來源轉繁體）→ 組好的頁面改成離線版寫成 `index.html` → 複製 `src/*` → 授權檔、`pikafish-src/`、README → 產生 `preload.json` → 算版本號（全部檔案的 SHA-1；內容沒變就沿用上一版號碼）寫進 `sw.js` 和 `index.html`。
4. **發布檢查：** `node xiangqi-lab/tools/verify-release.js site/index.html site/sw.js --manifest site/release.json` 檢查控制字元、`index.html` 和 `sw.js` 版本一致、每一段內嵌程式的語法，並逐支比對每個模組有沒有原封不動在 `index.html` 裡；有錯就不准發。
5. **寫指紋：** 同一個指令寫出 [release.json](https://raysonchen2023-cloud.github.io/xiangqi-lab/release.json)：版本、`index.html` 和 `sw.js` 的 SHA-1 前 12 碼、每支模組的指紋、跟原始碼不一樣的模組（`differsFromSource`），發布時再補上 `buildSource`、`intentionalDiffs`（刻意不發布的差異和原因）。
6. **上傳：** 圖片、音樂等大檔用 `cdn-deploy.js` 同步到 Cloudflare；GitHub 倉庫只放程式、引擎、小資料檔。

**任何人都能核對的：** 打開 release.json，下載同一個網站的 `index.html`、`sw.js` 各算一次 SHA-1、取前 12 碼比對，再跟 App 設定頁的版本號比對。步驟見〈版本說明〉（[release-notes.md](release-notes.md)）。不用任何工具，Linux 或 macOS 的終端機就能做：

```
curl -s https://raysonchen2023-cloud.github.io/xiangqi-lab/release.json
curl -s https://raysonchen2023-cloud.github.io/xiangqi-lab/index.html | sha1sum | cut -c1-12
curl -s https://raysonchen2023-cloud.github.io/xiangqi-lab/sw.js | sha1sum | cut -c1-12
```

兩個 12 碼要等於 release.json 的 `html`、`sw`。剛發布的 10 分鐘內，GitHub Pages 的快取可能還是舊檔，對不上就等一下再試。

第 13 輪把這件事寫成 `xiangqi-lab/tools/release-verify.js`（發布「後」的核對；`verify-release.js` 是發布「前」的檢查，要原始模組）：三個檔都讀得到、兩個雜湊等於 release.json、`index.html` 的 `XQ_BUILD`／`sw.js` 的 `VERSION`／release.json 的 `version` 三個一樣。

```
node xiangqi-lab/tools/release-verify.js --url https://raysonchen2023-cloud.github.io/xiangqi-lab/
node xiangqi-lab/tools/release-verify.js --dir <自己下載的資料夾>
node xiangqi-lab/tools/release-verify.js --git xiangqi-lab/site --ref <commit>
```

11 月 13 日用 `--git` 逐一核對公開倉庫裡動過 release.json 的 **70 個 commit**（11 月 11 日第一版到 `20261113-0330`）：**70 個都一致**。這是讀本機的 git，沒有連網下載網站；`--url` 模式只用本機假網站測過。

**外部現在核對得了的（11/13 起）：** `modules` 那一欄可以用 `source/xiangqi-db/m/*.js` 自己重算（每支檔案去掉最後一個換行、SHA-1 取前 12 碼）；`index.html` 可以用 `node source/check-build.js` 重組比對。

**外部還核對不了的：** `differsFromSource` 列的模組，release.json 記的是開發者電腦上當時的原始碼指紋（含沒發布的修改），所以跟 `source/` 重算的不會一樣，這是申報、外部沒辦法驗內容；整個網站（資料檔、素材、`preload.json`）還不能從公開檔案重建一次。

### 可重現驗證包 verify-all.js（第 14 輪 F3）

上面幾支核對工具分開跑容易漏，第 14 輪寫成一個指令 `xiangqi-lab/tools/verify-all.js`（下次重產 `source/` 會一起公開在 `source/xiangqi-lab/tools/`）。在公開倉庫根目錄：

```
node source/xiangqi-lab/tools/verify-all.js --out 紀錄.txt
```

依序跑四步，都只讀本機檔案、不連網、不開瀏覽器：

1. `check-build`：`node source/check-build.js`，從 `source/` 組出 `index.html` 跟發布的逐字比對。
2. `release-verify`：`index.html`、`sw.js` 的雜湊和三處版本號跟 release.json 一致。
3. `pikafish-verify`：引擎檔跟建置紀錄 `build-record.json` 比對。紀錄還沒放上公開倉庫，外部的人跑到這步會寫「略過」和原因（不算通過）；有紀錄可以用 `--record` 指定。
4. `run-tests`：`node source/run-tests.js` 重跑自動測試。

紀錄寫：執行時間（UTC 和臺灣時間）、Node 版本、作業系統、`verify-all.js` 和每一步工具的 SHA-256、倉庫 commit（是 git 檢出才有）、release.json 的版本和指紋、主要成品（`index.html`、`sw.js`、`release.json`、`core.js`、`engine.js`、三個引擎檔）的 SHA-256、`source/` 整個資料夾的樹雜湊，以及每一步的指令、耗時、結束代碼、完整輸出；路徑換成「<倉庫資料夾>」「<使用者資料夾>」。全部通過（可以有略過）代碼 0，有一步失敗代碼 1。只跑某幾步用 `--only`、`--skip`。

**Windows 注意：** git 設了 `core.autocrlf=true` 時，clone 下來的文字檔會被轉成 CRLF，雜湊全部對不上（第 14 輪第一次跑就踩到）。用 `git -c core.autocrlf=false clone` 取倉庫；紀錄遇到這種情形會印提示。

**11 月 13 日的紀錄：** `verification-log-20261113-0452.txt`（跟 `source/` 一起公開）。對公開倉庫 `origin/main`（commit `fab9131`，網站版本 `20261113-0452`）用 `git -c core.autocrlf=false archive` 解開的一份，在開發者的 Windows 電腦（Node 24.20.0）上跑：四步全部通過；`index.html` 逐字一致；兩個雜湊、三處版本號一致；引擎全部符合（只列「公開的 `build-wsl.sh` 沒釘版本」提醒，建置紀錄用開發者電腦上那份）；51 個測試檔、639 項全部通過（行為 541、混合 32、原始碼比對 66），耗時 38.5 秒。`source/` 樹雜湊 `c7ee5e8639a1…`，204 個檔。

這份紀錄證明的是「這一版公開的原始碼組得出發布的 `index.html`、測試在公開的檔案上能過、引擎跟紀錄一致」；**不證明**整個網站（資料檔、素材）能從公開檔案重建，也不是第三方驗證（測試由開發用的 AI 撰寫）。Android 的打算見 [android.md](android.md)。

## 檢查工具 foss-audit.js

`node xiangqi-lab/tools/foss-audit.js` 掃發布出去的 `xiangqi-lab/site/`，列出：每個第三方元件的檔案、授權全文、GPL 對應原始碼在不在；檔名或檔頭像別人的、卻沒登記的檔；程式碼裡有沒有分析、廣告、崩潰回報 SDK（Google Analytics、Firebase、Sentry、Facebook、AdSense、OneSignal、Bugsnag、Matomo、百度統計等 10 類）；程式碼裡出現的每個外部網域是什麼；素材各類的檔數和授權狀態。有缺授權檔、找到追蹤 SDK、或有沒登記的第三方檔，就以代碼 1 結束。測試：`xiangqi-lab/tools/test-foss-audit.js`（8 項）。

**2026 年 11 月 12 日的結果：** 掃 4,498 個檔，**授權全文齊全、沒有找到追蹤或閉源 SDK、沒有沒登記的第三方檔**；App 本身沒有授權檔（照實列出；11/13 起改放 GPL 第 3 版全文的 `LICENSE`，程式採 GPL-3.0-or-later；`foss-audit.js` 跳過倉庫根目錄的 `source/`）。

**注意（11/13）：** 倉庫多了 `source/` 以後，`foss-audit.js` 會掃到 `source/xiangqi-lab/tools/foss-audit.js` 自己的偵測規則文字，誤報成追蹤 SDK；要先讓它跳過 `source/` 再當發布檢查用。

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

## F-Droid 缺口：三類

第 13 輪把上面「不符合」「部分」「大致符合」的每一項，按「能不能在開發者的決定之內補」分成三類。11/13 開發者的決定改了：程式 GPL-3.0-or-later、原始碼公開（`source/`）；自製素材 CC BY-NC-SA 4.0。下面照新的決定重新分類；先前「App 沒有自由授權」「原始模組不公開」「外部不能重算 `modules`」這三項已經不在「做不到」裡。

### 一、做不到（在開發者目前的決定之下）

| 缺口 | 為什麼做不到 | 證據 |
|---|---|---|
| 素材用自由授權（去掉 NonFreeAssets 標記） | 開發者決定素材用 CC BY-NC-SA 4.0（限非商業），自由軟體平台不把它算自由授權 | 倉庫根目錄 `LICENSE-ASSETS.md` |
| 權重可以商用 | `pikafish.nnue` 是 Pikafish 團隊的，授權寫不得商用；不是開發者能改的 | `NNUE-License.md` |
| 開發者刻意不發布的修改 | 例如 `07y-hubmap.js` 的 5 行；沒發布就不在 App 裡，也不在 `source/`，不影響「發布的 App 有對應原始碼」 | release.json 的 `differsFromSource` |

### 二、可以補但還沒做（不違反上面的決定）

| 缺口 | 要做什麼 | 為什麼還沒做 |
|---|---|---|
| 沒有 Android 安裝檔（**F-Droid 的主要缺口**） | 第 14 輪做了骨架（Capacitor 8.6.2、拿掉 Google 服務外掛、跨來源隔離的原生碼草稿）和 F-Droid 建置設定草稿；還要裝 Android 工具鏈編出 APK、原生橋接、修「`localhost` 被當成本機測試」、實機驗證引擎、把專案放上公開倉庫打 tag（[android.md](android.md)〈要做的事與順序〉） | 要裝工具鏈（約 3～5 GB）、要開發者的手機實測，還有幾項要開發者決定（appId、引擎路線、專案放哪） |
| 引擎在 Android WebView 的多執行緒 | Android WebView 不認 COOP／COEP；androidx.webkit 1.18.0（2026-10）的允許清單＋`Document-Isolation-Policy` 是官方開法，骨架已寫草稿；不行就改用 NDK 原生 Pikafish | 沒有手機、沒有工具鏈，還沒驗證 |
| F-Droid 不收預先編好的 `pikafish.wasm` | 建置時從原始碼編（要 emsdk，F-Droid 可能不收它的預編譯 LLVM），或 Android 版改用 NDK 原生引擎（F-Droid 有 `ndk:` 欄位） | 跟引擎路線一起決定 |
| Pikafish 建置紀錄不在公開倉庫 | 把 `build-record.json`（和 `build-pinned.sh`）放進 `pikafish-src/`，外部跑 `verify-all.js` 的第 3 步才不會「略過」 | 要改建置工具並發布 |
| 只用公開檔案建出整個網站 | `build-site.js` 需要的資料檔（`xiangqi-db/*.json`、`qa/`、`art/` 等）和素材也要放到公開來源，並讓建置不依賴開發者電腦的路徑；目前只能重組 `index.html`、`core.js` | 跟「GitHub 只放瘦身版、大檔放 CDN」的做法衝突，要開發者決定放哪裡（例如發布附件） |
| 大檔只在 CDN | 圖片、音樂、3D 模型放到公開來源（例如發布附件） | 同上 |
| 33 個測試檔沒放進 `source/` | 要讀不公開的開發資料（規劃稿、評比資料）或素材原始檔的，改成用假資料；測新功能的，等那些功能發布後重產 `source/` 再放 | 11/13 只準備第一版 |
| `foss-audit.js` 會掃到 `source/` 裡自己的規則文字 | 讓它跳過 `source/` | 還沒改工具 |
| 公開的 `build-wsl.sh` 沒釘 Emscripten 版本 | 改成裝 6.0.13、設 `SOURCE_DATE_EPOCH`；或把 `build-pinned.sh`、`build-record.json` 放進 `pikafish-src/` | 要改建置工具並發布。在那之前，〈Pikafish〉的表格和步驟就是公開的建置說明 |
| 沒有 Pikafish 完整原始碼包 | 把上游 commit 的原始碼＋改過的 `uci.cpp` 打包放發布附件 | 同上 |
| opencc-js、七個字型的上游版本號沒記錄 | 查出版本寫進 credits.md | 還沒查 |
| 預設開的三種匿名資料（Tracking 標記） | 改預設關或第一次先問 | 產品決定 |
| 語音 12 檔、chasoft 棋譜授權 | 換成手機即時朗讀；釐清授權或換來源 | 待開發者確認 |
| 權重不得商用（NonFreeAssets） | 接受標記、取得 Pikafish 團隊許可、或改成第一次使用時另外下載 | 待開發者決定 |

（`release-verify.js`、`pikafish-verify.js` 這兩支核對工具已經放進 `source/xiangqi-lab/tools/`。）

### 三、這輪補了（第 13 輪 F2；11/13 原始碼公開）

| 補了什麼 | 證據 | 重跑指令 |
|---|---|---|
| Pikafish 逐位元重建：釘 Emscripten 6.0.13、固定 `__DATE__` 和排序語系，重編的 `pikafish.wasm`、`pikafish.js` 跟發布的 SHA-256 相同 | `xiangqi-wasm/rebuild-20261113/build.log`、`SHA256SUMS` | `wsl.exe -d Ubuntu-24.04 -- bash xiangqi-wasm/build-pinned.sh xiangqi-wasm/Pikafish xiangqi-wasm/Pikafish/src/uci.cpp <輸出資料夾>` |
| 建置紀錄：上游 commit、`uci.cpp` 雜湊、工具鏈版本、31 個旗標、記憶體設定、成品雜湊、重編結果 | `xiangqi-wasm/build-record.json`；公開版是上面〈Pikafish〉的兩張表 | — |
| 發布的引擎跟紀錄自動比對（檔頭、內嵌編譯器和日期、雜湊、旗標） | 11 月 13 日全部符合，只列「沒釘版本」提醒 | `node xiangqi-lab/tools/pikafish-verify.js --rebuilt xiangqi-wasm/rebuild-20261113` |
| 發布後的成品核對 | 公開倉庫 70 個發布 commit 全部一致 | `node xiangqi-lab/tools/release-verify.js --git xiangqi-lab/site --ref origin/main` |
| 更正第 11 輪的錯誤（wasm 其實有內嵌編譯器版本） | 〈Pikafish〉的「更正」 | 同 `pikafish-verify.js` |
| 測試：假的成品、改一個位元、雜湊不符的紀錄、本機假網站的 `--url` 模式 | `xiangqi-lab/tools/test-fdroid-evidence.js`（9 項） | `node --test xiangqi-lab/tools/test-fdroid-evidence.js` |
| 11/13：App 程式碼改 GPL-3.0-or-later、素材改 CC BY-NC-SA 4.0 | 倉庫根目錄 `LICENSE`（GPL 第 3 版全文）、`LICENSE-ASSETS.md`、`NOTICE.md` | — |
| 11/13：原始碼公開（發布版的 `m.html`、`m.css`、98 支裡已發布的 97 支模組、`src/*.js`、`xiangqi-referee.js`、建置與測試工具） | `source/`；組出的 `index.html` 跟發布的逐字相同 | `node source/check-build.js` |
| 11/13：外部能重跑測試 | 50 個測試檔、637 項全部通過 | `node source/run-tests.js` |
| 11/13：公開前的機密與個資掃描 | `oss-scan.js`：金鑰、私鑰、密碼、token、信箱、電話、本機路徑、匿名碼樣本，另外比對開發者電腦上的已知金鑰（只報位置不印值）；沒有高風險 | `node source/xiangqi-lab/tools/oss-scan.js source` |
| 第 14 輪 F3：一個指令重跑全部核對、留紀錄 | `verify-all.js`；對公開版 `20261113-0452` 四步全部通過，紀錄 `verification-log-20261113-0452.txt`（上面〈可重現驗證包〉） | `node source/xiangqi-lab/tools/verify-all.js --out 紀錄.txt` |
| 第 14 輪 F3：Android 骨架、F-Droid 建置設定草稿、路線圖 | 開發者電腦上的 `xiangqi-android/`（`scripts/check-skeleton.js` 全部通過）；[android.md](android.md) | `node xiangqi-android/scripts/check-skeleton.js` |
| 第 14 輪 F3：測試 | `xiangqi-lab/tools/test-android-roadmap.js`（驗證包對假倉庫的輸出、失敗和略過、路徑遮蔽；F-Droid 草稿欄位；骨架檢查；兩份文件一致） | `node --test xiangqi-lab/tools/test-android-roadmap.js` |

這些都是**證據**，不改變結論：App 本身仍然不符合 F-Droid 的收錄條件（主要缺 Android 安裝檔）。

## 如果要上 F-Droid，要做的事（給開發者決定）

- **要進主倉庫（11/13 起前兩步已經做了）：**
  1. ~~選一個自由授權（建議 GPL-3.0），加上 LICENSE。~~ 11/13 做了：程式 GPL-3.0-or-later。
  2. ~~公開原始模組、`xiangqi-referee.js`、建置工具和建置說明。~~ 11/13 做了：`source/`。還差：讓建置只靠公開檔案就能跑完（資料檔和素材的公開來源）。
  3. 做一個開源、不依賴 Google Play 服務的 Android 包裝，F-Droid 的伺服器要能從原始碼建出安裝檔。**這是現在最大的一步。** 第 14 輪有骨架和草稿，步驟、順序、要決定的事在 [android.md](android.md)。
  4. 素材和權重：接受「NonFreeAssets」標記（素材是 CC BY-NC-SA、權重不得商用），或取得 Pikafish 團隊許可，或改成第一次使用時另外下載。
  5. 預設開的三種匿名資料改成預設關或先問，避免「Tracking」標記。
  6. 語音 12 檔換成手機即時朗讀；chasoft 棋譜釐清授權或換來源。
  7. 把釘版本的建置腳本和建置紀錄放上倉庫（第 13 輪已在本機做好、重編逐位元相同），放完整的 Pikafish 原始碼包。
- **先不進主倉庫：** 可以自己架一個 F-Droid 相容的第三方倉庫，放自己簽名的安裝檔，但一樣要先有 Android 包裝。

**上架 App Store 要另外注意（11/13）：** GPL-3.0 要求散布的人不能對使用者加上額外限制；App Store 的使用條款（裝置數量、禁止再散布等）跟 GPL 有沒有衝突，自由軟體基金會和 Apple 看法不同，過去有 GPL 軟體因為第三方著作權人反對而被下架。開發者自己寫的程式由開發者授權，自己上架沒有問題；但 Pikafish 是別人的 GPL 程式，上架前要請懂授權的人看，或取得 Pikafish 團隊同意。

第 11、13 輪只做文件、檢查工具和本機重編；**11/13 開發者決定改授權、公開原始碼**，這一頁照新的決定更新；第 14 輪加 Android 骨架（沒編譯）和可重現驗證包，沒有發布、沒有裝 Android 工具鏈。
