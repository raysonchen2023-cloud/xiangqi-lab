// 測試分三類的統計工具（不是測試）：交接單要寫「幾項測試通過」時，請引用這支印出的三個數字，不要只寫總數。
//   行為　　：真的執行 App 的程式（vm 載入、抽出函式呼叫、假的 DOM／計時器／伺服器跑流程），檢查輸出或狀態。名稱不加標籤。
//   混合　　：一半執行程式、一半只比對原始碼文字。名稱開頭「〔混合〕」。
//   原始碼比對：只檢查原始碼裡有沒有某段字（includes、assert.match 原始碼、掃 CSS 規則）。只證明程式碼存在，不證明功能會動。名稱開頭「〔原始碼〕」。
// 測試由開發用的 AI 撰寫，不等於第三方驗證。
// 用法（在任何資料夾都可以）：
//   node xiangqi-lab/tools/testkinds.js           實際逐檔跑測試（node --test，TAP 輸出），印每檔三類各幾項與通過數
//   node xiangqi-lab/tools/testkinds.js --static  不跑測試，只數原始碼裡 test( 的呼叫處（迴圈產生的多項只算一次）
// 不跑 test-home-focus.js（它會開無頭 Chrome）。
// 新加的測試檔：逐項分類、改好名稱後，把檔名加進 CLASSIFIED；還沒分類的檔放 PENDING（統計會列為「待分類」，不算進三類）。
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const DIR = __dirname;
/* 這支自己也叫 test-*.js：統計時跳過自己；被 node --test 一起跑到時什麼都不做（NODE_TEST_CONTEXT） */
const SKIP = new Set(["test-home-focus.js", "testkinds.js"]);
/* 11/12 已逐項分類（開發者稽核 story/102_評比灌水誠實稽核.md 第 3 項） */
const CLASSIFIED = new Set([
  "test-newjourney-entry-1116.js",   /* 11/16 開發者「目前已經沒辦法新的旅程了嗎 假設有其他玩家想重玩的話 應該還是要跟存檔讀檔的格子」：存檔與讀檔面板最下面補一顆不管幾格有存檔都在的「開始新的旅程」，開選格頁（m/05b-save.js saveList）（行為 4、原始碼 2；11/16 加「回開頭畫面」） */
  "test-xiu-scene-1116.js",   /* 11/16 開發者「找gemini繪製環景圖 關於這一頁，按照天文專家的判斷」：二十八宿星圖頁改滿版圖＋程式畫的二十八宿 */
  "test-weather-align-1116.js",   /* 11/16 開發者「這邊的天氣錯了，要跟首頁對齊天氣」：雲河的地方（船艙、驛站、航線圖、甲板）跟首頁同一個天氣地區 */
  "test-sg2-talsheet-1116.js",   /* 11/16 開發者「這一頁的排版你重新設計」「點某個角色的天賦 只會出現那個角色的天賦描述」：天賦頁改底部面板、只看一位 */
  "test-dgl-off-1116.js",   /* 11/16 開發者「先直接拿掉人間的體力靈力設定，太亂了」「不能在任何地方寫上限」：DGL_HUMAN 關掉、角色卡與黑洞裡的你用卡冊四條、二十八宿照星門圍城勝場點亮 */
  "test-devview-1116.js",   /* 11/16 開發者「除了意見回饋欄的按鈕，其他都要讓開發者的視角和玩家一樣，要看開發者的內容要到開發者測試台」：DEVUNLOCK／DEVTOOLS／devNote、測試台「👁 開發者視角」 */
  "test-gxt-unlock-1116.js",   /* 11/16 出入口盤查：黑洞只剩星門圍城後，打贏只寫 gsv，觀星臺解鎖原本只看 bhWin／bhtd，新玩家永遠看不到觀星臺；gxtOpen 加看 gsv 勝場 */
  "test-pty-stats-1116.js",
  "test-pty-statbar-1116.js",   /* 11/16 開發者「找rpg參考煙雨江湖的排版然後優化」「靈力隨著等級上升，顯示當前等級的靈力」，選單「資源條＋攻防一行」：卡冊數值區改成體力條、靈力條＋攻防一行 */   /* 11/16 開發者（雲河七星卡冊截圖）「讓這頁也能看到角色的體力/靈力/攻擊力/防禦力/天賦/招式」：每張卡多一排四格（每位自己的黑洞數值）與可以點的招式列，卡冊最上面一列全隊共用的天賦；天賦樹的返回鈕照從哪裡進來的寫（m/07pty-party.js ptyStatHTML、ptySkills、ptyTalHTML；07bht-td.js bhtdTal；07dgl-stamina.js）（行為 5、原始碼 1） */
  "test-ship-tasklist-1116.js",   /* hspx 11/16 開發者（手機截圖「還不能起航」）「修正，然後剛剛我完成兩題千秋殘局 在啟航清單上卻沒有更新 還是顯示0/2」：清單一列兩行、「去」不再佔滿整列；那兩題是在船艙站解的，清單標題和解局那一項寫出站名；看答案走完的題不算，清單會講有幾題（m/07f-ship.js shipTaskList、shipTasks、shipGateSay）（行為 4、混合 1、原始碼 1） */
  "test-gxt-fx-1116.js",   /* 11/16 開發者（觀星臺）「點擊這一頁每一個入口後，可以先有個動畫過場…不然玩家會覺得怎麼進來的」：渾儀、天頂黑洞、右側星空各一段短過場與一句話（m/07gxt-guanxing.js gxtFx、gxtFxPlan）（行為 4、原始碼 1） */
  "test-bhtd-select-1116.js",   /* 11/16 開發者「重新設計排版 太亂了 玩家不知道到底要玩哪個」「車輪戰和星門圍城也都能上線」：星淵遠征選關視窗改成一顆主按鈕（主卡＋關卡小格＋其他玩法＋收起來的出戰設定，m/07bht-td.js bhtdSelect）；觀星臺的黑洞車輪戰解鎖（m/07gxt-guanxing.js gxtWheel）（行為 1、原始碼 5） */
  "test-pty-capsay-1116.js",   /* 11/16 開發者「角色等級不能超過修為，這句話玩家看不懂」：雲河七星隊伍頁同一條規則的三處文字改成講結果（m/07pty-party.js ptyCapSay、練滿的註記與提示）（行為 1、原始碼 2） */
  "test-engine-budget-pgn.js",   /* 11/15 引擎預算敏感度 PGN 版 tools/engine-budget-pgn.js（用 App 匯出的帶評語棋譜重做＋手機評語 vs 電腦各檔；自編棋譜與假的評估函式，不啟動引擎；行為 8、原始碼 1） */
  "test-mathmodel-82.js",   /* 11/15 數學模型（ChatGPT 第五次重評的改善單＋引擎預算敏感度）：算法對照每一對各自算人數與來源（單人 120 盤不能借別人的人數）、探索性的標籤與「可比較的 k／3 項」、方案 v1.3、引擎預算敏感度工具 engine-budget-check.js 的抽樣／續跑／比較（用假的評估函式，不啟動引擎）（行為 6、混合 1、原始碼 2） */
  "test-mathmodel-81.js",   /* 11/15 數學模型（ChatGPT 第四次重評的改善單＋開發者決定）：離線工具原始格式先驗再轉型（null、字串、缺識別欄位不進分母；真正的 0 分留著）、新舊配對盤數、弱項建議的放行條件 SK.PICKOK（沒有基準時畫面不變）、三種對照算法與算法三角對照、本機紀錄多存標準開局與提示悔棋、Wilson 完整精度、方案 v1.2／外部公式參考 v2／manifest 說明（行為 14、混合 3、原始碼 4） */
  "test-mathmodel-80.js",   /* 11/15 數學模型（ChatGPT 第三次重評的改善單）：離線工具的資料資格篩選與共同有效盤集合（重現的 score＝999、full:0 兩個漏洞）、模擬比例的 Monte Carlo 區間與固定情境／判定、HAC／區塊重抽離線對照、SK.PICK 與版本雜湊紀錄 mx-manifest、預先驗證方案 v1.1（行為 13、原始碼 2） */
  "test-mathmodel-79.js",   /* 11/15 數學模型驗證閉環（ChatGPT 第二次重評第 2～4 項）：本機影子紀錄與開發者匯出、匿名欄位不變、離線比較 mx-compare.js（完整盤、截斷長局）、Lichess 固定版本的數值與殺棋分界整點、用語統一、階段差異配對估計＋選擇效應修正與模擬（行為 20、混合 1、原始碼 3） */
  "test-mathmodel-1046.js",   /* 11/15 意見表 1046 數學模型（三方審查第一步＋第二步）：影子模式必改 1～4（存檔還原、送殺漏殺、輸棋上限 MXS.lose、k 與門檻）、K 48／32、升段保護、一般棋友 100 人門控、建議先練三級信心、talentCache6（行為 17、混合 4、原始碼 1） */
  "test-i18n.js",   /* 11/13 第 14 輪 F1 英文介面架構（m/07i18n.js；行為 31、混合 2、原始碼 4） */
  "test-p0-regress.js",   /* 11/13 三個 P0 發布版完整流程回歸 tools/qa/p0-regress.js 的純函式（行為 12、原始碼 1） */
  "test-handoff-facts.js",   /* 11/13 交接單事實段自動產生＋核對公開連結 review_loop/handoff-facts.js（行為 10、原始碼 1；評比工具不在公開副本時整檔跳過；11/15 加 evidence.md 四欄格式） */
  "test-evidence-shots.js",   /* 11/13 第 15 輪 F1／F2／X2 可重現畫面證據包＋英文防爆版檢查（tools/qa/evidence-shots.js 的純函式；行為 16、原始碼 1） */
  "test-android-build.js",   /* 11/13 第 15 輪 F3、F4 Android debug APK 編譯＋可重現檢查 repro-check.js、建置與工具鏈紀錄（行為 9、混合 2、原始碼 1）；11/13 Service Worker 標頭修法正式採用（混合 +1、原始碼 +1） */
  "test-aab-assets-check-1121.js",   /* 11/21 W41① 送審前安裝包內容檢查 xiangqi-android/scripts/check-aab-assets.js（封測 P0-IMG：W21 缺素材、W30 切塊大檔接不回、舊檔；行為 6） */
  "test-preview-build-1121.js",   /* 11/21 W43 Cloudflare PR 預覽建置 source/preview-build.js（版號跟 sw.js 一致、刪超過 25 MB 的檔、寫 404.html；行為 5） */
  "test-device-checks-1121.js",   /* 11/21 W41②③ 升級測試 check-upgrade.js 與 44 畫面破圖掃描 check-scenes.js 的判斷規則（P0-UPD、P0-IMG；離線只算看得到的破圖；測不成立回 2；只准模擬器；更新視窗看 20 秒；行為 12、原始碼 3） */
  "test-jianghu-wind-1121.js",   /* 11/21 W45 十州棋館風向標（m/07z9b-jianghu.js：照共用天氣挑 2～3 派順風、旗號金光、上課與掌門修為多給、每派每天一次；行為 8、原始碼 1）；PR #15 審查後續：掌門盤照開局時記下的順風算、+30 說明（行為 +1、原始碼 +1）；PR #16 審查：有 zmCur 沒有 jw（下到一半）照現在的天氣算 */
  "test-zm-intel-1121.js",   /* 11/21 W48 門內玩法首發：案 4 掌門暗樁（引擎與 App 同一套主修／副修算法、贏門人才解鎖、一天一次）、案 9 掌門盤接關鍵步重練（行為 5、原始碼 3） */
  "test-make-evidence.js",   /* 11/22 W60-A2 證據同次重產：讀驗證紀錄、同一次執行才產生、evidence.md 格式與發布標記、跟 check-evidence.cjs 比對、分類報表、verify-all 執行編號傳遞、指令拒絕不同次（行為 7、原始碼 1） */
  "test-zm-hall-1121.js",   /* 11/21 W48 十派門內場景頁 JhHall（先做中炮門：設定範圍、百分比座標、前院門人、路由順序、圖讀不到退回小卡、立繪疊主位；前院門下棋友：資料、站位、請教與打聽、切磋只指定一次；PR #21 審查兩輪：指定用掉就清、45 秒時限與到期計時器、選單之後才開新局仍坐指定的人、外部指定優先、前院能下的優先（雜湊排前也一樣）；行為 13、原始碼 4，其中原圖檢查在公開副本略過） */
  "test-jh-kick-1122.js",   /* 11/22 W45② 十州踢館令（開發者選單：相剋表、印記＋棋譜＋修為 30、程式畫的戰書旗）：相剋表、定式合法且局面對得上、解鎖條件、開局參數、結算只給一次、再下一盤、小卡內容（行為 11、原始碼 1） */
  "test-android-roadmap.js",   /* 11/13 第 14 輪 F3 Android 路線圖＋可重現驗證包：verify-all.js、xiangqi-android 骨架檢查、F-Droid 草稿、make-www（行為 8、混合 1）；11/13 骨架檢查 native.swclient（行為 +1） */
  "test-fdroid-evidence.js",   /* 11/13 第 13 輪 F2 F-Droid 可建置證據：pikafish-verify.js、release-verify.js（行為 8、原始碼 1） */
  "test-daily.js",   /* 11/13 第 13 輪 F1 每日同題＋無雷分享（m/07dq-daily.js；行為 11、原始碼 2）；第 14 輪 X4 題庫改版名冊＋邊界（行為 +13） */
  "test-ship-tilt.js", "test-home-order.js",   /* 11/13 第 14 輪 X2 星槎傾斜權限不自動問（行為 6、原始碼 1）、首頁焦點順序（行為 5、原始碼 1） */
  "test-focus-modes.js",   /* 11/13 第 12 輪 F4 純淨畫面、X10 老闆鍵＋中斷恢復（行為 15、原始碼 2） */
  "test-blitz.js",   /* 11/13 第 12 輪 F3 快棋模式、動畫最短化、預走（行為 14、混合 1、原始碼 2） */
  "test-premove-online3d.js", "test-park3d-cbfx.js",   /* 11/13 第 13 輪 F3 線上預走＋F4 3D 預走與快棋 3D 動畫（行為 12、原始碼 3）、X6 3D 色弱特效補完（行為 7、原始碼 1） */
  "test-haptics.js", "test-pgn-variations.js",   /* 11/12 第 11 輪 X2 觸覺回饋（行為 11、混合 1、原始碼 1）、X1 棋譜變著（行為 8、原始碼 1） */
  "test-health.js", "test-perfhud.js",   /* 11/12 第 10 輪 F2、效能浮標 */
  "test-health-funnel.js", "test-foss-audit.js", "test-telemetry.js",   /* 11/12 第 11 輪 F2 漏斗報告（行為 11、原始碼 1）、X7 開源授權檢查（行為 7、原始碼 1）、X3 匿名健康摘要（行為 12、原始碼 2） */
  "test-ai-think.js",   /* 11/12 第 11 輪 F4 電腦思考節奏 */
  "test-colorblind.js",   /* 11/12 第 11 輪 F3 色弱模式（m/07cb-colorblind.js；掃描 tools/qa/colorblind-scan.js） */
  "test-park3d-colorblind.js",   /* 11/13 第 12 輪 X1／X6 色弱模式套到 3D 園子（park3d.js PKCB；行為 11、原始碼 2） */
  "test-touch-fixes.js",   /* 11/12 第 11 輪 F1 小螢幕觸控修正（行為 5、混合 2、原始碼 4） */
  "test-lefty.js",   /* 11/13 第 12 輪 F1 左撇子單手模式＋F2 剩餘小目標（行為 10、原始碼 2） */
  "test-beidou-lines.js",   /* 11/12 hspx 北斗斗柄連線 */
  "test-classic-sky.js",   /* 11/13 開發者 iPhone 經典世界：環景毛筆擦掉、Gemini 水墨雲（載不到退回 canvas）、俯視圖七星全標名、經典不放大筆架立牌（行為 9、原始碼 3） */
  "test-park-weather.js",   /* 意見回饋 878 雲跑到地面、雨範圍太小 */
  "test-askbot-city.js",   /* 第 12 輪 X12：小幫手天氣「台北／臺北」都認得 */
  "test-a11y-emoji.js",   /* 11/13 實機旁白：圖示、「・」不再被念出來 */
  "test-docbtns.js",   /* 11/13 說明清單按鈕字超出框 */
  "test-spotfit.js",   /* 11/13 hspx 1098 場景標籤英文疊在一起、聲音提示蓋頂欄 */
  "test-engine-start.js",   /* 11/13 hspx P0 章回棋路殘局開局送錯局面給引擎（不合法著法 g3g4／c3c4、電腦卡住） */
  "test-ui-1113.js",   /* 11/13 hspx：看我的棋力沒反應（P0）、toast 換行規矩、幻影台詞、漂浮畫卷 */
  "test-home-wide.js",   /* 11/13 首頁接 iPad 寬版圖 home_p34／home_l1610：挑圖、退回原圖、座標表、走路節點、網址版本、cover 填滿（07z HMW、07fl xflCover；行為 8、混合 1） */
  "test-ipad-fill.js",   /* 11/13 遊戲畫面都要滿版：iPad／Duo 直向填滿寬度、橫向兩側模糊底（07fl；行為 8、原始碼 1） */
  "test-engine-timeout.js",   /* 11/12 開發者截圖「思考有點久」：引擎沒回應不再永遠等 */
  "test-ai-levels.js",   /* 11/12 第 10 輪 F3：電腦對手透明頁（行為 2、混合 3、原始碼 2） */
  "test-land3d.js", "test-bhmate.js", "test-docs-md.js", "test-net-chaos.js", "test-park3d-bench.js", "test-save-file.js", "test-story0.js",   /* 11/12 晚上逐項分類（第 8 輪證據頁） */
  "test-a11y.js", "test-analysis-cases.js", "test-asian-rules.js", "test-clock-pv.js", "test-coach.js", "test-family.js",
  "test-fb871.js", "test-grade-wording.js", "test-human-ai.js", "test-net-reconnect.js", "test-net-sign.js", "test-park3d-power.js",
  "test-park3d-tap.js", "test-provenance.js", "test-qixing.js", "test-reply-risk.js", "test-report-id.js", "test-repwarn.js",
  "test-resume-state.js", "test-retention.js", "test-rule-handshake.js", "test-ruleset.js", "test-style-loop.js", "test-ui-chatgpt.js",
  "test-xfer.js", "test-zhanggui.js", "test-mvt-hold.js", "test-ui-redundancy.js", "test-stats-kill.js", "test-xqs-tb.js", "test-scene-poems.js", "test-pv-stepper.js", "test-cpuroom-copy.js", "test-quiz-check-exit.js",
  "test-stat-policy.js", "test-park-firstflat.js",
  /* 11/12 第 6 輪評比（ChatGPT 改善清單第 1 項）：本輪新增的 135 項逐項分類（行為 95、混合 25、原始碼 15；拿不準的都往原始碼那邊選） */
  "test-a11y-audio.js", "test-a11y-p16.js", "test-sound-mix.js", "test-blackhole.js", "test-galaxy.js", "test-human-p1.js",
  "test-net-guard.js", "test-ruleset-cases.js", "test-simul3d.js", "test-homeclamp.js",
  "test-zh-lint.js",   /* 11/13 第 12 輪 X12 繁中用字一致性檢查 tools/zh-lint.js（行為 12、原始碼 1） */
  "test-cup-sign.js",   /* 第 9 輪評審：千秋盃報名與賽程廣播簽名（行為 6、原始碼 1） */
  "test-net-link.js", "test-xfer2.js",   /* 11/13 第 12 輪 X11 連線同步頻道（行為 15、原始碼 1）、換手機轉移碼補強（行為 11、原始碼 1） */
  "test-net-linksig.js",   /* 11/13 第 13 輪 X2 同步頻道簽名、防重放、除錯小卡（行為 11、原始碼 1） */
  "test-net-pin.js",   /* 11/13 第 14 輪 F2 開局公開金鑰驗證、千秋盃 k 簽名（行為 13、原始碼 1） */
  "test-threat-weaknet.js", "test-verify-daily.js",   /* 11/13 第 15 輪 X4 威脅模型＋弱網長測（行為 11、原始碼 3）、X5 每日同題公開名冊對照工具（行為 9、原始碼 1） */
  "test-redblue.js",   /* 11/13 紅藍隊 R02 晚到推翻不給好處＋影子鐘（T11）、R01 千秋盃玩家動作簽名（T9）（行為 8、原始碼 1） */
  "test-name-safe.js",   /* 11/13 紅藍隊 r15 R05（威脅模型 I6）名字安全顯示 m/07x4 lbnBad／lbnShow：惡意名字換稱號、正常名字 0 誤擋、兒童看別人一律稱號（行為 6、原始碼 2）；11/13 不雅字詞清單＋誤擋測試、不合格名字對外改送稱號、稱號三選一（行為 +3、原始碼 +2） */
  "test-oss-scan.js",   /* 11/13 原始碼公開前的機密與個資掃描 tools/oss-scan.js（行為 7） */
  "test-xfer4.js",   /* 11/13 紅藍隊 r15 R03（威脅模型 I5）轉移碼 v4：錯碼、過期、重放、竄改分段和說明、舊 8 碼警告（行為 10、原始碼 1） */
  "test-android-oldwebview.js"   /* 11/13 Android 舊 WebView 降級提示、原生 App 不自動重整（m/02-shell.js 兩小段；行為 6、原始碼 1）；test-android-build.js 同日加外部可重建＋發布版（行為 3、混合 1、原始碼 1） */,
  "test-layout-r16.js"   /* 11/13 第 16 輪版面缺陷清零：棋譜庫、大廳、44×44 點選範圍、殘影讓開、量測誤報排除（tools/qa/device-fit.js）（行為 5、混合 1、原始碼 5） */,
  "test-net-notes.js"   /* 11/13 開發者選「只記在對局紀錄」：晚到推翻、千秋盃擋下沒簽名的動作寫進賽後紀錄（net.js notes()、m/07hs-netsig.js nsgNotes、09b 結果視窗、10-db 檢討頁 ℹ；行為 5、原始碼 1） */,
  "test-mp-p2.js"   /* 11/13 Android 三方實測 P2：訊號膠囊不壓棋盤（07hs nsgPos）、網路恢復 5 秒內連回（net.js netBack／FAST_WIN／連線逾時）、觀眾進場棋鐘（obsTk）（行為 7、原始碼 1） */,
  "test-mainquest.js"   /* 11/13 新手體驗第一波：主線電影播放器 07mnf、星槎遠征令／下一步／大禮包 07mnq、殘局解開儀式、電影中通知排隊（行為 8、原始碼 3） */,
  "test-varengine.js"   /* 11/13 黑洞超展開新引擎 src/varengine.js＋worker：走法、擺棋規則、非標準陣容、將死困斃、今日異象、level／weaken；11/13 定案點數＋堆疊加價＋沈方庭九宮優惠（行為 20） */,
  "test-net-start.js"   /* 11/13 開局那一方第一步之前的每步 3 分鐘：每步剩餘照走、判超時不分岔、坐黑判得出紅方超時、重抓不往後挪（net.js arr／ackTurn myStart；行為 4） */,
  "test-redblue-public.js",   /* 11/13 第 17 輪 F3 公開紅藍隊攻擊重現：tools/redblue-cases.js 逐案攻擊＋正常對照；還沒修的用 todo 保持失敗；11/15 第 19 輪第 3 項 R05-bypass、R05-wire 修好改一般測試，另補名字送出端、正常名字、舊版相容（行為 33、原始碼 1；公開副本沒有舊版 net.js 複本，少 4 項） */
  "test-release-sync.js",   /* 11/13 第 17 輪 F1 同版閘門 tools/release-sync-check.js：版本不一致、刻意不發布的行、不該公開的檔都要擋 */
  "test-reload-guard.js",   /* 11/13 開發者 P1 iPhone 3D 絕殺後頁面重載又直接開第二盤：更新延後、對局頁網址改寫、重載後不開新局、勝負先寫入、賽後分析等特效、異常重載紀錄（m/02r-reloadguard.js；行為 8、混合 2、原始碼 2） */
  "test-era-lang.js",   /* 11/14 評比第 17、18 輪 B3 朝代（07-legend storyBookOf／storyEraSync）、B5 英文介面主線（07mnq、07mnf、07t、07bhtl 介面字、首頁下一步、語言範圍說明）、第 18 輪第 4 項舊 8 碼轉移碼停收；11/14 晚加英文頂欄（時辰、登船、節氣、官階、修為）與禮包 Accept 鍵（行為 14、混合 3、原始碼 1） */
  "test-wheel.js",   /* 11/15 黑洞車輪戰 wheel-v1（m/07bhw-wheel.js 的 WHL 純規則：共用靈力、一輪一招、陣眼封招、總輪、引擎佇列與退路、過關判定、結算、存檔接續；三盤版：輪轉、兩勝／兩敗／和局、危險預警、跳盤、舊存檔相容、決定性、縮圖字串；接線原始碼） */
  "test-wheel-3d.js",   /* 11/15 車輪戰 3D（m/07bhw-wheel.js 的 ③；park3d.js 新增 ex.bkey／setTdPad／busy）：視角三態與記住、預設平面、整場一個 3D 實例、換盤直接擺好、哪張完整哪兩張簡化、簡化棋盤的棋子與狀態、點簡化棋盤換盤、鏡頭飛行、3D 開不起來退回平面、離開後資源與畫面收乾淨；DOM、three、park3d 都是假的，3D 畫面本身沒有實機驗收（行為 17、混合 3、原始碼 3） */
  "test-gate-siege.js",   /* 11/15 黑洞・星門圍城 gate-siege-v1 候選（m/07bhg-gatesiege.js 的 GSV 純規則、local.js tdRebuild 部署換手、接線原始碼；第 1、3、6 關） */
  "test-siege-wheel-bench.js",   /* 11/15 第 19 輪評審第 8 項：星門圍城＋車輪戰真引擎基準工具 tools/siege-wheel-bench.js（載 App 原檔、同種子兩次相同、每局欄位齊全、覆寫只改記憶體、摘要與倒掛算法、合併報表；真引擎那幾項在 Node 裡跑 App 的 Pikafish，載不了就略過；行為 9、原始碼 1） */
  "test-party-battle.js",   /* 11/15 七星各自等級的黑洞戰鬥規則（07bhg GSV、07bht BHTD 的 squad：擒子看吃子那顆、被擒看被吃那顆、元氣七種平均、成長放大；07pty squadOf）；本機未發布，test-party- 前綴排除（行為 6、原始碼 1） */
  "test-party-core.js",   /* 11/15 七星陸續加入與各自等級（m/07pty-party.js 的 PTY 純規則、存檔層、接線原始碼；本機未發布，公開證據用 test-party- 前綴排除）（行為 15、原始碼 2） */
  "test-party-wood.js",   /* 11/15 木棋靈（還沒加入的紅子在黑洞巨盤用的木雕棋子人）：x_wood.glb 骨架與五動作、park3d gntWood 切換、DISK；本機未發布 */
  "test-party-novel.js",   /* 11/15 聽書正文前九章換成「六顆星散落」改寫定稿（yunhe-novel.json、重點句 yunhe-keylines.json、匯出工具）；本機未發布 */
  "test-party-hero.js",   /* 11/15 齊轍換新造型（3D 調色版、立繪、預覽圖、對話立繪、DISK、tasks.json、大棋盤背牌、點物件）；本機未發布 */
  "test-party-prologue.js",   /* 11/15 星槎序章 9 關（m/07bhg-gatesiege.js 31～39：擺法、引擎驗過的殘局、吃光卒／援軍擋完過關、解鎖看加入、第 1 關要破 C1、隊長換人）；本機未發布 */
  "test-park3d-river-1116.js",   /* 11/16 黑洞大棋盤全局俯視：放手一律回正面、鏡像河界層照仰角淡出（正面楚河漢界不重影） */
  "test-raid-label-1116.js",   /* 11/16 黑洞選關的星淵急襲卡：戰績寫「贏 N 次／還沒打過」，不再只放閃電加數字 */
  "test-gate-siege-3d.js",   /* 11/15 星門圍城切 3D 星盤（m/07bhg-gatesiege.js 檔尾 gsvFlat 那一段）：視角三態與記住、不再一律平面、舊版塔防與車輪戰不受影響、記號 3D 分類（貼地／直立／頭頂）、gsvFrame 兩種座標、「更多」那顆（06-cpu parkBtn）、3D 開不起來退回平面；DOM 與 park3d 都是假的，3D 畫面本身沒有實機驗收（行為 19、混合 3、原始碼 3） */
  "test-growth.js",   /* 11/15 對戰後的角色成長（m/07grw-growth.js）：快照比對只列有變化的、升級那句、體力只比同一次開 App、結果視窗插入時機（延後、逾時）、減少動態不跳數字；遠征令拿掉、配樂收藏與再看第一章搬到設定聲音頁（07mnq）；08b／07bhw／05b／m.html 接點（行為 9、混合 1、原始碼 4） */
  "test-starter.js",   /* 11/15 新手練習「先走再學」（m/07stq-starter.js）：六任務題目合法、第 4、5 題一步殺照規則判斷、跳過補齊不重複、老玩家判定、存檔版本、電腦退路、05b／07mnq／m.html 接點（行為 5、混合 3、原始碼 4） */
  "test-td-orbit.js",   /* 11/15 開發者：黑洞塔防一指拖曳改成跟開場黑洞對戰一樣繞整球（gntUp、上下不設限），放手回近的正面或盤底 */
  "test-park-garden-1115.js",   /* 11/15 開發者園子三個回報（park3d.js）：俯視時遮篷屋脊墨線收掉、香爐挪到棋盤木框外、幻影棋客半透明（行為 1、混合 1、原始碼 2） */
  "test-bhtd-view-1115.js",   /* 11/15 開發者「黑洞對戰 default 開成全局俯視」（m/07bht-td.js bhtdView）：記成臨陣斜角的重設回全局俯視一次，之後自己選的照舊記住（行為 5、原始碼 1） */
  "test-bh-drift-raid-1115.js",   /* 11/15 開發者選「星槎偏航＝突發的星淵急襲短戰」（m/07bh-blackhole.js bhStart／bhOffer、m/07bht-td.js bhtdRaidDrift）：急襲已開直接開打、沒開照舊選關、觀星臺入口不受影響（行為 7、原始碼 1） */
  "test-fb897-1115.js",   /* 11/15 意見回饋 897：黑洞對局頁的返回鈕照來源回去（不再一律「回星槎」；m/07gxt-guanxing.js gxtBhBack、m/07-legend.js jBack）；楚河漢界改深色粗邊＋亮字、盤底那面補河界與自發光（src/park3d.js）（行為 8、原始碼 3） */
  "test-figview-ghost-1115.js",   /* 11/15 開發者「這個也要一致用有透明度的設定」「13 星系的幻影棋手一樣」：點對手頭像開的 3D 檢視視窗裡，幻影棋客半透明、慢慢呼吸（m/06-cpu.js fig3d 的 FGH／fgGhost，跟 park3d oppGhost 同一組數字）；別的角色不受影響（行為 5、原始碼 2） */
  "test-home-bar-1115.js",   /* 11/15 開發者首頁截圖：回報問題移到快速對局下面、改成跟快速對局／更多玩法同一種大按鈕，三顆的底都帶透明度（m/07z-homemap.js hmGoBar 與樣式）（原始碼 3） */
  "test-fb-todo.js",   /* 11/15 開發者：管理頁（tools/feedback-api.gs）多「📝 待辦事項」分頁——試算表「開發者待辦」分頁 H1 貼一份 JSON，每一批插在最上面、舊的不洗掉，管理頁照日期分批顯示（假試算表跑伺服端函式：行為 6、原始碼 1） */
  "test-watcher-sway-1115.js",   /* 11/15 開發者線上觀戰截圖「紅圈處會一直旋轉」：圍觀小人待機時身體不再左右晃（從上面看腰帶那根深色直條像蹺蹺板一直轉），改成只有頭微微歪（src/park3d.js 每格動作）（原始碼 3） */
  "test-gx-parkinfo-1115.js",   /* 11/15 開發者紫淵對局截圖「修正」：幻譜星門的星系裡點遠方，跳那個星系自己的說明卡，不再跳玩家主題的遠景（山水亭橋）、也不撿朝代珍品（m/07gx-galaxy.js gxParkInfo、m/06-cpu.js parkInfo）（行為 4、原始碼 1） */
  "test-gx-gatepano.js",   /* 11/15 開發者選星頁截圖「重新繪製滿版環景的幻譜星門讓玩家選」「觀星臺有什麼神秘的力量」：直式整個畫面是一圈水墨環景、星球各自去背疊上去、左右拖曳繞一圈（m/07gxp-gatepano.js）；說明卡兩版共用與星碑共鳴文案（m/07gx-galaxy.js）；從星圖石碑進星門的過場（m/07gxt-guanxing.js gxtGate）（行為 9、混合 1、原始碼 3） */
  "test-sw-offline.js",   /* 11/15 hspx 離線 3D 角色變小帥：sw.js 安裝時先存 3D 模型載入器（GLTFLoader.mjs 和它 import 的 .mjs），一般檔案也存 .mjs */
  "test-fb888.js",   /* 11/15 意見回饋 888 iPad 首頁兩指放大縮不回（07x 整頁放大救援、回首頁回 1 倍）、889 669×869 首頁一窄條（07z HMW_PORT 0.89／HMW_SQ、07fl XFL_HOME_MAX）、890 插曲全螢幕頁讓開狀態列（07t .ep-ov）（行為 11、原始碼 3） */
  "test-preload-bg.js"   /* 11/14 評比第 17、18 輪第 5 項背景暫停與按需預載：00-util bgpEvery／bgpOn、09b 預載前景／背景／恢復三段、分區 z:<分區>、別朝代先不下載、閒置才補選讀、省流量、preload-list --retier（行為 12、混合 1、原始碼 1） */
]);
/* 還沒逐項分類的檔（統計列為「待分類」）；新測試檔先放這裡，分好類再移到 CLASSIFIED */
const PENDING = new Set([]);
const KINDS = ["行為", "混合", "原始碼", "待分類"];

const listFiles = () => fs.readdirSync(DIR).filter(f => /^test-.*\.js$/.test(f) && !SKIP.has(f)).sort();
const classified = f => CLASSIFIED.has(f) && !PENDING.has(f);
/* 一項測試的類別：檔案還沒分類＝待分類；名稱開頭〔原始碼〕／〔混合〕；其餘＝行為 */
function kindOf(file, name) {
  if (!classified(file)) return "待分類";
  const n = String(name).trim();
  if (n.startsWith("〔原始碼〕")) return "原始碼";
  if (n.startsWith("〔混合〕")) return "混合";
  return "行為";
}
/* 實際跑一個檔：回傳 [{name, ok}]（只取最上層的測試；TAP 的 \# 與 \\ 還原） */
function runFile(file) {
  let out = "";
  try { out = cp.execFileSync(process.execPath, ["--test", "--test-reporter=tap", file], { cwd: DIR, encoding: "utf8", maxBuffer: 64e6 }) }
  catch (e) { out = (e.stdout || "") + "" }
  const res = [];
  for (const line of out.split(/\r?\n/)) {
    const m = /^(not ok|ok) \d+ - (.*)$/.exec(line);
    if (!m) continue;
    const name = m[2].replace(/\s+# (SKIP|TODO)\b.*$/i, "").replace(/\\#/g, "#").replace(/\\\\/g, "\\");
    const sk = /\s# SKIP\b\s*(.*)$/i.exec(m[2]);   /* 11/14：SKIP＝略過（TAP 裡是 ok，但沒有跑），另外統計、不算通過 */
    res.push({ name, ok: m[1] === "ok", todo: /\s# TODO\b/i.test(m[2]), skip: !!sk, why: sk ? sk[1].replace(/\\#/g, "#").replace(/\\\\/g, "\\") : undefined });   /* 第 17 輪 F3：todo＝還沒修的漏洞（預期失敗），另外統計 */
  }
  return res;
}
/* 不跑測試：數 test( 呼叫處的名稱（第一段字面字串） */
function staticFile(file) {
  const s = fs.readFileSync(path.join(DIR, file), "utf8"), res = [];
  for (const m of s.matchAll(/(?:^|[^\w$.])(?:test|it)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) res.push({ name: m[2], ok: null });
  return res;
}
/* 統計：{ files:[{file, items:[{name,ok,kind}], n:{行為:{all,pass},...}}], total:{...} } */
function tally(mode) {
  const z = () => Object.assign(Object.fromEntries(KINDS.map(k => [k, { all: 0, pass: 0, skip: 0 }])), { todo: { all: 0, xpass: 0 } });
  const total = z(), files = [];
  for (const file of listFiles()) {
    const items = (mode === "static" ? staticFile(file) : runFile(file)).map(x => ({ ...x, kind: kindOf(file, x.name) }));
    const n = z();
    for (const it of items) for (const o of [n, total]) { if (it.todo) { o.todo.all++; if (it.ok) o.todo.xpass++; continue } o[it.kind].all++; if (it.skip) o[it.kind].skip++; else if (it.ok) o[it.kind].pass++ }
    files.push({ file, items, n });
  }
  return { files, total };
}
module.exports = { kindOf, runFile, staticFile, tally, listFiles, CLASSIFIED, PENDING, KINDS, SKIP };

if (require.main === module && !process.env.NODE_TEST_CONTEXT) {
  const mode = process.argv.includes("--static") ? "static" : "run";
  const { files, total } = tally(mode);
  /* W60-A2 證據同次重產：verify-all.js 給了 XQ_TALLY_OUT 就把這一次的逐項結果存成 JSON（帶同一個執行編號 XQ_RUN_ID），
     make-evidence.js 只讀這份、不再自己重跑測試，所以 evidence.md、驗證紀錄、分類報表一定是同一次執行的結果 */
  if (mode === "run" && process.env.XQ_TALLY_OUT) {
    try { fs.writeFileSync(process.env.XQ_TALLY_OUT, JSON.stringify({ runId: process.env.XQ_RUN_ID || null, node: process.version, kinds: KINDS, files, total }) + "\n") }
    catch (e) { console.log("✖ 逐項結果寫不出來（XQ_TALLY_OUT）：" + e.message); process.exitCode = 1 }
  }
  const cell = o => mode === "static" ? String(o.all) : `${o.pass}/${o.all}` + (o.skip ? `（略過 ${o.skip}）` : "");   /* 略過的不算通過，另外標 */
  const head = mode === "static" ? "（只數呼叫處，沒有跑測試；迴圈產生的多項只算一次）" : "（實際跑過；格式＝通過／項數，略過的另外標、不算通過）";
  console.log("測試三類統計" + head);
  console.log(["檔案", ...KINDS].join("\t"));
  for (const f of files) console.log([f.file, ...KINDS.map(k => cell(f.n[k]))].join("\t"));
  console.log(["合計", ...KINDS.map(k => cell(total[k]))].join("\t"));
  const sum = KINDS.reduce((a, k) => a + total[k].all, 0);
  console.log(`\n交接單引用：行為 ${cell(total["行為"])}、混合 ${cell(total["混合"])}、原始碼比對 ${cell(total["原始碼"])}` +
    (total["待分類"].all ? `、待分類 ${cell(total["待分類"])}` : "") + `，共 ${sum} 項。`);
  const pend = files.filter(f => !classified(f.file)).map(f => f.file);
  if (pend.length) console.log("待分類的檔：" + pend.join("、"));
  if (mode === "run") {   /* 11/14：通過、失敗、略過、預期失敗四欄分開，總數不再把略過算成通過 */
    const sm = k => KINDS.reduce((a, x) => a + total[x][k], 0), P = sm("pass"), S = sm("skip");
    console.log(`四欄合計：通過 ${P}、失敗 ${sum - P - S}、略過 ${S}、預期失敗 ${total.todo.all}（其中預期失敗卻通過 ${total.todo.xpass}）；三類項數合計 ${sum}（含略過），預期失敗另計。`);
    const sk = files.flatMap(f => f.items.filter(x => x.skip && !x.todo).map(x => `  ﹣ ${f.file}：${x.name}${x.why ? "（" + x.why + "）" : ""}`));
    if (sk.length) console.log("略過的項目（這個環境跑不了、沒有執行，不算通過）：\n" + sk.join("\n"));
  }
  if (total.todo.all) console.log(`預期失敗（還沒修的漏洞，node:test todo；不算進上面三類）：${total.todo.all} 項，其中「預期失敗卻通過」${total.todo.xpass} 項（${files.filter(f => f.n.todo.all).map(f => f.file + " " + f.n.todo.all).join("、")}）`);
  console.log("說明：原始碼比對只證明程式碼存在，不證明功能會動；測試由開發用的 AI 撰寫，不等於第三方驗證。");
  /* 11/13：有任何一項沒過就回報失敗（結束代碼 1），source/run-tests.js、verify-all.js 才不會把沒過的當成通過 */
  if (mode === "run") { const bad = files.filter(f => KINDS.some(k => f.n[k].pass + f.n[k].skip < f.n[k].all) || f.n.todo.xpass).map(f => f.file);   /* 預期失敗卻通過也算：漏洞可能修好了，要把 todo 改成一般測試 */ if (bad.length) { console.log("✖ 有測試沒過：" + bad.join("、")); process.exitCode = 1 } }
}
