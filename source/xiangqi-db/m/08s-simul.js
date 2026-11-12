/* ================= 🀄 車輪戰（開發者 11/11 hspx「真實情況下只有特級大師才會一對十，讓玩家也能體驗一對多」）=================
   一個人同時跟 3／5／10 位電腦棋客下，全部執紅先走；級數以中心級為準、由弱到強排一圈（每桌差一級；local.js /simul/*）。
   版面（開發者 11/11：環景繞著走操作太麻煩，評估後用平面棋盤；ChatGPT 16 號方案 A＋B 合併）：棋盤上方一排桌牌，一眼看到哪桌輪到你；
   走一步就自動換到下一桌輪到你的那桌（像大師繞場），也可以自己點桌牌換桌；棋客都在想的時候停在原桌，有人下好了自動換過去（剛手動換桌的 4 秒內不自動換）。
   全部下完跳總表（幾勝幾和幾負、得分、每桌一行、各盤數最佳紀錄）。不算段位、不記各級戰績；也不算進「我的棋力」（開發者 11/11 照統計複查：同時下很多盤注意力分散，會把棋力拉低），另記車輪戰戰績。入口在茶肆二樓左邊廂房（07y-hubmap hbSimul） */
/* 開發者 11/11 hspx「車輪戰也加入戰績的特殊成就」（ChatGPT 17 號＋Gemini 78 號，開發者選照 Claude 合併的建議）：
   [代號, 名稱, 條件, 分不分印, 能不能當大廳稱號]。印看中心級數：青印 1～6、朱印 7～12、金印 13～18 級（防刷：第 1 級刷全勝只拿得到青印）；判定在 local.js smEnd。
   完整清單放「我的戰績 → 電腦」（04-stats 呼叫 simAchHTML），總表只多一行「新印」，不另外跳視窗；朱印以上的五個進大百科稱號（07i-codex）、大廳稱號（06-cpu XQ_TITLE 的 simTitle）。
   名稱不掛查不到出處的典故（Gemini 寫的「平分秋色＝楚漢鴻溝」「三戰三捷出自左傳」都不對，沒採用）；「堅持到底」只給自己看 */
const SIM_ACH=[["first","初次繞場","完成一場車輪戰",0,0],["w3","三桌全勝","3 盤車輪戰全勝",1,0],["p5","五路穩","5 盤車輪戰得 4 分以上（勝 1 分、和 0.5 分）",1,0],
  ["w5","五關捷","5 盤車輪戰全勝",1,1],["king","擒王","5 盤或 10 盤車輪戰，打贏本場最強的那一桌",1,1],["nl","不敗輪","5 盤或 10 盤車輪戰一盤都沒輸（和也算）",1,1],
  ["p10","十方破","10 盤車輪戰得 8 分以上",1,1],["w10","滿堂紅","10 盤車輪戰全勝",1,1],["grit","堅持到底","5 盤或 10 盤車輪戰一盤沒贏，但每桌都下到最後",0,0]],
  SIM_TIER=["","青印","朱印","金印"],SIM_TC=["","#2f7d6d","#C8102E","#b8860b"];
/* 車輪戰的資料是 local.js 存的（localStorage「xq_」開頭），畫面這邊的 store 是「m_」開頭，要直接讀（跟 06-cpu 讀 xq_cpuRate 一樣） */
const simLs=k=>{try{return JSON.parse(localStorage.getItem("xq_"+k)||"null")}catch(e){return null}};
function simTitle(){try{const A=simLs("simulAch")||{};for(const k of["w10","p10","w5","nl","king"]){const o=A[k];if(o&&o.tier>=2)return SIM_ACH.find(x=>x[0]===k)[1]}}catch(e){}return""}
function simAchHTML(){const A=simLs("simulAch")||{},C=simLs("simulRec")||{},B=simLs("simulBest")||{},P={plays:0,w:0,d:0,l:0,perfect:0};
  for(const c of Object.values(C))for(const k in P)P[k]+=c[k]||0;const got=SIM_ACH.filter(x=>A[x[0]]).length;
  return`<div class="sec-t">🀄 車輪戰<small class="muted" style="font-weight:400;font-size:12px;margin-left:6px">特殊成就 ${got}／${SIM_ACH.length}</small></div><div class="card">
    ${P.plays?`<p style="margin:0 0 4px">下過 <b>${P.plays}</b> 場・${P.w} 勝 ${P.d} 和 ${P.l} 負${P.perfect?`・全勝 ${P.perfect} 場`:""}</p><p class="muted" style="margin:0 0 8px;font-size:13px">${[3,5,10].filter(n=>B[n]).map(n=>`${n} 盤最佳 ${B[n].pts} 分（中心第 ${B[n].lx} 級）`).join("・")}</p>`:'<p class="muted" style="margin:0 0 8px">還沒下過車輪戰。一個人同時跟 3／5／10 位棋客下，在茶肆二樓。</p>'}
    ${SIM_ACH.map(([k,nm,how,tr])=>{const o=A[k];return`<div class="item"${o?"":' style="opacity:.55"'}><span class="lb" style="font-size:20px">${o?"🏅":"🔒"}</span><span class="tx"><b>${nm}${o&&tr?`<span style="margin-left:6px;padding:0 5px;border:1.5px solid ${SIM_TC[o.tier]};border-radius:5px;color:${SIM_TC[o.tier]};font-size:12px">${SIM_TIER[o.tier]}</span>`:""}</b><span>${how}</span></span></div>`}).join("")}
    <p class="muted" style="font-size:12px;margin:6px 0 0">印的顏色看中心級數：青印第 1～6 級、朱印 7～12 級、金印 13～18 級，可以往上換。</p>
    <button class="btn ghost" style="width:100%;margin-top:8px" onclick="location.hash='#/simul'">🀄 去下車輪戰 ›</button></div>`}
function simCss(){if(document.getElementById("simCss"))return;const s=document.createElement("style");s.id="simCss";s.textContent=`
.sim-tabs{display:flex;gap:4px;padding:4px 8px 2px;overflow-x:auto;scrollbar-width:none}.sim-tabs::-webkit-scrollbar{display:none}
.sim-tb{position:relative;flex:1 0 30px;min-width:30px;max-width:58px;height:42px;padding:2px 0 0;border:1.5px solid var(--line);border-radius:9px;background:var(--card);color:inherit;font:inherit;line-height:1.15;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.sim-tb b{display:block;font:900 13px/1.2 var(--serif,serif)}.sim-tb i{display:block;font-style:normal;font-size:12px;font-weight:800;color:var(--muted)}
.sim-tb.me{border:2.5px solid #C8102E}.sim-tb.me i{color:#C8102E}.sim-tb.me::before{content:"";position:absolute;left:3px;top:3px;border-left:7px solid #C8102E;border-bottom:7px solid transparent}
.sim-tb.think{border-style:dashed;opacity:.8}.sim-tb.think i{letter-spacing:1px;animation:simDot 1.2s ease-in-out infinite}
.sim-tb.done{background:color-mix(in srgb,var(--card) 70%,var(--line))}.sim-tb.done i{display:inline-block;margin-top:1px;padding:0 4px;border:1.5px solid currentColor;border-radius:5px}
.sim-tb.w i{color:#C8102E}.sim-tb.l i{color:var(--ink,#222)}.sim-tb.on{outline:2.5px solid var(--accent);outline-offset:1px}
@keyframes simDot{0%,100%{opacity:.35}50%{opacity:1}}
#bbox.sim-hop{animation:simHop .28s ease-out}@keyframes simHop{from{opacity:.35;transform:translateX(18px)}to{opacity:1;transform:none}}
.sim-flash{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);z-index:5;padding:8px 16px;border-radius:999px;background:rgba(20,16,12,.8);color:#ffe08a;font:800 15px/1.4 var(--serif,serif);pointer-events:none;animation:simFl .9s ease forwards}
@keyframes simFl{0%{opacity:0}15%,70%{opacity:1}100%{opacity:0}}
.sim-tbl{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 4px}.sim-tbl td,.sim-tbl th{padding:3px 4px;border-bottom:1px solid var(--line);text-align:center}
.sim-n{display:flex;gap:8px;margin:6px 0 12px}.sim-n button{flex:1;padding:10px 0;border:1.5px solid var(--line);border-radius:10px;background:var(--card);color:inherit;font:800 16px var(--serif,serif)}.sim-n button.on{background:#C8102E;border-color:#C8102E;color:#fff}
.sim-lv{display:flex;align-items:center;justify-content:center;gap:14px;margin:6px 0 4px}.sim-lv button{width:44px;height:44px;border:1.5px solid var(--line);border-radius:50%;background:var(--card);color:inherit;font:900 20px var(--sans,sans-serif)}.sim-lv b{min-width:110px;text-align:center;font:900 18px var(--serif,serif)}
@media (prefers-reduced-motion:reduce){#bbox.sim-hop,.sim-tb.think i{animation:none}}
body.sim-on .xqbot{visibility:hidden!important}
.sim-intro{position:fixed;inset:0;z-index:80;background:#0d0b09;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}.sim-intro.on{opacity:1}.sim-intro.out{opacity:0;transition:opacity .45s .2s}
.sim-stage{position:relative;width:min(100vw,calc(100vh*1200/896));aspect-ratio:1200/896;overflow:hidden;transition:transform .6s ease-in}.sim-stage.zoom{transform:scale(2.2)}.sim-stage>img{position:absolute;inset:0;width:100%;height:100%;display:block}
.sim-fig{position:absolute}.sim-fig>img{width:100%;display:block}.sim-fig>img.sim-bk{position:absolute;left:0;top:0}.sim-fig.mir>img{transform:scaleX(-1)}.sim-fig.back .sim-no{top:19%}.sim-fig.mir .sim-no{left:50.5%}.sim-bdw{position:absolute;left:0;top:0;width:1024px;height:1024px;transform-origin:0 0;pointer-events:none}.sim-bd{position:absolute;left:0;top:0;width:560px;height:620px;transform-origin:0 0}
.sim-no{position:absolute;left:49.5%;top:4%;transform:translateX(-50%);min-width:1.7em;padding:1px 4px;border-radius:999px;background:rgba(20,16,12,.55);color:#bfae8e;font:900 clamp(10px,2.6vw,16px)/1.4 var(--serif,serif);text-align:center;transition:background .25s,color .25s,box-shadow .25s}
.sim-pl{position:absolute;left:0;top:0;width:200px;height:200px;transform-origin:0 0}.sim-pl svg{width:200px;height:200px;display:block}
.sim-fig.lit .sim-no{background:#C8102E;color:#fff3c4;box-shadow:0 0 10px 3px rgba(255,200,90,.75)}
.sim-cap{position:absolute;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);padding:6px 16px;border-radius:999px;border:1.5px solid #f2c94c;background:rgba(20,16,12,.72);color:#ffe08a;font:900 17px/1.35 var(--serif,serif);white-space:nowrap}
.sim-stage>img{filter:brightness(.4) saturate(.75);transition:filter .45s ease-out}.sim-intro.lite .sim-stage>img{filter:none}
.sim-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 55%,rgba(0,0,0,0) 35%,rgba(0,0,0,.78) 100%);transition:opacity .45s}.sim-intro.lite .sim-vig{opacity:.4}
.sim-fig{transform-origin:50% 92%;translate:0 2.5%;scale:1 .955;filter:brightness(.5) saturate(.6);transition:translate .32s cubic-bezier(.3,1.7,.5,1),scale .32s cubic-bezier(.3,1.7,.5,1),filter .25s}.sim-fig.lit{translate:0 0;scale:1;filter:none}
.sim-fig.lit .sim-no{animation:simPop .38s cubic-bezier(.3,1.6,.5,1)}@keyframes simPop{0%{scale:.3}100%{scale:1}}
.sim-intro.lean .sim-fig{animation:simLean .5s ease-out forwards}@keyframes simLean{0%{translate:0 0;scale:1}45%{translate:0 -1.6%;scale:1.035}100%{translate:0 -.6%;scale:1.012}}
.sim-slam{position:absolute;z-index:200;left:50%;top:46%;transform:translate(-50%,-50%) scale(2.6);opacity:0;pointer-events:none;white-space:nowrap;color:#ffe08a;font:900 clamp(30px,9.5vw,68px)/1.2 var(--serif,serif);letter-spacing:.08em;text-shadow:0 0 2px #2a0d05,0 3px 0 #6b1d0c,0 0 18px rgba(200,40,20,.85),0 0 42px rgba(255,190,80,.55)}
.sim-intro.lean .sim-slam{animation:simSlam .42s cubic-bezier(.2,1.3,.4,1) forwards}@keyframes simSlam{0%{opacity:0;transform:translate(-50%,-50%) scale(2.6)}70%{opacity:1}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.sim-stage.shake{animation:simShake .34s linear}@keyframes simShake{0%,100%{translate:0 0}20%{translate:-6px 3px}40%{translate:5px -4px}60%{translate:-4px -2px}80%{translate:3px 3px}}
@media (prefers-reduced-motion:reduce){.sim-fig{translate:none;scale:none;transition:filter .2s}.sim-intro.lean .sim-fig,.sim-fig.lit .sim-no,.sim-stage.shake{animation:none}.sim-intro.lean .sim-slam{animation:none;opacity:1;transform:translate(-50%,-50%)}}
@media (prefers-reduced-motion:reduce){.sim-stage{transition:none}.sim-stage.zoom{transform:none}}`;document.head.append(s)}
/* ---------- 開場過場（開發者 11/11「請 Gemini 製作車輪戰過場動畫」、「跟著 3／5／10 的選項繪製，排一排或是一整圈」）----------
   圖：data/simul/simul_bg.webp（茶肆二樓空廂房，斜上方 45 度）＋ simul_f1～f11.webp（十一位棋客各坐一桌，綠幕去背）。
   棋客（開發者 11/11「10 個棋客卻只有 5 個人重複兩次，請另外畫 5 個不一樣的棋客」「男女比例各一半」「3/5/10 會從這 10 位或是剛剛多畫的隨機挑選」）：男 6 位＝1 學童、2 茶客、3 書生、4 中年棋手、5 老隱士、11 商賈；女 5 位＝6 女棋客、7 少女、8 老闆娘、9 道姑、10 白髮老婦。
   每場由 simCast 隨機挑、不重複、男女各半（單數盤多的那一位隨機）；學童、茶客沒有背影圖，10 盤時只排上半圈。
   Gemini 畫的棋盤棋子數不對（開發者：「棋子數量記得改正確」）→ 程式把真實棋盤用四點透視貼在畫上的棋盤上（立牌 1024 圖上四角 SIM_Q），每桌就是那一桌現在的局面。
   排法：3、5 盤一排；10 盤圍成橢圓一圈，十位棋客都面向圓心（開發者 11/11「角度不對，10 個人要面向圓心」）：上半圈五桌用正面立牌，下半圈五桌是背影 →「空桌 simul_table.webp ＋ 程式棋盤 ＋ 背影 simul_b3～b11.webp」三層（背影蓋在棋盤上面），
   左上兩桌、右下兩桌把圖左右鏡像（棋盤四角跟著換，字不會反）。
   棋牌（開發者 11/11 照 Claude 建議選「背牌＋桌前棋位牌」，story/gemini_app/74_車輪戰棋客造型評估*）：每位棋客有自己的棋子 SIM_PC（字照 ChatGPT 的分配表），
   背影位＝上背一面木棋子背牌、正面位＝靠鏡頭那一側桌沿一面小棋位牌，都是程式畫的木棋子（雲河七星同款木色、雙圈），仿射貼到 1024 座標上；背牌位置量自 tools 校正圖 cal_back。背影圖由 tools/simul_back.py 對位。桌號依序亮起 → 鏡頭推向第 1 桌 → 進對局；點一下跳過。圖載不到就直接進對局 */
const SIM_Q={T:[430,328],R:[765,425],B:[560,593],L:[248,488]},SIM_CN={K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵",k:"將",a:"士",b:"象",n:"馬",r:"車",c:"砲",p:"卒"};
function simHomo(W,H,d){const[x0,y0]=d[0],[x1,y1]=d[1],[x2,y2]=d[2],[x3,y3]=d[3],dx1=x1-x2,dx2=x3-x2,dy1=y1-y2,dy2=y3-y2,sx=x0-x1+x2-x3,sy=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1,
  g=(sx*dy2-dx2*sy)/den,h=(dx1*sy-sx*dy1)/den,a=x1-x0+g*x1,b=x3-x0+h*x3,dd=y1-y0+g*y1,e=y3-y0+h*y3;
  return`matrix3d(${a/W},${dd/W},0,${g/W},${b/H},${e/H},0,${h/H},0,0,1,0,${x0},${y0},0,1)`}
/* 第 13 輪 X6：色弱模式（07cb cbOn）時開場各桌小棋盤的棋子跟 3D、平面一致：紅子白底紅圈紅字、黑子黑底白圈白字（不必分辨紅黑色也看得出哪一方）；cb 不給就照設定 */
function simBoardSvg(bd,cb){if(cb==null)cb=typeof cbOn==="function"&&cbOn();let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 620" width="560" height="620"><rect width="560" height="620" fill="#e6cb98"/><g stroke="#5a3a1a" stroke-width="3">';
  for(let i=0;i<9;i++){const x=40+i*60;s+=i%8?`<line x1="${x}" y1="40" x2="${x}" y2="280"/><line x1="${x}" y1="340" x2="${x}" y2="580"/>`:`<line x1="${x}" y1="40" x2="${x}" y2="580"/>`}
  for(let j=0;j<10;j++)s+=`<line x1="40" y1="${40+j*60}" x2="520" y2="${40+j*60}"/>`;
  s+='<line x1="220" y1="40" x2="340" y2="160"/><line x1="340" y1="40" x2="220" y2="160"/><line x1="220" y1="460" x2="340" y2="580"/><line x1="340" y1="460" x2="220" y2="580"/></g>';
  (bd||[]).forEach((p,k)=>{if(!p)return;const red=p===p.toUpperCase(),c=cb?(red?"#C8102E":"#FFFFFF"):red?"#b3261e":"#222",fc=cb?(red?"#FFFFFF":"#111111"):"#f6e7c8",x=40+(k%9)*60,y=40+(k/9|0)*60;
    s+=`<circle cx="${x}" cy="${y+3}" r="26" fill="rgba(0,0,0,.35)"/><circle cx="${x}" cy="${y}" r="26" fill="${fc}" stroke="${cb&&!red?"#111111":c}" stroke-width="4"/>${cb?`<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${c}" stroke-width="2"/>`:""}<text x="${x}" y="${y+11}" font-size="30" font-weight="900" text-anchor="middle" fill="${c}" font-family="serif">${SIM_CN[p]||""}</text>`});
  return s+"</svg>"}
const SIM_PC={1:"P",2:"n",3:"B",4:"r",5:"k",6:"C",7:"p",8:"R",9:"A",10:"a",11:"c"};   /* 學童紅兵、茶客黑馬、書生紅相、中年棋手黑車、老隱士黑將、女棋客紅炮、少女黑卒、老闆娘紅俥、道姑紅仕、白髮老婦黑士、商賈黑砲 */
/* 一面木棋牌：c＝圓心、u／v＝棋子水平／垂直半徑對到 1024 座標的向量、th＝側邊厚度往哪邊露出（鏡像時 u 的 y 反號、厚度 x 反號，字不會反） */
function simPlate(p,c,u,v,th){const col=p===p.toUpperCase()?"#b3261e":"#1e1a18",m=(dx,dy)=>`matrix(${u[0]/100},${u[1]/100},${v[0]/100},${v[1]/100},${c[0]-u[0]-v[0]+dx},${c[1]-u[1]-v[1]+dy})`;
  return`<div class="sim-pl" style="transform:${m(th[0],th[1])}"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="98" fill="#4a2c14"/></svg></div><div class="sim-pl" style="transform:${m(0,0)}"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="98" fill="#5c3a1e"/><circle cx="100" cy="100" r="91" fill="#d6ac74"/><circle cx="100" cy="100" r="74" fill="none" stroke="${col}" stroke-width="4.5"/><circle cx="100" cy="100" r="66" fill="none" stroke="${col}" stroke-width="1.8"/><text x="100" y="134" font-size="96" font-weight="700" text-anchor="middle" fill="${col}" font-family="BiauKai,DFKai-SB,KaiTi,STKaiti,serif">${SIM_CN[p]||""}</text></svg></div>`}
function simPlates(o,fk){const p=SIM_PC[fk]||"P",X=x=>o.mir?1024-x:x,s=o.mir?-1:1;
  if(o.back)return"";   /* hspx（開發者 11/12 圈起背影棋客背上的圓牌「修正拿掉背後的棋子」）：背影位不再貼背牌；正面位桌前的小棋位牌照舊 */
  const r=60;return simPlate(p,[X(300),640],[.95*r,.32*r*s],[0,r],[4*s,3])}
function simSpots(n){if(n===10)return Array.from({length:10},(_,i)=>{const a=(24+33*(i%5))*Math.PI/180,k=i<5?-1:1,cx=.5+k*.36*Math.cos(a),cy=.59+k*.21*Math.sin(a);return{cx,cy,s:.17*(.8+.45*(cy-.38)/.34),back:i>4,mir:i<2||i===5||i===6}});
  if(n===3)return[.22,.5,.78].map(cx=>({cx,cy:.52,s:.33}));return Array.from({length:n},(_,i)=>({cx:.158+i*.179,cy:.52,s:.25}))}
const SIM_M=[1,2,3,4,5,11],SIM_F=[6,7,8,9,10];
function simCast(sp){const sh=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a},n=sp.length,nf=Math.floor(n/2)+(n%2&&Math.random()<.5?1:0),c=sh([...sh(SIM_F).slice(0,nf),...sh(SIM_M).slice(0,n-nf)]);
  sp.forEach((o,i)=>{if(o.back&&c[i]<3){const j=c.findIndex((k,q)=>!sp[q].back&&k>2);if(j>=0)[c[i],c[j]]=[c[j],c[i]]}});return c}
/* 回饋 871（開發者 11/12「車輪戰出現小帥妹過場動畫」）：3D 棋館的載入畫面。parkDraw 沒給 gate 時，park3d 的載入畫面是「小帥妹走去園子」（Q 版小帥妹原地走路），
   車輪戰一開 3D、或回到還沒下完的那一場就會播它。改給棋館這張圖（跟 simIntro 同一張），quiet＝不敲過場鼓；quietMate＝不播入座運鏡、小帥不打招呼（06-cpu parkDraw） */
const SIM_GATE={img:["data/simul/simul_bg.webp"],icon:"🀄",title:"車輪戰",sub:"棋館二樓・棋已擺好",bg:"#0d0b09",quiet:true};
/* 回饋 871 追加（開發者 11/12「車輪戰裡你這一側的角色要看到，也要看到對面坐的角色」）：3D 棋館對面坐的是這一桌的棋客，換桌跟著換。
   不出新圖：用 bot3d 的 Q 版棋子人（XQBot3D.figure，跟園子路人同一套），cus 直接給造型物件，髮型、鬍子、衣色照 simul_f1～f11 立牌圖配；
   身上的字＝那位棋客的棋牌（SIM_PC），跟開場過場桌前的棋牌一樣。npc＝名字（點對面的人跳介紹卡，06-cpu parkInfo 看 op.sim）。
   同一場誰坐哪一桌記在 store simCast（{id:場次, c:[每桌的棋客號]}），開場過場和 3D、續局都用同一份 */
const SIM_NM={1:"學童",2:"茶客",3:"書生",4:"中年棋手",5:"老隱士",6:"女棋客",7:"少女",8:"老闆娘",9:"道姑",10:"白髮老婦",11:"商賈"};
const SIM_LOOK={
  1:{hat:"hair",hc:"#1E1A16",hair:"#1E1A16",hs:"buns2",ring:"#A87A48",sl:"#6A6458",sk:"#6A6458",gl:"#FFFFFF",prop:"piece"},
  2:{hat:"bandana",hc:"#8A8578",ring:"#A87A48",sl:"#66685C",sk:"#66685C",gl:"#FFFFFF",prop:"cup"},
  3:{hat:"topknot",hc:"#1E1A16",ring:"#A87A48",sl:"#4E4A44",sk:"#4E4A44",gl:"#FFFFFF",prop:"book"},
  4:{hat:"topknot",hc:"#1E1A16",beard:"goatee",mus:1,bc:"#1E1A16",ring:"#A87A48",sl:"#5A5650",sk:"#5A5650",gl:"#FFFFFF"},
  5:{hat:"topknot",hc:"#E8E6E0",hair:"#E8E6E0",hs:"long",beard:"long",bc:"#F0EEE8",brow:"white",ring:"#A87A48",sl:"#D8CCB4",sk:"#D8CCB4",gl:"#FFFFFF"},
  6:{hat:"topknot",hc:"#1E1A16",pin:"#C9A86A",ring:"#A87A48",sl:"#BFDCCB",sk:"#BFDCCB",gl:"#FFFFFF"},
  7:{hat:"hair",hc:"#1E1A16",hair:"#1E1A16",hs:"buns2",band:"#C8322A",ring:"#A87A48",sl:"#F2C2AE",sk:"#F2C2AE",gl:"#FFFFFF"},
  8:{hat:"kerchief",hc:"#3A5A8A",ring:"#A87A48",sl:"#6A3A30",sk:"#6A3A30",ap:"#3A3A3A",gl:"#FFFFFF",prop:"teapot"},
  9:{hat:"topknot",hc:"#1E1A16",pin:"#D8C8A8",ring:"#A87A48",sl:"#6878A8",sk:"#6878A8",gl:"#FFFFFF"},
  10:{hat:"topknot",hc:"#D8D6D0",hair:"#D8D6D0",brow:"white",ring:"#A87A48",sl:"#7A5A3E",sk:"#7A5A3E",gl:"#FFFFFF"},
  11:{hat:"fangjin",hc:"#151515",beard:"goatee",mus:1,bc:"#1E1A16",ring:"#A87A48",sl:"#C8902A",sk:"#C8902A",gl:"#FFFFFF",prop:"abacus"}};
/* 開發者 11/11（Tripo「靜態坐姿」、11 位全做）：真實 3D 版棋客＝data/tripo_app/s_f<號>.glb（照 park/simulbody/body_f<號>.png 全身基準圖做、坐姿、沒有骨架；tools/tripo_gen.py s_f）。
   模型連木凳一起做（基準圖先去背成透明底再送 Tripo，凳子才不會被當背景丟掉）。SIM_SEAT[號]＝[凳面高／模型高]（tools/simul3d_post.py 量的）：
   park3d 讓凳面落在座高、凳腳落地，桌上對面那一角立一面這位棋客的棋位牌（SIM_PC，Q 版是寫在身上）。
   只有設定「對手外觀」選真實 3D、而且不是舊裝置（記憶體 2 GB 以下，或園子量到畫面偏慢那三天）才用；模型還在下載、載不到時就是原本的 Q 版棋子人（attachGLB 載成功才把 Q 版藏起來） */
const SIM_SEAT={1:[.345],2:[.375],3:[.345],4:[.345],5:[.355],6:[.345],7:[.345],8:[.325],9:[.315],10:[.355],11:[.315]};
/* 11/12 hspx（車輪戰對手變回 Q 版棋子人）：只有手機記憶體 2GB 以下才用 Q 版；不再看「量到畫面偏慢」的記號（黑洞局量到偏慢會連帶害車輪戰退回 Q 版） */
function simOld(){try{const m=+((typeof navigator!=="undefined"&&navigator.deviceMemory)||0);return!!(m&&m<=2)}catch(e){return false}}
function simGlb(fk){return SIM_SEAT[fk]&&store.get("oppLook","real")==="real"&&!simOld()?{glb:`data/tripo_app/s_f${fk}.glb`,stool:SIM_SEAT[fk].slice()}:null}
function simOppLook(fk,lv){const c=SIM_LOOK[fk];if(!c)return null;const nm=SIM_NM[fk];
  return{p:SIM_CN[SIM_PC[fk]]||"卒",e:"ming",g:9,npc:nm,sim:1,about:`${nm}，今天在棋館二樓陪你下車輪戰${lv?`（第 ${lv} 級）`:""}。強弱照這一桌的級數，背後是象棋 AI 引擎 Pikafish。`,cus:{...c},...(simGlb(fk)||{})}}
function simCastOf(S,sp){const k=store.get("simCast",null);if(k&&k.id===S.id&&Array.isArray(k.c)&&k.c.length===S.n&&k.c.every(x=>SIM_LOOK[x]))return k.c;
  const c=simCast(sp||simSpots(S.n));store.set("simCast",{id:S.id,c});return c}
function simIntro(S,done){simCss();let fin=false;const end=()=>{if(fin)return;fin=true;try{ov.remove()}catch(e){}done&&done()};
  const ov=document.createElement("div");ov.className="sim-intro";ov.setAttribute("role","img");ov.setAttribute("aria-label",`車輪戰 ${S.n} 盤開場`);
  const st=document.createElement("div");st.className="sim-stage";ov.append(st);const bg=new Image();bg.src="data/simul/simul_bg.webp";bg.alt="";st.append(bg);
  const sp=simSpots(S.n),cast=simCastOf(S,sp),fx=p=>[1024-p[0],p[1]],{T,R,B,L}=SIM_Q,quad=o=>o.back?(o.mir?[L,B,R,T].map(fx):[B,L,T,R]):(o.mir?[R,T,L,B].map(fx):[T,R,B,L]);
  const tbs=S.tb.map((t,i)=>{const o=sp[i],fk=cast[i],el=document.createElement("div");el.className="sim-fig"+(o.mir?" mir":"")+(o.back?" back":"");
    el.style.cssText=`left:${(o.cx-(o.mir?.505:.495)*o.s)*100}%;top:calc(${o.cy*100}% - ${.45*o.s*100*1200/896}%);width:${o.s*100}%;z-index:${Math.round(o.cy*100)}`;
    el.innerHTML=`<img src="data/simul/simul_${o.back?"table":"f"+fk}.webp" alt=""><div class="sim-bdw"><div class="sim-bd" style="transform:${simHomo(560,620,quad(o))}">${simBoardSvg(t.board)}</div></div>${o.back?`<img class="sim-bk" src="data/simul/simul_b${fk}.webp" alt="">`:""}<div class="sim-bdw">${simPlates(o,fk)}</div><b class="sim-no">${i+1}</b>`;st.append(el);return el});
  const cap=document.createElement("div");cap.className="sim-cap";cap.textContent=`🀄 車輪戰・${S.n} 盤`;ov.append(cap);
  /* hspx（開發者 11/12「開始繞場動畫太虛了，找 Gemini 重新設計，更有生命力和即將戰鬥的味道」；story/113 Gemini「落子如雨」＋ChatGPT「擂台點將」）：
     暗場低鼓 → 逐桌亮起、棋客挺身、桌號彈出、每桌一聲落子（越來越快）→ 全場亮、全員前傾看向你、鑼鼓齊響、大字「以一敵 N，開局！」砸下、畫面一震 → 推向第 1 桌 */
  {const vg=document.createElement("div");vg.className="sim-vig";st.append(vg)}
  const SLN=["","一","二","三","四","五","六","七","八","九","十"],slam=document.createElement("div");slam.className="sim-slam";slam.textContent=`以一敵${SLN[S.n]||S.n}，開局！`;ov.append(slam);
  const sfx=f=>{try{if(typeof withAudio==="function"&&typeof AC!=="undefined"&&AC)withAudio(()=>f(AC.currentTime+.02))}catch(e){}};
  ov.onclick=end;document.body.append(ov);
  const fit=()=>{const w=st.clientWidth;st.querySelectorAll(".sim-bdw").forEach(b=>b.style.transform=`scale(${w*parseFloat(b.parentElement.style.width)/100/1024})`)};
  const go=()=>{if(fin)return;fit();ov.classList.add("on");const R=matchMedia("(prefers-reduced-motion:reduce)").matches,n=tbs.length;
    sfx(t=>{if(typeof drumHit==="function")drumHit(t,.9,52)});
    const TR=R?500:n>=10?1500:n>=5?1200:900,w=tbs.map((_,i)=>1-.62*i/Math.max(1,n)),ws=w.reduce((a,b)=>a+b,0)||1;let acc=380;   /* 間隔一桌比一桌短：落子聲由慢轉急 */
    tbs.forEach((el,i)=>{const at=acc;acc+=TR*w[i]/ws;setTimeout(()=>{if(fin)return;el.classList.add("lit");sfx(()=>{if(typeof moveSound0==="function")moveSound0(false)})},at)});
    const tl=acc+180;setTimeout(()=>{if(fin)return;ov.classList.add("lite","lean");if(!R)st.classList.add("shake");sfx(t=>{if(typeof gongHit==="function")gongHit(t,180,1.6,true);if(typeof drumHit==="function")drumHit(t,1.1,48)});try{vibrate([20,40,30])}catch(e){}},tl);
    const tz=tl+(R?500:820);setTimeout(()=>{if(fin)return;st.classList.remove("shake");const o=sp[0];st.style.transformOrigin=`${o.cx*100}% ${o.cy*100}%`;st.classList.add("zoom");ov.classList.add("out")},tz);setTimeout(end,tz+(R?200:650))};
  let ok=0;const ims=[bg,...st.querySelectorAll(".sim-fig img")],need=ims.length,tick=()=>{if(++ok>=need)go()};ims.forEach(im=>{if(im.complete&&im.naturalWidth)tick();else{im.onload=tick;im.onerror=end}});
  setTimeout(()=>{if(!ov.classList.contains("on"))end()},4000)}
function SimulPage(v){
  setTabs(false);gameLayout(v);simCss();
  /* 回饋 871 追加（開發者 11/12）：車輪戰頁不出現到處走的小幫手（.xqbot）；只加 body.sim-on 暫時藏起來（simCss），離開這一頁就拿掉，不動小幫手開關 */
  document.body.classList.add("sim-on");const botBack=()=>{if(!/^#\/simul(\/|\?|$)/.test(location.hash))document.body.classList.remove("sim-on")};addEventListener("hashchange",botBack);
  const tabs=document.createElement("div");tabs.className="sim-tabs";tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","車輪戰各桌");v.insertBefore(tabs,v.firstChild);
  {const ev=v.querySelector(".evline");if(ev)ev.style.display="none"}
  let S=null,cur=0,sel=-1,busy=false,shownDone=null,live=true,pinAt=0,holdAt=0,setupShown=false;
  const bd=Board(i=>tap(i));v.querySelector("#bbox").append(bd.svg);v.querySelector("#bbox").style.position="relative";
  /* 開發者 11/11 hspx「讓車輪戰也能有對戰的環景切換功能」：標題列加一般對局那顆 🌳／▦（共用 park3d 設定），3D 時在棋館二樓大廳下（環景 data/park/simul_360.webp、木地板 data/pano/simul_ground.webp）；
     3D 棋客（Tripo）還沒做好，對手先由 3D 場景預設 */
  setTop("🀄 車輪戰","#/hub/battle",[["＋",()=>setup(),"重開一場"],...(typeof parkBtn==="function"?[parkBtn(()=>paint())]:[])]);
  const acts=actionBar(v.querySelector("#acts"),[["new","＋","重開",()=>setup(),true],
    ["resign","🏳","這桌認輸",()=>{const t=T();if(!t||t.result)return toast("這桌已經下完");confirmBox(`第 ${cur+1} 桌認輸？`,()=>post("/simul/resign",{i:cur}),"認輸")}],
    ["all","⏹","全部結束",()=>{if(!S||S.none||S.done)return toast("這一場已經下完");confirmBox("還沒下完的桌子都算認輸，確定結束這一場？",()=>post("/simul/resignall"),"結束")}]]);
  const T=()=>S&&!S.none?S.tb[cur]:null;
  const nextMine=from=>{if(!S||S.none)return-1;for(let k=1;k<=S.n;k++){const j=(from+k)%S.n,t=S.tb[j];if(!t.result&&t.turn==="r")return j}return-1};
  const resOf=t=>!t.result?"":!t.result.w?"d":t.result.w==="r"?"w":"l",RES={w:"勝",d:"和",l:"負"};
  async function post(u,b){if(busy)return;busy=true;try{S=await api(u,b||{});paint()}catch(e){toast(e.message)}finally{busy=false}}
  function flash(txt){const bb=v.querySelector("#bbox");if(!bb)return;bb.classList.remove("sim-hop");void bb.offsetWidth;bb.classList.add("sim-hop");
    const f=document.createElement("div");f.className="sim-flash";f.textContent=txt;bb.append(f);setTimeout(()=>f.remove(),950);try{axSay(txt)}catch(e){}}
  function hop(j,why){if(j<0||j===cur)return;cur=j;sel=-1;flash(why||`第 ${j+1} 桌・輪到你`)}
  function tap(i){const t=T();if(!t)return;if(t.result)return toast("這桌已經下完，點上面的桌牌換一桌");if(t.turn!=="r")return toast("棋客還在想，先去別桌");
    if(sel>=0&&t.legal.some(([f,x])=>f===sel&&x===i)){const f=sel;sel=-1;go(f,i);return}
    sel=t.board[i]&&t.legal.some(([f])=>f===i)?i:-1;paint()}
  async function go(f,to){if(busy)return;busy=true;const i0=cur;try{const cap=!!T().board[to];S=await api("/simul/move",{i:i0,f,t:to});try{moveSound(cap)}catch(e){}
      /* 開發者 11/11「落子後太快切到下一盤」：先畫出這一步、停 1 秒讓玩家看清棋子落在哪，再換桌（這 1 秒內自己點了別桌就不換；背景的自動換桌也先等） */
      paint();if(!S.done){holdAt=Date.now();setTimeout(()=>{if(!live||cur!==i0||!S||S.none||S.done)return;const j=nextMine(i0);if(j>=0){hop(j,S.tb.filter(t=>!t.result).length===1?"最後一桌了，收官要穩":null);paint()}},1000)}}
    catch(e){toast(e.message)}finally{busy=false}}
  function setup(){const old=S&&!S.none&&!S.done&&S.tb.some(t=>t.moves.some(m=>m.by==="r"));let n=store.get("simN",5),lx=store.get("simLx",null);
    if(lx==null)try{lx=Math.max(3,Math.min(16,+(JSON.parse(localStorage.getItem("xq_play")||"null")||{}).level||5))}catch(e){lx=5}
    sheet("🀄 車輪戰",b=>{const B=(S&&S.best)||{},rng=()=>{const a=Math.max(1,Math.min(lx-Math.floor((n-1)/2),19-n));return`本場棋客：第 ${a}～${a+n-1} 級，由弱到強`};
      const draw=()=>{b.innerHTML=`<p class="muted" style="margin:0 0 8px">一人走遍多桌，全部執紅先走；走完一步就換下一桌。</p><p style="margin:0 0 10px;font:800 15px/1.5 var(--serif,serif)">「上二樓者，卸下棋子身。」 <button type="button" class="lk" id="smWhy">為什麼？</button></p>
        <b>盤數</b><div class="sim-n">${[3,5,10].map(k=>`<button data-n="${k}" class="${k===n?"on":""}">${k} 盤</button>`).join("")}</div>
        <b>中心級數</b><div class="sim-lv"><button id="smM" aria-label="降一級">－</button><b>第 ${lx} 級</b><button id="smP" aria-label="升一級">＋</button></div>
        <p class="muted" style="text-align:center;margin:0 0 10px">${rng()}${B[n]?`<br>${n} 盤最佳：${B[n].pts} 分（${B[n].w} 勝 ${B[n].d} 和 ${B[n].l} 負・中心第 ${B[n].lx} 級）`:""}</p>
        ${old?'<p style="color:#C8102E;font-size:13.5px;margin:0 0 8px">上一場還沒下完：重開的話，走過棋的桌子算輸。</p>':""}
        <button class="btn" id="smGo" style="width:100%">開始繞場</button>`;
        b.querySelectorAll("[data-n]").forEach(x=>x.onclick=()=>{n=+x.dataset.n;vibrate(5);draw()});
        b.querySelector("#smM").onclick=()=>{lx=Math.max(1,lx-1);draw()};{const wy=b.querySelector("#smWhy");if(wy)wy.onclick=()=>{vibrate(5);modal(`<img src="data/zhanggui/idle.webp" alt="" onerror="this.remove()"><h2>笑面掌櫃</h2><p class="pl-say">「規矩嘛——上二樓的，都得卸下棋子身，免得十盤棋氣撞在一塊。至於他們原本是誰……客官下完再問吧。」</p>`,[["知道了",null]],"prolog")}}   /* 開發者 11/12 選「表面規矩、底下殘譜」（story/114）：棋客為何不是棋子身——表面是茶肆二樓的規矩，底下是黑洞循環留下的人形殘譜（不說破） */b.querySelector("#smP").onclick=()=>{lx=Math.min(18,lx+1);draw()};
        b.querySelector("#smGo").onclick=()=>{store.set("simN",n);store.set("simLx",lx);closeSheet();cur=0;sel=-1;shownDone=null;post("/simul/new",{n,lx}).then(()=>{if(S&&!S.none&&!S.done)simIntro(S,()=>flash("茶已溫，棋已擺好。請入席，走第一步"));else flash("茶已溫，棋已擺好。請入席，走第一步")})}};draw()})}
  function summary(){const D=S.done,n=S.n,B=(S.best||{})[n],r=D.pts/n,em=D.w===n?"🏆":r>=.6?"😄":r>=.4?"🤝":"🧐",
      h=D.w===n?`${n===10?"十":n===5?"五":"三"}桌皆破！`:r>=.6?"今日戰果漂亮！":r>=.4?"有來有往！":"這一輪很硬！",
      p=D.w===n?"像真正的大師一樣，一圈走完，桌桌奏捷。":r>=.6?"穩住了大多數棋局，車輪轉得很順。":r>=.4?"贏輸各半，再磨幾盤就能多拿幾桌。":"多桌同時應戰不容易，記住幾個關鍵失誤，下次再扳回來。";
    modal(`<div class="em">${em}</div><h2>${h}</h2><p class="muted">${p}</p><p style="font-size:17px;font-weight:900;margin:6px 0">${D.w} 勝 ${D.d} 和 ${D.l} 負・得分 ${D.pts} / ${n}</p>
      <table class="sim-tbl"><tr><th>桌</th><th>棋客</th><th>結果</th><th>回合</th></tr>${S.tb.map(t=>`<tr><td>${t.i+1}</td><td>第 ${t.level} 級</td><td style="font-weight:900;color:${resOf(t)==="w"?"#C8102E":"inherit"}">${RES[resOf(t)]||"—"}</td><td>${Math.ceil(t.moves.length/2)}</td></tr>`).join("")}</table>
      ${(D.ach||[]).length?`<p style="margin:6px 0 0;font-weight:800">${D.ach.slice(0,3).map(a=>{const x=SIM_ACH.find(y=>y[0]===a.k)||[a.k,a.k,"",0];return`【${a.up?"升級":"新印"}】${x[3]?`<span style="color:${SIM_TC[a.tier]}">${SIM_TIER[a.tier]}</span>・`:""}${esc(x[1])}`}).join("<br>")}${D.ach.length>3?`<br><span class="muted" style="font-weight:400">另有 ${D.ach.length-3} 枚，到我的戰績「電腦」看</span>`:""}</p>`:""}
      ${B?`<p class="muted" style="font-size:13px;margin:4px 0 0">${n} 盤最佳：${B.pts} 分（中心第 ${B.lx} 級）${B.at===D.at&&D.pts>0?"・🎉 新紀錄":""}</p>`:""}
      <p class="muted" style="font-size:12.5px;margin:2px 0 0">每桌都存進對局紀錄可以檢討；不算段位，也不算進「我的棋力」。</p>`,
      [["再戰一輪 ›",()=>setup()],["🏠 首頁",()=>goHome(),true],["‹ 回"+(typeof hbHubN==="function"?hbHubN():"茶肆"),()=>{location.hash="#/hub/battle"},true],["看看棋盤",null,true]],"res")}
  function paint(){if(!live)return;
    if(!S||S.none){tabs.innerHTML="";bd.draw(XQCore.parseFen(XQCore.START),{});v.querySelector("#pTop").innerHTML="";v.querySelector("#pBot").innerHTML="";
      v.querySelector("#stat").textContent="按「＋ 重開」選盤數和級數，開始車輪戰";if(!setupShown){setupShown=true;setup()}return}
    if(cur>=S.n)cur=0;
    tabs.innerHTML=S.tb.map(t=>{const r=resOf(t),k=r?"done "+r:t.turn==="r"?"me":"think";return`<button class="sim-tb ${k}${t.i===cur?" on":""}" data-i="${t.i}" role="tab" aria-selected="${t.i===cur}" aria-label="第 ${t.i+1} 桌，第 ${t.level} 級，${r?RES[r]:t.turn==="r"?"輪到你":"棋客在想"}"><b>${t.i+1}</b><i>${r?RES[r]:t.turn==="r"?"你":"…"}</i></button>`}).join("");
    tabs.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{vibrate(5);pinAt=Date.now();cur=+b.dataset.i;sel=-1;paint()});
    {const on=tabs.querySelector(".on");if(on&&on.scrollIntoView)try{on.scrollIntoView({block:"nearest",inline:"nearest"})}catch(e){}}
    const t=T(),done=S.tb.filter(x=>x.result).length,c={w:0,d:0,l:0},cast=simCastOf(S);for(const x of S.tb){const r=resOf(x);if(r)c[r]++}
    {const o={last:t.moves[t.moves.length-1],sel,targets:sel>=0?t.legal.filter(([f])=>f===sel).map(x=>x[1]):[],check:t.check,fx:true};bd.draw(t.board,o);
      /* 開發者 11/12：3D 棋館照開場位置擺出每一桌（park3d simSync），換桌時自己走過去坐下 */
      const simX={n:S.n,i:cur,sp:simSpots(S.n).map(o=>[o.cx,o.cy]),tb:S.tb.map((x,j)=>({b:x.board,look:simOppLook(cast[j],x.level),res:resOf(x)}))};
      if(typeof parkDraw==="function")try{parkDraw(v.querySelector("#bbox"),bd,t.board,o,{tap:i=>tap(i),bg:"data/park/simul_360.webp",ground:"data/pano/simul_ground.webp",bgName:"🀄 車輪戰・棋館",era:"ming",indoor:true,gate:SIM_GATE,quietMate:true,opp:simOppLook(cast[t.i],t.level),simul:simX})}catch(e){}}
    v.querySelector("#pTop").innerHTML=playerHTML("b",`第 ${t.i+1} 桌・${t.name||SIM_NM[cast[t.i]]||"棋客"}`,`第 ${t.level} 級棋客`);
    v.querySelector("#pBot").innerHTML=playerHTML("r",meName(),`車輪戰 ${S.n} 盤・下完 ${done}／${S.n}${done?`・${c.w} 勝 ${c.d} 和 ${c.l} 負`:""}`);
    const r=resOf(t);v.querySelector("#stat").textContent=r?`第 ${t.i+1} 桌：${RES[r]}（${t.result.why}）`:t.turn==="r"?(t.check>=0?`⚠ 第 ${t.i+1} 桌被將軍！`:`👉 第 ${t.i+1} 桌輪到你`):S.engFail?"電腦棋手還沒準備好，稍後自動再試…":"🤔 棋客在想…可以先去別桌";
    renderStrip(v.querySelector("#strip"),t.moves,t.moves.length-1);
    acts.resign.disabled=!!r;acts.all.disabled=!!S.done;
    /* 開發者 11/11（截圖：離開再回來又跳上一場的總表）：總表每一場只自動跳一次（看過的那場記在 simSeen）；回來時已經下完的那場不再跳，直接打開開新一場的設定 */
    if(S.done&&shownDone!==S.id){shownDone=S.id;if(store.get("simSeen",null)!==S.id){store.set("simSeen",S.id);setTimeout(()=>{if(live)summary()},700)}else if(!setupShown){setupShown=true;setup()}}
    if(S.done)v.querySelector("#stat").textContent=`這一場下完了：${S.done.w} 勝 ${S.done.d} 和 ${S.done.l} 負・按「＋ 重開」再來一輪`}
  async function refresh(){if(!live||busy)return;try{const s=await api("/simul/state");if(!live||busy)return;S=s;
      if(!S.none&&!S.done){const t=T();if(t&&(t.result||t.turn!=="r")&&Date.now()-pinAt>4000&&Date.now()-holdAt>1100){const j=nextMine(cur);if(j>=0)hop(j)}}paint()}catch(e){}}
  const onEv=()=>setTimeout(refresh,60);addEventListener("xq-simul",onEv);const iv=setInterval(refresh,2500);refresh();
  return{stop(){live=false;removeEventListener("xq-simul",onEv);clearInterval(iv);removeEventListener("hashchange",botBack);document.body.classList.remove("sim-on")}}}
