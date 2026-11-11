# 素材與授權

最後核對：2026 年 11 月 11 日。

《象棋千秋》是推廣中國象棋的免費、非商業學習計畫：不收費、沒有內購、沒有廣告。原創的程式、畫面、美術和文字 © 2026 陳泓昇。下面列出的別人做的東西，照它們各自的授權使用，不在上面的權利範圍內。

## 怎麼讀這一頁

每一項都寫五件事：**來源**、**授權**、**怎麼用**、**能不能隨 App 散布**、**狀態**。

- **已確認**：授權條文找得到（檔案裡或上游公開網頁），我們做得到它的條件。
- **待開發者確認**：來源或授權還不清楚，或是條件裡有一件事還沒做（例如還沒附上授權全文、還沒拿到書面許可）。

這一頁是整理，不是法律意見。上架前的完整盤點另見專案內的授權台帳。

## 一、程式庫

### three.js（3D 園子、立體棋子）

- 來源：three.js r149（`three.min.js`、`GLTFLoader.mjs`、`BufferGeometryUtils.mjs`）
- 授權：MIT（檔頭寫著「Copyright 2010-2023 Three.js Authors / SPDX-License-Identifier: MIT」）
- 怎麼用：原檔照用，沒有修改
- 能不能散布：可以，要保留版權聲明和 MIT 全文
- 狀態：**已確認**（MIT 全文還沒另外附上，待補）

### opencc-js（繁簡轉換）

- 來源：[nk2028/opencc-js](https://github.com/nk2028/opencc-js)（`opencc-cn2t.js`、`opencc-t2cn.js`）
- 授權：程式是 MIT（全文在 `LICENSE-opencc-js.txt`）。裡面的轉換字典是從 OpenCC 的資料產生的，[OpenCC](https://github.com/BYVoid/OpenCC) 是 Apache-2.0
- 怎麼用：原檔照用
- 能不能散布：可以，要附 MIT 全文；字典部分建議另附 OpenCC 的 Apache-2.0 聲明
- 狀態：程式 **已確認**；字典的 Apache-2.0 聲明 **待開發者確認**（要不要附、怎麼附）

### jsQR（換手機時掃 QR 碼）

- 來源：jsQR 1.4.0（jsDelivr 壓縮版，檔頭寫「Original file: /npm/jsqr@1.4.0/dist/jsQR.js」），上游 [cozmo/jsQR](https://github.com/cozmo/jsQR)
- 授權：Apache-2.0（上游 GitHub 頁標示）
- 怎麼用：原檔照用
- 能不能散布：可以，要附 Apache-2.0 全文和版權聲明
- 狀態：授權 **已確認**；檔案裡沒有授權聲明，全文 **待補**

### QRCode.js（產生 QR 碼）

- 來源：`qrcode.min.js` 檔頭沒寫作者。從程式開頭的寫法看，是 [davidshimjs/qrcodejs](https://github.com/davidshimjs/qrcodejs) 的壓縮版
- 授權：該專案是 MIT
- 怎麼用：原檔照用
- 能不能散布：若確定是這個專案，可以，要附 MIT 聲明
- 狀態：**待開發者確認**（要用上游原檔比對一次，確定是同一份）

### 自己寫的程式

- `three-shim.mjs`、`core.js`（規則核心）、`local.js`、`net.js` 等：© 陳泓昇，AI（Claude、ChatGPT Codex）協助撰寫
- 狀態：**已確認**為自有

## 二、象棋引擎與神經網路權重

### Pikafish 引擎（`engine/pikafish.wasm`、`pikafish.js`）

- 來源：[official-pikafish/Pikafish](https://github.com/official-pikafish/Pikafish)，版本標籤 Pikafish-2026-09-06
- 授權：GNU GPL 第 3 版（全文 `LICENSE-Pikafish-GPL3.txt`）
- 怎麼用：編成 WebAssembly 在手機裡跑，負責電腦下棋和複盤分析。只改了 `uci.cpp`（讓網頁能送指令），改過的檔案和建置腳本公開在 [pikafish-src](https://github.com/raysonchen2023-cloud/xiangqi-lab/tree/main/pikafish-src)
- 能不能散布：可以，但要提供對應原始碼
- 狀態：授權 **已確認**；「完整對應原始碼包」和「執行檔確實由這份原始碼編出」的證據 **待開發者確認**

### 神經網路權重 `pikafish.nnue`

- 來源：Pikafish 官方
- 授權：Pikafish 的 NNUE 授權（全文 `NNUE-License.md`，和官方 [Networks README](https://github.com/official-pikafish/Networks/blob/master/README.md) 一致）：只能合法使用；**未經許可不得商用**；官網名單上的單位可以商用
- 怎麼用：引擎啟動時載入，評估局面
- 能不能散布：《象棋千秋》不收費、不做商業用途，在這個條件下隨 App 一起提供。要商用必須先取得 Pikafish 團隊許可，或換成其他權重
- 狀態：**待開發者確認**——目前沒有書面許可；「免費上架算不算商用」條文沒有說清楚。另外，官方 README 說 Fairy-Stockfish 象棋版權重是 CC0，但那**不是**我們用的檔案

## 三、字型

七個朝代字型都只取 App 用到的字，並照規定改了字型內部名稱。授權都是 SIL Open Font License 1.1：可以嵌入、修改、再散布，但不得單獨販售字型本身；改過的版本不能沿用原來的保留字型名。

- 芫荽（ButTaiwan，改自 Fontworks Klee One）：[來源](https://github.com/ButTaiwan/iansui)
- 全字庫正楷體（國家發展委員會；資料集可在 OFL 1.1 和政府資料開放授權條款之間擇一，本 App 採 OFL 1.1）：[來源](https://data.gov.tw/dataset/5961)
- 霞鶩文楷 TC（LXGW）：[來源](https://github.com/lxgw/LxgwWenkaiTC)
- 源流明體（ButTaiwan，改自思源宋體）：[來源](https://github.com/ButTaiwan/genryu-font)
- 朱雀仿宋（TrionesType）：[來源](https://github.com/TrionesType/zhuque)
- 仙人掌明體（MoonlitOwen）：[來源](https://github.com/MoonlitOwen/CactusSerif)
- 源雲明體（ButTaiwan，改自思源宋體）：[來源](https://github.com/ButTaiwan/genwan-font)

- 怎麼用：子集化後做成 `xq-*.woff2`，隨 App 下載
- 能不能散布：可以，要附各字型的版權聲明和 [OFL 全文](https://openfontlicense.org/open-font-license-official-text/)
- 狀態：授權類型 **已確認**（依各字型上游標示）；但除了芫荽，其他六個字型的上游授權檔還沒存進專案，各字型原本的版權行也還沒逐一附上 → **待開發者確認／待補**
- 「跟著手機」字型模式用的是手機系統字型，不隨 App 散布

## 四、圖片（AI 輔助）

- 來源：人物、場景、地圖、圖示、棋子、封面、古戰場插圖等，用 Google Gemini 的圖像模型生成（專案腳本裡出現過的模型：gemini-3-pro-image、gemini-3.1-flash-image、gemini-2.5-flash-image 等），開發者挑選、修圖、裁切後使用。部分圖可能用 OpenAI 的圖像模型生成
- 授權：Gemini API 條款（2026 年 3 月 23 日生效版）寫「Google 不主張生成內容的所有權」，使用責任在使用者。[Gemini API 條款](https://aistudio.google.com/docs/terms)
- 怎麼用：轉成 webp 放進 App
- 能不能散布：條款沒有禁止；但 AI 生成圖能不能主張著作權，各國法律不同
- 狀態：**待開發者確認**——①哪些圖是用 OpenAI 生成的；②有沒有圖是用 Gemini App（消費者版）而不是 API 做的（條款不同）；③preview 版模型的條款
- 史實場景的圖片經過開發者的考究檢查，但仍是想像繪製，不是歷史照片或文物

## 五、3D 模型

- 來源：用 Tripo 把立繪轉成 3D（`tripo_app`、`tripo_anim`），再瘦身放進 App
- 授權：**看用的是哪個方案。** Tripo 自己的說明頁說：免費方案的生成結果，權利歸 Tripo、不能商用；付費方案的使用者擁有生成結果、可以商用。也有 Tripo 文章說免費方案的公開模型是 CC BY 4.0（要署名）。說法不一致，要以當時的服務條款為準。[Tripo 說明頁（商用）](https://www.tripo3d.ai/help/privacy-policy/can-i-use-models-commercially)（本次直接讀取被網站擋下，上面是搜尋結果摘要，服務條款原文未核對）
- 怎麼用：放進園子、星槎甲板等 3D 場景
- 能不能散布：付費方案可以；免費方案可能不行
- 狀態：**待開發者確認**——用的是哪個方案、當時的條款版本。輸入圖是 Gemini 生成的，第四項的疑問也適用

## 六、背景音樂

- 來源：13 個朝代、共 91 首，開發者用 Gemini API 的音樂模型 Lyria 3.5 生成（`tools/bgm_gen.py`），曲名是開發者取的。是 AI 製作的音樂，不是真人演奏
- 授權：同第四項，Gemini API 條款寫 Google 不主張生成內容的所有權；Lyria 有沒有額外的使用規範，本次沒有查到
- 怎麼用：在 App 裡依朝代播放
- 能不能散布：條款沒有禁止
- 狀態：**待開發者確認**——Lyria 專屬條款；有沒有曲子是用 Gemini App（消費者版）做的；有沒有和既有曲目太像（沒做過相似度檢查）
- 樂器名稱（例如元朝的「馬頭琴」）只是配樂的風格，不代表那個朝代真的有這個樂器，見〈文史考據〉

## 七、走棋音效

- 來源：`data/sfx/` 共 60 檔（20 種音色 × 走子、吃子、變化），**來源沒有記錄**；專案裡找不到錄音或合成的腳本
- 授權：不明
- 怎麼用：選了才下載
- 能不能散布：不明
- 狀態：**待開發者確認**——若是自己錄的或程式合成的，寫明並保留原始檔即可；若是下載的素材，要找回授權；查不到就換掉。App 另有程式即時合成的走棋聲，不受影響

## 八、語音

- 來源：`data/voice/` 共 12 檔（男聲、女聲 × 「吃」「將軍」× 慢中快三種速度），用 Windows 內建語音合成（志偉、雅婷）錄成音檔；檔案還沒下載好時，改用手機內建的語音朗讀
- 授權：微軟對「Windows 內建語音的輸出能不能再散布」的規定，本次未查證
- 能不能散布：不確定
- 狀態：**待開發者確認**（專案裡沒有找到產生語音的腳本，也還沒查微軟條款）。手機內建語音是即時朗讀，不隨 App 散布

## 九、棋譜資料

- 來源：明清古譜（《適情雅趣》《橘中秘》《梅花譜》、古典開局譜、古典殘局排局譜）、許銀川對局、1976 年起特級大師對局、1956～2019 年比賽對局，數位資料都來自 GitHub 社群資料庫 [chasoft/community-xiangqi-games-database](https://github.com/chasoft/community-xiangqi-games-database)（2026 年 10 月 29 日下載）
- 授權：該倉庫**沒有 LICENSE 檔**，README 只寫歡迎大家貢獻、fork；2026 年 7 月已被擁有者封存（唯讀）。明清古書本身早已不受著作權保護；棋局著法是事實；但數位整理和資料庫的選編方式，授權不明
- 怎麼用：只收著法和對局資訊；局名有「評」字的現代講評都排除，不收
- 能不能散布：不明
- 狀態：**待開發者確認**——建議在該倉庫開 issue 詢問並存下回覆，或改用授權清楚的來源。風險較高的是現代比賽資料（`gmgames.json`、`tour-*.json`）

## 十、題庫

- 古譜殘局題、測驗題：題目取自上面的古譜，答案由 Pikafish 計算；新手題是程式擺出的基本題；悶宮專題、大師對局題是程式從終局倒推或從大師對局挑出，都經過 Pikafish 驗證
- 「妙棋精選」：程式從大師對局裡挑出、再用引擎驗證
- 測驗講解、故事題：開發者構思，AI（Claude、Gemini、ChatGPT）協助撰寫，開發者審過
- 授權：自有（© 陳泓昇）；底下用到的棋局資料見第九項
- 狀態：自有部分 **已確認**；所依據的棋譜資料 **待開發者確認**（同第九項）

## 十一、文字資料

### 殺法、術語

- 來源：殺法名稱參考 [Wikibooks「中國象棋／基本殺法列表」](https://zh.wikibooks.org/wiki/中国象棋/基本杀法列表)
- 授權：CC BY-SA 4.0（該頁頁尾標示）
- 怎麼用：只參考名稱；說明文字是自己寫的，例局是程式照說明擺出、再用規則程式驗證，不是棋書的棋譜。`terms.json` 有寫明來源
- 狀態：**已確認**

### 特級大師小傳（`gmbios.json`，72 位）

- 來源：每位都附了來源網址：中文維基百科（78 筆）、廣東象棋網 gdchess.com（21 筆）、互動百科（18 筆）、新華網、澎湃新聞等
- 授權：維基百科是 CC BY-SA；其他網站各有著作權。小傳是根據這些資料改寫的，不是原文照抄
- 狀態：**待開發者確認**——改寫的程度夠不夠、要不要在畫面上標出處（目前來源只存在資料檔裡）

### 故事、角色、對白、棋史說明

- 來源：開發者構思，AI（Claude、Gemini、ChatGPT）協助撰寫，開發者審過。故事裡有歷史人物和朝代背景，但情節是虛構創作。哪些是史實、哪些是傳說或創作，見〈文史考據〉
- 授權：© 陳泓昇
- 狀態：自有 **已確認**；AI 協助部分的著作權說法，和各 AI 平臺條款的關係 **待開發者確認**

### 問小帥用到的外部資料

- 百科摘要：中文維基百科（CC BY-SA 4.0），畫面會標「資料來源：維基百科」並附原文連結。**已確認**
- 天氣：Open-Meteo。資料是 CC BY 4.0，要標出處；免費的 API 只限非商業使用。畫面會標「資料來源：Open-Meteo」。[Open-Meteo 條款](https://open-meteo.com/en/terms)。在 App 維持非商業的前提下 **已確認**

## 十二、網站與服務（不是素材）

- 網站：GitHub Pages。圖片和大檔：Cloudflare Pages。線上大廳：EMQX 雲端服務。意見回饋：Google 表單。這些是服務供應商，不是 App 的素材，資料處理見〈隱私與資料使用〉。

## 仍待開發者確認的事（依重要程度）

1. `pikafish.nnue` 的書面許可（或換權重）。
2. Tripo 用的方案與條款。
3. 走棋音效 60 檔的來源。
4. chasoft 棋譜資料庫的授權。
5. Windows 語音輸出能不能散布。
6. Gemini 圖片與 Lyria 音樂：哪些是 API、哪些是消費者版；Lyria 專屬條款；哪些圖是 OpenAI 生成的。
7. Pikafish 的完整對應原始碼包與編譯紀錄。
8. 第三方聲明：MIT、Apache-2.0、OFL 全文與各字型版權行；`qrcode.min.js` 的上游比對；OpenCC 字典的 Apache-2.0 聲明。
9. 大師小傳要不要在畫面上標出處。
