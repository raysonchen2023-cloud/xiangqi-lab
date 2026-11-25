/* ================= 📜 棋譜庫滿版水墨圖「崇文書閣」（開發者 11/8 定案：Gemini 方案 1＋8＋考究修正；史學顧問核圖中）=================
   規劃：story/gemini_app/38 號 md；圖：park/libmap/lib_v4.png（史學顧問 11/8：照宋式鉤闌、直櫺窗、灰藍方磚整張重出 lib_v3，再局部修：書冊平放、卷軸包書帙掛牙籤、畫軸無題款加驚燕、燈檠蓮瓣油盞（白天不點）、攤平的蝴蝶裝；宣紙後製）→ art/libmap/lib.webp。
   學習頁翰林書院的藏書閣內部（宋代），兩層挑空、中央木樓梯。包一層 Library(v,c0)：原本的棋譜清單（分組、書目、搜尋、篩選、分頁）照舊畫、照舊綁好，
   整包收進從下方滑出的宣紙面板（點 ✕ 回到書閣）；點棋局照舊直接進棋盤；找棋跟原本一樣快（同一份清單、同一個 api）。
     一樓左邊 6 格書櫥＝6 部古譜（每格一部，點了直接開那部的清單）；右邊卷宗櫥＝大師對局（特級大師對局）；
     二樓一排人物畫軸＝72 位特級大師小傳（點了選人，直接開他的對局）；3 口樟木箱＝比賽對局 3 冊：沒下載＝朱紅封條、下載中＝封條發金光、下載完＝封條變金、可以打開；
     前景閱覽大案：攤開的冊子＝繼續研究（書頁上畫一張迷你棋盤）、一疊手抄冊＝我的對局（局數越多越厚，三段）、燈檠上的青瓷油盞＝搜尋。
   書名、標籤都由程式疊上去（圖上沒有字）。接 07w 走路（SHW_LIBMAP，上二樓沿樓梯踏板走、再走二樓迴廊；樓上身高照透視縮小，回饋 807）、07x 縮放。圖片網址帶 LB_IMGV。
   開關 LIBMAP_ON（false＝照舊清單）；樣式在 lbCss */
const LIBMAP_ON=true;   /* 開發者 11/8 照建議先開 */
const LB_IMGV="0700";   /* 11/9 修圖：驚燕改從天頭垂下 */
/* 開發者 11/9：書閣照星槎停靠的朝代換圖 lib_<朝>（史學顧問 11/9 核過；書櫥格子、木箱封條、標籤、迷你棋盤、走路節點的座標都不變）。
   有停靠才算（跟 07y hbDockEra、07z xqHubName 同一個判斷）；沒停靠、宋用原圖 lib */
const LB_ERAS="qin han sanguo weijin nanbei sui tang wudai yuan ming qing".split(" ");
function lbImg(){let e="";try{e=typeof hbDockEra==="function"?hbDockEra():typeof shipAt==="function"&&typeof shipDockList==="function"&&shipDockList()?shipAt():""}catch(x){}if(typeof hbIsCl==="function"&&hbIsCl())return"lib_classic";   /* 11/10 經典世界：石窟最深處（構圖跟書樓一樣，入口照舊） */
  return LB_ERAS.includes(e)?"lib_"+e:"lib"}
const LB_OLD=[["shiqingyaqu","適情","適情雅趣"],["juzhongmi","橘中","橘中秘"],["meihuapu","梅花","梅花譜"],["kaiju","開局","古典開局譜"],["canju","殘局","古典殘局譜"],["brilliant","妙棋","妙棋精選"]];   /* [書, 書櫥格子上的短名, 全名] */
/* 6 格書櫥的位置（格子中心，%；上下三層、每層兩格） */
const LB_CELLS=[[10,55.5],[21,54],[10,60],[21,58.5],[10,64.5],[21,62.5]];
const LB_BOX=[[69.5,30],[81.8,30.5],[94.1,31]];   /* 11/12 第 11 輪觸控測試：三口箱至少 44px、互不重疊（中心往左挪 1～2%） */
/* 11/10 經典世界（lib_classic，藏譜石窟最深處）：沒有書櫥和樟木箱。左上一排 9 片白玉冊：左邊 3 片＝特級大師、右邊 6 片各是一本古譜（字直排）；
   3 箱比賽對局改落在右上那捆竹簡上；木案上的最近對局小棋盤不放 */
const LB_CL={cells:[[18.9,25],[23.2,25],[26.8,25],[30.6,25],[34.1,25],[37.2,25]],box:[[82,30.5],[87,31.5],[92,32.5]],one:[86.5,31.5],spots:{lbBio:[10,17]}};   /* 11/12 第 11 輪觸控測試：三冊擠在同一捆竹簡上（每冊只有 19px 間隔、互相重疊），經典世界改成整捆一顆（one），點了開三冊選單 */
/* 現在用的那張圖的座標組：橫式圖照條目 fx；原圖照原本的常數（石窟 LB_CL、書閣 LB_CELLS／LB_BOX，古譜點選區照原本的位置、小棋盤和厚度交回 CSS） */
const lbGeo=(P,CLB)=>{const e=typeof scwCur==="function"?scwCur(P):null;if(e&&e.fx&&e.fx.cells)return e.fx;return CLB?{cells:LB_CL.cells,one:LB_CL.one,shelf:null}:{cells:LB_CELLS,box:LB_BOX,shelf:[4.2,50.8,22.6,16.2]}};
const lbCl=()=>typeof hbIsCl==="function"&&hbIsCl();   /* 3 口樟木箱（封條中心） */
/* 11/12 ChatGPT UI 冗餘盤查（story/104 號）第 6 項：三個入口改寫成「第一步要做什麼」——瀏覽大師棋譜／按棋手找譜／按賽事找譜；進去以後的面板、清單照舊用正式書名
   （大師對局、特級大師、比賽對局）。看完一局按返回，回到同一部書時面板照原樣打開（LB_PN），再點「按棋手找譜」「按賽事找譜」會標出上次選的那位、那一冊（LB_LAST） */
const LB_SPOTS=[["lbGm",84,51.5,"🏆 瀏覽大師棋譜"],["lbBio",33,12,"🖼 按棋手找譜"],["lbTour",84,24.5,"📦 按賽事找譜"],["lbRead",51,77.5,"📖 繼續研究"],["lbMine",80,75.5,"📒 我的對局"]];   /* 回饋 846（開發者 11/9「搜尋的功能好像冗餘了，拿掉吧」）：燈檠上的「🔍 搜尋」拿掉；每部書的清單裡本來就有搜尋框 */
/* W107-L 第 3 批：iPad 橫向專用橫式圖（07sw SCW）。output/w107-ipad/l1610/libmap/lib_l1610.json（Windows Claude 1 量）分兩套：
   書閣 lib（原圖）＋11 朝 lib_<朝>：都對齊到書閣（位移最多 1.8%），座標共用；石窟 lib_classic 構圖不同，另一套。
   fx：cells 六部古譜（順序照 LB_CELLS）、box 三口樟木箱封條（書閣）／one 整捆竹簡（石窟）、shelf 古譜點選區（%，左上寬高）、mini 繼續研究的小棋盤（左上、寬，%）、thick 手抄冊厚度（左、寬、最上一層的 top，%）。
   石窟新圖玉冊是 10 片（原本 9 片）：照 json 建議，左 4 片＝特級大師（lbBio），右 6 片＝六部古譜，點選區只蓋右 6 片；石窟照舊不放小棋盤、不畫厚度。左邊新多的石龕先不當入口。
   shelf、mini、thick 不在 json 裡，是 iMac 照標註圖量的（書櫥、大案攤開那本的右頁、右邊那疊手抄冊）。出口：書閣往右、石窟往左，記憶名各換一個（libL、libCL） */
const LB_L1610={ready:true,f:"libmap/lib_l1610",w:2560,h:1600,S:{"lbGm":[80.6,59],"lbBio":[24,17],"lbTour":[76,24],"lbRead":[50,79.5],"lbMine":[66,78]},exit:[86,92],safe:{"l":0.12,"r":0.12,"t":0.05,"b":0.1},
  walk:{W:2560,H:1600,el:40,h:[.13,70,.00118],look0:[50,55],N:{"home":[45,70],"lamp":[33,71],"book":[50,71],"stack":[70,71],"shelf":[20,86],"cab":[80,77],"sf":[50,69],"t1":[52,61],"t2":[54.3,54.5],"t3":[56.5,48],"t4":[58.8,41.5],"t5":[60.5,37],"top":[61.5,34],"g0":[58,32],"g1":[45,31.5],"g2":[33,31.5],"por":[24,31.5],"r1":[70,32],"box":[77,31.5]},E:"home-lamp home-book home-stack lamp-shelf home-sf sf-shelf stack-cab sf-t1 t1-t2 t2-t3 t3-t4 t4-t5 t5-top top-g0 g0-g1 g1-g2 g2-por top-r1 r1-box",HS:{"lbGm":["cab",80.6,59,"bow"],"lbBio":["por",24,17,"bow"],"lbTour":["box",76,24,"cheer"],"lbRead":["book",50,79.5,"bow"],"lbMine":["stack",66,78,"bow"],"lbFind":["lamp",35,63,"wave"],"lbC0":["shelf",16.4,52.5,"bow"],"lbC1":["shelf",25,52.5,"bow"],"lbC2":["shelf",16.4,61.5,"bow"],"lbC3":["shelf",25,61.5,"bow"],"lbC4":["shelf",16.4,69.5,"bow"],"lbC5":["shelf",25,69.5,"bow"]}},
  fx:{cells:[[16.4,52.5],[25,52.5],[16.4,61.5],[25,61.5],[16.4,69.5],[25,69.5]],box:[[64.4,28.5],[76.1,29],[88.6,29.5]],shelf:[9,48,20,27],mini:[50.5,76.5,5],thick:[62.5,7,73.5]}};
const LB_L1610_CL={ready:true,f:"libmap/lib_classic_l1610",w:2560,h:1600,S:{"lbBio":[15.3,17.5],"lbGm":[79.7,52.5],"lbTour":[76,23],"lbRead":[40.6,76.5],"lbMine":[78,74]},exit:[14,92],safe:{"l":0.12,"r":0.12,"t":0.05,"b":0.1},
  walk:{W:2560,H:1600,el:40,h:[.13,70,.00118],look0:[50,50],N:{"home":[50,70],"book":[42,71],"stack":[68,82],"shelf":[20,72],"cab":[76,66],"sf":[49,66],"t1":[51,60],"t2":[53,53],"t3":[55,46],"t4":[57,40],"t5":[58.5,35],"top":[60,31],"g0":[55,31],"g1":[45,31],"g2":[35,31.5],"por":[24,31],"r1":[65,31],"box":[72,30]},E:"home-book home-stack home-sf sf-shelf home-cab sf-t1 t1-t2 t2-t3 t3-t4 t4-t5 t5-top top-g0 g0-g1 g1-g2 g2-por top-r1 r1-box",HS:{"lbGm":["cab",79.7,52.5,"bow"],"lbBio":["por",15.3,17.5,"bow"],"lbTour":["box",76,23,"cheer"],"lbRead":["book",40.6,76.5,"bow"],"lbMine":["stack",78,74,"bow"],"lbFind":["book",40.6,76.5,"wave"],"lbC0":["por",22.7,17.5,"bow"],"lbC1":["por",25.2,17.5,"bow"],"lbC2":["por",28.1,17.5,"bow"],"lbC3":["por",30.7,17.5,"bow"],"lbC4":["por",33.2,17.5,"bow"],"lbC5":["por",35.5,17.5,"bow"]}},
  fx:{cells:[[22.7,17.5],[25.2,17.5],[28.1,17.5],[30.7,17.5],[33.2,17.5],[35.5,17.5]],one:[76,26.5],slips:[[11.0,17.5],[13.8,17.5],[16.7,17.5],[19.7,17.5],[22.7,17.5],[25.2,17.5],[28.1,17.5],[30.7,17.5],[33.2,17.5],[35.5,17.5]],shelf:[21,11,16.5,16]}};
if(typeof SCW!=="undefined"){SCW["libmap/lib"]=LB_L1610;for(const e of LB_ERAS)SCW["libmap/lib_"+e]=Object.assign({},LB_L1610,{f:"libmap/lib_"+e+"_l1610",base:"libmap/lib"});SCW["libmap/lib_classic"]=LB_L1610_CL}
if(typeof SHW_EXITS!=="undefined"&&SHW_EXITS){if(!("libL" in SHW_EXITS))SHW_EXITS.libL={at:[90,84],ln:"cab",out:[106,86],r:[86,76,100,94]};if(!("libCL" in SHW_EXITS))SHW_EXITS.libCL={at:[10,80],ln:"shelf",out:[-8,82],r:[0,72,14,90]}}
let LB_OPEN=null;   /* 換頁到 #/db/<書> 之後要不要直接打開面板（"list"／"q"） */
let LB_PN=null;   /* 面板開著的那部書 {c,t,q,m,at}：看完一局回來重新打開；按 ✕／點外面／返回收起就清掉；離開棋譜庫也清掉 */
const LB_LAST={bio:"",tour:""};   /* 上次選的棋手（gmbios 的鍵）、比賽冊（書的 key） */
addEventListener("hashchange",()=>{if(!/^#\/db(\/|$)/.test(location.hash||""))LB_PN=null});
function lbPnBack(c0,now){const p=LB_PN;if(!p)return null;if(p.c!==(c0||"")||(now||Date.now())-p.at>6*36e5)return null;return{t:p.t,q:p.q,m:p.m}}
/* 07w 的座標表：一樓在大案後面的地板上走；書櫥前、卷宗櫥前；中央樓梯上二樓，畫軸前、木箱前 */
/* 回饋 807（開發者 11/9）：上二樓要照樓梯走——沿著一級一級的踏板（t1～t5）爬到樓梯頂（top），再沿二樓迴廊：往左走到畫軸前（g0→g1→g2→por），往右走到樟木箱前（r1→box）；
   一樓的入口只走一樓的路。身高照透視：一樓照舊，從樓梯腳（y 64%）往上每 1% 縮 0.00059，二樓約是一樓的七成五 */
const SHW_LIBMAP={el:40,h:y=>y>=64?.09+(y-74)*.0012:.078-(64-y)*.00059,look0:[50,60],
  N:{home:[50,74],lamp:[30,75],book:[50,75.5],stack:[78,75],shelf:[33,69],cab:[67,72],sf:[42,64],
    t1:[43.6,59.2],t2:[45.6,54.5],t3:[48.4,48],t4:[51.8,41.8],t5:[57.3,36.7],top:[62.5,34.7],
    g0:[61.2,32.3],g1:[52.1,30.5],g2:[39.1,31.4],por:[29.9,32],r1:[66.4,33.1],box:[83.3,32]},
  E:"home-lamp home-book home-stack lamp-shelf home-sf sf-shelf home-cab sf-t1 t1-t2 t2-t3 t3-t4 t4-t5 t5-top top-g0 g0-g1 g1-g2 g2-por top-r1 r1-box",
  HS:{lbGm:["cab",84,62,"bow"],lbBio:["por",30,22,"bow"],lbTour:["box",84,31,"cheer"],lbRead:["book",51,84,"bow"],lbMine:["stack",80,82,"bow"],lbFind:["lamp",26,80,"wave"],
    lbC0:["shelf",8,55,"bow"],lbC1:["shelf",20,55,"bow"],lbC2:["shelf",8,60,"bow"],lbC3:["shelf",20,60,"bow"],lbC4:["shelf",8,65,"bow"],lbC5:["shelf",20,65,"bow"]}};
function lbCss(){if(document.getElementById("lbCss"))return;const s=document.createElement("style");s.id="lbCss";s.textContent=`.item.lb-last{box-shadow:inset 4px 0 0 var(--btn-main,#A8321F)}

.lib-page{margin:0 0 6px}.lib-page .shp-spot{max-width:44%;padding:4px 10px;z-index:3}.lib-page .shp-spot b{white-space:nowrap;font-size:13.5px}
.lb-fx{position:absolute;inset:0;pointer-events:none}
.lib-page.cl .lb-cell{width:3.4%!important;height:7.5%!important}.lib-page.cl .lb-cell span{writing-mode:vertical-rl;top:50%;transform:translate(-50%,-50%);padding:3px 1px;letter-spacing:1px}.lib-page.cl .lb-mini{display:none}
.lb-cell{position:absolute;width:10.4%;height:4%;transform:translate(-50%,-50%);border:0;padding:0;background:none;cursor:pointer;pointer-events:auto;z-index:2}
.lb-cell span{position:absolute;left:50%;top:0;transform:translate(-50%,-55%);background:#f3ead2;border:1px solid #8a6a3a;color:#3a2618;border-radius:3px;font:800 10.5px/1 var(--serif,serif);padding:2px 3px;writing-mode:horizontal-tb;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.lb-shelf{position:absolute;left:16.6%;top:20.4%;width:22.9%;height:9.2%;border:0;padding:0;background:none;cursor:pointer;z-index:3;-webkit-tap-highlight-color:transparent}
.lb-pick{display:grid;grid-template-columns:1fr 1fr;gap:8px}.lb-pick button{min-height:52px;padding:8px 10px;border-radius:12px;border:1.5px solid #8a6a3a;background:#f3ead2;color:#3a2618;font:800 15px/1.25 var(--serif,serif);text-align:left;cursor:pointer}
.lb-pick button small{display:block;font:500 12px/1.3 var(--sans,sans-serif);color:#6f5f4c;margin-top:2px}
.lb-box{position:absolute;width:10.5%;height:6%;min-width:44px;min-height:44px;transform:translate(-50%,-50%);border:0;padding:0;background:none;cursor:pointer;pointer-events:auto;z-index:2}.lb-box.lb-one{width:22%}.lb-box.lb-one i{left:20%;width:60%}
.lb-box i{position:absolute;left:38%;top:12%;width:24%;height:76%;border-radius:1px;opacity:0}
.lb-box.dl i{opacity:1;background:linear-gradient(90deg,rgba(255,215,90,.0),rgba(255,226,120,.85),rgba(255,215,90,0));background-size:200% 100%;animation:lbShine 1.2s linear infinite;mix-blend-mode:screen}
.lb-box.ok i{opacity:1;background:#d9b04a;box-shadow:0 0 6px 2px rgba(242,201,76,.7)}
@keyframes lbShine{from{background-position:200% 0}to{background-position:0 0}}
.lb-mini{position:absolute;left:51.7%;top:81.83%;width:7.03%;aspect-ratio:9.2/10.2;transform:skewX(3deg);opacity:.82;pointer-events:none}
.lb-thick{position:absolute;left:70%;width:15%;height:1%;border-radius:2px;background:linear-gradient(#e9dcc0,#cdbb93);box-shadow:inset 0 -1px 0 #8b7550;pointer-events:none}
.lb-pn{position:fixed;left:0;right:0;bottom:0;z-index:950;height:80vh;display:flex;flex-direction:column;transform:translateY(105%);transition:transform .3s ease;background:#f6efdf;color:#2a1f15;border-top:2px solid #8a5a2a;border-radius:14px 14px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.28)}
.lb-pn.open{transform:none}.lb-pn-h{display:flex;align-items:center;gap:8px;padding:10px 14px 4px;font:900 16px var(--serif,serif)}.lb-pn-h button{margin:-8px -10px -8px auto;border:0;background:none;font-size:22px;cursor:pointer;color:inherit;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0}
.lb-pn-b{overflow:auto;flex:1;-webkit-overflow-scrolling:touch}
.lb-scrim{position:fixed;inset:0;z-index:949;background:rgba(0,0,0,.22);display:none}.lb-scrim.open{display:block}
/* 11/13 第 16 輪版面缺陷清零（r15 device-fit：棋譜庫每種尺寸 10～31 處）：
   ① 收起來的宣紙面板只是往下推出畫面，裡面的書目、搜尋鈕、上一頁仍「看得到」（讀螢幕會念、Tab 走得到，量測也把它跟場景入口算成互相重疊）；收起時 visibility:hidden，滑出動畫結束後才藏
   ② 書櫥／白玉冊的 6 個書名籤只是畫面上的字：整排早就蓋了一塊透明點選區（.lb-shelf，點了開「選一本棋譜」大按鈕清單），書名籤自己點不到；改成不接點選的裝飾，點選區當唯一的入口（讀螢幕、鍵盤也走它） */
.lb-pn{visibility:hidden;transition:transform .3s ease,visibility 0s linear .3s}.lb-pn.open{visibility:visible;transition:transform .3s ease}
.lb-cell{pointer-events:none}.lib-page.cl .lb-cell span{padding:3px 0;font-size:10px}
@media (prefers-reduced-motion:reduce){.lb-pn,.lb-pn.open{transition:none}.lb-box.dl i{animation:none}}`;document.head.append(s)}
/* 迷你棋盤（SVG）：照「繼續研究」那盤的開始局面畫（拿不到就畫開局） */
function lbMini(fen){let b=null;try{b=parseFen(fen||START)}catch(e){}const G=[];for(let i=0;i<9;i++)G.push(`<line x1="${i}" y1="0" x2="${i}" y2="${i%8?4:9}"/>`,i%8?`<line x1="${i}" y1="5" x2="${i}" y2="9"/>`:"");
  for(let j=0;j<10;j++)G.push(`<line x1="0" y1="${j}" x2="8" y2="${j}"/>`);G.push('<path d="M3 0 5 2M5 0 3 2M3 7 5 9M5 7 3 9"/>');
  let P="";if(b&&b.length===90)for(let k=0;k<90;k++){const p=b[k];if(!p)continue;const x=k%9,y=Math.floor(k/9),r=p===p.toUpperCase();P+=`<circle cx="${x}" cy="${y}" r=".36" fill="${r?"#b8402c":"#2a2420"}" stroke="#e8d6b0" stroke-width=".08"/>`}
  return`<svg class="lb-mini" viewBox="-.6 -.6 9.2 10.2" aria-hidden="true"><g stroke="#7a5a3a" stroke-width=".07" fill="none">${G.join("")}</g>${P}</svg>`}
function libMap(v,c0){const root=v.querySelector(".lib");if(!root||v.querySelector(".lib-page"))return;lbCss();
  const d=document.createElement("div");
  /* W107-L：iPad 橫向有專用橫式圖（07sw）就一開始載那張；古譜、木箱、點選區、小棋盤、厚度交給 place（照當下的圖），入口、出口、走路照條目 */
  const CLB=lbCl(),src=`data/libmap/${lbImg()}.webp?v=${LB_IMGV}`,pre=typeof scwPre==="function"?scwPre(v,src):{src,k:""};d.innerHTML=`<div class="shp-page cq lib-page${CLB?" cl":""}${pre.k?" scw-l":""}"${pre.k?` data-scw="${pre.k}"`:""}><img src="${pre.src}" alt="崇文書閣"><div class="lb-fx"></div>
    ${LB_OLD.map(([k,n,f],i)=>`<span class="lb-cell" id="lbC${i}" data-c="${k}" style="left:${(CLB?LB_CL.cells:LB_CELLS)[i][0]}%;top:${(CLB?LB_CL.cells:LB_CELLS)[i][1]}%" aria-hidden="true"><span>${esc(n)}</span></span>`).join("")}
    ${CLB?`<button class="lb-box lb-one" style="left:${LB_CL.one[0]}%;top:${LB_CL.one[1]}%" aria-label="比賽對局（三冊）"><i></i></button>`:LB_BOX.map(([x,y],i)=>`<button class="lb-box" data-i="${i}" style="left:${x}%;top:${y}%" aria-label="比賽對局第 ${i+1} 箱"><i></i></button>`).join("")}
    ${LB_SPOTS.map(([id,x,y,t])=>{if(CLB&&LB_CL.spots[id])[x,y]=LB_CL.spots[id];return`<button class="shp-spot" id="${id}" style="left:${x}%;top:${y}%"><b>${esc(t)}</b></button>`}).join("")}</div>`;
  const P=d.firstElementChild;v.insertBefore(P,root);
  const pn=document.createElement("div");pn.className="lb-pn";pn.innerHTML='<div class="lb-pn-h">📜 <span id="lbT">書目</span><button type="button" aria-label="回到書閣">✕</button></div><div class="lb-pn-b"></div>';
  const sc=document.createElement("div");sc.className="lb-scrim";v.append(sc,pn);pn.querySelector(".lb-pn-b").append(root);
  /* 回饋 841（開發者 11/9「棋譜庫裡面的入口也是 1 對 1」）：面板記住是哪個入口打開的（data-one），CSS 藏掉看得到別的入口的東西——
     一律藏「繼續研究」卡（圖上有自己的入口）；book＝書櫥、大師對局、特級大師、比賽對局：只看那一部，藏分類鈕和書籤列；mine＝我的對局：只留我的對局底下幾本；find＝搜尋：保留選書（要選在哪部裡找） */
  if(!document.getElementById("lbOneCss")){const s1=document.createElement("style");s1.id="lbOneCss";s1.textContent=`.lb-pn[data-one] #libRecent{display:none}
.lb-pn[data-one="book"] #grp,.lb-pn[data-one="book"] #cols,.lb-pn[data-one="mine"] #grp{display:none}`;document.head.append(s1)}
  const cK=c0==null?"":String(c0);
  let unNav=null;const open=(t,q,m)=>{pn.dataset.one=m||(q?"find":"book");LB_PN={c:cK,t,q,m,at:Date.now()};if(!pn.classList.contains("open")&&typeof xqPanelNav==="function")unNav=xqPanelNav(()=>{unNav=null;LB_PN=null;pn.classList.remove("open");sc.classList.remove("open")});pn.classList.add("open");sc.classList.add("open");const tt=pn.querySelector("#lbT");if(tt&&t)tt.textContent=t;if(q){const qi=root.querySelector("#q");if(qi)setTimeout(()=>qi.focus(),320)}};
  const close=()=>{LB_PN=null;pn.classList.remove("open");sc.classList.remove("open");if(unNav){const f=unNav;unNav=null;f()}};pn.querySelector(".lb-pn-h button").onclick=close;sc.onclick=close;   /* 回饋 803：返回鍵先收面板 */
  /* 開某一部書：已經是這部就直接打開面板；不是就換到 #/db/<書>（原本的 Library 會載好那部），進來後自動打開 */
  const book=(k,t,q,m)=>{if(k&&k!==libState.c){LB_OPEN={t,q,m};libState.q="";libState.player="";location.hash="#/db/"+encodeURIComponent(k);return}open(t,q,m)};
  P.querySelectorAll(".lb-cell").forEach(b=>b.onclick=()=>{vibrate(5);book(b.dataset.c,b.getAttribute("aria-label"))});
  /* 開發者 11/11 選 ChatGPT UI 報告 UI-03：經典世界的書櫥是 6 根直書書籤，每根寬不到 15px、彼此貼著，手指很難點準。
     整排書櫥上面蓋一塊透明點選區，點了先跳「選一本棋譜」清單，每本一顆大按鈕；書籤本身照舊（讀螢幕、鍵盤一樣可以直接點書籤） */
  /* v5 改善單 R07（古譜窄書籤）：朝代書閣（不是經典世界）的 6 格書櫥一樣窄——每格約 45×31px、格子名只有 10.5px 字，上下左右貼著，一樣點不準；
     改成兩個世界都蓋透明點選區、點了跳同一張「選一本棋譜」大按鈕清單（每本一顆，至少 52px 高）。書閣的點選區蓋住 6 格書櫥和格子名（左 4.2%～26.8%、上 50.8%～67%，圖上這一塊沒有別的入口）。
     點選區標 data-r07m：橫放矮螢幕的側欄入口選單（07t3 r07Menu）也會列出「📚 古譜」這一項 */
  {const sh=document.createElement("button");sh.type="button";sh.className="lb-shelf";sh.setAttribute("aria-label","古譜六部："+LB_OLD.map(x=>x[2]).join("、"));sh.dataset.r07m="📚 古譜";   /* 第 16 輪：書名籤改成裝飾，這塊點選區就是古譜的入口（讀螢幕、鍵盤也走這裡） */
P.append(sh);   /* 位置交給 place */
    sh.onclick=()=>{vibrate(5);sheet("📚 選一本棋譜",b=>{b.innerHTML=`<div class="lb-pick">${LB_OLD.map(([k,n,f])=>`<button type="button" data-c="${esc(k)}" data-f="${esc(f)}">${esc(n)}${f&&f!==n?`<small>${esc(f)}</small>`:""}</button>`).join("")}</div>`;
      b.querySelectorAll("[data-c]").forEach(x=>x.onclick=()=>{vibrate(5);closeSheet();book(x.dataset.c,x.dataset.f)})})}}
  const GO={lbGm:()=>book("gmgames","大師對局"),lbMine:()=>book("play","我的對局",false,"mine"),lbFind:()=>open("搜尋",true),
    lbRead:()=>{const r=store.get("recent",[])[0];if(r)location.hash=`#/db/${encodeURIComponent(r.c)}/${encodeURIComponent(r.id)}`;else book("shiqingyaqu","適情雅趣")},
    lbBio:()=>lbBios(book),lbTour:()=>lbTours(P,book)};
  for(const[id]of LB_SPOTS){const b=P.querySelector("#"+id);if(b)b.onclick=()=>{vibrate(5);try{GO[id]()}catch(e){}}}
  P.querySelectorAll(".lb-box").forEach(b=>b.onclick=()=>{vibrate(5);lbTours(P,book,b.dataset.i==null?undefined:+b.dataset.i)});
  /* 場景狀態：繼續研究的迷你棋盤、手抄冊的厚度、樟木箱的封條 */
  const fx=P.querySelector(".lb-fx"),r=store.get("recent",[])[0];fx.innerHTML=lbMini(r&&r.fen);
  api("/db/books").then(bs=>{if(!P.isConnected)return;const n=bs.filter(x=>["play","pvp","study"].includes(x.key)).reduce((a,x)=>a+(x.count||0),0),lv=n>=200?3:n>=50?2:n>0?1:0;
    fx.insertAdjacentHTML("beforeend",Array.from({length:lv},(_,i)=>`<i class="lb-thick" style="top:${(77.6-i*1.1).toFixed(1)}%"></i>`).join(""));if(P._lbPlace)P._lbPlace();lbSeal(P,bs)}).catch(()=>{});
  if(LB_OPEN){const o=LB_OPEN;LB_OPEN=null;setTimeout(()=>open(o.t,o.q,o.m),30)}else{const o=lbPnBack(cK);if(o)setTimeout(()=>open(o.t,o.q,o.m),30)}
  /* 照當下的圖重放：古譜格、木箱（或整捆竹簡）、古譜點選區、小棋盤、厚度；橫式圖的值寫在 style，換回原圖就清掉交回 CSS */
  const place=()=>{const G=lbGeo(P,CLB),wide=!!(typeof scwCur==="function"&&scwCur(P)),xy=(e,p)=>{e.style.left=p[0]+"%";e.style.top=p[1]+"%"};
    P.querySelectorAll(".lb-cell").forEach((e,i)=>{if(G.cells[i])xy(e,G.cells[i])});
    P.querySelectorAll(".lb-box").forEach(b=>{if(b.dataset.i==null){if(G.one)xy(b,G.one)}else if(G.box&&G.box[+b.dataset.i])xy(b,G.box[+b.dataset.i])});
    const sh=P.querySelector(".lb-shelf");if(sh){const a=G.shelf;if(a)Object.assign(sh.style,{left:a[0]+"%",top:a[1]+"%",width:a[2]+"%",height:a[3]+"%"});else sh.style.left=sh.style.top=sh.style.width=sh.style.height=""}
    const mi=P.querySelector(".lb-mini");if(mi){if(wide&&G.mini)Object.assign(mi.style,{left:G.mini[0]+"%",top:G.mini[1]+"%",width:G.mini[2]+"%",display:""});else mi.style.left=mi.style.top=mi.style.width=mi.style.display=""}
    P.querySelectorAll(".lb-thick").forEach((t,i)=>{const T=wide?G.thick:null;if(T)Object.assign(t.style,{left:T[0]+"%",width:T[1]+"%",top:(T[2]-i*1.1).toFixed(1)+"%",display:""});else if(wide)t.style.display="none";else{t.style.left=t.style.width=t.style.display="";t.style.top=(77.6-i*1.1).toFixed(1)+"%"}})};
  P._lbPlace=place;place();
  if(typeof shpFit==="function")shpFit(v);
  const cfg=Object.assign({},SHW_PG0,SHW_LIBMAP,{HS:Object.fromEntries(Object.entries(SHW_LIBMAP.HS))});let cfgNow=cfg,mem="lib";
  if(typeof scwMount==="function"){const o={key:scwKey(src),src0:src,ids:LB_SPOTS.map(z=>z[0]),pfx:"lib",cfg0:cfg,apply:place,onCfg:x=>{o.pfx=x.W===2560?(CLB?"libCL":"libL"):"lib"}};   /* 換圖重掛走路：橫式圖的出口記憶名換成 libL／libCL */
    scwMount(P,o);if(pre.k){cfgNow=scwWalkCfg(o,scwCur(P));mem=o.pfx=CLB?"libCL":"libL";P._scwW="l"}}
  place();
  try{if(typeof shwPage==="function"&&SHIP_WALK_ON)shwPage(v,cfgNow,mem,null)}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
/* 樟木箱封條：下載好的變金色（可以打開），下載中發金光 */
let LB_DL={};
function lbSeal(P,bs){(window.XQ&&XQ.bigBooks?XQ.bigBooks():Promise.resolve([])).then(big=>{if(!P.isConnected)return;P._big=big||[];
  P.querySelectorAll(".lb-box").forEach((b,i)=>{if(b.dataset.i==null){const B=P._big;if(!B.length)return;b.classList.toggle("ok",B.every(g=>(bs||[]).find(x=>x.key===g.key&&x.synced)));b.classList.toggle("dl",B.some(g=>LB_DL[g.key]));return}const g=P._big[i];if(!g)return;b.classList.toggle("ok",!!(bs||[]).find(x=>x.key===g.key&&x.synced));b.classList.toggle("dl",!!LB_DL[g.key]);b.setAttribute("aria-label",g.name)})}).catch(()=>{})}
/* 比賽對局：三口箱子各一冊；下載好的直接開，沒下載的問要不要下載（跟原本「⬇ 下載」同一個 XQ.syncSite） */
function lbTours(P,book,i){const big=P._big||[];const one=g=>{LB_LAST.tour=g.key;api("/db/books").then(bs=>{const h=bs.find(x=>x.key===g.key&&x.synced);if(h){book(g.key,g.name);return}
    sheet("下載"+g.name,b=>{b.innerHTML=`<p>${esc(g.name)}${g.count?`：${g.count.toLocaleString()} 局`:""}，約 ${Math.round(g.size/1048576)} MB。下載一次存在手機裡，之後沒網路也能看。建議用 Wi-Fi 下載。</p><p class="muted" id="bp"></p><button class="btn" id="bg">開始下載</button>`;
      const bt=b.querySelector("#bg"),bp=b.querySelector("#bp");bt.onclick=async()=>{bt.disabled=true;bt.textContent="下載中…";LB_DL[g.key]=1;lbSeal(P,bs);
        try{const n=await XQ.syncSite(g.key,g.name,(got,total)=>{bp.textContent=`已下載 ${(got/1048576).toFixed(1)}${total?" / "+(total/1048576).toFixed(1):""} MB`},g.h);
          delete LB_DL[g.key];bp.textContent=`✅ 完成，共 ${n} 局`;toast("下載完成，箱子打開了");api("/db/books").then(x=>lbSeal(P,x)).catch(()=>{});setTimeout(()=>{closeSheet();book(g.key,g.name)},700)}
        catch(e){delete LB_DL[g.key];lbSeal(P,bs);bp.textContent="⚠ "+e.message+"，請確認網路後再試";bt.disabled=false;bt.textContent="再試一次"}}})}).catch(()=>{})};
  if(i!=null&&big[i])return one(big[i]);
  sheet("📦 比賽對局",b=>{b.innerHTML=big.map((g,k)=>`<button class="item${g.key===LB_LAST.tour?" lb-last":""}" data-k="${k}"${g.key===LB_LAST.tour?' aria-current="true"':""}><span class="lb">📦</span><span class="tx"><b>${esc(g.name)}${g.key===LB_LAST.tour?"　✔":""}</b><span>${g.count?g.count.toLocaleString()+" 局・":""}約 ${Math.round(g.size/1048576)} MB</span></span><span class="muted">›</span></button>`).join("")||'<p class="muted">讀不到比賽對局的書目</p>';
    b.querySelectorAll("[data-k]").forEach(x=>x.onclick=()=>{closeSheet();setTimeout(()=>one(big[+x.dataset.k]),250)})})}
/* 特級大師小傳：照 gmbios.json 列出來，點一位＝開特級大師對局、篩選他的對局 */
function lbBios(book){XQ_BIOS().then(B=>{const L=Object.entries(B||{}).sort((a,b)=>String(a[1].gm||"9999").localeCompare(String(b[1].gm||"9999")));
  sheet(`🖼 特級大師（${L.length} 位）`,b=>{b.innerHTML=`<div class="items" style="padding:0">${L.map(([n,p])=>`<button class="item${n===LB_LAST.bio?" lb-last":""}" data-n="${esc(n)}"${n===LB_LAST.bio?' aria-current="true"':""}><span class="lb">🖼</span><span class="tx"><b>${esc(p.zh||n)}${n===LB_LAST.bio?"　✔":""}</b><span>${esc([p.gm&&p.gm+" 年特級大師",p.from].filter(Boolean).join("・"))}</span></span><span class="muted">›</span></button>`).join("")}</div>`;
    {const on=b.querySelector(".lb-last");if(on)setTimeout(()=>{try{on.scrollIntoView({block:"center"})}catch(e){}},60)}
    b.querySelectorAll("[data-n]").forEach(x=>x.onclick=()=>{const n=x.dataset.n;LB_LAST.bio=n;closeSheet();libState.player=n;libState.side="";libState.res="";libState.limit=60;
      if(libState.c==="gmgames"){book("gmgames",(B[n]&&B[n].zh)||n);try{const qi=document.querySelector(".lib #q");if(qi)qi.dispatchEvent(new Event("input"))}catch(e){}}else{LB_OPEN={t:(B[n]&&B[n].zh)||n};location.hash="#/db/gmgames"}})})}).catch(()=>toast("讀不到特級大師的資料"))}
if(typeof Library==="function"){const f0=Library;Library=function(v,c0){const r=f0.apply(this,arguments);try{if(LIBMAP_ON)libMap(v,c0)}catch(e){}return r}}
