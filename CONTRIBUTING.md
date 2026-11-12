# 參與《象棋千秋》

謝謝你想幫忙。這個倉庫放的是 App 發布出來的成品（網頁、資料、引擎），可讀的原始碼在 [source/](source/README.md)。

**這個倉庫只收問題回報（Issues），目前不收 Pull Request。** 送來的 Pull Request 會附上說明後關閉，請改開 Issue 描述問題。原因寫在下面〈為什麼暫不收程式修改〉。

## 歡迎的幫忙

1. **回報錯誤**：畫面壞掉、按了沒反應、規則判錯、當機、在某支手機上特別慢。
2. **棋譜、局例與史實勘誤**：大師對局的著法或比賽資訊有誤、殘局題答案不對、裁判局例和棋規條文不一致、朝代場景或人物說明有史實錯誤。
3. **無障礙問題**：讀屏念錯或念不到、鍵盤操作不到、字太小、顏色對比不夠。
4. **建議**：想要的功能、覺得難懂的地方。

## 怎麼回報

- **最快**：在 App 裡按「回報問題」，會自動附上版本號，也可以附截圖。
- **GitHub**：到 Issues 用對應的模板開一則（錯誤回報／棋譜與局例勘誤／建議）。

回報時請盡量附上：

- App 版本（設定頁最下面，例如 `20261112-1310`）
- 手機型號與瀏覽器，或是否加到主畫面
- 怎麼重現：從哪一頁、做了什麼、看到什麼、原本以為會怎樣
- 棋局相關請附局面（FEN 或棋譜）

請用文字描述問題和你建議的改法就好，**不用貼程式碼**；修正由開發者自己寫。

## 為什麼暫不收程式修改

- **只有一位開發者在維護。** 每個改動都要對照 App 的設計、兒童與隱私規則、無障礙和整套自動測試，一份一份審 Pull Request 目前顧不過來。
- **公開的原始碼是「發布版」的副本。** 開發者電腦上的版本常常已經往前改了，倉庫裡的修改沒辦法直接合回去，收了也是重寫一次。
- **著作權保持單純。** 程式現在由開發者一人以 GPL 授權；收進別人的程式碼，那一部分的著作權就屬於別人，之後要上架 App Store 或調整授權時，得一一取得每位貢獻者同意。

這不影響你的權利：程式碼是 GPL-3.0-or-later，你可以照 [LICENSE](LICENSE) 自己 fork、修改、散布你的版本（散布時同樣要用 GPL、附上原始碼）。之後如果改成收 Pull Request，會更新這份說明。

## 處理方式

- 回報會記進開發者的回饋表，修好後在 App 的「更新內容」說明。
- 規則與棋譜的勘誤，請附上出處（比賽紀錄、規程條文、書籍頁碼）。
- 隱私：不要在公開的 Issue 裡貼帳號、電話、Email 或孩子的真實姓名。
- 資安問題（例如能冒充別人、讀到別人的資料）：請不要公開開 Issue，改用 App 裡的「回報問題」私下告訴開發者。

## 授權

- 程式碼：GNU GPL 第 3 版或（由你選擇）任何更新的版本，`GPL-3.0-or-later`（[LICENSE](LICENSE)）；寫在程式檔裡的介面文字、場景小故事和對白也算程式。
- 開發者自製的素材（`data/` 底下的圖片、3D 模型、音樂、長篇劇情等）：CC BY-NC-SA 4.0（[LICENSE-ASSETS.md](LICENSE-ASSETS.md)）；`data/gmbios.json` 和 `data/voice/` 不在內。
- 第三方元件見 [NOTICE.md](NOTICE.md)，授權全文在 [licenses/](licenses/README.md)。
- 你送來的回報與勘誤，可能會用來修改 App 的內容；回報即表示同意這樣使用。

---

**English.** This repository accepts issues only; pull requests are not accepted for now and will be closed with a pointer to Issues. Please describe the problem (and your suggested fix in words) instead of sending code. The code is GPL-3.0-or-later, so you are free to fork, modify and redistribute your own version under the same license.
