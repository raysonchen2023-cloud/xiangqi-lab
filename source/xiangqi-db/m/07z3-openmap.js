/* ================= 📖 我的開局「矮几棋枰＋紅黑兩冊」（42 案第 4 頁：Gemini 方案 1 為底，Claude 依考究清單修正；考究說明 park/openmap/考究說明.md，史學顧問核圖中）=================
   圖：park/openmap/open_day_v3.png（Gemini 第一張＋兩冊書背局部修平、宣紙濾鏡 0.6）、夜版 open_night_v1.png（月光窗影）→ art/openmap/ → data/openmap/。小素材 0 件。
   從學習頁的「矮几棋枰」進來（#/openings）。場景只放重點，完整清單在宣紙面板：
     招牌開局＝矮几中央的棋枰：程式照透視畫一副正確的棋盤，擺出「你執紅最常下」那一路最常見的前幾步（沒吃子就是 32 子）；
     執紅開局＝左邊朱冊、執黑應法＝右邊墨冊，點開＝宣紙面板（原本的清單）；招牌開局在朱冊上蓋一方朱印；最會輸的那一類在那一冊邊夾一張墨色紙籤「待補」；
     中局著法＝前方長紙籤，程式畫朱（正招）、墨（次好）、淡墨（失誤）三段比例；三盤推薦的大師對局＝右後三卷手卷，點了捲到「推薦練習」。
   角色走到棋枰前待機；點招牌開局歡呼；點夾籤的那冊揮手。開關 OPEN_MAP_ON；圖片網址帶 KJ2_IMGV；前綴 kj2。包一層 Openings */
const OPEN_MAP_ON=true;
const KJ2_IMGV="2410";
const KJ2_BOARD=[[240,412],[535,412],[560,654],[214,654]];   /* 棋枰上面四角（像素 768×1376） */
const KJ2_SLIP=[[252,722],[526,722],[530,786],[248,786]];
const KJ2_RED=[148,572],KJ2_BLK=[632,610],KJ2_SCR=[585,448];
const SHW_KJ2={el:40,h:[.085,92,.0028],look0:[50,40],home:"home",N:{home:[50,97],front:[50,80],fl:[24,78],tl:[16,55],fr:[76,78],tr:[83,55]},E:"home-front front-fl front-fr home-fl home-fr",
  T:{tl:"low",tr:"low"},   /* 回饋 820：矮几桌面可以走，繞過朱冊、棋枰、墨冊、手卷、紙籤；左前、右前兩個跳點；身高照矮几前那一點的透視、往後只縮一點 */
  TB:{low:{poly:[[15,25.5],[86,25.5],[96,59],[4,59]],hy:[59,80,.2],hops:[["fl",[16,55]],["fr",[83,55]]],
    ob:[[[11,35.5],[28.5,35.5],[26.5,47.5],[9.5,47.5]],[[31,30],[69.5,30],[72.5,50.5],[28,50.5]],[[73,38],[89.5,38],[91.5,50],[75,50]],[[62,25],[67,24.5],[91,34.5],[84,36.5],[62,28]],[[33,52.5],[68,52.5],[68.5,57],[32,57]]]}},   /* 回饋 816：點矮几桌面＝跳上比較近的那一角 */   /* 身高照「矮几前」那一點的透視（這頁透視縮得快，照桌腳會太小） */   /* 回饋 808：點朱冊／墨冊＝跳上矮几前面左右兩角（冊子前的空處，不站在棋枰和紙籤上） */
  HS:{kj2Brd:["front",50,38,"cheer"],kj2Red:["tl",20,42,"idle"],kj2Blk:["tr",82,44,"idle"],kj2Slip:["front",50,55,"idle"],kj2Scr:["front",76,32,"idle"]}};
const kj2Pc=(x,y)=>[(x/7.68).toFixed(2),(y/13.76).toFixed(2)];
const kj2Dark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
function kj2M3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
function kj2Css(){if(document.getElementById("kj2Css"))return;const s=document.createElement("style");s.id="kj2Css";s.textContent=`
.kj2-page{margin:0 0 6px}
.kj2-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.kj2-q{position:absolute;left:0;top:0;transform-origin:0 0}.kj2-q svg{display:block;width:100%;height:100%}
.kj2-night .kj2-q{filter:brightness(.8) saturate(.85)}
.kj2-seal{position:absolute;transform:translate(-50%,-50%) rotate(-10deg);width:5.4%;aspect-ratio:1;border:2px solid #f3e6c8;border-radius:2px;color:#f3e6c8;font:900 14px/1 var(--kai,var(--serif,serif));display:flex;align-items:center;justify-content:center;background:rgba(178,58,38,.92);box-shadow:0 1px 2px rgba(0,0,0,.35)}
.kj2-tab{position:absolute;transform:translate(-50%,-100%);width:3.2%;padding:4px 0 6px;background:#2a2420;color:#efe6d2;font:800 10.5px/1.15 var(--kai,var(--serif,serif));writing-mode:vertical-rl;text-align:center;box-shadow:1px 1px 2px rgba(0,0,0,.35)}
.kj2-page .shp-spot.kj2-tag b{white-space:nowrap}
.kj2-pan .op-card{margin:0}`;document.head.append(s)}
/* 棋盤＋棋子（局面 b：90 格，大寫紅） */
function kj2BoardSVG(b){const W=300,H=330,ox=20,oy=18,cw=(W-2*ox)/8,ch=(H-2*oy)/9;let g="";
  for(let j=0;j<10;j++)g+=`<line x1="${ox}" y1="${(oy+j*ch).toFixed(1)}" x2="${W-ox}" y2="${(oy+j*ch).toFixed(1)}"/>`;
  for(let i=0;i<9;i++){const x=(ox+i*cw).toFixed(1);g+=(i===0||i===8)?`<line x1="${x}" y1="${oy}" x2="${x}" y2="${(oy+9*ch).toFixed(1)}"/>`:`<line x1="${x}" y1="${oy}" x2="${x}" y2="${(oy+4*ch).toFixed(1)}"/><line x1="${x}" y1="${(oy+5*ch).toFixed(1)}" x2="${x}" y2="${(oy+9*ch).toFixed(1)}"/>`}
  const X=i=>(ox+i*cw).toFixed(1),Y=j=>(oy+j*ch).toFixed(1);g+=`<path d="M${X(3)} ${Y(0)}L${X(5)} ${Y(2)}M${X(5)} ${Y(0)}L${X(3)} ${Y(2)}M${X(3)} ${Y(7)}L${X(5)} ${Y(9)}M${X(5)} ${Y(7)}L${X(3)} ${Y(9)}"/>`;
  let p="";for(let k=0;k<90;k++){const x=b[k];if(!x)continue;const r=x===x.toUpperCase(),n=NAMES[r?"r":"b"][x.toUpperCase()]||"",cx=ox+(k%9)*cw,cy=oy+Math.floor(k/9)*ch;
    p+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(cw*.44).toFixed(1)}" fill="#f1e2bf" stroke="${r?"#b8322a":"#2a2420"}" stroke-width="1.6"/><text x="${cx.toFixed(1)}" y="${(cy+5.6).toFixed(1)}" text-anchor="middle" font-size="16" font-weight="900" fill="${r?"#b8322a":"#2a2420"}" font-family="var(--kai,serif)">${n}</text>`}
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><g stroke="#5a3a1c" stroke-width="1.3" fill="none">${g}</g>${p}</svg>`}
/* 中局著法紙籤：朱＝正招、墨＝次好、淡墨＝失誤 */
function kj2SlipSVG(m){const W=280,H=64,n=(m.g||0)+(m.o||0)+(m.b||0);if(!n)return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><text x="140" y="38" text-anchor="middle" font-size="15" fill="#6a5640" font-family="var(--serif,serif)">中局著法・還沒有評過等</text></svg>`;
  const L=16,R=W-16,w=R-L,a=w*m.g/n,b=w*m.o/n,c=w*m.b/n,pc=x=>Math.round(x*100/n);
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><rect x="${L}" y="14" width="${a.toFixed(1)}" height="16" fill="#b23a26"/><rect x="${(L+a).toFixed(1)}" y="14" width="${b.toFixed(1)}" height="16" fill="#2a2420"/><rect x="${(L+a+b).toFixed(1)}" y="14" width="${c.toFixed(1)}" height="16" fill="rgba(42,36,32,.35)"/>
    <text x="${L}" y="52" font-size="13" fill="#2a1d12" font-family="var(--serif,serif)">正招 ${pc(m.g)}%・次好 ${pc(m.o)}%・失誤 ${pc(m.b)}%</text></svg>`}
/* 從自己的對局整理：招牌開局（執紅最常下）和它最常見的前幾步、最會輸的一類、中局著法比例（跟 04 的 Openings 同一套判斷） */
async function kj2Data(){const gs=(await myGames(150)).filter(g=>!g.it.mid&&isStdStart(g.it.board)),T={r:{},b:{}},mid={g:0,o:0,b:0},seq={};
  for(const g of gs){const name=g.side==="r"?redOpening(g.moves[0].cn):blackDefence(g.moves)+(g.moves[0]?`（對${redOpening(g.moves[0].cn)}）`:"");
    const row=T[g.side][name]||(T[g.side][name]={n:0,w:0,l:0,d:0});row.n++;if(g.res)row[g.res]++;
    if(g.side==="r"){const k=g.moves.slice(0,6).map(m=>m.f+"-"+m.t).join(",");const S=seq[name]||(seq[name]={});S[k]=(S[k]||0)+1}
    try{const R=gameReport(g.it.board,g.moves);for(const p of R.plies)if(p.by===g.side&&p.phase==="mid"&&p.q&&p.q!=="—"){const k=QGOOD.includes(p.q)?"g":QOK.includes(p.q)?"o":QBAD.includes(p.q)?"b":null;if(k)mid[k]++}}catch(e){}}
  const fav=Object.entries(T.r).sort((a,b)=>b[1].n-a[1].n)[0],bad=[...Object.entries(T.r).map(([n,r])=>({n,sd:"r",r})),...Object.entries(T.b).map(([n,r])=>({n,sd:"b",r}))].filter(x=>x.r.n>=3&&x.r.l>0).sort((a,b)=>b.r.l/b.r.n-a.r.l/a.r.n)[0]||null;
  let moves=[];if(fav){const S=seq[fav[0]]||{},top=Object.entries(S).sort((a,b)=>b[1]-a[1])[0];if(top)moves=top[0].split(",").filter(Boolean).map(s=>s.split("-").map(Number))}
  return{fav,bad,mid,moves,n:gs.length}}
function kj2Wrap(v,R0){if(!OPEN_MAP_ON||!v.querySelector("#ob"))return R0;kj2Css();
  const dk=kj2Dark(),P=document.createElement("div");P.className="shp-page cq kj2-page"+(dk?" kj2-night":"");
  const sp=(id,x,y,t)=>{const[a,b]=kj2Pc(x,y);return`<button class="shp-spot kj2-tag" id="${id}" style="left:${a}%;top:${b}%"><b>${t}</b></button>`};
  P.innerHTML=`<img src="${xqClImg(`data/openmap/${dk?"open_night":"open_day"}.webp?v=${KJ2_IMGV}`)}" alt="書齋矮几上的棋枰和紅黑兩冊譜">
    <div class="kj2-fx"><div class="kj2-q" data-q="b" style="width:300px;height:330px"></div><div class="kj2-q" data-q="s" style="width:280px;height:64px"></div><div class="kj2-mk"></div></div>
    ${sp("kj2Brd",387,385,"招牌開局")}${sp("kj2Red",KJ2_RED[0],KJ2_RED[1]-112,"執紅開局")}${sp("kj2Blk",KJ2_BLK[0],KJ2_BLK[1]-112,"執黑應法")}${sp("kj2Slip",388,818,"中局著法")}${sp("kj2Scr",600,372,"推薦對局")}`;
  v.insertBefore(P,v.firstChild);
  const Q=k=>P.querySelector(`[data-q="${k}"]`),fit=()=>{const k=P.clientWidth/768;if(!k)return;const sc=q=>q.map(([x,y])=>[x*k,y*k]);Q("b").style.transform=kj2M3(300,330,sc(KJ2_BOARD));Q("s").style.transform=kj2M3(280,64,sc(KJ2_SLIP))};
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!P.isConnected){ro.disconnect();return}fit()});ro.observe(P)}fit();
  Q("b").innerHTML=kj2BoardSVG(parseFen(START));Q("s").innerHTML=kj2SlipSVG({});
  /* 點冊：把原本那一段清單放進宣紙面板 */
  const secOf=t=>[...v.querySelectorAll("#ob .sec-t")].find(x=>x.textContent.includes(t));
  const pan=(t,title)=>{const s=secOf(t),c=s&&s.nextElementSibling;if(!c){toast("還沒有自己的對局，下幾盤就會統計");return}sheet(title,b=>{b.classList.add("kj2-pan");b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(s.textContent)}</div>`;b.append(c.cloneNode(true))})};
  const go=t=>{const s=secOf(t)||v.querySelector("#ob");try{s.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}};
  /* 回饋 833（開發者 11/9：四頁也改成一對一）：點圖上的東西＝面板只看那一塊，標題換成入口名（照 832 我的戰績的做法）。
     #ob 裡的每一塊先標上 data-kj2b：朱冊＝執紅（red）、墨冊＝執黑（blk）、紙籤＝中局著法（mid）、手卷＝推薦練習（scr）、棋枰＝最上面那張「你執紅最常下…」（brd；還沒有對局時是那張提示）；
     底下「開局名稱依…」的小字跟執紅、執黑走。#ob 晚一點才排好、推薦練習又更晚插進來，所以 #ob 一有變動就重標。
     面板上記 data-kj2＝目前那一塊，CSS 藏掉其他的；面板收起（class 沒了 open）就拿掉 data-kj2、標題換回頁名。面板是 07w 的 xqSheetAuto 晚一點（0～700ms）才建的，所以點的當下才去拿；
     還沒建好就照舊（冊子開小面板、其他捲過去）。原本冊子用的另一張 sheet() 小面板，改成同一張面板，跟其他入口一樣夾在頂欄和底欄中間 */
  const kj2K=t=>/執紅/.test(t)?"red":/執黑/.test(t)?"blk":/中局/.test(t)?"mid":/推薦/.test(t)?"scr":"";
  const kj2Tag=()=>{const ob=v.querySelector("#ob");if(!ob)return;let cur="";
    for(const c of ob.children){let k="";const st=c.querySelector(":scope>.sec-t");
      if(c.classList.contains("sec-t"))k=cur=kj2K(c.textContent);else if(st)k=kj2K(st.textContent);else if(c.tagName==="P")k="red blk";else if(c.classList.contains("card")&&!cur)k="brd";else k=cur;
      if(k)c.dataset.kj2b=k;else delete c.dataset.kj2b}};
  if(!document.getElementById("kj2OneCss")){const s=document.createElement("style");s.id="kj2OneCss";s.textContent=["brd","red","blk","mid","scr"].map(k=>`.xqs[data-kj2="${k}"] #ob>:not([data-kj2b~="${k}"]){display:none}`).join("\n");document.head.append(s)}
  {const ob=v.querySelector("#ob");if(ob){const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}kj2Tag()});mo.observe(ob,{childList:true});kj2Tag()}}
  const one=(k,t)=>{kj2Tag();const X=v.querySelector(".xqs"),S=X&&X._S;if(!S)return false;
    if(!X._kj2Mo){X._kj2T0=X.querySelector(".xqs-h b").textContent;X._kj2Mo=new MutationObserver(()=>{if(!X.classList.contains("open")&&X.dataset.kj2){delete X.dataset.kj2;S.title(X._kj2T0)}});X._kj2Mo.observe(X,{attributes:true,attributeFilter:["class"]})}
    if(!v.querySelector(`#ob>[data-kj2b~="${k}"]`)){const ld=!v.querySelector("#ob>.card,#ob>.sec-t,#ob [data-kj2b]");
      toast(ld?"還在整理你下過的對局，請等一下":k==="scr"?"正在挑推薦的大師對局，請等一下":k==="brd"?"還沒有執紅的對局，下幾盤執紅就找得出招牌開局":"還沒有自己的對局，下幾盤就會統計");return true}
    X.dataset.kj2=k;S.open(null,t);return true};
  P.querySelector("#kj2Red").onclick=()=>{if(!one("red","執紅開局"))pan("執紅","📕 執紅開局")};P.querySelector("#kj2Blk").onclick=()=>{if(!one("blk","執黑應法"))pan("執黑","📘 執黑應法")};
  P.querySelector("#kj2Slip").onclick=()=>{if(!one("mid","中局著法"))go("中局")};P.querySelector("#kj2Scr").onclick=()=>{if(!one("scr","推薦對局"))go("推薦")};
  P.querySelector("#kj2Brd").onclick=()=>{if(one("brd","招牌開局"))return;const c=v.querySelector("#ob .card");try{(c||v.querySelector("#ob")).scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}};
  const cfg=Object.assign({},SHW_PG0,SHW_KJ2,{HS:Object.assign({},SHW_KJ2.HS,{kj2Red:SHW_KJ2.HS.kj2Red.slice(),kj2Blk:SHW_KJ2.HS.kj2Blk.slice()})});
  kj2Data().then(D=>{if(!P.isConnected)return;
    const b=parseFen(START);for(const[f,t]of D.moves){if(b[f]){b[t]=b[f];b[f]=null}}Q("b").innerHTML=kj2BoardSVG(b);Q("s").innerHTML=kj2SlipSVG(D.mid);
    let mk="";if(D.fav){const[a,c]=kj2Pc(KJ2_RED[0]+22,KJ2_RED[1]+40);mk+=`<span class="kj2-seal" style="left:${a}%;top:${c}%" title="招牌開局：${esc(D.fav[0])}">招</span>`;P.querySelector("#kj2Brd b").textContent="招牌・"+D.fav[0]}
    if(D.bad){const B=D.bad.sd==="r"?KJ2_RED:KJ2_BLK,[a,c]=kj2Pc(B[0]+(D.bad.sd==="r"?-56:56),B[1]+30);mk+=`<span class="kj2-tab" style="left:${a}%;top:${c}%">待補</span>`;
      const id=D.bad.sd==="r"?"kj2Red":"kj2Blk";cfg.HS[id][3]="wave";P.querySelector("#"+id).setAttribute("aria-label",`${D.bad.sd==="r"?"執紅開局":"執黑應法"}・最會輸：${D.bad.n}`)}
    P.querySelector(".kj2-mk").innerHTML=mk}).catch(()=>{});
  if(!P.dataset.shw){try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,cfg,"kj2")}catch(e){}}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  return R0}
if(typeof Openings==="function"){const f0=Openings;Openings=function(v){const R=f0.apply(this,arguments);try{return kj2Wrap(v,R)}catch(e){return R}}}
