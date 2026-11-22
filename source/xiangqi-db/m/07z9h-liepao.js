/* ---------- W48-S5 列炮門門內玩法「擊板記譜局」（記譜）----------
   開發者 11/22「把門派任務分給其他三個人平行做完剩下的門派」；Windows Claude 1 派給 Windows Claude 2。
   定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 3 節＋_Claude審稿.md 第 1、5、6 點。
   掌門顏照秋是崑腔戲班鼓板師。鼓板一聲演一步列炮著法，一段演完蓋回這段開始的局面，玩家照原順序重走一遍。
   題目取自列炮門 22 課的主線（data/opening-school/opposite_cannon.json，ex.pre＋每個 mv 節點的 h 與回應 r），不用引擎；一律從開局第一步開始：
     審稿第 1 點：開局題不能用「剩幾顆子」分級，改用步數：初級 4 步、中級 6 步、高級 8 步；
     審稿第 6 點：太長記不住，拆段演，每段 3～4 步（初級一段 4 步、中級 3＋3、高級 4＋4）；鼓板響時標出這步動的是紅方還是黑方；
     審稿第 5 點：開場白用繁體「戲台」。
   同一輪 3 題取不同的開頭（4 步的開頭只有 5 種，不去重會常常同一題出兩次）。
   重走時只看得到「第幾步、輪哪一方」，看不到著法；走岔了不照走，說明是「動錯了子」還是「落點記錯」；同一步錯兩次就框出該動的子。
   一題算「一字不差」要整題沒走岔、沒按「再看一次」或「提示」。修為：一輪 3 題都一字不差，每天 +10（只給一次）。
   門內頁入口（戲台鼓架）等列炮門門內圖出好再接；這裡先提供 jhLiepaoOpen()。 */
const JH_LP_LV=[
  {k:"easy",zh:"初級",en:"Easy",n:4},
  {k:"mid",zh:"中級",en:"Medium",n:6},
  {k:"hard",zh:"高級",en:"Hard",n:8}];
const JH_LP_SID="opposite_cannon";
function jhLpGet(){let o=null;try{o=store.get("jhLiepao",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{lv:JH_LP_LV.some(x=>x.k===o.lv)?o.lv:"easy",d:typeof o.d==="string"?o.d.slice(0,12):""}}
function jhLpSet(o){try{store.set("jhLiepao",o)}catch(e){}}
const jhLpHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
const jhLpIdx=(h,n)=>{h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return Math.floor((h>>>0)/4294967296*n)};
const jhLpDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
/* 課程主線：每個例題 pre ＋ 一路照提示著法（h）與回應（r）走到底；去掉重複 */
function jhLpLines(D){const out=[],seen=new Set();
  for(const L of (D&&D.lessons)||[])for(const ex of L.ex||[]){const mv=[...(ex.pre||[])];let n=ex.root;
    while(n){if(n.k==="mv"&&n.ok&&n.ok[n.h]){const o=n.ok[n.h];mv.push(n.h);if(o.r)mv.push(o.r);n=o.n}else n=n.n}
    const k=mv.join(" ");if(mv.length&&!seen.has(k)){seen.add(k);out.push(mv)}}
  return out}
const jhLpStart=()=>{const C=window.XQCore;return C.parseFen(C.START.split(" ")[0])};
const jhLpSq=u=>{const C=window.XQCore;return[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))]};
/* 照主線走：回傳每一步的中文記法 */
function jhLpWalk(seq){const C=window.XQCore;let b=jhLpStart();const nt=[];for(const u of seq){const[f,t]=jhLpSq(u);nt.push(C.notate(b,f,t));b=C.make(b,f,t)}return nt}
/* 分段：4 步一段；6 步 3＋3；8 步 4＋4（審稿第 6 點：每段 3～4 步） */
function jhLpSegs(n){return n<=4?[[0,n]]:[[0,Math.ceil(n/2)],[Math.ceil(n/2),n]]}
/* 局面：走到第 i 步之前 */
function jhLpAt(seq,i){const C=window.XQCore;let b=jhLpStart();for(let k=0;k<i;k++){const[f,t]=jhLpSq(seq[k]);b=C.make(b,f,t)}return b}
/* 出一輪：主線取前 n 步、依開頭去重，用種子洗牌後取 3 題（不同開頭） */
function jhLpRound(lines,L,day){const seen=new Set(),pool=[];
  for(const l of lines){if(l.length<L.n)continue;const s=l.slice(0,L.n),k=s.join(" ");if(!seen.has(k)){seen.add(k);pool.push(s)}}
  pool.sort((a,b)=>a.join(" ")<b.join(" ")?-1:1);
  for(let k=pool.length-1;k>0;k--){const j=jhLpIdx(jhLpHash("lp:"+day+":"+L.k+"|"+k),k+1);[pool[k],pool[j]]=[pool[j],pool[k]]}
  return pool.slice(0,3).map(seq=>({seq,nt:jhLpWalk(seq),segs:jhLpSegs(seq.length)}))}
/* 判一步：玩家在第 i 步走 f→t。回傳 {ok, kind}：kind＝"piece"（動錯了子）、"to"（子對了、落點記錯） */
function jhLpJudge(q,i,f,t){const[F,T]=jhLpSq(q.seq[i]);if(f===F&&t===T)return{ok:true,kind:""};return{ok:false,kind:f===F?"to":"piece"}}
function jhLpDayXP(){const G=jhLpGet(),d=jhLpDay();if(G.d===d)return 0;G.d=d;jhLpSet(G);if(typeof addXP==="function")try{addXP(10,jhL("擊板記譜局","Clapper score"),"liepao:"+d)}catch(e){}return 10}
const jhLpSide=i=>i%2?"b":"r";

async function jhLiepaoOpen(lv0){const G=jhLpGet(),L=JH_LP_LV.find(x=>x.k===(lv0||G.lv))||JH_LP_LV[0];
  let D=null;try{D=typeof oscData==="function"?await oscData(JH_LP_SID):await (await fetch(`data/opening-school/${JH_LP_SID}.json`)).json()}catch(e){D=null}
  const Q=D?jhLpRound(jhLpLines(D),L,jhLpDay()):[];
  if(Q.length<3){toast(jhL("戲班還在調弦，等一下再試。","The troupe is still tuning up. Try again shortly."));return}
  G.lv=L.k;jhLpSet(G);let qi=0,right=0;
  sheet(jhL("🥁 戲台・擊板記譜局","🥁 Stage · Clapper score"),b=>{
    b.innerHTML=`<p class="muted">${esc(jhL("顏照秋：「鼓板一響戲台開鑼，著法記牢才不會亂了拍子，照譜走一遍！」","Yan Zhaoqiu: \"When the clapper sounds the show begins. Keep the moves in your head and you won't lose the beat. Play it back!\""))}</p>
      <div class="jh-gp-lv">${JH_LP_LV.map(x=>`<button class="btn ${x.k===L.k?"":"ghost"}" data-lv="${x.k}">${esc(jhL(x.zh,x.en))}</button>`).join("")}</div>
      <p id="jhLpQ" class="jh-gp-q"></p><div id="jhLpB" class="jh-scr-bd"></div><div id="jhLpT" class="jh-lp-beats"></div>
      <div class="jh-actions"><button class="btn ghost" id="jhLpA">${esc(jhL("🥁 再看一次","🥁 Watch again"))}</button><button class="btn ghost" id="jhLpH">${esc(jhL("💡 提示","💡 Hint"))}</button><button class="btn ghost" id="jhLpR">${esc(jhL("↺ 重來","↺ Retry"))}</button><button class="btn" id="jhLpN" style="display:none"></button></div>
      <p id="jhLpM" class="jh-mate-say" style="display:none"></p>`;
    const $=s=>b.querySelector(s),C=window.XQCore;
    let q=null,si=0,i=0,bd=null,sel=-1,phase="",tok=0,miss=0,peek=0,wrong=0,mark=-1,last=null,shown=-1;
    const brd=Board(x=>tap(x));$("#jhLpB").append(brd.svg);
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{tok++;try{closeSheet()}catch(e){}setTimeout(()=>jhLiepaoOpen(x.dataset.lv),250)});
    const say=t=>{const s=$("#jhLpM");s.style.display=t?"":"none";s.textContent=t||""};
    const seg=()=>q.segs[si];
    /* 拍子列：演的時候亮出記法（紅字紅方、黑字黑方）；重走時只標第幾步、輪哪一方 */
    const beats=()=>{const[a,z]=seg();let h="";
      for(let k=a;k<z;k++){const sd=jhLpSide(k),cls=`jh-lp-beat ${sd}${k<i||(phase==="show"&&k<=shown)?" on":""}${phase==="play"&&k===i?" now":""}`;
        const txt=phase==="show"&&k<=shown?q.nt[k]:(sd==="r"?jhL("紅","R"):jhL("黑","B"))+(k+1);h+=`<span class="${cls}">${esc(txt)}</span>`}
      $("#jhLpT").innerHTML=h};
    const draw=()=>{const mv=phase==="play"&&sel>=0?C.legal(bd,jhLpSide(i)).filter(([f])=>f===sel).map(z=>z[1]):[];
      brd.draw(bd,{last,sel:sel>=0?sel:undefined,targets:mv,hint:mark>=0?[mark]:undefined});beats()};
    /* 演一段：從這段開始的局面，一拍一步；演完停一下，蓋回這段開始的局面讓玩家重走 */
    const show=()=>{const my=++tok,[a,z]=seg();phase="show";sel=-1;mark=-1;shown=a-1;bd=jhLpAt(q.seq,a);last=null;i=a;
      $("#jhLpN").style.display="none";draw();
      say(jhL(`第 ${si+1}／${q.segs.length} 段，共 ${z-a} 步：看清楚、記下來。`,`Part ${si+1}/${q.segs.length}, ${z-a} moves: watch and remember.`));
      let k=a;const step=()=>{if(my!==tok||!b.isConnected)return;
        if(k<z){const[f,t]=jhLpSq(q.seq[k]);bd=C.make(bd,f,t);last={f,t};shown=k;draw();
          say(jhL(`咚！第 ${k+1} 步・${jhLpSide(k)==="r"?"紅方":"黑方"}：${q.nt[k]}`,`Clack! Move ${k+1} · ${jhLpSide(k)==="r"?"Red":"Black"}: ${q.nt[k]}`));k++;setTimeout(step,1100);return}
        setTimeout(()=>{if(my!==tok||!b.isConnected)return;phase="play";bd=jhLpAt(q.seq,a);last=null;i=a;wrong=0;draw();
          say(jhL(`蓋上了。照原順序重走這 ${z-a} 步，先走第 ${a+1} 步（${jhLpSide(a)==="r"?"紅方":"黑方"}）。`,`Covered. Play these ${z-a} moves back, starting with move ${a+1} (${jhLpSide(a)==="r"?"Red":"Black"}).`))},1200)};
      setTimeout(step,700)};
    const start=()=>{q=Q[qi];si=0;miss=0;peek=0;
      $("#jhLpQ").textContent=jhL(`第 ${qi+1}／${Q.length} 題：列炮開局 ${q.seq.length} 步，分 ${q.segs.length} 段演。鼓板一聲一步，演完蓋回去，你照原順序走一遍（紅方、黑方都由你走）。`,
        `${qi+1}/${Q.length}: a ${q.seq.length}-move Opposite Cannons opening in ${q.segs.length} part${q.segs.length>1?"s":""}. Watch, then play both sides back in order.`);show()};
    const finish=()=>{phase="done";sel=-1;mark=-1;draw();const ok=!miss&&!peek;if(ok)right++;
      say(ok?jhL("拍點穩準！整段棋譜一字不差。","Right on the beat! Every move as written."):jhL(`走完了，但有 ${miss} 處走岔${peek?`、看了 ${peek} 次`:""}。按「重來」從頭再記一次。`,`Done, with ${miss} slip${miss===1?"":"s"}${peek?` and ${peek} peek${peek===1?"":"s"}`:""}. Tap Retry to try again.`));
      const nb=$("#jhLpN");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("散場","Finish");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;start();return}nb.style.display="none";const xp=right===Q.length?jhLpDayXP():0;
        say(jhL(`這一輪一字不差 ${right}／${Q.length} 題。${xp?`全對，修為 +${xp}`:""}`,`${right}/${Q.length} note-perfect.${xp?` All right: +${xp} XP`:""}`))}};
    const tap=x=>{if(phase!=="play")return;const sd=jhLpSide(i);mark=-1;
      if(sel>=0&&C.legal(bd,sd).some(([f,t])=>f===sel&&t===x)){const r=jhLpJudge(q,i,sel,x);
        if(!r.ok){miss++;wrong++;sel=-1;const[F]=jhLpSq(q.seq[i]);if(wrong>=2)mark=F;draw();
          say((r.kind==="to"?jhL(`這步走岔了：第 ${i+1} 步是這顆子沒錯，落點記錯了。`,`Off the beat: right piece for move ${i+1}, wrong square.`):jhL(`這步走岔了：第 ${i+1} 步動的不是這顆子。`,`Off the beat: move ${i+1} isn't this piece.`))+(wrong>=2?jhL("框起來的那顆才是。"," The boxed piece is the one."):""));return}
        const[f,t]=jhLpSq(q.seq[i]);bd=C.make(bd,f,t);last={f,t};sel=-1;i++;wrong=0;
        if(i<seg()[1]){draw();say(jhL(`對！接著第 ${i+1} 步（${jhLpSide(i)==="r"?"紅方":"黑方"}）。`,`Yes! Now move ${i+1} (${jhLpSide(i)==="r"?"Red":"Black"}).`));return}
        if(si+1<q.segs.length){phase="gap";draw();say(jhL("這一段記住了！準備聽下一段。","Part done! Get ready for the next."));
          const nb=$("#jhLpN");nb.style.display="";nb.textContent=jhL("🥁 下一段","🥁 Next part");nb.onclick=()=>{si++;show()};return}
        finish();return}
      sel=bd[x]&&C.sideOf(bd[x])===sd&&C.legal(bd,sd).some(([f])=>f===x)?x:-1;
      if(bd[x]&&C.sideOf(bd[x])!==sd)say(jhL(`現在輪${sd==="r"?"紅方":"黑方"}走第 ${i+1} 步。`,`It's ${sd==="r"?"Red":"Black"}'s move ${i+1}.`));
      draw()};
    $("#jhLpA").onclick=()=>{if(phase!=="play")return;peek++;show()};
    $("#jhLpH").onclick=()=>{if(phase!=="play")return;peek++;sel=-1;const[F]=jhLpSq(q.seq[i]);mark=F;draw();
      say(jhL(`第 ${i+1} 步輪${jhLpSide(i)==="r"?"紅方":"黑方"}，動的是框起來的那顆子。`,`Move ${i+1}: ${jhLpSide(i)==="r"?"Red":"Black"} moves the boxed piece.`))};
    /* 重來：整題從第一段重演；已經一字不差的題不能重來（免得重複算分） */
    $("#jhLpR").onclick=()=>{if(!q||phase==="show")return;if(phase==="done"&&!miss&&!peek)return;start()};
    start()})}
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhLpCss";s.textContent=`
.jh-lp-beats{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:6px 0}.jh-lp-beat{min-width:3.2em;padding:4px 8px;border:1px solid currentColor;border-radius:14px;font-size:15px;text-align:center;opacity:.55}
.jh-lp-beat.r{color:#B3261E}.jh-lp-beat.on{opacity:1}.jh-lp-beat.now{opacity:1;font-weight:700;outline:3px solid #F2B705}`;
  if(!document.getElementById("jhLpCss"))document.head.append(s)})();
