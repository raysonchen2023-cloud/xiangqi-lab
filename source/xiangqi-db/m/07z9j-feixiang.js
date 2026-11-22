/* ---------- W48-S8 飛相門門內玩法「築堤擺陣形」（擺陣）----------
   開發者 11/22：「把門派任務分給其他三個人平行做完剩下的門派」；Windows Claude 1 派給 iMac Claude 2。
   定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 5 節＋_Claude審稿.md（最少步數用 BFS 在 CI 驗）。
   掌門孟懷瑾是泗州致仕縣學教諭：「治學先立根基，布陣先穩陣腳，用最少步數把陣形擺出來。」
   座標（格號＝列×9＋行，列 0 在黑方底線）：帥 85、黑將 3 或 5；目標格例如相 67（相三進五）、仕 76、兵 49（過河前一格）、傌 65／69、炮 64／70。
   盤面：紅帥、黑將（黑方不動）和幾顆紅子；虛線框是目標陣形。玩家一次走一顆紅子（照真的走法、不吃子），用最少步數把每顆子擺到同種子的目標格。
     初級：3 子（相仕兵）、最少 2～3 步；中級：4～5 子（加傌炮）、3～4 步；高級：5～6 子、4～6 步（要避開繞路）。
   題目由程式產生：從目標陣形倒著走幾步（每一步都要是正走合法），再用 IDA* 算真正的最少步數，落在這一級的範圍才出；同一天同一級固定三題。
   提示：顯示已走步數、標出「離目標最近、還沒到位的那顆子」；同一顆子剛走過來又走回去會擋下來並說明（防來回走）。
   修為：一輪 3 題都用最少步數擺成，每天 +10（只給一次）。門內頁入口（水池邊講經亭）等飛相門門內圖出好再接；這裡先提供 jhFeixiangOpen()。 */
const JH_FX_LV=[
  {k:"easy",zh:"初級",en:"Easy",d:[2,3],tpl:[{B:[67],A:[76],P:[49]},{B:[67],A:[76],P:[51]},{B:[67],A:[76],P:[47]},{B:[83],A:[76],P:[49]}]},
  {k:"mid",zh:"中級",en:"Medium",d:[3,4],tpl:[{B:[67],A:[76],P:[49],N:[65]},{B:[67],A:[76],N:[69],C:[64]},{B:[67],A:[76],P:[49],N:[65],C:[70]},{B:[67,87],A:[76],N:[65]}]},
  {k:"hard",zh:"高級",en:"Hard",d:[4,6],tpl:[{B:[67,83],A:[76,86],N:[65]},{B:[67],A:[76],P:[49],N:[65],C:[70]},{B:[67,87],A:[76],N:[69],C:[64],P:[47]},{B:[67,83],A:[76],N:[65,69]}]}];
const JH_FX_NM={B:"相",A:"仕",P:"兵",N:"傌",C:"炮"};
const JH_FX_RK=85,JH_FX_BK=[3,5];
function jhFxGet(){let o=null;try{o=store.get("jhFeixiang",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{lv:JH_FX_LV.some(x=>x.k===o.lv)?o.lv:"easy",d:typeof o.d==="string"?o.d.slice(0,12):""}}
function jhFxSet(o){try{store.set("jhFeixiang",o)}catch(e){}}
const jhFxHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
const jhFxDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
/* 目標陣形 → [{s:格號, p:子}] */
function jhFxTargets(tpl){const o=[];for(const p in tpl)for(const s of tpl[p])o.push({s,p});return o}
/* 紅方可以動的子（不含帥）走一步：照 core.js 的合法著法、不吃子 */
function jhFxMoves(b){const C=window.XQCore;return C.legal(b,"r").filter(([f,t])=>b[f]&&b[f]!=="K"&&!b[t])}
function jhFxMove(b,f,t){const x=b.slice();x[t]=x[f];x[f]=null;return x}
function jhFxDone(b,T){return T.every(x=>b[x.s]===x.p)}
/* 估計值（IDA* 用，不會高估）：每一種子在「只有兩個將帥的空盤」上走到目標格的步數，同種子取最好的配對 */
const JH_FX_DIST={};
function jhFxDist(p,from){const C=window.XQCore,k=p+from;if(JH_FX_DIST[k])return JH_FX_DIST[k];
  const d=new Array(90).fill(99);d[from]=0;let q=[from];
  while(q.length){const nq=[];for(const s of q){const b=new Array(90).fill(null);b[JH_FX_RK]="K";b[JH_FX_BK[0]]="k";if(s!==JH_FX_RK&&s!==JH_FX_BK[0])b[s]=p;else continue;
      for(const [f,t] of C.legal(b,"r"))if(f===s&&!b[t]&&d[t]>d[s]+1){d[t]=d[s]+1;nq.push(t)}}q=nq}
  return JH_FX_DIST[k]=d}
function jhFxH(b,T){let h=0;const by={};T.forEach(x=>(by[x.p]=by[x.p]||[]).push(x.s));
  for(const p in by){const at=[];b.forEach((v,i)=>{if(v===p)at.push(i)});const tg=by[p];
    if(at.length!==tg.length)return 99;
    if(at.length===1){h+=jhFxDist(p,at[0])[tg[0]];continue}
    let best=99;const perm=(i,used,sum)=>{if(sum>=best)return;if(i===at.length){best=sum;return}for(let j=0;j<tg.length;j++)if(!(used>>j&1))perm(i+1,used|1<<j,sum+jhFxDist(p,at[i])[tg[j]])};perm(0,0,0);h+=best}
  return h}
/* 最少步數（IDA*）：回傳步數；超過 max 回 -1 */
function jhFxSolve(b0,T,max){let bound=jhFxH(b0,T);if(bound>=99)return-1;let nodes=0;
  const dfs=(b,g,last)=>{const f=g+jhFxH(b,T);if(f>bound)return f;if(jhFxDone(b,T))return-1;if(++nodes>400000)return 999;let min=99;
    for(const [s,t] of jhFxMoves(b)){if(last&&s===last[1]&&t===last[0])continue;const r=dfs(jhFxMove(b,s,t),g+1,[s,t]);if(r===-1)return-1;if(r<min)min=r}
    return min};
  while(bound<=max){const r=dfs(b0,0,null);if(r===-1)return bound;if(r>=99)return-1;bound=r}
  return-1}
/* 倒著走一步：把 s 上的子放回某個空格 q，要能從 q 正走到 s */
function jhFxBack(b,s){const C=window.XQCore,o=[];for(let q=0;q<90;q++){if(b[q])continue;if(b[s]==="P"&&(q/9|0)>6)continue;   /* 兵不會出現在自己的兵線後面 */const x=b.slice();x[q]=x[s];x[s]=null;if(C.legal(x,"r").some(([f,t])=>f===q&&t===s))o.push(q)}return o}
/* 出一題：照種子挑模板、倒著走，最少步數落在這一級的範圍才出 */
function jhFxMake(L,seed){let h=jhFxHash("fx:"+seed);const R=()=>{h=jhFxHash(h+"|");return h};
  for(let tries=0;tries<60;tries++){const tpl=L.tpl[R()%L.tpl.length],T=jhFxTargets(tpl);
    const g=new Array(90).fill(null);g[JH_FX_RK]="K";const bk=JH_FX_BK[R()%2];g[bk]="k";T.forEach(x=>{g[x.s]=x.p});
    let b=g.slice(),ok=true;const steps=L.d[1]+1+R()%2;
    for(let i=0;i<steps;i++){const P=[];b.forEach((v,j)=>{if(v&&v!=="K"&&v!=="k")P.push(j)});let moved=false;
      for(let k=0;k<P.length&&!moved;k++){const s=P[(R()+k)%P.length],Q=jhFxBack(b,s);if(!Q.length)continue;const q=Q[R()%Q.length];b=jhFxMove(b,s,q);moved=true}
      if(!moved){ok=false;break}}
    if(!ok||jhFxDone(b,T)||window.XQCore.inCheck(b,"b")||window.XQCore.inCheck(b,"r"))continue;   /* 開局不能有人正被將軍 */
    const d=jhFxSolve(b,T,L.d[1]);if(d<L.d[0]||d>L.d[1])continue;
    return{b,T,d,seed}}
  return null}
function jhFxRound(L,day){const o=[];for(let i=0;i<3;i++){const q=jhFxMake(L,day+":"+L.k+":"+i);if(q)o.push(q)}return o}
function jhFxDayXP(){const G=jhFxGet(),d=jhFxDay();if(G.d===d)return 0;G.d=d;jhFxSet(G);if(typeof addXP==="function")try{addXP(10,jhL("築堤擺陣形","Build the formation"),"feixiang:"+d)}catch(e){}return 10}
/* 提示：還沒到位的子裡，離同種子空著的目標格最近的那一顆 */
function jhFxNearest(b,T){let best=null;for(let i=0;i<90;i++){const p=b[i];if(!p||!JH_FX_NM[p])continue;if(T.some(x=>x.s===i&&x.p===p))continue;
    for(const x of T){if(x.p!==p||b[x.s]===p)continue;const d=jhFxDist(p,i)[x.s];if(!best||d<best.d)best={at:i,to:x.s,d,p}}}
  return best}

function jhFeixiangOpen(lv0){const G=jhFxGet(),L=JH_FX_LV.find(x=>x.k===(lv0||G.lv))||JH_FX_LV[0],Q=jhFxRound(L,jhFxDay());
  if(!Q.length){toast(jhL("石堤的陣形還沒排好，等一下再試。","The formations aren't ready. Try again shortly."));return}
  G.lv=L.k;jhFxSet(G);let qi=0,best=0;
  sheet(jhL("🏯 講經亭・築堤擺陣形","🏯 Lecture pavilion · Build the formation"),b=>{
    b.innerHTML=`<p class="muted">${esc(jhL("孟懷瑾：「治學先立根基，布陣先穩陣腳，用最少步數把陣形擺出來。」","Meng Huaijin: \"Learning starts with foundations, and a formation with a firm base. Set it up in the fewest moves.\""))}</p>
      <div class="jh-gp-lv">${JH_FX_LV.map(x=>`<button class="btn ${x.k===L.k?"":"ghost"}" data-lv="${x.k}">${esc(jhL(x.zh,x.en))}</button>`).join("")}</div>
      <p id="jhFq" class="jh-gp-q"></p><div id="jhFb" class="jh-scr-bd"></div><p id="jhFn" class="muted" style="text-align:center;margin:4px 0"></p>
      <div class="jh-actions"><button class="btn ghost" id="jhFh">${esc(jhL("💡 提示","💡 Hint"))}</button><button class="btn ghost" id="jhFr">${esc(jhL("↺ 重來","↺ Retry"))}</button><button class="btn" id="jhFx" style="display:none"></button></div>
      <p id="jhFs" class="jh-mate-say" style="display:none"></p>`;
    const $=s=>b.querySelector(s);let cur=null,bd=null,sel=-1,steps=0,done=false,last=null,mark=-1;const brd=Board(x=>tap(x));$("#jhFb").append(brd.svg);
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{try{closeSheet()}catch(e){}setTimeout(()=>jhFeixiangOpen(x.dataset.lv),250)});
    const say=t=>{const s=$("#jhFs");s.style.display=t?"":"none";s.textContent=t||""};
    const left=()=>cur.T.filter(x=>bd[x.s]!==x.p).map(x=>JH_FX_NM[x.p]);
    const draw=()=>{const mv=sel>=0?jhFxMoves(bd).filter(([f])=>f===sel).map(z=>z[1]):[];
      const tg=sel>=0?cur.T.filter(x=>x.p===bd[sel]).map(x=>x.s):cur.T.map(x=>x.s);
      brd.draw(bd,{sel:sel>=0?sel:mark,targets:mv,hint:tg});
      const L2=left();$("#jhFn").textContent=jhL(`已走 ${steps} 步（最少 ${cur.d} 步）`,`${steps} move${steps===1?"":"s"} (best ${cur.d})`)+(L2.length&&!done?jhL(`｜還沒到位：${L2.join("、")}`,` · not yet placed: ${L2.length}`):"")};
    const reset=()=>{bd=cur.b.slice();sel=-1;steps=0;done=false;last=null;mark=-1;$("#jhFx").style.display="none";draw()};
    const start=()=>{cur=Q[qi];say("");reset();
      $("#jhFq").textContent=jhL(`第 ${qi+1}／${Q.length} 題：把紅子擺進虛線框（同種子的框都可以），最少 ${cur.d} 步。點一顆子，框會只留它能去的目標`,`${qi+1}/${Q.length}: move the red pieces into the dashed boxes (any box of the same kind), ${cur.d} moves at best. Tap a piece to see its own targets`)};
    const tap=x=>{if(done)return;mark=-1;
      if(sel>=0&&jhFxMoves(bd).some(([f,t])=>f===sel&&t===x)){
        if(last&&last[0]===x&&last[1]===sel){say(jhL("這顆子剛從那裡過來，走回去只是白費一步。","That piece just came from there. Going back wastes a move."));sel=-1;draw();return}
        bd=jhFxMove(bd,sel,x);last=[sel,x];sel=-1;steps++;
        if(!jhFxDone(bd,cur.T)){say("");draw();return}
        done=true;draw();const ok=steps===cur.d;if(ok)best++;
        say(ok?jhL("陣腳穩固，步數算得剛剛好！","A firm base, and not a move wasted!"):jhL(`陣形擺好了，但多走了 ${steps-cur.d} 步；先看哪顆子可以直接到位。按「重來」再試。`,`Formation set, but ${steps-cur.d} move${steps-cur.d>1?"s":""} too many. Look for pieces that can go straight in. Tap Retry.`));
        const nb=$("#jhFx");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("收工","Finish");
        nb.onclick=()=>{if(qi+1<Q.length){qi++;start();return}nb.style.display="none";const xp=best===Q.length?jhFxDayXP():0;
          say(jhL(`這一輪最少步數擺成 ${best}／${Q.length} 題。${xp?`全對，修為 +${xp}`:""}`,`${best}/${Q.length} in the fewest moves.${xp?` All right: +${xp} XP`:""}`))};
        return}
      sel=bd[x]&&JH_FX_NM[bd[x]]&&jhFxMoves(bd).some(([f])=>f===x)?x:-1;draw()};
    $("#jhFh").onclick=()=>{if(done)return;const n=jhFxNearest(bd,cur.T);sel=-1;mark=n?n.at:-1;draw();
      say(n?jhL(`已走 ${steps} 步。離目標最近的是${JH_FX_NM[n.p]}（框起來的那顆），最快 ${n.d} 步能到位。`,`${steps} moves so far. The closest is the highlighted piece: ${n.d} move${n.d>1?"s":""} from its box.`):"")};
    $("#jhFr").onclick=()=>{if(!cur)return;if(done&&steps===cur.d)return;reset();say("")};
    start()})}
