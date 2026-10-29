# 象棋研究室（離線版）

手機也能離線使用的中國象棋 App：挑戰 Pikafish（八個難度）、雙人對戰、明清古譜研究與 Pikafish 分析。
網址：https://raysonchen2023-cloud.github.io/xiangqi-lab/

## 內容與授權
- **Pikafish 引擎**：GPL-3.0（見 LICENSE-Pikafish-GPL3.txt）。原始碼：https://github.com/official-pikafish/Pikafish 標籤 `Pikafish-2026-09-06`。
  網頁版只改了 `src/uci.cpp`（讓網頁可以送指令，改過的完整檔案在 pikafish-src/），編譯指令在 pikafish-src/build-wsl.sh。
- **神經網路 pikafish.nnue**：Pikafish 團隊提供，限合法、非商業使用（見 NNUE-License.md）。
- **棋譜**：適情雅趣、橘中秘、梅花譜，以及古典開局譜、殘局譜，均為明清古譜。
  數位化資料來自 chasoft/community-xiangqi-games-database。
