/* ---------- 黑洞・星樞棋局（hspx 開發者 11/12：「星槎在穿越時空時有 10% 掉入黑洞……7 個角色聚集在一張超大棋盤上……跟電腦下棋，對手是神秘的力量」）----------
   流程：星槎起航／換朝代播完千秋穿梭 → 10% 偏航（bhMaybe）→ 選「接受棋局」或「先回航線」（回航不扣任何東西，照原流程停靠）
   → 接受：石桌往事的對局機制開一盤 journey "bh:<朝代>"（不計積分、不扣分），3D 是巨盤模式（park3d opt.giant）：
     棋盤浮在黑洞環景裡，紅方棋子是雲河七星（本體＋星影分身），黑方是星樞的發光棋子；鏡頭從俯視全盤一路放大到站在棋盤上的第一人稱
   → 下完「⛵ 星槎回航」回到原本要停靠的那一站。
   文案：story/chatgpt_app/109_星槎黑洞_文案_ChatGPT回覆.md（開發者選方案 A 本體＋星影分身、神秘力量叫「星樞」）；
   幻影棋客是黑洞無限循環裡算出來的棋手（開發者 11/12 選 ChatGPT 方案二）——不說破，星樞只留一句伏筆。
   測試：localStorage 設 xq_bhForce＝1，下一次起航一定偏航；或在主控台叫 bhOffer("tang") 直接跳選擇視窗 */
const BH_P=.1,BH_TXT={
  fall:"雲河忽然倒流，星槎被墨色星渦牽引！",
  again:["步越溪","又是這座星盤！這次換我先看路。"],
  wake:["齊轍","醒醒！我們在巨棋盤上，還成了棋子？"],
  voice:["星樞","來者，請在星盤上落子。"],
  rule:"黑洞棋局開始：照象棋規則對弈，勝和敗皆可返航。",
  lead:["田飛燕","局勢順風，別貪吃子，守住要點。"],
  behind:["沈方庭","慢慢來，先保帥，再找反擊。"],
  hush:["星樞","這一步……星盤上，早已落過千萬遍。"],
  win:["雷借花","贏啦！星光開門，星槎回航！"],
  lose:["駱躍梅","這局學到就好，星槎送我們回去。"],
  draw:["鐵連城","不分勝負，也算過了這一關。"]};
const BH_FACE={齊轍:"x_swordboy",田飛燕:"x_spiritgirl",雷借花:"x_martialgirl",駱躍梅:"x_miaogirl",沈方庭:"x_shuai",鐵連城:"x_shi",步越溪:"x_bing"};
const bhSay=([who,t])=>`<p class="pl-say">${BH_FACE[who]?`<img src="data/xs/prev_${BH_FACE[who]}.webp" alt="" onerror="this.remove()" style="width:44px;height:44px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px">`:""}${esc(who)}：「${esc(t)}」</p>`;
function bhForced(){try{return localStorage.getItem("xq_bhForce")==="1"}catch(e){return false}}
/* 星槎起航（shipSailGo、shipGoTo）播完千秋穿梭時叫：沒偏航就照原流程 next() */
function bhMaybe(k,next,cover){let hit=false;try{const mk=!!store.get("bhMark",0)&&!!k;if(mk)store.set("bhMark",0);hit=bhForced()||mk||Math.random()<BH_P}catch(e){}   /* bhMark：點過幻影棋客頭上的小黑洞，下一次起航必定偏航 */if(!hit||!k)return next();bhOffer(k,next,cover)}
/* 11/12 hspx「進黑洞要等 6～7 秒」：偏航視窗一跳出來就在背景先載 3D（three、園子程式）、14 個角色模型（一個接一個解析，不卡畫面）和黑洞的圖，
   玩家讀文字、按「入局」的時間拿來載入；不下這盤也只是先放進快取。一次 App 只做一次 */
let BH_PRE=null;const BH_GLB=["x_shuai","x_shi","x_spiritgirl","x_miaogirl","x_swordboy","x_martialgirl","x_bing","xs_jiang","xs_shi","xs_xiang","xs_ma","xs_che","xs_pao","xs_zu"];
function bhPreload(){if(BH_PRE||typeof document==="undefined")return BH_PRE;
  for(const f of["bh_far2","bh_layer2","bh_layer3b","bh_board2","bh_river"]){try{const im=new Image();im.decoding="async";im.src="data/park/"+f+".webp"}catch(e){}}
  /* 1180 原本在這裡就解析模型（XQGLB），iPhone 每個要幾百毫秒、會卡住畫面，開發者 hspx「入局按下去要等 5 秒」→ 1190 改成只下載進快取（fetch，交給 sw.js 存），解析留到進場 */
  BH_PRE=(async()=>{for(const g of BH_GLB){try{await fetch("data/tripo_app/"+g+".glb",{cache:"force-cache"}).then(r=>r.ok?r.arrayBuffer():null)}catch(e){}}})().catch(()=>{});return BH_PRE}
function bhOffer(k,next,cover){const n=store.get("bhCount",0)||0;bhMus("fall");vibrate([20,60,20]);try{bhPreload()}catch(e){}
  modal(`<div class="em">🌀</div><h2>${n?"星槎偏航":esc(BHX_FD.title)}</h2><p>${esc(BH_TXT.fall)}</p>${n?bhSay(BH_TXT.again):BHX_FD.desc.map(t=>`<p class="muted" style="font-size:13px">${esc(t)}</p>`).join("")}<p class="muted" style="font-size:13px">墨色星渦的中心，浮著一張巨大的棋盤。要下這一盤嗎？不下也不扣任何東西，星槎照原本的航線停靠。</p>`,
    [["🌀 接受棋局",()=>bhIntro(k,cover)],["先回航線",()=>{bhMus(null);if(next)next()},true]],"prolog")}
function bhIntro(k,cover){try{bhPreload()}catch(e){}modal(`<div class="em">♟</div><h2>星樞棋局</h2>${bhSay(BH_TXT.wake)}<p class="pl-say">✦ ${esc(BH_TXT.voice[0])}：「${esc(BH_TXT.voice[1])}」</p><p class="muted" style="font-size:13px">${esc(BH_TXT.rule)}<br>不計積分、不扣分。可以用＋／－或兩指縮放：拉遠看整盤，放大到最近就站在棋盤上。</p>`,
  [["入局",()=>bhStart(k,cover)]],"prolog")}
/* 難度見 bhLevel（實力＋1）；bhAdj 只是記錄輸贏，不再調難度 */
/* 開發者 11/12「黑洞的電腦難度會評估你現在的實力，往上加一等級的難度給玩家挑戰」：實力＝三個取最高——晉級賽段位對應的電腦級數（第 N 級的名字就是段位表第 N 個）、
   挑戰電腦贏過的最高級數（local.js 的 record）、練功房選過的級數；都沒有就當第 2 級。黑洞＝實力＋1（最高第 18 級） */
const BH_RK=[0,50,100,150,200,300,400,500,600,700,800,900,1000,1150,1300,1500,1700];
function bhLevel(){let s=0;const J=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
  const R=J("xq_cpuRate");if(R&&(R.w||R.l||R.d)){let ci=0;BH_RK.forEach((t,i)=>{if((+R.pts||0)>=t)ci=i});s=ci+1}
  const rec=J("xq_record")||{};for(const k in rec)if(rec[k]&&rec[k].w>0)s=Math.max(s,+k||0);
  const cl=store.get("cpuLevel",null);if(cl!=null)s=Math.max(s,+cl||0);if(!s)s=2;
  const fst=!((+store.get("bhCount",0)||0)>0);return Math.max(1,Math.min(18,s+(fst?-1:1)))}   /* 開發者 11/12 選：第一次真正偏航「星樞未醒」＝實力 −1，第二次起才 ＋1（序局不算次數） */
function bhStart(k,cover){{const lk=typeof bhtdLock==="function"?bhtdLock():"";if(lk){toast("🌫 "+lk);try{bhMus(null);if(cover!==false&&k&&typeof shipDockCover==="function")shipDockCover(k,()=>{})}catch(e){}return}}   /* 11/14：定軌力用完＝黑洞入口關著（07bht bhtdLock → 07dgl dglBhLock） */
  if(typeof BHTD_ON!=="undefined"&&BHTD_ON&&typeof bhtdSelect==="function"){bhtdSelect(k,cover);return}   /* 開發者 11/13：黑洞對戰改成陣地塔防，先選關卡（m/07bht-td.js） */
  try{bhPreload()}catch(e){}store.set("bhRet",{k,cover:cover!==false,at:Date.now(),first:!((+store.get("bhCount",0)||0)>0)});store.set("park3d",true);
  jStart("bh:"+k,{human:"r",lx:bhLevel(),journey:"bh:"+k},()=>{location.hash="#/journey/play";setTimeout(()=>toast("✦ 星樞："+BH_TXT.voice[1]),900)})}
const bhIs=st=>!!st&&String(st.journey||"").startsWith("bh:");
/* 對局頁的 3D：巨盤模式＋黑洞環景（08b-cpugame 的 parkDraw 參數最後疊上去） */
/* 開發者 11/12「黑洞對戰自動轉成手機／平板的橫向遊玩；等於是滿版的對戰，其他原本的文字你幫我優化要放哪」＋hspx「搖桿直向橫向都能使用」：
   網頁沒辦法強制轉螢幕（iPhone 不支援），開發者選「提示轉橫向＋滿版排版」：
   黑洞局在 body 掛 bh-full；橫向（高度 ≤ 600）時 3D 星盤蓋滿頂欄以下整個畫面，其他資訊縮成浮在上面的小條：
   左上＝對手（星樞、級數）、左下＝自己、上方中間＝狀態（輪到你、形勢）、右側直排＝按鈕（悔棋、認輸…）；棋譜條、棋規條、場景名收起來；
   左上第二排＝棋距拉桿、左下第二排＝平面棋盤；搖桿在右下（+／－ 的左邊），直向時照舊在下方中間。直向進黑洞局時提示一次「轉橫向會滿版」 */
function bhFullCss(){if(document.getElementById("bhFullCss"))return;const s=document.createElement("style");s.id="bhFullCss";s.textContent=`@media (orientation:landscape) and (max-height:600px){
body.bh-full .view.fixed:has(>#bbox):has(>#acts)>#bbox{position:fixed!important;grid-column:auto!important;left:0!important;right:0!important;top:var(--bhTop,56px)!important;bottom:auto!important;width:100vw!important;height:calc(100dvh - var(--bhTop,56px))!important;max-height:none!important;padding:0!important;margin:0!important;z-index:40;background:#05060d}
body.bh-full .view.fixed:has(>#bbox):has(>#acts)>#bbox .park3d{border-radius:0!important}
body.bh-full #pTop,body.bh-full #pBot,body.bh-full #stat,body.bh-full #acts{position:fixed!important;z-index:41;margin:0!important}
body.bh-full #pTop,body.bh-full #pBot{left:calc(8px + env(safe-area-inset-left,0px));width:auto!important;max-width:34vw;padding:4px 10px!important;border-radius:12px;background:rgba(10,10,30,.74)!important;color:#f1e7cf!important;transform:scale(.8)}
body.bh-full #pTop{top:calc(var(--bhTop,56px) + 6px);transform-origin:0 0}
body.bh-full #pBot{bottom:6px;transform-origin:0 100%}
body.bh-full #pTop *,body.bh-full #pBot *{color:inherit}
body.bh-full #stat{top:calc(var(--bhTop,56px) + 6px);left:50%;transform:translateX(-50%);max-width:44vw;padding:4px 12px!important;border-radius:99px;background:rgba(10,10,30,.74);color:#FFE08A!important;font-size:13px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.bh-full #acts{top:calc(var(--bhTop,56px) + 6px);right:calc(6px + env(safe-area-inset-right,0px));left:auto!important;width:auto!important;flex-direction:column;gap:2px;padding:4px!important;border-radius:14px;background:rgba(10,10,30,.62)!important;border:0!important}
body.bh-full #acts button{min-width:54px;font-size:11px!important;color:#f1e7cf!important;padding:3px 2px!important}
body.bh-full #strip,body.bh-full .evline,body.bh-full .rule-note,body.bh-full .pkname,body.bh-full .pk3d-back{display:none!important}body.bh-full .pkview{top:auto!important;right:auto!important;bottom:106px!important;left:10px!important}
body.bh-full .pk2d{top:auto!important;bottom:56px!important;left:10px!important}
body.bh-full .pzoom{right:calc(84px + env(safe-area-inset-right,0px))!important}
body.bh-full .gs-pop{right:calc(128px + env(safe-area-inset-right,0px))!important}
body.bh-full .gpad{left:auto!important;right:calc(130px + env(safe-area-inset-right,0px))!important;bottom:8px!important;transform:none!important}}`;document.head.append(s)}
function bhFull(on,st){if(typeof document==="undefined")return;const b=document.body;if(!b)return;if(!on){if(b.classList.contains("bh-full"))b.classList.remove("bh-full");return}bhFullCss();b.classList.add("bh-full");
  try{const tb=document.getElementById("topbar"),h=tb?Math.round(tb.getBoundingClientRect().bottom):56;document.documentElement.style.setProperty("--bhTop",Math.max(0,h)+"px")}catch(e){}
  try{const port=matchMedia("(orientation:portrait)").matches,k="bhRot:"+(st&&st.id||"");if(port&&st&&!st.td&&!sessionStorage.getItem(k)){   /* 11/14 塔防局直拿已經滿版：不再跳「轉橫向」，改在視角選單放一行靜態提示（07bht-td.js bhtdViewMenu）；轉向時（resize 沒帶 st）也不跳 */sessionStorage.setItem(k,"1");setTimeout(()=>{try{toast("📱 手機轉成橫向，黑洞星盤會滿版")}catch(e){}},1800)}}catch(e){}}
if(typeof window!=="undefined"){addEventListener("hashchange",()=>{if(!/^#\/journey\/play/.test(location.hash))bhFull(false)});addEventListener("resize",()=>{if(document.body&&document.body.classList.contains("bh-full"))bhFull(true,null)})}
function bhParkEx(st){bhFull(bhIs(st),st);if(!bhIs(st)){if(typeof BGM!=="undefined"&&BGM.force&&/^bh_/.test(BGM.force))bhMus(null);return null}return{giant:true,bg:"data/park/bh_far2.webp"   /* 11/12 ChatGPT 細修報告＋Gemini 回應：遠景改用 Gemini 重畫、左右無縫的版本 */,bgName:"🌀 黑洞・星樞棋局",bhStars:bhStarsEx(),era:"classic",quietMate:true,watchers:[],oppHello:null,opp:null,mateLook:null,crowd:null,...(typeof bhtdParkEx==="function"?bhtdParkEx(st):null),...(typeof bhfxParkEx==="function"?bhfxParkEx(st):null)   /* 11/14 太虛星尊上場：黑將外觀換成魔王（07bhf-bossfx.js；現在只有開發者測試台會開） */,
  gate:{img:["data/park/blackhole_360.webp"],icon:"🌀",title:"星樞棋局",sub:"墨色星渦的中心，有一張巨大的星盤",bg:"#05060d",quiet:true}}}
/* 對局中：領先、落後各提醒一次；下到中盤星樞說一句伏筆（不說破幻影棋客是什麼） */
let BH_T={id:null,s:{}};
function bhTick(st){try{if(typeof bhtdTick==="function")bhtdTick(st)}catch(e){console.warn("[bhtd]",e)}try{if(typeof bhfxSync==="function")bhfxSync(st)}catch(e){console.warn("[bhfx]",e)}   /* 11/14 太虛星尊魔法 3D：魔王該上場就延遲載入、建特效，不該就收掉（07bhf-bossfx.js） */   /* 陣地塔防：元氣、靈力條、招式鈕、盤上標記（07bht-td.js；不是陣地局就收起來） */
  if(bhIs(st))try{bhMusTick(st)}catch(e){}if(!bhIs(st)||st.result||!st.id)return;if(BH_T.id!==st.id)BH_T={id:st.id,s:{}};const S=BH_T.s,n=(st.moves||[]).length,me=st.human==="b"?-1:1,v=st.eval&&st.eval.v!=null?st.eval.v*me:null;
  const say=(k,L,ms)=>{if(S[k])return;S[k]=1;setTimeout(()=>{if(L[0]==="星樞")bhBell()},ms||600);setTimeout(()=>toast((L[0]==="星樞"?"✦ ":"")+L[0]+"："+L[1]),ms||600)};
  if(st.td){}else if(v!=null&&n>=8&&v>=280)say("lead",BH_TXT.lead);   /* 陣地塔防不看盤面評估（黑子還沒全上場） */else if(v!=null&&n>=8&&v<=-280)say("behind",BH_TXT.behind);
  if(n>=24&&st.turn===st.human)say("hush",BH_TXT.hush,1200)}
/* 07-legend journeyGameEnd 叫：記次數、照輸贏調下次難度 */
function bhGameEnd(st){if(st&&st.journey===BHX_ID){bhxEnd();return}if(st&&st.journey==="bh:tl"){if(typeof bhtlEnd==="function")bhtlEnd(st);return}   /* 塔防練習賽（07bhtl-tdlearn.js）：不算黑洞次數、輸贏、塔防進度 */   /* 序局不算進黑洞次數（第一次真正偏航才降一階） */store.set("bhCount",(store.get("bhCount",0)||0)+1);store.set("bhBackSay",1);if(st&&st.result&&st.result.w&&st.result.w===st.human)store.set("bhWin",(store.get("bhWin",0)||0)+1);if(st&&st.td&&typeof bhtdEnd==="function")bhtdEnd(st);   /* 陣地塔防：記破過哪一關 */   /* 戰勝過黑洞：幻影棋客頭上的小黑洞變成幻譜星門（07gx） */const a=+store.get("bhAdj",0)||0,w=st.result&&st.result.w;
  if(w===st.human)store.set("bhAdj",Math.min(0,a+1));else if(w)store.set("bhAdj",Math.max(-3,a-1))}
function bhResultModal(st,win,draw0,XPR){if(st&&st.journey===BHX_ID){bhxAfter();return}if(st&&st.journey==="bh:tl"&&typeof bhtlResult==="function"){bhtlResult(st,win,draw0,XPR);return}   /* 塔防練習賽的結果視窗 */if(st&&st.td&&typeof bhtdResult==="function"){bhtdResult(st,win,draw0,XPR);return}   /* 陣地塔防：下一關／重打本關 */const L=win?BH_TXT.win:draw0?BH_TXT.draw:BH_TXT.lose,R0=store.get("bhRet",null),fst=!!(R0&&R0.first);
  modal(`<div class="em">${win?"✨":draw0?"🤝":"🌀"}</div><h2>${win?"星光開門":draw0?"不分勝負":"星渦退去"}</h2><p class="muted">${esc(st.result.why||"")}・🌀 黑洞・星樞棋局（不計積分、不扣分）</p>${bhSay(L)}${win&&fst?`<p class="pl-say">✦ 星樞：「${esc(BHX_FD.win)}」</p>`:""}${XPR||""}`,
    [["⛵ 星槎回航",bhReturn],["再看一下星盤",null,true]],"res")}
/* 回航：回到星槎，原本是起航就照常出那一站的停靠封面 */
function bhReturn(){const R=store.get("bhRet",null);store.set("bhRet",null);location.hash="#/adventure";if(R&&R.first)setTimeout(()=>toast(BHX_FD.back),1200);
  if(R&&R.cover&&R.k&&typeof shipDockCover==="function")setTimeout(()=>{try{shipDockCover(R.k,()=>{})}catch(e){}},400)}
/* ---------- hspx（開發者 11/12，story/116 選「Claude 混搭」）：幻影棋客頭上的小黑洞，引沒搭過星槎的人去碰黑洞 ----------
   挑戰電腦（對手是幻影棋客、不是掌櫃，不是石桌往事、擂台、練習、線上、盲棋）：沒去過黑洞、這是玩過的第 6 盤以後，每天第一盤下到第 12 手，
   幻影棋客頭頂浮出一顆有裂痕的小黑洞球（park3d ex.bhOrb="ball"），不跳視窗、不擋棋盤。
   點它：球化成紫光飛走（park3d）→ 幻影棋客「天上這道裂痕，通往另一盤棋。」→ 提示「去搭星槎，找裂痕的另一端。」；記 bhMark，下一次起航必定偏航（bhMaybe）。
   去過黑洞以後：點過球的人，幻影棋客頭上只留一圈淡淡星塵（"dust"）；從黑洞回來後的第一盤，他開口說「你竟從那無盡的循環裡，帶回了新棋譜。」 */
const BH_ORB={say:"天上這道裂痕，通往另一盤棋。",   /* 11/13 開發者「這道裂，我算過，換個說法吧，有點怪」 */go:"去搭星槎，找裂痕的另一端。",back:"你竟從那無盡的循環裡，帶回了新棋譜。"};
function bhOrbDay(){const d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()}
function bhOrbKind(st){try{if(!st||!st.id||st.journey||st.arena||st.practice||st.net||st.blind)return null;{const F=store.get("dvtOrb",null);if(F&&typeof DEVMODE==="function"&&DEVMODE())return F}   /* 開發者測試台：固定出現哪一種 */if(typeof zgIs==="function"&&zgIs(st))return null;
  if((store.get("bhCount",0)||0)>0){if(store.get("bhWin",0)){const today=bhOrbDay(),G=store.get("gxGateDay",null);if(!G||G.d!==today){store.set("gxGateDay",{d:today,id:st.id});return"gate"}if(G.id===st.id)return"gate"}return store.get("bhOrbHit",0)?"dust":null}   /* 戰勝過黑洞：每天第一盤，頭上是幻譜星門（07gx-galaxy.js） */
  if(store.get("bhMark",0))return null;
  const L=store.get("bhOrbG",null)||{n:0,ids:[]};if(!L.ids.includes(st.id)){L.n=(L.n|0)+1;L.ids.push(st.id);while(L.ids.length>8)L.ids.shift();store.set("bhOrbG",L)}   /* 數玩過幾盤（不同的局） */
  if(L.n<6||st.result||(st.moves||[]).length<12)return null;
  const today=bhOrbDay(),D=store.get("bhOrbDay",null);if(!D||D.d!==today){store.set("bhOrbDay",{d:today,id:st.id});return"ball"}
  return D.id===st.id?"ball":null}catch(e){return null}}
/* 08b-cpugame 的 parkDraw 參數疊上：小黑洞／星塵；剛從黑洞回來的第一盤，換成那句開場白 */
let BH_ORB_K=null;
function bhOrbEx(st){const k=bhOrbKind(st),o={bhOrb:k};BH_ORB_K=k;if(k==="gate"&&typeof gxLit==="function")o.gxLit=gxLit();const fresh=st&&!st.journey&&!st.arena&&!(typeof zgIs==="function"&&zgIs(st));
  if(k!==undefined&&store.get("bhBackSay",0)&&fresh){store.set("bhBackSay",0);o.oppHello=BH_ORB.back}else if(fresh&&typeof gxHello==="function"){const h=gxHello(st);if(h)o.oppHello=h}return o}
/* 06-cpu parkInfo("orb")：點到小黑洞 */
function bhOrbTap(){if(BH_ORB_K==="gate"&&typeof gxMap==="function"){vibrate([10,40,10]);try{if(PARK&&PARK.v&&PARK.v.oppSay)PARK.v.oppSay("這門，我好像替你開過。",2.6)}catch(e){}setTimeout(()=>gxMap({from:"orb"}),700);return}   /* 幻譜星門：開星圖，不打擾這一盤 */
  vibrate([10,40,10]);store.set("bhMark",1);store.set("bhOrbHit",1);
  setTimeout(()=>{try{if(PARK&&PARK.v&&PARK.v.oppSay)PARK.v.oppSay(BH_ORB.say,3)}catch(e){}},500);
  setTimeout(()=>toast("🌀 "+BH_ORB.go),1900);try{if(typeof route==="function")setTimeout(()=>{if(PARK&&PARK.last)try{PARK.v.draw(PARK.last.board,PARK.last.o,Object.assign({},PARK.last.ex,{bhOrb:null}))}catch(e){}},1400)}catch(e){}}
/* ---------- 黑洞篇配樂（開發者 11/12，story/118 選 Claude 混搭＋三個點子）----------
   5 首 Lyria 主題曲 data/bgm/blackhole/bh_N.mp3：偏航視窗①墨渦墜槎 → 開局前 6 手②星盤初醒 → 平常③七星連枝 → 落後（≤ −150 分）或被將軍④星樞逼將 → 結算⑤幻門留影；
   離開黑洞對局就回朝代配樂。星樞吃掉七星、星樞開口時敲一聲極低的鐘（bhBell）。
   七星和聲（bhChord）：帥仕相傌俥炮兵各一個五聲音，疊在配樂底下很輕的一層；那種棋子全被吃光，那個音就淡出，殘局越下越孤單。都跟背景音樂開關、音量走 */
const BH_MUS={fall:"bh_1.mp3",wake:"bh_2.mp3",play:"bh_3.mp3",danger:"bh_4.mp3",end:"bh_5.mp3"};
function bhMus(k){try{if(typeof bgmForce==="function")bgmForce(k?BH_MUS[k]:null)}catch(e){}}
function bhBell(){try{if(typeof withAudio==="function"&&typeof AC!=="undefined"&&AC&&typeof gongHit==="function")withAudio(()=>gongHit(AC.currentTime+.02,58,3.4,true))}catch(e){}}
if(typeof window!=="undefined")window.XQ_BHBELL=bhBell;
/* 開發者 11/12 選 Gemini 方案 A＋「連續吃子音階上升」（park3d gntCapFx 呼叫）：紅方吃子＝往上揚的清亮三泛音，星樞吃子＝往下沉的吞噬聲；
   n＝連擊第幾下（4 手內又吃子），每多一下高一個全音（最多 6 級）；big＝車馬炮將帥，聲音大一點。走「棋子音效」音量 */
function bhCapSnd(n,red,big){try{if(typeof withAudio!=="function"||typeof AC==="undefined"||!AC)return;withAudio(()=>{const t=AC.currentTime+.02,f0=(red?660:330)*Math.pow(1.122,Math.min(6,Math.max(1,n|0))-1),dst=sxmDst("piece");
  for(const[k,a,d]of[[1,.16,.5],[2.01,.06,.35],[3,.03,.25]]){const o=AC.createOscillator(),g=AC.createGain();o.type=red?"sine":"triangle";o.frequency.setValueAtTime(f0*k,t);o.frequency.exponentialRampToValueAtTime(f0*k*(red?1.03:.62),t+d);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a*(big?1.3:1),t+.01);g.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(g);g.connect(dst);o.start(t);o.stop(t+d+.05)}})}catch(e){}}
if(typeof window!=="undefined")window.XQ_BHCAP=bhCapSnd;
/* hspx 1086（開發者 11/12「吃子需要氣勢非常強，打敗對手的視覺震撼」）：紅方物件命中那一下（park3d cineHit 呼叫）＝低頻重擊往下沉＋一陣碎響；s＝強度（將死那一步 1） */
function bhHitSnd(s){try{if(typeof withAudio!=="function"||typeof AC==="undefined"||!AC)return;withAudio(()=>{const t=AC.currentTime+.01,dst=sxmDst("piece"),o=AC.createOscillator(),g=AC.createGain();
  o.type="sine";o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(38,t+.45);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*s,t+.008);g.gain.exponentialRampToValueAtTime(.0008,t+.6);o.connect(g);g.connect(dst);o.start(t);o.stop(t+.65);
  const n=Math.floor(AC.sampleRate*.35),b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.5);
  const src=AC.createBufferSource(),f=AC.createBiquadFilter(),g2=AC.createGain();src.buffer=b;f.type="lowpass";f.frequency.value=1800;g2.gain.value=.35*s;src.connect(f);f.connect(g2);g2.connect(dst);src.start(t)})}catch(e){}}
if(typeof window!=="undefined")window.XQ_BHHIT=bhHitSnd;
/* hspx 1086（開發者 11/12 選「星盤閉合＋化氣為茶（合體）」，一般黑洞局用同一套簡化版；ChatGPT 140／141 號）：黑洞局將死不放通用水墨「絕殺」，
   改 park3d mateFx（吃子播完 → 九宮星線收束 → 星盤環停正 → 將化茶霧／星砂）；播完才跳結果視窗（MODAL_HOLD＋modalSkip）。3D 沒開就照舊 killFx */
function bhMateFx(st,k){try{if(!bhIs(st)||typeof PARK==="undefined"||!PARK||!PARK.v||typeof PARK.v.mateFx!=="function")return false;const xu=st.journey===BHX_ID,lp=st.board[k];
  MODAL_HOLD=Date.now()+15000;LAST_KFX=Date.now()+15000;   /* 01-board 的將死動畫看 LAST_KFX，這段期間不放 */
  const ok=PARK.v.mateFx({sq:k,tea:xu,cam:lp==="k",snd:x=>bhMateSnd(x,xu),done:()=>{LAST_KFX=Date.now();if(typeof modalSkip==="function")modalSkip();else MODAL_HOLD=0}});
  if(ok===false){MODAL_HOLD=0;LAST_KFX=0}return ok!==false}catch(e){return false}}
/* 絕殺音效：start＝音樂停半拍（序局第 2 首壓到幾乎無聲，0.65 秒後回到 .25）＋低沉編鐘；lock＝星盤停正「叮」；tea＝茶霧風鈴（五聲往上）；dust＝星砂（低一點、輕一點） */
function bhMateSnd(x,xu){try{if(x==="start"){if(xu&&typeof OP!=="undefined"&&OP.on){opVol(.02,.06);setTimeout(()=>{try{opVol(.25,1.4)}catch(e){}},650)}bhBell();return}
  if(typeof withAudio!=="function"||typeof AC==="undefined"||!AC)return;withAudio(()=>{const t=AC.currentTime+.02,dst=sxmDst("piece");
    const ping=(f,at,a,d)=>{const o=AC.createOscillator(),g=AC.createGain();o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(a,at+.01);g.gain.exponentialRampToValueAtTime(.0005,at+d);o.connect(g);g.connect(dst);o.start(at);o.stop(at+d+.05)};
    if(x==="lock"){ping(1568,t,.08,.6);ping(2349,t,.045,.4);ping(784,t,.06,.9)}
    else{const F=x==="tea"?[1318,1568,1760,2093,2637]:[880,1047,1319,1568];F.forEach((f,i)=>ping(f,t+i*.13,x==="tea"?.05:.035,1.6))}})}catch(e){}}
/* ---------- 開發者 11/12 選：黑洞望遠鏡裡的「七星故事星系」（story/127 整合：Gemini 125 方案 A「星海拾憶」＋ChatGPT 126 定稿文案）----------
   遠方 14 個天體裡指定 7 個當七星的記憶星系；照星槎劇情進度解鎖（停靠站數＝讀到第幾章，13 站全開＝第 14 章），還沒到的維持普通星雲、不爆雷。
   解鎖的星系閃霧金色；🔭 放大到 20 倍以上對準 → 浮現星點連成的星座（程式畫，第一期不出圖）、星名大字和一句回憶；第一次找到，那位角色說一句。七顆都找到後，棋盤星座浮現星樞的收束台詞 */
const BH_STARS=[
  {id:"qizhe",c:"齊轍",star:"輪痕星",fig:"wheel",ch:2,line:"兩個人一起看看路，再決定怎麼走。",say:"車有路了，我也看見了。"},
  {id:"shen",c:"沈方庭",star:"九宮星",fig:"palace",ch:4,line:"我坐得穩，勞你去看看他們。",say:"我坐在這裡，也看得見。"},
  {id:"tian",c:"田飛燕",star:"歸燈星",fig:"lamp",ch:6,line:"等候的人，也可以替歸路點燈。",say:"這盞燈，替歸路亮著。"},
  {id:"tie",c:"鐵連城",star:"護結星",fig:"knot",ch:8,line:"守護的人，也得聽見被守護的人。",say:"這次，我先聽你說。"},
  {id:"luo",c:"駱躍梅",star:"紅珠星",fig:"bead",ch:11,line:"跑多遠，我們都看得見你。",say:"我不藏了，你們陪我。"},
  {id:"bu",c:"步越溪",star:"卒旗星",fig:"flag",ch:13,line:"往前有用，留在能幫忙的地方，也有用。",say:"小卒站穩，也能過河。"},
  {id:"lei",c:"雷借花",star:"靜焰星",fig:"fire",ch:14,line:"聲音小一點，心意也不會少。",say:"別怕，我把聲音放輕。"}];
const BH_CLOSE="七星既明，千秋仍有路。";
function bhChapter(){try{if(typeof shipDockList!=="function"||!shipDockList())return 0;const n=shipDocked().length;return n+(n>=SHIP_ROUTE.length?1:0)}catch(e){return 0}}
function bhStarsEx(){const ch=bhChapter(),F=store.get("bhStarFound",[]);
  return{list:BH_STARS.filter(s=>ch>=s.ch).map(s=>({id:s.id,star:s.star,fig:s.fig,line:s.line,found:F.includes(s.id)})),all:BH_STARS.every(s=>F.includes(s.id)),close:BH_CLOSE}}
function bhStarFound(id){const s=BH_STARS.find(x=>x.id===id);if(!s)return;const F=store.get("bhStarFound",[]);if(F.includes(id))return;F.push(id);store.set("bhStarFound",F);
  try{toast(`✦ ${s.c}：「${s.say}」`)}catch(e){}if(F.length===BH_STARS.length)setTimeout(()=>{try{toast("✦ 七星都找到了。去看看那張星點棋盤……")}catch(e){}},2600)}
if(typeof window!=="undefined")window.XQ_BHSTAR=bhStarFound;
let BH_CH=null;
function bhChord(st){if(typeof AC==="undefined"||!AC||typeof sxmDst!=="function"||!store.get("bgm",true))return bhChordOff();const has={};for(const p of st.board||[])if(p&&p===p.toUpperCase())has[p]=1;
  if(!BH_CH){BH_CH={};const F={K:261.63,A:293.66,B:329.63,N:392,R:440,C:523.25,P:587.33};let i=0;
    for(const k in F){const o=AC.createOscillator(),g=AC.createGain(),lp=AC.createBiquadFilter();o.type=i++%2?"triangle":"sine";o.frequency.value=F[k];lp.type="lowpass";lp.frequency.value=1400;g.gain.value=0;o.connect(lp);lp.connect(g);g.connect(sxmDst("bgm"));o.start();BH_CH[k]={o,g}}}
  const t=AC.currentTime;for(const k in BH_CH)BH_CH[k].g.gain.setTargetAtTime(has[k]?.011:0,t,.8)}
function bhChordOff(){if(!BH_CH)return;const C=BH_CH;BH_CH=null;try{const t=AC.currentTime;for(const k in C){C[k].g.gain.setTargetAtTime(0,t,.4);C[k].o.stop(t+2)}}catch(e){}}
function bhMusTick(st){if(st&&st.journey===BHX_ID)return;   /* 序局放第 2 首（開場配樂），不跟著局面切 bh_1～5 */
  if(st.result){bhMus("end");bhChordOff();return}const n=(st.moves||[]).length,me=st.human==="b"?-1:1,v=st.eval&&st.eval.v!=null?st.eval.v*me:null,chk=st.check!=null&&st.check>=0&&st.turn===st.human;
  bhMus(n<6?"wake":(chk||(v!=null&&v<=-150))?"danger":"play");bhChord(st)}
if(typeof addEventListener==="function")addEventListener("hashchange",()=>{try{if(!/^#\/journey\/play/.test(location.hash)){bhChordOff();if(typeof BGM!=="undefined"&&BGM.force&&/^bh_/.test(BGM.force))bhMus(null)}}catch(e){}});

/* ---------- 第〇章「天裂星盤沉雲河」＋黑洞序局（hspx 開發者 11/12：「讓玩家還沒閱讀故事前，就能破題展開一場黑洞對戰，然後才開始後續的故事；創好角色後就會馬上從一個入口掉進黑洞」）----------
   文案：story/chatgpt_app/132（ChatGPT 寫），審稿 story/gemini_app/133（Gemini）。開發者選：序局＝一步殺一定贏；分鏡前 2 頁先播、其餘下完再看；選角確認後直接被星渦吸走。
   流程：選角確認 → 星渦把角色吸走 → 第 1 頁「天裂成河」（程式疊星線棋盤）、第 5 頁「黑洞開口」→ 星樞邀局 → 3D 黑洞序局（journey "bh:xu"）
   → 下完：星樞「循著茶香，去尋你們的青石吧」→ 第 2、3、4 頁 → 原本的序幕（說書人「上船吧」）→ 第 1 章。
   修正（Gemini 審稿必改）：原稿黑卒擋在將前（卒不能後退）改成黑士；第 7 頁旁白改「落子無悔，星局初開」；提示二精簡。開發者另選採用：序局贏後星樞改句、第一次真正偏航贏了星樞問「你是誰？」
   走錯不算輸：不送出、棋子留在原位，星樞說一句；第一次給方向提示，第二次直接標出那一步。
   舊玩家（hspx 11/12「提醒已經創好角色的玩家，有大更新建議從頭開始遊玩」，開發者選推播＋開 App 跳一次視窗）：開新的旅程／只看序章、下序局／之後再說 */
const BHX_ID="bh:xu",BHX_FEN="4k4/4a4/2N1R1N2/4C4/8P/9/9/9/9/4KAB2",BHX_SOL=[22,13];   /* 紅俥 e7（第 2 排第 5 路）進一吃黑士＝將死；兩匹傌封住將的左右、也護住俥 */
const BHX_PG={
  p1:{img:"data/story0/s0_13.webp",board:true,big:["很久很久以前，天上有一張星盤。","一裂開，星光便流成河。","那道河，人間後來叫它界。"],narr:"棋路，先於棋名。"},
  p2:{img:"data/story0/s0_14.webp",big:["人間傳說，有五色石補過天。","另有一角青石，落入雲河。","它記住了萬年的棋聲。"],narr:"石未開口，局已在心。"},
  p3:{img:"data/story0/s0_3b.webp",big:["青石成桌，桌上有河。","河邊少了一塊界石。","七碗茶，正等七個人醒來。"],narr:"茶未入口，緣已同船。"},
  p4:{img:"data/story0/s0_4.webp",imgN:"data/story0/s0_4n.webp",meteor:true,big:["七個孩子，來自七段歲月。","他們還沒相認。","本命棋子，已先在星河發亮。"],narr:"人未醒，棋先知名。"},
  p6:{img:"data/story0/s0_6.webp",big:[]},p10:{img:"data/story0/s0_10.webp",big:[]},p11:{img:"data/story0/s0_11.webp",big:[]},p12:{img:"data/story0/s0_12.webp",big:[]},p15:{img:"data/story0/s0_15.webp",big:[]},p16:{img:"data/story0/s0_16.webp",big:[]},p7:{img:"data/story0/s0_7.webp",big:[]},p8:{img:"data/story0/s0_8.webp",big:[]},p9:{img:"data/story0/s0_9.webp",big:[]},   /* hspx 11/12 開發者「透過 Gemini 繪製場景補足開頭的電影故事」：補圖①星雨入凡 ②河畔初枰 ③星盤傾側 ④茶香引路 */
  p5:{img:"data/story0/s0_5.webp",big:["星河也有深不見底的彎。","那裡，有一盤下了萬年的棋。","一步一步，像從未停過。"],narr:"黑非惡，只是深。"}};
const BHX_TXT={title:"天裂星盤沉雲河，黑洞殘局啟千秋",rain:"七星如雨，各歸其時。",start:"來者，請在星盤上落子。",open:"落子無悔，星局初開。",good:["齊轍","俥有路了，直取星心！"],win:"星盤暫合。循著茶香，去尋你們的青石吧。",
  wrong:"這一步……星盤上，早已落過千萬遍。",hint1:"先看黑將面前，那顆擋住俥路的黑士。",hint2:"請走：俥五進一，直接吃掉黑將面前的黑士。"};
const BHX_FD={title:"雲河偏航・星樞未醒",desc:["雲河航線短暫偏入黑洞星盤；此局不計積分，也不扣分。","星樞尚未完全甦醒，棋力會比你目前的實力低一階。"],win:"千萬年來，星盤未曾有過此等變數……你是誰？",back:"星槎已回航線；往後起航，仍可能再次偏入黑洞。"};
function bhxNeed(){try{return !store.get("bhXuDone",null)}catch(e){return false}}
/* 開發者 11/13 晚「iPad 開頭的音樂和轉場有點 lag」：全螢幕粒子畫布的倍率照螢幕面積設上限（約 160 萬像素；手機照舊 2 倍，iPad 降到 1.1 倍左右，每幀少畫四分之三） */
function bhxDpr(W,H,low){const d=low?1:Math.min(2,(typeof devicePixelRatio!=="undefined"&&devicePixelRatio)||1);return Math.max(1,Math.min(d,Math.sqrt(1.6e6/Math.max(1,W*H))))}
/* 開場電影的圖全部先下載、先解碼（原本換鏡頭那一刻才設 background-image，iPad 當場解碼大圖會頓）；留著參照，免得被回收 */
const BHX_IMGS=[];
function bhxPreImg(){if(BHX_IMGS.length)return;try{const U=new Set(["data/park/bh_far2.webp"]);for(const k in BHX_PG){const p=BHX_PG[k];if(p.img)U.add(p.img);if(p.imgN)U.add(p.imgN)}
  for(const u of U){const im=new Image();im.decoding="async";im.src=u;BHX_IMGS.push(im);if(im.decode)im.decode().catch(()=>{})}}catch(e){}}
function bhxCss(){if(document.getElementById("bhxCss"))return;const s=document.createElement("style");s.id="bhxCss";s.textContent=`
#bhxPg{position:fixed;inset:0;z-index:9000;background-color:#05060d;background-position:center;background-size:cover;background-repeat:no-repeat;color:#f6efe0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:24px 22px calc(24px + env(safe-area-inset-bottom,0px));text-align:center;cursor:pointer;opacity:0;transition:opacity .6s;overflow:hidden}
#bhxPg.on{opacity:1}
#bhxPg::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,rgba(5,6,13,.1),rgba(5,6,13,.6));pointer-events:none}
#bhxPg>*{position:relative}
#bhxPg.bd{justify-content:flex-end;padding-bottom:calc(16vh + env(safe-area-inset-bottom,0px))}
#bhxPg .bx-bd{position:absolute;left:50%;top:59%;width:min(80vw,58vh);transform:translate(-50%,-50%);pointer-events:none}
#bhxPg .bx-bd line,#bhxPg .bx-bd polyline{fill:none;stroke:rgba(236,204,128,.62);stroke-width:.32;stroke-dasharray:100;stroke-dashoffset:100;animation:bhxLn 2.4s ease-out forwards}
@keyframes bhxLn{to{stroke-dashoffset:0}}
#bhxPg .bx-t{font-size:13px;letter-spacing:.3em;color:#E8C77A;margin-bottom:22px;text-shadow:0 1px 6px #000}
#bhxPg .bx-l{font-size:var(--bxfs,clamp(20px,6vw,28px));white-space:nowrap;line-height:1.8;letter-spacing:.08em;font-weight:600;text-shadow:0 2px 12px #000,0 0 3px #000;opacity:0;transform:translateY(8px);transition:opacity .9s,transform .9s}
#bhxPg .bx-l.on{opacity:1;transform:none}
#bhxPg .bx-t,#bhxPg .bx-n,#bhxPg .bx-cap{white-space:nowrap}
#bhxPg .bx-n{margin-top:22px;font-size:14px;color:#e2d6b8;opacity:0;transition:opacity .9s;text-shadow:0 1px 6px #000}#bhxPg .bx-n.on{opacity:1}
#bhxPg .bx-mt{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#bhxPg.fm{background:#05060d;cursor:default}#bhxPg.fm::before{z-index:1}
#bhxPg .fm-st{position:absolute;inset:0;will-change:transform}#bhxPg .fm-bg{position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat}
/* 意見回饋 882～883（iPad 主畫面 App 820x1148「底部有一條白底、上半部好像被截掉」）：電影圖是 9:16 直幅，iPad 用 cover 鋪滿會裁掉兩成高度、再加鏡頭推移就切到船桅和上排圓圈；
   比 0.62 寬的螢幕把鏡頭舞台框成 0.62 寬高比置中、左右淡進底色（手機不受影響）。底部那條是 02-shell gapfix 塗的紙色，電影播放時改塗電影底色 */
@media (min-aspect-ratio:31/50){#bhxPg .fm-st{left:50%;right:auto;width:62vh;width:62dvh;margin-left:-31vh;margin-left:-31dvh;-webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent);mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)}}
html:has(#bhxPg),html:has(#bhxPg) body{background:#05060d}
#bhxPg .fm-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
#bhxPg .fm-tx{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center}
#bhxPg .fm-cap{position:absolute;z-index:3;top:calc(8vh + env(safe-area-inset-top,0px));left:0;right:0;text-align:center;white-space:nowrap;font-size:min(16px,calc((100vw - 32px)/22));letter-spacing:.2em;color:#E8C77A;text-shadow:0 1px 8px #000;opacity:0;transition:opacity 1.2s;pointer-events:none}#bhxPg .fm-cap.on{opacity:1}
#bhxPg .bx-k,#bhxPg .fm-nx{z-index:4}
#bhxPg .fm-nx{position:absolute;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:52px;height:52px;border-radius:50%;font-size:20px;color:#e2d6b8;background:rgba(0,0,0,.45);border:1px solid rgba(232,199,122,.55)}.bx-k:focus-visible,.fm-nx:focus-visible{outline:3px solid #E8C77A;outline-offset:3px}
#bhxPg .bx-pks{position:absolute;inset:0;z-index:3}
#bhxPg .bx-pk{position:absolute;transform:translate(-50%,-50%);width:min(30vw,150px);aspect-ratio:1;border-radius:50%;border:2px solid rgba(255,214,120,.55);background:radial-gradient(circle,rgba(255,214,120,.18),rgba(255,214,120,0) 70%);cursor:pointer;animation:bhxPkG 1.8s ease-in-out infinite;padding:0}
#bhxPg .bx-pk span{position:absolute;left:50%;bottom:-1.7em;transform:translateX(-50%);white-space:nowrap;font-size:13px;font-weight:700;color:#FFE6A8;text-shadow:0 1px 6px #000,0 0 2px #000}
@keyframes bhxPkG{0%,100%{box-shadow:0 0 0 0 rgba(255,214,120,.25)}50%{box-shadow:0 0 18px 4px rgba(255,214,120,.45)}}
#bhxPg .bx-cap{position:absolute;top:calc(8vh + env(safe-area-inset-top,0px));left:0;right:0;font-size:clamp(18px,5.4vw,25px);letter-spacing:.32em;font-weight:600;color:#FFE6A8;text-shadow:0 2px 12px #000,0 0 3px #000;opacity:0;transition:opacity 1s;pointer-events:none}#bhxPg .bx-cap.on{opacity:1}
#bhxPg .bx-k{position:absolute;right:16px;top:calc(14px + env(safe-area-inset-top,0px));min-width:64px;min-height:44px;font-size:15px;color:#e2d6b8;background:rgba(0,0,0,.45);border:1px solid rgba(232,199,122,.55);border-radius:99px;padding:10px 18px}
#bhxVx{position:fixed;inset:0;z-index:9001;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 50%,#000 0 6%,#2a1450 16%,#120a26 38%,#05060d 70%);overflow:hidden}
#bhxVx::before{content:"";position:absolute;width:160vmax;height:160vmax;background:conic-gradient(from 0deg,transparent 0 10%,rgba(180,107,255,.35) 14%,transparent 22% 40%,rgba(110,139,255,.3) 46%,transparent 54% 72%,rgba(180,107,255,.3) 78%,transparent 86%);border-radius:50%;animation:bhxSp 1.8s linear infinite;will-change:transform}
#bhxVx img{position:relative;width:min(46vw,220px);aspect-ratio:1;border-radius:50%;object-fit:cover;object-position:top;border:3px solid #E8C77A;box-shadow:0 0 30px rgba(180,107,255,.8);animation:bhxSk 1.7s cubic-bezier(.55,0,.9,.45) forwards}
@keyframes bhxSp{to{transform:rotate(360deg)}}
@keyframes bhxSk{0%{transform:none}35%{transform:rotate(90deg) scale(.95)}100%{transform:rotate(900deg) scale(.02);opacity:.2}}
@media (prefers-reduced-motion:reduce){#bhxPg,#bhxPg .bx-l,#bhxPg .bx-n{transition:none}#bhxPg .bx-bd line,#bhxPg .bx-bd polyline{animation:none;stroke-dashoffset:0}#bhxVx::before,#bhxVx img{animation:none}}`;document.head.append(s)}
/* 星線棋盤：9 直 10 橫、河界那一格中間 7 條直線不畫、上下九宮各一個 X（Gemini 兩次都把棋盤畫錯，開發者選圖不畫棋盤、程式疊） */
function bhxBoardSvg(){let s="";const L=(x1,y1,x2,y2,d)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="100" style="animation-delay:${d}s"/>`;
  for(let r=0;r<10;r++)s+=L(0,r*10,80,r*10,r*.08);
  for(let c=0;c<9;c++){if(c===0||c===8)s+=L(c*10,0,c*10,90,.4+c*.05);else{s+=L(c*10,0,c*10,40,.4+c*.05);s+=L(c*10,50,c*10,90,.4+c*.05)}}
  s+=L(30,0,50,20,1)+L(50,0,30,20,1)+L(30,70,50,90,1)+L(50,70,30,90,1);
  /* 開發者 11/12「棋盤也少了 L 型」：炮位（第 3、8 排的 2、8 路）、兵位（第 4、7 排的 1、3、5、7、9 路）四角的 L 型標記；靠邊的只畫朝內那一側 */
  let m="";const D=1.1,K=2.4,mk=(x,y)=>{for(const sx of[-1,1]){if(x+sx*D<0||x+sx*D>80)continue;for(const sy of[-1,1]){const ax=x+sx*D,ay=y+sy*D;m+=`<polyline class="lm" points="${ax+sx*K},${ay} ${ax},${ay} ${ax},${ay+sy*K}" pathLength="100" style="animation-delay:1.3s"/>`}}};
  for(const r of[2,7])for(const c of[1,7])mk(c*10,r*10);for(const r of[3,6])for(const c of[0,2,4,6,8])mk(c*10,r*10);
  return`<svg class="bx-bd" viewBox="-1 -1 82 92" aria-hidden="true">${s}${m}</svg>`}
/* 分鏡播放：每頁大字一句一句淡入；點一下＝先全部顯示，再點＝下一頁；右上「略過」直接結束。圖還沒畫好（404）就退回黑洞遠景 */
function bhxPages(keys,done,first){bhxCss();let i=0,tm=[],MT=null;const o=document.createElement("div");o.id="bhxPg";o.setAttribute("role","dialog");o.setAttribute("aria-label","第〇章");document.body.append(o);
  const clr=()=>{tm.forEach(clearTimeout);tm=[]};let fin=false;
  const end=()=>{if(fin)return;fin=true;clr();if(MT)MT.stop();o.classList.remove("on");setTimeout(()=>o.remove(),600);if(done)setTimeout(done,350)};
  const show=()=>{clr();if(MT){MT.stop();MT=null}const P=BHX_PG[keys[i]];if(!P)return end();
    o.style.backgroundImage=`url(${P.imgN||P.img}),url(data/park/bh_far2.webp)`;o.classList.toggle("bd",!!P.board);
    o.innerHTML=`${P.board?bhxBoardSvg():""}${P.meteor?`<div class="bx-cap">${esc(BHX_TXT.rain)}</div>`:""}${first&&i===0?`<div class="bx-t">第〇章　${esc(BHX_TXT.title)}</div>`:""}${P.big.map(t=>`<div class="bx-l">${esc(t)}</div>`).join("")}${P.narr?`<div class="bx-n">說書人：${esc(P.narr)}</div>`:""}<button class="bx-k" type="button">略過</button>`;
    {const B=o.querySelector(".bx-bd");if(B){const W=o.clientWidth||innerWidth,H=o.clientHeight||innerHeight,k=Math.max(W/768,H/1376);B.style.top=((H-1376*k)/2+819*k)+"px"}}
    o.querySelector(".bx-k").onclick=e=>{e.stopPropagation();vibrate(5);end()};
    /* hspx 開發者 11/12「語句的原則不要換行，這樣很不好看」（截圖：「天上有一張星盤。」被擠成兩行）：每句一行（nowrap），字級照最長那句算到放得下（字距 .08em＋左右留白），最大 28px */
    {const n=Math.max(...P.big.map(t=>[...t].length)),w=(o.clientWidth||innerWidth)-48;o.style.setProperty("--bxfs",Math.max(14,Math.min(28,Math.floor(w/(n*1.1))))+"px")}
    const lines=()=>{const T0=P.board?1.6:P.meteor?.2:.3;[...o.querySelectorAll(".bx-l,.bx-n")].forEach((x,j)=>tm.push(setTimeout(()=>x.classList.add("on"),(T0+j*.9)*1000)))};
    if(P.meteor){const cap=o.querySelector(".bx-cap");tm.push(setTimeout(()=>cap&&cap.classList.add("on"),700));
      if(bhxFresh())MT=bhxMeteor(o,()=>{if(cap)cap.classList.add("on");bhxPick(o,cap,k=>{MT=bhxMeteor(o,()=>{if(cap)cap.textContent=BHX_TXT.rain;lines()},{mode:"catch",key:k})})},{mode:"all"});   /* hspx 11/12：還沒選角＝七顆都落下，點一顆星選角 */
      else MT=bhxMeteor(o,()=>{if(cap)cap.classList.add("on");lines()})}else lines()};
  o.onclick=()=>{if(MT&&!MT.done){MT.skip();return}if(o.dataset.pick==="1")return;const L=[...o.querySelectorAll(".bx-l:not(.on),.bx-n:not(.on)")];if(L.length){clr();L.forEach(x=>x.classList.add("on"));return}vibrate(5);i++;show()};
  show();requestAnimationFrame(()=>requestAnimationFrame(()=>o.classList.add("on")))}
/* 第 4 頁「七星未醒」的流星（hspx 開發者 11/12「七星降落做個動畫，像流星般落入不同朝代」＋補充「不同朝代指的是各自主場」；
   Gemini、ChatGPT 討論在 story/134，開發者選兩家合體：2D 流星分流＋茶香接上星槎，旁白「七星如雨，各歸其時。」）
   約 6 秒：星河頂端一團光 → 七顆星拖著尾巴分流 → 六位同伴的紅星落進各自主場小景（圖上紅光的位置）閃一圈；
   玩家那顆金星飛近自己的主場、停在半空 → 星槎剪影從下方浮出、一縷茶香光線往上接住金星 → 金星順著茶香落進星槎、船亮一下（接著降落經典星槎）。
   點一下＝直接跳到最後一格；減少動態＝不飛，1.2 秒淡入最後一格 */
const BHX_SPOT={x_swordboy:[183,203],x_spiritgirl:[604,286],x_martialgirl:[157,503],x_miaogirl:[612,592],x_shuai:[152,803],x_shi:[613,908],x_bing:[296,1018]};   /* s0_4.webp（768×1376）七個小景裡紅光的位置：秦、南北朝、宋、元、明深宅、明當鋪、清 */
/* 11/13 開發者「這邊應該還不能顯示七個星吧，要落下才有」：s0_4 圖上本來就畫了七個紅光，星還沒落就亮著。
   改成先用抹掉紅光的 s0_4n.webp（cv2 inpaint），星雨開始 1.3 秒後原圖淡入，紅光跟著星落地才亮。
   電影版疊在 .fm-st 的 .fm-bg 後面（跟著鏡頭推拉，換鏡頭時跟 .fm-ly 一起清掉）；分頁版背景直接在 #bhxPg 上，疊一層 z-index:-1（在 ::before 暗化層底下） */
function bhxStarRev(o){try{const P=BHX_PG.p4;if(!P||!P.imgN)return;const st=o.querySelector(".fm-st"),bg=st&&st.querySelector(".fm-bg"),cur=String((bg||o).style.backgroundImage||"");if(!cur.includes(P.imgN))return;
  const d=document.createElement("div");d.className=bg?"fm-bg fm-ly bx-rev":"bx-rev";d.style.cssText=(bg?"":"position:absolute;inset:0;z-index:-1;background-position:center;background-size:cover;background-repeat:no-repeat;")+"pointer-events:none;opacity:0;transition:opacity 1.1s ease;background-image:url("+P.img+")";
  if(bg)bg.after(d);else o.prepend(d);setTimeout(()=>{d.style.opacity="1"},1300)}catch(e){}}
function bhxMeteor(o,onDone,opt){opt=opt||{};bhxStarRev(o);const ALL=opt.mode==="all",CATCH=opt.mode==="catch";const cv=document.createElement("canvas");cv.className="bx-mt";o.prepend(cv);
  const W=o.clientWidth||innerWidth,H=o.clientHeight||innerHeight,dpr=bhxDpr(W,H,false);cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);const g=cv.getContext("2d");g.scale(dpr,dpr);
  const s=Math.max(W/768,H/1376),ox=(W-768*s)/2,oy=(H-1376*s)/2,P=([x,y])=>[ox+x*s,oy+y*s],me=ALL?null:opt.key||(typeof myChar==="function"&&myChar())||"x_swordboy";   /* all＝還沒選角：七顆都落下；catch＝選好了：只演茶香接住那一顆 */
  const src=P([384,30]),SH=[W/2,H*.88],lerp=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],ez=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
  const bz=(a,c,b,u)=>[(1-u)*(1-u)*a[0]+2*(1-u)*u*c[0]+u*u*b[0],(1-u)*(1-u)*a[1]+2*(1-u)*u*c[1]+u*u*b[1]];
  const L=Object.keys(BHX_SPOT).map((k,i)=>{const t=P(BHX_SPOT[k]),mine=k===me,c=[(src[0]+t[0])/2+(t[0]<W/2?-1:1)*W*.2,(src[1]+t[1])/2-H*.06];return{k,t,c,mine,d:.8+i*.13,tr:[],hv:mine?(CATCH?t:bz(src,c,t,.8)):null}});
  const M=ALL?null:(L.find(x=>x.mine)||L[0]);if(M)M.mine=true;const HV=M?M.hv:[W/2,H/2];
  const TC1=[HV[0]+(HV[0]<W/2?W*.28:-W*.28),(HV[1]+SH[1])/2],TC2=[W/2+(HV[0]<W/2?-W*.18:W*.18),SH[1]-H*.12];
  const tea=u=>{if(!M)return SH;const a=1-u;return[a*a*a*SH[0]+3*a*a*u*TC2[0]+3*a*u*u*TC1[0]+u*u*u*M.hv[0],a*a*a*SH[1]+3*a*a*u*TC2[1]+3*a*u*u*TC1[1]+u*u*u*M.hv[1]]};
  const glow=(x,y,r,rgb,a)=>{if(a<=0)return;const gr=g.createRadialGradient(x,y,0,x,y,r*4);gr.addColorStop(0,`rgba(255,255,255,${a})`);gr.addColorStop(.22,`rgba(${rgb},${a*.9})`);gr.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=gr;g.beginPath();g.arc(x,y,r*4,0,6.2832);g.fill()};
  const boat=(a,lit)=>{if(a<=0)return;const [x,y]=SH,k=Math.min(W,H*.6)/420;g.save();g.globalAlpha=a;g.translate(x,y);g.scale(k,k);
    g.fillStyle="#8a5a34";g.strokeStyle="#E8C77A";g.lineWidth=1.6;g.beginPath();g.moveTo(-70,-6);g.quadraticCurveTo(0,26,74,-10);g.lineTo(60,-14);g.quadraticCurveTo(0,8,-60,-12);g.closePath();g.fill();g.stroke();
    g.beginPath();g.moveTo(6,-12);g.lineTo(10,-78);g.stroke();g.fillStyle="rgba(240,226,196,.85)";g.beginPath();g.moveTo(10,-74);g.quadraticCurveTo(40,-52,12,-26);g.closePath();g.fill();
    glow(66,-24,3,"255,90,60",.95);if(lit>0)glow(0,-14,22,"255,214,120",lit);g.restore()};
  let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  const D=rm?1.2:ALL?3.4:6.2,R={done:false,stop(){cancelAnimationFrame(raf);R.done=true},skip(){t0=performance.now()-D*1000}};let t0=performance.now()-(CATCH&&!rm?3400:0),raf=0,called=false;
  const draw=now=>{const u=rm?D:Math.min(D,(now-t0)/1000),fa=rm?Math.min(1,(now-t0)/1000/D):1;g.clearRect(0,0,W,H);
    if(!rm&&u<1.6)glow(src[0],src[1],10+8*Math.sin(Math.min(1,u/1.6)*Math.PI),"200,220,255",Math.sin(Math.min(1,u/1.6)*Math.PI));
    for(const m of L){const fl=1.5;let p=null,land=0;
      if(m.mine){if(u>=m.d&&u<4.7){const e=ez(Math.min(1,(u-m.d)/fl))*.8;p=CATCH?[m.hv[0],m.hv[1]-Math.sin(Math.min(1,(u-3.4)/1.3)*Math.PI/2)*H*.02]:bz(src,m.c,m.t,e)}else if(u>=4.7&&u<5.7)p=tea(1-ez((u-4.7)/1));else if(u>=5.7)p=null}
      else if(u>=m.d){const e=Math.min(1,(u-m.d)/fl);p=bz(src,m.c,m.t,ez(e));land=u-m.d-fl}
      if(p&&!rm){m.tr.push(p);if(m.tr.length>16)m.tr.shift();for(let j=1;j<m.tr.length;j++){const q=m.tr[j-1],w=m.tr[j],k=j/m.tr.length;g.strokeStyle=m.mine?`rgba(255,214,120,${k*.8})`:`rgba(255,120,90,${k*.7})`;g.lineWidth=(m.mine?4:3)*k;g.beginPath();g.moveTo(q[0],q[1]);g.lineTo(w[0],w[1]);g.stroke()}}
      if(!m.mine&&(land>=0||rm)){const lt=rm?.6:land;if(lt<.7)glow(m.t[0],m.t[1],5+lt*30,"255,140,110",(1-lt/.7)*.8*fa);glow(m.t[0],m.t[1],3.5,"255,110,90",.85*fa)}
      else if(p)glow(p[0],p[1],m.mine?5:4,m.mine?"255,214,120":"255,110,90",1)}
    const bA=!M?0:rm?fa:Math.max(0,Math.min(1,(u-3.4)/.8)),lit=rm?.7*fa:u>=5.7?Math.max(0,1-(u-5.7)/.5)*.9+.35:0;boat(bA,lit);
    if(M&&!rm&&u>=3.7&&u<5.9){const k=Math.min(1,(u-3.7)/1),fo=u>5.2?Math.max(0,1-(u-5.2)/.7):1;g.strokeStyle=`rgba(232,240,255,${.55*fo})`;g.lineWidth=2.2;g.setLineDash([]);g.beginPath();for(let j=0;j<=40*k;j++){const q=tea(j/40),wv=Math.sin(j*.6+u*5)*3;j?g.lineTo(q[0]+wv,q[1]):g.moveTo(q[0]+wv,q[1])}g.stroke()}
    if(rm&&M)glow(SH[0],SH[1]-14*Math.min(W,H*.6)/420,6,"255,214,120",fa);
    if(u>=D||(rm&&fa>=1)){R.done=true;if(!called){called=true;if(onDone)onDone()}return}raf=requestAnimationFrame(draw)};
  raf=requestAnimationFrame(draw);return R}
/* 入口：選角確認後，角色頭像被墨色星渦捲進去（1.7 秒；減少動態＝0.5 秒） */
function bhxVortex(c,done){bhxCss();const o=document.createElement("div");o.id="bhxVx";o.setAttribute("aria-hidden","true");o.innerHTML=`<img src="${c?"data/xs/prev_"+c+".webp":bhxSeven()}" alt="" onerror="this.remove()">`;document.body.append(o);
  let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  setTimeout(()=>{o.style.transition="opacity .4s";o.style.opacity="0";setTimeout(()=>o.remove(),450);if(done)done()},rm?500:1750)}
/* 開發者 11/12「開頭會跳到首頁才接到黑洞對戰」：從星渦到黑洞對局頁出現之間，墊一層黑洞底（z 8990，在分鏡 9000、對話框 10000 底下），首頁不會露出來 */
function bhxBack(on){let d=document.getElementById("bhxBk");if(!on){if(d){d.style.transition="opacity .5s";d.style.opacity="0";setTimeout(()=>d.remove(),550)}return}
  if(d)return;d=document.createElement("div");d.id="bhxBk";d.setAttribute("aria-hidden","true");d.style.cssText="position:fixed;inset:0;z-index:8990;background:#05060d url(data/park/bh_far2.webp) center/cover no-repeat";document.body.append(d)}
/* old＝舊玩家「只看序章」：下完不接原本的序幕，回首頁 */
function bhXuStart(old){const c=bhxFresh()?null:(typeof myChar==="function"&&myChar())||null;   /* 還沒選角（一進 App 先下序局）＝星渦捲走七顆紅星 */store.set("bhXuOld",old?1:0);bhxBack(true);bhMus("fall");vibrate([20,60,20]);
  /* hspx 11/12「開頭過場頓一下」：分鏡圖先預載（解碼好才不會翻頁時跳一下）；3D 模型等星渦轉完（2 秒）再開始下載，不搶動畫 */
  for(const k in BHX_PG){try{const im=new Image();im.decoding="async";im.src=BHX_PG[k].img}catch(e){}}
  /* 開發者 11/12：第 1 首〈天河初裂〉整首（約 90 秒）當開場電影；3D 模型改到星樞邀局時才載（ChatGPT 135 號：不跟開場搶）。減少動態＝原本兩頁分鏡 */
  let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}opPlay(1,{fade:.3});
  if(rm){bhxVortex(c,()=>bhxPages(["p1","p5"],bhxIntro,true));return}bhxFilm(OP_FILM1,bhxIntro);bhxVortex(c,null)}
function bhxIntro(){OP.loop=[75,89];opVol(.5,1.5);setTimeout(()=>{try{bhPreload()}catch(e){}try{if(typeof bhfxPre==="function")bhfxPre()}catch(e){}},500);   /* 11/14：序局的黑將是太虛星尊，魔王模型、魔法圖也趁讀字時先下載 */   /* 邀局時第 1 首小聲在最後一段循環；趁玩家讀字先載 3D */
  modal(`<div class="em">♟</div><h2>星樞棋局・序局</h2><p>星盤展開，棋路成光。七星化作紅方棋子。</p><p class="pl-say">✦ 星樞：「${esc(BHX_TXT.start)}」</p><p class="muted" style="font-size:13px">黑洞殘局，只差最後一手：紅方先走，一步將死黑將。走錯也不算輸。<br>說書人：${esc(BHX_TXT.open)}</p>`,[["入局",bhxGo]],"prolog")}
function bhxGo(){BHX_W=0;store.set("park3d",true);store.set("bhRet",null);opPlay(2,{fade:.8,loop:[8,84]});   /* 第 2 首〈星樞試局〉：按「入局」那一下開始（iPhone 要在點選裡），玩家一直沒下就 8～84 秒循環 */
  jStart(BHX_ID,{human:"r",lx:1,journey:BHX_ID,lv:{fen:BHX_FEN,turn:"r",noPerpetual:true}},()=>{location.hash="#/journey/play";setTimeout(()=>{bhBell();toast("✦ 星樞："+BHX_TXT.start)},900);setTimeout(()=>bhxBack(false),1500);
    /* 從紅方正後方看，同一路的俥、炮、黑士、黑將疊在一起 → 開場轉到右前方斜看、對焦黑士（實測挑的角度） */
    let k=0;const cam=()=>{k++;if(typeof bhfxXuBusy==="function"&&bhfxXuBusy())return;   /* 11/14 太虛星尊開場示威正在播（07bhf-bossfx.js）：播完由它轉到這個角度 */try{if(typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.v.setView){PARK.v.setView(BHX_CAM);return}}catch(e){}if(k<30)setTimeout(cam,400)};setTimeout(cam,1200)})}
const BHX_CAM={y:.6,p:.45,z:.65,foc:"a"};   /* 序局開場的鏡頭角度（上面 bhxGo 用；太虛星尊示威播完也轉回這裡） */
/* 08b-cpugame tap() 送出前問：序局走錯就不送（回傳 {hint}），走對回 null 照常送 */
let BHX_W=0;
function bhxGuard(st,f,t){if(!st||st.journey!==BHX_ID||st.result)return null;
  if(f===BHX_SOL[0]&&t===BHX_SOL[1]){setTimeout(()=>toast(BHX_TXT.good[0]+"："+BHX_TXT.good[1]),350);return null}
  BHX_W++;try{bhBell()}catch(e){}vibrate([10,40,10]);toast("✦ 星樞："+BHX_TXT.wrong);setTimeout(()=>toast("💡 "+(BHX_W>=2?BHX_TXT.hint2:BHX_TXT.hint1)),1700);return{hint:BHX_W>=2?BHX_SOL:null}}
/* 序局下完（bhGameEnd、bhResultModal 轉過來）：星樞一句 → 第 2～4 頁 → 新旅程接原本的序幕；舊玩家回首頁 */
function bhxEnd(){store.set("bhXuDone",Date.now())}
function bhxAfter(){bhxEnd();if(!(MODAL_HOLD>Date.now()))opVol(.25,1.2);   /* 新絕殺動畫在播：音量由 bhMateSnd 處理 */   /* 將死：第 2 首淡下來 */
  modal(`<div class="em">✨</div><h2>星盤暫合</h2><p class="pl-say">✦ 星樞：「${esc(BHX_TXT.win)}」</p>`,[["循著茶香",()=>{const old=+store.get("bhXuOld",0)===1;store.set("bhXuOld",0);
    opPlay(3,{fade:.8});   /* 第 3 首〈七星歸槎〉：按「循著茶香」那一下開始 */
    if(!old&&journey()&&!store.get("bhxFresh",0)){try{if(typeof shipEra==="function")shipEra("classic");else{store.set("era","classic");store.set("eraUser",null);applyEra()}}catch(e){}store.set("bhxLand",Date.now())}   /* hspx 開發者 11/12「每個角色打完黑洞的第一站，要統一降落到經典首頁，而不是每個人的主場」：首頁朝代設回經典（停靠紀錄照舊有主場；舊玩家只看序章不動） */
    bhxBack(true);   /* hspx 開發者 11/12「黑洞絕殺後會先跳到一個不該出現的頁面」：換頁前先蓋上黑洞底幕，星槎頁不會在電影淡入前閃出來；電影播完才拿掉 */
    location.hash=old?"#/":"#/adventure";   /* hspx 更正（11/12）：打完第一場黑洞對戰，降落在經典星槎上（星槎頁、停靠經典站） */
    let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
    setTimeout(()=>(rm?bhxPages:(K,d)=>bhxFilm(OP_FILM2,d))(["p2","p3","p4"],()=>{const rl=!old&&!!store.get("bhxPick",null)&&!!store.get("bhxFresh",0)&&!!journey()&&typeof journeyStart==="function";if(!rl)bhxBack(false);   /* 11/12 開發者實機錄影：已有旅程的人開新旅程，選角後 journeyStart 會重開 App；底幕留著直接重開，不閃出舊主場 */
      if(old){opStop(2);toast("序章看完了，旅程照你原本的進度繼續");return}
      const pk=store.get("bhxPick",null);if(pk&&(store.get("bhxFresh",0)||!journey())&&typeof journeyStart==="function"){const nm=typeof myName==="function"&&myName()?null:(typeof defaultName==="function"?defaultName():null);journeyStart(store.get("bhxSlot",1)||1,pk,nm,2).catch(e=>{try{bhxBack(false);toast("開始失敗："+(e&&e.message||e))}catch(x){}});return}   /* hspx 開發者 11/12「選完角色後不用再出現難度和確認出發那一頁，太冗餘」：直接建旅程（難度預設「入局」、名字用預設，之後都能改）→ bhxLandNew 降落星槎 */
      opStop(2);   /* 在流星裡選好角色的新玩家：接選難度、取名（05b 開頭畫面），確定後 bhxLandNew 降落星槎 */
      if(typeof prologue==="function")prologue()}),400)}]],"prolog")}
/* 星渦裡的七顆紅星（還沒選角時代替角色頭像） */
function bhxSeven(){let c="";for(let i=0;i<7;i++){const a=i*Math.PI*2/7-Math.PI/2,x=(50+30*Math.cos(a)).toFixed(1),y=(50+30*Math.sin(a)).toFixed(1);c+=`<circle cx='${x}' cy='${y}' r='8' fill='#c8102e' stroke='#E8C77A' stroke-width='1.6'/>`}
  return"data:image/svg+xml,"+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#120a26'/>${c}</svg>`)}
/* hspx 開發者 11/12（選「在流星畫面直接點一顆星」）：七顆星落進七個朝代小景後停住，大字「哪一顆星，是你？」；點小景跳那位角色的小卡，「就是這顆星」＝選定 */
function bhxPick(o,cap,cb){o.dataset.pick="1";if(cap){cap.textContent="哪一顆星，是你？";cap.classList.add("on")}
  const W=o.clientWidth||innerWidth,H=o.clientHeight||innerHeight,s=Math.max(W/768,H/1376),ox=(W-768*s)/2,oy=(H-1376*s)/2,box=document.createElement("div");box.className="bx-pks";o.append(box);
  for(const k in BHX_SPOT){const C=WX_CHARS[k];if(!C)continue;const b=document.createElement("button");b.type="button";b.className="bx-pk";b.style.left=(ox+BHX_SPOT[k][0]*s)+"px";b.style.top=(oy+BHX_SPOT[k][1]*s)+"px";
    b.setAttribute("aria-label",`${C.pc}・${C.n}，${typeof eraLabel==="function"?eraLabel(CHAR_ERA[k]):""}`);b.innerHTML=`<span>${esc(C.pc)}・${esc(C.n)}</span>`;
    b.onclick=e=>{e.stopPropagation();vibrate(8);const el=typeof eraLabel==="function"?eraLabel(CHAR_ERA[k]):"";
      /* hspx 開發者 11/12「點星星選角後，會出現 3D 角色讓玩家知道模樣」：小卡上方是 3D 舞台（跟「我的角色」頁同一顆 Tripo 模型、慢慢轉、可拖曳），載好之前先放立繪 */
      const m=modal(`<div class="bx-fig" style="position:relative;width:min(58vw,240px);aspect-ratio:3/4;margin:0 auto 8px;border-radius:14px;overflow:hidden;touch-action:none;background:radial-gradient(circle at 50% 38%,#3a2a5c,#0b0a1a)"><img src="data/xs/prev_${k}.webp" alt="" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;transition:opacity .45s"></div><h2>${esc(C.pc)}・${esc(C.n)}</h2><p class="muted">${esc(C.s||el)}</p><p class="pl-say">「${esc(C.say||"")}」</p><p class="muted" style="font-size:13px">選定之後，這段旅程就用他的眼睛走下去。</p>`,
        [["✦ 就是這顆星",()=>{store.set("bhxPick",k);box.remove();o.dataset.pick="";cb(k)}],["再看看",null,true]],"prolog");
      bhxFig(m,k)};box.append(b)}}
/* 選星小卡的 3D 角色：TRIPO 表還沒載好就等一下；沒有 3D 模型或載不到就留著立繪 */
async function bhxFig(m,k){const C=WX_CHARS[k];let n=0;while(typeof TRIPO!=="undefined"&&!Object.keys(TRIPO).length&&n++<30)await new Promise(r=>setTimeout(r,100));
  const f=(m&&m.querySelector&&m.querySelector(".bx-fig"))||[...document.querySelectorAll(".modal .bx-fig")].pop();if(!f||typeof fig3d!=="function"||typeof TRIPO==="undefined"||!TRIPO[k])return;
  const host=document.createElement("div");host.style.cssText="position:absolute;inset:0;opacity:0;transition:opacity .45s;touch-action:none";f.append(host);
  const res=await fig3d(host,{p:C.pc,e:"classic",g:9,glb:`data/tripo_app/${k}.glb`,ring:TRIPO[k]},{tight:true,spin:true});if(!res){host.remove();return}
  const show=()=>{host.style.opacity=1;const im=f.querySelector("img");if(im)im.style.opacity=0};if(res.B&&res.B.glbP)res.B.glbP.then(show,()=>host.remove());else show()}
/* 05b journeyStart 叫：先下序局、在流星裡選角的新玩家，建好旅程後降落經典星槎（停靠經典站、星槎頁），再出說書人序幕 */
function bhxLandNew(){try{if(!store.get("bhXuDone",null)||store.get("bhxLand",null)||!store.get("bhxPick",null))return false}catch(e){return false}
  store.set("bhxLand",Date.now());store.set("bhxFresh",0);try{opStop(2)}catch(e){}try{if(typeof bgmForce==="function")setTimeout(()=>bgmForce("bh_2.mp3"),2300)}catch(e){}try{if(typeof shipEra==="function")shipEra("classic")}catch(e){}   /* 降落：第 3 首淡出，接〈星盤初醒〉（開發者選沿用） */if(typeof titleClose==="function")titleClose();location.hash="#/adventure";setTimeout(()=>{try{prologue()}catch(e){}},700);return true}
/* ===== 序章配樂與開場電影（開發者 11/12：三首定稿〈天河初裂〉〈星樞試局〉〈七星歸槎〉；「音樂飽和感夠，切曲會降低震撼，希望增加動畫篇幅」「這是遊戲最一開頭，要讓玩家馬上進入體驗、感受全新的魅力」；
   開發者選：第 1 首整首約 90 秒當開場動畫、手指可以撥星光；時間軸參考 ChatGPT 137 號（story/chatgpt_app/137_開場配樂銜接_ChatGPT回覆.md），段落照三首實測的音量曲線對拍）=====
   配樂：自己一組播放器（兩個 Audio 輪替、各接一個 GainNode 做淡入淡出；iPhone 改不了 audio.volume，所以用自己的 AudioContext），播的時候一般背景音樂暫停（01-board bgmSync 看 OP.on）。
   時間：OP 時鐘＝配樂播到第幾秒（還沒出聲、關掉音樂也照樣走），電影的每個鏡頭、大字、音效都看這個時鐘，所以畫面跟音樂對拍。 */
const OP={ac:null,ch:[],cur:-1,n:0,loop:null,t0:0,on:false,u:{},need:false};
const OP_F={1:"op_1.mp3",2:"op_2.mp3",3:"op_3.mp3"};
function opOn(){try{return !!store.get("bgm",true)&&sxmGain("bgm")>0&&!sxmAllOff()}catch(e){return true}}
function opLevel(){try{return Math.max(.05,sxmBgmVol(sxmMix()))}catch(e){return .5}}
function opAC(){if(OP.ac&&OP.ac.state!=="closed")return OP.ac;OP.ch=[];OP.cur=-1;try{const C=window.AudioContext||window.webkitAudioContext;OP.ac=C?new C():null}catch(e){OP.ac=null}return OP.ac}
function opCh(i){let c=OP.ch[i];if(c)return c;const a=new Audio();a.preload="auto";try{a.playsInline=true}catch(e){}c={a,g:null};const ac=opAC();
  if(ac){try{const s=ac.createMediaElementSource(a),g=ac.createGain();g.gain.value=0;s.connect(g);g.connect(ac.destination);c.g=g}catch(e){}}return OP.ch[i]=c}
function opRamp(c,to,dur){if(!c)return;const lv=Math.max(0,to)*opLevel(),D=Math.max(.02,dur||0);
  if(c.g&&OP.ac){const t=OP.ac.currentTime,g=c.g.gain;try{g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(lv,t+D)}catch(e){g.value=lv}return}
  const a=c.a,from=a.volume,st=performance.now();const k=()=>{const p=Math.min(1,(performance.now()-st)/(D*1000));try{a.volume=Math.min(1,from+(lv-from)*p)}catch(e){}if(p<1)setTimeout(k,40)};k()}
/* 整首抓成 Blob（跟 bgmBlob 同一個理由：CDN 不給分段下載、iPhone 要分段才肯播）；自己一份快取，不被一般配樂的換曲清掉 */
function opBlob(n){const rel="data/bgm/blackhole/"+OP_F[n];if(OP.u[rel])return Promise.resolve(OP.u[rel]);const base=typeof BGM_BASE!=="undefined"?BGM_BASE:"";
  return OP.u[rel]=fetch(base+rel,base?{mode:"cors",credentials:"omit"}:undefined).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>OP.u[rel]=URL.createObjectURL(b)).catch(()=>{delete OP.u[rel];return null})}
function opPre(){try{bhxPreImg()}catch(e){}if(!opOn())return;for(const n of[1,2,3])opBlob(n)}
/* 播第 n 首：從 at 秒開始、fade 秒淡入，舊的那首同時淡出（交叉淡化）；一定要在點選當下叫（iPhone） */
function opPlay(n,o){o=o||{};const at=o.at||0,fade=o.fade==null?.3:o.fade;OP.on=true;opTick();OP.n=n;OP.loop=o.loop||null;OP.t0=performance.now()-at*1000;OP.hold=null;
  try{if(typeof BGM!=="undefined"&&BGM.a)BGM.a.pause()}catch(e){}
  const old=OP.ch[OP.cur];if(old){opRamp(old,0,Math.max(.4,fade));const oa=old.a;setTimeout(()=>{if(OP.ch[OP.cur]!==old)try{oa.pause()}catch(e){}},(Math.max(.4,fade)+.15)*1000)}
  if(!opOn()){OP.cur=-1;return}const ac=opAC();try{if(ac&&ac.state!=="running")ac.resume()}catch(e){}
  const nx=OP.cur===0?1:0,c=opCh(nx);OP.cur=nx;
  const go=u=>{if(OP.n!==n||OP.ch[OP.cur]!==c||!OP.on)return;if(OP.hold){OP.t0=performance.now()-OP.hold.at*1000;OP.hold=null}if(c.a.src!==u)c.a.src=u;const want=(performance.now()-OP.t0)/1000;
    const seek=()=>{try{c.a.currentTime=Math.max(0,want)}catch(e){}};if(c.a.readyState>=1)seek();else c.a.addEventListener("loadedmetadata",seek,{once:true});
    if(c.g)c.g.gain.value=0;else c.a.volume=0;const p=c.a.play();if(p&&p.catch)p.catch(()=>{OP.need=true});opRamp(c,o.vol==null?1:o.vol,fade)};
  const u=OP.u["data/bgm/blackhole/"+OP_F[n]];if(typeof u==="string")go(u);else{OP.hold={at,until:performance.now()+5000};opBlob(n).then(x=>{if(x)go(x)})}}   /* 11/13 晚：曲子還沒下載完，畫面時鐘先停在 at 等（最多 5 秒），音樂到了一起開始；原本畫面先跑、音樂晚到再跳秒，iPad 看起來在卡 */
function opTime(){if(OP.hold){if(performance.now()<OP.hold.until)return OP.hold.at;OP.t0=performance.now()-OP.hold.at*1000;OP.hold=null}const c=OP.ch[OP.cur];if(c&&!c.a.paused&&c.a.readyState>=2&&!c.a.ended){const t=c.a.currentTime;OP.t0=performance.now()-t*1000;return t}return(performance.now()-OP.t0)/1000}
function opSeek(t){OP.t0=performance.now()-t*1000;const c=OP.ch[OP.cur];if(c)try{c.a.currentTime=t}catch(e){}}
function opVol(v,d){opRamp(OP.ch[OP.cur],v,d==null?1:d)}
function opStop(d){if(!OP.on)return;OP.on=false;OP.loop=null;const c=OP.ch[OP.cur];if(c){opRamp(c,0,d==null?1:d);const a=c.a;setTimeout(()=>{try{a.pause()}catch(e){}},((d==null?1:d)+.15)*1000)}
  setTimeout(()=>{try{if(typeof bgmSync==="function")bgmSync()}catch(e){}},((d==null?1:d)+.3)*1000)}
/* 區段循環（選星等很久、序局一直沒下）：播到 loop[1] 秒就跳回 loop[0]；切到背景就暫停，回來接著播 */
function opTick(){if(OP.iv)return;OP.iv=setInterval(()=>{if(!OP.on){clearInterval(OP.iv);OP.iv=null;return}const t=opTime();if(OP.loop&&t>=OP.loop[1])opSeek(OP.loop[0])},120)}   /* 播的時候才計時（程式一載入就開計時器，測試環境會一直不結束） */
if(typeof document!=="undefined"){document.addEventListener("visibilitychange",()=>{const c=OP.ch[OP.cur];if(!OP.on||!c)return;if(document.hidden){try{c.a.pause()}catch(e){}}else{try{if(OP.ac&&OP.ac.state!=="running")OP.ac.resume()}catch(e){}const p=c.a.play();if(p&&p.catch)p.catch(()=>{OP.need=true})}});
  for(const ev of["pointerdown","touchend"])document.addEventListener(ev,()=>{if(!OP.on||!OP.need)return;OP.need=false;const c=OP.ch[OP.cur];if(!c)return;try{if(OP.ac&&OP.ac.state!=="running")OP.ac.resume()}catch(e){}try{c.a.currentTime=Math.max(0,(performance.now()-OP.t0)/1000)}catch(e){}const p=c.a.play();if(p&&p.catch)p.catch(()=>{OP.need=true})},{passive:true,capture:true})}

/* ---------- 4 個合成音效（ChatGPT 137 號第 5 節的參數；走遊戲的 AC、音效那條匯流排，跟著設定的音量） ---------- */
function opNoise(dur){const ac=AC,n=Math.floor(ac.sampleRate*dur),b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const s=ac.createBufferSource();s.buffer=b;return s}
function opSfx(k,big){if(typeof withAudio!=="function")return;withAudio(()=>{const ac=AC,t=ac.currentTime+.01,dst=sxmDst("piece");
  const env=(g,v,a,d)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+d)};
  if(k==="vortex"||k==="suck"){const D=k==="vortex"?1.4:2.2,o=ac.createOscillator(),g=ac.createGain();o.type=k==="vortex"?"sawtooth":"triangle";o.frequency.setValueAtTime(k==="vortex"?220:110,t);o.frequency.exponentialRampToValueAtTime(k==="vortex"?55:38,t+D);
    env(g,k==="vortex"?.07:.12,.04,D);o.connect(g);g.connect(dst);o.start(t);o.stop(t+D+.05);
    const nz=opNoise(D),f=ac.createBiquadFilter(),g2=ac.createGain();f.type=k==="vortex"?"bandpass":"lowpass";f.Q.value=k==="vortex"?8:.7;f.frequency.setValueAtTime(k==="vortex"?900:1400,t);f.frequency.exponentialRampToValueAtTime(k==="vortex"?180:160,t+D);
    env(g2,k==="vortex"?.09:.1,.05,D);nz.connect(f);f.connect(g2);g2.connect(dst);nz.start(t);nz.stop(t+D)}
  else if(k==="crack"){   /* 11/13 開發者「一聲巨響跟清脆的程式音很不搭」：天裂＝低音悶響（70→30Hz）＋裂開的沙沙聲＋3 秒低頻餘韻，跟配樂融在一起 */
    const o=ac.createOscillator(),g=ac.createGain();o.type="sine";o.frequency.setValueAtTime(72,t);o.frequency.exponentialRampToValueAtTime(30,t+1.8);env(g,.24,.012,2.6);o.connect(g);g.connect(dst);o.start(t);o.stop(t+2.7);
    const o2=ac.createOscillator(),g2=ac.createGain();o2.type="triangle";o2.frequency.setValueAtTime(48,t);o2.frequency.exponentialRampToValueAtTime(26,t+1.2);env(g2,.12,.02,1.6);o2.connect(g2);g2.connect(dst);o2.start(t);o2.stop(t+1.7);
    const n1=opNoise(.6),f1=ac.createBiquadFilter(),g3=ac.createGain();f1.type="bandpass";f1.Q.value=1.2;f1.frequency.setValueAtTime(2600,t);f1.frequency.exponentialRampToValueAtTime(500,t+.5);env(g3,.08,.004,.55);n1.connect(f1);f1.connect(g3);g3.connect(dst);n1.start(t);n1.stop(t+.6);
    const n2=opNoise(3.4),f2=ac.createBiquadFilter(),g4=ac.createGain();f2.type="lowpass";f2.Q.value=.7;f2.frequency.setValueAtTime(320,t);f2.frequency.exponentialRampToValueAtTime(70,t+3.2);env(g4,.07,.25,3.3);n2.connect(f2);f2.connect(g4);g4.connect(dst);n2.start(t);n2.stop(t+3.4)}
  else if(k==="lines"){[660,784,880,990,1175,1320,1568].forEach((hz,i)=>{const o=ac.createOscillator(),g=ac.createGain(),s=t+i*.11;o.type="sine";o.frequency.value=hz;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.022,s+.03);g.gain.exponentialRampToValueAtTime(.0001,s+.42);o.connect(g);g.connect(dst);o.start(s);o.stop(s+.2)})}
  else if(k==="meteor"){const m=big?1.25:1,o=ac.createOscillator(),g=ac.createGain();o.type="sine";o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(70,t+.22);env(g,.06*m,.01,.22);o.connect(g);g.connect(dst);o.start(t);o.stop(t+.25);
    const o2=ac.createOscillator(),g2=ac.createGain();o2.type="sine";o2.frequency.setValueAtTime(1200,t);o2.frequency.exponentialRampToValueAtTime(1800,t+.38);env(g2,.045*m,.01,.38);o2.connect(g2);g2.connect(dst);o2.start(t);o2.stop(t+.4)}})}

/* ---------- 開場電影：一組鏡頭（圖、推移、粒子、大字、音效）照 OP 時鐘播；右上「略過」、右下「▶」跳下一個鏡頭；手指劃過撥出星光（不換頁） ----------
   鏡頭 kb＝[[縮放,焦點x%,焦點y%] 起, 迄]；fx：dark 星空、crack 天裂、fall 星光傾瀉、river 星河流動、whirl 黑洞漩渦、stone 青石入河、steam 茶香；
   lines：[[秒,字]]；cap：[[秒,字]] 上方小標；sfx：[[秒,名]]；board：秒＝星線棋盤開始畫 */
/* 開發者 11/12 hspx「音樂要飽和不能切曲切太多，透過 Gemini 繪製場景補足開頭的電影故事」：第 1 首 90 秒排 7 個鏡頭、第 3 首加「茶香引路」；
   say＝這個鏡頭的大字 [[秒,字]]；nar＝說書人 [秒,字]；bp＝星線棋盤放在圖上哪裡 [中心 y,寬]（圖上像素）；title＝開場標題 */
/* 開發者 11/12「這三頁停頓太久、敘述太短」：旁白加長（ChatGPT 139 號，每句 ≤15 字、每個鏡頭 3～4 句，照秒數出現） */
const OP_FILM1={n:1,end:89.5,shots:[
  {at:0,img:null,fx:"dark",sfx:[[0,"vortex"]],say:[[0.0,"第〇章"],[1.7,"天裂星盤沉雲河"],[3.4,"黑洞殘局啟千秋"]]},
  {at:5.4,img:"p10",ly:[[10.4,"p11",.55,"r"],[12.4,"p12",.3,"r"],[17.6,"p1",.7]],rc:[390,545],kb:[[1.0,50,42],[1.1,50,40]],fx:"tear",crack:12.4,shk:[[10.4,.3,4],[12.4,.4,9]],sfx:[[12.4,"crack"]],say:[[5.5,"很久很久以前，"],[8.8,"天上有張星盤。"],[12.4,"一聲巨響，天裂了。"],[16.2,"星光從縫中落。"]]},
  {at:20,img:"p6",kb:[[1.2,50,22],[1.0,50,62]],fx:"fall",say:[[20.5,"裂口灑下星光。"],[24.0,"像細雨入山河。"],[27.8,"大河先被點亮。"],[31.6,"村燈跟著醒來。"]]},
  {at:35,img:"p1",kb:[[1.4,50,68],[1.05,50,62]],fx:"river",board:36,bp:[1000,560],rvy:1000,sfx:[[36,"lines"]],say:[[35.5,"星河橫過天心。"],[39.0,"星線交成棋路。"],[42.8,"那道河，後來叫界。"],[46.5,"兩岸從此相望。"]]},
  {at:50,img:"p7",kb:[[1.0,50,48],[1.12,50,47]],fx:"stars",board:51,bp:[657,440],sfx:[[51,"lines"]],say:[[50.5,"河畔有塊青石。"],[54.0,"沉睡不知幾年。"],[57.8,"星光落在石面。"],[61.5,"棋盤慢慢醒來。"]],nar:[58.8,"棋路，先於棋名。"]},
  {at:65,img:"p8",kb:[[1.0,50,45],[1.22,62,56]],fx:"whirl",say:[[65.4,"天上星盤傾斜。"],[68.8,"一角滑入暗彎。"],[72.0,"墨色漩渦初開。"],[74.6,"誰也望不到底。"]]},
  {at:75,img:"p5",kb:[[1,50,32],[1.4,50,26]],fx:"whirl",sfx:[[76,"suck"]],say:[[75.4,"黑洞張開無聲。"],[79.0,"星槎被河牽去。"],[82.8,"棋聲在深處響。"],[86.6,"一步一步未停。"]],nar:[88.6,"黑非惡，只是深。"]}]};
const OP_FILM2={n:3,end:60,shots:[
  {at:0,img:"p2",ly:[[8.6,"p15",1.4]],grow:1,kb:[[1.12,52,40],[1.0,50,52]],fx:"stone",splash:9.4,say:[[0.6,"五色石曾補天。"],[3.8,"另有一角青石。"],[7.0,"一枚界石相隨。"],[10.2,"同落雲河深處。"]],nar:[11.5,"它記住萬年棋聲。"]},
  {at:12.5,img:"p15",ly:[[12.6,"p16",2.2],[16.6,"p3",1.4]],grow:1,kb:[[1.0,50,52],[1.22,44,60]],fx:"steam",say:[[12.8,"青石後來成桌。"],[15.8,"桌上仍有星河。"],[18.9,"河邊少了界石。"],[21.6,"七碗茶正等候。"]]},
  {at:23,img:"p9",kb:[[1.25,50,70],[1.0,50,35]],fx:"steam",say:[[23.3,"茶氣飄出船外。"],[25.9,"在河上織小路。"],[28.3,"七點紅光在前。"]],nar:[29.2,"茶未入口，緣已同船。"]},
  {at:30,img:"p4",fx:"dark",say:[[30.0,"七段歲月在岸。"],[33.0,"七個孩子將醒。"],[35.8,"本命棋子先亮。"]],meteor:36}]};
/* hspx 開發者 11/12「想製作從沒有裂縫到破洞的動畫」「要有漸漸裂掉變成棋桌的過程畫面」：
   第 1 首天裂鏡頭＝完整青瓷天（p10，天幕被頂起）→ 10.4 秒裂紋從中心爆開（p11，縫裡透光）→ 12.4 秒「天裂了」崩成破洞（p12）→ 17.6 秒淡到天河全景（p1）；
   第 3 首開頭＝圓青石與界石從破洞墜落（p2）→ 落進雲河（p15），冰裂紋依圓板透視一條條長成棋盤線（9 直 10 橫、楚河漢界、九宮），河帶通到缺口（界石的位置）
   → 青瓷洗成灰白青石（p16）→ 線沉回石裡、只留河 → 星槎上的青石桌（p3，河光接到缺口）。圖都是 Gemini 畫的（開發者逐張看過）；棋盤線由程式畫（Gemini 畫的線數不對） */
const BHX_DUST={p11:{c:[392,560]},p12:{c:[390,560],rad:[190,245],tip:[402,808]},p1:{c:[390,360],rad:[105,125],tip:[396,515],band:1000}};   /* 落塵：裂口中心、破洞半徑、下緣出口、銀河高度（圖上像素） */
const BHX_BD3={cx:388,cy:750,rx:262,ry:118,th:52.7*Math.PI/180,S:.17,g0:10.0,f0:15.4,f1:16.6};   /* 雲河上那塊圓青石的頂面橢圓（p15／p16 同一個位置）、河帶指向缺口的角度、棋盤大小；g0 開始長線、f0～f1 線沉回石裡 */
function bhxGrowSvg(st){const B=BHX_BD3,ex=[Math.cos(B.th),Math.sin(B.th)],ey=[-Math.sin(B.th),Math.cos(B.th)],P=(a,b)=>{const u=(a*ex[0]+b*ey[0])*B.S,v=(a*ex[1]+b*ey[1])*B.S;return[B.cx+u*B.rx,B.cy+v*B.ry]};
  const L=[],seg=(a0,b0,a1,b1,s,d,keep)=>L.push({p:P(a0,b0),q:P(a1,b1),s,d,keep:!!keep}),g=B.g0,rk=i=>-4.5+i;
  const ext=r=>{let a=4;while(a<8){const u=(a*ex[0]+r*ey[0])*B.S,v=(a*ex[1]+r*ey[1])*B.S;if(u*u+v*v>.95)break;a+=.1}return a};
  for(const r of[rk(4),rk(5)]){const e=ext(r);seg(-e,r,e,r,g,1.4,1)}   /* 河帶兩邊先亮，一路延伸到桌緣（流向缺口） */
  [[3,6],[2,7],[1,8],[0,9]].forEach(([a,b],i)=>{seg(-4,rk(a),4,rk(a),g+.6+i*.6,1.2);seg(-4,rk(b),4,rk(b),g+.6+i*.6,1.2)});   /* 其餘橫線由河往外一條條長 */
  for(let f=-4;f<=4;f++){const s=g+.8+Math.abs(f)*.15;seg(f,rk(4),f,rk(0),s,2.2);seg(f,rk(5),f,rk(9),s,2.2);if(f===-4||f===4)seg(f,rk(4),f,rk(5),s,.5)}   /* 9 條直線從河邊往兩岸長，邊線跨河 */
  for(const[b0,b1]of[[rk(0),rk(2)],[rk(7),rk(9)]]){seg(-1,b0,1,b1,g+3.2,.8);seg(1,b0,-1,b1,g+3.2,.8)}   /* 兩個九宮 X */
  const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");svg.setAttribute("class","fm-gr");svg.setAttribute("viewBox","0 0 768 1376");svg.setAttribute("preserveAspectRatio","xMidYMid slice");svg.setAttribute("aria-hidden","true");
  svg.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  svg.innerHTML=`<defs><filter id="fmGlw" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="fmClp"><ellipse cx="${B.cx}" cy="${B.cy}" rx="${(B.rx*.99).toFixed(1)}" ry="${(B.ry*.99).toFixed(1)}"/></clipPath></defs><g clip-path="url(#fmClp)" filter="url(#fmGlw)" stroke="#fff3cf" stroke-width="2.2" stroke-linecap="round" fill="none"></g>`;
  const G=svg.querySelector("g");for(const o of L){const l=document.createElementNS(ns,"line");l.setAttribute("x1",o.p[0].toFixed(1));l.setAttribute("y1",o.p[1].toFixed(1));l.setAttribute("x2",o.q[0].toFixed(1));l.setAttribute("y2",o.q[1].toFixed(1));
    l.setAttribute("pathLength","1");l.setAttribute("stroke-dasharray","1 1");l.setAttribute("stroke-dashoffset","1");G.append(l);o.el=l}
  st.append(svg);return{svg,L}}
function bhxGrowTick(R,t){const B=BHX_BD3;for(const o of R.L){const k=Math.max(0,Math.min(1,(t-o.s)/o.d));o.el.setAttribute("stroke-dashoffset",(1-k).toFixed(3));o.el.style.opacity=(o.keep?1:Math.max(0,Math.min(1,1-(t-B.f0)/(B.f1-B.f0)))).toFixed(2)}
  R.svg.style.opacity=Math.max(0,Math.min(1,1-(t-B.f1)/1.0)).toFixed(2)}   /* 線沉回石裡只留河，再淡到星槎 */
const opImgXY={p1:[396,515],p5:[384,350],p2:[388,700],p3:[300,880],p6:[384,40],p7:[384,657],p8:[545,795],p9:[380,1020]};   /* 各張圖粒子的源頭（圖上像素，768×1376）：天裂口、黑洞心、青石、茶碗 */
function bhxFilm(F,done){bhxCss();let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  const o=document.createElement("div");o.id="bhxPg";o.className="fm on";o.setAttribute("role","dialog");o.setAttribute("aria-label","第〇章");document.body.append(o);
  o.innerHTML=`<div class="fm-st"><div class="fm-bg"></div></div><canvas class="fm-fx"></canvas><div class="fm-cap"></div><div class="fm-tx"></div><button class="bx-k" type="button">略過</button><button class="fm-nx" type="button" aria-label="下一個鏡頭">▶</button>`;
  try{if(BHX_PG.p4&&BHX_PG.p4.imgN)(new Image).src=BHX_PG.p4.imgN}catch(e){}   /* 11/13：七星那一幕的無紅光底圖先載好 */
  const st=o.querySelector(".fm-st"),bg=o.querySelector(".fm-bg"),cv=o.querySelector(".fm-fx"),tx=o.querySelector(".fm-tx"),capE=o.querySelector(".fm-cap"),g=cv.getContext("2d");
  const low=(()=>{try{return(navigator.deviceMemory||4)<=3||(navigator.hardwareConcurrency||4)<=4}catch(e){return false}})();let dpr=1;bhxPreImg();
  let W=0,H=0;const fit=()=>{W=o.clientWidth||innerWidth;H=o.clientHeight||innerHeight;dpr=bhxDpr(W,H,low);cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);g.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.max(15,...F.shots.flatMap(S=>(S.say||[]).map(([,t])=>[...t].length)));o.style.setProperty("--bxfs",Math.max(14,Math.min(28,Math.floor((W-48)/(n*1.1))))+"px")};fit();addEventListener("resize",fit);
  const P=[],add=(x,y,vx,vy,life,r,col)=>{if(P.length<(low?140:320))P.push({x,y,vx,vy,l:0,m:life,r,col})};
  let si=-1,S=null,kbNow=[1,50,50],fin=false,raf=0,mt=null,fired={};
  /* hspx 開發者 11/12「裂痕和落下的塵太假」：落塵照 ChatGPT 142 號規格重做——四種粒子（光絲 30%、星屑 35%、青瓷碎片 15%、遠景微塵 20%），
     有遠近（z）、閃爍、光絲拖尾；出生後 0.3～0.8 秒轉向「星河路徑」（裂口往下流、碰到銀河轉橫）；上限 150 顆（低階手機 80） */
  let LY=[],GR=null,DU=[],lastT=null;const SPR={},DCAP=low?300:700,dEm={acc:0,burst:false};
  const spr=c=>SPR[c]||(SPR[c]=(()=>{const k=document.createElement("canvas");k.width=k.height=32;const x=k.getContext("2d"),gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,`rgba(${c},1)`);gr.addColorStop(.25,`rgba(${c},.55)`);gr.addColorStop(1,`rgba(${c},0)`);x.fillStyle=gr;x.fillRect(0,0,32,32);return k})());
  const dAdd=(k,x,y,vx,vy,z)=>{if(DU.length>=DCAP)return;DU.push({k,x,y,vx,vy,z,a:0,life:k==="chip"?1.6+Math.random():k==="streak"?1.4+Math.random()*1.2:2.5+Math.random()*2.5,
    sz:(k==="streak"?8+Math.random()*20:k==="chip"?2+Math.random()*4:k==="mote"?.8+Math.random()*1.6:.4+Math.random()*.6)*(.7+z*.6),tl:.12+Math.random()*.13,ph:Math.random()*6.283,fr:4+Math.random()*7,
    rot:Math.random()*6.283,vr:(Math.random()-.5)*8,side:Math.random()<.5?-1:1,st:.3+Math.random()*.5,col:k==="streak"?(Math.random()<.5?"255,244,214":"205,225,255"):["255,255,255","255,230,170","200,240,235"][Math.floor(Math.random()*3)]})};
  const dPick=()=>{const r=Math.random();return r<.3?"streak":r<.65?"mote":r<.8?"chip":"glit"};
  const tearEmit=(t,dt,K)=>{const D=BHX_DUST[K];if(!D)return;const cs=Math.max(W/768,H/1376)*kbNow[0];
    if(K==="p11"&&Math.random()<dt*4){const c=onScr(cover(D.c));dAdd("chip",c[0]+(Math.random()-.5)*40*cs,c[1]+(Math.random()-.3)*30*cs,(Math.random()-.5)*40,20+Math.random()*40,Math.random())}   /* 裂紋爆開：縫裡掉出一點瓷片 */
    if(S.crack!=null&&t>=S.crack&&!dEm.burst&&D.rad){dEm.burst=true;const c=onScr(cover(D.c));for(let i=0;i<120;i++){const an=Math.random()*6.283,ex=c[0]+Math.cos(an)*D.rad[0]*cs*.85,ey=c[1]+Math.sin(an)*D.rad[1]*cs*.85,r=Math.random(),k=r<.5?"streak":r<.75?"chip":"mote",v=(k==="chip"?60:90)+Math.random()*110,z=Math.random();
      dAdd(k,ex,ey,Math.cos(an)*v*(.5+z),Math.sin(an)*v*(.5+z)+40,z)}}   /* 崩開那一下：沿破洞邊緣多點噴出 54 顆（光絲一半、碎片四分之一） */
    if(!D.tip||S.crack==null||t<S.crack+.4)return;const rel=t-S.crack,rate=K==="p12"?(rel<5?110:50):24;dEm.acc+=dt*rate;
    while(dEm.acc>=1){dEm.acc-=1;const z=Math.random(),k=dPick();let p;
      if(D.rad&&Math.random()<.55){const c=onScr(cover(D.c)),an=.15+Math.random()*(Math.PI-.3);p=[c[0]+Math.cos(an)*D.rad[0]*cs*.9,c[1]+Math.sin(an)*D.rad[1]*cs*.9]}else{const q=onScr(cover(D.tip));p=[q[0]+(Math.random()-.5)*34*cs,q[1]+(Math.random()-.5)*14*cs]}
      dAdd(k,p[0],p[1],(Math.random()-.5)*50,(k==="streak"?90:k==="glit"?14:35)*(.6+z*.8),z)}};   /* 之後從破洞下緣持續洩出；開發者 11/13 晚「破洞落下的粒子有點空虛，加強大量落下的視覺感」：速率約 10 倍、一半從尖端成瀑布、一半沿破洞整個下緣灑落，同時上限 700（低階 300），裂開那一下 120 顆 */
  const tearDraw=(t,dt,K)=>{const D=BHX_DUST[K]||{},cs=Math.max(W/768,H/1376)*kbNow[0],cx=D.tip?onScr(cover(D.tip))[0]:W/2,by=D.band?onScr(cover([0,D.band]))[1]:H*2;
    for(let j=DU.length-1;j>=0;j--){const q=DU[j];q.a+=dt;if(q.a>=q.life||q.y>H+40||q.x<-40||q.x>W+40){DU.splice(j,1);continue}
      const wind=Math.sin(t*1.2+q.y*.01)*(5+q.z*13);
      if(q.k==="chip"){q.vy+=70*dt;q.rot+=q.vr*dt;q.vx*=1-.6*dt}
      else if(q.a>q.st){const sp=(q.k==="streak"?110:q.k==="glit"?14:38)*(.6+q.z*.8);let tx,ty;if(q.y<by-30*cs){tx=(cx-q.x)*.5+wind;ty=sp}else{tx=q.side*sp;ty=sp*.12}const m=Math.min(1,dt*1.8);q.vx+=(tx-q.vx)*m;q.vy+=(ty-q.vy)*m}
      q.x+=q.vx*dt;q.y+=q.vy*dt;
      const fade=Math.min(1,q.a/.15)*Math.max(0,1-q.a/q.life),tw=.75+.25*Math.sin(t*q.fr+q.ph),al=fade*tw*(q.k==="glit"?.3:q.k==="mote"?.85:.8)*(.55+q.z*.45);
      if(q.k==="chip"){g.globalCompositeOperation="source-over";g.save();g.translate(q.x,q.y);g.rotate(q.rot);const s=q.sz;g.beginPath();g.moveTo(-s,-s*.5);g.lineTo(s*.8,-s*.7);g.lineTo(s*.3,s*.8);g.closePath();
        g.fillStyle=`rgba(95,138,122,${fade*.9})`;g.fill();g.strokeStyle=`rgba(216,239,228,${fade*.8})`;g.lineWidth=.7;g.stroke();g.restore();g.globalCompositeOperation="lighter";continue}
      if(q.k==="streak"){const L=Math.hypot(q.vx,q.vy)||1,len=Math.min(q.sz*1.6,L*q.tl),x2=q.x-q.vx/L*len,y2=q.y-q.vy/L*len,gr=g.createLinearGradient(q.x,q.y,x2,y2);gr.addColorStop(0,`rgba(${q.col},${al})`);gr.addColorStop(1,`rgba(${q.col},0)`);
        g.strokeStyle=gr;g.lineWidth=.6+q.z*.9;g.beginPath();g.moveTo(q.x,q.y);g.lineTo(x2,y2);g.stroke();continue}
      if(q.k==="glit"){g.fillStyle=`rgba(255,255,255,${al})`;g.fillRect(q.x,q.y,1,1);continue}
      const s=q.sz*3;g.globalAlpha=al;g.drawImage(spr(q.col),q.x-s,q.y-s,2*s,2*s);g.globalAlpha=1}};
  const cover=([ix,iy])=>{const s=Math.max(W/768,H/1376);return[(W-768*s)/2+ix*s,(H-1376*s)/2+iy*s]},onScr=pt=>{const[s,fx,fy]=kbNow,ox=W*fx/100,oy=H*fy/100;return[ox+(pt[0]-ox)*s,oy+(pt[1]-oy)*s]};
  const setShot=i=>{si=i;S=F.shots[i];fired={};P.length=0;DU.length=0;dEm.acc=0;dEm.burst=false;const PG=S.img&&BHX_PG[S.img];
    bg.style.backgroundImage=PG?`url(${PG.imgN||PG.img}),url(data/park/bh_far2.webp)`:"none";st.querySelectorAll(".bx-bd,.fm-ly,.fm-gr").forEach(e=>e.remove());
    LY=(S.ly||[]).map(([lt,k,fd,md])=>{const d=document.createElement("div");d.className="fm-bg fm-ly";const pg=BHX_PG[k];d.style.backgroundImage=pg?`url(${pg.img})`:"none";d.style.opacity="0";st.append(d);return{t:lt,k,fd:Math.max(.05,fd||1),md,d}});GR=S.grow?bhxGrowSvg(st):null;   /* 同一個鏡頭裡的後續圖：交叉淡入，或 "r"＝從裂口中心往外揭開 */
   /* 河界對準圖上橫流的星河（圖上 y≈819），不同手機長寬比都對得上 */
    tx.innerHTML=(S.say||[]).map(([,t])=>`<div class="bx-l">${esc(t)}</div>`).join("")+(S.nar?`<div class="bx-n">說書人：${esc(S.nar[1])}</div>`:"");
    o.classList.toggle("bd",S.board!=null)};
  const nextAt=i=>i+1<F.shots.length?F.shots[i+1].at:F.end;
  const finish=()=>{if(fin)return;fin=true;cancelAnimationFrame(raf);removeEventListener("resize",fit);if(mt)mt.stop();o.classList.remove("on");setTimeout(()=>o.remove(),600);if(done)setTimeout(done,350)};
  o.querySelector(".bx-k").onclick=e=>{e.stopPropagation();vibrate(5);if(S&&S.meteor!=null&&!fired.met){opSeek(S.meteor);return}finish()};
  o.querySelector(".fm-nx").onclick=e=>{e.stopPropagation();vibrate(5);if(o.dataset.pick==="1")return;const t=nextAt(si);if(S&&S.meteor!=null&&!fired.met){opSeek(S.meteor);return}if(t>=F.end)finish();else opSeek(t+.01)};
  /* 手指劃過撥出星光（開發者選）：不換頁 */
  const brush=e=>{if(o.dataset.pick==="1")return;const r=o.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(let k=0;k<(e.type==="pointerdown"?14:3);k++){const a=Math.random()*6.283,v=.3+Math.random()*1.6;add(x,y,Math.cos(a)*v,Math.sin(a)*v-.2,40+Math.random()*40,1+Math.random()*1.8,Math.random()<.3?"255,214,120":"200,225,255")}};
  o.addEventListener("pointerdown",brush);o.addEventListener("pointermove",e=>{if(e.buttons||e.pointerType==="touch")brush(e)});
  const frame=()=>{if(fin)return;const t=opTime(),dt=lastT==null?0:Math.max(0,Math.min(.05,t-lastT));lastT=t;let i=F.shots.length-1;while(i>0&&F.shots[i].at>t)i--;if(i!==si)setShot(i);
    if(t>=F.end&&!(S&&S.meteor!=null)){finish();return}
    const a=S.at,b=nextAt(si),p=Math.max(0,Math.min(1,(t-a)/Math.max(.1,b-a))),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    if(S.kb){const[A,B]=S.kb;kbNow=[A[0]+(B[0]-A[0])*e,A[1]+(B[1]-A[1])*e,A[2]+(B[2]-A[2])*e]}else kbNow=[1,50,50];
    let shake=0;if(S.crack!=null&&t>=S.crack&&t<S.crack+.35)shake=(1-(t-S.crack)/.35)*6;for(const[ts,d,am]of S.shk||[])if(t>=ts&&t<ts+d)shake=Math.max(shake,(1-(t-ts)/d)*am);
    st.style.transformOrigin=`${kbNow[1]}% ${kbNow[2]}%`;st.style.transform=`translate(${(Math.random()-.5)*shake}px,${(Math.random()-.5)*shake}px) scale(${kbNow[0]})`;
    let topK=S.img;for(const Lr of LY){const k=Math.max(0,Math.min(1,(t-Lr.t)/Lr.fd));if(k>0)topK=Lr.k;if(Lr.md==="r"){if(k>0&&k<1){const c=cover(S.rc||[384,600]),R=k*Math.hypot(W,H)*1.1,m=`radial-gradient(circle at ${c[0]}px ${c[1]}px,#000 ${R}px,transparent ${R+80}px)`;Lr.d.style.webkitMaskImage=m;Lr.d.style.maskImage=m}else{Lr.d.style.webkitMaskImage="none";Lr.d.style.maskImage="none"}Lr.d.style.opacity=k>0?"1":"0"}else Lr.d.style.opacity=k.toFixed(3)}
    if(S.board!=null&&t>=S.board&&!fired.bd){fired.bd=1;st.insertAdjacentHTML("beforeend",bhxBoardSvg());const B=st.querySelector(".bx-bd"),cs=Math.max(W/768,H/1376);if(B){B.style.top=cover([0,S.bp?S.bp[0]:819])[1]+"px";if(S.bp)B.style.width=S.bp[1]*cs+"px"}}   /* 到點才放進去，線一條條畫出來；河界對準圖上的星河（p1 y≈819），河畔初枰照石面（y≈657、寬≈440） */
    for(const[ts,k]of S.sfx||[])if(t>=ts&&t<ts+1&&!fired["s"+ts]){fired["s"+ts]=1;opSfx(k)}
    (S.say||[]).forEach(([ts],j)=>{const L=tx.querySelectorAll(".bx-l")[j];if(L&&t>=ts)L.classList.add("on")});
    if(S.nar&&t>=S.nar[0]){const N=tx.querySelector(".bx-n");if(N)N.classList.add("on")}
    if(S.title!=null){if(t>=S.title&&!fired.tt){fired.tt=1;capE.textContent="第〇章　"+BHX_TXT.title;capE.classList.add("on")}}else if(S.meteor==null)capE.classList.remove("on");
    if(S.meteor!=null&&t>=S.meteor&&!fired.met){fired.met=1;tx.querySelectorAll(".bx-l").forEach(x=>x.classList.add("on"));bhxFilmMeteor(o,capE,()=>finish())}
    /* 粒子 */
    g.clearRect(0,0,W,H);const sk=opImgXY[topK]?topK:S.img,src=sk&&opImgXY[sk]?onScr(cover(opImgXY[sk])):[W/2,H*.2];   /* 粒子源頭跟著目前最上層的圖走（疊層鏡頭） */
    if(!rm){if(S.fx==="tear")tearEmit(t,dt,topK);if(S.fx==="dark"&&Math.random()<.5)add(Math.random()*W,Math.random()*H,0,0,60+Math.random()*80,.6+Math.random()*1.2,"220,230,255");
      if(S.fx==="crack"&&t>=S.crack){if(!fired.cf){fired.cf=1;for(let k=0;k<90;k++){const an=Math.random()*6.283,v=1+Math.random()*5;add(src[0],src[1],Math.cos(an)*v,Math.sin(an)*v,30+Math.random()*50,1+Math.random()*2.4,"255,240,200")}}for(let k=0;k<3;k++)add(src[0]+(Math.random()-.5)*20,src[1],(Math.random()-.5)*1.2,1.5+Math.random()*3,60+Math.random()*60,.8+Math.random()*1.6,"200,225,255")}
      if(S.fx==="stars"&&Math.random()<.6)add(src[0]+(Math.random()-.5)*W*.6,src[1]-H*.3+Math.random()*H*.1,(Math.random()-.5)*.3,.4+Math.random()*.8,120,.6+Math.random()*1.4,"200,225,255");
      if(S.fx==="fall")for(let k=0;k<2;k++)add(src[0]+(Math.random()-.5)*W*.3,src[1]+(Math.random()-.5)*20,(Math.random()-.5)*.8,1+Math.random()*2.5,90+Math.random()*60,.6+Math.random()*1.5,"200,225,255");
      if(S.fx==="river"){const ry=onScr(cover([0,S.rvy||810]))[1];for(let k=0;k<2;k++)add(-5,ry+(Math.random()-.5)*H*.05,1+Math.random()*2.2,(Math.random()-.5)*.2,W/1.5,.6+Math.random()*1.4,"200,225,255")}
      if(S.fx==="whirl")for(let k=0;k<3;k++){const an=Math.random()*6.283,R=Math.max(W,H)*.6;add(src[0]+Math.cos(an)*R,src[1]+Math.sin(an)*R*.6,0,0,120,.8+Math.random()*1.6,Math.random()<.5?"180,140,255":"200,225,255")}
      if(S.fx==="stone"&&S.splash!=null&&t>=S.splash&&!fired.sp){fired.sp=1;const w=onScr(cover([380,800]));opSfx("meteor",true);for(let k=0;k<70;k++){const an=-Math.PI*Math.random(),v=1+Math.random()*4;add(w[0],w[1],Math.cos(an)*v,Math.sin(an)*v,40+Math.random()*40,1+Math.random()*2,"200,225,255")}}
      if(S.fx==="steam"&&opImgXY[topK]&&Math.random()<.4)add(src[0]+(Math.random()-.5)*40,src[1],(Math.random()-.5)*.3,-.4-Math.random()*.6,90,2+Math.random()*3,"240,240,240")}
    g.globalCompositeOperation="lighter";if(GR)bhxGrowTick(GR,t);
    if(S.fx==="tear"){const ct=t-S.crack;if(ct>=0&&ct<.18){g.fillStyle=`rgba(255,250,235,${(1-ct/.18)*.45})`;g.fillRect(0,0,W,H)}const D=BHX_DUST[topK];if(D&&D.c){let a=0;if(topK==="p11")a=.3+.2*Math.sin(t*9);else if(ct>=0&&topK==="p12")a=Math.max(0,.85*(1-ct/1.4));   /* 裂紋時縫裡一明一暗地透光；崩開時一圈光散掉（閃白 0.18 秒，ChatGPT 142） */
      if(a>0){const c=onScr(cover(D.c)),R=(D.rad?D.rad[0]:170)*Math.max(W/768,H/1376)*kbNow[0]*1.3,gr=g.createRadialGradient(c[0],c[1],0,c[0],c[1],R);gr.addColorStop(0,`rgba(255,248,226,${a})`);gr.addColorStop(.5,`rgba(220,230,255,${a*.35})`);gr.addColorStop(1,"rgba(220,230,255,0)");g.fillStyle=gr;g.fillRect(c[0]-R,c[1]-R,2*R,2*R)}}}
    if(S.fx==="crack"&&t>=S.crack){const k=Math.min(1,(t-S.crack)/.6),fl=Math.max(0,1-(t-S.crack)/.5);if(fl>0){g.fillStyle=`rgba(255,250,235,${fl*.55})`;g.fillRect(0,0,W,H)}
      /* 開發者 11/12「這裂痕太假，重畫」：不再用程式畫裂紋線（疊在畫好的裂縫上很假），改成裂口爆出一圈柔和的白金光暈，擴散後淡掉 */
      const ct=t-S.crack,ca=Math.max(0,1-ct/2.2);if(ca>0){const R=(40+ct*260)*Math.min(1.6,kbNow[0]),gr=g.createRadialGradient(src[0],src[1],0,src[0],src[1],R);gr.addColorStop(0,`rgba(255,250,232,${.85*ca})`);gr.addColorStop(.35,`rgba(255,226,170,${.35*ca})`);gr.addColorStop(1,"rgba(255,226,170,0)");g.fillStyle=gr;g.beginPath();g.arc(src[0],src[1],R,0,6.2832);g.fill()}}
    for(let j=P.length-1;j>=0;j--){const q=P[j];q.l++;if(S.fx==="whirl"&&q.col!=="255,214,120"){const dx=src[0]-q.x,dy=src[1]-q.y,d=Math.hypot(dx,dy)||1;q.vx=q.vx*.96+(dx/d)*.6+(-dy/d)*.9;q.vy=q.vy*.96+(dy/d)*.6+(dx/d)*.9;if(d<8)q.l=q.m}
      q.x+=q.vx;q.y+=q.vy;if(S.fx==="fall"||S.fx==="crack")q.vy+=.01;const al=Math.max(0,1-q.l/q.m);if(al<=0||q.x<-20||q.x>W+20||q.y>H+20){P.splice(j,1);continue}
      g.fillStyle=`rgba(${q.col},${al*.9})`;g.beginPath();g.arc(q.x,q.y,q.r,0,6.2832);g.fill()}
    if(DU.length)tearDraw(t,dt,topK);
    g.globalCompositeOperation="source-over";raf=requestAnimationFrame(frame)};
  setShot(0);raf=requestAnimationFrame(frame);return{finish}}
/* 電影第 2 段的七星流星：還沒選角＝七顆落下 → 選星（音樂在 36～44 秒小聲循環）→ 選定跳到 45 秒（七音上行）茶香接住；已有角色＝原本那段完整流星 */
function bhxFilmMeteor(o,cap,done){const stg=o.querySelector(".fm-st"),lift=()=>{const m=o.querySelector(".bx-mt");if(m&&stg)stg.after(m)};const after=()=>{if(cap){cap.textContent=BHX_TXT.rain;cap.classList.add("on")}setTimeout(done,3500)};
  if(bhxFresh()){bhxMeteor(o,()=>{OP.loop=[36,44];opVol(.45,1.2);bhxPick(o,cap,k=>{OP.loop=null;opSeek(45);opVol(1,.8);bhxMeteor(o,()=>{OP.loop=[60,84];after()},{mode:"catch",key:k})})},{mode:"all"});lift();
    let n=0;const iv=setInterval(()=>{if(++n>7){clearInterval(iv);return}opSfx("meteor")},420);return}
  bhxMeteor(o,after);lift();let n=0;const iv=setInterval(()=>{if(++n>7){clearInterval(iv);return}opSfx("meteor",n===7)},420)}
/* 開新旅程一律從開頭來（開發者 11/12「點選新的旅程不會從開頭開始，請修正」）：記下要存哪一格、標記「這一趟開頭要選角」（bhxFresh），選好的那顆星才帶進新旅程 */
function bhxFresh(){try{return !!store.get("bhxFresh",0)||!(typeof myChar==="function"&&myChar())}catch(e){return true}}
function bhxNewJourney(slot){if(typeof journey==="function"&&journey()){try{for(const k of["xq_play","xq_play2","xq_playPrev"])localStorage.removeItem(k)}catch(e){}}   /* hspx 開發者 11/12「覆蓋舊角色開新旅程，到黑洞對戰前跳出舊角色下到一半的那盤、問要放棄還是繼續」：對局不在存檔清單裡，舊旅程的電腦對局、石桌往事那盤會跟到新角色。已有旅程的人開新旅程時先清掉（local.js ensureP 看到資料沒了就丟掉記憶體裡的舊局、開空局，不走中途離開算輸）；第一次選角不清（11/11：試玩的那盤跟著第一位角色走） */
  store.set("bhxFresh",1);store.set("bhxSlot",slot||1);store.set("bhxPick",null);store.set("bhxLand",null);   /* hspx 開發者 11/12「選完角色後，降落的地點要改成在星槎船上，而不是首頁」：bhxLand 是整支手機共用、不在存檔清單裡，玩過一次的人開新旅程時 bhxLandNew 以為降落過了就回首頁；開新旅程先清掉 */
  try{opPre()}catch(e){}bhXuStart(false);if(typeof titleClose==="function")titleClose();location.hash="#/adventure"}
/* 舊玩家：開 App 後首頁沒有開頭畫面、沒有別的視窗時，跳一次 */
function bhxOldAsk(){try{if(!journey()||!bhxNeed()||store.get("bhXuAsk",null)||TITLE||!/^(#\/?)?$/.test(location.hash||"")||document.querySelector(".modal,#bhxPg,#bhxVx"))return false}catch(e){return false}store.set("bhXuAsk",Date.now());
  modal(`<div class="em">🌀</div><h2>大更新：第〇章與黑洞序局</h2><p>故事前面多了一章神話開場——天裂成河、青石落入雲河。現在建好角色後，會先從星渦掉進黑洞，跟星樞下一盤序局，才開始第一章。</p><p class="muted" style="font-size:13px">建議從頭玩一次。開新的旅程會存到另一格，你現在這段旅程不會被蓋掉。</p>`,
    [["🌀 開新的旅程",()=>titleScreen({view:"slots",mode:"new"})],["只看序章、下序局",()=>bhXuStart(true)],["之後再說",null,true]],"prolog");return true}
/* hspx 開發者 11/12「降落到經典首頁後，玩家在這個場景停頓大約 5 分鐘，出現引導玩家前往主場朝代的任務，這樣玩家才知道有事情可以做」：
   序局下完降落經典星槎（bhxLand；開發者更正：落在星槎頁，不是首頁）之後，停在星槎頁、畫面在前景、沒有別的視窗，累計 5 分鐘（離開首頁就重算）→ 跳任務；按「之後再去」最多再提醒一次；到過主場就不再出現 */
let BHX_IDLE=0;
function bhxQuestTick(){try{const J=journey();if(!J||!store.get("bhxLand",null))return;const q=+store.get("bhxQuest",0)||0;if(q>=2)return;
  const hm=J.home||(typeof CHAR_ERA!=="undefined"?CHAR_ERA[J.c]:null),D=typeof shipDocked==="function"?shipDocked():[];if(!hm||(typeof shipAt==="function"&&shipAt()===hm)){store.set("bhxQuest",9);return}
  const onHome=/^#\/adventure\/?$/.test(location.hash||"")&&document.visibilityState==="visible"&&!TITLE&&!document.querySelector(".modal,#bhxPg,#bhxVx");
  if(!onHome){BHX_IDLE=0;return}BHX_IDLE+=15;if(BHX_IDLE<300)return;BHX_IDLE=0;store.set("bhxQuest",q+1);bhxQuest(hm,D)}catch(e){}}
function bhxQuest(hm,D){const c=typeof myChar==="function"?myChar():null,C=c&&WX_CHARS[c],nk=C?(C.nk||C.n):"我",el=eraLabel(hm);
  modal(`<div class="em">📜</div><h2>任務：回到${esc(el)}</h2>${C?`<p class="pl-say"><img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()" style="width:44px;height:44px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px">${esc(C.n)}：「星槎可以載我們回${esc(el)}。那裡的石桌，還有一盤等我的棋。」</p>`:""}<p class="muted" style="font-size:13px">家鄉朝代的園子裡，有${esc(nk)}的主場棋局和千秋殘局。搭星槎起航就能過去。</p>`,
    [["⛵ 起航前往"+el,()=>{location.hash="#/adventure";setTimeout(()=>{try{shipGoTo(hm)}catch(e){}},700)}],["之後再去",null,true]],"prolog")}
if(typeof window!=="undefined"&&typeof document!=="undefined"&&!navigator.webdriver)setInterval(bhxQuestTick,15000);
if(typeof window!=="undefined"&&typeof document!=="undefined"&&!navigator.webdriver){let n=0;const tk=()=>{n++;let ok=false;try{ok=bhxOldAsk()}catch(e){}if(!ok&&n<40&&!store.get("bhXuAsk",null)&&bhxNeed())setTimeout(tk,3000)};setTimeout(tk,5000)}
