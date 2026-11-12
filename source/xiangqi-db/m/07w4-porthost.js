/* ================= 回饋 804（開發者 11/9 選最小方案）：渡口站著這一朝的七星主人 =================
   渡口下方小卡在說話的那位（shipWho：SHIP_LESSON 的 openBy／doneBy，沒有就 SHIP_STOP[k].who[0]；南北朝＝x_spiritgirl 田飛燕）用 3D 站在碼頭上：
     平常待機，偶爾揮手；位置在 home 附近、往沒有標籤的那一邊錯開，不跟走路角色的起點疊在一起。
     點她：頭上出宣紙泡泡，講的就是小卡那一句（直接讀小卡的字，保證一樣），小卡捲進畫面、閃一下。
   說書人、或主人就是玩家自己選的角色：不多放人。只放一位。
   畫法跟 07w 走路角色一樣（XQBot3D.figure＋正交鏡頭、同一個 el 仰角和 SHW_PORT 的身高比例），離開頁面就收掉 WebGL；頁面藏起來或捲出畫面就不畫。
   渡口同時有：07r 的風（shader）＋走路角色＋這位＝3 個 WebGL。開關 PORT_HOST3D；前綴 ph4 */
const PORT_HOST3D=true;
/* 回饋 805（開發者 11/9「拿掉紅圈處，冗」）：渡口下方的說話小卡（.port-say）和大顆「⛵ 回星槎」按鈕藏起來（標題列已有 ⛵）。
   小卡只是藏（display:none），07j 串門子、07t 劇集照舊插在它後面、照舊顯示；主人站著時點她聽那句，沒站人（說書人、玩家自己的角色、學徒、3D 載不起來）就在抵達時用泡泡講一次 */
const PORT_CARD_HIDE=true;
function ph4Css(){if(document.getElementById("ph4Css"))return;const s=document.createElement("style");s.id="ph4Css";s.textContent=`
.ph4{position:absolute;left:0;top:0;width:0;height:0;z-index:5;pointer-events:none;opacity:0;transition:opacity .5s}
.ph4.on{opacity:1}.ph4 canvas{position:absolute;pointer-events:none}
.ph4 .sh{position:absolute;border-radius:50%;background:radial-gradient(rgba(40,28,18,.32),rgba(40,28,18,0) 70%)}
.ph4-hit{position:absolute;z-index:150;background:transparent;border:0;padding:0;border-radius:40%;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ph4-say{position:absolute;z-index:210;transform:translate(-50%,-100%);max-width:52%;width:max-content;background:#fbf6ea;color:#2f2216;border:1.5px solid #3a2618;border-radius:12px;padding:6px 10px;font:700 12.5px/1.5 var(--serif,serif);text-align:left;box-shadow:0 2px 6px rgba(0,0,0,.22);pointer-events:none;opacity:0;transition:opacity .25s}
.ph4-say b{display:block;font-size:11.5px;color:#8a2a1a;letter-spacing:.06em}
.ph4-say.on{opacity:1}.ph4-say::after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-6px;border:6px solid transparent;border-top-color:#3a2618;border-bottom:0}
.ph4-say.side::after{display:none}.ph4-say.low{z-index:190}
.pad.port.ph4-nc>.port-say,.pad.port.ph4-nc>#poShip{display:none}
.ph4-pz{position:absolute;z-index:4;background:transparent;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.port-say.ph4-flash{animation:ph4Fl 1.6s ease-out}
@keyframes ph4Fl{0%,40%{box-shadow:0 0 0 3px rgba(242,201,76,.95),0 0 14px 4px rgba(255,214,120,.7)}100%{box-shadow:none}}
@media (prefers-reduced-motion:reduce){.port-say.ph4-flash{animation:none}}`;document.head.append(s)}
/* 這一朝渡口小卡上說話的七星主人（說書人、或就是玩家自己的角色時回傳空字串） */
function ph4Who(k){try{const Ls=SHIP_LESSON[k]||{},T=SHIP_STOP[k]||{};if(shipAppr()||!Ls.open)return"";const by=shipLearned(k)&&Ls.done?Ls.doneBy:Ls.openBy;if(by==="teller")return"";
  const c=by||(T.who||[])[0]||"";if(!c||!WX_CHARS[c]||c===myChar())return"";return c}catch(e){return""}}
function ph4Mount(v,k){if(!PORT_HOST3D||shwRM()||!SHW_PORT_ON||!SHW_PORT[k])return false;const P=v&&v.querySelector(".shp-page.cq");if(!P||P.dataset.ph4)return!!(P&&P.dataset.ph4);const c=ph4Who(k);if(!c||typeof TRIPO!=="undefined"&&Object.keys(TRIPO).length&&!TRIPO[c])return false;P.dataset.ph4="1";ph4Css();
  const C=shwCfg(SHW_PORT[k],SHW_PSX[k]);if(Array.isArray(C.h))C.h=[C.h[0]*SHW_PORT_K,C.h[1],C.h[2]*SHW_PORT_K];
  const box=document.createElement("div");box.className="ph4";box.setAttribute("aria-hidden","true");box.innerHTML='<i class="sh"></i>';
  const hit=document.createElement("button");hit.type="button";hit.className="ph4-hit";const nm=(WX_CHARS[c].nk||WX_CHARS[c].n||"");hit.setAttribute("aria-label",nm+"：聽她說話");hit.style.display="none";
  const say=document.createElement("div");say.className="ph4-say";say.setAttribute("aria-live","polite");
  const before=P.querySelector(".shp-spot,.po-sight");P.insertBefore(box,before&&before.parentNode===P?before:null);P.append(hit,say);
  ph4Load(P,box,hit,say,C,k,c).catch(()=>{box.remove();hit.remove();say.remove();ph4Line(v,k)});return true}
/* 小卡那一句（名字、話）：直接讀藏起來的小卡 */
function ph4Card(v){const p=v&&v.querySelector(".port-say p"),b=p&&p.querySelector("b"),full=p?p.textContent:"",t=(full.match(/「([\s\S]*)」\s*$/)||[])[1]||full.replace(b?b.textContent:"","").trim();return{n:b?b.textContent:"",t}}
/* 沒站人時：抵達後（下船過場、步行小卡播完）在走路角色起點上方用宣紙泡泡講一次 */
function ph4Line(v,k){if(!PORT_CARD_HIDE)return;const P=v&&v.querySelector(".shp-page.cq");if(!P||P.dataset.ph4l)return;const L=ph4Card(v);if(!L.t)return;P.dataset.ph4l="1";ph4Css();
  const say=document.createElement("div");say.className="ph4-say";say.setAttribute("aria-live","polite");say.innerHTML=`<b>${esc(L.n)}</b>${esc(L.t)}`;P.append(say);let n=0;
  const go=()=>{if(!say.isConnected)return;if((P.classList.contains("pc-run")||document.querySelector(".walkc")||document.hidden)&&++n<60)return void setTimeout(go,300);
    const C=SHW_PORT[k]?shwCfg(SHW_PORT[k],SHW_PSX[k]):null,H=C&&C.N[C.home]||[50,70],Ih=P.clientHeight,Iw=P.clientWidth,hh=C?shwHt(C,H[1])*SHW_PORT_K*Ih:Ih*.06;
    Object.assign(say.style,{left:(H[0]*Iw/100)+"px",top:(H[1]*Ih/100-hh-6)+"px"});say.classList.add("on");try{if(typeof shwSayFit==="function")shwSayFit(say,P,hh+say.offsetHeight+14)}catch(e){}
    setTimeout(()=>{say.classList.remove("on");setTimeout(()=>say.remove(),400)},Math.max(4000,Math.min(9000,L.t.length*170)))};
  setTimeout(go,900)}
/* 站的位置：home 往左或往右錯開，挑不壓到標籤、也不壓到走路角色起點的那一邊 */
/* 回饋 860（入口盤查後續）：下面 ph4Spot 的六個候選位置在這幾朝都會壓到標籤（找不到就退回第一個＝home 右邊，正好在「〇朝的驛站」標籤底下），
   點她上半身會開驛站。用 elementFromPoint 在 440×894、375×667 量過：秦、漢、三國（375 才疊）、宋、元、清。這幾朝直接指定站位 [左%,腳的上%]：
   秦、三國、元＝石階／木橋右邊的岸邊（離碼頭近、不在走路線上）；漢、宋＝驛站門前的路上（標籤上方，岸邊只剩橋面）；清＝碼頭木板上、走路路點 dock 的右邊（原位頭被標籤蓋住，往下挪又會踩在路點上）。
   兩種尺寸都不壓標籤、風物匣、碼頭熱區、走路角色的起點 */
const PH4_AT={qin:[62,79],han:[60,63],sanguo:[62,79],song:[70,61.5],yuan:[62,78],qing:[67,66]};
function ph4Spot(P,C,hFr){const H=C.N[C.home]||[50,70],W=P.clientWidth,Hh=P.clientHeight,labs=[...P.querySelectorAll(".shp-spot,.po-sight")].map(b=>{const r=b.getBoundingClientRect(),q=P.getBoundingClientRect();return[r.left-q.left,r.top-q.top,r.right-q.left,r.bottom-q.top]});
  const cand=[[H[0]+11,H[1]+1.5],[H[0]-11,H[1]+1.5],[H[0]+16,H[1]+3],[H[0]-16,H[1]+3],[H[0]+11,H[1]-3],[H[0]-11,H[1]-3]].filter(([x,y])=>x>8&&x<92&&y<94);
  const bad=([x,y])=>{const px=x*W/100,py=y*Hh/100,h=hFr(y)*Hh,w=h*.6;return labs.some(([a,b,c2,d])=>!(c2<px-w/2||a>px+w/2||d<py-h||b>py))};
  return cand.find(p=>!bad(p))||cand[0]||[H[0]+11,H[1]]}
async function ph4Load(P,box,hit,say,C,k,cid){
  await loadScript(OFF?"three.min.js":"/m/three.min.js");await loadScript((OFF?"bot3d.js":"/m/bot3d.js")+"?v="+encodeURIComponent(window.XQ_BUILD||""));
  const T=window.THREE;if(!T||!window.XQBot3D||!XQBot3D.figure)throw 0;if(!box.isConnected)return;await shwTripo();if(!box.isConnected)return;
  const Cc=WX_CHARS[cid]||{},look=TRIPO[cid]?{p:Cc.pc||"俥",e:k,g:9,glb:`data/tripo_app/${cid}.glb`,ring:TRIPO[cid]}:null;if(!look)throw 0;
  const B=XQBot3D.figure(look);if(!B.glbP)throw 0;await B.glbP;if(!box.isConnected)return;
  const EL=C.el*Math.PI/180,r=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});r.setPixelRatio(Math.min(2,devicePixelRatio||1));if(T.sRGBEncoding!=null)r.outputEncoding=T.sRGBEncoding;
  const cv=r.domElement,sh=box.querySelector(".sh");box.append(cv);
  const sc=new T.Scene();sc.add(new T.HemisphereLight(0xFFF6E8,0x6A5A48,1.15));const dl=new T.DirectionalLight(0xFFFFFF,.85);dl.position.set(-3,6,5);sc.add(dl);
  const root=new T.Group();root.rotation.order="YXZ";root.add(B.bot);sc.add(root);root.updateMatrixWorld(true);
  const bx=new T.Box3().setFromObject(B.bot),ce=bx.getCenter(new T.Vector3()),hM=(bx.max.y-bx.min.y)||1;B.bot.position.x-=ce.x;B.bot.position.z-=ce.z;B.bot.position.y-=bx.min.y;const by=B.bot.position.y;
  const vh=hM*1.45,cam=new T.OrthographicCamera(-vh*.375,vh*.375,vh/2,-vh/2,hM*.1,hM*20),tg=new T.Vector3(0,hM*.6,0);cam.position.set(0,tg.y+Math.sin(EL)*hM*6,Math.cos(EL)*hM*6);cam.lookAt(tg);cam.updateMatrixWorld(true);
  const ft=new T.Vector3(0,0,0).project(cam),ftF=(1-ft.y)/2,hFr=y=>shwHt(C,y)/(Math.cos(EL)/1.45);
  let at=null,cw=0,ch=0;
  const fit=()=>{const Iw=P.clientWidth,Ih=P.clientHeight;if(!Ih)return;if(!at)at=PH4_AT[k]||ph4Spot(P,C,hFr);const h=Math.round(hFr(at[1])*Ih),w=Math.round(h*.75);if(h!==ch||w!==cw){ch=h;cw=w;r.setSize(cw,ch)}
    const x=at[0]*Iw/100,y=at[1]*Ih/100;Object.assign(cv.style,{left:(x-cw/2)+"px",top:(y-Math.round(ftF*ch))+"px"});Object.assign(sh.style,{width:Math.round(ch*.34)+"px",height:Math.round(ch*.1)+"px",left:(x-Math.round(ch*.17))+"px",top:(y-Math.round(ch*.05))+"px"});
    const top=y-Math.round(ftF*ch)+ch*.12;Object.assign(hit.style,{display:"",left:(x-cw*.22)+"px",top:top+"px",width:(cw*.44)+"px",height:Math.max(10,y-top)+"px"});Object.assign(say.style,{left:x+"px",top:(top-4)+"px"})};
  /* 面向：朝畫面中間偏一點，不背對人 */
  const yaw0=()=>at?Math.max(-.6,Math.min(.6,(50-at[0])*.03)):0;
  const clips=B.mixer&&B.clips||null;let cur=null;const anim=n=>{if(!clips)return;const a=clips[n]||clips.idle;if(!a||a===cur)return;a.reset().fadeIn(.25).play();if(cur)cur.fadeOut(.2);cur=a};anim("idle");
  let vis=true;try{const io=new IntersectionObserver(es=>{vis=es.some(e=>e.isIntersecting)});io.observe(P)}catch(e){}
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!box.isConnected){ro.disconnect();return}fit()});ro.observe(P)}fit();
  /* 點她：說小卡那一句、小卡閃一下 */
  let sayT=0;hit.onclick=e=>{e.stopPropagation();e.preventDefault();if(typeof vibrate==="function")vibrate(5);const card=(P.closest(".view")||document).querySelector(".port-say"),cardOn=!!(card&&card.offsetParent);
    const p=card&&card.querySelector("p"),bn=p&&p.querySelector("b"),full=p?p.textContent:"",t=(full.match(/「([\s\S]*)」\s*$/)||[])[1]||full.replace(bn?bn.textContent:"","").trim();if(!t)return;
    say.innerHTML=`<b>${esc(bn?bn.textContent:(Cc.nk||Cc.n||""))}</b>${esc(t)}`;say.classList.add("on");say.style.marginLeft="";fit();try{if(typeof shwSayFit==="function")shwSayFit(say,P,(parseFloat(hit.style.height)||0)+say.offsetHeight+14)}catch(err){}
    clearTimeout(sayT);sayT=setTimeout(()=>say.classList.remove("on"),Math.max(3000,Math.min(9000,t.length*170)));waveAt=performance.now();
    if(cardOn){card.classList.remove("ph4-flash");void card.offsetWidth;card.classList.add("ph4-flash");setTimeout(()=>{try{card.scrollIntoView({behavior:"smooth",block:"nearest"})}catch(err){}},350)}};
  const outside=e=>{if(!box.isConnected){document.removeEventListener("click",outside,true);return}if(e.target!==hit)say.classList.remove("on")};document.addEventListener("click",outside,true);
  let last=performance.now(),acc=0,fr=0,waveAt=performance.now()+4000+Math.random()*4000,nextWave=0,yawR=yaw0();
  const end=()=>{try{cv.remove()}catch(e){}try{r.dispose();r.forceContextLoss()}catch(e){}hit.remove();say.remove()};
  const loop=now=>{if(!box.isConnected||!P.isConnected){end();return}requestAnimationFrame(loop);if(document.hidden||!vis){last=now;return}
    if(P.classList.contains("pc-run")||document.querySelector(".walkc")){last=now;return}   /* 下船過場、步行小卡播完才出現（跟走路角色一樣） */
    const dt=Math.min(.05,(now-last)/1000);last=now;acc+=dt;
    /* 偶爾揮手：每 9～15 秒一次，約 1.8 秒 */
    if(now>=waveAt&&now<waveAt+1800){anim(clips&&clips[SHW_ACT.wave]?SHW_ACT.wave:"wave")}else{anim("idle");if(now>=waveAt+1800){waveAt=now+9000+Math.random()*6000}}
    yawR+=(yaw0()-yawR)*Math.min(1,dt*4);root.rotation.y=yawR;
    if(!clips&&B.arms&&B.arms[1]){const w=now>=waveAt&&now<waveAt+1800;B.arms[1].rotation.z=w?2.5:0}
    if(fr++&1)return;if(clips)B.mixer.update(acc);acc=0;B.bot.position.y=by;r.render(sc,cam);if(!box.classList.contains("on"))box.classList.add("on")};
  requestAnimationFrame(loop)}
/* 回饋 806（開發者 11/9「角色可以直接走到星槎上船處返回星槎」）：每一朝渡口的碼頭盡頭（靠船的地方）加一個金色標籤「⛵ 上星槎」，
   取代 805 藏起來的大按鈕。點標籤、或點碼頭盡頭那一塊空地：角色沿路走到碼頭盡頭、朝船揮手，再回星槎（#/adventure）。標題列的 ⛵ 照舊是捷徑。
   PH4_PIER[朝代]＝{N:新路點（腳底位置，照每張渡口圖量的，走在地面和碼頭木板上）, E:接到原本路網的邊, at:標籤位置, boat:面向的船}；併進 SHW_PSX（07w 掛路網時會一起讀）。
   船艙（classic）本來就在星槎上：11/11 起也加，標籤寫「⛵ 回星槎」，走到纜繩木樁。標題列的 ⛵ 同日拿掉（07f Port） */
const PH4_PIER={
  qin:{N:{pq1:[46,72],pier:[17,82]},E:"home-pq1 pq1-pier",at:[19,76],boat:[5,93]},
  han:{N:{pier:[32,83]},E:"home-pier",at:[31,77],boat:[30,91]},
  sanguo:{N:{pq1:[50,75],pier:[27,81]},E:"home-pq1 pq1-pier",at:[27,75.5],boat:[8,92]},
  weijin:{N:{pq1:[36,68],pier:[13,77]},E:"home-pq1 pq1-pier",at:[16,71.5],boat:[8,88]},
  nanbei:{N:{pq1:[25,68],pier:[10,73.5]},E:"home-pq1 pq1-pier",at:[13,68],boat:[15,88]},
  sui:{N:{pq1:[47,82],pier:[24,91]},E:"home-pq1 pq1-pier",at:[25,85.5],boat:[12,95]},
  tang:{N:{pq1:[40,74],pier:[21,85]},E:"home-pq1 pq1-pier",at:[22,79.5],boat:[20,94]},
  wudai:{N:{pq1:[42,76.5],pier:[17,84]},E:"home-pq1 pq1-pier",at:[19,78.5],boat:[15,95]},
  song:{N:{pq1:[48,79],pier:[15,88]},E:"home-pq1 pq1-pier",at:[17,82.5],boat:[8,94]},
  yuan:{N:{pier:[25,80.5]},E:"home-pier",at:[12,81],boat:[10,92]},
  ming:{N:{pq1:[36,73],pier:[15,76]},E:"home-pq1 pq1-pier",at:[10,82],boat:[20,90]},
  qing:{N:{pq1:[40,71],pier:[9,80]},E:"dock-pq1 pq1-pier",at:[12,74.5],boat:[18,92]},
  /* hspx 11/11「拿掉右上角的入口，回星槎的入口在圖上，跟其他朝代一樣」：船艙左下那艘船的纜繩繫在右下石階旁的木樁；角色走下石階到木樁、朝船揮手 */
  classic:{N:{st1:[77,88],pier:[69,96]},E:"home-st1 st1-pier",at:[20,82],boat:[15,88],nm:"⛵ 回星槎"}};
if(typeof SHW_PSX!=="undefined")for(const k in PH4_PIER){const A=PH4_PIER[k],X=SHW_PSX[k]||(SHW_PSX[k]={N:{},E:"",HS:{}});X.N=Object.assign({},X.N,A.N);X.E=(X.E?X.E+" ":"")+A.E;X.HS=Object.assign({},X.HS,{poBoard:["pier",A.boat[0],A.boat[1],"wave"]})}
function ph4Pier(v,k){const A=PH4_PIER[k],P=v&&v.querySelector(".shp-page.cq");if(!A||!P||P.querySelector("#poBoard"))return;ph4Css();
  const b=document.createElement("button");b.className="shp-spot";b.id="poBoard";b.style.left=A.at[0]+"%";b.style.top=A.at[1]+"%";b.innerHTML="<b>"+(A.nm||"⛵ 上星槎")+"</b>";b.setAttribute("aria-label",A.nm?"回星槎":"走到碼頭上星槎");
  b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);goUp("#/adventure")};
  const z=document.createElement("button");z.type="button";z.className="ph4-pz";z.setAttribute("aria-hidden","true");z.tabIndex=-1;const e=A.N.pier;Object.assign(z.style,{left:(e[0]-9)+"%",top:(e[1]-4.5)+"%",width:"18%",height:"7%"});
  z.onclick=ev=>{ev.stopPropagation();b.click()};
  const first=P.querySelector(".shp-spot");P.insertBefore(z,first);P.append(b)}
if(typeof portWind==="function"){const f0=portWind;portWind=function(v,k){try{if(PORT_CARD_HIDE)ph4Pier(v,k)}catch(e){}const r=f0.apply(this,arguments);try{const pad=PORT_CARD_HIDE&&v&&v.querySelector(".pad.port");if(pad){ph4Css();pad.classList.add("ph4-nc")}if(!ph4Mount(v,k)&&pad)ph4Line(v,k)}catch(e){}return r}}
