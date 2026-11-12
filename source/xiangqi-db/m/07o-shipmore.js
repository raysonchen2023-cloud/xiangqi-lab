/* ================= ♟ 石桌續局（意見回饋 762 第一版，開發者 11/8 定案；規劃 xiangqi-db/story/千秋殘局續闖_規劃.md）=================
   本站 3 題都解開（學會了）以後，千秋殘局頁 #/ship/pz 的三團星光換成「續局」：每站 2 組、每組 3 題（續一＝同難度，續二＝難半階到一階），兩組都解開＝「全譜」，
   全譜以後石桌改成「🎲 隨手一局」（不計點）。續局不是起航條件，也不影響「學會了」（學會照舊只看本站 3 題，07f-ship.js shipMark）。
   開關：SHIP_MORE_ON（false＝第零版：學會了只顯示「✅ 學會了」＋「⛵ 起航」）。
   挑題（shipMorePick）：一盞茶題庫 canju-set.json 有應著樹的題，跳過 cjReserved（輿圖、消寒圖、棋史卡）、這個難度的星槎 3 題／熱身／圖鑑／示範棋局、SHIP_PLAN 在任何難度用到的題、
     珍品藏局的題（relics.json 的 cj，免得先劇透藏局）、解過或看過的題（store "cj" 的 solved、seen）、今天茶單那 3 題、這個難度古戰場配的題、別站續局已經分到的題；
     照 SHIP_MORE_TAG（data/canju/tags.json 的主題標籤；相、仕、帥站放寬成安靜一手、棄子、以少勝多）＞第一步是本命子＞殺法＞難度距離排序，每個玩家照 anonId 打散。
   一組在打開那一刻挑好並存檔，之後換難度、題庫更新都不會變題（換難度只影響還沒打開的組）。
   已分到續局的題由茶單（07c-canju.js cjToday）和千秋穿梭擋寇（07h-qqev.js qqPzPick）跳過（shipMoreIds）；不加進 shipReserved——古戰場 battlePicks 每次照它重算，加進去會讓戰役卡換題。
   存檔 store "shipMore"＝{站:{g:{1:{L:[題號×3],x:[換過一題=1],dn 打開時的難度,at},2:{…}},s:{題號:{at,h 用過提示=1}},r:隨手一局的題號}}（JOURNEY_KEYS 的 m_shipMore）。
   解題頁：#/canju/s/<站>/<題號>（07f-ship.js shipXM 先問 shipMoreXM）；第一次不看答案解開，修為照一盞茶 +5（07c-canju.js finish 給的；不另外加）；隨手一局不給修為、不計點。
   每題可以「🔄 換一題」一次（同主題、低半階的題），不扣東西。 */
const SHIP_MORE_ON=true;
const SHIP_MORE_N=2;
const shipMoreOn=()=>SHIP_MORE_ON===true;
const SHIP_MORE_TAG={classic:["一步"],qin:["首俥","車殺","雙車錯"],han:["首傌","馬殺"],sanguo:["首帥","以少勝多"],weijin:["安靜一手"],nanbei:["安靜一手"],sui:["首兵","兵卒"],
  tang:["棄子"],wudai:["重炮","悶宮","炮殺"],song:["首炮","馬後炮","炮殺"],yuan:["臥槽馬","掛角馬","首傌"],ming:["首帥","以少勝多"],qing:["小兵擒王","首兵"]};
const SHIP_MORE_SAY=["這一站的殘譜還有下一頁，客官要不要再翻翻？","石桌上的刻痕還沒數完呢。","同一招，換個局面再看一次，就是自己的了。","古人也是一盤一盤擺過來的，不急。"];
const SHIP_MORE_ALL="這一站的殘譜，算是補齊了。";
const shipMoreSt=()=>store.get("shipMore",{})||{};
function shipMoreK(k,S){S=S||shipMoreSt();const o=S[k]||{};o.g=o.g||{};o.s=o.s||{};return o}
const shipMoreRec=(k,id)=>(shipMoreK(k).s||{})[id]||null;
const shipMoreGroup=(k,g)=>shipMoreK(k).g[g]||null;
function shipMoreDone(k,g){const G=shipMoreGroup(k,g);return!!(G&&G.L&&G.L.length&&G.L.every(id=>shipMoreRec(k,id)))}
/* 現在該做第幾組（1 起）；0＝全譜了 */
function shipMoreCur(k){for(let g=1;g<=SHIP_MORE_N;g++)if(!shipMoreDone(k,g))return g;return 0}
const shipMoreFull=k=>shipMoreOn()&&shipLearned(k)&&!shipMoreCur(k);
function shipMoreCount(k){let n=0;for(let g=1;g<=SHIP_MORE_N;g++){const G=shipMoreGroup(k,g);if(G&&G.L)n+=G.L.filter(id=>shipMoreRec(k,id)).length}return{n,all:SHIP_MORE_N*SHIP_PER}}
/* 這一題在哪一組：{g,i}；隨手一局＝{r:1} */
function shipMoreHas(k,id){const o=shipMoreK(k);for(const g in o.g){const i=(o.g[g].L||[]).indexOf(id);if(i>=0)return{g:+g,i}}return o.r===id?{r:1}:null}
/* 茶單、擋寇要跳過的題：所有站已分到續局的題（含隨手一局） */
function shipMoreIds(){if(!shipMoreOn())return[];const S=shipMoreSt(),o=[];for(const k in S){const x=shipMoreK(k,S);for(const g in x.g)o.push(...(x.g[g].L||[]));if(x.r)o.push(x.r)}return o}
/* 星槎熱點上的字：續局進度或全譜 */
function shipMoreHs(k){if(!shipMoreOn())return" ✓";if(!shipMoreCur(k))return"・全譜";   /* 熱點上的 emoji 會換成圖示並排成一欄（只放得下開頭那一個），這裡不放 emoji */const c=shipMoreCount(k);return`・續 ${c.n}／${c.all}`}
const shipMoreGold=k=>shipMoreFull(k)?";border-color:#C8962E;box-shadow:0 0 0 2px #C8962E,0 2px 6px rgba(0,0,0,.28)":"";
let SHIP_MORE_TAGS=null;
const shipMoreTags=()=>SHIP_MORE_TAGS||(SHIP_MORE_TAGS=fetch("data/canju/tags.json").then(r=>r.ok?r.json():{tags:{}}).then(T=>T.tags||{}).catch(()=>{SHIP_MORE_TAGS=null;return{}}));
/* 挑題用的池子（跳過的題見檔頭） */
async function shipMorePool(){const D=await cjData();try{await shipBank()}catch(e){}const T=await shipMoreTags(),ex=new Set();const add=a=>{for(const x of a||[])if(x)ex.add(x)};
  try{add(typeof cjReserved==="function"?[...cjReserved()]:[])}catch(e){}try{add(shipReserved(D))}catch(e){}try{add(Object.values((SHIP_BANK&&SHIP_BANK.demo)||{}))}catch(e){}
  try{for(const k in SHIP_PLAN){const Pl=SHIP_PLAN[k];if(typeof Pl.story==="string")ex.add(Pl.story);if(Pl.warm)ex.add(Pl.warm);if(Pl.byDiff&&typeof Pl.byDiff==="object")for(const d in Pl.byDiff)add(Pl.byDiff[d])}}catch(e){}
  try{if(typeof relicsData==="function"){const R=await relicsData();for(const e in R)if(Array.isArray(R[e]))for(const x of R[e])if(x.cj)ex.add(x.cj)}}catch(e){}
  try{const S=cjState();add(Object.keys(S.solved||{}));add(S.seen);if(S.day===cjDay())add((S.list||[]).map(x=>x.id))}catch(e){}
  try{if(typeof battlePicks==="function"){await battlePicks(SHIP_ROUTE[1]);const dn="|"+diffNow();for(const key in BATTLE_PK)if(key.endsWith(dn))add(BATTLE_PK[key])}}catch(e){}
  add(shipMoreIds());try{add(typeof chdHomeIds==="function"?chdHomeIds():[])}catch(e){}   /* 意見回饋 774：故鄉殘譜那一題 */
  return{D,T,pool:D.items.filter(P=>P.tree&&!P.lv&&!ex.has(P.id))}}
/* 難度範圍：續一＝航行難度的 band，續二＝往上半階到一階；sw＝換一題（照原題的 d 往下半階） */
function shipMoreBand(g,d0){if(d0!=null)return[d0-1.2,d0-.2];const[lo,hi0]=diffOf().band,hi=Math.min(hi0,9)+.99;return g===2?[lo+.5,hi+1]:[lo,hi]}
function shipMoreScore(k,P,T,band,seed){const tg=SHIP_MORE_TAG[k]||[],Ls=SHIP_LESSON[k]||{},d=+P.d||0,dist=d<band[0]?band[0]-d:d>band[1]?d-band[1]:0;
  const tp=T[P.id]||[],tag=tp.some(t=>tg.includes(t)&&!/^首/.test(t))?6:tp.some(t=>tg.includes(t))?5:0,pc=shipFirstPiece(P)===(SHIP_PC[shipPiece(k)]||""),kill=(Ls.kill||[]).includes(P.kill);
  return tag+(pc?2:0)+(kill?1:0)-1.5*dist-.3*Math.abs(d-(band[0]+Math.min(band[1],band[0]+4))/2)+cjRand(seed+P.id)()*.8}
/* 星光上的小字：對上的棋理標籤（首傌＝傌的妙著），沒有就寫殺法或題型 */
function shipMoreName(k,P,T){const tg=SHIP_MORE_TAG[k]||[],tp=(T&&T[P.id])||[],a=tp.find(t=>tg.includes(t)&&!/^首/.test(t))||tp.find(t=>tg.includes(t));return a?(/^首/.test(a)?a.slice(1)+"的妙著":a):(P.kill||P.t||"")}
function shipMorePickN(k,pool,T,band,n,seed){return pool.map(P=>[shipMoreScore(k,P,T,band,seed),P]).sort((a,b)=>b[0]-a[0]).slice(0,n).map(x=>x[1])}
/* 打開第 g 組：挑 3 題存起來（已經有了就不動） */
async function shipMoreOpen(k,g){if(shipMoreGroup(k,g))return shipMoreGroup(k,g).L;const{pool,T}=await shipMorePool();if(shipMoreGroup(k,g))return shipMoreGroup(k,g).L;
  const X=typeof chdMorePick==="function"?chdMorePick(k,pool,T,shipMoreBand(g),cjAid()+"|"+k+"|"+g):null;   /* 意見回饋 774 本命絕殺簿（07q-chardiff.js）：前兩題本命殺法題，第 3 題照原本 */
  const L=X?X.L:shipMorePickN(k,pool,T,shipMoreBand(g),SHIP_PER,cjAid()+"|"+k+"|"+g).sort((a,b)=>(+a.d||0)-(+b.d||0)).map(P=>P.id);
  const S=shipMoreSt(),o=S[k]=shipMoreK(k,S);o.g[g]={L,x:L.map(()=>0),dn:diffNow(),at:Date.now()};if(X){o.g[g].bm=X.bm;o.g[g].c=X.c}store.set("shipMore",S);
  if(L.length)try{toast("說書人：「"+SHIP_MORE_SAY[(SHIP_ROUTE.indexOf(k)+g)%SHIP_MORE_SAY.length]+"」")}catch(e){}return L}
/* 換一題（每格一次）：同主題、低半階；解開過的不能換 */
async function shipMoreSwap(k,id){const w=shipMoreHas(k,id);if(!w||w.r)return;const G=shipMoreGroup(k,w.g);if(shipMoreRec(k,id))return toast("這一題已經解開了");if(G.x&&G.x[w.i])return toast("這一格已經換過一次了");
  const{D,pool,T}=await shipMorePool(),P0=D.byId[id]||{},nw=(typeof chdMoreSwap==="function"&&chdMoreSwap(k,G,w.i,pool,T,shipMoreBand(w.g,+P0.d||3),cjAid()+"|sw|"+id))||shipMorePickN(k,pool,T,shipMoreBand(w.g,+P0.d||3),1,cjAid()+"|sw|"+id)[0];if(!nw)return toast("殘譜裡暫時找不到可以換的題");
  const S=shipMoreSt(),o=S[k]=shipMoreK(k,S),g=o.g[w.g];g.L[w.i]=nw.id;g.x=g.x||[];g.x[w.i]=1;store.set("shipMore",S);store.set("cjRunS",null);vibrate(8);toast("🔄 換了一題");
  if(typeof navReplace==="function")navReplace(shipHref(k,nw.id));else location.hash=shipHref(k,nw.id)}
document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("[data-shmswap]");if(!b)return;e.preventDefault();const[k,id]=b.dataset.shmswap.split("|");shipMoreSwap(k,id).catch(()=>toast("題庫載入失敗"))});
/* 全譜以後的隨手一局：同難度、不計點 */
async function shipMoreRandom(k){const{pool,T}=await shipMorePool(),C=shipMorePickN(k,pool,T,shipMoreBand(1),15,cjAid()+"|r|"+Date.now());if(!C.length)return toast("殘譜暫時擺完了，等說書人補新譜");
  const id=C[Math.floor(Math.random()*C.length)].id,S=shipMoreSt(),o=S[k]=shipMoreK(k,S);o.r=id;store.set("shipMore",S);location.hash=shipHref(k,id)}
/* 解開（看答案的不會呼叫）：記下這題和有沒有用提示 */
function shipMoreMark(k,id,o){const w=shipMoreHas(k,id);if(!w||w.r)return{more:1,rnd:1};const full0=!shipMoreCur(k),S=shipMoreSt(),x=S[k]=shipMoreK(k,S),old=x.s[id],h=o&&o.hint?1:0,first=!old;
  if(first)x.s[id]={at:Date.now(),h};else if(old.h&&!h)x.s[id]={at:old.at||Date.now(),h:0,up:Date.now()};store.set("shipMore",S);
  const L=(x.g[w.g]||{}).L||[],n=L.filter(y=>x.s[y]).length;return{more:1,g:w.g,first,h,n,all:L.length,gdone:n>=L.length,fullNew:!full0&&!shipMoreCur(k)}}
const shipMoreDots=(k,L)=>(L||[]).map(id=>{const r=shipMoreRec(k,id);return r?r.h?"◐":"●":"○"}).join("");
function shipMoreDoneHTML(k,o,ans){if(ans||!o)return`<p class="muted">看了答案，這題先不算解開；之後不看答案再解一次就算。</p>`;
  if(o.rnd)return`<div class="card shp-done">🎲 <b>隨手一局</b><br><span class="muted">不計點、不給修為；解過的題，茶單不會再出。</span></div>`;
  const Ls=SHIP_LESSON[k]||{},G=shipMoreGroup(k,o.g)||{},nx=shipSailTo(k);
  return`<div class="card shp-done">♟ <b>${esc(shipShort(k))}・續${CNUM(o.g)}</b>　<span class="shp-dots">${shipMoreDots(k,G.L)}</span>　${o.n}／${o.all}<br><span class="muted">${o.h?"這題用了提示（空心點）；不看提示再解一次，點就會變實心。":"自己解開的（實心點）。"}</span>
    ${o.gdone&&!o.fullNew&&o.g<SHIP_MORE_N?`<p class="shp-say">說書人：「續${CNUM(o.g)}擺完了。石桌上還有一頁，難一點。」</p>`:""}
    ${o.fullNew?`<p class="shp-learn">📜 全譜：${esc(Ls.t||"")}<br><span class="muted">說書人：「${SHIP_MORE_ALL}」${nx?"想往下走，就起航去"+esc(shipShort(nx))+"。":""}</span></p>`:""}</div>`}
/* 解題頁設定（07c-canju.js CanjuPlay 的 XM）；不是續局的題回 null，交回 shipXM */
function shipMoreXM(k,id){if(!shipMoreOn())return null;const w=shipMoreHas(k,id);if(!w)return null;const Ls=SHIP_LESSON[k]||{},T=SHIP_STOP[k]||{};
  const nx=()=>{if(w.r)return null;const G=shipMoreGroup(k,w.g);return((G&&G.L)||[]).find(x=>x!==id&&!shipMoreRec(k,x))||null};
  return{id,rk:"cjRunS",back:()=>"#/ship/pz",top:"⛵ 千秋殘局",icon:"⛵",ans:"看答案這題就不算解開（也沒有修為），確定？",noXP:!!w.r,
    head:P=>{const G=w.r?null:shipMoreGroup(k,w.g),sw=G&&!(G.x||[])[w.i]&&!shipMoreRec(k,id),say=w.r?"":w.i===0?SHIP_MORE_SAY[(SHIP_ROUTE.indexOf(k)+w.g)%SHIP_MORE_SAY.length]:shipSrcLine(P);
      return`<b>⛵ ${esc(shipShort(k))}・${esc(Ls.t||T.place||"")}</b>・${w.r?"🎲 隨手一局（不計點）":`續${CNUM(w.g)}・第 ${w.i+1} 題`}${typeof chdMoreTag==="function"?chdMoreTag(k,w):""}・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span>${sw?`　<button class="lk" data-shmswap="${esc(k)}|${esc(id)}" style="font-size:12.5px;text-decoration:underline">🔄 換一題</button>`:""}${say?`<div class="shp-psay">說書人：「${esc(say)}」</div>`:""}`},
    wrong:()=>"",mark:o=>shipMoreMark(k,id,o),done:(o,ans)=>shipMoreDoneHTML(k,o,ans)+(typeof chdMoreDone==="function"?chdMoreDone(k,id,o,ans):""),
    next:()=>{const x=nx();return x?shipHref(k,x):"#/ship/pz"},nextL:()=>nx()?"下一題":w.r?"♟ 回石桌":"♟ 回石桌看下一組"}}
/* 棋話一頁：續局進度、全譜、解開過的續局題出處 */
function shipMoreLesson(k){if(!shipMoreOn()||!shipLearned(k))return"";const c=shipMoreCount(k),full=!shipMoreCur(k),By=SHIP_BANK&&SHIP_BANK.D&&SHIP_BANK.D.byId,o=shipMoreK(k),src=[];
  for(let g=1;g<=SHIP_MORE_N;g++)for(const id of((o.g[g]||{}).L||[]))if(o.s[id]&&By&&By[id])src.push(cjSrc(By[id]));
  return`<p class="muted shp-pzhint"${full?' style="color:#C8962E;font-weight:700"':""}>${full?"📜 殘譜全":"♟ 石桌續局"}・續局 ${c.n}／${c.all}</p>${src.length?`<p class="muted" style="font-size:12.5px;line-height:1.7;margin:2px 0 0">📜 ${src.join("　")}</p>`:""}`}
/* 千秋殘局頁（07f-ship.js ShipPz）學會以後的畫面：組別小籤疊在圖上、三團星光＝目前那一組、底部「開始下棋／重溫」＋「起航」 */
async function shipMorePz(v,k,Lz,B){const sp=v.querySelector("#pzSpots"),svg=v.querySelector("#pzSvg"),cap=v.querySelector("#pzCap"),hb=v.querySelector(".shp-cap b"),pg=v.querySelector("#pzPage"),go=v.querySelector("#pzGo");if(!pg)return;if(go)go.remove();
  const nxS=shipSailTo(k),Ls=SHIP_LESSON[k]||{},t0=hb?hb.textContent:"",TG=await shipMoreTags();if(!v.isConnected)return;let cg=shipMoreCur(k);
  if(cg&&!shipMoreGroup(k,cg)){cap.textContent="說書人在石桌上擺新的殘譜…";try{await shipMoreOpen(k,cg)}catch(e){}if(!v.isConnected)return;cg=shipMoreCur(k)}
  const bs="pointer-events:auto;width:auto;margin:0;padding:12px 18px;font-size:16px;border-radius:99px;box-shadow:0 4px 16px rgba(0,0,0,.45)";
  const ch=document.createElement("div"),bt=document.createElement("div");ch.className="pz-mch";
  ch.style.cssText="position:absolute;left:0;right:0;top:64px;display:flex;gap:6px;padding:2px 12px;overflow-x:auto;z-index:3;scrollbar-width:none";
  bt.style.cssText="position:absolute;left:0;right:0;bottom:4%;display:flex;justify-content:center;gap:10px;z-index:3;pointer-events:none;padding:0 12px";
  pg.append(ch,bt);let view=cg||"rnd",list=[],cur=-1;
  const chip=(id,txt,on,lock,gold)=>`<button data-mv="${id}"${lock?" disabled":""} style="flex:none;min-height:40px;padding:6px 12px;border-radius:99px;border:1.5px solid ${gold?"#C8962E":"#2a2018"};background:${on?"#B5452B":"rgba(255,251,242,.92)"};color:${on?"#fff":"#2a2018"};font:700 13px/1.2 var(--serif,serif);white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.28);opacity:${lock?0.6:1}">${txt}</button>`;
  const solid=(L,rec)=>L.length&&L.every(id=>{const r=rec(id);return r&&!r.h});
  function render(){const full=!shipMoreCur(k);if(hb)hb.textContent=t0+(full?"・📜 全譜":"・✅ 學會了");
    let h=chip("base","本站 "+Lz.map(id=>{const r=shipRec(k,id);return r?r.h?"◐":"●":"○"}).join(""),view==="base",false,solid(Lz,id=>shipRec(k,id)));
    for(let g=1;g<=SHIP_MORE_N;g++){const G=shipMoreGroup(k,g);h+=G?chip(g,"續"+CNUM(g)+" "+(G.L.length?shipMoreDots(k,G.L):"—"),view===g,false,solid(G.L,id=>shipMoreRec(k,id))):chip(g,"續"+CNUM(g)+" 🔒",false,true)}
    if(full)h+=chip("rnd","🎲 隨手一局",view==="rnd");ch.innerHTML=h;
    ch.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{if(b.disabled)return toast("先把前一組解完，下一組就會打開");vibrate(5);const m=b.dataset.mv;view=m==="base"||m==="rnd"?m:+m;render()});
    const G=typeof view==="number"?shipMoreGroup(k,view):null,rec=view==="base"?id=>shipRec(k,id):id=>shipMoreRec(k,id);list=view==="base"?Lz:G?G.L:[];cur=-1;svg.innerHTML="";
    sp.innerHTML=list.map((id,i)=>{const P=B[id]||{},r=rec(id),[x,y]=SHIP_PZ_SPOT[i]||[50,50],nm=view==="base"?String(shipSlotName(k,i,P)||"").replace(/<[^>]+>/g,""):(typeof chdMoreName==="function"&&chdMoreName(k,view,i,P,TG))||shipMoreName(k,P,TG);
      return`<button class="shp-spot${r?" ok":""}" data-i="${i}" style="left:${x}%;top:${y}%"><b>${r?(r.h?"◐":"●"):"★"} ${view==="base"?"第 "+(i+1)+" 題":"續"+CNUM(view)+"・"+(i+1)}</b><small>${esc(nm)}</small></button>`}).join("");
    cap.textContent=view==="base"?"本站 3 題都解開了・點星光可以重溫":view==="rnd"?"全譜了・想再下就隨手擺一局（不計點）":!list.length?"殘譜暫時擺完了，等說書人補新譜":`續${CNUM(view)}・${view===1?"同難度":"難一點"}・${Ls.t||""}`;
    const todo=list.length&&list.some(id=>!rec(id)),play=view==="rnd"||todo;
    bt.innerHTML=`<button class="btn${play?"":" ghost"}" id="pzMP" style="${bs};${view==="rnd"?"":"display:none"}">${view==="rnd"?"🎲 隨手擺一局":"♟ 開始下棋"}</button><button class="btn${play?" ghost":""}" id="pzSail" style="${bs}">${nxS?"⛵ 起航去"+esc(shipShort(nxS)):"‹ 回星槎"}</button>`;
    const mp=bt.querySelector("#pzMP");
    const pick=i=>{cur=i;const id=list[i],P=B[id]||{},r=rec(id);svg.style.opacity=0;setTimeout(()=>{svg.innerHTML=pzSvg(P.fen);svg.style.opacity=1},160);sp.querySelectorAll(".shp-spot").forEach(b=>b.classList.toggle("sel",+b.dataset.i===i));
      cap.textContent=`${view==="base"?"第 "+(i+1)+" 題":"續"+CNUM(view)+"・第 "+(i+1)+" 題"}・${String(P.task||P.t||"").split("：")[0]}${P.side==="b"?"・黑方先走":"・紅方先走"}`;mp.style.display="";mp.textContent=r?`♟ 重溫第 ${i+1} 題`:"♟ 開始下棋"};
    sp.querySelectorAll(".shp-spot").forEach(b=>b.onclick=()=>{vibrate(5);pick(+b.dataset.i)});
    mp.onclick=()=>{vibrate(8);if(view==="rnd")return shipMoreRandom(k).catch(()=>toast("題庫載入失敗"));if(cur<0)return;pg.classList.add("zoom");setTimeout(()=>{location.hash=shipHref(k,list[cur])},430)};
    bt.querySelector("#pzSail").onclick=()=>{vibrate(8);location.hash=nxS?"#/ship/sail":"#/adventure"};
    if(typeof view==="number"&&todo)pick(list.findIndex(id=>!rec(id)))}
  render()}
