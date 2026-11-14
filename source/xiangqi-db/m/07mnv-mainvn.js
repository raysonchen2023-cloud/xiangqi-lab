/* ================= 💬 主線對話場景播放器（開發者 11/14：第二章重做，story/第二章新腳本_初稿_1114.md「程式要做的」1～7）=================
   第一章是「即時演出的電影」（07mnf mnfPlay）；第二章起改成「對話場景」：背景圖＋左右立繪＋名字框＋對話框，中間有調查點、方案選擇、安排順序、閃回、解題。
   11/14 第二輪（story/主線玩法多樣化_提案與決定_1114.md，開發者實玩「一直點會很無聊」）：必經翻句從約 55 次壓到 18～24 次；
     短對話改成「氣泡一次淡入」（bub，點一次看完一段）；生活場景改成「觀察 → 選方案 → 選錯演出結果再回到決定前」（pick）、「安排順序」（order）、自動演出可略過（show）；
     棋局前可「試看」兩個候選著（verified 的線，可暫停、回原局），新手三段支援「自己來／幫我看／陪我走」，熟手不用幫忙一次走對有隱藏對話（if:"perfect"）。
   這支只管「播」：章的進度（看到第幾場、解題紀錄、千秋殘局記一題、儀式）在 07mnq，用 opt 的回呼接（onScene、onChoice、onSolved、onEnd、onRetry、onLeave）。
   資料：MNV_CH[章代號]＝{lead 主角, qte 危機題（MNF_QTE 的代號）, card 任務卡, sc:[場…], end 章末卡}；場＝{id, nm 場名, bg 背景（MNF_IMG 代號）, kb [縮放,焦點x%,焦點y%], cast [左,右], mus [配樂,音量], est 預估秒數, st:[步驟…]}。
   步驟（格式說明：story/主線電影_加一章的資料格式.md 第九、十節）：
     台詞 [說話的人, 字, {bg,kb,tr 換背景, at:[x,y,縮放] 推到圖上這一點, cast 換立繪, side 站哪邊, act 動作小字, fx 音效, shk 震動}]，說話的人＝MNV_WHO 代號，"" 是旁白；
     {bub:[台詞…2～4 句],gap 秒} 氣泡一次淡入（點一次看完整段；減少動態時一起出現）；
     {bg,kb,tr} 換背景、{cast:[左,右]} 換立繪、{mus:[配樂,音量]}、{wait:秒} 安靜一下；
     {look:[熱點…],need,go,say} 調查點：熱點＝{x,y（原圖像素）或 on:立繪代號＋x,y（立繪 %）, lb 名字, clue 看到什麼（不用翻句，會帶到方案選擇）, st 台詞, go:1 點了就往下, opt:1 選讀}；
     {pick:{ask,key,opt:[{t,ok:1?,st}…]}} 方案選擇：看過的線索列在旁邊；選錯演出 st 再回到決定前；
     {order:{ask,key,items:[{k,t,who}],ok:[順序],fail:[{when:[開頭],st}],st}} 安排順序：照順序點完按「開始」，順序錯演出那條 fail 再重排；
     {show:[{bg,kb,cap,fx,shk}…],dt 秒} 自動演出（不用點，可「略過演出」）；{if:"perfect",st} 條件段（perfect＝這章的棋不用幫忙、沒試看、一次走對）；
     {ask,key,opt}（二選一）、{seq}（依序交物件）、{btn:按鈕字,say}（單一行動）、{fb:標籤,bg,kb,st}（閃回）、{pz:1}（危機解題，不能跳過）、{rite:1}（儀式，07mnf mnfSolveRite 短版）。
   跳過＝快轉到這一場結束（選項不記、調查點不看），解題和儀式照樣要做；離開＝存到上一場，下次從這一場開頭接著看。
   解題卡（mnvPz）：試看（P.trial）→ 自己走；自己來／幫我看（標出要動的子、候選著、走過去會被吃的格子）／陪我走（演一步，下一個決定交回玩家）；
     走錯時棋盤上播一手真正的反駁再停住（按「退回重想」），錯 2 次自動「幫我看」；題庫沒列的走法用規則往下算（mnvMate）也算對；不設倒數。
   減少動態：不推拉、不呼吸、不打字、不震動、氣泡一起出現，換圖直接切。介面字用 07i18n 的鍵（vn.*），故事台詞不翻。
   名稱前綴 mnv／MNV（11/14 grep m/*.js 確認沒人用）。 */
/* 說話的人：im＝立繪 data/vn/<im>.webp（七星，park/wuxia_final 綠幕去背）；npc＝場景裡的人，只出名字框 */
const MNV_WHO={zhe:{nm:"阿轍",fn:"齊轍",im:"x_swordboy"},yan:{nm:"燕子",fn:"田飛燕",im:"x_spiritgirl"},hua:{nm:"花兒",fn:"雷借花",im:"x_martialgirl"},mei:{nm:"小梅",fn:"駱躍梅",im:"x_miaogirl"},
  ting:{nm:"庭哥",fn:"沈方庭",im:"x_shuai"},cheng:{nm:"城子",fn:"鐵連城",im:"x_shi"},xi:{nm:"溪兒",fn:"步越溪",im:"x_bing"},   /* fn：開發者 11/14 名字框「第一次出場全名，之後暱稱」（每次播放各算一次） */
  lao:{nm:"老伯",npc:1},jun:{nm:"軍爺",npc:1},fu:{nm:"父親",npc:1},xzhe:{nm:"小阿轍",npc:1},shu:{nm:"說書人",npc:1}};
const MNV_LINE=34;   /* 一句最多幾個字（手機 375 寬兩行放得下） */
const MNV_IF={perfect:r=>!!(r&&r.perfect)};   /* if 條件：r＝這一章的解題結果 */
/* ---------- 第二章「秦・日落之前」（story/第二章新腳本_初稿_1114.md＋主線玩法多樣化_提案與決定_1114.md「第二章怎麼改」；故事來源 雲河七星長篇/ChatGPT定稿_2026-11-06/第02章_定稿.md）----------
   新圖還沒畫：先用最接近的舊圖（MNF_IMG 第二章那組＋第一章的船艙 cabin），標 待新圖。熱點座標是 768×1376 原圖像素（量法見 07mnf 第二章圖那段註解）。
   配樂先用現有曲目（qin/bianzhong_1、film/c2_crisis、film/c2_end），開發者實際聽過再換。標〔新〕的台詞是為了互動新寫的（長篇沒有）。
   必經翻句（照 mnvTaps 算，選對、不看選讀）：1 場 2、2 場 3、3 場 2、4 場 2、5 場 2、6 場 3、7 場 2、8 場 2，共 18。玩家決定：2 場選方案、3 場請老伯看裂軸、4 場排順序、7 場試看＋下棋。 */
const MNV_CH={qin:{lead:"zhe",qte:"c2",kicker:"第二章",
  card:{bg:"stuck",kb:[1.15,62,62],t:"秦・日落之前",b:["坡腳的老伯拉不動車，車軸也快撐不住了。","跟阿轍一起穩住木車，幫大家把路讓出來。"],go:"去看木車"},
  sc:[
  {id:"c2s1",nm:"看路的人",bg:"road",kb:[1.2,32,45],cast:["zhe","xi"],mus:["qin/bianzhong_1.mp3",.5],est:25,st:[
    {bub:[["zhe","沒有……我爹的車不在這裡。"],["xi","你看一眼就認得？"],["zhe","車轅有道舊疤。遠遠也不會認錯。"]]},
    {look:[{x:300,y:965,lb:"輪印",go:1,st:[{bub:[["zhe","我爹看輪印，就知道車裝得重不重。"],["","坡腳傳來木頭細細的裂聲。",{fx:"crack",shk:4}],["zhe","等一下。那輛車的聲音不對。"]]}]},
      {x:575,y:880,lb:"木量尺",opt:1,st:[["zhe","這裡的車過得去，別處來的也得過得去。我爹說的。"]]}],   /* 待新圖：路邊的木量尺（舊圖先指在路邊量車的人） */
      kb:[1,45,50],say:"查查路上的輪印。"}]},
  {id:"c2s2",nm:"越拉越陷",bg:"clerk",kb:[1.1,35,38],cast:["zhe","mei"],mus:["film/c2_crisis.mp3",.42],est:60,st:[   /* 待新圖：裂開的軸頭特寫（先用 stuck） */
    {bub:[["jun","日頭落下以前，這幾袋都得送到。別堵著後頭的人。"],["lao","我再拉一下……"],["jun","拉直些。路就在前面，往哪裡拐？",{fx:"whip",shk:5}]]},
    {bub:[["zhe","……拉直。走直。",{act:"肩背一緊"}],["mei","旁邊那塊地乾，為什麼不走那裡？"]],bg:"stuck",kb:[1.15,45,58]},
    {look:[{x:240,y:1000,lb:"車輪",clue:"輪子陷在泥裡，一拉又滑回去。"},{x:410,y:690,lb:"土袋",clue:"土袋全擠在歪的那一邊，車太重。"},
      {x:278,y:900,lb:"車軸",clue:"軸頭裂了一道，再壓就斷。",fx:"crack"}],need:3,go:"想好了，叫老伯",say:"先看清楚：車輪、土袋、車軸。"},
    {pick:{ask:"要老伯先怎麼做？",key:"rescue",opt:[
      {t:"繼續拉",st:[{bub:[["","輪子動了一下，又陷回泥裡。車身更歪了。",{fx:"crack",shk:6}],["zhe","停！先別拉！"]]}]},
      {t:"先鋪板",st:[{bub:[["lao","車還太重，板子塞不進輪子底下。"],["mei","這車沉得像頭牛，先卸幾袋吧！"]]}]},   /* 小梅那句〔新〕11/14 ChatGPT／Gemini 審稿合併 */
      {t:"先卸重",ok:1,st:[{bub:[["zhe","先別拉，車要倒了。軸頭裂了，再壓下去車斷在這裡。"],["zhe","先卸幾袋，後頭的人才過得來。"]]}]}]}}]},
  {id:"c2s3",nm:"我會看輪子",bg:"tilt",kb:[1.2,48,50],cast:["zhe",null],est:30,st:[
    {bub:[["jun","你會修？"],["zhe","我……我沒自己補過這麼重的車。",{act:"停頓，看向老伯"}]]},
    {look:[{x:330,y:636,lb:"裂軸",go:1,st:[{bub:[["zhe","我會看輪子。裂的地方得請老伯幫忙。"],["lao","先穩住。我來看看裂到哪裡。"],["jun","快點。",{act:"看一眼排隊的車"}]]}]},
      {on:"zhe",x:72,y:78,lb:"腰牌",opt:1,st:[["","阿轍腰上的腰牌，輪紋裡卡著泥。他沒去擦。"]]}],say:"請老伯看看裂軸。阿轍腰上的腰牌也可以看。"}]},
  {id:"c2s4",nm:"大家各做一點",bg:"dry",kb:[1,50,58],cast:["zhe",null],est:50,st:[   /* 待新圖：穩車與卸袋（先用 dry：土袋堆、泥邊的木板都在圖上） */
    {bub:[["","城子先用肩膀抵住車輪，車身不再往下滑。"],["cheng","我抵著，你們慢慢來。"]]},   /* 11/14 ChatGPT 審稿：抵輪先做完，排序只排移車計畫 */
    {order:{ask:"先商量怎麼移車：照你想的順序點三件事，再按「開始」。",key:"plan",
      items:[{k:"la",t:"合力移車",who:["cheng"]},{k:"xie",t:"卸下土袋",who:["xi","hua"]},{k:"dian",t:"泥邊鋪木板",who:["mei"]}],
      ok:["xie","dian","la"],
      fail:[{when:["la"],st:[{bub:[["","車還是太重，輪子往泥裡又沉了一點。",{fx:"crack",shk:5}],["lao","不行，再拉軸頭就斷了！"]]}]},
        {when:["dian"],st:[{bub:[["mei","唔，塞不進去！輪子陷得太深了。"],["xi","我來搭把手，先卸幾袋土！"]]}]},   /* 〔新〕11/14 審稿合併 */
        {when:["xie","la"],st:[{bub:[["cheng","又滑回來了。泥地撐不住。"],["mei","快，墊上木板，輪子才踩得住！"]]}]}],   /* 〔新〕11/14 審稿合併 */
      st:[{bub:[["xi","卸下來的土，我幫忙送，別全堆在腳邊。"],["hua","筐口我扶著。"],["cheng","放這裡？好，你們慢慢卸。"]]},
        {show:[{kb:[1.3,22,62],cap:"溪兒、花兒把土袋一袋袋卸下，車身輕了。"},{kb:[1.35,72,72],cap:"小梅在泥邊鋪好木板。"},
          {kb:[1.2,30,50],cap:"燕子收起地上的繩頭，庭哥在坡邊指出空處。"}]}]}},   /* 移車留到第 5 場補好軸頭之後 */
    {bub:[["lao","可不能叫人說，我把好好的車弄壞了。"],["zhe","先顧車。",{act:"想說又停住"}],["lao","缺個楔子。"]]}]},
  {id:"c2s5",nm:"父親教的結",bg:"stuck",kb:[2.1,41,64],cast:["zhe",null],mus:["qin/bianzhong_1.mp3",.45],est:30,st:[   /* 待新圖：木楔特寫（先用 stuck 推近軸頭） */
    {btn:"削平木楔、綁好繩結",say:"阿轍手上的木楔，有一邊削偏了。"},
    {show:[{kb:[2.3,38,65],cap:"木楔削平，敲進軸頭。",fx:"hang"},{kb:[1.6,40,60],cap:"阿轍把繩子繞了三圈，打了個結。"},{bg:"dry",kb:[1.3,25,56],cap:"城子抵住輪子，大家合力一推——",shk:4,fx:"hang"},{bg:"dry",kb:[1.05,45,55],cap:"車輪壓上木板，停到了乾地上。"}]},
    {bub:[["lao","你爹也是做這個的？"],["zhe","趕糧車。"],["lao","難怪。這個結有人教過。"]]},
    {bub:[["lao","回去叫你爹看看，這楔子削得還成。"],["zhe","……嗯。",{act:"低頭摸了摸腰牌"}]]}]},
  {id:"c2s6",nm:"那天為什麼轉彎",bg:"cabin",kb:[1.1,55,52],cast:["zhe","yan"],mus:["film/c2_end.mp3",.3],est:30,st:[
    {bub:[["yan","還有地方疼？"],["zhe","我一直怪他，為什麼偏要走那條路。"]]},
    {fb:"那個雨夜",bg:"rain",kb:[1.25,70,62],st:[{bub:[["xzhe","爹，官糧不送了嗎？"],["fu","先送你去看病。",{act:"伸手探了探他的額頭"}]],gap:1.4}]},   /* 待新圖：雨夜父親探阿轍額頭（先用翻倒的糧車 rain） */
    {bub:[["zhe","他知道會誤期。"],["zhe","……還是先顧我。"]],gap:1.8},
    {wait:1.2}]},
  {id:"c2s7",nm:"替俥找路",bg:"cabin",kb:[1.35,58,60],cast:["zhe","mei"],mus:["film/c2_crisis.mp3",.32],est:90,pzEst:70,st:[
    {bub:[["","阿轍擦掉腰牌輪紋裡的泥。"],["zhe","爹沒有走歪路。"],["zhe","剛才那輛車，越急著拉，陷得越深。"]]},
    {pz:1},
    {if:"perfect",st:[{bub:[["xi","阿轍哥，剛才怎麼停了那麼久？"],["zhe","還沒看明白。總得再看看。"]]}]},   /* 〔新〕11/14 審稿：換溪兒問、不提「沒走歪」，不搶第 8 場小梅的戲。隱藏對話：不用幫我看、陪我走、試看，一次走對才有 */
    ["zhe","車有路了。"]]},
  {id:"c2s8",nm:"一起看路",bg:"window",kb:[1.15,50,55],cast:["zhe","mei"],mus:["film/c2_end.mp3",.6],est:25,st:[
    {bub:[["","窗外，老伯扶著車到了窄處，招手請後頭的人稍等。",{at:[390,780,1.5]}],["zhe","等回去，我想讓爹看看這個結。"]]},
    {bub:[["mei","阿轍，下回你要是看見路堵住了，先叫我。"],["zhe","叫妳做什麼？"],["mei","一起看啊。你以為彎路隨便拐就能走？"],["","這一次，先笑的人是阿轍。"]],kb:[1.15,50,55]},
    {rite:1}]}],
  end:{bg:"bench",seal:"秦",t:"秦之印",s:"先看清楚，再決定怎麼走。",b:"回星槎",g:"再試這盤棋"}}};
/* ---------- 純計算（測試 xiangqi-lab/tools/test-mainquest.js 用 vm 跑）---------- */
const mnvLen=s=>[...String(s||"")].length;
/* 介面字：選了 English 用 07i18n 的 I18N_KEY（vn.*），不然用中文原文；{n} 這類空格兩邊都填 */
const mnvT=(k,z,v)=>{let s=z;try{if(typeof i18nT==="function")s=i18nT(k,z,v)}catch(e){}return v?String(s).replace(/\{(\w+)\}/g,(m,x)=>v[x]!=null?String(v[x]):m):s};
/* 走過一串步驟（含氣泡、選項、方案、順序、調查點、小動作、閃回、條件段裡面的台詞）：f(步驟, 深度) */
function mnvEach(st,f,d){d=d||0;for(const s of st||[]){f(s,d);if(!s||Array.isArray(s))continue;
  if(s.bub)mnvEach(s.bub,f,d+1);if(s.look)for(const p of s.look)mnvEach(p.st,f,d+1);if(s.ask)for(const o of s.opt||[])mnvEach(o.st,f,d+1);if(s.seq)for(const x of s.seq)mnvEach(x.st,f,d+1);
  if(s.pick)for(const o of s.pick.opt||[])mnvEach(o.st,f,d+1);if(s.order){for(const x of s.order.fail||[])mnvEach(x.st,f,d+1);mnvEach(s.order.st,f,d+1)}if(s.fb||s.if)mnvEach(s.st,f,d+1)}}
/* 必經翻句：照「選對、不看選讀、不走錯」那條路，玩家要點幾次才看得完（一句台詞＝1、一段氣泡＝1；自動演出、按鈕、熱點不算） */
function mnvTaps(st){let n=0;for(const s of st||[]){if(Array.isArray(s)){n++;continue}if(!s)continue;if(s.bub)n++;
  if(s.look){for(const p of s.look)if(p.go)n+=mnvTaps(p.st);if(s.go){const R=s.look.filter(p=>!p.go&&!p.opt).map(p=>mnvTaps(p.st)).sort((a,b)=>a-b);for(let i=0;i<Math.min(s.need||0,R.length);i++)n+=R[i]}}
  if(s.pick){const o=(s.pick.opt||[]).find(x=>x.ok);n+=mnvTaps(o&&o.st)}if(s.order)n+=mnvTaps(s.order.st);if(s.ask)n+=mnvTaps((s.opt||[])[0]&&s.opt[0].st);
  if(s.seq)for(const x of s.seq)n+=mnvTaps(x.st);if(s.fb)n+=mnvTaps(s.st)}return n}
/* 玩家要做的決定：方案選擇、安排順序、二選一、解題各算 1 */
function mnvDecide(st){let n=0;mnvEach(st,s=>{if(s&&!Array.isArray(s)&&(s.pick||s.order||s.ask||s.pz))n++});return n}
/* 順序全排列（安排順序要檢查每一種排法都有結果） */
function mnvPerms(a){if(a.length<=1)return[a.slice()];const R=[];a.forEach((x,i)=>{for(const p of mnvPerms(a.filter((_,j)=>j!==i)))R.push([x,...p])});return R}
/* 這個排法的結果：照 ok 就是成功（null），不然找第一條「開頭符合」的 fail */
function mnvOrderFail(Q,seq){if(Q.ok.join()===seq.join())return null;return(Q.fail||[]).find(f=>f.when.every((k,i)=>seq[i]===k))||{none:1}}
/* 名字框要顯示的名字：七星這次播放第一次說話＝「全名（暱稱）」，之後＝暱稱；配角照名字（開發者 11/14） */
function mnvNmFirst(P,w,seen){if(!P)return"";if(!P.fn||!seen||seen.has(w))return P.nm;seen.add(w);return P.fn+"（"+P.nm+"）"}
/* 圖在畫面上的位置：kb＝[縮放,焦點x%,焦點y%]，焦點擺在畫面 50%、42%（對話框在下面），不露出圖邊；回傳 {s 縮放, ox, oy}（螢幕像素） */
function mnvView(W,H,kb,IW,IH){IW=IW||768;IH=IH||1376;kb=kb||[1,50,50];const z=Math.max(1,kb[0]||1),s=Math.max(W/IW,H/IH)*z,fx=(kb[1]==null?50:kb[1])/100*IW,fy=(kb[2]==null?50:kb[2])/100*IH;
  const ox=Math.min(0,Math.max(W-IW*s,W/2-fx*s)),oy=Math.min(0,Math.max(H-IH*s,H*.42-fy*s));return{s,ox,oy}}
/* 檢查一章的資料：回傳問題清單（空＝沒問題）；img＝MNF_IMG（圖代號表） */
function mnvCheck(CH,id,img){const P=[],N=id||"?",I=img||(typeof MNF_IMG!=="undefined"?MNF_IMG:{}),W=MNV_WHO;
  if(!CH||!Array.isArray(CH.sc)||!CH.sc.length)return[N+"：沒有場"];if(!W[CH.lead]||W[CH.lead].npc)P.push(N+"：lead 要是七星");
  const c=CH.card;if(!c||!c.t||!c.go||!Array.isArray(c.b)||!I[c.bg])P.push(N+"：任務卡要有 t、b（幾行字）、go、bg");
  const e=CH.end;if(!e||!e.t||!e.b||!e.seal||!I[e.bg])P.push(N+"：章末卡要有 t、b、seal、bg");
  const ids=new Set();let pz=0,rite=0;
  const ln=(s,where)=>{const[w,t,o]=s;if(w!==""&&!W[w])P.push(`${where} 說話的人不認得：${w}`);const n=mnvLen(t);if(n<1||n>MNV_LINE)P.push(`${where}「${t}」${n} 字（要 1～${MNV_LINE}）`);if(/\n/.test(t))P.push(`${where}「${t}」換行了`);
    if(o){if(o.bg&&!I[o.bg])P.push(`${where} 沒有圖 ${o.bg}`);if(o.cast&&!(Array.isArray(o.cast)&&o.cast.length===2&&o.cast.every(x=>x==null||(W[x]&&!W[x].npc))))P.push(`${where} cast 要 [左,右] 七星代號或 null`);if(o.side&&!/^[lr]$/.test(o.side))P.push(`${where} side 要 l 或 r`);
      if(o.at&&!(o.at.length>=2&&o.at[0]>=0&&o.at[0]<=768&&o.at[1]>=0&&o.at[1]<=1376))P.push(`${where} at 出圖了`);if(o.act&&mnvLen(o.act)>10)P.push(`${where} act 太長`)}};
  const spot=(p,where)=>{if(!p||!p.lb)return P.push(where+" 熱點沒有 lb");if(p.on){if(!W[p.on]||W[p.on].npc)P.push(where+" 熱點 on 要是七星");if(!(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100))P.push(where+" 立繪熱點要 % ");}
    else if(!(p.x>=0&&p.x<=768&&p.y>=0&&p.y<=1376))P.push(where+" 熱點出圖了："+p.lb);if(p.clue!=null&&!(mnvLen(p.clue)>=2&&mnvLen(p.clue)<=MNV_LINE))P.push(where+" 熱點 clue 要 2～"+MNV_LINE+" 字："+p.lb)};
  const seqOk=(st,where,lo,hi)=>{if(!Array.isArray(st)||st.length<lo||st.length>hi)P.push(where)};
  CH.sc.forEach((S,i)=>{const N2=`${N} 第 ${i+1} 場`;if(!S.id||ids.has(S.id))P.push(N2+" id 重複或沒有");ids.add(S.id);if(!S.nm)P.push(N2+" 沒有場名");if(!I[S.bg])P.push(N2+" 沒有圖 "+S.bg);if(!(S.est>0))P.push(N2+" 沒有 est");
    if(!Array.isArray(S.cast)||S.cast.length!==2)P.push(N2+" cast 要 [左,右]");if(!Array.isArray(S.st)||!S.st.length)P.push(N2+" 沒有步驟");
    if(S.mus&&!(typeof S.mus[0]==="string"&&S.mus[1]>=0&&S.mus[1]<=1))P.push(N2+" mus 要 [配樂, 音量 0～1]");
    mnvEach(S.st,(s,d)=>{const w=N2;if(Array.isArray(s))return ln(s,w);if(!s||typeof s!=="object")return P.push(w+" 步驟格式不對");
      if(s.bg&&!I[s.bg])P.push(w+" 沒有圖 "+s.bg);
      if(s.bub){seqOk(s.bub,w+" 氣泡要 1～4 句",1,4);if(s.bub.some(x=>!Array.isArray(x)))P.push(w+" 氣泡裡要是台詞");if(s.gap!=null&&!(s.gap>=.3&&s.gap<=3))P.push(w+" 氣泡 gap 要 0.3～3 秒")}
      if(s.look){if(!s.look.length)P.push(w+" look 沒有熱點");s.look.forEach(p=>spot(p,w));const req=s.look.filter(p=>!p.go&&!p.opt).length,hasGo=s.look.some(p=>p.go);
        if(!hasGo&&!s.go)P.push(w+" look 要有 go:1 的熱點或 go 按鈕");if(s.go&&!(s.need>=1&&s.need<=req))P.push(w+" look 的 need 要 1～"+req);if(!s.say)P.push(w+" look 要有 say（告訴玩家要做什麼）")}
      if(s.ask){if(!s.ask.me||!s.ask.you||!s.key)P.push(w+" 選項要有 ask.me、ask.you、key");if(!Array.isArray(s.opt)||s.opt.length!==2)P.push(w+" 選項要 2 個");
        else s.opt.forEach(o=>{if(!o.t||mnvLen(o.t)>16)P.push(w+" 選項字要 1～16 字");seqOk(o.st,w+" 每個選項的回應要 1～3 句",1,3)})}
      if(s.pick){const A=s.pick,O=A.opt||[];if(!A.ask||!A.key)P.push(w+" 方案選擇要有 ask、key");if(O.length<2||O.length>4)P.push(w+" 方案要 2～4 個");if(O.filter(o=>o.ok).length!==1)P.push(w+" 方案要剛好 1 個 ok");
        O.forEach(o=>{if(!o.t||mnvLen(o.t)>10)P.push(w+" 方案字要 1～10 字");seqOk(o.st,w+" 每個方案要有 1～3 步結果",1,3)})}
      if(s.order){const Q=s.order,K=(Q.items||[]).map(x=>x.k);if(!Q.ask||!Q.key)P.push(w+" 安排順序要有 ask、key");if(K.length<2||K.length>4||new Set(K).size!==K.length)P.push(w+" 安排順序要 2～4 件、代號不重複");
        (Q.items||[]).forEach(x=>{if(!x.t||mnvLen(x.t)>10)P.push(w+" 每件事 1～10 字");if(!Array.isArray(x.who)||!x.who.length||!x.who.every(k=>W[k]&&!W[k].npc))P.push(w+" who 要是七星")});
        if(!Array.isArray(Q.ok)||Q.ok.slice().sort().join()!==K.slice().sort().join())P.push(w+" ok 要是 items 的一種排法");
        else for(const p of mnvPerms(K))if(mnvOrderFail(Q,p)&&mnvOrderFail(Q,p).none)P.push(w+" 這個排法沒有結果："+p.join("→"));
        seqOk(Q.st,w+" 安排順序成功要有 st",1,4);for(const f of Q.fail||[])seqOk(f.st,w+" 每條 fail 要有 1～3 步",1,3)}
      if(s.show){seqOk(s.show,w+" 演出要 1～6 格",1,6);for(const f of s.show||[]){if(!f.cap||mnvLen(f.cap)>MNV_LINE)P.push(w+" 演出字幕要 1～"+MNV_LINE+" 字");if(f.bg&&!I[f.bg])P.push(w+" 沒有圖 "+f.bg)}if(s.dt!=null&&!(s.dt>=.8&&s.dt<=4))P.push(w+" 演出 dt 要 0.8～4 秒")}
      if(s.if!=null){if(!MNV_IF[s.if])P.push(w+" if 條件不認得："+s.if);seqOk(s.st,w+" if 要有 st",1,4)}
      if(s.seq){if(!s.seq.length)P.push(w+" seq 是空的");s.seq.forEach(x=>{spot(x.it,w);const to=[].concat(x.to||[]);if(!to.length||!to.every(k=>W[k]&&!W[k].npc))P.push(w+" seq 的 to 要是七星");seqOk(x.st,w+" seq 每一步要回 1～3 句",1,3)})}
      if(s.btn&&mnvLen(s.btn)>10)P.push(w+" btn 字太長");
      if(s.fb){if(!I[s.bg]||!Array.isArray(s.st)||!s.st.length)P.push(w+" 閃回要有 bg、st");if(mnvLen(s.fb)>8)P.push(w+" 閃回標籤太長")}
      if(s.wait!=null&&!(s.wait>0&&s.wait<=4))P.push(w+" wait 要 0～4 秒");
      if(s.pz){pz++;if(d)P.push(w+" pz 不能放在選項、熱點裡面")}if(s.rite){rite++;if(!pz)P.push(w+" rite 要在 pz 後面")}});
    if(S.st&&S.st.some(s=>s&&s.pz)&&!(S.pzEst>0))P.push(N2+" 有解題要寫 pzEst")});
  if(pz!==1)P.push(N+"：一章要剛好 1 題（現在 "+pz+"）");if(rite>1)P.push(N+"：儀式只能 1 次");if(CH.qte&&typeof MNF_QTE!=="undefined"&&!MNF_QTE[CH.qte])P.push(N+"：危機題不存在 "+CH.qte);
  return P}
/* 解題時間比例（新手保護 ≤30%）：解題那場的 pzEst vs 全章 est */
function mnvShare(CH){let all=0,pz=0;for(const S of(CH&&CH.sc)||[]){all+=S.est||0;pz+=S.pzEst||0}return{film:all-pz,pz,share:pz/Math.max(1,all)}}
/* 規則判斷：s 這一方 n 步之內（自己的步數）能不能逼到對方一步都不能走（將死或困斃）；回傳第一步 [f,t] 或 null。C＝XQCore */
function mnvMate(C,b,s,n){if(n<=0)return null;const o=C.opp(s);for(const[f,t]of C.legal(b,s)){const nb=C.make(b,f,t),R=C.legal(nb,o);if(!R.length)return[f,t];
  if(n>1&&R.every(([f2,t2])=>mnvMate(C,C.make(nb,f2,t2),s,n-1)))return[f,t]}return null}
/* 玩家這一手對不對：馬上解開，或題目的線上，或照規則往下算剩下 n-1 步仍然步步必殺（題庫沒列的解法也算） */
function mnvJudge(C,b,s,f,t,n,onLine){const nb=C.make(b,f,t),o=C.opp(s),R=C.legal(nb,o),win=!R.length;
  return{nb,win,ok:win||!!onLine||(n>1&&R.every(([f2,t2])=>!!mnvMate(C,C.make(nb,f2,t2),s,n-1)))}}
/* 題庫沒列的線上，對方怎麼應：挑讓我方殺得最慢的那一步（同樣慢就照合法著法順序） */
function mnvReply(C,b,s,n){const o=C.opp(s),R=C.legal(b,o);let best=null,bd=-1;for(const[f,t]of R){const nb=C.make(b,f,t);let d=n+1;for(let k=1;k<=n;k++)if(mnvMate(C,nb,s,k)){d=k;break}if(d>bd){bd=d;best=[f,t]}}return best}
/* 走錯時對方的反駁：題目指定的（re）優先；不然挑「吃掉剛走的子」「讓我方剩下的步數殺不了」「吃子」「將軍」分數最高的 */
function mnvRefute(C,b,s,t,n,re){const o=C.opp(s),R=C.legal(b,o);if(!R.length)return null;if(re){const m=R.find(([f2,t2])=>C.iccs(f2,t2)===re);if(m)return m}
  let best=R[0],bs=-1;for(const[f2,t2]of R){const nb=C.make(b,f2,t2);let sc=0;if(t2===t)sc+=8;if(b[t2])sc+=4;if(C.inCheck(nb,s))sc+=2;if(!mnvMate(C,nb,s,Math.max(1,n-1)))sc+=6;if(/^[kabKAB]$/.test(b[f2]||""))sc+=1;if(sc>bs){bs=sc;best=[f2,t2]}}return best}
/* 試演的線：每一手都要合法（雙方輪流）；回傳問題清單 */
function mnvTrialCheck(C,P){const E=[],T=P&&P.trial;if(!T)return E;const b0=C.parseFen(String(P.fen).split(" ")[0]),s0=P.side||"r";
  if(!Array.isArray(T.cands)||T.cands.length<2)E.push("試看至少 2 個候選");
  for(const c of T.cands||[]){if(!c.k||!c.t||!c.say||!Array.isArray(c.line)||!c.line.length)E.push("候選要有 k、t、say、line："+(c.k||"?"));let b=b0.slice(),s=s0;
    for(const u of c.line||[]){const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));if(!C.legal(b,s).some(([x,y])=>x===f&&y===t)){E.push(c.k+" 的 "+u+" 不合法");break}b=C.make(b,f,t);s=C.opp(s)}}
  return E}
/* 幫我看：要動的子、它的候選著（照規則判斷走了還能步步必殺）、走過去會被吃的格子 */
function mnvHelp(C,b,s,n,pc){const o=C.opp(s),cands=[],threats=[];for(const[f,t]of C.legal(b,s)){if(f!==pc)continue;const J=mnvJudge(C,b,s,f,t,n,false);if(J.ok)cands.push({f,t});
  else if(C.legal(J.nb,o).some(x=>x[1]===t))threats.push(t)}return{pc,cands,threats}}
/* ---------- 樣式 ---------- */
function mnvCss(){if(document.getElementById("mnvCss"))return;const s=document.createElement("style");s.id="mnvCss";s.textContent=`
#mnvPg{position:fixed;inset:0;z-index:9100;background:#05060d;color:#f6efe0;overflow:hidden;overflow:clip;opacity:0;transition:opacity .45s;touch-action:manipulation;-webkit-user-select:none;user-select:none;font-family:var(--serif,serif);--vfs:19px;--chh:260px;--boxh:140px}
#mnvPg.on{opacity:1}
#mnvBk{display:none;position:fixed;inset:-40px;z-index:9099;background:#05060d center/cover no-repeat;filter:blur(18px) brightness(.42);opacity:0;transition:opacity .5s,background-image .6s;pointer-events:none}
#mnvBk.on{opacity:1}
@media (min-aspect-ratio:4/5){#mnvPg{left:50%;right:auto;width:min(100vw,max(calc(100vh*.62),360px));transform:translateX(-50%);box-shadow:0 0 60px rgba(0,0,0,.7)}#mnvBk{display:block}}
#mnvPg .mnv-im{position:absolute;left:0;top:0;width:768px;height:1376px;transform-origin:0 0;transition:transform 1s cubic-bezier(.3,.7,.3,1);will-change:transform}
#mnvPg .mnv-bg{position:absolute;inset:0;background:#05060d 0 0/100% 100% no-repeat;transition:opacity .7s,filter .8s}
#mnvPg .mnv-bg.nx{opacity:0}
#mnvPg.fb .mnv-bg{filter:grayscale(.78) brightness(.78) contrast(1.08) sepia(.12) hue-rotate(170deg)}
#mnvPg .mnv-vg{position:absolute;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55));opacity:0;transition:opacity .8s}
#mnvPg.fb .mnv-vg{opacity:1}
#mnvPg .mnv-fbl{position:absolute;left:50%;top:calc(64px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:7;padding:6px 20px;border-radius:4px;border:1px solid rgba(200,220,255,.55);background:rgba(10,16,30,.7);color:#dce8ff;font:800 17px var(--serif,serif);letter-spacing:.4em;opacity:0;transition:opacity .6s;pointer-events:none;white-space:nowrap}
#mnvPg.fb .mnv-fbl{opacity:1}
#mnvPg .mnv-fl{position:absolute;inset:0;z-index:5;background:#fffaf0;opacity:0;pointer-events:none;animation:mnvFl .5s ease-out forwards}
@keyframes mnvFl{15%{opacity:.8}100%{opacity:0}}
#mnvPg.shk .mnv-im{animation:mnvShk .4s ease-out}
@keyframes mnvShk{20%{translate:calc(var(--shk,5px)*-1) 0}45%{translate:var(--shk,5px) 0}70%{translate:calc(var(--shk,5px)*-.5) 0}}
#mnvPg .mnv-hs{position:absolute;width:0;height:0;z-index:2}
#mnvPg .mnv-hb{position:absolute;left:0;top:0;transform:scale(var(--k,1)) translate(-50%,-50%);transform-origin:0 0;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:64px;min-height:64px;padding:0;border:0;background:none;color:#fff7e0;cursor:pointer;-webkit-tap-highlight-color:transparent}
#mnvPg .mnv-ch .mnv-hb{transform:translate(-50%,-50%)}
#mnvPg .mnv-hb i{display:block;width:44px;height:44px;border-radius:50%;border:3px solid #fff1bf;background:radial-gradient(circle,rgba(255,236,170,.75),rgba(255,200,90,.25) 60%,rgba(255,200,90,0) 72%);box-shadow:0 0 0 3px rgba(0,0,0,.35),0 0 18px 6px rgba(255,210,110,.75);animation:mnvPulse 1.4s ease-in-out infinite}
#mnvPg .mnv-hb span{padding:2px 9px;border-radius:99px;background:rgba(20,12,6,.82);border:1px solid rgba(232,199,122,.7);font:800 15px/1.3 var(--serif,serif);white-space:nowrap;text-shadow:0 1px 2px #000}
#mnvPg .mnv-hb.seen i{animation:none;opacity:.55;box-shadow:0 0 0 3px rgba(0,0,0,.35)}
#mnvPg .mnv-hb.seen span::after{content:" ✓"}
#mnvPg .mnv-hb:focus-visible i{outline:3px solid #E8C77A;outline-offset:3px}
#mnvPg.busy .mnv-hb{pointer-events:none;opacity:.5}
@keyframes mnvPulse{50%{transform:scale(1.18);box-shadow:0 0 0 3px rgba(0,0,0,.35),0 0 26px 10px rgba(255,214,120,.9)}}
#mnvPg .mnv-ch{position:absolute;bottom:calc(var(--boxh) + 4px);height:var(--chh);z-index:3;opacity:0;transition:opacity .45s,transform .55s cubic-bezier(.2,1,.3,1),filter .35s;pointer-events:none;filter:brightness(.52) saturate(.65)}
#mnvPg .mnv-ch.l{left:-3%;transform:translateX(-30%)}#mnvPg .mnv-ch.r{right:-3%;transform:translateX(30%)}
#mnvPg .mnv-ch.in{opacity:1;transform:none}
#mnvPg .mnv-ch.sp{filter:drop-shadow(0 0 10px rgba(255,220,150,.35));z-index:4}
#mnvPg .mnv-ch.nar{filter:brightness(.72) saturate(.8)}
#mnvPg .mnv-ch.away{opacity:0!important}
#mnvPg .mnv-cw{position:relative;height:100%}
#mnvPg .mnv-cw img{display:block;height:100%;width:auto;animation:mnvBr 4.2s ease-in-out infinite;transform-origin:50% 100%}
#mnvPg .mnv-ch.r .mnv-cw img{animation-delay:-2.1s}
@keyframes mnvBr{50%{transform:translateY(-1.1%) scaleY(1.006)}}
#mnvPg .mnv-ch .mnv-hs{pointer-events:auto}
#mnvPg .mnv-top{position:absolute;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top,0px));z-index:8;display:flex;gap:8px;align-items:center}
#mnvPg .mnv-top .sp{flex:1}
#mnvPg .mnv-b{min-width:48px;min-height:44px;padding:8px 14px;border-radius:99px;font:700 15px var(--serif,serif);color:#f2e4c4;background:rgba(0,0,0,.5);border:1px solid rgba(232,199,122,.6);cursor:pointer}
#mnvPg .mnv-b:focus-visible,#mnvPg .mnv-o button:focus-visible,#mnvPg .mnv-box:focus-visible{outline:3px solid #E8C77A;outline-offset:3px}
#mnvPg.nsk .mnv-b[data-k=skip]{visibility:hidden}
#mnvPg .mnv-tl{position:absolute;left:50%;top:calc(62px + env(safe-area-inset-top,0px));transform:translate(-50%,-6px);z-index:6;padding:6px 18px;border-radius:99px;background:rgba(10,6,2,.66);border:1px solid rgba(232,199,122,.45);font:800 16px var(--serif,serif);letter-spacing:.12em;color:#ffe6a8;white-space:nowrap;opacity:0;transition:opacity .5s,transform .5s;pointer-events:none}
#mnvPg .mnv-tl.on{opacity:1;transform:translate(-50%,0)}
#mnvPg .mnv-box{position:absolute;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:6;padding:20px 16px 12px;border-radius:14px;background:linear-gradient(rgba(26,17,10,.93),rgba(14,9,5,.95));border:2px solid rgba(232,199,122,.6);box-shadow:0 8px 30px rgba(0,0,0,.6);cursor:pointer;-webkit-tap-highlight-color:transparent}
#mnvPg .mnv-nm{position:absolute;left:14px;top:-17px;min-height:30px;padding:4px 16px;border-radius:9px;background:linear-gradient(#b3261e,#7d1611);border:1px solid #f2c94c;color:#fff3d6;font:900 17px/22px var(--serif,serif);letter-spacing:.12em;white-space:nowrap}
#mnvPg .mnv-nm.npc{background:linear-gradient(#5d4a2c,#3b2e1a);border-color:#c9a86a}
#mnvPg .mnv-nm:empty{display:none}
#mnvPg .mnv-tx{margin:0;height:calc(var(--vfs)*1.55*2);overflow:hidden;font:700 var(--vfs)/1.55 var(--serif,serif);letter-spacing:.04em;color:#fff7e6;text-wrap:pretty}
#mnvPg .mnv-tx em{font-style:normal;color:#c9b48a;font-size:.86em}
#mnvPg .mnv-box.nar .mnv-tx{color:#e9dcc0;font-weight:500}
#mnvPg .mnv-box.ins{cursor:default;border-color:rgba(130,200,255,.6)}
#mnvPg .mnv-box.ins .mnv-tx{color:#d8ecff;font-weight:700}
#mnvPg .mnv-nx{position:absolute;right:12px;bottom:6px;font-size:13px;color:#e8c77a;opacity:0;animation:mnvNx 1s ease-in-out infinite}
#mnvPg .mnv-box.wt .mnv-nx{opacity:1}
@keyframes mnvNx{50%{transform:translateY(3px)}}
#mnvPg .mnv-o{position:absolute;left:16px;right:16px;bottom:calc(var(--boxh) + 14px);z-index:7;display:flex;flex-direction:column;gap:10px;align-items:stretch}
#mnvPg .mnv-o button{min-height:52px;padding:10px 18px;border-radius:14px;border:2px solid #f2c94c;background:linear-gradient(rgba(179,38,30,.95),rgba(125,22,17,.95));color:#fff6dc;font:800 18px/1.3 var(--serif,serif);letter-spacing:.06em;box-shadow:0 6px 18px rgba(0,0,0,.5);cursor:pointer}
#mnvPg .mnv-o button.g{background:rgba(20,12,6,.85);border-color:rgba(232,199,122,.7);color:#f2e4c4}
#mnvPg .mnv-av{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
#mnvPg .mnv-av button{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:84px;min-height:auto;padding:6px 8px;border-radius:14px;background:rgba(20,12,6,.85);border:2px solid rgba(232,199,122,.6)}
#mnvPg .mnv-av button.ok{border-color:#ffe08a;box-shadow:0 0 14px rgba(255,214,120,.7)}
#mnvPg .mnv-av b{display:flex}
#mnvPg .mnv-av i{display:block;width:52px;height:52px;border-radius:50%;background:#2a1d12 50% 6%/170% auto no-repeat;border:2px solid #e8c77a}
#mnvPg .mnv-av i+i{margin-left:-12px}
#mnvPg .mnv-av span{font:800 15px var(--serif,serif)}
#mnvPg .mnv-av button.no{animation:mnvNo .35s}
@keyframes mnvNo{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
#mnvPg .mnv-hold{position:absolute;left:50%;top:calc(62px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:7;padding:6px 16px;border-radius:99px;background:rgba(20,40,60,.85);border:1px solid rgba(150,210,255,.7);font:800 16px var(--serif,serif);color:#e6f3ff;white-space:nowrap}
#mnvPg .mnv-hold:empty{display:none}
#mnvPg .mnv-card,#mnvPg .mnv-end,#mnvPg .mnv-ask,#mnvPg .mnv-log{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px 22px calc(24px + env(safe-area-inset-bottom,0px));text-align:center;background:radial-gradient(circle at 50% 42%,rgba(40,24,10,.78),rgba(0,0,0,.93) 76%);opacity:0;transition:opacity .4s}
#mnvPg .on.mnv-card,#mnvPg .on.mnv-end,#mnvPg .on.mnv-ask,#mnvPg .on.mnv-log{opacity:1}
#mnvPg .mnv-card .k,#mnvPg .mnv-end .k{font:800 17px var(--serif,serif);letter-spacing:.4em;color:#e8c77a}
#mnvPg .mnv-card h2,#mnvPg .mnv-end h2{margin:0;font:900 clamp(30px,9vw,44px)/1.25 var(--serif,serif);letter-spacing:.12em;color:#ffe6a8;text-shadow:0 0 18px rgba(255,190,90,.5)}
#mnvPg .mnv-card p,#mnvPg .mnv-end p{margin:0;max-width:340px;font:700 18px/1.7 var(--serif,serif);color:#f3e6c8;text-wrap:balance}
#mnvPg .mnv-card .gb,#mnvPg .mnv-end .gb,#mnvPg .mnv-ask .gb{display:flex;flex-direction:column;gap:10px;width:min(320px,90%)}
#mnvPg .mnv-card button,#mnvPg .mnv-end button,#mnvPg .mnv-ask button,#mnvPg .mnv-log button{min-height:54px;border-radius:99px;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font:900 20px var(--serif,serif);letter-spacing:.08em;cursor:pointer}
#mnvPg .mnv-card button.g,#mnvPg .mnv-end button.g,#mnvPg .mnv-ask button.g{min-height:48px;font-size:17px;background:rgba(0,0,0,.4);border-color:rgba(232,199,122,.6);color:#f2e4c4}
#mnvPg .mnv-end .seal{width:132px;height:132px;border:6px solid #b3261e;border-radius:10px;color:#b3261e;background:rgba(246,236,214,.9);display:flex;align-items:center;justify-content:center;font:900 40px/1.05 var(--serif,serif);box-shadow:0 0 30px rgba(255,200,120,.6);transform:rotate(-6deg);animation:mnvStamp .55s ease both}
@keyframes mnvStamp{0%{opacity:0;transform:scale(2.4) rotate(-16deg)}60%{opacity:1;transform:scale(.92) rotate(-7deg)}100%{opacity:1;transform:rotate(-6deg)}}
#mnvPg .mnv-end small{font:700 15px var(--serif,serif);color:#c9b48a}
#mnvPg .mnv-log{justify-content:flex-start;padding-top:calc(20px + env(safe-area-inset-top,0px));background:rgba(6,4,2,.95)}
#mnvPg .mnv-log ol{list-style:none;margin:0;padding:0 4px;width:min(520px,100%);flex:1;overflow:auto;text-align:left}
#mnvPg .mnv-log li{padding:8px 4px;border-bottom:1px solid rgba(232,199,122,.18);font:600 17px/1.6 var(--serif,serif);color:#efe3c8}
#mnvPg .mnv-log li b{display:block;font-size:14px;color:#e8c77a}
#mnvPg .mnv-log li.me{color:#bfe3ff}
#mnvPg .mnv-log button{width:min(320px,90%);flex:none}
#mnvPg .mnv-pz{position:absolute;left:50%;top:calc(58px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:6;width:var(--pzw,360px);display:flex;flex-direction:column;gap:6px}
#mnvPg .pz-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:0 4px;color:#ffe6a8}
#mnvPg .pz-h b{font:900 22px var(--serif,serif);letter-spacing:.14em;text-shadow:0 2px 6px #000}
#mnvPg .pz-h span{font:700 14px var(--serif,serif);color:#e8d6ae;text-shadow:0 1px 3px #000}
#mnvPg .pz-bd{position:relative;background:linear-gradient(#e9dcbc,#d8c59a);border:3px solid #8a5a2b;border-radius:12px;padding:5px;box-shadow:0 0 0 2px rgba(255,230,160,.45),0 16px 40px rgba(0,0,0,.7)}
#mnvPg .pz-bd svg{display:block;width:100%;height:auto;touch-action:none}
#mnvPg .pz-bd.shk{animation:mnvNo .35s}
#mnvPg .pz-bd.done{transition:filter .9s,opacity .9s;filter:brightness(1.8) saturate(.5);opacity:.0}
#mnvPg .pz-t{display:flex;gap:6px}
#mnvPg .pz-t button{flex:1;min-height:46px;padding:6px 4px;border-radius:12px;border:1.5px solid rgba(232,199,122,.75);background:rgba(20,12,6,.86);color:#f6e7c4;font:800 15px/1.2 var(--serif,serif);cursor:pointer}
#mnvPg .pz-t button.on{border-color:#7fc4ff;color:#d8eeff;box-shadow:0 0 10px rgba(110,180,255,.6)}
#mnvPg .pz-t button.bk{flex:1.6;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font-size:17px}
#mnvPg .pz-t button:disabled{opacity:.45}
#mnvPg .pz-how{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:18px;border-radius:12px;background:rgba(250,242,222,.97);color:#2b1d10;text-align:left}
#mnvPg .pz-how b{font:900 21px var(--serif,serif);color:#7d1611}
#mnvPg .pz-how p{margin:0;font:700 18px/1.7 var(--serif,serif)}
#mnvPg .pz-how button{align-self:center;min-width:160px;min-height:48px;border-radius:99px;border:2px solid #8a5a2b;background:#7d1611;color:#fff6dc;font:800 17px var(--serif,serif)}
#mnvPg .mnv-lit{position:absolute;width:24%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.2);border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fffbe8 0,rgba(255,226,140,.9) 22%,rgba(255,200,90,.35) 50%,rgba(255,200,90,0) 70%);opacity:0;animation:mnvLit 1.1s ease-out forwards}
@keyframes mnvLit{30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(3)}}
#mnvPg .mnf-tg{fill:rgba(255,222,120,.55);stroke:#fff3c4;stroke-width:3;pointer-events:none;transform-box:fill-box;transform-origin:center;animation:mnfTg 1.1s ease-in-out infinite}
@keyframes mnfTg{50%{fill:rgba(255,200,80,.85);transform:scale(1.18)}}
#mnvPg .mnv-bubs{position:absolute;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:6;display:none;flex-direction:column;gap:7px;cursor:pointer;-webkit-tap-highlight-color:transparent}
#mnvPg .mnv-bubs.on{display:flex}
#mnvPg .mnv-bubs .bb{position:relative;max-width:86%;padding:7px 14px 8px;border-radius:14px;background:linear-gradient(rgba(26,17,10,.94),rgba(14,9,5,.95));border:2px solid rgba(232,199,122,.6);box-shadow:0 6px 18px rgba(0,0,0,.55);font:700 calc(var(--vfs) - 1px)/1.5 var(--serif,serif);letter-spacing:.03em;color:#fff7e6;opacity:0;transform:translateY(10px);transition:opacity .45s,transform .45s}
#mnvPg .mnv-bubs .bb.on{opacity:1;transform:none}
#mnvPg .mnv-bubs .bb.old{opacity:.8}
#mnvPg .mnv-bubs .bb.l{align-self:flex-start;border-bottom-left-radius:4px}
#mnvPg .mnv-bubs .bb.r{align-self:flex-end;border-bottom-right-radius:4px}
#mnvPg .mnv-bubs .bb.c{align-self:center;max-width:94%;background:rgba(10,8,6,.86);border-color:rgba(232,199,122,.35);color:#e9dcc0;font-weight:500}
#mnvPg .mnv-bubs .bb.npc{border-color:#c9a86a}
#mnvPg .mnv-bubs .bb b{display:block;font-size:13px;line-height:1.3;letter-spacing:.12em;color:#f2c94c}
#mnvPg .mnv-bubs .bb.npc b{color:#d9c08a}
#mnvPg .mnv-bubs .bb em{font-style:normal;color:#c9b48a;font-size:.86em}
#mnvPg .mnv-bubs.wt::after{content:"▼";align-self:flex-end;margin:-4px 8px 0 0;font-size:13px;color:#e8c77a;animation:mnvNx 1s ease-in-out infinite}
#mnvPg .mnv-clue{display:flex;flex-direction:column;gap:5px;padding:8px 10px;border-radius:12px;background:rgba(14,22,34,.86);border:1px solid rgba(130,200,255,.5)}
#mnvPg .mnv-clue p{margin:0;font:700 15px/1.45 var(--serif,serif);color:#d8ecff}
#mnvPg .mnv-clue p b{color:#9fd0ff;margin-right:4px}
#mnvPg .mnv-o button.tried{background:rgba(40,30,22,.9);border-color:rgba(232,199,122,.45);color:#cdbb98}
#mnvPg .mnv-o button.tried::after{content:"（試過）";font-size:.8em}
#mnvPg .mnv-ord{display:flex;flex-direction:column;gap:8px}
#mnvPg .mnv-o .mnv-ord button.it{display:flex;align-items:center;gap:10px;min-height:56px;padding:6px 12px;text-align:left;background:rgba(20,12,6,.9);border-color:rgba(232,199,122,.7)}
#mnvPg .mnv-ord button.it span.av{display:flex;flex:none}
#mnvPg .mnv-ord button.it i{display:block;width:40px;height:40px;border-radius:50%;background:#2a1d12 50% 6%/170% auto no-repeat;border:2px solid #e8c77a}
#mnvPg .mnv-ord button.it i+i{margin-left:-10px}
#mnvPg .mnv-ord button.it span.t{flex:1}
#mnvPg .mnv-ord button.it u{flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;font:900 19px var(--serif,serif);border:2px dashed rgba(232,199,122,.6);color:transparent}
#mnvPg .mnv-ord button.it.on{border-color:#ffe08a;background:rgba(80,40,10,.92)}
#mnvPg .mnv-ord button.it.on u{border:2px solid #f2c94c;background:#b3261e;color:#fff6dc}
#mnvPg .mnv-ord .row{display:flex;gap:8px}
#mnvPg .mnv-ord .row button{flex:1}
#mnvPg .mnv-ord .row button:disabled{opacity:.45}
#mnvPg .mnv-o button.skp{align-self:flex-end;min-height:44px;padding:6px 16px;border-radius:99px;font-size:15px;background:rgba(0,0,0,.55);border:1px solid rgba(232,199,122,.6);color:#f2e4c4;box-shadow:none}
#mnvPg .pz-h .pz-hw{margin-left:auto;min-height:44px;padding:4px 12px;border-radius:99px;border:1px solid rgba(232,199,122,.7);background:rgba(20,12,6,.8);color:#f6e7c4;font:800 14px var(--serif,serif);cursor:pointer}
#mnvPg .pz-h{align-items:center}
#mnvPg .pz-h b{flex:none;white-space:nowrap}#mnvPg .pz-h .pz-st{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mnvPg .pz-h .pz-hw{flex:none;white-space:nowrap}
#mnvPg .pz-bd.tr{margin-bottom:10px}#mnvPg .pz-t button{font-size:clamp(13px,3.8vw,15px)}
#mnvPg .pz-tr{display:none;position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);z-index:2;padding:3px 14px;border-radius:99px;background:rgba(31,95,174,.92);color:#fff;font:800 14px var(--serif,serif);letter-spacing:.2em;pointer-events:none;white-space:nowrap}
#mnvPg .pz-bd.tr .pz-tr{display:block}
#mnvPg .pz-bd.tr{box-shadow:0 0 0 3px #4a8fe0,0 16px 40px rgba(0,0,0,.7)}
#mnvPg .pz-t{flex-wrap:wrap}
#mnvPg .pz-t button.tri::after{content:" ✓";color:#9fd0ff}
#mnvPg .mnv-th{fill:rgba(210,59,43,.14);stroke:#d23b2b;stroke-width:4;stroke-dasharray:7 5;pointer-events:none}
#mnvPg .mnv-end ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;max-width:330px}
#mnvPg .mnv-end li{font:700 15px/1.5 var(--serif,serif);color:#e8d6ae}
#mnvPg .mnv-end li::before{content:"・";color:#f2c94c}
#mnvPg .mnv-end li.gold{color:#ffe08a}
@media (max-height:700px){#mnvPg .mnv-card,#mnvPg .mnv-end{gap:12px}#mnvPg .mnv-end .seal{width:100px;height:100px;font-size:30px}#mnvPg .pz-h b{font-size:19px}}
@media (prefers-reduced-motion:reduce){#mnvPg *,#mnvPg{transition-duration:.01s!important;animation:none!important}}`;document.head.append(s)}
/* ---------- 共用 ---------- */
function mnvMe(){try{return typeof myChar==="function"&&myChar()||""}catch(e){return""}}
function mnvPre(era){const CH=MNV_CH[era];if(!CH||typeof Image==="undefined")return;const seen=new Set(),ld=u=>{if(!u||seen.has(u))return;seen.add(u);const im=new Image();im.decoding="async";im.src=u},I=typeof MNF_IMG!=="undefined"?MNF_IMG:{};
  for(const k of[CH.card.bg,CH.end.bg])if(I[k])ld(I[k].u);for(const S of CH.sc){if(I[S.bg])ld(I[S.bg].u);mnvEach(S.st,s=>{const b=Array.isArray(s)?s[2]&&s[2].bg:s&&s.bg;if(b&&I[b])ld(I[b].u);if(s&&s.show)for(const f of s.show)if(f.bg&&I[f.bg])ld(I[f.bg].u)})}
  for(const k in MNV_WHO)if(MNV_WHO[k].im)ld("data/vn/"+MNV_WHO[k].im+".webp")}
/* 章末卡「你做了什麼」：照解題結果列出（不給總星等） */
function mnvDid(r,N,P){if(!r)return[];const L=[],T=r.trial||[],bad=((P&&P.trial&&P.trial.cands)||[]).filter(c=>c.bad).map(c=>c.k);
  if(r.perfect)L.push([mnvT("vn.sPerfect","不用幫忙，一次走對"),1],[mnvT("vn.sSecret","聽到了一段悄悄話"),1]);else if(!r.help&&!r.walk)L.push([mnvT("vn.sSelf","自己找到俥的路")]);
  if(T.length>=2)L.push([mnvT("vn.sBoth","試看過兩條路，再自己走")]);else if(T.length)L.push([mnvT("vn.sTrial","先試看，再自己走")]);
  if(r.mist||T.some(k=>bad.includes(k)))L.push([mnvT("vn.sRefute","看過硬衝會被吃回")]);if(r.help)L.push([mnvT("vn.sHelp","用了「幫我看」")]);if(r.walk)L.push([mnvT("vn.sWalk","陪走了 {n} 步",{n:r.walk})]);
  if(r.moves)L.push([mnvT("vn.sMoves","走了 {n} 手（最少 {m} 手）",{n:r.moves,m:N||2})]);return L}
/* ---------- 播放器：mnvPlay(章代號,{from 從第幾場, label, pz 危機題資料, onScene(id,毫秒,跳過), onChoice(key,值), onSolved(P,r)→儀式資料, onEnd(1 主按鈕|2 次按鈕), onRetry(P,r), onLeave}) ---------- */
const MNV_LEAVE={leave:1};
function mnvPlay(era,opt){opt=opt||{};const CH=MNV_CH[era];if(!CH){if(opt.onLeave)opt.onLeave();return null}mnvCss();
  let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  for(const id of["mnvPg","mnvBk"]){const x=document.getElementById(id);if(x)x.remove()}
  const I=typeof MNF_IMG!=="undefined"?MNF_IMG:{},W=MNV_WHO,lead=CH.lead,SEEN=new Set(),CLUE=new Map();   /* SEEN：這次播放已經用全名介紹過的七星；CLUE：調查點看到的線索（方案選擇時列出來） */
  const bk=document.createElement("div");bk.id="mnvBk";bk.setAttribute("aria-hidden","true");document.body.append(bk);
  const o=document.createElement("div");o.id="mnvPg";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-label",opt.label||CH.card.t);
  o.innerHTML=`<div class="mnv-im"><div class="mnv-bg"></div></div><div class="mnv-vg"></div><div class="mnv-fbl" aria-hidden="true"></div>
    <div class="mnv-ch l" aria-hidden="true"><div class="mnv-cw"><img alt=""></div></div><div class="mnv-ch r" aria-hidden="true"><div class="mnv-cw"><img alt=""></div></div>
    <div class="mnv-tl" aria-hidden="true"></div><div class="mnv-hold" aria-live="polite"></div>
    <div class="mnv-top"><button class="mnv-b" type="button" data-k="leave">‹ ${esc(mnvT("vn.leave","離開"))}</button><span class="sp"></span><button class="mnv-b" type="button" data-k="log">${esc(mnvT("vn.log","回看"))}</button><button class="mnv-b" type="button" data-k="skip">${esc(mnvT("vn.skip","跳過"))}</button></div>
    <div class="mnv-o"></div><div class="mnv-bubs" role="button" tabindex="0" aria-live="polite" aria-label="對話：點一下繼續"></div>
    <div class="mnv-box" role="button" tabindex="0" aria-label="${esc(mnvT("vn.next","下一句"))}"><div class="mnv-nm"></div><p class="mnv-tx" aria-live="polite"></p><span class="mnv-nx" aria-hidden="true">▼</span></div>`;
  document.body.append(o);requestAnimationFrame(()=>requestAnimationFrame(()=>{o.classList.add("on");bk.classList.add("on")}));try{MNF.on=true}catch(e){}
  o.addEventListener("scroll",()=>{if(o.scrollLeft||o.scrollTop){o.scrollLeft=0;o.scrollTop=0}});   /* 圖層 768 寬、右邊立繪往外推：鍵盤 Tab 或捲動到按鈕時整個畫面會被橫捲（11/14 375×667 實測）；overflow:clip＋捲回 0 */
  const im=o.querySelector(".mnv-im"),box=o.querySelector(".mnv-box"),nmE=o.querySelector(".mnv-nm"),tx=o.querySelector(".mnv-tx"),opts=o.querySelector(".mnv-o"),tl=o.querySelector(".mnv-tl"),hold=o.querySelector(".mnv-hold"),fbl=o.querySelector(".mnv-fbl"),bubs=o.querySelector(".mnv-bubs");
  const CHE={l:o.querySelector(".mnv-ch.l"),r:o.querySelector(".mnv-ch.r")},cast={l:null,r:null};
  let Wd=0,Hd=0,kbNow=CH.card.kb||[1,50,50],bgNow="",dead=false,skipping=false,pend=null,typing=null,tapFn=null,sceneI=-1,T0=0,pzR=null,riteR=null,H=[];
  /* ---- 版面：字級（一行約 17.5 字、兩行放得下 MNV_LINE 字）、立繪高度、對話框高度 ---- */
  const fit=()=>{Wd=o.clientWidth||innerWidth;Hd=o.clientHeight||innerHeight;const fs=Math.max(15,Math.min(21,Math.floor((Wd-56)/17.6)));o.style.setProperty("--vfs",fs+"px");
    const bh=Math.ceil(fs*1.55*2+32+12+(parseFloat(getComputedStyle(box).bottom)||12)-12);o.style.setProperty("--boxh",(box.offsetHeight?box.offsetHeight+12:bh)+"px");
    o.style.setProperty("--chh",Math.round(Math.min(Hd*.4,Wd*.7,440,Hd-(box.offsetHeight||bh)-150))+"px");
    const pzw=Math.floor(Math.min(Wd*.94,(Hd-(box.offsetHeight||bh)-12-58-48-58-24)*560/620,560));o.style.setProperty("--pzw",Math.max(240,pzw)+"px");
    pan(kbNow,true);fitTx()};
  const fitTx=()=>{tx.style.fontSize="";let n=0;while(tx.scrollHeight>tx.clientHeight+2&&n++<6)tx.style.fontSize=(parseFloat(getComputedStyle(tx).fontSize)-1)+"px"};
  addEventListener("resize",fit);
  /* ---- 背景：768×1376 的圖放在一層，推拉＝改這層的 transform；熱點放在同一層（跟著圖走），用 --k＝1/縮放 保持螢幕上的大小 ---- */
  function pan(kb,now){kbNow=kb||kbNow;const v=mnvView(Wd,Hd,kbNow);if(now||rm){im.style.transition="none";void im.offsetWidth}im.style.transform=`translate(${v.ox}px,${v.oy}px) scale(${v.s})`;im.style.setProperty("--k",(1/v.s).toFixed(4));
    if(now||rm)requestAnimationFrame(()=>{im.style.transition=""});return v}
  function setBg(k,kb,tr){const u=I[k]&&I[k].u;if(!u)return;if(k!==bgNow){const old=[...im.querySelectorAll(".mnv-bg")],n=document.createElement("div");n.className="mnv-bg"+(old.length&&!rm?" nx":"");n.style.backgroundImage=`url(${u})`;
      if(tr!=null&&!rm)n.style.transition=`opacity ${tr}s,filter .8s`;im.insertBefore(n,im.querySelector(".mnv-hs"));if(old.length&&!rm){let go=0;const fade=()=>{if(go++)return;void n.offsetWidth;n.classList.remove("nx");setTimeout(()=>old.forEach(x=>x.remove()),(tr==null?.7:tr)*1000+80)};try{const pic=new Image();pic.src=u;(pic.decode?pic.decode():Promise.reject()).then(fade,fade)}catch(e){fade()}setTimeout(fade,1500)}else old.forEach(x=>x.remove());
      bgNow=k;bk.style.backgroundImage=`url(${u})`}
    pan(kb||kbNow)}
  const flash=()=>{if(rm)return;const f=document.createElement("div");f.className="mnv-fl";o.insertBefore(f,o.querySelector(".mnv-ch.l"));setTimeout(()=>f.remove(),560)};
  const shake=k=>{if(rm)return;o.style.setProperty("--shk",k+"px");o.classList.remove("shk");void o.offsetWidth;o.classList.add("shk");setTimeout(()=>o.classList.remove("shk"),450)};
  const sfx=k=>{try{if(typeof mnfSfx==="function")mnfSfx(k)}catch(e){}};
  /* ---- 立繪：左右各一位；說話的人亮、另一位暗；旁白、配角說話兩位都半暗 ---- */
  function setSide(sd,w){const E=CHE[sd];if(cast[sd]===w)return;cast[sd]=w;const img=E.querySelector("img");
    if(!w){E.classList.remove("in","sp");return}const P=W[w];const put=()=>{img.src="data/vn/"+P.im+".webp";E.dataset.w=w;void E.offsetWidth;E.classList.add("in")};
    if(E.classList.contains("in")&&!rm){E.classList.remove("in");setTimeout(()=>{if(cast[sd]===w)put()},280)}else put()}
  const setCast=c=>{if(!c)return;setSide("l",c[0]||null);setSide("r",c[1]||null)};
  function speak(w){const P=W[w];if(P&&!P.npc&&cast.l!==w&&cast.r!==w)setSide(w===lead||(!cast.l&&cast.r)?"l":"r",w);
    for(const sd of["l","r"]){const E=CHE[sd];E.classList.toggle("sp",!!w&&cast[sd]===w);E.classList.toggle("nar",!w||!!(P&&P.npc))}}
  const away=on=>{for(const sd of["l","r"])CHE[sd].classList.toggle("away",!!on&&!(on!==true&&cast[sd]===on))};
  /* ---- 等玩家：pend＝目前在等的那件事；跳過＝不等直接過（resolve null），離開＝整個中斷（reject MNV_LEAVE）；tapFn＝點對話框／畫面時要做的事 ---- */
  const wait=setup=>new Promise((res,rej)=>{if(dead)return rej(MNV_LEAVE);let ok=false;const me={res:v=>{if(ok)return;ok=true;if(pend===me){pend=null;tapFn=null}res(v)},rej:e=>{if(ok)return;ok=true;if(pend===me){pend=null;tapFn=null}rej(e)}};pend=me;if(setup)setup(me.res)});   /* 計時器晚到（跳過以後）不會清掉下一個等待 */
  const sleep=s=>skipping?Promise.resolve():wait(r=>setTimeout(()=>r(1),rm?Math.min(400,s*1000):s*1000));
  const boxMode=(m,txt,n)=>{box.className="mnv-box"+(m?" "+m:"");nmE.textContent=n||"";nmE.classList.toggle("npc",!!(n&&Object.values(W).some(x=>x.npc&&x.nm===n)));tx.innerHTML=txt||"";fitTx()};
  const ins=t=>{boxMode("ins",esc(t));box.setAttribute("aria-label",t)};
  const lineOpt=X=>{if(X.cast)setCast(X.cast);if(X.bg)setBg(X.bg,X.kb,X.tr);else if(X.kb)pan(X.kb);if(X.at)pan([X.at[2]||Math.max(1.3,kbNow[0]),X.at[0]/7.68,X.at[1]/13.76])};
  /* 一句台詞：打字（點一下補完）→ 等點下一句 */
  async function line(s){const[w,t,x]=s,X=x||{};lineOpt(X);
    const P=W[w],nm=P?P.nm:"";H.push({n:nm,t,a:X.act||""});if(skipping)return;if(X.fx)sfx(X.fx);if(X.shk)shake(X.shk);speak(w);
    const act=X.act?`<em>（${esc(X.act)}）</em>`:"",full=[...t],nmShow=mnvNmFirst(P,w,SEEN);boxMode(w?"":"nar",act,nmShow);box.setAttribute("aria-label",(nm?nm+"：":"")+t+"。"+mnvT("vn.next","下一句"));
    const sp=document.createElement("span");tx.append(sp);
    if(rm){sp.textContent=t}else{let i=0;await new Promise(res=>{const step=()=>{if(dead||skipping||i>=full.length){sp.textContent=t;typing=null;return res()}sp.textContent+=full[i++];typing={tm:setTimeout(step,i<2?40:26),done:()=>{clearTimeout(typing&&typing.tm);typing=null;i=full.length;sp.textContent=t;res()}}};step()})}
    fitTx();if(skipping)return;box.classList.add("wt");await wait(res=>{tapFn=()=>res(1)});box.classList.remove("wt")}
  /* 氣泡一次淡入（Gemini 提案）：同一畫面 2～4 句依序自動淡入，點一下就全部出現，看完再點一次往下；減少動態時一起出現 */
  async function bub(B){const L=B.bub;for(const[w,t,x]of L)H.push({n:W[w]?W[w].nm:"",t,a:(x&&x.act)||""});if(skipping){for(const l of L)if(l[2])lineOpt(l[2]);return}
    box.style.display="none";bubs.innerHTML="";bubs.className="mnv-bubs on";let i=0,all=false;const gap=(B.gap||1.05)*1000;
    const add=()=>{const[w,t,x]=L[i++],X=x||{};lineOpt(X);if(X.fx)sfx(X.fx);if(X.shk)shake(X.shk);speak(w);const P=W[w],sd=!P||P.npc?"c":cast.l===w?"l":"r";
      bubs.querySelectorAll(".bb.on").forEach(e=>e.classList.add("old"));const d=document.createElement("div");d.className="bb "+sd+(P&&P.npc?" npc":"");
      d.innerHTML=`${P?`<b>${esc(mnvNmFirst(P,w,SEEN))}</b>`:""}${X.act?`<em>（${esc(X.act)}）</em>`:""}${esc(t)}`;bubs.append(d);if(rm||all)d.classList.add("on");else requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add("on")))};
    try{add();while(i<L.length){const v=await wait(res=>{const tm=setTimeout(()=>res(1),rm?0:gap);tapFn=()=>{clearTimeout(tm);res(2)}});if(v==null)break;if(v===2){all=true;while(i<L.length)add()}else add()}
      if(!skipping){bubs.classList.add("wt");bubs.setAttribute("aria-label",L.map(x=>(W[x[0]]?W[x[0]].nm+"：":"")+x[1]).join("　")+"　"+mnvT("vn.next","下一句"));await wait(res=>{tapFn=()=>res(1)})}}
    finally{bubs.className="mnv-bubs";bubs.innerHTML="";box.style.display=""}}
  const tapNext=()=>{if(typing){typing.done();return}if(tapFn)tapFn()};
  for(const el of[box,bubs]){el.addEventListener("click",e=>{e.stopPropagation();tapNext()});el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();tapNext()}})}
  o.addEventListener("click",e=>{if(e.target===o||e.target.closest(".mnv-im,.mnv-ch,.mnv-vg"))if(!e.target.closest(".mnv-hb"))tapNext()});
  /* ---- 熱點 ---- */
  function spotEl(p,cls){const h=document.createElement("div");h.className="mnv-hs";const b=document.createElement("button");b.type="button";b.className="mnv-hb"+(cls?" "+cls:"");b.innerHTML=`<i></i><span>${esc(p.lb)}</span>`;b.setAttribute("aria-label",p.lb);h.append(b);
    if(p.on){const sd=cast.l===p.on?"l":cast.r===p.on?"r":(setSide(p.on===lead?"l":"r",p.on),p.on===lead?"l":"r");h.style.left=p.x+"%";h.style.top=p.y+"%";CHE[sd].querySelector(".mnv-cw").append(h)}
    else{h.style.left=p.x+"px";h.style.top=p.y+"px";im.append(h)}return{h,b}}
  async function run(st){for(const s of st||[]){if(dead)throw MNV_LEAVE;await step(s)}}
  async function step(s){if(Array.isArray(s))return line(s);if(!s)return;
    if(s.cast)setCast(s.cast);if(s.mus)mus(s.mus);if(s.bg&&!s.fb)setBg(s.bg,s.kb,s.tr);else if(s.kb&&!s.fb)pan(s.kb);
    if(s.wait!=null){if(!skipping){boxMode("nar","");await sleep(s.wait)}return}
    if(s.bub)return bub(s);if(s.look)return look(s);if(s.pick)return pick(s.pick);if(s.order)return order(s.order);if(s.show)return show(s);if(s.if!=null)return(MNV_IF[s.if]&&MNV_IF[s.if](pzR))?run(s.st):null;
    if(s.ask)return ask(s);if(s.seq)return seq(s);if(s.btn)return btn(s);if(s.fb)return fb(s);if(s.pz)return pz();if(s.rite)return rite()}
  /* 調查點：clue＝看到什麼（直接寫在提示框、不用翻句，記下來給方案選擇）；st＝台詞；need 處看過才出現 go 按鈕；go:1 的熱點點了就往下 */
  async function look(L){if(skipping){for(const p of L.look)if(p.clue&&!p.opt)CLUE.set(p.lb,p.clue);return}const req=L.look.filter(p=>!p.go&&!p.opt),onP=(L.look.find(p=>p.on)||{}).on;away(onP||true);const seen=new Set();
    const els=L.look.map(p=>{const e=spotEl(p);return Object.assign(e,{p})});let goB=null,last="";
    const cnt=()=>L.go?`（${mnvT("vn.seen","已看 {n}／{m}",{n:Math.min(req.filter(q=>seen.has(q)).length,L.need),m:L.need})}）`:"";
    const say=()=>{ins((last||L.say)+cnt())};say();
    try{for(;;){const v=await wait(res=>{els.forEach(e=>{e.b.onclick=ev=>{ev.stopPropagation();res(e)}});if(goB)goB.onclick=ev=>{ev.stopPropagation();res("go")}});
      if(v==="go"||v==null)break;const p=v.p;sfx(p.fx||"drip");if(typeof vibrate==="function")vibrate(5);seen.add(p);v.b.classList.add("seen");
      if(p.clue){CLUE.set(p.lb,p.clue);last=p.lb+"："+p.clue;H.push({n:"",t:last})}
      if(p.st){o.classList.add("busy");away(false);await run(p.st);o.classList.remove("busy");away(onP||true)}
      if(p.go)break;
      if(L.go&&!goB&&req.filter(q=>seen.has(q)).length>=L.need){opts.innerHTML="";goB=document.createElement("button");goB.type="button";goB.textContent=L.go;opts.append(goB);try{goB.focus({preventScroll:true})}catch(e){}}
      say()}}
    finally{o.classList.remove("busy");els.forEach(e=>e.h.remove());opts.innerHTML="";away(false)}}
  /* 方案選擇（ChatGPT 元件 1）：看過的線索列在上面；選錯演出結果，再回到決定前（試過的標「試過」） */
  async function pick(A){if(skipping)return;const tried=new Set();let first=-1;away(true);
    try{for(;;){ins(tried.size?mnvT("vn.again","再想一次：")+A.ask:A.ask);
      opts.innerHTML=CLUE.size?`<div class="mnv-clue" aria-label="${esc(mnvT("vn.clues","看到的線索"))}">${[...CLUE].map(([k,v])=>`<p><b>${esc(k)}</b>${esc(v)}</p>`).join("")}</div>`:"";
      const bs=A.opt.map((x,i)=>{const b=document.createElement("button");b.type="button";b.textContent=x.t;if(tried.has(i))b.classList.add("tried");opts.append(b);return b});try{bs.find((b,i)=>!tried.has(i)).focus({preventScroll:true})}catch(e){}
      const i=await wait(res=>bs.forEach((b,k)=>b.onclick=ev=>{ev.stopPropagation();res(k)}));opts.innerHTML="";if(i==null)return;if(first<0)first=i;
      if(typeof vibrate==="function")vibrate(8);H.push({n:mnvT("vn.you","你"),t:A.opt[i].t,me:1});away(false);await run(A.opt[i].st);
      if(A.opt[i].ok){try{if(opt.onChoice)opt.onChoice(A.key,{first,tries:tried.size+1})}catch(e){}return}tried.add(i);away(true)}}
    finally{opts.innerHTML="";away(false)}}
  /* 安排順序（ChatGPT 元件 2）：照順序點完按「開始」；順序錯就演那條 fail，再重排 */
  async function order(Q){if(skipping)return;let seq=[],tries=0,first=null;away(true);
    try{for(;;){ins(tries?mnvT("vn.again","再想一次：")+Q.ask:Q.ask);
      opts.innerHTML=`<div class="mnv-ord"></div>`;const box2=opts.firstChild;
      const draw=()=>{box2.innerHTML=Q.items.map(x=>{const n=seq.indexOf(x.k);return`<button type="button" class="it${n>=0?" on":""}" data-k="${esc(x.k)}"><span class="av">${x.who.map(w=>`<i style="background-image:url(data/vn/${W[w].im}.webp)"></i>`).join("")}</span><span class="t">${esc(x.t)}<br><small>${esc(x.who.map(w=>W[w].nm).join("、"))}</small></span><u>${n>=0?n+1:""}</u></button>`}).join("")+
        `<div class="row"><button type="button" class="g" data-a="re"${seq.length?"":" disabled"}>${esc(mnvT("vn.reorder","重排"))}</button><button type="button" data-a="go"${seq.length===Q.items.length?"":" disabled"}>${esc(mnvT("vn.start","開始"))}</button></div>`};
      draw();
      const v=await wait(res=>{box2.onclick=ev=>{const b=ev.target.closest("button");if(!b||b.disabled)return;ev.stopPropagation();
        if(b.dataset.a==="re"){seq=[];draw();return}if(b.dataset.a==="go"){res("go");return}const k=b.dataset.k,n=seq.indexOf(k);if(n>=0)seq=seq.slice(0,n);else seq.push(k);if(typeof vibrate==="function")vibrate(5);draw()}});
      opts.innerHTML="";if(v==null)return;tries++;if(!first)first=seq.slice();H.push({n:mnvT("vn.you","你"),t:seq.map(k=>Q.items.find(x=>x.k===k).t).join("→"),me:1});
      const F=mnvOrderFail(Q,seq);away(false);
      if(!F){try{if(opt.onChoice)opt.onChoice(Q.key,{first:first.join(">"),tries})}catch(e){}await run(Q.st);return}
      await run(F.st||[]);seq=[];away(true)}}
    finally{opts.innerHTML="";away(false)}}
  /* 自動演出：一格一格換鏡頭和字幕，不用點；「略過演出」直接跳到最後一格 */
  async function show(S){const F=S.show,dt=(S.dt||1.8)*1000;if(skipping){const z=F[F.length-1];if(z.bg)setBg(z.bg,z.kb,0);else if(z.kb)pan(z.kb);return}
    away(true);opts.innerHTML="";const sk=document.createElement("button");sk.type="button";sk.className="skp";sk.textContent=mnvT("vn.skipShow","略過演出 ›");opts.append(sk);let cut=false;
    try{for(let i=0;i<F.length;i++){const f=F[i];if(cut&&i<F.length-1)continue;if(f.bg)setBg(f.bg,f.kb,cut?0:.8);else if(f.kb)pan(f.kb,cut);if(!cut){if(f.fx)sfx(f.fx);if(f.shk)shake(f.shk)}
        boxMode("nar",esc(f.cap));H.push({n:"",t:f.cap});if(i===F.length-1&&cut)break;
        const v=await wait(res=>{const tm=setTimeout(()=>res(1),rm?Math.min(dt,1200):dt);sk.onclick=ev=>{ev.stopPropagation();clearTimeout(tm);res(2)}});if(v==null)return;if(v===2)cut=true}
      if(cut)await sleep(.6)}
    finally{opts.innerHTML="";away(false)}}
  /* 選項：兩個，各自 1～3 句回應，再接回共通台詞 */
  async function ask(A){if(skipping)return;const meLead=mnvMe()===(W[lead]||{}).im;ins(meLead?A.ask.me:A.ask.you);opts.innerHTML="";
    const bs=A.opt.map((x,i)=>{const b=document.createElement("button");b.type="button";b.textContent=x.t;opts.append(b);return b});try{bs[0].focus({preventScroll:true})}catch(e){}
    const i=await wait(res=>bs.forEach((b,k)=>b.onclick=ev=>{ev.stopPropagation();res(k)}));opts.innerHTML="";if(i==null)return;
    if(typeof vibrate==="function")vibrate(8);H.push({n:mnvT("vn.you","你"),t:A.opt[i].t,me:1});try{if(opt.onChoice)opt.onChoice(A.key,i)}catch(e){}await run(A.opt[i].st)}
  /* 依序小動作：點物件 → 交給某人（頭像按鈕）→ 對方回一句；全部做完才往下 */
  async function seq(Q){if(skipping)return;const all=[...new Set(Q.seq.flatMap(x=>[].concat(x.to).join("+")))];const done=new Set();
    try{for(let k=0;k<Q.seq.length;k++){const X=Q.seq[k],to=[].concat(X.to),key=to.join("+"),nm=to.map(w=>W[w].nm).join("、");away(true);
      ins(`${Q.say||""}點「${X.it.lb}」。（${k+1}／${Q.seq.length}）`);const e=spotEl(X.it);
      const got=await wait(res=>{e.b.onclick=ev=>{ev.stopPropagation();res(1)}});e.h.remove();if(got==null)return;sfx("drip");if(typeof vibrate==="function")vibrate(5);
      hold.textContent=mnvT("vn.hold","手上：{x}",{x:X.it.lb});ins(mnvT("vn.give","交給{x}。",{x:nm}));
      opts.innerHTML=`<div class="mnv-av"></div>`;const av=opts.firstChild;
      const bs=all.filter(a=>!done.has(a)).map(a=>{const ws=a.split("+"),b=document.createElement("button");b.type="button";b.dataset.k=a;if(a===key)b.classList.add("ok");
        b.innerHTML=`<b>${ws.map(w=>`<i style="background-image:url(data/vn/${W[w].im}.webp)"></i>`).join("")}</b><span>${esc(ws.map(w=>W[w].nm).join("、"))}</span>`;b.setAttribute("aria-label",mnvT("vn.give","交給{x}。",{x:ws.map(w=>W[w].nm).join("、")}));av.append(b);return b});
      for(;;){const b=await wait(res=>bs.forEach(x=>x.onclick=ev=>{ev.stopPropagation();res(x)}));if(b==null)return;if(b.dataset.k===key)break;
        b.classList.remove("no");void b.offsetWidth;b.classList.add("no");if(typeof vibrate==="function")vibrate([10,30,10]);ins(`「${X.it.lb}」${mnvT("vn.giveTo","交給{x}比較合適。",{x:nm})}`)}
      opts.innerHTML="";hold.textContent="";done.add(key);if(typeof vibrate==="function")vibrate(8);away(false);setSide("r",to[0]);await run(X.st)}}
    finally{opts.innerHTML="";hold.textContent="";away(false)}}
  async function btn(B){if(skipping)return;ins(B.say||"");opts.innerHTML="";const b=document.createElement("button");b.type="button";b.textContent=B.btn;opts.append(b);try{b.focus({preventScroll:true})}catch(e){}
    await wait(res=>{b.onclick=ev=>{ev.stopPropagation();res(1)}});opts.innerHTML="";sfx("hang");if(typeof vibrate==="function")vibrate(10);H.push({n:mnvT("vn.you","你"),t:B.btn,me:1})}
  /* 閃回：濾鏡＋標籤（白閃進出），結束回到原本的背景和立繪 */
  async function fb(F){const keep={bg:bgNow,kb:kbNow,c:[cast.l,cast.r]};H.push({n:"",t:"── "+F.fb+" ──"});
    if(!skipping){flash();sfx("rain")}o.classList.add("fb");fbl.textContent=F.fb;setCast([null,null]);setBg(F.bg,F.kb,.25);
    try{await run(F.st)}finally{if(!dead){if(!skipping)flash();o.classList.remove("fb");setBg(keep.bg,keep.kb,.25);setCast(keep.c)}}}
  function mus(m){try{if(m&&typeof mnfMusic==="function")mnfMusic(m[0],m[1])}catch(e){}}
  /* 危機解題：不能跳過；解開回報 07mnq（記紀錄、千秋殘局），拿回儀式資料 */
  const pzUi=()=>({say:ins,line:(w,t)=>{const p=W[w];boxMode(w?"":"nar",esc(t),p?p.nm:"")},away:()=>away(true)});
  async function pz(){skipping=false;o.classList.add("nsk");away(true);const P=opt.pz||(typeof MNF_QTE!=="undefined"&&MNF_QTE[CH.qte]);
    try{const r=await wait(res=>mnvPz(o,P,pzUi(),res));
      if(r){pzR=r;H.push({n:mnvT("vn.you","你"),t:(CH.pzName||P.nm||"")+"　"+(r.cn||""),me:1});try{riteR=opt.onSolved?opt.onSolved(P,r):null}catch(e){riteR=null}}}
    finally{o.classList.remove("nsk");away(false);skipping=false}}
  async function rite(){if(!riteR||typeof mnfSolveRite!=="function")return;const R=riteR;riteR=null;try{if(typeof mnfVol==="function")mnfVol(.4,1)}catch(e){}
    await wait(res=>mnfSolveRite(Object.assign({},R,{fast:true,onDone:()=>res(1)})));try{if(typeof mnfVol==="function")mnfVol(1,1.2)}catch(e){}}
  /* ---- 一場：標題 → 背景、立繪、配樂 → 步驟；跳過＝快轉 ---- */
  async function scene(i){const S=CH.sc[i];sceneI=i;T0=performance.now();skipping=false;setCast(S.cast);if(S.mus)mus(S.mus);setBg(S.bg,S.kb,i?.8:0);boxMode("nar","");
    tl.textContent=mnvT("vn.scene","第 {n} 場",{n:i+1})+"・"+S.nm;tl.classList.add("on");setTimeout(()=>tl.classList.remove("on"),2200);H.push({n:"",t:"── "+tl.textContent+" ──"});
    await sleep(rm?.2:.9);await run(S.st);const ms=Math.round(performance.now()-T0);try{console.info("[mnv]",S.id,S.nm,(ms/1000).toFixed(1)+"s",skipping?"（跳過）":"")}catch(e){}
    try{if(opt.onScene)opt.onScene(S.id,ms,skipping)}catch(e){}skipping=false}
  /* ---- 卡片：任務卡、章末卡、跳過確認 ---- */
  function card(cls,html,btns){return new Promise(res=>{const d=document.createElement("div");d.className=cls;d.setAttribute("role","dialog");d.innerHTML=html+`<div class="gb">${btns.map((b,i)=>`<button type="button"${i?' class="g"':""}>${esc(b)}</button>`).join("")}</div>`;o.append(d);
    requestAnimationFrame(()=>d.classList.add("on"));const bs=d.querySelectorAll(".gb button");try{bs[0].focus({preventScroll:true})}catch(e){}
    bs.forEach((b,i)=>b.onclick=e=>{e.stopPropagation();if(typeof vibrate==="function")vibrate(8);d.classList.remove("on");setTimeout(()=>d.remove(),380);res(i+1)})})}
  const top=k=>{if(k==="leave")return leave();if(k==="log")return showLog();if(k==="skip")return askSkip()};
  o.querySelectorAll(".mnv-top .mnv-b").forEach(b=>b.onclick=e=>{e.stopPropagation();top(b.dataset.k)});
  async function askSkip(){if(skipping||o.classList.contains("nsk")||o.querySelector(".mnv-ask,.mnv-card,.mnv-end"))return;
    const k=await card("mnv-ask",`<h2 style="font-size:26px">${esc(mnvT("vn.skipAsk","跳過這一場？"))}</h2>`,[mnvT("vn.skip","跳過"),mnvT("vn.keep","繼續看")]);
    if(k!==1)return;skipping=true;if(typing)typing.done();if(pend)pend.res(null)}
  function showLog(){if(o.querySelector(".mnv-log"))return;const d=document.createElement("div");d.className="mnv-log";d.setAttribute("role","dialog");d.setAttribute("aria-label",mnvT("vn.log","回看"));
    d.innerHTML=`<ol>${H.slice(-80).map(h=>`<li${h.me?' class="me"':""}>${h.n?`<b>${esc(h.n)}</b>`:""}${h.a?`<em>（${esc(h.a)}）</em>`:""}${esc(h.t)}</li>`).join("")}</ol><button type="button">${esc(mnvT("vn.close","回到故事"))}</button>`;
    o.append(d);requestAnimationFrame(()=>{d.classList.add("on");const ol=d.querySelector("ol");ol.scrollTop=ol.scrollHeight});const b=d.querySelector("button");try{b.focus({preventScroll:true})}catch(e){}
    b.onclick=e=>{e.stopPropagation();d.classList.remove("on");setTimeout(()=>d.remove(),300);try{box.focus({preventScroll:true})}catch(x){}}}
  function close(){if(dead)return;dead=true;removeEventListener("resize",fit);if(typing)typing.done();if(pend)pend.rej(MNV_LEAVE);o.classList.remove("on");bk.classList.remove("on");setTimeout(()=>{o.remove();bk.remove()},460);
    try{if(typeof mnfMusicStop==="function")mnfMusicStop(.8);else MNF.on=false}catch(e){}}
  function leave(){close();try{if(opt.onLeave)opt.onLeave(sceneI)}catch(e){}}
  o.addEventListener("keydown",e=>{if(e.key==="Escape"){const g=o.querySelector(".mnv-log button");if(g)g.click()}});
  /* ---- 整章 ---- */
  async function main(){fit();const from=Math.max(0,Math.min(CH.sc.length-1,opt.from|0)),C=CH.card;setBg(C.bg,C.kb,0);setCast([null,null]);boxMode("nar","");box.style.visibility="hidden";
    const resume=from>0,k=await card("mnv-card",`<div class="k">${esc(CH.kicker||"")}</div><h2>${esc(C.t)}</h2>${C.b.map(x=>`<p>${esc(x)}</p>`).join("")}${resume?`<p style="font-size:15px;color:#c9b48a">${esc(mnvT("vn.resume","上次看到 第 {n} 場・{s}",{n:from+1,s:CH.sc[from].nm}))}</p>`:""}`,
      resume?[mnvT("vn.cont","接著看"),mnvT("vn.restart","從第一場看")]:[C.go]);
    box.style.visibility="";if(dead)return;let i=resume&&k===2?0:from;
    for(;i<CH.sc.length;i++){if(dead)return;await scene(i)}
    if(dead)return;await endCard()}
  /* 章末卡：印＋你做了什麼（獨立找到、看過反駁、用了幫我看……，不給總星等）；「再試這盤棋」再解一次（結果另外記） */
  async function endCard(){const E=CH.end,P=opt.pz||MNF_QTE[CH.qte],N=Math.ceil(((P&&P.line)||[1,1,1]).length/2);setCast([null,null]);setBg(E.bg,[1.2,40,62],1);box.style.visibility="hidden";if(!rm)sfx("bell");
    for(;;){const D=mnvDid(pzR,N,P);const k=await card("mnv-end",`<div class="seal" aria-hidden="true">${esc(E.seal)}<br>之印</div><h2>${esc(E.t)}</h2><p>${esc(E.s)}</p>${D.length?`<ul aria-label="${esc(mnvT("vn.did","你做了什麼"))}">${D.map(([t,g])=>`<li${g?' class="gold"':""}>${esc(t)}</li>`).join("")}</ul>`:""}`,[E.b,E.g]);
      if(k===2){box.style.visibility="";o.classList.add("nsk");const r=await new Promise(res=>{away(true);mnvPz(o,P,Object.assign(pzUi(),{away:()=>{}}),res)});
        o.classList.remove("nsk");if(r){pzR=r;try{if(opt.onRetry)opt.onRetry(P,r)}catch(e){}}box.style.visibility="hidden";continue}
      close();try{if(opt.onEnd)opt.onEnd(k)}catch(e){}return}}
  main().catch(e=>{if(e!==MNV_LEAVE){try{console.error("[mnv]",e)}catch(x){}close();try{if(opt.onLeave)opt.onLeave(sceneI)}catch(x){}}});
  return{leave,skip:()=>{skipping=true;if(typing)typing.done();if(pend)pend.res(null)},next:tapNext,get scene(){return sceneI},el:o}}
/* ---------- 解題卡：host＝放進去的容器；ui＝{say(字) 對話框提示, line(人,字) 對話框台詞, away()}；done(r) ----------
   P＝{id,fen,side,line,alt,nm 卡名,vsay／vsay2 對話框提示（開始、對方應完）,how:{t,b} 白話說明,
      trial:{say,cands:[{k,t,line:[著法…],say}…]} 試看（ChatGPT 元件 3：比較候選著的後果；每一手都要驗過合法，可暫停、回原局，看完自己走）,
      help:[每一步「幫我看」的說明…], walk:[每一步「陪我走」的說明…], wrong:{著法:{say,re 反駁著法}}, miss:[[人,字]…] 走錯後的台詞, win 解開的台詞}
   r＝{mist 走錯幾次, help 用過幫我看, walk 陪走幾步, trial:[看過的試看], moves 走了幾手（含走錯）, perfect 不用幫忙、沒試看、一次走對, hint, lv, demo 全部陪走, cn 走法}
   新手三段支援（不設倒數）：自己來（什麼都不標）／幫我看（藍框要動的子、箭頭候選著、紅圈走過去會被吃的格子）／陪我走（演一步並說明，下一個決定交回玩家） */
function mnvPz(host,P,ui,done){const C=typeof window!=="undefined"&&window.XQCore;ui=ui||{};const say=ui.say||(()=>{}),talk=ui.line||((w,t)=>say(t));
  if(!C||!P||typeof Board!=="function"){setTimeout(()=>done({mist:0,hint:true,lv:0,help:false,walk:1,trial:[],moves:0,perfect:false,demo:true,cn:"",skip:1}),300);return null}
  const S1=P.vsay||P.say||"",S2=P.vsay2||S1,side=P.side||"r",opp=C.opp(side),b0=C.parseFen(String(P.fen).split(" ")[0]),lines=[P.line||[],...(P.alt||[])].map(L=>L.slice()),N0=Math.ceil(lines[0].length/2),T=P.trial;
  const w=document.createElement("div");w.className="mnv-pz";
  w.innerHTML=`<div class="pz-h"><b>${esc(P.nm||"破局")}</b><span class="pz-st" aria-live="polite"></span>${P.how?`<button type="button" class="pz-hw">${esc(P.how.t)}</button>`:""}</div><div class="pz-bd"><div class="pz-tr" aria-hidden="true">${esc(mnvT("vn.trialTag","試看・不算數"))}</div></div><div class="pz-t"></div>`;
  host.append(w);const bdW=w.querySelector(".pz-bd"),st=w.querySelector(".pz-st"),tools=w.querySelector(".pz-t");
  let b=b0.slice(),pl=[],nR=N0,sel=-1,last=null,busy=false,mist=0,helpOn=false,usedHelp=false,walkN=0,moves=0,cn=[],bstep=b.slice(),lastStep=null,fin=false,phase=T?"trial":"play",TR=null;const tried=[];
  const sq=u=>[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))],ck=bb=>C.inCheck(bb,"r")?C.kingSq(bb,"r"):C.inCheck(bb,"b")?C.kingSq(bb,"b"):-1;
  const onLine=()=>lines.filter(L=>pl.every((x,i)=>L[i]===x)&&L[pl.length]);
  /* 下一手該走什麼：還在題目的線上就照線，不在就照規則往下算 */
  const want=()=>{const L=onLine();if(L.length)return sq(L[0][pl.length]);return mnvMate(C,b,side,nR)};
  const stepN=()=>N0-nR,pick=a=>(a||[])[Math.min(stepN(),(a||[]).length-1)]||"";
  const bd=Board(x=>tap(x));bdW.append(bd.svg);
  const sfx=k=>{try{if(typeof mnfSfx==="function")mnfSfx(k)}catch(e){}};
  const tg=()=>{if(sel<0||phase!=="play")return[];return C.legal(b,side).filter(([f])=>f===sel).map(x=>x[1])};
  const ring=S=>{const NS="http://www.w3.org/2000/svg";bd.svg.querySelectorAll(".mnv-th").forEach(e=>e.remove());for(const s of S){const c=document.createElementNS(NS,"circle");c.setAttribute("class","mnv-th");c.setAttribute("cx",40+(s%9)*60);c.setAttribute("cy",40+(s/9|0)*60);c.setAttribute("r",26);c.setAttribute("aria-hidden","true");bd.svg.append(c)}};
  const draw=x=>{let O={sel,last,check:ck(b),targets:tg()},th=[];
    if(phase==="play"&&!busy&&!fin&&helpOn){const m=want();if(m){const h=mnvHelp(C,b,side,nR,m[0]);O.hint=[h.pc];O.sugg=h.cands;th=h.threats}}
    O=Object.assign(O,x||{});bd.draw(b,O);try{if(typeof mnfTgGlow==="function")mnfTgGlow(bd.svg,O.targets||[])}catch(e){}ring(th)};
  const status=()=>{st.textContent=phase==="trial"?mnvT("vn.trialSt","試看"):(mist?mnvT("vn.mist","走錯 {n} 次",{n:mist})+"・":"")+(helpOn?mnvT("vn.help","幫我看"):mnvT("vn.self","自己來"))+(walkN?"・"+mnvT("vn.walkN","陪走 {n}",{n:walkN}):"");
    tools.querySelectorAll("[data-m]").forEach(x=>x.classList.toggle("on",x.dataset.m==="help"?helpOn:x.dataset.m==="self"?!helpOn:false))};
  const helpSay=()=>say(pick(P.help)||mnvT("vn.helpSay","藍框是要動的子；箭頭是可以比較的路；紅圈的格子走過去會被吃。"));
  const lit=s=>{const r=bd.svg.getBoundingClientRect(),wr=bdW.getBoundingClientRect(),k=r.width/560,d=document.createElement("div");d.className="mnv-lit";d.style.left=(40+(s%9)*60)*k+(r.left-wr.left)+"px";d.style.top=(40+(s/9|0)*60)*k+(r.top-wr.top)+"px";bdW.append(d);setTimeout(()=>d.remove(),1200)};
  const result=()=>({mist,help:usedHelp,walk:walkN,trial:tried.slice(),moves,perfect:!mist&&!usedHelp&&!walkN&&!tried.length,hint:usedHelp||walkN>0,lv:usedHelp?1:0,demo:walkN>=N0,cn:cn.join("　")});
  const win=()=>{busy=true;fin=true;tools.style.visibility="hidden";sfx("gong");if(typeof vibrate==="function")vibrate([15,40,25]);if(last)lit(last.t);if(P.win)talk("",P.win);
    setTimeout(()=>{bdW.classList.add("done");setTimeout(()=>{w.remove();done(result())},850)},1000)};
  const mk=(t,k,cls)=>`<button type="button" data-${k[0]}="${esc(k[1])}"${cls?` class="${cls}"`:""}>${esc(t)}</button>`;
  /* ---- 試看：選一個候選著 → 演驗證過的線（可暫停、回原局）→ 再試另一個，或「我自己走」 ---- */
  const trStop=()=>{if(TR&&TR.tm)clearTimeout(TR.tm);TR=null};
  const trTools=state=>{if(state==="play")tools.innerHTML=mk(mnvT("vn.pause","⏸ 暫停"),["a","pause"])+mk(mnvT("vn.reset","↺ 回原局"),["a","reset"])+mk(mnvT("vn.mine","我自己走"),["a","mine"]);
    else tools.innerHTML=T.cands.map(c=>mk(mnvT("vn.trial","試看：{t}",{t:c.t}),["c",c.k],tried.includes(c.k)?"tri":"")).join("")+mk(mnvT("vn.mine","我自己走"),["a","mine"]);status()};
  const trStep=()=>{if(!TR||TR.paused)return;const c=TR.c;if(TR.i>=c.line.length){TR.tm=0;say(c.say);trTools("done");return}const[f,t]=sq(c.line[TR.i++]),cap=!!b[t];b=C.make(b,f,t);last={f,t};draw({targets:[]});if(cap)sfx("drum");TR.tm=setTimeout(trStep,1000)};
  const trPlay=c=>{trStop();b=b0.slice();last=null;sel=-1;bdW.classList.add("tr");if(!tried.includes(c.k))tried.push(c.k);say(T.say||"");TR={c,i:0,paused:false,tm:0};trTools("play");draw({targets:[]});TR.tm=setTimeout(trStep,650)};
  const trReset=()=>{trStop();b=b0.slice();last=null;draw({targets:[]});say(T.say||"");trTools("idle")};
  const mine=()=>{trStop();phase="play";bdW.classList.remove("tr");b=b0.slice();last=null;sel=-1;playTools();say(S1);draw()};
  /* ---- 自己下：自己來／幫我看／陪我走 ---- */
  function playTools(){tools.innerHTML=mk(mnvT("vn.self","自己來"),["m","self"])+mk(mnvT("vn.help","幫我看"),["m","help"])+mk(mnvT("vn.walk","陪我走"),["m","walk"]);status()}
  const walkOne=()=>{const m=want();if(!m)return;walkN++;say(pick(P.walk)||mnvT("vn.walkSay","看我走這一步。"));sel=m[0];busy=true;draw({targets:[m[1]],sugg:[{f:m[0],t:m[1]}],hint:[m[0]]});status();setTimeout(()=>{busy=false;go(m[0],m[1])},1100)};
  tools.addEventListener("click",e=>{const x=e.target.closest("button");if(!x)return;e.stopPropagation();const a=x.dataset.a,c=x.dataset.c,m=x.dataset.m;
    if(c){const cc=T.cands.find(z=>z.k===c);if(cc)trPlay(cc);return}
    if(a==="pause"&&TR){TR.paused=!TR.paused;x.textContent=TR.paused?mnvT("vn.play","▶ 繼續"):mnvT("vn.pause","⏸ 暫停");if(TR.paused)clearTimeout(TR.tm);else TR.tm=setTimeout(trStep,250);return}
    if(a==="reset")return trReset();if(a==="mine")return mine();
    if(a==="back")return back();if(busy||fin)return;
    if(m==="self"){helpOn=false;status();say(pl.length?S2:S1);draw();return}
    if(m==="help"){helpOn=true;usedHelp=true;const mv=want();if(mv)sel=mv[0];status();helpSay();draw();return}
    if(m==="walk")return walkOne()});
  const hw=w.querySelector(".pz-hw");if(hw)hw.onclick=e=>{e.stopPropagation();showHow()};
  function showHow(){if(bdW.querySelector(".pz-how"))return;const d=document.createElement("div");d.className="pz-how";d.setAttribute("role","dialog");
    d.innerHTML=`<b>${esc((P.how&&P.how.t)||"")}</b><p>${esc((P.how&&P.how.b)||"")}</p><button type="button">${esc(mnvT("vn.gotIt","知道了"))}</button>`;bdW.append(d);const bt=d.querySelector("button");try{bt.focus({preventScroll:true})}catch(e){}
    bt.onclick=e=>{e.stopPropagation();d.remove();if(phase==="play"&&!busy&&!fin){const f=b.findIndex(p=>p===(P.pcK||"R"));if(f>=0)sel=f;say(mnvT("vn.howSee","發光的點，就是它現在能走到的地方。"));draw()}}}
  /* 走錯：棋盤上照走 → 對方真的反駁一手 → 停住，出「退回重想」；錯 2 次自動「幫我看」 */
  function back(){b=bstep.slice();last=lastStep;sel=-1;busy=false;playTools();if(mist>=2&&!helpOn){helpOn=true;usedHelp=true;const m=want();if(m)sel=m[0];status();helpSay()}else if(helpOn)helpSay();else say(pl.length?S2:S1);draw()}
  const wrong=(nb,f,t,u)=>{busy=true;mist++;b=nb;last={f,t};sel=-1;draw({targets:[]});bdW.classList.remove("shk");void bdW.offsetWidth;bdW.classList.add("shk");if(typeof vibrate==="function")vibrate([20,40,20]);sfx("drum");status();
    const W0=P.wrong&&P.wrong[u];
    setTimeout(()=>{if(fin)return;const R=mnvRefute(C,nb,side,t,nR,W0&&W0.re);if(R){b=C.make(nb,R[0],R[1]);last={f:R[0],t:R[1]};draw({targets:[]});sfx("drum")}
      const L=[...(W0&&W0.say?[["",W0.say]]:[]),...(P.miss||[])];let j=0;const nx=()=>{if(fin||!busy||j>=L.length)return;talk(L[j][0],L[j][1]);j++;if(j<L.length)setTimeout(nx,1800)};nx();
      tools.innerHTML=mk(mnvT("vn.back","退回重想"),["a","back"],"bk");try{tools.firstChild.focus({preventScroll:true})}catch(e){}},700)};
  const go=(f,t)=>{const u=C.iccs(f,t),L=onLine().find(L=>L[pl.length]===u),J=mnvJudge(C,b,side,f,t,nR,!!L),nt=C.notate(b,f,t);moves++;
    if(!J.ok)return wrong(J.nb,f,t,u);cn.push(nt);b=J.nb;last={f,t};sel=-1;if(typeof vibrate==="function")vibrate(15);
    if(J.win){draw({targets:[]});return win()}
    const rp=L&&L[pl.length+1]?sq(L[pl.length+1]):mnvReply(C,b,side,nR-1);busy=true;draw({targets:[]});
    setTimeout(()=>{if(!rp){win();return}pl.push(u,C.iccs(rp[0],rp[1]));b=C.make(b,rp[0],rp[1]);last={f:rp[0],t:rp[1]};nR--;bstep=b.slice();lastStep=last;busy=false;
      if(helpOn){const m=want();if(m)sel=m[0];helpSay()}else say(S2);status();draw()},700)};
  function tap(x){if(busy||fin||phase!=="play")return;const Lg=C.legal(b,side);
    if(sel>=0&&Lg.some(([f,t])=>f===sel&&t===x))return go(sel,x);
    sel=Lg.some(([f])=>f===x)?x:-1;if(sel>=0&&typeof vibrate==="function")vibrate(5);draw()}
  if(ui.away)ui.away();if(phase==="trial"){bdW.classList.add("tr");say(T.say||"");trTools("idle")}else{playTools();say(S1)}draw();
  return{tap,trial:k=>{const c=T&&T.cands.find(z=>z.k===k);if(c)trPlay(c)},mine,state:()=>({b:b.slice(),pl:pl.slice(),nR,mist,helpOn,walkN,moves,tried:tried.slice(),phase,sel,busy,fin,trial:TR&&{k:TR.c.k,i:TR.i,paused:TR.paused}}),
    move:u=>{const[f,t]=sq(u);sel=f;tap(t)}}}
