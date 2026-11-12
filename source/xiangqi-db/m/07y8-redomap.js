/* ================= 🔁 錯棋重練「臨池書案＋曝書竹竿」（42 案第 1 頁：Gemini 方案 1＋4，Claude 依考究清單修正；考究說明 park/redomap/考究說明.md，史學顧問核圖中）=================
   圖：park/redomap/redo_day_v2.png（Gemini 重畫一次＋宣紙濾鏡 0.6）、夜版 redo_night_v1.png（月夜）；小素材 rd_book（闔起的包背裝薄冊）、rd_page（晾著的冊頁），綠幕去背 → art/redomap/ → data/redomap/。
   從學習頁的「洗墨池」進來（#/redo）。三個看得見的地方對應原本的篩選：
     書案上攤開的冊子＝📅 該複習（程式在冊頁上直寫今天要複習幾題）；案角疊著的冊子＝還沒練會（題數越多疊越高）；池畔竹竿上晾的冊頁＝✅ 練會了（練會一題多晾一張）；
     「全部」是書案邊一個小切換鈕。點了＝按原本 04-stats 的篩選鈕（#rf），清單照舊在下面。
   洗墨池：池水照「還沒練會、到期該複習」的錯棋多少由淡墨變濃墨（跟學習頁的洗墨池同一個數 hbRedoN）；清空時水面一道清光。換季：春浮萍、夏荷、秋殘荷、冬薄冰。
   香篆爐：有該複習的就點著；沒有就照「離下次複習還有幾天」畫煙的長短。角色走到書案前揮手；全部練會時在竹竿前歡呼。
   開關 REDO_MAP_ON；圖片網址帶 RD2_IMGV；前綴 rd2。包一層 Redo */
const REDO_MAP_ON=true;
const RD2_IMGV="2380";
/* 圖上的位置（像素 768×1376） */
const RD2_BOOK=[355,905],RD2_STACK=[178,898],RD2_CENSER=[572,930],RD2_ALL=[640,1000];
const RD2_POLE=[[512,480],[702,400]];   /* 竹竿兩端（左柱、右柱綁繩處） */
const RD2_POND="polygon(10.4% 23.3%,95.7% 21.8%,95.7% 42.5%,78.1% 46.5%,67.7% 51.2%,59.2% 54.1%,10.4% 46.5%)";
const SHW_RD2={el:40,h:[.1,92,.003],look0:[46,66],home:"home",N:{home:[52,97],desk:[46,91],mid:[72,92],rail:[86,82]},E:"home-desk desk-mid mid-rail home-mid",
  HS:{rd2Book:["desk",46,66,"wave"],rd2Stack:["desk",23,65,"wave"],rd2Pole:["rail",80,32,"wave"],rd2All:["mid",83,72,"idle"]}};
const rd2Pc=(x,y)=>[(x/7.68).toFixed(2),(y/13.76).toFixed(2)];
const rd2Dark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
function rd2Css(){if(document.getElementById("rd2Css"))return;const s=document.createElement("style");s.id="rd2Css";s.textContent=`
.rd2-page{margin:0 0 6px}
.rd2-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.rd2-pond{position:absolute;inset:0;clip-path:${RD2_POND};-webkit-clip-path:${RD2_POND}}
.rd2-ink{position:absolute;inset:0;background:radial-gradient(ellipse 46% 18% at 53% 38%,rgba(28,24,22,.62),rgba(28,24,22,.36) 55%,rgba(28,24,22,0) 100%);transition:opacity 1.2s}   /* 11/10 開發者截圖：iPhone 上 multiply 不作用，池面變成一大塊硬邊深灰；改成中間濃、往池邊淡開，不靠混色 */
.rd2-clear{position:absolute;inset:0;background:linear-gradient(115deg,rgba(150,205,215,0),rgba(185,228,236,.6) 45%,rgba(150,205,215,0) 60%);mix-blend-mode:screen;background-size:220% 100%;animation:rd2Glint 4.5s ease-in-out infinite}
@keyframes rd2Glint{0%{background-position:120% 0}100%{background-position:-20% 0}}
.rd2-season{position:absolute;inset:0;width:100%;height:100%}
.rd2-bk{position:absolute;width:9.2%;transform:translate(-50%,-50%);filter:drop-shadow(0 1px 1px rgba(60,40,20,.35))}
.rd2-pg{position:absolute;width:4.8%;transform:translate(-50%,0) rotate(var(--r,0deg));transform-origin:50% 0;animation:rd2Sway 4s ease-in-out infinite;animation-delay:var(--d,0s)}
@keyframes rd2Sway{0%,100%{transform:translate(-50%,0) rotate(calc(var(--r,0deg) - 2deg))}50%{transform:translate(-50%,0) rotate(calc(var(--r,0deg) + 2deg))}}
.rd2-pg i{position:absolute;left:36%;top:34%;width:30%;aspect-ratio:1;border:1px solid #b23a26;border-radius:50%;opacity:.8}
.rd2-txt{position:absolute;transform:translate(-50%,-50%) rotate(-24deg) skewX(18deg);writing-mode:vertical-rl;font:800 11px/1.2 var(--kai,var(--serif,serif));color:#2a1d12;letter-spacing:.08em;white-space:nowrap}
.rd2-txt b{color:#b23a26;font-size:13px}
.rd2-night .rd2-txt{color:#e8e0cc}
.rd2-night .rd2-pg img,.rd2-night .rd2-bk{filter:brightness(.68) saturate(.8)}.rd2-night .rd2-season{opacity:.55}
.rd2-smoke{position:absolute;width:2.2%;transform:translate(-50%,-100%)}
.rd2-smoke i{position:absolute;left:40%;bottom:0;width:22%;height:100%;border-radius:50%;background:linear-gradient(to top,rgba(235,235,235,.75),rgba(235,235,235,0));filter:blur(1.5px);animation:rd2Smoke 4s ease-in-out infinite}
@keyframes rd2Smoke{0%{transform:translateX(0) scaleY(.6);opacity:0}30%{opacity:.85}100%{transform:translateX(70%) scaleY(1.1);opacity:0}}
.rd2-ember{position:absolute;width:.9%;aspect-ratio:1;border-radius:50%;background:#ff7a2a;box-shadow:0 0 4px 1px rgba(255,140,60,.8);transform:translate(-50%,-50%)}
.rd2-page .shp-spot.rd2-tag b{white-space:nowrap}
.rd2-page .shp-spot.rd2-small{padding:2px 9px}.rd2-page .shp-spot.rd2-small b{font-size:12px}
@media (prefers-reduced-motion:reduce){.rd2-pg,.rd2-smoke i,.rd2-clear{animation:none}}`;document.head.append(s)}
/* 換季：春浮萍、夏荷、秋殘荷、冬薄冰（畫在池面範圍裡，viewBox 0～100） */
function rd2Season(){const m=new Date().getMonth()+1,se=m>=3&&m<=5?"sp":m>=6&&m<=8?"su":m>=9&&m<=11?"au":"wi";let g="";
  const P=[[22,30],[34,38],[48,27],[61,34],[74,29],[28,42],[55,40],[86,26],[40,33]];
  if(se==="sp")g=P.map(([x,y],i)=>`<g fill="#7da35a" opacity=".75">${[0,1,2,3].map(j=>`<ellipse cx="${x+((i*7+j*3)%5)*.6}" cy="${y+((i+j*2)%3)*.5}" rx=".55" ry=".3"/>`).join("")}</g>`).join("");
  else if(se==="su")g=P.slice(0,6).map(([x,y],i)=>`<g><ellipse cx="${x}" cy="${y}" rx="${2.4+(i%3)*.5}" ry="${1+(i%2)*.25}" fill="#5f8f4e" opacity=".82"/><path d="M${x} ${y}l${1.6+(i%2)} ${-.4}" stroke="#3d6234" stroke-width=".15"/></g>`).join("")+`<path d="M49 27v-3.2" stroke="#4d6b3a" stroke-width=".2"/><ellipse cx="49" cy="23.6" rx=".55" ry=".9" fill="#e8a2a8"/>`;
  else if(se==="au")g=P.slice(0,7).map(([x,y],i)=>{const h=3+(i%3)*1.4,lx=x+(i%2?.8:-.8);return`<g opacity=".85"><path d="M${x} ${y}q${(i%2?.3:-.3)} ${-h*.6} ${lx-x} ${-h}" fill="none" stroke="#4a3a24" stroke-width=".22"/><path d="M${lx-1.3} ${y-h+.2}q1.3 -1 2.6 0q-.5 1 -1.3 1.3q-.8 -.3 -1.3 -1.3z" fill="#7a5a32"/><ellipse cx="${x}" cy="${y+.15}" rx="1" ry=".25" fill="rgba(60,45,30,.35)"/></g>`}).join("");
  else g=`<rect x="0" y="0" width="100" height="100" fill="rgba(235,242,248,.35)"/><path d="M14 30l9 3 6-2 8 5M52 26l7 4 9-1M30 40l12-2 7 3M64 36l10 3" fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".25"/>`;
  return`<svg class="rd2-season" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${g}</svg>`}
/* 離下次複習還有幾天（練會的題目裡最近的到期日；沒有就回 null） */
function rd2Next(){const D=store.get("redoDone",{})||{},now=Date.now();let t=null;for(const k in D){const d=D[k];if(d&&d.ok&&d.due&&d.due>now&&(t==null||d.due<t))t=d.due}return t==null?null:Math.max(1,Math.ceil((t-now)/864e5))}
function rd2Wrap(v,R){if(!REDO_MAP_ON||!v.querySelector("#rf"))return R;rd2Css();
  const dk=rd2Dark(),P=document.createElement("div");P.className="shp-page cq rd2-page"+(dk?" rd2-night":"");
  const sp=(id,x,y,t,cl)=>{const[a,b]=rd2Pc(x,y);return`<button class="shp-spot rd2-tag${cl?" "+cl:""}" id="${id}" style="left:${a}%;top:${b}%"><b>${t}</b></button>`};
  P.innerHTML=`<img src="${xqClImg(`data/redomap/${dk?"redo_night":"redo_day"}.webp?v=${RD2_IMGV}`)}" alt="洗墨池邊的臨水書案">
    <div class="rd2-fx" aria-hidden="true"><div class="rd2-pond">${rd2Season()}</div><div class="rd2-stack"></div><div class="rd2-pole"></div><div class="rd2-ctxt"></div><div class="rd2-cen"></div></div>
    ${sp("rd2Book",RD2_BOOK[0],RD2_BOOK[1]-70,"📅 該複習")}${sp("rd2Stack",RD2_STACK[0]-20,RD2_STACK[1]-75,"還沒練會")}${sp("rd2Pole",610,370,"✅ 練會了")}${sp("rd2All",RD2_ALL[0],RD2_ALL[1],"全部","rd2-small")}`;
  v.insertBefore(P,v.firstChild);
  const rf=v.querySelector("#rf"),cnt=()=>{const o={};rf.querySelectorAll("[data-k]").forEach(b=>{const m=b.textContent.match(/(\d+)\s*$/);o[b.dataset.k]=m?+m[1]:0});return o};
  /* 回饋 833（開發者 11/9：四頁也改成一對一）：點圖上的東西＝按原本的篩選鈕，面板只看那一份清單，標題換成入口名（照 832 我的戰績的做法）。
     面板上記 data-rd2＝目前那一份，CSS 藏掉篩選鈕列（#rf，圖上已經各有一個入口）；「該複習／還沒練會／練會了」也藏掉最上面那張說明卡，只留清單（#rl）；
     說明卡（怎麼練、間隔重複）沒有自己的入口，歸給「全部」；「還有一題沒下完・繼續下」那一格（#rRes）四份都留著。書案上的冊子沒有該複習的題目時照舊改看還沒練會，標題也跟著寫還沒練會。
     面板收起（class 沒了 open）就拿掉 data-rd2、標題換回頁名。面板是 07w 的 xqSheetAuto 晚一點（0～700ms）才建的，所以點的當下才去拿；還沒建好就照舊捲過去 */
  if(!document.getElementById("rd2OneCss")){const s=document.createElement("style");s.id="rd2OneCss";s.textContent=`.xqs[data-rd2] #rf{display:none}
.xqs[data-rd2]:not([data-rd2="all"]) .home>.card:first-child{display:none}`;document.head.append(s)}
  const RD2_TT={due:"該複習",todo:"還沒練會",ok:"練會了",all:"全部錯棋"};
  const pick=k=>{const b=rf.querySelector(`[data-k="${k}"]`);if(b)b.click();const L=v.querySelector("#rl"),X=v.querySelector(".xqs"),S=X&&X._S;
    if(S){if(!X._rd2Mo){X._rd2T0=X.querySelector(".xqs-h b").textContent;X._rd2Mo=new MutationObserver(()=>{if(!X.classList.contains("open")&&X.dataset.rd2){delete X.dataset.rd2;S.title(X._rd2T0)}});X._rd2Mo.observe(X,{attributes:true,attributeFilter:["class"]})}
      X.dataset.rd2=k;S.open(null,RD2_TT[k]);return}
    try{(L||rf).scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}};
  P.querySelector("#rd2Book").onclick=()=>{const c=cnt();pick(c.due?"due":"todo")};P.querySelector("#rd2Stack").onclick=()=>pick("todo");P.querySelector("#rd2Pole").onclick=()=>pick("ok");P.querySelector("#rd2All").onclick=()=>pick("all");
  const draw=()=>{if(!P.isConnected)return;const c=cnt(),fx=P.querySelector(".rd2-fx");
    /* 案角疊冊：還沒練會的題數，最多疊 8 本 */
    const nS=Math.min(8,c.todo||0);fx.querySelector(".rd2-stack").innerHTML=Array.from({length:nS},(_,i)=>{const[x,y]=rd2Pc(RD2_STACK[0]+(i%2?2:-1),RD2_STACK[1]-i*5.5);return`<img class="rd2-bk" src="data/redomap/rd_book.webp?v=${RD2_IMGV}" alt="" style="left:${x}%;top:${y}%">`}).join("");
    /* 竹竿晾冊頁：練會的題數，最多 9 張；每張由程式畫一個朱圈 */
    const nP=Math.min(9,c.ok||0),[[x0,y0],[x1,y1]]=RD2_POLE;fx.querySelector(".rd2-pole").innerHTML=Array.from({length:nP},(_,i)=>{const f=(i+.7)/9.4,x=x0+(x1-x0)*f,y=y0+(y1-y0)*f,[a,b]=rd2Pc(x,y-3);return`<span class="rd2-pg" style="left:${a}%;top:${b}%;--r:${(i%3-1)*3}deg;--d:-${(i*.7%4).toFixed(1)}s"><img src="data/redomap/rd_page.webp?v=${RD2_IMGV}" alt="" style="width:100%;display:block"><i></i></span>`}).join("");
    /* 攤開的冊子上直寫今天要複習幾題 */
    const[tx,ty]=rd2Pc(RD2_BOOK[0]+14,RD2_BOOK[1]-2);fx.querySelector(".rd2-ctxt").innerHTML=`<span class="rd2-txt" style="left:${tx}%;top:${ty}%">${c.due?`今日複習<b>${c.due}</b>題`:"今日無課"}</span>`;
    /* 香篆爐：該複習＝點著；否則煙的長短＝離下次複習幾天 */
    const nx=rd2Next(),[cx,cy]=rd2Pc(RD2_CENSER[0],RD2_CENSER[1]-8),hS=c.due?9:nx?Math.min(9,2+nx*.4):0;
    fx.querySelector(".rd2-cen").innerHTML=(c.due||nx?`<span class="rd2-ember" style="left:${cx}%;top:${cy}%"></span>`:"")+(hS?`<span class="rd2-smoke" style="left:${cx}%;top:${cy}%;height:${hS.toFixed(1)}%"><i></i></span>`:"");
    P.querySelector("#rd2Pole").setAttribute("aria-label",`練會了 ${c.ok||0} 題`);P.querySelector("#rd2Stack").setAttribute("aria-label",`還沒練會 ${c.todo||0} 題`);P.querySelector("#rd2Book").setAttribute("aria-label",`今天該複習 ${c.due||0} 題`);
    const allOk=(c.all||0)>0&&!c.todo&&!c.due;try{if(P._cfg)P._cfg.HS.rd2Pole[3]=allOk?"cheer":"wave"}catch(e){}};
  /* 洗墨池：跟學習頁同一個數（還沒練會＋到期該複習），淡墨→濃墨；清空＝一道清光 */
  const pond=P.querySelector(".rd2-pond");(typeof hbRedoN==="function"?hbRedoN():Promise.resolve(null)).then(n=>{if(n==null||!pond.isConnected)return;pond.insertAdjacentHTML("afterbegin",n>0?`<i class="rd2-ink" style="opacity:${Math.min(.85,.3+n*.06).toFixed(2)}"></i>`:'<i class="rd2-clear"></i>')}).catch(()=>{});
  const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}draw()});mo.observe(rf,{childList:true,subtree:true,characterData:true});draw();
  const cfg=Object.assign({},SHW_PG0,SHW_RD2,{HS:Object.assign({},SHW_RD2.HS,{rd2Pole:SHW_RD2.HS.rd2Pole.slice()})});P._cfg=cfg;
  if(!P.dataset.shw){try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,cfg,"rd2")}catch(e){}}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  return R}
if(typeof Redo==="function"){const f0=Redo;Redo=function(v){const R=f0.apply(this,arguments);try{return rd2Wrap(v,R)}catch(e){return R}}}
