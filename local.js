// 離線後端：在手機上處理原本要送到電腦的請求（網址與回傳格式跟 xiangqi-referee.js 相同），
// 讓同一套 App 畫面不連電腦也能用。只有 AI 對戰、AI 講解、同步棋譜要連上電腦。
"use strict";
var XQ=(function(){
  const C=XQCore,BASE=new URL("./",location.href).href;
  const{START,parseFen,fen,legal,inCheck,kingSq,iccs,parseSq,notate,opp,LEVELS,stateApply,stateRebuild,judgeState,pickMove,ANALYZE_MS,classifyRaw,PLAYER,summary,fullItem,gameItem}=C;
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
  async function analyzeList(S,save){
    for(let i=0;i<S.moves.length;i++){const m=S.moves[i];if(m.q)continue;
      const[bs,sd]=S.pos[i].split(" ");let r=null;try{r=await classify(parseFen(bs),sd==="w"?"r":"b",m.f,m.t)}catch(e){return}
      if(S.moves[i]!==m)return;if(r)Object.assign(m,r);else m.q="—";save()}}
  const moveOut=m=>({f:m.f,t:m.t,by:m.by,cn:m.cn,ck:m.ck,q:m.q,loss:m.loss,ev:m.ev,bc:m.bc,bm:m.bm,bp:m.bp});
  const lastEv=ms=>{for(let i=ms.length-1;i>=0;i--)if(ms[i].ev!=null)return{v:ms[i].ev,ply:i+1};return null};
  const saveMoves=ms=>ms.map(m=>({f:m.f,t:m.t,by:m.by,q:m.q,loss:m.loss,ev:m.ev,bc:m.bc,bm:m.bm,bp:m.bp}));
  async function pushGame(kind,g){const list=(await idb.get("games:"+kind))||[];list.push(g);await idb.set("games:"+kind,list)}

  // ---------- 挑戰電腦 ----------
  let P=null,playBusy=false,playMsg="",paBusy=false;
  const savePlay=()=>ls.set("play",{id:P.id,human:P.human,level:P.level,result:P.result,moves:saveMoves(P.moves)});
  function ensureP(){if(P)return;const s=ls.get("play",null);if(s&&s.moves){P=s;P.hint=null;stateRebuild(P)}else playNew("r",3);setTimeout(playEngine,0)}
  function playNew(human,level){P={id:gameId(),human,level,moves:[],result:null,hint:null};stateRebuild(P);savePlay()}
  function playApply(f,t){stateApply(P,f,t);P.hint=null;const r=judgeState(P);if(r)playEnd(r.w,r.why);savePlay();setTimeout(analyzePlay,0)}
  function playEnd(w,why){P.result={w,why};const rec=ls.get("record",{}),L=rec[P.level]||(rec[P.level]={w:0,l:0,d:0});
    if(!w)L.d++;else if(w===P.human)L.w++;else L.l++;ls.set("record",rec);
    pushGame("play",{id:P.id,date:P.id.slice(0,10),level:P.level,human:P.human,result:P.result,moves:saveMoves(P.moves)});savePlay()}
  async function analyzePlay(){if(paBusy||!P)return;paBusy=true;try{await analyzeList(P,savePlay)}finally{paBusy=false}}
  const ucis=()=>P.moves.map(m=>iccs(m.f,m.t));
  async function playEngine(){
    if(!P||P.result||P.turn===P.human||playBusy)return;
    playBusy=true;const id=P.id,n=P.moves.length,lv=LEVELS[P.level-1]||LEVELS[2];
    try{const r=await XQEngine.search({moves:ucis()},lv.movetime?{movetime:lv.movetime}:{depth:lv.depth},lv.multipv||1);
      if(!P||P.id!==id||P.moves.length!==n||P.result)return;
      const mv=pickMove(r,lv),f=parseSq(mv.slice(0,2)),t=parseSq(mv.slice(2,4));
      if(!legal(P.board,P.turn).some(([a,b])=>a===f&&b===t))throw new Error("引擎給出不合法著法 "+mv);
      playApply(f,t);playMsg=""}
    catch(e){playMsg="⚠ "+e.message}
    finally{playBusy=false;setTimeout(playEngine,0)}}
  function playState(){ensureP();
    return{board:P.board,turn:P.turn,human:P.human,level:P.level,levels:LEVELS.map(l=>({n:l.n,name:l.name,desc:l.desc})),record:ls.get("record",{}),
      moves:P.moves.map(moveOut),result:P.result,thinking:playBusy&&P.turn!==P.human,msg:playMsg,eval:lastEv(P.moves),hint:P.hint,
      legal:!P.result&&P.turn===P.human?legal(P.board,P.turn):[],check:!P.result&&inCheck(P.board,P.turn)?kingSq(P.board,P.turn):-1,engine:true}}
  async function playPost(p,b){ensureP();
    if(p==="/play/new"){playNew(b.human==="b"?"b":"r",Math.max(1,Math.min(LEVELS.length,Math.round(+b.level)||3)));playMsg="";setTimeout(playEngine,0)}
    else if(p==="/play/move"){const f=+b.f,t=+b.t;if(P.result)throw new Error("這局已經結束");if(P.turn!==P.human)throw new Error("還沒輪到你");
      if(!legal(P.board,P.turn).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");playApply(f,t);setTimeout(playEngine,0)}
    else if(p==="/play/undo"){if(playBusy)throw new Error("引擎思考中，等它走完再悔棋");
      while(P.moves.length){const m=P.moves.pop();if(m.by===P.human)break}P.result=null;P.hint=null;stateRebuild(P);savePlay();setTimeout(playEngine,0)}
    else if(p==="/play/hint"){if(P.result||P.turn!==P.human)throw new Error("現在不能提示");
      const r=await XQEngine.search({moves:ucis()},{movetime:1500},1),f=parseSq(r.best.slice(0,2)),t=parseSq(r.best.slice(2,4));P.hint={f,t,cn:notate(P.board,f,t)}}
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
      pushGame("pvp",{id:g.id,date:g.id.slice(0,10),red:g.red.name,black:g.black.name,tc:"none",result:g.result,moves:saveMoves(S.moves),net:true})}
    return NB}
  function netState(){const nb=netBuild(),sd=XQNet.side(),em=[];
    if(!nb)return{id:"wait",red:"等待中…",black:"等待中…",board:parseFen(START),turn:"r",moves:[],result:null,draw:null,tcKey:"none",clocks:null,running:false,legal:[],check:-1,eval:null,
      engine:true,online:{r:false,b:false},who:{r:"",b:""},emotes:[],net:true,mySide:sd||"w",watchers:XQNet.watchers(),waiting:true,link:XQNet.status()};
    const{S,g}=nb;
    return{id:g.id,red:g.red.name,black:g.black.name,board:S.board,turn:S.turn,moves:S.moves.map(moveOut),result:g.result,draw:g.draw,tcKey:"none",clocks:null,running:false,
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
      XQNet.update(n=>{n.moves.push([f,t]);n.draw=null;if(r)n.result=r})}
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
    return list.slice().reverse().map(g=>{if(kind==="play"){const lv=LEVELS[g.level-1]||{name:"?"},bot="Pikafish 第"+g.level+"級「"+lv.name+"」";g={...g,red:g.human==="r"?"你":bot,black:g.human==="b"?"你":bot}}
      return gameItem(g,false)})}
  async function dbBooks(){const out=[];for(const b of await publicBooks())out.push({key:b.key,name:b.name,count:b.count});
    for(const b of await syncedBooks())out.push({key:b.key,name:b.name,count:b.count,synced:b.at});
    if(remoteInfo())out.push({key:"ai",name:"AI 對局",count:0});
    out.push({key:"play",name:"人機對局",count:((await idb.get("games:play"))||[]).length},{key:"pvp",name:"真人對局",count:((await idb.get("games:pvp"))||[]).length},
      {key:"study",name:"我的研究",count:((await idb.get("games:study"))||[]).length});return out}
  async function dbItems(c){
    if(c==="study")return{name:"我的研究",note:"推演變化後按「💾 存成棋譜」存在這支手機裡的研究",items:((await idb.get("games:study"))||[]).slice().reverse().map(g=>summary(studyItem(g)))};
    if(c==="play"||c==="pvp")return{name:c==="play"?"人機對局":"真人對局",note:"這支手機上下完的對局",items:(await gameItems(c)).map(summary)};
    const d=await loadBook(c);if(!d)throw new Error("手機裡沒有這個資料夾"+(remoteInfo()?"，可以按「從電腦同步」下載":""));
    return{name:d.name,book:d.book,source:d.source,players:d.players||null,items:d.items.map(summary)}}
  async function dbItem(c,id){
    if(c==="study"){const g=((await idb.get("games:study"))||[]).find(x=>x.id===id);if(!g)throw new Error("找不到這份研究");return studyItem(g)}
    if(c==="play"||c==="pvp"){const it=(await gameItems(c)).find(x=>x.id===id);if(!it)throw new Error("找不到這一局");return it}
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
    let ok=false;if(/^https:\/\//.test(base)&&key){ls.set("remote",{base,key,at:Date.now()});lastPing={at:0,ok:false};XQ_justConnected=true;ok=true}
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
    try{await remote("/remote",undefined,{signal:ac.signal});lastPing={at:Date.now(),ok:true}}catch(e){lastPing={at:Date.now()-5000,ok:false}}finally{clearTimeout(tm)}
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
    if(p==="/quiz/data"||p==="/terms/data"){const r=await fetch("data/"+p.slice(1,-5)+".json");if(!r.ok)throw new Error("找不到題庫");return r.json()}
    if(p==="/play/state")return playState();
    if(p.startsWith("/play/"))return playPost(p,b||{});
    // 線上大廳的網路對局（不用電腦）
    if(p.startsWith("/pvp/")&&window.XQNet&&XQNet.active())return netPvp(p,b||{});
    // 兩支手機連線對戰：雙人對戰改走電腦（兩支手機看同一盤）
    if(p.startsWith("/pvp/")&&ls.get("pvpOnline",false))return remote(u,b);
    if(p==="/pvp/state")return pvpState();
    if(p.startsWith("/pvp/"))return pvpPost(p,b||{});
    if(p.startsWith("/an/"))return anPost(p,b||{});
    throw new Error("離線版不支援："+p)}
  return{api,remoteInfo,ping,sync,parseConnect,setPvpOnline(on){ls.set("pvpOnline",!!on)},unsync,syncedBooks,disconnect(){localStorage.removeItem("xq_remote");lastPing={at:0,ok:false}},
    engineCached:async()=>{try{const c=await caches.open("xqlab-engine");return!!(await c.match(BASE+"engine/pikafish.nnue"))}catch(e){return false}}};
})();
var XQ_justConnected=XQ_justConnected||false;
