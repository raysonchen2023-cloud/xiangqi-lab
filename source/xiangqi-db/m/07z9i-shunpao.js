/* ---------- W48-S6 順炮門門內玩法「搶攻算殺步」（計步）----------
   開發者 11/22：「把門派任務分給其他三個人平行做完剩下的門派」；定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 2 節＋_Claude審稿.md。
   掌門霍驚瀾是淮河鹽船的護船拳師。題目寫明輪誰走，玩家算輪走方最快幾步能連將殺，答完在盤上一步一步示範殺法。
   「殺步」＝連將殺的步數：攻方每一步都要叫將，守方怎麼應都擋不住，第幾步將死（小學生最常漏算的就是叫將、擋將的步數）。
   PR #53 審查（iMac Claude 2、Windows Claude 1 預驗）：原本比「紅黑誰先殺到」，但連將殺時輪走方只要有殺就一定先殺到（對方只能應將），題目不成立；
     開發者 11/22 選單改成「改問『最快幾步殺』——只問輪走方最快幾步連將殺，選 1／2／3 步（高級到 4）；答案程式算得準，扣『計步』本意。答對後在盤上示範殺法」。
   W48 順炮 P3（Windows Claude 1 回報、開發者 11/23 選「滑動窗口三選一」）：原本畫面給 3～4 個選項、題庫每級只有 2 種答案，
     玩幾題就知道某些選項永遠不對（等於二選一）。改成每級三個連續步數，題庫每個選項各 10 題，選項跟題庫答案由 CI 核對一致：
     初級：雙方各 2 顆攻子，選項＝答案 1／2／3 步。
     中級：各 3 顆攻子＋0～2 顆仕相，選項＝答案 2／3／4 步。
     高級：各 4 顆攻子＋1～3 顆仕相，選項＝答案 3／4／5 步。
   題目由 tools/shunpao-build.js 用固定種子擺子、用本模組的 jhSpFastest 窮舉後寫進下面 JH_SP_Q（不用引擎、不另放資料檔，預覽站也能玩）；
   CI 的 test-jh-shunpao-1122.js 用另一套獨立寫的連將殺搜尋重算每一題，並確認少一步殺不了。
   提示：亮出最快那一路的第一步叫將。
   修為：一輪 3 題全對，每天 +10（只給一次）；另記今天最多連對幾題（算殺連對數）。不扣修為、不改棋局。
   門內頁的入口（鹽田海堤練拳木樁）等順炮門的門內圖出好再接；這裡先提供 jhShunpaoOpen()。 */
const JH_SP_LV=[
  {k:"easy",zh:"初級",en:"Easy",opt:[1,2,3]},
  {k:"mid",zh:"中級",en:"Medium",opt:[2,3,4]},
  {k:"hard",zh:"高級",en:"Hard",opt:[3,4,5]}];   /* W48 順炮 P3（開發者 11/23 選「滑動窗口三選一」）：每級三個選項，題庫每個選項各 10 題，沒有永遠不對的選項 */
const JH_SP_MAX=Math.max(...JH_SP_LV.flatMap(x=>x.opt));   /* 最多問幾步殺：跟著選項走（高級 5 步） */
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
  {"lv":"easy","fen":"3k5/9/9/3P5/1r7/9/7C1/9/4K1n2/9","turn":"b","n":1},
  {"lv":"easy","fen":"9/5P3/4k4/9/7R1/4pp3/9/9/5K3/9","turn":"r","n":1},
  {"lv":"easy","fen":"9/4k4/r7P/9/9/6C2/6r2/9/5K3/9","turn":"b","n":1},
  {"lv":"easy","fen":"9/3rk4/9/9/1N6c/1R7/9/9/9/5K3","turn":"r","n":2},
  {"lv":"easy","fen":"9/4k3n/9/3P5/9/2P3r2/9/9/9/3K5","turn":"b","n":1},
  {"lv":"easy","fen":"7R1/4P4/3k5/9/9/1c2p4/9/5K3/9/9","turn":"r","n":1},
  {"lv":"easy","fen":"9/4k4/9/8C/9/9/1R7/6r2/5r3/3K5","turn":"b","n":1},
  {"lv":"easy","fen":"9/5k3/9/9/9/9/1pC5c/4K4/9/5C3","turn":"r","n":1},
  {"lv":"easy","fen":"9/3R5/4k4/8r/9/2r6/9/9/7R1/5K3","turn":"b","n":2},
  {"lv":"easy","fen":"9/3N5/2nk1r3/9/9/1R7/9/9/4K4/9","turn":"r","n":2},
  {"lv":"easy","fen":"6r2/4k4/9/8r/9/9/9/3K1R3/2N6/9","turn":"b","n":2},
  {"lv":"easy","fen":"9/6R2/3k5/9/4n4/9/6r2/4K4/9/8R","turn":"r","n":3},
  {"lv":"easy","fen":"1r1N5/4k4/9/1N7/9/9/9/9/9/3K3n1","turn":"b","n":2},
  {"lv":"easy","fen":"4k3r/9/R8/3R5/9/5c3/9/9/5K3/9","turn":"r","n":2},
  {"lv":"easy","fen":"9/7r1/4k1C2/9/9/1r7/9/2N6/9/5K3","turn":"b","n":1},
  {"lv":"easy","fen":"9/6RR1/3nk4/9/9/8n/9/9/5K3/9","turn":"r","n":1},
  {"lv":"easy","fen":"9/9/4k4/9/r8/2p6/2PR5/5K3/9/9","turn":"b","n":2},
  {"lv":"easy","fen":"9/9/5k1n1/9/9/4R4/9/1c7/4K3R/9","turn":"r","n":2},
  {"lv":"easy","fen":"9/9/4k4/5R3/9/6r2/9/2r6/5KN2/9","turn":"b","n":2},
  {"lv":"easy","fen":"3k5/9/6c2/9/N8/9/5R3/4K2p1/9/9","turn":"r","n":2},
  {"lv":"easy","fen":"9/P8/5k3/9/9/9/7r1/9/4K4/5r1N1","turn":"b","n":3},
  {"lv":"easy","fen":"9/9/4k4/9/2R4c1/9/5p3/3K1R3/9/9","turn":"r","n":3},
  {"lv":"easy","fen":"4k4/9/9/9/1r7/3R5/6r2/3K5/9/8R","turn":"b","n":3},
  {"lv":"easy","fen":"4k4/5c3/6N2/9/9/9/8c/6R2/3K5/9","turn":"r","n":3},
  {"lv":"easy","fen":"3r5/3k5/9/5N3/2r6/9/9/5K2N/9/9","turn":"b","n":3},
  {"lv":"easy","fen":"3k5/9/9/9/r6R1/c8/4R4/4K4/9/9","turn":"r","n":3},
  {"lv":"easy","fen":"9/4k3N/9/9/4n4/9/9/3K5/5C3/4r4","turn":"b","n":3},
  {"lv":"easy","fen":"9/9/4k4/9/4N4/6c2/9/9/3R1K2p/9","turn":"r","n":3},
  {"lv":"easy","fen":"9/r2k5/9/9/2R6/9/4C4/6r2/4K4/9","turn":"b","n":3},
  {"lv":"mid","fen":"9/1N2n4/1Pr2k3/9/9/1cB6/9/9/4K4/R8","turn":"r","n":2},
  {"lv":"mid","fen":"4k4/4a4/7n1/9/2b6/9/1C4P2/3A5/4K4/1C5rr","turn":"b","n":2},
  {"lv":"mid","fen":"5a3/9/b2k5/2R6/9/1R1r4p/2r6/9/6C2/2B2K3","turn":"r","n":2},
  {"lv":"mid","fen":"9/9/3ak4/6R2/5c3/P8/9/9/1rnK1C3/6B2","turn":"b","n":3},
  {"lv":"mid","fen":"9/9/3aka3/9/3C4r/9/Rn7/4p4/4RK3/9","turn":"r","n":2},
  {"lv":"mid","fen":"3a5/2r6/5k3/8C/2b6/9/P8/9/3K1p1p1/3R5","turn":"b","n":2},
  {"lv":"mid","fen":"3a2N2/9/3k5/1n7/5r3/9/R8/4K4/8r/7R1","turn":"r","n":4},
  {"lv":"mid","fen":"2bak4/9/9/6P2/9/1n7/r3N4/9/N2K5/r8","turn":"b","n":3},
  {"lv":"mid","fen":"5k3/9/3cP4/9/3P5/9/9/BR2K4/9/n4A2p","turn":"r","n":4},
  {"lv":"mid","fen":"4n2N1/4a4/3ak4/5P3/5c3/9/5n3/3A4N/9/3K5","turn":"b","n":2},
  {"lv":"mid","fen":"4k4/5C3/9/5R3/9/9/8R/c3n3p/3K5/9","turn":"r","n":2},
  {"lv":"mid","fen":"5k2C/9/P8/9/6p2/3R5/8r/3n5/9/3K5","turn":"b","n":2},
  {"lv":"mid","fen":"9/9/3k5/5Rp2/3r5/4p4/9/R5C2/4AK3/9","turn":"r","n":3},
  {"lv":"mid","fen":"c4a3/r8/5kC2/9/2b6/9/9/5r2B/6C2/3NK4","turn":"b","n":4},
  {"lv":"mid","fen":"4r4/4k1Nn1/b8/5R3/N8/2B3B2/9/1r7/5K3/9","turn":"r","n":2},
  {"lv":"mid","fen":"2N6/8r/4k4/5P3/9/5N3/9/3K1A3/4r4/n5B2","turn":"b","n":3},
  {"lv":"mid","fen":"4N4/1C3k3/3R5/9/9/1cB6/9/B2Kn4/c8/9","turn":"r","n":2},
  {"lv":"mid","fen":"2b1R4/3k5/7N1/9/9/9/1n2nR3/2r6/9/4KA3","turn":"b","n":3},
  {"lv":"mid","fen":"4k4/9/9/7N1/6b2/5R3/r8/5K2p/4AC3/7r1","turn":"r","n":3},
  {"lv":"mid","fen":"2r3b2/9/3k5/7P1/6c2/3C5/9/5K3/9/2N5r","turn":"b","n":3},
  {"lv":"mid","fen":"3N5/3k4C/b5cR1/9/n1b6/9/9/8B/5K3/5n3","turn":"r","n":4},
  {"lv":"mid","fen":"4k4/9/r8/9/7N1/8R/3C3c1/3K5/4c4/9","turn":"b","n":3},
  {"lv":"mid","fen":"5R3/9/2C1k4/9/4P4/p5B2/9/4Kn3/4n4/2B6","turn":"r","n":4},
  {"lv":"mid","fen":"4P1b2/5k3/3R5/9/7r1/1C7/r8/3K4B/7n1/5A3","turn":"b","n":4},
  {"lv":"mid","fen":"3k5/6C2/9/8n/4p4/R2p2B2/8C/4K4/9/9","turn":"r","n":3},
  {"lv":"mid","fen":"3a1k2N/9/1P7/9/r1b4N1/3c5/9/9/8n/4K4","turn":"b","n":4},
  {"lv":"mid","fen":"3N5/1c2k4/1c7/9/5R3/R8/9/5A2p/5K3/3A5","turn":"r","n":3},
  {"lv":"mid","fen":"4k4/1N7/4n3r/9/6R2/9/r8/3A5/3K5/5N3","turn":"b","n":4},
  {"lv":"mid","fen":"4k4/9/7Rb/5n3/2n6/1N7/3R5/9/9/3Kc4","turn":"r","n":4},
  {"lv":"mid","fen":"9/9/r4k3/8P/r8/2C1p2R1/9/5A3/9/3K5","turn":"b","n":4},
  {"lv":"hard","fen":"1P3a3/c8/4k4/1N7/6R2/7p1/9/5A3/3K1c3/2B2r2R","turn":"r","n":3},
  {"lv":"hard","fen":"1CN3b2/3k4n/8r/9/3r5/8R/8p/B2A1K3/9/2C6","turn":"b","n":3},
  {"lv":"hard","fen":"5a3/3k5/9/9/C8/p1N4r1/8R/1R1Ap4/8n/3AK4","turn":"r","n":4},
  {"lv":"hard","fen":"3k5/4aR3/5aP2/9/6C2/5rB1n/3p5/3r1R3/5K3/5A3","turn":"b","n":4},
  {"lv":"hard","fen":"1R1a1a3/9/5k2b/7Rr/6c2/9/2P6/B2K5/5c1Cr/3A1A3","turn":"r","n":3},
  {"lv":"hard","fen":"2b1ka3/R6c1/9/9/9/2N6/3n5/2r1Nr3/3K2C2/2B2A3","turn":"b","n":3},
  {"lv":"hard","fen":"5k3/6Rn1/8b/9/9/7r1/2C6/4KA3/6R2/2p2N2p","turn":"r","n":3},
  {"lv":"hard","fen":"9/9/3k1a3/6R1n/2b1R1b1C/9/c1r6/4K4/2c1A1C2/9","turn":"b","n":4},
  {"lv":"hard","fen":"9/1n1P5/rN1kb1P2/c5p2/9/9/9/B2AK4/2C6/9","turn":"r","n":3},
  {"lv":"hard","fen":"4k4/3r1C3/9/9/3C2b2/n5B2/9/2NAp4/5K1N1/2B1p4","turn":"b","n":3},
  {"lv":"hard","fen":"3a2n2/5N2C/3ak2N1/9/6b2/2R1p4/8p/3n1K2B/4A4/5A3","turn":"r","n":3},
  {"lv":"hard","fen":"3ak4/3r1N3/8c/7P1/5n3/8R/9/8B/2N4p1/2B2K3","turn":"b","n":4},
  {"lv":"hard","fen":"5P3/n2k5/3a4b/8r/5R2p/1R4B2/9/C2A3c1/9/2BK5","turn":"r","n":3},
  {"lv":"hard","fen":"c2N1a3/4P4/2Ra1k3/4r4/4nP3/2B6/4n4/5K3/9/6B2","turn":"b","n":3},
  {"lv":"hard","fen":"1RP6/9/bn1a1k2r/5r3/2p3b2/9/9/4K4/4A4/3R3N1","turn":"r","n":4},
  {"lv":"hard","fen":"3k3C1/4a4/3N4b/5c3/N6c1/9/2P3r2/1n1K5/9/2BA1A3","turn":"b","n":5},
  {"lv":"hard","fen":"2n2a3/4a4/1N2k3b/9/R3p4/cpP6/9/1C7/4A4/2BK1A3","turn":"r","n":4},
  {"lv":"hard","fen":"1CP2a3/4k4/9/9/9/8n/P2n1N3/5p3/4A3r/3K5","turn":"b","n":4},
  {"lv":"hard","fen":"5kb2/9/4ba3/6r2/9/R8/6C2/1C1p4R/1n1c5/2B1K4","turn":"r","n":4},
  {"lv":"hard","fen":"2b1n4/5k3/4ba3/6Pr1/6C2/P8/2r6/4B4/N3Ac3/2BK5","turn":"b","n":5},
  {"lv":"hard","fen":"6b2/4N4/3c1k3/9/5P1C1/2B6/2r6/4K3c/4A4/3A3pN","turn":"r","n":4},
  {"lv":"hard","fen":"2b1ka3/8r/3P1aR2/4P4/6r2/7n1/2n6/9/8C/3A1K3","turn":"b","n":5},
  {"lv":"hard","fen":"2r3b2/5k1P1/8b/n5PC1/1r7/9/9/5A3/8p/4KABR1","turn":"r","n":5},
  {"lv":"hard","fen":"5a2R/1N2k4/2P1b4/c7R/2b6/6B2/9/2p2r3/9/3K1nB2","turn":"b","n":4},
  {"lv":"hard","fen":"9/2r1ak3/R4a3/9/6bN1/6B2/5c3/1c1N1A2R/4n4/3K5","turn":"r","n":5},
  {"lv":"hard","fen":"P4a3/6R2/3k1n3/4R4/2b6/9/9/4K4/1C5p1/r4A2c","turn":"b","n":5},
  {"lv":"hard","fen":"8C/1n7/4k4/5P1R1/2b1N4/6B2/9/4r4/7r1/2n2K3","turn":"r","n":5},
  {"lv":"hard","fen":"P1b2a3/4P4/1c1k1ar2/4N4/1n7/9/9/B2cK1N2/4A4/6B2","turn":"b","n":5},
  {"lv":"hard","fen":"2ra5/5k3/N4aP2/6R2/9/2p1p2p1/6C2/9/4A4/3K5","turn":"r","n":5},
  {"lv":"hard","fen":"3r1a3/3k1C3/2C6/9/2P5P/9/n8/2pA1p3/4K4/9","turn":"b","n":5}];
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
