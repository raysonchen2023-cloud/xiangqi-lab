/* ================= 📜 今日推薦「宋代橋頭榜文牌」（開發者 11/9 選定 Gemini 方案 1，Claude 依考究清單修正；考究說明 park/todaymap/考究說明.md，史學顧問核圖中）=================
   圖：park/todaymap/today_day_v2.png（Gemini 一次到位；程式抹掉告示紙角的圖釘頭，看起來是漿糊貼的）、夜版 today_night_v1.png（簷角白紙燈籠、月夜）→ art/todaymap/ → data/todaymap/。
   首頁左岸橋頭告示牌的近景：#/today 一頁，取代原本首頁「📜 今日推薦」的底部視窗（07z 的告示牌標籤改成換頁）。
   今天的路（照 07l 的判斷：接著下、今日茶單、這站殘局、石桌往事、下一盤）一件一張告示：牌上原本 3 張空白紙，多的由程式照紙的樣子和透視再貼一兩張；
     每張紙頭一顆棋子分類（帥＝下一盤、俥＝接著下、炮＝殘局茶單、傌＝星槎殘局、相＝讀故事），字由程式直寫；做完的蓋朱印「訖」（不用打勾）；全部做完，牌上蓋「圓滿」。
   時間感：簷下的影子跟著真實時間移動（早上偏藍、傍晚偏橘，中午影子短）；渡口茶攤石桌上的香爐是「百刻香」（香篆），程式畫出今天燒到第幾刻（一晝夜一百刻）。
   節氣：牌頂寫今天的節氣；冬至前後下雪、清明細雨、春分飄桃花、秋分落葉。角色在牌前待機，全部做完歡呼。
   11/9 各朝版：照停靠朝代換圖（TD_ERA、tdG；見下面 TD_ERA 的說明）。
   接 07w 走路（SHW_TD）、07x 縮放。開關 TODAY_MAP_ON；圖片網址帶 TD_IMGV。路由：#/today 原本落到 Home(v)，這裡包一層 Home 接走 */
const TODAY_MAP_ON=true;
const TD_IMGV="2350";
/* 11/9 史學顧問盤查 C 類：照星槎停靠的朝代換圖（考究說明 park/todaymap/考究說明_各朝_1109.md；圖是 today_<day|night>_<組>.webp，宋以後、沒停靠用原圖）。
   組：han＝秦漢三國（平脊瓦當、告示寫在木牘上＝扁書、夜裡青銅燈盞）、weijin＝魏晉南北朝隋（平脊、紙告示、青銅燈盞）、tang＝唐五代（緩坡微翹、紙告示、白紙燈籠）。
   告示的位置（TD_NOTES）、簷影、香爐都沒動。程式加貼的第 4、5 張：han 組是木牘（.wood）；weijin、tang 組是淡黃潢紙（.huang，圖上原本 3 張也淡淡染黃）；宋以後照舊米白紙 */
const TD_ERA={qin:"han",han:"han",sanguo:"han",weijin:"weijin",nanbei:"weijin",sui:"weijin",tang:"tang",wudai:"tang"};
function tdG(){let e="";try{e=typeof hbDockEra==="function"?hbDockEra():typeof shipAt==="function"&&typeof shipDockList==="function"&&shipDockList()?shipAt()||"":""}catch(x){}return TD_ERA[e]||""}
/* 告示紙四角（像素 768×1376；左上、右上、右下、左下）：前 3 張是圖上原本的紙，後 2 張是程式加貼的位置 */
const TD_NOTES=[[[270,540],[367,522],[372,685],[272,710]],[[512,491],[587,477],[595,600],[520,619]],[[397,616],[482,596],[487,725],[402,747]],
  [[512,640],[593,626],[600,735],[518,752]],[[398,497],[478,483],[482,570],[402,585]]];
const TD_GLYPH={go:"俥",tea:"炮",ship:"傌",story:"相",cpu:"帥"};
const TD_EAVE=[[222,446],[642,424]],TD_CENSER=[629,932,45,15],TD_TERM_AT=[440,470];
/* 回饋 818：點畫裡的東西看說明（07w6-sceneinfo.js 的 sciPage；內容取自 park/todaymap/考究說明.md；告示紙是入口，不登記；開發者 11/9：大片背景不登記，拿掉「楚河和對岸」） */
const TD_BOARD=[[[240,470],[612,420],[612,722],[240,835]],[[180,330],[240,330],[240,1060],[180,1040]],[[600,400],[650,400],[650,890],[600,895]]];
const TD_SCI={k:"td",nm:"今日推薦",it:[
  {n:"小瓦頂和簷影",s:[[[152,255],[645,212],[748,358],[700,392],[300,472],[95,440],[70,410],[160,320]]],
   t:"告示牌頂上蓋了一道小瓦頂，替告示紙擋雨。仔細看簷下的影子：它跟著真實的時間移動，中午短短的，早上和傍晚拉得長長的。早上整張畫偏淡藍，傍晚偏橘色。",
   tn:"告示牌頂上蓋了一道小瓦頂，替告示紙擋雨。白天簷下的影子會跟著真實的時間移動；天黑了就換成這張月夜。"},
  {n:"橋頭告示牌",on:()=>!tdG(),s:TD_BOARD,
   t:"人來人往的橋頭、路口，最適合貼告示讓大家看見；古時候官府也常在大路口張貼詔令和榜文。牌上用白紙或淡米色紙，因為黃紙在後來是皇帝放榜（黃榜）才用的。"},
  {n:"橋頭告示牌",on:()=>tdG()==="han",s:TD_BOARD,
   t:"人來人往的橋頭、路口，最適合貼告示讓大家看見。這時候紙還不普遍，官府的告示寫在削平的薄木板上，掛在顯眼的地方{{han:；漢簡記載，詔令要寫在「扁書」上，掛在鄉、亭、市、里顯眼的地方，讓百姓都知道}}。牌上這幾塊淡色的木板就是「木牘」。"},
  {n:"橋頭告示牌",on:()=>tdG()==="weijin",s:TD_BOARD,
   t:"人來人往的橋頭、路口，最適合貼告示讓大家看見；官府也常在大路口張貼詔令和榜文。晉朝以後，官府文書不再寫在竹木簡上，改用紙，而且多用染黃的「潢紙」，可以防蟲，所以牌上的告示紙是淡黃色的。"},
  {n:"橋頭告示牌",on:()=>tdG()==="tang",s:TD_BOARD,
   t:"人來人往的橋頭、路口，最適合貼告示讓大家看見；官府也常在大路口張貼詔令和榜文。晉唐官府文書多用染黃的「潢紙」，可以防蟲，所以牌上的告示紙是淡黃色的。"},
  {n:"節氣小紙條",s:[[[378,450],[502,450],[502,490],[378,490]]],
   t:"牌頂這張小紙條寫著今天的節氣。一年有二十四個節氣，日期每年最多差一天。冬至前後會下雪、清明飄細雨、春分飛桃花、秋分落葉子，到了那幾天回來看看！"},
  {n:"百刻香",s:[[628,935,50]],
   t:"這是古人用來計時的「百刻香」。古人把一天一夜分成一百刻{{han:，漢代就這樣算時間}}；在香爐裡用香粉印出一條彎彎曲曲的香路，叫「香篆」，香路也分成一百刻，點一次剛好燒一天一夜{{song:，宋代的《香譜》記下了這種做法}}。灰白的那段是已經燒過的，那一點紅火就是現在的時間。"},
  {n:"渡口茶攤石桌",s:[[[478,950],[600,905],[768,845],[768,1000],[690,1040],[680,1140],[630,1140],[630,1070],[550,1060],[545,1085],[500,1080],[490,990]]],
   t:"渡口邊的茶攤小石桌，是過河的人歇腳喝茶的地方。桌上那個三足香爐點的是「百刻香」，點點香爐看它怎麼報時。"},
  {n:"渡口石樁",s:[[[22,842],[108,842],[112,1022],[22,1022]]],
   t:"這裡是首頁「楚河渡口棋鎮」的橋頭。這幾根石樁是用來繫船纜的，跟告示牌、茶攤石桌一樣，都是渡口常見的東西。"},
  {n:"白紙燈籠",fe:"tang",dn:"n",on:()=>tdG()!=="han"&&tdG()!=="weijin",s:[[[662,382],[752,382],[752,570],[662,570]]],
   t:"天黑了，告示牌的簷角亮起一盞燈。夜裡告示紙的顏色也跟著暗下來，對岸的窗子透出暖光。"},
  {n:"青銅燈盞",dn:"n",on:()=>tdG()==="han"||tdG()==="weijin",s:[[[620,388],[768,388],[768,660],[620,660]]],
   t:"天黑了，告示牌的簷角吊起一盞青銅燈盞：三根細鏈吊著一個淺淺的圓盤，盤裡點著一朵小火苗。這時候還不用紙糊的燈籠，線上大廳裡吊的也是這種燈。夜裡告示的顏色跟著暗下來，對岸的窗子透出暖光。"}]};
const SHW_TD={el:40,h:[.085,70,.0012],look0:[50,45],home:"home",N:{home:[50,96],mid:[47,88],brd:[40,82.5]},E:"home-mid mid-brd"};
/* 二十四節氣（約略的國曆日期，每年差一天以內） */
const TD_TERMS=[[1,6,"小寒"],[1,20,"大寒"],[2,4,"立春"],[2,19,"雨水"],[3,6,"驚蟄"],[3,21,"春分"],[4,5,"清明"],[4,20,"穀雨"],[5,6,"立夏"],[5,21,"小滿"],[6,6,"芒種"],[6,21,"夏至"],
  [7,7,"小暑"],[7,23,"大暑"],[8,8,"立秋"],[8,23,"處暑"],[9,8,"白露"],[9,23,"秋分"],[10,8,"寒露"],[10,24,"霜降"],[11,7,"立冬"],[11,22,"小雪"],[12,7,"大雪"],[12,22,"冬至"]];
const tdPc=(x,y)=>[x/7.68,y/13.76];
/* 今天要做的事：照 07l-homepath.js 的判斷（那個檔目前沒有接進 m.html，所以這裡帶一份 td 前綴的副本）：接著下、今日茶單、這站殘局、石桌往事、下一盤 */
let TD_CPU={d:"",n:0};   /* 今天下完幾盤（棋譜庫查一次記住，同一天不重查） */
const tdHpDay=t=>typeof cjDay==="function"?cjDay(t):new Date(t==null?Date.now():t).toDateString();
const tdHpIsToday=t=>!!t&&+t>0&&tdHpDay(+t)===tdHpDay();
/* ---------- 今天的節點 ---------- */
function tdHpTea(){try{const S=cjState(),L=S.day===cjDay()?S.list:null,ok=!!(L&&cjCleared(L)),n=L?L.filter((x,i)=>x.st==="done"||(i===2&&x.st==="skip")).length:0;
  return{id:"tea",ic:"🍵",t:"今日茶單",s:ok?"喝完了":`${n}／3 題`,go:"#/canju",done:ok}}catch(e){return null}}
function tdHpShip(){try{const k=homeRecShipK();if(!k)return null;const L=shipPuzzles(k),lt=(store.get("shipLearn",{})||{})[k],nm=shipShort(k),nx=shipAppr()?null:shipNextStop(),ln=shipLearned(k);
  if(!ln&&!(L&&!L.length)){const n=L?L.slice(0,SHIP_PER).filter(id=>shipRec(k,id)).length:null;return{id:"ship",ic:"♟",t:nm+"殘局",s:n==null?"千秋殘局":`${n}／${Math.min(SHIP_PER,L.length)} 題`,go:"#/ship/pz"}}
  if(nx&&!tdHpIsToday(lt))return{id:"ship",ic:"⛵",t:"起航",s:"去"+shipShort(nx),go:"#/ship/sail"};
  if(!ln)return null;return{id:"ship",ic:"♟",t:nm+"殘局",s:"學會了",go:"#/adventure",done:true}}catch(e){return null}}
function tdHpStory(){try{if(typeof legendState!=="function"||typeof jStages!=="function")return null;const R=store.get("legRead",{})||{},td=Object.values(R).some(E=>Object.values(E||{}).some(tdHpIsToday));
  let b=1,n=legendState().n;if(typeof book1Done==="function"&&book1Done()){if(typeof jStages2!=="function")return null;const S=jStars(),J=jStages2(),x=J.find(z=>!S[z.id]);if(!x)return null;b=2;n=x.n}
  return{id:"story",ic:b===1?"🪨":"📜",t:`第${CNUM(n)}回`,s:td?"今天讀過了":b===1?"石桌往事":"紙譜新局",go:`#/shelf/${b}/${n}`,done:td}}catch(e){return null}}
/* 11/9 史學顧問盤查：「下一盤」紙條跟首頁一樣照停靠朝代改詞（07z 的 xqHubName("quick")，去掉前面的「⚡ 」）；函式不在或沒停靠＝照舊「下一盤」 */
function tdQuickName(){try{if(typeof xqHubName==="function")return String(xqHubName("quick")).replace(/^(⚡|♟)\s*/,"")||"下一盤"}catch(e){}return"下一盤"}
function tdHpNodes(st,onl){const N=[],g=onl||(typeof homeRecGame==="function"?homeRecGame(st):null);
  if(g)N.push({id:"go",ic:"♟",t:onl?"回對局":"接著下",s:onl?"線上對局":String(g.t).replace(/^.*：/,""),go:g.go,sw:g.sw,park:g.park});
  for(const f of[tdHpTea,tdHpShip,tdHpStory]){const x=f();if(x)N.push(x)}
  if(!(g&&g.go==="#/cpu"))N.push({id:"cpu",ic:"🤖",t:tdQuickName(),s:TD_CPU.d===tdHpDay()&&TD_CPU.n?"今天下過了":"跟電腦",go:"#/cpu",done:TD_CPU.d===tdHpDay()&&TD_CPU.n>0});
  const c=N.findIndex(x=>!x.done);N.forEach((x,i)=>{x.st=x.done?"done":i===c?"cur":c>=0&&i>c?"later":"todo"});return N}
function tdTerm(d){d=d||new Date();const m=d.getMonth()+1,day=d.getDate();let t=TD_TERMS[TD_TERMS.length-1][2];for(const[a,b,n]of TD_TERMS)if(m>a||(m===a&&day>=b))t=n;return t}
function tdTermTag(d){d=d||new Date();const m=d.getMonth()+1,day=d.getDate(),t=tdTerm(d);return TD_TERMS.some(([a,b,n])=>a===m&&b===day&&n===t)?"今日・"+t:"節氣・"+t}
const tdDarkNow=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=20||h<5};
/* 長方形（w×h）→ 告示紙四邊形的 CSS matrix3d */
function tdM3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
function tdCss(){if(document.getElementById("tdCss"))return;const s=document.createElement("style");s.id="tdCss";s.textContent=`
.td-page{margin:0 0 8px}
.td-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.td-note{position:absolute;left:0;top:0;width:100px;height:160px;transform-origin:0 0;border:0;padding:8px 6px;background:none;cursor:pointer;pointer-events:auto;color:#2a1f15;display:flex;flex-direction:row-reverse;align-items:flex-start;gap:4px;overflow:hidden;text-align:left}

.td-note.paper{background:radial-gradient(28% 18% at 30% 22%,rgba(196,164,110,.28),rgba(196,164,110,0) 70%),radial-gradient(22% 16% at 72% 58%,rgba(190,158,104,.22),rgba(190,158,104,0) 70%),radial-gradient(30% 14% at 40% 86%,rgba(180,150,100,.2),rgba(180,150,100,0) 70%),radial-gradient(120% 90% at 45% 40%,#f3ecd6 55%,#e6d8b6 100%);border-radius:1px 2px 1px 3px;box-shadow:inset 0 0 0 1.4px rgba(52,36,22,.82),inset 0 0 7px rgba(150,115,60,.28),4px 5px 4px rgba(45,30,15,.32)}.td-note.paper::after{content:"";position:absolute;left:0;bottom:0;width:12px;height:12px;background:linear-gradient(45deg,rgba(0,0,0,0) 50%,#d9cba8 50%);box-shadow:inset 1px -1px 0 rgba(52,36,22,.7)}.td-night .td-note.paper{background:radial-gradient(28% 18% at 30% 22%,rgba(110,85,50,.3),rgba(110,85,50,0) 70%),radial-gradient(22% 16% at 72% 58%,rgba(110,85,50,.24),rgba(110,85,50,0) 70%),radial-gradient(120% 90% at 45% 40%,#cdb796 55%,#b29c7a 100%);box-shadow:inset 0 0 0 1.4px rgba(30,20,12,.85),inset 0 0 7px rgba(80,60,30,.32),4px 5px 4px rgba(0,0,0,.42)}.td-night .td-note.paper::after{background:linear-gradient(45deg,rgba(0,0,0,0) 50%,#a8916f 50%)}
.td-note.wood{background:linear-gradient(90deg,rgba(150,110,60,.10) 0 1px,rgba(0,0,0,0) 1px 7px) 0 0/7px 100%,radial-gradient(120% 90% at 45% 40%,#efe2c2 55%,#dcc79e 100%);border-radius:1px;box-shadow:inset 0 0 0 1.4px rgba(52,36,22,.82),inset 0 0 6px rgba(120,85,40,.3),4px 5px 4px rgba(45,30,15,.32)}.td-note.wood::before{content:"";position:absolute;left:50%;top:5px;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:#5a3d22}.td-night .td-note.wood{background:radial-gradient(120% 90% at 45% 40%,#c9b089 55%,#a99068 100%);box-shadow:inset 0 0 0 1.4px rgba(30,20,12,.85),4px 5px 4px rgba(0,0,0,.42)}
.td-note.huang:not(.paper){background:rgba(214,172,72,.2);mix-blend-mode:multiply}.td-night .td-note.huang:not(.paper){background:rgba(190,150,60,.16)}
.td-note.paper.huang{background:radial-gradient(28% 18% at 30% 22%,rgba(196,150,70,.28),rgba(196,150,70,0) 70%),radial-gradient(120% 90% at 45% 40%,#f1e1b0 55%,#e2cb8e 100%)}.td-night .td-note.paper.huang{background:radial-gradient(120% 90% at 45% 40%,#cbb27e 55%,#ad955f 100%)}
.td-note .pc{flex:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 15px/1 var(--serif,serif);background:#f3e6c8;box-shadow:inset 0 0 0 2px currentColor,inset 0 0 0 4px #f3e6c8,inset 0 0 0 5px currentColor}
.td-note .pc.r{color:#b23a26}.td-note .pc.k{color:#2a2420}
.td-note .tx{writing-mode:vertical-rl;display:flex;flex-direction:column;gap:4px;max-height:100%}
.td-note .tx b{font:900 19px/1.15 var(--serif,serif);letter-spacing:.06em}
.td-note .tx small{font:600 11.5px/1.3 var(--serif,serif);color:#5a4632}
.td-note.cur{box-shadow:0 0 0 2px rgba(242,201,76,.85),0 0 10px 2px rgba(255,214,120,.65)}
.td-note .seal{position:absolute;left:8px;bottom:10px;width:30px;height:30px;border:2px solid #b23a26;border-radius:3px;color:#b23a26;font:900 19px/26px var(--serif,serif);text-align:center;transform:rotate(-12deg);background:rgba(255,240,230,.25);opacity:.92}
.td-term{position:absolute;transform:translate(-50%,-50%);background:#f6efdf;border:1px solid rgba(60,40,24,.5);border-radius:2px;padding:2px 8px;font:800 11px/1.3 var(--serif,serif);color:#3a2618;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.td-done{position:absolute;transform:translate(-50%,-50%) rotate(-10deg);width:15%;aspect-ratio:1;border:3px solid #b23a26;border-radius:6px;color:#b23a26;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;font:900 22px/1.05 var(--serif,serif);background:rgba(255,236,226,.3);opacity:.9}
.td-snow i,.td-rain i,.td-pet i{position:absolute;top:-6%;display:block;animation:tdFall linear infinite}
.td-snow i{width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 2px rgba(255,255,255,.8)}
.td-rain i{width:1px;height:16px;background:linear-gradient(rgba(200,210,230,0),rgba(200,210,230,.8));animation-name:tdRain}
.td-pet i{width:9px;height:7px;border-radius:60% 40% 60% 40%;background:var(--pc,#f2b8c0);opacity:.9}
@keyframes tdFall{to{transform:translate(-6vw,112vh) rotate(260deg)}}@keyframes tdRain{to{transform:translate(-3vw,110vh)}}
.td-smoke{position:absolute;width:3%;aspect-ratio:1/4;transform:translate(-50%,-100%)}
.td-smoke i{position:absolute;left:40%;bottom:0;width:20%;height:100%;border-radius:50%;background:linear-gradient(to top,rgba(240,240,240,.7),rgba(240,240,240,0));filter:blur(2px);animation:tdSmoke 4s ease-in-out infinite}
@keyframes tdSmoke{0%{transform:translateX(0) scaleY(.5);opacity:0}30%{opacity:.8}100%{transform:translateX(60%) scaleY(1.1);opacity:0}}
.td-page .shp-spot.td-tag{padding:4px 12px}.td-page .shp-spot.td-tag b{font-size:14px;white-space:nowrap}
@media (prefers-reduced-motion:reduce){.td-snow i,.td-rain i,.td-pet i,.td-smoke i{animation:none}.td-snow,.td-rain,.td-pet{display:none}}`;document.head.append(s)}
/* 簷影：早晚長、中午短；早上影子往右偏、傍晚往左偏 */
function tdShadow(){const d=new Date(),h=d.getHours()+d.getMinutes()/60,len=Math.max(14,Math.min(110,14+Math.abs(12.5-h)*14)),dx=Math.max(-60,Math.min(60,(12.5-h)*10)),[[x0,y0],[x1,y1]]=TD_EAVE;
  const P=[[x0,y0],[x1,y1],[x1+dx,y1+len],[x0+dx,y0+len]].map(([x,y])=>`${(x/7.68).toFixed(2)},${(y/13.76).toFixed(2)}`).join(" ");
  const tint=h>=5&&h<8.5?"rgba(120,150,205,.16)":h>=16&&h<19.5?"rgba(255,150,70,.16)":"";
  return`<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${P}" fill="rgba(40,28,18,.2)" style="filter:blur(.6px)"/></svg>${tint?`<span style="position:absolute;inset:0;background:${tint};mix-blend-mode:multiply"></span>`:""}`}
/* 百刻香：香篆的香路（三圈螺旋），已燒的一段是灰白的香灰、燒到的那一點是紅火，上面一縷細煙 */
function tdIncense(){const d=new Date(),f=(d.getHours()*60+d.getMinutes())/1440,[cx,cy,rx,ry]=TD_CENSER,N=180,pts=[];
  for(let i=0;i<=N;i++){const t=i/N,a=t*6*Math.PI,r=.92-.78*t;pts.push([cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r])}
  const path=A=>A.map(([x,y],i)=>`${i?"L":"M"}${(x/7.68).toFixed(3)} ${(y/13.76).toFixed(3)}`).join(""),k=Math.max(1,Math.round(f*N)),[ex,ey]=pts[k];
  return`<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${path(pts)}" fill="none" stroke="rgba(120,84,48,.55)" stroke-width=".28" vector-effect="non-scaling-stroke" style="stroke-width:1.6px"/>
    <path d="${path(pts.slice(0,k+1))}" fill="none" stroke="rgba(236,232,224,.95)" vector-effect="non-scaling-stroke" style="stroke-width:1.8px"/>
    <ellipse cx="${(ex/7.68).toFixed(3)}" cy="${(ey/13.76).toFixed(3)}" rx=".45" ry=".25" fill="#ff7a2a" style="filter:drop-shadow(0 0 .4px #ffb070)"/></svg>
    <span class="td-smoke" style="left:${(ex/7.68).toFixed(2)}%;top:${(ey/13.76).toFixed(2)}%"><i></i></span>`}
/* 節氣疊圖：春分桃花、秋分落葉。11/10 開發者 hspx「同個朝代不同場景天氣一致還是沒修好」：這裡原本冬至、小寒整天下雪，清明整天下雨，跟別頁共用的天氣（07w7 sw7Precip）對不上；
   雨雪改由 07w7 照共用天氣畫，這裡只留季節點綴（那天真的在下雨雪時，07w7 會蓋掉點綴） */
function tdWeather(term){const n=term==="春分"?"pet":term==="秋分"?"leaf":"";if(!n)return"";
  try{if(typeof sw7On==="function"&&sw7On()){const o=SW7_PAGES.find(x=>x.k==="today");if(o&&sw7Precip(term,sw7Rg(o)))return""}}catch(e){}
  let h="";for(let i=0;i<(n==="rain"?36:18);i++){const l=(i*53%100),dl=-(i*.37%6).toFixed(2),du=(n==="rain"?1.1:6)+(i%5)*(n==="rain"?.2:1.2);
    h+=`<i style="left:${l}%;animation-duration:${du}s;animation-delay:${dl}s${n==="leaf"?";--pc:#c8642c":""}"></i>`}
  return`<span class="${n==="snow"?"td-snow":n==="rain"?"td-rain":"td-pet"}" style="position:absolute;inset:0">${h}</span>`}
function TodayPage(v){tdCss();setTop("📜 今日推薦","#/");if(typeof setTabs==="function")setTabs(true,"#/");v.className="view";
  const term=tdTerm(),P=document.createElement("div");P.className="shp-page cq td-page"+(tdDarkNow()?" td-night":"");v.innerHTML="";v.append(P);
  const[tx,ty]=tdPc(...TD_TERM_AT);
  const tg=tdG();P.innerHTML=`<img src="${xqClImg(`data/todaymap/${tdDarkNow()?"today_night":"today_day"}${tg?"_"+tg:""}.webp?v=${TD_IMGV}`)}" alt="橋頭榜文牌"><div class="td-fx" aria-hidden="true">${tdShadow()}${tdIncense()}${tdWeather(term)}<span class="td-term" style="left:${tx.toFixed(2)}%;top:${ty.toFixed(2)}%">${esc(tdTermTag())}</span></div><div class="td-ns"></div>`;
  let N=[],onl=null;
  const go=async x=>{if(typeof vibrate==="function")vibrate(5);if(x.sw)try{await api("/play/switch",{kind:x.sw})}catch(e){}if(x.park)store.set("park3d",true);location.hash=x.go};
  const fit=()=>{const k=P.clientWidth/768;if(!k)return;P.querySelectorAll(".td-note").forEach(f=>{const q=TD_NOTES[+f.dataset.i].map(([x,y])=>[x*k,y*k]);f.style.transform=tdM3(100,160,q)})};
  const draw=st=>{if(!P.isConnected)return;try{N=tdHpNodes(st,onl)}catch(e){N=[]}const L=N.slice(0,TD_NOTES.length),all=L.length&&L.every(x=>x.done);
    const box=P.querySelector(".td-ns");
    box.innerHTML=L.map((x,i)=>{const g=TD_GLYPH[x.id]||"兵",red=true;
      return`<button type="button" class="td-note${i>=3?(tg==="han"?" wood":" paper"):""}${tg==="weijin"||tg==="tang"?" huang":""}${x.st==="cur"?" cur":""}" data-i="${i}" aria-label="${esc(x.t+"・"+x.s+(x.done?"，完成了":""))}"><span class="pc ${red?"r":"k"}">${g}</span><span class="tx"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span>${x.done?'<span class="seal">訖</span>':""}</button>`}).join("")+
      L.map((x,i)=>{const q=TD_NOTES[i],[a,b]=tdPc((q[0][0]+q[1][0])/2,Math.min(q[0][1],q[1][1])-14);return`<button class="shp-spot td-tag" id="tdT${i}" data-i="${i}" data-nolift="1" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%;opacity:0;pointer-events:none" aria-hidden="true"><b>${esc(x.t)}</b></button>`}).join("")+
      (all?`<span class="td-done" style="left:${tdPc(560,690)[0].toFixed(2)}%;top:${tdPc(560,690)[1].toFixed(2)}%">圓滿</span>`:"");
    fit();
    box.querySelectorAll(".td-note").forEach(b=>b.onclick=e=>{e.stopPropagation();const t=box.querySelector("#tdT"+b.dataset.i);if(t)t.click()});
    box.querySelectorAll(".td-tag").forEach(t=>t.onclick=()=>{const x=N[+t.dataset.i];if(x)go(x)});
    const HS={};L.forEach((x,i)=>{const q=TD_NOTES[i],[a,b]=tdPc((q[0][0]+q[2][0])/2,(q[0][1]+q[2][1])/2);HS["tdT"+i]=["brd",+a.toFixed(2),+b.toFixed(2),all?"cheer":"idle"]});
    if(!P.dataset.shw){try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_TD,{HS}),"td")}catch(e){}}};
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!P.isConnected){ro.disconnect();return}fit()});ro.observe(P)}
  try{if(window.XQNet&&XQNet.playing&&XQNet.playing())onl={go:"#/pvp",t:"⚔ 回線上對局"}}catch(e){}
  draw(null);
  const cpu=TD_CPU.d===tdHpDay()?null:api("/db/items?c=play&limit=12").then(d=>{let n=0;for(const it of(d&&d.items)||[]){const r=String(it.result||"");if(r&&!/中止|取消/.test(r)&&tdHpIsToday(typeof tlTime==="function"?tlTime(it.id):0))n++}TD_CPU={d:tdHpDay(),n}}).catch(()=>null);
  Promise.all([api("/play/state").catch(()=>null),typeof cjData==="function"?cjData().then(D=>{try{cjToday(D,cjState())}catch(e){}}).catch(()=>null):null,typeof shipBank==="function"&&typeof homeRecShipK==="function"&&homeRecShipK()?shipBank().catch(()=>null):null,cpu])
    .then(([st])=>draw(st)).catch(()=>{});
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  try{if(typeof sciPage==="function")sciPage(v,TD_SCI)}catch(e){}
  return{}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){if(TODAY_MAP_ON&&!hub&&/^#\/today\/?$/.test(location.hash))return TodayPage(v);return f0.apply(this,arguments)}}
