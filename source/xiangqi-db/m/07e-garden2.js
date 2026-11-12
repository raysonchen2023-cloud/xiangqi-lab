/* ================= 🧭 輿圖遊歷・❄ 九九消寒圖（意見回饋 658，開發者 11/6 核准 B、D）=================
   只在石桌往事的園子（PARK_J==="park"）裡出現；不碰積分挑戰、擂台、線上對戰；沒有付費、抽卡、新貨幣，獎勵只有收藏、稱號、少量修為。
   B．輿圖遊歷
      13 個朝代各一條真實路線（4～6 站，共 60 站；站名、說明、出處在 YU_R，傳說、真偽有爭議的都標明）。
      園子拉遠看朝代地圖時，路線畫在地圖上（xiangqi-lab/src/park3d.js 讀 window.XQ_MAPROUTE）：虛線是還沒走的路、紅線是走過的、整條走完變金線；下一站發亮。
      點地名（06-cpu.js parkInfo 的 map:），是路線上的站就多一個「⚔ 在這裡過一關」。每站一題 canju-set.json 驗證過的殘局（照那一站的主題挑殺法，一站比一站難）。
      解題頁 #/canju/r/<朝代>/<第幾站>（07c-canju.js 的 cjXMode；不算茶單，看答案不算過關）。一天最多走 2 站（重解走過的站不算）；每站修為 +15；
      整條走完：地圖畫金線、那一朝千秋印的輿圖邊亮（11/9 起；以前叫得到一張路引）；13 條都走完 → 稱號「行萬里路」＋修為 50。
   D．九九消寒圖
      明朝劉侗、于奕正《帝京景物略》：「日冬至，畫素梅一枝，為瓣八十有一，日染一瓣。」從冬至那天起 81 天，每天一題（XH_Q，由淺到深），解開就染一瓣。
      題目跟棋史卡（C）、輿圖遊歷（B）的題都不重複；新排的今日茶單也不會出這些題（cjReserved，07c-canju.js cjToday）。
      漏掉的日子可以補，一天最多補 3 瓣；九九過了，還沒染的花瓣照樣每天能補 3 瓣。每開滿一朵（9 瓣）修為 +10；81 瓣都染完 → 稱號「九九消寒」＋修為 30。
      頁面 #/xiaohan；解題頁 #/canju/x/<冬至那年>/<第幾瓣 0～80>。冬至還沒到：顯示倒數和說明；開發者模式可以預覽（存檔另外放在 "dev"，不動真的進度）。
      石桌往事的園子裡點燈籠（秘境棋友先檢查）跳出節令小卡。冬至日期：XH_SOL（2025～2040，Meeus 算法驗算過），表外的年份用 xhSol() 估算。
   存檔（store）：yuRoute＝{朝代:{n:走過幾站,at:[每站過關時間],done:整條走完的時間}}；yuDay＝{d:日期,n:今天走了幾站}；yuTitle＝拿到「行萬里路」的時間；
        yuBack＝解完題要回去的網址；yuHint＝看過「地圖可以點」的提示；
        xhMei＝{冬至那年:{第幾瓣:染上的時間}}；xhMake＝{d:日期,n:今天補了幾瓣}；xhTitle＝{冬至那年:拿到「九九消寒」的時間}；xhBack＝消寒圖頁的返回網址；xhDev＝開發者預覽假裝是第幾天（0＝關）；
        cjRunR／cjRunX＝正在解的那一題（跟 cjRun 同格式） */

/* ---------- B．輿圖遊歷：路線（p＝地圖上的位置，圖寬的 %；被石台蓋住的站推到石台邊；nl＝地圖原本沒有這個地名，要自己寫字；q＝題號） ---------- */
const YU_R={
  /* 11/10 開發者選 Gemini 69 方案 3＋1：青石園不再用《禹貢》九州（看起來像第 14 個朝代），改成千秋石桌上的北斗陣眼；五題照舊，開陽、搖光由 park3d 照終章有沒有完成畫亮或暗 */
  classic:{"t":"千秋時光之苑・北斗陣眼","seal":"北斗","yr":"雲河星槎","src":"北斗七星的星名（漢代緯書《春秋運斗樞》）","tale":1,"x":"千秋時光之苑不屬於任何朝代。園子中央那張千秋石桌，石面刻著棋盤，外圈刻著北斗七星的星軌。古人看北斗的斗柄指向哪裡，就知道現在是什麼季節。幻影把五個陣眼排成北斗的樣子，每個陣眼放一題殘局；剩下的開陽、搖光兩顆，要等七位旅伴完成「千秋歸位」那天才會亮起來。","s":[{"n":"天樞","nl":1,"p":[73,35],"x":"天樞是北斗的第一顆星。「樞」是門的轉軸，門靠它才轉得動；下棋也一樣，先看清楚哪一子是整盤棋的關鍵。","q":"gm2013-B84A43K1A3r"},{"n":"天璇","nl":1,"p":[66,33],"x":"天璇和天樞連成一直線，往天樞那頭延長，就找得到北極星。棋子也要排成線、互相照應，才走得出力量。","q":"lk196"},{"n":"天璣","nl":1,"p":[64,44],"x":"天璣在斗勺的底部。勺底要穩，東西才裝得住；就像九宮要守好，帥才安全。","q":"mr007"},{"n":"天權","nl":1,"p":[72,47],"x":"天權是斗勺和斗柄相接的那一顆，也是七顆裡最暗的一顆，卻把整個北斗連起來；小兵小卒也能撐起一盤棋。","q":"ys063"},{"n":"玉衡","nl":1,"p":[70,58],"x":"玉衡是北斗七星裡最亮的一顆。幻影說：「走到這裡，基本功就打好了。開陽、搖光，等七子歸位那天再一起點亮。」","q":"lk202c4"}]},
  qin:{"t":"始皇東巡","seal":"東巡","yr":"前 219、前 210 年","src":"《史記．秦始皇本紀》","x":"秦始皇統一天下以後，好幾次出巡。這條路把《史記》記的兩次合起來走：始皇二十八年（前 219 年）登泰山、到琅邪；三十七年（前 210 年）上會稽，回程病死在沙丘。","s":[{"n":"咸陽","p":[42.1,44],"x":"秦的都城。統一以後，秦始皇下令「車同軌，書同文字」：全國車輪的距離一樣、文字的寫法也一樣。","th":"車同軌：用車殺","q":"lk242c4"},{"n":"泰山","p":[66.2,38.9],"x":"前 219 年，秦始皇登上泰山，立石刻字、舉行封禮。《史記》說下山時遇到暴風雨，他在一棵樹下躲雨，就封那棵樹為「五大夫」。","q":"sq308"},{"n":"琅邪","p":[73,40.4],"x":"同一年他往南到琅邪，非常喜歡這裡，一住就是三個月，還遷了三萬戶百姓到琅邪臺下。","q":"lk113c4"},{"n":"會稽","p":[77.3,53.9],"x":"前 210 年，他上會稽山祭拜大禹，遠望南海，又立了一塊石碑，刻字稱頌秦朝的功德。","q":"sq056c8"},{"n":"沙丘","p":[60.8,36.3],"nl":1,"x":"回程走到平原津就病倒了，七月死在沙丘平臺。丞相李斯怕天下大亂，把消息瞞住，不發喪。","q":"sq463c6"}]},
  han:{"t":"張騫出使西域","seal":"鑿空","yr":"約前 139～前 126 年","src":"《史記．大宛列傳》","x":"漢武帝想聯合大月氏一起對付匈奴，招人出使，張騫去應徵。他這一去十三年，出發時一百多人，回來的只剩兩個人。司馬遷說張騫這一趟是「鑿空」——第一次把通往西域的路打通。","s":[{"n":"長安","p":[58.7,54.7],"x":"張騫以郎官的身分應募出使大月氏，帶著胡人甘父（堂邑父）從長安出發。","q":"sq245"},{"n":"隴西","p":[39.7,55.5],"nl":1,"x":"《史記》說他們「出隴西」，往西走，就得經過匈奴的地盤。","q":"ys280"},{"n":"匈奴","p":[51.5,26.7],"x":"他們被匈奴抓住，送到單于那裡。匈奴把張騫留了十多年，還讓他娶妻生子，可是張騫一直把漢朝的符節帶在身邊，沒有丟掉。","q":"lk171c5"},{"n":"西域","p":[12.5,35.8],"x":"他找機會逃走，往西到了大宛，再經康居到大月氏。《史記》說大宛「多善馬，馬汗血」。可惜大月氏過得安穩，不想再跟匈奴打仗了。","th":"大宛出好馬：用馬殺","q":"lk128"},{"n":"羌","p":[36.1,51.9],"x":"回程他沿著南山走，想從羌人的地方回漢朝，又被匈奴抓住。一年多後匈奴內亂，他才帶著妻子和堂邑父逃回長安。","q":"sq100"}]},
  sanguo:{"t":"赤壁之戰","seal":"赤壁","yr":"建安十三年（208 年）","src":"《三國志．武帝紀》《三國志．先主傳》","x":"建安十三年，曹操已經平定北方，帶兵南下荊州，最後在赤壁跟孫權、劉備的聯軍交戰。注意：草船借箭、借東風是小說《三國演義》的情節，不是正史。","s":[{"n":"鄴","p":[62.1,37.7],"x":"這年正月，曹操回到鄴城，挖了一個玄武池，在池裡訓練水軍。","q":"ys042"},{"n":"襄陽","p":[59.7,51.8],"x":"七月曹操南征劉表。八月劉表病死，兒子劉琮駐在襄陽；九月曹操到了新野，劉琮就投降了。","th":"象棋的「砲」原本是拋石頭的機器：官渡之戰時曹操造了「發石車」，袁紹的兵叫它「霹靂車」（《三國志．袁紹傳》）。這一站用炮殺","q":"lk001c4"},{"n":"江陵","p":[58.6,57.9],"nl":1,"x":"江陵存著很多軍需。曹操怕劉備搶先占領，丟下輜重，帶五千精騎一天一夜追了三百多里，在當陽長坂追上劉備，接著進了江陵。","th":"精騎急追：用馬殺","q":"lk147c4"},{"n":"赤壁","p":[61.8,58],"x":"曹操從江陵順江東下，在赤壁跟孫權、劉備的聯軍交戰，打輸了。《三國志．周瑜傳》記載黃蓋用火攻燒了曹軍的船；軍中又鬧瘟疫，曹操只好退兵。","th":"隔著江打：用炮殺","q":"sq052"}]},
  weijin:{"t":"淝水之戰","seal":"淝水","yr":"太元八年（383 年）","src":"《晉書．苻堅載記》《晉書．謝安傳》","x":"前秦的苻堅統一北方以後，帶大軍南下，想一口氣滅掉東晉，結果在淝水被謝玄打敗。「草木皆兵」「風聲鶴唳」兩個成語都出自這一仗。","s":[{"n":"長安","p":[47.6,40.4],"x":"苻堅從長安出發，《晉書》說他帶了步兵六十多萬、騎兵二十七萬。","q":"ys056"},{"n":"項城","p":[64.1,51.5],"nl":1,"x":"苻堅到了項城，聽說弟弟苻融已經攻下壽春，就把大軍留在項城，自己帶著八千輕騎趕過去。","q":"zx042"},{"n":"淝水","p":[68.6,53.9],"x":"兩軍隔著淝水對陣。苻堅登上壽春城，望見八公山上的草木，都以為是晉兵——這就是「草木皆兵」。秦軍往後一退就亂了，逃兵聽到風聲、鶴叫，都以為晉軍追來了。","s":"《晉書．謝玄傳》（風聲鶴唳）","q":"xw056c8"},{"n":"建康","p":[73.4,54.6],"x":"捷報送到建康時，謝安看完信，隨手放在一旁，神色跟平常一樣。客人問起，他只淡淡地說：「小兒輩遂已破賊。」","th":"謝安的沉著：只有一步能保住勝勢","q":"sq315"}]},
  nanbei:{"t":"佛窟東傳","seal":"石窟","yr":"439～500 年前後","src":"《魏書．釋老志》","x":"南北朝時佛教很興盛，北魏從西到東開鑿了許多石窟。《魏書．釋老志》說，涼州和敦煌很早就信佛；北魏打下涼州以後，把那裡的人和僧人遷到京城，佛教在北方更加興旺。","s":[{"n":"敦煌","p":[14.7,27.4],"x":"《釋老志》說敦煌靠近西域，「村塢相屬，多有塔寺」——一個村子接著一個村子，到處都是佛塔和佛寺。莫高窟就在這裡。","q":"ys147"},{"n":"涼州","p":[33,36.5],"x":"涼州從張軌以後，世世代代信佛。北魏太延年間（439 年）打下涼州，把那裡的百姓遷到京城平城，僧人和佛事也一起往東來了。","q":"lk084"},{"n":"平城","t":"平城・雲岡","p":[58.7,30.8],"x":"僧人曇曜請北魏文成帝在京城西邊的武州山開鑿石窟，「開窟五所」，每個石窟一尊大佛。這就是今天雲岡石窟的「曇曜五窟」。","q":"sq162"},{"n":"洛陽","t":"洛陽・龍門","p":[59.4,46.8],"x":"孝文帝遷都洛陽以後，宣武帝景明初年（500 年）照著平城石窟的樣子，在洛陽南邊的伊闕山開鑿石窟，就是今天的龍門石窟。","q":"lk012"}]},
  sui:{"t":"隋朝大運河","seal":"運河","yr":"605～610 年","src":"《隋書．煬帝紀》《資治通鑑》","x":"隋煬帝在幾年之內，把好幾段運河連起來：南到餘杭，北到涿郡，中心在洛陽。南方的米糧從此可以一路坐船運到北方。運河一段接一段往前挖，就像小兵一步一步往前拱。","s":[{"n":"餘杭","p":[79,57.2],"x":"大業六年（610 年）開江南河，從京口（今天的鎮江）到餘杭，八百多里。","s":"《資治通鑑》卷一八一","th":"運河一段一段往前挖：小兵往前拱","q":"sq030c6"},{"n":"江都","p":[76.3,51.1],"x":"大業元年（605 年），徵發淮南十多萬人開邗溝，從山陽到揚子進入長江。同年八月，隋煬帝坐著龍舟到江都。","s":"《資治通鑑》卷一八〇","th":"小兵往前拱","q":"lk019c6"},{"n":"大運河","t":"通濟渠","p":[66.8,47.1],"x":"大業元年（605 年）開通濟渠：從洛陽的西苑引穀水、洛水接到黃河，再從板渚引黃河水接到淮水，前後動用了一百多萬人。","th":"小兵往前拱","q":"sq273"},{"n":"洛陽","p":[58.7,45.4],"x":"大運河的中心是東都洛陽。大業元年（605 年），隋煬帝下令營建東都。","q":"lk204c6"},{"n":"涿郡","p":[65.9,29.8],"x":"大業四年（608 年）開永濟渠，引沁水南通黃河、北通涿郡，動用河北一百多萬人。大業七年，隋煬帝就從江都坐龍舟，經運河到涿郡，準備攻打高句麗。","th":"小兵往前拱","q":"sq351c4"}]},
  tang:{"t":"玄奘西行","seal":"西行","yr":"貞觀初年～十九年（645 年）","src":"《大唐西域記》《大慈恩寺三藏法師傳》","x":"玄奘為了找到佛經的原典，偷偷出關往西走，在印度學了十多年，貞觀十九年（645 年）帶著六百多部經書回到長安。出發的年份有貞觀元年、三年兩種說法。他口述、弟子辯機寫成的《大唐西域記》，記下了一百多個國家的風土。","s":[{"n":"長安","p":[60.7,54.7],"x":"玄奘想去天竺（印度）求經，可是朝廷不准百姓出境，他就自己悄悄出發了。","q":"ys378"},{"n":"涼州","p":[51.1,38.4],"nl":1,"x":"涼州是往西域去的大城。涼州都督知道玄奘要出境，逼他回長安；有法師偷偷派兩個弟子送他，從此他白天躲起來、晚上才趕路。","s":"《慈恩傳》","q":"zx168"},{"n":"高昌","p":[31.2,35.5],"nl":1,"x":"高昌王麴文泰非常敬重玄奘，想留他當國師。玄奘絕食好幾天，高昌王才讓他走，還送他衣物、馬匹，和給西域各國的信。","s":"《慈恩傳》","th":"高昌王送的馬：用馬殺","q":"mr042"},{"n":"屈支","t":"屈支（龜茲）","a":["安西"],"p":[21.4,36.2],"x":"屈支就是龜茲。《大唐西域記》說這裡「管絃伎樂，特善諸國」，音樂比別國都好。後來唐朝把安西都護府搬到這裡。","q":"mr078c4"},{"n":"碎葉","p":[10.9,31.2],"x":"翻過冰雪覆蓋的凌山，到了素葉水城（碎葉）。玄奘在這裡見到西突厥的葉護可汗，可汗派人一路護送他往南走。","th":"突厥騎兵護送：用馬殺","q":"mr008c4"},{"n":"敦煌","t":"敦煌（回程）","p":[38.2,42.1],"x":"在印度學了十多年，玄奘從于闐出發，經過沙州（敦煌）回國，貞觀十九年正月回到長安。","s":"《慈恩傳》","q":"mr068c5"}]},
  wudai:{"t":"周世宗的統一大業","seal":"世宗","yr":"954～959 年","src":"《舊五代史．世宗紀》《新五代史．周本紀》","x":"後周世宗柴榮在位不到六年，北打北漢和契丹、南打南唐，替後來宋朝統一天下打好了底子。","s":[{"n":"汴梁","p":[64.2,49.1],"x":"顯德元年（954 年），柴榮剛即位，北漢就聯合契丹南下。老臣馮道勸他不要親征，柴榮還是自己帶兵出了汴梁。","s":"《新五代史．馮道傳》","q":"lk203c7"},{"n":"高平","a":["北漢"],"p":[61.2,46.5],"nl":1,"x":"兩軍在高平交戰。後周右翼的將領臨陣逃跑，柴榮親自冒著箭雨督戰，趙匡胤也在這一仗立了大功，終於打敗北漢。","th":"兩路齊發：用雙將","q":"lk105c7"},{"n":"壽州","a":["南唐"],"p":[70.1,54.9],"nl":1,"x":"柴榮三次親征南唐。南唐大將劉仁贍死守壽州一年多，城到顯德四年（957 年）才投降。第二年，南唐把長江以北的州縣都割給了後周。","th":"圍城：讓對方無棋可走（困斃）","q":"sq426c5"},{"n":"瓦橋關","a":["燕雲十六州"],"p":[67.7,37.3],"nl":1,"x":"顯德六年（959 年），柴榮北伐契丹，不到兩個月就收回瀛州、莫州、寧州和瓦橋、益津、淤口三關。正要往幽州進兵，卻得了重病，回到汴梁不久就去世了。","q":"jc112c7"}]},
  song:{"t":"澶淵之盟","seal":"澶淵","yr":"景德元年（1004 年）","src":"《宋史．真宗紀》《宋史．寇準傳》","x":"遼國的蕭太后和遼聖宗帶大軍南下，一路打到黃河邊的澶州。宰相寇準力勸宋真宗親征，最後雙方訂下和約，此後宋遼一百多年沒有大戰。","s":[{"n":"汴京","p":[60.9,45.6],"x":"遼軍逼近時，有大臣主張遷都金陵、成都避難；寇準堅決反對，勸真宗親自出征。","th":"寇準力排眾議：只有一步能保住勝勢","q":"gm1983-3r2n294KA3r"},{"n":"澶州","p":[62.3,42.9],"x":"真宗渡過黃河，登上澶州北城的城門樓，遠近的宋軍望見皇帝的傘蓋，歡呼聲傳到幾十里外。先前宋軍用床子弩射死了遼軍大將蕭撻凜，遼軍士氣大挫。","th":"不打大仗，也能讓對方沒路走（困斃）","q":"sq423c8"},{"n":"雄州","p":[64.1,33],"nl":1,"x":"和約說好：宋每年給遼絹二十萬匹、銀十萬兩，兩國以白溝河一帶為界。第二年起，宋在雄州等地開了「榷場」，兩國百姓可以在這裡做買賣。","s":"《宋史．食貨志》","q":"sq276c5"},{"n":"燕京","p":[64.5,30.2],"x":"燕京是遼國的南京。訂約以後，宋遼每年都派使者互相祝賀新年和生日，宋朝的使者要經過這裡，再往北去見遼國皇帝。","q":"lk007"}]},
  yuan:{"t":"馬可．波羅的見聞","seal":"東遊","yr":"1275～1291 年（照遊記的說法）","src":"《馬可．波羅遊記》","tale":2,"x":"威尼斯人馬可．波羅說自己跟著父親和叔叔來到元朝，在中國住了十七年。他的遊記讓歐洲人認識了東方；不過書裡有些事跟中國史料對不上，學者對他到底去過哪些地方，到今天還有爭論。這條路照遊記自己的說法走。","s":[{"n":"上都","p":[69.1,36.6],"x":"遊記說，他們先到忽必烈夏天住的上都見到大汗。書裡描寫了上都的大理石宮殿，和大汗在草原上的行宮。","q":"sq201c6"},{"n":"大都","p":[70.1,41.7],"x":"大都是元朝的首都，遊記叫它「汗八里」，意思是「大汗的城」。書裡說城裡街道筆直、方方正正，整座城像一張棋盤。","th":"像棋盤的城：用車殺","q":"lk021c7"},{"n":"杭州","p":[79.1,61],"x":"遊記把杭州叫「行在」，說它是世上最美、最富的城市，城裡有大湖，還說有一萬二千座橋——這個數字顯然誇大了。","q":"sq293c5"},{"n":"泉州","p":[78.1,72.5],"x":"泉州在遊記裡叫「刺桐」，說是世上最大的港口之一。1291 年前後，他們從這裡坐船出海，護送一位元朝的姑娘嫁到伊兒汗國，從此回到家鄉。中國的史料《站赤》（收在《永樂大典》）也記了同行三位使者的名字，跟遊記對得上。","q":"lk133"}]},
  ming:{"t":"永樂北遷","seal":"北遷","yr":"1403～1421 年","src":"《明史．成祖本紀》《明史．宋禮傳》","x":"明成祖朱棣原本是鎮守北平的燕王。他當上皇帝以後，把北平改名北京，疏通運河，親征漠北，最後在永樂十九年（1421 年）把都城從南京遷到北京。石桌往事的故事發生在永樂十年（1412 年），正好在這段時間的中間。","s":[{"n":"南京","p":[73.3,56],"x":"明朝一開始的都城在南京。永樂元年（1403 年），朱棣把自己起兵的北平改名為北京。","q":"gm2003-4A42BAK2R1r"},{"n":"泗州","p":[72.4,53.5],"nl":1,"x":"從南京往北，要經過淮水邊的泗州。石桌往事的雲河鎮就設定在泗州一帶（雲河鎮是虛構的）。真實的明朝泗州城，在清朝康熙年間被洪水淹沒，沉到了洪澤湖底。","th":"運河邊的小兵：小兵往前拱","q":"mr043c4"},{"n":"會通河","p":[66.7,46.8],"nl":1,"x":"永樂九年（1411 年），工部尚書宋禮重新疏通山東的會通河，在南旺分水，運河從此能一路通到北京。","th":"疏通河道：小兵往前拱","q":"sq150c6"},{"n":"北京","p":[66.1,35],"x":"永樂四年（1406 年）下詔營建北京宮殿，永樂十八年（1420 年）完工，第二年正式遷都北京。","q":"lk142"},{"n":"韃靼","p":[52,21.5],"x":"永樂八年（1410 年），朱棣第一次親征漠北，在斡難河打敗韃靼的本雅失里。他一生五次親征漠北，最後一次死在回程的榆木川。","th":"漠北騎兵：用馬殺","q":"lk154"}]},
  qing:{"t":"從盛京到江南","seal":"南巡","yr":"1644～1703 年","src":"《清史稿．世祖本紀》《清史稿．聖祖本紀》","x":"清朝從東北的盛京起家，入關定都北京。康熙皇帝六次南巡江南，又在承德蓋了避暑山莊。","s":[{"n":"盛京","p":[80.9,39.1],"x":"盛京就是今天的瀋陽。努爾哈赤把都城遷到這裡，皇太極改名盛京，又在這裡把國號改為「清」。","q":"gm2006-K2C11RB4c1r"},{"n":"山海關","p":[76,43.8],"nl":1,"x":"順治元年（1644 年），明將吳三桂打開山海關，跟清軍一起打敗李自成，清軍從這裡入關。","q":"lk037c8"},{"n":"北京","p":[70.8,44.7],"x":"同一年秋天，順治皇帝從盛京來到北京，從此北京成了清朝的都城。","q":"sq010c5"},{"n":"江南","p":[76.7,63.8],"x":"康熙二十三年（1684 年），康熙第一次南巡，到了蘇州、江寧（南京），還到明孝陵祭拜。他一生南巡六次，主要是去看黃河和運河的河工。","th":"治河：小兵往前拱","q":"mr030"},{"n":"承德","p":[72.8,42.2],"x":"康熙四十二年（1703 年），在熱河（今天的承德）開始蓋避暑山莊。皇帝夏天在這裡處理政事，秋天到附近的木蘭圍場打獵、會見蒙古各部。","th":"木蘭秋獮：用馬殺","q":"lk217"}]}};
const YU_DAY=2,YU_TOTAL=Object.values(YU_R).reduce((a,r)=>a+r.s.length,0);
const yuAll=()=>store.get("yuRoute",{})||{};
const yuOf=era=>{const A=yuAll()[era]||{};return{n:A.n||0,at:A.at||[],done:A.done||0}};
const yuDoneN=()=>ARENA_ORDER.filter(k=>YU_R[k]&&yuOf(k).done).length;
const yuStopsN=()=>ARENA_ORDER.reduce((a,k)=>a+(YU_R[k]?Math.min(yuOf(k).n,YU_R[k].s.length):0),0);
function yuDay(){const d=localDay(),a=store.get("yuDay",null);return a&&a.d===d?a:{d,n:0}}
const yuLeftToday=()=>Math.max(0,YU_DAY-yuDay().n);
const yuTitle=()=>store.get("yuTitle",0)?"行萬里路":"";
const yuName=s=>s.t||s.n;
const yuFind=(era,nm)=>{const R=YU_R[era];return R?R.s.findIndex(s=>s.n===nm||(s.a||[]).includes(nm)):-1};
/* 開發者 11/9：路引不再是一種收集品，走完路線＝那一朝千秋印的「輿圖」那一邊亮（07i2-seal.js）；這裡改畫那一朝的千秋印 */
const yuSeal=(era,on,big)=>typeof sealDraw==="function"?sealDraw(era,big?{lg:1}:{}):`<span class="seal-st two${on?" on":""}${big?" big":""}">${esc((YU_R[era]||{}).seal||"？")}</span>`;
const yuTale=R=>R.tale===1?"📖 傳說":R.tale===2?"📖 真偽有爭議":"";
const yuInPark=era=>typeof PARK_J!=="undefined"&&PARK_J==="park"&&store.get("era","classic")===era;
function yuBackHash(){const h=store.get("yuBack","");return typeof h==="string"&&/^#\//.test(h)&&!/^#\/canju/.test(h)?h:"#/adventure"}

/* 給 park3d.js 畫路線：只有石桌往事的園子才有；key 變了才重畫 */
window.XQ_MAPROUTE=era=>{if(typeof PARK_J==="undefined"||PARK_J!=="park")return null;const R=YU_R[era];if(!R)return null;const N=R.s.length,n=Math.min(yuOf(era).n,N);
  return{key:era+":"+n,n,all:n>=N,tip:n>=N?`🧭 ${R.t}：整條走完了`:`🧭 ${R.t}：點發亮的「${yuName(R.s[n])}」，在那裡過一關`,
    s:R.s.map((s,i)=>({nm:s.n,t:s.nl?yuName(s):"",x:s.p[0],y:s.p[1],st:i<n?1:i===n?2:0}))}};
/* 青石園地圖的北斗七星：開陽、搖光要等終章「千秋歸位」學會才亮（park3d.js 畫 realms.json classic 的 stars 時問這裡） */
window.XQ_FINALE=()=>{try{return typeof shipLearned==="function"&&!!shipLearned("finale")}catch(e){return false}};

/* 點到地圖上的地名（06-cpu.js parkInfo）：是這個朝代路線上的站，就換成「介紹＋這一站」的小卡；回傳 true＝處理好了 */
function yuMapSheet(era,nm,d,en,yr){const i=yuFind(era,nm);if(i<0)return false;
  sheet("📍 "+nm,b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(en)}${yr?`・${esc(yr)}`:""}・地圖上的地名</div>${d?`<p style="line-height:1.8;margin:0 0 8px;font-size:16px">${esc(d)}</p>`:""}${yuStopHTML(era,i)}`;yuStopBind(b,era,i)});return true}
function yuStopHTML(era,i){const R=YU_R[era],s=R.s[i],N=R.s.length,n=Math.min(yuOf(era).n,N),st=i<n?"done":i===n?"next":"lock";
  const btn=st==="done"?`<button class="btn ghost" data-yu="go">↻ 再解一次（不算新的一站）</button>`:st==="next"?(yuLeftToday()?`<button class="btn" data-yu="go">⚔ 在這裡過一關</button>`:`<button class="btn" disabled>今天已經走了 ${YU_DAY} 站，明天再上路</button>`):`<button class="btn ghost" disabled>🔒 先走到第 ${n+1} 站「${esc(yuName(R.s[n]))}」</button>`;
  return`<div class="yu-st"><div class="yu-sh"><b>🧭 ${esc(R.t)}・第 ${i+1}／${N} 站${st==="done"?" ✔":""}</b><span>${esc(R.yr)}${yuTale(R)?"・"+yuTale(R):""}</span></div>
    <p><b>${esc(yuName(s))}</b>：${esc(s.x)}</p><p class="yu-src">出處：${esc(s.s||R.src)}</p>${s.th?`<p class="yu-th">♟ ${esc(s.th)}</p>`:""}
    <div class="yu-row">${btn}<button class="btn ghost" data-yu="route">看整條路線</button></div></div>`}
function yuStopBind(b,era,i){b.querySelectorAll("[data-yu]").forEach(y=>y.onclick=()=>{vibrate(5);if(y.dataset.yu==="go")yuGo(era,i);else yuRouteSheet(era)})}
function yuGo(era,i){store.set("yuBack",location.hash);closeSheet();location.hash="#/canju/r/"+era+"/"+i}
/* 一條路線：說明、出處、各站（走到才看得到說明）；在那個朝代的園子裡可以直接過下一站，不在就帶你去 */
function yuRouteSheet(era){const R=YU_R[era];if(!R)return;const P=yuOf(era),N=R.s.length,n=Math.min(P.n,N),here=yuInPark(era);
  sheet(`🧭 ${R.t}`,b=>{const nx=R.s[n];b.innerHTML=`<div class="yu-hd">${yuSeal(era,!!P.done,true)}<div><div class="muted">${esc(eraLabel(era))}・${esc(R.yr)}${yuTale(R)?"・"+yuTale(R):""}</div><div><b>${n}／${N} 站</b>${P.done?"・✔ 千秋印的輿圖那一邊亮了":""}</div></div></div>
    <p class="gd-hist" style="font-size:15px">${esc(R.x)}</p><p class="yu-src">出處：${esc(R.src)}</p>
    <ol class="yu-list">${R.s.map((s,i)=>`<li class="${i<n?"on":i===n?"nx":""}"><b>${i<n?"✔":i===n?"➜":"・"} ${esc(yuName(s))}</b>${i<=n?`<span>${esc(s.x)}</span>`:`<span class="muted">走到這一站才看得到</span>`}</li>`).join("")}</ol>
    ${P.done?`<p class="muted" style="font-size:13px">整條路線走完了，回到${esc(eraLabel(era))}的園子拉遠看地圖，路線是金色的。</p>`:here?(yuLeftToday()?`<button class="btn" id="yuNx" style="width:100%">⚔ 在「${esc(yuName(nx))}」過一關</button>`:`<button class="btn" disabled style="width:100%">今天已經走了 ${YU_DAY} 站，明天再上路</button>`)
      :era===(typeof walkHere==="function"?walkHere():store.get("era","classic"))?`<button class="btn" id="yuPk" style="width:100%">🌳 走去${esc(parkName(era))}</button><p class="muted" style="font-size:12.5px;margin:6px 0 0">到了園子，兩指拉遠看地圖，點發亮的「${esc(yuName(nx))}」。</p>`
      :eraLocked(era)?`<button class="btn" disabled style="width:100%">🔒 星槎還沒停靠${esc(eraLabel(era))}</button>`
      :`<button class="btn" id="yuShip" style="width:100%">⛵ 回星槎開往${esc(era==="classic"?"船艙":eraLabel(era))}</button><p class="muted" style="font-size:12.5px;margin:6px 0 0">換朝代只在星槎：開到${esc(eraLabel(era))}，下船走進園子，兩指拉遠看地圖，點發亮的「${esc(yuName(nx))}」。</p>`}
    <button class="btn ghost" id="yuBk" style="width:100%;margin-top:8px">🧭 全部路線</button>`;
    const q=s=>b.querySelector(s);if(q("#yuNx"))q("#yuNx").onclick=()=>{vibrate(5);yuGo(era,n)};
    /* 意見回饋 697：同一朝走步行小卡去園子（從驛站、擂台過去用 replace）；別朝只能回星槎開過去，不在這裡換朝代 */
    if(q("#yuPk"))q("#yuPk").onclick=()=>{vibrate(5);closeSheet();walk("park",()=>shipPark(era,/^#\/(journey\/(inn|play)|arena)/.test(location.hash)))};
    if(q("#yuShip"))q("#yuShip").onclick=()=>{vibrate(5);closeSheet();goUp("#/adventure",()=>shipGoTo(era))};
    q("#yuBk").onclick=()=>{vibrate(5);yuBook()}})}
/* 輿圖路線一覽（以前叫路引冊；11/9 起走完一條＝那一朝千秋印的輿圖邊亮，千秋印譜 07i2-seal.js） */
function yuBook(){const n=yuDoneN();
  sheet(`🧭 輿圖遊歷（走完 ${n}／13 條）`,b=>{b.innerHTML=`<p class="muted" style="font-size:13px;margin:0 0 8px;line-height:1.6">每個朝代有一條真實的路線。在石桌往事的園子裡兩指拉遠看地圖，點發亮的地名就能在那裡過一關，一天最多走 ${YU_DAY} 站。整條走完，那一朝千秋印的「🧭 輿圖」那一邊就亮了；13 條都走完得到稱號「行萬里路」。目前走過 ${yuStopsN()}／${YU_TOTAL} 站。${yuTitle()?"<br>🏅 你已經「行萬里路」了。":""}</p>
    <div class="stamp-grid">${ARENA_ORDER.filter(k=>YU_R[k]).map(k=>{const R=YU_R[k],P=yuOf(k);return`<button class="stamp-cell" data-yr="${k}">${yuSeal(k,!!P.done)}<b>${esc(eraLabel(k))}</b><small>${esc(R.t)}<br>${Math.min(P.n,R.s.length)}／${R.s.length} 站</small></button>`}).join("")}</div>`;
    b.querySelectorAll("[data-yr]").forEach(y=>y.onclick=()=>{vibrate(5);yuRouteSheet(y.dataset.yr)})})}
/* 第一次在石桌往事的園子裡：告訴玩家地圖可以點（06-cpu.js parkUi 呼叫；等操作提示、開局特效過去） */
function yuHintMaybe(host){if(store.get("yuHint",false))return;let n=0;const go=()=>{if(!host.isConnected||PARK_J!=="park"||n++>20)return;
    if(!store.get("parkHint",false)||document.querySelector(".pkhint,.kjfx,.npc-ask")||(typeof fxBusy==="function"&&fxBusy()))return setTimeout(go,1500);
    store.set("yuHint",true);const h=document.createElement("div");h.className="pkhint";h.innerHTML='<div class="pkh-hand">🧭</div><b>新玩法：輿圖遊歷</b><span>兩指捏合拉遠，看石台底下的朝代地圖<br>點發亮的地名，就能在那裡過一關</span>';host.append(h);setTimeout(()=>{h.classList.add("out");setTimeout(()=>h.remove(),500)},4500)};
  setTimeout(go,6000)}

/* 解題頁的設定（07c-canju.js CanjuPlay 呼叫）：r/<朝代>/<第幾站>、x/<冬至那年>/<第幾瓣>；err＝不能解 */
function cjXMode(id){let m=/^r\/(\w+)\/(\d+)$/.exec(id);if(m)return yuXM(m[1],+m[2]);m=/^x\/(\w+)\/(\d+)$/.exec(id);if(m)return xhXM(m[1],+m[2]);m=/^s\/(\w+)\/(.+)$/.exec(id);if(m&&typeof shipXM==="function")return shipXM(m[1],m[2]);m=/^ph\/(\w+)\/(.+)$/.exec(id);if(m&&typeof phXM==="function")return phXM(m[1],m[2]);m=/^b\/(\w+)\/(\d+)$/.exec(id);if(m&&typeof battleXM==="function")return battleXM(m[1],+m[2]);m=/^q\/(\w+)$/.exec(id);if(m&&typeof qqXM==="function")return qqXM(m[1]);return null}   /* 意見回饋 674：s/<朝代>/<題號>＝星槎主場殘局（07f-ship.js） */
function yuXM(era,i){const R=YU_R[era],s=R&&R.s[i],back=yuBackHash;if(!s)return{err:"找不到這一站（路線可能更新了）。",back};const N=R.s.length,n=Math.min(yuOf(era).n,N);
  if(i>n)return{err:`還沒走到這一站：先走第 ${n+1} 站「${yuName(R.s[n])}」。`,back};
  if(i===n&&!yuLeftToday())return{err:`今天已經走了 ${YU_DAY} 站，明天再上路。`,back};
  const nx=()=>{const j=Math.min(yuOf(era).n,N);return j<N&&j>i&&yuLeftToday()?j:-1};
  return{id:s.q,rk:"cjRunR",back,top:"🧭 輿圖遊歷",icon:"🧭",ans:"看答案這題就沒有修為和心得，這一站也不算過關，確定？",
    head:P=>`<b>🧭 ${esc(R.t)}・${esc(yuName(s))}（${i+1}／${N}）</b>・${esc(P.t)}・${cjLv(P.d)}　${cjEra(P)}<span class="muted">${cjSrc(P)}</span>`,
    mark:()=>yuMark(era,i),done:(o,ans)=>yuDoneHTML(era,i,o,ans),
    next:()=>{const j=nx();return j>=0?"#/canju/r/"+era+"/"+j:null},nextL:()=>{const j=nx();return j>=0?"下一站："+yuName(R.s[j]):"回園子"}}}
/* 不看答案解開：是下一站就前進一站、修為 +15；整條走完記下來；13 條都走完 → 稱號 */
function yuMark(era,i){const R=YU_R[era];if(!R)return null;const A=yuAll(),E=A[era]||(A[era]={n:0,at:[]}),N=R.s.length;E.at=E.at||[];let first=false,fin=false,title=false;
  if(i===(E.n||0)&&i<N){first=true;E.n=i+1;E.at[i]=Date.now();const D=yuDay();D.n++;store.set("yuDay",D);if(E.n>=N&&!E.done){E.done=Date.now();fin=true}}
  store.set("yuRoute",A);if(first)setTimeout(()=>addXP(15,"輿圖遊歷",`yu:${era}:${i}`),1600);
  if(fin&&!store.get("yuTitle",0)&&ARENA_ORDER.every(k=>!YU_R[k]||(A[k]&&A[k].done))){store.set("yuTitle",Date.now());setTimeout(()=>addXP(50,"行萬里路","yu:title"),3400);title=true}
  return{first,fin,title,n:E.n,N}}
function yuDoneHTML(era,i,o,ans){const R=YU_R[era],s=R.s[i],nm=esc(yuName(s));if(ans||!o)return`<p class="muted">看了答案，「${nm}」這一站還不算過關；不看答案解開才算。</p>`;
  if(!o.first)return`<p>🧭 「${nm}」之前就過關了（${esc(R.t)} ${Math.min(o.n,o.N)}／${o.N} 站）。</p>`;
  return`<div class="yu-done">${o.fin?yuSeal(era,true,true):'<span class="yu-ic">🧭</span>'}<div><b>${nm}過關！修為 +15</b><div class="muted">${esc(R.t)}：${o.n}／${o.N} 站${o.fin?"":`・今天還能走 ${yuLeftToday()} 站`}</div>
    ${o.fin?`<div class="yu-gold">整條路線走完了！地圖上的路線變成金色。</div>${typeof sealLitHTML==="function"?sealLitHTML(era,"yu"):""}`:""}${o.title?`<div class="yu-gold">🏅 13 條路線都走完了！得到稱號「行萬里路」，修為 +50</div>`:""}</div></div>`}

/* ---------- D．九九消寒圖 ---------- */
/* 81 題（canju-set.json 的題號），第 1 瓣最淺、第 81 瓣最深 */
const XH_Q=["sq033","gm2007-4nr33K1AR2b","sq088","gm2007-94A43AK1B2r","sq110","gm2003-B44A2rN4K4b","sq176","gm2009-C3cB93AKA3r","zx044","gm2005-44A42B1KC3r","jz044","gm2010-p491R1AKA3r","sq045","sq331","gm2005-3R4B3K56B2b","sq365","ys234","jz048","lk124c5","ys067c4","sq114c9","sq125c9","mr110","sq253","lk070c4","lk148c5","lk172c7","sq104c5","sq140c8","sq171c6","sq220","sq320","zx038","ys193","sq116c7","ys068c4","lk183","sq143","sq066","lk017c6","lk116c6","mr001","ys061c7","ys110","sq034c6","sq406c4","gm1990-B4A42B1KA3r","sq165c6","lk229c5","sq068","gm2004-A1p14A44K4r","sq352","lk058c5","lk121","lk253","mr011","mr057","lk243","sq112","mr012","lk132","sq412c6","sq275","sq198","sq264","lk199","sq111","mr055","lk166","mr056","sq067","sq336c5","lk026","lk045","sq015","gm2013-4B493AKAB2r","lk022","sq099","sq231","gm2011-24A44KA1r1r","sq242"];
/* 冬至的日期（臺灣時間）：用 Meeus《天文算法》第 27 章（含 24 個週期項）算的，例如 2025 年 12/21 23:03、2026 年 12/22 04:50、2027 年 12/22 10:42 */
const XH_SOL={2025:"2025-12-21",2026:"2026-12-22",2027:"2027-12-22",2028:"2028-12-21",2029:"2029-12-21",2030:"2030-12-22",2031:"2031-12-22",2032:"2032-12-21",2033:"2033-12-21",2034:"2034-12-22",2035:"2035-12-22",2036:"2036-12-21",2037:"2037-12-21",2038:"2038-12-22",2039:"2039-12-22",2040:"2040-12-21"};
const XH_FROM=2026,XH_MAKE=3,XH_NINE=["一九","二九","三九","四九","五九","六九","七九","八九","九九"];
/* 表外的年份：Meeus 的平均冬至公式（誤差在一小時內），換成臺灣時間的日期 */
function xhSol(y){if(XH_SOL[y])return XH_SOL[y];const Y=(y-2000)/1000,jd=2451900.05952+365242.74049*Y-.06223*Y*Y-.00823*Y*Y*Y+.00032*Y*Y*Y*Y;return new Date((jd-2440587.5)*864e5+8*36e5).toISOString().slice(0,10)}
const xhDN=k=>Math.floor(Date.parse(k+"T00:00:00Z")/864e5),xhKey=n=>new Date(n*864e5).toISOString().slice(0,10),xhMD=k=>(+k.slice(5,7))+"/"+(+k.slice(8,10));
/* 現在是哪一季、第幾天：season＝那一季冬至的年份（開發者預覽是 "dev"）；pre＝還沒上線（2026 年冬至以前）；active＝在九九裡；ended＝九九過了 */
function xhNow(){const today=localDay(),T=xhDN(today),y=+today.slice(0,4);let sy=y;if(T<xhDN(xhSol(y)))sy=y-1;
  const dev=typeof DEVMODE==="function"&&DEVMODE()?(store.get("xhDev",0)|0):0;
  if(dev>0){const day=Math.min(82,dev);return{season:"dev",dev:true,start:xhKey(T-day+1),end:xhKey(T-day+81),day,active:day<=81,ended:day>81,pre:false,next:xhSol(sy+1),cd:xhDN(xhSol(sy+1))-T}}
  const start=xhSol(sy),day=T-xhDN(start)+1,next=xhSol(sy+1);return{season:String(sy),start,end:xhKey(xhDN(start)+80),day,active:day>=1&&day<=81,ended:day>81,pre:sy<XH_FROM,next,cd:xhDN(next)-T}}
const xhMei=season=>(store.get("xhMei",{})||{})[season]||{};
function xhMake(){const d=localDay(),a=store.get("xhMake",null);return a&&a.d===d?a:{d,n:0}}
/* 每一瓣的狀態：done 染好了、today 今天的、open 可以補、lock 日子還沒到 */
function xhStateFn(N){const M=xhMei(N.season),t=N.pre?-1:N.active?N.day-1:81;return i=>M[i]?"done":i===t?"today":i<t?"open":"lock"}
function xhOpen(){const h=location.hash;if(!/^#\/(canju|xiaohan)/.test(h))store.set("xhBack",h);closeSheet();location.hash="#/xiaohan"}
function xhShort(N){if(N.pre)return`冬至 ${xhMD(N.next)} 開始・還有 ${N.cd} 天`;const c=Object.keys(xhMei(N.season)).length;
  return N.active?`${XH_NINE[Math.floor((N.day-1)/9)]}第 ${(N.day-1)%9+1} 天・已染 ${c}／81`:`已染 ${c}／81・下一個冬至還有 ${N.cd} 天`}

/* 一枝素梅：9 朵、每朵 9 瓣（一九在枝根，九九在枝梢）；st(i)＝第 i 瓣的狀態 */
const XH_B=[[62,292],[128,228],[82,135],[196,170],[163,92],[300,214],[258,118],[226,42],[318,52]];
function xhPetals(cx,cy,b,st,tap){let s="";for(let k=0;k<9;k++){const i=b*9+k,a=(-90+k*40)*Math.PI/180,x=cx+Math.cos(a)*13.5,y=cy+Math.sin(a)*13.5,c=st(i);
    s+=`<ellipse class="xh-p ${c}"${tap?` data-i="${i}"`:""} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="12.5" transform="rotate(${k*40} ${x.toFixed(1)} ${y.toFixed(1)})"/>`}
  /* 畫風一致性第 11 條（11/8）：花蕊改成墨點花鬚（原本黃色圓心） */
  let m="";for(let k=0;k<7;k++){const a=(-90+k*51.4)*Math.PI/180,x=cx+Math.cos(a)*5.2,y=cy+Math.sin(a)*5.2;m+=`<path d="M${cx} ${cy}L${x.toFixed(1)} ${y.toFixed(1)}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r=".9"/>`}
  return s+`<g class="xh-st" stroke="#2A1F15" stroke-width=".6" fill="#2A1F15">${m}<circle cx="${cx}" cy="${cy}" r="1.6" fill="#C9A23F" stroke="none"/></g>`}
/* 畫風一致性第 11 條（11/8）：梅枝改成水墨枯枝——每一筆照粗細漸變畫成實心筆觸（根粗梢細），加紙紋、皴擦飛白、苔點；花瓣位置不變 */
const XH_STROKES=[[[[[18,332],[70,292],[100,252],[140,216]],[[140,216],[185,176],[232,142],[270,96]],[[270,96],[290,72],[310,56],[346,34]]],13,1.6],
  [[[[140,216],[120,182],[104,156],[84,136]]],6.5,1.2],[[[[186,178],[190,146],[180,116],[165,94]]],5.5,1.2],[[[[232,142],[260,160],[284,188],[300,214]]],6,1.2],
  [[[[270,96],[256,76],[242,60],[228,44]]],4.6,1],[[[[96,252],[82,246],[68,248],[52,240]]],3.2,.6],[[[[300,214],[306,226],[310,238],[318,250]]],2.4,.5],[[[[318,52],[322,42],[326,32],[331,22]]],2.2,.5],[[[[84,136],[78,124],[74,114],[70,104]]],2,.5]];
function xhBrush(segs,w0,w1){const P=[];segs.forEach((g,si)=>{for(let i=si?1:0;i<=16;i++){const t=i/16,u=1-t;
    P.push([u*u*u*g[0][0]+3*u*u*t*g[1][0]+3*u*t*t*g[2][0]+t*t*t*g[3][0],u*u*u*g[0][1]+3*u*u*t*g[1][1]+3*u*t*t*g[2][1]+t*t*t*g[3][1]])}});
  const n=P.length,L=[],R=[];for(let i=0;i<n;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(n-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1,t=i/(n-1),
    w=(w0+(w1-w0)*Math.pow(t,.8))*(1+.12*Math.sin(i*1.7))/2;L.push([P[i][0]-dy/d*w,P[i][1]+dx/d*w]);R.push([P[i][0]+dy/d*w,P[i][1]-dx/d*w])}
  const q=a=>a.map(p=>p[0].toFixed(1)+" "+p[1].toFixed(1));return{d:"M"+q(L).join("L")+"L"+q(R.reverse()).join("L")+"Z",c:"M"+q(P).join("L")}}
function xhSVG(st){let p="";XH_B.forEach(([x,y],b)=>{p+=`<g>${xhPetals(x,y,b,st,true)}<text x="${b===6?x+40:x}" y="${b===6?y+4:y+38}" class="xh-t">${XH_NINE[b]}</text></g>`});
  let br="",dry="";for(const[s,w0,w1]of XH_STROKES){const B=xhBrush(s,w0,w1);br+=`<path d="${B.d}"/>`;if(w0>=4.5)dry+=`<path d="${B.c}" stroke-width="${(w0*.28).toFixed(1)}"/>`}
  const moss=[[44,312],[110,244],[158,200],[205,160],[246,128],[286,80],[121,196],[262,170]].map(([x,y],i)=>`<ellipse cx="${x}" cy="${y}" rx="${1.6+i%3*.5}" ry="${1.1+i%2*.4}" transform="rotate(${i*37} ${x} ${y})"/>`).join("");
  return`<svg class="xh-svg" viewBox="0 0 360 340" role="img" aria-label="九九消寒圖：一枝素梅，九朵、每朵九瓣"><defs><filter id="xhRough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>
    <filter id="xhPaper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75 .12" numOctaves="3" seed="3"/><feColorMatrix values="0 0 0 0 .42 0 0 0 0 .34 0 0 0 0 .24 0 0 0 -1.15 .58"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <radialGradient id="xhWash" cx=".5" cy=".5" r=".72"><stop offset=".6" stop-color="#2A1F15" stop-opacity="0"/><stop offset="1" stop-color="#2A1F15" stop-opacity=".1"/></radialGradient></defs>
    <rect x="0" y="0" width="360" height="340" rx="14" fill="#F4EDDC"/><rect x="0" y="0" width="360" height="340" rx="14" fill="#F4EDDC" filter="url(#xhPaper)" opacity=".55"/><rect x="0" y="0" width="360" height="340" rx="14" fill="url(#xhWash)"/>
    <g fill="#2A2420" fill-opacity=".9" filter="url(#xhRough)">${br}</g><g fill="none" stroke="#F4EDDC" stroke-opacity=".5" stroke-linecap="round" stroke-dasharray="1.2 3.4 .6 5" filter="url(#xhRough)">${dry}</g>
    <g fill="#1A1410" fill-opacity=".85">${moss}</g>${p}<rect x="320" y="296" width="24" height="30" rx="2" fill="#B3261E" opacity=".86"/><path d="M325 302h14M325 311h14M325 320h14M332 300v22" stroke="#F4EDDC" stroke-width="1.6" opacity=".9"/></svg>`}
function xhMini(i,season){const b=Math.floor(i/9),M=xhMei(season);return`<svg viewBox="-30 -30 60 60" width="58" height="58" style="flex:none">${xhPetals(0,0,b,j=>M[j]?(j===i?"done new":"done"):"lock",false)}</svg>`}

/* 消寒圖頁 #/xiaohan */
function XiaohanPage(v){const bk=(()=>{const h=store.get("xhBack","");return typeof h==="string"&&/^#\//.test(h)&&!/^#\/(canju|xiaohan)/.test(h)?h:"#/"})();
  setTop("❄ 九九消寒圖",bk);if(typeof setTabs==="function")setTabs(false);v.className="view";
  const HX=`<div class="card xh-hist"><b>📜 九九消寒圖</b><p>民間從冬至那天開始「數九」：每九天是一個「九」，數完九個九、八十一天，天氣就暖和了。明朝劉侗、于奕正寫的《帝京景物略》記載北京人的習俗：「日冬至，畫素梅一枝，為瓣八十有一，日染一瓣。」——冬至那天畫一枝白梅，一共八十一片花瓣，每天染紅一片；花瓣染完，九九也過完，春天就來了。</p><p class="muted" style="font-size:13px;margin:0">這裡把它換成一天一題殘局：解開，就染一瓣。題目從淺到深，都經過 Pikafish 驗證。</p></div>`;
  const HOW=`<details class="card"><summary><b>怎麼玩</b></summary><p class="muted" style="line-height:1.7;margin:6px 0 0">冬至那天起，每天開放一瓣（第幾天就是第幾瓣）。點那一瓣、或按「解今天這一瓣」，不看答案解開，花瓣就染紅。<br>漏掉的日子可以補做，一天最多補 ${XH_MAKE} 瓣；九九過了也能慢慢補。<br>每開滿一朵（9 瓣）修為 +10，81 瓣都染完得到稱號「九九消寒」，修為 +30。這些題不算今日茶單。</p></details>`;
  const draw=()=>{if(!v.isConnected)return;const N=xhNow(),st=xhStateFn(N),M=xhMei(N.season),cnt=Object.keys(M).length,mk=xhMake(),mkLeft=Math.max(0,XH_MAKE-mk.n);
    const opens=[];for(let i=0;i<81;i++)if(st(i)==="open")opens.push(i);const t=N.active?N.day-1:-1;
    const dev=typeof DEVMODE==="function"&&DEVMODE()?`<div class="card xh-dev">🛠 開發者預覽${N.dev?`：假裝是第 ${N.day} 天${N.day>81?"（九九已過）":""}（另存在 "dev"，不動真的進度）<div class="xh-devb"><button class="btn ghost" data-dv="-1">−1 天</button><button class="btn ghost" data-dv="1">＋1 天</button><button class="btn ghost" data-dv="9">＋9 天</button><button class="btn ghost" data-dv="0">結束預覽</button></div>`:`<div class="xh-devb"><button class="btn ghost" data-dv="1">從冬至第 1 天開始預覽</button></div>`}</div>`:"";
    let head,acts="";
    if(N.pre){head=`<div class="xh-cd"><b>❄ 還有 ${N.cd} 天到冬至</b><span>${N.next.slice(0,4)} 年冬至是 ${xhMD(N.next)}。那天起 81 天，每天一題殘局，解開就染一瓣梅花。</span></div>`}
    else{const b=N.active?Math.floor(t/9):8;head=`<div class="xh-cd"><b>${N.active?`❄ 今天是${XH_NINE[b]}第 ${t%9+1} 天`:"🌸 九九過完了"}</b><span>${N.dev?"預覽":N.season+" 年冬至"}（${xhMD(N.start)}）起・到 ${xhMD(N.end)}・已染 <b>${cnt}</b>／81 瓣${N.ended?`・下一個冬至 ${xhMD(N.next)}（還有 ${N.cd} 天）`:""}</span></div>`;
      if(N.active)acts+=st(t)==="done"?`<button class="btn ghost" disabled>✔ 今天這一瓣染好了</button>`:`<button class="btn" data-go="${t}">❄ 解今天這一瓣（${XH_NINE[b]}第 ${t%9+1} 瓣）</button>`;
      if(opens.length)acts+=mkLeft?`<button class="btn${N.active&&st(t)!=="done"?" ghost":""}" data-go="${opens[0]}">補做一瓣（還有 ${opens.length} 瓣沒染・今天還能補 ${mkLeft} 瓣）</button>`:`<button class="btn ghost" disabled>今天補了 ${XH_MAKE} 瓣，明天再補（還有 ${opens.length} 瓣）</button>`;
      if(!acts&&cnt>=81)acts=`<div class="yu-gold" style="text-align:center">🏅 81 瓣都染完了，春天到了！稱號「九九消寒」</div>`}
    v.innerHTML=`<div class="pad xh">${dev}<div class="card">${head}</div><div class="xh-art">${xhSVG(st)}</div>
      <div class="xh-lg"><span><i class="xh-dot done"></i>染好了</span><span><i class="xh-dot today"></i>今天</span><span><i class="xh-dot open"></i>可以補</span><span><i class="xh-dot lock"></i>還沒到</span></div>
      ${acts?`<div class="xh-acts">${acts}</div>`:""}${HX}${HOW}</div>`;
    const go=i=>{const s=st(i);if(s==="lock")return toast(N.pre?"冬至還沒到":"這一瓣的日子還沒到");if(s==="done")return toast("這一瓣已經染好了");if(s==="open"&&!mkLeft)return toast(`今天補了 ${XH_MAKE} 瓣，明天再補`);vibrate(5);location.hash="#/canju/x/"+N.season+"/"+i};
    v.querySelectorAll("[data-i]").forEach(e=>e.addEventListener("click",()=>go(+e.dataset.i)));v.querySelectorAll("[data-go]").forEach(e=>e.onclick=()=>go(+e.dataset.go));
    v.querySelectorAll("[data-dv]").forEach(e=>e.onclick=()=>{vibrate(5);const d=+e.dataset.dv,c=store.get("xhDev",0)|0;store.set("xhDev",d===0?0:Math.max(1,Math.min(82,(c||0)+d)));draw()})};
  draw();return{}}
/* 燈籠：節令小卡（石桌往事的園子裡點燈籠，06-cpu.js parkInfo；秘境棋友先檢查） */
function xhLantern(era){const N=xhNow(),E=PARK_INFO[era]||PARK_INFO.classic,ln=E.lantern;vibrate(5);
  sheet("❄ 節令・九九消寒圖",b=>{b.innerHTML=`<p class="gd-hist" style="font-size:15px">${N.pre?`冬至還有 <b>${N.cd}</b> 天（${xhMD(N.next)}）。那天起 81 天，每天一題殘局，解開就染一瓣梅花——這是明朝北京人「九九消寒圖」的習俗。`:N.active?`今天是${XH_NINE[Math.floor((N.day-1)/9)]}第 ${(N.day-1)%9+1} 天，消寒圖已染 ${Object.keys(xhMei(N.season)).length}／81 瓣。`:`九九過完了，消寒圖已染 ${Object.keys(xhMei(N.season)).length}／81 瓣；沒染的花瓣每天還能補 ${XH_MAKE} 瓣。`}</p>
    <button class="btn" id="xhGo" style="width:100%">打開消寒圖</button>${ln?`<p class="muted" style="font-size:12.5px;margin:10px 0 0">這盞${esc(ln[0])}：${esc(ln[1])}</p>`:""}`;b.querySelector("#xhGo").onclick=()=>xhOpen()})}
function xhMark(season,i,st){const A=store.get("xhMei",{})||{},M=A[season]||(A[season]={});if(M[i])return{first:false,season};M[i]=Date.now();store.set("xhMei",A);
  if(st==="open"){const m=xhMake();m.n++;store.set("xhMake",m)}
  const b=Math.floor(i/9),bf=[0,1,2,3,4,5,6,7,8].every(k=>M[b*9+k]),cnt=Object.keys(M).length,real=season!=="dev";let title=false;
  if(bf&&real)setTimeout(()=>addXP(10,"消寒圖",`xh:${season}:${b}`),1600);
  if(cnt>=81){const T=store.get("xhTitle",{})||{};if(!T[season]){T[season]=Date.now();store.set("xhTitle",T);title=true;if(real)setTimeout(()=>addXP(30,"九九消寒",`xh:${season}:all`),3400)}}
  return{first:true,season,b,bf,cnt,title,make:st==="open"}}
const xhTitle=()=>Object.keys(store.get("xhTitle",{})||{}).some(k=>k!=="dev")?"九九消寒":"";
function xhXM(season,i){const back=()=>"#/xiaohan",N=xhNow();if(N.pre)return{err:"冬至還沒到，九九消寒圖還沒開始。",back};
  if(season!==N.season||!(i>=0&&i<81))return{err:"這一瓣不是這一季消寒圖上的。",back};
  const st=xhStateFn(N)(i);if(st==="lock")return{err:"這一瓣的日子還沒到。",back};if(st==="open"&&xhMake().n>=XH_MAKE)return{err:`今天已經補了 ${XH_MAKE} 瓣，明天再補。`,back};
  return{id:XH_Q[i],rk:"cjRunX",back,top:"❄ 九九消寒圖",icon:"❄",ans:"看答案這題就沒有修為和心得，這一瓣也不會染上顏色，確定？",
    head:P=>`<b>❄ ${XH_NINE[Math.floor(i/9)]}第 ${i%9+1} 瓣${st==="open"?"（補做）":""}</b>・${esc(P.t)}・${cjLv(P.d)}　${cjEra(P)}<span class="muted">${cjSrc(P)}</span>`,
    mark:()=>xhMark(season,i,st),done:(o,ans)=>xhDoneHTML(i,o,ans),next:()=>null,nextL:()=>"回消寒圖"}}
function xhDoneHTML(i,o,ans){if(ans||!o)return`<p class="muted">看了答案，這一瓣還不會染上顏色；不看答案解開才算。</p>`;if(!o.first)return`<p>❄ 這一瓣之前就染好了。</p>`;
  return`<div class="yu-done">${xhMini(i,o.season)}<div><b>❄ ${XH_NINE[o.b]}第 ${i%9+1} 瓣染上了${o.make?"（補做）":""}</b><div class="muted">消寒圖已染 ${o.cnt}／81 瓣${o.make?`・今天還能補 ${Math.max(0,XH_MAKE-xhMake().n)} 瓣`:""}</div>
    ${o.bf?`<div class="yu-gold">🌸 ${XH_NINE[o.b]}這朵梅花開滿了！${o.season!=="dev"?"修為 +10":""}</div>`:""}${o.title?`<div class="yu-gold">🏅 81 瓣都染完了，春天到了！得到稱號「九九消寒」${o.season!=="dev"?"，修為 +30":""}</div>`:""}</div></div>`}

/* 今日茶單不出這些題（棋史卡 C、輿圖遊歷 B、消寒圖 D 用的；07c-canju.js cjToday） */
function cjReserved(){if(cjReserved.S)return cjReserved.S;const S=new Set(XH_Q);for(const k in YU_R)for(const s of YU_R[k].s)S.add(s.q);if(typeof HIST!=="undefined")for(const k in HIST)for(const q of HIST[k].q)S.add(q);return cjReserved.S=S}

/* ---------- 入口：驛站「🌸 園子棋友」那一列、我的角色小卡（07d-garden.js 的 gardenInn／gardenMeCard 呼叫） ---------- */
function garden2InnHTML(){return`<button class="item" id="gdYu"><span class="lb" style="font-size:22px">🧭</span><span class="tx"><b>輿圖遊歷${yuTitle()?"・🏅 行萬里路":""}</b><span>走完 ${yuDoneN()}／13 條・${yuStopsN()}／${YU_TOTAL} 站</span></span><span class="muted">›</span></button><button class="item" id="gdXh"><span class="lb" style="font-size:22px">❄</span><span class="tx"><b>九九消寒圖${xhTitle()?"・🏅 九九消寒":""}</b><span>${esc(xhShort(xhNow()))}</span></span><span class="muted">›</span></button>`}
function garden2MeHTML(){const N=xhNow();return`<button id="gdMeY"><span>🧭</span><b>輿圖遊歷</b><small>走完 ${yuDoneN()}／13 條</small></button><button id="gdMeX"><span>❄</span><b>消寒圖</b><small>${N.pre?`冬至還有 ${N.cd} 天`:`已染 ${Object.keys(xhMei(N.season)).length}／81`}</small></button>`}
function garden2Bind(box){for(const id of["#gdYu","#gdMeY"]){const e=box.querySelector(id);if(e)e.onclick=()=>{vibrate(5);yuBook()}}for(const id of["#gdXh","#gdMeX"]){const e=box.querySelector(id);if(e)e.onclick=()=>{vibrate(5);xhOpen()}}}
