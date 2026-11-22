/* ---------- W48-S6 順炮門門內玩法「搶攻算殺步」（計步）----------
   開發者 11/22：「把門派任務分給其他三個人平行做完剩下的門派」；定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 2 節＋_Claude審稿.md。
   掌門霍驚瀾是淮河鹽船的護船拳師。題目寫明輪誰走，玩家算輪走方最快幾步能連將殺，答完在盤上一步一步示範殺法。
   「殺步」＝連將殺的步數：攻方每一步都要叫將，守方怎麼應都擋不住，第幾步將死（小學生最常漏算的就是叫將、擋將的步數）。
   PR #53 審查（iMac Claude 2、Windows Claude 1 預驗）：原本比「紅黑誰先殺到」，但連將殺時輪走方只要有殺就一定先殺到（對方只能應將），題目不成立；
     開發者 11/22 選單改成「改問『最快幾步殺』——只問輪走方最快幾步連將殺，選 1／2／3 步（高級到 4）；答案程式算得準，扣『計步』本意。答對後在盤上示範殺法」。
     初級：雙方各 2 顆攻子，答案 1 或 2 步，選項 1／2／3。
     中級：各 3 顆攻子＋0～2 顆仕相，答案 2 或 3 步，選項 1～4。
     高級：各 4 顆攻子＋1～3 顆仕相，答案 3 或 4 步，選項 1～4。
   題目由 tools/shunpao-build.js 用固定種子擺子、用本模組的 jhSpFastest 窮舉後寫進下面 JH_SP_Q（不用引擎、不另放資料檔，預覽站也能玩）；
   CI 的 test-jh-shunpao-1122.js 用另一套獨立寫的連將殺搜尋重算每一題，並確認少一步殺不了。
   提示：亮出最快那一路的第一步叫將。
   修為：一輪 3 題全對，每天 +10（只給一次）；另記今天最多連對幾題（算殺連對數）。不扣修為、不改棋局。
   門內頁的入口（鹽田海堤練拳木樁）等順炮門的門內圖出好再接；這裡先提供 jhShunpaoOpen()。 */
const JH_SP_LV=[
  {k:"easy",zh:"初級",en:"Easy",opt:[1,2,3]},
  {k:"mid",zh:"中級",en:"Medium",opt:[1,2,3,4]},
  {k:"hard",zh:"高級",en:"Hard",opt:[1,2,3,4]}];
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
/* 示範殺法：攻方挑一步「n 步內殺得到」的叫將；守方挑撐最久的應著（讓攻方還要整整 n-1 步）。回傳 [[從,到],…]，最後一步就是將死 */
function jhSpLine(b,s,n){const C=window.XQCore,o=[];let bd=b;
  for(let k=n;k>=1;k--){let pick=null;
    for(const[f,t,nb]of jhSpChecks(bd,s)){const rep=C.legal(nb,jhSpOpp(s));if(!rep.length){pick=[f,t,nb,null];break}
      if(k>1&&rep.every(([g,h])=>jhSpMateIn(C.make(nb,g,h),s,k-1))){const r=rep.find(([g,h])=>k<3||!jhSpMateIn(C.make(nb,g,h),s,k-2))||rep[0];pick=[f,t,nb,r];break}}
    if(!pick)return o;o.push([pick[0],pick[1]]);if(!pick[3])return o;o.push([pick[3][0],pick[3][1]]);bd=C.make(pick[2],pick[3][0],pick[3][1])}
  return o}
/* 題庫：tools/shunpao-build.js 產生；fen 只有盤面（紅在下），turn＝輪誰走，n＝輪走方最快幾步連將殺 */
/* ==JH_SP_Q== */
const JH_SP_Q=[
  {"lv":"easy","fen":"9/4k4/9/3R5/p8/2c6/9/3K1R3/9/9","turn":"r","n":1},
  {"lv":"easy","fen":"9/P4k3/7c1/9/9/9/r8/3C1K3/9/9","turn":"b","n":2},
  {"lv":"easy","fen":"9/5k3/9/9/5c3/9/R4p2R/9/3K5/9","turn":"r","n":2},
  {"lv":"easy","fen":"3k5/9/9/3P5/1r7/9/7C1/9/4K1n2/9","turn":"b","n":1},
  {"lv":"easy","fen":"9/5P3/4k4/9/7R1/4pp3/9/9/5K3/9","turn":"r","n":1},
  {"lv":"easy","fen":"9/4k4/r7P/9/9/6C2/6r2/9/5K3/9","turn":"b","n":1},
  {"lv":"easy","fen":"9/3rk4/9/9/1N6c/1R7/9/9/9/5K3","turn":"r","n":2},
  {"lv":"easy","fen":"5k1P1/2r6/4r4/9/9/9/9/3R5/9/5K3","turn":"b","n":2},
  {"lv":"easy","fen":"5k3/P8/9/p8/R8/9/9/9/9/p3K4","turn":"r","n":1},
  {"lv":"easy","fen":"9/4k3n/9/3P5/9/2P3r2/9/9/9/3K5","turn":"b","n":1},
  {"lv":"easy","fen":"7R1/4P4/3k5/9/9/1c2p4/9/5K3/9/9","turn":"r","n":1},
  {"lv":"easy","fen":"9/4k4/9/8C/9/9/1R7/6r2/5r3/3K5","turn":"b","n":1},
  {"lv":"easy","fen":"9/5k3/9/9/9/9/1pC5c/4K4/9/5C3","turn":"r","n":1},
  {"lv":"easy","fen":"9/5k3/7C1/4r4/4r2P1/9/9/9/5K3/9","turn":"b","n":1},
  {"lv":"easy","fen":"9/3N5/2nk1r3/9/9/1R7/9/9/4K4/9","turn":"r","n":2},
  {"lv":"easy","fen":"6r2/4k4/9/8r/9/9/9/3K1R3/2N6/9","turn":"b","n":2},
  {"lv":"easy","fen":"4rk3/9/4r3N/9/9/9/9/9/3R5/5K3","turn":"r","n":2},
  {"lv":"easy","fen":"1r1N5/4k4/9/1N7/9/9/9/9/9/3K3n1","turn":"b","n":2},
  {"lv":"easy","fen":"4k3r/9/R8/3R5/9/5c3/9/9/5K3/9","turn":"r","n":2},
  {"lv":"easy","fen":"9/9/4k4/9/r8/2p6/2PR5/5K3/9/9","turn":"b","n":2},
  {"lv":"mid","fen":"3a1r3/9/4k4/9/6RR1/8p/2P3r2/9/4K4/9","turn":"r","n":2},
  {"lv":"mid","fen":"7P1/6nR1/2P1k4/r8/9/9/9/2n1K4/9/3A5","turn":"b","n":2},
  {"lv":"mid","fen":"4ka3/6c2/9/9/9/R8/p8/3K5/3RA1Rp1/9","turn":"r","n":3},
  {"lv":"mid","fen":"3k5/8P/b8/6p2/R2r5/9/9/5K3/3N5/2r6","turn":"b","n":3},
  {"lv":"mid","fen":"2P6/9/5k3/2R6/9/3R5/1p7/3ABK3/4r2r1/9","turn":"r","n":2},
  {"lv":"mid","fen":"9/2N1k4/9/6r2/9/9/5r3/7r1/R3KC3/9","turn":"b","n":2},
  {"lv":"mid","fen":"2b6/9/3k1n3/9/9/9/N5R2/4Kc3/7N1/8r","turn":"r","n":2},
  {"lv":"mid","fen":"6r2/4k4/1r3a3/9/2b6/2C6/7C1/c8/N8/3K5","turn":"b","n":3},
  {"lv":"mid","fen":"6P2/4k4/8b/5cr2/2R3bn1/9/9/R3B4/9/5K3","turn":"r","n":2},
  {"lv":"mid","fen":"2b6/9/1N3k3/r8/2b6/3p3C1/4r4/2C6/9/5K3","turn":"b","n":3},
  {"lv":"mid","fen":"9/7R1/4k4/7R1/9/8c/6Pp1/4KA3/5p3/9","turn":"r","n":2},
  {"lv":"mid","fen":"9/2rkC4/2P6/9/2N3r2/5p3/9/3K1A3/9/5A3","turn":"b","n":3},
  {"lv":"mid","fen":"9/1R3P3/3k5/9/5r3/2P6/p8/8p/9/2B1K1B2","turn":"r","n":3},
  {"lv":"mid","fen":"P2k5/8P/b3n4/1P7/6b2/9/6r1r/3A5/9/3K5","turn":"b","n":2},
  {"lv":"mid","fen":"6b2/4n4/2P1bk3/1c7/9/2B3B2/1C7/4R4/5n3/4K4","turn":"r","n":2},
  {"lv":"mid","fen":"9/3k2N1c/9/9/9/9/2r2C3/5p3/3K5/C8","turn":"b","n":2},
  {"lv":"mid","fen":"8r/9/5k3/9/9/2R6/C1R6/B4K3/2n5n/9","turn":"r","n":3},
  {"lv":"mid","fen":"4r1b2/3k5/6C2/2r6/9/8N/9/N8/4c4/5K3","turn":"b","n":3},
  {"lv":"mid","fen":"R5N2/6n2/5k2b/3c5/2b6/2p3B2/9/3K5/6R2/9","turn":"r","n":3},
  {"lv":"mid","fen":"5kb2/6C2/b8/8r/9/5rP2/9/9/3N5/4K2c1","turn":"b","n":3},
  {"lv":"hard","fen":"2n2kr2/1n7/5a2b/9/2R3b2/5r3/9/1R1RB3B/4K4/7R1","turn":"r","n":4},
  {"lv":"hard","fen":"2bk5/5n3/1C1a5/P8/6bcN/2B6/9/B2K5/Cr2A1n2/9","turn":"b","n":3},
  {"lv":"hard","fen":"3k2NP1/R8/C2a1a3/2p6/9/9/5n3/3A5/3K5/p1p6","turn":"r","n":3},
  {"lv":"hard","fen":"3N5/1r2k1C2/8b/9/9/9/9/3AB1r2/n4K3/R1Np5","turn":"b","n":3},
  {"lv":"hard","fen":"6b2/2n6/b3k4/9/1n7/2B1n1R2/1rC6/3A5/8R/R2K5","turn":"r","n":3},
  {"lv":"hard","fen":"5a3/4C4/3kNa3/2P5N/9/5r3/9/9/3n2p2/3AK2c1","turn":"b","n":3},
  {"lv":"hard","fen":"3r2c2/4k4/8R/R2R5/P5b2/2B5c/9/5K3/9/2p6","turn":"r","n":3},
  {"lv":"hard","fen":"3a5/P2k2P2/9/6P2/P8/7p1/4p4/B2K4B/2r1n4/3A5","turn":"b","n":3},
  {"lv":"hard","fen":"3k1a3/4a4/bR3c3/7C1/4P1p2/6R2/9/9/5K3/2c3B1n","turn":"r","n":4},
  {"lv":"hard","fen":"2b3b1N/5k3/5a3/3r2R2/1N4c1c/9/8R/5K3/6r2/6B2","turn":"b","n":3},
  {"lv":"hard","fen":"9/4ck3/b1n1b4/7P1/2b3nR1/9/8p/4N4/4A3R/2BK5","turn":"r","n":3},
  {"lv":"hard","fen":"3k1r1P1/9/b2a1P3/9/9/9/6p2/C2K4B/R8/1r5r1","turn":"b","n":3},
  {"lv":"hard","fen":"9/9/1P2bk2c/1R1n2n2/4r2N1/9/9/3A5/2R6/3A1KB2","turn":"r","n":4},
  {"lv":"hard","fen":"2bc5/1C5C1/3k1a3/3c3P1/1N7/7n1/8p/3K4B/9/5A3","turn":"b","n":4},
  {"lv":"hard","fen":"1c1a3c1/6PR1/4k3b/9/n8/9/9/3cB2R1/9/3C1K3","turn":"r","n":4},
  {"lv":"hard","fen":"6R2/4akn2/2C6/2p2r3/9/9/9/B1C1B2Cr/9/3K1A3","turn":"b","n":4},
  {"lv":"hard","fen":"3k5/9/3a1a3/7n1/6c2/1RN1c4/7c1/5R3/8R/4KA3","turn":"r","n":4},
  {"lv":"hard","fen":"1Pb6/6c2/b3k3b/3P5/8p/6n2/3C5/3K5/6r2/3A4C","turn":"b","n":4},
  {"lv":"hard","fen":"9/1R7/c2k1n1R1/9/6b2/8R/p8/4B3B/4A2p1/4K2R1","turn":"r","n":4},
  {"lv":"hard","fen":"9/4ckN2/2ca4r/9/N1b3b2/1r7/6CR1/B2K5/4A4/3A5","turn":"b","n":4}];
/* ==/JH_SP_Q== */
/* 一輪 3 題：同一天、同一級固定；同一題不重複 */
function jhSpRound(lv,day){const P=JH_SP_Q.filter(q=>q.lv===lv);if(!P.length)return[];const o=[],used=new Set();let h=jhSpHash("shunpao:"+day+":"+lv);
  for(let k=0;o.length<Math.min(3,P.length)&&k<200;k++){h=jhSpHash(h+"|");const i=h%P.length;if(used.has(i))continue;used.add(i);o.push(P[i])}return o}
function jhSpDayXP(){const G=jhSpGet(),d=jhSpDay();if(G.d===d)return 0;G.d=d;jhSpSet(G);if(typeof addXP==="function")try{addXP(10,jhL("搶攻算殺步","Count to mate"),"shunpao:"+d)}catch(e){}return 10}
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
  sheet(jhL("🥊 練拳木樁・搶攻算殺步","🥊 Practice post · Count to mate"),b=>{
    b.innerHTML=`<p class="muted">${esc(jhL("霍驚瀾：「鹽船走水路拼的是先手，算準幾步逼出殺著，拳風才不會落空！」","Huo Jinglan: \"Salt boats race for the lead. Count how many moves to force mate, or your punch hits nothing!\""))}</p>
      <p class="muted">${esc(jhL("殺步＝一路叫將、對方怎麼應都擋不住，第幾步將死。","Mate count = check on every move until mate, whatever the defence."))}</p>
      <div class="jh-sp-lv">${JH_SP_LV.map(x=>`<button class="btn ${x.k===L.k?"":"ghost"}" data-lv="${x.k}">${esc(jhL(x.zh,x.en))}</button>`).join("")}</div>
      <p id="jhSpQ" class="jh-sp-q"></p><div id="jhSpB" class="jh-sp-bd"></div>
      <div class="jh-sp-pick">${L.opt.map(n=>`<button class="btn" data-n="${n}">${esc(jhL(n+" 步",n+(n>1?" moves":" move")))}</button>`).join("")}</div>
      <div class="jh-actions"><button class="btn ghost" id="jhSpH">${esc(jhL("💡 提示","💡 Hint"))}</button><button class="btn ghost" id="jhSpP" style="display:none">${esc(jhL("▶ 再看一次殺法","▶ Replay the mate"))}</button><button class="btn" id="jhSpN" style="display:none"></button></div>
      <p id="jhSpS" class="jh-mate-say" style="display:none"></p>`;
    const $=s=>b.querySelector(s);let cur=null,bd=null,done=false,timer=0;const brd=Board(()=>{});$("#jhSpB").append(brd.svg);
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{clearTimeout(timer);try{closeSheet()}catch(e){}setTimeout(()=>jhShunpaoOpen(x.dataset.lv),250)});
    const say=t=>{const s=$("#jhSpS");s.style.display=t?"":"none";s.textContent=t||""};
    const pick=on=>b.querySelectorAll("[data-n]").forEach(x=>x.disabled=!on);
    /* 逐步示範殺法：每 0.8 秒走一步，最後停在將死的盤面 */
    const play=()=>{clearTimeout(timer);const M=jhSpLine(C.parseFen(cur.fen),cur.turn,cur.n);let x=C.parseFen(cur.fen),i=0;brd.draw(x,{});
      const step=()=>{if(i>=M.length)return;const[f,t]=M[i];x=C.make(x,f,t);brd.draw(x,{last:{f,t}});i++;if(i<M.length)timer=setTimeout(step,800)};timer=setTimeout(step,500)};
    const start=()=>{clearTimeout(timer);cur=Q[qi];bd=C.parseFen(cur.fen);done=false;say("");pick(true);$("#jhSpN").style.display="none";$("#jhSpP").style.display="none";brd.draw(bd,{});
      $("#jhSpQ").textContent=jhL(`第 ${qi+1}／${Q.length} 題：輪${jhSpSide(cur.turn)}走。${jhSpSide(cur.turn)}方最快幾步能連將殺？（每一步都要叫將）`,`${qi+1}/${Q.length}: ${jhSpSide(cur.turn)} to move. In how many checking moves can ${jhSpSide(cur.turn)} force mate?`)};
    const answer=n=>{if(done)return;done=true;pick(false);const ok=n===cur.n;
      if(ok){right++;run++}else run=0;jhSpStreak(run);
      say((ok?jhL("算得俐落！搶到先手就佔了上風。","Sharp counting! Seizing the initiative wins."):jhL(`算差了：最快是 ${cur.n} 步。再看一次叫將路數。`,`Not quite: the fastest is ${cur.n}. Watch the checking line again.`))+" "+jhL("盤上正在一步一步示範殺法。","The board is showing the mate move by move."));
      play();$("#jhSpP").style.display="";
      const nb=$("#jhSpN");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("收工","Finish");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;start();return}clearTimeout(timer);nb.style.display="none";$("#jhSpP").style.display="none";const xp=right===Q.length?jhSpDayXP():0,st=jhSpGet().st;
        say(jhL(`這一輪算對 ${right}／${Q.length} 題；今天最多連對 ${st} 題。${xp?`全對，修為 +${xp}`:""}`,`${right}/${Q.length} right; best streak today: ${st}.${xp?` All right: +${xp} XP`:""}`))}};
    b.querySelectorAll("[data-n]").forEach(x=>x.onclick=()=>answer(+x.dataset.n));
    $("#jhSpP").onclick=()=>{if(cur&&done)play()};
    $("#jhSpH").onclick=()=>{if(!cur||done)return;const M=jhSpLine(bd,cur.turn,cur.n);if(M.length)brd.draw(bd,{last:{f:M[0][0],t:M[0][1]}});
      say(jhL(`提示：盤上畫的是${jhSpSide(cur.turn)}方第一步叫將。接下來對方怎麼應，你都要再叫將。`,`Hint: the board shows ${jhSpSide(cur.turn)}'s first check. Whatever the reply, keep checking.`))};
    start()})}
