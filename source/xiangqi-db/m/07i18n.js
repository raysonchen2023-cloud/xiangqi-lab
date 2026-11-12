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
  "還沒有走棋":"No moves yet","還沒有擺棋子":"No pieces on the board","沒有棋子":"no pieces","你的時間到了":"Your time is up","你的時間到了，超時":"Your time is up: time out","頁面":"Page"
};
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
  [/^(\d{1,2})月(\d{1,2})日$/,m=>I18N_MON[(+m[1]-1+12)%12]+" "+(+m[2])]
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
  if(pm&&(pm[1]||pm[3])&&pm[2]){const c=i18nCore(pm[2],depth+1);if(c==null)return null;const P=/[！？。，、；：・…～]/g,head=pm[1].replace(P,x=>I18N_SEPEN[x].trim()+" "),tail=pm[3].replace(P,x=>I18N_SEPEN[x].trimEnd());return(head+c+tail).trim()}
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
      <p class="muted" style="font-size:12.5px;line-height:1.6;margin:10px 2px 0" lang="en">English covers the main screens: tab bar, quick game against the computer, the game page and results, and the main settings. Story text and guides stay in Chinese.</p>
      <p class="muted" style="font-size:12.5px;line-height:1.6;margin:6px 2px 0">英文介面目前涵蓋底欄、跟電腦快速對局、對局頁與結果、設定的主要項目；劇情和說明文件仍是中文。</p>
      <button type="button" class="lk" data-xqdoc="i18n" style="margin-top:8px">🌐 About the English UI / 英文介面說明</button>`;
    b.querySelectorAll("[data-lang]").forEach(x=>x.onclick=()=>{try{vibrate(5)}catch(e){}closeSheet();i18nPick(x.dataset.lang)})})}
/* ================= 畫面：掃描文字節點、屬性，換成英文；原文記起來可以還原 ================= */
const I18N_ATTR=["aria-label","title","placeholder"];
const I18N_ORIG=new WeakMap(),I18N_AORIG=new WeakMap();
/* 不翻的地方：程式、輸入框、棋盤（SVG 上的棋子字）、畫布、頭像圓章（.av 只放得下一個字）、語言選項（data-nocc）、特別標 data-noi18n 的 */
function i18nIsSkip(el){if(!el||el.nodeType!==1)return false;if(/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|CODE|PRE|SVG|CANVAS)$/i.test(el.nodeName))return true;
  if(el.hasAttribute&&(el.hasAttribute("data-nocc")||el.hasAttribute("data-noi18n")))return true;return!!(el.classList&&el.classList.contains("av"))}
function i18nInSkip(n){for(let e=n&&n.nodeType===1?n:n&&n.parentNode;e&&e.nodeType===1;e=e.parentNode)if(i18nIsSkip(e))return true;return false}
function i18nTextNode(n,checked){const v=n.nodeValue;if(!v||!I18N_CJK.test(v))return;if(!checked&&i18nInSkip(n))return;const t=i18nLine(v);if(t!=null&&t!==v){I18N_ORIG.set(n,{o:v,t});n.nodeValue=t}}
function i18nAttrs(el){for(const a of I18N_ATTR){const v=el.getAttribute&&el.getAttribute(a);if(!v||!I18N_CJK.test(v))continue;const t=i18nLine(v);if(t==null||t===v)continue;
  let m=I18N_AORIG.get(el);if(!m){m={};I18N_AORIG.set(el,m)}m[a]={o:v,t};el.setAttribute(a,t)}}
function i18nWalk(n,txt,el){if(!n)return;if(n.nodeType===3){txt(n);return}if(n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)return;if(n.nodeType===1){if(i18nIsSkip(n))return;el(n)}
  for(let c=n.firstChild;c;c=c.nextSibling)i18nWalk(c,txt,el)}
/* 把一整塊換成英文（root 預設 body） */
function i18nApply(root){root=root||document.body;if(!root||i18nInSkip(root.nodeType===3?root:root.parentNode))return;i18nWalk(root,n=>i18nTextNode(n,true),i18nAttrs)}
/* 換回原文：只還原「現在還是我們換上去的那個英文」的地方（之後程式自己改過的不動） */
function i18nRevert(root){root=root||document.body;if(!root)return;
  const tx=n=>{const o=I18N_ORIG.get(n);if(o&&n.nodeValue===o.t)n.nodeValue=o.o;I18N_ORIG.delete(n)},
    at=e=>{const m=I18N_AORIG.get(e);if(!m)return;for(const a in m)if(e.getAttribute(a)===m[a].t)e.setAttribute(a,m[a].o);I18N_AORIG.delete(e)};
  const w=(n)=>{if(!n)return;if(n.nodeType===3)return tx(n);if(n.nodeType===1)at(n);for(let c=n.firstChild;c;c=c.nextSibling)w(c)};w(root)}
let I18N_MO=null,I18N_T0=null;
function i18nWatch(){if(I18N_MO||typeof MutationObserver==="undefined"||!document.body)return;
  I18N_MO=new MutationObserver(ms=>{for(const m of ms){try{if(m.type==="characterData")i18nTextNode(m.target);else if(m.type==="attributes"){if(!i18nInSkip(m.target))i18nAttrs(m.target)}
    else for(const x of m.addedNodes){if(x.nodeType===3)i18nTextNode(x);else if(x.nodeType===1&&!i18nInSkip(x))i18nWalk(x,n=>i18nTextNode(n,true),i18nAttrs)}}catch(e){}}});
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
  try{i18nApply(document.body)}catch(e){}i18nWatch()}
/* 英文系統、還沒選過語言：開 App 4 秒後提示一次（不自動切） */
function i18nHintOnce(){try{if(i18nSuggest()!=="en"||store.get("langHint",false))return;setTimeout(()=>{try{if(store.get("langHint",false))return;store.set("langHint",true);toast("🌐 English UI: Settings ⚙ → 🌐 (top right)")}catch(e){}},4000)}catch(e){}}
if(typeof document!=="undefined"&&document.body)i18nBoot();
