/* ---------- 太虛星尊三招魔法 3D 接進 App（開發者 11/14「魔法 3D 接進 App 也可以開始做」；規格 story/新手體驗定案_141_兩輪討論.md 第十二、十六、十九節）----------
   前綴 bhfx／BHFX（全域先 grep 過沒撞名）。特效本體是 xiangqi-lab/src/bossfx3d.js（XQBossFx3D.create(api)），場景、鏡頭、格子座標由 park3d 的 fxApi() 正式交出。
   11/14 查過 App 現有玩法：還沒有太虛星尊上場的關卡——星域一 6 關的守關是星樞卒將（07bht-td.js，招牌招「引力撕裂」）；序局 bh:xu 的黑將換成太虛星尊、先放一招隕星碎示威（第十七節）也還沒做；
   「虛空鎖」只出現在步步為營的說明（td.li＝下一次鎖不住的兵），沒有真的會鎖子的招。所以三招都只做好接口：
     bhfxPlay(k,o,opt)  k＝"meteor" 隕星碎｜"lock" 虛空鎖｜"river" 星河震；o＝目標（格式見 bossfx3d.js 開頭，可以用 bhfxPlan 照第十二節的表挑）。
                        3D 黑洞巨盤開著、魔王在場才播，回 Promise<true>；平面棋盤、還沒載好、正在播別招 → Promise<false>。App 沒有 2D 版魔法，平面棋盤維持現狀（什麼都不播）。
                        opt（選填）：turn()＝紫墨警告圈出現後等玩家走一步的 Promise（沒給就停 1.6 秒）；remove(list)＝化墨播完把 [[c,r]…] 的子真的拿掉（沒給＝棋子放回來，不改盤面）；tip(text)＝狀態字
     bhfxParkEx(st)     疊在 07bh bhParkEx 後面：魔王要上場時給 park3d ex.bhBoss＝{k:"taixu"}（黑將照常是一顆棋子、只藏外觀，魔王站在黑將的位置往黑方底線退 .45 格）
     bhfxSync(st)       07bh bhTick 每次叫：魔王該上場就（第一次才）載 bossfx3d.js、data/bhtd/b_taixu.glb、data/bhtd/fx 與 cao 的魔法圖，建特效；不該上場就收掉
     bhfxBossOn(st)     魔王在不在場：現在只有開發者測試台的開關（dvtTaixu）。之後做太虛星尊關卡，在這裡加那一關的判斷、在那一關的放招時機叫 bhfxPlay
   現在能看到的入口：設定 → 進階 → 🧪 開發者測試台「👑 太虛星尊魔法 3D」（bhfxTry；只有開發者模式）。
   11/14 開發者決定（第十七節）：太虛星尊第一次正式上場＝序局 bh:xu——黑將換成太虛星尊；開局先放一招隕星碎示威（bhfxXu）：只落在空格、不碰任何紅子，沒有化墨、不扣元氣、不改盤面。
     演出照定案：施法 → 草書招名 → 紫墨警告圈 → 落下；照塔防的設定「戰鬥演出」bhtdFx（完整／簡化＝跳過草書／關閉＝只閃 0.5 秒招名）；
     演出中點 3D 盤面＝直接結算（第二十一節防煩躁：那一下只用來跳過，不會順便選子）。平面棋盤不播（維持原本的序局）。
     序局將死時 park3d 讓黑將從頭往下消融成茶霧：魔王跟著那顆將的縮放一起消融、消失（bossScale），星盤環和茶霧照魔王的高度（ex.bhBoss.h）。
   載入量：bossfx3d.js 約 45 KB、b_taixu.glb 1.04 MB、魔法圖約 0.9 MB，都只在魔王第一次上場時才抓；data/bhtd 不在 preload.json 的資料夾裡，一般首頁不會下載。 */
/* #BHFX-PURE-BEGIN（純函式：tools/test-bhfx.js 直接載這一段） */
const BHFX_K={meteor:"隕星碎",lock:"虛空鎖",river:"星河震"};
const BHFX_V={R:9,C:4.5,N:4,B:2,A:2,P:1,K:0};
/* 照第十二節的表挑目標。board＝90 格陣列（大寫紅方＝玩家，第 0 列＝黑方底線）；big＝第二階段（元氣 50 以下）；skip＝不能挑的格子（例如步步為營護住的兵）
   隕星碎：玩家 1 顆大子（俥、炮、傌；價值高的先，同價挑最往前的）那一格；第二階段 3×3；化墨的是範圍內的紅子（帥不在移除範圍）。沒有大子＝null
   虛空鎖：過河的紅子（帥除外）2 顆、第二階段 4 顆；最往前的先挑，同一列挑大子。沒有過河子＝null
   星河震：河界（第 4、5 列）上的棋子都標出來（紅子各扣 5 由玩法算，這裡只標誰站在河界） */
function bhfxPlan(k,board,big,skip){const B=board||[],sk=new Set(skip||[]),red=p=>!!p&&p===p.toUpperCase(),L=[];
  for(let q=0;q<90;q++){const p=B[q];if(red(p)&&p!=="K"&&!sk.has(q))L.push({q,p,c:q%9,r:q/9|0,v:BHFX_V[p]||0})}
  if(k==="meteor"){const t=L.filter(x=>"RCN".includes(x.p)).sort((a,b)=>b.v-a.v||a.r-b.r||a.c-b.c)[0];if(!t)return null;
    const cells=big?[-1,0,1].flatMap(dr=>[-1,0,1].map(dc=>[t.c+dc,t.r+dr])).filter(([c,r])=>c>=0&&c<=8&&r>=0&&r<=9):[[t.c,t.r]];
    return{c:t.c,r:t.r,big:!!big,cells,kill:cells.filter(([c,r])=>{const p=B[r*9+c];return red(p)&&p!=="K"&&!sk.has(r*9+c)})}}
  if(k==="lock"){const cells=L.filter(x=>x.r<=4).sort((a,b)=>a.r-b.r||b.v-a.v||a.c-b.c).slice(0,big?4:2).map(x=>[x.c,x.r]);return cells.length?{cells}:null}
  if(k==="river"){const hit=[];for(let q=36;q<54;q++){const p=B[q];if(p)hit.push([q%9,q/9|0,red(p)?"r":"b"])}return{big:!!big,hit}}
  return null}
/* 魔王站位：黑將所在那一格往黑方底線退 back 格（格子座標；第 0 列是黑方底線，所以是 r−back） */
function bhfxSpot(c,r,back){return[c,r-(back==null?.45:back)]}
/* 序局示威（11/14 開發者：只落在空格，不碰任何紅子）：挑一個空格，周圍 3×3 最好連一顆子都沒有（爆光、墨花看起來才不像打到誰），
   其次周圍沒有紅子，最後才是任何空格；同一級挑離盤面中心（第 4 路、河界中線）最近的，再挑靠紅方那邊、靠左。回傳 bhfxPlan 隕星碎同格式、kill 一定是空的；整盤沒空格＝null */
function bhfxEmptyPlan(board){const B=board||[],red=p=>!!p&&p===p.toUpperCase(),L=[];
  for(let q=0;q<90;q++){if(B[q])continue;const c=q%9,r=q/9|0;let any=0,rd=0;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const cc=c+dc,rr=r+dr;if(cc<0||cc>8||rr<0||rr>9)continue;const p=B[rr*9+cc];if(p){any=1;if(red(p))rd=1}}
    L.push({c,r,t:any?(rd?2:1):0,d:Math.abs(c-4)+Math.abs(r-4.5)})}
  L.sort((a,b)=>a.t-b.t||a.d-b.d||b.r-a.r||a.c-b.c);const t=L[0];return t?{c:t.c,r:t.r,big:false,cells:[[t.c,t.r]],kill:[]}:null}
/* 戰鬥演出設定（塔防的 bhtdFx：full 完整／simple 簡化／off 關閉；沒有或不認得＝完整）。
   rm＝系統開了「減少動態效果」（開發者 11/14）：完整當成簡化（跳過草書招名、其餘照播）；簡化、關閉照設定 */
function bhfxModeOf(v,rm){const m=v==="simple"||v==="off"?v:"full";return rm&&m==="full"?"simple":m}
/* #BHFX-PURE-END */
const BHFX_AS={glb:"data/bhtd/b_taixu.glb",fx:"data/bhtd/fx/",cao:"data/bhtd/cao/"};
let BHFX=null,BHFX_P=null,BHFX_CUR=null,BHFX_ST=null;
const BHFX_XU="bh:xu",BHFX_H=2.5,BHFX_HI="星河萬古，誰敢亂我星局？";   /* 序局（07bh BHX_ID）、魔王是七星的 2.5 倍高（第十二節）、登場台詞（第十二節） */
function bhfxBossOn(st){try{if(!st||typeof bhIs!=="function"||!bhIs(st))return false;if(st.journey===BHFX_XU)return true;return typeof dvtOn==="function"&&dvtOn()&&!!store.get("dvtTaixu",0)}catch(e){return false}}   /* 序局一定在場；其他黑洞局只有開發者測試台打開時 */
function bhfxParkEx(st){if(BHFX&&BHFX.noBoss&&typeof PARK!=="undefined"&&PARK&&BHFX.pv===PARK.v)return null;return bhfxBossOn(st)?{bhBoss:{k:"taixu",h:BHFX_H}}:null}
function bhfxNoBoss(me){me.noBoss=true;try{const L=PARK.last;if(L&&PARK.v===me.pv)PARK.v.draw(L.board,L.o,Object.assign({},L.ex,{bhBoss:null}))}catch(e){}}
function bhfxMode(){let rm=false;try{rm=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){rm=false}
  try{return bhfxModeOf(typeof bhtdFxMode==="function"?bhtdFxMode():store.get("bhtdFx","full"),rm)}catch(e){return rm?"simple":"full"}}
/* 開發者 11/14：手機橫向滿版（07bh bhFullCss 同一個條件）示威期間，上方中間的狀態條「輪到你」（#stat）先藏起來，不擋 2.5 倍高的魔王頭；播完放回來 */
function bhfxXuCss(on){if(typeof document==="undefined"||!document.body)return;if(on&&!document.getElementById("bhfxCss")){const s=document.createElement("style");s.id="bhfxCss";
  s.textContent="@media (orientation:landscape) and (max-height:600px){body.bh-full.bhfx-xu #stat{visibility:hidden!important}}";document.head.append(s)}document.body.classList.toggle("bhfx-xu",!!on)}
/* 序局開場前先下載（07bh bhxIntro 叫）：特效程式、魔王模型、魔法圖都進快取（sw.js），進場就不用等 */
let BHFX_PRE=null;
function bhfxPre(){if(BHFX_PRE||typeof fetch!=="function")return BHFX_PRE;
  const U=[BHFX_AS.glb].concat(["meteor","burst","shards","ink_splash","seal","chain_ring","chain_bar","chain_break","river","wave","ripple","droplets"].map(n=>BHFX_AS.fx+n+".webp"),["meteor","lock","river"].map(n=>BHFX_AS.cao+"cao_"+n+".webp"));
  BHFX_PRE=(async()=>{try{await bhfxLoad()}catch(e){}for(const u of U){try{await fetch(u,{cache:"force-cache"}).then(r=>r.ok?r.arrayBuffer():null)}catch(e){}}})().catch(()=>{});return BHFX_PRE}
function bhfxLoad(){return BHFX_P||(BHFX_P=(async()=>{if(!window.XQBossFx3D)await loadScript((OFF?"bossfx3d.js":"/m/bossfx3d.js")+"?v="+encodeURIComponent(window.XQ_BUILD||""));if(!window.XQBossFx3D)throw new Error("bossfx3d.js 載不到")})().catch(e=>{BHFX_P=null;throw e}))}
function bhfxOff(){const me=BHFX;BHFX=null;if(!me)return;try{if(me.abort)me.abort()}catch(e){}try{if(me.unhook)me.unhook()}catch(e){}try{if(me.fx)me.fx.dispose()}catch(e){}}   /* abort：正在播的招立刻結束（dispose 會讓特效裡等著的計時永遠不回來） */
function bhfxSync(st){if(st&&typeof bhIs==="function"&&bhIs(st))BHFX_ST=st;const on=bhfxBossOn(st),pv=typeof PARK!=="undefined"&&PARK&&PARK.v||null;
  if(!on){if(BHFX)bhfxOff();return}if(!pv||typeof pv.fxApi!=="function")return;
  if(!BHFX||BHFX.pv!==pv){bhfxOff();const A=pv.fxApi();if(!A)return;const me=BHFX={pv,A,fx:null,unhook:null,ready:null};
    me.ready=bhfxLoad().then(()=>{if(BHFX!==me)return false;me.fx=bhfxMake(me);return me.fx.ready}).then(ok=>!!ok&&BHFX===me).catch(e=>{console.warn("[bhfx]",e);return false})
      .then(ok=>{if(BHFX!==me||(ok&&me.fx&&me.fx.boss))return ok;bhfxNoBoss(me);return false})}   /* 程式或魔王模型載不到（離線、CDN 掛了）：黑將外觀放回來，不播示威，序局照原本的樣子下 */
  if(bhfxXuWant(st)&&BHFX_XUID!==st.id)bhfxXu(st,BHFX)}   /* 序局：開場示威（每盤一次） */
function bhfxMake(me){const A=me.A,T=A.T,DIR=new T.Vector3();
  const fx=XQBossFx3D.create({T,scene:A.scene,camera:A.camera,el:A.el,canvas:A.canvas,cell:A.cell,gs:A.gs,piece:A.piece,fxParent:A.board,mirrorGroup:A.mirror,poke:A.poke,
    glb:u=>window.XQGLB(u),base:BHFX_AS.fx,caoBase:BHFX_AS.cao,bossGlb:BHFX_AS.glb,bossYaw:-Math.PI/2,bossH:(A.pieceH||1.55)*2.5,   /* 2.5 倍高、模型原檔正面朝 +x 要轉 −90° 才面向紅方（試看頁 11/13 驗過） */
    /* 黑將那顆棋子的本地座標（倒影那一次它被搬進鏡像群組，本地座標不變；用世界座標會拿到鏡像那一點），往黑方底線退 .45 格；高度固定站在棋盤面 */
    bossAt:out=>{const k=A.find("k");if(!k||!k.visible)return null;   /* 將死消融完 park3d 把黑將藏起來：魔王也一起消失 */const[c0,r0]=bhfxSpot(4,1);DIR.copy(A.cell(c0,r0)).sub(A.cell(4,1));out.set(k.position.x+DIR.x,A.top,k.position.z+DIR.z);return out},
    bossTurn:()=>A.flip()?Math.PI:0,bossScale:()=>{const k=A.find("k");return k?k.scale:null},   /* 黑將平常縮放 1；序局將死時從頭往下消融，魔王跟著 */
    playerTurn:()=>BHFX_CUR&&BHFX_CUR.turn?BHFX_CUR.turn():new Promise(r=>setTimeout(r,1600)),
    remove:list=>{if(BHFX_CUR&&BHFX_CUR.remove)return BHFX_CUR.remove(list);for(const[c,r]of list||[]){const g=A.piece(c,r);if(g)g.visible=true}},   /* 沒有玩法接著：棋子放回來，不改盤面 */
    tip:t=>{if(BHFX_CUR&&BHFX_CUR.tip)try{BHFX_CUR.tip(t)}catch(e){}}});
  /* 構圖微調（試看頁 preview3d.html 的 frameFix 搬過來，只在魔王在場時）：拉遠的全盤視角下，把鏡頭往上抬一點，讓 2.5 倍高的魔王施法浮起時頭頂留在畫面上方 80% 以內，
     但紅方底線不低於畫面下方 92%；轉開、拉近、望遠鏡、翻到背面就不抬。一格畫三次，用鏡頭的位置轉向判斷這一格抬過了沒 */
  const CAM=A.camera,AQ=new T.Quaternion(),AP=new T.Vector3(),VA=new T.Vector3();let adj=false;
  const ang=v=>{VA.copy(v).applyMatrix4(CAM.matrixWorldInverse);return Math.atan2(VA.y,-VA.z)};
  const frameFix=()=>{const b=fx.boss;if(!b||!b.visible)return;if(adj&&CAM.quaternion.equals(AQ)&&CAM.position.equals(AP))return;let k=0;
    const s=A.view();if(!s.tele&&!s.under&&s.zoom>=.85){const y=Math.abs(Math.atan2(Math.sin(s.yaw),Math.cos(s.yaw)));k=Math.max(0,Math.min(1,(.7-y)/.4))*Math.min(1,(s.zoom-.85)/.14)}   /* 11/14：鏡頭轉回全盤的途中就慢慢開始抬（原本要拉到 .999 才抬，序局示威時魔王頭會先被切掉） */
    if(k>0){CAM.updateMatrixWorld();const t=Math.tan(CAM.fov*Math.PI/360),top=b.position.clone();top.y+=fx.bossH*1.22;
      const need=ang(top)-Math.atan(t*.8),room=ang(A.cell(4,10.2))+Math.atan(t*.92),d=Math.max(0,Math.min(need,room))*k;if(d>1e-4){CAM.rotateX(d);CAM.updateMatrixWorld()}}
    AQ.copy(CAM.quaternion);AP.copy(CAM.position);adj=true};
  me.unhook=A.hook(kind=>{if(kind==="main")try{frameFix()}catch(e){}fx.pass(kind)});
  return fx}
/* 點 3D 盤面一下（第二十一節「放招中點盤面直接結算」）：抓在 3D 容器的捕獲階段，這一下只用來跳過，不會傳到棋盤去選子 */
function bhfxTap(el){let off=()=>{};const p=new Promise(r=>{const h=e=>{try{e.stopPropagation();if(e.cancelable)e.preventDefault()}catch(x){}off();r("tap")};el.addEventListener("pointerdown",h,true);off=()=>el.removeEventListener("pointerdown",h,true)});return{p,off:()=>off()}}
/* 回傳：true＝播完；"skip"＝中途點盤面跳過（特效立刻收掉，呼叫的人照常結算）；"off"＝設定「戰鬥演出：關閉」只閃招名；false＝沒播（平面棋盤、還沒載好、正在播別招） */
async function bhfxPlay(k,o,opt){const me=BHFX;if(!me||!BHFX_K[k]||!o)return false;let ok=false;try{ok=await me.ready}catch(e){ok=false}
  if(!ok||BHFX!==me||!me.fx||me.fx.busy||!me.A.shown())return false;const mode=bhfxMode();
  if(mode==="off"){try{toast("✦ 太虛星尊："+BHFX_K[k])}catch(e){}await new Promise(r=>setTimeout(r,500));return"off"}
  BHFX_CUR=opt||null;const tap=opt&&opt.noTap?null:bhfxTap(me.A.el);let tm=0;
  /* 保險：魔王被收掉（離開對局、換園子）或 25 秒還沒播完（分頁在背景、動畫停住），一樣當成跳過，呼叫的人才不會一直等、序局鏡頭和狀態條才放得回來 */
  const ab=new Promise(r=>{me.abort=()=>r("abort");tm=setTimeout(()=>r("late"),25000)});
  try{const r=await Promise.race([me.fx.play(k,o,{cao:mode!=="simple"}),tap?tap.p:new Promise(()=>{}),ab]);if(r==="tap"||r==="late"||r==="abort"){if(r!=="abort")try{me.fx.reset()}catch(e){}return"skip"}return r}
  catch(e){console.warn("[bhfx]",e);return false}finally{if(tap)tap.off();clearTimeout(tm);me.abort=null;BHFX_CUR=null}}
/* ---------- 序局：太虛星尊開場示威（11/14 開發者決定）----------
   進序局、3D 巨盤、魔王和魔法圖載好、玩家還沒走 → 鏡頭轉到「🌌 全盤」（序局原本的斜看角度會切掉 2.5 倍高的魔王頭）→ 登場台詞 → 隕星碎落在空格（bhfxEmptyPlan）→ 轉回序局原本的角度（07bh BHX_CAM）。
   每一盤只播一次；玩家已經走了、換到平面棋盤、載不到 → 不播，鏡頭照序局原本的安排。播的時候 07bh bhxGo 的開場鏡頭先讓開（bhfxXuBusy） */
let BHFX_XUID=null,BHFX_XUON=false;
const bhfxXuWant=st=>!!st&&st.journey===BHFX_XU&&!st.result&&!(st.moves||[]).length;
function bhfxXuBusy(){return BHFX_XUON}
async function bhfxXu(st,me){if(!st||BHFX_XUID===st.id)return;BHFX_XUID=st.id;BHFX_XUON=true;
  const cam=()=>{try{if(BHFX===me&&bhfxXuWant(BHFX_ST)&&typeof BHX_CAM!=="undefined")me.pv.setView(BHX_CAM)}catch(e){}};
  try{let ok=false;try{ok=await me.ready}catch(e){ok=false}
    if(ok)await new Promise(r=>{let d=0;const f=()=>{if(!d){d=1;r()}};try{me.pv.whenShown(()=>setTimeout(f,400))}catch(e){f()}setTimeout(f,30000)});   /* 等 3D 載入畫面淡出（角色都站好）再開始；30 秒還沒出來就不播 */
    const now=()=>BHFX===me&&BHFX_ST&&BHFX_ST.id===st.id&&bhfxXuWant(BHFX_ST)&&me.A.shown();
    if(!ok||!now())return;
    if(bhfxMode()==="off"){await bhfxPlay("meteor",bhfxEmptyPlan(BHFX_ST.board),{});return}
    bhfxXuCss(true);try{me.pv.setView("bh_home")}catch(e){}
    try{toast("✦ 太虛星尊：「"+BHFX_HI+"」")}catch(e){}
    const settle=async()=>{await new Promise(r=>setTimeout(r,1100));const t0=Date.now();while(Date.now()-t0<1500){const v=me.A.view();if(Math.abs(v.zoom-1)<.03&&Math.abs(v.yaw)<.05)break;await new Promise(r=>setTimeout(r,100))}return"go"};   /* 台詞停 1.1 秒，鏡頭還在轉就再等一下（最多 1.5 秒） */
    const tap=bhfxTap(me.A.el),w=await Promise.race([settle(),tap.p]);tap.off();   /* 這時點盤面＝整段跳過 */
    if(w==="tap"||!now())return;
    const L=typeof PARK!=="undefined"&&PARK&&PARK.last&&PARK.last.board||BHFX_ST.board,o=bhfxEmptyPlan(L);if(o)await bhfxPlay("meteor",o,{})}
  catch(e){console.warn("[bhfx]",e)}finally{BHFX_XUON=false;try{bhfxXuCss(false)}catch(e){}cam()}}
/* 開發者測試台：在目前這盤黑洞局叫魔王上場、放一招（只播特效：棋子不會真的被拿掉、不扣元氣、不鎖子） */
async function bhfxTry(k){const st=BHFX_ST;if(!st||!bhIs(st)||!/^#\/journey\/play/.test(location.hash))return toast("先開一盤黑洞局（測試台「直接開星樞星盤對局」），用 3D 巨盤");
  if(typeof PARK==="undefined"||!PARK||!PARK.v||typeof PARK.v.fxApi!=="function"||!PARK.v.fxApi())return toast("要切到 3D 巨盤才看得到");
  if(!store.get("dvtTaixu",0)){store.set("dvtTaixu",1);toast("👑 太虛星尊上場中……");try{const L=PARK.last;if(L)PARK.v.draw(L.board,L.o,Object.assign({},L.ex,{bhBoss:{k:"taixu",h:BHFX_H}}))}catch(e){}}
  bhfxSync(st);const me=BHFX;if(!me)return toast("魔王還沒準備好");const ok=await me.ready.catch(()=>false);if(!ok)return toast("魔王模型或魔法圖載不到");
  const L=PARK.last,b=L&&L.board||st.board,td=st.td,skip=td&&Array.isArray(td.li)?Object.keys(td.pid||{}).filter(q=>td.li.includes(td.pid[q])).map(Number):[];
  const o=bhfxPlan(k,b,!!store.get("dvtTaixu2",0),k==="lock"?skip:null);if(!o)return toast(k==="meteor"?"盤上沒有俥、炮、傌可以打":"沒有過河的紅子可以鎖");
  const done=await bhfxPlay(k,o,{tip:t=>toast("👑 "+t),remove:list=>{for(const[c,r]of list){const g=me.A.piece(c,r);if(g)g.visible=true}toast("（試看：棋子沒有真的被拿掉）")}});
  if(!done&&me.fx&&me.fx.busy)toast("上一招還在播")}
