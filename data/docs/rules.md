# 棋規與裁決追溯

最後核對：2026 年 11 月 11 日。

這一頁說明《象棋千秋》怎麼判勝負和棋，每一條寫在哪支程式、有哪個自動測試在檢查，讓任何一盤的裁決都能追回去。後半段整理臺灣常見比賽規則和本 App 的差異。

## 一、先說結論

- App 只用一套棋規：**亞洲棋例（直接捉子）**，規則版本代號 `asian-direct-v2`（程式裡的 `REP_RULES`）。
- 電腦自動裁定常見情形：將死、困斃、長將、直接長捉、一將一捉、閒著循環、60 回合未吃子、雙方無進攻子力、超時。
- 比較複雜的循環，App **不自動判和、也不判負**，會顯示「棋例待核」，請變著或提和。
- 線上對局要雙方的規則版本一樣才能開局，下到一半版本變了也不接受。

## 二、程式和測試在哪裡

- 規則核心：`xiangqi-referee.js`。建置時產生 `site/core.js`，App、線上大廳、比賽裁判台都用同一份。
- 主要自動測試：`xiangqi-lab/tools/test-asian-rules.js`（30 項）。
- 相關測試：`test-repwarn.js`（重複局面的提醒，13 項）、`test-clock-pv.js`（棋鐘）、`test-rule-handshake.js`（線上規則版本）。
- 2026 年 11 月 11 日跑 `node --test tools/test-asian-rules.js tools/test-repwarn.js`：43 項全部通過。

## 三、裁判怎麼判（順序）

每走一步，`judgeState` 依序檢查：

1. 輪到的一方有沒有合法的著法？沒有 → 將死或困斃，剛走的一方勝。
2. 局面有沒有重複到第 3 次？有 → 交給 `repetitionVerdict` 判循環。
3. 雙方都沒有車、馬、炮、兵？→ 和棋。
4. 連續 120 步（60 回合）沒有吃子？→ 和棋。

長將、長捉要比「60 回合限著」先判，所以不會因為 60 回合到了，就把一個該判負的長將蓋成和棋。

每一次循環裁決都會留下一份紀錄（`adjudication`）：規則版本、哪幾步出現同一局面、從第幾步到第幾步、每一步是誰走的、有沒有將軍、新捉了哪顆子、紅黑各自捉的目標。存檔讀回、悔棋重來，都會從棋步重新算一次，不相信存檔裡舊的標記。

## 四、逐條說明

### 長將

- **判法：** 同一局面第 3 次出現時，看這兩輪循環裡某一方是不是**每一步都在將軍**。是 → 這一方判負；雙方都是 → 和棋。兩輪走的路線不一樣也照判，只要每步都將軍。
- **程式：** `xiangqi-referee.js` 的 `repetitionVerdict`（第 178 行起）、`checksSpan`、`inCheck`。
- **測試：** `red perpetual check loses with auditable cycle`、`black perpetual check is symmetric`、`one completed cycle is not enough`、`stale ck=false cannot hide real perpetual check`、`perpetual check along different routes still loses (referee 188-192)`、`no-capture limit cannot overwrite perpetual-check loss`、`undo removes repetition and redo restores it`。
- **還缺：** 「雙方長將判和」沒有專門的測試。

### 長捉

- **判法：** 兩輪循環裡，某一方每一步（不將軍的那幾步）都**新捉同一顆子**，而對方每次都只是逃開或擋住 → 捉的一方判負。下面這些**不算捉**：
- 被捉的子有保護（對方能合法吃回來）。但**馬、炮捉車，車有保護也照算**。
- 被捉的子也能反吃回來（兌子）。
- 用帥（將）或兵（卒）去捉。
- 被捉的是帥（將）——那叫將軍，不叫捉。
- 「看起來有保護、其實保護的子被牽制不能吃回」的，不算有保護。
- 過河的兵卒沒有保護，可以被長捉。
- **程式：** `attackMap`（第 148 行，算每一步新增了哪些捉、有沒有保護、算不算兌子）、`repetitionTrace`（第 161 行，用每顆棋子自己的編號重播，追的是「同一顆子」不是「同一個格子」）、`repetitionVerdict`。
- **測試：** `direct chase follows the same knight across squares`、`pinned apparent defender cannot be a real root`、`horse/cannon chasing a protected rook is still a direct chase`、`chasing a genuinely protected knight is allowed`、`a pawn's own perpetual attack does not become illegal chase`、`an unprotected crossed pawn can be the chased victim`、`mutual rook exchange is not a long-chase loss`、`old ck/ch metadata cannot forge a long-chase loss`、`load and rebuild regenerate the same verdict`。

### 一將一捉

- **判法：** 一步將軍、一步捉子輪流來，**不算長將、也不算長捉**，循環成立時判和。
- **程式：** `repetitionVerdict` 的 `side()`：將軍那步不計捉子；捉子那步不是將軍，所以兩邊都湊不成「每步都一樣」。
- **測試：** `Asian one-check-one-chase is allowed, unlike the old blended rule`；提醒：`一將一捉（亞洲棋例允許）：走的那一方不會被警告`、`一將一捉：被將被捉的那一方也不會被警告`、`一將一捉真的再走一圈，裁判判和（跟不警告一致）`。

### 閒著（雙方都只是來回走）

- **判法：** 循環裡雙方都沒有長將、也沒有直接長捉 → 判和。
- **程式：** `repetitionVerdict` 最後一行。
- **測試：** `nonattacking repetition is a draw`、`earlier unrelated route does not contaminate latest repeated cycle`；提醒：`閒著循環：不警告`。

### 循環待核

- **判法：** 下面幾種，App **不自動判和、不判負**，畫面顯示「棋例待核」，可以變著或提和：
- 兩輪循環走的路線不一樣（而且不是每步都將軍）。
- 同一種棋子互換了位置（例如兩隻車換位），沒辦法確定「是不是同一顆子在捉」。
- 雙方互捉。
- 同類棋子互相牽制的特殊情形（例如炮捉炮但不是兌子）。
- 只要有一方變著、跳出循環，待核就自動消失。
- **程式：** `repetitionVerdict` 回傳 `pending:true`；`judgeState` 遇到待核就不結束對局。提醒在 `m/08b-cpugame.js` 的 `repWarn`（第 403 行）。
- **測試：** `different repeated paths request review, not a forced draw/loss`、`different routes with idle moves on one side stay pending`、`identical piece types swapping squares are not mistaken for stable identities`、`mutual chase goes to review, not an automatic draw or loss`、`breaking the cycle clears pending adjudication`；提醒：`雙方互捉（裁判會判待核）…`、`雙方互捉：另一方輪到時也會收到待核提醒`。
- **還缺：** 「同類子牽制」那一種沒有專門的測試。

### 60 回合限著

- **判法：** 連續 120 步（紅黑各 60 步）沒有吃子 → 和棋。第 119 步還不判。
- **程式：** `judgeState`（第 487 行起，`since>=120`）。
- **測試：** `120 plies without a capture is a draw`、`119 plies without a capture is not yet a draw`、`no-capture limit cannot overwrite perpetual-check loss`。
- **注意：** 這是本 App 的設定（程式裡叫「遊戲自然限著」）。各地比賽的限著規定，本次沒有查到可以引用的條文，見第五節。

### 困斃

- **判法：** 輪到的一方沒被將軍，但一步都不能走 → 判負（和西洋棋的「逼和」不一樣）。
- **程式：** `judgeState` 第一個檢查，`legal` 回傳空的。
- **測試：** `stalemate loses for the side with no legal move`、`initial position has 44 legal moves`、`empty history does not throw`。

### 雙方無進攻子力

- **判法：** 雙方都沒有車、馬、炮、兵（卒）→ 和棋。只剩帥、仕、相不算進攻子力。
- **程式：** `hasAttackers`（第 142 行）、`judgeState`。
- **測試：** `no attacking pieces on either side is a draw`。

### 超時

- **判法：**
- 線上對局：自己的總時間用完 → 判負；或輪到自己超過 3 分鐘沒走（離開、斷線、關掉 App）→ 由等待的一方判超時負。時制每方 5～30 分鐘，雙方選的不同就用比較短的。
- 同一支手機兩人對下：可選 10+5、20+10、60+30（分鐘＋每步加秒），時間用完判負；剩 0 毫秒就算落旗。判超時以後再認輸、提和、悔棋、落子，結果都不變。
- 跟電腦下：沒有棋鐘，不會超時。
- 時間用完一律判負，**不看對方還有沒有能將死你的子力**。
- **程式：** `xiangqi-lab/src/net.js` 的 `timeoutCheck`（第 292 行起，`TURN_MS`＝3 分鐘）和 `tickMove`；`src/local.js` 的 `pvpFlag`（第 310 行）。
- **測試：** `test-clock-pv.js`：`同機棋鐘：黑方剩 +1 ms 落子＝及時，這手算數、拿到 5 秒加秒`、`同機棋鐘：每 250 ms 的檢查、讀狀態也用同一條界線（+1 ms 還在走，0 ms 落旗）`、`同機棋鐘：已經判超時後再認輸、提和、悔棋、落子，結果不變`、`同機重開：超時判負的棋局讀回後，結果、雙鐘、著數不變，也不能再落子或悔棋`、`線上棋鐘 tickMove：紅方同樣的邊界；沒有棋鐘的對局不判逾時`。`test-rule-handshake.js`：`new client does not timeout or rate a resumed legacy game`。

### 例外：不判長將長捉的關卡

- 石桌往事有幾關設了 `noPerpetual`：這些關**不判長將、長捉**（局面重複也不判和），畫面會寫明。將死、困斃、60 回合、無進攻子力照常判。
- **程式：** `src/local.js` 的 `playApply`（第 213 行）；說明文字在 `m/00-util.js` 第 298 行起。
- **測試：** `不判長將長捉的關（noPerp）：長將、長捉都不警告會判負`、`不判長將長捉的關（noPerp）：待核照樣提醒`。

### 線上規則版本

- 邀請、接受邀請都要帶規則版本；版本不同就不開局，下到一半變了也拒絕。
- **測試：** `old rule version invitation is declined before a game starts`、`other rule version acceptance cannot start a game`、`new invitations publish the exact adjudicator version`、`matching version invitation reaches the normal invite handler`、`mid-game rule version changes are rejected`。

## 五、和臺灣常見規則的差異

先說清楚：**這次沒有找到《中華民國象棋規則》的條文原文**，只找到幾份臺灣比賽的競賽規程引用它。所以下面只能比到規程寫出來的部分；沒寫到的，照實標「未查證」，不要把它當成確定的規則。

三種標籤：

- **【App 照亞洲棋例】**：App 的做法。
- **【台灣比賽可能不同】**：有比賽規程寫了不一樣的做法。
- **【民間習慣】**：朋友間下棋常見的說法，沒有正式條文。

### 規則依據

- 新竹市 114 年市長盃（2025 年 11 月 9 日）：「比賽規則：《中華民國象棋規則》96 年修訂版」。[新竹市 114 年市長盃競賽規程（PDF）](https://www.sggs.hc.edu.tw/wp-content/uploads/doc/shinju54/「新竹市114年度市長盃象棋錦標賽」競賽規程乙份.pdf)
- 第二十一屆春暉盃臺北市學生象棋錦標賽（中華民國象棋文化協會主辦）：「採中華民國象棋規則」。[春暉盃競賽規程（PDF）](https://www.es.nccu.edu.tw/wp-content/uploads/sites/30/2024/03/第二十一屆春暉盃臺北市學生象棋錦標賽競賽規程.pdf)
- 亞洲象棋聯合會的比賽，規程寫的是以世界象棋聯合會《世界象棋規則》和最新修訂的《亞洲象棋比賽規則》為準（依搜尋摘要；條文原文本次未取得）。[第 20 屆亞洲象棋錦標賽規程（PDF）](https://www.asianxiangqi.org/20AXC/1-规程.pdf)

### 長將

- 【App 照亞洲棋例】同一局面第 3 次出現（兩輪循環）就自動判長將方負。
- 【台灣比賽可能不同】新竹市長盃規程：「單方長將循環三回合後，經裁判裁決長將方仍不變著判負。」也就是要循環三回合、裁判裁決以後還不變著，才判負；App 是自動判，沒有「裁判提醒後再給一次機會」這一步，循環次數的算法也可能不一樣。

### 長捉

- 【App 照亞洲棋例】直接長捉同一顆無保護的子判負；馬、炮捉有保護的車也算長捉；帥、兵去捉不算。
- 【台灣比賽可能不同】新竹市長盃規程：「長捉無根子循環三回合後，經裁判裁決……仍不變著判負。」規程只寫「無根子」，沒寫馬炮捉車這類例外，**中華民國規則對這些例外怎麼規定，未查證**。（規程原文這一句寫「長將方」，看起來是筆誤，照錄。）

### 一將一捉、互捉、複雜循環

- 【App 照亞洲棋例】一將一捉判和；雙方互捉、同類子牽制、路線不同的循環標「待核」。
- 【台灣比賽可能不同】中華民國規則怎麼處理這幾種，**未查證**。正式比賽由裁判依規則當場裁決，App 只能做到「不亂判」。
- 參考：國外論壇對「亞洲規則是否允許一將一捉」有不同說法，研究 WXF 規則的論文則說「至少一將之後接一擋或一捉，不算長將」。[arXiv：Complete Implementation of WXF Chinese Chess Rules](https://arxiv.org/html/2412.17334v1)、[TalkChess 討論串](https://talkchess.com/viewtopic.php?p=361722)。這些都不是臺灣規則。

### 60 回合限著、無進攻子力

- 【App 照亞洲棋例】App 設定 60 回合未吃子判和、雙方無進攻子力判和。
- 【台灣比賽可能不同】臺灣規則有沒有限著、怎麼算，**未查證**。另外，有些線上平台的「60 步」是雙方合計（每方 30 步），和 App 的算法不一樣。[xiangqi.com 限著說明](https://www.xiangqi.com/help/limits)

### 計時與超時

- 【App 照亞洲棋例】線上每方 5～30 分鐘、每步超過 3 分鐘沒走判負；同機 10+5、20+10、60+30；時間用完一律判負。
- 【台灣比賽可能不同】115 年度臺北市中正盃全國象棋錦標賽寫「限時 15 分加 5 秒」。[中正盃簡章（PDF）](https://jr.hs.ntnu.edu.tw/wp-content/uploads/2026/06/115年度臺北市中正盃全國象棋競賽簡章.pdf)；新竹市長盃寫「超時作負」。各比賽時制不同，以每場規程為準。App 沒有「每步 3 分鐘」以外的讀秒制度。
- 時間用完時，如果對方子力不夠將死，是判負還是判和，臺灣規則怎麼定，**未查證**。

### 摸子走子、離手為定

- 【台灣比賽可能不同】新竹市長盃對局規定：「摸子走子、離手為定、超時作負、不得發出擾人神思聲響」。
- App 是點子、再點目的地才算一步，點錯了可以改選別的子；練習時還能用悔棋。這是手機操作的方便，正式比賽不行。

### 困斃

- 困斃判負，App 和一般象棋規則一致。[英文維基百科「Xiangqi」](https://en.wikipedia.org/wiki/Xiangqi)：「和西洋棋不同，象棋的困斃是無子可動的一方輸」。新竹市長盃規程附的趣味殘局裡也有「困斃」紅勝的例子。

### 民間習慣

- 【民間習慣】「觀棋不語真君子，起手無回大丈夫」是民間棋諺，沒有正式條文。
- 【民間習慣】朋友間下棋，對長將、長捉、重複幾次算和，各地說法差很多；這次**沒有找到可以引用的調查資料**，所以不列具體說法。
- 「長打」：一般用來統稱長將、長捉這類一直攻擊的走法；本次沒有找到正式條文中的定義。

## 六、目前只支援一套

《象棋千秋》目前只支援「亞洲棋例（直接捉子）」一套。

要加上其他地區的棋規（例如《中華民國象棋規則》、中國象棋協會規則、世界象棋聯合會規則），需要先拿到**條文原文**，再請懂棋規的專人**逐條核對**、每一條都寫好自動測試，才能上線。在那之前，App 不會假裝支援別的規則。
