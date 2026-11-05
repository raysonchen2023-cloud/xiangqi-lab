// 離線後端：在手機上處理原本要送到電腦的請求（網址與回傳格式跟 xiangqi-referee.js 相同），
// 讓同一套 App 畫面不連電腦也能用。只有 AI 對戰、AI 講解、同步棋譜要連上電腦。
"use strict";
var XQ=(function(){
  const C=XQCore,BASE=new URL("./",location.href).href;
  const{START,parseFen,fen,legal,inCheck,kingSq,iccs,parseSq,notate,opp,LEVELS:LEVELS8,stateApply,stateRebuild,judgeState,pickMove,ANALYZE_MS,classifyRaw,PLAYER,summary,fullItem,gameItem}=C;
  const gameId=()=>new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
  const ls={get(k,d){try{const v=localStorage.getItem("xq_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("xq_"+k,JSON.stringify(v))}catch(e){}}};

  // ---------- 手機裡的資料庫（IndexedDB）：同步來的棋譜、下完的棋局、分析快取 ----------
  const idb=(()=>{let dbp=null;
    const open=()=>dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open("xqlab",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
    const run=async(mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const t=db.transaction("kv",mode),r=fn(t.objectStore("kv"));t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})};
    return{get:k=>run("readonly",s=>s.get(k)),set:(k,v)=>run("readwrite",s=>s.put(v,k)),del:k=>run("readwrite",s=>s.delete(k)),
      many:async ks=>{const db=await open();return new Promise(res=>{const t=db.transaction("kv"),s=t.objectStore("kv"),out={};
        for(const k of ks){const r=s.get(k);r.onsuccess=()=>{if(r.result!==undefined)out[k]=r.result}}t.oncomplete=()=>res(out)})}}})();

  // ---------- Pikafish（網頁版）與評等 ----------
  window.evalPos=async(b,s,ms,multipv)=>{if(!legal(b,s).length)return{lines:[],dead:true};
    return XQEngine.search({fen:fen(b,s)},{movetime:ms||ANALYZE_MS},multipv||1)};
  async function classify(b,s,f,t){const k="g:"+fen(b,s)+"|"+iccs(f,t);const c=await idb.get(k);if(c)return c;
    const r=await classifyRaw(b,s,f,t);if(r)await idb.set(k,r);return r}
  // 依序評等一盤棋裡還沒評等的步
  // pause()：回傳 true 就先停下來（例如輪到電腦走，讓 Pikafish 先想棋，評等等一下再補）
  async function analyzeList(S,save,pause){
    for(let i=0;i<S.moves.length;i++){const m=S.moves[i];if(m.q)continue;if(pause&&pause())return;
      const[bs,sd]=S.pos[i].split(" ");let r=null;try{r=await classify(parseFen(bs),sd==="w"?"r":"b",m.f,m.t)}catch(e){return}
      if(S.moves[i]!==m)return;if(r)Object.assign(m,r);else m.q="—";save()}}
  const moveOut=m=>({f:m.f,t:m.t,by:m.by,cn:m.cn,ck:m.ck,q:m.q,loss:m.loss,ev:m.ev,bc:m.bc,bm:m.bm,bp:m.bp});
  const lastEv=ms=>{for(let i=ms.length-1;i>=0;i--)if(ms[i].ev!=null)return{v:ms[i].ev,ply:i+1};return null};
  const saveMoves=ms=>ms.map(m=>({f:m.f,t:m.t,by:m.by,q:m.q,loss:m.loss,ev:m.ev,bc:m.bc,bm:m.bm,bp:m.bp}));
  /* 意見回饋 619：存棋譜排隊一筆一筆來（以前兩筆同時存會互相蓋掉），同一個 id 不重複存 */
  let PG=Promise.resolve();
  function pushGame(kind,g){const p=PG.then(async()=>{const list=(await idb.get("games:"+kind))||[];if(g&&g.id&&list.some(x=>x.id===g.id))return;list.push(g);await idb.set("games:"+kind,list)});PG=p.catch(()=>{});return p}

  // ---------- 挑戰電腦 ----------
  let P=null,playBusy=false,playMsg="",paBusy=false;
  // 積分挑戰：跟線上對戰一樣的段位（新手～專2-2），但分開記分。電腦的強度跟著你目前的段位走，段位越高越難。
  const RANKS=[["新手",0],["入門1",50],["入門2",100],["入門3",150],["業1",200],["業2",300],["業3",400],["業4",500],["業5",600],["業6",700],["業7",800],["業8",900],["業9",1000],["專1-1",1150],["專1-2",1300],["專2-1",1500],["專2-2",1700]];
  const rankIdx=p=>{let i=0;for(let k=0;k<RANKS.length;k++)if((p||0)>=RANKS[k][1])i=k;return i};
  // 每個段位對應的電腦強度：算幾步（depth）、從前幾名著法裡挑（multipv）、可以比最好的差多少分（margin，越大越會失誤）
  const RLV=[{depth:1,multipv:10,margin:700},{depth:1,multipv:10,margin:500},{depth:2,multipv:8,margin:350},{depth:2,multipv:8,margin:260},
    {depth:3,multipv:6,margin:200},{depth:4,multipv:6,margin:150},{depth:5,multipv:5,margin:120},{depth:6,multipv:4,margin:90},{depth:7,multipv:4,margin:70},
    {depth:8,multipv:3,margin:50},{depth:9,multipv:3,margin:35},{depth:10,multipv:3,margin:25},{depth:12,multipv:2,margin:15},
    {movetime:300},{movetime:500},{movetime:1200},{movetime:3000}];
  /* 意見回饋 590（開發者：電腦的級數再細分，照 新手／入門×N／業×N／專×N）：挑戰電腦改成 18 級，名字和強度跟積分挑戰的段位一樣，最上面多一級「專3・全力」。
     舊的 1～8 級（石桌往事、擂台、園子路人傳來的 level，還有以前存的紀錄）照強度換算：1→入門1、2→入門3、3→業2、4→業5、5→業7、6→專1-2、7→專2-1、8→專3 */
  const LVDESC=x=>x.movetime?`每步想 ${x.movetime/1000} 秒，不放水`:`往後算 ${x.depth} 步，`+(x.margin>=500?"常常亂走":x.margin>=250?"會漏子":x.margin>=150?"偶有失誤":x.margin>=70?"小失誤":x.margin>=35?"很少失誤":"幾乎不失誤");
  const LEVELS=[...RLV,{movetime:6000}].map((x,i)=>({...x,n:i+1,name:i<RANKS.length?RANKS[i][0]:"專3・全力",desc:i===RLV.length?"每步想 6 秒，人類幾乎贏不了":LVDESC(x)}));
  const OLD2FINE=[6,2,4,6,9,11,15,16,18],lvOld=n=>OLD2FINE[Math.max(1,Math.min(8,Math.round(+n)||3))];
  const lvIn=b=>b&&b.lx!=null&&Number.isFinite(+b.lx)?Math.max(1,Math.min(LEVELS.length,Math.round(+b.lx))):lvOld(b&&b.level);
  (function lvMig(){if(ls.get("lvFine",0))return;try{
    const R=ls.get("record",null);if(R){const R2={};for(const[k,v]of Object.entries(R)){const o=R2[lvOld(k)]||(R2[lvOld(k)]={w:0,l:0,d:0});for(const z of["w","l","d"])o[z]+=(v&&v[z])||0}ls.set("record",R2)}
    const B=ls.get("carBank",null);if(B){(B.hist||[]).forEach(h=>{if(h&&h.lv)h.lv=lvOld(h.lv)});if(B.byLv){const N={};for(const[k,v]of Object.entries(B.byLv)){const o=N[lvOld(k)]||(N[lvOld(k)]={w:0,l:0,d:0,pts:0});for(const z of["w","l","d","pts"])o[z]+=(v&&v[z])||0}B.byLv=N}ls.set("carBank",B)}
    const p=ls.get("play",null);if(p&&p.level){p.level=lvOld(p.level);ls.set("play",p)}
    const s2=ls.get("play2",null);if(s2){if(s2.moves){if(s2.level)s2.level=lvOld(s2.level)}else for(const g of Object.values(s2))if(g&&g.level)g.level=lvOld(g.level);ls.set("play2",s2)}
    try{const c=localStorage.getItem("m_cpuLevel");if(c!=null)localStorage.setItem("m_cpuLevel",JSON.stringify(lvOld(JSON.parse(c))))}catch(e){}
    Promise.resolve().then(async()=>{try{const list=await idb.get("games:play");if(list&&list.length){list.forEach(g=>{if(g&&g.level)g.level=lvOld(g.level)});await idb.set("games:play",list)}}catch(e){}});
  }catch(e){}ls.set("lvFine",1)})();
  const cpuRate=()=>ls.get("cpuRate",null)||{pts:0,w:0,l:0,d:0,hist:[]};
  /* 意見回饋 段位失準：跟線上一樣改成等級分的期望勝率（對手＝開局時那一段的電腦，強度取那一階的中間），不再固定贏 +20、輸 −15 */
  function cpuRateApply(res){const R=cpuRate(),before=R.pts,lo=RANKS[P.rk][1],hi=RANKS[P.rk+1]?RANKS[P.rk+1][1]:lo+200,op=(lo+hi)/2;
    const E=1/(1+Math.pow(10,(op-R.pts)/400)),K=((R.w||0)+(R.l||0)+(R.d||0))<15?48:32;
    let d=Math.round(K*((res==="w"?1:res==="d"?.5:0)-E));if(res==="w"&&d<1)d=1;if(res==="l"&&d>-1)d=-1;R.pts=Math.max(0,R.pts+d);d=R.pts-before;R[res]++;
    R.hist.unshift({id:P.id,res,d,pts:R.pts,rk:RANKS[P.rk][0],n:P.moves.length,why:P.result?P.result.why:"",at:Date.now()});R.hist=R.hist.slice(0,100);ls.set("cpuRate",R);
    P.rate={res,d,pts:R.pts,rank:RANKS[rankIdx(R.pts)][0],was:RANKS[rankIdx(before)][0]}}
  // 獎勵模式：贏棋拿點數（一點＝台幣一萬），存起來到車庫換車款模型；和棋拿四成，輸了 0 點
  const CAR_PTS=[1,2,3,4,6,8,10,12,15,22,30,38,45,52,60,120,180,250];   /* 590：18 級的獎勵點數（舊的 8 級那幾階照原本的點數） */
  const carBank=()=>ls.get("carBank",null)||{pts:0,earned:0,w:0,l:0,d:0,owned:{},hist:[]};
  function carApply(res){const B=carBank(),full=CAR_PTS[P.level-1]||0,d=res==="w"?full:res==="d"?Math.round(full*.4):0;
    B.pts+=d;B.earned+=d;B[res]++;const lv=(B.byLv=B.byLv||{})[P.level]||(B.byLv[P.level]={w:0,l:0,d:0,pts:0});lv[res]++;lv.pts+=d;   // 各難度的勝負和拿到的點數
    B.hist.unshift({id:P.id,res,d,lv:P.level,at:Date.now()});B.hist=B.hist.slice(0,100);ls.set("carBank",B);P.prize={res,d,pts:B.pts}}
  function carState(){const B=carBank();
    // 各難度統計是後來才加的：第一次用對局紀錄（最近 100 盤）重算一次存起來，之前漏算的盤數補回來
    if(B.byLvV!==2){const byLv={};for(const h of B.hist){if(!h.lv||!h.res)continue;const x=byLv[h.lv]||(byLv[h.lv]={w:0,l:0,d:0,pts:0});x[h.res]++;x.pts+=h.d||0}B.byLv=byLv;B.byLvV=2;ls.set("carBank",B)}
    // 還是對不上的（很舊、沒記難度的盤）放進「難度未記錄」，讓上下的總數一致
    const byLv=B.byLv,sum={w:0,l:0,d:0};for(const x of Object.values(byLv))for(const k of["w","l","d"])sum[k]+=x[k]||0;
    const unk={w:Math.max(0,B.w-sum.w),l:Math.max(0,B.l-sum.l),d:Math.max(0,B.d-sum.d)};
    return{pts:B.pts,earned:B.earned,w:B.w,l:B.l,d:B.d,owned:B.owned,hist:B.hist.slice(0,20),table:CAR_PTS,byLv,unk,sold:B.sold||0}}
  async function carRedeem(b){const d=await (await fetch("data/cars.json")).json(),c=d.cars.find(x=>x.id===b.id);if(!c)throw new Error("找不到這台車");
    const B=carBank();if(B.owned[c.id])throw new Error("這台已經換過了");if(B.pts<c.cost)throw new Error("點數不夠，還差 "+(c.cost-B.pts)+" 點");
    B.pts-=c.cost;B.owned[c.id]={at:Date.now(),cost:c.cost};ls.set("carBank",B);return carState()}
  // 賣車：用現在 8891 的新車價（cars.json 裡的最低售價）打折舊——落地先折 15%，之後每個月再折 1%，最低剩 45%
  const carValue=(c,at)=>{const mo=Math.max(0,(Date.now()-at)/(30*864e5)),k=Math.max(.45,.85*Math.pow(.99,mo));return{k,mo,v:Math.floor(c.lo*k)}};
  async function carSell(b){const d=await (await fetch("data/cars.json")).json(),c=d.cars.find(x=>x.id===b.id);if(!c)throw new Error("找不到這台車");
    const B=carBank(),own=B.owned[c.id];if(!own)throw new Error("你沒有這台車");const{v}=carValue(c,own.at);
    delete B.owned[c.id];B.pts+=v;B.sold=(B.sold||0)+1;B.hist.unshift({sell:c.id,d:v,at:Date.now()});B.hist=B.hist.slice(0,100);ls.set("carBank",B);return{...carState(),gain:v}}
  /* 意見回饋 415：這盤用過幾次提示（/play/hint、雲河棋路的提示棋 /play/hintmark）、悔過幾次棋（/play/undo）。
     存檔時一起寄進對局紀錄，我的戰績算棋力、成長時把這種盤排除，才公平；舊存檔沒有這兩欄就照算 */
  const assist=G=>({...(G&&G.hintN?{hintN:G.hintN}:{}),...(G&&G.undoN?{undoN:G.undoN}:{})});
  const savePlay=()=>ls.set("play",{id:P.id,human:P.human,level:P.level,rlv:P.rlv==null?null:P.rlv,ranked:!!P.ranked,reward:!!P.reward,arena:P.arena||null,journey:P.journey||null,stamp:P.stamp||null,prize:P.prize||null,rk:P.rk,rate:P.rate||null,result:P.result,practice:P.practice||null,...assist(P),moves:saveMoves(P.moves)});
  function ensureP(){if(P)return;const s=ls.get("play",null);if(s&&s.moves){P=s;P.hint=null;stateRebuild(P)}else playNew("r",3);setTimeout(playEngine,0)}
  // pre：錯棋重練，先擺上舊對局到錯棋之前的著法（moves），info 記上次走了什麼
  // arena：公園朝代擂台（意見回饋 255）＝這盤是挑戰哪個朝代的擂主；贏了蓋那個朝代的章
  /* 意見回饋 308：挑戰電腦和朝代擂台各留一盤——開另一種棋時，下到一半的這盤先收到 play2，之後可以換回來接著下 */
  /* 意見回饋 327：石桌往事（雲河棋路、驛站、公園）的棋也自己留一盤，跟挑戰電腦、朝代擂台互不干擾——三種各留一盤 */
  /* 意見回饋 338：錯棋重練（和小帥的中殘局練習）也是自己的一盤，開它不會動到挑戰電腦那盤 */
  const kindOf=G=>G&&G.practice?"practice":G&&G.journey?"journey":G&&G.arena?"arena":"cpu",unfinished=G=>!!(G&&!G.result&&G.moves&&G.moves.length);
  // 積分挑戰下到一半就丟掉（開同一種的新局）：算輸，不然輸棋前開新局就能躲掉扣分
  function forfeit(G){if(!G||!G.ranked||G.result||G.moves.length<2)return;const keep=P;P=G;
    P.result={w:opp(P.human),why:"中途離開，算輸"};cpuRateApply("l");pushGame("play",{id:P.id,date:P.id.slice(0,10),level:0,ranked:true,rk:P.rk,human:P.human,result:P.result,...assist(P),moves:saveMoves(P.moves)});P=keep}
  const stashOut=G=>({id:G.id,human:G.human,level:G.level,rlv:G.rlv==null?null:G.rlv,ranked:!!G.ranked,reward:!!G.reward,arena:G.arena||null,journey:G.journey||null,rk:G.rk,result:null,practice:G.practice||null,...assist(G),moves:saveMoves(G.moves)});
  // play2：收起來的棋，每一種一盤 {cpu,arena,journey}（舊版只存一盤，讀的時候換成新格式）
  function stashAll(){let s=ls.get("play2",null);if(s&&s.moves)s={[kindOf(s)]:s};const o={};
    for(const k of["cpu","arena","journey","practice"]){const g=s&&s[k];if(g&&g.moves&&g.moves.length&&!g.result)o[k]=g}return o}
  const stashGet=k=>stashAll()[k]||null,stashSet=(k,g)=>{const o=stashAll();if(g)o[k]=g;else delete o[k];ls.set("play2",Object.keys(o).length?o:null)};
  const jid=x=>typeof x==="string"&&x?x.slice(0,40):null;
  /* 意見回饋 413：對局頁打開時說「我要哪一種」——挑戰電腦 cpu、朝代擂台 arena、石桌往事 journey（雲河棋路、驛站、園子、守關共用）、練習 practice 各一盤。
     桌上就是那一種：不動（下完的也不動，畫面自己決定）。不是：下到一半的先收進 play2 自己那格，再拿出那一種收著的；都沒有才開新的（石桌往事要給 journey 才開，練習不開——不開就連收都不收，不會多出一份重複的）。
     收起來以後先把 P 清掉再開新局，playNew 最後的 forfeit(P) 才不會把剛收起來的積分局算成中途離開 */
  function playOpen(b){ensureP();const k=["arena","journey","practice"].includes(b.kind)?b.kind:"cpu";
    const s=stashGet(k),era=typeof b.arena==="string"&&/^[a-z]{2,8}$/.test(b.arena)?b.arena:null,lv=d=>(b.lx!=null||+b.level)?lvIn(b):lvOld(d);
    /* 意見回饋 428：擂台接回沒下完的那盤時，強度換成現在的規則（例如石桌棋仙固定第 7 級），不沿用開局當時存的等級 */
    const relv=g=>{if(k==="arena"&&g&&b.level&&!g.result&&g.level!==lv(3)){g.level=lv(3);return true}return false};
    if(kindOf(P)===k){if(relv(P)){stateRebuild(P);savePlay()}return}
    if(!s&&(k==="practice"||(k==="journey"&&!jid(b.journey))))return;
    if(unfinished(P))stashSet(kindOf(P),stashOut(P));
    if(s){stashSet(k,null);P=s;P.hint=null;relv(P);stateRebuild(P);savePlay();return}
    P=null;
    if(k==="arena")playNew("r",lv(3),false,null,false,era||"classic",true);
    else if(k==="journey")playNew("r",lv(1),false,null,false,era,true,jid(b.journey));
    else playNew(b.human==="b"?"b":"r",lv(3),!!b.ranked,null,!!b.reward,null,true)}
  /* 石桌往事的特製關卡（levels.json 的 play 步驟）：從指定局面開始、讓子（拿掉幾顆）、關掉長將判負。棋盤 90 格要合法、兩邊都有將帥才接受 */
  function lvStart(lv){if(!lv||typeof lv!=="object")return null;let b;try{b=parseFen(typeof lv.fen==="string"&&lv.fen?lv.fen:START)}catch(e){return null}
    if(!Array.isArray(b)||b.length!==90)return null;for(const q of Array.isArray(lv.remove)?lv.remove.slice(0,16):[]){const i=parseSq(String(q));if(Number.isInteger(i)&&i>=0&&i<90&&b[i]&&!/[kK]/.test(b[i]))b[i]=null}
    if(!b.includes("k")||!b.includes("K"))return null;return{start:fen(b,"r").split(" ")[0],startTurn:lv.turn==="b"?"b":"r",noPerp:!!lv.noPerpetual}}
  function playNew(human,level,ranked,pre,reward,arena,noStash,journey,lv){
    const plain=!ranked&&!pre&&!reward,nk=pre?"practice":plain&&journey?"journey":plain&&arena?"arena":"cpu";
    if(!noStash&&P){
      if(unfinished(P)&&kindOf(P)!==nk){const o=stashGet(kindOf(P));if(o)forfeit(o);stashSet(kindOf(P),stashOut(P));P=null}   // 換另一種：這盤收起來
      const s=stashGet(nk);if(s){forfeit(s);stashSet(nk,null)}}                                                                           // 收著的同一種被新局取代
    // 積分挑戰下到一半就開新局：算輸
    forfeit(P);
    const pm=pre&&Array.isArray(pre.moves)?pre.moves.filter(m=>Number.isInteger(m.f)&&Number.isInteger(m.t)).slice(0,300):[];
    P={id:gameId(),human,level:ranked?0:level,ranked:!!ranked,rk:ranked?rankIdx(cpuRate().pts):null,moves:pm,result:null,hint:null,practice:pre?{...(pre.info||{}),base:pm.length}:null,reward:!ranked&&!pre&&!!reward,arena:!ranked&&!pre&&!reward&&arena||null,journey:nk==="journey"?journey:null};
    {const L=nk==="journey"?lvStart(lv):null;if(L){P.start=L.start;P.startTurn=L.startTurn;if(L.noPerp)P.noPerp=true}}
    stateRebuild(P);if(P.practice&&P.turn!==human)throw new Error("這步不是你走的");savePlay()}
  function playApply(f,t){stateApply(P,f,t);P.hint=null;let r=judgeState(P);if(r&&P.noPerp&&/長將|長捉|長打/.test(r.why))r=null;if(r)playEnd(r.w,r.why);savePlay();setTimeout(analyzePlay,0);
    try{window.dispatchEvent(new Event("xq-play"))}catch(e){}}   // 通知畫面馬上更新，不用等下一次輪詢
  function playEnd(w,why){P.result={w,why};const res=!w?"d":w===P.human?"w":"l";
    if(P.practice){savePlay();return}   // 錯棋重練：不算戰績、不存進對局紀錄
    if(P.ranked){if(P.moves.length>=2)cpuRateApply(res)}   // 雙方都還沒走就結束不計分
    else if(P.reward){if(P.moves.length>=2)carApply(res)}
    if(P.arena&&!P.journey&&res==="w"&&P.moves.length>=2){const S=ls.get("arenaStamps",{}),first=!S[P.arena];if(first)S[P.arena]={at:new Date().toISOString(),lv:P.level,n:P.moves.length};ls.set("arenaStamps",S);
      P.stamp={era:P.arena,first,total:Object.keys(S).length}}
    else if(kindOf(P)==="cpu"){const rec=ls.get("record",{}),L=rec[P.level]||(rec[P.level]={w:0,l:0,d:0});L[res]++;ls.set("record",rec)}
    /* 意見回饋 594：石桌往事從中局開始的關也存（記起始局面），我的成長才算得到故事裡下的棋 */
    pushGame("play",{id:P.id,date:P.id.slice(0,10),level:P.level,ranked:!!P.ranked,reward:!!P.reward,rk:P.rk,human:P.human,result:P.result,...(P.start?{start:P.start,startTurn:P.startTurn||"r"}:{}),...(P.journey?{journey:P.journey}:{}),...assist(P),moves:saveMoves(P.moves)});savePlay()}
  async function analyzePlay(){if(paBusy||!P)return;paBusy=true;try{await analyzeList(P,savePlay,()=>!!P&&!P.result&&P.turn!==P.human)}finally{paBusy=false}}
  const ucis=()=>P.moves.map(m=>iccs(m.f,m.t));
  /* 意見回饋 363：秘境棋友的開局喜好是真的——跟他下時，這盤有 90% 機率照他愛下的開局走前一兩步（紅方、黑方各一套），之後才交給 Pikafish */
  const STYLE={
    liuji:{r:[["h2e2","b2e2"]],b:[["h7e7","b7e7"]]},                               // 劉伯溫：中炮（後手就還中炮）
    zhangsanfeng:{r:[["b0c2","h0g2"],["h0g2","b0c2"]],b:[["b9c7","h9g7"],["h9g7","b9c7"]]},   // 張三丰：屏風馬（起馬局）
    shinaian:{r:[["c3c4","g3g4"]],b:[["g6g5","c6c5"]]},                           // 施耐庵：仙人指路（進七兵／卒）
    shenwansan:{r:[["g0e2","c0e2"]],b:[["c9e7","g9e7"]]},                         // 沈萬三：飛相局
    changyuchun:{r:[["h2e2"],["h0g2"]],b:[["h7e7"],["h9g7"]]},                     // 常遇春：順炮直衝
    wangmian:{r:[["h2d2","b2f2"]],b:[["b7f7","h7d7"]]}};                          // 王冕：過宮炮
  function styleMove(){if(!P.journey||!String(P.journey).startsWith("inn:")||P.practice)return null;const S=STYLE[String(P.journey).slice(4)];if(!S)return null;
    if(P.styleOn==null)P.styleOn=Math.random()<.9;if(!P.styleOn)return null;
    const list=(S[P.turn]||[])[Math.floor(P.moves.length/2)];if(!list)return null;const L=legal(P.board,P.turn);
    for(const u of list){const f=parseSq(u.slice(0,2)),t=parseSq(u.slice(2,4));if(L.some(([a,b])=>a===f&&b===t))return[f,t]}return null}
  async function playEngine(){
    if(!P||P.result||P.turn===P.human||playBusy)return;
    {const sm=styleMove();if(sm){playBusy=true;setTimeout(()=>{try{if(P&&!P.result&&P.turn!==P.human)playApply(sm[0],sm[1])}finally{playBusy=false;setTimeout(playEngine,0)}},700);return}}
    playBusy=true;const id=P.id,n=P.moves.length,lv=P.ranked?RLV[P.rk]||RLV[0]:P.rlv!=null?RLV[P.rlv]||RLV[0]:LEVELS[P.level-1]||LEVELS[2];   /* 意見回饋 548：驛站旅人用段位強度 rlv 浮動 */
    try{const r=await XQEngine.search({moves:ucis()},lv.movetime?{movetime:lv.movetime}:{depth:lv.depth},lv.multipv||1);
      if(!P||P.id!==id||P.moves.length!==n||P.result)return;
      const mv=pickMove(r,lv),f=parseSq(mv.slice(0,2)),t=parseSq(mv.slice(2,4));
      if(!legal(P.board,P.turn).some(([a,b])=>a===f&&b===t))throw new Error("引擎給出不合法著法 "+mv);
      playApply(f,t);playMsg=""}
    catch(e){playMsg="⚠ "+e.message}
    finally{playBusy=false;setTimeout(playEngine,0)}}
  function playState(){ensureP();
    const CR=cpuRate(),ci=rankIdx(CR.pts),nx=RANKS[ci+1];
    const SA=stashAll(),others=Object.values(SA).filter(g=>kindOf(g)!==kindOf(P)).map(g=>({kind:kindOf(g),arena:g.arena||null,journey:g.journey||null,ranked:!!g.ranked,reward:!!g.reward,level:g.level,n:g.moves.length,human:g.human}));
    return{kind:kindOf(P),others,other:others[0]||null,journey:P.journey||null,start:P.start||null,startTurn:P.startTurn||"r",id:P.id,board:P.board,turn:P.turn,human:P.human,level:P.level,ranked:!!P.ranked,reward:!!P.reward,arena:P.arena||null,stamp:P.stamp||null,prize:P.prize||null,car:P.reward?carState():null,rkName:P.ranked?RANKS[P.rk][0]:null,rate:P.rate||null,
      cpuRate:{pts:CR.pts,rank:RANKS[ci][0],w:CR.w,l:CR.l,d:CR.d,next:nx?nx[0]:null,toNext:nx?nx[1]-CR.pts:0,lo:RANKS[ci][1],hi:nx?nx[1]:null,hist:CR.hist},
      levels:LEVELS.map(l=>({n:l.n,name:l.name,desc:l.desc})),record:ls.get("record",{}),
      moves:P.moves.map(moveOut),result:P.result,practice:P.practice||null,thinking:playBusy&&P.turn!==P.human,msg:playMsg,eval:lastEv(P.moves),hint:P.hint,
      legal:!P.result&&P.turn===P.human?legal(P.board,P.turn):[],check:!P.result&&inCheck(P.board,P.turn)?kingSq(P.board,P.turn):-1,engine:true}}
  async function playPost(p,b){ensureP();
    if(p==="/play/new"){playNew(b.human==="b"?"b":"r",lvIn(b),!b.pre&&!!b.ranked,b.pre||null,!!b.reward,typeof b.arena==="string"&&/^[a-z]{2,8}$/.test(b.arena)?b.arena:null,false,jid(b.journey),b.lv);if(P&&!P.ranked&&b.rlv!=null&&Number.isInteger(+b.rlv)){P.rlv=Math.max(0,Math.min(RLV.length-1,+b.rlv));savePlay()}playMsg="";setTimeout(playEngine,0)}
    else if(p==="/play/bonus"){   /* 意見回饋 313：石桌往事「回到當年」答對轉折加段位積分；每個轉折只能領一次 */
      const key=String(b.key||"").slice(0,80),pts=Math.max(1,Math.min(20,Math.round(+b.pts)||0)),K=ls.get("bonusKeys",{});
      if(!key)throw new Error("缺少題目代號");const R=cpuRate();
      if(K[key])return{already:true,pts:R.pts,rank:RANKS[rankIdx(R.pts)][0]};
      const before=R.pts;R.pts+=pts;R.hist.unshift({id:"bonus-"+key,res:"bonus",d:pts,pts:R.pts,rk:RANKS[rankIdx(R.pts)][0],why:String(b.why||"").slice(0,40),at:Date.now()});R.hist=R.hist.slice(0,100);
      ls.set("cpuRate",R);K[key]=Date.now();ls.set("bonusKeys",K);return{ok:true,d:pts,pts:R.pts,rank:RANKS[rankIdx(R.pts)][0],was:RANKS[rankIdx(before)][0]}}
    else if(p==="/play/switch"||p==="/play/open"){playOpen(b);playMsg="";setTimeout(playEngine,0)}
    else if(p==="/play/move"){const f=+b.f,t=+b.t;if(P.result)throw new Error("這局已經結束");if(P.turn!==P.human)throw new Error("還沒輪到你");
      if(!legal(P.board,P.turn).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");playApply(f,t);setTimeout(playEngine,0)}
    else if(p==="/play/undo"){if(P.ranked)throw new Error("積分挑戰不能悔棋");if(P.reward)throw new Error("獎勵模式不能悔棋");if(P.arena)throw new Error("朝代擂台不能悔棋");   /* 意見回饋 382 *//* 意見回饋 380：電腦（擂主）還在想的時候也能悔棋——引擎算完會發現步數變了、自動丟掉那步 */
      const floor=P.practice?P.practice.base:0;if(P.moves.length<=floor)throw new Error("已經回到練習的起點");
      while(P.moves.length>floor){const m=P.moves.pop();if(m.by===P.human)break}P.undoN=(P.undoN||0)+1;P.result=null;P.hint=null;stateRebuild(P);savePlay();setTimeout(playEngine,0)}
    else if(p==="/play/hint"){throw new Error("挑戰電腦不提供提示，要靠自己");if(P.result||P.turn!==P.human)throw new Error("現在不能提示");
      const r=await XQEngine.search({moves:ucis()},{movetime:1500},1),f=parseSq(r.best.slice(0,2)),t=parseSq(r.best.slice(2,4));P.hint={f,t,cn:notate(P.board,f,t)};P.hintN=(P.hintN||0)+1;savePlay()}
    else if(p==="/play/hintmark"){if(!P.result){P.hintN=(P.hintN||0)+1;savePlay()}}   /* 意見回饋 415：雲河棋路的提示棋在畫面那邊算，這裡只記「這盤用過提示」 */
    else if(p==="/play/resign"){if(!P.result)playEnd(opp(P.human),"你認輸")}
    return playState()}

  // ---------- 雙人對戰（同一支手機） ----------
  const TCS={"10+5":{min:10,inc:5},"20+10":{min:20,inc:10},"60+30":{min:60,inc:30}};
  let V=null,vaBusy=false;
  const nameOf=(s,d)=>String(s||"").replace(/[<>]/g,"").trim().slice(0,20)||d;
  const saveV=()=>ls.set("pvp",{id:V.id,red:V.red,black:V.black,tcKey:V.tcKey,tc:V.tc,clocks:V.clocks,result:V.result,moves:saveMoves(V.moves)});
  function ensureV(){if(V)return;const s=ls.get("pvp",null);if(s&&s.moves){V=s;V.tick=null;V.draw=null;stateRebuild(V)}else pvpNew({})}
  function pvpNew(o){const tc=TCS[o.tc]||null;V={id:gameId(),red:nameOf(o.red,"紅方"),black:nameOf(o.black,"黑方"),tcKey:tc?o.tc:"none",tc,
    clocks:tc?{r:tc.min*60000,b:tc.min*60000}:null,tick:null,draw:null,moves:[],result:null};stateRebuild(V);saveV()}
  const pvpLeft=s=>!V.clocks?null:V.clocks[s]-(V.tick!=null&&V.turn===s&&!V.result?Date.now()-V.tick:0);
  function pvpClock(){if(!V||!V.tc||V.result||V.tick==null)return;if(pvpLeft(V.turn)<=0){V.clocks[V.turn]=0;const s=V.turn;V.tick=null;pvpEnd(opp(s),PLAYER[s]+"超時判負")}}
  setInterval(pvpClock,250);
  function pvpEnd(w,why){if(V.tick!=null&&V.clocks)V.clocks[V.turn]=Math.max(0,pvpLeft(V.turn));V.result={w,why};V.tick=null;V.draw=null;
    pushGame("pvp",{id:V.id,date:V.id.slice(0,10),red:V.red,black:V.black,tc:V.tcKey,result:V.result,moves:saveMoves(V.moves)});saveV()}
  async function analyzePvp(){if(vaBusy||!V)return;vaBusy=true;try{await analyzeList(V,saveV)}finally{vaBusy=false}}
  function pvpState(){ensureV();pvpClock();
    return{id:V.id,red:V.red,black:V.black,board:V.board,turn:V.turn,moves:V.moves.map(moveOut),result:V.result,draw:V.draw,tcKey:V.tcKey,
      clocks:V.clocks?{r:pvpLeft("r"),b:pvpLeft("b")}:null,running:V.tick!=null,legal:V.result?[]:legal(V.board,V.turn),
      check:!V.result&&inCheck(V.board,V.turn)?kingSq(V.board,V.turn):-1,eval:lastEv(V.moves),engine:true}}
  async function pvpPost(p,b){ensureV();const side=b.side==="b"?"b":"r";
    if(p==="/pvp/new")pvpNew(b);
    else if(p==="/pvp/move"){const f=+b.f,t=+b.t;if(V.result)throw new Error("這局已經結束");if(!legal(V.board,V.turn).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");
      if(V.tc&&V.tick!=null)V.clocks[V.turn]=pvpLeft(V.turn)+V.tc.inc*1000;
      stateApply(V,f,t);V.draw=null;V.tick=V.tc?Date.now():null;const r=judgeState(V);if(r)pvpEnd(r.w,r.why);saveV();setTimeout(analyzePvp,0)}
    else if(p==="/pvp/undo"){if(V.result)throw new Error("這局已經結束，不能悔棋");if(V.moves.length){if(V.tc&&V.tick!=null)V.clocks[V.turn]=pvpLeft(V.turn);
      V.moves.pop();stateRebuild(V);V.draw=null;V.tick=V.tc&&V.moves.length?Date.now():null;saveV()}}
    else if(p==="/pvp/draw"){if(V.result)throw new Error("這局已經結束");if(V.draw&&V.draw!==side)pvpEnd(null,"雙方同意和棋");else V.draw=V.draw===side?null:side}
    else if(p==="/pvp/resign"){if(!V.result)pvpEnd(opp(side),PLAYER[side]+"認輸")}
    return pvpState()}

  // ---------- 線上大廳的網路對局：畫面跟雙人對戰一樣，狀態放在 XQNet（公開 MQTT 伺服器）上同步 ----------
  let NB=null;const netSaved=new Set(ls.get("netSaved",[]));
  function netBuild(){const g=XQNet.game();if(!g)return null;if(NB&&NB.key===g.gid+"|"+g.rev)return NB;
    const S={moves:g.moves.map(([f,t])=>({f,t}))};stateRebuild(S);NB={key:g.gid+"|"+g.rev,S,g};
    // 下完的網路對局存到「真人對局」，之後可以看賽後報告
    if(g.result&&!netSaved.has(g.id)&&XQNet.side()){netSaved.add(g.id);ls.set("netSaved",[...netSaved].slice(-200));
      pushGame("pvp",{id:g.id,date:g.id.slice(0,10),red:g.red.name,black:g.black.name,tc:"none",result:g.result,moves:saveMoves(S.moves),net:true}).catch(()=>{netSaved.delete(g.id);ls.set("netSaved",[...netSaved].slice(-200))})}   /* 意見回饋 619：沒存成功就拿掉「已存」記號，下次再存 */
    return NB}
  /* 補存：伺服器抓回來的已結束網路對局，還沒存過就存進「真人對局」 */
  window.XQ_saveNetGame=async g=>{if(!g||!g.result||!g.id||!Array.isArray(g.moves))return false;const list=(await idb.get("games:pvp"))||[];if(list.some(x=>x.id===g.id))return true;
    const S={moves:g.moves.map(([f,t])=>({f,t}))};stateRebuild(S);netSaved.add(g.id);ls.set("netSaved",[...netSaved].slice(-200));
    await pushGame("pvp",{id:g.id,date:g.id.slice(0,10),red:g.red.name,black:g.black.name,tc:"none",result:g.result,moves:saveMoves(S.moves),net:true});return true};
  /* 棋友資料卡打開別人的線上對局：存到「棋友的對局」（最多 50 盤），不混進自己的真人對局 */
  window.XQ_savePeek=async g=>{if(!g||!g.id||!Array.isArray(g.moves))return false;let list=(await idb.get("games:peek"))||[];list=list.filter(x=>x.id!==g.id);
    const S={moves:g.moves.map(([f,t])=>({f,t}))};stateRebuild(S);list.push({id:g.id,date:g.id.slice(0,10),red:g.red.name,black:g.black.name,tc:"none",result:g.result,moves:saveMoves(S.moves),net:true});
    await idb.set("games:peek",list.slice(-50));return true};
  /* 線上對局前幾步的中文記譜（給戰績分析看開局用） */
  window.XQ_netMovesCn=(g,n)=>{try{const S={moves:g.moves.slice(0,n||6).map(([f,t])=>({f,t}))};stateRebuild(S);return S.moves.map(m=>m.cn)}catch(e){return[]}};
  /* QA P1-1：收到別人發的對局狀態時，從頭重走一遍檢查每步都合法，順便用規則判這盤是不是已經分出勝負（給 net.js 的 okNext 用） */
  window.XQ_netCheck=mv=>{try{const S={moves:[]};stateRebuild(S);for(const[f,t]of mv){if(!legal(S.board,S.turn).some(([x,y])=>x===f&&y===t))return{ok:false};stateApply(S,f,t)}return{ok:true,res:judgeState(S)}}catch(e){return{ok:false}}};
  /* 對局結束時就算不在對局畫面（切到別頁、對方認輸、離開）也要存棋譜（意見回饋 275） */
  setTimeout(function hookNet(){if(window.XQNet&&XQNet.on)XQNet.on("game",()=>{try{netBuild()}catch(e){}});else setTimeout(hookNet,500)},0);
  function netState(){const nb=netBuild(),sd=XQNet.side(),em=[];
    if(!nb)return{id:"wait",red:"等待中…",black:"等待中…",board:parseFen(START),turn:"r",moves:[],result:null,draw:null,tcKey:"none",clocks:null,running:false,legal:[],check:-1,eval:null,
      engine:true,online:{r:false,b:false},who:{r:"",b:""},emotes:[],net:true,mySide:sd||"w",watchers:XQNet.watchers(),waiting:true,link:XQNet.status()};
    const{S,g}=nb;
    return{id:g.id,red:g.red.name,black:g.black.name,board:S.board,turn:S.turn,moves:S.moves.map(moveOut),result:g.result,draw:g.draw,tcKey:g.tc?"net"+g.tc:"none",tc:g.tc||null,clocks:XQNet.clocks?XQNet.clocks():null,running:!!g.clk&&!g.result,
      legal:g.result?[]:legal(S.board,S.turn),check:!g.result&&inCheck(S.board,S.turn)?kingSq(S.board,S.turn):-1,eval:null,engine:true,
      online:{r:XQNet.isOn(g.red.id),b:XQNet.isOn(g.black.id)},who:{r:g.red.name,b:g.black.name},emotes:XQNet.emotes(),net:true,mySide:sd||"w",watchers:XQNet.watchers(),link:XQNet.status(),unsent:XQNet.pendingSend()}}
  async function netPvp(p,b){if(p==="/pvp/state")return netState();
    const sd=XQNet.side();if(!sd)throw new Error("你在觀戰，不能下棋");
    if(p==="/pvp/emote"){XQNet.emote(sd,b.e);return netState()}
    if(p==="/pvp/chat"){XQNet.say(sd,b.text);return netState()}
    const nb=netBuild();if(!nb)throw new Error("還在等對局資料，稍等一下");const{S,g}=nb;
    if(p==="/pvp/move"){const f=+b.f,t=+b.t;if(g.result)throw new Error("這局已經結束");if(S.turn!==sd)throw new Error("還沒輪到你");
      if(!legal(S.board,S.turn).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");
      const T={moves:g.moves.map(([a,z])=>({f:a,t:z}))};stateRebuild(T);stateApply(T,f,t);const r=judgeState(T);
      XQNet.update(n=>{if(XQNet.tickMove)XQNet.tickMove(n,sd);n.moves.push([f,t]);n.draw=null;if(r)n.result=r})}
    else if(p==="/pvp/undo"){if(g.result)throw new Error("這局已經結束，不能悔棋");const last=S.moves[S.moves.length-1];
      if(!last||last.by!==sd)throw new Error("對方已經走了，不能悔棋");XQNet.update(n=>{n.moves.pop();n.draw=null})}
    else if(p==="/pvp/draw"){if(g.result)throw new Error("這局已經結束");
      XQNet.update(n=>{if(n.draw&&n.draw!==sd){n.result={w:null,why:"雙方同意和棋"};n.draw=null}else n.draw=n.draw===sd?null:sd})}
    else if(p==="/pvp/resign"){if(!g.result)XQNet.update(n=>{n.result={w:opp(sd),why:PLAYER[sd]+"認輸"}})}
    else if(p==="/pvp/new"){if(!g.result)throw new Error("這局還沒下完");   // 再來一局：交換紅黑
      XQNet.update(n=>{const r=n.red;n.red=n.black;n.black=r;n.moves=[];n.result=null;n.draw=null;n.id=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19)})}
    return netState()}

  // ---------- 棋譜庫 ----------
  const bookCache={};let pubBooks=null;
  async function publicBooks(){if(!pubBooks)pubBooks=await(await fetch(BASE+"data/books.json")).json();return pubBooks}
  async function syncedBooks(){return(await idb.get("cols"))||[]}
  async function loadBook(key){if(bookCache[key])return bookCache[key];
    let d=null;if((await publicBooks()).some(b=>b.key===key))d=await(await fetch(BASE+"data/"+key+".json")).json();
    else{const s=await idb.get("col:"+key);if(s)d=JSON.parse(s)}
    if(!d)return null;d.byId=new Map(d.items.map(x=>[x.id,x]));return bookCache[key]=d}
  async function gameItems(kind){const list=(await idb.get("games:"+kind))||[];
    return list.slice().reverse().map(g=>{if(kind==="play"){const lv=LEVELS[g.level-1]||{name:"?"},bot=g.ranked?"Pikafish 積分挑戰（"+(RANKS[g.rk]||["?"])[0]+"）":(g.journey?"石桌往事・":"")+"Pikafish 第"+g.level+"級「"+lv.name+"」"+(g.reward?"・🚗獎勵":"");g={...g,red:g.human==="r"?"你":bot,black:g.human==="b"?"你":bot}}
      return{...gameItem(g,false),...assist(g)}})}
  async function dbBooks(){const out=[];for(const b of await publicBooks())out.push({key:b.key,name:b.name,count:b.count});
    for(const b of await syncedBooks())if(out.some(x=>x.key===b.key))unsync(b.key);else out.push({key:b.key,name:b.name,count:b.count,synced:b.at});   // 以前從電腦同步過、現在已內建的，不要出現兩份
    if(remoteInfo())out.push({key:"ai",name:"AI 對局",count:0});
    out.push({key:"play",name:"人機對局",count:((await idb.get("games:play"))||[]).length},{key:"pvp",name:"真人對局",count:((await idb.get("games:pvp"))||[]).length},
      {key:"study",name:"我的研究",count:((await idb.get("games:study"))||[]).length});return out}
  async function dbItems(c){
    if(c==="study")return{name:"我的研究",note:"推演變化後按「💾 存成棋譜」存在這支手機裡的研究",items:((await idb.get("games:study"))||[]).slice().reverse().map(g=>summary(studyItem(g)))};
    if(c==="play"||c==="pvp")return{name:c==="play"?"人機對局":"真人對局",note:"這支手機上下完的對局",items:(await gameItems(c)).map(summary)};
    if(c==="peek")return{name:"棋友的對局",note:"從棋友資料卡打開過的線上對局",items:(await gameItems(c)).map(summary)};
    const d=await loadBook(c);if(!d)throw new Error("手機裡沒有這個資料夾"+(remoteInfo()?"，可以按「從電腦同步」下載":""));
    return{name:d.name,book:d.book,source:d.source,players:d.players||null,items:d.items.map(summary)}}
  async function dbItem(c,id){
    if(c==="study"){const g=((await idb.get("games:study"))||[]).find(x=>x.id===id);if(!g)throw new Error("找不到這份研究");return studyItem(g)}
    if(c==="play"||c==="pvp"||c==="peek"){const it=(await gameItems(c)).find(x=>x.id===id);if(!it)throw new Error("找不到這一局");return it}
    const d=await loadBook(c);const it=d&&d.byId.get(id);if(!it)throw new Error("找不到這一局");return fullItem(it)}

  // ---------- 研究：合法著法、引擎分析、評等、快取查詢 ----------
  const checkBoard=(b,s)=>{if(!Array.isArray(b)||b.length!==90)throw new Error("棋盤資料不對");if(s!=="r"&&s!=="b")throw new Error("輪走方不對")};
  // 把一串著法逐步走出來，每步標出「吃子、將軍、捉子、將死」（跟電腦版 lineInfo 相同）
  function lineInfo(b,s,ucis){const out=[];let bd=b.slice(),sd=s;
    for(const u of(ucis||[]).slice(0,40)){const f=parseSq(String(u).slice(0,2)),t=parseSq(String(u).slice(2,4));
      if(!bd[f]||C.sideOf(bd[f])!==sd||!legal(bd,sd).some(([x,y])=>x===f&&y===t))break;
      const cn=notate(bd,f,t),cap=bd[t],before=C.chasePairs(bd,sd),nb=C.make(bd,f,t),tags=[],o=opp(sd);
      if(cap)tags.push("吃"+C.NAMES[C.sideOf(cap)][cap.toUpperCase()]);
      const ck=inCheck(nb,o);if(ck)tags.push("將軍");
      const chased=[...new Set([...C.chasePairs(nb,sd)].filter(x=>!before.has(x)).map(x=>+x.split(">")[1]))].map(q=>C.NAMES[C.sideOf(nb[q])][nb[q].toUpperCase()]);
      if(chased.length)tags.push("捉"+chased.join("、"));
      if(!legal(nb,o).length)tags.push(ck?"將死":"困斃");
      out.push({f,t,cn,by:sd,ck,tags});bd=nb;sd=o}
    return out}
  // 我的研究：推演過的變化存在手機裡
  function studyItem(g){return fullItem({id:g.id,title:g.title,name:g.title,result:"研究",type:g.src||"",year:+String(g.id).slice(0,4)||null,
    board:g.board.slice(),lines:[{id:0,parent:null,start:1,moves:g.moves.map(m=>m.slice())}],comments:g.comments||{}})}
  async function studySave(b){const mv=(Array.isArray(b.moves)?b.moves:[]).slice(0,200).map(m=>[+m[0],+m[1]]);
    let bd=b.board.slice(),sd=b.side;for(const[f,t]of mv){if(!legal(bd,sd).some(([x,y])=>x===f&&y===t))throw new Error("變化裡有不合法的著法");bd=C.make(bd,f,t);sd=opp(sd)}
    if(!mv.length)throw new Error("沒有著法可以存");
    const id=gameId()+"-"+Math.random().toString(36).slice(2,6),comments={};
    for(const[k,v]of Object.entries(b.comments||{}))if(/^0_\d+$/.test(k))comments[k]=String(v).slice(0,500);
    await pushGame("study",{id,title:String(b.title||"我的研究").slice(0,80),src:String(b.src||"").slice(0,120),board:b.board,moves:mv,comments});return{id}}
  function pvText(b,s,pv){const out=[];let bb=b.slice();for(const u of pv.slice(0,30)){const f=parseSq(u.slice(0,2)),t=parseSq(u.slice(2,4));
    if(!bb[f]||!legal(bb,C.sideOf(bb[f])).some(([x,y])=>x===f&&y===t))break;out.push(notate(bb,f,t));bb=C.make(bb,f,t)}return out}
  async function anPost(p,b){
    if(p==="/an/lookup"){const ks=[].concat((b.grade||[]).map(k=>"g:"+k),(b.engine||[]).map(k=>"e:"+k)),got=await idb.many(ks),g={},e={};
      for(const[k,v]of Object.entries(got)){if(k.startsWith("g:"))g[k.slice(2)]=v;else e[k.slice(2)]=v}return{grade:g,engine:e}}
    checkBoard(b.board,b.side);const sg=b.side==="r"?1:-1;
    if(p==="/an/legal"){let bd=b.board,sd=b.side,cn=null;
      if(b.f!=null){const f=+b.f,t=+b.t;if(!legal(bd,sd).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");cn=notate(bd,f,t);bd=C.make(bd,f,t);sd=opp(sd)}
      return{board:bd,side:sd,cn,legal:legal(bd,sd),check:inCheck(bd,sd)?kingSq(bd,sd):-1}}
    if(p==="/an/engine"){const ms=Math.max(200,Math.min(10000,+b.ms||1500)),n=Math.max(1,Math.min(5,+b.multipv||3)),k="e:"+fen(b.board,b.side);
      const c=await idb.get(k);if(c&&!b.fresh&&c.ms>=ms&&c.multipv>=n)return{...c,cached:true};
      const r=await window.evalPos(b.board,b.side,ms,n);if(r.dead)return{lines:[],dead:true};
      const out={ms,multipv:n,at:new Date().toISOString(),lines:r.lines.map(l=>({mv:l.mv,vr:sg*l.v,mate:l.mate==null?null:sg*l.mate,depth:l.depth,cn:pvText(b.board,b.side,[l.mv])[0]||l.mv,pv:pvText(b.board,b.side,l.pv),pvm:l.pv.slice(0,30)}))};
      await idb.set(k,out);return out}
    if(p==="/an/line")return{moves:lineInfo(b.board,b.side,b.moves)};
    if(p==="/an/study-save")return studySave(b);
    if(p==="/an/classify"){const f=+b.f,t=+b.t;if(!legal(b.board,b.side).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");return(await classify(b.board,b.side,f,t))||{q:"—"}}
    throw new Error("不支援："+p)}

  // ---------- 連上電腦（掃電腦上的 QR code 會帶 #connect=網址&k=存取碼） ----------
  // 網頁剛打開，或 App 已經開著時網址被換成 #connect=…，都要讀取
  function parseConnect(){const h=location.hash;if(!h.startsWith("#connect="))return false;
    const ps=new URLSearchParams(h.slice(1)),base=(ps.get("connect")||"").replace(/\/+$/,""),key=ps.get("k");
    const seat0=ps.get("seat");let ok=false;if(/^https:\/\//.test(base)&&key){ls.set("remote",{base,key,at:Date.now(),seat:/^[rb]$/.test(seat0||"")?seat0:null});lastPing={at:0,ok:false};XQ_justConnected=true;ok=true}
    // 對手在雙人對戰畫面給的 QR code 會多帶 seat=r／b：直接坐那一邊、進對局
    const seat=ps.get("seat");if(ok&&/^[rb]$/.test(seat||"")){try{localStorage.setItem("m_pvpSeat",JSON.stringify(seat))}catch(e){}ls.set("pvpOnline",true)}
    history.replaceState(null,"",location.pathname+location.search+(ok&&seat?"#/pvp":"#/"));return true}
  let lastPing={at:0,ok:false};
  parseConnect();
  function remoteInfo(){return ls.get("remote",null)}
  async function remote(u,b,opt){const r=remoteInfo();
    if(!r)throw new Error("這個功能要連上電腦：在電腦執行裁判程式（加 --tunnel），再用手機掃電腦上的 QR code");
    // 手機剛從背景切回來、或 4G 訊號不穩時，第一個請求常常直接失敗；讀取類的請求自動再試兩次
    const go=()=>fetch(r.base+u,{method:b===undefined?"GET":"POST",headers:{"x-xq-key":r.key,"content-type":"application/json",...(window.XQ_ME?XQ_ME():{})},body:b===undefined?undefined:JSON.stringify(b),signal:opt&&opt.signal||(!(opt&&opt.raw)&&window.AbortSignal&&AbortSignal.timeout?AbortSignal.timeout(15000):undefined)});
    let res;for(let i=0;;i++){try{res=await go();break}
      catch(e){if(i>=2&&!(opt&&opt.retried)&&await discover())return remote(u,b,{...(opt||{}),retried:true});
        if(b!==undefined||i>=2||(opt&&opt.signal&&opt.signal.aborted))throw new Error(navigator.onLine===false?"手機沒有網路":"連不到電腦：電腦的程式可能關了，或網址已經換了（重開程式後要重新掃 QR code）");
        await new Promise(z=>setTimeout(z,800*(i+1)))}}
    if(res.status===403)throw new Error("存取碼不對或過期：電腦的程式重開後，要重新掃 QR code");
    if(opt&&opt.raw)return res;
    const d=await res.json();if(d&&d.error)throw new Error(d.error);return d}
  async function ping(){const r=remoteInfo();if(!r)return false;if(Date.now()-lastPing.at<8000)return lastPing.ok;
    const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);
    // 失敗只記 3 秒，下次很快會再試；成功記 8 秒
    try{await remote("/remote",undefined,{signal:ac.signal});lastPing={at:Date.now(),ok:true};const r2=remoteInfo();if(r2&&!(r2.ok>Date.now()-36e5))ls.set("remote",{...r2,ok:Date.now()})}catch(e){lastPing={at:Date.now()-5000,ok:false}}finally{clearTimeout(tm)}
    if(!lastPing.ok&&await discover())return ping();
    return lastPing.ok}
  // 電腦程式重開後通道網址會換：到 ntfy.sh 的秘密頻道（由存取碼算出來）查電腦公告的新網址，自動換過去
  let lastDiscover=0;
  async function discover(){const r=remoteInfo();if(!r||!r.key||!crypto.subtle||Date.now()-lastDiscover<15000)return false;lastDiscover=Date.now();
    try{const h=[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode("xqlab:"+r.key)))].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,32);
      const okU=u=>/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(u||"");let base=null;
      // 先查線上大廳伺服器的保留訊息（不會過期），再查 ntfy（只保留 12 小時）
      if(window.XQNet&&XQNet.getRetained){const m=await XQNet.getRetained("xqlab-r7k2q/v1/c/"+h,8000);if(okU(m)&&m!==r.base)base=m}
      if(!base){try{const t=await(await fetch("https://ntfy.sh/xqlab-"+h+"/json?poll=1&since=12h",{signal:AbortSignal.timeout?AbortSignal.timeout(8000):undefined})).text();
        for(const line of t.split("\n")){try{const m=JSON.parse(line);if(m.event==="message"&&okU(m.message))base=m.message}catch(e){}}}catch(e){}}
      if(!base||base===r.base)return false;
      ls.set("remote",{...r,base,at:Date.now()});lastPing={at:0,ok:false};return true}catch(e){return false}}
  // 從電腦把棋譜同步到手機（之後離線也能看）
  // 從網站下載大型棋譜（例如特級大師對局 33 MB），不用連電腦
  async function bigBooks(){try{return await(await fetch(BASE+"data/big-books.json")).json()}catch(e){return[]}}
  async function syncSite(key,name,onProgress,h){
    const res=await fetch(BASE+"data/"+key+".json",{cache:"no-store"});if(!res.ok)throw new Error("下載失敗（"+res.status+"）");
    const total=+res.headers.get("content-length")||0,reader=res.body.getReader(),chunks=[];let got=0;
    for(;;){const{done,value}=await reader.read();if(done)break;chunks.push(value);got+=value.length;if(onProgress)onProgress(got,total)}
    const text=await new Blob(chunks).text(),d=JSON.parse(text);
    await idb.set("col:"+key,text);const cols=(await syncedBooks()).filter(x=>x.key!==key);cols.push({key,name:d.name||name,count:d.items.length,at:new Date().toISOString(),h:h||null});
    await idb.set("cols",cols);delete bookCache[key];return d.items.length}
  async function sync(key,name,onProgress){
    const res=await remote("/db/raw?c="+encodeURIComponent(key),undefined,{raw:true});if(!res.ok)throw new Error("電腦上沒有這個資料夾");
    const total=+res.headers.get("content-length")||0,reader=res.body.getReader(),chunks=[];let got=0;
    for(;;){const{done,value}=await reader.read();if(done)break;chunks.push(value);got+=value.length;if(onProgress)onProgress(got,total)}
    const text=await new Blob(chunks).text(),d=JSON.parse(text);
    await idb.set("col:"+key,text);const cols=(await syncedBooks()).filter(x=>x.key!==key);cols.push({key,name:d.name||name,count:d.items.length,at:new Date().toISOString()});
    await idb.set("cols",cols);delete bookCache[key];return d.items.length}
  async function unsync(key){await idb.del("col:"+key);await idb.set("cols",(await syncedBooks()).filter(x=>x.key!==key));delete bookCache[key]}

  // ---------- 路由：同樣的網址，該在手機處理的就在手機處理 ----------
  const REMOTE=new Set(["/state","/start","/pause","/new","/an/explain","/remote","/clients"]);
  async function api(u,b){
    const url=new URL(u,"http://x"),p=url.pathname,c=url.searchParams.get("c");
    if(REMOTE.has(p)||((p==="/db/items"||p==="/db/item")&&c==="ai"))return remote(u,b);
    if(p==="/db/books")return dbBooks();
    if(p==="/db/items")return dbItems(c);
    if(p==="/db/item")return dbItem(c,url.searchParams.get("id"));
    if(p==="/quiz/data"||p==="/terms/data"){const r=await fetch("data/"+p.slice(1,-5)+".json");if(!r.ok)throw new Error("找不到題庫");const d=await r.json();
      /* 意見回饋 301：有校正檔就把每題校正過的鑑別度 a、難度 b 加上去 */
      if(p==="/quiz/data")try{const c=await (await fetch("data/quiz-calib.json")).json();for(const it of d.items){const k=c.items&&c.items[it.id];if(k){it.ca=k.a;it.cb=k.b}}}catch(e){}
      return d}
    if(p==="/play/state")return playState();
    if(p==="/car/state")return carState();
    if(p==="/car/redeem")return carRedeem(b||{});
    if(p==="/car/sell")return carSell(b||{});
    if(p.startsWith("/play/"))return playPost(p,b||{});
    // 線上大廳的網路對局（不用電腦）
    if(p.startsWith("/pvp/")&&window.XQNet&&XQNet.active())return netPvp(p,b||{});
    // 兩支手機連線對戰：雙人對戰改走電腦（兩支手機看同一盤）
    if(p.startsWith("/pvp/")&&ls.get("pvpOnline",false))return remote(u,b);
    if(p==="/pvp/state")return pvpState();
    if(p.startsWith("/pvp/"))return pvpPost(p,b||{});
    if(p.startsWith("/an/"))return anPost(p,b||{});
    throw new Error("離線版不支援："+p)}
  return{api,remoteInfo,ping,sync,syncSite,bigBooks,parseConnect,setPvpOnline(on){ls.set("pvpOnline",!!on)},unsync,syncedBooks,disconnect(){localStorage.removeItem("xq_remote");lastPing={at:0,ok:false}},
    engineCached:async()=>{try{const c=await caches.open("xqlab-engine");return!!(await c.match(BASE+"engine/pikafish.nnue"))}catch(e){return false}}};
})();
var XQ_justConnected=XQ_justConnected||false;
