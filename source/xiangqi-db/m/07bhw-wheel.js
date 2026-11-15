/* ---------- 黑洞車輪戰 wheel-v1（開發者 11/15；story/gemini_app/156_黑洞車輪戰_兩家回覆合併_1115.md「Claude 建議」第一批兩盤原型 → 同日改三盤版：三盤拿兩勝＋危險預警）----------
   11/15 已開給所有玩家（關卡卡片、主控台 whlOpen()）。前綴 WHL／whl（全域先 grep 過 m/ 與 src/ 沒撞名）。
   三盤版（story/黑洞車輪戰_三盤版實作紀錄_1115.md）：三盤同時下、輪流走，拿兩勝過關；不可能拿到兩勝（兩敗、一敗一和、兩和）就結束＝未過關；下完的盤跳過。
   危險預警 WHL.danger（危／將／侵／眼／門）：縮圖角標、「先救」鈕、自動跳盤先去有立即危險的盤。舊的兩盤存檔（進行中）照舊能下完（兩盤皆勝）。
   單盤規則＝星門圍城（07bhg-gatesiege.js 的 GSV，這支只加一層「兩盤一起」的規則）；不走 local.js 的對局（不開 journey、不給修為、不扣也不回定軌力）。
   開發者定案：
   - 各盤血量獨立；靈力全場共用一池（td.pool＝1：GSV 結算時不回我方靈力、不歸零收入上限，改成總輪回一次）。
   - 全場每個總輪最多一個主動招，只作用在目前這盤；冷卻、每局次數也是全場共用（同一位角色、同一組招）。
   - 每盤每個總輪走一個主要行動（走棋或部署）；所有還在下的盤都走過、星樞都回完＝總輪結束（回共用靈力、減冷卻）。入侵、波次照本盤回合；沒操作的盤不會自己走。
   - 陣眼子（本命子那一種，帥＝仕）被吃：只封該盤招式一輪，不動共用靈力。
   - 過關：拿下 need 盤（三盤版 need＝2＝三盤拿兩勝；舊的兩盤版 need＝2＝兩盤皆勝）；已經不可能拿到 need 盤就結束、未過關。
   - 單一引擎輪流算：佇列每盤最多一個工作；結果回來先核對（同一場、同一盤、同一手數、同一事件序號）不對就丟；逾時或出錯用 GSV.pick 的規則評估挑合法步，不會卡在思考中。
   - 整場結算一次（store whl.g 記過的場次不重領）；獎勵照星門圍城試玩：不給星塵、修為、定軌力。
   分兩塊：① WHL＝純規則（node 測試 xiangqi-lab/tools/test-wheel.js 用 vm 跟 GSV 一起載）；② 畫面（whl*）：全螢幕一層 #whlOv，上方三張 2D 縮圖（盤號、狀態、雙方血條、危險角標）、中間一個可以操作的平面棋盤、下方招式。
   存檔鍵 whl＝{mv:"wheel-v1",c:{w,l,best,best3},g:[結算過的場次],auto:走完自動跳盤,sk:{角色:[招]},cur:進行中那一場}（已加進 05b JOURNEY_KEYS）。 */
const WHL=(G=>{
  const MODE="wheel-v1",MV=1;
  /* 共用靈力（候選值，待實打）：開場 40、每總輪回 6、上限＝角色靈力容量（90～110）；每總輪正向收入上限照 GSV.INC_CAP（10，兩盤合計） */
  const SP0=40,RG=6;
  const TMO=5000,TMO0=15000,WAIT=700;   /* 引擎逾時：載好 5 秒、還沒載好 15 秒（第一次要下載）；星樞回應最少等 0.7 秒 */
  const REWARD={dust:0,xp:0,sta:0};   /* 照星門圍城試玩：不給星塵、修為、定軌力 */
  const EYE={R:"R",N:"N",C:"C",B:"B",A:"A",K:"A",P:"P"};   /* 陣眼子＝本命子那一種；帥不會被吃，沈方庭改用仕 */
  /* 三盤固定短中局（星門圍城規則、只有一波援軍、星樞 HP 較低）。座標 [子,路,線,標記] 照 GSV。登記在 GSV.LV 的 101～103（GSV.LVN 開機就算好了，不會出現在星門圍城選關） */
  const BD={
    101:{nm:"河口",th:"守住入侵",hp:70,atk:90,def:10,esp0:20,esk:[],depth:2,rs:8,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["r",9,10],["p",3,6,"inv"],["p",5,7]],
      waves:[{at:3,p:[["p",1,7,"inv"],["n",2,10]]}],say:"入侵卒在河岸",tip:"入侵卒過河，下一回合結束還在就扣你"},
    102:{nm:"陣門",th:"拆護陣",hp:80,atk:95,def:20,esp0:20,esk:[],depth:2,rs:8,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",8,10],["c",8,8],["p",3,7,"guard"],["p",7,7,"guard"],["p",5,7]],
      waves:[{at:3,p:[["p",9,7,"inv"],["r",1,10]]}],say:"兩顆護陣卒",tip:"護陣卒每顆讓星樞 DEF+20"},
    /* 第 3 盤（三盤版加的，擺法與數值我設計、待實打）：右翼入侵卒開場就在、援軍比另外兩盤早一回合（第 2 回合）從左門、右底線來，三盤的緊急時間錯開 */
    103:{nm:"援門",th:"搶在援軍前",hp:75,atk:90,def:10,esp0:20,esk:[],depth:2,rs:8,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",2,10],["c",8,8],["p",7,7,"inv"],["p",5,7]],
      waves:[{at:2,p:[["p",3,7,"inv"],["r",9,10]]}],say:"援軍來得早",tip:"第 2 回合結束援軍就到"}};
  const LVS=[101,102,103],NEED=2;   /* 三盤拿兩勝（開發者 11/15）。舊的兩盤存檔（bs 兩盤、need 2）照舊能下完 */
  if(G)for(const k in BD)G.LV[k]=Object.assign({n:+k},BD[k]);
  const clone=o=>JSON.parse(JSON.stringify(o));
  /* ===== 開一場 ===== */
  function eyeOf(td,pc){const want=EYE[pc]||"R";for(let q=0;q<90;q++){const id=td.ids[q];if(id&&id[0]==="r"&&td.meta[id]&&td.meta[id].p===want)return id}return null}
  /* o.pcs：測試用自訂盤面 [[子,路,線,標記]…]（數值、波次照 lv）；o.waves===false＝不要援軍 */
  function mkP(lv,id,cfg,C,o){o=o||{};let start;
    if(o.pcs){const b=new Array(90).fill(null);for(const[p,lu,xi]of o.pcs)b[G.LSQ(lu,xi)]=p;start=C.fen(b,"r").split(" ")[0]}else start=G.startFen(lv,C);
    const P={id,start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[],result:null};P.pos=[C.fen(P.board,"r")];
    P.td=G.boot({mode:G.MODE,lv,ch:cfg.ch,L:cfg.L,sk:cfg.sk},P,C);P.td.pool=1;
    if(o.pcs)for(const[p,lu,xi,tg]of o.pcs){const k=P.td.ids[G.LSQ(lu,xi)];if(k&&P.td.meta[k])P.td.meta[k].tag=tg||""}
    if(o.waves===false)P.td.waves=[];return P}
  function newMatch(cfg,C){cfg=cfg||{};const st=G.stats(cfg.ch,cfg.L),lvs=(cfg.lvs||LVS).slice(),n=lvs.length,sk=G.skPick(st.ck,st.L,cfg.sk);
    const id=cfg.id||("w"+Date.now().toString(36)),c2={ch:st.ck,L:st.L,sk};
    const M={mode:MODE,mv:MV,id,need:Math.max(1,Math.min(n,+cfg.need||(n>=3?NEED:n))),ch:st.ck,cn:st.n,pc:st.pc,L:st.L,sk,R:0,sp:{v:SP0,max:st.sp,inc:0},cd:{},cdAt:{},used:{},sk1:-1,over:null,log:[],
      bs:lvs.map((lv,i)=>{const P=mkP(lv,id+"-"+(i+1),c2,C,cfg.boards&&cfg.boards[i]);return{i,lv,nm:(G.LV[lv]||{}).nm||"",P,acted:-1,seal:-1,eye:eyeOf(P.td,st.pc)}})};
    lg(M,{k:"start",n,need:M.need});return M}
  function lg(M,o){o.R=M.R;M.log.push(o);if(M.log.length>60)M.log.splice(0,M.log.length-60);return o}
  /* ===== 共用靈力、冷卻：每次碰某一盤的 GSV 之前先 sync（把全場的值放進那盤的 td），碰完 back（收回來） ===== */
  function sync(M,i){const B=M.bs[i],td=B.P.td,me=td.me;me.sp=M.sp.v;me.inc=M.sp.inc;me.spMax=M.sp.max;td.cd=clone(M.cd);td.cdAt={};td.used=clone(M.used);td.sk1=M.sk1===M.R?td.rnd:-1;td.pool=1;return B}
  function back(M,i){const me=M.bs[i].P.td.me;M.sp.v=me.sp;M.sp.inc=me.inc}
  /* 這盤現在的樣子：done 已結束、think 星樞思考中、wait 這輪走過了（等另一盤）、me 輪到我 */
  function stOf(M,i){const B=M.bs[i];if(!B||B.P.result||M.over)return"done";if(B.P.turn!=="r")return"think";if(B.acted===M.R)return"wait";return"me"}
  function why0(M,i){const s=stOf(M,i);if(!M.bs[i])return"沒有這一盤";if(M.over)return"這場已經結束";if(s==="done")return"這盤已經下完";if(s==="think")return"星樞思考中";if(s==="wait")return"這盤這輪走過了";return""}
  const isSkill=id=>id!=="dep"&&!!(G.SKM[id]&&!G.SKM[id].info);
  const sealed=(M,i)=>M.bs[i].seal>=M.R;
  function why(M,i,id,C){const w=why0(M,i);if(w)return w;if(isSkill(id)){if(sealed(M,i))return"陣眼被吃：這盤封招一輪";if(M.sk1===M.R)return"這一輪已經放過一招"}sync(M,i);return G.why(M.bs[i].P,id,C)}
  /* ===== 玩家：走棋、放招、部署 ===== */
  function move(M,i,f,t,C){const w=why0(M,i);if(w)return{err:w};const B=M.bs[i],P=B.P;if(!C.legal(P.board,"r").some(([a,b])=>a===f&&b===t))return{err:"這步不合法"};
    sync(M,i);const m=C.stateApply(P,f,t),r=G.move(P,m,C);back(M,i);B.acted=M.R;judge(M,i,C,r);advance(M);return{ok:1,m}}
  function cast(M,i,o,C){const id=o&&o.k,w=why(M,i,id,C);if(w)return{err:w};const B=M.bs[i],r=G.cast(B.P,o,C);if(r.err)return r;back(M,i);if(r.info)return r;
    const td=B.P.td;if(id==="dep")B.acted=M.R;else{M.cd=clone(td.cd);M.cdAt[id]=M.R;M.used=clone(td.used);M.sk1=M.R}
    lg(M,{k:"cast",i,id});if(r.end&&!B.P.result)B.P.result={w:r.end.w,why:r.end.why};advance(M);return r}
  /* ===== 星樞回一步（引擎或退路挑好的步） ===== */
  function reply(M,i,f,t,C){const B=M.bs[i],P=B&&B.P;if(!B||M.over||P.result||P.turn!=="b")return{err:"不是星樞的回合"};if(!C.legal(P.board,"b").some(([a,b])=>a===f&&b===t))return{err:"這步不合法"};
    sync(M,i);const vid=P.td.ids[t]||null,eye=!!(vid&&B.eye&&vid===B.eye&&P.board[t]);const m=C.stateApply(P,f,t),r=G.move(P,m,C);back(M,i);
    if(eye){B.seal=M.R+1;lg(M,{k:"eye",i})}
    judge(M,i,C,r);advance(M);return{ok:1,m,eye}}
  function judge(M,i,C,tdr){const P=M.bs[i].P;if(P.result)return;let r=C.judgeState(P);if(!r&&tdr&&tdr.end)r=tdr.end;if(!r&&P.td.over)r=P.td.over;if(r){P.result={w:r.w,why:r.why};lg(M,{k:"end",i,w:r.w,why:r.why})}}
  /* 比數：w 我拿下的盤、l 星樞拿下的盤、d 和、open 還在下 */
  function tally(M){let w=0,l=0,d=0,open=0;for(const B of M.bs){const r=B.P.result;if(!r)open++;else if(r.w==="r")w++;else if(r.w==="b")l++;else d++}return{w,l,d,open,n:M.bs.length}}
  /* 過關判定（need：三盤版 2＝三盤拿兩勝；舊的兩盤版 2＝兩盤皆勝）。拿到 need 勝＝過關，馬上結束；已經不可能拿到 need 勝＝未過關，也馬上結束（三盤版：兩敗、一敗一和、兩和）。
     和局那一盤不算勝也不算敗，只是「沒拿下」（合併稿沒寫和局，這條是我訂的） */
  function verdict(M){const n=M.bs.length,need=Math.max(1,Math.min(n,M.need||n)),T=tally(M),w=T.w;
    if(w>=need)return{win:true,w,l:T.l,d:T.d,n,need,why:need===n?`${n} 盤全勝`:`${n} 盤拿下 ${w} 盤`};
    if(w+T.open<need)return{win:false,w,l:T.l,d:T.d,n,need,why:need===n?`要 ${n} 盤全勝`:`要拿下 ${need} 盤`};return null}
  /* ===== 危險預警（三盤版；合併稿「危險提示分種類：被將軍、星門援軍將至、陣眼子受威脅（或可能致命），不能只靠紅色」）=====
     只看輪紅方走的盤（me／wait）；星樞還在想的盤局面未定、已結束的盤不用救＝空。純函式：不改狀態、不用亂數。依嚴重程度排：
     core 危（5）：已預告的入侵＋大招（GSV.preview）再加星樞下一步最痛的一擊（擒子＋將軍，照 GSV 的 dmg），套盾後 ≥ 我方星核 HP＝下一次結算可能歸零；sure＝光是已預告的就歸零
     chk 將（4）：我方被將軍。inv 侵（3）：已預告的入侵卒／大招下一次結算會扣血（套盾後 >0）。eye 眼（2）：星樞下一步能合法吃到陣眼子。gate 門（1）：援軍這個本盤回合結束就落下
     DG_HOT 以上＝立即危險（自動跳盤先去、畫面出「先救」鈕）；門只是提醒，只在縮圖上標 */
  const DG={core:5,chk:4,inv:3,eye:2,gate:1},DG_HOT=2;
  function danger(M,i,C){const s=stOf(M,i);if(s!=="me"&&s!=="wait")return[];const B=M.bs[i],td=B.P.td,b=B.P.board,me=td.me,E=td.en,L=[],pv=G.preview(td,b,C),eq=G.sqOfId(td,B.eye);let hit=0,eye=false;
    for(const[f,t]of G.banMoves(td,b,C.legal(b,"b"),true)){const v=b[t];if(v==="K")continue;let raw=0;if(v&&v===v.toUpperCase())raw+=G.dmg(G.CAPB[v],E.atk,me.def);
      if(td.rnd-me.lastChk>=G.CHK_GAP&&C.inCheck(C.make(b,f,t),"r"))raw+=G.dmg(G.CHK,E.atk,me.def);if(raw>hit)hit=raw;if(eq!=null&&t===eq)eye=true}
    const loss=G.absorb(me.sh,pv.raw+hit).loss,F=G.fore(td);
    if(loss>=me.hp)L.push({k:"core",rank:DG.core,loss,sure:pv.loss>=me.hp});
    if(C.inCheck(b,"r"))L.push({k:"chk",rank:DG.chk});
    if(pv.loss>0)L.push({k:"inv",rank:DG.inv,loss:pv.loss,n:pv.L.length});
    if(eye)L.push({k:"eye",rank:DG.eye,sq:eq});
    if(F.length&&F[0].inR<=1)L.push({k:"gate",rank:DG.gate,n:F[0].ws.length});
    return L}
  /* 走完第 i 盤之後跳去哪一盤：輪到我的盤裡，有立即危險的先去（最嚴重的；一樣嚴重照 i 後面的順序）；都沒有危險就 i 後面第一個輪到我的盤；沒得去回 -1。i＝-1：從第 1 盤找起（接續時用） */
  function hop(M,i,C){if(!M||M.over)return-1;const n=M.bs.length;let best=-1,br=0,first=-1;
    for(let k=1;k<=n;k++){const j=((i+k)%n+n)%n;if(stOf(M,j)!=="me")continue;if(first<0&&j!==i)first=j;const t=danger(M,j,C)[0],r=t&&t.rank>=DG_HOT?t.rank:0;if(r>br){br=r;best=j}}
    return best>=0?best:first}
  /* 「先救」提示：別的盤（輪到我的）有立即危險、而且比現在這盤嚴重 → {i,k,rank}；沒有就 null */
  function dgAlert(M,cur,C){if(!M||M.over)return null;const j=hop(M,cur,C);if(j<0||j===cur)return null;const t=danger(M,j,C)[0];if(!t||t.rank<DG_HOT)return null;
    const c=stOf(M,cur)==="me"?danger(M,cur,C)[0]:null;return c&&c.rank>=t.rank?null:{i:j,k:t.k,rank:t.rank}}
  /* 存檔裡進行中的那一場能不能接著下：同一個模式、1～3 盤、每盤的關卡都還在（舊的兩盤存檔格式一樣，照舊能下完） */
  function okSave(M){return!!(M&&M.mode===MODE&&M.mv===MV&&Array.isArray(M.bs)&&M.bs.length>=1&&M.bs.length<=3&&M.bs.every(B=>B&&B.P&&B.P.td&&Array.isArray(B.P.board)&&G.LV[B.lv])&&M.sp&&typeof M.R==="number")}
  /* 總輪：還在下的盤都走過這一輪、星樞也都回完 → 回共用靈力（照收入上限）、冷卻減 1（放招那一輪不減）、總輪＋1 */
  function advance(M){if(M.over)return;const v=verdict(M);if(v){M.over=v;lg(M,{k:"over",win:v.win});return}
    const live=M.bs.filter(B=>!B.P.result);if(!live.length||!live.every(B=>B.acted===M.R&&B.P.turn==="r"))return;
    const S=M.sp,g=Math.max(0,Math.min(RG,G.INC_CAP-S.inc,S.max-S.v));S.v+=g;S.inc=0;
    for(const k in M.cd)if(M.cd[k]>0&&M.cdAt[k]!==M.R)M.cd[k]--;
    M.R++;lg(M,{k:"round",g})}
  /* ===== 單一引擎佇列 ===== Q＝{run:正在算的工作,list:排隊}；工作＝{mid,i,k}，k＝場次|盤|手數|事件序號|盤面修改數 */
  function needs(M){return!M||M.over?[]:M.bs.filter(B=>!B.P.result&&B.P.turn==="b").map(B=>B.i)}
  function key(M,i){const P=M.bs[i].P;return M.id+"|"+i+"|"+P.moves.length+"|"+P.td.seq+"|"+(P.ed?P.ed.length:0)}
  function live(M,j){const B=M&&M.bs[j.i];return!!B&&j.mid===M.id&&!M.over&&!B.P.result&&B.P.turn==="b"&&key(M,j.i)===j.k}
  function queue(Q,M){Q.list=Q.list.filter(j=>live(M,j));for(const i of needs(M)){const same=j=>j.mid===M.id&&j.i===i;if((Q.run&&same(Q.run))||Q.list.some(same))continue;Q.list.push({mid:M.id,i,k:key(M,i)})}return Q}
  /* 挑星樞的步：引擎結果交給 GSV.pick；沒有結果（逾時、出錯、沒載好）一樣用 GSV.pick 的規則評估挑；再不行就第一個合法步。回傳 [f,t,來源] */
  function choose(r,cfg,P,C,rnd){const L=C.legal(P.board,"b"),ok=u=>{if(typeof u!=="string"||u.length<4)return null;const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));return L.some(([a,b])=>a===f&&b===t)?[f,t]:null};
    const has=!!(r&&Array.isArray(r.lines)&&r.lines.length);let mv=null;try{mv=ok(G.pick(has?r:{lines:[]},cfg,rnd))}catch(e){}if(mv)return[mv[0],mv[1],has?"eng":"rule"];
    if(has)try{mv=ok(G.pick({lines:[]},cfg,rnd))}catch(e){}if(mv)return[mv[0],mv[1],"rule"];
    return L.length?[L[0][0],L[0][1],"first"]:null}
  function race(p,ms){return new Promise((res,rej)=>{const h=setTimeout(()=>{const e=new Error("ENG_TIMEOUT");e.tmo=1;rej(e)},ms);Promise.resolve(p).then(v=>{clearTimeout(h);res(v)},e=>{clearTimeout(h);rej(e)})})}
  /* 跑一個工作：get()＝現在這一場（重開後是新的一場，舊結果就對不上）；o.search(pos,lim,mpv)＝引擎（沒有就直接用規則評估）；o.tmo 逾時；o.min＋o.wait 最少等多久；o.rnd 亂數 */
  async function step(get,Q,C,o){o=o||{};if(Q.run)return{busy:1};let M=get();if(!M)return{idle:1};queue(Q,M);const j=Q.list.shift();if(!j)return{idle:1};Q.run=j;
    try{const P=M.bs[j.i].P;sync(M,j.i);const cfg=G.engine(P,C),t0=Date.now();let r=null,via="none";
      if(o.search){try{r=await race(o.search({fen:C.fen(P.board,"b")},{depth:cfg.depth,searchmoves:cfg.sm||undefined},cfg.mpv),o.tmo||TMO);via="eng"}catch(e){r=null;via=e&&e.tmo?"tmo":"err"}}
      if(o.wait&&o.min){const w=o.min-(Date.now()-t0);if(w>0)await o.wait(w)}
      M=get();if(!live(M,j))return{drop:1,i:j.i,via};
      const B=M.bs[j.i],mv=choose(r,cfg,B.P,C,o.rnd||Math.random);if(!mv)return{drop:1,i:j.i,via:"none"};
      const x=reply(M,j.i,mv[0],mv[1],C);return Object.assign({i:j.i,via,src:mv[2]},x)}
    finally{Q.run=null}}
  /* ===== 結算（整場一次；同一場第二次不再算、不再給） ===== */
  function record(prog,M){const p=prog&&typeof prog==="object"?prog:{},P={mv:MODE,c:Object.assign({w:0,l:0},p.c),g:Array.isArray(p.g)?p.g.slice():[],auto:p.auto!==false,sk:Object.assign({},p.sk)};
    if(!M||!M.over)return{prog:P,none:true};if(P.g.includes(M.id))return{prog:P,dup:true,rw:{dust:0,xp:0,sta:0}};
    const bk=M.bs.length>=3?"best3":"best";   /* 最快過關輪數：三盤版另外記（跟舊的兩盤版不能比） */
    if(M.over.win){P.c.w++;if(!P.c[bk]||M.R<P.c[bk].R)P.c[bk]={R:M.R}}else P.c.l++;P.g=P.g.concat([M.id]).slice(-30);return{prog:P,dup:false,rw:Object.assign({},REWARD)}}
  return{MODE,MV,SP0,RG,TMO,TMO0,WAIT,REWARD,EYE,BD,LVS,NEED,DG,DG_HOT,newMatch,eyeOf,sync,back,stOf,why,move,cast,reply,tally,verdict,danger,hop,dgAlert,okSave,advance,needs,key,live,queue,choose,step,record,sealed}})(typeof GSV!=="undefined"?GSV:null);
/* ================= ② 畫面 ================= */
let WHL_M=null,WHL_Q={run:null,list:[]},WHL_CUR=0,WHL_SEL=-1,WHL_TG=null,WHL_INFO=false,WHL_BD=null,WHL_HOP=0,WHL_LIVE=false,WHL_SEEN="",WHL_EVS={},WHL_HK="";
const whlC=()=>typeof window!=="undefined"&&window.XQCore;
const whlRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
function whlProg(){let o=null;try{o=store.get("whl",null)}catch(e){}const P=o&&typeof o==="object"&&o.mv===WHL.MODE?o:{};
  return{mv:WHL.MODE,c:Object.assign({w:0,l:0},P.c),g:Array.isArray(P.g)?P.g:[],auto:P.auto!==false,sk:Object.assign({},P.sk),cur:WHL.okSave(P.cur)?P.cur:null}}
function whlSave(){const P=whlProg();P.cur=WHL_M;store.set("whl",P)}
/* 黑洞關卡卡片（07bht-td.js bhtdSelect，星門圍城那張後面）：只在開發者模式顯示，卡上只寫名稱（開發者 11/15：關卡字要極簡） */
function whlCard(){   /* 11/15 開發者「可以上線」：開給所有玩家（原本只給開發者） */
  return`<button type="button" class="bt-card bt-whlc" data-whl="1" aria-label="車輪戰"><div class="hd"><b>車輪戰</b></div></button>`}
function whlOpen(){if(typeof GSV==="undefined")return;const P=whlProg();if(P.cur&&!P.cur.over){WHL_M=P.cur;WHL_Q={run:null,list:[]};const C=whlC();WHL_CUR=C?Math.max(0,WHL.hop(WHL_M,-1,C)):0;WHL_SEL=-1;WHL_TG=null;WHL_EVS={};whlShow();return}whlSetup()}
if(typeof window!=="undefined")window.whlOpen=whlOpen;
const whlCk=()=>{let c="";try{c=(typeof myChar==="function"&&myChar())||store.get("pChar","")}catch(e){}return GSV.CH[c]?c:"x_swordboy"};
const whlL=()=>{try{return typeof xpInfo==="function"?xpInfo().L:1}catch(e){return 1}};
function whlSetup(){whlCss();const ck=whlCk(),L=whlL(),P=whlProg(),pool=GSV.SK.filter(s=>s.ch===ck);let pk=GSV.skPick(ck,L,P.sk[ck]);
  const skH=()=>pool.map(s=>`<label class="${pk.includes(s.id)?"on":""}${s.lv>L?" lk":""}" data-id="${s.id}" title="${esc(s.d)}">${s.lv>L?"🔒 ":""}${esc(s.nm)}</label>`).join("");
  const m=modal(`<div class="em">🎡</div><h2>車輪戰</h2><p class="muted">三盤拿兩勝</p><p style="font-size:13px;margin-bottom:2px">招式（最多 4 招）</p><div class="whl-skl">${skH()}</div>`,
    [["開始",()=>whlNew(pk)],["返回",null,true]],"prolog whl-sel");
  if(!m)return;m.addEventListener("click",e=>{const l=e.target.closest(".whl-skl label");if(!l)return;e.preventDefault();const s=GSV.SKM[l.dataset.id];if(s.lv>L){toast(`🔒 修為 Lv ${s.lv} 解鎖「${s.nm}」`);return}
    if(pk.includes(s.id)){if(pk.length>1)pk=pk.filter(x=>x!==s.id)}else if(pk.length<4)pk=pk.concat([s.id]);else{toast("最多帶 4 招");return}m.querySelector(".whl-skl").innerHTML=skH()})}
function whlNew(sk){const C=whlC();if(!C)return toast("規則程式還沒載好");const ck=whlCk(),L=whlL();
  WHL_M=WHL.newMatch({ch:ck,L,sk,need:WHL.NEED},C);WHL_Q={run:null,list:[]};WHL_CUR=0;WHL_SEL=-1;WHL_TG=null;WHL_EVS={};
  const P=whlProg();P.sk[ck]=WHL_M.sk;P.cur=WHL_M;store.set("whl",P);whlShow();setTimeout(()=>{try{toast("三盤拿兩勝")}catch(e){}},300)}
function whlCss(){if(document.getElementById("whlCss"))return;const s=document.createElement("style");s.id="whlCss";s.textContent=`
#whlOv{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;background:#06060f;color:#f1e7cf;font-family:var(--serif);user-select:none;-webkit-user-select:none;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px);box-sizing:border-box}
.whl-top{flex:none;display:flex;align-items:center;gap:8px;height:40px;padding:0 8px}.whl-top>b{font-size:15px;color:#FFE08A;white-space:nowrap}.whl-rd{flex:1;min-width:0;font-size:12.5px;color:#c9bfe8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.whl-sc{flex:none;font-size:18px;font-weight:900;color:#fff;white-space:nowrap;letter-spacing:1px}.whl-sc .a{color:#FFE08A}.whl-sc .b{color:#d9b8ff}
.whl-top button{font:inherit;font-size:17px;color:#f1e7cf;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);border-radius:10px;min-width:44px;min-height:36px;cursor:pointer}
.whl-ths{flex:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:5px 8px 0}.whl-ths.n1{grid-template-columns:minmax(0,1fr)}.whl-ths.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.whl-tb{position:relative;display:flex;gap:5px;align-items:center;min-width:0;font:inherit;color:inherit;text-align:left;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.18);border-radius:12px;padding:3px;min-height:62px;cursor:pointer;touch-action:manipulation}
.whl-tb.on{border-color:#FFE08A;box-shadow:0 0 0 2px rgba(255,224,138,.35)}.whl-tb.me{border-style:solid}.whl-tb.me .whl-st{color:#ffd36a}.whl-tb.think{border-style:dashed}.whl-tb.done{opacity:.72}
.whl-tb.hot{box-shadow:0 0 0 2px rgba(255,90,74,.75);animation:whlHot 1.1s ease-in-out infinite}.whl-tb.hot:not(.on){border-color:#ff5a4a}@keyframes whlHot{50%{box-shadow:0 0 10px 3px rgba(255,90,74,.85)}}
.whl-mini{position:relative;flex:none;width:44px}.whl-mini svg{display:block;width:100%;height:auto}
.whl-ti{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;font-size:12px;line-height:1.2}
.whl-no{position:absolute;right:-3px;bottom:-3px;width:17px;height:17px;border-radius:50%;background:#2a2450;border:1px solid rgba(255,255,255,.55);color:#fff;font-size:11px;line-height:17px;text-align:center;font-weight:800}.whl-tb.on .whl-no{background:#FFE08A;border-color:#FFE08A;color:#1a1000}
@media (max-width:370px){.whl-mini{width:38px}}@media (max-width:340px){.whl-mini{width:32px}.whl-st{font-size:11px}}
.whl-st{color:#c9bfe8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.whl-st.w{color:#9fffb0;font-weight:800}.whl-st.l{color:#ff9a8a;font-weight:800}
.whl-dg,.whl-sl{position:absolute;left:-4px;min-width:18px;height:18px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;font-weight:900;line-height:1;pointer-events:none}
.whl-dg{top:-6px}.whl-dg.core{background:#ff3b30;color:#fff;border-radius:50%;box-shadow:0 0 8px #ff3b30}.whl-dg.chk{background:#fff;color:#c0281e;border:2px solid #c0281e;border-radius:4px}.whl-dg.inv{background:#c0281e;color:#fff;border-radius:6px}
.whl-dg.eye{background:#d9a400;color:#1a1000;border-radius:6px}.whl-dg.gate{background:#2a1050;color:#f0dcff;border:1.5px dashed #b46bff;border-radius:50%}
.whl-sl{bottom:-5px;background:#0d1b4f;color:#cfe0ff;border:1px solid #8aa6ff;border-radius:6px}
.whl-hp{position:relative;height:6px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}.whl-hp s{position:absolute;inset:0 auto 0 0;background:#e0483a;border-radius:99px}.whl-hp.en s{background:#b04ae0}
.whl-en,.whl-me{flex:none;padding:3px 8px}.whl-r{display:flex;align-items:center;gap:6px;min-height:22px;font-size:12px;white-space:nowrap;min-width:0}.whl-r+.whl-r{margin-top:3px}
.whl-nm{flex:none;font-weight:800;color:#FFE08A;font-size:12.5px}.whl-nm.en{color:#d9b8ff}
.whl-bar{position:relative;flex:1 1 40%;min-width:60px;height:16px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}.whl-bar i{position:absolute;inset:0 auto 0 0;border-radius:99px;background:linear-gradient(90deg,#8a1020,#e0483a)}
.whl-bar.en i{background:linear-gradient(90deg,#4a1a7a,#b04ae0)}.whl-bar.sp i{background:linear-gradient(90deg,#1d5fb8,#6fb8ff)}.whl-bar b{position:relative;display:block;text-align:center;font-size:11px;line-height:16px;text-shadow:0 1px 2px #000}
.whl-sx{flex:none;font-size:11px;color:#c9bfe8}.whl-sx b{color:#f1e7cf}.whl-sh{flex:none;font-size:11px;color:#9fd0ff;border:1px solid rgba(111,184,255,.6);border-radius:99px;padding:0 6px}
.whl-ln{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;color:#d9b8ff}
.whl-bw{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
.whl-bd{position:relative;flex:none}.whl-bd>svg{display:block;width:100%;height:100%}
.whl-bd.hop{animation:whlHop .3s ease-out}@keyframes whlHop{from{opacity:.3;transform:translateX(24px)}to{opacity:1;transform:none}}
.whl-mks{position:absolute;inset:0;pointer-events:none}
.whl-mk{position:absolute;transform:translate(-50%,-50%);pointer-events:none;display:flex;align-items:center;justify-content:center;font-weight:800;box-sizing:border-box}
.whl-mk.gate{width:10.4%;height:9.4%;border-radius:50%;border:2.5px dashed #b46bff;background:radial-gradient(circle,rgba(120,40,200,.42),rgba(40,10,80,.1) 70%);color:#f0dcff;font-size:11px}
.whl-mk.bd{font-size:10px;color:#fff;border-radius:6px;padding:0 3px;line-height:1.35;margin:-3.6% 0 0 3.8%}.whl-mk.bd.inv{background:#c0281e}.whl-mk.bd.arm{background:#ff3b30;box-shadow:0 0 8px #ff3b30}.whl-mk.bd.guard{background:#2b6fd6}
.whl-mk.bd.eye{background:#d9a400;color:#1a1000;margin:3.6% 0 0 -3.8%}.whl-mk.bd.frz{background:#0d1b4f;border:1px solid #8aa6ff;margin:3.6% 0 0 3.8%}
.whl-mk.ring{width:10%;height:9%;border-radius:50%;border:3px solid #ff3b30}.whl-mk.ring.ifo{border-color:#ff8a1a;border-style:dashed}
.whl-mk.tg{pointer-events:auto;width:10%;height:9%;border-radius:50%;border:3px solid #FFE08A;background:rgba(255,224,138,.22);cursor:pointer;padding:0;animation:whlTg 1s ease-in-out infinite}
@keyframes whlTg{50%{box-shadow:0 0 14px 5px rgba(255,224,138,.6)}}
.whl-fl{position:absolute;left:50%;transform:translate(-50%,-50%);pointer-events:none;font-weight:900;font-size:15px;color:#fff;text-shadow:0 1px 3px #000,0 0 8px #000;white-space:nowrap;animation:whlFl 1.3s ease-out forwards}
.whl-fl.hurt{color:#ff9a8a}.whl-fl.dmg{color:#e7c6ff}.whl-fl.heal{color:#9fffb0}@keyframes whlFl{0%{opacity:0}15%{opacity:1}80%{opacity:1}100%{opacity:0;margin-top:-18px}}
.whl-msg{flex:none;height:34px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13.5px;color:#FFE08A;padding:2px 8px;white-space:nowrap;overflow:hidden}.whl-msg>span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.whl-al{flex:none;display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12.5px;font-weight:800;color:#fff;background:#b3261e;border:1.5px solid #ffb4a8;border-radius:99px;padding:0 10px 0 5px;height:30px;cursor:pointer;touch-action:manipulation;animation:whlHot 1.1s ease-in-out infinite}
.whl-al i{font-style:normal;width:18px;height:18px;border-radius:50%;background:#fff;color:#b3261e;font-size:12px;line-height:18px;text-align:center}
.whl-fin{font-size:26px;font-weight:900;margin:2px 0;letter-spacing:2px}
.whl-sks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:4px}
.whl-sk{font:inherit;color:#f6eedd;background:linear-gradient(180deg,#2c2450,#171433);border:1.5px solid #8f7bd8;border-radius:10px;padding:2px;min-height:44px;cursor:pointer;line-height:1.15;touch-action:manipulation}
.whl-sk.gen{background:linear-gradient(180deg,#22304a,#121a2c);border-color:#5f8fc8}.whl-sk b{display:block;font-size:12px}.whl-sk small{font-size:10.5px;color:#9fd0ff}.whl-sk.off{opacity:.45;filter:grayscale(.7)}.whl-sk.on{border-color:#FFE08A;box-shadow:0 0 0 2px #FFE08A}
.whl-tip{display:flex;gap:8px;justify-content:center;align-items:center;font-size:12.5px;color:#FFE08A}.whl-tip button{font:inherit;font-size:12px;color:#f1e7cf;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:1px 12px;min-height:30px}
.whl-skl{display:flex;flex-wrap:wrap;gap:6px}#whlOv img.eic,.whl-skl img.eic{width:1.15em;height:1.15em;vertical-align:-.18em;object-fit:contain}.whl-skl label{font-size:12.5px;border:1.5px solid var(--line,#ccc);border-radius:99px;padding:3px 9px;cursor:pointer}.whl-skl label.on{border-color:#7a3fb0;background:rgba(122,63,176,.12)}.whl-skl label.lk{opacity:.4}
.bt-sel .bt-card.bt-whlc{border-style:double;border-width:3px;border-color:#d9a400}
@media (prefers-reduced-motion:reduce){.whl-bd.hop,.whl-mk.tg,.whl-fl,.whl-tb.hot,.whl-al{animation:none}.whl-fl{display:none}}`;document.head.append(s)}
function whlShow(){if(typeof document==="undefined")return;whlCss();let ov=document.getElementById("whlOv");
  if(!ov){ov=document.createElement("div");ov.id="whlOv";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","車輪戰");
    ov.innerHTML=`<div class="whl-top"><b>車輪戰</b><span class="whl-sc" title="比數"></span><span class="whl-rd"></span><button type="button" data-x="set" aria-label="設定">⚙</button><button type="button" data-x="quit" aria-label="離開">✕</button></div>
      <div class="whl-ths" role="tablist" aria-label="各盤"></div><div class="whl-en"></div><div class="whl-bw"><div class="whl-bd"><div class="whl-mks"></div></div></div><div class="whl-msg" aria-live="polite"></div><div class="whl-me"></div>`;
    document.body.append(ov);WHL_BD=Board(sq=>whlTap(sq));const bd=ov.querySelector(".whl-bd");bd.insertBefore(WHL_BD.svg,bd.firstChild);
    ov.addEventListener("click",whlClick);addEventListener("resize",whlFit);addEventListener("hashchange",whlHide)}
  WHL_LIVE=true;WHL_HK="";whlFit();whlPaint();whlPump()}
function whlHide(){WHL_LIVE=false;WHL_HOP++;WHL_TG=null;WHL_SEL=-1;if(typeof document==="undefined")return;const ov=document.getElementById("whlOv");if(ov)ov.remove();WHL_BD=null;removeEventListener("resize",whlFit);removeEventListener("hashchange",whlHide)}
/* 棋盤照剩下的空間放到最大（560×620 比例） */
function whlFit(){const ov=document.getElementById("whlOv");if(!ov)return;const bw=ov.querySelector(".whl-bw"),bd=ov.querySelector(".whl-bd");if(!bw||!bd)return;const W=bw.clientWidth-8,H=bw.clientHeight-4;if(W<=0||H<=0)return;
  const s=Math.min(W/560,H/620);bd.style.width=Math.floor(560*s)+"px";bd.style.height=Math.floor(620*s)+"px"}
const whlPct=(a,b)=>Math.max(0,Math.min(100,Math.round(a/Math.max(1,b)*100)));
const WHL_ST={me:"輪到我",think:"思考中",wait:"已走",done:"已結束"};
/* 危險預警的字：縮圖角標一個字（形狀、顏色、字都不一樣，不只靠紅色）、提示用短句 */
const WHL_DG={core:["危","星核危急"],chk:["將","被將軍"],inv:["侵","入侵卒要扣血"],eye:["眼","陣眼受威脅"],gate:["門","援軍將至"]};
function whlResTx(B){const r=B.P.result;return!r?"":!r.w?"和":r.w==="r"?"勝":"敗"}
/* 縮圖：簡單的 2D 小棋盤（不用圖） */
function whlMini(b){let s='<svg viewBox="0 0 90 100" aria-hidden="true"><rect width="90" height="100" rx="4" fill="#e6cb98"/><g stroke="#6b4a24" stroke-width=".6">';
  for(let r=0;r<10;r++)s+=`<line x1="5" y1="${5+r*10}" x2="85" y2="${5+r*10}"/>`;for(let c=0;c<9;c++)s+=c===0||c===8?`<line x1="${5+c*10}" y1="5" x2="${5+c*10}" y2="95"/>`:`<line x1="${5+c*10}" y1="5" x2="${5+c*10}" y2="45"/><line x1="${5+c*10}" y1="55" x2="${5+c*10}" y2="95"/>`;s+="</g>";
  for(let q=0;q<90;q++){const p=b[q];if(!p)continue;const red=p===p.toUpperCase(),x=5+(q%9)*10,y=5+(q/9|0)*10,ch=(red?GSV.PCN:GSV.PBN)[p.toUpperCase()]||"";
    s+=`<circle cx="${x}" cy="${y}" r="4.4" fill="${red?"#fff3dc":"#f3ead8"}" stroke="${red?"#C8102E":"#222"}" stroke-width=".8"/><text x="${x}" y="${y+2.2}" font-size="6" text-anchor="middle" font-weight="900" fill="${red?"#C8102E":"#222"}">${ch}</text>`}
  return s+"</svg>"}
/* 縮圖（三盤一排，375 寬每張約 116）：小棋盤（右下角盤號）、狀態（輪到我／思考中／已走／勝敗和）、我方與星樞血條；左上角＝最嚴重的一個危險角標，左下角＝封招 */
function whlThumbs(M){const C=whlC();return M.bs.map(B=>{const i=B.i,s=WHL.stOf(M,i),td=B.P.td,r=whlResTx(B),sl=WHL.sealed(M,i)&&s!=="done",D=C?WHL.danger(M,i,C)[0]:null,dg=D&&WHL_DG[D.k],hot=!!(D&&D.rank>=WHL.DG_HOT);
  const lab=s==="done"?(r?`已結束・${r}`:"已結束"):WHL_ST[s]+(sl?"・封招":"")+(dg?"・"+dg[1]:"");
  return`<button type="button" class="whl-tb ${s}${i===WHL_CUR?" on":""}${hot?" hot":""}" data-i="${i}" role="tab" aria-selected="${i===WHL_CUR}" aria-label="${esc(`第 ${i+1} 盤，${lab}，我 HP ${Math.max(0,td.me.hp)}，星樞 HP ${Math.max(0,td.en.hp)}`)}">
    ${dg?`<i class="whl-dg ${D.k}">${dg[0]}</i>`:""}${sl?`<i class="whl-sl">封</i>`:""}<span class="whl-mini">${whlMini(B.P.board)}<b class="whl-no">${i+1}</b></span><span class="whl-ti"><span class="whl-st${r==="勝"?" w":r==="敗"?" l":""}">${esc(s==="done"?(r||"—"):WHL_ST[s])}</span><span class="whl-hp"><s style="width:${whlPct(td.me.hp,td.me.max)}%"></s></span><span class="whl-hp en"><s style="width:${whlPct(td.en.hp,td.en.max)}%"></s></span></span></button>`}).join("")}
function whlMsg(M,i){const B=M.bs[i],s=WHL.stOf(M,i),C=whlC();if(M.over)return M.over.win?"過關":"未過關";
  if(s==="done"){const r=B.P.result;return r?`這盤${whlResTx(B)}：${r.why||""}`:"這盤已結束"}
  if(s==="think")return"星樞思考中…";if(s==="wait")return"這盤這輪走過了";
  if(WHL_TG)return WHL_TG.arm?"再點一次同一招就放出":WHL_TG.id==="dep"?"點發光的補給點":"點發光的目標";
  const D=C?WHL.danger(M,i,C)[0]:null;if(D&&D.rank>=WHL.DG_HOT)return WHL_DG[D.k][1]+"！";
  if(WHL.sealed(M,i))return"陣眼被吃：這盤封招一輪";return`輪到你・第 ${i+1} 盤`}
/* 「先救」鈕：別的盤有立即危險、比現在這盤嚴重才出現（盤號＋一句），點了切過去 */
function whlAlert(M,i){const C=whlC(),A=C?WHL.dgAlert(M,i,C):null;if(!A)return"";const t=WHL_DG[A.k][1];
  return`<button type="button" class="whl-al" data-go="${A.i}" aria-label="${esc(`先救第 ${A.i+1} 盤：${t}`)}"><i>${A.i+1}</i><span>${esc(t)}</span></button>`}
function whlPaint(){const M=WHL_M,ov=typeof document!=="undefined"&&document.getElementById("whlOv");if(!M||!ov||!WHL_BD)return;const C=whlC();if(!C)return;if(WHL_CUR>=M.bs.length)WHL_CUR=0;
  const i=WHL_CUR,B=M.bs[i],P=B.P,td=P.td,s=WHL.stOf(M,i),my=s==="me";WHL.sync(M,i);if(!my){WHL_TG=null;WHL_SEL=-1}
  const hk=JSON.stringify([M.id,M.R,i,M.bs.map(x=>[x.P.moves.length,x.P.td.seq,x.acted,x.seal,!!x.P.result]),M.sp,M.sk1,!!M.over,WHL_SEL,WHL_TG&&[WHL_TG.id,WHL_TG.pk,WHL_TG.p],WHL_INFO]);
  if(hk===WHL_HK)return;WHL_HK=hk;
  const T=WHL.tally(M),ths=ov.querySelector(".whl-ths");
  ov.querySelector(".whl-rd").textContent=`第 ${M.R+1} 輪`;ov.querySelector(".whl-sc").innerHTML=`<span class="a">${T.w}</span>：<span class="b">${T.l}</span>`;
  ths.className="whl-ths n"+M.bs.length;ths.innerHTML=whlThumbs(M);
  const E=td.en,M2=td.me,F=GSV.fore(td),g=GSV.guards(td);let fore="援軍都下來了";if(F.length){const c={};for(const w of F[0].ws){const k=GSV.gateNm(w.sq)+"・"+GSV.PBN[w.p.toUpperCase()];c[k]=(c[k]||0)+1}fore=`下一波 ${F[0].inR} 回合後：`+Object.keys(c).map(k=>k+"×"+c[k]).join("、")}
  ov.querySelector(".whl-en").innerHTML=`<div class="whl-r"><span class="whl-nm en">星樞</span><div class="whl-bar en"><i style="width:${whlPct(E.hp,E.max)}%"></i><b>HP ${Math.max(0,E.hp)}／${E.max}</b></div><span class="whl-sx">DEF <b>${GSV.defOf(td,"b")}</b>${g?`（護陣 +${g*GSV.GUARD}）`:""}</span>${E.sh.v?`<span class="whl-sh">🛡${E.sh.v}</span>`:""}</div>
    <div class="whl-r"><span class="whl-ln">${esc(fore)}</span></div>`;
  const L=my?C.legal(P.board,"r"):[],last=P.moves[P.moves.length-1];
  WHL_BD.draw(P.board,{last,sel:WHL_SEL,targets:WHL_SEL>=0?L.filter(([f])=>f===WHL_SEL).map(x=>x[1]):[],check:!P.result&&C.inCheck(P.board,P.turn)?C.kingSq(P.board,P.turn):-1,fx:true});
  const mk=whlMarks(M,i);ov.querySelector(".whl-mks").innerHTML=mk.map(m=>{const q=m.sq,st=`left:${((40+(q%9)*60)/560*100).toFixed(2)}%;top:${((40+(q/9|0)*60)/620*100).toFixed(2)}%`;
    return m.b?`<button type="button" class="whl-mk tg" data-sq="${q}" style="${st}" aria-label="目標"></button>`:`<div class="whl-mk ${m.k}" style="${st}">${m.t||""}</div>`}).join("");
  ov.querySelector(".whl-msg").innerHTML=`<span>${esc(whlMsg(M,i))}</span>${whlAlert(M,i)}`;
  const sk=id=>{const S=GSV.SKM[id],w=WHL.why(M,i,id,C),cd=M.cd[id]||0,cost=GSV.costOf(td,id),on=WHL_TG&&WHL_TG.id===id,gen=id==="dep"||(S&&S.gen);
    const lab=id==="dep"?`<b>部署</b><small>${GSV.DEP_COST} 靈</small>`:`<b>${esc(S.nm)}</b><small>${S.info?(WHL_INFO?"顯示中":"情報"):cd?`冷卻 ${cd}`:`${cost} 靈`}</small>`;
    return`<button type="button" class="whl-sk${gen?" gen":""}${w&&!(S&&S.info)?" off":""}${on||(S&&S.info&&WHL_INFO)?" on":""}" data-k="${id}"${w?` data-w="${esc(w)}"`:""} aria-label="${esc((S?S.nm:"部署後備")+"："+(S?S.d:"花 20 靈力把一顆後備子放到補給點，用掉這一步")+(w?"（"+w+"）":""))}">${lab}</button>`};
  const tip=WHL_TG?`<div class="whl-tip"><button type="button" data-x="cancel">取消</button></div>`:"";
  ov.querySelector(".whl-me").innerHTML=`${tip}<div class="whl-r"><span class="whl-nm">${esc(M.cn)}</span><div class="whl-bar"><i style="width:${whlPct(M2.hp,M2.max)}%"></i><b>HP ${Math.max(0,M2.hp)}／${M2.max}</b></div>
      <div class="whl-bar sp" title="共用靈力"><i style="width:${whlPct(M.sp.v,M.sp.max)}%"></i><b>靈 ${M.sp.v}／${M.sp.max}</b></div>${M2.sh.v?`<span class="whl-sh">🛡${M2.sh.v}</span>`:""}</div>
    <div class="whl-sks">${M.sk.map(sk).join("")}${GSV.GEN.map(sk).join("")}${sk("dep")}</div>`;
  whlEvents(M,i)}
/* 盤上記號：星門（倒數）、入侵卒（侵）、護陣卒（陣）、陣眼子（眼）、這輪會扣的入侵（紅圈）、定身；選目標時是可以點的發光格 */
function whlMarks(M,i){const B=M.bs[i],P=B.P,td=P.td,b=P.board,C=whlC(),L=[],my=WHL.stOf(M,i)==="me";
  for(const g of GSV.fore(td))for(const w of g.ws)L.push({sq:w.sq,k:"gate",t:`門${g.inR}`});
  for(const q in td.ids){const id=td.ids[q],t=GSV.tagOf(td,id),sq=+q;if(t==="inv")L.push({sq,k:"bd "+(td.arm[id]?"arm":"inv"),t:td.arm[id]?"侵!":"侵"});if(t==="guard")L.push({sq,k:"bd guard",t:"陣"})}
  {const q=GSV.sqOfId(td,B.eye);if(q!=null)L.push({sq:q,k:"bd eye",t:"眼"})}
  for(const o of td.ctl.frz)if(o.until>td.rnd){const q=GSV.sqOfId(td,o.id);if(q!=null)L.push({sq:q,k:"bd frz",t:"定"})}
  for(const h of GSV.invHits(td))L.push({sq:h.sq,k:"ring"});
  if(WHL_INFO&&C){const R=new Set();for(const[f,t]of C.legal(b,"b"))if(b[t]==="R")R.add(f);for(const q of R)L.push({sq:q,k:"ring ifo"})}
  if(WHL_TG&&C&&my){WHL.sync(M,i);for(const x of GSV.targets(P,WHL_TG.id,WHL_TG.id==="dep"?[WHL_TG.p]:WHL_TG.pk,C))if(typeof x==="number")L.push({sq:x,b:1})}
  return L}
function whlClick(e){const M=WHL_M;if(!M)return;const x=e.target.closest("[data-x]");if(x){const k=x.dataset.x;try{vibrate(5)}catch(z){}
    if(k==="quit"){whlHide();return}if(k==="set"){whlSet();return}if(k==="cancel"){WHL_TG=null;whlPaint();return}return}
  const tb=e.target.closest(".whl-tb");if(tb){try{vibrate(5)}catch(z){}WHL_HOP++;whlGo(+tb.dataset.i,false);return}
  const al=e.target.closest(".whl-al");if(al){try{vibrate(5)}catch(z){}WHL_HOP++;whlGo(+al.dataset.go,true);return}
  const mk=e.target.closest(".whl-mk.tg");if(mk){e.stopPropagation();whlMkClick(+mk.dataset.sq);return}
  const b=e.target.closest(".whl-sk");if(b)whlSkill(b.dataset.k)}
function whlGo(j,anim){const M=WHL_M;if(!M||j<0||j>=M.bs.length)return;const ch=j!==WHL_CUR;WHL_CUR=j;WHL_SEL=-1;WHL_TG=null;WHL_HK="";
  if(ch){const B=M.bs[j];WHL_EVS[j]=B.P.td.seq;const bd=document.querySelector("#whlOv .whl-bd");if(bd&&anim&&!whlRM()){bd.classList.remove("hop");void bd.offsetWidth;bd.classList.add("hop")}}
  whlPaint()}
/* 下一盤：輪到我的盤裡有立即危險的先去，沒有就 i 後面第一個「輪到我」的盤（WHL.hop）；沒有就 -1 */
function whlNext(i){const M=WHL_M,C=whlC();if(!M||!C)return-1;return WHL.hop(M,i,C)}
/* 走完一步（走棋或部署）：先停在這盤看星樞回應，回應到了再等 0.6 秒滑到下一盤；1.5 秒還沒回就先滑過去（背景繼續算）。設定可以關；自己點縮圖就取消這次 */
function whlAfter(i){if(!whlProg().auto)return;const tok=++WHL_HOP,t0=Date.now();
  const chk=()=>{if(tok!==WHL_HOP||!WHL_LIVE||!WHL_M||WHL_CUR!==i)return;const s=WHL.stOf(WHL_M,i);
    if(s==="think"&&Date.now()-t0<1500){setTimeout(chk,100);return}
    setTimeout(()=>{if(tok!==WHL_HOP||!WHL_LIVE||WHL_CUR!==i)return;const j=whlNext(i);if(j>=0)whlGo(j,true)},s==="think"?0:600)};
  setTimeout(chk,100)}
function whlTap(sq){const M=WHL_M;if(!M||WHL_TG)return;const C=whlC(),i=WHL_CUR,B=M.bs[i],P=B.P,s=WHL.stOf(M,i);
  if(s!=="me"){const w={think:"星樞思考中",wait:"這盤這輪走過了，點上面換盤",done:"這盤已結束"}[s];if(w)toast(w);return}
  const L=C.legal(P.board,"r");
  if(WHL_SEL>=0&&L.some(([f,t])=>f===WHL_SEL&&t===sq)){const f=WHL_SEL,cap=!!P.board[sq];WHL_SEL=-1;const r=WHL.move(M,i,f,sq,C);if(r.err){toast(r.err);whlPaint();return}
    try{if(typeof moveSound==="function")moveSound(cap)}catch(e){}whlSave();whlPaint();whlAfter(i);whlPump();if(M.over)whlEnd();return}
  WHL_SEL=P.board[sq]&&L.some(([f])=>f===sq)?sq:-1;whlPaint()}
function whlSkill(id){const M=WHL_M,i=WHL_CUR,C=whlC(),S=GSV.SKM[id];if(!M||!C)return;
  if(S&&S.info){WHL_INFO=!WHL_INFO;whlPaint();return}
  const w=WHL.why(M,i,id,C);if(w){toast("✦ "+w);return}try{vibrate(8)}catch(z){}
  if(WHL_TG&&WHL_TG.id===id){const arm=WHL_TG.arm;WHL_TG=null;if(arm)whlCast(id,[]);else whlPaint();return}
  if(id==="dep"){const B=M.bs[i],ok=[...new Set(B.P.td.res)].filter(p=>GSV.targets(B.P,"dep",[p],C).length);if(!ok.length)return toast("補給點都不能用");
    modal(`<h2 style="font-size:19px">部署後備</h2>`,ok.map(p=>[GSV.PCN[p],()=>{WHL_TG={id:"dep",p,pk:[]};whlPaint()}]).concat([["取消",null,true]]));return}
  if(!S.tg){WHL_TG={id,pk:[],arm:1};whlPaint();toast("✦ "+S.nm+"："+S.d);return}
  WHL_TG={id,pk:[]};whlPaint();toast("🎯 "+S.nm+"："+S.d)}
function whlMkClick(sq){const T=WHL_TG,M=WHL_M,i=WHL_CUR,C=whlC();if(!T||!M)return;try{vibrate(8)}catch(z){}T.pk.push(sq);
  if(T.id==="dep"){WHL_TG=null;whlCast("dep",T.pk,T.p);return}
  const S=GSV.SKM[T.id],need=(S.tg||[]).length;if(T.pk.length>=need){WHL_TG=null;whlCast(T.id,T.pk);return}
  WHL.sync(M,i);const L=GSV.targets(M.bs[i].P,T.id,T.pk,C);
  if(L.length&&typeof L[0]==="object"){WHL_TG=null;whlPaint();modal(`<h2 style="font-size:19px">${esc(S.nm)}</h2>`,L.map(o=>[o.l,()=>whlCast(T.id,T.pk.concat([o.v]))]).concat([["取消",null,true]]));return}
  if(!L.length){WHL_TG=null;toast("沒有可以配對的目標")}WHL_HK="";whlPaint()}
function whlCast(id,tg,p){const M=WHL_M,i=WHL_CUR,C=whlC();if(!M||!C)return;const r=WHL.cast(M,i,{k:id,tg,p},C);WHL_HK="";if(r.err){toast(r.err);whlPaint();return}
  whlSave();if(id!=="dep"&&GSV.SKM[id])whlFloat(GSV.SKM[id].nm,null,"");whlPaint();if(id==="dep")whlAfter(i);whlPump();if(M.over)whlEnd()}
function whlSet(){const P=whlProg();modal(`<h2 style="font-size:19px">設定</h2>`,[[P.auto?"自動跳盤：開":"自動跳盤：關",()=>{const Q=whlProg();Q.auto=!Q.auto;Q.cur=WHL_M;store.set("whl",Q);toast(Q.auto?"走完自動跳下一盤":"不自動跳盤")}],
    ["重開",()=>confirmBox("重開這一場？",()=>whlSetup(),"重開")],["關閉",null,true]])}
/* 跳字：只顯示目前這盤、看著的時候發生的事件 */
function whlFloat(t,sq,cls){const bd=document.querySelector("#whlOv .whl-bd");if(!bd||whlRM())return;const f=document.createElement("div");f.className="whl-fl "+(cls||"");f.textContent=t;
  if(sq!=null){f.style.left=((40+(sq%9)*60)/560*100)+"%";f.style.top=((40+(sq/9|0)*60)/620*100)+"%"}else f.style.top=cls==="dmg"?"12%":"86%";bd.append(f);setTimeout(()=>f.remove(),1400)}
function whlEvents(M,i){const td=M.bs[i].P.td,s0=WHL_EVS[i];WHL_EVS[i]=td.seq;if(s0==null||td.seq<=s0)return;
  td.ev.filter(e=>e.s>s0).forEach((e,k)=>setTimeout(()=>{try{
    if(e.k==="hit"&&e.loss)whlFloat(`−${e.loss}`,null,e.to==="b"?"dmg":"hurt");else if(e.k==="warn")whlFloat("入侵預告",e.sq,"hurt");else if(e.k==="spawn")whlFloat("援軍",e.sq,"");
    else if(e.k==="guard")whlFloat("拆陣",e.sq,"");else if(e.k==="heal"&&e.n)whlFloat(`+${e.n}`,null,"heal");else if(e.k==="icpt")whlFloat("截援",e.sq,"")}catch(x){}},k*200))}
/* 引擎幫浦：一次只算一盤（WHL.step 管佇列）；算完存檔、重畫，再看下一個 */
async function whlPump(){if(!WHL_LIVE||!WHL_M||WHL_Q.run)return;const C=whlC();if(!C)return;WHL.queue(WHL_Q,WHL_M);if(!WHL_Q.list.length)return;
  const E=typeof XQEngine!=="undefined"&&XQEngine&&XQEngine.search?XQEngine:null,Q=WHL_Q;let r=null;
  try{r=await WHL.step(()=>WHL_M,Q,C,{search:E?(p,l,m)=>E.search(p,l,m):null,tmo:E&&E.ready?WHL.TMO:WHL.TMO0,min:WHL.WAIT,wait:ms=>new Promise(z=>setTimeout(z,ms))})}catch(e){r={err:e}}
  if(r&&r.via==="tmo")try{if(E&&E.abort)E.abort()}catch(e){}
  if(r&&r.ok){whlSave();if(r.eye&&WHL_LIVE)toast(`第 ${r.i+1} 盤陣眼被吃：封招一輪`)}
  if(r&&r.ok&&r.src!=="eng"&&WHL_LIVE&&typeof DEVMODE==="function"&&DEVMODE())try{console.info("[whl] 星樞用規則評估挑步",r.via,r.src)}catch(e){}
  WHL_HK="";whlPaint();if(WHL_M&&WHL_M.over){whlEnd();return}if(Q===WHL_Q)setTimeout(whlPump,0)}
/* 整場結算一次 */
function whlEnd(){const M=WHL_M;if(!M||!M.over)return;const x=WHL.record(whlProg(),M);x.prog.cur=M;store.set("whl",x.prog);if(!WHL_LIVE||WHL_SEEN===M.id)return;WHL_SEEN=M.id;
  const win=M.over.win,T=WHL.tally(M),res=M.bs.map(B=>whlResTx(B)||"—").join("・");
  setTimeout(()=>{if(!WHL_LIVE)return;try{if(typeof grwArm==="function")grwArm("whl")}catch(e){}/* 11/15 對戰後的角色成長（07grw） */modal(`<div class="em">${win?"✨":"🌀"}</div><h2>${win?"過關":"未過關"}</h2><p class="whl-fin">${T.w}：${T.l}</p><p class="muted">${esc(res)}</p><p class="muted" style="font-size:12px">試玩不給星塵、修為、定軌力</p>`,
    [["再來一場",()=>whlSetup()],["離開",()=>whlHide(),true],["看棋盤",null,true]],"res")},900)}
