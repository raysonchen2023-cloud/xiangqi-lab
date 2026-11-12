# 素材與授權

最後核對：2026 年 11 月 11 日；授權段 11 月 13 日定稿（程式 GPL-3.0-or-later、素材 CC BY-NC-SA 4.0）。

《象棋千秋》是推廣中國象棋的免費、非商業學習計畫：不收費、沒有內購、沒有廣告。

## 本 App 自己的授權（2026 年 11 月 13 日起）

© 2026 陳泓昇（Chen Hung-Sheng）。

- **程式碼**（App 的 HTML、CSS、JavaScript，`core.js`、`local.js`、`net.js` 等，以及建置與測試工具）：依 **GNU 通用公共授權第 3 版，或（由你選擇）任何更新的版本**（SPDX：`GPL-3.0-or-later`）授權。可以自由使用、研究、修改、再散布（包括商業用途），條件是散布時同樣用 GPL、附上原始碼和授權全文。全文在倉庫根目錄 [LICENSE](https://github.com/raysonchen2023-cloud/xiangqi-lab/blob/main/LICENSE)，可讀的原始碼在 [source/](https://github.com/raysonchen2023-cloud/xiangqi-lab/tree/main/source)。
- **開發者自製的素材**（放在 `data/` 底下的美術、AI 協助生成的圖片、Tripo 3D 模型、背景音樂、程式合成的音效，以及長篇劇情、角色對白、題目講解、棋史說明等資料檔裡的文字）：依 **創用 CC 姓名標示─非商業性─相同方式分享 4.0 國際（CC BY-NC-SA 4.0）** 授權。可以分享和改作，但要標示「《象棋千秋》陳泓昇」、不得作商業用途、改作要用同樣的授權。條文：[creativecommons.org/licenses/by-nc-sa/4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)；哪些檔案算素材見倉庫根目錄 [LICENSE-ASSETS.md](https://github.com/raysonchen2023-cloud/xiangqi-lab/blob/main/LICENSE-ASSETS.md)。
- **分界（看檔案放在哪裡）**：寫在程式檔（`.js`、`.css`、`.html`）裡的文字，包括介面文字、場景小故事和角色對白，跟著程式，是 GPL-3.0-or-later；放在 `data/` 底下的圖片、音訊、3D 模型和長篇劇情、題目等資料檔，是 CC BY-NC-SA 4.0。同一段對白寫在程式裡就是 GPL，放在劇情資料檔裡就是 CC BY-NC-SA。
- **兩種都不是的**：特級大師小傳 `data/gmbios.json`（改寫自維基百科等，見第十一項）和語音 12 檔 `data/voice/`（見第八項），照原來源的條件，不以上面兩種授權。
- **第三方的東西**：下面列出的別人做的元件和資料，照它們各自的授權使用，不適用上面兩種授權。總表見倉庫根目錄 [NOTICE.md](https://github.com/raysonchen2023-cloud/xiangqi-lab/blob/main/NOTICE.md)。

## 怎麼讀這一頁

每一項都寫五件事：**來源**、**授權**、**怎麼用**、**能不能隨 App 散布**、**狀態**。

- **已確認**：授權條文找得到（檔案裡或上游公開網頁），我們做得到它的條件。
- **待開發者確認**：來源或授權還不清楚，或是條件裡有一件事還沒做（例如還沒附上授權全文、還沒拿到書面許可）。

這一頁是整理，不是法律意見。上架前的完整盤點另見專案內的授權台帳。

AI 生成素材（Gemini、OpenAI 圖片，Lyria 音樂，Tripo 3D 模型，AI 協助的文字）各家條款的重點與本 App 的遵守方式，見〈AI 素材的使用條款〉（[ai-assets.md](ai-assets.md)）。

## 一、程式庫

### three.js（3D 園子、立體棋子）

- 來源：three.js r149（`three.min.js`、`GLTFLoader.mjs`、`BufferGeometryUtils.mjs`）
- 授權：MIT（檔頭寫著「Copyright 2010-2023 Three.js Authors / SPDX-License-Identifier: MIT」）
- 怎麼用：原檔照用，沒有修改
- 能不能散布：可以，要保留版權聲明和 MIT 全文
- 狀態：**已確認**；MIT 全文 11/12 已附上：[three.js-MIT.txt](https://raysonchen2023-cloud.github.io/xiangqi-lab/licenses/three.js-MIT.txt)

### opencc-js（繁簡轉換）

- 來源：[nk2028/opencc-js](https://github.com/nk2028/opencc-js)（`opencc-cn2t.js`、`opencc-t2cn.js`）
- 授權：程式是 MIT（全文在 `LICENSE-opencc-js.txt`）。裡面的轉換字典是從 OpenCC 的資料產生的，[OpenCC](https://github.com/BYVoid/OpenCC) 是 Apache-2.0
- 怎麼用：原檔照用
- 能不能散布：可以，要附 MIT 全文；字典部分建議另附 OpenCC 的 Apache-2.0 聲明
- 狀態：程式 **已確認**；字典的 Apache-2.0 全文 11/12 已附上（從 OpenCC 上游下載）：[OpenCC-dictionary-Apache-2.0.txt](https://raysonchen2023-cloud.github.io/xiangqi-lab/licenses/OpenCC-dictionary-Apache-2.0.txt)

### jsQR（換手機時掃 QR 碼）

- 來源：jsQR 1.4.0（jsDelivr 壓縮版，檔頭寫「Original file: /npm/jsqr@1.4.0/dist/jsQR.js」），上游 [cozmo/jsQR](https://github.com/cozmo/jsQR)
- 授權：Apache-2.0（上游 GitHub 頁標示）
- 怎麼用：原檔照用
- 能不能散布：可以，要附 Apache-2.0 全文和版權聲明
- 狀態：授權 **已確認**；Apache-2.0 全文 11/12 已附上：[jsQR-Apache-2.0.txt](https://raysonchen2023-cloud.github.io/xiangqi-lab/licenses/jsQR-Apache-2.0.txt)

### QRCode.js（產生 QR 碼）

- 來源：`qrcode.min.js` 檔頭沒寫作者。從程式開頭的寫法看，是 [davidshimjs/qrcodejs](https://github.com/davidshimjs/qrcodejs) 的壓縮版
- 授權：該專案是 MIT
- 怎麼用：原檔照用
- 能不能散布：若確定是這個專案，可以，要附 MIT 聲明
- 狀態：**已確認**（11/12 跟上游 davidshimjs/qrcodejs master 的 `qrcode.min.js` 比對，SHA-1 完全相同 2d06c1f823f3…）；MIT 全文（上游原檔，Copyright (c) 2012 davidshimjs）11/12 已附上：[qrcodejs-MIT.txt](https://raysonchen2023-cloud.github.io/xiangqi-lab/licenses/qrcodejs-MIT.txt)

### 自己寫的程式

- `three-shim.mjs`、`core.js`（規則核心）、`local.js`、`net.js` 等：© 陳泓昇，AI（Claude、ChatGPT Codex）協助撰寫
- 授權：GPL-3.0-or-later（11/13 起；第 3 版或更新版），原始碼在倉庫的 `source/`
- 狀態：**已確認**為自有

## 二、象棋引擎與神經網路權重

### Pikafish 引擎（`engine/pikafish.wasm`、`pikafish.js`）

- 來源：[official-pikafish/Pikafish](https://github.com/official-pikafish/Pikafish)，版本標籤 Pikafish-2026-09-06
- 授權：GNU GPL 第 3 版（全文 [LICENSE-Pikafish-GPL3.txt](https://raysonchen2023-cloud.github.io/xiangqi-lab/LICENSE-Pikafish-GPL3.txt)）
- 怎麼用：編成 WebAssembly 在手機裡跑，負責電腦下棋和複盤分析。只改了 `uci.cpp`（讓網頁能送指令），改過的檔案和建置腳本公開在 [pikafish-src](https://github.com/raysonchen2023-cloud/xiangqi-lab/tree/main/pikafish-src)
- 能不能散布：可以，但要提供對應原始碼
- 狀態：授權 **已確認**；「完整對應原始碼包」和「執行檔確實由這份原始碼編出」的證據 **待開發者確認**

### 神經網路權重 `pikafish.nnue`

- 來源：Pikafish 官方
- 授權：Pikafish 的 NNUE 授權（全文 [NNUE-License.md](https://raysonchen2023-cloud.github.io/xiangqi-lab/NNUE-License.md)，和官方 [Networks README](https://github.com/official-pikafish/Networks/blob/master/README.md) 一致）：只能合法使用；**未經許可不得商用**；官網名單上的單位可以商用
- 怎麼用：引擎啟動時載入，評估局面
- 能不能散布：《象棋千秋》不收費、不做商業用途，在這個條件下隨 App 一起提供。要商用必須先取得 Pikafish 團隊許可，或換成其他權重
- 狀態：**待開發者確認**——目前沒有書面許可；「免費上架算不算商用」條文沒有說清楚。另外，官方 README 說 Fairy-Stockfish 象棋版權重是 CC0，但那**不是**我們用的檔案
- 11/12 開發者回覆：**沒有寫信問過、沒有書面許可**。在不收費、不商用的條件下照授權使用；要上架收費或商用之前，必須先取得許可或換權重

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
- 狀態：授權類型 **已確認**（依各字型上游標示）；11/12 七個字型的授權全文（含各自原本的版權行）都從上游下載附上，總表在 [licenses/](https://raysonchen2023-cloud.github.io/xiangqi-lab/licenses/README.md)
- 「跟著手機」字型模式用的是手機系統字型，不隨 App 散布

## 四、圖片（AI 輔助）

- 來源：人物、場景、地圖、圖示、棋子、封面、古戰場插圖等，用 Google Gemini 的圖像模型生成（專案腳本裡出現過的模型：gemini-3-pro-image、gemini-3.1-flash-image、gemini-2.5-flash-image 等），開發者挑選、修圖、裁切後使用。部分圖可能用 OpenAI 的圖像模型生成
- 授權：Gemini API 條款（2026 年 3 月 23 日生效版）寫「Google 不主張生成內容的所有權」，使用責任在使用者。[Gemini API 條款](https://aistudio.google.com/docs/terms)。開發者對這些圖（含挑選、修圖、裁切）能主張的權利，11/13 起以 CC BY-NC-SA 4.0 授權
- 怎麼用：轉成 webp 放進 App
- 能不能散布：條款沒有禁止；但 AI 生成圖能不能主張著作權，各國法律不同
- 狀態：**待開發者確認**——①哪些圖是用 OpenAI 生成的；②有沒有圖是用 Gemini App（消費者版）而不是 API 做的（條款不同）；③preview 版模型的條款
- 11/12 開發者回覆：**有些圖是在 Gemini App／ChatGPT App 直接聊天做的**（不是全部經由 API）。哪幾張還沒列出來；要逐張補來源（API 或 App、哪一個）。兩家的消費者版條款都寫生成內容歸使用者或不主張所有權，風險不高，但要記清楚來源
- 史實場景的圖片經過開發者的考究檢查，但仍是想像繪製，不是歷史照片或文物

## 五、3D 模型

- 來源：用 Tripo 把立繪轉成 3D（`tripo_app`、`tripo_anim`），再瘦身放進 App
- 授權：**付費使用者的產出，權利歸開發者。** 依 [Tripo 使用者協議](https://www.tripo3d.ai/terms)（2025 年 7 月 11 日版）第 5.2.2 條，付費使用者擁有輸入和輸出的全部權利（包括使用、修改、散布、授權、營利）；第 5.2.1 條的免費使用者，產出權利才歸 Tripo。
- 怎麼確認的（2026 年 11 月 12 日晚上，開發者登入 Tripo 開發者平台帳單頁，Claude 核對）：
  - 全部 3D 模型都是用 Tripo **API** 生成（`tools/tripo_gen.py`），不是網頁版。
  - 開發者的 API 帳戶從 **2026 年 11 月 4 日**起用 Stripe 付費儲值，共 8 次、13,000 點（帳單頁有交易紀錄，可下載發票）。
  - 本機最早的模型檔生成於 11 月 4 日 16:48（臺灣時間，是後來淘汰的試做品），在第一筆付款之後；App 裡上線的 129 個模型，最早是 11 月 5 日 16:38。所以**沒有模型是用免費點數做的**。
- **更正**：11/12 下午這裡寫「開發者回覆：用的是免費方案」，是把 Tripo 網頁版的會員方案跟 API 帳戶弄混了；API 帳戶一直是付費儲值，已更正。
- 怎麼用：放進園子、星槎甲板、黑洞棋盤等 3D 場景
- 能不能散布：可以。條款限制：不能拿輸出去做和 Tripo 競爭的 3D 生成服務；Tripo 可以為了提供服務而使用、展示這些內容。仍在這頁署名「3D 模型由 Tripo AI 生成」。11/13 起開發者以 CC BY-NC-SA 4.0 授權給大家
- 狀態：**已確認**。付款紀錄與發票由開發者保存，當作權利證明。輸入圖是 Gemini 生成的，第四項的說明也適用

## 六、背景音樂

- 來源：13 個朝代、共 91 首，開發者用 Gemini API 的音樂模型 Lyria 3.5 生成（`tools/bgm_gen.py`），曲名是開發者取的。是 AI 製作的音樂，不是真人演奏
- 授權：同第四項，Gemini API 條款寫 Google 不主張生成內容的所有權；Lyria 有沒有額外的使用規範，本次沒有查到。開發者能主張的部分 11/13 起以 CC BY-NC-SA 4.0 授權
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
- 11/12 開發者回覆：落子的「啪」聲是**程式合成**的。`data/sfx/` 這 60 檔若也是程式合成，要補上產生方式（專案裡目前找不到產生腳本）；補不出來就改用程式即時合成的聲音
- 11/12 查對話紀錄**已確認**：60 檔全是**程式合成**，沒有錄音、沒有下載素材。11/2 開發者貼來的 Python 合成腳本（意見回饋 196、197，Gemini 寫的）由 Claude 執行產生：s01–s10 用 `gen_sfx.py`、另外兩批用 `gen_sfx2.py`／`gen_sfx3.py`（濾波器＋衰減正弦波＋雜訊，純數學合成）。腳本已存進 `xiangqi-db/tools/audio_src/`，可以重新產生
- 結論：**可以散布**，自己的作品；狀態改為已確認。11/13 起 CC BY-NC-SA 4.0

## 八、語音

- 來源：`data/voice/` 共 12 檔（男聲、女聲 × 「吃」「將軍」× 慢中快三種速度），用 Windows 內建語音合成（志偉、雅婷）錄成音檔；檔案還沒下載好時，改用手機內建的語音朗讀
- 授權：微軟對「Windows 內建語音的輸出能不能再散布」的規定，本次未查證。這 12 檔**不以**本 App 的 GPL 或 CC BY-NC-SA 授權
- 能不能散布：不確定
- 狀態：**待開發者確認**（專案裡沒有找到產生語音的腳本，也還沒查微軟條款）。手機內建語音是即時朗讀，不隨 App 散布
- 11/12 開發者回覆：**不記得**怎麼做的；這份台帳先前的紀錄是 Windows 內建語音（志偉、雅婷）。微軟對內建語音輸出再散布的規定未查證；最穩的做法是拿掉這 12 個檔、全部改用手機內建語音即時朗讀（App 原本就有這個備案）
- 11/12 查對話紀錄**已確認**做法：11/2（意見回饋 155，iPhone 內建中文語音只有女聲）Claude 在這台電腦用 Windows 內建語音合成（Windows.Media.SpeechSynthesis）把「吃！」「將軍！」唸成音檔：男聲 Microsoft Zhiwei、女聲 Microsoft Yating，SSML 速度 +5%／+25%／+50%、音高男 −8%／女 +5%，再修剪靜音、壓縮音量。腳本已存進 `xiangqi-db/tools/audio_src/make_voice.ps1`、`trim_voice.sh`
- 微軟條款：查不到微軟對「Windows 內建語音輸出再散布」的正式條文；微軟問答區的社群回覆說散布音檔要另外取得商用授權（非官方）。微軟正式允許散布輸出的是付費的 Azure 語音服務。→ 判斷：**灰色、偏不允許**。免費不商用風險低；要上架收費前，改用手機內建語音即時朗讀，或用 Azure 付費方案重做
- 11/12 開發者決定：**先保留**這 12 個檔，之後再決定

## 九、棋譜資料

- 來源：明清古譜（《適情雅趣》《橘中秘》《梅花譜》、古典開局譜、古典殘局排局譜）、許銀川對局、1976 年起特級大師對局、1956～2019 年比賽對局，數位資料都來自 GitHub 社群資料庫 [chasoft/community-xiangqi-games-database](https://github.com/chasoft/community-xiangqi-games-database)（2026 年 10 月 29 日下載）
- 授權：該倉庫**沒有 LICENSE 檔**，README 只寫歡迎大家貢獻、fork；2026 年 7 月已被擁有者封存（唯讀）。明清古書本身早已不受著作權保護；棋局著法是事實；但數位整理和資料庫的選編方式，授權不明
- 怎麼用：只收著法和對局資訊；局名有「評」字的現代講評都排除，不收
- 能不能散布：不明
- 狀態：**待開發者確認**——建議在該倉庫開 issue 詢問並存下回覆，或改用授權清楚的來源。風險較高的是現代比賽資料（`gmgames.json`、`tour-*.json`）
- 11/12：英文詢問 issue 已寫好（story/107_chasoft棋譜授權詢問_issue.md），等開發者貼到倉庫、收到回覆後更新

## 十、題庫

- 古譜殘局題、測驗題：題目取自上面的古譜，答案由 Pikafish 計算；新手題是程式擺出的基本題；悶宮專題、大師對局題是程式從終局倒推或從大師對局挑出，都經過 Pikafish 驗證
- 「妙棋精選」：程式從大師對局裡挑出、再用引擎驗證
- 測驗講解、故事題：開發者構思，AI（Claude、Gemini、ChatGPT）協助撰寫，開發者審過
- 授權：自有（© 陳泓昇），講解和故事題文字 11/13 起 CC BY-NC-SA 4.0；底下用到的棋局資料見第九項（不在這個授權範圍內）
- 狀態：自有部分 **已確認**；所依據的棋譜資料 **待開發者確認**（同第九項）

## 十一、文字資料

### 殺法、術語

- 來源：殺法名稱參考 [Wikibooks「中國象棋／基本殺法列表」](https://zh.wikibooks.org/wiki/中国象棋/基本杀法列表)
- 授權：CC BY-SA 4.0（該頁頁尾標示）
- 怎麼用：只參考名稱；說明文字是自己寫的，例局是程式照說明擺出、再用規則程式驗證，不是棋書的棋譜。`terms.json` 有寫明來源
- 狀態：**已確認**

### 特級大師小傳（`gmbios.json`，72 位）

- 來源：每位都附了來源網址：中文維基百科（78 筆）、廣東象棋網 gdchess.com（21 筆）、互動百科（18 筆）、新華網、澎湃新聞等
- 授權：維基百科是 CC BY-SA；其他網站各有著作權。小傳是根據這些資料改寫的，不是原文照抄。這份檔**不以**本 App 的 GPL 或 CC BY-NC-SA 授權，照原來源的條件
- 狀態：**待開發者確認**——改寫的程度夠不夠、要不要在畫面上標出處（目前來源只存在資料檔裡）

### 故事、角色、對白、棋史說明

- 來源：開發者構思，AI（Claude、Gemini、ChatGPT）協助撰寫，開發者審過。故事裡有歷史人物和朝代背景，但情節是虛構創作。哪些是史實、哪些是傳說或創作，見〈文史考據〉
- 授權：© 陳泓昇，11/13 起資料檔裡的 CC BY-NC-SA 4.0（寫在程式檔裡的介面文字、場景小故事和對白是 GPL-3.0-or-later，見本頁開頭〈分界〉）
- 狀態：自有 **已確認**；AI 協助部分的著作權說法，和各 AI 平臺條款的關係 **待開發者確認**

### 問小帥用到的外部資料

- 百科摘要：中文維基百科（CC BY-SA 4.0），畫面會標「資料來源：維基百科」並附原文連結。**已確認**
- 天氣：Open-Meteo。資料是 CC BY 4.0，要標出處；免費的 API 只限非商業使用。畫面會標「資料來源：Open-Meteo」。[Open-Meteo 條款](https://open-meteo.com/en/terms)。在 App 維持非商業的前提下 **已確認**

## 十二、網站與服務（不是素材）

- 網站：GitHub Pages。圖片和大檔：Cloudflare Pages。線上大廳：EMQX 雲端服務。意見回饋：Google 表單。這些是服務供應商，不是 App 的素材，資料處理見〈隱私與資料使用〉。

## 授權全文與參與方式

- 本 App 程式碼：GPL-3.0-or-later，全文 [LICENSE](https://github.com/raysonchen2023-cloud/xiangqi-lab/blob/main/LICENSE)；原始碼與組裝、測試方法 [source/](https://github.com/raysonchen2023-cloud/xiangqi-lab/tree/main/source)
- 本 App 自製素材：CC BY-NC-SA 4.0，說明 [LICENSE-ASSETS.md](https://github.com/raysonchen2023-cloud/xiangqi-lab/blob/main/LICENSE-ASSETS.md)
- 第三方清單：[NOTICE.md](https://github.com/raysonchen2023-cloud/xiangqi-lab/blob/main/NOTICE.md)
- 第三方程式庫、引擎、字型的授權全文：[licenses/](https://raysonchen2023-cloud.github.io/xiangqi-lab/licenses/README.md)
- 想回報錯誤或勘誤：[參與《象棋千秋》](https://github.com/raysonchen2023-cloud/xiangqi-lab/blob/main/CONTRIBUTING.md)（公開倉庫只收問題回報 Issue，不收 Pull Request；程式可以依 GPL 自己 fork 修改）

## 仍待開發者確認的事（依重要程度）

1. `pikafish.nnue` 的書面許可（或換權重）。
2. Tripo 用的方案與條款。
3. ~~走棋音效 60 檔的來源~~（11/12 已確認：程式合成）。
4. chasoft 棋譜資料庫的授權。
5. Windows 語音輸出能不能散布。
6. Gemini 圖片與 Lyria 音樂：哪些是 API、哪些是消費者版；Lyria 專屬條款；哪些圖是 OpenAI 生成的。
7. Pikafish 的完整對應原始碼包與編譯紀錄。
8. ~~第三方聲明：MIT、Apache-2.0、OFL 全文與各字型版權行；`qrcode.min.js` 的上游比對；OpenCC 字典的 Apache-2.0 聲明~~（11/12 都已附上、比對完成，見 licenses/）。
9. 大師小傳要不要在畫面上標出處。
