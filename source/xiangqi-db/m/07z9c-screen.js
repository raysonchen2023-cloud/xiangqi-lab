/* ---------- W48 屏風馬門門內（開發者 11/22：「讓屏風馬更有其他特色，和中炮門有差異，不要用同樣玩法」）----------
   選單決定：三種只有這一派有的玩法都做；前院不站門人。
     🐎 石馬・雙馬守中宮：從「中炮過河車對屏風馬」開始（炮二平五 馬8進7 傌二進三 車9平8 俥一平二 馬2進3 俥二進六），玩家執黑；
        電腦照園子棋友的強度猛攻，你走滿 10 步、沒被將死、大子沒有淨虧 3 分以上就過關（車 9、馬 4、炮 4.5）。
     📖 女塾課堂：原本的開局課（拜師）照舊，另外加「幫學童挑錯著」——一位學童照本派開局課下了一盤，其中黑方有一步走錯；
        先找出是哪一步，再走出該走的那一步（題庫 data/zmhall/screen-errata.json，Windows Claude 2 用引擎核驗）。
     🧮 算盤・替棋局算帳：大師對局的中局，判斷紅優、均勢還是黑優，答完列出子力帳（題庫 data/zmhall/screen-abacus.json）。
   修為：守中宮帳號第一次過關 +20；挑錯著、算帳每天第一次答對（算帳＝一輪 3 題全對）各 +10。不扣修為、不改掌門強度與棋局。
   JhHall 本體不動：門內圖、座位、地點寫進 JH_HALL／JH_HALL_WALK，標籤文字與多出來的兩個入口在 JhHall 包裝裡補。
   座標都是門內圖原圖像素（768×1376，park/zmhall/hall_screen 修過草地假字的版本）。 */
if(typeof JH_HALL!=="undefined"){
  /* 11/22 開發者實機截圖「怎麼會坐在桌子上」：立繪疊在圖的最上層，整個人（含盤坐的腳）畫在桌子前面。改成裁掉立繪下面 cut（30%），
     裁切線對齊桌子後緣（原圖 y≈270）：seat 的 y＝270＋立繪高×cut（寬 66 → 高 89 → 270＋27＝297）；看起來就是坐在桌子後面、圓牌靠著桌緣 */
  JH_HALL.screen={v:"1122",seat:[386,297],w:66,cut:.3,spots:{hall:[386,120],study:[386,570],gate:[386,1290]},
    extra:{horse:[386,880],abacus:[318,338]}};   /* 沒有 yard、沒有 mates：前院不站門人（開發者選單） */
}
if(typeof JH_HALL_WALK!=="undefined"){
  /* 動線跟中炮門不同：從牌坊進門，前院、石馬之間上課堂；要上大廳得從課堂左邊的迴廊口繞到中庭，再上大廳石階 */
  JH_HALL_WALK.screen={h:[.052,84,.00025],look0:[50,62],dmax:2.2,
    /* 起點一定要叫 dock：07z9b jhHallWalk 對每一派都傳 home:"dock"（中炮門從碼頭上岸）；這裡的 dock＝剛走進牌坊的地方 */
    N:{gate:[50,93],dock:[50,76.5],home:[50,72.5],yard:[50,69],hf:[50,65],cf:[50,58.5],gL:[22,62],gL2:[23,49],gL3:[27,39],ct:[40,34.5],hall:[50,31]},
    E:"gate-dock dock-home home-yard yard-hf hf-cf yard-gL gL-gL2 gL2-gL3 gL3-ct ct-hall",
    HS:{hall:["hall",50.3,21,"bow"],zm:["hall",50.3,21,"bow"],abacus:["hall",46,20,"bow"],study:["cf",50,52,"bow"],horse:["hf",30,61,"wave"],gate:["gate",50,98,"wave"]}};
}
const JH_SCR_GUARD={mv:"h2e2 h9g7 h0g2 i9h9 i0h0 b9c7 h0h6",fen:"r1bakabr1/9/1cn3nc1/p1p1p1pRp/9/9/P1P1P1P1P/1C2C1N2/9/RNBAKAB2",turn:"b",limit:10,lose:3};
const JH_SCR_VAL={R:9,N:4,C:4.5};
const JH_SCR_J="jh:guard:screen";
/* 存檔：g＝守中宮第一次過關（時間、局號）；best＝最多守了幾步；de／da＝挑錯著、算帳今天拿過修為的日子 */
function jhScrGet(){let o=null;try{o=store.get("jhScreen",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{g:o.g&&typeof o.g==="object"?{t:+o.g.t||0,id:String(o.g.id||"").slice(0,60)}:null,best:Math.max(0,Math.min(99,+o.best||0)),de:typeof o.de==="string"?o.de.slice(0,12):"",da:typeof o.da==="string"?o.da.slice(0,12):""}}
function jhScrSet(o){try{store.set("jhScreen",o)}catch(e){}}
const jhScrDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
/* 一方的大子（車馬炮）分數 */
function jhScrBig(b,side){let s=0;for(const p of b){if(!p)continue;const red=p===p.toUpperCase();if((side==="r")!==red)continue;s+=JH_SCR_VAL[p.toUpperCase()]||0}return s}

/* ---- 🐎 雙馬守中宮 ---- */
function jhScrGuardCard(){const G=jhScrGet();
  sheet(jhL("🐎 石馬・雙馬守中宮","🐎 Stone horses · Guard the palace"),b=>{
    b.innerHTML=`<p>${esc(jhL("對方擺出中炮過河車，車炮直衝你的中路。屏風馬的本事就是兩匹馬互相照應、守住中卒。","Red opens with the Central Cannon and a river-crossing chariot, charging at your center. The Screen Horses' art is two horses guarding each other and the central pawn."))}</p>
      <p class="muted">${esc(jhL("你執黑，從這個局面開始：","You play Black from this position: "))}${esc(jhScrCn(JH_SCR_GUARD.mv))}</p>
      <p>${esc(jhL(`🎯 走滿 ${JH_SCR_GUARD.limit} 步：不被將死、車馬炮不淨虧（換子不算）。`,`🎯 Make ${JH_SCR_GUARD.limit} moves without being mated or losing material in chariots, horses and cannons (even trades are fine).`))}</p>
      ${G.g?`<p class="muted">${esc(jhL("✔ 已經守住過一次，再守只記紀錄。","✔ Already held once; replays only count in your record."))}</p>`:G.best?`<p class="muted">${esc(jhL(`目前最多守了 ${G.best} 步。`,`Best so far: ${G.best} moves.`))}</p>`:""}
      <div class="jh-actions"><button class="btn" id="jhScrGo">${esc(jhL("開始守中宮","Start"))}</button></div>`;
    b.querySelector("#jhScrGo").onclick=()=>{try{closeSheet()}catch(e){}jhScrGuardStart()}})}
function jhScrCn(mv){try{const C=window.XQCore;let b=C.parseFen(C.START.split(" ")[0]);const o=[];
    for(const u of mv.split(" ")){const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4)),cn=C.notate(b,f,t);o.push(typeof oscEn==="function"&&oscEn()&&typeof i18nWxf==="function"?(i18nWxf(cn)||cn):cn);b=C.make(b,f,t)}
    return o.join(" ")}catch(e){return mv}}
function jhScrGuardStart(){if(typeof jStart!=="function")return;const lv=typeof parkNpcLv==="function"?parkNpcLv():3;
  jStart(JH_SCR_J,{human:"b",level:lv,journey:JH_SCR_J,lv:{fen:JH_SCR_GUARD.fen,turn:JH_SCR_GUARD.turn}},fresh=>{
    const P=store.get("jPending",null);if(P&&P.id===JH_SCR_J&&!P.jhg){P.jhg={limit:JH_SCR_GUARD.limit};store.set("jPending",P)}
    location.hash="#/journey/play";
    if(fresh)setTimeout(()=>{try{toast(jhL("🐎 溫若蘅：「別急著反擊，兩匹馬先站穩。」","🐎 Wen Ruoheng: \"Don't rush to strike back. Let the two horses stand firm first.\""))}catch(e){}},500)})}
/* 這一盤是不是守中宮、走到哪了 */
function jhScrGuardOf(st){const P=store.get("jPending",null);return P&&P.id===JH_SCR_J&&P.jhg&&st&&P.game===st.id?P:null}
function jhScrGuardEval(st){const C=window.XQCore,b0=C.parseFen(JH_SCR_GUARD.fen),b=Array.isArray(st.board)?st.board:b0;   /* 對局狀態給的是 board 陣列（local.js），沒有 fen */
  const lostB=jhScrBig(b0,"b")-jhScrBig(b,"b"),lostR=jhScrBig(b0,"r")-jhScrBig(b,"r");
  return{n:(st.moves||[]).filter(m=>m.by===st.human).length,net:lostB-lostR}}
function jhScrGuardFin(st,P,ok,why){store.set("jPending",null);try{if(typeof rsFin==="function")rsFin(st.id)}catch(e){}
  const G=jhScrGet(),E=jhScrGuardEval(st);G.best=Math.max(G.best,Math.min(E.n,JH_SCR_GUARD.limit));let xp=0;
  if(ok&&!G.g){G.g={t:Date.now(),id:String(st.id||"").slice(0,60)};try{const cl=store.get("oscClaim",{})||{};if(!cl["guard:screen"]){cl["guard:screen"]=Date.now();xp=20;store.set("oscClaim",cl)}}catch(e){}}
  jhScrSet(G);if(xp&&typeof addXP==="function")try{addXP(xp,jhL("雙馬守中宮","Guard the palace"),"guard:"+st.id)}catch(e){}
  toast(ok?jhL(`🐎 守住了！走滿 ${JH_SCR_GUARD.limit} 步，中宮沒破`,`🐎 Held! ${JH_SCR_GUARD.limit} moves and the palace stands`):why);
  setTimeout(()=>{if(typeof navKey==="function"&&navKey(location.hash)==="/journey/play")location.hash="#/jianghu/hall/screen"},1800)}
/* 對局頁每次更新都會呼叫 lvWatch（08b-cpugame）：包一層，守中宮的盤在這裡判定 */
try{if(typeof lvWatch==="function"&&!lvWatch.jhScr){const w0=lvWatch;lvWatch=function(st,v){const P=jhScrGuardOf(st);
    if(P&&!st.result){try{const E=jhScrGuardEval(st);
        if(E.net>=JH_SCR_GUARD.lose)return jhScrGuardFin(st,P,false,jhL("💥 大子被吃虧了，中宮沒守住。再試一次！","💥 You lost material. The palace fell. Try again!"));
        if(E.n>=JH_SCR_GUARD.limit&&st.turn!==st.human)return jhScrGuardFin(st,P,true)}catch(e){}return}
    return w0.apply(this,arguments)};lvWatch.jhScr=1}}catch(e){}
/* 沒守滿就分出勝負（被將死、認輸）：照常結算對局修為，另外記最多守了幾步 */
try{if(typeof journeyGameEnd==="function"&&!journeyGameEnd.jhScr){const g0=journeyGameEnd;journeyGameEnd=function(st){let P=null;try{P=st&&st.result?jhScrGuardOf(st):null}catch(e){}
    const r=g0.apply(this,arguments);if(P)try{const G=jhScrGet(),E=jhScrGuardEval(st);G.best=Math.max(G.best,Math.min(E.n,JH_SCR_GUARD.limit));jhScrSet(G);
      setTimeout(()=>toast(st.result.w===st.human?jhL("🐎 直接贏下來了！不過守中宮要走滿 10 步才算，再來一次吧","🐎 You won outright! The trial needs 10 moves held, though. Try again"):jhL(`🐎 中宮被攻破了（守了 ${E.n} 步）`,`🐎 The palace fell after ${E.n} moves`)),1500)}catch(e){}
    return r};journeyGameEnd.jhScr=1}}catch(e){}
try{if(typeof jName==="function"&&!jName.jhScr){const n0=jName;jName=function(j){if(j===JH_SCR_J)return jhL("屏風馬門・雙馬守中宮","Screen Horses · Guard the palace");return n0.apply(this,arguments)};jName.jhScr=1}}catch(e){}

/* ---- 題庫（兩個小 json，第一次用到才下載） ---- */
const JH_SCR_DATA={};
async function jhScrLoad(k){if(JH_SCR_DATA[k])return JH_SCR_DATA[k];
  try{const r=await fetch(`data/zmhall/screen-${k}.json?v=1122`);if(!r.ok)throw 0;const d=await r.json();if(!d||!Array.isArray(d.items)||!d.items.length)throw 0;return JH_SCR_DATA[k]=d.items}
  catch(e){return null}}
const jhScrHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
function jhScrBoardAt(mv,n){const C=window.XQCore;let b=C.parseFen(C.START.split(" ")[0]),last=null;
  for(const u of mv.slice(0,n)){const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));b=C.make(b,f,t);last={f,t}}return{b,last,turn:n%2?"b":"r"}}
function jhScrDayXP(k,why){const G=jhScrGet(),d=jhScrDay();if(G[k]===d)return 0;G[k]=d;jhScrSet(G);if(typeof addXP==="function")try{addXP(10,why,k+":"+d)}catch(e){}return 10}

/* ---- 📖 幫學童挑錯著 ---- */
async function jhScrErrata(i0){const L=await jhScrLoad("errata");if(!L){toast(jhL("課堂的題目還在準備，晚一點再來。","The classroom exercises aren't ready yet. Come back later."));return}
  const C=window.XQCore,i=i0!=null?i0%L.length:jhScrHash(jhScrDay())%L.length,q=L[i];let n=0,stage=0,sel=-1;   /* 從開局擺好的盤面開始一步一步看，不能一打開就停在錯的那一步 */
  sheet(jhL("📖 女塾課堂・幫學童挑錯著","📖 Classroom · Find the slip"),b=>{
    b.innerHTML=`<p id="jhEq">${esc(jhL("一位學童照本派的開局課下了這一盤，執黑的她有一步走錯了。用「‹ ›」一步一步看，找到那一步就按「就是這步」。","A pupil played this game from our opening lessons. Playing Black, she slipped once. Step through with ‹ ›, then tap \"This one\" on the slip."))}</p>
      <div id="jhEb" class="jh-scr-bd"></div><p id="jhEn" class="muted" style="text-align:center;margin:4px 0"></p>
      <div class="jh-actions" id="jhEa"><button class="btn ghost" id="jhEp">‹</button><button class="btn ghost" id="jhEx">›</button><button class="btn" id="jhEk">${esc(jhL("就是這步","This one"))}</button></div>
      <p id="jhEs" class="jh-mate-say" style="display:none"></p>
      <div class="jh-actions"><button class="jh-link" id="jhEnew">${esc(jhL("換一題","Another one"))}</button></div>`;
    const $=s=>b.querySelector(s);let bd=null;
    const show=()=>{if(stage===0){const p=jhScrBoardAt(q.mv,n);bd.draw(p.b,{flip:true,last:p.last});const u=q.mv[n-1];
        $("#jhEn").textContent=n?jhL(`第 ${n}／${q.mv.length} 手：`,`Move ${n}/${q.mv.length}: `)+(n?jhScrCn1(q.mv,n):""):""}
      else{const p=jhScrBoardAt(q.mv,q.wrong);$("#jhEn").textContent="";bd.draw(p.b,{flip:true,last:p.last,...(sel>=0?{sel,targets:C.legal(p.b,"b").filter(([f])=>f===sel).map(z=>z[1])}:{})})}};
    const say=t=>{const s=$("#jhEs");s.style.display="";s.textContent=t};
    const tap=x=>{if(stage!==1)return;const p=jhScrBoardAt(q.mv,q.wrong),Lg=C.legal(p.b,"b");
      if(sel>=0&&Lg.some(([f,t])=>f===sel&&t===x)){const u=C.iccs(sel,x);sel=-1;
        if((q.ok||[q.best]).includes(u)){stage=2;const nb=C.make(p.b,C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4)));bd.draw(nb,{flip:true,last:{f:C.parseSq(u.slice(0,2)),t:C.parseSq(u.slice(2,4))}});
          const xp=jhScrDayXP("de",jhL("女塾課堂","Classroom"));say(jhL(`對！${q.why||""}${xp?`（修為 +${xp}）`:""}`,`Right! ${jhT(q.why||"")}${xp?` (+${xp} XP)`:""}`));try{vibrate([10,30,10])}catch(e){}return}
        say(jhL("這樣走也不太好。想想課上教的：屏風馬要先站穩。","Not quite. Remember the lesson: the Screen Horses stand firm first."));show();return}
      sel=Lg.some(([f])=>f===x)?x:-1;show()};
    bd=Board(tap);$("#jhEb").append(bd.svg);
    $("#jhEp").onclick=()=>{if(stage===0&&n>0){n--;show()}};$("#jhEx").onclick=()=>{if(stage===0&&n<q.mv.length){n++;show()}};
    $("#jhEk").onclick=()=>{if(stage!==0)return;if(n-1===q.wrong){stage=1;$("#jhEa").style.display="none";$("#jhEq").textContent=jhL("找到了！這一步之前，換你替她走一步更好的。","Found it! Now play the better move in her place.");say(jhL("點黑方的子，再點要去的地方。","Tap a black piece, then where it should go."));show()}
      else say(n%2?jhL("這一步沒問題，再找找。","That move is fine. Keep looking."):jhL("這是紅方走的，要找黑方（學童）的那一步。","That's Red's move. Find Black's (the pupil's) slip."))};
    $("#jhEnew").onclick=()=>{try{closeSheet()}catch(e){}setTimeout(()=>jhScrErrata(i+1+jhScrHash(Date.now())%Math.max(1,L.length-1)),250)};
    show()})}
function jhScrCn1(mv,n){try{const C=window.XQCore,p=jhScrBoardAt(mv,n-1),u=mv[n-1],cn=C.notate(p.b,C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4)));return typeof oscEn==="function"&&oscEn()&&typeof i18nWxf==="function"?(i18nWxf(cn)||cn):cn}catch(e){return mv[n-1]}}
/* 課堂：原本的開局課（拜師）＋挑錯著 */
function jhScrStudy(){sheet(jhL("📖 女塾課堂","📖 Classroom"),b=>{
  b.innerHTML=`<p class="muted">${esc(jhL("溫若蘅在這裡教女童識字、算帳、下棋。","Wen Ruoheng teaches girls to read, keep accounts and play chess here."))}</p>
    <div class="jh-actions"><button class="btn" id="jhSl">${esc(jhL("📖 上開局課","📖 Opening lessons"))}</button><button class="btn ghost" id="jhSe">${esc(jhL("🖌 幫學童挑錯著","🖌 Find the pupil's slip"))}</button></div>`;
  b.querySelector("#jhSl").onclick=()=>{try{closeSheet()}catch(e){}if(typeof jhHallStudy==="function")jhHallStudy("screen")};
  b.querySelector("#jhSe").onclick=()=>{try{closeSheet()}catch(e){}setTimeout(()=>jhScrErrata(),250)}})}

/* ---- 🧮 算盤・替棋局算帳 ---- */
async function jhScrAbacus(){const L=await jhScrLoad("abacus");if(!L){toast(jhL("算盤的題目還在準備，晚一點再來。","The abacus puzzles aren't ready yet. Come back later."));return}
  const C=window.XQCore,s0=jhScrHash(jhScrDay()+"|"+Date.now()),Q=[0,1,2].map(k=>L[(s0+k*7919)%L.length]).filter((x,i,a)=>a.indexOf(x)===i);let qi=0,right=0;
  sheet(jhL("🧮 算盤・替棋局算帳","🧮 Abacus · Weigh the position"),b=>{const bd=Board();
    b.innerHTML=`<p id="jhAq"></p><div id="jhAb" class="jh-scr-bd"></div>
      <div class="jh-actions" id="jhAa"><button class="btn ghost" data-a="r">${esc(jhL("紅優","Red better"))}</button><button class="btn ghost" data-a="=">${esc(jhL("均勢","Even"))}</button><button class="btn ghost" data-a="b">${esc(jhL("黑優","Black better"))}</button></div>
      <p id="jhAs" class="jh-mate-say" style="display:none"></p><div class="jh-actions"><button class="btn" id="jhAn" style="display:none"></button></div>`;
    const $=s=>b.querySelector(s);$("#jhAb").append(bd.svg);
    const lbl={r:jhL("紅優","Red is better"),"=":jhL("均勢","Even"),b:jhL("黑優","Black is better")};
    const show=()=>{const q=Q[qi],p=String(q.fen).split(" ");bd.draw(C.parseFen(p[0]),{});$("#jhAq").textContent=jhL(`第 ${qi+1}／${Q.length} 題：撥一撥算盤，這盤誰佔上風？（輪${p[1]==="b"?"黑":"紅"}走）`,`${qi+1}/${Q.length}: Who stands better? (${p[1]==="b"?"Black":"Red"} to move)`);
      $("#jhAa").style.display="";$("#jhAs").style.display="none";$("#jhAn").style.display="none"};
    b.querySelectorAll("[data-a]").forEach(x=>x.onclick=()=>{const q=Q[qi],ok=x.dataset.a===q.ans;if(ok)right++;$("#jhAa").style.display="none";
      const m=q.mat||{},why=q.why==="material"?jhL("子力就差在這裡。","The material tells the story."):q.why==="position"?jhL("子力差不多，差在子的位置與攻勢。","Material is close; it's about piece placement and attack."):jhL("兩邊都撐得住。","Both sides hold.");
      const s=$("#jhAs");s.style.display="";s.textContent=(ok?jhL("✔ 算對了。","✔ Correct. "):jhL(`✘ 答案是${lbl[q.ans]}。`,`✘ It's: ${lbl[q.ans]}. `))+jhL(`子力帳：紅 ${m.r} 對 黑 ${m.b}。`,`Material: Red ${m.r}, Black ${m.b}. `)+why;
      const nb=$("#jhAn");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("算完了","Done");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;show();return}const xp=right===Q.length?jhScrDayXP("da",jhL("算盤算帳","Abacus")):0;
        s.textContent=jhL(`這一輪算對 ${right}／${Q.length} 題。${xp?`全對，修為 +${xp}`:""}`,`${right}/${Q.length} correct.${xp?` All right: +${xp} XP`:""}`);nb.style.display="none"}});
    show()})}

/* ---- 門內頁：換標籤、加石馬與算盤兩個入口 ---- */
function jhScrHall(v,sid){if(sid!=="screen")return;const H=JH_HALL.screen,P=v&&v.querySelector(".jh-hall");if(!H||!P)return;
  const img=P.querySelector("img");if(img)img.alt=jhL("屏風馬門門內：牌坊山門、前院、堂前一對石馬的課堂，兩側長迴廊，最上面是掌門大廳","Inside the Screen Horses: an archway gate, the front yard, a classroom with two stone horses, long side galleries, and the master's hall at the top");
  const set=(k,label,go)=>{const x=P.querySelector(`.jh-hall-spot[data-k="${k}"]`);if(!x)return;x.innerHTML=`<b>${esc(label)}</b>`;if(go)x.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}go()}};
  set("study",jhL("📖 女塾課堂","📖 Classroom"),jhScrStudy);
  set("gate",jhL("‹ 出牌坊回十州棋館","‹ Out the gate to the Ten Prefectures"));
  const before=P.querySelector(".jh-hall-spot");
  const add=(k,label,go)=>{const p=H.extra[k];if(!p)return;const b=document.createElement("button");b.type="button";b.className="shp-spot jh-hall-spot";b.dataset.k=k;b.style.cssText=jhHallPc(p);b.innerHTML=`<b>${esc(label)}</b>`;
    b.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}go()};P.insertBefore(b,before)};
  add("horse",jhL("🐎 石馬・雙馬守中宮","🐎 Stone horses · Guard"),jhScrGuardCard);
  add("abacus",jhL("🧮 算盤","🧮 Abacus"),jhScrAbacus)}
/* 包在 07z9b 所有包裝的外層：門內頁畫完（門人、走路都掛好前）補上；走路是圖載好才掛，這時新入口已經在了 */
try{if(typeof JhHall==="function"&&!JhHall.jhScr){const h0=JhHall;JhHall=function(v,sid){const r=h0.apply(this,arguments);try{jhScrHall(v,sid)}catch(e){}return r};JhHall.jhScr=1}}catch(e){}
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhScrCss";s.textContent=`
.jh-scr-bd{max-width:340px;margin:6px auto}.jh-scr-bd svg{display:block;width:100%;height:auto}`;
  if(!document.getElementById("jhScrCss"))document.head.append(s)})();
