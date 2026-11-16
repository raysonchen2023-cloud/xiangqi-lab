/* ---------- 黑洞車輪戰 wheel-v1（開發者 11/15；story/gemini_app/156_黑洞車輪戰_兩家回覆合併_1115.md「Claude 建議」第一批兩盤原型 → 同日改三盤版：三盤拿兩勝＋危險預警）----------
   11/15 已開給所有玩家（關卡卡片、主控台 whlOpen()）。前綴 WHL／whl（全域先 grep 過 m/ 與 src/ 沒撞名）。
   三盤版（story/黑洞車輪戰_三盤版實作紀錄_1115.md）：三盤同時下、輪流走，拿兩勝過關；不可能拿到兩勝（兩敗、一敗一和、兩和）就結束＝未過關；下完的盤跳過。
   危險預警 WHL.danger（危／將／侵／眼／門）：縮圖角標、「先救」鈕、自動跳盤先去有立即危險的盤。舊的兩盤存檔（進行中）照舊能下完（兩盤皆勝）。
   單盤規則＝星門圍城（07bhg-gatesiege.js 的 GSV，這支只加一層「兩盤一起」的規則）；不走 local.js 的對局（不開 journey、不給修為、不扣也不回定軌力）。
   開發者定案：
   - 各盤血量獨立；靈力全場共用一池（td.pool＝1：GSV 結算時不回我方靈力、不歸零收入上限，改成總輪回一次）。
   - 全場每個總輪最多一個主動招，只作用在目前這盤；冷卻、每局次數也是全場共用（同一位角色、同一組招）。
   - 每盤每個總輪走一個主要行動（走棋或部署）；所有還在下的盤都走過、星樞都回完＝總輪結束（回共用靈力、減冷卻）。入侵、波次照本盤回合；沒操作的盤不會自己走。
   - 11/16 開發者選單「取消陣眼子」：原本「陣眼子被吃只封該盤招式一輪」拿掉（seal 留著讓改版前沒下完的盤收尾）。
   - 過關：拿下 need 盤（三盤版 need＝2＝三盤拿兩勝；舊的兩盤版 need＝2＝兩盤皆勝）；已經不可能拿到 need 盤就結束、未過關。
   - 單一引擎輪流算：佇列每盤最多一個工作；結果回來先核對（同一場、同一盤、同一手數、同一事件序號）不對就丟；逾時或出錯用 GSV.pick 的規則評估挑合法步，不會卡在思考中。
   - 整場結算一次（store whl.g 記過的場次不重領）；獎勵照星門圍城試玩：不給星塵、修為、定軌力。
   分兩塊：① WHL＝純規則（node 測試 xiangqi-lab/tools/test-wheel.js 用 vm 跟 GSV 一起載）；② 畫面（whl*）：全螢幕一層 #whlOv，上方三張 2D 縮圖（盤號、狀態、雙方血條、危險角標）、中間一個可以操作的平面棋盤、下方招式。
     ③ 11/15 3D 視角（預設平面，頂欄「👁」切換，存檔鍵 whlView）：目前這盤＝park3d 巨盤的完整角色，另外兩盤＝同一個場景裡的簡化棋盤；說明、程式在檔尾，測試 test-wheel-3d.js。
   存檔鍵 whl＝{mv:"wheel-v1",c:{w,l,best,best3},g:[結算過的場次],auto:走完自動跳盤,sk:{角色:[招]},cur:進行中那一場}（已加進 05b JOURNEY_KEYS）。 */
const WHL=(G=>{
  const MODE="wheel-v1",MV=1;
  /* 共用靈力（候選值，待實打）：開場 40、每總輪回 6、上限＝角色靈力容量（90～110）；每總輪正向收入上限照 GSV.INC_CAP（10，兩盤合計） */
  const SP0=40,RG=6;
  const TMO=5000,TMO0=15000,WAIT=700;   /* 引擎逾時：載好 5 秒、還沒載好 15 秒（第一次要下載）；星樞回應最少等 0.7 秒 */
  const REWARD={dust:0,xp:0,sta:0};   /* 照星門圍城試玩：不給星塵、修為、定軌力 */
  /* 11/15 開發者決定擋掉「星樞自己長將判負、送玩家贏」的漏洞（星門圍城第一章 GSV.AREP1）：車輪戰三盤也開 arep（星樞不靠將軍走出重複局面） */
  /* 三盤固定短中局（星門圍城規則、只有一波援軍、星樞 HP 較低）。座標 [子,路,線,標記] 照 GSV。登記在 GSV.LV 的 101～103（GSV.LVN 開機就算好了，不會出現在星門圍城選關） */
  const BD={
    101:{nm:"河口",th:"守住入侵",hp:70,atk:90,def:10,esp0:20,esk:[],depth:2,rs:8,arep:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["r",9,10],["p",3,6,"inv"],["p",5,7]],
      waves:[{at:3,p:[["p",1,7,"inv"],["n",2,10]]}],say:"入侵卒在河岸",tip:"入侵卒過河，下一回合結束還在就扣你"},
    102:{nm:"陣門",th:"拆護陣",hp:80,atk:95,def:20,esp0:20,esk:[],depth:2,rs:8,arep:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",8,10],["c",8,8],["p",3,7,"guard"],["p",7,7,"guard"],["p",5,7]],
      waves:[{at:3,p:[["p",9,7,"inv"],["r",1,10]]}],say:"兩顆護陣卒",tip:"護陣卒每顆讓星樞 DEF+20"},
    /* 第 3 盤（三盤版加的，擺法與數值我設計、待實打）：右翼入侵卒開場就在、援軍比另外兩盤早一回合（第 2 回合）從左門、右底線來，三盤的緊急時間錯開 */
    103:{nm:"援門",th:"搶在援軍前",hp:75,atk:90,def:10,esp0:20,esk:[],depth:2,rs:8,arep:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",2,10],["c",8,8],["p",7,7,"inv"],["p",5,7]],
      waves:[{at:2,p:[["p",3,7,"inv"],["r",9,10]]}],say:"援軍來得早",tip:"第 2 回合結束援軍就到"}};
  const LVS=[101,102,103],NEED=2;   /* 三盤拿兩勝（開發者 11/15）。舊的兩盤存檔（bs 兩盤、need 2）照舊能下完 */
  if(G)for(const k in BD)G.LV[k]=Object.assign({n:+k},BD[k]);
  const clone=o=>JSON.parse(JSON.stringify(o));
  /* ===== 開一場 ===== */
  /* o.pcs：測試用自訂盤面 [[子,路,線,標記]…]（數值、波次照 lv）；o.waves===false＝不要援軍 */
  function mkP(lv,id,cfg,C,o){o=o||{};let start;
    if(o.pcs){const b=new Array(90).fill(null);for(const[p,lu,xi]of o.pcs)b[G.LSQ(lu,xi)]=p;start=C.fen(b,"r").split(" ")[0]}else start=G.startFen(lv,C);
    const P={id,start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[],result:null};P.pos=[C.fen(P.board,"r")];
    P.td=G.boot(Object.assign({mode:G.MODE,lv,ch:cfg.ch,L:cfg.L,sk:cfg.sk},cfg.sq!==undefined?{sq:cfg.sq}:{}),P,C);P.td.pool=1;
    if(o.pcs)for(const[p,lu,xi,tg]of o.pcs){const k=P.td.ids[G.LSQ(lu,xi)];if(k&&P.td.meta[k])P.td.meta[k].tag=tg||""}
    if(o.waves===false)P.td.waves=[];return P}
  function newMatch(cfg,C){cfg=cfg||{};const st=G.stats(cfg.ch,cfg.L),lvs=(cfg.lvs||LVS).slice(),n=lvs.length;
    /* 11/16 取消隊長、全隊招式：有隊伍時招式池＝全隊已學會的（G.skPickSq），共用靈力上限＝七種平均；每一盤帶同一份隊伍（c2.sq），boot 才會挑出同一組招 */
    const S0=cfg.sq!==undefined?cfg.sq:(typeof ptySquad==="function"?ptySquad():null),SQ=G.squad(S0),sk=SQ?G.skPickSq(SQ,cfg.sk):G.skPick(st.ck,st.L,cfg.sk),spM=SQ?Math.round(Object.keys(SQ).reduce((a,k)=>a+SQ[k].sp,0)/Object.keys(SQ).length):st.sp;
    const id=cfg.id||("w"+Date.now().toString(36)),c2={ch:st.ck,L:st.L,sk,sq:S0};
    const M={mode:MODE,mv:MV,id,need:Math.max(1,Math.min(n,+cfg.need||(n>=3?NEED:n))),ch:st.ck,cn:st.n,pc:st.pc,L:st.L,sk,R:0,sp:{v:SP0,max:spM,inc:0},cd:{},cdAt:{},used:{},sk1:-1,over:null,log:[],
      bs:lvs.map((lv,i)=>{const P=mkP(lv,id+"-"+(i+1),c2,C,cfg.boards&&cfg.boards[i]);return{i,lv,nm:(G.LV[lv]||{}).nm||"",P,acted:-1,seal:-1}})};
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
  function why(M,i,id,C){const w=why0(M,i);if(w)return w;if(isSkill(id)){if(sealed(M,i))return"這盤封招一輪";if(M.sk1===M.R)return"這一輪已經放過一招"}sync(M,i);return G.why(M.bs[i].P,id,C)}
  /* ===== 玩家：走棋、放招、部署 ===== */
  function move(M,i,f,t,C){const w=why0(M,i);if(w)return{err:w};const B=M.bs[i],P=B.P;if(!C.legal(P.board,"r").some(([a,b])=>a===f&&b===t))return{err:"這步不合法"};
    sync(M,i);const m=C.stateApply(P,f,t),r=G.move(P,m,C);back(M,i);B.acted=M.R;judge(M,i,C,r);advance(M);return{ok:1,m}}
  function cast(M,i,o,C){const id=o&&o.k,w=why(M,i,id,C);if(w)return{err:w};const B=M.bs[i],r=G.cast(B.P,o,C);if(r.err)return r;back(M,i);if(r.info)return r;
    const td=B.P.td;if(id==="dep")B.acted=M.R;else{M.cd=clone(td.cd);M.cdAt[id]=M.R;M.used=clone(td.used);M.sk1=M.R}
    lg(M,{k:"cast",i,id});if(r.end&&!B.P.result)B.P.result={w:r.end.w,why:r.end.why};advance(M);return r}
  /* ===== 星樞回一步（引擎或退路挑好的步） ===== */
  function reply(M,i,f,t,C){const B=M.bs[i],P=B&&B.P;if(!B||M.over||P.result||P.turn!=="b")return{err:"不是星樞的回合"};if(!C.legal(P.board,"b").some(([a,b])=>a===f&&b===t))return{err:"這步不合法"};
    sync(M,i);const m=C.stateApply(P,f,t),r=G.move(P,m,C);back(M,i);
    judge(M,i,C,r);advance(M);return{ok:1,m}}
  function judge(M,i,C,tdr){const P=M.bs[i].P;if(P.result)return;let r=C.judgeState(P);if(!r&&tdr&&tdr.end)r=tdr.end;if(!r&&P.td.over)r=P.td.over;if(r){P.result={w:r.w,why:r.why};lg(M,{k:"end",i,w:r.w,why:r.why})}}
  /* 比數：w 我拿下的盤、l 星樞拿下的盤、d 和、open 還在下 */
  function tally(M){let w=0,l=0,d=0,open=0;for(const B of M.bs){const r=B.P.result;if(!r)open++;else if(r.w==="r")w++;else if(r.w==="b")l++;else d++}return{w,l,d,open,n:M.bs.length}}
  /* 過關判定（need：三盤版 2＝三盤拿兩勝；舊的兩盤版 2＝兩盤皆勝）。拿到 need 勝＝過關，馬上結束；已經不可能拿到 need 勝＝未過關，也馬上結束（三盤版：兩敗、一敗一和、兩和）。
     和局那一盤不算勝也不算敗，只是「沒拿下」（合併稿沒寫和局，這條是我訂的） */
  function verdict(M){const n=M.bs.length,need=Math.max(1,Math.min(n,M.need||n)),T=tally(M),w=T.w;
    if(w>=need)return{win:true,w,l:T.l,d:T.d,n,need,why:need===n?`${n} 盤全勝`:`${n} 盤拿下 ${w} 盤`};
    if(w+T.open<need)return{win:false,w,l:T.l,d:T.d,n,need,why:need===n?`要 ${n} 盤全勝`:`要拿下 ${need} 盤`};return null}
  /* ===== 危險預警（三盤版；合併稿「危險提示分種類：被將軍、星門援軍將至（11/16 取消陣眼子：原本的「陣眼子受威脅」拿掉），不能只靠紅色」）=====
     只看輪紅方走的盤（me／wait）；星樞還在想的盤局面未定、已結束的盤不用救＝空。純函式：不改狀態、不用亂數。依嚴重程度排：
     core 危（5）：已預告的入侵＋大招（GSV.preview）再加星樞下一步最痛的一擊（擒子＋將軍，照 GSV 的 dmg），套盾後 ≥ 我方星核 HP＝下一次結算可能歸零；sure＝光是已預告的就歸零
     chk 將（4）：我方被將軍。inv 侵（3）：已預告的入侵卒／大招下一次結算會扣血（套盾後 >0）。gate 門（1）：援軍這個本盤回合結束就落下
     DG_HOT 以上＝立即危險（自動跳盤先去、畫面出「先救」鈕）；門只是提醒，只在縮圖上標 */
  const DG={core:5,chk:4,inv:3,gate:1},DG_HOT=2;
  function danger(M,i,C){const s=stOf(M,i);if(s!=="me"&&s!=="wait")return[];const B=M.bs[i],td=B.P.td,b=B.P.board,me=td.me,E=td.en,L=[],pv=G.preview(td,b,C);let hit=0;
    for(const[f,t]of G.banMoves(td,b,C.legal(b,"b"),true)){const v=b[t];if(v==="K")continue;let raw=0;if(v&&v===v.toUpperCase())raw+=G.dmg(G.CAPB[v],E.atk,me.def);
      if(td.rnd-me.lastChk>=G.CHK_GAP&&C.inCheck(C.make(b,f,t),"r"))raw+=G.dmg(G.CHK,E.atk,me.def);if(raw>hit)hit=raw}
    const loss=G.absorb(me.sh,pv.raw+hit).loss,F=G.fore(td);
    if(loss>=me.hp)L.push({k:"core",rank:DG.core,loss,sure:pv.loss>=me.hp});
    if(C.inCheck(b,"r"))L.push({k:"chk",rank:DG.chk});
    if(pv.loss>0)L.push({k:"inv",rank:DG.inv,loss:pv.loss,n:pv.L.length});
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
  return{MODE,MV,SP0,RG,TMO,TMO0,WAIT,REWARD,BD,LVS,NEED,DG,DG_HOT,newMatch,sync,back,stOf,why,move,cast,reply,tally,verdict,danger,hop,dgAlert,okSave,advance,needs,key,live,queue,choose,step,record,sealed}})(typeof GSV!=="undefined"?GSV:null);
/* ================= ② 畫面 ================= */
let WHL_M=null,WHL_Q={run:null,list:[]},WHL_CUR=0,WHL_SEL=-1,WHL_TG=null,WHL_INFO=false,WHL_BD=null,WHL_HOP=0,WHL_LIVE=false,WHL_SEEN="",WHL_EVS={},WHL_HK="";
/* 11/15 車輪戰 3D（說明在檔尾）：PK＝這一場唯一的 3D 實例（park3d 巨盤）；3S＝""沒開／"load"載入中／"on"；SIDE＝另外兩張簡化棋盤的工具組；FLY＝正在飛去哪一盤（這段時間不收點擊）；3O＝這盤的選取（給 3D 記號用） */
let WHL_PK=null,WHL_3S="",WHL_3RAF=0,WHL_3MK="",WHL_3SB="",WHL_SIDE=null,WHL_FLY=null,WHL_3TOK=0,WHL_3O=null,WHL_3DN=null,WHL_3USED=false,WHL_VMT=0,WHL_CROWD=null,WHL_3SL=[],WHL_3N=0;
const whlC=()=>typeof window!=="undefined"&&window.XQCore;
const whlRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
function whlProg(){let o=null;try{o=store.get("whl",null)}catch(e){}const P=o&&typeof o==="object"&&o.mv===WHL.MODE?o:{};
  return{mv:WHL.MODE,c:Object.assign({w:0,l:0},P.c),g:Array.isArray(P.g)?P.g:[],auto:P.auto!==false,sk:Object.assign({},P.sk),cur:WHL.okSave(P.cur)?P.cur:null}}
function whlSave(){const P=whlProg();P.cur=WHL_M;store.set("whl",P)}
/* 黑洞關卡卡片（07bht-td.js bhtdSelect，星門圍城那張後面）：只在開發者模式顯示，卡上只寫名稱（開發者 11/15：關卡字要極簡） */
function whlCard(){   /* 11/15 開發者「可以上線」：開給所有玩家（原本只給開發者） */
  return`<button type="button" class="bt-card bt-whlc" data-whl="1" aria-label="車輪戰"><div class="hd"><b>車輪戰</b></div></button>`}
function whlOpen(){if(typeof SG2G!=="undefined"&&typeof gsvSelect==="function"){gsvSelect(store.get("era","classic"),false);return}   /* 11/16 黑洞新規則：車輪戰拿掉，入口改開星門圍城 */
  if(typeof GSV==="undefined")return;const P=whlProg();if(P.cur&&!P.cur.over){WHL_M=P.cur;WHL_Q={run:null,list:[]};const C=whlC();WHL_CUR=C?Math.max(0,WHL.hop(WHL_M,-1,C)):0;WHL_SEL=-1;WHL_TG=null;WHL_EVS={};whlShow();return}whlSetup()}
if(typeof window!=="undefined")window.whlOpen=whlOpen;
const whlCk=()=>{let c="";try{c=typeof ptyLook==="function"?ptyLook():((typeof myChar==="function"&&myChar())||store.get("pChar",""))}catch(e){}return GSV.CH[c]?c:"x_swordboy"};   /* 11/16 取消隊長：畫面上的名字、頭像＝首頁小人（07pty-party.js ptyLook）；招式看全隊 */
const whlL=c=>{try{if(typeof ptyLv==="function")return ptyLv(c||whlCk());return typeof xpInfo==="function"?xpInfo().L:1}catch(e){return 1}};   /* 首頁小人那位的等級（只顯示用） */
function whlSetup(){whlCss();const ck=whlCk(),L=whlL(),P=whlProg(),pool=typeof ptyGroups==="function"?ptyGroups(GSV.SK.filter(s=>!s.gen)):[{c:ck,nm:(GSV.CH[ck]||{}).n||"",L,sk:GSV.SK.filter(s=>s.ch===ck)}];let pk=typeof ptyPick==="function"?ptyPick(GSV.SK,P.sk["*"]||P.sk[ck]):GSV.skPick(ck,L,P.sk[ck]);   /* 11/16 全隊招式：照夥伴分組 */
  const skH=()=>pool.map(g=>`<p class="whl-skg">${esc(g.nm)} <small>Lv ${g.L}</small></p>`+g.sk.map(s=>`<label class="${pk.includes(s.id)?"on":""}${s.lv>g.L?" lk":""}" data-id="${s.id}" title="${esc(s.d)}">${s.lv>g.L?"🔒 ":""}${esc(s.nm)}</label>`).join("")).join("");
  const m=modal(`<div class="em">🎡</div><h2>車輪戰</h2><p class="muted">三盤拿兩勝</p><p style="font-size:13px;margin-bottom:2px">招式（全隊已學會的都能帶，最多 4 招）</p><div class="whl-skl">${skH()}</div>`,
    [["開始",()=>whlNew(pk)],["返回",null,true]],"prolog whl-sel");
  if(!m)return;m.addEventListener("click",e=>{const l=e.target.closest(".whl-skl label");if(!l)return;e.preventDefault();const s=GSV.SKM[l.dataset.id];{const Lc=typeof ptyLv==="function"?ptyLv(s.ch):L;if(s.lv>Lc){toast(`🔒 ${typeof ptyNm==="function"?ptyNm(s.ch):""} Lv ${s.lv} 解鎖「${s.nm}」`);return}}
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
.whl-dg.gate{background:#2a1050;color:#f0dcff;border:1.5px dashed #b46bff;border-radius:50%}
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
.whl-mk.bd.frz{background:#0d1b4f;border:1px solid #8aa6ff;margin:3.6% 0 0 3.8%}
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
.whl-skl{display:flex;flex-wrap:wrap;gap:6px}.whl-skl .whl-skg{flex-basis:100%;margin:6px 0 0;font-size:12.5px;font-weight:700}.whl-skl .whl-skg small{font-weight:400;opacity:.7}#whlOv img.eic,.whl-skl img.eic{width:1.15em;height:1.15em;vertical-align:-.18em;object-fit:contain}.whl-skl label{font-size:12.5px;border:1.5px solid var(--line,#ccc);border-radius:99px;padding:3px 9px;cursor:pointer}.whl-skl label.on{border-color:#7a3fb0;background:rgba(122,63,176,.12)}.whl-skl label.lk{opacity:.4}
.bt-sel .bt-card.bt-whlc{border-style:double;border-width:3px;border-color:#d9a400}
/* 11/15 車輪戰 3D：頂欄「👁」視角鈕與小選單（樣式照星門圍城 #gsvView／#gsvViewM）；#whlOv.v3＝3D 開著：平面主棋盤收起來、3D 區（.whl-3d，park3d 掛在裡面）填滿中間，
   三張縮圖縮成一排小膠囊（盤號、狀態、危險角標都留著；小棋盤和血條收掉，另外兩盤的棋子改看 3D 裡那兩張簡化棋盤）。
   #whl3Ov＝疊在 3D 上的一層：盤上記號（直接用星門圍城的 gsv-mk／bt-mk 樣式）、另外兩張簡化棋盤上的狀態鈕（.whl-sb）、3D 的跳字 */
.whl-vw{display:inline-flex;align-items:center;gap:3px;padding:0 7px;white-space:nowrap}.whl-vw small{font-size:11.5px}
.whl-top>button{flex:none}
@media(max-width:359px){.whl-vw small{display:none}}
.whl-3d{display:none;position:sticky;top:0;flex:1 1 100%;align-self:stretch;min-width:0;height:100%;overflow:hidden}
#whlOv.v3 .whl-3d{display:block}#whlOv.v3 .whl-bd{display:none}
#whlOv.v3 .whl-ths{padding-top:3px}#whlOv.v3 .whl-tb{min-height:32px;padding:2px 6px}#whlOv.v3 .whl-mini{width:auto}#whlOv.v3 .whl-mini svg,#whlOv.v3 .whl-hp{display:none}#whlOv.v3 .whl-no{position:static;display:block}#whlOv.v3 .whl-ti{justify-content:center}
#whlOv .whl-3d .pzoom,#whlOv .whl-3d .gpad,#whlOv .whl-3d .pkview,#whlOv .whl-3d .pk2d,#whlOv .whl-3d .pk2d-tip,#whlOv .whl-3d .gs-ui,#whlOv .whl-3d .gs-pop,#whlOv .whl-3d .un-ui,#whlOv .whl-3d .tele-ui,#whlOv .whl-3d .pkname{display:none!important}
#whlOv .whl-3d .park3d{border-radius:0!important}
#whl3Ov{position:fixed;inset:0;z-index:9001;pointer-events:none;overflow:hidden;font-family:var(--serif)}.pk-veil #whl3Ov{visibility:hidden}
#whl3Ov .bt-mk.gt{font-size:clamp(8px,calc(var(--c)*.34),11px);line-height:1.08;padding:1px 3px;width:1.7em;box-sizing:content-box;white-space:normal;text-align:center;border-radius:6px}
.whl-sb{position:absolute;left:0;top:0;pointer-events:auto;display:inline-flex;align-items:center;gap:4px;font:inherit;font-size:12px;font-weight:800;color:#f1e7cf;background:rgba(10,10,30,.86);border:1.5px solid rgba(255,255,255,.4);border-radius:99px;padding:0 9px 0 3px;min-height:30px;white-space:nowrap;cursor:pointer;touch-action:manipulation}
.whl-sb>b{width:20px;height:20px;border-radius:50%;background:#2a2450;border:1px solid rgba(255,255,255,.55);color:#fff;font-size:12px;line-height:20px;text-align:center}
.whl-sb.me{border-color:#FFE08A;color:#ffd36a}.whl-sb.think{border-style:dashed}.whl-sb.done{opacity:.85}.whl-sb.w{color:#9fffb0}.whl-sb.l{color:#ff9a8a}.whl-sb.hot{border-color:#ff5a4a;animation:whlHot 1.1s ease-in-out infinite}
.whl-sb .whl-dg,.whl-sb .whl-sl{position:static}
#whl3Ov .whl-fl{left:0;top:0}
#whlViewM{position:fixed;z-index:9300;top:calc(env(safe-area-inset-top,0px) + 44px);right:calc(6px + env(safe-area-inset-right,0px));width:min(250px,80vw);box-sizing:border-box;background:rgba(10,10,30,.96);border:1px solid #E8C77A;border-radius:12px;padding:6px;color:#f1e7cf;font-family:var(--serif);box-shadow:0 8px 20px rgba(0,0,0,.5)}
#whlViewM button{display:flex;width:100%;align-items:center;gap:8px;font:inherit;font-size:14px;color:inherit;background:transparent;border:0;border-radius:8px;padding:8px;min-height:44px;text-align:left;cursor:pointer}
#whlViewM button.on{background:rgba(255,224,138,.16);color:#FFE08A;font-weight:700}#whlViewM button small{margin-left:auto;font-size:11.5px;color:#c9bfe8;font-weight:400}
@media (prefers-reduced-motion:reduce){.whl-sb.hot{animation:none}}
@media (prefers-reduced-motion:reduce){.whl-bd.hop,.whl-mk.tg,.whl-fl,.whl-tb.hot,.whl-al{animation:none}.whl-fl{display:none}}`;document.head.append(s)}
function whlShow(){if(typeof document==="undefined")return;whlCss();let ov=document.getElementById("whlOv");
  if(!ov){ov=document.createElement("div");ov.id="whlOv";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","車輪戰");
    ov.innerHTML=`<div class="whl-top"><b>車輪戰</b><span class="whl-sc" title="比數"></span><span class="whl-rd"></span><button type="button" class="whl-vw" data-x="view" aria-label="視角"></button><button type="button" data-x="set" aria-label="設定">⚙</button><button type="button" data-x="quit" aria-label="離開">✕</button></div>
      <div class="whl-ths" role="tablist" aria-label="各盤"></div><div class="whl-en"></div><div class="whl-bw"><div class="whl-bd"><div class="whl-mks"></div></div><div class="whl-3d"></div></div><div class="whl-msg" aria-live="polite"></div><div class="whl-me"></div>`;
    document.body.append(ov);WHL_BD=Board(sq=>whlTap(sq));const bd=ov.querySelector(".whl-bd");bd.insertBefore(WHL_BD.svg,bd.firstChild);
    ov.addEventListener("click",whlClick);addEventListener("resize",whlFit);addEventListener("hashchange",whlHide)}
  WHL_LIVE=true;WHL_HK="";whlFit();whlVwUi();whlPaint();whlPump();if(whlVw()!=="flat")whl3dOpen()}   /* 11/15：上次選了 3D 視角就接著開 3D（開不起來退回平面） */
function whlHide(e){WHL_LIVE=false;WHL_HOP++;WHL_TG=null;WHL_SEL=-1;try{whl3dClose(e&&e.type==="hashchange"?2:1)}catch(x){}   /* 11/15：3D 實例、簡化棋盤、記號層一起拆；不是換頁造成的離開，叫底下的對局頁重畫（它的 3D 在車輪戰期間被收掉了） */if(typeof document==="undefined")return;const ov=document.getElementById("whlOv");if(ov)ov.remove();WHL_BD=null;removeEventListener("resize",whlFit);removeEventListener("hashchange",whlHide)}
/* 棋盤照剩下的空間放到最大（560×620 比例） */
function whlFit(){const ov=document.getElementById("whlOv");if(!ov)return;const bw=ov.querySelector(".whl-bw"),bd=ov.querySelector(".whl-bd");if(!bw||!bd)return;const W=bw.clientWidth-8,H=bw.clientHeight-4;if(W<=0||H<=0)return;
  const s=Math.min(W/560,H/620);bd.style.width=Math.floor(560*s)+"px";bd.style.height=Math.floor(620*s)+"px"}
const whlPct=(a,b)=>Math.max(0,Math.min(100,Math.round(a/Math.max(1,b)*100)));
const WHL_ST={me:"輪到我",think:"思考中",wait:"已走",done:"已結束"};
/* 危險預警的字：縮圖角標一個字（形狀、顏色、字都不一樣，不只靠紅色）、提示用短句 */
const WHL_DG={core:["危","星核危急"],chk:["將","被將軍"],inv:["侵","入侵卒要扣血"],gate:["門","援軍將至"]};
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
  if(WHL.sealed(M,i))return"這盤封招一輪";return`輪到你・第 ${i+1} 盤`}
/* 「先救」鈕：別的盤有立即危險、比現在這盤嚴重才出現（盤號＋一句），點了切過去 */
function whlAlert(M,i){const C=whlC(),A=C?WHL.dgAlert(M,i,C):null;if(!A)return"";const t=WHL_DG[A.k][1];
  return`<button type="button" class="whl-al" data-go="${A.i}" aria-label="${esc(`先救第 ${A.i+1} 盤：${t}`)}"><i>${A.i+1}</i><span>${esc(t)}</span></button>`}
function whlPaint(){const M=WHL_M,ov=typeof document!=="undefined"&&document.getElementById("whlOv");if(!M||!ov||!WHL_BD)return;const C=whlC();if(!C)return;if(WHL_CUR>=M.bs.length)WHL_CUR=0;
  const i=WHL_CUR,B=M.bs[i],P=B.P,td=P.td,s=WHL.stOf(M,i),my=s==="me";WHL.sync(M,i);if(!my){WHL_TG=null;WHL_SEL=-1}
  const hk=JSON.stringify([M.id,M.R,i,M.bs.map(x=>[x.P.moves.length,x.P.td.seq,x.acted,x.seal,!!x.P.result]),M.sp,M.sk1,!!M.over,WHL_SEL,WHL_TG&&[WHL_TG.id,WHL_TG.pk,WHL_TG.p],WHL_INFO,WHL_3S]);
  if(hk===WHL_HK)return;WHL_HK=hk;
  const T=WHL.tally(M),ths=ov.querySelector(".whl-ths");
  ov.querySelector(".whl-rd").textContent=`第 ${M.R+1} 輪`;ov.querySelector(".whl-sc").innerHTML=`<span class="a">${T.w}</span>：<span class="b">${T.l}</span>`;
  ths.className="whl-ths n"+M.bs.length;ths.innerHTML=whlThumbs(M);
  const E=td.en,M2=td.me,F=GSV.fore(td),g=GSV.guards(td);let fore="援軍都下來了";if(F.length){const c={};for(const w of F[0].ws){const k=GSV.gateNm(w.sq)+"・"+GSV.PBN[w.p.toUpperCase()];c[k]=(c[k]||0)+1}fore=`下一波 ${F[0].inR} 回合後：`+Object.keys(c).map(k=>k+"×"+c[k]).join("、")}
  ov.querySelector(".whl-en").innerHTML=`<div class="whl-r"><span class="whl-nm en">星樞</span><div class="whl-bar en"><i style="width:${whlPct(E.hp,E.max)}%"></i><b>HP ${Math.max(0,E.hp)}／${E.max}</b></div><span class="whl-sx">DEF <b>${GSV.defOf(td,"b")}</b>${g?`（護陣 +${g*GSV.GUARD}）`:""}</span>${E.sh.v?`<span class="whl-sh">🛡${E.sh.v}</span>`:""}</div>
    <div class="whl-r"><span class="whl-ln">${esc(fore)}</span></div>`;
  const L=my?C.legal(P.board,"r"):[],last=P.moves[P.moves.length-1];
  const bo={last,sel:WHL_SEL,targets:WHL_SEL>=0?L.filter(([f])=>f===WHL_SEL).map(x=>x[1]):[],check:!P.result&&C.inCheck(P.board,P.turn)?C.kingSq(P.board,P.turn):-1,fx:true};WHL_BD.draw(P.board,bo);
  WHL_3O={sel:WHL_SEL,targets:bo.targets};ov.classList.toggle("v3",!!WHL_PK);if(WHL_PK)try{whl3Draw(M,i,bo,s)}catch(e){console.warn("[whl3d]",e)}   /* 11/15 車輪戰 3D：同一個 3D 實例畫目前這盤（換盤直接擺好），另外兩盤交給簡化棋盤 */
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
/* 盤上記號：星門（倒數）、入侵卒（侵）、護陣卒（陣）、這輪會扣的入侵（紅圈）、定身；選目標時是可以點的發光格 */
function whlMarks(M,i){const B=M.bs[i],P=B.P,td=P.td,b=P.board,C=whlC(),L=[],my=WHL.stOf(M,i)==="me";
  for(const g of GSV.fore(td))for(const w of g.ws)L.push({sq:w.sq,k:"gate",t:`門${g.inR}`});
  for(const q in td.ids){const id=td.ids[q],t=GSV.tagOf(td,id),sq=+q;if(t==="inv")L.push({sq,k:"bd "+(td.arm[id]?"arm":"inv"),t:td.arm[id]?"侵!":"侵"});if(t==="guard")L.push({sq,k:"bd guard",t:"陣"})}
  for(const o of td.ctl.frz)if(o.until>td.rnd){const q=GSV.sqOfId(td,o.id);if(q!=null)L.push({sq:q,k:"bd frz",t:"定"})}
  for(const h of GSV.invHits(td))L.push({sq:h.sq,k:"ring"});
  if(WHL_INFO&&C){const R=new Set();for(const[f,t]of C.legal(b,"b"))if(b[t]==="R")R.add(f);for(const q of R)L.push({sq:q,k:"ring ifo"})}
  if(WHL_TG&&C&&my){WHL.sync(M,i);for(const x of GSV.targets(P,WHL_TG.id,WHL_TG.id==="dep"?[WHL_TG.p]:WHL_TG.pk,C))if(typeof x==="number")L.push({sq:x,b:1})}
  return L}
function whlClick(e){const M=WHL_M;if(!M)return;const x=e.target.closest("[data-x]");if(x){const k=x.dataset.x;try{vibrate(5)}catch(z){}
    if(k==="quit"){whlHide();return}if(k==="set"){whlSet();return}if(k==="view"){whlSetView(gsvVwNext(whlVw()));whlViewMenu(true);return}   /* 11/15「👁」：點一下換下一種視角＋小選單（跟星門圍城一樣） */if(k==="cancel"){WHL_TG=null;whlPaint();return}return}
  const tb=e.target.closest(".whl-tb");if(tb){try{vibrate(5)}catch(z){}WHL_HOP++;whlGo(+tb.dataset.i,false);return}
  const al=e.target.closest(".whl-al");if(al){try{vibrate(5)}catch(z){}WHL_HOP++;whlGo(+al.dataset.go,true);return}
  const sb=e.target.closest(".whl-sb");if(sb){try{vibrate(5)}catch(z){}WHL_HOP++;whlGo(+sb.dataset.i,true);return}   /* 11/15 3D：簡化棋盤上的狀態鈕＝換到那一盤 */
  const mk=e.target.closest(".whl-mk.tg,.gsv-mk.tg");if(mk){e.stopPropagation();whlMkClick(+mk.dataset.sq);return}   /* 3D 的目標鈕用星門圍城的 gsv-mk tg */
  const b=e.target.closest(".whl-sk");if(b)whlSkill(b.dataset.k)}
function whlGo(j,anim){const M=WHL_M;if(!M||j<0||j>=M.bs.length||WHL_FLY)return;
  if(j!==WHL_CUR&&whl3Fly(j))return;   /* 11/15 3D：鏡頭先飛到那一張簡化棋盤，飛到了才真的換盤（whlGo2）；平面、減少動態、3D 還沒好＝直接換 */
  whlGo2(j,anim)}
function whlGo2(j,anim){const M=WHL_M;if(!M||j<0||j>=M.bs.length)return;const ch=j!==WHL_CUR;WHL_CUR=j;WHL_SEL=-1;WHL_TG=null;WHL_HK="";
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
function whlTap(sq){const M=WHL_M;if(!M||WHL_TG||WHL_FLY)return;const C=whlC(),i=WHL_CUR,B=M.bs[i],P=B.P,s=WHL.stOf(M,i);
  if(s!=="me"){const w={think:"星樞思考中",wait:"這盤這輪走過了，點上面換盤",done:"這盤已結束"}[s];if(w)toast(w);return}
  const L=C.legal(P.board,"r");
  if(WHL_SEL>=0&&L.some(([f,t])=>f===WHL_SEL&&t===sq)){const f=WHL_SEL,cap=!!P.board[sq];WHL_SEL=-1;const r=WHL.move(M,i,f,sq,C);if(r.err){toast(r.err);whlPaint();return}
    try{if(typeof moveSound==="function")moveSound(cap)}catch(e){}whlSave();whlPaint();whlAfter(i);whlPump();if(M.over)whlEnd();return}
  WHL_SEL=P.board[sq]&&L.some(([f])=>f===sq)?sq:-1;whlPaint()}
function whlSkill(id){const M=WHL_M,i=WHL_CUR,C=whlC(),S=GSV.SKM[id];if(!M||!C||WHL_FLY)return;
  if(S&&S.info){WHL_INFO=!WHL_INFO;whlPaint();return}
  const w=WHL.why(M,i,id,C);if(w){toast("✦ "+w);return}try{vibrate(8)}catch(z){}
  if(WHL_TG&&WHL_TG.id===id){const arm=WHL_TG.arm;WHL_TG=null;if(arm)whlCast(id,[]);else whlPaint();return}
  if(id==="dep"){const B=M.bs[i],ok=[...new Set(B.P.td.res)].filter(p=>GSV.targets(B.P,"dep",[p],C).length);if(!ok.length)return toast("補給點都不能用");
    modal(`<h2 style="font-size:19px">部署後備</h2>`,ok.map(p=>[GSV.PCN[p],()=>{WHL_TG={id:"dep",p,pk:[]};whlPaint()}]).concat([["取消",null,true]]));return}
  if(!S.tg){WHL_TG={id,pk:[],arm:1};whlPaint();toast("✦ "+S.nm+"："+S.d);return}
  WHL_TG={id,pk:[]};whlPaint();toast("🎯 "+S.nm+"："+S.d)}
function whlMkClick(sq){const T=WHL_TG,M=WHL_M,i=WHL_CUR,C=whlC();if(!T||!M||WHL_FLY)return;try{vibrate(8)}catch(z){}T.pk.push(sq);
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
/* 11/15 七星改版：擒子跳字旁的小頭像（07pty ptyAv） */
function whlAv(f,av){if(!av)return;const i=document.createElement("img");i.src=av;i.alt="";i.style.cssText="width:1.5em;height:1.5em;border-radius:50%;object-fit:cover;object-position:50% 12%;vertical-align:middle;margin-right:.2em;background:#2a2450";f.prepend(i)}
function whlFloat(t,sq,cls,av){if(WHL_PK&&whl3Float(t,sq,cls,av))return;   /* 11/15 3D：跳字放在那一格的螢幕位置（park3d screenOf） */const bd=document.querySelector("#whlOv .whl-bd");if(!bd||whlRM())return;const f=document.createElement("div");f.className="whl-fl "+(cls||"");f.textContent=t;whlAv(f,av);
  if(sq!=null){f.style.left=((40+(sq%9)*60)/560*100)+"%";f.style.top=((40+(sq/9|0)*60)/620*100)+"%"}else f.style.top=cls==="dmg"?"12%":"86%";bd.append(f);setTimeout(()=>f.remove(),1400)}
function whlEvents(M,i){const td=M.bs[i].P.td,s0=WHL_EVS[i];WHL_EVS[i]=td.seq;if(s0==null||td.seq<=s0)return;
  td.ev.filter(e=>e.s>s0).forEach((e,k)=>setTimeout(()=>{try{
    if(e.k==="hit"&&e.loss)whlFloat(`−${e.loss}`,null,e.to==="b"?"dmg":"hurt",e.why==="cap"&&typeof ptyAv==="function"?ptyAv(e.to==="b"?e.cp:e.vp):null);else if(e.k==="warn")whlFloat("入侵預告",e.sq,"hurt");else if(e.k==="spawn")whlFloat("援軍",e.sq,"");
    else if(e.k==="guard")whlFloat("拆陣",e.sq,"");else if(e.k==="heal"&&e.n)whlFloat(`+${e.n}`,null,"heal");else if(e.k==="icpt")whlFloat("截援",e.sq,"")}catch(x){}},k*200))}
/* 引擎幫浦：一次只算一盤（WHL.step 管佇列）；算完存檔、重畫，再看下一個 */
async function whlPump(){if(!WHL_LIVE||!WHL_M||WHL_Q.run)return;const C=whlC();if(!C)return;WHL.queue(WHL_Q,WHL_M);if(!WHL_Q.list.length)return;
  const E=typeof XQEngine!=="undefined"&&XQEngine&&XQEngine.search?XQEngine:null,Q=WHL_Q;let r=null;
  try{r=await WHL.step(()=>WHL_M,Q,C,{search:E?(p,l,m)=>E.search(p,l,m):null,tmo:E&&E.ready?WHL.TMO:WHL.TMO0,min:WHL.WAIT,wait:ms=>new Promise(z=>setTimeout(z,ms))})}catch(e){r={err:e}}
  if(r&&r.via==="tmo")try{if(E&&E.abort)E.abort()}catch(e){}
  if(r&&r.ok)whlSave();
  if(r&&r.ok&&r.src!=="eng"&&WHL_LIVE&&typeof DEVMODE==="function"&&DEVMODE())try{console.info("[whl] 星樞用規則評估挑步",r.via,r.src)}catch(e){}
  WHL_HK="";whlPaint();if(WHL_M&&WHL_M.over){whlEnd();return}if(Q===WHL_Q)setTimeout(whlPump,0)}
/* 整場結算一次 */
function whlEnd(){const M=WHL_M;if(!M||!M.over)return;const x=WHL.record(whlProg(),M);x.prog.cur=M;store.set("whl",x.prog);if(!WHL_LIVE||WHL_SEEN===M.id)return;WHL_SEEN=M.id;
  const win=M.over.win,T=WHL.tally(M),res=M.bs.map(B=>whlResTx(B)||"—").join("・");
  setTimeout(()=>{if(!WHL_LIVE)return;try{if(typeof grwArm==="function")grwArm("whl")}catch(e){}/* 11/15 對戰後的角色成長（07grw） */modal(`<div class="em">${win?"✨":"🌀"}</div><h2>${win?"過關":"未過關"}</h2><p class="whl-fin">${T.w}：${T.l}</p><p class="muted">${esc(res)}</p><p class="muted" style="font-size:12px">試玩不給星塵、修為、定軌力</p>`,
    [["再來一場",()=>whlSetup()],["離開",()=>whlHide(),true],["看棋盤",null,true]],"res")},900)}
/* ================= ③ 11/15 車輪戰 3D（開發者：「車輪戰也增加 3D 視角」「可以在黑洞三張大棋盤」→ 選單定案：目前這盤完整 3D 角色，另外兩盤是場景裡的簡化棋盤）=================
   視角：跟星門圍城同一套三種（全局俯視／臨陣斜角／純淨平面，頂欄「👁」點一下換下一種＋小選單）；存檔鍵 whlView 自己記，沒選過＝平面，不跟星門圍城的 gsvView、舊版塔防的 bhtdView 連動。
   3D 實例：車輪戰不在對局頁、不走 06-cpu parkDraw／全域 PARK，自己建一個 XQPark3D 巨盤實例（WHL_PK，掛在 #whlOv 的 .whl-3d），整場就這一個：
     建之前把對局頁的那個收掉（PARK.v.destroy），車輪戰 3D 開著的期間 parkDraw 不建新的（06-cpu 問 whl3dOn）；離開時拆掉自己的，再叫底下的對局頁重畫。
   目前這盤：照黑洞星樞棋局的參數畫（塔防固定鏡頭、頭頂漢字牌、光環、拖曳繞整球、兩指縮放都是 park3d 現成的）；換盤時 draw 帶 ex.bkey，park3d 不比對上一盤、整盤直接擺好。
   另外兩盤：whlSideKit 在同一個場景裡加兩張半尺寸的簡化棋盤，並排在主盤遠端（星樞那一側）後面，跟主盤同寬對齊成「品」字（直拿手機只有上方有空間；同一個平面，不擋主盤；繞整球時三張一起轉）：
     棋盤板借主盤的幾何與材質，棋子是平躺的圓牌——每盤一個合批的網格、全部共用一張 512 圖集（紅 7 黑 7 個字），不載角色模型。自己建的資源只有 6 個（圖集、圓牌材質、框線幾何、框線材質、兩盤各一個圓牌幾何），離開時全部 dispose。
     上面的狀態（輪到我／思考中／已走／勝敗和、最嚴重的危險角標、封招）是疊在畫面上的鈕（.whl-sb），資料跟縮圖同一份；點鈕或點那張棋盤＝換到那一盤。
   換盤：鏡頭飛到那張簡化棋盤（一邊拉近到跟主盤一樣大），到了才換內容——主盤擺成那一盤的完整角色、原本那盤變成簡化棋盤。減少動態、平面視角直接換。
   盤上記號：whlMarks → 星門圍城的 gsvMk3／gsvMkKind／gsvPos3（貼地、直立、頭頂），貼地矩陣 07bht bhtdGnd（座標給自己的 screenOf）。
   3D 開不起來（裝置不支援、載入失敗、20 秒沒好）：視角存回平面，照平面下。測試 xiangqi-lab/tools/test-wheel-3d.js（DOM、three、park3d 都是假的；3D 畫面要實機看）。 */
const WHL_AT={px:512,n:4,ord:"KABNRCP"},WHL_SS=.47,WHL_SGAP=.9,WHL_3MS=460;   /* 圖集 4×4 格；簡化棋盤的大小（主盤的幾倍）、跟主盤隔幾格；鏡頭飛過去的毫秒數 */
const whlVw=()=>{let v="flat",f=false;try{v=store.get("whlView","flat")}catch(e){}try{f=typeof focusOn==="function"&&!!focusOn()}catch(e){}return typeof gsvVwNorm==="function"?gsvVwNorm(v,f):"flat"};
const whl3Fx=()=>{try{return typeof bhtdFxLv==="function"?bhtdFxLv():2}catch(e){return 2}};
function whl3dOn(){return!!WHL_PK||WHL_3S==="load"}   /* 06-cpu parkDraw 問這裡：車輪戰的 3D 開著（或正在開）＝對局頁先不建 3D */
function whl3Shown(){const pv=WHL_PK;try{return!!(pv&&pv.el&&pv.el.isConnected&&pv.el.style.display!=="none"&&pv.screenOf)}catch(e){return false}}
/* ---------- 純函式（node 測試）---------- */
/* 另外幾盤放哪：三盤＝盤號小的在左、大的在右；兩盤（舊存檔）＝另一盤照盤號放左或右；回 [{i,slot}] */
function whlSlots(n,cur){const o=[];for(let j=0;j<n;j++)if(j!==cur)o.push(j);return o.length===2?[{i:o[0],slot:"L"},{i:o[1],slot:"R"}]:o.length===1?[{i:o[0],slot:o[0]<cur?"L":"R"}]:[]}
/* 另外幾盤的內容與狀態（跟縮圖 whlThumbs 同一份資料：狀態、勝敗和、最嚴重的一個危險、封招） */
function whlSideList(M,cur,C){return whlSlots(M.bs.length,cur).map(x=>{const B=M.bs[x.i],s=WHL.stOf(M,x.i),r=whlResTx(B),D=C?WHL.danger(M,x.i,C)[0]:null;
  return{i:x.i,slot:x.slot,key:"whl:"+M.id+":"+x.i,board:B.P.board,st:s,res:r,lab:s==="done"?(r||"—"):WHL_ST[s],dg:D&&WHL_DG[D.k]?D.k:"",hot:!!(D&&D.rank>=WHL.DG_HOT),seal:!!(WHL.sealed(M,x.i)&&s!=="done")}})}
/* 簡化棋盤在場景裡的位置（主盤在原點、寬 BW×gs、深 BH×gs；bpY＝盤面高度）：縮成 WHL_SS 倍，左右各一張貼齊主盤兩邊，放在主盤遠端後面隔 WHL_SGAP 格 */
function whlSidePos(slot,gs,BW,BH,bpY){const s=WHL_SS,w=BW*gs,d=BH*gs;return{s,x:(slot==="L"?-1:1)*w*.265,y:bpY*(1-s),z:-(d/2+WHL_SGAP*gs+d*s/2)}}
/* 圖集第幾格：紅方 帥仕相傌俥炮兵 0～6、黑方 8～14 */
function whlAtlasCell(p){const K=String(p||"").toUpperCase(),k=K?WHL_AT.ord.indexOf(K):-1;if(k<0)return null;const idx=k+(p===K?0:8);return{c:idx%WHL_AT.n,r:idx/WHL_AT.n|0}}
function whlAtlasDraw(x,px){const n=px/WHL_AT.n;for(const red of[true,false])for(let k=0;k<7;k++){const idx=k+(red?0:8),cx=(idx%WHL_AT.n+.5)*n,cy=((idx/WHL_AT.n|0)+.5)*n,ch=(red?GSV.PCN:GSV.PBN)[WHL_AT.ord[k]];
  x.beginPath();x.arc(cx,cy,n*.45,0,Math.PI*2);x.fillStyle=red?"#FFF3DC":"#141A3C";x.fill();x.lineWidth=n*.07;x.strokeStyle=red?"#C8102E":"#E9C46A";x.stroke();
  x.font="900 "+Math.round(n*.6)+'px "Noto Serif TC","Songti TC",serif';x.textAlign="center";x.textBaseline="middle";x.fillStyle=red?"#B3121F":"#FFE6A3";x.fillText(ch,cx,cy+n*.04)}}
/* 一盤的圓牌：每顆子一塊平躺的四邊形（最多 32 顆），位置照主盤同一套格子座標（格距 gs），貼圖座標指到圖集那一格；回 {n,pos,uv,cells} */
function whlSideQuads(board,gs,y){const pos=new Float32Array(32*12),uv=new Float32Array(32*8),h=.43*gs,N=WHL_AT.n,cells=[];let n=0;
  for(let q=0;q<90&&n<32;q++){const p=board[q],c=p&&whlAtlasCell(p);if(!c)continue;const x=(q%9-4)*gs,z=((q/9|0)-4.5)*gs,u0=c.c/N,u1=(c.c+1)/N,v1=1-c.r/N,v0=1-(c.r+1)/N;
    pos.set([x-h,y,z+h,x+h,y,z+h,x+h,y,z-h,x-h,y,z-h],n*12);uv.set([u0,v0,u1,v0,u1,v1,u0,v1],n*8);cells.push({sq:q,p,c:c.c,r:c.r});n++}return{n,pos,uv,cells}}
/* 3D 區上面留多少給那兩張簡化棋盤（px）：寬度夠就整張露出來（主盤高度的 .47 倍），矮的螢幕主盤至少留 86% 寬或 80% 高，剩下的給它們（露一截） */
function whlPadTop(W,H){if(!(W>0&&H>40))return 16;const full=Math.min(W,(H-4)/1.47),m=Math.max(full,Math.min(W*.86,(H-4)*.8));return Math.max(16,Math.round(Math.min(H-4-m,m*.47)))}
/* 鏡頭飛到簡化棋盤：u 0→1；cp＝塔防鏡頭這一格原本的位置（看著主盤中心 (0,top,0)）；看的點移到那張盤的中心，鏡頭到看的點的距離縮成那張盤的倍數（到了剛好跟主盤一樣大） */
function whlFlyAt(u,cp,P,top){u=Math.max(0,Math.min(1,u));const e=u*u*(3-2*u),k=1+(P.s-1)*e,lx=P.x*e,lz=P.z*e;return{px:lx+cp.x*k,py:top+(cp.y-top)*k,pz:lz+cp.z*k,lx,ly:top,lz}}
/* 點在凸四邊形裡；點到哪一張簡化棋盤（main＝主盤四角的螢幕座標，往外放大一成算主盤的，不搶主盤的點擊）；回盤號或 -1 */
function whlInQuad(p,q){let s=0;for(let k=0;k<4;k++){const a=q[k],b=q[(k+1)%4],c=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);if(!c)continue;if(s&&(c>0)!==(s>0))return false;s=c}return true}
function whlHitSide(p,main,sides){if(main&&main.length===4){let cx=0,cy=0;for(const v of main){cx+=v.x/4;cy+=v.y/4}if(whlInQuad(p,main.map(v=>({x:cx+(v.x-cx)*1.1,y:cy+(v.y-cy)*1.1}))))return-1}
  for(const s of sides||[])if(s&&s.q&&s.q.length===4&&whlInQuad(p,s.q))return s.i;return-1}
/* 簡化棋盤上的狀態鈕：放在那張盤的正中（河界上，棋子最少；斜角時太靠主盤會蓋到主盤後排的字牌）；矮螢幕上半張被切掉時夾回 3D 區裡，一定看得到 */
function whlSbAt(Q,R){let x=Q.n.x+(Q.c.x-Q.n.x)*.5,y=Q.n.y+(Q.c.y-Q.n.y)*.5;if(R){x=Math.max(R.left+48,Math.min(R.right-48,x));y=Math.max(R.top+18,Math.min(R.bottom-18,y))}return{x,y}}
function whlSbHTML(s){const dg=s.dg&&WHL_DG[s.dg];return`<button type="button" class="whl-sb ${s.st}${s.res==="勝"?" w":s.res==="敗"?" l":""}${s.hot?" hot":""}" data-i="${s.i}" data-slot="${s.slot}" aria-label="${esc(`換到第 ${s.i+1} 盤，${s.st==="done"?"已結束・"+s.lab:s.lab}${dg?"，"+dg[1]:""}${s.seal?"，封招":""}`)}"><b>${s.i+1}</b><span>${esc(s.lab)}</span>${dg?`<i class="whl-dg ${s.dg}">${dg[0]}</i>`:""}${s.seal?`<i class="whl-sl">封</i>`:""}</button>`}
/* 3D 記號：whlMarks 的格式換成星門圍城那一套（可點的目標補上類名 tg；星門的「門N」拆成圈＋直立的「門 N」） */
function whl3Marks(M,i){return whlMarks(M,i).map(m=>m.b?{sq:m.sq,k:"tg",b:1}:m.k==="gate"?{sq:m.sq,k:"gate",t:String(m.t||"").replace(/^門(\d+)$/,"門<i>$1</i>")}:m)}
/* 畫目前這盤要給 park3d 的參數（照 07bh bhParkEx＋06-cpu parkDraw 給黑洞星樞棋局的那一份）：gid／start＝被吃子照這盤算；bkey＝哪一盤（換了就直接擺好）；結果不傳（換盤看下完的盤不重播勝負動作） */
function whl3Ex(key,cam,P,s){let look=null,ml=null,bs=null;try{look=typeof parkLook==="function"?parkLook():null}catch(e){}try{ml=typeof myLook==="function"?myLook():null}catch(e){}try{bs=typeof bhStarsEx==="function"?bhStarsEx():null}catch(e){}
  return{giant:true,bg:"data/park/bh_far2.webp",bhStars:bs,era:"classic",quietMate:true,watchers:[],oppHello:null,opp:null,mateLook:ml,crowd:WHL_CROWD,look,blitz:false,bhBoss:null,tdCam:cam==="tilt"?"tilt":"top",tdFx:whl3Fx(),gid:key,start:P.start||null,bkey:key,thinking:s==="think",botSide:"b",result:null}}
/* ---------- 另外兩張簡化棋盤（A＝park3d fxApi()：three、場景、鏡頭、主盤的網格、每格繪製前的掛勾）---------- */
function whlSideKit(A,doc){const T=A.T,sc=A.scene,bp=A.board,own=[],G={},BW=bp.geometry.parameters.width,BH=bp.geometry.parameters.height,V=new T.Vector3();let tex=null,mat=null,fgeo=null,fmat=null,unhook=null,FLY=null;
  doc=doc||document;const keep=x=>{own.push(x);return x};
  const res=()=>{if(tex)return;const c=doc.createElement("canvas");c.width=c.height=WHL_AT.px;whlAtlasDraw(c.getContext("2d"),WHL_AT.px);tex=keep(new T.CanvasTexture(c));if("colorSpace"in tex&&T.SRGBColorSpace)tex.colorSpace=T.SRGBColorSpace;
    mat=keep(new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false}));const hx=BW/2,hz=BH/2;
    fgeo=keep(new T.BufferGeometry());fgeo.setAttribute("position",new T.Float32BufferAttribute([-hx,.02,-hz,hx,.02,-hz,hx,.02,-hz,hx,.02,hz,hx,.02,hz,-hx,.02,hz,-hx,.02,hz,-hx,.02,-hz],3));
    fmat=keep(new T.LineBasicMaterial({color:0xFFD98A,transparent:true,opacity:.85,toneMapped:false}))};
  const mk=slot=>{res();const g=new T.Group(),gs=A.gs(),P=whlSidePos(slot,gs,BW,BH,bp.position.y);g.userData.giant=1;g.position.set(P.x,P.y,P.z);g.scale.setScalar(P.s);   /* giant：park3d 每格會把場景裡不認得的東西藏起來 */
    const bd=new T.Mesh(bp.geometry,bp.material);bd.rotation.copy(bp.rotation);bd.scale.copy(bp.scale);bd.position.copy(bp.position);   /* 棋盤板：借主盤的幾何和材質（半透明星石盤、同一張棋盤貼圖），不另外占記憶體 */
    const fr=new T.LineSegments(fgeo,fmat);fr.position.y=bp.position.y;fr.scale.set(gs,1,gs);
    const geo=keep(new T.BufferGeometry());geo.setAttribute("position",new T.BufferAttribute(new Float32Array(32*12),3));geo.setAttribute("uv",new T.BufferAttribute(new Float32Array(32*8),2));
    const ix=[];for(let k=0;k<32;k++)ix.push(k*4,k*4+1,k*4+2,k*4,k*4+2,k*4+3);geo.setIndex(ix);geo.setDrawRange(0,0);
    const pc=new T.Mesh(geo,mat);pc.renderOrder=2;pc.frustumCulled=false;g.add(bd,fr,pc);sc.add(g);return G[slot]={g,geo,key:"",i:-1,P}};
  const drop=slot=>{const o=G[slot];if(!o)return;sc.remove(o.g);const k=own.indexOf(o.geo);if(k>=0)own.splice(k,1);try{o.geo.dispose()}catch(e){}delete G[slot]};
  function set(list){const want={};for(const s of list||[])want[s.slot]=s;for(const k of Object.keys(G))if(!want[k])drop(k);
    for(const k in want){const s=want[k],o=G[k]||mk(k),key=s.key+"|"+s.board.join(",");o.i=s.i;if(key===o.key)continue;o.key=key;const Q=whlSideQuads(s.board,A.gs(),bp.position.y+.04),at=o.geo.attributes;
      at.position.array.set(Q.pos);at.uv.array.set(Q.uv);at.position.needsUpdate=true;at.uv.needsUpdate=true;o.geo.setDrawRange(0,Q.n*6);o.n=Q.n}
    try{A.poke(400)}catch(e){}}
  const scr=(x,y,z)=>{V.set(x,y,z).project(A.camera);if(!(V.z<1)||!isFinite(V.x)||!isFinite(V.y))return null;const r=A.el.getBoundingClientRect();return r.width?{x:r.left+(V.x+1)/2*r.width,y:r.top+(1-V.y)/2*r.height}:null};
  /* 那張盤在畫面上的位置：c＝中心、n＝靠主盤那一邊的中點、q＝四個角（遠左、遠右、近右、近左）；轉到盤底、跑到鏡頭後面＝null */
  function quad(slot){const o=G[slot];if(!o)return null;try{if(A.view&&A.view().under)return null}catch(e){}const P=o.P,gs=A.gs(),hw=BW*gs*P.s/2,hd=BH*gs*P.s/2,y=bp.position.y;
    const c=scr(P.x,y,P.z),n=scr(P.x,y,P.z+hd),q=[scr(P.x-hw,y,P.z-hd),scr(P.x+hw,y,P.z-hd),scr(P.x+hw,y,P.z+hd),scr(P.x-hw,y,P.z+hd)];return c&&n&&q.every(Boolean)?{c,n,q}:null}
  const slotOf=i=>{for(const k in G)if(G[k].i===i)return k;return null};
  /* 鏡頭飛過去：park3d 每格照塔防鏡頭擺好之後、畫之前（掛勾 "main"）把鏡頭挪到路上那一點；到了先停在終點，下一格之前叫 done（換內容），換完才把鏡頭還給 park3d，中間不會閃一格舊畫面 */
  function fly(i,ms,done){const slot=slotOf(i);if(!slot||FLY)return false;FLY={P:G[slot].P,t0:Date.now(),ms:Math.max(1,ms),done,fin:0};try{A.poke(ms+400)}catch(e){}return true}
  const onMain=k=>{if(k!=="main"||!FLY)return;const F=FLY,u=Math.min(1,(Date.now()-F.t0)/F.ms),cam=A.camera,c=whlFlyAt(u,cam.position,F.P,A.top);cam.position.set(c.px,c.py,c.pz);cam.lookAt(V.set(c.lx,c.ly,c.lz));try{A.poke(200)}catch(e){}
    if(u>=1&&!F.fin){F.fin=1;setTimeout(()=>{try{F.done&&F.done()}catch(e){}if(FLY===F)FLY=null},0)}};
  try{unhook=A.hook(onMain)}catch(e){unhook=null}
  function dispose(){FLY=null;if(unhook){try{unhook()}catch(e){}unhook=null}for(const k of Object.keys(G)){sc.remove(G[k].g);delete G[k]}for(const x of own.splice(0))try{x.dispose()}catch(e){}tex=mat=fgeo=fmat=null}
  return{set,quad,slotOf,fly,flyStop(){FLY=null},flying:()=>!!FLY,dispose,stat:()=>({groups:Object.keys(G).length,own:own.length,hook:unhook?1:0})}}
/* ---------- 視角鈕 ---------- */
function whlVwUi(){if(typeof document==="undefined"||typeof BHTD_VW==="undefined")return;const b=document.querySelector("#whlOv .whl-vw");if(!b)return;const v=whlVw();if(b.dataset.v===v)return;b.dataset.v=v;
  b.innerHTML=`<span aria-hidden="true">👁</span><small>${BHTD_VW[v]}</small>`;b.setAttribute("aria-label","視角："+BHTD_VW[v]+"（點一下換下一種）");b.title="視角："+BHTD_VW[v]}
function whlSetView(v){if(typeof gsvVwOk!=="function"||!gsvVwOk(v)||v===whlVw())return;
  if(v!=="flat")try{if(typeof focusOn==="function"&&focusOn()){const fb=!!store.get("focusBoard",false);if(fb)store.set("focusBoard",false);
      if(focusOn()){if(fb)store.set("focusBoard",true);toast("純淨畫面、螢幕報讀模式用平面棋盤");return}if(typeof focusApply==="function")focusApply()}}catch(e){}   /* 跟星門圍城 gsvSetView 一樣：專注棋盤模式開著又要 3D＝關掉專注模式；純淨畫面、螢幕報讀還開著就不切 */
  try{store.set("whlView",v)}catch(e){}
  if(v==="flat")whl3dClose(0);else if(WHL_PK){try{WHL_PK.setTdCam(v,whl3Fx())}catch(e){}}else whl3dOpen();   /* 回平面＝把 3D 整個拆掉（不留在背景吃記憶體）；兩種 3D 視角之間只換鏡頭 */
  WHL_HK="";whlVwUi();whlPaint()}
function whlViewOut(e){const t=e.target;if(t&&t.closest&&(t.closest("#whlViewM")||t.closest(".whl-vw")))return;whlViewMenu(false)}
function whlViewMenu(show){if(typeof document==="undefined")return;let m=document.getElementById("whlViewM");clearTimeout(WHL_VMT);if(!show){if(m)m.remove();removeEventListener("pointerdown",whlViewOut,true);return}
  if(typeof BHTD_VW==="undefined")return;if(!m){m=document.createElement("div");m.id="whlViewM";m.setAttribute("role","menu");m.setAttribute("aria-label","視角");(document.getElementById("whlOv")||document.body).append(m);
    m.addEventListener("click",e=>{const b=e.target.closest("[data-v]");if(!b)return;e.stopPropagation();try{vibrate(5)}catch(z){}whlSetView(b.dataset.v);whlViewMenu(false)});setTimeout(()=>addEventListener("pointerdown",whlViewOut,true),0)}
  const v=whlVw();m.innerHTML=Object.keys(BHTD_VW).map(k=>`<button type="button" role="menuitemradio" aria-checked="${k===v}" data-v="${k}" class="${k===v?"on":""}">${k===v?"●":"○"} ${BHTD_VW[k]}<small>${BHTD_VWD[k]}</small></button>`).join("");
  WHL_VMT=setTimeout(()=>whlViewMenu(false),6000)}
/* ---------- 開、關 3D ---------- */
function whl3dOpen(){if(WHL_PK||WHL_3S==="load"||typeof document==="undefined")return;const host=document.querySelector("#whlOv .whl-3d");if(!host)return;const tok=++WHL_3TOK;WHL_3S="load";let tm=0;
  const fail=()=>{clearTimeout(tm);if(tok!==WHL_3TOK)return;whl3dClose(0);try{store.set("whlView","flat")}catch(e){}try{toast("這台裝置沒辦法顯示 3D，先用棋盤模式")}catch(e){}WHL_HK="";whlVwUi();whlPaint()};   /* 開不起來：記成平面，照平面下 */
  const go=()=>{clearTimeout(tm);if(tok!==WHL_3TOK)return;if(!WHL_LIVE||whlVw()==="flat"||!host.isConnected){WHL_3S="";return}let pv=null;
    try{if(typeof gsvCss==="function")gsvCss()}catch(e){}   /* 盤上記號用星門圍城（和舊版塔防）的樣式 */
    try{if(typeof PARK!=="undefined"&&PARK&&PARK.v)PARK.v.destroy()}catch(e){}   /* 全場只留一個 3D 實例：對局頁那個先收掉（它的 onDestroy 會把 PARK 清掉） */
    {const ov0=document.getElementById("whlOv");if(ov0)ov0.classList.add("v3")}   /* 先讓 3D 區顯示出來，park3d 建的時候才量得到大小（建不起來 whl3dClose 會拿掉） */
    try{pv=window.XQPark3D.create(host,{giant:true,view:null,intro:null,arena:null,gate:{img:["data/park/blackhole_360.webp"],icon:"🎡",title:"車輪戰",sub:"三張星盤",bg:"#05060d",quiet:true},bg:"data/park/bh_far2.webp",bridge:false,ground:null,era:"classic",indoor:false,
      onTap:q=>{try{whlTap(q)}catch(e){}},onInfo:()=>{},onDestroy:()=>{if(WHL_PK===pv){WHL_PK=null;WHL_3S=""}}})}catch(e){pv=null}
    if(!pv)return fail();WHL_PK=pv;WHL_3S="on";WHL_3USED=true;WHL_3MK="";WHL_3SB="";
    const ov=document.getElementById("whlOv");let o=document.getElementById("whl3Ov");if(!o&&ov){o=document.createElement("div");o.id="whl3Ov";o.innerHTML=`<div class="mks"></div><div class="sbs"></div>`;ov.append(o)}
    host.addEventListener("pointerdown",whl3Down);host.addEventListener("pointerup",whl3Up);
    WHL_HK="";whlPaint();if(!WHL_3RAF&&typeof requestAnimationFrame==="function")WHL_3RAF=requestAnimationFrame(whl3Frame)};
  try{if(typeof window!=="undefined"&&window.XQPark3D)go();else if(typeof parkLoad==="function"){tm=setTimeout(fail,20000);parkLoad().then(()=>{if(!window.XQPark3D)throw new Error("park3d");go()}).catch(fail)}else fail()}catch(e){fail()}}
/* mode：0＝還在車輪戰裡（回平面、開不起來）；1＝離開車輪戰，底下是對局頁就叫它重畫（它的 3D 被收掉了）；2＝換頁造成的離開（新的那一頁自己會畫） */
function whl3dClose(mode){WHL_3TOK++;WHL_FLY=null;const pv=WHL_PK,used=WHL_3USED;WHL_PK=null;WHL_3S="";WHL_3MK="";WHL_3SB="";WHL_3SL=[];WHL_3O=null;WHL_3DN=null;WHL_CROWD=null;if(mode)WHL_3USED=false;
  try{if(WHL_3RAF&&typeof cancelAnimationFrame==="function")cancelAnimationFrame(WHL_3RAF)}catch(e){}WHL_3RAF=0;
  try{if(WHL_SIDE)WHL_SIDE.dispose()}catch(e){}WHL_SIDE=null;try{if(pv)pv.destroy()}catch(e){}
  if(typeof document==="undefined")return;try{whlViewMenu(false)}catch(e){}{const x=document.getElementById("whl3Ov");if(x)x.remove()}
  const ov=document.getElementById("whlOv");if(ov){ov.classList.remove("v3");const h=ov.querySelector(".whl-3d");if(h){h.removeEventListener("pointerdown",whl3Down);h.removeEventListener("pointerup",whl3Up);h.innerHTML=""}}
  try{document.documentElement.classList.remove("pk-veil")}catch(e){}
  if(mode===1&&used)try{if(/^#\/(journey\/play|cpu|arena)/.test(location.hash||"")&&document.getElementById("bbox")&&window.cgPlay&&window.cgPlay.rr)setTimeout(()=>{try{window.cgPlay.rr()}catch(e){}},0)}catch(e){}}
/* ---------- 每次重畫：目前這盤交給 park3d，另外兩盤交給簡化棋盤 ---------- */
function whl3Draw(M,i,bo,s){const pv=WHL_PK;if(!pv)return;const P=M.bs[i].P,key="whl:"+M.id+":"+i,v=whlVw();
  try{const h=pv.el&&pv.el.parentElement;if(h&&pv.setTdPad)pv.setTdPad([M.bs.length>1?whlPadTop(h.clientWidth,h.clientHeight):16,2,4,2])}catch(e){}
  if(!WHL_CROWD&&typeof parkCrowd==="function")try{WHL_CROWD=parkCrowd()}catch(e){}
  pv.draw(P.board,{flip:false,me:"r",last:bo.last,sel:bo.sel,targets:bo.targets,check:bo.check,fx:true},whl3Ex(key,v,P,s));
  if(!WHL_SIDE&&pv.fxApi)try{const A=pv.fxApi();if(A)WHL_SIDE=whlSideKit(A)}catch(e){WHL_SIDE=null}
  WHL_3SL=whlSideList(M,i,whlC());if(WHL_SIDE)WHL_SIDE.set(WHL_3SL);WHL_3MK=""}
/* 每一格：記號、簡化棋盤上的狀態鈕跟著鏡頭走（做法同星門圍城 gsvFrame 的 3D 那一半）；鏡頭在飛、過場中先藏起來 */
function whl3Frame(){WHL_3RAF=0;const M=WHL_M,pv=WHL_PK,o=typeof document!=="undefined"&&document.getElementById("whl3Ov");if(!M||!pv||!o||!WHL_LIVE)return;
  const on=whl3Shown()&&!WHL_FLY&&!(WHL_SIDE&&WHL_SIDE.flying());if((o.style.visibility==="hidden")===on)o.style.visibility=on?"":"hidden";
  if(on)try{whl3Lay(M,pv,o)}catch(e){}
  if((++WHL_3N%45)===0)try{const h=pv.el&&pv.el.parentElement;if(h&&pv.setTdPad&&M.bs.length>1)pv.setTdPad([whlPadTop(h.clientWidth,h.clientHeight),2,4,2])}catch(e){}   /* 轉向、視窗大小變了：重算上面留多少 */
  WHL_3RAF=requestAnimationFrame(whl3Frame)}
function whl3Lay(M,pv,o){const i=WHL_CUR,B=M.bs[i];if(!B)return;const b=B.P.board,xy=q=>pv.screenOf(q),tc=!!(pv.tdCam&&pv.tdCam()),S=WHL_3O||{},box=o.querySelector(".mks"),sbx=o.querySelector(".sbs");
  const L=gsvMk3(whl3Marks(M,i),b,{sel:!B.P.result&&tc&&S.sel>=0?S.sel:-1,targets:S.targets,pnm:tc&&!!pv.headOf}),key=i+"|"+JSON.stringify(L);
  if(key!==WHL_3MK){WHL_3MK=key;box.innerHTML=L.map(m=>{const c=(m.c==="bt"?"bt-mk ":"gsv-mk ")+m.k;return m.b?`<button type="button" class="${c}" data-sq="${m.sq}"${m.h?` tabindex="-1" aria-hidden="true"`:` aria-label="目標 ${m.sq}"`}></button>`:`<div class="${c}" data-sq="${m.sq}">${m.t||""}</div>`}).join("")}
  const a=xy(40),c=xy(41),cell=a&&c?Math.max(18,Math.min(90,Math.hypot(c.x-a.x,c.y-a.y))):36;o.style.setProperty("--c",cell+"px");
  for(const el of box.children){const q=+el.dataset.sq,kd=gsvMkKind(el.className),p=kd==="head"?pv.headOf(q):xy(q);if(!p){el.style.display="none";continue}el.style.display="";
    const Mx=kd==="gnd"&&typeof bhtdGnd==="function"?bhtdGnd(q,p,cell,xy):null,P3=gsvPos3(kd,el.className,p,cell,Mx,pv.headOf&&(el.classList.contains("hit")||el.classList.contains("bd")&&b[q])?pv.headOf(q):null);
    el.classList.toggle("g3",!!P3.m);el.classList.toggle("g3h",!!P3.hd);if(P3.w){el.style.width=P3.w+"px";el.style.height=P3.h+"px"}
    el.style.transform=`translate(${P3.x}px,${P3.y}px)`+(P3.m?` matrix(${P3.m})`:"")+" translate(-50%,-50%)"}
  const sk=JSON.stringify(WHL_3SL.map(s=>[s.i,s.slot,s.st,s.res,s.dg,s.hot,s.seal]));if(sk!==WHL_3SB){WHL_3SB=sk;sbx.innerHTML=WHL_3SL.map(whlSbHTML).join("")}
  let R=null;try{R=pv.el.getBoundingClientRect()}catch(e){}
  for(const el of sbx.children){const Q=WHL_SIDE?WHL_SIDE.quad(el.dataset.slot):null;if(!Q){el.style.display="none";continue}el.style.display="";const p=whlSbAt(Q,R);el.style.transform=`translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-50%)`}}
/* 換盤：先等 park3d 手上的走子、吃子動畫播完（最多 0.9 秒），鏡頭飛過去，到了才 whlGo2；保險：飛太久（分頁在背景、省電停畫）就直接換。回 false＝不用飛（平面、減少動態、3D 還沒好、那一盤不在旁邊） */
function whl3Fly(j){if(!WHL_PK||!WHL_SIDE||WHL_3S!=="on"||whlRM()||!whl3Shown()||WHL_SIDE.slotOf(j)==null)return false;
  const tok=WHL_3TOK,t0=Date.now(),F=WHL_FLY={j};WHL_SEL=-1;WHL_TG=null;WHL_HK="";try{whlPaint()}catch(e){}
  const fin=()=>{if(WHL_FLY!==F)return;WHL_FLY=null;if(tok===WHL_3TOK&&WHL_LIVE)whlGo2(j,false)};
  const start=()=>{if(WHL_FLY!==F)return;if(tok!==WHL_3TOK||!WHL_PK||!WHL_SIDE)return fin();
    if(WHL_PK.busy&&WHL_PK.busy()&&Date.now()-t0<900){setTimeout(start,60);return}
    if(!WHL_SIDE.fly(j,WHL_3MS,fin))return fin();setTimeout(()=>{if(WHL_FLY===F){try{if(WHL_SIDE)WHL_SIDE.flyStop()}catch(e){}fin()}},WHL_3MS+900)};
  start();return true}
/* 點到簡化棋盤（不是拖曳、不是點在主盤附近）＝換到那一盤 */
function whl3Down(e){WHL_3DN={x:e.clientX,y:e.clientY,t:Date.now(),id:e.pointerId}}
function whl3Up(e){const d=WHL_3DN;WHL_3DN=null;if(!d||d.id!==e.pointerId||Date.now()-d.t>700||Math.hypot(e.clientX-d.x,e.clientY-d.y)>10||WHL_FLY||!WHL_M||!WHL_PK||!WHL_SIDE||!whl3Shown())return;
  const pv=WHL_PK,main=[0,8,89,81].map(q=>pv.screenOf(q)),j=whlHitSide({x:e.clientX,y:e.clientY},main.every(Boolean)?main:null,WHL_3SL.map(s=>{const Q=WHL_SIDE.quad(s.slot);return Q?{i:s.i,q:Q.q}:null}));
  if(j>=0){try{vibrate(5)}catch(z){}WHL_HOP++;whlGo(j,true)}}
function whl3Float(t,sq,cls,av){const o=typeof document!=="undefined"&&document.getElementById("whl3Ov"),pv=WHL_PK;if(!o||!pv||!whl3Shown())return false;if(whlRM())return true;let p=null;
  if(sq!=null)p=pv.screenOf(sq);else try{const r=pv.el.getBoundingClientRect();p={x:r.left+r.width/2,y:r.top+r.height*(cls==="dmg"?.12:.86)}}catch(e){}
  if(!p)return true;const f=document.createElement("div");f.className="whl-fl "+(cls||"");f.textContent=t;whlAv(f,av);f.style.left=Math.round(p.x)+"px";f.style.top=Math.round(p.y)+"px";o.append(f);setTimeout(()=>f.remove(),1400);return true}
