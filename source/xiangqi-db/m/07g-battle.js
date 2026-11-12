/* ================= ⚔ 古戰場・戰役題卡＋朝代戰役地圖（意見回饋 725 方案 A＋B，開發者 11/7 選定；方案在 story/經典戰役玩法方案_725_v2.md）=================
   渡口頁「擂台」旁多一扇門「⚔ 古戰場」→ #/battle：上方是那一朝的疆域地圖（data/eramap/<朝代>.webp＋realms.json 疆域＋labels.json 地名），5 場戰役照經緯度標在實際地點，
   照年代連成一條戰役路線（打下一場，路線延伸到下一場；已蓋印的點變實心印）；下方是 5 張戰役卡。跟渡口同樣的鎖定規則（停靠過的朝代才進得來）；船艙沒有古戰場。
   卡片資料 data/canju/battles.json（tools/battles_build.js 從 story/battles_list.json＋battles_geo.json 產生：12 朝 × 5 場；eras＝{朝代:[卡]}，lessons＝{道理:標籤組}，holds／odds＝玩法模板的設定）。
   配圖 data/battles/<id>.webp（4:3），沒有圖時顯示渡口圖淡墨底＋戰役名。
   路線順序：照年代一場一場打（第 i 場要先打下第 i−1 場；方案 A 時期不照順序蓋過的印照樣算，那一場的下一場也會開）。
   三種玩法（卡片的 play）：
     沒有 play＝殘局題（方案 A）：#/canju/b/<朝代>/<第幾張>（07c-canju.js 的解題畫面，07e-garden2.js 的 cjXMode 轉過來；不算茶單）。
       題目照航行難度（DIFF.band）從題庫挑「標籤對得上那張卡的道理」的題（data/canju/tags.json），12 朝一起挑、盡量不重複，不碰茶單保留題和星槎的題；挑不到退回那一朝的千秋殘局題。
     play.t＝hold（守城撐 N 步）：#/battle/<朝代>/<第幾張> → 07-legend.js jLevel 跑星槎小關同一種 relay 自由段：敵軍先動，你走滿 N 步，不被將死、仕相一顆都不能丟（holds 的局面、N、電腦等級照航行難度）。進度存 jRunB。
     play.t＝odds（讓子對弈）：#/battle/<朝代>/<第幾張> 說明頁 → jStart 開整盤對弈（journey＝bt:<朝代>:<第幾張>），你執紅先拿掉幾顆子（兵少的一方），贏了才蓋印；結果視窗在 08b-cpugame.js 轉給 battleResultModal。
   存檔（舊版，11/8 前）：battleSeal＝{朝代:{第幾張:{at,h,id}}}（不看答案打下來就蓋戰役印；h＝用過提示）——現在改照戰役 id 記，見下面意見回饋 767 那段；battleTitle＝{朝代:時間}（一朝 5 場集滿：稱號「〇・百戰之將」＋那一朝一件珍品，用 07c-canju.js 的 cjRelic）；
   battleSeen＝{朝代:路線畫到第幾場}（只在這台裝置，用來播「路線延伸」的動畫）。
   意見回饋 767（開發者 11/8 定案）：每朝 25 場照年份排、每 5 場一卷，資料改讀 data/canju/battles2.json（舊的 battles.json 留給還沒更新的舊程式）。
     存檔改成照戰役 id 記：battleSeal＝{朝代:{戰役id:{at,h,id,c}}}（id＝題目，c＝戰役 id）；battlePlan＝{朝代:{戰役id:…}}。舊存檔（照第幾張記）由 battleMig 搬一次：
     舊的第 i 張一定是「朝代_(i+1)」，照這張表換成 id；舊資料先整份備份到 battleSeal0；記號 battleMig＝{v:2,at}。之後只要看到數字 key（例如雲端還原了舊備份、舊程式又蓋了印）就再搬一次，結果一樣。
     開卷：前一卷打下 3 場（前一卷還沒上線滿 3 場就要全部），或這一卷已經有印；卷內照年份一場一場打。
     集滿：每卷 5 場都上線而且都打下 → battleVolY＝{朝代:{卷:時間}}，修為 +30＋珍品；舊版已經領過的次數記在 battleVolLegacy＝{朝代:{n,used}}，先拿來抵（不重複領），抵完才發。
     第一次集滿任何一卷：稱號「〇・百戰之將」（battleTitle，舊版拿到的照留）；一朝 25 場全部打下：「〇・千古名將」（battleGrand）。
   總開關 BTL_Y_ON（照年份五卷）：false＝卡片、順序、集滿獎勵、說明文字都跟 11/8 前線上版一樣（讀 battles.json，卷一＝百戰之將、卷二＝battleVol），存檔也不動（照第幾張記，程式在記憶體裡換成 id，寫回時換回第幾張；修為紀錄、journey id 也是線上版的格式）；
     true＝讀 battles2.json、照年份分卷、存檔搬家（battleMig，舊資料備份在 battleSeal0）、battleVolY＋battleVolLegacy 抵扣。battleVolLegacy 在第一次用 true 的時候才照當時的 battleTitle／battleVol 算（battleLegacy），所以關著的期間玩家照舊領的獎勵也會算進去。 */
/* 開發者 11/9（收集系統合併方案）：每場打下來的「戰役印」畫面上改叫「已攻下」、畫成小旗（用過提示＝空心旗）；存檔照舊是 battleSeal。
   有一卷 5 場都打下來＝那一朝千秋印的「古戰場」那一邊亮（07i2-seal.js sealSideAt）；battleMarkId 回傳 sealNew＝這一次剛亮。 */
const BTL_Y_ON=true;
const BTL_FILE=BTL_Y_ON?"data/canju/battles2.json":"data/canju/battles.json";
let BATTLE_P=null,BATTLE_PK={},BATTLE_LAST=null;
function battleData(){return BATTLE_P||(BATTLE_P=Promise.all([fetch(BTL_FILE).then(r=>{if(!r.ok)throw new Error("戰役資料載入失敗（"+r.status+"）");return r.json()}),fetch("data/canju/tags.json").then(r=>r.ok?r.json():{tags:{}}).catch(()=>({tags:{}})),cjData(),
    fetch("data/eramap/realms.json").then(r=>r.ok?r.json():null).catch(()=>null),fetch("data/eramap/labels.json").then(r=>r.ok?r.json():null).catch(()=>null)])
  .then(([B,T,D,RJ,LJ])=>({B,T,D,RJ,LJ})).catch(e=>{BATTLE_P=null;throw e}))}
/* ---------- 存檔搬家（照第幾張記 → 照戰役 id 記），見檔頭 ---------- */
const BTL_NUM=x=>/^\d+$/.test(String(x));
function battleMigMap(o,k){const N={};for(const[x,v]of Object.entries(o||{})){if(!v)continue;const id=BTL_NUM(x)?k+"_"+(+x+1):x,p=N[id];N[id]=!p?v:{...p,...v,at:Math.min(+p.at||Infinity,+v.at||Infinity),h:Math.min(p.h|0,v.h|0)}}return N}
function battleMig(){if(!BTL_Y_ON)return false;try{const A=store.get("battleSeal",{})||{},P=store.get("battlePlan",{})||{},has=o=>Object.values(o||{}).some(E=>E&&typeof E==="object"&&Object.keys(E).some(BTL_NUM));
    if(!has(A)&&!has(P))return false;
    if(!store.get("battleSeal0",null))store.set("battleSeal0",{at:Date.now(),seal:JSON.parse(JSON.stringify(A)),plan:JSON.parse(JSON.stringify(P)),title:store.get("battleTitle",{})||{},vol:store.get("battleVol",{})||{}});
    let n=0;
    for(const k of Object.keys(A)){const E=A[k];if(!E||typeof E!=="object"||!Object.keys(E).some(BTL_NUM))continue;n+=Object.keys(E).filter(BTL_NUM).length;const N=battleMigMap(E,k);for(const id in N)N[id]={...N[id],c:id};A[k]=N}
    for(const k of Object.keys(P))if(P[k]&&typeof P[k]==="object"&&Object.keys(P[k]).some(BTL_NUM))P[k]=battleMigMap(P[k],k);
    store.set("battleSeal",A);store.set("battlePlan",P);
    /* 修為紀錄：舊鍵 bt:<朝代>:<第幾張> 補一個新鍵 bt:<戰役id>（舊鍵留著），同一場不會再領一次 +15 */
    {const K=store.get("xpKeys",{})||{};let ch=0;for(const q of Object.keys(K)){const m=/^bt:([a-z]+):(\d+)$/.exec(q);if(m){const nk="bt:"+m[1]+"_"+(+m[2]+1);if(!K[nk]){K[nk]=1;ch=1}}}if(ch)store.set("xpKeys",K)}
    {const R=store.get("jRunB",null),m=R&&/^bt:(\w+):(\d+)(:.*)?$/.exec(R.id||"");if(m){R.id="bt:"+m[1]+":"+m[1]+"_"+(+m[2]+1)+(m[3]||"");store.set("jRunB",R)}}
    {const J=store.get("jPending",null),m=J&&/^bt:(\w+):(\d+)$/.exec(J.id||"");if(m){J.id="bt:"+m[1]+":"+m[1]+"_"+(+m[2]+1);store.set("jPending",J)}}
    try{store.set("battleSeen",{});sessionStorage.removeItem("btAt")}catch(e){}
    store.set("battleMig",{v:2,at:Date.now(),n});return true}catch(e){return false}}
try{battleMig()}catch(e){}
/* 舊版已經領過幾次集滿獎勵（舊卷一＝百戰之將、舊卷二起＝battleVol）：BTL_Y_ON 第一次打開時記一次（_at），之後新卷集滿先抵這個數 */
function battleLegacy(){const L0=store.get("battleVolLegacy",null);if(L0&&L0._at)return L0;const T=store.get("battleTitle",{})||{},V=store.get("battleVol",{})||{},LG={_at:Date.now()};
  for(const k of new Set([...Object.keys(T),...Object.keys(V)]))LG[k]={n:(T[k]?1:0)+Object.keys(V[k]||{}).length,used:0};store.set("battleVolLegacy",LG);return LG}
if(BTL_Y_ON)try{battleLegacy()}catch(e){}
/* 照 id 記的原始存檔（{朝代:{戰役id:印}}） */
/* 總開關關著：存檔一個字都不改（跟線上版一樣照第幾張記），這裡只在記憶體裡換成 id 給程式用；寫回時再換回第幾張（battleSealSave） */
const battleSealsId=()=>{if(!BTL_Y_ON){const A=store.get("battleSeal",{})||{},o={};for(const k of Object.keys(A))o[k]=battleMigMap(A[k],k);return o}battleMig();return store.get("battleSeal",{})||{}};
/* 戰役 id → 線上版的第幾張（qin_3 → "2"）；開關打開時就是 id 本身。用在 battleSeal、battlePlan、修為紀錄、journey id */
const battleNumKey=(k,cid)=>{const t=String(cid||"");return t.startsWith(k+"_")&&BTL_NUM(t.slice(k.length+1))?String(+t.slice(k.length+1)-1):t};
const battleKey=(k,cid)=>BTL_Y_ON?cid:battleNumKey(k,cid);
function battleSealSave(A){if(BTL_Y_ON){store.set("battleSeal",A);return}const o={};for(const k of Object.keys(A)){const m={};for(const[q,v]of Object.entries(A[k]||{})){if(!v)continue;const{c,...x}=v;m[battleNumKey(k,q)]=x}o[k]=m}store.set("battleSeal",o)}
/* 畫面用：{朝代:{第幾張:印}}（照現在 battles2.json 的順序換成位置，跟以前的程式一樣用 S[i]） */
const battleSeals=()=>{const A=battleSealsId(),o={};for(const k of Object.keys(A)){const C=BATTLE_CARDS[k]||[],E=A[k]||{},m={};C.forEach((c,i)=>{if(c&&E[c.id])m[i]=E[c.id]});o[k]=m}return o};
/* 照 journey／關卡 id 找戰役：bt:<朝代>:<戰役id>（舊版是 bt:<朝代>:<第幾張>，照舊表換成 id） */
function battleJ(j){const p=String(j||"").split(":"),k=p[1]||"";let id=p[2]||"";if(BTL_NUM(id))id=k+"_"+(+id+1);const i=(BATTLE_CARDS[k]||[]).findIndex(c=>c&&c.id===id);return{k,id,i}}
function battleCardJ(j){const r=battleJ(j);return r.i>=0?BATTLE_CARDS[r.k][r.i]:null}
const battleTitleOf=k=>(store.get("battleGrand",{})||{})[k]?shipShort(k)+"・千古名將":(store.get("battleTitle",{})||{})[k]?shipShort(k)+"・百戰之將":"";
/* 稱號（06-cpu.js XQ_TITLE：排在千秋盃、擂台後面，將令、棋罐前面）：最近集滿的那一朝；意見回饋 767：一朝全部（5 卷 25 場）打下來是「〇・千古名將」，排在百戰之將前面 */
function battleTitle(){try{const G=store.get("battleGrand",{})||{},g=Object.keys(G).sort((a,b)=>G[b]-G[a])[0];if(g)return shipShort(g)+"・千古名將";const T=store.get("battleTitle",{})||{},k=Object.keys(T).sort((a,b)=>T[b]-T[a])[0];return k?shipShort(k)+"・百戰之將":""}catch(e){return""}}
const battleMode=c=>(c&&c.play&&c.play.t)||"puzzle";
/* 守城玩法的名稱：不是守城牆的（例如尾隨敵軍、攔截援軍、封鎖湖面），資料寫 play.nm，卡面就不寫「守城」（史學顧問 11/8） */
const battleHoldNm=c=>c&&c.play&&c.play.nm?"🛡 "+c.play.nm:"🏯 守城";
/* 照年代一場一場打：第一場一直開著；前一場打下來（或這一場已經蓋過印）才開 */
const battleOpen=(k,i,S)=>{S=S||battleSeals()[k]||{};const C=BATTLE_CARDS[k]||[];if(!C[i])return i===0;if(S[i])return true;const vo=C[i].vol||1,f=C.findIndex(z=>((z&&z.vol)||1)===vo);
  if(i!==f)return!!S[i-1];return battleVolOpen(k,vo,S)};   /* 意見回饋 767 分卷：每卷第一場看 battleVolOpen；卷內照年份一場一場打（蓋過印的那張一直開著，也帶開下一張） */
const BTL_VN=["","一","二","三","四","五","六","七","八","九"];
const battleVolOf=(k,i)=>(((BATTLE_CARDS[k]||[])[i]||{}).vol)||1;
/* 前一卷（有上線場次的前一卷）要打下幾場，這一卷才開：3 場；前一卷上線不到 3 場就要全部 */
function battleVolNeed(k,vo){const C=BATTLE_CARDS[k]||[],vs=[...new Set(C.map(c=>c.vol||1))].sort((a,b)=>a-b),j=vs.indexOf(vo);if(j<=0)return null;const pv=vs[j-1];return{pv,need:Math.min(3,C.filter(c=>(c.vol||1)===pv).length)}}
function battleVolOpen(k,vo,S){S=S||battleSeals()[k]||{};const C=BATTLE_CARDS[k]||[],q=battleVolNeed(k,vo);if(!q)return true;
  if(C.some((c,i)=>(c.vol||1)===vo&&S[i]))return true;   /* 這一卷已經有印（舊版打下、搬家帶過來的）：直接開，不吃虧 */
  if(battleVolSeals(k,q.pv,S)>=q.need){battleVolKeep(k,vo);return true}
  return battleVolWas(k,vo)||battleVolOld(k,vo,S)}
/* 開發者 11/9「已開的保持開」：卷三～五補進 109 場後，前一卷從 1、2 場變 5 場、要打下 3 場，舊玩家已經開的卷會被鎖回去。
   ①照補場前的規則（只算沒有 wave 的舊場次）重算，當時開了的照樣開；②開過的卷記在 store.btlVO，以後規則再變也不鎖回 */
function battleVolWas(k,vo){try{const o=store.get("btlVO",{})||{};return!!(o[k]&&o[k][vo])}catch(e){return false}}
function battleVolKeep(k,vo){try{const o=store.get("btlVO",{})||{};if(o[k]&&o[k][vo])return;(o[k]=o[k]||{})[vo]=1;store.set("btlVO",o)}catch(e){}}
function battleVolOld(k,vo,S){const C=BATTLE_CARDS[k]||[],old=C.map((c,i)=>[c,i]).filter(([c])=>!c.wave),vs=[...new Set(old.map(([c])=>c.vol||1))].sort((a,b)=>a-b),j=vs.indexOf(vo);if(j<=0)return false;
  const pv=vs[j-1],P=old.filter(([c])=>(c.vol||1)===pv),need=Math.min(3,P.length),got=P.filter(([c,i])=>S[i]).length;if(got>=need){battleVolKeep(k,vo);return true}return false}
function battleLockTxt(k,i){const C=BATTLE_CARDS[k]||[],vo=battleVolOf(k,i),q=battleVolNeed(k,vo);if(q&&C.findIndex(z=>(z.vol||1)===vo)===i)return`卷${BTL_VN[q.pv]||q.pv}先打下 ${q.need} 場，卷${BTL_VN[vo]||vo}才會開`;return`先打下「${(C[i-1]||{}).name||"前一場"}」`}
function battleVolSeals(k,vo,S){S=S||battleSeals()[k]||{};return(BATTLE_CARDS[k]||[]).filter((c,i)=>((c.vol||1)===vo)&&S[i]).length}
const battleHref=(k,i,c)=>battleMode(c)==="puzzle"&&!(c&&c.flag)?"#/canju/b/"+k+"/"+i:"#/battle/"+k+"/"+i;   /* 旗艦戰役（方案 C）一律先到 #/battle/<朝代>/<第幾張> 的軍師獻策 */
/* 方案 C 軍師獻策：這次打開 App 選對過哪幾場（選對才照原本的玩法開打；battlePlan 存每場第一次選對的時間和選錯幾次） */
const BATTLE_PLAN_OK={};
/* 打完這一場，下一步去哪：先找後面開著、還沒蓋印的，再找前面的；都打完回 -1 */
function battleNextIdx(k,i){const N=(BATTLE_CARDS[k]||[]).length,S=battleSeals()[k]||{};for(let j=1;j<N;j++){const x=(i+j)%N;if(!S[x]&&battleOpen(k,x,S))return x}return-1}
/* 星槎 SHIP_PLAN 在任何難度用到的題都不拿來當戰役題（不然換個難度就撞題） */
function battlePlanIds(){const o=[];try{for(const k in SHIP_PLAN){const Pl=SHIP_PLAN[k];if(typeof Pl.story==="string")o.push(Pl.story);if(Pl.warm)o.push(Pl.warm);if(Pl.byDiff&&typeof Pl.byDiff==="object")for(const d in Pl.byDiff)o.push(...Pl.byDiff[d])}}catch(e){}return o.filter(Boolean)}
function battleHash(s){let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h}
/* 殘局題的卡各配哪一題（照目前的航行難度；守城、讓子的卡不配題＝null）。12 朝一起挑（照航線順序），盡量不重複；同一朝一定不重複。
   不拿茶單保留題、星槎 SHIP_PLAN 在任何難度用到的題——只有守和題（xh-，相站第 3 題）例外：守城、守和這類道理的仗少了它們就沒題可配 */
async function battlePicks(k){const{B,T,D}=await battleData(),dn=diffNow(),key=k+"|"+dn;if(BATTLE_PK[key])return BATTLE_PK[key];
  const tags=T.tags||{},[lo,hi]=diffOf().band;
  const skip=new Set([...(typeof cjReserved==="function"?cjReserved():[]),...(typeof shipReserved==="function"?shipReserved(D):[]),...battlePlanIds()].filter(id=>!/^xh-/.test(id))),used=new Set();
  const pool=[...D.items,...Object.values(D.byId).filter(P=>P.hold&&!D.items.includes(P))].filter(P=>tags[P.id]&&P.tree&&!skip.has(P.id));
  try{await shipBank()}catch(e){}
  const eras=[...SHIP_ROUTE.filter(e=>(B.eras||{})[e]),...Object.keys(B.eras||{}).filter(e=>!SHIP_ROUTE.includes(e))];
  /* 挑題批次（卡的 wave，沒寫＝1）：先替第 1 批的卡挑完 12 朝，再挑第 2 批…。後來才上線的卡寫 wave:2，這樣舊卡配到的題跟加卡前一模一樣（每一批內還是照航線、照卡片順序挑） */
  const MINE={},FB={},waves=[...new Set(eras.flatMap(e=>(B.eras[e]||[]).map(c=>+c.wave||1)))].sort((a,b)=>a-b);
  for(const e of eras){MINE[e]=new Set();FB[e]=(shipPuzzles(e)||[]).slice();BATTLE_PK[e+"|"+dn]=(B.eras[e]||[]).map(()=>null)}
  for(const wv of waves)for(const e of eras){const mine=MINE[e],fb=FB[e],out=BATTLE_PK[e+"|"+dn];
    (B.eras[e]||[]).forEach((c,i)=>{if((+c.wave||1)!==wv||battleMode(c)!=="puzzle")return;const groups=(B.lessons||{})[c.lesson]||[];let id=null;
      for(const reuse of [false,true])for(let w=0;w<=3&&!id;w++)for(const g of groups){if(id)break;const ok=P=>!mine.has(P.id)&&(reuse||!used.has(P.id))&&g.every(t=>tags[P.id].includes(t))&&+P.d>=lo-w&&+P.d<=hi+w;   /* 先放寬題組、再放寬難度；別朝用過的題，真的挑不到才重複 */
        const cand=pool.filter(ok);if(cand.length){cand.sort((a,b)=>battleHash(c.id+a.id)-battleHash(c.id+b.id));id=cand[0].id}}
      if(!id)id=fb.find(x=>!mine.has(x))||null;   /* 挑不到同主題的題：退回這一朝的千秋殘局題 */
      if(id){mine.add(id);used.add(id)}out[i]=id})}
  return BATTLE_PK[key]||[]}
/* 守城、讓子在這個航行難度的設定 */
function battleHoldCfg(B,c){const H=(B.holds||{})[c.play.pos];if(!H)return null;const d=diffNow()-1;return{...H,n:(H.n||[])[d]||H.n[0]||8,ai:(H.ai||[])[d]||H.ai[0]||3}}
function battleOddsCfg(B,c){const O=(B.odds||{})[c.play.bk];if(!O)return null;const d=diffNow()-1;return{...O,cut:(O.cut||[])[d]||"",rm:(O.rm||[])[d]||[],lv:(O.lv||[])[d]||1}}
const battleKeepTxt=keep=>(keep||[]).map(p=>({A:"仕",B:"相",R:"俥",N:"傌",C:"炮",P:"兵"})[p]||p).join("、");
/* ---------- 朝代戰役地圖（SVG；座標都是地圖圖上的百分比，跟 park3d 的疆域、地名同一套）---------- */
function battleMapHTML(k,cards,S,RJ,LJ,op){op=op||{};const P=cards.map(c=>Array.isArray(c.xy)?[+c.xy[0],+c.xy[1]]:null);if(!P.length||P.some(p=>!p))return"";   /* op（意見回饋 770 滿版地圖用）：A 取景寬高比、k 點和字放大倍數、px 地圖實際寬度（算觸控熱區）、bare 不要底下的圖例 */
  const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]),pad=7,A=op.A||4/3;let w=Math.max(Math.max(...xs)-Math.min(...xs)+2*pad,30),h=Math.max(Math.max(...ys)-Math.min(...ys)+2*pad,22);if(w/h<A)w=h*A;else h=w/A;
  let vx=(Math.max(...xs)+Math.min(...xs))/2-w/2,vy=(Math.max(...ys)+Math.min(...ys))/2-h/2;if(w<=100)vx=Math.max(0,Math.min(100-w,vx));if(h<=100)vy=Math.max(0,Math.min(100-h,vy));
  const r=w*0.021*(op.k||1),f=n=>+n.toFixed(2),mob=(()=>{try{return matchMedia("(pointer:coarse)").matches||innerWidth<820}catch(e){return false}})();
  /* 太近的兩個點（例如長治、高平）推開一點，免得印疊在一起 */
  const Q=P.map(p=>p.slice());for(let it=0;it<24;it++)for(let a=0;a<Q.length;a++)for(let b=a+1;b<Q.length;b++){const dx=Q[b][0]-Q[a][0],dy=Q[b][1]-Q[a][1],d=Math.hypot(dx,dy)||.01,need=r*2.7;if(d<need){const m=(need-d)/2;Q[a][0]-=dx/d*m;Q[a][1]-=dy/d*m;Q[b][0]+=dx/d*m;Q[b][1]+=dy/d*m}}
  const G=i=>op.idx?op.idx[i]:i,open=cards.map((c,i)=>battleOpen(k,G(i),S));let e=0;for(let i=0;i<cards.length;i++)if(open[i])e=i;
  const sk=op.sk||k,seen=(store.get("battleSeen",{})||{})[sk];const grow=seen!=null&&e>(seen|0);if(!op.dots){const M=store.get("battleSeen",{})||{};if(M[sk]!==e){M[sk]=e;store.set("battleSeen",M)}}
  const inV=(x,y)=>x>=vx-2&&x<=vx+w+2&&y>=vy-2&&y<=vy+h+2;
  const RE=RJ&&RJ[k],realm=RE&&Array.isArray(RE.realms)?RE.realms.map(z=>(z.p||[]).map(p=>`<path d="M${p.map(q=>f(q[0])+" "+f(q[1])).join("L")}Z" fill="${esc(z.c)}" fill-opacity="${z.d?.06:.1}" stroke="${esc(z.c)}" stroke-opacity=".55" stroke-width="${f(w*.0035)}"${z.d?` stroke-dasharray="${f(w*.012)} ${f(w*.008)}"`:""}/>`).join("")).join(""):"";
  const fs=w*.024*(op.k||1),lab=(LJ&&Array.isArray(LJ[k])?LJ[k]:[]).filter(L=>L[4]===1&&inV(+L[1],+L[2])).map(L=>{const[nm,x,y,ty]=L,tx=L[5]!=null?+L[5]:+x,ty2=L[6]!=null?+L[6]:+y,col=ty==="n"?"#961A12":ty==="r"?"#284E68":ty==="c"?"#3a2a1c":"#463220";
    return`${ty==="c"?`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r*.22)}" fill="#3a2a1c" opacity=".55"/>`:""}<text x="${f(tx)}" y="${f(ty2)}" font-size="${f(ty==="n"?fs*1.15:fs*.9)}" fill="${col}" stroke-width="${f(fs*.2)}" text-anchor="middle" dominant-baseline="middle" class="bt-ml${ty==="r"?" rv":""}">${esc(nm)}</text>`}).join("");
  const seg=(a,b)=>`M${f(Q[a][0])} ${f(Q[a][1])}L${f(Q[b][0])} ${f(Q[b][1])}`;
  let route="";if(!op.dots)for(let i=0;i<e;i++){const nw=grow&&i===e-1;route+=`<path d="${seg(i,i+1)}" class="bt-rt${nw?" nw":""}" stroke-width="${f(r*.42)}" pathLength="100"/>`}
  const star=R=>{const s=R*.2;return`M0 ${f(-R)}L${f(s)} ${f(-s)}L${f(R)} 0L${f(s)} ${f(s)}L0 ${f(R)}L${f(-s)} ${f(s)}L${f(-R)} 0L${f(-s)} ${f(-s)}Z`};
  /* 戰役名放哪一邊：右、左、上、下照順序試，挑不壓到別的點、別的名字的那一邊 */
  const fz=fs*1.05,boxes=[],hit=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1],dots=Q.map(([x,y],j)=>{const R=cards[j].flag?r*2.6:r*1.3;return[x-R,y-R,x+R,y+R]});
  const place=cards.map((c,i)=>{const[x,y]=Q[i],tw=(c.name.replace(/之戰$|之役$|之圍$/,"").length+(c.approx?3:0)+(c.flag?1:0))*fz,g=r*(c.flag?2.8:1.45),u=r*(c.flag?2.9:1.7);
    const C=[["start",g,r*.4,[x+g,y-fz*.6,x+g+tw,y+fz*.5]],["end",-g,r*.4,[x-g-tw,y-fz*.6,x-g,y+fz*.5]],["middle",0,-u,[x-tw/2,y-u-fz*.9,x+tw/2,y-u+fz*.2]],["middle",0,u+fz*.8,[x-tw/2,y+u-fz*.1,x+tw/2,y+u+fz*.9]]];
    if(x>vx+w*.66)C.unshift(C.splice(1,1)[0]);
    const ok=z=>z[3][0]>=vx&&z[3][2]<=vx+w&&!boxes.some(b=>hit(b,z[3]))&&!dots.some((d,j)=>j!==i&&hit(d,z[3]));const pick=C.find(ok)||C.find(z=>!boxes.some(b=>hit(b,z[3])))||C[0];boxes.push(pick[3]);return pick});
  const mk=cards.map((c,i)=>{const[x,y]=Q[i],s=S[G(i)],o=open[i],[anc,tx,ty]=place[i],nm=esc(c.name.replace(/之戰$|之役$|之圍$/,"")),approx=c.approx?"（約）":"",rr=c.flag?r*1.3:r,ring=c.flag?`<circle r="${f(rr*1.75)}" fill="none" stroke="#D4A017" stroke-width="${f(rr*.2)}"/><circle r="${f(rr*2.05)}" fill="none" stroke="#F6D36B" stroke-width="${f(rr*.08)}" opacity=".9"/>`:"";
    if(op.dots){const d=r*.75;return`<g class="bt-mk bt-dot${s?" seal":o?" next":" lock"}" data-mk="${G(i)}" transform="translate(${f(x)} ${f(y)})" role="button" aria-label="${esc(c.name)}${s?"・已打下":o?"・可以打":"・還沒開"}"><circle class="bt-hit" r="${f(Math.max(d*2.4,20*w/(op.px||400)))}" fill="none" pointer-events="all"/><circle class="bt-selr" r="${f(d*2.6)}" fill="none" stroke-width="${f(d*.35)}"/>${s?`<rect x="${f(-d)}" y="${f(-d)}" width="${f(d*2)}" height="${f(d*2)}" rx="${f(d*.3)}" fill="${s.h?"#FFF4E0":"#A8321F"}" stroke="#A8321F" stroke-width="${f(d*.25)}"/>`:o?`<circle r="${f(d*1.1)}" fill="#F6D36B" stroke="#A8321F" stroke-width="${f(d*.3)}"/>`:`<circle r="${f(d*.8)}" fill="none" stroke="#3A2E24" stroke-width="${f(d*.25)}" opacity=".8"/>`}</g>`}
    const body=(op.px?`<circle class="bt-hit" r="${f(Math.max(rr*2.4,24*w/op.px))}" fill="none" pointer-events="all"/><circle class="bt-selr" r="${f(rr*3.2)}" fill="none" stroke-width="${f(rr*.32)}"/>`:"")+ring+(s?`<circle r="${f(rr*2.2)}" fill="url(#btGlow)" opacity=".7"/><rect x="${f(-rr*1.1)}" y="${f(-rr*1.1)}" width="${f(rr*2.2)}" height="${f(rr*2.2)}" rx="${f(rr*.3)}" fill="${s.h?"#FFF4E0":"#B22A1F"}" stroke="${s.h?"#B22A1F":"#F2C14E"}" stroke-width="${f(rr*.18)}"/><path class="bt-mt" d="M${f(-rr*.5)} ${f(rr*.75)}V${f(-rr*.75)}" stroke="${s.h?"#B22A1F":"#FFF4E0"}" stroke-width="${f(rr*.2)}" fill="none"/><path class="bt-mt" d="M${f(-rr*.42)} ${f(-rr*.75)}L${f(rr*.72)} ${f(-rr*.38)}L${f(-rr*.42)} ${f(0)}Z" fill="${s.h?"none":"#FFF4E0"}" stroke="${s.h?"#B22A1F":"#FFF4E0"}" stroke-width="${f(rr*.12)}"/>`
      :o?`<circle r="${f(rr*3)}" fill="url(#btGlow)" class="bt-glow"/><path d="${star(rr*2.3)}" fill="#F6D36B" class="bt-star"/><circle r="${f(rr)}" fill="#C8322A" stroke="#F6D36B" stroke-width="${f(rr*.25)}"/><text y="${f(rr*.4)}" font-size="${f(rr*1.15)}" fill="#fff" class="bt-mt">${G(i)+1}</text>`
      :`<circle r="${f(rr*.75)}" fill="#8f8577" stroke="#fff" stroke-width="${f(rr*.15)}" opacity=".8"/><text y="${f(rr*.3)}" font-size="${f(rr*.85)}" fill="#fff" class="bt-mt">${G(i)+1}</text>`);
    return`<g class="bt-mk${s?" seal":o?" next":" lock"}${c.flag?" flag":""}" data-mk="${G(i)}" transform="translate(${f(x)} ${f(y)})" role="button" aria-label="${esc(c.name)}${s?"・已打下":o?"・可以打":"・還沒開"}">${body}<text x="${f(tx)}" y="${f(ty)}" font-size="${f(fz)}" stroke-width="${f(fs*.28)}" text-anchor="${anc}" class="bt-mn${o||s?"":" off"}">${c.flag?"⭐":""}${nm}${approx}</text></g>`}).join("");
  return`<div class="bt-map"><svg viewBox="${f(vx)} ${f(vy)} ${f(w)} ${f(h)}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(eraLabel(k))}戰役地圖">
    <defs><radialGradient id="btGlow"><stop offset="0" stop-color="#FFF1BF" stop-opacity=".95"/><stop offset=".45" stop-color="#F2C14E" stop-opacity=".5"/><stop offset="1" stop-color="#F2C14E" stop-opacity="0"/></radialGradient></defs>
    <rect x="${f(vx-5)}" y="${f(vy-5)}" width="${f(w+10)}" height="${f(h+10)}" fill="#EFE5CF"/><filter id="btInk" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.3" intercept="-0.18"/><feFuncG type="linear" slope="1.3" intercept="-0.18"/><feFuncB type="linear" slope="1.3" intercept="-0.18"/></feComponentTransfer><feColorMatrix type="matrix" values=".757 0 0 0 .18  0 .749 0 0 .149  0 0 .687 0 .125  0 0 0 1 0"/></filter><image href="data/eramap/${esc(k)}${mob?"_m":""}.webp" x="0" y="0" width="100" height="100" preserveAspectRatio="none" filter="url(#btInk)"/>
    <g>${realm}</g><g>${lab}</g><g fill="none">${route}</g><g>${mk}</g></svg>
    ${op.bare?"":`<div class="bt-map-cap">${RE&&RE.year?`🗺 ${esc(eraLabel(k))}・${esc(RE.year)}的疆域　`:""}<span class="bt-k s">⚑</span>已攻下　<span class="bt-k n">✦</span>下一場　<span class="bt-k l">●</span>還沒開　<span class="bt-k n">⭐</span>旗艦戰役（先聽軍師獻策）　（約）地點只能標大概</div>`}</div>`}
/* ---------- 古戰場頁 #/battle ---------- */
function Battlefield(v){const k=shipHere();setTop("⚔ 古戰場・"+(k==="classic"?"船艙":eraLabel(k)),"^#/port");setTabs(false);v.className="view";
  if(k==="classic"){v.innerHTML='<div class="pad"><div class="card muted">船艙沒有古戰場。搭星槎到各朝代的渡口，擂台旁邊就有「⚔ 古戰場」。</div></div>';return{}}
  if(eraLocked(k)){v.innerHTML=`<div class="pad"><div class="card muted">${esc(eraLockMsg(k))}</div></div>`;return{}}
  v.innerHTML='<div class="pad muted">古戰場載入中…</div>';
  battleData().then(async({B,D,RJ,LJ})=>{if(!v.isConnected)return;const cards=(B.eras||{})[k]||[];
    if(!cards.length){v.innerHTML=`<div class="pad"><div class="card" style="line-height:1.8"><b>⚔ ${esc(eraLabel(k))}的古戰場</b><p class="muted">這一朝的戰役還在整理，整理好就會出現在這裡。</p></div><button class="btn ghost" id="btBack" style="width:100%;margin-top:10px">⚓ 回渡口</button></div>`;
      v.querySelector("#btBack").onclick=()=>goUp("#/port");return}
    const pk=await battlePicks(k);if(!v.isConnected)return;const S=battleSeals()[k]||{},n=cards.filter((c,i)=>S[i]).length,tt=battleTitleOf(k);
    const modeTxt=(c,i)=>{const m=battleMode(c);if(m==="hold"){const H=battleHoldCfg(B,c);return H?`${battleHoldNm(c)}：敵軍先動，撐過 ${H.n} 步，${battleKeepTxt(H.keep)}一顆都不能丟`:"守城（設定準備中）"}
      if(m==="odds"){const O=battleOddsCfg(B,c);return O?`⚖ 讓子對弈：你少了${esc(O.cut)}，跟第 ${O.lv} 級「${esc((typeof FINE_NM!=="undefined"&&FINE_NM[O.lv-1])||"")}」電腦下一盤，贏了才算`:"讓子對弈（設定準備中）"}
      const P=pk[i]&&D.byId[pk[i]];return P?`📜 殘局題：${esc(P.t)}・${cjLv(P.d)}・${cjSrc(P)}`:"題目準備中"};
    const ready=(c,i)=>battleMode(c)==="puzzle"?!!(pk[i]&&D.byId[pk[i]]):battleMode(c)==="hold"?!!battleHoldCfg(B,c):!!battleOddsCfg(B,c);
    if(BTL_MAP_ON)return battleField2(v,k,{cards,S,tt,modeTxt,ready,RJ,LJ});
    v.innerHTML=`<div class="pad bt-page">${battleMapHTML(k,cards,S,RJ,LJ)}<div class="card bt-head"><b>⚔ ${esc(eraLabel(k))}・${cards.length} 場戰役</b><div class="muted">已攻下 ${n}／${cards.length}${tt?"・🏅 "+esc(tt):"・集滿一卷 5 場：千秋印的古戰場那一邊亮起來、稱號「"+esc(shipShort(k))+"・百戰之將」＋一件珍品"}・題目和電腦強度照🎚 ${esc(diffOf().n)}<br>照年代一場一場打：打下一場，路線就延伸到下一場。</div></div>
      ${cards.map((c,i)=>{const s=S[i],o=battleOpen(k,i,S),ok=o&&ready(c,i);return`<button class="card bt-card${s?" done":""}${o?"":" lock"}${c.flag?" flag":""}" data-bi="${i}" id="btc${i}"${ok?"":" disabled"}>
        <span class="bt-pic" style="background-image:url(data/shipmap/port_${k}.webp);background-position:${(i*23)%100}% 40%"><span class="bt-pic-n">${esc(c.name)}</span><img src="data/battles/${esc(c.img||c.id+".webp")}" alt="" loading="lazy" onerror="this.remove()"></span>
        <span class="bt-seal">${s?(s.h?"⚐":"🚩"):o?"⚔":"🔒"}</span><span class="tx"><b>${i+1}・${esc(c.name)}${c.flag?'<em class="bt-flag">⭐ 旗艦戰役</em>':""}</b><small>${esc(c.year)}${c.sides?"・"+esc(c.sides):""}${c.prov?`・<em class="bt-prov">${provOf(c)&&provOf(c).kind?"【"+esc(provOf(c).label)+"】":esc(c.prov)}</em>`:""}</small>
        ${c.at?`<small>📍 ${c.approx?"約在":""}${esc(c.at)}</small>`:""}<span class="bt-line">${esc(c.line)}</span><span class="bt-tag">🗡 計謀：${esc(c.trick)}　📘 道理：${esc(c.lesson)}</span>
        <span class="muted bt-q">${o?`${s?"🚩 已攻下・":""}${modeTxt(c,i)}`:`🔒 ${esc(battleLockTxt(k,i))}`}</span></span></button>`}).join("")}
      <p class="muted" style="font-size:12.5px;margin:8px 2px 0;line-height:1.7">點一張戰役卡開打：殘局題解開（看答案不算）、守城撐過步數、讓子對弈贏棋，就算攻下、插一面小旗。棋盤上的局面是借那場仗的道理出題，不是當年的戰況；標【有爭議／傳說】的，是史書記載不完全確定的地方（跟「📜 文史考據」頁同一套說法）；地圖上標「約」的，是地點只能標大概。</p>
      <button class="btn ghost" id="btBack" style="width:100%;margin-top:10px">⚓ 回渡口</button></div>`;
    v.querySelectorAll("[data-bi]").forEach(b=>b.onclick=()=>{vibrate(5);const i=+b.dataset.bi;location.hash=battleHref(k,i,cards[i])});
    v.querySelectorAll("[data-mk]").forEach(g=>g.addEventListener("click",()=>{const c=v.querySelector("#btc"+g.dataset.mk);if(!c)return;vibrate(5);c.scrollIntoView({behavior:"smooth",block:"center"});c.classList.remove("flash");void c.offsetWidth;c.classList.add("flash")}));
    v.querySelector("#btBack").onclick=()=>goUp("#/port")}).catch(e=>{if(v.isConnected)v.innerHTML=`<div class="pad"><div class="card muted">${esc(e.message||String(e))}</div></div>`});
  return{}}
/* ---------- 意見回饋 770（開發者 11/8）：古戰場先看滿版地圖，點戰役點才從下面滑出那一場的橫幅圖和說明 ----------
   BTL_MAP_ON＝false 回到舊版（上面地圖＋下面卡片清單）。抽屜：半高，拉把往上拉＝全高、往下拉＝收起，點地圖空白處也收起；‹ 上一場／下一場 › 照路線順序切換。
   ☰ 戰役清單＝抽屜改成清單；ⓘ＝圖例和玩法說明。從戰役回來：sessionStorage btAt＝「朝代:第幾張」（進戰役時記，battleAtSet），地圖停在那一場、抽屜打開。寬螢幕（≥820px）抽屜改成右邊固定欄。 */
const BTL_MAP_ON=true;
/* 意見回饋 767：分卷（每朝 5 卷×5 場，照年份）。false＝只用卷一（battles2.json 裡卷二起的卡在 battleData 先濾掉） */
const BTL_VOL_ON=true;   /* 開發者 11/8：卷二 60 場經史學顧問考核，打開 */
let BTL_FIT=null;
function battleAtSet(k,i){try{sessionStorage.setItem("btAt",k+":"+i)}catch(e){}}
function battleAtGet(k){try{const m=/^(\w+):(\d+)$/.exec(sessionStorage.getItem("btAt")||"");return m&&m[1]===k?+m[2]:-1}catch(e){return-1}}
function battleField2(v,k,X){const{cards,S,tt,modeTxt,ready,RJ,LJ}=X,N=cards.length,n=cards.filter((c,i)=>S[i]).length,RE=RJ&&RJ[k];
  const VS=[...new Set(cards.map(c=>c.vol||1))].sort((a,b)=>a-b),multi=BTL_VOL_ON&&VS.length>1,vOf=i=>(cards[i]&&cards[i].vol)||1,vFirst=vo=>cards.findIndex(c=>(c.vol||1)===vo);
  let vol=(()=>{if(!multi)return 1;const a=battleAtGet(k);if(a>=0&&cards[a])return vOf(a);let best=1;for(const vo of VS){const ix=cards.map((c,j)=>j).filter(j=>vOf(j)===vo);if(ix.some(j=>!S[j]&&battleOpen(k,j,S)))best=vo}return best})();
  v.innerHTML=`<div class="bt2${multi?" vt":""}" id="bt2"><div class="bt2-map" id="bt2M"></div>
    <div class="bt2-bar"><h2>⚔ ${esc(eraLabel(k))}古戰場</h2><span>已攻下 ${n}／${N}${tt?"・🏅 "+esc(tt):""}</span></div>${multi?'<div class="bt2-vt" id="bt2V" role="tablist"></div>':""}
    <button class="bt2-btn bt2-info" id="bt2I" aria-label="圖例和玩法說明">ⓘ</button><button class="bt2-btn bt2-lst" id="bt2L">☰ 戰役清單</button>
    <div class="bt2-sh" id="bt2S" hidden><div class="bt2-hd" id="bt2H" role="button" tabindex="0" data-axk aria-label="拉開或收起"><i></i></div><div class="bt2-bd" id="bt2B"></div></div></div>`;
  const W=v.querySelector("#bt2"),M=W.querySelector("#bt2M"),Sh=W.querySelector("#bt2S"),Bd=W.querySelector("#bt2B");let sel=-1,lastA=0,off=0;
  const wide=()=>{try{return matchMedia("(min-width:820px)").matches}catch(e){return false}};
  const mark=()=>M.querySelectorAll("[data-mk]").forEach(g=>g.classList.toggle("sel",+g.dataset.mk===sel));
  const pan=()=>{const sv=M.querySelector("svg");if(!sv)return;const g=sel>=0&&M.querySelector(`[data-mk="${sel}"]`);
    if(!g||wide()||Sh.hidden||Sh.classList.contains("full")){off=0;sv.style.transform="";return}
    const mr=M.getBoundingClientRect(),vb=sv.viewBox.baseVal,tm=/translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute("transform")||"");if(!tm||!vb||!vb.height)return;const sc=Math.max(mr.width/vb.width,mr.height/vb.height),y=mr.top+(mr.height-vb.height*sc)/2+(+tm[2]-vb.y)*sc,wr=W.getBoundingClientRect(),top=wr.bottom-wr.height*.6,want=mr.top+(top-mr.top)*.5;
    off=y>top-40?Math.round(y-want):0;sv.style.transform=off?`translateY(${-off}px)`:""};
  const fit=()=>{if(!W.isConnected){if(BTL_FIT===fit)BTL_FIT=null;return}const r=W.getBoundingClientRect(),vh=(window.visualViewport&&visualViewport.height)||innerHeight;W.style.height=Math.max(360,Math.round(vh-r.top-(wide()?12:0)))+"px";
    const mr=M.getBoundingClientRect(),A=mr.width/Math.max(1,mr.height);if(Math.abs(A-lastA)<.01&&M.firstChild)return;lastA=A;off=0;
    const idx=multi&&vol>0?cards.map((c,j)=>j).filter(j=>vOf(j)===vol):null;
    M.innerHTML=battleMapHTML(k,idx?idx.map(j=>cards[j]):cards,S,RJ,LJ,{A,bare:1,px:mr.width,k:mr.width<600?1.3:1.1,idx,sk:idx&&vol>1?k+"/"+vol:k,dots:multi&&vol===0});
    M.querySelectorAll("[data-mk]").forEach(g=>g.addEventListener("click",e=>{e.stopPropagation();vibrate(5);show(+g.dataset.mk)}));mark();pan()};
  const tabs=()=>{const T=W.querySelector("#bt2V");if(!T)return;T.innerHTML=VS.map(vo=>{const f=vFirst(vo),o=battleOpen(k,f,S),a=battleVolSeals(k,vo,S),z=cards.filter(c=>(c.vol||1)===vo).length;
      return`<button class="bt2-vb${vo===vol?" on":""}${o?"":" lock"}" data-vo="${vo}" role="tab" aria-selected="${vo===vol}">${o?"":"🔒"}卷${BTL_VN[vo]||vo}<small>${a}/${z}</small></button>`}).join("")+`<button class="bt2-vb${vol===0?" on":""}" data-vo="0" role="tab" aria-selected="${vol===0}">全部</button>`;
    T.querySelectorAll("[data-vo]").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);setVol(+b.dataset.vo);if(!Sh.hidden&&sel>=0&&vol>0&&vOf(sel)!==vol)close()})};
  const setVol=vo=>{if(vo===vol)return;vol=vo;lastA=0;tabs();fit()};
  const pic=(c,i)=>`style="background-image:url(data/shipmap/port_${k}.webp);background-position:${(i*23)%100}% 40%"`;
  const card=i=>{const c=cards[i],s=S[i],o=battleOpen(k,i,S),ok=o&&ready(c,i);
    return`<div class="bt-pic bt2-pic${o?"":" lock"}" ${pic(c,i)}><span class="bt-pic-n">${esc(c.name)}</span><img src="data/battles/${esc(c.img||c.id+".webp")}" alt="" onerror="this.remove()">${s?`<span class="bt-seal">${s.h?"⚐":"🚩"}</span>`:""}</div>
      <div class="bt2-tx">${multi?`<small class="bt2-vl">卷${BTL_VN[vOf(i)]||vOf(i)}</small>`:""}<b>${i+1}・${esc(c.name)}${c.flag?'<em class="bt-flag">⭐ 旗艦戰役</em>':""}</b><small>${esc(c.year)}${c.sides?"・"+esc(c.sides):""}${c.prov?`・<em class="bt-prov">${provOf(c)&&provOf(c).kind?"【"+esc(provOf(c).label)+"】":esc(c.prov)}</em>`:""}</small>
      ${c.at?`<small>📍 ${c.approx?"約在":""}${esc(c.at)}</small>`:""}<span class="bt-line">${esc(c.line)}</span>${c.hist&&!c.flag?`<details class="bt2-hist"><summary>📜 史實</summary><p>${esc(c.hist)}</p>${c.histSrc?`<p class="muted">出處：${esc(c.histSrc)}</p>`:""}</details>`:""}<span class="bt-tag">🗡 計謀：${esc(c.trick)}　📘 道理：${esc(c.lesson)}</span>
      <span class="muted bt-q">${o?`${s?(s.h?"⚐ 用過提示（空心旗），不看提示再打一次就換成實心旗・":"🚩 已攻下・"):""}${modeTxt(c,i)}`:`🔒 ${esc(battleLockTxt(k,i))}${/才會開$/.test(battleLockTxt(k,i))?"":"才開"}`}</span>
      ${s&&c.flag?`<details class="bt2-hist"><summary>📜 歷史上其實是這樣</summary><p>${esc(c.flag.hist)}</p>${c.flag.src?`<p class="muted">出處：${esc(c.flag.src)}</p>`:""}</details>`:""}</div>
      <div class="bt2-nav"><button class="btn ghost" data-go="${i-1}"${i<1?" disabled":""}>‹ 上一場</button><button class="btn" id="bt2Go"${ok?"":" disabled"}>${!o?"🔒 還沒開":!ok?"題目準備中":c.flag?(s?"⭐ 再打一次":"⭐ 聽軍師獻策"):s?"⚔ 再打一次":"⚔ 開戰"}</button><button class="btn ghost" data-go="${i+1}"${i>=N-1?" disabled":""}>下一場 ›</button></div>`};
  const open=full=>{Sh.hidden=false;Sh.classList.toggle("full",!!full);Sh.style.transform="";W.classList.add("sh");Bd.scrollTop=0;requestAnimationFrame(pan)};
  const close=()=>{if(wide())return list();Sh.hidden=true;W.classList.remove("sh");sel=-1;mark();pan();try{sessionStorage.removeItem("btAt")}catch(e){}};
  function show(i,keep){if(!cards[i])return;const wasFull=keep&&!Sh.hidden&&Sh.classList.contains("full");if(multi&&vOf(i)!==vol){vol=vOf(i);lastA=0;tabs();fit()}sel=i;battleAtSet(k,i);Bd.innerHTML=card(i);mark();open(wasFull);
    Bd.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{vibrate(5);show(+b.dataset.go,1)});
    const go=Bd.querySelector("#bt2Go");if(go)go.onclick=()=>{vibrate(5);battleAtSet(k,i);location.hash=battleHref(k,i,cards[i])}}
  function list(){sel=-1;mark();Bd.innerHTML=`<div class="bt2-lh"><b>⚔ ${esc(eraLabel(k))}・${N} 場戰役</b><span class="muted">已攻下 ${n}／${N}</span></div>`+cards.map((c,i)=>{const s=S[i],o=battleOpen(k,i,S),vo=vOf(i);
      return`${multi&&vFirst(vo)===i?`<div class="bt2-lv">卷${BTL_VN[vo]||vo}・${battleVolSeals(k,vo,S)}／${cards.filter(z=>(z.vol||1)===vo).length}${o?"":"　🔒 "+esc(battleLockTxt(k,i))}</div>`:""}<button class="bt2-li${s?" done":""}${o?"":" lock"}" data-li="${i}"><span class="bt2-lp" style="background-image:url(data/battles/${esc(c.img||c.id+".webp")}),url(data/shipmap/port_${k}.webp)"></span><span class="tx"><b>${i+1}・${esc(c.name)}${c.flag?" ⭐":""}</b><small>${esc(c.year)}・${s?(s.h?"⚐ 用過提示":"🚩 已攻下"):o?"⚔ 可以打":"🔒 還沒開"}</small></span></button>`}).join("");
    Bd.querySelectorAll("[data-li]").forEach(b=>b.onclick=()=>{vibrate(5);show(+b.dataset.li)});open(!wide()&&N>6)}
  const info=()=>modal(`<div class="em">⚔</div><h2>${esc(eraLabel(k))}古戰場</h2><div class="bt2-lg">${RE&&RE.year?`<p>🗺 地圖是${esc(eraLabel(k))}・${esc(RE.year)}的疆域</p>`:""}
    <p><span class="bt-k s">⚑</span> 已攻下，插一面小旗（空心旗＝用過提示）</p><p><span class="bt-k n">✦</span> 下一場，可以打</p><p><span class="bt-k l">●</span> 還沒開</p><p>⭐ 旗艦戰役：先聽軍師獻策</p><p>（約）地點只能標大概</p></div>
    <p class="muted" style="text-align:left;line-height:1.75;font-size:13px">點地圖上的戰役，就會看到那一場的故事。照年份一場一場打：打下一場，路線就延伸到下一場。殘局題解開（看答案不算）、守城撐過步數、讓子對弈贏棋，就算攻下、插一面小旗；題目和電腦強度照🎚 ${esc(diffOf().n)}。${multi&&!BTL_Y_ON?`分成 ${VS.length} 卷，每卷 5 場；前一卷打下 3 場，下一卷就開。卷一集滿：稱號「${esc(shipShort(k))}・百戰之將」＋一件珍品；卷二起每卷集滿：修為 +30＋一件珍品；全部打下：稱號「${esc(shipShort(k))}・千古名將」。`:multi?`照年份分成 ${VS.length} 卷，每卷 5 場（卷一最早、卷五最晚）；前一卷打下 3 場，下一卷就開。每卷集滿：修為 +30＋一件珍品；第一次集滿任何一卷：稱號「${esc(shipShort(k))}・百戰之將」；一朝 25 場全部打下：稱號「${esc(shipShort(k))}・千古名將」。`:tt?"":"集滿 "+N+" 場：稱號「"+esc(shipShort(k))+"・百戰之將」＋一件珍品。"}<br>棋盤上的局面是借那場仗的道理出題，不是當年的戰況；標【有爭議／傳說】的，是史書記載不完全確定的地方（跟「📜 文史考據」頁同一套說法）。</p>`,[["好",null]]);
  W.querySelector("#bt2I").onclick=()=>{vibrate(5);info()};W.querySelector("#bt2L").onclick=()=>{vibrate(5);list()};M.addEventListener("click",()=>{if(!Sh.hidden)close()});
  {const H=W.querySelector("#bt2H");let y0=null,dy=0;H.addEventListener("pointerdown",e=>{if(wide())return;y0=e.clientY;dy=0;Sh.style.transition="none";try{H.setPointerCapture(e.pointerId)}catch(x){}});
    H.addEventListener("click",e=>{if(e.detail===0)open(!Sh.classList.contains("full"))});   /* 11/12 無障礙：鍵盤 Enter／空白鍵（11b-a11y 轉成 click，detail＝0）也能拉開或收起 */
    H.addEventListener("pointermove",e=>{if(y0==null)return;dy=e.clientY-y0;Sh.style.transform=dy>0?`translateY(${dy}px)`:""});
    const up=()=>{if(y0==null)return;y0=null;Sh.style.transition="";Sh.style.transform="";const full=Sh.classList.contains("full");
      if(Math.abs(dy)<6)open(!full);else if(dy<-40)open(true);else if(dy>60){if(full)open(false);else close()}};
    H.addEventListener("pointerup",up);H.addEventListener("pointercancel",up)}
  tabs();BTL_FIT=fit;if(!battleField2.rs){battleField2.rs=1;addEventListener("resize",()=>{if(BTL_FIT)BTL_FIT()})}
  requestAnimationFrame(()=>{fit();const a=battleAtGet(k);if(a>=0&&cards[a])show(a);else if(wide()){let j=cards.findIndex((c,i)=>!S[i]&&battleOpen(k,i,S));show(j<0?0:j)}});
  setTimeout(fit,350);
  return{}}
/* ---------- 守城、讓子的入口 #/battle/<朝代>/<第幾張> ---------- */
function BattleGo(v,k,i){i=+i|0;setTop("⚔ 古戰場","^#/battle");setTabs(false);v.className="view";
  const bad=m=>{v.className="view";v.innerHTML=`<div class="pad"><div class="card muted">${esc(m)}<br><a href="#/battle">回古戰場</a></div></div>`};
  if(eraLocked(k)){bad(eraLockMsg(k));return{}}
  v.innerHTML='<div class="pad muted">載入中…</div>';
  battleData().then(({B})=>{if(!v.isConnected)return;const cards=(B.eras||{})[k]||[],c=cards[i];if(!c)return bad("找不到這一場戰役（資料可能更新了）。");battleAtSet(k,i);
    if(!battleOpen(k,i))return bad(`照年代一場一場打：${battleLockTxt(k,i)}。`);
    if(c.flag&&!BATTLE_PLAN_OK[k+":"+i])return battleCouncil(v,k,i,c,B);
    const m=battleMode(c);if(m==="hold")return battleHold(v,k,i,c,B);if(m==="odds")return battleOdds(v,k,i,c,B);battlePicks(k).then(()=>navReplace("#/canju/b/"+k+"/"+i))}).catch(e=>bad(e&&e.message||"戰役資料載入失敗"));
  return{}}
/* ---------- 方案 C：軍師獻策（旗艦戰役；資料 card.flag，從 story/軍師獻策_12場.md 來）----------
   開場一句＋這場的開局棋盤＋三位軍師各獻一策（對話選擇，跟星槎終章的 talk 步驟同一種樣子）。選錯：軍師解釋這策在當時為什麼不行，再選一次（不扣分、不用另做局面）；
   選對（史實那一策）：照這場原本的玩法開打（殘局題、守城、讓子）。打下來以後跳「歷史上其實是這樣」小卡（battleMark；讓子對弈寫在結果視窗裡）。 */
function battleStartPos(B,k,i,c){try{const C=window.XQCore,m=battleMode(c);
  if(m==="hold"){const H=battleHoldCfg(B,c);return H?{b:C.parseFen(H.fen),flip:false}:null}
  if(m==="odds"){const O=battleOddsCfg(B,c);if(!O)return null;const b=C.parseFen(C.START);for(const q of O.rm)b[C.parseSq(q)]=null;return{b,flip:false}}
  return battleCouncilPos(k,i)}catch(e){return null}}
function battleCouncil(v,k,i,c,B){battleMig();const F=c.flag,old=((store.get("battlePlan",{})||{})[k]||{})[battleKey(k,c.id)];setTop("⭐ 軍師獻策","^#/battle");setTabs(false);v.className="view";
  battlePicks(k).catch(()=>{}).then(()=>{if(!v.isConnected)return;let pv=null;try{pv=battleStartPos(B,k,i,c)}catch(e){}if(!pv&&battleMode(c)==="puzzle")pv=battleCouncilPos(k,i);
    v.innerHTML=`<div class="pad bt-cn"><div class="lvh"><b>⭐ ${esc(c.name)}・軍師獻策</b><span>${esc(c.year||"")}</span></div><div class="card lvsay">${esc(F.open)}</div>
      ${pv?'<div class="boardbox" id="btCB" style="max-width:280px;margin:0 auto 4px"></div><p class="muted" style="text-align:center;font-size:12px;margin:0 0 8px">選對計策，就從這個局面開打</p>':""}
      <p style="margin:6px 2px"><b>三位軍師各獻一策，你採用哪一策？</b></p><div class="lvch">${F.opts.map((o,j)=>`<button class="btn ghost bt-cn-o" data-o="${j}"><b>${esc(o.who)}</b>「${esc(String(o.say).replace(/^「|」$/g,""))}」</button>`).join("")}</div>
      <div id="btRp"></div>${old?'<button class="btn ghost" id="btSkip" style="width:100%;margin-top:8px">⚔ 直接開打（之前選對過了）</button>':""}</div>`;
    if(pv){try{const bd=Board(()=>{});v.querySelector("#btCB").append(bd.svg);bd.draw(pv.b,{flip:pv.flip})}catch(e){}}
    let miss=0;const rp=v.querySelector("#btRp");
    v.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{const o=F.opts[+b.dataset.o];
      if(!o.ok){miss++;b.disabled=true;vibrate([20,40,20]);rp.innerHTML=`<div class="card lvsay lvno">💭 ${esc(o.re)}<br><span class="muted">這一策在當時行不通，再選一次。</span></div>`;return}
      vibrate(15);v.querySelectorAll("[data-o]").forEach(z=>z.disabled=true);b.classList.remove("ghost");
      const A=store.get("battlePlan",{})||{},E=A[k]||(A[k]={}),q=battleKey(k,c.id);E[q]=E[q]?{...E[q],last:Date.now(),miss:Math.min(E[q].miss|0,miss)}:{at:Date.now(),miss};store.set("battlePlan",A);
      rp.innerHTML=`<div class="card lvsay">✅ ${esc(o.re)}</div><button class="btn" id="btFight" style="width:100%">⚔ 照這一策開打</button>`;rp.querySelector("#btFight").onclick=()=>battleFight(k,i,c);rp.scrollIntoView({behavior:"smooth",block:"nearest"})});
    {const sk=v.querySelector("#btSkip");if(sk)sk.onclick=()=>battleFight(k,i,c)}})}
/* 殘局題的開局（題目資料在 battleData 的 D 裡） */
function battleCouncilPos(k,i){try{const id=(BATTLE_PK[k+"|"+diffNow()]||[])[i],P=id&&BATTLE_D&&BATTLE_D.byId[id];return P&&P.fen?{b:window.XQCore.parseFen(P.fen),flip:P.side==="b"}:null}catch(e){return null}}
function battleFight(k,i,c){BATTLE_PLAN_OK[k+":"+i]=1;if(battleMode(c)==="puzzle")battlePicks(k).then(()=>{location.hash="#/canju/b/"+k+"/"+i});else route()}
/* 打下旗艦戰役：歷史小卡 */
function battleHistHTML(c){const F=c&&c.flag;if(!F)return"";return`<div class="em">📜</div><h2>歷史上其實是這樣</h2><p style="line-height:1.85;text-align:left">${esc(F.hist)}</p>${F.src?`<p class="muted" style="font-size:12px;text-align:left">出處：${esc(F.src)}</p>`:""}`}
/* 守城：星槎小關的 relay 自由段（敵軍先動；走滿 N 步、不被將死、仕相不能丟） */
function battleHold(v,k,i,c,B){const H=battleHoldCfg(B,c),cards=B.eras[k];if(!H){v.innerHTML='<div class="pad"><div class="card muted">這一場的守城局面還在準備。</div></div>';return}
  const kt=battleKeepTxt(H.keep),dn=diffNow(),wall=!(c.play&&c.play.nm);let res=null;
  const G={name:c.name,intro:`${c.trick}：${c.line}`,skill:`${c.lesson}——${wall?"守城":c.play.nm}：先護住帥，仕、相連在一起，不讓敵軍找到破口`,pass:`敵軍先動。撐過 ${H.n} 步：不被將死，${kt}一顆都不能丟`,star3:"一次就撐過、不用提示",rules:{maxMistakes3:0,maxMistakes2:1},
    steps:[{t:"relay",say:H.say||"",start:{fen:H.fen,turn:H.turn||"b"},human:"r",segs:[{who:"you",name:"你",n:H.n,keep:H.keep||[],opp:{ai:H.ai},hint:`${(c.play&&c.play.say)||"守住城牆"}：撐過 ${H.n} 步，${kt}不能丟（被將死也不行）。`,fail:(wall?"城牆破了。":"陣腳亂了。")+"先護住帥，再把仕、相連在一起，再守一次。"}]}],
    outro:`${c.name}・${wall?"城守住了":"撐住了"}！${c.lesson}。`};
  jLevel(v,{id:"bt:"+k+":"+battleKey(k,c.id)+":"+dn,name:c.name},{G,rk:"jRunB",icon:"⚔",back:"#/battle",title:`${eraLabel(k)}・${c.name}・${battleHoldNm(c)}`,
    done:(stars,R)=>{res=battleMark(k,i,"hold:"+c.play.pos,{hint:!!(R&&R.hint)});return stars},
    line:()=>res?`⚔ 已攻下 ${res.n}／${res.all}${res.h?"（用過提示，空心旗）":""}${res.full?"・🏅 "+battleTitleOf(k):""}`:"",
    get next(){const j=battleNextIdx(k,i);return j>=0?[`下一場：${cards[j].name} ›`,()=>{location.hash=battleHref(k,j,cards[j])}]:["回古戰場",()=>goUp("#/battle")]}})}
/* 讓子對弈：說明頁 → 開一盤整盤對弈（你執紅、先拿掉幾顆子）。電腦的等級已經照航行難度排好，jStart 會再加減 diffDx，這裡先扣回去 */
function battleOdds(v,k,i,c,B){const O=battleOddsCfg(B,c);if(!O){v.innerHTML='<div class="pad"><div class="card muted">這一場的讓子設定還在準備。</div></div>';return}
  setTop("⚔ "+c.name,"^#/battle");const nm=(typeof FINE_NM!=="undefined"&&FINE_NM[O.lv-1])||"";
  v.innerHTML=`<div class="pad"><div class="card lvsay">${esc(c.trick)}：${esc(c.line)}</div>
    <div class="card" style="font-size:14px;line-height:1.85">⚖ <b>讓子對弈</b>${c.play.force?`・${esc(c.play.force)}`:""}<br>🎁 你執紅，扮演兵少的一方：先拿掉${esc(O.cut)}<br>⚔ 對手：第 ${O.lv} 級「${esc(nm)}」電腦（🎚 ${esc(diffOf().n)}）<br>🎯 贏這一盤就算攻下；和棋、輸棋都可以再下<br>📘 道理：${esc(c.lesson)}</div>
    <button class="btn" id="btGo" style="width:100%;margin-top:10px">開始對局</button><button class="btn ghost" id="btBk" style="width:100%;margin-top:6px">回古戰場</button></div>`;
  v.querySelector("#btGo").onclick=()=>battleOddsStart(k,i,false);v.querySelector("#btBk").onclick=()=>goUp("#/battle")}
function battleOddsStart(k,i,force){battleData().then(({B})=>{const c=((B.eras||{})[k]||[])[i],O=c&&battleOddsCfg(B,c);if(!O)return toast("找不到這一場的讓子設定");const id="bt:"+k+":"+battleKey(k,c.id),dx=typeof diffDx==="function"?Math.round(+diffDx()||0):0;
  jStart(id,{human:"r",lx:Math.max(1,Math.min(18,O.lv-dx)),journey:id,lv:{fen:"",turn:"r",remove:O.rm}},()=>{if(location.hash==="#/journey/play")route();else location.hash="#/journey/play";setTimeout(()=>toast(`⚔ ${c.name}：讓子對弈，贏了就算攻下`),500)},force)}).catch(e=>toast(e&&e.message||"戰役資料載入失敗"))}
/* 對局頁的「新局 → 重下這一盤」（07-legend.js jAgain 轉過來）：同樣的讓子、同樣的電腦等級 */
function battleOddsAgain(st){return battleData().then(({B})=>{const{k,i}=battleJ(st.journey),c=((B.eras||{})[k]||[])[i],O=c&&battleOddsCfg(B,c);if(!O)throw new Error("找不到這一場的讓子設定");
  return api("/play/new",{human:"r",lx:st.level,journey:st.journey,lv:{fen:"",turn:"r",remove:O.rm}}).then(s=>{store.set("jPending",{id:st.journey,game:s.id});return s})})}
/* 07-legend.js journeyGameEnd 轉過來（journey＝bt:<朝代>:<戰役id>；舊版是第幾張，battleJ 換成 id）：贏了蓋印；結果視窗用 battleResultModal */
function battleOddsEnd(st,P){const{k,id}=battleJ(P.id),win=st.result&&st.result.w===st.human;
  BATTLE_LAST={j:P.id,o:win&&k&&id?battleMarkId(k,id,"odds:"+st.id,{hint:!!P.hint,inline:true}):null}}
function battleResultModal(st,win,draw0,XPR){const{k,i}=battleJ(st.journey),c=battleCard(k,i)||{name:"這一場"},o=BATTLE_LAST&&BATTLE_LAST.j===st.journey?BATTLE_LAST.o:null,j=win?battleNextIdx(k,i):-1;
  const cards=BATTLE_CARDS[k]||[];
  modal(`<div class="em">${win?"⚔":draw0?"🤝":"💪"}</div><h2>${win?esc(c.name)+"・打下來了！":draw0?"和局":"這一仗沒打下來"}</h2><p class="muted">${esc(st.result.why)}・⚖ 讓子對弈</p>`+
    (win&&o?`<p style="font-size:17px;font-weight:900"><span class="bt-seal sm" style="border-color:#B5452B;color:#B5452B">${o.h?"⚐":"🚩"}</span> 已攻下 ${o.n}／${o.all}</p>${battleFullTxt(k,o,0)}`:win?"":'<p class="muted">和棋、輸棋都不算攻下，再下一盤吧！</p>')+(win&&c.flag?`<div class="card bt-hist"><b>📜 歷史上其實是這樣</b><p>${esc(c.flag.hist)}</p></div>`:"")+XPR,
    win?(j>=0&&cards[j]?[[`下一場：${cards[j].name} ›`,()=>goUp("#/battle",()=>{location.hash=battleHref(k,j,cards[j])})],["‹ 回古戰場",()=>goUp("#/battle"),true]]:[["⚔ 回古戰場 ›",()=>goUp("#/battle")]])
      :[["再下一盤 ›",()=>battleOddsStart(k,i,true)],["‹ 回古戰場",()=>goUp("#/battle"),true]],"res")}
/* ---------- 解題頁設定（07c-canju.js CanjuPlay 的 XM；cjXMode 的 b/<朝代>/<第幾張>）---------- */
function battleXM(k,i){const back=()=>"#/battle";if(eraLocked(k))return{err:eraLockMsg(k),back};
  const pk=BATTLE_PK[k+"|"+diffNow()];if(!pk||!pk[i])return{err:"這一張戰役卡要從古戰場頁打開（換了難度也要回去再點一次）。",back};
  if(!battleOpen(k,i))return{err:"照年代一場一場打：先打下前一場。",back};battleAtSet(k,i);
  const c=battleCard(k,i)||{name:"戰役",lesson:""},cards=BATTLE_CARDS[k]||[];
  return{id:pk[i],rk:"cjRunB",back,top:"⚔ 古戰場",icon:"⚔",ans:"看答案這一場就不算打下來，也不能插旗，確定？",
    head:P=>`<b>⚔ ${esc(c.name)}</b>・${esc(c.year||"")}・道理：${esc(c.lesson)}・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span><div class="shp-psay">🗡 ${esc(c.trick||"")}：${esc(c.line||"")}</div>`,
    mark:o=>battleMark(k,i,pk[i],o),done:(o,ans)=>battleDoneHTML(k,i,o,ans)+(typeof chdEggDone==="function"?chdEggDone(k,i,pk[i],o,ans):""),   /* 意見回饋 774 本命定乾坤（07q-chardiff.js）：本命子絕殺解鎖歷史彩蛋卡 */
    next:()=>{const j=battleNextIdx(k,i);return j>=0&&cards[j]?battleHref(k,j,cards[j]):null},nextL:()=>battleNextIdx(k,i)>=0?"下一場":"回古戰場"}}
function battleCard(k,i){try{return BATTLE_CARDS[k][i]}catch(e){return null}}
let BATTLE_CARDS={};
/* 打下來：蓋戰役印（照戰役 id 記）；第一次 +15 修為；一卷 5 場集滿 → 修為＋那一朝一件珍品（珍品是非同步抽的，抽到再跳一張卡），第一次集滿再加稱號 */
function battleMark(k,i,id,o){const c=(BATTLE_CARDS[k]||[])[i];if(!c)return{first:false,h:0,n:0,all:0};return battleMarkId(k,c.id,id,o)}
/* 照戰役 id 蓋印（讓子對弈從對局頁回來時，戰役資料可能還沒載入，所以不靠位置）。07u-women.js 包這個函式做「古戰場的迴響」 */
function battleMarkId(k,cid,id,o){const sl0=typeof sealSideOn==="function"?sealSideOn(k,"battle"):true,sealNw=()=>!sl0&&typeof sealSideOn==="function"&&sealSideOn(k,"battle"),A=battleSealsId(),E=A[k]||(A[k]={}),old=E[cid],h=o&&o.hint?1:0,first=!old;
  if(first)E[cid]=BTL_Y_ON?{at:Date.now(),h,id,c:cid}:{at:Date.now(),h,id};else if(old.h&&!h)E[cid]={...old,h:0,up:Date.now()};battleSealSave(A);
  if(first&&typeof addXP==="function")setTimeout(()=>addXP(15,"古戰場","bt:"+(BTL_Y_ON?cid:k+":"+battleNumKey(k,cid))),1600);
  const C=BATTLE_CARDS[k]||[],ci=C.findIndex(z=>z&&z.id===cid),c=C[ci],vo=(c&&c.vol)||1,ix=C.map((z,j)=>j).filter(j=>(C[j].vol||1)===vo),N=ix.length,n=ix.filter(j=>E[C[j].id]).length;
  let full=false,paid=false,title=false,grand=false,fullP=null;
  if(!BTL_Y_ON){
    /* 總開關關著：跟 11/8 前線上版一樣（卷一集滿＝百戰之將＋珍品＋修為 30；卷二起＝battleVol＋修為 30＋珍品；全部打下＝千古名將），只是照 id 數印 */
    const T=store.get("battleTitle",{})||{};
    if(c&&N&&n>=N){if(vo<2){if(!T[k]){T[k]=Date.now();store.set("battleTitle",T);full=true;title=true;setTimeout(()=>addXP(30,"百戰之將","bt:title:"+k),3200)}}
      else{const V=store.get("battleVol",{})||{},Vk=V[k]||(V[k]={});if(!Vk[vo]){Vk[vo]=Date.now();store.set("battleVol",V);full=true;setTimeout(()=>addXP(30,"古戰場・卷"+(BTL_VN[vo]||vo),"bt:vol:"+k+":"+vo),3200)}}
      if(full){paid=true;fullP=Promise.resolve(typeof cjRelic==="function"?cjRelic(k,{quiet:1}):null).catch(()=>null)}}
    if(C.length>5&&C.every(z=>E[z.id])){const Gd=store.get("battleGrand",{})||{};if(!Gd[k]){Gd[k]=Date.now();store.set("battleGrand",Gd);grand=true;if(!fullP)fullP=Promise.resolve(null)}}
    const ttl=vo<2?shipShort(k)+"・百戰之將":`${eraLabel(k)}・卷${BTL_VN[vo]||vo}`,big=grand?shipShort(k)+"・千古名將":ttl;
    const showFull=()=>{if(fullP)fullP.then(rel=>{const m=()=>modal(`<div class="em">${grand?"🏆":"🏅"}</div><h2>${esc(big)}</h2>${sealNw()&&typeof sealLitHTML==="function"?sealLitHTML(k,"battle"):""}<p>${esc(eraLabel(k))}${vo<2?(C.length>5?"・卷一":""):"・卷"+(BTL_VN[vo]||vo)}五場戰役都打下來了${vo<2?"":"：修為 +30"}。${grand?`全部 ${C.length} 場都打下來，得到稱號「${esc(shipShort(k)+"・千古名將")}」。`:""}</p>${rel?battleRelicHTML(rel):full?(vo<2?'<p class="muted">珍品都收齊了，這次只有稱號。</p>':'<p class="muted">珍品都收齊了，這次沒有珍品。</p>'):""}`,[["好",null]]);
      if(rel&&!rel.named&&typeof relicFx==="function")relicFx(rel.era,rel.it,{from:ttl+"的獎勵"}).then(m);else m()})};
    if(c&&c.flag&&!(o&&o.inline))setTimeout(()=>modal(battleHistHTML(c),[["好",showFull]]),1800);else if(fullP)setTimeout(showFull,2600);
    return{first,h:E[cid].h,n,all:N,full,paid,title,vo,grand,total:C.length,sealNew:sealNw()}}
  /* 一卷 5 場都上線、都打下：每卷只結算一次（battleVolY）；舊版領過的次數先抵（battleVolLegacy） */
  if(c&&N>=5&&n>=N){const V=store.get("battleVolY",{})||{},Vk=V[k]||(V[k]={});if(!Vk[vo]){Vk[vo]=Date.now();store.set("battleVolY",V);full=true;
      const LG=battleLegacy(),lg=LG[k];if(lg&&(lg.n|0)>(lg.used|0)){lg.used=(lg.used|0)+1;store.set("battleVolLegacy",LG)}
      else{paid=true;if(typeof addXP==="function")setTimeout(()=>addXP(30,"古戰場・卷"+(BTL_VN[vo]||vo),"bt:volY:"+k+":"+vo),3200);fullP=Promise.resolve(typeof cjRelic==="function"?cjRelic(k,{quiet:1}):null).catch(()=>null)}
      const T=store.get("battleTitle",{})||{};if(!T[k]){T[k]=Date.now();store.set("battleTitle",T);title=true}
      if(!fullP)fullP=Promise.resolve(null)}}
  if(C.length>=25&&C.every(z=>E[z.id])){const Gd=store.get("battleGrand",{})||{};if(!Gd[k]){Gd[k]=Date.now();store.set("battleGrand",Gd);grand=true;if(!fullP)fullP=Promise.resolve(null)}}
  const ttl=`${eraLabel(k)}・卷${BTL_VN[vo]||vo}`,big=grand?shipShort(k)+"・千古名將":title?shipShort(k)+"・百戰之將":ttl;
  const showFull=()=>{if(fullP)fullP.then(rel=>{const m=()=>modal(`<div class="em">${grand?"🏆":"🏅"}</div><h2>${esc(big)}</h2>${sealNw()&&typeof sealLitHTML==="function"?sealLitHTML(k,"battle"):""}<p>${full?`${esc(eraLabel(k))}・卷${BTL_VN[vo]||vo}五場戰役都打下來了${paid?"：修為 +30":""}。`:""}${title?`得到稱號「${esc(shipShort(k)+"・百戰之將")}」。`:""}${grand?`全部 ${C.length} 場都打下來，得到稱號「${esc(shipShort(k)+"・千古名將")}」。`:""}</p>${full&&!paid?'<p class="muted">這一卷的修為和珍品，你在舊版分卷時已經領過了（古戰場改成照年份分卷，打過的仗都還在）。</p>':""}${rel?battleRelicHTML(rel):paid?'<p class="muted">珍品都收齊了，這次沒有珍品。</p>':""}`,[["好",null]]);
    if(rel&&!rel.named&&typeof relicFx==="function")relicFx(rel.era,rel.it,{from:ttl+"的獎勵"}).then(m);else m()})};   /* Gemini 評估 11/8：跳稱號卡前先播開箱（07i-codex.js） */
  /* 旗艦戰役（方案 C）：先跳「歷史上其實是這樣」，按「好」再跳稱號；讓子對弈的歷史小卡寫在結果視窗裡（o.inline） */
  if(c&&c.flag&&!(o&&o.inline))setTimeout(()=>modal(battleHistHTML(c),[["好",showFull]]),1800);else if(fullP)setTimeout(showFull,2600);
  return{first,h:E[cid].h,n,all:N,full,paid,title,vo,grand,total:C.length,sealNew:sealNw()}}
function battleDoneHTML(k,i,o,ans){if(ans||!o)return`<p class="muted">看了答案，這一場先不算攻下；之後不看答案再解一次就算。</p>`;
  const c=battleCard(k,i)||{};return`<div class="card bt-done"><b>⚔ ${esc(c.name||"")}</b>　<span class="bt-seal sm">${o.h?"⚐":"🚩"}</span><br><span class="muted">已攻下 ${o.n}／${o.all}・${o.h?"用了提示（空心旗）；不看提示再解一次，就換成實心旗。":"自己打下來的。"}${o.first?"修為 +15。":""}</span>
    ${battleFullTxt(k,o,1)}</div>`}
/* 集滿的那一句（意見回饋 767：每卷集滿＝修為 +30＋珍品，舊版領過的先抵；第一次集滿任何一卷＝百戰之將；一朝全部打下＝千古名將）；rel＝1 要寫珍品收在哪裡 */
function battleFullTxt(k,o,rel){if(!o)return"";const vo=o.vo||1,R=rel?"，還有一件珍品（收進「我的角色 → 🏺 珍品」）":"";let t="";
  if(!BTL_Y_ON){const V=BTL_VOL_ON&&(BATTLE_CARDS[k]||[]).length>5;   /* 總開關關著：11/8 前線上版的寫法 */
    if(o.full)t+=vo<2?`<p class="bt-full">🏅 ${esc(eraLabel(k))}${V?"・卷一":""}五場戰役都打下來了！得到稱號「${esc(shipShort(k)+"・百戰之將")}」${R}。</p>`:`<p class="bt-full">🏅 ${esc(eraLabel(k))}・卷${BTL_VN[vo]||vo}五場戰役都打下來了！修為 +30${R}。</p>`}
  else if(o.full)t+=`<p class="bt-full">🏅 ${esc(eraLabel(k))}・卷${BTL_VN[vo]||vo}五場戰役都打下來了！${o.paid?"修為 +30"+R:"（這一卷的獎勵在舊版已經領過）"}${o.title?`，得到稱號「${esc(shipShort(k)+"・百戰之將")}」`:""}。</p>`;
  if(o.sealNew&&!o.sealShown&&typeof sealLitHTML==="function")t+=sealLitHTML(k,"battle");
  if(o.grand)t+=`<p class="bt-full">🏆 ${esc(eraLabel(k))}全部 ${o.total||""} 場戰役都打下來了！得到稱號「${esc(shipShort(k)+"・千古名將")}」。</p>`;return t}
/* 集滿的珍品卡（照 07c-canju.js cjRelicHTML 的樣子，標題換成古戰場） */
function battleRelicHTML(rel){if(rel.named&&typeof cjRelicHTML==="function")return cjRelicHTML(rel);const rk=(typeof RELIC_RK!=="undefined"&&RELIC_RK[rel.it.rarity])||["",""],img=typeof relicImg==="function"?relicImg(rel.era,rel.it.id):"🏺",en=typeof relicEra==="function"?esc(relicEra(rel.era)):"";
  return`<div class="cj-relic"><div class="im">${img}</div><div style="flex:1;min-width:0;text-align:left"><b>🎁 ${BTL_Y_ON?"古戰場集滿":"百戰之將"}的獎勵：${esc(rel.it.name||"")}</b><div class="muted">${en}・${esc(rk[0])}・收進「我的角色 → 🏺 珍品」</div><div class="muted" style="font-size:12.5px;margin-top:4px">${esc(rel.it.desc||"")}</div></div></div>`}
/* battleData 載入後，把卡片也記一份給 XM 用（XM 是同步的） */
let BATTLE_D=null;
/* BTL_HIDE：臨時不讓某幾場出現（戰役 id）。平常的上線開關在 story/battles_list.json 的 on（tools/battles_build.js 沒上線的不寫進 battles2.json）；存檔照 id 記，拿掉幾場位置變了也不會對錯印 */
const BTL_HIDE=[];
{const f=battleData;battleData=function(){return f().then(x=>{if(x.B&&x.B.eras&&!x.B.vf){x.B.vf=1;for(const e in x.B.eras)x.B.eras[e]=x.B.eras[e].filter(c=>c&&!BTL_HIDE.includes(c.id)&&(BTL_VOL_ON||(c.vol||1)<2))}BATTLE_CARDS=(x.B&&x.B.eras)||{};BATTLE_D=x.D||null;return x})}}
