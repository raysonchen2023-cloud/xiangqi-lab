/* ================= 📋 我的戰績「書院朱紅榜（放大）」（42 案第 3 頁：Gemini 方案 1＋方案 2 的戰功簿感，Claude 依考究清單修正；考究說明 park/statmap/考究說明.md，史學顧問核圖中）=================
   圖：park/statmap/stat_day_v2.png（Gemini 一次到位＋宣紙濾鏡 0.6）、夜版 stat_night_v1.png（簷下紗燈點亮）→ art/statmap/ → data/statmap/。小素材 0 件，其餘都由程式畫。
   從學習頁的「朱紅榜」、線上大廳的「我的戰績」木牌進來（#/stats）。榜上一眼三件事（程式疊）：
     我現在幾段＝榜心大字＋朱印（有線上用線上段位，沒有用電腦積分挑戰的段位）；離下一段多遠＝榜下緣一道朱線，越長越接近；
     哪一項最弱＝榜左的五邊形（開局、中局、殘局、殺法、穩定，跟原本 skillAxes／skillPick 同一套），最弱的一角加朱圈、旁註「建議先練」。
   四個分頁各是一樣東西：總覽＝朱紅榜、對局紀錄＝案上課簿（開總覽並捲到對局紀錄）、我的成長＝案上手卷、電腦＝靠窗棋桌（程式照透視蓋上一副正確的棋盤，
     桌緣一排朱圈＝自選難度過關了幾級）、線上＝簷下紗燈（燈上直寫線上段位）。點了＝按原本 04-stats 的分頁鈕，下面內容照舊。
   段位不用官帽、補子（角色頁已有官階）。角色從下方走到榜前待機。開關 STAT_MAP_ON；圖片網址帶 JZ2_IMGV；前綴 jz2。包一層 Stats */
const STAT_MAP_ON=true;
const JZ2_IMGV="2400";
const JZ2_BOARD=[92,352,615,602];   /* 榜面（左、上、右、下，像素 768×1376） */
const JZ2_TABLE=[[574,987],[736,984],[758,1086],[613,1090]];   /* 棋桌桌面四角 */
const JZ2_LAMP=[632,312],JZ2_BOOK=[225,715],JZ2_SCROLL=[480,712];
const SHW_JZ2={el:40,h:[.085,92,.0028],look0:[46,40],home:"home",N:{home:[45,97],mid:[46,82],desk:[44,70],tbl:[62,86]},E:"home-mid mid-desk mid-tbl",
  HS:{jz2Rank:["desk",44,34,"idle"],jz2Book:["desk",29,52,"idle"],jz2Scroll:["desk",62,52,"idle"],jz2Tbl:["tbl",86,75,"idle"],jz2Lamp:["desk",82,23,"idle"]}};
const jz2Pc=(x,y)=>[(x/7.68).toFixed(2),(y/13.76).toFixed(2)];
const jz2Dark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
function jz2M3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
function jz2Css(){if(document.getElementById("jz2Css"))return;const s=document.createElement("style");s.id="jz2Css";s.textContent=`
.jz2-page{margin:0 0 6px}
.jz2-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.jz2-board{position:absolute}.jz2-board svg,.jz2-tq svg{display:block;width:100%;height:100%}
.jz2-tq{position:absolute;left:0;top:0;width:200px;height:225px;transform-origin:0 0}
.jz2-lamp{position:absolute;transform:translate(-50%,-50%);writing-mode:vertical-rl;font:900 12px/1.1 var(--kai,var(--serif,serif));color:#7a2a1a;letter-spacing:.1em;white-space:nowrap}
.jz2-night .jz2-board{filter:sepia(.12)}
.jz2-page .shp-spot.jz2-tag b{white-space:nowrap}
.jz2-hit{position:absolute;border:0;background:none;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.st .st-lv .w.jz2-ok{display:inline-block;width:18px;height:18px;border:2px solid #b23a26;border-radius:50%;color:transparent;font-size:0;vertical-align:middle}`;document.head.append(s)}
/* 朱紅榜：左邊五邊形（最弱一角朱圈＋建議先練），右邊段位大字＋朱印，下緣朱線＝離下一段多遠 */
function jz2BoardSVG(R,lab,A,pk){const W=523,H=250;let g="";
  /* 五邊形 */
  const cx=110,cy=128,r=78,ax=A&&A.length?A:[],n=ax.length||5,pt=(i,f)=>{const t=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(t)*r*f,cy+Math.sin(t)*r*f]};
  for(const f of[1,.66,.33])g+=`<polygon points="${Array.from({length:n},(_,i)=>pt(i,f).map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="rgba(60,40,24,${f===1?.6:.28})" stroke-width="${f===1?1.4:1}"/>`;
  for(let i=0;i<n;i++){const[x,y]=pt(i,1);g+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(60,40,24,.25)"/>`}
  if(ax.length){const vs=ax.map((a,i)=>pt(i,a.v!=null?Math.max(.06,Math.min(1,a.v/100)):.06));g+=`<polygon points="${vs.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="rgba(178,58,38,.18)" stroke="#9a3020" stroke-width="1.8"/>`;
    ax.forEach((a,i)=>{const[x,y]=pt(i,1.24);g+=`<text x="${x.toFixed(1)}" y="${(y+5).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="800" fill="#2a1d12" font-family="var(--kai,serif)">${esc(a.k)}</text>`});
    if(pk&&pk.weak){const i=ax.indexOf(pk.weak);if(i>=0){const[x,y]=pt(i,1.24);g+=`<circle cx="${x.toFixed(1)}" cy="${(y).toFixed(1)}" r="16" fill="none" stroke="#b23a26" stroke-width="2.2"/><text x="${cx}" y="${H-10}" text-anchor="middle" font-size="13" font-weight="800" fill="#b23a26" font-family="var(--kai,serif)">建議先練・${esc(pk.weak.k)}</text>`}}}
  else g+=`<text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="12" fill="#6a5640" font-family="var(--serif,serif)">下完幾盤，畫出五邊形</text>`;
  /* 段位 */
  const mx=372;if(R){g+=`<text x="${mx}" y="58" text-anchor="middle" font-size="15" fill="#5a4632" font-family="var(--serif,serif)">${esc(lab)}</text><text x="${mx}" y="132" text-anchor="middle" font-size="58" font-weight="900" fill="#2a1d12" font-family="var(--kai,serif)">${esc(R.rank)}</text>`;
    g+=`<g transform="rotate(-8 ${mx+92} 112)"><rect x="${mx+72}" y="92" width="40" height="40" rx="3" fill="rgba(255,236,226,.35)" stroke="#b23a26" stroke-width="2.6"/><text x="${mx+92}" y="${92+29}" text-anchor="middle" font-size="24" font-weight="900" fill="#b23a26" font-family="var(--kai,serif)">段</text></g>`;
    g+=`<text x="${mx}" y="166" text-anchor="middle" font-size="15" fill="#3a2a1a" font-family="var(--serif,serif)">${R.pts} 分・${R.w} 勝 ${R.l} 負 ${R.d} 和</text>`;
    const pc=R.hi?Math.max(0,Math.min(1,(R.pts-R.lo)/(R.hi-R.lo))):1,x0=250,x1=500;
    g+=`<line x1="${x0}" y1="${H-26}" x2="${x1}" y2="${H-26}" stroke="rgba(60,40,24,.25)" stroke-width="5" stroke-linecap="round"/><line x1="${x0}" y1="${H-26}" x2="${(x0+(x1-x0)*pc).toFixed(1)}" y2="${H-26}" stroke="#b23a26" stroke-width="5" stroke-linecap="round"/>`;
    g+=`<text x="${mx}" y="${H-38}" text-anchor="middle" font-size="13" fill="#5a4632" font-family="var(--serif,serif)">${R.next?`再 ${R.toNext} 分升 ${esc(R.next)}`:"已是最高段位"}</text>`}
  else g+=`<text x="${mx}" y="128" text-anchor="middle" font-size="16" fill="#5a4632" font-family="var(--serif,serif)">下一盤晉級賽或線上對局，就會上榜</text>`;
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${g}</svg>`}
/* 棋桌：一副正確的棋盤（9 路 10 線、河界、九宮斜線）＋桌緣朱圈＝自選難度過關幾級 */
function jz2TableSVG(nOk){const W=200,H=225,ox=14,oy=12,cw=(W-2*ox)/8,ch=(H-2*oy-16)/9;let g=`<rect x="0" y="0" width="${W}" height="${H}" fill="#d9c49a"/><rect x="4" y="4" width="${W-8}" height="${H-8}" fill="none" stroke="rgba(90,60,30,.5)" stroke-width="1.5"/>`;
  for(let j=0;j<10;j++)g+=`<line x1="${ox}" y1="${(oy+j*ch).toFixed(1)}" x2="${W-ox}" y2="${(oy+j*ch).toFixed(1)}"/>`;
  for(let i=0;i<9;i++){const x=(ox+i*cw).toFixed(1);g+=(i===0||i===8)?`<line x1="${x}" y1="${oy}" x2="${x}" y2="${(oy+9*ch).toFixed(1)}"/>`:`<line x1="${x}" y1="${oy}" x2="${x}" y2="${(oy+4*ch).toFixed(1)}"/><line x1="${x}" y1="${(oy+5*ch).toFixed(1)}" x2="${x}" y2="${(oy+9*ch).toFixed(1)}"/>`}
  const X=i=>(ox+i*cw).toFixed(1),Y=j=>(oy+j*ch).toFixed(1);g+=`<path d="M${X(3)} ${Y(0)}L${X(5)} ${Y(2)}M${X(5)} ${Y(0)}L${X(3)} ${Y(2)}M${X(3)} ${Y(7)}L${X(5)} ${Y(9)}M${X(5)} ${Y(7)}L${X(3)} ${Y(9)}"/>`;
  let c="";const k=Math.min(16,nOk||0);for(let i=0;i<k;i++)c+=`<circle cx="${(12+i*11.5).toFixed(1)}" cy="${H-8}" r="4.2" fill="none" stroke="#b23a26" stroke-width="1.5"/>`;
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><g stroke="#5a3a1c" stroke-width="1.1" fill="none">${g}</g>${c}</svg>`}
function jz2Wrap(v,R0){if(!STAT_MAP_ON||!v.querySelector("#sTabs"))return R0;jz2Css();
  const dk=jz2Dark(),P=document.createElement("div");P.className="shp-page cq jz2-page"+(dk?" jz2-night":"");
  const sp=(id,x,y,t)=>{const[a,b]=jz2Pc(x,y);return`<button class="shp-spot jz2-tag" id="${id}" style="left:${a}%;top:${b}%"><b>${t}</b></button>`},[bl,bt,br,bb]=JZ2_BOARD;
  const NET=!!(OFF&&window.XQNet);
  P.innerHTML=`<img src="${xqClImg(`data/statmap/${dk?"stat_night":"stat_day"}.webp?v=${JZ2_IMGV}`)}" alt="書院廊下的朱紅榜">
    <div class="jz2-fx"><div class="jz2-board" style="left:${(bl/7.68).toFixed(2)}%;top:${(bt/13.76).toFixed(2)}%;width:${((br-bl)/7.68).toFixed(2)}%;height:${((bb-bt)/13.76).toFixed(2)}%"></div><div class="jz2-tq"></div><div class="jz2-lw"></div></div>
    <button type="button" class="jz2-hit" data-to="jz2Rank" aria-label="朱紅榜：段位、進度、五邊形" style="left:${(bl/7.68).toFixed(2)}%;top:${(bt/13.76).toFixed(2)}%;width:${((br-bl)/7.68).toFixed(2)}%;height:${((bb-bt)/13.76).toFixed(2)}%"></button><button type="button" class="jz2-hit" data-to="jz2Tbl" aria-label="棋桌：電腦" style="left:74.7%;top:71.5%;width:24.2%;height:7.8%"></button>
    ${sp("jz2Rank",354,330,"📋 總覽")}${sp("jz2Book",JZ2_BOOK[0],JZ2_BOOK[1]-48,"課簿・對局紀錄")}${sp("jz2Scroll",JZ2_SCROLL[0],JZ2_SCROLL[1]-48,"手卷・我的成長")}${sp("jz2Tbl",665,950,"棋桌・電腦")}${NET?sp("jz2Lamp",632,230,"紗燈・線上"):""}`;
  v.insertBefore(P,v.firstChild);
  const tq=P.querySelector(".jz2-tq"),fit=()=>{const k=P.clientWidth/768;if(!k)return;tq.style.transform=jz2M3(200,225,JZ2_TABLE.map(([x,y])=>[x*k,y*k]))};
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!P.isConnected){ro.disconnect();return}fit()});ro.observe(P)}fit();
  /* 回饋 828（開發者 11/9）：頁面只留滿版圖。原本接在圖下的戰績（四個分頁、對局紀錄、成長、電腦、線上）整塊收進一張面板（07w 的 xqSheet，照 812 修正紀錄的做法）：
     點榜上的標籤（或榜面、棋桌本身）＝切到那一分頁、展開面板、捲到那一塊；面板裡照舊可以切分頁；返回鍵、點外面、✕ 收起 */
  const tab=k=>{const b=v.querySelector(`#sTabs button[data-k="${k}"]`);if(b)b.click();return b};
  const TT={all:"朱紅榜・總覽",talent:"手卷・我的成長",cpu:"棋桌・電腦",net:"紗燈・線上"};
  const SH=typeof xqSheet==="function"?xqSheet(v,{t:"我的戰績"}):null;if(SH)xqSheetMove(v,P,SH);
  /* 回饋 832（開發者 11/9「我的戰績也要跟改，因為會看到相鄰的頁面，我希望 1 對 1」）：面板裡不再放分頁鈕，點哪樣東西就只看那一塊——
     朱紅榜＝總覽（不含對局紀錄）、課簿＝只有對局紀錄、手卷＝我的成長、棋桌＝電腦、紗燈＝線上。面板上記 data-jz2＝目前那一塊，CSS 藏掉其他的 */
  if(SH&&!document.getElementById("jz2OneCss")){const s=document.createElement("style");s.id="jz2OneCss";s.textContent=`.xqs[data-jz2] #sTabs{display:none}
.xqs[data-jz2="hist"] #sBody>*:not(#sHist){display:none}.xqs[data-jz2="hist"] #sWk{display:none}
.xqs[data-jz2="all"] #sHist,.xqs[data-jz2="all"] #sBody>.sec-t:has(+#sHist){display:none}`;document.head.append(s)}
  const show=(k,sel,t)=>{tab(k);if(SH){SH.el.dataset.jz2=sel==="#sHist"?"hist":k;SH.open(null,t||TT[k])}else setTimeout(()=>{const e=v.querySelector(sel||"#sTabs");try{e.scrollIntoView({behavior:"smooth",block:"start"})}catch(err){}},250)};
  P.querySelector("#jz2Rank").onclick=()=>show("all");
  P.querySelector("#jz2Book").onclick=()=>show("all","#sHist","課簿・對局紀錄");
  P.querySelector("#jz2Scroll").onclick=()=>show("talent");
  P.querySelector("#jz2Tbl").onclick=()=>show("cpu");
  const lb=P.querySelector("#jz2Lamp");if(lb)lb.onclick=()=>show("net");
  P.querySelectorAll(".jz2-hit").forEach(h=>h.onclick=()=>{vibrate(5);const t=P.querySelector("#"+h.dataset.to);if(t)t.click()});
  if(SH){const tb=v.querySelector("#sTabs");if(tb)tb.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("button[data-k]");if(b&&TT[b.dataset.k]){SH.title(TT[b.dataset.k]);SH.el.dataset.jz2=b.dataset.k}})}
  /* 資料：段位（線上優先）、自選難度過關幾級、五邊形 */
  let R=null,lab="",A=null,pk=null,nOk=0;
  const paint=()=>{if(!P.isConnected)return;P.querySelector(".jz2-board").innerHTML=jz2BoardSVG(R,lab,A,pk);tq.innerHTML=jz2TableSVG(nOk);
    const lw=P.querySelector(".jz2-lw");if(NET){let O=null;try{O=XQNet.rating()}catch(e){}const[a,b]=jz2Pc(...JZ2_LAMP);lw.innerHTML=O?`<span class="jz2-lamp" style="left:${a}%;top:${b}%">${esc(O.rank)}</span>`:""}};
  if(NET){try{R=XQNet.rating();lab="線上段位"}catch(e){}}
  paint();
  api("/play/state").then(ST=>{if(!ST)return;nOk=(ST.levels||[]).filter(l=>((ST.record||{})[l.n]||{}).w).length;if(!R&&ST.cpuRate){R=ST.cpuRate;lab="電腦段位・晉級賽"}paint()}).catch(()=>{});
  (async()=>{try{const{G}=await skillRows();A=skillAxes(G,tlIRT(store.get("quizLog",[])));pk=skillPick(A);paint()}catch(e){}})();
  /* 電腦分頁的過關 ✔ 改成朱圈 */
  const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}v.querySelectorAll(".st-lv .w").forEach(x=>{if(x.textContent==="✔"&&!x.classList.contains("jz2-ok")){x.classList.add("jz2-ok");x.setAttribute("aria-label","過關")}})});
  const body=v.querySelector("#sBody");if(body)mo.observe(body,{childList:true,subtree:true});
  if(!P.dataset.shw){try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_JZ2),"jz2")}catch(e){}}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  return R0}
if(typeof Stats==="function"){const f0=Stats;Stats=function(v){const R=f0.apply(this,arguments);try{return jz2Wrap(v,R)}catch(e){return R}}}
