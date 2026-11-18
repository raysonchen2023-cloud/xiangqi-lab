/* ================= 🚪 七星來訪（Gemini 遊玩樂趣評估「其他六位當訪客」，開發者 11/8 核准）=================
   玩家只選一位雲河七星，其他六位不定時到星槎頁（#/adventure，Voyage）或渡口（#/port，Port；船艙那一站也是這頁）串門子：
     星槎頁＝左上角冒出小立繪＋對話泡泡（不擋圖上的入口，15 秒後自己退下）；渡口＝「主場角色那句話」下面多一張小卡。
   出現規則（v7Pick）：要有雲河七星的旅程（說書人的學徒不來）；每次進這兩頁 35% 機率；兩次來訪至少隔 30 分鐘；
     每人每天最多一次、一天最多 3 位、同一時間只有一位；這一站是誰的家鄉或主場（CHAR_ERA、SHIP_STOP.who），六成機率先挑他。
   台詞（V7[角色].l）：[句子, 只在哪一站說（空＝哪裡都行）, 要讀過哪一章才說（shipRead；免得先說破劇情）]；先挑這一站的、沒說過的句子。
     {名}＝怎麼叫「隨行」那位（11/18 起來訪者是對隨行說話，V7_CALL 關係表；照小說：方庭不叫「庭哥」；小梅叫燕子「燕子姊姊」），{你}＝隨行那位是女生就換成「妳」。人物口吻照《雲河七星》最終定稿。
   小任務（V7[角色].q，每人 2～3 件，同一時間只接 1 件）：play＝下完一盤（雙方各 5 步以上，就是 journeyGameEnd 給「對局」修為的那種；11/18 起意思是「你去下一盤，我在旁邊看」：
     hi 問候（泡泡）、ask 邀約、yes 答應、no 婉拒、wait 還沒下完、thx 完成；下那盤時偶爾提醒本命子，見檔尾 v7Watch）、
     pz＝解開一題殘局（一盞茶或千秋殘局；看答案不算）、read＝讀《雲河七星》某一章（那一站停靠過才會請託）。
     完成的判斷不另外記：看修為紀錄 xpKeys 最後一筆 g:／cj:／ship: 鍵跟接任務時記下的 tail 不一樣，或 shipRead 有那一章。
     做完了，他會在 3 分鐘後回來道謝（不受每天一次的限制）；收下＝addXP(15,"羈絆","v7:<角色>:<任務>")，不新增貨幣。
   存檔：visit7＝{n:{角色:見過幾次},day:{角色:哪天來過},last:上次來的時間,seen:{角色:[說過的句子]},q:正在做的任務,done:{"角色:任務":完成時間}}（05b-save.js 的 JOURNEY_KEYS）。
   立繪用選角預覽 data/xs/prev_<角色>.webp（跟渡口的主場角色同一張），不另外畫。 */
const V7={
  x_swordboy:{l:[
    ["車同軌，就是天下的車，兩個輪子之間一樣寬。輪子壓出的轍，才對得上。","",""],
    ["走直路不難。難的是先看清楚，那條路是不是真的通。","",""],
    ["說書人給的這雙鞋大了一點。鞋帶繫緊，就穩了。","",""],
    ["燕子教我寫了「河」字。三點水，旁邊一個「可」。……寫歪了，再寫一次。","","weijin"],
    ["這裡是我家鄉的年代。直道從雲陽往北，一直通到九原。我爹趕的糧車，就走這種路。","qin",""],
    ["這年頭還沒有象棋。路邊的人玩的是六博。","qin",""],
    ["我爹那天轉彎，是為了送我去看病。……我現在知道了。","qin","qin"],
    ["小梅說彎路比較快。在沙地上，好像真是這樣。","han",""],
    ["揚州的碼頭好吵。溪兒在人縫裡一溜就不見了，我只能跟著她的頭巾走。","qing",""],
    ["小梅家的驛站，馬比人多。我也得學認牌，不能只看繩子。","yuan","yuan"]],
   h:["{名}，這一步，讓俥直直走出去。","路通了。俥，可以走。"],
   q:[{id:"play",t:"play",hi:"{名}，我來了。今天不趕路，看{你}下棋。",ask:"去下一盤吧。我站在{你}旁邊看——俥有直路的時候，我提一句。",yes:"好。我站這裡，看得清楚。",no:"嗯，那下次。路還在。",wait:"還沒下完？不急，我在旁邊看。",thx:"下完了。{你}的路走得直，好。"},
      {id:"read",t:"read",k:"qin",ask:"第二章是我家鄉的事。{你}讀了，就知道我爹為什麼轉彎。",wait:"第二章。讀完了再說。",thx:"讀完了？……嗯。我爹是個好車夫。"}]},
  x_spiritgirl:{l:[
    ["燙，慢一點。我剛沏了茶，給{你}留了一碗。","",""],
    ["棋輸了不要緊。家顧好了，再往前走。","",""],
    ["累了就坐一下。星槎不會丟下誰。","",""],
    ["阿轍現在會寫「茶」字了。字可以慢慢認，先看它能做什麼。","","nanbei"],
    ["船艙第一夜，我分了七碗茶。大家捧著碗，就不吵了。","classic",""],
    ["竹蔭下有人擺著博局，看得好專心。我們繞過去，別吵他們。","weijin",""],
    ["這裡是我家鄉，瓜步的渡口。茶棚還在，我就還在等。","nanbei",""],
    ["我把茶棚挪到柳樹後頭，掛了木片留口信。娘回來，就找得到。","nanbei","nanbei"],
    ["花兒的爺爺左耳聽不清。我們跟他說話，都站到他右邊。","song","song"]],
   h:["{名}，相動一動，先把家顧好。","這步讓相走，家顧穩了，再往前。"],
   q:[{id:"play",t:"play",hi:"{名}，茶沏好了。今天我不忙，陪{你}坐一會兒。",ask:"去下一盤吧，我在旁邊替{你}看著家。相該動的時候，我小聲說一句。",yes:"好，我搬張小凳子，坐{你}旁邊。",no:"沒關係，累了就先歇著。茶我給{你}溫著。",wait:"慢慢下，我還在旁邊看著。",thx:"下完了呀。家顧得好，棋就穩。謝謝{你}讓我看。"},
      {id:"pz",t:"pz",ask:"幫我看一題殘局好不好？我守慣了，攻的那一步，請{你}替我想。",wait:"慢慢來，解開了再告訴我。",thx:"解開了？原來攻的人，是這樣看棋的。謝謝{你}。"},
      {id:"read",t:"read",k:"nanbei",ask:"第六章寫的是我家鄉的渡口。……{你}願意讀嗎？",wait:"第六章，不急。",thx:"讀完了呀。那碗缺了口的茶碗，現在只剩碎片了。……謝謝{你}讀。"}]},
  x_martialgirl:{l:[
    ["{名}！我在這兒！……我又太大聲了？","",""],
    ["我是雷借花。不是打雷的雷，是姓雷！記住啦！","",""],
    ["隔一個，剛剛好！炮就是要有個架子，懂吧？","",""],
    ["我最怕打雷……噓，不准跟別人說！","",""],
    ["以前我覺得大聲才有用。後來才知道，坐在旁邊不出聲，也是在幫忙。","","wudai"],
    ["這裡剛打過仗。有個孩子一聽到鼓聲就捂耳朵……我小聲一點，陪他坐著就好。","wudai",""],
    ["這裡是我家鄉，臨安！上元的燈還沒撤……我得先去找爺爺。","song",""],
    ["爺爺畫的煙火圖，裡面藏著棋子。他還說：可不能當棋譜！","song","song"],
    ["小梅家到了！我陪她回去。她要是腿軟，我就推她一把——輕輕的！","yuan",""]],
   h:["{名}，炮！這一步，看準了再放！","炮架好了——這一下響得了！"],
   q:[{id:"play",t:"play",hi:"{名}！我來了！今天不放煙火，來看{你}下棋！",ask:"去下一盤！我在旁邊看，炮該響的時候，我喊{你}！",yes:"好！我站{你}後面，不吵——盡量不吵！",no:"下次！下次一定要讓我看！",wait:"還沒下完？快去快去，我等著看！",thx:"下完啦？好！這一盤我看得過癮，這一聲是{你}的！"},
      {id:"read",t:"read",k:"song",ask:"第十章是臨安，我家！{你}讀了，就知道我爺爺有多好。",wait:"第十章！讀了沒？",thx:"讀完了？……爺爺留的那盞燈，一直亮著等我。"}]},
  x_miaogirl:{l:[
    ["嘿嘿，我坐不住啦！{名}，走嘛，去甲板上看星星！","",""],
    ["前面堵住了？那我拐個彎呀！","",""],
    ["這頂鈸笠帽是老駱的。帽頂的紅珠子是阿娘縫的，她說我跑多遠，他們都看得見。","",""],
    ["阿轍說馬腳會被擋住。哼，那我就換一條路跳！","",""],
    ["溪兒的草鞋又破了，我幫她補。她說要還我，還什麼還嘛！","","sui"],
    ["沙好燙呀！這裡的驛站跟我家的有點像，可是風沙大多了。","han",""],
    ["我現在不一個人跑了。要往前探，先回頭喊一聲。","han","han"],
    ["這裡是我家鄉！集寧路的驛站……我、我先跟{你}說，我以前做錯過一件事。","yuan",""],
    ["老駱說，我也是他的梅子。嘿嘿，這句我要記一輩子。","yuan","yuan"]],
   h:["{名}，馬可以拐個彎，跳這一步看看！","嘿嘿，這步讓馬跳出去，繞路也到得了！"],
   q:[{id:"read",t:"read",k:"yuan",ask:"第十一章……是我回家的事。{你}要讀嗎？讀完不准笑我呀。",wait:"第十一章嘛，讀了沒呀？",thx:"讀完啦？……嘿嘿，那我就不用再說一遍了。"},
      {id:"play",t:"play",hi:"{名}！我跑來的！今天想看{你}下棋！",ask:"去下一盤嘛！我在旁邊看，馬該拐彎的時候，我跟{你}說！",yes:"好耶！我坐旁邊，不亂動！",no:"唔……那下次要叫我喔。",wait:"還沒下完呀？我還在旁邊等{你}！",thx:"下完啦！我看到馬跳得好漂亮！我就說繞路也到得了！"}]},
  x_shuai:{l:[
    ["{名}，勞{你}停一停。我想問：剛才那一步，{你}為什麼這樣走？","",""],
    ["我走不快，但我看得仔細。若不懂，我就問。","",""],
    ["帥只在九宮裡走。可是從九宮看出去，整盤棋都看得見。","",""],
    ["（摸了摸胸前的長命鎖）不必擔心，我只是……有點緊張。","",""],
    ["累了就說。這是城子教我的……雖然他自己從來不說。","","sanguo"],
    ["江上的風好大。我在船樓上看得見江面……我就在這裡，也能幫忙。","sanguo",""],
    ["這裡是我家鄉，休寧。院子的那道門，我想自己走出去。","ming",""],
    ["那位書生拿來的《適情雅趣》，是本棋書。書值多少，要請懂的人看，才算公道。","ming","ming"],
    ["長安西市的糖，有松子糖、有石蜜。城子挑了松子糖……他很少替自己挑東西。","tang","tang"]],
   h:["{名}，帥也能挪一步，換個位置看看。","勞{你}看看帥——這時候，它自己走一步最好。"],
   q:[{id:"play",t:"play",hi:"{名}，勞{你}停一停。今天我不問棋，只想在旁邊看{你}下。",ask:"去下一盤吧。我在旁邊看，帥該挪一步的時候，我提一句。",yes:"好。我坐{你}旁邊，不搶{你}的棋。",no:"也好，改天再看。",wait:"還在下？不必急，我看著。",thx:"下完了。坐得穩，看得遠……多謝{你}讓我看這一盤。"},
      {id:"pz",t:"pz",ask:"勞{你}替我解一題殘局。解開了，告訴我{你}是怎麼想的。",wait:"不必急，我在這裡等。",thx:"解開了？……原來是這樣走。我記下了，多謝。"},
      {id:"read",t:"read",k:"ming",ask:"第十二章寫的是我家的當鋪。{你}若有空，讀一讀好嗎？",wait:"第十二章。有空再讀就好。",thx:"讀完了？那天我說「這次換我來」……其實手一直在抖。"}]},
  x_shi:{l:[
    ["別急。我在旁邊。","",""],
    ["{名}，累就說。別撐。","",""],
    ["方庭呢？……沒事，我只是看看。","",""],
    ["護腕上的紅繩，是我自己綁的。綁緊一點，才擋得住。","",""],
    ["繩結不用綁死。鬆開，才能重來。","","tang"],
    ["我也會。……這話，我跟花兒都說過。","","song"],
    ["駝隊。……要走多遠，才能到他們來的地方？","tang",""],
    ["這裡是我家鄉，休寧。我爹是當鋪的掌櫃。……該回去喊他一聲。","ming",""],
    ["碼頭的船，一艘接一艘。……沒什麼，我只是看看。","qing",""]],
   h:["這步該讓仕動一動，守住了再說。","{名}，仕。……就這步。"],
   q:[{id:"read",t:"read",k:"tang",ask:"第八章，長安。……{你}讀了再說。",wait:"第八章。",thx:"讀了。……那個繩結，我後來自己學會了。"},
      {id:"play",t:"play",hi:"{名}。……我來看{你}下棋。",ask:"去下一盤。我在旁邊看。仕該動，我說。",yes:"嗯。我站旁邊。",no:"那下次。",wait:"下完再說。",thx:"嗯。守得住。{你}下得好。"}]},
  x_bing:{l:[
    ["別喊慢了，我一溜就過去啦！{名}有東西要送嗎？我跑腿最快！","",""],
    ["誰給我一截繩，我都量過，得還他一段。不還，心裡不踏實嘛。","",""],
    ["兵只能往前走，我也是。可是小梅說，坐下來等一等，也不會怎樣。","",""],
    ["我不賭錢。下棋就下棋，誰輸了，再來一盤！","",""],
    ["這裡在挖河渠……以後揚州的運河，是不是就從這裡來的？","sui",""],
    ["我說了「我也會」。說出來以後，水桶好像沒那麼重了。","sui","sui"],
    ["這裡是我家鄉，揚州！下雪的碼頭好冷，可每一條巷子我都認得啦。","qing",""],
    ["老船工從前分過我餅。這回，換我陪他等。","qing","qing"],
    ["兩半塊布合起來，是一面小旗。小梅說，我是步家的後人。","yuan","yuan"]],
   h:["{名}，兵——就是這一顆！","這步讓兵走！一步一步，也走得到！"],
   q:[{id:"play",t:"play",hi:"{名}！我一溜就到啦！今天不跑腿，來看{你}下棋！",ask:"去下一盤吧！我在旁邊看，兵該走的時候，我就喊一聲！",yes:"好！我蹲{你}旁邊看！",no:"好啦，那我先去跑腿，下回再看！",wait:"還沒下完？我先在旁邊等著！",thx:"下完啦？兵一步一步，也走到了！這個我記著！"},
      {id:"pz",t:"pz",ask:"{名}，幫我解一題殘局啦！小兵怎麼過河，我一個人想不出來。",wait:"還沒解開？不急不急，我先去跑一趟腿。",thx:"解開啦？好！這個我記著，得還{你}一回！"},
      {id:"read",t:"read",k:"qing",ask:"第十三章是揚州，下雪那回。{你}讀了，就知道我家鄉長什麼樣子啦。",wait:"第十三章！讀了沒啦？",thx:"讀完啦？……那天的雪好冷，可是大家都在。"}]}};
/* 11/18 開發者：來串門子的人是對「隨行」那位（07pty ptyLook，首頁小人）說話，不是對玩家。{名}＝來訪者怎麼叫隨行那位、{你}＝隨行那位是女生就「妳」。
   V7_CALL["來訪者>隨行"]＝關係表裡的特別叫法（照小說：小梅叫燕子「燕子姊姊」）；"*>隨行"＝大家都這樣叫（方庭不叫「庭哥」）；表裡沒有的叫小名（齊轍＝阿轍、駱躍梅＝小梅…）。 */
const V7_CALL={"x_miaogirl>x_spiritgirl":"燕子姊姊","*>x_shuai":"方庭"},V7_P=.35,V7_GAP=30*6e4,V7_BACK=3*6e4,V7_DAYMAX=3,V7_XP=15;
const V7_PFX={play:["g:"],pz:["cj:","ship:"]};
let V7_T=0;
function v7St(){const S=store.get("visit7",null)||{};for(const k of["n","day","seen","done"])if(!S[k]||typeof S[k]!=="object")S[k]={};return S}
function v7Call(c,me){const M=WX_CHARS[me]||{};return V7_CALL[c+">"+me]||V7_CALL["*>"+me]||M.nk||M.n||""}
function v7Txt(s,c){const me=v7Mate(),M=WX_CHARS[me]||{};return String(s).replace(/\{名\}/g,v7Call(c,me)).replace(/\{你\}/g,M.sx==="f"?"妳":"你")}
function v7Tail(t){const K=store.get("xpKeys",{})||{},P=V7_PFX[t]||[];let last=null;for(const k in K)if(P.some(p=>k.startsWith(p)))last=k;return last}
function v7QDone(q){if(!q)return false;if(q.t==="read")return!!(store.get("shipRead",{})||{})[q.k];const t=v7Tail(q.t);return t!==null&&t!==q.tail}
function v7QOf(c,id){return((V7[c]||{}).q||[]).find(x=>x.id===id)||null}
/* 這位現在可以請託哪件事：沒做過的；讀某一章要那一站停靠過、還沒讀過 */
function v7QNext(c,S){const R=store.get("shipRead",{})||{};let D=[];try{D=shipDocked()}catch(e){}
  return((V7[c]||{}).q||[]).find(x=>!S.done[c+":"+x.id]&&(x.t!=="read"||(!R[x.k]&&D.includes(x.k))))||null}
function v7Ok(){try{return!!journey()&&!!myChar()&&!shipAppr()}catch(e){return false}}
/* 11/16 開發者「所有意外事件只有已加入的夥伴角色才能觸發該角的特殊事件」：來串門子、做完請託回來道謝，都只挑已加入的（沒有旅程時 ptyHas 一律 false＝不來） */
function v7In(c){return typeof ptyHas!=="function"||ptyHas(c)}
function v7Mate(){let c="";try{c=typeof ptyLook==="function"?ptyLook():""}catch(e){}if(!c)try{c=myChar()||""}catch(e){}return c}   /* 隨行那位（ptyLook 跟 pChar 同步；沒有隊伍時照 myChar） */
function v7Pick(S,here,ex){const me=v7Mate(),now=Date.now(),today=localDay();   /* me＝隨行那位：不會自己來找自己串門子 */   /* ex＝畫面上已經在說話的那位（渡口的主場角色），不重複出來 */
  if(S.q&&V7[S.q.c]&&S.q.c!==me&&S.q.c!==ex&&v7In(S.q.c)&&v7QDone(S.q))return now-(S.last||0)>=V7_BACK?{c:S.q.c,back:1}:null;
  if(now-(S.last||0)<V7_GAP)return null;if(Object.values(S.day).filter(d=>d===today).length>=V7_DAYMAX)return null;
  if(Math.random()>=V7_P)return null;
  const L=Object.keys(V7).filter(c=>c!==me&&c!==ex&&S.day[c]!==today&&v7In(c));if(!L.length)return null;
  const hm=L.filter(c=>CHAR_ERA[c]===here||((SHIP_STOP[here]||{}).who||[]).includes(c)),P=hm.length&&Math.random()<.6?hm:L;
  return{c:P[Math.floor(Math.random()*P.length)]}}
/* 挑一句：先這一站的、再全部；沒說過的優先 */
function v7Line(c,S,here){const R=store.get("shipRead",{})||{},A=V7[c].l.map((x,i)=>[x,i]).filter(([x])=>(!x[1]||x[1]===here)&&(!x[2]||R[x[2]])),seen=S.seen[c]||[];
  const fr=a=>a.filter(([,i])=>!seen.includes(i)),loc=A.filter(([x])=>x[1]===here),P=fr(loc).length?fr(loc):fr(A).length?fr(A):A,p=P[Math.floor(Math.random()*P.length)];
  if(!seen.includes(p[1]))S.seen[c]=seen.concat(p[1]).slice(-20);return p[0][0]}
function v7Css(){if(document.getElementById("v7css"))return;const s=document.createElement("style");s.id="v7css";
  s.textContent=`.v7{position:fixed;z-index:30;display:flex;align-items:flex-end;gap:4px;max-width:min(68vw,260px);animation:v7in .45s ease-out both;cursor:pointer;-webkit-tap-highlight-color:transparent}
.v7 img{width:54px;height:72px;object-fit:contain;flex:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
.v7b{position:relative;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:14px 14px 14px 4px;padding:6px 28px 7px 10px;font:14px/1.55 var(--serif);box-shadow:0 3px 12px rgba(0,0,0,.2);margin-bottom:18px}
.v7b b{display:block;font:700 12px var(--sans);color:var(--accent)}.v7b span{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.v7x{position:absolute;right:2px;top:2px;width:24px;height:24px;border:0;border-radius:50%;background:none;color:var(--muted);font-size:15px;line-height:24px;padding:0}
.v7.inl{position:relative;z-index:auto;max-width:none;margin:6px 0 2px}.v7.inl .v7b{flex:1}
.v7.out{opacity:0;transform:translateY(-6px);transition:opacity .4s,transform .4s;pointer-events:none}
.v7.v7h{z-index:60;max-width:min(78vw,300px)}.v7.v7h img{width:40px;height:54px}.v7.v7h .v7b{margin-bottom:8px;padding-right:10px}
.v7.v7-thru{pointer-events:none}.v7.v7-thru>img,.v7.v7-thru .v7x{pointer-events:auto}
@keyframes v7in{from{opacity:0;transform:translateY(-8px) scale(.96)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.v7{animation:none}}
.v7s{display:flex;gap:12px;align-items:center}.v7s img{width:84px;height:112px;object-fit:contain;flex:none}.v7q{font:16px/1.8 var(--serif);margin:0 0 4px}
.v7t{margin-top:12px;padding:10px 12px;border:1px dashed var(--line);border-radius:12px}.v7t p{margin:0 0 8px;line-height:1.7}.v7t .btn{width:100%;margin-top:6px}`;document.head.append(s)}
/* 星槎頁、渡口畫好以後呼叫（07f-ship.js）：where＝"ship"（找不蓋住入口的角落浮出，v7Place）或 "port"（插在主場角色那句話下面） */
function v7Try(v,where){clearTimeout(V7_T);if(!v7Ok())return;const rn=typeof ROUTE_N!=="undefined"?ROUTE_N:0;
  V7_T=setTimeout(()=>{try{if(!v.isConnected||(typeof ROUTE_N!=="undefined"&&ROUTE_N!==rn)||document.hidden)return;
    if(document.querySelector("#sheet,.modal,.ecover,.v7"))return;
    let here="classic";try{here=shipHere()}catch(e){}const ps=v.querySelector(".port-say img"),ex=ps&&(/prev_(x_[a-z]+)\./.exec(ps.getAttribute("src")||"")||[])[1],S=v7St(),P=v7Pick(S,here,ex);if(!P)return;
    const c=P.c,C=WX_CHARS[c];if(!C)return;const nq=!P.back&&!S.q?v7QNext(c,S):null,line=P.back?v7Txt(v7QOf(c,S.q.id).thx,c):v7Txt(nq&&nq.hi?nq.hi:v7Line(c,S,here),c);   /* 11/18：這趟要請「去下一盤」的，泡泡先問候（hi），點開再邀 */
    if(!P.back){S.n[c]=(S.n[c]||0)+1;S.day[c]=localDay()}S.last=Date.now();store.set("visit7",S);
    v7Show(v,where,c,line,!!P.back)}catch(e){}},1600)}
function v7Show(v,where,c,line,back){v7Css();const C=WX_CHARS[c],nm=C.nk||C.n,el=document.createElement("div");el.className="v7"+(where==="port"?" inl":"");el.setAttribute("role","button");el.setAttribute("aria-label",nm+"來串門子");
  el.innerHTML=`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><div class="v7b"><b>${back?"🎁 ":"🚪 "}${esc(nm)}${back?"回來了":"來串門子"}</b><span>「${esc(line)}」</span><button class="v7x" aria-label="先不聊">✕</button></div>`;
  const bye=()=>{el.classList.add("out");setTimeout(()=>el.remove(),450)};
  el.querySelector(".v7x").onclick=e=>{e.stopPropagation();vibrate(5);bye()};
  el.onclick=()=>{vibrate(5);el.remove();v7Sheet(c,line,back)};
  if(where==="port"){const a=v.querySelector(".port-say");if(!a)return;a.after(el)}
  else{el.style.visibility="hidden";v.append(el);v7Place(v,el);el.style.visibility="";setTimeout(()=>{if(el.isConnected)bye()},15000)}
  vibrate(8)}
/* 星槎頁：找一個不蓋住圖上入口（.shp-hs）和站名（.shp-cap）的角落：站名下面、畫面左下、右下、左上，都蓋到就挑蓋得最少的 */
/* 11/17 Windows 測試員 D P2-C（英文、中文都一樣）：星槎頁「方庭來串門子」泡泡蓋住「棋話一頁」入口的一半。原本只試 5 個角落、泡泡寬度固定，
   五個都碰到入口時挑蓋得最少的那個——站名下面那一角只蓋到右上「棋話一頁」左邊一截，代價最小，就被選了。改成：
   ① 除了原本 5 個角落（照舊優先），再沿左右兩邊每 16px 往下找（v7Spot）；② 都找不到不蓋的，泡泡縮窄一點再找（V7_SHRINK，最窄 V7_MINW），
   左上那一角縮窄後就讓得開右上的入口；③ 真的怎樣都會碰到：泡泡本身點擊穿透（.v7-thru），只留頭像、✕ 能按，底下的入口照樣點得到；
   ④ 放好後 0.7、2 秒各看一次（換英文字、07sp／07x 推標籤以後入口會挪位置），又蓋到了就重放。v7Cost／v7Spot 是純計算（node 測試用 vm 跑） */
const V7_SHRINK=[0,40,80,120],V7_MINW=150;
function v7Cost(x,y,W,H,B){let s=0;for(const b of B)s+=Math.max(0,Math.min(x+W,b.right)-Math.max(x,b.left))*Math.max(0,Math.min(y+H,b.bottom)-Math.max(y,b.top));return s}
function v7Spot(R,W,H,top,bot,B){const L=R.left+8,Rt=R.right-W-8,C=[[L,top],[L,bot],[Rt,bot],[Rt,top],[L,R.top+8]];for(let y=top;y<=bot;y+=16)C.push([L,y],[Rt,y]);
  let best=C[0],bc=Infinity;for(const p of C){const c=v7Cost(p[0],p[1],W,H,B);if(c<bc){bc=c;best=p}if(!c)break}return{p:best,c:bc}}
function v7Boxes(v){return[...v.querySelectorAll(".shp-hs,.shp-cap,.shp-gy,#mdone"),...document.querySelectorAll(".xqbot,#sndPill")].map(e=>e.getBoundingClientRect()).filter(b=>b.width&&b.bottom>v.getBoundingClientRect().top&&b.top<v.getBoundingClientRect().bottom)}
function v7Place(v,el){const R=v.getBoundingClientRect(),cap=v.querySelector(".shp-cap"),cb=cap?cap.getBoundingClientRect().bottom:R.top,B=v7Boxes(v);
  el.classList.remove("v7-thru");el.style.maxWidth="";const W0=el.offsetWidth;let pick=null;
  for(let i=0;i<V7_SHRINK.length;i++){if(i){const w=Math.max(V7_MINW,W0-V7_SHRINK[i]);if(w>=W0)break;el.style.maxWidth=w+"px"}
    const W=el.offsetWidth,H=el.offsetHeight,top=Math.max(R.top,Math.min(cb,R.top+R.height*.3))+6,bot=Math.min(R.bottom,innerHeight)-H-14,r=v7Spot(R,W,H,top,bot,B);
    if(!pick||r.c<pick.c)pick={p:r.p,c:r.c,mw:el.style.maxWidth};if(!r.c)break}
  el.style.maxWidth=pick.mw;el.style.left=Math.round(pick.p[0])+"px";el.style.top=Math.round(pick.p[1])+"px";el.classList.toggle("v7-thru",pick.c>0);
  if(!el.dataset.v7r){el.dataset.v7r="1";for(const t of[700,2000])setTimeout(()=>{try{if(!el.isConnected||el.classList.contains("out"))return;const q=el.getBoundingClientRect();if(v7Cost(q.left,q.top,q.width,q.height,v7Boxes(v))>0)v7Place(v,el)}catch(e){}},t)}}
function v7Go(q){if(q.t==="read"){try{SHIP_RD_BACK=location.hash}catch(e){}location.hash="#/ship/read/"+q.k}else location.hash=q.t==="play"?"#/cpu":"#/canju"}
function v7Desc(q){if(q.t==="play")return"♟ 下完一盤棋（挑戰電腦、園子都算，雙方各走 5 步以上）";if(q.t==="pz")return"🍵 解開一題殘局（一盞茶或千秋殘局都算，看答案不算）";
  const n=SHIP_ROUTE.indexOf(q.k)+1;return`📖 讀《雲河七星》第${CNUM(n)}章（${shipShort(q.k)}）`}
function v7GoLbl(q){return q.t==="play"?"♟ 去下一盤":q.t==="pz"?"🍵 去解一題":"📖 去讀這一章"}
function v7Sheet(c,line,back){const C=WX_CHARS[c],nm=C.nk||C.n;
  sheet("🚪 "+nm+(back?"回來了":"來串門子"),b=>{const paint=msg=>{const S=v7St(),q=S.q&&S.q.c===c?v7QOf(c,S.q.id):null,qd=q&&v7QDone(S.q),nx=!S.q?v7QNext(c,S):null,
      helped=Object.keys(S.done).filter(k=>k.startsWith(c+":")).length;
    let t="";
    if(q&&qd)t=`<div class="v7t"><p>${esc(v7Desc(q))}　✅ 做到了</p><button class="btn" id="v7Get">🎁 收下謝禮（+${V7_XP} 修為）</button></div>`;
    else if(q)t=`<div class="v7t"><p class="muted">${esc(v7Txt("還在等{你}：",c))}</p><p>${esc(v7Desc(q))}</p><p class="v7q" style="font-size:15px">「${esc(v7Txt(q.wait,c))}」</p><button class="btn" id="v7Go">${v7GoLbl(q)}</button><button class="btn ghost" id="v7Drop">這件先放著（之後還能再接）</button></div>`;
    else if(nx)t=`<div class="v7t"><p class="v7q" style="font-size:15px">「${esc(v7Txt(nx.ask,c))}」</p><p class="muted">${esc(v7Desc(nx))}・完成送 ${V7_XP} 修為</p><button class="btn" id="v7Ok">🤝 好，交給我</button><button class="btn ghost" id="v7No">下次吧</button></div>`;
    b.innerHTML=`<div class="v7s"><img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><div><p class="v7q">「${esc(msg)}」</p><p class="muted" style="margin:0;font-size:13px">${esc(C.n)}・${esc(C.s||"")}<br>🤝 來過 ${S.n[c]||0} 次・幫過 ${helped} 件事</p></div></div>${t}${t?"":`<button class="btn ghost" id="v7Bye" style="width:100%;margin-top:12px">👋 待會兒見</button>`}`;
    const on=(id,fn)=>{const e=b.querySelector(id);if(e)e.onclick=()=>{vibrate(5);fn()}};
    on("#v7Bye",()=>closeSheet());
    on("#v7Get",()=>{const S2=v7St();if(!S2.q||S2.q.c!==c)return;const id=S2.q.id;S2.done[c+":"+id]=Date.now();S2.q=null;store.set("visit7",S2);addXP(V7_XP,"羈絆",`v7:${c}:${id}`);try{saveNow(true)}catch(e){}paint(v7Txt(q.thx,c))});
    on("#v7Go",()=>{closeSheet();setTimeout(()=>v7Go(q),240)});
    on("#v7Drop",()=>{const S2=v7St();S2.q=null;store.set("visit7",S2);paint(v7Txt("好，那下次再說。",c))});
    on("#v7Ok",()=>{const S2=v7St();S2.q={c,id:nx.id,t:nx.t,k:nx.k||null,tail:nx.t==="read"?null:v7Tail(nx.t),at:Date.now()};store.set("visit7",S2);try{saveNow(true)}catch(e){}closeSheet();v7Say(c,nx.yes);setTimeout(()=>v7Go(nx),240)});
    on("#v7No",()=>{closeSheet();v7Say(c,nx.no)})};
  paint(line)})}
/* 答應、婉拒那一句：小提示「城子：「嗯。我站旁邊。」」（沒寫就不說） */
function v7Say(c,s){if(!s)return;const C=WX_CHARS[c]||{};try{toast((C.nk||C.n||"")+"：「"+v7Txt(s,c)+"」")}catch(e){}}

/* ================= 👀 本命子提示（11/18 開發者：七星串門子改成「你去下一盤，我在旁邊看」）=================
   接了來訪者「去下一盤」的請託（visit7.q.t==="play"、還沒做到）以後下的那盤：只在練功房、快速對局（挑戰電腦、不算段位）和園子（journey "park"）；
     晉級賽（ranked）、錯棋重練（practice）、擂台、盲棋、其他旅程關卡（石桌往事、黑洞…）一律不出聲。
   輪到你走、電腦不在想的時候（每個局面只看一次），背景問提示用的引擎（/an/engine，跟 07-legend jBattleHint 同一支，ms 短、跟電腦思考錯開 0.7 秒）：
     最好那步評為正著／妙著（V7H_BIG：跟第二好差很多＝妙著，其他＝正著），而且動的是來訪者的本命子（WX_CHARS.pc），就有 40% 機率說一句。
   一盤最多 3 次、兩次至少隔 4 步、開局先走滿 3 步（雙方合計）才開始；分析失敗、局面已經變了＝不提示。
   提示：只亮那顆本命子（pHint 只給 f，不畫落點）；棋盤旁冒小頭像＋泡泡（V7[角色].h，{名}／{你} 照隨行那位叫），4 秒淡出、點一下就關；讀螢幕念一次（axSay）。
   不改完成條件、不改修為（完成照舊看 xpKeys 的 g: 鍵）。v7HGrade／v7HPre／v7HJudge／v7HMode 是純函式（node 測試用 vm 跑）；亂數 V7H_RND 可換。 */
const V7H_PC={"帥":"K","仕":"A","相":"B","傌":"N","俥":"R","炮":"C","兵":"P"},V7H_P=.4,V7H_MAX=3,V7H_GAP=4,V7H_MIN=3,V7H_BIG=150,V7H_MS=800,V7H_DLY=700,V7H_SHOW=4000;
let V7H_RND=()=>Math.random(),V7H_KEY="",V7H_EL=null,V7H_T=0;
function v7HGrade(L){const a=(L||[])[0];if(!a||!a.pvm||!a.pvm[0])return null;const b=L[1];if(!b)return"正著";const sc=x=>x.mate!=null?Math.sign(x.mate)*30000:(+x.vr||0);return Math.abs(sc(a)-sc(b))>=V7H_BIG?"妙著":"正著"}
function v7HMode(st){if(!st||st.result||st.ranked||st.practice||st.arena||st.blind||st.online)return false;const j=st.journey||"";if(j)return j==="park";return!st.kind||st.kind==="cpu"}
/* o＝{ok 這種盤可以, n 已走幾步, k 這盤提示過幾次, at 上次提示在第幾步, r 亂數}；先過這關才去問引擎 */
function v7HPre(o){return!!(o&&o.ok&&o.n>=V7H_MIN&&o.k<V7H_MAX&&(o.at==null||o.n-o.at>=V7H_GAP)&&o.r<V7H_P)}
/* 再加 q 評等、pc 這步動的子（大寫字母）、want 本命子字母 */
function v7HJudge(o){return v7HPre(o)&&(o.q==="正著"||o.q==="妙著")&&!!o.pc&&o.pc===o.want}
/* 現在誰在旁邊看：接了 play 請託、還沒做到、不是隨行那位自己 */
function v7HWho(){try{const S=v7St(),q=S.q;if(!q||q.t!=="play"||!V7[q.c]||q.c===v7Mate()||v7QDone(q))return"";return q.c}catch(e){return""}}
function v7HGame(id){const G=store.get("v7h",null);return G&&G.id===id?G:{id,k:0,at:null}}
/* 08b-cpugame.js 每次畫好棋盤呼叫：st＝目前局面；anchor()＝棋盤元素；show(h)＝在棋盤上亮那顆子，局面已經不是那一步回 false */
function v7Watch(st,anchor,show){try{if(!st||!st.id||st.result||st.turn!==st.human||st.thinking)return;const c=v7HWho();if(!c)return;
  const n=(st.moves||[]).length,key=st.id+":"+n;if(V7H_KEY===key)return;V7H_KEY=key;
  const G=v7HGame(st.id),o={ok:v7HMode(st),n,k:G.k,at:G.at,r:V7H_RND()};if(!v7HPre(o))return;
  const board=(st.board||[]).slice(),side=st.human,id=st.id;
  setTimeout(async()=>{try{if(V7H_KEY!==key)return;const d=await api("/an/engine",{board,side,ms:V7H_MS,multipv:2}),L=(d&&d.lines)||[],q=v7HGrade(L);if(!q||V7H_KEY!==key)return;
    const f=window.XQCore.parseSq(String(L[0].pvm[0]).slice(0,2)),p=board[f],pc=p?String(p).toUpperCase():"",want=V7H_PC[(WX_CHARS[c]||{}).pc]||"";
    if(!v7HJudge(Object.assign({},o,{q,pc,want})))return;if(!show({id,f,t:null,n}))return;
    const G2=v7HGame(id);G2.k=(G2.k||0)+1;G2.at=n;store.set("v7h",G2);v7HSay(c,anchor)}catch(e){}},V7H_DLY)}catch(e){}}
function v7HLine(c){const H=(V7[c]||{}).h||[];return H.length?v7Txt(H[Math.floor(V7H_RND()*H.length)%H.length],c):""}
function v7HClose(){clearTimeout(V7H_T);const el=V7H_EL;V7H_EL=null;if(!el)return;el.classList.add("out");setTimeout(()=>el.remove(),400)}
try{if(typeof addEventListener==="function")addEventListener("hashchange",()=>v7HClose())}catch(e){}   /* 換頁就收掉 */
function v7HSay(c,anchor){const s=v7HLine(c);if(!s)return;const C=WX_CHARS[c]||{},nm=C.nk||C.n||"";v7Css();v7HClose();
  const el=document.createElement("div");el.className="v7 v7h";el.setAttribute("role","button");el.setAttribute("aria-label",nm+"：「"+s+"」");
  el.innerHTML=`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><div class="v7b"><b>👀 ${esc(nm)}</b><span>「${esc(s)}」</span></div>`;
  el.onclick=e=>{e.stopPropagation();vibrate(5);v7HClose()};document.body.append(el);V7H_EL=el;
  let a=null;try{a=anchor&&anchor()}catch(e){}let R=a&&a.getBoundingClientRect?a.getBoundingClientRect():null;if(!R||!R.width){const cv=document.querySelector("canvas");R=cv?cv.getBoundingClientRect():null}
  const H=el.offsetHeight||80;if(R&&R.width){const top=R.top-H-6>=8?R.top-H-6:Math.min(innerHeight-H-8,R.bottom+6);el.style.left=Math.round(Math.max(8,R.left+8))+"px";el.style.top=Math.round(Math.max(8,top))+"px"}
  else{el.style.left="12px";el.style.bottom="96px"}
  try{axSay(nm+"：「"+s+"」")}catch(e){}V7H_T=setTimeout(v7HClose,V7H_SHOW)}
