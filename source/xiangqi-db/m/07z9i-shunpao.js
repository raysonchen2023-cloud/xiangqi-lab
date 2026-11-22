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
  {"lv":"easy","fen":"9/P4k3/7c1/9/9/9/r8/3C1K3/9/9","turn":"b","n":2},
  {"lv":"easy","fen":"9/5k3/9/9/5c3/9/R4p2R/9/3K5/9","turn":"r","n":2},
  {"lv":"easy","fen":"3k5/9/9/3P5/1r7/9/7C1/9/4K1n2/9","turn":"b","n":1},
  {"lv":"easy","fen":"9/5P3/4k4/9/7R1/4pp3/9/9/5K3/9","turn":"r","n":1},
  {"lv":"easy","fen":"9/4k4/r7P/9/9/6C2/6r2/9/5K3/9","turn":"b","n":1},
  {"lv":"easy","fen":"9/5k3/9/2R6/3r5/R8/9/3c5/5K3/9","turn":"r","n":3},
  {"lv":"easy","fen":"6r2/5k3/9/9/9/9/9/N2K5/1r7/1C7","turn":"b","n":1},
  {"lv":"easy","fen":"9/3rk4/9/9/1N6c/1R7/9/9/9/5K3","turn":"r","n":2},
  {"lv":"easy","fen":"5k1P1/2r6/4r4/9/9/9/9/3R5/9/5K3","turn":"b","n":2},
  {"lv":"easy","fen":"5k3/P8/9/p8/R8/9/9/9/9/p3K4","turn":"r","n":1},
  {"lv":"easy","fen":"9/4k3n/9/3P5/9/2P3r2/9/9/9/3K5","turn":"b","n":1},
  {"lv":"easy","fen":"7R1/4P4/3k5/9/9/1c2p4/9/5K3/9/9","turn":"r","n":1},
  {"lv":"easy","fen":"9/4k4/9/8C/9/9/1R7/6r2/5r3/3K5","turn":"b","n":1},
  {"lv":"easy","fen":"5k3/9/R8/6R2/9/9/9/9/n7r/5K3","turn":"r","n":3},
  {"lv":"easy","fen":"9/4k4/9/7r1/1r7/2C6/9/3K4C/9/9","turn":"b","n":2},
  {"lv":"easy","fen":"9/5k3/9/9/9/9/1pC5c/4K4/9/5C3","turn":"r","n":1},
  {"lv":"easy","fen":"9/7P1/5k3/1r7/9/9/9/8r/1N7/3K5","turn":"b","n":3},
  {"lv":"easy","fen":"8R/N2k5/9/9/9/8p/9/7p1/5K3/9","turn":"r","n":3},
  {"lv":"easy","fen":"9/3R5/4k4/8r/9/2r6/9/9/7R1/5K3","turn":"b","n":2},
  {"lv":"easy","fen":"9/3N5/2nk1r3/9/9/1R7/9/9/4K4/9","turn":"r","n":2},
  {"lv":"easy","fen":"6r2/4k4/9/8r/9/9/9/3K1R3/2N6/9","turn":"b","n":2},
  {"lv":"easy","fen":"9/6R2/3k5/9/4n4/9/6r2/4K4/9/8R","turn":"r","n":3},
  {"lv":"easy","fen":"9/4k4/2R6/1N7/9/7n1/9/6r2/9/4K4","turn":"b","n":2},
  {"lv":"easy","fen":"4rk3/9/4r3N/9/9/9/9/9/3R5/5K3","turn":"r","n":2},
  {"lv":"easy","fen":"9/4k4/9/1R7/9/9/9/9/7p1/5K1Cr","turn":"b","n":3},
  {"lv":"easy","fen":"9/9/4k4/9/2R4c1/9/5p3/3K1R3/9/9","turn":"r","n":3},
  {"lv":"easy","fen":"4k4/9/9/9/1r7/3R5/6r2/3K5/9/8R","turn":"b","n":3},
  {"lv":"easy","fen":"4k4/5c3/6N2/9/9/9/8c/6R2/3K5/9","turn":"r","n":3},
  {"lv":"easy","fen":"3r5/3k5/9/5N3/2r6/9/9/5K2N/9/9","turn":"b","n":3},
  {"lv":"mid","fen":"3r5/4k4/8R/3r1C2r/9/2BR5/9/4K4/9/6B2","turn":"r","n":4},
  {"lv":"mid","fen":"5kb2/6C2/b8/8r/9/5rP2/9/9/3N5/4K2c1","turn":"b","n":3},
  {"lv":"mid","fen":"n2a1a3/3kn3N/8n/2R6/9/9/9/R8/5K3/9","turn":"r","n":3},
  {"lv":"mid","fen":"5N3/1r7/5k3/r8/9/9/9/4K4/3RN1r2/9","turn":"b","n":2},
  {"lv":"mid","fen":"5r3/4C4/5k3/9/9/2p1p4/9/4R2R1/3K5/6B2","turn":"r","n":2},
  {"lv":"mid","fen":"4P4/4k1C2/9/9/5n3/9/n8/3A1K3/3r5/1N7","turn":"b","n":3},
  {"lv":"mid","fen":"5N3/9/5k3/9/3n5/R5C2/9/4K4/2r5p/2B6","turn":"r","n":3},
  {"lv":"mid","fen":"1R1a5/9/3k4b/2P6/9/9/1r4n2/1C3p3/9/4K4","turn":"b","n":3},
  {"lv":"mid","fen":"1Pbc2b2/4Nk3/9/9/9/r5B2/9/4K4/9/2B3R1n","turn":"r","n":2},
  {"lv":"mid","fen":"9/3c1k3/7P1/9/3R5/7r1/9/2N6/5K3/1p3A3","turn":"b","n":3},
  {"lv":"mid","fen":"2b2k3/3n3P1/1N7/9/2b6/9/3p5/9/n1R6/4K1B2","turn":"r","n":2},
  {"lv":"mid","fen":"7n1/r4P3/4k4/9/6b2/2P3B2/9/c2K5/2N6/5A3","turn":"b","n":2},
  {"lv":"mid","fen":"R8/c3k2c1/5NN2/1r7/9/2B6/9/9/4A4/3K5","turn":"r","n":3},
  {"lv":"mid","fen":"2b6/5k3/9/P4c2C/2b4r1/3n5/9/B2A5/4K4/8C","turn":"b","n":4},
  {"lv":"mid","fen":"1R4N2/5k3/7c1/4R4/9/6B2/9/9/1p3K3/2c6","turn":"r","n":2},
  {"lv":"mid","fen":"4k4/4a4/7n1/9/2b6/9/1C4P2/3A5/4K4/1C5rr","turn":"b","n":2},
  {"lv":"mid","fen":"5a3/9/b2k5/2R6/9/1R1r4p/2r6/9/6C2/2B2K3","turn":"r","n":2},
  {"lv":"mid","fen":"9/9/3ak4/6R2/5c3/P8/9/9/1rnK1C3/6B2","turn":"b","n":3},
  {"lv":"mid","fen":"5n3/5k3/r8/9/8R/3N5/8R/2n2A3/3K5/9","turn":"r","n":3},
  {"lv":"mid","fen":"2bk5/9/7N1/7r1/4R4/P4r3/2c6/5A3/9/3K5","turn":"b","n":4},
  {"lv":"mid","fen":"5nb2/N8/3k5/9/1P7/3pR4/9/9/8n/5K3","turn":"r","n":2},
  {"lv":"mid","fen":"3k3P1/9/9/5r3/7N1/9/4N2n1/3K1A3/4A4/1c7","turn":"b","n":3},
  {"lv":"mid","fen":"r5b2/9/5k3/1n7/4P1b2/9/2R6/7C1/5K3/5p3","turn":"r","n":4},
  {"lv":"mid","fen":"8r/4k4/9/9/c5b2/1C7/5c3/3K5/9/R2A2R2","turn":"b","n":2},
  {"lv":"mid","fen":"9/9/2P1k4/9/9/c1R5n/8R/4B1n2/9/3K5","turn":"r","n":4},
  {"lv":"mid","fen":"9/8R/2c2k3/9/3C5/9/r5r2/8R/9/5K3","turn":"b","n":4},
  {"lv":"mid","fen":"3k5/9/9/9/9/4r4/1r6C/5KR2/2R6/p5B2","turn":"r","n":4},
  {"lv":"mid","fen":"3r5/3k5/2C6/6n2/P8/9/4Cr3/9/3K5/9","turn":"b","n":4},
  {"lv":"mid","fen":"9/4k1N2/4b4/1r1RN4/6b2/6r2/3n5/3K4B/9/3A5","turn":"r","n":4},
  {"lv":"mid","fen":"1P1k1a3/4C4/4b4/9/2N6/5r3/9/n2K5/4A4/3A3p1","turn":"b","n":4},
  {"lv":"hard","fen":"2r6/r8/R3bk3/3n2R2/3n5/R1B6/9/3A5/9/4K1B1C","turn":"r","n":4},
  {"lv":"hard","fen":"5N3/9/3k4b/1r6p/8P/1r7/9/4NA3/3K2N2/3p5","turn":"b","n":4},
  {"lv":"hard","fen":"1c1a3c1/6PR1/4k3b/9/n8/9/9/3cB2R1/9/3C1K3","turn":"r","n":4},
  {"lv":"hard","fen":"5kb2/6C1R/b1R6/9/9/7C1/rr3rp2/9/9/4K1B2","turn":"b","n":3},
  {"lv":"hard","fen":"9/9/3n1k3/1r7/2b4P1/9/2r5R/3RK1C2/2p6/6B2","turn":"r","n":4},
  {"lv":"hard","fen":"6b1C/9/1C2ka2b/6n2/4r4/C7p/4r4/7C1/5K3/2B6","turn":"b","n":3},
  {"lv":"hard","fen":"5a3/2N6/5k3/5r3/4R2r1/9/9/3A1A2B/2RK1R3/6p1n","turn":"r","n":4},
  {"lv":"hard","fen":"2R6/5k2r/b8/P2r5/1r7/6r2/6R2/B8/4AN3/4K4","turn":"b","n":5},
  {"lv":"hard","fen":"3R1c3/P5r2/b3ka3/9/4P4/4N4/9/2p2A3/5K3/2B1p4","turn":"r","n":5},
  {"lv":"hard","fen":"9/3k5/2N6/1P7/2b1n4/1N6p/4P4/5K3/2n3n2/5A3","turn":"b","n":3},
  {"lv":"hard","fen":"3k5/3ca3P/9/6C2/R8/4p4/1cr3N2/5K3/9/2B6","turn":"r","n":3},
  {"lv":"hard","fen":"1Pb6/6c2/b3k3b/3P5/8p/6n2/3C5/3K5/6r2/3A4C","turn":"b","n":4},
  {"lv":"hard","fen":"9/1R7/c2k1n1R1/9/6b2/8R/p8/4B3B/4A2p1/4K2R1","turn":"r","n":4},
  {"lv":"hard","fen":"2b2kc2/9/3N1P2b/9/9/rp7/6C2/1r3A3/9/4KABR1","turn":"b","n":3},
  {"lv":"hard","fen":"5a3/4a1c2/2N2k3/1R1c5/5N2N/1r4Br1/9/3K5/9/3A1A3","turn":"r","n":5},
  {"lv":"hard","fen":"9/4ckN2/2ca4r/9/N1b3b2/1r7/6CR1/B2K5/4A4/3A5","turn":"b","n":4},
  {"lv":"hard","fen":"3P1a2C/9/r4k3/2r3R1N/9/9/9/n2A1A2n/9/5K3","turn":"r","n":3},
  {"lv":"hard","fen":"2bk3C1/N3a4/9/r8/2c6/2R1c1R2/9/B4Kc2/9/2B6","turn":"b","n":3},
  {"lv":"hard","fen":"9/4k4/b2R5/3rP2R1/1P4r2/8c/9/9/4K4/4p1B2","turn":"r","n":3},
  {"lv":"hard","fen":"2b2a3/9/b3k4/3N3C1/9/8P/4p2r1/2c1B4/3K5/4r1R2","turn":"b","n":3},
  {"lv":"hard","fen":"3a1k3/9/b3C3N/1rN1Rn3/9/9/3p5/1p6B/9/3A1KB2","turn":"r","n":4},
  {"lv":"hard","fen":"2C1ka1R1/6r1P/9/9/6b2/7p1/1p5R1/4K3B/3n5/9","turn":"b","n":3},
  {"lv":"hard","fen":"2b6/3k5/2r2P3/9/7r1/1R7/7c1/4R4/1n3KR2/5A3","turn":"r","n":4},
  {"lv":"hard","fen":"3k1an2/r8/3a1a1N1/9/9/4C4/2C4n1/3KBn1C1/4A4/5A3","turn":"b","n":5},
  {"lv":"hard","fen":"1rb3c2/9/3k5/5r3/2R2C3/8R/9/3A1K3/4An3/2C3B2","turn":"r","n":5},
  {"lv":"hard","fen":"1Pb3N2/9/b2ak3c/6C2/9/9/6p2/5Kc2/2r1A1C2/9","turn":"b","n":5},
  {"lv":"hard","fen":"9/4k4/2Ra3n1/3C4N/9/2p6/6R1r/4BA3/c8/3K1A3","turn":"r","n":5},
  {"lv":"hard","fen":"P2P5/4k4/9/9/2b2r3/8R/cC7/2r6/4K4/2Bc1A3","turn":"b","n":5},
  {"lv":"hard","fen":"2C2a3/3P5/4bk2b/2N1P4/9/9/n4n3/6n2/c2KA4/3A1A3","turn":"r","n":5},
  {"lv":"hard","fen":"r2C2b2/5r3/3k1P3/9/4P4/8r/9/6Nc1/3K5/3A5","turn":"b","n":5}];
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
