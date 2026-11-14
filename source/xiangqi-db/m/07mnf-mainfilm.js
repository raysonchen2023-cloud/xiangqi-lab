/* ================= 🎬 主線電影播放器（開發者 11/13 新手體驗第一波；定案 story/新手體驗定案_141_兩輪討論.md 第九節、分鏡 story/chatgpt_app/回覆_141d 第 2 節）=================
   跟開場電影（07bh-blackhole.js 的 OP_FILM1／bhxFilm）同一種「即時演出」：水墨場景圖滿版＋Ken Burns 推拉（kb）＋粒子（fx）＋書法字幕＋配樂，不是影片檔。
   bhxFilm 綁著黑洞配樂的 OP 時鐘和 BHX_PG 圖表；這裡做成通用版：mnfPlay(filmId,{onDone,...})，自己的時鐘（performance.now，可暫停）、自己的配樂播放器（現有曲目 data/bgm/<朝代>/）。
   電影資料 MNF_FILMS[id]＝{end 秒, mus 配樂（data/bgm/ 底下的相對路徑）, card 跳過後的任務卡 {t 大字, b 按鈕}, shots:[鏡頭…]}；
   鏡頭＝{at 秒, img 圖代號（MNF_IMG）, kb [[縮放,焦點x%,焦點y%] 起, 迄], fx 粒子, src 粒子源頭（圖上像素）, say [[秒,字幕]], who [[秒,角色,"l"|"r"]], sfx [[秒,音效]],
          board 秒＝星線棋盤（沿用 07bh bhxBoardSvg）, bp [中心 y, 寬]（平放、置中）或 bq 棋盤四角貼到圖上（[第1路第1排, 第9路第1排, 第9路第10排, 第1路第10排] 圖上像素，可帶透視，見 mnfQuadM）,
          big [秒,大字], seal [秒,印文]（蓋在 src）, qte 危機題代號（到這個鏡頭就定格解題，解完才往下）, tr 換進這個鏡頭的溶接秒數（預設 MNF_XD；0＝硬切，給重拍、大字用）,
          （11/14 第二章加的張力欄位，story/主線電影_加一章的資料格式.md）shk [[秒,強度px]] 畫面震一下、duck [[秒,音量0～1,淡變秒]] 配樂音量、tint [起,迄] 鏡頭內濾鏡慢慢變（MNF_TINT 的代號）、flash 秒＝白閃一下（快溶進出閃回用）}。
   fx：mist 晨霧、glow 金光上升、stars 星點、whirl 墨色漩渦、river 河光流動、ink 墨石暈開、burst 一次炸開、gates 十三道星門、frz 定格（只剩霧在動）、dust 塵土貼地騰起、rain 斜雨線。
   字幕（開發者定）：每個畫面最多一行、8～16 字，像電影台詞；同一個鏡頭的兩句至少隔 2 秒，後一句換掉前一句。
   跳過：右上角常駐「略過」，電影隨時可以跳；危機解題不能跳（解題時「略過」藏起來）。跳過後一定先顯示一張任務卡（大字寫現在要做什麼），按了才往下。
   危機解題 mnfQte：畫面定格、棋盤從場景浮出（沿用 01-board.js 的 Board 畫棋盤、XQCore 判合法與勝負，不另寫規則）；只放 4～6 顆子、一開始就選起要動的那顆、合法落點發光；
     上方大字「破局！」；走錯不算失敗，畫面倒帶重來；錯 2 次給提示（一句話＋藍框）；錯 3 次出現「看軍師演示」，看完也算通過（demo）。解對＝棋子化光，接回電影。
     勝負照殘局頁的判法：對方一步都不能走（將死或困斃）就算解開，所以多解的題（例如仕、相讓開一步，四個方向都行）也照樣算對。
   殘局解開儀式 mnfSolveRite（開發者 11/13 看小說第一章追加）：說書人的手掌移開 → 石桌邊一小段刻痕泛起青玉色微光（只一小點）→ 殘譜翻開，空著的一行逐字浮現墨色（小說第一章原文）。
     11/13 第二版（story/第一章電影重做分鏡_1113.md 第五節做法 D）：小說插畫（Q 版、船艙、橫幅）跟電影的水墨畫風、地點都接不起來，改用電影自己那張青石桌的兩張直幅同構圖
     c1_rite_hand（手按著）→ c1_rite_up（手移開），約 9 秒，結尾淡出時電影在底下溶進 N7 河口打通；說書人在 c1o 7 秒那鏡（c1_teller）已經按著同一張桌子出場。
     圖組見 MNF_RITE_SET（c1＝電影用；novel＝原本的小說插畫，檔案留著，以後星槎船艙的殘局要用可以傳 set:"novel"），殘譜用程式畫；
     行數、刻痕段數照「千秋殘局」真實進度（07f-ship.js store "shipSolved"，見 mnfRiteCount），不另造數字。
     主線每章危機、星槎主場殘局都能叫：mnfSolveRite({k:朝代,id:題號,cn:走法,state:"new"|"old"|"demo",set:"c1"|"novel",onDone})。
   減少動態（prefers-reduced-motion）：不推拉、不放粒子，字幕直接出現。
   名稱前綴 mnf／MNF（m/*.js 共用全域，11/13 已 grep 確認沒人用）。 */
const MNF_W=768,MNF_H=1376;
/* 第一章十二張專用圖（開發者 11/13：序局 story0、首頁、殘局頁、起航頁的圖不再拿來用，看了會膩；正本 art/story1，原稿 park/ch1film/*.png）；都是 768×1376。w、h＝原圖尺寸（cover 換算用，沒寫＝768×1376）
   第一批七張：home 星槎 355,590（桅頂 378,360）、燈籠 615,659、棧橋 330,1090｜table 石桌桌面空白、棋盤四角 201,949／411,868／622,967／411,1073，水槽斜穿桌面（入水口 585,885 → 左緣 230,1050 落下 → 潭 215,1265）
   whirl 渦眼 450,478、墨柱頂 450,270｜river 河口缺口（墨石間的瀑口）534,705、大墨石 370,690、遠塔 624,360｜stone 台面金色光暈 422,832｜ship 船頭燈籠 491,975、遠城 582,352｜sail 渡口燈籠 520,360、石階 624,615、船尾 250,1000
   第二批五張（開發者選「推薦方案」）：teller 星槎 374,420（桅頂 380,344）、說書人頭 620,700、右手按桌緣 460,1020、線裝冊 680,1010、石桌面中心 350,960、水槽落水 220,1120；
     這張不貼棋盤：桌面兩塊空白被托盤、木盒、說書人的手和袖子蓋掉一半，四角量 200,945／500,868／548,985／410,1072 貼上去會畫到手和袖子上，棋盤留到下一鏡 table 才揭曉。
   rite_hand／rite_up 兩張同構圖（位移 0）：手掌 420,830，手掌底下那段刻痕 595,855（沿桌緣約 -36°，長約 150）、右上袖角 700,400｜open 缺口奔流 480,720、天光從 500,60 斜下、遠塔 500,370／630,350、遠帆 480,500
   cabin 窗外星河 380,180、油燈 680,600、石桌缺槽四角 406,797／470,771／489,789／426,815（中心 448,793，長邊 -32°）、線裝書 490,880、木棋盒 555,750；棋盤見 MNF_C1Q_CAB */
const MNF_IMG={home:{u:"data/story1/c1_home.webp"},table:{u:"data/story1/c1_table.webp"},sail:{u:"data/story1/c1_sail.webp"},port:{u:"data/shipmap/port_classic.webp"},
  whirl:{u:"data/story1/c1_whirl.webp"},river:{u:"data/story1/c1_river.webp"},stone:{u:"data/story1/c1_stone.webp"},ship:{u:"data/story1/c1_ship.webp"},
  teller:{u:"data/story1/c1_teller.webp"},open:{u:"data/story1/c1_open.webp"},cabin:{u:"data/story1/c1_cabin.webp"},
  riteHand:{u:"data/story1/c1_rite_hand.webp"},rite:{u:"data/story1/c1_rite_up.webp"},   /* 殘局解開儀式（電影用）：riteHand＝說書人右手平按桌緣，rite＝手移開；兩張同構圖、座標對齊 */
  novel:{u:"data/shipmap/novel/ch01_3.webp",w:1000,h:747},novelHand:{u:"data/shipmap/novel/ch01_3_hand.webp",w:1000,h:747}};   /* 舊版儀式（小說插畫，橫幅）：電影不再用，留給 set:"novel" */
/* 第二章「秦・日落之前」十一張（story/第二章電影分鏡_1113.md 方案 A；正本 art/story2，原稿 park/ch2film/*.png；864×1536 的原稿縮成高 1376、左右各裁 3px，跟第一章一樣 768×1376、webp q85）。主體座標（原圖像素）：
   road 船頭踏板 150,1150、夯土民夫 420,600、直道盡頭 470,180、左側小陷車 130,520｜stuck 輪轂軸頭 315,890、老伯 560,950｜clerk 小吏頭 240,330、鞭梢 370,300、長影 200,1100
   rain 翻倒的糧車 560,820、車輪紋木牌 560,1125｜tilt 少年 600,400、斜車輪 330,640、老伯 600,750、車轍（中）150,800→300,1300、（右）345,800→595,1300、坡上車隊 600,175
   dry 乾地上的車輪軸頭 150,720、夕陽 360,60｜rite_fist／rite_palm 同構圖（特徵點比對位移 <1px）：拳頭 470,770、掌心木牌 420,750、拳頭下方那段桌緣刻痕 590,1000（約 -38°）
   window 窗外老伯 390,780、車 530,830、陶水囊 680,1150｜bench 紅布小馬 200,830、銀鈴 300,850、腰側木牌 620,1100｜depart 星槎 530,580、星槎左上方空星空（蓋印）500,400、直道 290,1000 */
const MNF_S2="data/story2/c2_";
Object.assign(MNF_IMG,{road:{u:MNF_S2+"road.webp"},stuck:{u:MNF_S2+"stuck.webp"},clerk:{u:MNF_S2+"clerk.webp"},rain:{u:MNF_S2+"rain.webp"},tilt:{u:MNF_S2+"tilt.webp"},dry:{u:MNF_S2+"dry.webp"},
  window:{u:MNF_S2+"window.webp"},bench:{u:MNF_S2+"bench.webp"},depart:{u:MNF_S2+"depart.webp"},c2Fist:{u:MNF_S2+"rite_fist.webp"},c2Palm:{u:MNF_S2+"rite_palm.webp"}});
/* 儀式的圖組：hand 手按著、up 手移開（兩張同構圖交叉淡入）；fh 手掌、fx 刻痕光的位置（原圖像素）；dw 光痕寬（圖寬 %）、rot 光痕角度；k＝[開場, 推近, 退回] 縮放；
   txt＝這一章的儀式字幕（蓋過 MNF_RITE_TXT 的同名句，沒寫的照舊）*/
const MNF_RITE_SET={c1:{hand:"riteHand",up:"rite",fh:[420,830],fx:[530,925],dw:33,rot:-31,k:[1.15,1.45,1.25]},   /* 11/13 實看：光原本在 595,855（刻痕上方約 30px、太短）；改成手掌蓋住的那段刻度 (422,990)～(640,860) 的中心、沿刻痕斜度 */
  novel:{hand:"novelHand",up:"novel",fh:[390,452],fx:[348,456],dw:7,rot:-14,k:[1.25,2.1,1.8]},
  c2:{hand:"c2Fist",up:"c2Palm",fh:[470,770],fx:[590,1000],dw:30,rot:-38,k:[1.15,1.45,1.25],txt:{hand:"攥緊的手，慢慢鬆開。",glow:"刻痕，又亮回一段。",rule:"缺槽，仍舊空著。"}}};   /* 第二章：齊轍攥著車輪木牌的拳頭 → 攤開；光在拳頭下方那段桌緣刻痕；最後一句留懸念 */
const MNF_FX=["mist","glow","stars","whirl","river","ink","burst","gates","frz","dust","rain"];
/* 鏡頭 tint 的濾鏡代號（CSS filter）：dusk 慢慢壓暗轉紅（小吏那鏡）、cold 閃回去色偏冷、warm 夕照暖亮 */
const MNF_TINT={none:"none",dusk:"sepia(.3) saturate(1.35) brightness(.7) hue-rotate(-10deg)",cold:"grayscale(.78) brightness(.82) contrast(1.08) sepia(.12) hue-rotate(170deg)",warm:"sepia(.18) saturate(1.2) brightness(1.06)"};
/* 轉場：MNF_XD 換圖交叉溶接秒數（鏡頭 tr 可改，0＝硬切）、MNF_GL 同一張圖連兩鏡時運鏡滑接秒數、MNF_EA 運鏡緩動比例（0＝等速，1＝舊的 ease-in-out 頭尾會停） */
const MNF_XD=.8,MNF_GL=1.1,MNF_EA=.35;
const MNF_SFX=["bell","star","drum","heart","gong","drip","whoosh","hang","crack","whip","whipf","rain"];   /* 11/14 第二章加：hang 夯、crack 木裂、whip 鞭響、whipf 遠遠的鞭響（閃回）、rain 雨聲約 3 秒；都用 WebAudio 合成 */
/* 第 1 章「古典・河圖初渡」三段（ChatGPT 141d 第一章分鏡表；字幕改成 8～16 字）。c1o 開章 35 秒、c1m 危機（1 步題）＋殘局解開儀式＋河口打通、c1e 章末 28 秒
   11/13 第二版＝story/第一章電影重做分鏡_1113.md 第四節「推薦方案」（開發者選定）：十二張圖每張只出現在一個連續鏡頭裡、一個連續鏡頭只配一句字幕；
     同一張圖在資料上拆成兩段（換粒子、定格、蓋印）時畫面不切，播放器用 MNF_GL 秒把運鏡滑接過去，不算重複用圖。換圖一律交叉溶接（tr 可改秒數）。
   說書人先在 c1o 7 秒（teller）按著石桌出場 → table 揭曉「棋路就是水路」→ 墨渦 → 墨石封河「破局！」→ 解題 → 儀式（同一張桌子：手移開、刻痕亮、殘譜補一行）→ open 河口打通 → c1e。
   kb 焦點照上面的主體座標算（手機 390×844 cover 後）；接點：home 結尾的星槎和 teller 開場的星槎在螢幕同一位置（約 195,355）、teller 結尾停在桌面接 table 桌面。
   切點對配樂重拍：zheng_1（開頭約 1 秒靜音，約 86 BPM）強拍 4.0／7.0／12.84／18.69／25.61／30.35、30.74；zheng_6 每 3 秒一句，12.2 起大聲、17.35 重拍、23.34。
   c1m 接在 c1o 後面、配樂不中斷（keepMusic），一開場就是 c1o 最後那一格（同一張 river、同一個 kb）定格解題，接縫看不出來。
   頭像（who）佔畫面下方 55%～83%、左或右半邊，字幕在 87%～91%：主體都擺在這兩塊上面；石桌棋盤那鏡頭頭像一定會擋到棋盤，所以不放頭像。
   棋盤用 bq 貼在石桌空白上（第 1～9 路沿水槽方向、河界落在水槽裡），見 mnfQuadM。 */
const MNF_C1Q=[[201,949],[411,868],[622,967],[411,1073]];
/* 船艙石桌（cabin）的棋盤：把橢圓桌面拉正（y÷0.65）後排正方格、格距 16，河界中心對準缺槽中心 448,793、方向對準缺槽長邊；格距再大會壓到線裝書和木棋盒 */
const MNF_C1Q_CAB=[[355,776],[464,732],[540,811],[432,855]];
/* 11/13 開發者：電影裡的 Q 版角色頭像跟水墨畫面放在一起違和，第一章三段的 who 全拿掉（播放器仍支援 who，之後要用再加） */
const MNF_FILMS={
  c1o:{end:35,mus:"classic/zheng_1.mp3",card:{t:"破局！",b:"出發"},shots:[
    {at:0,img:"home",kb:[[1.45,50,10],[1.45,40,40]],fx:"mist",sfx:[[0.3,"bell"]],say:[[1,"楚河渡口，星槎醒了。"]]},   /* 建立：從霧中山頭往下搖到河心星槎 */
    {at:4,img:"home",kb:[[1.5,36,41],[1.8,39.6,44]],fx:"glow",src:[355,600],sfx:[[4.1,"star"]]},   /* 同圖續：推近星槎，金光從船身升起（字幕同上一句） */
    {at:7,img:"teller",kb:[[1.25,85,12],[1.18,92,80]],fx:"mist",say:[[7.7,"說書人：今日，渡第一條河。"]]},   /* 星槎在畫面上方接過來，往下搖到說書人按在桌緣的手；11/13 實看：原本 [1.4,44,2]→[1.28,60,80] 在手機上把說書人切掉半個身體，改成靠右放大，說書人從頭到尾都在畫面裡 */
    {at:12.85,img:"table",tr:.6,kb:[[1.08,58,92],[1.25,70,100]],fx:"ink",src:[215,1265],board:13,bq:MNF_C1Q,sfx:[[12.9,"drip"]],say:[[13.6,"棋路，原來就是水路。"]]},   /* 同一張桌子：星線棋盤畫在桌面、慢推到棋盤置中；墨從水槽落下的潭裡暈開 */
    {at:18.65,img:"whirl",tr:.5,kb:[[2.0,71,29.5],[1.1,60,35]],fx:"whirl",src:[450,478],sfx:[[18.7,"drum"],[20.55,"drum"],[22.9,"drum"]],say:[[19.1,"遠方河面，墨色翻湧。"]]},   /* 潭裡的墨接墨渦；從墨渦特寫拉遠，露出往下游的河 */
    {at:25.6,img:"river",kb:[[1.5,62,22],[1.25,62,62]],fx:"ink",src:[534,705],say:[[26,"墨石封河，先替星槎開路！"]]},   /* 下游的河口：從亮處的遠河、塔往下搖到墨石，墨從缺口暈開 */
    {at:30.35,img:"river",kb:[[1.25,62,62],[1.35,66,54]],fx:"frz",big:[30.75,"破局！"],sfx:[[30.75,"gong"]]}]},   /* 同圖續：定格推近缺口 */
  c1m:{end:5.5,mus:"classic/zheng_1.mp3",card:{t:"上船，出發！",b:"出發"},shots:[
    {at:0,img:"river",kb:[[1.35,66,54],[1.35,66,54]],fx:"frz",qte:"c1"},   /* 同圖續：c1o 最後一格，定格解題；解開後 07mnq 演儀式（約 9 秒），儀式淡出時下一鏡溶進來 */
    {at:0.1,img:"open",tr:1,kb:[[1.15,65,48],[1.7,65,52]],fx:"burst",src:[480,720],sfx:[[0.2,"gong"],[1,"star"]],say:[[0.6,"河口通了，星槎出發！"]]}]},   /* 同一個河口：墨石裂開，對著缺口往前推，像穿過去 */
  c1e:{end:28,mus:"classic/zheng_6.mp3",card:{t:"收下古典之印",b:"好"},shots:[
    {at:0,img:"sail",kb:[[1.7,94,31],[1.05,60,45]],fx:"mist",say:[[0.5,"渡口，已在身後。"]]},   /* 正反打：衝過河口後回頭看渡口；從渡口燈籠、石階拉遠，露出自己站的船尾 */
    {at:6.08,img:"cabin",kb:[[1.4,50,15],[1.25,52,60]],fx:"stars",src:[380,180],board:6.2,bq:MNF_C1Q_CAB,sfx:[[6.2,"star"]],say:[[6.5,"河圖光點，落入棋盤。"]]},   /* 由外到內：從艙窗外的星河往下搖到青石桌，棋盤河界對準界石缺槽 */
    {at:12.2,img:"stone",kb:[[1.5,50,0],[1.3,58,42]],fx:"gates",src:[384,260],sfx:[[12.4,"star"]]},   /* 天空浮出十三道星門（不出字幕），往下搖到松樹、青石台 */
    {at:16.2,img:"stone",kb:[[1.55,49,98],[1.7,50,90]],fx:"glow",src:[422,832],seal:[17.35,"古典"],sfx:[[17.35,"bell"]],say:[[17.8,"收下這枚古典之印。"]]},   /* 同圖續：石台光暈擺在畫面 60%,40%，印蓋在光暈上、頭像在左下不擋印 */
    {at:23.34,img:"ship",kb:[[1.0,80,26],[1.5,81,26]],fx:"stars",src:[582,352],say:[[23.8,"遠方城樓，等著下一盤棋。"]]}]}};   /* 印的金光接船頭燈籠；對著遠城推近 */
/* 第 2 章「秦・日落之前」（story/第二章電影分鏡_1113.md 方案 A，開發者 11/14 選定；配樂是第二章專用的兩首 data/bgm/film/c2_crisis.mp3、c2_end.mp3）。
   c2_crisis（87 秒）用 ffmpeg 量：約每 5.95 秒一個重拍 6.0／11.95／17.85／23.75／29.75，2～5.75 秒偏靜（夯聲留白）；c2_end（82 秒）前 15 秒安靜、8.05／16.05 起句、16 秒起變大、24.1 重拍。開發者要實際聽過再微調切點。
   c2o 鏡頭 6 → 5.95 → 5.9 → 2.95 → 2.95 秒越切越短，23.75 重拍上定格，車轍浮出棋盤；c2m 定格解題 → 解開淡進「車有路了」；儀式放在 c2m 播完之後（07mnq MNQ_CHAP.qin.rite:"end"）→ c2e 章末。
   棋盤 MNF_C2Q 貼在 tilt 下方的中、右兩道車轍上（左邊那道在手機上會被裁掉，不用）：第 1 路沿中轍、第 9 路沿右轍，y 900～1220 */
const MNF_C2Q=[[180,900],[395,900],[555,1220],[276,1220]];
Object.assign(MNF_FILMS,{
  c2o:{end:27.5,mus:"film/c2_crisis.mp3",card:{t:"找路！",b:"出發"},shots:[
    {at:0,img:"road",kb:[[1.45,40,92],[1.25,58,28]],fx:"dust",src:[420,640],sfx:[[0.6,"hang"],[1.6,"hang"],[2.6,"hang"],[3.6,"hang"]],say:[[1.2,"齊轍：爹的車，會在這條路上嗎？"]]},   /* 從船頭踏板往上搖到直道盡頭；夯聲當心跳，4.6～6 秒留白 */
    {at:6,img:"stuck",tr:.5,kb:[[1.2,45,55],[1.7,41,65]],fx:"dust",src:[330,1000],sfx:[[11,"crack"]],shk:[[11,7]],say:[[6.5,"坡腳的車，輪子陷進泥裡。"]]},   /* road 左下那輛小陷車的近景；推近裂開的軸頭，木裂聲加震動 */
    {at:11.95,img:"clerk",tr:.25,kb:[[1.15,50,88],[1.42,34,38]],tint:["none","dusk"],fx:"dust",src:[300,1100],sfx:[[17.3,"whip"]],shk:[[17.3,5]],say:[[12.4,"小吏：日頭落下前，全送到！"]]},   /* 低處往上仰，越推越壓迫、慢慢壓暗轉紅；只聞鞭聲 */
    {at:17.85,img:"rain",tr:.2,flash:17.85,tint:["cold","cold"],fx:"rain",kb:[[1.3,55,60],[1.6,78,100]],duck:[[17.85,.12,.3]],sfx:[[17.9,"rain"],[18.4,"heart"],[19.2,"whipf"],[19.6,"heart"]],say:[[17.95,"「大道不走，偏要走歪路。」"]]},   /* 閃回渭水雨夜：鞭聲帶過去、白閃快溶、配樂壓到幾乎靜默 */
    {at:20.8,img:"tilt",tr:.2,flash:20.8,kb:[[1.15,55,50],[1.3,52,55]],fx:"dust",src:[330,700],duck:[[20.8,1,.25]],sfx:[[20.9,"heart"],[21.6,"crack"]],shk:[[21.6,6]],say:[[20.95,"齊轍：先別拉！車要倒了！"]]},   /* 白閃拉回現在，配樂一下子全開 */
    {at:23.75,img:"tilt",kb:[[1.3,52,55],[1.35,48,72]],fx:"frz",big:[23.85,"找路！"],board:24,bq:MNF_C2Q,sfx:[[23.8,"gong"]]}]},   /* 同圖續：定格，車轍浮出星線棋盤 */
  c2m:{end:5.5,mus:"film/c2_crisis.mp3",card:{t:"車有路了",b:"出發"},shots:[
    {at:0,img:"tilt",kb:[[1.35,48,72],[1.35,48,72]],fx:"frz",board:0,bq:MNF_C2Q,qte:"c2"},   /* 同圖續：c2o 最後一格，定格解題 */
    {at:0.1,img:"dry",tr:1,kb:[[1.7,20,52],[1.15,45,50]],fx:"glow",src:[150,720],duck:[[0.1,.55,2]],sfx:[[0.2,"gong"],[1,"star"]],say:[[0.6,"齊轍：車有路了。"]]}]},   /* 棋子化光淡出時夕照溶進來；從軸頭往後拉，車停在乾地上；張力放掉，配樂降下來 */
  c2e:{end:30,mus:"film/c2_end.mp3",card:{t:"收下秦之印",b:"好"},shots:[
    {at:0,img:"window",tr:1,kb:[[1.15,50,60],[1.5,51,57]],fx:"mist",say:[[0.8,"等回去，和爹一起看路。"]]},   /* 儀式淡出時溶進來；慢推到窗外在窄處停下的老伯 */
    {at:8.05,img:"bench",kb:[[1.35,26,60],[1.35,78,78]],sfx:[[8.3,"drip"]],say:[[8.6,"小梅：下回路堵了，先叫我。"]]},   /* 由遠到近：紅布小馬橫移到腰側的車輪木牌 */
    {at:16.05,img:"depart",kb:[[1.4,40,85],[1.3,62,35]],fx:"stars",src:[530,580],sfx:[[16.1,"star"]]},   /* 從直道往上搖到星河裡的星槎（不出字幕） */
    {at:24.1,img:"depart",kb:[[1.3,62,35],[1.42,66,30]],fx:"glow",src:[500,400],seal:[24.1,"秦"],sfx:[[24.1,"bell"]],say:[[24.6,"收下這枚秦之印。"]]}]}});   /* 同圖續：星槎上方蓋「秦」印 */
/* 危機題：預設（沒有另外指定時）＝船艙站齊轍那題 xs-classic-R（data/canju/ship-set.json），主線會照玩家本命子換成同一站那一題（07mnq mnqQteFor）
   alt＝其他也對的著法線（第一手照哪一條走，後面就照那一條自動應對）；wrong＝{著法:{say 台詞, re 對方真正的反駁著法}}（舊格式 {著法:台詞} 也認），走到那一手先顯示台詞、對方照 re 吃回再倒帶；
   11/14 第二章改成對話場景（07mnv）：nm 卡名、how 白話說明、vsay／vsay2 對話框提示、walk 陪我走每一步的說明、miss 走錯後的台詞、win 解開那句；
   11/14 第二輪（主線玩法多樣化）：trial 試看（cands 每條線雙方輪流、每手都驗過合法；bad＝看了會看到反駁）、help「幫我看」每一步的說明；hints（舊的提示三階）留給舊版，對話場景不再用 */
const MNF_QTE={c1:{id:"xs-classic-R",fen:"4ka3/4a4/RP7/9/9/9/9/9/9/4K4",side:"r",line:["a7a9"],big:"破局！",say:"一步，打開河口！",hint:"看你的本命棋子：一路衝到底！",est:20},
  c2:{id:"xs-qin-0",fen:"4ka3/2P1a4/9/9/4R4/9/8p/9/9/4K4",side:"r",line:["e5b5","e9d9","b5b9"],alt:[["e5a5","e9d9","a5a9"]],big:"找路！",say:"先找乾地，再直走！",hint:"別硬衝！旁邊哪一路是空的？",wrong:{e5e8:{say:"黑士一進，就把俥吃回去。",re:"f9e8"}},est:25,
    nm:"替俥找路",how:{t:"俥怎麼走",b:"俥可以直走或橫走，中間不能有棋子擋著。先找一條沒被擋住的路，再去威脅對方的將。"},
    vsay:"跟剛才的車一樣：別硬拉。點紅俥，自己走。",vsay2:"黑將躲開了。再走一步，讓它無路可走。",win:"將死！",
    trial:{say:"先試看兩條路會怎樣（試看不算數）。",cands:[{k:"hard",t:"正面硬衝",line:["e5e8","f9e8"],say:"俥一衝，黑士一進就吃回來，路斷了。",bad:1},
      {k:"side",t:"先橫移",line:["e5b5","e9d9"],say:"八路上下都空，黑將只能往旁邊躲。接下來呢？"}]},
    help:["藍框是俥。箭頭是走得通的路；紅圈那格走過去會被吃。","黑將躲開了。看看俥現在能不能沿空的那一路直衝到底。"],
    hints:["先看俥能走到哪些地方。","比較兩條通路，哪一條能接著威脅黑將？",["俥先往左橫走到八路（九路也行）：那一路上下都空著。","黑將躲開了。俥沿著空的那一路直衝到底，將軍！"]],
    walk:["我先走一步：俥往左橫走到八路，這一路沒有棋子擋。","黑將往旁邊躲。我再走一步：俥直衝到底線，將軍！"],
    miss:[["zhe","這裡還過不去。先看它怎麼擋。"],["mei","換條能走的路，再試。"]]}};
/* 殘局解開儀式的字幕（一行 ≤16 字） */
const MNF_RITE_TXT={hand:"說書人的手，慢慢移開。",glow:"刻痕，亮回一小段。",line:"補上一行。",rule:"解開一盤，刻痕亮一段。",old:"這一行，早已補上。",demo:"這一行，還空著。",demo2:"下次，自己補上它。"};
const MNF={on:false,au:null,mus:"",u:{},cur:null};
/* ---------- 純計算（自動測試 xiangqi-lab/tools/test-mainquest.js 用 vm 跑）---------- */
const mnfLen=s=>[...String(s||"")].length;
/* 檢查一段電影資料：回傳問題清單（空＝沒問題） */
function mnfCheck(F,id){const P=[],N=id||"?";if(!F||!Array.isArray(F.shots)||!F.shots.length)return[N+"：沒有鏡頭"];if(!(F.end>0))P.push(N+"：沒有 end");
  if(!F.card||!F.card.t||!F.card.b)P.push(N+"：沒有跳過後的任務卡");
  F.shots.forEach((S,i)=>{const nx=i+1<F.shots.length?F.shots[i+1].at:F.end;if(!(S.at>=0)||S.at>=nx)P.push(`${N} 第 ${i+1} 個鏡頭的時間不對`);
    if(!MNF_IMG[S.img])P.push(`${N} 第 ${i+1} 個鏡頭沒有圖 ${S.img}`);if(S.fx&&!MNF_FX.includes(S.fx))P.push(`${N} 第 ${i+1} 個鏡頭的 fx 不認得：${S.fx}`);
    if(S.kb&&!(S.kb.length===2&&S.kb.every(a=>a.length===3&&a[0]>=1)))P.push(`${N} 第 ${i+1} 個鏡頭的 kb 格式不對`);
    let last=-9;for(const[t,s]of S.say||[]){const n=mnfLen(s);if(n<4||n>16)P.push(`${N} 字幕「${s}」${n} 字（要 ≤16）`);if(/\n/.test(s))P.push(`${N} 字幕「${s}」換行了`);if(t<S.at||t>=nx)P.push(`${N} 字幕「${s}」不在鏡頭時間內`);if(t-last<2)P.push(`${N} 字幕「${s}」跟前一句不到 2 秒`);last=t}
    for(const[t,k]of S.sfx||[]){if(!MNF_SFX.includes(k))P.push(`${N} 音效不認得：${k}`);if(t<S.at||t>=nx)P.push(`${N} 音效 ${k} 不在鏡頭時間內`)}
    if(S.qte&&!MNF_QTE[S.qte])P.push(`${N} 危機題不存在：${S.qte}`);if(S.tr!=null&&!(S.tr>=0&&S.tr<=2))P.push(`${N} 第 ${i+1} 個鏡頭的 tr（溶接秒數）要 0～2`);
    if(S.bq&&!(Array.isArray(S.bq)&&S.bq.length===4&&S.bq.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))))P.push(`${N} 第 ${i+1} 個鏡頭的 bq 要四個 [x,y]`);
    const inT=t=>Number.isFinite(t)&&t>=S.at&&t<nx;
    for(const[t,k]of S.shk||[])if(!inT(t)||!(k>0&&k<=20))P.push(`${N} 第 ${i+1} 個鏡頭的 shk 要 [鏡頭內的秒, 1～20]`);
    for(const[t,v,d]of S.duck||[])if(!inT(t)||!(v>=0&&v<=1)||!(d>=0))P.push(`${N} 第 ${i+1} 個鏡頭的 duck 要 [鏡頭內的秒, 音量 0～1, 淡變秒]`);
    if(S.tint&&!(Array.isArray(S.tint)&&S.tint.length===2&&S.tint.every(k=>k in MNF_TINT)))P.push(`${N} 第 ${i+1} 個鏡頭的 tint 要 [起, 迄]（MNF_TINT 的代號）`);
    if(S.flash!=null&&!inT(S.flash))P.push(`${N} 第 ${i+1} 個鏡頭的 flash 不在鏡頭時間內`)});
  return P}
/* 星線棋盤貼到圖上（鏡頭的 bq）：q＝棋盤四角的螢幕座標 [第1路第1排, 第9路第1排, 第9路第10排, 第1路第10排]；
   算單位正方形→四邊形的投影（Heckbert），再接上「元素像素 → 單位座標」（bhxBoardSvg 的 viewBox 從 -1 起、線在 0～80、0～90，元素設成 82×92px），回傳 CSS matrix3d（transform-origin 要 0 0） */
function mnfQuadM(q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,sx=x0-x1+x2-x3,sy=y0-y1+y2-y3;let a=x1-x0,b=x3-x0,d=y1-y0,e=y3-y0,g=0,h=0;
  if(Math.abs(sx)>1e-9||Math.abs(sy)>1e-9){const dx1=x1-x2,dx2=x3-x2,dy1=y1-y2,dy2=y3-y2,den=dx1*dy2-dx2*dy1;g=(sx*dy2-dx2*sy)/den;h=(dx1*sy-sx*dy1)/den;a+=g*x1;b+=h*x3;d+=g*y1;e+=h*y3}
  const u=1/80,v=1/90,N=[a*u,b*v,x0-a*u-b*v,d*u,e*v,y0-d*u-e*v,g*u,h*v,1-g*u-h*v];
  return`matrix3d(${[N[0],N[3],0,N[6],N[1],N[4],0,N[7],0,0,1,0,N[2],N[5],0,N[8]].map(x=>+x.toPrecision(8)).join(",")})`}
/* 一段電影有幾秒是看的、有沒有危機題（主線解題比例用） */
const mnfQteIn=F=>(F&&F.shots||[]).filter(S=>S.qte).map(S=>S.qte);
/* 殘局解開儀式的進度：殘譜行數＝刻痕段數＝千秋殘局（store "shipSolved"）13 站解開的題數，每站最多 per 題（07f SHIP_PER） */
function mnfRiteCount(A,route,per){A=A||{};route=route||[];per=per||3;let n=0;for(const k of route)n+=Math.min(per,Object.keys(A[k]||{}).length);return{n,all:route.length*per}}
/* 這一站的殘譜頁：per 行，照題目順序（L＝這一站的題號；不知道就照解開的先後）；回傳 [{id,on}] */
function mnfRiteRows(A,k,L,per){const E=(A||{})[k]||{},ids=L&&L.length?L.slice(0,per):Object.keys(E).sort((a,b)=>((E[a]&&E[a].at)||+E[a]||0)-((E[b]&&E[b].at)||+E[b]||0)).slice(0,per);
  const R=ids.map(id=>({id,on:!!E[id]}));while(R.length<per)R.push({id:"",on:false});return R}
/* 危機題判對錯（照殘局頁：對方一步都不能走＝解開；或跟題目的著法一樣也算對）；C＝XQCore */
function mnfQteJudge(C,b,side,f,t,want){const nb=C.make(b,f,t),o=C.opp(side),dead=!C.legal(nb,o).length;return{nb,win:dead,ok:dead||(want&&C.iccs(f,t)===want),mate:dead&&C.inCheck(nb,o)}}
/* ---------- 樣式 ---------- */
function mnfCss(){if(document.getElementById("mnfCss"))return;const s=document.createElement("style");s.id="mnfCss";s.textContent=`
#mnfPg{position:fixed;inset:0;z-index:9100;background:#05060d;color:#f6efe0;overflow:hidden;opacity:0;transition:opacity .5s;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#mnfPg.on{opacity:1}
#mnfBk{display:none;position:fixed;inset:-40px;z-index:9099;background:#05060d center/cover no-repeat;filter:blur(18px) brightness(.42);opacity:0;transition:opacity .5s;pointer-events:none}
#mnfBk.on{opacity:1}
#mnfBk i{position:absolute;inset:0;background:center/cover no-repeat;opacity:0;transition:opacity .9s ease-in-out}#mnfBk i.on{opacity:1}
@media (min-aspect-ratio:4/5){#mnfPg,html #mnfRite{left:50%;right:auto;width:min(100vw,max(calc(100vh*.62),360px));transform:translateX(-50%);box-shadow:0 0 60px rgba(0,0,0,.7)}#mnfBk{display:block}}
#mnfPg .mnf-st{position:absolute;inset:0;will-change:transform,opacity;transition:filter .6s}
#mnfPg .mnf-st .gone{opacity:0!important;transition:opacity .5s!important}
#mnfPg .mnf-st.shk{animation:mnfShk2 .4s ease-out}
@keyframes mnfShk2{15%{translate:calc(var(--shk,6px)*-1) calc(var(--shk,6px)*.3)}35%{translate:var(--shk,6px) calc(var(--shk,6px)*-.4)}55%{translate:calc(var(--shk,6px)*-.6) 0}75%{translate:calc(var(--shk,6px)*.3) 0}}
#mnfPg .mnf-fl{position:absolute;inset:0;z-index:4;background:#fffaf0;opacity:0;pointer-events:none;animation:mnfFl .45s ease-out forwards}
@keyframes mnfFl{15%{opacity:.85}100%{opacity:0}}
#mnfPg .mnf-bg{position:absolute;inset:0;background:#05060d center/cover no-repeat;transition:opacity .7s}
#mnfPg .mnf-st.frz{filter:grayscale(.55) brightness(.62) contrast(1.05)}
#mnfPg .mnf-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
#mnfPg .mnf-lb{position:absolute;left:0;right:0;height:7vh;z-index:3;pointer-events:none}
#mnfPg .mnf-lb.t{top:0;background:linear-gradient(#000,rgba(0,0,0,0))}#mnfPg .mnf-lb.b{bottom:0;background:linear-gradient(rgba(0,0,0,0),#000)}
#mnfPg .mnf-sub{position:absolute;left:0;right:0;bottom:calc(9vh + env(safe-area-inset-bottom,0px));z-index:5;text-align:center;white-space:nowrap;font:700 var(--mnfs,26px)/1.4 var(--serif,serif);letter-spacing:.1em;color:#fff7e6;padding:.32em 0;background:linear-gradient(90deg,rgba(6,6,14,0),rgba(6,6,14,.74) 16%,rgba(6,6,14,.74) 84%,rgba(6,6,14,0));text-shadow:0 0 2px #000,0 0 2px #000,0 0 4px #000,0 2px 10px #000;opacity:0;transform:translateY(8px);transition:opacity .4s,transform .6s;pointer-events:none}
#mnfPg .mnf-sub.on{opacity:1;transform:none;transition:opacity .7s,transform .7s}
#mnfPg .mnf-big{position:absolute;left:0;right:0;top:calc(13vh + env(safe-area-inset-top,0px));z-index:6;text-align:center;white-space:nowrap;font:900 clamp(40px,calc(var(--mnfw,100vw)*.14),76px)/1 var(--serif,serif);letter-spacing:.2em;color:#ffe6a8;text-shadow:0 0 3px #2a1400,0 0 3px #2a1400,0 0 6px #000,0 0 24px rgba(255,190,90,.75),0 4px 14px #000;opacity:0;transform:scale(1.5);transition:opacity .35s,transform .45s cubic-bezier(.2,1.4,.4,1);pointer-events:none}
#mnfPg .mnf-big.on{opacity:1;transform:none}
#mnfPg .mnf-who{position:absolute;bottom:calc(17vh + env(safe-area-inset-bottom,0px));height:min(30vh,240px);aspect-ratio:3/4;z-index:4;background:center bottom/contain no-repeat;filter:drop-shadow(0 6px 14px rgba(0,0,0,.6));opacity:0;transition:opacity .6s,transform .7s cubic-bezier(.2,1,.3,1);pointer-events:none}
#mnfPg .mnf-who.l{left:3%;transform:translateX(-40%)}#mnfPg .mnf-who.r{right:3%;transform:translateX(40%)}#mnfPg .mnf-who.on{opacity:1;transform:none;animation:mnfBob 2.6s ease-in-out .7s infinite}
@keyframes mnfBob{50%{translate:0 -6px}}
#mnfPg .mnf-k{position:absolute;right:14px;top:calc(12px + env(safe-area-inset-top,0px));z-index:8;min-width:72px;min-height:44px;padding:10px 18px;border-radius:99px;font:700 16px var(--serif,serif);color:#f2e4c4;background:rgba(0,0,0,.45);border:1px solid rgba(232,199,122,.6)}
#mnfPg .mnf-k:focus-visible,#mnfPg .mnf-card button:focus-visible,#mnfPg .mnf-demo:focus-visible{outline:3px solid #E8C77A;outline-offset:3px}
#mnfPg.qt .mnf-k{display:none}
#mnfPg .bx-bd{position:absolute;left:50%;transform:translate(-50%,-50%);pointer-events:none}
#mnfPg .bx-bd line,#mnfPg .bx-bd polyline{fill:none;stroke:rgba(236,204,128,.7);stroke-width:.34;stroke-dasharray:100;stroke-dashoffset:100;animation:mnfLn 2.2s ease-out forwards}
@keyframes mnfLn{to{stroke-dashoffset:0}}
#mnfPg .bx-bd.q{left:0;top:0;width:82px;height:92px;transform-origin:0 0;filter:drop-shadow(0 0 1.5px rgba(255,214,120,.85))}
#mnfPg .bx-bd.q line,#mnfPg .bx-bd.q polyline{stroke:rgba(178,120,36,.92);stroke-width:.62}
#mnfPg .mnf-seal{position:absolute;z-index:1;transform:translate(-50%,-50%) scale(2.6) rotate(-14deg);opacity:0;width:min(34vw,150px);aspect-ratio:1;border:6px solid #b3261e;border-radius:10px;color:#b3261e;background:rgba(246,236,214,.55);display:flex;align-items:center;justify-content:center;font:900 min(10vw,44px)/1.05 var(--serif,serif);text-align:center;box-shadow:0 0 30px rgba(255,200,120,.6)}
#mnfPg .mnf-seal.on{animation:mnfStamp .55s ease forwards}
@keyframes mnfStamp{60%{opacity:1;transform:translate(-50%,-50%) scale(.92) rotate(-7deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-6deg)}}
#mnfPg .mnf-q{position:absolute;left:50%;top:52%;z-index:7;width:min(94vw,56vh);transform:translate(-50%,-50%);perspective:900px}
#mnfPg .mnf-qi{background:linear-gradient(#e9dcbc,#d8c59a);border:3px solid #8a5a2b;border-radius:14px;padding:8px;box-shadow:0 0 0 2px rgba(255,230,160,.5),0 20px 50px rgba(0,0,0,.7);transform-origin:50% 100%;transform:translateY(42vh) rotateX(55deg) scale(.55);opacity:0;transition:transform .9s cubic-bezier(.2,1,.3,1),opacity .6s}
#mnfPg .mnf-q.on .mnf-qi{transform:none;opacity:1}
#mnfPg .mnf-qi svg{display:block;width:100%;height:auto;touch-action:none}
#mnfPg .mnf-qs{margin:8px 0 0;text-align:center;font:800 19px/1.35 var(--serif,serif);color:#3b2a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mnfPg .mnf-qh{margin:4px 0 0;text-align:center;font:800 18px/1.35 var(--serif,serif);color:#1f5fae;white-space:normal;text-wrap:balance;min-height:0}
#mnfPg .mnf-qh.w{color:#9a2a1e}
#mnfPg .mnf-demo{display:block;margin:8px auto 2px;min-height:48px;padding:10px 24px;border-radius:99px;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font:900 19px var(--serif,serif)}
#mnfPg .mnf-qw{position:relative}
#mnfPg .mnf-tg{fill:rgba(255,222,120,.55);stroke:#fff3c4;stroke-width:3;pointer-events:none;transform-box:fill-box;transform-origin:center;animation:mnfTg 1.1s ease-in-out infinite}
@keyframes mnfTg{50%{fill:rgba(255,200,80,.85);transform:scale(1.18)}}
#mnfPg .mnf-qw.rew{animation:mnfRew .5s ease}
@keyframes mnfRew{0%{filter:none;transform:none}40%{filter:sepia(.9) blur(2px) brightness(.7);transform:translateX(-10px) skewX(-4deg)}100%{filter:none;transform:none}}
#mnfPg .mnf-qw.shk{animation:mnfShk .35s}
@keyframes mnfShk{25%{transform:translateX(-7px)}50%{transform:translateX(6px)}75%{transform:translateX(-4px)}}
#mnfPg .mnf-lit{position:absolute;width:30%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.2);border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fffbe8 0,rgba(255,226,140,.9) 22%,rgba(255,200,90,.35) 50%,rgba(255,200,90,0) 70%);opacity:0;animation:mnfLit 1.1s ease-out forwards}
@keyframes mnfLit{30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(3.2)}}
#mnfPg .mnf-q.done .mnf-qi{transition:transform .9s ease-in,opacity .9s,filter .9s;filter:brightness(2.2) saturate(.4);opacity:0;transform:scale(1.15)}
#mnfPg .mnf-card{position:absolute;inset:0;z-index:9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:24px;background:radial-gradient(circle at 50% 45%,rgba(40,24,10,.82),rgba(0,0,0,.94) 75%);opacity:0;transition:opacity .4s}
#mnfPg .mnf-card.on{opacity:1}
#mnfPg .mnf-card b{font:900 clamp(30px,9vw,48px)/1.25 var(--serif,serif);letter-spacing:.12em;color:#ffe6a8;text-align:center;text-shadow:0 0 18px rgba(255,190,90,.5)}
#mnfPg .mnf-card button{min-width:200px;min-height:56px;padding:12px 30px;border-radius:99px;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font:900 22px var(--serif,serif);letter-spacing:.1em}
#mnfPg .mnf-card button.g{min-height:48px;font-size:17px;background:rgba(0,0,0,.4);border-color:rgba(232,199,122,.6);color:#f2e4c4}
#mnfRite{position:fixed;inset:0;z-index:9150;background:#06070c;overflow:hidden;opacity:0;transition:opacity .8s ease-in-out;color:#f6efe0}
#mnfRite.on{opacity:1}
#mnfRite .rt-st{position:absolute;inset:0;transition:opacity .8s}
#mnfRite .rt-im{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
#mnfRite .rt-im img{display:block;position:absolute;left:0;top:0;width:100%;height:100%}#mnfRite .rt-im .rt-up{opacity:0;transition:opacity .9s ease}#mnfRite .rt-im .rt-up.on{opacity:1}
#mnfRite .rt-im{transition:filter .5s}#mnfRite .rt-im.mv{filter:blur(1.6px)}
#mnfRite .rt-dot{position:absolute;width:7%;aspect-ratio:3;transform:translate(-50%,-50%) rotate(-14deg);border-radius:50%;background:radial-gradient(closest-side,#c8ffe9,#3fcf9c 45%,rgba(40,170,130,.5) 72%,rgba(40,170,130,0));box-shadow:0 0 16px 5px rgba(60,200,160,.6);opacity:0;transition:opacity 1.2s}
#mnfRite .rt-dot.on{opacity:1;animation:mnfJade 1.8s ease-in-out 1.2s infinite}
@keyframes mnfJade{50%{filter:brightness(1.35)}}
#mnfRite .rt-bk{position:absolute;left:50%;top:44%;width:min(88%,400px);transform:translate(-50%,-50%) scale(.85);opacity:0;transition:opacity .8s,transform .9s cubic-bezier(.2,1,.3,1);perspective:1000px}
#mnfRite .rt-bk.on{opacity:1;transform:translate(-50%,-50%)}
#mnfRite .rt-pg{position:relative;padding:22px 22px 18px;border-radius:6px;background:linear-gradient(90deg,#d9c79e,#efe3c6 8%,#efe3c6 92%,#d9c79e);box-shadow:0 18px 50px rgba(0,0,0,.7),inset 0 0 40px rgba(120,80,30,.25);color:#2a1d12}
#mnfRite .rt-cv{position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#5a2a16,#7a3a1e);transform-origin:0 50%;transition:transform 1s ease-in-out;backface-visibility:hidden;display:flex;align-items:center;justify-content:center;font:900 26px var(--serif,serif);color:#e8c77a;letter-spacing:.3em;writing-mode:vertical-rl}
#mnfRite .rt-bk.op .rt-cv{transform:rotateY(-170deg)}
#mnfRite .rt-h{text-align:center;font:900 20px var(--serif,serif);letter-spacing:.2em;margin:0 0 10px;color:#5a2a16}
#mnfRite .rt-r{display:flex;align-items:center;gap:10px;min-height:46px;border-bottom:1px solid rgba(90,58,26,.35);font:800 22px/1.2 var(--serif,serif);letter-spacing:.12em;white-space:nowrap}
#mnfRite .rt-r i{font-style:normal;flex:none;width:1.4em;color:#8a5a2b;font-size:16px}
#mnfRite .rt-r .ink{opacity:.18}#mnfRite .rt-r.on .ink{opacity:.85}
#mnfRite .rt-r span.c{display:inline-block;opacity:0;filter:blur(3px);transform:scale(1.4);transition:opacity .35s,filter .45s,transform .35s}
#mnfRite .rt-r span.c.on{opacity:1;filter:none;transform:none}
#mnfRite .rt-r.nw{background:linear-gradient(90deg,rgba(110,214,176,0),rgba(110,214,176,.22),rgba(110,214,176,0))}
#mnfRite .rt-mk{display:flex;gap:2px;margin:12px 0 0;justify-content:center;flex-wrap:nowrap}
#mnfRite .rt-mk u{flex:1;max-width:8px;height:8px;border-radius:2px;background:rgba(90,58,26,.25)}
#mnfRite .rt-mk u.on{background:#4fae8c;box-shadow:0 0 5px rgba(79,174,140,.8)}#mnfRite .rt-mk u.nw{animation:mnfJade 1s ease-in-out infinite;background:#9ff2cf}
#mnfRite .rt-n{margin:8px 0 0;text-align:center;font:800 17px var(--serif,serif);color:#5a3a20;white-space:nowrap}
#mnfRite .mnf-sub{position:absolute;left:0;right:0;bottom:calc(9vh + env(safe-area-inset-bottom,0px));text-align:center;white-space:nowrap;font:700 var(--mnfs,26px)/1.4 var(--serif,serif);letter-spacing:.1em;color:#fff7e6;padding:.32em 0;background:linear-gradient(90deg,rgba(6,6,14,0),rgba(6,6,14,.74) 16%,rgba(6,6,14,.74) 84%,rgba(6,6,14,0));text-shadow:0 0 2px #000,0 0 2px #000,0 0 4px #000,0 2px 10px #000;opacity:0;transition:opacity .6s;pointer-events:none}
#mnfRite .mnf-sub.on{opacity:1}
#mnfRite .mnf-k{position:absolute;right:14px;top:calc(12px + env(safe-area-inset-top,0px));min-width:72px;min-height:44px;padding:10px 18px;border-radius:99px;font:700 16px var(--serif,serif);color:#f2e4c4;background:rgba(0,0,0,.45);border:1px solid rgba(232,199,122,.6)}
@media (prefers-reduced-motion:reduce){#mnfPg *,#mnfRite *{transition-duration:.01s!important;animation:none!important}}`;document.head.append(s)}
/* ---------- 聲音：配樂（自己一個 Audio，跟一般背景音樂分開）＋合成音效（沿用 01-board 的鐘、鼓、鑼和 07bh 的星光聲） ---------- */
function mnfMusOk(){try{return!!store.get("bgm",true)&&(typeof sxmGain!=="function"||sxmGain("bgm")>0)&&!(typeof sxmAllOff==="function"&&sxmAllOff())}catch(e){return true}}
function mnfLevel(){try{return Math.max(.05,Math.min(1,typeof sxmBgmVol==="function"?sxmBgmVol(sxmMix()):.5))}catch(e){return .5}}
function mnfBlob(rel){const u="data/bgm/"+rel;if(MNF.u[u])return Promise.resolve(MNF.u[u]);const base=typeof BGM_BASE!=="undefined"?BGM_BASE:"";
  return MNF.u[u]=fetch(base+u,base?{mode:"cors",credentials:"omit"}:undefined).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>MNF.u[u]=URL.createObjectURL(b)).catch(()=>{delete MNF.u[u];return null})}
function mnfMusic(rel,vol){if(!rel)return;try{if(typeof BGM!=="undefined"&&BGM.a)BGM.a.pause()}catch(e){}if(!mnfMusOk())return;
  if(!MNF.au){MNF.au=new Audio();MNF.au.loop=true;try{MNF.au.playsInline=true}catch(e){}}const a=MNF.au,v=(vol==null?1:vol)*mnfLevel();
  if(MNF.mus===rel&&!a.paused){mnfVol(vol==null?1:vol);return}const was=MNF.mus&&!a.paused&&a.volume>.02;MNF.mus=rel;
  const go=u=>{if(MNF.mus!==rel||!u)return;if(a.src!==u)a.src=u;a.volume=0;const p=a.play();if(p&&p.catch)p.catch(()=>{MNF.need=true});mnfVol(vol==null?1:vol,1.2)};
  /* 換曲（例如 c1m 接 c1e）：舊曲先 0.5 秒淡出再換，不要一刀切；從靜音開始（點選當下開配樂）照舊立刻播 */
  const sw=()=>{const c=MNF.u["data/bgm/"+rel];if(typeof c==="string")go(c);else mnfBlob(rel).then(go)};if(was){mnfVol(0,.5);setTimeout(sw,520)}else sw();return v}
function mnfVol(v,d){const a=MNF.au;if(!a)return;const to=Math.max(0,Math.min(1,v*mnfLevel())),from=a.volume,st=performance.now(),D=(d==null?.8:d)*1000;clearInterval(MNF.vt);
  MNF.vt=setInterval(()=>{const p=Math.min(1,(performance.now()-st)/Math.max(1,D));try{a.volume=from+(to-from)*p}catch(e){}if(p>=1)clearInterval(MNF.vt)},40)}
function mnfMusicStop(d){const a=MNF.au;MNF.mus="";if(!a){mnfBgmBack();return}mnfVol(0,d==null?1:d);setTimeout(()=>{if(!MNF.mus){try{a.pause()}catch(e){}mnfBgmBack()}},((d==null?1:d)+.1)*1000)}
function mnfBgmBack(){MNF.on=false;try{if(typeof bgmSync==="function")bgmSync()}catch(e){}}
function mnfSfx(k){if(typeof withAudio!=="function"||typeof AC==="undefined")return;try{if(typeof sndOn==="function"&&!sndOn())return}catch(e){}
  withAudio(()=>{const t=AC.currentTime+.02;
    if(k==="bell"&&typeof bellHit==="function"){bellHit(t,784);bellHit(t+.5,1175)}
    else if(k==="drum"&&typeof drumHit==="function")drumHit(t,.85,55);
    else if(k==="heart"&&typeof drumHit==="function"){drumHit(t,.55,46);drumHit(t+.22,.4,46)}
    else if(k==="gong"&&typeof gongHit==="function")gongHit(t,196,2.4,true);
    else if(k==="drip"&&typeof bellHit==="function")bellHit(t,1568);
    else if((k==="star"||k==="whoosh")&&typeof opSfx==="function")opSfx(k==="star"?"lines":"suck");
    else if(k==="hang"&&typeof drumHit==="function")drumHit(t,.75,40);
    else if(k==="crack"){for(let i=0;i<5;i++)mnfNoise(t+i*.028+Math.random()*.012,.05,"highpass",1700+i*260,.7,.5*(1-i*.14));if(typeof drumHit==="function")drumHit(t,.3,95)}
    else if(k==="whip"){mnfNoise(t,.1,"highpass",2600,.8,.75,.012);mnfNoise(t+.07,.05,"bandpass",3200,1.4,.6)}
    else if(k==="whipf"){mnfNoise(t,.14,"bandpass",1500,1.1,.22,.02);mnfNoise(t+.08,.06,"bandpass",1900,1.4,.16)}
    else if(k==="rain")mnfNoise(t,3.2,"lowpass",1500,.4,.16,.5)})}
/* 雜訊音效（木裂、鞭響、雨聲）：白雜訊 → 濾波 → 音量包絡（att 秒起音、到 dur 秒淡到無聲），接音效的音量匯流排 */
function mnfNoise(t,dur,type,f,Q,vol,att){const n=AC.createBufferSource(),len=Math.max(1,AC.sampleRate*dur|0),b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const fl=AC.createBiquadFilter(),g=AC.createGain(),a=att||.004;fl.type=type;fl.frequency.value=f;fl.Q.value=Q;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  n.buffer=b;n.connect(fl);fl.connect(g);g.connect(typeof sxmDst==="function"?sxmDst("piece"):AC.destination);n.start(t);n.stop(t+dur+.05)}
/* 電影、解題、儀式播放中（畫面上有 #mnfPg 而且不是任務卡、或有 #mnfRite）：別的 toast、修為通知（07-legend xpChip，例如解開千秋殘局 addXP 的「+35 修為」）先排隊，
   播完或跳到任務卡再照順序一則一則顯示（不丟掉、不疊在電影字幕上）；平常照舊直接顯示（開發者 11/13 看儀式截圖） */
const MNF_Q=[];let MNF_QT=0;
function mnfBusy(){try{const p=document.getElementById("mnfPg"),v=document.getElementById("mnvPg");return!!document.getElementById("mnfRite")||!!(p&&!p.querySelector(".mnf-card"))||!!(v&&!v.querySelector(".mnv-end"))}catch(e){return false}}
function mnfHold(fn,args,ms){MNF_Q.push([fn,args,ms]);mnfFlushSoon()}
function mnfFlushSoon(){if(MNF_QT)return;const step=()=>{MNF_QT=0;if(!MNF_Q.length)return;if(mnfBusy()){MNF_QT=setTimeout(step,400);return}const[fn,a,ms]=MNF_Q.shift();try{fn.apply(null,a)}catch(e){}if(MNF_Q.length)MNF_QT=setTimeout(step,ms)};MNF_QT=setTimeout(step,400)}
if(typeof toast==="function"){const f=toast;toast=function(m){if(mnfBusy()||MNF_Q.length)return mnfHold(f,[m],2400);return f.apply(this,arguments)}}
if(typeof xpChip==="function"){const f=xpChip;xpChip=function(t,big){if(mnfBusy()||MNF_Q.length)return mnfHold(f,[t,big],big?3400:1600);return f.apply(this,arguments)}}
/* bgmSync（01-board）：電影播的時候一般背景音樂暫停 */
if(typeof bgmSync==="function"){const f0=bgmSync;bgmSync=async function(){if(MNF.on){try{if(typeof BGM!=="undefined"&&BGM.a)BGM.a.pause()}catch(e){}return}return f0.apply(this,arguments)}}
if(typeof document!=="undefined"){document.addEventListener("visibilitychange",()=>{const a=MNF.au;if(!a||!MNF.mus)return;if(document.hidden){try{a.pause()}catch(e){}}else{const p=a.play();if(p&&p.catch)p.catch(()=>{MNF.need=true})}});
  for(const ev of["pointerdown","touchend"])document.addEventListener(ev,()=>{if(!MNF.need||!MNF.au||!MNF.mus)return;MNF.need=false;const p=MNF.au.play();if(p&&p.catch)p.catch(()=>{MNF.need=true})},{passive:true,capture:true})}
/* ---------- 角色立繪（第一版用 2D 立繪 data/xs/prev_<角色>.webp；3D 七星之後再接） ---------- */
function mnfWho(k){let me="";try{me=typeof myChar==="function"&&myChar()||""}catch(e){}if(k==="me")return me||"x_swordboy";if(k==="guide")return me==="x_swordboy"?"x_miaogirl":"x_swordboy";return k}
function mnfPre(id,set){const F=MNF_FILMS[id];if(!F)return;const ld=u=>{const im=new Image();im.decoding="async";im.src=u};for(const S of F.shots){const I=MNF_IMG[S.img];if(I)ld(I.u)}const RS=MNF_RITE_SET[set]||MNF_RITE_SET.c1;if(mnfQteIn(F).length){ld(MNF_IMG[RS.hand].u);ld(MNF_IMG[RS.up].u)}   /* 有危機題＝解開後要演儀式：兩張圖先載好，交叉淡入時才不會現抓 */if(F.mus&&mnfMusOk())mnfBlob(F.mus)}
/* ---------- 播放器 ---------- */
function mnfPlay(id,opt){opt=opt||{};const F=opt.film||MNF_FILMS[id];if(!F){if(opt.onDone)opt.onDone({skipped:true,missing:true});return null}mnfCss();
  let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  /* 上一段（keepMusic 接續）留著最後一格墊在下面，新的一段淡入後才拿掉：段落之間不會閃出首頁 */
  for(const x of[document.getElementById("mnfPg"),document.getElementById("mnfBk")])if(x){if(x.dataset.hand==="1"&&!rm){x.dataset.hand="0";setTimeout(()=>x.remove(),900)}else x.remove()}   /* 900ms 內同 id 兩個：新的在後面、疊在上面；樣式都靠 id，所以不改名 */
  /* 11/13 電腦寬螢幕：直幅圖原本被放大裁成一條、主體出鏡；寬螢幕時電影放在中間的直幅框（CSS min-aspect-ratio），兩側墊同一張圖的模糊暗底 */
  const bk=document.createElement("div");bk.id="mnfBk";bk.setAttribute("aria-hidden","true");document.body.append(bk);
  const o=document.createElement("div");o.id="mnfPg";o.setAttribute("role","dialog");o.setAttribute("aria-label",opt.label||"主線電影");
  o.innerHTML=`<div class="mnf-st"><div class="mnf-bg"></div></div><canvas class="mnf-fx" aria-hidden="true"></canvas><div class="mnf-lb t"></div><div class="mnf-lb b"></div><div class="mnf-who" aria-hidden="true"></div><div class="mnf-big" aria-hidden="true"></div><div class="mnf-sub" aria-live="polite"></div><button class="mnf-k" type="button">略過</button>`;
  document.body.append(o);requestAnimationFrame(()=>requestAnimationFrame(()=>{o.classList.add("on");bk.classList.add("on")}));MNF.on=true;
  let st=o.querySelector(".mnf-st"),bg=o.querySelector(".mnf-bg");const cv=o.querySelector(".mnf-fx"),g=cv.getContext("2d"),sub=o.querySelector(".mnf-sub"),who=o.querySelector(".mnf-who"),big=o.querySelector(".mnf-big");
  const low=(()=>{try{return(navigator.deviceMemory||4)<=3||(navigator.hardwareConcurrency||4)<=4}catch(e){return false}})(),dpr=low?1:Math.min(2,devicePixelRatio||1);
  let W=0,H=0;const fit=()=>{W=o.clientWidth||innerWidth;H=o.clientHeight||innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);g.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.max(8,...F.shots.flatMap(S=>(S.say||[]).map(([,t])=>mnfLen(t))));o.style.setProperty("--mnfw",W+"px");o.style.setProperty("--mnfs",Math.max(15,Math.min(28,Math.floor((W-36)/(n*1.12))))+"px")};fit();addEventListener("resize",fit);
  /* 時鐘：可暫停（解題、任務卡、切到背景） */
  let T0=performance.now(),PT=0;const PZ=new Set();const clock=()=>PZ.size?PT:(performance.now()-T0)/1000;
  const pause=r=>{if(!PZ.size)PT=(performance.now()-T0)/1000;PZ.add(r)},resume=r=>{if(!PZ.has(r))return;PZ.delete(r);if(!PZ.size)T0=performance.now()-PT*1000},seek=t=>{T0=performance.now()-t*1000;PT=t};
  const vis=()=>{if(document.hidden)pause("hid");else resume("hid")};document.addEventListener("visibilitychange",vis);
  if(F.mus)mnfMusic(F.mus,opt.vol==null?1:opt.vol);
  const cover=([ix,iy])=>{const s=Math.max(W/MNF_W,H/MNF_H);return[(W-MNF_W*s)/2+ix*s,(H-MNF_H*s)/2+iy*s]};let kbNow=[1,50,50];
  const onScr=pt=>{const[s,fx,fy]=kbNow,ox=W*fx/100,oy=H*fy/100;return[ox+(pt[0]-ox)*s,oy+(pt[1]-oy)*s]};
  let si=-1,S=null,fin=false,raf=0,fired={},qDone={},P=[],res={skipped:false,qte:{}};
  const add=(x,y,vx,vy,life,r,col,k)=>{if(P.length<(low?120:260))P.push({x,y,vx,vy,l:0,m:life,r,col,k})};
  const nextAt=i=>i+1<F.shots.length?F.shots[i+1].at:F.end;
  /* ---- 轉場（開發者 11/13「切換畫面不順」）----
     原本：切點直接換 backgroundImage（硬切）、運鏡用 ease-in-out（每鏡頭尾都停住、下一鏡又從零加速）、粒子全清掉、棋盤和印直接拿掉、字幕瞬間換字。
     現在：換圖＝兩層交叉溶接 MNF_XD 秒（鏡頭可用 tr 指定秒數，tr:0＝硬切）；舊層照切點前的速度繼續推（ez 兩端保留 65% 速度，可往外延伸），新層一進來就在動；
     同一張圖連著兩鏡＝不疊層，用 MNF_GL 秒把運鏡從舊路線滑到新路線；粒子淡出、新粒子淡入；棋盤、印跟著舊層淡掉；字幕先淡出再換字；兩側模糊底也交叉淡入。
     減少動態：一律硬切、不推拉。 */
  const ez=p=>p<=0?(1-MNF_EA)*p:p>=1?1+(1-MNF_EA)*(p-1):(1-MNF_EA)*p+MNF_EA*(p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2);
  const kbAt=(j,t)=>{const Z=F.shots[j];if(rm||!Z||!Z.kb)return[1,50,50];const[A,B]=Z.kb,e=ez((t-Z.at)/Math.max(.1,nextAt(j)-Z.at));return[0,1,2].map(k=>A[k]+(B[k]-A[k])*e)};
  const kbSet=(el,k)=>{const s=Math.max(1,k[0]),x=Math.max(0,Math.min(100,k[1])),y=Math.max(0,Math.min(100,k[2]));el.style.transformOrigin=`${x}% ${y}%`;el.style.transform=`scale(${s})`;return[s,x,y]};
  const fade=e=>{e.classList.add("gone");setTimeout(()=>e.remove(),560)};
  let XO=null,GL=null,subT=0,subOff=0;
  const setShot=i=>{const pi=si,prev=S;si=i;S=F.shots[i];fired={};const I=MNF_IMG[S.img],u=I?`url(${I.u})`:"none",same=!!prev&&prev.img===S.img,D=rm||!prev?0:S.tr!=null?S.tr:MNF_XD;
    if(prev&&!same&&D>0){if(XO)XO.el.remove();const old=st;XO={el:old,j:pi};st=document.createElement("div");st.className="mnf-st";st.innerHTML=`<div class="mnf-bg"></div>`;bg=st.firstChild;
      st.style.opacity="0";o.insertBefore(st,cv);void st.offsetWidth;st.style.transition=`opacity ${D}s ease-in-out,filter .6s`;st.style.opacity="1";
      setTimeout(()=>{old.remove();if(XO&&XO.el===old)XO=null},D*1000+80)}
    else st.querySelectorAll(".bx-bd,.mnf-seal").forEach(same?fade:e=>e.remove());
    GL=prev&&same&&!rm?{j:pi,d:Math.min(MNF_GL,Math.max(.2,nextAt(i)-S.at))}:null;
    bg.style.backgroundImage=u;st.classList.toggle("frz",S.fx==="frz");
    if(S.tint){const[a,z]=S.tint,dur=Math.max(.1,nextAt(i)-S.at);bg.style.transition="none";bg.style.filter=MNF_TINT[a]||"none";void bg.offsetWidth;bg.style.transition=rm?"none":`filter ${dur}s linear,opacity .7s`;bg.style.filter=MNF_TINT[z]||"none"}   /* 鏡頭內濾鏡慢慢變（壓暗轉紅、閃回去色）；同一張圖的下一鏡沒寫 tint 就維持 */
    if(!same){const b=document.createElement("i");b.style.backgroundImage=u;bk.append(b);const ob=[...bk.children].slice(0,-1);requestAnimationFrame(()=>b.classList.add("on"));setTimeout(()=>ob.forEach(x=>x.remove()),(D||0)*1000+950)}
    const keepM=S.fx==="mist"||S.fx==="frz";for(const q of P)if(!q.o&&!(keepM&&q.k==="m"))q.o=rm?1:28;
    subHide();if(!(S.who||[]).length){who.classList.remove("on")}if(!S.big)big.classList.remove("on")};
  const subHide=()=>{clearTimeout(subT);if(sub.classList.contains("on")){sub.classList.remove("on");subOff=performance.now()}};
  const subSet=tx=>{subHide();const w=rm?0:Math.max(0,420-(performance.now()-subOff)),show=()=>{sub.textContent=tx;void sub.offsetWidth;sub.classList.add("on")};if(w>20)subT=setTimeout(show,w);else show()};
  /* 段落結束：要接下一段（keepMusic）就不淡出，最後一格留著墊底，由下一段 mnfPlay 淡入後拿掉；1.5 秒內沒有下一段才自己淡出 */
  const finish=sk=>{if(fin)return;fin=true;cancelAnimationFrame(raf);clearTimeout(subT);removeEventListener("resize",fit);document.removeEventListener("visibilitychange",vis);res.skipped=!!sk;
    if(opt.keepMusic&&!rm){o.dataset.hand=bk.dataset.hand="1";setTimeout(()=>{if(o.dataset.hand==="1"&&o.isConnected){o.classList.remove("on");bk.classList.remove("on");setTimeout(()=>{o.remove();bk.remove()},520)}},1500);if(opt.onDone)setTimeout(()=>opt.onDone(res),0);return}
    if(!opt.keepMusic)mnfMusicStop(.8);o.classList.remove("on");bk.classList.remove("on");setTimeout(()=>{o.remove();bk.remove()},520);if(opt.onDone)setTimeout(()=>opt.onDone(res),300)};
  /* 跳過：還有沒解的危機題＝先出任務卡、再直接跳到解題（解題不能跳）；沒有＝任務卡 → 結束 */
  const card=(c,go)=>{pause("card");const d=document.createElement("div");d.className="mnf-card";d.setAttribute("role","dialog");d.setAttribute("aria-label",c.t);
    d.innerHTML=`<b>${esc(c.t)}</b><button type="button">${esc(c.b||"出發")}</button>${c.g?`<button type="button" class="g">${esc(c.g)}</button>`:""}`;o.append(d);requestAnimationFrame(()=>d.classList.add("on"));
    const[b1,b2]=d.querySelectorAll("button");try{b1.focus({preventScroll:true})}catch(e){}
    b1.onclick=e=>{e.stopPropagation();if(typeof vibrate==="function")vibrate(8);d.remove();resume("card");go(1)};if(b2)b2.onclick=e=>{e.stopPropagation();d.remove();resume("card");go(2)}};
  const skip=()=>{if(fin||o.classList.contains("qt")||o.querySelector(".mnf-card"))return;if(typeof vibrate==="function")vibrate(5);const t=clock(),Q=F.shots.find(x=>x.qte&&!qDone[x.at]&&x.at>=t-.01);
    if(Q){card({t:(MNF_QTE[Q.qte]||{}).big||F.card.t,b:"出發"},()=>{seek(Q.at);});return}
    const c=(typeof opt.card==="function"?opt.card(F):opt.card)||F.card;card(c,k=>{res.card=k;finish(true)})};
  o.querySelector(".mnf-k").onclick=e=>{e.stopPropagation();skip()};
  const qte=Q=>{pause("qte");o.classList.add("qt");const PZL=(opt.qte&&opt.qte[Q.qte])||MNF_QTE[Q.qte];if(opt.vol!==0)mnfVol(.4,.6);
    mnfQte(o,PZL,r=>{qDone[Q.at]=1;res.qte[Q.qte]=r;o.classList.remove("qt");big.classList.remove("on");st.classList.remove("frz");if(opt.vol!==0)mnfVol(1,1.2);
      const go=()=>{seek(Q.at+.06);resume("qte")};if(typeof opt.onQte==="function"){try{opt.onQte(Q.qte,r,go)}catch(e){go()}}else go()})};
  const frame=()=>{if(fin)return;const t=clock();let i=F.shots.length-1;while(i>0&&F.shots[i].at>t)i--;if(i!==si)setShot(i);
    if(S.qte&&!qDone[S.at]&&!fired.q){fired.q=1;if(S.big==null){big.textContent=((opt.qte&&opt.qte[S.qte])||MNF_QTE[S.qte]||{}).big||"";big.classList.add("on")}mnfSfx("gong");qte(S)}
    if(t>=F.end){finish(false);return}
    let k=kbAt(si,Math.min(t,F.end));if(GL&&t<S.at+GL.d){const q=Math.max(0,(t-S.at)/GL.d),w=q*q*(3-2*q),k0=kbAt(GL.j,t);k=k.map((v,j)=>k0[j]+(v-k0[j])*w)}else GL=null;   /* 同圖兩鏡：從舊路線滑到新路線 */
    kbNow=kbSet(st,k);if(XO)kbSet(XO.el,kbAt(XO.j,t));   /* 溶接中的舊層照原本的速度繼續推 */
    for(const[ts,k]of S.sfx||[])if(t>=ts&&!fired["s"+ts+k]){fired["s"+ts+k]=1;if(t<ts+1)mnfSfx(k)}
    for(const[ts,k]of S.shk||[])if(t>=ts&&!fired["k"+ts]){fired["k"+ts]=1;if(!rm&&t<ts+.5){st.style.setProperty("--shk",k+"px");st.classList.remove("shk");void st.offsetWidth;st.classList.add("shk");const s0=st;setTimeout(()=>s0.classList.remove("shk"),450)}}   /* 震一下（木裂、鞭響、車要倒） */
    for(const[ts,v,d]of S.duck||[])if(t>=ts&&!fired["d"+ts]){fired["d"+ts]=1;if(opt.vol!==0)mnfVol(v*(opt.vol==null?1:opt.vol),d)}   /* 配樂音量（閃回壓到幾乎靜默、回到現在一下子全開） */
    if(S.flash!=null&&t>=S.flash&&!fired.fl){fired.fl=1;if(!rm&&t<S.flash+.4){const f=document.createElement("div");f.className="mnf-fl";o.insertBefore(f,cv);setTimeout(()=>f.remove(),520)}}   /* 白閃（快溶進出閃回） */
    {let cur=null;for(const x of S.say||[])if(t>=x[0])cur=x;if(cur&&fired.say!==cur[0]){fired.say=cur[0];subSet(cur[1])}}
    for(const[ts,k,sd]of S.who||[])if(t>=ts&&!fired["w"+ts]){fired["w"+ts]=1;const wu=`url(data/xs/prev_${mnfWho(k)}.webp)`,wc="mnf-who "+(sd||"l");if(who.classList.contains("on")&&who.dataset.u===wu&&who.className.startsWith(wc))continue;   /* 同一個人、同一邊已經在畫面上：不重新進場 */
      who.className=wc;who.style.backgroundImage=wu;who.dataset.u=wu;void who.offsetWidth;who.classList.add("on")}
    if(S.big&&t>=S.big[0]&&!fired.big){fired.big=1;big.textContent=S.big[1];big.classList.add("on")}
    if(S.board!=null&&t>=S.board&&!fired.bd&&typeof bhxBoardSvg==="function"){fired.bd=1;st.insertAdjacentHTML("beforeend",bhxBoardSvg());const B=st.lastElementChild&&st.lastElementChild.classList.contains("bx-bd")?st.lastElementChild:null,cs=Math.max(W/MNF_W,H/MNF_H);if(B&&S.bq){B.classList.add("q");B.style.transform=mnfQuadM(S.bq.map(cover))}else if(B){B.style.top=cover([0,S.bp?S.bp[0]:819])[1]+"px";B.style.width=(S.bp?S.bp[1]:480)*cs+"px"}}
    if(S.seal&&t>=S.seal[0]&&!fired.seal){fired.seal=1;const d=document.createElement("div");d.className="mnf-seal";const c=cover(S.src||[384,720]);d.style.left=c[0]+"px";d.style.top=c[1]+"px";d.innerHTML=esc(S.seal[1])+"<br>之印";st.append(d);requestAnimationFrame(()=>d.classList.add("on"))}
    g.clearRect(0,0,W,H);if(!rm)mnfFx(g,S,t,W,H,P,add,onScr,cover,fired);
    raf=requestAnimationFrame(frame)};
  setShot(0);raf=requestAnimationFrame(frame);MNF.cur={finish,skip,clock};return MNF.cur}
/* 粒子：每格依鏡頭 fx 生、畫 */
function mnfFx(g,S,t,W,H,P,add,onScr,cover,fired){const src=onScr(cover(S.src||[384,688])),R=Math.random,fx=S.fx;
  if(fx==="mist"||fx==="frz"){if(R()<.08)add(-120,H*(.2+R()*.7),.25+R()*.35,0,600,60+R()*90,"245,240,230","m")}
  if(fx==="glow"&&R()<.7)add(src[0]+(R()-.5)*60,src[1]+(R()-.5)*20,(R()-.5)*.4,-.5-R()*1.1,90+R()*60,.8+R()*1.6,"255,214,120");
  if(fx==="stars"&&R()<.5)add(R()*W,R()*H*.7,0,.05,120+R()*80,.5+R()*1.3,"210,228,255","t");
  if(fx==="whirl")for(let k=0;k<2;k++){const a=R()*6.283,r=Math.max(W,H)*.6;add(src[0]+Math.cos(a)*r,src[1]+Math.sin(a)*r*.6,0,0,140,.8+R()*1.6,R()<.5?"170,130,255":"200,225,255","w")}
  if(fx==="river"&&R()<.8)add(src[0]+(R()-.5)*W*.5,H+8,(R()-.5)*.4,-1.2-R()*1.6,H/1.6,.6+R()*1.4,"200,232,255");
  if(fx==="ink"&&R()<.06)add(src[0]+(R()-.5)*W*.6,src[1]+(R()-.5)*H*.18,0,0,110,4,"10,10,16","i");
  if(fx==="dust"&&R()<.22)add(src[0]+(R()-.5)*W*.55,src[1]+(R()-.5)*30,(R()-.5)*.5,-.12-R()*.3,130+R()*80,16+R()*28,"205,168,112","d");   /* 塵土：貼地騰起、慢慢散 */
  if(fx==="rain")for(let k=0;k<3;k++)add(R()*W*1.25-W*.05,-20-R()*40,-2.4,15+R()*6,90,1,"205,218,236","r");   /* 斜雨線 */
  if(fx==="burst"&&!fired.bu){fired.bu=1;for(let k=0;k<110;k++){const a=R()*6.283,v=1+R()*6;add(src[0],src[1],Math.cos(a)*v,Math.sin(a)*v,50+R()*50,1+R()*2.4,R()<.5?"255,236,170":"190,240,220")}}
  g.globalCompositeOperation="lighter";
  if(fx==="gates"){const n=Math.min(13,Math.floor((t-S.at)/.2)+1);for(let i=0;i<n;i++){const a=Math.PI*(.08+.84*i/12),x=W/2-Math.cos(a)*W*.44,y=H*.3-Math.sin(a)*H*.15,tw=.75+.25*Math.sin(t*3+i),rr=7+2*tw,gr=g.createRadialGradient(x,y,0,x,y,rr*2);
      gr.addColorStop(0,`rgba(255,246,214,${.9*tw})`);gr.addColorStop(.35,`rgba(255,214,120,${.45*tw})`);gr.addColorStop(1,"rgba(255,214,120,0)");g.fillStyle=gr;g.fillRect(x-rr*2,y-rr*2,rr*4,rr*4);   /* 一道星門＝金色光暈＋亮心＋一圈門框 */
      g.fillStyle=`rgba(255,252,236,${tw})`;g.beginPath();g.arc(x,y,2.4,0,6.2832);g.fill();g.strokeStyle=`rgba(255,226,150,${.7*tw})`;g.lineWidth=1.2;g.beginPath();g.arc(x,y,rr*.9,Math.PI,0);g.lineTo(x+rr*.9,y+rr*.9);g.moveTo(x-rr*.9,y);g.lineTo(x-rr*.9,y+rr*.9);g.stroke()}}
  for(let j=P.length-1;j>=0;j--){const q=P[j];q.l++;if(q.o&&--q.o<=0){P.splice(j,1);continue}   /* q.o＝換鏡頭後的淡出倒數（格），不再一刀清空 */
    if(q.k==="w"&&!q.o){const dx=src[0]-q.x,dy=src[1]-q.y,d=Math.hypot(dx,dy)||1;q.vx=q.vx*.95+(dx/d)*.7+(-dy/d)*1;q.vy=q.vy*.95+(dy/d)*.7+(dx/d)*1;if(d<10)q.l=q.m}
    q.x+=q.vx;q.y+=q.vy;const al=q.k==="r"?(q.o?q.o/28:1):Math.max(0,1-q.l/q.m)*Math.min(1,q.l/10)*(q.o?q.o/28:1);if(al<=0||q.x>W+200||q.y<-40&&q.k!=="r"||q.y>H+40||q.l>q.m){P.splice(j,1);continue}
    if(q.k==="r"){g.globalCompositeOperation="source-over";g.strokeStyle=`rgba(${q.col},${.42*al})`;g.lineWidth=1.1;g.beginPath();g.moveTo(q.x,q.y);g.lineTo(q.x-q.vx*1.8,q.y-q.vy*1.8);g.stroke();g.globalCompositeOperation="lighter";continue}
    if(q.k==="d"){g.globalCompositeOperation="source-over";const gr=g.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r+q.l*.15);gr.addColorStop(0,`rgba(${q.col},${.2*al})`);gr.addColorStop(1,`rgba(${q.col},0)`);g.fillStyle=gr;g.fillRect(q.x-q.r-q.l*.15,q.y-q.r-q.l*.15,(q.r+q.l*.15)*2,(q.r+q.l*.15)*2);g.globalCompositeOperation="lighter";continue}
    if(q.k==="m"){g.globalCompositeOperation="source-over";const gr=g.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r);gr.addColorStop(0,`rgba(${q.col},${.16*Math.min(1,q.l/60)*al})`);gr.addColorStop(1,`rgba(${q.col},0)`);g.fillStyle=gr;g.fillRect(q.x-q.r,q.y-q.r,q.r*2,q.r*2);g.globalCompositeOperation="lighter";continue}
    if(q.k==="i"){g.globalCompositeOperation="source-over";const rr=q.r+q.l*.5;g.fillStyle=`rgba(${q.col},${.32*al})`;g.beginPath();g.arc(q.x,q.y,rr,0,6.2832);g.fill();g.globalCompositeOperation="lighter";continue}
    const tw=q.k==="t"?.5+.5*Math.sin(q.l*.15+q.x):1;g.fillStyle=`rgba(${q.col},${al*.9*tw})`;g.beginPath();g.arc(q.x,q.y,q.r,0,6.2832);g.fill()}
  g.globalCompositeOperation="source-over"}
/* ---------- 危機解題（QTE）：P＝{fen,side,line:[著法…],big,say,hint,presel}；done({mist,hint,demo,cn}) ---------- */
function mnfQte(host,P,done){const C=typeof window!=="undefined"&&window.XQCore;
  if(!C||!P||typeof Board!=="function"){setTimeout(()=>done({mist:0,hint:false,demo:true,cn:"",skip:1}),600);return}
  const w=document.createElement("div");w.className="mnf-q";w.innerHTML=`<div class="mnf-qi"><div class="mnf-qw"></div><p class="mnf-qs">${esc(P.say||"")}</p><p class="mnf-qh" aria-live="polite"></p><div class="mnf-qd"></div></div>`;host.append(w);
  const wrap=w.querySelector(".mnf-qw"),hintE=w.querySelector(".mnf-qh"),dE=w.querySelector(".mnf-qd");
  const side=P.side||"r",b0=C.parseFen(String(P.fen).split(" ")[0]),lines=[P.line||[],...(P.alt||[])].map(L=>L.slice()),pl=[];let line=lines[0].slice(),b=b0.slice(),step=0,sel=-1,last=null,busy=false,mist=0,hintOn=false,demo=false,cn=[];   /* pl＝到目前為止走過的著法（含對方應著）；第一手照 alt 走就換成那一條線 */
  const sq=u=>[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))],want=()=>line[step*2]||"",ck=bb=>C.inCheck(bb,"r")?C.kingSq(bb,"r"):C.inCheck(bb,"b")?C.kingSq(bb,"b"):-1;
  const bd=Board(x=>tap(x));wrap.append(bd.svg);
  const tg=()=>sel>=0?C.legal(b,side).filter(([f])=>f===sel).map(x=>x[1]):[];
  const draw=o=>{const O=Object.assign({sel,last,check:ck(b),targets:tg()},hintOn&&want()?{hint:[sq(want())[0]]}:{},o||{});bd.draw(b,O);mnfTgGlow(bd.svg,O.targets||[])};
  const presel=()=>{const u=want();if(P.presel!==false&&u){const f=sq(u)[0];if(C.legal(b,side).some(([x])=>x===f))sel=f}};
  presel();draw();requestAnimationFrame(()=>requestAnimationFrame(()=>w.classList.add("on")));
  const lit=s=>{const r=bd.svg.getBoundingClientRect(),wr=wrap.getBoundingClientRect(),k=r.width/560,x=(40+(s%9)*60)*k+(r.left-wr.left),y=(40+(s/9|0)*60)*k+(r.top-wr.top);const d=document.createElement("div");d.className="mnf-lit";d.style.left=x+"px";d.style.top=y+"px";wrap.append(d);setTimeout(()=>d.remove(),1300)};
  const win=()=>{busy=true;hintE.textContent="";dE.innerHTML="";mnfSfx("gong");if(typeof vibrate==="function")vibrate([15,40,25]);lit(last.t);
    setTimeout(()=>{w.classList.add("done");setTimeout(()=>{w.remove();done({mist,hint:hintOn,demo,cn:cn.join("　")})},900)},700)};
  const wrong=(nb,f,t)=>{busy=true;mist++;b=nb;last={f,t};sel=-1;draw({targets:[]});wrap.classList.add("shk");if(typeof vibrate==="function")vibrate([20,40,20]);mnfSfx("drum");
    /* 題目指定的陷阱著法（P.wrong）：先顯示那句台詞，對方吃得回來就真的吃回給玩家看，再倒帶 */
    const W0=P.wrong&&P.wrong[C.iccs(f,t)],msg=W0&&(W0.say||W0),re=W0&&W0.re;if(msg){hintE.textContent=msg;hintE.classList.add("w");setTimeout(()=>{const R=C.legal(nb,C.opp(side)).find(x=>re?C.iccs(x[0],x[1])===re:x[1]===t);if(R){b=C.make(nb,R[0],R[1]);last={f:R[0],t:R[1]};draw({targets:[]});mnfSfx("drum")}},560)}
    setTimeout(()=>{wrap.classList.remove("shk");wrap.classList.add("rew");setTimeout(()=>{wrap.classList.remove("rew");b=bstep.slice();last=lastStep;
      if(hintOn&&hintE.classList.contains("w")){hintE.classList.remove("w");hintE.textContent=P.hint||"看藍框那顆棋子。"}
      if(mist>=2&&!hintOn){hintOn=true;hintE.classList.remove("w");hintE.textContent=P.hint||"看藍框那顆棋子。"}
      if(mist>=3&&!dE.firstChild){const bt=document.createElement("button");bt.type="button";bt.className="mnf-demo";bt.textContent="看軍師演示";bt.onclick=e=>{e.stopPropagation();playDemo()};dE.append(bt)}
      presel();busy=false;draw()},520)},msg?1700:620)};
  let bstep=b.slice(),lastStep=null;
  const go=(f,t)=>{const u=C.iccs(f,t),L2=lines.find(L=>pl.every((x,i)=>L[i]===x)&&L[pl.length]===u);if(L2)line=L2.slice();   /* 走的是另一條對的線（例如九路、八路都行）：照那一條往下 */
    const J=mnfQteJudge(C,b,side,f,t,want());cn.push(C.notate(b,f,t));
    if(!J.ok){cn.pop();return wrong(J.nb,f,t)}
    if(hintE.classList.contains("w")){hintE.classList.remove("w");hintE.textContent=hintOn?(P.hint||""):""}
    b=J.nb;last={f,t};sel=-1;draw({targets:[]});if(typeof vibrate==="function")vibrate(15);
    if(J.win||!line[step*2+1]){win();return}
    pl.push(u,line[step*2+1]);
    busy=true;setTimeout(()=>{const[f2,t2]=sq(line[step*2+1]);b=C.make(b,f2,t2);last={f:f2,t:t2};step++;bstep=b.slice();lastStep=last;presel();busy=false;draw()},600)};
  function tap(x){if(busy)return;const L=C.legal(b,side);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){const f=sel;return go(f,x)}sel=L.some(([f])=>f===x)?x:-1;if(sel>=0&&typeof vibrate==="function")vibrate(5);draw()}
  function playDemo(){if(busy)return;demo=true;busy=true;dE.innerHTML="";hintE.textContent="軍師：看好了——";const u=want();if(!u){win();return}const[f,t]=sq(u);sel=f;draw();
    setTimeout(()=>{busy=false;go(f,t)},1100)}
  return{tap,demo:playDemo}}
/* 合法落點發光：Board 畫的落點是小點，新手看不清楚；在上面多疊一圈會呼吸的金光（不吃點選） */
function mnfTgGlow(svg,T){const NS="http://www.w3.org/2000/svg";svg.querySelectorAll(".mnf-tg").forEach(e=>e.remove());
  for(const s of T){const c=document.createElementNS(NS,"circle");c.setAttribute("class","mnf-tg");c.setAttribute("cx",40+(s%9)*60);c.setAttribute("cy",40+(s/9|0)*60);c.setAttribute("r",17);c.setAttribute("aria-hidden","true");svg.append(c)}}
/* ---------- 殘局解開儀式：o＝{k 站,id 題號,cn 走法文字,state "new"|"old"|"demo",L 這一站題號,onDone} ---------- */
function mnfSolveRite(o){o=o||{};mnfCss();let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  const A=(()=>{try{return store.get("shipSolved",{})||{}}catch(e){return{}}})(),per=typeof SHIP_PER!=="undefined"?SHIP_PER:3,route=typeof SHIP_ROUTE!=="undefined"?SHIP_ROUTE:[o.k];
  const cnt=mnfRiteCount(A,route,per),rows=mnfRiteRows(A,o.k,o.L,per),me=rows.findIndex(r=>r.id===o.id),st=o.state||"new";
  const nm=(typeof QP_SEAL!=="undefined"&&QP_SEAL[o.k])||(typeof shipShort==="function"?(()=>{try{return shipShort(o.k)}catch(e){return""}})():""),R=MNF_RITE_SET[o.set]||MNF_RITE_SET.c1,TX=Object.assign({},MNF_RITE_TXT,R.txt||{}),I=MNF_IMG[R.up],IW=I.w||MNF_W,IH=I.h||MNF_H;
  const d=document.createElement("div");d.id="mnfRite";d.setAttribute("role","dialog");d.setAttribute("aria-label","殘譜補上一行");
  const CN=["一","二","三","四","五","六"];
  const rowH=rows.map((r,i)=>{const txt=r.id===o.id?(o.cn||"──"):r.on?"〰〰〰":"";const isMe=i===me&&st!=="demo";
    return`<div class="rt-r${r.on&&!(isMe&&st==="new")?" on":""}${isMe?" nw":""}"><i>${CN[i]||i+1}</i>${isMe&&st==="new"?[...txt].map(c=>`<span class="c">${esc(c)}</span>`).join(""):`<span class="ink">${esc(txt)}</span>`}</div>`}).join("");
  const segs=Array.from({length:cnt.all},(_,i)=>`<u class="${i<cnt.n?"on":""}${st==="new"&&i===cnt.n-1?" nw":""}"></u>`).join("");
  d.innerHTML=`<div class="rt-st"><div class="rt-im"><img src="${MNF_IMG[R.hand].u}" alt=""><img class="rt-up" src="${I.u}" alt=""><div class="rt-dot"></div></div></div><div class="rt-bk"><div class="rt-pg"><p class="rt-h">《千秋棋話》${esc(nm)}</p>${rowH}<div class="rt-mk" aria-hidden="true">${segs}</div><p class="rt-n">殘譜 ${cnt.n}／${cnt.all} 行</p><div class="rt-cv">千秋棋話</div></div></div><div class="mnf-sub" aria-live="polite"></div><button class="mnf-k" type="button">略過</button>`;
  document.body.append(d);requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add("on")));
  const im=d.querySelector(".rt-im"),dot=d.querySelector(".rt-dot"),sub=d.querySelector(".mnf-sub"),bk=d.querySelector(".rt-bk"),stg=d.querySelector(".rt-st");
  const W=()=>d.clientWidth||innerWidth,H=()=>d.clientHeight||innerHeight;
  /* 鏡頭焦點 f（原圖像素）擺在畫面 50%、42%，不露出圖邊；刻痕光的位置、寬度、角度照圖組 */
  const place=(k,f)=>{const w=W(),h=H(),s=Math.max(w/IW,h/IH)*k,ox=Math.min(0,Math.max(w-IW*s,w*.5-f[0]*s)),oy=Math.min(0,Math.max(h-IH*s,h*.42-f[1]*s));
    im.style.width=IW*s+"px";im.style.height=IH*s+"px";im.style.transform=`translate(${ox}px,${oy}px)`};
  dot.style.left=R.fx[0]/IW*100+"%";dot.style.top=R.fx[1]/IH*100+"%";dot.style.width=R.dw+"%";dot.style.transform=`translate(-50%,-50%) rotate(${R.rot}deg)`;
  const n=Math.max(...Object.values(TX).map(mnfLen));d.style.setProperty("--mnfs",Math.max(15,Math.min(28,Math.floor((W()-36)/(n*1.12))))+"px");
  const say=t=>{sub.classList.remove("on");sub.textContent=t;void sub.offsetWidth;sub.classList.add("on")};
  const K=o.fast?.55:1,T=[],at=(s,f)=>T.push(setTimeout(f,(rm?Math.min(s*1000,s*300):s*1000)*K));let fin=false,k0=performance.now(),raf=0;   /* o.fast：對話場景解題後的短版（約 5 秒，開發者 11/14 新腳本第 7 場） */
  const up=d.querySelector(".rt-up"),sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x),[K0,K1,K2]=R.k;
  /* 鏡頭（約 9 秒）：0～1.6 秒推近到手（K0→K1）→ 1.6 秒交叉淡入手移開的那張 → 1.4～3 秒焦點從手掌滑到刻痕 → 3～4.6 秒慢慢退到 K2 → 4.9 秒殘譜浮起 */
  const zf=t=>rm?[K2,R.fx]:[t<1.6?K0+(K1-K0)*(1-Math.pow(1-t/1.6,2)):t<3?K1:K1+(K2-K1)*sm((t-3)/1.6),[0,1].map(j=>R.fh[j]+(R.fx[j]-R.fh[j])*sm((t-1.4)/1.6))];
  const zoom=()=>{if(fin)return;const t=(performance.now()-k0)/1000/K;place(...zf(t));if(t<5)raf=requestAnimationFrame(zoom)};zoom();
  const end=()=>{if(fin)return;fin=true;T.forEach(clearTimeout);cancelAnimationFrame(raf);d.classList.remove("on");setTimeout(()=>d.remove(),850);if(o.onDone)setTimeout(o.onDone,300)};   /* 淡出 0.8 秒；0.3 秒就讓電影在底下接著播，儀式和下一鏡（open 河口打通）疊著溶接 */
  d.querySelector(".mnf-k").onclick=e=>{e.stopPropagation();if(typeof vibrate==="function")vibrate(5);end()};
  at(.3,()=>say(TX.hand));
  at(1.6,()=>{im.classList.add("mv");up.classList.add("on")});
  at(2.4,()=>im.classList.remove("mv"));
  at(2.6,()=>{dot.classList.add("on");mnfSfx("drip")});
  at(2.9,()=>say(TX.glow));
  at(4.9,()=>{stg.style.opacity=".28";bk.classList.add("on");say(st==="demo"?TX.demo:st==="old"?TX.old:TX.line)});
  at(5.5,()=>{bk.classList.add("op");mnfSfx("star")});
  if(st==="new")at(6.2,()=>{const cs=[...d.querySelectorAll(".rt-r.nw span.c")];cs.forEach((c,i)=>T.push(setTimeout(()=>c.classList.add("on"),rm?0:i*220)));const r=d.querySelector(".rt-r.nw");if(r)T.push(setTimeout(()=>r.classList.add("on"),cs.length*220))});
  at(7.2,()=>say(st==="demo"?TX.demo2:TX.rule));
  at(9.3,end);
  return{end,count:cnt,rows}}
