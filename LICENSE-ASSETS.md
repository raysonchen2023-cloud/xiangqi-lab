# 素材授權（CC BY-NC-SA 4.0）

《象棋千秋》Xiangqi Qianqiu　© 2026 陳泓昇（Chen Hung-Sheng）

開發者自己做的素材，依 **創用 CC 姓名標示─非商業性─相同方式分享 4.0 國際**（Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International，**CC BY-NC-SA 4.0**）授權。

- 法律條文：<https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.zh-hant>（中文）／<https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode>（英文，以此為準）
- 授權摘要：<https://creativecommons.org/licenses/by-nc-sa/4.0/>

程式碼不適用這一份。程式碼是 **GNU 通用公共授權第 3 版，或（由你選擇）任何更新的版本**（SPDX：`GPL-3.0-or-later`），見 `LICENSE`。第三方的東西也不適用，見 `NOTICE.md`。

## 一句話分清楚：看它放在哪裡

| 東西放在哪裡 | 授權 | 例子 |
|---|---|---|
| 寫在**程式檔**裡（`.js`、`.mjs`、`.html`、`.css`，包括 `index.html` 和 `source/` 裡的模組） | **GPL-3.0-or-later**（跟著程式） | 按鈕和選單的文字、提示訊息、說明小字、寫在程式裡的場景小故事、角色對白、問小帥的回答 |
| 放在 **`data/` 底下**、開發者自己做的檔 | **CC BY-NC-SA 4.0**（這一份） | 圖片、3D 模型、背景音樂、音效、長篇劇情與小說、資料檔裡的題目講解、說明文件 |
| `data/gmbios.json`、`data/voice/`、棋譜資料、第三方元件 | **都不是上面兩種**，照原來源的條件 | 見下面〈不在這份授權裡的〉 |

所以同一段對白，寫在 `.js` 程式檔裡就是 GPL，放在 `data/` 的劇情檔裡就是 CC BY-NC-SA。拿去用的時候，看你取用的是哪個檔就好。

## 你可以

- **分享**：用任何媒介或格式重製、散布這些素材。
- **改作**：重混、轉換、以這些素材為基礎再創作。

## 條件

- **姓名標示**：寫明「《象棋千秋》陳泓昇（Chen Hung-Sheng）」、附上 CC BY-NC-SA 4.0 的連結、說明有沒有修改。
- **非商業性**：不得作商業用途。
- **相同方式分享**：改作後要用同樣的授權（CC BY-NC-SA 4.0）散布。

## 哪些檔案是「開發者自製的素材」

App 的素材放在網站的 `data/` 底下（GitHub 倉庫只放一部分；大部分圖片、音樂、3D 模型放在 Cloudflare 的 `https://xiangqi-cdn.pages.dev/`，路徑跟網站相同）。下面這些適用 CC BY-NC-SA 4.0：

| 類別 | 位置（`data/` 底下） | 說明 |
|---|---|---|
| 美術：場景、地圖、人物、圖示、棋子、棋盤、載入圖等 | 各個 `*map/`、`homemap/`、`hubmap/`、`journey/`、`actors/`、`npc/`、`xs/`、`pika/`、`pika2/`、`loading/`、`icons/`、`pieces/`、`boards/`、`park/`、`park3d/`、`tabink/`、`tabtube/`、`parkgate/`、`seasonbox/`、`feedback/` 等所有圖片（`.webp`、`.png`） | AI（Gemini，少數 OpenAI）協助生成，開發者挑選、修圖、裁切 |
| 書法字形路徑 | `glyphs/` | 由 AI 生成的書法圖描成向量 |
| 3D 模型 | `tripo_app/`、`tripo_anim/` 的 `.glb` | 用 Tripo 付費 API 由立繪生成，再瘦身 |
| 背景音樂 | `bgm/` | Gemini Lyria 生成，曲名是開發者取的 |
| 走棋音效 | `sfx/` | 程式合成 |
| 長篇劇情、角色、對白、棋史說明、詩文、場景文字（**資料檔裡的**） | `park-legend.json`、`park-legend2.json`、`park-novel.json`、`lines/`、`journey/`、`actors/`、`npc/`、`poems/`、`ouyu/`、`relics/`、`xyc/`、`qa/`、`eramap/`、`champ/`、`pset/`、`inkfx/` 等資料檔裡的文字 | 開發者構思，AI 協助撰寫，開發者審過；有歷史人物與朝代背景，情節是創作 |
| 題目講解、術語說明 | `quiz.json`、`canju/`、`terms.json` 裡**開發者寫的講解與說明文字** | 題目的局面、著法本身不在此授權（見下） |
| 說明文件 | `docs/` | 開發者撰寫的說明、報告與截圖 |

## 不在這份授權裡的

| 東西 | 位置 | 怎麼授權、為什麼 |
|---|---|---|
| 程式碼，以及**寫在程式檔裡的文字**（介面文字、場景小故事、對白） | `index.html`、`*.js`、`*.mjs`、`sw.js`、`source/` | GPL-3.0-or-later，見 `LICENSE` |
| 特級大師小傳 | `gmbios.json` | 改寫自中文維基百科（CC BY-SA 4.0）和其他網站，每筆附來源網址；**照原來源的條件**，不以 CC BY-NC-SA 授權。要用請回到原來源確認 |
| 語音 | `data/voice/` | 用 Windows 內建語音合成錄的 12 個短音檔，微軟對再散布的規定不明，**不以 CC BY-NC-SA 授權** |
| 字型 | `data/fonts/` | SIL OFL 1.1，見 `licenses/` |
| 棋譜與棋局資料 | `shiqingyaqu.json`、`juzhongmi.json`、`meihuapu.json`、`kaiju.json`、`canju.json`、`xuyinchuan.json`、`gmgames.json`、`tour-*.json`、`brilliant.json`，以及題庫、殘局裡的局面與著法 | 明清古譜是公共領域；著法是事實；數位資料來自 chasoft/community-xiangqi-games-database，授權不明 |
| 引擎與權重 | `engine/` | Pikafish 是 GPL-3.0；`pikafish.nnue` 照 `NNUE-License.md`（不得商用） |
| 第三方程式庫 | `three.min.js`、`GLTFLoader.mjs`、`BufferGeometryUtils.mjs`、`opencc-*.js`、`jsQR.min.js`、`qrcode.min.js` | 各自的授權，見 `NOTICE.md` |
| 營運資料 | `banlist.json`、`fixes.json`、`quiz-calib.json`、`preload.json`、`big-books.json`、`books.json` | App 運作用的清單和設定，不是作品 |

## 補充

- 純 AI 生成的內容，在某些國家可能不受著作權保護；這份授權只涵蓋開發者能主張的權利。各 AI 服務條款的限制（例如 Tripo 不准拿輸出做和它競爭的 3D 生成服務）照樣適用。詳見 `data/docs/ai-assets.md`。
- 「非商業」限制的是取得授權的人；著作權人（開發者）自己的使用不受限制。
- 想用在商業用途，請在倉庫開 issue 聯絡開發者。

---

**English summary.** Original assets of Xiangqi Qianqiu stored under `data/` (artwork including AI-assisted images, 3D models, music, sound effects, long-form story and explanatory texts in data files, and documentation) are © 2026 Chen Hung-Sheng and licensed under CC BY-NC-SA 4.0 (<https://creativecommons.org/licenses/by-nc-sa/4.0/>). The code is licensed under the GNU GPL version 3 or (at your option) any later version (`GPL-3.0-or-later`, see `LICENSE`); this includes UI text, scene vignettes and dialogue written inside the code files. `data/gmbios.json` (adapted from Wikipedia, CC BY-SA, and other sources) and the voice files in `data/voice/` are excluded from the CC license and keep the terms of their original sources. Third-party fonts, game records, the Pikafish engine and its network weights keep their own terms (see `NOTICE.md`).
