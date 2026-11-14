/* ================= 🀄 聽雨茶坊・臺灣暗棋（開發者 11/14：西市第一個開張的攤＝茶坊中間那張暗棋桌 xsmDark；前綴 xsd／XSD，11/14 grep 過 m/*.js、m.css 都沒有）=================
   文案照 story/西市文案定稿草案_1113.md（第一節 5：短版、完整版規則、掌櫃台詞「先翻，才知命。」；第五節 14 殘局自動保留、15 第一顆翻出的顏色定陣營、16 吃光或無棋可走贏、50 手無吃無翻判和）；
   規則照 story/新手體驗定案_141_兩輪討論.md 暗棋定案：不連吃、兵可吃帥、帥不可吃兵、炮隔一子跳吃、50 手沒吃也沒翻判和（星霧暗子不叫暗棋，跟這裡無關）。
   路由 #/ximarket/dark（07xsm XsmPage 轉過來；頂欄返回＝回聽雨茶坊）。玩家對電腦、手機直式 4 欄 × 8 列；橫的畫面（電腦、iPad 橫放）轉成 8 欄 × 4 列，規則一樣。
   不計分、不進大廳、不碰線上對戰。存檔鍵（05b JOURNEY_KEYS）：xsdRec＝勝、和、負局數 {w,d,l}；xsdRun＝下到一半的那一盤（離開自動保留，回來接著下）。xsdLv＝電腦難度（easy 新手／norm 一般；第一次玩＝新手；規則卡、結果視窗切換，開發者 11/14）。
   純函式（不碰 DOM）：xsdDeal／xsdNew／xsdEats／xsdMoves／xsdActs／xsdDo／xsdJudge／xsdThink…；測試 xiangqi-lab/tools/test-xsm-dark.js 用 vm 跑。
   電腦：看得到的子＋還蓋著的子「一共剩哪些」（公開資訊，不偷看蓋著的是哪顆）；走子、吃子用 alpha-beta 搜 3 層＋吃子延伸；翻子算期望值：這格翻出每一種可能的子各搜一次、照剩下的張數加權平均。
     黑洞超展開的自寫引擎（xiangqi-lab/src/varengine.js）是整張棋盤的標準走法，暗棋的半盤、蓋子、翻子都不一樣，共用不了，另寫這個小的。 */
const XSD_ON=true;
const XSD_DRAW=50;   /* 連續幾手（一方走一次算一手）沒吃子也沒翻子就判和 */
/* 棋子代號：低 3 位＝種類（1 兵 2 炮 3 傌 4 俥 5 相 6 仕 7 帥）、+8＝黑、+16＝還蓋著；0＝空格 */
const XSD_SET=[7,6,6,5,5,4,4,3,3,2,2,1,1,1,1,1];   /* 一方 16 子 */
const XSD_L=" PCNRBAK";   /* 種類 → 00-util NAMES 的字母 */
const XSD_TX={short:"翻開才知道是哪顆棋；大吃小，兵能吃帥，炮要隔一顆跳著吃。",
  long:"32 顆棋蓋在 4×8 格裡，輪流翻棋或走棋；大可吃小、同級可吃，兵可吃帥、帥不可吃兵，炮隔一子跳吃，不連吃；50 手沒有吃子也沒有翻棋就算和棋。",
  rank:"棋子大小：帥（將）＞仕（士）＞相（象）＞俥（車）＞傌（馬）＞炮（包）＞兵（卒）。",
  intro:"暗棋是在臺灣很流行的象棋玩法：棋子先蓋著，翻開才知道是哪一顆。",
  open:"先翻，才知命。",kingFirst:"頭一翻就是{k}？好兆頭。",pawnKing:"小兵也能扳倒大帥，這就是暗棋。",lose:"茶還熱著，再翻一局。"};
/* ---------- 盤面：格子 i＝列×4＋欄（4 欄 × 8 列）；鄰格與四個方向的直線（炮跳吃用） ---------- */
const XSD_NB=[],XSD_RAY=[];
for(let i=0;i<32;i++){const x=i%4,y=(i/4)|0;XSD_NB[i]=[];XSD_RAY[i]=[];
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const r=[];let a=x+dx,b=y+dy;while(a>=0&&a<4&&b>=0&&b<8){r.push(b*4+a);a+=dx;b+=dy}if(r.length){XSD_NB[i].push(r[0]);XSD_RAY[i].push(r)}}}
const xsdKind=p=>p&7,xsdCol=p=>(p>>3)&1,xsdHid=p=>!!(p&16);
/* 可重現的亂數（測試、量測用；App 裡用 Math.random） */
function xsdRng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
/* 發牌：紅黑各 16 子全部蓋著，亂數擺 */
function xsdDeal(rnd){rnd=rnd||Math.random;const a=[];for(const k of XSD_SET)a.push(k|16,k|8|16);
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}return a}
/* 一盤：玩家 0＝你、1＝電腦；cur＝輪到誰；col＝[你的顏色, 電腦的顏色]（0 紅 1 黑；第一顆翻開以前是 null）；q＝連續沒吃沒翻的手數；
   cap＝[你吃到的, 電腦吃到的]；h＝最近幾個盤面（電腦避免來回走）；last＝上一手（畫面標示） */
function xsdNew(rnd,first){return{b:xsdDeal(rnd),cur:first?1:0,col:null,q:0,n:0,flips:0,cap:[[],[]],h:[],last:null,over:null}}
/* a 能不能吃 t（都是種類 1～7；炮不走這條，炮只能跳吃）：大吃小、同級可吃；兵可吃帥、帥不可吃兵 */
function xsdEats(a,t){if(a===7&&t===1)return false;if(a===1&&t===7)return true;return a>=t}
/* 顏色 c 的所有走法（代號 從×32＋到；從＝到＝翻那一格）。flips＝要不要列翻子；caps＝只列吃子 */
function xsdMoves(b,c,flips,caps){const o=[];
  for(let i=0;i<32;i++){const p=b[i];if(!p)continue;
    if(p&16){if(flips)o.push(i*33);continue}
    if(((p>>3)&1)!==c)continue;const k=p&7;
    if(k===2){for(const r of XSD_RAY[i]){if(!caps&&!b[r[0]])o.push(i*32+r[0]);let j=0;while(j<r.length&&!b[r[j]])j++;j++;while(j<r.length&&!b[r[j]])j++;
        if(j<r.length){const t=b[r[j]];if(!(t&16)&&((t>>3)&1)!==c)o.push(i*32+r[j])}}}   /* 炮：走一格；隔一子（蓋著的也算）跳吃翻開的敵子，大小不論 */
    else for(const j of XSD_NB[i]){const t=b[j];if(!t){if(!caps)o.push(i*32+j)}else if(!(t&16)&&((t>>3)&1)!==c&&xsdEats(k,t&7))o.push(i*32+j)}}
  return o}
/* 這一盤輪到的人能做什麼（第一顆翻開以前只能翻） */
function xsdActs(S){if(!S||S.over)return[];if(!S.col)return xsdMoves(S.b,0,true,true).filter(a=>((a/32)|0)===a%32);return xsdMoves(S.b,S.col[S.cur],true,false)}
/* 顏色 c 還有幾子（蓋著的也算） */
function xsdCount(b,c){let n=0;for(const p of b)if(p&&((p>>3)&1)===c)n++;return n}
/* 判勝負（輪到 S.cur）：對方吃光 → 贏；輪到的人翻不了也走不了 → 輸；連續 XSD_DRAW 手沒吃沒翻 → 和。w＝贏的玩家，-1＝和 */
function xsdJudge(S){if(!S.col)return null;const me=S.cur,c=S.col[me];
  if(!xsdCount(S.b,c))return{w:1-me,why:"eat"};
  if(!xsdMoves(S.b,c,true,false).length)return{w:1-me,why:"stuck"};
  if(S.q>=XSD_DRAW)return{w:-1,why:"draw"};return null}
const xsdKey=(b,c)=>b.map(p=>p&16?16:p).join(",")+"|"+c;   /* 蓋著的只記「蓋著」，不記是什麼 */
/* 下一手（不改原本那盤，回傳新的一盤）；不合法回 null。不連吃：吃完就換人 */
function xsdDo(S,a){if(!S||S.over||xsdActs(S).indexOf(a)<0)return null;
  const b=S.b.slice(),f=(a/32)|0,t=a%32,me=S.cur,N={b,cur:1-me,col:S.col?S.col.slice():null,q:S.q+1,n:S.n+1,flips:S.flips,cap:[S.cap[0].slice(),S.cap[1].slice()],h:S.h?S.h.slice():[],last:null,over:null};
  if(f===t){const p=b[f]&15;b[f]=p;N.q=0;N.flips++;N.h=[];if(!N.col){const c=(p>>3)&1;N.col=me?[1-c,c]:[c,1-c]}N.last={t:"f",i:f,p,by:me}}
  else{const x=b[t];b[t]=b[f];b[f]=0;if(x){N.q=0;N.cap[me].push(x);N.h=[]}else N.h=N.h.concat(xsdKey(b,N.cur)).slice(-16);N.last={t:x?"c":"m",f,to:t,p:b[t],x,by:me}}
  N.over=xsdJudge(N);return N}
/* ---------- 電腦 ---------- */
const XSD_WIN=100000;
/* 子力：帥的價值看對方還剩幾個兵（兵會吃帥）；兵在對方帥還在時比較值錢 */
function xsdMat(b){const M=[{n:0,k:0,p:0,ph:0},{n:0,k:0,p:0,ph:0}];for(const p of b){if(!p)continue;const m=M[(p>>3)&1],k=p&7;m.n++;if(k===7)m.k=1;if(k===1)m.p++}return M}
const XSD_BASE=[0,0,16,6,10,18,30,0];
function xsdVal(k,M,c){if(k===7)return 40+5*(5-M[1-c].p);if(k===1)return M[1-c].k?8:3;return XSD_BASE[k]}
/* 靜態評估（站在顏色 c 這邊）：子力（蓋著的也照顏色算，這是公開資訊）＋看得到的子互相逼近（贏面大的一方會去追）；領先時拖手數扣一點，免得一直磨到和棋 */
function xsdEval(b,c,q){const M=xsdMat(b),U=[];let s=0;
  for(let i=0;i<32;i++){const p=b[i];if(!p)continue;const pc=(p>>3)&1,v=xsdVal(p&7,M,pc);if(p&16)s+=pc===c?v*.92:-v*.92;else{s+=pc===c?v:-v;U.push(i)}}
  const kw=U.length===M[0].n+M[1].n&&Math.min(M[0].n,M[1].n)<=3?.5:.12;   /* 殘局（都翻開了、有一方剩 3 子以下）：逼近的分數加重，才會去圍 */
  for(const i of U){const p=b[i],pc=(p>>3)&1,k=p&7;if(k===2)continue;const xi=i%4,yi=(i/4)|0;
    for(const j of U){const t=b[j];if(((t>>3)&1)===pc||!xsdEats(k,t&7))continue;
      const g=xsdVal(t&7,M,1-pc)*kw/(Math.abs(xi-j%4)+Math.abs(yi-((j/4)|0))+1);s+=pc===c?g:-g}}
  if(q&&s>8)s-=q*.08;else if(q&&s<-8)s+=q*.08;
  return s}
/* 走一步（就地改 b，回傳被吃的子）、悔回去 */
const xsdMk=(b,a)=>{const f=(a/32)|0,t=a%32,x=b[t];b[t]=b[f];b[f]=0;return x};
const xsdUn=(b,a,x)=>{const f=(a/32)|0,t=a%32;b[f]=b[t];b[t]=x};
/* 吃子排前面（先吃大的） */
function xsdOrder(b,L){return L.map(a=>[a,b[a%32]?(b[a%32]&7)*10-(b[(a/32)|0]&7):-1]).sort((x,y)=>y[1]-x[1]).map(x=>x[0])}
/* 只看吃子的延伸搜尋（最多再看 4 手吃子；子多的盤面吃來吃去會爆炸） */
function xsdQ(b,c,al,be,X,ply,qd){qd=qd|0;X.n++;if(X.dl&&!(X.n&1023)&&Date.now()>X.dl)throw XSD_STOP;let sp=xsdEval(b,c,0);if(sp>=be)return sp;if(sp>al)al=sp;if(qd>=4)return sp;
  for(const a of xsdOrder(b,xsdMoves(b,c,false,true))){const x=xsdMk(b,a);let v;if(!xsdCount(b,1-c))v=XSD_WIN-ply;else v=-xsdQ(b,1-c,-be,-al,X,ply+1,qd+1);xsdUn(b,a,x);
    if(v>=be)return v;if(v>al)al=v}
  return al}
/* alpha-beta（樹裡不展開翻子；還有蓋著的子時，輪到的人可以「翻一顆」當作讓一手，用讓手搜尋代替） */
function xsdAB(b,c,d,al,be,q,X,ply){X.n++;if(X.dl&&!(X.n&1023)&&Date.now()>X.dl)throw XSD_STOP;
  if(!xsdCount(b,c))return-(XSD_WIN-ply);
  if(q>=XSD_DRAW)return 0;
  if(d<=0)return xsdQ(b,c,al,be,X,ply);
  const L=xsdMoves(b,c,false,false);let hid=false;for(const p of b)if(p&16){hid=true;break}
  if(!L.length&&!hid)return-(XSD_WIN-ply);
  let best=-Infinity;
  if(hid){best=-xsdAB(b,1-c,d-1,-be,-al,0,X,ply+1);if(best>=be)return best;if(best>al)al=best}
  for(const a of xsdOrder(b,L)){const x=xsdMk(b,a);let v;if(x&&!xsdCount(b,1-c))v=XSD_WIN-ply;else v=-xsdAB(b,1-c,d-1,-be,-al,x?0:q+1,X,ply+1);xsdUn(b,a,x);
    if(v>best)best=v;if(v>al)al=v;if(al>=be)break}
  return best}
/* 還蓋著的子有哪些（代號去掉「蓋著」→ 張數）：大家都數得出來 */
function xsdPool(b){const P={};let n=0;for(const p of b)if(p&16){const k=p&15;P[k]=(P[k]||0)+1;n++}return{P,n}}
const XSD_STOP={stop:1};
/* 搜一層深度 D 的根：每個走法的分數 [[a,v]…]（翻子＝這格翻出各種子的加權平均） */
function xsdRoot(S,A,D,X){const me=S.cur,c=S.col[me],b=S.b.slice(),{P,n}=xsdPool(b),seen=new Set(S.h||[]),R=[],ks=Object.keys(P).map(Number);
  /* 不偷看：蓋著的格子一律照「剩下哪些」重新排過（由小到大依序填），電腦算的時候不知道哪格是什麼 */
  const Hc=[],pool=[];for(let i=0;i<32;i++)if(b[i]&16)Hc.push(i);for(const k of ks)for(let j=0;j<P[k];j++)pool.push(k);
  const fill=(skip,k)=>{let r=k==null?-1:pool.indexOf(k),j=0;for(const i of Hc){if(i===skip)continue;if(j===r)j++;b[i]=pool[j++]|16}};fill(-1,null);
  /* 蓋著的格子 × 可能的子太多時（開局 30 格 × 14 種），翻子少搜一層 */
  let bst=-Infinity;const W=2;   /* 走子只要確定「比目前最好的差 W 分以上」就不用算準（剪枝）；翻子要加權平均，每種都算準 */
  const fd=Math.max(0,A.filter(a=>((a/32)|0)===a%32).length*ks.length>90?D-2:D-1);
  const O=A.map(a=>{const f=(a/32)|0,t=a%32;return[a,f===t?-50:b[t]?(b[t]&7)*10-(b[f]&7):0]}).sort((x,y)=>y[1]-x[1]).map(x=>x[0]);   /* 先算吃子、再走子、最後翻子（只看翻開的子排序，不看蓋著的是什麼） */
  for(const a of O){const f=(a/32)|0,t=a%32;let v;
    if(f===t){v=0;try{for(const k of ks){fill(f,k);b[f]=k;v+=P[k]/n*-xsdAB(b,1-c,fd,-Infinity,Infinity,0,X,1)}}finally{fill(-1,null)}}
    else{const x=xsdMk(b,a);try{if(x&&!xsdCount(b,1-c))v=XSD_WIN;else{v=-xsdAB(b,1-c,D-1,-Infinity,-(bst-W),x?0:S.q+1,X,1);if(!x&&seen.has(xsdKey(b,1-me)))v-=3}}finally{xsdUn(b,a,x)}}
    if(v>bst)bst=v;R.push([a,v])}
  return R}
/* 電腦想一手：回傳 {a, v, ms, n, d}。o.depth＝固定搜幾層（測試用）；沒給就從 2 層開始加深，超過 o.ms（預設 700 毫秒）就用上一層搜完的結果。
   o.rnd＝亂數、o.noise＝差不多好的走法隨機挑一個（預設 .6，免得每盤都一樣） */
/* 難度（開發者 11/14）：easy＝新手（第一次玩預設），norm＝一般（上面這套照算）。
   新手會故意犯錯：rand 的機率整手隨便走（合法的）、skip 的機率看漏吃子（有別的走法時不吃）、少搜一層、最多 2 層、差不多好的範圍放寬（noise） */
const XSD_LV={easy:"新手",norm:"一般"};
const XSD_EASY={rand:.1,skip:.35,noise:.9,max:2};   /* noise 放太大（2.5）殘局會亂走、一直和棋，量過 .9 剛好 */
/* o.lv＝"easy" 走新手 */
function xsdThink(S,o){o=o||{};const ez=o.lv==="easy",t0=Date.now(),rnd=o.rnd||Math.random,X={n:0},noise=o.noise==null?(ez?XSD_EASY.noise:.6):o.noise;
  const A0=xsdActs(S);if(!A0.length)return null;
  if(!S.col){const a=A0[Math.floor(rnd()*A0.length)];return{a,v:0,ms:Date.now()-t0,n:0,d:0}}   /* 第一手：隨便翻一顆 */
  if(ez&&rnd()<XSD_EASY.rand){const a=A0[Math.floor(rnd()*A0.length)];return{a,v:0,ms:Date.now()-t0,n:0,d:0,mis:"rand"}}
  let A=A0,mis=null;if(ez&&rnd()<XSD_EASY.skip){const nc=A0.filter(a=>((a/32)|0)===a%32||!S.b[a%32]);if(nc.length&&nc.length<A0.length){A=nc;mis="skip"}}
  let R=null,dd=0;const mx=ez?XSD_EASY.max:(o.max||4);
  if(o.depth){dd=ez?Math.max(1,o.depth-1):o.depth;R=xsdRoot(S,A,dd,X)}
  else{R=xsdRoot(S,A,1,X);dd=1;X.dl=t0+(o.ms||700);
    for(let D=2;D<=mx;D++){try{R=xsdRoot(S,A,D,X);dd=D}catch(e){if(e!==XSD_STOP)throw e;break}if(Date.now()-t0>(o.ms||700)*.35)break}}
  R.sort((x,y)=>y[1]-x[1]);const top=R.filter(r=>r[1]>=R[0][1]-noise),pick=top[Math.floor(rnd()*top.length)];
  return{a:pick[0],v:pick[1],ms:Date.now()-t0,n:X.n,d:dd,mis}}
/* 目前選的難度（沒選過＝新手） */
function xsdLv(){let v=null;try{v=store.get("xsdLv",null)}catch(e){}return v==="norm"?"norm":"easy"}
/* ---------- 紀錄 ---------- */
function xsdRec(){let r=null;try{r=store.get("xsdRec",null)}catch(e){}r=r&&typeof r==="object"?r:{};return{w:r.w|0,d:r.d|0,l:r.l|0}}
/* 一盤結束記一筆（玩家 0 的角度）：o.w 0＝你贏、1＝電腦贏、-1＝和 */
function xsdTally(R,o){R=Object.assign({w:0,d:0,l:0},R);if(o.w===0)R.w++;else if(o.w===1)R.l++;else R.d++;return R}
/* 存檔的那一盤合不合用（讀到壞資料就當沒有） */
function xsdOkRun(S){return!!(S&&typeof S==="object"&&Array.isArray(S.b)&&S.b.length===32&&S.b.every(p=>Number.isInteger(p)&&p>=0&&p<32)&&(S.cur===0||S.cur===1)&&(S.col===null||(Array.isArray(S.col)&&S.col.length===2))&&Array.isArray(S.cap)&&!S.over&&(S.lv==null||!!XSD_LV[S.lv]))}
/* ---------- 畫面 ---------- */
const XSD_RM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const XSD_INK=["#B3261E","#1B1F1C"];
const xsdName=p=>{const s=(p>>3)&1?"b":"r";return(typeof NAMES!=="undefined"?NAMES[s][XSD_L[p&7]]:"")||""};
const xsdSide=c=>c?"黑":"紅";
function xsdCss(){if(document.getElementById("xsdCss"))return;document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest(".xsd-lv");if(b)xsdSetLv(b.dataset.lv,b)});const s=document.createElement("style");s.id="xsdCss";s.textContent=`
body:has(.xsd-page) .xqbot{visibility:hidden!important}
.xsd-page.wide .xsd-bar,.xsd-page.wide .xsd-foot{max-width:900px}
.xsd-page{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 16px calc(12px + env(safe-area-inset-bottom,0px));--xsdRes:250px}
.xsd-say{min-height:24px;font-size:15px;font-weight:700;color:var(--ink);text-align:center;letter-spacing:.04em}
.xsd-bar{display:flex;gap:8px;width:100%;max-width:540px;align-items:stretch}
.xsd-pl{flex:1;display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:var(--card);font-size:14px;color:var(--muted);min-height:44px;box-sizing:border-box}
.xsd-pl b{color:var(--ink);font-size:15px}.xsd-pl i{font-style:normal;margin-left:auto;font-weight:900}.xsd-pl.on{border-color:var(--accent2);box-shadow:0 0 0 2px var(--accent2) inset;color:var(--ink)}
.xsd-pl .c0{color:${XSD_INK[0]}}.xsd-pl .c1{color:var(--ink)}
.xsd-st{min-height:40px;font-size:14px;line-height:20px;color:var(--muted);text-align:center;display:flex;align-items:center;justify-content:center}
.xsd-st.busy::after{content:"";display:inline-block;width:1.2em;text-align:left;animation:xsdDots 1.2s steps(4) infinite}
@keyframes xsdDots{0%{content:""}25%{content:"．"}50%{content:"．．"}75%{content:"．．．"}}
.xsd-board{position:relative;display:grid;width:min(100%,540px,calc(var(--xsdH,calc(100dvh - var(--xsdRes))) / 2));aspect-ratio:1/2;padding:6px;box-sizing:border-box;border-radius:12px;
  background:linear-gradient(160deg,#E9C48A,#B9813F);box-shadow:0 3px 10px #0005,inset 0 0 0 2px #6d4519}
.xsd-board.wide{width:min(100%,900px,calc(var(--xsdH,calc(100dvh - var(--xsdRes))) * 2));aspect-ratio:2/1}
.xsd-c{position:relative;margin:0;padding:0;border:0;background:transparent;border-right:1px solid #4A2E1266;border-bottom:1px solid #4A2E1266;min-width:0;min-height:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.xsd-c:focus-visible{outline:3px solid var(--accent2);outline-offset:-3px;z-index:2}
.xsd-c.lt{background:#ffffff38}.xsd-c.lt2{background:#ffd76a55}
.xsd-c svg{position:absolute;left:7%;top:7%;width:86%;height:86%;overflow:visible;pointer-events:none}
.xsd-c.sel svg{transform:translateY(-6%) scale(1.06)}
.xsd-c.sel::after{content:"";position:absolute;inset:3%;border-radius:50%;border:4px solid var(--accent2);box-shadow:0 0 0 2px #fff8;pointer-events:none;z-index:2}
.xsd-c .dot{position:absolute;left:50%;top:50%;width:24%;height:24%;margin:-12% 0 0 -12%;border-radius:50%;background:var(--accent2);opacity:.75;pointer-events:none}
.xsd-c .ring{position:absolute;inset:5%;border-radius:50%;border:4px solid #D83A2E;pointer-events:none;z-index:1}
.xsd-c.fl svg{animation:xsdFlip .34s ease-out}
.xsd-c.mv svg{animation:xsdMv .24s ease-out}
.xsd-ghost{position:absolute;inset:0;pointer-events:none;z-index:3;animation:xsdEat .5s ease-in forwards}
.xsd-pop{position:absolute;left:50%;top:-6%;transform:translateX(-50%);font-weight:900;font-size:clamp(16px,5vw,24px);color:#fff;text-shadow:0 0 4px #000,0 0 2px #000;pointer-events:none;z-index:4;animation:xsdPop .7s ease-out forwards}
@keyframes xsdFlip{0%{transform:scaleX(.05)}100%{transform:scaleX(1)}}
@keyframes xsdMv{0%{transform:translate(var(--dx),var(--dy))}100%{transform:none}}
@keyframes xsdEat{0%{transform:scale(1);opacity:1}100%{transform:scale(1.4) rotate(12deg);opacity:0}}
@keyframes xsdPop{0%{opacity:0;transform:translate(-50%,20%)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%)}}
.xsd-caps{display:flex;gap:6px;width:100%;max-width:760px;font-size:13px;color:var(--muted);align-items:center;min-height:22px;flex-wrap:wrap;justify-content:center}
.xsd-caps{column-gap:3px;row-gap:2px}.xsd-caps em{font-style:normal;margin:0 2px}.xsd-caps span{display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;border-radius:50%;background:#F3DDB4;border:1px solid #8A5A28;font-weight:900;font-size:12px;font-family:var(--serif)}
.xsd-foot{display:flex;gap:8px;width:100%;max-width:420px}
.xsd-foot button{flex:1;min-height:44px;margin:0;padding:8px}
.xsd-lvsw{display:flex;align-items:center;justify-content:center;gap:6px;margin:10px 0 2px;flex-wrap:wrap}.xsd-lvsw>span{font-weight:700;color:var(--ink)}
.xsd-lv{min-width:72px;min-height:44px;padding:6px 14px;border-radius:22px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);font-weight:700;font-size:15px}
.xsd-lv[aria-pressed="true"]{background:var(--accent2);border-color:var(--accent2);color:#fff}.xsd-lv:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.xsd-lvtip{font-size:13px;color:var(--muted);text-align:center;margin:2px 0 0}.xsd-pl small{font-size:12px;color:var(--muted);font-weight:700}
.xsd-card summary{min-height:44px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;font-weight:700;color:var(--accent2);list-style:none}.xsd-card summary::-webkit-details-marker{display:none}.xsd-card summary::before{content:"▸";transition:transform .2s}.xsd-card details[open] summary::before{transform:rotate(90deg)}
.xsd-card .r{font-size:15px;line-height:1.6}
@media (max-height:720px){.xsd-page{gap:4px;padding-top:4px}.xsd-pl{min-height:36px;padding:4px 10px}.xsd-say{min-height:20px;font-size:14px}}   /* 矮的手機（375×667）：格子才保得住 44px */
@media (prefers-reduced-motion:reduce){.xsd-c.fl svg,.xsd-c.mv svg,.xsd-ghost,.xsd-pop,.xsd-st.busy::after{animation:none}.xsd-ghost,.xsd-pop{display:none}.xsd-c.sel svg{transform:none}}`;document.head.append(s)}
/* 棋子的木頭漸層（整頁共用一份） */
const XSD_DEFS=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="xsdSh"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".6" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<linearGradient id="xsdSd" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#9A6633"/><stop offset=".8" stop-color="#6E4219"/><stop offset="1" stop-color="#4A2A0E"/></linearGradient>
<radialGradient id="xsdTp" cx=".42" cy=".34" r=".72"><stop offset="0" stop-color="#FFF7E6"/><stop offset=".5" stop-color="#F3DDB4"/><stop offset=".86" stop-color="#DDB57E"/><stop offset="1" stop-color="#B98A50"/></radialGradient>
<radialGradient id="xsdBk" cx=".42" cy=".34" r=".75"><stop offset="0" stop-color="#E2B57A"/><stop offset=".6" stop-color="#C08A4C"/><stop offset="1" stop-color="#8E5E2A"/></radialGradient>
<linearGradient id="xsdRm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
</defs></svg>`;
/* 一顆棋子（照 01-board 的立體木棋子：落影、側面、頂面、倒角亮邊、內圈、刻字）；蓋著的＝素面木色背面 */
function xsdPc(p){if(!p)return"";const H=`<ellipse cx="52" cy="58" rx="44" ry="41" fill="url(#xsdSh)"/><circle cx="50" cy="57" r="43" fill="url(#xsdSd)" stroke="#3E2309" stroke-width="1"/>`;
  if(p&16)return`<svg viewBox="0 0 100 100" aria-hidden="true">${H}<circle cx="50" cy="50" r="43" fill="url(#xsdBk)" stroke="#6A4118" stroke-width="1.2"/><circle cx="50" cy="50" r="41" fill="none" stroke="url(#xsdRm)" stroke-width="3"/><circle cx="50" cy="50" r="31" fill="none" stroke="#7A4D1E" stroke-width="1.3" opacity=".55"/><ellipse cx="40" cy="30" rx="15" ry="6" fill="#fff" opacity=".22" transform="rotate(-20 40 30)"/></svg>`;
  const col=XSD_INK[(p>>3)&1],ch=xsdName(p);
  return`<svg viewBox="0 0 100 100" aria-hidden="true">${H}<circle cx="50" cy="50" r="43" fill="url(#xsdTp)" stroke="#8A5A28" stroke-width="1.2"/><circle cx="50" cy="50" r="41" fill="none" stroke="url(#xsdRm)" stroke-width="3"/><ellipse cx="40" cy="30" rx="15" ry="6" fill="#fff" opacity=".3" transform="rotate(-20 40 30)"/><circle cx="50" cy="50" r="34" fill="none" stroke="${col}" stroke-width="2.6" opacity=".9"/>`+
    `<text x="50" y="51" dy=".35em" text-anchor="middle" font-size="44" font-weight="900" style="font-family:var(--serif)" fill="#fff" opacity=".7" transform="translate(0 1.4)">${ch}</text><text x="50" y="51" dy=".35em" text-anchor="middle" font-size="44" font-weight="900" style="font-family:var(--serif)" fill="${col}">${ch}</text></svg>`}
let XSD=null;   /* 這一頁：{P, S, sel, busy, tm[], wide} */
const xsdWideNow=()=>{try{return innerWidth>innerHeight*1.05}catch(e){return false}};
/* 格子 i 在畫面上的 [欄, 列]（從 1 起）：直式 4×8；橫式轉成 8×4 */
const xsdPos=(i,wide)=>wide?[((i/4)|0)+1,(i%4)+1]:[(i%4)+1,((i/4)|0)+1];
function xsdLoadRun(){let S=null;try{S=store.get("xsdRun",null)}catch(e){}return xsdOkRun(S)?Object.assign({h:[],n:0,flips:0,last:null},S,{over:null}):null}
function xsdSave(){if(!XSD)return;try{const S=XSD.S;if(!S||S.over)store.set("xsdRun",null);else store.set("xsdRun",S)}catch(e){}}
function xsdSay(t){if(!XSD)return;const e=XSD.P.querySelector(".xsd-say");if(e)e.textContent=t||""}
function xsdStatus(t,busy){if(!XSD)return;const e=XSD.P.querySelector(".xsd-st");if(e){e.textContent=t||"";e.classList.toggle("busy",!!busy)}}
function xsdTgts(){const X=XSD;if(!X||X.sel<0||!X.S.col)return{};const o={};for(const a of xsdActs(X.S))if(((a/32)|0)===X.sel&&a%32!==X.sel)o[a%32]=X.S.b[a%32]?"c":"m";return o}
function xsdLabel(i,p,tg,wide){const[c,r]=xsdPos(i,wide);let t=`第 ${r} 列第 ${c} 格，`;t+=!p?"空格":(p&16)?"蓋著的棋":xsdSide((p>>3)&1)+xsdName(p);
  if(tg==="m")t+="，可以走到這裡";else if(tg==="c")t+="，可以吃";if(XSD&&XSD.sel===i)t+="，選好了";return t}
/* 畫盤面；fx＝這一手的演出 {t:"f"|"m"|"c", f, to, i, x} */
function xsdDraw(fx){const X=XSD;if(!X)return;const B=X.P.querySelector(".xsd-board"),S=X.S,wide=xsdWideNow(),tg=xsdTgts(),rm=XSD_RM();X.wide=wide;
  B.classList.toggle("wide",wide);X.P.classList.toggle("wide",wide);B.style.gridTemplateColumns=`repeat(${wide?8:4},1fr)`;B.style.gridTemplateRows=`repeat(${wide?4:8},1fr)`;
  const L=S.last,yourTurn=!S.over&&S.cur===0&&!X.busy;let h="";
  for(let i=0;i<32;i++){const p=S.b[i],[c,r]=xsdPos(i,wide);let cl="xsd-c";
    if(L&&(L.t==="f"?L.i===i:(L.f===i||L.to===i)))cl+=L.by===1?" lt2":" lt";if(X.sel===i)cl+=" sel";
    if(fx&&!rm){if(fx.t==="f"&&fx.i===i)cl+=" fl";if((fx.t==="m"||fx.t==="c")&&fx.to===i)cl+=" mv"}
    let sty=`grid-column:${c};grid-row:${r}`;
    if(fx&&!rm&&(fx.t==="m"||fx.t==="c")&&fx.to===i){const[c0,r0]=xsdPos(fx.f,wide);sty+=`;--dx:${(c0-c)*100/0.86}%;--dy:${(r0-r)*100/0.86}%`}
    h+=`<button type="button" class="${cl}" data-i="${i}" style="${sty}" aria-label="${esc(xsdLabel(i,p,tg[i],wide))}"${yourTurn?"":" aria-disabled=\"true\""}>${xsdPc(p)}${tg[i]==="m"?'<i class="dot"></i>':tg[i]==="c"?'<i class="ring"></i>':""}</button>`}
  const fo=document.activeElement&&B.contains(document.activeElement)?document.activeElement.dataset.i:null;   /* 重畫後鍵盤焦點留在同一格 */
  B.innerHTML=h;if(fo!=null){const e=B.querySelector(`[data-i="${fo}"]`);if(e)try{e.focus({preventScroll:true})}catch(x){}}
  if(fx&&fx.t==="c"&&!rm){const cell=B.querySelector(`[data-i="${fx.to}"]`);if(cell){const g=document.createElement("div");g.className="xsd-ghost";g.innerHTML=xsdPc(fx.x);cell.append(g);
    const pop=document.createElement("b");pop.className="xsd-pop";pop.textContent="吃！";cell.append(pop);setTimeout(()=>{g.remove();pop.remove()},800)}}
  /* 上方兩位、吃到的子 */
  const pl=X.P.querySelectorAll(".xsd-pl");for(const k of[0,1]){const e=pl[k];if(!e)continue;const c=S.col?S.col[k]:-1;
    e.classList.toggle("on",!S.over&&S.cur===k);e.querySelector("i").className=c<0?"":"c"+c;e.querySelector("i").textContent=c<0?"未定":xsdSide(c)}
  {const lv=XSD_LV[S.lv]||XSD_LV[xsdLv()],sm=X.P.querySelector(".xsd-pl small");if(sm)sm.textContent="（"+lv+"）";B.setAttribute("aria-label","暗棋棋盤，電腦難度："+lv)}
  const cp=X.P.querySelector(".xsd-caps");cp.innerHTML=`<em style="font-style:normal">你吃到：</em>${S.cap[0].map(p=>`<span style="color:${XSD_INK[(p>>3)&1]}">${xsdName(p)}</span>`).join("")||"—"}<em style="font-style:normal;margin-left:10px">電腦吃到：</em>${S.cap[1].map(p=>`<span style="color:${XSD_INK[(p>>3)&1]}">${xsdName(p)}</span>`).join("")||"—"}`;
  try{xsdFit()}catch(e){}
  if(!S.over&&!X.busy)xsdStatus(S.cur===0?(S.col?`輪到你（${xsdSide(S.col[0])}）：翻一顆，或走一步。`:"輪到你：先翻一顆，翻出什麼顏色你就執那一色。"):"")}
/* 棋盤大小：整頁剛好放進一個畫面（扣掉頂欄、台詞、雙方、狀態、吃到的子、按鈕），不用捲 */
function xsdFit(){const X=XSD;if(!X)return;const P=X.P,B=P.querySelector(".xsd-board"),V=document.getElementById("view");if(!B)return;
  const bh=B.getBoundingClientRect().height,other=P.getBoundingClientRect().height-bh,top=V?V.getBoundingClientRect().top:0;
  const h=Math.floor(innerHeight-Math.max(0,top)-other-4);if(h>120)B.style.setProperty("--xsdH",h+"px")}
/* 難度切換（開局前：規則卡、結果視窗）：記在 xsdLv；還沒下第一手的那盤跟著換 */
const XSD_LVTIP={easy:"新手：電腦偶爾會看漏、走錯，適合剛學。",norm:"一般：電腦會認真算。"};
function xsdLvHtml(){const v=xsdLv();return`<div class="xsd-lvsw" role="group" aria-label="電腦難度"><span>電腦難度</span>${["easy","norm"].map(k=>`<button type="button" class="xsd-lv" data-lv="${k}" aria-pressed="${k===v}">${XSD_LV[k]}</button>`).join("")}</div><p class="xsd-lvtip" aria-live="polite">${esc(XSD_LVTIP[v])}</p>`}
function xsdSetLv(lv,btn){if(!XSD_LV[lv])return;try{store.set("xsdLv",lv)}catch(e){}vibrate(4);
  const g=btn&&btn.closest(".xsd-lvsw");if(g){g.querySelectorAll(".xsd-lv").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.lv===lv)));const t=g.nextElementSibling;if(t&&t.classList.contains("xsd-lvtip"))t.textContent=XSD_LVTIP[lv]}
  const X=XSD;if(X&&X.S&&!X.S.over&&X.S.n===0&&!X.busy){X.S.lv=lv;xsdSave();xsdDraw()}
  try{if(typeof axSay==="function")axSay("電腦難度："+XSD_LV[lv])}catch(e){}}
/* 一手的旁白（給讀螢幕） */
function xsdDesc(L,S){if(!L)return"";const who=L.by===0?"你":"電腦";
  if(L.t==="f")return`${who}翻開了${xsdSide((L.p>>3)&1)}${xsdName(L.p)}`;
  if(L.t==="m")return`${who}的${xsdName(L.p)}走了一格`;
  return`${who}的${xsdName(L.p)}吃掉了${xsdSide((L.x>>3)&1)}${xsdName(L.x)}`}
/* 一手之後的掌櫃台詞 */
function xsdLine(S,N){const L=N.last;if(!L)return"";
  if(L.t==="f"&&S.flips===0&&L.by===0&&(L.p&7)===7)return XSD_TX.kingFirst.replace("{k}",xsdName(L.p));
  if(L.t==="c"&&(L.p&7)===1&&(L.x&7)===7)return XSD_TX.pawnKing;return null}
function xsdPlay(a){const X=XSD;if(!X)return;const S=X.S,N=xsdDo(S,a);if(!N)return;X.S=N;X.sel=-1;
  const L=N.last,ln=xsdLine(S,N);if(ln)xsdSay(ln);
  if(L.t==="c")try{if(typeof moveSound==="function")moveSound(true)}catch(e){}else if(L.t==="m")try{if(typeof moveSound==="function")moveSound(false)}catch(e){}
  vibrate(L.t==="c"?12:5);
  xsdSave();xsdDraw(L.t==="f"?{t:"f",i:L.i}:{t:L.t,f:L.f,to:L.to,x:L.x});
  try{if(typeof axSay==="function")axSay(xsdDesc(L,N))}catch(e){}
  if(N.over){xsdEnd();return}
  if(N.cur===1)xsdCpu()}
function xsdLater(f,ms){const X=XSD;if(!X)return;const t=setTimeout(()=>{if(XSD===X&&X.P.isConnected)f()},ms);X.tm.push(t)}
function xsdCpu(){const X=XSD;if(!X)return;X.busy=true;xsdStatus("電腦思考中",true);   /* 不重畫盤面：剛下的那一手的演出（翻、走、吃）還在播 */
  const rm=XSD_RM();xsdLater(()=>{const t0=Date.now();let r=null;try{r=xsdThink(X.S,{lv:X.S.lv||xsdLv()})}catch(e){}
    const wait=Math.max(0,(rm?150:550)-(Date.now()-t0));
    xsdLater(()=>{X.busy=false;if(!r){xsdDraw();return}xsdPlay(r.a);if(!X.S.over)xsdStatus(xsdDesc(X.S.last,X.S)+"。輪到你。")},wait)},rm?60:280)}
function xsdEnd(){const X=XSD;if(!X)return;const S=X.S,o=S.over;let R=xsdRec();R=xsdTally(R,o);try{store.set("xsdRec",R);store.set("xsdRun",null)}catch(e){}
  const why=o.why==="eat"?(o.w===0?"電腦的棋子被你吃光了。":"你的棋子被吃光了。"):o.why==="stuck"?(o.w===0?"電腦沒有棋可走了。":"你沒有棋可走了。"):o.why==="draw"?`連續 ${XSD_DRAW} 手沒有吃子、也沒有翻棋。`:"你認輸了。";
  const head=o.w===0?"🎉 你贏了":o.w===1?"這局電腦贏了":"和棋";
  xsdStatus(head+"。");if(o.w===1)xsdSay(XSD_TX.lose);
  xsdLater(()=>{modal(`<h3>🀄 ${esc(head)}</h3><p>${esc(why)}</p>${o.w===1?`<p><b>${esc(XSD_TX.lose)}</b></p>`:""}<p style="color:var(--muted)">紀錄：勝 ${R.w}・和 ${R.d}・負 ${R.l}</p>${xsdLvHtml()}`,
    [["再來一局",()=>xsdStart(false)],["回茶坊",()=>{location.hash="#/ximarket/tea"},true]],"res")},XSD_RM()?100:700)}
function xsdRuleHtml(open){return`<p class="r"><b>${esc(XSD_TX.short)}</b></p><details${open?" open":""}><summary>完整規則</summary><p class="r">${esc(XSD_TX.long)}</p><p class="r">${esc(XSD_TX.rank)}</p><p class="r">輪到你時，翻開一顆蓋著的棋，或把自己的一顆棋走一格（上下左右）。第一顆翻出什麼顏色，翻的人就執那一色。吃光對方，或對方輪到時翻不了也走不了，就贏了。</p></details>`}
function xsdRules(){modal(`<div class="xsd-card"><h3>🀄 暗棋規則</h3>${xsdRuleHtml(true)}</div>`,[["知道了",null]])}
/* 開一盤新的（card＝先跳規則卡） */
function xsdStart(card){const X=XSD;if(!X)return;const R=xsdRec(),first=(R.w+R.d+R.l)%2===1;   /* 你先、電腦先輪流 */
  X.S=xsdNew(Math.random,first);X.S.lv=xsdLv();X.sel=-1;X.busy=false;xsdSave();xsdSay(XSD_TX.open);xsdDraw();
  const go=()=>{if(XSD!==X)return;if(X.S.cur===1)xsdCpu()};
  if(card)modal(`<div class="xsd-card"><h3>🀄 臺灣暗棋</h3><p class="r">${esc(XSD_TX.intro)}</p>${xsdRuleHtml(false)}${xsdLvHtml()}<p class="r" style="color:var(--muted)">${first?"這局電腦先翻。":"這局你先翻。"}</p></div>`,[["開始翻棋",go],["回茶坊",()=>{location.hash="#/ximarket/tea"},true]]);
  else{toast((first?"🀄 這局電腦先翻":"🀄 這局你先翻")+"（"+XSD_LV[X.S.lv]+"）");go()}}
function xsdTap(i){const X=XSD;if(!X||X.busy||X.S.over||X.S.cur!==0)return;const S=X.S,p=S.b[i];
  if(X.sel>=0){const tg=xsdTgts();if(tg[i]){xsdPlay(X.sel*32+i);return}}
  if(p&16){xsdPlay(i*33);return}
  if(p&&S.col&&((p>>3)&1)===S.col[0]&&X.sel!==i){const has=xsdActs(S).some(a=>((a/32)|0)===i&&a%32!==i);X.sel=i;xsdDraw();if(!has)xsdStatus("這顆現在走不了，也吃不到。");vibrate(4);return}
  if(p&&S.col&&((p>>3)&1)!==S.col[0]&&X.sel<0){xsdStatus("那是電腦的棋。先點你自己的棋，再點要去的地方。");return}
  X.sel=-1;xsdDraw()}
function xsdResign(){const X=XSD;if(!X||X.S.over)return;modal(`<h3>認輸？</h3><p>認輸的話，這局算輸。</p>`,[["繼續下",null],["認輸",()=>{if(XSD!==X||X.S.over)return;X.tm.forEach(clearTimeout);X.busy=false;X.S=Object.assign({},X.S,{over:{w:1,why:"resign"}});xsdDraw();xsdEnd()},true]])}
function xsdPage(v){setTop("🀄 暗棋","#/ximarket/tea");try{setTabs(true,"#/")}catch(e){}v.className="view";
  if(!XSD_ON||(typeof xsmOpen==="function"&&!xsmOpen())){toast("🏮 西市還沒開市");navReplace("#/");return{}}
  xsdCss();const P=document.createElement("div");P.className="xsd-page";
  P.innerHTML=XSD_DEFS+`<div class="xsd-say" aria-live="polite"></div><div class="xsd-bar"><div class="xsd-pl"><b>你</b><i></i></div><div class="xsd-pl"><b>電腦</b><small></small><i></i></div></div>`+
    `<div class="xsd-board" role="group" aria-label="暗棋棋盤"></div><div class="xsd-st" aria-live="polite"></div><div class="xsd-caps"></div>`+
    `<div class="xsd-foot"><button type="button" class="btn ghost" data-k="rule">規則</button><button type="button" class="btn ghost" data-k="give">認輸</button></div>`;
  v.append(P);
  const X=XSD={P,S:null,sel:-1,busy:false,tm:[],wide:false};
  P.querySelector(".xsd-board").addEventListener("click",e=>{const b=e.target.closest(".xsd-c");if(b)xsdTap(+b.dataset.i)});
  P.querySelector('[data-k="rule"]').onclick=()=>xsdRules();P.querySelector('[data-k="give"]').onclick=()=>xsdResign();
  const onR=()=>{if(XSD!==X||!P.isConnected)return;if(xsdWideNow()!==X.wide)xsdDraw();else xsdFit()};addEventListener("resize",onR);
  const S0=xsdLoadRun();
  if(S0&&S0.n>0){X.S=S0;xsdSay(XSD_TX.open);xsdDraw();toast("🀄 接著上次那一局");if(S0.cur===1)xsdCpu()}
  else xsdStart(true);
  return{stop(){X.tm.forEach(clearTimeout);removeEventListener("resize",onR);if(XSD===X)XSD=null}}}
