/* ---------- W48 起馬門門內玩法「驛馬繞險路」（找路）----------
   開發者 11/22 選八派門內玩法第一批：過宮炮、仕角炮、起馬；定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 6 節＋_Claude審稿.md 第 7 點。
   掌門褚子驍是徐州運河驛站馬伕。盤上一匹紅傌、紅帥、黑將和幾顆黑子，指定一格終點；玩家一步一步把傌牽過去，最少步數、途中不停在險格。
   險格（審稿第 7 點）：黑方不動，只算「傌停在那一格時，黑子能不能直接吃到它」；途中每一站和終點都不能是險格。傌照真的走法（蹩馬腿用 core.js legal），不吃子。
   最短步數用廣度優先搜尋算；題目由程式產生（同一天、同一級固定三題），不用引擎。
     初級：黑子 1～2 顆、最短 2～3 步；中級：2～3 顆、3～4 步；高級：3～5 顆、4～5 步。
   終點用 Board 的 hint 藍框標（PR #39 審查：原本用 last:{f:goal,t:goal}，01-board 只在 f!==t 時才畫，終點根本看不到）。
   小學生提示：「⚠ 亮出險格」一鍵把黑子盯著的格子框出來。
   走到險格＝當場說明哪顆黑子吃得到、這題重來；走到終點但比最短多走＝說明最短幾步、算沒過。
   修為：一輪 3 題都用最短步數走到，每天 +10（只給一次）。門內頁入口（拴馬樁）等起馬門門內圖出好再接；這裡先提供 jhQimaOpen()。 */
const JH_QIMA_LV=[
  {k:"easy",zh:"初級",en:"Easy",foe:[1,2],d:[2,3]},
  {k:"mid",zh:"中級",en:"Medium",foe:[2,3],d:[3,4]},
  {k:"hard",zh:"高級",en:"Hard",foe:[3,5],d:[4,5]}];
const JH_QIMA_FOE=["r","n","c","p"];   /* 黑方會擺的子：車、馬、砲、卒 */
const JH_QIMA_CAP={r:2,n:2,c:2,p:5};   /* 每種最多幾顆（真實棋子數） */
function jhQimaGet(){let o=null;try{o=store.get("jhQima",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{lv:JH_QIMA_LV.some(x=>x.k===o.lv)?o.lv:"easy",d:typeof o.d==="string"?o.d.slice(0,12):""}}
function jhQimaSet(o){try{store.set("jhQima",o)}catch(e){}}
const jhQimaHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
const jhQimaDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
/* 傌從 at 能走到哪些空格（照真的走法，不吃子） */
function jhQimaSteps(b,at){const C=window.XQCore;if(b[at]!=="N")return[];return C.legal(b,"r").filter(([f,t])=>f===at&&!b[t]).map(z=>z[1])}
/* 傌搬到 to 的盤面 */
function jhQimaMove(b,from,to){const x=b.slice();x[to]=x[from];x[from]=null;return x}
/* 險格：傌停在 s 時，黑子能直接吃到它 */
function jhQimaDanger(b,s){const C=window.XQCore;return C.legal(b,"b").some(([f,t])=>t===s&&b[t]==="N")}
function jhQimaAttackers(b,s){const C=window.XQCore;return C.legal(b,"b").filter(([f,t])=>t===s).map(z=>z[0])}
/* 最短安全路線：回傳步數（到不了＝-1）；路上每一站、終點都不能是險格 */
function jhQimaShortest(b,from,goal,max){const seen=new Map([[from,0]]),q=[[from,b]];
  while(q.length){const [at,bd]=q.shift(),d=seen.get(at);if(at===goal)return d;if(d>=(max||8))continue;
    for(const t of jhQimaSteps(bd,at)){if(seen.has(t))continue;const nb=jhQimaMove(bd,at,t);if(jhQimaDanger(nb,t))continue;seen.set(t,d+1);q.push([t,nb])}}
  return-1}
/* 出一題：照種子擺子，直到符合這一級（最短步數、黑子數、局面合法：雙方都沒被將軍） */
function jhQimaMake(L,seed){const C=window.XQCore;let h=jhQimaHash("qima:"+seed);const R=()=>{h=jhQimaHash(h+"|");return h};
  for(let tries=0;tries<400;tries++){const b=Array(90).fill(null);
    const bk=[3,4,5][R()%3],rk=[84,85,86][R()%3];b[bk]="k";b[rk]="K";
    const free=()=>{for(let k=0;k<40;k++){const s=R()%90;if(!b[s])return s}return-1};
    const N=free();if(N<0)continue;b[N]="N";
    const nf=L.foe[0]+R()%(L.foe[1]-L.foe[0]+1);let ok=true;
    for(let i=0;i<nf;i++){let p=JH_QIMA_FOE[R()%JH_QIMA_FOE.length];
      /* W73（11/23 Pikafish 棋理驗證）：每顆子各自隨機挑種類，約 5% 題目出現 3～5 隻砲、3～4 隻馬或車；照真實子數，車馬砲各 ≤2、卒 ≤5，額滿就換下一種 */
      for(let k=0;k<JH_QIMA_FOE.length&&b.filter(v=>v===p).length>=JH_QIMA_CAP[p];k++)p=JH_QIMA_FOE[(JH_QIMA_FOE.indexOf(p)+1)%JH_QIMA_FOE.length];
      let s=free();if(s<0){ok=false;break}
      if(p==="p"&&!(s>=27&&s<=44&&(s%9)%2===0)&&!(s>=45))s=27+2*(R()%5);   /* 卒：在自己的卒林線或過了河 */
      if(b[s]){ok=false;break}b[s]=p}
    if(!ok||C.inCheck(b,"r")||C.inCheck(b,"b"))continue;
    if(jhQimaDanger(b,N))continue;   /* 起點本身不能是險格 */
    const goal=free();if(goal<0||goal===N)continue;
    const d=jhQimaShortest(b,N,goal,L.d[1]+1);if(d<L.d[0]||d>L.d[1])continue;
    const g2=jhQimaMove(b,N,goal);if(jhQimaDanger(g2,goal))continue;
    return{b,from:N,goal,d,seed}}
  return null}
function jhQimaRound(L,day){const o=[];for(let i=0;i<3;i++){const q=jhQimaMake(L,day+":"+L.k+":"+i);if(q)o.push(q)}return o}
function jhQimaDayXP(){const G=jhQimaGet(),d=jhQimaDay();if(G.d===d)return 0;G.d=d;jhQimaSet(G);if(typeof addXP==="function")try{addXP(10,jhL("驛馬繞險路","Courier's path"),"qima:"+d)}catch(e){}return 10}
const JH_QIMA_NM={r:"車",n:"馬",c:"砲",p:"卒",k:"將"};

function jhQimaOpen(lv0){const G=jhQimaGet(),L=JH_QIMA_LV.find(x=>x.k===(lv0||G.lv))||JH_QIMA_LV[0],Q=jhQimaRound(L,jhQimaDay());
  if(!Q.length){toast(jhL("驛站的路還沒排好，等一下再試。","The courier routes aren't ready. Try again shortly."));return}
  G.lv=L.k;jhQimaSet(G);let qi=0,best=0;
  sheet(jhL("🐴 拴馬樁・驛馬繞險路","🐴 Hitching post · Courier's path"),b=>{
    b.innerHTML=`<p class="muted">${esc(jhL("褚子驍：「驛馬趕路最怕踩進陷阱，挑條安全又近的路，把傌牽到指定地點！」","Chu Zixiao: \"A courier horse fears traps most. Pick a safe, short road and lead the horse to the spot!\""))}</p>
      <div class="jh-gp-lv">${JH_QIMA_LV.map(x=>`<button class="btn ${x.k===L.k?"":"ghost"}" data-lv="${x.k}">${esc(jhL(x.zh,x.en))}</button>`).join("")}</div>
      <p id="jhQq" class="jh-gp-q"></p><div id="jhQb" class="jh-scr-bd"></div>
      <div class="jh-actions"><button class="btn ghost" id="jhQh">${esc(jhL("⚠ 亮出險格","⚠ Show danger"))}</button><button class="btn ghost" id="jhQr">${esc(jhL("↺ 重來","↺ Retry"))}</button><button class="btn" id="jhQn" style="display:none"></button></div>
      <p id="jhQs" class="jh-mate-say" style="display:none"></p>`;
    const $=s=>b.querySelector(s);let cur=null,bd=null,at=-1,steps=0,done=false,hint=false;const brd=Board(x=>tap(x));$("#jhQb").append(brd.svg);
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{try{closeSheet()}catch(e){}setTimeout(()=>jhQimaOpen(x.dataset.lv),250)});
    const say=t=>{const s=$("#jhQs");s.style.display=t?"":"none";s.textContent=t||""};
    const danger=()=>{const o=[];for(let s=0;s<90;s++){if(bd[s]&&s!==at)continue;const nb=s===at?bd:jhQimaMove(bd,at,s);if(jhQimaDanger(nb,s))o.push(s)}return o};
    const draw=()=>{const nx=done?[]:jhQimaSteps(bd,at);brd.draw(bd,{sel:at,targets:hint?[...new Set([...nx,...danger()])]:nx,hint:[cur.goal]})};
    const reset=()=>{bd=cur.b.slice();at=cur.from;steps=0;done=false;$("#jhQn").style.display="none";draw()};
    const start=()=>{cur=Q[qi];hint=false;say("");reset();
      $("#jhQq").textContent=jhL(`第 ${qi+1}／${Q.length} 題：把傌牽到亮框那一格（最少 ${cur.d} 步），點傌能去的格子一步一步走`,`${qi+1}/${Q.length}: lead the horse to the highlighted square (${cur.d} moves at best). Tap where it can go, one step at a time`)};
    const tap=x=>{if(done||x===at||!jhQimaSteps(bd,at).includes(x))return;bd=jhQimaMove(bd,at,x);at=x;steps++;
      const A=jhQimaAttackers(bd,at);
      if(A.length){done=true;draw();brd.draw(bd,{sel:at,targets:A,hint:[cur.goal]});say(jhL(`停在會被吃的格子了：黑${JH_QIMA_NM[bd[A[0]]]||"子"}吃得到這裡（框起來的那顆）。按「重來」再試。`,`That square is attacked: the boxed black piece can take the horse. Tap Retry.`));return}
      if(at!==cur.goal){draw();say(jhL(`走了 ${steps} 步。`,`${steps} move${steps>1?"s":""} so far.`));return}
      done=true;draw();const okD=steps===cur.d;if(okD)best++;
      say(okD?jhL("走得漂亮！避開險格又準時送到。","Well ridden! Safe and on time."):jhL(`送到了，但走了 ${steps} 步；最短只要 ${cur.d} 步。按「重來」再找更近的路。`,`Delivered, but in ${steps} moves; the shortest is ${cur.d}. Tap Retry to find a shorter road.`));
      const nb=$("#jhQn");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("收工","Finish");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;start();return}nb.style.display="none";const xp=best===Q.length?jhQimaDayXP():0;
        say(jhL(`這一輪最短步數送到 ${best}／${Q.length} 題。${xp?`全對，修為 +${xp}`:""}`,`${best}/${Q.length} by the shortest road.${xp?` All right: +${xp} XP`:""}`))}};
    $("#jhQh").onclick=()=>{hint=!hint;draw()};$("#jhQr").onclick=()=>{if(!cur)return;if(done&&at===cur.goal&&steps===cur.d)return;reset();say("")};
    start()})}
