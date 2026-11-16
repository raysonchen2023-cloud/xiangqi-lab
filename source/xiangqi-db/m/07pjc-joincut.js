/* ================= 七星加入過場（開發者 hspx 11/16「當有新角色夥伴加入時，請 gemini 做一個過場動畫」；分鏡 story/七星加入過場分鏡_1116.md）=================
   選單定案：每場 3 張分鏡（遇困 → 解局 → 同行）；場景圖不畫七星，App 疊 Q 版立繪 data/xs/prev_<角色>.webp（去背 300×400）。
   時機：07pty-party.js 的 ptyOnSolve（解開下船幫忙的那一題、他加入）→ 這一站有過場資料就先播 pjcPlay，播完或略過再出原本的加入卡 ptyJoinCard；沒有資料照舊。
   一場只在加入那一次播（ptyOnSolve 只在第一次解開、他還沒加入時才會走到），不另外存檔。
   播法（照 07mnf-mainfilm.js 的電影頁：#mnfPg 同一個 z-index、寬螢幕放中間直幅框、右上「略過」）：
     每張約 2.6～2.9 秒、交叉淡入、緩慢推鏡頭（Ken Burns），全長約 8 秒；點畫面跳下一張，「略過」直接結束；減少動態時不推鏡頭、不滑入。
     第 1 張：加入的人站在下方中央空地，從下方淡入；字幕＝困境（say1，沒寫就取 PTY_MEET 最後一句）。
     第 2 張：左下加入的人、右下陪你走的人（ptyLook，沒有或就是他自己時用齊轍）；鏡頭推近案面後，案面正上方浮出正面的小棋盤，畫那一題（PTY.JOIN[c].help）的起始局面
       （題目：07c-canju.js cjData().byId，星槎手擺題在 ship-set.json；棋盤：01-board.js Board(null)＋00-util.js parseFen）。拿不到題目就只推鏡、不畫棋盤。
     第 3 張：兩人並肩在甲板中央；字幕＝「名字：「加入那句」」（PTY_SAY）。
   圖載入失敗（404）就跳過那一張；全部失敗直接結束，加入卡照出，不會卡住。onDone 保證只呼叫一次。
   新朝代只要加資料：PJC_SC[站]＝{c 加入的人, img:[三張圖代號（data/ptyjoin/<代號>.webp）], say1 第 1 張字幕（選填）, bd [棋盤中心 x, 中心 y, 寬]（圖上像素，選填）, tb [案面中心 x, y]（推鏡焦點，選填）, lay 立繪位置（選填，見 PJC_LAY）}。
   名稱前綴 pjc／PJC（m/*.js 共用全域，11/16 grep 過沒人用）。 */
const PJC_W=768,PJC_H=1376;
/* 每張秒數、交叉淡入秒數、圖還沒載到最多等幾秒（等不到當失敗、跳過） */
const PJC_DUR=[2.6,2.9,2.8],PJC_XD=.8,PJC_WAIT=4;
/* 立繪位置（圖上像素，照分鏡共同規格：下方中央留空地；第 2 張左右下角；第 3 張兩人並肩）：[中心 x, 腳底 y, 高] */
const PJC_LAY=[[[384,1265,370]],[[200,1300,360],[572,1300,360]],[[272,1275,345],[512,1275,345]]];
const PJC_SC={
  /* 漢・西域大漠驛站（駱躍梅）：j1 驛站門外三名驛卒、下方中央空地；j2 驛舍矮案，案面四角約 遠左 300,457／遠右 666,600／近右 520,692／近左 152,528（中心 409,569）；j3 星槎船尾甲板 */
  han:{c:"x_miaogirl",img:["han_j1","han_j2","han_j3"],say1:"沙暴快來了，驛卒卻把她扣了下來。",bd:[410,440,270],tb:[409,569],   /* 11/16 本機看過：bd 原本 [410,372,300] 棋盤上緣壓到上方字幕，下移縮小 */
    
    lay:[[[356,1265,370]],[[180,1305,365],[590,1305,365]],[[270,1275,345],[515,1275,345]]]}};
const pjcUrl=n=>"data/ptyjoin/"+n+".webp";
const pjcTr=s=>{try{return typeof i18nStoryText==="function"?i18nStoryText(s):s}catch(e){return s}};
const pjcEn=()=>{try{return typeof i18nLang==="function"&&i18nLang()==="en"}catch(e){return false}};
const pjcNm=c=>{try{return typeof ptyNm==="function"?ptyNm(c):WX_CHARS[c].n}catch(e){return c}};
/* 第 1 張字幕：有寫 say1 用 say1；沒有就取 PTY_MEET 最後一句，太長只留最後一個逗號後面那段 */
function pjcMeet(k){const S=PJC_SC[k]||{};if(S.say1)return S.say1;let t="";try{t=String((typeof PTY_MEET!=="undefined"&&PTY_MEET[k])||"")}catch(e){}
  const L=t.split("。").map(x=>x.trim()).filter(Boolean);let s=L.length?L[L.length-1]:"";if(s.length>22&&s.includes("，"))s=s.slice(s.lastIndexOf("，")+1);return s?s+"。":""}
/* 第 3 張字幕 */
function pjcSay(c){let s="";try{s=(typeof PTY_SAY!=="undefined"&&PTY_SAY[c])||""}catch(e){}if(!s)return"";const nm=pjcNm(c);
  return pjcEn()?pjcTr(nm)+": “"+pjcTr(s)+"”":nm+"：「"+s+"」"}
/* 陪你走的人：ptyLook；沒有、或就是加入的那位，用齊轍（齊轍自己加入時用駱躍梅） */
function pjcMate(c,L){if(L&&L[1]&&L[1]!==c)return L[1];let m="";try{m=typeof ptyLook==="function"?ptyLook():""}catch(e){}if(!m||m===c)m="x_swordboy";if(m===c)m="x_miaogirl";return m}
/* 那一題的起始局面：Promise → {fen,side} 或 null（拿不到不報錯） */
function pjcPz(c){try{const j=typeof PTY!=="undefined"&&PTY.JOIN[c],id=j&&j.help;if(!id||typeof cjData!=="function")return Promise.resolve(null);
  return Promise.resolve(cjData()).then(D=>{const P=D&&D.byId&&D.byId[id];return P&&P.fen?{fen:String(P.fen),side:P.side||"r"}:null}).catch(()=>null)}catch(e){return Promise.resolve(null)}}
function pjcCss(){if(document.getElementById("pjcCss"))return;const s=document.createElement("style");s.id="pjcCss";s.textContent=`
#pjcPg{position:fixed;inset:0;z-index:9100;background:#05060d;color:#f6efe0;overflow:hidden;opacity:0;transition:opacity .45s;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#pjcPg.on{opacity:1}
#pjcPg .pjc-fr{position:absolute;inset:0;overflow:hidden;background:#05060d}
@media (min-aspect-ratio:4/5){#pjcPg .pjc-fr{left:50%;right:auto;width:min(100vw,max(calc(100vh*.62),360px));transform:translateX(-50%);box-shadow:0 0 60px rgba(0,0,0,.7)}}
#pjcPg .pjc-sh{position:absolute;inset:0;opacity:0;transition:opacity ${PJC_XD}s ease-in-out}
#pjcPg .pjc-sh.on{opacity:1}
#pjcPg .pjc-im{position:absolute;background:#05060d center/100% 100% no-repeat;will-change:transform}
#pjcPg .pjc-bd{position:absolute;opacity:0;transform:translateY(26%) scale(.62);transition:opacity .7s,transform 1s cubic-bezier(.2,1,.3,1)}
#pjcPg .pjc-bd.on{opacity:1;transform:none}
#pjcPg .pjc-bd::before{content:"";position:absolute;left:-18%;right:-18%;top:-14%;bottom:-14%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,222,140,.55),rgba(255,210,120,0));pointer-events:none}
#pjcPg .pjc-bdi{position:relative;padding:3%;border-radius:8px;background:linear-gradient(#efe3c4,#dcc79c);border:2px solid #8a5a2b;box-shadow:0 0 0 2px rgba(255,230,160,.45),0 14px 34px rgba(0,0,0,.6)}
#pjcPg .pjc-bdi svg{display:block;width:100%;height:auto}
#pjcPg .pjc-who{position:absolute;background:center bottom/contain no-repeat;filter:drop-shadow(0 6px 12px rgba(0,0,0,.55));opacity:0;transform:translateY(22%);transition:opacity .7s,transform .9s cubic-bezier(.2,1,.3,1);pointer-events:none}
#pjcPg .pjc-who.on{opacity:1;transform:none}
#pjcPg .pjc-lb{position:absolute;left:0;right:0;top:0;height:22%;background:linear-gradient(rgba(4,4,10,.62),rgba(4,4,10,0));pointer-events:none}
#pjcPg .pjc-sub{position:absolute;left:0;right:0;top:calc(66px + env(safe-area-inset-top,0px));padding:.3em 22px;text-align:center;text-wrap:balance;font:800 var(--pjcs,24px)/1.45 var(--serif,serif);letter-spacing:.08em;color:#fff7e6;text-shadow:0 0 2px #000,0 0 3px #000,0 2px 10px #000;opacity:0;transform:translateY(-6px);transition:opacity .5s,transform .7s;pointer-events:none}
#pjcPg .pjc-sub.on{opacity:1;transform:none}
#pjcPg .pjc-k{position:absolute;right:14px;top:calc(12px + env(safe-area-inset-top,0px));z-index:3;min-width:72px;min-height:44px;padding:10px 18px;border-radius:99px;font:700 16px var(--serif,serif);color:#f2e4c4;background:rgba(0,0,0,.45);border:1px solid rgba(232,199,122,.6)}
#pjcPg .pjc-k:focus-visible{outline:3px solid #E8C77A;outline-offset:3px}
@media (prefers-reduced-motion:reduce){#pjcPg .pjc-im,#pjcPg .pjc-who,#pjcPg .pjc-bd{transition-duration:.01s!important;transform:none!important}}`;document.head.append(s)}
/* 播放：k 站、L 加入的人（陣列）、onDone({skipped}) 一定只呼叫一次。回傳 {next,skip}；沒有資料回 null（onDone 照樣會叫） */
function pjcPlay(k,L,onDone){let ended=false;const end=r=>{if(ended)return;ended=true;try{if(typeof onDone==="function")onDone(r||{})}catch(e){}};
  const S=PJC_SC[k];L=[].concat(L||[]);const c=L[0]||(S&&S.c);
  if(!S||!c||typeof document==="undefined"||!document.body){setTimeout(()=>end({skipped:true,missing:true}),0);return null}
  pjcCss();let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  {const x=document.getElementById("pjcPg");if(x)x.remove()}
  const mk=(t,cls,p)=>{const e=document.createElement(t);if(cls)e.className=cls;if(p)p.append(e);return e};
  const o=mk("div");o.id="pjcPg";o.setAttribute("role","dialog");o.setAttribute("aria-label",pjcTr("七星加入過場"));
  const fr=mk("div","pjc-fr",o),lb=mk("div","pjc-lb",fr),sub=mk("div","pjc-sub",fr),kb=mk("button","pjc-k",fr);
  lb.setAttribute("aria-hidden","true");sub.setAttribute("aria-live","polite");kb.type="button";kb.textContent=pjcTr("略過");
  document.body.append(o);
  const raf=f=>{if(typeof requestAnimationFrame==="function")requestAnimationFrame(()=>requestAnimationFrame(f));else setTimeout(f,30)};
  raf(()=>o.classList.add("on"));try{kb.focus({preventScroll:true})}catch(e){}
  const mate=pjcMate(c,L),LY=S.lay||PJC_LAY,tb=S.tb||[384,600],bd=S.bd||[tb[0],tb[1]-200,300];
  const shots=[{img:S.img[0],kb:[[1,50,72],[1.08,50,72]],who:[c],ly:LY[0],say:pjcTr(pjcMeet(k)),wd:.25},
    {img:S.img[1],kb:[[1,tb[0]*100/PJC_W,tb[1]*100/PJC_H],[1.22,tb[0]*100/PJC_W,tb[1]*100/PJC_H]],who:[c,mate],ly:LY[1],say:pjcTr("一起解開了這盤棋。"),board:1.3,wd:.1},
    {img:S.img[2],kb:[[1.1,50,66],[1,50,66]],who:[c,mate],ly:LY[2],say:pjcSay(c),wd:.15}].filter(x=>x.img);
  /* 字級：最長那句一行放 15 字左右，再長就換行 */
  let W=0,H=0;const fit=()=>{W=fr.clientWidth||o.clientWidth||(typeof innerWidth==="number"?innerWidth:0)||390;H=fr.clientHeight||o.clientHeight||(typeof innerHeight==="number"?innerHeight:0)||844;const n=Math.max(8,...shots.map(x=>Math.min(15,String(x.say||"").length)));
    try{o.style.setProperty("--pjcs",Math.max(18,Math.min(28,Math.floor((W-44)/(n*1.1))))+"px")}catch(e){}if(cur)place(cur)};
  /* 圖預載：1＝好了、-1＝失敗 */
  const st={},wait={};const ld=u=>{if(st[u]!=null)return;st[u]=0;try{const im=new Image();im.decoding="async";
      im.onload=()=>{st[u]=1;const f=wait[u];wait[u]=null;if(f)f()};im.onerror=()=>{st[u]=-1;const f=wait[u];wait[u]=null;if(f)f()};im.src=u}catch(e){st[u]=-1}};
  shots.forEach(x=>ld(pjcUrl(x.img)));
  let pz=null;pjcPz(c).then(P=>{pz=P;if(cur&&cur.S.board!=null&&cur.bdDue)addBoard(cur)});
  let fin=false,si=-1,gen=0,cur=null;const T=new Set();const later=(f,s)=>{const id=setTimeout(()=>{T.delete(id);f()},s*1000);T.add(id);return id};
  /* 圖在畫面上的位置（cover：等比放大到蓋滿，置中裁切） */
  const cover=()=>{const s=Math.max(W/PJC_W,H/PJC_H);return{s,x:(W-PJC_W*s)/2,y:(H-PJC_H*s)/2}};
  const kbSet=(el,K)=>{if(rm)return;el.style.transformOrigin=K[1]+"% "+K[2]+"%";el.style.transform="scale("+K[0]+")"};
  function place(C){const v=cover(),im=C.im;im.style.left=v.x+"px";im.style.top=v.y+"px";im.style.width=PJC_W*v.s+"px";im.style.height=PJC_H*v.s+"px";
    C.who.forEach((w,i)=>{const p=C.S.ly[i]||C.S.ly[0];if(!p)return;const h=p[2]*v.s,ww=h*.75;let x=v.x+p[0]*v.s-ww/2;x=Math.max(4,Math.min(W-ww-4,x));
      w.style.left=x+"px";w.style.top=v.y+p[1]*v.s-h+"px";w.style.width=ww+"px";w.style.height=h+"px"})}
  function addBoard(C){if(C.bd||!pz||fin||typeof Board!=="function"||typeof parseFen!=="function")return;
    try{const B=Board(null),b=parseFen(pz.fen.split(" ")[0]);B.draw(b,{});const w=mk("div","pjc-bd",C.im),wi=mk("div","pjc-bdi",w);wi.append(B.svg);w.setAttribute("aria-hidden","true");
      w.style.left=(bd[0]-bd[2]/2)*100/PJC_W+"%";w.style.width=bd[2]*100/PJC_W+"%";w.style.top=(bd[1]-bd[2]*.58)*100/PJC_H+"%";C.bd=w;raf(()=>w.classList.add("on"))}catch(e){}}
  const subSet=t=>{sub.classList.remove("on");later(()=>{if(fin)return;sub.textContent=t||"";if(t)raf(()=>sub.classList.add("on"))},rm?0:.35)};
  function render(i){const X=shots[i],el=mk("div","pjc-sh"),im=mk("div","pjc-im",el);im.style.backgroundImage="url("+pjcUrl(X.img)+")";
    const who=X.who.map(w=>{const d=mk("div","pjc-who",el);d.style.backgroundImage="url(data/xs/prev_"+w+".webp)";d.setAttribute("aria-hidden","true");return d});
    fr.insertBefore(el,lb);const C={el,im,who,S:X,bd:null,bdDue:false},prev=cur;cur=C;place(C);kbSet(im,X.kb[0]);
    raf(()=>{if(fin)return;el.classList.add("on");if(!rm){im.style.transition="transform "+(PJC_DUR[i]||2.8)+"s cubic-bezier(.3,.2,.4,1)";kbSet(im,X.kb[1])}
      who.forEach((w,j)=>later(()=>w.classList.add("on"),rm?0:X.wd+j*.2))});
    if(prev){const pe=prev.el;pe.classList.remove("on");setTimeout(()=>{try{pe.remove()}catch(e){}},(PJC_XD+.1)*1000)}   /* 舊的那張淡出後拿掉（不跟著換張清計時器，連點也不會留下舊層） */
    subSet(X.say);
    if(X.board!=null)later(()=>{if(cur!==C)return;C.bdDue=true;addBoard(C)},rm?.2:X.board)}
  /* 換到第 i 張：圖失敗就跳過；還在載就等（最多 PJC_WAIT 秒）；超過最後一張就結束 */
  function show(i){if(fin)return;const g=++gen;T.forEach(clearTimeout);T.clear();
    for(;i<shots.length;i++){const u=pjcUrl(shots[i].img);if(st[u]!==-1)break}
    if(i>=shots.length){finish(false);return}
    const u=pjcUrl(shots[i].img);
    if(st[u]!==1){wait[u]=()=>{if(g===gen)show(i)};later(()=>{if(g!==gen||st[u]===1)return;st[u]=-1;wait[u]=null;show(i+1)},PJC_WAIT);return}
    si=i;render(i);later(()=>{if(g===gen)show(i+1)},PJC_DUR[i]||2.8)}
  function finish(sk){if(fin)return;fin=true;gen++;T.forEach(clearTimeout);T.clear();try{removeEventListener("resize",fit)}catch(e){}try{document.removeEventListener("keydown",key)}catch(e){}
    o.classList.remove("on");setTimeout(()=>{try{o.remove()}catch(e){}},500);setTimeout(()=>end({skipped:!!sk}),sk?120:300)}
  const next=()=>{if(fin)return;if(typeof vibrate==="function")try{vibrate(5)}catch(e){}if(si<0)return;show(si+1)};
  const skip=()=>{if(fin)return;if(typeof vibrate==="function")try{vibrate(5)}catch(e){}finish(true)};
  function key(e){if(e&&e.key==="Escape"){try{e.preventDefault()}catch(x){}skip()}}
  o.addEventListener("click",next);kb.onclick=e=>{try{e.stopPropagation()}catch(x){}skip()};
  try{addEventListener("resize",fit)}catch(e){}try{document.addEventListener("keydown",key)}catch(e){}
  fit();show(0);return{next,skip,get i(){return si},get done(){return fin}}}
