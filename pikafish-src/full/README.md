# 象棋千秋使用的 Pikafish 完整對應原始碼（Complete Corresponding Source）

《象棋千秋》的 `engine/pikafish.wasm`、`engine/pikafish.js` 是用這裡的原始碼編出來的。依 GNU GPL 第 3 版，這一包就是對應原始碼。

## 內容

| 路徑 | 是什麼 |
|---|---|
| `upstream/Pikafish-2026-09-06/` | 上游 [official-pikafish/Pikafish](https://github.com/official-pikafish/Pikafish) 標籤 `Pikafish-2026-09-06`（commit `4c17cee11f888ae1d48a9494f2e2239f019f0a1f`）的完整原始碼，未修改，用 `git archive` 匯出。授權全文在裡面的 `Copying.txt`（GPL-3.0），作者名單在 `AUTHORS` |
| `modified/src/uci.cpp` | 唯一改過的檔案：瀏覽器沒有標準輸入，改成由網頁呼叫 `uci_command()` 把指令放進佇列（上游 32 行新增，其他檔案沒改）。SHA-256 `149644b9781bbc7c3c8422ba9406ceaa20db1fad2d384ea96d0d8189ef20be5e` |
| `modified/uci.cpp.patch` | 同一個改動的 diff（對上游 `src/uci.cpp`，上游 SHA-256 `3b49ab2d2f06b5c7b1cbd3f0da77f96cac4cf5e94511953702e84ded9ca7a82c`） |
| `build/build-pinned.sh` | 釘版本的建置腳本：Emscripten 6.0.13、檢查上游 commit 和 `uci.cpp` 雜湊、固定 `SOURCE_DATE_EPOCH` 和排序語系 |
| `build/build-wsl.sh` | 原本的建置腳本（會裝最新版 Emscripten；要逐位元重現請用 build-pinned.sh） |
| `build/build-record.json` | 建置紀錄：上游版本、工具鏈（Emscripten 6.0.13、Clang 24.0.0git 83ee0779）、編譯旗標、產物雜湊 |
| `rebuild-evidence/` | 2026-11-13 重編的紀錄（`build.log`）和雜湊（`SHA256SUMS`），兩個產物都跟發布的逐位元相同 |

神經網路權重 `pikafish.nnue` 不在這一包：它不是程式原始碼，另有 Pikafish 的 NNUE 授權（禁止商用；《象棋千秋》免費、無廣告、無內購，屬非商業使用）。

## 怎麼重現編譯

需要 Linux 或 WSL（作者用 WSL Ubuntu-24.04）、git、bash、能連網（第一次要下載約 1 GB 的 Emscripten 6.0.13）。

```bash
# 1. 準備上游原始碼（build-pinned.sh 會檢查 commit，所以要用 git 取得）
git clone https://github.com/official-pikafish/Pikafish.git
cd Pikafish && git checkout 4c17cee11f888ae1d48a9494f2e2239f019f0a1f && cd ..

# 2. 編譯（把改過的 uci.cpp 交給腳本；腳本會檢查它的雜湊）
bash build/build-pinned.sh ./Pikafish ./modified/src/uci.cpp ./out

# 3. 核對
sha256sum out/pikafish.wasm out/pikafish.js
#   7fb6fc805a36ced6a55626a9513b7dda821b0bbb5e830fa17f120f1550a9a331  pikafish.wasm
#   dd5498bfb76381598d453a612d74e5e1955835452324c4d0b962a64fb44438f7  pikafish.js
```

`SOURCE_DATE_EPOCH` 預設固定成原始編譯那天（1793361600＝2026-10-30），因為 Pikafish 的版本字串用到 `__DATE__`；不固定的話，`pikafish.wasm` 只會差內嵌日期那 5 個位元組。

也可以不用 git：把 `upstream/Pikafish-2026-09-06/` 複製成一個 git 倉庫再 commit，或直接改 build-pinned.sh 拿掉 commit 檢查（雜湊核對照樣有效）。

## English summary

Complete Corresponding Source for the Pikafish WebAssembly build shipped in Xiangqi Qianqiu: unmodified upstream Pikafish tag `Pikafish-2026-09-06` (commit `4c17cee1…`), the single modified file `src/uci.cpp` (+32 lines: the browser has no stdin, so commands are queued through `uci_command()`), the pinned build script (Emscripten 6.0.13, fixed `SOURCE_DATE_EPOCH`), the build record and the 2026-11-13 rebuild log showing bit-identical output. Licensed under GPL-3.0 (see `upstream/Pikafish-2026-09-06/Copying.txt`). The `pikafish.nnue` network is not part of this source package and is under Pikafish's separate NNUE license.
