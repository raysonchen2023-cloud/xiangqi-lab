# 素材與授權

最後核對：2026 年 11 月 11 日。

《象棋千秋》是推廣中國象棋的免費、非商業學習計畫：不收費、沒有內購、沒有廣告。原創的程式、畫面、美術和文字 © 2026 陳泓昇。下面列出的別人做的東西，照它們各自的授權使用，不在上面的權利範圍內。

## 象棋引擎

- **Pikafish**（版本 Pikafish-2026-09-06）：電腦下棋和複盤分析用，編成 WebAssembly 在手機裡跑。授權 GNU GPL 第 3 版。我們只改了 uci.cpp（讓網頁能送指令），改過的檔案和建置腳本公開在 [pikafish-src](https://github.com/raysonchen2023-cloud/xiangqi-lab/tree/main/pikafish-src)；原版原始碼：[official-pikafish/Pikafish](https://github.com/official-pikafish/Pikafish)。
- **神經網路權重 pikafish.nnue**：照 Pikafish 的 [NNUE 授權](https://github.com/raysonchen2023-cloud/xiangqi-lab/blob/main/NNUE-License.md)，只能合法使用、未經許可不得商用。《象棋千秋》不收費、不做商業用途，在這個條件下使用；要商用必須先取得 Pikafish 團隊許可，或換成其他權重。

## 美術（AI 輔助）

- 人物、場景、地圖、圖示、棋子等圖片：由 Google Gemini 的圖像模型生成，開發者挑選、修圖、裁切後使用。部分介面圖可能用 OpenAI（ChatGPT）圖像模型生成（哪些圖：待開發者確認）。
- 3D 人物和棋子模型：用 Tripo 把上面的立繪轉成 3D，再瘦身後放進 App（使用的方案與條款：待開發者確認）。
- 史實場景的圖片經過開發者的考究檢查，但仍是想像繪製，不是歷史照片或文物。

## 字型

朝代字型都只取 App 用到的字，並照規定改了字型內部名稱。授權都是 SIL Open Font License 1.1：可以嵌入、修改、再散布，但不得單獨販售字型本身。

- 芫荽（ButTaiwan，改自 Fontworks Klee One）
- 全字庫正楷體（國家發展委員會；本 App 採 OFL 1.1）
- 霞鶩文楷 TC（LXGW）
- 源流明體（ButTaiwan，改自思源宋體）
- 朱雀仿宋（TrionesType）
- 仙人掌明體（MoonlitOwen）
- 源雲明體（ButTaiwan，改自思源宋體）

各字型的來源網址見 App 裡的字型清單（data/fonts/LICENSES.md）。「跟著手機」字型用的是手機系統字型，不隨 App 散布。

## 聲音

- 背景音樂（13 個朝代，共 91 首）：開發者用 Google Gemini API 的音樂模型 Lyria 3.5 生成，曲名由開發者命名。是 AI 製作的音樂，不是真人演奏。
- 走棋音效（20 種，各有走子、吃子、變化三個檔）：來源待開發者確認。
- 語音報棋（男聲、女聲，慢中快三種速度）：用 Windows 內建語音合成（志偉、雅婷）錄成音檔；檔案還沒下載好時，改用手機內建的語音（Windows 語音的散布條件：待開發者確認）。

## 棋譜與題庫

- 明清古譜：《適情雅趣》《橘中秘》《梅花譜》，以及古典開局譜、古典殘局譜。原書早已不受著作權保護。
- 許銀川對局、特級大師對局、1956～2019 年比賽對局：只收著法和對局資訊，不收現代人寫的講評。
- 以上數位化資料來自 GitHub 上的社群資料庫 chasoft/community-xiangqi-games-database（上游沒有附授權聲明：待開發者確認）。
- 「妙棋精選」是程式從上面的對局裡挑出來、再用引擎驗證的。
- 棋手生平簡介：資料來源待開發者確認。
- 殺法名稱參考 Wikibooks「中國象棋／基本殺法列表」（CC BY-SA 4.0）；說明文字是自己寫的，例局是程式照說明擺出來、再用規則程式驗證的，不是棋書的棋譜。
- 測驗題、講解和故事：由開發者構思，AI（Claude、Gemini、ChatGPT）協助撰寫，開發者審過。故事裡有歷史人物和朝代背景，但情節是虛構創作。

## 問小帥用到的外部資料

- 天氣：Open-Meteo，畫面會標「資料來源：Open-Meteo」。
- 百科摘要：中文維基百科（CC BY-SA），畫面會標「資料來源：維基百科」並附原文連結。

## 其他開源元件

- three.js（3D 園子、立體棋子）：MIT
- opencc-js（繁簡轉換）：MIT
- jsQR（換手機時掃 QR 碼）：Apache-2.0
- QRCode.js（產生 QR 碼）：MIT

## 網站與下載

- 網站：GitHub Pages。圖片和大檔：Cloudflare Pages。線上大廳：EMQX 雲端服務。意見回饋：Google 表單。這些是服務供應商，不是 App 的素材。
