/* ================= 🌐 介面語言架構（評比循環第 14 輪 F1；評審 P41.1、P41.2、P42.1：外籍漢學玩家、海外玩家要能用英文走完主流程）=================
   做法：「掃描文字節點＋字典替換」，不改各模組的畫面程式。
     ① 字典 I18N_EN：繁中原文（去掉前後的圖示、標點後的那段字）→ 英文；動態句子用 I18N_PAT（正規式＋組字函式），中文記譜轉 WXF 記譜。
     ② i18nText(字)：整句查字典 → 套句型 → 記譜 → 照中文標點（，、；・：。！？（）「」…）切段逐段翻；只要還剩一個中文字就整句不換（不出現半中半英）。
     ③ 選了 English（store "lang"="en"）才裝 MutationObserver：新加的節點、改過的文字、aria-label／title／placeholder 都過一遍；
        原文記在 WeakMap，i18nRevert() 可以原封不動還原。沒選英文就什麼都不裝，繁中、簡體畫面完全照舊。
     ④ 換語言一律重新載入（跟 zh.js 繁簡切換一樣），預設繁中、不自動切；手機是英文系統只跳一次小提示告訴他設定裡可以選。
     ⑤ 讀螢幕（11b-a11y.js）的每步念法、格子念法換成英文：axmMoveLine／axmCellLabel／axmPcName 在英文時換成這裡的版本（指定，不是重新宣告，不撞名），
        axSay、axsAlert 包一層先翻再念。英文記譜用 WXF（C2.5、H8+7；同一路兩子用 +C.5／-R+1），念法寫成完整英文「Cannon 2 traverses to 5」。
   不翻：棋子與印章上的字、3D 園子畫布裡的字、未收錄的劇情與說明文件。第一、二章現有主線與七星星夜茶話會已有英文，範圍見 art/docs/i18n.md。
   不要放進字典的字：隱私、官階、進階（07s2／07s4／07m5 用畫面上的字找段落）（下船、上星槎 11/16 起 07w9 中英都認，已拿掉）、估計棋力（07y9）、正在對戰（07x3）、取代這支手機（07s4）——I18N_GUARD，測試會檢查。
   ⑥ 第 15 輪 X3（評審 P41.1、P41.2、P42.1、P71.2）：字典擴大到設定說明小字、線上大廳與安全、連線狀態小卡、一盞茶、每日同題、棋譜庫、千秋盃、星槎入口；
      核心流程「鍵值化」：I18N_KEY＋i18nT("鍵","中文")／data-i18n="鍵"（08b 對局頁與結果、05-settings 標題、09b 線上結果、底欄），原文改字也不會失效；
      I18N_AGUARD 是別的模組拿來找按鈕的 aria-label／title，英文也不換；英文模式注入 html[lang=en] 的防爆版樣式（I18N_CSS）。
   前綴 i18n／I18N_；測試 xiangqi-lab/tools/test-i18n.js；include 在 m.html 最後（07dq-daily.js 後面）。 */
/* #I18N-PURE-BEGIN：到 #I18N-PURE-END 是不碰畫面的資料與純函式，test-i18n.js 用 vm 直接載入 */
const I18N_CJK=/[㐀-鿿豈-﫿]/;
const I18N_GUARD=["隱私","官階","進階","估計棋力","正在對戰","取代這支手機"];
/* 象棋術語用通行英文；WXF 字母 K A E H R C P */
const I18N_PL={"帥":"K","將":"K","仕":"A","士":"A","相":"E","象":"E","傌":"H","馬":"H","俥":"R","車":"R","炮":"C","砲":"C","包":"C","兵":"P","卒":"P"};
const I18N_PN={K:"General",A:"Advisor",E:"Elephant",H:"Horse",R:"Chariot",C:"Cannon",P:"Soldier"};
const I18N_NUM={"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10};
const I18N_MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/* 字典：鍵＝畫面上的繁中（不含前後圖示、全形驚嘆號問號等，那些 i18nText 會自己處理）；值＝英文 */
const I18N_EN={
"正在播放":"Now playing",
"編鐘":"Bronze bells",
"排簫":"Panpipes",
"塤":"Xun",
"阮":"Ruan",
"箜篌":"Konghou harp",
"笛子":"Dizi flute",
"琵琶":"Pipa",
"洞簫":"Xiao flute",
"古琴":"Guqin",
"馬頭琴":"Morin khuur",
"三弦":"Sanxian",
"二胡":"Erhu",
  "空杯獨弈":"A Solo Game, an Empty Cup",
  "🧑‍🏫 作業成績：…\n…\nXQHW1.……":"Assignment results: …\n…\nXQHW1.…",
  "這個作業連結不完整（可能複製時少了一段）。請教練重新傳一次連結。":"This assignment link is incomplete. Ask your coach to send the full link again.",
  "校驗碼對不上（成績被改過，或複製時少了一段）":"Checksum mismatch (results altered or incompletely copied)",
"App 每 7 天（或名字、段位改變時）會把你在大廳顯示的名字（用「稱號」就是稱號）、裝置代號（這支手機固定的一組隨機碼）、線上段位、使用時間摘要（總時間和最常待的地方）、App 版本、手機種類和螢幕大小送到開發者的 Google 表單，方便查問題、校正難度；不會送棋譜或存檔。另外會匿名記下你在哪一頁停很久、哪裡點了沒反應、哪個走法看不懂（每次開 App 換一組亂數，不含名字和裝置代號），用來改善不好懂的地方。跟電腦下完一盤，也會匿名送出這盤你每一步的評估分數和評語、總分、電腦級數、你的段位（用 App 自己產生的匿名碼，不含名字、裝置代號、棋譜和存檔），用來校正評分方式。做測驗、殘局、讀譜的對錯和秒數、新手引導走到哪一步、成長曲線，也會匿名送出（不含名字和裝置代號），用來校正題目難度、改善新手引導。卡住的地方保留 90 天，對局評分和學習進度保留一年，過期就刪；關掉開關後，手機裡還沒送出的也一起丟掉。意見回饋和檢舉在處理完後保留一年（有停權的保留到停權結束），玩家登記在最後一次登記後保留一年；線上大廳的戰績摘要 90 天沒更新就清，對局棋譜保留 30 天。你可以用下面的開關關掉；家長關閉線上大廳時也不會送。你按「意見回饋」或「檢舉」時，會另外送出你寫的內容和附的截圖（檢舉還會附對方最近的快捷語）。App 不會用網路位置查你在哪裡；線上大廳要不要顯示城市，由你在下面自己選（預設不顯示；用「稱號」的人一律不顯示）。":"Every 7 days, or when your name or rank changes, the app sends your lobby display name (or title), device ID (a random code fixed to this device), online rank, usage summary (total time and most-used areas), app version, device type and screen size to the developer's Google Form for troubleshooting and difficulty calibration. Game records and saves are not included. Anonymous difficulty signals record long pauses, unresponsive taps and unclear moves, using a new random code each session without your name or device ID. After computer games, anonymous per-move evaluations, comments, overall score, computer level and your rank are sent for scoring calibration; these exclude your name, device ID, game record and save. Anonymous quiz, puzzle and study accuracy, time, tutorial progress and growth curves are sent to improve difficulty and guidance. Difficulty signals expire after 90 days; game evaluations and learning progress after one year. Turning off a switch also discards unsent data. Feedback and reports are kept for one year after resolution (or until a suspension ends); registration for one year after the last submission. Lobby summaries expire after 90 days without updates; game records after 30 days. You can turn these off below; disabling the lobby in parental controls also stops submission. Feedback and reports include your message and attached screenshots; reports also include the other player's recent preset messages. The app does not use network location to locate you. Choose whether to show your city below; it is hidden by default and always hidden for title-only names.",
"。不含名字、裝置代號、棋譜、存檔。回報問題時，如果你願意，可以按「複製」貼給開發者。從 2026-11-14 開始記。":". It contains no name, device ID, game records or saves. When reporting a problem, you may copy it and share it with the developer. Recording began on 2026-11-14.",
  "石桌松蔭":"Shade by the Stone Table","古箏":"Guzheng",
  "只存在這支手機":"Stored only on this device","App 不會自動送出":"The app does not send this automatically",
  "用過的天數":"Days used","開 App 次數":"App launches","啟動時間（中位數）":"Startup time (median)",
  "卡頓（長任務）":"Long tasks","圖片載入":"Images loaded","程式載入":"Scripts loaded","資料檔載入":"Data files loaded",
  "儲存空間":"Storage","最常用的功能":"Most-used features","主場":"Home","複製":"Copy","存成檔案":"Save as file","清除":"Clear",
  "申請刪除伺服器上的資料？":"Request deletion of server data?","開發者收到後會刪掉":"The developer will delete the following after receiving your request",
  "意見回饋試算表裡，這支手機送過的意見回饋、檢舉和玩家登記（用裝置代號找）":"Feedback, reports and player registration sent from this device to the feedback spreadsheet (identified by device ID)",
  "線上大廳伺服器上你的戰績摘要和對局棋譜（上線狀態和戰績摘要，手機現在就先清）":"Your game summary and game records on the lobby server (presence and game summary are cleared from the device now)",
  "匿名資料（卡住的地方、對局評分、學習進度）沒有名字和裝置代號，對不到你，所以不需要、也沒辦法刪，會照期限自動刪掉。這筆刪除請求本身會留一年，當作處理紀錄。別人手機上存的對局紀錄刪不到。手機裡的進度不會動（要刪請用隱私說明最下面的「刪除這支手機的全部資料」）。送出後也會關掉「📨 送出玩家登記」。":"Anonymous difficulty signals, game evaluations and learning progress contain no name or device ID, so they cannot be linked to you for deletion. They expire automatically. This deletion request is kept for one year as a processing record. Records on other players' devices cannot be deleted. Your local progress stays; to erase it, use Delete all data on this device at the end of the privacy notice. Sending this request also turns off player registration.",
  "送出申請":"Send request","匯入":"Import","題目":"Puzzle","完成":"Completed","匯出 CSV":"Export CSV","複製 CSV":"Copy CSV",
  "校驗碼對不上（被改過或沒貼完整）":"Checksum mismatch (altered or incomplete report)",
  "背景音樂已開始播放，可到設定→聲音調整":"Music is playing. Adjust it in Settings → Sound.",
  "小帥Q版":"Little General — Chibi",
  "關掉後定軌力不扣、不會化墨退場回星槎，也沒有「心定則棋穩」修為加成，頂欄和各地點的兩條收起來；星芒照常累積，進黑洞、點亮星圖照樣能用":"When off, Stability is not spent and you will not be sent back to the raft. Its cultivation bonus and both status bars are hidden. Starlight still accumulates and can be used for the Black Hole and star chart.",
  "怎麼跟":"How to",
  "互動":"interact",
  "問":"Ask",
  "問題":"a question",
  "目前的官階":"Current official rank",
  "到「挑戰電腦 → 🥇 晉級賽」贏棋升段，":"Win ranked computer games to advance your chess rank.",
  "就跟著升官（九品官 → 一品官），官服、頂戴、腰帶都會換":"Your official rank rises from Grade 9 to Grade 1, changing your robe, hat and belt.",
  "背景音樂與鼓聲":"Music and drums",
  "朝代古風曲、過場鼓聲":"Dynasty music and transition drums",
  "換一首":"Next track",
  "「吃！」「將軍！」":"Capture! / Check!",
  "音量":"Volume",
  "全部靜音":"Mute all",
  "棋子音效":"Piece sounds",
  "落子、吃子、將軍「鏘」、開局鼓鑼":"Moves, captures, check and opening drums",
  "提示音":"Audio cues",
  "聲音方位與動作提示音（🎧 開了才有）":"Position and action cues (headphone mode required)",
  "音效圖鑑":"Sound guide",
  "系統・隱私・家長":"System · Privacy · Parents",
  "聲音方位與動作提示音":"Position and action cues",
  "以左右聲像提示棋子在第幾路，不同動作不同音色；可先試聽。（現在跟著螢幕報讀模式）":"Stereo position indicates the file; each action has a distinct sound. Try the preview. Currently follows screen reader mode.",
  "試聽左右":"Preview left / right",
  "家長與護眼":"Parents and eye breaks",
  "護眼提醒":"Eye-break reminders",
  "開（每玩 30 分鐘，看遠方 20 秒）":"On (look into the distance for 20 seconds every 30 minutes)",
  "每天最多玩":"Daily play limit",
  "不限制":"No limit",
  "幾點以後不能玩":"Stop playing after",
  "今天玩了":"Played today",
  "開啟兒童模式（家長）":"Enable child mode (parent)",
  "家長修改":"Parent controls",
  "兒童模式說明":"About child mode",
  "大廳安全須知":"Lobby safety",
  "時間到了，正在下的那盤可以下完，下完就回首頁休息；明天自動重新算。家長答對確認題，可以再加 15 或 30 分鐘。遊玩時間＝App 畫面開著的時間。":"When time is up, finish the current game, then return home for a break. The allowance resets tomorrow. Parents can answer a verification question to add 15 or 30 minutes. Play time counts while the app is visible.",
  "隱私與資料使用":"Privacy and data use",
  "我的名字":"My name",
  "這個名字會顯示在線上大廳和對戰裡。":"This name appears in the online lobby and games.",
  "難度只管星槎裡的電腦對手和千秋殘局的題目。隨時可以換；已經停靠的站、學會的棋理都不會收回。":"Difficulty affects raft computer opponents and journey puzzles. Change it anytime; visited stops and learned lessons stay unlocked.",
  "新手～入門1・練子力、一步殺、不漏子":"Beginner to Novice 1 · Pieces, mate in one and avoiding losses",
  "入局":"First Steps",
  "破陣":"Breakthrough",
  "國手":"Master",
  "千秋":"Qianqiu",
  "入門2～業1・練2～3 步殺、捉雙、抽將":"Novice 2 to Amateur 1 · Mates in 2–3, forks and checking attacks",
  "業2～業4・練多步殺、棄子攻殺、基本殘局":"Amateur 2–4 · Longer mates, sacrifices and basic endgames",
  "業5～業7・練長殺、大師收官、防守妙手":"Amateur 5–7 · Long mating lines, master endgames and defence",
  "業8 以上・練大師實戰的關鍵著、古譜校錯":"Amateur 8+ · Master decisions and corrections to classical studies",
  "錯誤":"Bug",
  "申冤":"Appeal",
  "建議":"Suggestion",
  "招諫":"Suggestions box",
  "延恩":"Appeals box",
  "寫信":"Write a message",
  "立軸山水":"Landscape scroll",
  "青瓷畫缸":"Celadon scroll jar",
  "筆架和石硯":"Brush rack and inkstone",
  "太湖石":"Taihu rock",
  "窗外的竹子":"Bamboo outside",
  "香几上的油盞":"Oil lamp",
  "蠟丸":"Wax seals",
  "薛濤箋":"Letter paper",
  "收起":"Close",
  "類型":"Type",
  "東西壞了":"Something is broken",
  "想要新功能":"Feature request",
  "想說的話":"Your message",
  "內容":"Message",
  "附件（選填）":"Attachments (optional)",
  "截圖":"Screenshot",
  "最多 4 張":"Up to 4 images",
  "檔案":"File",
  "程式碼、文字檔":"Code or text files",
  "聯絡方式（選填）":"Contact (optional)",
  "蓋印送出":"Seal and send",
  "會一起附上：你的線上 ID、名字、段位、App 版本、裝置類型和目前畫面，方便找問題。":"Your online ID, name, rank, app version, device type and current screen are included to help diagnose the issue.",
  "還沒有修正紀錄":"No fixes recorded yet",
  "請先寫下內容":"Please write a message first.",
  "貼上學生傳來的成績":"Paste students' results",
  "學生在作業頁按「📋 複製成績」傳給你的整段文字，可以好幾位一起貼。App 會檢查每份的校驗碼（被改過會標出來）；成績只存在這支手機，不會上傳。":"Paste the full text students send using Copy results. You can paste several reports at once. Checksums flag altered reports; results stay on this device and are not uploaded.",
  "貼上成績":"Paste results",
  "沒有找到成績。請貼學生「📋 複製成績」的整段文字（最後一行是 XQHW1. 開頭）。":"No results found. Paste the complete Copy results text; the final line starts with XQHW1.",
  "還沒有成績。學生做完作業後，請他按「📋 複製成績」把整段傳給你，貼到上面。":"No results yet. Ask students to use Copy results after their assignment, then paste their full report above.",
  "這份作業的編號壞掉了":"This assignment ID is invalid",
  "沒一次答對":"Not correct on first attempt",
  "一次對":"First try",
  "第一次就答對":"Correct on first attempt",
  "總用時":"Total time",
  "清掉這份":"Delete these results",
  "「沒一次答對」＝第 2 次以後才答對，或看了答案；沒做的另外算。CSV 可以用 Excel、Google 試算表打開。":"Not correct on first attempt means solved after a retry or viewed the answer. Unattempted puzzles are counted separately. Open CSV files in Excel or Google Sheets.",
  "錯因與弱點":"Attempts and areas to practise",
  "錯因只看「走錯幾次、用時、有沒有看答案」，不猜學生在想什麼。":"Categories use mistakes, time and answer views only. They do not infer what a student was thinking.",
  "這份作業大家都一次就對":"Everyone solved this assignment on the first attempt",
  "這份作業最弱的主題":"Topics needing practice",
  "學生":"Student",
  "作業":"Assignment",
  "題數":"Puzzles",
  "一次就對":"First-try success",
  "最弱的主題":"Topics to practise",
  "想很久":"Long thinking time",
  "計算不穩":"Calculation needs practice",
  "多次試錯":"Repeated attempts",
  "不會解":"Answer viewed",
  "沒做完":"Unfinished",
  "一次就對，但超過 3 分鐘：會，還不熟":"Solved first try, but took over 3 minutes; more practice may help.",
  "第 2～3 次才答對：方向對，算得不夠深或漏看一步":"Solved on attempt 2–3; review the calculation for missed moves.",
  "第 4 次以後才答對：比較像在猜，建議回頭看這個主題的基本型":"Solved on attempt 4 or later; revisit the basic pattern.",
  "看了答案：這個主題還沒學會":"The answer was viewed; revisit this topic.",
  "打開過但沒有答對、也沒看答案":"Opened but not solved; answer not viewed.",
  "清掉這份作業在這支手機上的所有學生成績？":"Delete all students' results for this assignment on this device?",
  "校驗碼對不上（可能被改過或沒貼完整），這份不收":"Checksum mismatch. The report may be altered or incomplete; it was not imported.",
  "教練作業":"Coach assignments","出作業":"Create assignment","收成績":"Collect results",
  "挑題目組成一份作業":"Choose puzzles for an assignment",
  "學生打開連結就照順序做；做完畫面會顯示每題第幾次答對、用了多久，可以「複製成績」傳回給你，再到「收成績」彙整。題號都編在網址裡，不需要伺服器，也不收集任何資料。":"Students open the link and solve the puzzles in order. Their results show attempts and time for each puzzle. They can copy their results and send them to you to collect here. Puzzle IDs are stored in the link; no server or data collection is needed.",
  "從下面點題卡加進來":"Tap puzzle cards below to add them","產生作業連結":"Create assignment link",
  "主題訓練題":"Tactics practice","選主題":"Choose a theme","由易到難":"Easiest first","點題卡加入或取消":"Tap cards to add or remove",
  "例如：第 3 週・馬後炮":"Example: Week 3 — Horse and cannon","連將":"Repeated checks","棄子":"Sacrifice",
  /* ChatGPT: English UI audit, 2026-11-14. */
  "總覽":"Overview",
  "課簿・對局紀錄":"Game history",
  "手卷・我的成長":"My progress",
  "棋桌・電腦":"Computer games",
  "紗燈・線上":"Online games",
  "抽將":"Check and win material",
  "捉雙":"Fork",
  "閃擊":"Discovered attack",
  "牽制":"Pin",
  "引離":"Deflection",
  "悶宮":"Smothered mate",
  "嗨！我是小帥。長按我，可以問我任何象棋問題！":"Hi, I'm Xiaoshuai! Press and hold me to ask a xiangqi question.",
  "躺著跟你揮揮手":"Waves to you while lying down",
  "要開「螢幕報讀與鍵盤模式」嗎？":"Turn on screen reader and keyboard mode?",
  "你的系統開了「減少動態效果」。開了以後下棋用平面棋盤，每一格都念得出來，方向鍵移動、Enter 選子落子，每一步也會念出來，裝飾動畫會關掉。":"Your system has Reduce Motion enabled. This mode uses a flat board, reads each square and move aloud, and turns off decorative animations. Use arrow keys to navigate and Enter to select or move a piece.",
  "看起來你在用鍵盤操作。開了以後下棋用平面棋盤，每一格都念得出來，方向鍵移動、Enter 選子落子，每一步也會念出來，裝飾動畫會關掉。":"It looks like you are using a keyboard. This mode uses a flat board, reads each square and move aloud, and turns off decorative animations. Use arrow keys to navigate and Enter to select or move a piece.",
  "你的系統開了強制色彩（高對比）。開了以後下棋用平面棋盤，每一格都念得出來，方向鍵移動、Enter 選子落子，每一步也會念出來，裝飾動畫會關掉。":"Your system has forced colors (high contrast) enabled. This mode uses a flat board, reads each square and move aloud, and turns off decorative animations. Use arrow keys to navigate and Enter to select or move a piece.",
  "先不用":"Not now",
  "原本的樣式，可配淺色／深色":"Original style, available in light or dark",
  "秦・玄黑":"Qin · Black lacquer",
  "秦尚黑：黑漆、青銅、回紋":"Qin's favored black: lacquer, bronze, and geometric borders",
  "漢・漆朱":"Han · Red lacquer",
  "漢代漆器：朱紅配黑、雲氣紋":"Han lacquerware: red and black, with cloud motifs",
  "三國・烽火":"Three Kingdoms · Beacon fires",
  "鐵甲、戰旗、赤壁之火":"Iron armor, battle banners, and the fires of Red Cliffs",
  "魏晉・竹林":"Wei–Jin · Bamboo grove",
  "竹林七賢：竹青、淡墨":"The Seven Sages: bamboo green and pale ink",
  "南北朝・石窟":"Northern & Southern Dynasties · Grottoes",
  "雲岡龍門：砂岩、蓮花、石青":"Yungang and Longmen: sandstone, lotus flowers, and mineral blue",
  "隋・運河":"Sui · Grand Canal",
  "大運河：水波、青灰":"The Grand Canal: rippling water and blue-gray",
  "唐・三彩":"Tang · Three-color glaze",
  "盛唐：赭紅、金、三彩、寶相花":"High Tang: ochre red, gold, three-color glaze, and floral motifs",
  "五代・夜宴":"Five Dynasties · Night banquet",
  "韓熙載夜宴圖：夜色、硃砂、石綠":"The Night Revels of Han Xizai: night tones, cinnabar, and mineral green",
  "宋・汝窯":"Song · Ru ware",
  "雨過天青：素雅、冰裂紋":"Sky blue after rain: understated colors and crackled glaze",
  "元・青花":"Yuan · Blue-and-white porcelain",
  "青花瓷：鈷藍、白釉、纏枝":"Blue-and-white porcelain: cobalt, white glaze, and scrolling vines",
  "明・宮牆":"Ming · Palace walls",
  "紫禁城：紅牆、黃琉璃、萬字紋":"The Forbidden City: red walls, yellow glazed tiles, and interlocking motifs",
  "清・琺瑯":"Qing · Enamel",
  "明黃、景泰藍、龍鱗紋":"Imperial yellow, cloisonne, and dragon-scale patterns",
  "跟著頁面風格":"Match the page style",
  "立體木紋":"Raised wood",
  "經典木紋":"Classic wood",
  "淺色楓木":"Light maple",
  "青竹":"Green bamboo",
  "湖水藍":"Lake blue",
  "石板灰":"Slate gray",
  "宣紙":"Xuan paper",
  "紅木":"Rosewood",
  "大理石":"Marble",
  "黑金":"Black and gold",
  "夜間":"Night",
  "千秋休閒":"Qianqiu casual",
  "臺灣棋規":"Taiwan rules",
  "雲河星槎、渡口出現「🌀 立體」按鈕，按了才會詢問「動作與方向」權限；螢幕報讀模式預設不出現（現在跟著螢幕報讀模式）":"Adds a 3D button to the Star Raft and ferry. Motion and orientation permission is requested only when you tap it. Hidden by default in screen reader mode (currently follows that mode).",
  "省電模式":"Power saving",
  "3D 園子降一點畫質、停掉飄落葉和晃動，沒在動的時候少畫幾次，舊手機比較不燙、不耗電":"Lowers 3D garden detail, stops falling leaves and swaying, and draws fewer frames while idle to reduce load on older phones.",
  "自動":"Auto",
  "目前：還沒進過園子（進園子下一會兒再回來看）":"Status: no garden session yet. Play there briefly, then check again.",
  "3D 效能量測（10 秒）":"3D performance check (10 seconds)",
  "畫裡可以點的東西：":"Objects you can explore:",
  "舢板":"Sampan",
  "垂柳":"Weeping willow",
  "青石拱橋":"Stone arch bridge",
  "石鼓凳":"Drum-shaped stone stool",
  "千秋松":"Qianqiu pine",
  "遠山":"Distant mountains",
  "粉牆黛瓦":"White walls and dark tiles",
  "船形茶碾":"Boat-shaped tea grinder",
  "木茶碾":"Wooden tea grinder",
  "竹夾和竹則":"Bamboo tongs and tea scoop",
  "生鐵鍑":"Cast-iron cauldron",
  "陶臼和木杵":"Earthenware mortar and wooden pestle",
  "長柄瓢":"Long-handled ladle",
  "陶釜":"Earthenware kettle",
  "陶風爐":"Earthenware brazier",
  "白梅和太湖石":"White plum blossoms and Taihu rock",
  "銅燭台":"Bronze candlestick",
  "素面圓柱和柱礎":"Plain round pillars and their bases",
  "直欞欄杆":"Straight-baluster railing",
  "露明的樑和椽子":"Exposed beams and rafters",
  "欄杆外的竹和松":"Bamboo and pine beyond the railing",
  "盡頭敞開的門":"Open door at the far end",
  "白絹紗燈":"White silk lantern",
  "白紗燈籠":"White gauze lantern",
  "素面書案":"Plain writing desk",
  "廊邊的窗":"Window by the corridor",
  "羅漢床":"Luohan daybed",
  "棋盒":"Piece box",
  "腳踏":"Footstool",
  "硯台":"Inkstone",
  "琴桌":"Qin table",
  "香几":"Incense stand",
  "燈檠":"Lamp stand",
  "↩ 掀簾・回雲弈閣":"↩ Back to Play",
  "↩ 掀簾・回觀星閣":"↩ Back to Play",
  /* 頂欄、底欄、共用按鈕 */
  "象棋千秋":"Xiangqi Qianqiu","首頁":"Home","線上":"Online","棋譜":"Library","設定":"Settings","返回":"Back","回首頁":"Home","更多":"More",
  "關閉":"Close","取消":"Cancel","確定":"OK","繼續":"Continue","結束":"End","下一步":"Next","上一步":"Previous","自動播放":"Autoplay","分享給朋友":"Share with friends",
  "開啟螢幕報讀與鍵盤模式":"Turn on screen reader & keyboard mode","螢幕報讀與鍵盤模式：開著（按一下關掉）":"Screen reader & keyboard mode: on (tap to turn off)",   /* 0540 驗收：英文讀屏第一個碰到的按鈕 */
  "回報問題":"Report a problem","意見回饋":"Feedback","我的角色":"My character","加到主畫面":"Add to Home Screen","線上大廳":"Online lobby","走回雅間":"Back to the private room",
  "雅間":"Private room","星槎":"Star Raft","渡口":"Ferry","主題訓練":"Theme training","訓練營":"Boot camp","千秋盃":"Qianqiu Cup","車輪戰":"Simul","棋理體驗":"Lessons",
  "小實驗":"Lab","今日推薦":"Today's picks","百科":"Codex","週報":"Weekly report","信房":"Mailroom","棋譜庫":"Game library","🔇 點任意處喚醒聲音":"🔇 Tap anywhere to enable sound",
  /* 首頁滿版圖、學習／對戰入口（名字跟著朝代換，英文統一成一個叫法） */
  "雲河星槎":"Star Raft","對戰":"Play","學習":"Learn","同桌對弈":"Pass and play","同桌對弈：兩人共用這台裝置":"Pass and play: two players share this device","快速對局":"Quick game",
  "不用選":"no setup","不算段位":"unrated","接著下":"Continue","線上對局":"Online game","沿用上次難度":"same level as last time","學走第一手":"Learn your first move",
  "從新手訓練營開始":"Start with Boot Camp","看懂一步，敢下一盤":"Understand one move, then dare to play a game","千秋時光之苑":"Qianqiu Garden of Time","楚河渡口棋鎮":"Chu River Ferry Town",
  "藏譜石窟":"Archive Grotto","雲弈閣":"Cloud Chess Pavilion","學室":"Study hall","太學":"Imperial Academy","國子學":"Imperial Academy","國學":"Imperial Academy","國子寺":"Imperial Academy",
  /* 平日體力：定軌力、星芒、化墨退場（07dgl-stamina.js，開發者 11/13） */
  "定軌力":"Orbit stamina","星芒":"Starglow","定軌力（紅）":"Orbit stamina (red)","星芒（藍）":"Starglow (blue)","元氣":"Vitality","靈力上限":"Spirit cap","攻擊":"Attack","黑洞裡的你":"You in the Black Hole","我的角色頁":"My character page",
  "定軌力耗盡，化墨退場——回星槎歇息。":"Orbit stamina spent: dissolving into ink. Back to the Star Raft to rest.","在人間（下船以後）每分鐘少 1；在星槎上不會少。":"In the human world (after leaving the raft) it drops 1 per minute; on the Star Raft it doesn't drop.",
  "體力上限是全隊的體力，進黑洞開局也是這個數，現在是":"Your stamina cap is the whole team's stamina, the same number you start a Black Hole stage with; right now it is","；夥伴加入、升級都會跟著變。":"; it changes when companions join or level up.",
  "現在體力":"Stamina now at","體力到":"With stamina at","以上，得到的修為":"or more, the XP you earn is","；到":"; at","以上是":"or more it is","學會":"unlocks","全隊體力":"Team stamina","（人間、黑洞都是這個數）":"(the same number in the Black Hole and in the human world)",
  "在人間（下船以後）大約":"In the human world (after leaving the raft) it lasts about","分鐘用完；在星槎上不會少。":"minutes; on the Star Raft it doesn't drop.","下完一盤棋、解完一題，各回":"Finishing a game or solving a puzzle each restores","點。":".",
  "黑洞過關回":"Clearing a Black Hole stage restores","點，一天最多回":", with a daily limit of","離開 App 的時間也會慢慢回，跟在星槎上歇息一樣。":"Time away from the App also restores it, just like resting on the Star Raft.",
  "用完了會化墨退場，回星槎歇息：大約":"When it runs out you dissolve into ink and rest on the Star Raft: in about","分鐘回到":"minutes it is back to","點，就能再下船。":", and you can go ashore again.",
  "下完一盤棋、解完一題，各回 2。":"Finishing a game or solving a puzzle restores 2 each.","黑洞過關回 20；關掉 App 再打開就回滿。":"Clearing a Black Hole stage restores 20; closing and reopening the app refills it.",
  "用完了會化墨退場，回星槎歇息：船上每分鐘回 3，回到 15 就能再下船。":"When it runs out you dissolve into ink and rest on the Star Raft: it restores 3 per minute there, and at 15 you can go ashore again.","線上大廳、千秋盃不用定軌力。":"The online lobby and the Qianqiu Cup don't use orbit stamina.",
  "解殘局、主線過關，各得 1 點，最多存 5 點。":"Solving endgames and clearing main-story stages earn 1 each, up to 5.","進黑洞時，星芒會變成開局靈力，用掉多少扣多少。":"Entering the Black Hole turns starglow into starting spirit; only what is used is spent.","提示照舊免費，不用花星芒。":"Hints stay free; they never cost starglow.",
  "修為愈高，這三樣都會慢慢長。進黑洞時，身上的星芒會變成開局靈力。":"All three grow as your cultivation rises. Entering the Black Hole turns your starglow into starting spirit.",
  "下了船，每走一會兒就要花一點定軌力；下完一盤棋、解完一題都能補回來。":"Off the raft, walking around slowly uses orbit stamina; finishing a game or solving a puzzle tops it up.","在人間走動，每過一會兒就要花一點定軌力；下完一盤棋、解完一題都能補回來。":"Moving around the human world slowly uses orbit stamina; finishing a game or solving a puzzle tops it up.",
  "定軌力微弱，星槎旅人要歇一會兒啦。":"Orbit stamina is low - time for the raft traveler to rest a while.","在星槎上歇息，回到 15 就能再下船。":"Resting on the Star Raft; at 15 you can go ashore again.","在星槎上歇息：每分鐘回 3，回到 15 就能再下船":"Resting on the Star Raft: restores 3 per minute; at 15 you can go ashore again",
  "人間會用，星槎會回":"Drains in the human world, refills on the Star Raft","滿格加成":"Full bonus","穩定加成":"Steady bonus","未達加成":"No bonus yet","歸零會化墨退場":"At 0 you dissolve into ink","人間":"Human world","／分":"/min","下棋解題":"Games & puzzles","下棋／解題":"Games / puzzles","黑洞過關":"Black Hole clear","歸零回星槎":"At 0: back to the raft","黑洞對局裡不扣定軌力。":"Black Hole games don't use orbit stamina.","心定則棋穩：定軌力一半以上，下棋、解題得到的修為多一成；滿格多兩成。":"Steady mind, steady play: with orbit stamina at half or more, games and puzzles give 10% more XP; when full, 20% more.","解題過關得，星宿黑洞用":"Earn it from puzzles and stages; spend it on stars and Black Holes","來源":"Earn","用途":"Spend","主線":"Main story","星宿":"Lunar mansions","點／宿":"each","已點亮":"Lit","黑洞開局靈力":"Black Hole starting spirit","在觀星臺可以點亮二十八宿星圖：每宿 2 點。":"At the Observatory you can light up the Chart of the 28 Lunar Mansions: 2 points per mansion.","最多補到靈力上限。":"It fills up to your spirit cap at most.","修為越高，三項越強":"More XP, stronger in all three","星芒變開局靈力":"Starglow becomes starting spirit","定軌力細則":"Orbit stamina details","星芒細則":"Starglow details","黑洞細則":"Black Hole details","快回星槎":"Head back to the raft soon","定軌力用完了":"Orbit stamina used up","這一盤下完、這一題解完，就要回星槎歇息。":"After this game or puzzle you'll return to the Star Raft to rest.","化墨退場中":"Dissolved into ink","下船倒數":"Ashore in","分鐘":"min","可下船":"Go ashore","平日體力已關閉":"Daily stamina is off","不扣、不退場、無加成":"No drain, no ink exit, no bonus","平日體力已在設定裡關掉：定軌力不扣、不會化墨退場，也沒有「心定則棋穩」修為加成。":"Daily stamina is turned off in Settings: orbit stamina doesn't drain, you won't dissolve into ink, and there's no \"steady mind\" XP bonus.",   /* 11/14 角色卡視覺化（07dgl） */
  "臺灣暗棋":"Taiwanese Dark Chess","暗棋規則":"Dark Chess rules","完整規則":"Full rules","暗棋是在臺灣很流行的象棋玩法：棋子先蓋著，翻開才知道是哪一顆。":"Dark chess is a xiangqi game that is very popular in Taiwan: all pieces start face down, and you only find out what a piece is when you turn it over.","翻開才知道是哪顆棋；大吃小，兵能吃帥，炮要隔一顆跳著吃。":"Turn a piece over to see what it is. Bigger captures smaller, a soldier can capture the general, and a cannon captures by jumping over one piece.","32 顆棋蓋在 4×8 格裡，輪流翻棋或走棋；大可吃小、同級可吃，兵可吃帥、帥不可吃兵，炮隔一子跳吃，不連吃；50 手沒有吃子也沒有翻棋就算和棋。":"32 pieces lie face down on a 4×8 board. Take turns turning a piece over or moving one. A piece can capture smaller or equal pieces; a soldier can capture the general, but the general cannot capture a soldier; a cannon captures by jumping over exactly one piece; only one capture per turn. If 50 moves pass with no capture and no piece turned over, the game is a draw.","棋子大小：帥（將）＞仕（士）＞相（象）＞俥（車）＞傌（馬）＞炮（包）＞兵（卒）。":"Piece ranks: General > Advisor > Elephant > Chariot > Horse > Cannon > Soldier.","輪到你時，翻開一顆蓋著的棋，或把自己的一顆棋走一格（上下左右）。第一顆翻出什麼顏色，翻的人就執那一色。吃光對方，或對方輪到時翻不了也走不了，就贏了。":"On your turn, turn over a face-down piece or move one of your pieces one square (up, down, left or right). Whoever turns over the first piece plays that piece's color. You win by capturing all of the opponent's pieces, or when the opponent cannot turn over or move anything on their turn.","先翻，才知命。":"Turn it over to learn your fate.","頭一翻就是帥？好兆頭。":"A general on the very first flip? Good omen.","頭一翻就是將？好兆頭。":"A general on the very first flip? Good omen.","小兵也能扳倒大帥，這就是暗棋。":"Even a little soldier can topple the general. That's dark chess.","茶還熱著，再翻一局。":"The tea is still warm. Flip another game.","未定":"Not yet","紅":"Red","黑":"Black","（新手）":"(Beginner)","（一般）":"(Normal)","電腦難度":"Computer level","一般":"Normal","新手：電腦偶爾會看漏、走錯，適合剛學。":"Beginner: the computer sometimes misses things or makes mistakes. Good for learning.","一般：電腦會認真算。":"Normal: the computer thinks it through.","電腦難度：新手":"Computer level: Beginner","電腦難度：一般":"Computer level: Normal","暗棋棋盤":"Dark chess board","空格":"empty","蓋著的棋":"face-down piece","吃！":"Capture!","你吃到：":"You captured:","電腦吃到：":"Computer captured:","輪到你（紅）：翻一顆，或走一步。":"Your turn (Red): turn a piece over or make a move.","輪到你（黑）：翻一顆，或走一步。":"Your turn (Black): turn a piece over or make a move.","輪到你：先翻一顆，翻出什麼顏色你就執那一色。":"Your turn: turn a piece over first. You will play the color it shows.","電腦思考中":"Computer is thinking","這顆現在走不了，也吃不到。":"This piece can't move or capture right now.","那是電腦的棋。先點你自己的棋，再點要去的地方。":"That's the computer's piece. Tap one of your own pieces first, then tap where it should go.","這局電腦贏了":"The computer won this game","電腦的棋子被你吃光了。":"You captured all of the computer's pieces.","你的棋子被吃光了。":"All of your pieces were captured.","電腦沒有棋可走了。":"The computer has no moves left.","你沒有棋可走了。":"You have no moves left.","你認輸了。":"You resigned.","回茶坊":"Back to Teahouse","開始翻棋":"Start","規則":"Rules","認輸？":"Resign?","認輸的話，這局算輸。":"If you resign, this game counts as a loss.","這局電腦先翻。":"The computer goes first this game.","這局你先翻。":"You go first this game.","這局電腦先翻（新手）":"The computer goes first this game (Beginner)","這局你先翻（新手）":"You go first this game (Beginner)","這局電腦先翻（一般）":"The computer goes first this game (Normal)","這局你先翻（一般）":"You go first this game (Normal)","接著上次那一局":"Picking up your last game",   /* 11/14 西市聽雨茶坊臺灣暗棋（07xsd） */
  "← 西市":"← West Market","觀星臺 →":"Star Terrace →","往左看：西市":"Look left: West Market","往右看：觀星臺":"Look right: Star Terrace","往左看":"Look left","往右看":"Look right","往左看：回到苑中":"Look left: back to the Garden","往右看：回到苑中":"Look right: back to the Garden",   /* 11/14 首頁三屏長卷（07hmp） */
  "下船後會慢慢用掉，回星槎就補回來":"Drains slowly once ashore; refills on the Star Raft","快用完了，回星槎歇一下吧":"Almost out. Rest on the Star Raft for a bit","這盤下完，就回星槎歇息":"After this game, back to the Star Raft to rest","化墨退場中・":"Dissolved into ink · ","分鐘後可以下船":"min until you can go ashore","解殘局、過主線章節就會得到":"Earned by solving endgames and clearing story chapters","現在滿格，下棋、解題得到的修為":"Full now: XP from games and puzzles","現在一半以上，下棋、解題得到的修為":"Half or more now: XP from games and puzzles","到一半以上，下棋、解題得到的修為":"At half or more, XP from games and puzzles","；滿格":"; when full","修為越高，三項越強；身上的星芒進黑洞會變成開局靈力。":"More XP makes all three stronger; your Starglow becomes starting spirit in the Black Hole.","黑洞過關回 20，一天最多回 20；關掉 App 再打開就回滿。":"Clearing a Black Hole stage restores 20, up to 20 a day; closing and reopening the App refills it.",   /* 11/14 角色卡極簡版（07dgl） */
  "紅血":"Red","每回合回靈":"Spirit per round","藍血":"Blue","攻擊力":"Attack","防禦力":"Defense","修為越高，攻擊力和防禦力越強（黑洞裡用）":"Higher XP makes Attack and Defense stronger (used in the Black Hole)","修為越高，五項越強；身上的星芒進黑洞會變成開局靈力（1 點換 10 靈）。":"More XP makes all five stronger; your Starglow becomes starting spirit in the Black Hole (1 point = 10 spirit).",   /* 11/14 角色卡五項：紅血（定軌力）、藍血（星芒）、攻擊力、防禦（07dgl） */
  "星淵靈氣入體，旅人精神百倍！":"Abyss spirit flows in - the traveler is full of energy!","化墨退場中：在星槎上歇到 15 才能再下船。":"Dissolved into ink: rest on the Star Raft until 15 before going ashore.","定軌力用完了：這一盤下完、這一題解完，就要回星槎歇息。":"Orbit stamina is used up: after this game or puzzle you'll return to the Star Raft to rest.",
  "跑了一天的馳道，車輪都要轉不動了……歇一會兒吧。":"A whole day on the imperial roads - even the wheels can barely turn... let's rest a while.","渡口的船都靠岸了，我們也該歇一歇啦！":"All the ferry boats have docked - time for us to rest too!","哈——欠！我說話都小聲了，這可不得了，快休息！":"Yaaawn! Even my voice has gone quiet - that's serious, let's rest!",
  "草原的風都吹不走睡意了，我們回星槎睡一覺吧。":"Not even the grassland wind can blow my sleepiness away - let's go back to the raft and nap.","呼……人間的風有點重，我緩一緩就好。":"Phew... the air down here feels heavy. I just need a moment.","……休整，是為了下一場勝仗。":"...Resting is for the next victory.","跑了一整天的腿，腳都軟了，今天先到這兒吧！":"Running errands all day, my legs are jelly - let's stop here for today!",
  /* 平日體力 11/13 晚：設定開關、二十八宿星圖（07dgl-stamina.js） */
  "平日體力":"Daily stamina","平日體力（定軌力／星芒）":"Daily stamina (orbit stamina / starglow)","已關閉":"Off","二十八宿":"28 Lunar Mansions","二十八宿星圖":"Chart of the 28 Lunar Mansions","觀星客":"Stargazer",
  "解殘局、主線過關，各得 1 點，最多存 20 點。":"Solving endgames and clearing main-story stages earn 1 each, up to 20.","星芒從解殘局、主線過關得來。":"Starglow comes from solving endgames and clearing main-story stages.",
  "東方蒼龍":"Azure Dragon of the East","北方玄武":"Black Tortoise of the North","西方白虎":"White Tiger of the West","南方朱雀":"Vermilion Bird of the South",
  "點一顆星：已點亮的看說明，還沒點亮的花星芒點亮。":"Tap a star: lit ones show their notes; unlit ones cost starglow to light.",
  "已打開平日體力：定軌力回滿，在人間會慢慢用掉":"Daily stamina on: orbit stamina refilled; it slowly drains in the human world","已關閉平日體力：定軌力不扣、不會化墨退場；星芒照常":"Daily stamina off: no drain and no ink exit; starglow works as usual",
  "想再打開：設定 → 👘 換造型，裡面的「平日體力」。":"To turn it back on: Settings → 👘 Outfit, then \"Daily stamina\".",
  /* 黑洞塔防爽度第一批（07bht-td.js、park3d 塔防固定鏡頭，開發者 11/14）：視角、對峙資訊列、輔助列、打擊演出跳字 */
  "全局俯視":"Overview","臨陣斜角":"Battle angle","純淨平面":"Flat board","68° 看全盤":"68°, whole board","48° 看立體":"48°, see the 3D pieces","2D 平面棋盤":"2D flat board",
  "手機轉成橫向，星盤會更大":"Turn your phone sideways for a bigger star board","視角":"View","點一下換下一種":"tap for the next one","星樞推演中":"Star Pivot is thinking",
  "星門本回合落子":"Star gate drops this round","星門已盡":"No more star gates","目前沒有選取":"Nothing is selected","✕ 取消選取":"✕ Deselect","絕招":"Ultimate",
  "更多：認輸、重開本關、戰鬥演出":"More: resign, restart stage, battle effects","戰鬥演出":"Battle effects","完整":"Full","簡化":"Simple","重開本關":"Restart stage","重開":"Restart","繼續下棋":"Keep playing",
  "這一盤會放掉，用同樣的招重新開局。":"This game will be abandoned and restarted with the same moves.","等星樞走完，再幫你看":"Wait for the Star Pivot to move, then I'll take a look",
  "站上星門，把援軍堵住":"Stand on the star gate to block reinforcements",
  "奇謀連擊 ×2":"Clever Combo ×2","星樞潰散！":"The Star Pivot collapses!","破陣！":"Formation broken!","打倒星樞卒將！":"Star Pivot Pawn General defeated!","卒海過河":"Pawn Tide","殘卒反星":"Last Pawn Strikes Back","引力撕裂":"Gravity Rift",
  "將軍（扣 5 元氣）":"Check (−5 vitality)","連環逼宮（扣 7 元氣）":"Chain Check (−7 vitality)","星樞卒將":"Star Pivot Pawn General",
  "點棋子走棋":"Tap a piece to move","也可以拖曳":"or drag it","右上 👁 換視角":"👁 at top right changes the view",
  "完整＝草書招名 1.2 秒＋法器共鳴＋擒子停格、微震；簡化＝草書 0.8 秒、少停格；關閉＝不播草書與震動，只留文字。手機設了「減少動態」一律用「關閉」這一版。放招演出中點一下畫面也能直接結算。":"Full = 1.2 s calligraphy + artifact resonance + hit-stop and a light shake on captures; Simple = 0.8 s calligraphy, less hit-stop; Off = no calligraphy or shaking, text only. If your phone has Reduce Motion on, Off is always used. Tap the screen during a cast to resolve it right away.",
  "星淵初探":"First Look into the Abyss","墨河微瀾":"Ripples on the Ink River","星門乍現":"Star Gates Appear","雙門夾道":"Twin Gates","星樞列陣":"Star Pivot in Formation","守關・星樞卒將":"Gate Boss · Star Pivot Pawn General",
  /* 黑洞塔防爽度第二批（07bht-td.js、07dgl-stamina.js、07gxt-guanxing.js，開發者 11/14）：星塵天賦、結算三星與評語、七星再來一場、星淵急襲、黑洞的定軌力 */
  "星淵大捷・完勝歸來":"Abyss Triumph · A Flawless Return","力克星樞・險中求勝":"Star Pivot Overcome · A Narrow Win","殘血破陣・絕處逢生":"Last-Gasp Breakthrough · Back from the Brink","星局未竟・重整旗鼓":"Star Game Unfinished · Regroup and Return","兵不血刃，星樞大陣在你面前如入無人之境！":"Not a drop of blood spilled - you walked through the Star Pivot's formation as if it were empty!","招式與棋路完美契合，這局的節奏堪稱典範。":"Your skills and your moves fit together perfectly - this game's rhythm was a model.","星門未開便已定局，你把每一顆子都護得好好的。":"It was decided before the star gates even opened, and you kept every piece safe.","雖然防線一度吃緊，但關鍵時刻的那步擒子扭轉了乾坤。":"Your line was tight for a while, but that key capture turned the tide.","有驚無險！若能再早兩步封住星門，這局會更輕鬆。":"A close call! Seal the star gates two moves earlier and this one gets easier.","頂住了星樞的猛攻，這份定力值得再挑戰更高難度！":"You held off the Star Pivot's onslaught - that composure is ready for a tougher challenge!","差一點就被星樞翻盤了！好在最後一擊精準命中要害。":"The Star Pivot nearly turned it around! Luckily your last strike hit the weak spot.","真是驚心動魄的一局！建議回頭點亮「厚土固元」天賦增加容錯。":"What a nail-biter! Try lighting the 'Solid Earth' talent for more room for error.","贏得極其艱難，但也證明了你絕不輕言放棄的棋風！":"A hard-fought win - and proof that you never give up!","星樞攻勢太猛，別氣餒，點顆天賦再回來討回公道！":"The Star Pivot pushed hard. Don't lose heart: light a talent and come back for a rematch!","這局敵子過河太快，下次試著用炮架火網先削弱他們吧。":"Enemy pieces crossed the river too fast this time. Next time, wear them down first with your cannon fire net.","勝敗乃兵家常事，點擊重打，剛才的失誤一定能補回來！":"Win some, lose some. Tap to play again - you can make up for that slip!","車輪還沒停呢！剛才那條直線我還能衝得更快，再跑一趟！":"The wheels haven't stopped yet! I can charge down that straight line even faster - one more run!","渡口的風正順，星河也還亮著，趁現在我們再擺一局吧！":"The ferry wind is fair and the star river still shines - let's set up another game while we can!","嘿嘿，沒有打雷只有滿天星火，這仗打得真痛快，再放一輪！":"Heh, no thunder, just a sky full of star sparks - what a great fight! Let's fire off another round!","草原上的雄鷹從不嫌飛得遠，這點風浪算什麼，再來比過！":"The grassland eagle never minds flying far. These waves are nothing - let's go again!","咳……我氣息還穩得很，剛才那步棋我還有更好的解法，再試一次！":"Ahem... my breath is still steady. I had a better answer for that move - let me try again!","陣腳已穩，護主之責未盡。只要你還要下，我隨時奉陪到底。":"Our footing is firm, and my duty to guard you isn't done. As long as you want to play, I'm with you.","別看我個子小，剛才我也立大功啦！快開下一局，我還要往前衝！":"I may be small, but I did great just now too! Start the next game - I want to keep charging!","星火初燃":"First Spark","開局靈力 +10":"+10 spirit at the start","厚土固元":"Solid Earth","元氣上限 +8":"+8 max vitality","鋒芒畢露":"Sharp Edge","小子吃大子，再回 10 靈力（每回合 1 次）":"When a smaller piece takes a bigger one, gain 10 more spirit (once per round)","星陣護體":"Star Ward","第一顆己子被吃時，回 20 靈力":"When your first piece is captured, regain 20 spirit","被擒":"Lost","被擒不超過 2 顆":"No more than 2 pieces lost","護好自己的子；敵子過河、停進九宮都會扣你的元氣":"Protect your pieces; enemy pieces across the river or in your palace drain your vitality","這盤封招一輪":"No skills on this board for one round","將軍也會扣星樞的元氣":"Checks also drain the Star Pivot's vitality","招式（全隊已學會的都會帶上場）":"Skills (everything your team has learned comes along)","過關（吃光卒也算）":"Clear (capturing every pawn also counts)","過關（援軍都擋下來、入侵卒清光也算）":"Clear (holding off every wave and clearing the invaders also counts)","這一關不用打穿星核：吃光卒就過關":"No need to break the core here: capture every pawn to clear","這一關不用打穿星核：援軍都擋下來、入侵卒清光就過關":"No need to break the core here: hold off every wave and clear the invaders to clear","陣眼子第一次被吃，靈力不歸零，只扣 20":"The first time your formation eye is captured, spirit isn't wiped out - you only lose 20","奇謀連鎖":"Clever Chain","奇謀連擊再多扣 2（一次最多扣 12）":"Clever Combo takes 2 more (at most 12 at a time)","赤焰火網":"Blazing Net","炮打出的破甲，用過再留 1 回合":"Armor breaks from your cannons stay 1 more round after use","七星共鳴":"Seven Stars Resonance","每 2 顆過河的己方子，回合結束回 1 元氣（每回合最多 2）":"For every 2 of your pieces across the river, regain 1 vitality at the end of the round (up to 2 per round)","星塵":"Stardust","天賦":"Talents","星塵天賦":"Stardust Talents","已用":"Used","點亮":"Lit","回選關":"Back to stages","全部重置（星塵全退）":"Reset all (full stardust refund)","要點下一層，先點亮上一層的一個。":"To use the next tier, first light one talent in the tier before it.","天賦只在黑洞有用，線上和一般對局不受影響。":"Talents only work in the black hole; online and regular games are not affected.","不在對局裡時，可以免費全部重置，星塵全退。":"Outside a game you can reset everything for free and get all your stardust back.","先點亮上一層的一個天賦":"Light one talent in the previous tier first","已經點亮了":"Already lit","沒有這個天賦":"No such talent","星塵不夠":"Not enough stardust","還沒有點亮的天賦":"No talents lit yet","星淵急襲":"Abyss Raid","中局殘陣":"Midgame position","才開星淵急襲":"to open the Abyss Raid","換一場急襲":"Another raid","可挑戰":"Open","過關得星塵：三星是過關、被擒不超過 2 顆、在規定回合內過關。星塵拿去點天賦（只在黑洞有用）。":"Clearing a stage earns stardust. The three stars are: clear it, lose no more than 2 pieces, and clear it within the round limit. Spend stardust on talents (black hole only).","過關":"Clear","回合內":"rounds max","限時過關":"Clear in time","首通":"First clear","三星首達":"First 3 stars","急襲":"Raid","共":"Total","最高一擊":"Best hit","最高連擊":"Best streak","返回星盤":"Back to star map","再刷一場（＋星塵）":"Play again (+stardust)","陣眼子被擒":"Formation eye captured","只散 2 靈力":"only 2 spirit lost","人間黑洞會用，星槎會回":"Drains in the human world and the black hole, refills on the Star Raft","人間・黑洞":"Human world · Black hole","／日":"/day","黑洞過關回定軌力，一天最多 20。":"Clearing a black hole stage restores orbit stamina, up to 20 a day.","定軌力用完時，黑洞入口也會關。":"When orbit stamina runs out, the black hole entrance closes too.","定軌力用完了，黑洞入口先關著":"Orbit stamina is used up, so the black hole entrance is closed for now","定軌力用完了，黑洞入口先關著：這盤下完先回星槎歇息":"Orbit stamina is used up, so the black hole entrance is closed: after this game, rest on the Star Raft","定軌力用完":"orbit stamina used up","暫時關閉":"temporarily closed","雙炮巡河":"Twin Cannons on Patrol","單車破陣":"Lone Chariot Breakthrough","馬炮爭先":"Horse and Cannon Race","雙車對峙":"Twin Chariots Face Off","兵臨城下":"Soldiers at the Gates","九宮危局":"Palace in Peril","單騎救主":"Lone Rider to the Rescue","炮鎮中路":"Cannon Holds the Center","雙馬盤河":"Twin Horses at the River","殘局對攻":"Endgame Exchange","左翼突破":"Left-Wing Breakthrough","星門夾擊":"Star Gate Pincer",
  "沈方庭":"Shen Fangting","步越溪":"Bu Yuexi","未解鎖":"Locked","下一關":"Next stage",
  /* 觀星臺（07gxt-guanxing.js，開發者 11/13） */
  /* 黑洞塔防練習賽（07bhtl-tdlearn.js，開發者 11/13） */
  "鐵連城":"Tie Liancheng","練習賽":"Practice match","星淵試陣":"Abyss Trial","練習賽・星淵試陣":"Practice match · Abyss Trial","約 2 分鐘・不算輸贏":"About 2 minutes · no win or loss recorded",
  "吃過河的卒、堵星門、放招、認陣眼子":"Take the river-crossing pawn, block the star gate, cast a move, meet your formation eye","已練過":"Practiced","推薦先練":"Recommended first",
  "第一次來星淵？":"First time in the Star Abyss?","先練一盤":"Practice one game first","我會了，直接選關":"I know how, pick a stage","跳過練習":"Skip practice","練習賽說明":"Practice guide",
  "練習賽・過關":"Practice match · cleared","開始第 1 關":"Start stage 1","再練一次":"Practice again","練習賽先到這裡":"That's it for practice","直接選關":"Pick a stage","繼續練":"Keep practicing","再玩一次練習賽":"Play the practice match again",
  "這裡的棋，跟人間不太一樣。我先帶你走一盤，大約兩分鐘。":"Chess here is a little different from the human world. Let me walk you through one game, about two minutes.",
  "練習賽不算輸贏，也不扣任何東西。":"The practice match records no win or loss and costs nothing.","跳過練習，直接去選關？":"Skip practice and go pick a stage?","之後在關卡卡片最上面還能再練。":"You can practice again from the top of the stage cards later.",
  "醒醒，這裡是星淵的棋盤。":"Wake up, this is the board of the Star Abyss.","對面下黑棋的，是這座星盤的主人，叫星樞。":"The one playing black across from us is the master of this star board, the Star Pivot.",
  "上面紫色長條是星樞的元氣，下面紅色的是我們的。元氣就像血——把星樞的元氣打到 0，我們就贏。":"The purple bar on top is the Star Pivot's vitality; the red one below is ours. Vitality is like health - bring the Star Pivot's to 0 and we win.",
  "看那顆卒，已經過河，跑到我們這邊了。":"Look at that pawn, it has crossed the river onto our side.","過了河的子，每回合都會咬掉我們 1 點元氣。":"A piece that has crossed the river bites 1 vitality from us every round.","用中兵吃掉它！":"Capture it with the middle pawn!",
  "吃子會扣星樞的元氣，還多 10 點靈力——就是你名字旁邊那條藍色的靈力條。":"Capturing takes vitality from the Star Pivot and gives us 10 spirit - that's the blue spirit bar next to your name.",
  "哎呀，星樞也會吃我們的子，被吃一樣扣元氣。":"Oops, the Star Pivot captures our pieces too, and that costs us vitality as well.","那顆卒還站在河這邊，剛剛又咬了我們 1。":"That pawn is still on our side of the river, and it just bit us for 1 again.",
  "紫色轉圈的是星門。星樞的棋子不會一次到齊，會從星門一顆一顆掉下來。":"The spinning purple circle is a star gate. The Star Pivot's pieces don't arrive all at once; they drop in one by one through star gates.",
  "圈上的數字是倒數，數到 0 就落下。":"The number on the circle is a countdown; at 0 a piece drops in.","派俥站上去，把門堵住！":"Send the chariot to stand on it and block the gate!",
  "堵住了！只要有子站在門上，援軍就下不來。":"Blocked! As long as a piece stands on the gate, reinforcements can't come down.","還有——我們的俥也過了河。過河的子，一樣每回合咬星樞 1 點。":"And our chariot has crossed the river too. Our crossed pieces bite the Star Pivot for 1 every round as well.",
  "藍條滿了！靈力每回合會自己回 10，吃子再多 10。":"The blue bar is full! Spirit refills 10 each round, plus 10 more for each capture.","滿了就能放招式。點下面發亮的招式鈕。":"When it's full you can cast a move. Tap the glowing move button below.",
  "放招不算走棋，放完還能再走一步；一回合只能放一招。":"Casting doesn't use your turn - you can still move afterwards. Only one move per round.","看招！":"Here it comes!",
  
  
  "什麼事都沒有":"Nothing happens",
  "招放得好！":"Nice cast!","星樞的元氣快見底了。":"The Star Pivot's vitality is nearly gone.","把俥橫移到中間，對準黑將——將軍會扣 5 點元氣！":"Slide the chariot to the middle and aim at the black general - a check takes 5 vitality!",
  "看星樞怎麼走……":"Let's see how the Star Pivot moves…","吃掉過河的卒":"Capture the crossed pawn","把俥走到紫色圈上":"Move the chariot onto the purple circle","點下面的招式鈕":"Tap the move button below","俥一平五，將軍":"Chariot 1 traverses to 5, check",
  "先看完說明，按「繼續」":"Finish reading first, then tap \"Continue\"","先走發亮的那一步":"Play the highlighted move first","等一下就教你放招":"Casting comes in a moment","先點下面發亮的招式鈕":"Tap the glowing move button below first","先回答上面的問題":"Answer the question above first",
  "學得真快！星淵的規矩，大概就是這些。":"You learn fast! Those are the main rules of the Star Abyss.","沒關係，隨時可以再練。":"No problem, you can practice again any time.",
  "吃掉過河的子":"Capture pieces that cross the river","站上星門，堵住援軍":"Stand on star gates to block reinforcements","靈力滿了就放招":"Cast a move when spirit is full",
  "怎麼贏：把星樞的元氣打到 0，或將死它。":"How to win: bring the Star Pivot's vitality to 0, or checkmate it.","怎麼輸：我們的元氣先到 0。":"How to lose: our vitality reaches 0 first.","正式關卡會帶上全隊已學會的招。":"In real stages your team brings every skill it has learned.",
  "點那顆發亮的卒，一劍把它打出棋盤。":"Tap the glowing pawn and strike it off the board.","卒被打掉了，再也咬不到我們。":"The pawn is gone and can't bite us anymore.","先點炮，再點底線發亮的點。":"Tap the cannon, then the glowing point on the back rank.",
  "大子遇到危險，可以這樣飛回家。":"When a big piece is in danger, it can fly home like this.","點那顆卒，用煙火把它定住。":"Tap that pawn and pin it in place with fireworks.","被定住的子，下回合不能動。":"A pinned piece can't move next round.",
  "剛剛被吃掉的兵，可以叫它回營——點那個發亮的點。":"The pawn we just lost can be called back to camp - tap the glowing point.","兵回來了！原位空著，被吃的子就能叫回來。":"The pawn is back! If its home square is empty, a captured piece can return.",
  "元氣補回來了。":"Vitality restored.","下一次扣元氣，護盾會整個擋掉。":"The shield will block the next vitality loss completely.","點炮，再點傌，兩顆子會換位置。":"Tap the cannon, then the horse, and they will swap places.","換個位置，有時候就能解圍。":"Sometimes a swap is all it takes to escape trouble.",
  "星樞要放招了！紅框的子會被波及。下回合結束前先處理，就能少扣元氣。":"The Star Pivot is about to cast! Pieces in red frames will be hit. Deal with it before next round ends to lose less vitality.",
  "星樞吃到子也會長靈力（紫色細條），夠了就會放招。":"The Star Pivot also gains spirit (the thin purple bar) when it captures, and casts when it has enough.","炮隔一顆子瞄到的敵子會破甲：下次打它，多扣 1。":"An enemy piece your cannon targets over one screen gets armor-broken: the next hit on it takes 1 more.",
  "敵子停進我們的九宮，每回合多扣 2！先把它趕走或吃掉。":"An enemy piece in our palace costs 2 more each round! Chase it out or capture it.","被將軍會扣 5 元氣（防禦可減少），先保帥。":"Being checked costs 5 vitality (Defense can reduce it) - protect the marshal first.",
  "紫色菱形是星碎格：誰踩上去，誰扣 3 元氣——我們和星樞都一樣。":"Purple diamonds are star-shard squares: whoever steps on one loses 3 vitality - us and the Star Pivot alike.",
  "有兩道門看起來一模一樣，其中一道是假門，落子時才會散掉。":"Two gates look exactly alike; one is fake and only vanishes when the piece drops.","護盾擋掉了這一次扣元氣。":"The shield blocked this vitality loss.","小盾：這顆子被吃時少扣幾點，最多撐 3 回合。":"Small shield: if this piece is captured you lose a few less points; it lasts up to 3 rounds.",
  "被定身的子，下回合不能動。":"A frozen piece can't move next round.","守關王！它的招牌招「引力撕裂」會扣 5（防禦可減少），護盾擋得住。":"Gate boss! Its signature move \"Gravity Rift\" takes 5 (Defense can reduce it), but a shield can block it.",
  "觀星臺":"Star Terrace","星淵":"Star Abyss","星淵遠征":"Abyss Expedition","十三星系":"Thirteen Systems","今日異象":"Omen of the Day","自由擺陣":"Free Setup","黑洞車輪戰":"Black Hole Gauntlet","星軌未通，敬請期待":"Star path not open yet — coming soon","回觀星臺":"Back to Star Terrace","觀星臺還沒出現":"The Star Terrace has not appeared yet",
  /* 西市（07xsm-ximarket.js，開發者 11/13） */
  "西市":"West Market","聽雨茶坊":"Rain-Listening Teahouse","領禮物":"Gifts","七星來訪":"Seven Stars Visit","找棋子":"Find the Pieces","暗棋":"Dark Chess","聽曲":"Music","還沒開張，敬請期待。":"Not open yet - coming soon.",
  "回西市":"Back to the West Market","西市還沒開市":"The West Market isn't open yet","逛逛西市":"Look around","各朝的貨色，都在這裡湊成一市。":"Goods from every dynasty gather here in one market.",
  "西市，原本是城西那座市集的名字。漢朝、唐朝的長安城都有。千秋時光之苑不屬於任何朝代，各朝的貨色就都擺到這裡來了。":"The West Market was the name of the market on the west side of the city; both Han and Tang Chang'an had one. The Garden of Time belongs to no dynasty, so goods from every dynasty have all been laid out here.",
  "國子監":"Imperial Academy","書院":"Academy","酒肆":"Tavern","酒壚":"Wine shop","旗亭":"Wine pavilion","茶肆":"Teahouse","茶坊":"Teahouse","茶樓":"Teahouse","茶館":"Teahouse",
  "博一局":"Play a game","象戲一局":"Play a game","著一局":"Play a game","著一盤":"Play a game","下一盤":"Play a game","殺一盤":"Play a game",
  "下棋與研究":"Play and study","與人對弈":"Play people","挑戰電腦":"Play the computer","下棋":"Play","線上對戰":"Online play","觀戰":"Watch","進大廳":"Enter lobby",
  "開一盤":"Start a game","開一場":"Start","報名":"Sign up","新手訓練營":"Boot camp","我的戰績":"My record","我的開局":"My openings","錯棋重練":"Mistake drills",
  "棋力測驗":"Strength test","一盞茶殘局":"Teatime endgames","猜著法":"Guess the move","象棋規則":"Rules of xiangqi","誰在線上":"Who's online",
  /* 挑戰電腦的雅間、開新局選單 */
  "初學乍練":"Novice tier","略有小成":"Developing tier","登堂入室":"Advanced tier","宗師之境":"Master tier","高手也難勝":"Hard even for experts",
  "晉級賽":"Ranked","練功房":"Practice room","盲棋":"Blindfold","十八級難度任你挑，放心試新招。":"Pick any of 18 levels and try new ideas freely.",
  "開始晉級賽":"Start ranked game","開始練習":"Start practice","開始盲棋":"Start blindfold game","執黑後走":"Black, moves second","執紅先走":"Red, moves first","已通關":"cleared",
  "不算段位、可偷看 3 次":"Unrated, 3 peeks allowed","不扣段位分":"No rank points lost","模式差在哪":"How do the modes differ","前一卷還沒通關":"previous scroll not cleared yet",
  "我的晉級賽段位":"My ranked level","開不了局":"Can't start a game","晉級賽下到一半開新局會算輸。":"Starting a new game in the middle of a ranked game counts as a loss.",
  "可以接著下，或放棄那盤開新局。":"You can continue it, or abandon it and start a new game.","繼續上一盤":"Continue last game","開新局（上一盤算輸）":"New game (last one counts as a loss)",
  "開新局":"New game","點卷軸換難度":"Tap a scroll to change the level","點名牌換對手":"Tap the name plate to change opponent","段位":"Rank","選難度":"Choose level","執紅":"Play Red","執黑":"Play Black",
  "名牌，晉級賽固定對手：幻影棋客":"Name plate, ranked opponent is always the Phantom Player","名牌，按下可換對手，目前對手：":"Name plate, tap to change opponent, current opponent:",
  "按下看詳細":"tap for details","你的電腦段位":"Your computer rank","已經是最高段位":"Already at the top rank","你執":"You play","對手":"Opponent","難度":"Level","通關":"Cleared",
  "各級怎麼下":"How each level plays","開始":"Start","先走":"moves first","後走":"moves second",
  "電腦的強度跟著你的段位走，段位越高越難。用等級分的算法：跟實力差不多的電腦下，贏約 +16、輸約 −16，跟線上對戰分開記分。不能悔棋、不能提示，下到一半開新局算輸。":"The computer's strength follows your rank: the higher your rank, the harder it gets. Scoring works like a rating system: against a computer of similar strength a win is about +16 and a loss about -16, kept separate from online play. No undo, no hints, and starting a new game mid-way counts as a loss.",
  "電腦對手":"Computer opponent","想調整難度，選這位。":"Pick this one to adjust the difficulty.","冷靜不語":"Silent and calm","想練耐心找破綻，和掌櫃下一盤。":"Play the Shopkeeper to practice patience and spotting weaknesses.",
  "化繁為簡":"Simplifies","笑面掌櫃的強度校準完成後再開放晉級賽":"Ranked games with the Smiling Shopkeeper open once his strength is calibrated","可在練功房對弈":"you can play him in the Practice room",
  "兩位的完整介紹":"Full profiles of both","已選":"selected","未選":"not selected","晉級賽暫不開放":"ranked not available yet","選對手":"Choose opponent",
  "晉級賽的對手固定是幻影棋客；笑面掌櫃的強度校準完成後再開放晉級賽。想跟掌櫃下，請到練功房。":"The ranked opponent is always the Phantom Player; ranked games with the Smiling Shopkeeper open once his strength is calibrated. To play the Shopkeeper, go to the Practice room.",
  "兩位的強弱都照你選的級數；不同的是下棋的習慣。":"Both play at the level you choose; what differs is their style.",
  "水墨裡走出來的幻影，算得精、下得準，強弱隨你調。":"A phantom stepping out of an ink painting: precise, accurate, and as strong as you set it.","精準計算":"Precise calculation","強弱可調":"Adjustable strength",
  "和氣生財，精算盈虧，均勢愛兌子的茶肆老闆。":"A genial teahouse owner who counts every gain and loss and loves trading pieces in level positions.","後發制人":"Counterpunches","不戰而守":"Defends without fighting",
  "與實力相當的幻影棋客對決，爭取更高段位！":"Face a Phantom Player of similar strength and climb the ranks!",
  "算分升降段；中途離開可以回來接著下，沒下完就開新局才算輸。":"Rated, with promotion and demotion; you can leave and come back to finish, and only starting a new game before finishing counts as a loss.",
  "不扣段位分；贏了那一級蓋「通關」印。":"No rank points lost; win a level to earn its \"Cleared\" seal.",
  "不走故事也能蒙目對弈：棋盤不顯示棋子，只靠著法列和記憶跟電腦下一盤。":"Play blindfold without the story: the board hides the pieces, and you play the computer using only the move list and your memory.",
  "不算段位、不記通關；每盤可以偷看 3 次，每次 3 秒。":"Unrated and no clears; you can peek 3 times per game, 3 seconds each.",
  "想升段就進晉級賽，想練新招就進練功房，想考記性就下盲棋。":"To climb the ranks, play Ranked; to try new ideas, use the Practice room; to test your memory, play Blindfold.",
  "可回來續下；若未下完就另開新局，原局判負。":"You can come back to finish; starting a new game before finishing counts as a loss.",
  "晉級賽的對手照你的段位配：跟實力差不多的幻影棋客下，贏約 +16、輸約 −16，跟線上對戰分開記分。":"Ranked opponents match your rank: you play a Phantom Player of similar strength; a win is about +16 and a loss about -16, kept separate from online play.",
  "上一盤還沒下完":"Your last game isn't finished","茶坊深處的對弈雅間：棋桌、戰帖、棋譜、棋罐、茶爐":"A private game room deep in the teahouse: board, challenge letters, game records, piece jars, tea stove",
  "再來一盤":"Play again","同樣難度":"same level","這盤晉級賽還沒下完，重開會算輸，確定？":"This ranked game isn't finished; restarting counts as a loss. Restart anyway?",
  "這盤還沒下完，確定重開一盤？":"This game isn't finished. Start a new one?",
  /* 對手與玩家名字（雲河七星與電腦對手；別的人名照舊用中文） */
  "幻影棋客":"Phantom Player","笑面掌櫃":"Smiling Shopkeeper","掌櫃真功夫":"Shopkeeper, full strength",
  "掌櫃拿出真本事：強度照公開大師對局的勝率校準過，不跟著等級變。":"The Shopkeeper plays for real: his strength is calibrated against win rates in public master games and does not follow the level.","小帥":"Xiao Shuai","小師妹":"Xiao Shimei","齊轍":"Qi Zhe","田飛燕":"Tian Feiyan",
  "雷借花":"Lei Jiehua","駱躍梅":"Luo Yuemei","電腦":"Computer","對方":"Opponent","你":"You","紅方":"Red","黑方":"Black","職業頂尖":"top professional",
  "練習":"Practice","朝代擂台":"Dynasty arena","走去驛站":"Walk to the inn","這盤已經結束":"This game is over","還沒輪到你":"It's not your turn yet","聲控走棋":"Voice moves",
  "驛站的棋友":"Inn player","石桌往事":"Stone Table Tales","園子裡的路人棋友":"Garden passer-by","黑洞星盤":"Black-hole star board","不計分":"unrated","幻譜星門":"Phantom star gate",
  "第十四顆":"The fourteenth","鏡像":"Mirror","星樞":"Star Pivot","🏮 官階":"🏮 Title",
  /* 段位與難度說明（local.js 的 RANKS、LVDESC） */
  "新手":"Novice","全力":"Full strength","常常亂走":"often plays randomly","會漏子":"sometimes hangs pieces","偶有失誤":"makes occasional mistakes","小失誤":"makes small mistakes",
  "很少失誤":"rarely makes mistakes","幾乎不失誤":"almost never makes mistakes","不放水":"no mercy","人類幾乎贏不了":"nearly unbeatable for humans","段位與開新局":"Rank and new game","換難度":"Change level",
  /* 對局頁：工具列、狀態列、確認框 */
  "寶物":"Items","悔棋":"Undo","新局":"New","認輸":"Resign","檢討":"Review","擺盤":"Setup","偷看":"Peek","思考中":"Thinking","已預走":"Premove set","被將軍":"in check","⚠ 被將軍！":"⚠ Check!",
  "提示":"Hint","輪到你":"Your move","輪到你走":"Your move","輪到電腦":"Computer's move","等電腦":"Waiting for the computer","電腦想太久了？":"Computer taking too long?","重新開一局":"Start a new game","還原大小":"Reset zoom","兩指往內捏，就能縮回原本大小":"Pinch in with two fingers to zoom back out","確定認輸？":"Resign this game?",
  "悔棋以後，這一盤不算進「我的棋力」（輸贏照常算）。":"After an undo, this game no longer counts toward \"My strength\" (the result still counts).","用悔棋符":"Use undo token",
  "你還沒走棋，不用悔棋":"You haven't moved yet; nothing to undo","沒有悔棋符了":"No undo tokens left","這個難度不限次數":"unlimited at this difficulty",
  "均勢":"Even","雙方差不多":"roughly equal","領先非常多":"far ahead","能將死對方":"can force checkmate",
  /* 著法評語（00-util QC） */
  "妙著":"Brilliant","正著":"Best","穩著":"Good","緩著":"Slow","失著":"Mistake","敗著":"Blunder",
  /* 結果視窗與結果原因（core.js、local.js） */
  "你贏了":"You won","和局":"Draw","這盤輸了":"You lost this one","將死":"Checkmate","困斃":"Stalemate (no legal moves)","你認輸":"You resigned","紅方認輸":"Red resigned","黑方認輸":"Black resigned",
  "雙方同意和棋":"Draw by agreement","雙方均無進攻子力":"Neither side has attacking pieces left","中途離開，算輸":"Left mid-game; counted as a loss","循環待核，同意和局":"Repetition under review; draw agreed",
  "遊戲自然限著：60 回合未吃子":"Move limit: 60 moves without a capture","超時":"Time out","看看棋盤":"View board","再來一局":"Play again","挑戰下一級":"Next level",
  "看懂這盤最關鍵的一步":"Understand the key move of this game","再挑戰一盤":"Play another ranked game","再挑戰一次":"Try again","修為":"XP",
  "雙方還沒各走一步，這盤不計分":"Neither side has made a move yet, so this game is unrated","這盤是快速對局，不算段位分。":"This was a quick game; it doesn't count toward your rank.",
  "你在看不見的棋盤上，走出了一盤清清楚楚的勝局。":"You won a crystal-clear game on a board you couldn't see.","看不見棋子也守成和局，記盤功力不錯。":"You held a draw without seeing the pieces. Good board memory.",
  "這盤棋沒守住，但你已經把棋盤放進心裡了一步。":"You didn't hold this one, but the board is one step closer to living in your mind.",
  "盲棋不算段位、不記通關，也不算進「我的棋力」。":"Blindfold games are unrated, don't mark levels as cleared, and don't count toward \"My strength\".",
  "練習成功":"Practice complete","這題沒下贏":"Not won this time","這步練會了":"You've learned this move","從這步重下":"Replay from this move","回到錯棋列表":"Back to mistake list",
  "不算戰績":"not counted in your record","這步已經練會了":"you've already learned this move","循環待核":"Repetition under review","同意和局":"Accept draw","悔一步變著":"Undo one move and vary","繼續下":"Keep playing",
  /* 設定頁 */
  "角色":"Character","棋盤":"Board","聲音":"Sound","系統":"System","文字":"Language","字體":"Font","字級":"Text size","深淺色":"Light / dark","棋規":"Rules","電腦下棋節奏":"Computer pace",
  "對手形象":"Opponent look","棋子樣式":"Piece style","3D 園子棋盤":"3D garden board","快棋模式":"Blitz mode","我的棋力":"My strength","擬真":"Realistic","快速":"Fast","預走":"Premove","左撇子單手模式":"Left-handed mode","純淨畫面":"Clean screen","老闆鍵":"Boss key","震動回饋":"Haptics","高對比棋子":"High-contrast pieces",
  "色弱模式":"Color-blind mode","專注棋盤模式":"Focus board mode","棋盤的朝代樣式":"Dynasty board style","棋盤風格":"Board style","更多設定":"More settings","走棋顯示與特效":"Move display and effects",
  "棋子聲":"Piece sounds","語音報子":"Voice calls","氛圍":"Ambience","走一步":"Make a move","吃子":"Capture","將軍":"Check","開局動畫":"Opening animation",
  "朝代配色":"Dynasty colors","淺色／深色":"Light / dark","試看棋盤":"Board preview","🖌 字體":"🖌 Font and language","本命棋子":"Signature piece","換造型":"Change outfit","3D 立繪":"3D portrait",
  "語音報棋":"Voice calls","修正紀錄":"Fix log","關於":"About","換手機":"Move to a new phone","意見回饋管理":"Feedback admin","切換成英文":"Switching to English",
  /* 讀螢幕（01-board、11b-a11y）：格子、選子、盤面 */
  "讀出盤面":"Read the board","棋盤，每一格可以點選":"Board, every square can be selected","取消選取":"Deselected","沒有地方可以走":"no legal moves","已選取":"selected",
  "可以吃":"can capture","可以走到這裡":"can move here","剛走到這裡":"just moved here","預定落點":"planned destination","再按一次落子":"press again to move","空":"empty",
  "還沒有走棋":"No moves yet","還沒有擺棋子":"No pieces on the board","沒有棋子":"no pieces","你的時間到了":"Your time is up","你的時間到了，超時":"Your time is up: time out","頁面":"Page",
  /* 設定頁：開關底下的說明小字、各列、提示（05-settings、11b-a11y、07f、07w7） */
  "還沒取名字":"No name yet","換一顆棋子":"Change your piece","從主畫面點圖示打開：全螢幕、沒網路也能下棋":"Open it from the home screen icon: full screen, and you can play offline","開發中":"in development","檢查更新":"Check for updates","語言":"Language",
  "語言 Language":"Language","用在哪裡":"Used for","送出玩家登記給開發者":"Send player registration to the developer","匿名記錄卡住的地方":"Anonymously record where I get stuck","匿名送出對局評分":"Send game scores anonymously","校正分數用":"for score calibration",
  "匿名送出學習進度":"Send learning progress anonymously","新手引導":"onboarding","作答":"answers","成長曲線":"growth curve","大廳顯示我的城市":"Show my city in the lobby","不顯示":"Don't show","申請刪除我在伺服器上的資料":"Request deletion of my data on the server",
  "每天自動送匿名健康摘要":"Send an anonymous health summary daily","預設關。打開後每天最多一次，把錯誤次數、卡頓、啟動時間、App 版本、裝置類型送給開發者；不含名字、裝置代號、棋譜、存檔":"Off by default. When on, at most once a day it sends error counts, stutters, startup time, app version and device type to the developer; no names, device ID, game records or saves",
  "本機使用與健康紀錄":"Usage and health log on this device","開發者模式":"Developer mode","一般玩家不用打開。打開後才會顯示連線電腦、AI 對戰等開發者功能":"Regular players don't need this. Turning it on shows developer features such as connecting to a computer and AI matches",
  "看所有回饋和截圖，決定玩家的回饋要不要修":"See all feedback and screenshots and decide what to fix","連線到開發者的電腦":"Connect to the developer's computer","看 AI 對戰、同步大師棋譜":"Watch AI matches, sync master games","開發者測試台":"Developer test bench",
  "重置虛擬玩家":"Reset virtual players","32 位棋友的積分、戰績、練習紀錄歸零；舊資料留在電腦上":"Reset the ratings, records and practice logs of the 32 virtual players; old data stays on the computer","舊手機產生碼":"Old phone: get code","新手機輸入碼":"New phone: enter code",
  "只換棋盤和棋子的樣子；要去別的朝代，請到雲河星槎。":"Only changes how the board and pieces look; to visit another dynasty, go to the Star Raft.","面板、對局文字、小說都跟著放大；棋盤上的棋子不變。":"Panels, game text and stories get bigger; pieces on the board stay the same.",
  "擬真：照局面難易決定想多久——開局 1～2 秒、一般 2～5 秒、難局最多 8 秒，只有一兩步可走時 1 秒內，像真人在想。快速：每步 1 秒左右。":"Realistic: thinking time follows how hard the position is: 1-2 s in the opening, 2-5 s normally, up to 8 s in hard positions, and under 1 s when only one or two moves are possible, like a person thinking. Fast: about 1 s per move.",
  "動畫縮到最短、略過吃子／將軍／開局特效，電腦用快速節奏":"Shortest animations, skips capture / check / opening effects, and the computer plays at fast pace","電腦或對方還在想時，先點棋子和落點排好下一步，輪到你就自動走（平面、3D 園子、線上對局都可以）":"While the computer or your opponent is thinking, tap a piece and a square to queue your next move; it plays automatically on your turn (flat board, 3D garden and online games)",
  "返回、更多、關閉鍵移到左下角，方便左手拇指按；棋盤和文字方向不變":"Back, More and Close move to the bottom left for your left thumb; the board and text direction stay the same","對局只留棋盤、名字、棋鐘和著法，適合直播、截圖（Esc 或右上角 ✕ 還原）":"Games show only the board, names, clocks and moves, good for streaming and screenshots (Esc or the ✕ at top right restores)",
  "電腦連按兩下 Esc、手機三指點一下，畫面換成試算表並靜音":"Press Esc twice on a computer or tap with three fingers on a phone: the screen turns into a spreadsheet and goes silent","落子、吃子、將軍、點錯時手機震一下（Android 有效；iPhone 的瀏覽器不支援震動）":"The phone vibrates on moves, captures, checks and mistaps (works on Android; iPhone browsers don't support vibration)",
  "黑子反白、提示加形狀，色弱也分得清":"Black pieces inverted and hints get shapes, easy to tell apart even with color blindness","色弱也分得清":"easy to tell apart even with color blindness","黑子加黑環、上一步改朱橘加外框、評語和長條加符號；紅綠色弱也分得清，3D 園子也套用":"Black pieces get a dark ring, the last move turns vermilion with an outline, and ratings and bars get symbols; works for red-green color blindness, in the 3D garden too",
  "下棋時只留平面棋盤：收起 3D 園子、開局卷軸、吃子水墨字和小帥（朝代擂台除外）":"Only the flat board while playing: hides the 3D garden, opening scrolls, ink capture marks and Xiao Shuai (except in the Dynasty arena)","下棋時收起背景動畫與裝飾":"hides background animations and decorations while playing",
  "看我的 3D 角色":"View my 3D character","存檔":"Save","改名":"Rename","本週學習週報":"This week's learning report","最近 7 天學了什麼，可以存成圖片給家長看":"What you learned in the last 7 days; save it as an image for parents","顯示":"Display",
  "顯示 3D 象棋小人":"Show 3D piece buddy","圓滾滾的棋子小人，跟著朝代換造型":"A round little piece buddy that changes outfits with the dynasty","大小":"Size","點一下":"Tap","表演一個動作":"Performs an action","點兩下":"Double-tap","出去散步":"Goes for a walk",
  "停放時":"when parked","長按":"Long press","拖動":"Drag","放到任何地方":"Put it anywhere","點三下":"Triple-tap","鞠躬":"Bows","先藏起來":"and hides for now","藏起來之後，打開上面的「顯示 3D 象棋小人」就會回來":"After hiding, turn on \"Show 3D piece buddy\" above to bring it back",
  "回到預設位置":"Back to default position","支援":"Support","回報錯誤、想要的功能":"Report bugs, request features","你回報、已經修好的問題":"Issues you reported that are fixed","開發者":"Developer","開始開發":"Development started","2026 年 10 月 29 日":"Oct 29, 2026",
  "版本":"Version","關於與開源授權":"About and open-source licenses","中炮":"Central Cannon","紅方開局":"Red's opening","已關閉開發者模式":"Developer mode off","已打開開發者模式":"Developer mode on","Q 版 3D":"Chibi 3D","真實 3D":"Realistic 3D",
  "畫好的立繪":"Illustrated portrait","這個版本還不能切換棋規":"This version can't switch rules yet","已換回千秋休閒規則":"Switched back to Qianqiu casual rules","千秋休閒規則":"Qianqiu casual rules","這個版本還不能切換":"This version can't switch yet",
  "下棋時會在 3D 園子裡":"Games will be in the 3D garden","下棋時用平面棋盤":"Games use the flat board","已打開色弱模式":"Color-blind mode on","已關閉色弱模式":"Color-blind mode off","已開啟「專注棋盤模式」，隱藏背景動畫與裝飾。":"Focus board mode on: background animations and decorations hidden.",
  "已關閉專注棋盤模式":"Focus board mode off","傳統":"Traditional","實心":"Solid","立體":"Raised","跟著手機":"Follow phone","淺色":"Light","深色":"Dark","跟著朝代":"Follow dynasty","朝代風格有自己的配色；選「經典」才會用到深淺色":"Dynasty styles have their own colors; light / dark applies only to \"Classic\"",
  "跟著星槎":"Follow the Star Raft","停靠哪一朝就用哪一朝":"Uses whichever dynasty the raft is docked at","星槎還沒停靠":"The Star Raft hasn't docked yet","棋盤也換成這個朝代的配色（可在下面改回）":"The board also switches to this dynasty's colors (change it back below)",
  "棋盤材質":"Board material","箭頭":"Arrow","從原來位置畫箭頭指到新位置":"Draws an arrow from the old square to the new one","動畫":"Animation","棋子滑過去，被吃的棋子淡出":"Pieces slide over and captured pieces fade out","落子前再確認":"Confirm before moving",
  "點了落點（或拖過去放下）先標出來，同一點再點一次才走，不怕手滑點錯":"Tapping (or dropping on) a square marks it first; tap the same square again to move, so slips don't count","吃子音效":"Capture sound","吃子時重重「啪」一聲、將軍時「鏘」一聲":"A heavy thud on captures and a clang on checks",
  "過場鼓聲":"Transition drums","進園子、上擂台、千秋穿梭時，敲一段那個朝代戰場上的鼓和鑼":"Plays that dynasty's battlefield drums and gongs when entering the garden or the arena, or time-traveling","背景音樂":"Background music","關":"Off","開":"On",
  "男聲":"Male voice","女聲":"Female voice","慢":"Slow","快":"Fast","語音報「吃」「將軍」":"Voice calls for captures and checks","吃子喊「吃！」、將軍喊「將軍！」；點一下可以試聽；可調語速":"Calls \"Capture!\" on captures and \"Check!\" on checks; tap to preview; speed adjustable",
  "語速":"Speed","將軍特效":"Check effect","被將軍或將對方軍時，棋盤上蓋「將軍！」字樣":"Stamps \"Check!\" on the board when either side gives check","吃子特效":"Capture effect","吃子時被吃的那格蓋一個水墨「吃」字":"Stamps an ink capture mark on the captured square",
  "這個瀏覽器不支援語音辨識":"this browser doesn't support speech recognition","開局名稱動畫":"Opening name animation","走出中炮、仙人指路、屏風馬…時，棋盤上展開卷軸寫出開局名":"When you play Central Cannon, Pawn Opening, Screen Horses and so on, a scroll unrolls on the board with the opening's name",
  "測試背景音樂":"Test background music","重置":"Reset","小帥回到預設位置了":"Xiao Shuai is back in the default position","小人出來了！點它會表演":"The buddy is out! Tap it to see a trick","會匿名記錄卡住的地方":"Will anonymously record where you get stuck",
  "不再記錄卡住的地方":"No longer recording where you get stuck","跟電腦下完會匿名送出對局評分":"Game scores will be sent anonymously after games against the computer","不再送出對局評分":"No longer sending game scores","會匿名送出學習進度":"Will send learning progress anonymously",
  "不再送出學習進度":"No longer sending learning progress","已打開：每天最多送一次匿名健康摘要（卡頓與錯誤統計）":"On: sends an anonymous health summary at most once a day (stutter and error stats)","已關閉：還沒送出的也一起丟掉":"Off: anything not yet sent is discarded too",
  "會送玩家登記給開發者":"Will send player registration to the developer","不再送玩家登記":"No longer sending player registration","大廳不顯示城市":"City hidden in the lobby","原型":"prototype","可計積分":"rated","雙方都選這一套":"both players choose this set",
  "三次循環":"threefold repetition","怎麼判":"How rulings work","差在哪":"What's different","原型，不計積分":"prototype, unrated","亞洲棋例（直接捉子）的子集。晉級賽、線上積分都用這一套。":"A subset of the Asian rules (direct chases). Used for ranked games and rated online play.",
  "家長與兒童模式":"Parents and kids mode","素材與授權":"Assets and licenses","版本與差異":"Versions and differences","已知限制":"Known limitations","自動測試紀錄":"Automated test log","文史考據":"Historical research","棋規與裁決":"Rules and rulings",
  "連線與資料":"Connection and data","空間導覽":"Spatial guide","無障礙證據":"Accessibility evidence","音效設計":"Sound design","電腦怎麼下":"How the computer plays","新手數字":"Beginner numbers","開源對照":"Open-source notes","快棋與預走":"Blitz and premove",
  "純淨與老闆鍵":"Clean screen and boss key","英文介面":"English UI","聯絡與支援":"Contact and support","圖片":"Image","讀取中":"Loading","現在讀不到這份說明（可能沒有網路）。連上網路後再打開一次。":"Can't load this guide right now (maybe no internet). Open it again once you're online.",
  "刪除這支手機的全部資料":"Delete all data on this phone","對局還在進行":"A game is still in progress","線上對局下完（或認輸）之後，才能刪除資料。":"You can delete data only after the online game ends (or you resign).","刪除這支手機的全部資料？":"Delete all data on this phone?",
  "會刪掉：全部對局紀錄和棋譜、解題和故事進度、每一格存檔、角色與收藏、設定、暱稱和線上積分。":"This deletes: all game records, puzzle and story progress, every save slot, characters and collections, settings, nickname and online rating.","不要刪":"Don't delete",
  "真的要刪除嗎？":"Really delete?","刪掉就救不回來。":"Once deleted, it can't be recovered.","全部刪除":"Delete everything","對局紀錄和棋譜":"Game records","目前的進度":"Current progress","存檔格":"Save slots","刪的時候出錯":"An error occurred while deleting",
  "被另一個開著的 App 分頁擋住":"Blocked by another open tab of the app","手機太久沒回應":"The phone didn't respond in time","正在刪除這支手機的資料":"Deleting data on this phone","有些資料還沒刪掉":"Some data wasn't deleted","先把其他開著這個 App 的分頁或視窗關掉，再按「再試一次」。":"Close other tabs or windows with this app open, then tap \"Try again\".",
  "先這樣":"Leave it for now","資料刪除中":"Deleting data","檢查中":"Checking","已是最新版":"Already up to date","下載新版中":"Downloading the new version","小":"Small","標準":"Standard","大":"Large","特大":"Extra large","超大":"Huge",
  "最大":"Largest","合成":"Synthesized","實木":"Solid wood","輕敲":"Light tap","經典 01–10":"Classic 01-10","園子擬音":"Garden foley","走棋音效":"Move sounds","棋子落下的聲音，從下面的選單挑一種，選了會先試聽（先走子、再吃子）":"The sound of a piece landing; pick one from the menu below to preview it (a move, then a capture)",
  "試聽":"Preview","現在跟著螢幕報讀模式":"currently following screen reader mode","傾斜手機看景深":"Tilt phone for depth","雲河星槎 13 站都學會以後解鎖":"Unlocks after learning all 13 Star Raft stops","本命化形":"Signature transformation",
  "場景節氣天氣":"Seasonal scene weather","戶外場景照節氣下雨、下雪、樹葉變色，清晨偏青、黃昏偏暖（很淡，不擋點選）":"Outdoor scenes follow the seasons with rain, snow and turning leaves; mornings are cooler and evenings warmer (subtle, doesn't block taps)",
  "無障礙":"Accessibility","螢幕報讀與鍵盤模式":"Screen reader & keyboard mode","下棋一律用平面棋盤（3D 園子改用地點清單），每一格都念得出來；方向鍵移動、Enter 選子落子；每一步念出來；關掉裝飾動畫":"Always uses the flat board (the 3D garden becomes a list of places) and every square can be read aloud; arrow keys move, Enter selects and moves; every move is announced; decorative animations off",
  "高對比主題（低視力）":"High-contrast theme (low vision)","高對比主題":"High-contrast theme","白底黑字、黑色棋盤線；主要文字和棋子字對比 7 比 1 以上（圖片上的字另外檢查）；提示用形狀加顏色":"Black on white with black board lines; main text and piece characters have at least 7:1 contrast (text in images checked separately); hints use shapes plus color",
  "測試與證據":"Tests and evidence","跟著系統字級":"Follow system text size","盡量跟著手機設定的文字大小，實際效果依手機與瀏覽器而定（iPhone：設定 → 輔助使用 → 顯示與文字大小 → 更大的文字）":"Tries to follow the phone's text size; results depend on the phone and browser (iPhone: Settings → Accessibility → Display & Text Size → Larger Text)",
  "字級跟著系統":"Text size follows the system","字級照 App 裡選的":"Text size uses the app setting",
  /* 線上大廳（02-shell Lobby、07x2 天井、07x3 名冊） */
  "線上大廳要用安裝在手機上的 App（GitHub 版）。按右上角 📤 可以拿到網址。":"The online lobby needs the app installed on your phone (GitHub version). Tap 📤 at top right to get the link.","閒置中":"Idle","對戰中":"Playing","觀戰中":"Watching",
  "正在找對手":"Looking for an opponent","連線到大廳中":"Connecting to the lobby","回到我進行中的對局":"Back to my game in progress","有人按「隨機配對」就會自動開始":"Starts automatically when someone taps \"Random match\"","正在幫你找對手":"Finding you an opponent",
  "隨機配對":"Random match","自動找一位線上對手":"automatically finds an online opponent","報名截止":"Sign-up closed","週六點將":"roll call on Saturday","點將中":"Roll call in progress","比賽進行中":"Tournament in progress","從缺":"vacant",
  "本週休賽":"No tournament this week","我的對局":"My games","回到戰場":"Back to the battle","還沒有人在看":"No one watching yet","回去看":"Go back and watch","觀看":"Watch","路過的石桌往事人物":"Stone Table Tales characters passing by",
  "在線上":"Online","點一下邀請":"tap to invite","上次":"Last time","你贏":"you won","你輸":"you lost","和棋":"draw","目前沒有人在對戰，有人開始下棋就會出現在這裡。":"No one is playing right now. Games will show up here when someone starts.","連線中":"Connecting",
  "邀請對戰":"Invite to play","大家都在對戰或觀戰中，可以先去看一盤，或按上面「隨機配對」等人。":"Everyone is playing or watching. Watch a game first, or tap \"Random match\" above and wait.","目前只有你在線上。請朋友打開象棋千秋（按右上角 📤 分享），他們就會出現在這裡。":"You're the only one online. Ask friends to open Xiangqi Qianqiu (share with 📤 at top right) and they'll show up here.",
  "目前沒有網路。線上對戰和觀戰要連上網路才能用；跟電腦下棋、做題、看棋譜不受影響。":"No internet connection. Online play and watching need the internet; playing the computer, puzzles and the game library still work.","AI 對戰":"AI match","GPT 對 Claude":"GPT vs Claude",
  "電腦上的兩個 AI 在下棋":"Two AIs playing on a computer","對局時制":"Time control","快棋":"Blitz","預設":"Default","常見比賽":"common in tournaments","慢一點":"A bit slower","慢棋":"Slow","每一方的總思考時間。開局時跟對手比，雙方選的不同就用比較短的；沒選就是 15 分鐘。另外每一步最多 3 分鐘。":"Total thinking time per side. At the start it's compared with your opponent's choice and the shorter one is used if they differ; the default is 15 minutes. Each move is limited to 3 minutes.",
  "現在沒有人在看":"No one is watching right now","你有一盤進行中的對局，去觀戰會離開它，確定？":"You have a game in progress. Watching will leave it. Continue?","你有一盤進行中的對局，邀請新對局會離開它，確定？":"You have a game in progress. Inviting someone to a new game will leave it. Continue?",
  "棋友資料":"Player profile","剛剛在線上":"Online just now","對方的 App 還沒更新，看不到戰績":"Their app isn't updated yet, so their record isn't available","勝":"W","負":"L","和":"D","勝率":"Win rate","還沒下過":"Never played","觀看他的對局":"Watch their game",
  "線上戰績":"Online record","你跟他下過":"Your games with them","時制不一樣":"Different time controls","兩邊要一樣才能開局。":"Both sides must match to start.","先不要":"Not now","已送出邀請":"Invitation sent","取消邀請":"Cancel invitation",
  "要改成一樣才能開局。":"They must match to start.","婉拒":"Decline","接受":"Accept","對手送來不合規則的棋步":"The opponent sent an illegal move","已經擋下來了，你的棋盤沒有被改。這盤改成友誼賽，不計分。如果一直等不到對方，可以先離開這盤。":"It was blocked and your board wasn't changed. This game is now a friendly and won't be rated. If the opponent doesn't come back, you can leave the game.",
  "知道了":"Got it","已擋下":"blocked","這盤改成友誼賽":"this game is now a friendly","贏了":"Won","輸了":"Lost","對方接受了":"Opponent accepted","你執黑，對方先走":"You play Black; the opponent moves first","你執紅先走":"You play Red and move first",
  "對方離開了，繼續幫你找對手":"The opponent left; still looking for an opponent","對方離開了，這盤沒有開始":"The opponent left; the game didn't start","名冊":"Roster","空桌":"Empty table","雲遊棋客":"Wandering Player","空著的燈":"Unlit lantern",
  "天井清靜":"The courtyard is quiet","敲鑼等棋友":"strike the gong and wait for players","這盤剛下完了":"This game just ended","找對手中":"Finding an opponent","千燈天井":"Courtyard of a Thousand Lanterns","關上名冊":"Close the roster",
  "天井":"Courtyard","名帖":"Name cards","門房的迎客案：水牌、客簿、名帖、漆盒":"The doorkeeper's reception desk: notice board, guest book, name cards, lacquer box","茶樓門房的櫃台案：水牌、客簿、名帖、拜匣":"The teahouse doorkeeper's counter: notice board, guest book, name cards, card box",
  "路過的人物":"Passers-by","回天井":"Back to the courtyard","上一頁":"Previous page","下一頁":"Next page","收起客簿":"Close the guest book","熟面孔":"Familiar faces","可以邀請":"Can invite","一盤棋":"A game","目前沒有人在對戰":"No one is playing right now",
  "誰在看":"Who's watching","我":"Me","對局中":"In a game","回到對局":"Back to the game","閒著":"Free","大廳":"Lobby","回大廳":"Back to the lobby",
  /* 大廳安全：檢舉、封鎖、稱號、家長（07x4） */
  /* 紅藍隊 R05：設定頁「自己的名字不合格」提示（07x4 LBN_WHY） */
  "你的名字不適合公開":"Your name isn't suitable to show publicly","太長":"it's too long","是空白的":"it's blank","有看不見的字":"it has invisible characters","有疊在一起的符號":"it has stacked symbols",
  "有角括號":"it has angle brackets","像網址":"it looks like a web address","像 Email":"it looks like an email","有 4 位以上的數字":"it has 4 or more digits in a row",
  "像聯絡方式（LINE、IG、加我…）":"it looks like contact info (LINE, IG, add me…)","像官方或開發者（官方、公告、裁判、客服、系統…）":"it looks like an official or the developer (official, notice, referee, support, system…)",
  "棋友會看到系統稱號":"other players will see a system title",
  /* 11/13：不雅字詞、不合格名字改送稱號、稱號三選一（07x4） */
  "有不雅或罵人的字":"it has rude or offensive words","這個名字不能在大廳顯示":"This name can't be shown in the lobby","別人看到的是稱號":"Others see the title",
  "換一組":"New set","線上大廳恢復顯示":"The lobby shows your name again","線上大廳改成顯示稱號":"The lobby now shows the title","請到「我的角色」改名字":"Go to \"My character\" to change your name","請到":"go to","改名字":"to change your name",
  "不當名字":"Inappropriate name","名字有髒話、罵人，或不適合小朋友":"The name has swearing or insults, or isn't suitable for kids","騷擾":"Harassment","聊天讓人不舒服、一直纏著邀請":"Chat is upsetting, or keeps pestering with invites","作弊":"Cheating",
  "好像用電腦軟體幫忙下棋":"Seems to be using software to play","其他":"Other","其他想讓開發者知道的事":"Anything else the developer should know","長安":"Chang'an","洛陽":"Luoyang","咸陽":"Xianyang","汴京":"Bianjing","臨安":"Lin'an","金陵":"Jinling",
  "大都":"Dadu","燕京":"Yanjing","成都":"Chengdu","揚州":"Yangzhou","姑蘇":"Gusu","錢塘":"Qiantang","敦煌":"Dunhuang","廣陵":"Guangling","會稽":"Kuaiji","建康":"Jiankang","江陵":"Jiangling","襄陽":"Xiangyang","晉陽":"Jinyang","鄴城":"Yecheng",
  "涼州":"Liangzhou","番禺":"Panyu","泉州":"Quanzhou","桂林":"Guilin","棋友":"Player","這位棋友":"This player","這盤棋還會繼續；不想下了可以認輸離開。":"This game will continue; if you don't want to play on, you can resign and leave.","封鎖以後，在這支手機上：":"After blocking, on this phone:",
  "他不會出現在名冊和大廳燈籠裡":"they won't appear in the roster or lobby lanterns","他送來的邀請會自動婉拒":"their invitations are declined automatically","隨機配對會避開他":"random matching avoids them","對局中不顯示他的表情和聊天":"their emotes and chat are hidden in games",
  "封鎖":"Block","婉拒並封鎖":"Decline and block","排隊中":"Queued","還沒送出，有網路會自動補送":"Not sent yet; it will be sent automatically when online","已從手機送出":"Sent from this phone","手機已把檢舉送出去；開發者處理好會在這裡標「🛠 已處理」":"The report has been sent from this phone; it will be marked \"🛠 Handled\" here once the developer deals with it",
  "開發者已收到":"Received by the developer","開發者看到了，正在處理":"The developer has seen it and is working on it","已處理":"Handled","開發者看過並處理了":"The developer reviewed and handled it","沒送出":"Not sent","手機裡待送的東西太多被擠掉了，需要的話請再檢舉一次":"It was dropped because too many items were waiting to be sent; please report again if needed",
  "沒有網路":"No internet","我的檢舉":"My reports","每一筆檢舉都有一個編號。":"Every report has a number.","如果要詢問進度，告訴開發者這個編號。":"To ask about progress, give the developer this number.","📮 排隊中 → ✅ 已從手機送出 → 🛠 已處理。「已從手機送出」只代表手機送出去了（表單不會回收件確認）；開發者處理好、App 抓到新的處理紀錄以後，才會標「🛠 已處理」。這份清單只存在這支手機，只記編號、時間、對象名字和狀態。":"📮 Queued → ✅ Sent from this phone → 🛠 Handled. \"Sent from this phone\" only means the phone sent it (the form doesn't confirm receipt); it is marked \"🛠 Handled\" only after the developer handles it and the app picks up the new record. This list is stored only on this phone and keeps only the number, time, name and status.",
  "還沒有檢舉過任何人":"You haven't reported anyone","他是我的對手":"they're my opponent","他在下這盤":"they're playing this game","觀戰列表":"Watch list","其他頁":"Other page","檢舉":"Report","開發者會收到他的代號、名字和你選的原因。他不會知道是誰檢舉的。送出後會給你一個檢舉編號。":"The developer receives their ID, name and the reason you chose. They won't know who reported them. You'll get a report number after sending.",
  "想多說一點可以寫在這裡（可以不寫）":"Add more details here if you like (optional)","同時封鎖他":"Also block them","送出檢舉":"Send report","請先選一個原因":"Please choose a reason first","剛剛已經送過了":"Already sent just now","送出中":"Sending",
  "檢舉編號":"Report number","如果要詢問進度，告訴開發者這個編號。對方不會知道是誰檢舉的。":"To ask about progress, give the developer this number. The other player won't know who reported them.","看我的檢舉":"View my reports","這個帳號已被開發者停權":"This account has been suspended by the developer",
  "你封鎖了他":"You blocked them","解除封鎖":"Unblock","請家長確認":"Parent check","改成「我取的名字」以後，線上大廳的陌生人會看到孩子自己取的名字。請家長算一下：":"After switching to \"My own name\", strangers in the online lobby will see the name your child chose. Parents, please solve:",
  "答案":"Answer","答案不對，還是顯示稱號":"Wrong answer; the title is still shown","你取的名字":"Your name","我封鎖的人":"People I blocked","封鎖的人不會出現在名冊和燈籠裡，邀請會自動婉拒，配對會避開，對局中不顯示他的表情和聊天。名單只存在這支手機。":"Blocked players don't appear in the roster or lanterns, their invitations are declined automatically, matching avoids them, and their emotes and chat are hidden in games. The list is stored only on this phone.",
  "解除":"Unblock","還沒有封鎖任何人":"You haven't blocked anyone","系統給的稱號":"title given by the app","在線上大廳顯示":"Shown in the online lobby","別人在大廳、對局、觀戰看到的名字。你自己的畫面照常顯示你取的名字。":"The name others see in the lobby, in games and when watching. Your own screen still shows the name you chose.",
  "稱號":"Title","我取的名字":"My own name","現在別人看到：":"Others now see:","看名單、解除封鎖":"See the list, unblock","看檢舉編號和處理狀態":"See report numbers and status","線上大廳安全須知":"Online lobby safety guide","快捷語、個資、檢舉封鎖、家長關閉大廳":"Quick phrases, personal info, reporting and blocking, parents closing the lobby",
  "遇到不舒服的名字或聊天：點他的名字，資料卡最下面有「🚩 檢舉」「🚫 封鎖」。":"If a name or chat makes you uncomfortable, tap their name: \"🚩 Report\" and \"🚫 Block\" are at the bottom of their card.","線上大廳暫時不能使用":"The online lobby is temporarily unavailable",
  "這個帳號暫時不能使用線上大廳，若有疑問請用意見回饋聯絡。":"This account can't use the online lobby for now. If you have questions, contact us through Feedback.","挑戰電腦、石桌往事、殘局、棋譜這些單機功能都照常可以玩。":"Offline features such as playing the computer, Stone Table Tales, endgames and the game library still work.",
  "兒童模式":"Kids mode","線上大廳關著":"the online lobby is closed","兒童模式不跟陌生人互動：線上大廳、千秋盃、觀戰都不開，資料也不送出去。":"Kids mode doesn't interact with strangers: the online lobby, Qianqiu Cup and watching are all closed, and no data is sent.",
  "想打開，請家長到「設定房間的 🔒 小鎖匣 → 👪 家長與護眼 → 👧 兒童模式」。":"To change it, a parent can go to \"Settings room 🔒 small lockbox → 👪 Parents and eye care → 👧 Kids mode\".","到設定":"Go to Settings","線上大廳已由家長關閉":"The online lobby was closed by a parent",
  "想打開，請家長到「設定房間的 🔒 小鎖匣 → 👪 家長與護眼 → 🔒 家長修改」。":"To change it, a parent can go to \"Settings room 🔒 small lockbox → 👪 Parents and eye care → 🔒 Parent changes\".","只能用快捷語":"Quick phrases only","大廳和對局裡不能打字，大家都只能用 App 內建的快捷語和表情":"You can't type in the lobby or in games; everyone uses only the app's built-in quick phrases and emotes",
  "不要給個資":"Don't share personal info","名字預設用系統給的「稱號」。不要把真名、學校、電話、住址、LINE、照片告訴任何人，也不要跟陌生人約到 App 外面":"Names default to the title given by the app. Don't tell anyone your real name, school, phone number, address, LINE or photos, and don't arrange to meet strangers outside the app",
  "不舒服就檢舉、封鎖":"Feel uncomfortable? Report and block","點對方的名字，資料卡最下面有「🚩 檢舉」「🚫 封鎖」。對方不會知道是誰檢舉的；封鎖後他的邀請、表情、聊天都不會出現。下棋時不想下了，可以直接認輸離開":"Tap their name: \"🚩 Report\" and \"🚫 Block\" are at the bottom of their card. They won't know who reported them; after blocking, their invitations, emotes and chat no longer appear. If you don't want to keep playing, you can just resign and leave",
  "家長可以關掉大廳":"Parents can close the lobby","「設定房間的 🔒 小鎖匣 → 👪 家長與護眼」可以關閉線上大廳，或打開「👧 兒童模式」（不跟陌生人互動、資料不送出、提醒休息）":"\"Settings room 🔒 small lockbox → 👪 Parents and eye care\" can close the online lobby or turn on \"👧 Kids mode\" (no contact with strangers, no data sent, break reminders)",
  "我知道了":"I understand",
  /* 連線狀態小卡（07hs-netsig） */
  "已釘選":"Pinned","跟上次對局同一把":"same key as last game","第一次見到":"First seen","沒有金鑰":"No key","對方版本較舊":"opponent's version is older","裁判台認證":"referee verified","邀請有簽名":"signed invitation","斷線":"Disconnected","同步中":"Syncing",
  "沒回應":"No response","網路斷了，重新連線中；斷線時走的棋，連上後會自動送出。":"Connection lost, reconnecting; moves made while offline will be sent once reconnected.","正在量連線延遲":"Measuring latency","跟對方手機來回一趟":"round trip to the opponent's phone",
  "跟伺服器來回一趟":"round trip to the server","未驗證":"unverified","同步訊息沒有簽名":"sync messages aren't signed","棋局跟對方一致。":"The game matches the opponent's.","棋局跟對方還沒對上，正在自動補齊。":"The game doesn't match the opponent's yet; syncing automatically.",
  "對方的手機金鑰跟上次對局不一樣（換手機、重裝 App 也會這樣），點一下看指紋。":"The opponent's phone key differs from your last game (changing phones or reinstalling does this too). Tap to see the fingerprint.","對方顯示離線":"opponent shows offline",
  "對方沒有回應":"The opponent isn't responding","現在輪到對方。":"It's the opponent's turn.","現在輪到你：可以先走，等他回來。":"It's your turn: you can move now and wait for them.","判和、離開都是「中止這盤、不計積分」。":"Draw and Leave both mean \"stop this game, unrated\".",
  "千秋盃沒有中止：可以先回大廳，這盤會保留。":"Qianqiu Cup games can't be stopped: you can go back to the lobby and the game is kept.","繼續等":"Keep waiting","判和":"Call it a draw","離開這盤":"Leave this game","這盤保留":"game kept","新版":"New version",
  "同步訊息有簽名":"sync messages signed","對方回報這盤棋鐘不可信，改為不計分（雙方都不加減分）":"Opponent reported an untrusted clock; game unrated","這盤棋鐘不可信，改為不計分":"Clock untrusted; this game is unrated","上一版":"Previous version","同步訊息沒簽名":"sync messages unsigned","舊版":"Old version","沒有同步頻道":"no sync channel","還不知道":"Unknown yet","雙方簽名":"Both signed","無法驗證":"can't verify",
  "裁判台開局":"started by the referee desk","有回應":"Responding","很久沒回應":"No response for a long time","自己斷線":"I disconnected","現在不在線上對局裡。":"Not in an online game right now.","連線狀態":"Connection status","跟對方手機來回":"Round trip to opponent's phone",
  "已驗簽":"signature verified","跟伺服器來回":"Round trip to server","對方沒回 pong":"opponent didn't reply pong","還沒量到":"Not measured yet","還沒收到":"Not received yet","一致":"Match","不一致":"Mismatch","自動補齊中":"syncing automatically",
  "還沒比對":"Not compared yet","延遲":"Latency","最近幾次":"Recent","平均／抖動":"Average / jitter","我這邊":"My side","對方報的":"Opponent's report","雙方局面":"Both positions","對方的報告未驗證":"opponent's report unverified","對局簽名":"Game signature",
  "對方版本":"Opponent's version","這盤同步訊息一律要簽名":"all sync messages in this game must be signed","這盤重連":"Reconnects this game","收到的同步訊息":"Sync messages received","丟掉的":"Dropped","補齊":"Resynced","對方金鑰":"Opponent's key",
  "對方金鑰指紋":"Opponent's key fingerprint","計算中":"Calculating","我的指紋":"My fingerprint","對方的手機金鑰跟你上次跟他下棋時不一樣。換手機、重裝 App、清掉網站資料都會這樣；不確定是不是本人，請當面或用別的方式跟他比對：他小卡上的「我的指紋」要等於你這裡的「對方金鑰指紋」。":"The opponent's phone key differs from the last time you played them. Changing phones, reinstalling the app or clearing site data does this; if you're not sure it's really them, compare in person or another way: \"My fingerprint\" on their card should equal \"Opponent's key fingerprint\" here.",
  "第一次跟這把金鑰下棋。想確認是本人，可以跟他比對指紋：他小卡上的「我的指紋」要等於你這裡的「對方金鑰指紋」。":"First game with this key. To confirm it's really them, compare fingerprints: \"My fingerprint\" on their card should equal \"Opponent's key fingerprint\" here.",
  "送出":"Sent","收下":"Received","時間":"Time","種類":"Type","序號":"Seq","驗簽":"Signature","還沒有。":"None yet.","最近同步事件":"Recent sync events","新的在前":"newest first","複製除錯資訊":"Copy debug info","已複製除錯資訊":"Debug info copied",
  "不含金鑰、代號、名字":"no keys, IDs or names","這支手機不能複製":"This phone can't copy","對方剛好回來了，棋局繼續":"The opponent just came back; the game continues","邀請":"Invite","點一下看詳細。":"Tap for details.","對方回來了，棋局繼續":"The opponent is back; the game continues",
  /* 學習頁：一盞茶殘局、珍品藏局（07c、07c2） */
  "一口":"One sip","一盞":"One cup","一壺":"One pot","入門":"Beginner","初級":"Elementary","中級":"Intermediate","中高級":"Upper intermediate","高級":"Advanced","明清":"Ming-Qing","現代":"Modern","一步定勝負":"One move decides","短殺":"Short mate",
  "中殺":"Medium mate","大師收官":"Master finish","古譜校錯":"Old manual corrections","題庫載入失敗":"Failed to load puzzles","昨天沒來":"You missed yesterday","護天符":"Streak shield","連續天數守住了":"Your streak is safe","一盞茶每連續 7 天得 1 張護天符，最多存 2 張；漏一天會自動用掉一張。":"Teatime gives 1 streak shield for every 7 days in a row, up to 2; one is used automatically if you miss a day.",
  "好":"OK","昨天沒來，自動用掉這 7 天一次的免簽，連續天數照算。":"You missed yesterday, so this week's free pass was used automatically and your streak continues.","章回棋路":"Chapter path","昨天沒來，今天的連續天數重新從 1 算了。":"You missed yesterday, so your streak restarts from 1 today.",
  "昨天沒來喝茶，這 7 天的免簽已經用過，也沒有護天符可以補。":"You missed tea yesterday; this week's free pass is used up and you have no streak shield to cover it.","請假條":"Leave note","要不要寫請假條":"Write a leave note","用 1 枚將令補上":"Cover it with 1 command token",
  "這張請假條用不了（可能已經補過了）":"This leave note can't be used (maybe already covered)","不用了":"No thanks","一盞茶連續 7 天的獎勵":"Teatime 7-day streak reward","星槎石桌":"Star Raft stone table","特級大師對局":"Grandmaster games","大師當年在這裡只有一步能保住勝勢，找出來":"Here the master had only one move to keep the winning edge. Find it",
  "只有一步能保住勝勢，找出來":"Only one move keeps the winning edge. Find it","對方還有棋可走，緩過氣來了。":"The opponent still has moves and gets a breather.","局面反而變差了。":"The position actually got worse.","這樣只能和棋。":"This only draws.",
  "還有優勢，但贏不下來了。":"Still better, but no longer winning.","還算不錯，但讓對方的將逃掉了。":"Not bad, but the enemy General escaped.","這步不在解答裡。":"This move isn't in the solution.","這步要將軍":"This move must give check","這步不是將軍":"This move isn't a check",
  "先將軍":"Check first","不用急著將軍，先走一步安靜的棋":"No need to rush the check; play a quiet move first","要捨得：走過去的子對方吃得到":"Be willing to sacrifice: the piece you move can be captured","可以吃子":"You can capture","今天的茶喝完了":"Today's tea is finished",
  "今日茶單":"Today's tea menu","3 題":"3 puzzles","指名一局珍品藏局":"Pick a treasure puzzle","得一件珍品":"Win a treasure","每天 3 題":"3 puzzles a day","5 分鐘":"5 minutes","茶單準備中":"Preparing the tea menu","看過答案":"Answer viewed",
  "完美":"Perfect","解開":"Solved","跳過":"Skip","今天完成會用掉免簽":"finishing today uses the free pass","可用":"available","這 7 天已用":"used this week","今天剛指名一局藏局":"You just picked a treasure puzzle today","今天剛拿到珍品":"You just won a treasure today",
  "今天沒空，跳過一壺":"No time today, skip the pot","今天的茶喝完了，明天凌晨 4 點換新茶單。還想多練，就到下面的自由練習。":"Today's tea is finished; a new menu arrives at 4 a.m. tomorrow. For more practice, try free practice below.","自由練習":"Free practice",
  "不算茶單":"not part of the menu","依主題選題":"Pick by theme","殺法":"mating patterns","戰術":"tactics","教練出作業":"Coach assignments","挑幾題組成一份作業，產生連結傳給學生":"Pick some puzzles to make an assignment and send students a link",
  "怎麼玩":"How to play","輪到你走，對方會用 Pikafish 最頑強的應法。走錯了，對方會真的下出反駁給你看，看完可以退回重想（這題就不算完美），或用 1 張悔棋符收回。":"It's your move; the opponent answers with Pikafish's most stubborn defense. If you go wrong, it actually plays the refutation; afterwards you can go back and rethink (the puzzle is then not perfect), or take it back with 1 undo token.",
  "提示有四層：①免費的方向提示 ②1 顆提示棋圈出關鍵子 ③指出落點（Lv 20 起跟第②層一起給）④看答案（沒有修為、沒有心得）。":"Hints come in four levels: (1) a free hint about direction, (2) 1 hint token circles the key piece, (3) the destination is shown (together with level 2 from Lv 20), (4) the answer (no XP and no insight).",
  "沒用提示、沒走錯解開＝完美，第一次完美得 1 個心得（5 個換 1 顆提示棋）。一口＋一盞解完、一壺解完或跳過，今天就算完成；斷一天會自動用掉每 7 天一次的免簽，免簽用過了再用「🛡 護天符」（一張補一天）；都用完了、只漏了昨天，還可以用 1 枚將令寫一張「📝 請假條」補上（每 7 天最多一張）":"Solving without hints or wrong moves is perfect; your first perfect solve gives 1 insight (5 insights buy 1 hint token). Finishing the sip and the cup, or the pot, or skipping completes the day. A missed day uses the weekly free pass automatically, then a \"🛡 streak shield\" (one covers one day); if those are used up and you only missed yesterday, you can still spend 1 command token on a \"📝 leave note\" (at most one per 7 days)",
  "每連續 7 天得一件珍品（130 件收齊後，改成指名一局還沒解的珍品藏局），也得 1 張護天符（最多存 2 張）":"Every 7 days in a row you get a treasure (once all 130 are collected, you pick an unsolved treasure puzzle instead), plus 1 streak shield (up to 2)",
  "題庫要先下載才能玩（連上網路再打開一次）。":"The puzzles must be downloaded first (connect to the internet and open this again).","現在解":"Solve now","卡住了嗎？我把第一步要動的那顆子框起來了，想想它能走到哪裡！":"Stuck? I've framed the piece that moves first. Think about where it can go!",
  "珍品藏局":"Treasure puzzles","古法殘局":"Classical endgames","找不到這件珍品的藏局（資料可能更新了）。":"Can't find this treasure's puzzle (the data may have been updated).","還沒找到這件珍品，撿到了才能解它藏著的殘局。":"You haven't found this treasure yet; pick it up to unlock its hidden endgame.",
  "回去":"Go back","回珍品冊":"Back to the treasure album","回今日茶單":"Back to today's menu","找不到這一題（題庫可能更新了）。":"Can't find this puzzle (the puzzle set may have been updated).","免費":"free","已全部提示":"All hints given",
  "看答案":"Show answer","跳過一壺":"Skip the pot","這一步已經全部提示了":"All hints for this move have been given","提示棋還不能用":"Hint tokens can't be used yet","藍框這顆子就是關鍵（再一顆提示棋會指出落點）":"The piece in the blue frame is the key (another hint token shows the destination)",
  "藍框：要動的子和要去的位置":"Blue frame: the piece to move and where it goes","藍框這顆子就是這一步要動的":"The piece in the blue frame is the one to move","守住了！按「下一步」看後續":"Held! Tap \"Next\" to see what follows","對了！按「下一步」看後續":"Correct! Tap \"Next\" to see what follows",
  "守住了":"Held","對了":"Correct","困斃！對方一步都動不了":"Stalemate! The opponent can't move at all","好棋":"Good move","這步也能贏":"This move also wins","就是古譜原來那一手":"exactly the move from the old manual","對方的反駁":"Opponent's refutation",
  "直接看局面":"look at the position directly","退回重想":"Go back and rethink","收回了，這一步不算走錯":"Taken back; this move doesn't count as a mistake","自動播完":"Autoplay to end","看答案這題就沒有修為和心得，珍品也不會打上「已解」，確定？":"Viewing the answer means no XP or insight for this puzzle, and the treasure won't be marked \"Solved\". Continue?",
  "看答案這題就沒有修為和心得，也不算進棋史卡，確定？":"Viewing the answer means no XP or insight for this puzzle, and it won't count toward history cards. Continue?","看答案這題就沒有修為和心得，確定？":"Viewing the answer means no XP or insight for this puzzle. Continue?",
  "殘局":"Endgames","攢滿 5 個心得，換到 1 顆提示棋":"Collected 5 insights and got 1 hint token","珍品冊那一格打上了紅色「已解」。":"That slot in the treasure album is now stamped \"Solved\" in red.","這件珍品之前就打過「已解」了。":"This treasure was already marked \"Solved\".",
  "已解":"Solved","下一件藏局":"Next treasure puzzle","下一題":"Next puzzle","完美解開":"Perfect solve","答案看完了":"Answer viewed","解開了":"Solved","解完卡":"Solve card","看了答案":"Viewed the answer","沒有修為":"no XP","心得":"insight",
  "用了提示棋":"used a hint token","看整局":"View whole game","回茶單":"Back to the menu","回解完卡":"Back to the solve card","殺棋":"Mate","保勝":"Keep the win","題庫還沒有主題標籤（更新後就有）。":"The puzzle set has no theme tags yet (they come with an update).",
  "戰術主題":"Tactical themes","練這題":"Practice this","煮茶席":"Tea table","煎茶席":"Tea table","宋代點茶席":"Song-style whisked tea table",
  /* 學習頁：每日同題（07dq） */
  "一次走對":"Right the first time","走錯過才走對":"Right after a mistake","用了提示":"Used a hint","這個每日同題的網址看不懂（日期要像 2026-11-13）。":"This Daily Puzzle link can't be read (the date should look like 2026-11-13).","這一天還沒到，題目還沒出（臺灣時間 0:00 換題）。如果是朋友剛分享的，可能是對方或你的手機時間不準，手機時間請設成自動。":"That day hasn't come yet, so the puzzle isn't out (it changes at 0:00 Taiwan time). If a friend just shared it, one of your phone clocks may be off; set the phone time to automatic.",
  "沒看提示":"no hints","補玩":"Catch-up","象棋千秋 每日殘局":"Xiangqi Qianqiu Daily Endgame","每天一題":"One puzzle a day","大家同一題":"same puzzle for everyone","不劇透":"no spoilers","成績複製好了，貼給朋友吧":"Result copied; paste it to your friends",
  "複製這段成績":"Copy this result","成績圖存好了，文字也複製了":"Result image saved and text copied","分享成績":"Share result","成績圖":"Result image","這是再解一次；分享的還是第一次的成績。":"This is a re-solve; sharing still uses your first result.",
  "一次到位":"First try","走錯 1 次":"1 mistake","走錯 2 次":"2 mistakes","走錯 3 次":"3 mistakes","4 次以上":"4 or more","我的每日同題":"My Daily Puzzle","已玩":"Played","目前連續":"Current streak","最長連續":"Longest streak","沒看答案解開＝贏（用了提示也算）。連續天數只算當天解開的；補玩、看答案都會讓連續天數歸零重算。這些數字只存在這支手機。":"Solving without viewing the answer counts as a win (hints are OK). Streaks count only puzzles solved on the day; catch-up plays and viewing the answer reset the streak. These numbers are stored only on this phone.",
  "前幾天的題":"Earlier puzzles","可以補玩，記成「補玩」，不算連續天數。":"You can play them as catch-up; they're marked \"Catch-up\" and don't count toward your streak.","每日同題":"Daily Puzzle","說明":"About","成績":"Result","這個網址的題目跟那一天的每日同題對不上（網址可能複製不完整或被改過）。":"This link's puzzle doesn't match that day's Daily Puzzle (the link may be incomplete or altered).",
  "這是再解一次，看答案不會改成績，確定？":"This is a re-solve; viewing the answer won't change your result. Continue?","看答案就算這一天放棄了（成績記成「看了答案」，一樣可以分享），確定？":"Viewing the answer gives up this day (recorded as \"Viewed the answer\", which you can still share). Continue?",
  "再解一次，不改成績":"re-solve, result unchanged","補玩，不算連續天數":"catch-up, doesn't count toward the streak","成績與統計":"Results and stats","題目準備中":"Preparing the puzzle","這支手機裡的題庫是舊版，找不到這一天的題。連上網路、重新整理一次就會更新。":"The puzzle set on this phone is outdated and doesn't have this day's puzzle. Connect to the internet and refresh to update.",
  "題庫裡找不到可以出的題。":"No usable puzzle found in the puzzle set.","今天":"Today","不算連續天數":"doesn't count toward the streak","分享的只有方格、步數、走錯幾次、有沒有看提示，不會洩漏著法，也沒有名字或裝置代號；朋友點網址會打開同一天這一題。":"Sharing includes only the squares, move count, mistakes and whether hints were used; no moves are revealed and no name or device ID is included. Friends who open the link get the same day's puzzle.",
  "再解一次":"Solve again","不改成績":"result unchanged","回一盞茶":"Back to Teatime",
  /* 學習頁：棋譜庫、檢討、術語（10-db、10b、07y4） */
  "搜尋局名、棋手、賽事":"Search games, players, events","棋手":"Player","清除篩選":"Clear filters","繼續研究":"Continue studying","古譜":"Classic manuals","大師對局":"Master games","匯入棋譜":"Import game","局面還原":"Set up position","管理下載":"Manage downloads",
  "從電腦同步":"Sync from computer","還沒有大師對局":"No master games yet","從電腦同步到手機，沒網路也能看":"Sync from a computer to the phone to view offline","載入中":"Loading","他贏的":"Their wins","他輸的":"Their losses","稱號已撤銷":"title revoked",
  "看完整生平":"Full biography","去線上對戰下一盤":"Play a game online","去挑戰電腦":"Play the computer","去看 AI 對戰":"Watch AI matches","沒有符合的棋局":"No matching games","這裡還沒有棋局":"No games here yet","紅勝":"Red wins","黑勝":"Black wins",
  "還沒有這位棋手的介紹":"No profile for this player yet","生平":"Biography","參考":"Sources","篩選棋手":"Filter players","紅黑都看":"Both colors","只看執紅":"Red only","只看執黑":"Black only","全部":"All","結果":"Result","找棋手":"Find a player",
  "全部棋手":"All players","已下載的比賽對局":"Downloaded tournament games","存在這支手機裡，沒網路也能看。刪掉後要再看可以重新下載。":"Stored on this phone and viewable offline. If you delete them, you can download them again.","從手機刪除":"Delete from phone",
  "已刪除":"Deleted","刪除":"Delete","下載":"Download","收這幾年全國賽、各地公開賽等比賽裡，「特級大師對局」沒收的對局。":"Games from recent national and regional open tournaments that aren't in \"Grandmaster games\".","開始下載":"Start download",
  "下載中":"Downloading","下載完成":"Download complete","再試一次":"Try again","連不到電腦上的程式":"Can't reach the program on the computer","許銀川對局":"Xu Yinchuan games","從電腦同步棋譜":"Sync games from computer","檢查連線中":"Checking connection",
  "已連上電腦。同步後存在這支手機裡，沒網路也能看。":"Connected to the computer. Synced games are stored on this phone and viewable offline.","現在沒有連上電腦，只能管理已經同步的資料。":"Not connected to a computer; you can only manage already synced data.",
  "怎麼連線":"How to connect","還沒同步":"Not synced","重新同步":"Sync again","同步到手機":"Sync to phone","同步完成":"Sync complete","從這支手機刪除這個資料夾？":"Delete this folder from this phone?","這步還沒評等（按 📊 賽後報告，Pikafish 會補算，再顯示藍色建議箭頭）":"This move isn't rated yet (tap 📊 Post-game report and Pikafish will rate it, then show the blue suggestion arrows)",
  "妙著：就是 Pikafish 的首選，而且是不容易找到的好棋，沒有更好的走法。":"Brilliant: Pikafish's top choice and a hard-to-find good move; there's nothing better.","正著：跟 Pikafish 的首選一樣，沒有更好的走法（所以沒有藍色箭頭）。":"Best: same as Pikafish's top choice; there's nothing better (so no blue arrow).",
  "想知道為什麼不好？按下面 🔍 分析，看對方最好怎麼應。":"Want to know why it's bad? Tap 🔍 Analysis below to see the opponent's best reply.","另一條":"Another line","白色":"White","黑色":"Black","灰色":"Gray","紅色":"Red","棕色":"Brown","橘色":"Orange",
  "黃色":"Yellow","綠色":"Green","青色":"Cyan","藍色":"Blue","紫色":"Purple","矛形箭頭":"Spear arrow","毛筆箭頭":"Brush arrow","彩帶箭頭":"Ribbon arrow","連珠箭頭":"Dotted arrow","建議走法（藍色直線箭頭，標 1、2、3）":"Suggested moves (blue straight arrows, numbered 1, 2, 3)",
  "棋局資訊":"Game info","開局":"Opening","分析":"Analysis","回到最新":"Back to latest","這步不合法":"Illegal move","自己改走":"Try my own move","自由走棋":"Free play","這條變化沒有可以推演的著法":"This line has no moves to play out","按 ▶ 或往左滑，一步一步看":"Tap ▶ or swipe left to step through",
  "Pikafish 接著往下算":"Pikafish is calculating further","這條變化已經分出勝負了":"This line is already decided","只剩將帥":"Only Generals left","為什麼和棋":"Why a draw","為什麼結束":"Why did it end","Pikafish 正在看最後這個局面":"Pikafish is looking at the final position",
  "超過 3 分鐘沒有走下一步":"No move for over 3 minutes","沒在時間內走棋":"Didn't move in time","中途離開":"Left mid-game","這盤在雙方還沒分出勝負前就中止了（例如對方離線太久），不計勝負、也不計分。":"This game was stopped before it was decided (for example, the opponent was offline too long); no result and no rating change.",
  "雙方都沒有車、馬、炮可以進攻，剩下的子力殺不了對方的將帥。":"Neither side has a Chariot, Horse or Cannon to attack with, and the remaining pieces can't checkmate.","雙方子力幾乎一樣多，沒有誰多出能決勝的子。":"Material is almost equal; neither side has the extra piece needed to win.",
  "棋盤上的子已經不多，進入殘局後很多組合在理論上就是和棋。":"Few pieces remain; many endgame combinations are theoretical draws.","另一方":"The other side","想親眼看：讓 Pikafish 幫雙方接著下，看局面會不會有變化。":"See for yourself: let Pikafish play on for both sides and watch whether anything changes.",
  "讓 Pikafish 雙方接著下 30 步":"Let Pikafish play 30 more moves for both sides","Pikafish 推演中":"Pikafish is playing it out","Pikafish 雙方接著下":"Pikafish plays on for both sides","這個局面已經分出勝負，沒有可以再走的":"This position is already decided; there's nothing more to play",
  "存成棋譜":"Save as game record","存到「我的研究」資料夾，之後可以重看、評等。":"Saves to the \"My studies\" folder so you can review and rate it later.","名稱":"Name","儲存":"Save","已存到「我的研究」":"Saved to \"My studies\"","Pikafish 評語":"Pikafish's comment",
  "只跟最好的走法比，不是整盤誰好":"compared only with the best move, not who's better overall","按 ▶ 看你走完以後的局面；想換一步試試，按「↻ 從這步重下」。":"Tap ▶ to see the position after your move; to try another move, tap \"↻ Replay from this move\".",
  "精彩的一盤":"A great game","開局局面":"Starting position","左右滑棋盤可換步":"swipe the board to change moves","回顧中":"Reviewing","繼續推演":"Keep playing out","回到棋譜":"Back to the game record","下一步變著":"Next move variation",
  "Pikafish 怎麼預判、在哪裡埋伏":"How Pikafish predicts and where it sets traps","點棋子可以自由走棋；按 🔍 看 Pikafish 分析。":"Tap pieces to move freely; tap 🔍 for Pikafish analysis.","Pikafish 分析":"Pikafish analysis","之前存的分析，不用重算":"saved analysis, no need to recompute",
  "Pikafish 思考中":"Pikafish thinking","重新分析":"Analyze again","評等這條著法":"Rate this line","請 Claude 講解":"Ask Claude to explain","請 GPT 講解":"Ask GPT to explain","分數是紅方視角，1.0 約等於一個兵。講解會用到你的 Claude 或 ChatGPT 額度，分析和評等不會。":"Scores are from Red's point of view; 1.0 is about one pawn. Explanations use your Claude or ChatGPT quota; analysis and rating don't.",
  "講解中":"Explaining","大約半分鐘到幾分鐘":"about half a minute to a few minutes","開始評等，每步約 0.6 秒":"Rating started, about 0.6 s per move","評等完成":"Rating complete","賽後報告還在評等，好了會通知你":"The post-game report is still being rated; you'll be notified when it's ready",
  "評等中":"Rating","取消評等":"Cancel rating","Pikafish 在背景評等，可以先看棋，評好會通知你":"Pikafish is rating in the background; you can look at the game meanwhile and will be notified when it's done","評好了":"Rated","看報告":"View report",
  "賽後報告":"Post-game report","這份報告讀的是之前存在手機裡的評等，不用重算。":"This report uses ratings already saved on the phone; no recomputing needed.","賽後心得":"Post-game notes","從這一步和電腦下":"Play the computer from this move","複製 FEN":"Copy FEN",
  "改這個局面":"Edit this position","和電腦下是練習，不算戰績、不影響段位。":"Playing the computer here is practice; it doesn't count toward your record or rank.","這盤沒有著法可以匯出":"This game has no moves to export","沒有存檔，要留下來請自己走幾步再按 💾 存成棋譜":"not saved; to keep it, play a few moves and tap 💾 Save as game record",
  "翻轉棋盤":"Flip board","對手資料":"Opponent info","匯出棋譜":"Export game","適情雅趣":"Shiqing Yaqu","橘中秘":"Juzhong Mi","梅花譜":"Meihua Pu","古典開局譜":"Classical opening manuals","古典殘局譜":"Classical endgame manuals","妙棋":"Brilliant moves",
  "妙棋精選":"Selected brilliant moves","瀏覽大師棋譜":"Browse master games","按棋手找譜":"Find games by player","按賽事找譜":"Find games by event","比賽對局":"Tournament games","三冊":"three volumes","崇文書閣":"Chongwen Library","書目":"Catalog",
  "回到書閣":"Back to the library","選一本棋譜":"Choose a manual","搜尋":"Search","下載完成，箱子打開了":"Download complete; the chest is open","讀不到比賽對局的書目":"Can't load the tournament game catalog","讀不到特級大師的資料":"Can't load grandmaster data",
  "記譜":"Notation","術語":"Terms","棋盤的一到九路":"Files 1 to 9 of the board","書院碑林":"Academy stele forest","收起拓片":"Close the rubbing",
  /* 千秋盃（06c、07y7） */
  "沒有送出：目前不能報名，或這支手機的瀏覽器沒辦法簽名（請更新瀏覽器）":"Not sent: sign-up isn't open right now, or this phone's browser can't sign (please update your browser)","兵卒過河":"Soldiers Cross the River","車馬爭先":"Chariots and Horses Race",
  "炮震中原":"Cannons Shake the Plains","九宮論劍":"Duel in the Palace","雙士爭輝":"Advisors Vie for Glory","十六強":"Round of 16","八強":"Quarterfinals","準決賽":"Semifinals","決賽":"Final","紅黑各一盤":"one game each as Red and Black",
  "季軍戰":"Third-place match","千秋週擂":"Qianqiu Weekly Arena","本週擂主":"This week's champion","攻擂英雄":"Challenger hero","亞軍":"runner-up","守城大將":"Defending general","季軍":"third place","四強":"Final four","三屆擂主":"Three-time champion",
  "千秋擂主":"Qianqiu champion","擂台常客":"Arena regular","雲遊棋客是星槎上的電腦棋友，隨時陪你下棋":"The Wandering Player is a computer player on the Star Raft, always ready to play","你是本週擂主":"You are this week's champion","闖進四強":"Made the final four",
  "闖進八強":"Made the quarterfinals","謝謝你上擂台":"Thanks for entering the arena","這一屆真人不到 2 位，是闖擂練習，只發參加獎":"Fewer than 2 human players this time, so it's arena practice with participation prizes only","這一週你的名字旁邊會有 🏆，也刻上了千秋擂主碑。":"This week a 🏆 appears next to your name, and you're carved on the Qianqiu champions' stele.",
  "你的擂台比賽開始了":"Your arena match has started","5 分鐘內沒有入座算棄擂。比賽中不能悔棋，下滿 20 回合才能提和。":"Not seated within 5 minutes counts as a forfeit. No undo during the match, and draws can be offered only after 20 moves.",
  "入座":"Take your seat","等一下":"Wait","你有一盤進行中的對局，去打擂台會離開它，確定？":"You have a game in progress. Going to the arena will leave it. Continue?","去打擂台":"Go to the arena","千秋盃要用安裝在手機上的 App（GitHub 版）。":"The Qianqiu Cup needs the app installed on your phone (GitHub version).",
  "連線到大廳，讀取本週的擂台":"Connecting to the lobby and loading this week's arena","等前一場的勝者":"waiting for the previous winner","還沒收到本週的擂台資訊。裁判台在開發者的電腦上，電腦開著的時候才有比賽；過一會兒再來看看。":"This week's arena info hasn't arrived yet. The referee desk runs on the developer's computer, so matches happen only when it's on; check back later.",
  "取消報名":"Cancel sign-up","我要報名":"Sign me up","你有報名，記得準時回來點將。":"You're signed up; remember to come back on time for roll call.","這一屆報名已經截止，下週一再來報名。":"Sign-up for this round is closed; come back next Monday.",
  "你這一屆沒有報名，可以等開打後來觀戰。":"You didn't sign up this time; you can watch once it starts.","點將完成！開打時會跳出「入座」，留在 App 裡等一下。":"Roll call done! \"Take your seat\" will pop up when it starts; stay in the app.","點將":"Roll call",
  "我到了":"I'm here","這一週休賽":"No tournament this week","這一屆真人不到 2 位，是「闖擂練習」：照常比賽，只發參加獎。":"Fewer than 2 human players this time, so it's \"arena practice\": matches run as usual with participation prizes only.",
  "這一屆你止步了，謝謝你上擂台！可以留下來觀戰，看誰當上擂主。":"Your run ends here this time. Thanks for entering the arena! Stay and watch who becomes champion.","闖擂練習只發參加獎":"arena practice gives participation prizes only","你的成績":"Your result",
  "技壓群雄，登頂擂主！下週擂台虛位以待，誰來攻擂？":"You outplayed everyone and became champion! Next week's arena awaits a challenger.","報名送出了，等裁判台確認":"Sign-up sent; waiting for the referee desk to confirm","確定取消這一屆的報名？":"Cancel your sign-up for this round?",
  "已送出取消":"Cancellation sent","點將送出了":"Roll call sent","比賽規則":"Tournament rules","16 強單淘汰：兵卒過河（16 強）→ 車馬爭先（8 強）→ 炮震中原（準決賽）→ 九宮論劍（決賽，紅黑各一盤）；另有一盤雙士爭輝（季軍戰）":"16-player single elimination: Soldiers Cross the River (round of 16) → Chariots and Horses Race (quarterfinals) → Cannons Shake the Plains (semifinals) → Duel in the Palace (final, one game each as Red and Black); plus Advisors Vie for Glory (third-place match)",
  "每方 10 分鐘，每走一步加 5 秒；每一步最多 3 分鐘":"10 minutes per side plus 5 seconds per move; at most 3 minutes per move","和棋就加賽一盤超快棋（紅 5 分、黑 4 分），正局拿黑的人拿紅；加賽再和，算黑方勝":"A draw leads to one armageddon game (Red 5 min, Black 4 min) where the player who had Black takes Red; if that is drawn too, Black wins",
  "落子無悔：比賽中不能悔棋，下滿 20 回合才能提和":"No take-backs: no undo during the match, and draws can be offered only after 20 moves","開打 5 分鐘還沒入座算棄擂。比賽中斷線不會中止，時間照走，回來可以接著下":"Not seated 5 minutes after the start counts as a forfeit. Disconnecting doesn't pause the match; the clock keeps running and you can continue when you're back",
  "對手是不是本人：裁判台用報名時的簽名核對雙方手機的金鑰，比賽中兩支手機互傳的連線訊息也都簽名（點棋盤右下角的訊號膠囊，看得到「裁判台認證」和指紋）":"Is it really them: the referee desk checks both phones' keys against the sign-up signatures, and all messages between the two phones during the match are signed too (tap the signal pill at the bottom right of the board to see \"referee verified\" and the fingerprints)",
  "名次獎：擂主 🪙將令 3 枚、亞軍 2 枚、四強 1 枚，八強 💡提示棋 3 顆，十六強 💡2 顆＋↶1 張，另有修為":"Placement prizes: champion 3 🪙command tokens, runner-up 2, final four 1; quarterfinals 3 💡hint tokens; round of 16 2 💡 plus 1 ↶; plus XP",
  "家長看這裡":"For parents","千秋盃每週六下午 14:00 開始，大約 17:15 結束；每盤大約 20 分鐘，輸了就結束，最多下 5 盤。完全免費、沒有任何付費，獎品只是 App 裡的徽章和道具。比賽在公開伺服器上進行，只傳暱稱和棋步，建議不要用本名。人數不夠時，空位由 App 的常駐「虛擬棋客」補上，籤表上會標出來":"The Qianqiu Cup starts every Saturday at 2:00 p.m. and ends around 5:15 p.m.; each game takes about 20 minutes, a loss ends your run, and you play at most 5 games. It is completely free with no payments; prizes are only in-app badges and items. Matches run on a public server and only nicknames and moves are sent, so we suggest not using your real name. Empty spots are filled by the app's resident \"virtual players\", marked in the bracket",
  "說書台":"Storytelling stage","台下看座":"Audience seats","擂主虛位以待":"The champion's seat awaits","楚河":"Chu River","漢界":"Han Border","對陣金榜":"Bracket board","英雄帖":"Hero roll","大掛盤":"Big demo board","等下一盤開打":"Waiting for the next game",
  "週六開擂後，掛上正在下的對局":"After Saturday's start, live games are hung here","還沒有排出對陣，週六點將截止後就會貼上金榜":"No bracket yet; it goes up after Saturday's roll call closes","還沒有排出對陣，週六點將截止後就會貼上金榜；先看看歷屆擂主":"No bracket yet; it goes up after Saturday's roll call closes. See past champions for now",
  "這會兒沒有正在下的對局，下一盤開打就掛上來，點一下觀戰":"No game is live right now; the next one will be hung here. Tap to watch","週六開擂後，大掛盤會掛上正在下的對局，點一下就能觀戰":"After Saturday's start, the big board shows live games; tap to watch",
  "旗亭樓上的歌台":"Singing stage upstairs in the wine pavilion","酒肆樓上的說唱台":"Storytelling stage upstairs in the tavern","茶樓二樓的說書台":"Storytelling stage on the teahouse's second floor",
  /* 星槎與渡口的入口標籤、出口（07f、07w9、07y、07z4） */
  "回棋鎮":"Back to the chess town","棋鎮":"chess town","走回書院":"Walk back to the Academy","下樓":"Go downstairs","掀簾":"Through the curtain","對戰茶樓":"the Play Teahouse","學習書院":"the Learning Academy","天字客房":"Best guest room",
  "回上一頁":"Back to previous page","時光之苑":"Garden of Time","回起航頁":"Back to the sailing page","船艙石桌":"Cabin stone table","船頭的說書人":"Storyteller at the bow","千秋石桌":"Qianqiu stone table","說書人":"Storyteller","幻影指導局":"Phantom lesson game",
  "古戰場":"Ancient battlefield","路人棋友":"Passing player","旅人":"Traveler","秘境棋友":"Hidden-realm players","擂主":"Arena champion","擂台":"Arena","千秋殘局":"Qianqiu endgames","開始下棋":"Start playing","黑方先走":"Black moves first",
  "紅方先走":"Red moves first","學會了":"Learned","重溫":"Revisit","看示範棋局":"Watch demo game","這一朝的棋":"Xiangqi of this dynasty","讀這一章":"Read this chapter","讀過了":"read","書架":"Bookshelf","船艙書架":"Cabin bookshelf","說書人講的故事":"Stories told by the storyteller",
  "行囊":"Pack","隨時可換":"change anytime","棋童資料":"Player profile","存檔與讀檔":"Save and load","3 格存檔":"3 save slots","雲河怪事":"Cloud River mysteries","解局":"Solve","對弈":"Play","聽書":"Listen to stories","打擂":"Arena","本站目標":"Goals at this stop",
  "船錨卡住了":"The anchor is stuck","還不能起航":"Can't set sail yet","起航":"Set sail","現在停靠":"Docked at","開往":"Heading to","旅程終點":"Journey's end","說書人的學徒":"Storyteller's apprentice","十三站都能去":"all 13 stops open","說書人的學徒，十三站都能去":"Storyteller's apprentice, all 13 stops open",
  "說書人學徒":"Storyteller's apprentice","13 站":"13 stops","還沒選角色":"No character chosen yet","看航線":"View route","回星槎頁":"Back to the Star Raft","石桌已補全":"Stone table complete","石桌補全了":"The stone table is complete",
  "傾斜手機看立體":"Tilt phone for 3D","先下這盤棋":"Play this game first","示範棋局":"Demo game","正文載入中":"Loading text","先往下讀":"Read on first","上一章":"Previous chapter","下一章":"Next chapter","跟電腦下一盤":"Play the computer","13 站都走完了":"All 13 stops done",
  "今天打千秋盃":"Qianqiu Cup today","找找靈感":"Find inspiration","再想一下":"Think again","跟幻影練一題":"Practice a puzzle with the Phantom","星槎停靠":"Star Raft docked","解這一局":"Solve this game","點一下跳過":"Tap to skip","雲河驛站":"Cloud River inn",
  "船艙":"Cabin","去開頭畫面":"Go to the start screen","三格存檔都有人了":"All three save slots are used","航行難度":"Voyage difficulty","現在":"now","多數人選這個":"most people pick this","看這一站":"See this stop","千秋大百科":"Qianqiu encyclopedia",
  "想多看一題":"One more puzzle","七星同局圖鑑":"Seven Stars puzzle album","熱身":"Warm-up","變化題":"Variation puzzles","選做":"optional","雲河":"Cloud River","秦":"Qin","漢":"Han","三國":"Three Kingdoms","魏晉":"Wei-Jin","南北朝":"Northern and Southern dynasties",
  "隋":"Sui","唐":"Tang","五代":"Five Dynasties","宋":"Song","元":"Yuan","明":"Ming","清":"Qing","我的起手":"My openings","棋力考校":"Strength test","我的勝負簿":"My record","分門習練":"Theme training","錯著重習":"Mistake drills","象戲規則":"Rules of xiangqi",
  "初學講武場":"Boot camp","初學教場":"Boot camp","初學校場":"Boot camp","棋譜石室":"Game library","棋譜祕閣":"Game library","棋譜書樓":"Game library","棋譜閣":"Game library","找真人選「線上對戰」；自己練選「挑戰電腦」":"To play people, choose \"Online play\"; to practice alone, choose \"Play the computer\"",
  "苑中石桌":"Garden stone table","橋上石桌":"Bridge stone table","坐下來，就在這張石桌下一盤":"Sit down and play a game at this stone table","園子":"Garden","移步後園":"Go to the back garden","千秋翰林書院":"Qianqiu Hanlin Academy","前院啟蒙":"basics in the front court",
  "中庭日課":"daily lessons in the courtyard","講堂考校":"tests in the lecture hall","藏書閣典藏":"collections in the library","徽州深院茶樓":"Huizhou courtyard teahouse","天井對弈":"games in the courtyard","靠窗挑戰":"challenges by the window",
  "踢館擂台":"the arena","二樓千秋盃":"the Qianqiu Cup upstairs","這一站學會了，殘影清楚起來了":"You've learned this stop; the faded image is getting clearer","在雲河裡學會這一站，殘影就會變清楚":"Learn this stop on the Cloud River and the faded image will clear up",
  "珍品":"Treasures","消寒圖":"Winter-dispelling chart","輿圖":"Map","千秋印譜":"Qianqiu seal album","園子棋友":"Garden players","棋罐":"Piece jar","提示棋":"Hint tokens","棋史卡":"History cards","悔棋符":"Undo tokens","將令":"Command tokens",
  "預習卷":"Preview scrolls","對局時按「🎒 寶物」用；修為越高，每天送越多。":"Use them in games via \"🎒 Items\"; the higher your XP, the more you get each day.","對局時按「🎒 寶物」用，退回一步。":"Use them in games via \"🎒 Items\" to take back a move.",
  "拿去驛站的點將台換東西。":"Trade them at the inn's command platform.","附在石桌往事的關卡裡。":"Included in Stone Table Tales stages.","每盤棋下完都有機會掉提示棋、悔棋符。":"Every finished game may drop hint tokens or undo tokens.","石桌往事每關收兵、馬、車放進棋罐，集到門檻換寶物和稱號。":"Each Stone Table Tales stage adds Soldiers, Horses and Chariots to the jar; reach thresholds to earn items and titles.",
  "書齋":"Study","棋鎮書齋：亮格櫃、書格、輿圖、立軸和畫桌上的收藏":"Chess town study: collections on the display cabinet, bookshelf, map, hanging scroll and painting desk","這一格還是淡墨的，多收幾件珍品就會變成彩色。":"This slot is still in faint ink; collect more treasures to bring it to color.",
  "中":"Medium","下棋時右上角多一個 🎤，按下去說「馬八進七」「炮二平五」就會走":"Adds a 🎤 at top right during games; press it and say a move in Chinese notation to play it","這個版本不支援":"This version doesn't support it",
  "還沒連上大廳，等一下再試":"Not connected to the lobby yet; try again in a moment","已送出，等電腦回覆":"Sent; waiting for the computer to reply","電腦沒有回覆：虛擬玩家的程式可能沒在跑":"The computer didn't reply: the virtual player program may not be running",
  /* 設定頁：開關底下的說明小字、各列、提示（05-settings、11b-a11y、07f、07w7） */

  /* 線上大廳（02-shell Lobby、07x2 天井、07x3 名冊） */

  /* 大廳安全：檢舉、封鎖、稱號、家長（07x4） */

  /* 連線狀態小卡（07hs-netsig） */

  /* 學習頁：一盞茶殘局、珍品藏局（07c、07c2） */

  /* 學習頁：每日同題（07dq） */

  /* 學習頁：棋譜庫、檢討、術語（10-db、10b、07y4） */

  /* 千秋盃（06c、07y7） */

  /* 星槎與渡口的入口標籤、出口（07f、07w9、07y、07z4） */

  /* 補充：線上結果、殘局地圖花瓣、書閣短標籤、除錯 */
  "留在這裡":"Stay here","桃花瓣":"Peach petal","杏花瓣":"Apricot petal","荷花瓣":"Lotus petal","桂花":"Osmanthus","楓葉":"Maple leaf","梅花瓣":"Plum petal","紅梅瓣":"Red plum petal","適情":"Shiqing","橘中":"Juzhong","梅花":"Meihua",
  "已複製除錯資訊（不含金鑰、代號、名字）":"Debug info copied (no keys, IDs or names)","象棋千秋 連線除錯（匿名統計，不含金鑰、代號、名字）":"Xiangqi Qianqiu connection debug (anonymous stats, no keys, IDs or names)","象棋千秋 連線除錯：現在不在線上對局裡":"Xiangqi Qianqiu connection debug: not in an online game right now",
  "已變更⚠（跟上次對局不是同一把）":"Changed ⚠ (not the same key as last game)","補狀態":"Resend state","要狀態":"Request state","處理":"Status","對方最近的聊天":"Opponent's recent chat","沒有名字":"no name","檢舉的人同時封鎖了他":"the reporter also blocked them",
  "☁電腦＝雲遊棋客（電腦棋友）":"☁Computer = Wandering Player (computer player)","這 7 天一次的免簽":"this week's free pass",
  /* 設定頁：開關底下的說明小字、各列、提示（05-settings、11b-a11y、07f、07w7） */

  /* 線上大廳（02-shell Lobby、07x2 天井、07x3 名冊） */

  /* 大廳安全：檢舉、封鎖、稱號、家長（07x4） */

  /* 連線狀態小卡（07hs-netsig） */

  /* 學習頁：一盞茶殘局、珍品藏局（07c、07c2） */

  /* 學習頁：每日同題（07dq） */

  /* 學習頁：棋譜庫、檢討、術語（10-db、10b、07y4） */

  /* 千秋盃（06c、07y7） */

  /* 星槎與渡口的入口標籤、出口（07f、07w9、07y、07z4） */

  /* 補充：線上結果、殘局地圖花瓣、書閣短標籤、除錯 */

  /* 補充：設定的開發者表格與刪除資料、大廳安全的小段落、棋譜庫 */
  "App 主程式、離線的對局和棋譜資料庫、線上大廳、3D 園子（three.js）":"Main app, offline games and game database, online lobby, 3D garden (three.js)","所有畫面的版面、顏色、動畫":"Layout, colors and animations of every screen","Pikafish 象棋引擎，編成 WebAssembly 在手機的瀏覽器裡跑":"Pikafish xiangqi engine, compiled to WebAssembly to run in the phone's browser",
  "建置網站、大廳 32 位常駐角色、出題、妙棋搜尋、難度校正":"Site build, the lobby's 32 resident characters, puzzle generation, brilliant-move search, difficulty calibration","Gemini 出圖、棋譜資料整理":"Gemini image generation, game data processing",
  "Windows 上的啟動和出圖腳本":"Launch and image scripts on Windows","意見回饋管理頁（接 Google 表單和試算表）":"Feedback admin page (connected to Google Forms and Sheets)","棋譜、題庫、故事、朝代資料":"Game records, puzzles, stories, dynasty data",
  "線上大廳用 MQTT 通訊協定連線；Pikafish 的神經網路權重另外下載。":"The online lobby connects over MQTT; Pikafish's neural network weights are downloaded separately.","不用等機率：直接掉進黑洞、叫出小黑洞／星門、開任一星系、重設黑洞篇進度":"Skip the odds: fall into the black hole, summon a small black hole or star gate, open any galaxy, reset black-hole progress",
  "把 32 位虛擬玩家的積分、戰績、練習紀錄全部歸零？舊資料會整份存在電腦上，不會丟。":"Reset the ratings, records and practice logs of all 32 virtual players? The old data is kept in full on the computer.","這支手機要先用「連線到開發者的電腦」配對過，才能送出重置":"This phone must first be paired via \"Connect to the developer's computer\" before it can send a reset",
  "想留著，先按「不要刪」，到設定用「📱 換手機」把存檔搬到別支手機。":"To keep it, tap \"Don't delete\" first, then use \"📱 Move to a new phone\" in Settings to move your save to another phone.","字級可以到「最大」2 倍，預設跟著手機的字級：在設定房間的「🖌 字體」。鍵盤：B 棋盤、R 讀盤面、S 狀態、M 上一步、W 我在哪、? 說明。":"Text can go up to \"Largest\" (2x) and follows the phone's text size by default: see \"🖌 Font\" in the settings room. Keyboard: B board, R read the board, S status, M last move, W where am I, ? help.",
  "臺北":"Taipei","想跟家人朋友下棋，可以用":"To play with family and friends, use","（同一支手機兩個人輪流下）；挑戰電腦、石桌往事、殘局、棋譜都照常可以玩。":"(two players take turns on one phone); playing the computer, Stone Table Tales, endgames and the game library all still work.",
  "這張說明只會自動跳一次":"This guide pops up automatically only once","手機已把檢舉送出去":"the phone has sent the report","現在送不出去，檢舉先存在這支手機，有網路會自動補送":"it can't be sent right now; the report is saved on this phone and will be sent automatically when online",
  "局面還原（沒有存檔，要留下來請自己走幾步再按 💾 存成棋譜）":"Set up position (not saved; to keep it, play a few moves and tap 💾 Save as game record)","棋風":"Style",
  /* 主線「星槎遠征令」、首頁「下一步」、三個大禮包（07mnq-mainquest.js，評比第 17、18 輪 B5：P41.1、P41.4）；章名＝朝代（已有）＋副標，「古典・河圖初渡」照「・」切段各自翻 */
  "河圖初渡":"Crossing the River Chart","日落之前":"Before Sunset","長安星火":"Sparks over Chang'an","赤壁連環":"Chained Ships at Red Cliffs","竹林清談":"Talks in the Bamboo Grove",
  "飛燕過河":"Swallow over the River","運河聽潮":"Tides of the Grand Canal","長安燈會":"Lantern Festival in Chang'an","驛路風旗":"Wind Flags on the Post Road","汴梁點茶":"Whisked Tea in Bianliang",
  "草原星路":"Star Road over the Grassland","徽州當鋪":"The Huizhou Pawnshop","揚州急遞":"Express Post to Yangzhou","古典":"Classic","經典":"Classic","青石園":"Bluestone Garden",
  "秦朝":"Qin dynasty","漢朝":"Han dynasty","隋朝":"Sui dynasty","唐朝":"Tang dynasty","宋朝":"Song dynasty","元朝":"Yuan dynasty","明朝":"Ming dynasty","清朝":"Qing dynasty",
  "破局":"Break the Deadlock","古典之印":"Classic Seal","秦之印":"Qin Seal","星槎遠征令":"Star Raft Expedition Orders","星槎遠征札記":"Star Raft Expedition Journal",
  "七星授印禮":"Seven Stars Seal Ceremony","七星授印":"Seven Stars Seal","七星授印已成，雲河星槎為你點亮第一段航路":"The Seven Stars have granted their seal; the Cloud River Star Raft lights the first stretch of your route",
  "破局錦囊":"Breakthrough Pouch","你破開第一局迷霧，這份錦囊記下你的初勝":"You broke through the first fog; this pouch records your first win",
  "朝代遠征補給":"Dynasty Expedition Supplies","新朝渡口已至，請收下此地的樂聲、線索與圖鑑":"You have reached a new dynasty's ferry; take this place's music, clue and codex page",
  "遠征補給":"Expedition supplies","贏第一盤":"Win your first game","家鄉":"Home","回家鄉":"Back home","家鄉棋盤":"Home board","雲河新使":"New Envoy of the Cloud River","初勝":"First Victory",
  "圖鑑入門卷":"Codex starter scroll","開始第一章":"Start Chapter 1","一盞茶額外題":"Bonus Teatime puzzle","去解額外題":"Solve the bonus puzzle","景點線索":"Landmark clue","札記一頁":"One journal page",
  "打開遠征令":"Open Expedition Orders","出發":"Set off","這一章即將開放":"This chapter is coming soon","即將開放":"Coming soon","試玩":"Preview","再看一次":"Watch again","前往":"Go",
  "配樂收藏":"Music collection","先看完上一章":"Finish the previous chapter first",
  /* 11/15 遠征令面板拿掉：配樂收藏、再看第一章搬到設定 → 聲音（07mnq mnqSndRow、mnqMusic、mnqNotes） */
  "再看第一章":"Rewatch Chapter 1","看第一章":"Watch Chapter 1","星槎停到新朝代，就會收進那一朝的配樂。":"When the Star Raft reaches a new dynasty, that dynasty's music is added here.",
  "角色成長":"Character growth",
  "收下七星授印禮，星槎啟航":"Received the Seven Stars Seal Ceremony; the Star Raft sets sail",
  "星槎的札記：收下七星授印禮就有第一頁，每到一個新朝代多一頁。配樂收藏在設定 → 聲音。":"The Star Raft journal: the first page comes with the Seven Stars Seal Ceremony, and each new dynasty adds a page. The music collection is in Settings → Sound.","下架的章從頭試":"Retry withdrawn chapters from the start","清掉這幾章的進度":"clears these chapters' progress",
  "已關閉試玩，重新載入…":"Preview off, reloading…","已打開試玩，重新載入…":"Preview on, reloading…","已清掉，重新打開遠征令":"Cleared; reopening Expedition Orders",
  "解開一盤，殘譜就多一行字，桌邊的刻痕也亮回一小段。":"Solve one, and the broken manual gains a line; a little more of the carving on the table edge lights up again.",
  "收下七星授印禮，星槎遠征令開始":"Received the Seven Stars Seal Ceremony; the Star Raft Expedition Orders begin","第一次下贏電腦，收下破局錦囊":"First win against the computer; received the Breakthrough Pouch",
  "航線亮燈":"Route lantern lit","這一朝還沒有留下足跡。":"No footprints in this dynasty yet.","星路歷程":"Star route log",
  "主線「星槎遠征令」的札記：收下七星授印禮就有第一頁，每到一個新朝代多一頁，還有那一朝的配樂收藏。":"Journal of the main quest, Star Raft Expedition Orders: the first page comes with the Seven Stars Seal Ceremony, and each new dynasty adds a page and that dynasty's music.",
  "頁":"pages","選好角色，收下七星授印禮":"Pick a character and receive the Seven Stars Seal Ceremony","第一次跟電腦下贏，收下破局錦囊":"Win against the computer for the first time and receive the Breakthrough Pouch",
  /* 主線電影的任務卡、略過、危機題、殘局解開儀式的標籤（07mnf-mainfilm.js）；電影字幕、儀式字幕是劇情，照規則不翻 */
  "破局！":"Break the Deadlock!","上船，出發！":"All aboard, set off!","收下古典之印":"Accept the Classic Seal","收下秦之印":"Accept the Qin Seal","找路！":"Find the way!","車有路了":"The cart has a way through",
  "略過":"Skip","主線電影":"Main story film","一步，打開河口！":"One move to open the river mouth!","看你的本命棋子：一路衝到底！":"Look at your life piece: charge all the way!",
  "看藍框那顆棋子。":"Look at the piece in the blue frame.","看軍師演示":"Watch the strategist's demo","軍師：看好了——":"Strategist: watch closely…","殘譜補上一行":"A line added to the broken manual","千秋棋話":"Qianqiu Chess Tales",
  "先找乾地，再直走！":"Find dry ground first, then go straight!","別硬衝！旁邊哪一路是空的？":"Don't force it! Which file beside it is open?","黑士一進，就把俥吃回去。":"One step by the black advisor and it captures the chariot back.",
  "替俥找路":"Find a path for the chariot","俥怎麼走":"How the chariot moves","俥可以直走或橫走，中間不能有棋子擋著。先找一條沒被擋住的路，再去威脅對方的將。":"The chariot moves straight along a file or rank with nothing in between. First find a path that isn't blocked, then threaten the opponent's general.",
  "跟剛才的車一樣：別硬拉。點紅俥，自己走。":"Don't force it. Tap the red chariot to find a path.","黑將躲開了。再走一步，讓它無路可走。":"The general moved aside. Find the finishing move.",
  "先試看兩條路會怎樣（試看不算數）。":"First preview what each path does (previews don't count).","正面硬衝":"Charge straight ahead","俥一衝，黑士一進就吃回來，路斷了。":"The chariot charges, the black advisor steps up and captures it: the path is cut.",
  "先橫移":"Slide sideways first","八路上下都空，黑將只能往旁邊躲。接下來呢？":"File 8 is open top to bottom, so the black general can only step aside. What next?",
  "藍框是俥。箭頭是走得通的路；紅圈那格走過去會被吃。":"The blue frame is the chariot. Arrows show open paths; moving to a red-ringed square gets it captured.",
  "黑將躲開了。看看俥現在能不能沿空的那一路直衝到底。":"The general moved aside. Can your chariot use the open file?","先看俥能走到哪些地方。":"First see where the chariot can go.",
  "比較兩條通路，哪一條能接著威脅黑將？":"Compare the two paths: which one keeps threatening the black general?","俥先往左橫走到八路（九路也行）：那一路上下都空著。":"Slide the chariot left to file 8 first (file 9 works too): that file is open top to bottom.",
  "黑將躲開了。俥沿著空的那一路直衝到底，將軍！":"The black general stepped aside. Charge the chariot down the open file: check!","我先走一步：俥往左橫走到八路，這一路沒有棋子擋。":"I'll make the first move: the chariot slides left to file 8, where nothing blocks it.",
  "黑將往旁邊躲。我再走一步：俥直衝到底線，將軍！":"The black general steps aside. My next move: the chariot charges to the back rank, check!","這裡還過不去。先看它怎麼擋。":"Can't get through here yet. See how it blocks first.","換條能走的路，再試。":"Try again with a path that works.",
  "對話：點一下繼續":"Dialogue: tap to continue",
  /* 星夜茶話會、石桌邊歇一歇（07t-episodes.js 第 4 種插曲）：標題、按鈕、眼力題；角色台詞、說書人的話是劇情，照規則不翻 */
  "星夜茶話會":"Starry Night Tea Party","石桌邊歇一歇":"A Break by the Stone Table","1 分鐘眼力題，二選一":"1-minute eye test, pick one","一步將軍":"Check in one move","傌的將軍點":"Horse checking squares",
  "點出走一步就能將軍的紅子（有好幾顆就點其中一顆）。":"Tap a red piece that can give check in one move (if there are several, tap any one).",
  "點出所有「紅傌站上去就將軍」的格子（臥槽、掛角都算；被擋住馬腳的不算）。":"Tap every square where a red horse would give check (corner and side checks count; blocked horse legs don't).",
  "今天先不玩，直接去睡":"Not tonight, off to bed","先不玩":"Not now","提早結束":"End early","一分鐘到了":"Time's up","挑一樣帶走":"Pick one to take","燈花":"Lamp flower",
  "夜深了，早點休息":"It's late, get some rest","收下一朵燈花":"Received a lamp flower","先不理":"Dismiss","插曲":"Interlude",
  /* 黑洞練習賽、黑洞局轉橫向提示（07bhtl-tdlearn.js、07bh-blackhole.js） */
  "不算輸贏":"no win or loss recorded","規則程式還沒載好":"The rules engine hasn't loaded yet","星槎回航":"Return to the Star Raft","手機轉成橫向，黑洞星盤會滿版":"Turn your phone sideways to fill the screen with the black hole board",
  /* 石桌往事換朝代的提示（07-legend.js storyEraSync） */
  "故事發生在元末明初，畫面換成元朝風格；離開故事會換回你原本的朝代":"The story is set in the late Yuan and early Ming, so the screens switch to the Yuan style; leaving the story switches back to your own dynasty",
  "故事發生在明朝，畫面換成明朝風格；離開故事會換回你原本的朝代":"The story is set in the Ming dynasty, so the screens switch to the Ming style; leaving the story switches back to your own dynasty",
  /* 換手機轉移碼（05-settings xfRecv、05b-save XFER4；評比第 18 輪第 4 項 8 碼停收） */
  "這是舊版的 8 碼轉移碼，已經停用。請在舊手機打開 App（會自動更新），重新產生一組新的轉移碼。":"This is an old 8-character transfer code and it is no longer accepted. Open the app on your old phone (it updates itself) and create a new transfer code.",
  "這是舊版的 8 碼轉移碼，已經停用。":"This is an old 8-character transfer code and it is no longer accepted.","轉移碼是 10 碼":"Transfer codes have 10 characters","輸入舊手機上顯示的 10 碼轉移碼":"Enter the 10-character transfer code shown on your old phone",
  "輸入轉移碼":"Enter transfer code","下載資料":"Download data","連線中…":"Connecting…",
  /* 所有頁面共用的頂欄（開發者 11/14 選定）：時辰鐘旁的小字（07w8-shichen.js clkPaint）、登船天數與節氣、右上角的官階與修為（07-legend.js meChip、06-cpu.js RANKT）。
     時辰全站一律寫成現代鐘點（11 pm–1 am…），英文玩家一看就懂；鐘面上的地支是 SVG 圖案，照舊 */
  "子時":"11 pm–1 am","丑時":"1–3 am","寅時":"3–5 am","卯時":"5–7 am","辰時":"7–9 am","巳時":"9–11 am","午時":"11 am–1 pm","未時":"1–3 pm","申時":"3–5 pm","酉時":"5–7 pm","戌時":"7–9 pm","亥時":"9–11 pm",
  "小寒":"Minor Cold","大寒":"Major Cold","立春":"Start of Spring","雨水":"Rain Water","驚蟄":"Awakening of Insects","春分":"Spring Equinox","清明":"Clear and Bright","穀雨":"Grain Rain",
  "立夏":"Start of Summer","小滿":"Grain Buds","芒種":"Grain in Ear","夏至":"Summer Solstice","小暑":"Minor Heat","大暑":"Major Heat","立秋":"Start of Autumn","處暑":"End of Heat",
  "白露":"White Dew","秋分":"Autumn Equinox","寒露":"Cold Dew","霜降":"Frost's Descent","立冬":"Start of Winter","小雪":"Minor Snow","大雪":"Major Snow","冬至":"Winter Solstice",
  "還沒登船":"Not aboard","雲河無歲月":"Timeless on the Cloud River","雲河無歲月：在星槎上，時辰不走。點了看船齡":"Timeless on the Cloud River: aboard the Star Raft, the hours stand still. Tap to see the raft's age",
  "徹侯":"Marquis","關內侯":"Marquis Within the Pass","大庶長":"Grand Chief of the Multitude","左庶長":"Left Chief of the Multitude","五大夫":"Fifth Grandee","公大夫":"Ducal Grandee","大夫":"Grandee","上造":"Senior Builder","公士":"Gentleman Soldier",
  "萬石官":"10,000-bushel official","中二千石官":"Full 2,000-bushel official","二千石官":"2,000-bushel official","比二千石官":"Lesser 2,000-bushel official","千石官":"1,000-bushel official",
  "六百石官":"600-bushel official","四百石官":"400-bushel official","二百石官":"200-bushel official","百石官":"100-bushel official",
  "把黑將困住，讓它無路可走！":"Trap the black General so it has nowhere to go!","紅俥一路衝到底線，將軍！":"Run the red Chariot all the way to the back rank: check!",
  "全部下載好了":"All downloaded","常用的都下載好了；其他朝代、西市、觀星臺第一次去時才下載":"Everyday files are ready; other eras, the West Market and the Star Terrace download the first time you visit","準備好了":"Ready","下載開局要用的棋盤和棋子…":"Downloading the boards and pieces you need to start…","背景下載":"Background download","先進去逛（背景繼續下載）":"Go in now (keeps downloading)","準備好就能下棋；其他朝代、西市、觀星臺的圖第一次去時才下載，其餘之後慢慢補，進度在「設定 → 關於」。":"You can play as soon as this is ready. Other eras, the West Market and the Star Terrace download the first time you visit; the rest fills in later. Progress is under Settings → About.",
  /* 11/15 黑洞・星門圍城試玩（07bhg-gatesiege.js）：選關卡片、對局 HUD、結果視窗的固定字；帶數字的句子不翻（整句有中文就不換） */
  "星門圍城・試玩":"Gate Siege (trial)","新玩法候選・第 1、3、6 關":"New mode candidate: stages 1, 3, 6","星門圍城規則":"Gate Siege rules","星門預告":"Gate forecast","下一波":"Next wave","回合後":"rounds away",
  "援軍都下來了":"All reinforcements have arrived","護陣":"Guard","本輪若不處理":"If ignored this round","盾吸收":"Shield absorbs","損血":"HP lost","本輪沒有確定的扣血":"No certain damage this round",
  "可能擒子":"Possible captures","部署":"Deploy","部署後備":"Deploy a reserve","集火":"Focus Fire","士相護線":"Guard Line","緊急回復":"Emergency Heal","出戰":"Battle","回黑洞關卡":"Back to Black Hole stages",
  "再點一次同一顆招就放出":"Tap the same skill again to cast","點盤上發光的補給點":"Tap a glowing supply point","點盤上發光的目標":"Tap a glowing target","再打一次":"Play again","返回選關":"Back to stages",
  "不分勝負":"Draw","星門失守":"The gates fell","情報":"Intel","顯示中":"Showing","打哪一條線？":"Which line?","沒有可以配對的目標":"No target can be paired",
  "單線守口":"Hold one lane","拆陣破甲":"Break the guard","章末守關":"Chapter gatekeeper",
  /* 11/15 星門圍城切 3D 星盤（07bhg-gatesiege.js gsvParkBtn、gsvSetView 的提示；視角名稱沿用舊版塔防那幾條） */
  "回到平面棋盤":"Back to the flat board","🌀 3D 星盤（右上 👁 換視角）":"🌀 3D star board (tap 👁 at the top right to change the view)","純淨畫面、螢幕報讀模式用平面棋盤":"Clean view and screen-reader mode use the flat board",
  /* 11/15 車輪戰 3D（07bhw-wheel.js）：3D 開不起來的提示、進 3D 的過場副標 */
  "這台裝置沒辦法顯示 3D，先用棋盤模式":"This device cannot show 3D. Using the flat board for now.","三張星盤":"Three star boards",
  /* 11/15 星門圍城補第 2、4、5 關：主題、星樞大招、分段跳字（帶數字的不翻） */
  "分兵與回援":"Split and fall back","雙門取捨":"Two gates, one move","三段攻勢":"Three-phase assault","隔山星砲":"Over-the-Hill Star Cannon","卒將號令":"Pawn General's Command",
  "⚠ 星樞預告：隔山星砲":"⚠ Star Core warning: Over-the-Hill Star Cannon","⚠ 星樞預告：卒將號令":"⚠ Star Core warning: Pawn General's Command","隔山星砲取消":"Star Cannon cancelled","卒將號令取消":"Command cancelled",
  "✦ 星樞解鎖：隔山星砲":"✦ Star Core unlocks: Over-the-Hill Star Cannon","✦ 星樞解鎖：卒將號令":"✦ Star Core unlocks: Pawn General's Command","奪靈馬":"Spirit-Draining Horse",
  /* 11/15 星門圍城第二章「俥路調度」第 7～12 關：章名、關名、主題、星樞大招與跳字（帶數字的不翻） */
  "第一章":"Chapter 1","第二章":"Chapter 2","星門入侵":"Star Gate Invasion","俥路調度":"Chariot Lanes",
  "直路守口":"Hold the Open File","橫俥回援":"Chariot Across to the Rescue","留一道退路":"Leave a Way Back","交換要道":"Trade for the Key Lane","一俥兩用":"One Chariot, Two Jobs","守關・斷路營":"Gate Boss · Cut-Off Camp",
  "守住直路":"Guard the file","橫線調度":"Shift along the rank","深入要能回來":"Go deep, but get back","兌子的取捨":"When to trade","一步兩用":"One move, two jobs",
  "長驅直入":"Straight Down the File","斷路令":"Cut-Off Order","護陣車":"Guard Chariot",
  /* 11/15 星門圍城逐關解鎖、三星、困難版：選關的普通／困難、鎖住的原因、三星條件（帶數字的不翻） */
  "普通":"Normal","困難":"Hard","先破普通版":"Clear Normal first","入侵沒扣到血":"No HP lost to invaders","星樞大招一次都沒中":"Never hit by a Star Core ultimate","沒被奪靈":"No Spirit drained",
  "俥沒被吃":"No Chariot lost","過關時場上有俥":"A Chariot on the board at the end","部署過後備":"Deployed a reserve","截援一次":"Intercepted once","護陣全部拆掉":"All guards broken","入侵卒全部清掉":"All invaders cleared",
  "⚠ 星樞預告：長驅直入":"⚠ Star Core warning: Straight Down the File","⚠ 星樞預告：斷路令":"⚠ Star Core warning: Cut-Off Order","長驅直入取消":"Straight Down the File cancelled","斷路令取消":"Cut-Off Order cancelled",
  "重金懸賞":"Bounty","庭院小息":"Courtyard Rest","帥令安軍":"Marshal's Order","當票回春":"Pawn-Ticket Revival","九宮守心":"Palace Heart","鐵壁銅牆":"Iron Wall","仕角守門":"Advisor Gate","銅鎖止步":"Bronze Lock",
  "近侍護帥":"Bodyguard","盾陣回靈":"Shield Spirit","神行百里":"Swift Swap","勇往直前":"Forward Spirit","跑腿賺錢":"Errand Runner","步步為營":"Step by Step","揚州快步":"Yangzhou Quickstep",
  "一劍破甲":"Armor-Piercing Sword","直路衝鋒":"Straight Charge","輪牌護身":"Shield Rota","認轍尋路":"Track Reader","長街破陣":"Long Street Breaker","飛燕還巢":"Swallow Home","青玉護棚":"Jade Canopy",
  "象眼迷煙":"Elephant-Eye Smoke","渡口清茶":"Ferry Tea","雙燕斜護":"Twin Swallows","煙火震懾":"Firework Stun","隔子星花":"Screen Starburst","花火連環":"Chain Fireworks","火網標記":"Fire Net Mark",
  "煙幕護耳":"Smoke Cover","回營":"Return to Camp","紅馬跳影":"Red Horse Shadow","拐彎避風":"Turn from the Wind","驛鈴回氣":"Post Bell Breath","馬腿解圍":"Free the Horse Leg",
  /* 11/15 黑洞車輪戰・兩盤試玩（07bhw-wheel.js）：固定字；帶數字的句子不翻 */
  "車輪戰・試玩":"Simul Siege (trial)","兩盤都贏才過關":"Win both boards to clear","輪到我":"My move","星樞思考中":"Star Core thinking","等下一輪":"Next round","已結束":"Finished","未過關":"Not cleared",
  "離開":"Leave","再來一場":"Play again","看棋盤":"View board","自動跳盤：開":"Auto-switch: on","自動跳盤：關":"Auto-switch: off","走完自動跳下一盤":"Auto-switch to the next board after moving","不自動跳盤":"No auto-switch",
  "這盤這輪走過了":"Already moved here this round","這一輪已經放過一招":"Already used a skill this round","封招":"Sealed",
  "入侵預告":"Invasion warning","援軍":"Reinforcements","拆陣":"Guard broken","截援":"Intercepted","重開這一場？":"Restart this match?","試玩不給星塵、修為、定軌力":"Trial: no Stardust, XP or orbit stamina",
  "點發光的目標":"Tap a glowing target","點發光的補給點":"Tap a glowing supply point","再點一次同一招就放出":"Tap the same skill again to cast","這盤已結束":"This board is finished","各盤":"Boards",
  /* 11/15 黑洞車輪戰・三盤版（三盤拿兩勝＋危險預警）：縮圖狀態、危險提示、比數；縮圖角標的單字（危、侵、眼、門、封）跟盤上記號一樣不翻 */
  "三盤拿兩勝":"Win 2 of 3 boards","已走":"Moved","敗":"L","比數":"Score","星核危急":"Core in danger","入侵卒要扣血":"Invaders about to hit","援軍將至":"Reinforcements incoming",
  "把俥走到發亮的格子":"Move the chariot to the glowing square","用俥吃掉發亮的黑子":"Capture the glowing black piece with the chariot","走一步，讓黑將被攻擊":"Make one move that attacks the black general","黑將只能逃到綠點，一步將死它":"The general can only flee to the green dots. Mate it in one","換個擺法，一樣封住退路":"New setup: block the escape again","跟電腦各走四步":"Play four moves each against the computer","對了！":"Correct!","完成！":"Done!","這一步封住了退路":"This move blocked the escape","不是這格，再試一次":"Not that square. Try again","不是這顆，再試一次":"Not that piece. Try again","要吃掉發亮的那顆":"Capture the glowing piece","這步沒有攻擊到黑將":"That move doesn't attack the general","將軍了，可是黑將還能逃":"Check, but the general can still escape","藍框就是答案，點點看":"The blue frames show the answer. Try it","電腦想一下…":"The computer is thinking…","過關！可以接著下完":"Passed! You can keep playing","你贏了！":"You won!","這盤輸了，再來一次":"You lost this one. Try again","先動俥":"Move the chariot first","新手練習":"Beginner practice","新手練習進度":"Beginner practice progress","我會下棋，直接開始":"I can play, start now","💡 提示":"💡 Hint","完成練習":"Finish practice","新手練習完成":"Practice complete","入門物品領好了":"Starter items received","🏅 稱號「雲河新使」":"🏅 Title: New Envoy of the Cloud River","💡 提示棋 ×5":"💡 Hint tokens ×5","🏠 家鄉棋盤":"🏠 Home board","📜 圖鑑第一頁":"📜 First codex page","選一位角色":"Choose a character","🔰 繼續新手練習":"🔰 Continue beginner practice","更多玩法":"More ways to play","對弈電腦":"Play the computer","⛵ 星槎遠征令":"⛵ Star Raft Expedition Orders","點棋子走棋・拖空白處轉看四周・右上 👁 換視角":"Tap a piece to move · drag empty space to look around · 👁 top right to switch view","距離下一級":"To next level","細則":"Details","角色狀態":"Character status","攻擊力・防禦力":"Attack · Defense","以 100 為基準，數字越大越強。":"100 is the baseline; higher is stronger.","下船後會慢慢用掉，回星槎就補回來。":"Drains slowly once ashore; refills on the Star Raft.","解殘局、過主線章節就會得到。":"Earned by solving endgames and clearing story chapters.","修為越高，攻擊力和防禦力越強（黑洞裡用）。":"Higher XP makes Attack and Defense stronger (used in the Black Hole).","體力":"Stamina","靈力":"Spirit","體力・定軌力":"Stamina · Orbit stamina","靈力・星芒":"Spirit · Starglow",
  
  "技能":"Skills","已學會":"Learned","在黑洞裡使用，學會的都會帶上場":"Used in the Black Hole; every skill you've learned comes along","‹ 回我的角色":"‹ Back to my character","靈":"spirit",
  /* 11/16 黑洞新規則（星門圍城 v2：m/07sg2-siege2.js）：對局畫面、規則、35 招、28 個專屬天賦、序章 9 關、選關與天賦頁 */
  "點棋子看攻防":"Tap a piece to see its stats","點棋子看攻防；選了己子，打得到的敵子會標出這一下扣多少":"Tap a piece to see its stats; select your piece to preview damage on enemies it can reach","攻":"ATK","防":"DEF",
  "我方":"Us","倒下":"down","星門沒有援軍了":"No more reinforcements from the gates","每顆子":"Every piece",
  "走到敵子上＝攻擊":"Moving onto an enemy = an attack","防禦力比較大":"If defense is higher","護帥":"Guard the General","怎麼贏":"How to win",
  "一回合":"One round","星門":"Star gates","招式（每位夥伴學會的都能用，一回合放一招；那位的棋子都倒了就不能放）":"Skills (every companion's learned skills are available; one skill per round; a companion whose pieces are all down can't cast)","還沒有夥伴學會招式":"No companion has learned a skill yet",
  "打倒敵方將帥（體力歸零或將死）":"Defeat the enemy general (HP to 0 or checkmate)","被吃不超過 2 顆子":"Lose no more than 2 pieces","易：對方數值 ×0.9、電腦只看 1 步":"Easy: enemy stats ×0.9, AI looks 1 move ahead","中：對方數值照關卡、電腦看 2 步":"Normal: enemy stats as listed, AI looks 2 moves ahead",
  "難：對方數值 ×1.25、電腦看 3 步，星門多一波":"Hard: enemy stats ×1.25, AI looks 3 moves ahead, one extra gate wave","黑洞改版了：現在只有星門圍城，每顆子都有自己的體力、攻防。這一盤是舊玩法，沒辦法接著下。":"The Black Hole has been redesigned: only Star Gate Siege remains, and every piece has its own HP, attack and defense. This game uses the old rules and can't be continued.","去星門圍城":"Go to Star Gate Siege","黑洞規則改版了（每顆子有自己的體力、攻防），這一盤沒辦法接著下。":"The Black Hole rules changed (every piece now has its own HP, attack and defense); this game can't be continued.",
  "還沒有夥伴加入":"No companions have joined yet","中局急襲":"Midgame raid","殘局子少：集火（幾顆一起吃得到同一顆）能一下打穿，也要防對方集火你":"Few pieces left: focus fire (several pieces that can all capture the same target) can break through in one blow; watch for the enemy doing the same to you","星樞愛架砲：小心炮後面藏著的那一擊。":"The Star Pivot loves cannon screens: beware the shot hiding behind a piece.",
  "星樞的子急著過河——先擋住河口。":"The Star Pivot's pieces rush across the river — block the crossing first.","星樞見子就吃——別把子白白送進它的射程。":"The Star Pivot captures whatever it sees — don't hand it free pieces.","星樞縮著保將——要多顆子合力才打得開。":"The Star Pivot huddles around its general — it takes several pieces together to break in.","截援！":"Gate blocked!",
  "守門：定身一回合":"Gate trap: frozen for 1 round","銅鎖：定身兩回合":"Bronze lock: frozen for 2 rounds","擊破！":"Destroyed!","擊破":"KO",
  "你的子站在門格上，那一顆就來不了（截援）。":"If your piece stands on a gate square, that reinforcement can't arrive (gate block).","一顆己子回 15 體力（可以是帥）":"Heal one of your pieces 15 HP (the general included)","帥回 8 體力；上一步被將軍就回 12":"General heals 8 HP; 12 if it was in check last move","帥兩回合內防禦力 +10":"General +10 defense for 2 rounds",
  "一顆己子回 12 體力；那顆不到一半就回 17":"Heal one of your pieces 12 HP; 17 if it is below half","帥站九宮正中心才能放：之後每回合結束帥還在正中心就回 4 體力，最多 3 次":"Only with the general on the palace center: it heals 4 HP at the end of each round, up to 3 times","一顆己子兩回合內防禦力 +10":"One of your pieces +10 defense for 2 rounds","兩回合內，己方仕斜角相鄰的空點變成守門點：敵子走進去就定身一回合":"For 2 rounds, empty points diagonal to your advisors become traps: an enemy entering is frozen for 1 round",
  "鎖住一顆敵子：它這回合如果動了（走子或攻擊），就定身兩回合":"Lock an enemy piece: if it moves or attacks this round, it is frozen for 2 rounds","帥旁邊（上下左右、斜角一格）每顆己方仕讓帥防禦力 +6（最多 +12），兩回合":"Each advisor next to the general (including diagonally) gives it +6 defense (max +12) for 2 rounds","上一回合有己子被扣體力，回 6 靈力":"If one of your pieces lost HP last round, regain 6 spirit","交換己方兩子位置（換完要合法、帥不能被一下打死）":"Swap two of your pieces (must stay legal; the general must not be killable in one blow)",
  "上一步是兵往前走，回 6 靈力":"If your last move was a soldier stepping forward, regain 6 spirit","接下來三回合，往前走的那顆兵回 4 體力，最多 3 次":"For the next 3 rounds, a soldier that steps forward heals 4 HP, up to 3 times","一顆兵兩回合內防禦力 +8":"One soldier +8 defense for 2 rounds","兩回合內，下一個其他付費招少 15 靈力（最低 10）":"For 2 rounds, your next other paid skill costs 15 less (min 10)",
  "每局一次：一顆非將敵子的防禦力降到 0":"Once per game: set one non-general enemy's defense to 0","這回合俥攻擊時，攻擊力 +「直走格數×2」（最多 +10）":"This round, the chariot's attack gets +2 per square moved in a straight line (max +10)","這顆俥兩回合內防禦力 +10":"This chariot +10 defense for 2 rounds","標出下一步打得到己方俥的敵子（情報，不占招、不扣靈）":"Mark enemies that can hit your chariot next move (info: no spirit, doesn't use your skill)",
  "俥那一線最近 3 顆非將敵子各受一次攻擊（攻擊力打五折，照攻對防；俥不移動）":"The nearest 3 non-general enemies on the chariot's line each take one attack (half attack, attack vs defense; the chariot doesn't move)","己方一顆俥、炮或傌回到底線空格（要合法）":"Send one of your chariots, cannons or horses back to an empty square on your back rank (must stay legal)","九宮裡的己子兩回合內防禦力 +8":"Your pieces inside the palace +8 defense for 2 rounds","己方半場一顆敵子兩回合內不能攻擊（還能走）":"An enemy on your side of the river can't attack for 2 rounds (it can still move)",
  "一顆己子回 10 體力":"Heal one of your pieces 10 HP","斜向相鄰的兩顆己子結對：兩回合內一顆被攻擊，另一顆替它承受一半":"Pair two diagonally adjacent pieces: for 2 rounds, when one is attacked the other takes half","一顆非將敵子這回合不能動；之後兩回合內同一顆不能再被定身":"A non-general enemy can't move this round; it can't be frozen again for the next 2 rounds","炮隔一子打得到的一顆非將敵子受一次攻擊（照攻對防，炮不移動）":"A non-general enemy your cannon can hit over a screen takes one attack (attack vs defense; the cannon doesn't move)",
  "炮打得到的最多 3 顆非將敵子防禦力各降 6":"Up to 3 non-general enemies your cannons can hit each lose 6 defense","兩回合內，炮隔兩子也能攻擊":"For 2 rounds, cannons can also attack over two screens","己方一子這回合不會被敵子攻擊":"One of your pieces can't be attacked by enemies this round","每局一次：一顆被吃掉的己子回到原位，體力一半（原位要空、要合法；不能復活帥）":"Once per game: one of your captured pieces returns to its starting point with half HP (the square must be empty; not the general)",
  "選一顆傌：日字跳得到的所有敵子（不含將帥，被蹩腿的方向打不到）各受一次攻擊，攻擊力打六折，照攻對防；傌不移動":"Pick a horse: every enemy it can reach by its knight move (not the general; blocked legs don't count) takes one attack at 60% attack, attack vs defense; the horse doesn't move","上一步走的是傌：那顆傌兩回合內防禦力 +10":"If your last move was a horse, that horse +10 defense for 2 rounds","一顆己子回 6 體力；這局下一次復活的子再回 10":"Heal one of your pieces 6 HP; the next piece you revive this game heals 10 more","己方傌被自己人蹩腿：把蹩腿的子移到己方半場最近的合法空位（只往左右或後方）":"If one of your pieces blocks your horse's leg, move it to the nearest legal empty square on your side (sideways or back only)",
  "鐵輪":"Iron Wheel","俥的攻擊力 +4":"Chariot attack +4","長驅":"Long Drive","俥直走 3 格以上去攻擊，這一下攻擊力 +6":"When the chariot moves 3+ squares straight to attack, that strike gets +6 attack",
  "輪轉不息":"Endless Wheel","俥打死敵子，齊轍再回 6 靈":"When a chariot destroys an enemy, Qi Zhe regains 6 more spirit","雙刃破甲":"Twin Blade","一劍破甲每局可以用 2 次":"Sword Breaks Armor can be used twice per game",
  "踏雪":"Snow Step","傌的體力 +6":"Horse HP +6","回馬槍":"Turnback Spear","傌攻擊沒打死時，對方防禦再降 3":"When a horse attack doesn't kill, the target loses 3 more defense",
  "草原之風":"Prairie Wind","駱躍梅每回合多回 2 靈":"Luo Yuemei regains 2 more spirit each round","雙影":"Twin Shadow","紅馬跳影攻擊力改八折（原本六折）":"Red Horse Shadow uses 80% attack (was 60%)",
  "坐鎮":"Hold the Seat","帥的體力 +15":"General HP +15","定心":"Steady Heart","上一步被將軍，這一回合帥防禦 +6":"If you were checked last move, your general gets +6 defense this round",
  "典當有道":"Pawnbroker's Way","沈方庭回體力的招多回 4":"Shen Fangting's healing skills heal 4 more","九宮令":"Palace Decree","九宮裡的其他己子防禦再 +4":"Your other pieces inside the palace get +4 more defense",
  "鐵衛":"Iron Guard","仕的防禦 +5":"Advisor defense +5","以身護主":"Body Shield","仕替帥擋傷害時擋三分之二（原本一半）":"An advisor shielding the general takes two thirds of the damage (was half)",
  "銅鎖加固":"Reinforced Lock","銅鎖止步的定身多 1 回合":"Bronze Lock freezes for 1 more round","盾陣回靈改回 10（原本 6）":"Shield Spirit regains 10 (was 6)","青玉":"Green Jade",
  "相的防禦 +5":"Elephant defense +5","雙燕護線":"Twin Swallow Cover","相護到的子（士相護線）防禦再 +5":"Pieces covered by your elephants get +5 more defense","渡口茶香":"Ferry Tea Aroma",
  "渡口清茶多回 6":"Ferry Tea heals 6 more","燕歸":"Swallow's Return","飛燕還巢回到底線的子再回 8 體力":"A piece sent home by Swallow Home heals 8 HP","火藥":"Gunpowder",
  "炮的攻擊力 +4":"Cannon attack +4","花火連環降防從 6 變 9":"Fire Chain lowers defense by 9 (was 6)","連發":"Rapid Fire","隔子星花冷卻少 1 回合":"Starburst Over cooldown −1 round",
  "驚雷":"Thunderclap","炮打死敵子，雷借花再回 8 靈":"When a cannon destroys an enemy, Lei Jiehua regains 8 more spirit","快腿":"Quick Legs","兵過河的攻擊加成從 +6 變 +10":"Soldier bonus after crossing the river: +10 attack (was +6)",
  "硬骨":"Hard Bones","兵的體力 +4":"Soldier HP +4","勇往直前改回 10 靈（原本 6）":"Forward March regains 10 (was 6)","星火燎原":"Prairie Fire",
  "每有一顆過河的兵，回合結束步越溪回 1 靈（最多 3）":"Each soldier across the river gives Bu Yuexi 1 spirit at round end (max 3)","攻擊不是吃子":"Attack Isn't Capture","攻擊與停原地":"Attacking and staying put","走到敵子上是攻擊：攻擊力比對方防禦高就扣血，沒打死就停在原地，打死才移進去。":"Moving onto an enemy is an attack: if your attack beats its defense it loses HP; if it doesn't die, your piece stays where it was — it only moves in on a kill.",
  "點一下自己的子，打得到的敵子上會標出這一下扣多少、會不會擊破":"Tap your piece: enemies it can reach show how much damage the hit would do and whether it would destroy them","打不動就降防":"Wear Down Defense","防比攻高":"Defense higher than attack","防禦比攻擊力高就打不動：對方的防禦會降你攻擊力的一半，下一下就打得穿。":"If the defense is higher than your attack, you can't hurt it: its defense drops by half your attack, so the next hit gets through.",
  "兵先去磨九宮裡那顆象的防禦，俥再一下打穿":"Let the soldier wear down the elephant's defense in the palace, then the chariot breaks through","將軍一定要應":"Answer the Check","應將與照面":"Answering checks; facing generals","被將軍一定要應；將帥不能在同一條直線上照面。":"A check must always be answered; the two generals may never face each other on an open file.",
  "先把帥移開或擋住，再讓俥和傌反將":"Move or shield your general first, then counter-check with chariot and horse","合力一擊":"A combined blow","兩三顆子都吃得到同一顆時，攻擊力自動加起來、打一次（集火）；打死了是你走的那顆移進去。":"When two or three of your pieces can all capture the same target, their attacks add up into one blow (focus fire); on a kill, the piece you moved steps in.","讓俥和傌同時盯住那顆車，再出手":"Get the chariot and the horse both aiming at that chariot, then strike",
  "一步一招":"One Step, One Skill","放招與靈力":"Skills and spirit","一回合走一步，還可以再放一招，先後自選。靈力每位夥伴各自一份，放招扣的是放招那位的。":"Each round you make one move and may also cast one skill, in either order. Every companion has their own spirit; a skill spends the caster's.","一劍破甲把擋路的子防禦打到 0，再一下打穿":"Use Sword Breaks Armor to drop a blocker's defense to 0, then break through in one hit",
  "星門援軍":"Gate Reinforcements","星門倒數到 0 就落下援軍；你的子站在門格上，那一顆就來不了（截援，站門那位 +6 靈）。":"When a gate's countdown hits 0, reinforcements drop in; if your piece stands on the gate square, that one can't arrive (gate block, +6 spirit to whoever stands there).","趁援軍還沒來齊，先把將逼死":"Corner the general before all the reinforcements arrive","九宮與士相護線":"Palace and cover",
  "九宮裡、帥旁邊的己子防禦 ×1.2；帥被打時旁邊防禦最高的子替它擋一半；站在自己仕、相走得到的格子上防禦 +10。":"Your pieces in the palace or next to the general get ×1.2 defense; when the general is hit, the toughest neighbor takes half; standing where your advisor or elephant can move gives +10 defense.","先讓仕守住九宮，俥再繞出去反擊":"Let the advisors hold the palace first, then swing the chariot around to counterattack","補給點":"Supply points","花那顆後備子所屬夥伴的 20 靈，把後備放到補給點；這一步就用掉了。":"Spend 20 of the matching companion's spirit to place a reserve piece on a supply point; that uses up your move.",
  "先部署傌，俥傌一起逼將":"Deploy the horse first, then hunt the general with chariot and horse","結業：小星門圍城":"Graduation: Mini Siege","接上第一章":"Bridge to chapter 1","這是第一章之前的最後一關：攻對防、降防、集火、放招、截援、護帥，全部一起用。":"This is the last stage before chapter 1: attack vs defense, wearing down, focus fire, skills, gate blocks, guarding — use them all.",
  "先擋住第一波援軍，再集火打開九宮":"Hold off the first wave, then focus fire to open up the palace",
  "回氣":"Recover","星落":"Starfall","星樞護盾":"Pivot Shield","星樞的招":"The Star Pivot's skills","中、難的星樞也會放招——回氣（回 15 體力）、星落（打你一顆子）、星樞護盾（防禦 +10）；易不放。":"On Normal and Hard the Star Pivot casts skills too — Recover (heal 15 HP), Starfall (hits one of your pieces), Pivot Shield (+10 defense); on Easy it doesn't.",
  "打贏一次黑洞後開放":"Opens after you win once in the Black Hole","領過七星授印禮後開放":"Opens after you receive the Seven Stars seal gift",
  "搭星槎起航會偏航進黑洞，打贏一盤就開放":"Sail the Star Raft and you'll drift into the Black Hole — win one game there to open it",
  "新地點開放":"New place unlocked","點一下繼續":"Tap to continue","雲河的盡頭，星斗垂得最低。青銅渾儀還在轉，天頂的黑洞在等你。":"At the end of the Cloud River the stars hang lowest. The bronze armillary still turns, and the black hole at the zenith is waiting for you.","西市開市了。胡商與棋客擠在同一條街上，聽雨茶坊的簾子後頭，有人在擺暗棋。":"The West Market is open. Foreign merchants and chess players crowd the same street, and behind the curtain of the Rain-Listening Teahouse someone is setting up a game of dark chess.",
  "星門圍城":"Star Gate Siege",
  "下船":"Disembark","上星槎":"Board the Star Raft","上星槎（船頭）":"Board the Star Raft (bow)"
};
/* 第 15 輪 X3「鍵值化」：核心流程（對局頁工具列與狀態列、認輸／悔棋確認、結果視窗、挑戰電腦開新局、設定頁標題、底欄）不靠整句比對，
   模組裡寫 i18nT("鍵","中文")（中文時原樣回傳）或在元素上標 data-i18n="鍵"（英文模式換掉那個元素自己的最後一段字；data-i18n-n 是 {n} 的值）。
   原文改字也不會失效；鍵名＝「區.項」，值是英文（含前後圖示）。測試會檢查模組用到的鍵這裡都有。 */
const I18N_KEY={
  "set.section.privacy":"Privacy","set.section.advanced":"Advanced",
  "tab.home":"Home","tab.online":"Online","tab.library":"Library","tab.settings":"Settings",
  "cpu.title":"Play the computer","game.items":"Items","game.undo":"Undo","game.new":"New","game.resign":"Resign","game.review":"Review","game.setup":"Setup","game.peek":"Peek","game.undoN":"Undo ({n})",
  "game.resignAsk":"Resign this game?","game.thinking":"🤔 Thinking…","game.check":"⚠ Check!","game.yourMove":"👉 Your move","game.stuck":"Computer taking too long?","game.stuckNew":"🔄 Start a new game",
  "undo.note":"After an undo, this game no longer counts toward \"My strength\" (the result still counts).","dlg.ok":"OK","dlg.cancel":"Cancel",
  "res.win":"You won!","res.draw":"Draw","res.lose":"You lost this one","res.review":"📊 Review","res.home":"🏠 Home","res.viewBoard":"View board","res.again":"Play again","res.nextLevel":"Next level ›",
  "res.keyMove":"🔎 Understand the key move of this game ›","res.rankedAgain":"Play another ranked game ›","res.quickNote":"This was a quick game; it doesn't count toward your rank.",
  "net.win.r":"Red ({n}) wins","net.win.b":"Black ({n}) wins",
  "mnq.accept":"Accept",   /* 主線禮包的「收下」按鈕（07mnq #mnqGf2；開發者 11/14：別處的「收下」照字典 Received） */
  "vn.next":"Next","vn.log":"Log","vn.skip":"Skip","vn.leave":"Leave","vn.keep":"Keep watching","vn.skipAsk":"Skip this scene?","vn.close":"Back to the story","vn.you":"You",
  "vn.scene":"Scene {n}","vn.seen":"viewed {n}/{m}","vn.hold":"Holding: {x}","vn.give":"Give it to {x}.","vn.giveTo":"Better give it to {x}.","vn.cont":"Continue","vn.restart":"From scene 1","vn.resume":"Last time: scene {n}, {s}",
  "vn.how":"How it moves","vn.hint":"Hint","vn.hintN":"Hint ({n}/3)","vn.hintP":"Hint: ","vn.lv":"Hint {n}/3","vn.walk":"Walk me through","vn.walking":"Walking you through","vn.solo":"On your own","vn.mist":"{n} wrong",
  "vn.back":"Rethink","vn.gotIt":"Got it","vn.howSee":"The glowing dots are where it can go now.","vn.rWalk":"You solved it with a guide","vn.rHint":"You solved it with hints","vn.rSolo":"You solved it on your own",
  "vn.again":"Think again: ","vn.clues":"What you saw","vn.reorder":"Reorder","vn.start":"Start","vn.skipShow":"Skip scene ›","vn.trialTag":"Preview, not counted","vn.trialSt":"Preview","vn.trial":"Preview: {t}",
  "vn.pause":"⏸ Pause","vn.play":"▶ Resume","vn.reset":"↺ Back to start","vn.mine":"I will play it","vn.self":"On my own","vn.help":"Help me look","vn.walkN":"guided {n}",
  "vn.helpSay":"Blue frame: the piece to move. Arrows: paths worth comparing. Red rings: squares where it gets captured.","vn.walkSay":"Watch me play this move.","vn.did":"What you did",
  "vn.sPerfect":"Solved in one go, no help","vn.sSecret":"Heard a quiet exchange","vn.sSelf":"Found the Chariot's path yourself","vn.sBoth":"Previewed both paths, then played it yourself","vn.sTrial":"Previewed first, then played it yourself",
  "vn.sRefute":"Saw how charging straight gets captured","vn.sHelp":"Used Help me look","vn.sWalk":"Guided for {n} move(s)","vn.sMoves":"{n} moves played (fewest: {m})",
  "net.note.late":"A move arrived {n} min late; accepted by the rules","net.note.lateKeep":"A move arrived {n} min late; now unrated, your win stands","net.note.act":"Blocked {n} unsigned action(s) (possible impersonation)","net.note.nsLate":"A move came {n} min late; game unrated, no points","net.note.nsClock":"Opponent's clock off by {n} min; game unrated","net.note.nsOpp":"Opponent reported an untrusted clock; game unrated","net.note.nsSeen":"Clock untrusted; this game is unrated",
  "new.titleRanked":"🥇 Ranked · New game","new.titlePractice":"📚 Practice room · New game","new.youPlay":"You play","new.opp":"Opponent","new.level":"Level",
  "new.red":"🔴 Red (moves first)","new.black":"⚫ Black (moves second)","new.goRanked":"Start ranked game","new.goLevel":"Start level {n}",
  "set.title":"Settings","set.tab.bot":"Character","set.tab.look":"Board","set.tab.sound":"Sound","set.tab.more":"System","set.more":"⚙ More settings",
  "set.font":"Font","set.fontSize":"Text size","set.lang":"Language","set.rules":"Rules","set.pace":"Computer pace","set.moveFx":"Move display and effects",
  "set.sndPiece":"Piece sounds","set.sndVoice":"Voice calls","set.sndAmb":"Ambience","set.myChar":"My character","set.display":"Display","set.support":"Support","set.about":"About",
  "rlg.reloaded":"The screen just reloaded. Your last game's result has been saved."   /* 11/13 開發者 P1：對局剛結束時頁面被重新載入（m/02r-reloadguard.js） */
};
/* 英文時不換的屬性值：別的模組用這幾個 aria-label／title 找按鈕（06-cpu 換園子、07t3 籤筒、07w9 出口），換掉就找不到 */
const I18N_AGUARD=["回首頁","回星槎","聲控走棋","回棋盤模式","去園子下棋（3D）"];
/* 句型：[正規式, (比對結果, 翻譯函式)=>英文或 null]；T(字) 翻不出來會回 null，整句就不換 */
const I18N_XSD_PC={帥:"General",將:"General",仕:"Advisor",士:"Advisor",相:"Elephant",象:"Elephant",俥:"Chariot",車:"Chariot",傌:"Horse",馬:"Horse",炮:"Cannon",包:"Cannon",兵:"Soldier",卒:"Soldier"};   /* 暗棋動態句的棋子名（字典裡的棋子名是 WXF 記譜字母，不適合整句） */
const i18nXsdPc=(c,p)=>(c?(c==="紅"?"Red ":"Black "):"")+(I18N_XSD_PC[p]||p);
const I18N_PAT=[
  [/^(\d+) 天$/,m=>m[1]+" days"],
  [/^(\d+) 次$/,m=>m[1]+" times"],
  [/^(\d+) 毫秒$/,m=>m[1]+" ms"],
  [/^(\d+) 次・共 ([\d.]+) 秒$/,m=>m[1]+" tasks · "+m[2]+" s total"],
  [/^(\d+) 次・([\d.]+) MB$/,m=>m[1]+" loads · "+m[2]+" MB"],
  [/^(\d+) 人次$/,m=>m[1]+" attempts"],
  [/^連續玩 (\d+) 分鐘提醒休息$/,m=>"Break reminder after "+m[1]+" minutes"],
  [/^電腦段位積分 (\d+) 分・再 (\d+) 分升(.+)$/,(m,t)=>{const rank=t(m[3]);return rank?"Computer rating: "+m[1]+" · "+m[2]+" points to "+rank:null}],
  [/^正在播放《([^》]+)》・(.+)$/,(m,t)=>{const name=t(m[1]),instrument=t(m[2]);return name&&instrument?"Now playing: "+name+" · "+instrument:null}],
  [/^(.+)・現在$/,(m,t)=>{const name=t(m[1]);return name?name+" · Current":null}],
  [/^讀到 (\d+) 份成績$/,m=>"Imported "+m[1]+" reports"],
  [/^第 (\d+) 份：(.+)$/,(m,t)=>{const reason=t(m[2]);return reason?"Report "+m[1]+": "+reason:null}],
  [/^第 (\d+) 次$/,m=>"Attempt "+m[1]],
  [/^沒做 (\d+)$/,m=>"Unattempted: "+m[1]],
  [/^(\d+) 位學生・(\d+) 題(?:・⚠ 最多人沒一次答對：第 ([\d、]+) 題（(\d+) 人）)?$/,m=>m[1]+(m[1]==="1"?" student · ":" students · ")+m[2]+(m[2]==="1"?" puzzle":" puzzles")+(m[3]?" · Most retries: puzzle "+m[3].replaceAll("、",", ")+" ("+m[4]+" students)":"")],
  [/^每位學生的弱點（這支手機收過的 (\d+) 份作業合計）$/,m=>"Practice needs by student ("+m[1]+" assignments on this device)"],
  [/^(.+) (\d+)／(\d+) 人次$/,(m,t)=>{const topic=t(m[1]);return topic?topic+": "+m[2]+" / "+m[3]+" attempts":null}],
  [/^(.+)（錯 (\d+)／(\d+)）$/,(m,t)=>{const topic=t(m[1]);return topic?topic+" ("+m[2]+" / "+m[3]+" missed)":null}],
  [/^(?:(\d+) 題・)?由易到難・點題卡加入或取消$/,m=>(m[1]?m[1]+" puzzles · ":"")+"Easiest first · Tap cards to add or remove"],
  [/^已選 (\d+)／(\d+) 題$/,m=>"Selected "+m[1]+" / "+m[2]+" puzzles"],
  [/^查看已選（(\d+)）・排序與產生連結$/,m=>"Selected ("+m[1]+") · Order and share"],
  [/^第 (\d+) 題往前移$/,m=>"Move puzzle "+m[1]+" up"],
  [/^移除第 (\d+) 題$/,m=>"Remove puzzle "+m[1]],
  [/^(.+?)・差 ([\d,]+) 分升段$/,(m,t)=>{const rank=t(m[1]);return rank==null?null:rank+" · "+m[2]+" pts to promotion"}],
  [/^對手照段位「(.+)」配 · (.+) · 算段位分$/,(m,t)=>{const rank=t(m[1]),side=t(m[2]);return rank==null||side==null?null:"Matched to "+rank+" · "+side+" · rated"}],
  [/^再顯示 (\d+) 題（還有 (\d+) 題）$/,m=>"Show "+m[1]+" more puzzles ("+m[2]+" remaining)"],
  [/^(你|電腦)翻開了(紅|黑)(.)$/,m=>(m[1]==="你"?"You turned over ":"The computer turned over ")+i18nXsdPc(m[2],m[3])],
  [/^(你|電腦)的(.)走了一格$/,m=>(m[1]==="你"?"Your ":"The computer's ")+i18nXsdPc("",m[2])+" moved one square"],
  [/^(你|電腦)的(.)吃掉了(紅|黑)(.)$/,m=>(m[1]==="你"?"Your ":"The computer's ")+i18nXsdPc("",m[2])+" captured "+i18nXsdPc(m[3],m[4])],
  [/^暗棋棋盤，電腦難度：(新手|一般)$/,m=>"Dark chess board, computer level: "+(m[1]==="新手"?"Beginner":"Normal")],
  [/^紀錄：勝\s*(\d+)・和\s*(\d+)・負\s*(\d+)$/,m=>"Record: "+m[1]+" won \u00b7 "+m[2]+" drawn \u00b7 "+m[3]+" lost"],
  [/^連續\s*(\d+)\s*手沒有吃子、也沒有翻棋。?$/,m=>m[1]+" moves in a row with no capture and no piece turned over."],
  [/^第\s*(\d+)\s*列第\s*(\d+)\s*格，(.*)$/,(m,t)=>"Row "+m[1]+", square "+m[2]+", "+m[3].split("，").filter(Boolean).map(x=>{const q=x.match(/^(紅|黑)(.)$/);return q?i18nXsdPc(q[1],q[2]):x==="可以走到這裡"?"you can move here":x==="可以吃"?"you can capture":x==="選好了"?"selected":t(x)}).join(", ")],   /* 11/14 暗棋（07xsd）動態句 */
  [/^第\s*(\d+)\s*級$/,m=>"Level "+m[1]],
  [/^第\s*(\d+)\s*(手|步)$/,m=>"move "+m[1]],
  [/^(\d+)\s*分$/,m=>m[1]+" pts"],
  [/^開始第\s*(\d+)\s*級$/,m=>"Start level "+m[1]],
  [/^入門(\d)$/,m=>"Beginner "+m[1]],
  [/^業(?:餘)?(\d)(?:級)?$/,m=>"Amateur "+m[1]],
  [/^專(\d)(?:-(\d))?$/,m=>"Expert "+m[1]+(m[2]?"-"+m[2]:"")],
  [/^往後算\s*(\d+)\s*步$/,m=>"looks "+m[1]+" moves ahead"],
  [/^每步想\s*([\d.]+)\s*秒$/,m=>"thinks "+m[1]+" s per move"],
  [/^積分\s*([+\-−±]?\d+)\s*→\s*(\d+)\s*分$/,m=>"Rating "+m[1].replace("−","-")+" → "+m[2]+" pts"],
  [/^再\s*(\d+)\s*分升\s*「?(.+?)」?$/,(m,T)=>{const r=T(m[2]);return r==null?null:m[1]+" pts to "+r}],
  [/^(升為|降為)\s*(.+)$/,(m,T)=>{const r=T(m[2]);return r==null?null:(m[1]==="升為"?"Promoted to ":"Dropped to ")+r}],
  [/^(\d+)\s*勝\s*(\d+)\s*負\s*(\d+)\s*和$/,m=>m[1]+"W "+m[2]+"L "+m[3]+"D"],
  [/^([紅黑])方(稍好|明顯好|大占上風)$/,m=>(m[1]==="紅"?"Red ":"Black ")+{"稍好":"slightly better","明顯好":"clearly better","大占上風":"much better"}[m[2]]],
  [/^([紅黑])方有殺$/,m=>(m[1]==="紅"?"Red":"Black")+" has a forced mate"],
  [/^([紅黑])方(約領先.+|領先非常多)$/,(m,T)=>{const r=T(m[2]);return r==null?null:(m[1]==="紅"?"Red ":"Black ")+r}],
  [/^約領先\s*(半個兵|([\d.]+)\s*個兵)$/,m=>m[2]?"ahead by about "+m[2]+" pawns":"ahead by about half a pawn"],
  [/^約\s*([\d.]+)\s*個兵$/,m=>"about "+m[1]+" pawns"],
  [/^對手(.+)$/,(m,T)=>{const r=T(m[1].replace(/^[：:]\s*/,""));return r==null?null:"Opponent: "+r}],   /* 11/16：「對手：第 3 級」原本翻成 Opponent: : Level 3 */
  [/^回(.+)$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Back to "+r}],
  [/^去(.+?)正式上桌$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Go to the "+r+" for rated play"}],
  [/^去(.+?)選難度、打晉級賽$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Go to the "+r+" to pick a level or play ranked"}],
  [/^快速對局用上一盤的難度（(.+?)），不算段位分。想換難度、打晉級賽，請到(.+?)正式上桌。$/,(m,T)=>{const a=T(m[1]),b=T(m[2]);return a==null||b==null?null:"Quick games use the last game's level ("+a+") and don't count toward your rank. To change the level or play ranked, sit down at the "+b+"."}],
  [/^手感不錯！要不要去(.+?)打晉級賽，讓這股氣勢算進段位？$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Nice touch! Why not play a ranked game at the "+r+" and let this momentum count toward your rank?"}],
  [/^要不要去(.+?)挑個剛好的對手，再來一盤？$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Want to find a well-matched opponent at the "+r+" and play again?"}],
  [/^這盤有點可惜。要不要去(.+?)練功房，挑剛好的級數再戰？$/,(m,T)=>{const r=T(m[1]);return r==null?null:"So close. Want to pick the right level in the "+r+" Practice room and try again?"}],
  [/^用\s*(\d+)\s*張悔棋符，退回你的上一步？（現在有\s*(\d+)\s*張）$/,m=>"Use "+m[1]+" undo token to take back your last move? (You have "+m[2]+")"],
  [/^免費悔棋：退回你的上一步？（(?:這個難度不限次數|這盤還有\s*(\d+)\s*次)）$/,m=>"Free undo: take back your last move? ("+(m[1]?m[1]+" left this game":"unlimited at this difficulty")+")"],
  [/^([紅黑])方\s*([帥將仕士相象傌馬俥車炮砲兵卒])$/,m=>(m[1]==="紅"?"Red ":"Black ")+I18N_PN[I18N_PL[m[2]]]],
  [/^選了([紅黑])([帥將仕士相象傌馬俥車炮砲兵卒])$/,m=>"Selected "+(m[1]==="紅"?"Red ":"Black ")+I18N_PN[I18N_PL[m[2]]]],
  [/^吃([紅黑])方?\s*([帥將仕士相象傌馬俥車炮砲兵卒])$/,m=>"captures "+(m[1]==="紅"?"Red ":"Black ")+I18N_PN[I18N_PL[m[2]]]],
  [/^([一二三四五六七八九])路第([一二三四五六七八九十])排?$/,m=>"file "+I18N_NUM[m[1]]+", rank "+I18N_NUM[m[2]]],
  [/^([一二三四五六七八九])路$/,m=>"file "+I18N_NUM[m[1]]],
  [/^第([一二三四五六七八九十])排$/,m=>"rank "+I18N_NUM[m[1]]],
  [/^可以走\s*(\d+)\s*個位置$/,m=>m[1]+" possible moves"],
  [/^(你|對方|電腦)的時間剩\s*(\d+)\s*(分鐘|秒)$/,m=>({"你":"Your","對方":"Opponent's","電腦":"Computer's"}[m[1]])+" time: "+m[2]+(m[3]==="秒"?" s":" min")+" left"],
  [/^偷看（(\d+)）$/,m=>"Peek ("+m[1]+")"],
  [/^(\d{1,2})月(\d{1,2})日$/,m=>I18N_MON[(+m[1]-1+12)%12]+" "+(+m[2])],
  [/^約\s*([\d.]+)\s*秒$/,m=>"about "+m[1]+" s"],
  [/^(\d[\d,]*)\s*局$/,m=>m[1]+" games"],
  [/^(\d+)\s*分鐘前更新$/,m=>"updated "+m[1]+" min ago"],
  [/^可邀請\s*(\d+)$/,m=>"Can invite "+m[1]],
  [/^第\s*(\d+)\s*格$/,m=>"Slot "+m[1]],
  [/^約\s*([\d.]+)\s*(MB|KB|GB)$/,m=>"about "+m[1]+" "+m[2]],
  /* 黑洞塔防爽度第一批（07bht-td.js，11/14） */
  [/^第\s*(\d+)\s*關$/,m=>"Stage "+m[1]],
  [/^第\s*(\d+)\s*回$/,m=>"Round "+m[1]],
  [/^星門\s*(\d+)\s*回合後落\s*(\d+)\s*子$/,m=>"Star gate drops "+m[2]+" in "+m[1]+(m[1]==="1"?" round":" rounds")],
  [/^預估\s*[−-]\s*(\d+)$/,m=>"est. −"+m[1]],
  [/^(\d+)\s*靈$/,m=>m[1]+" spirit"],
  [/^(星樞卒將|星樞|齊轍|田飛燕|雷借花|駱躍梅|沈方庭|鐵連城|步越溪)\s*(\d+)／(\d+)$/,(m,T)=>{const r=T(m[1]);return r==null?null:r+" "+m[2]+"/"+m[3]}],
  [/^再點一次「(.+)」放出$/,(m,T)=>{const r=T(m[1]);return "Tap \""+(r==null?m[1]:r)+"\" again to cast"}],
  [/^擒敵\s*[−-]\s*(\d+)$/,m=>"Capture −"+m[1]],
  [/^以弱克強！\s*[−-]\s*(\d+)$/,m=>"Weak beats strong! −"+m[1]],
  [/^破甲貫穿！\s*[−-]\s*(\d+)$/,m=>"Armor pierced! −"+m[1]],
  [/^連環逼宮！\s*[−-]\s*(\d+)$/,m=>"Chain Check! −"+m[1]],
  [/^將軍\s*[−-]\s*(\d+)$/,m=>"Check −"+m[1]],
  [/^防線受壓\s*[−-]\s*(\d+)$/,m=>"Defense under pressure −"+m[1]],
  [/^[−-](\d+)（弱克強）$/,m=>"−"+m[1]+" (weak beats strong)"],
  [/^連續擒子\s*×\s*(\d+)$/,m=>"Capture streak ×"+m[1]],
  [/^([二三四五六七八九十])連斬$/,m=>(I18N_NUM[m[1]]||m[1])+"-capture streak"],
  [/^重開第\s*(\d+)\s*關？$/,m=>"Restart stage "+m[1]+"?"],
  [/^(.)吃(.)：扣星樞\s*(\d+)\s*元氣(，還少一顆咬你的過河子)?$/,m=>{const P=x=>I18N_PN[I18N_PL[x]]||x;return P(m[1])+" takes "+P(m[2])+": −"+m[3]+" Star Pivot vitality"+(m[4]?", and one less piece biting you across the river":"")}],
  [/^靈力夠了，可以放「(.+?)」：(.+)$/,(m,T)=>{const a=T(m[1]),b=T(m[2]);return "Enough spirit to cast \""+(a==null?m[1]:a)+"\""+(b==null?"":": "+b)}],
  [/^星樞預告「(.+?)」：(.+)$/,(m,T)=>{const a=T(m[1]),b=T(m[2]);return "Star Pivot warning \""+(a==null?m[1]:a)+"\""+(b==null?"":": "+b)}],
  /* 黑洞塔防爽度第二批（07bht-td.js、07dgl-stamina.js，11/14）：星塵、天賦層、三星、差一點、高光、急襲、黑洞入口 */
  [/^星塵\s*(\d+)$/,m=>"Stardust "+m[1]],
  [/^第\s*(\d+)\s*層$/,m=>"Tier "+m[1]],
  [/^最佳\s*(\d)\s*星$/,m=>"Best: "+m[1]+(m[1]==="1"?" star":" stars")],
  [/^(\d)\s*星$/,m=>m[1]+(m[1]==="1"?" star":" stars")],
  [/^要\s*(\d+)$/,m=>"need "+m[1]],
  [/^星樞推算\s*(\d+)\s*步$/,m=>"Star Pivot looks "+m[1]+(m[1]==="1"?" move":" moves")+" ahead"],
  [/^星樞元氣\s*(\d+)$/,m=>"Star Pivot vitality "+m[1]],
  [/^先破第\s*(\d+)\s*關$/,m=>"Clear stage "+m[1]+" first"],
  [/^([帥仕相傌俥炮兵將士象馬車砲卒])吃([帥仕相傌俥炮兵將士象馬車砲卒])$/,m=>{const P=x=>I18N_PN[I18N_PL[x]]||x;return P(m[1])+" takes "+P(m[2])}],
  [/^✧ 星陣護體：第一顆子被擒，回\s*(\d+)\s*靈力$/,m=>"✧ Star Ward: first piece lost, +"+m[1]+" spirit"],
  [/^星陣護體\s*\+(\d+)\s*靈$/,m=>"Star Ward +"+m[1]+" spirit"],
  [/^差一點！被擒別超過 2 顆，就能三星，額外\s*\+(\d+)\s*星塵$/,m=>"So close! Lose no more than 2 pieces for 3 stars: +"+m[1]+" more stardust"],
  [/^差一點！被擒別超過 2 顆、再少\s*(\d+)\s*回合，就能三星，額外\s*\+(\d+)\s*星塵$/,m=>"So close! Lose no more than 2 pieces and finish "+m[1]+(m[1]==="1"?" round":" rounds")+" faster for 3 stars: +"+m[2]+" more stardust"],
  [/^過關：吃光卒（還剩\s*(\d+)\s*顆）$/,m=>"Clear: capture every pawn ("+m[1]+" left)"],
  [/^過關：擋下援軍（還有\s*(\d+)\s*波）、清光入侵卒（場上\s*(\d+)\s*顆）$/,m=>"Clear: hold off the reinforcements ("+m[1]+(m[1]==="1"?" wave":" waves")+" left) and clear the invaders ("+m[2]+" on board)"],
  [/^序章 ([ABC][1-3])$/,m=>"Prologue "+m[1]],
  [/^差一點！星樞只剩\s*(\d+)\s*元氣，打光就過關$/,m=>"So close! The Star Pivot has only "+m[1]+" vitality left - knock it out to clear the stage"],
  [/^差一點！再少\s*(\d+)\s*回合就三星，額外\s*\+(\d+)\s*星塵$/,m=>"So close! "+m[1]+(m[1]==="1"?" round":" rounds")+" faster for 3 stars: +"+m[2]+" more stardust"],
  [/^星淵急襲・(.+?)——星樞元氣\s*(\d+)$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Abyss Raid · "+r+" - Star Pivot vitality "+m[2]}],
  [/^天賦全部重置，退回\s*(\d+)\s*星塵$/,m=>"All talents reset: "+m[1]+" stardust refunded"],
  [/^在星槎上歇息：大約\s*(\d+)\s*分鐘回到\s*(\d+)，就能再下船$/,m=>"Resting on the Star Raft: about "+m[1]+" min to get back to "+m[2]+", then you can go ashore again"],   /* 11/16 體力統一：數字照陪你走那一位的尺，不再是固定的 15、30 */
  [/^在星槎上歇息，回到\s*(\d+)\s*就能再下船。?$/,m=>"Resting on the Star Raft; at "+m[1]+" you can go ashore again."],
  [/^定軌力回到\s*(\d+)，可以下船了。?$/,m=>"Orbit stamina is back to "+m[1]+": you can go ashore."],
  [/^定軌力耗盡：在星槎上歇到\s*(\d+)\s*才能再下船$/,m=>"Orbit stamina spent: rest on the Star Raft until "+m[1]+" before going ashore"],
  [/^定軌力\s*(\d+)／(\d+)：在星槎上歇到\s*(\d+)\s*才能再下船$/,m=>"Orbit stamina "+m[1]+"/"+m[2]+": rest on the Star Raft until "+m[3]+" before going ashore"],
  [/^定軌力用完了，黑洞入口先關著：在星槎歇到\s*(\d+)\s*再來$/,m=>"Orbit stamina is used up, so the black hole entrance is closed: rest on the Star Raft until "+m[1]+", then come back"],
  [/^今天靠黑洞回的定軌力已經滿\s*(\d+)\s*了$/,m=>"You've already regained the daily maximum of "+m[1]+" orbit stamina from the black hole today"],
  /* 主線「星槎遠征令」、首頁「下一步」、任務卡、札記、星夜茶話會（07mnq、07mnf、07t，評比第 17、18 輪 B5） */
  [/^下一步・(.+)$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Next: "+r}],
  [/^第([一二三四五六七八九十]{1,3})章$/,m=>{const n=i18nCnNum(m[1]);return n?"Chapter "+n:null}],
  [/^第([一二三四五六七八九十]{1,3})章即將開放$/,m=>{const n=i18nCnNum(m[1]);return n?"Chapter "+n+" coming soon":null}],
  [/^開往(.+)$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Heading to "+r}],
  [/^停靠(.+?)後開放$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Opens after docking at "+r}],
  [/^星槎停靠(.+?)，這一章就開放$/,(m,T)=>{const r=T(m[1]);return r==null?null:"This chapter opens once the Star Raft docks at "+r}],
  [/^星槎停到(.+?)，收下遠征補給$/,(m,T)=>{const r=T(m[1]);return r==null?null:"The Star Raft reached "+r+"; received expedition supplies"}],
  [/^看完(第一場|最後一場)?「(.+)」$/,(m,T)=>{const r=T(m[2]);return r==null?null:"Watched "+(m[1]==="第一場"?"the first scene ":m[1]?"the last scene ":"")+"\""+r+"\""}],
  [/^(\d{1,2})月(\d{1,2})日\s+(\d{1,2}:\d\d)$/,m=>I18N_MON[(+m[1]-1+12)%12]+" "+(+m[2])+", "+m[3]],
  [/^航線亮了\s*(\d+)／(\d+)\s*盞$/,m=>"Route lanterns lit: "+m[1]+"/"+m[2]],
  [/^航線亮燈\s*(\d+)／(\d+)$/,m=>"Route lanterns: "+m[1]+"/"+m[2]],
  [/^配樂\s*(\d+)\s*首$/,m=>m[1]+(m[1]==="1"?" track":" tracks")],
  [/^([一-龥]+)的配樂$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Music of the "+r}],
  [/^提示棋\s*×\s*(\d+)$/,m=>"Hint tokens ×"+m[1]],
  [/^提示棋\s*(\d+)\s*顆$/,m=>m[1]+(m[1]==="1"?" hint token":" hint tokens")],
  [/^提示棋\s*\+(\d+)$/,m=>"Hint tokens +"+m[1]],
  [/^看你的本命棋子「([帥將仕士相象傌馬俥車炮砲兵卒])」$/,m=>"Look at your life piece, the "+I18N_PN[I18N_PL[m[1]]]],
  [/^《千秋棋話》(.*)$/,(m,T)=>{if(!m[1])return"Qianqiu Chess Tales";const r=T(m[1]);return r==null?null:"Qianqiu Chess Tales · "+r}],
  [/^殘譜\s*(\d+)／(\d+)\s*行$/,m=>"Broken manual: "+m[1]+"/"+m[2]+" lines"],
  [/^(\d+)\s*分鐘$/,m=>m[1]+" min"],
  [/^約\s*(\d+)\s*分鐘$/,m=>"about "+m[1]+" min"],
  [/^答對\s*(\d+)\s*題$/,m=>m[1]+" correct"],
  [/^修為\s*\+(\d+)$/,m=>"XP +"+m[1]],
  [/^修為升到\s*Lv\s*(\d+)！$/,m=>"XP up to Lv "+m[1]+"!"],   /* 11/15 對戰後的角色成長（07grw-growth.js） */
  /* 所有頁面共用的頂欄（開發者 11/14 選定）：登船天數、官階、修為、時辰鐘的讀螢幕標籤 */
  [/^第\s*(\d+)\s*天$/,m=>"Day "+m[1]],
  [/^船上第\s*(\d+)\s*天$/,m=>"Day "+m[1]+" aboard"],
  [/^修為\s*Lv\s*(\d+)$/,m=>"XP Lv "+m[1]],
  [/^([一二三四五六七八九])品官$/,m=>"Rank "+I18N_NUM[m[1]]+" official"],
  [/^現在是(.時)（[^，]+，\s*\d+\s*點到\s*\d+\s*點）(?:，節氣(.+?))?。點了看船齡和十二時辰$/,(m,T)=>{const h=T(m[1]),t=m[2]?T(m[2]):"";return h==null||t==null?null:"It's now "+h+(t?", solar term: "+t:"")+". Tap for the raft's age and the twelve double-hours"}],
  [/^看船齡和今天的時間：(.+)$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Raft age and today's time: "+r}],
  [/^已收\s*(\d+)(?:／(\d+))?(?:\s+(.+))?$/,(m,T)=>{const u=m[3]?T(m[3]):"";return u==null?null:"Collected "+m[1]+(m[2]?"/"+m[2]:"")+(u?" "+u:"")}],
  [/^下載開局要用的棋盤和棋子\s*(\d+)%$/,m=>"Downloading the boards and pieces you need to start "+m[1]+"%"],
  [/^還有 (\d+) 個檔在背景下載（約 (\d+) MB）$/,m=>m[1]+" files still downloading in the background (about "+m[2]+" MB)"],
  [/^省流量中：還有 (\d+) 個檔暫停下載（約 (\d+) MB）$/,m=>"Data saver on: "+m[1]+" files paused (about "+m[2]+" MB)"]
];
/* 中文數字（一～九十九）或阿拉伯數字（含全形）→ 數字 */
function i18nCnNum(s){s=String(s==null?"":s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0));if(/^\d+$/.test(s))return+s;
  if(s.length===1)return I18N_NUM[s]||null;const m=s.match(/^([一二三四五六七八九])?十([一二三四五六七八九])?$/);return m?(m[1]?I18N_NUM[m[1]]:1)*10+(m[2]?I18N_NUM[m[2]]:0):null}
/* 中文記譜（core.js notate 的格式：炮二平五、馬8進7、前炮平五、後車進1）→ { wxf, say }；不是記譜回 null。
   WXF：字母＋原來那一路＋動作（+ 進、- 退、. 平）＋目的路數或步數；同一路兩顆同樣的子，不寫原來那一路，改在字母前面加 +（前）、-（後）、=（中），例如 +C.5、-R+1 */
const I18N_MV=/^([前中後一二三四五六七八九1-9１-９]?)([帥將仕士相象傌馬俥車炮砲包兵卒])([一二三四五六七八九1-9１-９]?)([進退平])([一二三四五六七八九1-9１-９])$/;
function i18nMove(cn){const m=String(cn==null?"":cn).trim().match(I18N_MV);if(!m)return null;const[,pre,pc,fl,act,dst]=m;if(!pre===!fl)return null;
  const L=I18N_PL[pc],d=i18nCnNum(dst),op={"進":"+","退":"-","平":"."}[act],tag={"前":"+","中":"=","後":"-"};let head,who;
  if(fl){head=L+i18nCnNum(fl);who=I18N_PN[L]+" "+i18nCnNum(fl)}else if(tag[pre]){head=tag[pre]+L;who={"前":"Front ","中":"Middle ","後":"Rear "}[pre]+I18N_PN[L]}
  else{const n=i18nCnNum(pre);head=n+L;who=I18N_PN[L]+" no. "+n}
  const step=act!=="平"&&"RCPK".includes(L),verb=act==="平"?"traverses to ":act==="進"?(step?"advances ":"advances to "):(step?"retreats ":"retreats to ");
  return{wxf:head+op+d,say:who+" "+verb+d}}
function i18nWxf(cn){const r=i18nMove(cn);return r?r.wxf:null}
/* 中文標點 → 英文 */
const I18N_SEP=/(，|、|；|・|：|。|！|？|（|）|「|」|…|～)/;
const I18N_SEPEN={"，":", ","、":", ","；":"; ","・":" · ","：":": ","。":". ","！":"! ","？":"? ","（":" (","）":") ","「":" \"","」":"\" ","…":"…","～":"-"};
function i18nTidy(s){return String(s).replace(/\s+/g," ").replace(/ +([,.;:!?)…])/g,"$1").replace(/\( +/g,"(").replace(/" +"/g,"\" \"").trim()}
/* ChatGPT 11/14: story English; source dialogue and identifiers remain authoritative. */
const I18N_STORY_EN={
  "阿轍": "A-Zhe",
  "燕子": "Yanzi",
  "花兒": "Hua'er",
  "小梅": "Xiaomei",
  "庭哥": "Ting",
  "城子": "Cheng",
  "溪兒": "Xi'er",
  "老伯": "Old man",
  "軍爺": "Guard",
  "父親": "Father",
  "小阿轍": "Young A-Zhe",
  "坡腳的老伯拉不動車，車軸也快撐不住了。": "The old man at the foot of the slope cannot move his cart. Its axle is close to breaking.",
  "跟阿轍一起穩住木車，幫大家把路讓出來。": "Help A-Zhe steady the cart and clear the way for everyone.",
  "去看木車": "Look at the cart",
  "看路的人": "Reading the Road",
  "沒有……我爹的車不在這裡。": "No... Dad's cart isn't here.",
  "你看一眼就認得？": "You can tell just by looking?",
  "車轅有道舊疤。遠遠也不會認錯。": "There's an old scar on the shaft. I'd know it from a long way off.",
  "輪印": "Wheel tracks",
  "我爹看輪印，就知道車裝得重不重。": "Dad can tell how heavy a cart is just from its tracks.",
  "坡腳傳來木頭細細的裂聲。": "A faint crack comes from the wood at the foot of the slope.",
  "等一下。那輛車的聲音不對。": "Wait. That cart doesn't sound right.",
  "木量尺": "Wooden measuring stick",
  "這裡的車過得去，別處來的也得過得去。我爹說的。": "If our cart can get through, other people's carts should too. That's what Dad says.",
  "查查路上的輪印。": "Look at the wheel tracks.",
  "越拉越陷": "Pulling It Deeper",
  "日頭落下以前，這幾袋都得送到。別堵著後頭的人。": "These sacks must be delivered before sunset. Don't hold up the carts behind you.",
  "我再拉一下……": "I'll give it another pull...",
  "拉直些。路就在前面，往哪裡拐？": "Pull straight. The road's right ahead. Why turn aside?",
  "……拉直。走直。": "...Pull straight. Go straight.",
  "肩背一緊": "His shoulders tense.",
  "旁邊那塊地乾，為什麼不走那裡？": "The ground over there is dry. Why not go that way?",
  "車輪": "Cart wheel",
  "輪子陷在泥裡，一拉又滑回去。": "The wheel is stuck in the mud. Each pull just sends it sliding back.",
  "土袋": "Sacks of earth",
  "土袋全擠在歪的那一邊，車太重。": "All the sacks have shifted to the leaning side. The cart is too heavy.",
  "車軸": "Axle",
  "軸頭裂了一道，再壓就斷。": "The end of the axle is cracked. More weight will snap it.",
  "想好了，叫老伯": "Ready: call the old man",
  "先看清楚：車輪、土袋、車軸。": "Look closely at the wheel, the sacks, and the axle.",
  "要老伯先怎麼做？": "What should the old man do first?",
  "繼續拉": "Keep pulling",
  "輪子動了一下，又陷回泥裡。車身更歪了。": "The wheel turns a little, then sinks back into the mud. The cart leans farther.",
  "停！先別拉！": "Stop! Don't pull yet!",
  "先鋪板": "Lay boards first",
  "車還太重，板子塞不進輪子底下。": "The cart's still too heavy. I can't get a board under the wheel.",
  "這車沉得像頭牛，先卸幾袋吧！": "This cart's as heavy as an ox! Let's unload a few sacks.",
  "先卸重": "Unload some weight",
  "先別拉，車要倒了。軸頭裂了，再壓下去車斷在這裡。": "Don't pull! The cart's tipping. The axle is cracked. Keep forcing it and it'll break right here.",
  "先卸幾袋，後頭的人才過得來。": "Unload a few sacks first, so the carts behind can get through.",
  "我會看輪子": "I Know Wheels",
  "你會修？": "Can you fix it?",
  "我……我沒自己補過這麼重的車。": "I... I've never repaired a cart this heavy on my own.",
  "停頓，看向老伯": "He pauses and looks at the old man.",
  "裂軸": "Cracked axle",
  "我會看輪子。裂的地方得請老伯幫忙。": "I know wheels. I'll need your help with the crack.",
  "先穩住。我來看看裂到哪裡。": "Steady it first. Let me see how far it's split.",
  "快點。": "Hurry.",
  "看一眼排隊的車": "He glances at the waiting carts.",
  "腰牌": "Waist token",
  "阿轍腰上的腰牌，輪紋裡卡著泥。他沒去擦。": "Mud is caught in the wheel pattern on A-Zhe's token. He leaves it there.",
  "請老伯看看裂軸。阿轍腰上的腰牌也可以看。": "Ask the old man to check the axle. You can also look at A-Zhe's waist token.",
  "大家各做一點": "Everyone Lends a Hand",
  "城子先用肩膀抵住車輪，車身不再往下滑。": "Cheng braces the wheel with his shoulder. The cart stops sliding.",
  "我抵著，你們慢慢來。": "I've got it. Take your time.",
  "先商量怎麼移車：照你想的順序點三件事，再按「開始」。": "Plan the move: tap the three tasks in order, then tap Start.",
  "合力移車": "Move the cart together",
  "卸下土袋": "Unload the sacks",
  "泥邊鋪木板": "Lay boards beside the mud",
  "車還是太重，輪子往泥裡又沉了一點。": "The cart is still too heavy. The wheel sinks a little deeper.",
  "不行，再拉軸頭就斷了！": "No! Another pull and the axle will snap!",
  "唔，塞不進去！輪子陷得太深了。": "Ugh, it won't fit! The wheel's sunk too deep.",
  "我來搭把手，先卸幾袋土！": "I'll help. Let's unload a few sacks of earth first!",
  "又滑回來了。泥地撐不住。": "It's sliding back. The mud won't hold.",
  "快，墊上木板，輪子才踩得住！": "Quick, lay the boards! Give the wheel something firm.",
  "卸下來的土，我幫忙送，別全堆在腳邊。": "I'll carry the earth away. Don't pile it around our feet.",
  "筐口我扶著。": "I'll hold the basket.",
  "放這裡？好，你們慢慢卸。": "Here? All right. Unload it slowly.",
  "溪兒、花兒把土袋一袋袋卸下，車身輕了。": "Xi'er and Hua'er lift off the sacks one by one, lightening the cart.",
  "小梅在泥邊鋪好木板。": "Xiaomei lays boards beside the mud.",
  "燕子收起地上的繩頭，庭哥在坡邊指出空處。": "Yanzi gathers the loose rope. Ting points out a clear space by the slope.",
  "可不能叫人說，我把好好的車弄壞了。": "I can't have people saying I broke a perfectly good cart.",
  "先顧車。": "Let's see to the cart first.",
  "想說又停住": "He starts to speak, then stops.",
  "缺個楔子。": "We need a wedge.",
  "父親教的結": "The Knot Dad Taught Me",
  "削平木楔、綁好繩結": "Trim the wedge and tie the rope",
  "阿轍手上的木楔，有一邊削偏了。": "One side of A-Zhe's wooden wedge is uneven.",
  "木楔削平，敲進軸頭。": "The wedge is trimmed smooth and tapped into the axle.",
  "阿轍把繩子繞了三圈，打了個結。": "A-Zhe winds the rope three times and ties a knot.",
  "城子抵住輪子，大家合力一推——": "Cheng braces the wheel. Everyone pushes together...",
  "車輪壓上木板，停到了乾地上。": "The wheel rolls onto the boards. The cart comes to rest on dry ground.",
  "你爹也是做這個的？": "Does your dad do this too?",
  "趕糧車。": "He drives a grain cart.",
  "難怪。這個結有人教過。": "Thought so. Someone taught you that knot.",
  "回去叫你爹看看，這楔子削得還成。": "Show your dad when you get home. That's a decent wedge you've made.",
  "……嗯。": "...Mm.",
  "低頭摸了摸腰牌": "He looks down and touches his token.",
  "那天為什麼轉彎": "Why He Turned That Day",
  "還有地方疼？": "Does anything still hurt?",
  "我一直怪他，為什麼偏要走那條路。": "I kept blaming him for taking that road.",
  "那個雨夜": "That Rainy Night",
  "爹，官糧不送了嗎？": "Dad, aren't we delivering the government grain?",
  "先送你去看病。": "I'm taking you to a doctor first.",
  "伸手探了探他的額頭": "He reaches out to feel his son's forehead.",
  "他知道會誤期。": "He knew he'd be late.",
  "……還是先顧我。": "...He still put me first.",
  "阿轍擦掉腰牌輪紋裡的泥。": "A-Zhe wipes the mud from the wheel pattern on his token.",
  "爹沒有走歪路。": "Dad wasn't taking the wrong road.",
  "剛才那輛車，越急著拉，陷得越深。": "The harder we rushed to pull that cart, the deeper it sank.",
  "阿轍哥，剛才怎麼停了那麼久？": "A-Zhe, why did you stop for so long just now?",
  "還沒看明白。總得再看看。": "I hadn't figured it out yet. I needed another look.",
  "一起看路": "Look at the Road Together",
  "窗外，老伯扶著車到了窄處，招手請後頭的人稍等。": "Outside, the old man reaches a narrow stretch with his cart and waves for those behind to wait.",
  "等回去，我想讓爹看看這個結。": "When we get back, I want Dad to see this knot.",
  "阿轍，下回你要是看見路堵住了，先叫我。": "A-Zhe, next time you see a blocked road, call me first.",
  "叫妳做什麼？": "What for?",
  "一起看啊。你以為彎路隨便拐就能走？": "To look together! You think just any detour will do?",
  "這一次，先笑的人是阿轍。": "This time, A-Zhe is the first to smile.",
  "先看清楚，再決定怎麼走。": "Look carefully, then choose your way.",
  "再試這盤棋": "Try this puzzle again",
  "……睡不著，就看一會兒棋。一會兒就好。": "...Can't sleep. Just looking at some chess. Only for a little while.",
  "這一站走了好幾天了。先放下那題，看點別的。": "We've been at this stop for days. Leave that puzzle for a bit. Try something else.",
  "這麼晚還醒著？我沏了一壺淡茶，不濃，喝了好睡。": "Still awake this late? I've made some weak tea. Nothing too strong to keep you up.",
  "這一站卡了好幾天了吧？先別想那題，喝口茶，玩點別的。": "Stuck here for days? Put that puzzle aside. Have some tea and try something else.",
  "{名}也睡不著？那我們小聲玩一局，就一局！": "Can't sleep either, {名}? Let's play quietly. Just one game!",
  "那題好難對不對？我也解不出來！先玩點別的嘛！": "That puzzle's hard, right? I can't solve it either! Let's try something else!",
  "嘿嘿，我也還醒著！星星好亮，來玩個小的嘛。": "Hehe, I'm still up too! Look at all those stars. Let's play something quick.",
  "前面堵住了？那就先拐個彎，玩點別的呀！": "Road blocked? Take a little detour. Let's play something else!",
  "{名}也還沒睡？城子說夜裡不該熬著……那，只玩一會兒。": "You're still awake too, {名}? Cheng says we shouldn't stay up... Well, just for a little while.",
  "我想了幾天也沒想通。不如先換個題目，讓眼睛歇一歇。": "I've thought about it for days and still don't understand. Let's try another puzzle and rest our eyes.",
  "……一會兒。然後去睡。": "...A little while. Then bed.",
  "……卡住了。先歇。": "...Stuck. Take a break.",
  "睡不著喔？我數星星，{你}數棋子，誰先數完誰先睡！": "Can't sleep? I'll count stars, {你} count pieces. Whoever finishes first goes to bed!",
  "那題先放著，又不會跑掉啦！我們玩個快的！": "Leave that puzzle for now. It won't run away! Let's play a quick one!",
  "睡飽了，路才走得直。去睡吧。": "A good night's sleep keeps you on the right road. Off to bed.",
  "歇夠了，再回去看那題，路就看得清。": "Rest first. You'll see the way through that puzzle more clearly.",
  "好了，茶也喝完了。去睡吧，明天的棋，明天再下。": "Well, the tea's gone. Off to bed. Tomorrow's chess can wait until tomorrow.",
  "歇一歇再看，那題就沒那麼難了。": "Take a break, then look again. It may not seem so hard.",
  "呵——我都打呵欠了。{名}快去睡！": "Ahh... Even I'm yawning. Get some sleep, {名}!",
  "好啦，玩夠了！那題明天一定解得開！": "All right, that's enough for now! We'll solve that puzzle tomorrow!",
  "星星也要睡覺啦，{名}也去睡嘛。": "Even the stars need sleep. You too, {名}.",
  "繞一圈回來，說不定就看見路了呀。": "After a little detour, you might spot the way through.",
  "城子說得對，夜深了。明日再見。": "Cheng's right. It's late. See you tomorrow.",
  "換個時候再看，也許就懂了。不必急。": "Try again another time. You may understand it then. No hurry.",
  "去睡。": "Go to sleep.",
  "……先歇。明天再看。": "...Rest first. Look again tomorrow.",
  "睡吧睡吧，明天我跑腿叫{你}起床！": "Sleep, sleep! I'll run over and wake {你} tomorrow!",
  "歇夠了再一步一步來，不急不急！": "Once you've rested, we'll take it step by step. No rush!",
  "楚河渡口，星槎醒了。": "At the Chu River ferry, the Star Raft awakens.",
  "說書人：今日，渡第一條河。": "Storyteller: Today, we cross our first river.",
  "棋路，原來就是水路。": "A path through the board is a path through the water.",
  "遠方河面，墨色翻湧。": "Far downriver, dark ink churns across the water.",
  "墨石封河，先替星槎開路！": "Ink-dark rocks block the river. Clear a passage for the Star Raft!",
  "河口通了，星槎出發！": "The river is clear. The Star Raft sets sail!",
  "渡口，已在身後。": "The ferry landing fades behind us.",
  "河圖光點，落入棋盤。": "Lights from the River Chart settle onto the board.",
  "收下這枚古典之印。": "Accept the Classical Seal.",
  "遠方城樓，等著下一盤棋。": "Beyond the distant city walls, another game awaits.",
  "齊轍：爹的車，會在這條路上嗎？": "Qi Zhe: Could Dad's cart be somewhere on this road?",
  "坡腳的車，輪子陷進泥裡。": "At the foot of the slope, a cart wheel sinks into the mud.",
  "小吏：日頭落下前，全送到！": "Clerk: Deliver it all before sunset!",
  "「大道不走，偏要走歪路。」": "\"You left the main road to take that crooked path.\"",
  "齊轍：先別拉！車要倒了！": "Qi Zhe: Don't pull! The cart's tipping!",
  "等回去，和爹一起看路。": "When I get home, Dad and I will look at the road together.",
  "小梅：下回路堵了，先叫我。": "Xiaomei: Next time the road's blocked, call me first.",
  "收下這枚秦之印。": "Accept the Qin Seal.",
  "說書人的手，慢慢移開。": "The storyteller slowly lifts his hand.",
  "刻痕，亮回一小段。": "Another short stretch of the carving glows.",
  "補上一行。": "Another line is restored.",
  "解開一盤，刻痕亮一段。": "Solve a position, and another stretch of the carving lights up.",
  "這一行，早已補上。": "This line has already been restored.",
  "這一行，還空著。": "This line is still blank.",
  "下次，自己補上它。": "Next time, fill it in yourself.",
  "燕子姊姊": "Yanzi",
  "方庭": "Fangting",
  "客官，夜深了。老朽點一盞燈，陪你們看一分鐘的棋，看完就去歇著。": "It's late, young guests. I'll light a lamp. One minute of chess together, then off to rest.",
  "客官，同一題盯久了，眼睛會累。換一分鐘的小題，鬆鬆眼。": "Staring at the same puzzle tires your eyes, young guests. Try a different little puzzle for a minute.",
  "攥緊的手，慢慢鬆開。": "His clenched hand slowly opens.",
  "刻痕，又亮回一段。": "Another stretch of the carving lights up.",
  "缺槽，仍舊空著。": "The recess is still empty.",
  "好眼力！": "Sharp eyes!",
  "看得仔細，就是好棋。": "Good chess starts with a careful look.",
  "說書人：「燈芯結了一朵燈花——老一輩說，這是好兆頭。」": "Storyteller: \"The wick has flowered. The old folk say it's a good omen.\""
};
function i18nStoryText(text,lang){
  text=String(text==null?"":text);
  const language=lang||(typeof i18nLang==="function"?i18nLang():"tw");
  if(language!=="en")return text;
  if(Object.prototype.hasOwnProperty.call(I18N_STORY_EN,text))return I18N_STORY_EN[text];
  return i18nText(text)||text;
}
function i18nStoryData(value,lang){
  const language=lang||(typeof i18nLang==="function"?i18nLang():"tw");
  if(language!=="en")return value;
  if(typeof value==="string")return i18nStoryText(value,"en");
  if(Array.isArray(value))return value.map(item=>i18nStoryData(item,"en"));
  if(value&&typeof value==="object"){
    return Object.fromEntries(Object.entries(value).map(([key,item])=>
      [key,key==="seal"?item:i18nStoryData(item,"en")]));
  }
  return value;
}
const I18N_CACHE=new Map();
/* 翻一句：翻得完整回英文；沒有中文回 null（不用換）；還剩中文也回 null（不換） */
function i18nText(s){s=String(s==null?"":s);if(!I18N_CJK.test(s)||(s.length>600&&!Object.prototype.hasOwnProperty.call(I18N_EN,s)))return null;if(I18N_CACHE.has(s))return I18N_CACHE.get(s);
  let r=i18nCore(s.trim(),0,false);if((r==null||I18N_CJK.test(r))&&I18N_EXN)r=i18nCore(s.trim(),0,true);if(r!=null&&I18N_CJK.test(r.replace(I18N_NMRE,"")))r=null;else if(r!=null)r=r.replace(/[]/g,"");if(I18N_CACHE.size>4000)I18N_CACHE.clear();I18N_CACHE.set(s,r);return r}
/* x＝可以用外掛字典（i18nText 第二輪才開）：內建翻得出的一律照內建，外掛只補翻不出的 */
function i18nCore(s,depth,x){if(!s)return"";if(!I18N_CJK.test(s))return s;if(depth>10)return null;
  if(Object.prototype.hasOwnProperty.call(I18N_STORY_EN,s))return I18N_STORY_EN[s];
  if(Object.prototype.hasOwnProperty.call(I18N_EN,s))return I18N_EN[s];if(x&&Object.prototype.hasOwnProperty.call(I18N_EX,s))return I18N_EX[s];
  for(const L of x?[I18N_PAT,I18N_PATX]:[I18N_PAT])for(const[re,fn]of L){const m=s.match(re);if(m){const r=fn(m,y=>i18nCore(String(y).trim(),depth+1,x));if(r!=null)return r}}
  /* 前後的圖示、符號（♟ ⚔ 👉 › ！…）留著，中間那段去翻 */
  const pm=s.match(/^([^\p{L}\p{N}「（(]*)([\s\S]*?)([^\p{L}\p{N}」）)]*)$/u);
  if(pm&&(pm[1]||pm[3])&&pm[2]){const P=/[！？。，、；：・…～]/g,head=pm[1].replace(P,x=>I18N_SEPEN[x].trim()+" ").replace(/[《〈》〉]/g,"\""),k2=pm[2]+pm[3];
    if(pm[1]&&Object.prototype.hasOwnProperty.call(I18N_EN,k2))return(head+I18N_EN[k2]).trim();if(pm[1]&&x&&Object.prototype.hasOwnProperty.call(I18N_EX,k2))return(head+I18N_EX[k2]).trim();   /* 第 15 輪：前面有圖示、字典的鍵帶句尾標點（「📴 目前沒有網路。…影響。」）也查得到 */
    const c=i18nCore(pm[2],depth+1,x);if(c==null)return null;const tail=pm[3].replace(P,x=>I18N_SEPEN[x].trimEnd()).replace(/[《〈》〉]/g,"\"");   /* 11/16：書名號換英文雙引號 */return(head+c+tail).trim()}
  const wm=s.match(/^（([^（）]+)）$/);if(wm){const c=i18nCore(wm[1].trim(),depth+1,x);return c==null?null:"("+c+")"}   /* 整句包在全形括號裡：括號裡整段先查字典，不在頓號處切開 */
  const mv=i18nMove(s);if(mv)return mv.wxf;
  const parts=s.split(I18N_SEP);if(parts.length<2)return null;let out="";
  for(const p of parts){if(!p)continue;if(Object.prototype.hasOwnProperty.call(I18N_SEPEN,p)){out+=I18N_SEPEN[p];continue}const c=i18nCore(p.trim(),depth+1,x);if(c==null)return null;out+=c}
  return i18nTidy(out)}
/* 保留前後空白的一行（文字節點用） */
function i18nLine(v){const m=String(v).match(/^(\s*)([\s\S]*?)(\s*)$/);const t=i18nText(m[2]);return t==null?null:m[1]+t+m[3]}
/* 讀螢幕：棋子、格子、每一步的英文念法（11b-a11y.js 的 axmPcName／axmCellLabel／axmMoveLine 同樣的參數） */
function i18nPcName(p){if(!p)return"";const r=p===p.toUpperCase();const L={K:"K",A:"A",B:"E",N:"H",R:"R",C:"C",P:"P"}[p.toUpperCase()];return(r?"Red ":"Black ")+(I18N_PN[L]||"piece")}
function i18nCellLabel(p,k){const f="file "+(9-k%9),r="rank "+(10-(k/9|0));return p?i18nPcName(p)+", "+f+", "+r:f+", "+r+", empty"}
function i18nMoveLine(o){o=o||{};const mine=o.me&&o.side===o.me;let who=o.side==="r"?"Red":"Black";if(o.me)who=mine?"You":(o.opp?(i18nCore(String(o.opp),0,true)||"Opponent"):"Opponent");
  if(I18N_CJK.test(who))who="Opponent";const mv=i18nMove(o.cn);let s=who+": "+(mv?mv.say:(i18nText(o.cn)||String(o.cn||"")));
  if(o.cap)s+=", captures "+i18nPcName(o.cap);if(o.mate)s+=", checkmate";else if(o.check)s+=", check";if(o.me&&!mine&&!o.mate&&!o.over)s+="; your move";return s}
/* 數字與日期：英文用 en-US，繁中用 zh-Hant-TW（沒有 Intl 時退回原樣） */
function i18nNum(n,lang){try{return new Intl.NumberFormat(lang==="en"?"en-US":"zh-Hant-TW").format(n)}catch(e){return String(n)}}
function i18nDate(d,lang){d=d instanceof Date?d:new Date(d);if(isNaN(d))return"";if(lang==="en")return I18N_MON[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear();
  return d.getFullYear()+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+String(d.getDate()).padStart(2,"0")}
/* 11/16 開發者「英文版本不齊全」＋選單：介面補字放外掛字典 data/i18n-en.json（正本 xiangqi-db/i18n-en.json），選 English 才下載，中文玩家不多抓。
   格式 {en:{中文:英文}, pat:[[正規式字串, 英文樣板, 群組型態]]}：樣板裡 $1…$9 代入群組；群組型態第 i 個字元管第 i 組：t＝要翻（翻不出整句不換）、n＝人名、其他＝原樣。
   人名（選單「角色、機器人翻，真人照原樣」）：字典有就用英文，沒有就留原文；留下的人名用 I18N_NM0／I18N_NM1 包著，i18nText 檢查「還剩中文」時不算它，最後拿掉記號。 */
const I18N_NM0="",I18N_NM1="",I18N_NMRE=/[^]*/g;
var I18N_EX={},I18N_PATX=[],I18N_EXN=0;   /* 外掛字典與句型（var：i18nText 第一輪不碰，載入順序不怕） */
function i18nExtPat(src,tpl,ty){const re=new RegExp(src);ty=String(ty||"");
  return[re,(m,t)=>{let bad=false;const out=String(tpl).replace(/\$(\d)/g,(x,d)=>{const g=m[+d]==null?"":String(m[+d]),k=ty[d-1];
    if(k==="t"){const r=t(g);if(r==null){bad=true;return""}return r}
    if(k==="n"){const r=I18N_CJK.test(g)?t(g):g;if(r!=null&&!I18N_CJK.test(r))return r;if(g.length>12||/[\s，、；：。！？（）「」・…]/.test(g)){bad=true;return""}return I18N_NM0+g+I18N_NM1}return g});   /* 人名留原文只限 12 字內、沒有標點空白（不然整段翻不出的中文會被當人名放過） */return bad?null:out}]}
function i18nExtMerge(o){if(!o||typeof o!=="object")return 0;let n=0;
  if(o.en)for(const k of Object.keys(o.en))if(!I18N_GUARD.includes(k)&&!Object.prototype.hasOwnProperty.call(I18N_EN,k)&&typeof o.en[k]==="string"){I18N_EX[k]=o.en[k];n++}
  if(Array.isArray(o.pat))for(const p of o.pat){try{I18N_PATX.push(i18nExtPat(p[0],p[1],p[2]));n++}catch(e){}}
  I18N_EXN+=n;I18N_CACHE.clear();return n}
/* #I18N-PURE-END */
/* 目前語言：store "lang" 只有 "en" 才是英文；其他（沒設定）＝中文，繁簡照 zh.js。函式宣告會提前，設定頁比這個檔先畫也叫得到（只用 store，不碰這個檔的 const） */
function i18nLang(){try{return store.get("lang",null)==="en"?"en":"zh"}catch(e){return"zh"}}
function i18nCur(){if(i18nLang()==="en")return"en";try{return(window.XQ_ZH&&XQ_ZH.mode())||"tw"}catch(e){return"tw"}}
function i18nHtmlLang(){const c=i18nCur();return c==="en"?"en":c==="cn"?"zh-Hans":"zh-Hant"}
/* 鍵值化（第 15 輪 X3）：i18nT("鍵","中文",{n:值})——英文模式而且 I18N_KEY 有這個鍵就回英文（{n} 換成值），否則原樣回中文。
   這個檔的 const 還沒初始化時（比這個檔先畫的頁面）也回中文，之後開機掃描照字典換。模組裡呼叫前先 typeof i18nT==="function" */
function i18nT(k,z,v){try{if(i18nLang()==="en"&&Object.prototype.hasOwnProperty.call(I18N_KEY,k)){let s=I18N_KEY[k];if(v)s=s.replace(/\{(\w+)\}/g,(m,x)=>v[x]!=null?String(v[x]):m);return s}}catch(e){}return z}
/* 手機系統語言是英文、又還沒選過語言：建議英文（只提示，不自動切） */
function i18nSuggest(){try{if(localStorage.getItem("m_lang")!=null)return null;const L=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""]);return/^en\b/i.test(String(L[0]||""))?"en":null}catch(e){return null}}
/* 設定頁「文字」那排按鈕、頂欄 🌐 都走這裡：k＝"tw" 繁體、"cn" 簡體、"en" English；換了就重新載入 */
function i18nPick(k){const cur=i18nCur();if(k===cur)return;const re=()=>setTimeout(()=>{try{location.reload()}catch(e){}},300);
  if(k==="en"){store.set("lang","en");try{localStorage.setItem("xq_zhMode",JSON.stringify("tw"))}catch(e){}try{toast("🌐 Switching to English…")}catch(e){}re();return}
  try{localStorage.removeItem("m_lang")}catch(e){}
  const zm=(window.XQ_ZH&&XQ_ZH.mode())||"tw";
  try{toast(k==="cn"?"切换成简体中文…":"切換成繁體中文…")}catch(e){}   /* zh-lint-ok：切到簡體時的提示本來就用簡體字（跟 05-settings 原本的一樣） */
  if(window.XQ_ZH&&zm!==k){setTimeout(()=>XQ_ZH.set(k),300);return}
  re()}
/* 頂欄 🌐：三種語言（語言名稱用各自的文字，data-nocc 不讓繁簡轉換、不翻） */
function i18nSheet(){const cur=i18nCur(),L=[["tw","繁體中文","zh-Hant"],["cn","简体中文","zh-Hans"],["en","English","en"]];   /* zh-lint-ok：簡體選項本來就用簡體字顯示 */
  sheet("🌐 語言 Language",b=>{
    b.innerHTML=`<div class="opt" data-nocc style="flex-wrap:wrap">${L.map(([k,l,h])=>`<button type="button" data-lang="${k}" lang="${h}"${cur===k?' class="on" aria-pressed="true"':' aria-pressed="false"'}>${l}</button>`).join("")}</div>
      <p class="muted" id="i18nScopeEn" style="font-size:12.5px;line-height:1.6;margin:10px 2px 0" lang="en"><b>In English:</b> the tab bar and menus, games against the computer, the game page and results, settings, the online lobby, Teatime endgames, the Daily Puzzle, the game library, the Qianqiu Cup, and the main quest, Chapter 1 “Classic · First Crossing of the River Chart”: its task cards, chapter name and puzzle hints. Chapter 1 also has English film captions and dialogue, as do the Starry Night Tea Party greetings and farewells.</p>
      <p class="muted" style="font-size:12.5px;line-height:1.6;margin:4px 2px 0" lang="en"><b>Chinese only for now:</b> other story scenes (Stone Table Tales and the novel), other character lines, scene history notes, the full privacy statement and the guides.</p>
      <p class="muted" data-noi18n style="font-size:12.5px;line-height:1.6;margin:6px 2px 0">英文介面目前涵蓋：底欄與選單、跟電腦對局、對局頁與結果、設定、線上大廳、一盞茶殘局、每日同題、棋譜庫、千秋盃，以及主線第一章「古典・河圖初渡」的任務卡、章名和解題提示；第一章電影與對話、七星星夜茶話會開場與收尾也已翻譯。其他劇情仍只有中文：石桌往事、長篇、其他角色台詞、場景史料、隱私說明全文和說明文件。</p>
      <button type="button" class="lk" data-xqdoc="i18n" style="margin-top:8px">🌐 About the English UI / 英文介面說明</button>`;
    b.querySelectorAll("[data-lang]").forEach(x=>x.onclick=()=>{try{vibrate(5)}catch(e){}closeSheet();i18nPick(x.dataset.lang)})})}
/* ================= 畫面：掃描文字節點、屬性，換成英文；原文記起來可以還原 ================= */
const I18N_ATTR=["aria-label","title","placeholder"];
const I18N_ORIG=new WeakMap(),I18N_AORIG=new WeakMap();
/* 不翻的地方：程式、輸入框、棋盤（SVG 上的棋子字）、畫布、頭像圓章（.av 只放得下一個字）、語言選項（data-nocc）、特別標 data-noi18n 的 */
function i18nIsSkip(el){if(!el||el.nodeType!==1)return false;if(/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|CODE|PRE|SVG|CANVAS)$/i.test(el.nodeName))return true;
  if(el.hasAttribute&&(el.hasAttribute("data-nocc")||el.hasAttribute("data-noi18n")))return true;return!!(el.classList&&el.classList.contains("av"))}
function i18nInSkip(n){for(let e=n&&n.nodeType===1?n:n&&n.parentNode;e&&e.nodeType===1;e=e.parentNode)if(i18nIsSkip(e))return true;return false}
/* data-i18n="鍵"：換掉這個元素「自己的」最後一段字（子元素裡的圖示不動，前後空白照留）；data-i18n-n 是 {n}；原文記在 I18N_ORIG，一樣可以還原。字典沒有這個鍵就回 false，照一般字典替換 */
function i18nKeyEl(el){const k=el&&el.getAttribute&&el.getAttribute("data-i18n");if(!k||!Object.prototype.hasOwnProperty.call(I18N_KEY,k))return false;
  let n=null;for(let c=el.firstChild;c;c=c.nextSibling)if(c.nodeType===3&&c.nodeValue.trim())n=c;if(!n)return false;
  const p=el.getAttribute("data-i18n-n"),en=I18N_KEY[k].replace(/\{n\}/g,p==null?"":p),m=String(n.nodeValue).match(/^(\s*)[\s\S]*?(\s*)$/),t=m[1]+en+m[2];
  if(n.nodeValue!==t){const o=I18N_ORIG.get(n);I18N_ORIG.set(n,{o:o&&n.nodeValue===o.t?o.o:n.nodeValue,t});n.nodeValue=t}return true}
function i18nTextNode(n,checked){const v=n.nodeValue;if(!v||!I18N_CJK.test(v))return;if(!checked&&i18nInSkip(n))return;
  const pe=n.parentNode;if(pe&&pe.nodeType===1&&pe.hasAttribute&&pe.hasAttribute("data-i18n")&&i18nKeyEl(pe))return;
  const t=i18nLine(v);if(t!=null&&t!==v){I18N_ORIG.set(n,{o:v,t});n.nodeValue=t}}
function i18nEl(el){i18nKeyEl(el);i18nAttrs(el)}
function i18nAttrs(el){for(const a of I18N_ATTR){const v=el.getAttribute&&el.getAttribute(a);if(!v||!I18N_CJK.test(v)||I18N_AGUARD.includes(v.trim()))continue;const t=i18nLine(v);if(t==null||t===v)continue;
  let m=I18N_AORIG.get(el);if(!m){m={};I18N_AORIG.set(el,m)}m[a]={o:v,t};el.setAttribute(a,t)}}
function i18nWalk(n,txt,el){if(!n)return;if(n.nodeType===3){txt(n);return}if(n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)return;if(n.nodeType===1){if(i18nIsSkip(n))return;el(n)}
  for(let c=n.firstChild;c;c=c.nextSibling)i18nWalk(c,txt,el)}
/* 把一整塊換成英文（root 預設 body） */
function i18nApply(root){root=root||document.body;if(!root||i18nInSkip(root.nodeType===3?root:root.parentNode))return;i18nWalk(root,n=>i18nTextNode(n,true),i18nEl)}
/* 換回原文：只還原「現在還是我們換上去的那個英文」的地方（之後程式自己改過的不動） */
function i18nRevert(root){root=root||document.body;if(!root)return;
  const tx=n=>{const o=I18N_ORIG.get(n);if(o&&n.nodeValue===o.t)n.nodeValue=o.o;I18N_ORIG.delete(n)},
    at=e=>{const m=I18N_AORIG.get(e);if(!m)return;for(const a in m)if(e.getAttribute(a)===m[a].t)e.setAttribute(a,m[a].o);I18N_AORIG.delete(e)};
  const w=(n)=>{if(!n)return;if(n.nodeType===3)return tx(n);if(n.nodeType===1)at(n);for(let c=n.firstChild;c;c=c.nextSibling)w(c)};w(root)}
let I18N_MO=null,I18N_T0=null;
function i18nWatch(){if(I18N_MO||typeof MutationObserver==="undefined"||!document.body)return;
  I18N_MO=new MutationObserver(ms=>{for(const m of ms){try{if(m.type==="characterData")i18nTextNode(m.target);else if(m.type==="attributes"){if(!i18nInSkip(m.target))i18nAttrs(m.target)}
    else for(const x of m.addedNodes){if(x.nodeType===3)i18nTextNode(x);else if(x.nodeType===1&&!i18nInSkip(x))i18nWalk(x,n=>i18nTextNode(n,true),i18nEl)}}catch(e){}}});
  I18N_MO.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:I18N_ATTR})}
/* 讀螢幕播報：先翻再念。結果視窗跳出來時 00-util modal 會當場念視窗裡的字（那時還沒換成英文）：念之前先把那個視窗換好，改念英文 */
function i18nSay(t){const s=String(t==null?"":t);if(!I18N_CJK.test(s))return s;const r=i18nText(s);if(r!=null)return r;
  try{const L=document.querySelectorAll(".modal .box"),bx=L[L.length-1],sp=x=>String(x||"").replace(/\s+/g," ").trim().slice(0,160);
    if(bx&&sp(bx.innerText)===s.trim()){i18nApply(bx);return sp(bx.innerText)}}catch(e){}return s}
/* 英文模式開機：html lang、標題、讀螢幕念法、掃全頁、之後的變化 */
function i18nBoot(){try{document.documentElement.lang=i18nHtmlLang()}catch(e){}
  if(i18nLang()!=="en"){i18nHintOnce();return}
  try{I18N_T0=document.title;document.title="Xiangqi Qianqiu";const mt=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(mt)mt.content="Xiangqi Qianqiu"}catch(e){}
  try{if(typeof axmMoveLine==="function")axmMoveLine=i18nMoveLine;if(typeof axmCellLabel==="function")axmCellLabel=i18nCellLabel;if(typeof axmPcName==="function")axmPcName=i18nPcName}catch(e){}
  try{if(typeof axSay==="function"){const o=axSay;axSay=function(t){return o.call(this,i18nSay(t))}}}catch(e){}
  try{if(typeof axsAlert==="function"){const o=axsAlert;axsAlert=function(t){return o.call(this,i18nSay(t))}}}catch(e){}
  i18nCss();i18nTabKeys();
  try{i18nApply(document.body)}catch(e){}i18nWatch();i18nExtLoad()}
/* 外掛字典（介面補字）：抓到就併進字典，整頁沒翻到的再翻一次；抓不到就只用內建的 */
let I18N_EXT=null;
function i18nExtLoad(){if(I18N_EXT)return I18N_EXT;if(typeof fetch!=="function")return I18N_EXT=Promise.resolve(0);
  I18N_EXT=fetch("data/i18n-en.json").then(r=>r.ok?r.json():null).then(o=>{const n=i18nExtMerge(o);if(n&&document.body)try{i18nApply(document.body)}catch(e){}return n}).catch(()=>0);return I18N_EXT}
/* 底欄四顆（m.html 寫死的）照 data-go 標上鍵，不靠字 */
const I18N_TABK={"#/":"tab.home","#/lobby":"tab.online","#/db":"tab.library","#/settings":"tab.settings"};
function i18nTabKeys(){try{document.querySelectorAll("#tabbar [data-go]").forEach(b=>{const k=I18N_TABK[b.getAttribute("data-go")];if(k&&!b.hasAttribute("data-i18n"))b.setAttribute("data-i18n",k)})}catch(e){}}
/* 防爆版：英文字比較長，只在英文模式（html[lang=en]）縮底欄、工具列、分頁的字，按鈕與說明允許換行；不動 m.css */
const I18N_CSS=["html[lang=en] .tabbar button{font-size:10.5px;letter-spacing:-.1px;white-space:nowrap}",
  "html[lang=en] #acts button{font-size:12px;line-height:1.15;white-space:normal;overflow-wrap:break-word}",
  "html[lang=en] #tbb{flex-wrap:wrap}html[lang=en] #tbb button{flex:1 1 calc(50% - 8px);min-width:0;white-space:normal;padding:8px 6px;font-size:13px}",
  "html[lang=en] .st-tabs button{font-size:12.5px;padding-left:2px;padding-right:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  "html[lang=en] #title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}",
  "html[lang=en] .modal .row button,html[lang=en] .modal .btn,html[lang=en] .opt button,html[lang=en] .pill,html[lang=en] .btn{white-space:normal;line-height:1.25;overflow-wrap:break-word}",
  "html[lang=en] .lvl button span,html[lang=en] .cpu-chip small{font-size:10px;letter-spacing:-.2px}",
  "html[lang=en] .muted,html[lang=en] .sec-t,html[lang=en] .card,html[lang=en] .item .tx span,html[lang=en] .cpu-lb{overflow-wrap:break-word;hyphens:auto}",
  /* 評比第 17、18 輪 B5：主線（首頁「下一步」、禮包、任務卡、電影大字、危機題說明）英文比較長，拿掉字距、允許換行；對話場景「（試過）」是 CSS 的字，英文換掉 */
  "html[lang=en] .mnq-next{white-space:normal;letter-spacing:0;font-size:16px;text-align:center}",
  "html[lang=en] #mnqGf h2,html[lang=en] #mnqCard b,html[lang=en] #mnqCard .cd-k,html[lang=en] #mnfPg .mnf-card b{letter-spacing:.02em;overflow-wrap:break-word}",
  "html[lang=en] #mnqGf button,html[lang=en] #mnqCard button,html[lang=en] #mnfPg .mnf-card button{letter-spacing:0;font-size:18px;white-space:normal}",
  "html[lang=en] #mnfPg .mnf-big{white-space:normal;letter-spacing:.02em;font-size:clamp(30px,calc(var(--mnfw,100vw)*.09),56px);line-height:1.1;padding:0 14px}",
  "html[lang=en] #mnfPg .mnf-qs{white-space:normal;font-size:17px}",
  "html[lang=en] #mnfPg .mnf-sub,html[lang=en] #mnfRite .mnf-sub{white-space:normal;overflow-wrap:break-word;letter-spacing:.01em;padding:.4em 14px;box-sizing:border-box;font-size:clamp(16px,4.6vw,22px);line-height:1.45}",
  "html[lang=en] #mnvPg .mnv-o button.tried::after{content:' (tried)'}",
  /* 11/14 頂欄英文：時辰鐘旁的小字比中文長，375 寬會跑到右上角頭像底下；限寬、字縮小、放不下用刪節號（點一下看船齡卡片有全文） */
  "html[lang=en] .clk-sm{max-width:calc(100vw - 214px)}",
  "html[lang=en] .clk-sm>span{min-width:0;overflow:hidden}",
  "html[lang=en] .clk-sm .clk-sl>span,html[lang=en] .clk-sm .clk-ss{font-size:10px;letter-spacing:0;overflow:hidden;text-overflow:ellipsis}",
  "html[lang=en] .clk-sm .clk-sl>b{letter-spacing:0;white-space:nowrap}"].join("\n");

function i18nCss(){try{if(document.getElementById("i18nCss"))return;const s=document.createElement("style");s.id="i18nCss";s.textContent=I18N_CSS;(document.head||document.body).appendChild(s)}catch(e){}}
/* 英文系統、還沒選過語言：開 App 4 秒後提示一次（不自動切） */
function i18nHintOnce(){try{if(i18nSuggest()!=="en"||store.get("langHint",false))return;setTimeout(()=>{try{if(store.get("langHint",false))return;store.set("langHint",true);toast("🌐 English UI: Settings ⚙ → 🌐 (top right)")}catch(e){}},4000)}catch(e){}}
if(typeof document!=="undefined"&&document.body)i18nBoot();
