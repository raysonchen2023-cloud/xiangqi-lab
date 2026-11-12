# 第三方元件與授權（NOTICE）

《象棋千秋》Xiangqi Qianqiu　© 2026 陳泓昇（Chen Hung-Sheng）

- 本 App 的程式碼：GNU GPL 第 3 版或（由你選擇）任何更新的版本，SPDX `GPL-3.0-or-later`（`LICENSE`），原始碼在 `source/`。寫在程式檔裡的介面文字、場景小故事和對白也算程式。
- 本 App 開發者自製的素材（`data/` 底下的圖片、3D 模型、音樂、長篇劇情等）：CC BY-NC-SA 4.0（`LICENSE-ASSETS.md`）。`data/gmbios.json` 和 `data/voice/` 不在內，見下面〈資料〉。
- 下面這些是**別人做的**，照各自的授權使用，不適用上面兩種授權。授權全文在 `licenses/` 和倉庫根目錄；每一項的來源、用途與查證狀態見 `data/docs/credits.md`、`data/docs/foss.md`。

## 程式庫（隨 App 散布）

| 元件 | 版本 | 授權 | App 裡的檔案 | 授權全文 |
|---|---|---|---|---|
| three.js（Three.js Authors） | r149 | MIT | `three.min.js`、`GLTFLoader.mjs`、`BufferGeometryUtils.mjs`（兩個 `.mjs` 改了 import 來源） | `licenses/three.js-MIT.txt` |
| jsQR（cozmo） | 1.4.0 | Apache-2.0 | `jsQR.min.js` | `licenses/jsQR-Apache-2.0.txt` |
| QRCode.js（davidshimjs） | master | MIT | `qrcode.min.js` | `licenses/qrcodejs-MIT.txt` |
| opencc-js（nk2028） | 未記錄 | MIT | `opencc-cn2t.js`、`opencc-t2cn.js` | `LICENSE-opencc-js.txt` |
| OpenCC 轉換字典（Carbo Kuo (BYVoid) and contributors，opencc-js 內含） | 同上 | Apache-2.0 | 同上 | `licenses/OpenCC-dictionary-Apache-2.0.txt` |

## 象棋引擎與神經網路

| 元件 | 版本 | 授權 | 檔案 | 授權全文與原始碼 |
|---|---|---|---|---|
| Pikafish（official-pikafish） | `Pikafish-2026-09-06` | GPL-3.0 | `engine/pikafish.wasm`、`engine/pikafish.js` | `LICENSE-Pikafish-GPL3.txt`；改過的 `uci.cpp` 與建置腳本在 `pikafish-src/`；上游 <https://github.com/official-pikafish/Pikafish> |
| Emscripten 執行環境（編進 `pikafish.js`） | 6.0.13 | MIT／University of Illinois/NCSA 雙授權 | `engine/pikafish.js` | <https://github.com/emscripten-core/emscripten/blob/main/LICENSE> |
| Pikafish 神經網路權重 | 隨上面那版 | Pikafish NNUE 授權：**只能合法使用、未經許可不得商用** | `engine/pikafish.nnue` | `NNUE-License.md` |

## 字型（子集，改了字型內部名稱）

全部是 SIL Open Font License 1.1，可以嵌入、修改、再散布，不得單獨販售字型本身。檔案：`data/fonts/xq-*.woff2`；清單：`data/fonts/LICENSES.md`。

| 字型 | 作者 | 授權全文 |
|---|---|---|
| 芫荽 Iansui | ButTaiwan（改自 Fontworks Klee One） | `licenses/font-Iansui-OFL.txt` |
| 全字庫正楷體 | 國家發展委員會（OFL 1.1 與政府資料開放授權擇一，採 OFL） | `licenses/font-TWKai-OFL.txt` |
| 霞鶩文楷 TC | LXGW | `licenses/font-LXGWWenKaiTC-OFL.txt` |
| 源流明體 GenRyuMin | ButTaiwan（改自思源宋體） | `licenses/font-GenRyuMin-OFL.txt` |
| 朱雀仿宋 | TrionesType | `licenses/font-Zhuque-OFL.txt` |
| 仙人掌明體 Cactus Serif | MoonlitOwen | `licenses/font-CactusSerif-license.md` |
| 源雲明體 GenWanMin | ButTaiwan（改自思源宋體） | `licenses/font-GenWanMin-OFL.txt` |

## 資料

| 資料 | 來源 | 授權 |
|---|---|---|
| 明清古譜（《適情雅趣》《橘中秘》《梅花譜》、古典開局譜、殘局排局譜） | 古書本身；數位資料來自 [chasoft/community-xiangqi-games-database](https://github.com/chasoft/community-xiangqi-games-database) | 古書是公共領域；數位整理的授權不明（該倉庫沒有授權檔） |
| 許銀川對局、特級大師對局、1956～2019 年比賽對局（`xuyinchuan.json`、`gmgames.json`、`tour-*.json`、`brilliant.json`） | 同上 | 著法是事實；資料庫的授權不明，**待釐清** |
| 殺法名稱 | [Wikibooks〈中國象棋／基本殺法列表〉](https://zh.wikibooks.org/wiki/中国象棋/基本杀法列表) | CC BY-SA 4.0；只參考名稱，說明文字是自己寫的 |
| 特級大師小傳（`gmbios.json`） | 中文維基百科、廣東象棋網、互動百科、新華網、澎湃新聞等（每筆附來源網址） | 改寫；照原來源的條件（維基百科是 CC BY-SA 4.0，其他網站各有著作權，**待釐清**），**不以本 App 的 GPL 或 CC BY-NC-SA 授權** |
| 語音 12 檔（`data/voice/`） | Windows 內建語音合成（Microsoft Zhiwei、Yating）的輸出 | 再散布規定不明，**不以本 App 的 GPL 或 CC BY-NC-SA 授權** |

## App 執行時才連線取得的資料（不隨 App 散布）

| 資料 | 來源 | 授權 |
|---|---|---|
| 天氣 | [Open-Meteo](https://open-meteo.com/) | 資料 CC BY 4.0；免費 API 限非商業使用 |
| 百科摘要 | 中文維基百科 | CC BY-SA 4.0，畫面標出處並附原文連結 |

## AI 服務

App 的部分素材是用 Google Gemini（圖片、Lyria 音樂）、OpenAI（少數圖片）、Tripo（3D 模型）做的，程式由 Anthropic Claude、OpenAI Codex 協助撰寫。各家條款都不主張輸出的所有權或把權利轉給使用者；條款重點與本 App 的遵守方式見 `data/docs/ai-assets.md`。App 執行時不呼叫任何 AI 服務（「🎤 聲控走棋」用的是瀏覽器或手機系統內建的語音辨識，由 Google、Apple 等平台處理，見 `data/docs/privacy.md`）。

## 建置與測試時用到、但不隨 App 散布的工具

- Node.js（建置、測試）；Python 3 與 OpenCC（`source/xiangqi-lab/tools/to_trad.py`，資料轉繁體）。
- `source/xiangqi-lab/tools/qa/` 的兩支畫面壓力測試會用 Playwright（Apache-2.0）開無頭 Chrome，要自己安裝；`source/run-tests.js` 不會跑它們。

## 服務供應商（不是素材）

網站：GitHub Pages；圖片和大檔：Cloudflare Pages；線上大廳：EMQX Cloud（備用 broker.emqx.io）；意見回饋：Google 表單／Apps Script。資料處理見 `data/docs/privacy.md`。
