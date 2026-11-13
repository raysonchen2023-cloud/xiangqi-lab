/* ================= 🌐 介面語言架構（評比循環第 14 輪 F1；評審 P41.1、P41.2、P42.1：外籍漢學玩家、海外玩家要能用英文走完主流程）=================
   做法：「掃描文字節點＋字典替換」，不改各模組的畫面程式。
     ① 字典 I18N_EN：繁中原文（去掉前後的圖示、標點後的那段字）→ 英文；動態句子用 I18N_PAT（正規式＋組字函式），中文記譜轉 WXF 記譜。
     ② i18nText(字)：整句查字典 → 套句型 → 記譜 → 照中文標點（，、；・：。！？（）「」…）切段逐段翻；只要還剩一個中文字就整句不換（不出現半中半英）。
     ③ 選了 English（store "lang"="en"）才裝 MutationObserver：新加的節點、改過的文字、aria-label／title／placeholder 都過一遍；
        原文記在 WeakMap，i18nRevert() 可以原封不動還原。沒選英文就什麼都不裝，繁中、簡體畫面完全照舊。
     ④ 換語言一律重新載入（跟 zh.js 繁簡切換一樣），預設繁中、不自動切；手機是英文系統只跳一次小提示告訴他設定裡可以選。
     ⑤ 讀螢幕（11b-a11y.js）的每步念法、格子念法換成英文：axmMoveLine／axmCellLabel／axmPcName 在英文時換成這裡的版本（指定，不是重新宣告，不撞名），
        axSay、axsAlert 包一層先翻再念。英文記譜用 WXF（C2.5、H8+7；同一路兩子用 +C.5／-R+1），念法寫成完整英文「Cannon 2 traverses to 5」。
   不翻：棋子上的字（帥俥傌…照舊）、3D 園子畫布裡的字、劇情與說明文件、角色台詞；這些看 art/docs/i18n.md 的「還沒翻的」。
   不要放進字典的字：隱私、官階、進階（07s2／07s4／07m5 用畫面上的字找段落）、下船、上星槎（07w9）、估計棋力（07y9）、正在對戰（07x3）、取代這支手機（07s4）——I18N_GUARD，測試會檢查。
   ⑥ 第 15 輪 X3（評審 P41.1、P41.2、P42.1、P71.2）：字典擴大到設定說明小字、線上大廳與安全、連線狀態小卡、一盞茶、每日同題、棋譜庫、千秋盃、星槎入口；
      核心流程「鍵值化」：I18N_KEY＋i18nT("鍵","中文")／data-i18n="鍵"（08b 對局頁與結果、05-settings 標題、09b 線上結果、底欄），原文改字也不會失效；
      I18N_AGUARD 是別的模組拿來找按鈕的 aria-label／title，英文也不換；英文模式注入 html[lang=en] 的防爆版樣式（I18N_CSS）。
   前綴 i18n／I18N_；測試 xiangqi-lab/tools/test-i18n.js；include 在 m.html 最後（07dq-daily.js 後面）。 */
/* #I18N-PURE-BEGIN：到 #I18N-PURE-END 是不碰畫面的資料與純函式，test-i18n.js 用 vm 直接載入 */
const I18N_CJK=/[㐀-鿿豈-﫿]/;
const I18N_GUARD=["隱私","官階","進階","下船","上星槎","估計棋力","正在對戰","取代這支手機"];
/* 象棋術語用通行英文；WXF 字母 K A E H R C P */
const I18N_PL={"帥":"K","將":"K","仕":"A","士":"A","相":"E","象":"E","傌":"H","馬":"H","俥":"R","車":"R","炮":"C","砲":"C","包":"C","兵":"P","卒":"P"};
const I18N_PN={K:"General",A:"Advisor",E:"Elephant",H:"Horse",R:"Chariot",C:"Cannon",P:"Soldier"};
const I18N_NUM={"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10};
const I18N_MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/* 字典：鍵＝畫面上的繁中（不含前後圖示、全形驚嘆號問號等，那些 i18nText 會自己處理）；值＝英文 */
const I18N_EN={
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
  "藏譜石窟":"Archive Grotto","觀星閣":"Stargazing Pavilion","學室":"Study hall","太學":"Imperial Academy","國子學":"Imperial Academy","國學":"Imperial Academy","國子寺":"Imperial Academy",
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
  "提示":"Hint","輪到你":"Your move","輪到你走":"Your move","輪到電腦":"Computer's move","等電腦":"Waiting for the computer","確定認輸？":"Resign this game?",
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
  "同步訊息有簽名":"sync messages signed","上一版":"Previous version","同步訊息沒簽名":"sync messages unsigned","舊版":"Old version","沒有同步頻道":"no sync channel","還不知道":"Unknown yet","雙方簽名":"Both signed","無法驗證":"can't verify",
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
  "局面還原（沒有存檔，要留下來請自己走幾步再按 💾 存成棋譜）":"Set up position (not saved; to keep it, play a few moves and tap 💾 Save as game record)","棋風":"Style"
};
/* 第 15 輪 X3「鍵值化」：核心流程（對局頁工具列與狀態列、認輸／悔棋確認、結果視窗、挑戰電腦開新局、設定頁標題、底欄）不靠整句比對，
   模組裡寫 i18nT("鍵","中文")（中文時原樣回傳）或在元素上標 data-i18n="鍵"（英文模式換掉那個元素自己的最後一段字；data-i18n-n 是 {n} 的值）。
   原文改字也不會失效；鍵名＝「區.項」，值是英文（含前後圖示）。測試會檢查模組用到的鍵這裡都有。 */
const I18N_KEY={
  "tab.home":"Home","tab.online":"Online","tab.library":"Library","tab.settings":"Settings",
  "cpu.title":"Play the computer","game.items":"Items","game.undo":"Undo","game.new":"New","game.resign":"Resign","game.review":"Review","game.setup":"Setup","game.peek":"Peek","game.undoN":"Undo ({n})",
  "game.resignAsk":"Resign this game?","game.thinking":"🤔 Thinking…","game.check":"⚠ Check!","game.yourMove":"👉 Your move",
  "undo.note":"After an undo, this game no longer counts toward \"My strength\" (the result still counts).","dlg.ok":"OK","dlg.cancel":"Cancel",
  "res.win":"You won!","res.draw":"Draw","res.lose":"You lost this one","res.review":"📊 Review","res.home":"🏠 Home","res.viewBoard":"View board","res.again":"Play again","res.nextLevel":"Next level ›",
  "res.keyMove":"🔎 Understand the key move of this game ›","res.rankedAgain":"Play another ranked game ›","res.quickNote":"This was a quick game; it doesn't count toward your rank.",
  "net.win.r":"Red ({n}) wins","net.win.b":"Black ({n}) wins",
  "new.titleRanked":"🥇 Ranked · New game","new.titlePractice":"📚 Practice room · New game","new.youPlay":"You play","new.opp":"Opponent","new.level":"Level",
  "new.red":"🔴 Red (moves first)","new.black":"⚫ Black (moves second)","new.goRanked":"Start ranked game","new.goLevel":"Start level {n}",
  "set.title":"Settings","set.tab.bot":"Character","set.tab.look":"Board","set.tab.sound":"Sound","set.tab.more":"System","set.more":"⚙ More settings",
  "set.font":"Font","set.fontSize":"Text size","set.lang":"Language","set.rules":"Rules","set.pace":"Computer pace","set.moveFx":"Move display and effects",
  "set.sndPiece":"Piece sounds","set.sndVoice":"Voice calls","set.sndAmb":"Ambience","set.myChar":"My character","set.display":"Display","set.support":"Support","set.about":"About"
};
/* 英文時不換的屬性值：別的模組用這幾個 aria-label／title 找按鈕（06-cpu 換園子、07t3 籤筒、07w9 出口），換掉就找不到 */
const I18N_AGUARD=["回首頁","回星槎","聲控走棋","回棋盤模式","去園子下棋（3D）"];
/* 句型：[正規式, (比對結果, 翻譯函式)=>英文或 null]；T(字) 翻不出來會回 null，整句就不換 */
const I18N_PAT=[
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
  [/^對手(.+)$/,(m,T)=>{const r=T(m[1]);return r==null?null:"Opponent: "+r}],
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
  [/^約\s*([\d.]+)\s*(MB|KB|GB)$/,m=>"about "+m[1]+" "+m[2]]
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
const I18N_CACHE=new Map();
/* 翻一句：翻得完整回英文；沒有中文回 null（不用換）；還剩中文也回 null（不換） */
function i18nText(s){s=String(s==null?"":s);if(!I18N_CJK.test(s)||s.length>600)return null;if(I18N_CACHE.has(s))return I18N_CACHE.get(s);
  let r=i18nCore(s.trim(),0);if(r!=null&&I18N_CJK.test(r))r=null;if(I18N_CACHE.size>4000)I18N_CACHE.clear();I18N_CACHE.set(s,r);return r}
function i18nCore(s,depth){if(!s)return"";if(!I18N_CJK.test(s))return s;if(depth>10)return null;
  if(Object.prototype.hasOwnProperty.call(I18N_EN,s))return I18N_EN[s];
  for(const[re,fn]of I18N_PAT){const m=s.match(re);if(m){const r=fn(m,x=>i18nCore(String(x).trim(),depth+1));if(r!=null)return r}}
  /* 前後的圖示、符號（♟ ⚔ 👉 › ！…）留著，中間那段去翻 */
  const pm=s.match(/^([^\p{L}\p{N}「（(]*)([\s\S]*?)([^\p{L}\p{N}」）)]*)$/u);
  if(pm&&(pm[1]||pm[3])&&pm[2]){const P=/[！？。，、；：・…～]/g,head=pm[1].replace(P,x=>I18N_SEPEN[x].trim()+" "),k2=pm[2]+pm[3];
    if(pm[1]&&Object.prototype.hasOwnProperty.call(I18N_EN,k2))return(head+I18N_EN[k2]).trim();   /* 第 15 輪：前面有圖示、字典的鍵帶句尾標點（「📴 目前沒有網路。…影響。」）也查得到 */
    const c=i18nCore(pm[2],depth+1);if(c==null)return null;const tail=pm[3].replace(P,x=>I18N_SEPEN[x].trimEnd());return(head+c+tail).trim()}
  const wm=s.match(/^（([^（）]+)）$/);if(wm){const c=i18nCore(wm[1].trim(),depth+1);return c==null?null:"("+c+")"}   /* 整句包在全形括號裡：括號裡整段先查字典，不在頓號處切開 */
  const mv=i18nMove(s);if(mv)return mv.wxf;
  const parts=s.split(I18N_SEP);if(parts.length<2)return null;let out="";
  for(const p of parts){if(!p)continue;if(Object.prototype.hasOwnProperty.call(I18N_SEPEN,p)){out+=I18N_SEPEN[p];continue}const c=i18nCore(p.trim(),depth+1);if(c==null)return null;out+=c}
  return i18nTidy(out)}
/* 保留前後空白的一行（文字節點用） */
function i18nLine(v){const m=String(v).match(/^(\s*)([\s\S]*?)(\s*)$/);const t=i18nText(m[2]);return t==null?null:m[1]+t+m[3]}
/* 讀螢幕：棋子、格子、每一步的英文念法（11b-a11y.js 的 axmPcName／axmCellLabel／axmMoveLine 同樣的參數） */
function i18nPcName(p){if(!p)return"";const r=p===p.toUpperCase();const L={K:"K",A:"A",B:"E",N:"H",R:"R",C:"C",P:"P"}[p.toUpperCase()];return(r?"Red ":"Black ")+(I18N_PN[L]||"piece")}
function i18nCellLabel(p,k){const f="file "+(9-k%9),r="rank "+(10-(k/9|0));return p?i18nPcName(p)+", "+f+", "+r:f+", "+r+", empty"}
function i18nMoveLine(o){o=o||{};const mine=o.me&&o.side===o.me;let who=o.side==="r"?"Red":"Black";if(o.me)who=mine?"You":(o.opp?(i18nCore(String(o.opp),0)||"Opponent"):"Opponent");
  if(I18N_CJK.test(who))who="Opponent";const mv=i18nMove(o.cn);let s=who+": "+(mv?mv.say:(i18nText(o.cn)||String(o.cn||"")));
  if(o.cap)s+=", captures "+i18nPcName(o.cap);if(o.mate)s+=", checkmate";else if(o.check)s+=", check";if(o.me&&!mine&&!o.mate&&!o.over)s+="; your move";return s}
/* 數字與日期：英文用 en-US，繁中用 zh-Hant-TW（沒有 Intl 時退回原樣） */
function i18nNum(n,lang){try{return new Intl.NumberFormat(lang==="en"?"en-US":"zh-Hant-TW").format(n)}catch(e){return String(n)}}
function i18nDate(d,lang){d=d instanceof Date?d:new Date(d);if(isNaN(d))return"";if(lang==="en")return I18N_MON[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear();
  return d.getFullYear()+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+String(d.getDate()).padStart(2,"0")}
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
      <p class="muted" style="font-size:12.5px;line-height:1.6;margin:10px 2px 0" lang="en">English covers the main screens: tab bar, games against the computer, the game page and results, settings, the online lobby, Teatime endgames, the Daily Puzzle, the game library and the Qianqiu Cup. Story text, dialogue and guides stay in Chinese.</p>
      <p class="muted" style="font-size:12.5px;line-height:1.6;margin:6px 2px 0">英文介面目前涵蓋底欄、跟電腦對局、對局頁與結果、設定、線上大廳、一盞茶殘局、每日同題、棋譜庫和千秋盃；劇情、台詞和說明文件仍是中文。</p>
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
  try{i18nApply(document.body)}catch(e){}i18nWatch()}
/* 底欄四顆（m.html 寫死的）照 data-go 標上鍵，不靠字 */
const I18N_TABK={"#/":"tab.home","#/lobby":"tab.online","#/db":"tab.library","#/settings":"tab.settings"};
function i18nTabKeys(){try{document.querySelectorAll("#tabbar [data-go]").forEach(b=>{const k=I18N_TABK[b.getAttribute("data-go")];if(k&&!b.hasAttribute("data-i18n"))b.setAttribute("data-i18n",k)})}catch(e){}}
/* 防爆版：英文字比較長，只在英文模式（html[lang=en]）縮底欄、工具列、分頁的字，按鈕與說明允許換行；不動 m.css */
const I18N_CSS=["html[lang=en] .tabbar button{font-size:10.5px;letter-spacing:-.1px;white-space:nowrap}",
  "html[lang=en] #acts button{font-size:12px;line-height:1.15;white-space:normal;overflow-wrap:break-word}",
  "html[lang=en] .st-tabs button{font-size:12.5px;padding-left:2px;padding-right:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  "html[lang=en] #title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}",
  "html[lang=en] .modal .row button,html[lang=en] .modal .btn,html[lang=en] .opt button,html[lang=en] .pill,html[lang=en] .btn{white-space:normal;line-height:1.25;overflow-wrap:break-word}",
  "html[lang=en] .lvl button span,html[lang=en] .cpu-chip small{font-size:10px;letter-spacing:-.2px}",
  "html[lang=en] .muted,html[lang=en] .sec-t,html[lang=en] .card,html[lang=en] .item .tx span,html[lang=en] .cpu-lb{overflow-wrap:break-word;hyphens:auto}"].join("\n");
function i18nCss(){try{if(document.getElementById("i18nCss"))return;const s=document.createElement("style");s.id="i18nCss";s.textContent=I18N_CSS;(document.head||document.body).appendChild(s)}catch(e){}}
/* 英文系統、還沒選過語言：開 App 4 秒後提示一次（不自動切） */
function i18nHintOnce(){try{if(i18nSuggest()!=="en"||store.get("langHint",false))return;setTimeout(()=>{try{if(store.get("langHint",false))return;store.set("langHint",true);toast("🌐 English UI: Settings ⚙ → 🌐 (top right)")}catch(e){}},4000)}catch(e){}}
if(typeof document!=="undefined"&&document.body)i18nBoot();
