/* ================= 🗺 十州棋館：門派江湖長卷（開發者 11/18；前綴 jh）=================
   開發者原話：「請gemini規劃十個文案，要如何把門派畫出來在首頁或是其他地方，讓遊戲更具有rpg象棋江湖闖蕩感」→ 合併案「雲河棋會」→
   「總共有10個門派，我希望散落在一張大地圖的不同州，大地圖的入口從首頁走到遠山那邊」「門派用城牆感覺好怪，我希望像是那種武當少林峨眉所在地那種場景」
   「地圖要用環景的，然角色可以在地圖上移動」（選橫向 4 屏長卷）「要畫出10個門派的特色」
   「現在就做，畫面切到這個長卷也要有淡入淡出的視覺效果，然後第一次進來要有文字描述歡迎光臨來到什麼地方之類的」。
   規劃與考究：story/十州棋館圖_規劃_1118.md；圖：park/yunhe/pano_final.png（3024×1340，史學顧問 184～187 審過）→ art/yunhe/pano.webp → data/yunhe/。
   地圖固定晚明江淮十州（各朝都有入口）；十派各一座山門駐地，門派旗號、掌門頭像、隨行角色都由程式疊在圖上（圖本身無字）。
   點駐地 → 隨行角色沿路走過去 → 名帖小卡：拜師／繼續修行（開局門派 07z9）、挑戰掌門（zmStart）、這一派的棋友。
   進出：首頁遠山「🗺 十州棋館」、找地方（雲河渡口）、開局棋路總覽與十派掌門頁頂上一顆按鈕；換頁時宣紙色淡出淡入（jhGo）；第一次進來有一段歡迎文字（store jhIntro）。
   不改開局門派與掌門的規則、不加體力與貨幣、不新增匿名資料。不動 07z9-school.js（那一版在組候選版），用它的全域函式（OSC、oscL、oscT、oscSchE、oscNmE、oscJoinAsk、zmStart、zmImg）。
   純函式 jhPath／jhNear／jhNodes 不碰 DOM，xiangqi-lab/tools/test-jianghu-1118.js 用 vm 跑 */
const JH_ON=true,JH_IMGV="1118",JH_W=3024,JH_H=1340,JH_FADE=480;
/* 首頁遠山的入口位置（左%、上%）：原圖、iPad 直版、橫版各量一次（左上方的遠山，避開星槎、西市、觀星臺） */
const JH_HOME={"":[22,11],p34:[26,11],l1610:[32,10]};
/* 十派駐地（長卷原圖像素）：s＝山門前石坪（角色站的地方，腳底）、f＝門派牌旗（標籤底部對齊的點） */
const JH_SITE={central:{s:[870,510],f:[857,290]},screen:{s:[175,1180],f:[178,1030]},palace_horse:{s:[2690,1070],f:[2693,760]},
  same_cannon:{s:[1300,300],f:[1300,130]},opposite_cannon:{s:[1900,960],f:[1890,640]},pawn:{s:[1150,780],f:[1143,560]},
  elephant:{s:[520,640],f:[514,430]},horse:{s:[150,650],f:[200,360]},cross_palace:{s:[2180,1160],f:[1950,1100]},advisor_corner:{s:[2420,340],f:[2421,150]}};
/* 道路的轉折點（沿圖上的土黃色小路、橋、渡口量的）與連線；駐地本身也是節點（名字＝派代號） */
const JH_J={ja:[330,640],jb:[730,600],jc:[880,560],jd:[450,714],je:[420,880],jf:[300,1080],jg:[1080,330],jh:[900,800],ji:[1300,1000],jj:[1520,1000],
  jk:[2000,1080],jl:[2400,1100],jm:[2550,700],jn:[2480,470]};
const JH_E="horse-ja ja-elephant elephant-jb jb-jc jc-central elephant-jd jd-je je-jf jf-screen central-jg jg-same_cannon jb-jh jh-pawn pawn-ji ji-jj jj-opposite_cannon opposite_cannon-jk jk-cross_palace cross_palace-jl jl-palace_horse palace_horse-jm jm-jn jn-advisor_corner";
const JH_START="elephant";   /* 第一次進來站在泗州（雲河鎮所在、地圖中心） */
/* ---------- 純函式 ---------- */
function jhNodes(){const N={};for(const k of Object.keys(JH_J))N[k]=JH_J[k];for(const k of Object.keys(JH_SITE))N[k]=JH_SITE[k].s;return N}
function jhPath(a,b){const N=jhNodes();if(!N[a]||!N[b])return[];if(a===b)return[N[a].slice()];const G={};
  for(const e of JH_E.split(" ")){const[x,y]=e.split("-");(G[x]=G[x]||[]).push(y);(G[y]=G[y]||[]).push(x)}
  const d=(p,q)=>Math.hypot(N[p][0]-N[q][0],N[p][1]-N[q][1]),D={[a]:0},P={},Q=new Set(Object.keys(N));
  while(Q.size){let u=null;for(const q of Q)if(D[q]!=null&&(u==null||D[q]<D[u]))u=q;if(u==null||u===b)break;Q.delete(u);
    for(const w of G[u]||[])if(Q.has(w)){const nd=D[u]+d(u,w);if(D[w]==null||nd<D[w]){D[w]=nd;P[w]=u}}}
  if(D[b]==null)return[];const out=[b];while(out[0]!==a)out.unshift(P[out[0]]);return out.map(k=>N[k].slice())}
const jhLen=pts=>pts.reduce((s,p,i)=>i?s+Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0,0);
/* 沿路走到 t（0～1）的位置與朝向（-1 往左、1 往右） */
function jhAt(pts,t){if(!pts.length)return{x:0,y:0,dir:1};if(pts.length===1)return{x:pts[0][0],y:pts[0][1],dir:1};const L=jhLen(pts);let r=Math.max(0,Math.min(1,t))*L;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(r<=l||i===pts.length-1){const k=l?Math.min(1,r/l):1;return{x:a[0]+(b[0]-a[0])*k,y:a[1]+(b[1]-a[1])*k,dir:b[0]<a[0]?-1:1}}r-=l}
  const z=pts[pts.length-1];return{x:z[0],y:z[1],dir:1}}
/* ---------- 文字：中英並列（照 07z9 的 oscL；07z9 沒載到時退回中文） ---------- */
const jhL=(zh,en)=>typeof oscL==="function"?oscL(zh,en):zh;
const jhT=s=>typeof oscT==="function"?oscT(s):s;
const jhSch=sid=>typeof oscSchE==="function"?oscSchE(sid):(typeof OSC!=="undefined"?OSC.sch(sid):null);
const jhNm=c=>typeof oscNmE==="function"?oscNmE(c):c;
const jhLook=()=>{try{const P=typeof ptyGet==="function"?ptyGet():null;return P&&typeof PTY!=="undefined"&&PTY.has(P,P.look)?P.look:""}catch(e){return""}};
const jhCol={central:"#B23A2E",screen:"#2F4E8C",palace_horse:"#5B3E6E",same_cannon:"#A0522D",opposite_cannon:"#B87333",pawn:"#3E8E6E",elephant:"#6FA8A0",horse:"#A88A3C",cross_palace:"#3F7FA6",advisor_corner:"#B8902E"};
function jhCss(){if(document.getElementById("jhCss"))return;const s=document.createElement("style");s.id="jhCss";s.textContent=`
.view.jh-v{padding:0!important;overflow:hidden}
body.jh-on .xqbot{display:none!important}
.jh-wrap{position:relative;flex:1;min-height:0;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;background:#EFE6D2;scrollbar-width:thin}
.jh-map{position:relative;height:100%;width:max-content}
.jh-map>img{display:block;height:100%;width:auto;max-width:none;user-select:none;-webkit-user-drag:none}
.jh-spot{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:0;padding:0;cursor:pointer;color:#2b2118}
.jh-spot .bn{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;border-radius:10px;background:rgba(250,244,230,.92);border:2px solid var(--jc,#8a6a3a);box-shadow:0 2px 6px rgba(40,25,10,.25)}
.jh-spot .bn img{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:50% 12%;background:#efe4cc;border:1.5px solid var(--jc,#8a6a3a)}
.jh-spot .bn b{font:800 15px/1.1 var(--serif,serif);letter-spacing:.04em;white-space:nowrap}
.jh-spot .bn .osc-sym{width:18px;height:18px;color:var(--jc,#8a6a3a)}
.jh-spot .pole{width:3px;height:22px;background:linear-gradient(#6b4a2b,#3b2a1a);border-radius:2px}
.jh-spot.won .bn{box-shadow:0 0 0 3px rgba(255,214,120,.55),0 0 14px rgba(255,190,80,.75)}
.jh-spot.mine .bn{background:#fff6e0;border-width:3px}
.jh-me{position:absolute;width:auto;transform:translate(-50%,-100%);pointer-events:none;filter:drop-shadow(0 3px 2px rgba(30,20,10,.35));transition:none}
.jh-me.l{transform:translate(-50%,-100%) scaleX(-1)}
#jhFade{position:fixed;inset:0;z-index:9400;background:#EFE6D2;opacity:0;pointer-events:none;transition:opacity ${JH_FADE}ms ease}
#jhFade.on{opacity:1;pointer-events:auto}
.home-page.jh-zoom{transition:transform ${JH_FADE+120}ms ease-in;transform:scale(1.12)}
#jhIntro{position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(20,14,8,.42);opacity:0;transition:opacity .9s ease}
#jhIntro.on{opacity:1}
#jhIntro .cd{max-width:30em;background:rgba(250,244,230,.97);border:1px solid #c9a96b;border-radius:16px;padding:22px 20px 18px;text-align:center;color:#2b2118;box-shadow:0 10px 30px rgba(0,0,0,.35);transform:translateY(12px);transition:transform .9s ease}
#jhIntro.on .cd{transform:none}
#jhIntro small{display:block;font-size:13px;letter-spacing:.25em;color:#9a6b2a;margin-bottom:6px}
#jhIntro h2{font:900 26px/1.25 var(--serif,serif);letter-spacing:.08em;margin:0 0 12px}
#jhIntro p{font:600 15.5px/1.75 var(--serif,serif);margin:0 0 10px;opacity:0;transition:opacity .8s ease}
#jhIntro.on p{opacity:1}#jhIntro.on p:nth-of-type(2){transition-delay:.6s}#jhIntro.on p:nth-of-type(3){transition-delay:1.2s}
#jhIntro .btn{margin-top:8px;min-width:10em}
.jh-card{display:flex;gap:12px;align-items:flex-start}.jh-card img{width:72px;height:96px;object-fit:contain;flex:none}
.jh-card .tx{flex:1;min-width:0}.jh-card b{font:800 17px var(--serif,serif)}.jh-card p{margin:4px 0;line-height:1.6;font-size:14px}
@media (prefers-reduced-motion:reduce){#jhFade,#jhIntro,#jhIntro .cd,#jhIntro p,.home-page.jh-zoom{transition:opacity .2s!important;transform:none!important}}`;document.head.append(s)}
/* ---------- 換頁的淡出淡入：先蓋一層宣紙色淡入，再換網址；長卷那頁圖載好後把這層淡出 ---------- */
function jhFadeEl(){let f=document.getElementById("jhFade");if(!f){jhCss();f=document.createElement("div");f.id="jhFade";f.setAttribute("aria-hidden","true");document.body.append(f)}return f}
function jhGo(hash,from){hash=hash||"#/jianghu";jhCss();const f=jhFadeEl();if(from)from.classList.add("jh-zoom");
  setTimeout(()=>f.classList.add("on"),20);setTimeout(()=>{location.hash=hash;if(from)from.classList.remove("jh-zoom")},JH_FADE+40)}
function jhFadeOut(){const f=document.getElementById("jhFade");if(!f)return;f.classList.add("on");setTimeout(()=>f.classList.remove("on"),40)}
/* ---------- 長卷頁 #/jianghu ---------- */
function Jianghu(v){jhCss();setTop(jhL("🗺 十州棋館","🗺 Ten Prefectures"),"#/");if(typeof setTabs==="function")setTabs(false);v.className="view fixed jh-v";
  document.body.classList.add("jh-on");   /* 小帥吉祥物在長卷上看起來像第二個隨行角色，這一頁藏起來（離開時拿掉） */
  const f=jhFadeEl();f.classList.add("on");   /* 沒經過 jhGo（例如直接開網址）也先蓋著，圖好了再淡出 */
  const c=jhLook(),o=typeof oscGet==="function"?oscGet():null,my=c&&o&&typeof OSC!=="undefined"?OSC.act(o,c):"",z=typeof zmGet==="function"?zmGet():null,beat=z&&typeof OSC!=="undefined"?OSC.zmBeaten(z):[];
  let at=JH_START;try{const a=store.get("jhAt",null);if(a&&JH_SITE[a])at=a}catch(e){}
  const wrap=document.createElement("div");wrap.className="jh-wrap";const map=document.createElement("div");map.className="jh-map";wrap.append(map);
  const img=document.createElement("img");img.src=`data/yunhe/pano.webp?v=${JH_IMGV}`;img.alt=jhL("十州棋館圖：晚明江淮十州的十派山門","Map of the ten schools across the Jiang-Huai prefectures");img.draggable=false;map.append(img);
  const pc=(x,y)=>`left:${(x/JH_W*100).toFixed(3)}%;top:${(y/JH_H*100).toFixed(3)}%`;
  const sch=typeof OSC!=="undefined"?OSC.SCH:[];
  for(const S0 of sch){const sid=S0.id,P=JH_SITE[sid];if(!P)continue;const S=jhSch(sid)||S0,m=typeof OSC!=="undefined"?OSC.MST.find(x=>x.sid===sid):null;
    const b=document.createElement("button");b.type="button";b.className="jh-spot"+(beat.includes(m&&m.id)?" won":"")+(my===sid?" mine":"");b.dataset.sid=sid;b.style.cssText=pc(P.f[0],P.f[1])+`;--jc:${jhCol[sid]||"#8a6a3a"}`;
    b.setAttribute("aria-label",S.nm+(m?jhL("，掌門"+m.nm,", master "+m.en):""));
    b.innerHTML=`<span class="bn">${m?`<img src="data/npc/${m.id}.webp" alt="" onerror="this.remove()">`:""}${typeof oscSym==="function"?oscSym(sid):""}<b>${esc(S.nm)}</b></span><span class="pole" aria-hidden="true"></span>`;
    b.onclick=()=>{try{vibrate(5)}catch(e){}walk(sid)};map.append(b)}
  const me=document.createElement("img");me.className="jh-me";me.alt="";me.src=c?`data/xs/prev_${c}.webp`:"";if(!c)me.style.display="none";me.onerror=()=>{me.style.display="none"};map.append(me);
  let busy=false;const place=(x,y,dir)=>{me.style.cssText=pc(x,y)+";height:9%";me.classList.toggle("l",dir<0)};place(...JH_SITE[at].s,1);
  const scale=()=>map.clientHeight/JH_H,center=(x,smooth)=>{const L=x*scale()-wrap.clientWidth/2;try{wrap.scrollTo({left:Math.max(0,L),behavior:smooth?"smooth":"auto"})}catch(e){wrap.scrollLeft=Math.max(0,L)}};
  const redu=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
  function walk(sid){if(busy)return;const pts=jhPath(at,sid);if(!pts.length){jhSheet(sid);return}
    if(redu()||pts.length<2){const p=pts[pts.length-1];place(p[0],p[1],1);at=sid;try{store.set("jhAt",sid)}catch(e){}center(p[0],false);jhSheet(sid);return}
    busy=true;const L=jhLen(pts),ms=Math.max(500,Math.min(4200,L/0.55)),t0=Date.now();
    const step=()=>{if(!wrap.isConnected){busy=false;return}const t=Math.min(1,(Date.now()-t0)/ms),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,p=jhAt(pts,e);place(p.x,p.y,p.dir);center(p.x,false);
      if(t<1)setTimeout(step,16);else{busy=false;at=sid;try{store.set("jhAt",sid)}catch(e){}jhSheet(sid)}};step()}   /* 用計時器推進：畫面在背景時 requestAnimationFrame 會停，計時器照走 */
  v.innerHTML="";v.append(wrap);
  const ready=()=>{if(!wrap.isConnected)return;center(JH_SITE[at].s[0],false);jhFadeOut();setTimeout(()=>jhIntro(),JH_FADE+80)};
  if(img.complete&&img.naturalWidth)setTimeout(ready,0);else{img.onload=ready;img.onerror=ready}
  setTimeout(()=>{if(f.classList.contains("on")&&wrap.isConnected)ready()},6000);   /* 圖很慢也不要一直蓋著 */
  /* 英文模式直接開在這一頁：外掛字典（派名、人名）比畫面晚到，到了（07i18n 發 xq-i18n-ext）就照英文重畫一次（讀螢幕標籤才會是英文） */
  try{if(typeof oscEn==="function"&&oscEn()&&!(typeof I18N_EXN!=="undefined"&&I18N_EXN>0)){const H0=location.hash,re=()=>{document.removeEventListener("xq-i18n-ext",re);if(wrap.isConnected&&location.hash===H0)Jianghu(v)};document.addEventListener("xq-i18n-ext",re)}}catch(e){}
  return{}}
/* ---------- 駐地小卡：拜師／繼續修行、挑戰掌門、這一派的棋友 ---------- */
function jhSheet(sid){if(typeof sheet!=="function"||typeof OSC==="undefined")return;const S=jhSch(sid),m=OSC.MST.find(x=>x.sid===sid),c=jhLook(),o=typeof oscGet==="function"?oscGet():null,act=c&&o?OSC.act(o,c):"";
  const mates=Object.values(OSC.NPC).filter(x=>x[0]===sid).map(x=>jhT(x[2])).slice(0,5);
  sheet(`${S.nm}`,b=>{b.innerHTML=`<div class="jh-card">${m?`<img src="data/npc/${m.id}.webp" alt="" onerror="this.remove()">`:""}<div class="tx">
      ${m?`<b>${esc(jhL(m.nm,m.en))}</b><p class="muted">${esc(jhL(S.nm+"掌門","Master of the "+S.nm))}</p><p>${esc(jhL("「"+m.say+"」",'"'+jhT(m.say)+'"'))}</p>`:""}
      <p class="muted">${esc(jhL(`慣用${S.op}：${S.say}`,`Plays ${S.op}: ${S.say}`))}</p>${mates.length?`<p class="muted">${esc(jhL("門下棋友：","Players of this school: ")+mates.join(jhL("、",", ")))}</p>`:""}</div></div>
    ${c?"":`<p class="muted">${esc(jhL("開始旅程、有了隊伍以後才能拜師和挑戰。","Start a journey and form a party to learn or challenge."))}</p>`}
    <div class="osc-row" style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
      ${c?`<button class="btn" id="jhLearn">${esc(act===sid?jhL(`繼續${jhNm(c)}的修行`,`Continue ${jhNm(c)}'s training`):jhL(`${jhNm(c)}拜入${S.nm}`,`${jhNm(c)} joins the ${S.nm}`))}</button>`:""}
      ${c&&m?`<button class="btn ghost" id="jhZm">${esc(jhL(`🏯 挑戰${m.nm}`,`🏯 Challenge ${m.en}`))}</button>`:""}
      <button class="btn ghost" id="jhAll">${esc(jhL("看十派總覽","See all ten schools"))}</button></div>`;
    const q=s=>b.querySelector(s);
    if(q("#jhLearn"))q("#jhLearn").onclick=()=>{try{closeSheet()}catch(e){}if(act===sid){location.hash="#/school/"+c;return}if(typeof oscJoinAsk==="function")setTimeout(()=>oscJoinAsk(c,sid,()=>{location.hash="#/school/"+c}),80)};
    if(q("#jhZm"))q("#jhZm").onclick=()=>{try{closeSheet()}catch(e){}if(typeof zmStart==="function")zmStart(m,c)};
    q("#jhAll").onclick=()=>{try{closeSheet()}catch(e){}location.hash="#/school"}})}
/* ---------- 第一次進來的歡迎文字（整個帳號只播一次，store jhIntro；點按鈕或背景收起） ---------- */
function jhIntro(force){let seen=0;try{seen=store.get("jhIntro",0)}catch(e){}if(seen&&!force)return;if(document.getElementById("jhIntro"))return;jhCss();
  const c=jhLook(),nm=c?jhNm(c):"";const d=document.createElement("div");d.id="jhIntro";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-labelledby","jhIntroT");
  d.innerHTML=`<div class="cd"><small>${esc(jhL("初入江湖","INTO THE JIANGHU"))}</small><h2 id="jhIntroT">${esc(jhL("歡迎來到江淮十州","Welcome to the Ten Prefectures"))}</h2>
    <p>${esc(jhL("萬曆年間，淮水、運河與長江，把江淮十州串成一條棋路。","In the Wanli years, the Huai River, the Grand Canal and the Yangtze linked ten prefectures into one road of chess."))}</p>
    <p>${esc(jhL("雲河棋會的十個門派各據一方山水、開館授棋；每一派有自己的棋路，也有一位等你登門挑戰的掌門。","The ten schools of the Cloud River Chess Club each hold their own hills and waters. Every school has its own way of playing, and a master waiting for your challenge."))}</p>
    <p>${esc(nm?jhL(`帶著${nm}，一州一州去拜師、踢館吧。點一座山門，${nm}就會走過去。`,`Take ${nm} from prefecture to prefecture to learn and to challenge. Tap a gate and ${nm} will walk there.`):jhL("點一座山門，看看那一派的掌門和棋路。","Tap a gate to meet that school's master."))}</p>
    <button class="btn" id="jhIntroGo">${esc(jhL("開始遊歷","Start the journey"))}</button></div>`;
  document.body.append(d);setTimeout(()=>d.classList.add("on"),40);
  const close=()=>{try{store.set("jhIntro",1)}catch(e){}d.classList.remove("on");setTimeout(()=>d.remove(),500)};
  d.querySelector("#jhIntroGo").onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}close()};d.onclick=e=>{if(e.target===d)close()};
  setTimeout(()=>{try{d.querySelector("#jhIntroGo").focus()}catch(e){}},400)}
/* 離開長卷頁：歡迎文字還開著就收掉（不記看過） */
if(typeof addEventListener==="function")addEventListener("hashchange",()=>{if(/^#\/jianghu/.test(location.hash))return;document.body.classList.remove("jh-on");const d=document.getElementById("jhIntro");if(d)d.remove()});
/* ---------- 首頁遠山「🗺 十州棋館」（照 07xsm 西市入口的掛法；各朝首頁都有） ---------- */
function jhHomePos(P){const b=P&&P.querySelector("#hmJh");if(!b)return;const c=JH_HOME[P.dataset.hmw||""]||JH_HOME[""];b.style.left=c[0]+"%";b.style.top=c[1]+"%";delete b.dataset.ttL;b.style.marginLeft=""}
function jhHomeSpot(v){if(!JH_ON)return;const P=v.querySelector(".home-page");if(!P||P.querySelector("#hmJh"))return;jhCss();
  const k=P.dataset.hmw||"",c=JH_HOME[k]||JH_HOME[""],b=document.createElement("button");b.type="button";b.id="hmJh";b.className="shp-spot";
  b.style.left=c[0]+"%";b.style.top=c[1]+"%";b.setAttribute("aria-label",jhL("十州棋館","Ten Prefectures"));b.innerHTML=`<b>${esc(jhL("🗺 十州棋館","🗺 Ten Prefectures"))}</b>`;
  b.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}jhGo("#/jianghu",P)};
  let ref=null;try{const ord=hmFocusOrder((typeof hmwSpots==="function"?hmwSpots(k):[]).concat([["hmJh",c[0],c[1]]])).map(s=>s[0]),i=ord.indexOf("hmJh");for(let j=i+1;j<ord.length&&!ref;j++)ref=P.querySelector(":scope>#"+ord[j])}catch(e){}
  if(!ref){const sp=P.querySelectorAll(":scope>.shp-spot");ref=sp.length?sp[0]:P.querySelector(":scope>.hm-go-bar")}
  P.insertBefore(b,ref||null);try{if(typeof hmClamp==="function")hmClamp(P)}catch(e){}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(!hub)jhHomeSpot(v)}catch(e){}return r}}
if(typeof hmwSet==="function"){const f1=hmwSet;hmwSet=function(P){const r=f1.apply(this,arguments);try{jhHomePos(P)}catch(e){}return r}}
/* ---------- 開局棋路總覽、十派掌門頁頂上一顆按鈕（包一層 OscPage，不改 07z9） ---------- */
if(typeof OscPage==="function"){const f2=OscPage;OscPage=function(v,c,lk){const r=f2.apply(this,arguments);try{if(!lk&&(!c||c==="masters"))setTimeout(()=>jhSchoolBtn(v),0)}catch(e){}return r}}
function jhSchoolBtn(v){const pad=v.querySelector(".pad.osc");if(!pad||pad.querySelector("#jhOpen"))return;const b=document.createElement("button");b.type="button";b.id="jhOpen";b.className="btn";
  b.textContent=jhL("🗺 走進十州棋館","🗺 Enter the Ten Prefectures");b.onclick=()=>{try{vibrate(5)}catch(e){}jhGo("#/jianghu")};pad.prepend(b)}
/* 開局棋路的修行頁換畫時（oscHome 的 draw 會重畫 innerHTML）不加；總覽和掌門頁也會重畫 → 用 MutationObserver 不划算，改在重畫後的下一個點擊補上 */
if(typeof document!=="undefined")document.addEventListener("click",()=>{if(!/^#\/school(\/masters)?$/.test(location.hash))return;setTimeout(()=>{const v=document.getElementById("view");if(v)jhSchoolBtn(v)},0)},true);
/* ---------- 找地方（07z6）：雲河渡口加「十州棋館」、練棋書院加「開局棋路」 ---------- */
try{if(typeof STM_AREAS!=="undefined"){const A=k=>STM_AREAS.find(a=>a[0]===k);const sh=A("ship"),ac=A("acad");
  if(sh&&!sh[4].some(e=>e[1]==="#/jianghu"))sh[4].push([jhL("十州棋館","Ten Prefectures"),"#/jianghu","十州 門派 江湖 地圖 掌門 長卷 棋館 山門"]);
  if(ac&&!ac[4].some(e=>e[1]==="#/school"))ac[4].push([jhL("開局棋路","Opening Paths"),"#/school","開局 門派 拜師 修行 中炮 屏風馬"])}}catch(e){}
