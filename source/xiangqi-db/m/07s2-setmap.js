/* ================= ⚙ 設定頁滿版水墨圖「雲河驛站・天字客房」（開發者 11/8 定案：Gemini 方案 1＋3 合體；史學顧問核圖中）=================
   規劃：story/gemini_app/39 號 md；圖：park/setmap/set_day_v4.png、夜版 set_night.png（11/8：炕桌棋盤改成有厚度、比較俯視的棋枰，底線 9 子分得開；Gemini＋兩次局部修：13 把扇、明式衣架與四方平定巾、桌上鏡架銅鏡、羅漢床上的炕桌與腳踏、檻窗、石磬、無蓋宣德爐、單張路引；琴頭翻到右邊、炕桌棋盤都是程式畫；宣紙後製）→ art/setmap/set_day.webp。
   包一層 Settings(v)：原本的四個分頁（角色／棋盤／聲音／系統）照舊畫、照舊綁好，整包收進從下方滑出的「宣紙畫軸」面板；
   點圖上的東西＝打開畫軸、切到那個分頁、捲到那一段並閃一下（菱花鏡直接看 3D 立繪）：
     角色：衣帽架＝換造型（我的角色）、桌上的銅鏡＝3D 立繪（#meFig）、牆上腰牌＝官階、書案上的刻刀匣＝本命棋子；
     棋盤：羅漢床上的炕桌＝棋盤（預覽和測試）、牆上 13 把摺扇＝朝代樣式、支摘窗＝深淺色、筆筒＝字體；
     聲音：七弦琴＝語音報棋、石磬＝棋子聲、宣德爐的香煙＝氛圍；
     系統：玄關長案的信插＝意見回饋、手札＝修正紀錄、驛路文牒＝關於・版本、地上的包袱書箱＝換手機、書案角落的小鎖匣＝隱私・開發者模式。
   場景跟著設定變：深色＝夜版（data/setmap/set_night.webp，還沒畫好前用程式把畫面調暗、點燈）；聲音全關＝古琴蓋上琴囊；
     換朝代棋盤＝棋桌上的棋盤框換成那一朝的顏色；高對比＝棋子描金邊。
   標籤只有大字。接 07w 走路（SHW_SETMAP）、07x 兩指縮放。圖片網址帶 SM_IMGV。開關 SETMAP_ON（false＝照舊分頁清單）；樣式在 smCss */
const SETMAP_ON=true;   /* 開發者 11/8 說打開 */
const SM_IMGV="2300";   /* 11/9 修圖：石磬改曲尺形（日夜兩張） */
/* 入口：[id, 左%, 上%, 大字, 分頁, 要捲到的元素]（量 768×1376 的 set_day_v2，標籤放在東西上方） */
const SM_SPOTS=[
  ["smFan",15,10.5,"🪭 朝代配色","look","#era"],["smWin",55,15,"🪟 淺色／深色","look","#pt"],["smBoard",50,31,"♟ 試看棋盤","look","#pv"],
  ["smBrush",74,31.5,"🖌 字體","look","#ftM"],["smKnife",86,22,"🔪 本命棋子","bot","[data-bp],.bpc"],["smLock",92,33,"🔒","more","#dm"],   /* 11/12 第 11 輪觸控測試：字體與本命棋子原本上下貼在一起（重疊）、小鎖匣貼右緣被裁；三個拉開、往畫面內收，44px 高的點選範圍也不互蓋 */
  ["smRobe",16,39.5,"👘 換造型","bot","#meFig"],["smTag",7,57,"🏮 官階","bot",".botN"],["smMirror",32,50.5,"🪞 3D 立繪","bot","#meFig"],
  ["smInc",55,48.5,"🕯 氛圍","sound","#snd3"],["smQin",76,49.5,"🎵 語音報棋","sound","#snd2"],["smBell",93,45,"🔔 棋子聲","sound","#snd"],
  ["smMail",70,70.5,"✉ 意見回饋","more","#fb"],["smNote",55,77,"📒 修正紀錄","more","#fxh"],["smPass",86,76,"📜 關於","more","#about"],["smPack",48,83,"🎒 換手機","more","#xfOut"]];   /* 第 12 輪 F2：換手機 48,84 → 48,83（iPhone SE 加安全區時，下緣的 44px 點選範圍被畫面底切掉 2～3px） */
/* 回饋 831（開發者 11/9「設定內，每一個入口處只會跳出他的相關內容，按照修正紀錄或我的戰績那種跳法；調聲音只會看到調聲音的內容，不會看到其他設定相關」）：
   點圖上的器物＝只開那一樣東西自己的面板（07w 的 xqSheet，跟 812 修正紀錄、828 我的戰績同一套：夾在頂欄與底欄之間、可捲、返回／點外面／✕ 收起、顏色跟日夜主題），標題＝那個入口的名字；
   內容是從 05-settings 原本畫好、綁好的設定「整塊搬」過來的同一批節點（事件、即時生效、存檔都照舊），收起時原封不動搬回原位（留一個註解節點當書籤）。
   SM_EP［入口］＝要搬的區塊：sec:選擇器＝那一格所在的整段（往上含標題 .sec-t、往下到下一個標題前）；head:＝只要標題＋那一格；el:＝只要那一格；title:文字＝標題正好是這幾個字的那一段；btn:＝單獨一顆按鈕。
   沒有列在這裡的入口照舊：菱花鏡＝看 3D 立繪、信插／手札＝意見回饋頁、文牒／書箱＝07s4 的換手機面板。整卷畫軸（四個分頁全部設定）留著，入口改成頂欄的「📜 全部設定」。 */
const SM_EP={smFan:["sec:#era"],smWin:["sec:#pt"],smBoard:["el:#pv","sec:#th","el:#hiCon","sec:#mv","sec:#rsO"],smBrush:["head:#ftM","sec:#fzM","head:#zhO"],
  smKnife:["sec:.bpc","el:#chdForm"],smRobe:["sec:#meFig","sec:#dglSw","sec:#botT","sec:#epSw"],smTag:["title:官階"],
  smInc:["sec:#snd3"],smQin:["sec:#snd2"],smBell:["sec:#snd"],smLock:["sec:#axmSw","btn:#sh","btn:#a2h","sec:#fmSet","title:隱私","title:進階"]};   /* 11/12：♿ 無障礙（螢幕報讀與鍵盤模式、高對比、測試與證據，11b-a11y.js axmSetRows）原本在設定房間沒有入口，放在小鎖匣最上面；棋規（#rsO 千秋休閒規則／臺灣棋規原型）也沒有入口，放進「試看棋盤」最後面 */   /* 11/9：小鎖匣加家長與護眼（843，07m5）；線上大廳的名字與封鎖名單（841／842，07x4）接在「我的角色」卡後面，跟著衣帽架一起出現 */
/* 11/13 晚：平日體力開關（07dgl-stamina.js dglSetRow 畫的 #dglSw）跟著衣帽架「我的角色」面板一起出現 */
/* 11/12 ChatGPT UI 冗餘盤查（story/104 號）第 7 項：棋盤外觀三個入口照「點了會改什麼」命名——摺扇＝朝代配色、支摘窗＝淺色／深色、炕桌＝試看棋盤（預覽、試走、材質、特效）；
   面板裡 05-settings 畫的小節標題（棋盤的朝代樣式、棋盤風格、深淺色）在這裡換成同一套字（SM_SECNM，只換畫面上的字，不動設定值與存檔），從場景點進去看到的面板標題、小節標題一致。
   木紋、石板、宣紙…那一組（BOARD_THEMES）標成「棋盤材質」 */
const SM_SECNM={"棋盤的朝代樣式":"朝代配色","棋盤風格":"棋盤材質","深淺色":"淺色／深色"};
function smSecNm(root){let n=0;try{root.querySelectorAll(".sec-t").forEach(h=>{const t=h.textContent.trim();if(SM_SECNM[t]){h.textContent=SM_SECNM[t];n++}})}catch(e){}return n}
const SM_EPT={smBoard:"♟ 試看棋盤",smRobe:"👘 我的角色",smLock:"🔒 系統・隱私・家長"};
/* 07w 的座標表：從右下角的房門進來；鏡台、香爐凳、琴桌、羅漢床前的棋桌之間留走道 */
const SHW_SETMAP={el:40,h:[.085,70,.0012],look0:[40,60],
  N:{home:[80,95],f1:[55,73],f2:[46,61],tbl:[47,52],dk1:[64,51],desk:[78,49.5],mir:[32,72],robe:[17,70],snd:[66,65],xuan:[48,79]},
  E:"home-f1 f1-f2 f2-tbl tbl-dk1 dk1-desk f1-mir mir-robe f1-snd f1-xuan home-xuan",
  HS:{smFan:["robe",15,25,"bow"],smWin:["tbl",55,24,"wave"],smBoard:["tbl",50,35,"cheer"],smBrush:["desk",79,32,"bow"],smKnife:["desk",86,34,"bow"],smLock:["desk",94,35,"bow"],
    smRobe:["robe",16,48,"bow"],smTag:["robe",3,48,"bow"],smMirror:["mir",32,60,"bow"],smInc:["snd",56,54,"wave"],smQin:["snd",75,54,"wave"],smBell:["snd",93,52,"wave"],
    smMail:["xuan",72,75,"bow"],smNote:["xuan",67,82,"bow"],smPass:["xuan",70,79,"bow"],smPack:["xuan",50,90,"wave"]}};
/* 棋桌上程式畫的棋盤（量圖的像素）：四個角 P00 左上、P10 左下、P11 右下、P01 右上；U 往下＝9 條直線、V 往右＝10 條橫線 */
const SM_BOARD={q:[[354,453],[343,486],[447,486],[436,453]],mu:.07,mv:.045};   /* 史學顧問 11/8：棋盤移到羅漢床上的炕桌（set_day_v3） */
function smCss(){if(document.getElementById("smCss"))return;const s=document.createElement("style");s.id="smCss";s.textContent=`
.set-page{margin:0 0 6px}.set-page .shp-spot{max-width:40%;padding:3px 9px;z-index:3}.set-page .shp-spot b{white-space:nowrap;font-size:13px}
.sm-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.sm-night{position:absolute;inset:0;background:linear-gradient(rgba(16,22,48,.55),rgba(20,24,40,.5));mix-blend-mode:multiply}
.sm-lamp{position:absolute;width:30%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(255,214,140,.55),rgba(255,190,90,0));mix-blend-mode:screen}
.sm-bag{position:absolute;left:63.5%;top:52.2%;width:24.5%;height:3.6%;border-radius:40% 40% 30% 30%/60% 60% 40% 40%;transform:rotate(-1.2deg);
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 3px,transparent 3px 9px),linear-gradient(#2f4a7a,#1f3358);box-shadow:inset 0 0 0 1px #11203a,0 1px 2px rgba(0,0,0,.35)}
.sm-bag::after{content:"";position:absolute;right:6%;top:-35%;width:7%;height:170%;border-radius:40%;background:#c69a3c;box-shadow:inset 0 0 0 1px #6b4f17}
.sm-frame{position:absolute;pointer-events:none;mix-blend-mode:multiply;opacity:.55}
.sm-gold{position:absolute;border-radius:50%;border:1.5px solid #e8b93c;box-shadow:0 0 2px #f2c94c;transform:translate(-50%,-50%);pointer-events:none}
.sm-flash{animation:smFlash 1.4s ease-out 1}@keyframes smFlash{0%{box-shadow:0 0 0 0 rgba(242,201,76,.9)}40%{box-shadow:0 0 0 6px rgba(242,201,76,.55)}100%{box-shadow:0 0 0 0 rgba(242,201,76,0)}}
.sm-dw{position:fixed;left:0;right:0;bottom:var(--xqB,0px);z-index:950;max-height:min(76vh,calc(100vh - var(--xqT,56px) - var(--xqB,64px) - 8px));display:flex;flex-direction:column;transform:translateY(calc(100% + var(--xqB,0px) + 24px));transition:transform .3s ease;
  background:#f6efdf url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 .38 0 0 0 0 .28 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
  color:#2a1f15;box-shadow:0 -6px 24px rgba(0,0,0,.28)}
.sm-dw::before,.sm-dw::after{content:"";position:absolute;left:-6px;right:-6px;height:12px;border-radius:6px;background:linear-gradient(#7a4a24,#4a2a12 60%,#7a4a24);box-shadow:0 1px 3px rgba(0,0,0,.4)}
.sm-dw::before{top:-8px}.sm-dw::after{bottom:-8px}
.sm-dw.open{transform:none}.sm-dw-h{display:flex;align-items:center;gap:8px;padding:12px 14px 4px;font:900 16px var(--serif,serif)}.sm-dw-h button{margin-left:auto;border:0;background:none;font-size:20px;cursor:pointer;color:inherit}
.sm-dw-b{overflow:auto;padding:0 2px 18px;-webkit-overflow-scrolling:touch}
.sm-scrim{position:fixed;inset:0;z-index:949;background:rgba(0,0,0,.22);display:none}.sm-scrim.open{display:block}
.sm-epw{padding:2px 8px 6px}.sm-epw>.sec-t:first-child{margin-top:4px}.sm-epw details>summary{cursor:pointer}
@media (prefers-reduced-motion:reduce){.sm-dw{transition:none}.sm-flash{animation:none}}`;document.head.append(s)}
const smDark=()=>{const t=store.get("pageTheme","auto");return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)};
const smMute=()=>!store.get("mvSound",false)&&!store.get("voiceCall",true)&&!store.get("bgm",true);
/* 棋盤四角雙線性內插：u 往下（0..1）、v 往右（0..1）→ 圖上像素 */
const smAt=(u,v)=>{const[a,b,c,d]=SM_BOARD.q;return[a[0]*(1-u)*(1-v)+b[0]*u*(1-v)+c[0]*u*v+d[0]*(1-u)*v,a[1]*(1-u)*(1-v)+b[1]*u*(1-v)+c[1]*u*v+d[1]*(1-u)*v]};
function smScene(P){const fx=P.querySelector(".sm-fx"),img=P.querySelector(":scope>img");if(!fx||!img)return;const W=768,H=1376,pc=([x,y])=>[x/W*100,y/H*100];
  const dk=smDark();let night=false;
  if(dk){const im=new Image();im.onload=()=>{if(img.isConnected&&smDark()){img.src=im.src;night=true;const n=fx.querySelector(".sm-night");if(n)n.remove();fx.querySelectorAll(".sm-lamp").forEach(x=>x.remove())}};im.src=xqClImg(`data/setmap/set_night.webp?v=${SM_IMGV}`)}
  else if(!/set_day/.test(img.src))img.src=xqClImg(`data/setmap/set_day.webp?v=${SM_IMGV}`);
  let h="";
  if(dk&&!night)h+='<i class="sm-night"></i><i class="sm-lamp" style="left:80%;top:30%"></i><i class="sm-lamp" style="left:55%;top:46%;width:22%"></i><i class="sm-lamp" style="left:56%;top:51%;width:14%"></i>';
  if(smMute())h+='<i class="sm-bag" title="琴囊"></i>';
  try{const e=typeof boardEraE==="function"?boardEraE():null;if(e&&e.b){const[x0,y0]=pc(SM_BOARD.q[1]),[x1]=pc(SM_BOARD.q[2]),[,y1]=pc(SM_BOARD.q[0]);
    h+=`<i class="sm-frame" style="left:${(x0-.6).toFixed(2)}%;top:${(y1-.4).toFixed(2)}%;width:${(x1-x0+1.2).toFixed(2)}%;height:${(pc(SM_BOARD.q[1])[1]-y1+.8).toFixed(2)}%;border:3px solid ${e.b.bg[1]};background:${e.b.bg[0]}22;border-radius:2px"></i>`}}catch(err){}
  if(store.get("hiCon",false)){const P0=[];for(const side of[[0,"k"],[9,"r"]]){const j0=side[0],dj=j0?-1:1;for(let i=0;i<9;i++)P0.push([i,j0]);P0.push([1,j0+2*dj],[7,j0+2*dj]);for(const i of[0,2,4,6,8])P0.push([i,j0+3*dj])}
    const{mu,mv}=SM_BOARD,cw=(SM_BOARD.q[3][0]-SM_BOARD.q[0][0])*(1-2*mv)/9/W*100*.86;
    h+=P0.map(([i,j])=>{const[x,y]=pc(smAt(mu+(1-2*mu)*i/8,mv+(1-2*mv)*j/9));return`<i class="sm-gold" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${cw.toFixed(2)}%;aspect-ratio:1.25"></i>`}).join("")}
  fx.innerHTML=h}
function setMap(v){const root=v.querySelector(".pad.home");if(!root||v.querySelector(".set-page"))return;smCss();smSecNm(root);
  const d=document.createElement("div");
  d.innerHTML=`<div class="shp-page cq set-page"><img src="${xqClImg(`data/setmap/set_day.webp?v=${SM_IMGV}`)}" alt="天字客房"><div class="sm-fx" aria-hidden="true"></div>${SM_SPOTS.map(([id,x,y,t])=>`<button class="shp-spot" id="${id}" aria-label="${esc((SM_EPT[id]||t).replace(/^[\p{Extended_Pictographic}️\s]+/u,"")||t)}" style="left:${x}%;top:${y}%"><b>${esc(t)}</b></button>`).join("")}</div>`;
  const P=d.firstElementChild;v.insertBefore(P,root);
  /* 宣紙畫軸：原本的設定整包搬進來（還在 v 裡面，原本綁的按鈕、paint() 都照常） */
  const dw=document.createElement("div");dw.className="sm-dw";dw.innerHTML='<div class="sm-dw-h">📜 設定<button type="button" aria-label="收起畫軸">✕</button></div><div class="sm-dw-b"></div>';
  const sc=document.createElement("div");sc.className="sm-scrim";v.append(sc,dw);const body=dw.querySelector(".sm-dw-b");body.append(root);
  let unNav=null;const close=()=>{dw.classList.remove("open");sc.classList.remove("open");smScene(P);if(unNav){const f=unNav;unNav=null;f()}};dw.querySelector("button").onclick=close;sc.onclick=close;   /* 回饋 803：開畫軸也登記一筆上一頁，返回鍵先收畫軸 */
  const open=(tab,sel)=>{const tb=root.querySelector(`#sgTabs [data-k="${tab}"]`);if(tb)tb.click();if(!dw.classList.contains("open")&&typeof xqPanelNav==="function")unNav=xqPanelNav(()=>{unNav=null;dw.classList.remove("open");sc.classList.remove("open");smScene(P)});dw.classList.add("open");sc.classList.add("open");
    setTimeout(()=>{let el=null;for(const s of String(sel||"").split(",")){el=root.querySelector(s.trim());if(el)break}if(!el)return;const det=el.closest("details");if(det&&!det.open)det.open=true;
      const card=el.closest(".card,.items,.opt,.eragrid,label,.item")||el;body.scrollTop=Math.max(0,card.getBoundingClientRect().top-body.getBoundingClientRect().top+body.scrollTop-14);
      root.querySelectorAll(".sm-flash").forEach(x=>x.classList.remove("sm-flash"));void card.offsetWidth;card.classList.add("sm-flash");setTimeout(()=>card.classList.remove("sm-flash"),1500)},60)};
  /* 831：各入口自己的面板 */
  const ES=typeof xqSheet==="function"?xqSheet(v,{t:"設定"}):null;let moved=[];
  const EW=document.createElement("div");EW.className="home sm-epw";if(ES)ES.b.append(EW);
  const isH=x=>!!(x&&x.classList&&x.classList.contains("sec-t"));
  const topOf=el=>{let x=el;while(x&&x.parentNode&&x.parentNode!==root&&!(x.parentNode.matches&&x.parentNode.matches("[data-pane],details")))x=x.parentNode;return x&&x.parentNode?x:null};
  const secOf=(x,head)=>{if(!x)return[];const L=[x];if(!isH(x)){const pv=[];let p=x.previousElementSibling;while(p&&!(p.matches&&p.matches("summary"))){pv.unshift(p);if(isH(p))break;p=p.previousElementSibling}if(pv.length&&isH(pv[0]))L.unshift(...(head?[pv[0]]:pv))}
    if(!head){let n=x.nextElementSibling;while(n&&!isH(n)&&!(n.matches&&n.matches("summary"))){L.push(n);n=n.nextElementSibling}}return L};
  const pick=k=>{const i=k.indexOf(":"),t=k.slice(0,i),q=k.slice(i+1);
    if(t==="title"){const h=[...root.querySelectorAll(".sec-t")].find(x=>x.textContent.trim()===q);return h?secOf(h):[]}
    const el=root.querySelector(q);if(!el)return[];if(t==="btn")return[el];const x=topOf(el);if(!x)return[];return t==="el"?[x]:secOf(x,t==="head")};
  const epBack=()=>{for(const[n,ph]of moved){if(ph.parentNode){ph.parentNode.insertBefore(n,ph);ph.remove()}}moved=[];EW.innerHTML=""};
  const epOpen=id=>{if(!ES)return false;epBack();const seen=new Set();let n=0;
    for(const k of SM_EP[id]){let box=EW;if(k.startsWith("btn:")){box=EW.querySelector(":scope>.items.sm-epb");if(!box){box=document.createElement("div");box.className="items sm-epb";box.style.padding="0";EW.append(box)}}
      for(const x of pick(k)){if(seen.has(x)||EW.contains(x))continue;seen.add(x);const ph=document.createComment("sm-ep");x.parentNode.insertBefore(ph,x);moved.push([x,ph]);box.append(x);n++}}
    if(!n){epBack();return false}smSecNm(EW);const sp=SM_SPOTS.find(z=>z[0]===id);if(id==="smBoard")try{tbPv()}catch(e){}ES.open(null,SM_EPT[id]||(sp?sp[3]:"設定"));return true};
  const tbPv=()=>{const t=root.querySelector('#sgTabs [data-k="look"]');if(t&&!root.querySelector('[data-pane="look"]:not([hidden])')){const cur=store.get("setTab","look");t.click();if(cur!=="look"){const c=root.querySelector(`#sgTabs [data-k="${cur}"]`);if(c)c.click()}}};   /* 棋盤預覽只在「棋盤」分頁打開時重畫：先切過去畫好再切回原本的分頁 */
  if(ES){new MutationObserver(()=>{if(!ES.on()&&moved.length){epBack();smScene(P)}}).observe(ES.el,{attributes:true,attributeFilter:["class"]});
    ES.b.addEventListener("click",()=>setTimeout(()=>smScene(P),80));ES.b.addEventListener("change",()=>setTimeout(()=>smScene(P),80))}
  /* 整卷畫軸（四個分頁、全部設定）留給想一次看完的人：頂欄右邊「📜 全部設定」 */
  /* 回饋 842（開發者 11/9「拿掉這個設定圖」）：頂欄右邊的 📜 全部設定不再放；每樣設定在圖上都有自己的入口 */
  if(false){const tr=document.getElementById("topRight");if(tr&&!tr.querySelector(".sm-all")){const b=document.createElement("button");b.type="button";b.className="ib sm-all";b.textContent="📜";b.title="全部設定";b.setAttribute("aria-label","全部設定（整卷畫軸）");
    b.onclick=()=>{vibrate(5);if(ES&&ES.on())ES.close();open(store.get("setTab","look"),"")};tr.prepend(b)}}
  for(const[id,,,,tab,sel]of SM_SPOTS){const b=P.querySelector("#"+id);if(!b)continue;
    b.onclick=()=>{vibrate(5);if(id==="smMirror"){const f=root.querySelector("#meFig");if(f){f.click();return}}if((id==="smMail"||id==="smNote")&&typeof FEEDBACK_PAGE_ON!=="undefined"&&FEEDBACK_PAGE_ON){location.hash=id==="smMail"?"#/feedback":"#/feedback/fixes";return}if(SM_EP[id]&&epOpen(id))return;open(tab,sel)}}   /* 回饋 799：信插、手札一下直達意見回饋頁（07s3） */
  smScene(P);
  /* 設定改了（深淺色、聲音、朝代棋盤、高對比）：畫軸開著時每次改都重畫場景 */
  root.addEventListener("click",()=>setTimeout(()=>smScene(P),80));root.addEventListener("change",()=>setTimeout(()=>smScene(P),80));
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof shwPage==="function"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_SETMAP),"set")}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof Settings==="function"){const f0=Settings;Settings=function(v){const r=f0.apply(this,arguments);try{if(SETMAP_ON)setMap(v)}catch(e){}return r}}
