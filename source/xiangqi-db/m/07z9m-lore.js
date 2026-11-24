/* ---------- W87b 地底迷宮的「迷路感」與「歷史感」：暗門（H）與碑刻、殘簡、文書（L）（iMac Claude 1）----------
   開發者 11/24：「45 度斜俯視、更容易迷路的地圖（岔路、死路、暗門）、撿得到碑刻文書講漕運歷史」「這個你這兩天也做一做，你可以找其他三人幫忙」；
   11/23 定的「四大回味感」裡的迷路感（暗門）與歷史感（地窖裡撿到的碑刻、殘簡、文書，每件講一段真實歷史）。
   這支在 m.html 緊接在 07z9m-maze.js 後面：已經登記的派現在包，之後才登記的派由 jhMzDef 包一層時包；包住每一派的 onStep，不改共用的 07z9m-maze.js：
     H＝暗門：看起來跟牆一樣，擋路、擋視線；朝它走第一次只說「牆好像是空心的」，再走一次就推開變成地面（不算回合）。
     L＝碑刻、殘簡、文書：擋路；朝它走就讀到一段歷史（卡片），記進收藏 jhMzLore（每派各自記、只記第一次）；同一件再讀照樣跳卡片，不重複記。
       內容寫在各派 jhMzDef 的 lore:[{id,kind,title:[zh,en],body:[zh,en],src}]，照地圖上 L 由上到下、由左到右的順序對應；沒寫的用一句通用的話代替。
   處理順序：先 H、L，其他字元才交給該派自己的 onStep（例如飛相的推箱子），所以各派不要再用 H、L 當自己的字元。
   事件照共用程式的約定回傳 {ev, msg:[zh,en]} 或 {ev, card:{title,body}}（畫面上顯示 msg、開卡片由共用程式處理）。 */
const JH_MZ_LORE_KEY="jhMzLore";
const JH_MZ_LORE_KIND={stele:["碑刻","Stele"],slip:["殘簡","Bamboo slip"],doc:["文書","Document"]};
/* 收藏：{派:{id:第一次讀到的時間}} */
function jhMzLoreGet(){let o=null;try{o=store.get(JH_MZ_LORE_KEY,null)}catch(e){}return o&&typeof o==="object"&&!Array.isArray(o)?o:{}}
function jhMzLoreSeen(sid){const o=jhMzLoreGet()[sid];return o&&typeof o==="object"?o:{}}
/* 地圖上第幾個 L（由上到下、由左到右）＝lore 的第幾件 */
function jhMzLoreIdx(S,x,y){let n=0;const M=S.lv.map;for(let j=0;j<M.length;j++)for(let i=0;i<M[j].length;i++){if(M[j][i]!=="L")continue;if(i===x&&j===y)return n;n++}return -1}
function jhMzLoreItem(S,x,y){const i=jhMzLoreIdx(S,x,y);if(i<0)return null;const L=S.lv.lore||[];
  return L[i]||{id:"l"+i,kind:"stele",title:["風化的石碑","A weathered stele"],body:["碑上的字被歲月磨得看不清了，只剩幾道深深的刻痕。","Time has worn the carving away; only a few deep grooves remain."]}}
/* 讀一件：第一次讀才記進收藏；回傳是不是第一次 */
function jhMzLoreRead(S,it){const all=jhMzLoreGet(),m=all[S.lv.sid]&&typeof all[S.lv.sid]==="object"?all[S.lv.sid]:{};const first=!m[it.id];
  if(first){m[it.id]=Date.now();all[S.lv.sid]=m;try{store.set(JH_MZ_LORE_KEY,all)}catch(e){}}return first}
/* 走一步之前：H、L 照共用規則；其他交給該派原本的 onStep */
function jhMzLoreStep(S,dx,dy,c,prev){const nx=S.player.x+dx,ny=S.player.y+dy;
  if(c==="H"){S.hBump=S.hBump||{};const k=ny*S.W+nx;
    if(!S.hBump[k]){S.hBump[k]=1;return{ev:"bump",msg:["這面牆敲起來空空的，好像後面還有路。再推一次看看。","This wall sounds hollow, as if there is a way behind it. Push again."]}}
    S.grid[ny][nx]=".";(S.hOpen||(S.hOpen=[])).push(k);return{ev:"secret",msg:["牆往後一沉，露出一條暗道。","The wall sinks back and reveals a hidden passage."]}}
  if(c==="L"){const it=jhMzLoreItem(S,nx,ny);if(!it)return{ev:"wall"};const first=jhMzLoreRead(S,it),K=JH_MZ_LORE_KIND[it.kind]||JH_MZ_LORE_KIND.stele;
    return{ev:"lore",id:it.id,first,card:{title:[`${K[0]}・${it.title[0]}`,`${K[1]} · ${it.title[1]}`],body:[it.body[0]+(it.src?`（出處：${it.src}）`:""),it.body[1]]},
      msg:first?[`收進「${K[0]}」了。`,`Added to your ${K[1].toLowerCase()} collection.`]:null}}
  return typeof prev==="function"?prev(S,dx,dy,c):null}
/* 包住每一派：H、L 擋路；H 擋視線；L 不擋視線（碑不高） */
function jhMzLoreWrap(lv){if(!lv||lv._lore)return;const prev=lv.onStep;
  if(!lv.solid.includes("H"))lv.solid+="H";if(!lv.solid.includes("L"))lv.solid+="L";if(!lv.opaque.includes("H"))lv.opaque+="H";
  lv.onStep=(S,dx,dy,c)=>jhMzLoreStep(S,dx,dy,c,prev);lv._lore=1}
for(const k of Object.keys(JH_MZ_LV))jhMzLoreWrap(JH_MZ_LV[k]);
/* #115 審查（新代理人）：錯 4 次被拖回入口時，共用的 jhMzReset 照地圖重建格子，推開的暗門又關上，但 hBump 還記著「推過一次」——再推一下就開、提示不見了。
   改成：被拖回入口（不是全新開局）時，已經找到的暗門維持打開（玩家記得路）；全新開局才清掉推過、開過的紀錄 */
try{if(typeof jhMzReset==="function"&&!jhMzReset.lore){const r0=jhMzReset;jhMzReset=function(S,full){const v=r0(S,full);
  if(S){if(full){S.hBump={};S.hOpen=[]}else for(const k of S.hOpen||[]){const y=Math.floor(k/S.W),x=k%S.W;if(S.grid[y]&&S.grid[y][x]==="H")S.grid[y][x]="."}}return v};jhMzReset.lore=1}}catch(e){}
/* 之後才登記的派也包到（jhMzDef 包一層） */
try{if(typeof jhMzDef==="function"&&!jhMzDef.lore){const d0=jhMzDef;jhMzDef=function(sid,o){const lv=d0(sid,o);jhMzLoreWrap(lv);return lv};jhMzDef.lore=1}}catch(e){}
/* 3D 外觀：暗門畫成跟牆同色調的方塊（開了就不畫）；碑刻是一塊立著的灰石板加底座 */
JH_MZ_OBJ.H=H=>{const{T3,mesh,lam,WH}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,WH,1),lam("#4a3d30"),0,WH/2,0));return g};
JH_MZ_OBJ.L=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.5,.12,.3),lam("#5c564c"),0,.06,0));g.add(mesh(new T3.BoxGeometry(.38,.62,.1),lam("#8a8478"),0,.43,0));
  g.add(mesh(new T3.BoxGeometry(.3,.04,.11),lam("#4a463e"),0,.6,.001));return g};
/* 平面版 */
JH_MZ_TILE.H=(cx,px,py,T)=>{cx.fillStyle="#3a2e24";cx.fillRect(px,py,T,T);cx.strokeStyle="rgba(0,0,0,.35)";cx.lineWidth=1;for(let i=1;i<4;i++){cx.beginPath();cx.moveTo(px,py+T*i/4);cx.lineTo(px+T,py+T*i/4);cx.stroke()}};
JH_MZ_TILE.L=(cx,px,py,T)=>{cx.fillStyle="rgba(0,0,0,.35)";cx.beginPath();cx.ellipse(px+T*.5,py+T*.88,T*.34,T*.08,0,0,7);cx.fill();
  cx.fillStyle="#8a8478";cx.strokeStyle="#3e3a32";cx.lineWidth=1.6;cx.fillRect(px+T*.3,py+T*.18,T*.4,T*.62);cx.strokeRect(px+T*.3,py+T*.18,T*.4,T*.62);
  cx.strokeStyle="rgba(50,46,40,.7)";cx.lineWidth=1;for(let i=0;i<4;i++){cx.beginPath();cx.moveTo(px+T*(.36+i*.08),py+T*.26);cx.lineTo(px+T*(.36+i*.08),py+T*.7);cx.stroke()}};
