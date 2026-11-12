# 象棋千秋（離線版）

手機也能離線使用的中國象棋 App：挑戰 Pikafish（八個難度）、雙人對戰、明清古譜研究與 Pikafish 分析。
網址：https://raysonchen2023-cloud.github.io/xiangqi-lab/

## 著作權與授權
© 2026 陳泓昇（Chen Hung-Sheng）

- **程式碼**：GNU 通用公共授權第 3 版，或（由你選擇）任何更新的版本（SPDX：`GPL-3.0-or-later`），全文見 [LICENSE](LICENSE)。網頁、`.js` 程式檔、建置與測試工具都算，**寫在程式檔裡的介面文字、場景小故事和對白也跟著程式是 GPL**。可讀的原始碼、組裝方法和測試在 [source/](source/README.md)；`node source/check-build.js` 可以核對這裡的 `index.html` 就是那份原始碼組出來的。
- **開發者自製的素材**：`data/` 底下的圖片（含 AI 協助生成的）、3D 模型、背景音樂、音效、長篇劇情與題目講解等資料檔、說明文件，依創用 CC 姓名標示─非商業性─相同方式分享 4.0 國際（CC BY-NC-SA 4.0）授權，見 [LICENSE-ASSETS.md](LICENSE-ASSETS.md)。
- **不在上面兩種授權裡的**：特級大師小傳 `data/gmbios.json`（改寫自維基百科等，照原來源的條件）、語音檔 `data/voice/`、棋譜資料，以及第三方元件：Pikafish 引擎（GPL-3.0）、神經網路權重 `pikafish.nnue`（不得商用）、three.js、OpenCC、jsQR、QRCode.js、字型等，照各自授權，清單見 [NOTICE.md](NOTICE.md)，授權全文在 [licenses/](licenses/README.md)。

簡單說：程式可以自由使用、修改、再散布（也可以商用），條件是散布時同樣用 GPL、附上原始碼；圖、音樂、劇情可以分享和改作，但要標示出處、不能商用、改作要用同樣的授權。

這個倉庫只收問題回報（Issues），不收 Pull Request，見 [CONTRIBUTING.md](CONTRIBUTING.md)。

Code: GPL-3.0-or-later, including UI text, vignettes and dialogue written in the code files. Original assets under `data/` (images, 3D models, music, long-form story and other data texts, docs): CC BY-NC-SA 4.0. `data/gmbios.json`, `data/voice/`, game records and third-party components keep their own terms (see NOTICE.md). Issues are welcome; pull requests are not accepted.

## 內容與授權
- **Pikafish 引擎**：GPL-3.0（見 LICENSE-Pikafish-GPL3.txt）。原始碼：https://github.com/official-pikafish/Pikafish 標籤 `Pikafish-2026-09-06`。
  網頁版只改了 `src/uci.cpp`（讓網頁可以送指令，改過的完整檔案在 pikafish-src/），編譯指令在 pikafish-src/build-wsl.sh。
- **神經網路 pikafish.nnue**：Pikafish 團隊提供，限合法、非商業使用（見 NNUE-License.md）。
- **棋譜**：適情雅趣、橘中秘、梅花譜，以及古典開局譜、殘局譜，均為明清古譜。
  數位化資料來自 chasoft/community-xiangqi-games-database。
