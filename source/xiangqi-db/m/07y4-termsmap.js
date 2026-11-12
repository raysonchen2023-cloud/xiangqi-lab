/* ================= 📜 象棋規則「碑林烏金拓」（開發者 11/9 選定 Gemini 方案＋Claude 依考究清單修正；考究說明 park/termsmap/考究說明.md，史學顧問核圖中）=================
   圖：park/termsmap/terms_day_v2.png（Gemini 一次到位；程式把碑色壓成灰石、宣紙後製）、夜版 terms_night_v1.png（碑亭與碑廊簷下白紗燈）→ art/termsmap/ → data/termsmap/。
   書院碑林：三通螭首方趺碑（不用龜趺）＝棋規（玩法）、記譜、術語；碑額保持空白（開發者 11/9：不用細明體假裝篆額），標題是碑頂上的金框小牌。
   點碑＝角色走到碑前鞠躬，播「拓碑」：濕紙敷上碑面 → 棕刷把紙捶進刻痕 → 拓包拍墨（噗噗，有開棋子聲才有聲音），拓成黑底白字的「烏金拓」，再展開成全螢幕的拓片面板。
   拓片面板裡就是原本的三個分頁（玩法的七種棋子示範、記譜法的範例棋盤、術語的搜尋和分類都照舊），只換成烏金拓的樣子：黑底、米白字、行距寬、紙紋很淡；記譜那片另加一張標好一到九路的棋盤圖。
   狀態：沒讀過的碑腳和碑面下緣有青苔，打開讀過一次就退去（store termsRead）；竹葉偶爾飄落。
   包一層 Terms(v,pick)（從別的頁指名查某個術語 pick 時照舊直接開）；接 07w 走路（SHW_TB）、07x 縮放。開關 TERMS_MAP_ON；圖片網址帶 TB2_IMGV */
const TERMS_MAP_ON=true;
const TB2_IMGV="2340";
/* 三通碑（像素，768×1376）：[分頁, 標題, 碑面 左, 上, 右, 下, 碑額 左, 上, 右, 下, 標題牌 x, y, 走路節點] */
const TB_STELE=[["play","棋規",122,643,210,807,153,583,190,623,166,545,"sl"],["note","記譜",333,630,453,857,373,567,410,620,393,510,"sm"],["terms","術語",577,693,677,933,613,657,653,700,640,583,"sr"]];
const SHW_TB={el:38,h:[.085,70,.0012],look0:[50,50],home:"home",N:{home:[50,94.5],mid:[50,76.3],sl:[24.7,67.6],sm:[52,69.8],sr:[78,77]},E:"home-mid mid-sl mid-sm mid-sr"};
const tbPc=(x,y)=>[x/7.68,y/13.76];
const tb2Dark=()=>{const t=store.get("pageTheme","auto");return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)};
/* 記譜用：標好一到九路的棋盤（紅方在下，路數從紅方右手邊數；黑方在上，用 1～9 從黑方右手邊數） */
function tbFiles(){const L=[];for(let i=0;i<9;i++)L.push(i%8?`M${i} 0V4M${i} 5V9`:`M${i} 0V9`);for(let j=0;j<10;j++)L.push(`M0 ${j}H8`);L.push("M3 0L5 2M5 0L3 2M3 7L5 9M5 7L3 9");
  const R="九八七六五四三二一",B="123456789";let T="";for(let i=0;i<9;i++){T+=`<text x="${i}" y="10.15" text-anchor="middle" font-size=".55" fill="#f0b8a8" font-weight="700">${R[i]}</text><text x="${i}" y="-.55" text-anchor="middle" font-size=".5" fill="#e9e1d0">${B[i]}</text>`}
  return`<div class="tb-files"><svg viewBox="-.8 -1.2 9.6 11.9" aria-label="棋盤的一到九路"><path d="${L.join("")}" fill="none" stroke="rgba(233,225,208,.75)" stroke-width=".05"/>${T}<text x="4" y="4.62" text-anchor="middle" font-size=".42" fill="rgba(233,225,208,.6)">楚河　　　　漢界</text></svg>
    <p>下面國字是<b>紅方</b>的路數（從紅方右手邊數起，一到九）；上面數字是<b>黑方</b>的路數（從黑方右手邊數起，1 到 9）。同一條線，紅方叫「二」，黑方叫「8」。</p></div>`}
function tb2Css(){if(document.getElementById("tbmCss"))return;const s=document.createElement("style");s.id="tbmCss";s.textContent=`
.tb-page{margin:0 0 8px}
.tb-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.tb-moss{position:absolute;pointer-events:none;background:radial-gradient(closest-side at 25% 70%,rgba(88,120,64,.5),rgba(88,120,64,0)),radial-gradient(closest-side at 75% 75%,rgba(80,112,58,.45),rgba(80,112,58,0)),radial-gradient(closest-side at 50% 85%,rgba(104,134,76,.32),rgba(104,134,76,0));-webkit-mask-image:radial-gradient(closest-side at 50% 60%,#000 55%,transparent);mask-image:radial-gradient(closest-side at 50% 60%,#000 55%,transparent)}
.tb-face{position:absolute;border:0;padding:0;background:none;cursor:pointer;pointer-events:auto}
.tb-rub{position:absolute;pointer-events:none;overflow:hidden;border-radius:1px}
.tb-rub i{position:absolute;inset:0}
.tb-dim{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .45s ease}.tb-dim.on{opacity:1}
.tb-rub .ink{background:repeating-linear-gradient(90deg,rgba(236,228,210,0) 0 16%,rgba(236,228,210,.22) 16% 17.5%,rgba(236,228,210,0) 17.5% 20%),radial-gradient(120% 90% at 50% 45%,#211e1a 55%,#121110);clip-path:circle(0% at 50% 45%);-webkit-clip-path:circle(0% at 50% 45%);animation:tbInk .6s cubic-bezier(.3,.6,.3,1) .25s forwards;filter:blur(.3px)}
@keyframes tbInk{to{clip-path:circle(80% at 50% 45%);-webkit-clip-path:circle(80% at 50% 45%)}}
.tb-pn.tb-fl .tb-pn-h,.tb-pn.tb-fl .tb-pn-b{opacity:0}.tb-pn .tb-pn-h,.tb-pn .tb-pn-b{transition:opacity .25s ease}
.tb-leaf{position:absolute;width:3.2%;aspect-ratio:1;animation:tbFall 11s linear infinite;animation-delay:-3s}.tb-leaf svg{width:100%;height:100%;display:block}
@keyframes tbFall{0%{transform:translate(0,-30vh) rotate(0)}75%{transform:translate(-10vw,0) rotate(200deg)}100%{transform:translate(-11vw,0) rotate(210deg)}}
.tb-pn{position:fixed;left:0;right:0;top:var(--xqT,0px);bottom:var(--xqB,0px);z-index:948;display:flex;flex-direction:column;background:#1b1916 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.7' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .9 0 0 0 0 .88 0 0 0 0 .82 0 0 0 .05 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  color:#ece4d2;transform:scale(.92);opacity:0;pointer-events:none;transition:opacity .3s,transform .3s}
.tb-pn.open{opacity:1;transform:none;pointer-events:auto}
.tb-pn-h{display:flex;align-items:center;gap:8px;padding:12px 16px 6px;font:900 18px var(--serif,serif);letter-spacing:.2em}
.tb-pn-h button{margin-left:auto;border:1px solid rgba(236,228,210,.4);background:none;color:inherit;border-radius:999px;padding:4px 12px;font:700 14px var(--serif,serif);letter-spacing:0;cursor:pointer}
.tb-pn-b{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:0 4px 24px}
.tb-pn #rTabs{display:none}
.tb-pn.tb-pn .card{background:rgba(236,228,210,.04)!important;border:1px solid rgba(236,228,210,.16)!important;box-shadow:none!important;color:#ece4d2!important;line-height:2!important}
.tb-pn.tb-pn .card div[style*="background"]{background:rgba(236,228,210,.07)!important}
.tb-pn .sec-t{color:#d9c9a3;letter-spacing:.15em}
.tb-pn .muted{color:rgba(236,228,210,.62)!important}
.tb-pn b{color:#fff6e2}
.tb-pn.tb-pn .pill{display:inline-block!important;width:auto!important;background:rgba(166,58,36,.85)!important;color:#fff4dc!important;border:0!important;padding:1px 7px!important;vertical-align:1px}
.tb-pn.tb-pn .items .item{background:rgba(236,228,210,.04);border-color:rgba(236,228,210,.14);color:#ece4d2}
.tb-pn .items .item span{color:rgba(236,228,210,.7)}
.tb-pn .search input{background:rgba(236,228,210,.08);color:#ece4d2;border-color:rgba(236,228,210,.3)}
.tb-pn .chips button,.tb-pn .opt button{background:rgba(236,228,210,.06);color:#ece4d2;border-color:rgba(236,228,210,.3)}
.tb-pn .chips button.on,.tb-pn .opt button.on{background:#a63a24;border-color:#d9a07a;color:#fff4dc}
.tb-pn [style*="border-bottom:1px solid var(--line)"]{border-color:rgba(236,228,210,.14)!important}
.tb-files{margin:6px 12px 10px;padding:10px 10px 4px;border:1px solid rgba(236,228,210,.2);border-radius:6px}.tb-files svg{display:block;width:100%;max-width:320px;margin:0 auto}
.tb-files p{font-size:13.5px;line-height:1.9;margin:6px 2px}
.tb-page .shp-spot.tb-tag{padding:4px 12px}.tb-page .shp-spot.tb-tag b{font-size:15px;letter-spacing:.15em;white-space:nowrap}
@media (prefers-reduced-motion:reduce){.tb-leaf{display:none}.tb-pn{transition:none}}`;document.head.append(s)}
/* 拓包拍墨的「噗」聲（有開棋子聲才響） */
function tbPuff(n){try{if(!store.get("mvSound",false))return;const C=new (window.AudioContext||window.webkitAudioContext)();const len=Math.round(C.sampleRate*.07);
  for(let k=0;k<n;k++){const buf=C.createBuffer(1,len,C.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
    const src=C.createBufferSource(),f=C.createBiquadFilter(),g=C.createGain();src.buffer=buf;f.type="lowpass";f.frequency.value=520;g.gain.value=.5;src.connect(f).connect(g).connect(C.destination);src.start(C.currentTime+k*.16)}
  setTimeout(()=>{try{C.close()}catch(e){}},n*200+400)}catch(e){}}
function termsMap(v){if(v.querySelector(".tb-page"))return;const tabs=v.querySelector("#rTabs");if(!tabs)return;tb2Css();
  const RD=store.get("termsRead",{})||{};
  const P=document.createElement("div");P.className="shp-page cq tb-page";const pc=tbPc;
  const leaf='<svg viewBox="-10 -10 20 20"><path d="M0-9C3-5 3 4 0 9C-3 4-3-5 0-9Z" fill="#7fa36a" stroke="rgba(50,70,40,.6)" stroke-width=".6"/></svg>';
  let fx="";for(const[k,,x0,y0,x1,y1,zx0,zy0,zx1,zy1]of TB_STELE){const[a,b]=pc(x0,y1-(y1-y0)*.32),[c,d]=pc(x1,y1+18);
    if(!RD[k])fx+=`<span class="tb-moss" style="left:${(a-1).toFixed(2)}%;top:${b.toFixed(2)}%;width:${(c-a+2).toFixed(2)}%;height:${(d-b).toFixed(2)}%"></span>`;
}
  fx+=`<span class="tb-leaf" style="left:70%;top:62%">${leaf}</span>`;
  P.innerHTML=`<img src="${xqClImg(`data/termsmap/${tb2Dark()?"terms_night":"terms_day"}.webp?v=${TB2_IMGV}`)}" alt="書院碑林"><div class="tb-fx" aria-hidden="true">${fx}</div>`+
    TB_STELE.map(([k,t,x0,y0,x1,y1])=>{const[a,b]=pc(x0,y0),[c,d]=pc(x1,y1);return`<button type="button" class="tb-face" data-k="${k}" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%;width:${(c-a).toFixed(2)}%;height:${(d-b).toFixed(2)}%" aria-label="${t}碑"></button>`}).join("")+
    TB_STELE.map(([k,t,,,,,,,,,lx,ly])=>{const[a,b]=pc(lx,ly);return`<button class="shp-spot tb-tag" id="tbT_${k}" data-k="${k}" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%"><b>${t}</b></button>`}).join("");
  v.insertBefore(P,tabs);
  /* 拓片面板：原本的分頁和內容整包搬進來（還在 v 裡面，原本綁好的按鈕、搜尋、示範都照常） */
  const pn=document.createElement("div");pn.className="tb-pn";pn.setAttribute("role","dialog");pn.innerHTML='<div class="tb-pn-h"><span id="tbPnT"></span><button type="button">收起拓片</button></div><div class="tb-pn-b"></div>';
  const body=pn.querySelector(".tb-pn-b");for(const id of["rTabs","rPlay","rNote","rTerms"]){const e=v.querySelector("#"+id);if(e)body.append(e)}v.append(pn);
  let unNav=null;const close=()=>{pn.classList.remove("open");if(unNav){const f=unNav;unNav=null;f()}};pn.querySelector(".tb-pn-h button").onclick=close;
  const openTab=k=>{const b=body.querySelector(`#rTabs [data-k="${k}"]`);if(b)b.click();pn.querySelector("#tbPnT").textContent=(TB_STELE.find(s=>s[0]===k)||[])[1]||"";body.scrollTop=0;
    if(k==="note"){const n=body.querySelector("#rNote");if(n&&!n.querySelector(".tb-files"))n.insertAdjacentHTML("afterbegin",tbFiles())}
    if(!pn.classList.contains("open")&&typeof xqPanelNav==="function")unNav=xqPanelNav(()=>{unNav=null;pn.classList.remove("open")});   /* 回饋 803：返回鍵先收起拓片 */
    pn.classList.add("open");const R=store.get("termsRead",{})||{};if(!R[k]){R[k]=1;store.set("termsRead",R)}};
  const rub=k=>{const S=TB_STELE.find(s=>s[0]===k);if(!S)return;if(matchMedia("(prefers-reduced-motion: reduce)").matches){openTab(k);return}
    /* 11/9 開發者「動畫太詭異，請重新設計」：原本白紙框、條紋、墨點一格一格跳，框又不貼碑形。改成：四周暗下來只留這通碑 → 碑面墨從中間暈開、透出幾行淡淡的字 → 拓片從碑面升起放大成全螢幕，字最後才淡入 */
    const[,,x0,y0,x1,y1]=S,[a,b]=pc(x0,y0),[c,d]=pc(x1,y1),fx=P.querySelector(".tb-fx"),r=document.createElement("span"),dm=document.createElement("i");r.className="tb-rub";dm.className="tb-dim";
    const cx=((a+c)/2).toFixed(1),cy=((b+d)/2).toFixed(1);dm.style.background=`radial-gradient(${((c-a)*1.1).toFixed(1)}% ${((d-b)*.75).toFixed(1)}% at ${cx}% ${cy}%,rgba(20,18,16,0) 60%,rgba(20,18,16,.55) 100%)`;
    Object.assign(r.style,{left:a.toFixed(2)+"%",top:b.toFixed(2)+"%",width:(c-a).toFixed(2)+"%",height:(d-b).toFixed(2)+"%",borderRadius:"3px"});r.innerHTML="<i class='ink'></i>";fx.append(dm,r);requestAnimationFrame(()=>dm.classList.add("on"));
    setTimeout(()=>tbPuff(3),300);
    setTimeout(()=>{const R0=r.getBoundingClientRect(),R1=pn.getBoundingClientRect();pn.classList.add("tb-fl");
      if(R0.width>2&&R1.width>2){pn.style.transition="none";pn.style.transformOrigin="0 0";pn.style.opacity="1";pn.style.transform=`translate(${(R0.left-R1.left).toFixed(1)}px,${(R0.top-R1.top).toFixed(1)}px) scale(${(R0.width/R1.width).toFixed(4)},${(R0.height/R1.height).toFixed(4)})`;void pn.offsetWidth;
        pn.style.transition="transform .45s cubic-bezier(.2,.7,.2,1)"}
      openTab(k);requestAnimationFrame(()=>{pn.style.transform=""});
      setTimeout(()=>{pn.classList.remove("tb-fl");pn.style.transition=pn.style.transformOrigin=pn.style.opacity="";r.remove();dm.remove()},480)},900)};
  P.querySelectorAll(".tb-face").forEach(f=>f.onclick=e=>{e.stopPropagation();const t=P.querySelector("#tbT_"+f.dataset.k);if(t)t.click();else rub(f.dataset.k)});
  P.querySelectorAll(".tb-tag").forEach(b=>b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);rub(b.dataset.k)});
  if(typeof shpFit==="function")shpFit(v);
  const HS={};TB_STELE.forEach(([k,,x0,y0,x1,y1,,,,,,,nd])=>{const[a,b]=pc((x0+x1)/2,(y0+y1)/2);HS["tbT_"+k]=[nd,+a.toFixed(2),+b.toFixed(2),"bow"]});
  try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_TB,{HS}),"tb")}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof Terms==="function"){const f0=Terms;Terms=function(v,pick){const r=f0.apply(this,arguments);try{if(TERMS_MAP_ON&&!pick)termsMap(v)}catch(e){}return r}}
