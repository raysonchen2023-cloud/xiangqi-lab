/* ================= 🏺 我的角色收藏「棋鎮書齋珍藏牆」（42 案第 8 頁：Gemini 方案 1，Claude 依考究清單修正；考究說明 park/studymap/考究說明.md，史學顧問 11/9 核過）=================
   圖：park/studymap/study_day_v3.png（白天）、study_night_v1.png（夜景，加一盞油盞），都是 896×1200（3:4）→ tools/process_art.py MAPS「studymap」→ art/studymap/ → data/studymap/。
     灰階版不另外畫，由程式用 CSS 濾鏡從主圖轉。座標 MZ_* 都是照實際的圖（896×1200 像素）量的。
   包一層 Me(v)：上面的 3D 舞台（me-stage）照舊；舞台下面原本的官階／修為、提示棋等四格、四扇窗（棋盤、棋譜、秘境棋友、珍品）、
     園子棋友卡（園子棋友、棋史卡、輿圖遊歷、消寒圖）、千秋大百科卡全部藏起來（還在頁面裡），改成一面書齋珍藏牆（.shp-page.cq）；
     本命修行卡不藏，照回饋 828 跟著圖下其他內容一起收進頂欄「📜」面板（07w 的 xqSheetAuto 自動做）。
     點牆上的東西＝點原本那一顆（原本的冊子、清單、百科照舊打開）：
       亮格櫃下面的門＝珍品（亮格 12 格照收集比例一格一格從淡墨轉成彩色）；書格上疊的棋枰＝棋盤收藏；書格裡的函套書＝棋譜收藏；六扇小圍屏＝秘境棋友；
       書信匣＝園子棋友（有新信點朱點）；畫缸＝棋史卡；牆上輿圖＝輿圖遊歷（13 站逐站點亮）；空白立軸＝消寒圖（程式畫一枝素梅 81 瓣，逐瓣染紅）；
       一函類書＝千秋大百科；印匣（畫面上 6 方小印）＝千秋印譜（開發者 11/9 改；點了打開 07i2-seal.js sealBook，小字寫金印幾方／13）；木牌＝官階（寫官階名）；宣德爐式銅爐＝修為（爐煙高低）；
       青瓷蓋罐、漆盒＝棋罐、提示棋（寫數量）。
   角色：走路角色（07w shwMount，記憶名 "study"）在畫桌前、櫃子前的地板上走，左邊走道連前後；點收藏＝走過去、轉身揮手，那一類收滿＝歡呼；左下角是出口（07w SHW_EXITS.study，824）。
     走路角色沒出現時（prefers-reduced-motion、3D 載不到）改由舞台上的 3D 角色轉向揮手（mzAct）。
   點畫裡沒有標籤的東西（亮格 12 件器物、櫃身、書格、畫桌、夜裡的油盞）＝07w6 sciPage 說明小卡，說明取自考究說明。
   右下角的竹籤筒（07t3）只看標籤讓位（標籤加 data-hs），畫缸的標籤放在畫缸左邊，不會被籤筒蓋住；捲動時重算讓位。字最小 13px。
   開關 STUDYMAP_ON（false＝照舊）、MZ_WALK_ON（走路角色）；圖片網址帶 MZ_IMGV；前綴 mz */
const STUDYMAP_ON=true,MZ_WALK_ON=false;
const MZ_IMGV="2510";
const MZ_W=896,MZ_H=1200;
/* 亮格 12 格：直線 x、橫線 y（像素） */
const MZ_CX=[61,141,221,302,381],MZ_CY=[247,340,432,520];
const mzGrid=(X,Y)=>{const c=[];for(let r=0;r<3;r++)for(let k=0;k<4;k++)c.push([X[k],Y[r],X[k+1],Y[r+1]]);return c};
const MZ_CELLS=mzGrid(MZ_CX,MZ_CY);
/* hspx 開發者 11/13「有破圖，多一個藍色背景」：經典世界的書房會換成 study_*_classic.webp（07y xqClImg；768×1376、另一張畫，櫃子比較低），亮格淡墨格卻照原版 896×1200 的座標疊，
   整排往上錯位（最上一排落在櫃子上方的窗格上，淡墨後變成一塊藍灰色）。經典版另外量（圖片像素：直線 x 51、118、188、258、324，橫線 y 445、533、623、708），
   換算成原版座標（兩張圖都是撐滿同一個框），背景裁切、位置的算法不用改 */
const MZ_CELLS_CL=mzGrid([51,118,188,258,324].map(x=>x*MZ_W/768),[445,533,623,708].map(y=>y*MZ_H/1376));
/* 入口：[id, 左, 上, 右, 下, 標籤, 標籤錨點 x, y, a＝標籤在錨點上面／m＝置中／b＝在下面]（像素） */
const MZ_SPOTS=[["mzZhen",62,530,381,735,"珍品",221,632,"m"],["mzBoard",469,483,621,566,"棋盤",545,488,"a"],["mzSecret",637,429,832,560,"秘境棋友",735,494,"m"],
  ["mzKifu",445,580,860,712,"棋譜",540,668,"m"],["mzXh",457,15,589,422,"消寒圖",523,64,"m"],["mzYu",610,37,896,247,"輿圖",790,96,"m"],["mzRank",637,286,870,370,"官階",753,328,"m"],
  ["mzSeal",95,800,364,875,"千秋印譜",232,798,"a"],["mzXp",367,800,434,874,"修為",390,880,"b"],["mzLetter",444,806,512,874,"園子棋友",478,798,"a"],["mzCodex",512,780,618,874,"千秋大百科",555,880,"b"],
  ["mzJar",618,790,679,866,"棋罐",648,792,"a"],["mzBox",680,815,738,866,"提示棋",690,880,"b"],["mzHist",745,885,862,1010,"棋史卡",725,1045,"m"]];   /* hspx 11/10「排版怪怪的」：棋譜標籤移到左邊那疊藍書上（原本在棋罐正上方疊成一串）、提示棋往左讓開筆筒 */   /* 棋史卡的標籤放在畫缸左邊：右下角是竹籤筒，標籤放在畫缸上會被蓋住 */
/* 走路角色座標表（07w shwMount）：地板只有兩條——畫桌前（上 97.5%）、櫃子和書格前（上 64%，桌面後緣上面那一條），左邊走道（左 3.5%）連起來；不從桌下、畫缸後面穿過 */
const SHW_MZ={W:MZ_W,H:MZ_H,el:18,h:[.12,97,.0005],home:"home",look0:[47,120],
  N:{home:[47,97.5],lx:[3.5,97.5],fL:[14,97.5],fS:[27,97.5],fC:[56,97.5],fR:[65,97.5],fJ:[74,97.5],fH:[80.5,98],bl:[3.5,64],bCab:[22,64],bMid:[42,64],bShelf:[58,64],bS2:[74,64],bR:[90,64]},
  E:"lx-fL fL-fS fS-home home-fC fC-fR fR-fJ fJ-fH lx-bl bl-bCab bCab-bMid bMid-bShelf bShelf-bS2 bS2-bR",
  HS:{mzZhen:["bCab",24,44,"wave"],mzBoard:["bShelf",61,44,"wave"],mzSecret:["bS2",82,41,"wave"],mzKifu:["bS2",72,54,"wave"],mzXh:["bShelf",58,18,"wave"],mzYu:["bR",84,12,"wave"],mzRank:["bR",84,27,"bow"],
    mzSeal:["fS",26,70,"wave"],mzXp:["home",45,70,"bow"],mzLetter:["fC",54,70,"wave"],mzCodex:["fR",63,69,"wave"],mzJar:["fJ",72,69,"wave"],mzBox:["fJ",79,70,"wave"],mzHist:["fH",90,80,"wave"]}};
/* 出口（回饋 824）：左下角，從左邊走道往左走出去；點左下這一塊（左 0～9%、上 86～100%）＝出口 */
if(typeof SHW_EXITS!=="undefined"&&SHW_EXITS&&!("study" in SHW_EXITS))SHW_EXITS.study={at:"lx",out:[-9,97.5],r:[0,86,9,100]};
/* 點畫裡的東西看說明（07w6 sciPage）：亮格 12 件器物照格子順序（上排左到右、中排、下排） */
const MZ_RELIC=[["青瓷玉壺春瓶","細頸、圓肚的青瓷瓶{{yuan:，宋元以來很常見的瓶形{{ming:，明代書齋常拿來插一兩枝花}}}}。"],["甜白瓷杯","{{ming:明代永樂年間景德鎮燒的白瓷，白得像糖霜一樣，所以叫「甜白」。}}{{<ming:這是一隻潔白的瓷杯，白得像一層糖霜，摸起來溫溫潤潤的。}}","{{ming:甜白}}{{<ming:白}}瓷杯"],
  ["仿古銅鼎","照商周青銅鼎的樣子鑄的小鼎。{{ming:明代文人喜歡收藏仿古的銅器，擺在架上賞玩。}}"],["玉璧","中間有圓孔的扁圓玉器，很早就有，古人當作禮器和佩玉；放在書齋裡是一件古玩。"],
  ["硯","磨墨用的石頭，文房四寶之一。墨條加一點清水在硯上磨，就有墨汁可以寫字。"],["竹筆筒","截一段粗竹子做成，用來插毛筆{{ming:，明代的書桌上很常見}}。"],
  ["香盒","放香料的小圓盒，要焚香的時候從這裡取，常常跟香爐擺在一起。"],["青瓷水盂","盛清水的小罐子，磨墨時用小匙舀一點水到硯台上。"],
  ["銅臥羊鎮紙","一隻四腳收在身下的小銅羊，底部平平的。寫字、畫畫時用它壓住紙，紙才不會被風吹動。{{ming:明代書房常用這種銅臥獸鎮紙。}}"],["漆盒","木胎上一層一層塗漆做成的小盒子，可以收小東西。"],
  ["白瓷小罐","素白、沒有花紋的小罐子，放在亮格裡當擺設。"],["供石（太湖石類）","顏色淺、到處是孔洞的石頭，放在小木座上欣賞它的形狀。{{ming:明代林有麟寫過一本專講石頭的《素園石譜》。}}"]];
const MZ_SCI=[{n:"明式亮格櫃",nd:"{{ming:明式}}亮格櫃",t:"上面開敞的格子擺東西給人看，下面有門可以收東西。{{ming:明代的亮格櫃通常只有一到兩層亮格，這裡為了放 12 件珍品改成 3 層 4 格。}}{{<ming:這裡為了放 12 件珍品，做成 3 層 4 格。}}點下面的櫃門，打開珍品冊。",
    s:[[[50,205],[422,205],[422,247],[50,247]],[[381,247],[426,247],[426,742],[381,742]],[[47,247],[61,247],[61,742],[47,742]]]},
  {n:"矮書格",t:"放書和棋具的木格子。上面擺著疊起來的棋枰和六扇折疊的小圍屏（桌屏），裡面是線裝書和藍布函套書。",s:[[[437,527],[867,527],[867,742],[437,742]]]},
  {n:"明式長畫桌",nd:"{{ming:明式}}長畫桌",t:"四條腿在四個角、腳是馬蹄足，還加了棖子。{{ming:照明式家具的分法，腿在四角的叫「桌」，腿縮進去的才叫「案」，所以}}這是一張畫桌。",
    s:[[[45,868],[800,868],[800,905],[45,905]],[[45,905],[78,905],[78,1150],[45,1150]],[[675,905],[708,905],[708,1150],[675,1150]]]},
  {n:"油盞",dn:"n",t:"小瓷盞裝油、放一根燈草點著，擱在矮木座上，沒有燈罩、也沒有玻璃。{{ming:宋到明的瓷油盞常帶一個小把手。}}",s:[[[414,740],[492,740],[492,802],[414,802]]]}];
const mzDark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
let MZ_FIG=null;   /* 舞台上 3D 角色（fig3d 回傳的 {B,r}），走路角色沒出現時揮手、歡呼用 */
function mzCss(){if(document.getElementById("mzCss"))return;const s=document.createElement("style");s.id="mzCss";s.textContent=`
.shp-page.mz-wall{position:relative;margin:10px 0 6px;border-radius:6px;user-select:none;-webkit-user-select:none}
.mz-wall>img{display:block;width:100%;height:auto}
.mz-g{position:absolute;inset:0;pointer-events:none}
.mz-cell{position:absolute;background-repeat:no-repeat;filter:grayscale(1) brightness(1.06) contrast(.92);transition:opacity .6s}
.mz-dk .mz-cell{filter:grayscale(1) brightness(.92) contrast(.92)}
.mz-cell.on{opacity:0}
.mz-hs{position:absolute;border:0;padding:0;margin:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
/* 回饋 834：熱區不再用 z-index 自成一層，標籤（.mz-lb z-index:3）才能疊在所有熱區上面；不然窄螢幕（375 寬）「棋盤」標籤中間會被後面的消寒圖熱區蓋住，點了開錯 */
.mz-hs:focus-visible{outline:2px solid #b23a26;outline-offset:2px}
.mz-lb{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;background:rgba(243,234,210,.94);border:1px solid #8a6a3a;color:#3a2618;border-radius:3px;padding:2px 4px 3px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3);pointer-events:auto;cursor:pointer;z-index:3}
.mz-lb.m{transform:translate(-50%,-50%)}.mz-lb.b{transform:translate(-50%,0)}
.mz-lb b{font:800 13px/1.2 var(--kai,var(--serif,serif))}
.mz-lb small{font:700 13px/1.15 var(--serif,serif);color:#8a2a18}.mz-lb small:empty{display:none}
.mz-dot{position:absolute;right:-5px;top:-5px;width:10px;height:10px;border-radius:50%;background:#b23a26;box-shadow:0 0 0 2px #f3ead2}
.mz-svg{position:absolute;pointer-events:none;overflow:visible}
.mz-smoke{position:absolute;width:12px;margin-left:-6px;border-radius:50%;background:linear-gradient(rgba(210,210,210,0),rgba(210,210,210,.55));pointer-events:none;animation:mzSmoke 4s ease-in-out infinite;transform-origin:50% 100%}
@keyframes mzSmoke{0%,100%{transform:skewX(0) scaleX(1)}50%{transform:skewX(8deg) scaleX(1.3)}}
.mz-rank{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 15px/1 var(--kai,var(--serif,serif));color:#2a1f15;letter-spacing:2px;pointer-events:none}
.mz-dk .mz-rank{color:#efe3c8;text-shadow:0 0 3px rgba(0,0,0,.6)}
.mz-dk .mz-lb{background:rgba(233,223,196,.94)}
@media (prefers-reduced-motion:reduce){.mz-smoke{animation:none}.mz-cell{transition:none}}`;document.head.append(s)}
/* 舞台角色轉向揮手／歡呼：fig3d 的畫面迴圈不播動作，這裡另外推一段動作（有動作檔就播，沒有就舉手） */
function mzAct(kind,dir){const R=MZ_FIG;if(!R||!R.B||!R.B.bot||!document.body.contains(R.r&&R.r.domElement))return;const B=R.B,clips=B.mixer&&B.clips||null,name=kind==="cheer"?"cheer":"wave_goodbye_01";
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;const y0=B.bot.rotation.y,yT=(dir||0)*.55,T=1.6;let t0=performance.now(),last=t0,a=null,arm=B.arms&&B.arms[1],z0=arm?arm.rotation.z:0;
  if(clips&&clips[name]){a=clips[name];a.reset().fadeIn(.12).play();if(clips.idle)clips.idle.fadeOut(.12)}
  const step=now=>{const t=(now-t0)/1000,dt=Math.min(.05,(now-last)/1000);last=now;const k=t<.25?t/.25:t>T-.35?Math.max(0,(T-t)/.35):1;B.bot.rotation.y=y0+(yT-y0)*k;
    if(a)B.mixer.update(dt);else if(arm)arm.rotation.z=z0+Math.min(1,t*3)*(kind==="cheer"?2.6:2.2)*k+(kind==="wave"?Math.sin(t*12)*.25*k:0);
    if(t<T)requestAnimationFrame(step);else{B.bot.rotation.y=y0;if(arm&&!a)arm.rotation.z=z0;if(a){a.fadeOut(.2);if(clips.idle){clips.idle.reset().play()}B.mixer.update(.3)}}};requestAnimationFrame(step)}
if(typeof fig3d==="function"){const f0=fig3d;fig3d=async function(host){const res=await f0.apply(this,arguments);try{if(STUDYMAP_ON&&res&&host&&host.closest&&host.closest("#meFig2"))MZ_FIG=res}catch(e){}return res}}
/* 回饋 834（開發者 11/9：棋史卡沒反應、盤查入口點選）：
   1. 牆上的標籤（.mz-lb）原本 pointer-events:none，而棋史卡、修為、千秋大百科、棋罐、提示棋、園子棋友、棋盤、千秋印譜的標籤都放在熱區外面（畫缸的標籤在畫缸左邊），
      點標籤會穿過去點到底圖，什麼都不開；標籤是按鈕的子元素，改成可以點（點標籤＝點那個入口）。
   2. 青瓷蓋罐（棋罐）、漆盒（提示棋）原本叫 cxMe("items")，可是我的角色頁沒有 .mw[data-c="items"]，點了沒反應；改成打開下面這張寶物小卡。 */
function mzItemSheet(k){const T=(f,d)=>{try{return f()}catch(e){return d}};const H=T(()=>hintInfo(),{left:0,bonus:0}),hn=(H.left||0)+(H.bonus||0),un=T(()=>undoLeft(),0),ln=T(()=>lingN(),0),jn=T(()=>jarN(),0),MS=T(()=>JAR_MS,[]);
  /* 回饋 860（入口盤查後續）：文案跟千秋大百科「寶物」卡對齊、縮短（開發者嫌字太多）；補上預習卷，大百科的寶物卡也改開這張 */
  const pn=T(()=>Object.keys(prevOwn()||{}).length,0);
  const jar=`<div class="sec-t">🫙 棋罐 ${jn}／${T(()=>JAR_MAX,216)} 子</div><p class="muted" style="font-size:13px;line-height:1.6;margin:0 0 6px">石桌往事每關收兵、馬、車放進棋罐，集到門檻換寶物和稱號。</p>
    <div class="items" style="padding:0">${MS.map(([n,lb])=>`<div class="item"${jn>=n?"":' style="opacity:.6"'}><span class="lb" style="font-size:20px">${jn>=n?"✅":"🔒"}</span><span class="tx"><b>${n} 子</b><span>${esc(lb)}</span></span></div>`).join("")}</div>`;
  const bag=`${k==="jar"?`<div class="sec-t">🎒 寶物</div>`:""}<div class="items" style="padding:0">${[["💡","提示棋",hn,"對局時按「🎒 寶物」用；修為越高，每天送越多。"],["↶","悔棋符",un,"對局時按「🎒 寶物」用，退回一步。"],["🪙","將令",ln,"拿去驛站的點將台換東西。"],["📜","預習卷",pn,"附在石桌往事的關卡裡。"]]
    .map(([ic,nm,n,t])=>`<div class="item"><span class="lb" style="font-size:22px">${ic}</span><span class="tx"><b>${nm} ${n}</b><span>${t}</span></span></div>`).join("")}</div><p class="muted" style="font-size:12.5px;margin:6px 2px 0">每盤棋下完都有機會掉提示棋、悔棋符。</p>`;
  sheet(k==="jar"?"🫙 棋罐":"🎒 寶物",b=>{b.innerHTML=k==="jar"?jar+`<div style="height:8px"></div>`+bag:bag+`<div style="height:8px"></div>`+jar})}
/* 打開千秋印譜：有 sealBook 就用；沒有就退回舊的集章簿，再不行開千秋大百科 */
function mzSealOpen(){if(typeof sealBook==="function")return sealBook();if(typeof stampBook==="function")return stampBook();location.hash="#/codex"}
function mzWall(v){const pad=v.querySelector(".pad"),me2=pad&&pad.querySelector(".me2");if(!me2||pad.querySelector(".mz-wall"))return;mzCss();
  const dk=mzDark(),src=xqClImg(`data/studymap/${dk?"study_night":"study_day"}.webp?v=${MZ_IMGV}`),CELLS=/_classic\.webp/.test(src)?MZ_CELLS_CL:MZ_CELLS,pc=(a,b)=>((a/b)*100).toFixed(2)+"%",
    R4=r=>`left:${pc(r[0],MZ_W)};top:${pc(r[1],MZ_H)};width:${pc(r[2]-r[0],MZ_W)};height:${pc(r[3]-r[1],MZ_H)}`;
  /* 原本的東西：藏起來、留著給牆上的東西按 */
  const q=s=>pad.querySelector(s),hide=e=>{if(e)e.style.display="none"};
  ["section.mr","section.mx","section.mwall"].forEach(s=>hide(me2.querySelector(s)));const gd=q(".gd-me"),cx=q("#cxMe")&&q("#cxMe").closest(".card");
  [gd,cx].forEach(hide);   /* 11/9：印匣改代表千秋印譜，本命修行卡留著（828 收進 📜 面板） */
  const W=document.createElement("div");W.className="shp-page cq mz-wall"+(dk?" mz-dk":"");
  const txt=e=>e?e.textContent.replace(/\s+/g," ").trim():"",num=(e,re)=>{const m=txt(e).match(re||/(\d+)\s*／\s*(\d+)/);return m?[+m[1],+(m[2]||0)]:null};
  /* 各類收集數（照原本畫面上的字讀，原本的算法一改這裡就跟著） */
  const C={b:num(q('.mw[data-c="b"]'),/(\d+)/),r:num(q('.mw[data-c="r"]'),/(\d+)/),s:num(q('.mw[data-c="s"]')),z:num(q('.mw[data-c="z"]')),hist:num(q("#gdMeH")),yu:num(q("#gdMeY")),xh:num(q("#gdMeX")),
    cx:(txt(q("#cxMeS")).match(/(\d+)%/)||[])[1],rank:txt(q("#meRk .me-seal")),xp:(txt(q("#meXp")).match(/Lv\s*(\d+)/)||[])[1],letter:/新信/.test(txt(q("#gdMeB"))),
    hx:[...me2.querySelectorAll(".mx .hx b")].map(b=>txt(b))};
  const zOn=C.z&&C.z[0]?Math.max(1,Math.round(12*C.z[0]/(C.z[1]||130))):0;
  const lb=(x0,y0,x1,y1,t,ax,ay,al)=>`<span class="mz-lb ${al}" data-hs="1" style="left:${pc(ax-x0,x1-x0)};top:${pc(ay-y0,y1-y0)}"><b>${esc(t)}</b><small></small></span>`;
  W.innerHTML=`<img src="${src}" alt="棋鎮書齋：亮格櫃、書格、輿圖、立軸和畫桌上的收藏">
    <div class="mz-g">${CELLS.map((c,i)=>`<i class="mz-cell${i<zOn?" on":""}" style="${R4(c)};background-image:url(${src});background-size:${(MZ_W/(c[2]-c[0])*100).toFixed(2)}% ${(MZ_H/(c[3]-c[1])*100).toFixed(2)}%;background-position:${(c[0]/(MZ_W-(c[2]-c[0]))*100).toFixed(2)}% ${(c[1]/(MZ_H-(c[3]-c[1]))*100).toFixed(2)}%"></i>`).join("")}
      ${mzPlum(C.xh)}${mzMap(C.yu)}</div>
    ${MZ_SPOTS.map(([id,x0,y0,x1,y1,t,ax,ay,al])=>`<button type="button" class="mz-hs" id="${id}" style="${R4([x0,y0,x1,y1])}" aria-label="${esc(t)}">${lb(x0,y0,x1,y1,t,ax,ay,al)}</button>`).join("")}`;
  me2.after(W);
  const lbl=(id,t)=>{const s=W.querySelector(`#${id} small`);if(s)s.textContent=t==null?"":String(t);const b=W.querySelector("#"+id);if(b)b.setAttribute("aria-label",(b.querySelector(".mz-lb b")||b).textContent+(t!=null&&t!==""?" "+t:""))};
  if(C.b)lbl("mzBoard",C.b[0]);if(C.r)lbl("mzKifu",C.r[0]);if(C.s)lbl("mzSecret",C.s.join("／"));if(C.z)lbl("mzZhen",C.z.join("／"));
  if(C.hist)lbl("mzHist",C.hist.join("／"));if(C.yu)lbl("mzYu",C.yu.join("／"));if(C.xh)lbl("mzXh",C.xh.join("／"));else{const m=txt(q("#gdMeX")).match(/冬至還有\s*\d+\s*天/);if(m)lbl("mzXh",m[0])}
  if(C.cx)lbl("mzCodex",C.cx+"%");else setTimeout(()=>{const m=txt(q("#cxMeS")).match(/(\d+)%/);if(m&&W.isConnected)lbl("mzCodex",m[1]+"%")},1500);   /* 百科完成度是非同步算的 */
  if(C.xp)lbl("mzXp","Lv "+C.xp);if(C.hx[2])lbl("mzJar",C.hx[2].replace(/\D+$/,""));if(C.hx[0])lbl("mzBox",C.hx[0].replace(/\D+$/,""));
  if(C.letter){const b=W.querySelector("#mzLetter .mz-lb");if(b)b.insertAdjacentHTML("beforeend",'<i class="mz-dot" aria-hidden="true"></i>')}
  {const b=W.querySelector("#mzRank");if(b&&C.rank){b.insertAdjacentHTML("beforeend",`<span class="mz-rank">${esc(C.rank)}</span>`);b.querySelector(".mz-lb").remove();b.setAttribute("aria-label","官階 "+C.rank)}}
  {const b=W.querySelector("#mzXp");if(b&&C.xp)b.insertAdjacentHTML("afterbegin",`<i class="mz-smoke" style="left:50%;bottom:62%;height:${Math.min(160,30+(+C.xp)*6)}%"></i>`)}
  if(typeof sealGoldN==="function")lbl("mzSeal",`金印 ${sealGoldN()}／13`);
  /* 點了＝按原本那一顆；角色走過去、轉身揮手，收滿的那一類歡呼 */
  const full={mzSecret:C.s&&C.s[0]>=C.s[1],mzHist:C.hist&&C.hist[0]>=C.hist[1],mzYu:C.yu&&C.yu[0]>=C.yu[1],mzXh:C.xh&&C.xh[0]>=C.xh[1],mzZhen:C.z&&C.z[0]>=C.z[1],mzSeal:typeof sealGoldN==="function"&&sealGoldN()>=13};
  const GO={mzBoard:'.mw[data-c="b"]',mzKifu:'.mw[data-c="r"]',mzSecret:'.mw[data-c="s"]',mzZhen:'.mw[data-c="z"]',mzLetter:"#gdMeB",mzHist:"#gdMeH",mzYu:"#gdMeY",mzXh:"#gdMeX",mzCodex:"#cxMe",mzRank:"#meRk",mzXp:"#meXp"};
  W.querySelectorAll(".mz-hs").forEach(b=>b.onclick=()=>{vibrate(5);if(!document.body.classList.contains("shw-on")){const r=b.getBoundingClientRect(),x=(r.left+r.width/2)/innerWidth;try{mzAct(full[b.id]?"cheer":"wave",x<.4?-1:x>.6?1:0)}catch(e){}}
    if(b.id==="mzSeal"){mzSealOpen();return}
    if(b.id==="mzJar"||b.id==="mzBox"){mzItemSheet(b.id==="mzJar"?"jar":"bag");return}
    const o=GO[b.id]&&q(GO[b.id]);if(o)o.click()});
  /* 走路角色（07w）：入口是 .mz-hs（id），收滿的那一類改成歡呼 */
  if(MZ_WALK_ON&&typeof shwMount==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON){try{const HS={};for(const k in SHW_MZ.HS){HS[k]=SHW_MZ.HS[k].slice();if(full[k])HS[k][3]="cheer"}
    shwMount({v,cfg:Object.assign({},SHW_MZ,{HS}),root:W,frame:W,layer:W,before:W.querySelector(".mz-hs"),sel:".mz-hs",keyOf:b=>b.id,find:h=>W.querySelector("#"+h),mem:"study"})}catch(e){}}
  /* 點畫裡的東西看說明（07w6）：亮格各格還是淡墨的，說明後面補一句 */
  if(typeof sciPage==="function"){try{const it=MZ_RELIC.map(([n,t,nd],i)=>{const c=CELLS[i];return{n,nd,t:t+(i<zOn?"":"（這一格還是淡墨的，多收幾件珍品就會變成彩色。）"),s:[[[c[0]+3,c[1]+3],[c[2]-3,c[1]+3],[c[2]-3,c[3]-3],[c[0]+3,c[3]-3]]]}});
    sciPage(v,{k:"study",nm:"書齋",W:MZ_W,H:MZ_H,it:it.concat(MZ_SCI)})}catch(e){}}
  if(typeof shpFit==="function")try{shpFit(v)}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
/* 消寒圖：一枝素梅 9 朵、每朵 9 瓣，共 81 瓣；染了幾瓣就幾瓣朱紅（畫在立軸畫心 474～573 × 118～350 裡） */
function mzPlum(xh){const n=xh?xh[0]:0,box=[480,126,567,342],cx=(box[0]+box[2])/2,F=[];let k=0;
  for(let i=0;i<9;i++){const y=box[3]-16-i*(box[3]-box[1]-34)/8,x=cx+(i%2?20:-20)+Math.sin(i)*3;let p="";
    for(let j=0;j<9;j++){const a=j/9*Math.PI*2,px=x+Math.cos(a)*6.5,py=y+Math.sin(a)*6.5;p+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.4" fill="${k<n?"#c0392b":"rgba(255,255,255,.35)"}" stroke="#5a4630" stroke-width=".8"/>`;k++}
    F.push(`<path d="M${cx.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#4a3a28" stroke-width="1.2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="#5a4630"/>`+p)}
  return`<svg class="mz-svg" viewBox="0 0 ${MZ_W} ${MZ_H}" style="inset:0;width:100%;height:100%" aria-hidden="true"><path d="M${cx} ${box[3]}C${cx-10} ${box[1]+150} ${cx+10} ${box[1]+80} ${cx-2} ${box[1]+4}" stroke="#4a3a28" stroke-width="2.2" fill="none"/>${F.join("")}</svg>`}
/* 輿圖：13 站沿著畫裡的河往右上的山一站一站點亮（畫心 668～896 × 64～219） */
const MZ_YU=[[678,163],[698,167],[716,173],[734,179],[752,184],[770,188],[788,186],[806,176],[818,163],[830,150],[845,140],[862,132],[880,124]];
function mzMap(yu){const n=yu?yu[0]:0,P=MZ_YU.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i<n?6:4.5}" fill="${i<n?"#c0392b":"#f3ead2"}" stroke="#5a1a10" stroke-width="1.4"/>`);
  return`<svg class="mz-svg" viewBox="0 0 ${MZ_W} ${MZ_H}" style="inset:0;width:100%;height:100%" aria-hidden="true"><path d="M${MZ_YU.map(p=>p.join(" ")).join("L")}" stroke="#7a2a18" stroke-width="1.2" stroke-dasharray="3 3" fill="none" opacity=".55"/>${P.join("")}</svg>`}
if(typeof Me==="function"){const f0=Me;Me=function(v){const r=f0.apply(this,arguments);try{if(STUDYMAP_ON)mzWall(v)}catch(e){}return r}}
/* 籤筒（07t3）讓位只在換頁時算一次；這頁的牆在舞台下面，捲動後再算一次，免得籤筒蓋到畫缸、書格的標籤 */
{let t=0;document.addEventListener("scroll",()=>{clearTimeout(t);t=setTimeout(()=>{try{if(STUDYMAP_ON&&document.querySelector("#view .mz-wall")&&typeof ttAvoid==="function")ttAvoid()}catch(e){}},150)},{capture:true,passive:true})}
