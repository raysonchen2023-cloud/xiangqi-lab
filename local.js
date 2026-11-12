// 離線後端：在手機上處理原本要送到電腦的請求（網址與回傳格式跟 xiangqi-referee.js 相同），
// 讓同一套 App 畫面不連電腦也能用。只有 AI 對戰、AI 講解、同步棋譜要連上電腦。
"use strict";
var XQ=(function(){
  const C=XQCore,BASE=new URL("./",location.href).href;
  const{START,parseFen,fen,legal,inCheck,kingSq,iccs,parseSq,notate,opp,LEVELS:LEVELS8,stateApply,judgeState,pickMove,ANALYZE_MS,classifyRaw,gradeLoss,qName,PLAYER,summary,fullItem,gameItem}=C;
  const gameId=()=>new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
  /* 棋規設定（11/11 Gemini 架構報告第一項；註冊表在 xiangqi-referee.js 的 RULESETS）：每次重放都先把這盤的 rc 整理好再交給裁判——
     舊存檔沒有 rc 就補預設（千秋休閒規則＋目前裁判版本）；有 rc 就沿用開局時那份，開局後改設定不影響這盤 */
  const stateRebuild=S=>{S.rc=C.ruleConfigOf(S);return C.stateRebuild(S)};
  const ls={get(k,d){try{const v=localStorage.getItem("xq_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("xq_"+k,JSON.stringify(v))}catch(e){}}};
  /* 設定頁的「棋規」：只影響之後新開的自由對局（挑戰電腦非晉級賽、同機對下、車輪戰、線上邀請）；晉級賽、擂台、石桌往事、錯棋重練一律千秋休閒規則 */
  const rulePref=()=>{const v=ls.get("ruleset",C.RULESET_DEFAULT);return C.RULESETS[v]?v:C.RULESET_DEFAULT};
  window.XQ_rulePref=rulePref;window.XQ_setRulePref=id=>{ls.set("ruleset",C.RULESETS[id]?id:C.RULESET_DEFAULT);return rulePref()};

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
  /* 開發者 11/6（第二裁判）：評語分界線放寬、妙著排除應將和回吃——新評等用新的快取鑰匙 g2（回吃要看對方上一步落在哪：lt）；舊快取 g: 有「少幾分」就照新分界線重算評語，不用讓引擎重跑 */
  /* ChatGPT 數值盤查 11/11 P1 引擎空結果（舊快取）：舊版第二次查詢缺 PV 時把「不是最佳著、loss＝0」寫成正著，這種快取分不出真假，
     所以不整批清掉，只把「不是最佳著、loss＝0、又沒有新版 bmt 欄位」的那筆（g2: 或舊的 g:）當成可疑、請引擎重評一次；重評失敗（引擎沒載好、又缺 PV）就照舊用快取，不會比原本差 */
  const gradeSus=(x,f,t)=>!!x&&x.loss===0&&!!x.bm&&x.bm!==iccs(f,t)&&x.bmt===undefined;
  async function classify(b,s,f,t,lt){const cap=!!b[t],k="g2:"+fen(b,s)+"|"+iccs(f,t)+(cap&&lt!=null?"|"+lt:"");const c=await idb.get(k);if(c&&!gradeSus(c,f,t)){c.q=qName(c.q);return c}
    const o=c?null:await idb.get("g:"+fen(b,s)+"|"+iccs(f,t)),old=()=>{const r={...o,q:qName(o.q)};if(r.q==="妙著"){if(inCheck(b,s)||(cap&&lt===t))r.q="正著"}else if(r.q!=="—")r.q=gradeLoss(r.loss);return r};
    if(o&&o.loss!=null&&!gradeSus(o,f,t)){const r=old();await idb.set(k,r);return r}
    let r;try{r=await classifyRaw(b,s,f,t,undefined,lt)}catch(e){if(c){c.q=qName(c.q);return c}if(o&&o.loss!=null){const x=old();await idb.set(k,x);return x}throw e}
    if(r)await idb.set(k,r);else if(c){c.q=qName(c.q);return c}return r}
  // 依序評等一盤棋裡還沒評等的步
  // pause()：回傳 true 就先停下來（例如輪到電腦走，讓 Pikafish 先想棋，評等等一下再補）
  async function analyzeList(S,save,pause){
    for(let i=0;i<S.moves.length;i++){const m=S.moves[i];if(m.q&&qName(m.q)!==m.q){m.q=qName(m.q);save()}if(m.q){if(m.loss!=null&&m.q!=="妙著"&&m.q!=="—"&&m.q!==gradeLoss(m.loss)){m.q=gradeLoss(m.loss);save()}continue}if(pause&&pause())return;
      const[bs,sd]=S.pos[i].split(" ");let r=null;try{r=await classify(parseFen(bs),sd==="w"?"r":"b",m.f,m.t,i>0&&S.moves[i-1]?S.moves[i-1].t:null)}catch(e){if(e&&e.retry)continue;return}   /* ChatGPT 數值盤查 11/11 P1：缺 PV（e.retry）＝這步先留著未評、往下評別步，下次分析再補；其他錯誤（引擎載不到）照舊整批停 */
      if(S.moves[i]!==m)return;if(r)Object.assign(m,r);else m.q="—";save()}}
  /* 開發者 11/11 照三方審查（影子模式）：多帶 bv＝最佳著法評估的原值（紅方視角、沒夾 ±2000，core.js classifyRaw 新加的），新算法判「漏殺」和匿名對局資料要用；舊存檔沒有 bv，新算法改用 ev 夾值後＋loss 還原
     ChatGPT 數值盤查 11/11 P1：再多帶 bmt、pmt（殺棋訊號，走方視角，見 core.js classifyRaw），賽後講解只在真的有殺時才說「有殺／錯過殺棋」 */
  const moveOut=m=>({f:m.f,t:m.t,by:m.by,cn:m.cn,ck:m.ck,q:m.q,loss:m.loss,ev:m.ev,bv:m.bv,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp});
  const lastEv=ms=>{for(let i=ms.length-1;i>=0;i--)if(ms[i].ev!=null)return{v:ms[i].ev,ply:i+1};return null};
  const saveMoves=ms=>ms.map(m=>({f:m.f,t:m.t,by:m.by,q:m.q,loss:m.loss,ev:m.ev,bv:m.bv,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp}));   /* bv：見 moveOut（開發者 11/11 影子模式）；bmt、pmt 同上（數值盤查 11/11）；沒有就是 undefined，JSON 存檔時自動省略 */
  /* 意見回饋 619：存棋譜排隊一筆一筆來（以前兩筆同時存會互相蓋掉），同一個 id 不重複存 */
  let PG=Promise.resolve();
  function pushGame(kind,g){const p=PG.then(async()=>{const list=(await idb.get("games:"+kind))||[];if(g&&g.id&&list.some(x=>x.id===g.id))return;list.push(g);await idb.set("games:"+kind,list)});PG=p.catch(()=>{});return p}
  /* ChatGPT 評審 11/11（未評完的狀態）：下完那一刻 pushGame 存的棋譜，最後幾步常常還沒評（評等在背景跑），缺 PV（e.retry）的步也要等之後重評；
     以前評好的只寫進目前這盤（ls play），存起來的棋譜永遠缺那幾步，對局紀錄、檢討頁就一直「沒評完」。gamePatch 把後來評好的補進存檔：
     G＝{第幾步: {f,t,q,loss,…}}，f、t 要跟存檔那一步一樣才補，已經有評等的不動（排在 PG 後面，不會跟 pushGame 互相蓋掉） */
  const GRK=["q","loss","ev","bv","bmt","pmt","rr","bc","bm","bp"];
  function gamePatch(kind,id,G){if(!id||!G||typeof G!=="object")return Promise.resolve(0);
    const p=PG.then(async()=>{const list=(await idb.get("games:"+kind))||[],g=list.find(x=>x&&x.id===id);if(!g||!Array.isArray(g.moves))return 0;let n=0;
      for(const[k,v]of Object.entries(G)){const m=g.moves[(+k)-1];if(!m||!v||!v.q||m.q||v.f!==m.f||v.t!==m.t)continue;for(const x of GRK)if(v[x]!==undefined)m[x]=v[x];n++}
      if(n)await idb.set("games:"+kind,list);return n});PG=p.catch(()=>{});return p}
  const movesG=ms=>{const G={};ms.forEach((m,i)=>{if(m&&m.q)G[i+1]=m});return G};
  /* 我方還有幾步沒評（含缺 PV 等重評的）：對局紀錄清單用；線上對局本來就不會自動評，一步都沒評過的不算「在分析」 */
  const pendOf=(c,it)=>{const sd=c==="play"?(it.red==="你"?"r":it.black==="你"?"b":null):it.mine,ms=it.lines&&it.lines[0]&&it.lines[0].moves;
    if(!it.result||(sd!=="r"&&sd!=="b")||!Array.isArray(ms))return{};if(c==="pvp"&&!ms.some(m=>m.q))return{};const n=ms.filter(m=>m.by===sd&&!m.q).length;return n?{pend:n}:{}};

  // ---------- 挑戰電腦 ----------
  let P=null,playBusy=false,playMsg="",paBusy=false,engFail=0,engWait=false;   /* 11/11：電腦出棋失敗的次數、是不是在等網路回來（playEngine） */
  // 積分挑戰：跟線上對戰一樣的段位（新手～專2-2），但分開記分。電腦的強度跟著你目前的段位走，段位越高越難。
  const RANKS=[["新手",0],["入門1",50],["入門2",100],["入門3",150],["業1",200],["業2",300],["業3",400],["業4",500],["業5",600],["業6",700],["業7",800],["業8",900],["業9",1000],["專1-1",1150],["專1-2",1300],["專2-1",1500],["專2-2",1700]];
  const rankIdx=p=>{let i=0;for(let k=0;k<RANKS.length;k++)if((p||0)>=RANKS[k][1])i=k;return i};
  /* HUMANPICK:BEGIN */
  /* 低段電腦擬人選步（評審 P17.3 AI 擬真與分級、P05.4 難度與挫折控制、P20.4 挫折容忍，11/11）：
     新手～業1（RLV 帶 hm 的五級）不再「margin 內平均亂抽」（會平白把車送給你、也會突然下出好棋），改成模擬人類新手的「看法」。
     說明、參數表、改前改後數據：xiangqi-db/story/98_低段電腦擬人.md；測試：xiangqi-lab/tools/test-human-ai.js；對戰統計：xiangqi-lab/tools/human-ai-match.js
     純函式區塊（只用 C＝XQCore，不碰存檔、畫面、引擎、Math.random），測試與統計工具把 BEGIN～END 切出來跑：
       const HP=HUMANPICK(C)；HP.on(lv)＝這一級用不用擬人；HP.mpvOf(lv)＝要引擎給幾條候選；HP.pick(r,lv,board,side,rnd)→{mv,why,…}（rnd 可注入固定亂數）
     做法：引擎（淺層、MultiPV 多條）給每個候選的分數 v（走方視角厘兵）；再用規則算「這步走完，對方吃得到我哪幾顆子、各淨虧多少」（吃了我吃得回來就扣掉），
     每個威脅照等級的機率決定「有沒有看到」：
       old＝本來就被捉的子（漏看你的威脅）、disc＝這步移開擋子才露出來的、maj／min＝剛走過去那顆（大子車馬炮／小子；車沒注意的機率再除以 3）、recap＝吃子後被吃回（貪吃）；
       see＝自己可以吃的子有沒有看到、mate＝自己一步殺有沒有看到、mated＝這步走完會被殺有沒有看到；
     沒看到的虧損加回分數（以為沒事），看到的照引擎；吃子（有看到）再加貪吃分 greed；常用子（車馬炮）小加分、士象帥小扣分；
     最後加 Gumbel 雜訊（溫度 T 厘兵）挑最高。只看局面、不看比分：不會因為你快輸了就突然變強或變弱 */
  const HUMANPICK=function(C){
    const U={K:0,R:9,C:4.5,N:4,B:2,A:2,P:1},CPU=130;   /* CPU：1 個兵約多少厘兵（Pikafish 淺層實測：炮 4.5 兵≈600 厘兵） */
    const PROF=[
      {name:"新手",mpv:40,old:.45,maj:.97,min:.85,disc:.30,recap:.35,see:.70,greed:.50,mate:.55,mated:.50,T:110},
      {name:"入門1",mpv:36,old:.56,maj:.975,min:.88,disc:.35,recap:.48,see:.78,greed:.40,mate:.70,mated:.60,T:90},
      {name:"入門2",mpv:32,old:.64,maj:.98,min:.90,disc:.47,recap:.60,see:.86,greed:.30,mate:.80,mated:.72,T:75},
      {name:"入門3",mpv:28,old:.78,maj:.99,min:.94,disc:.62,recap:.74,see:.92,greed:.22,mate:.90,mated:.84,T:60},
      {name:"業1",mpv:24,old:.88,maj:.995,min:.97,disc:.75,recap:.85,see:.96,greed:.15,mate:.96,mated:.92,T:45}];
    const DESC=["只看一步，常漏看你的威脅、見子就吃","只看一步，會漏看威脅、愛吃子","往後算 2 步，偶爾漏看、有時貪吃","往後算 2 步，偶爾漏看","往後算 3 步，偶有失誤"];
    const PREF={R:10,C:15,N:15,P:5,B:-15,A:-20,K:-35};
    const up=p=>p.toUpperCase(),rowOf=i=>i/9|0,inb=(r,c)=>r>=0&&r<10&&c>=0&&c<9;
    const D4=[[1,0],[-1,0],[0,1],[0,-1]],DG=[[1,1],[1,-1],[-1,1],[-1,-1]],NJ=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
    /* 子力：兵過河算 2 */
    function val(p,sq){const t=up(p);if(t!=="P")return U[t];return(C.sideOf(p)==="r"?rowOf(sq)<=4:rowOf(sq)>=5)?2:1}
    /* 一顆子走得到的格子（跟 core.js 的 pseudo 同一套規則；不檢查送將，送將由 C.legalOk 擋） */
    function reach(b,sq){const p=b[sq],r=rowOf(sq),c=sq%9,s=C.sideOf(p),t=up(p),out=[];
      const add=(rr,cc)=>{if(!inb(rr,cc))return;const q=b[rr*9+cc];if(!q||C.sideOf(q)!==s)out.push(rr*9+cc)};
      const pal=(rr,cc)=>cc>=3&&cc<=5&&(s==="r"?rr>=7&&rr<=9:rr>=0&&rr<=2);
      if(t==="K"){for(const[a,d]of D4)if(pal(r+a,c+d))add(r+a,c+d)}
      else if(t==="A"){for(const[a,d]of DG)if(pal(r+a,c+d))add(r+a,c+d)}
      else if(t==="B"){for(const[a,d]of DG){const rr=r+2*a,cc=c+2*d;if(!inb(rr,cc)||(s==="r"?rr<5:rr>4)||b[(r+a)*9+c+d])continue;add(rr,cc)}}
      else if(t==="N"){for(const[a,d,la,ld]of NJ){const rr=r+a,cc=c+d;if(!inb(rr,cc)||b[(r+la)*9+c+ld])continue;add(rr,cc)}}
      else if(t==="R"||t==="C"){for(const[a,d]of D4){let rr=r+a,cc=c+d,jumped=false;while(inb(rr,cc)){const q=b[rr*9+cc];
          if(t==="R"){if(!q)out.push(rr*9+cc);else{if(C.sideOf(q)!==s)out.push(rr*9+cc);break}}
          else if(!jumped){if(!q)out.push(rr*9+cc);else jumped=true}else if(q){if(C.sideOf(q)!==s)out.push(rr*9+cc);break}
          rr+=a;cc+=d}}}
      else if(t==="P"){const f=s==="r"?-1:1;add(r+f,c);if(s==="r"?r<=4:r>=5){add(r,c-1);add(r,c+1)}}
      return out}
    /* by 方有沒有子能合法吃到 sq */
    function canHit(b,sq,by){for(let i=0;i<90;i++){const p=b[i];if(p&&C.sideOf(p)===by&&reach(b,i).includes(sq)&&C.legalOk(b,i,sq))return true}return false}
    /* 輪到對方走時，s 方哪些子被吃、各淨虧幾個兵：{格: 淨虧}；吃了我吃得回來＝扣掉吃子那顆的價值，淨虧 ≤0 不算威脅（帥將不算，將軍由合法著法處理） */
    function threats(b,s){const o=C.opp(s),hit={},out={};
      for(let i=0;i<90;i++){const p=b[i];if(!p||C.sideOf(p)!==o)continue;for(const t of reach(b,i)){const q=b[t];if(q&&C.sideOf(q)===s&&up(q)!=="K")(hit[t]||(hit[t]=[])).push(i)}}
      for(const k in hit){const t=+k,v=val(b[t],t);let worst=0;
        for(const f of hit[k]){if(!C.legalOk(b,f,t))continue;const back=canHit(C.make(b,f,t),t,s),l=v-(back?val(b[f],t):0);if(l>worst)worst=l}
        if(worst>0)out[t]=worst}
      return out}
    const maxOf=o=>{let m=0;for(const k in o)if(o[k]>m)m=o[k];return m};
    const on=lv=>!!lv&&!lv.movetime&&Number.isInteger(lv.hm)&&!!PROF[lv.hm];
    const profOf=lv=>on(lv)?PROF[lv.hm]:null;
    const mpvOf=lv=>{const P=profOf(lv),n=+(lv&&lv.multipv)||1;return P?Math.max(P.mpv,n):n};
    const gum=R=>{const u=Math.min(1-1e-12,Math.max(1e-12,R()));return-Math.log(-Math.log(u))};
    /* 一個候選的特徵：real＝走完實際淨虧（最大的那個威脅）、felt＝有看到的淨虧、cap＝吃到的子力 */
    /* 「有沒有看到」每一步只抽一次（不是每個候選各抽）：這一步有沒有留意走過去那格、有沒有留意移開後露出來的、吃子後會不會被吃回；
       本來就被捉的子每顆各抽一次。這樣「沒注意」的機率就是這一步真的犯錯的上限，不會因為候選多就放大 */
    function look(b,s,x,before,seen){const f=C.parseSq(x.mv.slice(0,2)),t=C.parseSq(x.mv.slice(2,4)),p=b[f],q=b[t];
      const th=threats(C.make(b,f,t),s);let real=0,felt=0;
      for(const k in th){const sq=+k,l=th[k],kind=sq===t?(q?"recap":up(p)==="R"?"rook":"RNC".includes(up(p))?"maj":"min"):before[sq]!=null?"old":"disc";
        const ok=kind==="old"?seen.old[sq]:seen[kind];
        if(l>real)real=l;if(ok&&l>felt)felt=l}
      return{f,t,p,q,cap:q?val(q,t):0,real,felt}}
    function pick(r,lv,b,s,rnd){const P=profOf(lv),R=rnd||Math.random,lines=((r&&r.lines)||[]).filter(x=>x&&typeof x.mv==="string"&&/^[a-i]\d[a-i]\d$/.test(x.mv)&&b[C.parseSq(x.mv.slice(0,2))]);
      if(!P||lines.length<2)return{mv:(lines[0]&&lines[0].mv)||r.best,why:"single"};
      const before=threats(b,s),seen={old:{}};for(const k of Object.keys(before).map(Number).sort((x,y)=>x-y))seen.old[k]=R()<P.old;
      for(const k of["maj","min","disc","recap"])seen[k]=R()<P[k];
      seen.rook=seen.maj||R()<2/3;   /* 車走到被吃的格子：沒注意的機率只有大子的三分之一（平白送車最傷玩家的感受） */
      const seeMate=R()<P.mate,seeMated=R()<P.mated,capSeen={};
      const qv=lines.filter(x=>x.mate==null).map(x=>x.v).sort((x,y)=>x-y),med=qv.length?qv[qv.length>>1]:0;
      let best=null;
      for(const x of lines){const F=look(b,s,x,before,seen);
        const v=x.mate!=null?(x.mate>0?(seeMate?3000:med):(seeMated?-3000:med)):Math.max(-2500,Math.min(2500,x.v));
        let sc=v+(F.real-F.felt)*CPU;
        if(F.cap){if(capSeen[F.t]==null)capSeen[F.t]=R()<P.see;sc+=capSeen[F.t]?P.greed*F.cap*CPU:-F.cap*CPU}
        sc+=PREF[up(F.p)]||0;const z=sc+P.T*gum(R);
        if(!best||z>best.z)best={x,F,sc,z}}
      const F=best.F;
      return{mv:best.x.mv,why:F.real>F.felt?(F.q?"greedy":"blind"):F.cap?"capture":"move",v:best.x.v,top:lines[0].v,real:F.real,felt:F.felt,cap:F.cap}}
    return{U,CPU,PROF,DESC,PREF,val,reach,canHit,threats,maxOf,on,profOf,mpvOf,look,pick}};
  /* HUMANPICK:END */
  const HP=HUMANPICK(C);
  // 每個段位對應的電腦強度：算幾步（depth）、從前幾名著法裡挑（multipv）、可以比最好的差多少分（margin，越大越會失誤）
  //   hm＝低段擬人選步的等級（HUMANPICK 的 PROF；有 hm 就不用 margin 平均亂抽，multipv 改用 HP.mpvOf）；margin 留著給笑面掌櫃（STYLEPICK）當基準
  const RLV=[{depth:1,multipv:10,margin:700,hm:0},{depth:1,multipv:10,margin:500,hm:1},{depth:2,multipv:8,margin:350,hm:2},{depth:2,multipv:8,margin:260,hm:3},
    {depth:3,multipv:6,margin:200,hm:4},{depth:4,multipv:6,margin:150},{depth:5,multipv:5,margin:120},{depth:6,multipv:4,margin:90},{depth:7,multipv:4,margin:70},
    {depth:8,multipv:3,margin:50},{depth:9,multipv:3,margin:35},{depth:10,multipv:3,margin:25},{depth:12,multipv:2,margin:15},
    {movetime:300},{movetime:500},{movetime:1200},{movetime:3000}];
  /* 意見回饋 590（開發者：電腦的級數再細分，照 新手／入門×N／業×N／專×N）：挑戰電腦改成 18 級，名字和強度跟積分挑戰的段位一樣，最上面多一級「專3・全力」。
     舊的 1～8 級（石桌往事、擂台、園子路人傳來的 level，還有以前存的紀錄）照強度換算：1→入門1、2→入門3、3→業2、4→業5、5→業7、6→專1-2、7→專2-1、8→專3 */
  const LVDESC=x=>x.movetime?`每步想 ${x.movetime/1000} 秒，不放水`:HP.on(x)?HP.DESC[x.hm]:`往後算 ${x.depth} 步，`+(x.margin>=500?"常常亂走":x.margin>=250?"會漏子":x.margin>=150?"偶有失誤":x.margin>=70?"小失誤":x.margin>=35?"很少失誤":"幾乎不失誤");
  const LEVELS=[...RLV,{movetime:6000}].map((x,i)=>({...x,n:i+1,name:i<RANKS.length?RANKS[i][0]:"專3・全力",desc:i===RLV.length?"每步想 6 秒，人類幾乎贏不了":LVDESC(x)}));
  const OLD2FINE=[6,2,4,6,9,11,15,16,18],lvOld=n=>OLD2FINE[Math.max(1,Math.min(8,Math.round(+n)||3))];
  const lvIn=b=>b&&b.lx!=null&&Number.isFinite(+b.lx)?Math.max(1,Math.min(LEVELS.length,Math.round(+b.lx))):lvOld(b&&b.level);
  /* 意見回饋 675：App 的航行難度——星槎裡的對局（園子、驛站、秘境、擂主、章回棋路）多傳 dx＝加減幾段（-6～6）；往上最多到專2-2（第 17 級），原本就是 18 級的不動；挑戰電腦、積分挑戰不傳 */
  const dxOf=b=>{const d=Math.round(+((b||{}).dx));return Number.isFinite(d)?Math.max(-6,Math.min(6,d)):0},lvAdj=(b,n)=>{const d=dxOf(b);return !d?n:d>0?Math.min(Math.max(n,17),n+d):Math.max(1,n+d)};
  (function lvMig(){if(ls.get("lvFine",0))return;try{
    const R=ls.get("record",null);if(R){const R2={};for(const[k,v]of Object.entries(R)){const o=R2[lvOld(k)]||(R2[lvOld(k)]={w:0,l:0,d:0});for(const z of["w","l","d"])o[z]+=(v&&v[z])||0}ls.set("record",R2)}
    const p=ls.get("play",null);if(p&&p.level){p.level=lvOld(p.level);ls.set("play",p)}
    const s2=ls.get("play2",null);if(s2){if(s2.moves){if(s2.level)s2.level=lvOld(s2.level)}else for(const g of Object.values(s2))if(g&&g.level)g.level=lvOld(g.level);ls.set("play2",s2)}
    try{const c=localStorage.getItem("m_cpuLevel");if(c!=null)localStorage.setItem("m_cpuLevel",JSON.stringify(lvOld(JSON.parse(c))))}catch(e){}
    Promise.resolve().then(async()=>{try{const list=await idb.get("games:play");if(list&&list.length){list.forEach(g=>{if(g&&g.level)g.level=lvOld(g.level)});await idb.set("games:play",list)}}catch(e){}});
  }catch(e){}ls.set("lvFine",1)})();
  const cpuRate=()=>ls.get("cpuRate",null)||{pts:0,w:0,l:0,d:0,hist:[]};
  /* 數學修正 11/11（審查 5-A）：段位遲滯——積分照算，但「顯示的段位」R.rk 另外記：升段馬上升；降段要積分掉到本段下限再減半個段寬、而且升段後至少下滿 3 盤。
     模擬（mathfix2/sim/sim-rank-hysteresis.js，實力不變，K 48／32）：每 100 盤升降次數 32→11、17→3.1、17→3.6 次（真實 Elo 1000／1300／1600）；積分本身沒改，長期平均積分不變，
     顯示段位平均比照積分算的高約 0.23～0.34 段（遲滯的代價，刻意偏向不讓孩子馬上掉段；這段期間電腦照顯示段位挑，勝率約 35～39%）。
     K 值：開發者 11/11 照三方審查維持「前 15 盤 48、之後 32」，不降到 24——Claude 複審實測 K＝24 讓進步的孩子升段慢 40～60%；K 48／32 時進步 150 分後升段的盤數跟舊制一樣（中位 8～9／9／24～25 盤，review-rank.js）。
     src/net.js 的 rankHold 是同一段邏輯 */
  const rankHold=(R,before)=>{const n=(R.w||0)+(R.l||0)+(R.d||0);if(R.rk==null||!RANKS[R.rk])R.rk=rankIdx(before!=null?before:R.pts);const i=rankIdx(R.pts);
    if(i>R.rk){R.rk=i;R.pn=n}else if(i<R.rk){const lo=RANKS[R.rk][1],w=(RANKS[R.rk+1]?RANKS[R.rk+1][1]:lo+200)-lo;if(R.pts<lo-w/2&&n-(R.pn||0)>=3)R.rk=i}return R.rk};
  const heldIdx=R=>R.rk!=null&&RANKS[R.rk]?R.rk:rankIdx(R.pts),kOf=n=>n<15?48:32;
  /* 意見回饋 段位失準：跟線上一樣改成等級分的期望勝率（對手＝開局時那一段的電腦，強度取那一階的中間），不再固定贏 +20、輸 −15 */
  function cpuRateApply(res){const R=cpuRate(),before=R.pts,rk0=heldIdx(R),lo=RANKS[P.rk][1],hi=RANKS[P.rk+1]?RANKS[P.rk+1][1]:lo+200,op=(lo+hi)/2;
    const E=1/(1+Math.pow(10,(op-R.pts)/400)),K=kOf((R.w||0)+(R.l||0)+(R.d||0));
    let d=Math.round(K*((res==="w"?1:res==="d"?.5:0)-E));if(res==="w"&&d<1)d=1;if(res==="l"&&d>-1)d=-1;R.pts=Math.max(0,R.pts+d);d=R.pts-before;R[res]++;
    rankHold(R,before);R.hist.unshift({id:P.id,res,d,pts:R.pts,rk:RANKS[P.rk][0],n:P.moves.length,why:P.result?P.result.why:"",at:Date.now()});R.hist=R.hist.slice(0,100);ls.set("cpuRate",R);
    P.rate={res,d,pts:R.pts,rank:RANKS[R.rk][0],was:RANKS[rk0][0]}}
  /* 意見回饋 415：這盤用過幾次提示（/play/hint、雲河棋路的提示棋 /play/hintmark）、悔過幾次棋（/play/undo）。
     存檔時一起寄進對局紀錄，我的戰績算棋力、成長時把這種盤排除，才公平；舊存檔沒有這兩欄就照算 */
  const assist=G=>({...(G&&G.hintN?{hintN:G.hintN}:{}),...(G&&G.undoN?{undoN:G.undoN}:{})});
  const keepStart=G=>({...(G&&G.start?{start:G.start,startTurn:G.startTurn||"r"}:{}),...(G&&G.noPerp?{noPerp:true}:{}),...(G&&G.styleOn!=null?{styleOn:G.styleOn}:{}),...(G&&G.opp==="zhanggui"?{opp:"zhanggui"}:{})});   /* 對局中途可接續（開發者 11/9）：殘局起手、讓子的關（start）關掉 App 再打開或收起來再拿出來，要從同一個起始局面重建，不然盤面會錯 */
  /* ---------- 存檔版本號、保存紀錄（評比循環第 2 輪 ChatGPT：續局與分頁衝突的可視化復原紀錄；各鍵的格式見 story/88 第 8 節）----------
     xq_play 最前面多兩欄：seq＝第幾版（每次寫 +1）、tab＝寫的那個分頁的代號（sessionStorage xqTab，同一個分頁重新整理不變）。VER＝這個分頁「知道的那一版」（讀進來的或自己寫的）。
     savePlay 寫之前先看 localStorage 裡現在是哪一版：跟 VER 不一樣＝另一個分頁在這之後寫過 → 不覆蓋，丟掉記憶體那份（下次 ensureP 重讀最新的），發 xq-play-newer（畫面提示）。
     ensureP 每次都先比版本，不一樣就重讀（以前只在第一次讀），所以舊分頁按下去的那一步是下在最新的盤面上。
     xq_playPrev＝上一版的原文（寫新版前先把舊版搬過去）：xq_play 壞掉（JSON 讀不出來、缺 moves）時改讀它＝回到最後一個完整存檔。setItem 丟例外（空間不足）時舊版原封不動、VER 不變。
     xq_playBak＝被另一個分頁換掉、或回到別盤時從收納格被擠出來的「沒下完的棋」（最多 3 盤），「↩ 回到那一盤」從這裡或 xq_play2 拿回。
     xq_saveLog＝最近 20 筆保存事件（時間、哪一盤、事件；不存棋譜），設定頁「💾 存檔 → 🧾 對局保存紀錄」看（07m4-resume.js rsLogSheet） */
  const TAB=(()=>{let t=null;try{t=sessionStorage.getItem("xqTab")}catch(e){}if(!t||!/^[\w-]{4,16}$/.test(t)){t=Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);try{sessionStorage.setItem("xqTab",t)}catch(e){}}return t})();
  let VER=null,PID=null,LOADED=false;
  const lsRaw=k=>{try{return localStorage.getItem(k||"xq_play")}catch(e){return null}};
  const headOf=raw=>{const m=raw==null?null:/^\{"seq":(\d+),"tab":"([\w-]*)","id":"([^"]*)"/.exec(raw);return m?{seq:+m[1],tab:m[2],id:m[3]}:null};
  const verOf=raw=>{if(raw==null)return"-";const h=headOf(raw);return h?h.seq+"|"+h.tab:"0|L"+raw.length};
  const pOk=s=>!!(s&&typeof s==="object"&&typeof s.id==="string"&&Array.isArray(s.moves));
  const LOG_N=20,LOG_MERGE={auto:1,fail:1};
  const logInfo=G=>G&&G.id?{id:String(G.id).slice(0,40),k:kindOf(G),n:Array.isArray(G.moves)?G.moves.length:0,...(G.ranked?{rkd:1}:{}),...(G.arena?{ar:String(G.arena).slice(0,12)}:{}),...(G.journey?{jn:String(G.journey).slice(0,40)}:{}),...(G.practice&&G.practice.title?{pt:String(G.practice.title).slice(0,30)}:{}),...(G.practice&&G.practice.drill?{dr:1}:{}),...(G.result?{end:1}:{})}:{};
  function saveLog(ev,G,x){try{const L=ls.get("saveLog",[]),A=Array.isArray(L)?L.filter(y=>y&&typeof y==="object"):[],o={at:Date.now(),ev,...logInfo(G),...(x||{}),tab:TAB},h=A[0];
    if(ev==="auto"&&!o.n)return;
    if(h&&LOG_MERGE[ev]&&h.ev===ev&&h.id===o.id){h.at=o.at;h.n=o.n;h.c=(h.c||1)+1;h.tab=TAB;if(o.end)h.end=1}
    else if(ev==="swap"&&A.slice(0,5).some(y=>y.ev==="swap"&&y.id===o.id&&y.to===o.to))return;
    else A.unshift(o);ls.set("saveLog",A.slice(0,LOG_N))}catch(e){}}
  const playOut=()=>({id:P.id,rc:P.rc||null,human:P.human,level:P.level,rlv:P.rlv==null?null:P.rlv,ranked:!!P.ranked,reward:!!P.reward,arena:P.arena||null,journey:P.journey||null,stamp:P.stamp||null,prize:P.prize||null,rk:P.rk,rate:P.rate||null,result:P.result,practice:P.practice||null,...assist(P),...keepStart(P),moves:saveMoves(P.moves)});
  function playWrite(prev){if(!P)return false;const raw=lsRaw(),v=verOf(raw),h=headOf(raw);
    if(VER!=null&&v!==VER){const G=P;P=null;VER=null;saveLog("clash",G);try{window.dispatchEvent(new CustomEvent("xq-play-newer",{detail:{id:G.id}}))}catch(e){}return false}
    const seq=(h?h.seq:0)+1,take=!!(h&&h.tab&&h.tab!==TAB&&h.id===P.id);
    if(prev&&raw!=null)try{localStorage.setItem("xq_playPrev",raw)}catch(e){}
    try{localStorage.setItem("xq_play",JSON.stringify({seq,tab:TAB,...playOut()}))}catch(e){saveLog("fail",P);return false}
    VER=seq+"|"+TAB;PID=P.id;PN=P.moves.length;LOADED=true;saveLog(take?"take":"auto",P);return true}
  function savePlay(){return playWrite(true)}
  /* 回傳 true＝這個分頁原本看到的那盤（PID 第 PN 手）已經被另一個分頁改了（換了盤或步數變了）：playPost 落子、悔棋、認輸這類動作就不做，改提示、回最新盤面 */
  let PN=-1;
  function ensureP(){if(P&&verOf(lsRaw())!==VER)P=null;if(P)return false;
    const raw=lsRaw(),was=LOADED?{id:PID,n:PN}:null;let s=null,fix=false;try{s=raw==null?null:JSON.parse(raw)}catch(e){}
    if(raw!=null&&!pOk(s)){s=null;let q=null;try{q=JSON.parse(lsRaw("xq_playPrev"))}catch(e){}if(pOk(q)){s=q;fix=true}}
    VER=verOf(raw);const first=!LOADED;LOADED=true;
    if(s&&s.moves){try{P=s;P.hint=null;stateRebuild(P)}catch(e){P=null}}
    if(P){PID=P.id;PN=P.moves.length;if(fix){playWrite(false);saveLog("fix",P)}else if(first&&unfinished(P))saveLog("reopen",P)}
    else playNew("r",3);
    setTimeout(playEngine,0);return!!(was&&P&&(was.id!==P.id||was.n!==P.moves.length))}
  const PLAY_MUT=new Set(["/play/move","/play/undo","/play/resign","/play/repdraw","/play/repundo","/play/hint","/play/hintmark"]);
  const stashHas=id=>Object.values(stashAll()).some(g=>g&&g.id===id);
  function bakPut(G){if(!unfinished(G))return;const L=(ls.get("playBak",[])||[]).filter(x=>x&&x.id!==G.id);L.unshift({...stashOut(G),at:Date.now()});ls.set("playBak",L.slice(0,3))}
  /* 「↩ 回到那一盤」：從 xq_play2 或 xq_playBak 拿出那一盤放上桌；桌上原本沒下完的收進自己那一格（那一格原本有別盤就擠進 xq_playBak），什麼都不丟 */
  function playRestore(id){id=String(id||"");if(!id)throw new Error("缺少對局代號");if(P&&P.id===id)return;
    const SA=stashAll(),k0=Object.keys(SA).find(k=>SA[k]&&SA[k].id===id),B=(ls.get("playBak",[])||[]).filter(x=>x&&typeof x==="object"),bi=B.findIndex(x=>x.id===id);
    const g=k0?SA[k0]:bi>=0?B[bi]:null;if(!g||!unfinished(g))throw new Error("找不到那一盤（可能已經下完、放棄，或被更新的備份擠掉了）");
    if(k0)stashSet(k0,null);else{B.splice(bi,1);ls.set("playBak",B)}
    if(unfinished(P)){const k=kindOf(P),o=stashGet(k);if(o&&o.id!==P.id)bakPut(o);stashSet(k,stashOut(P))}
    P={...g,result:null};delete P.at;P.hint=null;stateRebuild(P);savePlay();saveLog("back",P)}
  function playLog(){const L=ls.get("saveLog",[]),A=Array.isArray(L)?L.filter(y=>y&&typeof y==="object"):[],raw=lsRaw(),h=headOf(raw);let cur=h?h.id:null;if(!h&&raw)try{cur=JSON.parse(raw).id}catch(e){}
    const have=new Set([...Object.values(stashAll()).map(g=>g.id),...(ls.get("playBak",[])||[]).filter(unfinished).map(g=>g.id)]);
    return{log:A,cur,can:[...new Set(A.filter(x=>x.ev==="swap"&&x.id&&x.id!==cur&&have.has(x.id)).map(x=>x.id))]}}
  /* 畫面那邊的事件（選角保留進度 keep、放棄這盤 drop）也記進同一份紀錄；G 沒給就記桌上那盤 */
  window.XQ_saveLog=(ev,G)=>{if(ev!=="keep"&&ev!=="drop")return;let g=G&&G.id?G:P;if(!g)try{g=JSON.parse(lsRaw())}catch(e){g=null}saveLog(ev,pOk(g)&&(ev==="drop"||unfinished(g))?g:null)};
  /* ---------- 多分頁（11/11 AI 模擬玩家第二輪問題 1）----------
     桌上那盤 P 每個分頁各在記憶體裡留一份，原本只在第一次用到時讀 xq_play；兩個分頁同時開著時，各自 savePlay 都整盤寫回去，後寫的贏：
     另一邊剛下的步、剛開的新局、剛收進 play2 的那盤會被舊的蓋掉（電腦那一方兩邊都會算，連沒在看的分頁也會落子寫回）。
     改成：別的分頁改了 xq_play（瀏覽器的 storage 事件只送給「其他」分頁），這邊就丟掉記憶體裡那份，下一次 API 用到時 ensureP 重讀最新的；
     正在算的電腦著法回來時 P 已經換掉，playEngine 本來就會丟掉。對局 id 變了（另一個分頁開了別盤）再發 xq-play-other，畫面提示「另一個分頁也開著」。
     play2、戰績、積分本來每次都重讀 localStorage，不受影響 */
  /* 評比循環第 2 輪：was 改用 PID（這個分頁最後知道的那盤；P 已經被丟掉也記得），換盤時從 e.oldValue（被換掉前的最後一版）留備份（沒下完、也不在收納格才留）、記一筆「被另一個分頁換盤」；被清掉（讀檔、開新旅程）只記不備份 */
  function playSync(e){if(!e||(e.key!=="xq_play"&&e.key!==null))return;if(e.storageArea&&typeof localStorage!=="undefined"&&e.storageArea!==localStorage)return;
    let id=null,v=null;try{v=e.newValue==null?null:JSON.parse(e.newValue);id=v&&v.id||null}catch(x){}const was=(P&&P.id)||PID;P=null;
    if(was&&id!==was){let o=null;try{o=e.oldValue==null?null:JSON.parse(e.oldValue)}catch(x){}const og=pOk(o)&&o.id===was?o:{id:was,moves:[]};
      if(id){if(unfinished(og)&&!stashHas(was))bakPut(og);saveLog("swap",og,{to:String(id).slice(0,40),tk:kindOf(v)})}else saveLog("gone",og);PID=id;
      try{window.dispatchEvent(new CustomEvent("xq-play-other",{detail:{id,was}}))}catch(x){}}}
  try{addEventListener("storage",playSync)}catch(e){}
  /* ---------- 多分頁：以上 ---------- */
  // pre：錯棋重練，先擺上舊對局到錯棋之前的著法（moves），info 記上次走了什麼
  // arena：公園朝代擂台（意見回饋 255）＝這盤是挑戰哪個朝代的擂主；贏了蓋那個朝代的章
  /* 意見回饋 308：挑戰電腦和朝代擂台各留一盤——開另一種棋時，下到一半的這盤先收到 play2，之後可以換回來接著下 */
  /* 意見回饋 327：石桌往事（雲河棋路、驛站、公園）的棋也自己留一盤，跟挑戰電腦、朝代擂台互不干擾——三種各留一盤 */
  /* 意見回饋 338：錯棋重練（和小帥的中殘局練習）也是自己的一盤，開它不會動到挑戰電腦那盤 */
  const kindOf=G=>G&&G.practice?"practice":G&&G.journey?"journey":G&&G.arena?"arena":"cpu",unfinished=G=>!!(G&&!G.result&&G.moves&&G.moves.length);
  // 積分挑戰下到一半就丟掉（開同一種的新局）：算輸，不然輸棋前開新局就能躲掉扣分
  /* 評比第 6 輪 F4（棋規閉環）：中途離開算輸也要跟 playEnd 同一關——只有千秋休閒規則的 ranked 才動積分；存檔被手改成原型棋規的晉級賽，結束不計分、中途離開也不扣分 */
  function forfeit(G){if(!G||!G.ranked||G.result||G.moves.length<2)return;const rc=C.ruleConfigOf(G);if(!(C.ruleRated(rc)&&rc.mode==="ranked"))return;const keep=P;P=G;
    P.result={w:opp(P.human),why:"中途離開，算輸"};cpuRateApply("l");pushGame("play",{id:P.id,date:P.id.slice(0,10),level:0,ranked:true,rk:P.rk,human:P.human,result:P.result,...assist(P),moves:saveMoves(P.moves)});P=keep}
  const stashOut=G=>({id:G.id,rc:G.rc||null,human:G.human,level:G.level,rlv:G.rlv==null?null:G.rlv,ranked:!!G.ranked,reward:!!G.reward,arena:G.arena||null,journey:G.journey||null,rk:G.rk,result:null,practice:G.practice||null,...assist(G),...keepStart(G),moves:saveMoves(G.moves)});
  // play2：收起來的棋，每一種一盤 {cpu,arena,journey}（舊版只存一盤，讀的時候換成新格式）
  function stashAll(){let s=ls.get("play2",null);if(s&&s.moves)s={[kindOf(s)]:s};const o={};
    for(const k of["cpu","arena","journey","practice"]){const g=s&&s[k];if(g&&g.moves&&g.moves.length&&!g.result)o[k]=g}return o}
  const stashGet=k=>stashAll()[k]||null,stashSet=(k,g)=>{const o=stashAll();if(g)o[k]=g;else delete o[k];ls.set("play2",Object.keys(o).length?o:null)};
  const jid=x=>typeof x==="string"&&x?x.slice(0,40):null;
  /* 意見回饋 413：對局頁打開時說「我要哪一種」——挑戰電腦 cpu、朝代擂台 arena、石桌往事 journey（雲河棋路、驛站、園子、守關共用）、練習 practice 各一盤。
     桌上就是那一種：不動（下完的也不動，畫面自己決定）。不是：下到一半的先收進 play2 自己那格，再拿出那一種收著的；都沒有才開新的（石桌往事要給 journey 才開，練習不開——不開就連收都不收，不會多出一份重複的）。
     收起來以後先把 P 清掉再開新局，playNew 最後的 forfeit(P) 才不會把剛收起來的積分局算成中途離開 */
  function playOpen(b){ensureP();const k=["arena","journey","practice"].includes(b.kind)?b.kind:"cpu";
    const s=stashGet(k),era=typeof b.arena==="string"&&/^[a-z]{2,8}$/.test(b.arena)?b.arena:null,lv=d=>lvAdj(b,(b.lx!=null||+b.level)?lvIn(b):lvOld(d));
    /* 意見回饋 428：擂台接回沒下完的那盤時，強度換成現在的規則（例如石桌棋仙固定第 7 級），不沿用開局當時存的等級 */
    const relv=g=>{if(k==="arena"&&g&&b.level&&!g.result&&g.level!==lv(3)){g.level=lv(3);return true}return false};
    if(kindOf(P)===k){if(relv(P)){stateRebuild(P);savePlay()}return}
    if(!s&&(k==="practice"||(k==="journey"&&!jid(b.journey))))return;
    if(unfinished(P)){stashSet(kindOf(P),stashOut(P));saveLog("stash",P)}
    if(s){stashSet(k,null);P=s;P.hint=null;relv(P);stateRebuild(P);savePlay();return}
    P=null;
    if(k==="arena")playNew("r",lv(3),false,null,false,era||"classic",true);
    else if(k==="journey")playNew("r",lv(1),false,null,false,era,true,jid(b.journey));
    else{playNew(b.human==="b"?"b":"r",lv(3),!!b.ranked,null,false,null,true);zgSet(b)}}
  /* 石桌往事的特製關卡（levels.json 的 play 步驟）：從指定局面開始、讓子（拿掉幾顆）、關掉長將判負。棋盤 90 格要合法、兩邊都有將帥才接受 */
  function lvStart(lv){if(!lv||typeof lv!=="object")return null;let b;try{b=parseFen(typeof lv.fen==="string"&&lv.fen?lv.fen:START)}catch(e){return null}
    if(!Array.isArray(b)||b.length!==90)return null;for(const q of Array.isArray(lv.remove)?lv.remove.slice(0,16):[]){const i=parseSq(String(q));if(Number.isInteger(i)&&i>=0&&i<90&&b[i]&&!/[kK]/.test(b[i]))b[i]=null}
    if(!b.includes("k")||!b.includes("K"))return null;return{start:fen(b,"r").split(" ")[0],startTurn:lv.turn==="b"?"b":"r",noPerp:!!lv.noPerpetual,mirror:Array.isArray(lv.mirror)?lv.mirror.filter(u=>/^[a-i][0-9][a-i][0-9]$/.test(String(u))).slice(0,4):null}}   /* mirror：幻譜星門「第十四顆」——電腦先照玩家自己最常贏的開局走前幾步（styleMove） */
  function playNew(human,level,ranked,pre,reward,arena,noStash,journey,lv){
    const plain=!ranked&&!pre&&!reward,nk=pre?"practice":plain&&journey?"journey":plain&&arena?"arena":"cpu";
    if(!noStash&&P){
      if(unfinished(P)&&kindOf(P)!==nk){const o=stashGet(kindOf(P));if(o)forfeit(o);stashSet(kindOf(P),stashOut(P));saveLog("stash",P);P=null}   // 換另一種：這盤收起來
      const s=stashGet(nk);if(s){forfeit(s);stashSet(nk,null)}}                                                                           // 收著的同一種被新局取代
    // 積分挑戰下到一半就開新局：算輸
    forfeit(P);
    const pm=pre&&Array.isArray(pre.moves)?pre.moves.filter(m=>Number.isInteger(m.f)&&Number.isInteger(m.t)).slice(0,300):[];
    P={id:gameId(),human,level:ranked?0:level,ranked:!!ranked,rk:ranked?heldIdx(cpuRate()):null,moves:pm,result:null,hint:null,practice:pre?{...(pre.info||{}),base:pm.length}:null,reward:!ranked&&!pre&&!!reward,arena:!ranked&&!pre&&!reward&&arena||null,journey:nk==="journey"?journey:null};   /* 數學修正 11/11：對手照顯示的段位（遲滯後） */
    {const L=nk==="journey"?lvStart(lv):null;if(L){P.start=L.start;P.startTurn=L.startTurn;if(L.noPerp)P.noPerp=true;if(L.mirror&&L.mirror.length)P.mirror=L.mirror}}
    P.rc=C.ruleConfig(nk==="cpu"&&!ranked&&!reward?rulePref():C.RULESET_DEFAULT,ranked?"ranked":pre?"puzzle":"casual");   /* 晉級賽一律千秋休閒規則（積分只認這一套） */
    stateRebuild(P);if(P.practice&&P.turn!==human)throw new Error("這步不是你走的");savePlay()}
  function playApply(f,t){stateApply(P,f,t);P.hint=null;let r=judgeState(P);if(r&&P.noPerp&&/長將|長捉|長打/.test(r.why))r=null;if(r)playEnd(r.w,r.why);savePlay();setTimeout(analyzePlay,0);
    try{window.dispatchEvent(new Event("xq-play"))}catch(e){}}   // 通知畫面馬上更新，不用等下一次輪詢
  function playEnd(w,why){P.result={w,why,...(P.repetition&&!P.repetition.pending?{adjudication:P.repetition}:{})};const res=!w?"d":w===P.human?"w":"l";
    if(P.practice){savePlay();return}   // 錯棋重練：不算戰績、不存進對局紀錄
    if(P.ranked&&C.ruleRated(P.rc)&&P.rc.mode==="ranked"){if(P.moves.length>=2)cpuRateApply(res)}   /* 原型棋規、或棋規設定不是 ranked 的不計分 */   // 雙方都還沒走就結束不計分
    if(P.arena&&!P.journey&&res==="w"&&P.moves.length>=2){const S=ls.get("arenaStamps",{}),first=!S[P.arena];if(first)S[P.arena]={at:new Date().toISOString(),lv:P.level,n:P.moves.length};ls.set("arenaStamps",S);
      P.stamp={era:P.arena,first,total:Object.keys(S).length}}
    else if(kindOf(P)==="cpu"&&!/-b$/.test(String(P.id))){const rec=ls.get("record",{}),L=rec[P.level]||(rec[P.level]={w:0,l:0,d:0});L[res]++;ls.set("record",rec)}
    /* 意見回饋 594：石桌往事從中局開始的關也存（記起始局面），我的成長才算得到故事裡下的棋 */
    pushGame("play",{id:P.id,rc:P.rc||null,date:P.id.slice(0,10),level:P.level,ranked:!!P.ranked,reward:!!P.reward,rk:P.rk,human:P.human,result:P.result,...(P.start?{start:P.start,startTurn:P.startTurn||"r"}:{}),...(P.journey?{journey:P.journey}:{}),...(zgOn(P)?{opp:"zhanggui"}:{}),...assist(P),moves:saveMoves(P.moves)});savePlay()}
  async function analyzePlay(){if(paBusy||!P)return;paBusy=true;const S=P;try{await analyzeList(S,()=>{if(P===S)savePlay()},()=>P!==S||(!P.result&&P.turn!==P.human))}finally{paBusy=false}   /* 多分頁：另一個分頁改了桌上那盤（playSync 把 P 換掉）就停下、不把舊的那份寫回去 */
    /* ChatGPT 評審 11/11（未評完的狀態）：下完的那盤，背景評好的補進存檔（gamePatch）；還有缺 PV 沒評到的，5 秒後再評，同一盤最多再試 3 次 */
    if(S&&S.result&&!S.practice&&S.id){gamePatch("play",S.id,movesG(S.moves));if(S===P&&S.moves.some(m=>!m.q)&&(paRetry[S.id]=(paRetry[S.id]||0)+1)<=3)setTimeout(analyzePlay,5000)}}
  const paRetry={};
  const ucis=()=>P.moves.map(m=>iccs(m.f,m.t));
  /* 意見回饋 363：秘境棋友的開局喜好是真的——跟他下時，這盤有 90% 機率照他愛下的開局走前一兩步（紅方、黑方各一套），之後才交給 Pikafish */
  const STYLE={
    liuji:{r:[["h2e2","b2e2"]],b:[["h7e7","b7e7"]]},                               // 劉伯溫：中炮（後手就還中炮）
    zhangsanfeng:{r:[["b0c2","h0g2"],["h0g2","b0c2"]],b:[["b9c7","h9g7"],["h9g7","b9c7"]]},   // 張三丰：屏風馬（起馬局）
    shinaian:{r:[["c3c4","g3g4"]],b:[["g6g5","c6c5"]]},                           // 施耐庵：仙人指路（進七兵／卒）
    shenwansan:{r:[["g0e2","c0e2"]],b:[["c9e7","g9e7"]]},                         // 沈萬三：飛相局
    changyuchun:{r:[["h2e2"],["h0g2"]],b:[["h7e7"],["h9g7"]]},                     // 常遇春：順炮直衝
    wangmian:{r:[["h2d2","b2f2"]],b:[["b7f7","h7d7"]]}};                          // 王冕：過宮炮
  function styleMove(){if(P.mirror&&P.journey&&!P.practice){const u=P.mirror[Math.floor(P.moves.length/2)];if(!u)return null;const f=parseSq(u.slice(0,2)),t=parseSq(u.slice(2,4));return legal(P.board,P.turn).some(([a,b])=>a===f&&b===t)?[f,t]:null}   /* 幻譜星門「第十四顆」：鏡像的自己 */
    if(!P.journey||!String(P.journey).startsWith("inn:")||P.practice)return null;const S=STYLE[String(P.journey).slice(4)];if(!S)return null;
    if(P.styleOn==null)P.styleOn=Math.random()<.9;if(!P.styleOn)return null;
    const list=(S[P.turn]||[])[Math.floor(P.moves.length/2)];if(!list)return null;const L=legal(P.board,P.turn);
    for(const u of list){const f=parseSq(u.slice(0,2)),t=parseSq(u.slice(2,4));if(L.some(([a,b])=>a===f&&b===t))return[f,t]}return null}
  /* STYLEPICK:BEGIN */
  /* 笑面掌櫃的棋風選步（開發者 11/11；說明 xiangqi-db/story/97_笑面掌櫃實作.md）。
     純函式：不碰 P、localStorage、畫面、引擎；只吃 XQCore（C）和傳進來的資料。xiangqi-db/tools/style_loop 的 Node 訓練循環會把 BEGIN～END 這一段原封不動抽出去共用，
     所以這一段裡不能用到 local.js 其他地方的變數。用法：const SP=STYLEPICK(XQCore)；SP.bookPick(book,board,side,rnd)；SP.pick(r,lv,board,side,rnd,params)。
     r＝XQEngine.search 的結果 {best,lines:[{mv,v,mate,pv}]}，v＝走棋那一方的厘兵（跟 core.js pickMove 同一個視角）；lv＝LEVELS／RLV 的一級 {depth|movetime,multipv,margin}。 */
  const STYLEPICK=function(C){
    const DEF={
      bookTemp:1,        /* 開局庫抽樣溫度：權重＝次數^(1/溫度)；1＝照次數比例，越大越平均，越小越只走最常見的 */
      bookMaxPly:20,     /* 前幾手（半回合）查開局庫 */
      mpvMin:3,          /* 掌櫃至少要引擎給 3 條候選（幻影棋客高等級只要 1 條） */
      gateMin:30,gateMax:60,gateK:0.5,   /* 候選門檻：跟「幻影棋客會走的那步」差 ≤ 門檻；門檻＝等級的 margin×0.5，夾在 30～60 厘兵；沒有 margin（全力級）＝30 */
      evenCp:150,        /* |評分| < 150＝均勢；≥ 150＝領先；≤ −150＝落後 */
      exLevel:20,        /* 均勢時兌子加分（厘兵） */
      exAhead:-15,       /* 領先時兌子扣分 */
      exBehind:0,        /* 落後時兌子不加不扣 */
      exTol:1,           /* 兌子＝兩邊子力差 ≤ 1 分（車換車、馬換炮都算），而且不是兵卒互換 */
      sac:-40,           /* 棄子扣分：照引擎主變走 6 手，子力淨少 ≥ sacMin 分 */
      sacMin:3,
      sacPly:6,
      checkRun:2,        /* 主變裡自己連續將軍 ≥ 2 次＝連將攻殺，不算棄子 */
      king:-8,           /* 沒被將軍就動帥（將）扣分 */
      cannon:3,          /* 走炮小加分 */
      dev:1,             /* 偏離「幻影棋客那步」每 1 厘兵扣 1 分（往上往下都扣，平均下來強度不變） */
      jitter:3,          /* 同分時的小亂數 */
      endMajors:4        /* 雙方車馬炮合計 ≤ 4＝殘局：不加棋風，照幻影棋客的選法 */
    };
    const UP=p=>p?p.toUpperCase():"",val=p=>p?(C.VAL[UP(p)]||0):0,red=p=>!!p&&p===UP(p);
    const mine=(p,s)=>!!p&&(s==="r")===red(p);
    function material(b,s){let m=0;for(const p of b)if(p&&UP(p)!=="K")m+=mine(p,s)?val(p):-val(p);return m}
    function majors(b){let n=0;for(const p of b)if(p&&"RNC".includes(UP(p)))n++;return n}
    const mvOf=u=>[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))];
    const mirSq=i=>Math.floor(i/9)*9+(8-i%9);
    const mirMv=u=>u.replace(/[a-i]/g,c=>String.fromCharCode(202-c.charCodeAt(0)));
    function mirBoard(b){const o=new Array(90);for(let i=0;i<90;i++)o[mirSq(i)]=b[i];return o}
    /* 開局庫：檔案格式 {maxPly,pos:{"<XQCore.fen(盤面,走方)>":"h2e2:422,g0e2:209,c3c4:240,…"}}（次數 1 省略「:1」）→ {maxPly,pos:{key:[[uci,n],…]}} */
    function bookParse(j){const pos={};for(const[k,s]of Object.entries((j&&j.pos)||{}))pos[k]=String(s).split(",").filter(Boolean).map(x=>{const[u,n]=x.split(":");return[u,Math.max(1,+n||1)]});
      return{maxPly:+(j&&j.maxPly)||DEF.bookMaxPly,pos}}
    /* 照次數加權抽一步（只抽合法的）；這個局面不在庫裡就查左右鏡像，抽到再鏡像回來；都沒有回 null */
    function bookPick(B,b,s,rnd,temp){if(!B||!B.pos)return null;const L=C.legal(b,s),ok=u=>{const[f,t]=mvOf(u);return L.some(([x,y])=>x===f&&y===t)};
      const T=temp||DEF.bookTemp,draw=ms=>{const c=ms.filter(([u])=>ok(u));if(!c.length)return null;const w=c.map(([,n])=>Math.pow(n,1/T)),tot=w.reduce((a,x)=>a+x,0);let y=(rnd||Math.random)()*tot;
        for(let i=0;i<c.length;i++){y-=w[i];if(y<0)return c[i][0]}return c[c.length-1][0]};
      const a=B.pos[C.fen(b,s)];if(a){const u=draw(a);if(u)return u}
      const m=B.pos[C.fen(mirBoard(b),s)];if(m){const u=draw(m.map(([u,n])=>[mirMv(u),n]));if(u)return u}
      return null}
    /* 一條候選的特徵：兌子、棄子（主變裡子力淨少，除非連將）、動帥、走炮 */
    function feats(b,s,line){const pv=(line.pv&&line.pv.length?line.pv:[line.mv]).filter(u=>typeof u==="string"&&u.length>=4),o=C.opp(s);
      const[f,t]=mvOf(pv[0]||line.mv),pc=b[f],cap=b[t],b1=C.make(b,f,t),F={exchange:false,sac:false,checkRun:0,king:false,cannon:UP(pc)==="C",capture:!!cap};
      F.king=UP(pc)==="K"&&!C.inCheck(b,s);
      if(cap&&val(cap)>=2&&Math.abs(val(cap)-val(pc))<=DEF.exTol&&C.legal(b1,o).some(([,y])=>y===t))F.exchange=true;
      else if(!cap&&pv.length>=3&&val(pc)>=2){const[f1,t1]=mvOf(pv[1]),[,t2]=mvOf(pv[2]),q=b1[f1];if(t1===t&&t2===t&&q&&Math.abs(val(q)-val(pc))<=DEF.exTol)F.exchange=true}
      let bb=b,run=0,best=0,n=Math.min(pv.length,DEF.sacPly);if(n%2)n--;
      for(let i=0;i<n;i++){const[x,y]=mvOf(pv[i]);if(!bb[x])break;bb=C.make(bb,x,y);if(i%2===0){if(C.inCheck(bb,o)){run++;best=Math.max(best,run)}else run=0}}
      F.checkRun=Math.max(best,C.inCheck(b1,o)?1:0);
      F.loss=n>=2?material(b,s)-material(bb,s):0;
      F.sac=F.loss>=DEF.sacMin&&!(line.mate!=null&&line.mate>0)&&F.checkRun<DEF.checkRun;
      return F}
    const stateOf=(v,p)=>v>=p.evenCp?"ahead":v<=-p.evenCp?"behind":"level";
    function bonus(F,st,p){let x=0;if(F.exchange)x+=st==="level"?p.exLevel:st==="ahead"?p.exAhead:p.exBehind;if(F.sac)x+=p.sac;if(F.king)x+=p.king;if(F.cannon)x+=p.cannon;return x}
    const gateOf=(lv,p)=>{p=p||DEF;const m=+(lv&&lv.margin)||0;return m?Math.max(p.gateMin,Math.min(p.gateMax,Math.round(m*p.gateK))):p.gateMin};
    const mpvOf=(lv,p)=>Math.max(+(lv&&lv.multipv)||1,(p||DEF).mpvMin);
    /* 選一步：先照幻影棋客的規則抽「基準步」ref（margin 內隨機；全力級＝最佳），殘局、有殺棋就直接用 ref；
       不然在「跟 ref 差 ≤ 門檻、也不比最佳差超過 max(margin,門檻)」的候選裡，算 棋風加分 − |跟 ref 的分差|×dev，最高的那步 */
    function pick(r,lv,b,s,rnd,params){const p={...DEF,...(params||{})},R=rnd||Math.random,lines=((r&&r.lines)||[]).filter(x=>x&&typeof x.mv==="string"&&x.mv.length>=4);
      if(lines.length<2)return{mv:(lines[0]&&lines[0].mv)||r.best,why:"single"};
      const top=lines[0].v,margin=+(lv&&lv.margin)||0,pool=lines.filter(x=>x.v>=top-margin),ref=pool[Math.floor(R()*pool.length)]||lines[0];
      if(majors(b)<=p.endMajors)return{mv:ref.mv,why:"endgame",ref:ref.mv};
      if(lines.some(x=>x.mate!=null))return{mv:ref.mv,why:"mate",ref:ref.mv};
      const G=gateOf(lv,p),st=stateOf(top,p),floor=top-Math.max(margin,G);
      let best=null;for(const x of lines){if(x.v<floor||Math.abs(x.v-ref.v)>G)continue;const F=feats(b,s,x),sc=bonus(F,st,p)-Math.abs(x.v-ref.v)*p.dev+(R()*2-1)*p.jitter+(x===ref?0.001:0);
        if(!best||sc>best.sc)best={x,F,sc}}
      if(!best)return{mv:ref.mv,why:"ref",ref:ref.mv};
      return{mv:best.x.mv,why:best.x===ref?"ref":"style",ref:ref.mv,state:st,gate:G,feats:best.F,score:best.sc}}
    return{DEF,bookParse,bookPick,feats,bonus,stateOf,gateOf,mpvOf,pick,material,majors,mirBoard,mirMv}};
  /* STYLEPICK:END */
  const SP=STYLEPICK(C);
  /* 笑面掌櫃（opp:"zhanggui"）：只在練功房、快速對局、盲棋（kind cpu、不是晉級賽）；舊存檔沒有 opp＝幻影棋客。開局庫第一次輪到掌櫃走時才下載（data/xyc/xyc_book.json，約 130 KB），下載不到就直接叫引擎 */
  const zgOn=G=>!!(G&&G.opp==="zhanggui"&&!G.ranked&&!G.practice&&!G.journey&&!G.arena&&!G.reward);
  let zgBookP=null;
  /* /play/new、/play/open 帶 opp:"zhanggui"：剛開的這盤是一般挑戰電腦（練功房、快速對局、盲棋）才記上；晉級賽、練習、石桌往事、擂台一律幻影棋客。記上以後先在背景下載開局庫 */
  function zgSet(b){if(!P||!b||b.opp!=="zhanggui"||P.result||kindOf(P)!=="cpu"||P.ranked||P.practice||P.reward)return;P.opp="zhanggui";savePlay();zgBookLoad()}
  const zgBookLoad=()=>zgBookP||(zgBookP=fetch(BASE+"data/xyc/xyc_book.json").then(r=>{if(!r.ok)throw new Error("開局庫 "+r.status);return r.json()}).then(j=>SP.bookParse(j)).catch(()=>{zgBookP=null;return null}));
  const CPU_MIN_MS=1000;
  async function playEngine(){
    if(!P||P.result||P.turn===P.human||playBusy)return;
    {const sm=styleMove();if(sm){playBusy=true;setTimeout(()=>{try{if(P&&!P.result&&P.turn!==P.human)playApply(sm[0],sm[1])}finally{playBusy=false;setTimeout(playEngine,0)}},700);return}}
    playBusy=true;const id=P.id,n=P.moves.length,lv=P.ranked?RLV[P.rk]||RLV[0]:P.rlv!=null?RLV[P.rlv]||RLV[0]:LEVELS[P.level-1]||LEVELS[2];   /* 意見回饋 548：驛站旅人用段位強度 rlv 浮動 */
    const t0=Date.now();   /* 11/10 開發者「我剛走完一步，電腦就馬上落子」：低等級用淺層深度幾毫秒就算完，至少等 1～1.5 秒再落子，讓玩家看清自己那一步 */
    const zg=zgOn(P);   /* 笑面掌櫃：前 20 手先查開局庫（照次數加權抽，不叫引擎）；出庫後引擎多給幾條候選，STYLEPICK 照棋風挑 */
    try{if(zg&&!P.start&&n<SP.DEF.bookMaxPly){const B=await zgBookLoad(),u=B&&n<B.maxPly?SP.bookPick(B,P.board,P.turn,Math.random):null;
        if(u){const w=CPU_MIN_MS+Math.random()*500-(Date.now()-t0);if(w>0)await new Promise(z=>setTimeout(z,w));
          if(!P||P.id!==id||P.moves.length!==n||P.result)return;
          const f=parseSq(u.slice(0,2)),t=parseSq(u.slice(2,4));if(legal(P.board,P.turn).some(([a,b])=>a===f&&b===t)){playApply(f,t);playMsg="";engFail=0;return}}}
      const hp=!zg&&HP.on(lv);   /* 低段（新手～業1）擬人選步：見上面 HUMANPICK */
      const r=await XQEngine.search({moves:ucis()},lv.movetime?{movetime:lv.movetime}:{depth:lv.depth},zg?SP.mpvOf(lv):hp?HP.mpvOf(lv):lv.multipv||1);
      {const w=CPU_MIN_MS+Math.random()*500-(Date.now()-t0);if(w>0)await new Promise(z=>setTimeout(z,w))}
      if(!P||P.id!==id||P.moves.length!==n||P.result)return;
      const mv=zg?SP.pick(r,lv,P.board,P.turn,Math.random).mv:hp?HP.pick(r,lv,P.board,P.turn,Math.random).mv:pickMove(r,lv),f=parseSq(mv.slice(0,2)),t=parseSq(mv.slice(2,4));
      if(!legal(P.board,P.turn).some(([a,b])=>a===f&&b===t))throw new Error("引擎給出不合法著法 "+mv);
      playApply(f,t);playMsg="";engFail=0}
    /* 開發者 11/11（離線盤查）：引擎載不到（沒網路、手機裡還沒有引擎檔、還沒進多執行緒模式）原本立刻重試、無限循環——
       改成：沒網路又沒有引擎＝說清楚、等網路回來（online）再自動接著下；其他失敗＝隔 3、6、12…秒（最多 60 秒）再試 */
    catch(e){engFail++;const off=typeof navigator!=="undefined"&&navigator.onLine===false,noEng=typeof XQEngine!=="undefined"&&!XQEngine.ready;
      playMsg=off&&noEng?"⚠ 沒有網路，電腦棋手還沒下載到這支手機。連上網路會自動接著下，也可以先去同桌對弈。":"⚠ "+e.message+(engFail>1?"（稍後自動再試）":"");
      if(off&&noEng&&!engWait){engWait=true;addEventListener("online",()=>{engWait=false;engFail=0;setTimeout(playEngine,800)},{once:true})}}
    finally{playBusy=false;if(!engFail)setTimeout(playEngine,0);else if(!engWait)setTimeout(playEngine,Math.min(60000,1500*2**Math.min(engFail,6)))}}
  function playState(){ensureP();
    const CR=cpuRate(),ci=heldIdx(CR),nx=RANKS[ci+1];
    const SA=stashAll(),others=Object.values(SA).filter(g=>kindOf(g)!==kindOf(P)).map(g=>({kind:kindOf(g),opp:zgOn(g)?"zhanggui":null,arena:g.arena||null,journey:g.journey||null,ranked:!!g.ranked,reward:!!g.reward,level:g.level,n:g.moves.length,human:g.human}));
    return{rules:C.REP_RULES,rc:P.rc||null,repetition:P.repetition||null,kind:kindOf(P),opp:zgOn(P)?"zhanggui":null,others,other:others[0]||null,journey:P.journey||null,noPerp:!!P.noPerp,start:P.start||null,startTurn:P.startTurn||"r",id:P.id,blind:/-b$/.test(String(P.id)),board:P.board,turn:P.turn,human:P.human,level:P.level,ranked:!!P.ranked,reward:!!P.reward,arena:P.arena||null,stamp:P.stamp||null,prize:P.prize||null,rkName:P.ranked?RANKS[P.rk][0]:null,rate:P.rate||null,
      cpuRate:{pts:CR.pts,rank:RANKS[ci][0],w:CR.w,l:CR.l,d:CR.d,next:nx?nx[0]:null,toNext:nx?nx[1]-CR.pts:0,lo:RANKS[ci][1],hi:nx?nx[1]:null,hist:CR.hist},
      levels:LEVELS.map(l=>({n:l.n,name:l.name,desc:l.desc})),record:ls.get("record",{}),
      moves:P.moves.map(moveOut),result:P.result,practice:P.practice||null,thinking:playBusy&&P.turn!==P.human,msg:playMsg,eval:lastEv(P.moves),hint:P.hint,hintN:P.hintN||0,undoN:P.undoN||0,   /* 開發者 11/11 選 v3 規劃書 B03：這盤用過幾次提示、悔棋，給畫面標示用 */
      legal:!P.result&&P.turn===P.human?legal(P.board,P.turn):[],check:!P.result&&inCheck(P.board,P.turn)?kingSq(P.board,P.turn):-1,engine:true}}
  /* 評比循環第 3 輪（兩分頁同一瞬間寫入）：會改盤面的動作（PLAY_MUT）用 Web Locks 排隊，同一時間只有一個分頁在改；鎖裡面 ensureP 先重讀最新版，再照版本檢查決定接受或提示「已切換到最新」。不支援 Web Locks 的瀏覽器照舊只靠版本號 */
  function playPost(p,b){try{if(PLAY_MUT.has(p)&&typeof navigator!=="undefined"&&navigator.locks&&navigator.locks.request)return navigator.locks.request("xq-play-write",()=>playPostIn(p,b))}catch(e){}return playPostIn(p,b)}
  async function playPostIn(p,b){if(ensureP()&&PLAY_MUT.has(p)){saveLog("clash",P);try{window.dispatchEvent(new CustomEvent("xq-play-newer",{detail:{id:P.id}}))}catch(e){}return playState()}   /* 評比循環第 2 輪：畫面上那盤已經被另一個分頁下過＝這一下不算，改看最新的 */
    if(p==="/play/new"){playNew(b.human==="b"?"b":"r",lvAdj(b,lvIn(b)),!b.pre&&!!b.ranked,b.pre||null,false,typeof b.arena==="string"&&/^[a-z]{2,8}$/.test(b.arena)?b.arena:null,false,jid(b.journey),b.lv);
      /* 開發者 11/11：茶肆盲棋（練功房的級數、看不到棋子）。對局編號結尾加 -b 當記號（存檔、收起來、換盤都帶著）：不記練功房戰績、不算我的棋力（04-stats skillRows） */
      if(b.blind&&P&&!P.ranked&&kindOf(P)==="cpu"&&!/-b$/.test(P.id)){P.id+="-b";savePlay()}if(P&&!P.ranked&&b.rlv!=null&&Number.isInteger(+b.rlv)){P.rlv=Math.max(0,Math.min(RLV.length-1,+b.rlv+dxOf(b)));savePlay()}zgSet(b);playMsg="";setTimeout(playEngine,0)}
    else if(p==="/play/bonus"){   /* 意見回饋 313：石桌往事「回到當年」答對轉折加段位積分；每個轉折只能領一次 */
      const key=String(b.key||"").slice(0,80),pts=Math.max(1,Math.min(20,Math.round(+b.pts)||0)),K=ls.get("bonusKeys",{});
      if(!key)throw new Error("缺少題目代號");const R=cpuRate();
      if(K[key])return{already:true,pts:R.pts,rank:RANKS[heldIdx(R)][0]};
      const before=R.pts,rk0=heldIdx(R);R.pts+=pts;rankHold(R,before);R.hist.unshift({id:"bonus-"+key,res:"bonus",d:pts,pts:R.pts,rk:RANKS[R.rk][0],why:String(b.why||"").slice(0,40),at:Date.now()});R.hist=R.hist.slice(0,100);
      ls.set("cpuRate",R);K[key]=Date.now();ls.set("bonusKeys",K);return{ok:true,d:pts,pts:R.pts,rank:RANKS[R.rk][0],was:RANKS[rk0][0]}}
    else if(p==="/play/switch"||p==="/play/open"){playOpen(b);playMsg="";setTimeout(playEngine,0)}
    else if(p==="/play/restore"){playRestore(b.id);playMsg="";setTimeout(playEngine,0)}   /* 評比循環第 2 輪：保存紀錄的「↩ 回到那一盤」 */
    else if(p==="/play/move"){const f=+b.f,t=+b.t;if(P.result)throw new Error("這局已經結束");if(P.turn!==P.human)throw new Error("還沒輪到你");
      if(!legal(P.board,P.turn).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");playApply(f,t);setTimeout(playEngine,0)}
    else if(p==="/play/undo"){if(P.ranked)throw new Error("積分挑戰不能悔棋");/* 意見回饋 651：開發者 597 決定擂台也能用悔棋符，這裡原本還擋著（382 的舊規則），App 先扣了悔棋符、悔棋卻失敗——拿掉 *//* 意見回饋 380：電腦（擂主）還在想的時候也能悔棋——引擎算完會發現步數變了、自動丟掉那步 */
      const floor=P.practice?P.practice.base:0;if(P.moves.length<=floor)throw new Error(P.practice?"已經回到練習的起點":"你還沒走棋，不用悔棋");if(!P.moves.slice(floor).some(m=>m.by===P.human))throw new Error("你還沒走棋，不用悔棋");
      while(P.moves.length>floor){const m=P.moves.pop();if(m.by===P.human)break}P.undoN=(P.undoN||0)+1;P.result=null;P.hint=null;stateRebuild(P);savePlay();setTimeout(playEngine,0)}
    else if(p==="/play/hint"){throw new Error("挑戰電腦不提供提示，要靠自己");if(P.result||P.turn!==P.human)throw new Error("現在不能提示");
      const r=await XQEngine.search({moves:ucis()},{movetime:1500},1),f=parseSq(r.best.slice(0,2)),t=parseSq(r.best.slice(2,4));P.hint={f,t,cn:notate(P.board,f,t)};P.hintN=(P.hintN||0)+1;savePlay()}
    else if(p==="/play/hintmark"){if(!P.result){P.hintN=(P.hintN||0)+1;savePlay()}}   /* 意見回饋 415：雲河棋路的提示棋在畫面那邊算，這裡只記「這盤用過提示」 */
    else if(p==="/play/resign"){if(!P.result)playEnd(opp(P.human),"你認輸")}
    /* 開發者 11/11 選「人機遇待核給和局／悔棋」：裁判判循環「待核」時（亞洲棋例沒辦法自動判的循環），跟電腦下的人可以直接選和局，或退回自己上一步之前變著（不算悔棋次數） */
    else if(p==="/play/repdraw"){if(P.result||!(P.repetition&&P.repetition.pending))throw new Error("現在沒有待核的循環");playEnd(null,"循環待核，同意和局")}
    else if(p==="/play/repundo"){if(P.result||!(P.repetition&&P.repetition.pending))throw new Error("現在沒有待核的循環");const floor=P.practice?P.practice.base:0;if(!P.moves.slice(floor).some(m=>m.by===P.human))throw new Error("沒有可以退回的棋");
      while(P.moves.length>floor){const m=P.moves.pop();if(m.by===P.human)break}P.result=null;P.hint=null;stateRebuild(P);savePlay();setTimeout(playEngine,0)}
    return playState()}

  // ---------- 雙人對戰（同一支手機） ----------
  const TCS={"10+5":{min:10,inc:5},"20+10":{min:20,inc:10},"60+30":{min:60,inc:30}};
  let V=null,vaBusy=false;
  const nameOf=(s,d)=>String(s||"").replace(/[<>]/g,"").trim().slice(0,20)||d;
  /* ChatGPT 數值盤查 11/11 P1 棋鐘（同機限時局）：
     ① 落子、悔棋、提和、認輸前，先用「同一個事件時間戳」now 裁決逾時（pvpFlag）：剩餘 ≤ 0 ms＝已經落旗、直接判負，這步不算、也拿不到加秒；剩 +1 ms 才算及時。
        以前只靠每 250 ms 的 pvpClock 檢查、落子入口又先加秒，落旗後 250 ms 內（或瀏覽器在背景、計時器被暫停時）還能落子把時間加回來。
     ② 悔棋：每走一手先存雙方鐘的快照 cs（走方扣掉這手想的時間、還沒加秒；對方的鐘本來就沒在走），悔棋時恢復成那一手之前的快照，不保留那手拿到的加秒；
        走這手到按悔棋之間的時間不算任何一方的（兩邊回到那一手之前的樣子），鐘從按悔棋那一刻重新開始走。舊存檔沒有 cs 的那幾手照舊做法（只把對方用掉的時間扣掉）。
     ③ 起鐘規則照舊：第一手（紅方開局）不計時、不加秒，第一手走完才開始計時；存檔重新載入（App 重開）後鐘先停，續局的第一手同樣不扣時、不加秒，走完才繼續計時。 */
  const saveV=()=>ls.set("pvp",{id:V.id,rc:V.rc||null,red:V.red,black:V.black,tcKey:V.tcKey,tc:V.tc,clocks:V.clocks,cs:V.cs||[],result:V.result,moves:saveMoves(V.moves)});
  function ensureV(){if(V)return;const s=ls.get("pvp",null);if(s&&s.moves){V=s;V.tick=null;V.draw=null;stateRebuild(V)}else pvpNew({})}
  function pvpNew(o){const tc=TCS[o.tc]||null;V={id:gameId(),red:nameOf(o.red,"紅方"),black:nameOf(o.black,"黑方"),tcKey:tc?o.tc:"none",tc,
    clocks:tc?{r:tc.min*60000,b:tc.min*60000}:null,cs:[],tick:null,draw:null,moves:[],result:null,rc:C.ruleConfig(rulePref(),"casual")};stateRebuild(V);saveV()}
  const pvpLeft=(s,now)=>!V.clocks?null:V.clocks[s]-(V.tick!=null&&V.turn===s&&!V.result?(now==null?Date.now():now)-V.tick:0);
  function pvpFlag(now){if(!V||!V.tc||V.result||V.tick==null||pvpLeft(V.turn,now)>0)return false;const s=V.turn;V.clocks[s]=0;V.tick=null;pvpEnd(opp(s),PLAYER[s]+"超時判負");return true}
  function pvpClock(){pvpFlag(Date.now())}
  setInterval(pvpClock,250);
  function pvpEnd(w,why,now){if(V.tick!=null&&V.clocks)V.clocks[V.turn]=Math.max(0,pvpLeft(V.turn,now));V.result={w,why,...(V.repetition&&!V.repetition.pending?{adjudication:V.repetition}:{})};V.tick=null;V.draw=null;
    pushGame("pvp",{id:V.id,rc:V.rc||null,date:V.id.slice(0,10),red:V.red,black:V.black,tc:V.tcKey,result:V.result,moves:saveMoves(V.moves)});saveV()}
  async function analyzePvp(){if(vaBusy||!V)return;vaBusy=true;const S=V;try{await analyzeList(V,saveV)}finally{vaBusy=false}
    if(S&&S.result&&S.id)gamePatch("pvp",S.id,movesG(S.moves))}   /* ChatGPT 評審 11/11：下完後評好的補進存檔（見 gamePatch） */
  function pvpState(){ensureV();pvpClock();
    return{rules:C.REP_RULES,rc:V.rc||null,repetition:V.repetition||null,id:V.id,red:V.red,black:V.black,board:V.board,turn:V.turn,moves:V.moves.map(moveOut),result:V.result,draw:V.draw,tcKey:V.tcKey,
      clocks:V.clocks?{r:pvpLeft("r"),b:pvpLeft("b")}:null,running:V.tick!=null,legal:V.result?[]:legal(V.board,V.turn),
      check:!V.result&&inCheck(V.board,V.turn)?kingSq(V.board,V.turn):-1,eval:lastEv(V.moves),engine:true}}
  async function pvpPost(p,b){ensureV();const side=b.side==="b"?"b":"r",now=Date.now();
    if(p!=="/pvp/new"&&pvpFlag(now))return pvpState();   /* 數值盤查 11/11 P1 棋鐘：同一個 now 先裁決逾時，落旗了這個動作就不做（落子不算、悔棋不救、提和認輸也改不了結果） */
    if(p==="/pvp/new")pvpNew(b);
    else if(p==="/pvp/move"){const f=+b.f,t=+b.t;if(V.result)throw new Error("這局已經結束");if(!legal(V.board,V.turn).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");
      const snap=V.clocks?{r:pvpLeft("r",now),b:pvpLeft("b",now)}:null;if(!V.cs)V.cs=[];while(V.cs.length<V.moves.length)V.cs.push(null);   /* 雙鐘快照（走方已扣這手的時間、還沒加秒）；舊存檔缺的幾手補 null */
      if(V.tc&&V.tick!=null)V.clocks[V.turn]=snap[V.turn]+V.tc.inc*1000;
      stateApply(V,f,t);V.cs.push(snap);V.draw=null;V.tick=V.tc?now:null;const r=judgeState(V);if(r)pvpEnd(r.w,r.why,now);saveV();setTimeout(analyzePvp,0)}
    else if(p==="/pvp/undo"){if(V.result)throw new Error("這局已經結束，不能悔棋");if(V.moves.length){const snap=V.cs&&V.cs.length===V.moves.length?V.cs.pop():null;
      if(snap&&V.clocks)V.clocks={r:snap.r,b:snap.b};else if(V.tc&&V.tick!=null)V.clocks[V.turn]=pvpLeft(V.turn,now);   /* 有快照：兩個鐘回到那一手之前（不保留那手的加秒）；舊存檔沒快照：照舊 */
      V.moves.pop();stateRebuild(V);V.draw=null;V.tick=V.tc&&V.moves.length?now:null;saveV()}}
    else if(p==="/pvp/draw"){if(V.result)throw new Error("這局已經結束");if(V.draw&&V.draw!==side)pvpEnd(null,"雙方同意和棋",now);else V.draw=V.draw===side?null:side}
    else if(p==="/pvp/resign"){if(!V.result)pvpEnd(opp(side),PLAYER[side]+"認輸",now)}
    return pvpState()}

  // ---------- 線上大廳的網路對局：畫面跟雙人對戰一樣，狀態放在 XQNet（公開 MQTT 伺服器）上同步 ----------
  let NB=null;const netSaved=new Set(ls.get("netSaved",[]));
  function netBuild(){const g=XQNet.game();if(!g)return null;if(NB&&NB.key===g.gid+"|"+g.rev)return NB;
    const S={moves:g.moves.map(([f,t])=>({f,t})),rc:g.rc||null};stateRebuild(S);NB={key:g.gid+"|"+g.rev,S,g};   /* g.rc：邀請握手時定的棋規（net.js），沒有＝舊版對局，千秋休閒規則 */
    // 下完的網路對局存到「真人對局」，之後可以看賽後報告
    if(g.result&&!netSaved.has(g.id)&&XQNet.side()){netSaved.add(g.id);ls.set("netSaved",[...netSaved].slice(-200));
      pushGame("pvp",{id:g.id,rc:S.rc,date:g.id.slice(0,10),red:g.red.name,black:g.black.name,tc:"none",result:g.result,moves:saveMoves(S.moves),net:true,mine:XQNet.side()}).catch(()=>{netSaved.delete(g.id);ls.set("netSaved",[...netSaved].slice(-200))})}   /* 意見回饋 619：沒存成功就拿掉「已存」記號，下次再存 */   /* 意見回饋（開發者 11/6 分數審查）：多存 mine＝我是紅還是黑，戰績頁認自己用 */
    return NB}
  /* 補存：伺服器抓回來的已結束網路對局，還沒存過就存進「真人對局」 */
  window.XQ_saveNetGame=async g=>{if(!g||!g.result||!g.id||!Array.isArray(g.moves))return false;const list=(await idb.get("games:pvp"))||[];if(list.some(x=>x.id===g.id))return true;
    const S={moves:g.moves.map(([f,t])=>({f,t}))};stateRebuild(S);netSaved.add(g.id);ls.set("netSaved",[...netSaved].slice(-200));
    const mid=(()=>{try{return XQNet.me().id}catch(e){return null}})(),mine=mid&&g.red&&g.red.id===mid?"r":mid&&g.black&&g.black.id===mid?"b":null;   /* 意見回饋（開發者 11/6 分數審查）：補存的也記 mine（用代號比，戰績重建的沒有 id 就留空） */
    await pushGame("pvp",{id:g.id,date:g.id.slice(0,10),red:g.red.name,black:g.black.name,tc:"none",result:g.result,moves:saveMoves(S.moves),net:true,...(mine?{mine}:{})});return true};
  /* 棋友資料卡打開別人的線上對局：存到「棋友的對局」（最多 50 盤），不混進自己的真人對局 */
  window.XQ_savePeek=async g=>{if(!g||!g.id||!Array.isArray(g.moves))return false;let list=(await idb.get("games:peek"))||[];list=list.filter(x=>x.id!==g.id);
    const S={moves:g.moves.map(([f,t])=>({f,t}))};stateRebuild(S);list.push({id:g.id,date:g.id.slice(0,10),red:g.red.name,black:g.black.name,tc:"none",result:g.result,moves:saveMoves(S.moves),net:true});
    await idb.set("games:peek",list.slice(-50));return true};
  /* 線上對局前幾步的中文記譜（給戰績分析看開局用） */
  window.XQ_netMovesCn=(g,n)=>{try{const S={moves:g.moves.slice(0,n||6).map(([f,t])=>({f,t}))};stateRebuild(S);return S.moves.map(m=>m.cn)}catch(e){return[]}};
  /* QA P1-1：收到別人發的對局狀態時，從頭重走一遍檢查每步都合法，順便用規則判這盤是不是已經分出勝負（給 net.js 的 okNext 用） */
  window.XQ_netCheck=(mv,rc)=>{try{const S={moves:[],rc:rc||null};stateRebuild(S);for(const[f,t]of mv){if(!legal(S.board,S.turn).some(([x,y])=>x===f&&y===t))return{ok:false};stateApply(S,f,t)}return{ok:true,res:judgeState(S)}}catch(e){return{ok:false}}};
  /* 對局結束時就算不在對局畫面（切到別頁、對方認輸、離開）也要存棋譜（意見回饋 275） */
  setTimeout(function hookNet(){if(window.XQNet&&XQNet.on)XQNet.on("game",()=>{try{netBuild()}catch(e){}});else setTimeout(hookNet,500)},0);
  function netState(){const nb=netBuild(),sd=XQNet.side(),em=[];
    if(!nb)return{id:"wait",red:"等待中…",black:"等待中…",board:parseFen(START),turn:"r",moves:[],result:null,draw:null,tcKey:"none",clocks:null,running:false,legal:[],check:-1,eval:null,
      engine:true,online:{r:false,b:false},who:{r:"",b:""},emotes:[],net:true,mySide:sd||"w",watchers:XQNet.watchers(),waiting:true,link:XQNet.status()};
    const{S,g}=nb;
    return{rules:C.REP_RULES,rc:S.rc,repetition:g.rules===C.REP_RULES.id?(S.repetition||null):{pending:true,why:"這盤使用舊版棋規，保留棋譜供閱讀；請雙方更新後回大廳另開新局，不以新版改判舊局。"},id:g.id,red:g.red.name,black:g.black.name,board:S.board,turn:S.turn,moves:S.moves.map(moveOut),result:g.result,draw:g.draw,tcKey:g.tc?"net"+g.tc:"none",tc:g.tc||null,clocks:XQNet.clocks?XQNet.clocks():null,running:!!g.clk&&!g.result,
      legal:g.result||g.rules!==C.REP_RULES.id?[]:legal(S.board,S.turn),check:!g.result&&inCheck(S.board,S.turn)?kingSq(S.board,S.turn):-1,eval:null,engine:true,
      online:{r:XQNet.isOn(g.red.id),b:XQNet.isOn(g.black.id)},who:{r:g.red.name,b:g.black.name},emotes:XQNet.emotes(),net:true,mySide:sd||"w",watchers:XQNet.watchers(),link:XQNet.status(),unsent:XQNet.pendingSend()}}
  async function netPvp(p,b){if(p==="/pvp/state")return netState();
    const sd=XQNet.side();if(!sd)throw new Error("你在觀戰，不能下棋");
    if(p==="/pvp/emote"){XQNet.emote(sd,b.e);return netState()}
    if(p==="/pvp/chat"){XQNet.say(sd,b.text);return netState()}
    const nb=netBuild();if(!nb)throw new Error("還在等對局資料，稍等一下");const{S,g}=nb;
    if(g.rules!==C.REP_RULES.id)throw new Error("這盤棋規版本不同，請回大廳另開新局；原棋譜仍保留。 ");
    if(p==="/pvp/move"){const f=+b.f,t=+b.t;if(g.result)throw new Error("這局已經結束");if(S.turn!==sd)throw new Error("還沒輪到你");
      if(!legal(S.board,S.turn).some(([x,y])=>x===f&&y===t))throw new Error("這步不合法");
      const T={moves:g.moves.map(([a,z])=>({f:a,t:z})),rc:g.rc||null};stateRebuild(T);stateApply(T,f,t);const r=judgeState(T);
      XQNet.update(n=>{if(XQNet.tickMove&&XQNet.tickMove(n,sd)===false)return;n.moves.push([f,t]);n.draw=null;if(r)n.result=r})}   /* ChatGPT 數值盤查 11/11 P1 棋鐘：tickMove 用同一個時間戳先裁決逾時，回 false＝自己已經落旗（tickMove 已把結果寫成超時判負），這步不下、不加秒 */
    else if(p==="/pvp/undo"){if(g.result)throw new Error("這局已經結束，不能悔棋");if(g.cup)throw new Error("擂台比賽落子無悔，不能悔棋");const last=S.moves[S.moves.length-1];
      if(!last||last.by!==sd)throw new Error("對方已經走了，不能悔棋");XQNet.update(n=>{n.moves.pop();n.draw=null})}
    else if(p==="/pvp/draw"){if(g.result)throw new Error("這局已經結束");if(g.cup&&!(g.draw&&g.draw!==sd)&&g.moves.length<40)throw new Error("擂台比賽要下滿 20 回合才能提和");
      XQNet.update(n=>{if(n.draw&&n.draw!==sd){n.result={w:null,why:"雙方同意和棋"};n.draw=null}else n.draw=n.draw===sd?null:sd})}
    else if(p==="/pvp/resign"){if(!g.result)XQNet.update(n=>{n.result={w:opp(sd),why:PLAYER[sd]+"認輸"}})}
    else if(p==="/pvp/new"){if(!g.result)throw new Error("這局還沒下完");if(g.cup)throw new Error("擂台比賽的下一盤由裁判台安排，請回到千秋盃頁");   // 再來一局：交換紅黑
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
    return list.slice().reverse().map(g=>{if(Array.isArray(g.moves)&&g.moves.some(m=>m&&m.q&&qName(m.q)!==m.q))g={...g,moves:g.moves.map(m=>m&&m.q?{...m,q:qName(m.q)}:m)};if(kind==="play"){const lv=LEVELS[g.level-1]||{name:"?"},bot=g.ranked?"Pikafish 積分挑戰（"+(RANKS[g.rk]||["?"])[0]+"）":(g.journey?"石桌往事・":zgOn(g)?"笑面掌櫃・":"")+"Pikafish 第"+g.level+"級「"+lv.name+"」"+(g.reward?"・🚗獎勵":"");g={...g,red:g.human==="r"?"你":bot,black:g.human==="b"?"你":bot}}
      return{...gameItem(g,false),...assist(g),...(g.mine==="r"||g.mine==="b"?{mine:g.mine}:{})}})}   /* 意見回饋（開發者 11/6 分數審查）：線上對局帶出 mine */
  async function dbBooks(){const out=[];for(const b of await publicBooks())out.push({key:b.key,name:b.name,count:b.count});
    for(const b of await syncedBooks())if(out.some(x=>x.key===b.key))unsync(b.key);else out.push({key:b.key,name:b.name,count:b.count,synced:b.at});   // 以前從電腦同步過、現在已內建的，不要出現兩份
    if(remoteInfo())out.push({key:"ai",name:"AI 對局",count:0});
    out.push({key:"play",name:"人機對局",count:((await idb.get("games:play"))||[]).length},{key:"pvp",name:"真人對局",count:((await idb.get("games:pvp"))||[]).length},
      {key:"study",name:"我的研究",count:((await idb.get("games:study"))||[]).length});return out}
  async function dbItems(c){
    if(c==="study")return{name:"我的研究",note:"推演變化後按「💾 存成棋譜」存在這支手機裡的研究",items:((await idb.get("games:study"))||[]).slice().reverse().map(g=>summary(studyItem(g)))};
    if(c==="play"||c==="pvp")return{name:c==="play"?"人機對局":"真人對局",note:"這支手機上下完的對局",items:(await gameItems(c)).map(it=>({...summary(it),...(it.mine?{mine:it.mine}:{}),...pendOf(c,it)}))};   /* pend：我方還有幾步沒評（ChatGPT 評審 11/11） */   /* 意見回饋（開發者 11/6 分數審查）：清單也帶 mine，戰績頁認自己用 */
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
  /* ---------- 開發者 11/11 hspx「車輪戰」：一個人同時跟 3／5／10 位電腦棋客下（全部執紅先走），級數以中心級為準由弱到強排一圈（每桌差一級）。
     狀態存在 ls「simul」（每桌只存著法，載入時重建盤面）；電腦輪流替「輪到它」的桌子出棋（XQEngine.search 本身會排隊），高級數每步最多想 3 秒，不然十桌會等太久。
     每桌下完存進人機對局（一步都沒下的桌子不存；id＝開賽時間-s桌號；不算段位、不記各級戰績，也不算進「我的棋力」：04-stats skillRows 認 -s 結尾排除）；
     全部下完記各盤數的最佳紀錄 simulBest（得分最高，同分比中心級數）、累計戰績 simulRec。
     重開一場時，已經走過棋、還沒下完的桌子算輸（跟晉級賽中途離開一樣） ---------- */
  let SM=null,smBusy=false,smFail=0;
  const smLv=(n,lx)=>{const a=Math.max(1,Math.min(lx-Math.floor((n-1)/2),19-n));return Array.from({length:n},(_,i)=>a+i)};   /* 統計複查：靠近 1 或 18 級時整段往內移，每桌還是差一級 */
  function smLoad(){if(SM)return SM;const s=ls.get("simul",null);if(!s||!Array.isArray(s.tb))return null;
    const rc=C.ruleConfigOf({rc:s.rc});SM={...s,rc,tb:s.tb.map(t=>{const S={...t,rc,moves:(t.moves||[]).slice()};stateRebuild(S);return S})};return SM}
  function smSave(){if(SM)ls.set("simul",{id:SM.id,rc:SM.rc||null,n:SM.n,lx:SM.lx,at:SM.at,done:SM.done||null,tb:SM.tb.map(t=>({i:t.i,level:t.level,result:t.result||null,saved:!!t.saved,moves:t.moves.map(m=>({f:m.f,t:m.t,by:m.by}))}))});
    try{window.dispatchEvent(new Event("xq-simul"))}catch(e){}}
  function smEnd(t,w,why){t.result={w,why};
    if(!t.saved){t.saved=true;if(t.moves.some(m=>m.by==="r"))pushGame("play",{id:SM.id+"-s"+(t.i+1),rc:SM.rc||null,date:SM.id.slice(0,10),level:t.level,ranked:false,human:"r",result:t.result,simul:{n:SM.n,i:t.i+1},moves:saveMoves(t.moves)})}
    if(SM.tb.every(x=>x.result)&&!SM.done){const s={w:0,d:0,l:0};for(const x of SM.tb)s[!x.result.w?"d":x.result.w==="r"?"w":"l"]++;SM.done={...s,pts:s.w+s.d/2,at:Date.now()};
      const B=ls.get("simulBest",{}),k=String(SM.n),o=B[k];if(!o||SM.done.pts>o.pts||(SM.done.pts===o.pts&&SM.lx>o.lx))B[k]={pts:SM.done.pts,w:s.w,d:s.d,l:s.l,lx:SM.lx,at:SM.done.at};ls.set("simulBest",B);
      const C=ls.get("simulRec",{}),c=C[k]||(C[k]={plays:0,w:0,d:0,l:0,perfect:0});c.plays++;c.w+=s.w;c.d+=s.d;c.l+=s.l;if(s.w===SM.n)c.perfect++;ls.set("simulRec",C);
      /* 開發者 11/11 hspx 車輪戰成就（名稱與條件在 08s-simul.js SIM_ACH）：印的顏色看中心級數（青 1～6、朱 7～12、金 13～18 級），同一個成就可以往上升級；
         「初次繞場」「堅持到底」不分印。這一場新拿到或升級的記在 done.ach，總表顯示「新印」 */
      const n=SM.n,tier=SM.lx>=13?3:SM.lx>=7?2:1,top=SM.tb[SM.tb.length-1],quit=SM.tb.some(x=>/認輸|算輸/.test(x.result.why||"")),A=ls.get("simulAch",{}),got=[],
        give=(key,t)=>{const o=A[key];if(!o||t>o.tier){A[key]={tier:t,lx:SM.lx,n,at:Date.now()};got.push({k:key,tier:t,up:!!o})}};
      give("first",1);if(n===3&&s.w===3)give("w3",tier);if(n===5&&s.w===5)give("w5",tier);if(n===10&&s.w===10)give("w10",tier);
      if(n===5&&SM.done.pts>=4)give("p5",tier);if(n===10&&SM.done.pts>=8)give("p10",tier);if(n>=5&&s.l===0)give("nl",tier);
      if(n>=5&&top.result&&top.result.w==="r")give("king",tier);if(n>=5&&s.w===0&&!quit)give("grit",1);
      ls.set("simulAch",A);SM.done.ach=got}}
  function smApply(t,f,to){stateApply(t,f,to);const r=judgeState(t);if(r)smEnd(t,r.w,r.why);smSave()}
  /* 改善單 R08 車輪戰審查（11/11）：原本永遠挑桌號最小的那桌先想，10 桌時玩家繞回前面落子就插隊到最強的後幾桌前面；
     改成誰先落子先回誰（t.until 小的先）。想好了但緩衝時間還沒到的桌子標 t.pend，先放開引擎去想下一桌，時間到再落子 */
  async function smEngine(){if(smBusy||!smLoad())return;const ws=SM.tb.filter(x=>!x.result&&x.turn!=="r"&&!x.pend);if(!ws.length)return;const t=ws.reduce((a,b)=>(a.until||0)<=(b.until||0)?a:b);
    smBusy=true;const id=SM.id,n=t.moves.length,lv=LEVELS[t.level-1]||LEVELS[2];
    const hp=HP.on(lv);   /* 低段擬人選步（HUMANPICK），跟挑戰電腦同一套 */
    try{const r=await XQEngine.search({moves:t.moves.map(m=>iccs(m.f,m.t))},lv.movetime?{movetime:Math.min(lv.movetime,3000)}:{depth:lv.depth},hp?HP.mpvOf(lv):lv.multipv||1);
      if(!SM||SM.id!==id||t.moves.length!==n||t.result)return;
      /* 開發者 11/11「車輪戰對方要等我落子後緩衝時間後再下，不然像是在同步下」：玩家落子時記下 t.until（1.8～3.5 秒後），引擎照樣馬上開始想，但時間沒到不落子 */
      const mv=hp?HP.pick(r,lv,t.board,t.turn,Math.random).mv:pickMove(r,lv),f=parseSq(mv.slice(0,2)),to=parseSq(mv.slice(2,4));if(!legal(t.board,t.turn).some(([a,b])=>a===f&&b===to))throw new Error("引擎給出不合法著法 "+mv);
      const w=(t.until||0)-Date.now();
      if(w>0){t.pend=1;setTimeout(()=>{t.pend=0;if(!SM||SM.id!==id||t.moves.length!==n||t.result)return;smApply(t,f,to);setTimeout(smEngine,0)},w)}else smApply(t,f,to);smFail=0}
    catch(e){smFail++}
    finally{smBusy=false;setTimeout(smEngine,smFail?Math.min(30000,1500*2**Math.min(smFail,5)):0)}}
  function smState(){const best=ls.get("simulBest",{});if(!smLoad())return{none:true,best,rec:ls.get("simulRec",{}),ach:ls.get("simulAch",{})};
    return{id:SM.id,rc:SM.rc||null,n:SM.n,lx:SM.lx,done:SM.done||null,best,rec:ls.get("simulRec",{}),ach:ls.get("simulAch",{}),busy:smBusy,engFail:smFail,tb:SM.tb.map(t=>({i:t.i,level:t.level,name:(L=>L.movetime>3000?String(L.name||"").replace("・全力","")+"（每步 3 秒）":L.name||"")(LEVELS[t.level-1]||{}),board:t.board,turn:t.turn,result:t.result||null,
      moves:t.moves.map(m=>({f:m.f,t:m.t,by:m.by,cn:m.cn,ck:!!m.ck,cap:m.cap?1:0})),check:!t.result&&inCheck(t.board,t.turn)?kingSq(t.board,t.turn):-1,legal:t.result||t.turn!=="r"?[]:legal(t.board,"r")}))}}
  function simulApi(p,b){const T=i=>{if(!smLoad())throw new Error("還沒開始車輪戰");const t=SM.tb[+i];if(!t)throw new Error("沒有這一桌");return t};
    if(p==="/simul/new"){if(smLoad()&&!SM.done)for(const t of SM.tb)if(!t.result&&t.moves.some(m=>m.by==="r"))smEnd(t,"b","重開車輪戰，算輸");
      const n=[3,5,10].includes(+b.n)?+b.n:5,lx=Math.max(1,Math.min(18,Math.round(+b.lx||5)));
      const rc=C.ruleConfig(rulePref(),"casual");SM={id:gameId(),rc,n,lx,at:Date.now(),done:null,tb:smLv(n,lx).map((level,i)=>{const S={i,level,rc,moves:[],result:null};stateRebuild(S);return S})};smSave()}
    else if(p==="/simul/move"){const t=T(b.i),f=+b.f,to=+b.t;if(t.result)throw new Error("這桌已經下完");if(t.turn!=="r")throw new Error("還沒輪到你");
      if(!legal(t.board,"r").some(([x,y])=>x===f&&y===to))throw new Error("這步不合法");t.until=Date.now()+1800+Math.random()*1700;smApply(t,f,to)}
    else if(p==="/simul/resign"){const t=T(b.i);if(!t.result){smEnd(t,"b","你認輸");smSave()}}
    else if(p==="/simul/resignall"){if(smLoad()){for(const t of SM.tb)if(!t.result)smEnd(t,"b","你認輸");smSave()}}
    else if(p==="/simul/clear"){if(smLoad()&&!SM.done)throw new Error("車輪戰還沒下完");SM=null;ls.set("simul",null)}
    else if(p!=="/simul/state")throw new Error("找不到 "+p);
    setTimeout(smEngine,0);return smState()}
  async function api(u,b){
    const url=new URL(u,"http://x"),p=url.pathname,c=url.searchParams.get("c");
    if(REMOTE.has(p)||((p==="/db/items"||p==="/db/item")&&c==="ai"))return remote(u,b);
    if(p==="/db/books")return dbBooks();
    if(p==="/db/items")return dbItems(c);
    if(p==="/db/item")return dbItem(c,url.searchParams.get("id"));
    if(p==="/db/grades"){const B=b||{};if(B.c!=="play"&&B.c!=="pvp")throw new Error("這個資料夾不能補評等");return{n:await gamePatch(B.c,String(B.id||""),B.g)}}   /* ChatGPT 評審 11/11：檢討頁補評好的步寫回存檔（gamePatch） */
    if(p==="/quiz/data"||p==="/terms/data"){const r=await fetch("data/"+p.slice(1,-5)+".json");if(!r.ok)throw new Error("找不到題庫");const d=await r.json();
      /* 意見回饋 301：有校正檔就把每題校正過的鑑別度 a、難度 b 加上去 */
      if(p==="/quiz/data")try{const c=await (await fetch("data/quiz-calib.json")).json();for(const it of d.items){const k=c.items&&c.items[it.id];if(k){it.ca=k.a;it.cb=k.b}}}catch(e){}
      return d}
    if(p.startsWith("/simul/"))return simulApi(p,b||{});   /* 11/11 車輪戰 */
    if(p==="/play/state")return playState();
    if(p==="/play/log")return playLog();   /* 評比循環第 2 輪：🧾 對局保存紀錄 */
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
