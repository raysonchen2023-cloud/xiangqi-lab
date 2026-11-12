/* ================= 🌀 千秋穿梭・突發事件（第一批；開發者 11/7 核准，提案 story/千秋穿梭突發事件提案.md）=================
   觸發點：07-legend.js qianqiu() 的 end()，呼叫 done 以前先問 qqEvent()；有事件就把穿梭畫面停在途經那一朝的圖上、壓暗，跳出事件卡（跳過動畫照樣有事件）。
     qianqiu 第 4 個參數是從哪裡來：park＝千秋石枰（20%）、sail＝星槎起航、go＝航線換站／擂主卡／集章簿（35%）。
   規則（開發者決定①）：每次穿梭只擲一次；剛發生過事件，下一次不觸發；每天最多 3 個、有懲罰的最多 1 個；懲罰型輸了，接下來 3 次穿梭只出獎勵型；
     連續 5 次沒事件，第 6 次一定出獎勵型；第 14 站終章、第一次起航不觸發；第一次觸發一律是說書人的考問。
   難度（提案 3-2、3-3）：聽書或修為 Lv 5 以下套聽書的懲罰規則（事件池只放獎勵型，攔路棋客是邀請版）；懲罰型佔比 0／25／35／45／55%；攔路撐 6～15 步；攔路贏了修為 ×1～×2.5。
   四個事件：teller 說書人的考問（卡片裡答題）、block 攔路棋客（#/qqev，jLevel 的 relay 自由段，局面池 data/canju/even-mid.json）、
     pirate 雲河棋寇（#/canju/q/pz，一盞茶解題頁，走錯 3 次算沒擋住）、bottle 漂流瓶裡的殘譜（#/qqev，jLevel 的 guess）。invite＝攔路棋客的邀請版（聽書）。
   只押不奪：修為永遠不扣；入局以下只押提示棋、悔棋符；珍品只在破陣以上被借走，一定能贖回，3 天後自動歸還。賭注先寫在事件卡上。
   App 中途關掉＝事件沒發生（QQ_CUR 只在記憶體裡，#/qqev、#/canju/q/pz 重新整理後顯示「已經過去了」）。
   存檔（JOURNEY_KEYS）：evLog＝{d 今天,n 今天幾個,pn 今天有懲罰的幾個,cool 冷卻,dry 連續幾次沒事件,safe 還有幾次只出獎勵型,first 第一次的時間,tq 問過的題,npc {棋手:上次攔路},dare 逃跑後園子裡等你,won {珍品:奪回}}；
     evPawn＝攔路棋客押走的東西 {npc,nm,era,items,rid,rnm,re,at,due}；evHeld＝寇船扣著的東西 {rid,rnm,re 珍品的朝代,items,at,due}；jRunE＝#/qqev 的關卡進度；cjRunE＝擋寇那題的解題進度。
   🎒 稍後處理（Gemini 評估、開發者 11/8 核准）：事件卡的「🎒 先收進囊中」＝船照常到站，事件存在 evStash＝{ev,to,d 觸發那天,at,due＝at＋12 小時}；
     同時最多存 1 個（已有一個時新事件照常觸發，只是不能再存）；攔路棋客收進囊中＝這次不打也不逃（不付過路費、不記「園子等你」）。
     從行囊「🌀 雲河怪事」或星槎頁右上角的 🎒（顯示剩餘時間）打開；打開後按了任何選擇才從囊中拿掉，按「先放回囊中」照舊留著。12 小時沒處理就消失，不罰任何東西。
     計數：事件在觸發那一刻就記進 evLog（n、pn、cool、dry），存起來、拿出來都不再記；隔天才打開的話，換日時先算進當天的 n／pn（qqLog），所以每天上限照算；
     囊中放著攔路棋客／寇船時，不再挑同一種（evPawn、evHeld 各只有一格）；打開時設 cool＝下一次穿梭不觸發。 */
const QQ_STASH_MS=12*36e5;
const QQ_RATE={park:.2,sail:.35,go:.35},QQ_MULT=[1,1.2,1.5,2,2.5],QQ_STEPS=[6,8,10,12,15],QQ_AI=[3,4,5,6,7],QQ_SHARE=[0,.25,.35,.45,.55],QQ_DAY=864e5,QQ_PEN=new Set(["block","pirate"]);
let QQ_CUR=null,QQ_POOL=null,QQ_POOLP=null;
function qqPool(){return QQ_POOLP||(QQ_POOLP=fetch("data/canju/even-mid.json").then(r=>r.ok?r.json():null).then(d=>{QQ_POOL=d&&Array.isArray(d.items)?d.items:null;return QQ_POOL}).catch(()=>{QQ_POOLP=null;return null}))}
function qqLog(){const L=store.get("evLog",null)||{},d=localDay();if(L.d!==d){L.d=d;L.n=0;L.pn=0;
    const S=qqStash();if(S&&S.d!==d){L.n=1;if(QQ_PEN.has(S.ev.t))L.pn=1;S.d=d;store.set("evStash",S);L.dry=L.dry|0;L.safe=L.safe|0;L.npc=L.npc||{};qqLogSet(L)}}   /* 囊中的事件跨日：算進新的一天的上限 */
  L.dry=L.dry|0;L.safe=L.safe|0;L.npc=L.npc||{};return L}
/* 囊中的事件（過期的不算；過期的訊息由 qqSettle 說） */
function qqStash(){const S=store.get("evStash",null);return S&&S.ev&&Date.now()<S.due?S:null}
const qqLogSet=L=>store.set("evLog",L);
const qqDi=()=>diffNow()-1,qqNewbie=()=>{try{return diffNow()===1||xpInfo().L<=5}catch(e){return true}};
const qqEraName=k=>k==="classic"?"星槎船艙":eraLabel(k);
const qqHint=()=>Math.max(0,+store.get("hintBonus",0)||0);
function qqTakeItems(k){const o={h:0,u:0};for(let i=0;i<k;i++){const h=qqHint(),u=undoLeft();if(!h&&!u)break;if(h>=u){store.set("hintBonus",h-1);o.h++}else{store.set("undoBonus",u-1);o.u++}}return o}
function qqGiveItems(o){if(!o)return;if(o.h)store.set("hintBonus",qqHint()+o.h);if(o.u)store.set("undoBonus",undoLeft()+o.u)}
const qqItemsTxt=o=>o?[o.h?o.h+" 顆提示棋":"",o.u?o.u+" 張悔棋符":""].filter(Boolean).join("、"):"";
const qqItemsN=()=>qqHint()+undoLeft();
const qqRnd=A=>A[Math.floor(Math.random()*A.length)];
const qqDaysLeft=t=>Math.max(1,Math.ceil((t-Date.now())/QQ_DAY));

/* ---------- 說書人的考問：題目都出自 App 裡的棋史卡（07d-garden.js HIST）；c＝棋史卡裡引的書，出處寫「棋史卡・〇朝〈卡名〉」 ---------- */
const QQ_TELLER={
  classic:[{q:"「寶應象戲」是哪一朝的象戲？",o:["唐朝","秦朝","清朝"],w:"棋史卡說：唐朝有「寶應象戲」。"},
    {q:"大約到了哪一朝，象棋才有了河界和炮，跟今天的樣子差不多？",o:["宋朝","漢朝","三國"],w:"大約到了宋朝，才有了河界和炮。"},
    {q:"寫過《象經》的是哪一位？",o:["北周武帝","曹操","謝安"],w:"北周武帝寫過《象經》。"},
    {q:"明清兩代的棋譜裡，到今天還有人在讀的是哪一部？",o:["《橘中秘》","《史記》","《世說新語》"],w:"明清兩代的棋譜，像《橘中秘》、《梅花譜》，到今天還有人在讀。"}],
  qin:[{q:"秦朝和更早的戰國時代，流行的是哪一種棋？",o:["六博","今天的象棋","寶應象戲"],w:"那時還沒有今天的象棋，流行的是「六博」。"},
    {q:"下六博，兩人對坐，各有幾枚棋子？",o:["六枚","十六枚","三十二枚"],w:"兩人對坐，各有六枚棋子。"},
    {q:"下六博，靠什麼決定棋子怎麼走？",o:["擲博箸","抽籤","看天上的星"],w:"擲博箸決定怎麼走。"},
    {q:"《楚辭．招魂》寫「菎蔽象棋」，這裡的「象棋」指的是什麼？",o:["象牙做的博棋","今天的象棋","大象拉的戰車"],w:"指的是象牙做的博棋，不是今天的象棋。",c:"《楚辭．招魂》"}],
  han:[{q:"「楚河漢界」的典故，來自哪兩個人的相爭？",o:["項羽和劉邦","曹操和劉備","周武帝和王褒"],w:"典故來自秦朝滅亡後的楚漢相爭。",c:"《史記．項羽本紀》"},
    {q:"項羽和劉邦約定中分天下，用哪一條水當界線？",o:["鴻溝","長江","運河"],w:"「中分天下，割鴻溝以西者為漢，鴻溝而東者為楚」。",c:"《史記．項羽本紀》"},
    {q:"照《史記》的約定，鴻溝以西歸誰？",o:["漢","楚","秦"],w:"「割鴻溝以西者為漢，鴻溝而東者為楚」。",c:"《史記．項羽本紀》"},
    {q:"漢朝人最愛玩的是哪一種棋？",o:["六博","今天的象棋","七國象戲"],w:"漢朝人還沒下今天的象棋，他們愛玩的是六博。"}],
  sanguo:[{q:"三國時代，今天這種象棋出現了嗎？",o:["還沒有","已經很流行","只有皇帝能下"],w:"還沒有。三國時人們玩的是六博這一類博戲；象棋的炮這些棋子，要到宋朝前後才有，今天這種象棋大約也在那時定型。"},
    {q:"《韓非子》說玩六博「貴梟」，「梟」是什麼？",o:["六博裡最重要的一枚棋子","一種鳥做的獎品","棋盤中間的河"],w:"《韓非子》說「博貴梟，勝者必殺梟」，可見梟是六博裡最要緊的棋子。六博完整的下法，學者到今天還在拼湊。",c:"《韓非子．外儲說左下》"},
    {q:"六博、象戲、今天的象棋，哪一個最早出現？",o:["六博","象戲","今天的象棋"],w:"最早的是六博（戰國就有），接著是南北朝北周的象戲（《象經》），今天的象棋大約到宋朝才定型。"}],
  weijin:[{q:"魏晉時代，今天的象棋有「炮」嗎？",o:["還沒有象棋，也沒有炮","有炮","有炮也有楚河漢界"],w:"魏晉時還沒有今天的象棋；炮大約到宋朝前後才加進來。"},
    {q:"北周武帝親自寫成的象戲專書《象經》，是魏晉之後哪個時代？",o:["南北朝","秦朝","三國"],w:"南北朝的北周武帝在天和四年（569 年）寫成《象經》，是史書明確記載的第一部象戲專書。",c:"《周書．武帝紀》"},
    {q:"漢朝的吾丘壽王，因為擅長哪一種棋戲被召進宮？",o:["格五（塞戲）","今天的象棋","寶應象戲"],w:"《漢書》說吾丘壽王「以善格五召待詔」；格五又叫塞戲，是漢魏時流行的走棋遊戲。",c:"《漢書．吾丘壽王傳》"}],
  nanbei:[{q:"北周武帝寫成了哪一部棋經？",o:["《象經》","《橘中秘》","《梅花譜》"],w:"北周武帝寫成《象經》，召集百官來聽他講解。",c:"《周書．武帝紀》"},
    {q:"周武帝寫成《象經》，是在哪一年？",o:["569 年","1570 年","1632 年"],w:"天和四年（569 年），北周武帝寫成《象經》。",c:"《周書．武帝紀》"},
    {q:"從王褒的〈象經序〉看，《象經》講究的是什麼？",o:["天文、陰陽、時令","當頭炮和屏風馬","河界和炮"],w:"它講究天文、陰陽、時令，跟今天的象棋差很多。",c:"王褒〈象經序〉"}],
  sui:[{q:"隋朝大約有多長？",o:["三十多年","三百多年","一千年"],w:"隋朝很短，只有三十多年。"},
    {q:"唐朝人修成的哪一部史書，著錄了周武帝的《象經》和幾種注本？",o:["《隋書．經籍志》","《史記》","《事林廣記》"],w:"唐朝人修成的《隋書．經籍志》，著錄了周武帝的《象經》和幾種注本。",c:"《隋書．經籍志》"},
    {q:"隋朝有沒有留下象戲的棋譜？",o:["沒有","有，叫《梅花譜》","有，叫《橘中秘》"],w:"隋朝沒有留下象戲的棋譜。"}],
  tang:[{q:"〈岑順〉這篇小說，收在誰的《玄怪錄》裡？",o:["牛僧孺","司馬光","王再越"],w:"唐朝牛僧孺的小說集《玄怪錄》裡有一篇〈岑順〉。",c:"《玄怪錄．岑順》"},
    {q:"〈岑順〉這篇小說寫到的棋子裡，沒有提到哪一種？",o:["炮","馬","車"],w:"篇中寫到將、馬、車、卒，沒有提到炮。單憑一篇小說，還拼不出唐朝象戲完整的下法。",c:"《玄怪錄．岑順》"},
    {q:"岑順醒來，在屋下挖出了什麼？",o:["一座古墓，擺著金銅做的象戲","一箱棋譜","一塊刻著字的石碑"],w:"他挖出一座古墓，裡面擺著一副金銅做的象戲。",c:"《玄怪錄．岑順》"}],
  wudai:[{q:"大約從唐朝後期到北宋，象戲加進了哪一種新棋子？",o:["砲","馬","車"],w:"象戲一點一點改變，加進了「砲」等新的棋子。"},
    {q:"炮是哪一年、誰加進象棋的？",o:["學者到今天還沒有定論","北周武帝","曹操"],w:"哪一年、誰改的，學者到今天還沒有定論。"},
    {q:"五代十國留下來的象棋記載，多還是少？",o:["很少","很多","有整套棋譜"],w:"五代十國戰亂不斷，留下來的象棋記載很少。"}],
  song:[{q:"北宋司馬光設計過哪一種象戲？",o:["《七國象戲》","寶應象戲","《象經》"],w:"司馬光設計過《七國象戲》，是書齋裡的新玩法。"},
    {q:"司馬光的《七國象戲》，要幾個人一起下？",o:["七個人","兩個人","四個人"],w:"讓七個人各帶一國兵馬一起下。"},
    {q:"南宋陳元靚編的哪一部書，傳下來的刻本裡有河界、也有炮的象棋圖？",o:["《事林廣記》","《玄怪錄》","《世說新語》"],w:"陳元靚編的《事林廣記》，今天看得到的多是元朝刻本，裡面的象棋圖已經有河界、也有炮。",c:"《事林廣記》"}],
  yuan:[{q:"今天看得到最早的《事林廣記》，大多是哪一朝刻印的？",o:["元朝","唐朝","秦朝"],w:"最早的版本大多是元朝刻印的。",c:"《事林廣記》"},
    {q:"《事林廣記》是誰編的？",o:["陳元靚","徐芝","朱晉楨"],w:"南宋陳元靚編的《事林廣記》。",c:"《事林廣記》"},
    {q:"《事林廣記》裡的象棋圖，是靠什麼才留下來的？",o:["刻本","石碑","口耳相傳"],w:"書裡的象棋圖，就是靠這些刻本才留了下來。"}],
  ming:[{q:"《適情雅趣》和《橘中秘》，是哪一朝的象棋古譜？",o:["明朝","秦朝","三國"],w:"兩部都是明朝的重要古譜：《適情雅趣》1570 年，《橘中秘》1632 年。"},
    {q:"徐芝編的《適情雅趣》，收了大約多少局殘局？",o:["五百多局","五十多局","五千多局"],w:"《適情雅趣》（1570 年）收了五百多局殘局。",c:"《適情雅趣》"},
    {q:"朱晉楨的《橘中秘》成書於哪一年？",o:["1632 年","1570 年","569 年"],w:"朱晉楨的《橘中秘》成書於 1632 年；1570 年是《適情雅趣》。",c:"《橘中秘》"},
    {q:"《橘中秘》講的是什麼？",o:["開局和殺法","茶藝","六博"],w:"《橘中秘》講開局和殺法，到今天還是學棋的人愛讀的書。",c:"《橘中秘》"}],
  qing:[{q:"清初王再越的《梅花譜》，專講用什麼對付當頭炮？",o:["屏風馬","單提馬","七國象戲"],w:"《梅花譜》專講屏風馬怎麼對付當頭炮。",c:"《梅花譜》"},
    {q:"《梅花譜》的作者是誰？",o:["王再越","張喬棟","徐芝"],w:"清初王再越的《梅花譜》。",c:"《梅花譜》"},
    {q:"清朝中期張喬棟編的是哪一部譜？",o:["《竹香齋象戲譜》","《適情雅趣》","《橘中秘》"],w:"張喬棟編的《竹香齋象戲譜》收了許多精巧的殘局。",c:"《竹香齋象戲譜》"}]};
const qqTellerSrc=(era,x)=>{const H=typeof HIST!=="undefined"&&HIST[era];return`出處：棋史卡・${eraLabel(era)}〈${H?H.t:""}〉${x&&x.c?"（引"+x.c+"）":""}`};

/* ---------- 挑事件（同步；不觸發回 null） ---------- */
function qqEraOf(L,to){const mid=(L||[]).slice(1,-1).filter(k=>k&&k!=="finale");return mid.length?qqRnd(mid):to}
function qqPenPick(di){const P=store.get("evPawn",null),H=store.get("evHeld",null),W=[],St=qqStash(),sT=St&&St.ev.t;
  if(!P&&sT!=="block")W.push(["block",18]);
  if(!H&&sT!=="pirate"&&di>=1){const nR=qqRelicList().length;if(di>=2&&nR>=3)W.push(["pirate",di>=3?12:6,1]);else if(qqItemsN()>0)W.push(["pirate",6,0])}
  return qqWeighted(W)}
function qqRewPick(nb){const W=[["teller",18]];if(QQ_POOL&&QQ_POOL.some(x=>x.g))W.push(["bottle",14]);if(nb)W.push(["invite",18]);return qqWeighted(W)}
function qqWeighted(W){if(!W.length)return null;let r=Math.random()*W.reduce((a,x)=>a+x[1],0);for(const x of W){r-=x[1];if(r<=0)return{t:x[0],relic:!!x[2]}}const x=W[W.length-1];return{t:x[0],relic:!!x[2]}}
function qqPick(c){const F=window.QQ_FORCE||null;if(!c.to||c.to==="finale"||c.from==="finale")return null;
  if(!F&&c.src==="sail"&&(shipDockList()||[]).length<=3)return null;   /* 第一次起航（船艙 → 家鄉的下一站）不觸發 */
  const L=qqLog(),safe=L.safe>0;if(safe)L.safe--;
  const no=()=>{L.dry++;qqLogSet(L);return null};
  if(!F){if(L.cool){L.cool=0;return no()}if(L.n>=3)return no();if(L.dry<5&&Math.random()>=(QQ_RATE[c.src]||.35))return no()}
  const force=!F&&L.dry>=5,nb=qqNewbie(),di=qqDi(),era=qqEraOf(c.L,c.to);let ev=null;
  if(F)ev=F==="pirate"?{t:"pirate",relic:di>=2&&qqRelicList().length>=3}:{t:F,relic:false};
  else if(!L.first)ev={t:"teller"};
  else{if(!force&&!nb&&!safe&&L.pn<1&&Math.random()<QQ_SHARE[di])ev=qqPenPick(di);if(!ev)ev=qqRewPick(nb)}
  if(!ev)return no();
  if(ev.t==="bottle"&&!(QQ_POOL&&QQ_POOL.some(x=>x.g)))ev={t:"teller"};
  if(ev.t==="block"&&nb)ev.t="invite";
  ev.first=!L.first;ev.era=era;ev.id=Date.now().toString(36);
  L.n++;if(QQ_PEN.has(ev.t))L.pn++;L.cool=1;L.dry=0;if(!L.first)L.first=Date.now();L.tot=(L.tot|0)+1;qqLogSet(L);return ev}

/* ---------- 入口（qianqiu 的 end 呼叫）：回 true＝事件接手，done 由事件結束時呼叫 ---------- */
function qqEvent(c,done){let ev=null;try{qqSettle(true);ev=qqPick(c)}catch(e){console.warn(e);return false}if(!ev)return false;return qqRun({...c,done},ev)}
/* 跑一件事件（穿梭途中觸發，或從囊中拿出來：c.stash） */
function qqRun(c,ev){const C=QQ_CUR={...c,ev,live:true,res:null,watch:null};const ov=c.ov;
  try{const I=ov.querySelectorAll(".qqi"),i=Math.max(0,c.L.indexOf(ev.era));I.forEach((x,k)=>x.classList.toggle("on",k===i));
    const nE=ov.querySelector("#qqN"),sE=ov.querySelector("#qqS");if(nE)nE.textContent=shipShort(ev.era);if(sE)sE.textContent="🌀 雲河上遇到怪事";
    const cap=ov.querySelector(".tcap span");if(cap&&!c.stash)cap.textContent=`${shipShort(c.from)} → ${shipShort(c.to)}・途經${shipShort(ev.era)}`}catch(e){}
  ov.classList.add("qqhold");ov.onclick=null;
  C.watch=()=>{if(QQ_CUR!==C||!C.live||C.board)return;C.live=false;removeEventListener("hashchange",C.watch);try{ov.remove()}catch(e){}};addEventListener("hashchange",C.watch);
  vibrate([10,30,10]);
  try{({teller:qqTeller,block:qqBlock,invite:qqBlock,pirate:qqPirate,bottle:qqBottle}[ev.t]||qqClose)(C)}catch(e){console.warn(e);qqClose(C)}
  return true}
/* 事件卡：誰（立繪或印）、說什麼、賭注、按鈕 */
function qqCard(C,o){const ov=C.ov;let c=ov.querySelector(".qqc");if(!c){const w=document.createElement("div");w.className="qqcw";c=document.createElement("div");c.className="qqc";w.append(c);ov.append(w)}
  c.innerHTML=`<div class="qw">${o.img?`<img src="${o.img}" alt="" onerror="this.outerHTML='<span class=qbg>${esc(o.badge||"🌀")}</span>'">`:`<span class="qbg">${esc(o.badge||"🌀")}</span>`}<div><small>${esc(o.tag||"🌀 雲河怪事・"+shipShort(C.ev.era))}</small><h3>${esc(o.title||"")}</h3>${o.who?`<span class="muted">${esc(o.who)}</span>`:""}</div></div>
    ${(o.say||[]).map(s=>`<p class="qs">${esc(s)}</p>`).join("")}${o.html||""}
    ${o.stakes&&o.stakes.length?`<div class="qst">${o.stakes.map(([k,t])=>`<div><b>${esc(k)}</b>　${esc(t)}</div>`).join("")}</div>`:""}
    ${o.foot?`<p class="muted qf">${esc(o.foot)}</p>`:""}<div class="qb">${(o.btns||[]).map(([l,f,g,dis],i)=>`<button class="btn${g?" ghost":""}" data-qb="${i}"${dis?" disabled":""}>${esc(l)}</button>`).join("")}</div>`;
  c.scrollTop=0;c.querySelectorAll("[data-qb]").forEach(b=>b.onclick=e=>{e.stopPropagation();const x=o.btns[+b.dataset.qb];if(!x||x[3])return;vibrate(5);if(C.stash&&!x[4])qqStashTake(C);x[1]()});return c}
/* 🎒 先收進囊中（事件的第一張卡用）：btns 的第 5 格＝按了不算「處理了」 */
function qqStashBtn(C){if(C.stash)return["🎒 先放回囊中",()=>qqStashKeep(C),true,false,1];
  const S=qqStash();return S?["🎒 囊中已經放著一件，這件不能再收",()=>{},true,true]:["🎒 先收進囊中（12 小時內再處理）",()=>qqStashPut(C),true]}
function qqStashPut(C){if(qqStash())return;const now=Date.now(),ev={...C.ev};store.set("evStash",{ev,to:C.to,d:localDay(),at:now,due:now+QQ_STASH_MS});
  toast("🎒 收進囊中了：12 小時內，從行囊或星槎頁右上角的 🎒 打開");qqClose(C);setTimeout(qqStashBadge,700)}
function qqStashKeep(C){qqClose(C);setTimeout(qqStashBadge,700)}
/* 囊中的事件拿出來、做了選擇：從囊中拿掉，下一次穿梭不觸發 */
function qqStashTake(C){if(C.stashTaken)return;C.stashTaken=1;store.set("evStash",null);const L=qqLog();L.cool=1;L.dry=0;qqLogSet(L)}
const QQ_STASH_NM={teller:"說書人的考問",block:"攔路棋客",invite:"攔路棋客・邀你下一段",pirate:"雲河棋寇",bottle:"漂流瓶裡的殘譜"};
function qqLeftTxt(due,short){const m=Math.max(0,Math.ceil((due-Date.now())/6e4)),h=Math.floor(m/60),mm=m%60;return short?h+":"+String(mm).padStart(2,"0"):h?`${h} 小時 ${mm} 分`:`${mm} 分鐘`}
/* 從囊中打開：補一張停在那一朝的穿梭畫面，事件照原樣跑；做完回到打開的那一頁 */
function qqStashOpen(){qqSettle(true);const S=qqStash();if(!S){qqStashBadge();return toast("🎒 囊中沒有雲河怪事了")}if((QQ_CUR&&QQ_CUR.live)||document.querySelector(".travel,.walkc"))return;
  const t=S.ev.t;if((t==="block"&&store.get("evPawn",null))||(t==="pirate"&&store.get("evHeld",null))){store.set("evStash",null);qqStashBadge();return toast(t==="block"?"🎒 那位棋客等不及，先走了。":"🎒 那艘寇船等不及，先划走了。")}
  try{if(typeof closeSheet==="function")closeSheet()}catch(e){}
  const era=S.ev.era,ov=document.createElement("div");ov.className="travel qq qqhold";
  ov.innerHTML=`<div class="qqs"><div class="qqi on" style="background-image:${QQ_IMG(era)}"></div></div><div class="qqv"></div><div class="qqt"><b id="qqN"></b><span id="qqS"></span></div><div class="tcap"><b>🎒 囊中的雲河怪事</b><span>途經${esc(shipShort(era))}・還有 ${esc(qqLeftTxt(S.due))}</span></div>`;
  document.body.append(ov);const b=document.getElementById("qqBadge");if(b)b.remove();
  qqRun({L:[era],from:era,to:S.to,src:"stash",ov,h0:location.hash,done:null,stash:true},S.ev)}
/* 星槎頁（#/adventure、#/ship/bag、#/ship/sail）右上角的 🎒：顯示剩餘時間 */
function qqStashBadge(){let b=document.getElementById("qqBadge");const R=store.get("evStash",null);if(R&&R.due&&Date.now()>=R.due)qqSettle(true);
  const S=qqStash(),on=!!S&&/^#\/(adventure|ship\/(bag|sail))\/?$/.test(location.hash)&&!(QQ_CUR&&QQ_CUR.live)&&!document.querySelector(".travel");
  if(!on){if(b)b.remove();return}
  if(!b){b=document.createElement("button");b.id="qqBadge";b.type="button";b.setAttribute("aria-label","囊中的雲河怪事");
    b.style.cssText="position:fixed;right:12px;top:calc(env(safe-area-inset-top,0px) + 60px);z-index:40;display:flex;align-items:center;gap:4px;padding:5px 10px 5px 8px;border-radius:999px;border:1.5px solid #b3241b;background:rgba(250,244,232,.94);color:#2a2018;font:700 13px/1.2 var(--serif,serif);box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer";
    b.onclick=e=>{e.stopPropagation();vibrate(5);qqStashOpen()};document.body.append(b)}
  b.innerHTML=`<span style="font-size:17px">🎒</span><span>${esc(qqLeftTxt(S.due,true))}</span>`;b.title=`囊中：${QQ_STASH_NM[S.ev.t]||"雲河怪事"}・還有 ${qqLeftTxt(S.due)}`}
/* 收掉卡片、接著原本的路（done） */
function qqClose(C){C=C||QQ_CUR;if(!C)return;C.live=false;removeEventListener("hashchange",C.watch);const ov=C.ov;try{ov.classList.add("out");setTimeout(()=>ov.remove(),350)}catch(e){}
  if(QQ_CUR===C)QQ_CUR=null;if(C.done&&location.hash===C.h0)C.done()}
/* 要棋盤的事件：千秋石枰先把「人到了那一朝」存好（App 中途關掉也不會卡在半空中），收掉穿梭畫面，換到事件的頁面 */
function qqBoard(C,hash){C.board=hash;removeEventListener("hashchange",C.watch);try{C.ov.remove()}catch(e){}
  if(C.src==="park"){try{if(typeof shipEra==="function")shipEra(C.to);else store.set("era",C.to);saveNow(true)}catch(e){}}
  C.watch=()=>{if(QQ_CUR!==C||!C.live)return;if(navKey(location.hash)===navKey(C.board))return;qqAbandon(C)};
  addEventListener("hashchange",C.watch);location.hash=hash}
/* 事件頁做完：回到出發的那一頁，接著原本的路 */
function qqBack(){const C=QQ_CUR;if(!C)return goUp("#/adventure");C.live=false;removeEventListener("hashchange",C.watch);QQ_CUR=null;store.set("jRunE",null);goUp(C.h0,()=>{if(C.done)C.done()})}
/* 半路離開事件頁（上一頁、回首頁）：就當這件事沒發生，船照原路走 */
function qqAbandon(C){C.live=false;removeEventListener("hashchange",C.watch);if(QQ_CUR===C)QQ_CUR=null;store.set("jRunE",null);store.set("cjRunE",null);
  setTimeout(()=>{toast("🌀 這件怪事先擱著，星槎照原路走。");if(C.done&&navKey(location.hash)===navKey(C.h0))C.done()},420)}
const qqToLbl=C=>C.stash?"🎒 了結了，回到旅途":"⛵ 繼續開往"+shipShort(C.to);

/* ================= ① 說書人的考問 ================= */
function qqTeller(C){const ev=C.ev,era=QQ_TELLER[ev.era]?ev.era:"classic",di=qqDi(),n=di<=1?1:di===2?2:3,L=qqLog(),seen=new Set(L.tq||[]);
  const bank=QQ_TELLER[era].map((x,i)=>({...x,id:era+":"+i})),fresh=bank.filter(x=>!seen.has(x.id)),pool=(fresh.length>=n?fresh:bank).slice().sort(()=>Math.random()-.5).slice(0,Math.min(n,bank.length));
  const T={era,qs:pool,i:0,ok:0};C.res=T;
  const say=[...(ev.first?["說書人：「雲河上偶爾會遇到怪事——有好事，也有麻煩。今天先遇上一件好事。」"]:[]),`說書人敲一下醒木：「方才經過的是${qqEraName(era)}——考你${pool.length>1?" "+pool.length+" 題":"一題"}，答對了賞！」`];
  qqCard(C,{img:"data/actors/teller.webp",badge:"說",title:"說書人的考問",who:"星槎船頭的說書人",say,
    stakes:[["答對",`每題修為 +15${pool.length>=3?"；3 題全對再送 1 顆提示棋":""}`],["答錯","罰你聽一段"+qqEraName(era)+"的棋史（聽完也有修為 +5）"],["不想答","什麼都不扣"]],
    btns:[["📜 考吧",()=>qqTellerAsk(C)],qqStashBtn(C),["改天再聽",()=>{qqCard(C,{img:"data/actors/teller.webp",badge:"說",title:"說書人的考問",say:["說書人笑了笑：「也好，改天再說。」"],btns:[[qqToLbl(C),()=>qqClose(C)]]})},true]]})}
function qqTellerAsk(C){const T=C.res,x=T.qs[T.i];if(!x)return qqTellerEnd(C);const L=qqLog();L.tq=[...(L.tq||[]).filter(z=>z!==x.id),x.id].slice(-40);qqLogSet(L);
  const opts=x.o.map((t,k)=>({t,k})).sort(()=>Math.random()-.5);
  const c=qqCard(C,{img:"data/actors/teller.webp",badge:"說",title:`第 ${T.i+1}／${T.qs.length} 題`,who:"說書人的考問",html:`<p class="qq-q">${esc(x.q)}</p><div class="qq-o">${opts.map(o=>`<button class="btn ghost" data-k="${o.k}">${esc(o.t)}</button>`).join("")}</div><div class="qq-r"></div>`,btns:[]});
  c.querySelectorAll("[data-k]").forEach(b=>b.onclick=e=>{e.stopPropagation();if(c.dataset.done)return;c.dataset.done=1;const hit=+b.dataset.k===0;vibrate(hit?15:[20,40,20]);if(hit)T.ok++;
    c.querySelectorAll("[data-k]").forEach(z=>{z.disabled=true;if(+z.dataset.k===0)z.classList.remove("ghost")});
    if(hit)addXP(15,"說書人的考問","qq:t:"+C.ev.id+":"+T.i);
    c.querySelector(".qq-r").innerHTML=`<p class="qs">${hit?"說書人一拍醒木：「答得好！」":"說書人搖搖頭：「不對，不對。」"}${esc(x.w)}</p><p class="muted qf">${esc(qqTellerSrc(T.era,x))}</p>`;
    const nb=document.createElement("button");nb.className="btn";nb.textContent=T.i+1<T.qs.length?"下一題":"聽說書人怎麼說";nb.onclick=e2=>{e2.stopPropagation();vibrate(5);T.i++;qqTellerAsk(C)};c.querySelector(".qb").append(nb)})}
function qqTellerEnd(C){const T=C.res,all=T.ok===T.qs.length,gift=all&&T.qs.length>=3,H=typeof HIST!=="undefined"&&HIST[T.era];
  if(gift){store.set("hintBonus",qqHint()+1);vibrate([15,30,15])}
  const go=()=>qqCard(C,{img:"data/actors/teller.webp",badge:"說",title:all?"全答對了！":"說書人的考問",say:[gift?`說書人：「三題全對！賞你 1 顆提示棋。」`:all?`說書人：「答得好！修為照賞。」`:`說書人：「${T.ok?"答對 "+T.ok+" 題，修為照賞。":""}下回經過，再考你。」`],
    stakes:[["這次得到",`修為 +${T.ok*15+(all?0:5)}${gift?"・提示棋 +1":""}`]],btns:[[qqToLbl(C),()=>qqClose(C)]]});
  if(all||!H)return go();
  qqCard(C,{img:"data/actors/teller.webp",badge:"說",title:`罰你聽一段：${H.t}`,who:"說書人",say:["說書人：「答錯了？罰你聽我說一段！」"],html:`<p class="qs qq-hist">${esc(H.x)}</p><p class="muted qf">棋史卡・${esc(eraLabel(T.era))}〈${esc(H.t)}〉</p>`,
    btns:[["聽完了",()=>{addXP(5,"聽說書","qq:th:"+C.ev.id);go()}]]})}

/* ================= ② 攔路棋客（block；聽書＝邀請版 invite） ================= */
function qqBlockWho(era){const L=qqLog(),now=Date.now(),W=(typeof NPC_BOND!=="undefined"?PARK_NPC.filter(n=>n.era===era&&NPC_BOND[n.id]):[]).filter(n=>now-(L.npc[n.id]||0)>=7*QQ_DAY);
  if(W.length){const n=qqRnd(W);return{id:n.id,n,nm:n.name,img:`data/npc/${n.id}.webp`,say:n.say,winL:n.lose,loseL:n.win}}
  const A=ARENA[era]||ARENA.classic;return{id:"m:"+era,nm:`${A.name}的門生`,badge:A.seal,say:"家師說，雲河上的星槎載著會下棋的人。在下奉命來試一試。",winL:"在下回去，會照實告訴家師：星槎上有高手。",loseL:"承讓了。"}}
function qqBlockRule(C){const nb=C.ev.t==="invite",di=qqDi(),h=qqHint(),u=undoLeft(),ln=lingN();
  const toll=nb?null:di<=2?(h||u?{k:"item",txt:h>=u?"1 顆提示棋":"1 張悔棋符"}:{k:"item",txt:"1 顆提示棋或 1 張悔棋符",no:true}):di===3?{k:"ling",n:1,txt:"1 枚將令",no:ln<1}:{k:"ling",n:2,txt:"2 枚將令",no:ln<2};
  return{nb,di,toll,lose:nb?"none":di<=2?"item1":di===3?"item2":"relic"}}
async function qqBlock(C){const ev=C.ev,era=ev.era,pe=typeof eraLocked==="function"&&eraLocked(era)?C.to:era,who=qqBlockWho(era),R=qqBlockRule(C),di=R.di,me=Math.random()<.5?"r":"b",n=QQ_STEPS[di],ai=QQ_AI[di];
  const pool=QQ_POOL||await qqPool();if(!pool||!pool.length){toast("局面池載入失敗，這回先不攔了");return qqClose(C)}if(!C.live)return;
  const pos=qqRnd(pool),xp=Math.round(30*QQ_MULT[di]),bond=!!(who.n&&typeof bondOf==="function"&&bondOf(who.n.id).n<3);
  let rel=null;if(R.lose==="relic"){rel=await qqRelicPick();if(!C.live)return}
  const ib=R.lose==="item1"?"1 件寶物（提示棋或悔棋符，挑你比較多的那種）":"2 件寶物（提示棋或悔棋符，挑你比較多的那種）",place=`到${eraLabel(pe)}的園子贏${who.n?"她一盤":"一盤棋"}`;
  const loseTxt=R.lose==="none"?"沒有懲罰，還送你修為 +5":R.lose==="relic"&&rel?`她借走珍品〈${rel.it.name}〉——${place}就還；3 天後自動歸還`:qqItemsN()?`押走 ${R.lose==="relic"?"2 件寶物（你沒有珍品可借）":ib}——${place}就還；7 天後寄回驛站`:"你身上沒有寶物可押，輸了也不扣東西";
  if(R.lose==="relic"&&!rel)R.lose="item2";
  C.res={who,R,me,n,ai,pos,xp,bond,rel,pe};const L=qqLog();if(who.n){L.npc[who.n.id]=Date.now();qqLogSet(L)}
  const say=who.n?[`${who.nm}站在岸邊，朝星槎招手：「船先別開！這盤棋我下到一半，對手讓人叫走了——你來接他那一方，陪我下完這一段。」`,`${who.nm}：「${who.say}」`]
    :[`岸邊站著一位年輕棋手，衣襟上繡著一個「${who.badge}」字：「${who.say}這盤棋下到一半，請接手下完這一段。」`];
  const stakes=[["⚔ 怎麼下",`紅黑勢力相當的中局，你執${me==="r"?"紅":"黑"}：撐過 ${n} 步，不被將死、車一輛都不能丟（對手：第 ${ai} 級電腦）`],
    ["贏了",`修為 +${xp}${bond?"・她的羈絆 +1":""}・隨機 1 件寶物`],["輸了",loseTxt]];
  if(R.toll)stakes.push(["🪙 過路費",R.toll.no?`${R.toll.txt}（你現在付不起）`:R.toll.txt]);
  stakes.push(["🏃 "+(R.nb?"下次再說":"逃跑"),R.nb?"不下也沒關係，什麼都不扣":di===4?"擲一次「順風」：一半的機會逃得掉；逃不掉就只能應戰或付過路費（身上沒將令也沒寶物，一定逃得掉）":"一定逃得掉，只是錯過獎勵；之後到"+eraLabel(pe)+"的園子找"+(who.n?"她":"人")+"，還能補下"]);
  const btns=[["⚔ 應戰",()=>qqBlockGo(C)]];
  if(R.toll)btns.push(["🪙 付過路費（"+R.toll.txt+"）",()=>qqBlockToll(C),true,!!R.toll.no]);
  btns.push([R.nb?"下次再說":"🏃 逃跑",()=>qqBlockRun(C),true]);btns.push(qqStashBtn(C));
  qqCard(C,{img:who.img,badge:who.badge,title:R.nb?"攔路棋客・邀你下一段":"攔路棋客",who:who.nm+"・"+eraLabel(era),say,stakes,btns})}
function qqBlockToll(C){const R=C.res.R,w=C.res.who;if(R.toll.k==="item")qqTakeItems(1);else lingAdd(-R.toll.n);
  qqCard(C,{img:w.img,badge:w.badge,title:"付了過路費",who:w.nm,say:[`${w.nm}：「好，過路費收下了。下回可別想這樣打發我。」`],stakes:[["付出",R.toll.k==="item"?R.toll.txt:R.toll.txt]],btns:[[qqToLbl(C),()=>qqClose(C)]]})}
function qqBlockRun(C){const{R,who:w,pe}=C.res,era=C.ev.era;
  if(R.nb)return qqCard(C,{img:w.img,badge:w.badge,title:"下次再說",who:w.nm,say:[`${w.nm}：「好，那下次經過${qqEraName(era)}，再陪我下。」`],btns:[[qqToLbl(C),()=>qqClose(C)]]});
  if(R.di===4&&!C.res.rolled){C.res.rolled=1;const free=!lingN()&&!qqItemsN();if(!free&&Math.random()<.5){vibrate([20,40,20]);
      const btns=[["⚔ 應戰",()=>qqBlockGo(C)]];if(R.toll)btns.push(["🪙 付過路費（"+R.toll.txt+"）",()=>qqBlockToll(C),true,!!R.toll.no]);
      return qqCard(C,{img:w.img,badge:w.badge,title:"逃不掉！",who:w.nm,say:["風向不對，星槎甩不開她的小船——只能應戰，或者付過路費。"],stakes:[["輸了",C.res.rel?`借走珍品〈${C.res.rel.it.name}〉，3 天後自動歸還`:"押走 2 件寶物，7 天後寄回驛站"]],btns})}}
  if(w.n){const L=qqLog();L.dare={npc:w.n.id,era:pe,at:Date.now(),xp:C.res.xp};qqLogSet(L)}
  qqCard(C,{img:w.img,badge:w.badge,title:"逃掉了",who:w.nm,say:[w.n?`${w.nm}在後面喊：「膽小鬼，我在${eraLabel(pe)}的園子等你！」`:`${w.nm}拱拱手：「下回經過，在下再來討教。」`],stakes:[["之後",w.n?`到${eraLabel(pe)}的園子會遇到她；贏了照樣有獎勵（7 天內）`:"什麼都沒扣，只是錯過獎勵"]],btns:[[qqToLbl(C),()=>qqClose(C)]]})}
function qqBlockGo(C){const{who:w,me,n,ai,pos,R}=C.res,kp=me==="r"?"R":"r",id="qq:"+C.ev.id;
  C.G={name:(R.nb?"邀你下一段・":"攔路棋客・")+w.nm,intro:"",skill:"接手一盤下到一半的棋：先求不敗",pass:`撐過 ${n} 步：不被將死、車一輛都不能丟`,star3:"",rules:{maxMistakes3:0,maxMistakes2:1},
    steps:[{t:"relay",say:`${w.nm}：「${w.say}」`,start:{fen:pos.fen,turn:pos.turn},human:me,segs:[{who:"you",name:"你",n,keep:[kp],opp:{ai},hint:`接手這盤中局，你執${me==="r"?"紅":"黑"}：撐過 ${n} 步，不被將死、車一輛都不能丟。`,fail:""}]}],
    outro:`${w.nm}：「${w.winL}」`};
  C.lv={id,name:C.G.name};jRunSet({id,k:0,miss:0,hint:false,intro:1},"jRunE");qqBoard(C,"#/qqev")}
/* 攔路輸了：押東西（聽書、新手不押，送 +5 修為） */
function qqBlockLose(C,why){if(C.res.over)return;C.res.over="lose";const{who:w,R}=C.res,era=C.res.pe||C.ev.era,ask=w.n?`想拿回去？到${eraLabel(era)}的園子贏我一盤。`:`想拿回去？到${eraLabel(era)}的園子贏一盤棋，我就還你。`;let got="",tail="";
  if(R.lose==="none"){addXP(5,"攔路棋客","qq:bl:"+C.ev.id);got="修為 +5";tail=`${w.nm}：「沒關係，下棋本來就有輸有贏。這點心意收著。」`}
  else{const L=qqLog();L.safe=3;qqLogSet(L);const now=Date.now();
    if(R.lose==="relic"&&C.res.rel&&qqOwns(C.res.rel)){const r=C.res.rel;store.set("evPawn",{npc:w.n?w.n.id:w.id,nm:w.nm,era,rid:r.it.id,rnm:r.it.name,re:r.era,at:now,due:now+3*QQ_DAY});got=`珍品〈${r.it.name}〉被借走了（3 天後自動歸還）`;tail=`${w.nm}：「${w.loseL}〈${r.it.name}〉先借我看看。${ask}」`}
    else{const o=qqTakeItems(R.lose==="item1"?1:2);if(o.h||o.u){store.set("evPawn",{npc:w.n?w.n.id:w.id,nm:w.nm,era,items:o,at:now,due:now+7*QQ_DAY});got=`${qqItemsTxt(o)}被押走了（7 天後寄回驛站）`;tail=`${w.nm}：「${w.loseL}這${o.h+o.u>1?"幾樣":"樣"}東西先押在我這兒。${ask}」`}
      else{got="你身上沒有寶物，什麼都沒押";tail=`${w.nm}：「${w.loseL}」`}}}
  return{got,tail,why}}
function qqBlockWin(C){if(C.res.over)return C.res.winRes;C.res.over="win";const{who:w,xp,bond}=C.res,era=C.ev.era;addXP(xp,"攔路棋客","qq:bw:"+C.ev.id);
  const k=Math.random()<.5?"h":"u";qqGiveItems({h:k==="h"?1:0,u:k==="u"?1:0});const it=k==="h"?"提示棋 +1":"悔棋符 +1";
  if(bond&&w.n&&typeof npcBondUp==="function")setTimeout(()=>{try{npcBondUp(w.n)}catch(e){}},1400);
  else if(qqDi()>=2&&typeof relicDrop==="function")setTimeout(()=>{try{relicDrop(era,qqDi()>=3?.2:.1)}catch(e){}},1400);   /* 破陣偶爾珍品，國手以上機會加倍 */
  return C.res.winRes=`修為 +${xp}・${it}${bond?"・羈絆 +1":""}`}
/* ================= ④ 漂流瓶裡的殘譜（bottle） ================= */
const qqLossTxt=cp=>cp>=20000?"會被將死":cp>=800?"大約少一輛車":`大約少 ${Math.max(1,Math.round(cp/100))} 個兵`;
function qqBottle(C){const ev=C.ev,pool=(QQ_POOL||[]).filter(x=>x.g),pos=qqRnd(pool);if(!pos)return qqClose(C);C.res={pos};
  qqCard(C,{badge:"🍶",title:"漂流瓶裡的殘譜",who:"雲河・"+qqEraName(ev.era)+"一帶",say:["雲河上漂來一個瓶子，瓶口封著蠟。你撈起來拔開塞子，裡面是半張棋譜：","「後面三手被水泡糊了，你猜得出來嗎？」"],
    stakes:[["怎麼猜","照棋譜擺好局面，替下棋的人猜接下來的 3 手（每手三選一）"],["猜中","每手修為 +10；3 手全中，整份棋譜收進「🎒 棋童資料 → 📜 棋譜」"],["猜錯或放掉","瓶子漂走了，沒有任何損失"]],
    btns:[["🔍 猜猜看",()=>qqBottleGo(C)],qqStashBtn(C),["放它漂走",()=>qqCard(C,{badge:"🍶",title:"瓶子漂走了",say:["你把瓶子放回雲河，看著它一路漂遠。"],btns:[[qqToLbl(C),()=>qqClose(C)]]}),true]]})}
function qqBottleGo(C){const X=window.XQCore,{pos}=C.res,g=pos.g,id="qq:"+C.ev.id;let b=X.parseFen(pos.fen),turn=pos.turn;const items=[];
  for(let k=0;k<5;k++){const u=g.mv[k],[f,t]=lvSq(u);
    if(k%2===0){const j=k/2,cn=X.notate(b,f,t),cap=b[t],nb=X.make(b,f,t),chk=X.inCheck(nb,turn==="r"?"b":"r"),bad=g.opt[j].map((z,i)=>{const[a,c]=lvSq(z);return X.notate(b,a,c)+"（"+qqLossTxt(g.bad[j][i])+"）"});
      items.push({...(k?{before:[g.mv[k-1]]}:{}),ask:j===0?"下棋的人接下來走哪一手？":"對方應了一手。再下一手呢？",options:[u,...g.opt[j]].sort(()=>Math.random()-.5),answer:u,
        note:`大師走的是「${cn}」${cap?"，吃掉對方的"+(B2_CN[cap]||""):""}${chk?"，還將了一軍":""}。另外兩手 Pikafish 算下去都要吃虧：${bad.join("、")}。`})}
    b=X.make(b,f,t);turn=turn==="r"?"b":"r"}
  const ttl=`${toT(pos.red)} 對 ${toT(pos.black)}${pos.year?"（"+pos.year+"）":""}`;C.res.ttl=ttl;
  C.G={name:"漂流瓶裡的殘譜",intro:"",skill:"猜著法：替大師想下一手",pass:"猜 3 手，猜錯也能繼續",star3:"",rules:{maxMistakes3:0,maxMistakes2:1},
    steps:[{t:"guess",say:`🍶 半張棋譜：${ttl}，第 ${Math.floor(pos.ply/2)+1} 回合`,start:{fen:pos.fen,turn:pos.turn},pass:0,items}],outro:`瓶子裡的棋譜，出自特級大師對局：${ttl}。`};
  C.lv={id,name:"漂流瓶裡的殘譜"};jRunSet({id,k:0,miss:0,hint:false,intro:1},"jRunE");qqBoard(C,"#/qqev")}
function qqBottleDone(C,R){if(C.res.over)return C.res.line;C.res.over=1;const hit=Math.max(0,3-(R&&R.miss||0));if(hit)addXP(hit*10,"漂流瓶","qq:bt:"+C.ev.id);let rec=false;
  if(hit===3){try{const B=bag(),p=C.res.pos;if(!B.records.some(z=>z.id===p.id)){B.records.push({uid:"r"+Date.now().toString(36),c:"gmgames",id:p.id,name:C.res.ttl,from:`雲河漂流瓶・${qqEraName(C.ev.era)}`,at:Date.now()});bagSave(B)}rec=true}catch(e){}}
  return C.res.line=`🍶 猜中 ${hit}／3 手${hit?"・修為 +"+hit*10:""}${rec?"・棋譜收進「🎒 棋童資料 → 📜 棋譜」":hit<3?"・瓶子漂走了":""}`}

/* ---------- #/qqev：攔路棋客、漂流瓶的棋盤頁（jLevel，進度 jRunE，不佔石桌往事那一盤） ---------- */
function QqEv(v){const C=QQ_CUR;
  if(!C||!C.live||!C.G){store.set("jRunE",null);setTop("🌀 雲河怪事","#/adventure");setTabs(false);v.className="view";
    v.innerHTML=`<div class="pad"><div class="card" style="text-align:center;line-height:1.8"><div style="font-size:40px">🌀</div><p>這件雲河怪事已經過去了。<br><span class="muted">（中途離開或關掉 App，就當沒發生）</span></p><button class="btn" id="qqBk" style="width:100%">⛵ 回星槎</button></div></div>`;
    v.querySelector("#qqBk").onclick=()=>goUp("#/adventure");return{}}
  const t=C.ev.t,blk=t==="block"||t==="invite";
  jLevel(v,C.lv,{G:C.G,rk:"jRunE",icon:blk?"⚔":"🍶",back:C.h0,title:blk?`${eraLabel(C.ev.era)}・攔路棋客`:`${qqEraName(C.ev.era)}・漂流瓶`,solo:true,
    done:(stars,R)=>{if(blk)qqBlockWin(C);else qqBottleDone(C,R);return stars},
    line:()=>blk?`⚔ 撐過來了！${C.res.winRes||""}`:C.res.line||"",
    next:[qqToLbl(C)+" ›",()=>qqBack()],
    onFail:msg=>{if(QQ_CUR!==C||!C.live)return;if(blk)qqBlockLoseView(v,C,msg);else qqBack()}});
  if(blk){const bk=document.getElementById("back");if(bk)bk.onclick=()=>confirmBox("認輸，這一段算她贏？",()=>qqBlockLoseView(v,C,"你認輸了。"),"認輸")}
  return{}}
function qqBlockLoseView(v,C,msg){const r=qqBlockLose(C,msg)||C.res.loseRes||{};C.res.loseRes=r;const w=C.res.who;
  v.className="view";v.innerHTML=`<div class="pad"><div class="card" style="text-align:center;line-height:1.8">${w.img?`<img src="${w.img}" alt="" style="width:96px;height:96px;object-fit:cover;object-position:top;border-radius:50%" onerror="this.remove()">`:`<div style="font-size:40px">⚔</div>`}
    <h2 style="margin:4px 0">這一段沒撐住</h2><p class="muted">${esc(String(r.why||msg||"").replace(/這一段重來。?/,""))}</p><p style="text-align:left">${esc(r.tail||"")}</p><p class="muted" style="font-size:13px">${esc(r.got||"")}</p>
    <button class="btn" id="qqGo" style="width:100%">${esc(qqToLbl(C))} ›</button></div></div>`;
  v.querySelector("#qqGo").onclick=()=>qqBack()}

/* ================= ③ 雲河棋寇（pirate）：擋寇＝一盞茶解題頁 #/canju/q/pz，走錯 3 次算沒擋住 ================= */
function qqRelicList(){try{const M=relicsMine(),o=[];for(const e in M)for(const id of M[e]||[])o.push({e,id});return o}catch(e){return[]}}
function qqOwns(r){try{return(relicsMine()[r.era]||[]).includes(r.it.id)}catch(e){return false}}
/* 借走哪一件：優先挑還沒解開藏局的（有藏局的才挑） */
async function qqRelicPick(){try{const R=await relicsData(),M=relicsMine(),Z=relicSolved(),c=[];for(const e in M)for(const id of M[e]||[]){const it=(R[e]||[]).find(x=>x.id===id);if(it&&it.cj)c.push({era:e,it})}
  if(!c.length)return null;const un=c.filter(x=>!Z[x.it.id]);return qqRnd(un.length?un:c)}catch(e){return null}}
/* easy＝贖回（Gemini 評估 11/8，開發者核准）：比玩家現在的航行難度低一級（DIFF 的上一格 band；聽書再往下壓到 d＜3），放寬時只往簡單那邊放，確保贖得回來 */
const qqEasyBand=()=>{const i=diffNow()-2;return i>=0?DIFF[i].band:[0,2]};
async function qqPzPick(easy){const D=await cjData(),[lo0,hi0]=diffOf().band,[lo,hi]=easy?qqEasyBand():[lo0,hi0],S=cjState();
  const skip=new Set([...(typeof cjReserved==="function"?cjReserved():[]),...(typeof shipReserved==="function"?shipReserved(D):[]),...(typeof shipMoreIds==="function"?shipMoreIds():[])]);   /* 意見回饋 762：石桌續局分到的題不拿來擋寇 */
  const base=D.items.filter(P=>P.tree&&["一步定勝負","短殺","中殺"].includes(P.t)&&!skip.has(P.id));
  let c=base.filter(P=>(+P.d||0)>=lo&&(+P.d||0)<hi+1&&!S.solved[P.id]);if(c.length<3)c=base.filter(P=>(+P.d||0)>=lo-1&&(+P.d||0)<hi+(easy?1:2));if(!c.length)c=easy?base.slice().sort((a,b)=>(+a.d||0)-(+b.d||0)).slice(0,20):base;return c.length?qqRnd(c).id:null}
async function qqPirate(C){const ev=C.ev,di=qqDi();let rel=null;if(ev.relic){rel=await qqRelicPick();if(!C.live)return}
  const relic=!!rel,ln=lingN(),ni=qqItemsN(),pay=ln>=1?{k:"ling",txt:"1 枚將令"}:ni>=2?{k:"item",txt:"2 件寶物"}:null;C.res={rel,relic,pay};
  if(!relic&&!ni){if(C.stash)qqStashTake(C);toast("🏴 寇船靠過來看了看，見你兩手空空，又划走了");return qqClose(C)}
  qqCard(C,{badge:"🏴",title:"雲河棋寇",who:"黑帆寇首・雲河上",say:["一艘掛著黑帆的小船從雲霧裡靠過來，船頭的寇首抱著胳膊：","「留下一件寶貝，或者在棋盤上把它贏回去。」"],
    stakes:[["⚔ 擋寇","解 1 題殺法殘局（"+diffOf().n+"的難度）；走錯 3 次、或看了答案，就算沒擋住"],["擋住了","寇船掉下一件戰利品：你停靠過的別朝珍品（或 1 枚將令）"],
      ["沒擋住",relic?`寇首借走珍品〈${rel.it.name}〉——解開它藏著的殘局就贖回；3 天後他自己送回來`:"寇首扣走 1 件寶物（挑你比較多的那種）——回行囊再擋他一題就贖回；3 天後他自己送回來"],
      ["⛵ 全速開走",pay?"付 "+pay.txt+"換平安":"你身上沒有將令，寶物也不到 2 件，只能應戰（輸了也只是暫扣）"]],
    btns:[["⚔ 擋寇",()=>qqPirateGo(C)],[pay?`⛵ 全速開走（付 ${pay.txt}）`:"⛵ 全速開走（付不起）",()=>qqPirateRun(C),true,!pay],qqStashBtn(C)]})}
function qqPirateRun(C){const p=C.res.pay;if(!p)return;if(p.k==="ling")lingAdd(-1);else qqTakeItems(2);vibrate([10,40,10]);
  qqCard(C,{badge:"🏴",title:"甩開寇船了",say:["星槎張滿了帆。寇首在後面喊：「跑得了這回，跑不了下回！」"],stakes:[["付出",p.txt]],btns:[[qqToLbl(C),()=>qqClose(C)]]})}
async function qqPirateGo(C){let pid=null;try{pid=await qqPzPick(false)}catch(e){}if(!C.live)return;if(!pid){toast("題庫載入失敗，寇船先放你過去");return qqClose(C)}
  C.res.pid=pid;store.set("cjRunE",null);qqBoard(C,"#/canju/q/pz")}
function qqPirateLose(C){if(C.res.over)return C.res.loseTxt;C.res.over="lose";const L=qqLog();L.safe=3;qqLogSet(L);const now=Date.now(),r=C.res.rel;
  if(r&&qqOwns(r)){store.set("evHeld",{rid:r.it.id,rnm:r.it.name,re:r.era,at:now,due:now+3*QQ_DAY});return C.res.loseTxt=`寇首把〈${r.it.name}〉往懷裡一揣：「想要回去？這東西裡藏著一局棋，你解得開，我就還你。」（珍品冊那一格蓋上「🏴 寇船扣著」；3 天後他自己送回來）`}
  const o=qqTakeItems(1);if(o.h||o.u){store.set("evHeld",{items:o,at:now,due:now+3*QQ_DAY});return C.res.loseTxt=`寇首把 ${qqItemsTxt(o)} 往懷裡一揣：「想要回去？回船上再擋我一局。」（星槎頁「🎒 行囊 → 🌀 雲河怪事」可以贖回；3 天後他自己送回來）`}
  return C.res.loseTxt="寇首翻遍了你的行囊，什麼也沒找到，罵了一聲就走了。"}
async function qqPirateWin(C){if(C.res.over)return;C.res.over="win";const here=C.ev.era,E=(typeof shipDocked==="function"?shipDocked():[]).filter(e=>e!==here&&e!=="classic");let got=false;
  for(const e of E.slice().sort(()=>Math.random()-.5)){try{store.set("relicAt",0);if(await relicDrop(e,2)){got=true;break}}catch(x){}}
  if(!got){lingAdd(1);toast("🏴 寇船上掉下 1 枚將令（點將台可以換東西）")}}
/* 一盞茶解題頁的設定（07e-garden2.js cjXMode 的 q/…）：pz＝擋寇，redeem＝贖回被扣的寶物 */
function qqXM(tok){const C=QQ_CUR,H=store.get("evHeld",null);
  if(tok==="redeem"){const back=()=>"#/ship/bag";if(!H||!H.items)return{err:"寇船上沒有扣著你的寶物了。",back};if(!H.pid)return{err:"從星槎頁「🎒 行囊 → 🌀 雲河怪事」打開。",back};let fin=false;
    return{id:H.pid,rk:"cjRunE",back,top:"🏴 贖回寶物",icon:"🏴",ans:"看答案就贖不回來（之後可以再擋一次），確定？",
      head:P=>`<b>🏴 贖回被扣的 ${esc(qqItemsTxt(H.items))}</b>・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span><div class="shp-psay">寇首：「解得開這局，東西就還你。」</div>`,
      mark:()=>{if(fin)return null;fin=true;const h=store.get("evHeld",null);if(h&&h.items){qqGiveItems(h.items);store.set("evHeld",null);return{ok:1,t:qqItemsTxt(h.items)}}return null},
      done:(o,ans)=>ans||!o?`<p class="muted">看了答案，這次贖不回來；回行囊可以再擋一次（3 天後他也會自己送回來）。</p>`:`<p>🏴 寇首把 ${esc(o.t)} 丟回星槎：「算你有本事！」</p>`,
      next:()=>"#/ship/bag",nextL:()=>"回行囊"}}
  const back=()=>C&&C.h0||"#/adventure";
  if(tok!=="pz"||!C||!C.live||C.ev.t!=="pirate"||!C.res||!C.res.pid)return{err:"這件雲河怪事已經過去了（中途離開或關掉 App，就當沒發生）。",back:()=>"#/adventure"};
  const left=()=>{const R=store.get("cjRunE",null);return Math.max(0,3-((R&&R.mist)|0))};
  const loseCard=()=>{const t=qqPirateLose(C);modal(`<div class="em">🏴</div><h2>沒擋住寇船</h2><p style="text-align:left;line-height:1.8">${esc(t)}</p>`,[[qqToLbl(C)+" ›",()=>qqBack()]],"keep")};
  return{id:C.res.pid,rk:"cjRunE",back,top:"🏴 雲河棋寇",icon:"🏴",noNudge:true,ans:"看答案就算沒擋住，寇首會把東西拿走。確定？",
    head:P=>`<b>🏴 擋寇</b>・${esc(P.t)}・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span><div class="shp-psay">寇船橫在船頭。照這局殺法擋住他——機會還有 ${left()}／3。</div>`,
    wrong:()=>{if(C.res.over)return"";const n=left();if(n<=0){setTimeout(()=>{if(QQ_CUR===C&&C.live&&C.res.over!=="win")loseCard()},2600);return"寇首哈哈大笑：「三次了，東西歸我！」"}return`寇首冷笑：「還有 ${n} 次機會。」`},
    mark:()=>{if(C.res.over)return null;qqPirateWin(C);return{win:1}},
    done:(o,ans)=>{if(ans||!o){if(!C.res.over||C.res.over==="lose"){const t=qqPirateLose(C);return`<p style="line-height:1.8">🏴 ${esc(t)}</p>`}return""}
      return`<p style="line-height:1.8">🏴 寇首瞪著棋盤半天，一跺腳：「算你狠！」寇船掉頭就走，慌亂中從船上掉下一件東西。</p>`},
    next:()=>{setTimeout(()=>qqBack(),0);return location.hash},nextL:()=>qqToLbl(C)}}

/* ---------- 押走、扣著的東西：贖回、到期歸還 ---------- */
/* 園子開新盤（06-cpu.js parkNpcNew）：押著東西或逃跑時說「在園子等你」的那位，在她那一朝的園子一定遇到她 */
function qqParkKeep(era){try{const P=store.get("evPawn",null);if(P&&P.era===era&&P.npc&&!/^m:/.test(P.npc)&&PARK_NPC.some(n=>n.id===P.npc))return P.npc;
  const D=qqLog().dare;if(D&&D.era===era&&Date.now()-D.at<7*QQ_DAY&&PARK_NPC.some(n=>n.id===D.npc))return D.npc}catch(e){}return null}
/* 贖回（Gemini 評估 11/8，開發者核准）：押著東西的攔路棋客在這一朝的園子等你時，那一盤比玩家現在的航行難度低一級——
   入局以上：電腦加減段用 DIFF 上一格的 dx；聽書（已經最低）：園子等級減 1。等級也不再隨機往上加。07-legend.js jStart 開園子那盤時問，回 null＝照舊 */
function qqParkEasy(era){try{const P=store.get("evPawn",null);if(!P||P.era!==(era||store.get("era","classic")))return null;const i=diffNow()-2;return i>=0?{dx:DIFF[i].dx,level:parkLv()}:{dx:DIFF[0].dx,level:Math.max(1,parkLv()-1)}}catch(e){return null}}
/* 園子那盤下完（07-legend.js journeyGameEnd）：贏了她＝還東西／補上獎勵 */
function qqParkEnd(st){if(!st||st.journey!=="park"||!st.result||st.result.w!==st.human||st.practice)return;const era=store.get("era","classic"),N=typeof parkNpcOf==="function"?parkNpcOf(st):null;
  const P=store.get("evPawn",null);if(P&&P.era===era&&(/^m:/.test(P.npc)||(N&&N.id===P.npc))){store.set("evPawn",null);if(P.items)qqGiveItems(P.items);
    const L=qqLog();L.won=L.won||{};if(P.rid)L.won[P.rid]=Date.now();qqLogSet(L);
    setTimeout(()=>modal(`<div class="em">🌸</div><h2>贖回來了！</h2><p style="line-height:1.8">${esc(P.nm)}：「說話算話，還你。」</p><p class="muted">${esc(P.rid?"珍品〈"+P.rnm+"〉":qqItemsTxt(P.items))}回到你手上了。</p>`,[["好",null]]),2600);return}
  const L=qqLog(),D=L.dare;if(D&&D.era===era&&N&&N.id===D.npc){L.dare=null;qqLogSet(L);addXP(D.xp||30,"攔路棋客・補下","qq:dare:"+D.at);
    setTimeout(()=>toast(`🌸 ${N.name}：「這回不跑啦？好棋！」攔路的獎勵補給你了`),2600)}}
/* 珍品藏局解開（07c-canju.js finish，不看答案）：寇船扣著的那件就贖回 */
function qqHeldSolved(rid){const H=store.get("evHeld",null);if(!H||H.rid!==rid)return;store.set("evHeld",null);const L=qqLog();L.won=L.won||{};L.won[rid]=Date.now();qqLogSet(L);
  setTimeout(()=>toast(`🏴 寇首把〈${H.rnm}〉丟回星槎：「算你有本事！」（珍品冊那一格蓋上「奪回」印）`),1800)}
/* 到期自動歸還：攔路棋客寄回驛站（7 天，珍品 3 天）、寇首自己送回來（3 天） */
function qqSettle(quiet){const now=Date.now(),msg=[];
  const P=store.get("evPawn",null);if(P&&now>=P.due){store.set("evPawn",null);if(P.items)qqGiveItems(P.items);msg.push(["📮 驛站信箱來了一封信",`${P.nm}寄來一封信：「說好的日子到了，${P.rid?"〈"+P.rnm+"〉":qqItemsTxt(P.items)}還你。下次經過${eraLabel(P.era)}，記得來園子找我下棋。」`])}
  const H=store.get("evHeld",null);if(H&&now>=H.due){store.set("evHeld",null);if(H.items)qqGiveItems(H.items);msg.push(["🏴 寇船又來了",`寇首自己划船送回來：「這東西我看不懂，還你。」${H.rid?"〈"+H.rnm+"〉":qqItemsTxt(H.items)}回到你手上了。`])}
  const L=qqLog();if(L.dare&&now-L.dare.at>=7*QQ_DAY){L.dare=null;qqLogSet(L)}
  const St=store.get("evStash",null);if(St&&(!St.ev||now>=St.due)){store.set("evStash",null);const t=St.ev&&St.ev.t,who=t==="pirate"?"那艘寇船等不及，先划走了":t==="bottle"?"那個漂流瓶等不及，又漂走了":t==="teller"?"考題我先收回去了，下回經過再考你":"那位棋客等不及，先走了";
    const line=`說書人：「囊中那件雲河怪事——${who}。不要緊，雲河上怪事多的是。」`;if(quiet||document.querySelector("#sheet,.modal"))setTimeout(()=>toast("🎒 "+line),1200);else msg.push(["🎒 囊中的怪事過期了",line+"（什麼都沒扣）"])}
  if(!msg.length)return;if(quiet||document.querySelector("#sheet,.modal")){msg.forEach(m=>setTimeout(()=>toast(m[0]+"："+m[1].slice(0,40)+"…"),1200));return}
  modal(msg.map(([t,x])=>`<h2 style="font-size:19px">${esc(t)}</h2><p style="line-height:1.8;text-align:left">${esc(x)}</p>`).join(""),[["收好",null]])}
/* 還沒了結的事（星槎頁行囊、珍品冊用） */
function qqPending(){const o=[],P=store.get("evPawn",null),H=store.get("evHeld",null),D=qqLog().dare,St=qqStash();
  if(St)o.push({k:"stash",ic:"🎒",t:`囊中：${QQ_STASH_NM[St.ev.t]||"雲河怪事"}（${shipShort(St.ev.era)}）`,s:`還有 ${qqLeftTxt(St.due)}・點一下處理；過期就消失，不罰任何東西`});
  if(P)o.push({k:"pawn",ic:"🌸",t:`${P.nm}押著${P.rid?"珍品〈"+P.rnm+"〉":" "+qqItemsTxt(P.items)}`,s:`到${eraLabel(P.era)}的園子贏${/^m:/.test(P.npc)?"一盤棋":"她一盤"}就還；${qqDaysLeft(P.due)} 天後自動${P.rid?"歸還":"寄回驛站"}`});
  if(H)o.push({k:"held",ic:"🏴",t:`寇船扣著${H.rid?"珍品〈"+H.rnm+"〉":" "+qqItemsTxt(H.items)}`,s:`${H.rid?"解開它藏著的殘局":"再擋寇首一題"}就贖回；${qqDaysLeft(H.due)} 天後他自己送回來`});
  if(D&&Date.now()-D.at<7*QQ_DAY){const n=PARK_NPC.find(x=>x.id===D.npc);if(n)o.push({k:"dare",ic:"⚔",t:`${n.name}在${eraLabel(D.era)}的園子等你`,s:"到那一朝的園子會遇到她；贏了補上攔路的獎勵"})}
  return o}
function qqPendingSheet(){qqSettle();const L=qqPending();sheet("🌀 雲河怪事・還沒了結的事",b=>{b.innerHTML=L.length?`<div class="items" style="padding:0">${L.map((x,i)=>`<button class="item" data-q="${i}"><span class="lb" style="font-size:22px">${x.ic}</span><span class="tx"><b>${esc(x.t)}</b><span>${esc(x.s)}</span></span>${x.k==="held"||x.k==="stash"?'<span class="muted">›</span>':""}</button>`).join("")}</div><p class="muted" style="font-size:13px">被押走、被扣著的東西一定回得來：親手贖回，或時間到了自動歸還。修為永遠不會被扣。</p>`:`<p class="muted">都了結了。雲河上偶爾會遇到怪事——有好事，也有麻煩。</p>`;
  b.querySelectorAll("[data-q]").forEach(y=>y.onclick=()=>{const x=L[+y.dataset.q];if(x.k==="stash"){vibrate(5);return qqStashOpen()}if(x.k!=="held")return;vibrate(5);qqRedeemGo()})})}
async function qqRedeemGo(){const H=store.get("evHeld",null);if(!H)return;if(H.rid){if(typeof relicGo==="function")relicGo(H.rid);return}
  let pid=null;try{pid=await qqPzPick(true)}catch(e){}if(!pid)return toast("題庫載入失敗，等一下再試");store.set("evHeld",{...H,pid});store.set("cjRunE",null);closeSheet();location.hash="#/canju/q/redeem"}
/* 珍品冊：被扣著、被押著的那格蓋小印；奪回的那格多一個「奪回」印 */
function qqRelicMark(id){const P=store.get("evPawn",null),H=store.get("evHeld",null);if(H&&H.rid===id)return'<span class="rl-qq">🏴</span>';if(P&&P.rid===id)return'<span class="rl-qq">🌸</span>';
  const W=(store.get("evLog",null)||{}).won;return W&&W[id]?'<span class="rl-qq won">奪回</span>':""}
/* 點到被扣著的那格：不看大圖，改說明怎麼贖回（回 true＝攔下來了） */
function qqRelicHeld(id){const P=store.get("evPawn",null),H=store.get("evHeld",null);
  if(H&&H.rid===id){sheet("🏴 寇船扣著〈"+H.rnm+"〉",b=>{b.innerHTML=`<p style="line-height:1.8">寇首：「這東西裡藏著一局棋，你解得開，我就還你。」</p><p class="muted">東西還在你的存檔裡，只是暫時被扣著；解開它藏著的殘局（不看答案）就贖回，${qqDaysLeft(H.due)} 天後寇首也會自己送回來。</p><button class="btn" id="qqRd" style="width:100%">🔍 去解藏局，把它贖回來</button>`;b.querySelector("#qqRd").onclick=()=>relicGo(id)});return true}
  if(P&&P.rid===id){sheet("🌸 押在"+P.nm+"那裡",b=>{b.innerHTML=`<p style="line-height:1.8">${esc(P.nm)}：「想拿回去？到${esc(eraLabel(P.era))}的園子贏我一盤。」</p><p class="muted">${qqDaysLeft(P.due)} 天後她會自己還你。</p><button class="btn ghost" id="qqOk" style="width:100%">知道了</button>`;b.querySelector("#qqOk").onclick=()=>closeSheet()});return true}
  return false}
setTimeout(()=>{try{qqPool();if(typeof relicsData==="function")relicsData()}catch(e){}},3000);
setTimeout(()=>{try{if(journey())qqSettle()}catch(e){}},9000);
addEventListener("hashchange",()=>setTimeout(()=>{try{qqStashBadge()}catch(e){}},350));setTimeout(()=>{try{qqStashBadge()}catch(e){}},2500);setInterval(()=>{try{qqStashBadge()}catch(e){}},30000);
