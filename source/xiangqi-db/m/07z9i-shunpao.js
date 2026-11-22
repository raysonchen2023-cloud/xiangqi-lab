/* ---------- W48-S6 順炮門門內玩法「搶攻算殺步」（計步）----------
   開發者 11/22：「把門派任務分給其他三個人平行做完剩下的門派」；定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 2 節＋_Claude審稿.md。
   掌門霍驚瀾是淮河鹽船的護船拳師。盤上紅黑雙方各有攻子，各自都有連將殺的威脅；玩家算清雙方最快幾步將死對方，選誰會先殺到。
   「殺步」＝連將殺的步數：攻方每一步都要叫將，守方怎麼應都擋不住，第幾步將死（小學生最常漏算的就是對方的叫將、擋將，所以只算一路叫將到底的殺法）。
   審稿修正：題目一律寫明輪誰走；雙方步數相同算輪走方先殺（同快時輪走方先動手）；初級不出步數相同的題。
     初級：雙方各 2 顆攻子（連將共 3 子），一方 1 步殺、另一方 2 步殺。
     中級：各 3 顆攻子＋0～2 顆仕相，2 步殺與 3 步殺（可能同快）。
     高級：各 4 顆攻子＋1～3 顆仕相，3 步殺與 4 步殺（可能同快）。
   題目由 tools/shunpao-build.js 用固定種子擺子、用本模組的 jhSpFastest 窮舉後寫進下面 JH_SP_Q（不用引擎、不另放資料檔，預覽站也能玩）；CI 用同一支程式重算核對。
   提示：亮出輪走方最快那一路的第一步叫將，並提醒「留意對方下一步能不能將軍」。
   修為：一輪 3 題全對，每天 +10（只給一次）；另記今天最多連對幾題（算殺連對數）。不扣修為、不改棋局。
   門內頁的入口（鹽田海堤練拳木樁）等順炮門的門內圖出好再接；這裡先提供 jhShunpaoOpen()。 */
const JH_SP_LV=[
  {k:"easy",zh:"初級",en:"Easy"},
  {k:"mid",zh:"中級",en:"Medium"},
  {k:"hard",zh:"高級",en:"Hard"}];
const JH_SP_MAX=4;
function jhSpGet(){let o=null;try{o=store.get("jhShunpao",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{lv:JH_SP_LV.some(x=>x.k===o.lv)?o.lv:"easy",d:typeof o.d==="string"?o.d.slice(0,12):"",sd:typeof o.sd==="string"?o.sd.slice(0,12):"",st:Math.max(0,Math.min(99,+o.st||0))}}
function jhSpSet(o){try{store.set("jhShunpao",o)}catch(e){}}
const jhSpHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
const jhSpDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
const jhSpOpp=s=>s==="r"?"b":"r";
/* s 方所有會叫將的走法：[[從,到,走完的盤面]] */
function jhSpChecks(b,s){const C=window.XQCore,o=[];for(const[f,t]of C.legal(b,s)){const nb=C.make(b,f,t);if(C.inCheck(nb,jhSpOpp(s)))o.push([f,t,nb])}return o}
/* s 方先走，能不能在 n 步之內連將殺（每一步都叫將；守方沒有合法著法＝被將死） */
function jhSpMateIn(b,s,n){const C=window.XQCore;for(const[f,t,nb]of jhSpChecks(b,s)){const rep=C.legal(nb,jhSpOpp(s));if(!rep.length)return true;
    if(n>1&&rep.every(([g,h])=>jhSpMateIn(C.make(nb,g,h),s,n-1)))return true}return false}
/* s 方最快幾步連將殺（max 步內沒有＝0） */
function jhSpFastest(b,s,max){for(let n=1;n<=(max||JH_SP_MAX);n++)if(jhSpMateIn(b,s,n))return n;return 0}
/* 最快那一路的第一步叫將 [從,到]（提示、說明用） */
function jhSpFirst(b,s,n){const C=window.XQCore;for(const[f,t,nb]of jhSpChecks(b,s)){const rep=C.legal(nb,jhSpOpp(s));
    if(!rep.length||(n>1&&rep.every(([g,h])=>jhSpMateIn(C.make(nb,g,h),s,n-1))))return[f,t]}return null}
/* 誰先殺到：輪走方步數 ≤ 對方步數就是輪走方（同快時輪走方先動手） */
function jhSpWinner(q){const a=q[q.turn],o=q[jhSpOpp(q.turn)];return a<=o?q.turn:jhSpOpp(q.turn)}
/* 題庫：tools/shunpao-build.js 產生；fen 只有盤面（紅在下），turn＝輪誰走，r／b＝紅、黑各自最快幾步連將殺 */
/* ==JH_SP_Q== */
const JH_SP_Q=[
  {"lv":"easy","fen":"9/3R5/4k4/8r/9/2r6/9/9/7R1/5K3","turn":"r","r":1,"b":2},
  {"lv":"easy","fen":"3r5/6P2/5k3/9/8r/9/9/4K4/R8/9","turn":"b","r":2,"b":1},
  {"lv":"easy","fen":"3k5/9/9/5P3/9/7r1/9/4K4/5R3/5c3","turn":"r","r":2,"b":1},
  {"lv":"easy","fen":"9/9/4k1N2/1r7/9/9/9/3Rp4/9/3K5","turn":"b","r":1,"b":2},
  {"lv":"easy","fen":"5k3/4R4/8r/9/9/9/3n5/9/5K1R1/9","turn":"r","r":2,"b":1},
  {"lv":"easy","fen":"9/3k5/9/9/p8/9/7N1/6r2/4R4/4K4","turn":"b","r":2,"b":1},
  {"lv":"easy","fen":"5k3/9/3R5/4N4/3r3r1/9/9/4K4/9/9","turn":"r","r":2,"b":1},
  {"lv":"easy","fen":"3kN4/9/9/3C5/8r/9/9/5K3/4n4/9","turn":"b","r":1,"b":2},
  {"lv":"easy","fen":"4k4/7R1/6r2/9/8r/9/9/1R7/9/3K5","turn":"r","r":1,"b":2},
  {"lv":"easy","fen":"9/4k4/9/3R5/9/9/9/3K4R/6p2/6r2","turn":"b","r":2,"b":1},
  {"lv":"easy","fen":"9/3k5/9/1r7/9/9/9/4R4/4K1R2/6r2","turn":"r","r":2,"b":1},
  {"lv":"easy","fen":"3k5/9/9/9/9/7r1/9/6R2/5pN2/4K4","turn":"b","r":2,"b":1},
  {"lv":"easy","fen":"2N6/9/4k4/9/7R1/6rp1/9/9/9/3K5","turn":"r","r":2,"b":1},
  {"lv":"easy","fen":"9/1N7/4k4/9/9/1r7/3R5/r8/9/5K3","turn":"b","r":2,"b":1},
  {"lv":"easy","fen":"3P1k3/9/9/9/8R/3r5/2r6/9/9/5K3","turn":"r","r":1,"b":2},
  {"lv":"easy","fen":"4k4/1r1R5/9/5N3/9/9/9/3K5/9/7n1","turn":"b","r":1,"b":2},
  {"lv":"easy","fen":"4k4/4r4/9/9/9/8C/9/3K3p1/2R6/9","turn":"r","r":1,"b":2},
  {"lv":"easy","fen":"7R1/9/3k5/9/9/r7P/1r7/9/9/4K4","turn":"b","r":1,"b":2},
  {"lv":"easy","fen":"9/9/4k4/3R3R1/9/9/9/6p2/5K3/1r7","turn":"r","r":1,"b":2},
  {"lv":"easy","fen":"2C1k4/4r4/9/9/9/7R1/9/2r6/5K3/9","turn":"b","r":1,"b":2},
  {"lv":"mid","fen":"2b6/5k3/7r1/9/n5N1P/9/5C3/9/2r6/4K4","turn":"r","r":2,"b":2},
  {"lv":"mid","fen":"5kb1r/6C2/1P1a5/9/9/2r6/1R7/2p1K4/9/9","turn":"b","r":2,"b":2},
  {"lv":"mid","fen":"r2N5/5P3/1C1k5/9/7r1/6r2/9/3A5/3K5/9","turn":"r","r":2,"b":2},
  {"lv":"mid","fen":"9/5k3/9/8c/6N2/3n3N1/9/5r3/1R2K4/9","turn":"b","r":2,"b":2},
  {"lv":"mid","fen":"3R5/9/4k4/9/1n6c/n8/9/9/3K5/3R4N","turn":"r","r":3,"b":3},
  {"lv":"mid","fen":"9/4k4/8r/P2R5/9/n1p3R2/9/9/3K5/9","turn":"b","r":2,"b":3},
  {"lv":"mid","fen":"4k4/5r3/9/5R3/6b2/9/c8/1c1K4B/9/2RN5","turn":"r","r":3,"b":2},
  {"lv":"mid","fen":"5k3/4a4/b8/1R7/2r6/9/9/4K4/4p1R2/1R1An4","turn":"b","r":2,"b":2},
  {"lv":"mid","fen":"4ka3/1R7/4r4/1R3r3/2N6/9/9/6n2/9/3K5","turn":"r","r":2,"b":3},
  {"lv":"mid","fen":"2c6/9/3k5/6r2/9/7r1/R3R4/3A1A3/6N2/5K3","turn":"b","r":3,"b":2},
  {"lv":"mid","fen":"3k1a3/9/5a3/1C7/1r2R4/9/2r6/4K2n1/7R1/9","turn":"r","r":3,"b":2},
  {"lv":"mid","fen":"4k4/1C7/8b/9/2RN5/7n1/8n/5K3/9/2n6","turn":"b","r":3,"b":2},
  {"lv":"mid","fen":"9/r8/3k5/1R3r3/3N5/9/9/5N3/3p5/5K3","turn":"r","r":2,"b":3},
  {"lv":"mid","fen":"5kb2/2r1a4/4N4/4c4/9/9/4R4/9/3K3Nr/9","turn":"b","r":3,"b":2},
  {"lv":"mid","fen":"4k4/8R/5r3/9/n8/9/7C1/5A3/9/3RKAr2","turn":"r","r":2,"b":3},
  {"lv":"mid","fen":"9/9/Nr1Nk4/8R/9/9/9/5p3/4K4/6p2","turn":"b","r":2,"b":3},
  {"lv":"mid","fen":"4k4/9/3a5/N1r6/9/9/3p4R/2r6/5K1R1/9","turn":"r","r":3,"b":2},
  {"lv":"mid","fen":"6P2/9/3k4r/9/1c7/9/5r3/5R3/4K4/3AR4","turn":"b","r":3,"b":2},
  {"lv":"mid","fen":"r3ca3/4ak3/9/9/R8/2B6/7R1/9/3K5/p1C6","turn":"r","r":2,"b":3},
  {"lv":"mid","fen":"3k5/2P1a4/5a2r/9/7R1/3r5/4P4/4K4/3n5/6B2","turn":"b","r":2,"b":3},
  {"lv":"hard","fen":"4k4/2NR5/1cNa5/5N3/6b2/n8/5p3/5A3/3K5/n8","turn":"r","r":3,"b":3},
  {"lv":"hard","fen":"9/N1R6/b2k5/9/1N1r5/2B6/3c2r2/9/4K4/2B2rB1R","turn":"b","r":3,"b":3},
  {"lv":"hard","fen":"5a3/3k2r2/R4a2N/2r6/6b2/6C2/9/N2K1c3/9/3A2B1n","turn":"r","r":3,"b":4},
  {"lv":"hard","fen":"3a1k3/9/b1Rr4r/2p3P2/2b6/6R2/8r/9/4K4/2BA2R2","turn":"b","r":3,"b":4},
  {"lv":"hard","fen":"5ar2/1C3k3/4b4/1c7/R6P1/2B6/8r/9/3RK3p/9","turn":"r","r":3,"b":4},
  {"lv":"hard","fen":"2R2a3/4k4/3a5/N5C2/r8/9/1r7/3Ap3R/4AKn2/5A3","turn":"b","r":3,"b":4},
  {"lv":"hard","fen":"2b6/9/bN1k5/4R1p2/6P1r/4c4/1N7/B8/5K3/r8","turn":"r","r":3,"b":3},
  {"lv":"hard","fen":"6b2/9/4k4/1c2r4/2b3R2/8R/2P1n4/3r1A3/1N7/5KB2","turn":"b","r":3,"b":4},
  {"lv":"hard","fen":"R8/9/5k1r1/4c4/6b2/2r2C3/9/6C1B/3R1K3/1p7","turn":"r","r":4,"b":3},
  {"lv":"hard","fen":"3a3RR/5k3/9/8r/2nR5/9/9/B1N6/9/2n2K2c","turn":"b","r":3,"b":3},
  {"lv":"hard","fen":"3C4R/4a4/3kba3/7Nn/9/1r4B2/5r3/7r1/4R4/3K1A3","turn":"r","r":4,"b":3},
  {"lv":"hard","fen":"3k1a3/7r1/8r/9/2P6/5p3/1c4P2/3K1A3/3R5/R8","turn":"b","r":4,"b":3},
  {"lv":"hard","fen":"3a1k3/9/4b3b/9/N1N6/9/8r/4B3R/5K1p1/1p4Rc1","turn":"r","r":4,"b":3},
  {"lv":"hard","fen":"2P4n1/r2k5/9/1r3N3/6b2/2B4r1/7R1/B3K4/2R6/2B6","turn":"b","r":3,"b":4},
  {"lv":"hard","fen":"1C4b2/5r3/4k3b/7N1/5R3/4N4/9/3A2rr1/4K4/7c1","turn":"r","r":3,"b":3},
  {"lv":"hard","fen":"1P3a1n1/4k4/1P7/2R5r/9/9/3n2rR1/9/4A4/3A1K3","turn":"b","r":4,"b":3},
  {"lv":"hard","fen":"2br1a2c/9/3k1a3/9/2r5R/8n/1C7/5A3/5K3/5R2R","turn":"r","r":3,"b":4},
  {"lv":"hard","fen":"9/1R2aN3/4k2r1/9/1r6N/9/2R1c4/9/4K4/2Br1A3","turn":"b","r":4,"b":4},
  {"lv":"hard","fen":"5k3/9/3a3R1/9/3c1c1N1/3c5/2R6/n1C6/4A4/5KB2","turn":"r","r":4,"b":3},
  {"lv":"hard","fen":"3k5/9/3a5/2P6/4R3C/2r3r2/9/2p2K3/9/1cBAR4","turn":"b","r":4,"b":3}];
/* ==/JH_SP_Q== */
/* 一輪 3 題：同一天、同一級固定；同一題不重複 */
function jhSpRound(lv,day){const P=JH_SP_Q.filter(q=>q.lv===lv);if(!P.length)return[];const o=[],used=new Set();let h=jhSpHash("shunpao:"+day+":"+lv);
  for(let k=0;o.length<Math.min(3,P.length)&&k<200;k++){h=jhSpHash(h+"|");const i=h%P.length;if(used.has(i))continue;used.add(i);o.push(P[i])}return o}
function jhSpDayXP(){const G=jhSpGet(),d=jhSpDay();if(G.d===d)return 0;G.d=d;jhSpSet(G);if(typeof addXP==="function")try{addXP(10,jhL("搶攻算殺步","Race to mate"),"shunpao:"+d)}catch(e){}return 10}
/* 今天的算殺連對數：連對到 n 題就記下（同一天只留最多的） */
function jhSpStreak(n){const G=jhSpGet(),d=jhSpDay();if(G.sd!==d){G.sd=d;G.st=0}if(n>G.st)G.st=n;jhSpSet(G);return G.st}
const jhSpSide=s=>s==="r"?jhL("紅","Red"):jhL("黑","Black");
function jhSpCss(){if(typeof document==="undefined"||document.getElementById("jhSpCss"))return;const s=document.createElement("style");s.id="jhSpCss";s.textContent=`
.jh-sp-lv{display:flex;gap:6px;margin:6px 0}.jh-sp-lv .btn{flex:1;padding:6px 0}
.jh-sp-q{font-weight:700;margin:6px 0}.jh-sp-bd{max-width:340px;margin:6px auto}.jh-sp-bd svg{display:block;width:100%;height:auto}
.jh-sp-pick{display:flex;gap:8px;margin:8px 0}.jh-sp-pick .btn{flex:1}`;document.head.append(s)}

function jhShunpaoOpen(lv0){const C=window.XQCore,G=jhSpGet(),L=JH_SP_LV.find(x=>x.k===(lv0||G.lv))||JH_SP_LV[0],Q=jhSpRound(L.k,jhSpDay());
  if(!Q.length){toast(jhL("拳師還在排題，等一下再試。","The boxing master is still setting puzzles. Try again shortly."));return}
  G.lv=L.k;jhSpSet(G);jhSpCss();let qi=0,right=0,run=0;
  sheet(jhL("🥊 練拳木樁・搶攻算殺步","🥊 Practice post · Race to mate"),b=>{
    b.innerHTML=`<p class="muted">${esc(jhL("霍驚瀾：「鹽船走水路拼的是先手，算準誰先逼出殺著，拳風才不會落空！」","Huo Jinglan: \"Salt boats race for the lead. Count who forces mate first, or your punch hits nothing!\""))}</p>
      <p class="muted">${esc(jhL("殺步＝一路叫將、對方怎麼應都擋不住，第幾步將死。雙方一樣快時，輪到走的那一方先殺到。","Mate count = checks all the way until mate, whatever the defence. If both are equally fast, the side to move mates first."))}</p>
      <div class="jh-sp-lv">${JH_SP_LV.map(x=>`<button class="btn ${x.k===L.k?"":"ghost"}" data-lv="${x.k}">${esc(jhL(x.zh,x.en))}</button>`).join("")}</div>
      <p id="jhSpQ" class="jh-sp-q"></p><div id="jhSpB" class="jh-sp-bd"></div>
      <div class="jh-sp-pick"><button class="btn" id="jhSpR">${esc(jhL("紅先殺到","Red mates first"))}</button><button class="btn" id="jhSpK">${esc(jhL("黑先殺到","Black mates first"))}</button></div>
      <div class="jh-actions"><button class="btn ghost" id="jhSpH">${esc(jhL("💡 提示","💡 Hint"))}</button><button class="btn" id="jhSpN" style="display:none"></button></div>
      <p id="jhSpS" class="jh-mate-say" style="display:none"></p>`;
    const $=s=>b.querySelector(s);let cur=null,bd=null,done=false;const brd=Board(()=>{});$("#jhSpB").append(brd.svg);
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{try{closeSheet()}catch(e){}setTimeout(()=>jhShunpaoOpen(x.dataset.lv),250)});
    const say=t=>{const s=$("#jhSpS");s.style.display=t?"":"none";s.textContent=t||""};
    const pick=on=>{$("#jhSpR").disabled=!on;$("#jhSpK").disabled=!on};
    const start=()=>{cur=Q[qi];bd=C.parseFen(cur.fen);done=false;say("");pick(true);$("#jhSpN").style.display="none";brd.draw(bd,{});
      $("#jhSpQ").textContent=jhL(`第 ${qi+1}／${Q.length} 題：輪${jhSpSide(cur.turn)}走。紅、黑各自最快幾步連將殺？誰會先將死對方？`,`${qi+1}/${Q.length}: ${jhSpSide(cur.turn)} to move. How many checking moves does each side need to mate? Who mates first?`)};
    const answer=who=>{if(done)return;done=true;pick(false);const W=jhSpWinner(cur),ok=who===W,F=jhSpFirst(bd,W,cur[W]);
      if(ok){right++;run++}else run=0;jhSpStreak(run);
      brd.draw(bd,F?{last:{f:F[0],t:F[1]}}:{});
      const tie=cur.r===cur.b?jhL(`雙方都是 ${cur.r} 步，同快時輪${jhSpSide(cur.turn)}走的先殺到。`,`Both need ${cur.r}; when equal, ${jhSpSide(cur.turn)} (to move) mates first.`):"";
      const cnt=jhL(`紅最快 ${cur.r} 步、黑最快 ${cur.b} 步。`,`Red: ${cur.r}, Black: ${cur.b}.`)+tie+(F?jhL(`${jhSpSide(W)}的第一步叫將已經畫在盤上。`,` ${jhSpSide(W)}'s first check is shown on the board.`):"");
      say((ok?jhL("算得俐落！搶到先手就佔了上風。","Sharp counting! Seizing the initiative wins."):jhL("算慢了一步，對方先將死你了，再看一次叫將路數。","One step too slow: they mate first. Look at the checking line again."))+" "+cnt);
      const nb=$("#jhSpN");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("收工","Finish");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;start();return}nb.style.display="none";const xp=right===Q.length?jhSpDayXP():0,st=jhSpGet().st;
        say(jhL(`這一輪算對 ${right}／${Q.length} 題；今天最多連對 ${st} 題。${xp?`全對，修為 +${xp}`:""}`,`${right}/${Q.length} right; best streak today: ${st}.${xp?` All right: +${xp} XP`:""}`))}};
    $("#jhSpR").onclick=()=>answer("r");$("#jhSpK").onclick=()=>answer("b");
    $("#jhSpH").onclick=()=>{if(!cur||done)return;const F=jhSpFirst(bd,cur.turn,cur[cur.turn]);if(F)brd.draw(bd,{last:{f:F[0],t:F[1]}});
      say(jhL(`提示：盤上畫的是輪${jhSpSide(cur.turn)}走時最快那一路的第一步叫將。也要留意：對方下一步能不能將軍？`,`Hint: the board shows ${jhSpSide(cur.turn)}'s first check on the fastest line. Also watch: can the other side check next?`))};
    start()})}
