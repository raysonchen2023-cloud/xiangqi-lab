/* ================= 🌀 黑洞塔防練習賽「星淵試陣」（開發者 11/13 選方案 A 全程手把手；規劃 story/黑洞塔防練習賽教學規劃_1113.md）=================
   規則、盤面、劇本全在 07bht-td.js 的 BHTD.TL（journey "bh:tl"、td.lv＝0）；這支只管畫面與流程，沒載也不影響塔防本身（接點都用 typeof 包）。
   觸發：07bht bhtdSelect 一開頭問 bhtlNeed()（沒練過、沒跳過、塔防也還沒有任何輸贏）→ 邀請視窗 bhtlOffer；
     觀星臺「星淵遠征」（07gxt gxtTd → bhtdOpen → bhtdSelect）、星槎偏航（07bh bhOffer → bhIntro → bhStart → bhtdSelect）兩條路都經過這裡。
     關卡卡片最上面一張「練習賽」卡（bhtlCard）、陣地規則最後「▶ 再玩一次練習賽」隨時重練（同一盤練習沒下完就接著下）。
   8 步（bhtlStep 從盤面算，不另存步數；說明看過沒存在 store bhtl.cur，關掉 App 再開接得回來）：
     t0 開場（兩條元氣）→ t1 兵五進一吃過河卒 → t1b 靈力、被吃也扣、過河每回合咬 → t2 俥一進六堵星門 → t2b 堵住了、我方過河也咬星樞
     → t3 放第 1 招（t3g 選目標只亮 TL.tg 指定的格）→ t4 陣眼子（問一題）→ t5 俥一平五將軍 → 星樞元氣歸零 → 結果視窗 bhtlResult。
   鎖步：08b tap() 送出前問 bhtlGuard（照序局 bhxGuard：走錯不送出、第 2 次給黃框）；放招 bhtdUse 問 bhtlCastOk；目標格 bhtdMarks 問 bhtlTgOk。
   聚光燈 #bhtlSp：全螢幕 SVG 暗幕挖洞（mask）＋金色虛線圈＋👆；格子用 bhtdXY，3D 盤照 bhtdGnd 的透視 matrix 貼平（跟 #bhtdOv 地面記號同一套）；pointer-events:none，不擋點選。
   旁白泡泡 #bhtlBox：田飛燕講（玩家選的是她就換鐵連城），頭像用現有 data/xs/prev_*.webp，不出新圖；位置避開聚光燈的目標。
   不記錄：07bh bhGameEnd 遇到 bh:tl 只叫 bhtlEnd（不記 bhCount、bhWin、bhAdj、bhtd）；5 手棋不到 10 手，本來就不給修為。
   進階機制（破甲、星樞預告、九宮、星碎格、假門、護盾、定身、守關……）：正式關卡第一次出現時跳一句小卡（bhtlTip，07bht bhtdEvents 叫；開局就看得到的在 bhtlTick 看）。
   存檔 store "bhtl"（05b JOURNEY_KEYS、07dv DVT_KEYS）＝{done 練完時間, skip 跳過時間, n 練完幾次, cur {id 那一盤, t0/t1b/t2b/t4 看過}, tip {key: 第一次看到的時間}}。
   名稱前綴 bhtl／BHTL（11/13 grep 全專案 m/*.js、m.css、m.html、local.js、park3d.js 沒人用）。測試：node --test xiangqi-lab/tools/test-bhtl.js */
const BHTL_ID="bh:tl";
const BHTL_TX={
  t0:["醒醒，這裡是星淵的棋盤。","對面下黑棋的，是這座星盤的主人，叫星樞。","上面紫色長條是星樞的元氣，下面紅色的是我們的。元氣就像血——把星樞的元氣打到 0，我們就贏。"],
  t1:["看那顆卒，已經過河，跑到我們這邊了。","過了河的子，每回合都會咬掉我們 1 點元氣。","用中兵吃掉它！"],
  t1b:["吃子會扣星樞的元氣，還多 10 點靈力——就是你名字旁邊那條藍色的靈力條。","哎呀，星樞也會吃我們的子，被吃一樣扣元氣。","那顆卒還站在河這邊，剛剛又咬了我們 1。"],
  t2:["紫色轉圈的是星門。星樞的棋子不會一次到齊，會從星門一顆一顆掉下來。","圈上的數字是倒數，數到 0 就落下。","派俥站上去，把門堵住！"],
  t2b:["堵住了！只要有子站在門上，援軍就下不來。","還有——我們的俥也過了河。過河的子，一樣每回合咬星樞 1 點。"],
  t3:["藍條滿了！靈力每回合會自己回 10，吃子再多 10。","滿了就能放招式。點下面發亮的招式鈕。","放招不算走棋，放完還能再走一步；一回合只能放一招。"],
  t3w:["看招！"],
  t4:["看那顆發金光的子——那是你的本命子，叫陣眼子。","用它吃子，對方扣的元氣是平常的 1.5 倍。","可是它被吃掉，靈力會全散，招式也要停一回合。"],
  t4q:"陣眼子被吃掉，會怎樣？",t4no:"再想想——它是你的陣眼，丟了會很傷。",t4a:["靈力全散、停招一回合","什麼事都沒有"],
  t5:["對，所以要護好它。","星樞的元氣快見底了。","把俥橫移到中間，對準黑將——將軍會扣 5 點元氣！"],
  wt:["看星樞怎麼走……"],
  kid:{t1:"吃掉過河的卒",t2:"把俥走到紫色圈上",t3:"點下面的招式鈕",t5:"俥一平五，將軍"},
  talk:"先看完說明，按「繼續」",wrong:"先走發亮的那一步",cast0:"等一下就教你放招",cast1:"先點下面發亮的招式鈕",ask:"先回答上面的問題",
  offer:"這裡的棋，跟人間不太一樣。我先帶你走一盤，大約兩分鐘。",free:"練習賽不算輸贏，也不扣任何東西。",
  skipQ:"跳過練習，直接去選關？",skipS:"之後在關卡卡片最上面還能再練。",
  win:"學得真快！星淵的規矩，大概就是這些。",lose:"沒關係，隨時可以再練。",
  sum:["吃掉過河的子","站上星門，堵住援軍","靈力滿了就放招","護好陣眼子"],
  rule:["怎麼贏：把星樞的元氣打到 0，或將死它。","怎麼輸：我們的元氣先到 0。","正式關卡可以帶 4 招，在關卡卡片下面挑。"]};
/* 第 1 招在 t3 的說法：g＝選目標時、a＝放完（沒有目標的招只有 a）；目標格在 BHTD.TL.tg */
const BHTL_SK={qi1:{g:"點那顆發亮的卒，一劍把它打出棋盤。",a:"卒被打掉了，再也咬不到我們。"},tian1:{g:"先點炮，再點底線發亮的點。",a:"大子遇到危險，可以這樣飛回家。"},
  lei1:{g:"點那顆卒，用煙火把它定住。",a:"被定住的子，下回合不能動。"},luo1:{g:"剛剛被吃掉的兵，可以叫它回營——點那個發亮的點。",a:"兵回來了！原位空著，被吃的子就能叫回來。"},
  shen1:{a:"元氣補回來了。"},tie1:{a:"下一次扣元氣，護盾會整個擋掉。"},bu1:{g:"點炮，再點傌，兩顆子會換位置。",a:"換個位置，有時候就能解圍。"}};
/* 進階機制第一次出現時的一句（正式關卡；練習賽不跳） */
const BHTL_TIP={fore:"星樞要放招了！紅框的子會被波及。下回合結束前先處理，就能少扣元氣。",esp:"星樞吃到子也會長靈力（紫色細條），夠了就會放招。",
  pj:"炮隔一顆子瞄到的敵子會破甲：下次打它，多扣 1。",pal:"敵子停進我們的九宮，每回合多扣 2！先把它趕走或吃掉。",ck:"被將軍會扣 5 元氣（防禦可減少），先保帥。",
  eye:"陣眼子被吃了：靈力散光，招式停一回合，之後會慢慢回來。",shard:"紫色菱形是星碎格：誰踩上去，誰扣 3 元氣——我們和星樞都一樣。",
  fake:"有兩道門看起來一模一樣，其中一道是假門，落子時才會散掉。",gd:"護盾擋掉了這一次扣元氣。",sh:"小盾：這顆子被吃時少扣幾點，最多撐 3 回合。",
  frz:"被定身的子，下回合不能動。",boss:"守關王！它的招牌招「引力撕裂」會扣 5（防禦可減少），護盾擋得住。"};
const BHTL_KEEP=".pk2d:not([hidden]),.pk3d-back:not([hidden]) button,.pzoom,.gs-ui,.pkview,.gpad";
let BHTL_ST=null,BHTL_RAF=0,BHTL_K="",BHTL_SP="",BHTL_W=0,BHTL_W4=false,BHTL_SKIP=false,BHTL_FR="",BHTL_TQ=[],BHTL_TON=false;
/* ---------- 存檔、判斷 ---------- */
function bhtlSt(){let S=null;try{S=store.get("bhtl",null)}catch(e){}S=S&&typeof S==="object"?S:{};if(!S.tip||typeof S.tip!=="object")S.tip={};return S}
function bhtlSave(o){const S=Object.assign(bhtlSt(),o);try{store.set("bhtl",S)}catch(e){}return S}
function bhtlNeed(){const S=bhtlSt();if(S.done||S.skip)return false;let P={c:{},w:{},l:{}};try{if(typeof bhtdProg==="function")P=bhtdProg()}catch(e){}
  return !Object.keys(P.c||{}).length&&!Object.keys(P.w||{}).length&&!Object.keys(P.l||{}).length}   /* 11/13 18:00 以後已經玩過塔防的人不自動邀請 */
const bhtlIs=st=>!!st&&st.journey===BHTL_ID&&!!st.td;
/* 11/13 手機實測：3D 全盤遠景相鄰格約 20px，中兵模型擋住卒的腳下點不到 → 練習賽整盤用平面棋盤（08b render 把它當 PARK_OFF，跟錯棋重練同一套，不改玩家的 park3d 設定；下一盤照原本設定） */
function bhtlFlat(st){return bhtlIs(st)||(typeof bhtdFlat==="function"&&bhtdFlat(st))}   /* 11/14：正式關卡選了「純淨平面」視角也走這條（07bht-td.js bhtdFlat） */
/* 練習賽進行中（旁白泡泡在）：01-board 的術語、記譜第一次提示先不跳，免得壓在泡泡上；練完照常出現 */
function bhtlHush(){return !!BHTL_ST||!!(typeof document!=="undefined"&&document.getElementById("bhtlBox"))}
function bhtlGuide(){let c="";try{c=bhtdChar()}catch(e){}const k=c==="x_spiritgirl"?"x_shi":"x_spiritgirl";return{k,n:BHTD.CH[k].n}}   /* 田飛燕講；玩家選的是她就換鐵連城 */
const bhtlSay=t=>{const G=bhtlGuide();return typeof bhSay==="function"?bhSay([G.n,t]):`<p class="pl-say">${esc(G.n)}：「${esc(t)}」</p>`};
function bhtlQ(st){const S=bhtlSt();return S.cur&&S.cur.id===st.id?S.cur:{id:st.id}}
function bhtlMark(st,k){const q=bhtlQ(st);q[k]=1;bhtlSave({cur:q})}
/* 現在第幾步：只看盤面（已走幾手、輪到誰、這回合放過招沒）＋說明看過沒 */
function bhtlStep(st){if(!st||!st.td)return"wait";if(st.result)return"end";const td=st.td,n=(st.moves||[]).length,Q=bhtlQ(st);
  if(st.turn!==st.human||st.thinking)return n===1||n===3?"w"+((n+1)/2):"wait";
  if(n===0)return Q.t0?"t1":"t0";if(n===2)return Q.t1b?"t2":"t1b";
  if(n===4){if(!Q.t2b)return"t2b";if(td.castR!==td.rnd)return typeof BHTD_BUSY!=="undefined"&&BHTD_BUSY?"t3w":typeof BHTD_TG!=="undefined"&&BHTD_TG?"t3g":"t3";return Q.t4?"t5":"t4"}
  return"wait"}
const bhtlSq=u=>{try{return bhtdC().parseSq(u)}catch(e){return-1}};
/* ---------- 入口 ---------- */
function bhtlCard(){bhtlCss();const dn=!!bhtlSt().done;
  return`<button type="button" class="bt-card bt-tl${dn?" done":""}" data-tl="1" aria-label="${esc("練習賽・星淵試陣，約 2 分鐘，不算輸贏"+(dn?"，已練過":"，推薦先練"))}"><span class="hd"><small>練習賽</small><b>星淵試陣</b><span class="st">約 2 分鐘・不算輸贏</span></span><small class="tg">吃過河的卒、堵星門、放招、認陣眼子</small><small class="ok" aria-hidden="true">${dn?"✓ 已練過":"推薦先練"}</small></button>`}
function bhtlOffer(k,cover){bhtlCss();
  modal(`<div class="em">🌀</div><h2>第一次來星淵？</h2>${bhtlSay(BHTL_TX.offer)}<p class="muted" style="font-size:13px">${esc(BHTL_TX.free)}</p>`,
    [["▶ 先練一盤",()=>bhtlStart(k,cover)],["我會了，直接選關",()=>{bhtlSave({skip:Date.now()});bhtdSelect(k,cover)},true]],"prolog")}
function bhtlStart(k,cover){const C=bhtdC();if(!C)return toast("規則程式還沒載好");const ck=bhtdChar(),L=bhtdL(),diff=bhtdDiff(),T=BHTD.TL;try{bhPreload()}catch(e){}
  const R0=store.get("bhRet",null);store.set("bhRet",{k:k||(R0&&R0.k)||store.get("era","classic"),cover:k?cover!==false:!!(R0&&R0.cover),at:Date.now(),first:!((+store.get("bhCount",0)||0)>0)});   /* 不動 park3d：這盤由 08b 照 bhtlFlat 用平面棋盤 */
  BHTL_W=0;BHTL_W4=false;BHTL_SKIP=false;BHTL_K="";bhtlSave({cur:null});
  jStart(BHTL_ID,{human:"r",lx:1,journey:BHTL_ID,lv:{fen:BHTD.startFen("tl",C),turn:"r",mirror:T.blk.slice()},td:{lv:"tl",ch:ck,L,diff}},()=>{const was=/^#\/journey\/play/.test(location.hash);location.hash="#/journey/play";
    if(was)try{window.dispatchEvent(new Event("xq-play"))}catch(e){}
    setTimeout(()=>{try{bhBell()}catch(e){}},900)})}   /* 星樞照 lv.mirror 走劇本（local.js styleMove）；走不通才叫引擎（推算 1 步）。不傳 force：別的對局下到一半照 jStart 先問；同一盤練習沒下完就接著下 */
/* ---------- 對局中 ---------- */
function bhtlTick(st){if(typeof document==="undefined")return;if(!st||!st.td){bhtlHide();return}
  if(!bhtlIs(st)){bhtlHide(1);if(BHTL_FR!==st.id){BHTL_FR=st.id;if(!st.result)bhtlLvTips(st)}return}
  BHTL_ST=st;bhtlCss();if(!BHTL_RAF)BHTL_RAF=requestAnimationFrame(bhtlFrame)}
function bhtlHide(keepTip){if(BHTL_RAF){cancelAnimationFrame(BHTL_RAF);BHTL_RAF=0}BHTL_ST=null;BHTL_K="";BHTL_SP="";if(typeof document==="undefined")return;
  for(const id of keepTip?["bhtlBox","bhtlSp"]:["bhtlBox","bhtlSp","bhtlTip"]){const e=document.getElementById(id);if(e)e.remove()}if(!keepTip){BHTL_TQ=[];BHTL_TON=false}}
function bhtlFrame(){BHTL_RAF=0;const st=BHTL_ST;if(!st||!bhtlIs(st)||!/^#\/journey\/play/.test(location.hash)){bhtlHide(1);return}
  const s=bhtlStep(st);if(s==="end"){bhtlHide(1);return}
  const key=s+"|"+(BHTL_W4?1:0)+"|"+(s==="t3g"&&BHTD_TG?BHTD_TG.id+BHTD_TG.pk.length:"");if(key!==BHTL_K){BHTL_K=key;bhtlPaint(st,s)}
  const L=bhtlSpots(st,s);bhtlSpotDraw(L);bhtlPlace(L);BHTL_RAF=requestAnimationFrame(bhtlFrame)}
/* 聚光燈要指的地方：格子 {sq} 或畫面元素 {el}；hand＝手指指這一個。格子從 TL 劇本算（red／blk 的起點終點） */
function bhtlSpots(st,s){const T=BHTD.TL,R=T.red.map(u=>[bhtlSq(u.slice(0,2)),bhtlSq(u.slice(2,4))]),B=T.blk.map(u=>bhtlSq(u.slice(2,4))),eye=BHTD.sqOf(st.td,st.td.eye);
  if(s==="t0")return[{el:"#bhtdEn .bt-bar.en"},{el:"#bhtdEn .bt-bar.me"}];   /* 11/14：自己的元氣、靈力搬到上面的對峙資訊列（下排） */
  if(s==="t1")return[{sq:R[0][1]},{sq:R[0][0],hand:1}];
  if(s==="t1b")return[{el:"#bhtdEn .bt-sp"},{el:"#bhtdEn .bt-bar.me"},{sq:B[0]}];
  if(s==="t2")return[{sq:R[1][1]},{sq:R[1][0],hand:1},{el:"#bhtdEn .bt-gate"}];
  if(s==="w2")return[{sq:R[1][1]}];
  if(s==="t2b")return[{sq:R[1][1]},{el:"#bhtdEn .bt-bar.en"}];
  if(s==="t3")return[{el:"#bhtdEn .bt-sp"},{el:"#bhtdMe .bt-sk",hand:1}];
  if(s==="t3g"&&typeof BHTD_TG!=="undefined"&&BHTD_TG){const u=(T.tg[BHTD_TG.id]||[])[BHTD_TG.pk.length];return u?[{sq:bhtlSq(u),hand:1}]:[]}
  if(s==="t4")return eye!=null?[{sq:eye}]:[];
  if(s==="t5")return[{sq:R[2][0],hand:1},{sq:R[2][1]}];
  return[]}
/* 旁白泡泡 */
function bhtlPaint(st,s){let b=document.getElementById("bhtlBox");const X=BHTL_TX;
  if(s==="wait"){if(b)b.remove();return}
  if(!b){b=document.createElement("div");b.id="bhtlBox";b.setAttribute("role","dialog");b.setAttribute("aria-live","polite");b.setAttribute("aria-label","練習賽說明");document.body.append(b);b.addEventListener("click",bhtlBoxClick)}
  const G=bhtlGuide(),K=BHTL_SK[st.td.sk[0]]||{};let L=[],bt="";
  if(s==="t3g")L=[K.g||X.t3[1]];else if(s==="t4")L=(K.a?[K.a]:[]).concat(X.t4);else if(s==="w1"||s==="w2")L=X.wt;else L=X[s]||[];
  if(s==="t0"||s==="t1b"||s==="t2b")bt=`<div class="bl-bt"><button type="button" class="bl-btn" data-bl="next">繼續</button></div>`;
  if(s==="t4")bt=`<p class="bl-q">${esc(BHTL_W4?X.t4no:X.t4q)}</p><div class="bl-bt"><button type="button" class="bl-btn" data-bl="a1">${esc(X.t4a[0])}</button><button type="button" class="bl-btn ghost" data-bl="a0">${esc(X.t4a[1])}</button></div>`;
  const kid=(typeof bhtdKid==="function"&&bhtdKid()&&X.kid[s])||"";
  b.innerHTML=`<div class="bl-hd"><img src="data/xs/prev_${G.k}.webp" alt="" onerror="this.remove()"><b>${esc(G.n)}</b><button type="button" class="bl-skip" data-bl="skip">跳過練習</button></div>${L.map(t=>`<p>${esc(t)}</p>`).join("")}${kid?`<p class="bl-kid">💡 ${esc(kid)}</p>`:""}${bt}`}
function bhtlBoxClick(e){const x=e.target.closest("[data-bl]"),st=BHTL_ST;if(!x||!st)return;const a=x.dataset.bl,s=bhtlStep(st);try{vibrate(5)}catch(z){}
  if(a==="skip")return bhtlSkip();
  if(a==="next"&&(s==="t0"||s==="t1b"||s==="t2b")){bhtlMark(st,s);BHTL_K="";return}
  if(a==="a1"&&s==="t4"){BHTL_W4=false;bhtlMark(st,"t4");BHTL_K="";return}
  if(a==="a0"&&s==="t4"){BHTL_W4=true;BHTL_K=""}}
/* 聚光燈：暗幕挖洞＋金色虛線圈；3D 盤上的格子用 bhtdGnd 的透視 matrix 貼平（SVG transform，跟 #bhtdOv 地面記號同一套）；元素用外框圓角方框 */
function bhtlSpotDraw(list){let o=document.getElementById("bhtlSp");if(!list.length){if(o)o.remove();BHTL_SP="";return}
  if(!o){o=document.createElement("div");o.id="bhtlSp";o.setAttribute("aria-hidden","true");o.innerHTML=`<svg></svg><div class="hand">👆</div>`;document.body.append(o);BHTL_SP=""}
  const a=bhtdXY(40),c=bhtdXY(41),cell=a&&c?Math.max(18,Math.min(90,Math.hypot(c.x-a.x,c.y-a.y))):36,g3=typeof bhtd3d==="function"&&bhtd3d(),f=n=>(+n).toFixed(1);let holes="",rings="",hand=null;
  for(const t of list){if(t.sq!=null){if(t.sq<0)continue;const p=bhtdXY(t.sq);if(!p)continue;const M=g3&&typeof bhtdGnd==="function"?bhtdGnd(t.sq,p,cell):null,r=f(cell*.62),tf=`translate(${f(p.x)} ${f(p.y)})${M?` matrix(${M.split(",").join(" ")})`:""}`;
      holes+=`<circle r="${r}" transform="${tf}" fill="#000"/>`;rings+=`<circle r="${r}" transform="${tf}" fill="none" stroke="#FFE08A" stroke-width="3" stroke-dasharray="7 5" vector-effect="non-scaling-stroke"/>`;
      if(t.hand&&!hand)hand={x:p.x,y:p.y+cell*.5,up:1}}
    else{const e=document.querySelector(t.el);if(!e)continue;const R=e.getBoundingClientRect();if(!R.width||!R.height)continue;const at=`x="${f(R.left-4)}" y="${f(R.top-4)}" width="${f(R.width+8)}" height="${f(R.height+8)}" rx="10"`;
      holes+=`<rect ${at} fill="#000"/>`;rings+=`<rect ${at} fill="none" stroke="#FFE08A" stroke-width="2.5" stroke-dasharray="7 5"/>`;if(t.hand&&!hand)hand={x:R.left+R.width/2,y:R.top-6,up:0}}}
  const h=`<defs><mask id="bhtlMk"><rect width="100%" height="100%" fill="#fff"/>${holes}</mask></defs><rect width="100%" height="100%" fill="rgba(4,4,16,.42)" mask="url(#bhtlMk)"/>${rings}`;
  if(h!==BHTL_SP){BHTL_SP=h;o.querySelector("svg").innerHTML=h}
  const hd=o.querySelector(".hand");if(hand){hd.style.display="";const t=hand.up?"👆":"👇";if(hd.textContent!==t)hd.textContent=t;hd.style.transform=`translate(${f(hand.x)}px,${f(hand.y)}px) translate(-50%,${hand.up?"0":"-100%"})`}else hd.style.display="none"}
/* 泡泡放哪裡：橫向（寬螢幕）放左邊；直向在「元氣條下面、自己的條上面、最下面、最上面」裡挑蓋到最少目標的 */
function bhtlPlace(list){const b=document.getElementById("bhtlBox");if(!b)return;const W=innerWidth,H=innerHeight,bh=b.offsetHeight||140;
  if(W>H*1.25&&W>=700){b.classList.add("side");b.style.top=Math.max(8,(H-bh)/2)+"px";return}b.classList.remove("side");
  const ys=[];for(const t of list){if(t.sq!=null){const p=t.sq>=0&&bhtdXY(t.sq);if(p)ys.push([p.y-24,p.y+24])}else{const e=document.querySelector(t.el);if(e){const R=e.getBoundingClientRect();if(R.height)ys.push([R.top,R.bottom])}}}
  for(const e of document.querySelectorAll(BHTL_KEEP)){const R=e.getBoundingClientRect();if(R.width&&R.height)ys.push([R.top-4,R.bottom+4])}   /* 平面棋盤／3D 場景切換鈕、3D 控制鈕也不能蓋 */
  const en=document.getElementById("bhtdEn"),me=document.getElementById("bhtdMe"),er=en&&en.getBoundingClientRect(),mr=me&&me.getBoundingClientRect();
  const C=[er?er.bottom+6:60,mr?mr.top-6-bh:H-bh-6,H-bh-6,6].map(y=>Math.max(6,Math.min(H-bh-6,y)));let best=C[0],bs=1e9;
  for(const y of C){const n=ys.filter(([a,z])=>z>y&&a<y+bh).length;if(n<bs){bs=n;best=y}}b.style.top=Math.round(best)+"px"}
/* ---------- 鎖步、放招、目標 ---------- */
const bhtlTalk=s=>s==="t0"||s==="t1b"||s==="t2b";
function bhtlGuard(st,f,t){if(!bhtlIs(st)||st.result)return null;const s=bhtlStep(st),n=(st.moves||[]).length,X=BHTL_TX;
  const why=bhtlTalk(s)?X.talk:s==="t3"||s==="t3g"||s==="t3w"?X.cast1:s==="t4"?X.ask:null;if(why){try{vibrate([10,40,10])}catch(e){}toast("✦ "+why);return{hint:null}}
  const u=BHTD.TL.red[n>>1];if(!u)return null;const ff=bhtlSq(u.slice(0,2)),tt=bhtlSq(u.slice(2,4));if(f===ff&&t===tt){BHTL_W=0;return null}
  BHTL_W++;try{vibrate([10,40,10])}catch(e){}toast("✦ "+X.wrong);return{hint:BHTL_W>=2&&ff>=0?[ff,tt]:null}}   /* 照序局 bhxGuard：走錯不送出、第 2 次給黃框 */
function bhtlCastOk(st){if(!bhtlIs(st))return true;const s=bhtlStep(st);if(s==="t3"||s==="t3g"||s==="t4"||s==="t5")return true;toast("✦ "+BHTL_TX.cast0);return false}
function bhtlTgOk(st,T,q){if(!bhtlIs(st)||!T)return true;const u=((BHTD.TL.tg||{})[T.id]||[])[T.pk.length];return u?bhtlSq(u)===q:true}
function bhtlSkip(){modal(`<h2 style="font-size:19px">${esc(BHTL_TX.skipQ)}</h2><p class="muted">${esc(BHTL_TX.skipS)}</p>`,
  [["跳過",()=>{bhtlSave({skip:Date.now(),cur:null});BHTL_SKIP=true;bhtlHide(1);api("/play/resign").catch(()=>{BHTL_SKIP=false;const R=store.get("bhRet",null);bhtdSelect(R&&R.k,R?R.cover:false)})}],["繼續練",null,true]])}
/* ---------- 結算（07bh bhGameEnd、bhResultModal 遇到 bh:tl 轉過來） ---------- */
function bhtlEnd(st){if(!st||!st.result||st.result.w!==st.human)return;const S=bhtlSt();bhtlSave({done:Date.now(),n:(+S.n||0)+1,cur:null})}
function bhtlResult(st,win){bhtlHide(1);const R=store.get("bhRet",null),k=R&&R.k,cv=R?R.cover:false,X=BHTL_TX,BL=typeof gxtBackLb==="function"?gxtBackLb():"⛵ 星槎回航",back=typeof bhReturn==="function"?bhReturn:null;
  if(BHTL_SKIP){BHTL_SKIP=false;bhtdSelect(k,cv);return}   /* 跳過練習：認輸收掉這盤，直接開關卡卡片 */
  const sel=()=>bhtdSelect(k,cv),again=()=>bhtlStart(k,cv);bhtlCss();
  if(win)modal(`<div class="em">✨</div><h2>練習賽・過關</h2>${bhtlSay(X.win)}<ul class="bl-sum">${X.sum.map(t=>`<li>✓ ${esc(t)}</li>`).join("")}</ul>${X.rule.map(t=>`<p class="muted bl-rule">${esc(t)}</p>`).join("")}`,
    [["⚔ 開始第 1 關",sel],["↻ 再練一次",again],[BL,back,true]],"res");
  else modal(`<div class="em">🌀</div><h2>練習賽先到這裡</h2>${bhtlSay(X.lose)}`,[["↻ 再練一次",again],["直接選關",sel],[BL,back,true]],"res")}
/* ---------- 進階機制第一次出現：跳一句小卡（正式關卡；每種只跳一次） ---------- */
function bhtlPal(b){for(let q=63;q<90;q++)if(b[q]&&b[q]!=="k"&&b[q]===b[q].toLowerCase()&&q%9>=3&&q%9<=5)return true;return false}
function bhtlTip(e,st){if(!e||!st||!st.td||bhtlIs(st))return;let k=null;
  if(e.k==="fore")k="fore";else if(e.k==="esp")k="esp";else if(e.k==="mark")k="pj";else if(e.k==="eye")k="eye";else if(e.k==="absorb")k="gd";else if(e.k==="sh")k="sh";else if(e.k==="frz")k="frz";
  else if(e.k==="hit"&&e.sd==="r"&&e.why==="被將軍")k="ck";else if(e.k==="hit"&&e.sd==="r"&&e.why==="過河"&&bhtlPal(st.board||[]))k="pal";
  if(k)bhtlTipShow(k)}
function bhtlLvTips(st){const td=st.td;if(td.shard&&td.shard.length)bhtlTipShow("shard");if(td.gate&&td.gate.fk&&td.gate.fk.length)bhtlTipShow("fake");if(td.boss)bhtlTipShow("boss")}
function bhtlTipShow(k){if(!BHTL_TIP[k])return;const S=bhtlSt();if(S.tip[k])return;S.tip[k]=Date.now();bhtlSave({tip:S.tip});BHTL_TQ.push(k);bhtlTipNext()}
function bhtlTipNext(){if(BHTL_TON||!BHTL_TQ.length||typeof document==="undefined")return;const k=BHTL_TQ.shift();BHTL_TON=true;bhtlCss();
  const d=document.createElement("div");d.id="bhtlTip";d.setAttribute("role","status");d.innerHTML=`💡 ${esc(BHTL_TIP[k])}`;const en=document.getElementById("bhtdEn"),r=en&&en.getBoundingClientRect();d.style.top=Math.max(8,r&&r.height?r.bottom+6:64)+"px";
  let done=false;const fin=()=>{if(done)return;done=true;d.remove();BHTL_TON=false;setTimeout(bhtlTipNext,300)};d.addEventListener("click",fin);document.body.append(d);setTimeout(fin,6500)}
function bhtlCss(){if(typeof document==="undefined"||document.getElementById("bhtlCss"))return;const s=document.createElement("style");s.id="bhtlCss";s.textContent=`
#bhtlSp{position:fixed;inset:0;z-index:41;pointer-events:none}
#bhtlSp svg{position:absolute;inset:0;width:100%;height:100%}
#bhtlSp .hand{position:absolute;left:0;top:0;font-size:34px;line-height:1;filter:drop-shadow(0 2px 4px #000);animation:blHand 1.1s ease-in-out infinite;will-change:transform}
@keyframes blHand{50%{margin-top:-9px}}
#bhtlBox{position:fixed;z-index:45;left:50%;transform:translateX(-50%);width:min(92vw,420px);box-sizing:border-box;background:rgba(14,12,34,.95);color:#F4ECD8;border:1.5px solid #C9A8FF;border-radius:14px;padding:8px 12px 10px;font-family:var(--serif);font-size:14.5px;line-height:1.55;box-shadow:0 6px 20px rgba(0,0,0,.5);text-align:left}
#bhtlBox.side{left:8px;transform:none;width:min(32vw,320px)}
#bhtlBox p{margin:3px 0}
#bhtlBox .bl-hd{display:flex;align-items:center;gap:8px;margin-bottom:2px}
#bhtlBox .bl-hd img{width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:top;flex:none}
#bhtlBox .bl-hd b{color:#FFE08A;font-size:14px}
#bhtlBox .bl-skip{margin-left:auto;font:inherit;font-size:12.5px;color:#E2D8FA;background:transparent;border:1px solid rgba(226,216,250,.5);border-radius:99px;padding:6px 12px;min-height:36px;cursor:pointer}
#bhtlBox .bl-kid{color:#FFE08A}
#bhtlBox .bl-q{color:#FFE08A;font-weight:700;margin-top:6px}
#bhtlBox .bl-bt{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px}
#bhtlBox .bl-btn{font:inherit;font-size:14px;font-weight:700;color:#1A1424;background:#FFE08A;border:0;border-radius:99px;padding:8px 16px;min-height:44px;cursor:pointer}
#bhtlBox .bl-btn.ghost{color:#F4ECD8;background:transparent;border:1.5px solid rgba(244,236,216,.6)}
#bhtlTip{position:fixed;z-index:45;left:50%;transform:translateX(-50%);width:min(90vw,400px);box-sizing:border-box;background:rgba(40,24,6,.95);color:#FFF1C8;border:1px solid #E8C77A;border-radius:12px;padding:8px 12px;font-family:var(--serif);font-size:13.5px;line-height:1.5;cursor:pointer;animation:blIn .25s ease-out}
@keyframes blIn{from{opacity:0;transform:translate(-50%,-6px)}}
.bt-sel .bt-card.bt-tl{margin-top:8px;border-style:dashed}
.bl-sum{list-style:none;padding:0;margin:8px auto;text-align:left;display:inline-block;font-size:14px;line-height:1.8}
.bl-rule{font-size:13px;margin:2px 0}
@media (prefers-reduced-motion:reduce){#bhtlSp .hand,#bhtlTip{animation:none}}`;document.head.append(s)}
