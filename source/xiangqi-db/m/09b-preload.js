const LOADING={};function loadScript(src){return LOADING[src]||(LOADING[src]=new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.dataset.s=src;s.onload=ok;s.onerror=()=>{delete LOADING[src];s.remove();no(new Error("載入 "+src+" 失敗"))};document.head.append(s)}))}
/* 意見回饋 422（開發者更正）：「所有東西載好，寧可一開始打開的時候顯示 LOADING，也不要在遊戲過程中卡頓」。
   App 一開就讀 data/preload.json（建置時產生的清單：13 個朝代的園子、棋子、圖示、入口圖、擂主、路人、小帥、Pikafish、書法字、音效、關卡圖、3D 地圖…），
   手機快取（xqlab-look，跟 service worker 同一個）裡還沒有的才下載，有缺的時候蓋一層全螢幕載入畫面（進度條＋百分比＋MB），全部好了才進首頁。
   清單版本存在 localStorage：同一版已經全部載好就不再蓋畫面，只在背景補缺的。下載失敗的不卡住，記下來在背景重試。
   載完之後：目前朝代的大圖先解碼（img.decode），3D 程式（three、bot3d、park3d、map3d）先載入，進園子就不用再等 */
const PRE_KEY="preloadDone";
/* 意見回饋 422：載入畫面輪播象棋起源與典故的水墨畫，每張配一句有出處的名言，5 秒換一張（淡入淡出） */
const LD_Q=[["ld01_liubo","戰國・六博與象棋","菎蔽象棋，有六簙些。","《楚辭・招魂》"],["ld02_mengchang","戰國・孟嘗君府","燕則鬥象棋而舞鄭女。","劉向《說苑・善說》"],
  ["ld03_hongou","楚漢・鴻溝為界","中分天下，割鴻溝以西者為漢，鴻溝而東者為楚。","司馬遷《史記・項羽本紀》"],["ld04_hanxin","傳說・韓信軍中創棋","觀棋不語真君子，起手無回大丈夫。","民間棋諺"],
  ["ld05_beizhou","北周・武帝制《象經》","帝製象經成，集百僚講說。","《周書・武帝紀》"],["ld06_baoying","唐・寶應象棋","天馬斜飛度三止，上將橫行擊四方。","唐 牛僧孺《玄怪錄・岑順》（字依《全唐詩》）"],
  ["ld07_dangju","唐・旁觀者清","當局稱迷，傍觀見審。","《舊唐書・元行沖傳》"],["ld08_songding","北宋・象棋定型","車馬尚存周戰法，偏裨兼備漢官名。","北宋 程顥《象戲》"],
  ["ld09_nansong","南宋・臨安棋待詔","寧失一子，不失一先。","棋諺"],["ld10_mingpu","明・刻書坊刻棋譜","一著不慎，滿盤皆輸。","俗諺"]];
function ldShow(ov){const im=ov.querySelectorAll(".ld-img img"),tt=ov.querySelector(".ld-tt"),qt=ov.querySelector(".ld-qt"),sr=ov.querySelector(".ld-src"),Q=ov.querySelector(".ld-q");
  let i=Math.floor(Math.random()*LD_Q.length),k=0;
  const go=()=>{if(!ov.isConnected)return;const [id,t,q,s]=LD_Q[i%LD_Q.length],a=im[k],b=im[1-k];
    const on=()=>{if(!ov.isConnected)return;a.classList.add("on");b.classList.remove("on");Q.classList.remove("on");setTimeout(()=>{tt.textContent=t;qt.textContent=q;sr.textContent="── "+s;Q.classList.add("on")},350);k=1-k;i++;setTimeout(go,5200)};
    a.onload=on;a.onerror=()=>{i++;setTimeout(go,400)};a.src="data/loading/"+id+".webp"};go()}
/* 回饋 845（開發者 11/9 選：折衷先載）：開 App 只先載「進首頁和第一盤棋需要的」——preload.json 每一項第四格是層級（0＝首批；"<朝代>"＝目前在那一朝才算首批；1＝背景，
   由 xiangqi-lab/tools/preload-list.js 照資料夾規則算），載完就進首頁。其餘在背景慢慢下載：下棋時、App 在背景時、某一頁正在等圖時都暫停，頂端一條細線顯示進度。
   玩家走進一頁而那頁要的圖還沒下載到（preload.json 的 pages 規則＋目前朝代的首批）：只為那一頁蓋水墨暈開的等待畫面，優先下載，好了才進（preGate，02-shell.js 的 route() 呼叫）。
   舊玩家全部載過的照舊不重下；換過內容（指紋不同）的檔還沒換新前，記錄裡留舊指紋，下次開 App 或走進用到它的頁之前一定先換新。 */
const PRE={M:null,c:null,pend:new Map(),fly:new Map(),PH:{},NH:{},got:0,first:false,bgN:0,bgT:0,bgTotal:0,bgGot0:0,gate:null,pass:null};
let PRE_FIRST_OK=()=>{};window.PRE_FIRST=new Promise(r=>{PRE_FIRST_OK=r});   /* 回饋 845：首批好了（或根本不用下載）才開始抓引擎、大師對局這些大檔（02-shell.js），不跟首批搶網路 */
const PRE_ERAS=["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"],PRE_ERA_RE=new RegExp("[/_.]("+PRE_ERAS.join("|")+")([/_.-]|$)");
const preEraOf=u=>{const m=PRE_ERA_RE.exec(u);return m?m[1]:null};
const preFirstOf=(t,e)=>t===undefined||t===0||t===e;   /* 舊格式（沒有第四格）一律算首批＝跟以前一樣全部先載 */
const preIsFirst=(x,e)=>preFirstOf(x.t,e)||x.u==="data/tripo_app/"+store.get("pChar","")+".glb";   /* 回饋 845：選了真實 3D 的玩家，自己的角色模型也算首批 */
const PRE_PLAY=/^#\/(cpu|arena|pvp|qqev|journey\/play|redo\/play|canju\/.|battle\/[^/]+\/.|ship\/(lv|pz)|shelf\/[^/]+\/[^/]+\/game)/;   /* 正在下棋的頁：背景下載暫停，確保對局不卡 */
const PRE_LATE=/^data\/(battles|relics|tripo_app|qa|inkfx)\//;   /* 背景裡最後才抓的大宗（古戰場、珍品、真實 3D…）；故事插圖、人物比較常一進來就看，排前面 */
const preAbs=u=>new URL(u,new URL(".",location.href).href).href;
function preSaveH(now){clearTimeout(PRE.hT);const go=()=>{if(!PRE.M)return;const o={};for(const u in PRE.NH){if(PRE.pend.has(u)){if(PRE.PH[u])o[u]=PRE.PH[u]}else o[u]=PRE.NH[u]}
    store.set("preH",o);if(!PRE.pend.size)store.set(PRE_KEY,PRE.M.v)};   /* 還沒換新的檔留舊指紋，下次才知道還要重抓 */
  if(now)go();else PRE.hT=setTimeout(go,3000)}
/* 意見回饋 634：換過的朝代字型下載好就直接套用到畫面上（後加的同名字型優先），不用關掉 App 再開 */
async function preFont(x){const m=x.fr&&/^data\/fonts\/xq-(\w+)\.woff2$/.exec(x.u);if(!m||!window.FontFace)return;
  try{const r=await PRE.c.match(preAbs(x.u));if(!r)return;const ff=new FontFace("XQ "+m[1],await r.arrayBuffer(),{display:"swap"});await ff.load();document.fonts.add(ff)}catch(e){}}
/* 意見回饋 605：請求帶 ?pre=1 讓 service worker 放行，只由這裡存一次；每個請求有逾時（20 秒＋每 MB 10 秒）。同一個檔同時只下載一次（背景和等待畫面共用） */
function preGet(x){if(PRE.fly.has(x.u))return PRE.fly.get(x.u);const ac=new AbortController(),to=setTimeout(()=>ac.abort(),20000+x.sz/1048576*10000);
  const p=fetch(preAbs(x.u)+"?pre=1"+(x.fr?"&fresh="+x.h:""),{cache:x.fr?"no-store":"default",signal:ac.signal}).then(r=>{if(!r.ok)throw new Error(r.status);return PRE.c.put(preAbs(x.u),r)})
    .then(()=>{if(PRE.pend.get(x.u)===x){PRE.pend.delete(x.u);PRE.got+=x.sz}preFont(x);preSaveH()},e=>{x.tries=(x.tries||0)+1;x.wait=Date.now()+30000;throw e})
    .finally(()=>{clearTimeout(to);PRE.fly.delete(x.u)});
  PRE.fly.set(x.u,p);return p}
const prePool=(list,MAXN,MAXB,onDone)=>new Promise(ok=>{let n=0,b=0;const L=list.slice();const next=()=>{if(!L.length&&!n)return ok();
  while(L.length&&n<MAXN&&(n===0||b+L[0].sz<=MAXB)){const x=L.shift();n++;b+=x.sz;preGet(x).then(()=>onDone(x,true),()=>onDone(x,false)).finally(()=>{n--;b-=x.sz;next()})}};next()});
/* 背景下載：一次最多 4 個（不搶正在玩的網路），目前朝代的先，古戰場、關卡圖這些大宗最後；失敗的 30 秒後再試，最多三次 */
function preBg(){const kick=d=>{clearTimeout(PRE.bgT);PRE.bgT=setTimeout(tick,d)};
  const tick=()=>{PRE.bgT=0;preLine();if(!PRE.pend.size){preSaveH(true);return}
    if(document.hidden||!navigator.onLine||PRE.gate||PRE_PLAY.test(location.hash))return kick(2000);
    const e=store.get("era","classic"),now=Date.now();let left=false;
    const MAXN=window.PRE_ENG?1:4;   /* 引擎（49 MB，下棋要用）下載中：外觀只留 1 個，讓引擎先到 */
    while(PRE.bgN<MAXN){let best=null,br=9;for(const x of PRE.pend.values()){if((x.tries||0)>=3)continue;left=true;if(PRE.fly.has(x.u)||x.wait>now)continue;
        const r=(preEraOf(x.u)===e?0:2)+(PRE_LATE.test(x.u)?1:0);if(r<br){br=r;best=x;if(!r)break}}
      if(!best)break;PRE.bgN++;preGet(best).catch(()=>{}).finally(()=>{PRE.bgN--;kick(30)})}
    if(!left&&!PRE.bgN){preSaveH(true);preLine();return}   /* 剩下的都失敗三次：先停，下次開 App 再補 */
    kick(5000)};
  PRE.bgKick=kick;kick(0)}
/* 頂端一條細線＝背景下載進度（下棋時不顯示）；關於頁要顯示「已下載 X／全部 Y」可以用 preStat() */
/* 11/11 ChatGPT 介面報告 P1（story/99_ChatGPT介面報告處理.md）：開 App 的全頁等待畫面只講「正在準備棋盤」＋開局必要資源（首批 first：preload.json 第四格 0／目前朝代）的實際進度；
   背景下載的檔數、容量移到「設定 → 關於」（preStatRow）；從教練作業連結（#/hw…）進來的，等待畫面結束後確定還在那份作業（preBackTo）。
   phase：check＝還在比對手機快取（分母還不知道，只顯示目前在做什麼）、load＝下載首批、done。n＝首批檔數、total／got＝首批位元組 */
function preUi(o){o=o||{};const main="正在準備棋盤";if(o.phase==="check")return{main,sub:"檢查手機裡已經有的棋盤和棋子…",pct:null,done:false};
  const n=+o.n||0,tot=+o.total||0,got=Math.max(0,Math.min(+o.got||0,tot));if(o.phase==="done"||!n||(tot&&got>=tot))return{main,sub:"準備好了",pct:100,done:true};
  if(!tot)return{main,sub:"下載開局要用的棋盤和棋子…",pct:null,done:false};const p=Math.min(99,Math.floor(got*100/tot));return{main,sub:"下載開局要用的棋盤和棋子　"+p+"%",pct:p,done:false}}
/* 可以操作了＝全頁等待畫面該收掉：沒有清單（離線、舊瀏覽器）、首批都到了、或玩家按了「先進去逛」 */
const preCanPlay=o=>!!(o&&(o.noList||o.skip||!(+o.firstLeft>0)));
/* 背景下載狀態（設定 → 關於）：S＝preStat() */
function preBgText(S){if(!S)return"";if(!S.left)return"全部下載好了";return"還有 "+S.left+" 個檔在背景下載（約 "+Math.max(1,Math.round((+S.leftBytes||0)/1048576))+" MB）"}
function preStatRow(){let S=null;try{S=preStat()}catch(e){}const t=preBgText(S);return t?`<div class="row" style="justify-content:space-between;gap:8px"><span class="muted">背景下載</span><b style="text-align:right">${t}</b></div>`:""}
/* 開 App 時的網址是教練作業（#/hw、#/hw/<編碼>…），等待畫面收掉時網址被換掉了就回去 */
const preBackTo=(h0,now)=>/^#\/(hw|daily)(\/|$)/.test(String(h0||""))&&now!==h0?h0:null;
function preStat(){const M=PRE.M;if(!M)return null;let lb=0;for(const x of PRE.pend.values())lb+=x.sz;return{n:M.items.length-PRE.pend.size,all:M.items.length,left:PRE.pend.size,leftBytes:lb,bytes:M.items.reduce((t,x)=>t+x[1],0)}}
function preLine(){let el=document.getElementById("preline");const on=PRE.first&&PRE.pend.size&&PRE.bgTotal&&!PRE_PLAY.test(location.hash)&&!PRE.gate;
  if(!on){if(el)el.remove();return}
  if(!el){el=document.createElement("div");el.id="preline";el.setAttribute("aria-hidden","true");el.innerHTML="<i></i>";document.body.append(el)}
  el.firstChild.style.width=Math.max(2,Math.min(100,(PRE.got-PRE.bgGot0)*100/PRE.bgTotal)).toFixed(1)+"%"}
function preCss(){if(document.getElementById("precss"))return;const s=document.createElement("style");s.id="precss";
  s.textContent=`#preline{position:fixed;left:0;right:0;top:var(--safeT,0px);height:2px;z-index:9000;pointer-events:none;background:rgba(255,240,210,.08)}#preline i{display:block;height:100%;width:0;background:rgba(222,186,120,.75);transition:width .6s}
#pgate{position:fixed;inset:0;z-index:9998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#F3ECDD;transition:opacity .35s;overflow:hidden}#pgate.out{opacity:0;pointer-events:none}
#pgate .pg-ink{position:relative;width:150px;height:150px;opacity:0;animation:pgIn .4s .25s forwards}
#pgate .pg-ink i{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(42,31,21,.78) 0,rgba(42,31,21,.45) 32%,rgba(42,31,21,.12) 58%,rgba(42,31,21,0) 72%);filter:blur(5px);transform:scale(.15);animation:pgInk 2.6s ease-out infinite}
#pgate .pg-ink i:nth-child(2){animation-delay:.85s}#pgate .pg-ink i:nth-child(3){animation-delay:1.7s}
#pgate .pg-t{font-family:var(--serif,serif);font-size:17px;color:#2A1F15;letter-spacing:.2em;opacity:0;animation:pgIn .4s .35s forwards}#pgate .pg-n{font-size:12px;color:#7A6A58;min-height:1em;opacity:0;animation:pgIn .4s .6s forwards}
@keyframes pgInk{0%{transform:scale(.15);opacity:.95}70%{opacity:.35}100%{transform:scale(1.45);opacity:0}}@keyframes pgIn{to{opacity:1}}`;document.head.append(s)}
/* 走進一頁要先有的檔：preload.json 的 pages 規則（{e}＝目前朝代、{1}＝網址第二段）＋目前朝代的首批（玩家換了朝代時，新朝代的棋盤、圖示還沒到） */
function preNeed(p){if(!PRE.M||!PRE.pend.size)return[];const P=PRE.M.pages||{},e=store.get("era","classic"),k1=p[0]||"",k2=p.slice(0,2).join("/"),now=Date.now();
  const a1=String(p[1]||"").replace(/[^\w-]/g,""),pats=[...(P[k2]||[]),...(k2!==k1?P[k1]||[]:[])].map(s=>{try{return new RegExp(s.split("{e}").join(e).split("{1}").join(a1))}catch(x){return null}}).filter(Boolean);
  const out=[];for(const x of PRE.pend.values()){if((x.tries||0)>=3||x.wait>now)continue;if(preIsFirst(x,e)||pats.some(r=>r.test(x.u)))out.push(x)}return out}
function preGateOff(){PRE.gate=null;const g=document.getElementById("pgate");if(g&&!g.classList.contains("out")){g.classList.add("out");setTimeout(()=>{if(g.classList.contains("out"))g.remove()},400)}if(PRE.bgKick)PRE.bgKick(300)}
/* 02-shell.js route() 一開始呼叫：這頁的圖都在了就回 false（照常畫）；還缺就蓋等待畫面、優先下載，好了再 route() 一次，回 true */
function preGate(p){try{const h0=location.hash;
  if(PRE.pass===h0){PRE.pass=null;preGateOff();return false}PRE.pass=null;
  if(!PRE.M||document.getElementById("preov")||!navigator.onLine){preGateOff();return false}
  const need=preNeed(p);if(!need.length){preGateOff();return false}
  if(PRE.gate&&PRE.gate.h===h0)return true;
  preCss();let g=document.getElementById("pgate");if(g&&g.classList.contains("out")){g.remove();g=null}
  if(!g){g=document.createElement("div");g.id="pgate";g.innerHTML=`<div class="pg-ink"><i></i><i></i><i></i></div><div class="pg-t">研墨鋪紙…</div><div class="pg-n"></div>`;document.body.append(g);keepAwake("pgate",()=>!!document.getElementById("pgate"))}
  const G=PRE.gate={h:h0},n=g.querySelector(".pg-n"),total=need.reduce((t,x)=>t+x.sz,0);let got=0;preLine();
  const fin=()=>{if(PRE.gate!==G)return;clearTimeout(G.to);PRE.pass=h0;if(location.hash===h0)route();else preGateOff()};
  G.to=setTimeout(fin,25000+total/1048576*4000);   /* 網路太慢也不要把人關在門外：時間到就先進去 */
  if(total>=512*1024)n.textContent=`0 ／ ${(total/1048576).toFixed(1)} MB`;
  prePool(need,24,8*1048576,x=>{got+=x.sz;if(PRE.gate===G&&total>=512*1024)n.textContent=`${(got/1048576).toFixed(1)} ／ ${(total/1048576).toFixed(1)} MB`}).then(fin);
  return true}catch(e){preGateOff();return false}}
function preGateNow(){try{const p=(location.hash.replace(/^#/,"")||"/").split("/").filter(Boolean).map(decodeURIComponent);if(preNeed(p).length&&typeof route==="function")route()}catch(e){}}
async function preloadAll(){if(!OFF||!("caches" in window))return PRE_FIRST_OK();
  let M;try{M=await (await fetch("data/preload.json",{cache:"no-cache"})).json()}catch(e){return PRE_FIRST_OK()}
  /* 開發者 11/4：每次開 App 都先蓋載入畫面、檢查全部檔案；回饋 845：缺的、換過的只先下載首批就進首頁（20 秒後可以先進去逛），其他在背景 */
  let c;try{c=await caches.open("xqlab-look")}catch(e){return PRE_FIRST_OK()}
  const MOBP=(()=>{try{return matchMedia("(pointer:coarse)").matches||innerWidth<820}catch(e){return false}})(),wantReal=store.get("pStyle","q")==="real"||store.get("oppLook","real")==="real";
  M.items=M.items.filter(([u])=>/^data\/tripo_app\//.test(u)?wantReal:/^data\/eramap\//.test(u)?(/_m\.webp$/.test(u)===MOBP||!/\.webp$/.test(u)):true);   /* 真實 3D 模型只在選了真實版時下載；朝代地圖手機只抓手機版（清單檔兩邊都要） */
  let ov=null,bar=null,txt=null;const ovMake=()=>{ov=document.createElement("div");ov.id="preov";keepAwake("preload",()=>!!document.getElementById("preov"));
    ov.innerHTML=`<div class="ld-img"><img alt=""><img alt=""></div><div class="ld-q"><div class="ld-tt"></div><div class="ld-qt"></div><div class="ld-src"></div></div>
      <div class="pre-in"><div class="pre-t">象棋千秋</div><div class="pre-s">${preUi({phase:"check"}).main}</div>
      <div class="pre-bar"><i></i></div><div class="pre-n" role="status">${preUi({phase:"check"}).sub}</div><div class="pre-h">準備好就能下棋；其他朝代和故事的圖之後在背景下載，進度在「設定 → 關於」。</div><button class="pre-skip" type="button" hidden>先進去逛（背景繼續下載）</button></div>`;
    let dk=false;try{dk=!!sessionStorage.getItem("xqDarkLoad");if(dk)sessionStorage.removeItem("xqDarkLoad")}catch(e){}   /* 11/12 開發者 iPhone 17 Pro Max 實機錄影：舊玩家開新旅程，選角後會重開一次，原本跳出米白載入頁很突兀；改成跟開場電影一樣的星空底 */
    if(dk){ov.classList.add("pv-dark");const s=ov.querySelector(".pre-s");if(s)s.textContent="星槎靠岸中…"}
    document.body.append(ov);bar=ov.querySelector(".pre-bar i");txt=ov.querySelector(".pre-n");if(!dk)ldShow(ov);
    setTimeout(()=>{const k=ov&&ov.querySelector(".pre-skip");if(k){k.hidden=false;k.onclick=()=>{ov.remove();ov=null;PRE_FIRST_OK();preEnd()}}},4000)};ovMake();   /* 開發者 11/11 選 ChatGPT UI 報告 UI-12：「先進去逛」原本 20 秒後才出現，慢網路的人要乾等；改成 4 秒（網路快的人通常已經載完、看不到這顆） */
  const abs=preAbs,H0=location.hash,preEnd=()=>{const h=preBackTo(H0,location.hash);if(h)location.hash=h};
  const PH=store.get("preH",{}),NH={},miss=[];   /* 換過的圖（檔名一樣、內容不同）也要重新下載：秦、漢黑棋換新圖後手機一直是舊的 */
  /* 意見回饋 605（網路專家建議）：一次拿出快取裡全部的網址，比逐檔 match 快很多；有記內容雜湊的直接比對，沒記的才打開看大小 */
  let have=null;try{have=new Set((await c.keys()).map(r=>r.url))}catch(e){}
  await Promise.all(M.items.map(async([u,sz,h,t])=>{NH[u]=h;const x={u,sz,h,t};if(PH[u]&&h&&PH[u]!==h)x.fr=1;try{if(have&&!have.has(abs(u)))return miss.push(x);   /* 回饋 845：記錄是舊指紋但快取裡沒有（上次先拿掉了）也要繞過瀏覽器快取抓新的 */
    if(PH[u]&&h){if(PH[u]!==h)miss.push(x);return}
    const r=await c.match(abs(u));if(!r)return miss.push(x);
    if(h&&+(r.headers.get("content-length")||sz)!==sz){x.fr=1;miss.push(x)}}catch(e){miss.push(x)}}));
  /* 意見回饋 514／518：下載過的「比賽對局」內容換了（例如轉成繁體），背景自動重新下載，不用玩家刪掉再抓 */
  if(window.XQ&&XQ.bigBooks&&XQ.syncedBooks)(async()=>{try{await window.PRE_FIRST;const big=await XQ.bigBooks(),have=await XQ.syncedBooks();for(const g of big){const c=have.find(x=>x.key===g.key);if(c&&g.h&&c.h!==g.h){await XQ.syncSite(g.key,g.name,null,g.h);console.log("重新下載",g.key)}}}catch(e){}})();
  if(M.big)(async()=>{try{const BH=store.get("bigH",{}),dc=await caches.open("xqlab-data"),o={};for(const[u,sz,h]of M.big){o[u]=h;const r=await dc.match(abs(u));
    if(r&&(BH[u]?BH[u]!==h:+(r.headers.get("content-length")||sz)!==sz))await dc.delete(abs(u))}store.set("bigH",o)}catch(e){}})();   /* 特級大師對局換了內容：刪掉手機裡的舊檔，下次用到時重抓 */
  PRE.M=M;PRE.c=c;PRE.PH=PH;PRE.NH=NH;for(const x of miss)PRE.pend.set(x.u,x);
  const E0=store.get("era","classic"),isLd=x=>x.u.indexOf("data/loading/")===0;
  const first=miss.filter(x=>preIsFirst(x,E0)).sort((a,b)=>isLd(b)-isLd(a));   /* 載入畫面的水墨畫先下載 */
  if(navigator.onLine)for(const x of miss)if(x.fr&&!preIsFirst(x,E0))c.delete(abs(x.u)).catch(()=>{});   /* 回饋 845：換過內容、排在背景才換新的舊檔先從手機快取拿掉——換新以前走進用到它的頁，service worker 會直接上網抓新的，不會看到舊圖 */
  const total=first.reduce((t,x)=>t+x.sz,0);let got=0;
  /* 11/11 ChatGPT 介面報告 P1：不再寫「有 N 個檔案要先搬進手機（xx MB）」；主句固定「正在準備棋盤」，下面只寫首批（開局必要）的百分比 */
  if(ov&&preCanPlay({firstLeft:first.length})){const o=ov;ov=null;txt.textContent=preUi({phase:"done"}).sub;setTimeout(()=>{o.classList.add("out");setTimeout(()=>o.remove(),400);preEnd()},350)}
  const show=()=>{if(!ov)return;const U=preUi({phase:"load",n:first.length,total,got});if(U.done){txt.textContent=U.sub;bar.style.width="100%";const o=ov;ov=null;setTimeout(()=>{o.classList.add("out");setTimeout(()=>o.remove(),400);preEnd()},250);return}if(U.pct!=null)bar.style.width=U.pct+"%";txt.textContent=U.sub};show();
  /* 意見回饋 605（網路專家實測）：GitHub Pages 是 HTTP/2，首批最多同時 24 個、傳輸中不超過約 6 MB */
  await prePool(first,24,6*1048576,x=>{got+=x.sz;show()});
  window.__preFirstMs=Math.round(performance.now());   /* 首批花多久（量測用） */
  PRE.first=true;PRE_FIRST_OK();preSaveH(true);preCss();
  if(ov){txt.textContent=preUi({phase:"done"}).sub;setTimeout(()=>{if(ov){ov.classList.add("out");setTimeout(()=>ov&&ov.remove(),400)}preEnd()},250)}
  PRE.bgGot0=PRE.got;for(const x of PRE.pend.values())PRE.bgTotal+=x.sz;
  preBg();setTimeout(preGateNow,700);   /* 首批好了：目前這頁（例如從書籤直接開到古戰場）還缺圖的話，補好再顯示 */
  /* 目前朝代的大圖先解碼、3D 程式先載入 */
  const e=store.get("era","classic");for(const u of[`data/park/${e}_360.webp`,`data/pano/${e}_sky.webp`,`data/pano/${e}_ground.webp`,psetBoard(e)?`data/pset/${e}/board_fit.webp`:`data/boards/${e}_fit.webp`]){try{const im=new Image();im.src=u;im.decode().catch(()=>{})}catch(x){}}
  setTimeout(()=>{try{parkLoad().catch(()=>{});loadScript("map3d.js?v="+encodeURIComponent(window.XQ_BUILD||"")).catch(()=>{})}catch(x){}},300)}
setTimeout(()=>{try{preloadAll().catch(()=>PRE_FIRST_OK())}catch(e){PRE_FIRST_OK()}},0);
// 產生「對手掃這個就能加入、自動坐另一邊」的網址
async function joinLink(other){
  if(OFF){const r=XQ.remoteInfo();if(!r)return null;return location.origin+location.pathname+`#connect=${encodeURIComponent(r.base)}&k=${encodeURIComponent(r.key)}&seat=${other}`}
  const d=await api("/remote"),us=d.urls||[],u=us.find(x=>/\/m\?k=/.test(x)&&/^https:/.test(x))||us.find(x=>/\/m\?k=/.test(x));
  return u?u+"#/join/"+other:null}
function PvpGame(v){
  setTabs(false);gameLayout(v);
  let st=null,sel=-1,flipMan=null,shownResult=null,busy=false,autoFlip=store.get("autoFlip",true),clockBase=null,drawAsked=null;
  // seat：連線對戰時這支手機坐哪一方（"r"／"b"）；null＝同一支手機輪流下
  // NET：線上大廳的網路對局（不用電腦）；seat="w" 表示在觀戰
  const NET=OFF&&!!window.XQNet&&XQNet.active();
  let seat=NET?(XQNet.side()||"w"):store.get("pvpSeat",null);if(!NET&&OFF&&seat&&!XQ.remoteInfo()){seat=null;store.set("pvpSeat",null);XQ.setPvpOnline(false)}
  const bd=Board(i=>tap(i));v.querySelector("#bbox").append(bd.svg);
  const setTitle=()=>NET?setTop(seat==="w"?"👀 觀戰中":`🌐 我是${seat==="r"?"紅":"黑"}方`,"#/lobby",[parkBtn(()=>draw()),...(vcOn()?[["🎤",()=>voiceMove(()=>!st||st.result?{why:"這盤已經結束"}:seat==="w"?{why:"你在觀戰"}:seat&&st.turn!==seat?{why:"還沒輪到你"}:{board:st.board,legal:st.legal,play:(f,t)=>{sel=-1;flipMan=null;post("/pvp/move",{f,t})}}),"聲控走棋"]]:[]),["🌐",()=>netSheet(),"大廳"]])
    :setTop(seat?`連線對戰・我執${seat==="r"?"紅":"黑"}`:"👥 同桌對弈","#/hub/battle",(DEVMODE()?[["👥",()=>seatSheet(),"連線對戰"]]:[]).concat([parkBtn(()=>draw()),...(vcOn()?[["🎤",()=>voiceMove(()=>!st||st.result?{why:"這盤已經結束"}:seat==="w"?{why:"你在觀戰"}:seat&&st.turn!==seat?{why:"還沒輪到你"}:{board:st.board,legal:st.legal,play:(f,t)=>{sel=-1;flipMan=null;post("/pvp/move",{f,t})}}),"聲控走棋"]]:[]),["⚙",()=>newSheet(),"新局設定"]]));setTitle();try{const bb=$("#back");if(bb&&typeof hbHubN==="function"&&String(bb.dataset.to||"").indexOf("/hub/battle")>=0)bb.innerHTML="<b>‹</b>走回"+hbHubN()}catch(e){}if(typeof hbHomeBack==="function")hbHomeBack();   /* 11/11：從首頁石桌進來的回首頁 */   /* 11/10：從茶坊後園走回茶坊 */   // 透過電腦的連線對戰只給開發者；玩家用「線上對戰」
  function netSheet(){sheet(seat==="w"?"觀戰中":"網路對戰",b=>{b.innerHTML=`<button class="btn" id="lb">🌐 回大廳（這盤會保留）</button><button class="btn ghost" id="lv">${seat==="w"?"不看了":"離開這盤"}</button>`;
    b.querySelector("#lb").onclick=()=>{closeSheet();location.hash="#/lobby"};
    b.querySelector("#lv").onclick=()=>{closeSheet();const go=()=>{XQNet.leave();location.hash="#/lobby"};
      if(seat!=="w"&&st&&!st.result)confirmBox(XQNet.oppOnline()&&st.moves.length?"對方還在線上，離開會算你認輸，確定？":"離開後這盤就結束，確定？",go,"離開");else go()}})}
  const mySide=()=>seat||(st&&st.turn);
  const acts=actionBar(v.querySelector("#acts"),[["undo","↶","悔棋",()=>post("/pvp/undo")],["flip","⇅","翻轉",()=>{if(seat&&seat!=="w")return emoteSheet();flipMan=!isFlip();autoFlip=false;store.set("autoFlip",false);draw();toast("已關閉自動轉向")}],
    ["new","＋","新局",()=>NET?(st&&st.result?post("/pvp/new"):toast("這盤下完才能再來一局")):newSheet(),true],["draw","🤝","提和",()=>{if(st)post("/pvp/draw",{side:mySide()})}],
    ["resign","🏳","認輸",()=>{if(st){const s=mySide(),nm=String((s==="r"?st.red:st.black)||"").trim();confirmBox(`${PLAYER[s]}${nm&&nm!==PLAYER[s]?"（"+nm+"）":""}確定認輸？`,()=>post("/pvp/resign",{side:s}),"認輸")}}],   /* 11/12 第 11 輪觸控測試：沒取名字時名字＝方名，不再出現「黑方（黑方）」 */
    // 擺盤：觀戰時從正在看的那一步開始，也能請 Pikafish 分析（觀眾不影響比賽，意見回饋 263）；自己下棋時網路對戰不開放 Pikafish
    ["setup","🧪","擺盤",()=>{if(!st)return;if(seat==="w"&&view!=null)setupSheet(boardAtN(view),view%2?"b":"r",isFlip(),true);else setupSheet(st.board,st.turn,isFlip(),seat==="w"||!NET&&!seat)}]]);
  const flipBtn=()=>{acts.flip.innerHTML=seat&&seat!=="w"?(NET?'<span class="ic">💬</span>聊天':'<span class="ic">😏</span>表情'):'<span class="ic">⇅</span>翻轉';acts.flip.setAttribute("aria-label",seat&&seat!=="w"?(NET?"聊天":"表情"):"翻轉棋盤")};flipBtn();
  const isFlip=()=>flipMan!=null?flipMan:seat?seat==="b":(autoFlip&&st&&!st.result?st.turn==="b":false);
  async function post(u,b){if(busy)return;busy=true;try{render(await api(u,{...(b||{}),seat}))}catch(e){toast(e.message)}finally{busy=false}}
  // 連線對戰設定：兩支手機都掃電腦上同一個 QR code，再各選一方
  function seatSheet(){
    sheet("兩支手機連線對戰",b=>{const can=!OFF||XQ.remoteInfo();
      b.innerHTML=`<p>兩個人都用手機掃<b>電腦上同一個 QR code</b>，進到「雙人對戰」，一個選「我執紅」、一個選「我執黑」，就能各用各的手機下。棋局透過電腦同步，所以電腦的程式要開著。</p>
        ${can?"":'<p class="muted">⚠ 這支手機還沒連上電腦，先掃電腦上的 QR code。</p>'}
        <div class="opt"><button data-s="" class="${!seat?"on":""}">同一支手機輪流下</button><button data-s="r" class="${seat==="r"?"on":""}" ${can?"":"disabled"}>我執紅（這支手機）</button><button data-s="b" class="${seat==="b"?"on":""}" ${can?"":"disabled"}>我執黑（這支手機）</button></div>
        ${can?'<button class="btn" id="qr">📱 顯示 QR code 讓對手掃描加入</button>':'<button class="btn ghost" id="hc">怎麼連上電腦</button>'}`;
      const hc=b.querySelector("#hc");if(hc)hc.onclick=connectSheet;
      const qb=b.querySelector("#qr");if(qb)qb.onclick=()=>{if(!seat){seat="r";store.set("pvpSeat",seat);if(OFF)XQ.setPvpOnline(true);setTitle();flipBtn();refresh()}qrSheet()};
      b.querySelectorAll("[data-s]").forEach(x=>x.onclick=()=>{if(x.disabled)return;seat=x.dataset.s||null;store.set("pvpSeat",seat);if(OFF)XQ.setPvpOnline(!!seat);
        flipMan=null;sel=-1;closeSheet();setTitle();flipBtn();toast(seat?`這支手機執${seat==="r"?"紅":"黑"}，請對方選另一邊`:"改成同一支手機輪流下");refresh()})})}
  // 讓第二支手機掃：網址裡帶著另一邊的座位，掃完直接進對局
  async function qrSheet(){const other=seat==="b"?"r":"b";let link=null,err="";
    try{link=await joinLink(other);if(link)await loadScript("qrcode.min.js")}catch(e){err=e.message}
    sheet("讓對手掃描加入",b=>{
      if(!link){b.innerHTML=`<p>${err?esc(err):"電腦的程式沒有開對外連線。請在電腦用 <b>--tunnel</b>（任何網路）或 <b>--lan</b>（同一個 Wi-Fi）啟動，再試一次。"}</p>`;return}
      b.innerHTML=`<p style="text-align:center">對手用手機相機掃這個 QR code，會自動<b>執${other==="r"?"紅":"黑"}</b>進到這盤棋。<br><span class="muted">你這支手機執${seat==="r"?"紅":"黑"}</span></p><div class="qrbox" id="qrc"></div>
        <button class="btn ghost" id="cp">複製連結（用訊息傳給對手）</button>`;
      new QRCode(b.querySelector("#qrc"),{text:link,width:220,height:220,correctLevel:QRCode.CorrectLevel.L});
      b.querySelector("#cp").onclick=async()=>{try{await navigator.clipboard.writeText(link);toast("已複製連結")}catch(e){prompt("複製這個連結",link)}}})}
  // 表情：只在連線對戰時用
  let lastEmo=null;
  function emoteSheet(){sheet(NET?"跟對手說話":"傳個表情給對手",b=>{const qt=x=>x.text||((EMOTES.find(q=>q[0]===x.e)||[])[2]||""),qn=x=>{const G=window.XQNet&&XQNet.game&&XQNet.game(),o=G&&(x.by==="r"?G.red:x.by==="b"?G.black:null);return x.name||(o&&o.name)||PLAYER[x.by]||""};   /* 回饋 850（線上聊天只能用快捷語，開發者 11/9）：拿掉打字框、只留快捷語按鈕；上面列最近 8 句快捷語 */
    b.innerHTML=(NET?`<p class="muted" style="font-size:12.5px;margin:0 0 8px">線上對局只能用下面的快捷語跟對手說話</p>
      ${(window.XQNet?XQNet.chatLog():[]).filter(qt).slice(-8).map(x=>`<div class="muted" style="font-size:13px">${esc(qn(x))}：${esc(qt(x))}</div>`).join("")}`:"")+`<div class="emogrid">${EMOTES.map(([k,i,t])=>`<button data-e="${k}"><span>${i}</span>${esc(t)}</button>`).join("")}</div>`;
    b.querySelectorAll("[data-e]").forEach(x=>x.onclick=async()=>{closeSheet();try{const s=await api("/pvp/emote",{seat,e:x.dataset.e});showEmote(x.dataset.e,true);lastEmo=Math.max(lastEmo||0,...(s.emotes||[]).map(m=>m.id));render(s)}catch(e){toast(e.message)}})})}
  /* 第 13 輪 F3 線上對局預走（07pm-premove.js，跟 08b 同樣四個掛勾：tap 先問 pmvTap、draw 叫 pmvOpts、render 叫 pmFire、狀態列 pmvLabel）：
     只在自己坐紅或黑（seat r／b）、對方在想時；觀戰、同一支手機輪流下不做。輪到你時走出＝照一般點選送 /pvp/move（net.js 的簽名、驗證不變）；3D 園子點選也走這裡 */
  const pmMe=()=>seat==="r"||seat==="b"?seat:null;
  const pmFire=()=>{const me=pmMe();if(typeof pmvFire==="function"&&st&&me)pmvFire(st,me,(f,t)=>{if(busy)return false;sel=-1;flipMan=null;vibrate(15);post("/pvp/move",{f,t});return true},pmFire)};
  function tap(i){if(!st||st.result)return;
    if(seat==="w"){toast("你在觀戰");return}
    if(pmMe()&&st.turn!==seat&&typeof pmvTap==="function"&&pmvTap(st,seat,i,{redraw:()=>{if(st)render(st)}}))return;
    if(seat&&st.turn!==seat){toast("還沒輪到你，等對方走");return}
    if(sel>=0&&st.legal.some(([f,t])=>f===sel&&t===i)){const f=sel;sel=-1;vibrate(15);flipMan=null;return post("/pvp/move",{f,t:i})}
    sel=i===sel?-1:st.legal.some(([f])=>f===i)?i:-1;if(sel>=0)vibrate(5);draw()}
  // 觀戰：可以往前往後看每一步（view＝看到第幾步，null＝最新）；這支手機的 Pikafish 幫每一步算局勢，紅黑條跟著動
  let view=null,watchUI=false;const evc={};
  /* 意見回饋 344：觀戰時每一步都請 Pikafish 評等（妙著、正著、失著…），標在下面的著法列和狀態列；評過的存在手機裡 */
  const gq={};let gqBusy=false;
  async function gradeWatch(){if(gqBusy||seat!=="w"||!OFF||!st)return;gqBusy=true;
    try{for(let i=0;i<st.moves.length;i++){if(seat!=="w"||!v.isConnected)break;if(gq[i])continue;const m=st.moves[i];
      try{gq[i]=(await api("/an/classify",{board:boardAtN(i),side:m.by||(i%2?"b":"r"),f:m.f,t:m.t}))||{q:"—"}}catch(e){gq[i]={q:"—"}}
      stripW();if(view==null||curN()===i+1)watchBar()}}finally{gqBusy=false}
    if(seat==="w"&&st&&st.moves.some((m,i)=>!gq[i]))setTimeout(gradeWatch,500)}
  const wMoves=()=>st.moves.map((m,i)=>gq[i]&&gq[i].q&&gq[i].q!=="—"?{...m,q:gq[i].q}:m);
  const stripW=()=>{const el=v.querySelector("#strip");if(el&&st)renderStrip(el,wMoves(),curN()-1,pickStep)};
  const qTag=i=>{const g=gq[i];return g&&g.q&&g.q!=="—"?`「${g.q}」`:""};
  const boardAtN=n=>{const b=parseFen(START);for(const m of st.moves.slice(0,n)){b[m.t]=b[m.f];b[m.f]=null}return b};
  const curN=()=>view==null?st.moves.length:view;
  function evalAt(n){if(evc[n]!=null||!OFF)return;evc[n]="…";
    api("/an/engine",{board:boardAtN(n),side:n%2?"b":"r",ms:600,multipv:1}).then(d=>{const L=(d.lines||[])[0];evc[n]=L?(L.mate!=null?Math.sign(L.mate)*30000:L.vr):null;if(curN()===n)watchBar()}).catch(()=>{evc[n]=null})}
  function watchBar(){const n=curN(),ev=n===st.moves.length&&st.eval?st.eval.v:typeof evc[n]==="number"?evc[n]:null;v.querySelector("#evf").style.width=evPct(ev)+"%";evMark(v,ev);
    if(view!=null){const s2=v.querySelector("#stat"),m=st.moves[n-1];s2.classList.remove("hot");s2.textContent=(n?`第 ${n} 步${m?"："+(m.cn||"")+qTag(n-1):""}`:"開局")+(ev!=null?"・"+(n&&qTag(n-1)?"走完後":"")+evt(ev):"・Pikafish 計算中…")+"・按 ⏭ 回到最新"}}
  function watchStep(d){if(!st)return;const n=Math.max(0,Math.min(st.moves.length,curN()+d));view=n>=st.moves.length?null:n;vibrate(5);draw();watchBar();evalAt(n);stripW()}
  const pickStep=i=>{view=i+1>=st.moves.length?null:i+1;draw();watchBar();evalAt(curN())};
  function setupWatchUI(){if(watchUI)return;watchUI=true;
    for(const[b,ic,l,fn]of[[acts.undo,"◀","上一步",()=>watchStep(-1)],[acts.draw,"▶","下一步",()=>watchStep(1)],[acts.resign,"⏭","最新",()=>{view=null;draw();watchBar();stripW()}]]){
      b.innerHTML=`<span class="ic">${ic}</span>${l}`;b.onclick=()=>fn()}}
  function draw(){if(!st)return;
    // 觀戰時往回看（上一步／下一步）：棋盤模式和公園都畫那一步的局面（意見回饋 261）
    if(seat==="w"&&view!=null){const n=view,b=boardAtN(n),o={flip:isFlip(),last:st.moves[n-1]};bd.draw(b,o);parkDraw(v.querySelector("#bbox"),bd,b,o,parkEx(true));return}
    const o={flip:isFlip(),last:st.moves[st.moves.length-1],sel,targets:sel>=0?st.legal.filter(([f])=>f===sel).map(x=>x[1]):[],check:st.check,fx:true};if(pmMe()&&typeof pmvOpts==="function")pmvOpts(st,seat,o);bd.draw(st.board,o);   /* 第 13 輪 F3：預走選子、排好的預走、對方剛走那步 */
    parkDraw(v.querySelector("#bbox"),bd,st.board,o,parkEx(false))}
  function parkEx(past){
    // 觀戰（seat="w"）：對面坐棋盤遠端那一方玩家的小帥（意見回饋 258），近端坐近端那一方的（意見回饋 259）
    const far=isFlip()?"r":"b",near=far==="r"?"b":"r",G=NET&&window.XQNet?XQNet.game():null,idOf=s=>G?(s==="r"?G.red.id:G.black.id):null,
      watchOpp=NET&&seat==="w"?(window.XQNet&&XQNet.playerBot&&XQNet.playerBot(far)||{p:far==="r"?"帥":"將"}):null,
      watchMe=NET&&seat==="w"?(window.XQNet&&XQNet.playerBot&&XQNet.playerBot(near)||{p:near==="r"?"帥":"將"}):null;
    return{gid:G&&G.gid?"net:"+G.gid:null,tap:past?()=>{}:tap,botSide:NET&&seat&&seat!=="w"?(seat==="r"?"b":"r"):NET&&seat==="w"?far:null,result:!past&&st.result?(st.result.w||"draw"):null,
      opp:NET&&seat&&seat!=="w"?(window.XQNet&&XQNet.oppBot&&XQNet.oppBot()||{p:seat==="r"?"將":"帥"}):watchOpp,mateLook:watchMe,oppWin:"我贏了！再來一盤？",oppLose:"你好厲害…",
      // 點公園裡的人看棋友資料（意見回饋 261）：對面、近端（觀戰時）、觀戰者各是誰
      oppId:NET?(seat==="w"?idOf(far):seat?idOf(seat==="r"?"b":"r"):null):null,mateId:NET&&seat==="w"?idOf(near):null,
      watchers:NET&&window.XQNet&&XQNet.watcherBots?XQNet.watcherBots():[],
      gate:NET?(typeof hbYardGate==="function"?Object.assign(hbYardGate("net"),{duel:true},seat==="w"?{sub:"棋友在後院石台對弈，過去看看"}:{}):{img:["data/parkgate/online.webp"],icon:"🌐",title:"線上棋館",sub:seat==="w"?"正在找觀戰的位子":"正在請對手入座",duel:true,bg:"#14213a"}):(typeof hbYardGate==="function"?hbYardGate("pvp"):typeof hbGate==="function"?hbGate("👥","同桌對弈","兩人輪流下"):null),bgName:typeof hbYardName==="function"?hbYardName():null,...(!NET&&typeof hbBridge==="function"&&hbBridge()?Object.assign({bridge:true},hbBridge()):{})}}   /* 11/11：從首頁石桌進來＝橋上環景（07y hbBridge） */   /* 11/10 開發者選：茶坊開的棋都在「茶坊的後園」下（07y-hubmap hbYardGate） */   /* 意見回饋 410：線上對戰的過場是熱鬧的線上棋館 */
  function clocks(){if(!st||!clockBase||!clockBase.c)return;const b=clockBase;
    if(NET&&window.XQNet&&XQNet.turnLeft){const L=XQNet.turnLeft();for(const s of["r","b"]){const el=v.querySelector(`#mk_${s}`);if(!el)continue;const on=b.run&&b.turn===s&&L!=null,x=on?L:180000;el.textContent="每步 "+fmt(x);el.classList.toggle("hot",on&&x<30000)}}
    for(const s of["r","b"]){const el=v.querySelector(`#ck_${s}`);if(el){const x=b.c[s]-(b.run&&b.turn===s?Date.now()-b.at:0);el.textContent=fmt(x);el.style.color=x<60000&&!(b.turn===s&&b.run)?"var(--red)":""}}}
  const ckT=setInterval(clocks,250);
  let lastN=null;   // 步數剛好多一步才秀開局名
  function render(s){const n0=lastN;st=s;lastN=s.moves.length;if(seat!=="w"&&lastN>(n0||0))setTimeout(()=>{if(typeof repWarn==="function")repWarn(st,mySide(),()=>{if(st&&!st.result)post("/pvp/draw",{side:mySide()})})},700);   /* 開發者 11/11 選規劃書方案 01 */
    /* 意見回饋 598：對方的棋一到就輕震一下，狀態列也寫出對方走了哪一步——對方秒回時，才不會以為自己能連走兩步 */
    if(n0!=null&&lastN>n0&&seat&&seat!=="w"){const L=s.moves[s.moves.length-1];if(L&&L.by&&L.by!==seat){vibrate([15,60,15]);if(typeof pmvArrive==="function")pmvArrive()}}   /* 第 13 輪 F3：記下對方落子的時間（pmvStats 量預走反應） */if(NET&&s.mySide&&s.mySide!==seat){seat=s.mySide;flipMan=null;setTitle();flipBtn()}if(!st.legal.some(([f])=>f===sel))sel=-1;draw();
    if(n0!=null&&lastN===n0+1&&view==null){const cue=openingCue(st.moves);if(cue)setTimeout(()=>openFx(bd.svg,cue[1],cue[0]),350)}
    {const gk=NET&&window.XQNet&&XQNet.gid?XQNet.gid():null;if(NET&&gk&&!st.result&&!st.moves.length&&seat!=="w"&&KJ_LAST!==gk){KJ_LAST=gk;loadKaiju();setTimeout(()=>kaijuFx(bd.svg,"r"),parkOn()?1600:350)}}   /* 意見回饋 416：線上對戰也有開局特效（觀戰的人不播） */
    const ems=st.emotes||[];if(lastEmo==null)lastEmo=ems.reduce((m,x)=>Math.max(m,x.id),0);
    else for(const x of ems)if(x.id>lastEmo){lastEmo=x.id;if(x.text){const fl0=isFlip(),tp=fl0?"r":"b",pk=parkOn()&&PARK&&PARK.host===v.querySelector("#bbox");
        let said=false;if(pk){try{x.by===tp?PARK.v.oppSay(x.text,4):PARK.v.say(x.text,4);said=true}catch(e){}}if(!said)showChat(x.text,x.by===seat,x.name||PLAYER[x.by],v.querySelector(x.by===tp?"#pTop":"#pBot"))}else if(seat&&x.by!==seat)showEmote(x.e,false)}
    const fl=isFlip(),top=fl?"r":"b",bot=fl?"b":"r",nm=x=>x==="r"?st.red:st.black;
    // 連線對戰：自己標「這支手機」，對方標在不在線上
    const sub=x=>!seat?PLAYER[x]:x===seat?PLAYER[x]+(NET?"・我":"・這支手機"):PLAYER[x]+((st.online||{})[x]?"・🟢 "+(NET?"線上":((st.who||{})[x]||"線上")):NET?"・⚪ 對方暫時離線":"・⚪ 對方還沒連上");
    /* 意見回饋 278：線上對戰標出雙方的線上段位（自己用自己的積分，對方用他在大廳最新的積分） */
    const rk=x=>{if(!NET||!window.XQNet||!XQNet.rankOf)return"";try{const G=XQNet.game(),o=G&&(x==="r"?G.red:G.black);if(!o)return"";
      const lp=o.id===meInfo().id?XQNet.rating().pts:(XQNet.people().find(q=>q.id===o.id)||{}).pts,pt=lp!=null?lp:o.pts;return pt==null?"":"・🏅 "+XQNet.rankOf(pt)+" "+pt+" 分"}catch(e){return""}};
    /* 意見回饋 285：線上對戰每人兩個時鐘：上面是總時間，下面是這一步還能想多久（每步 3 分鐘） */
    /* Gemini 評估 11/8：對手是常駐棋友就在名牌標「☁ 雲遊棋客」（大廳、千秋盃同一個說法） */
    const cl=x=>{if(!NET||!window.XQNet)return"";try{const G=XQNet.game(),o=G&&(x==="r"?G.red:G.black);return o&&isCloud(o.id)?"・☁ 雲遊棋客・電腦":""}catch(e){return""}};
    const strip=(x)=>{const h=playerHTML(x,nm(x),sub(x)+cl(x)+rk(x),st.clocks?"":null);return NET&&st.clocks?h.replace('<div class="clk"></div>',`<div class="clkw"><div class="clk" id="ck_${x}"></div><div class="clk2" id="mk_${x}">每步 3:00</div></div>`):h.replace('<div class="clk">',`<div class="clk" id="ck_${x}">`)};
    v.querySelector("#pTop").innerHTML=strip(top);v.querySelector("#pBot").innerHTML=strip(bot);
    for(const[el,x]of[[v.querySelector("#pTop"),top],[v.querySelector("#pBot"),bot]]){el.style.cursor="pointer";el.onclick=e=>{if(e.target.closest(".clk"))return;
      const G=window.XQNet&&XQNet.game&&XQNet.game(),o=G&&(x==="r"?G.red:G.black);if(o&&o.id&&o.id!==meInfo().id)oppCard(o.id,o.name)}}
    v.querySelector("#pTop").classList.toggle("on",!st.result&&st.turn===top);v.querySelector("#pBot").classList.toggle("on",!st.result&&st.turn===bot);
    clockBase={at:Date.now(),c:st.clocks,turn:st.turn,run:st.running&&!st.result};clocks();
    /* 意見回饋 330：下棋的兩個人看不到紅黑條（形勢），只有觀戰的人看得到；下完再顯示 */
    const hideEv=seat&&seat!=="w"&&!st.result;v.querySelector(".evline").style.visibility=hideEv?"hidden":"";
    v.querySelector("#evf").style.width=evPct(hideEv?null:st.eval&&st.eval.v)+"%";evMark(v,hideEv?null:st.eval?st.eval.v:null);   /* 11/11 UI-11 */
    ruleNote(v,st);
    const s2=v.querySelector("#stat");s2.classList.toggle("hot",st.check>=0&&!st.result);
    /* Gemini 評估 11/8（介面圖示化）：狀態列短字加圖示（觀戰中寫在標題，這裡不重複） */
    s2.textContent=!st.result&&st.repetition&&st.repetition.pending?st.repetition.why:st.waiting?"⏳ 等對方進來…":st.result?st.result.why:seat==="w"?`輪到${PLAYER[st.turn]}（${nm(st.turn)}）`+(st.check>=0?"・被將軍！":"")+(st.moves.length&&qTag(st.moves.length-1)?`・上一步${qTag(st.moves.length-1)}`:""):seat?(st.turn===seat?(()=>{const L=st.moves[st.moves.length-1];return L&&L.by&&L.by!==seat&&L.cn?`👉 輪到你（對方：${L.cn}）`:"👉 輪到你"})():"⏳ 等對方走…"+(pmMe()&&typeof pmvLabel==="function"?pmvLabel(st):""))+(st.check>=0&&st.turn===seat?"・⚠ 被將軍！":"")+(st.draw===seat?"・已提和":"")
      :`輪到${PLAYER[st.turn]}（${nm(st.turn)}）`+(st.check>=0?"・被將軍！":"")+(st.eval?`・${evt(st.eval.v)}`:"");
    if(NET&&st.watchers)s2.textContent+=`・👀 ${st.watchers} 人看`;
    // 每步限時 3 分鐘：剩 1 分鐘以內顯示倒數
    if(NET&&!st.result&&!st.waiting&&window.XQNet&&XQNet.turnLeft){const L=XQNet.turnLeft();if(L!=null&&L<60000){s2.textContent+=`・⏱ ${st.turn===seat?"你":"對方"}剩 ${Math.ceil(L/1000)} 秒`;s2.classList.add("hot")}}
    /* 評審 P22 對局簽名（src/net.js SIGN 區段）：對方是舊版 App（或這支不能用 WebCrypto）＝驗不了簽名，這盤照舊規則下但不計積分 */
    if(NET&&window.XQNet&&XQNet.signState&&XQNet.signState()==="legacy")s2.textContent+="・ⓘ 對方版本較舊，無法驗證，這盤不計積分";
    if(NET&&st.link!=="up"){s2.textContent="⚠ 重新連線中…"+(st.unsent?"（棋步連上後送出）":"");s2.classList.add("hot")}
    if(seat==="w"){stripW();gradeWatch()}else renderStrip(v.querySelector("#strip"),st.moves,st.moves.length-1);
    acts.undo.disabled=!!st.result||!st.moves.length||(!!seat&&st.moves[st.moves.length-1].by!==seat);acts.draw.disabled=acts.resign.disabled=!!st.result;acts.new.disabled=false;
    acts.undo.hidden=seat!=="w";   /* 意見回饋 594：線上對戰、兩人同一支手機對下都不能悔棋（要比真實力） */
    if(watchUI&&seat!=="w"&&NET&&XQNet.side()){route();return}   // 從觀戰變成自己下棋（例如在觀戰時接受了邀請）：重新進入對戰頁，按鈕換回悔棋、聊天、提和、認輸
    if(seat==="w"){setupWatchUI();acts.new.disabled=true;acts.new.hidden=true;acts.undo.disabled=curN()<=0;acts.draw.disabled=view==null;acts.resign.disabled=view==null;evalAt(curN());watchBar()}
    // 對方提和：問輪到的人（或另一方）要不要同意；連線對戰時只問對方那支手機
    if(st.draw&&!st.result&&seat!=="w"&&(!seat||st.draw!==seat)&&drawAsked!==st.draw+st.moves.length){drawAsked=st.draw+st.moves.length;const o=opp(st.draw);
      modal(`<div class="em">🤝</div><h2>${PLAYER[st.draw]}提議和棋</h2><p class="muted">${esc(nm(o))}（${PLAYER[o]}）要同意嗎？</p>`,[["同意和棋",()=>post("/pvp/draw",{side:o})],["拒絕",()=>post("/pvp/draw",{side:st.draw}),true]])}
    if(!st.draw)drawAsked=null;
    if(seat!=="w")pmFire();   /* 第 13 輪 F3：輪到你、有排好的預走就走出（不合法、子被吃就取消並提示） */
    if(st.result&&shownResult!==st.id&&seat==="w"){shownResult=st.id;modal(`<div class="em">${st.result.w?"🏆":"🤝"}</div><h2 data-i18n="${st.result.w?"net.win."+st.result.w:"res.draw"}" data-i18n-n="${st.result.w?esc(nm(st.result.w)):""}">${st.result.w?`${PLAYER[st.result.w]}（${esc(nm(st.result.w))}）勝`:"和局"}</h2><p class="muted">${esc(st.result.why)}</p>`,[["回大廳",()=>{XQNet.leave();goUp("#/lobby")}],["留在這裡",null,true]],"res")}   /* 意見回饋 607：退回大廳那一層，不往前推一頁 */
    if(st.result&&shownResult!==st.id){shownResult=st.id;vibrate([30,40,30]);try{if(typeof shipGameDone==="function")shipGameDone(st)}catch(e){}
      /* 意見回饋 597：線上對戰也有機會掉寶物（照對手段位），線上不能用、跟電腦下時用 */
      if(NET&&seat&&seat!=="w"&&window.XQNet)try{const G=XQNet.game(),o=G&&(seat==="r"?G.black:G.red),pt=o?((XQNet.people().find(q=>q.id===o.id)||{}).pts??o.pts):null;
        const ud=itemDrop(st.id||(XQNet.gid&&XQNet.gid()),st.moves.filter(m=>m.by===seat).length,pt==null?1:ptsLv(pt),st.result.w===seat);if(ud)setTimeout(()=>{vibrate([20,40,60]);toast(ud)},2600)}catch(e){}
      /* 意見回饋 323：線上對戰也用原本的勝負動畫（挑戰電腦同一個 killFx），將死以外（認輸、超時、離線）就在說明那行寫原因；結果視窗等動畫播完再出來 */
      {const w=st.result.w,mine=seat==="r"||seat==="b"?seat:null,win=w?(mine?w===mine:true):false;
        if(w&&!st.result.abort&&st.moves.length>=2&&!(typeof blzSkip==="function"&&blzSkip("killFx"))){const loser=w==="r"?"b":"r",k=st.board.indexOf(loser==="r"?"K":"k");
          if(k>=0){MODAL_HOLD=Date.now()+2700;const mate=/將死|困斃/.test(st.result.why||""),cz=mine?(win?"對方":"你")+String(st.result.why||"").replace(/^(紅方|黑方)/,"").replace(/[，,].*$/,"").slice(0,12):String(st.result.why||"");
            try{killFx(bd.svg,win,st.result.why,k,isFlip(),{side:w,...(mate?{}:{cap:cz+(win?"・你贏了！":"")})})}catch(e){}}}}
      modal(`<div class="em">${st.result.w?"🏆":"🤝"}</div><h2 data-i18n="${st.result.w?"net.win."+st.result.w:"res.draw"}" data-i18n-n="${st.result.w?esc(nm(st.result.w)):""}">${st.result.w?`${PLAYER[st.result.w]}（${esc(nm(st.result.w))}）勝`:"和局"}</h2><p class="muted">${esc(st.result.why)}</p>`,
        /* 意見回饋 607（RPG 專家建議）：結果視窗＝主要按鈕一顆＋次要一排（📊 檢討・🏠 首頁・看看棋盤）。線上對戰自己下的人，主要按鈕是「🌐 回大廳 ›」（離開這盤、退回大廳那一層），再來一局放到次要；
           📊 檢討＝原本的「賽後報告」＋「檢討這盤」合併，打開時直接附報告 */
        (()=>{const again=()=>post("/pvp/new",{red:st.red,black:st.black,tc:st.tcKey}),sub=[["📊 檢討",()=>{store.set("openReport","pvp/"+st.id);location.hash="#/db/pvp/"+encodeURIComponent(st.id)},true],["🏠 首頁",()=>goHome(),true],["看看棋盤",null,true]];
          return NET&&(seat==="r"||seat==="b")?[["🌐 回大廳 ›",()=>{XQNet.leave();goUp("#/lobby")}],["再來一局",again,"wide"],...sub]:[["再來一局 ›",again],...sub]})(),"res")}}
  function newSheet(){let tc=st?st.tcKey:"none",red=st&&st.red!=="紅方"?st.red:"",black=st&&st.black!=="黑方"?st.black:"";
    sheet("開新局",b=>{const TCS=[["none","不計時"],["10+5","10 分＋5 秒"],["20+10","20 分＋10 秒"],["60+30","60 分＋30 秒"]];
      const paint=()=>{b.innerHTML=`<div class="field"><label>紅方</label><input id="nR" maxlength="20" placeholder="紅方名字" value="${esc(red)}"></div>
        <div class="field"><label>黑方</label><input id="nB" maxlength="20" placeholder="黑方名字" value="${esc(black)}"></div>
        <div class="muted" style="margin-top:10px">計時</div><div class="opt">${TCS.map(([k,l])=>`<button data-t="${k}" class="${k===tc?"on":""}">${l}</button>`).join("")}</div>
        <div class="opt"><button id="af" class="${autoFlip?"on":""}">${autoFlip?"✔ ":""}棋盤自動轉向輪到的一方</button></div>
        <button class="btn" id="go">開始</button>${st&&st.moves.length&&!st.result?'<p class="muted" style="text-align:center">目前這局還沒下完，開新局會放棄它</p>':""}`;
        b.querySelectorAll("[data-t]").forEach(x=>x.onclick=()=>{red=b.querySelector("#nR").value;black=b.querySelector("#nB").value;tc=x.dataset.t;paint()});
        b.querySelector("#af").onclick=()=>{red=b.querySelector("#nR").value;black=b.querySelector("#nB").value;autoFlip=!autoFlip;store.set("autoFlip",autoFlip);flipMan=null;paint();draw()};
        b.querySelector("#go").onclick=()=>{closeSheet();shownResult=null;sel=-1;flipMan=null;post("/pvp/new",{red:b.querySelector("#nR").value,black:b.querySelector("#nB").value,tc})}};paint()})}
  const refresh=async()=>{try{if(!busy)render(await api("/pvp/state"+(seat?"?seat="+seat:"")))}catch(e){if(seat)v.querySelector("#stat").textContent="⚠ "+e.message}};
  const stop=poller(refresh,1000);
  // 網路對局：對方的棋一到就馬上畫出來（原本要等最多 1 秒的輪詢）
  const offG=OFF&&window.XQNet?XQNet.on("game",()=>{if(XQNet.active())refresh()}):null;
  return{stop:()=>{stop();clearInterval(ckT);if(offG)offG()}}}

