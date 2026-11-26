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
  "test-eye-p3-1125.js",   /* 11/25 W121 真人視角第一輪 P3（平面）：隨行小人不站上棋盤（src/bot3d.js）、輪到電腦時狀態列不寫「輪到你」（m/08b-cpugame.js）、評等說明泡泡自己跳出時不蓋棋盤（m/01-board.js tmxBub av）。14 項行為、2 項〔原始碼〕 */
  "test-eye-3d-1125.js",   /* 11/25 W121 真人視角第一輪 P3（3D）：玩家碰過畫面或按過鍵就不再跳「拖曳轉身」教學（m/06-cpu.js）、3D 操作提示抬到按鈕和小紙條上方（src/park3d.js）。7 項行為、3 項〔原始碼〕 */
  "test-censer-3d-1125.js",   /* 11/25 開發者 iPad 截圖「香爐看起來沒有平放在桌子上、會飄起來」：石桌香爐從往後仰的 2D 立牌換成 3D 青瓷三足爐（src/park3d.js censer3d），三隻腳踩桌面、不出桌緣、不進棋盤木框、白煙從香頭起 */
  "test-maze-illegal-1125.js",   /* 11/25 第 22 輪評比 P2：地底迷宮殘局點到不合棋規的位置不算答錯（m/07z9m-maze.js jhMzLegal 用 XQCore 核對），合法但不是正解才算一次 */
  "test-kid-time-maze-1125.js",   /* 11/25 唯讀審核：兒童模式／家長關大廳啟動不連大廳（m/02-shell.js NET_KIDOFF）、切背景照算家長時間（m/05-settings.js useTick(1)）、迷宮判負後不再接受落子（m/07z9m-maze.js lost） */
  "test-still-here-1125.js",   /* 11/25 W120 延遲執行稽核中、低約 40 處：m/00-util.js 共用 stillHere(ms,fn,ok)（到時還在原頁、ok 成立才做），各處接上；七星加入過場換頁時記下來到安全頁補播。5 項行為（vm 跑 stillHere）、1 項〔原始碼〕 */
  "test-delay-reward-1125.js",   /* 11/25 W119 延遲執行稽核的 4 處高風險：古戰場、千秋殘局、漕運殘局、千秋起手式的修為和珍品不再延後才發（addXP 的 chipDelay、chdGiveRelic 的 fxDelay）；鏡像關卡電腦走子比對同一盤、步數、合法（src/local.js）。3 項行為（vm 跑 addXP）、3 項〔原始碼〕 */
  "test-kaiju-late-1125.js",   /* 11/25 開發者截圖：練功房下到第 5、6 步才跳出開局「紅先」特效。kaijuFx 多 ok 參數，真正要播時（含等過場的重試）再問「同一盤、還沒走子」；練功房、線上對局都帶（m/01-board.js、08b-cpugame.js、09b-preload.js）。6 項行為（vm 跑 kaijuFx）、1 項〔原始碼〕 */
  "test-devmode-native-1124.js",   /* 11/24 D1 送審前（App Store 2.3.1）：原生 App 一律不是開發者模式，存檔帶來的 devMode 不生效；手機網頁、電腦網頁照舊（m/02-shell.js DEVMODE；行為 3） */
  "test-zh-canvas-1124.js",   /* 11/24 W94b 簡體模式：平面棋盤（SVG）與畫布（3D 棋子貼圖、河界）上的字也轉簡體，紅子寫「马」「车」不變罕見字（src/zh.js；行為 5） */
  "test-zh-canvas-1124.js",   /* 11/24 W94b 簡體模式：平面棋盤（SVG）與畫布（3D 棋子貼圖、河界）上的字也轉簡體，紅子寫「马」「车」不變罕見字（src/zh.js；朝代圖片棋子組改底圖＋文字：m/01-board.js、m/06-cpu.js；行為 5、混合 1） */
  "test-osc-fellows-en-1124.js",   /* 11/24 #107 審查後續：修行頁英文「師友」句 oscFellows(sid)[1]——沒找到的秘境人物不列、名單跟中文一一對應並翻譯、全空用英文空句（m/07z9-school.js；行為 2） */
  "test-osc-err-pace-1124.js",   /* 11/24 開發者截圖（看懂失誤）「棋子動太快，玩家看不清楚」：lsnPlay 加節奏參數；修行課常見錯法先停 1.2 秒、每步 1.6 秒、可重看，走錯後反駁每步 1.4 秒；其他課照舊（m/07z7-lesson.js、m/07z9-school.js；行為 3、原始碼 1） */
  "test-jh-maze-fall-1124.js",   /* 11/24 開發者「做一個掉入迷宮的轉場」：從大廳進迷宮才播、該派牆面材質（同源載不到改 CDN）、標題卡、1.2 秒落地／2.4 秒收掉、點一下跳過、減少動態只淡入標題（m/07z9m-fall.js；行為 5） */
  "test-stk-testenv-1124.js",   /* 11/24 開發者「開工單從程式上擋」：測試流量（本機、區網、預覽站、測試房、iOS／Android 模擬器）不送卡住紀錄，正式站與真機照舊（m/05b-save.js stkTestEnv、XQBridgeViewController XQSim/1；行為 2、原始碼 1） */
  "test-stk-testenv-1124.js",   /* 11/24 開發者「開工單從程式上擋」：測試流量（本機、區網、預覽站、測試房、iOS／Android 模擬器）不送卡住紀錄，正式站與真機照舊（m/05b-save.js stkTestEnv、XQBridgeViewController XQSim/1；行為 2） */
  "test-jh-maze-lore-content-1124.js",   /* 11/24 兵卒、飛相迷宮的碑刻內容與像素材質：件數跟地圖 L 一致、中英文齊、走過去讀得到、順序對（m/07z9m-pawn.js、07z9m-elephant.js；行為，每派 1 項） */
  "test-legend-wording-1124.js",   /* 11/24 開發者截圖：石桌往事第二回「她去掰」看不懂，改寫；正本放 source/xiangqi-db/park-legend.json（混合 1） */
  "test-legend-wording-1124.js",   /* 11/24 開發者截圖：石桌往事第二回「她去掰」和三題記盤題（第 4、7、10 步，寫明是哪一步吃掉的那顆）改寫；正本放 source/xiangqi-db/park-legend.json（混合 1） */
  "test-theme-note-1124.js",   /* 11/24 開發者截圖：主題訓練等對局頁的說明框不再跟空白 div 平分高度、不用捲（m/07-legend.js；原始碼 1，版面在瀏覽器量過） */
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
  "test-p0-aab-bound-1122.js",   /* 11/22 W69 流程盤點第 3 項：P0 證據綁住送審 AAB（p0-gate 三份報告同一個 AAB 雜湊、P0-IMG 要 --cdn 且 0、P0-UPD 不准 --no-old-worker）、包裡素材跟 CDN 現行版交叉核對、建包只換清單內舊副本、簽章密碼不上命令列、建包腳本 --home-art 必填；PR #42 審查：版號要等於送審版號、P0-3D Android 12／16 各一份且完整跑、已知問題清單用倉庫那份（行為 7、原始碼 1） */
  "test-p0-canary-1123.js",   /* 11/23 AGENTS.md「P0 出口驗證要難作假」：P0 工具鎖定 tool-pin.js（報告記工具雜湊、閘門比 origin/main）、三項金絲雀（破圖拿掉首頁素材／改雜湊／CDN 404、更新檢查假視窗、3D 自我反測遮罩）、閘門收 Android 12／16 金絲雀；行為 36、混合 2、原始碼 6 */
  "test-app-assets-check-1122.js",   /* 11/22 W69② iOS 送審前安裝包素材檢查 xiangqi-ios/scripts/check-app-assets.js（對應 Android W41①：首頁必要素材、清單 SHA-1、缺圖與切塊大檔、跟 CDN 清單比對、.ipa；反測必紅；--gate 送審閘門沒核對 CDN 就擋、.ipa 出錯也清暫存（PR #41 審查）；行為 8、原始碼 1） */
  "test-preview-build-1121.js",   /* 11/21 W43 Cloudflare PR 預覽建置 source/preview-build.js（版號跟 sw.js 一致、刪超過 25 MB 的檔、寫 404.html；行為 5） */
  "test-device-checks-1121.js",   /* 11/21 W41②③ 升級測試 check-upgrade.js 與 44 畫面破圖掃描 check-scenes.js 的判斷規則（P0-UPD、P0-IMG；離線只算看得到的破圖；測不成立回 2；只准模擬器；更新視窗看 20 秒；行為 12、原始碼 3） */
  "test-cdn-route-1123.js",   /* 11/23 W74～W76（開發者看外部評論後選「步驟 7 移到網頁上線前」「P0 加回退與開關測項」）：cdn-route.js 把 CDN／遠端開關改向，check-scenes --cdn-to／--flags-file／--flags-fail；探測檔讀不到＝測不成立；#74 實跑後補包外檔讀取輪（攔到 0 個 CDN 請求／驗不到包外檔＝2、空資料夾＝1；包裡要比內容；另挑 2～20 MB 包外大檔、至少驗到 3 個；讀取輪背景開跑、短呼叫取回、每檔記時間；包裡有沒有讀 --apk 的檔案清單）；行為 16、原始碼 2 */
  "test-check-flags-1123.js",   /* 11/23 W76 遠端開關真的關得掉：check-flags.js 照代號表一個一個關（冷啟、回前景），再試讀不到；全開時入口就不在、不認得的代號＝測不成立；行為 7、原始碼 1 */
  "test-jianghu-wind-1121.js",   /* 11/21 W45 十州棋館風向標（m/07z9b-jianghu.js：照共用天氣挑 2～3 派順風、旗號金光、上課與掌門修為多給、每派每天一次；行為 8、原始碼 1）；PR #15 審查後續：掌門盤照開局時記下的順風算、+30 說明（行為 +1、原始碼 +1）；PR #16 審查：有 zmCur 沒有 jw（下到一半）照現在的天氣算 */
  "test-zm-intel-1121.js",   /* 11/21 W48 門內玩法首發：案 4 掌門暗樁（引擎與 App 同一套主修／副修算法、贏門人才解鎖、一天一次）、案 9 掌門盤接關鍵步重練（行為 5、原始碼 3） */
  "test-net-failover-1122.js",   /* 11/22 W53 大廳連線「連不上換下一個網址」：沒備援照舊只連主網址、主網址連不上換備援並記住、重開從記住的開始、連上後才斷不換、兩個都不通輪流試、記住的不在清單從頭、正式版備援清單是空的（行為 6、原始碼 1） */
  "test-osc-en0.js",   /* 11/22 W62 門派英文內建 OSC_EN0：門派資料要翻的字串都有英譯、外掛字典還沒下載時派名定式名門人都是英文、中文模式不受影響（行為 3、原始碼 1） */
  "test-make-evidence.js",   /* 11/22 W60-A2 證據同次重產：讀驗證紀錄、同一次執行才產生、evidence.md 格式與發布標記、跟 check-evidence.cjs 比對、分類報表、verify-all 執行編號傳遞、指令拒絕不同次（行為 7、原始碼 1） */
  "test-zm-hall-1121.js",   /* 11/21 W48 十派門內場景頁 JhHall（先做中炮門：設定範圍、百分比座標、前院門人、路由順序、圖讀不到退回小卡、立繪疊主位；前院門下棋友：資料、站位、請教與打聽、切磋只指定一次；PR #21 審查兩輪：指定用掉就清、45 秒時限與到期計時器、選單之後才開新局仍坐指定的人、外部指定優先、前院能下的優先（雜湊排前也一樣）；行為 13、原始碼 4，其中原圖檢查在公開副本略過；11/22 掌門立繪裁掉桌面以下＝坐在桌子後面，原始碼 +1） */
  "test-jh-kick-1122.js",   /* 11/22 W45② 十州踢館令（開發者選單：相剋表、印記＋棋譜＋修為 30、程式畫的戰書旗）：相剋表、定式合法且局面對得上、解鎖條件、開局參數、結算只給一次、再下一盤、小卡內容；W65 戰書段連結字色對比（行為 11、原始碼 2） */
  "test-jh-canal-1122.js",   /* 11/22 W46 十州漕運殘局（門派任務版）：運河四州、時辰換州、真題庫挑題（一～三步殺、殺法標籤）、點船挑題、殘局頁外掛模式驗證、每天每州修為只給一次、漕船圖與退路；11/22 停靠點避開長卷原有的船與岸、船貼水面（行為 7、混合 1、原始碼 2） */
  "test-zm-screen-data-1122.js",   /* 11/22 W48-S2 屏風馬門兩套題庫資料（開發者選單：課堂挑錯著、算盤算帳）：xiangqi-db/art/zmhall/ 兩份題庫（發布時帶到 data/zmhall/）的格式、每手用 core.js 重走合法、壞著是黑方、ok 含 best、答案與分數門檻與子力一致（不跑引擎；引擎分數由 tools/screen-quiz-build.js 產生；行為 7：含網站副本與原始資料一致） */
  "test-zm-shijiao-1122.js",   /* 11/22 W48-S3 仕角炮門「當鋪算兌子」（開發者選單：193 八派第一批）：m/07z9e-shijiao.js 互吃窮舉 7 個手算案例（含雙方停手、過河卒、牽制）、60 題題庫用同一支程式重算、答錯說明、一輪 3 題不重複且打散、每天修為只給一次（行為 8） */
  "test-jh-screen-1122.js",   /* 11/22 W48 屏風馬門門內（開發者：要跟中炮門不同玩法；三種都做、前院不站門人）：守中宮起始局面合法、開局參數、大子淨虧計算、走滿 10 步過關且修為只給一次、淨虧當場失敗、別的對局照舊、挑錯著與算帳每天一次修為、門內設定與 3D 路網；PR #39 審查：換子途中不判失敗；11/22 先棄後取：淨虧後寬限 2 步、取回就清掉、走滿 10 步還虧算輸（行為 13、原始碼 1） */
  "test-jh-gong-1122.js",   /* 11/22 W48 過宮炮門「宣紙蓋子位」（記位，193 第一批）：三級難度、真殘局題庫出題池與有炮優先、一輪三題固定與換日、抽子規則、同種互換算對、每天一次修為（行為 5、原始碼 1） */
  "test-jh-shunpao-1122.js",   /* 11/22 W48-S6 順炮門「搶攻算殺步」（計步）：連將殺步數手算案例、60 題題庫用獨立搜尋重算（少一步殺不了）、示範殺法逐步重放、一輪 3 題、修為一天一次與連對數（行為 6、原始碼 1；PR #53 後改問最快幾步殺、獨立重算） */
  "test-jh-fxqm-legal-1123.js",   /* 11/23 W73 飛相、起馬題目局面合法（Pikafish 棋理驗證：飛相 36% 過河相／出九宮仕、起馬約 5% 黑子超量）：獨立合法檢查、日期模擬 */
  "test-flags-1123.js",   /* 11/23 W72 遠端開關（開發者選單「先做遠端開關，分版先盤點」）：沒列＝開、設定檔到了就關、離線用上一次的、從沒抓到就全開、格式不對不採用、請求不帶身分不走快取 */
  "test-jret-1123.js",   /* 11/23 W80 開局的來處：從門派開的棋局返回門派（門下棋友、挑戰掌門、踢館、守中宮）；再下一盤仍回門派、從渡口驛站開局照舊、12 小時失效；W81 來處依代號分開存（繼續那一盤不被蓋掉）、掌門局標題 */
  "test-core-perft-1123.js",   /* 11/23 W79 主規則 Perft 對 Pikafish（16 個局面 1～3 層）＋左右鏡射、紅黑互換不變式＋走一步再退回 */
  "test-aab-diff-1123.js",   /* 11/23 W79 新舊 AAB 產物比對（開發者選單）：讀 zip 中央目錄、少檔／變 0 位元組／多 debug 檔是紅、暴增是黃、讀不到結束代碼 2 */
  "test-jh-qima-1122.js",   /* 11/22 W48 起馬門「驛馬繞險路」（找路，193 第一批）：傌照真走法（蹩馬腿、不吃子）、險格＝黑方不動能直接吃到、最短安全路線、三級出題（黑子數、步數、起終點安全、沒被將軍、同一天固定）、每天一次修為（行為 5、原始碼 1） */
  "test-jh-halls8-1123.js",   /* W48 其餘八派門內頁：JH_HALL、玩法入口（m/07z9l-halls.js） */
  "test-jh-maze-1123.js",   /* 11/23 W71 中炮門地底迷宮第一層（m/07z9m-maze.js）：vm 跑真的走路、暗匪、光、殘局判斷；兩題殘局用 core.js 獨立重算唯一一步殺 */
  "test-jh-maze-render-1124.js",   /* 11/24 W87c 迷宮回味感：vm 跑閃爍、材質載入（假 three）、斜向方向鈕、W97 提示限次、ptr 防呆、迷路版地圖 BFS；斜俯視、W99 逃跑的介面用原始碼比對（標〔原始碼〕〔混合〕） */
  "test-jh-maze-sack-1124.js",   /* 11/24 W71e① 迷宮：撞到跳不過的糧袋（兩袋並排、後面是牆或石門）回傳 block:"jump"，畫面說「炮只能隔一個子跳」；一般牆不帶、跳得過的照跳（vm 跑 m/07z9m-maze.js；行為 3） */
  "test-android-back-1124.js",   /* 11/24 W100 Android 返回鍵先交給網頁回上一頁：BACK_JS 用 vm 實跑（行為 1）；XQBackHandler、共用版與 mini-26112401 的 MainActivity、變體雜湊（原始碼 2） */
  "test-jh-fanggong-1122.js",   /* 11/22 W48-S4 反宮馬門「活字排局陣」（開發者「門派分給三位平行做完」；選單「照主線次序才算對」）：m/07z9g-fanggong.js 課程主線取出與合法、三級出題（初中只打散黑方、高級紅黑都打散）、照主線次序判對錯並指出第幾步、走不下去指出原因、每天修為只給一次（行為 5、原始碼 1） */
  "test-jh-zm-engine-1123.js",   /* 11/23 W73 順炮、仕角炮、反宮馬棋理修正（Windows Claude 1 用 Pikafish 驗出）：順炮 90 題局面合法（獨立檢查子數、九宮、仕相兵、照面）、引擎最短殺等於答案；仕角炮 60 題引擎條件（吃差 50 cp 內／不吃好 100 cp 以上）、13 題舊題不在；反宮馬 palace_horse_06 例題 b 不出（行為 5、原始碼 1） */
  "test-jh-liepao-1122.js",   /* 11/22 W48-S5 列炮門「擊板記譜局」（開發者「門派分給三位平行做完」）：m/07z9h-liepao.js 課程主線取出與合法、三級步數 4／6／8 與分段 3～4 步、同一輪 3 題開頭不同、判一步分「動錯子／落點錯」、每天修為只給一次（行為 5、原始碼 1） */
  "test-jh-feixiang-1122.js",   /* 11/22 W48-S8 飛相門「築堤擺陣形」（擺陣，193 第 5 節）：三級子數與步數、出題局面合法且同一天固定、最少步數由模組 IDA* 與測試另寫的雙向 BFS 兩套對得上、走法不吃子帥不動、提示最近的子、每天一次修為（行為 6、原始碼 1） */
  "test-jh-xianren-1122.js",   /* 11/22 W48-S7 仙人指路門「探路猜陣勢」（推測，193 第 4 節）：課程第 7～16 課主線合法且布局分類跟黑方第一步動的子一致、三級選項組成、同一天固定、答錯指出第一個分岔、提示最特別的一步、每天一次修為與探路紀錄（行為 5、原始碼 1） */
  "test-check-3d-1122.js",   /* 11/22 W67 封測 P0-3D 真實觸控檢查 xiangqi-android/scripts/check-3d.js 的判斷規則（九個情境、挑候選與安全區、黑洞只試正解、起點點在棋子身上、黑洞背面十字鍵、鏡頭停穩、座標換算、只看棋譜、WebView 位置、用法錯誤結束碼 2；流程盤點第 4、6 項：已知問題要在 .github/p0-known.json 且沒過期、合法落點被蓋住就不算過、同桌紅黑先驗上緣落點；行為 13） */
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
  "test-park3d-stack-1122.js",   /* 11/22 W68 黑洞背面視角前排擋住後排（開發者選「點重疊處跳選單」）：背面從被點的子往後找正後方的疊子、正面不找、疊住跳只有自己子的按鈕且按了＝點那一顆、沒疊／正面／已選子照舊；PR #38 審查：自己的子只有一顆就直接選、點空白處收選單（行為 5、原始碼 2） */
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
  "test-w109-home-cdn.js",   /* 11/25 W109 首頁寬版圖同源 404 時先等 00-util 的 CDN 補抓、CDN 也失敗才退回原圖（07z hmwFail；載入 07z 和 00-util 真正的監聽，行為 3、〔混合〕2） */
  "test-scene-wide-l1610.js",   /* 11/25 W107-L 場景頁 iPad 橫向專用橫式圖（07sw，第一頁錯棋重練經典白天）：選圖門檻、鍵與條目、座標範圍、天氣範圍、原地換圖與退回（含開頁就是橫式圖、00-util CDN 補抓）、手機不動標籤、走路設定；〔混合〕原始碼接線 */
  "test-w107-setmap-l1610.js",   /* 11/25 W107-L 第 1 批：設定頁（07s2）iPad 橫向橫式圖：條目、入口與走路、疊圖座標、smScene 橫式不換日夜圖且疊圖照條目（行為 7、原始碼 1） */
  "test-w107-feedback-l1610.js",   /* 11/25 W107-L 第 1 批：意見回饋頁（07s3）iPad 橫向橫式圖：條目、銅匭順序、疊圖座標、走路、橫式不飛鴿、座標組 GEO、出口 fbpL（行為 6、混合 1、原始碼 1） */
  "test-w107-thememap-l1610.js",   /* 11/25 W107-L 第 1 批：主題訓練頁（07y3）iPad 橫向橫式圖：條目、8 塊牌順序、小牌與小動作從 tmq 算、走路、天氣範圍（行為 4、原始碼 1） */
  "test-w107-termsmap-l1610.js",   /* 11/25 W107-L 第 1 批：名詞頁（07y4）iPad 橫向橫式圖：條目、三通碑格式與順序、標題牌與小動作從 stele 算、tbGeo（行為 4、原始碼 1） */
  "test-engine-ios-threads.js",   /* 11/25 iPad Air 4 實機 Pikafish 多執行緒記憶體越界、電腦不回棋：真正原因是共享記憶體算到一半加大，iPhone／iPad 一開始就給 384 MB、執行緒恢復最多 4 條（src/engine.js）。6 項行為（vm 載入 engine.js、看記憶體大小、建不起 384 MB 的退路和送出的 setoption） */
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
  "test-jh-horse-1126.js",   /* 11/26 W87-2 起馬地底迷宮（m/07z9m-horse.js）：vm 跑無韁野馬循足跡追（慢 LAG 步、不會越追越遠）、蹩馬腿困住、地圖 BFS 與不被撞倒的路線搜尋（狀態含足跡）；題庫用 core.js 獨立重算（最後一步是馬）；〔原始碼〕LF、include 排在屏風馬後面、搖桿說法 */
  "test-jh-same-1126.js",   /* 11/26 W87-2 順炮地底迷宮（m/07z9m-same.js）：vm 跑鹽道暗哨一回合衝兩格、撞牆花一回合轉身、只看正前方、衝到玩家就停（含改壞驗證）；鹽灶點亮與擋視線；地圖 BFS 與不被抓的路；題庫 core.js 獨立重算 */
  "test-jh-opp-1126.js",   /* 11/26 W87-2 列炮地底迷宮（m/07z9m-opp.js）：vm 跑淨面戲軸繞九宮外圈、緊鄰四格＋飛將（隔水溝也看得到、戲箱擋住）（含改壞驗證）；冷光柱點亮整欄；地圖 BFS 與兩種步調差都有不被抓的路；兩段題庫 core.js 獨立重算 */
  "test-jh-corner-1126.js",   /* 11/26 W87-2 仕角炮地底迷宮（m/07z9m-corner.js）：vm 跑朝奉機關只在那一間斜走、只看正在走的那一條斜線（另一條、每邊正中間、出了那一間都看不到、擋光）（含改壞驗證）；銅鏡照亮整條直線；地圖 BFS 與 512 種步調錯開都有不被抓的路；兩段題庫 core.js 獨立重算 */
  "test-jh-palace-1126.js",   /* 11/26 W87-2 反宮馬地底迷宮（m/07z9m-palace.js）：vm 跑墨工傀儡跳日字、反宮挑離工坊中心最遠的落點、蹩馬腿、墨池裡看不到也抓不到（含改壞驗證）；墨池擋光；地圖 BFS 與任一傀儡慢 1～7 回合都有不被抓的路；兩段題庫 core.js 獨立重算 */
  "test-jh-horse2-1126.js",   /* 11/26 W87-2 起馬地底迷宮第二層「烽火暗驛」（m/07z9m-horse2.js）：vm 跑追跡野馬只慢 2 步、碎瓦片踩碎＋野馬那一回合多跳一步＋stop、自動走不踩瓦片、用真的 jhMzStep 搜尋走得過、題庫與改壞驗證 */
  "test-jh-elephant2-1126.js",   /* 11/26 W87-2 飛相地底迷宮第二層「淤泥闈場」（m/07z9m-elephant2.js、jhMzStep 的 afterMove）：vm 跑淤泥一路滑到底、考箱推進淤泥當煞車與還原、自動走不踩淤泥、用真的 jhMzStep 搜尋走得過、題庫（馬收尾殺題＋解殺題）與改壞驗證 */
  "test-jh-pawn2-1126.js",   /* 11/26 W87-2 仙人指路地底迷宮第二層「漏月迷陣」（m/07z9m-pawn2.js、jhMzPath 的 lv.canMove）：vm 跑竹林只能上下直走（onStep 與自動走）、巡竹兵卒過河加左右視線、逐回合模擬走得過（守衛慢 1～7 回合也一樣）、題庫與改壞驗證 */
  "test-jh-maze-layers-1126.js",   /* 11/26 W87-2 地底迷宮換層（m/07z9m-maze.js jhMzLayer／jhMzDeep／jhMzPick、07z9m-fall.js 層數標題、07z9m-central2.js 中炮門第二層示範）：vm 跑登記多層不動第一層、存檔分層、最深層含舊存檔、選層鎖住、門內頁入口、轉場何時播（含改壞驗證） */
  "test-jh-central3-1126.js",   /* 11/26 W87-3 中炮門地底迷宮第三層（m/07z9m-central3.js）：滾動糧桶（滾到底、停在不是空地或有守衛的前一格、擋路擋光擋視線）、車衛＋雙炮衛、地圖與安全路線、題庫 core.js 重算（行為 7、原始碼 1） */
  "test-jh-screen3-1126.js",   /* 11/26 W87-3 屏風馬門地底迷宮第三層（m/07z9m-screen3.js）：轉向石鼓（轉 90 度花一回合、凸起蓋住的格子蹩馬腿、人照樣能走）、連環馬衛（兩隻同方向跳、蹩住一隻一起換方向）、地圖與安全路線、題庫 core.js 重算（行為 7、原始碼 1） */
  "test-jh-palace3-1126.js",   /* 11/26 W87-3 反宮馬門地底迷宮第三層（m/07z9m-palace3.js）：連通墨口（人或傀儡冒到另一頭、另一頭有人冒不出來、傀儡換工坊）、一快一慢兩隻傀儡、地圖與安全路線、題庫 core.js 重算（行為 7、原始碼 1） */
  "test-jh-same3-1126.js",   /* 11/26 W87-3 順炮門地底迷宮第三層（m/07z9m-same3.js）：推移鹽箱（推一格、後面要空地沒守衛、擋路擋光擋暗哨視線）、三個衝刺暗哨、地圖與安全路線、題庫 core.js 重算（行為 7、原始碼 1） */
  "test-jh-opp3-1126.js",   /* 11/26 W87-3 列炮門地底迷宮第三層（m/07z9m-opp3.js）：機關戲帳（踩踏板整排放下或收起、放下擋光不擋路）、兩將衛＋車衛、地圖與安全路線、題庫 core.js 重算（行為 7、原始碼 1） */
  "test-jh-cross3-1126.js",   /* 11/26 W87-3 過宮炮門地底迷宮第三層（m/07z9m-cross3.js）：油布（垂著是炮架、掀起來照亮四周、花一回合）、兩個炮衛、地圖與安全路線、題庫 core.js 重算（行為 7、原始碼 1） */
  "test-jh-maze-save-1126.js",   /* 11/26 W87-2 地底迷宮存檔跟旅程走（m/05b-save.js JOURNEY_KEYS 加 jhMaze*、各層、題目指標）：vm 跑真的 saveSnap／saveApply＋jhMzGet／jhMzSave，十派每層都在清單、兩段旅程互不影響、舊存檔升上來（含改壞驗證） */
  "test-jh-central2-1126.js",   /* 11/26 W87-2 中炮門地底迷宮第二層（m/07z9m-central2.js）：vm 跑雙炮衛看 3 格、另一個炮衛擋住就看不到、前衛不踩水窪（含改壞驗證）；淺水窪多耗一回合、自動走繞開；地圖 BFS、必經走廊、任一炮衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算 */
  "test-jh-screen2-1126.js",   /* 11/26 W87-2 屏風馬地底迷宮第二層（m/07z9m-screen2.js）：vm 跑銅人馬衛地裂不擋馬腿、落不到地裂、石鼓蹩腿、玩家站馬腿、不出廳（含改壞驗證）；地裂擋人不擋光；地圖 BFS、石橋必經、任一銅人慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算 */
  "test-jh-palace2-1126.js",   /* 11/26 W87-2 反宮馬地底迷宮第二層（m/07z9m-palace2.js）：vm 跑墨閘踏板切換閘墨池（漲滿擋路擋光、乾涸平地、原地等不切換、有傀儡不漲、拖回還原）（含改壞驗證）；傀儡路線跟著變；地圖 BFS、任一傀儡慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算 */
  "test-jh-same2-1126.js",   /* 11/26 W87-2 順炮地底迷宮第二層（m/07z9m-same2.js）：vm 跑灰燼激起火星（照亮 5 格、亮 2 回合）、衝刺暗哨同一直線轉向朝火星衝（含改壞驗證）；自動走繞開灰燼；地圖 BFS、任一暗哨慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算 */
  "test-jh-opp2-1126.js",   /* 11/26 W87-2 列炮地底迷宮第二層（m/07z9m-opp2.js）：vm 跑墜落布景（繩扣觸發、擋路擋光、有守衛不落、截斷車衛視線、拖回還原）（含改壞驗證）；自動走繞開繩扣；地圖 BFS、長廊必經、任一守衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算 */
  "test-jh-cross2-1126.js",   /* 11/26 W87-2 過宮炮地底迷宮第二層（m/07z9m-cross2.js）：vm 跑間歇蒸氣（奇數回合噴、擋光擋炮衛視線不擋路、走一步原地等都會換）、炮衛照第一層隔紙架看（含改壞驗證）；蒸氣永遠不噴走不過；地圖 BFS、任一炮衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算 */
  "test-jh-corner2-1126.js",   /* 11/26 W87-2 仕角炮地底迷宮第二層（m/07z9m-corner2.js）：vm 跑可轉銅鏡（順時針轉、算一回合、光束照亮、照到的朝奉眩暈 2 回合、走到旁邊只照亮）（含改壞驗證）；地圖 BFS、任一朝奉慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算 */
  "test-jh-maze-multisol-1126.js",   /* 11/26 W87-2 迷宮殘局接受所有最快殺法（m/07z9m-maze.js jhMzTry／jhMzReply／jhMzNow 照 alt、maze-puzzles.js --multi）：vm 跑第二種殺法也算對、不是最快殺不算、舊題相容；core.js 獨立重算 alt 樹（含改壞驗證） */
  "test-jh-screen-1126.js",   /* 11/26 W87-2 屏風馬地底迷宮（m/07z9m-screen.js）：vm 跑馬型銅人的日字落點、蹩馬腿（石鼓、玩家站在馬腿）、巡邏範圍、地圖 BFS 與不被逮到的路線搜尋；題庫用 core.js 獨立重算（最後一步是馬）；〔原始碼〕LF、include 順序、搖桿說法 */
  "test-jh-cross-1124.js",   /* 11/24 W87 過宮炮地底迷宮（m/07z9m-cross.js）：vm 跑炮型護院視線、走法、地圖 BFS 與不被看到的路線搜尋、碑刻；題庫用 core.js 獨立重算 */
  "test-w101-first-move-1124.js",   /* 11/24 W101 開發者截圖「還沒切到棋盤，掌門就先落子了」：電腦先手的第一步等棋盤真的看得到（3D 建好、開場封面 pk-veil 收掉）再走（src/local.js）〔混合：等待時間 vm 行為 2（含慢機器封面 23 秒）、接線與就緒判斷、park3d 訊號原始碼 2〕 */
  "test-secret-friends-1124.js",   /* 11/24 W96 秘境棋友吸引力第一組：vm 跑 07-legend.js 的尋訪錄集滿保底、散佚手稿撿拾與換線索；畫面接線用原始碼比對（標〔原始碼〕） */
  "test-w92-oldwv-fallback-1124.js",   /* 11/24 W92 舊 WebView 沒有多執行緒時對局改用 Magellan：vm 跑 02-shell 降級那一段；local.js 那一行用原始碼比對（標〔原始碼〕） */
  "test-w106-maze-tex-cdn-1124.js",   /* 11/24 W106 迷宮像素材質同源載不到時改向 CDN 要一次（m/07z9m-maze.js jhMzTexLoad；iMac Claude 2 預驗 #139 發現）〔行為：vm 配假的 TextureLoader 4 項〕 */
  "test-w104-jhgate-1124.js",   /* 11/24 W104 開發者選 ChatGPT 場景盤點 K：十州棋館晚明轉場（m/07z9n-jhgate.js）；在明朝只用簡單淡入〔混合：播不播、文字、星線棋盤格數 vm 行為 3、包裝與載入順序原始碼 1〕 */
  "test-w102-master-gate-1124.js",   /* 11/24 W102 開發者選「改成中炮門的場景」＋ChatGPT 場景盤點 A、B、L：掌門局封面改門派場景（m/07z9-school.js zmGate／zmPlace），驛站旅人、秘境棋友、門下棋友改園子封面與英文（08b-cpugame.js cgGardenGate）〔混合：vm 行為 6、接線原始碼 1〕 */
  "test-w89-mentor-1124.js",   /* 11/24 W89 開發者選 Gemini 文案 2「掌門覆盤」：關鍵步由主修門派掌門（沒拜師用隨行夥伴）講一句，十派四組中英台詞、輸棋不嘲諷（m/07z9o-mentor.js；行為 5、原始碼 1） */
  "test-w107-tablet-board-1125.js",   /* 11/25 W107 開發者「為大螢幕好好設計」第一步：對局頁 iPad 直向放大、橫向兩欄；手機與分割畫面不受影響（m.css；行為 3、原始碼 1） */
  "test-w108-sel-glow-1125.js",   /* 11/25 W108 玩家回饋：選中的棋子底下加柔和光暈（主題強調色、不擋點擊、不動畫；01-board.js；原始碼 3） */
  "test-w126-ipcompat.js",   /* 11/26 W126 iPhone 版在 iPadOS 26 相容視窗裡頂欄讓出視窗鈕（00-util xqIpCompatOf、m.css #topbar 左內距）〔行為 2：vm 跑判斷與 resize 重算；原始碼 1：CSS 規則〕 */
  "test-icon-onerror-1126.js",   /* 11/26 W152 圖示載不到時的備援（m/02-shell.js ETIMG）：組出 onerror 拿去 new Function 編譯並用假 img 實際跑（改抓經典版、換舊圖、換表情文字）；掃所有 m/*.js 的 onerror 不能有反斜線 */
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
  /* W69 流程盤點第 18 項（11/23）：檔裡一項 test() 都沒跑時，node --test 會把「這支檔本身」報成一項通過（名稱＝檔名），
     等於沒測試卻算 1 項通過；還原成 0 項，下面判失敗。載入就壞的檔是「not ok - 檔名」，照常算失敗 */
  if (res.length === 1 && res[0].ok && !res[0].skip && !res[0].todo && res[0].name === file) return [];
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
  /* W69 流程盤點第 18 項（11/23）：一項都沒跑出來的檔（0/0）也算沒過，不然 test() 被包進條件、整段註解掉，CI 照樣綠 */
  if (mode === "run") { const zero = files.filter(f => !f.items.length).map(f => f.file); if (zero.length) { console.log("✖ 測試檔一項都沒跑出來：" + zero.join("、") + "（如果那支檔只有一項、名稱剛好跟檔名一樣，跟「沒跑」分不出來，請把那一項改名）"); process.exitCode = 1 } }
  if (mode === "run") { const bad = files.filter(f => KINDS.some(k => f.n[k].pass + f.n[k].skip < f.n[k].all) || f.n.todo.xpass).map(f => f.file);   /* 預期失敗卻通過也算：漏洞可能修好了，要把 todo 改成一般測試 */ if (bad.length) { console.log("✖ 有測試沒過：" + bad.join("、")); process.exitCode = 1 } }
}
