/* ---------- W48 過宮炮門門內玩法「宣紙蓋子位」（記位）----------
   開發者 11/22 選八派門內玩法第一批：過宮炮（記位）、仕角炮（算兌換）、起馬（找路）；定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 7 節＋_Claude審稿.md。
   掌門黎疏桐是涇縣宣紙坊主。看盤幾秒 → 宣紙蓋下來 → 抽走幾顆子 → 玩家從下面那排把子一顆顆擺回原位（畫面不寫「托盤」：App 的繁簡轉換會把它變成「託盤」） → 核對。
     初級：6～8 子、看 8 秒、抽 3 顆（蓋紙前先閃一下要考的子＝小學生的提示）；中級：9～12 子、6 秒、抽 4 顆；高級：13～16 子、4 秒、抽 5 顆。
   局面：殘局題庫（07c-canju 的 cjData，data/canju/canju-set.json）裡子數合的局面，優先挑盤上有炮的（扣「過宮炮」）；同一天、同一級固定那三題。
   核對：同一種子（例如兩顆紅兵）位置互換也算對；放錯的亮出原本的位置。
   修為：一輪 3 題全對，每天 +10（只給一次）。不扣修為、不改棋局。
   門內頁的入口（長廊橋旁焙紙牆；史學顧問 192：宣紙是貼焙牆烘乾，不是吊竿晾）由 07z9l-halls.js 接，這裡提供 jhGongOpen()。 */
const JH_GONG_LV=[
  {k:"easy",zh:"初級",en:"Easy",n:[6,8],sec:8,take:3,flash:true},
  {k:"mid",zh:"中級",en:"Medium",n:[9,12],sec:6,take:4,flash:false},
  {k:"hard",zh:"高級",en:"Hard",n:[13,16],sec:4,take:5,flash:false}];
const JH_GONG_NM={R:"俥",N:"傌",B:"相",A:"仕",K:"帥",C:"炮",P:"兵",r:"車",n:"馬",b:"象",a:"士",k:"將",c:"砲",p:"卒"};
function jhGongGet(){let o=null;try{o=store.get("jhGong",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{lv:JH_GONG_LV.some(x=>x.k===o.lv)?o.lv:"easy",d:typeof o.d==="string"?o.d.slice(0,12):"",best:Math.max(0,Math.min(99,+o.best||0))}}
function jhGongSet(o){try{store.set("jhGong",o)}catch(e){}}
const jhGongHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
const jhGongDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
/* 局面裡的子（不含將帥；將帥一抽掉方位就亂了，不考） */
function jhGongPieces(b){const o=[];b.forEach((p,i)=>{if(p&&p.toUpperCase()!=="K")o.push({p,i})});return o}
/* 題目池：子數在範圍內；有炮的排前面 */
function jhGongPool(items,L){const C=window.XQCore;const o=[];
  for(const x of items||[]){if(!x||typeof x.fen!=="string")continue;let b;try{b=C.parseFen(x.fen.split(" ")[0])}catch(e){continue}
    const n=b.filter(Boolean).length;if(n<L.n[0]||n>L.n[1])continue;if(jhGongPieces(b).length<L.take)continue;o.push({id:x.id,b,cannon:b.some(p=>p==="C"||p==="c")})}
  o.sort((a,b)=>(a.cannon===b.cannon?0:a.cannon?-1:1)||(a.id<b.id?-1:a.id>b.id?1:0));return o}
/* 一輪三題：同一天、同一級固定；有炮的局面優先（池子前半段） */
function jhGongRound(pool,L,day){if(!pool.length)return[];const nC=pool.filter(x=>x.cannon).length,P=nC>=3?pool.slice(0,nC):pool,out=[];
  let h=jhGongHash("gong:"+day+":"+L.k);for(let t=0;out.length<Math.min(3,P.length)&&t<50;t++){const q=P[h%P.length];if(!out.includes(q))out.push(q);h=jhGongHash(h+":"+t)}
  return out.map((q,i)=>Object.assign({},q,{take:jhGongTake(q.b,L.take,day+":"+L.k+":"+i)}))}
/* 抽哪幾顆：有炮就先抽一顆炮，其餘照雜湊挑 */
function jhGongTake(b,k,seed){const P=jhGongPieces(b);let h=jhGongHash("take:"+seed);const pick=[];
  const can=P.filter(x=>x.p==="C"||x.p==="c");if(can.length)pick.push(can[h%can.length]);
  const rest=P.filter(x=>!pick.includes(x));while(pick.length<k&&rest.length){h=jhGongHash(h+"|"+pick.length);pick.push(rest.splice(h%rest.length,1)[0])}
  return pick.map(x=>({p:x.p,i:x.i}))}
/* 核對：每一種子，玩家擺的格子集合要跟原本的一樣（同種互換算對）；回傳放錯的那些原本位置 */
function jhGongCheck(take,placed){const want={},got={};take.forEach(x=>(want[x.p]=want[x.p]||[]).push(x.i));placed.forEach(x=>(got[x.p]=got[x.p]||[]).push(x.i));
  const miss=[];let ok=0;for(const p in want){const g=new Set(got[p]||[]);for(const i of want[p]){if(g.has(i))ok++;else miss.push({p,i})}}
  return{ok,miss,all:miss.length===0}}
function jhGongDayXP(){const G=jhGongGet(),d=jhGongDay();if(G.d===d)return 0;G.d=d;jhGongSet(G);if(typeof addXP==="function")try{addXP(10,jhL("宣紙蓋子位","Paper memory"),"gong:"+d)}catch(e){}return 10}

async function jhGongOpen(lv0){const G=jhGongGet(),L=JH_GONG_LV.find(x=>x.k===(lv0||G.lv))||JH_GONG_LV[0];
  let D=null;try{D=typeof cjData==="function"?await cjData():null}catch(e){}
  const pool=jhGongPool(D&&D.items,L),Q=jhGongRound(pool,L,jhGongDay());
  if(!Q.length){toast(jhL("棋譜還沒載好，等一下再試。","The positions haven't loaded yet. Try again shortly."));return}
  G.lv=L.k;jhGongSet(G);const C=window.XQCore;let qi=0,right=0,timers=[];
  sheet(jhL("📜 焙紙牆・宣紙蓋子位","📜 Drying wall · Paper memory"),b=>{
    b.innerHTML=`<p class="muted">${esc(jhL("黎疏桐：「宣紙蓋下來前看清紙紋，把記住的棋子放回原位，可別放錯格！」","Li Shutong: \"Study the board before the paper falls, then put each piece back where it was!\""))}</p>
      <div class="jh-gp-lv">${JH_GONG_LV.map(x=>`<button class="btn ${x.k===L.k?"":"ghost"}" data-lv="${x.k}">${esc(jhL(x.zh,x.en))}</button>`).join("")}</div>
      <p id="jhGq" class="jh-gp-q"></p><div class="jh-gp-wrap"><div id="jhGb" class="jh-scr-bd jh-gp-bd"></div><div class="jh-gp-paper" id="jhGp"></div></div>
      <div id="jhGt" class="jh-gp-tray"></div><p id="jhGs" class="jh-mate-say" style="display:none"></p>
      <div class="jh-actions"><button class="btn" id="jhGk" style="display:none">${esc(jhL("核對","Check"))}</button><button class="btn" id="jhGn" style="display:none"></button></div>`;
    const $=s=>b.querySelector(s);let cur=null,board=null,tray=[],placed=[],sel=-1,stage="look";
    const later=(f,ms)=>{const t=setTimeout(()=>{if(b.isConnected)f()},ms);timers.push(t)};
    const bd=Board(x=>tap(x));$("#jhGb").append(bd.svg);
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{timers.forEach(clearTimeout);try{closeSheet()}catch(e){}setTimeout(()=>jhGongOpen(x.dataset.lv),250)});
    const say=t=>{const s=$("#jhGs");s.style.display=t?"":"none";s.textContent=t||""};
    const drawTray=()=>{$("#jhGt").innerHTML=tray.map((x,k)=>`<button class="jh-gp-pc ${x.p===x.p.toUpperCase()?"r":"b"}${k===sel?" on":""}" data-t="${k}" aria-label="${esc(JH_GONG_NM[x.p])}">${esc(JH_GONG_NM[x.p])}</button>`).join("");
      $("#jhGt").querySelectorAll("[data-t]").forEach(x=>x.onclick=()=>{sel=+x.dataset.t===sel?-1:+x.dataset.t;drawTray()});$("#jhGk").style.display=stage==="place"&&!tray.length?"":"none"};
    const tap=x=>{if(stage!=="place")return;const k=placed.findIndex(z=>z.i===x);
      if(k>=0){const z=placed.splice(k,1)[0];board[x]=null;tray.push({p:z.p});sel=tray.length-1;bd.draw(board,{});drawTray();return}   /* 點自己擺的子＝收回下面那排 */
      if(sel<0||board[x])return;const p=tray.splice(sel,1)[0].p;board[x]=p;placed.push({p,i:x});sel=tray.length?0:-1;bd.draw(board,{});drawTray()};
    const start=()=>{cur=Q[qi];stage="look";placed=[];tray=[];sel=-1;say("");$("#jhGn").style.display="none";$("#jhGk").style.display="none";$("#jhGt").innerHTML="";
      bd.draw(cur.b,L.flash?{targets:cur.take.map(x=>x.i)}:{});   /* 初級：先閃一下要考的子 */
      if(L.flash)later(()=>bd.draw(cur.b,{}),1000);
      let s=L.sec;const tick=()=>{$("#jhGq").textContent=jhL(`第 ${qi+1}／${Q.length} 題：記住盤面，${s} 秒後宣紙蓋下來`,`${qi+1}/${Q.length}: memorize the board. Paper in ${s}s`);if(s--<=0)return cover();later(tick,1000)};tick()};
    const cover=()=>{stage="cover";const p=$("#jhGp");p.classList.add("on");$("#jhGq").textContent=jhL("宣紙蓋上了……","The paper is down...");
      later(()=>{p.classList.remove("on");board=cur.b.slice();cur.take.forEach(x=>{board[x.i]=null});tray=cur.take.map(x=>({p:x.p}));sel=0;stage="place";bd.draw(board,{});drawTray();
        $("#jhGq").textContent=jhL(`抽走了 ${tray.length} 顆：點下面那排的子，再點棋盤上它原本的位置（點擺好的子可以收回）`,`${tray.length} pieces were taken. Tap one below, then its square (tap a placed piece to take it back)`)},900)};
    $("#jhGk").onclick=()=>{if(stage!=="place"||tray.length)return;stage="done";const R=jhGongCheck(cur.take,placed);if(R.all)right++;
      bd.draw(cur.b,R.all?{}:{targets:R.miss.map(x=>x.i)});
      say(R.all?jhL("記性真好！每一顆子都放回原位了。","Great memory! Every piece is back in place."):jhL(`放對 ${R.ok} 顆、放錯 ${R.miss.length} 顆：亮框是它們原本的位置。`,`${R.ok} right, ${R.miss.length} wrong: the highlighted squares are where they belonged.`));
      $("#jhGk").style.display="none";const nb=$("#jhGn");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("收工","Finish");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;start();return}nb.style.display="none";const xp=right===Q.length?jhGongDayXP():0;const G2=jhGongGet();G2.best=Math.max(G2.best,right);jhGongSet(G2);
        say(jhL(`這一輪記對 ${right}／${Q.length} 題。${xp?`全對，修為 +${xp}`:""}`,`${right}/${Q.length} correct.${xp?` All right: +${xp} XP`:""}`))}};
    start()})}
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhGongCss";s.textContent=`
.jh-gp-lv{display:flex;gap:6px;margin:6px 0}.jh-gp-lv .btn{flex:1;padding:6px 0}
.jh-gp-q{font-weight:700;margin:6px 0}.jh-gp-wrap{position:relative;max-width:340px;margin:0 auto}
.jh-gp-paper{position:absolute;inset:0;border-radius:6px;background:#f4ecd8 repeating-linear-gradient(90deg,rgba(150,120,80,.06) 0 2px,transparent 2px 9px);box-shadow:inset 0 0 18px rgba(120,90,50,.25);opacity:0;transform:translateY(-12%);transition:opacity .35s,transform .35s;pointer-events:none}
.jh-gp-paper.on{opacity:1;transform:none}
.jh-gp-tray{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;min-height:44px;margin:8px 0}
.jh-gp-pc{width:42px;height:42px;border-radius:50%;border:2px solid #8a6a3a;background:#f7ecd2;font:800 20px/1 var(--serif,serif);cursor:pointer}
.jh-gp-pc.r{color:#b0261c}.jh-gp-pc.b{color:#222}.jh-gp-pc.on{outline:3px solid #d9a21b;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.jh-gp-paper{transition:none}}`;
  if(!document.getElementById("jhGongCss"))document.head.append(s)})();
