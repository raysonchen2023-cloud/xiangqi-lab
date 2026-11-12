# 《象棋千秋》原始碼

這個資料夾是《象棋千秋》手機網頁 App 的可讀原始碼，對應倉庫根目錄那一版發布的 App（`index.html`、`core.js`、`net.js` 等是由這裡組出來或原樣複製的）。

- 程式碼授權：**GNU GPL 第 3 版，或（由你選擇）任何更新的版本**（SPDX：`GPL-3.0-or-later`），全文見倉庫根目錄 [`LICENSE`](../LICENSE)。© 2026 陳泓昇（Chen Hung-Sheng）。這個資料夾裡的每個檔都算，包括寫在 `.js` 模組裡的介面文字、場景小故事和對白。
- 開發者自製的素材（`data/` 底下的美術、3D 模型、音樂、長篇劇情等）：**CC BY-NC-SA 4.0**，見 [`LICENSE-ASSETS.md`](../LICENSE-ASSETS.md)。`data/gmbios.json` 和 `data/voice/` 不在內，照原來源的條件。
- 第三方元件（Pikafish 引擎、神經網路權重、three.js、OpenCC、字型、棋譜資料等）：照各自授權，見 [`NOTICE.md`](../NOTICE.md)。
- 這個倉庫只收問題回報（Issues），不收 Pull Request，見 [`CONTRIBUTING.md`](../CONTRIBUTING.md)。你可以依 GPL 自己 fork、修改、散布。

公開的是**線上已發布的版本**：開發者電腦上還沒發布的修改不在這裡；哪幾個檔取自發布版、哪些模組還沒發布，記在 [`STAGE-MANIFEST.json`](STAGE-MANIFEST.json)。

## 資料夾配置

配置跟開發者電腦上一樣，所以工具裡的相對路徑都不用改：

```
source/
  xiangqi-db/
    m.html            頁面骨架：每支程式一行 //#include m/xx.js，樣式一行 <link rel="stylesheet" href="m.css">
    m.css             主樣式
    m/*.js            App 主程式，拆成約 100 支模組（全部共用同一個全域，照 m.html 的順序接起來執行）
    tools/mhtml.js    把 m.html 組回一個完整頁面
    fonts/charset.txt 朝代字型收了哪些字（建置時檢查缺字用）
  xiangqi-lab/
    src/*.js          原樣複製到網站根目錄的程式：local.js（本機對局、存檔）、net.js（線上大廳 MQTT）、
                      engine.js（跟 Pikafish 溝通）、park3d.js（3D 園子）、bot3d.js、map3d.js、zh.js、sw.js
    tools/            建置、發布前檢查、測試（test-*.js）與其他開發工具
  xiangqi-referee.js  規則、記譜、裁判與電腦版自動裁判；網站的 core.js 是建置時從這支抽出來的
  check-build.js      從原始碼組出 index.html，跟發布的比對
  run-tests.js        重跑自動測試
```

第三方程式庫（`three.min.js`、`GLTFLoader.mjs`、`BufferGeometryUtils.mjs`、`opencc-*.js`、`jsQR.min.js`、`qrcode.min.js`）和圖示在倉庫根目錄已經有原檔，這裡不重複放。

## 需要

- Node.js 20 以上（不用裝任何 npm 套件）。
- 只有完整建置網站才需要：Python 3 和 `opencc`（`pip install opencc`，資料轉繁體），以及開發者電腦上的資料檔和素材（見下面〈完整建置〉）。

## 組出 index.html

在倉庫根目錄：

```
node source/check-build.js
```

會照 `build-site.js` 第 4 步的做法組頁面（`m.css` 換成 `<style>`、每一行 `//#include` 換成那支模組、圖示改相對路徑、拿掉 Google 字型、插入 `core.js` 等 `<script>`），再跟倉庫根目錄的 `index.html` 逐字比對。比對時忽略三處：開頭的授權聲明註解、建置時才填的版本號、整包大小。印「✔ 一致」就代表發布的 `index.html` 是這份原始碼組出來的。

只想拿到組好的頁面：

```
node source/check-build.js --out 組好的.html
```

只組、不轉成離線版（開發時用的樣子）：

```
node source/xiangqi-db/tools/mhtml.js --out 組好的.html
```

`core.js` 由 `xiangqi-referee.js` 抽出，可以這樣重產再比對（會寫到 `source/xiangqi-lab/site/core.js`，比完可以刪掉）：

```
cd source
node xiangqi-lab/tools/build-site.js --core-only
```

也可以核對 `release.json` 的模組指紋：每支 `xiangqi-db/m/*.js` 去掉最後一個換行、算 SHA-1 取前 12 碼，要等於 `release.json` 的 `modules`。`differsFromSource` 列出的模組例外（那是開發者電腦上當時還沒發布的修改，指紋本來就不同）。

## 重跑測試

```
node source/run-tests.js                    全部跑一遍，印出每個檔各類幾項、通過幾項
node source/run-tests.js test-ruleset.js    只跑指定的檔
```

測試不連網、不開瀏覽器。`run-tests.js` 會在系統暫存資料夾組出開發時的資料夾配置（`xiangqi-lab/site` 用目錄連結指回倉庫根目錄），跑完就刪掉；千秋盃金鑰測試用的金鑰也放在暫存資料夾，不會碰你使用者資料夾裡的檔。

測試分三類（`xiangqi-lab/tools/testkinds.js` 會分開統計）：**行為**（真的執行程式、檢查結果）、**混合**、**原始碼比對**（只檢查程式碼裡有沒有某段字，只證明程式碼存在，不證明功能會動）。測試由開發用的 AI 撰寫，不等於第三方驗證。

有些測試檔沒有放進來：要讀不公開的開發資料（規劃稿、評比資料）或素材原始檔，或測的是還沒發布的新功能。清單和原因在 `STAGE-MANIFEST.json` 的 `excludedTests`。

## 完整建置（目前只有開發者電腦能做）

`xiangqi-lab/tools/build-site.js` 產生整個網站：清空 `xiangqi-lab/site/`（保留 `.git`）→ 從 `xiangqi-referee.js` 抽 `core.js` → 複製引擎、權重 → 複製資料並轉繁體 → 組 `index.html` → 複製 `src/*` → 授權檔與 `pikafish-src/` → 產生 `preload.json` → 算版本號寫進 `sw.js`、`index.html`。發布前用 `xiangqi-lab/tools/verify-release.js` 檢查控制字元、版本、語法。

它需要的資料檔（`xiangqi-db/*.json`、`xiangqi-db/art/`、`qa/`、`voice/` 等）和 Pikafish 的編譯成品還沒有公開來源，所以現在別人還不能從頭跑完。**注意：它會清空 `xiangqi-lab/site/`，不要把它指到你的倉庫副本上跑。**

Pikafish 引擎怎麼從原始碼編譯，見倉庫的 `pikafish-src/` 和 `data/docs/foss.md`〈Pikafish（GPL-3.0）的對應原始碼〉。

## 開發者用的其他工具

- `xiangqi-lab/tools/oss-stage.js`：從公開倉庫的發布版切出這個 `source/` 資料夾（只在開發者電腦上跑）。
- `xiangqi-lab/tools/oss-scan.js`：公開前掃機密與個資（金鑰、私鑰、密碼、token、信箱、電話、本機路徑、匿名碼樣本）：`node source/xiangqi-lab/tools/oss-scan.js source`。
- 連到線上大廳的營運程式（大廳角色、千秋盃裁判台的連線設定等）需要伺服器帳密，帳密不在這裡；`mqtt-config.example.json` 是設定檔的範本。

## 回報問題

見倉庫根目錄的 [`CONTRIBUTING.md`](../CONTRIBUTING.md)。
