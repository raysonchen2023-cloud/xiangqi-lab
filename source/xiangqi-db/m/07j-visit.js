/* ================= 🚪 七星來訪（Gemini 遊玩樂趣評估「其他六位當訪客」，開發者 11/8 核准）=================
   玩家只選一位雲河七星，其他六位不定時到星槎頁（#/adventure，Voyage）或渡口（#/port，Port；船艙那一站也是這頁）串門子：
     星槎頁＝左上角冒出小立繪＋對話泡泡（不擋圖上的入口，15 秒後自己退下）；渡口＝「主場角色那句話」下面多一張小卡。
   出現規則（v7Pick）：要有雲河七星的旅程（說書人的學徒不來）；每次進這兩頁 35% 機率；兩次來訪至少隔 30 分鐘；
     每人每天最多一次、一天最多 3 位、同一時間只有一位；這一站是誰的家鄉或主場（CHAR_ERA、SHIP_STOP.who），六成機率先挑他。
   台詞（V7[角色].l）：[句子, 只在哪一站說（空＝哪裡都行）, 要讀過哪一章才說（shipRead；免得先說破劇情）]；先挑這一站的、沒說過的句子。
     {名}＝怎麼叫玩家（照小說：方庭不叫「庭哥」；小梅叫燕子「燕子姊姊」），{你}＝玩家是女生就換成「妳」。人物口吻照《雲河七星》最終定稿。
   小任務（V7[角色].q，每人 2 件，同一時間只接 1 件）：play＝下完一盤（雙方各 5 步以上，就是 journeyGameEnd 給「對局」修為的那種）、
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
   q:[{id:"play",t:"play",ask:"{名}，陪我下一盤。我想看{你}的車怎麼走。",wait:"不急。下完了再來找我。",thx:"……下完了。路是直的，好。"},
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
   q:[{id:"pz",t:"pz",ask:"幫我看一題殘局好不好？我守慣了，攻的那一步，請{你}替我想。",wait:"慢慢來，解開了再告訴我。",thx:"解開了？原來攻的人，是這樣看棋的。謝謝{你}。"},
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
   q:[{id:"play",t:"play",ask:"{名}，陪我下一盤！輸了不准哭——我是說我自己！",wait:"還沒下完？快去快去！",thx:"下完啦？好！這一聲是{你}的！"},
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
   q:[{id:"read",t:"read",k:"yuan",ask:"第十一章……是我回家的事。{你}要讀嗎？讀完不准笑我呀。",wait:"第十一章嘛，讀了沒呀？",thx:"讀完啦？……嘿嘿，那我就不用再說一遍了。"},
      {id:"play",t:"play",ask:"陪我下一盤嘛！我的馬跳得可快了！",wait:"還沒下完呀？我等{你}！",thx:"下完啦！我就說繞路也到得了！"}]},
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
   q:[{id:"pz",t:"pz",ask:"勞{你}替我解一題殘局。解開了，告訴我{你}是怎麼想的。",wait:"不必急，我在這裡等。",thx:"解開了？……原來是這樣走。我記下了，多謝。"},
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
   q:[{id:"read",t:"read",k:"tang",ask:"第八章，長安。……{你}讀了再說。",wait:"第八章。",thx:"讀了。……那個繩結，我後來自己學會了。"},
      {id:"play",t:"play",ask:"下一盤？我守，{你}攻。",wait:"下完再說。",thx:"嗯。{你}攻得好。"}]},
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
   q:[{id:"pz",t:"pz",ask:"{名}，幫我解一題殘局啦！小兵怎麼過河，我一個人想不出來。",wait:"還沒解開？不急不急，我先去跑一趟腿。",thx:"解開啦？好！這個我記著，得還{你}一回！"},
      {id:"read",t:"read",k:"qing",ask:"第十三章是揚州，下雪那回。{你}讀了，就知道我家鄉長什麼樣子啦。",wait:"第十三章！讀了沒啦？",thx:"讀完啦？……那天的雪好冷，可是大家都在。"}]}};
const V7_CALL={x_shuai:"方庭"},V7_P=.35,V7_GAP=30*6e4,V7_BACK=3*6e4,V7_DAYMAX=3,V7_XP=15;
const V7_PFX={play:["g:"],pz:["cj:","ship:"]};
let V7_T=0;
function v7St(){const S=store.get("visit7",null)||{};for(const k of["n","day","seen","done"])if(!S[k]||typeof S[k]!=="object")S[k]={};return S}
function v7Txt(s,c){const me=myChar(),M=WX_CHARS[me]||{},nm=me==="x_spiritgirl"&&c==="x_miaogirl"?"燕子姊姊":V7_CALL[me]||M.nk||M.n||"";return String(s).replace(/\{名\}/g,nm).replace(/\{你\}/g,M.sx==="f"?"妳":"你")}
function v7Tail(t){const K=store.get("xpKeys",{})||{},P=V7_PFX[t]||[];let last=null;for(const k in K)if(P.some(p=>k.startsWith(p)))last=k;return last}
function v7QDone(q){if(!q)return false;if(q.t==="read")return!!(store.get("shipRead",{})||{})[q.k];const t=v7Tail(q.t);return t!==null&&t!==q.tail}
function v7QOf(c,id){return((V7[c]||{}).q||[]).find(x=>x.id===id)||null}
/* 這位現在可以請託哪件事：沒做過的；讀某一章要那一站停靠過、還沒讀過 */
function v7QNext(c,S){const R=store.get("shipRead",{})||{};let D=[];try{D=shipDocked()}catch(e){}
  return((V7[c]||{}).q||[]).find(x=>!S.done[c+":"+x.id]&&(x.t!=="read"||(!R[x.k]&&D.includes(x.k))))||null}
function v7Ok(){try{return!!journey()&&!!myChar()&&!shipAppr()}catch(e){return false}}
function v7Pick(S,here,ex){const me=myChar(),now=Date.now(),today=localDay();   /* ex＝畫面上已經在說話的那位（渡口的主場角色），不重複出來 */
  if(S.q&&V7[S.q.c]&&S.q.c!==me&&S.q.c!==ex&&v7QDone(S.q))return now-(S.last||0)>=V7_BACK?{c:S.q.c,back:1}:null;
  if(now-(S.last||0)<V7_GAP)return null;if(Object.values(S.day).filter(d=>d===today).length>=V7_DAYMAX)return null;
  if(Math.random()>=V7_P)return null;
  const L=Object.keys(V7).filter(c=>c!==me&&c!==ex&&S.day[c]!==today);if(!L.length)return null;
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
@keyframes v7in{from{opacity:0;transform:translateY(-8px) scale(.96)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.v7{animation:none}}
.v7s{display:flex;gap:12px;align-items:center}.v7s img{width:84px;height:112px;object-fit:contain;flex:none}.v7q{font:16px/1.8 var(--serif);margin:0 0 4px}
.v7t{margin-top:12px;padding:10px 12px;border:1px dashed var(--line);border-radius:12px}.v7t p{margin:0 0 8px;line-height:1.7}.v7t .btn{width:100%;margin-top:6px}`;document.head.append(s)}
/* 星槎頁、渡口畫好以後呼叫（07f-ship.js）：where＝"ship"（找不蓋住入口的角落浮出，v7Place）或 "port"（插在主場角色那句話下面） */
function v7Try(v,where){clearTimeout(V7_T);if(!v7Ok())return;const rn=typeof ROUTE_N!=="undefined"?ROUTE_N:0;
  V7_T=setTimeout(()=>{try{if(!v.isConnected||(typeof ROUTE_N!=="undefined"&&ROUTE_N!==rn)||document.hidden)return;
    if(document.querySelector("#sheet,.modal,.ecover,.v7"))return;
    let here="classic";try{here=shipHere()}catch(e){}const ps=v.querySelector(".port-say img"),ex=ps&&(/prev_(x_[a-z]+)\./.exec(ps.getAttribute("src")||"")||[])[1],S=v7St(),P=v7Pick(S,here,ex);if(!P)return;
    const c=P.c,C=WX_CHARS[c];if(!C)return;const line=P.back?v7Txt(v7QOf(c,S.q.id).thx,c):v7Txt(v7Line(c,S,here),c);
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
function v7Place(v,el){const R=v.getBoundingClientRect(),W=el.offsetWidth,H=el.offsetHeight,cap=v.querySelector(".shp-cap"),cb=cap?cap.getBoundingClientRect().bottom:R.top,
    top=Math.max(R.top,Math.min(cb,R.top+R.height*.3))+6,bot=Math.min(R.bottom,innerHeight)-H-14,
    C=[[R.left+8,top],[R.left+8,bot],[R.right-W-8,bot],[R.right-W-8,top],[R.left+8,R.top+8]],
    B=[...v.querySelectorAll(".shp-hs,.shp-cap,.shp-gy,#mdone"),...document.querySelectorAll(".xqbot,#sndPill")].map(e=>e.getBoundingClientRect()).filter(b=>b.width&&b.bottom>R.top&&b.top<R.bottom);
  const cost=([x,y])=>B.reduce((s,b)=>s+Math.max(0,Math.min(x+W,b.right)-Math.max(x,b.left))*Math.max(0,Math.min(y+H,b.bottom)-Math.max(y,b.top)),0);
  let best=C[0],bc=Infinity;for(const p of C){const c=cost(p);if(c<bc){bc=c;best=p}if(!c)break}
  el.style.left=Math.round(best[0])+"px";el.style.top=Math.round(best[1])+"px"}
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
    on("#v7Ok",()=>{const S2=v7St();S2.q={c,id:nx.id,t:nx.t,k:nx.k||null,tail:nx.t==="read"?null:v7Tail(nx.t),at:Date.now()};store.set("visit7",S2);try{saveNow(true)}catch(e){}closeSheet();setTimeout(()=>v7Go(nx),240)});
    on("#v7No",()=>closeSheet())};
  paint(line)})}
