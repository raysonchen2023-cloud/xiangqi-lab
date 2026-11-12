/* ================= 🌸 朝代園子新玩法（意見回饋 658，開發者 11/6 選 A、C）=================
   只出現在石桌往事的園子（st.journey==="park"／PARK_J==="park"），不碰積分挑戰、擂台、線上對戰；沒有付費、抽卡、新貨幣，獎勵只有收藏、稱號、少量修為。
   A．路人回家＋委託
      PARK_NPC 的 20 位女棋手各有家鄉朝代 era（06-cpu.js），在家鄉朝代的園子遇到她的機率約 70%（parkNpcNew）。
      回饋 856（開發者 11/9：女棋手分普通／稀有／傳說、機率加保底）：還沒遇過的稀有、傳說機率低、越久沒遇到越高（06-cpu.js WM_RK、NPC_RARE）；
      羈絆冊每位的頭像框用等級框色（珍品的 RELIC_RK），稀有、傳說右上角蓋「稀」「傳」小印（07v-relicdrop.js 的 .rd-seal），冊頂一行框色說明（npcRkTop）。
      沒遇過的稀有、傳說也先露出框色和小印、不露名字和朝代：讓玩家知道還有難得的人（有期待），又不說去哪裡找（意見回饋 544「讓玩家自己撞見」）。
      園子開局時她偶爾（每天最多 2 次）說「我卡在一盤棋」：先跳一張小卡（幫她看看／下次），不打斷對局；題目從 quiz.json 依玩家程度挑。
      解對羈絆 +1（最多 3 級）：每級解開一張身分小卡（她那個朝代真實的背景）、一句新台詞、修為 +10；滿級她寫一封信寄到驛站的「📮 信箱」。
   C．象棋從哪裡來
      石桌往事的園子裡點石桌（秘境棋友先檢查，06-cpu.js parkInfo），跳出這個朝代的棋史卡，附 3 題古法殘局（canju-set.json 驗證過的題）。
      解題用一盞茶殘局的解題頁 #/canju/h/<朝代>/<題號>（07c-canju.js，不算茶單）；13 張都至少不看答案解開 1 題 → 稱號「棋史通」＋修為 30。
   存檔（store）：npcBond＝{女棋手 id:{m:第一次遇到的時間,n:羈絆 0～3,r:信讀過了}}；npcAsk＝{d:日期,n:今天問了幾次,g:最後問的那盤 id}；npcAskSeen＝出過的題號；
        histSeen＝{朝代:看過棋史卡的時間}；histSolved＝{朝代:{題號:時間}}；histTitle＝拿到「棋史通」的時間；histBack＝解完題要回去的網址 */

/* ---------- A．女棋手的羈絆：c＝三張身分小卡（照史實；小說、戲曲會寫明），l＝三句新台詞，mail＝滿級的信；tale＝這個身分正史沒有記載（說書人筆下） ---------- */
const NPC_BOND={
  w01_tang_lady:{c:["唐朝人愛牡丹愛到入迷。劉禹錫〈賞牡丹〉寫：「唯有牡丹真國色，花開時節動京城。」","白居易〈買花〉寫長安人搶買牡丹：「一叢深色花，十戶中人賦」——一叢好牡丹，抵得上十戶中等人家一年的稅。","唐朝女子愛拿團扇、穿高腰長裙；傳為周昉所畫的〈簪花仕女圖〉，畫的就是頭上簪著大花的貴婦。"],
    l:["這盤棋，我要畫在團扇背面。","長安一到春天，滿城的人都去看花，連棋攤都沒人了。","下次來長安，我帶你去曲江邊走走。"],
    mail:"見字如面。長安的牡丹又開了，我在團扇背面畫了一張小棋盤，上面是你那天贏我的那一手。等花謝了，我就把扇子收進箱底，明年再拿出來看。哪天你路過長安，記得來找我下棋。——牡丹娘子"},
  w02_song_tea:{c:["宋徽宗寫過一本《大觀茶論》，專講怎麼點茶：先把茶粉調成膏，再一邊注水、一邊用茶筅擊拂出白沫。","宋人比賽點茶叫「鬥茶」。蔡襄《茶錄》說，看誰的茶沫先退、盞邊先露出水痕，先露的就輸了。","點茶最講究用黑釉的建盞，《茶錄》說茶色白、宜黑盞，黑盞最能襯出白色的茶沫。"],
    l:["茶沫要打得像雪，棋要下得像水。","鬥茶是水痕先出來的輸；下棋是先露破綻的輸。","我叫青盞，可是鬥茶其實要用黑盞——這盞茶，點給你。"],
    mail:"上回你走後，我照《大觀茶論》又練了好多遍，茶沫總算能咬住盞邊不散了。坊裡的客人說，我點茶時的神情，跟那天看你下棋時一模一樣。春茶下來，我留一餅給你，你一定要來喝。——青盞"},
  w03_yuan_rider:{c:["蒙古人從小在馬背上長大，男女都會騎馬。元朝在各地設了一千多處驛站（叫「站赤」），靠快馬一站接一站傳遞公文。","元朝皇帝每年夏天到上都（今天內蒙古正藍旗一帶）避暑，大批人馬在大都和上都之間來回。","《元朝秘史》記載，成吉思汗的母親訶額侖在丈夫死後，獨自帶著孩子們在草原上活了下來。"],
    l:["跑馬要看路，下棋要看三步。","夏天大家都往上都去，草原上熱鬧得很！","下次我借你一匹好馬，我們比比誰先到河邊。"],
    mail:"我騎馬跑了三天，請驛站的人把這封信帶給你。草原上的草長高了，我教妹妹下棋，跟她說馬要走日字，她說這樣太慢，不如騎真的馬。你說好笑不好笑？等秋天馬肥了，來草原，我們下一整夜的棋。——草原上的騎手"},
  w04_ming_scholar:{tale:1,c:["明朝的科舉只准男子應考，想讀書的女子多半只能在家裡跟著父兄學。","女扮男裝去讀書，多是戲曲和民間故事裡的情節：除了梁山伯與祝英台，明朝徐渭的雜劇《女狀元》，演的是黃崇嘏女扮男裝考中狀元。","明末清初江南的才女黃媛介，詩、書、畫都好，靠賣字畫養活一家人。"],
    l:["小生……咳，我只是想多讀幾本書。","要是能進考場，我也想試試。","你是第一個看穿我、又沒說破的人。"],
    mail:"某兄台鑒：……好吧，不裝了。謝謝你那天看穿了我，卻一個字也沒說。你教我的那幾步棋，我抄在書頁邊上，夾在《論語》裡。等哪天書院也收女學生，我第一個去報名，再找你下一盤。——你知道是誰"},
  w05_qing_gege:{c:["「格格」原是滿語，清朝用來稱呼王公貴族家的女兒。","旗人婦女穿「旗裝」，腳下穿鞋底中間墊著高木跟的「花盆底」鞋，走起路來搖搖擺擺。","清末北京的茶館裡有專門下棋的「棋茶館」，泡一壺茶，就能在棋盤前坐上一整天。"],
    l:["阿瑪要是問起，你就說沒見過我。","府裡的嬤嬤只教我繡花，棋是我偷看來的。","下回我從府裡帶點心來，你可別說出去。"],
    mail:"這封信是叫小丫鬟偷偷送出來的，你看完記得燒掉——算了，留著也行。阿瑪終於知道我會下棋了，還說我的車用得比府裡的師爺好。他沒罵我，反倒叫我教弟弟。都是你陪我下了那麼多盤。——溜出府的格格"},
  w06_swordswoman:{tale:1,c:["唐朝裴鉶的傳奇小說〈聶隱娘〉，寫一位從小被尼姑帶走、學成劍術的女俠。這是小說，不是正史。","另一篇唐傳奇〈紅線〉（袁郊《甘澤謠》），寫婢女紅線夜裡潛進敵營，偷走床頭的金盒，化解了一場戰爭。","《舊唐書．輿服志》記載，開元年間有女子穿起男人的衣衫、靴子，騎馬出門。"],
    l:["劍要收得住，棋也一樣。","江湖上的事，說書人說得比真的還精彩。","下次遇到麻煩，就朝天吹三聲口哨。"],
    mail:"我又要往南走了，臨走前把這封信託給驛站。江湖上沒什麼人能陪我安安靜靜坐一個時辰，你是一個。劍我不教你，棋我倒是還想再輸你幾盤。下次見面，不必問我從哪裡來。——路過的人"},
  w07_fisher_girl:{c:["宋朝江南河道縱橫、稻米豐收，當時有句俗話：「蘇湖熟，天下足。」","范仲淹〈江上漁者〉寫：「江上往來人，但愛鱸魚美。君看一葉舟，出沒風波裡。」說的就是漁人的辛苦。","張擇端〈清明上河圖〉裡的汴河上船來船往，可見宋朝靠水吃飯的人非常多。"],
    l:["魚要等，棋也要等。","大家只愛吃鱸魚，誰知道打魚的人多辛苦。","下回你來，我撐船帶你去看蘆葦。"],
    mail:"今年秋天魚多，我爹說是你那天讓我贏了一盤，帶來的好運——我才不信，那盤明明是我自己贏的。我在船頭刻了一個小棋盤，等魚的時候自己擺。你哪天來水鄉，我撐船去渡口接你。——漁家女"},
  w08_embroider:{c:["蘇繡和湘繡、粵繡、蜀繡並稱「四大名繡」，清朝的蘇州到處都是繡莊。","清末蘇州繡娘沈壽，把西洋畫的光影繡進作品，1911 年她繡的〈意大利皇后像〉在義大利的萬國博覽會得了大獎。","沈壽晚年口述刺繡的方法，由張謇記下來，寫成《雪宦繡譜》。"],
    l:["一根線要劈成好幾絲，比下棋還要細心。","繡錯一針要拆好久，下錯一步也是。","我想繡一幅棋盤送你。"],
    mail:"那幅棋盤終於繡好了，楚河漢界用的是藍線，紅黑兩邊的棋子各十六顆，一顆都沒少。繡到「炮」的時候，我想起你那天的雙炮，笑得手一抖，又拆了重繡。託驛站帶給你，下雨天記得收好。——蘇州繡娘"},
  w09_qin_player:{c:["東漢末年的蔡琰（蔡文姬）精通音律，《後漢書》說她「博學有才辯，又妙於音律」。","相傳蔡琰小時候聽父親蔡邕彈琴，琴弦斷了，她一聽就說出是第幾根。","漢朝人說「琴者，禁也」（班固《白虎通》），彈琴是用來收住心性的。"],
    l:["棋聲跟琴聲一樣，有快有慢。","斷了一根弦，我也聽得出是哪一根。","這首曲子還沒名字，就叫它〈對弈〉吧。"],
    mail:"這幾天，我把我們那盤棋一步一個音，彈成了一首曲子。你的炮落下的那一手，我用了最低的那根弦，聽起來像遠處打雷。曲子不長，等你來，我彈給你聽；你說哪裡不像，我再改。——琴師"},
  w10_general:{c:["隋朝末年天下大亂，李淵的女兒平陽公主在關中招兵，她的軍隊號稱「娘子軍」。","平陽公主下葬時，唐高祖特地用軍樂送她，說她曾「親執金鼓」、為起兵立過大功。","隋朝的府兵平時種田、閒時練兵，打仗時才上戰場。"],
    l:["排兵布陣跟下棋一樣，要先想好退路。","娘子軍的旗子，我也想扛一次。","等我當上真正的將軍，你來當我的軍師。"],
    mail:"軍中不能寫太長的信，我就寫幾句。這陣子我每天早上練兵，晚上在沙盤上擺你教我的那幾步。有個老兵說我的布陣像下象棋，我說本來就是。等仗打完了，我回來找你下棋，這次換我讓你先手。——少年將軍"},
  w11_yuan_falconer:{c:["元朝宮廷設有專門養鷹的「鷹房」，替皇帝養鷹打獵的人叫「昔寶赤」。","最受珍愛的獵鷹叫「海東青」，產在東北，遼、金、元的皇帝都很喜歡。","《元史》記載，冬春之交皇帝會到近郊放鷹捕獵，叫做「飛放」。"],
    l:["鷹在天上看得遠，下棋也要看得遠。","海東青可不是誰都養得起的。","下次我讓我的鷹，在你頭上繞一圈。"],
    mail:"我的鷹昨天抓到一隻野兔，叼回來放在我腳邊，得意的樣子就跟你那天吃掉我的車一樣。冬天要到了，我要跟著隊伍去飛放，好一陣子不能來園子。你別把棋放下，等我回來，再比一次誰看得遠。——馴鷹的姑娘"},
  w12_yuan_merchant:{c:["元朝疆域很大，商隊從西域穿過沙漠來到大都，帶來香料、寶石和玻璃器。","威尼斯人馬可．波羅說自己在元朝住了十七年，他的遊記讓歐洲人知道了東方的大都。","元朝發行紙鈔，像「中統元寶交鈔」，商人做買賣不必扛著一袋袋銅錢。"],
    l:["做生意要算，下棋也要算。","駝鈴一響，我就知道又要上路了。","我從撒馬爾罕帶了一副棋，下次給你看。"],
    mail:"商隊已經出了玉門，再往西就是沙漠了。我把你送我的那顆木頭卒子掛在駝鈴旁邊，走一步響一聲。阿爹說明年春天商隊還會回大都，到時候我給你帶西域的葡萄乾，你給我下一盤好棋。——商隊的姑娘"},
  w13_yuan_singer:{c:["元朝雜劇非常興盛，城裡演戲的地方叫「勾欄」；關漢卿、王實甫都是那時候的劇作家。","元朝夏庭芝的《青樓集》記下了一百多位女演員，像珠簾秀，關漢卿還寫過曲子送給她。","一本元雜劇通常分四折，由一位主角從頭唱到尾。"],
    l:["一齣戲有四折，一盤棋也有開局、中局、殘局。","台下有人叫好，我才唱得下去。","下回演〈竇娥冤〉，我給你留個好位子。"],
    mail:"新戲開演了，班主讓我唱正旦。我在後台緊張得手發抖，就想起你那天下到殘局還那麼穩。台上我一個字也沒唱錯。下回演出，最前排的位子留給你——別帶棋盤來，要專心看戲。——勾欄的女伶"},
  w14_yuan_porcelain:{c:["元朝在景德鎮設了「浮梁磁局」，專門管理燒造瓷器。","元青花的藍色，用的是從西亞運來的鈷料，燒出來特別鮮豔。","元青花大量外銷，今天伊朗、土耳其的博物館都收藏了不少元朝的青花大盤。"],
    l:["青花一筆畫下去就不能改，跟落子一樣。","窯裡的火候差一點，整窯就毀了。","我在碗底畫了一個小棋盤，送你。"],
    mail:"窯開了，這一窯燒得很好。我偷偷在一隻小碗的碗底，用青花畫了一盤殘局，就是我們上次下的那一盤；最後一步我沒畫，留給你填。碗託驛站帶去，小心別摔了。——畫青花的女工"},
  w15_yuan_archer:{c:["蒙古騎兵擅長騎射，能在奔馳的馬上回身拉弓。","《馬可．波羅遊記》記載，海都汗的女兒（忽禿倫）力大無比，想娶她的人得先摔跤贏過她。","《元朝秘史》記載，神箭手哲別原本是敵方的人，曾一箭射倒成吉思汗的戰馬，後來成了他的大將。"],
    l:["拉弓要穩，下棋也要穩。","聽說有位公主，摔跤從來沒輸過。","下次來，我教你拉弓。"],
    mail:"今天射箭，十箭中了九箭；剩下那一箭，是我想到你那天的車突然殺回來，手一抖射偏了。哼，都是你害的。秋天草原上有射箭的聚會，你來看我射，看完再下棋。——草原女射手"},
  w16_ming_poet:{c:["明朝江南出了很多女詩人，姐妹、母女之間常寫詩互相唱和。","明末吳江的沈宜修和女兒葉紈紈、葉小鸞都會寫詩，丈夫葉紹袁把一家人的詩文編成《午夢堂集》。","明朝蘇州、南京、杭州的書坊很多，印了大量的詩集和小說。"],
    l:["一首好詩跟一盤好棋一樣，最後一句最難。","我想跟姐妹們結個詩社。","我寫了一句詩給你：「楸枰一局江南雨」。"],
    mail:"那首詩我寫完了，題目叫〈園中對弈〉，最後一句改了十幾遍，終於用了你那天的「一車定乾坤」。姐妹們讀了都說好，我說那是跟一位棋友學的。附上詩稿一張，不許笑我的字。——江南才女"},
  w17_ming_pipa:{c:["明朝南京秦淮河兩岸非常繁華，余懷《板橋雜記》記下了明末秦淮河畔的人物和風光。","明末王猷定〈湯琵琶傳〉寫琵琶高手湯應曾彈〈楚漢〉，聽的人彷彿聽見了戰場上的金鼓聲。","她常念的「大珠小珠落玉盤」，出自唐朝白居易的〈琵琶行〉。"],
    l:["琵琶四根弦，棋盤九條線。","秦淮河的燈一亮，船上就有人彈曲子。","下次我彈一段〈楚漢〉給你聽——跟棋盤上的楚河漢界是同一場仗。"],
    mail:"那晚秦淮河上的燈很亮，我在船頭彈了一段〈楚漢〉，彈到垓下那裡，滿船的人都不出聲。我心裡想的卻是你那盤棋——楚河漢界，原來都在同一張桌上。等你來南京，我再為你彈一次。——秦淮琵琶女"},
  w18_ming_doctor:{c:["明朝無錫的女醫談允賢，跟著祖母學醫，專門替婦女看病。","談允賢五十歲時把自己的病案寫成《女醫雜言》，是中國很早的女醫師著作。","明朝李時珍花了將近三十年，寫成收錄一千八百多種藥物的《本草綱目》。"],
    l:["看病要望聞問切，下棋也要先看清楚。","有些病只有女醫能看，所以我一定要學好。","你這陣子臉色不錯，棋也下得好。"],
    mail:"最近看診的人多，我每晚都把病案記下來，學談允賢老前輩那樣。累的時候，就擺一盤我們下過的棋，擺完心就靜了。給你配了一包安神的茶，別熬夜下棋。——背藥箱的女大夫"},
  w19_ming_teahouse:{c:["明太祖朱元璋下令停止進貢壓成餅的團茶，改進散茶，用沸水沖泡散茶從此流行起來。","明末張岱在《陶庵夢憶》裡寫過一家茶館，他還替那家茶館取名「露兄」。","明朝下象棋的人很多，《適情雅趣》、《橘中秘》都是當時刻印流行的棋譜。"],
    l:["客官，這壺茶喝完，再下一盤嘛！","我爹說，茶館開得久，靠的是熟客。","你的位子，我天天都留著。"],
    mail:"客官見字：你常坐的那張靠窗的桌子，我天天擦得乾乾淨淨，誰也不讓坐。我爹說這是做生意的大忌，可他自己也常望著門口問：「那位下棋的客人怎麼還沒來？」新茶到了，等你。——茶館少東家"},
  w20_ming_guard:{tale:1,c:["正史裡沒有女捕快的記載；明清的衙門遇到女犯，是請「官媒」、「穩婆」來幫忙看管、查驗。","女捕快、女俠的故事多半出自說書人和小說，像清朝文康《兒女英雄傳》裡的俠女十三妹。","明朝的捕快屬於州縣衙門，負責捉拿盜賊，有點像今天的刑警。"],
    l:["人跑得掉，棋可跑不掉。","說書的總把女捕快講得神乎其神，其實我們也得巡夜。","你這人可疑——可疑得太會下棋了。"],
    mail:"奉命巡街，經過驛站，順手寫封信。這陣子城裡太平，我閒得發慌，把你那盤棋在衙門的公案上擺了三遍，被大人看見，罰我抄卷宗。值得。下回巡到園子，咱們再過一盤。——女捕快"}};
const npcBonds=()=>store.get("npcBond",{})||{};
const bondOf=id=>npcBonds()[id]||{m:0,n:0};
const bondHearts=n=>"♥".repeat(n)+"♡".repeat(Math.max(0,3-n));
const NPC_W=()=>PARK_NPC.filter(n=>n.era&&NPC_BOND[n.id]);
/* 遇到她：記下第一次遇到的時間（羈絆冊才看得到她，沒遇過的顯示「？」） */
function npcMet(n){if(!n||!NPC_BOND[n.id])return;const M=npcBonds();if(M[n.id]&&M[n.id].m)return;M[n.id]={...(M[n.id]||{n:0}),m:Date.now()};store.set("npcBond",M)}
/* 打招呼：有羈絆就從解開的台詞裡挑一句 */
function npcHello(N){const D=N&&NPC_BOND[N.id],b=N?bondOf(N.id):null;if(!D||!b||!b.n)return null;return D.l[Math.floor(Math.random()*Math.min(3,b.n))]}
function npcAskDay(){const d=localDay();let a=store.get("npcAsk",null);if(!a||a.d!==d)a={d,n:0,g:null};return a}
/* 開局時偶爾來委託：只有石桌往事的園子、還沒滿 3 級、今天問不到 2 次、這盤還沒問過；先等打招呼、開局特效過去 */
function npcAskMaybe(N,st,hb){try{if(!N||!N.era||!NPC_BOND[N.id]||!st||st.journey!=="park"||st.arena||st.result||st.practice||st.net||(st.moves||[]).length>1)return;
  npcMet(N);if(bondOf(N.id).n>=3)return;const A=npcAskDay();if(A.n>=2||A.g===st.id||Math.random()>.4)return;const h0=location.hash;
  setTimeout(()=>{if(!hb||!hb.isConnected||location.hash!==h0)return;const A2=npcAskDay();if(A2.n>=2||A2.g===st.id)return;A2.n++;A2.g=st.id;store.set("npcAsk",A2);npcAskCard(N,hb)},7000)}catch(e){}}
/* 小卡：浮在畫面下方，不擋棋盤操作；20 秒沒選就自己收起來 */
function npcAskCard(N,hb){document.querySelectorAll(".npc-ask").forEach(x=>x.remove());const c=document.createElement("div");c.className="npc-ask";
  c.innerHTML=`<img src="data/npc/${esc(N.id)}.webp" alt="" onerror="this.remove()"><div class="tx"><b>${esc(N.name)}</b><span>「我卡在一盤棋……你幫我看看？」</span><div class="bt"><button class="btn" data-a="go">幫她看看</button><button class="btn ghost" data-a="no">下次</button></div></div>`;
  document.body.append(c);requestAnimationFrame(()=>c.classList.add("show"));let iv=0,tm=0;
  const bye=()=>{clearInterval(iv);clearTimeout(tm);c.classList.remove("show");setTimeout(()=>c.remove(),300)};
  iv=setInterval(()=>{if(!hb.isConnected)bye()},800);tm=setTimeout(bye,20000);
  c.querySelector('[data-a="go"]').onclick=()=>{vibrate(5);bye();npcAskSheet(N)};
  c.querySelector('[data-a="no"]').onclick=()=>{vibrate(5);bye();toast(`${N.name}：「好，那下次再說。」`)}}
/* 玩家程度：棋力測驗的 θ → 最好成績的等級 → 挑戰電腦的積分，都沒有就當入門；委託題比程度低一點（她是來請教，不是來考你） */
function npcTier(){try{const t=store.get("quizTheta",null);if(t&&isFinite(t.th))return qzTier(t.th,15)}catch(e){}const qb=store.get("quizBest",null);if(qb&&qb.ti!=null)return qb.ti;
  let p=0;try{p=(JSON.parse(localStorage.getItem("xq_cpuRate")||"null")||{}).pts||0}catch(e){}return p>=1150?10:p>=900?8:p>=600?6:p>=300?5:p>=100?3:2}
function npcPickQ(D){const t=npcTier(),seen=new Set(store.get("npcAskSeen",[])||[]);let p=D.items.filter(q=>q.tier>=t-2&&q.tier<=t&&qzCat(q)!=="局面");
  const f=p.filter(q=>!seen.has(q.id));if(f.length)p=f;if(!p.length)p=D.items.filter(q=>Math.abs(q.tier-t)<=2);if(!p.length)return null;
  const q=p[Math.floor(Math.random()*p.length)];store.set("npcAskSeen",[...seen,q.id].slice(-300));return q}
/* 幫她看看：卡片裡放一個小棋盤，找出最好的一步（跟棋力測驗同一種判定） */
async function npcAskSheet(N){let D;try{D=await api("/quiz/data")}catch(e){return toast(e.message)}const q=npcPickQ(D);if(!q)return toast("題目還沒準備好");
  const board=q.board.split(",").map(x=>x||null);let sel=-1,LEGAL=[],done=false;
  sheet(`🌸 ${N.name}卡住的棋`,b=>{b.innerHTML=`<p class="gd-say">「這盤棋我想了好久……輪到${PLAYER[q.side]}走，你看最好的一步是什麼？」</p><div class="boardbox gd-bd"></div><div class="status" id="gdSt"></div><div class="gd-note" id="gdN"></div><div class="cj-row" id="gdAct"><button class="btn ghost" id="gdSkip">不會，看答案</button></div>`;
    const bd=Board(x=>tap(x));b.querySelector(".gd-bd").append(bd.svg);const st=t=>{const e=b.querySelector("#gdSt");if(e)e.textContent=t};
    const draw=o=>bd.draw(o&&o.board||board,{flip:q.side==="b",sel,targets:sel>=0?LEGAL.filter(([f])=>f===sel).map(x=>x[1]):[],...(o||{})});
    st(`${PLAYER[q.side]}走：點棋子，再點要去的位置${q.mate?"（有殺棋）":""}`);draw();api("/an/legal",{board,side:q.side}).then(r=>{LEGAL=r.legal||[]}).catch(()=>{LEGAL=[]});
    function tap(x){if(done||!LEGAL.length)return;if(sel>=0&&LEGAL.some(([f,t])=>f===sel&&t===x)){const f=sel;sel=-1;return judge(f,x)}sel=LEGAL.some(([f])=>f===x)?x:-1;if(sel>=0)vibrate(5);draw()}
    function judge(f,t){if(done)return;done=true;const ok=f===q.f&&t===q.t;vibrate(ok?15:[20,40,20]);const nb=board.slice();nb[q.t]=nb[q.f];nb[q.f]=null;draw({board:nb,last:{f:q.f,t:q.t},sel:-1,targets:[]});
      st(ok?"✔ 對了！":f<0?"正解如下":"✘ 不是這步");const n=b.querySelector("#gdN");if(n)n.textContent=`正解：${q.cn}${q.mate?`，${q.mate} 步內殺棋`:""}\nPikafish 的後續：${(q.pv||[]).join(" ")}`;if(n&&typeof pvStepper==="function")pvStepper(n,bd,board,q.pv||[],{draw:{flip:q.side==="b"}});
      const a=b.querySelector("#gdAct");a.innerHTML=ok?`<button class="btn" id="gdOk">${esc(N.name)}：「原來如此！」</button>`:`<button class="btn ghost" id="gdOk">${esc(N.name)}：「我再回去想想。」</button>`;
      a.querySelector("#gdOk").onclick=()=>{closeSheet();if(ok)setTimeout(()=>npcBondUp(N),260)}}
    b.querySelector("#gdSkip").onclick=()=>judge(-1,-1)})}
/* 解對：羈絆 +1（最多 3 級），每級修為 +10（xpKeys 擋重複） */
function npcBondUp(N){const D=NPC_BOND[N.id];if(!D)return;const M=npcBonds(),B=M[N.id]||(M[N.id]={m:Date.now(),n:0});if(B.n>=3)return;B.n++;if(!B.m)B.m=Date.now();store.set("npcBond",M);addXP(10,"羈絆",`bond:${N.id}:${B.n}`);
  sheet(`🌸 和${N.name}的羈絆 ${bondHearts(B.n)}`,b=>{b.innerHTML=`<p class="gd-say">「${esc(D.l[B.n-1])}」</p>${npcIdCard(N,B.n-1)}<p class="muted" style="font-size:13px">羈絆第 ${B.n} 級（共 3 級）・修為 +10</p>${B.n>=3?`<p>💌 ${esc(N.name)}說要寫一封信給你，寄到驛站的「📮 信箱」。</p>`:""}<div class="cj-row"><button class="btn ghost" id="gdBk">羈絆冊</button><button class="btn" id="gdOk">好</button></div>`;
    b.querySelector("#gdOk").onclick=closeSheet;b.querySelector("#gdBk").onclick=()=>npcBondBook()})}
function npcIdCard(N,i){const D=NPC_BOND[N.id];return`<div class="gd-id"><div class="gd-idh"><b>📇 身分小卡 ${i+1}／3</b><span>${esc(eraLabel(N.era))}的背景${D.tale?"・📖 說書人筆下的身分":""}</span></div><p>${esc(D.c[i])}</p></div>`}
/* 回饋 856：等級（06-cpu.js npcRk）、框色（07-legend.js RELIC_RK）、小印（稀、傳；普通不蓋） */
const NPC_RK_SEAL={rare:"稀",legend:"傳"},NPC_RK_HOW={common:"常遇到",rare:"少遇到",legend:"很難得遇到"};
const npcRkOf=n=>typeof npcRk==="function"?npcRk(n):"common",npcRkC=r=>((typeof RELIC_RK!=="undefined"&&RELIC_RK[r])||{common:["普通","#8A7A66"],rare:["稀有","#2F6FB5"],legend:["傳說","#C8962E"]}[r]||["普通","#8A7A66"]);
const npcSeal=r=>NPC_RK_SEAL[r]?`<span class="rd-seal rd-${r}">${NPC_RK_SEAL[r]}</span>`:"";
function npcRkCss(){if(document.getElementById("npcRkCss"))return;const s=document.createElement("style");s.id="npcRkCss";
  s.textContent=`.gd-nc{position:relative}.gd-nc.rk img{box-shadow:0 0 0 2.5px var(--rk)}.gd-nc.rk-legend img{box-shadow:0 0 0 2.5px var(--rk),0 0 8px rgba(255,200,80,.55)}
.gd-nc .q{width:56px;height:56px;border-radius:50%;box-sizing:border-box;border:2.5px solid var(--line)}.gd-nc.off.rk{opacity:.72}.gd-nc.off.rk .q{border-color:var(--rk)}
.gd-nc>.rd-seal{right:calc(50% - 34px);top:5px}.gd-who .rd-seal.st{vertical-align:-3px}
.gd-rk-pill{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;color:#fff;font-size:11.5px;font-weight:700;vertical-align:1px}
.npc-key .rd-tile{border-radius:50%!important}`+(document.getElementById("rdCss")?"":`
.rd-seal{position:absolute;right:2px;top:2px;width:17px;height:17px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1.5px solid;font:900 10px/1 var(--serif);background:rgba(255,255,255,.92);pointer-events:none}
.rd-seal.rd-rare{color:#2F6FB5;border-color:#2F6FB5}.rd-seal.rd-legend{color:#fff;background:#C8962E;border-color:#8A6414;box-shadow:0 0 6px rgba(255,212,90,.9)}
.rd-key{font-size:12.5px;margin:0 0 8px;display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center}.rd-k{display:inline-flex;align-items:center;gap:4px}.rd-kt{flex-basis:100%}.rd-k i.rd-tile{margin-right:6px;position:relative;width:30px;height:30px;border-radius:8px;border:2.5px solid;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-style:normal;background:var(--card);flex:none}.rd-k i.rd-tile .rd-seal{right:-6px;top:-6px;width:15px;height:15px;font-size:9px}.rd-k>span{display:flex;flex-direction:column;line-height:1.2}.rd-k b{font-size:13px}.rd-k small{font-size:11px}`);document.head.append(s)}
/* 冊頂說明（風格同珍品冊的 rdBookTop）：外框顏色＝有多難遇到，後面是這一級遇過幾位 */
function npcRkTop(L,M){const cnt=r=>{const A=L.filter(n=>npcRkOf(n)===r);return`${A.filter(n=>M[n.id]&&M[n.id].m).length}／${A.length}`};
  return`<div class="rd-key npc-key muted"><div class="rd-kt">頭像外框的顏色，代表她有多難遇到：</div>${["common","rare","legend"].map(r=>{const[t,c]=npcRkC(r);return`<span class="rd-k"><i class="rd-tile" style="border-color:${c}">🌸${npcSeal(r)}</i><span><b style="color:${c}">${esc(t)}</b><small>${NPC_RK_HOW[r]}・遇過 ${cnt(r)}</small></span></span>`}).join("")}</div>`}
/* 羈絆冊：20 位，沒遇過的顯示「？」；回饋 856：頭像框用等級框色，稀有、傳說蓋小印（沒遇過的也露框色和小印，不露名字） */
function npcBondBook(){const L=NPC_W(),M=npcBonds(),met=L.filter(n=>M[n.id]&&M[n.id].m).length;npcRkCss();
  sheet(`🌸 園子棋友的羈絆（遇過 ${met}／${L.length}）`,b=>{b.innerHTML=`<p class="muted" style="font-size:13px;margin:0 0 8px">石桌往事的園子裡，女棋手偶爾會請你看一盤棋；幫她解開，羈絆就多一級。她們大多在自己家鄉的朝代出現。<br>她們都是這個遊戲編出來的棋友；身分小卡寫的是她那個朝代的文化背景，不是她本人的史料。「稀有」「傳說」只表示多難遇到。</p>${npcRkTop(L,M)}<div class="gd-grid">${L.map(n=>{const x=M[n.id]||{},r=npcRkOf(n),c=npcRkC(r)[1],rc=r==="common"?"":` rk-${r}`;return x.m?`<button class="gd-nc rk${rc}" style="--rk:${c}" data-w="${n.id}"><img src="data/npc/${n.id}.webp" alt="" onerror="this.remove()">${npcSeal(r)}<b>${esc(n.name)}</b><small>${esc(eraLabel(n.era))}・<span class="gd-h">${bondHearts(x.n||0)}</span></small></button>`:`<div class="gd-nc off${r==="common"?"":" rk"+rc}" style="--rk:${c}"><span class="q">？</span>${npcSeal(r)}<b>？？？</b><small>還沒遇過</small></div>`}).join("")}</div>`;
    b.querySelectorAll("[data-w]").forEach(y=>y.onclick=()=>{vibrate(5);const n=PARK_NPC.find(z=>z.id===y.dataset.w);if(n)npcBondSheet(n)})})}
function npcBondSheet(n){const D=NPC_BOND[n.id],x=bondOf(n.id),age=(typeof AGE!=="undefined"&&AGE["n:"+n.id])||"";
  npcRkCss();const rk=npcRkOf(n),[rkt,rkc]=npcRkC(rk);   /* 回饋 856：頭像框、等級小章 */
  sheet(`🌸 ${n.name}`,b=>{b.innerHTML=`<div class="gd-who"><img src="data/npc/${n.id}.webp" alt="" onerror="this.remove()" style="box-shadow:0 0 0 2.5px ${rkc}"><div><div>家鄉：<b>${esc(eraLabel(n.era))}</b>${age?`・${esc(age)}`:""}・原創棋友<span class="gd-rk-pill" style="background:${rkc}">${esc(rkt)}</span></div><div>羈絆 <span class="gd-h">${bondHearts(x.n)}</span>（${x.n}／3）</div><div class="muted" style="font-size:13px">「${esc(n.say)}」</div></div></div>
    ${[0,1,2].map(i=>i<x.n?npcIdCard(n,i)+`<p class="gd-line">💬「${esc(D.l[i])}」</p>`:`<div class="gd-id off"><div class="gd-idh"><b>🔒 身分小卡 ${i+1}／3</b><span>羈絆第 ${i+1} 級解開</span></div></div>`).join("")}
    ${x.n>=3?`<button class="btn" id="gdMail" style="width:100%">💌 讀她寄來的信</button>`:""}<button class="btn ghost" id="gdBack" style="width:100%">回羈絆冊</button>`;
    const m=b.querySelector("#gdMail");if(m)m.onclick=()=>npcMail(n);b.querySelector("#gdBack").onclick=()=>npcBondBook()})}
/* 宋朝以前的棋友：信裡的棋是旅人帶去的今天的象棋，不是當朝棋法（史實盤查 H01，11/10） */
const ERA_PRE_XQ={qin:"六博",han:"六博",sanguo:"六博",weijin:"六博、塞戲",nanbei:"六博、北周的象戲",sui:"北周傳下來的象戲",tang:"寶應象戲那一類沒有炮的象戲",wudai:"象戲（炮什麼時候加進來，還沒有定論）"};
const eraXqNote=era=>ERA_PRE_XQ[era]?`<p class="muted" style="font-size:13px;margin:0 0 10px">📜 這是星槎棋友的信。信裡的棋，是你帶去教她的今天的象棋；${esc(eraLabel(era))}當時的人玩的是${ERA_PRE_XQ[era]}。</p>`:"";
/* 信：滿級才有，讀過就不再標「新」 */
function npcMail(n,after){const D=NPC_BOND[n.id];if(!D||bondOf(n.id).n<3)return;const M=npcBonds();if(M[n.id]&&!M[n.id].r){M[n.id].r=Date.now();store.set("npcBond",M)}
  sheet(`💌 ${n.name}的信`,b=>{b.innerHTML=`<div class="gd-mail">${esc(D.mail)}</div>${eraXqNote(n.era)}<button class="btn" id="gdOk" style="width:100%">收好</button>`;b.querySelector("#gdOk").onclick=()=>{closeSheet();if(after)setTimeout(after,260)}})}
const npcLetters=()=>NPC_W().filter(n=>bondOf(n.id).n>=3);

/* ---------- C．象棋從哪裡來：13 朝的棋史卡（照史實；年代有爭議寫「大約」，小說寫明是小說）＋3 題古法殘局（canju-set.json 的題號） ---------- */
/* 唐以前（秦～隋）和五代：挑沒有炮、子最少的驗證題；唐：盡量只有將車馬卒（寶應象戲）；宋：要用到炮；元：明代殘本《夢入神機》（找不到確定是元朝的殘局譜）；明：《適情雅趣》《橘中秘》；清：《竹香齋》《心武殘編》；經典：明、清古譜和現代大師各一局 */
const HIST_NOC="這個時代還沒有今天的象棋，更沒有炮。下面是今天的象棋練習，不是當時的下法：挑的是不用炮、棋子最少的殘局（題目出自明清古譜，都經過 Pikafish 驗證）。";
const HIST={
  classic:{t:"象棋的故事",x:"象棋不是一個人、一天發明的。有人把它的源頭追到先秦的博戲；北周武帝寫過《象經》，唐朝有「寶應象戲」；大約到了宋朝，才有了河界和炮，跟今天的樣子差不多。明清兩代的棋譜，像《橘中秘》、《梅花譜》，到今天還有人在讀。",
    qn:"從明朝古譜、清朝古譜到今天特級大師的實戰，各挑一局（都經過 Pikafish 驗證）。",q:["sq235","jz019","gm2008-4BA33K1C39r"]},
  qin:{t:"六博與「象棋」二字",x:"秦朝和更早的戰國時代，還沒有今天的象棋，當時流行的是「六博」：兩人對坐，各有六枚棋子，擲博箸決定怎麼走。《楚辭．招魂》寫「菎蔽象棋，有六簙些」，這裡的「象棋」指的是象牙做的博棋，不是今天的象棋。",
    qn:HIST_NOC,q:["jc054","jc133c5","jc131c4"]},
  han:{t:"鴻溝：楚河漢界的典故",x:"「楚河漢界」的典故，來自秦朝滅亡後的楚漢相爭。《史記．項羽本紀》記載項羽和劉邦約定「中分天下，割鴻溝以西者為漢，鴻溝而東者為楚」。不過漢朝人還沒下今天的象棋，他們愛玩的是六博；棋盤上寫「楚河漢界」，是很久以後的事。",
    qn:HIST_NOC,q:["zx078","jc130c6","sq429c8"]},
  sanguo:{t:"三國：還沒有象棋",x:"三國時還沒有今天的象棋。從戰國到漢魏，六博一直是常見的博戲，東吳的韋曜還寫過〈博弈論〉。戰國的《韓非子．外儲說左下》有一句「博貴梟，勝者必殺梟」，可見「梟」是六博裡很要緊的棋子。不過六博完整的下法，學者到今天還在拼湊，也不能說它就是今天象棋的祖先。",
    qn:HIST_NOC,q:["jc002","mr022c4","jc036"]},
  weijin:{t:"等待象戲",x:"魏晉時也還沒有今天的象棋。要等到南北朝，北周武帝在天和四年（569 年）寫成《象經》，是史書明確記載的第一部象戲專書；再過約兩百年，唐朝《玄怪錄》裡的象戲才有了將、馬、車、卒，棋子還和今天不完全一樣。",
    qn:HIST_NOC,q:["sq388","sq261c5","jz039c6"]},
  nanbei:{t:"周武帝的《象經》",x:"《周書．武帝紀》記載，天和四年（569 年），北周武帝寫成《象經》，召集百官來聽他講解，這是正史裡很明確的一筆「象戲」記載。可惜《象經》的規則已經失傳；從王褒的〈象經序〉看，它講究天文、陰陽、時令，跟今天的象棋差很多。",
    qn:HIST_NOC,q:["jc048","lk249c4","lk236"]},
  sui:{t:"《隋書》記下的《象經》",x:"隋朝很短，只有三十多年，沒有留下象戲的棋譜。唐朝人修成的《隋書．經籍志》，還著錄了周武帝的《象經》和幾種注本，可見這套棋經一直有書傳到隋唐；可惜這些書後來都失傳了。",
    qn:HIST_NOC,q:["sq434","sq254","mr112c8"]},
  tang:{t:"寶應象戲：天馬斜飛",x:"唐朝牛僧孺的小說集《玄怪錄》裡有一篇〈岑順〉，寫寶應年間，岑順夢見兩國交兵，軍師說「天馬斜飛度三止」、「輜車直入無回翔」，醒來在屋下挖出一座古墓，裡面擺著一副金銅做的象戲。這是小說。篇中寫到將、馬、車、卒，沒有提到炮；不過單憑一篇小說，還拼不出唐朝象戲完整的下法。",
    qn:"寶應象戲有將、馬、車、卒，沒有炮。下面盡量挑只用這幾種棋子的殘局（題目出自明清古譜，都經過 Pikafish 驗證；最後一局要五步，比較難）。",q:["sq439","lk020c5","jc106"]},
  wudai:{t:"象戲慢慢在改變",x:"五代十國戰亂不斷，留下來的象棋記載很少。大約從唐朝後期到北宋，象戲一點一點改變，加進了「砲」等新的棋子；但是哪一年、誰改的，學者到今天還沒有定論。",
    qn:"炮是什麼時候加進來的還沒有定論，這裡先挑不用炮的殘局（題目出自明清古譜，都經過 Pikafish 驗證）。",q:["sq435","sq368","sq257"]},
  song:{t:"宋朝：河界與炮",x:"一般認為，宋朝是象棋大致定型的時代。北宋司馬光設計過《七國象戲》，讓七個人各帶一國兵馬一起下，是書齋裡的新玩法。南宋陳元靚編了《事林廣記》；今天看得到的版本多是元朝刻印的，書裡的象棋圖已經有河界、也有炮，跟今天的象棋幾乎一樣。",
    qn:"宋朝的象棋已經有炮了，下面三局都用得到炮（題目出自明清古譜，都經過 Pikafish 驗證）。",q:["sq460","lk156","lk233c6"]},
  yuan:{t:"靠刻本留下來的棋",x:"元朝人照樣下象棋。南宋陳元靚編的《事林廣記》，今天看得到最早的版本大多是元朝刻印的，書裡的象棋圖就是靠這些刻本才留了下來。",
    qn:"今天找不到確定是元朝的殘局譜。下面三局出自明代的殘局譜《夢入神機》，是今天的象棋練習（都經過 Pikafish 驗證）。",q:["mr040","mr118","mr088c5"]},
  ming:{t:"明朝的重要古譜",x:"明朝留下了幾部重要的象棋古譜。徐芝編的《適情雅趣》（1570 年）收了五百多局殘局；朱晉楨的《橘中秘》（1632 年）講開局和殺法，到今天還是學棋的人愛讀的書。",
    qn:"下面是《適情雅趣》和《橘中秘》裡的局（都經過 Pikafish 驗證）。",q:["sq442","jc006c8","jc111"]},
  qing:{t:"梅花譜與竹香齋",x:"清朝的象棋更普及了。清初王再越的《梅花譜》專講屏風馬怎麼對付當頭炮，是古譜裡的經典；清朝中期張喬棟編的《竹香齋象戲譜》收了許多精巧的殘局，很多題目流傳到今天。",
    qn:"下面是《竹香齋》和《心武殘編》裡的局；《梅花譜》講的是開局，所以沒有殘局題（都經過 Pikafish 驗證）。",q:["zx161","zx172","xw040"]}};
const histTitle=()=>store.get("histTitle",0)?"棋史通":"";
const histSolvedAll=()=>store.get("histSolved",{})||{};
const histDoneN=()=>{const M=histSolvedAll();return ARENA_ORDER.filter(k=>Object.keys(M[k]||{}).length>0).length};
const histSeenN=()=>{const S=store.get("histSeen",{})||{};return ARENA_ORDER.filter(k=>S[k]).length};
function histBackHash(){const h=store.get("histBack","");return typeof h==="string"&&/^#\//.test(h)&&!/^#\/canju/.test(h)?h:"#/adventure"}
function histNext(era,id){const H=HIST[era],M=histSolvedAll()[era]||{};if(!H)return null;return H.q.find(x=>x!==id&&!M[x])||null}
/* 解題頁不看答案解開時呼叫（07c-canju.js finish）：記下來；13 朝都至少解開 1 題 → 稱號「棋史通」＋修為 30 */
function histSolvedMark(era,id){const H=HIST[era];if(!H||!H.q.includes(id))return null;const M=histSolvedAll(),E=M[era]||(M[era]={}),first=!E[id];if(first)E[id]=Date.now();store.set("histSolved",M);
  {const S=store.get("histSeen",{})||{};if(!S[era]){S[era]=Date.now();store.set("histSeen",S)}}
  let title=false;if(!store.get("histTitle",0)&&ARENA_ORDER.every(k=>Object.keys(M[k]||{}).length>0)){store.set("histTitle",Date.now());addXP(30,"棋史通","hist:title");title=true}
  return{first,title,n:histDoneN(),k:Object.keys(E).length}}
function histCardDoneHTML(era,hs,ans){const en=esc(eraLabel(era));if(ans||!hs)return`<p class="muted">看了答案，這題還不算進${en}的棋史卡；不看答案解開才算。</p>`;
  return`<p>📜 ${en}的棋史卡：已解 ${hs.k}／3・棋史卡完成 ${hs.n}／13</p>${hs.title?`<p style="color:#C8962E;font-weight:900">🏅 13 張棋史卡都解開了！得到稱號「棋史通」，修為 +30</p>`:""}`}
function histGo(era,id){store.set("histBack",location.hash);closeSheet();location.hash="#/canju/h/"+era+"/"+encodeURIComponent(id)}
/* 棋史卡：點園子的石桌（book＝從棋史卡冊打開，不算「發現」） */
function histCard(era,book){const H=HIST[era]||HIST.classic;era=HIST[era]?era:"classic";const E=PARK_INFO[era]||PARK_INFO.classic,[en,yr]=E._,S=store.get("histSeen",{})||{},first=!S[era];vibrate(5);
  if(first&&!book){S[era]=Date.now();store.set("histSeen",S)}
  sheet(`📜 ${H.t}`,b=>{const tb=E.table||[];b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(en)}${yr?`・${esc(yr)}`:""}・這個朝代的人在下什麼棋</div><p class="gd-hist">${esc(H.x)}</p>
    <div class="gd-sec">♟ 古法殘局</div><p class="muted" style="font-size:13px;margin:0 0 6px">${esc(H.qn)}</p><div class="items" id="gdQ" style="padding:0"><div class="muted">題目載入中…</div></div>
    <p class="muted" style="font-size:13px;margin:10px 0 0">棋史卡 ${histSeenN()}／13・解開 ${histDoneN()}／13${histTitle()?"・🏅 棋史通":"・13 張都至少解開 1 題，得到稱號「棋史通」"}</p>
    ${tb[0]&&!book?`<p class="muted" style="font-size:12.5px;margin:8px 0 0">🪑 這張${esc(tb[0])}：${esc(tb[1]||"")}</p>`:""}
    <button class="btn ghost" id="gdBook" style="width:100%;margin-top:10px">📜 棋史卡冊</button>`;
    b.querySelector("#gdBook").onclick=()=>histBook();
    cjData().then(D=>{const box=b.querySelector("#gdQ");if(!box||!box.isConnected)return;const M=histSolvedAll()[era]||{},L=H.q.filter(id=>D.byId[id]);
      if(!L.length){box.innerHTML='<div class="muted">題庫更新了，這張卡的題目暫時找不到。</div>';return}
      box.innerHTML=L.map(id=>{const P=D.byId[id];return`<button class="item" data-q="${esc(id)}"><span class="lb" style="font-size:20px">${M[id]?"✔":"♟"}</span><span class="tx"><b>${esc(P.t)}・${cjLv(P.d)}</b><span>${cjSrc(P)}・${P.n===1?"找一步":P.n+" 步之內殺"}</span></span><span class="muted">›</span></button>`}).join("");
      box.querySelectorAll("[data-q]").forEach(y=>y.onclick=()=>{vibrate(5);histGo(era,y.dataset.q)})}).catch(e=>{const box=b.querySelector("#gdQ");if(box)box.innerHTML=`<div class="muted">${esc(e.message)}（題庫要先下載才能解）</div>`})});
  if(first&&!book)setTimeout(()=>toast(`📜 收進棋史卡（${histSeenN()}／13）`),400)}
function histBook(){const S=store.get("histSeen",{})||{},M=histSolvedAll();
  sheet(`📜 棋史卡冊（${histSeenN()}／13）`,b=>{b.innerHTML=`<p class="muted" style="font-size:13px;margin:0 0 8px">在石桌往事的園子裡點石桌，就能收到那個朝代的棋史卡。每張至少不看答案解開 1 題古法殘局，13 張都解開得到稱號「棋史通」。${histTitle()?"<br>🏅 你已經是「棋史通」了。":""}</p>
    <div class="items" style="padding:0">${ARENA_ORDER.map(k=>{const n=Object.keys(M[k]||{}).length,H=HIST[k];return S[k]?`<button class="item" data-h="${k}"><span class="lb" style="font-size:20px">${n?"📜":"📄"}</span><span class="tx"><b>${esc(eraLabel(k))}・${esc(H.t)}</b><span>古法殘局 ${n}／3</span></span><span class="muted">›</span></button>`:`<div class="item" style="opacity:.5"><span class="lb">？</span><span class="tx"><b>${esc(eraLabel(k))}・？？？</b><span>去這個朝代的園子點石桌</span></span></div>`}).join("")}</div>`;
    b.querySelectorAll("[data-h]").forEach(y=>y.onclick=()=>{vibrate(5);histCard(y.dataset.h,true)})})}

/* ---------- 入口：驛站（📮 信箱、羈絆冊、棋史卡冊）和我的角色 ---------- */
function gardenInn(v){const box=v.querySelector("#gardenBox");if(!box)return;const L=npcLetters(),M=npcBonds(),W=NPC_W(),met=W.filter(n=>M[n.id]&&M[n.id].m).length;
  box.innerHTML=`<div class="sec-t">📮 信箱（${L.length} 封）</div>${L.length?`<div class="items" style="padding:0">${L.map(n=>`<button class="item" data-mail="${n.id}"><span class="lb" style="font-size:22px">💌</span><span class="tx"><b>${esc(n.name)}的信${M[n.id]&&M[n.id].r?"":" 🆕"}</b><span>寄自${esc(eraLabel(n.era))}</span></span><span class="muted">›</span></button>`).join("")}</div>`:`<div class="card muted" style="font-size:13px">還沒有信。園子裡的女棋手羈絆到第 3 級，她會寫信寄來這裡。</div>`}
    <div class="sec-t">🌸 園子棋友</div><div class="items" style="padding:0"><button class="item" id="gdBond"><span class="lb" style="font-size:22px">🌸</span><span class="tx"><b>羈絆和身分小卡</b><span>遇過 ${met}／${W.length} 位</span></span><span class="muted">›</span></button><button class="item" id="gdHist"><span class="lb" style="font-size:22px">📜</span><span class="tx"><b>棋史卡冊${histTitle()?"・🏅 棋史通":""}</b><span>收到 ${histSeenN()}／13・解開 ${histDoneN()}／13</span></span><span class="muted">›</span></button>${typeof garden2InnHTML==="function"?garden2InnHTML():""}</div>`;   /* 意見回饋 658（B、D）：🧭 輿圖遊歷、❄ 九九消寒圖（07e-garden2.js） */
  box.querySelectorAll("[data-mail]").forEach(y=>y.onclick=()=>{vibrate(5);const n=PARK_NPC.find(z=>z.id===y.dataset.mail);if(n)npcMail(n,()=>{if(box.isConnected)gardenInn(v)})});
  box.querySelector("#gdBond").onclick=()=>{vibrate(5);npcBondBook()};box.querySelector("#gdHist").onclick=()=>{vibrate(5);histBook()};if(typeof garden2Bind==="function")garden2Bind(box)}
function gardenMeCard(){const d=document.createElement("div");d.className="card gd-me";const M=npcBonds(),W=NPC_W(),met=W.filter(n=>M[n.id]&&M[n.id].m).length,nl=npcLetters().filter(n=>!(M[n.id]||{}).r).length;
  d.innerHTML=`<button id="gdMeB"><span>🌸</span><b>園子棋友</b><small>遇過 ${met}／${W.length}${nl?`・💌 ${nl} 封新信`:""}</small></button><button id="gdMeH"><span>📜</span><b>棋史卡</b><small>${histSeenN()}／13${histTitle()?"・🏅 棋史通":""}</small></button>${typeof garden2MeHTML==="function"?garden2MeHTML():""}`;   /* 意見回饋 658（B、D）：🧭 輿圖遊歷、❄ 消寒圖 */
  d.querySelector("#gdMeB").onclick=()=>{vibrate(5);npcBondBook()};d.querySelector("#gdMeH").onclick=()=>{vibrate(5);histBook()};if(typeof garden2Bind==="function")garden2Bind(d);return d}
