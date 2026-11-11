# 驗證紀錄（版本 20261111-2345）

這一頁讓任何人核對：這一版的程式真的通過了下面這些自動測試。

- 產生時間：2026/11/11 21:23:12（臺灣時間）
- 結果：**173／173 項通過**，0 項失敗

## 怎麼自己重做一次

1. 原始程式碼和測試都在專案的 `xiangqi-lab/tools/test-*.js`。它們用 Node.js 內建的 `node --test`，直接載入網站上同一份 `core.js`、`local.js`、`net.js`。只把時鐘、計時器、儲存換成假的，所以邊界時間可以精確到毫秒。
2. 在 `xiangqi-lab/tools` 資料夾執行：`node --test test-asian-rules.js test-clock-pv.js test-reply-risk.js test-report-id.js test-repwarn.js test-rule-handshake.js`
3. 版本是否一致：打開網站根目錄的 `/release.json`，裡面有這一版每支模組的雜湊。`intentionalDiffs` 欄位說明刻意不發布的原始碼差異。

## 各組測試

| 檔案 | 測什麼 | 項數 |
|---|---|---:|
| test-asian-rules.js | 棋規（長將、長捉、閒著、循環待核、限著、困斃） | 30／30 |
| test-clock-pv.js | 棋鐘邊界（+1／0／−1 ms）、悔棋加秒、重開；引擎缺 PV 保持未評 | 43／43 |
| test-grade-wording.js | — | 14／14 |
| test-park3d-tap.js | — | 12／12 |
| test-reply-risk.js | 失著的具體後果只照分析線說；沒評完的步數 | 24／24 |
| test-report-id.js | 檢舉追蹤編號與狀態 | 9／9 |
| test-repwarn.js | 重複局面預警 | 13／13 |
| test-resume-state.js | — | 22／22 |
| test-rule-handshake.js | 線上對局棋規版本握手 | 6／6 |

## 全部測試名稱

- ✔ empty history does not throw
- ✔ initial position has 44 legal moves
- ✔ one completed cycle is not enough
- ✔ red perpetual check loses with auditable cycle
- ✔ black perpetual check is symmetric
- ✔ direct chase follows the same knight across squares
- ✔ nonattacking repetition is a draw
- ✔ old ck/ch metadata cannot forge a long-chase loss
- ✔ stale ck=false cannot hide real perpetual check
- ✔ no-capture limit cannot overwrite perpetual-check loss
- ✔ different repeated paths request review, not a forced draw/loss
- ✔ earlier unrelated route does not contaminate latest repeated cycle
- ✔ load and rebuild regenerate the same verdict
- ✔ undo removes repetition and redo restores it
- ✔ breaking the cycle clears pending adjudication
- ✔ pinned apparent defender cannot be a real root
- ✔ Asian one-check-one-chase is allowed, unlike the old blended rule
- ✔ horse/cannon chasing a protected rook is still a direct chase
- ✔ chasing a genuinely protected knight is allowed
- ✔ a pawn's own perpetual attack does not become illegal chase
- ✔ an unprotected crossed pawn can be the chased victim
- ✔ mutual rook exchange is not a long-chase loss
- ✔ identical piece types swapping squares are not mistaken for stable identities
- ✔ perpetual check along different routes still loses (referee 188-192)
- ✔ different routes with idle moves on one side stay pending
- ✔ mutual chase goes to review, not an automatic draw or loss
- ✔ 120 plies without a capture is a draw
- ✔ 119 plies without a capture is not yet a draw
- ✔ no attacking pieces on either side is a draw
- ✔ stalemate loses for the side with no legal move
- ✔ 同機棋鐘：黑方剩 +1 ms 落子＝及時，這手算數、拿到 5 秒加秒
- ✔ 同機棋鐘：黑方剩 0 ms 落子＝已落旗，判超時負、著數不增、不加秒
- ✔ 同機棋鐘：黑方剩 -1 ms 落子＝已落旗，判超時負、著數不增、不加秒
- ✔ 同機棋鐘：紅方（第二次輪到）剩 1 ms 落子
- ✔ 同機棋鐘：紅方（第二次輪到）剩 0 ms 落子
- ✔ 同機棋鐘：紅方（第二次輪到）剩 -1 ms 落子
- ✔ 同機棋鐘：每 250 ms 的檢查、讀狀態也用同一條界線（+1 ms 還在走，0 ms 落旗）
- ✔ 同機棋鐘：落旗（剩 0 ms）還沒被偵測到時按認輸、同意和棋、悔棋，結果都是超時判負
- ✔ 同機棋鐘：落旗（剩 -1 ms）還沒被偵測到時按認輸、同意和棋、悔棋，結果都是超時判負
- ✔ 同機棋鐘：已經判超時後再認輸、提和、悔棋、落子，結果不變
- ✔ 同機悔棋：快走拿加秒→悔棋→重走，可用時間不會變多（雙鐘快照 cs）
- ✔ 同機重開：進行中的棋局存檔讀回後（tick＝null），著數、雙鐘、結果不變；鐘先停；續局第一手不扣時不加秒，走完才開始計時
- ✔ 同機重開：超時判負的棋局讀回後，結果、雙鐘、著數不變，也不能再落子或悔棋
- ✔ 線上棋鐘 tickMove：剩 1 ms
- ✔ 線上棋鐘 tickMove：剩 0 ms
- ✔ 線上棋鐘 tickMove：剩 -1 ms
- ✔ 線上棋鐘 tickMove：剩 1 ms、每步加 5 秒
- ✔ 線上棋鐘 tickMove：剩 0 ms、每步加 5 秒
- ✔ 線上棋鐘 tickMove：剩 -1 ms、每步加 5 秒
- ✔ 線上棋鐘 tickMove：紅方同樣的邊界；沒有棋鐘的對局不判逾時
- ✔ 線上對局（local.js → XQNet.update）：黑方剩 1 ms 落子
- ✔ 線上對局（local.js → XQNet.update）：黑方剩 0 ms 落子
- ✔ 線上對局（local.js → XQNet.update）：黑方剩 -1 ms 落子
- ✔ 引擎空結果（紅方）：第二查非終局又缺 PV，重查一次還是空 → 丟 e.retry，不能變成正著 loss＝0
- ✔ 引擎空結果（紅方）：第二查空、重查成功 → 照常評等
- ✔ 引擎空結果（紅方）：走的就是最佳著 → 只查一次，正著 loss＝0
- ✔ 引擎空結果（紅方）：第一查（走之前）非終局卻缺 PV → 也是 e.retry，不能變成「—」
- ✔ 引擎空結果（黑方）：第二查非終局又缺 PV，重查一次還是空 → 丟 e.retry，不能變成正著 loss＝0
- ✔ 引擎空結果（黑方）：第二查空、重查成功 → 照常評等
- ✔ 引擎空結果（黑方）：走的就是最佳著 → 只查一次，正著 loss＝0
- ✔ 引擎空結果（黑方）：第一查（走之前）非終局卻缺 PV → 也是 e.retry，不能變成「—」
- ✔ 引擎空結果（紅方）：走完是將死 → 原本的終局分支
- ✔ 引擎空結果（黑方）：走完是將死 → 原本的終局分支
- ✔ analyzeList（local.js 同機對局）：缺 PV 的那步保持未評、別步照評；之後重跑補上
- ✔ analyzeList（local.js）：第一查缺 PV 也保持未評（不寫「—」），重跑補上
- ✔ 賽後講解（紅方）：普通分 +1950、實走 +1450、損失 500，新存檔沒有殺棋訊號 → 不說錯過殺棋
- ✔ 賽後講解（紅方）：只有 bv（今天稍早的存檔）、+1950 不到殺棋分界 → 不說錯過殺棋
- ✔ 賽後講解（紅方）：舊存檔什麼訊號都沒有 → 說「錯失明顯優勢」，不說有殺
- ✔ 賽後講解（紅方）：引擎說最佳著是殺棋（bmt＞0）、實走不是 → 才說錯過殺棋
- ✔ 賽後講解（黑方）：普通分 +1950、實走 +1450、損失 500，新存檔沒有殺棋訊號 → 不說錯過殺棋
- ✔ 賽後講解（黑方）：只有 bv（今天稍早的存檔）、+1950 不到殺棋分界 → 不說錯過殺棋
- ✔ 賽後講解（黑方）：舊存檔什麼訊號都沒有 → 說「錯失明顯優勢」，不說有殺
- ✔ 賽後講解（黑方）：引擎說最佳著是殺棋（bmt＞0）、實走不是 → 才說錯過殺棋
- ✔ pawnN／pawnAbout：小數一位、去掉 .0、不到 0.75 兵寫半個兵、正負一樣
- ✔ 同一步（失著、少 258 分、走完紅方 +57）：著法條泡泡、賽後講解、mflWhy、關鍵一步寫的兵數一樣
- ✔ 評等字不再說「局面明顯變差」「很可能因此輸棋」；沒有 loss 寫固定區間
- ✔ 評等＋局面接成一句：走方還領先說「不過走完整盤還是…」，落後說「走完整盤：…」，均勢另寫
- ✔ 關鍵一步（10-db mkNote）：同一段不會又說「局面明顯變差」又說「紅方稍好」；兵數只講一次；補一句不是棋子數
- ✔ evt 分界：0.5 和 1.4 都是稍好（不到 1.5 兵），1.5 起明顯好、3 起大占上風；數字照 pawnN
- ✔ 俥一平二送到砲口、傌吃得回砲：不說「換不回來，等於白送」，改說吃回來也虧（有沒有分析線都一樣）
- ✔ 分析線說對方最好的回應不是吃那顆子 → 不講白送（rr＝null 也不講）
- ✔ 真的吃不回來、分析線也是吃那顆子 → 才說「換不回來，等於白送」
- ✔ 「傌二進三」被標失著（炮二平五 砲8進2 之後）：說得出是錯過白吃中卒，不是引擎雜訊
- ✔ 術語泡泡：往上放會蓋到狀態列 → 移到狀態列上面、收起箭頭；沒擋到就照舊
- ✔ zh.js：OpenCC 簡轉繁時「丑」「咸」放回原字（不會變醜、鹹），其他簡體照轉
- ✔ 資料檔與程式沒有常見誤轉：鹹陽、鹹寧、馮鹹堅、鹹服、千裡、醜時
- ✔ 唐站第 2 題：說明寫「捨得士」的題目，示範線裡對方真的沒吃士，說明也要講對方為什麼不吃
- ✔ 鏡頭複製品對得上截圖（舊預設視角：最上排 y≈151、最下排 y≈276、最下排左右 102～272）
- ✔ 手機預設視角（topfit）：格距至少 28px、棋盤框不出畫面
- ✔ 窄螢幕（360 寬）不會把棋盤框推出畫面
- ✔ 正中棋子：每一顆紅子都選得到自己
- ✔ 阿嬤：點炮偏上 4px、偏下 4px、偏左右 6px 都選到炮
- ✔ 阿哲：點傌偏向俥 10px 還是傌；正中間（兩顆一樣近）不猜
- ✔ 沒選子：點在兩個兵之間的空點附近，吸到最近的兵；空點正上方照實回報（維持原本的點空提示）
- ✔ 點對方的子：照實回報那一格，不會被吸到附近的己方棋子
- ✔ 選了子：點綠點附近吸到綠點；綠點跟另一顆己方棋子一樣近時優先綠點
- ✔ 出了棋盤：回 -1（交給點物件看介紹）
- ✔ fitZoom：找最小可行距離、放不下就維持 1
- ✔ 模擬真人手指（誤差 σ＝6px）點己方棋子：新算法（topfit＋吸附）命中率明顯比舊算法（舊預設視角）高
- ✔ 失著的後果（紅方）：對方最佳回應吃子 → rr 記下吃到「俥」、中文記譜、沒將軍
- ✔ 失著的後果（紅方）：對方最佳回應是將軍、沒吃子 → x＝null、k＝true
- ✔ 失著的後果（紅方）：引擎說對方 3 步殺 → rr.mt＝3、pmt＝−3
- ✔ 失著的後果（紅方）：引擎給的回應在規則上不合法 → rr＝null（不猜），評等照舊
- ✔ 失著的後果（紅方）：走的就是最佳著 → 只查一次、rr＝null
- ✔ 失著的後果（黑方）：對方最佳回應吃子 → rr 記下吃到「車」、中文記譜、沒將軍
- ✔ 失著的後果（黑方）：對方最佳回應是將軍、沒吃子 → x＝null、k＝true
- ✔ 失著的後果（黑方）：引擎說對方 3 步殺 → rr.mt＝3、pmt＝−3
- ✔ 失著的後果（黑方）：引擎給的回應在規則上不合法 → rr＝null（不猜），評等照舊
- ✔ 失著的後果（黑方）：走的就是最佳著 → 只查一次、rr＝null
- ✔ stateRebuild（存檔讀回）保留 rr；舊存檔沒有 rr 也照常重建
- ✔ gameItem（存起來的棋譜）帶出 rr；舊存檔沒有 rr 是 undefined
- ✔ 後果文字（紅方）：分析線吃子才說「可以吃你的俥」，帶對方那手的記譜
- ✔ 後果文字（紅方）：沒有吃子、沒將軍、沒殺 → 不說；舊存檔沒有 rr → 不說
- ✔ 後果文字（紅方）：有盤面就用規則重驗——rr 說吃子但盤面沒吃到、或那手不合法，都不說
- ✔ 後果文字（紅方）：將軍、將死
- ✔ 後果文字（黑方）：分析線吃子才說「可以吃你的車」，帶對方那手的記譜
- ✔ 後果文字（黑方）：沒有吃子、沒將軍、沒殺 → 不說；舊存檔沒有 rr → 不說
- ✔ 後果文字（黑方）：有盤面就用規則重驗——rr 說吃子但盤面沒吃到、或那手不合法，都不說
- ✔ 後果文字（黑方）：將軍、將死
- ✔ 下完才評好的步、缺 PV 之後重評好的步，都補進存起來的棋譜（gamePatch）；缺 PV 會再排一次重評
- ✔ 對局紀錄清單：pend＝我方還有幾步沒評（對方的步不算）；舊存檔沒有 rr 照常讀
- ✔ /db/grades：後來評好的補進存檔（帶 rr）；f、t 對不上的不補、已經有評等的不動；補完清單的 pend 跟著少
- ✔ 線上對局一步都沒評過：清單不寫「在分析」（本來就不會自動評）；有評過一部分才寫
- ✔ 編號格式：R-月日-四碼，四碼不含 0 O 1 I L
- ✔ 編號不重複：跟手機裡已有的撞到就重抽
- ✔ 有網路：送出後狀態直接是「已從手機送出」，表單收到 [編號] 開頭的內容、不多送 rid 那一格
- ✔ 沒網路：排隊中（放進 fbQueue）→ 恢復連線 flushFeedback 補送 → 已從手機送出
- ✔ 一般意見回饋（沒有 rid）照舊：不受檢舉的離線判斷影響
- ✔ 排隊中卻不在佇列裡（佇列只留 30 筆被擠掉）：超過 2 分鐘才老實標「沒送出」；又出現在佇列裡改回排隊中
- ✔ 回推：fixes.json 的 reports 標 done／seen，只通知一次
- ✔ 舊資料相容：沒有清單、壞掉的清單、舊 fixes.json、舊佇列都不出錯
- ✔ 匯出：已處理／不處理＝done（日期取版本號）、核准＝seen、沒決定或沒編號的不列；修正紀錄照舊
- ✔ 一將一捉（亞洲棋例允許）：走的那一方不會被警告
- ✔ 一將一捉：被將被捉的那一方也不會被警告
- ✔ 一將一捉真的再走一圈，裁判判和（跟不警告一致）
- ✔ 閒著循環：不警告
- ✔ 長將：將軍的那一方收到警告，判詞照抄裁判
- ✔ 長將：被將的那一方不會被警告
- ✔ 長捉：捉子的那一方收到警告；有提和的對局多一顆提議和局
- ✔ 同一盤 8 手內只提醒一次
- ✔ 還沒輪到自己、或對局已結束：不提醒
- ✔ 雙方互捉（裁判會判待核）：跳「局面在重複」，判詞照抄裁判，可提和
- ✔ 雙方互捉：另一方輪到時也會收到待核提醒
- ✔ 不判長將長捉的關（noPerp）：長將、長捉都不警告會判負
- ✔ 不判長將長捉的關（noPerp）：待核照樣提醒
- ✔ 全新手機：什麼都沒有＝沒有進度
- ✔ 開機就會寫的鍵不算進度：空的 xq_play、今日茶單 m_cj、朝代、遊玩秒數、全 0 的電腦積分、空戰績
- ✔ 下到一半的對電腦棋（桌上那盤）＝game
- ✔ 下完的那盤還在桌上＝有紀錄（rec），不是 game
- ✔ 收起來的棋 xq_play2：新格式 {cpu,arena,journey,practice} 和舊格式（只有一盤）都認得
- ✔ 解到一半的殘局、關卡、主題訓練、棋力測驗＝run；解完的不算
- ✔ 下過、解過、學過的紀錄＝rec
- ✔ 壞掉的 JSON 不會讓開頭畫面當掉
- ✔ 狀態表：有旅程／沒選角色有進度／沒選角色沒進度
- ✔ 沒選角色、有任何一種進度，主按鈕一定是 cont（不是 new）
- ✔ 先試一手：全部條件都沒有才出；任何一項（含進度）就不出
- ✔ 模擬玩家情境：沒選角色、晉級賽下到一半，新分頁打開＝不出教學、主按鈕 ▶ 接著下
- ✔ cont 的字：有下到一半的棋＝▶ 接著下＋和誰、第幾回合；殘局＝題名；都沒有＝▶ 繼續
- ✔ 沒選過角色、有下到一半的棋和戰績：第一次選角＝進度留著（不再清掉 xq_play、xq_play2、戰績、積分）
- ✔ 全新玩家（沒有進度）第一次選角：照舊先清掉開機寫的旅程鍵，firstWin 留著
- ✔ 已經有旅程，再開新的旅程：照舊清掉（舊的那段在原本的存檔格），而且重新開啟
- ✔ 多分頁：會掛 storage 事件
- ✔ 多分頁：另一個分頁在同一盤走了一步＝丟掉記憶體那份（下次重讀），不提示
- ✔ 多分頁：另一個分頁開了別盤＝丟掉記憶體那份，發 xq-play-other（畫面提示一次）
- ✔ 多分頁：另一個分頁清掉 xq_play（開新旅程、讀檔）或整個 localStorage.clear()＝也丟掉
- ✔ 多分頁：別的鍵、sessionStorage 的事件不動桌上那盤；本來就沒載入也不提示
- ✔ 開頭畫面 menu 照 tsmMenu 排、fwNeed 走 tsmFirst、journeyStart 只在 had 或沒進度時清、local.js 舊分頁不寫回
- ✔ old rule version invitation is declined before a game starts
- ✔ other rule version acceptance cannot start a game
- ✔ new invitations publish the exact adjudicator version
- ✔ matching version invitation reaches the normal invite handler
- ✔ mid-game rule version changes are rejected
- ✔ new client does not timeout or rate a resumed legacy game
